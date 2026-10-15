-- Raises the AI photo limit from 8 to 20 photos per account per day (Malaysia time).
-- Same function as 20261013000000_photo_quota.sql with only the limit changed; usage
-- already counted today is kept.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

create or replace function public.use_photo_quota()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  daily_limit constant integer := 20;
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
