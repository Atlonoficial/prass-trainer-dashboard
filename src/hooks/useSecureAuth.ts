import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuthErrorHandler } from '@/hooks/useAuthErrorHandler'
import { getClientSlug, getTenantByDomain } from '@/utils/clientSlug'

export function useSecureAuth() {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { handleAuthError } = useAuthErrorHandler()

  // Rate limiting check
  const checkRateLimit = async (operation: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('check_rate_limit', {
        operation_type: operation,
        max_attempts: 5,
        time_window: '1 hour'
      })
      
      if (error) {
        console.warn('[Security] Rate limit check failed:', error)
        return true // Allow operation on error
      }
      
      if (!data) {
        toast({
          title: 'Muitas tentativas',
          description: 'Aguarde antes de tentar novamente.',
          variant: 'destructive'
        })
        return false
      }
      
      return true
    } catch (error) {
      console.warn('[Security] Rate limit error:', error)
      return true // Allow operation on error
    }
  }

  // Input validation
  const validateInput = async (input: string, maxLength = 100, allowHtml = false): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('validate_input', {
        input_text: input,
        max_length: maxLength,
        allow_html: allowHtml
      })
      
      if (error) {
        console.warn('[Security] Input validation failed:', error)
        return false
      }
      
      return data || false
    } catch (error) {
      console.warn('[Security] Input validation error:', error)
      return false
    }
  }

  // Secure sign in with rate limiting and logging
  const secureSignIn = async (email: string, password: string) => {
    if (!await checkRateLimit('login')) {
      return { error: { message: 'Rate limit exceeded' } }
    }

    if (!await validateInput(email, 255)) {
      return { error: { message: 'E-mail inválido' } }
    }

    try {
      setLoading(true)
      
      // Log sensitive access
      try {
        await supabase.rpc('log_sensitive_access', {
          table_name: 'auth_attempt',
          record_id: null,
          access_type: 'login_attempt'
        })
      } catch {
        // Ignore logging errors
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      })

      if (error) {
        handleAuthError(error)
        return { error }
      }

      return { data, error: null }
    } catch (error: any) {
      handleAuthError(error)
      return { error }
    } finally {
      setLoading(false)
    }
  }

  // Secure sign up with validation
  const secureSignUp = async (email: string, password: string, returnTo?: string, userType: 'student' | 'teacher' = 'student') => {
    if (!await checkRateLimit('signup')) {
      return { error: { message: 'Rate limit exceeded' } }
    }

    if (!await validateInput(email, 255)) {
      return { error: { message: 'E-mail inválido' } }
    }

    // Enhanced password validation
    if (password.length < 8) {
      toast({
        title: 'Senha muito fraca',
        description: 'A senha deve ter pelo menos 8 caracteres.',
        variant: 'destructive'
      })
      return { error: { message: 'Password too weak' } }
    }

    // Check for common password patterns
    const weakPatterns = ['123', 'abc', 'password', 'qwerty']
    const isWeak = weakPatterns.some(pattern => 
      password.toLowerCase().includes(pattern)
    )
    
    if (isWeak) {
      toast({
        title: 'Senha muito comum',
        description: 'Use uma senha mais segura e única.',
        variant: 'destructive'
      })
      return { error: { message: 'Password too common' } }
    }

    try {
      setLoading(true)

      // Detectar tenant
      const tenant = await getTenantByDomain()
      
      if (!tenant.tenantId) {
        throw new Error('Configuração de plataforma não encontrada. Verifique o domínio de acesso.')
      }

      const clienteSlug = getClientSlug()
      
      // Usar detectOrigin para evitar URLs do Lovable
      const { detectOrigin, sanitizeRedirectUrl } = await import('@/utils/domainDetector')
      const baseRedirectUrl = detectOrigin(userType)
      const returnToParam = returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''
      const redirectUrl = sanitizeRedirectUrl(
        `${baseRedirectUrl}&slug=${clienteSlug}${returnToParam}`,
        userType
      )
      
      console.log('[useSecureAuth.signUp] Guard-rail aplicado:', {
        hostname: window.location.hostname,
        userType,
        redirectUrl
      })

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            tenant_id: tenant.tenantId,
            user_type: userType
          }
        }
      })

      if (error) {
        handleAuthError(error)
        return { error }
      }

      // Log successful signup attempt
      try {
        await supabase.rpc('log_sensitive_access', {
          table_name: 'auth_signup',
          record_id: data.user?.id || null,
          access_type: 'signup_success'
        })
      } catch {
        // Ignore logging errors
      }

      return { data, error: null }
    } catch (error: any) {
      handleAuthError(error)
      return { error }
    } finally {
      setLoading(false)
    }
  }

  // Secure password reset
  const securePasswordReset = async (email: string, returnTo?: string) => {
    if (!await checkRateLimit('password_reset')) {
      return { error: { message: 'Rate limit exceeded' } }
    }

    if (!await validateInput(email, 255)) {
      return { error: { message: 'E-mail inválido' } }
    }

    try {
      setLoading(true)

      const clienteSlug = getClientSlug()
      const redirectUrl = `${window.location.origin}/auth/app/reset-password.html?src=app&slug=${clienteSlug}${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''}`

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      })

      if (error) {
        handleAuthError(error)
        return { error }
      }

      // Log password reset attempt
      try {
        await supabase.rpc('log_sensitive_access', {
          table_name: 'password_reset',
          record_id: null,
          access_type: 'reset_request'
        })
      } catch {
        // Ignore logging errors
      }

      return { error: null }
    } catch (error: any) {
      handleAuthError(error)
      return { error }
    } finally {
      setLoading(false)
    }
  }

  return {
    secureSignIn,
    secureSignUp,
    securePasswordReset,
    validateInput,
    checkRateLimit,
    loading
  }
}