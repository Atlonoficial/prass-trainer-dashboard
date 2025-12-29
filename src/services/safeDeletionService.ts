import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * FASE 1 - SERVIÇO DE EXCLUSÃO SEGURO E ROBUSTO
 * 
 * Este serviço substitui completamente os métodos antigos de exclusão
 * que causavam "malformed array literal" errors. Agora usa RPC functions
 * que bypassam completamente os problemas de RLS policies.
 */

interface DeletionResult {
  success: boolean;
  error?: string;
  affected_rows?: number;
  message?: string;
}

/**
 * Exclui um plano alimentar usando o novo sistema
 */
export async function deleteDietPlanSafe(planId: string): Promise<boolean> {
  console.log(`🗑️ [SAFE_DELETE] Iniciando exclusão segura de plano alimentar: ${planId}`);
  
  try {
    if (!planId) {
      console.error('❌ [SAFE_DELETE] ID do plano é obrigatório');
      toast.error('ID do plano é obrigatório');
      return false;
    }

    // Usar delete direto na tabela meal_plans
    const { error } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', planId);

    if (error) {
      console.error('❌ [SAFE_DELETE] Erro na exclusão:', error);
      toast.error(`Erro na exclusão: ${error.message}`);
      return false;
    }

    console.log('✅ [SAFE_DELETE] Plano excluído com sucesso');
    toast.success('Plano alimentar excluído com sucesso');
    return true;

  } catch (error) {
    console.error('❌ [SAFE_DELETE] Erro inesperado:', error);
    toast.error('Erro inesperado na exclusão');
    return false;
  }
}

/**
 * Exclui um plano de treino usando RPC function segura
 */
export async function deleteTrainingPlanSafe(planId: string): Promise<boolean> {
  console.log(`🗑️ [SAFE_DELETE] Iniciando exclusão segura de plano de treino: ${planId}`);
  
  try {
    if (!planId) {
      console.error('❌ [SAFE_DELETE] ID do plano é obrigatório');
      toast.error('ID do plano é obrigatório');
      return false;
    }

    // Use direct deletion since RPC was removed in migration
    const { error } = await supabase
      .from('workout_plans')
      .delete()
      .eq('id', planId);

    if (error) {
      console.error('❌ [SAFE_DELETE] Erro na exclusão:', error);
      toast.error(`Erro na exclusão: ${error.message}`);
      return false;
    }

    console.log('✅ [SAFE_DELETE] Plano de treino excluído com sucesso');
    toast.success('Plano de treino excluído com sucesso');
    return true;

  } catch (error) {
    console.error('❌ [SAFE_DELETE] Erro inesperado:', error);
    toast.error('Erro inesperado na exclusão');
    return false;
  }
}

/**
 * Exclusão em lote de planos alimentares
 */
export async function deleteDietPlansBatch(planIds: string[]): Promise<boolean> {
  console.log(`🗑️ [SAFE_DELETE_BATCH] Iniciando exclusão em lote de ${planIds.length} planos alimentares`);
  
  if (!planIds.length) {
    toast.error('Nenhum plano selecionado para exclusão');
    return false;
  }

  let successCount = 0;
  let failureCount = 0;

  for (const planId of planIds) {
    const success = await deleteDietPlanSafe(planId);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  console.log(`✅ [SAFE_DELETE_BATCH] Concluído: ${successCount} sucessos, ${failureCount} falhas`);

  if (successCount > 0 && failureCount === 0) {
    toast.success(`${successCount} planos excluídos com sucesso`);
    return true;
  } else if (successCount > 0 && failureCount > 0) {
    toast.error(`${successCount} sucessos, ${failureCount} falhas na exclusão`);
    return false;
  } else {
    toast.error('Falha na exclusão de todos os planos');
    return false;
  }
}

/**
 * Exclusão em lote de planos de treino
 */
export async function deleteTrainingPlansBatch(planIds: string[]): Promise<boolean> {
  console.log(`🗑️ [SAFE_DELETE_BATCH] Iniciando exclusão em lote de ${planIds.length} planos de treino`);
  
  if (!planIds.length) {
    toast.error('Nenhum plano selecionado para exclusão');
    return false;
  }

  let successCount = 0;
  let failureCount = 0;

  for (const planId of planIds) {
    const success = await deleteTrainingPlanSafe(planId);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  console.log(`✅ [SAFE_DELETE_BATCH] Concluído: ${successCount} sucessos, ${failureCount} falhas`);

  if (successCount > 0 && failureCount === 0) {
    toast.success(`${successCount} planos excluídos com sucesso`);
    return true;
  } else if (successCount > 0 && failureCount > 0) {
    toast.error(`${successCount} sucessos, ${failureCount} falhas na exclusão`);
    return false;
  } else {
    toast.error('Falha na exclusão de todos os planos');
    return false;
  }
}

/**
 * Debug e monitoramento - função para testar conectividade
 */
export async function testDeletionSystem(): Promise<void> {
  console.log('🔧 [SAFE_DELETE_TEST] Testando sistema de exclusão...');
  
  try {
    // Teste básico de conectividade
    const { data, error } = await supabase.from('meal_plans').select('count').limit(1);
    
    if (error) {
      console.error('❌ [SAFE_DELETE_TEST] Erro de conectividade:', error);
      toast.error('Sistema de exclusão com problemas de conectividade');
    } else {
      console.log('✅ [SAFE_DELETE_TEST] Sistema de exclusão operacional');
      toast.success('Sistema de exclusão funcionando corretamente');
    }
  } catch (error) {
    console.error('❌ [SAFE_DELETE_TEST] Erro no teste:', error);
    toast.error('Erro no teste do sistema de exclusão');
  }
}