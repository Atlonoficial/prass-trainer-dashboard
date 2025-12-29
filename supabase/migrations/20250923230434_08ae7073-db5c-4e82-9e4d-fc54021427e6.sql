-- Função melhorada para calcular expiração automática de planos
CREATE OR REPLACE FUNCTION public.calculate_plan_expiry(plan_interval text)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  expiry_date timestamp with time zone;
BEGIN
  expiry_date := now();
  
  CASE plan_interval
    WHEN 'daily' THEN
      expiry_date := expiry_date + interval '1 day';
    WHEN 'weekly' THEN  
      expiry_date := expiry_date + interval '1 week';
    WHEN 'monthly' THEN
      expiry_date := expiry_date + interval '1 month';
    WHEN 'quarterly' THEN
      expiry_date := expiry_date + interval '3 months';
    WHEN 'yearly' THEN
      expiry_date := expiry_date + interval '1 year';
    ELSE
      -- Default para mensal se não especificado
      expiry_date := expiry_date + interval '1 month';
  END CASE;
  
  RETURN expiry_date;
END;
$$;

-- Trigger para atualizar automaticamente updated_at em students
CREATE OR REPLACE FUNCTION public.update_students_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Aplicar trigger se não existir
DROP TRIGGER IF EXISTS students_updated_at_trigger ON public.students;
CREATE TRIGGER students_updated_at_trigger
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_students_updated_at();