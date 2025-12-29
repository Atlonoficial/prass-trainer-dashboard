
import { supabase } from '@/integrations/supabase/client'

/**
 * URL padrão da Dashboard de Professores.
 * Se você tiver uma dashboard separada em outro domínio, substitua abaixo.
 * Mantemos padrão para a rota interna /professor.
 */
const DEFAULT_ADMIN_DASHBOARD_URL = `${window.location.origin}/professor`

/**
 * Gera a URL para SSO na Dashboard contendo tokens no hash.
 * Ex.: https://example.com/professor#sso=1&access_token=...&refresh_token=...
 */
export async function getAdminSsoUrl(adminUrl?: string): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  const access_token = data.session?.access_token
  const refresh_token = data.session?.refresh_token

  if (!access_token || !refresh_token) {
    console.warn('[adminSso] Sem sessão ativa no Supabase para gerar SSO.')
    return null
  }

  const base = adminUrl || DEFAULT_ADMIN_DASHBOARD_URL
  const params = new URLSearchParams({
    sso: '1',
    access_token,
    refresh_token,
  })

  const url = `${base}#${params.toString()}`
  return url
}

/**
 * Redireciona imediatamente para a Dashboard com os tokens no hash.
 */
export async function redirectToAdminDashboard(adminUrl?: string) {
  const url = await getAdminSsoUrl(adminUrl)
  if (!url) return
  window.location.replace(url)
}
