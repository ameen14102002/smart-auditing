/* Smart Auditing — payroll verification, Form 26AS vs books (TDS receivable), and filing dates copied from the GST portal.
   Owner, 23 Nov 2026: "Update all the things". */
PR.pay={n:'Payroll verification',ref:'SIA 320 · Code on Social Security',why:'Salary register checked for ghost employees, PF / ESI, net pay and totals against challans; joiners, leavers and big pay changes.'};
PR.as26={n:'Form 26AS vs books (TDS receivable)',ref:'Income-tax',opt:true,why:'TDS that customers deducted, as per Form 26AS, agreed with TDS receivable in the books.'};
UNI.payroll.procs=['pay','comp'];UNI.gsttds.procs=['gst','tds','as26'];
PK.splice(PK.indexOf('ar'),0,'pay','as26');

/* ---------- payroll ---------- */
function parsePayroll(rows){
  const H=findHeader(rows,r=>r.some(v=>/name|employee/.test(v))&&r.some(v=>/gross|net|earning|salary/.test(v)));
  if(!H)throw new Error('No header with Employee name and Gross / Net salary columns was found.');
  const c=(...k)=>hcol(H.head,...k),ci={code:c('emp code','employee code','emp id','employee id','code'),n:c('employee name','name'),pan:c('pan'),uan:c('uan'),esic:c('esic','esi no','ip no'),bank:c('bank a/c','account no','a/c no','bank account'),days:c('paid days','days'),gross:c('gross'),basic:c('basic'),da:c(/^da$|dearness/),pfw:c('pf wage','epf wage'),pf:c(/^pf$|epf|employee pf|pf ded/,'pf'),esi:c(/^esi$|employee esi|esi ded/,'esi'),pt:c('professional tax',/^pt$/),tds:c('tds','income tax'),ded:c('total deduction'),net:c('net'),doj:c('joining','doj'),dol:c('leaving','dol','exit')};
  const out=[];for(const r of rows.slice(H.h+1)){const n=String(r[ci.n]||'').trim();if(!n||/^total/i.test(n))continue;const g=k=>ci[k]>=0?num(r[ci[k]]):0,s=k=>ci[k]>=0?String(r[ci[k]]||'').trim():'';
    out.push({code:s('code'),n,pan:s('pan').toUpperCase(),uan:s('uan'),esic:s('esic'),bank:s('bank').replace(/\s/g,''),days:g('days'),gross:g('gross'),basic:g('basic')+g('da'),pfw:g('pfw'),pf:g('pf'),esi:g('esi'),pt:g('pt'),tds:g('tds'),ded:g('ded'),net:g('net'),doj:ymdOf(s('doj')),dol:ymdOf(s('dol'))})}
  if(!out.length)throw new Error('No employees found under the header.');return out}
function payCheck(M,prev,ch){
  const R=M.rows,X=[],add=(e,k,t)=>X.push({e,k,t});
  const dupOf=key=>{const m={};for(const e of R){const v=e[key];if(v&&v.length>3)(m[v]=m[v]||[]).push(e)}return Object.values(m).filter(L=>L.length>1)};
  for(const L of dupOf('bank'))for(const e of L)add(e,'ghost',`Bank account shared with ${L.filter(x=>x!==e).map(x=>x.n).join(', ')}`);
  for(const L of dupOf('pan'))for(const e of L)add(e,'ghost',`PAN shared with ${L.filter(x=>x!==e).map(x=>x.n).join(', ')}`);
  for(const L of dupOf('uan'))for(const e of L)add(e,'ghost',`UAN shared with ${L.filter(x=>x!==e).map(x=>x.n).join(', ')}`);
  for(const e of R){
    if(!e.bank)add(e,'kyc','No bank account (paid in cash?)');if(!e.pan&&e.gross*12>250000)add(e,'kyc','No PAN');
    if(e.pf||e.pfw||e.basic){const w=e.pfw||e.basic,full=Math.round(w*0.12),cap=Math.round(Math.min(w,15000)*0.12);if(w&&e.pf&&Math.abs(e.pf-full)>1&&Math.abs(e.pf-cap)>1)add(e,'pf',`PF ${inr(e.pf)} is not 12% of PF wages ${inr(w)} (expected ${inr(cap)}${full!==cap?' or '+inr(full):''})`);if(w&&!e.pf&&w<=15000)add(e,'pf','PF wages up to ₹15,000 but no PF deducted');if(e.pf&&!e.uan)add(e,'kyc','PF deducted but no UAN')}
    if(e.gross){const due=e.gross<=21000?Math.ceil(e.gross*0.0075):0;if(due&&Math.abs(e.esi-due)>1)add(e,'esi',`ESI should be ${inr(due)} (0.75% of gross ${inr(e.gross)}); deducted ${inr(e.esi)}`);if(!due&&e.esi)add(e,'esi',`ESI deducted though gross ${inr(e.gross)} is above ₹21,000 (correct only within a contribution period)`)}
    if(e.gross&&e.net){const ded=e.ded||R2(e.pf+e.esi+e.pt+e.tds);if(Math.abs(R2(e.gross-ded-e.net))>1&&!e.ded)add(e,'net',`Net ${inr(e.net)} ≠ gross ${inr(e.gross)} − PF, ESI, PT, TDS ${inr(ded)}`);else if(e.ded&&Math.abs(R2(e.gross-e.ded-e.net))>1)add(e,'net',`Net ${inr(e.net)} ≠ gross − total deductions ${inr(R2(e.gross-e.ded))}`)}
    if(e.dol&&e.dol<M.mk+'-01'&&e.net)add(e,'exit','Paid after the leaving date '+fmtD(e.dol))}
  const pm=prev?new Map(prev.rows.map(e=>[e.code||e.n,e])):null,join=[],left=[],jump=[];
  if(pm){const cm=new Map(R.map(e=>[e.code||e.n,e]));for(const e of R){const p=pm.get(e.code||e.n);if(!p)join.push(e);else if(p.gross&&e.gross&&Math.abs(e.gross-p.gross)/p.gross>0.2)jump.push({e,p})}for(const [k,p] of pm)if(!cm.has(k))left.push(p)}
  const T=k=>R2(R.reduce((s,e)=>s+(e[k]||0),0)),tot={gross:T('gross'),pf:T('pf'),esi:T('esi'),pt:T('pt'),tds:T('tds'),net:T('net')};
  const cmp=[['pf','PF (employees\' share) vs ECR / challan',ch.pf],['esi','ESI (employees\' share) vs challan',ch.esi],['tds','TDS on salary vs challan',ch.tds],['net','Net pay vs bank salary transfer',ch.net]].map(([k,l,v])=>({k,l,book:tot[k],ch:v===''||v==null?null:+v,diff:v===''||v==null?null:R2(tot[k]-(+v))}));
  return{X,join,left,jump,tot,cmp}}
function payTab(c,d){
  const P=d.pay||{months:{}},ms=Object.keys(P.months).sort(),cur=ms.includes(ui.payM)?ui.payM:ms[ms.length-1];
  let h=`<div class="grid2 even" style="margin-bottom:12px"><label class="drop" data-drop="payreg">${ic('up')}<b>Salary register for a month: CSV or Excel</b><span class="small">Employee code, name, PAN, UAN, ESIC no., bank a/c, gross, basic (+DA), PF, ESI, PT, TDS, net, joining / leaving dates.</span><input type="file" data-file="payreg" accept=".csv,.xlsx,.xls" hidden></label>
   <div class="panel"><label class="f">Month of the register you upload<select data-paynewm="1">${fyMonths(fyNow()).map(m=>`<option value="${m}" ${(ui.payNew||ms[ms.length-1]||fyMonths(fyNow())[0])===m?'selected':''}>${mkLabel(m)}</option>`).join('')}</select></label>${ms.length?`<label class="f" style="margin-top:8px">Show<select data-paym="1">${ms.map(m=>`<option value="${m}" ${m===cur?'selected':''}>${mkLabel(m)}</option>`).join('')}</select></label>`:''}</div></div>`;
  if(!cur)return h+concBox(d,'pay');
  const M=P.months[cur],prev=P.months[ms[ms.indexOf(cur)-1]],ch=M.ch||{},r=payCheck({...M,mk:cur},prev,ch),K={ghost:'Possible ghost employee',kyc:'Missing KYC',pf:'PF',esi:'ESI',net:'Net pay',exit:'Paid after exit'};
  h+=`<div class="kpis"><div class="kpi"><b>${M.rows.length}</b><span>Employees · ${mkLabel(cur)}</span></div><div class="kpi"><b>${inrc(r.tot.gross)}</b><span>Gross salary</span></div><div class="kpi ${r.X.some(x=>x.k==='ghost')?'alert':''}"><b>${new Set(r.X.filter(x=>x.k==='ghost').map(x=>x.e)).size}</b><span>Possible ghost employees</span></div><div class="kpi ${r.X.filter(x=>x.k!=='ghost').length?'alert':''}"><b>${r.X.filter(x=>x.k!=='ghost').length}</b><span>Other exceptions</span></div>${prev?`<div class="kpi"><b>+${r.join.length} / −${r.left.length}</b><span>Joined / left vs ${mkLabel(ms[ms.indexOf(cur)-1])}</span></div>`:''}</div>
   <div class="grid2 even"><div class="panel"><h3>Totals vs challans and bank</h3><table><thead><tr><th></th><th class="num">Register</th><th class="num">Challan / bank</th><th class="num">Difference</th></tr></thead><tbody>${r.cmp.map(x=>`<tr><td>${x.l}</td><td class="num">${inr(x.book)}</td><td class="num"><input type="number" step="0.01" data-paych="${x.k}" value="${x.ch??''}" style="width:9em;text-align:right"></td><td class="num">${x.diff==null?'—':sgn(x.diff)}</td></tr>`).join('')}<tr><td>Professional tax deducted</td><td class="num">${inr(r.tot.pt)}</td><td></td><td></td></tr></tbody></table></div>
   <div class="panel"><h3>Changes from last month</h3>${prev?`<p class="small"><b>Joined:</b> ${r.join.map(e=>esc(e.n)).join(', ')||'none'}</p><p class="small"><b>Left:</b> ${r.left.map(e=>esc(e.n)).join(', ')||'none'}</p><p class="small"><b>Gross changed by over 20%:</b> ${r.jump.map(({e,p})=>esc(e.n)+' ('+inr(p.gross)+' → '+inr(e.gross)+')').join(', ')||'none'}</p><p class="small muted">Check appointment letters for joiners, full and final settlement for leavers, and approvals for pay changes.</p>`:'<p class="small muted">Upload the previous month too, to see joiners, leavers and pay changes.</p>'}</div></div>
   <div class="panel" style="margin-top:12px"><h3>Exceptions (${r.X.length})</h3>${r.X.length?`<div class="scroll"><table class="stack"><thead><tr><th>Employee</th><th>Check</th><th>Detail</th></tr></thead><tbody>${r.X.map(x=>`<tr><td><b>${esc(x.e.n)}</b><div class="small muted">${esc(x.e.code)}</div></td><td><span class="tag ${x.k==='ghost'||x.k==='exit'?'r':'y'}">${K[x.k]}</span></td><td>${esc(x.t)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="small">No exceptions.</p>'}</div>
   ${r.X.length||r.cmp.some(x=>x.diff!=null&&Math.abs(x.diff)>1)?`<div class="row" style="margin-top:8px"><button class="btn ghost sm" data-act="pObs" data-v="pay">${ic('flag')}Raise observation</button></div>`:''}`;
  return h+concBox(d,'pay')}

/* ---------- Form 26AS vs books ---------- */
function parse26AS(text,rows){
  /* TRACES text file ('^' separated): deductor lines carry the TAN and three totals; or a CSV / Excel with Deductor, TAN, Amount, TDS */
  const out=[];
  if(text){for(const line of text.split(/\r?\n/)){const f=line.split('^').map(x=>x.trim());const ti=f.findIndex(x=>/^[A-Z]{4}\d{5}[A-Z]$/.test(x));if(ti<1)continue;const nums=f.slice(ti+1).filter(x=>/^-?[\d,]+(\.\d+)?$/.test(x)).map(num);if(nums.length<2)continue;
      const name=f[ti-1]||f.slice(0,ti).filter(Boolean).pop();if(out.some(o=>o.tan===f[ti]))continue;out.push({name,tan:f[ti],paid:nums[nums.length-3]??nums[0],tds:nums[nums.length-2]??nums[1]})}}
  else if(rows){const H=findHeader(rows,r=>r.some(v=>/tan/.test(v))&&r.some(v=>/tds|tax deducted/.test(v)));if(!H)throw new Error('No header with TAN and TDS columns.');const c=(...k)=>hcol(H.head,...k),ci={n:c('deductor','name','party'),tan:c('tan'),paid:c('amount paid','paid','credited','amount'),tds:c('tds deposited','tax deducted','tds')};
    for(const r of rows.slice(H.h+1)){const tan=String(r[ci.tan]||'').trim().toUpperCase();if(!/^[A-Z]{4}\d{5}[A-Z]$/.test(tan))continue;const o=out.find(x=>x.tan===tan);const p=num(r[ci.paid]),t=num(r[ci.tds]);if(o){o.paid+=p;o.tds+=t}else out.push({name:String(r[ci.n]||''),tan,paid:p,tds:t})}}
  if(!out.length)throw new Error('No deductor rows with a TAN were found. Use the Form 26AS text file from TRACES, or a CSV with Deductor, TAN, Amount, TDS.');return out}
const nameKey=s=>String(s||'').toLowerCase().replace(/\b(pvt|private|ltd|limited|llp|the|and|co|company|india|m\/s|ms)\b|[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2);
function as26Calc(c,d){
  const A=d.as26?.rows||[],B=d.led?.tdsr||[],bp={};for(const x of B){bp[x.party]=(bp[x.party]||0)+x.amt}
  const used=new Set(),rows=A.map(a=>{const k=nameKey(a.name);let best=null,bs=0;for(const p of Object.keys(bp)){if(used.has(p))continue;const q=nameKey(p),i=q.filter(w=>k.includes(w)).length,sc=i/Math.max(1,Math.min(k.length,q.length));if(sc>bs){bs=sc;best=p}}if(bs<0.5)best=null;if(best)used.add(best);return{...a,party:best,books:best?R2(bp[best]):0,diff:R2(a.tds-(best?bp[best]:0))}});
  const only=Object.keys(bp).filter(p=>!used.has(p)).map(p=>({party:p,books:R2(bp[p])}));
  return{rows,only,t26:R2(A.reduce((s,x)=>s+x.tds,0)),tb:R2(B.reduce((s,x)=>s+x.amt,0))}}
function as26Tab(c,d){
  const has=!!d.as26;let h=`<div class="grid2 even" style="margin-bottom:12px"><label class="drop" data-drop="as26">${ic('up')}<b>Form 26AS: text or PDF from TRACES, or CSV / Excel</b><span class="small">${has?esc(d.as26.file)+' · '+d.as26.rows.length+' deductors':'TRACES › View Tax Credit (Form 26AS) › export as Text. Or a list with Deductor, TAN, Amount paid, TDS.'}</span><input type="file" data-file="as26" accept=".txt,.pdf,.csv,.xlsx,.xls" hidden></label>
   <div class="panel small">Books: entries on TDS receivable / recoverable ledgers, by party, from the books imported on the Programme tab${d.led?.tdsr?` (${d.led.tdsr.length} entries)`:': import the books to fill this'}.</div></div>`;
  if(!has)return h+concBox(d,'as26');const r=as26Calc(c,d);
  h+=`<div class="kpis"><div class="kpi"><b>${inrc(r.t26)}</b><span>TDS in Form 26AS</span></div><div class="kpi"><b>${inrc(r.tb)}</b><span>TDS receivable in books</span></div><div class="kpi ${Math.abs(R2(r.t26-r.tb))>1?'alert':'good'}"><b>${inrc(R2(r.t26-r.tb))}</b><span>Difference</span></div></div>
   <div class="panel"><div class="scroll"><table class="stack"><thead><tr><th>Deductor (26AS)</th><th>TAN</th><th class="num">Amount paid / credited</th><th class="num">TDS (26AS)</th><th>Party in books</th><th class="num">TDS (books)</th><th class="num">Difference</th></tr></thead><tbody>${r.rows.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.tan)}</td><td class="num">${inr(x.paid)}</td><td class="num">${inr(x.tds)}</td><td>${x.party?esc(x.party):'<span class="tag y">Not in books</span>'}</td><td class="num">${inr(x.books)}</td><td class="num">${sgn(x.diff)}</td></tr>`).join('')}${r.only.map(x=>`<tr><td><span class="tag r">Not in 26AS</span></td><td></td><td></td><td class="num">—</td><td>${esc(x.party)}</td><td class="num">${inr(x.books)}</td><td class="num">${sgn(-x.books)}</td></tr>`).join('')}</tbody></table></div>
   <p class="small muted">TDS in the books but not in 26AS: the customer has not deposited or filed it, so the credit cannot be claimed; follow up with the customer. TDS in 26AS but not in the books: income or TDS not recorded.</p></div>`;
  return h+concBox(d,'as26')}

/* ---------- GST filing dates copied from the portal ---------- */
function parseFilings(text){
  /* lines such as "GSTR3B  October 2026  Filed  20/11/2026  AA331126xxxxxx" from the portal's Track Return Status / View Filed Returns */
  const out=[],MN=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  for(const line of String(text).split(/\r?\n/)){const s=line.replace(/\s+/g,' ').trim();if(!s)continue;const ret=/gstr[- ]?3b/i.test(s)?'g3':/gstr[- ]?1\b|gstr[- ]?1 /i.test(s+' ')?'g1':/gstr[- ]?9c?/i.test(s)?'g9':null;if(!ret)continue;
    let m=null;const mm=s.toLowerCase().match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/);if(mm)m=MN.indexOf(mm[1])+1;const pm=s.match(/\b(0[1-9]|1[0-2])(20\d\d)\b/);if(!m&&pm)m=+pm[1];
    const dts=[...s.matchAll(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/g)].map(x=>`${x[3]}-${x[2].padStart(2,'0')}-${x[1].padStart(2,'0')}`);const arn=(s.match(/\b[A-Z]{2}\d{2}\d{4}\d{6,}[A-Z0-9]*\b/)||[''])[0];
    if(!dts.length)continue;out.push({ret,m,date:dts[dts.length-1],arn})}
  return out}
function applyFilings(c,text){const d=pOpen(c),L=parseFilings(text);let n=0;for(const f of L){const k=f.ret==='g9'?'g9':f.m?f.ret+'-'+f.m:null;if(!k)continue;d.comp.done={...d.comp.done,[k]:{...(d.comp.done?.[k]||{}),date:f.date,note:f.arn?'ARN '+f.arn:'From the GST portal'}};n++}savep(d);toast(n?n+' filing dates filled in':'No return lines with a date were found')}

/* ---------- hooks into the procedures ---------- */
const _pStatus=pStatus;pStatus=function(k,c,a){
  if(k==='pay'){if(a&&a.na?.pay)return{st:'na',text:'Not applicable: '+a.na.pay};const d=pOpen(c),ms=Object.keys(d.pay?.months||{});if(!ms.length)return{st:'todo',text:'No salary register yet'};const last=ms.sort().pop(),r=payCheck({...d.pay.months[last],mk:last},null,d.pay.months[last].ch||{});return{st:d.conc?.pay?.st||(!r.X.length&&r.cmp.every(x=>x.diff==null||Math.abs(x.diff)<=1))?'done':'doing',text:`${ms.length} month${ms.length===1?'':'s'} · ${r.X.length} exception${r.X.length===1?'':'s'} in ${mkLabel(last)}`}}
  if(k==='as26'){const d=pOpen(c);if(!d.as26)return{st:'opt',text:'Optional: where customers deduct TDS'};const r=as26Calc(c,d);return{st:d.conc?.as26?.st?'done':'opt',text:`26AS ${inr(r.t26)} vs books ${inr(r.tb)}`}}
  return _pStatus(k,c,a)};
const _procTab=procTab;procTab=function(a,c){
  const k=ui.ptab,d=pOpen(c);
  if(k==='pay'||k==='as26'){const prog=programmeOf(a),more=PK.filter(x=>!prog.includes(x)),pill=(x,dim)=>{const s=pStatus(x,c,a);return `<button class="chip" data-act="ptab" data-v="${x}" style="${k===x?'border-color:var(--acc);color:var(--acc-ink);font-weight:700;':''}${dim?'opacity:.75':''}"><span style="color:var(--${s.st==='done'?'ok':s.st==='todo'?'hi':'muted'})">●</span> ${esc(PR[x].n)}</button>`};
    return `<div class="row" style="gap:6px;margin-bottom:6px">${prog.map(x=>pill(x)).join('')}</div>${more.length?`<details ${more.includes(k)?'open':''} style="margin-bottom:12px"><summary class="small muted" style="cursor:pointer">More procedures</summary><div class="row" style="gap:6px;margin-top:6px">${more.map(x=>pill(x,1)).join('')}</div></details>`:''}
     <div class="row" style="margin:4px 0 12px"><h2 class="sp" style="margin:0;font-size:18px">${esc(PR[k].n)}</h2><span class="tag n">${esc(PR[k].ref)}</span></div><p class="small muted" style="margin:-6px 0 12px">${esc(PR[k].why)}</p>${k==='pay'?payTab(c,d):as26Tab(c,d)}${reviewBox(a,'proc:'+k,PR[k].n)}`}
  return _procTab(a,c).replace(/(<p class="small muted" style="margin:-6px 0 12px">[\s\S]*?<\/p>)/,`$1<div style="margin:-6px 0 10px">${reviewBox(a,'proc:'+(PK.includes(k)?k:programmeOf(a)[0]),PR[PK.includes(k)?k:programmeOf(a)[0]]?.n)}</div>`)};
const _ledgers=ledgersFromBooks;ledgersFromBooks=function(V){const L=_ledgers(V);const T=[];
  for(const v of V)for(const e of v.E)if(/tds|tax deducted/i.test(e.l)&&/receivable|recoverable|advance|refund|26as/i.test(e.l)&&e.dr){const other=v.party||v.E.find(x=>x.l!==e.l&&!x.dr)?.l||'';T.push({d:v.d,party:other,amt:R2(e.a),vno:v.vno})}
  return{...L,tdsr:T}};
const _compTab=compTab;compTab=function(c,d){return `<details style="margin-bottom:10px"><summary class="small" style="cursor:pointer"><b>Fill GST filing dates from the portal</b> (paste the lines of Track Return Status / View Filed Returns)</summary><form data-filings="1" style="margin-top:6px"><textarea name="t" rows="4" style="width:100%" placeholder="GSTR3B  October 2026  Filed  20/11/2026  AA3311260123456"></textarea><button class="btn sm" type="submit" style="margin-top:6px">Fill in the dates</button></form></details>`+_compTab(c,d)};
const _progRep=programmeReport;programmeReport=function(a){let h=_progRep(a);const c=S.clients.find(x=>x.id===a.clientId);if(!c)return h;const d=pOpen(c),has=k=>programmeOf(a).includes(k);
  if(has('pay')){const ms=Object.keys(d.pay?.months||{}).sort();if(ms.length){const m=ms[ms.length-1],r=payCheck({...d.pay.months[m],mk:m},d.pay.months[ms[ms.length-2]],d.pay.months[m].ch||{});h+=`<h3>Payroll verification: ${mkLabel(m)}</h3><p>${d.pay.months[m].rows.length} employees, gross ${inr(r.tot.gross)}. ${r.X.length} exceptions: ${[...new Set(r.X.map(x=>x.k))].map(k=>({ghost:'possible ghost employees',kyc:'missing KYC',pf:'PF',esi:'ESI',net:'net pay',exit:'paid after exit'}[k])).join(', ')||'none'}.${r.cmp.filter(x=>x.diff!=null).map(x=>' '+x.l+': difference '+inr(x.diff)+'.').join('')}</p>`}}
  if(has('as26')&&d.as26){const r=as26Calc(c,d);h+=`<h3>Form 26AS vs books</h3><p>TDS in Form 26AS ${inr(r.t26)}, TDS receivable in books ${inr(r.tb)}, difference ${inr(R2(r.t26-r.tb))}; ${r.rows.filter(x=>!x.party).length} deductors not in the books, ${r.only.length} parties in the books not in 26AS.</p>`}
  return h};
Object.assign(ACT,{});
const _pObs=ACT.pObs;ACT.pObs=t=>{if(t.dataset.v!=='pay')return _pObs(t);const c=C(),d=pOpen(c),ms=Object.keys(d.pay.months).sort(),m=ms[ms.length-1],r=payCheck({...d.pay.months[m],mk:m},d.pay.months[ms[ms.length-2]],d.pay.months[m].ch||{});
  newObs({clientId:c.id,auditId:A()?.id||'',title:'Payroll exceptions: '+mkLabel(m),rating:r.X.some(x=>x.k==='ghost'||x.k==='exit')?'H':'M',condition:r.X.slice(0,12).map(x=>x.e.n+': '+x.t).join('; ')+(r.cmp.filter(x=>x.diff!=null&&Math.abs(x.diff)>1).map(x=>'; '+x.l+' differs by '+inr(x.diff)).join('')),criteria:'Salary paid only to genuine employees as per approved terms; PF at 12% of PF wages, ESI at 0.75% of gross up to ₹21,000, deposited in full (Code on Social Security 2020).',effect:'Payments to ghost or exited employees; interest and damages on PF / ESI; employee claims.',rec:'Investigate shared accounts and PAN; correct PF / ESI computation and deposit differences; stop pay on exit; reconcile payroll with challans every month.'})};
document.addEventListener('change',e=>{const t=e.target,ds=t.dataset;if(ds.paynewm){ui.payNew=t.value;return}if(ds.paym){ui.payM=t.value;return render()}
  if(ds.paych){const c=C(),d=pOpen(c),m=ui.payM&&d.pay?.months?.[ui.payM]?ui.payM:Object.keys(d.pay.months).sort().pop();d.pay.months[m].ch={...(d.pay.months[m].ch||{}),[ds.paych]:t.value};savep(d)}});
document.addEventListener('submit',e=>{const f=e.target;if(!f.dataset.filings)return;e.preventDefault();applyFilings(C(),String(new FormData(f).get('t')||''))},true);
const _procFiles=procFiles;procFiles=async function(c,kind,files,i){const f=files[0];
  if(kind==='payreg'){try{const rows=await readSheet(f),R=parsePayroll(rows),d=pOpen(c),m=ui.payNew||fyMonths(fyNow())[0];d.pay={months:{...(d.pay?.months||{}),[m]:{file:f.name,rows:R,ch:d.pay?.months?.[m]?.ch||{}}}};ui.payM=m;await savep(d);await pEv(c,f,'Salary register '+mkLabel(m));toast(R.length+' employees read for '+mkLabel(m))}catch(e){toast(e.message||String(e))}return}
  if(kind==='as26'){try{const d=pOpen(c),x=extOf(f.name),R=x==='txt'?parse26AS(decodeBuf(await f.arrayBuffer())):x==='pdf'?parse26AS((await readPdfRows(f,{mode:'lines'})).map(r=>r.join('^')).join('\n')):parse26AS(null,await readSheet(f));d.as26={file:f.name,rows:R};await savep(d);await pEv(c,f,'Form 26AS');toast(R.length+' deductors read from Form 26AS')}catch(e){toast(e.message||String(e))}return}
  return _procFiles(c,kind,files,i)};
