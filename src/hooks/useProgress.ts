import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface ProgressEntry {
  id: string
  user_id: string
  type: string
  value: number
  unit: string
  date: string
  notes?: string
  workout_id?: string
  meal_id?: string
  created_at: string
}

export function useProgress(userId?: string) {
  const [progress, setProgress] = useState<ProgressEntry[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchProgress = async () => {
    if (!userId) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('progress')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })

      if (error) throw error
      setProgress(data || [])
    } catch (error) {
      console.error('Error fetching progress:', error)
      toast({
        title: "Erro ao carregar progresso",
        description: "Não foi possível carregar os dados de progresso.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const addProgress = async (progressData: Omit<ProgressEntry, 'id' | 'created_at'>) => {
    try {
      const { error } = await supabase
        .from('progress')
        .insert([progressData])

      if (error) throw error
      
      // Award points for logging progress
      try {
        await supabase.rpc('award_points', {
          p_user_id: progressData.user_id,
          p_points: 10, // 10 points for each progress entry
          p_activity_type: 'progress_logged',
          p_description: `Registrou progresso: ${progressData.type}`,
          p_metadata: { 
            progress_type: progressData.type,
            value: progressData.value,
            unit: progressData.unit
          }
        })
      } catch (pointsError) {
        console.error('Error awarding points for progress:', pointsError)
        // Don't fail the progress addition if points fail
      }
      
      toast({
        title: "Progresso adicionado",
        description: "Novo registro de progresso foi adicionado com sucesso. +10 pontos!",
      })
      
      await fetchProgress()
    } catch (error) {
      console.error('Error adding progress:', error)
      toast({
        title: "Erro ao adicionar progresso",
        description: "Não foi possível adicionar o registro de progresso.",
        variant: "destructive",
      })
      throw error
    }
  }

  const getProgressByType = (type: string) => {
    return progress.filter(p => p.type === type)
  }

  const getLatestProgress = (type: string) => {
    const typeProgress = getProgressByType(type)
    return typeProgress.length > 0 ? typeProgress[0] : null
  }

  const getProgressStats = () => {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    return {
      total: progress.length,
      thisWeek: progress.filter(p => new Date(p.date) >= oneWeekAgo).length,
      thisMonth: progress.filter(p => new Date(p.date) >= oneMonthAgo).length,
    }
  }

  useEffect(() => {
    fetchProgress()
  }, [userId])

  return {
    progress,
    loading,
    addProgress,
    getProgressByType,
    getLatestProgress,
    getProgressStats,
    refetch: fetchProgress
  }
}