import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GamificationSettings {
  id: string;
  teacher_id: string;
  points_workout: number;
  points_checkin: number;
  points_meal_log: number;
  points_progress_update: number;
  points_goal_achieved: number;
  points_assessment: number;
  points_medical_exam: number;
  points_ai_interaction: number;
  points_teacher_message: number;
  level_up_bonus: number;
  max_daily_points: number;
  streak_multiplier: number;
  auto_reset_enabled: boolean;
  next_reset_date: string | null;
  reset_frequency: string;
  created_at: string;
  updated_at: string;
}

export interface PointsResetHistory {
  id: string;
  teacher_id: string;
  reset_date: string;
  reset_type: string;
  affected_students: number;
  total_points_reset: number;
  reason: string | null;
  backup_data: any;
  created_at: string;
}

export const useGamificationSettings = (teacherId?: string) => {
  const [settings, setSettings] = useState<GamificationSettings | null>(null);
  const [resetHistory, setResetHistory] = useState<PointsResetHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    if (!teacherId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gamification_settings')
        .select('*')
        .eq('teacher_id', teacherId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Create default settings if none exist
        const { data: newSettings, error: createError } = await supabase
          .from('gamification_settings')
          .insert({
            teacher_id: teacherId,
            points_workout: 75,
            points_checkin: 10,
            points_meal_log: 25,
            points_progress_update: 100,
            points_goal_achieved: 300,
            points_assessment: 150,
            points_medical_exam: 100,
            points_ai_interaction: 5,
            points_teacher_message: 20,
            level_up_bonus: 50,
            max_daily_points: 500,
            streak_multiplier: 1.5,
            auto_reset_enabled: false,
            reset_frequency: 'manual'
          })
          .select()
          .single();

        if (createError) throw createError;
        setSettings(newSettings);
      } else {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações de gamificação",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchResetHistory = async () => {
    if (!teacherId) return;

    try {
      const { data, error } = await supabase
        .from('points_reset_history')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('reset_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setResetHistory(data || []);
    } catch (error) {
      console.error('Error fetching reset history:', error);
    }
  };

  const updateSettings = async (updates: Partial<GamificationSettings>) => {
    if (!teacherId || !settings) return;

    try {
      const { data, error } = await supabase
        .from('gamification_settings')
        .update(updates)
        .eq('teacher_id', teacherId)
        .select()
        .single();

      if (error) throw error;
      
      setSettings(data);
      toast({
        title: "Sucesso",
        description: "Configurações atualizadas com sucesso",
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar configurações",
        variant: "destructive",
      });
    }
  };

  const resetAllPoints = async (reason: string = 'Reset manual') => {
    if (!teacherId) return;

    try {
      setResetting(true);
      const { data, error } = await supabase.rpc('reset_all_student_points', {
        p_teacher_id: teacherId,
        p_reason: reason
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Pontos resetados! ${(data as any).affected_students} alunos afetados`,
      });

      // Refresh history
      await fetchResetHistory();
      
      return data;
    } catch (error) {
      console.error('Error resetting points:', error);
      toast({
        title: "Erro",
        description: "Erro ao resetar pontuações",
        variant: "destructive",
      });
      throw error;
    } finally {
      setResetting(false);
    }
  };

  const getActivityTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'training_completed': 'Treino Concluído',
      'daily_checkin': 'Check-in Diário',
      'meal_logged': 'Refeição Registrada',
      'progress_logged': 'Progresso Atualizado',
      'goal_achieved': 'Meta Alcançada',
      'assessment_completed': 'Avaliação Concluída',
      'medical_exam_uploaded': 'Exame Médico',
      'ai_interaction': 'Interação com IA',
      'teacher_message': 'Mensagem do Professor'
    };
    return labels[type] || type;
  };

  const getPointsForActivity = (activityType: string): number => {
    if (!settings) return 0;
    
    const pointsMap: Record<string, keyof GamificationSettings> = {
      'training_completed': 'points_workout',
      'daily_checkin': 'points_checkin',
      'meal_logged': 'points_meal_log',
      'progress_logged': 'points_progress_update',
      'goal_achieved': 'points_goal_achieved',
      'assessment_completed': 'points_assessment',
      'medical_exam_uploaded': 'points_medical_exam',
      'ai_interaction': 'points_ai_interaction',
      'teacher_message': 'points_teacher_message'
    };
    
    const key = pointsMap[activityType];
    return key ? (settings[key] as number) : 0;
  };

  useEffect(() => {
    if (teacherId) {
      fetchSettings();
      fetchResetHistory();
    }
  }, [teacherId]);

  // Real-time updates
  useEffect(() => {
    if (!teacherId) return;

    const channel = supabase
      .channel('gamification-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gamification_settings',
          filter: `teacher_id=eq.${teacherId}`
        },
        () => {
          fetchSettings();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'points_reset_history',
          filter: `teacher_id=eq.${teacherId}`
        },
        () => {
          fetchResetHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teacherId]);

  return {
    settings,
    resetHistory,
    loading,
    resetting,
    updateSettings,
    resetAllPoints,
    getActivityTypeLabel,
    getPointsForActivity,
    refetch: fetchSettings
  };
};