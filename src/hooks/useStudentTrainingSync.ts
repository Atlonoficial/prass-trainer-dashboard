import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { getCurrentTenantId } from '@/utils/tenantHelpers'

export interface StudentTrainingPlan {
  id: string
  name: string
  description: string | null
  exercises: any[]
  assigned_to: string[]
  created_by: string
  tags: string[]
  created_at: string
  updated_at: string
}

export function useStudentTrainingSync() {
  const [trainingPlans, setTrainingPlans] = useState<StudentTrainingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()

  const fetchTrainingPlans = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      
      console.log('🔄 [STUDENT_TRAINING_SYNC] Iniciando busca de planos de treino...')
      console.log('🎯 [STUDENT_TRAINING_SYNC] UserId:', user.id)
      
      // VALIDAÇÃO CRÍTICA: Verificar se user.id é um UUID válido
      const { isUuid } = await import('@/utils/validators')
      if (!isUuid(user?.id)) {
        console.warn('❌ [STUDENT_TRAINING_SYNC] user.id inválido:', user?.id)
        return
      }
      
      // Obter tenant_id do usuário para filtrar corretamente
      const tenantId = await getCurrentTenantId(user.id)
      console.log('🏢 [STUDENT_TRAINING_SYNC] Tenant ID:', tenantId)
      
      // Query com filtro de tenant para isolamento completo
      console.log('📡 [STUDENT_TRAINING_SYNC] Executando query filtrada por tenant...')
      let query = supabase
        .from('workout_plans')
        .select('*')
        .order('created_at', { ascending: false })
      
      // Adicionar filtro de tenant se disponível
      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }
      
      const { data, error } = await query

      if (error) {
        console.error('❌ [STUDENT_TRAINING_SYNC] Erro na query:', error)
        throw error
      }

      console.log('✅ [STUDENT_TRAINING_SYNC] Dados recebidos:', data?.length || 0, 'planos')

      // FILTRAÇÃO CLIENT-SIDE: Aplicar filtro por user.id
      const { normalizeIds } = await import('@/utils/normalize')
      const filteredData = (data || []).filter((plan: any) => {
        // Verificar se o usuário está na lista de assigned_students
        const isAssigned = plan.assigned_students ? normalizeIds(plan.assigned_students).includes(user.id) : false
        console.log('🔍 [STUDENT_TRAINING_SYNC] Plano:', plan.id, 'Atribuído:', isAssigned)
        return isAssigned
      })

      console.log('✅ [STUDENT_TRAINING_SYNC] Planos filtrados:', filteredData.length)

      const plans = filteredData.map(plan => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        exercises: Array.isArray(plan.exercises_data) ? plan.exercises_data : [],
        assigned_to: Array.isArray(plan.assigned_students) ? plan.assigned_students : [],
        created_by: plan.created_by,
        tags: plan.tags || [],
        created_at: plan.created_at,
        updated_at: plan.updated_at
      }))

      console.log('📋 [STUDENT_TRAINING_SYNC] Planos processados:', plans.length)
      setTrainingPlans(plans)

      // ✅ FASE 2: Marcar todos como sincronizados
      const { WorkoutSyncService } = await import('@/services/workoutSyncService')
      const planIds = plans.map(p => p.id)
      if (planIds.length > 0) {
        await WorkoutSyncService.syncBatch(planIds)
      }

    } catch (error) {
      console.error('❌ [STUDENT_TRAINING_SYNC] Erro final:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar seus treinos',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Complete a workout session
  const completeWorkout = async (workoutId: string, exercisesCompleted: string[]) => {
    try {
      console.log('🎯 [STUDENT_TRAINING_SYNC] Completando treino:', { workoutId, exercisesCount: exercisesCompleted?.length })
      
      // VALIDAÇÃO CRÍTICA: Verificar se workoutId é válido
      const { isUuid } = await import('@/utils/validators')
      if (isUuid(workoutId)) {
        console.log('✅ [STUDENT_TRAINING_SYNC] WorkoutId válido')
      } else {
        throw new Error(`WorkoutId inválido: ${workoutId}`)
      }
      
      console.log('🏆 [STUDENT_TRAINING_SYNC] Atribuindo pontos...')
      // Award points for completing training
      const { error } = await supabase.rpc('award_points_enhanced_v3', {
        p_user_id: user?.id,
        p_activity_type: 'training_completed',
        p_description: 'Treino concluído',
        p_metadata: {
          workout_id: workoutId,
          exercises_completed: exercisesCompleted,
          completion_date: new Date().toISOString()
        }
      })

      if (error) {
        console.error('❌ [STUDENT_TRAINING_SYNC] Erro ao atribuir pontos:', error)
        throw error
      }

      console.log('✅ [STUDENT_TRAINING_SYNC] Treino completado com sucesso!')
      toast({
        title: 'Parabéns!',
        description: 'Treino concluído com sucesso! Pontos adicionados.',
        variant: 'default'
      })
    } catch (error) {
      console.error('❌ [STUDENT_TRAINING_SYNC] Erro ao completar treino:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível registrar a conclusão do treino',
        variant: 'destructive'
      })
    }
  }

  useEffect(() => {
    if (!user?.id) return

    fetchTrainingPlans()

    // Subscribe to realtime changes com filtro de tenant
    const setupSubscription = async () => {
      const tenantId = await getCurrentTenantId(user.id)
      if (!tenantId) {
        console.warn('⚠️ [STUDENT_TRAINING_SYNC] Tenant ID não encontrado')
        return
      }
      
      console.log('🔌 [STUDENT_TRAINING_SYNC] Configurando subscription com tenant filter:', tenantId)
      
      const channel = supabase
        .channel('student-training-sync-v2')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'workout_plans',
            filter: `tenant_id=eq.${tenantId}` // 🔒 CRITICAL: Filtro de tenant para isolamento
          },
          (payload) => {
            console.log('💪 [STUDENT_TRAINING_SYNC] Realtime update:', payload)
            
            // ✅ FASE 4: Notificações otimizadas - sem toast em INSERT (OneSignal já notifica)
            switch (payload.eventType) {
              case 'INSERT':
                console.log('✅ Novo treino detectado, OneSignal já notificou')
                break
              case 'UPDATE':
                toast({
                  title: 'Treino atualizado',
                  description: 'Seu professor fez alterações no seu treino',
                  variant: 'default'
                })
                break
              case 'DELETE':
                toast({
                  title: 'Treino removido',
                  description: 'Um treino foi removido pelo seu professor',
                  variant: 'destructive'
                })
                break
            }
            
            // Refetch data to ensure consistency
            fetchTrainingPlans()
          }
        )
        .subscribe((status) => {
          console.log('🔌 [STUDENT_TRAINING_SYNC] Status:', status)
        })

      return () => {
        supabase.removeChannel(channel)
      }
    }
    
    const cleanup = setupSubscription()
    
    return () => {
      cleanup.then(fn => fn && fn())
    }
  }, [user?.id])

  return {
    trainingPlans,
    loading,
    completeWorkout,
    refetch: fetchTrainingPlans
  }
}