import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ultraSanitizeWorkoutPayload } from '@/utils/workoutPayloadSanitizer';

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string | null;
  exercises: any;
  difficulty: string | null;
  muscle_groups: string[] | null;
  tags: string[] | null;
  template_category: string | null;
  image_url: string | null;
  estimated_duration: number | null;
  estimated_calories: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useWorkoutLibrary = () => {
  const [workouts, setWorkouts] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Load workout templates from database
  const fetchWorkouts = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id,
          name,
          description,
          exercises,
          difficulty,
          muscle_groups,
          tags,
          template_category,
          image_url,
          estimated_duration,
          estimated_calories,
          created_by,
          created_at,
          updated_at
        `)
        .eq('is_template', true)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setWorkouts((data || []).map(workout => ({
        ...workout,
        exercises: Array.isArray(workout.exercises) ? workout.exercises : []
      })));
    } catch (err) {
      console.error('Error fetching workout library:', err);
      setError(err instanceof Error ? err.message : 'Failed to load workouts');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Create new workout template
  const createWorkoutTemplate = useCallback(async (workoutData: Omit<WorkoutTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      console.log('\n🎯 ============================================');
      console.log('🎯 CREATE WORKOUT TEMPLATE - INÍCIO');
      console.log('🎯 ============================================');
      console.log('📥 Dados recebidos:', JSON.stringify(workoutData, null, 2));

      // Mapear campos do WorkoutTemplate para WorkoutPayload
      const payloadData: any = {
        name: workoutData.name,
        description: workoutData.description,
        difficulty: workoutData.difficulty,
        exercises: workoutData.exercises || [], // Coluna correta na tabela workouts
        muscle_groups: workoutData.muscle_groups,
        tags: workoutData.tags,
        template_category: workoutData.template_category,
        image_url: workoutData.image_url,
        estimated_duration: workoutData.estimated_duration,
        estimated_calories: workoutData.estimated_calories,
        created_by: user.id,
        is_template: true
      };

      // ESTRATÉGIA MULTICAMADA: Ultra-sanitização com validação
      const { sanitized, valid, errors } = ultraSanitizeWorkoutPayload(payloadData);

      // VALIDAÇÃO CRÍTICA: Não prosseguir se payload inválido
      if (!valid) {
        console.error('❌ [CREATE] Payload inválido, abortando operação');
        throw new Error(`Payload inválido: ${errors.join(', ')}`);
      }

      const finalPayload = sanitized;

      console.log('\n📤 ============================================');
      console.log('📤 ENVIANDO PARA SUPABASE');
      console.log('📤 ============================================');
      console.log('Payload Final:', JSON.stringify(finalPayload, null, 2));
      console.log('Campos incluídos:', Object.keys(finalPayload));
      console.log('============================================\n');

      const { data, error } = await supabase
        .from('workouts')
        .insert(finalPayload)
        .select()
        .maybeSingle();

      if (error) {
        console.error('❌ [SUPABASE ERROR]:', error);
        throw error;
      }

      console.log('✅ [SUCCESS] Template criado:', data?.id);

      const formattedData = {
        ...data,
        exercises: Array.isArray(data.exercises) ? data.exercises : []
      };
      setWorkouts(prev => [formattedData, ...prev]);

      console.log('✅ ============================================');
      console.log('✅ CREATE WORKOUT TEMPLATE - SUCESSO');
      console.log('✅ ============================================\n');

      return data;
    } catch (err) {
      console.error('\n❌ ============================================');
      console.error('❌ CREATE WORKOUT TEMPLATE - ERRO');
      console.error('❌ ============================================');
      console.error('Erro:', err);
      console.error('============================================\n');
      throw err;
    }
  }, [user]);

  // Update workout template
  const updateWorkoutTemplate = useCallback(async (id: string, updates: Partial<WorkoutTemplate>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      console.log('\n🔄 ============================================');
      console.log('🔄 UPDATE WORKOUT TEMPLATE - INÍCIO');
      console.log('🔄 ============================================');
      console.log('📥 Template ID:', id);
      console.log('📥 Updates recebidos:', JSON.stringify(updates, null, 2));

      // ESTRATÉGIA MULTICAMADA: Ultra-sanitização com validação
      const { sanitized, valid, errors } = ultraSanitizeWorkoutPayload(updates as any);

      // VALIDAÇÃO CRÍTICA: Não prosseguir se payload inválido
      if (!valid) {
        console.error('❌ [UPDATE] Payload inválido, abortando operação');
        throw new Error(`Payload inválido: ${errors.join(', ')}`);
      }

      console.log('\n📤 ENVIANDO UPDATE PARA SUPABASE');
      console.log('Payload Final:', JSON.stringify(sanitized, null, 2));
      console.log('============================================\n');

      const { data, error } = await supabase
        .from('workouts')
        .update(sanitized)
        .eq('id', id)
        .eq('created_by', user.id)
        .select()
        .single();

      if (error) {
        console.error('❌ [SUPABASE ERROR]:', error);
        throw error;
      }

      console.log('✅ [SUCCESS] Template atualizado:', data?.id);

      const formattedData = {
        ...data,
        exercises: Array.isArray(data.exercises) ? data.exercises : []
      };
      setWorkouts(prev => prev.map(w => w.id === id ? formattedData : w));

      console.log('✅ ============================================');
      console.log('✅ UPDATE WORKOUT TEMPLATE - SUCESSO');
      console.log('✅ ============================================\n');

      return data;
    } catch (err) {
      console.error('\n❌ ============================================');
      console.error('❌ UPDATE WORKOUT TEMPLATE - ERRO');
      console.error('❌ ============================================');
      console.error('Erro:', err);
      console.error('============================================\n');
      throw err;
    }
  }, [user]);

  // Delete workout template
  const deleteWorkoutTemplate = useCallback(async (id: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      console.log('🗑️ [WORKOUT_LIBRARY] Deletando template:', id);

      // CORREÇÃO DEFINITIVA: Usar o serviço unificado deleteTrainingPlans
      const { deleteTrainingPlans } = await import('@/services/deleteTrainingPlans');
      const { isUuid } = await import('@/utils/validators');

      // Validação UUID crítica
      if (!isUuid(id)) {
        throw new Error(`ID inválido para exclusão: ${id}`);
      }

      // Usar serviço unificado que previne "malformed array literal"
      const result = await deleteTrainingPlans(id);

      if (result.error) throw new Error(result.error);

      console.log('✅ [WORKOUT_LIBRARY] Template deletado com sucesso');
      setWorkouts(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      console.error('❌ [WORKOUT_LIBRARY] Erro ao deletar template:', err);
      throw err;
    }
  }, [user]);

  // Filter workouts by category
  const getWorkoutsByCategory = useCallback((category: string) => {
    if (!category) return workouts;
    return workouts.filter(w => w.template_category === category);
  }, [workouts]);

  // Filter workouts by muscle group
  const getWorkoutsByMuscleGroup = useCallback((muscleGroup: string) => {
    if (!muscleGroup) return workouts;
    return workouts.filter(w =>
      w.muscle_groups && w.muscle_groups.includes(muscleGroup)
    );
  }, [workouts]);

  // Search workouts
  const searchWorkouts = useCallback((query: string) => {
    if (!query.trim()) return workouts;

    const searchTerm = query.toLowerCase();
    return workouts.filter(w =>
      w.name.toLowerCase().includes(searchTerm) ||
      (w.description && w.description.toLowerCase().includes(searchTerm)) ||
      (w.tags && w.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
    );
  }, [workouts]);

  // Get workout categories
  const getCategories = useCallback(() => {
    const categories = new Set<string>();
    workouts.forEach(w => {
      if (w.template_category) {
        categories.add(w.template_category);
      }
    });
    return Array.from(categories).sort();
  }, [workouts]);

  // Get muscle groups
  const getMuscleGroups = useCallback(() => {
    const muscleGroups = new Set<string>();
    workouts.forEach(w => {
      if (w.muscle_groups) {
        w.muscle_groups.forEach(mg => muscleGroups.add(mg));
      }
    });
    return Array.from(muscleGroups).sort();
  }, [workouts]);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  return {
    workouts,
    loading,
    error,
    createWorkoutTemplate,
    updateWorkoutTemplate,
    deleteWorkoutTemplate,
    getWorkoutsByCategory,
    getWorkoutsByMuscleGroup,
    searchWorkouts,
    getCategories,
    getMuscleGroups,
    refetch: fetchWorkouts
  };
};