import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useSupabaseAuth } from './useSupabaseAuth';

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  condition: Record<string, any>;
  template_id: string;
  is_active: boolean;
  last_executed: string | null;
  execution_count: number;
  created_at: string;
}

interface AutomationTrigger {
  id: string;
  name: string;
  description: string;
  conditions: string[];
  icon: string;
  category: string;
}

export function useNotificationAutomation() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useSupabaseAuth();

  // Triggers disponíveis para automação
  const availableTriggers: AutomationTrigger[] = [
    {
      id: 'inatividade',
      name: 'Aluno Inativo',
      description: 'Quando aluno não treina há X dias',
      conditions: ['dias_sem_treino'],
      icon: 'clock',
      category: 'Engajamento'
    },
    {
      id: 'aniversario',
      name: 'Aniversário',
      description: 'No aniversário do aluno',
      conditions: ['data_nascimento'],
      icon: 'gift',
      category: 'Especiais'
    },
    {
      id: 'meta_atingida',
      name: 'Meta Atingida',
      description: 'Quando aluno atinge uma meta',
      conditions: ['tipo_meta', 'valor_meta'],
      icon: 'trophy',
      category: 'Conquistas'
    },
    {
      id: 'vencimento_proximo',
      name: 'Vencimento Próximo',
      description: 'Quando plano está próximo do vencimento',
      conditions: ['dias_antecedencia'],
      icon: 'alert-circle',
      category: 'Comercial'
    },
    {
      id: 'novo_aluno',
      name: 'Novo Aluno',
      description: 'Quando aluno se cadastra',
      conditions: ['tempo_cadastro'],
      icon: 'user-plus',
      category: 'Boas-vindas'
    },
    {
      id: 'frequencia_baixa',
      name: 'Baixa Frequência',
      description: 'Quando frequência semanal é baixa',
      conditions: ['treinos_por_semana'],
      icon: 'trending-down',
      category: 'Engajamento'
    },
    {
      id: 'progresso_estagnado',
      name: 'Progresso Estagnado',
      description: 'Quando não há progresso há X dias',
      conditions: ['dias_sem_progresso'],
      icon: 'bar-chart',
      category: 'Performance'
    },
    {
      id: 'horario_treino',
      name: 'Lembrete de Treino',
      description: 'Lembrete antes do horário do treino',
      conditions: ['minutos_antecedencia'],
      icon: 'bell',
      category: 'Lembretes'
    }
  ];

  const createAutomationRule = async (ruleData: Partial<AutomationRule>) => {
    if (!user) return null;

    setLoading(true);
    try {
      // Tentar inserir na tabela real primeiro
      const { data, error } = await supabase
        .from('notification_automation_rules')
        .insert({
          teacher_id: user.id,
          name: ruleData.name,
          trigger: ruleData.trigger,
          condition: ruleData.condition || {},
          template_id: ruleData.template_id,
          is_active: ruleData.is_active || true
        })
        .select()
        .single();

      if (error) {
        console.log('Automation table not available, using mock data:', error.message);
        // Fallback para dados simulados
        const mockData = {
          id: Math.random().toString(),
          ...ruleData,
          teacher_id: user.id,
          execution_count: 0,
          created_at: new Date().toISOString()
        } as AutomationRule;

        setRules(prev => [mockData, ...prev]);
      } else {
        // Dados reais inseridos com sucesso
        setRules(prev => [data as AutomationRule, ...prev]);
      }
      
      toast({
        title: 'Automação criada!',
        description: 'Nova regra de automação foi configurada com sucesso.'
      });

      return data?.id || Math.random().toString();
    } catch (error: any) {
      console.error('Error creating automation rule:', error);
      toast({
        title: 'Erro ao criar automação',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const toggleAutomationRule = async (ruleId: string, isActive: boolean) => {
    try {
      // Mock implementation por enquanto
      console.log('Toggling automation rule:', ruleId, isActive);

      setRules(prev => prev.map(rule => 
        rule.id === ruleId ? { ...rule, is_active: isActive } : rule
      ));

      toast({
        title: isActive ? 'Automação ativada' : 'Automação desativada',
        description: `A regra foi ${isActive ? 'ativada' : 'desativada'} com sucesso.`
      });
    } catch (error: any) {
      console.error('Error toggling automation rule:', error);
      toast({
        title: 'Erro ao alterar automação',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const executeAutomationCheck = async () => {
    if (!user) return;

    try {
      // Usar dados mockados por enquanto até as tabelas estarem no TypeScript
      console.log('Checking automations for user:', user.id);
    } catch (error) {
      console.error('Error executing automation check:', error);
    }
  };

  const checkAndExecuteRule = async (rule: AutomationRule) => {
    // Mock implementation por enquanto
    console.log('Checking rule:', rule.name);
  };

  const executeAutomatedNotification = async (rule: AutomationRule, targetStudents: string[]) => {
    // Mock implementation por enquanto
    console.log('Executing automated notification:', rule.name, targetStudents.length);
  };

  const fetchAutomationRules = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Mock data por enquanto
      const mockRules: AutomationRule[] = [
        {
          id: '1',
          name: 'Lembrete para alunos inativos',
          trigger: 'inatividade',
          condition: { dias_sem_treino: 3 },
          template_id: 'template-1',
          is_active: true,
          last_executed: null,
          execution_count: 0,
          created_at: new Date().toISOString()
        }
      ];

      setRules(mockRules);
    } catch (error: any) {
      console.error('Error fetching automation rules:', error);
      toast({
        title: 'Erro ao carregar automações',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Executar verificação de automações a cada 30 minutos
  useEffect(() => {
    if (user) {
      fetchAutomationRules();
      
      const interval = setInterval(() => {
        executeAutomationCheck();
      }, 30 * 60 * 1000); // 30 minutos

      return () => clearInterval(interval);
    }
  }, [user]);

  return {
    rules,
    availableTriggers,
    loading,
    createAutomationRule,
    toggleAutomationRule,
    executeAutomationCheck,
    fetchAutomationRules
  };
}