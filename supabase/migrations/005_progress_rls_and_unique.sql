-- One progress row per user; allow read/insert/update for own row
alter table public.progress add constraint progress_user_id_key unique (user_id);

drop policy if exists "Users can read own progress" on public.progress;
create policy "Users can read own progress" on public.progress
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own progress" on public.progress;
create policy "Users can insert own progress" on public.progress
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own progress" on public.progress;
create policy "Users can update own progress" on public.progress
  for update using (auth.uid() = user_id);