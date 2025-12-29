import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Anamnesis {
  id: string;
  user_id: string;
  doencas: string[];
  outras_doencas?: string;
  alergias: string[];
  outras_alergias?: string;
  medicacoes: string[];
  qualidade_sono?: string;
  horas_sono?: string;
  lesoes?: string;
  created_at: string;
  updated_at: string;
}

export const useAnamneses = (userId?: string) => {
  const [anamneses, setAnamneses] = useState<Anamnesis[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAnamneses = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('anamneses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnamneses(data || []);
    } catch (error) {
      console.error('Erro ao buscar anamneses:', error);
      toast({
        title: "Erro ao carregar anamneses",
        description: "Não foi possível carregar os dados da anamnese.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnamneses();
  }, [userId]);

  return {
    anamneses,
    loading,
    refetch: fetchAnamneses,
    latestAnamnesis: anamneses[0] || null
  };
};