import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

interface TeacherAuthState {
  isTeacher: boolean
  loading: boolean
  userId: string | null
  error: string | null
}

// Cache global para evitar múltiplas verificações
let teacherCache: {
  userId: string | null
  isTeacher: boolean
  timestamp: number
} = {
  userId: null,
  isTeacher: false,
  timestamp: 0
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

export function useTeacherAuth(): TeacherAuthState {
  const { userId, loading: authLoading } = useAuth()
  const [isTeacher, setIsTeacher] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkTeacherStatus = async () => {
      if (!userId) {
        setIsTeacher(false)
        setLoading(false)
        return
      }

      // Verificar cache primeiro
      const now = Date.now()
      if (
        teacherCache.userId === userId &&
        (now - teacherCache.timestamp) < CACHE_DURATION
      ) {
        console.log('[TeacherAuth] Usando cache:', teacherCache.isTeacher)
        setIsTeacher(teacherCache.isTeacher)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        console.log('[TeacherAuth] Verificando se usuário é professor:', userId)

        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', userId)
          .single()

        if (profileError) {
          console.error('[TeacherAuth] Erro ao verificar tipo de usuário:', profileError)
          throw new Error('Erro ao verificar permissões')
        }

        const teacherStatus = data?.user_type === 'teacher'

        // Atualizar cache
        teacherCache = {
          userId,
          isTeacher: teacherStatus,
          timestamp: now
        }

        console.log('[TeacherAuth] Status do professor:', teacherStatus)
        setIsTeacher(teacherStatus)
      } catch (err: any) {
        console.error('[TeacherAuth] Erro:', err)
        setError(err.message)
        setIsTeacher(false)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      checkTeacherStatus()
    }
  }, [userId, authLoading])

  return {
    isTeacher,
    loading: authLoading || loading,
    userId,
    error
  }
}