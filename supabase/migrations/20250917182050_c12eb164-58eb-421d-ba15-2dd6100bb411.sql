-- Verificar se colunas sync_status e last_synced_at existem e criar se não existirem
DO $$
BEGIN
    -- Adicionar sync_status se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nutrition_plans' 
        AND column_name = 'sync_status' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.nutrition_plans ADD COLUMN sync_status text DEFAULT 'pending';
    END IF;

    -- Adicionar last_synced_at se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nutrition_plans' 
        AND column_name = 'last_synced_at' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.nutrition_plans ADD COLUMN last_synced_at timestamp with time zone;
    END IF;
END $$;

-- Verificar e criar políticas RLS necessárias para atualização
DO $$
BEGIN
    -- Verificar se policy de UPDATE para professores existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'nutrition_plans' 
        AND policyname = 'Teachers can update own nutrition plans'
    ) THEN
        CREATE POLICY "Teachers can update own nutrition plans" 
        ON public.nutrition_plans 
        FOR UPDATE 
        USING (auth.uid() = created_by)
        WITH CHECK (auth.uid() = created_by);
    END IF;

    -- Verificar se policy de DELETE para professores existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'nutrition_plans' 
        AND policyname = 'Teachers can delete own nutrition plans'
    ) THEN
        CREATE POLICY "Teachers can delete own nutrition plans" 
        ON public.nutrition_plans 
        FOR DELETE 
        USING (auth.uid() = created_by);
    END IF;
END $$;

-- Verificar e recriar trigger se necessário
DROP TRIGGER IF EXISTS nutrition_plan_changes_trigger ON public.nutrition_plans;

CREATE TRIGGER nutrition_plan_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.nutrition_plans
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_nutrition_plan_changes();

-- Ativar realtime se ainda não estiver ativo
ALTER publication supabase_realtime ADD TABLE public.nutrition_plans;