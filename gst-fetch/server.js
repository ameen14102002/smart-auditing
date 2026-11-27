/* Smart Auditing — gst-fetch service.
   Runs the Playwright automation and exposes a small API the app calls:
     GET  /health       -> { ok:true }
     GET  /manifest     -> the automation manifest (storage layout, returns)
     POST /fetch        -> { client, gstin, items, months } -> { id }  (starts a job)
     GET  /status/:id   -> { status, progress, downloaded, uploaded, errors }
   A minimal web UI at / lets you trigger and watch a fetch standalone.

   Run:  npm install && npx playwright install chromium && npm start
   Then open http://localhost:8790  (first run opens a browser for the one-time
   GST sign-in; later runs are fully automatic). */
import express from 'express';
import cors from 'cors';
import manifest from './manifest.js';
import { runFetch } from './fetch.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const jobs = new Map();
let seq = 0;

app.get('/health', (_req, res) => res.json({ ok: true, service: 'gst-fetch', version: '1.0.0' }));
app.get('/manifest', (_req, res) => res.json(manifest));

app.post('/fetch', async (req, res) => {
  const { client, gstin, items, months } = req.body || {};
  if (!client || !gstin || !Array.isArray(items) || !Array.isArray(months))
    return res.status(400).json({ error: 'client, gstin, items, months required' });
  const id = 'j' + (++seq) + '-' + Date.now().toString(36);
  const job = { id, status: 'running', client, gstin, items, months, progress: [], downloaded: 0, uploaded: 0, errors: [] };
  jobs.set(id, job);
  res.json({ id });
  try {
    await runFetch(job);
    job.status = 'done';
  } catch (e) {
    job.status = 'error';
    job.errors.push(e.message);
  }
  jobs.set(id, job);
});

app.get('/status/:id', (req, res) => {
  const j = jobs.get(req.params.id);
  if (!j) return res.status(404).json({ error: 'no such job' });
  res.json({ id: j.id, status: j.status, progress: j.progress, downloaded: j.downloaded, uploaded: j.uploaded, errors: j.errors });
});

app.get('/', (_req, res) => res.type('html').send(UI));

const PORT = process.env.PORT || 8790;
app.listen(PORT, '0.0.0.0', () => console.log(`gst-fetch on http://0.0.0.0:${PORT}`));

const monthsHtml = (() => {
  const out = [];
  for (let y = 2024; y <= 2026; y++) for (let m = 1; m <= 12; m++) {
    const k = y + '-' + String(m).padStart(2, '0');
    out.push('<label><input type="checkbox" class="mo" value="' + k + '"> ' + k + '</label>');
  }
  return out.join('');
})();

const returnsHtml = manifest.returns
  .map(r => '<label><input type="checkbox" class="it" value="' + r.id + '" checked> ' + r.label + '</label>')
  .join('') + '<label><input type="checkbox" class="it" value="TDS"> TDS challans (opens TRACES)</label>';

const UI = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Smart Auditing · GST fetch automation</title>
<style>
body{font:14px/1.5 -apple-system,system-ui,Segoe UI,Roboto,sans-serif;max-width:640px;margin:24px auto;padding:0 16px;color:#1a2233}
h1{font-size:18px}fieldset{border:1px solid #d0d7e2;border-radius:10px;padding:12px 14px;margin:12px 0}
label{display:inline-flex;align-items:center;gap:6px;margin:4px 12px 4px 0}input[type=text]{width:100%;padding:7px;border:1px solid #ccd;border-radius:7px;margin:4px 0}
button{padding:8px 16px;border:0;border-radius:8px;background:#2b6cb0;color:#fff;cursor:pointer}
#log{white-space:pre-wrap;background:#0f1729;color:#cfe;padding:12px;border-radius:10px;min-height:60px;font:12px/1.5 ui-monospace,monospace}
</style></head><body>
<h1>Smart Auditing · GST fetch automation</h1>
<p>Runs the Playwright downloader against the GST portal and stores the files in Supabase Storage for the app to read. First run opens a browser for the one-time GST sign-in.</p>
<fieldset><legend>Client + GSTIN</legend>
<input id="client" type="text" placeholder="Client name"><input id="gstin" type="text" placeholder="GSTIN">
</fieldset>
<fieldset><legend>What to fetch</legend>${returnsHtml}</fieldset>
<fieldset><legend>Months (FY)</legend><div id="months">${monthsHtml}</div></fieldset>
<button id="go">Start fetch</button> <span id="state"></span>
<div id="log"></div>
<script>
var months=[];for(var y=2024;y<=2026;y++)for(var m=1;m<=12;m++){var k=y+'-'+String(m).padStart(2,'0');months.push(k)}
var log=function(m){var el=document.getElementById('log');el.textContent+=(m+'\\n')};
document.getElementById('go').onclick=async function(){
  var items=[].slice.call(document.querySelectorAll('.it:checked')).map(function(x){return x.value});
  var mos=[].slice.call(document.querySelectorAll('.mo:checked')).map(function(x){return x.value});
  var body={client:document.getElementById('client').value,gstin:document.getElementById('gstin').value.toUpperCase(),items:items,months:mos};
  document.getElementById('state').textContent='starting…';log('POST /fetch '+JSON.stringify(body));
  var r=await fetch('/fetch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  var data=await r.json();if(!data.id)return;log('job '+data.id);
  var id=data.id;
  var tick=async function(){var s=await(await fetch('/status/'+id)).json();
    log('['+s.status+'] downloaded='+s.downloaded+' uploaded='+s.uploaded+(s.errors.length?' errors='+s.errors.length:''));
    var last=s.progress.slice(-2);
    for(var i=0;i<last.length;i++)log('  · '+(last[i].message||''));
    document.getElementById('state').textContent=s.status;
    if(s.status==='running')setTimeout(tick,2000);else log(s.status==='done'?'done ✓':'failed ✗');};
  tick();
};
</script></body></html>`;
