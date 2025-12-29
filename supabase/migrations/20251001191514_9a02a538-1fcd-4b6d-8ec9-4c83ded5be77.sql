
-- Add tenant_id columns
ALTER TABLE students ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE workout_plans ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE plan_catalog ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE plan_subscriptions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

CREATE INDEX IF NOT EXISTS idx_students_tenant_id ON students(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workouts_tenant_id ON workouts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant_id ON payment_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plan_catalog_tenant_id ON plan_catalog(tenant_id);

-- Create tenant for existing data
DO $$
DECLARE v_tenant_id UUID;
BEGIN
  SELECT id INTO v_tenant_id FROM tenants WHERE name = 'Shape Pro' LIMIT 1;
  IF v_tenant_id IS NULL THEN
    INSERT INTO tenants (name, status, created_by)
    VALUES ('Shape Pro', 'active', (SELECT id FROM profiles WHERE user_type = 'teacher' ORDER BY created_at LIMIT 1))
    RETURNING id INTO v_tenant_id;
  END IF;
END $$;

-- Auto-create tenant for new teachers
CREATE OR REPLACE FUNCTION auto_create_tenant_for_teacher()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tenant_id UUID;
BEGIN
  IF NEW.user_type = 'teacher' AND NEW.tenant_id IS NULL THEN
    INSERT INTO tenants (name, status, created_by)
    VALUES (COALESCE(NEW.name, split_part(NEW.email, '@', 1)) || ' Studio', 'active', NEW.id)
    RETURNING id INTO v_tenant_id;
    NEW.tenant_id := v_tenant_id;
    INSERT INTO tenant_branding (tenant_id, primary_color, secondary_color) VALUES (v_tenant_id, '#FF6B35', '#004E89');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trigger_auto_create_tenant ON profiles;
CREATE TRIGGER trigger_auto_create_tenant BEFORE INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION auto_create_tenant_for_teacher();

-- Auto-assign tenant_id
CREATE OR REPLACE FUNCTION auto_assign_tenant_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tenant_id UUID;
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN RETURN NEW; END IF;
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = auth.uid() LIMIT 1;
  IF v_tenant_id IS NOT NULL THEN NEW.tenant_id := v_tenant_id; END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trigger_students_tenant ON students;
CREATE TRIGGER trigger_students_tenant BEFORE INSERT ON students FOR EACH ROW EXECUTE FUNCTION auto_assign_tenant_id();

DROP TRIGGER IF EXISTS trigger_workouts_tenant ON workouts;
CREATE TRIGGER trigger_workouts_tenant BEFORE INSERT ON workouts FOR EACH ROW EXECUTE FUNCTION auto_assign_tenant_id();

-- RLS Policies (adjusted for correct columns)
DROP POLICY IF EXISTS "Students: tenant isolated view" ON students;
CREATE POLICY "Students: tenant isolated view" ON students FOR SELECT
USING ((user_id = auth.uid() OR teacher_id = auth.uid()) AND (tenant_id = get_user_tenant_id(auth.uid()) OR tenant_id IS NULL));

DROP POLICY IF EXISTS "Teachers: tenant isolated management" ON students;
CREATE POLICY "Teachers: tenant isolated management" ON students FOR ALL
USING (teacher_id = auth.uid() AND (tenant_id = get_user_tenant_id(auth.uid()) OR tenant_id IS NULL))
WITH CHECK (teacher_id = auth.uid() AND (tenant_id = get_user_tenant_id(auth.uid()) OR tenant_id IS NULL));

DROP POLICY IF EXISTS "Workouts: tenant isolated" ON workouts;
CREATE POLICY "Workouts: tenant isolated" ON workouts FOR ALL
USING (created_by = auth.uid() AND (tenant_id = get_user_tenant_id(auth.uid()) OR tenant_id IS NULL))
WITH CHECK (created_by = auth.uid() AND (tenant_id = get_user_tenant_id(auth.uid()) OR tenant_id IS NULL));

DROP POLICY IF EXISTS "Teachers can manage own plan catalog with tenant isolation" ON plan_catalog;
CREATE POLICY "Teachers can manage own plan catalog with tenant isolation" ON plan_catalog FOR ALL
USING (teacher_id = auth.uid() AND (tenant_id = get_user_tenant_id(auth.uid()) OR tenant_id IS NULL))
WITH CHECK (teacher_id = auth.uid() AND (tenant_id = get_user_tenant_id(auth.uid()) OR tenant_id IS NULL));
