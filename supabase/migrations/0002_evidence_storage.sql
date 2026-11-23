-- Smart Auditing: evidence files. Private storage bucket; each workspace can reach only its own folder.
-- Applied to Supabase project "smart-auditing" on 2026-11-23.

alter table public.records drop constraint records_col_check;
alter table public.records add constraint records_col_check check (col in ('clients','audits','observations','evidence'));

insert into storage.buckets (id, name, public, file_size_limit)
values ('evidence', 'evidence', false, 26214400)
on conflict (id) do nothing;

-- First path segment is the workspace id: <workspace_id>/<audit_id>/<evidence_id>/<file name>
create or replace function public.path_workspace(p text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  return (split_part(p, '/', 1))::uuid;
exception when others then
  return null;
end; $$;

create policy evidence_select on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and public.is_member(public.path_workspace(name)));
create policy evidence_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and public.is_member(public.path_workspace(name)));
create policy evidence_delete on storage.objects for delete to authenticated
  using (bucket_id = 'evidence' and public.is_member(public.path_workspace(name)));
