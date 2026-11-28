/* Smart Auditing — Ledger scrutiny: an audit type of its own, and a procedure that can be added to any audit.
   Owner, 28 Nov 2026: "add a new process that is ledger scrutiny ... a audit type".
   Every ledger of the Tally Day Book is put in its group and every entry is tested (ledger-engine.js): cash limits, TDS, blocked
   GST credit and reverse charge, balances on the wrong side, cash below nil, suspense, journals, duplicates, capital, personal
   and earlier-year items, and month-wise gaps and jumps. Each finding opens to its entries, exports to Excel and becomes an
   observation in one click. The group of any ledger can be corrected; the tests run again. */
TEMPLATES.ls={name:'Ledger scrutiny',items:[
  ['Opening balances of every ledger agree with last year\'s audited closing balances','SIA 320'],
  ['Every ledger sits in the right group (no expense in assets, no party in expenses); groups corrected where wrong','SIA 320'],
  ['Expense ledgers: TDS deducted and deposited where the limits are crossed (contractors, professional fees, rent, commission, interest)','Income-tax Act 2025 s.393 (old ss.194C, 194J, 194-I, 194H, 194A)'],
  ['Expense ledgers: input GST taken only where allowed; blocked credits reversed; reverse-charge GST paid on legal, GTA, security and rent','CGST Act s.17(5), s.9(3)'],
  ['No cash payment for an expense over ₹10,000 to a person in a day (₹35,000 for goods carriage)','Income-tax Act 2025 s.36 (old s.40A(3))'],
  ['No loan or deposit of ₹20,000 or more taken or repaid in cash; no cash receipt of ₹2 lakh or more from a person','old ss.269SS, 269T, 269ST'],
  ['Recurring expenses (rent, salary, electricity, telephone) booked every month, with provisions for months not billed','Accrual · SIA 6'],
  ['Capital items not charged to expenses; personal and earlier-year items identified and corrected','AS 10 / Ind AS 16 · AS 5'],
  ['Suspense, sundry and clearing ledgers nil at the end of the period','SIA 320'],
  ['Journal entries narrated, supported and approved; round-sum, holiday and period-end journals reviewed','SIA 11 · SA 240'],
  ['Debtors with credit balances and creditors with debit balances reviewed and reclassified','SIA 320'],
  ['Loans: interest booked, repayments as per schedule, limits of ss.185 / 186 of the Companies Act observed','Companies Act ss.185, 186'],
  ['Month-wise income and expenses compared; big changes explained','SIA 6']]};
UNI.ls={cat:'fin',covers:['Ledger groups','TDS on expenses','GST credit and reverse charge','Cash limits','Journals','Suspense','Capital, personal and earlier-year items','Month-wise gaps and jumps'],procs:['ls']};
PR.ls={n:'Ledger scrutiny',ref:'SIA 320 · SIA 6 · Income-tax · CGST',why:'Every ledger grouped and every entry tested: cash limits, TDS, GST credit and reverse charge, wrong-side balances, suspense, journals, duplicates, capital, personal and earlier-year items, month-wise gaps.'};
if(UNI.fin&&!UNI.fin.procs.includes('ls'))UNI.fin.procs.push('ls');
PK.splice(PK.indexOf('tests'),0,'ls');

/* ---------- import: the same Day Book as everything else ----------
   The vouchers are kept in a record of their own (lsdata), so saving a tick or a conclusion does not send them again */
const LS_MAX=40000;S.lsdata=S.lsdata||[];
const lsData=d=>S.lsdata.find(x=>x.id===d.id)||null;
async function lsImport(c,file,text){
  const D=LEDGER.parse(text,{max:LS_MAX}),d=pOpen(c),old=d.ls||{};
  /* a file of ledger masters only (Tally: List of Accounts › Export): the groups are added to the Day Book already read */
  if(!D.V.length&&Object.keys(D.groups).length){const X=lsData(d);if(!X||!old.at)throw new Error('Import the Day Book first, then the ledger masters.');
    const groups={...(X.groups||{}),...D.groups};await put('lsdata',d.id,{...X,groups});await savep({...d,ls:{...old,groups:Object.keys(groups).length,mastersFile:file.name}});_lsMemo={};D.mastersOnly=Object.keys(D.groups).length;return D}
  if(!D.V.length)throw new Error('No accounting vouchers or ledger masters were found in this Tally file.');
  await put('lsdata',d.id,{clientId:c.id,fy:d.fy,V:D.V,groups:D.groups});
  await savep({...d,ls:{file:file.name,at:new Date().toISOString(),n:D.V.length,groups:Object.keys(D.groups).length,from:D.from,to:D.to,skipped:D.skipped,cut:D.V.length>=LS_MAX,over:old.over||{},cashOpen:old.cashOpen||{},done:old.done||{}}});
  _lsMemo={};return D}
var _lsMemo={};
/* up to the same date as the rest of the audit: today, or the end of the month chosen (an entry dated later has not happened) */
const lsAsOf=d=>typeof stAsOf==='function'?stAsOf(d):new Date().toISOString().slice(0,10);
function lsRun(d){const L=d.ls,X=L&&lsData(d);if(!X?.V?.length)return null;const asOf=lsAsOf(d),key=asOf+L.at+JSON.stringify(L.groups||0)+JSON.stringify(L.over||{})+JSON.stringify(L.cashOpen||{});if(_lsMemo.k===key)return _lsMemo.v;
  const V=X.V.filter(v=>v[0]<=asOf),r=LEDGER.scrutinise({V,groups:X.groups||{},from:L.from,to:asOf<L.to?asOf:L.to},{over:L.over||{},cashOpen:L.cashOpen||{}});r.asOf=asOf;r.later=X.V.length-V.length;_lsMemo={k:key,v:r};return r}
const LS_R={H:['H','High'],M:['y','Medium'],L:['n','Low']};

/* ---------- screen ---------- */
function lsTab(c,d,a){
  const L=d.ls,gN=L?(typeof L.groups==='number'?L.groups:Object.keys(L.groups||{}).length):0,drop=`<label class="drop" data-drop="lsbooks" style="margin-bottom:12px">${ic('up')}<b>Tally Day Book XML</b><span class="small">${L?esc(L.file)+' · '+(L.n||0).toLocaleString('en-IN')+' vouchers · '+fmtD(L.from)+' to '+fmtD(L.to)+(L.cut?' · the first '+LS_MAX.toLocaleString('en-IN')+' vouchers':'')+(gN?' · groups from '+gN+' ledger masters':' · add the ledger masters (Tally: Display › List of Accounts › Export XML) to check each ledger\'s group')+' · drop a new Day Book to replace':'Gateway of Tally › Day Book › period › Export › XML. The Day Book imported once on the Programme tab or in Sales vs receipts is used here too.'}</span><input type="file" data-file="lsbooks" accept=".xml" multiple hidden></label>`;
  if(L&&!lsData(d))return drop+`<div class="empty">The vouchers of ${esc(L.file)} are still loading, or were not saved. Drop the Day Book again if this stays.</div>${concBox(d,'ls')}`;
  if(!L)return drop+`<div class="empty">No Day Book yet. Each ledger is put in its group and every entry is tested for cash limits, TDS, GST credit, reverse charge, wrong-side balances, suspense, journals, duplicates, capital, personal and earlier-year items.</div>${concBox(d,'ls')}`;
  const r=lsRun(d),F=r.F,cnt=k=>F.filter(f=>f.r===k).length,open=ui.lsF||'',fl=F.find(f=>f.k===open);
  const C=r.CLASSES,cf=ui.lsC||'',q=(ui.lsQ||'').toLowerCase(),LL=r.ledgers.filter(x=>(!cf||x.c===cf)&&(!q||x.l.toLowerCase().includes(q)));
  const card=f=>`<div class="row" style="gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid var(--line)"><span class="tag ${LS_R[f.r][0]}">${LS_R[f.r][1]}</span>
    <div class="sp"><b>${esc(f.t)}</b>${f.amt?` <span class="muted">· ${inr(Math.round(f.amt))}</span>`:''}<div class="small muted" style="margin-top:3px">${esc(f.crit)}</div>
    <div class="small" style="margin-top:3px"><b>Effect:</b> ${esc(f.eff)} <b>What to do:</b> ${esc(f.rec)}</div></div>
    <div class="row" style="gap:6px"><button class="btn ghost sm" data-act="lsF" data-v="${f.k}">${open===f.k?'Hide':'Show'} ${f.items.length}</button><button class="btn ghost sm" data-act="lsObs" data-v="${f.k}">${ic('flag')}Observation</button></div></div>
    ${open===f.k?lsItems(f,d):''}`;
  return drop+`<div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))"><div class="kpi"><b>${r.vouchers.toLocaleString('en-IN')}</b><span>Vouchers tested, up to ${fmtD(r.asOf)}${r.later?` (${r.later.toLocaleString('en-IN')} dated later left out)`:''}</span></div><div class="kpi"><b>${r.ledgers.length}</b><span>Ledgers</span></div><div class="kpi ${cnt('H')?'':'good'}"><b>${cnt('H')}</b><span>High findings</span></div><div class="kpi"><b>${cnt('M')}</b><span>Medium</span></div><div class="kpi"><b>${cnt('L')}</b><span>Low</span></div></div>
   <div class="panel" style="margin-top:14px"><div class="row"><h3 class="sp" style="margin:0">What the scrutiny found</h3><button class="btn ghost sm" data-act="lsXlsx">${ic('down')}Excel (all findings and ledgers)</button></div>
    ${F.length?F.map(card).join(''):'<p class="small muted">Nothing found by the tests. Do the checklist steps the data cannot show (opening balances, loans, supporting documents).</p>'}
    <p class="small muted" style="margin:10px 0 0">The groups come from ${gN?'the ledger masters in Tally ('+gN+'), and the names where a ledger has no master':'the ledger names. Drop the ledger masters (Tally: Display › List of Accounts › Export, XML) above to use Tally\'s own groups and check that each ledger is in the right one'}. If a ledger is in the wrong group, change it in the list below: the tests run again.</p></div>
   <h2 class="section">Ledgers</h2><div class="row" style="gap:10px;margin-bottom:8px"><select data-lsc="1" style="width:auto"><option value="">Every group (${r.ledgers.length})</option>${Object.entries(C).map(([k,l])=>{const n=r.ledgers.filter(x=>x.c===k).length;return n?`<option value="${k}" ${cf===k?'selected':''}>${esc(l)} (${n})</option>`:''}).join('')}</select><input data-lsq="1" placeholder="Find a ledger" value="${esc(ui.lsQ||'')}" style="max-width:260px"></div>
   <div class="scroll" style="max-height:560px"><table><thead><tr><th>Ledger</th><th>Group</th><th class="num">Entries</th><th class="num">Debit</th><th class="num">Credit</th><th class="num">Net (Dr + / Cr −)</th><th class="num">Findings</th></tr></thead><tbody>
    ${LL.slice(0,ui.lsAll?9999:200).map(x=>`<tr><td><a href="#" data-act="lsL" data-v="${esc(x.l)}">${esc(x.l)}</a>${x.g?`<div class="small muted">${esc(x.g)}</div>`:''}</td><td><select data-lscls="${esc(x.l)}" style="width:auto;min-height:30px;font-size:13px">${Object.entries(C).map(([k,l])=>`<option value="${k}" ${x.c===k?'selected':''}>${esc(l)}</option>`).join('')}</select>${L.over?.[x.l]?' <span class="tag n">set by you</span>':''}</td><td class="num">${x.n}</td><td class="num">${inr(Math.round(x.dr))}</td><td class="num">${inr(Math.round(x.cr))}</td><td class="num"><b>${inr(Math.round(x.net))}</b></td><td class="num">${x.flags?`<span class="tag y">${x.flags}</span>`:''}</td></tr>
    ${ui.lsL===x.l?`<tr><td colspan="7">${lsLedger(lsData(d),x.l)}</td></tr>`:''}`).join('')}</tbody></table></div>${LL.length>200&&!ui.lsAll?`<button class="btn ghost sm" style="margin-top:8px" data-act="lsAll">Show all ${LL.length}</button>`:''}
   ${concBox(d,'ls')}`}
function lsItems(f,d){
  const opening=f.k==='cashneg'?`<div class="row small" style="gap:8px;margin:6px 0">${f.items.map(x=>`<label class="f" style="flex:0 1 15em">Opening cash: ${esc(x.ledger)}<input type="number" step="0.01" data-lsopen="${esc(x.ledger)}" value="${d.ls.cashOpen?.[x.ledger]??''}" placeholder="₹ as on ${fmtD(d.ls.from)}"></label>`).join('')}</div>`:'';
  return `<div style="margin:0 0 10px">${opening}<div class="scroll" style="max-height:420px"><table><thead><tr><th>Date</th><th>Ledger</th><th class="num">Amount</th><th>Voucher</th><th>Why</th><th>Checked</th></tr></thead><tbody>
   ${f.items.map((x,i)=>{const k=f.k+'|'+i+'|'+x.ledger+'|'+x.amt;return `<tr><td>${x.d?fmtD(x.d):''}</td><td>${esc(x.ledger)}</td><td class="num">${x.amt?inr(x.amt):''}</td><td class="small">${esc(x.vch)}</td><td class="small">${esc(x.note)}</td><td><input type="checkbox" data-lsdone="${esc(k)}" ${d.ls.done?.[k]?'checked':''} style="width:16px;min-height:16px" title="Seen and explained"></td></tr>`}).join('')}</tbody></table></div>
   <button class="btn ghost sm" style="margin-top:6px" data-act="lsFX" data-v="${f.k}">${ic('down')}Excel of these</button></div>`}
function lsLedger(L,l){const R=LEDGER.entriesOf(L,l);let bal=0;
  return `<div class="scroll" style="max-height:380px"><table><thead><tr><th>Date</th><th>Voucher</th><th>Against</th><th>Narration</th><th class="num">Debit</th><th class="num">Credit</th><th class="num">Running (from nil)</th></tr></thead><tbody>${R.slice(0,1500).map(x=>{bal=R2(bal+x.dr-x.cr);return `<tr><td>${fmtD(x.d)}</td><td>${esc(x.vt)} ${esc(x.vno||'')}</td><td class="small">${esc(x.other)}</td><td class="small">${esc(x.nar)}</td><td class="num">${x.dr?inr(x.dr):''}</td><td class="num">${x.cr?inr(x.cr):''}</td><td class="num">${inr(bal)}</td></tr>`}).join('')}</tbody></table></div>
   <button class="btn ghost sm" style="margin-top:6px" data-act="lsLX" data-v="${esc(l)}">${ic('down')}Excel of this ledger</button>`}

/* ---------- Excel ---------- */
const LS_HEAD=['Date','Ledger','Amount (₹)','Voucher','Why'];
function lsSheets(d){const r=lsRun(d);if(!r)return[];
  const G=r.CLASSES,sum=[['Ledger','Group','Entries','Debit','Credit','Net (Dr + / Cr −)','Findings'],...r.ledgers.map(x=>[x.l,G[x.c],x.n,x.dr,x.cr,x.net,x.flags||''])];
  const F=[['Severity','Finding','Amount (₹)','Items','Criteria','Effect','What to do'],...r.F.map(f=>[{H:'High',M:'Medium',L:'Low'}[f.r],f.t,f.amt,f.items.length,f.crit,f.eff,f.rec])];
  const SN={cash40a:'Cash over 10000 a day',cash269st:'Cash receipts 2 lakh',cashloan:'Cash loans 20000',tds:'TDS not deducted',blocked:'Blocked GST credit',rcm:'Reverse charge GST',side:'Wrong-side balances',cashneg:'Cash below nil',susp:'Suspense ledgers',jv:'Journals to review',dup:'Possible duplicates',capital:'Capital in expenses',personal:'Personal expenses',prior:'Earlier-year items',trend:'Unusual months'};
  const per=r.F.map(f=>['LS '+(SN[f.k]||f.k),[LS_HEAD,...f.items.map(x=>[x.d,x.ledger,x.amt,x.vch,x.note])]]);
  return[['Ledger scrutiny findings',F],['Ledger scrutiny ledgers',sum],...per]}
const LS_SN=k=>k;

/* ---------- actions ---------- */
Object.assign(ACT,{
  lsF:t=>{ui.lsF=ui.lsF===t.dataset.v?'':t.dataset.v;render()},
  lsL:t=>{ui.lsL=ui.lsL===t.dataset.v?'':t.dataset.v;render()},
  lsAll:()=>{ui.lsAll=true;render()},
  lsXlsx:async()=>{const c=C(),d=pOpen(c);toast('Preparing Excel…');await xlsxSave(lsSheets(d),'Ledger scrutiny - '+c.name+' - FY '+fyNow())},
  lsFX:async t=>{const c=C(),d=pOpen(c),f=lsRun(d)?.F.find(x=>x.k===t.dataset.v);if(!f)return;await xlsxSave([[f.t.slice(0,28),[LS_HEAD,...f.items.map(x=>[x.d,x.ledger,x.amt,x.vch,x.note])]]],'Ledger scrutiny - '+f.t.slice(0,60)+' - '+c.name)},
  lsLX:async t=>{const c=C(),d=pOpen(c),l=t.dataset.v,R=LEDGER.entriesOf(lsData(d),l);let b=0;await xlsxSave([[l.slice(0,28),[['Date','Voucher type','Voucher no.','Against','Narration','Debit','Credit','Running balance (from nil)'],...R.map(x=>{b=R2(b+x.dr-x.cr);return[x.d,x.vt,x.vno,x.other,x.nar,x.dr||'',x.cr||'',b]})]]],'Ledger - '+l+' - '+c.name)},
  lsObs:t=>{const c=C(),d=pOpen(c),f=lsRun(d)?.F.find(x=>x.k===t.dataset.v);if(!f)return;
    newObs({clientId:c.id,auditId:A()?.id||'',title:'Ledger scrutiny: '+f.t,rating:f.r,condition:f.items.slice(0,12).map(x=>`${x.d?fmtD(x.d)+': ':''}${x.ledger}${x.amt?' '+inr(x.amt):''} (${x.note})`).join('; ')+(f.items.length>12?`; and ${f.items.length-12} more`:''),criteria:f.crit,effect:f.eff,rec:f.rec})}});
document.addEventListener('change',e=>{const t=e.target,ds=t.dataset;if(!(ds.lsc!=null||ds.lscls!=null||ds.lsopen!=null||ds.lsdone!=null))return;
  if(ds.lsc!=null){ui.lsC=t.value;ui.lsAll=false;return render()}
  const c=C(),d=pOpen(c);if(!d.ls)return;
  if(ds.lscls!=null){d.ls.over={...(d.ls.over||{}),[ds.lscls]:t.value};_lsMemo={};savep(d);return render()}
  if(ds.lsopen!=null){const v=t.value.trim(),o={...(d.ls.cashOpen||{})};if(v==='')delete o[ds.lsopen];else o[ds.lsopen]=+v||0;d.ls.cashOpen=o;_lsMemo={};savep(d);return render()}
  if(ds.lsdone!=null){d.ls.done={...(d.ls.done||{}),[ds.lsdone]:t.checked};savep(d)}});
document.addEventListener('input',e=>{const t=e.target;if(t.dataset?.lsq==null)return;ui.lsQ=t.value;clearTimeout(lsTab.t);lsTab.t=setTimeout(()=>{render();const x=document.querySelector('[data-lsq]');if(x){x.focus();x.setSelectionRange(x.value.length,x.value.length)}},350)});

/* ---------- hooks ---------- */
const _pStatusL=pStatus;pStatus=function(k,c,a){if(k!=='ls')return _pStatusL(k,c,a);if(a&&a.na?.ls)return{st:'na',text:'Not applicable: '+a.na.ls};
  const d=pOpen(c);if(!d.ls)return{st:'todo',text:'Tally Day Book XML not imported yet'};const r=lsRun(d);if(!r)return{st:'doing',text:'Loading the vouchers…'};
  return{st:d.conc?.ls?.st?'done':'doing',text:r.F.length?`${r.F.length} finding${r.F.length===1?'':'s'} (${r.F.filter(f=>f.r==='H').length} high) in ${r.ledgers.length} ledgers`:`${r.ledgers.length} ledgers tested, nothing found`}};
const _procTabL=procTab;procTab=function(a,c){if(ui.ptab!=='ls')return _procTabL(a,c);
  const k='ls',d=pOpen(c),prog=programmeOf(a),more=PK.filter(x=>!prog.includes(x)),pill=(x,dim)=>{const s=pStatus(x,c,a);return `<button class="chip" data-act="ptab" data-v="${x}" style="${k===x?'border-color:var(--acc);color:var(--acc-ink);font-weight:700;':''}${dim?'opacity:.75':''}"><span style="color:var(--${s.st==='done'?'ok':s.st==='todo'?'hi':'muted'})">●</span> ${esc(PR[x].n)}</button>`};
  return `<div class="row" style="gap:6px;margin-bottom:6px">${prog.map(x=>pill(x)).join('')}</div>${more.length?`<details ${more.includes(k)?'open':''} style="margin-bottom:12px"><summary class="small muted" style="cursor:pointer">More procedures</summary><div class="row" style="gap:6px;margin-top:6px">${more.map(x=>pill(x,1)).join('')}</div></details>`:''}
   <div class="row" style="margin:4px 0 12px"><h2 class="sp" style="margin:0;font-size:18px">${esc(PR[k].n)}</h2><span class="tag n">${esc(PR[k].ref)}</span></div><p class="small muted" style="margin:-6px 0 12px">${esc(PR[k].why)} Kept for ${esc(c.name)}, FY ${esc(fyNow())}.</p><div style="margin:-6px 0 10px">${reviewBox(a,'proc:'+k,PR[k].n)}</div>${lsTab(c,d,a)}`};
const _procFilesL=procFiles;procFiles=async function(c,kind,files,i){
  if(kind==='lsbooks'){const FS=[...files].sort((a,b)=>b.size-a.size);for(const f of FS){try{toast('Reading '+f.name+'…');const D=await lsImport(c,f,decodeBuf(await f.arrayBuffer()));await pEv(c,f,D.mastersOnly?'Tally ledger masters':'Tally Day Book (ledger scrutiny)');toast(D.mastersOnly?D.mastersOnly+' ledger groups read from '+f.name:D.V.length.toLocaleString('en-IN')+' vouchers read; every ledger tested')}catch(e){toast(e.message||String(e))}}render();return}
  if(kind==='settle'||kind==='books'){const r=await _procFilesL(c,kind,files,i);const f=files[0];if(extOf(f.name)==='xml'&&!pOpen(c).ls){try{await lsImport(c,f,decodeBuf(await f.arrayBuffer()))}catch(e){}render()}return r}
  return _procFilesL(c,kind,files,i)};
const _procSheetsL=procSheets;procSheets=function(a,c,k){if(k==='ls'){const d=pOpen(c);return d.ls?lsSheets(d):[]}return _procSheetsL(a,c,k)};
const _procFactsL=procFacts;procFacts=function(a,c,k){const facts=_procFactsL(a,c,k);if(k!=='ls')return facts;const d=pOpen(c),r=lsRun(d);if(!r)return facts;
  for(const f of r.F)facts.problems.push({r:f.r,t:f.t,d:f.items.slice(0,6).map(x=>`${x.ledger}${x.amt?' '+inr(x.amt):''}${x.d?' ('+fmtD(x.d)+')':''}`).join('; ')+(f.items.length>6?'; …':''),why:f.eff,todo:f.rec,amt:f.amt||null});
  facts.money=r.F.filter(f=>f.r!=='L').reduce((t,f)=>t+(f.amt||0),0);return facts};
PLAIN.ls='We went through every ledger in the books: which group it belongs to, and every entry in it, for cash payments over the limits, TDS not deducted, GST credit taken where it is not allowed, reverse-charge GST, balances on the wrong side, suspense, unusual journals, entries booked twice, capital, personal and earlier-year items, and months missing or far above the usual.';
EVK.ls=/ledger|day ?book|tally|scrutiny/i;
const _progRepL=programmeReport;programmeReport=function(a){let h=_progRepL(a);const c=S.clients.find(x=>x.id===a.clientId);if(!c||!programmeOf(a).includes('ls'))return h;const d=pOpen(c),r=lsRun(d);if(!r)return h;
  h+=`<h3>Ledger scrutiny: ${fmtD(r.from)} to ${fmtD(r.to)}</h3><p>${r.vouchers.toLocaleString('en-IN')} vouchers in ${r.ledgers.length} ledgers tested.</p>${r.F.length?`<ul>${r.F.map(f=>`<li><b>${esc(f.t)}</b>${f.amt?' ('+inr(Math.round(f.amt))+')':''}. ${esc(f.crit)}</li>`).join('')}</ul>`:'<p>Nothing found by the tests.</p>'}`;return h};
