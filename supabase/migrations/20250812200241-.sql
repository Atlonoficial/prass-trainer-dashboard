-- Fix order: create trigger function before creating trigger
CREATE OR REPLACE FUNCTION public.trigger_sync_membership()
RETURNS trigger AS $$
BEGIN
  PERFORM public.sync_student_membership(NEW.student_user_id, NEW.teacher_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_membership ON public.plan_subscriptions;
CREATE TRIGGER trg_sync_membership
AFTER INSERT OR UPDATE ON public.plan_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.trigger_sync_membership();