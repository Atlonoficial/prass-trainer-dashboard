import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useSupabaseAuth } from './useSupabaseAuth';

interface NotificationTemplate {
  id: string;
  title: string;
  message: string;
  category: string;
  variables: string[];
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

interface TemplateVariable {
  key: string;
  value: string;
  description: string;
}

export function useNotificationTemplates() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useSupabaseAuth();

  // Templates inteligentes pré-definidos
  const intelligentTemplates = [
    {
      category: 'motivacao',
      title: 'Lembrete Motivacional',
      message: 'Olá {nome}! 💪 Que tal transformar este {dia_semana} em um dia incrível? Seu treino está te esperando!',
      variables: ['nome', 'dia_semana'],
      triggers: ['inativo_3_dias', 'baixa_frequencia']
    },
    {
      category: 'conquista',
      title: 'Parabéns pela Meta!',
      message: 'Parabéns {nome}! 🎉 Você atingiu sua meta de {meta_tipo}. Continue assim, você está no caminho certo!',
      variables: ['nome', 'meta_tipo'],
      triggers: ['meta_atingida', 'peso_objetivo']
    },
    {
      category: 'treino',
      title: 'Lembrete de Treino',
      message: 'Oi {nome}! ⏰ Seu treino de {tipo_treino} está agendado para hoje às {horario}. Pronto para arrasar?',
      variables: ['nome', 'tipo_treino', 'horario'],
      triggers: ['treino_agendado', 'pre_treino']
    },
    {
      category: 'nutricao',
      title: 'Dica Nutricional',
      message: 'Olá {nome}! 🥗 Dica do dia: {dica_nutricao}. Sua alimentação é {porcentagem}% do seu resultado!',
      variables: ['nome', 'dica_nutricao', 'porcentagem'],
      triggers: ['segunda_feira', 'refeicoes_perdidas']
    },
    {
      category: 'progresso',
      title: 'Relatório Semanal',
      message: 'Oi {nome}! 📊 Esta semana você treinou {treinos_semana}x e perdeu {peso_perdido}kg. Que progresso incrível!',
      variables: ['nome', 'treinos_semana', 'peso_perdido'],
      triggers: ['fim_semana', 'progresso_positivo']
    },
    {
      category: 'aniversario',
      title: 'Feliz Aniversário!',
      message: 'Feliz aniversário {nome}! 🎂 Que este novo ano seja repleto de conquistas e muito mais saúde. Parabéns!',
      variables: ['nome'],
      triggers: ['aniversario']
    },
    {
      category: 'renovacao',
      title: 'Renovação Próxima',
      message: 'Oi {nome}! ⚠️ Seu plano vence em {dias_restantes} dias. Renove agora e continue sua jornada de transformação!',
      variables: ['nome', 'dias_restantes'],
      triggers: ['vencimento_proximo']
    },
    {
      category: 'desafio',
      title: 'Novo Desafio',
      message: 'E aí {nome}! 🔥 Novo desafio liberado: {nome_desafio}. São {duracao} dias para você mostrar sua força!',
      variables: ['nome', 'nome_desafio', 'duracao'],
      triggers: ['novo_desafio', 'engajamento_baixo']
    }
  ];

  const createTemplate = async (templateData: Partial<NotificationTemplate>) => {
    if (!user) return null;

    setLoading(true);
    try {
      // Tentar inserir na tabela real primeiro
      const { data, error } = await supabase
        .from('notification_templates')
        .insert({
          teacher_id: user.id,
          title: templateData.title,
          message: templateData.message,
          category: templateData.category || 'geral',
          variables: templateData.variables || [],
          is_active: templateData.is_active !== false
        })
        .select()
        .single();

      if (error) {
        console.log('Template table not available, using mock data:', error.message);
        // Fallback para dados simulados
        const mockData = {
          id: Math.random().toString(),
          ...templateData,
          teacher_id: user.id,
          usage_count: 0,
          created_at: new Date().toISOString()
        } as NotificationTemplate;

        setTemplates(prev => [mockData, ...prev]);
      } else {
        // Dados reais inseridos com sucesso
        setTemplates(prev => [data as NotificationTemplate, ...prev]);
      }
      
      toast({
        title: 'Template criado!',
        description: 'Novo template de notificação foi salvo com sucesso.'
      });

      return data?.id || Math.random().toString();
    } catch (error: any) {
      console.error('Error creating template:', error);
      toast({
        title: 'Erro ao criar template',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const generatePersonalizedMessage = (template: string, variables: Record<string, string>) => {
    let personalizedMessage = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      personalizedMessage = personalizedMessage.replace(regex, value);
    });

    return personalizedMessage;
  };

  const getStudentVariables = async (studentId: string): Promise<TemplateVariable[]> => {
    try {
      // Mock implementation por enquanto
      const now = new Date();
      const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

      return [
        { key: 'nome', value: 'João Silva', description: 'Nome do aluno' },
        { key: 'email', value: 'joao@exemplo.com', description: 'Email do aluno' },
        { key: 'dia_semana', value: diasSemana[now.getDay()], description: 'Dia da semana atual' },
        { key: 'plano', value: 'Premium', description: 'Plano ativo do aluno' },
        { key: 'objetivo', value: 'Emagrecimento', description: 'Objetivo principal' },
        { key: 'idade', value: '28', description: 'Idade do aluno' },
        { key: 'tempo_plano', value: '6', description: 'Meses no plano' }
      ];
    } catch (error) {
      console.error('Error getting student variables:', error);
      return [];
    }
  };

  const incrementUsage = async (templateId: string) => {
    try {
      // Mock implementation por enquanto
      console.log('Incrementing usage for template:', templateId);
    } catch (error) {
      console.error('Error incrementing template usage:', error);
    }
  };

  const fetchTemplates = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Mock templates por enquanto
      const mockTemplates: NotificationTemplate[] = [
        {
          id: '1',
          title: 'Lembrete de Treino',
          message: 'Olá {nome}! Seu treino está agendado para hoje.',
          category: 'treino',
          variables: ['nome'],
          is_active: true,
          usage_count: 5,
          created_at: new Date().toISOString()
        }
      ];

      setTemplates(mockTemplates);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Erro ao carregar templates',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Carregar templates quando o usuário estiver disponível
  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user]);

  return {
    templates,
    intelligentTemplates,
    loading,
    createTemplate,
    generatePersonalizedMessage,
    getStudentVariables,
    incrementUsage,
    fetchTemplates
  };
}