-- 1) Enum para intervalo de faturamento
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_interval') THEN
    CREATE TYPE public.billing_interval AS ENUM ('monthly', 'quarterly', 'yearly');
  END IF;
END $$;

-- 2) Tabela de catálogo de planos
CREATE TABLE IF NOT EXISTS public.plan_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  interval public.billing_interval NOT NULL DEFAULT 'monthly',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  highlighted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Tabela de assinaturas de planos
CREATE TABLE IF NOT EXISTS public.plan_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.plan_catalog(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- pending | active | cancelled | expired
  start_at timestamptz,
  end_at timestamptz,
  approved_at timestamptz,
  cancelled_at timestamptz,
  cancelled_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT one_active_per_student_teacher UNIQUE (student_user_id, teacher_id, status)
    DEFERRABLE INITIALLY DEFERRED
);

-- 4) Função comum de updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5) Triggers de updated_at
DROP TRIGGER IF EXISTS trg_plan_catalog_updated ON public.plan_catalog;
CREATE TRIGGER trg_plan_catalog_updated
BEFORE UPDATE ON public.plan_catalog
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_plan_subscriptions_updated ON public.plan_subscriptions;
CREATE TRIGGER trg_plan_subscriptions_updated
BEFORE UPDATE ON public.plan_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6) Habilitar RLS
ALTER TABLE public.plan_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_subscriptions ENABLE ROW LEVEL SECURITY;

-- 7) Políticas plan_catalog
DROP POLICY IF EXISTS "Teachers manage own plans" ON public.plan_catalog;
CREATE POLICY "Teachers manage own plans"
ON public.plan_catalog
FOR ALL
TO authenticated
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Students view teacher plans" ON public.plan_catalog;
CREATE POLICY "Students view teacher plans"
ON public.plan_catalog
FOR SELECT
TO authenticated
USING (
  is_active = true AND (
    auth.uid() = teacher_id OR
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.user_id = auth.uid() AND s.teacher_id = plan_catalog.teacher_id
    )
  )
);

-- 8) Políticas plan_subscriptions
DROP POLICY IF EXISTS "Students create own subscriptions" ON public.plan_subscriptions;
CREATE POLICY "Students create own subscriptions"
ON public.plan_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = student_user_id
  AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.user_id = auth.uid() AND s.teacher_id = plan_subscriptions.teacher_id
  )
);

DROP POLICY IF EXISTS "Students view own subscriptions" ON public.plan_subscriptions;
CREATE POLICY "Students view own subscriptions"
ON public.plan_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = student_user_id);

DROP POLICY IF EXISTS "Teachers view own students subscriptions" ON public.plan_subscriptions;
CREATE POLICY "Teachers view own students subscriptions"
ON public.plan_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Teachers update subscriptions for own students" ON public.plan_subscriptions;
CREATE POLICY "Teachers update subscriptions for own students"
ON public.plan_subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Students can cancel own pending" ON public.plan_subscriptions;
CREATE POLICY "Students can cancel own pending"
ON public.plan_subscriptions
FOR UPDATE
TO authenticated
USING (
  auth.uid() = student_user_id AND status = 'pending'
)
WITH CHECK (
  auth.uid() = student_user_id
);

-- 9) Função para aprovar assinatura (manual)
CREATE OR REPLACE FUNCTION public.approve_subscription(p_subscription_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  sub record;
  interval_val public.billing_interval;
  new_end timestamptz;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT s.*, c.interval INTO sub
  FROM public.plan_subscriptions s
  JOIN public.plan_catalog c ON c.id = s.plan_id
  WHERE s.id = p_subscription_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found';
  END IF;

  IF sub.teacher_id <> uid AND NOT public.has_role(uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF sub.status <> 'pending' THEN
    RETURN 'noop';
  END IF;

  interval_val := sub.interval;
  CASE interval_val
    WHEN 'monthly' THEN new_end := now() + interval '1 month';
    WHEN 'quarterly' THEN new_end := now() + interval '3 months';
    WHEN 'yearly' THEN new_end := now() + interval '1 year';
    ELSE new_end := now() + interval '1 month';
  END CASE;

  UPDATE public.plan_subscriptions
  SET status = 'active', start_at = now(), end_at = new_end, approved_at = now(), updated_at = now()
  WHERE id = p_subscription_id;

  -- Sincroniza estado do aluno
  PERFORM public.sync_student_membership(sub.student_user_id, sub.teacher_id);

  RETURN 'ok';
END;
$$;

-- 10) Função para sincronizar estado no students.active_plan/membership_status
CREATE OR REPLACE FUNCTION public.sync_student_membership(p_student_user_id uuid, p_teacher_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cur record;
  plan_name text := 'free';
BEGIN
  SELECT s.* , c.name AS plan_name
  INTO cur
  FROM public.plan_subscriptions s
  JOIN public.plan_catalog c ON c.id = s.plan_id
  WHERE s.student_user_id = p_student_user_id
    AND s.teacher_id = p_teacher_id
    AND s.status = 'active'
    AND (s.end_at IS NULL OR s.end_at > now())
  ORDER BY s.start_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    -- Sem assinatura ativa: marca como free
    UPDATE public.students st
      SET active_plan = 'free', membership_status = 'active', updated_at = now()
      WHERE st.user_id = p_student_user_id AND st.teacher_id = p_teacher_id;
    RETURN 'free';
  END IF;

  plan_name := cur.plan_name;
  UPDATE public.students st
    SET active_plan = plan_name, membership_status = 'active', updated_at = now()
    WHERE st.user_id = p_student_user_id AND st.teacher_id = p_teacher_id;

  RETURN plan_name;
END;
$$;

-- 11) Trigger: quando mudar status de assinatura, re-sincroniza
DROP TRIGGER IF EXISTS trg_sync_membership ON public.plan_subscriptions;
CREATE TRIGGER trg_sync_membership
AFTER INSERT OR UPDATE ON public.plan_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.trigger_sync_membership();

-- Helper trigger wrapper
CREATE OR REPLACE FUNCTION public.trigger_sync_membership()
RETURNS trigger AS $$
BEGIN
  PERFORM public.sync_student_membership(NEW.student_user_id, NEW.teacher_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12) Função utilitária para obter permissões (entitlements)
CREATE OR REPLACE FUNCTION public.get_user_entitlements(p_user_id uuid, p_teacher_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ent jsonb := jsonb_build_object('plan', 'free', 'features', '[]'::jsonb);
  sub record;
BEGIN
  SELECT s.*, c.name, c.features
  INTO sub
  FROM public.plan_subscriptions s
  JOIN public.plan_catalog c ON c.id = s.plan_id
  WHERE s.student_user_id = p_user_id
    AND s.teacher_id = p_teacher_id
    AND s.status = 'active'
    AND (s.end_at IS NULL OR s.end_at > now())
  ORDER BY s.start_at DESC
  LIMIT 1;

  IF FOUND THEN
    ent := jsonb_build_object('plan', sub.name, 'features', sub.features);
  END IF;

  RETURN ent;
END;
$$;