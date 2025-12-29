import { supabase } from '@/integrations/supabase/client'

/**
 * Detecta tenant pelo domínio atual
 */
export async function getTenantByDomain(): Promise<{
  tenantId: string | null
  slug: string | null
  defaultTeacherId: string | null
}> {
  const hostname = window.location.hostname

  // Normalizar domínio (remover www, port, etc)
  const domain = hostname.replace('www.', '').split(':')[0]

  try {
    const { data, error } = await supabase.rpc('get_tenant_by_domain', {
      p_domain: domain
    })

    if (error || !data || data.length === 0) {
      console.warn('[TENANT] Tenant não encontrado para domínio:', domain)
      return { tenantId: null, slug: null, defaultTeacherId: null }
    }

    const tenant = data[0]
    return {
      tenantId: tenant.tenant_id,
      slug: tenant.tenant_slug,
      defaultTeacherId: tenant.default_teacher_id
    }
  } catch (error) {
    console.error('[TENANT] Erro ao buscar tenant:', error)
    return { tenantId: null, slug: null, defaultTeacherId: null }
  }
}

/**
 * Helper legado para manter compatibilidade
 */
export function getClientSlug(): string {
  const hostname = window.location.hostname

  if (hostname.includes('prasstrainer')) {
    return 'prasstrainer'
  }

  const pathSlug = window.location.pathname.split('/')[1]
  if (pathSlug && pathSlug !== '' && !['auth', 'dashboard', 'login'].includes(pathSlug)) {
    return pathSlug
  }

  return 'prasstrainer' // Fallback para Prass Trainer
}
