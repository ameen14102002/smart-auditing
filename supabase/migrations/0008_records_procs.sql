-- Audit procedures (BRS, debtors / creditors, cash, stock, fixed assets, compliance, analytical review), one record per client and FY.
alter table public.records drop constraint records_col_check;
alter table public.records add constraint records_col_check check (col = any (array['clients','audits','observations','evidence','vouching','recons','procs']));
