import { useGlobalPaymentSettings } from './useGlobalPaymentSettings'

/**
 * Hook para validar se o sistema de pagamentos está configurado
 * Agora usa configuração GLOBAL em vez de individual por professor
 */
export function usePaymentValidation() {
  const { settings, loading } = useGlobalPaymentSettings()

  const isPaymentConfigured = () => {
    if (!settings) return false
    
    const credentials = settings.credentials as any
    if (!credentials) return false
    
    // Verificar se access_token existe e é válido
    const hasValidCredentials = credentials.access_token && 
                                typeof credentials.access_token === 'string' &&
                                credentials.access_token.trim() !== ''
    
    return hasValidCredentials && settings.is_active
  }

  const getPaymentConfigStatus = () => {
    if (loading) return { 
      status: 'loading', 
      message: 'Carregando configurações...' 
    }
    
    if (!settings) {
      return { 
        status: 'not_configured', 
        message: 'Sistema não configurado. Contate o administrador.',
        action: 'contact_admin'
      }
    }

    const credentials = settings.credentials as any
    if (!credentials || !credentials.access_token || credentials.access_token.trim() === '') {
      return { 
        status: 'invalid_credentials', 
        message: 'Credenciais não configuradas. Contate o administrador.',
        action: 'contact_admin'
      }
    }

    if (!settings.is_active) {
      return { 
        status: 'inactive', 
        message: 'Sistema desativado. Contate o administrador.',
        action: 'contact_admin'
      }
    }

    return { 
      status: 'configured', 
      message: '✅ Sistema configurado globalmente e ativo',
      action: 'ready'
    }
  }

  return {
    isPaymentConfigured,
    getPaymentConfigStatus,
    settings,
    loading
  }
}
