import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface Feedback {
  id: string
  student_id: string
  teacher_id: string
  type: 'workout' | 'diet' | 'general'
  rating: number
  message: string
  related_item_id?: string
  created_at: string
  updated_at: string
  student?: {
    name: string
    email: string
  }
}

export function useFeedbacks(userId?: string) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchFeedbacks = async () => {
    if (!userId) return
    
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .eq('student_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setFeedbacks((data || []) as Feedback[])
    } catch (error) {
      console.error('Error fetching feedbacks:', error)
      toast({
        title: "Erro ao carregar feedbacks",
        description: "Não foi possível carregar os feedbacks do aluno.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getFeedbacksByType = (type: string) => {
    return feedbacks.filter(f => f.type === type)
  }

  const getAverageRating = (type?: string) => {
    const relevantFeedbacks = type ? getFeedbacksByType(type) : feedbacks
    if (relevantFeedbacks.length === 0) return 0
    
    const sum = relevantFeedbacks.reduce((acc, f) => acc + f.rating, 0)
    return Math.round((sum / relevantFeedbacks.length) * 10) / 10
  }

  const getFeedbackStats = () => {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    return {
      total: feedbacks.length,
      thisWeek: feedbacks.filter(f => new Date(f.created_at) >= oneWeekAgo).length,
      thisMonth: feedbacks.filter(f => new Date(f.created_at) >= oneMonthAgo).length,
      averageRating: getAverageRating()
    }
  }

  const getRatingDistribution = () => {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    feedbacks.forEach(f => {
      distribution[f.rating as keyof typeof distribution]++
    })
    return distribution
  }

  useEffect(() => {
    fetchFeedbacks()
  }, [userId])

  return {
    feedbacks,
    loading,
    getFeedbacksByType,
    getAverageRating,
    getFeedbackStats,
    getRatingDistribution,
    refetch: fetchFeedbacks
  }
}