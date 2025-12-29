import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { workoutsCache } from '@/utils/cacheManager';
import { markWorkoutAsPending } from '@/services/workoutSyncService';

export interface Workout {
  id: string;
  name: string;
  description: string | null;
  exercises: any;
  assigned_to: string[] | null;
  created_by: string;
  is_template: boolean;
  template_category: string | null;
  difficulty: string | null;
  muscle_groups: string[] | null;
  tags: string[] | null;
  sessions: number | null;
  last_completed: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  sync_status: string | null;
  last_synced_at: string | null;
  image_url: string | null;
  estimated_duration: number | null;
  estimated_calories: number | null;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkoutData {
  name: string;
  description?: string | null;
  exercises: any;
  assigned_to?: string[] | null;
  is_template?: boolean;
  template_category?: string | null;
  difficulty?: string | null;
  muscle_groups?: string[] | null;
  tags?: string[] | null;
  sessions?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
  image_url?: string | null;
  estimated_duration?: number | null;
  estimated_calories?: number | null;
}

export const useWorkouts = (studentId?: string) => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchWorkouts = useCallback(async () => {
    if (!user) return;

    // Check cache first
    const cacheKey = `workouts-${user.id}-${studentId || 'all'}`;
    const cached = workoutsCache.get(cacheKey);
    
    if (cached) {
      console.log('✅ [WORKOUTS] Using cached data');
      setWorkouts(cached);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('workouts')
        .select('*')
        .eq('created_by', user.id);

      // Filter by student if provided
      if (studentId) {
        query = query.contains('assigned_to', [studentId]);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      const formattedData = (data || []).map(workout => ({
        ...workout,
        exercises: Array.isArray(workout.exercises) ? workout.exercises : []
      }));

      setWorkouts(formattedData);
      
      // Cache the results
      workoutsCache.set(cacheKey, formattedData);
      console.log('💾 [WORKOUTS] Data cached');
    } catch (err) {
      console.error('Error fetching workouts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load workouts');
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os treinos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [user, studentId, toast]);

  const createWorkout = useCallback(async (workoutData: CreateWorkoutData) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('workouts')
        .insert([{
          name: workoutData.name,
          description: workoutData.description,
          exercises: workoutData.exercises,
          assigned_to: workoutData.assigned_to,
          is_template: workoutData.is_template ?? false,
          template_category: workoutData.template_category,
          difficulty: workoutData.difficulty,
          muscle_groups: workoutData.muscle_groups,
          tags: workoutData.tags,
          sessions: workoutData.sessions,
          start_date: workoutData.start_date,
          end_date: workoutData.end_date,
          status: workoutData.status,
          image_url: workoutData.image_url,
          estimated_duration: workoutData.estimated_duration,
          estimated_calories: workoutData.estimated_calories,
          created_by: user.id,
          sync_status: 'pending',
          last_synced_at: null
        }])
        .select()
        .single();

      if (error) throw error;

      const formattedData = {
        ...data,
        exercises: Array.isArray(data.exercises) ? data.exercises : []
      };
      
      setWorkouts(prev => [formattedData, ...prev]);
      
      // Invalidate cache
      workoutsCache.invalidateByPattern(`workouts-${user.id}`);
      
      // Mark as pending for student app sync
      await markWorkoutAsPending(data.id);
      
      toast({
        title: 'Sucesso',
        description: 'Treino criado com sucesso'
      });
      
      return data;
    } catch (err) {
      console.error('Error creating workout:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o treino',
        variant: 'destructive'
      });
      throw err;
    }
  }, [user, toast]);

  const updateWorkout = useCallback(async (id: string, updates: Partial<Workout>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const payload = {
        ...updates,
        sync_status: 'pending'
      };

      const { data, error } = await supabase
        .from('workouts')
        .update(payload)
        .eq('id', id)
        .eq('created_by', user.id)
        .select()
        .single();

      if (error) throw error;

      const formattedData = {
        ...data,
        exercises: Array.isArray(data.exercises) ? data.exercises : []
      };
      
      setWorkouts(prev => prev.map(w => w.id === id ? formattedData : w));
      
      // Invalidate cache
      workoutsCache.invalidateByPattern(`workouts-${user.id}`);
      
      // Mark as pending for student app sync
      await markWorkoutAsPending(id);
      
      toast({
        title: 'Sucesso',
        description: 'Treino atualizado com sucesso'
      });
      
      return data;
    } catch (err) {
      console.error('Error updating workout:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o treino',
        variant: 'destructive'
      });
      throw err;
    }
  }, [user, toast]);

  const deleteWorkout = useCallback(async (id: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', id)
        .eq('created_by', user.id);

      if (error) throw error;

      setWorkouts(prev => prev.filter(w => w.id !== id));
      
      // Invalidate cache
      workoutsCache.invalidateByPattern(`workouts-${user.id}`);
      
      toast({
        title: 'Sucesso',
        description: 'Treino excluído com sucesso'
      });
    } catch (err) {
      console.error('Error deleting workout:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o treino',
        variant: 'destructive'
      });
      throw err;
    }
  }, [user, toast]);

  const markAsSynced = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('workouts')
        .update({
          sync_status: 'synced',
          last_synced_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setWorkouts(prev => prev.map(w => 
        w.id === id 
          ? { ...w, sync_status: 'synced', last_synced_at: new Date().toISOString() }
          : w
      ));
    } catch (err) {
      console.error('Error marking workout as synced:', err);
    }
  }, []);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  // Real-time subscriptions for workouts
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`workouts-${user.id}`)
      .on(
        'postgres_changes' as any,
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'workouts',
          filter: `created_by=eq.${user.id}`
        },
        (payload: any) => {
          const newWorkout = payload.new as Workout;
          setWorkouts((prev) => [newWorkout, ...prev]);
          // Invalidate cache on real-time update
          workoutsCache.invalidateByPattern(`workouts-${user.id}`);
        }
      )
      .on(
        'postgres_changes' as any,
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'workouts',
          filter: `created_by=eq.${user.id}`
        },
        (payload: any) => {
          const updated = payload.new as Workout;
          setWorkouts((prev) =>
            prev.map((w) => (w.id === updated.id ? updated : w))
          );
          // Invalidate cache on real-time update
          workoutsCache.invalidateByPattern(`workouts-${user.id}`);
        }
      )
      .on(
        'postgres_changes' as any,
        { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'workouts',
          filter: `created_by=eq.${user.id}`
        },
        (payload: any) => {
          const deleted = payload.old as Workout;
          setWorkouts((prev) => prev.filter(w => w.id !== deleted.id));
          // Invalidate cache on real-time update
          workoutsCache.invalidateByPattern(`workouts-${user.id}`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return {
    workouts,
    loading,
    error,
    createWorkout,
    updateWorkout,
    deleteWorkout,
    markAsSynced,
    refetch: fetchWorkouts
  };
};
