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
  if(k==='chk'){/* a checklist exception is a failed control: it must show as a problem, not vanish into an "all right" tone */
    const ex=a.items.filter(it=>it.r==='ex');
    for(const it of ex)facts.problems.push({r:'M',t:it.q,d:it.n||'',why:'A checklist step that did not pass is a control that did not work.',todo:'Raise an observation, fix it and re-test before reporting.',amt:null});
    if(ex.length>3)facts.problems.push({r:'H',t:ex.length+' of '+(a.items.length)+' checklist steps did not pass',d:'',why:'More than half the steps in this procedure failed.',todo:'Repeat the whole procedure; find the root cause.',amt:null})}
  return facts}
function flagAmt(r,f){const S=x=>R2(x.reduce((t,v)=>t+v,0));switch(f.k){
  case'noref':return S(r.bills.map(b=>Math.max(0,b.t0-b.rem)));case'over':return S(r.over.map(o=>o.excess));case'mis':return S(r.mis.map(m=>m.u.rem));
  case'after':return R2(r.after?.amt||0);case'tdsfull':return R2(r.pool.filter(u=>u.rem>1&&/\btds\b/i.test((u.oth||'')+' '+(u.vno||'')+' '+(u.nar||''))).reduce((t,u)=>t+u.rem,0));case'nontrade':return null;
  case'adv':return S(r.pool.filter(u=>r.ageOf(u)>90).map(u=>u.rem));case'old':return S(r.bills.filter(b=>b.rem>1&&r.ageOf(b)>180).map(b=>b.rem));case'misref':return S(r.bills.filter(b=>b.misref&&(!r.pStart||b.d>=r.pStart)).map(b=>b.amt));
  case'else':return S((r.elsewhere||[]).map(x=>x.amt));case'near':return S(r.bills.filter(b=>b.diff).map(b=>Math.abs(b.diff)));case'open':return S(r.opening.map(o=>o.amt));default:return null}}
const sameT=(f,o)=>f===o||String(f).replace(/^(Sales|Purchases): /,'')===o;
const obsOfProc=(a,k,O)=>O.filter(o=>o.auditId===a.id&&(o.proc===k||(k==='chk'&&o.item!=null&&!o.proc)));
const evOfProc=(a,c,k)=>{const re=EVK[k];return[...auditEvidence(a),...S.evidence.filter(e=>e.clientId===c.id&&!e.auditId)].filter(e=>e.proc===k||(re&&re.test((e.purpose||'')+' '+e.name)))};
const toneFor=(f,obs)=>{if(f.st==='todo'&&!obs.length&&!f.problems.length)return'none';if(f.conc.st==='issue'||obs.some(o=>o.rating==='H')||f.problems.some(p=>p.r==='H'))return'bad';if(obs.length||f.problems.some(p=>p.r==='M'))return'warn';return f.st==='todo'?'none':'ok'};

/* ---------- the workbook ---------- */
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

/* the report is what every audit Excel gives */
auditReportSheets=function(audits,title){return buildReport(audits).map(sh=>[sh.name,null,{styled:sh}])};
ACT.xProc=async t=>{const a=A(),c=C(),k=t.dataset.v;toast('Preparing Excel…');await xlsxSave(buildReport([a],{only:k}).map(sh=>[sh.name,null,{styled:sh}]),(PR[k]?.n||k)+' - '+c.name+' - '+(a.period||a.title))};
/* observations and evidence remember the procedure they came from */
const _newObsR=newObs;newObs=function(pre={}){if(pre.proc==null&&ui.view==='audit'){if(ui.atab==='proc')pre={...pre,proc:PK.includes(ui.ptab)?ui.ptab:programmeOf(A())[0]};else if(ui.atab==='checklist')pre={...pre,proc:'chk'}}return _newObsR(pre)};

/* ---------- cover and contents ---------- */
/* ---------- the findings register ---------- */
/* ---------- documents used ---------- */
function docsUsed(audits,cl,procs){const D=[];let n=0;const add=(o)=>D.push({id:'D-'+String(++n).padStart(2,'0'),...o});
  for(const c of cl){const d=pOpen(c),rd=rcOpen(c),pn=k=>PR[k]?.n||k;
    if(d.settle)add({doc:d.settle.file,type:'Tally Day Book (XML, with bill-wise details)',period:fmtD(d.settle.from)+' to '+fmtD(d.settle.to),records:`${(d.settle.stats?.vouchers||0).toLocaleString('en-IN')} vouchers read; ${d.settle.P.length.toLocaleString('en-IN')} party entries${d.settle.stats?.skipped?'; not accounting and left out: '+Object.entries(d.settle.stats.skipped).map(([k,v])=>v+' '+k).join(', '):''}`,used:[pn('settle'),pn('drs'),pn('crs')].join('; '),src:'Uploaded',at:(d.settle.at||'').slice(0,10)});
    if(d.led)add({doc:d.led.file,type:'Tally books (ledgers)',period:'',records:Object.keys(d.led.L||d.led.ledgers||{}).length?Object.keys(d.led.L||d.led.ledgers).length+' ledgers':'',used:[pn('brs'),pn('cash'),pn('drs'),pn('crs')].join('; '),src:'Uploaded',at:(d.led.at||'').slice(0,10)});
    for(const [key,lab] of [['bS','Sales books'],['bP','Purchase books']])if(rd[key]?.months){const m=Object.keys(rd[key].months).sort();if(m.length)add({doc:rd[key].file||lab,type:lab+' (from Tally)',period:mLabel(m[0])+' to '+mLabel(m[m.length-1]),records:m.reduce((t,k)=>t+(rd[key].months[k].n||rd[key].months[k].inv?.length||0),0)+' entries',used:pn('gst'),src:'Uploaded',at:(rd[key].at||'').slice(0,10)})}
    for(const [key,lab] of [['g1','GSTR-1'],['g2b','GSTR-2B'],['g3b','GSTR-3B']]){const m=Object.keys(rd[key]||{}).sort();if(m.length)add({doc:lab+' '+m.map(mLabel).join(', '),type:lab+' (GST portal)',period:mLabel(m[0])+' to '+mLabel(m[m.length-1]),records:m.length+' month'+(m.length===1?'':'s'),used:pn('gst'),src:'GST portal',at:''})}
    if(rd.chl?.rows?.length)add({doc:'TDS challans',type:'Challans (Income Tax portal)',period:'',records:rd.chl.rows.length+' challans',used:pn('tds'),src:'Uploaded',at:''});
    if(rd.tB?.file)add({doc:rd.tB.file,type:'TDS entries from the books',period:'',records:(rd.tB.rows||[]).length+' entries',used:pn('tds'),src:'Uploaded',at:(rd.tB.at||'').slice(0,10)});
    for(const e of S.evidence.filter(z=>z.clientId===c.id&&(!z.auditId||audits.some(a=>a.id===z.auditId)))){if(D.some(x=>x.doc===e.name))continue;const p=procs.find(p=>p.ev.includes(e));
      add({doc:e.name,type:e.purpose||e.type||'File',period:'',records:Math.round((e.size||0)/1024)+' KB',used:p?p.f.name:(e.item!=null?'Checklist step '+(+e.item+1):''),src:'Uploaded by '+(e.uploadedBy||''),at:(e.uploadedAt||'').slice(0,10),hash:e.sha256||''})}}
  return D}
/* ===================== layout (25 Nov 2026, second pass) =====================
   Rules, as large firms keep them: no merged cells in a table (only narrative paragraphs are merged across the page width);
   navy table headers, white bold, with a filter; banded rows; amounts right-aligned in Indian format; text left; dates are dates;
   colour only for status and priority; the same grid on every report sheet: A margin · B to H content; print: landscape, fit to width. */
const GRID=[2,11,36,18,44,18,36,16];   // A margin · B priority/# · C name · D result or amount · E text · F short · G text · H short
const PRI={H:['High','badC'],M:['Medium','warnC'],L:['Low','okC']};
function RS(name,w){this.name=name;this.w=w||GRID;this.n=this.w.length;this.rows=[];this.merges=[];this.heights={};this.tab='FF1F2A5C';this.freeze=null;this.filter=null}
RS.prototype={
  col(i){return colLetter(i)},
  push(cells,h){this.rows.push(cells);if(h)this.heights[this.rows.length]=h;return this.rows.length},
  gap(h){this.push([],h||10)},
  fill(v,s,h,from=1){const c=[];c[from]={v,s};for(let j=from+1;j<this.n;j++)c[j]={v:'',s};return this.push(c,h)},
  title(t,sub,back){this.gap(8);this.fill(t,'title',32);const r=this.fill(sub||'','sub',20);if(back)this.rows[r-1][this.n-1]={v:'‹ Summary',s:'link',f:`HYPERLINK("#'${back}'!A1","‹ Summary")`};this.gap(6)},
  section(t){this.gap(12);this.fill(t,'sect',24)},
  para(t,s){const r=this.push([,{v:t,s:s||'plain'},...Array.from({length:this.n-2},()=>({v:'',s:s||'plain'}))]);this.merges.push('B'+r+':'+this.col(this.n-1)+r);
    const width=this.w.slice(1).reduce((a,b)=>a+b,0);this.heights[r]=Math.max(18,Math.ceil(String(t).length/(width*1.1))*15+6);return r},
  /* a table: cols = [{h, at:'B'..'H', k:'t'|'n'|'n2'|'d'|'c'|'b'}]; rows = arrays of values (or {v,s}) in the order of cols */
  table(cols,rows,o={}){const idx=c=>c.at.charCodeAt(0)-65,hr=[];for(const c of cols)hr[idx(c)]={v:c.h,s:'thead'};const h0=this.push(hr,30);
    rows.forEach((row,ri)=>{const z=ri%2===1,cells=[];let lines=1;
      cols.forEach((c,j)=>{let v=row[j],s=null;if(v&&typeof v==='object'&&!Array.isArray(v)){s=v.s;v=v.v}
        if(s==null){const k=c.k||(typeof v==='number'?'n':'t');s=k==='n'?'n0':k==='n2'?'n2':k==='d'?'dt':k==='c'?'tdC':k==='b'?'tdB':'td';if(z&&!/^(n0B)$/.test(s))s=s+'Z'}
        const cell={v:v??'',s};if((c.k==='d'||s.startsWith('dt'))&&/^\d{4}-\d{2}-\d{2}$/.test(String(v))){cell.v=String(v).slice(8,10)+'-'+String(v).slice(5,7)+'-'+String(v).slice(0,4);cell.date=true}
        if(row[j]&&typeof row[j]==='object'&&row[j].f)cell.f=row[j].f;cells[idx(c)]=cell;
        if(typeof v==='string')lines=Math.max(lines,Math.ceil(v.length/Math.max(6,this.w[idx(c)]*1.05)))});
      this.push(cells,Math.min(140,Math.max(18,lines*14+4)))});
    if(o.filter&&rows.length){const a=cols.map(idx),r1=h0,r2=h0+rows.length;this.filter=this.col(Math.min(...a))+r1+':'+this.col(Math.max(...a))+r2}
    if(o.freeze)this.freeze={row:h0};return h0},
  /* label and value pairs (key figures, engagement details): no merge needed, value in its own column */
  pairs(L,cols){const at=cols||{l:'C',v:'D',x:'E'};this.table([{h:'Item',at:at.l,k:'b'},{h:'Value',at:at.x?at.x:at.v,k:'n'},...(at.x?[{h:'What it means',at:at.v}]:[])],L.map(p=>at.x?[p[0],p[1],p[2]||'']:[p[0],p[1]]))},
  out(){return{name:this.name,rows:this.rows,w:this.w,merges:this.merges,heights:this.heights,tab:this.tab,freeze:this.freeze,filter:this.filter,foot:XS_FOOT}}};
let XS_FOOT='';
const chip=(t,s)=>({v:t,s});
const linkTo=(sheet,text)=>({v:text,s:'link',f:`HYPERLINK("#'${sheet}'!A1","${String(text).replace(/"/g,'')}")`});
const opinionAll=(O,procs)=>['Satisfactory','Needs improvement','Unsatisfactory'][Math.max(['Satisfactory','Needs improvement','Unsatisfactory'].indexOf(opinionOf(O)),procs.some(p=>p.tone==='bad')?2:procs.some(p=>p.tone==='warn')?1:0)];
const opStyle=op=>op==='Satisfactory'?'okC':op==='Needs improvement'?'warnC':'badC';

/* every figure of an audit is taken on that audit's own date (its month, or today): the audit is set while its parts are built */
const _withAudit=(a,f)=>{const k=typeof ST_AUDIT!=='undefined'?ST_AUDIT:null;try{ST_AUDIT=a;return f()}finally{ST_AUDIT=k}};
function buildReport(audits,opt={}){
  audits=audits.filter(Boolean);const cl=[...new Set(audits.map(a=>a.clientId))].map(id=>S.clients.find(x=>x.id===id)).filter(Boolean);
  const O=obsOfReport(audits),per0=[...new Set(audits.map(a=>a.period).filter(Boolean))],sub=cl.map(c=>c.name).join(', ')+(per0.length?'  ·  '+per0.join(', '):'')+'  ·  '+fmtD(today());
  XS_FOOT=cl.map(c=>c.name).join(', ')+' · Internal audit report · '+fmtD(today());
  const SUM='1 Summary',sheets=[],procs=[];let no=3;
  const seen=new Set();for(const a of audits){const c=S.clients.find(x=>x.id===a.clientId);if(!c)continue;for(const k of (opt.only?[opt.only]:programmeOf(a))){const key=k==='chk'?a.id+k:c.id+k;if(seen.has(key))continue;seen.add(key);
    const f=_withAudit(a,()=>procFacts(a,c,k)),obs=obsOfProc(a,k,O),ev=evOfProc(a,c,k);if(f.money==null)f.money=0;f.money+=obs.reduce((t,o)=>t+(+o.amount||0),0);procs.push({a,c,k,f,obs,ev,tone:toneFor(f,obs),sheet:(no++)+' '+shortName(k,a,audits.length>1)})}}
  const op=opinionAll(O,procs);
  /* 1 Summary */
  const s=new RS(SUM);s.tab='FF17875A';s.title('Internal audit report: summary',sub);
  s.section('Overall result');
  const hi=procs.reduce((t,p)=>t+p.f.problems.filter(q=>q.r==='H').length,0)+O.filter(o=>o.rating==='H'&&o.status!=='Closed').length;
  s.table([{h:'Item',at:'C',k:'b'},{h:'Result',at:'D',k:'c'},{h:'What it means',at:'E'}],[
    ['Overall opinion',chip(op,opStyle(op)),op==='Satisfactory'?'Controls work; nothing serious to fix.':op==='Needs improvement'?'Some controls need correcting; no serious loss found.':'Serious problems: money, tax or controls at risk. Act on the items below first.'],
    ['Procedures all right',chip(procs.filter(p=>p.tone==='ok').length+' of '+procs.length,'tdC'),'Procedures with nothing to fix.'],
    ['High-priority problems',chip(String(hi),hi?'badC':'okC'),'Problems to fix first.'],
    ['Observations raised',chip(String(O.length),'tdC'),'Reported to management in the sheet "Observations".']]);
  s.section('Every procedure at a glance');
  s.para('Green: all right · Amber: needs attention · Red: problem found · Grey: not done yet. Click a procedure to open its sheet.','note');
  s.table([{h:'Procedure',at:'C'},{h:'Result',at:'D',k:'c'},{h:'Main problem',at:'E'},{h:'Problems',at:'F',k:'n'},{h:'Money involved (₹)',at:'G',k:'n'},{h:'Sheet',at:'H'}],procs.map(p=>{
      const main=[...p.f.problems,...p.obs.map(o=>({r:o.rating,t:o.title,amt:0}))].sort((x,y)=>('HML'.indexOf(x.r)-'HML'.indexOf(y.r))||((y.amt||0)-(x.amt||0)))[0];
      return[{v:p.f.name+(audits.length>1&&p.k==='chk'?' ('+p.a.title+')':''),s:'tdB'},chip(TONE[p.tone][1],{ok:'okC',warn:'warnC',bad:'badC',none:'noneC'}[p.tone]),main?.t||(p.tone==='none'?'Not done yet':'Nothing found'),p.f.problems.length+p.obs.length,p.f.money!=null?Math.round(p.f.money):'',linkTo(p.sheet,'Open')]}),{filter:true});
  s.section('Fix these first');
  const top=[...procs.flatMap(p=>[...p.f.problems.map(x=>({...x,proc:p.f.name,sheet:p.sheet})),...p.obs.filter(o=>!p.f.problems.some(q=>sameT(q.t,o.title))).map(o=>({r:o.rating,t:o.title,todo:o.rec,amt:+o.amount||0,proc:p.f.name,sheet:p.sheet}))]),
    ...O.filter(o=>!procs.some(p=>p.obs.includes(o))).map(o=>({r:o.rating,t:o.title,todo:o.rec,amt:+o.amount||0,proc:'Observations',sheet:'Observations'}))].filter(x=>x.r!=='L').sort((x,y)=>('HML'.indexOf(x.r)-'HML'.indexOf(y.r))||((y.amt||0)-(x.amt||0))).slice(0,15);
  if(top.length)s.table([{h:'Priority',at:'B',k:'c'},{h:'Problem',at:'C'},{h:'Money (₹)',at:'D',k:'n'},{h:'What to do',at:'E'},{h:'Procedure',at:'F'}],top.map(x=>[chip(PRI[x.r][0],PRI[x.r][1]),{v:x.t,s:'tdB'},x.amt?Math.round(x.amt):'',x.todo||'',linkTo(x.sheet,x.sheet.replace(/^\d+ /,''))]));
  else s.para('No high or medium problem was found.','okT');
  sheets.push(s.out());
  /* 2 How to read */
  const h=new RS('2 How to read',[2,4,30,110]);h.title('How to read this report','For the client, the accounts team and trainees',SUM);
  h.section('Colours');h.table([{h:'Colour',at:'C',k:'c'},{h:'Meaning',at:'D'}],[[chip('All right','okC'),'Nothing to fix.'],[chip('Needs attention','warnC'),'Something to look at or correct; no serious risk.'],[chip('Problem found','badC'),'Money, tax or a control at risk. Fix first.'],[chip('Not done yet','noneC'),'The procedure is not done in this audit.']]);
  h.section('How the workbook is arranged');h.para('Summary first. Then one sheet for each audit procedure: what we checked, the key figures, the problems found, the observations, the evidence and the conclusion. The sheets numbered like 4.1, 4.2 hold the detail of procedure 4, line by line, with a filter on every column. At the end: the findings register, the observations, the points for discussion, the documents used and the evidence annex.');
  h.section('Words used');h.table([{h:'Word',at:'C',k:'b'},{h:'Meaning',at:'D'}],GLOSS);h.rows.forEach(r=>{if(r[3]&&r[3].s&&/^td/.test(r[3].s))r[3]={...r[3]}});
  sheets.push(h.out());
  /* procedures */
  for(const p of procs){_withAudit(p.a,()=>{sheets.push(procSheet(p,SUM));for(const dsh of detailSheets(p,SUM))sheets.push(dsh)})}
  const DOCS=docsUsed(audits,cl,procs);
  sheets.push(findingsSheet(procs,O,SUM,DOCS),obsSheetX(O,SUM,procs),discSheetX(O,audits,SUM,procs),docsSheet(DOCS,SUM),evSheetX(audits,cl,SUM));
  sheets.unshift(coverSheet(audits,cl,sheets,procs,op));
  return sheets}

function procSheet(p,SUM){const {a,c,k,f,obs,ev}=p,x=new RS(p.sheet);x.tab=p.tone==='bad'?'FFC93A2E':p.tone==='warn'?'FFD39B00':p.tone==='ok'?'FF17875A':'FF8A93A8';
  x.title(f.name,c.name+(f.ref?'  ·  '+f.ref:'')+'  ·  '+a.title,SUM);
  x.section('What we checked');x.para(f.plain);
  x.section('Result');
  const KF=[['Result',chip(TONE[p.tone][1],{ok:'okC',warn:'warnC',bad:'badC',none:'noneC'}[p.tone]),f.stText||''],['Problems found',f.problems.length+obs.length,'Listed below, highest first.'],['Evidence files',ev.length,'Listed below and in "Evidence annex".']];
  if(f.money!=null&&k!=='settle')KF.push(['Money involved (₹)',Math.round(f.money),'The total difference or amount at risk.']);
  x.table([{h:'Item',at:'C',k:'b'},{h:'Value',at:'D',k:'n'},{h:'What it means',at:'E'}],KF);
  if(k==='settle')for(const e of f.extra)settleBlock(x,e);
  if(k==='gst'||k==='tds')gstBlock(x,f);
  if(k==='chk'){x.section('Steps and results');x.table([{h:'#',at:'B',k:'c'},{h:'Audit step',at:'C'},{h:'Result',at:'D',k:'c'},{h:'Working note',at:'E'}],a.items.map((it,i)=>[i+1,it.q,chip({ok:'Satisfactory',ex:'Exception',na:'Not applicable'}[it.r]||'Not tested',{ok:'okC',ex:'badC',na:'noneC'}[it.r]||'warnC'),it.n||'']),{filter:true})}
  x.section('Problems found');
  if(f.problems.length)x.table([{h:'Priority',at:'B',k:'c'},{h:'Problem',at:'C',k:'b'},{h:'Money (₹)',at:'D',k:'n'},{h:'Details',at:'E'},{h:'Observation',at:'F',k:'c'},{h:'What to do',at:'G'}],
    f.problems.map(q=>[chip(PRI[q.r][0],PRI[q.r][1]),q.t,q.amt?Math.round(q.amt):'',String(q.d||'').length>600?String(q.d).slice(0,600)+'…':q.d||'',chip(obs.some(o=>sameT(q.t,o.title))?'Raised':'Not raised',obs.some(o=>sameT(q.t,o.title))?'okC':'noneC'),q.todo||'']));
  else x.para(p.tone==='none'?'This procedure is not done yet.':'No problem found in this procedure.',p.tone==='none'?'note':'okT');
  x.section('Observations raised');
  if(obs.length)x.table([{h:'Rating',at:'B',k:'c'},{h:'Observation',at:'C',k:'b'},{h:'Status',at:'D',k:'c'},{h:'What was found',at:'E'},{h:'Owner',at:'F'},{h:'What to do',at:'G'},{h:'Target date',at:'H',k:'d'}],
    obs.map(o=>[chip(PRI[o.rating]?.[0]||'',PRI[o.rating]?.[1]||'td'),o.title,chip(o.status||'',o.status==='Closed'?'okC':'warnC'),o.condition||'',o.owner||'',o.rec||'',o.due||'']));
  else x.para('No observation raised for this procedure.','note');
  x.section('Evidence on file');
  if(ev.length)x.table([{h:'#',at:'B',k:'c'},{h:'File',at:'C'},{h:'Received',at:'D',k:'d'},{h:'Purpose',at:'E'},{h:'By',at:'F'},{h:'Integrity (SHA-256)',at:'G'}],ev.map((e,i)=>[i+1,e.name,(e.uploadedAt||'').slice(0,10),e.purpose||'',e.uploadedBy||'',(e.sha256||'').slice(0,24)]));
  else x.para('No file is on record for this procedure.','note');
  x.section('Auditor\'s conclusion');
  x.table([{h:'Conclusion',at:'C',k:'b'},{h:'Status',at:'D',k:'c'},{h:'Notes',at:'E'}],[[{ok:'Satisfactory',issue:'Needs action'}[f.conc.st]||'Not concluded yet',chip({ok:'Done',issue:'Action'}[f.conc.st]||'Open',f.conc.st==='ok'?'okC':f.conc.st==='issue'?'badC':'warnC'),f.conc.text||'']]);
  return x.out()}
function settleBlock(x,e){const {W,AG,s,r}=e;
  x.section(W[0]+' vs '+W[2]+': what is really outstanding');
  x.table([{h:'Measure',at:'C',k:'b'},{h:'Amount (₹)',at:'D',k:'n'},{h:'What it means',at:'E'}],[
    [W[0]+' bills',{v:s.B.length,s:'tdC'},r.pStart?'Bills from '+fmtD(r.pStart)+' to '+fmtD(r.asOf||r.to)+'. Earlier entries in the file are used only to match payments and advances.':'Bills in the period.'],...(r.bf?.length?[['Earlier years\' bills still open',Math.round(r.bf.reduce((t,b)=>t+b.rem,0)),r.bf.length+' bills dated before '+fmtD(r.pStart)+'; they are in the ageing and the amount below.']]:[]),['Billed',Math.round(s.sum(s.B)),'Total of those bills.'],
    ['Pending as per Tally',Math.round(e.tally),'What Tally\'s bill-wise report shows as pending.'],
    ['Not a real outstanding',{v:Math.round(e.notReal),s:'n0'},`The ${W[2]} came in but were booked on account or without the bill. Only a correction in Tally is needed.`],
    ['Really '+W[3],{v:Math.round(e.real),s:'n0B'},`What is truly still ${W[3]}.`],[W[2][0].toUpperCase()+W[2].slice(1)+' not matched to any bill',Math.round(e.un),'Advances or excess amounts.']]);
  const B=['0–30 days','31–60 days','61–90 days','91–180 days','Over 180 days'],tot=[0,0,0,0,0];for(const p of Object.values(AG))p.age.forEach((v,i)=>{if(v>0)tot[i]+=v});const mx=Math.max(...tot),sum=tot.reduce((a,b)=>a+b,0);
  x.table([{h:'How old',at:'C',k:'b'},{h:'Amount (₹)',at:'D',k:'n'},{h:'Share',at:'E'},{h:'% of total',at:'F',k:'n'}],B.map((b,i)=>[b,Math.round(tot[i]),{v:bar(tot[i],mx,34),s:i>=3?'barR':'bar'},{v:sum?Math.round(tot[i]/sum*100)+'%':'',s:'tdC'}]));
  const T=Object.entries(AG).sort((p,q)=>q[1].net-p[1].net).filter(([,p])=>p.net>1).slice(0,15);
  if(T.length)x.table([{h:W[1]==='customers'?'Customer (owes the most)':'Supplier (owed the most)',at:'C',k:'b'},{h:'Really outstanding (₹)',at:'D',k:'n'},{h:'Why it differs from Tally',at:'E'},{h:'Over 180 days (₹)',at:'F',k:'n'},{h:'Pending in Tally (₹)',at:'G',k:'n'}],
    T.map(([n,p])=>[n,{v:Math.round(p.net),s:'n0B'},p.notReal>1?inr(Math.round(p.notReal))+' was '+(W[2]==='receipts'?'received':'paid')+' but not adjusted against the bill in Tally':'Same as Tally',p.age[4]>1?{v:Math.round(p.age[4]),s:'numIR'}:'',Math.round(p.tally)]))}
function gstBlock(x,f){x.section('Each comparison');
  x.table([{h:'Comparison',at:'C',k:'b'},{h:'Result',at:'D',k:'c'},{h:'What it means',at:'E'},{h:'Difference (₹)',at:'F',k:'n'}],f.extra.map(e=>e.none?[RC[e.rk],chip('No data yet','noneC'),'Add the books and the returns for these months.','']:[RC[e.rk],chip(e.r.state==='bad'?'Difference':'Agrees',e.r.state==='bad'?'badC':'okC'),RMEAN[e.rk]?.(e.r)||'',Math.round(Math.abs(e.diff||0))]));
  const r2=f.extra.find(e=>e.rk==='r2'&&e.r?.eng);if(r2){const St=r2.r.eng.S.inv;x.section('Input tax credit statement (closes to zero)');
    x.table([{h:'Line',at:'C',k:'b'},{h:'IGST',at:'D',k:'n2'},{h:'CGST',at:'E',k:'n2'},{h:'SGST',at:'F',k:'n2'},{h:'Cess',at:'G',k:'n2'}],[['A  GSTR-2B'],['B  Books'],['C  A − B'],['D  In GSTR-2B, not in books'],['E  In books, not in GSTR-2B'],['F  D − E'],['G  C − F (closes to 0)']].map(([l])=>{const q=l[0];return[l,...['i','c','s','x'].map(hh=>St[q][hh])]}))}}
/* detail sheets: every line, a filter on every column, dates as dates, Indian amounts */
function detailSheets(p,SUM){const {a,c,k}=p;let L=[];try{L=k==='settle'?[...stSheets(pOpen(c),'S'),...stSheets(pOpen(c),'P')].filter(x=>!/findings/i.test(x[0])):k==='chk'?[]:procSheets(a,c,k).filter(x=>!((k==='crs'||k==='drs')&&programmeOf(a).includes('settle')&&/real ageing|as per tally|bill-wise/i.test(x[0])))}catch(e){L=[]}   /* the ageing sheets are already under the settlement procedure */
  return L.filter(x=>x[1]&&x[1].length>1).map(([n,rows],i)=>{const name=p.sheet.split(' ')[0]+'.'+(i+1)+' '+n.replace(/^(GST|TDS|Vouching|Debtors|Creditors) – /,'');
    const head=rows[0],nc=head.length,w=[2,...head.map((h,j)=>Math.min(48,Math.max(10,String(h).length+2,...rows.slice(1,300).map(r=>String(r[j]??'').length+2))))];
    const x=new RS(name,w);x.tab='FFB8C2E0';x.title(n.replace(/^(GST|TDS|Vouching|Debtors|Creditors) – /,''),p.c.name+'  ·  detail of "'+p.f.name+'"'+(k==='settle'&&/ageing|bill vs|bill-wise/i.test(n)?'  ·  as on '+fmtD(stAsOf(pOpen(c))):''),SUM);
    const isDate=j=>rows.slice(1,50).some(r=>/^\d{4}-\d{2}-\d{2}$/.test(String(r[j]??'')));const isNum=j=>rows.slice(1,80).filter(r=>r[j]!==''&&r[j]!=null).every(r=>typeof r[j]==='number');
    const cols=head.map((h,j)=>({h:String(h),at:colLetter(j+1),k:isDate(j)?'d':isNum(j)&&/amount|₹|taxable|tax|igst|cgst|sgst|cess|outstanding|pending|billed|applied|open|real|advance|account|total|value|balance|difference|net|days|0-30|31-60|61-90|91-180|over 180/i.test(h)&&!/days between|credit period|age|days/i.test(h)?'n2':isNum(j)?'n':'t'}));
    const body=rows.slice(1).map(r=>head.map((_,j)=>{const v=r[j]??'';if(typeof v==='string'&&v.length<70){const t=toneOf(v);if(t)return{v,s:{okT:'okC',warnT:'warnC',badT:'badC'}[t]}}return v}));
    x.table(cols,body,{filter:true,freeze:true});return x.out()})}
function findingsSheet(procs,O,SUM,DOCS){const x=new RS('Findings',[2,9,26,11,40,46,16,38,38,12,13]);x.title('Findings register','Every finding from every procedure, highest first. "Documents" refers to the sheet "Documents used".',SUM);
  const L=[];for(const p of procs){const docs=DOCS.filter(d=>d.used.includes(p.f.name)).map(d=>d.id).join(', ');for(const q of p.f.problems)L.push({q,p,docs})}
  L.sort((a,b)=>('HML'.indexOf(a.q.r)-'HML'.indexOf(b.q.r))||((b.q.amt||0)-(a.q.amt||0)));
  x.table([{h:'ID',at:'B',k:'b'},{h:'Procedure',at:'C'},{h:'Priority',at:'D',k:'c'},{h:'Finding',at:'E',k:'b'},{h:'Details',at:'F'},{h:'Money (₹)',at:'G',k:'n'},{h:'Why it matters',at:'H'},{h:'What to do',at:'I'},{h:'Documents',at:'J',k:'c'},{h:'Observation',at:'K',k:'c'}],
    L.map(({q,p,docs},i)=>{const raised=O.some(o=>sameT(q.t,o.title));return['F-'+String(i+1).padStart(2,'0'),linkTo(p.sheet,p.f.name),chip(PRI[q.r][0],PRI[q.r][1]),q.t,String(q.d||'').length>420?String(q.d).slice(0,420)+'… (all of it on the procedure\'s sheet)':q.d||'',q.amt?Math.round(q.amt):'',q.why||'',q.todo||'',docs,chip(raised?'Raised':'Not raised',raised?'okC':'noneC')]}),{filter:true,freeze:true});
  if(!L.length)x.para('No findings.','okT');return x.out()}
function obsSheetX(O,SUM,procs){const x=new RS('Observations',[2,6,30,10,10,40,34,36,36,30,16,12,22]);x.title('Observations','What was found, what should be, why it matters, what to do and management\'s response; highest first',SUM);
  x.table([{h:'#',at:'B',k:'c'},{h:'Observation',at:'C',k:'b'},{h:'Rating',at:'D',k:'c'},{h:'Status',at:'E',k:'c'},{h:'What was found (condition)',at:'F'},{h:'What should be (criteria)',at:'G'},{h:'Why it matters (effect)',at:'H'},{h:'What to do (recommendation)',at:'I'},{h:'Management\'s response',at:'J'},{h:'Owner',at:'K'},{h:'Target date',at:'L',k:'d'},{h:'Procedure',at:'M'}],
    O.map((o,i)=>[i+1,o.title,chip(PRI[o.rating]?.[0]||'',PRI[o.rating]?.[1]||'td'),chip(o.status||'',o.status==='Closed'?'okC':'warnC'),o.condition||'',o.criteria||'',o.effect||'',o.rec||'',o.response||'',o.owner||'',o.due||'',procs.find(p=>p.obs.includes(o))?.f.name||(o.auditId?'Audit':'Client level (visit)')]),{filter:true,freeze:true});
  if(!O.length)x.para('No observations were raised.','note');return x.out()}
function discSheetX(O,audits,SUM,procs){const x=new RS('For discussion',[2,6,24,56,11,38,36,36,18,13]);x.title('Points for discussion with management','Type management\'s view, the decision, the owner and the date in the yellow cells',SUM);
  const L=[];for(const o of O.filter(o=>o.status!=='Closed'&&o.rating!=='L'))L.push(['Observation',o.title+(o.condition?': '+o.condition.slice(0,300):''),o.rating,o.rec||'',o.response||'',o.owner||'',o.due||'']);
  for(const p of procs){if(p.tone==='none')L.push([p.f.name,'Not done yet. '+(p.f.stText||''),'','Complete before the audit is reported','','',''])
    for(const q of p.f.problems.filter(q=>q.r!=='L'&&!O.some(o=>sameT(q.t,o.title))))L.push([p.f.name,q.t+(q.d?': '+String(q.d).slice(0,300):''),q.r,q.todo||'','','',''])}
  for(const a of audits)for(const r of openNotes(a))L.push(['Review note',r.text||r.note||'','','Clear the note','',r.by||'','']);
  x.table([{h:'#',at:'B',k:'c'},{h:'Area',at:'C',k:'b'},{h:'Point for discussion',at:'D'},{h:'Priority',at:'E',k:'c'},{h:'Our recommendation',at:'F'},{h:'Management\'s view',at:'G'},{h:'Decision / action agreed',at:'H'},{h:'Owner',at:'I'},{h:'Target date',at:'J',k:'d'}],
    L.map((r,i)=>[i+1,r[0],r[1],r[2]?chip(PRI[r[2]][0],PRI[r[2]][1]):'',r[3],{v:r[4],s:'in'},{v:'',s:'in'},{v:r[5],s:'in'},{v:r[6],s:/^\d{4}-\d{2}-\d{2}$/.test(String(r[6]||''))?'dt':'in'}]),{filter:true,freeze:true});
  if(!L.length)x.para('Nothing to discuss.','note');return x.out()}
function docsSheet(D,SUM){const x=new RS('Documents used',[2,8,40,34,24,46,40,24,12,22]);x.title('Documents used','Every document and data source the audit relied on: what it is, the period, what was read from it and where it was used',SUM);
  x.table([{h:'ID',at:'B',k:'b'},{h:'Document',at:'C',k:'b'},{h:'What it is',at:'D'},{h:'Period covered',at:'E'},{h:'What was read',at:'F'},{h:'Used in',at:'G'},{h:'Source',at:'H'},{h:'Received',at:'I',k:'d'},{h:'Integrity (SHA-256)',at:'J'}],D.map(d=>[d.id,d.doc,d.type,d.period,d.records,d.used,d.src,d.at,(d.hash||'').slice(0,16)]),{filter:true,freeze:true});
  if(!D.length)x.para('No documents on record.','note');return x.out()}
function evSheetX(audits,cl,SUM){const x=new RS('Evidence annex',[2,30,40,30,40,12,10,24,12,40]);x.title('Evidence annex','Every file on record, with its integrity hash (SHA-256)',SUM);
  const L=[];for(const a of audits)for(const e of auditEvidence(a))L.push([a.title,e.name,e.purpose||'',e.item!=null?'Step '+(+e.item+1)+': '+(a.items[e.item]?.q||''):'',e.type||'',Math.round((e.size||0)/1024),e.uploadedBy||'',(e.uploadedAt||'').slice(0,10),e.sha256||'']);
  for(const c of cl)for(const e of S.evidence.filter(z=>z.clientId===c.id&&!z.auditId))L.push(['(client file) '+c.name,e.name,e.purpose||'','',e.type||'',Math.round((e.size||0)/1024),e.uploadedBy||'',(e.uploadedAt||'').slice(0,10),e.sha256||'']);
  x.table([{h:'Audit',at:'B'},{h:'File',at:'C',k:'b'},{h:'Purpose',at:'D'},{h:'Checklist step',at:'E'},{h:'Type',at:'F',k:'c'},{h:'Size (KB)',at:'G',k:'n'},{h:'Uploaded by',at:'H'},{h:'Uploaded on',at:'I',k:'d'},{h:'SHA-256',at:'J'}],L,{filter:true,freeze:true});
  if(!L.length)x.para('No files on record.','note');return x.out()}
function coverSheet(audits,cl,sheets,procs,op){const x=new RS('Cover',[2,4,28,96,4]);x.tab='FF102347';
  const navy=(v,s,h)=>x.push([,{v:'',s:'cover'},{v,s},{v:'',s},{v:'',s:'cover'}],h);
  navy('','cover',30);navy('Internal Audit Report','cover',48);navy(cl.map(c=>c.name).join(', '),'coverS',26);navy([...new Set(audits.map(a=>a.period).filter(Boolean))].join(', '),'coverS',22);navy('','cover',30);
  x.gap(16);
  x.table([{h:'Engagement',at:'C',k:'b'},{h:'Details',at:'D'}],[['Client',cl.map(c=>c.name+(c.gstin?'   ·   GSTIN '+c.gstin:'')).join('; ')],['Audits covered',audits.map(a=>a.title).join('; ')],['Period',[...new Set(audits.map(a=>a.period).filter(Boolean))].join(', ')],['Prepared by',session?.user?.email||''],['Date of report',fmtD(today())],['Overall opinion',chip(op,opStyle(op))],['Basis','Standards on Internal Audit (SIA) issued by ICAI; report in the SIA 370 structure. Figures are from the client\'s books and the government portals listed in "Documents used".']]);
  x.section('Contents');
  const desc=n=>n==='1 Summary'?'The opinion, every procedure at a glance, and what to fix first':n==='2 How to read'?'Colours, the layout, and the words used, for readers new to audit':n==='Findings'?'Every finding, numbered, with the money involved and what to do':n==='Observations'?'Observations reported to management, with their responses':n==='For discussion'?'Points to agree with management (yellow cells to fill)':n==='Documents used'?'Every document and data source the audit relied on':n==='Evidence annex'?'The files on record, with their integrity hash':'Procedure: '+(procs.find(p=>p.sheet===n)?.f.plain||'');
  x.table([{h:'Sheet',at:'C',k:'b'},{h:'What it contains',at:'D'}],sheets.filter(s=>!/^\d+\.\d+ /.test(s.name)).map(s=>[linkTo(s.name,s.name),desc(s.name)]));
  x.section('Sign-off');x.table([{h:'',at:'C',k:'b'},{h:'Name, signature and date',at:'D'}],[['Prepared by',{v:'',s:'in'}],['Reviewed by',{v:'',s:'in'}],['Approved by',{v:'',s:'in'}]]);
  return x.out()}
