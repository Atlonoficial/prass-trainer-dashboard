import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { useAuthErrorHandler } from '@/hooks/useAuthErrorHandler'
import { supabase } from '@/integrations/supabase/client'

export function usePasswordChange() {
  const [loading, setLoading] = useState(false)
  const { user, isHealthy } = useAuth()
  const { toast } = useToast()
  const { handleAuthError } = useAuthErrorHandler()

  const changePassword = async (newPassword: string) => {
    if (!user?.email) {
      toast({ title: 'Erro', description: 'Usuário não autenticado', variant: 'destructive' })
      return false
    }

    if (!isHealthy) {
      toast({ 
        title: 'Sistema indisponível', 
        description: 'Tente novamente em alguns momentos.', 
        variant: 'destructive' 
      })
      return false
    }

    try {
      setLoading(true)
      console.log('[usePasswordChange] Iniciando troca de senha simplificada')

      // Atualiza senha diretamente (Supabase valida a sessão)
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      console.log('[usePasswordChange] Senha alterada com sucesso')
      toast({ 
        title: 'Sucesso', 
        description: 'Senha alterada com sucesso. Por segurança, recomendamos fazer logout em outros dispositivos.' 
      })
      return true
    } catch (error: any) {
      console.error('[usePasswordChange] Erro ao alterar senha:', error)
      handleAuthError(error, 'Não foi possível alterar a senha')
      return false
    } finally {
      setLoading(false)
    }
  }

  return { changePassword, loading }
}
