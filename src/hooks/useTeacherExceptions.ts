import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'

export interface TeacherException {
  id: string
  teacher_id: string
  date: string
  type: 'holiday' | 'blocked' | 'special_hours'
  reason?: string
  is_available: boolean
  special_start_time?: string
  special_end_time?: string
  created_at: string
  updated_at: string
}

export interface NewTeacherException {
  date: string
  type: 'holiday' | 'blocked' | 'special_hours'
  reason?: string
  is_available: boolean
  special_start_time?: string
  special_end_time?: string
}

export function useTeacherExceptions() {
  const [exceptions, setExceptions] = useState<TeacherException[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { user } = useAuth()

  const fetchExceptions = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('teacher_schedule_exceptions')
        .select('*')
        .eq('teacher_id', user.id)
        .order('date', { ascending: true })

      if (error) throw error
      setExceptions((data || []) as TeacherException[])
    } catch (error) {
      console.error('Error fetching teacher exceptions:', error)
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível carregar as exceções de agenda', 
        variant: 'destructive' 
      })
    } finally {
      setLoading(false)
    }
  }

  const addException = async (exception: NewTeacherException) => {
    if (!user?.id) return

    try {
      const { data, error } = await supabase
        .from('teacher_schedule_exceptions')
        .insert({
          ...exception,
          teacher_id: user.id
        })
        .select()
        .single()

      if (error) throw error

      toast({ 
        title: 'Sucesso', 
        description: 'Exceção de agenda adicionada com sucesso' 
      })
      
      await fetchExceptions()
      return data
    } catch (error) {
      console.error('Error adding teacher exception:', error)
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível adicionar a exceção', 
        variant: 'destructive' 
      })
      throw error
    }
  }

  const updateException = async (id: string, updates: Partial<NewTeacherException>) => {
    try {
      const { data, error } = await supabase
        .from('teacher_schedule_exceptions')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      toast({ 
        title: 'Sucesso', 
        description: 'Exceção atualizada com sucesso' 
      })
      
      await fetchExceptions()
      return data
    } catch (error) {
      console.error('Error updating teacher exception:', error)
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível atualizar a exceção', 
        variant: 'destructive' 
      })
      throw error
    }
  }

  const deleteException = async (id: string) => {
    try {
      const { error } = await supabase
        .from('teacher_schedule_exceptions')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({ 
        title: 'Sucesso', 
        description: 'Exceção removida com sucesso' 
      })
      
      await fetchExceptions()
    } catch (error) {
      console.error('Error deleting teacher exception:', error)
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível remover a exceção', 
        variant: 'destructive' 
      })
      throw error
    }
  }

  useEffect(() => {
    fetchExceptions()
  }, [user?.id])

  // Real-time subscription for teacher exceptions changes
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel('teacher_exceptions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teacher_schedule_exceptions',
          filter: `teacher_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Teacher exception real-time update:', payload)
          fetchExceptions()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  return { 
    exceptions, 
    loading, 
    addException,
    updateException,
    deleteException,
    refetch: fetchExceptions 
  }
}