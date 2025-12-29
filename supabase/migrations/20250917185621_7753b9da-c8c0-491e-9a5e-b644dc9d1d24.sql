-- Criar tabela para conversas do assistente Atlon Tech
CREATE TABLE public.atlon_assistant_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para mensagens do assistente
CREATE TABLE public.atlon_assistant_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.atlon_assistant_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.atlon_assistant_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlon_assistant_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Teachers can manage own conversations"
ON public.atlon_assistant_conversations
FOR ALL
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

-- RLS Policies for messages  
CREATE POLICY "Teachers can manage messages in own conversations"
ON public.atlon_assistant_messages
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.atlon_assistant_conversations c
    WHERE c.id = atlon_assistant_messages.conversation_id
    AND c.teacher_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.atlon_assistant_conversations c
    WHERE c.id = atlon_assistant_messages.conversation_id
    AND c.teacher_id = auth.uid()
  )
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_atlon_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_atlon_conversations_updated_at
BEFORE UPDATE ON public.atlon_assistant_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_atlon_conversations_updated_at();