
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface Course {
  id: string
  title: string
  description?: string | null
  instructor?: string | null
  created_at?: string | null
  updated_at?: string | null
  is_published?: boolean | null
  price?: number | null
  duration?: number | null
  category?: string | null
  thumbnail?: string | null
  is_free?: boolean | null
  enrolled_users?: string[] | null
  rating?: number | null
  reviews?: number | null
  tags?: string[] | null
  published_at?: string | null
  modules?: unknown
  // New extended fields
  level?: string | null
  requirements?: string[] | null
  what_you_learn?: string[] | null
  has_certificate?: boolean | null
  preview_video_url?: string | null
  total_lessons?: number | null
  total_duration_minutes?: number | null
}

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchCourses = async () => {
    try {
      setLoading(true)
      // RLS already filters to only the instructor's courses
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setCourses((data || []) as Course[])
    } catch (error) {
      console.error('Error fetching courses:', error)
      toast({ title: 'Erro', description: 'Não foi possível carregar os cursos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const fetchFreeCourses = async () => {
    // Convenience helper in this hook (also exposed as its own hook below)
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('is_published', true)
      .eq('is_free', true)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as Course[]
  }

  const addCourse = async (
    courseData: Omit<Course, 'id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      const currentUserId = authData.user?.id
      if (!currentUserId) {
        throw new Error('Usuário não autenticado')
      }

      // Ensure we pass instructor to satisfy RLS "auth.uid() = instructor"
      const payload = {
        title: courseData.title,
        description: courseData.description ?? null,
        category: courseData.category ?? null,
        price: courseData.price ?? null,
        duration: courseData.duration ?? null,
        thumbnail: courseData.thumbnail ?? null,
        is_published: courseData.is_published ?? false,
        is_free: courseData.is_free ?? false,
        instructor: currentUserId,
        modules: (courseData.modules as any) ?? [],
        rating: courseData.rating ?? null,
        reviews: courseData.reviews ?? 0,
        tags: courseData.tags ?? null,
        published_at: courseData.published_at ?? null,
        enrolled_users: courseData.enrolled_users ?? [],
      }

      const { data, error } = await supabase
        .from('courses')
        .insert(payload as any)
        .select()
        .single()

      if (error) throw error
      toast({ title: 'Sucesso', description: 'Curso criado com sucesso' })
      return data as Course
    } catch (error) {
      console.error('Error adding course:', error)
      toast({ title: 'Erro', description: 'Não foi possível criar o curso', variant: 'destructive' })
      throw error
    }
  }

  const updateCourse = async (id: string, updates: Partial<Course>) => {
    try {
      // Sanitize updates to remove system fields that shouldn't be updated directly
      // or that might trigger RLS violations if sent (even if unchanged)
      const {
        id: _id,
        created_at: _created_at,
        updated_at: _updated_at,
        instructor: _instructor,
        enrolled_users: _enrolled_users,
        rating: _rating,
        reviews: _reviews,
        modules: _modules,
        ...cleanUpdates
      } = updates as any;

      const dbUpdates: any = {
        ...cleanUpdates,
      }
      const { data, error } = await supabase
        .from('courses')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      toast({ title: 'Sucesso', description: 'Curso atualizado com sucesso' })
      return data as Course
    } catch (error) {
      console.error('Error updating course:', error)
      toast({ title: 'Erro', description: 'Não foi possível atualizar o curso', variant: 'destructive' })
      throw error
    }
  }

  const deleteCourse = async (id: string) => {
    try {
      const { error } = await supabase.from('courses').delete().eq('id', id)
      if (error) throw error
      toast({ title: 'Sucesso', description: 'Curso removido com sucesso' })
    } catch (error) {
      console.error('Error deleting course:', error)
      toast({ title: 'Erro', description: 'Não foi possível remover o curso', variant: 'destructive' })
      throw error
    }
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  return { courses, loading, addCourse, updateCourse, deleteCourse, refetch: fetchCourses, fetchFreeCourses }
}
