-- ============================================
-- MIGRAÇÃO MULTI-TENANT: Isolamento Completo
-- ============================================
-- Esta migration garante isolamento total de dados por tenant
-- sem afetar funcionalidades existentes

-- 1. Criar funções auxiliares de tenant (se não existirem)
CREATE OR REPLACE FUNCTION get_user_tenant_id(user_uuid uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = user_uuid LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION user_belongs_to_tenant(user_uuid uuid, tenant_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_uuid AND tenant_id = tenant_uuid
  );
$$;

-- 2. Atualizar RLS policies de students para tenant isolation
DROP POLICY IF EXISTS "Students can view own data with tenant isolation" ON public.students;
DROP POLICY IF EXISTS "Students can update own data with tenant isolation" ON public.students;
DROP POLICY IF EXISTS "Teachers can select students with tenant isolation" ON public.students;
DROP POLICY IF EXISTS "Teachers can insert students with tenant isolation" ON public.students;
DROP POLICY IF EXISTS "Teachers can update students with tenant isolation" ON public.students;
DROP POLICY IF EXISTS "Teachers can delete students with tenant isolation" ON public.students;

-- Students policies com tenant isolation
CREATE POLICY "Students can view own data with tenant isolation"
ON public.students FOR SELECT
USING (
  auth.uid() = user_id 
  AND get_user_tenant_id(auth.uid()) = get_user_tenant_id(teacher_id)
);

CREATE POLICY "Students can update own data with tenant isolation"
ON public.students FOR UPDATE
USING (
  auth.uid() = user_id 
  AND get_user_tenant_id(auth.uid()) = get_user_tenant_id(teacher_id)
);

CREATE POLICY "Teachers can select students with tenant isolation"
ON public.students FOR SELECT
USING (
  auth.uid() = teacher_id 
  AND get_user_tenant_id(auth.uid()) = get_user_tenant_id(user_id)
);

CREATE POLICY "Teachers can insert students with tenant isolation"
ON public.students FOR INSERT
WITH CHECK (
  auth.uid() = teacher_id 
  AND get_user_tenant_id(auth.uid()) = get_user_tenant_id(user_id)
);

CREATE POLICY "Teachers can update students with tenant isolation"
ON public.students FOR UPDATE
USING (
  auth.uid() = teacher_id 
  AND get_user_tenant_id(auth.uid()) = get_user_tenant_id(user_id)
);

CREATE POLICY "Teachers can delete students with tenant isolation"
ON public.students FOR DELETE
USING (
  auth.uid() = teacher_id 
  AND get_user_tenant_id(auth.uid()) = get_user_tenant_id(user_id)
);

-- 3. Atualizar RLS policies de profiles para tenant isolation
DROP POLICY IF EXISTS "Users can view own profile with tenant isolation" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile with tenant isolation" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can view student profiles with tenant isolation" ON public.profiles;

CREATE POLICY "Users can view own profile with tenant isolation"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile with tenant isolation"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile with tenant isolation"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Teachers can view student profiles with tenant isolation"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.students 
    WHERE students.teacher_id = auth.uid() 
      AND students.user_id = profiles.id
      AND get_user_tenant_id(auth.uid()) = get_user_tenant_id(profiles.id)
  )
);

-- 4. Criar índices para performance de tenant isolation
CREATE INDEX IF NOT EXISTS idx_students_tenant_teacher 
ON public.students(teacher_id, user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_tenant 
ON public.profiles(tenant_id);

-- Log de conclusão
DO $$
BEGIN
  RAISE NOTICE '✅ Multi-tenant isolation migration completed successfully';
END $$;