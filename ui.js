/* Smart Auditing — interface. Views render from S (data) and ui (state); routes live in the URL hash. */
const IC={home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',clients:'<path d="M3 21V8l9-5 9 5v13"/><path d="M9 21v-6h6v6M8 11h.01M12 11h.01M16 11h.01"/>',audit:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.5h6V4M9 11.5l2 2 4-4M9 17h6"/>',flag:'<path d="M5 21V4h11l-2 4 2 4H5"/>',map:'<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',report:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',clip:'<path d="m20 11.5-8 8a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L9.7 17.2a1.7 1.7 0 0 1-2.4-2.4l7.6-7.6"/>',up:'<path d="M12 16V4M6.5 9.5 12 4l5.5 5.5M4 20h16"/>',down:'<path d="M12 4v12M6.5 10.5 12 16l5.5-5.5M4 20h16"/>',plus:'<path d="M12 5v14M5 12h14"/>',trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',zip:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M10 6h2M10 9h2M10 12h2M10 15h2v3h-2z"/>',edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'};
const ic=n=>`<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`;
const VIEWS=['home','clients','new-client','client','edit','audits','audit','observations','obs','roadmap','vouching','recon','universe','reports','report'];
const go=h=>{if(location.hash==='#'+h)route();else location.hash=h};
function route(){
  const h=location.hash.slice(1)||'home',m=h.match(/^(client|audit|obs|edit|report)-(.+)$/);
  let v=m?m[1]:h;const id=m?m[2]:null;
  if(id!==ui.lastId){ui.ctab='overview';ui.atab='programme';ui.adding=null}
  if(v==='report'){v='audit';ui.atab='report'}
  ui.view=VIEWS.includes(v)?v:'home';ui.id=id;ui.lastId=id;ui.armed=null;
  render();window.scrollTo(0,0);
}
window.addEventListener('hashchange',route);
const val=id=>$('#'+id)?.value?.trim()??'';
const C=()=>S.clients.find(c=>c.id===(ui.view==='client'||ui.view==='edit'?ui.id:A()?.clientId));
const A=()=>ui.view==='audit'?S.audits.find(a=>a.id===ui.id):null;
const opts=(M,v)=>Object.entries(M).map(([k,l])=>`<option value="${k}" ${v===k?'selected':''}>${esc(l)}</option>`).join('');
const pct=(a,b)=>b?Math.round(a/b*100):0;
const arm=(k,label,armed)=>ui.armed===k?armed:label;

/* ---------- shell ---------- */
function setTop(crumbs,action=''){
  $('#crumbs').innerHTML=crumbs.map((c,i)=>i<crumbs.length-1&&c[1]?`<a href="#${c[1]}">${esc(c[0])}</a><span>/</span>`:`<b>${esc(c[0])}</b>`).join('');
  $('#topAction').innerHTML=action;
}
function sideNav(){
  const v=ui.view,map={client:'clients',edit:'clients','new-client':'clients',audit:'audits',obs:'observations',vouching:'audits',recon:'audits',universe:'audits'};
  const on=map[v]||v,act=S.audits.filter(a=>!['Reported','Closed'].includes(a.stage)).length,open=S.observations.filter(o=>o.status!=='Closed').length;
  document.querySelectorAll('.nav a').forEach(a=>{a.classList.toggle('on',a.dataset.v===on);const n=a.querySelector('.n');if(n)n.textContent=a.dataset.v==='audits'?(act||''):a.dataset.v==='observations'?(open||''):''});
}
function railStatus(){
  const s=$('#status');
  if(mode==='claude'){s.innerHTML=live?'Saved online in Claude · shared with people you share this page with':'Loading data…';return}
  if(mode==='preview'){s.textContent='Preview mode · not saved';return}
  if(!session){s.textContent='Not signed in';return}
  s.innerHTML=`${ws?`<b>${esc(ws.name)}</b><br>${ws.owner===me?`Join code <b>${esc(ws.join_code)}</b><br>`:''}`:''}${esc(session.user.email||'')}<br><button data-act="signout">Sign out</button>${wsList.length>1?` · <button data-act="switchWs">Switch team</button>`:''}`;
}
function render(){
  const m=$('#main');sideNav();railStatus();
  if(mode==='supa'&&!session){setTop([['Sign in']]);m.innerHTML=vLogin();return}
  if(mode==='supa'&&!ws){setTop([['Team workspace']]);m.innerHTML=loggingIn?'<p class="sub">Loading your workspace…</p>':vSetup();return}
  const V={home:vHome,clients:vClients,'new-client':()=>vClientForm(null),edit:()=>vClientForm(C()),client:vClient,audits:vAudits,audit:vAudit,observations:vObsList,obs:vObs,roadmap:vRoadmap,vouching:()=>vVouching(),recon:()=>vRecon(),universe:()=>vUniverse(),reports:vReports};
  let html;try{html=(V[ui.view]||vHome)()}catch(e){console.error(e);html=`<div class="empty">Something went wrong showing this page (${esc(e.message)}). <a href="#home">Back to home</a></div>`}
  m.innerHTML=(mode==='preview'?'<div class="banner">Preview mode: changes stay in this tab only and are lost on reload.</div>':'')+html;
  if(ui.view==='new-client'||ui.view==='edit')livePreview();
}
const notFound=(what,back)=>{setTop([[what]]);return `<div class="empty">This ${what.toLowerCase()} was not found; it may have been deleted. <a href="#${back}">Go back</a></div>`};

/* ---------- sign-in ---------- */
function vLogin(){
  return `<div style="max-width:560px"><h1>Sign in to Smart Auditing</h1><p class="sub">Your team's clients, audits, evidence and findings, saved securely and shared only with your workspace.</p>
  <form class="card form" id="loginForm" style="margin-top:18px"><label class="f wide">Email<input id="lg-email" type="email" autocomplete="email" required></label>
  <label class="f wide">Password<input id="lg-pass" type="password" autocomplete="current-password" minlength="8" required></label>
  <div class="row wide"><button class="btn" type="submit">Sign in</button><button type="button" class="btn ghost" data-act="signup">Create account</button></div>
  <p class="small muted wide" style="margin:0">New accounts get a confirmation email first. Passwords need at least 8 characters.</p></form></div>`;
}
function vSetup(){
  return `<h1>Set up your team workspace</h1><p class="sub">A workspace holds one firm's or one audit team's data. Create one, or join a colleague's with their join code.</p>
  <div class="grid2" style="margin-top:18px"><form class="card form" id="wsCreate"><h3 class="wide">Create a workspace</h3><label class="f wide">Firm or team name<input id="ws-name" required placeholder="e.g. Ameen & Associates, Internal Audit"></label><div class="wide"><button class="btn" type="submit">Create workspace</button></div></form>
  <form class="card form" id="wsJoin"><h3 class="wide">Join a workspace</h3><label class="f wide">Join code<input id="ws-code" required placeholder="10-character code from the owner"></label><div class="wide"><button type="submit" class="btn ghost">Join</button></div></form></div>
  ${wsList.length?`<h2 class="section">Your workspaces</h2><div class="row">${wsList.map(w=>`<button class="btn ghost" data-act="ws" data-id="${w.id}">${esc(w.name)}</button>`).join('')}</div>`:''}`;
}

/* ---------- home ---------- */
function vHome(){
  setTop([['Home']],S.clients.length?`<a class="btn" href="#new-client">${ic('plus')}New client</a>`:'');
  if(!S.clients.length)return `<h1>Start your first audit file</h1><p class="sub">Three steps from client details to a finished, evidence-backed report.</p>
   <div class="grid3" style="margin-top:20px">${[['1','Add the client master','Entity type, group position, regulator and last year\'s figures. The app works out which audits, laws and returns apply.'],['2','Plan the year','Generate a quarterly roadmap from the client master, or upload your own plan from Excel. Gaps against what applies are flagged.'],['3','Audit with evidence','Work each checklist, attach Excel and PDF evidence to the checks, raise findings and download the report with an evidence annex.']].map(([n,t,d])=>`<div class="card"><span class="tag b">Step ${n}</span><h3 style="margin-top:10px">${t}</h3><p class="muted small" style="margin:0">${d}</p></div>`).join('')}</div>
   <div class="row" style="margin-top:20px"><a class="btn" href="#new-client">${ic('plus')}Add your first client</a><button class="btn ghost" data-act="loadSample">Load sample data to explore</button></div>`;
  const open=S.observations.filter(o=>o.status!=='Closed'),hi=open.filter(o=>o.rating==='H').length,od=open.filter(overdue);
  const act=S.audits.filter(a=>!['Reported','Closed'].includes(a.stage));
  let n=0,d=0;const due=[];
  for(const c of S.clients){const R=c.roadmap;if(!R)continue;const cq=curQ(R.fy);for(const it of R.items||[]){n++;const s=rmStatus(it,R.fy);if(s==='done')d++;else if(it.q<=cq)due.push({c,it,s})}}
  const per=S.clients.map(c=>{const os=open.filter(o=>o.clientId===c.id);return{c,H:os.filter(o=>o.rating==='H').length,M:os.filter(o=>o.rating==='M').length,L:os.filter(o=>o.rating==='L').length,n:os.length}}).filter(p=>p.n).sort((a,b)=>b.H-a.H||b.n-a.n);
  const max=Math.max(1,...per.map(p=>p.n));
  const lead=hi?`${hi} high-risk finding${hi>1?'s are':' is'} still open`:od.length?`${od.length} action${od.length>1?'s are':' is'} overdue`:open.length?`${open.length} open finding${open.length>1?'s':''}, none high-risk`:'No open findings';
  return `<div class="head"><div class="titles"><h1>${esc(lead)}</h1><p class="sub">${S.clients.length} client${S.clients.length===1?'':'s'} · ${S.audits.length} audit${S.audits.length===1?'':'s'} · ${S.evidence.length} evidence file${S.evidence.length===1?'':'s'}</p></div></div>
  <div class="kpis"><div class="kpi"><b>${open.length}</b><span>Open findings</span></div><div class="kpi ${hi?'alert':''}"><b>${hi}</b><span>High-risk open</span></div><div class="kpi ${od.length?'alert':''}"><b>${od.length}</b><span>Actions overdue</span></div><div class="kpi"><b>${act.length}</b><span>Audits in progress</span></div><div class="kpi ${n&&d===n?'good':''}"><b>${n?pct(d,n)+'%':'—'}</b><span>Roadmap covered${n?` (${d}/${n})`:''}</span></div></div>
  <div class="grid2"><div class="panel"><div class="row"><h2 class="sp" style="margin:0">Due this month and earlier</h2><a class="small" href="#roadmap">All roadmaps</a></div>
   ${due.length?due.sort((x,y)=>x.it.q-y.it.q).slice(0,8).map(({c,it,s})=>`<a class="card" style="margin-top:8px" href="#client-${c.id}" data-act="toRoadmap"><div class="row"><span class="tag ${RMS[s][0]}">${RMS[s][1]}</span><span class="small muted">${QTR[it.q][0]} · ${esc(c.name)}</span></div><div style="margin-top:4px;font-weight:600">${esc(it.title)}</div></a>`).join(''):`<p class="muted">${n?'Nothing pending up to this quarter.':'No roadmaps yet. Open a client and generate one.'}</p>`}</div>
   <div class="panel"><h2>Overdue actions</h2>${od.length?od.sort((a,b)=>a.due.localeCompare(b.due)).slice(0,6).map(o=>`<a class="card" style="margin-top:8px" href="#obs-${o.id}"><div class="row"><span class="tag ${o.rating}">${RLABEL[o.rating]}</span><span class="over small">Due ${fmtD(o.due)}</span></div><div style="margin-top:4px;font-weight:600">${esc(o.title)}</div><div class="small muted">${esc(cname(o.clientId))} · ${esc(o.owner||'No owner')}</div></a>`).join(''):'<p class="muted">Nothing overdue.</p>'}</div></div>
  ${per.length?`<div class="section panel"><h2>Open findings by client</h2><div class="bars">${per.map(p=>`<div class="bar"><a href="#client-${p.c.id}">${esc(p.c.name)}</a><div class="track" role="img" aria-label="${p.H} high, ${p.M} medium, ${p.L} low">${['H','M','L'].map(k=>p[k]?`<span class="${k}-bg" style="width:${p[k]/max*100}%"></span>`:'').join('')}</div><span class="num">${p.n}</span></div>`).join('')}</div><div class="legend"><span><i class="dot H-bg"></i>High</span><span><i class="dot M-bg"></i>Medium</span><span><i class="dot L-bg"></i>Low</span></div></div>`:''}
  <div class="section"><h2>Audits in progress</h2>${act.length?auditTable(act):'<div class="empty">No audits in progress.</div>'}</div>`;
}
function auditTable(list){
  return `<div class="scroll"><table class="stack"><thead><tr><th>Audit</th><th>Client</th><th>Period</th><th>Stage</th><th>Progress</th><th class="num">Evidence</th><th class="num">Findings</th></tr></thead><tbody>${list.map(a=>{const t=a.items.filter(i=>i.r).length,e=a.items.filter(i=>i.r==='ex').length;return `<tr class="click" data-go="audit-${a.id}"><td><b>${esc(a.title)}</b></td><td>${esc(cname(a.clientId))}</td><td>${esc(a.period||'—')}</td><td><span class="tag ${a.stage==='Closed'||a.stage==='Reported'?'g':'b'}">${esc(a.stage)}</span></td><td style="min-width:8em"><div class="progress" title="${t} of ${a.items.length} tested"><span style="width:${pct(t-e,a.items.length)}%"></span><span class="x" style="width:${pct(e,a.items.length)}%"></span></div><span class="small muted">${t}/${a.items.length} tested${e?`, <span class="over">${e} exception${e>1?'s':''}</span>`:''}</span></td><td class="num">${S.evidence.filter(x=>x.auditId===a.id).length}</td><td class="num">${S.observations.filter(o=>o.auditId===a.id).length}</td></tr>`}).join('')}</tbody></table></div>`;
}

/* ---------- clients ---------- */
function vClients(){
  setTop([['Clients']],`<a class="btn" href="#new-client">${ic('plus')}New client</a>`);
  const sample=Object.values(S).some(L=>L.some(x=>x.sample));
  return `<div class="head"><div class="titles"><h1>Clients</h1><p class="sub">Each client's master decides what applies to it and sets its audit plan and roadmap.</p></div></div>
  ${S.clients.length?`<div class="grid3">${S.clients.map(c=>{const A_=applicability(c),y=A_.filter(a=>a.st==='yes').length,ch=A_.filter(a=>a.st==='check').length,R=c.roadmap,its=R?.items||[],dn=its.filter(i=>rmStatus(i,R.fy)==='done').length,op=S.observations.filter(o=>o.clientId===c.id&&o.status!=='Closed'),hi=op.filter(o=>o.rating==='H').length;
    return `<a class="card" href="#client-${c.id}"><div class="row"><h3 class="sp" style="margin:0">${esc(c.name)}</h3>${c.sample?'<span class="tag n">sample</span>':''}</div><div class="small muted">${esc(c.industry||BIZ[c.biz]||'')}</div>
    <div class="chips"><span class="chip">${esc(ENT[c.type]||'')}</span>${isSmall(c)?'<span class="chip">Small company</span>':''}${c.reg&&c.reg!=='none'?`<span class="chip">${esc(REG[c.reg])}</span>`:''}</div>
    <div class="row small" style="margin-top:12px;gap:14px"><span><b>${y}</b> apply${ch?` · <span class="tag y">${ch} to check</span>`:''}</span><span><b>${op.length}</b> open finding${op.length===1?'':'s'}${hi?` <span class="tag H">${hi} high</span>`:''}</span></div>
    <div style="margin-top:10px"><div class="progress"><span style="width:${pct(dn,its.length)}%"></span></div><div class="small muted" style="margin-top:4px">${its.length?`Roadmap ${pct(dn,its.length)}% covered (${dn}/${its.length})`:'No roadmap yet'}</div></div></a>`}).join('')}</div>`
  :`<div class="empty">No clients yet.<div class="row"><a class="btn" href="#new-client">${ic('plus')}Add your first client</a><button class="btn ghost" data-act="loadSample">Load sample data</button></div></div>`}
  ${sample?`<p class="small muted section">Records tagged sample are examples. <button class="btn warn sm" data-act="clearSample">${arm('sample','Delete sample data','Click again to delete all sample data')}</button></p>`:''}`;
}
const numIn=(id,label,v,hint)=>`<label class="f">${label}<input id="${id}" type="number" min="0" step="any" inputmode="decimal" value="${esc(v??'')}">${hint?`<span class="hint">${hint}</span>`:''}</label>`;
function vClientForm(c){
  const ed=!!c;c=c||{};
  setTop(ed?[['Clients','clients'],[c.name,'client-'+c.id],['Edit master']]:[['Clients','clients'],['New client']]);
  return `<div class="head"><div class="titles"><h1>${ed?'Edit client master':'New client'}</h1><p class="sub">These details decide which audits, laws and returns apply. Use the last financial year's audited figures, in ₹ crore.</p></div></div>
  <div class="grid2"><form id="clientForm">
   <fieldset><legend>Identity</legend><div class="form"><label class="f wide">Client name<input id="cf-name" required value="${esc(c.name)}"></label><label class="f">Industry<input id="cf-ind" value="${esc(c.industry)}"></label><label class="f">Accounting system<input id="cf-sys" placeholder="e.g. Tally, Zoho Books, SAP" value="${esc(c.system)}"></label><label class="f">GSTIN<input id="cf-gstin" placeholder="e.g. 33AAACK1234F1Z5" value="${esc(c.gstin||'')}"></label></div></fieldset>
   <fieldset><legend>Classification</legend><div class="form"><label class="f">Entity type<select id="cf-type">${opts(ENT,c.type||'private')}</select></label><label class="f">Group position<select id="cf-rel">${opts(REL,c.rel||'none')}</select></label><label class="f">Nature of business<select id="cf-biz">${opts(BIZ,c.biz||'trading')}</select></label><label class="f">Regulated by<select id="cf-reg">${opts(REG,c.reg||'none')}</select></label><label class="f wide">Cost records sector<select id="cf-cost">${opts(COST,c.cost||'none')}</select></label></div></fieldset>
   <fieldset><legend>Last financial year (₹ crore)</legend><div class="form">${numIn('cf-to','Turnover / gross receipts',c.turnover)}${numIn('cf-pu','Paid-up capital',c.paidup)}${numIn('cf-nw','Net worth',c.networth,'Capital + reserves')}${numIn('cf-np','Net profit before tax',c.profit)}${numIn('cf-bo','Peak bank / FI borrowings',c.borrow)}${numIn('cf-de','Deposits outstanding',c.deposits)}${numIn('cf-pt','Turnover under cost records',c.costTurnover,'Only for a cost-records sector')}${numIn('cf-ct','LLP contribution (₹ lakh)',c.contribution,'Only for LLPs')}${numIn('cf-em','Employees',c.employees)}</div></fieldset>
   <fieldset><legend>Other facts</legend><label class="cb"><input type="checkbox" id="cf-gst" ${c.gst!==false?'checked':''}>GST registered</label><label class="cb"><input type="checkbox" id="cf-cash" ${c.cash5?'checked':''}>Cash receipts and payments each within 5% of totals</label><label class="cb"><input type="checkbox" id="cf-intl" ${c.intl?'checked':''}>International transactions with group companies</label></fieldset>
   <div class="row"><button class="btn" type="submit">${ed?'Save changes':'Save client and plan'}</button><a class="btn ghost" href="#${ed?'client-'+c.id:'clients'}">Cancel</a></div></form>
  <div><div class="panel sticky" id="livePreview"></div></div></div>`;
}
function formClient(){
  return{name:val('cf-name'),type:val('cf-type'),rel:val('cf-rel'),biz:val('cf-biz'),reg:val('cf-reg'),cost:val('cf-cost'),industry:val('cf-ind'),system:val('cf-sys'),gstin:val('cf-gstin').toUpperCase(),turnover:+val('cf-to')||0,paidup:+val('cf-pu')||0,networth:+val('cf-nw')||0,profit:+val('cf-np')||0,borrow:+val('cf-bo')||0,deposits:+val('cf-de')||0,costTurnover:+val('cf-pt')||0,contribution:+val('cf-ct')||0,employees:+val('cf-em')||0,gst:!!$('#cf-gst')?.checked,cash5:!!$('#cf-cash')?.checked,intl:!!$('#cf-intl')?.checked};
}
function livePreview(){
  const p=$('#livePreview');if(!p)return;const c=formClient(),L=applicability(c),y=L.filter(a=>a.st==='yes'),ch=L.filter(a=>a.st==='check'),risks=suggestedRisks(c);
  p.innerHTML=`<h2 style="margin:0">What will apply</h2><p class="small muted" style="margin:4px 0 12px">Updates as you type. ${isSmall(c)?'<b>Small company</b> at these figures. ':''}</p>
   <div class="row" style="gap:6px;margin-bottom:10px"><span class="tag r">${y.length} apply</span>${ch.length?`<span class="tag y">${ch.length} to check</span>`:''}<span class="tag n">${L.length-y.length-ch.length} not applicable</span></div>
   ${[...y,...ch].map(a=>`<div class="row small" style="padding:5px 0;border-bottom:1px solid var(--line);gap:8px;flex-wrap:nowrap"><span class="tag ${a.st==='yes'?'b':'y'}" style="min-width:4.6em;justify-content:center">${a.st==='yes'?'Applies':'Check'}</span><span>${esc(a.name)}</span></div>`).join('')}
   <p class="small muted" style="margin:12px 0 0">Audit plan: ${risks.map(r=>esc(TEMPLATES[r.t].name)).join(', ')}.</p>`;
}

/* ---------- client workspace ---------- */
function vClient(){
  const c=C();if(!c)return notFound('Client','clients');
  const L=applicability(c),y=L.filter(a=>a.st==='yes').length,ch=L.filter(a=>a.st==='check').length,R=c.roadmap,its=R?.items||[],dn=its.filter(i=>rmStatus(i,R.fy)==='done').length;
  const au=S.audits.filter(a=>a.clientId===c.id),ob=S.observations.filter(o=>o.clientId===c.id),op=ob.filter(o=>o.status!=='Closed'),ev=S.evidence.filter(e=>e.clientId===c.id);
  setTop([['Clients','clients'],[c.name]],`<a class="btn ghost" href="#edit-${c.id}">${ic('edit')}Edit master</a><button class="btn" data-act="tab" data-tab="audits" data-new="1">${ic('plus')}New audit</button>`);
  const vd=S.vouching.find(v=>v.clientId===c.id&&v.fy===fyNow());const tabs=[['overview','Overview'],['plan','Audit plan'],['roadmap','Roadmap',its.length],['audits','Audits',au.length],['observations','Findings',op.length],['atr','Action taken',op.length],['month','Monthly report',''],['evidence','Evidence',ev.length]];
  const body={overview:()=>clientOverview(c,L),plan:()=>planTab(c),atr:()=>atrTab(c),month:()=>monthTab(c),roadmap:()=>roadmapBoard(c),audits:()=>clientAudits(c,au),observations:()=>obsTable(ob,{client:c}),evidence:()=>evidenceList(ev,{showAudit:true})}[ui.ctab]||(()=>clientOverview(c,L));
  return `<div class="head"><div class="titles"><h1>${esc(c.name)}</h1><div class="chips"><span class="chip">${esc(ENT[c.type]||'')}</span>${isSmall(c)?'<span class="chip">Small company</span>':''}<span class="chip">${esc(BIZ[c.biz]||'')}</span>${c.reg&&c.reg!=='none'?`<span class="chip">${esc(REG[c.reg])}</span>`:''}${c.system?`<span class="chip">Books in ${esc(c.system)}</span>`:''}<span class="chip">Turnover ₹${esc(c.turnover||0)} cr</span></div></div></div>
  <div class="kpis"><div class="kpi"><b>${y}</b><span>Requirements apply${ch?` (+${ch} to check)`:''}</span></div><div class="kpi ${its.length&&dn===its.length?'good':''}"><b>${its.length?pct(dn,its.length)+'%':'—'}</b><span>Roadmap covered</span></div><div class="kpi"><b>${au.filter(a=>!['Reported','Closed'].includes(a.stage)).length}</b><span>Audits in progress</span></div><div class="kpi ${op.some(o=>o.rating==='H')?'alert':''}"><b>${op.length}</b><span>Open findings</span></div><div class="kpi"><b>${ev.length}</b><span>Evidence files</span></div></div>
  <div class="tabs" role="tablist">${tabs.map(([k,l,n])=>`<button role="tab" aria-selected="${ui.ctab===k}" class="${ui.ctab===k?'on':''}" data-act="tab" data-tab="${k}">${l}${n?`<span class="n">${n}</span>`:''}</button>`).join('')}</div>${body()}`;
}
function clientOverview(c,L){
  const groups=[...new Set(L.map(a=>a.g))],st={yes:'<span class="tag b">Applies</span>',no:'<span class="tag n">Not applicable</span>',check:'<span class="tag y">Check</span>'};
  const row=a=>`<tr><td><b>${esc(a.name)}</b><div class="small muted">${esc(a.basis)}</div></td><td>${st[a.st]}</td><td>${esc(a.why)}</td></tr>`;
  const plan=(c.risks||[]).map(x=>({...x,s:x.i*x.c,l:level(x.i*x.c)})).sort((a,b)=>b.s-a.s);
  return `<div class="grid2 even"><div class="panel"><h2>What applies to this client</h2><p class="small muted" style="margin:-4px 0 8px">Worked out from the client master. Re-check each year on the latest audited figures. A planning guide, not legal advice; thresholds as of Nov 2026.</p>
   <div class="scroll"><table class="stack"><thead><tr><th>Requirement</th><th>Status</th><th>Why</th></tr></thead><tbody>${groups.map(g=>{const rows=L.filter(a=>a.g===g&&a.st!=='no');return rows.length?`<tr><td colspan="3" class="grp">${esc(g)}</td></tr>`+rows.map(row).join(''):''}).join('')}</tbody></table></div>
   <details style="margin-top:10px"><summary>Not applicable (${L.filter(a=>a.st==='no').length})</summary><div class="scroll"><table class="stack"><tbody>${L.filter(a=>a.st==='no').map(row).join('')}</tbody></table></div></details></div>
  <div><div class="panel"><div class="row"><h2 class="sp" style="margin:0">Risk register</h2><button class="btn ghost sm" data-act="rebuildPlan">${arm('rebuild','Rebuild from applicability','Click again to replace')}</button></div>
   <p class="small muted" style="margin:6px 0 8px">Inherent × control risk (1–5). 15+ quarterly, 8–14 half-yearly, below 8 yearly.</p>
   <div class="reg h"><span>Process</span><span>Inherent</span><span>Control</span><span class="num">Score</span><span></span></div>
   ${plan.map(x=>`<div class="reg"><span><b>${esc(TEMPLATES[x.t]?.name||x.t)}</b><div class="small muted">Every month</div></span><select data-risk="${x.t}" data-k="i" aria-label="Inherent risk">${[1,2,3,4,5].map(n=>`<option ${x.i==n?'selected':''}>${n}</option>`).join('')}</select><select data-risk="${x.t}" data-k="c" aria-label="Control risk">${[1,2,3,4,5].map(n=>`<option ${x.c==n?'selected':''}>${n}</option>`).join('')}</select><span class="num"><span class="tag ${x.l}">${x.s}</span></span><button class="btn ghost sm" data-act="newAudit" data-t="${x.t}">Start</button></div>`).join('')}
   <select data-ch="addRisk" aria-label="Add process" style="margin-top:10px"><option value="">+ Add a process…</option>${Object.entries(TEMPLATES).filter(([k])=>!(c.risks||[]).some(x=>x.t===k)).map(([k,v])=>`<option value="${k}">${esc(v.name)}</option>`).join('')}</select></div>
   <p class="section"><button class="btn warn sm" data-act="delClient">${arm('client','Delete client','Click again to delete the client, its audits, findings and evidence')}</button></p></div></div>`;
}
function clientAudits(c,au){
  return `${ui.adding==='audit'?auditForm(c):`<div class="row" style="margin-bottom:12px"><button class="btn" data-act="tab" data-tab="audits" data-new="1">${ic('plus')}New audit</button></div>`}
  ${au.length?auditTable(au):'<div class="empty">No audits yet. Start one from the risk register, the roadmap, or the button above.</div>'}`;
}
function auditForm(c){
  return `<form class="card form" id="auditForm" style="margin-bottom:14px"><h3 class="wide">New audit</h3>${c?`<input type="hidden" id="af-client" value="${c.id}">`:`<label class="f">Client<select id="af-client">${S.clients.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></label>`}
  <label class="f">Audit type<select id="af-t">${CATS.map(([cat,cl])=>`<optgroup label="${esc(cl)}">${Object.keys(UNI).filter(t=>UNI[t].cat===cat&&TEMPLATES[t]).map(k=>`<option value="${k}">${esc(TEMPLATES[k].name)}</option>`).join('')}</optgroup>`).join('')}<option value="custom">Other (general checklist)</option></select></label>
  <label class="f">Month covered<input id="af-period" placeholder="e.g. Oct 2026 (blank: last month)"></label><label class="f">Fieldwork due<input id="af-due" type="date"></label>
  <div class="row wide"><button class="btn" type="submit">Create audit</button><button type="button" class="btn ghost" data-act="cancelAdd">Cancel</button></div></form>`;
}

/* ---------- roadmap ---------- */
function roadmapBoard(c){
  if(c.roadmap&&c.roadmap.unit!=='month'){const R0=c.roadmap;c.roadmap={...R0,unit:'month',items:(R0.items||[]).map(i=>({...i,q:Math.min(11,(+i.q||0)*3)}))};saveRoadmap(c,c.roadmap)}
  const R=c.roadmap,fy=R?.fy||fyNow(),items=R?.items||[],cq=curQ(fy),st=items.map(i=>rmStatus(i,fy));
  const done=st.filter(s=>s==='done').length,late=st.filter(s=>s==='late').length,gaps=uncovered(c);
  const tools=`<div class="row" style="margin-bottom:14px"><button class="btn ${items.length?'ghost':''}" data-act="genRm">${items.length?'Regenerate from client master':'Generate roadmap from client master'}</button>
   <label class="btn ghost">${ic('up')}Upload your roadmap (Excel / CSV)<input type="file" data-file="roadmap" accept=".csv,.xlsx,.xls" hidden></label>
   <button class="btn ghost" data-act="rmTemplate">${ic('down')}Template</button>${items.length?`<button class="btn ghost" data-act="rmCsv">${ic('down')}Download roadmap</button><button class="btn warn" data-act="clearRm">${arm('clearRm','Clear','Click again to clear')}</button>`:''}</div>`;
  const ask=ui.rmAsk?(()=>{const cq=Math.min(curQ(fy),11),r=sp=>{const e=spanEnd(fy,sp);return pLabel(fy,cq)+(e>cq?' – '+pLabel(fy,e):'')};
    return `<div class="panel" style="margin-bottom:14px;border:2px solid var(--acc)"><h3>Create the roadmap for which period?</h3>${items.length?'<p class="small muted" style="margin:-4px 0 8px">This replaces the current roadmap.</p>':''}<div class="row" style="gap:8px">${[['quarter','This quarter'],['half','This half-year'],['year','The year']].map(([k,l])=>`<button class="btn ${k==='year'?'':'ghost'}" data-act="genRmSpan" data-v="${k}">${l} <span class="small" style="font-weight:400">(${r(k)})</span></button>`).join('')}<button class="btn ghost" data-act="genRmNo">Cancel</button></div></div>`})():'';
  if(!items.length)return tools+ask+`<div class="empty">No roadmap for FY ${esc(fy)} yet. Generate one from the client master (risk register plus what applies), or upload your own plan with columns <b>Area, Activity, Month</b> and optionally <b>Owner, Checks</b>.</div>`;
  return `${tools}${ask}<div class="panel" style="margin-bottom:14px"><div class="row"><h2 class="sp" style="margin:0">${R.span&&R.span!=='year'?SPANS[R.span]+' '+pLabel(fy,R.from)+' – '+pLabel(fy,R.to):'FY '+esc(fy)}: ${done} of ${items.length} done (${pct(done,items.length)}%)</h2>${late?`<span class="tag r">${late} overdue</span>`:''}</div>
   <div class="progress" style="margin-top:10px;height:12px" role="img" aria-label="${pct(done,items.length)}% done"><span style="width:${pct(done,items.length)}%"></span></div>
   ${gaps.length?`<p style="margin:14px 0 6px"><b>Not covered yet</b> <span class="small muted">— these apply to the client but no roadmap item covers their audit area:</span></p><div class="row">${gaps.map(g=>`<button class="chip" data-act="addreq" data-name="${esc(g.name)}">${ic('plus')}<span>${esc(g.name)}</span></button>`).join('')}</div>`:'<p class="small" style="margin:12px 0 0;color:var(--ok)"><b>Every applicable requirement is covered by the roadmap.</b></p>'}</div>
   ${(()=>{/* months shown: unfinished past months, this month and the next two (or all twelve) */
     const show=QTR.map((x,qi)=>qi).filter(qi=>ui.rmAll?!(qi<cq&&!items.some(i=>i.q===qi)):(qi>=cq&&qi<cq+3)||(qi<cq&&items.some((i,ix)=>i.q===qi&&st[ix]!=='done')));ui._rmShow=show;
     return `<div class="row" style="margin:0 0 8px"><span class="small muted sp">Monthly plan: ${ui.rmAll?'all months':'months with open work, this month and the next two'}.</span><button class="btn ghost sm" data-act="rmAll">${ui.rmAll?'Show fewer months':'Show all 12 months'}</button></div>`})()}
   <div class="rmgrid" style="--cols:${Math.max(1,ui._rmShow.length)}">${QTR.map(([q],qi)=>!ui._rmShow.includes(qi)?'':`<div class="rmcol ${qi===cq?'now':''}"><h3 style="margin:2px 2px 0">${pLabel(fy,qi)} <span class="small muted" style="font-weight:500">${qi===cq?' · now':''}</span></h3>
    ${items.map((it,i)=>[it,st[i]]).filter(([it])=>it.q===qi).sort((x,y)=>(x[0].prio??5)-(y[0].prio??5)).map(([it,s])=>{const an=it.area==='custom'?it.custom:AREA_NAME(it.area),hasA=it.auditId&&S.audits.some(a=>a.id===it.auditId);return `<div class="rmcard ${s}"><div class="row" style="gap:6px"><span class="tag ${RMS[s][0]}">${RMS[s][1]}</span>${it.source==='upload'?'<span class="tag n">uploaded</span>':''}${it.kind?`<span class="tag ${it.kind==='Foremost'||it.kind==='High risk'?'r':it.kind==='Every month'?'b':it.kind==='Year-end'||it.kind==='Calendar'?'y':'n'}">${esc(it.kind)}</span>`:''}</div><p>${esc(it.title)}</p><div class="small muted">${esc((it.title.startsWith(an)?'':an+' · ')+(it.why||''))}</div>
     <div class="acts">${hasA?`<a class="btn ghost sm" href="#audit-${it.auditId}">Open audit</a>`:`<button class="btn ghost sm" data-act="rmStart" data-id="${it.id}">Start audit</button>`}<button class="btn ghost sm" data-act="rmDone" data-id="${it.id}">${it.done?'Undo':'Mark done'}</button><button class="btn ghost sm" data-act="rmDel" data-id="${it.id}" aria-label="Remove">${ic('trash')}</button></div></div>`}).join('')||'<p class="small muted" style="margin:8px 2px">Nothing planned.</p>'}</div>`).join('')}</div>
   <form class="row" id="rmAdd" style="margin-top:14px"><input id="rm-title" placeholder="Add an item, e.g. Branch cash surprise checks" style="flex:1 1 18em" required><select id="rm-area" style="flex:0 1 13em" aria-label="Area">${Object.entries(TEMPLATES).map(([k,v])=>`<option value="${k}">${esc(v.name)}</option>`).join('')}<option value="custom">Other area</option></select><select id="rm-q" style="flex:0 1 10em" aria-label="Month">${QTR.map(([q],i)=>`<option value="${i}" ${i===Math.min(cq,11)?'selected':''}>${pLabel(fy,i)}</option>`).join('')}</select><button type="submit" class="btn ghost">${ic('plus')}Add</button></form>`;
}
function vRoadmap(){
  setTop([['Roadmap']]);
  const rows=S.clients.map(c=>{const R=c.roadmap,fy=R?.fy||fyNow(),its=R?.items||[],st=its.map(i=>rmStatus(i,fy));return{c,fy,n:its.length,done:st.filter(s=>s==='done').length,late:st.filter(s=>s==='late').length,gaps:its.length?uncovered(c).length:null}});
  const tot=rows.reduce((a,r)=>a+r.n,0),dn=rows.reduce((a,r)=>a+r.done,0);
  return `<div class="head"><div class="titles"><h1>${tot?`${dn} of ${tot} roadmap items done (${pct(dn,tot)}%)`:'Audit roadmaps'}</h1><p class="sub">Each client's year plan. An item is done when its audit is reported or closed, or when it's marked done.</p></div></div>
  ${S.clients.length?`<div class="scroll"><table class="stack"><thead><tr><th>Client</th><th>FY</th><th class="num">Items</th><th>Coverage</th><th class="num">Overdue</th><th class="num">Gaps</th></tr></thead><tbody>${rows.map(r=>`<tr class="click" data-go="client-${r.c.id}" data-tab="roadmap"><td><b>${esc(r.c.name)}</b></td><td>${esc(r.fy)}</td><td class="num">${r.n||'—'}</td><td style="min-width:9em">${r.n?`<div class="progress"><span style="width:${pct(r.done,r.n)}%"></span></div><span class="small muted">${r.done} done · ${pct(r.done,r.n)}%</span>`:'<span class="tag y">No roadmap</span>'}</td><td class="num">${r.late?`<span class="over">${r.late}</span>`:'0'}</td><td class="num">${r.gaps==null?'—':r.gaps?`<span class="over">${r.gaps}</span>`:'0'}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Add a client first.</div>'}`;
}

/* ---------- audits ---------- */
function vAudits(){
  setTop([['Audits']],S.clients.length?`<button class="btn" data-act="addAudit">${ic('plus')}New audit</button>`:'');
  const f=ui.f.stage,L=S.audits.filter(a=>!f||a.stage===f).sort((a,b)=>STAGES.indexOf(a.stage)-STAGES.indexOf(b.stage));
  return `<div class="head"><div class="titles"><h1>Audits</h1><p class="sub">One process, one client, one period: checklist, data tests, vouching, GST &amp; TDS reconciliations, evidence, review and report.</p></div></div>${auditSubnav('audits')}
  ${ui.adding==='audit'?auditForm(null):''}
  <div class="row" style="margin-bottom:12px">${['',...STAGES].map(s=>`<button class="chip" data-act="stageFilter" data-v="${s}" style="${f===s?'border-color:var(--acc);color:var(--acc-ink);font-weight:700':''}">${s||'All'} <span class="muted">${s?S.audits.filter(a=>a.stage===s).length:S.audits.length}</span></button>`).join('')}</div>
  ${L.length?auditTable(L):`<div class="empty">${S.clients.length?'No audits here yet.':'Add a client first.'}</div>`}`;
}
/* vouching and the GST / TDS reconciliations are audit procedures: done inside an audit, shared by the client's audits of the same year */
function procNote(c){return `<p class="small muted" style="margin:-4px 0 12px">Audit procedure for ${esc(c.name||'')}, FY ${esc(fyNow())}. The data and results are shared by this client's audits of the year and go into this audit's report.</p>`}
function auditSubnav(on){return `<div class="tabs" role="tablist" style="margin-top:-6px">${[['audits','All audits'],['universe','Audit types'],['vouching','Vouching status'],['recon','GST & TDS status']].map(([k,l])=>`<a role="tab" class="${on===k?'on':''}" href="#${k}" style="padding:10px 14px;text-decoration:none;color:inherit;${on===k?'border-bottom:2px solid var(--acc);font-weight:600':''}">${l}</a>`).join('')}</div>`}
function auditFor(c){const L=S.audits.filter(a=>a.clientId===c.id);return L.find(a=>!['Reported','Closed'].includes(a.stage))||L[L.length-1]||null}
function vAudit(){
  const a=A();if(!a)return notFound('Audit','audits');
  const c=S.clients.find(x=>x.id===a.clientId)||{},t=a.items.filter(i=>i.r).length,e=a.items.filter(i=>i.r==='ex').length,ev=auditEvidence(a),obs=S.observations.filter(o=>o.auditId===a.id),si=STAGES.indexOf(a.stage);
  resolveNames([a.prepBy,a.revBy,...ev.map(x=>x.uploadedBy)]);
  setTop([['Audits','audits'],[c.name||'Client','client-'+c.id],[a.title]],`<button class="btn" data-act="tab" data-tab="report">${ic('report')}Report</button>`);
  const tabs=[['programme','Programme',(()=>{const P=progStatus(a,c);return P.dn.length+'/'+P.need.length})()],['checklist','Checklist',`${t}/${a.items.length}`],['proc','Procedures',''],['evidence','Evidence',ev.length],['observations','Findings',obs.length],['signoff','Sign-off'],['report','Report']];
  const body={programme:()=>programmeTab(a,c),proc:()=>procTab(a,c),checklist:()=>checklistTab(a,ev,obs),tests:()=>testsTab(a),vouching:()=>procNote(c)+vouchingTab(c),recon:()=>procNote(c)+reconTab(c),evidence:()=>`<label class="drop" data-drop="audit">${ic('up')}<b>Drop evidence files here or click to upload</b><span class="small">Excel workings, ledgers, PDFs, screenshots, confirmations · linked to this audit</span><input type="file" data-file="audit" multiple hidden></label><div style="margin-top:10px">${evidenceList(ev,{audit:a})}</div>`,observations:()=>`<div class="row" style="margin-bottom:10px"><button class="btn" data-act="newObs">${ic('plus')}New finding</button></div>${obsTable(obs,{})}`,signoff:()=>signoffTab(a),report:()=>reportTab(a)}[ui.atab]||(()=>checklistTab(a,ev,obs));
  return `<div class="head"><div class="titles"><h1>${esc(a.title)}</h1><p class="sub"><a href="#client-${c.id}">${esc(c.name||'')}</a> · ${esc(a.period||'Period not set')}${a.due?' · fieldwork due '+fmtD(a.due):''}</p></div></div>
  <div class="stepper" role="group" aria-label="Audit stage">${STAGES.map((s,i)=>`<button data-act="stage" data-v="${s}" class="${i<si?'done':i===si?'cur':''}" aria-pressed="${i===si}">${s}</button>`).join('')}</div>
  <div class="row small muted" style="margin:8px 0 4px;gap:16px"><span><b style="color:var(--ink)">${t}/${a.items.length}</b> checks tested</span><span><b class="${e?'over':''}" style="${e?'':'color:var(--ink)'}">${e}</b> exception${e===1?'':'s'}</span><span><b style="color:var(--ink)">${ev.length}</b> evidence file${ev.length===1?'':'s'}</span><span><b style="color:var(--ink)">${obs.length}</b> finding${obs.length===1?'':'s'}</span><span>${a.revBy?'<span class="tag g">Reviewed</span>':a.prepBy?'<span class="tag y">Awaiting review</span>':'<span class="tag n">Not signed</span>'}</span></div>
  ${(()=>{const P=progStatus(a,c);return `<div class="row small" style="margin:6px 0 2px;gap:10px"><b>Audit programme:</b> ${P.dn.length} of ${P.need.length} required procedures done ${P.done?'<span class="tag g">Ready to report</span>':'<a href="#" data-act="tab" data-tab="programme">see what is left</a>'}</div>`})()}
  <div class="tabs" role="tablist">${tabs.map(([k,l,n])=>`<button role="tab" aria-selected="${ui.atab===k}" class="${ui.atab===k?'on':''}" data-act="tab" data-tab="${k}">${l}${n!==''&&n!=null?`<span class="n">${n}</span>`:''}</button>`).join('')}</div>${body()}`;
}
function checklistTab(a,ev,obs){
  return `<div class="progress" style="height:10px;margin-bottom:6px"><span style="width:${pct(a.items.filter(i=>i.r&&i.r!=='ex').length,a.items.length)}%"></span><span class="x" style="width:${pct(a.items.filter(i=>i.r==='ex').length,a.items.length)}%"></span></div>
  ${a.items.map((it,i)=>{const ie=ev.filter(x=>x.item===i),ob=obs.find(o=>o.item===i);return `<div class="chk"><span class="no">${i+1}</span><div><div class="q">${esc(it.q)}</div><div class="ref">${esc(it.ref||'')}</div></div>
   <div class="seg" role="group" aria-label="Result">${[['ok','Satisfactory'],['ex','Exception'],['na','N/A']].map(([v,l])=>`<button data-act="res" data-i="${i}" data-v="${v}" class="${v} ${it.r===v?'on':''}" aria-pressed="${it.r===v}">${l}</button>`).join('')}</div>
   <div class="body"><textarea data-note="${i}" placeholder="Work done, sample, conclusion" aria-label="Working note for check ${i+1}">${esc(it.n||'')}</textarea>
    <div class="chips" style="margin-top:6px">${ie.map(x=>`<button class="chip" data-act="evDl" data-id="${x.id}" title="Download ${esc(x.name)}">${ic('clip')}<b>${eref(a,x.id)}</b><span>${esc(x.name)}</span></button>`).join('')}
    <label class="chip" style="cursor:pointer;color:var(--acc-ink)">${ic('plus')}Attach evidence<input type="file" data-file="item" data-i="${i}" multiple hidden></label>
    ${it.r==='ex'?(ob?`<a class="chip" href="#obs-${ob.id}"><span class="tag ${ob.rating}">${RLABEL[ob.rating]}</span><span>Finding raised</span></a>`:`<button class="chip" style="color:var(--hi);border-color:color-mix(in srgb,var(--hi) 40%,transparent)" data-act="raise" data-i="${i}">${ic('flag')}Raise finding</button>`):''}</div></div></div>`}).join('')}
  <form class="row" id="addItemForm" style="margin-top:14px"><input id="newItem" placeholder="Add your own check" style="flex:1 1 20em" required><button class="btn ghost" type="submit">${ic('plus')}Add check</button></form>`;
}
function testsTab(a){
  const T=a.tests;
  return `<label class="drop" data-drop="ledger">${ic('up')}<b>Upload a ledger or day book to test (Excel or CSV)</b><span class="small">Columns for date, voucher no., party, ledger, amount and, if available, payment mode. The file is kept as evidence.</span><input type="file" data-file="ledger" accept=".csv,.xlsx,.xls" hidden></label>
  ${T?`<p class="small muted">${esc(T.file)} · ${T.rows} rows tested on ${fmtD(T.at)}${T.evidenceId?` · kept as evidence ${eref(a,T.evidenceId)}`:''}</p><div class="grid3">${T.res.map(r=>`<div class="card"><div class="row"><b class="sp">${esc(r.name)}</b>${r.total?`<span class="tag r">${r.total} found</span>`:'<span class="tag g">None</span>'}</div><div class="small muted" style="margin-top:4px">${esc(r.why)}</div>
   ${r.total?`<div class="scroll"><table style="margin-top:8px"><tbody>${r.hits.slice(0,6).map(h=>`<tr><td>${esc(h.date)}</td><td>${esc(h.party)}</td><td class="num">${inr(h.amount)}</td></tr>`).join('')}</tbody></table></div>${r.total>6?`<div class="small muted">+${r.total-6} more</div>`:''}<button class="btn ghost sm" style="margin-top:8px" data-act="testObs" data-k="${esc(r.key)}">${ic('flag')}Raise finding</button>`:''}</div>`).join('')}</div>`:''}`;
}
function signoffTab(a){
  return `<div class="grid2"><div class="card"><h3>Prepared</h3><p style="margin:4px 0 12px">${a.prepBy?`<b>${esc(who(a.prepBy))}</b> on ${fmtD(a.prepAt)}`:'Not signed yet'}</p><button class="btn ${a.prepBy?'ghost':''}" data-act="signPrep">${a.prepBy?'Re-sign as preparer':'Sign as preparer'}</button></div>
  <div class="card"><h3>Reviewed (SIA 350)</h3><p style="margin:4px 0 12px">${a.revBy?`<b>${esc(who(a.revBy))}</b> on ${fmtD(a.revAt)}`:'Not reviewed yet'}</p><button class="btn ${a.revBy?'ghost':''}" data-act="signRev" ${a.prepBy?'':'disabled'}>Sign as reviewer</button>${a.prepBy&&a.prepBy===a.revBy?'<p class="small over">Preparer and reviewer are the same person.</p>':''}</div></div>
  <p class="section"><button class="btn warn sm" data-act="delAudit">${arm('audit','Delete audit','Click again to delete this audit and its evidence')}</button></p>`;
}

/* ---------- evidence ---------- */
function fileIcon(n){const x=extOf(n),k=['xlsx','xls','csv','xlsm'].includes(x)?'xls':x==='pdf'?'pdf':['png','jpg','jpeg','gif','webp'].includes(x)?'img':['doc','docx'].includes(x)?'doc':'oth';return `<span class="fileic ${k}">${esc(x||'file')}</span>`}
function evidenceList(ev,o){
  if(!ev.length)return '<div class="empty">No evidence files yet.</div>';
  return ev.map(e=>{const a=S.audits.find(x=>x.id===e.auditId),link=a?(e.item!=null&&a.items[e.item]?`Check ${e.item+1}: ${a.items[e.item].q}`:e.purpose||'Audit file'):'Client file';return `<div class="ev">${fileIcon(e.name)}<div><div><b>${a?eref(a,e.id)+' · ':''}${esc(e.name)}</b></div><div class="meta">${o.showAudit&&a?`<a href="#audit-${a.id}">${esc(a.title)}</a> · `:''}${esc(link)}</div><div class="meta">${fsize(e.size)} · ${esc(who(e.uploadedBy))}, ${fmtD((e.uploadedAt||'').slice(0,10))} · SHA-256 <span class="hash">${esc((e.sha256||'').slice(0,16))}…</span></div>
   ${e.summary?`<details><summary class="small">Spreadsheet contents (${e.summary.length} sheet${e.summary.length>1?'s':''})</summary><div class="scroll"><table><thead><tr><th>Sheet</th><th class="num">Rows</th><th class="num">Columns</th><th>Headers</th></tr></thead><tbody>${e.summary.map(s=>`<tr><td>${esc(s.name)}</td><td class="num">${s.rows}</td><td class="num">${s.cols}</td><td class="small">${esc(s.header.filter(Boolean).join(', '))}</td></tr>`).join('')}</tbody></table></div></details>`:''}</div>
   <div class="row" style="gap:6px"><button class="btn ghost sm" data-act="evDl" data-id="${e.id}" aria-label="Download">${ic('down')}</button><button class="btn warn sm" data-act="evDel" data-id="${e.id}" aria-label="Delete">${ui.armed==='ev:'+e.id?'Delete?':ic('trash')}</button></div></div>`}).join('');
}
async function uploadFiles(files,o){
  const L=[...files];if(!L.length)return[];toast(`Uploading ${L.length} file${L.length>1?'s':''}…`);const ids=[];
  for(const f of L){try{ids.push(await addEvidence(f,o))}catch(er){toast(er.message)}}
  if(ids.length)toast(`${ids.length} evidence file${ids.length>1?'s':''} attached`);return ids;
}

/* ---------- findings ---------- */
function obsTable(L,o){
  if(!L.length)return `<div class="empty">No findings${o.client?' for this client':''} yet.</div>`;
  L=[...L].sort((a,b)=>(a.status==='Closed')-(b.status==='Closed')||'HML'.indexOf(a.rating)-'HML'.indexOf(b.rating)||(a.due||'9').localeCompare(b.due||'9'));
  return `<div class="scroll"><table class="stack"><thead><tr><th>Rating</th><th>Finding</th>${o.client?'':'<th>Client</th>'}<th>Owner</th><th>Due</th><th>Status</th></tr></thead><tbody>${L.map(x=>`<tr class="click" data-go="obs-${x.id}"><td><span class="tag ${x.rating}">${RLABEL[x.rating]}</span></td><td><b>${esc(x.title)}</b>${typeof repeatOf==='function'&&x.status!=='Closed'&&repeatOf(x)?' <span class="tag r">Repeat</span>':''}${(x.evidence||[]).length?`<div class="small muted">${ic('clip')} ${(x.evidence||[]).length} evidence</div>`:''}</td>${o.client?'':`<td>${esc(cname(x.clientId))}</td>`}<td>${esc(x.owner||'—')}</td><td class="${overdue(x)?'over':''}" style="white-space:nowrap">${fmtD(x.due)}</td><td>${esc(x.status)}</td></tr>`).join('')}</tbody></table></div>`;
}
function vObsList(){
  setTop([['Findings']],`<button class="btn ghost" data-act="csvOut">${ic('down')}CSV</button>${S.clients.length?`<button class="btn" data-act="newObs">${ic('plus')}New finding</button>`:''}`);
  const f=ui.f,L=S.observations.filter(o=>(!f.client||o.clientId===f.client)&&(!f.rating||o.rating===f.rating)&&(f.status==='all'||(f.status==='open'?o.status!=='Closed':o.status===f.status)));
  return `<div class="head"><div class="titles"><h1>Findings and follow-up</h1><p class="sub">Every observation with its rating, owner, target date and evidence, tracked until closed (SIA 390).</p></div></div>
  <div class="row" style="margin-bottom:14px"><select data-filter="client" style="max-width:16em" aria-label="Client"><option value="">All clients</option>${S.clients.map(c=>`<option value="${c.id}" ${f.client===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select>
  <select data-filter="rating" style="max-width:10em" aria-label="Rating"><option value="">All ratings</option>${'HML'.split('').map(k=>`<option value="${k}" ${f.rating===k?'selected':''}>${RLABEL[k]}</option>`).join('')}</select>
  <select data-filter="status" style="max-width:11em" aria-label="Status">${[['open','Not closed'],['all','All'],...OSTAT.map(s=>[s,s])].map(([v,l])=>`<option value="${v}" ${f.status===v?'selected':''}>${l}</option>`).join('')}</select></div>${obsTable(L,{})}`;
}
function vObs(){
  const isNew=ui.id==='new',o=isNew?ui.draft:S.observations.find(x=>x.id===ui.id);if(!o)return notFound('Finding','observations');
  const a=S.audits.find(x=>x.id===o.auditId),ev=a?auditEvidence(a):S.evidence.filter(e=>e.clientId===o.clientId&&!e.auditId),sel=new Set(o.evidence||[]);
  setTop(a?[['Audits','audits'],[a.title,'audit-'+a.id],[isNew?'New finding':'Finding']]:[['Findings','observations'],[isNew?'New finding':o.title]]);
  return `<div class="head"><div class="titles"><h1>${isNew?'New finding':esc(o.title)}</h1><p class="sub">Condition, criteria, cause and effect, then the recommendation, management's action plan and the evidence behind it.</p></div></div>
  <form id="obsForm"><div class="grid2"><div>
   <fieldset><legend>Finding</legend><div class="form"><label class="f wide">Title<input id="of-title" required value="${esc(o.title)}"></label><label class="f">Client<select id="of-client">${S.clients.map(c=>`<option value="${c.id}" ${o.clientId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><label class="f">Audit<select id="of-audit"><option value="">Not linked</option>${S.audits.map(x=>`<option value="${x.id}" ${o.auditId===x.id?'selected':''}>${esc(x.title)} · ${esc(cname(x.clientId))}</option>`).join('')}</select></label>
    <label class="f">Rating<select id="of-rating">${'HML'.split('').map(k=>`<option value="${k}" ${o.rating===k?'selected':''}>${RLABEL[k]}</option>`).join('')}</select></label><label class="f">Status<select id="of-status">${OSTAT.map(s=>`<option ${o.status===s?'selected':''}>${s}</option>`).join('')}</select></label></div></fieldset>
   <fieldset><legend>Analysis</legend><div class="form"><label class="f wide">Condition (what we found)<textarea id="of-cond">${esc(o.condition)}</textarea></label><label class="f">Criteria (what should happen)<textarea id="of-crit">${esc(o.criteria)}</textarea></label><label class="f">Cause<textarea id="of-cause">${esc(o.cause)}</textarea></label><label class="f wide">Effect / risk<textarea id="of-effect">${esc(o.effect)}</textarea></label></div></fieldset>
   <fieldset><legend>Action plan</legend><div class="form"><label class="f wide">Recommendation<textarea id="of-rec">${esc(o.rec)}</textarea></label><label class="f wide">Management response<textarea id="of-resp">${esc(o.response)}</textarea></label><label class="f">Action owner<input id="of-owner" value="${esc(o.owner)}"></label><label class="f">Target date<input id="of-due" type="date" value="${esc(o.due)}"></label></div></fieldset></div>
  <div><div class="panel sticky"><h2>Supporting evidence</h2><p class="small muted" style="margin-top:-4px">Ticked files are cited with this finding in the report.</p>
   ${ev.length?ev.map(e=>`<label class="cb" style="align-items:flex-start;border-bottom:1px solid var(--line);padding:6px 0"><input type="checkbox" class="of-ev" value="${e.id}" ${sel.has(e.id)?'checked':''}><span><b>${a?eref(a,e.id)+' · ':''}${esc(e.name)}</b><br><span class="small muted">${fsize(e.size)}${e.item!=null&&a?.items[e.item]?' · check '+(e.item+1):''}</span></span></label>`).join(''):'<p class="small muted">No evidence on this audit yet. Attach files from the audit\'s Evidence tab.</p>'}</div></div></div>
  <div class="row section"><button class="btn" type="submit">Save finding</button>${isNew?'':`<button type="button" class="btn warn" data-act="delObs">${arm('obs','Delete','Click again to delete')}</button>`}</div></form>`;
}

/* ---------- reports ---------- */
function vReports(){
  setTop([['Reports']]);
  return `<div class="head"><div class="titles"><h1>Audit reports</h1><p class="sub">Each report is built in the SIA 370 structure from the audit's checklist, findings and evidence. Download it as an HTML file (opens in Word), or as a ZIP with every evidence file and an index.</p></div></div>
  ${S.audits.length?`<div class="scroll"><table class="stack"><thead><tr><th>Audit</th><th>Client</th><th>Stage</th><th class="num">Findings</th><th class="num">Evidence</th><th>Review</th></tr></thead><tbody>${S.audits.map(a=>`<tr class="click" data-go="report-${a.id}"><td><b>${esc(a.title)}</b><div class="small muted">${esc(a.period||'')}</div></td><td>${esc(cname(a.clientId))}</td><td><span class="tag ${['Reported','Closed'].includes(a.stage)?'g':'b'}">${esc(a.stage)}</span></td><td class="num">${S.observations.filter(o=>o.auditId===a.id).length}</td><td class="num">${S.evidence.filter(e=>e.auditId===a.id).length}</td><td>${a.revBy?'<span class="tag g">Reviewed</span>':'<span class="tag y">Not reviewed</span>'}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Create an audit first.</div>'}`;
}
function reportTab(a){
  const ev=auditEvidence(a);
  return `<div class="row" style="margin-bottom:14px">${dl?`<button class="btn" data-act="dlReport">${ic('down')}Download report</button><button class="btn ghost" data-act="dlZip">${ic('zip')}Report + evidence (ZIP)</button>`:''}<button class="btn ghost" data-act="copyRep">Copy text</button><span class="small muted">${ev.length} evidence file${ev.length===1?'':'s'} · ${a.revBy?'reviewed':'not yet reviewed'}</span></div><div class="report" id="rep">${reportBody(a)}</div>`;
}
function reportBody(a){
  const c=S.clients.find(x=>x.id===a.clientId)||{},obs=S.observations.filter(o=>o.auditId===a.id).sort((x,y)=>'HML'.indexOf(x.rating)-'HML'.indexOf(y.rating)),ev=auditEvidence(a);
  const n=k=>obs.filter(o=>o.rating===k).length,opinion=n('H')?'Unsatisfactory':n('M')?'Needs improvement':'Satisfactory';
  const prev=S.observations.filter(o=>o.clientId===a.clientId&&o.auditId!==a.id&&(o.createdAt||'')<(a.createdAt||''));
  const ctx=c.id?applicability(c).filter(x=>x.st!=='no'&&x.areas.includes(a.t)):[];
  const td=x=>`<td>${esc(x)}</td>`,refs=ids=>(ids||[]).map(id=>eref(a,id)).filter(Boolean).join(', ');
  const tested=a.items.filter(i=>i.r).length,res=r=>(RES.find(x=>x[0]===(r||''))||[])[1];
  let sec=0;const H=t=>`<h2>${++sec}. ${t}</h2>`;
  return `<p style="margin:0;color:#5b6283;font-size:13px">INTERNAL AUDIT REPORT</p><h1 style="margin:4px 0 8px">${esc(a.title)}</h1>
  <table style="margin:12px 0"><tbody>${[['Client',c.name],['Entity',[ENT[c.type],isSmall(c)?'small company':'',REG[c.reg]&&c.reg!=='none'?REG[c.reg]:''].filter(Boolean).join(', ')],['Period covered',a.period||'—'],['Report date',fmtD(today())],['Stage',a.stage],['Distribution','Audit Committee, Managing Director, process owner']].map(([k,v])=>`<tr><th style="width:12em">${k}</th>${td(v||'—')}</tr>`).join('')}</tbody></table>
  ${H('Executive summary')}<p>Overall opinion: <b>${opinion}</b>. ${obs.length} finding${obs.length===1?'':'s'}: ${n('H')} high, ${n('M')} medium, ${n('L')} low. ${tested} of ${a.items.length} planned checks tested; ${ev.length} evidence file${ev.length===1?'':'s'} on file.</p>
  ${obs.length?`<ul>${obs.slice(0,3).map(o=>`<li><b>${esc(o.title)}</b> (${RLABEL[o.rating]})${o.due?' · action due '+fmtD(o.due):''}</li>`).join('')}</ul>`:''}
  ${H('Scope, objectives and regulatory context')}<p>To evaluate the design and operating effectiveness of controls over ${esc((TEMPLATES[a.t]?.name||a.title).toLowerCase())} for the period stated, in line with the Standards on Internal Audit issued by ICAI.</p>
  ${ctx.length?`<p>Requirements that apply to the client and touch this area:</p><ul>${ctx.map(x=>`<li>${esc(x.name)} — ${esc(x.why)} (${esc(x.basis)})</li>`).join('')}</ul>`:''}
  ${H('Approach')}<p>Checklist-based testing of key controls (SIA 310, 320), examination of documents and system records${a.tests?`, and data analysis of ${a.tests.rows} ledger entries (Annexure C)`:''}. Evidence was retained and fingerprinted with SHA-256 so each file can be matched to this report (Annexure A).</p>
  ${H('Results of testing')}<table><thead><tr><th>#</th><th>Check</th><th>Result</th><th>Evidence</th><th>Notes</th></tr></thead><tbody>${a.items.map((it,i)=>`<tr><td>${i+1}</td>${td(it.q)}${td(res(it.r))}${td(ev.filter(e=>e.item===i).map(e=>eref(a,e.id)).join(', ')||'—')}${td(it.n||'')}</tr>`).join('')}</tbody></table>
  ${H('Detailed findings')}${obs.length?obs.map((o,k)=>`<h3>${sec}.${k+1} ${esc(o.title)} — ${RLABEL[o.rating]}</h3><table><tbody>${[['Condition',o.condition],['Criteria',o.criteria],['Cause',o.cause],['Effect / risk',o.effect],['Recommendation',o.rec],['Management response',o.response],['Action owner',o.owner],['Target date',fmtD(o.due)],['Status',o.status],['Evidence',refs(o.evidence)||(o.item!=null?ev.filter(e=>e.item===o.item).map(e=>eref(a,e.id)).join(', '):'')]].map(([k2,v])=>`<tr><th style="width:12em">${k2}</th>${td(v||'—')}</tr>`).join('')}</tbody></table>`).join(''):'<p>No findings.</p>'}
  ${H('Status of previous findings')}${prev.length?`<table><thead><tr><th>Finding</th><th>Rating</th><th>Status</th></tr></thead><tbody>${prev.map(o=>`<tr>${td(o.title)}${td(RLABEL[o.rating])}${td(o.status)}</tr>`).join('')}</tbody></table>`:'<p>None for this client.</p>'}
  <h2>Annexure A — Evidence index</h2>${ev.length?`<table><thead><tr><th>Ref</th><th>File</th><th>Linked to</th><th>Size</th><th>Added</th><th>SHA-256</th></tr></thead><tbody>${ev.map(e=>`<tr><td><b>${eref(a,e.id)}</b></td>${td(e.name)}${td(e.item!=null&&a.items[e.item]?'Check '+(e.item+1):e.purpose||'Audit file')}${td(fsize(e.size))}<td>${esc(who(e.uploadedBy))}<br>${fmtD((e.uploadedAt||'').slice(0,10))}</td><td style="font-family:Consolas,monospace;font-size:11px;word-break:break-all">${esc(e.sha256||'')}</td></tr>`).join('')}</tbody></table>`:'<p>No evidence files attached.</p>'}
  ${ev.some(e=>e.summary)?`<h2>Annexure B — Spreadsheet evidence</h2>${ev.filter(e=>e.summary).map(e=>`<h3>${eref(a,e.id)} · ${esc(e.name)}</h3><table><thead><tr><th>Sheet</th><th>Rows</th><th>Columns</th><th>Headers</th></tr></thead><tbody>${e.summary.map(s=>`<tr>${td(s.name)}${td(s.rows)}${td(s.cols)}${td(s.header.filter(Boolean).join(', '))}</tr>`).join('')}</tbody></table>`).join('')}`:''}
  ${a.tests?`<h2>Annexure C — Data tests</h2><p>${esc(a.tests.file)}${a.tests.evidenceId?' ('+eref(a,a.tests.evidenceId)+')':''}, ${a.tests.rows} rows, tested ${fmtD(a.tests.at)}.</p><table><thead><tr><th>Test</th><th>Items found</th><th>Why it matters</th></tr></thead><tbody>${a.tests.res.map(r=>`<tr>${td(r.name)}${td(r.total)}${td(r.why)}</tr>`).join('')}</tbody></table>`:''}
  ${vouchReport(a)}
  ${reconReport(a)}
  ${programmeReport(a)}
  <p style="margin-top:26px">Prepared by: <b>${esc(who(a.prepBy))}</b>${a.prepAt?' ('+fmtD(a.prepAt)+')':''} &nbsp;·&nbsp; Reviewed by: <b>${esc(who(a.revBy))}</b>${a.revAt?' ('+fmtD(a.revAt)+')':''}</p>`;
}
function reportDoc(a){return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+esc(a.title)+' - internal audit report</title><style>body{font:14px/1.5 Calibri,Arial,sans-serif;max-width:920px;margin:30px auto;padding:0 20px;color:#141a33}table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #ccd;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f3f4f9}h1{font-size:26px}h2{font-size:17px;margin-top:26px;border-bottom:2px solid #141a33;padding-bottom:4px}h3{font-size:15px}</style></head><body>'+reportBody(a)+'</body></html>'}
const fileSafe=s=>String(s).replace(/[^\p{L}\p{N}\s._,()&+\-]/gu,'-').replace(/-{2,}/g,'-').slice(0,120);
async function downloadZip(a){
  try{
    await needLib('JSZip');toast('Building the ZIP…');
    const z=new JSZip(),ev=auditEvidence(a),base=fileSafe(cname(a.clientId)+' - '+a.title);
    z.file(base+' - report.html',reportDoc(a));
    const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"',rows=[['Ref','File','Linked to','Size (bytes)','Added','SHA-256']];
    for(const e of ev){const r=eref(a,e.id);try{z.file('evidence/'+r+' - '+fileSafe(e.name),await evidenceBlob(e))}catch(er){toast(r+' could not be added: '+er.message)}rows.push([r,e.name,e.item!=null?'Check '+(e.item+1):e.purpose||'Audit file',e.size,e.uploadedAt,e.sha256])}
    z.file('evidence/evidence-index.csv',rows.map(r=>r.map(q).join(',')).join('\n'));
    const blob=await z.generateAsync({type:'blob'});
    await dl.save({filename:base+' - report and evidence.zip',data:blob});toast('ZIP saved');
  }catch(er){toast(er.code==='declined'?'Download cancelled':er.message||'ZIP download failed')}
}

/* ---------- search ---------- */
function search(q){
  const p=$('#searchRes');q=q.trim().toLowerCase();if(q.length<2){p.hidden=true;return}
  const hit=s=>String(s||'').toLowerCase().includes(q);
  const R=[...S.clients.filter(c=>hit(c.name)||hit(c.industry)).map(c=>[`client-${c.id}`,c.name,'Client']),...S.audits.filter(a=>hit(a.title)||hit(cname(a.clientId))).map(a=>[`audit-${a.id}`,a.title,'Audit · '+cname(a.clientId)]),...S.observations.filter(o=>hit(o.title)||hit(o.owner)).map(o=>[`obs-${o.id}`,o.title,'Finding · '+cname(o.clientId)]),...S.evidence.filter(e=>hit(e.name)).map(e=>[e.auditId?`audit-${e.auditId}`:`client-${e.clientId}`,e.name,'Evidence · '+cname(e.clientId)])].slice(0,12);
  p.innerHTML=R.length?R.map(([h,t,s])=>`<a href="#${h}" data-act="closeSearch">${esc(t)}<small>${esc(s)}</small></a>`).join(''):'<div class="small muted" style="padding:10px">No matches.</div>';p.hidden=false;
}

/* ---------- actions ---------- */
function newAudit(clientId,t,period,due,o={}){
  if(!period){const d=new Date(),pm=d.getMonth()===0?11:d.getMonth()-1,py=d.getMonth()===0?d.getFullYear()-1:d.getFullYear();period=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][pm]+' '+py}
  const id=nid(),tpl=TEMPLATES[t],checks=o.checks&&o.checks.length?o.checks.map(q=>[q,'From roadmap']):(tpl?tpl.items:GENERIC);
  put('audits',id,{clientId,t:tpl?t:'custom',title:o.title||(tpl?tpl.name:'General audit'),period,due,stage:'Planned',roadmapItem:o.rmId||'',items:checks.map(([q,ref])=>({q,ref,r:'',n:''})),createdAt:new Date().toISOString()});
  if(o.rmId){const c=S.clients.find(x=>x.id===clientId);if(c&&c.roadmap)put('clients',c.id,{...c,roadmap:{...c.roadmap,items:c.roadmap.items.map(i=>i.id===o.rmId?{...i,auditId:id}:i)}})}
  ui.adding=null;go('audit-'+id);
}
function newObs(pre){ui.draft={rating:'M',status:'Open',evidence:[],...pre};go('obs-new')}
const dlFile=(filename,data)=>{if(!dl)return toast('Download is not available here');dl.save({filename,data}).then(()=>{},er=>toast(er.code==='declined'?'Download cancelled':'Download is not available here'))};
const ACT={
  tab:t=>{if(ui.view==='client'){ui.ctab=t.dataset.tab;ui.adding=t.dataset.new?'audit':null}else if(ui.view==='audit'){let k=t.dataset.tab;const m={vouching:'vouch',recon:t.dataset.rt==='r5'?'tds':'gst',tests:'tests'};if(m[k]){ui.ptab=m[k];k='proc'}ui.atab=k;if(t.dataset.rt)ui.rtab=t.dataset.rt}render()},
  signout:()=>sb.auth.signOut(),
  switchWs:()=>{ws=null;if(channel){sb.removeChannel(channel);channel=null}render()},
  ws:t=>{const w=wsList.find(x=>x.id===t.dataset.id);if(w)openWorkspace(w).then(()=>go('home'))},
  signup:t=>{const email=val('lg-email'),password=$('#lg-pass').value;if(!email||password.length<8)return toast('Enter an email and a password of 8+ characters');t.disabled=true;sb.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}}).then(({data,error})=>{t.disabled=false;if(error)return toast(error.message);if(!data.session)toast('Check your email and click the confirmation link, then sign in.')})},
  loadSample:t=>{t.disabled=true;loadSample()},
  clearSample:()=>{if(ui.armed!=='sample'){ui.armed='sample';return render()}ui.armed=null;for(const col of Object.keys(S))for(const x of S[col].filter(y=>y.sample))del(col,x.id);toast('Sample data deleted')},
  delClient:()=>{if(ui.armed!=='client'){ui.armed='client';return render()}const c=C();S.audits.filter(a=>a.clientId===c.id).forEach(a=>del('audits',a.id));S.observations.filter(o=>o.clientId===c.id).forEach(o=>del('observations',o.id));S.evidence.filter(e=>e.clientId===c.id).forEach(removeEvidence);S.vouching.filter(v=>v.clientId===c.id).forEach(v=>del('vouching',v.id));del('clients',c.id);go('clients')},
  rebuildPlan:()=>{if(ui.armed!=='rebuild'){ui.armed='rebuild';return render()}ui.armed=null;const c=C();put('clients',c.id,{...c,risks:suggestedRisks(c)})},
  newAudit:t=>{const c=C();newAudit(c.id,t.dataset.t,'','')},
  addAudit:()=>{ui.adding='audit';render()},
  cancelAdd:()=>{ui.adding=null;render()},
  stageFilter:t=>{ui.f.stage=t.dataset.v;render()},
  genRm:()=>{ui.rmAsk=true;render()},
  genRmSpan:t=>{const c=C(),sp=t.dataset.v;ui.rmAsk=false;ui.rmAll=sp!=='year'?true:ui.rmAll;saveRoadmap(c,genRoadmap(c,sp));toast(SPANS[sp]+' roadmap generated from the client master')},
  genRmNo:()=>{ui.rmAsk=false;render()},
  clearRm:()=>{if(ui.armed!=='clearRm'){ui.armed='clearRm';return render()}ui.armed=null;saveRoadmap(C(),{fy:fyNow(),items:[]})},
  rmTemplate:()=>dlFile('roadmap-template.csv','Area,Activity,Quarter,Owner,Checks\nProcure to pay,Vendor master and payments review,Q1,Internal audit,"Vendor changes approved; No duplicate payments"\nGST,GSTR-9 and 9C reconciliation review,Q3,Tax team,\nInventory,Year-end stock count observation,Mar,Plant head,\n'),
  rmAll:()=>{ui.rmAll=!ui.rmAll;render()},
  rmCsv:()=>{const c=C(),R=c.roadmap,q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';dlFile(fileSafe(c.name)+' roadmap FY '+R.fy+'.csv',['Area,Activity,Month,Status,Reason',...R.items.map(i=>[i.area==='custom'?i.custom:AREA_NAME(i.area),i.title,pLabel(R.fy,i.q),RMS[rmStatus(i,R.fy)][1],i.why].map(q).join(','))].join('\n'))},
  rmStart:t=>{const c=C(),it=c.roadmap.items.find(i=>i.id===t.dataset.id);newAudit(c.id,it.area,it.q?pLabel(c.roadmap.fy,it.q-1):'Mar '+(+String(c.roadmap.fy).slice(0,4)),qEnd(c.roadmap.fy,it.q),{title:it.title,checks:it.checks,rmId:it.id})},
  rmDone:t=>{const c=C();saveRoadmap(c,{...c.roadmap,items:c.roadmap.items.map(i=>i.id===t.dataset.id?{...i,done:!i.done}:i)})},
  rmDel:t=>{const c=C();saveRoadmap(c,{...c.roadmap,items:c.roadmap.items.filter(i=>i.id!==t.dataset.id)})},
  addreq:t=>{const c=C(),a=applicability(c).find(x=>x.name===t.dataset.name),m=COMPLIANCE[a.name],cq=Math.min(curQ(c.roadmap.fy),11),add=m?m[2].map(q=>({area:m[0],title:m[1],q:Math.max(q*3+2,cq)})):[{area:a.areas[0],title:AREA_NAME(a.areas[0])+' review',q:cq}];saveRoadmap(c,{...c.roadmap,items:[...c.roadmap.items,...add.map(x=>({id:nid(),source:'manual',done:false,auditId:'',why:'Required: '+a.name,req:a.name,...x}))]})},
  stage:t=>{const a=A(),v=t.dataset.v;if(['Reported','Closed'].includes(v)){const c=S.clients.find(x=>x.id===a.clientId),m=c&&mandatory(c);if(c){const P=progStatus(a,c);if(!P.done)return toast('Finish the audit programme first: '+P.need.filter(x=>x.st!=='done'&&x.st!=='na').map(x=>PR[x.k].n).join(', ')+'.')}}put('audits',a.id,{...a,stage:v})},
  res:t=>{const a=A(),i=+t.dataset.i,v=a.items[i].r===t.dataset.v?'':t.dataset.v;put('audits',a.id,{...a,items:a.items.map((x,k)=>k===i?{...x,r:v}:x),stage:a.stage==='Planned'?'Fieldwork':a.stage})},
  raise:t=>{const a=A(),i=+t.dataset.i,it=a.items[i];newObs({clientId:a.clientId,auditId:a.id,item:i,title:it.q.replace(/^(.)/,s=>s.toUpperCase())+': exception',condition:it.n||'',criteria:it.q,evidence:S.evidence.filter(e=>e.auditId===a.id&&e.item===i).map(e=>e.id)})},
  testObs:t=>{const a=A(),r=a.tests.res.find(x=>x.key===t.dataset.k);newObs({clientId:a.clientId,auditId:a.id,title:r.name+' in '+a.title.toLowerCase(),condition:`${r.total} entries found in ${a.tests.file} (${a.tests.rows} rows). Examples: `+r.hits.slice(0,3).map(h=>`${h.date} ${h.party} ${inr(h.amount)}`).join('; ')+'.',criteria:r.why,evidence:a.tests.evidenceId?[a.tests.evidenceId]:[]})},
  evDl:t=>{const e=S.evidence.find(x=>x.id===t.dataset.id);if(!e)return;evidenceBlob(e).then(b=>dlFile(e.name,b),er=>toast(er.message))},
  evDel:t=>{const k='ev:'+t.dataset.id;if(ui.armed!==k){ui.armed=k;return render()}ui.armed=null;const e=S.evidence.find(x=>x.id===t.dataset.id);if(e)removeEvidence(e).then(()=>toast('Evidence deleted'))},
  signPrep:()=>{const a=A();put('audits',a.id,{...a,prepBy:me||'local',prepAt:today()})},
  signRev:()=>{const a=A();put('audits',a.id,{...a,revBy:me||'local',revAt:today(),stage:['Planned','Fieldwork'].includes(a.stage)?'Review':a.stage})},
  delAudit:()=>{if(ui.armed!=='audit'){ui.armed='audit';return render()}const a=A();S.evidence.filter(e=>e.auditId===a.id).forEach(removeEvidence);del('audits',a.id);go('audits')},
  newObs:()=>{const a=A(),c=C();newObs({clientId:a?.clientId||c?.id||(ui.f.client||S.clients[0]?.id),auditId:a?.id||''})},
  delObs:()=>{if(ui.armed!=='obs'){ui.armed='obs';return render()}const o=S.observations.find(x=>x.id===ui.id);del('observations',o.id);go(o.auditId?'audit-'+o.auditId:'observations')},
  csvOut:()=>{const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';dlFile('findings-'+today()+'.csv',[['Client','Audit','Title','Rating','Status','Owner','Due','Condition','Recommendation','Management response','Evidence'].join(','),...S.observations.map(o=>{const a=S.audits.find(x=>x.id===o.auditId);return[cname(o.clientId),a?.title||'',o.title,RLABEL[o.rating],o.status,o.owner,o.due,o.condition,o.rec,o.response,a?(o.evidence||[]).map(id=>eref(a,id)).join(' '):''].map(q).join(',')})].join('\n'))},
  copyRep:()=>navigator.clipboard?.writeText($('#rep').innerText).then(()=>toast('Report copied'),()=>toast('Copy was blocked by the browser')),
  dlReport:()=>{const a=A();dlFile(fileSafe(cname(a.clientId)+' - '+a.title)+' - internal audit report.html',reportDoc(a))},
  dlZip:()=>downloadZip(A()),
  closeSearch:()=>{$('#searchRes').hidden=true;$('#q').value=''},
  toRoadmap:()=>{ui.ctab='roadmap';ui.lastId=null}
};
document.addEventListener('click',e=>{
  const g=e.target.closest('[data-go]');if(g&&!e.target.closest('a,button,input,select,label')){const tab=g.dataset.tab;if(tab){ui.lastId=g.dataset.go.replace(/^(client|audit)-/,'');if(/^audit-/.test(g.dataset.go)){const m={vouching:'vouch',recon:'gst'};if(m[tab]){ui.ptab=m[tab];ui.atab='proc'}else ui.atab=tab}else ui.ctab=tab}go(g.dataset.go);return}
  const t=e.target.closest('[data-act]');if(!t){if(!e.target.closest('.searchbox'))$('#searchRes').hidden=true;return}
  const k=t.dataset.act;if(!['clearSample','delClient','delAudit','delObs','rebuildPlan','genRm','clearRm','evDel'].includes(k))ui.armed=null;
  if(k==='toRoadmap'){const id=(t.getAttribute('href')||'').replace('#client-','');ui.lastId=id;ui.ctab='roadmap';return}
  if(ACT[k]){if(t.tagName==='BUTTON'||(t.tagName==='A'&&t.getAttribute('href')==='#'))e.preventDefault();ACT[k](t)}
});
document.addEventListener('change',e=>{
  const t=e.target,c=C(),a=A();
  if(t.dataset.note!=null){const i=+t.dataset.note;return put('audits',a.id,{...a,items:a.items.map((x,k)=>k===i?{...x,n:t.value}:x)})}
  if(t.dataset.risk){return put('clients',c.id,{...c,risks:(c.risks||[]).map(x=>x.t===t.dataset.risk?{...x,[t.dataset.k]:+t.value}:x)})}
  if(t.dataset.ch==='addRisk'&&t.value)return put('clients',c.id,{...c,risks:[...(c.risks||[]),{t:t.value,i:3,c:3}]});
  if(t.dataset.filter){ui.f[t.dataset.filter]=t.value;return render()}
  if(t.dataset.file){handleFiles(t.dataset.file,t.files,t.dataset.i);t.value=''}
});
async function handleFiles(kind,files,i){
  const a=A(),c=C();if(!files||!files.length)return;
  if(kind==='audit')return uploadFiles(files,{clientId:a.clientId,auditId:a.id,purpose:'Audit file'});
  if(kind==='item')return uploadFiles(files,{clientId:a.clientId,auditId:a.id,item:+i,purpose:'Check '+(+i+1)});
  if(['books','brsbank','brsbook','pstmt','pbook','stock','far'].includes(kind))return procFiles(c,kind,files,i);
  if(kind==='vouch')return importVouchers(c,files[0]);
  if(kind==='rcbooks')return rcBooks(c,files[0]);
  if(kind==='rcportal')return rcPortalFiles(c,[...files]);
  if(kind==='rctds')return rcTdsFile(c,files[0]);
  if(kind==='vev'){const {d,type,t:T}=curV(),ix=+i,x=T.sample[ix];const ids=await uploadFiles(files,{clientId:c.id,purpose:`Vouching: ${VSHORT[type]} ${x.vno||''}`});const cur=S.vouching.find(v=>v.id===d.id)||d,ct=cur.types[type];return saveT(cur,type,{...ct,sample:ct.sample.map((y,k)=>k===ix?{...y,ev:[...(y.ev||[]),...ids]}:y)})}
  if(kind==='roadmap'){const f=files[0];try{const rows=await readSheet(f);if(rows.length<2)throw new Error('The file has no rows under the header.');const items=parseRoadmap(rows),R=c.roadmap||{fy:fyNow(),items:[]};await saveRoadmap(c,{...R,items:[...R.items,...items],uploadedAt:today(),uploadFile:f.name});toast(items.length+' roadmap items added from '+f.name)}catch(er){toast(er.message)}return}
  if(kind==='ledger'){const f=files[0];try{const rows=await readSheet(f);if(rows.length<2)throw new Error('The file has no data rows.');const T=runTests(rows,f.name);let evId='';try{evId=(await uploadFiles([f],{clientId:a.clientId,auditId:a.id,purpose:'Ledger used for data tests'}))[0]||''}catch(er){}const cur=S.audits.find(x=>x.id===a.id)||a;await put('audits',a.id,{...cur,tests:{...T,evidenceId:evId},stage:cur.stage==='Planned'?'Fieldwork':cur.stage});toast(T.rows+' rows tested')}catch(er){toast(er.message)}}
}
document.addEventListener('input',e=>{if(e.target.closest('#clientForm'))livePreview();if(e.target.id==='q')search(e.target.value)});
document.addEventListener('dragover',e=>{const d=e.target.closest('.drop');if(d){e.preventDefault();d.classList.add('over')}});
document.addEventListener('dragleave',e=>{const d=e.target.closest('.drop');if(d)d.classList.remove('over')});
document.addEventListener('drop',e=>{const d=e.target.closest('.drop');if(!d)return;e.preventDefault();d.classList.remove('over');handleFiles(d.dataset.drop,e.dataTransfer.files)});
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#searchRes').hidden=true;if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();$('#q').focus()}});
document.addEventListener('submit',e=>{
  e.preventDefault();const id=e.target.id;
  if(id==='loginForm'){sb.auth.signInWithPassword({email:val('lg-email'),password:$('#lg-pass').value}).then(({error})=>{if(error)toast(error.message==='Email not confirmed'?'Confirm your email first (check your inbox).':error.message)});return}
  if(id==='wsCreate'){sb.rpc('create_workspace',{ws_name:val('ws-name')}).then(async({error})=>{if(error)return toast(error.message);await afterLogin();go('home')});return}
  if(id==='wsJoin'){sb.rpc('join_workspace',{code:val('ws-code')}).then(async({data,error})=>{if(error)return toast(error.message.includes('join code')?'No workspace has that join code':error.message);store.set('sa-ws',data);await afterLogin();go('home')});return}
  if(id==='clientForm'){const ex=ui.view==='edit'?C():null,cid=ex?ex.id:nid(),m=formClient();if(!m.name)return toast('Enter the client name');
    put('clients',cid,{...(ex||{createdAt:new Date().toISOString(),risks:suggestedRisks(m)}),...m});
    if(!ex){ui.lastId=cid;ui.ctab='overview';toast('Client saved; plan set from what applies. Next: generate the roadmap.')}else toast('Client master updated');
    return go('client-'+cid)}
  if(id==='auditForm')return newAudit(val('af-client'),val('af-t'),val('af-period'),val('af-due'));
  if(id==='addItemForm'){const a=A(),q=val('newItem');if(q)put('audits',a.id,{...a,items:[...a.items,{q,ref:'Added by auditor',r:'',n:''}]});return}
  if(id==='rmAdd'){const c=C(),R=c.roadmap||{fy:fyNow(),items:[]},area=val('rm-area');saveRoadmap(c,{...R,items:[...R.items,{id:nid(),source:'manual',done:false,auditId:'',area,custom:area==='custom'?val('rm-title'):'',title:val('rm-title'),q:+val('rm-q'),why:'Added manually'}]});return}
  if(id==='obsForm'){const isNew=ui.id==='new',base=isNew?{...ui.draft,createdAt:new Date().toISOString()}:S.observations.find(x=>x.id===ui.id),oid=isNew?nid():base.id,auditId=val('of-audit');
    put('observations',oid,{...base,title:val('of-title'),clientId:val('of-client'),auditId,rating:val('of-rating'),status:val('of-status'),condition:val('of-cond'),criteria:val('of-crit'),cause:val('of-cause'),effect:val('of-effect'),rec:val('of-rec'),response:val('of-resp'),owner:val('of-owner'),due:val('of-due'),evidence:[...document.querySelectorAll('.of-ev:checked')].map(x=>x.value),closedAt:val('of-status')==='Closed'?(base.closedAt||today()):''});
    toast('Finding saved');if(auditId){ui.atab='observations';ui.lastId=auditId;return go('audit-'+auditId)}return go('observations')}
});

/* ---------- boot (after every script has loaded) ---------- */
document.addEventListener('DOMContentLoaded',()=>{route();
(async()=>{
  if(window.claude?.use){
    try{db=await window.claude.use('db')}catch(e){db=null}
    try{users=await window.claude.use('user');me=users?await users.id():null}catch(e){users=null}
    try{dl=await window.claude.use('downloads')}catch(e){dl=null}
    if(db){mode='claude';railStatus();subscribe()}else{mode='preview';dl=dl||null;render()}
    return;
  }
  dl=browserDl;
  if(window.supabase&&SB.url){
    mode='supa';sb=window.supabase.createClient(SB.url,SB.key);
    sb.auth.onAuthStateChange((ev,s)=>{session=s;
      if(s&&!ws)setTimeout(afterLogin,0);
      if(!s){ws=null;wsList=[];me=null;for(const k of Object.keys(S))S[k]=[];if(channel){sb.removeChannel(channel);channel=null}}
      render();
    });
    return;
  }
  render();
})();
});
