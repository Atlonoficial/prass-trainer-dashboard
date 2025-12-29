import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SavePlanOptions {
  plan: any;
  type: 'training' | 'diet';
  studentId?: string;
  teacherId?: string;
}

export const useAIPlanPersistence = () => {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const savePlan = async ({ plan, type, studentId, teacherId }: SavePlanOptions) => {
    setIsSaving(true);

    try {
      if (type === 'training') {
        // Salvar plano de treino real no banco
        const trainingPlan = {
          name: `🤖 ${plan.name || 'Treino Personalizado IA'}`,
          description: plan.description,
          exercises_data: plan.exercises || [],
          assigned_students: studentId ? [studentId] : [],
          created_by: teacherId,
          tags: ['ai-generated', 'personalized'],
          difficulty: plan.difficulty || 'intermediate',
          status: 'active'
        };

        const { data, error } = await supabase
          .from('workout_plans')
          .insert([trainingPlan])
          .select()
          .single();

        if (error) throw error;

        // Enviar notificação ao aluno
        if (studentId && teacherId) {
          await supabase.functions.invoke('onesignal-notifications', {
            body: {
              type: 'ai_plan_received',
              title: 'Novo Treino IA Recebido! 🤖',
              message: `Você recebeu um treino personalizado gerado por IA: ${plan.name}`,
              target_users: [studentId],
              teacher_id: teacherId,
              metadata: {
                plan_id: data.id,
                plan_type: 'training',
                generated_with_ai: true
              }
            }
          });
        }

        toast({
          title: "Sucesso",
          description: "Treino IA salvo e enviado para o aluno!",
        });

        return data;

      } else if (type === 'diet') {
        // Processar estrutura semanal de dieta IA
        let mealsData = [];
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;

        // Converter estrutura semanal para meals_data array
        if (plan.weekly_plan && plan.weekly_plan.length > 0) {
          plan.weekly_plan.forEach((week: any) => {
            if (week.days && week.days.length > 0) {
              week.days.forEach((day: any) => {
                if (day.meals && day.meals.length > 0) {
                  day.meals.forEach((meal: any) => {
                    mealsData.push({
                      id: meal.id || `meal_${Date.now()}_${Math.random()}`,
                      name: meal.name,
                      time: meal.time,
                      meal_type: meal.meal_type || 'meal',
                      calories: meal.calories || 0,
                      protein: meal.protein || 0,
                      carbs: meal.carbs || 0,
                      fat: meal.fat || 0,
                      foods: meal.foods || [],
                      instructions: meal.instructions,
                      substitutions: meal.substitutions
                    });
                    
                    // Acumular totais
                    totalCalories += meal.calories || 0;
                    totalProtein += meal.protein || 0;
                    totalCarbs += meal.carbs || 0;
                    totalFat += meal.fat || 0;
                  });
                }
              });
            }
          });
        } else if (plan.meals && plan.meals.length > 0) {
          // Fallback para estrutura simples
          mealsData = plan.meals;
          plan.meals.forEach((meal: any) => {
            totalCalories += meal.calories || 0;
            totalProtein += meal.protein || 0;
            totalCarbs += meal.carbs || 0;
            totalFat += meal.fat || 0;
          });
        }

        // Salvar plano alimentar com campos corretos
        const dietPlan = {
          name: `🤖 ${plan.name || 'Dieta Personalizada IA'}`,
          description: plan.description,
          meals_data: mealsData,
          assigned_students: studentId ? [studentId] : [],
          created_by: teacherId,
          total_calories: totalCalories,
          total_protein: totalProtein,
          total_carbs: totalCarbs,
          total_fat: totalFat,
          status: 'active',
          plan_type: 'weekly'
        };

        console.log('🍎 Saving AI diet plan:', dietPlan);

        const { data, error } = await supabase
          .from('meal_plans')
          .insert([dietPlan])
          .select()
          .single();

        if (error) throw error;

        // Enviar notificação ao aluno
        if (studentId && teacherId) {
          await supabase.functions.invoke('onesignal-notifications', {
            body: {
              type: 'ai_plan_received',
              title: 'Nova Dieta IA Recebida! 🤖',
              message: `Você recebeu uma dieta personalizada gerada por IA: ${plan.name}`,
              target_users: [studentId],
              teacher_id: teacherId,
              metadata: {
                plan_id: data.id,
                plan_type: 'diet',
                generated_with_ai: true
              }
            }
          });
        }

        toast({
          title: "Sucesso",
          description: "Dieta IA salva e enviada para o aluno!",
        });

        return data;
      }
    } catch (error) {
      console.error('Erro ao salvar plano:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o plano. Tente novamente.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const getGenerationHistory = async (teacherId: string, type: 'training' | 'diet') => {
    try {
      if (type === 'training') {
        // CORREÇÃO DEFINITIVA: Buscar todos e filtrar client-side para evitar "malformed array literal"
        const { data, error } = await supabase
          .from('workout_plans')
          .select('*')
          .eq('created_by', teacherId)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // FILTRAÇÃO CLIENT-SIDE: Filtrar apenas os gerados por IA
        const { normalizeIds } = await import('@/utils/normalize');
        const filteredData = (data || []).filter((plan: any) => {
          const hasAITag = plan.tags ? normalizeIds(plan.tags).includes('ai-generated') : false;
          return hasAITag;
        });
        
        return filteredData;
      } else {
        // Buscar planos de dieta gerados por IA
        const { data, error } = await supabase
          .from('meal_plans')
          .select('*')
          .eq('created_by', teacherId)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Filtrar apenas os gerados por IA baseado no nome com emoji 🤖
        const filteredData = (data || []).filter((plan: any) => {
          return plan.name && plan.name.includes('🤖');
        });
        
        return filteredData;
      }
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      return [];
    }
  };

  return {
    savePlan,
    getGenerationHistory,
    isSaving
  };
};