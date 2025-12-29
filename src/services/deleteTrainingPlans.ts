import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { normalizeIds } from '@/utils/normalize'
import { isUuid } from '@/utils/validators'
import { deleteTrainingPlanSafe, deleteTrainingPlansBatch } from './safeDeletionService'

/**
 * MIGRAÇÃO PARA SERVIÇO SEGURO - PLANOS DE TREINO
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
 * Função principal para exclusão de planos de treino - MIGRADO PARA SERVIÇO SEGURO
 * 
 * Redireciona para o novo sistema de exclusão seguro que usa RPC functions
 */
export async function deleteTrainingPlans(selection: unknown): Promise<{
  success: boolean;
  message: string;
  details?: any;
  error?: string;
}> {
  console.log('🔄 [DELETE_TRAINING_PLANS_MIGRATION] Redirecionando para serviço seguro...')
  console.log('🔍 [DELETE_TRAINING_PLANS_MIGRATION] Selection recebida:', selection)

  try {
    // Normalizar IDs para compatibilidade
    const normalizedIds = normalizeIds(selection)
    console.log('🔍 [DELETE_TRAINING_PLANS_MIGRATION] IDs normalizados:', normalizedIds)

    if (!normalizedIds.length) {
      return {
        success: false,
        message: 'Nenhum ID válido encontrado',
        error: 'Nenhum ID válido encontrado'
      }
    }

    // Redirecionar para o novo serviço seguro
    if (normalizedIds.length === 1) {
      const success = await deleteTrainingPlanSafe(normalizedIds[0])
      return {
        success,
        message: success ? 'Plano excluído com sucesso' : 'Falha na exclusão',
        error: success ? undefined : 'Falha na exclusão'
      }
    } else {
      const success = await deleteTrainingPlansBatch(normalizedIds)
      return {
        success,
        message: success ? `${normalizedIds.length} planos excluídos com sucesso` : 'Falha na exclusão em lote',
        error: success ? undefined : 'Falha na exclusão em lote'
      }
    }

  } catch (error) {
    console.error('💥 [DELETE_TRAINING_PLANS_MIGRATION] Erro inesperado:', error)
    return {
      success: false,
      message: 'Erro inesperado na exclusão',
      details: error,
      error: 'Erro inesperado na exclusão'
    }
  }
}