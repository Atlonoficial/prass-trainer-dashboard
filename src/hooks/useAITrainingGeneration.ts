import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAIDietCache } from '@/hooks/useAIDietCache';

interface GenerationRequest {
  type: 'training' | 'diet';
  useAnamnesis: boolean;
  studentId?: string;
  goal: string;
  equipment?: string[];
  level?: string;
  duration?: number;
  mealsPerDay?: number;
  dietaryRestrictions?: string[];
}

interface AIGeneratedPlan {
  name: string;
  description: string;
  duration_weeks?: number;
  exercises?: any[];
  meals?: any[];
  generated_with_ai: boolean;
  generated_at: string;
  generation_context: any;
  safety_considerations?: string;
  progression_notes?: string;
  daily_totals?: any;
  substitution_options?: string;
}

export const useAITrainingGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const cache = useAIDietCache({ maxSize: 100, ttl: 20 * 60 * 1000 });

  const generatePlan = async (request: GenerationRequest): Promise<AIGeneratedPlan | null> => {
    // Cache para dietas
    if (request.type === 'diet' && request.studentId) {
      const cacheKey = cache.generateKey(
        request.studentId, 
        request.goal, 
        request.useAnamnesis
      );
      
      const cachedPlan = cache.get(cacheKey);
      if (cachedPlan) {
        console.log('🎯 [CACHE_HIT] Plano encontrado no cache');
        toast({
          title: "Plano recuperado",
          description: "Plano carregado do cache (otimizado).",
        });
        return cachedPlan;
      }
    }

    setIsGenerating(true);

    try {
      console.log('🚀 [GENERATE] Gerando plano com IA:', request);
      
      const { data, error } = await supabase.functions.invoke('ai-training-generator', {
        body: request
      });

      if (error) {
        console.error('❌ [ERROR] Erro da função Supabase:', error);
        throw error;
      }

      if (data.success) {
        // Cache para dietas
        if (request.type === 'diet' && request.studentId && data.data) {
          const cacheKey = cache.generateKey(
            request.studentId, 
            request.goal, 
            request.useAnamnesis
          );
          cache.set(cacheKey, data.data);
          console.log('💾 [CACHE_SET] Plano salvo no cache');
        }

        toast({
          title: "Sucesso",
          description: `Plano ${request.type === 'training' ? 'de treino' : 'alimentar'} gerado com IA${data.hasContextData ? ' (baseado na anamnese)' : ''}!`,
        });
        return data.data;
      } else {
        throw new Error(data.details || data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('❌ [CRITICAL] Erro ao gerar plano:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível gerar o plano. Tente novamente.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generatePlan,
    isGenerating,
    cacheStats: cache.stats,
    clearCache: cache.clear
  };
};