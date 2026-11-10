-- Limits on AI photo analysis, checked before the AI is called:
--   * per person: 50 answered photos a day (Malaysia time),
--   * per person: 5 tries a minute (stops scripts from flooding the AI),
--   * whole site: 1,000 tries a day. The free AI quotas add up to about 1,070 photos a
--     day, so the site stops before they run out, and even if billing were ever turned
--     on by mistake, no more than this many AI calls a day can be made.
-- photo_quota_left() records each try and raises an error when a limit is reached; the
-- Worker then does not call the AI. use_photo_quota() still counts answered photos.
-- Users cannot read or change these tables directly; only these functions can.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

create table if not exists public.photo_rate (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_start timestamptz not null,
  count integer not null default 0
);
alter table public.photo_rate enable row level security;
revoke all on table public.photo_rate from anon, authenticated;

create table if not exists public.photo_global (
  day date primary key,
  attempts integer not null default 0
);
alter table public.photo_global enable row level security;
revoke all on table public.photo_global from anon, authenticated;

create or replace function public.photo_quota_left()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  daily_limit constant integer := 50;
  per_minute constant integer := 5;
  site_daily_limit constant integer := 1000;
  today date := (now() at time zone 'Asia/Kuala_Lumpur')::date;
  used integer;
  recent integer;
  site integer;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  select count into used
  from public.photo_usage
  where user_id = auth.uid() and day = today;
  if coalesce(used, 0) >= daily_limit then
    raise exception 'daily photo limit reached' using errcode = 'P0001';
  end if;

  -- Fixed one-minute window per person.
  insert into public.photo_rate (user_id, window_start, count)
  values (auth.uid(), now(), 1)
  on conflict (user_id) do update set
    count = case
      when public.photo_rate.window_start < now() - interval '1 minute' then 1
      else public.photo_rate.count + 1
    end,
    window_start = case
      when public.photo_rate.window_start < now() - interval '1 minute' then now()
      else public.photo_rate.window_start
    end
  returning count into recent;
  if recent > per_minute then
    raise exception 'photo rate limit reached' using errcode = 'P0001';
  end if;

  insert into public.photo_global (day, attempts)
  values (today, 1)
  on conflict (day) do update set attempts = public.photo_global.attempts + 1
  returning attempts into site;
  if site > site_daily_limit then
    raise exception 'site daily limit reached' using errcode = 'P0001';
  end if;

  return daily_limit - coalesce(used, 0);
end;
$$;

create or replace function public.use_photo_quota()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  daily_limit constant integer := 50;
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

revoke all on function public.photo_quota_left() from public, anon;
grant execute on function public.photo_quota_left() to authenticated;
revoke all on function public.use_photo_quota() from public, anon;
grant execute on function public.use_photo_quota() to authenticated;
