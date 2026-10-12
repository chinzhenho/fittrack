-- One row per user holding the app's full state document (profile, targets, meals,
-- weights, workouts). Row Level Security guarantees a user can only read and write
-- their own row; anonymous visitors get no access at all.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

create table if not exists public.user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  constraint user_state_is_object check (jsonb_typeof(state) = 'object'),
  constraint user_state_max_size check (pg_column_size(state) < 5000000)
);

alter table public.user_state enable row level security;

revoke all on table public.user_state from anon;
grant select, insert, update, delete on table public.user_state to authenticated;

drop policy if exists "user_state: read own row" on public.user_state;
create policy "user_state: read own row" on public.user_state
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "user_state: insert own row" on public.user_state;
create policy "user_state: insert own row" on public.user_state
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "user_state: update own row" on public.user_state;
create policy "user_state: update own row" on public.user_state
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_state: delete own row" on public.user_state;
create policy "user_state: delete own row" on public.user_state
  for delete to authenticated using ((select auth.uid()) = user_id);
