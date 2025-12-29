import { useState, useEffect, useCallback } from 'react'
import { workoutPlansService, WorkoutPlan, CreateWorkoutPlan } from '@/services/workoutPlansService'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useTenantContext } from '@/contexts/TenantContext'

export function useWorkoutPlans() {
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const { tenantId } = useTenantContext()

  const fetchWorkoutPlans = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔄 [USE_WORKOUT_PLANS] Buscando planos com tenant:', tenantId)
      const plans = await workoutPlansService.getAll(tenantId)
      
      console.log('✅ [USE_WORKOUT_PLANS] Planos carregados:', plans.length)
      setWorkoutPlans(plans)
    } catch (err) {
      console.error('❌ [USE_WORKOUT_PLANS] Erro ao carregar planos:', err)
      setError('Erro ao carregar planos de treino')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  const createWorkoutPlan = async (planData: CreateWorkoutPlan) => {
    if (!user?.id) return null
    
    const newPlan = await workoutPlansService.create({
      ...planData,
      created_by: user.id
    })
    
    if (newPlan) {
      setWorkoutPlans(prev => [newPlan, ...prev])
    }
    
    return newPlan
  }

  const updateWorkoutPlan = async (id: string, updates: Partial<WorkoutPlan>) => {
    const updatedPlan = await workoutPlansService.update(id, updates)
    
    if (updatedPlan) {
      setWorkoutPlans(prev => 
        prev.map(plan => plan.id === id ? updatedPlan : plan)
      )
    }
    
    return updatedPlan
  }

  const deleteWorkoutPlan = async (id: string) => {
    const success = await workoutPlansService.delete(id)
    
    if (success) {
      setWorkoutPlans(prev => prev.filter(plan => plan.id !== id))
    }
    
    return success
  }

  const getWorkoutPlanById = (id: string) => {
    return workoutPlans.find(plan => plan.id === id) || null
  }

  const getWorkoutPlansByStudent = (studentId: string) => {
    if (!studentId) return [];
    return workoutPlans.filter(plan => 
      plan.assigned_students?.includes(studentId)
    );
  };

  const getActiveWorkoutPlansByStudent = (studentId: string) => {
    if (!studentId) return [];
    return workoutPlans.filter(plan => 
      plan.assigned_students?.includes(studentId) &&
      plan.status === 'active'
    );
  };

  const getTemplates = () => {
    return workoutPlans.filter(plan => plan.is_template === true)
  }

  const assignToStudent = async (planId: string, studentId: string) => {
    const success = await workoutPlansService.assignToStudent(planId, studentId)
    
    if (success) {
      // Refresh data to get updated assignments
      await fetchWorkoutPlans()
    }
    
    return success
  }

  const removeFromStudent = async (planId: string, studentId: string) => {
    const success = await workoutPlansService.removeFromStudent(planId, studentId)
    
    if (success) {
      // Refresh data to get updated assignments
      await fetchWorkoutPlans()
    }
    
    return success
  }

  // Enhanced real-time subscription with better error handling
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('workout_plans_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workout_plans',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          console.log('🔄 [WORKOUT_PLANS_REALTIME] Event:', payload.eventType, payload)
          
          switch (payload.eventType) {
            case 'INSERT':
              if (payload.new) {
                console.log('✅ [REALTIME] Novo plano adicionado:', payload.new.name)
                setWorkoutPlans(prev => {
                  // Avoid duplicates
                  const exists = prev.find(p => p.id === payload.new.id)
                  if (exists) return prev
                  return [payload.new as WorkoutPlan, ...prev]
                })
              }
              break
            case 'UPDATE':
              if (payload.new) {
                console.log('✅ [REALTIME] Plano atualizado:', payload.new.name)
                setWorkoutPlans(prev => 
                  prev.map(plan => 
                    plan.id === payload.new.id ? payload.new as WorkoutPlan : plan
                  )
                )
              }
              break
            case 'DELETE':
              if (payload.old) {
                console.log('✅ [REALTIME] Plano removido:', payload.old.id)
                setWorkoutPlans(prev => 
                  prev.filter(plan => plan.id !== payload.old.id)
                )
              }
              break
          }
        }
      )
      .subscribe((status) => {
        console.log('🔗 [WORKOUT_PLANS_REALTIME] Status:', status)
      })

    return () => {
      console.log('🔌 [WORKOUT_PLANS_REALTIME] Desconectando...')
      supabase.removeChannel(channel)
    }
  }, [tenantId])

  // Initial load
  useEffect(() => {
    fetchWorkoutPlans()
  }, [fetchWorkoutPlans])

  return {
    workoutPlans,
    loading,
    error,
    createWorkoutPlan,
    updateWorkoutPlan,
    deleteWorkoutPlan,
    getWorkoutPlanById,
    getWorkoutPlansByStudent,
    getActiveWorkoutPlansByStudent,
    getTemplates,
    assignToStudent,
    removeFromStudent,
    refetch: fetchWorkoutPlans
  }
}