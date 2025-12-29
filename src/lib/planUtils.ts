// FASE 1: NORMALIZAÇÃO DE PLANOS - Utilities para mapeamento UUID <-> Nome

import { supabase } from "@/integrations/supabase/client";

export interface PlanMappingCache {
  [key: string]: string;
}

// Cache local para evitar múltiplas consultas
const planIdToNameCache: PlanMappingCache = {};
const planNameToIdCache: PlanMappingCache = {};

/**
 * Converte nome do plano para UUID
 */
export async function getPlanIdByName(planName: string, teacherId: string): Promise<string | null> {
  if (!planName || planName === 'none') return null;
  
  // Se já é um UUID, retorna ele mesmo
  if (isValidUUID(planName)) return planName;
  
  // Verificar cache primeiro
  const cacheKey = `${teacherId}:${planName}`;
  if (planNameToIdCache[cacheKey]) {
    return planNameToIdCache[cacheKey];
  }
  
  try {
    const { data, error } = await supabase
      .from('plan_catalog')
      .select('id, name')
      .eq('name', planName)
      .eq('teacher_id', teacherId)
      .maybeSingle();
      
    if (error) {
      console.error('Erro ao buscar plano por nome:', error);
      return null;
    }
    
    if (data) {
      // Atualizar ambos os caches
      planNameToIdCache[cacheKey] = data.id;
      planIdToNameCache[data.id] = data.name;
      return data.id;
    }
    
    return null;
  } catch (error) {
    console.error('Erro na conversão nome->UUID:', error);
    return null;
  }
}

/**
 * Converte UUID do plano para nome
 */
export async function getPlanNameById(planId: string): Promise<string> {
  if (!planId || planId === 'none') return 'Nenhum';
  
  // Se não é UUID, assume que já é nome
  if (!isValidUUID(planId)) return planId;
  
  // Verificar cache primeiro
  if (planIdToNameCache[planId]) {
    return planIdToNameCache[planId];
  }
  
  try {
    const { data, error } = await supabase
      .from('plan_catalog')
      .select('id, name')
      .eq('id', planId)
      .maybeSingle();
      
    if (error) {
      console.error('Erro ao buscar plano por ID:', error);
      return 'Plano inválido';
    }
    
    if (data) {
      // Atualizar cache
      planIdToNameCache[planId] = data.name;
      return data.name;
    }
    
    return 'Plano não encontrado';
  } catch (error) {
    console.error('Erro na conversão UUID->nome:', error);
    return 'Erro no plano';
  }
}

/**
 * Valida se uma string é um UUID válido
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Normaliza valor do plano para ser usado na interface
 */
export function normalizePlanValue(planValue: string | null | undefined): string {
  if (!planValue || planValue === 'none') return 'none';
  return planValue;
}

/**
 * Limpa o cache de planos (útil quando planos são alterados)
 */
export function clearPlanCache(): void {
  Object.keys(planIdToNameCache).forEach(key => delete planIdToNameCache[key]);
  Object.keys(planNameToIdCache).forEach(key => delete planNameToIdCache[key]);
}

/**
 * Pré-carrega mapeamentos de planos para um professor
 */
export async function preloadPlanMappings(teacherId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('plan_catalog')
      .select('id, name')
      .eq('teacher_id', teacherId);
      
    if (error) {
      console.error('Erro ao pré-carregar mapeamentos de planos:', error);
      return;
    }
    
    // Atualizar caches
    data?.forEach(plan => {
      planIdToNameCache[plan.id] = plan.name;
      const cacheKey = `${teacherId}:${plan.name}`;
      planNameToIdCache[cacheKey] = plan.id;
    });
    
    console.log(`✅ Pré-carregados ${data?.length || 0} mapeamentos de planos`);
  } catch (error) {
    console.error('Erro no pré-carregamento:', error);
  }
}