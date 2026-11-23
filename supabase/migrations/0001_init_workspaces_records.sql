-- Smart Auditing: team workspaces, members and audit records, with row-level security.
-- Applied to Supabase project "smart-auditing" (ap-south-1) on 2026-11-23.

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  join_code text not null unique default substr(replace(gen_random_uuid()::text,'-',''),1,10),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  email text,
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index members_user_idx on public.members(user_id);
create table public.records (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  col text not null check (col in ('clients','audits','observations')),
  id text not null check (char_length(id) between 1 and 80),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  primary key (workspace_id, col, id)
);

create or replace function public.is_member(ws uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.members m where m.workspace_id = ws and m.user_id = (select auth.uid()));
$$;
create or replace function public.is_owner(ws uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.workspaces w where w.id = ws and w.owner = (select auth.uid()));
$$;

alter table public.workspaces enable row level security;
alter table public.members enable row level security;
alter table public.records enable row level security;

create policy ws_select on public.workspaces for select to authenticated using (public.is_member(id));
create policy ws_update on public.workspaces for update to authenticated using (owner = (select auth.uid())) with check (owner = (select auth.uid()));
create policy ws_delete on public.workspaces for delete to authenticated using (owner = (select auth.uid()));

create policy mem_select on public.members for select to authenticated using (public.is_member(workspace_id));
create policy mem_delete on public.members for delete to authenticated using (user_id = (select auth.uid()) or public.is_owner(workspace_id));

create policy rec_select on public.records for select to authenticated using (public.is_member(workspace_id));
create policy rec_insert on public.records for insert to authenticated with check (public.is_member(workspace_id));
create policy rec_update on public.records for update to authenticated using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy rec_delete on public.records for delete to authenticated using (public.is_member(workspace_id));

create or replace function public.create_workspace(ws_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare wid uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  insert into public.workspaces(name, owner) values (trim(ws_name), auth.uid()) returning id into wid;
  insert into public.members(workspace_id, user_id, role, email) values (wid, auth.uid(), 'owner', auth.jwt()->>'email');
  return wid;
end; $$;

create or replace function public.join_workspace(code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare wid uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select id into wid from public.workspaces where join_code = trim(code);
  if wid is null then raise exception 'No workspace has that join code'; end if;
  insert into public.members(workspace_id, user_id, role, email) values (wid, auth.uid(), 'member', auth.jwt()->>'email')
  on conflict (workspace_id, user_id) do nothing;
  return wid;
end; $$;

create or replace function public.new_join_code(ws uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare c text := substr(replace(gen_random_uuid()::text,'-',''),1,10);
begin
  if not public.is_owner(ws) then raise exception 'Only the owner can change the join code'; end if;
  update public.workspaces set join_code = c where id = ws;
  return c;
end; $$;

revoke execute on function public.is_member(uuid), public.is_owner(uuid), public.create_workspace(text), public.join_workspace(text), public.new_join_code(uuid) from public, anon;
grant execute on function public.is_member(uuid), public.is_owner(uuid), public.create_workspace(text), public.join_workspace(text), public.new_join_code(uuid) to authenticated;

alter publication supabase_realtime add table public.records;
