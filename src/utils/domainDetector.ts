/**
 * Domain Detector - Proteção contra URLs do Lovable
 * NUNCA retorna URLs de preview/sandbox do Lovable
 * Sempre força https://seu-dominio.com em ambientes Lovable
 */

/**
 * Detecta origem segura para emailRedirectTo
 * @param userType - 'student' ou 'teacher'
 * @returns URL segura para confirmação de email
 */
export function detectOrigin(userType: 'student' | 'teacher'): string {
  const hostname = window.location.hostname
  
  // Lista de domínios Lovable que devem ser sobrescritos
  const lovableDomains = [
    'lovable.dev',
    'lovable.app',
    'lovableproject.com',
    'sandbox.lovable.dev'
  ]
  
  // Verificar se está em ambiente Lovable
  const isLovableEnvironment = lovableDomains.some(domain => 
    hostname.includes(domain)
  )
  
  if (isLovableEnvironment) {
    console.log('[DomainDetector] ⚠️ Ambiente Lovable detectado, forçando seu-dominio.com')
    const src = userType === 'teacher' ? 'dashboard' : 'app'
    return `https://seu-dominio.com/auth/confirm?src=${src}`
  }
  
  // Produção ou domínio customizado
  const src = userType === 'teacher' ? 'dashboard' : 'app'
  return `${window.location.origin}/auth/confirm?src=${src}`
}

/**
 * Guard-rail: Valida e corrige emailRedirectTo se contém domínio Lovable
 * @param url - URL a ser validada
 * @param userType - Tipo de usuário para fallback
 * @returns URL sanitizada
 */
export function sanitizeRedirectUrl(url: string, userType: 'student' | 'teacher'): string {
  const lovablePattern = /lovable\.(dev|app|project|com)/i
  
  if (lovablePattern.test(url)) {
    console.warn('[DomainDetector] ⚠️ URL contém domínio Lovable, substituindo:', url)
    return detectOrigin(userType)
  }
  
  return url
}

/**
 * Detecta tipo de usuário baseado na URL ou contexto
 * @returns 'teacher' ou 'student'
 */
export function detectUserTypeFromUrl(): 'student' | 'teacher' {
  const pathname = window.location.pathname
  const searchParams = new URLSearchParams(window.location.search)
  
  // Verificar se está em contexto de dashboard/professor
  const isDashboard = 
    pathname.includes('dashboard') || 
    pathname.includes('professor') ||
    searchParams.get('mode') === 'teacher' ||
    searchParams.get('src') === 'dashboard'
  
  return isDashboard ? 'teacher' : 'student'
}
