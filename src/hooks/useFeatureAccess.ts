import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'

interface PlanFeature {
  id: string
  plan_id: string
  feature_key: string
  name: string
  description?: string
  enabled: boolean
  max_usage?: number
}

export function useFeatureAccess() {
  const { user } = useAuth()
  const [features, setFeatures] = useState<PlanFeature[]>([])
  const [loading, setLoading] = useState(false)

  // NOVA FUNÇÃO: Verificar acesso via assinatura ativa
  const hasFeatureAccess = useCallback(async (featureKey: string): Promise<boolean> => {
    if (!user?.id) return false

    try {
      const { data, error } = await supabase.rpc('user_has_feature_access', {
        p_user_id: user.id,
        p_teacher_id: user.id, // Para professores verificando suas próprias features
        p_feature: featureKey
      })

      if (error) {
        console.error('Error checking feature access:', error)
        return false
      }

      return data || false
    } catch (error) {
      console.error('Exception checking feature access:', error)
      return false
    }
  }, [user?.id])

  // FUNÇÃO ORIGINAL mantida para compatibilidade
  const fetchUserFeatures = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      // Buscar assinaturas ativas do usuário
      const { data: subscriptions, error: subError } = await supabase
        .from('active_subscriptions')
        .select(`
          *,
          plan:plan_catalog!plan_id (
            name,
            features
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString().split('T')[0])

      if (subError) {
        console.error('Error fetching subscriptions:', subError)
        return
      }

      // Converter features das assinaturas ativas em PlanFeature[]
      const userFeatures: PlanFeature[] = []
      
      subscriptions?.forEach(sub => {
        const planFeatures = Array.isArray(sub.features) ? sub.features : []
        planFeatures.forEach((feature: string, index: number) => {
          userFeatures.push({
            id: `${sub.id}_${index}`,
            plan_id: sub.plan_id,
            feature_key: feature.toLowerCase().replace(/\s+/g, '_'),
            name: feature,
            description: `Acesso à funcionalidade ${feature}`,
            enabled: true,
            max_usage: null
          })
        })
      })

      setFeatures(userFeatures)
    } catch (error) {
      console.error('Error fetching user features:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  const hasFeature = useCallback((featureKey: string): boolean => {
    return features.some(feature => 
      feature.feature_key === featureKey && feature.enabled
    )
  }, [features])

  const getFeatureLimit = useCallback((featureKey: string): number | null => {
    const feature = features.find(f => f.feature_key === featureKey && f.enabled)
    return feature?.max_usage || null
  }, [features])

  const refreshFeatures = useCallback(() => {
    fetchUserFeatures()
  }, [fetchUserFeatures])

  useEffect(() => {
    fetchUserFeatures()
  }, [fetchUserFeatures])

  return {
    features,
    loading,
    hasFeature,
    hasFeatureAccess, // NOVA função baseada em assinaturas ativas
    getFeatureLimit,
    refreshFeatures
  }
}