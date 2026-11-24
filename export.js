/* Smart Auditing — Excel export of every procedure, and of the whole audit, for the auditor's own review.
   Owner, 24 Nov 2026: "for each audit process set excel export that I will take review myself".
   Each procedure's tables become sheets with amounts as numbers; the checklist, observations and the sales / purchase
   settlement have their own sheets. Uses SheetJS when it loads; otherwise writes an Excel 2003 XML workbook. */
const xNum=t=>{const s=String(t).trim(),m=s.match(/^(\()?(-)?₹?\s?(-)?([\d,]+(?:\.\d+)?)\)?$/);if(!m||!/\d/.test(m[4]))return s;const n=parseFloat(m[4].replace(/,/g,''));return m[1]||m[2]||m[3]?-n:n};
const cellText=el=>{const c=el.cloneNode(true);c.querySelectorAll('button,input[type=checkbox],select,svg').forEach(x=>{if(x.tagName==='SELECT'){x.replaceWith(x.selectedOptions?.[0]?.textContent||'')}else if(x.type==='checkbox'){x.replaceWith(x.checked?'Yes':'')}else x.remove()});
  c.querySelectorAll('br').forEach(b=>b.replaceWith('\n'));c.querySelectorAll('div,p').forEach(p=>p.prepend('\n'));return c.textContent.replace(/[ \t]+/g,' ').split('\n').map(x=>x.trim()).filter(Boolean).join('; ')};
function tablesToSheets(html,prefix){
  const box=new DOMParser().parseFromString('<div>'+html+'</div>','text/html').body,out=[];let head=prefix;
  const walk=n=>{for(const el of n.children){if(/^H[1-3]$/.test(el.tagName))head=el.textContent.trim();
    if(el.tagName==='TABLE'){const rows=[...el.querySelectorAll('tr')].map(tr=>[...tr.children].map(td=>{const t=cellText(td);return td.tagName==='TH'?t:xNum(t)})).filter(r=>r.some(v=>v!==''));if(rows.length>1)out.push([head===prefix?prefix:prefix+' – '+head,rows])}
    else walk(el)}};
  walk(box);return out}
function chkSheet(a){const ev=auditEvidence(a),obs=S.observations.filter(o=>o.auditId===a.id);
  return['Checklist',[['#','Audit step','Standard','Risk','Control type','Design','Result','Working note','Evidence files','Observation'],...a.items.map((it,i)=>[i+1,it.q,it.ref||'',rcmOf(a,i).risk,rcmOf(a,i).type,{eff:'Effective',weak:'Weak'}[it.d]||'',{ok:'Satisfactory',ex:'Exception',na:'N/A'}[it.r]||'Not tested',it.n||'',ev.filter(x=>x.item===i).map(x=>x.name).join('; '),obs.find(o=>o.item===i)?.title||''])]]}
function obsSheet(a){const L=S.observations.filter(o=>o.auditId===a.id);
  return['Observations',[['Title','Rating','Status','Condition','Criteria','Cause','Effect','Recommendation','Management response','Owner','Due date'],...L.map(o=>[o.title,{H:'High',M:'Medium',L:'Low'}[o.rating]||o.rating||'',o.status||'',o.condition||'',o.criteria||'',o.cause||'',o.effect||'',o.rec||'',o.mgmt||o.response||'',o.owner||'',o.due||''])]]}
const XSHORT={vouch:'Vouching',gst:'GST',tds:'TDS',brs:'BRS',cash:'Cash count',drs:'Debtors',crs:'Creditors',stock:'Stock',fav:'Fixed assets',comp:'Compliance',pay:'Payroll',as26:'26AS',ar:'Analytical review',tests:'Data tests'};
function procSheets(a,c,k){
  if(k==='chk')return[chkSheet(a)];
  if(k==='settle'){const d=pOpen(c);return d.settle?[...stSheets(d,'S'),...stSheets(d,'P')]:[]}
  const keep={ptab:ui.ptab,stAll:ui.stAll,stAllP:ui.stAllP,stAllA:ui.stAllA,party:ui.party};ui.ptab=k;ui.stAll=ui.stAllP=ui.stAllA=true;ui.party={};
  let html='';try{html=procTab(a,c)}finally{Object.assign(ui,keep)}
  return tablesToSheets(html,XSHORT[k]||PR[k]?.n||k).map(([n,r])=>[n.replace(/ – (Debtors|Creditors): balances, ageing and confirmations/,' – balances & ageing').replace(/, FY \d{4}-\d{2}/,''),r])}
/* write the workbook */
const sheetName=(n,used)=>{let b=String(n).replace(/[\\/?*[\]:]/g,' ').replace(/\s+/g,' ').trim().slice(0,31)||'Sheet',x=b,i=2;while(used.has(x.toLowerCase()))x=b.slice(0,28)+' '+i++;used.add(x.toLowerCase());return x};
async function xlsxSave(sheets,name){
  sheets=sheets.filter(s=>s&&s[1]&&s[1].length);if(!sheets.length)return toast('Nothing to export yet.');
  const file=fileSafe(name),used=new Set();
  try{await needLib('XLSX');if(!XLSX.utils.book_new||!XLSX.writeFile)throw 0;const wb=XLSX.utils.book_new();
    for(const [n,rows] of sheets){const ws=XLSX.utils.aoa_to_sheet(rows);ws['!cols']=rows[0].map((_,j)=>({wch:Math.min(60,Math.max(8,...rows.slice(0,400).map(r=>String(r[j]??'').length)))}));ws['!freeze']={xSplit:0,ySplit:1};XLSX.utils.book_append_sheet(wb,ws,sheetName(n,used))}
    XLSX.writeFile(wb,file+'.xlsx')}
  catch(e){/* offline: Excel 2003 XML, opens in Excel with every sheet */
    const x=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const xml='<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="h"><Font ss:Bold="1"/><Interior ss:Color="#EEF1FB" ss:Pattern="Solid"/></Style></Styles>'+
      sheets.map(([n,rows])=>`<Worksheet ss:Name="${x(sheetName(n,used))}"><Table>${rows.map((r,i)=>`<Row>${r.map(v=>`<Cell${i?'':' ss:StyleID="h"'}><Data ss:Type="${typeof v==='number'?'Number':'String'}">${x(v)}</Data></Cell>`).join('')}</Row>`).join('')}</Table></Worksheet>`).join('')+'</Workbook>';
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([xml],{type:'application/vnd.ms-excel'}));a.download=file+'.xls';document.body.appendChild(a);a.click();a.remove()}
  toast('Excel saved: '+file)}

/* buttons: on every procedure, and the whole audit on the Programme tab */
const curProc=a=>PK.includes(ui.ptab)?ui.ptab:programmeOf(a)[0];
const _procTabX=procTab;procTab=function(a,c){const h=_procTabX(a,c),k=curProc(a);
  return h.replace(/(<h2 class="sp" style="margin:0;font-size:18px">[\s\S]*?<span class="tag n">[\s\S]*?<\/span>)(<\/div>)/,`$1<button class="btn ghost sm" data-act="xProc" data-v="${k}" title="Every table of this procedure, amounts as numbers">${ic('down')}Excel</button>$2`)};
const _progTabX=programmeTab;programmeTab=function(a,c){return `<div class="row" style="margin-bottom:12px"><span class="small muted sp">Export the whole audit for your review: checklist, every procedure in the programme, the sales and purchase settlement, and the observations, one sheet each.</span><button class="btn sm" data-act="xAudit">${ic('down')}Export the audit to Excel</button></div>`+_progTabX(a,c)};
Object.assign(ACT,{
  xProc:async t=>{const a=A(),c=C(),k=t.dataset.v;toast('Preparing Excel…');await xlsxSave(procSheets(a,c,k),(PR[k]?.n||k)+' - '+c.name+' - '+(a.period||a.title))},
  xAudit:async()=>{const a=A(),c=C();toast('Preparing the audit workbook…');const P=progStatus(a,c);
    const sum=['Programme',[['Procedure','Standard / law','Status','Result','Conclusion'],...P.L.map(x=>[PR[x.k].n,PR[x.k].ref,PTAG[x.st][1],String(x.text||'').replace(/<[^>]+>/g,''),{ok:'Satisfactory',issue:'Needs action'}[pOpen(c).conc?.[x.k]?.st]||''])]];
    const L=[sum];for(const k of programmeOf(a))L.push(...procSheets(a,c,k));L.push(obsSheet(a));
    await xlsxSave(L,'Audit workbook - '+c.name+' - '+(a.period||a.title))}});

/* ---------- the audit report in Excel, over any set of audits (owner, 24 Nov 2026):
   the process and the result of each audit, in the audit report's order, with a sheet of points for discussion ---------- */
const RT={H:'High',M:'Medium',L:'Low'},opinionOf=O=>O.some(o=>o.rating==='H')?'Unsatisfactory':O.some(o=>o.rating==='M')?'Needs improvement':'Satisfactory';
const strip=t=>String(t||'').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').trim();
function auditReportSheets(audits,title){
  audits=audits.filter(Boolean);const cl=[...new Set(audits.map(a=>a.clientId))].map(id=>S.clients.find(c=>c.id===id)).filter(Boolean);
  const O=S.observations.filter(o=>audits.some(a=>a.id===o.auditId)).sort((x,y)=>'HML'.indexOf(x.rating)-'HML'.indexOf(y.rating)),n=k=>O.filter(o=>o.rating===k).length;
  const per=audits.map(a=>{const c=S.clients.find(x=>x.id===a.clientId),P=c?progStatus(a,c):{L:[],dn:[],need:[]},ob=O.filter(o=>o.auditId===a.id);return{a,c,P,ob}});
  /* 1 the report */
  const R=[['Internal audit report',''],['Client',cl.map(c=>c.name).join(', ')],['Audits covered',audits.length],['Period',[...new Set(audits.map(a=>a.period).filter(Boolean))].join(', ')||'—'],['Prepared on',fmtD(today())],['Prepared by',session?.user?.email||''],['Overall opinion',opinionOf(O)],
    ['Observations',`${O.length} in all: ${n('H')} high, ${n('M')} medium, ${n('L')} low; ${O.filter(o=>o.status!=='Closed').length} open`],[''],
    ['Audit','Client','Period','Stage','Procedures done','Checks tested','Exceptions','High','Medium','Low','Open review notes','Opinion'],
    ...per.map(({a,c,P,ob})=>[a.title,c?.name||'',a.period||'',a.stage,`${P.dn.length} of ${P.need.length}`,`${a.items.filter(i=>i.r).length} of ${a.items.length}`,a.items.filter(i=>i.r==='ex').length,ob.filter(o=>o.rating==='H').length,ob.filter(o=>o.rating==='M').length,ob.filter(o=>o.rating==='L').length,openNotes(a).length,opinionOf(ob)]),
    [''],['Key observations',''],['Rating','Observation','Audit','Status','Recommendation'],...O.filter(o=>o.rating!=='L').slice(0,25).map(o=>[RT[o.rating]||'',o.title,audits.find(a=>a.id===o.auditId)?.title||'',o.status||'',o.rec||''])];
  /* 2 process and results */
  const PRC=[['Audit','Client','Procedure','Standard / law','What the procedure does','Status','Result','Auditor\'s conclusion','Conclusion notes']];
  for(const {a,c,P} of per){const d=c?pOpen(c):{};for(const x of P.L)PRC.push([a.title,c?.name||'',PR[x.k].n,PR[x.k].ref,PR[x.k].why,PTAG[x.st][1],strip(x.text),{ok:'Satisfactory',issue:'Needs action'}[d.conc?.[x.k]?.st]||'Not concluded',d.conc?.[x.k]?.text||''])}
  /* 3 checklist */
  const CK=[['Audit','#','Audit step','Standard','Risk','Control type','Design','Result','Working note']];
  for(const {a} of per)a.items.forEach((it,i)=>CK.push([a.title,i+1,it.q,it.ref||'',rcmOf(a,i).risk,rcmOf(a,i).type,{eff:'Effective',weak:'Weak'}[it.d]||'',{ok:'Satisfactory',ex:'Exception',na:'N/A'}[it.r]||'Not tested',it.n||'']));
  /* 4 observations */
  const OB=[['#','Audit','Visit','Rating','Status','Observation','Condition','Criteria','Cause','Effect','Recommendation','Management response','Owner','Target date','Days open']];
  O.forEach((o,i)=>{const v=typeof visitOf==='function'?visitOf(o):null;OB.push([i+1,audits.find(a=>a.id===o.auditId)?.title||'',v?fmtD(v.date):'',RT[o.rating]||'',o.status||'',o.title,o.condition||'',o.criteria||'',o.cause||'',o.effect||'',o.rec||'',o.response||o.mgmt||'',o.owner||'',o.due||'',o.status==='Closed'?'':Math.max(0,dayDiff(today(),(o.createdAt||today()).slice(0,10)))])});
  /* 5 points for discussion: blank columns for management's view and the decision */
  const DS=[['#','Audit','Area','Point for discussion','Rating','Our recommendation','Management\'s view','Decision / action agreed','Owner','Target date']];let k=0;
  for(const o of O.filter(o=>o.status!=='Closed'&&o.rating!=='L'))DS.push([++k,audits.find(a=>a.id===o.auditId)?.title||'','Observation',o.title+(o.condition?': '+o.condition.slice(0,300):''),RT[o.rating],o.rec||'',o.response||'','',o.owner||'',o.due||'']);
  for(const {a,c,P} of per){const d=c?pOpen(c):{};
    for(const x of P.L){if(x.st==='todo'||x.st==='doing')DS.push([++k,a.title,'Procedure',`${PR[x.k].n}: ${x.st==='todo'?'not started':'in progress'}${x.text?' ('+strip(x.text)+')':''}`,'','Complete before the audit is reported','','','','']);
      if(d.conc?.[x.k]?.st==='issue')DS.push([++k,a.title,'Procedure',`${PR[x.k].n}: needs action${d.conc[x.k].text?' — '+d.conc[x.k].text:''}`,'','','','','',''])}
    for(const r of openNotes(a))DS.push([++k,a.title,'Review note',r.text||r.note||'','','Clear the note','','',r.by||'',''])}
  for(const c of cl){const d=pOpen(c);if(!d.settle)continue;for(const side of ['S','P']){const r=settleCalc(d,side);if(!r)continue;
    for(const f of stFlags(r))if(f.r!=='L'&&!O.some(o=>o.title===f.t))DS.push([++k,c.name,side==='S'?'Sales vs receipts':'Purchases vs payments',f.t+': '+f.c.slice(0,300),RT[f.r],f.rec,'','','',''])}}
  const L=[['Audit report',R],['Process and results',PRC],['Checklist',CK],['Observations',OB],['For discussion',DS]];
  for(const c of cl){const d=pOpen(c);if(d.settle&&per.some(x=>x.c===c&&programmeOf(x.a).includes('settle')))L.push(...stSheets(d,'S'),...stSheets(d,'P'))}
  return L}
async function auditReportXlsx(audits,title){toast('Preparing the audit report…');await xlsxSave(auditReportSheets(audits,title),title)}

/* where it is asked for: Reports (any set of audits) and the client's month (that month's audits) */
const _vReportsX=vReports;vReports=function(){const h=_vReportsX();if(!S.audits.length)return h;
  const cid=ui.xrC&&S.clients.some(c=>c.id===ui.xrC)?ui.xrC:'',L=S.audits.filter(a=>!cid||a.clientId===cid),sel=ui.xrSel||(ui.xrSel=new Set(L.map(a=>a.id)));
  const box=`<div class="panel" style="margin-bottom:16px"><div class="row" style="gap:10px;margin-bottom:8px"><h3 class="sp" style="margin:0">Audit report in Excel</h3>
    <select data-xrc="1" style="width:auto;max-width:260px"><option value="">Every client</option>${S.clients.map(c=>`<option value="${c.id}" ${c.id===cid?'selected':''}>${esc(c.name)}</option>`).join('')}</select>
    <button class="btn ghost sm" data-act="xrAll">Select all</button><button class="btn ghost sm" data-act="xrNone">Clear</button><button class="btn sm" data-act="xrGo">${ic('down')}Excel report of ${L.filter(a=>sel.has(a.id)).length} audit${L.filter(a=>sel.has(a.id)).length===1?'':'s'}</button></div>
    <p class="small muted" style="margin:0 0 8px">One workbook for the audits you tick: the report and opinion, the process and result of every procedure, the checklist, the observations with management's responses, and the points for discussion with columns for management's view and the decision.</p>
    <div class="row" style="gap:6px;flex-wrap:wrap">${L.map(a=>`<label class="chip" style="cursor:pointer"><input type="checkbox" data-xra="${a.id}" ${sel.has(a.id)?'checked':''} style="width:16px;min-height:16px"> ${esc(a.title)}${a.period?' · '+esc(a.period):''}${cid?'':' · <span class="muted">'+esc(cname(a.clientId))+'</span>'}</label>`).join('')}</div></div>`;
  return h.replace(/(<\/div><\/div>)/,'$1'+box)};
const _monthTabX=monthTab;monthTab=function(c){const h=_monthTabX(c);
  return h.replace(/(<button class="btn" data-act="visitNew"[^>]*>[\s\S]*?<\/button>)/,`$1<button class="btn ghost" data-act="xrMonth" style="align-self:end">${ic('down')}Month report in Excel</button>`)};
Object.assign(ACT,{
  xrAll:()=>{const cid=ui.xrC||'';ui.xrSel=new Set(S.audits.filter(a=>!cid||a.clientId===cid).map(a=>a.id));render()},
  xrNone:()=>{ui.xrSel=new Set();render()},
  xrGo:()=>{const cid=ui.xrC||'',L=S.audits.filter(a=>(!cid||a.clientId===cid)&&ui.xrSel?.has(a.id));if(!L.length)return toast('Tick at least one audit.');
    const cl=[...new Set(L.map(a=>cname(a.clientId)))];auditReportXlsx(L,'Internal audit report - '+(cl.length===1?cl[0]:cl.length+' clients')+' - '+fmtD(today()))},
  xrMonth:()=>{const c=C(),fm=fyMonths(fyNow()).filter(m=>m<=monKeyNow()),mk=ui.mrMonth&&fm.includes(ui.mrMonth)?ui.mrMonth:fm[fm.length-1];
    const ids=new Set([...visitsOfMonth(c,mk).flatMap(v=>v.audits||[]),...monthAudits(c,mk).map(a=>a.id)]),L=S.audits.filter(a=>ids.has(a.id));
    if(!L.length)return toast('No audits are linked to '+mkLabel(mk)+' yet: tick the areas covered on each visit.');auditReportXlsx(L,'Internal audit report - '+c.name+' - '+mkLabel(mk))}});
document.addEventListener('change',e=>{const t=e.target,ds=t.dataset;if(ds.xrc!==undefined){ui.xrC=t.value;ui.xrSel=null;return render()}
  if(ds.xra){ui.xrSel=ui.xrSel||new Set();t.checked?ui.xrSel.add(ds.xra):ui.xrSel.delete(ds.xra);render()}});
/* the audit's own Report tab: the same Excel of this audit, beside the automatic report (which is unchanged) */
const _reportTabX=reportTab;reportTab=function(a){return _reportTabX(a).replace('<button class="btn ghost" data-act="copyRep">',`<button class="btn ghost" data-act="xAudit">${ic('down')}Excel of this audit</button><button class="btn ghost" data-act="copyRep">`)};
