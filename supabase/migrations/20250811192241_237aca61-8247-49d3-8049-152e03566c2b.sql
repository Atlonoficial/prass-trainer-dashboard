-- Fix: re-run policy creation without IF NOT EXISTS (previous attempt failed before creating policies)

-- Ensure table exists
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  token text not null,
  platform text check (platform in ('ios','android','web')),
  device_info jsonb default '{}'::jsonb,
  last_seen_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (token)
);

alter table public.push_tokens enable row level security;

-- Create policies
create policy "Users can insert own push tokens"
  on public.push_tokens
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own push tokens"
  on public.push_tokens
  for update
  using (auth.uid() = user_id);

create policy "Users can delete own push tokens"
  on public.push_tokens
  for delete
  using (auth.uid() = user_id);

create policy "Users can view own push tokens"
  on public.push_tokens
  for select
  using (auth.uid() = user_id);

-- Realtime configuration
alter table public.chat_messages replica identity full;
alter table public.conversations replica identity full;
alter table public.appointments replica identity full;

alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.appointments;

-- update trigger for updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_push_tokens_updated_at on public.push_tokens;
create trigger trg_push_tokens_updated_at
before update on public.push_tokens
for each row execute function public.set_updated_at();