-- Run this if you already created users with the original schema (adds experience + goal).
alter table public.users add column if not exists experience_level text;
alter table public.users add column if not exists goal text;
