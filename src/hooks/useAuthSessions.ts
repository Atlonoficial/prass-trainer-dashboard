import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export interface AuthSession {
  id: string
  device_info: {
    browser?: string
    os?: string
    device?: string
  }
  ip_address: string | null
  last_activity: string
  created_at: string
  is_current: boolean
  location?: string
}

export function useAuthSessions() {
  const [sessions, setSessions] = useState<AuthSession[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()

  const fetchSessions = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      // Get current session info
      const { data: currentSession } = await supabase.auth.getSession()
      const currentSessionToken = currentSession.session?.access_token
      
      // Fetch user sessions from our custom table
      const { data: userSessions, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('last_activity', { ascending: false })

      if (error) throw error

      // Transform sessions data
      const transformedSessions: AuthSession[] = userSessions?.map(session => ({
        id: session.id,
        device_info: (session.device_info as any) || {},
        ip_address: session.ip_address,
        last_activity: session.last_activity,
        created_at: session.created_at,
        is_current: session.session_token === currentSessionToken
      })) || []

      // If no sessions exist, create one for current session
      if (transformedSessions.length === 0 && currentSession.session) {
        await createCurrentSession(currentSession.session.access_token)
        return fetchSessions() // Refresh after creating
      }

      setSessions(transformedSessions)
    } catch (error: any) {
      console.error('Error fetching sessions:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as sessões ativas',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const createCurrentSession = async (sessionToken: string) => {
    if (!user) return

    try {
      const deviceInfo = {
        browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                navigator.userAgent.includes('Safari') ? 'Safari' : 'Outro',
        os: navigator.platform.includes('Win') ? 'Windows' : 
            navigator.platform.includes('Mac') ? 'macOS' : 
            navigator.platform.includes('Linux') ? 'Linux' : 'Outro',
        device: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop'
      }

      const { error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          session_token: sessionToken,
          device_info: deviceInfo,
          ip_address: null // Will be set by backend if needed
        })

      if (error) throw error
    } catch (error) {
      console.error('Error creating session:', error)
    }
  }

  const revokeSession = async (sessionId: string) => {
    if (!user) return false

    try {
      // First, mark session as inactive in our table
      const { error: updateError } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('id', sessionId)
        .eq('user_id', user.id)

      if (updateError) throw updateError

      // Log security activity
      await supabase.rpc('log_security_activity', {
        p_user_id: user.id,
        p_activity_type: 'session_revoked',
        p_activity_description: 'Sessão revogada pelo usuário',
        p_success: true
      })

      // Refresh sessions list
      await fetchSessions()

      toast({
        title: 'Sucesso',
        description: 'Sessão revogada com sucesso'
      })

      return true
    } catch (error: any) {
      console.error('Error revoking session:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível revogar a sessão',
        variant: 'destructive'
      })
      return false
    }
  }

  const revokeAllOtherSessions = async () => {
    if (!user) return false

    try {
      const { data: currentSession } = await supabase.auth.getSession()
      const currentSessionToken = currentSession.session?.access_token

      // Revoke all sessions except current one
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .neq('session_token', currentSessionToken || '')

      if (error) throw error

      // Log security activity
      await supabase.rpc('log_security_activity', {
        p_user_id: user.id,
        p_activity_type: 'all_sessions_revoked',
        p_activity_description: 'Todas as outras sessões foram revogadas',
        p_success: true
      })

      await fetchSessions()

      toast({
        title: 'Sucesso',
        description: 'Todas as outras sessões foram revogadas'
      })

      return true
    } catch (error: any) {
      console.error('Error revoking all sessions:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível revogar as sessões',
        variant: 'destructive'
      })
      return false
    }
  }

  useEffect(() => {
    if (user) {
      fetchSessions()
      
      // Update session activity periodically
      const interval = setInterval(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.access_token) {
            supabase.rpc('update_session_activity', {
              p_session_token: session.access_token
            })
          }
        })
      }, 5 * 60 * 1000) // Update every 5 minutes

      return () => clearInterval(interval)
    }
  }, [user])

  return {
    sessions,
    loading,
    refreshSessions: fetchSessions,
    revokeSession,
    revokeAllOtherSessions
  }
}