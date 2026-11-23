-- Smart Auditing: vouching records (population summary, sampling plan and worksheet per client per FY).
-- Applied to Supabase project "smart-auditing" on 2026-11-23.
alter table public.records drop constraint records_col_check;
alter table public.records add constraint records_col_check check (col in ('clients','audits','observations','evidence','vouching'));
