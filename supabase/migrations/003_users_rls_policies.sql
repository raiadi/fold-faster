-- Fix RLS: allow users to insert/update/read their own row in public.users after signup.
-- Run this in Supabase Dashboard → SQL Editor if you get "new row violates row-level security policy".

alter table public.users enable row level security;

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile" on public.users
  for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile" on public.users
  for select using (auth.uid() = id);
