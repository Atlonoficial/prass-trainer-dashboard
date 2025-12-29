
-- 1) Plano "free" por padrão e backfill dos existentes
alter table public.students
  alter column active_plan set default 'free';

update public.students
  set active_plan = 'free'
  where active_plan is null;

-- Garantir membership_status 'active' por padrão (já existe, reforçando)
alter table public.students
  alter column membership_status set default 'active';

-- 2) Tabela de assinantes para sincronizar Stripe
create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null unique,
  stripe_customer_id text,
  subscribed boolean not null default false,
  subscription_tier text,
  subscription_end timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.subscribers enable row level security;

-- Usuário só vê o próprio registro
create policy "select_own_subscription" on public.subscribers
for select
using (user_id = auth.uid() or email = auth.email());

-- Edge functions (service role) e/ou atualizações controladas
create policy "update_own_subscription" on public.subscribers
for update
using (true);

create policy "insert_subscription" on public.subscribers
for insert
with check (true);
