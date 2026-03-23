-- RLS policies for subscriptions table.
-- Rows are written by the stripe-webhook Edge Function (service role, bypasses RLS).
-- Users can only read their own subscription row.

alter table public.subscriptions enable row level security;

drop policy if exists "Users can read own subscription" on public.subscriptions;
create policy "Users can read own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Add missing columns if not already present (idempotent via ALTER ... IF NOT EXISTS)
alter table public.subscriptions
  add column if not exists stripe_subscription_id text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists current_period_end timestamptz;
