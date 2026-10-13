-- Daily limit for AI photo analysis (shared free AI quota, so each account gets a fair
-- share). The Worker calls use_photo_quota() with the signed-in user's token before
-- every photo; the function counts in Malaysia time and refuses after 8 photos a day.
-- Users cannot read or change the table directly.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

create table if not exists public.photo_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  count integer not null default 0,
  primary key (user_id, day)
);

alter table public.photo_usage enable row level security;
revoke all on table public.photo_usage from anon, authenticated;

create or replace function public.use_photo_quota()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  daily_limit constant integer := 8;
  used integer;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  insert into public.photo_usage (user_id, day, count)
  values (auth.uid(), (now() at time zone 'Asia/Kuala_Lumpur')::date, 1)
  on conflict (user_id, day) do update set count = public.photo_usage.count + 1
  returning count into used;
  if used > daily_limit then
    raise exception 'daily photo limit reached' using errcode = 'P0001';
  end if;
  return daily_limit - used;
end;
$$;

revoke all on function public.use_photo_quota() from public, anon;
grant execute on function public.use_photo_quota() to authenticated;
