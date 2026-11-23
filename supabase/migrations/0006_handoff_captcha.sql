-- The portal CAPTCHA of a "Get from 1Go" request is shown and typed in Smart Auditing (owner, 23 Nov 2026:
-- "if I process the download from the Smart Auditing app, the CAPTCHA should also come to that app only").
-- 1Go (token holder) puts the CAPTCHA picture, or the Income Tax portal's secure access message, on its own request;
-- a signed-in member of the workspace types the answer; 1Go takes it once. Passwords never pass through here.
alter table public.handoffs add column if not exists captcha jsonb, add column if not exists captcha_answer text;

create or replace function public.handoff_captcha(hid uuid, token text, pkind text, pimg text, ptext text, pportal text, pretry boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare h public.handoffs;
begin
  h := public.handoff_check(hid, token);
  if pkind not in ('captcha','secure') then raise exception 'Bad kind'; end if;
  if pkind = 'captcha' and (pimg is null or pimg !~ '^data:image/(png|jpe?g|gif|webp|bmp);base64,[A-Za-z0-9+/=]+$' or length(pimg) > 300000) then raise exception 'Bad picture'; end if;
  update public.handoffs set captcha = jsonb_build_object('kind', pkind, 'img', case when pkind = 'captcha' then pimg else null end,
      'text', left(coalesce(ptext, ''), 200), 'portal', case when pportal = 'ittan' then 'ittan' else 'gst' end, 'retry', coalesce(pretry, false),
      'at', now(), 'n', coalesce((h.captcha->>'n')::int, 0) + 1),
    captcha_answer = null, updated_at = now() where id = hid;
  return true;
end; $$;

create or replace function public.handoff_captcha_take(hid uuid, token text) returns text
language plpgsql security definer set search_path = '' as $$
declare h public.handoffs;
begin
  h := public.handoff_check(hid, token);
  if h.captcha_answer is null then return null; end if;
  update public.handoffs set captcha = null, captcha_answer = null, updated_at = now() where id = hid;
  return h.captcha_answer;
end; $$;

create or replace function public.handoff_captcha_answer(hid uuid, ans text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare h public.handoffs;
begin
  select * into h from public.handoffs where id = hid;
  if h.id is null or not public.is_member(h.workspace_id) then raise exception 'Not allowed'; end if;
  if h.status <> 'working' or h.expires_at < now() then raise exception 'This request is no longer running'; end if;
  if h.captcha is null then raise exception '1Go is not asking for a CAPTCHA now'; end if;
  ans := btrim(coalesce(ans, ''));
  if (h.captcha->>'kind') = 'secure' then ans := 'YES';
  elsif ans !~ '^[A-Za-z0-9]{3,12}$' then raise exception 'Type the characters shown in the picture'; end if;
  update public.handoffs set captcha_answer = ans, updated_at = now() where id = hid;
  return true;
end; $$;

revoke execute on function public.handoff_captcha(uuid,text,text,text,text,text,boolean), public.handoff_captcha_take(uuid,text), public.handoff_captcha_answer(uuid,text) from public, anon, authenticated;
grant execute on function public.handoff_captcha(uuid,text,text,text,text,text,boolean), public.handoff_captcha_take(uuid,text) to anon, authenticated;
grant execute on function public.handoff_captcha_answer(uuid,text) to authenticated;
