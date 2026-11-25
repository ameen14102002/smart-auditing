/* Smart Auditing — the rectification loop: Find → Prove → Discuss → Fix → Re-test.
   Auditor + Analyser + Developer, in one module:
   - Materiality (SIA 320): overall / performance / trivial, from the client master, linked to findings.
   - Journal-entry testing (SIA 11 / fraud): period-end cut-off, round sums, large, Sunday, narration keywords, duplicates.
   - Findings hub: every exception from every procedure in one list, one click to a draft finding.
   - Finding quality gate (SIA 370): no finding goes to management until cause, effect, recommendation, owner and date are filled.
   - Closure enforcement (SIA 390): high-risk findings cannot close without evidence and a re-test note.
   - Escalation + Audit Committee pack: repeat / overdue high findings escalate to the Audit Committee.
   - Confirmation tracker, approved audit plan, report lock with version history, reviewer gate before reporting.
   The pure core at the top is testable in Node (tests/rectify.test.js); browser wiring below it is guarded. */

/* ================= pure core (no browser globals) ================= */

/* Materiality in ₹. Benchmarks (₹ crore on the client master): 1% of turnover,
   5% of profit before tax (if positive), 1% of net worth. Overall is the lowest
   available benchmark; performance 60%, trivial 5% (SIA 320). An auditor override
   on the client (c.mat.overall, in ₹) wins. */
function matOf(c){
  c=c||{};const cr=n=>+c[n]||0;
  const bench=[];
  if(cr('turnover')>0)bench.push({name:'1% of turnover',v:cr('turnover')*1e7*0.01});
  if(cr('profit')>0)bench.push({name:'5% of profit before tax',v:cr('profit')*1e7*0.05});
  if(cr('networth')>0)bench.push({name:'1% of net worth',v:cr('networth')*1e7*0.01});
  let overall=0,basis='Set materiality';
  if(c.mat&&+c.mat.overall>0){overall=+c.mat.overall;basis='Auditor override'}
  else if(bench.length){const b=bench.reduce((m,x)=>x.v<m.v?x:m,bench[0]);overall=b.v;basis=b.name}
  overall=Math.round(overall);
  return{overall,perf:Math.round(overall*0.6),trivial:Math.round(overall*0.05),basis,bench};
}
function matAssess(amount,mat){
  amount=Math.abs(+amount||0);
  if(!mat||!mat.overall||amount<=0)return{level:'unknown',label:'Amount not assessed'};
  if(amount>=mat.overall)return{level:'overall',label:'Above overall materiality'};
  if(amount>=mat.perf)return{level:'perf',label:'Above performance materiality'};
  if(amount>=mat.trivial)return{level:'trivial',label:'Above trivial (clearly trivial) threshold'};
  return{level:'below',label:'Below trivial threshold'};
}

/* Journal-entry testing. Rows: {d:'YYYY-MM-DD', vno, party, ledger, amount, nar, type}.
   Returns the same shape as the ledger data tests: {rows, res:[{key,name,why,total,hits}]}. */
function _jDate(s){const m=String(s||'').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(!m)return null;return{y:+m[1],mo:+m[2],d:+m[3]}}
function _jDow(dt){return new Date(Date.UTC(dt.y,dt.mo-1,dt.d)).getUTCDay()}
function _jDim(dt){return new Date(Date.UTC(dt.y,dt.mo,0)).getUTCDate()}
function _jDiff(a,b){return Math.round((Date.UTC(a.y,a.mo-1,a.d)-Date.UTC(b.y,b.mo-1,b.d))/864e5)}
function journalTest(rows,opts){
  opts=opts||{};const mat=+opts.materiality||0;
  const D=(rows||[]).map(r=>({d:String(r.d||''),dt:_jDate(r.d),vno:String(r.vno||''),party:String(r.party||r.ledger||''),amount:Math.abs(+r.amount||0),nar:String(r.nar||r.party||r.ledger||'')})).filter(x=>x.dt&&x.amount>0);
  const pack=(key,name,why,L)=>({key,name,why,total:L.length,hits:L.slice().sort((a,b)=>b.amount-a.amount).slice(0,40).map(x=>({date:x.d,party:x.party||x.vno,amount:x.amount}))});
  const cutoff=D.filter(x=>x.dt.d>_jDim(x.dt)-5||x.dt.d<=3);
  const round=D.filter(x=>x.amount>=10000&&x.amount%1000===0);
  const large=mat>0?D.filter(x=>x.amount>=mat):[];
  const sunday=D.filter(x=>_jDow(x.dt)===0);
  const narr=D.filter(x=>/adjust|provision|reversal|suspense|write.?off|transfer|rectif|adhoc|ad hoc|balancing|true.?up/i.test(x.nar));
  const seen={},dup=[];for(const x of D){const k=(x.party||'').toLowerCase()+'|'+x.amount+'|'+x.d;(seen[k]=seen[k]||[]).push(x)}for(const k in seen)if(seen[k].length>1)dup.push(...seen[k]);
  return{rows:D.length,res:[
    pack('cutoff','Period-end and cut-off entries','Entries in the last 5 or first 3 days of a month. Check sales, purchases and journals around the period end for cut-off errors and management override (SIA 11).',cutoff),
    pack('round','Round-sum journals','Amounts of ₹10,000 or more in exact thousands; often estimates, provisions or unsupported entries.',round),
    pack('large','Journals at or above overall materiality',mat>0?`Entries of ${mat.toLocaleString('en-IN')} or more (overall materiality). Vouch each one in full.`:'Set overall materiality on the client to run this test.',large),
    pack('sunday','Entries dated on a Sunday','Check for back-dated or unauthorised postings.',sunday),
    pack('narration','Journals with adjustment / suspense narrations','Narrations mentioning adjustment, provision, reversal, suspense, write-off, transfer or balancing. Read each one and trace it to support.',narr),
    pack('duplicate','Duplicate journals','Same party, amount and date more than once.',dup)]};
}

/* Finding quality gate (SIA 370): criteria, condition, cause, effect, recommendation,
   plus owner and target date, are required before a finding goes to management. */
const FINDING_FIELDS=[['title','Title'],['condition','Condition'],['criteria','Criteria'],['cause','Cause'],['effect','Effect'],['rec','Recommendation'],['owner','Action owner'],['due','Target date']];
function findingGaps(o){
  o=o||{};return FINDING_FIELDS.filter(([k])=>!String(o[k]||'').trim()).map(([,l])=>l);
}
function findingReady(o){return findingGaps(o).length===0}

/* Closure enforcement (SIA 390): high risk needs evidence and a re-test note. */
function closureGaps(o){
  o=o||{};const g=[];
  if(o.rating==='H'&&!(o.evidence||[]).length)g.push('High-risk closure needs evidence attached');
  if(o.rating==='H'&&!String(o.verify?.note||'').trim())g.push('High-risk closure needs a re-test note (what was seen)');
  if(o.status==='Closed'&&!o.verify)g.push('Closure not verified (SIA 390)');
  return g;
}

/* Opinion framework: stated criteria, applied the same way every time. */
function opinionFor(obs,todayStr){
  const open=(obs||[]).filter(o=>o.status!=='Closed');
  const overdue=o=>o.due&&o.due<todayStr;
  if(open.some(o=>o.rating==='H'&&(o.repeat||overdue(o))))return'Unsatisfactory';
  if(open.some(o=>o.rating==='H'||o.rating==='M'))return'Needs improvement';
  return'Satisfactory';
}
function opinionCriteria(){
  return[['Unsatisfactory','Any open high-risk finding that is overdue or a repeat of an earlier finding'],
    ['Needs improvement','Any open high- or medium-risk finding'],
    ['Satisfactory','No open high- or medium-risk findings']];
}

/* Escalation list (pure): open findings that are high-risk and over 30 days late, or repeats. */
function escalationList(obs,todayStr){
  const t=_jDate(todayStr);if(!t)return[];
  return(obs||[]).filter(o=>{
    if(o.status==='Closed')return false;
    const late=o.due&&_jDate(o.due)?_jDiff(t,_jDate(o.due)):0;
    return(o.rating==='H'&&late>30)||!!o.repeat;
  }).sort((a,b)=>'HML'.indexOf(a.rating||'M')-'HML'.indexOf(b.rating||'M')||String(b.due||'').localeCompare(String(a.due||'')));
}

if(typeof module!=='undefined'&&module.exports){
  module.exports={matOf,matAssess,journalTest,findingGaps,findingReady,closureGaps,opinionFor,opinionCriteria,escalationList,FINDING_FIELDS};
}

/* ================= browser wiring ================= */
if(typeof document!=='undefined'){

/* ---------- materiality ---------- */
function matPanel(c){
  const m=matOf(c);
  return `<div class="panel" style="margin-top:14px"><h3>Materiality (SIA 320)</h3>
   <p class="small muted" style="margin:-4px 0 8px">Overall materiality drives sample sizes and whether a finding matters. Suggested from the client master: ${m.bench.length?m.bench.map(b=>`${esc(b.name)} = ${inr(b.v)}`).join(' · '):'no benchmarks (enter last year figures)'}.</p>
   <div class="kpis"><div class="kpi"><b>${m.overall?inr(m.overall):'—'}</b><span>Overall · ${esc(m.basis)}</span></div><div class="kpi"><b>${m.perf?inr(m.perf):'—'}</b><span>Performance (60%)</span></div><div class="kpi"><b>${m.trivial?inr(m.trivial):'—'}</b><span>Trivial (5%)</span></div></div>
   <div class="form" style="margin-top:10px"><label class="f">Overall materiality (₹)<input id="mat-overall" type="number" min="0" step="any" value="${c.mat?.overall||m.overall||''}" placeholder="Leave blank for the suggested figure"></label>
   <label class="f">Set by<input id="mat-by" value="${esc(c.mat?.by||'')}" placeholder="Auditor name"></label></div>
   <div class="row" style="margin-top:8px"><button class="btn sm" data-act="matSave">${ic('check')}Save materiality</button>${m.overall?`<button class="btn ghost sm" data-act="matUse">Use suggested ${inr(m.overall)}</button>`:''}</div>
   <p class="small muted" style="margin:8px 0 0">Findings show their amount against these thresholds. Vouching tolerable error should be set at or below performance materiality.</p></div>`;
}
function matSummary(c){
  const m=matOf(c);
  return `<div class="panel" style="margin-top:14px"><h3>Materiality</h3><p class="small" style="margin:0">Overall <b>${m.overall?inr(m.overall):'not set'}</b> · performance <b>${m.perf?inr(m.perf):'—'}</b> · trivial <b>${m.trivial?inr(m.trivial):'—'}</b> <span class="muted">(${esc(m.basis)})</span></p></div>`;
}

/* ---------- findings hub: every exception, one click to a finding ---------- */
function hubExceptions(a,c){
  const L=[],d=pOpen(c),m=matOf(c);
  const push=(title,condition,criteria,amount,rating,proc)=>L.push({title,condition,criteria,amount:+amount||0,rating:rating||'M',proc:proc||''});
  try{
    for(const r of(a.tests?.res||[]))if(r.total)push(r.name+' in '+a.title.toLowerCase(),`${r.total} entries found in ${a.tests.file} (${a.tests.rows} rows). Examples: `+r.hits.slice(0,3).map(h=>`${h.date} ${h.party} ${inr(h.amount)}`).join('; ')+'.',r.why,r.hits.reduce((s,h)=>s+(+h.amount||0),0),r.total>=10?'H':r.total>=3?'M':'L','tests');
    for(const r of(a.journal?.res||[]))if(r.total)push('Journal testing: '+r.name,`${r.total} journal entries flagged in ${a.journal.file} (${a.journal.rows} rows). Examples: `+r.hits.slice(0,3).map(h=>`${h.date} ${h.party} ${inr(h.amount)}`).join('; ')+'.',r.why,r.hits.reduce((s,h)=>s+(+h.amount||0),0),r.total>=10?'H':'M','tests');
    for(const ac of(d.brs?.accts||[])){const r=brsCalc(ac,d);
      if(r.stale?.length)push('Stale cheques in '+ac.name,`${r.stale.length} cheques issued over 3 months ago not presented (${inr(R2(r.stale.reduce((s,x)=>s+x.amt,0)))}).`,'Cheques outstanding over 3 months are stale and should be reversed / written back after follow-up (SIA 320).',r.stale.reduce((s,x)=>s+x.amt,0),'M','brs');
      if(r.diff!=null&&Math.abs(r.diff)>1)push('Unexplained BRS difference in '+ac.name,`Balance as per books differs from the reconciled bank balance by ${inr(Math.abs(r.diff))} as on ${r.asOf}.`,'The bank reconciliation must agree to the books; every difference needs an entry or an explanation.',Math.abs(r.diff),'H','brs');}
    for(const x of(d.cash?.counts||[])){const r=cashCalc(x);if(r.diff!=null&&Math.abs(r.diff)>1)push('Physical cash difference',`Cash counted ${inr(r.phy)} plus IOUs ${inr(r.iou)} against cash book ${inr(r.book)}: difference ${inr(Math.abs(r.diff))} on ${x.date||''}.`,'Physical cash must agree with the cash book; shortages need investigation and approval.',Math.abs(r.diff),'H','cash');}
    for(const s of['dr','cr']){const names=[...new Set([...Object.keys(d.led?.[s]||{}),...Object.keys(d.party[s].P)])];
      for(const n of names.slice(0,60)){const r=partyCalc(d,s,n);
        if(s==='cr'&&r.over45>0)push('MSME dues over 45 days: '+n,`Supplier balance ${inr(r.book)} with ${inr(r.over45)} outstanding over 45 days.`,'MSME dues must be paid within 45 days; interest under the MSMED Act is payable on delay.',r.over45,'H','crs');
        if(r.age&&r.age[4]>0)push((s==='dr'?'Debtor':'Creditor')+' over 180 days: '+n,`Balance ${inr(r.book)} with ${inr(r.age[4])} outstanding over 180 days.`,'Old balances need recovery action and, for debtors, provision review (SIA 320).',r.age[4],'M',s==='dr'?'drs':'crs');}}
    const comp=compRows(c,d).rows.filter(r=>r.st==='late'||r.st==='over');
    if(comp.length)push('Statutory filings late or overdue',`${comp.length} return(s) / payment(s) late or not filed: `+comp.slice(0,4).map(r=>`${r.what} (${r.per}, due ${r.due})`).join('; ')+'.','Returns and payments must be filed / paid by their due dates; interest and late fees apply (SIA 150).',0,'H','comp');
    const ar=arCalc(c);const unexpl=ar.rows.filter(x=>x.flag.length&&!d.ar?.notes?.[x.m]);
    if(unexpl.length)push('Unexplained analytical review months',unexpl.map(x=>`${mLabel(x.m)}: ${x.flag.join(', ')}`).join('; ')+'.','Unusual month-wise movements must be explained and evidenced (SIA 6).',0,'M','ar');
    const rd=rdoc(c);
    if(rd)for(const k of['r1','r2','r3','r4']){const r=recon(rd,k);if(r.state==='bad')push('GST reconciliation: '+RC[k],`Difference in tax ${inr(Math.abs(r.diffTax||0))} across ${r.both.length} month(s); ${r.bad} month(s) differ.`,'Books and portal returns must agree; differences need rectification or reversal (CGST Act).',Math.abs(r.diffTax||0),'H','gst');}
    const vd=vdoc(c);
    if(vd)for(const k of Object.keys(vd.types||{})){const r=vResults(vd.types[k]);if(r.total&&r.done===r.total&&!r.ok)push('Vouching projected error exceeds tolerable: '+VSHORT[k],`Projected misstatement ${inr(Math.round(r.proj))} against tolerable ${inr(Math.round(r.TM))} (${r.ex} exceptions in ${r.total} vouched).`,'Projected error above tolerable error needs more testing or a qualified conclusion (SIA 5).',r.proj,'H','vouch');}
  }catch(e){}
  return L.sort((x,y)=>'HML'.indexOf(x.rating)-'HML'.indexOf(y.rating)||y.amount-x.amount).slice(0,40);
}
function findingsHub(a,c){
  const L=hubExceptions(a,c);ui.hubList=L;
  if(!L.length)return `<div class="panel" style="margin-bottom:14px"><h3>Findings hub</h3><p class="small muted" style="margin:0">No exceptions found yet. Run the procedures below — every exception appears here with one click to a draft finding.</p></div>`;
  const m=matOf(c);
  return `<div class="panel" style="margin-bottom:14px"><div class="row"><h3 class="sp" style="margin:0">Findings hub — ${L.length} exception${L.length===1?'':'s'} to discuss</h3><span class="tag n">Overall materiality ${m.overall?inr(m.overall):'not set'}</span></div>
   <p class="small muted" style="margin:4px 0 8px">Every exception from every procedure, highest first. One click raises a draft finding with the amount and materiality assessment filled in — then complete cause, effect, recommendation, owner and date before sending it to management.</p>
   <div class="scroll"><table class="stack"><thead><tr><th>Exception</th><th>Rating</th><th class="num">Amount</th><th>Materiality</th><th></th></tr></thead><tbody>
   ${L.map((x,i)=>{const ma=matAssess(x.amount,m);return `<tr><td><b>${esc(x.title)}</b><div class="small muted">${esc(x.condition)}</div></td><td><span class="tag ${x.rating==='H'?'r':x.rating==='M'?'y':'g'}">${RLABEL[x.rating]}</span></td><td class="num">${x.amount?inr(x.amount):'—'}</td><td class="small">${esc(ma.label)}</td><td><button class="btn ghost sm" data-act="hubRaise" data-i="${i}">${ic('flag')}Raise finding</button></td></tr>`}).join('')}
   </tbody></table></div></div>`;
}

/* ---------- confirmation tracker ---------- */
function confPanel(c,d){
  const rows=[];
  for(const s of['dr','cr']){const names=[...new Set([...Object.keys(d.led?.[s]||{}),...Object.keys(d.party[s].P)])];
    for(const n of names){const p=d.party[s].P[n]||{};if(!(p.conf?.req||p.conf?.recv||p.sel))continue;const r=partyCalc(d,s,n);
      rows.push({s,n,book:r.book,req:!!p.conf?.req,recv:!!p.conf?.recv,stmt:!!p.stmt});}}
  if(!rows.length)return `<div class="panel" style="margin-top:14px"><h3>Confirmation tracker</h3><p class="small muted" style="margin:0">No confirmations started. In Debtors / Creditors, select parties for confirmation — they appear here until received.</p></div>`;
  const st=r=>r.recv?'<span class="tag g">Received</span>':r.req?'<span class="tag y">Sent</span>':r.stmt?'<span class="tag b">Statement reconciled</span>':'<span class="tag n">Not sent</span>';
  return `<div class="panel" style="margin-top:14px"><h3>Confirmation tracker (${rows.filter(r=>r.recv).length} of ${rows.length} received)</h3>
   <div class="scroll"><table class="stack"><thead><tr><th>Party</th><th>Side</th><th class="num">Balance</th><th>Status</th><th></th></tr></thead><tbody>
   ${rows.map(r=>`<tr><td><b>${esc(r.n)}</b></td><td>${SIDE[r.s].n}</td><td class="num">${inr(r.book)}</td><td>${st(r)}</td><td style="white-space:nowrap"><button class="btn ghost sm" data-act="confTgl" data-s="${r.s}" data-n="${esc(r.n)}" data-k="req">${r.req?'Unmark sent':'Mark sent'}</button><button class="btn ghost sm" data-act="confTgl" data-s="${r.s}" data-n="${esc(r.n)}" data-k="recv">${r.recv?'Unmark received':'Mark received'}</button></td></tr>`).join('')}
   </tbody></table></div><p class="small muted" style="margin:8px 0 0">Exceptions on received confirmations go into the findings hub as observations.</p></div>`;
}

/* ---------- approved audit plan ---------- */
function planPanel(c){
  const p=c.plan||{},t=c.terms||{};
  return `<div class="panel" style="margin-top:14px"><h3>Audit plan approval & engagement terms</h3>
   <p class="small muted" style="margin:-4px 0 8px">${p.approvedBy?`<span class="tag g">Plan approved by ${esc(p.approvedBy)} on ${fmtD(p.approvedAt)}</span>`:'<span class="tag y">Plan not yet approved</span>'} ${t.acceptedAt?`<span class="tag g">Terms accepted ${fmtD(t.acceptedAt)}</span>`:'<span class="tag y">Terms not accepted</span>'}</p>
   <div class="form"><label class="f wide">Scope of this year's internal audit<textarea id="plan-scope" rows="2" placeholder="Areas, period, and what is out of scope">${esc(p.scope||'')}</textarea></label>
   <label class="f">Approved by<input id="plan-by" value="${esc(p.approvedBy||'')}" placeholder="Audit Committee / management name"></label>
   <label class="f">Independence confirmed<input id="plan-ind" value="${esc(t.independence||'')}" placeholder="e.g. No conflict; team independent of operations"></label></div>
   <div class="row" style="margin-top:8px"><button class="btn sm" data-act="planSave">${ic('check')}Record approval</button></div></div>`;
}

/* ---------- Audit Committee pack + escalation ---------- */
function acPackBody(c){
  const obs=S.observations.filter(o=>o.clientId===c.id);
  const open=obs.filter(o=>o.status!=='Closed').map(o=>({...o,repeat:!!repeatOf(o)}));
  const op=opinionFor(open,today());
  const m=matOf(c),key=open.filter(o=>o.rating==='H'||o.repeat).sort((a,b)=>'HML'.indexOf(a.rating)-'HML'.indexOf(b.rating));
  const overdue=open.filter(o=>o.due&&o.due<today()).sort((a,b)=>String(a.due).localeCompare(String(b.due)));
  const d=pOpen(c),comp=compRows(c,d).rows.filter(r=>r.st==='late'||r.st==='over');
  const audits=S.audits.filter(a=>a.clientId===c.id);
  const esc=obs.filter(o=>o.escalated);
  return `<h1>${esc(c.name)}</h1><p><b>Audit Committee pack — internal audit</b> · prepared ${fmtD(today())} · FY ${esc(fyNow())}</p>
   <h2>1. Scope and materiality</h2><p>${audits.length} audit(s) this year. Overall materiality <b>${m.overall?inr(m.overall):'not set'}</b> (${esc(m.basis)}); performance ${m.perf?inr(m.perf):'—'}; trivial ${m.trivial?inr(m.trivial):'—'}. Plan: ${c.plan?.approvedBy?`approved by ${esc(c.plan.approvedBy)} on ${fmtD(c.plan.approvedAt)}`:'<b>not yet approved</b>'}${c.plan?.scope?`. Scope: ${esc(c.plan.scope)}`:''}.</p>
   <h2>2. Opinion: ${op}</h2><table><thead><tr><th>Opinion</th><th>When it applies</th></tr></thead><tbody>${opinionCriteria().map(([o,w])=>`<tr${o===op?' style="font-weight:700"':''}><td>${o}</td><td>${w}</td></tr>`).join('')}</tbody></table>
   <h2>3. Key findings (${key.length})</h2>${key.length?`<table><thead><tr><th>Finding</th><th>Rating</th><th>Owner</th><th>Agreed date</th><th>Repeat</th><th>Escalated</th></tr></thead><tbody>${key.map(o=>`<tr><td>${esc(o.title)}</td><td>${RLABEL[o.rating]}</td><td>${esc(o.owner||'—')}</td><td>${o.due?fmtD(o.due):'—'}</td><td>${o.repeat?'Yes':''}</td><td>${o.escalated?'Yes':'—'}</td></tr>`).join('')}</tbody></table>`:'<p>None.</p>'}
   <h2>4. Actions past the agreed date (${overdue.length})</h2>${overdue.length?`<table><thead><tr><th>Finding</th><th>Rating</th><th>Owner</th><th>Agreed date</th><th>Days late</th></tr></thead><tbody>${overdue.map(o=>`<tr><td>${esc(o.title)}</td><td>${RLABEL[o.rating]}</td><td>${esc(o.owner||'—')}</td><td>${fmtD(o.due)}</td><td>${dayDiff(today(),o.due)}</td></tr>`).join('')}</tbody></table>`:'<p>None.</p>'}
   <h2>5. Statutory compliance exceptions (${comp.length})</h2>${comp.length?`<table><thead><tr><th>Return / payment</th><th>Period</th><th>Due</th><th>Status</th></tr></thead><tbody>${comp.map(r=>`<tr><td>${esc(r.what)}</td><td>${esc(r.per)}</td><td>${fmtD(r.due)}</td><td>${r.st==='late'?'Late by '+r.late+' days':'Overdue'}</td></tr>`).join('')}</tbody></table>`:'<p>None.</p>'}
   <h2>6. Escalated to the Audit Committee (${esc.length})</h2>${esc.length?`<ul>${esc.map(o=>`<li>${esc(o.title)} — escalated ${o.escalatedAt?fmtD(o.escalatedAt.slice(0,10)):''}</li>`).join('')}</ul>`:'<p>None.</p>'}
   <p class="small">Prepared by internal audit. Findings are closed only after verification matched to risk (SIA 390): high risk re-tested, medium with documentary proof, low with management confirmation.</p>`;
}
function escalationPanel(){
  const all=S.observations.map(o=>({...o,repeat:!!repeatOf(o)}));
  const L=escalationList(all,today());
  if(!L.length)return `<div class="panel" style="margin-bottom:16px"><h3>Escalation to the Audit Committee</h3><p class="small muted" style="margin:0">Nothing to escalate: no open high-risk finding is over 30 days late and there are no repeat findings.</p></div>`;
  return `<div class="panel" style="margin-bottom:16px"><h3>Escalation to the Audit Committee (${L.length})</h3>
   <p class="small muted" style="margin:-4px 0 8px">High-risk findings over 30 days past the agreed date, and repeat findings, go to the Audit Committee. Escalating records the decision; the finding stays open until rectified and re-tested.</p>
   <div class="scroll"><table class="stack"><thead><tr><th>Client</th><th>Finding</th><th>Rating</th><th>Agreed date</th><th>Why escalate</th><th></th></tr></thead><tbody>
   ${L.map(o=>`<tr><td>${esc(cname(o.clientId))}</td><td><a href="#obs-${o.id}"><b>${esc(o.title)}</b></a></td><td><span class="tag r">${RLABEL[o.rating]}</span></td><td>${o.due?fmtD(o.due):'—'}</td><td class="small">${o.repeat?'Repeat finding':''}${o.repeat&&o.due&&o.due<today()?' · ':''}${o.due&&o.due<today()?dayDiff(today(),o.due)+' days late':''}</td><td>${o.escalated?'<span class="tag y">Escalated</span>':`<button class="btn ghost sm" data-act="escOne" data-id="${o.id}">Escalate</button>`}</td></tr>`).join('')}
   </tbody></table></div></div>`;
}

/* ---------- journal testing panel (in the Data tests tab) ---------- */
function journalPanel(a,c){
  const J=a.journal,m=matOf(c);
  return `<div class="panel" style="margin-top:14px"><h3>Journal-entry testing (SIA 11 · fraud)</h3>
   <p class="small muted" style="margin:-4px 0 8px">Upload the journal / ledger export (Excel or CSV: date, voucher no., party, ledger, amount, narration). Tests period-end cut-off, round sums, entries at or above overall materiality (${m.overall?inr(m.overall):'set materiality first'}), Sundays, adjustment / suspense narrations and duplicates.</p>
   <label class="drop" data-drop="journal">${ic('up')}<b>Upload journals to test</b><span class="small">Same columns as the ledger test above.</span><input type="file" data-file="journal" accept=".csv,.xlsx,.xls" hidden></label>
   ${J?`<p class="small muted">${esc(J.file)} · ${J.rows} journal entries tested on ${fmtD(J.at)}</p><div class="grid3">${J.res.map(r=>`<div class="card"><div class="row"><b class="sp">${esc(r.name)}</b>${r.total?`<span class="tag r">${r.total} found</span>`:'<span class="tag g">None</span>'}</div><div class="small muted" style="margin-top:4px">${esc(r.why)}</div>
    ${r.total?`<div class="scroll"><table style="margin-top:8px"><tbody>${r.hits.slice(0,6).map(h=>`<tr><td>${esc(h.date)}</td><td>${esc(h.party)}</td><td class="num">${inr(h.amount)}</td></tr>`).join('')}</tbody></table></div>${r.total>6?`<div class="small muted">+${r.total-6} more</div>`:''}<button class="btn ghost sm" style="margin-top:8px" data-act="jeObs" data-k="${esc(r.key)}">${ic('flag')}Raise finding</button>`:''}</div>`).join('')}</div>`:'<p class="small muted">No journal test run yet.</p>'}</div>`;
}

/* ---------- wrappers (each guarded so a new-code bug never breaks the page) ---------- */
function safe(fn,fallback){return function(...args){try{return fn.apply(this,args)}catch(e){return fallback?fallback.apply(this,args):''}}}
if(typeof vHome==='function'){const _vHome=vHome;vHome=safe(function(){return escalationPanel()+_vHome()},_vHome)}
if(typeof clientOverview==='function'){const _co=clientOverview;clientOverview=safe(function(c,L){return _co(c,L)+matPanel(c)+planPanel(c)+`<div class="panel" style="margin-top:14px"><h3>Audit Committee pack</h3><p class="small muted" style="margin:-4px 0 8px">Scope, materiality, opinion, key findings, overdue actions and compliance exceptions — one report for the Audit Committee.</p><button class="btn" data-act="acDl" data-c="${c.id}">${ic('down')}Download Audit Committee pack</button></div>`},_co)}
if(typeof programmeTab==='function'){const _pt=programmeTab;programmeTab=safe(function(a,c){return findingsHub(a,c)+confPanel(c,pOpen(c))+_pt(a,c)},_pt)}
if(typeof testsTab==='function'){const _tt=testsTab;testsTab=safe(function(a){const c=S.clients.find(x=>x.id===a.clientId);return _tt(a)+(c?journalPanel(a,c):'')},_tt)}
if(typeof signoffTab==='function'){const _st=signoffTab;signoffTab=safe(function(a){const c=S.clients.find(x=>x.id===a.clientId);const vers=a.versions||[];
  return _st(a)+(c?matSummary(c):'')+`<div class="panel" style="margin-top:14px"><h3>Report lock & version history</h3><p class="small muted" style="margin:-4px 0 8px">${['Reported','Closed'].includes(a.stage)?`<span class="tag g">Locked at ${esc(a.stage)}</span> `:'Not locked yet. '}A snapshot is kept every time the audit is reported or closed; restoring a version keeps the current state in history too.</p>
  ${vers.length?`<div class="scroll"><table class="stack"><thead><tr><th>Snapshot</th><th>By</th><th>Stage then</th><th></th></tr></thead><tbody>${vers.slice().reverse().map((v,i)=>`<tr><td>${fmtD((v.at||'').slice(0,10))}</td><td>${esc(who(v.by))}</td><td>${esc(v.stage||'')}</td><td><button class="btn ghost sm" data-act="verRestore" data-i="${vers.length-1-i}">Restore</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="small muted">No snapshots yet.</p>'}</div>`},_st)}
if(typeof atrTab==='function'){const _at=atrTab;atrTab=safe(function(c){const gaps=S.observations.filter(o=>o.clientId===c.id).flatMap(o=>closureGaps(o).map(g=>({o,g})));
  return _at(c)+(gaps.length?`<div class="panel" style="margin-top:14px"><h3>Closure gaps (SIA 390)</h3><ul class="small" style="margin:0;padding-left:18px">${gaps.map(x=>`<li><a href="#obs-${x.o.id}">${esc(x.o.title)}</a> — ${esc(x.g)}</li>`).join('')}</ul></div>`:'')},_at)}
if(typeof vObs==='function'){const _vo=vObs;vObs=safe(function(){
  const isNew=ui.id==='new',o=isNew?ui.draft:S.observations.find(x=>x.id===ui.id);if(!o)return _vo();
  const c=S.clients.find(x=>x.id===o.clientId),m=c?matOf(c):null,ma=m?matAssess(o.amount,m):null,gaps=findingGaps(o);
  const gate=`<div class="panel" style="margin-bottom:14px"><h3>Finding quality gate (SIA 370)</h3>
   <p class="small muted" style="margin:-4px 0 8px">A finding goes to management only when every part is filled. ${gaps.length?`<b style="color:var(--hi)">Missing: ${gaps.join(', ')}.</b>`:'<b style="color:var(--ok)">Complete — ready for management.</b>'} ${m&&o.amount?`Amount ${inr(o.amount)}: <b>${esc(ma.label)}</b>.`:''}</p>
   <div class="row" style="gap:6px">${FINDING_FIELDS.map(([k,l])=>`<span class="tag ${String(o[k]||'').trim()?'g':'r'}">${String(o[k]||'').trim()?'✓':'✗'} ${l}</span>`).join('')}</div></div>`;
  return gate+_vo()},_vo)}
if(typeof vAudit==='function'){const _va=vAudit;vAudit=safe(function(){const h=_va();const a=A();if(!a||!['Reported','Closed'].includes(a.stage))return h;
  return `<div class="panel" style="margin-bottom:14px;border-color:var(--ok)"><b>Locked at ${esc(a.stage)}.</b> <span class="small muted">This audit is reported; changes are kept as new versions (Sign-off tab). Findings stay open until rectified and re-tested.</span></div>`+h},_va)}

/* ---------- actions ---------- */
Object.assign(ACT,{
  matSave:()=>{const c=C();if(!c)return;const v=+document.getElementById('mat-overall')?.value||0,by=document.getElementById('mat-by')?.value||'';
    put('clients',c.id,{...c,mat:{overall:v,by,at:today()}});toast(v?'Materiality saved':'Materiality cleared — suggested figure will be used')},
  matUse:()=>{const c=C();if(!c)return;const m=matOf(c);put('clients',c.id,{...c,mat:{overall:m.overall,by:c.mat?.by||'',at:today()}});toast('Suggested materiality saved')},
  planSave:()=>{const c=C();if(!c)return;const scope=document.getElementById('plan-scope')?.value||'',by=document.getElementById('plan-by')?.value||'',ind=document.getElementById('plan-ind')?.value||'';
    if(!by)return toast('Enter who approved the plan.');
    put('clients',c.id,{...c,plan:{scope,approvedBy:by,approvedAt:today()},terms:{...(c.terms||{}),independence:ind,acceptedAt:today()}});toast('Plan approval recorded')},
  hubRaise:t=>{const a=A(),x=(ui.hubList||[])[+t.dataset.i];if(!a||!x)return;
    newObs({clientId:a.clientId,auditId:a.id,title:x.title,condition:x.condition,criteria:x.criteria,rating:x.rating,proc:x.proc,amount:x.amount,cause:'',effect:'',rec:''})},
  jeObs:t=>{const a=A(),J=a?.journal,r=J?.res.find(x=>x.key===t.dataset.k);if(!a||!r)return;
    newObs({clientId:a.clientId,auditId:a.id,title:'Journal testing: '+r.name,condition:`${r.total} journal entries flagged in ${J.file} (${J.rows} rows). Examples: `+r.hits.slice(0,3).map(h=>`${h.date} ${h.party} ${inr(h.amount)}`).join('; ')+'.',criteria:r.why,rating:r.total>=10?'H':'M',proc:'tests',amount:r.hits.reduce((s,h)=>s+(+h.amount||0),0)})},
  confTgl:t=>{const c=C(),d=pOpen(c),s=t.dataset.s,n=t.dataset.n,k=t.dataset.k;
    d.party[s].P[n]={...(d.party[s].P[n]||{}),conf:{...((d.party[s].P[n]||{}).conf||{}),[k]:!((d.party[s].P[n]||{}).conf||{})[k]}};savep(d);toast('Confirmation updated')},
  escOne:t=>{const o=S.observations.find(x=>x.id===t.dataset.id);if(!o)return;
    put('observations',o.id,{...o,escalated:true,escalatedAt:new Date().toISOString(),escalatedTo:'Audit Committee'});toast('Escalated to the Audit Committee')},
  acDl:t=>{const c=S.clients.find(x=>x.id===t.dataset.c)||C();if(!c)return;
    dlFile(fileSafe(c.name)+' - Audit Committee pack '+today()+'.html','<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+esc(c.name)+' - Audit Committee pack</title><style>body{font:14.5px/1.6 "IBM Plex Serif",Cambria,Georgia,serif;max-width:920px;margin:30px auto;padding:0 20px;color:#141a33}table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #ccd;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f3f4f9}h1{font-size:26px}h2{font-size:17px;margin-top:26px;border-bottom:2px solid #141a33;padding-bottom:4px}</style></head><body>'+acPackBody(c)+'</body></html>')},
  verRestore:t=>{const a=A(),v=(a.versions||[])[+t.dataset.i];if(!a||!v)return;
    const cur={at:new Date().toISOString(),by:me||'local',stage:a.stage,data:JSON.parse(JSON.stringify(a))};
    put('audits',a.id,{...JSON.parse(JSON.stringify(v.data)),versions:[...(a.versions||[]),cur].slice(-20)});toast('Version restored — previous state kept in history')}
});

/* ---------- gates: reviewer before reporting, quality before management link, evidence before high-risk closure ---------- */
if(ACT.stage){const _stage=ACT.stage;
  ACT.stage=t=>{const a=A();if(!a)return _stage(t);const v=t.dataset.v;
    if(['Reported','Closed'].includes(v)){
      if(!a.revBy)return toast('Reviewer sign-off is needed before reporting (Sign-off tab).');
      const c=S.clients.find(x=>x.id===a.clientId);
      if(c){const P=progStatus(a,c);if(!P.done)return toast('Finish the audit programme first: '+P.need.filter(x=>x.st!=='done'&&x.st!=='na').map(x=>PR[x.k].n).join(', ')+'.')}
      if(openNotes(a).length)return toast('Clear the '+openNotes(a).length+' open review note'+(openNotes(a).length===1?'':'s')+' first (Sign-off tab).');
      const snap={at:new Date().toISOString(),by:me||'local',stage:a.stage,data:JSON.parse(JSON.stringify(a))};
      return put('audits',a.id,{...a,versions:[...(a.versions||[]),snap].slice(-20),stage:v});
    }
    return _stage(t)}}
if(typeof mgmtNew==='function'){const _mgmtNew=mgmtNew;
  mgmtNew=async function(){const a=A();if(!a)return _mgmtNew();
    const obs=S.observations.filter(o=>o.auditId===a.id);
    const bad=obs.map(o=>({o,g:findingGaps(o)})).filter(x=>x.g.length);
    if(bad.length)return toast(`Complete ${bad.length} finding(s) before sending to management — e.g. "${bad[0].o.title}": missing ${bad[0].g.join(', ')}.`);
    return _mgmtNew()}}
document.addEventListener('submit',e=>{
  const f=e.target;if(!f.dataset||!f.dataset.verform)return;
  const o=S.observations.find(x=>x.id===f.dataset.verform);if(!o||o.rating!=='H')return;
  const note=String(f.querySelector('[name="note"]')?.value||'').trim();
  if(!(o.evidence||[]).length&&!note){e.preventDefault();e.stopPropagation();toast('High-risk closure needs evidence attached or a re-test note (what was seen).')}
},true);

/* ---------- journal file handling ---------- */
document.addEventListener('change',async e=>{
  const t=e.target;if(!t.dataset||t.dataset.file!=='journal'||!t.files?.length)return;
  const a=A(),c=C();if(!a||!c)return;const file=t.files[0];t.value='';
  try{
    toast('Reading '+file.name+'…');
    const rows=await readSheet(file);
    const H=findHeader(rows,r=>r.some(v=>/date/.test(v))&&r.some(v=>/amount|debit|value/.test(v)));
    if(!H)throw new Error('Need a header row with a Date column and an Amount column.');
    const col=(...k)=>hcol(H.head,...k);
    const ci={d:col('date'),vno:col('voucher','vch','ref','doc'),party:col('party','vendor','customer','name','particular'),ledger:col('ledger','account','gl'),amt:col('amount','debit','value'),nar:col('narration','nar','details','description')};
    const parsed=rows.slice(H.h+1).map(r=>({d:ymdOf(r[ci.d]),vno:ci.vno>=0?String(r[ci.vno]||''):'',party:ci.party>=0?String(r[ci.party]||''):'',ledger:ci.ledger>=0?String(r[ci.ledger]||''):'',amount:Math.abs(num(r[ci.amt])),nar:ci.nar>=0?String(r[ci.nar]||''):(ci.party>=0?String(r[ci.party]||''):'')}));
    const J=journalTest(parsed,{materiality:matOf(c).overall});
    if(!J.rows)throw new Error('No dated journal entries with amounts were found.');
    let evId='';try{evId=(await uploadFiles([file],{clientId:c.id,auditId:a.id,purpose:'Journal export used for journal testing'}))[0]||''}catch(er){}
    const cur=S.audits.find(x=>x.id===a.id)||a;
    await put('audits',a.id,{...cur,journal:{file:file.name,rows:J.rows,at:today(),res:J.res,evidenceId:evId}});
    toast(J.rows.toLocaleString('en-IN')+' journals tested: '+J.res.reduce((s,r)=>s+r.total,0)+' flagged');
  }catch(er){toast(er.message||String(er))}
});
}
