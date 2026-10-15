-- Removes the daily AI photo limit per account (was 20).
-- Photos are still counted per day (useful to see usage), but the limit is set so
-- high that no one reaches it. Both functions keep their names, so the Worker needs
-- no change.
-- Note: all accounts share the free AI quotas (about 1,070 photos a day site-wide),
-- so one very heavy user can use them up for everyone that day.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

create or replace function public.use_photo_quota()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  daily_limit constant integer := 1000000; -- no practical limit
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

create or replace function public.photo_quota_left()
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  daily_limit constant integer := 1000000; -- no practical limit
  used integer;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  select count into used
  from public.photo_usage
  where user_id = auth.uid()
    and day = (now() at time zone 'Asia/Kuala_Lumpur')::date;
  return greatest(daily_limit - coalesce(used, 0), 0);
end;
$$;

revoke all on function public.use_photo_quota() from public, anon;
grant execute on function public.use_photo_quota() to authenticated;
revoke all on function public.photo_quota_left() from public, anon;
grant execute on function public.photo_quota_left() to authenticated;
