import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export interface WorkoutPlan {
  id?: string
  name: string
  description?: string
  exercises_data: any[]
  assigned_students?: string[]
  created_by: string
  status?: 'active' | 'inactive' | 'completed'
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  duration_weeks?: number
  sessions_per_week?: number
  is_template?: boolean
  tags?: string[]
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface CreateWorkoutPlan extends Omit<WorkoutPlan, 'created_by'> {
  created_by?: string
}

class WorkoutPlansService {
  async create(workoutPlan: CreateWorkoutPlan): Promise<WorkoutPlan | null> {
    try {
      console.log('🏋️ [WORKOUT_PLANS_SERVICE] Criando plano:', workoutPlan.name)
      
      // Buscar tenant_id do usuário
      const { data: { user } } = await supabase.auth.getUser();
      let tenantId = null;
      
      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .single();
        tenantId = profile?.tenant_id;
      }
      
      const dataToInsert = {
        ...workoutPlan,
        created_by: workoutPlan.created_by || user?.id || '',
        tenant_id: tenantId
      }
      
      const { data, error } = await supabase
        .from('workout_plans')
        .insert(dataToInsert)
        .select()
        .single()

      if (error) {
        console.error('❌ [WORKOUT_PLANS_SERVICE] Erro ao criar:', error)
        toast.error('Erro ao criar plano de treino')
        return null
      }

      console.log('✅ [WORKOUT_PLANS_SERVICE] Plano criado:', data.id)
      
      // ✅ FASE 2: Marcar como pendente de sincronização
      const { WorkoutSyncService } = await import('@/services/workoutSyncService')
      await WorkoutSyncService.markAsPending(data.id)
      
      toast.success('Plano de treino criado com sucesso!')
      return data as WorkoutPlan
    } catch (error) {
      console.error('💥 [WORKOUT_PLANS_SERVICE] Erro inesperado:', error)
      toast.error('Erro inesperado ao criar plano')
      return null
    }
  }

  async update(id: string, updates: Partial<WorkoutPlan>): Promise<WorkoutPlan | null> {
    try {
      console.log('🔄 [WORKOUT_PLANS_SERVICE] Atualizando plano:', id)
      
      const { data, error } = await supabase
        .from('workout_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('❌ [WORKOUT_PLANS_SERVICE] Erro ao atualizar:', error)
        toast.error('Erro ao atualizar plano de treino')
        return null
      }

      console.log('✅ [WORKOUT_PLANS_SERVICE] Plano atualizado:', data.id)
      
      // ✅ FASE 2: Marcar como pendente após update
      const { WorkoutSyncService } = await import('@/services/workoutSyncService')
      await WorkoutSyncService.markAsPending(data.id)
      
      toast.success('Plano de treino atualizado com sucesso!')
      return data as WorkoutPlan
    } catch (error) {
      console.error('💥 [WORKOUT_PLANS_SERVICE] Erro inesperado:', error)
      toast.error('Erro inesperado ao atualizar plano')
      return null
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      console.log('🗑️ [WORKOUT_PLANS_SERVICE] Excluindo plano:', id)
      
      const { error } = await supabase
        .from('workout_plans')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('❌ [WORKOUT_PLANS_SERVICE] Erro ao excluir:', error)
        toast.error('Erro ao excluir plano de treino')
        return false
      }

      console.log('✅ [WORKOUT_PLANS_SERVICE] Plano excluído com sucesso')
      toast.success('Plano de treino excluído com sucesso!')
      return true
    } catch (error) {
      console.error('💥 [WORKOUT_PLANS_SERVICE] Erro inesperado:', error)
      toast.error('Erro inesperado ao excluir plano')
      return false
    }
  }

  async getById(id: string): Promise<WorkoutPlan | null> {
    try {
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('❌ [WORKOUT_PLANS_SERVICE] Erro ao buscar plano:', error)
        return null
      }

      return data as WorkoutPlan
    } catch (error) {
      console.error('💥 [WORKOUT_PLANS_SERVICE] Erro inesperado:', error)
      return null
    }
  }

  async getAll(tenantId?: string | null): Promise<WorkoutPlan[]> {
    try {
      let query = supabase
        .from('workout_plans')
        .select('*')
        .order('created_at', { ascending: false })
      
      // Filtrar por tenant se fornecido (isolamento multi-tenant)
      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
        console.log('🏢 [WORKOUT_PLANS_SERVICE] Filtrando por tenant:', tenantId)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ [WORKOUT_PLANS_SERVICE] Erro ao buscar planos:', error)
        return []
      }

      return (data as WorkoutPlan[]) || []
    } catch (error) {
      console.error('💥 [WORKOUT_PLANS_SERVICE] Erro inesperado:', error)
      return []
    }
  }

  async getByStudent(studentId: string): Promise<WorkoutPlan[]> {
    try {
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .contains('assigned_students', [studentId])
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ [WORKOUT_PLANS_SERVICE] Erro ao buscar planos do aluno:', error)
        return []
      }

      return (data as WorkoutPlan[]) || []
    } catch (error) {
      console.error('💥 [WORKOUT_PLANS_SERVICE] Erro inesperado:', error)
      return []
    }
  }

  async getTemplates(): Promise<WorkoutPlan[]> {
    try {
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('is_template', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ [WORKOUT_PLANS_SERVICE] Erro ao buscar templates:', error)
        return []
      }

      return (data as WorkoutPlan[]) || []
    } catch (error) {
      console.error('💥 [WORKOUT_PLANS_SERVICE] Erro inesperado:', error)
      return []
    }
  }

  async assignToStudent(planId: string, studentId: string): Promise<boolean> {
    try {
      const plan = await this.getById(planId)
      if (!plan) return false

      const currentStudents = plan.assigned_students || []
      if (currentStudents.includes(studentId)) {
        toast.info('Aluno já possui este plano')
        return true
      }

      const updatedStudents = [...currentStudents, studentId]
      const result = await this.update(planId, { assigned_students: updatedStudents })
      
      return !!result
    } catch (error) {
      console.error('💥 [WORKOUT_PLANS_SERVICE] Erro ao atribuir plano:', error)
      return false
    }
  }

  async removeFromStudent(planId: string, studentId: string): Promise<boolean> {
    try {
      const plan = await this.getById(planId)
      if (!plan) return false

      const currentStudents = plan.assigned_students || []
      const updatedStudents = currentStudents.filter(id => id !== studentId)
      
      const result = await this.update(planId, { assigned_students: updatedStudents })
      
      return !!result
    } catch (error) {
      console.error('💥 [WORKOUT_PLANS_SERVICE] Erro ao remover plano do aluno:', error)
      return false
    }
  }
}

export const workoutPlansService = new WorkoutPlansService()