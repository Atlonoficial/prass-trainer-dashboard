
-- 1) Buckets de Storage (cria se não existirem)
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'profile-images') then
    perform storage.create_bucket('profile-images', public := false);
  end if;

  if not exists (select 1 from storage.buckets where id = 'exercise-media') then
    perform storage.create_bucket('exercise-media', public := true);
  end if;

  if not exists (select 1 from storage.buckets where id = 'course-covers') then
    perform storage.create_bucket('course-covers', public := true);
  end if;

  if not exists (select 1 from storage.buckets where id = 'marketing-banners') then
    perform storage.create_bucket('marketing-banners', public := true);
  end if;

  if not exists (select 1 from storage.buckets where id = 'documents') then
    perform storage.create_bucket('documents', public := false);
  end if;
end
$$;

-- 2) Políticas de Storage
-- Convenção de path para buckets privados: "<user_id>/<arquivo>"
-- Assim, split_part(name,'/',1) = user_id (texto)

-- Remover políticas antigas com mesmo nome (se existirem)
do $$
begin
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Users can read own profile images') then
    drop policy "Users can read own profile images" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Users can insert own profile images') then
    drop policy "Users can insert own profile images" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Users can update own profile images') then
    drop policy "Users can update own profile images" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Users can delete own profile images') then
    drop policy "Users can delete own profile images" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Teachers can read students profile images') then
    drop policy "Teachers can read students profile images" on storage.objects;
  end if;

  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Anyone can view exercise media') then
    drop policy "Anyone can view exercise media" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Teachers can manage exercise media') then
    drop policy "Teachers can manage exercise media" on storage.objects;
  end if;

  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Anyone can view course covers') then
    drop policy "Anyone can view course covers" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Teachers can manage course covers') then
    drop policy "Teachers can manage course covers" on storage.objects;
  end if;

  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Anyone can view marketing banners') then
    drop policy "Anyone can view marketing banners" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Teachers can manage marketing banners') then
    drop policy "Teachers can manage marketing banners" on storage.objects;
  end if;

  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Users can read own documents') then
    drop policy "Users can read own documents" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Users can insert own documents') then
    drop policy "Users can insert own documents" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Users can update own documents') then
    drop policy "Users can update own documents" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Users can delete own documents') then
    drop policy "Users can delete own documents" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Teachers can read students documents') then
    drop policy "Teachers can read students documents" on storage.objects;
  end if;
end
$$;

-- profile-images: privado p/ dono; leitura para professor do aluno
create policy "Users can read own profile images"
on storage.objects for select to authenticated
using (bucket_id = 'profile-images' and split_part(name,'/',1) = auth.uid()::text);

create policy "Users can insert own profile images"
on storage.objects for insert to authenticated
with check (bucket_id = 'profile-images' and split_part(name,'/',1) = auth.uid()::text);

create policy "Users can update own profile images"
on storage.objects for update to authenticated
using (bucket_id = 'profile-images' and split_part(name,'/',1) = auth.uid()::text)
with check (bucket_id = 'profile-images' and split_part(name,'/',1) = auth.uid()::text);

create policy "Users can delete own profile images"
on storage.objects for delete to authenticated
using (bucket_id = 'profile-images' and split_part(name,'/',1) = auth.uid()::text);

create policy "Teachers can read students profile images"
on storage.objects for select to authenticated
using (
  bucket_id = 'profile-images'
  and public.is_teacher_of(auth.uid(), split_part(name,'/',1)::uuid)
);

-- exercise-media: público leitura; professores gerenciam
create policy "Anyone can view exercise media"
on storage.objects for select to public
using (bucket_id = 'exercise-media');

create policy "Teachers can manage exercise media"
on storage.objects for all to authenticated
using (bucket_id = 'exercise-media' and public.has_role(auth.uid(), 'teacher'))
with check (bucket_id = 'exercise-media' and public.has_role(auth.uid(), 'teacher'));

-- course-covers: público leitura; professores gerenciam
create policy "Anyone can view course covers"
on storage.objects for select to public
using (bucket_id = 'course-covers');

create policy "Teachers can manage course covers"
on storage.objects for all to authenticated
using (bucket_id = 'course-covers' and public.has_role(auth.uid(), 'teacher'))
with check (bucket_id = 'course-covers' and public.has_role(auth.uid(), 'teacher'));

-- marketing-banners: público leitura; professores gerenciam
create policy "Anyone can view marketing banners"
on storage.objects for select to public
using (bucket_id = 'marketing-banners');

create policy "Teachers can manage marketing banners"
on storage.objects for all to authenticated
using (bucket_id = 'marketing-banners' and public.has_role(auth.uid(), 'teacher'))
with check (bucket_id = 'marketing-banners' and public.has_role(auth.uid(), 'teacher'));

-- documents: privado p/ dono; leitura para professor do aluno
create policy "Users can read own documents"
on storage.objects for select to authenticated
using (bucket_id = 'documents' and split_part(name,'/',1) = auth.uid()::text);

create policy "Users can insert own documents"
on storage.objects for insert to authenticated
with check (bucket_id = 'documents' and split_part(name,'/',1) = auth.uid()::text);

create policy "Users can update own documents"
on storage.objects for update to authenticated
using (bucket_id = 'documents' and split_part(name,'/',1) = auth.uid()::text)
with check (bucket_id = 'documents' and split_part(name,'/',1) = auth.uid()::text);

create policy "Users can delete own documents"
on storage.objects for delete to authenticated
using (bucket_id = 'documents' and split_part(name,'/',1) = auth.uid()::text);

create policy "Teachers can read students documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'documents'
  and public.is_teacher_of(auth.uid(), split_part(name,'/',1)::uuid)
);

-- 3) Web Push: tabela de subscriptions
create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

alter table public.web_push_subscriptions enable row level security;

do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='web_push_subscriptions' and policyname='Users can insert own subscriptions') then
    drop policy "Users can insert own subscriptions" on public.web_push_subscriptions;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='web_push_subscriptions' and policyname='Users can update own subscriptions') then
    drop policy "Users can update own subscriptions" on public.web_push_subscriptions;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='web_push_subscriptions' and policyname='Users can delete own subscriptions') then
    drop policy "Users can delete own subscriptions" on public.web_push_subscriptions;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='web_push_subscriptions' and policyname='Users can view own subscriptions') then
    drop policy "Users can view own subscriptions" on public.web_push_subscriptions;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='web_push_subscriptions' and policyname='Teachers can view students subscriptions') then
    drop policy "Teachers can view students subscriptions" on public.web_push_subscriptions;
  end if;
end
$$;

create policy "Users can insert own subscriptions"
on public.web_push_subscriptions for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own subscriptions"
on public.web_push_subscriptions for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own subscriptions"
on public.web_push_subscriptions for delete to authenticated
using (auth.uid() = user_id);

create policy "Users can view own subscriptions"
on public.web_push_subscriptions for select to authenticated
using (auth.uid() = user_id);

create policy "Teachers can view students subscriptions"
on public.web_push_subscriptions for select to authenticated
using (public.is_teacher_of(auth.uid(), user_id));

create index if not exists idx_webpush_user on public.web_push_subscriptions(user_id);

-- 4) Opcional: fila de comandos Professor -> Aluno (com ack)
create table if not exists public.student_commands (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued', -- queued | sent | ack | processed | error
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  error text
);

alter table public.student_commands enable row level security;

do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='student_commands' and policyname='Teachers can create commands for their students') then
    drop policy "Teachers can create commands for their students" on public.student_commands;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='student_commands' and policyname='Teachers can view own created commands') then
    drop policy "Teachers can view own created commands" on public.student_commands;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='student_commands' and policyname='Students can view own incoming commands') then
    drop policy "Students can view own incoming commands" on public.student_commands;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='student_commands' and policyname='Students can update own commands status') then
    drop policy "Students can update own commands status" on public.student_commands;
  end if;
end
$$;

create policy "Teachers can create commands for their students"
on public.student_commands for insert to authenticated
with check (
  auth.uid() = created_by
  and public.is_teacher_of(auth.uid(), target_user_id)
);

create policy "Teachers can view own created commands"
on public.student_commands for select to authenticated
using (auth.uid() = created_by);

create policy "Students can view own incoming commands"
on public.student_commands for select to authenticated
using (auth.uid() = target_user_id);

create policy "Students can update own commands status"
on public.student_commands for update to authenticated
using (auth.uid() = target_user_id)
with check (auth.uid() = target_user_id);

create index if not exists idx_student_commands_target on public.student_commands(target_user_id);
create index if not exists idx_student_commands_created_by on public.student_commands(created_by);

-- 5) Realtime: garantir réplica completa e publicação
-- Lista de tabelas chave para realtime
do $$
begin
  perform 1;
  exception when others then null;
end $$;

-- REPLICA IDENTITY FULL
alter table public.notifications replica identity full;
alter table public.chat_messages replica identity full;
alter table public.conversations replica identity full;
alter table public.appointments replica identity full;
alter table public.payments replica identity full;
alter table public.workouts replica identity full;
alter table public.workout_sessions replica identity full;
alter table public.nutrition_plans replica identity full;
alter table public.meal_logs replica identity full;
alter table public.progress replica identity full;
alter table public.course_progress replica identity full;
alter table public.student_commands replica identity full;

-- Adicionar à publicação supabase_realtime (se ainda não estiverem)
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='chat_messages') then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='conversations') then
    alter publication supabase_realtime add table public.conversations;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='appointments') then
    alter publication supabase_realtime add table public.appointments;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='payments') then
    alter publication supabase_realtime add table public.payments;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='workouts') then
    alter publication supabase_realtime add table public.workouts;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='workout_sessions') then
    alter publication supabase_realtime add table public.workout_sessions;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='nutrition_plans') then
    alter publication supabase_realtime add table public.nutrition_plans;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='meal_logs') then
    alter publication supabase_realtime add table public.meal_logs;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='progress') then
    alter publication supabase_realtime add table public.progress;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='course_progress') then
    alter publication supabase_realtime add table public.course_progress;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='student_commands') then
    alter publication supabase_realtime add table public.student_commands;
  end if;
end
$$;
