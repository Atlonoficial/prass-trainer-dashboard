import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useStableUserType } from '@/hooks/useStableUserType';

interface AtlonMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  characters?: number; // Adicionar contador de caracteres para mensagens do assistente
  metadata?: any;
}

interface AtlonConversation {
  id: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

export function useAtlonAssistant() {
  const { user, isAuthenticated } = useAuth();
  const { userType } = useStableUserType();
  const [messages, setMessages] = useState<AtlonMessage[]>([]);
  const [conversations, setConversations] = useState<AtlonConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar se o usuário é professor/nutricionista
  const isAuthorized = userType === 'teacher';

  // Carregar conversas do professor
  const loadConversations = useCallback(async () => {
    if (!isAuthenticated || !user?.id || !isAuthorized) return;

    try {
      const { data, error } = await supabase
        .from('atlon_assistant_conversations')
        .select('*')
        .eq('teacher_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) {
        // Apenas logar se for erro diferente de tabela inexistente
        if (!error.message?.includes('does not exist') && !error.code?.includes('42P01')) {
          console.warn('Atlon Assistant: conversations table may not exist or is not configured');
        }
        setConversations([]);
        return;
      }
      setConversations(data || []);
    } catch (err: any) {
      // Silencioso - Atlon Assistant é feature opcional
      console.warn('Atlon Assistant not configured:', err?.message);
      setConversations([]);
    }
  }, [isAuthenticated, user?.id, isAuthorized]);

  // Carregar mensagens de uma conversa
  const loadMessages = useCallback(async (conversationId: string) => {
    if (!isAuthenticated || !user?.id || !isAuthorized) return;

    try {
      // Buscar a conversa para pegar o thread_id
      const { data: conversation, error: convError } = await supabase
        .from('atlon_assistant_conversations')
        .select('thread_id')
        .eq('id', conversationId)
        .single();

      if (convError) throw convError;

      // Definir o thread_id atual
      setCurrentThreadId(conversation?.thread_id || null);

      const { data, error } = await supabase
        .from('atlon_assistant_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages = data.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        characters: msg.role === 'assistant' && msg.metadata && typeof msg.metadata === 'object'
          ? (msg.metadata as any)?.characters
          : undefined,
        metadata: msg.metadata
      }));

      setMessages(formattedMessages);
      setCurrentConversationId(conversationId);
    } catch (err: any) {
      console.error('Error loading messages:', err);
      setError('Erro ao carregar mensagens');
    }
  }, [isAuthenticated, user?.id, isAuthorized]);

  // Criar nova conversa
  const createConversation = useCallback(async (): Promise<string | null> => {
    if (!isAuthenticated || !user?.id || !isAuthorized) {
      setError('Acesso não autorizado');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('atlon_assistant_conversations')
        .insert({
          teacher_id: user.id,
          title: 'Nova Conversa'
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar lista de conversas
      await loadConversations();

      return data.id;
    } catch (err: any) {
      console.error('Error creating conversation:', err);
      setError('Erro ao criar conversa');
      return null;
    }
  }, [isAuthenticated, user?.id, isAuthorized, loadConversations]);

  // Enviar mensagem para o assistente
  const sendMessage = useCallback(async (
    message: string,
    includeStudentData: boolean = false
  ): Promise<boolean> => {
    if (!isAuthenticated || !user?.id || !isAuthorized) {
      setError('Acesso não autorizado');
      return false;
    }

    if (!message.trim()) {
      setError('Mensagem não pode estar vazia');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Criar conversa se não existir
      let conversationId = currentConversationId;
      if (!conversationId) {
        conversationId = await createConversation();
        if (!conversationId) {
          throw new Error('Erro ao criar conversa');
        }
      }

      // Adicionar mensagem do usuário ao estado local
      const userMessage: AtlonMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage]);

      // Chamar edge function com thread_id
      const { data, error: functionError } = await supabase.functions.invoke('atlon-assistant', {
        body: {
          message,
          conversationId,
          teacherId: user.id,
          threadId: currentThreadId, // Adicionar thread_id
          context: {
            includeStudentData,
            timestamp: new Date().toISOString()
          }
        }
      });

      if (functionError) throw functionError;

      if (!data.success) {
        throw new Error(data.error || 'Erro na resposta do assistente');
      }

      // Atualizar thread_id se foi criado um novo
      if (data.threadId && data.threadId !== currentThreadId) {
        setCurrentThreadId(data.threadId);
      }

      // Adicionar resposta do assistente
      const assistantMessage: AtlonMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        characters: data.characters, // Incluir contagem de caracteres
        metadata: data.metadata
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Recarregar mensagens da base de dados para sincronizar
      setTimeout(() => {
        if (conversationId) {
          loadMessages(conversationId);
        }
      }, 1000);

      return true;

    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Erro ao enviar mensagem');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id, isAuthorized, currentConversationId, createConversation, loadMessages]);

  // Inicializar nova conversa
  const startNewConversation = useCallback(async () => {
    const conversationId = await createConversation();
    if (conversationId) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: 'Olá! Sou o Assistente Virtual Oficial da Atlon Tech. Como posso ajudá-lo com suas dúvidas sobre fitness, treinamento e nutrição?',
        timestamp: new Date()
      }]);
      setCurrentConversationId(conversationId);
      setCurrentThreadId(null); // Resetar thread_id para nova conversa
    }
  }, [createConversation]);

  // Carregar conversas ao montar
  useEffect(() => {
    if (isAuthenticated && isAuthorized) {
      loadConversations();
    }
  }, [isAuthenticated, isAuthorized, loadConversations]);

  // Limpar estado quando não autorizado
  useEffect(() => {
    if (!isAuthenticated || !isAuthorized) {
      setMessages([]);
      setConversations([]);
      setCurrentConversationId(null);
      setCurrentThreadId(null); // Limpar thread_id também
      setError(null);
    }
  }, [isAuthenticated, isAuthorized]);

  return {
    // Estado
    messages,
    conversations,
    currentConversationId,
    currentThreadId, // Adicionar thread_id ao retorno
    isLoading,
    error,
    isAuthorized,

    // Ações
    sendMessage,
    loadMessages,
    loadConversations,
    startNewConversation,
    createConversation,

    // Utility
    clearError: () => setError(null)
  };
}