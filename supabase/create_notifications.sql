-- ============================================
-- SCRIPT: Criação da tabela notifications
-- Data: 19/12/2024
-- EXECUTE ESTE SCRIPT EM PARTES SE NECESSÁRIO
-- ============================================

-- PARTE 1: Criar tabela
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    type VARCHAR(50) DEFAULT 'general',
    read BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Comentário na tabela
COMMENT ON TABLE public.notifications IS 'Notificações enviadas para os usuários';

-- PARTE 2: Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- PARTE 3: Políticas de segurança
-- Drop se existirem
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;

-- Política para usuários verem apenas suas notificações
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Política para usuários atualizarem suas notificações
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE 
    USING (auth.uid() = user_id);

-- Política permissiva para INSERT (será filtrado pelo código)
CREATE POLICY "Anyone can insert notifications" ON public.notifications
    FOR INSERT 
    WITH CHECK (true);

-- PARTE 4: Índices
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- PARTE 5: Realtime (execute separadamente se der erro)
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

SELECT 'Tabela notifications criada com sucesso!' as status;
