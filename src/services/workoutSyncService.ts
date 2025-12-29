/**
 * Serviço de Sincronização de Workouts com App do Aluno
 * Gerencia sync_status e last_synced_at para coordenar com o app mobile
 */

import { supabase } from '@/integrations/supabase/client';

export type SyncStatus = 'pending' | 'synced' | 'error';

interface SyncResult {
  success: boolean;
  workoutId?: string;
  error?: string;
  syncedAt?: string;
}

export class WorkoutSyncService {
  /**
   * Marca workout como pendente de sincronização
   */
  static async markAsPending(workoutId: string): Promise<SyncResult> {
    try {
      const { error } = await supabase
        .from('workouts')
        .update({
          sync_status: 'pending',
          last_synced_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', workoutId);

      if (error) throw error;

      console.log(`🔄 [SYNC] Workout ${workoutId} marked as pending`);
      return { success: true, workoutId };
    } catch (error) {
      console.error('❌ [SYNC] Error marking as pending:', error);
      return { 
        success: false, 
        workoutId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Marca workout como sincronizado
   */
  static async markAsSynced(workoutId: string): Promise<SyncResult> {
    try {
      const syncedAt = new Date().toISOString();
      
      const { error } = await supabase
        .from('workouts')
        .update({
          sync_status: 'synced',
          last_synced_at: syncedAt
        })
        .eq('id', workoutId);

      if (error) throw error;

      console.log(`✅ [SYNC] Workout ${workoutId} synced at ${syncedAt}`);
      return { success: true, workoutId, syncedAt };
    } catch (error) {
      console.error('❌ [SYNC] Error marking as synced:', error);
      return { 
        success: false, 
        workoutId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Marca workout com erro de sincronização
   */
  static async markAsError(workoutId: string, errorMessage?: string): Promise<SyncResult> {
    try {
      const { error } = await supabase
        .from('workouts')
        .update({
          sync_status: 'error',
          last_synced_at: new Date().toISOString()
        })
        .eq('id', workoutId);

      if (error) throw error;

      console.log(`⚠️ [SYNC] Workout ${workoutId} marked with error: ${errorMessage}`);
      return { success: true, workoutId, error: errorMessage };
    } catch (error) {
      console.error('❌ [SYNC] Error marking as error:', error);
      return { 
        success: false, 
        workoutId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Busca workouts pendentes de sincronização
   */
  static async getPendingWorkouts(studentId?: string) {
    try {
      let query = supabase
        .from('workouts')
        .select('id, name, assigned_to, created_at, updated_at')
        .eq('sync_status', 'pending')
        .order('created_at', { ascending: false });

      if (studentId) {
        query = query.contains('assigned_to', [studentId]);
      }

      const { data, error } = await query;

      if (error) throw error;

      console.log(`📋 [SYNC] Found ${data?.length || 0} pending workouts`);
      return data || [];
    } catch (error) {
      console.error('❌ [SYNC] Error fetching pending workouts:', error);
      return [];
    }
  }

  /**
   * Busca workouts que precisam ser re-sincronizados (modificados após última sync)
   */
  static async getStaleWorkouts(studentId?: string) {
    try {
      let query = supabase
        .from('workouts')
        .select('id, name, assigned_to, created_at, updated_at, last_synced_at')
        .eq('sync_status', 'synced')
        .order('updated_at', { ascending: false });

      if (studentId) {
        query = query.contains('assigned_to', [studentId]);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter workouts where updated_at > last_synced_at
      const staleWorkouts = (data || []).filter(workout => {
        if (!workout.last_synced_at) return true;
        return new Date(workout.updated_at) > new Date(workout.last_synced_at);
      });

      console.log(`🔄 [SYNC] Found ${staleWorkouts.length} stale workouts`);
      return staleWorkouts;
    } catch (error) {
      console.error('❌ [SYNC] Error fetching stale workouts:', error);
      return [];
    }
  }

  /**
   * Sincronização em lote
   */
  static async syncBatch(workoutIds: string[]): Promise<{ 
    success: number; 
    failed: number; 
    errors: string[] 
  }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    console.log(`🔄 [SYNC] Starting batch sync for ${workoutIds.length} workouts`);

    for (const workoutId of workoutIds) {
      const result = await this.markAsSynced(workoutId);
      if (result.success) {
        success++;
      } else {
        failed++;
        if (result.error) errors.push(result.error);
      }
    }

    console.log(`✅ [SYNC] Batch sync complete: ${success} success, ${failed} failed`);
    return { success, failed, errors };
  }

  /**
   * Verifica status de sincronização de um workout
   */
  static async checkSyncStatus(workoutId: string): Promise<{
    status: SyncStatus;
    lastSynced: string | null;
    needsSync: boolean;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('sync_status, last_synced_at, updated_at')
        .eq('id', workoutId)
        .single();

      if (error) throw error;

      const needsSync = !data.last_synced_at || 
        (data.updated_at && new Date(data.updated_at) > new Date(data.last_synced_at));

      return {
        status: (data.sync_status as SyncStatus) || 'pending',
        lastSynced: data.last_synced_at,
        needsSync
      };
    } catch (error) {
      console.error('❌ [SYNC] Error checking sync status:', error);
      return null;
    }
  }

  /**
   * Reseta status de todos os workouts para forçar re-sincronização
   */
  static async resetAllSyncStatus(): Promise<SyncResult> {
    try {
      const { error } = await supabase
        .from('workouts')
        .update({
          sync_status: 'pending',
          last_synced_at: null
        })
        .neq('sync_status', 'pending'); // Atualiza apenas os que não são pending

      if (error) throw error;

      console.log(`🔄 [SYNC] All workouts reset to pending`);
      return { success: true };
    } catch (error) {
      console.error('❌ [SYNC] Error resetting sync status:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Export convenience functions
export const markWorkoutAsPending = WorkoutSyncService.markAsPending;
export const markWorkoutAsSynced = WorkoutSyncService.markAsSynced;
export const markWorkoutAsError = WorkoutSyncService.markAsError;
export const getPendingWorkouts = WorkoutSyncService.getPendingWorkouts;
export const getStaleWorkouts = WorkoutSyncService.getStaleWorkouts;
export const syncWorkoutsBatch = WorkoutSyncService.syncBatch;
export const checkWorkoutSyncStatus = WorkoutSyncService.checkSyncStatus;
