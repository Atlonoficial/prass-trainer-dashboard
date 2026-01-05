import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export interface EvaluationTemplate {
  id: string
  name: string
  description?: string
  questions: any
  physical_measurements: any
  created_by: string
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface Evaluation {
  id: string
  student_id: string
  teacher_id: string
  template_id?: string
  evaluation_date: string
  status: string
  overall_score?: number
  teacher_notes?: string
  student_notes?: string
  physical_measurements: any
  created_at: string
  updated_at: string
  template?: EvaluationTemplate
  responses?: EvaluationResponse[]
  student_name?: string
  student_avatar?: string
}

export interface EvaluationResponse {
  id: string
  evaluation_id: string
  question_id: string
  question_text: string
  response_type: string
  response_value: any
  created_at: string
}

export interface CreateEvaluationData {
  student_id: string
  template_id?: string
  physical_measurements: any
  responses: Array<{
    question_id: string
    question_text: string
    response_type: string
    response_value: any
  }>
  teacher_notes?: string
  overall_score?: number
}

export function useComprehensiveEvaluations(studentId?: string) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
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

      // Primeiro, tentar verificar se a tabela existe com query simples
      const { error: tableCheckError } = await supabase
        .from('evaluations')
        .select('id')
        .limit(1)

      // Se a tabela não existe ou há erro de relação, usar dados de progresso
      if (tableCheckError) {
        console.log('Evaluations table check failed, using progress data:', tableCheckError.message)
        const progressEvaluations = await fetchProgressAsEvaluations()
        setEvaluations(progressEvaluations)
        setLoading(false)
        return
      }

      // Tabela existe, buscar sem os relacionamentos problemáticos
      let query = supabase
        .from('evaluations')
        .select('*')
        .order('evaluation_date', { ascending: false })

      // If studentId is provided, filter by that specific student
      if (studentId) {
        query = query.eq('student_id', studentId)
      } else {
        // Otherwise, get evaluations for all students of this teacher
        query = query.eq('teacher_id', user.id)
      }

      const { data: evaluationsData, error } = await query

      if (error) {
        // Se houver erro, usar dados de progresso como fallback
        console.log('Evaluations query failed, using progress data:', error.message)
        const progressEvaluations = await fetchProgressAsEvaluations()
        setEvaluations(progressEvaluations)
        setLoading(false)
        return
      }

      // If no evaluations found, try to create from progress data
      if (!evaluationsData || evaluationsData.length === 0) {
        const progressEvaluations = await fetchProgressAsEvaluations()
        setEvaluations(progressEvaluations)
        return
      }

      // Get student names for evaluations
      const studentIds = [...new Set(evaluationsData?.map(e => e.student_id).filter(Boolean) || [])]

      let profiles: any[] = []
      if (studentIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', studentIds)

        if (profilesError) throw profilesError
        profiles = profilesData || []
      }

      const profileMap = new Map(profiles.map(p => [p.id, p]))

      const mappedEvaluations: Evaluation[] = (evaluationsData || []).map(evaluation => ({
        ...evaluation,
        student_name: profileMap.get(evaluation.student_id)?.name || 'Aluno',
        student_avatar: profileMap.get(evaluation.student_id)?.avatar_url
      }))

      setEvaluations(mappedEvaluations)
    } catch (error: any) {
      console.error('Error fetching evaluations:', error)
      // Não exibir erro se for apenas tabela não encontrada ou vazia
      const errorMessage = error?.message || ''
      const isTableNotFound = errorMessage.includes('relation') && errorMessage.includes('does not exist')
      const isPermissionError = errorMessage.includes('permission denied')

      if (!isTableNotFound && !isPermissionError) {
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


  const fetchProgressAsEvaluations = async (): Promise<Evaluation[]> => {
    try {
      let progressQuery = supabase
        .from('progress')
        .select('*')
        .order('date', { ascending: false })

      // Filter by student or teacher's students
      if (studentId) {
        progressQuery = progressQuery.eq('user_id', studentId)
      } else {
        // Get students of this teacher
        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select('user_id')
          .eq('teacher_id', user.id)

        if (studentsError) throw studentsError

        const studentUserIds = students?.map(s => s.user_id).filter(Boolean) || []

        if (studentUserIds.length === 0) {
          return []
        }

        progressQuery = progressQuery.in('user_id', studentUserIds)
      }

      const { data: progressData, error } = await progressQuery

      if (error) throw error

      // Group progress data by date and student
      const groupedData = groupProgressByDateAndStudent(progressData || [])

      // Get student names
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

      // Convert grouped data to evaluation format
      const evaluations: Evaluation[] = Object.entries(groupedData).map(([key, group]) => {
        const [userId, date] = key.split('::')
        const measurementTypes = group.map(p => p.type).join(', ')

        return {
          id: `progress-${key}`,
          student_id: userId,
          teacher_id: user.id!,
          template_id: null,
          evaluation_date: date,
          status: 'completed',
          overall_score: calculateProgressScore(group),
          teacher_notes: `Avaliação gerada automaticamente a partir de ${group.length} medida(s): ${measurementTypes}`,
          student_notes: null,
          physical_measurements: convertToPhysicalMeasurements(group),
          created_at: group[0].created_at,
          updated_at: group[0].created_at,
          student_name: profileMap.get(userId)?.name || 'Aluno',
          student_avatar: profileMap.get(userId)?.avatar_url,
          responses: [],
          template: {
            id: 'virtual-progress',
            name: 'Avaliação do Histórico de Medidas',
            description: 'Dados convertidos automaticamente do histórico de medidas',
            questions: [],
            physical_measurements: [],
            created_by: user.id!,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_active: true
          }
        }
      })

      return evaluations.sort((a, b) => new Date(b.evaluation_date).getTime() - new Date(a.evaluation_date).getTime())
    } catch (error) {
      console.error('Error fetching progress as evaluations:', error)
      return []
    }
  }

  const groupProgressByDateAndStudent = (progressData: any[]) => {
    const grouped: Record<string, any[]> = {}

    progressData.forEach(progress => {
      const date = progress.date.split('T')[0] // Get only the date part
      const key = `${progress.user_id}::${date}`

      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(progress)
    })

    return grouped
  }

  const convertToPhysicalMeasurements = (progressGroup: any[]) => {
    const measurements: Record<string, any> = {}

    progressGroup.forEach(progress => {
      measurements[progress.type] = {
        value: progress.value,
        unit: progress.unit,
        notes: progress.notes
      }
    })

    return measurements
  }

  const calculateProgressScore = (progressGroup: any[]): number => {
    // Simple scoring based on number of measurements
    const baseScore = Math.min(progressGroup.length * 2, 8) // Max 8 points for measurements
    const completenessBonus = progressGroup.some(p => p.notes) ? 1 : 0 // +1 for having notes
    return Math.min(baseScore + completenessBonus, 10)
  }

  const createEvaluation = async (evaluationData: CreateEvaluationData) => {
    try {
      if (!user) throw new Error('Usuário não autenticado')

      // Create the evaluation record
      const { data: evaluation, error: evalError } = await supabase
        .from('evaluations')
        .insert([{
          student_id: evaluationData.student_id,
          teacher_id: user.id,
          template_id: evaluationData.template_id,
          physical_measurements: evaluationData.physical_measurements,
          teacher_notes: evaluationData.teacher_notes,
          overall_score: evaluationData.overall_score,
          status: 'completed'
        }])
        .select()
        .single()

      if (evalError) throw evalError

      // Create responses if any
      if (evaluationData.responses.length > 0) {
        const responses = evaluationData.responses.map(response => ({
          evaluation_id: evaluation.id,
          question_id: response.question_id,
          question_text: response.question_text,
          response_type: response.response_type,
          response_value: response.response_value
        }))

        const { error: responsesError } = await supabase
          .from('evaluation_responses')
          .insert(responses)

        if (responsesError) throw responsesError
      }

      toast({
        title: 'Avaliação criada',
        description: 'A avaliação completa foi salva com sucesso'
      })

      await fetchEvaluations()
      return evaluation
    } catch (error: any) {
      console.error('Error creating evaluation:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar a avaliação',
        variant: 'destructive'
      })
      throw error
    }
  }

  const getEvaluationById = (id: string) => {
    return evaluations.find(evaluation => evaluation.id === id)
  }

  const getEvaluationStats = () => {
    const today = new Date()
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)

    return {
      total: evaluations.length,
      thisMonth: evaluations.filter(e => new Date(e.evaluation_date) >= thisMonth).length,
      lastMonth: evaluations.filter(e => {
        const date = new Date(e.evaluation_date)
        return date >= lastMonth && date < thisMonth
      }).length,
      completed: evaluations.filter(e => e.status === 'completed').length,
      pending: evaluations.filter(e => e.status === 'pending').length,
      fromProgress: evaluations.filter(e => e.id.startsWith('progress-')).length,
      fromEvaluations: evaluations.filter(e => !e.id.startsWith('progress-')).length
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
        { event: 'INSERT', schema: 'public', table: 'evaluations' },
        () => fetchEvaluations()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'evaluations' },
        () => fetchEvaluations()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, studentId])

  return {
    evaluations,
    loading,
    createEvaluation,
    getEvaluationById,
    getEvaluationStats,
    refetch: fetchEvaluations
  }
}
