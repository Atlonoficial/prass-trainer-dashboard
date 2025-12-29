import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Session, User } from '@supabase/supabase-js'

// FASE 1: Hook de autenticação mínimo sem dependências externas
export function useMinimalAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        // Verificar user_id conhecido
        const knownUserId = localStorage.getItem('known_user_id')
        if (knownUserId) {
          console.log('[MinimalAuth] User_id conhecido:', knownUserId)
        }

        // Configurar listener de estado de auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, newSession) => {
            if (!mounted) return

            console.log('[MinimalAuth] Auth event:', event)
            
            if (newSession?.user) {
              localStorage.setItem('known_user_id', newSession.user.id)
            }

            setSession(newSession)
            setUser(newSession?.user ?? null)
            setLoading(false)
          }
        )

        // Verificar sessão atual
        const { data: { session } } = await supabase.auth.getSession()
        
        if (mounted) {
          if (session?.user) {
            localStorage.setItem('known_user_id', session.user.id)
          }
          setSession(session)
          setUser(session?.user ?? null)
          setLoading(false)
        }

        return () => {
          mounted = false
          subscription.unsubscribe()
        }
        
      } catch (error) {
        console.error('[MinimalAuth] Erro na inicialização:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    return () => {
      mounted = false
    }
  }, [])

  // Função de login simplificada
  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      
      console.log('[MinimalAuth] Login bem-sucedido')
      return { success: true, data }
    } catch (error) {
      console.error('[MinimalAuth] Erro no login:', error)
      return { success: false, error }
    }
  }

  // Função de logout simplificada
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      localStorage.removeItem('known_user_id')
      console.log('[MinimalAuth] Logout bem-sucedido')
    } catch (error) {
      console.error('[MinimalAuth] Erro no logout:', error)
    }
  }

  return {
    session,
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout
  }
}