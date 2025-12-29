import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import type { Achievement } from './useGameification'

export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchAchievements = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAchievements(data || [])
    } catch (error) {
      console.error('Error fetching achievements:', error)
      toast({
        title: "Erro ao carregar conquistas",
        description: "Não foi possível carregar as conquistas.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const createAchievement = async (achievementData: Omit<Achievement, 'id' | 'created_by' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('achievements')
        .insert([{
          ...achievementData,
          created_by: user.id
        }])

      if (error) throw error

      toast({
        title: "Conquista criada",
        description: "Nova conquista foi criada com sucesso.",
      })

      await fetchAchievements()
    } catch (error) {
      console.error('Error creating achievement:', error)
      toast({
        title: "Erro ao criar conquista",
        description: "Não foi possível criar a conquista.",
        variant: "destructive",
      })
      throw error
    }
  }

  const updateAchievement = async (id: string, updates: Partial<Achievement>) => {
    try {
      const { error } = await supabase
        .from('achievements')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Conquista atualizada",
        description: "Conquista foi atualizada com sucesso.",
      })

      await fetchAchievements()
    } catch (error) {
      console.error('Error updating achievement:', error)
      toast({
        title: "Erro ao atualizar conquista",
        description: "Não foi possível atualizar a conquista.",
        variant: "destructive",
      })
      throw error
    }
  }

  const deleteAchievement = async (id: string) => {
    try {
      const { error } = await supabase
        .from('achievements')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Conquista desativada",
        description: "Conquista foi desativada com sucesso.",
      })

      await fetchAchievements()
    } catch (error) {
      console.error('Error deactivating achievement:', error)
      toast({
        title: "Erro ao desativar conquista",
        description: "Não foi possível desativar a conquista.",
        variant: "destructive",
      })
      throw error
    }
  }

  const getConditionTypeLabel = (type: Achievement['condition_type']) => {
    switch (type) {
      case 'training_count': return 'Número de Treinos'
      case 'streak_days': return 'Dias Consecutivos'
      case 'progress_milestone': return 'Marco de Progresso'
      case 'appointment_count': return 'Número de Consultas'
      case 'custom': return 'Personalizado'
      default: return type
    }
  }

  const getRarityOptions = () => [
    { value: 'bronze', label: 'Bronze', color: 'text-amber-600' },
    { value: 'silver', label: 'Prata', color: 'text-slate-400' },
    { value: 'gold', label: 'Ouro', color: 'text-yellow-500' },
    { value: 'platinum', label: 'Platina', color: 'text-purple-500' },
    { value: 'diamond', label: 'Diamante', color: 'text-blue-500' },
  ]

  const getConditionTypeOptions = () => [
    { value: 'training_count', label: 'Número de Treinos' },
    { value: 'streak_days', label: 'Dias Consecutivos' },
    { value: 'progress_milestone', label: 'Marco de Progresso' },
    { value: 'appointment_count', label: 'Número de Consultas' },
    { value: 'custom', label: 'Personalizado' },
  ]

  useEffect(() => {
    fetchAchievements()
  }, [])

  // Real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel('achievements-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'achievements'
      }, () => {
        fetchAchievements()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [])

  return {
    achievements,
    loading,
    createAchievement,
    updateAchievement,
    deleteAchievement,
    getConditionTypeLabel,
    getRarityOptions,
    getConditionTypeOptions,
    refetch: fetchAchievements
  }
}