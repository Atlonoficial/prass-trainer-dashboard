-- ============================================
-- SCRIPT: Criação da tabela plan_features
-- Data: 19/12/2024
-- ============================================

-- Criar tabela de funcionalidades dos planos
CREATE TABLE IF NOT EXISTS public.plan_features (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id UUID NOT NULL REFERENCES public.plan_catalog(id) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL,
    feature_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT true,
    max_usage INTEGER, -- Limite de uso (null = ilimitado)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Comentário na tabela
COMMENT ON TABLE public.plan_features IS 'Funcionalidades incluídas em cada plano de assinatura';

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

-- Política para visualizar funcionalidades (qualquer usuário autenticado)
CREATE POLICY "Anyone can view plan features" ON public.plan_features
    FOR SELECT 
    USING (true);

-- Política para gerenciar funcionalidades (apenas dono do plano)
CREATE POLICY "Plan owner can manage features" ON public.plan_features
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.plan_catalog
            WHERE id = plan_features.plan_id
            AND teacher_id = auth.uid()
        )
    );

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE plan_features;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_plan_features_plan_id ON public.plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_features_feature_key ON public.plan_features(feature_key);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_plan_features_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_plan_features_updated_at
    BEFORE UPDATE ON public.plan_features
    FOR EACH ROW
    EXECUTE FUNCTION update_plan_features_updated_at();

-- ============================================
-- DADOS INICIAIS (opcional) - Features comuns
-- ============================================

-- Exemplo: Inserir features padrão para um plano específico
-- (Substitua 'SEU_PLAN_ID' pelo ID real do plano)

/*
INSERT INTO public.plan_features (plan_id, feature_key, feature_name, description, is_enabled, max_usage) VALUES
    ('SEU_PLAN_ID', 'ai_chat', 'Chat com IA', 'Acesso ao assistente virtual de treino', true, NULL),
    ('SEU_PLAN_ID', 'video_lessons', 'Aulas em Vídeo', 'Acesso às aulas gravadas', true, NULL),
    ('SEU_PLAN_ID', 'live_sessions', 'Sessões ao Vivo', 'Participação em lives', true, 4),
    ('SEU_PLAN_ID', 'custom_plans', 'Planos Personalizados', 'Criação de treinos customizados', true, NULL),
    ('SEU_PLAN_ID', 'progress_tracking', 'Acompanhamento', 'Relatórios de progresso', true, NULL),
    ('SEU_PLAN_ID', 'meal_plans', 'Planos Alimentares', 'Acesso à nutrição personalizada', true, NULL),
    ('SEU_PLAN_ID', 'community_access', 'Comunidade', 'Acesso ao grupo exclusivo', true, NULL),
    ('SEU_PLAN_ID', 'priority_support', 'Suporte Prioritário', 'Atendimento preferencial', true, NULL);
*/

-- Verificar criação
SELECT 'Tabela plan_features criada com sucesso!' as status;
