import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface ProgressPhoto {
  id: string
  user_id: string
  image_url: string
  title: string
  notes?: string
  date: string
  created_at: string
  updated_at: string
}

export function useProgressPhotos(userId?: string) {
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchProgressPhotos = async () => {
    if (!userId) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('progress_photos')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })

      if (error) throw error
      setProgressPhotos(data || [])
    } catch (error) {
      console.error('Error fetching progress photos:', error)
      toast({
        title: "Erro ao carregar fotos",
        description: "Não foi possível carregar as fotos de progresso.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const addProgressPhoto = async (photoData: Omit<ProgressPhoto, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('progress_photos')
        .insert([photoData])

      if (error) throw error
      
      toast({
        title: "Foto adicionada",
        description: "Foto de progresso foi adicionada com sucesso.",
      })
      
      await fetchProgressPhotos()
    } catch (error) {
      console.error('Error adding progress photo:', error)
      toast({
        title: "Erro ao adicionar foto",
        description: "Não foi possível adicionar a foto de progresso.",
        variant: "destructive",
      })
      throw error
    }
  }

  const updateProgressPhoto = async (id: string, updates: Partial<ProgressPhoto>) => {
    try {
      const { error } = await supabase
        .from('progress_photos')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      
      toast({
        title: "Foto atualizada",
        description: "Foto de progresso foi atualizada com sucesso.",
      })
      
      await fetchProgressPhotos()
    } catch (error) {
      console.error('Error updating progress photo:', error)
      toast({
        title: "Erro ao atualizar foto",
        description: "Não foi possível atualizar a foto de progresso.",
        variant: "destructive",
      })
      throw error
    }
  }

  const getPhotosByDateRange = (startDate: Date, endDate: Date) => {
    return progressPhotos.filter(photo => {
      const photoDate = new Date(photo.date)
      return photoDate >= startDate && photoDate <= endDate
    })
  }

  const getPhotoStats = () => {
    const now = new Date()
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    return {
      total: progressPhotos.length,
      lastMonth: progressPhotos.filter(photo => new Date(photo.date) >= oneMonthAgo).length,
      lastThreeMonths: progressPhotos.filter(photo => new Date(photo.date) >= threeMonthsAgo).length,
    }
  }

  const getPhotosByMonth = () => {
    const photosByMonth: { [key: string]: ProgressPhoto[] } = {}
    
    progressPhotos.forEach(photo => {
      const monthKey = new Date(photo.date).toISOString().slice(0, 7) // YYYY-MM
      if (!photosByMonth[monthKey]) {
        photosByMonth[monthKey] = []
      }
      photosByMonth[monthKey].push(photo)
    })
    
    return photosByMonth
  }

  useEffect(() => {
    fetchProgressPhotos()
  }, [userId])

  return {
    progressPhotos,
    loading,
    addProgressPhoto,
    updateProgressPhoto,
    getPhotosByDateRange,
    getPhotoStats,
    getPhotosByMonth,
    refetch: fetchProgressPhotos
  }
}