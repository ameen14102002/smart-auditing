# Smart Auditing

An internal audit workbench for Indian CA firms and in-house audit teams. It runs in the browser, keeps data and evidence in Supabase, and is deployed to GitHub Pages.

**Live app:** https://ameen14102002.github.io/smart-auditing/

## How the work flows

**Client master → what applies → roadmap → audit → evidence → findings → report**

**Audit types by area.** Finance & accounts (Finance & accounts; Cash & bank), Business cycles (Sales & receivables; Purchase & payables; Production & operations), Assets & inventory (Inventory & stores; Fixed assets), People (HR & payroll), Tax & compliance (Statutory compliance), Governance, IT & risk (Governance & related parties; IT audit) and Sector-specific (Lending / RBIA; Broker / DP). Each shows what it covers and its procedures (Audits → Audit types). Each client's **Audit plan** tab lists the audits that apply, why, how often, and the audits started.

**Audit programme in every audit.** Vouching and the GST reconciliations are mandatory; each audit type adds its own procedures; TDS vs books is optional. A procedure that does not apply can be marked N/A with a reason (not vouching or GST). The audit cannot be Reported until the programme is done. Procedures and their standard references:
- **Bank reconciliation (BRS)** (Cash & bank): bank statement vs bank book, matched by amount, cheque / ref and date; cheques not presented (stale over 3 months), deposits not credited, bank-only entries, items cleared in the next statement; the BRS in the standard format.
- **Physical cash verification** (Cash & bank): count by denomination, IOUs, cash book balance, certificate in the report.
- **Debtors / Creditors (CRS)** (Sales / Purchase): balances, FIFO ageing, statement-of-account reconciliation, balance confirmation letters (selected by materiality), MSME dues over 45 days.
- **Physical stock verification** (Inventory) and **fixed assets physical verification** (Fixed assets): key items plus a seeded random sample; shortages, excess, condition; assets not found / not in use / not tagged.
- **Statutory compliance (due dates)** (Statutory compliance; HR & payroll): GST, TDS / TCS, PF, ESI, advance tax, annual returns and company filings from the client master; TDS deposit dates filled from the challans.
- **Analytical review** (Finance & accounts): month-wise sales, purchases and GST with unusual months flagged for explanation.

**Monthly internal audit.** Vouching and GST & TDS compliance are audit topics of their own, mandatory every month. Each audit type lists its real audit procedures (the checklist) and the tools it uses. New audits default to last month.

**Roadmap: quarter, half-year or year.** Generate asks which period. Work is split by month, most important first: planning, opening balances, a statutory dues health-check and catch-up in the first month; vouching, GST & TDS, cash & bank and due dates every month; focus areas by risk score (high first and again each quarter, medium twice, low once, at most two a month); calendar work in its month (half-year confirmations, tax audit readiness, GSTR-9, company filings, year-end verification).

**Follow-up (SIA 390).** Each client's Action taken tab tracks open findings, days past the agreed date, high-risk items to escalate, repeat findings (the same issue raised before), and closure verified by risk (re-test, documentary proof or management confirmation). The Monthly report tab builds one report for management: audits of the month, procedures, findings, open earlier findings and compliance exceptions.

**Data tests** also include Benford's law (first digits) and bills split just under approval limits.

**Quality and follow-through.**
- **Risk and control matrix:** every checklist step shows the risk it addresses and whether it is preventive or detective; each is tested for design (effective / weak) and operation. RCM view, CSV, and Annexure G in the report.
- **Reviewer notes (SIA 350):** on any step, procedure or the whole audit, with replies; the reviewer cannot sign and the audit cannot be reported while a note is open.
- **Draft findings to management (SIA 360):** the Findings tab creates a 30-day link (online version); management opens it without an account, gives response, owner and target date for each finding, and the auditor puts the answers into the findings in one click (`mgmt_links`, migration 0009).
- **Reminders:** the Action taken tab lists actions due within a week or past due, with a ready email.
- **Home:** every client's last-month audits, procedures done, open and past-due findings, escalations, overdue statutory items and open review notes.

**More procedures.**
- **Payroll verification (HR & payroll):** salary register per month: shared bank account / PAN / UAN (possible ghost employees), missing KYC, PF at 12% of PF wages (₹15,000 ceiling), ESI at 0.75% of gross up to ₹21,000, net pay, pay after leaving, totals vs PF / ESI / TDS challans and the bank transfer, joiners, leavers and pay changes over 20%.
- **Form 26AS vs books (GST & TDS, optional):** the TRACES text file (or CSV / Excel) against TDS receivable in the books, deductor by deductor.
- **GST filing dates:** paste the lines of the portal's Track Return Status / View Filed Returns into the due-date tracker.
- **BRS month by month:** keep each month's reconciliation.

**Import the books once.** The Programme tab takes one Tally Day Book: it feeds vouching, GST & TDS, the bank ledgers (BRS), the debtors and creditors and the analytical review. Annexure F of the report holds the programme and each procedure's result.

1. **Client master.** Enter the entity type, group position, nature of business, regulator, cost-records sector and last year's figures. As you type, the app shows which audits, laws and returns apply, each with its reason and legal basis:
   - **Company law:** internal audit (s.138), CARO 2020, internal financial controls reporting, secretarial audit, Audit Committee, vigil mechanism, CSR, Ind AS, cost records and cost audit, audit trail.
   - **Other entities:** LLP audit, and audit under trust or society law.
   - **Income tax:** tax audit (Income-tax Act 2025 s.63) and transfer pricing.
   - **GST:** returns, GSTR-9 and GSTR-9C.
   - **Labour:** EPF and ESI.
   - **Regulators:** RBI, SEBI and IRDAI rules.
2. **Risk register.** Built from what applies, scored as inherent risk × control risk. The score sets how often each process is audited: every quarter, every half-year or once a year.
3. **Roadmap.** A quarterly year plan (Indian FY, Apr–Mar):
   - **Two ways to set it up:** generate it from the client master, or upload your own plan as Excel or CSV with columns Area, Activity, Quarter, Owner and Checks.
   - **Coverage check:** lists every applicable requirement that no roadmap item covers.
   - **Ticking off:** an item counts as done when its audit is reported or closed.
4. **Audit workspace.** A stage stepper (Planned → Fieldwork → Review → Reported → Closed) and these tabs:
   - **Checklist:** for each check, mark Satisfactory, Exception or N/A, write working notes and attach evidence.
   - **Mandatory procedures card:** vouching and the four GST reconciliations are required in every audit (TDS vs books is optional, only where the client deducts TDS). The audit cannot be moved to Reported or Closed until both are done.
   - **Data tests:** upload a ledger as Excel or CSV. It is tested for duplicates, round sums, Sunday entries, cash above ₹10,000 and the top 1% by value, and the ledger is kept as evidence.
   - **Vouching:** see below (SIA 320 evidence, SIA 5 sampling).
   - **GST & TDS:** see below (SIA 150 compliance with laws).
   - **Evidence:** drag-and-drop files. Each file is fingerprinted with SHA-256, and spreadsheets get a summary of their sheets, rows and headers.
   - **Findings:** condition, criteria, cause, effect, rating, action plan and linked evidence.
   - **Sign-off:** preparer and reviewer (SIA 350).
   - **Report:** see below.
5. **Report.** Built in the SIA 370 structure:
   - Cover details and executive summary.
   - Scope, with the regulatory context for that process.
   - Approach.
   - Results of testing, with evidence references (E1, E2…).
   - Detailed findings.
   - Status of previous findings.
   - **Annexure A:** evidence index with SHA-256 fingerprints.
   - **Annexure B:** spreadsheet evidence.
   - **Annexure C:** data tests.
   - **Annexure D:** vouching (says "Not completed" if it is not done).
   - **Annexure E:** GST and TDS reconciliations, with the auditor's conclusion on each.

   Download the report as an HTML file (opens in Word), or as a ZIP with every evidence file and an index CSV.

**Vouching (an audit procedure; same method for every client):** done in the audit's Vouching tab; the data is shared by the client's audits of the same financial year.
- **Import:** a Tally Day Book XML (UTF-16 or UTF-8), or a voucher or GST register as CSV/Excel from any software.
- **Classify:** each voucher becomes a purchase, sales, purchase return (debit note), sales return (credit note), payment, receipt or journal.
- **Analyse each type:** value bands; local (CGST + SGST), interstate (IGST) and non-GST; parties without GSTIN; top parties; monthly pattern.
- **Standard sampling method:**
  - **Key items:** every voucher at or above the tolerable error (default 5% of value) is vouched in full.
  - **Monetary unit sample of the rest:** size = remaining value × confidence factor (80% 1.61 · 90% 2.31 · 95% 3.0) ÷ tolerable error.
  - **Risk picks:** round sums, Sundays, period-end cut-off, interstate, non-GST and unregistered parties.
  - **Other methods:** random, systematic and stratified are also available.
  - **Repeatable:** the same data and seed always give the same sample.
- **Worksheet:** each sampled voucher has a checklist for its type, a result, a misstatement amount, a note and evidence. Errors are projected to the population and compared with the tolerable error; exceptions can be raised as findings, and the results appear in the audit report as Annexure D.

**GST & TDS reconciliations (an audit procedure):** done in the audit's GST & TDS tab.
- **Books:** Tally Day Book XML (sales, purchases, credit / debit notes and TDS ledgers), or CSV / Excel registers.
- **Portal files:** GSTR-1 JSON or ZIP, GSTR-2B Excel or JSON, GSTR-3B JSON (or the summary template), TDS challan list. Or **Get from 1Go** (team version): 1Go downloads them from the portals on your computer and sends them here; the matching is done only in Smart Auditing.
- **The five reconciliations:** GSTR-1 vs sales books, GSTR-2B vs purchase books (invoice by invoice: only in books, only in the return, value differs, GSTIN differs, different month, ITC not available), GSTR-3B vs GSTR-1, GSTR-3B vs GSTR-2B, and TDS vs books (due dates, carried-forward shortfall, interest estimate, challans not in the books).
- **Each one:** month-wise table, CSV, "Raise finding" (linked to the audit), and the auditor's conclusion and notes.
- **Get from 1Go:** a one-time request (token kept only as its SHA-256, valid 2 hours) and an `onego://smart-auditing` link; needs 1Go 1.66.0 or later.

**Team workspaces:** you sign in with email and password, create a workspace, and colleagues join with its join code. Postgres row-level security and Storage policies make each workspace's records and files visible only to its members.

Thresholds are as of November 2026. The applicability results are a planning guide, not legal advice.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | Page shell |
| `styles.css` | Design system and layout |
| `logic.js` | Data, storage, sign-in, applicability rules, roadmap, data tests, evidence storage |
| `ui.js` | Views, routing (URL hash), events, report builder |
| `vouching.js` | Voucher import (Tally XML, CSV, Excel), analysis, sampling, vouching worksheet |
| `supabase/migrations/` | Database schema, access rules, evidence bucket and policies |
| `.github/workflows/pages.yml` | Deploys the site to GitHub Pages on every push to `main` |

Libraries loaded from CDNs: `@supabase/supabase-js` 2.45.4 (jsDelivr). SheetJS 0.18.5 (Excel reading) and JSZip 3.10.1 (evidence ZIP) are loaded from cdnjs only when needed.

## Configuration

The Supabase URL and publishable key are set in the `SB` constant in `logic.js`. The publishable key is meant to be public; access is controlled by the policies in `supabase/migrations/`.

The Supabase dashboard needs these settings under **Authentication → URL Configuration**:

- **Site URL:** `https://ameen14102002.github.io/smart-auditing/`
- **Redirect URLs:** add the same address.

## Run locally

Serve the folder with any static server (for example `python3 -m http.server`) and open `index.html`. Without Supabase available, the app runs in preview mode, where data stays in the browser tab.
