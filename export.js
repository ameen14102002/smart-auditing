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
  const L=tablesToSheets(html,XSHORT[k]||PR[k]?.n||k).map(([n,r])=>[n.replace(/ – (Debtors|Creditors): balances, ageing and confirmations/,' – balances & ageing').replace(/, FY \d{4}-\d{2}/,''),r]);
  /* debtors / creditors: the real ageing and the ageing as per Tally, actual and negative parties bill-wise, from the Day Book */
  if((k==='crs'||k==='drs')&&typeof stSheets==='function'){const d=pOpen(c);if(d.settle?.P?.length){const W=k==='crs'?'Creditors':'Debtors';
    for(const [n,r] of stSheets(d,k==='crs'?'P':'S'))if(/real ageing|as per tally|bill-wise/i.test(n))L.push([n.replace(/^(Sales|Purchases) real ageing/,W+' real ageing').replace(/^(Sales|Purchases) ageing as per Tally/,W+' ageing as per Tally'),r])}}
  return L}
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
const obsOfReport=audits=>{const cl=new Set(audits.map(a=>a.clientId)),many=audits.length>1;return S.observations.filter(o=>audits.some(a=>a.id===o.auditId)||(many&&!o.auditId&&cl.has(o.clientId))).sort((x,y)=>'HML'.indexOf(x.rating)-'HML'.indexOf(y.rating))};
const auTitle=(audits,o)=>audits.find(a=>a.id===o.auditId)?.title||'Client level (visit)';
const RT={H:'High',M:'Medium',L:'Low'},opinionOf=O=>O.some(o=>o.rating==='H')?'Unsatisfactory':O.some(o=>o.rating==='M')?'Needs improvement':'Satisfactory';
const strip=t=>String(t||'').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').trim();
function auditReportSheets(audits,title){
  audits=audits.filter(Boolean);const cl=[...new Set(audits.map(a=>a.clientId))].map(id=>S.clients.find(c=>c.id===id)).filter(Boolean);
  const O=obsOfReport(audits),n=k=>O.filter(o=>o.rating===k).length;
  const per=audits.map(a=>{const c=S.clients.find(x=>x.id===a.clientId),P=c?progStatus(a,c):{L:[],dn:[],need:[]},ob=O.filter(o=>o.auditId===a.id);return{a,c,P,ob}});
  /* 1 the report */
  const R=[['Internal audit report',''],['Client',cl.map(c=>c.name).join(', ')],['Audits covered',audits.length],['Period',[...new Set(audits.map(a=>a.period).filter(Boolean))].join(', ')||'—'],['Prepared on',fmtD(today())],['Prepared by',session?.user?.email||''],['Overall opinion',opinionOf(O)],
    ['Observations',`${O.length} in all: ${n('H')} high, ${n('M')} medium, ${n('L')} low; ${O.filter(o=>o.status!=='Closed').length} open`],[''],
    ['Audit','Client','Period','Stage','Procedures done','Checks tested','Exceptions','High','Medium','Low','Open review notes','Opinion'],
    ...per.map(({a,c,P,ob})=>[a.title,c?.name||'',a.period||'',a.stage,`${P.dn.length} of ${P.need.length}`,`${a.items.filter(i=>i.r).length} of ${a.items.length}`,a.items.filter(i=>i.r==='ex').length,ob.filter(o=>o.rating==='H').length,ob.filter(o=>o.rating==='M').length,ob.filter(o=>o.rating==='L').length,openNotes(a).length,opinionOf(ob)]),
    [''],['Key observations',''],['Rating','Observation','Audit','Status','Recommendation'],...O.filter(o=>o.rating!=='L').slice(0,25).map(o=>[RT[o.rating]||'',o.title,auTitle(audits,o),o.status||'',o.rec||''])];
  /* 2 process and results */
  const PRC=[['Audit','Client','Procedure','Standard / law','What the procedure does','Status','Result','Auditor\'s conclusion','Conclusion notes']];
  for(const {a,c,P} of per){const d=c?pOpen(c):{};for(const x of P.L)PRC.push([a.title,c?.name||'',PR[x.k].n,PR[x.k].ref,PR[x.k].why,PTAG[x.st][1],strip(x.text),{ok:'Satisfactory',issue:'Needs action'}[d.conc?.[x.k]?.st]||'Not concluded',d.conc?.[x.k]?.text||''])}
  /* 3 checklist */
  const CK=[['Audit','#','Audit step','Standard','Risk','Control type','Design','Result','Working note']];
  for(const {a} of per)a.items.forEach((it,i)=>CK.push([a.title,i+1,it.q,it.ref||'',rcmOf(a,i).risk,rcmOf(a,i).type,{eff:'Effective',weak:'Weak'}[it.d]||'',{ok:'Satisfactory',ex:'Exception',na:'N/A'}[it.r]||'Not tested',it.n||'']));
  /* 4 observations */
  const OB=[['#','Audit','Visit','Rating','Status','Observation','Condition','Criteria','Cause','Effect','Recommendation','Management response','Owner','Target date','Days open']];
  O.forEach((o,i)=>{const v=typeof visitOf==='function'?visitOf(o):null;OB.push([i+1,auTitle(audits,o),v?fmtD(v.date):'',RT[o.rating]||'',o.status||'',o.title,o.condition||'',o.criteria||'',o.cause||'',o.effect||'',o.rec||'',o.response||o.mgmt||'',o.owner||'',o.due||'',o.status==='Closed'?'':Math.max(0,dayDiff(today(),(o.createdAt||today()).slice(0,10)))])});
  /* 5 points for discussion: blank columns for management's view and the decision */
  const DS=[['#','Audit','Area','Point for discussion','Rating','Our recommendation','Management\'s view','Decision / action agreed','Owner','Target date']];let k=0;
  for(const o of O.filter(o=>o.status!=='Closed'&&o.rating!=='L'))DS.push([++k,auTitle(audits,o),'Observation',o.title+(o.condition?': '+o.condition.slice(0,300):''),RT[o.rating],o.rec||'',o.response||'','',o.owner||'',o.due||'']);
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

/* ---------- styled workbooks (1Go's writer, xlsxsa.js) and the audit report laid out as a report ---------- */
const colLetter=n=>{let s='';n++;while(n){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=Math.floor((n-1)/26)}return s};
function styleSheet(name,rows,sub){
  const n=Math.max(1,...rows.map(r=>r.length)),head=rows[0]||[],L=colLetter(n-1),inCol=head.map(h=>/management's view|decision|our comments|reviewer's comment/i.test(String(h)));
  const band=(v,s)=>[{v,s},...Array.from({length:n-1},()=>({v:'',s}))];
  const out=[band(name,'title'),band(sub||'','sub'),[],head.map(h=>({v:h,s:'head'}))];
  let zi=0;for(const r of rows.slice(1)){const z=(++zi)%2===0,row=[];for(let j=0;j<n;j++){const v=r[j]??'';row.push(inCol[j]?{v,s:'in'}:typeof v==='number'?{v,s:z?'numZ':'num'}:/^(High|Medium|Low|Act|Look)$/.test(v)?{v,s:{High:'hi',Act:'hi',Medium:'md',Look:'md',Low:'lo'}[v]}:{v,s:z?'cellZ':'cell'})}out.push(row)}
  const w=Array.from({length:n},(_,j)=>Math.min(60,Math.max(9,...rows.slice(0,300).map(r=>String(r[j]??'').length+2))));
  return{name,rows:out,w,freeze:{row:4},merges:['A1:'+L+'1','A2:'+L+'2'],heights:{1:28,2:30,4:32},tab:'FF1F2A5C',foot:(typeof XS!=='undefined'&&XS.foot)||''}}
function reportSheet(audits,per,O,title){
  const n=8,L=colLetter(n-1),rows=[],merges=[],heights={},band=(v,s)=>[{v,s},...Array.from({length:n-1},()=>({v:'',s}))];
  const add=(r,h)=>{rows.push(r);if(h)heights[rows.length]=h;return rows.length};
  const kv=(k,v,s)=>{const i=add([{v:k,s:'label'},{v,s:s||'cell'},...Array.from({length:n-2},()=>({v:'',s:s||'cell'}))]);merges.push('B'+i+':'+L+i)};
  const sect=t=>{add([]);const i=add(band(t,'sect'),22);merges.push('A'+i+':'+L+i)};
  const cl=[...new Set(audits.map(a=>cname(a.clientId)))],per0=[...new Set(audits.map(a=>a.period).filter(Boolean))],ev=audits.flatMap(a=>auditEvidence(a));
  let i=add(band('Internal audit report','title'),34);merges.push('A'+i+':'+L+i);
  i=add(band(cl.join(', ')+(per0.length?' · '+per0.join(', '):'')+' · prepared on '+fmtD(today()),'sub'),22);merges.push('A'+i+':'+L+i);
  sect('Engagement');kv('Client',cl.join(', '));kv('Audits covered',audits.map(a=>a.title+(a.period?' ('+a.period+')':'')).join('; '));kv('Standards','Standards on Internal Audit (SIA) issued by ICAI; report in the SIA 370 structure');kv('Evidence on file',ev.length+' file'+(ev.length===1?'':'s')+' (listed in the sheet "Evidence annex")');kv('Prepared by',session?.user?.email||'');
  sect('Overall opinion');const op=opinionOf(O);i=add([{v:'Opinion',s:'label'},{v:op,s:op==='Satisfactory'?'lo':op==='Needs improvement'?'md':'hi'},...Array.from({length:n-2},()=>({v:'',s:op==='Satisfactory'?'lo':op==='Needs improvement'?'md':'hi'}))],24);merges.push('B'+i+':'+L+i);
  kv('Basis',O.length?`${O.length} observation${O.length===1?'':'s'}: ${O.filter(o=>o.rating==='H').length} high, ${O.filter(o=>o.rating==='M').length} medium, ${O.filter(o=>o.rating==='L').length} low; ${O.filter(o=>o.status!=='Closed').length} still open.`:'No observations were raised in the audits covered.');
  sect('Summary by audit');add(['Audit','Period','Stage','Procedures done','Checks tested','Exceptions','Observations (H / M / L)','Opinion'].map(v=>({v,s:'head'})),30);
  for(const {a,P,ob} of per){const o=opinionOf(ob);add([{v:a.title,s:'cellB'},{v:a.period||'',s:'cell'},{v:a.stage,s:'cell'},{v:`${P.dn.length} of ${P.need.length}`,s:'cell'},{v:`${a.items.filter(x=>x.r).length} of ${a.items.length}`,s:'cell'},{v:String(a.items.filter(x=>x.r==='ex').length),s:'cell'},{v:`${ob.filter(x=>x.rating==='H').length} / ${ob.filter(x=>x.rating==='M').length} / ${ob.filter(x=>x.rating==='L').length}`,s:'cell'},{v:o,s:o==='Satisfactory'?'lo':o==='Needs improvement'?'md':'hi'}])}
  sect('Key observations');{const h=add(['Observation','Rating','Status','Owner','Target date','Recommendation','',''].map(v=>({v,s:'head'})),30);merges.push('F'+h+':H'+h)}
  O.filter(o=>o.rating!=='L').slice(0,30).forEach(o=>{const t=o.title+(o.auditId?'':' (client level, visit)'),i=add([{v:t,s:'cell'},{v:RT[o.rating]||'',s:{H:'hi',M:'md',L:'lo'}[o.rating]||'cell'},{v:o.status||'',s:'cell'},{v:o.owner||'',s:'cell'},{v:o.due||'',s:'cell'},{v:o.rec||'',s:'cell'},{v:'',s:'cell'},{v:'',s:'cell'}],Math.min(90,18+Math.ceil(Math.max(t.length/34,(o.rec||'').length/60))*14));merges.push('F'+i+':H'+i)});
  if(!O.some(o=>o.rating!=='L'))kv('','No high or medium observations.');
  sect('Sheets in this workbook');for(const [s,t] of [['Process and results','each procedure of the audit programme, its status, result and the auditor\'s conclusion'],['Checklist','every audit step with its design and operating result and the working note'],['Observations','condition, criteria, cause, effect, recommendation and management\'s response'],['For discussion','points to discuss with management: type their view and the decision in the yellow cells'],['Evidence annex','every file on record, with its integrity hash'],['Procedure sheets','the detailed working of each procedure (GST, settlement, debtors, creditors and others)']])kv(s,t);
  sect('Sign-off');for(const k of ['Prepared by','Reviewed by','Date'])kv(k,'','in');
  return{name:'Audit report',rows,w:[36,16,13,16,14,12,22,22],merges,heights,tab:'FF17875A'}}
const _auditReportSheetsX=auditReportSheets;auditReportSheets=function(audits,title){
  const L=_auditReportSheetsX(audits,title);audits=audits.filter(Boolean);
  const O=obsOfReport(audits);
  const per=audits.map(a=>{const c=S.clients.find(x=>x.id===a.clientId),P=c?progStatus(a,c):{L:[],dn:[],need:[]};return{a,c,P,ob:O.filter(o=>o.auditId===a.id)}});
  L[0]=['Audit report',null,{styled:reportSheet(audits,per,O,title)}];
  const EV=[['Audit','File','Purpose','Checklist step','Type','Size (KB)','Uploaded by','Uploaded on','SHA-256 (integrity)']];
  for(const a of audits)for(const e of auditEvidence(a))EV.push([a.title,e.name,e.purpose||'',e.item!=null?'Step '+(+e.item+1)+': '+(a.items[e.item]?.q||''):'',e.type||'',Math.round((e.size||0)/1024),e.uploadedBy||'',(e.uploadedAt||'').slice(0,10),e.sha256||'']);
  for(const c of [...new Set(audits.map(a=>a.clientId))].map(id=>S.clients.find(x=>x.id===id)).filter(Boolean))for(const e of S.evidence.filter(x=>x.clientId===c.id&&!x.auditId))EV.push(['(client file) '+c.name,e.name,e.purpose||'','',e.type||'',Math.round((e.size||0)/1024),e.uploadedBy||'',(e.uploadedAt||'').slice(0,10),e.sha256||'']);
  const at=L.findIndex(s=>s[0]==='For discussion');L.splice(at+1,0,['Evidence annex',EV]);
  /* the detailed working of each procedure, once per client (procedures are kept per client and year) */
  const seen=new Set();for(const {a,c} of per){if(!c)continue;for(const k of programmeOf(a)){if(k==='chk'||k==='settle'||seen.has(c.id+k))continue;seen.add(c.id+k);try{L.push(...procSheets(a,c,k).map(s=>[(audits.length>1&&seen.size>0&&[...new Set(audits.map(x=>x.clientId))].length>1?c.name.split(' ')[0]+' ':'')+s[0],s[1]]))}catch(e){}}}
  return L};
const _xlsxSaveX=xlsxSave;xlsxSave=async function(sheets,name){
  if(!window.SA_XLSX)return _xlsxSaveX(sheets.filter(s=>s[1]),name);
  sheets=sheets.filter(s=>s&&((s[1]&&s[1].length)||s[2]?.styled));if(!sheets.length)return toast('Nothing to export yet.');
  const used=new Set(),B=sheets.map(([n,rows,o])=>{const sh=o?.styled||styleSheet(n,rows,name);sh.name=sheetName(sh.name||n,used);return sh});
  const u=SA_XLSX.book(B),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([u],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));a.download=fileSafe(name)+'.xlsx';document.body.appendChild(a);a.click();a.remove();toast('Excel saved: '+fileSafe(name))};
/* the audit's own Excel is the audit report of that audit, with every procedure's working */
ACT.xAudit=async()=>{const a=A(),c=C();toast('Preparing the audit report in Excel…');await xlsxSave(auditReportSheets([a],a.title),'Smart Auditing - Internal audit report - '+c.name+' - '+a.title+(a.period?' - '+a.period:''))};
