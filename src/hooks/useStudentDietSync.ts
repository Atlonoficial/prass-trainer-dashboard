import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { MealPlan, mealPlansService } from '@/services/mealPlansService'
import { getCurrentTenantId } from '@/utils/tenantHelpers'

/**
 * Hook para sincronização de planos alimentares do estudante
 * Usando NUTRITION SYSTEM 2.0 - tabela meal_plans
 */
export function useStudentDietSync() {
  const [dietPlans, setDietPlans] = useState<MealPlan[]>([])
  const [loading, setLoading] = useState(true)
  
  const fetchStudentDietPlans = async () => {
    try {
      setLoading(true)
      console.log('🔄 [STUDENT_DIET_SYNC_V2] Iniciando busca de planos do aluno...')
      
      // Buscar planos do estudante usando o novo serviço
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setDietPlans([])
        return
      }
      
      // Obter tenant_id do usuário para filtrar corretamente
      const tenantId = await getCurrentTenantId(user.id)
      console.log('🏢 [STUDENT_DIET_SYNC_V2] Tenant ID:', tenantId)
      
      const plans = await mealPlansService.getStudentMealPlans(user.id)
      
      console.log('✅ [STUDENT_DIET_SYNC_V2] Planos encontrados:', plans.length)
      setDietPlans(plans)
      
    } catch (error) {
      console.error('❌ [STUDENT_DIET_SYNC_V2] Erro:', error)
      setDietPlans([])
    } finally {
      setLoading(false)
    }
  }
  
  // Real-time subscription para meal_plans com filtro de tenant
  useEffect(() => {
    let channel: any = null;
    
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const tenantId = await getCurrentTenantId(user.id)
      if (!tenantId) {
        console.warn('⚠️ [STUDENT_DIET_SYNC_V2] Tenant ID não encontrado')
        return
      }
      
      console.log('🔌 [STUDENT_DIET_SYNC_V2] Configurando subscription com tenant filter:', tenantId)
      
      channel = supabase
        .channel('student-diet-sync-v2')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'meal_plans',
            filter: `tenant_id=eq.${tenantId}` // 🔒 CRITICAL: Filtro de tenant para isolamento
          },
          (payload) => {
            console.log('🍎 [STUDENT_DIET_SYNC_V2] Mudança detectada:', payload.eventType)
            // Refetch após mudanças
            setTimeout(() => fetchStudentDietPlans(), 100)
          }
        )
        .subscribe((status) => {
          console.log('🔌 [STUDENT_DIET_SYNC_V2] Status:', status)
        })
    }
    
    setupSubscription()
    
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [])
  
  useEffect(() => {
    fetchStudentDietPlans()
  }, [])
  
  return {
    dietPlans,
    loading,
    refetch: fetchStudentDietPlans
  }
}