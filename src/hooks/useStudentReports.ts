import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from './use-toast'

export interface StudentReportMetrics {
  totalWorkouts: number
  workoutCompletion: number
  dietAdherence: number
  progressEntries: number
  lastActivity: string | null
  points: number
  level: number
}

export interface StudentProgressData {
  date: string
  weight?: number
  workouts: number
  dietScore: number
  points: number
}

export function useStudentReports(studentId?: string, period: 'semana' | 'mes' | 'semestre' = 'mes') {
  const [metrics, setMetrics] = useState<StudentReportMetrics>({
    totalWorkouts: 0,
    workoutCompletion: 0,
    dietAdherence: 0,
    progressEntries: 0,
    lastActivity: null,
    points: 0,
    level: 1
  })
  const [progressData, setProgressData] = useState<StudentProgressData[]>([])
  const [loading, setLoading] = useState(true)
  
  const { toast } = useToast()

  const fetchStudentMetrics = async () => {
    if (!studentId) return

    try {
      setLoading(true)

      // Buscar pontos do usuário
      const { data: userPoints } = await supabase
        .from('user_points')
        .select('total_points, level, last_activity_date')
        .eq('user_id', studentId)
        .single()

      // Buscar atividades de gamificação para métricas
      const { data: activities } = await supabase
        .from('gamification_activities')
        .select('activity_type, points_earned, created_at')
        .eq('user_id', studentId)
        .order('created_at', { ascending: false })

      // Buscar dados de progresso
      const { data: progressEntries } = await supabase
        .from('progress')
        .select('*')
        .eq('user_id', studentId)
        .order('date', { ascending: false })

      // Calcular métricas
      const workoutActivities = activities?.filter(a => a.activity_type === 'training_completed') || []
      const mealActivities = activities?.filter(a => a.activity_type === 'meal_logged') || []
      
      const totalWorkouts = workoutActivities.length
      const workoutCompletion = totalWorkouts > 0 ? Math.round((totalWorkouts / 30) * 100) : 0 // assumindo 30 dias
      const dietAdherence = mealActivities.length > 0 ? Math.round((mealActivities.length / 90) * 100) : 0 // assumindo 3 refeições/dia por 30 dias

      setMetrics({
        totalWorkouts,
        workoutCompletion: Math.min(workoutCompletion, 100),
        dietAdherence: Math.min(dietAdherence, 100),
        progressEntries: progressEntries?.length || 0,
        lastActivity: userPoints?.last_activity_date || null,
        points: userPoints?.total_points || 0,
        level: userPoints?.level || 1
      })

      // Preparar dados de progresso para gráficos com base no período selecionado
      const periodDays = {
        semana: 7,
        mes: 30,
        semestre: 180
      }[period];
      
      const lastDays = Array.from({ length: periodDays }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (periodDays - 1 - i))
        return date.toISOString().split('T')[0]
      })

      const chartData = lastDays.map(date => {
        const dayActivities = activities?.filter(a => 
          a.created_at.startsWith(date)
        ) || []
        
        const dayProgress = progressEntries?.find(p => p.date === date)
        const dayWorkouts = dayActivities.filter(a => a.activity_type === 'training_completed').length
        const dayMeals = dayActivities.filter(a => a.activity_type === 'meal_logged').length
        const dayPoints = dayActivities.reduce((sum, a) => sum + a.points_earned, 0)

        return {
          date,
          weight: dayProgress?.type === 'weight' ? dayProgress.value : undefined,
          workouts: dayWorkouts,
          dietScore: Math.round((dayMeals / 3) * 100), // 3 refeições por dia
          points: dayPoints
        }
      })

      setProgressData(chartData)

    } catch (error) {
      console.error('Error fetching student metrics:', error)
      toast({
        title: "Erro ao carregar relatório",
        description: "Não foi possível carregar os dados do aluno.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const exportStudentReport = async (studentName: string) => {
    try {
      const reportData = {
        studentName,
        studentId,
        generatedAt: new Date().toLocaleString('pt-BR'),
        metrics,
        progressData: progressData.filter(p => p.workouts > 0 || p.dietScore > 0 || p.points > 0)
      }

      const csvContent = [
        'Data,Treinos,Adesão Dieta (%),Pontos,Peso (kg)',
        ...reportData.progressData.map(p => 
          `${p.date},${p.workouts},${p.dietScore},${p.points},${p.weight || ''}`
        )
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `relatorio_${studentName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Relatório exportado",
        description: "O relatório do aluno foi exportado com sucesso.",
      })
    } catch (error) {
      console.error('Error exporting report:', error)
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível exportar o relatório.",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    fetchStudentMetrics()
  }, [studentId, period])

  return {
    metrics,
    progressData,
    loading,
    refetch: fetchStudentMetrics,
    exportReport: exportStudentReport
  }
}