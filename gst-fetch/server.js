/* Smart Auditing portal helper: the small local service Smart Auditing talks to.
   It listens on this computer only (127.0.0.1:8790) and answers only Smart Auditing's own site.
     GET  /health            -> { ok, version, busy }
     POST /fetch             -> { client, gstin, items:[GSTR1,GSTR2B,GSTR3B,TDS], months:[YYYY-MM], user?, tan?, tdsFrom? } -> { id }
     GET  /status/:id        -> what the run is doing, each month's result, the files saved
     GET  /file/:id/:n       -> one saved file (Smart Auditing reads it in)
     GET  /challans/:id      -> the TDS challans read
     POST /stop/:id          -> stop the run (a signed-in run logs out first)
   Start it with "Start portal helper.cmd" (Windows) or: npm install && npm start */
import http from 'node:http';
import fs from 'node:fs';
import { Run, downloadsRoot } from './runner.js';

const VERSION = '2.0.0';
const PORT = +process.env.PORT || 8790;
/* Smart Auditing's site, and a copy run on this computer for testing; every other site is refused */
const ORIGINS = [/^https:\/\/ameen14102002\.github\.io$/i, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i, ...(process.env.SA_ORIGIN ? [new RegExp('^' + process.env.SA_ORIGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')] : [])];
const runs = new Map(); let current = null;

const okOrigin = o => !o || ORIGINS.some(r => r.test(o));
function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}
function readBody(req) {
  return new Promise((ok, no) => { let n = 0; const b = []; req.on('data', c => { n += c.length; if (n > 200000) { no(new Error('too large')); req.destroy(); } else b.push(c); }); req.on('end', () => { try { ok(JSON.parse(Buffer.concat(b).toString('utf8') || '{}')); } catch (e) { no(new Error('not JSON')); } }); });
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  if (!okOrigin(origin)) return send(res, 403, { error: 'This helper answers Smart Auditing only.' });
  if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');   // Chrome / Edge: a web page asking a service on this computer
    res.setHeader('Access-Control-Max-Age', '600');
    res.writeHead(204); return res.end();
  }
  const url = new URL(req.url, 'http://127.0.0.1'), parts = url.pathname.split('/').filter(Boolean);
  try {
    if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true, service: 'smart-auditing-portal-helper', version: VERSION, busy: !!(current && current.status === 'running'), folder: downloadsRoot() });
    if (req.method === 'POST' && url.pathname === '/fetch') {
      if (current && current.status === 'running') return send(res, 409, { error: 'A portal run is already open (' + current.co + '). Finish or stop it first.', id: current.id });
      const run = new Run(await readBody(req), () => {});
      runs.set(run.id, run); current = run;
      for (const [id, r] of runs) if (r !== run && r.status !== 'running' && Date.now() - r.at0 > 6 * 3600000) runs.delete(id);
      run.start();
      console.log(new Date().toLocaleTimeString(), 'run', run.id, run.co, run.items.length, 'returns', run.tds ? '+ TDS (' + run.tds + ')' : '');
      return send(res, 200, { id: run.id });
    }
    const run = parts[1] && runs.get(parts[1]);
    if (parts[0] === 'status' && req.method === 'GET') return run ? send(res, 200, run.view()) : send(res, 404, { error: 'No such run (the helper may have been restarted).' });
    if (parts[0] === 'challans' && req.method === 'GET') return run ? send(res, 200, { rows: run.challans }) : send(res, 404, { error: 'No such run.' });
    if (parts[0] === 'stop' && req.method === 'POST') { if (run) run.stop(); return send(res, 200, { ok: !!run }); }
    if (parts[0] === 'file' && req.method === 'GET') {
      const f = run && run.files[+parts[2]]; if (!f || !fs.existsSync(f.path)) return send(res, 404, { error: 'No such file.' });
      res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': fs.statSync(f.path).size, 'Cache-Control': 'no-store', 'X-File-Name': encodeURIComponent(f.name), 'Access-Control-Expose-Headers': 'X-File-Name' });
      return fs.createReadStream(f.path).pipe(res);
    }
    if (req.method === 'GET' && url.pathname === '/') return send(res, 200, '<!doctype html><meta charset="utf-8"><title>Smart Auditing portal helper</title><body style="font:15px system-ui;margin:40px;max-width:560px"><h2>Smart Auditing portal helper is running</h2><p>Open Smart Auditing, go to the client\'s GST &amp; TDS page and click <b>Fetch from the portals</b>. Keep this window open while it works.</p><p>Files are saved in ' + downloadsRoot().replace(/&/g, '&amp;') + '.</p>', 'text/html; charset=utf-8');
    send(res, 404, { error: 'Not found' });
  } catch (e) { send(res, 400, { error: e.message || String(e) }); }
});
server.listen(PORT, '127.0.0.1', () => {
  console.log('Smart Auditing portal helper ' + VERSION + ' on http://127.0.0.1:' + PORT);
  console.log('Keep this window open. Start a fetch from Smart Auditing (GST & TDS page > Fetch from the portals).');
});
server.on('error', e => { console.error(e.code === 'EADDRINUSE' ? 'The helper is already running (port ' + PORT + ' is in use).' : e.message); process.exit(1); });
