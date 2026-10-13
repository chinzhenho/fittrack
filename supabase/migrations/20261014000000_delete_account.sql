-- Lets a signed-in user permanently delete their own account. Deleting the auth user
-- also deletes their rows in public.user_state and public.photo_usage (on delete
-- cascade). The function only ever acts on auth.uid(), so nobody can delete another
-- person's account, and anonymous callers are refused.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  delete from public.user_state where user_id = uid;
  delete from public.photo_usage where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
