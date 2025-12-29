import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export type UserType = 'student' | 'teacher' | 'admin' | null

// Cache para tipos de usuário
const userTypeCache = new Map<string, { userType: UserType; teacherId: string | null; timestamp: number }>()
const CACHE_DURATION = 120000 // 2 minutos

export function useStableUserType() {
  const { user, isAuthenticated } = useAuth()
  const [userType, setUserType] = useState<UserType>(null)
  const [loading, setLoading] = useState(true)
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [lastCheckTime, setLastCheckTime] = useState(0)

  const cacheKey = useMemo(() => user?.id || '', [user?.id])

  // Verifica cache
  const getCachedUserType = useCallback((userId: string) => {
    const cached = userTypeCache.get(userId)
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('[useStableUserType] 📋 Usando tipo de usuário do cache:', cached.userType)
      return cached
    }
    return null
  }, [])

  // Atualiza cache
  const updateCache = useCallback((userId: string, userType: UserType, teacherId: string | null) => {
    userTypeCache.set(userId, { userType, teacherId, timestamp: Date.now() })
    console.log('[useStableUserType] 💾 Tipo de usuário salvo no cache:', userType)
  }, [])

  const determineUserType = useCallback(async (userId?: string) => {
    const targetUserId = userId || user?.id
    if (!targetUserId || !isAuthenticated) {
      console.log('[useStableUserType] ❌ Sem usuário ou não autenticado')
      setUserType(null)
      setTeacherId(null)
      setLoading(false)
      return
    }

    // Verifica cache primeiro
    const cached = getCachedUserType(targetUserId)
    if (cached) {
      setUserType(cached.userType)
      setTeacherId(cached.teacherId)
      setLoading(false)
      return
    }

    // Debounce para evitar múltiplas verificações
    const now = Date.now()
    if (now - lastCheckTime < 2000) {
      console.log('[useStableUserType] ⏳ Ignorando verificação - debounce ativo')
      return
    }
    setLastCheckTime(now)

    try {
      setLoading(true)
      console.log('[useStableUserType] 🔍 Determinando tipo de usuário para:', targetUserId)

      // Verifica perfil primeiro
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', targetUserId)
        .maybeSingle()

      if (profile?.user_type === 'teacher') {
        console.log('[useStableUserType] ✅ Usuário é PROFESSOR')
        setUserType('teacher')
        setTeacherId(targetUserId)
        updateCache(targetUserId, 'teacher', targetUserId)
        setLoading(false)
        return
      }

      // Verifica se é estudante
      const { data: studentData } = await supabase
        .from('students')
        .select('teacher_id')
        .eq('user_id', targetUserId)
        .maybeSingle()

      if (studentData) {
        console.log('[useStableUserType] ✅ Usuário é ESTUDANTE com professor:', studentData.teacher_id)
        setUserType('student')
        setTeacherId(studentData.teacher_id)
        updateCache(targetUserId, 'student', studentData.teacher_id)
        setLoading(false)
        return
      }

      // Verifica se é admin
      try {
        const { data: isAdmin } = await supabase
          .rpc('has_role', { _user_id: targetUserId, _role: 'admin' as any })
        
        if (isAdmin) {
          console.log('[useStableUserType] ✅ Usuário é ADMIN')
          setUserType('admin')
          setTeacherId(null)
          updateCache(targetUserId, 'admin', null)
          setLoading(false)
          return
        }
      } catch (error) {
        console.error('[useStableUserType] Erro ao verificar papel de admin:', error)
      }

      // Default para professor se não encontrou tipo específico
      console.log('[useStableUserType] ⚠️ Defaulting para PROFESSOR (sem tipo específico)')
      setUserType('teacher')
      setTeacherId(targetUserId)
      updateCache(targetUserId, 'teacher', targetUserId)

    } catch (error) {
      console.error('[useStableUserType] ❌ Erro ao determinar tipo de usuário:', error)
      setUserType(null)
      setTeacherId(null)
    } finally {
      setLoading(false)
    }
  }, [user?.id, isAuthenticated, getCachedUserType, updateCache, lastCheckTime])

  // Efeito otimizado
  useEffect(() => {
    if (isAuthenticated && user?.id && cacheKey) {
      const cached = getCachedUserType(cacheKey)
      if (cached) {
        setUserType(cached.userType)
        setTeacherId(cached.teacherId)
        setLoading(false)
      } else {
        determineUserType()
      }
    } else if (!isAuthenticated || !user?.id) {
      setUserType(null)
      setTeacherId(null)
      setLoading(false)
    }
  }, [cacheKey, isAuthenticated, user?.id, determineUserType, getCachedUserType])

  // Limpa cache no logout
  useEffect(() => {
    if (!isAuthenticated) {
      userTypeCache.clear()
      console.log('[useStableUserType] 🧹 Cache de tipos de usuário limpo')
    }
  }, [isAuthenticated])

  return {
    userType,
    teacherId,
    loading,
    isStudent: userType === 'student',
    isTeacher: userType === 'teacher',
    isAdmin: userType === 'admin',
    // Função para forçar refresh
    refreshUserType: useCallback(() => {
      if (user?.id) {
        userTypeCache.delete(user.id)
        determineUserType()
      }
    }, [user?.id, determineUserType])
  }
}