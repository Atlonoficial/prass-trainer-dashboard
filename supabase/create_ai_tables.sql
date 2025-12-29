-- =============================================================================
-- Script para criar tabelas de IA para o Coach IA do APP-MODELO
-- Execute este script no Supabase SQL Editor
-- =============================================================================

-- 1. Tabela ai_conversations - Armazena conversas do usuário com o Coach IA
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    thread_id TEXT, -- ID do thread (se usar OpenAI Assistants)
    title TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para ai_conversations
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated_at ON public.ai_conversations(updated_at DESC);

-- 2. Tabela ai_messages - Armazena mensagens das conversas
CREATE TABLE IF NOT EXISTS public.ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para ai_messages
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON public.ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at ON public.ai_messages(created_at);

-- 3. Tabela ai_usage_stats - Controla limite diário de uso da IA
CREATE TABLE IF NOT EXISTS public.ai_usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    daily_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, usage_date)
);

-- Índices para ai_usage_stats
CREATE INDEX IF NOT EXISTS idx_ai_usage_stats_user_date ON public.ai_usage_stats(user_id, usage_date);

-- =============================================================================
-- RLS (Row Level Security) Policies
-- =============================================================================

-- Habilitar RLS nas tabelas
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_stats ENABLE ROW LEVEL SECURITY;

-- Policies para ai_conversations
CREATE POLICY "Users can view their own conversations"
    ON public.ai_conversations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
    ON public.ai_conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
    ON public.ai_conversations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
    ON public.ai_conversations FOR DELETE
    USING (auth.uid() = user_id);

-- Policies para ai_messages
CREATE POLICY "Users can view messages from their conversations"
    ON public.ai_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ai_conversations
            WHERE id = ai_messages.conversation_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create messages in their conversations"
    ON public.ai_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ai_conversations
            WHERE id = ai_messages.conversation_id
            AND user_id = auth.uid()
        )
    );

-- Policies para ai_usage_stats
CREATE POLICY "Users can view their own usage stats"
    ON public.ai_usage_stats FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own usage stats"
    ON public.ai_usage_stats FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage stats"
    ON public.ai_usage_stats FOR UPDATE
    USING (auth.uid() = user_id);

-- =============================================================================
-- Trigger para atualizar updated_at automaticamente
-- =============================================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para ai_conversations
DROP TRIGGER IF EXISTS update_ai_conversations_updated_at ON public.ai_conversations;
CREATE TRIGGER update_ai_conversations_updated_at
    BEFORE UPDATE ON public.ai_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para ai_usage_stats
DROP TRIGGER IF EXISTS update_ai_usage_stats_updated_at ON public.ai_usage_stats;
CREATE TRIGGER update_ai_usage_stats_updated_at
    BEFORE UPDATE ON public.ai_usage_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Comentários nas tabelas
-- =============================================================================

COMMENT ON TABLE public.ai_conversations IS 'Armazena conversas do usuário com o Coach IA';
COMMENT ON TABLE public.ai_messages IS 'Armazena mensagens das conversas com o Coach IA';
COMMENT ON TABLE public.ai_usage_stats IS 'Controla o limite diário de uso da IA por usuário';

-- =============================================================================
-- FIM DO SCRIPT
-- =============================================================================
