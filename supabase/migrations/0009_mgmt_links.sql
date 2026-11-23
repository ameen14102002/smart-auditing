-- Draft findings shared with the client's management for responses (SIA 360). The auditor creates a link holding the SHA-256 of a
-- random token; whoever has the link sees only that draft and can submit responses until it expires (30 days). No account needed.
create table public.mgmt_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  audit_id text not null, client_id text not null, payload jsonb not null, token_hash text not null,
  responses jsonb, submitted_at timestamptz, submitted_by text,
  created_by uuid default auth.uid(), created_at timestamptz not null default now(), expires_at timestamptz not null default now() + interval '30 days');
alter table public.mgmt_links enable row level security;
create policy ml_select on public.mgmt_links for select to authenticated using (public.is_member(workspace_id));
create policy ml_delete on public.mgmt_links for delete to authenticated using (public.is_member(workspace_id));
create or replace function public.mgmt_create(ws uuid, audit text, client text, payload jsonb, thash text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare lid uuid;
begin
  if not public.is_member(ws) then raise exception 'Not a member of this workspace'; end if;
  if thash !~ '^[0-9a-f]{64}$' then raise exception 'Bad token'; end if;
  if octet_length(payload::text) > 2 * 1024 * 1024 then raise exception 'Draft too large'; end if;
  insert into public.mgmt_links(workspace_id, audit_id, client_id, payload, token_hash) values (ws, audit, client, payload, thash) returning id into lid;
  return lid;
end; $$;
create or replace function public.mgmt_fetch(lid uuid, token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare l public.mgmt_links;
begin
  select * into l from public.mgmt_links where id = lid;
  if l.id is null or l.token_hash <> encode(extensions.digest(token, 'sha256'), 'hex') then raise exception 'This link is not valid'; end if;
  if l.expires_at < now() then raise exception 'This link has expired; ask the auditor for a new one'; end if;
  return jsonb_build_object('payload', l.payload, 'responses', l.responses, 'submitted_at', l.submitted_at, 'expires_at', l.expires_at);
end; $$;
create or replace function public.mgmt_respond(lid uuid, token text, resp jsonb, who text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare l public.mgmt_links;
begin
  select * into l from public.mgmt_links where id = lid;
  if l.id is null or l.token_hash <> encode(extensions.digest(token, 'sha256'), 'hex') then raise exception 'This link is not valid'; end if;
  if l.expires_at < now() then raise exception 'This link has expired; ask the auditor for a new one'; end if;
  if octet_length(resp::text) > 512 * 1024 then raise exception 'Responses too long'; end if;
  update public.mgmt_links set responses = resp, submitted_at = now(), submitted_by = left(who, 120) where id = lid;
  return true;
end; $$;
revoke execute on function public.mgmt_create(uuid,text,text,jsonb,text), public.mgmt_fetch(uuid,text), public.mgmt_respond(uuid,text,jsonb,text) from public, anon, authenticated;
grant execute on function public.mgmt_create(uuid,text,text,jsonb,text) to authenticated;
grant execute on function public.mgmt_fetch(uuid,text), public.mgmt_respond(uuid,text,jsonb,text) to anon, authenticated;
