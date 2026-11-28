/* Dry run of the TDS challan reading against a stand-in TRACES (no real portal): the "person" signs in, opens Challan Status,
   the helper reads the table, the person closes the window.   Run:  SA_HEADLESS=1 node test/mock-tds.mjs */
import { Run, testHooks } from '../runner.js';
const page = b => `<!doctype html><html><body>${b}</body></html>`;
testHooks.context = async ctx => {
  await ctx.route(/tdscpc\.gov\.in/, r => { const p = new URL(r.request().url()).pathname;
    if (/login/.test(p)) return r.fulfill({ contentType: 'text/html', body: page('<input id="userId"><input id="psw" type="password"><input id="tanpan"><input id="captcha"><button onclick="location.href=\'/app/ded/challanstatus.xhtml\'">Login</button>') });
    r.fulfill({ contentType: 'text/html', body: page('<table><tr><th>Sr. No.</th><th>BSR Code</th><th>Date of Deposit</th><th>Challan Serial No.</th><th>Section</th><th>Amount</th></tr><tr><td>1</td><td>0510308</td><td>07-May-2026</td><td>00123</td><td>194C</td><td>12,500.00</td></tr><tr><td>2</td><td>0510308</td><td>06-Jun-2026</td><td>00456</td><td>194J</td><td>8,000.00</td></tr></table>') }); });
  ctx.on('page', pg => pg.on('load', async () => { if (/login/.test(pg.url())) { await pg.fill('#captcha', 'X1'); await pg.click('text=Login'); } else setTimeout(() => pg.close().catch(() => {}), 9000); }));
};
const run = new Run({ client: 'Axeon Test', tan: 'CHEA12345B', items: ['TDS'], months: [] }, r => { console.log('RESULT', r.status, r.challans); process.exit(0); });
let last = ''; setInterval(() => { if (run.text !== last) { last = run.text; console.log(run.text); } }, 200);
setTimeout(() => { console.log('TIMEOUT', run.view()); process.exit(1); }, 90000);
run.start();
