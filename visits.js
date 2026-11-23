/* Smart Auditing — client visits, one observation report per visit, and the month-end internal audit report built from them.
   Owner, 23 Nov 2026: "based on the observation report in the end of the month it should auto generate the internal audit report and
   the observation report will be given based on the visit they made to the clients; if they go on four visits then four observation
   reports and if six then six". No visit count is set: the visits recorded decide it. */
const vMonths=d=>d.visits||{};
function visitsOfMonth(c,mk){return((pOpen(c).visits||{})[mk]||[]).slice().sort((a,b)=>a.date.localeCompare(b.date))}
function allVisits(c){const V=pOpen(c).visits||{};return Object.values(V).flat().sort((a,b)=>a.date.localeCompare(b.date))}
/* the visit an observation belongs to: the one chosen, or the last visit on or before the day it was raised, in the same month */
function visitOf(o){if(o.visitId){for(const v of allVisits({id:o.clientId,...S.clients.find(c=>c.id===o.clientId)}))if(v.id===o.visitId)return v}
  const day=(o.createdAt||'').slice(0,10);if(!day)return null;const L=allVisits(S.clients.find(c=>c.id===o.clientId)||{id:o.clientId}).filter(v=>v.date<=day&&v.date.slice(0,7)===day.slice(0,7));return L[L.length-1]||null}
const visitObs=(c,v)=>S.observations.filter(o=>o.clientId===c.id&&visitOf(o)?.id===v.id);
function visitSelect(o){const c=S.clients.find(x=>x.id===o.clientId);if(!c)return'';const L=allVisits(c).slice(-12).reverse(),cur=o.visitId||visitOf(o)?.id||'';
  return `<label class="f">Visit<select id="of-visit"><option value="">${L.length?'Not linked':'No visit recorded'}</option>${L.map(v=>`<option value="${v.id}" ${cur===v.id?'selected':''}>${fmtD(v.date)}${v.team?' · '+esc(v.team):''}</option>`).join('')}</select></label>`}

/* ---------- the observation report of one visit ---------- */
function visitReportBody(c,v,n){
  const O=visitObs(c,v).sort((a,b)=>'HML'.indexOf(a.rating)-'HML'.indexOf(b.rating)),au=(v.audits||[]).map(id=>S.audits.find(a=>a.id===id)).filter(Boolean);
  return `<h1>${esc(c.name)}</h1><p><b>Observation report — visit ${n} of ${mkLabel(v.date.slice(0,7))}</b> · ${fmtD(v.date)}${v.from?' · '+esc(v.from)+(v.to?'–'+esc(v.to):''):''}</p>
  <table><tbody><tr><th style="width:22%">Audit team</th><td>${esc(v.team||'—')}</td></tr><tr><th>Met / client staff</th><td>${esc(v.met||'—')}</td></tr><tr><th>Areas covered</th><td>${esc(au.map(a=>a.title+(a.period?' ('+a.period+')':'')).join('; ')||v.areas||'—')}</td></tr><tr><th>Work done</th><td>${esc(v.work||'—')}</td></tr></tbody></table>
  <h2>Observations (${O.length})</h2>${O.length?O.map((o,k)=>`<h3>${k+1}. ${esc(o.title)} — ${RLABEL[o.rating]}${typeof repeatOf==='function'&&repeatOf(o)?' (repeat)':''}</h3><table><tbody>${[['Observation',o.condition],['Criteria',o.criteria],['Cause',o.cause],['Impact',o.effect],['Recommendation',o.rec],['Management response',o.response],['Responsibility / target date',[o.owner,o.due?fmtD(o.due):''].filter(Boolean).join(' · ')],['Status',o.status]].filter(x=>x[1]).map(([k2,val])=>`<tr><th style="width:22%">${k2}</th><td>${esc(val)}</td></tr>`).join('')}</tbody></table>`).join(''):'<p>No observations on this visit.</p>'}
  ${v.pending?`<h2>Pending for the next visit</h2><p>${esc(v.pending)}</p>`:''}
  <p style="margin-top:30px">For the internal auditors: ____________________ &nbsp;&nbsp; Received by (client): ____________________</p>`}
const docWrap=(title,body)=>'<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+esc(title)+'</title><style>body{font:14.5px/1.6 "IBM Plex Serif",Cambria,Georgia,serif;max-width:920px;margin:30px auto;padding:0 20px;color:#141a33}table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #ccd;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f3f4f9}h1{font-size:26px}h2{font-size:17px;margin-top:26px;border-bottom:2px solid #141a33;padding-bottom:4px}h3{font-size:15px}</style></head><body>'+body+'</body></html>';

/* ---------- the month-end internal audit report: built from the visits' observation reports ---------- */
const _mrb=monthReportBody;
monthReportBody=function(c,mk){
  const V=visitsOfMonth(c,mk),nm=mkLabel(mk),VO=V.map(v=>({v,O:visitObs(c,v)})),inV=new Set(VO.flatMap(x=>x.O.map(o=>o.id)));
  const base=_mrb(c,mk),others=S.observations.filter(o=>o.clientId===c.id&&!inV.has(o.id)&&(o.createdAt||'').slice(0,7)===mk);
  const all=[...VO.flatMap(x=>x.O),...others],cnt=k=>all.filter(o=>o.rating===k).length,byArea={};
  for(const o of all){const a=S.audits.find(x=>x.id===o.auditId),k=a?(TEMPLATES[a.t]?.name||a.title):'Other';(byArea[k]=byArea[k]||{H:0,M:0,L:0});byArea[k][o.rating]=(byArea[k][o.rating]||0)+1}
  const visitsHtml=`<h2>Visits and observation reports</h2><p>${V.length} visit${V.length===1?'':'s'} to ${esc(c.name)} in ${esc(nm)}; ${all.length} observation${all.length===1?'':'s'} (${cnt('H')} high, ${cnt('M')} medium, ${cnt('L')} low).</p>
   <table><thead><tr><th>Visit</th><th>Date</th><th>Team</th><th>Areas covered</th><th>Observations</th></tr></thead><tbody>${VO.map(({v,O},i)=>`<tr><td>${i+1}</td><td>${fmtD(v.date)}</td><td>${esc(v.team||'')}</td><td>${esc((v.audits||[]).map(id=>S.audits.find(a=>a.id===id)?.title).filter(Boolean).join('; ')||v.areas||'')}</td><td>${O.length} (${['H','M','L'].map(k=>O.filter(o=>o.rating===k).length+' '+{H:'high',M:'medium',L:'low'}[k]).join(', ')})</td></tr>`).join('')||'<tr><td colspan="5">No visit recorded this month.</td></tr>'}</tbody></table>
   ${Object.keys(byArea).length?`<h3>Observations by area</h3><table><thead><tr><th>Area</th><th>High</th><th>Medium</th><th>Low</th></tr></thead><tbody>${Object.entries(byArea).map(([k,x])=>`<tr><td>${esc(k)}</td><td>${x.H||0}</td><td>${x.M||0}</td><td>${x.L||0}</td></tr>`).join('')}</tbody></table>`:''}
   ${VO.map(({v,O},i)=>O.length?`<h3>Visit ${i+1} (${fmtD(v.date)}): observations</h3><table><thead><tr><th>#</th><th>Observation</th><th>Rating</th><th>Recommendation</th><th>Management response</th><th>Owner / date</th></tr></thead><tbody>${O.sort((a,b)=>'HML'.indexOf(a.rating)-'HML'.indexOf(b.rating)).map((o,k)=>`<tr><td>${i+1}.${k+1}</td><td><b>${esc(o.title)}</b>${o.condition?'<br>'+esc(o.condition):''}${typeof repeatOf==='function'&&repeatOf(o)?' <i>(repeat)</i>':''}</td><td>${RLABEL[o.rating]}</td><td>${esc(o.rec||'')}</td><td>${esc(o.response||'Awaited')}</td><td>${esc([o.owner,o.due?fmtD(o.due):''].filter(Boolean).join(' · '))}</td></tr>`).join('')}</tbody></table>`:'').join('')}
   ${VO.some(x=>x.v.pending)?`<h3>Carried to next month</h3><ul>${VO.filter(x=>x.v.pending).map(x=>`<li>${fmtD(x.v.date)}: ${esc(x.v.pending)}</li>`).join('')}</ul>`:''}`;
  /* the month's audits: those worked on in the visits (an October visit usually audits September), plus any set to the month */
  const AU=[...new Map([...V.flatMap(v=>(v.audits||[]).map(id=>S.audits.find(a=>a.id===id)).filter(Boolean)),...monthAudits(c,mk)].map(a=>[a.id,a])).values()];
  const mine=new Set(all.map(o=>o.id)),atr=atrRows(c).filter(r=>r.o.status!=='Closed'&&!mine.has(r.o.id)),d=pOpen(c),comp=compRows(c,d).rows.filter(r=>(r.st==='late'||r.st==='over')&&r.due>=mk+'-01'&&r.due<=mk+'-31');
  let h=`<h1>${esc(c.name)}</h1><p><b>Internal audit report for ${esc(nm)}</b> · prepared ${fmtD(today())}</p>
   <h2>1. Summary</h2><p>${V.length} visit${V.length===1?'':'s'} made in ${esc(nm)}, covering ${AU.length} audit${AU.length===1?'':'s'}${AU.length?' ('+AU.map(a=>esc(a.title)+(a.period?' for '+esc(a.period):'')).join('; ')+')':''}. ${all.length} observation${all.length===1?'':'s'} raised: ${cnt('H')} high, ${cnt('M')} medium, ${cnt('L')} low${all.filter(o=>typeof repeatOf==='function'&&repeatOf(o)).length?`; ${all.filter(o=>repeatOf(o)).length} repeat${all.filter(o=>repeatOf(o)).length===1?'':'s'} of earlier issues`:''}. ${atr.length} earlier observation${atr.length===1?' remains':'s remain'} open${atr.filter(r=>r.late).length?`, ${atr.filter(r=>r.late).length} past the agreed date`:''}.${comp.length?` ${comp.length} statutory return${comp.length===1?' or payment was':'s or payments were'} late or not done.`:''}</p>
   ${cnt('H')?`<p><b>Key observations:</b> ${all.filter(o=>o.rating==='H').map(o=>esc(o.title)).join('; ')}.</p>`:''}
   ${visitsHtml}
   <h2>Audits and procedures</h2><table><thead><tr><th>Audit</th><th>Stage</th><th>Procedures</th><th>Checklist</th></tr></thead><tbody>${AU.map(a=>{const P=progStatus(a,c);return `<tr><td>${esc(a.title)}${a.period?'<br><span style="color:#666">'+esc(a.period)+'</span>':''}</td><td>${esc(a.stage)}</td><td>${P.dn.length} of ${P.need.length} done: ${P.L.map(x=>esc(PR[x.k].n)+' — '+PTAG[x.st][1].toLowerCase()).join('; ')}</td><td>${a.items.filter(i=>i.r).length} of ${a.items.length} tested, ${a.items.filter(i=>i.r==='ex').length} exceptions</td></tr>`}).join('')||'<tr><td colspan="4">No audit linked to the visits.</td></tr>'}</tbody></table>
   <h2>Earlier observations still open (action taken report)</h2>${atr.length?`<table><thead><tr><th>Observation</th><th>Rating</th><th>Owner</th><th>Agreed date</th><th>Days late</th></tr></thead><tbody>${atr.map(r=>`<tr><td>${esc(r.o.title)}${r.rep?' (repeat)':''}${r.esc?' — escalate':''}</td><td>${RLABEL[r.o.rating]}</td><td>${esc(r.o.owner||'')}</td><td>${r.o.due?fmtD(r.o.due):'—'}</td><td>${r.late||''}</td></tr>`).join('')}</tbody></table>`:'<p>None.</p>'}
   ${comp.length?`<h2>Statutory compliance exceptions</h2><table><thead><tr><th>Return / payment</th><th>Period</th><th>Due</th><th>Filed / paid</th></tr></thead><tbody>${comp.map(r=>`<tr><td>${esc(r.what)}</td><td>${esc(r.per)}</td><td>${fmtD(r.due)}</td><td>${r.x.date?fmtD(r.x.date)+' ('+r.late+' days late)':'Not yet'}</td></tr>`).join('')}</tbody></table>`:''}`;
  for(const a of AU)h+=programmeReport(a).replace('Annexure F — Audit programme and procedures','Procedures: '+esc(a.title));
  return V.length?h:base};

/* ---------- the client's Visits & reports tab ---------- */
monthTab=function(c){
  const fm=fyMonths(fyNow()).filter(m=>m<=monKeyNow()),cur=ui.mrMonth&&fm.includes(ui.mrMonth)?ui.mrMonth:fm[fm.length-1],V=visitsOfMonth(c,cur),ended=cur<monKeyNow(),au=S.audits.filter(a=>a.clientId===c.id&&a.stage!=='Closed');
  const ed=ui.vEdit;
  let h=`<div class="row" style="gap:10px;margin-bottom:12px"><label class="f" style="flex:0 1 12em">Month<select data-mrmonth="1">${fm.map(m=>`<option value="${m}" ${m===cur?'selected':''}>${mkLabel(m)}</option>`).join('')}</select></label>
   <button class="btn" data-act="visitNew" data-v="${cur}" style="align-self:end">${ic('plus')}Record a visit</button>
   <span class="small muted" style="align-self:end">Each visit gives its own observation report. At the end of the month the internal audit report is built from all of them.</span></div>`;
  h+=V.length?V.map((v,i)=>{const O=visitObs(c,v);return `<div class="panel" style="margin-bottom:10px"><div class="row" style="gap:10px"><h3 class="sp" style="margin:0">Visit ${i+1} · ${fmtD(v.date)}${v.team?' · '+esc(v.team):''}</h3><span class="tag ${O.some(o=>o.rating==='H')?'r':O.length?'y':'g'}">${O.length} observation${O.length===1?'':'s'}</span>
    <button class="btn ghost sm" data-act="visitEdit" data-v="${v.id}">${ed===v.id?'Close':'Edit'}</button><button class="btn ghost sm" data-act="visitObs" data-v="${v.id}">${ic('flag')}Add observation</button><button class="btn sm" data-act="visitDl" data-v="${v.id}">${ic('down')}Observation report</button></div>
    ${ed===v.id?`<div class="form" style="margin-top:10px">${[['date','Date','date'],['from','In','time'],['to','Out','time'],['team','Audit team'],['met','Met / client staff']].map(([k,l,t])=>`<label class="f">${l}<input ${t?`type="${t}"`:''} data-vis="${k}" data-id="${v.id}" value="${esc(v[k]||'')}"></label>`).join('')}
      <label class="f wide">Areas covered<span class="row" style="gap:6px;flex-wrap:wrap">${au.map(a=>`<label class="chip" style="cursor:pointer"><input type="checkbox" data-visau="${a.id}" data-id="${v.id}" ${(v.audits||[]).includes(a.id)?'checked':''} style="width:16px;min-height:16px">${esc(a.title)}${a.period?' · '+esc(a.period):''}</label>`).join('')||'<span class="small muted">Start the month\'s audits from the Audit plan tab.</span>'}</span></label>
      <label class="f wide">Work done<textarea rows="2" data-vis="work" data-id="${v.id}">${esc(v.work||'')}</textarea></label><label class="f wide">Pending for the next visit<textarea rows="2" data-vis="pending" data-id="${v.id}">${esc(v.pending||'')}</textarea></label>
      <div class="row wide"><button class="btn ghost sm" data-act="visitDel" data-v="${v.id}">${arm('visit'+v.id,'Remove this visit','Click again to remove')}</button></div></div>`
     :`<p class="small" style="margin:6px 0 0">${O.map(o=>`<a href="#obs-${o.id}"><span class="tag ${o.rating}">${RLABEL[o.rating]}</span> ${esc(o.title)}</a>`).join(' · ')||'<span class="muted">No observations yet.</span>'}</p>${v.pending?`<p class="small muted" style="margin:4px 0 0">Pending: ${esc(v.pending)}</p>`:''}`}</div>`}).join(''):`<div class="empty">No visit recorded for ${mkLabel(cur)}. Record each visit as you make it; observations you raise that day are linked to it.</div>`;
  h+=`<div class="panel" style="margin-top:14px;border:2px solid ${ended?'var(--ok)':'var(--line,#dde)'}"><div class="row" style="gap:10px"><h3 class="sp" style="margin:0">Internal audit report · ${mkLabel(cur)}</h3>${ended?'<span class="tag g">Month ended: report ready</span>':'<span class="tag n">Builds itself as visits are added</span>'}<button class="btn" data-act="mrDl" data-v="${cur}">${ic('down')}Download</button></div>
   <p class="small muted" style="margin:6px 0 0">Built from the ${V.length} observation report${V.length===1?'':'s'} of the month, the procedures of the month's audits, earlier observations still open and compliance exceptions.</p></div>
   <details style="margin-top:10px" ${ended?'open':''}><summary class="small" style="cursor:pointer">Preview the report</summary><div class="report" id="mrep">${monthReportBody(c,cur)}</div></details>`;
  return h};

/* ---------- the home page: last month's reports ready ---------- */
function reportsReady(){const lm=(()=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-1);return d.toISOString().slice(0,7)})(),L=S.clients.map(c=>({c,V:visitsOfMonth(c,lm)})).filter(x=>x.V.length);
  if(!L.length)return'';return `<div class="panel" style="margin-bottom:16px"><div class="row"><h2 class="sp" style="margin:0">${mkLabel(lm)}: internal audit reports ready</h2></div><table><tbody>${L.map(({c,V})=>`<tr><td><b>${esc(c.name)}</b></td><td class="small">${V.length} visit${V.length===1?'':'s'} · ${V.reduce((s,v)=>s+visitObs(c,v).length,0)} observations</td><td><button class="btn sm" data-act="mrDlC" data-c="${c.id}" data-v="${lm}">${ic('down')}Download</button> <a class="btn ghost sm" href="#client-${c.id}" data-act="toMonth" data-c="${c.id}">Open</a></td></tr>`).join('')}</tbody></table></div>`}
const _dash=dashPanel;dashPanel=function(){return reportsReady()+_dash()};

Object.assign(ACT,{
  visitNew:t=>{const c=C(),d=pOpen(c),mk=t.dataset.v,day=monKeyNow()===mk?today():mk+'-'+String(Math.min(28,new Date().getDate())).padStart(2,'0'),id=nid(),open=S.audits.filter(a=>a.clientId===c.id&&!['Reported','Closed'].includes(a.stage)).map(a=>a.id);
    const L=[...((d.visits||{})[mk]||[]),{id,date:day,from:new Date().toTimeString().slice(0,5),to:'',team:session?.user?.email||'',met:'',audits:open,work:'',pending:''}];d.visits={...(d.visits||{}),[mk]:L};ui.vEdit=id;savep(d)},
  visitEdit:t=>{ui.vEdit=ui.vEdit===t.dataset.v?null:t.dataset.v;render()},
  visitDel:t=>{const k='visit'+t.dataset.v;if(ui.armed!==k){ui.armed=k;return render()}ui.armed=null;const c=C(),d=pOpen(c);for(const m of Object.keys(d.visits||{}))d.visits[m]=d.visits[m].filter(v=>v.id!==t.dataset.v);savep(d)},
  visitObs:t=>{const c=C(),v=allVisits(c).find(x=>x.id===t.dataset.v);newObs({clientId:c.id,auditId:(v?.audits||[])[0]||'',visitId:v?.id||'',createdAt:v?v.date+'T12:00:00Z':undefined})},
  visitDl:t=>{const c=C(),v=allVisits(c).find(x=>x.id===t.dataset.v),L=visitsOfMonth(c,v.date.slice(0,7)),n=L.findIndex(x=>x.id===v.id)+1;dlFile(fileSafe(c.name+' - observation report - visit '+n+' '+v.date)+'.html',docWrap(c.name+' observation report',visitReportBody(c,v,n)))},
  mrDlC:t=>{const c=S.clients.find(x=>x.id===t.dataset.c),mk=t.dataset.v;dlFile(fileSafe(c.name+' - internal audit report '+mkLabel(mk))+'.html',docWrap(c.name+' - '+mkLabel(mk),monthReportBody(c,mk)))},
  toMonth:t=>{ui.ctab='month';ui.lastId=t.dataset.c;ui.mrMonth=null}});
document.addEventListener('change',e=>{const t=e.target,ds=t.dataset;if(!ds.vis&&!ds.visau)return;const c=C(),d=pOpen(c);
  for(const m of Object.keys(d.visits||{}))for(const v of d.visits[m])if(v.id===ds.id){if(ds.vis)v[ds.vis]=t.value;else v.audits=t.checked?[...new Set([...(v.audits||[]),ds.visau])]:(v.audits||[]).filter(x=>x!==ds.visau);
    /* a changed date moves the visit to its month */
    if(ds.vis==='date'&&t.value&&t.value.slice(0,7)!==m){d.visits[m]=d.visits[m].filter(x=>x!==v);const nm=t.value.slice(0,7);d.visits[nm]=[...(d.visits[nm]||[]),v]}
    return savep(d)}});
