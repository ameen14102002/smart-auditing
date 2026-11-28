/* A dry run of the helper against a stand-in GST portal (no real portal is touched):
   login (the "person" types the CAPTCHA) > Returns Dashboard > GSTR-1 JSON (prepared, then File link), GSTR-2B Excel (April),
   GSTR-2B too big for Excel (May: taken as JSON File 1 + File 2), GSTR-3B figures > Logout.
   Run:  SA_HEADLESS=1 node test/mock-run.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Run, testHooks } from '../runner.js';
const D = path.dirname(fileURLToPath(import.meta.url));
const html = (b, extra = '') => `<!doctype html><html><body><a href="#" onclick="location.href='https://services.gst.gov.in/services/logout';return false">Logout</a>${b}<script>${extra}</script></body></html>`;
const Q = u => new URL(u).searchParams.get('m') || '';
const pages = {
  '/services/login': () => html(`<input id="username"><input id="user_pass" type="password"><input id="captcha"><button onclick="location.href='/services/auth/fowelcome'">LOGIN</button>`),
  '/services/auth/fowelcome': () => html('<h3>Welcome</h3>'),
  '/services/logout': () => html('<h3>Logged out</h3>'),
  '/returns/auth/dashboard': () => html(`
    <select id="fy"><option>Select</option><option>2025-26</option><option>2026-27</option></select>
    <select id="q"><option>Select</option><option>Quarter 1 (Apr - Jun)</option><option>Quarter 2 (Jul - Sep)</option></select>
    <select id="p"><option>Select</option><option value="04">April</option><option value="05">May</option><option value="06">June</option></select>
    <button id="s">SEARCH</button><div id="t"></div>`, `
    s.onclick=()=>{const m=p.value;t.innerHTML=
     '<div><h4>GSTR1</h4><p>Status - Filed</p><button onclick="location.href=\\'/returns/auth/gstr1/offline?m='+m+'\\'">PREPARE OFFLINE</button><button>VIEW</button></div>'+
     '<div><h4>GSTR2B</h4><button onclick="location.href=\\'/returns/auth/gstr2b?m='+m+'\\'">VIEW</button><button onclick="location.href=\\'/returns/auth/gstr2b/download?m='+m+'\\'">DOWNLOAD</button></div>'+
     '<div><h4>GSTR3B</h4><p>Status - Filed</p><button onclick="location.href=\\'/returns/auth/gstr3b?m='+m+'\\'">VIEW</button></div>'};`),
  '/returns/auth/gstr1/offline': u => html(`<a>DOWNLOAD</a><button id="g">Generate JSON File to Download</button><div id="l"></div>`,
    `g.onclick=()=>setTimeout(()=>{l.innerHTML='<a href="/files/g1-${Q(u)}.zip">Click here to download - File 1</a>'},2500)`),
  '/returns/auth/gstr2b': u => html(Q(u) === '05' ? `<button disabled class="disabled">DOWNLOAD GSTR-2B DETAILS (EXCEL)</button>` : `<a href="/files/g2b-${Q(u)}.xlsx">DOWNLOAD GSTR-2B DETAILS (EXCEL)</a>`),
  '/returns/auth/gstr2b/download': u => html(`<button id="g">GENERATE JSON FILE TO DOWNLOAD</button><button>GENERATE EXCEL FILE TO DOWNLOAD</button><div id="l"></div>`,
    `g.onclick=()=>setTimeout(()=>{l.innerHTML='<a href="/files/g2b-${Q(u)}-1.json">Download File 1</a> <a href="/files/g2b-${Q(u)}-2.json">Download File 2</a>'},2500)`),
  '/returns/auth/gstr3b': u => html('<h3>GSTR-3B</h3>', `fetch('/returns/auth/api/gstr3b?m=${Q(u)}').then(r=>r.json())`),
  '/returns/auth/api/gstr3b': u => JSON.stringify({ status: 1, data: { ret_period: Q(u) + '2026', sup_details: { osup_det: { txval: 10000, iamt: 0, camt: 900, samt: 900, csamt: 0 } }, itc_elg: { itc_avl: [] } } })
};
let typed = 0;
testHooks.context = async (ctx, run) => {
  await ctx.route(/gst\.gov\.in/, route => {
    const u = route.request().url(), p = new URL(u).pathname;
    if (p.startsWith('/files/')) { const f = path.join(D, path.basename(p)); return fs.existsSync(f) ? route.fulfill({ status: 200, body: fs.readFileSync(f), headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename="' + path.basename(p) + '"' } }) : route.fulfill({ status: 404, body: 'no' }); }
    const f = pages[p]; if (!f) return route.fulfill({ status: 404, body: 'not in mock: ' + p });
    route.fulfill({ status: 200, contentType: p.includes('/api/') ? 'application/json' : 'text/html', body: f(u) });
  });
  ctx.on('page', pg => pg.on('load', async () => { if (/\/services\/login/.test(pg.url()) && !typed++) { await pg.fill('#captcha', 'AB12CD'); await new Promise(r => setTimeout(r, 1500)); await pg.click('text=LOGIN'); } }));
};
process.env.HOME = path.join(D, 'home'); fs.rmSync(process.env.HOME, { recursive: true, force: true });
const run = new Run({ client: 'Axeon Test', gstin: '33AAACA1111A1ZZ', items: ['GSTR1', 'GSTR2B', 'GSTR3B'], months: ['2026-04', '2026-05'] }, r => {
  const v = r.view(); console.log('\nRESULT', v.status); for (const x of v.results) console.log(' ', x.label, x.fmt, x.outcome, x.text);
  console.log('FILES'); for (const f of v.files) console.log(' ', f.ret, f.month, f.fmt, f.part, f.name, f.size); process.exit(0);
});
let last = ''; setInterval(() => { if (run.text !== last) { last = run.text; console.log(new Date().toISOString().slice(14, 19), run.text); } }, 200);
setTimeout(() => { console.log('TIMEOUT', JSON.stringify(run.view(), null, 1)); process.exit(1); }, 240000);
run.start();
