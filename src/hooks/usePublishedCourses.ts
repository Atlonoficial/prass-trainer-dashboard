
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import type { Course } from './useCourses'

export function usePublishedCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchPublished = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as Course[]
  }

  const refetch = async () => {
    try {
      setLoading(true)
      const data = await fetchPublished()
      setCourses(data)
    } catch (error) {
      console.error('Error fetching published courses:', error)
      toast({ title: 'Erro', description: 'Não foi possível carregar os cursos publicados', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refetch()
  }, [])

  return { courses, loading, refetch }
}
