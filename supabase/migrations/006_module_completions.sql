-- Tracks per-user, per-module completion progress.
-- One row per (user, module). Upsert on each attempt, storing best score.

create table if not exists public.module_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  module_id integer not null check (module_id between 1 and 4),
  best_correct integer not null default 0,
  total_scenarios integer not null default 15,
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id, module_id)
);

alter table public.module_completions enable row level security;

create policy "Users can read own module completions" on public.module_completions
  for select using (auth.uid() = user_id);

create policy "Users can insert own module completions" on public.module_completions
  for insert with check (auth.uid() = user_id);

create policy "Users can update own module completions" on public.module_completions
  for update using (auth.uid() = user_id);
