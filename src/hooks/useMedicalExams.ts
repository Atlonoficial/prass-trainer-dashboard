import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface MedicalExam {
  id: string
  user_id: string
  title: string
  date: string
  file_url?: string
  notes?: string
  created_at: string
  updated_at: string
}

export function useMedicalExams(userId?: string) {
  const [medicalExams, setMedicalExams] = useState<MedicalExam[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchMedicalExams = async () => {
    if (!userId) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('medical_exams')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })

      if (error) throw error
      setMedicalExams(data || [])
    } catch (error) {
      console.error('Error fetching medical exams:', error)
      toast({
        title: "Erro ao carregar exames",
        description: "Não foi possível carregar os exames médicos.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const addMedicalExam = async (examData: Omit<MedicalExam, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('medical_exams')
        .insert([examData])

      if (error) throw error
      
      toast({
        title: "Exame adicionado",
        description: "Exame médico foi adicionado com sucesso.",
      })
      
      await fetchMedicalExams()
    } catch (error) {
      console.error('Error adding medical exam:', error)
      toast({
        title: "Erro ao adicionar exame",
        description: "Não foi possível adicionar o exame médico.",
        variant: "destructive",
      })
      throw error
    }
  }

  const updateMedicalExam = async (id: string, updates: Partial<MedicalExam>) => {
    try {
      const { error } = await supabase
        .from('medical_exams')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      
      toast({
        title: "Exame atualizado",
        description: "Exame médico foi atualizado com sucesso.",
      })
      
      await fetchMedicalExams()
    } catch (error) {
      console.error('Error updating medical exam:', error)
      toast({
        title: "Erro ao atualizar exame",
        description: "Não foi possível atualizar o exame médico.",
        variant: "destructive",
      })
      throw error
    }
  }

  const getExamsByCategory = () => {
    const categories = {
      blood: medicalExams.filter(exam => 
        exam.title.toLowerCase().includes('sangue') || 
        exam.title.toLowerCase().includes('hemograma') ||
        exam.title.toLowerCase().includes('colesterol')
      ),
      cardio: medicalExams.filter(exam => 
        exam.title.toLowerCase().includes('cardio') || 
        exam.title.toLowerCase().includes('coração') ||
        exam.title.toLowerCase().includes('eletro')
      ),
      imaging: medicalExams.filter(exam => 
        exam.title.toLowerCase().includes('raio') || 
        exam.title.toLowerCase().includes('tomografia') ||
        exam.title.toLowerCase().includes('ressonância') ||
        exam.title.toLowerCase().includes('ultrassom')
      ),
      others: medicalExams.filter(exam => {
        const title = exam.title.toLowerCase()
        return !title.includes('sangue') && !title.includes('hemograma') && 
               !title.includes('colesterol') && !title.includes('cardio') && 
               !title.includes('coração') && !title.includes('eletro') &&
               !title.includes('raio') && !title.includes('tomografia') &&
               !title.includes('ressonância') && !title.includes('ultrassom')
      })
    }
    return categories
  }

  const getExamsStats = () => {
    const now = new Date()
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)

    return {
      total: medicalExams.length,
      recent: medicalExams.filter(exam => new Date(exam.date) >= oneMonthAgo).length,
      lastSixMonths: medicalExams.filter(exam => new Date(exam.date) >= sixMonthsAgo).length,
    }
  }

  useEffect(() => {
    fetchMedicalExams()
  }, [userId])

  return {
    medicalExams,
    loading,
    addMedicalExam,
    updateMedicalExam,
    getExamsByCategory,
    getExamsStats,
    refetch: fetchMedicalExams
  }
}