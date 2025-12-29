import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface StudentRanking {
  user_id: string
  name: string
  avatar_url?: string
  total_points: number
  level: number
  current_streak: number
  position: number
}

export function useUserPoints(teacherId?: string) {
  const [rankings, setRankings] = useState<StudentRanking[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchStudentRankings = async () => {
    if (!teacherId) return

    try {
      setLoading(true)

      // First get student IDs for this teacher
      const { data: studentIds, error: studentsError } = await supabase
        .from('students')
        .select('user_id')
        .eq('teacher_id', teacherId)

      if (studentsError) {
        console.error('Error fetching students:', studentsError)
        // Se não conseguir buscar alunos, apenas retornar vazio (não é erro crítico)
        setRankings([])
        return
      }

      if (!studentIds || studentIds.length === 0) {
        setRankings([])
        return
      }

      const userIds = studentIds.map(s => s.user_id).filter(id => id != null)

      if (userIds.length === 0) {
        setRankings([])
        return
      }

      // Get user points data - pode não existir para todos os alunos
      let pointsData: any[] = []
      try {
        const { data, error: pointsError } = await supabase
          .from('user_points')
          .select('user_id, total_points, level, current_streak')
          .in('user_id', userIds)
          .order('total_points', { ascending: false })

        if (pointsError) {
          console.warn('Warning fetching user_points (may not exist):', pointsError)
          // Continuar mesmo sem dados de pontos
        } else {
          pointsData = data || []
        }
      } catch (e) {
        console.warn('user_points table may not exist:', e)
      }

      // Get profiles data separately
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', userIds)

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
        // Continuar mesmo sem profiles
      }

      // Create a map of profiles for easy lookup
      const profilesMap = (profilesData || []).reduce((acc: any, profile: any) => {
        acc[profile.id] = profile
        return acc
      }, {})

      // Merge the data and handle cases where user_points might not exist
      const formattedRankings: StudentRanking[] = []

      // First, add users with points data
      if (pointsData && pointsData.length > 0) {
        pointsData.forEach((item: any, index: number) => {
          const profile = profilesMap[item.user_id]
          formattedRankings.push({
            user_id: item.user_id,
            name: profile?.name || 'Usuário',
            avatar_url: profile?.avatar_url,
            total_points: item.total_points || 0,
            level: item.level || 1,
            current_streak: item.current_streak || 0,
            position: index + 1
          })
        })
      }

      // Then, add users without points data (new users)
      userIds.forEach(userId => {
        if (!formattedRankings.find(r => r.user_id === userId)) {
          const profile = profilesMap[userId]
          if (profile) {
            formattedRankings.push({
              user_id: userId,
              name: profile.name || 'Usuário',
              avatar_url: profile.avatar_url,
              total_points: 0,
              level: 1,
              current_streak: 0,
              position: formattedRankings.length + 1
            })
          }
        }
      })

      // Re-sort by points and update positions
      formattedRankings.sort((a, b) => b.total_points - a.total_points)
      formattedRankings.forEach((item, index) => {
        item.position = index + 1
      })

      setRankings(formattedRankings)
    } catch (error) {
      console.error('Error fetching student rankings:', error)
      toast({
        title: "Erro ao carregar ranking",
        description: "Não foi possível carregar o ranking dos alunos.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getTopStudents = (limit: number = 10) => {
    return rankings.slice(0, limit)
  }

  const getStudentPosition = (userId: string) => {
    const student = rankings.find(r => r.user_id === userId)
    return student?.position || 0
  }

  const getEngagementStats = () => {
    if (rankings.length === 0) return {
      totalStudents: 0,
      activeStudents: 0,
      avgPoints: 0,
      avgLevel: 0,
      topStreak: 0
    }

    const activeStudents = rankings.filter(s => s.total_points > 0).length
    const avgPoints = Math.round(rankings.reduce((acc, s) => acc + s.total_points, 0) / rankings.length)
    const avgLevel = Math.round(rankings.reduce((acc, s) => acc + s.level, 0) / rankings.length)
    const topStreak = Math.max(...rankings.map(s => s.current_streak))

    return {
      totalStudents: rankings.length,
      activeStudents,
      avgPoints,
      avgLevel,
      topStreak
    }
  }

  const getPointsDistribution = () => {
    const ranges = [
      { label: '0-100', min: 0, max: 100, count: 0 },
      { label: '101-500', min: 101, max: 500, count: 0 },
      { label: '501-1000', min: 501, max: 1000, count: 0 },
      { label: '1001-2000', min: 1001, max: 2000, count: 0 },
      { label: '2000+', min: 2001, max: Infinity, count: 0 },
    ]

    rankings.forEach(student => {
      const range = ranges.find(r => student.total_points >= r.min && student.total_points <= r.max)
      if (range) range.count++
    })

    return ranges
  }

  const getLevelDistribution = () => {
    const levels: { [key: number]: number } = {}

    rankings.forEach(student => {
      levels[student.level] = (levels[student.level] || 0) + 1
    })

    return Object.entries(levels)
      .map(([level, count]) => ({ level: parseInt(level), count }))
      .sort((a, b) => a.level - b.level)
  }

  useEffect(() => {
    if (teacherId) {
      fetchStudentRankings()
    }
  }, [teacherId])

  // Real-time subscription for gamification data
  useEffect(() => {
    if (!teacherId) return

    const subscription = supabase
      .channel('gamification-teacher-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_points'
      }, () => {
        fetchStudentRankings()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'gamification_activities'
      }, () => {
        fetchStudentRankings()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_achievements'
      }, () => {
        fetchStudentRankings()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [teacherId])

  return {
    rankings,
    loading,
    getTopStudents,
    getStudentPosition,
    getEngagementStats,
    getPointsDistribution,
    getLevelDistribution,
    refetch: fetchStudentRankings
  }
}