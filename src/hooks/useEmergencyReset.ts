import { useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function useEmergencyReset() {
  const { toast } = useToast()

  const performEmergencyReset = useCallback(async () => {
    try {
      console.log('[EmergencyReset] Iniciando reset completo do sistema')
      
      // 1. Force logout from Supabase
      try {
        await supabase.auth.signOut({ scope: 'global' })
      } catch (error) {
        console.warn('[EmergencyReset] Logout failed, continuing with reset:', error)
      }

      // 2. Clear all localStorage data
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (
          key.includes('supabase') ||
          key.includes('auth') ||
          key.includes('session') ||
          key.includes('token') ||
          key.includes('profile') ||
          key.includes('user')
        )) {
          keysToRemove.push(key)
        }
      }
      
      keysToRemove.forEach(key => {
        console.log(`[EmergencyReset] Removing localStorage key: ${key}`)
        localStorage.removeItem(key)
      })

      // 3. Clear sessionStorage
      try {
        sessionStorage.clear()
      } catch (error) {
        console.warn('[EmergencyReset] SessionStorage clear failed:', error)
      }

      // 4. Clear IndexedDB if present
      try {
        if ('indexedDB' in window) {
          const databases = await indexedDB.databases()
          for (const db of databases) {
            if (db.name && db.name.includes('supabase')) {
              indexedDB.deleteDatabase(db.name)
              console.log(`[EmergencyReset] Deleted IndexedDB: ${db.name}`)
            }
          }
        }
      } catch (error) {
        console.warn('[EmergencyReset] IndexedDB cleanup failed:', error)
      }

      // 5. Clear any cached data in memory
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys()
          for (const cacheName of cacheNames) {
            if (cacheName.includes('supabase') || cacheName.includes('auth')) {
              await caches.delete(cacheName)
              console.log(`[EmergencyReset] Deleted cache: ${cacheName}`)
            }
          }
        } catch (error) {
          console.warn('[EmergencyReset] Cache cleanup failed:', error)
        }
      }

      // 6. Reset any circuit breakers or rate limits
      localStorage.removeItem('auth_recovery_attempts')
      localStorage.removeItem('rate_limit_data')
      
      console.log('[EmergencyReset] Reset completo realizado com sucesso')
      
      toast({
        title: 'Sistema Resetado',
        description: 'Todos os dados de autenticação foram limpos. A página será recarregada.',
      })

      // 7. Force page reload after a short delay
      setTimeout(() => {
        window.location.href = '/'
      }, 1500)

      return true
    } catch (error) {
      console.error('[EmergencyReset] Erro durante reset:', error)
      
      toast({
        title: 'Erro no Reset',
        description: 'Houve um problema durante o reset. Tente recarregar a página manualmente.',
        variant: 'destructive'
      })
      
      return false
    }
  }, [toast])

  const softReset = useCallback(async () => {
    try {
      console.log('[EmergencyReset] Iniciando reset suave')
      
      // Clear only auth-related data
      const authKeys = [
        'supabase.auth.token',
        'sb-YOUR_PROJECT_ID-auth-token',
        'auth_session_cache',
        'profile_cache',
        'user_type_cache'
      ]
      
      authKeys.forEach(key => {
        localStorage.removeItem(key)
        console.log(`[EmergencyReset] Removed: ${key}`)
      })
      
      // Sign out from Supabase
      await supabase.auth.signOut()
      
      toast({
        title: 'Reset Realizado',
        description: 'Dados de autenticação limpos. Faça login novamente.',
      })
      
      return true
    } catch (error) {
      console.error('[EmergencyReset] Erro no reset suave:', error)
      return false
    }
  }, [toast])

  return {
    performEmergencyReset,
    softReset
  }
}