import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface RecoveryState {
  loading: boolean
  retryCount: number
  lastAttempt: Date | null
}

export function useAuthRecovery() {
  const { toast } = useToast()
  const [state, setState] = useState<RecoveryState>({
    loading: false,
    retryCount: 0,
    lastAttempt: null
  })

  const canRetry = () => {
    if (state.retryCount >= 3) return false
    
    // Verifica se passou tempo suficiente desde a última tentativa
    if (state.lastAttempt) {
      const timeDiff = Date.now() - state.lastAttempt.getTime()
      const minWaitTime = Math.pow(2, state.retryCount) * 1000 // Backoff exponencial
      return timeDiff > minWaitTime
    }
    
    return true
  }


  const sendPasswordReset = async (email: string, returnTo?: string): Promise<boolean> => {
    console.log('[AuthRecovery] Iniciando processo de recuperação de senha:', {
      email,
      returnTo,
      canRetry: canRetry(),
      retryCount: state.retryCount
    })

    if (!canRetry()) {
      const lastAttemptTime = state.lastAttempt?.getTime() || Date.now()
      const nextRetry = new Date(lastAttemptTime + Math.pow(2, state.retryCount) * 1000)
      console.log('[AuthRecovery] Rate limit atingido, próxima tentativa em:', nextRetry)
      toast({
        title: 'Aguarde para tentar novamente',
        description: `Próxima tentativa disponível às ${nextRetry.toLocaleTimeString()}`,
        variant: 'destructive'
      })
      return false
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast({
        title: 'Email inválido',
        description: 'Formato de email não é válido.',
        variant: 'destructive'
      })
      return false
    }

    setState(prev => ({ ...prev, loading: true }))

    try {
      // URL simplificada para recuperação
      const redirectUrl = `${window.location.origin}/auth`

      console.log('[AuthRecovery] Enviando recuperação de senha:', {
        email,
        redirectUrl,
        attempt: state.retryCount + 1
      })

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      })

      if (error) throw error
      
      setState(prev => ({
        ...prev,
        retryCount: 0,
        lastAttempt: new Date()
      }))

      toast({
        title: 'E-mail enviado',
        description: 'Verifique sua caixa de entrada e pasta de spam. O link expira em 1 hora.'
      })

      return true

    } catch (error: any) {
      console.error('[AuthRecovery] Erro ao enviar recuperação:', error)
      
      setState(prev => ({
        ...prev,
        retryCount: prev.retryCount + 1,
        lastAttempt: new Date()
      }))

      toast({
        title: 'Erro ao enviar e-mail',
        description: 'Não foi possível enviar o e-mail de redefinição. Tente novamente.',
        variant: 'destructive'
      })

      return false
    } finally {
      setState(prev => ({ ...prev, loading: false }))
    }
  }

  const updatePassword = async (newPassword: string, confirmPassword: string) => {
    console.log('[AuthRecovery] Iniciando atualização de senha')
    
    // Validações básicas
    if (newPassword.length < 8) {
      console.log('[AuthRecovery] Senha rejeitada - muito curta')
      toast({
        title: 'Senha muito fraca',
        description: 'Use pelo menos 8 caracteres com letras, números e símbolos.',
        variant: 'destructive'
      })
      return false
    }

    if (newPassword !== confirmPassword) {
      console.log('[AuthRecovery] Senhas não conferem')
      toast({
        title: 'Senhas não conferem',
        description: 'As senhas devem ser idênticas.',
        variant: 'destructive'
      })
      return false
    }

    setState(prev => ({ ...prev, loading: true }))

    try {
      console.log('[AuthRecovery] Atualizando senha')
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setState(prev => ({
        ...prev,
        retryCount: 0,
        lastAttempt: null
      }))

      toast({
        title: 'Senha atualizada',
        description: 'Sua nova senha foi definida com sucesso.'
      })

      return true
    } catch (error: any) {
      console.error('[AuthRecovery] Erro ao atualizar senha:', error)
      toast({
        title: 'Erro ao atualizar senha',
        description: 'Não foi possível atualizar a senha. Tente novamente.',
        variant: 'destructive'
      })
      return false
    } finally {
      setState(prev => ({ ...prev, loading: false }))
    }
  }

  const resetRetryCount = () => {
    setState(prev => ({ ...prev, retryCount: 0, lastAttempt: null }))
  }

  return {
    loading: state.loading,
    retryCount: state.retryCount,
    canRetry: canRetry(),
    sendPasswordReset,
    updatePassword,
    resetRetryCount
  }
}