// NUTRITION SYSTEM 2.0 - Service Layer
// Operações diretas no Supabase sem RPC complexas

import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export type MealPlan = Database['public']['Tables']['meal_plans']['Row'];
export type MealPlanInsert = Database['public']['Tables']['meal_plans']['Insert'];
export type MealPlanUpdate = Database['public']['Tables']['meal_plans']['Update'];

export interface MealFood {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Meal {
  id: string;
  name: string;
  time: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: MealFood[];
}

class MealPlansService {
  // Buscar todos os planos do professor
  async getMealPlans(tenantId?: string | null): Promise<MealPlan[]> {
    let query = supabase
      .from('meal_plans')
      .select('*')
      .order('created_at', { ascending: false });

    // Filtrar por tenant se fornecido
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[MealPlansService] Erro ao buscar planos:', error);
      throw new Error(`Erro ao carregar planos alimentares: ${error.message}`);
    }

    return data || [];
  }

  // Buscar planos atribuídos ao estudante
  async getStudentMealPlans(studentId: string): Promise<MealPlan[]> {
    const { data, error } = await supabase
      .from('meal_plans')
      .select('*')
      .contains('assigned_students', [studentId])
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[MealPlansService] Erro ao buscar planos do estudante:', error);
      throw new Error(`Erro ao carregar planos do estudante: ${error.message}`);
    }

    return data || [];
  }

  // Criar novo plano
  async createMealPlan(planData: MealPlanInsert, userId: string, tenantId: string | null): Promise<MealPlan> {
    // ✅ FASE 3: Receber userId e tenantId como parâmetros
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }

    // Calcular totais nutricionais
    const totals = this.calculateNutritionalTotals(planData.meals_data as unknown as Meal[]);
    
    // Garantir que created_by e tenant_id sejam definidos
    const { data, error } = await supabase
      .from('meal_plans')
      .insert({
        ...planData,
        ...totals,
        created_by: userId,
        tenant_id: tenantId
      })
      .select()
      .single();

    if (error) {
      console.error('[MealPlansService] Erro ao criar plano:', error);
      
      // Melhor tratamento de erros UUID
      if (error.message.includes('invalid input syntax for type uuid')) {
        throw new Error('Erro de autenticação. Faça login novamente.');
      }
      
      throw new Error(`Erro ao criar plano alimentar: ${error.message}`);
    }

    console.log('[MealPlansService] Plano criado com sucesso:', data.id);
    return data;
  }

  // Atualizar plano existente
  async updateMealPlan(id: string, updates: MealPlanUpdate): Promise<MealPlan> {
    // Se atualizando meals_data, recalcular totais
    let finalUpdates = { ...updates };
    if (updates.meals_data) {
      const totals = this.calculateNutritionalTotals(updates.meals_data as unknown as Meal[]);
      finalUpdates = { ...updates, ...totals };
    }

    const { data, error } = await supabase
      .from('meal_plans')
      .update(finalUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[MealPlansService] Erro ao atualizar plano:', error);
      throw new Error(`Erro ao atualizar plano alimentar: ${error.message}`);
    }

    return data;
  }

  // Excluir plano
  async deleteMealPlan(id: string): Promise<void> {
    const { error } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[MealPlansService] Erro ao excluir plano:', error);
      throw new Error(`Erro ao excluir plano alimentar: ${error.message}`);
    }
  }

  // Duplicar plano
  async duplicateMealPlan(id: string, newName: string): Promise<MealPlan> {
    // Buscar plano original
    const { data: original, error: fetchError } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      throw new Error(`Erro ao buscar plano original: ${fetchError.message}`);
    }

    // Criar cópia - precisa de userId e tenantId
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();
    
    const { id: _, created_at, updated_at, ...planData } = original;
    return this.createMealPlan({
      ...planData,
      name: newName,
      assigned_students: []
    }, user.id, profile?.tenant_id || null);
  }

  // Atribuir plano aos estudantes
  async assignToStudents(planId: string, studentIds: string[]): Promise<MealPlan> {
    return this.updateMealPlan(planId, {
      assigned_students: studentIds
    });
  }

  // Calcular totais nutricionais client-side
  private calculateNutritionalTotals(meals: Meal[]) {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    (meals as unknown as Meal[]).forEach(meal => {
      meal.foods?.forEach(food => {
        totalCalories += food.calories || 0;
        totalProtein += food.protein || 0;
        totalCarbs += food.carbs || 0;
        totalFat += food.fat || 0;
      });
    });

    return {
      total_calories: totalCalories,
      total_protein: totalProtein,
      total_carbs: totalCarbs,
      total_fat: totalFat
    };
  }

  // Validar estrutura do plano
  validateMealPlan(planData: Partial<MealPlanInsert>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!planData.name?.trim()) {
      errors.push('Nome do plano é obrigatório');
    }

    if (!planData.meals_data || !Array.isArray(planData.meals_data)) {
      errors.push('Dados das refeições são obrigatórios');
    } else {
      const meals = planData.meals_data as unknown as Meal[];
      if (meals.length === 0) {
        errors.push('Pelo menos uma refeição deve ser adicionada');
      }

      meals.forEach((meal, index) => {
        if (!meal.name?.trim()) {
          errors.push(`Refeição ${index + 1}: Nome é obrigatório`);
        }
        if (!meal.foods || meal.foods.length === 0) {
          errors.push(`Refeição ${index + 1}: Pelo menos um alimento deve ser adicionado`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const mealPlansService = new MealPlansService();