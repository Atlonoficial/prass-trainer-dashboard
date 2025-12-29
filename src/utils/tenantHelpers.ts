import { supabase } from '@/integrations/supabase/client'

/**
 * Multi-Tenant Helper Functions
 * Garante isolamento completo de dados por tenant
 */

export interface TenantContext {
  tenantId: string | null
  userId: string
}

/**
 * Busca o tenant_id do usuário autenticado
 */
export async function getCurrentTenantId(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', userId)
      .maybeSingle()

    if (error || !data) {
      console.error('❌ [TENANT] Erro ao buscar tenant_id:', error)
      return null
    }

    return (data as any).tenant_id || null
  } catch (error) {
    console.error('❌ [TENANT] Erro inesperado ao buscar tenant_id:', error)
    return null
  }
}

/**
 * Valida se o usuário pertence ao tenant especificado
 */
export async function validateTenantAccess(
  userId: string,
  targetTenantId: string
): Promise<boolean> {
  const userTenantId = await getCurrentTenantId(userId)
  return userTenantId === targetTenantId
}

/**
 * Adiciona filtro de tenant a uma query do Supabase
 */
export function addTenantFilter<T>(
  query: any,
  tenantId: string | null,
  columnName: string = 'tenant_id'
) {
  if (!tenantId) {
    console.warn('⚠️ [TENANT] Tentativa de filtrar sem tenant_id')
    return query
  }

  return query.eq(columnName, tenantId)
}

/**
 * Garante que dados inseridos incluam tenant_id
 */
export function ensureTenantData<T extends Record<string, any>>(
  data: T,
  tenantId: string | null
): T & { tenant_id: string } {
  if (!tenantId) {
    throw new Error('tenant_id é obrigatório para inserção de dados')
  }

  return {
    ...data,
    tenant_id: tenantId,
  }
}

/**
 * Gera chave de cache com tenant_id
 */
export function getTenantCacheKey(
  baseKey: string,
  tenantId: string | null,
  ...additionalKeys: string[]
): string {
  const parts = [baseKey, tenantId, ...additionalKeys].filter(Boolean)
  return parts.join(':')
}
