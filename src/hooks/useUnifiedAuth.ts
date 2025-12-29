import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useGlobalLoading } from './useGlobalLoading'
import { useGlobalCache } from '@/contexts/GlobalCacheProvider'
import type { Session, User } from '@supabase/supabase-js'

export function useUnifiedAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [authError, setAuthError] = useState<'network' | 'token_expired' | null>(null)
  const { setLoading } = useGlobalLoading()
  const cache = useGlobalCache()

  // Guard para evitar múltiplas chamadas simultâneas
  const fetchingRoleRef = useRef(false)
  const fetchRolePromiseRef = useRef<Promise<void> | null>(null)

  const userId = user?.id || null
  const isAuthenticated = !!user

  // Função para reset completo de autenticação
  const performCompleteAuthReset = useCallback(() => {
    try {
      const keysToRemove = ['supabase.auth.token', 'sb-YOUR_PROJECT_ID-auth-token', 'known_user_id']
      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
      })

      setSession(null)
      setUser(null)
      setUserRole(null)
      setTenantId(null)
      setAuthError(null)
      cache.clear()

      console.log('[useUnifiedAuth] Reset completo realizado')
    } catch (error) {
      console.error('[useUnifiedAuth] Erro durante reset:', error)
    }
  }, [cache])

  // Fetch user role and tenant with caching and singleton pattern
  const fetchUserRole = useCallback(async (uid: string) => {
    // ✅ Guard: Se já está buscando, retornar promise existente
    if (fetchingRoleRef.current && fetchRolePromiseRef.current) {
      console.log('[useUnifiedAuth] fetchUserRole já em execução, aguardando...')
      return fetchRolePromiseRef.current
    }

    const cacheKey = `role:${uid}`
    const cached = cache.get<string>(cacheKey)
    if (cached) {
      setUserRole(cached)
      setTenantId(cache.get(`tenant:${uid}`) || null)
      return
    }

    try {
      fetchingRoleRef.current = true

      // ✅ Criar promise e cachear
      fetchRolePromiseRef.current = (async () => {
        // ✅ Buscar apenas user_type - tenant_id pode não existir em todas as instalações
        const { data, error } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', uid)
          .maybeSingle()

        if (error) throw error

        if (!data) {
          setUserRole(null)
          setTenantId(null)
          return
        }

        const role = (data as any).user_type || null
        // ✅ tenant_id não existe na tabela profiles - usar null
        const tenant = null

        setUserRole(role)
        setTenantId(tenant)

        cache.set(cacheKey, role, 10 * 60 * 1000)
        if (tenant) {
          cache.set(`tenant:${uid}`, tenant, 10 * 60 * 1000)
        }
      })()

      await fetchRolePromiseRef.current
    } catch (error) {
      console.error('Error fetching user role:', error)
      setUserRole(null)
      setTenantId(null)
    } finally {
      fetchingRoleRef.current = false
      fetchRolePromiseRef.current = null // ✅ Limpar cache
    }
  }, [cache])

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setLoading('auth', true)
      await supabase.auth.signOut()
      cache.clear() // Clear all cache on sign out
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setLoading('auth', false)
    }
  }, [setLoading, cache])

  // Initialize auth state
  useEffect(() => {
    setLoading('auth', true)

    // Set up auth state listener with proper async handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('Auth state change:', event, newSession?.user?.id)

        // Synchronous state updates first
        setSession(newSession)
        setUser(newSession?.user ?? null)

        // Clear auth error on successful session
        if (newSession?.user) {
          setAuthError(null)
        }

        // Defer async operations to prevent deadlocks
        setTimeout(() => {
          if (newSession?.user) {
            fetchUserRole(newSession.user.id).finally(() => {
              setLoading('auth', false)
            })
          } else {
            setUserRole(null)
            cache.clear()
            setLoading('auth', false)
          }
        }, 0)
      }
    )

    // Get initial session with error handling
    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (error) {
        console.error('[useUnifiedAuth] Erro ao obter sessão:', error)

        // Detectar erro de rede
        if (error.message?.includes('Failed to fetch') || error.message?.includes('fetch')) {
          setAuthError('network')
        } else {
          setAuthError('token_expired')
        }

        setLoading('auth', false)
        return
      }

      setSession(initialSession)
      setUser(initialSession?.user ?? null)

      if (initialSession?.user) {
        setAuthError(null)
        fetchUserRole(initialSession.user.id).finally(() => {
          setLoading('auth', false)
        })
      } else {
        setLoading('auth', false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchUserRole, setLoading, cache])

  return {
    session,
    user,
    userId,
    isAuthenticated,
    userRole,
    tenantId,
    authError,
    performCompleteAuthReset,
    signOut
  }
}