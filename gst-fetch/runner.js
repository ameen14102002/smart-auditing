/* Smart Auditing portal helper: the run itself.
   The same work 1Go's portal window does (1Go src/portal.js), in a browser the helper opens on this computer:
   - one visible window per run, on the portal's own login page, in a fresh session (nothing kept after the run);
   - the person types the login, password, CAPTCHA and OTP; no password is asked for, kept or sent anywhere;
   - after the sign-in, page.js walks the portal the way 1Go does: Returns Dashboard, the return's tile, its download;
   - the queue: one item per return and month, a time limit per item, the next month back on the Returns Dashboard;
   - small and medium returns come as the portal's Excel; a GSTR-2B too big for the portal's Excel button (over 1000 documents)
     is taken as JSON from the download page, File 1, File 2 ... as the portal splits it; GSTR-1 always as JSON (the portal
     prepares a big one for up to 30 minutes; a month still being prepared is asked for once more at the end);
   - GSTR-3B: the filed return's own figures, as the portal's page receives them;
   - TDS challans: read from the challan list on TRACES or the Income Tax portal (TAN login);
   - at the end the portal's own Logout is clicked and the window closes.
   No portal address is called by the helper and no request header is changed: the browser is an ordinary browser. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PAGE = fs.readFileSync(path.join(HERE, 'page.js'), 'utf8');

const KINDS = {
  gst: { label: 'GST portal', login: 'https://services.gst.gov.in/services/login', loginHost: 'services.gst.gov.in', hosts: /(^|\.)gst\.gov\.in$/i },
  ittan: { label: 'Income Tax portal (TAN)', login: 'https://eportal.incometax.gov.in/iec/foservices/#/login', loginHost: 'eportal.incometax.gov.in', hosts: /(^|\.)incometax\.gov\.in$/i },
  traces: { label: 'TRACES', login: 'https://www.tdscpc.gov.in/app/login.xhtml?usr=Ded', loginHost: 'www.tdscpc.gov.in', hosts: /(^|\.)tdscpc\.gov\.in$/i }
};
const RETURNS = { GSTR1: 'GSTR-1', GSTR2B: 'GSTR-2B', GSTR3B: 'GSTR-3B' };
/* what Smart Auditing reads: GSTR-1 JSON, GSTR-2B Excel (JSON when big), GSTR-3B figures */
const FMT = { GSTR1: 'JSON', GSTR2B: 'EXCEL', GSTR3B: 'DATA' };
const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DASHBOARD = 'https://return.gst.gov.in/returns/auth/dashboard';
const LOGOUT = 'https://services.gst.gov.in/services/logout';
const ITEM_WAIT = 150000, GAP = 2500, LONG_WAIT = 32 * 60000, SIGNIN_WAIT = 20 * 60000;

const yearOf = (fy, m) => { const y = +String(fy).slice(0, 4); return m < 4 ? y + 1 : y; };
const fyOf = ym => { const [y, m] = ym.split('-').map(Number); const s = m >= 4 ? y : y - 1; return s + '-' + String((s + 1) % 100).padStart(2, '0'); };
const safeName = s => { let n = String(s || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80).replace(/[. ]+$/, ''); if (/^(CON|PRN|AUX|NUL|COM\d|LPT\d)(\.|$)/i.test(n)) n = '_' + n; return n || 'Client'; };
const hostOf = u => { try { const x = new URL(u); return x.protocol === 'https:' ? x.hostname.toLowerCase() : ''; } catch (e) { return ''; } };
const label = it => RETURNS[it.ret] + ' ' + MON3[+it.month - 1] + '-' + yearOf(it.fy, +it.month);
export const downloadsRoot = () => path.join(os.homedir(), 'Documents', 'Smart Auditing portal downloads');

export const testHooks = {};   // used by test/mock-run.mjs only
let pw = null;
async function playwright() { if (!pw) pw = await import('playwright'); return pw; }
/* the browser already on the computer (Edge on Windows, else Chrome), else Playwright's own Chromium */
async function launch() {
  const { chromium } = await playwright(); let last = null;
  for (const channel of ['msedge', 'chrome', undefined]) {
    try { return await chromium.launch({ headless: process.env.SA_HEADLESS === '1', channel, args: ['--start-maximized'] }); } catch (e) { last = e; }
  }
  throw new Error('No browser could be opened (Edge, Chrome or Playwright Chromium). ' + String(last && last.message || '').split('\n')[0]);
}

export class Run {
  constructor(req, onEnd) {
    this.id = 'r' + Date.now().toString(36);
    this.co = String(req.client || '').trim().slice(0, 120) || 'Client';
    this.gstin = String(req.gstin || '').toUpperCase().replace(/\s+/g, '');
    this.user = String(req.user || '').trim().slice(0, 80);                 // the portal user name only, if given; never a password
    this.tan = String(req.tan || '').toUpperCase().replace(/\s+/g, '');
    const months = [...new Set((req.months || []).filter(m => /^\d{4}-(0[1-9]|1[0-2])$/.test(m)))].sort().slice(0, 36);
    const want = new Set((req.items || []).map(x => String(x).toUpperCase()));
    this.items = [];
    for (const m of months) for (const ret of ['GSTR1', 'GSTR2B', 'GSTR3B']) if (want.has(ret)) this.items.push({ ret, fmt: FMT[ret], fy: fyOf(m), month: String(+m.slice(5)) });
    this.tds = want.has('TDS') ? (req.tdsFrom === 'ittan' ? 'ittan' : 'traces') : '';
    this.phases = [...(this.items.length ? ['gst'] : []), ...(this.tds ? [this.tds] : [])];
    if (!this.phases.length) throw new Error('Choose at least one return and month.');
    if (this.items.length && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(this.gstin)) throw new Error('The client has no valid GSTIN.');
    this.status = 'running'; this.text = 'Opening the browser...'; this.log = []; this.results = []; this.files = []; this.challans = [];
    this.qi = 0; this.stage = {}; this.at0 = Date.now(); this.onEnd = onEnd;
  }
  say(t) { t = String(t || '').replace(/\s+/g, ' ').trim().slice(0, 300); if (!t || t === this.text) return; this.text = t; this.log.push({ at: Date.now(), t }); if (this.log.length > 200) this.log.shift(); }
  view() {
    return { id: this.id, status: this.status, client: this.co, text: this.text, phase: this.kind || '', signedIn: !!this.stage.signedIn,
      qi: Math.min(this.qi, this.items.length), qn: this.items.length, results: this.results.map(({ file, ...r }) => r),
      files: this.files.map((f, n) => ({ n, name: f.name, ret: f.ret, month: f.ym, fmt: f.fmt, size: f.size, part: f.part || 0 })),
      challans: this.challans.length, log: this.log.slice(-12), startedAt: this.at0 };
  }

  async start() {
    try { this.browser = await launch(); }
    catch (e) { this.status = 'error'; this.say(e.message); this.onEnd && this.onEnd(this); return; }
    this.browser.on('disconnected', () => this.end(true));
    this.next();
  }
  /* GST first, then the TDS challans: each in its own fresh session */
  async next() {
    if (this.status !== 'running') return;
    const kind = this.phases.shift();
    if (!kind) return this.end(false);
    this.kind = kind; this.stage = {}; this.relogins = 0; this.done = false;
    const K = KINDS[kind];
    try { if (this.ctx) await this.ctx.close().catch(() => {}); } catch (e) {}
    const ctx = this.ctx = await this.browser.newContext({ acceptDownloads: true, viewport: null });
    await ctx.exposeBinding('__saPortalCall', (src, ch, a) => this.call(src.page, ch, Array.isArray(a) ? a : []));
    await ctx.addInitScript({ content: PAGE });
    if (testHooks.context) await testHooks.context(ctx, this);
    ctx.on('page', p => this.popup(p));
    if (kind === 'gst' && this.items.some(it => it.ret === 'GSTR3B')) ctx.on('response', r => this.r3b(r).catch(() => {}));
    const page = this.page = await ctx.newPage();
    this.watchPage(page);
    page.on('close', () => { if (this.page === page && !this.done) this.phaseEnd(true); });
    this.say('Sign in to the ' + K.label + ' in the window that opened: username, password, CAPTCHA' + (kind === 'gst' ? '' : ' and OTP if asked') + '. Smart Auditing does the rest.');
    clearTimeout(this.signTimer);
    this.signTimer = setTimeout(() => { if (!this.stage.signedIn && !this.done) { this.say('No sign-in in 20 minutes: the run was stopped. Start it again when ready.'); this.phaseEnd(true); } }, SIGNIN_WAIT);
    await page.goto(K.login, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(e => this.say('The ' + K.label + ' did not open: ' + String(e.message).split('\n')[0]));
  }
  /* stay on the portal: a page the portal opens in a new tab is opened in the run's own page (as 1Go does); a file it makes
     itself (blob:) is a download */
  async popup(p) {
    if (!(await p.opener().catch(() => null))) return;   // the run's own page, not a page the portal opened
    this.watchPage(p);
    setTimeout(async () => {
      const u = p.url(); if (p.isClosed()) return;
      const K = KINDS[this.kind];
      if (/^https:/i.test(u) && K && K.hosts.test(hostOf(u)) && this.page && !this.page.isClosed()) { await p.close().catch(() => {}); this.page.goto(u).catch(() => {}); return; }
      setTimeout(() => { if (!p.isClosed()) p.close().catch(() => {}); }, 60000);
    }, 2500);
  }
  watchPage(p) { p.on('download', d => this.download(d).catch(e => this.say('A download failed: ' + e.message))); }

  /* messages from page.js (1Go's channel names) */
  async call(page, ch, a) {
    const K = KINDS[this.kind]; if (!K || page !== this.page || this.done) return ch === 'portal:job' ? null : false;
    switch (ch) {
      case 'portal:job': return this.job(String(a[0] || ''));
      case 'portal:stage': return this.setStage(String(a[0] || ''));
      case 'portal:item': return this.item(+a[0], String(a[1] || ''), String(a[2] || ''));
      case 'portal:relogin': return this.relogin();
      case 'portal:note': case 'portal:bar': this.say(a[0]); return true;
      case 'portal:challans': return this.takeChallans(String(a[0] || ''), a[1]);
      case 'portal:json': case 'portal:tdszip': return '';
      default: return false;                // ledgers, PAN checks, CAPTCHA relay, secure message: not used here
    }
  }
  job(frameUrl) {
    const K = KINDS[this.kind], h = hostOf(frameUrl); if (!h || !K.hosts.test(h)) return null;
    const gst = this.kind === 'gst', it = gst ? this.items[this.qi] : null;
    if (it && !this.timer && this.stage.signedIn) this.arm();
    const o = { kind: this.kind, action: gst ? (it ? 'DL_' + it.ret : 'DONE') : 'READ_CHALLANS', lcash: false, lcredit: false, wantLed: false,
      fmt: it ? it.fmt : '', fy: it ? it.fy : '', month: it ? it.month : '', bulk: this.items.length > 1, qi: this.qi, qn: this.items.length,
      done: this.results.filter(r => r.outcome === 'saved').length, skipped: this.results.filter(r => r.outcome !== 'saved').length,
      stage: { ...this.stage }, hasJson: false, jsonName: '', gstin: '', pans: [], csi: null, tdsUp: null,
      /* after the sign-in the challan list is paged by itself (1Go's background reading); the login is always the person's */
      bg: !!(this.kind === 'ittan' && this.stage.signedIn) };
    if (h === K.loginHost && !this.stage.signedIn) { o.user = this.kind === 'gst' ? this.user : ''; o.pass = ''; o.extra = this.tan ? { tan: this.tan } : {}; }
    return o;
  }
  setStage(name) {
    name = name.slice(0, 30);
    { const m = /^files([2-9])$/.exec(name); if (m) { this.expect = +m[1]; return true; } }   // the portal offers File 1 ... File N
    if (!/^[a-z]+$/i.test(name)) return false;
    if (name === 'needsme') { this.say('The portal needs you for a moment: answer it in the portal window and Smart Auditing carries on.'); return true; }
    if (name === 'chdone') { setTimeout(() => this.phaseEnd(false), 500); return true; }
    if (name === 'big') { this.bigToJson(); return true; }
    if (name === 'signedIn' && !this.stage.signedIn) { clearTimeout(this.signTimer); this.say('Signed in. ' + (this.kind === 'gst' ? 'Taking ' + this.items.length + ' return' + (this.items.length === 1 ? '' : 's') + '...' : 'Open the challan list; Smart Auditing reads it.')); }
    this.stage[name] = 1; return true;
  }
  /* a GSTR-2B with more than 1000 documents: the portal turns off its Excel button; the month is taken again from the download
     page, as JSON (File 1, File 2 ...), which Smart Auditing reads in full */
  bigToJson() {
    const it = this.items[this.qi]; if (it && it.ret === 'GSTR2B' && it.fmt === 'EXCEL') { it.fmt = 'JSON'; it.big = 1; }
    this.stage = { signedIn: 1, dash: 1, big: 1 }; clearTimeout(this.timer); this.timer = null; this.nfile = 0; this.got = 0; this.expect = 0; this.firstFile = '';
  }
  arm() {
    clearTimeout(this.timer); const qi = this.qi, it = this.items[qi] || {};
    const wait = (it.ret === 'GSTR2B') || (it.ret === 'GSTR1' && it.fmt === 'JSON') ? LONG_WAIT : ITEM_WAIT;
    this.timer = setTimeout(() => { if (this.qi === qi) this.advance('timeout', 'no file came from the portal in time'); }, wait);
  }
  advance(outcome, text, file) {
    if (this.kind !== 'gst' || this.qi >= this.items.length) return;
    clearTimeout(this.timer); this.timer = null;
    const it = this.items[this.qi];
    this.results.push({ ret: it.ret, fmt: it.fmt, month: it.fy && yearOf(it.fy, +it.month) + '-' + String(it.month).padStart(2, '0'), label: label(it), outcome, text: String(text || '').slice(0, 200), file: file || '' });
    if (outcome !== 'saved') this.say(label(it) + ': ' + String(text || outcome).slice(0, 160) + '. Moving on.');
    if (outcome === 'pending' && it.ret === 'GSTR1' && !it.again && this.items.length < 400) this.items.push({ ...it, again: 1 });   // asked once more at the end
    this.qi++; this.stage = { signedIn: 1, dash: 1 }; this.nfile = 0; this.expect = 0; this.got = 0; this.firstFile = '';
    if (this.qi >= this.items.length) return this.phaseEnd(false);
    clearTimeout(this.nextT);
    this.nextT = setTimeout(() => { const p = this.page; if (!p || p.isClosed() || this.done) return;
      p.evaluate(u => { location.href = u; }, DASHBOARD).catch(() => p.goto(DASHBOARD).catch(() => {})); }, GAP);
  }
  item(qi, outcome, text) {
    if (this.kind !== 'gst' || qi !== this.qi || !/^(notfiled|noperiod|pending|notfound|failed)$/.test(outcome)) return false;
    this.advance(outcome, text); return true;
  }
  /* the portal ended the session: the login opens again (the person signs in once more), at most 3 times in one run */
  relogin() {
    if (this.kind !== 'gst') return false;
    clearTimeout(this.timer); this.timer = null; clearTimeout(this.nextT);
    if (++this.relogins > 3) {
      for (; this.qi < this.items.length; this.qi++) { const it = this.items[this.qi]; this.results.push({ ret: it.ret, fmt: it.fmt, month: yearOf(it.fy, +it.month) + '-' + String(it.month).padStart(2, '0'), label: label(it), outcome: 'failed', text: 'the GST portal ended the session too many times' }); }
      this.phaseEnd(false); return false;
    }
    this.stage = {};
    setTimeout(() => { if (this.page && !this.page.isClosed()) this.page.goto(KINDS.gst.login).catch(() => {}); }, 1500);
    this.say('The GST portal ended the session. Sign in again in the portal window; Smart Auditing carries on from where it stopped.');
    return true;
  }

  /* a file from the portal: it belongs to the month that was being worked on when it STARTED */
  async download(d) {
    let qi0 = this.kind === 'gst' && this.qi < this.items.length ? this.qi : -1;
    /* a file that starts before this month's return was even opened is a second copy of the one before it (a double click on
       the portal's link): it is booked to that one, never to the month now open */
    if (qi0 > 0 && !this.stage.tile) qi0--;
    const cur = qi0 >= 0 ? this.items[qi0] : null;
    if (cur && qi0 === this.qi) { clearTimeout(this.timer); const t = this.timer = setTimeout(() => { if (this.qi === qi0 && this.timer === t) this.advance('timeout', 'the file started but did not finish in time'); }, ITEM_WAIT * 4); }
    const raw = String(d.suggestedFilename() || ''), rx = (path.extname(raw) || '').slice(0, 10).replace(/[^.\w]/g, '');
    let dir = path.join(downloadsRoot(), safeName(this.co)), name = safeName(raw.slice(0, raw.length - rx.length) || 'download') + rx, part = 0;
    if (cur) {
      dir = path.join(dir, 'FY ' + cur.fy);
      part = qi0 === this.qi ? (this.nfile = (this.nfile || 0) + 1) : 2;
      name = safeName(RETURNS[cur.ret] + ' ' + MON3[+cur.month - 1] + '-' + yearOf(cur.fy, +cur.month) + ' ' + this.gstin + (part > 1 || this.expect > 1 ? ' part ' + part : '')) + rx;
    }
    fs.mkdirSync(dir, { recursive: true });
    let p = path.join(dir, name), i = 1;
    while (fs.existsSync(p)) p = path.join(dir, path.basename(name, rx) + ' (' + (i++) + ')' + rx);
    const fail = await d.failure();
    if (fail) { if (cur && this.qi === qi0) this.advance('failed', 'the download did not finish (' + fail + ')'); return; }
    await d.saveAs(p);
    const live = !!(cur && this.qi === qi0);
    const want = cur ? ({ EXCEL: /\.(xlsx?|zip)$/i, JSON: /\.(json|zip)$/i, PDF: /\.pdf$/i })[cur.fmt] : null;
    if (live && want && !want.test(p)) {
      /* the portal gave a PDF where the Excel was asked: the PDF is kept as the summary and the month is taken again from the
         download page (as JSON for a big GSTR-2B) */
      try { const q = p.replace(/(\.\w+)$/, ' (summary)$1'); fs.renameSync(p, q); } catch (x) {}
      if (cur.ret === 'GSTR2B' && !cur.big) {
        this.say(label(cur) + ': the portal gave a PDF, not the Excel. Taking the file from the download page...');
        this.bigToJson();
        setTimeout(() => { if (this.page && !this.page.isClosed()) this.page.evaluate(u => { location.href = u; }, DASHBOARD).catch(() => {}); }, 1500);
        return;
      }
      return this.advance('failed', 'the portal gave a ' + path.extname(p).slice(1).toUpperCase() + ' file, not ' + cur.fmt);
    }
    const size = fs.statSync(p).size;
    this.files.push({ name: path.basename(p), path: p, size, ret: cur ? cur.ret : '', fmt: cur ? cur.fmt : '', ym: cur ? yearOf(cur.fy, +cur.month) + '-' + String(cur.month).padStart(2, '0') : '', part });
    if (!cur) { this.say('Saved ' + path.basename(p) + '.'); return; }
    if (!live) { const r = this.results[qi0]; if (r && r.outcome !== 'saved') Object.assign(r, { outcome: 'saved', text: 'the file came late, after the run had moved on' }); return; }
    this.say(label(cur) + ' saved' + (this.expect > 1 ? ' (file ' + part + ' of ' + this.expect + ')' : '') + '.');
    this.stage.downloaded = 1;
    this.got = (this.got || 0) + 1;
    if (this.expect > 1 && this.got < this.expect) { this.firstFile = this.firstFile || p; return; }   // wait for the other parts
    this.advance('saved', this.expect > 1 ? this.got + ' files' : '', this.firstFile || p);
  }
  /* GSTR-3B: the filed return's figures, as the portal's own page receives them (read from the browser, no address called) */
  async r3b(r) {
    if (this.kind !== 'gst' || this.done) return;
    const cur = this.items[this.qi]; if (!cur || cur.ret !== 'GSTR3B' || !this.stage.tile) return;
    if (r.frame().page() !== this.page || !KINDS.gst.hosts.test(hostOf(r.url())) || /\.(js|css|png|svg|woff2?)(\?|$)/i.test(r.url())) return;
    const ct = r.headers()['content-type'] || ''; if (!/json|text\/plain|javascript/i.test(ct) && !/api|gstr3b|3b/i.test(r.url())) return;
    let j = null; try { j = JSON.parse(await r.text()); } catch (e) { return; }
    const has3b = (x, d = 0) => { if (!x || typeof x !== 'object' || d > 6) return null; if (x.sup_details || x.itc_elg || (x.osup_det && x.isup_rev)) return x.sup_details || x.itc_elg ? x : { sup_details: x, ret_period: x.ret_period }; for (const v of Object.values(x)) { const y = has3b(v, d + 1); if (y) return y; } return null; };
    const qi = this.qi; if (!this.d3 || this.d3.qi !== qi) this.d3 = { qi, parts: [] };
    this.d3.parts.push(j); if (this.d3.parts.length > 12) this.d3.parts.shift();
    const r3 = has3b(j); if (!r3 || this.d3.timer) return;
    this.d3.timer = setTimeout(() => {   // a moment for the payment part of the same return
      if (this.qi !== qi || this.done) return;
      const mm = +cur.month, yy = yearOf(cur.fy, mm), period = String(mm).padStart(2, '0') + yy, fp = String(r3.ret_period || '');
      if (fp && fp !== period) return this.advance('failed', 'the portal showed GSTR-3B of ' + fp + ', not ' + period);
      const dir = path.join(downloadsRoot(), safeName(this.co), 'FY ' + cur.fy); fs.mkdirSync(dir, { recursive: true });
      const p = path.join(dir, safeName('GSTR-3B data ' + MON3[mm - 1] + '-' + yy + ' ' + this.gstin) + '.json');
      fs.writeFileSync(p, JSON.stringify({ kind: '1go-gstr3b-data', gstin: this.gstin || r3.gstin || '', period, r3b: r3, parts: this.d3.parts }, null, 1));
      this.files.push({ name: path.basename(p), path: p, size: fs.statSync(p).size, ret: 'GSTR3B', fmt: 'DATA', ym: yy + '-' + String(mm).padStart(2, '0'), part: 0 });
      this.say(label(cur) + ' figures saved.');
      this.advance('saved', '', p);
    }, 3000);
  }
  takeChallans(frameUrl, rows) {
    const K = KINDS[this.kind]; if (this.kind === 'gst' || !K.hosts.test(hostOf(frameUrl))) return false;
    const have = new Set(this.challans.map(c => c.bsr + '|' + c.date + '|' + c.serial)); let n = 0;
    for (const r of (Array.isArray(rows) ? rows : []).slice(0, 1000)) {
      if (!r || typeof r !== 'object') continue;
      const bsr = String(r.bsr || '').replace(/\D/g, ''), serial = String(r.serial || '').replace(/\D/g, ''), date = String(r.date || ''), amount = +r.amount;
      if (!/^\d{7}$/.test(bsr) || !/^\d{1,5}$/.test(serial) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !(amount >= 0) || amount > 1e12) continue;
      const c = { bsr, serial: serial.padStart(5, '0'), date, amount: Math.round(amount * 100) / 100, minor: String(r.minor || '').slice(0, 40), section: String(r.section || '').slice(0, 20), cin: String(r.cin || '').replace(/\D/g, '').slice(0, 20) };
      const k = c.bsr + '|' + c.date + '|' + c.serial; if (have.has(k)) continue; have.add(k); this.challans.push(c); n++;
    }
    if (n) this.say(this.challans.length + ' challan' + (this.challans.length === 1 ? '' : 's') + ' taken from ' + K.label + '.');
    return n;
  }

  /* the end of one portal's work: Logout clicked inside the page, as the person would, then the next portal or the end */
  phaseEnd(closed) {
    if (this.done) return; this.done = true;
    clearTimeout(this.timer); clearTimeout(this.nextT); clearTimeout(this.signTimer); this.timer = null;
    if (this.kind === 'gst') for (; this.qi < this.items.length; this.qi++) { const it = this.items[this.qi]; this.results.push({ ret: it.ret, fmt: it.fmt, month: yearOf(it.fy, +it.month) + '-' + String(it.month).padStart(2, '0'), label: label(it), outcome: 'notdone', text: closed ? 'the portal window was closed' : 'not reached' }); }
    const p = this.page, kind = this.kind, wasIn = !!this.stage.signedIn;
    const go = () => { if (this.status !== 'running') return; this.next(); };
    if (!closed && wasIn && p && !p.isClosed()) {
      this.say(kind === 'gst' ? 'Downloads finished. Logging out of the GST portal...' : 'Challans read. Logging out...');
      setTimeout(async () => {
        await p.evaluate(lo => { const l = [...document.querySelectorAll('a, button')].find(x => /^\s*log\s*-?\s*out\s*$/i.test(x.innerText || x.textContent || '')); if (l) { l.click(); return; } if (lo) location.href = lo; }, kind === 'gst' ? LOGOUT : '').catch(() => {});
        setTimeout(go, 5000);
      }, 4000);
    } else setTimeout(go, 300);
  }
  async end(closed) {
    if (this.status !== 'running') return;
    if (closed && !this.done) this.phaseEnd(true);
    this.phases = []; this.status = 'done';
    const saved = this.results.filter(r => r.outcome === 'saved').length;
    this.say((this.items.length ? 'GST: ' + saved + ' of ' + this.results.length + ' saved. ' : '') + (this.tds ? this.challans.length + ' TDS challans read. ' : '') + 'Files are in Documents\\Smart Auditing portal downloads.');
    try { if (this.browser && this.browser.isConnected()) await this.browser.close(); } catch (e) {}
    this.onEnd && this.onEnd(this);
  }
  stop() { if (this.status !== 'running') return; if (this.stage.signedIn && !this.done) { this.phases = []; this.phaseEnd(false); setTimeout(() => this.end(false), 12000); } else this.end(true); }
}
