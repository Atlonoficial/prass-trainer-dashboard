import { useToast } from '@/hooks/use-toast'
import { AuthError } from '@supabase/supabase-js'

interface AuthErrorMapping {
  [key: string]: {
    title: string
    description: string
    retryable?: boolean
  }
}

export function useAuthErrorHandler() {
  const { toast } = useToast()

  const errorMappings: AuthErrorMapping = {
    'Invalid login credentials': {
      title: 'Credenciais inválidas',
      description: 'E-mail ou senha incorretos. Verifique e tente novamente.',
    },
    'Email not confirmed': {
      title: 'E-mail não confirmado',
      description: 'Verifique sua caixa de entrada e confirme seu e-mail antes de fazer login.',
    },
    'Token has expired': {
      title: 'Link expirado',
      description: 'O link de recuperação expirou. Solicite um novo link de redefinição.',
      retryable: true,
    },
    'One-time token not found': {
      title: 'Link inválido',
      description: 'Este link de recuperação é inválido ou já foi usado. Solicite um novo.',
      retryable: true,
    },
    'Email link is invalid or has expired': {
      title: 'Link expirado ou inválido',
      description: 'O link de confirmação expirou ou é inválido. Solicite um novo.',
      retryable: true,
    },
    'signup_disabled': {
      title: 'Cadastro desabilitado',
      description: 'Novos cadastros estão temporariamente desabilitados.',
    },
    'email_address_invalid': {
      title: 'E-mail inválido',
      description: 'O formato do e-mail não é válido. Verifique e tente novamente.',
    },
    'password_too_short': {
      title: 'Senha muito curta',
      description: 'A senha deve ter pelo menos 6 caracteres.',
    },
    'weak_password': {
      title: 'Senha fraca',
      description: 'Use uma senha mais forte com letras, números e símbolos.',
    },
  }

  const handleAuthError = (error: AuthError | Error | any, defaultMessage: string = 'Erro inesperado') => {
    const errorMessage = error?.message || error?.error_description || ''
    const errorCode = error?.error || error?.code || ''
    
    // Procura por uma mensagem específica
    const mappedError = Object.entries(errorMappings).find(([key]) => 
      errorMessage.includes(key) || errorCode.includes(key)
    )

    if (mappedError) {
      const [, errorInfo] = mappedError
      toast({
        title: errorInfo.title,
        description: errorInfo.description,
        variant: 'destructive',
      })
      return errorInfo
    }

    // Fallback para erro genérico
    toast({
      title: 'Erro',
      description: errorMessage || defaultMessage,
      variant: 'destructive',
    })

    return { title: 'Erro', description: errorMessage || defaultMessage, retryable: false }
  }

  const isRetryableError = (error: any): boolean => {
    const errorMessage = error?.message || error?.error_description || ''
    const retryableErrors = Object.entries(errorMappings).filter(([, info]) => info.retryable)
    
    return retryableErrors.some(([key]) => errorMessage.includes(key))
  }

  return { handleAuthError, isRetryableError }
}