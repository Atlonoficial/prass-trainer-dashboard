import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Session, User } from '@supabase/supabase-js'

interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  isHealthy: boolean
  sessionStabilized: boolean
  authError: 'network' | 'token_expired' | null
  performCompleteAuthReset?: () => void
  forceSessionRefresh?: () => Promise<string | null>
}

// Estado global para cooldown do reset e retry
let lastResetTime = 0
const RESET_COOLDOWN = 30000 // 30 segundos cooldown aumentado
let retryCount = 0
const MAX_RETRIES = 3

export function useAuthState(): AuthState {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isHealthy, setIsHealthy] = useState(true)
  const [sessionStabilized, setSessionStabilized] = useState(false)
  const [authError, setAuthError] = useState<'network' | 'token_expired' | null>(null)

  const forceSessionRefresh = async (): Promise<string | null> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      // Detectar erro de rede
      if (error?.message?.includes('Failed to fetch') || error?.message?.includes('fetch')) {
        console.error('[AuthState] Erro de rede detectado:', error)
        setAuthError('network')
        
        // Retry com backoff exponencial
        if (retryCount < MAX_RETRIES) {
          const backoffTime = 2000 * Math.pow(2, retryCount)
          console.log(`[AuthState] Retry ${retryCount + 1}/${MAX_RETRIES} em ${backoffTime}ms`)
          retryCount++
          
          setTimeout(() => {
            forceSessionRefresh()
          }, backoffTime)
          
          return null
        } else {
          console.error('[AuthState] Max retries atingido, limpando sessão')
          retryCount = 0
          performCompleteAuthReset()
          return null
        }
      }
      
      if (error) {
        console.error('[AuthState] Erro ao obter sessão:', error)
        setAuthError('token_expired')
        return null
      }
      
      if (session && session.user) {
        localStorage.setItem('known_user_id', session.user.id)
        setSession(session)
        setUser(session.user)
        setSessionStabilized(true)
        setAuthError(null)
        retryCount = 0 // Reset retry count on success
        return session.user.id
      } else {
        setSession(null)
        setUser(null)
        setSessionStabilized(false)
        return null
      }
    } catch (error: any) {
      console.error('[AuthState] Erro crítico na sessão:', error)
      setAuthError('network')
      setSession(null)
      setUser(null)
      setSessionStabilized(false)
      return null
    }
  }

  // Função simplificada para reset emergencial com cooldown melhorado
  const performCompleteAuthReset = () => {
    const now = Date.now()
    if (now - lastResetTime < RESET_COOLDOWN) {
      return
    }
    
    lastResetTime = now
    retryCount = 0 // Reset retry count
    
    try {
      const keysToRemove = ['supabase.auth.token', 'sb-YOUR_PROJECT_ID-auth-token', 'known_user_id']
      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
      })

      setSession(null)
      setUser(null)
      setIsHealthy(true)
      setLoading(false)
      setSessionStabilized(false)
      setAuthError(null)
      
      console.log('[AuthState] Reset completo realizado')
    } catch (error) {
      console.error('[AuthState] Erro durante reset:', error)
    }
  }

  useEffect(() => {
    let mounted = true
    
    const initializeAuth = async () => {
      try {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, newSession) => {
            if (!mounted) return

            if (newSession?.user) {
              localStorage.setItem('known_user_id', newSession.user.id)
              setAuthError(null)
              retryCount = 0
            }

            setSession(newSession)
            setUser(newSession?.user ?? null)
            setSessionStabilized(!!newSession?.user)
            setLoading(false)
          }
        )

        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (mounted) {
          // Detectar erro de rede na inicialização
          if (error?.message?.includes('Failed to fetch') || error?.message?.includes('fetch')) {
            console.error('[AuthState] Erro de rede na inicialização:', error)
            setAuthError('network')
            setLoading(false)
            
            // Tentar novamente após 3 segundos
            if (retryCount < MAX_RETRIES) {
              retryCount++
              setTimeout(() => initializeAuth(), 3000)
            }
            return
          }
          
          if (session?.user) {
            localStorage.setItem('known_user_id', session.user.id)
            setAuthError(null)
            retryCount = 0
          }
          
          setSession(session)
          setUser(session?.user ?? null)
          setSessionStabilized(!!session?.user)
          setLoading(false)
        }

        return () => {
          mounted = false
          subscription.unsubscribe()
        }
        
      } catch (error: any) {
        console.error('[AuthState] Erro crítico na inicialização:', error)
        if (mounted) {
          setLoading(false)
          setIsHealthy(false)
          setAuthError('network')
        }
      }
    }

    initializeAuth()

    return () => {
      mounted = false
    }
  }, [])

  return {
    session,
    user,
    loading,
    isAuthenticated: !!user,
    isHealthy,
    sessionStabilized,
    authError,
    performCompleteAuthReset,
    forceSessionRefresh
  }
}