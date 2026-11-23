# Smart Auditing

An internal audit workbench for Indian CA firms and in-house audit teams. It runs in the browser, keeps data and evidence in Supabase, and is deployed to GitHub Pages.

**Live app:** https://ameen14102002.github.io/smart-auditing/

## How the work flows

**Client master → what applies → roadmap → audit → evidence → findings → report**

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
   - **Data tests:** upload a ledger as Excel or CSV. It is tested for duplicates, round sums, Sunday entries, cash above ₹10,000 and the top 1% by value, and the ledger is kept as evidence.
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

   Download the report as an HTML file (opens in Word), or as a ZIP with every evidence file and an index CSV.

**Vouching (same method for every client):**
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
