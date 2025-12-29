-- Add enum value 'admin' to app_role in its own transaction
do $$
begin
  if exists (select 1 from pg_type t where t.typname = 'app_role') then
    if not exists (
      select 1
      from pg_type t
      join pg_enum e on e.enumtypid = t.oid
      where t.typname = 'app_role' and e.enumlabel = 'admin'
    ) then
      alter type public.app_role add value 'admin';
    end if;
  end if;
end $$;
