import { useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface SubscriptionData {
  student_user_id: string
  teacher_id: string
  plan_id: string
  status: 'pending' | 'active' | 'cancelled' | 'expired'
  start_at?: string
  end_at?: string
}

export function useSubscriptionManager() {
  const { toast } = useToast()

  // Ativar subscrição após pagamento bem-sucedido
  const activateSubscription = useCallback(async (transactionData: {
    student_id: string
    teacher_id: string
    plan_catalog_id: string
    payment_id: string
  }) => {
    try {
      const { student_id, teacher_id, plan_catalog_id, payment_id } = transactionData

      // Verificar se já existe subscrição ativa
      const { data: existingSubscription, error: checkError } = await supabase
        .from('plan_subscriptions')
        .select('*')
        .eq('student_user_id', student_id)
        .eq('plan_id', plan_catalog_id)
        .eq('status', 'active')
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (existingSubscription) {
        console.log('Subscription already active:', existingSubscription.id)
        return existingSubscription
      }

      // Buscar detalhes do plano para definir período
      const { data: plan, error: planError } = await supabase
        .from('plan_catalog')
        .select('*')
        .eq('id', plan_catalog_id)
        .single()

      if (planError) throw planError

      // Calcular datas de início e fim baseado no intervalo do plano
      const startDate = new Date()
      let endDate = new Date()

      switch (plan.interval) {
        case 'monthly':
          endDate.setMonth(endDate.getMonth() + 1)
          break
        case 'quarterly':
          endDate.setMonth(endDate.getMonth() + 3)
          break
        case 'yearly':
          endDate.setFullYear(endDate.getFullYear() + 1)
          break
        default:
          endDate.setMonth(endDate.getMonth() + 1) // Default to monthly
      }

      // Criar nova subscrição
      const { data: newSubscription, error: createError } = await supabase
        .from('plan_subscriptions')
        .insert({
          student_user_id: student_id,
          teacher_id,
          plan_id: plan_catalog_id,
          status: 'active',
          start_at: startDate.toISOString(),
          end_at: endDate.toISOString(),
          approved_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) throw createError

      // Atualizar tabela students com nova data de expiração
      const { error: updateStudentError } = await supabase
        .from('students')
        .update({
          membership_expiry: endDate.toISOString(),
          plan: plan.name
        })
        .eq('user_id', student_id)
        .eq('teacher_id', teacher_id)

      if (updateStudentError) {
        console.warn('Failed to update student membership expiry:', updateStudentError)
      }

      console.log('Subscription activated successfully:', newSubscription.id)
      return newSubscription

    } catch (error) {
      console.error('Error activating subscription:', error)
      throw error
    }
  }, [])

  // Cancelar subscrição
  const cancelSubscription = useCallback(async (subscriptionId: string, reason?: string) => {
    try {
      const { data, error } = await supabase
        .from('plan_subscriptions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId)
        .select()
        .single()

      if (error) throw error

      toast({
        title: 'Subscrição cancelada',
        description: 'A subscrição foi cancelada com sucesso'
      })

      return data
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível cancelar a subscrição',
        variant: 'destructive'
      })
      throw error
    }
  }, [toast])

  // Renovar subscrição
  const renewSubscription = useCallback(async (subscriptionId: string) => {
    try {
      const { data: subscription, error: fetchError } = await supabase
        .from('plan_subscriptions')
        .select('*, plan_catalog(*)')
        .eq('id', subscriptionId)
        .single()

      if (fetchError) throw fetchError

      const plan = subscription.plan_catalog as any
      const currentEndDate = new Date(subscription.end_at)
      let newEndDate = new Date(currentEndDate)

      switch (plan.interval) {
        case 'monthly':
          newEndDate.setMonth(newEndDate.getMonth() + 1)
          break
        case 'quarterly':
          newEndDate.setMonth(newEndDate.getMonth() + 3)
          break
        case 'yearly':
          newEndDate.setFullYear(newEndDate.getFullYear() + 1)
          break
      }

      const { data, error } = await supabase
        .from('plan_subscriptions')
        .update({
          end_at: newEndDate.toISOString(),
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId)
        .select()
        .single()

      if (error) throw error

      toast({
        title: 'Subscrição renovada',
        description: `Subscrição renovada até ${newEndDate.toLocaleDateString('pt-BR')}`
      })

      return data
    } catch (error) {
      console.error('Error renewing subscription:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível renovar a subscrição',
        variant: 'destructive'
      })
      throw error
    }
  }, [toast])

  // Verificar subscrições expiradas e atualizá-las
  const updateExpiredSubscriptions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('plan_subscriptions')
        .update({ status: 'expired' })
        .eq('status', 'active')
        .lt('end_at', new Date().toISOString())
        .select()

      if (error) throw error

      console.log(`Updated ${data?.length || 0} expired subscriptions`)
      return data
    } catch (error) {
      console.error('Error updating expired subscriptions:', error)
      throw error
    }
  }, [])

  // Obter subscrições do usuário
  const getUserSubscriptions = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('plan_subscriptions')
        .select(`
          *,
          plan_catalog (
            name,
            price,
            interval,
            features:plan_features(*)
          )
        `)
        .eq('student_user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching user subscriptions:', error)
      return []
    }
  }, [])

  return {
    activateSubscription,
    cancelSubscription,
    renewSubscription,
    updateExpiredSubscriptions,
    getUserSubscriptions
  }
}