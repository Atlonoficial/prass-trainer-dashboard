import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Session, User } from '@supabase/supabase-js'
import { clearAllAuthTokens, hasInvalidTokens } from '@/utils/authCleanup'
import { authCircuitBreaker } from '@/utils/authCircuitBreaker'

type AuthErrorType = 'timeout' | 'network' | 'invalid_token' | null

interface GlobalAuthState {
  session: Session | null
  user: User | null
  loading: boolean
  initialized: boolean
  lastError: AuthErrorType
}

// Estado global singleton para evitar re-inicializações múltiplas
let globalAuthState: GlobalAuthState = {
  session: null,
  user: null,
  loading: true,
  initialized: false,
  lastError: null
}

export function useConsolidatedAuth() {
  const [session, setSession] = useState<Session | null>(globalAuthState.session)
  const [user, setUser] = useState<User | null>(globalAuthState.user)
  const [loading, setLoading] = useState(globalAuthState.loading)
  const [authError, setAuthError] = useState<AuthErrorType>(globalAuthState.lastError)
  
  const initTimeoutRef = useRef<NodeJS.Timeout>()
  const initializingRef = useRef(false)

  // Atualizar estado global e local
  const updateAuthState = useCallback((updates: Partial<GlobalAuthState>) => {
    globalAuthState = { ...globalAuthState, ...updates }
    if (updates.session !== undefined) setSession(updates.session)
    if (updates.user !== undefined) setUser(updates.user)
    if (updates.loading !== undefined) setLoading(updates.loading)
    if (updates.lastError !== undefined) setAuthError(updates.lastError)
  }, [])

  // Limpeza completa de autenticação
  const clearAuthState = useCallback(() => {
    console.log('[ConsolidatedAuth] 🧹 Limpando estado de autenticação')
    clearAllAuthTokens()
    updateAuthState({
      session: null,
      user: null,
      loading: false,
      initialized: true,
      lastError: 'invalid_token'
    })
    authCircuitBreaker.reset()
  }, [updateAuthState])

  // Sign in
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      // Limpar tokens antes de fazer login
      clearAllAuthTokens()
      
      console.log('[ConsolidatedAuth] 🔐 Iniciando login...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      console.log('[ConsolidatedAuth] ✅ Login bem-sucedido')
      authCircuitBreaker.recordSuccess()
      
      updateAuthState({
        session: data.session,
        user: data.user,
        loading: false,
        lastError: null
      })

      return { error: null }
    } catch (error: any) {
      console.error('[ConsolidatedAuth] ❌ Erro no login:', error)
      authCircuitBreaker.recordFailure('login_error')
      return { error }
    }
  }, [updateAuthState])

  // Sign out
  const signOut = useCallback(async () => {
    try {
      console.log('[ConsolidatedAuth] 🚪 Fazendo logout...')
      await supabase.auth.signOut()
      clearAuthState()
      console.log('[ConsolidatedAuth] ✅ Logout completo')
    } catch (error) {
      console.error('[ConsolidatedAuth] ❌ Erro no logout:', error)
      // Forçar limpeza mesmo com erro
      clearAuthState()
    }
  }, [clearAuthState])

  // Inicialização
  useEffect(() => {
    // Se já inicializou, não fazer novamente
    if (globalAuthState.initialized || initializingRef.current) {
      console.log('[ConsolidatedAuth] ⏭️ Já inicializado, pulando')
      return
    }

    initializingRef.current = true
    console.log('[ConsolidatedAuth] 🚀 Inicializando sistema de autenticação')

    // Verificar circuit breaker
    if (authCircuitBreaker.isOpen()) {
      console.warn('[ConsolidatedAuth] ⚠️ Circuit breaker aberto - servidor inacessível')
      updateAuthState({
        loading: false,
        initialized: true,
        lastError: 'network'
      })
      return
    }

    // Verificar tokens inválidos antes de começar
    if (hasInvalidTokens()) {
      console.warn('[ConsolidatedAuth] ⚠️ Tokens inválidos detectados, limpando')
      clearAllAuthTokens()
    }

    // Timeout de 8 segundos
    initTimeoutRef.current = setTimeout(() => {
      if (globalAuthState.loading) {
        console.error('[ConsolidatedAuth] ⏱️ Timeout de 8s atingido')
        authCircuitBreaker.recordFailure('timeout')
        clearAuthState()
      }
    }, 8000)

    // Setup auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('[ConsolidatedAuth] 🔄 Auth state changed:', event)
      
      if (event === 'SIGNED_OUT') {
        clearAuthState()
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        updateAuthState({
          session: newSession,
          user: newSession?.user ?? null,
          loading: false,
          initialized: true,
          lastError: null
        })
        authCircuitBreaker.recordSuccess()
      } else if (event === 'PASSWORD_RECOVERY') {
        console.log('[ConsolidatedAuth] 🔑 Password recovery initiated')
      }
    })

    // Get initial session
    const initSession = async () => {
      try {
        console.log('[ConsolidatedAuth] 📡 Buscando sessão inicial...')
        
        const { data: { session: currentSession }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('[ConsolidatedAuth] ❌ Erro ao buscar sessão:', error)
          authCircuitBreaker.recordFailure('get_session_error')
          clearAuthState()
          return
        }

        if (currentSession) {
          console.log('[ConsolidatedAuth] ✅ Sessão válida encontrada')
          authCircuitBreaker.recordSuccess()
          updateAuthState({
            session: currentSession,
            user: currentSession.user,
            loading: false,
            initialized: true,
            lastError: null
          })
        } else {
          console.log('[ConsolidatedAuth] ℹ️ Nenhuma sessão encontrada')
          updateAuthState({
            session: null,
            user: null,
            loading: false,
            initialized: true,
            lastError: null
          })
        }

        // Limpar timeout se tudo deu certo
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current)
        }
      } catch (error: any) {
        console.error('[ConsolidatedAuth] ❌ Erro na inicialização:', error)
        authCircuitBreaker.recordFailure('init_error')
        clearAuthState()
      } finally {
        initializingRef.current = false
      }
    }

    initSession()

    return () => {
      subscription.unsubscribe()
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current)
      }
    }
  }, [updateAuthState, clearAuthState])

  return {
    session,
    user,
    loading,
    authError,
    isAuthenticated: !!user,
    userId: user?.id,
    signIn,
    signOut,
    clearAuthState,
    circuitBreakerStatus: authCircuitBreaker.getStatus()
  }
}
