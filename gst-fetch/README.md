# Smart Auditing portal helper

Takes a client's **GSTR-1, GSTR-2B, GSTR-3B** and **TDS challans** from the GST portal, the Income Tax portal and TRACES, on
this computer, and hands them to Smart Auditing. It does the same steps 1Go does (its tested portal script, `page.js`, is built
from 1Go's), but needs no 1Go.

## Set up once (Windows)

1. Install **Node.js** (LTS) from https://nodejs.org.
2. In Smart Auditing, open a client's **GST & TDS** page; in **Fetch from the portals** click *download the portal helper*.
   Unzip it anywhere (for example `Documents\Smart Auditing portal helper`).
3. Double-click **Start portal helper.cmd**. The first time it installs itself (about a minute). Keep its window open.

The helper uses Microsoft Edge (or Chrome) already on the computer. If neither can be used it asks for Playwright's own browser:
run `npx playwright install chromium` once in the helper folder.

If the browser asks whether Smart Auditing may reach apps on this computer, choose **Allow**.

## Each time

1. Start the helper (double-click **Start portal helper.cmd**).
2. In Smart Auditing, tick the returns and months (and TDS challans, from TRACES or the Income Tax portal with the TAN login) and
   click **Fetch from the portals**.
3. A portal window opens. **Sign in yourself**: username, password, CAPTCHA, OTP. The helper never asks for, keeps or sends a
   password.
4. The helper takes each return and month, logs out at the end and closes the window. Smart Auditing reads every file in.
   For TDS: open the challan list (TRACES: Statements / Payments › Challan Status; Income Tax portal: Payment History is opened
   for you), go through its pages, then close the window.

## What it takes, by size

| Return  | Small and medium                         | Large                                                                     |
|---------|------------------------------------------|---------------------------------------------------------------------------|
| GSTR-1  | JSON (ZIP) from Prepare Offline › Download | the same JSON; the portal may take up to 20 minutes to prepare it: the helper waits up to 30, and asks once more at the end of the run |
| GSTR-2B | Excel from the GSTR-2B page              | over 1,000 documents the portal turns off its Excel: the helper takes the **JSON** from the download page, every part (File 1, File 2 …) |
| GSTR-3B | the filed return's figures, as the portal's page shows them | the same |
| TDS     | the challan list, page by page          | the same                                                                  |

Smart Auditing adds the parts of one month together, so a split return is read in full.

Files are also kept on this computer: `Documents\Smart Auditing portal downloads\<client>\FY <year>\`, named like
`GSTR-2B Sep-2026 33AAACA1111A1ZZ part 1.json`.

## What it never does

Files, pays, submits or changes nothing on any portal. Keeps no password and no session (each run is a fresh browser session).
Calls no portal address itself and changes no request header: the portal sees an ordinary browser. Answers only Smart Auditing's
own site, and only on this computer (`127.0.0.1:8790`).

## For developers

- `server.js`: the local service (`/health`, `/fetch`, `/status/:id`, `/file/:id/:n`, `/challans/:id`, `/stop/:id`).
- `runner.js`: the run (queue, time limits, download naming, the big-GSTR-2B switch to JSON, re-login, logout).
- `page.js`: generated from 1Go's `src/portalpreload.js` by `npm run page` (expects the 1Go repository next to this one).
  Rebuild it whenever 1Go's portal steps change.
- Dry runs against a stand-in portal: `SA_HEADLESS=1 node test/mock-run.mjs` and `SA_HEADLESS=1 node test/mock-tds.mjs`.
