import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import type { PlanCatalog } from '@/hooks/usePlans'

export interface UnifiedPlan {
  id: string
  name: string
  price?: number
  description?: string
  interval?: string // Adicionar interval para compatibilidade
  type: 'catalog' | 'custom'
  isActive: boolean
  teacher_id: string
}

export function useUnifiedPlans() {
  const [catalogPlans, setCatalogPlans] = useState<PlanCatalog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useSupabaseAuth()

  const fetchPlans = useCallback(async () => {
    if (!user?.id) {
      setCatalogPlans([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Buscar planos do catálogo do professor atual
      const { data: plans, error: plansError } = await supabase
        .from('plan_catalog')
        .select('*')
        .eq('teacher_id', user.id)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (plansError) throw plansError

      setCatalogPlans((plans || []) as PlanCatalog[])
      
    } catch (err: any) {
      console.error('Error fetching unified plans:', err)
      setError(err.message || 'Erro ao carregar planos')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // Memoizar planos unificados
  const unifiedPlans = useMemo((): UnifiedPlan[] => {
    const plans: UnifiedPlan[] = []

    // Verificar se catalogPlans existe e é um array
    if (Array.isArray(catalogPlans)) {
      // Adicionar planos do catálogo
      catalogPlans.forEach(plan => {
        plans.push({
          id: plan.id,
          name: plan.name,
          price: plan.price,
          description: plan.description,
          interval: plan.interval, // Incluir interval
          type: 'catalog',
          isActive: plan.is_active,
          teacher_id: plan.teacher_id
        })
      })
    }

    // Adicionar opção para plano personalizado
    if (user?.id) {
      plans.push({
        id: 'custom',
        name: 'Plano Personalizado',
        description: 'Plano customizado para necessidades específicas',
        type: 'custom',
        isActive: true,
        teacher_id: user.id
      })
    }

    return plans
  }, [catalogPlans, user?.id])

  // Função para validar se um plano é válido
  const validatePlan = useCallback((planId: string): boolean => {
    if (!planId || planId === 'none' || planId === 'loading' || planId === 'no-plans') {
      return true // 'none' é um valor válido para "sem plano"
    }

    // Plano personalizado é sempre válido
    if (planId === 'custom') {
      return true
    }

    // Verificar se catalogPlans existe e é um array antes de usar .some()
    if (!Array.isArray(catalogPlans)) {
      return false
    }

    // Verificar se o plano existe no catálogo
    return catalogPlans.some(plan => 
      plan.id === planId && 
      plan.is_active && 
      plan.teacher_id === user?.id
    )
  }, [catalogPlans, user?.id])

  // Função para obter informações de um plano
  const getPlanInfo = useCallback((planId: string): UnifiedPlan | null => {
    return unifiedPlans.find(plan => plan.id === planId) || null
  }, [unifiedPlans])

  // Função para formatar display do plano
  const formatPlanDisplay = useCallback((planId: string): string => {
    if (!planId || planId === 'none') return 'Nenhum plano'
    
    const plan = getPlanInfo(planId)
    if (!plan) return 'Plano inválido'
    
    if (plan.type === 'custom') return plan.name
    
    return plan.price ? `${plan.name} - R$ ${plan.price.toFixed(2)}` : plan.name
  }, [getPlanInfo])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  // Realtime subscription para mudanças nos planos
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel('unified-plans-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'plan_catalog',
          filter: `teacher_id=eq.${user.id}`
        },
        () => {
          console.log('🔄 Plan catalog changed, refetching...')
          fetchPlans()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, fetchPlans])

  return {
    unifiedPlans,
    catalogPlans,
    loading,
    error,
    validatePlan,
    getPlanInfo,
    formatPlanDisplay,
    refetch: fetchPlans
  }
}