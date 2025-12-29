import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'

interface ActiveSubscription {
  id: string
  user_id: string
  teacher_id: string
  plan_id: string
  status: string // Mudado para string para aceitar qualquer valor
  start_date: string
  end_date: string
  auto_renew: boolean
  features: any[] // Mudado para any[] para aceitar Json do Supabase
  plan?: {
    name: string
    price: number
    currency: string
    interval: string
  }
}

interface SubscriptionStatus {
  hasActiveSubscription: boolean
  subscriptions: ActiveSubscription[]
  isExpiringSoon: boolean
  daysUntilExpiry: number | null
  nextBillingDate: string | null
}

export function useSubscriptionStatus(teacherId?: string) {
  const { user } = useAuth()
  const [status, setStatus] = useState<SubscriptionStatus>({
    hasActiveSubscription: false,
    subscriptions: [],
    isExpiringSoon: false,
    daysUntilExpiry: null,
    nextBillingDate: null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkSubscriptionStatus = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('active_subscriptions')
        .select(`
          *,
          plan:plan_catalog!plan_id (
            name,
            price,
            currency,
            interval
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')

      // Se teacherId foi fornecido, filtrar por professor específico
      if (teacherId) {
        query = query.eq('teacher_id', teacherId)
      }

      const { data: subscriptions, error: fetchError } = await query

      if (fetchError) {
        throw fetchError
      }

      const activeSubscriptions = (subscriptions as any[]) || []
      const hasActive = activeSubscriptions.length > 0
      
      // Calcular se está expirando em breve (próximos 7 dias)
      let isExpiringSoon = false
      let daysUntilExpiry: number | null = null
      let nextBillingDate: string | null = null

      if (hasActive) {
        // Pegar a assinatura que expira mais cedo
        const nextExpiring = activeSubscriptions.reduce((earliest, current) => {
          return new Date(current.end_date) < new Date(earliest.end_date) ? current : earliest
        })

        const endDate = new Date(nextExpiring.end_date)
        const today = new Date()
        const diffTime = endDate.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        daysUntilExpiry = diffDays
        isExpiringSoon = diffDays <= 7 && diffDays > 0
        nextBillingDate = nextExpiring.end_date
      }

      setStatus({
        hasActiveSubscription: hasActive,
        subscriptions: activeSubscriptions,
        isExpiringSoon,
        daysUntilExpiry,
        nextBillingDate
      })

    } catch (err) {
      console.error('Error checking subscription status:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [user?.id, teacherId])

  // Verificar se tem acesso a uma funcionalidade específica
  const hasFeatureAccess = useCallback((featureKey: string): boolean => {
    return status.subscriptions.some(sub => {
      const features = Array.isArray(sub.features) ? sub.features : []
      return features.includes(featureKey) && new Date(sub.end_date) >= new Date()
    })
  }, [status.subscriptions])

  // Renovar assinatura (placeholder para futura implementação)
  const renewSubscription = useCallback(async (subscriptionId: string) => {
    // TODO: Implementar lógica de renovação
    console.log('Renewing subscription:', subscriptionId)
  }, [])

  // Cancelar assinatura
  const cancelSubscription = useCallback(async (subscriptionId: string, reason?: string) => {
    try {
      const { error } = await supabase
        .from('active_subscriptions')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId)
        .eq('user_id', user?.id)

      if (error) throw error

      // Recarregar status após cancelamento
      await checkSubscriptionStatus()
      
    } catch (err) {
      console.error('Error cancelling subscription:', err)
      throw err
    }
  }, [user?.id, checkSubscriptionStatus])

  useEffect(() => {
    checkSubscriptionStatus()
  }, [checkSubscriptionStatus])

  return {
    ...status,
    loading,
    error,
    hasFeatureAccess,
    renewSubscription,
    cancelSubscription,
    refresh: checkSubscriptionStatus
  }
}