// NUTRITION SYSTEM 2.0 - Hook Layer
// Hook simples e direto para meal plans

import { useState, useEffect, useCallback } from 'react';
import { mealPlansService, MealPlan, MealPlanInsert, MealPlanUpdate } from '@/services/mealPlansService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTenantContext } from '@/contexts/TenantContext';
import { useUnifiedApp } from '@/contexts/UnifiedAppProvider';

interface UseMealPlansOptions {
  studentId?: string; // Se fornecido, busca planos do estudante
  autoFetch?: boolean; // Default true
}

export const useMealPlans = (options: UseMealPlansOptions = {}) => {
  const { studentId, autoFetch = true } = options;
  const { tenantId } = useTenantContext();
  const { userId } = useUnifiedApp(); // ✅ FASE 3: Usar contexto ao invés de auth.getUser()

  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar meal plans
  const fetchMealPlans = useCallback(async () => {
    if (!autoFetch) return;
    
    try {
      setLoading(true);
      setError(null);

      let plans: MealPlan[];
      if (studentId) {
        plans = await mealPlansService.getStudentMealPlans(studentId);
      } else {
        plans = await mealPlansService.getMealPlans(tenantId);
      }

      setMealPlans(plans);
      console.log(`[useMealPlans] Carregados ${plans.length} planos`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('[useMealPlans] Erro ao buscar planos:', err);
      setError(errorMessage);
      toast.error(`Erro ao carregar planos: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [studentId, autoFetch, tenantId]);

  // Criar novo plano
  const createMealPlan = useCallback(async (planData: MealPlanInsert) => {
    try {
      setLoading(true);
      setError(null);
      
      // Validar dados
      const validation = mealPlansService.validateMealPlan(planData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      console.log('[useMealPlans] Criando plano:', planData.name);
      
      // ✅ FASE 3: Passar userId e tenantId ao invés de buscar internamente
      if (!userId) {
        throw new Error('Usuário não autenticado');
      }
      
      const newPlan = await mealPlansService.createMealPlan(planData, userId, tenantId);
      
      // Atualizar estado local imediatamente
      setMealPlans(prev => [newPlan, ...prev]);
      
      toast.success('Plano alimentar criado com sucesso!');
      console.log('[useMealPlans] Plano criado e adicionado ao estado:', newPlan.id);
      
      return newPlan;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar plano';
      console.error('[useMealPlans] Erro ao criar plano:', err);
      setError(errorMessage);
      
      // Mensagens de erro mais específicas
      if (errorMessage.includes('autenticação') || errorMessage.includes('uuid')) {
        toast.error('Erro de autenticação. Faça login novamente.');
      } else {
        toast.error(errorMessage);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Atualizar plano existente
  const updateMealPlan = useCallback(async (id: string, updates: MealPlanUpdate) => {
    try {
      setLoading(true);

      const updatedPlan = await mealPlansService.updateMealPlan(id, updates);
      
      // Atualizar estado local
      setMealPlans(prev => 
        prev.map(plan => plan.id === id ? updatedPlan : plan)
      );
      
      toast.success('Plano alimentar atualizado!');
      console.log('[useMealPlans] Plano atualizado:', id);
      
      return updatedPlan;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar plano';
      console.error('[useMealPlans] Erro ao atualizar plano:', err);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Excluir plano
  const deleteMealPlan = useCallback(async (id: string) => {
    try {
      setLoading(true);

      await mealPlansService.deleteMealPlan(id);
      
      // Remover do estado local
      setMealPlans(prev => prev.filter(plan => plan.id !== id));
      
      toast.success('Plano alimentar excluído!');
      console.log('[useMealPlans] Plano excluído:', id);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir plano';
      console.error('[useMealPlans] Erro ao excluir plano:', err);
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Duplicar plano
  const duplicateMealPlan = useCallback(async (id: string, newName: string) => {
    try {
      setLoading(true);

      const duplicatedPlan = await mealPlansService.duplicateMealPlan(id, newName);
      
      // Adicionar ao estado local
      setMealPlans(prev => [duplicatedPlan, ...prev]);
      
      toast.success('Plano duplicado com sucesso!');
      console.log('[useMealPlans] Plano duplicado:', duplicatedPlan.id);
      
      return duplicatedPlan;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao duplicar plano';
      console.error('[useMealPlans] Erro ao duplicar plano:', err);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Atribuir plano aos estudantes
  const assignToStudents = useCallback(async (planId: string, studentIds: string[]) => {
    try {
      setLoading(true);

      const updatedPlan = await mealPlansService.assignToStudents(planId, studentIds);
      
      // Atualizar estado local
      setMealPlans(prev => 
        prev.map(plan => plan.id === planId ? updatedPlan : plan)
      );
      
      toast.success(`Plano atribuído a ${studentIds.length} estudante(s)!`);
      console.log('[useMealPlans] Plano atribuído:', planId, studentIds);
      
      return updatedPlan;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atribuir plano';
      console.error('[useMealPlans] Erro ao atribuir plano:', err);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch manual
  const refetch = useCallback(() => {
    fetchMealPlans();
  }, [fetchMealPlans]);

  // Setup realtime subscription
  useEffect(() => {
    if (!tenantId) return;

    fetchMealPlans();

    // Subscription para updates em tempo real
    const channel = supabase
      .channel('meal_plans_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meal_plans',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          console.log('[useMealPlans] Realtime update:', payload);
          // Refetch quando houver mudanças
          fetchMealPlans();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMealPlans, tenantId]);

  return {
    // Estado
    mealPlans,
    loading,
    error,
    
    // Ações
    createMealPlan,
    updateMealPlan,
    deleteMealPlan,
    duplicateMealPlan,
    assignToStudents,
    refetch,
    
    // Utilidades
    totalPlans: mealPlans.length,
    activePlans: mealPlans.filter(p => p.status === 'active').length
  };
};