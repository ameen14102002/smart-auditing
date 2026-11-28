/* Smart Auditing — vouching: import (Tally XML / CSV / Excel), analysis by voucher type, standard sampling method, worksheet. */
const VTYPES={purchase:'Purchases',sales:'Sales',purchaseReturn:'Purchase returns (debit notes)',salesReturn:'Sales returns (credit notes)',payment:'Payments',receipt:'Receipts',journal:'Journals'};
const VSHORT={purchase:'Purchases',sales:'Sales',purchaseReturn:'Purchase returns',salesReturn:'Sales returns',payment:'Payments',receipt:'Receipts',journal:'Journals'};
const VCHECKS={
  purchase:['Invoice in the company\'s name and GSTIN','Purchase order / approval as per authority matrix','Goods or service received (GRN / service note)','Rate and quantity agree with PO','GST charged correctly and ITC appears in GSTR-2B','Posted to the right ledger and period','TDS deducted where applicable'],
  sales:['Tax invoice issued (e-invoice / IRN where applicable)','Sales order / approved price list','Dispatch proof (delivery challan / e-way bill)','GST rate and place of supply correct','Reported in GSTR-1','Posted to the right ledger and period'],
  purchaseReturn:['Debit note supported by goods-out / return note','Approved by an authorised person','Linked to the original purchase invoice','GST reversed / supplier credit note received','Posted in the right period'],
  salesReturn:['Goods received back (inward / quality note)','Credit note approved by an authorised person','Linked to the original sales invoice','GST credit note reported in GSTR-1','Posted in the right period'],
  payment:['Payment approved and supported by invoice / bill','Paid to the right party and bank account','TDS deducted where applicable','Posted to the right ledger and period'],
  receipt:['Receipt matches bank credit','Adjusted against the right invoice / party','Posted to the right ledger and period'],
  journal:['Journal supported by working / document','Approved by an authorised person','Accounting treatment correct','Posted in the right period']
};
const CF={'80':1.61,'90':2.31,'95':3.0};
const VMETHOD={method:'standard',conf:'90',tolPct:5,riskPicks:2};
const METHODS={standard:'Standard: key items + value-weighted (MUS) + risk picks',mus:'Monetary unit sampling (MUS) + key items',stratified:'Stratified by value band (high / medium / low)',random:'Simple random',systematic:'Systematic (every nth voucher by date)'};
const VPOP={};
/* every voucher of the population is kept with the import (compact), so each line of the population analysis opens to its
   vouchers after a reload too, and can be exported or vouched */
const VROWMAX=60000,r2v=x=>Math.round((+x||0)*100)/100;
const VROW=r=>[r.date||'',r.vtype||'',r.vno||'',r.ref||'',r.party||'',r.gstin||'',r.pos||'',r2v(r.taxable),r2v(r.cgst),r2v(r.sgst),r2v(r.igst),r2v(r.amount),r.taxType||'nongst',r.reg?1:0,r.ledger||''];
const VUN=a=>({date:a[0],vtype:a[1],vno:a[2],ref:a[3],party:a[4],gstin:a[5],pos:a[6],taxable:a[7],cgst:a[8],sgst:a[9],igst:a[10],amount:a[11],taxType:a[12],reg:!!a[13],ledger:a[14]});
function popRows(d,type){const m=VPOP[d?.id]?.[type];if(m)return m;const L=d?.types?.[type]?.rows;if(!L?.length)return null;const r=L.map(VUN);VPOP[d.id]={...(VPOP[d.id]||{}),[type]:r};return r}
/* the groups of the population analysis: the same tests as the counts shown */
function vGroups(A){const sun=r=>{const d=new Date(r.date+'T00:00:00');return!isNaN(d)&&d.getDay()===0};return{
  high:[`High value (≥ ${inrc(A.keyAmt)})`,r=>r.amount>=A.keyAmt],medium:[`Medium value (≥ ${inrc(A.medianCut)})`,r=>r.amount>=A.medianCut&&r.amount<A.keyAmt],low:['Low value',r=>r.amount<A.medianCut&&r.amount<A.keyAmt],
  local:['Local (CGST + SGST)',r=>r.taxType==='local'],interstate:['Interstate (IGST)',r=>r.taxType==='interstate'],nongst:['Non-GST / exempt',r=>r.taxType==='nongst'],
  unreg:['Party without GSTIN',r=>!r.reg],round:['Round sums (₹10,000 or more, whole thousands)',r=>r.amount>=10000&&r.amount%1000===0],sunday:['Dated on a Sunday',sun],all:['Every voucher',()=>true]}}
function vFilter(A,key){if(!key)return null;if(key.startsWith('party:')){const n=key.slice(6);return['Party: '+n,r=>(r.party||'(no party)')===n]}if(key.startsWith('month:')){const m=key.slice(6);return['Month: '+m,r=>String(r.date).slice(0,7)===m]}return vGroups(A)[key]||null}
const VHEAD=['Date','Voucher type','Voucher no.','Supplier / customer invoice no.','Party','GSTIN','Place of supply','Taxable value','CGST','SGST','IGST','Total','Tax type','Registered','Ledger'];
const vLine=r=>[r.date,r.vtype,r.vno,r.ref,r.party,r.gstin,r.pos,r.taxable,r.cgst,r.sgst,r.igst,r.amount,TT[r.taxType]||r.taxType,r.reg?'Yes':'No',r.ledger];
function vDetail(c,d,type,A){const key=ui.vpop?.type===type?ui.vpop.k:'';const F=vFilter(A,key);if(!F)return'';const rows=popRows(d,type);
  if(!rows)return`<div class="panel" style="margin-top:14px"><b>${esc(F[0])}</b><p class="small muted">The vouchers of this import were not kept (imported before this was added). Import the file again to see and export them.</p></div>`;
  const L=rows.filter(F[1]).sort((a,b)=>String(a.date).localeCompare(String(b.date))||b.amount-a.amount),tot=k=>L.reduce((t,r)=>t+(+r[k]||0),0),shown=ui.vpopAll?L:L.slice(0,300);
  const inS=new Set((d.types[type].sample||[]).map(x=>x.vno+'|'+x.date+'|'+x.amount));
  return`<div class="panel" id="vpop-detail" style="margin-top:14px"><div class="row" style="gap:10px;align-items:center"><h2 class="sp" style="margin:0">${esc(VSHORT[type])}: ${esc(F[0])}</h2>
    <button class="btn ghost sm" data-act="vPopX">${ic('down')}Excel</button><button class="btn ghost sm" data-act="vPopVouch" title="Add these vouchers to the vouching sheet below">${ic('edit')}Vouch these</button><button class="btn ghost sm" data-act="vPop" data-v="">Close</button></div>
   <p class="small muted" style="margin:6px 0 8px">${L.length.toLocaleString('en-IN')} voucher${L.length===1?'':'s'} · taxable ${inr(Math.round(tot('taxable')))} · CGST ${inr(Math.round(tot('cgst')))} · SGST ${inr(Math.round(tot('sgst')))} · IGST ${inr(Math.round(tot('igst')))} · total <b>${inr(Math.round(tot('amount')))}</b>${d.types[type].cut?` · the import kept the first ${VROWMAX.toLocaleString('en-IN')} of ${d.types[type].cut.toLocaleString('en-IN')} vouchers`:''}</p>
   <div class="scroll" style="max-height:520px"><table><thead><tr><th>Date</th><th>Voucher</th><th>Invoice no.</th><th>Party</th><th>GSTIN</th><th class="num">Taxable</th><th class="num">CGST</th><th class="num">SGST</th><th class="num">IGST</th><th class="num">Total</th><th>Tax type</th></tr></thead><tbody>
   ${shown.map(r=>`<tr><td>${fmtD(r.date)}</td><td>${esc(r.vtype)} ${esc(r.vno||'')}${inS.has(r.vno+'|'+r.date+'|'+r.amount)?' <span class="tag g">in sample</span>':''}</td><td>${esc(r.ref||'')}</td><td>${esc(r.party||'')}</td><td>${esc(r.gstin||'')}${r.reg?'':' <span class="tag y">none</span>'}</td><td class="num">${inr(r.taxable)}</td><td class="num">${r.cgst?inr(r.cgst):''}</td><td class="num">${r.sgst?inr(r.sgst):''}</td><td class="num">${r.igst?inr(r.igst):''}</td><td class="num"><b>${inr(r.amount)}</b></td><td>${esc(TT[r.taxType]||'')}</td></tr>`).join('')}
   </tbody></table></div>${L.length>shown.length?`<button class="btn ghost sm" style="margin-top:8px" data-act="vPopAll">Show all ${L.length.toLocaleString('en-IN')}</button>`:''}</div>`}
const vRowBtn=(key,html)=>`<tr data-act="vPop" data-v="${esc(key)}" style="cursor:pointer" title="Show these vouchers">${html}</tr>`;
const vdocId=(c,fy)=>c.id+'-'+String(fy).replace(/[^0-9]/g,'');
const vdoc=c=>S.vouching.find(v=>v.id===vdocId(c,fyNow()));

/* ---- classification and parsing ---- */
function vtypeOf(name){const s=String(name||'').toLowerCase();
  if(/credit\s*note|sales\s*return|sales\s*ret/.test(s))return'salesReturn';
  if(/debit\s*note|purchase\s*return|purc?h?\s*ret/.test(s))return'purchaseReturn';
  if(/purchase|purc/.test(s))return'purchase';
  if(/sales|sale\b|invoice|tax inv/.test(s))return'sales';
  if(/payment|pymt/.test(s))return'payment';if(/receipt|rcpt/.test(s))return'receipt';
  if(/journal|jv\b/.test(s))return'journal';return null}
function decodeBuf(buf){const u=new Uint8Array(buf);
  if(u[0]===0xFF&&u[1]===0xFE)return new TextDecoder('utf-16le').decode(buf);
  if(u[0]===0xFE&&u[1]===0xFF)return new TextDecoder('utf-16be').decode(buf);
  if(u.length>3&&u[1]===0&&u[3]===0)return new TextDecoder('utf-16le').decode(buf);
  return new TextDecoder('utf-8').decode(buf)}
const unxml=s=>String(s||'').replace(/&#(\d+);/g,(m,n)=>String.fromCharCode(+n)).replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const xtag=(b,n)=>{const m=b.match(new RegExp('<'+n.replace('.','\\.')+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+n.replace('.','\\.')+'>'));return m?unxml(m[1]):''};
const num=v=>{const n=parseFloat(String(v??'').replace(/[₹,\s]/g,'').replace(/^\((.*)\)$/,'-$1'));return isNaN(n)?0:n};
const stateOf=g=>{const m=String(g||'').trim().match(/^(\d{2})[A-Z0-9]{13}$/i);return m?m[1]:''};
const isGstin=g=>!!stateOf(g);
function finishRow(r,homeState){
  r.amount=Math.abs(r.amount);r.cgst=Math.abs(r.cgst||0);r.sgst=Math.abs(r.sgst||0);r.igst=Math.abs(r.igst||0);
  const tax=r.cgst+r.sgst+r.igst;if(!r.taxable)r.taxable=Math.max(r.amount-tax,0);
  r.reg=isGstin(r.gstin);
  if(r.igst>0)r.taxType='interstate';else if(r.cgst>0||r.sgst>0)r.taxType='local';
  else if(r.reg&&homeState&&stateOf(r.gstin)!==homeState&&tax===0&&r.posHint)r.taxType='interstate';
  else r.taxType='nongst';
  return r}
async function parseTallyXML(text,homeState,progress){
  const out=[],re=/<VOUCHER[\s>]/g;let m,k=0;
  while((m=re.exec(text))){
    const e=text.indexOf('</VOUCHER>',m.index);if(e<0)break;const b=text.slice(m.index,e);re.lastIndex=e+10;
    if(/<ISCANCELLED>Yes</i.test(b)||/<ISOPTIONAL>Yes</i.test(b))continue;
    const vt=xtag(b,'VOUCHERTYPENAME'),type=vtypeOf(vt);if(!type)continue;
    const party=xtag(b,'PARTYLEDGERNAME')||xtag(b,'PARTYNAME'),d=xtag(b,'DATE');
    const r={date:d.length===8?d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6,8):d,type,vtype:vt,vno:xtag(b,'VOUCHERNUMBER'),ref:xtag(b,'REFERENCE'),party,gstin:xtag(b,'PARTYGSTIN')||xtag(b,'GSTREGISTRATIONNUMBER'),pos:xtag(b,'PLACEOFSUPPLY')||xtag(b,'STATENAME'),amount:0,cgst:0,sgst:0,igst:0,ledger:''};
    const ents=b.match(/<(ALLLEDGERENTRIES|LEDGERENTRIES)\.LIST>[\s\S]*?<\/\1\.LIST>/g)||[];let max=0;
    for(const en of ents){const ln=xtag(en,'LEDGERNAME'),amt=num(xtag(en,'AMOUNT')),a=Math.abs(amt),l=ln.toLowerCase();
      if(/igst|integrated/.test(l))r.igst+=a;else if(/cgst|central tax/.test(l))r.cgst+=a;else if(/sgst|utgst|state tax/.test(l))r.sgst+=a;
      else if(ln===party){r.amount=Math.max(r.amount,a)}else if(a>max){max=a;r.ledger=ln}}
    if(!r.amount)r.amount=ents.reduce((s,en)=>{const a=num(xtag(en,'AMOUNT'));return a>0?s+a:s},0)||max;
    if(r.amount)out.push(finishRow(r,homeState));
    if(++k%2000===0){progress&&progress(k);await new Promise(res=>setTimeout(res,0))}
  }
  return out}
function parseTable(rows,kind,homeState){
  const head=rows[0].map(h=>String(h).toLowerCase().trim()),col=(...k)=>{for(const x of k){const i=head.findIndex(h=>h.includes(x));if(i>=0)return i}return -1},colX=(ex,...k)=>{for(const x of k){const i=head.findIndex(h=>h.includes(x)&&!ex.some(e=>h.includes(e)));if(i>=0)return i}return -1};
  const ci={ref:col('supplier invoice','supplier inv','supp. inv','supplier bill','reference no','reference','ref no','ref. no'),date:col('date'),type:col('voucher type','vch type','vchtype','type'),vno:col('voucher no','vch no','invoice no','bill no','doc no','document no','voucher number','number'),party:colX(['ledger'],'party','customer','supplier','vendor','name','particulars'),gstin:col('gstin','gst no','gst number'),
    amount:colX(['taxable','tax amount','assessable','cgst','sgst','igst','cess'],'invoice total','invoice value','voucher total','grand total','total','gross','amount','value'),taxable:col('taxable','assessable','net amount'),cgst:col('cgst','central'),sgst:col('sgst','utgst','state tax'),igst:col('igst','integrated'),pos:col('place of supply','pos','state')};
  if(ci.date<0||ci.amount<0)throw new Error('The first row needs at least a Date column and an Amount / Total / Invoice value column.');
  const out=[];
  for(const r of rows.slice(1)){
    const type=kind&&kind!=='auto'?kind:vtypeOf(ci.type>=0?r[ci.type]:'');if(!type)continue;
    const d=toDate(r[ci.date]),g=x=>ci[x]>=0?r[ci[x]]:'';
    const row={date:d&&!isNaN(d)?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:String(r[ci.date]||''),type,vtype:String(g('type')||VSHORT[type]),vno:String(g('vno')||''),ref:ci.ref>=0?String(r[ci.ref]||'').trim():'',party:String(g('party')||''),gstin:String(g('gstin')||'').trim(),pos:String(g('pos')||''),
      amount:num(g('amount')),taxable:num(g('taxable')),cgst:num(g('cgst')),sgst:num(g('sgst')),igst:num(g('igst')),ledger:'',posHint:ci.pos>=0};
    if(row.amount)out.push(finishRow(row,homeState));
  }
  if(!out.length)throw new Error(kind==='auto'?'No vouchers could be classified. Add a "Voucher type" column, or choose what the file contains before importing.':'No rows with an amount were found.');
  return out}
async function readVouchers(file,kind,homeState,progress){
  const buf=await file.arrayBuffer(),x=extOf(file.name);
  if(x==='xml'){const text=decodeBuf(buf);if(!/<VOUCHER[\s>]/.test(text))throw new Error('No vouchers found in this XML. In Tally, export the Day Book (or a voucher register) in XML format.');return parseTallyXML(text,homeState,progress)}
  let rows;if(['xlsx','xls','xlsm'].includes(x)){await needLib('XLSX');const wb=XLSX.read(buf,{type:'array',cellDates:true});rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:false,defval:''})}
  else rows=parseCSV(decodeBuf(buf));
  rows=rows.filter(r=>r.some(v=>String(v).trim()));
  const h=rows.findIndex(r=>r.some(v=>/date/i.test(v))&&r.some(v=>/amount|total|value/i.test(v)));if(h>0)rows=rows.slice(h);
  return parseTable(rows,kind,homeState)}

/* ---- analysis ---- */
const sum=(L,f)=>L.reduce((s,x)=>s+(f?f(x):x),0);
function analyse(rows,tolPct){
  const V=sum(rows,r=>r.amount),N=rows.length,TM=V*(tolPct||5)/100,keyAmt=TM;
  const sorted=[...rows].sort((a,b)=>b.amount-a.amount),medianCut=sorted[Math.floor(N*0.2)]?.amount||0;
  const band=r=>r.amount>=keyAmt?'high':r.amount>=medianCut?'medium':'low';
  const B={high:[],medium:[],low:[]};rows.forEach(r=>B[band(r)].push(r));
  const T={local:[],interstate:[],nongst:[]};rows.forEach(r=>T[r.taxType].push(r));
  const P={};rows.forEach(r=>{const k=r.party||'(no party)';P[k]=P[k]||{party:k,n:0,v:0};P[k].n++;P[k].v+=r.amount});
  const months={};rows.forEach(r=>{const k=String(r.date).slice(0,7);months[k]=(months[k]||0)+r.amount});
  const dates=rows.map(r=>r.date).filter(Boolean).sort();
  return{N,V,TM,keyAmt,medianCut,from:dates[0]||'',to:dates.at(-1)||'',
    bands:Object.fromEntries(Object.entries(B).map(([k,L])=>[k,{n:L.length,v:sum(L,r=>r.amount)}])),
    tax:Object.fromEntries(Object.entries(T).map(([k,L])=>[k,{n:L.length,v:sum(L,r=>r.amount)}])),
    unreg:{n:rows.filter(r=>!r.reg).length,v:sum(rows.filter(r=>!r.reg),r=>r.amount)},
    gst:{cgst:sum(rows,r=>r.cgst),sgst:sum(rows,r=>r.sgst),igst:sum(rows,r=>r.igst)},
    parties:Object.values(P).sort((a,b)=>b.v-a.v).slice(0,5).map(p=>({...p,share:V?p.v/V:0})),partyCount:Object.keys(P).length,
    months:Object.entries(months).sort(),round:rows.filter(r=>r.amount>=10000&&r.amount%1000===0).length,sunday:rows.filter(r=>{const d=new Date(r.date+'T00:00:00');return!isNaN(d)&&d.getDay()===0}).length};
}

/* ---- sampling ---- */
function rngFrom(seed){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function drawSample(rows,type,m){
  const A=analyse(rows,m.tolPct),rng=rngFrom(m.seed),cf=CF[m.conf]||2.31,picked=new Map();
  const add=(r,why)=>{const k=r.vno+'|'+r.date+'|'+r.amount;if(picked.has(k)){picked.get(k).why.includes(why)||picked.get(k).why.push(why)}else picked.set(k,{r,why:[why]})};
  const key=m.method==='random'||m.method==='systematic'?[]:rows.filter(r=>r.amount>=A.keyAmt);key.forEach(r=>add(r,'Key item'));
  const rest=rows.filter(r=>!key.includes(r)),Vr=sum(rest,r=>r.amount);
  let n=m.n>0?m.n:(A.TM>0?Math.ceil(Vr*cf/A.TM):0);n=Math.min(n,rest.length);let J=0;
  const shuffle=L=>{const a=[...L];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
  if(n>0){
    if(m.method==='standard'||m.method==='mus'){J=Vr/n;let next=rng()*J,cum=0;for(const r of rest){cum+=r.amount;while(cum>next&&next<Vr){add(r,'MUS');next+=J}}}
    else if(m.method==='random')shuffle(rest).slice(0,n).forEach(r=>add(r,'Random'));
    else if(m.method==='systematic'){const L=[...rest].sort((a,b)=>String(a.date).localeCompare(String(b.date))),k=L.length/n;let p=rng()*k;for(let i=0;i<n;i++){add(L[Math.floor(p)],'Systematic');p+=k}}
    else if(m.method==='stratified'){const med=rest.filter(r=>r.amount>=A.medianCut),low=rest.filter(r=>r.amount<A.medianCut),nm=Math.min(med.length,Math.round(n*0.6));shuffle(med).slice(0,nm).forEach(r=>add(r,'Medium band'));shuffle(low).slice(0,Math.min(low.length,n-nm)).forEach(r=>add(r,'Low band'))}
  }
  if(m.method==='standard'&&m.riskPicks>0){
    const lastD=A.to,cut=r=>{if(!lastD||!r.date)return false;const d=(new Date(lastD)-new Date(r.date))/864e5;return d>=0&&d<=3};
    const rules=[['Round sum',r=>r.amount>=10000&&r.amount%1000===0],['Sunday',r=>new Date(r.date+'T00:00:00').getDay()===0],['Period-end cut-off',cut],['Interstate',r=>r.taxType==='interstate'],['Non-GST / exempt',r=>r.taxType==='nongst']];
    if(type==='purchase'||type==='purchaseReturn')rules.push(['Unregistered party',r=>!r.reg]);
    for(const [why,f] of rules)shuffle(rest.filter(f)).slice(0,m.riskPicks).forEach(r=>add(r,why));
  }
  const sample=[...picked.values()].map(({r,why},i)=>({sid:'v'+i,date:r.date,vno:r.vno,party:r.party,gstin:r.gstin,amount:r.amount,taxable:r.taxable,tax:r.cgst+r.sgst+r.igst,taxType:r.taxType,reg:r.reg,why,checks:{},result:'',mis:0,note:'',ev:[]}));
  sample.sort((a,b)=>(b.why.includes('Key item')-a.why.includes('Key item'))||String(a.date).localeCompare(String(b.date)));
  const unique=sample.filter(x=>x.why.some(w=>w!=='Key item'&&!/^(Round sum|Sunday|Period-end cut-off|Interstate|Non-GST \/ exempt|Unregistered party)$/.test(w))).length;
  return{plan:{...m,cf,TM:A.TM,keyAmt:A.keyAmt,keyCount:key.length,n,unique,J,Vr,N:A.N,V:A.V,drawnAt:new Date().toISOString()},sample};
}
function vResults(t){
  const S_=t.sample||[],done=S_.filter(x=>x.result),ex=S_.filter(x=>x.result==='ex'||x.result==='nf'),P=t.plan||{};
  let proj=0;
  if(P.method==='standard'||P.method==='mus'){for(const x of ex){const m=Math.min(+x.mis||0,x.amount);if(x.why.includes('MUS')&&!x.why.includes('Key item')&&P.J&&x.amount)proj+=(m/x.amount)*Math.max(P.J,x.amount);else proj+=m}}
  else{const stat=x=>!x.why.includes('Key item')&&x.why.some(w=>/Random|Systematic|band/.test(w)),sv=sum(S_.filter(stat),x=>x.amount),sm=sum(ex.filter(stat),x=>+x.mis||0);proj=(sv?sm/sv*(P.Vr||0):0)+sum(ex.filter(x=>!stat(x)),x=>+x.mis||0)}
  const actual=sum(ex,x=>+x.mis||0);
  return{total:S_.length,done:done.length,ex:ex.length,actual,proj,TM:P.TM||0,ok:proj<=(P.TM||0)};
}

/* ---- views ---- */
const inrc=n=>{n=+n||0;return n>=1e7?'₹'+(n/1e7).toFixed(2)+' cr':n>=1e5?'₹'+(n/1e5).toFixed(2)+' L':inr(Math.round(n))};
const TT={local:'Local (CGST + SGST)',interstate:'Interstate (IGST)',nongst:'Non-GST / exempt'};
function vouchingTab(c){
  const doc=vdoc(c),types=doc?Object.keys(VTYPES).filter(k=>doc.types?.[k]):[],cur=types.includes(ui.vtype)?ui.vtype:types[0],pop=doc?Object.fromEntries(Object.keys(doc.types||{}).map(k=>[k,popRows(doc,k)])):null;
  const imp=`<div class="grid2 even" style="margin-bottom:16px"><label class="drop" data-drop="vouch">${ic('up')}<b>Import vouchers: Tally XML, CSV or Excel</b><span class="small">Tally: Day Book → Export → XML (any encoding). Other software: a voucher / GST register with date, voucher type, number, party, GSTIN, taxable value, CGST, SGST, IGST and total.</span><input type="file" data-file="vouch" accept=".xml,.csv,.xlsx,.xls" hidden></label>
   <div class="panel"><h3>Import settings</h3><div class="form"><label class="f">File contains<select id="vk"><option value="auto">Auto-detect from voucher type</option>${Object.entries(VTYPES).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('')}</select></label><label class="f">Client's GSTIN (for local vs interstate)<input id="vg" value="${esc(c.gstin||'')}" placeholder="e.g. 33AAACK1234F1Z5"></label></div>
   <p class="small muted" style="margin:8px 0 0">The imported file is kept as client evidence (hosted version: up to 25 MB). FY ${esc(fyNow())}.</p></div></div>`;
  if(!doc||!types.length)return imp+`<div class="empty">No vouchers imported yet for FY ${esc(fyNow())}. Import the client's data to analyse it by voucher type and draw samples with the standard vouching method.</div>`;
  const t=doc.types[cur],A=t.summary,R=vResults(t),plan=t.plan;
  return imp+`<div class="tabs" role="tablist" style="margin-top:0">${types.map(k=>{const r=vResults(doc.types[k]);return `<button class="${k===cur?'on':''}" data-act="vtype" data-v="${k}">${VSHORT[k]}<span class="n">${doc.types[k].summary.N}</span>${r.total?`<span class="n" style="${r.done===r.total?'color:var(--ok)':''}">${r.done}/${r.total}</span>`:''}</button>`}).join('')}</div>
  <div class="kpis"><div class="kpi"><b>${A.N}</b><span>${esc(VSHORT[cur])} vouchers</span></div><div class="kpi"><b>${inrc(A.V)}</b><span>Total value</span></div><div class="kpi"><b>${pct(A.tax.interstate.n,A.N)}%</b><span>Interstate by count</span></div><div class="kpi ${A.unreg.n?'':'good'}"><b>${A.unreg.n}</b><span>Unregistered party vouchers</span></div><div class="kpi"><b>${R.total?R.done+'/'+R.total:'—'}</b><span>Sample vouched</span></div></div>
  <div class="grid2 even"><div class="panel"><h2>Population analysis</h2><p class="small muted" style="margin-top:-4px">${fmtD(A.from)} to ${fmtD(A.to)} · ${A.partyCount} parties · source ${esc(doc.source?.file||'')}${pop?.[cur]?'':' · re-import to redraw the sample'}</p>
   <div class="scroll"><table><thead><tr><th>Value band</th><th class="num">Vouchers</th><th class="num">Value</th><th class="num">Share</th></tr></thead><tbody>${[['high',`High (≥ ${inrc(A.keyAmt)})`],['medium',`Medium (≥ ${inrc(A.medianCut)})`],['low','Low']].map(([k,l])=>vRowBtn(k,`<td><a href="#" onclick="return false">${l}</a></td><td class="num">${A.bands[k].n}</td><td class="num">${inrc(A.bands[k].v)}</td><td class="num">${pct(A.bands[k].v,A.V)}%</td>`)).join('')}
   ${Object.entries(TT).map(([k,l])=>vRowBtn(k,`<td><a href="#" onclick="return false">${l}</a></td><td class="num">${A.tax[k].n}</td><td class="num">${inrc(A.tax[k].v)}</td><td class="num">${pct(A.tax[k].v,A.V)}%</td>`)).join('')}
   ${vRowBtn('unreg',`<td><a href="#" onclick="return false">Party without GSTIN</a></td><td class="num">${A.unreg.n}</td><td class="num">${inrc(A.unreg.v)}</td><td class="num">${pct(A.unreg.v,A.V)}%</td>`)}</tbody></table></div>
   <p class="small" style="margin:10px 0 4px"><b>Tax in the vouchers:</b> CGST ${inrc(A.gst.cgst)} · SGST ${inrc(A.gst.sgst)} · IGST ${inrc(A.gst.igst)} · <a href="#" data-act="vPop" data-v="round">Round sums ${A.round}</a> · <a href="#" data-act="vPop" data-v="sunday">Sunday-dated ${A.sunday}</a> · <a href="#" data-act="vPop" data-v="all">Every voucher</a></p>
   <p class="small muted" style="margin:0 0 4px">Click a line, a party or a month to see its vouchers, export them to Excel, or vouch them.</p>
   <h3 style="margin-top:12px">Top parties</h3>${A.parties.map(p=>`<div class="bar" data-act="vPop" data-v="party:${esc(p.party)}" style="cursor:pointer" title="Show these vouchers"><span>${esc(p.party)}</span><div class="track"><span style="width:${Math.round(p.share*100)}%;background:var(--acc)"></span></div><span class="num">${Math.round(p.share*100)}%</span></div>`).join('')}
   <h3 style="margin-top:12px">By month</h3>${(()=>{const mx=Math.max(1,...A.months.map(x=>x[1]));return A.months.map(([k,v])=>`<div class="bar" data-act="vPop" data-v="month:${esc(k)}" style="cursor:pointer" title="Show these vouchers"><span>${esc(k)}</span><div class="track"><span style="width:${v/mx*100}%;background:var(--lo)"></span></div><span class="num" style="min-width:5em">${inrc(v)}</span></div>`).join('')})()}</div>
  <div class="panel"><h2>Sampling plan</h2><form id="vplan" class="form"><label class="f wide">Method<select id="vm-method">${opts(METHODS,plan?.method||VMETHOD.method)}</select></label>
   <label class="f">Confidence<select id="vm-conf">${opts({'80':'80%','90':'90%','95':'95%'},String(plan?.conf||VMETHOD.conf))}</select></label><label class="f">Tolerable error (% of value)<input id="vm-tol" type="number" min="0.5" max="50" step="0.5" value="${plan?.tolPct||VMETHOD.tolPct}"></label>
   <label class="f">Sample size override<input id="vm-n" type="number" min="0" step="1" value="${plan?.override||''}" placeholder="auto"></label><label class="f">Risk picks per rule<input id="vm-risk" type="number" min="0" max="10" value="${plan?.riskPicks??VMETHOD.riskPicks}"></label>
   <div class="wide row"><button class="btn" type="submit" ${pop?.[cur]?'':'disabled title="Re-import the data to draw a new sample"'}>${t.sample?.length?'Redraw sample':'Draw sample'}</button>${t.sample?.length?`<button type="button" class="btn ghost" data-act="vCsv">${ic('down')}Sample CSV</button>`:''}</div></form>
   ${plan?`<div class="card" style="margin-top:12px;font-size:14px"><b>How the sample was set</b><ul style="margin:6px 0 0;padding-left:18px">
    <li>Tolerable error ${plan.tolPct}% of ${inrc(plan.V)} = <b>${inrc(plan.TM)}</b>${plan.keyCount?`; all ${plan.keyCount} vouchers of ${inrc(plan.keyAmt)} or more are key items (100% vouched)`:''}.</li>
    ${plan.method==='standard'||plan.method==='mus'?`<li>Rest of population ${inrc(plan.Vr)} × confidence factor ${plan.cf} ÷ ${inrc(plan.TM)} = <b>${plan.n}</b> selections by monetary unit sampling (interval ${inrc(plan.J)})${plan.unique!=null&&plan.unique<plan.n?`, landing on <b>${plan.unique}</b> different vouchers because large vouchers can be hit more than once`:''}.</li>`:`<li><b>${plan.n}</b> items by ${esc(METHODS[plan.method].toLowerCase())}.</li>`}
    ${plan.method==='standard'?`<li>Plus up to ${plan.riskPicks} risk picks each: round sums, Sundays, period-end cut-off, interstate, non-GST${cur==='purchase'||cur==='purchaseReturn'?', unregistered parties':''}.</li>`:''}
    <li>Random seed ${plan.seed}: the same data and seed always give the same sample.</li></ul></div>`:''}
   ${R.total?`<div class="card" style="margin-top:12px"><div class="row"><b class="sp">Result</b>${R.done<R.total?`<span class="tag y">${R.total-R.done} to vouch</span>`:R.ok?'<span class="tag g">Within tolerable error</span>':'<span class="tag r">Exceeds tolerable error</span>'}</div>
    <p class="small" style="margin:6px 0 0">${R.ex} exception${R.ex===1?'':'s'} · actual misstatement ${inrc(R.actual)} · projected to the population <b>${inrc(R.proj)}</b> against tolerable ${inrc(R.TM)}.</p>${R.ex?`<button class="btn ghost sm" style="margin-top:8px" data-act="vObs">${ic('flag')}Raise observation</button>`:''}</div>`:''}</div></div>
  ${vDetail(c,doc,cur,A)}
  ${t.sample?.length?vouchSheet(c,cur,t):''}`;
}
function vouchSheet(c,type,t){
  const checks=VCHECKS[type]||VCHECKS.journal;
  return `<h2 class="section">Vouching worksheet: ${esc(VSHORT[type])} (${t.sample.length} vouchers)</h2><p class="small muted" style="margin-top:-6px">Tick each attribute verified against the documents, then record the result. Enter the misstatement amount for any exception.</p>
  ${t.sample.map((x,i)=>`<div class="chk" style="grid-template-columns:2.2em minmax(0,1fr) auto"><span class="no">${i+1}</span><div><div class="q">${esc(x.vno||'(no number)')} · ${esc(x.party||'(no party)')} · <span class="num">${inr(x.amount)}</span></div><div class="ref">${fmtD(x.date)} · ${esc(TT[x.taxType])}${x.reg?'':' · no GSTIN'} · ${x.why.map(w=>`<span class="tag ${w==='Key item'?'b':w==='MUS'||w==='Random'||w==='Systematic'||/band/.test(w)?'n':'y'}">${esc(w)}</span>`).join(' ')}</div></div>
   <div class="seg" role="group" aria-label="Result">${[['ok','OK'],['ex','Exception'],['nf','Not found']].map(([v,l])=>`<button data-act="vres" data-i="${i}" data-v="${v}" class="${v==='nf'?'ex':v} ${x.result===v?'on':''}" aria-pressed="${x.result===v}">${l}</button>`).join('')}</div>
   <div class="body"><div class="chips" style="margin-top:0">${checks.map((q,k)=>`<label class="chip" style="cursor:pointer"><input type="checkbox" data-vchk="${i}" data-k="${k}" ${x.checks[k]?'checked':''} style="width:16px;min-height:16px">${esc(q)}</label>`).join('')}</div>
    <div class="row" style="margin-top:8px">${x.result==='ex'||x.result==='nf'?`<label class="f" style="flex:0 1 11em">Misstatement (₹)<input type="number" min="0" step="any" data-vmis="${i}" value="${x.mis||''}"></label>`:''}<label class="f" style="flex:1 1 16em">Note<input data-vnote="${i}" value="${esc(x.note||'')}" placeholder="Documents seen, differences"></label>
     <label class="chip" style="cursor:pointer;color:var(--acc-ink);align-self:flex-end">${ic('clip')}Attach${(x.ev||[]).length?` (${x.ev.length})`:''}<input type="file" data-file="vev" data-i="${i}" multiple hidden></label></div></div></div>`).join('')}`;
}
function vVouching(){
  setTop([['Audits','audits'],['Vouching']]);
  const fy=fyNow();
  return `<div class="head"><div class="titles"><h1>Vouching, FY ${esc(fy)}</h1><p class="sub">A procedure of every audit, done in the audit's Vouching tab with one standard method: import the books, analyse each voucher type, vouch every key item, a value-weighted sample of the rest, and targeted risk picks.</p></div></div>${auditSubnav('vouching')}
  <div class="panel" style="margin-bottom:18px"><h2>The standard vouching method</h2><ol style="margin:0;padding-left:20px;line-height:1.7">
   <li><b>Import</b> the year's vouchers (Tally XML, or CSV / Excel from any software). Each voucher is classed as purchase, sales, purchase return (debit note), sales return (credit note), payment, receipt or journal.</li>
   <li><b>Analyse</b> each type: value bands, local vs interstate vs non-GST, parties without GSTIN, top parties and monthly pattern.</li>
   <li><b>Key items</b>: every voucher at or above the tolerable error (default ${VMETHOD.tolPct}% of the type's value) is vouched in full.</li>
   <li><b>Monetary unit sample</b> of the rest: size = remaining value × confidence factor (80% 1.61 · 90% 2.31 · 95% 3.0) ÷ tolerable error, so larger vouchers are more likely to be picked.</li>
   <li><b>Risk picks</b>: up to ${VMETHOD.riskPicks} each of round sums, Sunday entries, period-end cut-off, interstate, non-GST and (for purchases) unregistered parties.</li>
   <li><b>Vouch</b> each item against the type's checklist; project errors to the population and compare with the tolerable error; raise observations for exceptions.</li></ol></div>
  ${S.clients.length?`<div class="scroll"><table class="stack"><thead><tr><th>Client</th>${Object.keys(VSHORT).slice(0,4).map(k=>`<th>${VSHORT[k]}</th>`).join('')}<th>Other</th></tr></thead><tbody>${S.clients.map(c=>{const d=vdoc(c);const cell=k=>{const t=d?.types?.[k];if(!t)return '<span class="muted">—</span>';const r=vResults(t);return `${t.summary.N} vchs<br>${r.total?`<span class="tag ${r.done===r.total?(r.ok?'g':'r'):'y'}">${r.done}/${r.total} vouched</span>`:'<span class="tag n">No sample</span>'}`};return `<tr class="click" ${auditFor(c)?`data-go="audit-${auditFor(c).id}" data-tab="vouching"`:`data-go="client-${c.id}" data-tab="audits"`}><td><b>${esc(c.name)}</b>${d?`<div class="small muted">${esc(d.source?.file||'')}</div>`:''}</td>${Object.keys(VSHORT).slice(0,4).map(k=>`<td>${cell(k)}</td>`).join('')}<td>${['payment','receipt','journal'].filter(k=>d?.types?.[k]).map(k=>VSHORT[k]).join(', ')||'—'}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">Add a client first.</div>'}`;
}
const vouchMissing=d=>`<h2>Annexure D — Vouching</h2><p><b>Not completed.</b> Vouching is a mandatory procedure of every audit; ${d?'the books are imported but no sample has been vouched':'the books have not been imported'} yet.</p>`;
function vouchReport(a){
  const c=S.clients.find(x=>x.id===a.clientId);if(!c)return'';const d=vdoc(c);if(!d)return vouchMissing(null);
  const ts=Object.keys(VTYPES).filter(k=>d.types?.[k]?.sample?.length);if(!ts.length)return vouchMissing(d);
  return `<h2>Annexure D — Vouching (FY ${esc(d.fy)})</h2><p>Source: ${esc(d.source?.file||'')}. Standard vouching method: key items in full, monetary unit sample of the rest, plus risk picks.</p><table><thead><tr><th>Voucher type</th><th>Population</th><th>Value</th><th>Sampled</th><th>Vouched</th><th>Exceptions</th><th>Projected error</th><th>Tolerable</th><th>Conclusion</th></tr></thead><tbody>${ts.map(k=>{const t=d.types[k],r=vResults(t);return `<tr><td>${esc(VSHORT[k])}</td><td>${t.summary.N}</td><td>${inrc(t.summary.V)}</td><td>${r.total}</td><td>${r.done}</td><td>${r.ex}</td><td>${inrc(r.proj)}</td><td>${inrc(r.TM)}</td><td>${r.done<r.total?'In progress':r.ok?'Within tolerable error':'Exceeds tolerable error'}</td></tr>`}).join('')}</tbody></table>
  ${ts.map(k=>{const ex=d.types[k].sample.filter(x=>x.result==='ex'||x.result==='nf');return ex.length?`<h3>${esc(VSHORT[k])}: exceptions</h3><table><thead><tr><th>Voucher</th><th>Date</th><th>Party</th><th>Amount</th><th>Misstatement</th><th>Note</th></tr></thead><tbody>${ex.map(x=>`<tr><td>${esc(x.vno)}</td><td>${fmtD(x.date)}</td><td>${esc(x.party)}</td><td>${inr(x.amount)}</td><td>${inr(x.mis||0)}</td><td>${esc(x.note||'')}</td></tr>`).join('')}</tbody></table>`:''}).join('')}`;
}

/* ---- actions ---- */
async function importVouchers(c,file){
  const kind=$('#vk')?.value||'auto',g=($('#vg')?.value||c.gstin||'').trim().toUpperCase(),home=stateOf(g);
  if(g&&g!==c.gstin)await put('clients',c.id,{...c,gstin:g});
  try{
    toast('Reading '+file.name+'…');
    const rows=await readVouchers(file,kind,home,k=>toast(k.toLocaleString('en-IN')+' vouchers read…'));
    if(!rows.length)throw new Error('No purchase, sales, return, payment, receipt or journal vouchers were found.');
    const id=vdocId(c,fyNow()),by={};rows.forEach(r=>(by[r.type]=by[r.type]||[]).push(r));
    VPOP[id]={...(VPOP[id]||{}),...by};
    const old=S.vouching.find(v=>v.id===id)||{id,clientId:c.id,fy:fyNow(),types:{}},types={...old.types};
    for(const [k,L] of Object.entries(by)){const prev=types[k];types[k]={summary:analyse(L,prev?.plan?.tolPct||VMETHOD.tolPct),plan:prev?.plan||null,sample:prev?.sample||[],rows:L.slice(0,VROWMAX).map(VROW),cut:L.length>VROWMAX?L.length:0}}
    let evId='';if(file.size<=(mode==='claude'?EVID_INLINE_MAX:25*1048576)){try{evId=await addEvidence(file,{clientId:c.id,purpose:'Vouching data import'})}catch(e){}}
    await put('vouching',id,{...old,types,source:{file:file.name,rows:rows.length,at:new Date().toISOString(),evidenceId:evId,kind}});
    ui.vtype=Object.keys(VTYPES).find(k=>by[k]);
    toast(`${rows.length.toLocaleString('en-IN')} vouchers imported: `+Object.entries(by).map(([k,L])=>`${L.length} ${VSHORT[k].toLowerCase()}`).join(', '));
  }catch(er){toast(er.message||String(er))}
}
function curV(){const c=C(),d=vdoc(c),types=d?Object.keys(VTYPES).filter(k=>d.types?.[k]):[];const type=types.includes(ui.vtype)?ui.vtype:types[0];return{c,d,type,t:d?.types?.[type]}}
function saveT(d,type,t){return put('vouching',d.id,{...d,types:{...d.types,[type]:t}})}
Object.assign(ACT,{
  vtype:t=>{ui.vtype=t.dataset.v;ui.vpop=null;render()},
  vPop:t=>{const {type}=curV();const k=t.dataset.v||'';ui.vpop=k?{type,k}:null;ui.vpopAll=false;render();if(k)setTimeout(()=>document.getElementById('vpop-detail')?.scrollIntoView({behavior:'smooth',block:'start'}),60)},
  vPopAll:()=>{ui.vpopAll=true;render()},
  vPopX:async()=>{const {c,d,type,t:T}=curV(),F=vFilter(T.summary,ui.vpop?.k),rows=popRows(d,type);if(!F||!rows)return;const L=rows.filter(F[1]).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    const tot=k=>Math.round(L.reduce((t,r)=>t+(+r[k]||0),0)*100)/100;
    await xlsxSave([[F[0].slice(0,28),[VHEAD,...L.map(vLine),[],['Total','','','','','','',tot('taxable'),tot('cgst'),tot('sgst'),tot('igst'),tot('amount')]]]],VSHORT[type]+' - '+F[0].replace(/[^\w ()+.-]+/g,' ')+' - '+c.name+' - FY '+fyNow());toast(L.length+' vouchers exported')},
  vPopVouch:async()=>{const {d,type,t:T}=curV(),F=vFilter(T.summary,ui.vpop?.k),rows=popRows(d,type);if(!F||!rows)return;const L=rows.filter(F[1]);
    if(L.length>500&&!confirm(L.length+' vouchers will be added to the vouching sheet. Continue?'))return;
    const S0=T.sample||[],have=new Set(S0.map(x=>x.vno+'|'+x.date+'|'+x.amount));let n=S0.length,add=0;const why=F[0].replace(/ \(.*\)$/,'');
    const out=S0.map(x=>{const k=x.vno+'|'+x.date+'|'+x.amount;return L.some(r=>r.vno+'|'+r.date+'|'+r.amount===k)&&!x.why.includes(why)?{...x,why:[...x.why,why]}:x});
    for(const r of L){const k=r.vno+'|'+r.date+'|'+r.amount;if(have.has(k))continue;have.add(k);add++;out.push({sid:'v'+(n++),date:r.date,vno:r.vno,party:r.party,gstin:r.gstin,amount:r.amount,taxable:r.taxable,tax:r.cgst+r.sgst+r.igst,taxType:r.taxType,reg:r.reg,why:[why],checks:{},result:'',mis:0,note:'',ev:[]})}
    await saveT(d,type,{...T,sample:out});toast(add?add+' voucher'+(add===1?'':'s')+' added to the vouching sheet':'These vouchers are already in the vouching sheet')},
  vres:t=>{const {d,type,t:T}=curV(),i=+t.dataset.i,v=T.sample[i].result===t.dataset.v?'':t.dataset.v;saveT(d,type,{...T,sample:T.sample.map((x,k)=>k===i?{...x,result:v,mis:v==='ok'?0:x.mis}:x)})},
  vCsv:()=>{const {c,type,t:T}=curV(),q=v=>'"'+String(v??'').replace(/"/g,'""')+'"',ch=VCHECKS[type]||VCHECKS.journal;dlFile(fileSafe(c.name)+' vouching '+VSHORT[type]+' FY '+fyNow()+'.csv',[['#','Date','Voucher','Party','GSTIN','Amount','Tax type','Selected because',...ch,'Result','Misstatement','Note'].map(q).join(','),...T.sample.map((x,i)=>[i+1,x.date,x.vno,x.party,x.gstin,x.amount,TT[x.taxType],x.why.join('; '),...ch.map((_,k)=>x.checks[k]?'Yes':''),{ok:'OK',ex:'Exception',nf:'Not found'}[x.result]||'',x.mis||'',x.note].map(q).join(','))].join('\n'))},
  vObs:()=>{const {c,type,t:T}=curV(),r=vResults(T),ex=T.sample.filter(x=>x.result==='ex'||x.result==='nf');newObs({clientId:c.id,auditId:A()?.id||'',title:`Exceptions in vouching of ${VSHORT[type].toLowerCase()}`,rating:r.ok?'M':'H',condition:`${ex.length} of ${T.sample.length} sampled ${VSHORT[type].toLowerCase()} vouchers had exceptions (actual misstatement ${inr(Math.round(r.actual))}; projected ${inr(Math.round(r.proj))} against tolerable ${inr(Math.round(r.TM))}). `+ex.slice(0,4).map(x=>`${x.vno} ${x.party} ${inr(x.amount)}${x.note?' – '+x.note:''}`).join('; ')+'.',criteria:(VCHECKS[type]||[]).join('; '),evidence:ex.flatMap(x=>x.ev||[])})}
});
document.addEventListener('change',e=>{
  const t=e.target;if(!(t.dataset.vchk!=null||t.dataset.vmis!=null||t.dataset.vnote!=null))return;
  const {d,type,t:T}=curV();if(!T)return;
  if(t.dataset.vchk!=null){const i=+t.dataset.vchk,k=t.dataset.k;return saveT(d,type,{...T,sample:T.sample.map((x,j)=>j===i?{...x,checks:{...x.checks,[k]:t.checked}}:x)})}
  if(t.dataset.vmis!=null){const i=+t.dataset.vmis;return saveT(d,type,{...T,sample:T.sample.map((x,j)=>j===i?{...x,mis:+t.value||0}:x)})}
  if(t.dataset.vnote!=null){const i=+t.dataset.vnote;return saveT(d,type,{...T,sample:T.sample.map((x,j)=>j===i?{...x,note:t.value}:x)})}
});
document.addEventListener('submit',e=>{
  if(e.target.id!=='vplan')return;e.preventDefault();e.stopImmediatePropagation();
  const {c,d,type,t:T}=curV(),rows=popRows(d,type);if(!rows)return toast('Re-import the data file to draw a new sample.');
  const m={method:val('vm-method'),conf:val('vm-conf'),tolPct:+val('vm-tol')||VMETHOD.tolPct,riskPicks:+val('vm-risk')||0,n:+val('vm-n')||0,override:+val('vm-n')||'',seed:Math.floor(Math.random()*1e9)};
  const {plan,sample}=drawSample(rows,type,m);
  saveT(d,type,{...T,summary:analyse(rows,m.tolPct),plan,sample});toast(`${sample.length} vouchers sampled`);
},true);
