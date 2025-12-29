/**
 * Utilidade para limpeza agressiva de tokens de autenticação
 * Remove todos os tokens potencialmente corrompidos do localStorage/sessionStorage
 */

export const clearAllAuthTokens = () => {
  const keysToRemove = [
    'sb-YOUR_PROJECT_ID-auth-token',
    'supabase.auth.token',
    'known_user_id',
    'supabase-auth-token',
    'sb-access-token',
    'sb-refresh-token',
    'sb-YOUR_PROJECT_ID-auth-token-code-verifier'
  ]
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  })
  
  console.log('[AuthCleanup] ✅ Todos os tokens removidos do storage')
}

export const hasInvalidTokens = (): boolean => {
  try {
    const token = localStorage.getItem('sb-YOUR_PROJECT_ID-auth-token')
    if (!token) return false
    
    const parsed = JSON.parse(token)
    // Verificar se token está expirado
    if (parsed.expires_at && parsed.expires_at < Date.now() / 1000) {
      console.warn('[AuthCleanup] ⚠️ Token expirado detectado')
      return true
    }
    
    return false
  } catch (e) {
    console.warn('[AuthCleanup] ⚠️ Erro ao verificar tokens:', e)
    return true
  }
}
