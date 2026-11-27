/* Smart Auditing — gst-fetch Playwright driver.
   Reads the manifest, signs in to the GST portal ONCE (persistent browser profile
   remembers the OTP session), then automatically downloads each selected return
   for each month and uploads it to Supabase Storage. The app reads those files
   from storage and matches them — no 1Go, no manual download, no CAPTCHA panel.

   One-time setup: run with HEADLESS=0 (default on first run) so a browser opens;
   sign in to the GST portal (OTP to your registered mobile). The profile saves the
   session, so all later runs are headless and fully automatic. */
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import manifest from './manifest.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mkwwrkvsjafzxvlbfwla.supabase.co';
// anon key works for a public storage bucket; set SUPABASE_KEY to a service key if the bucket is private
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_VLkwQvLmUKFenUfC56VDxw_tmr49Adq';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const fmt = (tpl, v) => tpl.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));
const storagePath = (client, ret, month, ext) =>
  fmt(manifest.storage.pathTemplate, { client: manifest.sanitize(client), ret, month, ext });
const fileName = (client, ret, month, ext) =>
  fmt(manifest.fileNameTemplate, { client: manifest.sanitize(client), ret, month, ext });
const downloadUrl = (gstin, retType, period) =>
  manifest.downloadUrlTemplate
    .replace('{gstin}', encodeURIComponent(gstin))
    .replace('{period}', period)
    .replace('{retType}', retType);

// best-effort sign-in probe: a signed-out portal answers with a login/OTP page,
// a signed-in one with the dashboard. (Tune markers to the portal if it changes.)
async function isSignedIn(ctx) {
  try {
    const r = await ctx.request.get(manifest.portal.base, { timeout: 30000, maxRedirects: 10 });
    const url = (r.url() || '').toLowerCase();
    const body = (r.body() || '').toString().slice(0, 4000).toLowerCase();
    if (/\/(login|signin|otp|auth)\b/.test(url)) return false;
    if (/enter\s*(otp|captcha)|verify\s*(otp|mobile)|sign\s*in|log\s*in/.test(body)) return false;
    return true;
  } catch {
    return false;
  }
}

async function ensureSignedIn(ctx, job) {
  if (await isSignedIn(ctx)) return;
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto(manifest.portal.signinUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
  job.progress.push({
    step: 'signin',
    message: 'Open the GST portal and sign in (OTP to your registered mobile). Automation continues automatically once you are signed in.',
  });
  const deadline = Date.now() + 10 * 60000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(4000);
    if (await isSignedIn(ctx)) {
      job.progress.push({ step: 'signin', message: 'Signed in. Session saved — future runs are fully automatic.' });
      return;
    }
  }
  throw new Error('GST sign-in was not completed within 10 minutes.');
}

// guess the file extension from the response content-type, else the return's first ext
function extFor(ret, contentType) {
  const ct = (contentType || '').toLowerCase();
  if (/zip/.test(ct)) return 'zip';
  if (/json/.test(ct)) return 'json';
  if (/csv/.test(ct)) return 'csv';
  if (/(spreadsheet|excel|ms-excel|xlsx|xls)/.test(ct)) return 'xlsx';
  return ret.exts[0];
}

export async function runFetch(job) {
  const profileDir = path.resolve(__dirname, manifest.portal.userDataDir);
  fs.mkdirSync(profileDir, { recursive: true });
  const headless = process.env.HEADLESS !== '0';
  const ctx = await chromium.launchPersistentContext(profileDir, {
    headless,
    acceptDownloads: true,
    viewport: { width: 1366, height: 900 },
    userAgent:
      'Mozilla/5.0 (SmartAuditing-GstFetch/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
  });
  try {
    await ensureSignedIn(ctx, job);
    const gstin = (job.gstin || '').replace(/\s/g, '').toUpperCase();
    const retById = Object.fromEntries(manifest.returns.map(r => [r.id, r]));
    for (const it of job.items) {
      if (it === 'TDS') {
        // TRACES: open it (signed in via the same profile) for the user to grab the challan list
        const page = ctx.pages()[0] || await ctx.newPage();
        await page.goto(manifest.tds.url, { waitUntil: 'domcontentloaded' }).catch(() => {});
        job.progress.push({ step: 'tds', message: 'TRACES opened. Download the challan list (CSV/Excel) and drop it into the TDS box.' });
        continue;
      }
      const ret = retById[it];
      if (!ret) continue;
      for (const m of job.months) {
        job.progress.push({ step: 'download', ret: it, month: m, message: `Downloading ${ret.label} ${m}…` });
        try {
          const url = downloadUrl(gstin, ret.retType, m);
          const resp = await ctx.request.get(url, {
            timeout: manifest.portal.requestTimeoutMs,
            maxRedirects: 5,
          });
          if (!resp.ok()) throw new Error(`portal returned ${resp.status()}`);
          const ct = resp.headers()['content-type'] || '';
          const ext = extFor(ret, ct);
          const buf = Buffer.from(await resp.body());
          if (!buf.length) throw new Error('portal returned an empty file');
          const name = fileName(job.client, it, m, ext);
          const stPath = storagePath(job.client, it, m, ext);
          const { error } = await sb.storage.from(manifest.storage.bucket).upload(
            stPath,
            new Blob([buf], { type: ct || 'application/octet-stream' }),
            { upsert: true, contentType: ct || 'application/octet-stream' }
          );
          if (error) throw new Error('storage: ' + error.message);
          job.downloaded++;
          job.uploaded++;
          job.progress.push({ step: 'done', ret: it, month: m, message: `Saved ${name} (${(buf.length / 1024).toFixed(0)} KB)` });
        } catch (e) {
          job.errors.push(`${ret.label} ${m}: ${e.message}`);
          job.progress.push({ step: 'error', ret: it, month: m, message: e.message });
        }
      }
    }
  } finally {
    await ctx.close().catch(() => {});
  }
}
