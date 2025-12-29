-- Temporariamente tornar RLS mais permissivo para debug
DROP POLICY IF EXISTS "Users can create own banner interactions" ON public.banner_interactions;
DROP POLICY IF EXISTS "Users can view own banner interactions" ON public.banner_interactions;
DROP POLICY IF EXISTS "Teachers can view student banner interactions" ON public.banner_interactions;

-- Política super permissiva para debug
CREATE POLICY "Debug: Allow all authenticated users" ON public.banner_interactions
FOR ALL USING (auth.role() = 'authenticated');

-- Também simplificar analytics
DROP POLICY IF EXISTS "Users can view own banner analytics" ON public.banner_analytics;
DROP POLICY IF EXISTS "Teachers can view student banner analytics" ON public.banner_analytics;

CREATE POLICY "Debug: Allow all authenticated analytics" ON public.banner_analytics
FOR ALL USING (auth.role() = 'authenticated');