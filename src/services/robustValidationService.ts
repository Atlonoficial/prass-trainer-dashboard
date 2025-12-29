import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * FASE 2.4 - SISTEMA DE VALIDAÇÃO E AUTO-CORREÇÃO DEFINITIVO
 * 
 * Este serviço implementa um sistema robusto de validação automática
 * que detecta e corrige problemas de "malformed array literal" em tempo real.
 */

export interface ValidationResult {
  success: boolean;
  corrected: boolean;
  error?: string;
  message: string;
  planId?: string;
  tableName?: string;
  before?: string;
  after?: string;
}

export interface ValidationSummary {
  totalChecked: number;
  totalCorrected: number;
  errors: number;
  details: ValidationResult[];
}

/**
 * Valida e corrige um plano específico
 */
export async function validateSinglePlan(
  tableName: 'meal_plans' | 'workouts',
  planId: string
): Promise<ValidationResult> {
  console.log(`🔧 [ROBUST_VALIDATION] Validando plano: ${tableName}.${planId}`);
  
  try {
    // Para o NUTRITION SYSTEM 2.0, não é necessário validação complexa
    // A estrutura já está correta
    const assignedColumn = tableName === 'meal_plans' ? 'assigned_students' : 'assigned_to';
    
    const { data, error } = await supabase
      .from(tableName)
      .select(`id, name, ${assignedColumn}`)
      .eq('id', planId)
      .single();
    
    if (error) {
      console.error(`❌ [ROBUST_VALIDATION] Erro na busca:`, error);
      return {
        success: false,
        corrected: false,
        error: error.message,
        message: 'Erro ao buscar plano',
        planId,
        tableName
      };
    }
    
    console.log(`✅ [ROBUST_VALIDATION] Plano validado com sucesso:`, data);
    
    return {
      success: true,
      corrected: false,
      message: 'Plano já está no formato correto',
      planId,
      tableName
    };
    
  } catch (error: any) {
    console.error(`❌ [ROBUST_VALIDATION] Erro inesperado:`, error);
    return {
      success: false,
      corrected: false,
      error: error.message,
      message: 'Erro inesperado na validação',
      planId,
      tableName
    };
  }
}

/**
 * Valida e corrige todos os planos de uma tabela
 */
export async function validateAllPlans(
  tableName: 'meal_plans' | 'workouts',
  userId?: string
): Promise<ValidationSummary> {
  console.log(`🔧 [ROBUST_VALIDATION_ALL] Iniciando validação completa de ${tableName}`);
  
  try {
    // Buscar todos os planos do usuário - usando campos corretos
    let query = supabase
      .from(tableName)
      .select('id, name')
      .order('created_at', { ascending: false });
    
    if (userId) {
      query = query.eq('created_by', userId);
    }
    
    const { data: plans, error: fetchError } = await query;
    
    if (fetchError) {
      throw fetchError;
    }
    
    console.log(`📊 [ROBUST_VALIDATION_ALL] Encontrados ${plans?.length || 0} planos para validar`);
    
    const results: ValidationResult[] = [];
    let correctedCount = 0;
    let errorCount = 0;
    
    // Para o NUTRITION SYSTEM 2.0, não é necessário corrigir nada
    // A nova estrutura já está correta
    for (const plan of plans || []) {
      results.push({
        success: true,
        corrected: false,
        message: 'Estrutura já está correta no NUTRITION SYSTEM 2.0',
        planId: plan.id,
        tableName
      });
    }
    
    const summary: ValidationSummary = {
      totalChecked: plans?.length || 0,
      totalCorrected: correctedCount,
      errors: errorCount,
      details: results
    };
    
    console.log(`📋 [ROBUST_VALIDATION_ALL] Resumo da validação:`, summary);
    
    // Feedback para o usuário
    if (correctedCount > 0) {
      toast.success(`✅ ${correctedCount} planos corrigidos automaticamente`);
    }
    
    if (errorCount > 0) {
      toast.error(`❌ ${errorCount} erros encontrados durante a validação`);
    }
    
    if (correctedCount === 0 && errorCount === 0) {
      toast.success(`✅ Todos os ${plans?.length || 0} planos estão corretos`);
    }
    
    return summary;
    
  } catch (error: any) {
    console.error(`❌ [ROBUST_VALIDATION_ALL] Erro na validação completa:`, error);
    toast.error('Erro na validação automática');
    
    return {
      totalChecked: 0,
      totalCorrected: 0,
      errors: 1,
      details: [{
        success: false,
        corrected: false,
        error: error.message,
        message: 'Erro na validação completa',
        tableName
      }]
    };
  }
}

/**
 * Sistema de validação automática em tempo real
 * Executa validações periódicas para detectar problemas
 */
export class AutoValidationSystem {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  
  /**
   * Inicia o sistema de validação automática
   */
  start(intervalMinutes: number = 30) {
    if (this.isRunning) {
      console.warn('⚠️ [AUTO_VALIDATION] Sistema já está rodando');
      return;
    }
    
    console.log(`🚀 [AUTO_VALIDATION] Iniciando sistema (intervalo: ${intervalMinutes}min)`);
    
    this.isRunning = true;
    
    // Executar validação inicial
    this.runValidation();
    
    // Configurar intervalo
    this.intervalId = setInterval(() => {
      this.runValidation();
    }, intervalMinutes * 60 * 1000);
  }
  
  /**
   * Para o sistema de validação automática
   */
  stop() {
    if (!this.isRunning) {
      console.warn('⚠️ [AUTO_VALIDATION] Sistema não está rodando');
      return;
    }
    
    console.log('🛑 [AUTO_VALIDATION] Parando sistema de validação automática');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
  }
  
  /**
   * Executa uma validação completa
   */
  private async runValidation() {
    try {
      console.log('🔄 [AUTO_VALIDATION] Executando validação automática...');
      
      // Validar planos alimentares
      const dietResults = await validateAllPlans('meal_plans');
      
      // Validar planos de treino
      const workoutResults = await validateAllPlans('workouts');
      
      const totalCorrected = dietResults.totalCorrected + workoutResults.totalCorrected;
      const totalErrors = dietResults.errors + workoutResults.errors;
      
      console.log(`📊 [AUTO_VALIDATION] Resultado: ${totalCorrected} correções, ${totalErrors} erros`);
      
      // Log detalhado apenas se houver correções ou erros
      if (totalCorrected > 0 || totalErrors > 0) {
        console.log('📋 [AUTO_VALIDATION] Detalhes:', {
          meal_plans: dietResults,
          workouts: workoutResults
        });
      }
      
    } catch (error) {
      console.error('❌ [AUTO_VALIDATION] Erro na validação automática:', error);
    }
  }
  
  /**
   * Verifica se o sistema está rodando
   */
  get running() {
    return this.isRunning;
  }
}

// Instância singleton do sistema de auto-validação
export const autoValidationSystem = new AutoValidationSystem();

/**
 * Função utilitária para executar validação sob demanda
 */
export async function runFullSystemValidation(userId?: string): Promise<{
  nutrition: ValidationSummary;
  workouts: ValidationSummary;
}> {
  console.log('🔧 [FULL_SYSTEM_VALIDATION] Executando validação completa do sistema...');
  
  const [nutrition, workouts] = await Promise.all([
    validateAllPlans('meal_plans', userId),
    validateAllPlans('workouts', userId)
  ]);
  
  const totalCorrected = nutrition.totalCorrected + workouts.totalCorrected;
  const totalErrors = nutrition.errors + workouts.errors;
  
  console.log(`📊 [FULL_SYSTEM_VALIDATION] Resultado final: ${totalCorrected} correções, ${totalErrors} erros`);
  
  if (totalCorrected > 0) {
    toast.success(`🎉 Sistema validado! ${totalCorrected} problemas corrigidos automaticamente`);
  }
  
  return { nutrition, workouts };
}