/* Smart Auditing — the audit report as an Excel workbook that explains itself (owner, 25 Nov 2026):
   "proper excel report with professional look and styles and easy to understand for the client and for junior accounts person or
    trainee ... each sheet which contain each process and their findings, observation ... it should be like it expressing the problem
    even the person who don't know much accounts see them easily".
   Layout: 1 Summary (opinion, a traffic light for every procedure, the problems to fix first) · 2 How to read · one sheet per procedure
   (what we checked in plain words, result at a glance, problems, observations, evidence, conclusion) followed by its detail sheets
   (colour-coded) · Observations · For discussion · Evidence annex. Written with 1Go's writer (xlsxsa.js). */
const PLAIN={
  chk:'Step-by-step audit checklist: each step, what was found, and the auditor\'s note.',
  vouch:'We picked bills and payments from the books and checked each one against its proof: the invoice, the approval and the payment.',
  gst:'We compared the GST in the books with what was filed on the GST portal (GSTR-1 for sales, GSTR-3B for the tax paid) and with what suppliers filed (GSTR-2B), bill by bill.',
  tds:'We checked that tax deducted from payments (TDS) was paid to the government on time and agrees with the books.',
  brs:'We matched the bank book with the bank statement, so that every receipt and payment is real and recorded.',
  cash:'We counted the cash in hand and compared it with the cash book.',
  drs:'We checked what customers owe: the balances, how old the dues are, and confirmations from customers.',
  crs:'We checked what the company owes its suppliers: balances, confirmations, and payment of small (MSME) suppliers within 45 days.',
  stock:'We checked the stock records against the stock actually held, and looked for slow-moving or missing items.',
  fav:'We checked the fixed assets (machines, vehicles, furniture) against the asset register.',
  comp:'We checked that tax and statutory returns and payments (GST, TDS, PF, ESI and others) were made by their due dates.',
  pay:'We checked salaries paid against attendance, salary rates and the statutory deductions.',
  as26:'We compared the tax deducted by customers (Form 26AS) with the books.',
  ar:'We compared this period\'s figures with earlier periods to spot unusual changes.',
  tests:'We ran computer tests on every entry to find duplicates, round amounts, entries on holidays and other unusual items.',
  settle:'We matched every sale to the money received for it, and every purchase to the payment made for it, to find what is really still to be received or paid.'};
const EVK={vouch:/vouch|invoice|voucher|bill/i,gst:/gst|gstr|portal|1go/i,tds:/tds|challan|traces|26q/i,brs:/bank/i,cash:/cash/i,drs:/debtor|customer|receivable|confirm/i,crs:/creditor|supplier|payable|msme/i,
  stock:/stock|inventory/i,fav:/asset/i,comp:/due date|filing|return|pf|esi/i,pay:/salary|payroll|attendance/i,as26:/26as/i,settle:/day ?book|bill-wise|tally/i,tests:/data test|ledger|books/i,ar:/trial|analytical/i};
const TONE={ok:['gS','All right'],warn:['aS','Needs attention'],bad:['rS','Problem found'],none:['nS','Not done yet']};
const RTONE={H:'badC',M:'warnC',L:'okC'};
const toneOf=t=>{t=String(t??'');if(/^(✔|matched|ok|satisfactory|closed by bill|agreed|yes|done|paid on time|reconciled|closed$|rounding)/i.test(t))return'okT';
  if(/(not in|open|exception|differ|short|late|unmatched|overdue|wrong|not found|problem|^no$|high|missing|over)/i.test(t))return'badT';if(/(part|look|check|on account|small difference|medium|pending|needs)/i.test(t))return'warnT';return null};
/* a sheet built row by row on a fixed grid */
function XS(name,w){this.name=name;this.w=w;this.n=w.length;this.rows=[];this.merges=[];this.heights={};this.tab='FF1F2A5C'}
XS.prototype={
  L(i){return colLetter(i)},
  push(cells,h){this.rows.push(cells);if(h)this.heights[this.rows.length]=h;return this.rows.length},
  band(v,s,h){const r=this.push([{v,s},...Array.from({length:this.n-1},()=>({v:'',s}))],h);this.merges.push('A'+r+':'+this.L(this.n-1)+r);return r},
  gap(h){this.push([],h||8)},
  title(t,sub,back){this.band(t,'title',34);const r=this.band(sub||'','sub',20);if(back){this.rows[r-1][this.n-1]={v:'Back to the summary',s:'link',f:`HYPERLINK("#'${back}'!A1","Back to the summary")`};this.merges.pop();this.merges.push('A'+r+':'+this.L(this.n-2)+r)}},
  section(t){this.gap(10);this.band(t,'h2',24)},
  para(t,s){const width=this.w.reduce((a,b)=>a+b,0);return this.band(t,s||'plain',Math.max(18,Math.ceil(String(t).length/(width*1.05))*15+6))},
  /* tiles: [{v, l, tone:'r'|'g'|'', text:bool}] each two columns wide */
  kpis(L){const per=Math.max(1,Math.floor(this.n/2));for(let i=0;i<L.length;i+=per){const part=L.slice(i,i+per),a=[],b=[];
      part.forEach((k,j)=>{const sv=(k.text?'kpiT':k.count?'kpiC':'kpiN')+(k.tone||''),cl=j*2;a[cl]={v:k.v,s:sv};a[cl+1]={v:'',s:sv};b[cl]={v:k.l,s:'kpiL'};b[cl+1]={v:'',s:'kpiL'}});
      const r1=this.push(a,36),r2=this.push(b,32);part.forEach((_,j)=>{const c1=this.L(j*2),c2=this.L(j*2+1);this.merges.push(c1+r1+':'+c2+r1,c1+r2+':'+c2+r2)});this.gap(6)}},
  /* a table on the grid: spans say how many grid columns each column takes */
  table(head,rows,spans,fmt){spans=spans||head.map(()=>1);const put=(vals,style,h)=>{const cells=[];let c=0;const ms=[];
      vals.forEach((v,i)=>{const st=typeof style==='function'?style(v,i):style;const o=v&&typeof v==='object'&&!Array.isArray(v)?{...v,s:v.s||st}:{v,s:st};cells[c]=o;for(let k=1;k<spans[i];k++)cells[c+k]={v:'',s:o.s};if(spans[i]>1)ms.push([c,c+spans[i]-1]);c+=spans[i]});
      const r=this.push(cells,h);for(const [a,b] of ms)this.merges.push(this.L(a)+r+':'+this.L(b)+r)};
    put(head,'head',30);
    for(const row of rows){const avg=this.w.reduce((a,b)=>a+b,0)/this.n,longest=Math.max(1,...row.map((v,i)=>{const t=String(v&&typeof v==='object'?v.v??'':v??'');return Math.ceil(t.length/(avg*spans[i]*1.05))}));
      const z=(this._z=(this._z||0)+1)%2===0,ZB={cell:'cellZ',num:'numZ',numI:'numIZ',cellBW:'cellBWZ',cellB:'cellBZ',numIB:'numIBZ'};
      put(row.map(v=>v&&typeof v==='object'&&!Array.isArray(v)&&z&&ZB[v.s]?{...v,s:ZB[v.s]}:v),(v,i)=>{const t=v&&typeof v==='object'?v.v:v;if(fmt&&fmt[i])return fmt[i](t);const st=typeof t==='number'?'num':'cell';return z?ZB[st]:st},Math.min(120,Math.max(18,longest*14+4)))}this._z=0},
  kv(k,v,s){const r=this.push([{v:k,s:'label'},{v,s:s||'cell'},...Array.from({length:this.n-2},()=>({v:'',s:s||'cell'}))],Math.max(18,Math.ceil(String(v).length/(this.w.slice(1).reduce((a,b)=>a+b,0)*1.05))*15+4));this.merges.push('B'+r+':'+this.L(this.n-1)+r)},
  out(){return{name:this.name,rows:this.rows,w:this.w,merges:this.merges,heights:this.heights,tab:this.tab,freeze:this.freeze,foot:XS.foot||''}}};
const W8=[15,15,15,15,15,15,15,15];
const bar=(v,max,n=20)=>v>0&&max>0?'█'.repeat(Math.max(1,Math.round(v/max*n))):'';
const ymdShort=d=>d?fmtD(d):'';

/* ---------- what each procedure found, as problems in plain words ---------- */
function procFacts(a,c,k){
  const d=pOpen(c),ps=pStatus(k,c,a),conc=d.conc?.[k]||{},facts={k,name:PR[k]?.n||k,ref:PR[k]?.ref||'',plain:PLAIN[k]||PR[k]?.why||'',st:ps.st,stText:String(ps.text||'').replace(/<[^>]+>/g,''),conc,kpis:[],problems:[],extra:[],money:null};
  if(k==='settle'&&d.settle){for(const side of ['S','P']){const r=settleCalc(d,side);if(!r||!r.bills.length)continue;const s=stSummary(r),AG=stAgeing(r),W=side==='S'?['Sales','customers','receipts','to receive']:['Purchases','suppliers','payments','to pay'];
      const tally=R2(r.bills.reduce((t,b)=>t+(b.t0>1?b.t0:0),0)),real=s.sumR(s.op),notReal=R2(r.bills.reduce((t,b)=>t+Math.max(0,b.t0-b.rem),0)),un=R2(s.pl.reduce((t,u)=>t+u.rem,0));
      facts.extra.push({side,r,s,AG,W,tally,real,notReal,un});
      for(const f of stFlags(r))facts.problems.push({r:f.r,t:(side==='S'?'Sales: ':'Purchases: ')+f.t,d:f.c,why:f.e,todo:f.rec,amt:flagAmt(r,f)})}
    facts.money=facts.extra.reduce((t,x)=>t+x.real,0)}
  if(k==='gst'||k==='tds'){const rd=rcOpen(c),keys=k==='gst'?['r1','r2','r3','r4']:['r5'];
    for(const rk of keys){let r=null;try{r=recon(rd,rk)}catch(e){}if(!r||r.state==='none'){facts.extra.push({rk,none:true});continue}
      const diff=rk==='r5'?r.short:r.diffTax;facts.extra.push({rk,r,diff});
      if(r.state==='bad')facts.problems.push({r:Math.abs(diff)>100000?'H':'M',t:`${RC[rk]}: ${rk==='r5'?'TDS not paid by the due date':'tax difference'} ${inr(Math.abs(diff))}`,d:RMEAN[rk]?.(r)||'',why:rk==='r5'?'Interest at 1.5% a month and possible disallowance of the expense.':'Possible tax demand, interest, or input tax credit that cannot be claimed.',todo:'See the detail sheet; explain each difference or correct the return or the books.',amt:Math.abs(diff)});
      for(const ch of (r.eng?.checks||[]).filter(x=>x.lv==='act').slice(0,8))facts.problems.push({r:'M',t:ch.t,d:ch.d,why:'',todo:'',amt:null})}
    facts.money=facts.extra.reduce((t,x)=>t+Math.abs(x.diff||0),0)}
  return facts}
function flagAmt(r,f){const S=x=>R2(x.reduce((t,v)=>t+v,0));switch(f.k){
  case'noref':return S(r.bills.map(b=>Math.max(0,b.t0-b.rem)));case'over':return S(r.over.map(o=>o.excess));case'mis':return S(r.mis.map(m=>m.u.rem));
  case'adv':return S(r.pool.filter(u=>r.ageOf(u)>90).map(u=>u.rem));case'old':return S(r.bills.filter(b=>b.rem>1&&r.ageOf(b)>180).map(b=>b.rem));case'misref':return S(r.bills.filter(b=>b.misref).map(b=>b.amt));
  case'else':return S((r.elsewhere||[]).map(x=>x.amt));case'near':return S(r.bills.filter(b=>b.diff).map(b=>Math.abs(b.diff)));case'open':return S(r.opening.map(o=>o.amt));default:return null}}
const sameT=(f,o)=>f===o||String(f).replace(/^(Sales|Purchases): /,'')===o;
const obsOfProc=(a,k,O)=>O.filter(o=>o.auditId===a.id&&(o.proc===k||(k==='chk'&&o.item!=null&&!o.proc)));
const evOfProc=(a,c,k)=>{const re=EVK[k];return[...auditEvidence(a),...S.evidence.filter(e=>e.clientId===c.id&&!e.auditId)].filter(e=>e.proc===k||(re&&re.test((e.purpose||'')+' '+e.name)))};
const toneFor=(f,obs)=>{if(f.st==='todo'&&!obs.length&&!f.problems.length)return'none';if(f.conc.st==='issue'||obs.some(o=>o.rating==='H')||f.problems.some(p=>p.r==='H'))return'bad';if(obs.length||f.problems.some(p=>p.r==='M'))return'warn';return f.st==='todo'?'none':'ok'};

/* ---------- the workbook ---------- */
function buildReport(audits,opt={}){
  audits=audits.filter(Boolean);const cl=[...new Set(audits.map(a=>a.clientId))].map(id=>S.clients.find(x=>x.id===id)).filter(Boolean);
  const O=obsOfReport(audits),per0=[...new Set(audits.map(a=>a.period).filter(Boolean))],sub=cl.map(c=>c.name).join(', ')+(per0.length?' · '+per0.join(', '):'')+' · prepared on '+fmtD(today());
  const SUM='1 Summary',HOWS='2 How to read',sheets=[],procs=[];let no=3;XS.foot=cl.map(c=>c.name).join(', ')+' · Internal audit report · '+fmtD(today());
  /* the procedures of these audits, once per client (procedures are kept per client and year), checklist per audit */
  const seen=new Set();for(const a of audits){const c=S.clients.find(x=>x.id===a.clientId);if(!c)continue;for(const k of (opt.only?[opt.only]:programmeOf(a))){const key=k==='chk'?a.id+k:c.id+k;if(seen.has(key))continue;seen.add(key);
    const f=procFacts(a,c,k),obs=obsOfProc(a,k,O),ev=evOfProc(a,c,k);procs.push({a,c,k,f,obs,ev,tone:toneFor(f,obs),sheet:(no++)+' '+shortName(k,a,audits.length>1)})}}
  /* 1 Summary */
  const s=new XS(SUM,W8);s.tab='FF17875A';s.title('Internal audit report',sub);
  const op=['Satisfactory','Needs improvement','Unsatisfactory'][Math.max(['Satisfactory','Needs improvement','Unsatisfactory'].indexOf(opinionOf(O)),procs.some(p=>p.tone==='bad')?2:procs.some(p=>p.tone==='warn')?1:0)],opTone=op==='Satisfactory'?'g':op==='Needs improvement'?'':'r';
  s.kpis([{v:op,l:'Overall opinion',tone:opTone==='g'?'g':opTone==='r'?'r':'',text:true},{v:procs.filter(p=>p.tone==='ok').length+' of '+procs.length,l:'Procedures all right',text:true},
    {v:procs.reduce((t,p)=>t+p.f.problems.filter(q=>q.r==='H').length,0)+O.filter(o=>o.rating==='H'&&o.status!=='Closed').length,l:'High-priority problems',count:true,tone:procs.some(p=>p.tone==='bad')?'r':'g'},{v:O.length,l:'Observations raised',count:true}]);
  s.para('How to read: each line below is one audit procedure. Green means all right, amber needs attention, red is a problem, grey is not done yet. Click "Open" to see the procedure: what we checked, what we found and what to do.','note');
  s.section('Every procedure at a glance');
  s.table(['Procedure','Result','Problems','Money involved (₹)','Main problem','Sheet'],procs.map(p=>{const main=[...p.f.problems,...p.obs.map(o=>({r:o.rating,t:o.title,amt:0}))].sort((x,y)=>('HML'.indexOf(x.r)-'HML'.indexOf(y.r))||((y.amt||0)-(x.amt||0)))[0];
      return[{v:p.f.name+(audits.length>1&&p.k==='chk'?' ('+p.a.title+')':''),s:'cellBW'},{v:TONE[p.tone][1],s:TONE[p.tone][0]},{v:String(p.f.problems.length+p.obs.length),s:'cell'},p.f.money!=null?{v:Math.round(p.f.money),s:'numI'}:'',{v:main?.t||(p.tone==='none'?'Not done yet':'Nothing found'),s:main?'cell':'note'},{v:'Open',s:'link',f:`HYPERLINK("#'${p.sheet}'!A1","Open")`}]}),[2,1,1,1,2,1]);
  s.section('Fix these first');
  const top=[...procs.flatMap(p=>[...p.f.problems.map(x=>({...x,proc:p.f.name})),...p.obs.filter(o=>!p.f.problems.some(q=>sameT(q.t,o.title))).map(o=>({r:o.rating,t:o.title,todo:o.rec,amt:null,proc:p.f.name}))]),...O.filter(o=>!procs.some(p=>p.obs.includes(o))).map(o=>({r:o.rating,t:o.title,todo:o.rec,amt:null,proc:'Other'}))]
    .filter(x=>x.r!=='L').sort((x,y)=>('HML'.indexOf(x.r)-'HML'.indexOf(y.r))||((y.amt||0)-(x.amt||0))).slice(0,15);
  if(top.length)s.table(['Priority','Problem','Money (₹)','What to do','Procedure'],top.map(x=>[{v:x.r==='H'?'High':'Medium',s:RTONE[x.r]},x.t,x.amt?{v:Math.round(x.amt),s:'numI'}:'',x.todo||'',x.proc]),[1,3,1,2,1]);
  else s.para('No high or medium problems were found.','okT');
  s.section('Engagement');s.kv('Client',cl.map(c=>c.name+(c.gstin?' (GSTIN '+c.gstin+')':'')).join('; '));s.kv('Audits covered',audits.map(a=>a.title+(a.period?' ('+a.period+')':'')).join('; '));
  s.kv('Standards','Standards on Internal Audit (SIA) issued by ICAI; report in the SIA 370 structure');s.kv('Prepared by',session?.user?.email||'');
  s.section('Sign-off');for(const k of ['Prepared by','Reviewed by','Date'])s.kv(k,'','in');
  sheets.push(s.out());
  /* 2 How to read */
  const h=new XS(HOWS,[26,70]);h.title('How to read this report','For the client, the accounts team and trainees',SUM);
  h.section('Colours');for(const [st,txt] of [['gS','All right: nothing to fix.'],['aS','Needs attention: something to look at or correct; no serious risk.'],['rS','Problem found: money, tax or control at risk. Fix first.'],['nS','Not done yet in this audit.']])h.push([{v:TONE[Object.keys(TONE).find(k=>TONE[k][0]===st)][1],s:st},{v:txt,s:'plain'}],20);
  h.section('Words used');for(const [t,x] of GLOSS)h.push([{v:t,s:'label'},{v:x,s:'plain'}],Math.max(18,Math.ceil(x.length/72)*15+4));
  sheets.push(h.out());
  /* one sheet per procedure, and its detail */
  for(const p of procs){sheets.push(procSheet(p,SUM,audits));for(const dsh of detailSheets(p,SUM))sheets.push(dsh)}
  /* findings, observations, discussion, documents, evidence */
  const DOCS=docsUsed(audits,cl,procs);
  sheets.push(findingsSheet(procs,O,SUM,DOCS),obsSheetX(O,audits,SUM,procs),discSheetX(O,audits,SUM,procs),docsSheet(DOCS,SUM),evSheetX(audits,cl,SUM));
  sheets.unshift(coverSheet(audits,cl,sub,sheets,procs,O));
  return sheets}
const shortName=(k,a,many)=>({chk:'Checklist',vouch:'Vouching',gst:'GST',tds:'TDS',brs:'Bank (BRS)',cash:'Cash',drs:'Customers (debtors)',crs:'Suppliers (creditors)',stock:'Stock',fav:'Fixed assets',comp:'Due dates',pay:'Payroll',as26:'Form 26AS',ar:'Analytical review',tests:'Data tests',settle:'Sales & purchases settled'}[k]||PR[k]?.n||k)+(many&&k==='chk'?' '+a.title.split(' ')[0]:'');
const GLOSS=[['Bill-wise (Tally)','Tally can keep each customer\'s and supplier\'s balance bill by bill. "New Ref" starts a new bill; "Agst Ref" (against reference) settles an existing bill; "Advance" is money before the bill; "On account" is money not linked to any bill.'],
  ['Really outstanding','What is still truly to be received or paid after matching every bill to its money, even where the books did not link them.'],
  ['Pending as per Tally','What Tally\'s bill-wise report shows as pending. It can be more than the real outstanding when money was booked on account instead of against the bill.'],
  ['Ageing','How old the unpaid bills are: 0–30 days, 31–60, 61–90, 91–180 and over 180 days. Older dues are riskier.'],
  ['GSTR-1','The return of sales filed on the GST portal.'],['GSTR-3B','The monthly GST return in which the tax is paid.'],['GSTR-2B','The statement of purchases that suppliers filed; it decides the input tax credit (ITC) that can be claimed.'],
  ['ITC','Input tax credit: the GST paid on purchases that can be set off against GST on sales.'],['TDS','Tax deducted at source from payments, to be paid to the government by the 7th of the next month.'],
  ['Form 26AS','The Income Tax statement of tax deducted by others (customers) on the company\'s income.'],['BRS','Bank reconciliation statement: the bank book matched with the bank statement.'],
  ['MSME (45 days)','Bills of micro and small suppliers must be paid within 45 days (MSMED Act); otherwise interest is payable and the expense is disallowed in tax (section 43B(h)).'],
  ['Observation','A finding the auditor reports to management, with what was found, what should be, why it matters and what to do.'],['Evidence','The files the auditor relied on: books, returns, statements, confirmations.']];

function procSheet(p,SUM,audits){const {a,c,k,f,obs,ev}=p,x=new XS(p.sheet,W8);x.tab=p.tone==='bad'?'FFC93A2E':p.tone==='warn'?'FFD39B00':p.tone==='ok'?'FF17875A':'FF8A93A8';
  x.title(f.name,c.name+(f.ref?' · '+f.ref:'')+' · '+a.title,SUM);
  x.section('What we checked');x.para(f.plain);
  x.section('Result at a glance');
  const tiles=[{v:TONE[p.tone][1],l:'Result',text:true,tone:p.tone==='bad'?'r':p.tone==='ok'?'g':''},{v:f.problems.length+obs.length,l:'Problems found',count:true,tone:f.problems.length+obs.length?'r':'g'}];
  if(k==='settle')for(const e of f.extra)tiles.push({v:Math.round(e.real),l:e.W[0]+': really '+e.W[3]+' (₹)',tone:e.real?'r':'g'});
  else if(f.money!=null)tiles.push({v:Math.round(f.money),l:'Money involved (₹)',tone:f.money?'r':'g'});
  tiles.push({v:ev.length,l:'Evidence files',count:true});x.kpis(tiles.slice(0,8));
  if(f.stText)x.para('Status: '+f.stText,'note');
  if(k==='settle')for(const e of f.extra)settleBlock(x,e);
  if(k==='gst'||k==='tds')gstBlock(x,f);
  if(k==='chk'){x.section('Steps and results');x.table(['#','Audit step','Result','Working note'],a.items.map((it,i)=>[i+1,it.q,{v:{ok:'Satisfactory',ex:'Exception',na:'Not applicable'}[it.r]||'Not tested',s:{ok:'okC',ex:'badC',na:'noneC'}[it.r]||'warnC'},it.n||'']),[1,4,1,2])}
  x.section('Problems found');
  if(f.problems.length)x.table(['Priority','Problem','Details','Money (₹)','What to do'],f.problems.map(q=>[{v:{H:'High',M:'Medium',L:'Low'}[q.r],s:RTONE[q.r]},q.t,q.d||'',q.amt?{v:Math.round(q.amt),s:'numI'}:'',q.todo||'']),[1,2,2,1,2]);
  else x.para(p.tone==='none'?'This procedure is not done yet.':'No problem found in this procedure.',p.tone==='none'?'note':'okT');
  x.section('Observations raised');
  if(obs.length)x.table(['Rating','Observation','What was found','What to do','Status'],obs.map(o=>[{v:{H:'High',M:'Medium',L:'Low'}[o.rating]||'',s:RTONE[o.rating]||'cell'},{v:o.title,s:'cellB'},o.condition||'',o.rec||'',{v:o.status||'',s:o.status==='Closed'?'okC':'warnC'}]),[1,2,2,2,1]);
  else x.para('No observation raised for this procedure.','note');
  x.section('Evidence on file');
  if(ev.length)x.table(['File','Purpose','Uploaded','By'],ev.map(e=>[e.name,e.purpose||'',(e.uploadedAt||'').slice(0,10),e.uploadedBy||'']),[3,2,1,2]);
  else x.para('No file is on record for this procedure.','note');
  x.section('Auditor\'s conclusion');x.kv('Conclusion',{ok:'Satisfactory',issue:'Needs action'}[f.conc.st]||'Not concluded yet',f.conc.st==='ok'?'okT':f.conc.st==='issue'?'badT':'warnT');if(f.conc.text)x.kv('Notes',f.conc.text);
  x.freeze={row:2};return x.out()}
function settleBlock(x,e){const {W,AG,r,s}=e;
  x.section(W[0]+' vs '+W[2]+': is the money really outstanding?');
  x.kpis([{v:s.B.length,l:W[0]+' bills',count:true},{v:Math.round(s.sum(s.B)),l:'Billed (₹)'},{v:Math.round(e.tally),l:'Pending as per Tally (₹)'},{v:Math.round(e.notReal),l:'Not real: money came, not adjusted in Tally (₹)',tone:'g'},{v:Math.round(e.real),l:'Really '+W[3]+' (₹)',tone:e.real?'r':'g'},{v:Math.round(e.un),l:W[2][0].toUpperCase()+W[2].slice(1)+' not matched to any bill (₹)',tone:e.un?'r':''}]);
  x.para(`Of ${inr(Math.round(e.tally))} that Tally shows as pending, ${inr(Math.round(e.notReal))} was in fact ${W[2]==='receipts'?'received':'paid'} but booked on account or without the bill, so it is not a real outstanding. What is really ${W[3]} is ${inr(Math.round(e.real))}.`,'panel');
  const B=['0–30 days','31–60 days','61–90 days','91–180 days','Over 180 days'],tot=[0,0,0,0,0];for(const p of Object.values(AG))p.age.forEach((v,i)=>{if(v>0)tot[i]+=v});const mx=Math.max(...tot);
  x.table(['How old','Amount (₹)','Share'],B.map((b,i)=>[b,{v:Math.round(tot[i]),s:'numI'},{v:bar(tot[i],mx),s:i>=3?'barR':'bar'}]),[1,2,5]);
  const T=Object.entries(AG).sort((p,q)=>q[1].net-p[1].net).filter(([,p])=>p.net>1).slice(0,12);
  if(T.length){x.para('Who owes the most (really outstanding):','label');x.table([W[1]==='customers'?'Customer':'Supplier','Pending as per Tally (₹)','Not real (₹)','Really outstanding (₹)','Over 180 days (₹)'],T.map(([n,p])=>[{v:n,s:'cellBW'},{v:Math.round(p.tally),s:'numI'},{v:Math.round(p.notReal),s:'numI'},{v:Math.round(p.net),s:'numIB'},{v:Math.round(Math.max(0,p.age[4])),s:p.age[4]>1?'numIR':'numI'}]),[3,1,1,2,1])}}
function gstBlock(x,f){x.section('Each comparison');
  x.table(['Comparison','Result','Difference (₹)','What it means'],f.extra.map(e=>e.none?[RC[e.rk],{v:'No data yet',s:'noneC'},'','Add the books and the returns for these months.']:[RC[e.rk],{v:e.r.state==='bad'?'Difference':'Agrees',s:e.r.state==='bad'?'badC':'okC'},{v:Math.round(Math.abs(e.diff||0)),s:'numI'},RMEAN[e.rk]?.(e.r)||'']),[3,1,1,3]);
  const r2=f.extra.find(e=>e.rk==='r2'&&e.r?.eng);if(r2){const St=r2.r.eng.S.inv;x.para('Input tax credit statement (it always closes to zero: A − B = D − E):','label');
    x.table(['','IGST','CGST','SGST','Cess'],[['A','GSTR-2B'],['B','Books'],['C','A − B'],['D','In GSTR-2B, not in books'],['E','In books, not in GSTR-2B'],['F','D − E'],['G','C − F (closes to 0)']].map(([q,l])=>[{v:q+'  '+l,s:q==='G'?'cellB':'cell'},...['i','c','s','x'].map(hh=>({v:St[q][hh],s:q==='G'?'numB':'num'}))]),[4,1,1,1,1])}}
function detailSheets(p,SUM){const {a,c,k}=p;let L=[];try{L=k==='settle'?[...stSheets(pOpen(c),'S'),...stSheets(pOpen(c),'P')].filter(x=>!/findings/i.test(x[0])):k==='chk'?[]:procSheets(a,c,k)}catch(e){L=[]}
  return L.filter(x=>x[1]&&x[1].length>1).map(([n,rows],i)=>{const sh=styleSheet(p.sheet.split(' ')[0]+'.'+(i+1)+' '+n.replace(/^(GST|TDS|Vouching|Debtors|Creditors) – /,''),rows,p.c.name+' · detail of "'+p.f.name+'"');
    /* colour the status columns; back link */
    for(const row of sh.rows.slice(4))row.forEach((cell,j)=>{if(cell&&(cell.s==='cell'||cell.s==='cellZ')&&typeof cell.v==='string'){const t=toneOf(cell.v);if(t&&cell.v.length<70)cell.s=t}});
    sh.rows[1][sh.rows[1].length-1]={v:'Back to the summary',s:'link',f:`HYPERLINK("#'${SUM}'!A1","Back to the summary")`};sh.merges=sh.merges.map(m=>m.startsWith('A2:')?'A2:'+colLetter(Math.max(0,sh.rows[3].length-2))+'2':m);sh.tab='FFB8C2E0';return sh})}
function obsSheetX(O,audits,SUM,procs){const x=new XS('Observations',[8,30,12,12,40,34,40,40,30,16,12,10]);x.title('Observations','Every observation, highest first: what was found, what should be, why it matters, what to do and management\'s response',SUM);
  x.table(['#','Observation','Rating','Status','What was found (condition)','What should be (criteria)','Why it matters (effect)','What to do (recommendation)','Management\'s response','Owner','Target date','Procedure'],
    O.map((o,i)=>[i+1,{v:o.title,s:'cellB'},{v:{H:'High',M:'Medium',L:'Low'}[o.rating]||'',s:RTONE[o.rating]||'cell'},{v:o.status||'',s:o.status==='Closed'?'okC':'warnC'},o.condition||'',o.criteria||'',o.effect||'',o.rec||'',o.response||'',o.owner||'',o.due||'',procs.find(p=>p.obs.includes(o))?.f.name||(o.auditId?'Audit':'Client level (visit)')]));
  if(!O.length)x.para('No observations.','note');x.freeze={row:4};return x.out()}
function discSheetX(O,audits,SUM,procs){const x=new XS('For discussion',[6,22,60,10,40,34,34,16,12]);x.title('Points for discussion with management','Type management\'s view and the decision in the yellow cells',SUM);
  const L=[];for(const o of O.filter(o=>o.status!=='Closed'&&o.rating!=='L'))L.push(['Observation',o.title+(o.condition?': '+o.condition.slice(0,300):''),{H:'High',M:'Medium'}[o.rating],o.rec||'',o.response||'',o.owner||'',o.due||'']);
  for(const p of procs){if(p.tone==='none')L.push([p.f.name,'Not done yet: '+(p.f.stText||''),'','Complete before the audit is reported','','',''])
    for(const q of p.f.problems.filter(q=>q.r!=='L'&&!O.some(o=>sameT(q.t,o.title))))L.push([p.f.name,q.t+(q.d?': '+String(q.d).slice(0,300):''),{H:'High',M:'Medium'}[q.r],q.todo||'','','',''])}
  for(const a of audits)for(const r of openNotes(a))L.push(['Review note',r.text||r.note||'','','Clear the note','',r.by||'','']);
  x.table(['#','Area','Point for discussion','Priority','Our recommendation','Management\'s view','Decision / action agreed','Owner','Target date'],L.map((r,i)=>[i+1,r[0],r[1],{v:r[2]||'',s:r[2]==='High'?'badC':r[2]==='Medium'?'warnC':'cell'},r[3],{v:r[4],s:'in'},{v:'',s:'in'},{v:r[5],s:'in'},{v:r[6],s:'in'}]));
  if(!L.length)x.para('Nothing to discuss.','note');x.freeze={row:4};return x.out()}
function evSheetX(audits,cl,SUM){const x=new XS('Evidence annex',[30,40,30,40,12,10,24,12,40]);x.title('Evidence annex','Every file on record, with its integrity hash (SHA-256)',SUM);
  const L=[];for(const a of audits)for(const e of auditEvidence(a))L.push([a.title,e.name,e.purpose||'',e.item!=null?'Step '+(+e.item+1)+': '+(a.items[e.item]?.q||''):'',e.type||'',Math.round((e.size||0)/1024),e.uploadedBy||'',(e.uploadedAt||'').slice(0,10),e.sha256||'']);
  for(const c of cl)for(const e of S.evidence.filter(z=>z.clientId===c.id&&!z.auditId))L.push(['(client file) '+c.name,e.name,e.purpose||'','',e.type||'',Math.round((e.size||0)/1024),e.uploadedBy||'',(e.uploadedAt||'').slice(0,10),e.sha256||'']);
  x.table(['Audit','File','Purpose','Checklist step','Type','Size (KB)','Uploaded by','Uploaded on','SHA-256'],L);if(!L.length)x.para('No files on record.','note');x.freeze={row:4};return x.out()}

/* the report is what every audit Excel gives */
auditReportSheets=function(audits,title){return buildReport(audits).map(sh=>[sh.name,null,{styled:sh}])};
ACT.xProc=async t=>{const a=A(),c=C(),k=t.dataset.v;toast('Preparing Excel…');await xlsxSave(buildReport([a],{only:k}).map(sh=>[sh.name,null,{styled:sh}]),(PR[k]?.n||k)+' - '+c.name+' - '+(a.period||a.title))};
/* observations and evidence remember the procedure they came from */
const _newObsR=newObs;newObs=function(pre={}){if(pre.proc==null&&ui.view==='audit'){if(ui.atab==='proc')pre={...pre,proc:PK.includes(ui.ptab)?ui.ptab:programmeOf(A())[0]};else if(ui.atab==='checklist')pre={...pre,proc:'chk'}}return _newObsR(pre)};

/* ---------- cover and contents ---------- */
function coverSheet(audits,cl,sub,sheets,procs,O){const x=new XS('Cover',[4,26,26,26,26,26,4]);x.tab='FF102347';
  const band=(v,s,h)=>{const i=x.push([{v:'',s:'cover'},{v,s},...Array.from({length:4},()=>({v:'',s})),{v:'',s:'cover'}],h);x.merges.push('B'+i+':F'+i)};
  for(const h of [24,18])band('','cover',h);band('Internal Audit Report','cover',44);band(cl.map(c=>c.name).join(', '),'coverS',26);
  band([...new Set(audits.map(a=>a.period).filter(Boolean))].join(', ')||'',' coverS'.trim(),20);for(const h of [18,24])band('','cover',h);
  x.gap(14);const kv=(k,v)=>{const i=x.push(['',{v:k,s:'coverL'},{v,s:'coverV'},{v:'',s:'coverV'},{v:'',s:'coverV'},{v:'',s:'coverV'}],Math.max(20,Math.ceil(String(v).length/100)*15+6));x.merges.push('C'+i+':F'+i)};
  kv('Client',cl.map(c=>c.name+(c.gstin?' · GSTIN '+c.gstin:'')).join('; '));kv('Audits covered',audits.map(a=>a.title).join('; '));kv('Period',[...new Set(audits.map(a=>a.period).filter(Boolean))].join(', '));
  kv('Prepared by',session?.user?.email||'');kv('Date of report',fmtD(today()));kv('Basis','Standards on Internal Audit (SIA) issued by ICAI; report in the SIA 370 structure. Figures are from the client\'s books and the government portals as listed in "Documents used".');
  const op=['Satisfactory','Needs improvement','Unsatisfactory'][Math.max(['Satisfactory','Needs improvement','Unsatisfactory'].indexOf(opinionOf(O)),procs.some(p=>p.tone==='bad')?2:procs.some(p=>p.tone==='warn')?1:0)];
  { const i=x.push(['',{v:'Overall opinion',s:'coverL'},{v:op,s:op==='Satisfactory'?'gS':op==='Needs improvement'?'aS':'rS'},{v:'',s:op==='Satisfactory'?'gS':op==='Needs improvement'?'aS':'rS'}],26);x.merges.push('C'+i+':D'+i)}
  x.gap(16);{const i=x.push(['',{v:'Contents',s:'h2'}],26)}
  const desc=n=>n==='1 Summary'?'The opinion, every procedure at a glance, and what to fix first':n==='2 How to read'?'Colours and the words used, for readers new to audit':n==='Findings'?'Every finding, numbered, with the money involved and what to do':n==='Observations'?'Observations reported to management, with their responses':n==='For discussion'?'Points to agree with management (yellow cells to fill)':n==='Documents used'?'Every document and data source the audit relied on':n==='Evidence annex'?'The files on record, with their integrity hash':/^\d+\.\d+ /.test(n)?'Detail: '+n.replace(/^\d+\.\d+ /,''):'Procedure: '+(procs.find(p=>p.sheet===n)?.f.plain||'');
  for(const s of sheets){if(/^\d+\.\d+ /.test(s.name))continue;const i=x.push(['',{v:s.name,s:'link',f:`HYPERLINK("#'${s.name}'!A1","${s.name.replace(/"/g,'')}")`},{v:desc(s.name),s:'plain'},{v:'',s:'plain'},{v:'',s:'plain'},{v:'',s:'plain'}],Math.max(18,Math.ceil(desc(s.name).length/100)*15+4));x.merges.push('C'+i+':F'+i)}
  return x.out()}
/* ---------- the findings register ---------- */
function findingsSheet(procs,O,SUM,DOCS){const x=new XS('Findings',[8,22,10,40,50,14,40,40,16,14]);x.title('Findings register','Every finding from every procedure, highest first. "Documents" refers to the sheet "Documents used".',SUM);
  const L=[];let n=0;for(const p of procs){const docs=DOCS.filter(d=>d.used.includes(p.f.name)).map(d=>d.id).join(', ');
    for(const q of p.f.problems)L.push([q.r,p.f.name,q.t,String(q.d||'').length>360?String(q.d).slice(0,360)+'… (all of it on the procedure\'s sheet)':q.d||'',q.amt,q.why||'',q.todo||'',docs,O.some(o=>sameT(q.t,o.title))?'Raised':'Not raised'])}
  L.sort((a,b)=>('HML'.indexOf(a[0])-'HML'.indexOf(b[0]))||((b[4]||0)-(a[4]||0)));
  x.table(['ID','Procedure','Priority','Finding','Details','Money (₹)','Why it matters','What to do','Documents','Observation'],L.map(r=>[{v:'F-'+String(++n).padStart(2,'0'),s:'cellB'},r[1],{v:{H:'High',M:'Medium',L:'Low'}[r[0]],s:RTONE[r[0]]},{v:r[2],s:'cellBW'},r[3],r[4]?{v:Math.round(r[4]),s:'numI'}:'',r[5],r[6],r[7],{v:r[8],s:r[8]==='Raised'?'okC':'noneC'}]));
  if(!L.length)x.para('No findings.','okT');x.freeze={row:3};return x.out()}
/* ---------- documents used ---------- */
function docsUsed(audits,cl,procs){const D=[];let n=0;const add=(o)=>D.push({id:'D-'+String(++n).padStart(2,'0'),...o});
  for(const c of cl){const d=pOpen(c),rd=rcOpen(c),pn=k=>PR[k]?.n||k;
    if(d.settle)add({doc:d.settle.file,type:'Tally Day Book (XML, with bill-wise details)',period:fmtD(d.settle.from)+' to '+fmtD(d.settle.to),records:`${(d.settle.stats?.vouchers||0).toLocaleString('en-IN')} vouchers read; ${d.settle.P.length.toLocaleString('en-IN')} party entries${d.settle.stats?.skipped?'; not accounting and left out: '+Object.entries(d.settle.stats.skipped).map(([k,v])=>v+' '+k).join(', '):''}`,used:[pn('settle'),pn('drs'),pn('crs')].join('; '),src:'Uploaded',at:(d.settle.at||'').slice(0,10)});
    if(d.led)add({doc:d.led.file,type:'Tally books (ledgers)',period:'',records:Object.keys(d.led.L||d.led.ledgers||{}).length?Object.keys(d.led.L||d.led.ledgers).length+' ledgers':'',used:[pn('brs'),pn('cash'),pn('drs'),pn('crs')].join('; '),src:'Uploaded',at:(d.led.at||'').slice(0,10)});
    for(const [key,lab] of [['bS','Sales books'],['bP','Purchase books']])if(rd[key]?.months){const m=Object.keys(rd[key].months).sort();if(m.length)add({doc:rd[key].file||lab,type:lab+' (from Tally)',period:mLabel(m[0])+' to '+mLabel(m[m.length-1]),records:m.reduce((t,k)=>t+(rd[key].months[k].n||rd[key].months[k].inv?.length||0),0)+' entries',used:pn('gst'),src:'Uploaded',at:(rd[key].at||'').slice(0,10)})}
    for(const [key,lab] of [['g1','GSTR-1'],['g2b','GSTR-2B'],['g3b','GSTR-3B']]){const m=Object.keys(rd[key]||{}).sort();if(m.length)add({doc:lab+' '+m.map(mLabel).join(', '),type:lab+' (GST portal)',period:mLabel(m[0])+' to '+mLabel(m[m.length-1]),records:m.length+' month'+(m.length===1?'':'s'),used:pn('gst'),src:(rd.handoffs||[]).length?'GST portal via 1Go':'GST portal',at:''})}
    if(rd.chl?.rows?.length)add({doc:'TDS challans',type:'Challans (Income Tax portal)',period:'',records:rd.chl.rows.length+' challans',used:pn('tds'),src:(rd.handoffs||[]).length?'Income Tax portal via 1Go':'Uploaded',at:''});
    if(rd.tB?.file)add({doc:rd.tB.file,type:'TDS entries from the books',period:'',records:(rd.tB.rows||[]).length+' entries',used:pn('tds'),src:'Uploaded',at:(rd.tB.at||'').slice(0,10)});
    for(const e of S.evidence.filter(z=>z.clientId===c.id&&(!z.auditId||audits.some(a=>a.id===z.auditId)))){if(D.some(x=>x.doc===e.name))continue;const p=procs.find(p=>p.ev.includes(e));
      add({doc:e.name,type:e.purpose||e.type||'File',period:'',records:Math.round((e.size||0)/1024)+' KB',used:p?p.f.name:(e.item!=null?'Checklist step '+(+e.item+1):''),src:'Uploaded by '+(e.uploadedBy||''),at:(e.uploadedAt||'').slice(0,10),hash:e.sha256||''})}}
  return D}
function docsSheet(D,SUM){const x=new XS('Documents used',[8,40,34,24,46,40,22,12,20]);x.title('Documents used','Every document and data source the audit relied on: what it is, the period it covers, what was read from it and where it was used',SUM);
  x.table(['ID','Document','What it is','Period covered','What was read','Used in','Source','Received','Integrity (SHA-256)'],D.map(d=>[{v:d.id,s:'cellB'},{v:d.doc,s:'cellBW'},d.type,d.period,d.records,d.used,d.src,d.at,(d.hash||'').slice(0,16)]));
  if(!D.length)x.para('No documents on record.','note');x.freeze={row:3};return x.out()}
