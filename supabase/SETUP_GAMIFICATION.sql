-- ===================================================
-- TABELAS DE GAMIFICAÇÃO (REWARDS)
-- Execute no SQL Editor do Supabase
-- ===================================================

-- PARTE 1: rewards_items
CREATE TABLE IF NOT EXISTS public.rewards_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL DEFAULT 100,
  stock INTEGER,
  is_active BOOLEAN DEFAULT true,
  image_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rewards_items_creator ON public.rewards_items(created_by);
ALTER TABLE public.rewards_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ri_creator_all" ON public.rewards_items;
DROP POLICY IF EXISTS "ri_students_view" ON public.rewards_items;
CREATE POLICY "ri_creator_all" ON public.rewards_items FOR ALL USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "ri_students_view" ON public.rewards_items FOR SELECT USING (is_active = true);

-- PARTE 2: reward_redemptions
CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reward_id UUID NOT NULL,
  points_spent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user ON public.reward_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_reward ON public.reward_redemptions(reward_id);
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rr_user_own" ON public.reward_redemptions;
DROP POLICY IF EXISTS "rr_teacher_view" ON public.reward_redemptions;
DROP POLICY IF EXISTS "rr_insert" ON public.reward_redemptions;
DROP POLICY IF EXISTS "rr_update" ON public.reward_redemptions;
DROP POLICY IF EXISTS "rr_delete" ON public.reward_redemptions;
CREATE POLICY "rr_user_own" ON public.reward_redemptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rr_teacher_view" ON public.reward_redemptions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.rewards_items ri WHERE ri.id = reward_id AND ri.created_by = auth.uid())
);
CREATE POLICY "rr_insert" ON public.reward_redemptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rr_update" ON public.reward_redemptions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.rewards_items ri WHERE ri.id = reward_id AND ri.created_by = auth.uid())
);
CREATE POLICY "rr_delete" ON public.reward_redemptions FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.rewards_items ri WHERE ri.id = reward_id AND ri.created_by = auth.uid())
);

-- PARTE 3: user_points (se não existir)
CREATE TABLE IF NOT EXISTS public.user_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  last_activity_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_points_user ON public.user_points(user_id);
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "up_user_own" ON public.user_points;
CREATE POLICY "up_user_own" ON public.user_points FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "up_teacher_view" ON public.user_points;
CREATE POLICY "up_teacher_view" ON public.user_points FOR SELECT USING (true);

-- PARTE 4: gamification_activities (se não existir)
CREATE TABLE IF NOT EXISTS public.gamification_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  points_earned INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gamification_activities_user ON public.gamification_activities(user_id);
ALTER TABLE public.gamification_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ga_user_own" ON public.gamification_activities;
DROP POLICY IF EXISTS "ga_insert" ON public.gamification_activities;
CREATE POLICY "ga_user_own" ON public.gamification_activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ga_insert" ON public.gamification_activities FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Verificar
SELECT 'rewards_items' as tabela, COUNT(*) as registros FROM public.rewards_items
UNION ALL SELECT 'reward_redemptions', COUNT(*) FROM public.reward_redemptions
UNION ALL SELECT 'user_points', COUNT(*) FROM public.user_points
UNION ALL SELECT 'gamification_activities', COUNT(*) FROM public.gamification_activities;
