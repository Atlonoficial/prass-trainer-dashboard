import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth'
import { useGlobalLoading } from '@/hooks/useGlobalLoading'
import { useGlobalCache } from './GlobalCacheProvider'
import { supabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/types'
import { calculateStudentPaymentStatus, calculatePaymentMetrics, type StudentWithPaymentStatus } from '@/utils/paymentUtils'
import { isSupabaseHealthy, recordSupabaseFailure, recordSupabaseSuccess } from '@/utils/supabaseHealthCheck'
import { queryWithTimeout } from '@/utils/supabaseTimeout'
import { debounce } from '@/utils/debounce'
import { performanceMonitor } from '@/utils/performanceMonitor'
import { realtimeManager } from '@/services/realtimeManager'
import { globalCircuitBreaker } from '@/utils/globalCircuitBreaker'
import { toast } from '@/hooks/use-toast'

type Student = Database['public']['Tables']['students']['Row'] & {
  profiles?: Database['public']['Tables']['profiles']['Row']
}
type Profile = Database['public']['Tables']['profiles']['Row']

interface UnifiedAppContextType {
  // Auth state
  user: any
  session: any
  userId: string | null
  isAuthenticated: boolean
  userRole: string | null
  authError: 'network' | 'token_expired' | 'timeout' | 'invalid_token' | null

  // App state
  students: Student[]
  userProfile: Profile | null

  // Payment data
  transactions: any[]
  plans: any[]
  subscriptions: any[]
  paymentMetrics: any
  studentsWithPayments: StudentWithPaymentStatus[]

  // Loading states
  loading: {
    auth: boolean
    profile: boolean
    students: boolean
    payments: boolean
    sync: boolean
  }
  isAnyLoading: boolean

  // Actions
  refetchStudents: () => Promise<void>
  refetchProfile: () => Promise<void>
  refetchPaymentData: () => Promise<void>
  performCompleteAuthReset?: () => void
  signOut: () => Promise<void>
}

const UnifiedAppContext = createContext<UnifiedAppContextType | null>(null)

export function UnifiedAppProvider({ children }: { children: React.ReactNode }) {
  // ✅ Usar hook consolidado para autenticação + hook unificado para role/tenant
  const consolidatedAuth = useAuth()
  const { userRole, performCompleteAuthReset } = useUnifiedAuth()

  const {
    user,
    session,
    userId,
    isAuthenticated,
    authError: authErrorType,
    signOut
  } = consolidatedAuth
  const { loading, isAnyLoading, setLoading } = useGlobalLoading()
  const cache = useGlobalCache()

  const [students, setStudents] = useState<Student[]>([])
  const [userProfile, setUserProfile] = useState<Profile | null>(null)

  // Payment system state
  const [transactions, setTransactions] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [paymentMetrics, setPaymentMetrics] = useState<any>(null)
  const [studentsWithPayments, setStudentsWithPayments] = useState<StudentWithPaymentStatus[]>([])

  // Fetch students with circuit breaker and timeout
  const fetchStudents = async () => {
    console.log('[UnifiedAppProvider] fetchStudents called:', { userId, userRole, willFetch: !!(userId && userRole === 'teacher') })
    if (!userId || userRole !== 'teacher') return

    // ✅ Circuit breaker check
    if (globalCircuitBreaker.isOpen()) {
      console.warn('[UnifiedAppProvider] ⚠️ Circuit breaker aberto, pulando fetch')
      setLoading('students', false)
      toast({
        title: "Sistema temporariamente indisponível",
        description: "Aguarde alguns instantes e recarregue a página.",
        variant: "destructive"
      })
      return
    }

    // Legacy circuit breaker check
    if (!isSupabaseHealthy()) {
      console.warn('[UnifiedAppProvider] Supabase unhealthy, skipping students fetch')
      setLoading('students', false)
      return
    }

    const cacheKey = `students:${userId}`
    const cached = cache.get<Student[]>(cacheKey)
    if (cached) {
      setStudents(cached)
      return
    }


    try {
      performanceMonitor.start('fetch-students')
      setLoading('students', true)

      const { data, error } = await queryWithTimeout(
        async () => {
          // Query includes orphan students (teacher_id is null) that can be auto-assigned
          const result = await supabase
            .from('students')
            .select('*')
            .or(`teacher_id.eq.${userId},teacher_id.is.null`)
            .order('created_at', { ascending: false })
          return result
        },
        8000,
        'students'
      )

      if (error) {
        recordSupabaseFailure('fetchStudents')
        globalCircuitBreaker.recordFailure('fetchStudents')
        throw error
      }

      // Fetch profiles separately and merge with student data
      let studentsWithProfiles = (data as any) || []
      if (studentsWithProfiles.length > 0) {
        const userIds = studentsWithProfiles.map((s: any) => s.user_id).filter(Boolean)
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, name, email, phone, avatar_url, user_type')
            .in('id', userIds)

          if (profilesData) {
            const profilesMap = profilesData.reduce((acc: Record<string, any>, p: any) => {
              acc[p.id] = p
              return acc
            }, {} as Record<string, any>)

            // Merge profile data into students
            studentsWithProfiles = studentsWithProfiles.map((student: any) => ({
              ...student,
              profiles: profilesMap[student.user_id] || null
            }))
          }
        }
      }

      recordSupabaseSuccess('fetchStudents')
      globalCircuitBreaker.recordSuccess('fetchStudents')
      setStudents(studentsWithProfiles)
      cache.set(cacheKey, studentsWithProfiles)
    } catch (error) {
      console.error('Error fetching students:', error)
      recordSupabaseFailure('fetchStudents')
      globalCircuitBreaker.recordFailure('fetchStudents')
    } finally {
      setLoading('students', false)
      performanceMonitor.end('fetch-students')
    }
  }

  // Fetch user profile
  const fetchProfile = async () => {
    if (!userId) {
      console.warn('[UnifiedAppProvider] fetchProfile chamado sem userId')
      setLoading('profile', false)
      return
    }

    const cacheKey = `profile:${userId}`
    const cached = cache.get<Profile>(cacheKey)
    if (cached) {
      setUserProfile(cached)
      setLoading('profile', false)
      return
    }

    try {
      setLoading('profile', true)

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) throw error

      // 🚨 CORREÇÃO: Se não existe profile, criar automaticamente
      if (!data && user) {
        console.warn('[UnifiedAppProvider] ⚠️ Profile não encontrado! Criando automaticamente...')

        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: user.email || '',
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
            user_type: 'teacher', // Default: professor (trigger criará tenant automaticamente)
            profile_complete: false
          })
          .select()
          .single()

        if (insertError) {
          console.error('[UnifiedAppProvider] ❌ Erro ao criar profile:', insertError)

          // Se falhar por FK constraint, forçar logout
          if (insertError.code === '23503') {
            console.error('[UnifiedAppProvider] ❌ Foreign Key violation - usuário não existe. Fazendo logout...')
            await supabase.auth.signOut()
            localStorage.clear()
            sessionStorage.clear()
            window.location.href = '/auth'
            return
          }

          throw insertError
        }

        console.log('[UnifiedAppProvider] ✅ Profile criado com sucesso:', newProfile)
        setUserProfile(newProfile)
        cache.set(cacheKey, newProfile, 5 * 60 * 1000)
        return
      }

      setUserProfile(data)
      cache.set(cacheKey, data, 5 * 60 * 1000) // 5 minutes
    } catch (error) {
      console.error('[UnifiedAppProvider] Error fetching profile:', error)
      setUserProfile(null)

      // Se for erro de FK ou Auth, forçar logout
      if ((error as any)?.code === '23503' || (error as any)?.message?.includes('auth')) {
        console.error('[UnifiedAppProvider] ❌ Erro crítico de autenticação. Fazendo logout forçado...')
        await supabase.auth.signOut()
        localStorage.clear()
        sessionStorage.clear()
        window.location.href = '/auth'
      }
    } finally {
      setLoading('profile', false)
    }
  }

  // Fetch payment data
  const fetchPaymentData = async () => {
    if (!userId || userRole !== 'teacher') return

    try {
      setLoading('payments', true)

      // Fetch transactions, plans, subscriptions AND students in parallel
      // This ensures we always have fresh student data for payment calculations
      const [transactionsRes, plansRes, subscriptionsRes, studentsRes] = await Promise.all([
        supabase
          .from('payment_transactions')
          .select('*')
          .eq('teacher_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('plan_catalog')
          .select('*')
          .eq('teacher_id', userId)
          .eq('is_active', true),
        supabase
          .from('plan_subscriptions')
          .select(`
            *,
            plan_catalog!plan_id (*)
          `)
          .eq('teacher_id', userId),
        // Fetch fresh student data to ensure payment calculations are accurate
        // Query includes orphan students (teacher_id is null) that can be auto-assigned
        supabase
          .from('students')
          .select('*')
          .or(`teacher_id.eq.${userId},teacher_id.is.null`)
          .order('created_at', { ascending: false })
      ])

      if (transactionsRes.error) throw transactionsRes.error
      if (plansRes.error) throw plansRes.error
      if (subscriptionsRes.error) throw subscriptionsRes.error
      // Don't throw on students error, use existing state as fallback

      let freshStudents = studentsRes.data || students

      // Fetch profiles separately and merge with student data
      if (freshStudents.length > 0) {
        const userIds = freshStudents.map((s: any) => s.user_id).filter(Boolean)
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, name, email, phone, avatar_url, user_type')
            .in('id', userIds)

          if (profilesData) {
            const profilesMap = profilesData.reduce((acc: Record<string, any>, p: any) => {
              acc[p.id] = p
              return acc
            }, {} as Record<string, any>)

            // Merge profile data into students
            freshStudents = freshStudents.map((student: any) => ({
              ...student,
              profiles: profilesMap[student.user_id] || null
            }))
          }
        }
      }

      // Update students state if we got fresh data
      if (studentsRes.data && studentsRes.data.length > 0) {
        setStudents(freshStudents as any)
        const cacheKey = `students:${userId}`
        cache.set(cacheKey, freshStudents as any)
      }

      setTransactions(transactionsRes.data || [])
      setPlans(plansRes.data || [])
      setSubscriptions(subscriptionsRes.data || [])

      // Calculate students with payment status using fresh data
      const studentsWithPaymentStatus = (freshStudents as Student[]).map(student =>
        calculateStudentPaymentStatus(student, subscriptionsRes.data || [], transactionsRes.data || [])
      )
      setStudentsWithPayments(studentsWithPaymentStatus)

      console.log('[UnifiedAppProvider] Payment data loaded:', {
        studentsCount: freshStudents.length,
        transactionsCount: transactionsRes.data?.length || 0,
        plansCount: plansRes.data?.length || 0
      })

      // Calculate payment metrics
      const metrics = calculatePaymentMetrics(studentsWithPaymentStatus)
      setPaymentMetrics(metrics)

      // Cache payment data
      const cacheKey = `payment_data:${userId}`
      cache.set(cacheKey, {
        transactions: transactionsRes.data || [],
        plans: plansRes.data || [],
        subscriptions: subscriptionsRes.data || []
      }, 2 * 60 * 1000) // 2 minutes

    } catch (error) {
      console.error('Error fetching payment data:', error)
    } finally {
      setLoading('payments', false)
    }
  }

  // Refetch functions
  const refetchStudents = async () => {
    cache.invalidate(`students:${userId}`)
    await fetchStudents()
  }

  const refetchProfile = async () => {
    cache.invalidate(`profile:${userId}`)
    await fetchProfile()
  }

  const refetchPaymentData = async () => {
    cache.invalidate(`payment_data:${userId}`)
    await fetchPaymentData()
  }

  // Auto-fetch data when user changes
  // Effect 1: Carrega profile APENAS quando userId muda
  useEffect(() => {
    if (isAuthenticated && userId) {
      fetchProfile()
    } else {
      setUserProfile(null)
      cache.invalidatePattern(`profile:`)
    }
  }, [isAuthenticated, userId])

  // Effect 2: Carrega dados de teacher APENAS quando userRole muda para 'teacher'
  useEffect(() => {
    console.log('[UnifiedAppProvider] Effect 2 triggered:', { isAuthenticated, userId, userRole, willFetch: !!(isAuthenticated && userId && userRole === 'teacher') })
    if (isAuthenticated && userId && userRole === 'teacher') {
      fetchStudents()
      fetchPaymentData()
    } else if (!isAuthenticated || !userId) {
      setStudents([])
      setTransactions([])
      setPlans([])
      setSubscriptions([])
      setPaymentMetrics(null)
      setStudentsWithPayments([])
      cache.invalidatePattern(`students:`)
      cache.invalidatePattern(`payment_data:`)
    }
  }, [isAuthenticated, userId, userRole])

  // Debounced refetch functions to prevent rapid-fire updates
  const debouncedRefetchStudents = useMemo(
    () => debounce(refetchStudents, 2000), // ✅ Aumentado para 2 segundos
    [userId]
  )

  const debouncedRefetchPaymentData = useMemo(
    () => debounce(refetchPaymentData, 2000), // ✅ Aumentado para 2 segundos
    [userId]
  )

  const debouncedRefetchProfile = useMemo(
    () => debounce(refetchProfile, 3000), // ✅ Aumentado para 3 segundos (profile muda menos)
    [userId]
  )

  // ✅ FASE 1: Realtime Manager - Subscriptions consolidadas
  useEffect(() => {
    if (!isAuthenticated || !userId) return

    console.log('🔗 [UnifiedAppProvider] Configurando Realtime Manager subscriptions')

    const listenerIds: string[] = []

    // Students subscription (teacher only)
    if (userRole === 'teacher') {
      // ✅ OTIMIZAÇÃO: Granular updates para evitar refetch total
      const handleStudentUpdate = async (payload: any) => {
        console.log('[UnifiedAppProvider] 🔄 Realtime student update:', payload.eventType)

        if (payload.eventType === 'INSERT') {
          // Fetch apenas o novo aluno com perfil
          // Query without join - profiles:user_id relationship doesn't exist
          const { data: newStudent } = await supabase
            .from('students')
            .select('*')
            .eq('id', payload.new.id)
            .single()

          if (newStudent) {
            setStudents(prev => [newStudent as any, ...prev])
            // Atualizar cache
            const cacheKey = `students:${userId}`
            const cached = cache.get<Student[]>(cacheKey) || []
            cache.set(cacheKey, [newStudent as any, ...cached])
          }
        }
        else if (payload.eventType === 'UPDATE') {
          setStudents(prev => prev.map(student =>
            student.id === payload.new.id
              ? { ...student, ...payload.new } // Mantém profiles existente
              : student
          ))
        }
        else if (payload.eventType === 'DELETE') {
          setStudents(prev => prev.filter(student => student.id !== payload.old.id))
        }
      }

      listenerIds.push(
        realtimeManager.subscribe('students', '*', handleStudentUpdate, `teacher_id=eq.${userId}`)
      )

      // Payment system subscriptions
      listenerIds.push(
        realtimeManager.subscribe('payment_transactions', '*', debouncedRefetchPaymentData, `teacher_id=eq.${userId}`)
      )
      listenerIds.push(
        realtimeManager.subscribe('plan_subscriptions', '*', debouncedRefetchPaymentData, `teacher_id=eq.${userId}`)
      )
      listenerIds.push(
        realtimeManager.subscribe('plan_catalog', '*', debouncedRefetchPaymentData, `teacher_id=eq.${userId}`)
      )
    }

    // Profile subscription (all users) com fallback
    let profileListenerId: string | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;

    try {
      profileListenerId = realtimeManager.subscribe('profiles', 'UPDATE', debouncedRefetchProfile, `id=eq.${userId}`);
      listenerIds.push(profileListenerId);
      console.log('✅ [UnifiedAppProvider] Realtime profiles ativo');
    } catch (error) {
      console.error('❌ [UnifiedAppProvider] Falha no realtime profiles, usando polling', error);

      // ✅ Fallback: polling a cada 30 segundos
      fallbackInterval = setInterval(() => {
        fetchProfile();
      }, 30000);
    }

    console.log('✅ [UnifiedAppProvider] Realtime Manager configurado:', listenerIds.length, 'listeners')

    // Cleanup via Realtime Manager
    return () => {
      console.log('🧹 [UnifiedAppProvider] Removendo listeners:', listenerIds.length)
      listenerIds.forEach(id => realtimeManager.unsubscribe(id))

      // ✅ Limpar fallback polling se existir
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    }
  }, [isAuthenticated, userId, userRole, debouncedRefetchStudents, debouncedRefetchPaymentData, debouncedRefetchProfile])

  const value: UnifiedAppContextType = {
    // Auth
    user,
    session,
    userId,
    isAuthenticated,
    userRole,
    authError: authErrorType,

    // Data
    students,
    userProfile,

    // Payment data
    transactions,
    plans,
    subscriptions,
    paymentMetrics,
    studentsWithPayments,

    // Loading
    loading,
    isAnyLoading,

    // Actions
    refetchStudents,
    refetchProfile,
    refetchPaymentData,
    performCompleteAuthReset,
    signOut
  }

  return (
    <UnifiedAppContext.Provider value={value}>
      {children}
    </UnifiedAppContext.Provider>
  )
}

export function useUnifiedApp() {
  const context = useContext(UnifiedAppContext)
  if (!context) {
    throw new Error('useUnifiedApp must be used within UnifiedAppProvider')
  }
  return context
}