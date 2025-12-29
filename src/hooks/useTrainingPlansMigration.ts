import { useWorkoutPlans } from './useWorkoutPlans';
import { useAuth } from './useAuth';

/**
 * Hook de migração que substitui todos os hooks antigos
 * Fornece interface compatível com componentes existentes
 */
export const useTrainingPlansMigration = () => {
  const { user } = useAuth();
  const unified = useWorkoutPlans();

  // Interface compatível com useTrainingPlans
  const useTrainingPlansCompatible = () => {
    const studentPlans = user?.id ? unified.getWorkoutPlansByStudent(user.id) : [];
    
    return {
      trainingPlans: studentPlans,
      loading: unified.loading,
      addTrainingPlan: unified.createWorkoutPlan,
      updateTrainingPlan: unified.updateWorkoutPlan,
      deleteTrainingPlan: unified.deleteWorkoutPlan,
      updatePlanStatus: (planId: string, status: string) => 
        unified.updateWorkoutPlan(planId, { status: status as any }),
      renewPlan: (planId: string) => 
        unified.updateWorkoutPlan(planId, { 
          status: 'active',
          duration_weeks: 4
        }),
      refetch: unified.refetch
    };
  };

  // Interface compatível com useTrainingPlanDatabase
  const useTrainingPlanDatabaseCompatible = () => {
    return {
      saveTrainingPlan: async (planData: any) => {
        return unified.createWorkoutPlan({
          name: planData.name,
          description: planData.description,
          exercises_data: planData.exercises || [],
          assigned_students: planData.studentId ? [planData.studentId] : [],
          is_template: false,
          status: planData.isActive ? 'active' : 'inactive'
        });
      },
      loadStudentTrainingPlans: (studentId: string) => 
        Promise.resolve(unified.getWorkoutPlansByStudent(studentId)),
      updateTrainingPlan: unified.updateWorkoutPlan,
      deleteTrainingPlan: (planId: string) => unified.deleteWorkoutPlan(planId),
      cloneWorkoutTemplate: async (templateId: string, studentId: string, planName: string) => {
        const template = unified.workoutPlans.find(p => p.id === templateId);
        if (!template) throw new Error('Template não encontrado');
        
        return unified.createWorkoutPlan({
          name: planName,
          description: template.description,
          exercises_data: template.exercises_data,
          assigned_students: [studentId],
          is_template: false,
          status: 'active'
        });
      },
      loading: unified.loading,
      error: unified.error
    };
  };

  // Interface compatível com useWorkoutLibrary
  const useWorkoutLibraryCompatible = () => {
    const templates = unified.getTemplates();
    
    return {
      workouts: templates,
      loading: unified.loading,
      error: unified.error,
      createWorkoutTemplate: (workoutData: any) => 
        unified.createWorkoutPlan({ ...workoutData, is_template: true }),
      updateWorkoutTemplate: unified.updateWorkoutPlan,
      deleteWorkoutTemplate: unified.deleteWorkoutPlan,
      getWorkoutsByCategory: (category: string) => 
        templates.filter(t => t.tags?.includes(category)),
      getWorkoutsByMuscleGroup: (muscleGroup: string) => 
        templates.filter(t => t.tags?.includes(muscleGroup)),
      searchWorkouts: (query: string) => 
        templates.filter(t => 
          t.name.toLowerCase().includes(query.toLowerCase()) ||
          t.description?.toLowerCase().includes(query.toLowerCase())
        ),
      getCategories: () => [
        ...new Set(templates.flatMap(t => t.tags || []))
      ].sort(),
      getMuscleGroups: () => [
        ...new Set(templates.flatMap(t => t.tags || []))
      ].sort(),
      refetch: unified.refetch
    };
  };

  // Interface compatível com useStudentTrainingSync
  const useStudentTrainingSyncCompatible = () => {
    const studentPlans = user?.id ? unified.getWorkoutPlansByStudent(user.id) : [];
    
    return {
      trainingPlans: studentPlans.map(plan => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        exercises: plan.exercises_data || [],
        assigned_to: plan.assigned_students || [],
        created_by: plan.created_by,
        tags: plan.tags || [],
        created_at: plan.created_at,
        updated_at: plan.updated_at
      })),
      loading: unified.loading,
      completeWorkout: async (workoutId: string, exercisesCompleted: string[]) => {
        // Manter funcionalidade de gamification
        const { supabase } = await import('@/integrations/supabase/client');
        const { error } = await supabase.rpc('award_points_enhanced_v3', {
          p_user_id: user?.id,
          p_activity_type: 'training_completed',
          p_description: 'Treino concluído',
          p_metadata: {
            workout_id: workoutId,
            exercises_completed: exercisesCompleted,
            completion_date: new Date().toISOString()
          }
        });
        
        if (error) throw error;
      },
      refetch: unified.refetch
    };
  };

  return {
    // Hook unificado principal
    unified,
    
    // Interfaces compatíveis
    useTrainingPlansCompatible,
    useTrainingPlanDatabaseCompatible, 
    useWorkoutLibraryCompatible,
    useStudentTrainingSyncCompatible
  };
};

// Exports para compatibilidade
export const useTrainingPlans = () => {
  const migration = useTrainingPlansMigration();
  return migration.useTrainingPlansCompatible();
};

export const useTrainingPlanDatabase = () => {
  const migration = useTrainingPlansMigration();
  return migration.useTrainingPlanDatabaseCompatible();
};

export const useWorkoutLibrary = () => {
  const migration = useTrainingPlansMigration();
  return migration.useWorkoutLibraryCompatible();
};

export const useStudentTrainingSync = () => {
  const migration = useTrainingPlansMigration();
  return migration.useStudentTrainingSyncCompatible();
};