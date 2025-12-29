-- Allow teachers to view the profiles (name, email, avatar) of their own students
-- This enables the UI to display full student names without exposing other profiles
create policy "Teachers can view students profiles"
  on public.profiles
  for select
  using (is_teacher_of(auth.uid(), id));