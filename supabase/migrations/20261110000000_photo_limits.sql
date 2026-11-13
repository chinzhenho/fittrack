-- Limits on AI photo analysis, all checked before any AI call, so the app never uses
-- an AI model beyond its free daily quota.
--
-- 1. photo_quota_left(): called once per photo, before the AI.
--    * per person: 50 answered photos a day (Malaysia time),
--    * per person: 5 tries a minute (stops scripts from flooding the AI),
--    * whole site: 1,000 tries a day.
-- 2. use_ai_model(model, limit, time zone): called right before each AI model is
--    asked. It counts calls per model per day and says no once the model reaches the
--    limit the Worker passes in (set just under that model's free quota in
--    wrangler.jsonc). Days follow the provider's reset time: Gemini quotas reset at
--    midnight Pacific time, Workers AI at midnight UTC. It only works within 2 minutes
--    of the same person's photo_quota_left() try, so it can't be called on its own.
-- 3. use_photo_quota(): counts a photo against the person's 50 once the AI answered.
-- 4. keep_alive(): a tiny query the Worker runs every day so the free project is never
--    paused for being inactive.
--
-- Users cannot read or change these tables directly; only these functions can.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

create table if not exists public.photo_rate (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_start timestamptz not null,
  count integer not null default 0,
  last_try timestamptz
);
alter table public.photo_rate add column if not exists last_try timestamptz;
alter table public.photo_rate enable row level security;
revoke all on table public.photo_rate from anon, authenticated;

create table if not exists public.photo_global (
  day date primary key,
  attempts integer not null default 0
);
alter table public.photo_global enable row level security;
revoke all on table public.photo_global from anon, authenticated;

create table if not exists public.ai_model_usage (
  day date not null,
  model text not null,
  count integer not null default 0,
  primary key (day, model)
);
alter table public.ai_model_usage enable row level security;
revoke all on table public.ai_model_usage from anon, authenticated;

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
  insert into public.photo_rate (user_id, window_start, count, last_try)
  values (auth.uid(), now(), 1, now())
  on conflict (user_id) do update set
    count = case
      when public.photo_rate.window_start < now() - interval '1 minute' then 1
      else public.photo_rate.count + 1
    end,
    window_start = case
      when public.photo_rate.window_start < now() - interval '1 minute' then now()
      else public.photo_rate.window_start
    end,
    last_try = now()
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

create or replace function public.use_ai_model(p_model text, p_daily_limit integer, p_time_zone text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  last_seen timestamptz;
  used integer;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if p_time_zone not in ('America/Los_Angeles', 'UTC')
     or p_daily_limit is null or p_daily_limit < 1 or p_daily_limit > 100000
     or p_model is null or length(p_model) > 80 then
    raise exception 'bad model limit' using errcode = 'P0001';
  end if;
  select last_try into last_seen from public.photo_rate where user_id = auth.uid();
  if last_seen is null or last_seen < now() - interval '2 minutes' then
    raise exception 'no recent photo try' using errcode = 'P0001';
  end if;

  insert into public.ai_model_usage (day, model, count)
  values ((now() at time zone p_time_zone)::date, p_model, 1)
  on conflict (day, model) do update set count = public.ai_model_usage.count + 1
    where public.ai_model_usage.count < p_daily_limit
  returning count into used;
  return used is not null; -- null: the model already reached its limit today
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

create or replace function public.keep_alive()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.photo_global);
$$;

revoke all on function public.photo_quota_left() from public, anon;
grant execute on function public.photo_quota_left() to authenticated;
revoke all on function public.use_ai_model(text, integer, text) from public, anon;
grant execute on function public.use_ai_model(text, integer, text) to authenticated;
revoke all on function public.use_photo_quota() from public, anon;
grant execute on function public.use_photo_quota() to authenticated;
revoke all on function public.keep_alive() from public;
grant execute on function public.keep_alive() to anon, authenticated;
