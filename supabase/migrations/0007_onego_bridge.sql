-- 1Go bridge (edge function onego-bridge): finds an existing Smart Auditing user by email. Service role only.
create or replace function public.onego_user_id(em text) returns uuid
language sql stable security definer set search_path = '' as $$
  select id from auth.users where lower(email) = lower(em) limit 1;
$$;
revoke execute on function public.onego_user_id(text) from public, anon, authenticated;
