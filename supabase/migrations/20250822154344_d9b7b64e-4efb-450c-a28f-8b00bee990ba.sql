-- Verificar se a tabela user_presence tem constraint única por user_id
ALTER TABLE public.user_presence ADD CONSTRAINT user_presence_user_id_unique UNIQUE (user_id);

-- Atualizar a função update_user_presence para usar UPSERT corretamente
CREATE OR REPLACE FUNCTION public.update_user_presence(is_online boolean DEFAULT true, typing_in_conversation text DEFAULT null)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_presence (user_id, is_online, last_seen, is_typing_in_conversation)
  VALUES (auth.uid(), is_online, now(), typing_in_conversation)
  ON CONFLICT (user_id) 
  DO UPDATE SET
    is_online = EXCLUDED.is_online,
    last_seen = EXCLUDED.last_seen,
    is_typing_in_conversation = EXCLUDED.is_typing_in_conversation,
    updated_at = now();
END;
$function$;