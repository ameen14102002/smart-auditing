# gst-fetch — automated GST return downloads (no 1Go)

A small Node service that drives the **GST portal with Playwright** and downloads
GSTR-1 / GSTR-2B / GSTR-3B for the months you pick, then uploads the files to
**Supabase Storage**. The Smart Auditing app reads them from storage and matches
them in-app — for any invoice volume (1,000+ invoices: the whole file is read).

This replaces the old "Get from 1Go" handover. No 1Go, no CAPTCHA panel, no manual
file drop for GST returns.

## How it works

1. **Manifest-driven** — `manifest.js` holds the portal URLs, the return list, the
   file-naming and the Supabase Storage layout. Edit the manifest, not the code.
2. **One-time sign-in** — the driver uses a persistent browser profile
   (`.gst-profile`). The first run opens a browser so you can sign in to the GST
   portal (OTP to your registered mobile). The session is saved, so **every later
   run is fully headless and automatic**.
3. **Automatic download** — for each return × month, the driver requests the
   portal's download URL with the saved session, saves the file, and uploads it to
   Supabase Storage (`gst-returns/<client>/<return>/<month>.<ext>`).
4. **App reads it** — the app lists that bucket path, downloads each file, parses
   it with the same engine the manual drop uses, and reconciles.

TDS challans: TRACES has no clean deep-link, so the service opens TRACES (signed
in via the same profile) and you grab the challan list — that one file you drop
into the TDS box. GST returns are fully automated.

## Supabase setup (one time)

Create a storage bucket **`gst-returns`** in the Smart Auditing Supabase project
(same project the app uses). Allow read for signed-in users (the same policy the
app's `evidence` bucket uses). The service uploads with the publishable key by
default; set `SUPABASE_KEY` to a service key if you make the bucket private.

## Run it

```bash
cd gst-fetch
npm install
npx playwright install chromium        # download the browser (first time only)
npm start                              # listens on :8790
```

Open **http://localhost:8790** for a standalone trigger + live progress, or let
the app trigger it (see below).

Environment (optional):
- `PORT` — default `8790`
- `SUPABASE_URL` / `SUPABASE_KEY` — defaults to the app's Supabase project. Use a
  service key if the `gst-returns` bucket is private.
- `HEADLESS=0` — run headed (used for the one-time sign-in; auto-headless after).

## The app triggers it

The app's **Fetch from the portals** panel calls this service when it is reachable
(`GET /health`). It posts the selected returns/months, polls `/status/:id`, shows
live progress, and **auto-pulls** the downloaded files from Supabase Storage into
the reconciliation. When the service is not reachable (e.g. the deployed GitHub
Pages copy without a local/remote service), the panel falls back to opening the
portal URLs for a manual download.

For the app to reach the service, run the app **locally** on the same machine
(e.g. `python3 -m http.server 8765`) so both are on `http://localhost` — an
`https` page cannot call a plain `http` service.

## Layout

```
gst-fetch/
  manifest.js   portal + returns + storage layout (the automation manifest)
  fetch.js      Playwright driver: sign in once, download, upload to storage
  server.js     Express API (/health, /manifest, /fetch, /status/:id) + web UI
  package.json
```
