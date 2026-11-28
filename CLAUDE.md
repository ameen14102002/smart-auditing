# Smart Auditing: working rules

Smart Auditing is the **branch app** of **1Go** (the home base). The two are linked:

- 1Go repository: `ameen14102002/company-software-suite` (Electron Windows app; Supabase project "1Go", `panlovvikswjxjkxzjcw`).
- This repository: `ameen14102002/smart-auditing` (web app on GitHub Pages; Supabase project "smart-auditing", `mkwwrkvsjafzxvlbfwla`).

**Owner's rule (23 Nov 2026):** a change in one app that touches the link between them must be made in **both** repositories in the
same piece of work. If you are working here and the change needs 1Go (its Smart Auditing tile, `app/smartaudit.js`, `src/main.js`
`saCall` / `onego:sa-bridge`, `src/auth.js`, the 1Go Supabase `my_access` / `app_users.audit`), attach `company-software-suite`
and change it too, then release 1Go (version bump; the owner publishes the release).

The links between the two apps:
- **GST and TDS data no longer come from 1Go** (owner, 28 Nov 2026: "i dont want this app to depend on the 1go"). Smart Auditing
  takes them itself with the **portal helper** in `gst-fetch/` (runs on the person's computer, 127.0.0.1:8790; packed as
  `portal-helper.zip` by the Pages workflow). Its portal steps, `gst-fetch/page.js`, are generated from 1Go's
  `src/portalpreload.js` (`npm run page` in gst-fetch): when 1Go's portal steps change, rebuild page.js here too. The person signs
  in on the portal themselves; no password is asked for or kept; GSTR-2B over 1000 documents is taken as JSON (all parts).
  The old handoff tables and functions (migrations 0004, 0006, 0010) are no longer used by the app.
- **One sign-in and one client master**: edge function `supabase/functions/onego-bridge` (verify_jwt off; it checks the 1Go
  sign-in and `my_access`, including `audit`, on 1Go's server). Deploy it after any change.
- **Access**: only the 1Go owner and users the owner switched Smart Auditing on for (1Go › Users) see the tile or can use the bridge.

Ledger scrutiny (28 Nov 2026): audit type `ls` and procedure `ls` (ledger-engine.js pure engine, ledger.js screen and hooks);
the vouchers sit in their own collection `lsdata`; tests run up to the audit's ageing date (stAsOf). Law references follow the
Income-tax Act, 2025 from 1 Apr 2026 (TDS s.393; rates and limits unchanged), with the old 1961 sections named alongside.
Opening balances (28 Nov 2026): Sales vs receipts takes Tally ledger masters XML (opening bills / advances, BILLALLOCATIONS with
OPENINGBALANCE; Tally writes debits negative) as `settle.O`; settle-engine `openingPostings` adds them as entries on their bill dates.
Client logos (28 Nov 2026): `clogo.js`. Paste/drop an image on a client's page or master form; the app removes a plain background,
crops, drops stray bits, sizes it and puts it on a white (or, for a light logo, dark) tile, and saves one finished version on the
client record (`c.logo`: `img` transparent PNG for re-editing, `xl` the finished tile shown everywhere). `clogo(c,h)` draws it in the
app; `buildReport` puts the same tile on the Excel cover and every sheet's title bar (xlsxsa.js `sh.images`).
