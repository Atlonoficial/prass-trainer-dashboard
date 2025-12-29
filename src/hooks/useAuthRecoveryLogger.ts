import { useCallback } from 'react'

/**
 * Hook para logging centralizado do sistema de recuperação de senha
 */
export function useAuthRecoveryLogger() {
  const logInfo = useCallback((component: string, message: string, data?: any) => {
    console.log(`[${component}] ${message}`, data ? data : '')
  }, [])

  const logError = useCallback((component: string, message: string, error?: any) => {
    console.error(`[${component}] ${message}`, error ? error : '')
  }, [])

  const logStep = useCallback((step: string, data?: any) => {
    console.log(`[PasswordRecovery] Step: ${step}`, data ? data : '')
  }, [])

  const logAuthEvent = useCallback((event: string, session?: any) => {
    console.log(`[AuthEvent] ${event}`, {
      hasSession: !!session,
      userId: session?.user?.id,
      timestamp: new Date().toISOString()
    })
  }, [])

  const logTokenProcessing = useCallback((tokenType: string, success: boolean, details?: any) => {
    console.log(`[TokenProcessing] ${tokenType}`, {
      success,
      timestamp: new Date().toISOString(),
      ...details
    })
  }, [])

  return {
    logInfo,
    logError,
    logStep,
    logAuthEvent,
    logTokenProcessing
  }
}