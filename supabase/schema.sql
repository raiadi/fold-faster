-- Run this in Supabase Dashboard → SQL Editor after creating your project
-- and enabling Email/Password auth.

-- users: id matches auth.users(id) from Supabase Auth; sync on signup
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  experience_level text,
  goal text,
  created_at timestamptz not null default now()
);

-- Allow users to insert/update/read their own row after signup (names match migration 008)
create policy "Users can insert their own row" on public.users
  for insert with check (auth.uid() = id);
create policy "Users can update their own row" on public.users
  for update using (auth.uid() = id);
create policy "Users can view their own row" on public.users
  for select using (auth.uid() = id);

-- progress
create table if not exists public.progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  xp int not null default 0,
  streak int not null default 0,
  last_active timestamptz,
  current_module text,
  level int not null default 1
);

-- sessions
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  scenarios_completed int not null default 0,
  correct_count int not null default 0,
  created_at timestamptz not null default now()
);

-- leaks
create table if not exists public.leaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  leak_type text not null,
  frequency int not null default 0,
  last_seen timestamptz
);

-- subscriptions
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null,
  stripe_customer_id text,
  plan text
);

-- Optional: enable RLS and add policies per table as needed
alter table public.users enable row level security;
alter table public.progress enable row level security;
alter table public.sessions enable row level security;
alter table public.leaks enable row level security;
alter table public.subscriptions enable row level security;
