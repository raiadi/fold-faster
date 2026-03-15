-- Run this in Supabase Dashboard → SQL Editor after creating your project
-- and enabling Email/Password auth.

-- users (extends auth.users or standalone; using standalone for clarity)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

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
