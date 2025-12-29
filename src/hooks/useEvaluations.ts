import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export interface Evaluation {
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

export interface EvaluationWithStudent extends Evaluation {
  student_name: string
  student_avatar?: string
}

export function useEvaluations(studentId?: string) {
  const [evaluations, setEvaluations] = useState<EvaluationWithStudent[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()

  const fetchEvaluations = async () => {
    if (!user) {
      setEvaluations([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      let query = supabase
        .from('progress')
        .select('*')
        .order('date', { ascending: false })

      // If studentId is provided, filter by that specific student
      if (studentId) {
        query = query.eq('user_id', studentId)
      } else {
        // Otherwise, get evaluations for all students of this teacher
        // First get students of this teacher
        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select('user_id')
          .eq('teacher_id', user.id)

        if (studentsError) throw studentsError

        const studentUserIds = students?.map(s => s.user_id).filter(Boolean) || []

        if (studentUserIds.length === 0) {
          setEvaluations([])
          setLoading(false)
          return
        }

        query = query.in('user_id', studentUserIds)
      }

      const { data: progressData, error } = await query

      if (error) throw error

      // Get profiles for all user_ids in the results
      const userIds = [...new Set(progressData?.map(p => p.user_id).filter(Boolean) || [])]

      let profiles: any[] = []
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', userIds)

        if (profilesError) throw profilesError
        profiles = profilesData || []
      }

      const profileMap = new Map(profiles.map(p => [p.id, p]))

      const mappedEvaluations: EvaluationWithStudent[] = (progressData || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        type: item.type,
        value: item.value,
        unit: item.unit,
        date: item.date,
        notes: item.notes || undefined,
        workout_id: item.workout_id || undefined,
        meal_id: item.meal_id || undefined,
        created_at: item.created_at,
        student_name: profileMap.get(item.user_id)?.name || 'Aluno',
        student_avatar: profileMap.get(item.user_id)?.avatar_url || undefined
      }))

      setEvaluations(mappedEvaluations)
    } catch (error: any) {
      console.error('Error fetching evaluations:', error)
      // Não exibir erro se for tabela não encontrada
      const errorMessage = error?.message || ''
      const isTableNotFound = errorMessage.includes('relation') && errorMessage.includes('does not exist')

      if (!isTableNotFound) {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as avaliações',
          variant: 'destructive'
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const addEvaluation = async (evaluationData: Omit<Evaluation, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('progress')
        .insert([evaluationData])
        .select()
        .single()

      if (error) throw error

      toast({
        title: 'Avaliação adicionada',
        description: 'A avaliação foi salva com sucesso'
      })

      await fetchEvaluations()
      return data
    } catch (error: any) {
      console.error('Error adding evaluation:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível adicionar a avaliação',
        variant: 'destructive'
      })
      throw error
    }
  }

  const getEvaluationsByType = (type: string) => {
    return evaluations.filter(evaluation => evaluation.type === type)
  }

  const getLatestEvaluationByType = (type: string, userId?: string) => {
    const filtered = evaluations.filter(evaluation =>
      evaluation.type === type &&
      (userId ? evaluation.user_id === userId : true)
    )
    return filtered.length > 0 ? filtered[0] : null
  }

  const getEvaluationStats = () => {
    const today = new Date()
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    return {
      total: evaluations.length,
      thisWeek: evaluations.filter(evaluation => new Date(evaluation.date) >= thisWeek).length,
      thisMonth: evaluations.filter(evaluation => new Date(evaluation.date) >= thisMonth).length,
      byType: evaluations.reduce((acc, evaluation) => {
        acc[evaluation.type] = (acc[evaluation.type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }
  }

  // Set up real-time subscription
  useEffect(() => {
    fetchEvaluations()

    if (!user?.id) return

    const channel = supabase
      .channel('evaluations-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'progress' },
        (payload: any) => {
          console.log('Nova avaliação recebida:', payload.new)
          fetchEvaluations()

          // Show notification for new evaluation
          toast({
            title: 'Nova Avaliação Recebida!',
            description: `Uma nova avaliação de ${payload.new.type} foi adicionada`,
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'progress' },
        () => {
          fetchEvaluations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, studentId])

  return {
    evaluations,
    loading,
    addEvaluation,
    getEvaluationsByType,
    getLatestEvaluationByType,
    getEvaluationStats,
    refetch: fetchEvaluations
  }
}
