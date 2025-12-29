import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Session, User } from '@supabase/supabase-js'

interface StableAuthState {
  session: Session | null
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  userId: string | null
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: any }>
  signOut: () => Promise<void>
  clearAuthState: () => void
}

// Estado global para evitar múltiplas inicializações
let globalAuthState: {
  session: Session | null
  user: User | null
  loading: boolean
  initialized: boolean
} = {
  session: null,
  user: null,
  loading: true,
  initialized: false
}

export function useStableAuth(): StableAuthState {
  const [session, setSession] = useState<Session | null>(globalAuthState.session)
  const [user, setUser] = useState<User | null>(globalAuthState.user)
  const [loading, setLoading] = useState<boolean>(globalAuthState.loading)

  // Fallback para user_id conhecido quando necessário
  const getUserId = useCallback((): string | null => {
    if (user?.id) return user.id
    
    // Fallback: usar user_id conhecido do localStorage (sem logs excessivos)
    const knownUserId = localStorage.getItem('known_user_id')
    return knownUserId || null
  }, [user?.id])

  const clearAuthState = useCallback(() => {
    try {
      const keysToRemove = [
        'supabase.auth.token',
        'sb-YOUR_PROJECT_ID-auth-token',
        'known_user_id'
      ]
      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
      })
      
      // Reset global state
      globalAuthState = {
        session: null,
        user: null,
        loading: false,
        initialized: true
      }
      
      setSession(null)
      setUser(null)
      setLoading(false)
    } catch (error) {
      console.error('[StableAuth] Erro ao limpar estado:', error)
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) throw error
      
      // Atualizar estado global e local
      if (data.session?.user) {
        localStorage.setItem('known_user_id', data.session.user.id)
        globalAuthState.session = data.session
        globalAuthState.user = data.session.user
        setSession(data.session)
        setUser(data.session.user)
      }
      
      setLoading(false)
      return { success: true, data }
    } catch (error: any) {
      setLoading(false)
      return { success: false, error }
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      clearAuthState()
    } catch (error) {
      console.error('[StableAuth] Erro no logout:', error)
      // Força limpeza mesmo com erro
      clearAuthState()
    }
  }, [clearAuthState])

  useEffect(() => {
    let mounted = true
    
    // Evitar múltiplas inicializações
    if (globalAuthState.initialized) {
      setSession(globalAuthState.session)
      setUser(globalAuthState.user)
      setLoading(globalAuthState.loading)
      return
    }

    const initAuth = async () => {
      // Timeout de segurança para forçar loading=false após 10 segundos
      const safetyTimeout = setTimeout(() => {
        if (mounted && globalAuthState.loading) {
          console.warn('[StableAuth] ⏰ Timeout de segurança atingido - forçando loading=false')
          
          globalAuthState.loading = false
          globalAuthState.initialized = true
          setLoading(false)
          
          // Limpar tokens inválidos
          try {
            localStorage.removeItem('sb-YOUR_PROJECT_ID-auth-token')
            localStorage.removeItem('known_user_id')
          } catch (e) {
            console.error('[StableAuth] Erro ao limpar tokens:', e)
          }
        }
      }, 10000)
      
      try {
        // Configurar listener primeiro
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, newSession) => {
            if (!mounted) return

            // Logs apenas para eventos críticos
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
              console.log('[StableAuth] Auth event:', event)
            }
            
            // Persistir user_id quando disponível
            if (newSession?.user) {
              localStorage.setItem('known_user_id', newSession.user.id)
            }

            // Atualizar estado global
            globalAuthState.session = newSession
            globalAuthState.user = newSession?.user ?? null
            globalAuthState.loading = false

            // Atualizar estado local
            setSession(newSession)
            setUser(newSession?.user ?? null)
            setLoading(false)
          }
        )

        // Verificar sessão existente
        const { data: { session }, error } = await supabase.auth.getSession()
        
        // Verificar se houve erro no refresh token
        if (error) {
          console.error('[StableAuth] Erro ao recuperar sessão:', error)
          
          // Limpar estado de autenticação inválido
          if (mounted) {
            globalAuthState.session = null
            globalAuthState.user = null
            globalAuthState.loading = false
            globalAuthState.initialized = true
            
            setSession(null)
            setUser(null)
            setLoading(false)
            
            // Limpar localStorage para remover tokens inválidos
            try {
              localStorage.removeItem('sb-YOUR_PROJECT_ID-auth-token')
              localStorage.removeItem('known_user_id')
            } catch (e) {
              console.error('[StableAuth] Erro ao limpar localStorage:', e)
            }
          }
          
          clearTimeout(safetyTimeout)
          return () => {
            mounted = false
            subscription.unsubscribe()
          }
        }
        
        if (mounted) {
          if (session?.user) {
            localStorage.setItem('known_user_id', session.user.id)
          }
          
          // Atualizar estado global
          globalAuthState.session = session
          globalAuthState.user = session?.user ?? null
          globalAuthState.loading = false
          globalAuthState.initialized = true

          // Atualizar estado local
          setSession(session)
          setUser(session?.user ?? null)
          setLoading(false)
        }

        clearTimeout(safetyTimeout)
        
        return () => {
          mounted = false
          clearTimeout(safetyTimeout)
          subscription.unsubscribe()
        }
      } catch (error) {
        clearTimeout(safetyTimeout)
        console.error('[StableAuth] Erro na inicialização:', error)
        if (mounted) {
          globalAuthState.loading = false
          globalAuthState.initialized = true
          setLoading(false)
        }
      }
    }

    initAuth()

    return () => {
      mounted = false
    }
  }, [])

  return {
    session,
    user,
    loading,
    isAuthenticated: !!user,
    userId: getUserId(),
    signIn,
    signOut,
    clearAuthState
  }
}