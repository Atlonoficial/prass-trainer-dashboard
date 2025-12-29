import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function useAuthFix() {
  const { toast } = useToast()

  const performAuthDiagnostic = async () => {
    console.log('🔍 DIAGNÓSTICO COMPLETO DE AUTENTICAÇÃO')
    
    try {
      // 1. Verificar sessão atual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('📊 Sessão atual:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        email: session?.user?.email,
        error: sessionError?.message
      })

      // 2. Verificar localStorage
      const authToken = localStorage.getItem('sb-YOUR_PROJECT_ID-auth-token')
      console.log('💾 Token localStorage:', {
        exists: !!authToken,
        length: authToken?.length,
        preview: authToken ? `${authToken.substring(0, 50)}...` : null
      })

      // 3. Verificar se user.id vs auth.uid() estão consistentes
      if (session?.user?.id) {
        try {
          const { data: userCheck, error: userError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .limit(1)

          console.log('🔐 Verificação de auth.uid():', {
            sessionUserId: session.user.id,
            canQueryWithUserId: !userError,
            queryResult: userCheck?.length,
            error: userError?.message
          })
        } catch (e) {
          console.error('❌ Erro na verificação auth.uid():', e)
        }
      }

      // 4. Verificar conectividade básica
      const { data: healthCheck, error: healthError } = await supabase
        .from('profiles')
        .select('count')
        .limit(0)
        
      console.log('🏥 Health check:', {
        success: !healthError,
        error: healthError?.message
      })

      return {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        hasValidToken: !!authToken,
        canQuery: !healthError
      }
    } catch (error) {
      console.error('❌ Erro no diagnóstico:', error)
      return null
    }
  }

  const emergencyAuthReset = async () => {
    console.log('🚨 INICIANDO RESET DE EMERGÊNCIA TOTAL')
    
    try {
      // 1. Logout forçado
      await supabase.auth.signOut({ scope: 'global' })
      
      // 2. Limpar todo localStorage relacionado
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (
          key.includes('supabase') ||
          key.includes('auth') ||
          key.includes('sb-') ||
          key.includes('session') ||
          key.includes('token') ||
          key.includes('user') ||
          key.includes('profile')
        )) {
          keysToRemove.push(key)
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
      })
      
      // 3. Limpar cache do navegador se possível
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        for (const cacheName of cacheNames) {
          if (cacheName.includes('supabase') || cacheName.includes('auth')) {
            await caches.delete(cacheName)
          }
        }
      }
      
      console.log('✅ Reset de emergência concluído')
      
      toast({
        title: 'Reset Realizado',
        description: 'Todos os dados de autenticação foram limpos. Faça login novamente.',
      })
      
      // Opcional: recarregar página após reset
      setTimeout(() => {
        window.location.reload()
      }, 2000)
      
    } catch (error) {
      console.error('❌ Erro no reset de emergência:', error)
      toast({
        title: 'Erro no Reset',
        description: 'Tente recarregar a página manualmente.',
        variant: 'destructive'
      })
    }
  }

  // Auto-diagnóstico quando o hook é usado
  useEffect(() => {
    performAuthDiagnostic()
  }, [])

  return {
    performAuthDiagnostic,
    emergencyAuthReset
  }
}