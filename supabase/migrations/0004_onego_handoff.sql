-- One-time handover of GST / TDS downloads from the 1Go desktop app into a workspace ("Get from 1Go").
-- Smart Auditing (signed in) creates a request with the SHA-256 of a random token; 1Go, holding the token from the
-- onego:// link, may read that one request and add files to it for 2 hours. 1Go never signs in and sees nothing else.
create table public.handoffs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id text not null,
  request jsonb not null,
  token_hash text not null,
  status text not null default 'pending' check (status in ('pending','working','done','failed','cancelled')),
  message text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '2 hours',
  updated_at timestamptz not null default now()
);
create table public.handoff_parts (
  id bigint generated always as identity primary key,
  handoff_id uuid not null references public.handoffs(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  kind text not null check (kind in ('GSTR1','GSTR2B','GSTR3B','TDS_CHALLANS','TDS_OTHER','NOTE')),
  period text,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index handoff_parts_h on public.handoff_parts(handoff_id);
alter table public.handoffs enable row level security;
alter table public.handoff_parts enable row level security;
create policy ho_select on public.handoffs for select to authenticated using (public.is_member(workspace_id));
create policy ho_update on public.handoffs for update to authenticated using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy hp_select on public.handoff_parts for select to authenticated using (exists (select 1 from public.handoffs h where h.id = handoff_id and public.is_member(h.workspace_id)));

create or replace function public.handoff_create(ws uuid, client text, req jsonb, thash text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare hid uuid;
begin
  if not public.is_member(ws) then raise exception 'Not a member of this workspace'; end if;
  if thash !~ '^[0-9a-f]{64}$' then raise exception 'Bad token'; end if;
  insert into public.handoffs(workspace_id, client_id, request, token_hash) values (ws, client, req, thash) returning id into hid;
  return hid;
end; $$;

create or replace function public.handoff_check(hid uuid, token text) returns public.handoffs
language plpgsql stable security definer set search_path = '' as $$
declare h public.handoffs;
begin
  select * into h from public.handoffs where id = hid;
  if h.id is null or h.token_hash <> encode(extensions.digest(token, 'sha256'), 'hex') then raise exception 'Unknown or invalid request'; end if;
  if h.expires_at < now() then raise exception 'This request has expired; start it again from Smart Auditing'; end if;
  if h.status not in ('pending','working') then raise exception 'This request is already %', h.status; end if;
  return h;
end; $$;

create or replace function public.handoff_fetch(hid uuid, token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare h public.handoffs;
begin
  h := public.handoff_check(hid, token);
  update public.handoffs set status = 'working', updated_at = now() where id = hid;
  return jsonb_build_object('id', h.id, 'request', h.request, 'expires_at', h.expires_at);
end; $$;

create or replace function public.handoff_put(hid uuid, token text, pname text, pkind text, pperiod text, pdata jsonb) returns bigint
language plpgsql security definer set search_path = '' as $$
declare h public.handoffs; pid bigint;
begin
  h := public.handoff_check(hid, token);
  if octet_length(pdata::text) > 20 * 1024 * 1024 then raise exception 'Part too large (over 20 MB)'; end if;
  if (select count(*) from public.handoff_parts where handoff_id = hid) >= 200 then raise exception 'Too many parts'; end if;
  insert into public.handoff_parts(handoff_id, name, kind, period, data) values (hid, pname, pkind, pperiod, pdata) returning id into pid;
  update public.handoffs set updated_at = now() where id = hid;
  return pid;
end; $$;

create or replace function public.handoff_finish(hid uuid, token text, pstatus text, pmessage text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare h public.handoffs;
begin
  h := public.handoff_check(hid, token);
  if pstatus not in ('done','failed') then raise exception 'Bad status'; end if;
  update public.handoffs set status = pstatus, message = left(pmessage, 500), updated_at = now() where id = hid;
  return true;
end; $$;

revoke execute on function public.handoff_create(uuid,text,jsonb,text), public.handoff_check(uuid,text), public.handoff_fetch(uuid,text), public.handoff_put(uuid,text,text,text,text,jsonb), public.handoff_finish(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.handoff_create(uuid,text,jsonb,text) to authenticated;
grant execute on function public.handoff_fetch(uuid,text), public.handoff_put(uuid,text,text,text,text,jsonb), public.handoff_finish(uuid,text,text,text) to anon, authenticated;
alter publication supabase_realtime add table public.handoffs;
