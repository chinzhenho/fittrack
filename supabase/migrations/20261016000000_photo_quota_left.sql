-- Failed AI photos no longer use up a snap.
-- The Worker now asks photo_quota_left() before calling the AI (read-only, counts
-- nothing) and only calls use_photo_quota() after the AI has answered. If every AI
-- model is busy, the photo is not counted, so "Try again" is free.
-- use_photo_quota() still enforces the 20-a-day limit when it counts.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

create or replace function public.photo_quota_left()
returns integer
language plpgsql
stable
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
  select count into used
  from public.photo_usage
  where user_id = auth.uid()
    and day = (now() at time zone 'Asia/Kuala_Lumpur')::date;
  return greatest(daily_limit - coalesce(used, 0), 0);
end;
$$;

revoke all on function public.photo_quota_left() from public, anon;
grant execute on function public.photo_quota_left() to authenticated;
