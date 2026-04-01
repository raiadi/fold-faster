-- public.users RLS: explicit INSERT / SELECT / UPDATE for own row (auth.uid() = id).
-- Run via Supabase SQL Editor or: supabase db push
-- Replaces legacy policy names from 003/schema.sql.

alter table public.users enable row level security;

-- Legacy names (003_users_rls_policies.sql, schema.sql)
drop policy if exists "Users can insert own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Users can read own profile" on public.users;

-- Idempotent re-run
drop policy if exists "Users can insert their own row" on public.users;
drop policy if exists "Users can view their own row" on public.users;
drop policy if exists "Users can update their own row" on public.users;

create policy "Users can insert their own row"
  on public.users
  for insert
  with check (auth.uid() = id);

create policy "Users can view their own row"
  on public.users
  for select
  using (auth.uid() = id);

create policy "Users can update their own row"
  on public.users
  for update
  using (auth.uid() = id);
