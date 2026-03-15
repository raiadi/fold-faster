-- Allow users to insert their own sessions and leaks (for skill check results)
drop policy if exists "Users can insert own sessions" on public.sessions;
create policy "Users can insert own sessions" on public.sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can insert own leaks" on public.leaks;
create policy "Users can insert own leaks" on public.leaks
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can read own sessions" on public.sessions;
create policy "Users can read own sessions" on public.sessions
  for select using (auth.uid() = user_id);

drop policy if exists "Users can read own leaks" on public.leaks;
create policy "Users can read own leaks" on public.leaks
  for select using (auth.uid() = user_id);
