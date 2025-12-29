import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isUuid } from '@/utils/validators';
import { deleteDietPlanSafe, deleteDietPlansBatch as deleteDietPlansBatchSafe } from './safeDeletionService';

/**
 * MIGRAÇÃO PARA SERVIÇO SEGURO - PLANOS ALIMENTARES
 * 
 * Este arquivo agora redireciona para o novo serviço de exclusão seguro
 * que usa RPC functions e bypass completo de RLS policies problemáticas.
 * 
 * FASE 1 IMPLEMENTADA:
 * - Redirecionamento para safeDeletionService
 * - Mantém compatibilidade com código existente
 * - Logs detalhados para monitoramento
 */

/**
 * Deleta um plano alimentar individual - MIGRADO PARA SERVIÇO SEGURO
 */
export async function deleteDietPlans(id: string): Promise<boolean> {
  console.log('🔄 [DIET_PLANS_DELETE_MIGRATION] Redirecionando para serviço seguro:', id);
  
  // Redirecionar para o novo serviço seguro
  return await deleteDietPlanSafe(id);
}

/**
 * Deleta múltiplos planos alimentares em lote - MIGRADO PARA SERVIÇO SEGURO
 */
export async function deleteDietPlansBatch(ids: string[]): Promise<boolean> {
  console.log('🔄 [DIET_PLANS_BATCH_DELETE_MIGRATION] Redirecionando para serviço seguro:', ids.length, 'planos');
  
  // Redirecionar para o novo serviço seguro
  return await deleteDietPlansBatchSafe(ids);
}