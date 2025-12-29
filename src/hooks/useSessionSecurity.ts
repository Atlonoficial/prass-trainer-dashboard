import { useCallback, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function useSessionSecurity() {
  const { toast } = useToast()

  const checkSessionHealth = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Session health check failed:', error)
        return false
      }

      // Check if session is expired
      if (session && session.expires_at) {
        const expiresAt = new Date(session.expires_at * 1000)
        const now = new Date()
        const timeUntilExpiry = expiresAt.getTime() - now.getTime()
        
        // Warn if session expires in less than 5 minutes
        if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
          toast({
            title: 'Sessão expirando',
            description: 'Sua sessão expirará em breve. Salve seu trabalho.',
            variant: 'destructive'
          })
        }
      }

      return true
    } catch (error) {
      console.error('Session health check error:', error)
      return false
    }
  }, [toast])

  const revokeAllOtherSessions = useCallback(async () => {
    try {
      // For now, we'll sign out and require reauthentication
      // In a more advanced implementation, you would track and revoke specific sessions
      await supabase.auth.signOut()
      
      toast({
        title: 'Sessão reiniciada',
        description: 'Por segurança, todas as sessões foram encerradas. Faça login novamente.'
      })
    } catch (error) {
      console.error('Failed to revoke sessions:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível reiniciar as sessões.',
        variant: 'destructive'
      })
    }
  }, [toast])

  const forceReauthentication = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      toast({
        title: 'Reautenticação necessária',
        description: 'Por favor, faça login novamente por segurança.'
      })
    } catch (error) {
      console.error('Force reauthentication failed:', error)
    }
  }, [toast])

  // Monitor for suspicious activity
  const monitorSuspiciousActivity = useCallback(() => {
    // Check for multiple tabs/windows
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSessionHealth()
      }
    }

    // Check for focus events that might indicate session hijacking attempts
    const handleFocus = () => {
      checkSessionHealth()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [checkSessionHealth])

  // Set up periodic session health checks
  useEffect(() => {
    const cleanup = monitorSuspiciousActivity()
    
    // Check session health every 10 minutes
    const healthCheckInterval = setInterval(checkSessionHealth, 10 * 60 * 1000)
    
    // Initial health check
    checkSessionHealth()

    return () => {
      cleanup()
      clearInterval(healthCheckInterval)
    }
  }, [checkSessionHealth, monitorSuspiciousActivity])

  return {
    checkSessionHealth,
    revokeAllOtherSessions,
    forceReauthentication
  }
}