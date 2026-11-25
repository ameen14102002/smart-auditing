-- Get from 1Go: progress while 1Go works, and a request that stays alive while it is working (25 Nov 2026).
-- Owner: "the get from 1go is not working properly, it is stuck by downloading the json".
-- 1. A request expired 2 hours after it was made. GSTR-1 JSON is prepared by the GST portal in the background (up to 30 minutes
--    a month), so a run of several months outlived its request: 1Go could not send the files nor say it had finished, and
--    Smart Auditing waited on "working". Now every sign of life from 1Go (a progress line, a file) keeps the request alive for
--    another hour, up to 12 hours after it was made.
-- 2. 1Go writes each progress line to the request (handoff_note), so Smart Auditing shows what is happening, and sends each file
--    as soon as it is downloaded (handoff_put), so Smart Auditing takes in the months already there.

create or replace function public.handoff_alive(hid uuid) returns void
language sql security definer set search_path = '' as $$
  update public.handoffs set updated_at = now(),
    expires_at = least(created_at + interval '12 hours', greatest(expires_at, now() + interval '1 hour'))
  where id = hid and status in ('pending','working');
$$;
revoke execute on function public.handoff_alive(uuid) from public, anon, authenticated;

create or replace function public.handoff_note(hid uuid, token text, ptext text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare h public.handoffs;
begin
  h := public.handoff_check(hid, token);
  update public.handoffs set message = left(coalesce(ptext,''), 500) where id = hid;
  perform public.handoff_alive(hid);
  return true;
end; $$;

create or replace function public.handoff_put(hid uuid, token text, pname text, pkind text, pperiod text, pdata jsonb) returns bigint
language plpgsql security definer set search_path = '' as $$
declare h public.handoffs; pid bigint;
begin
  h := public.handoff_check(hid, token);
  if octet_length(pdata::text) > 20 * 1024 * 1024 then raise exception 'Part too large (over 20 MB)'; end if;
  if (select count(*) from public.handoff_parts where handoff_id = hid) >= 200 then raise exception 'Too many parts'; end if;
  insert into public.handoff_parts(handoff_id, name, kind, period, data) values (hid, pname, pkind, pperiod, pdata) returning id into pid;
  perform public.handoff_alive(hid);
  return pid;
end; $$;

revoke execute on function public.handoff_note(uuid,text,text) from public, anon, authenticated;
grant execute on function public.handoff_note(uuid,text,text) to anon, authenticated;
grant execute on function public.handoff_put(uuid,text,text,text,text,jsonb) to anon, authenticated;
