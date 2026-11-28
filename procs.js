/* Smart Auditing — audit types by category, the audit programme of every audit, and the audit procedures:
   BRS, debtors / creditors reconciliation (CRS) with confirmations and ageing, physical cash verification, stock and
   fixed-asset verification, statutory due-date tracker and analytical review. Vouching and the GST reconciliations
   (vouching.js, recon.js) are mandatory in every audit. One import of the books feeds every procedure.
   Owner, 23 Nov 2026: "where is brs and where is crs ... first research ... then update app"; "the audit should be categorised
   into hr audit and so on ... which audit covers which topic"; "make auditing smartly ... easy and efficient and reliable". */
S.procs=S.procs||[];
IC.prog='<path d="M9 5h11M9 12h11M9 19h11"/><path d="M4 5l1 1 2-2M4 12l1 1 2-2M4 19l1 1 2-2"/>';

/* ---------- audit types, by category ---------- */
const CATS=[['fin','Finance & accounts'],['cycle','Business cycles'],['assets','Assets & inventory'],['people','People (HR)'],['comp','Tax & compliance'],['gov','Governance, IT & risk'],['sector','Sector-specific']];
TEMPLATES.fin={name:'Finance & accounts',items:[['Books closed monthly; trial balance reviewed and suspense / clearing accounts nil','SIA 320'],['Journal entries authorised, with supporting documents; manual and period-end entries reviewed','SIA 11 · data test'],['Opening balances agree with last year\'s audited figures','SIA 320'],['Provisions and accruals (expenses, bonus, gratuity, leave) made for the period','SIA 320'],['Advances to staff, suppliers and others reviewed and adjusted','SIA 320'],['Month-wise trends of sales, purchases and expenses reviewed and variances explained','SIA 6 analytical review'],['Inter-branch / inter-company accounts reconciled','SIA 320']]};
TEMPLATES.prod={name:'Production & operations',items:[['Production planned against orders; plan vs actual reviewed','SIA 310'],['Raw material issued only against approved requisitions','SIA 120'],['Consumption per unit compared with standard; variances explained','SIA 6'],['Wastage, scrap and rejections recorded, approved and disposed of properly','SIA 320'],['Job-work goods sent and received reconciled (challans, ITC-04)','GST compliance'],['Machine maintenance as per schedule; breakdowns recorded','Operational'],['Quality checks done before dispatch','Operational']]};
/* vouching and GST & TDS are topics of their own, mandatory every cycle (owner, 23 Nov 2026) */
TEMPLATES.vouch={name:'Vouching (transaction audit)',items:[['Import the period\'s books and draw the sample by the standard method (key items, value-weighted sample, risk picks)','SIA 5 sampling'],['For each sampled purchase / expense: check the bill is in the entity\'s name, GSTIN and tax correct, goods / service received (GRN), approved, and posted to the right ledger and period','SIA 320'],['For each sampled sale: check the invoice, dispatch proof, rate as per price list, GST and place of supply, and posting','SIA 320'],['For each sampled payment / receipt: check the approval, payee or payer, bank entry, and TDS / cash-limit compliance','SIA 320 · cash payment limits'],['For each sampled journal: check the reason, supporting working and approval','SIA 11'],['Record exceptions, project the misstatement and compare it with the tolerable error','SIA 5'],['Report exceptions as observations with the voucher references','SIA 370']]};
TEMPLATES.gsttds={name:'GST & TDS compliance',items:[['Reconcile GSTR-1 with the sales books, month by month and invoice by invoice','CGST Act s.37'],['Reconcile GSTR-2B with the purchase books; list ITC on bills not in 2B','CGST Act s.16(2)(aa)'],['Agree GSTR-3B output tax with GSTR-1','CGST Act s.39 · Rule 88C'],['Agree GSTR-3B ITC with GSTR-2B; reverse excess ITC','Rule 88D'],['Check blocked credits, reverse charge and ITC reversals','CGST Act s.17(5), s.9(3)'],['Agree TDS deducted in the books with challans; check deposit dates and interest','Income-tax'],['Check TDS / TCS returns filed on time and certificates issued','Income-tax']]};
Object.assign(TEMPLATES.p2p,{name:'Purchase & payables (procure to pay)'});
Object.assign(TEMPLATES.o2c,{name:'Sales & receivables (order to cash)'});
Object.assign(TEMPLATES.cash,{name:'Cash & bank (treasury)'});
Object.assign(TEMPLATES.inv,{name:'Inventory & stores'});
Object.assign(TEMPLATES.payroll,{name:'HR & payroll',items:[...TEMPLATES.payroll.items,['Appointment letters, KYC and approvals on file for every joiner','HR policy'],['Attendance and overtime approved before payroll; leave records maintained','SIA 120'],['Full and final settlement of leavers computed correctly and approved','SIA 320'],['Bonus, gratuity and leave encashment provided and paid as per law and policy','Labour law compliance'],['Statutory registers and returns under the labour codes maintained','Labour law compliance']].filter((x,i,a)=>a.findIndex(y=>y[0]===x[0])===i)});
Object.assign(TEMPLATES.itgc,{name:'IT audit (general controls)'});
Object.assign(TEMPLATES.gov,{name:'Governance & related parties'});
const UNI={
  vouch:{cat:'fin',must:true,covers:['Purchases and expenses','Sales','Payments and receipts','Journals','Supporting documents and approvals','Projection of errors'],procs:['vouch']},
  gsttds:{cat:'comp',must:true,covers:['GSTR-1 vs sales','GSTR-2B vs purchases','GSTR-3B vs GSTR-1','GSTR-3B vs GSTR-2B','ITC eligibility','TDS deducted vs deposited','TDS returns'],procs:['gst','tds']},
  fin:{cat:'fin',covers:['Books closing and trial balance','Journal entries','Provisions and accruals','Advances','Month-wise trends'],procs:['ar','tests']},
  cash:{cat:'fin',covers:['Bank reconciliation (BRS)','Cash in hand count','Cash payment limits','Bank charges, interest, FDs','Cheque book custody'],procs:['brs','cash']},
  o2c:{cat:'cycle',covers:['Customer master and credit limits','Pricing and discounts','Dispatch vs invoice','Credit notes','Debtors reconciliation and confirmation','Ageing and bad debts','Output GST'],procs:['drs']},
  p2p:{cat:'cycle',covers:['Vendor master','Purchase orders and approvals','GRN – invoice – PO match','Creditors reconciliation (CRS) and confirmation','MSME payments within 45 days','Vendor advances','Input GST and TDS on payments'],procs:['crs']},
  prod:{cat:'cycle',covers:['Production plan vs actual','Material issues and consumption','Wastage and scrap','Job work','Maintenance and quality'],procs:[]},
  inv:{cat:'assets',covers:['Physical stock verification','Valuation','Slow-moving and obsolete stock','Stores receipts and issues','Stock with third parties'],procs:['stock']},
  fa:{cat:'assets',covers:['Capital expenditure approval','Fixed asset register','Physical verification and tagging','Depreciation','Disposals','Insurance'],procs:['fav']},
  payroll:{cat:'people',covers:['Joiners and leavers','Attendance and leave','Salary computation and revisions','PF, ESI, professional tax','TDS on salary','Full and final settlement','Bonus and gratuity'],procs:['comp']},
  stat:{cat:'comp',covers:['GST returns and payments','TDS / TCS deposits and returns','Advance tax','PF and ESI','Company law filings','Annual returns (GSTR-9, income-tax)'],procs:['comp']},
  gov:{cat:'gov',covers:['Board and committee approvals','Related party transactions','Policies and delegation of authority','Vigil mechanism','CSR'],procs:[]},
  itgc:{cat:'gov',covers:['User access and passwords','Segregation of duties','Backups and recovery','Change management','Audit trail in the accounting software'],procs:[]},
  rbia:{cat:'sector',covers:['Credit appraisal and sanction','Disbursement','Asset classification and provisioning','KYC / AML','RBI returns'],procs:[]},
  broker:{cat:'sector',covers:['Client funds and securities','KYC','Margins','Exchange / depository reports'],procs:[]}};
const PR={
  chk:{n:'Audit procedures (checklist)',ref:'SIA 320 · SIA 330',why:'Each audit step tested, with a result, notes and evidence.'},
  vouch:{n:'Vouching',ref:'SIA 320 · SIA 5',must:true,why:'Every sampled voucher checked to its bill, approval and payment.'},
  gst:{n:'GST reconciliations',ref:'SIA 150 · CGST Act',must:true,why:'GSTR-1, 2B and 3B agreed with the books, month by month.'},
  tds:{n:'TDS vs books',ref:'Income-tax',opt:true,why:'TDS deducted in the books deposited on time (only where the client deducts TDS).'},
  brs:{n:'Bank reconciliation (BRS)',ref:'SIA 320 · ICAI guidance note on cash and bank',why:'Bank statement agreed with the bank book; uncleared and stale items followed up.'},
  cash:{n:'Physical cash verification',ref:'SIA 320',why:'Cash counted by denomination, in the custodian\'s presence, and agreed with the cash book.'},
  drs:{n:'Debtors: reconciliation, confirmation, ageing',ref:'SIA 320 · balance confirmation',why:'Customer balances confirmed or reconciled to their statements; old dues identified.'},
  crs:{n:'Creditors: reconciliation (CRS), confirmation, MSME',ref:'SIA 320 · MSMED Act s.15',why:'Supplier statements reconciled with the ledger; unbooked bills and MSME dues over 45 days found.'},
  stock:{n:'Physical stock verification',ref:'SIA 320 · SIA 5 · CARO 3(ii)',why:'Sample of items counted and compared with the book stock.'},
  fav:{n:'Fixed assets physical verification',ref:'SIA 320 · CARO 3(i)',why:'Assets in the register seen, tagged and in use.'},
  comp:{n:'Statutory compliance (due dates)',ref:'SIA 150',why:'Every return and payment filed or paid by its due date.'},
  ar:{n:'Analytical review',ref:'SIA 6',why:'Month-wise trends compared; unusual months explained.'},
  tests:{n:'Ledger data tests',ref:'SIA 6 · SIA 11',why:'Duplicates, round sums, Sunday and large cash entries in a ledger.'}};
const POPT=k=>!!PR[k].opt;
function programmeOf(a){const L=['chk',...(UNI[a.t]?.procs||[])];return L.filter((k,i)=>L.indexOf(k)===i)}
function planFor(c){const R=(c.risks&&c.risks.length?c.risks:suggestedRisks(c)),A=applicability(c).filter(x=>x.st!=='no'),why={};
  for(const x of A)for(const k of x.areas||[])(why[k]=why[k]||[]).push(x.name);
  return Object.keys(TEMPLATES).filter(t=>UNI[t]).map(t=>{const r=R.find(x=>x.t===t),must=!!UNI[t].must;return{t,on:must||!!r,must,r:r||(must?{t,i:5,c:3}:null),why:must?['Mandatory every month']:why[t]||[]}})}

/* ---------- one record per client and financial year ---------- */
const pdocId=(c,fy)=>c.id+'-'+String(fy).replace(/[^0-9]/g,'');
const pdoc=c=>S.procs.find(r=>r.id===pdocId(c,fyNow()));
const pOpen=c=>{const d=pdoc(c)||{};const x={id:pdocId(c,fyNow()),clientId:c.id,fy:fyNow(),led:null,brs:{accts:[]},party:{dr:{P:{}},cr:{P:{}}},cash:{counts:[]},stock:null,fav:null,comp:{set:{},done:{}},ar:{notes:{}},conc:{},...d};
  /* no books imported on the Programme tab, but a Day Book in Sales vs receipts: debtors and creditors from it (settle.js) */
  if((!x.led||x.led.fromSettle)&&x.settle?.P?.length&&typeof stLed==='function'){try{x.led=stLed(x)}catch(e){}}return x};
const savep=d=>put('procs',d.id,d.led?.fromSettle?{...d,led:null}:d);   // creditors read from the Day Book are worked out again each time, not stored twice
const dayDiff=(a,b)=>Math.round((new Date(a+'T00:00:00')-new Date(b+'T00:00:00'))/864e5);
const addDays=(d,n)=>{const x=new Date(d+'T00:00:00');x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};
const fyEnd=fy=>(+String(fy).slice(0,4)+1)+'-03-31',fyStart=fy=>String(fy).slice(0,4)+'-04-01';
async function pEv(c,file,purpose){if(file.size<=(mode==='claude'?EVID_INLINE_MAX:25*1048576)){try{return await addEvidence(file,{clientId:c.id,auditId:A()?.id||'',purpose})}catch(e){}}return''}
const hcol=(head,...k)=>{for(const x of k){const i=head.findIndex(h=>x instanceof RegExp?x.test(h):h.includes(x));if(i>=0)return i}return -1};
function findHeader(rows,test){const h=rows.slice(0,40).findIndex(r=>test(r.map(v=>String(v).toLowerCase().trim())));return h<0?null:{h,head:rows[h].map(v=>String(v).toLowerCase().replace(/\s+/g,' ').trim())}}

/* ---------- the books, read once: bank ledgers and party ledgers ---------- */
const BANK_RE=/bank|\bhdfc|icici|\bsbi\b|axis|kotak|idfc|yes bank|canara|baroda|federal|indusind|\bod\b|\bcc\b|current a\/?c|overdraft/i;
function parseLedgerEntries(text){
  const V=[],re=/<VOUCHER[\s>]/g;let m;
  while((m=re.exec(text))){const e=text.indexOf('</VOUCHER>',m.index);if(e<0)break;const b=text.slice(m.index,e);re.lastIndex=e+10;
    if(/<ISCANCELLED>Yes</i.test(b)||/<ISOPTIONAL>Yes</i.test(b))continue;
    const dt=xtag(b,'DATE'),d=dt.length===8?dt.slice(0,4)+'-'+dt.slice(4,6)+'-'+dt.slice(6,8):ymdOf(dt),E=[];
    for(const en of b.match(/<(ALLLEDGERENTRIES|LEDGERENTRIES)\.LIST>[\s\S]*?<\/\1\.LIST>/g)||[]){const a=num(xtag(en,'AMOUNT'));if(!a)continue;
      const dp=en.match(/<ISDEEMEDPOSITIVE>(Yes|No)</i);E.push({l:xtag(en,'LEDGERNAME'),a:Math.abs(a),dr:dp?/yes/i.test(dp[1]):a<0,inst:xtag(en,'INSTRUMENTNUMBER')})}
    if(E.length)V.push({d,vt:xtag(b,'VOUCHERTYPENAME'),vno:xtag(b,'VOUCHERNUMBER'),party:xtag(b,'PARTYLEDGERNAME'),ref:xtag(b,'REFERENCE'),nar:xtag(b,'NARRATION').slice(0,120),E})}
  return V}
function ledgersFromBooks(V){
  const cnt={},inst={};for(const v of V)for(const e of v.E){if(/payment|receipt|contra/i.test(v.vt)&&e.l!==v.party||v.E.length===2&&/payment|receipt|contra/i.test(v.vt))cnt[e.l]=(cnt[e.l]||0)+1;if(e.inst)inst[e.l]=1}
  const banks=Object.keys(cnt).filter(l=>!/cash/i.test(l)&&(BANK_RE.test(l)||inst[l])).sort((a,b)=>cnt[b]-cnt[a]).slice(0,10);
  const rowsOf=l=>{const R=[];for(const v of V)for(const e of v.E)if(e.l===l){const other=[...new Set(v.E.filter(x=>x.l!==l).map(x=>x.l))];R.push({d:v.d,vt:v.vt,vno:v.vno,ref:e.inst||v.ref||'',nar:other.join(', ').slice(0,80)||v.nar,dr:e.dr?R2(e.a):0,cr:e.dr?0:R2(e.a),tds:other.some(x=>/\btds\b/i.test(x))})}return R.slice(0,30000)};
  const B={};for(const l of banks)B[l]=rowsOf(l);
  const side={dr:{},cr:{}};for(const v of V){if(!v.party)continue;const s=/sales|credit note/i.test(v.vt)&&!/purchase/i.test(v.vt)?'dr':/purchase|debit note/i.test(v.vt)?'cr':'';if(s){const o=side[s][v.party]=side[s][v.party]||0;side[s][v.party]=o+v.E.find(e=>e.l===v.party)?.a||0}}
  const P={dr:{},cr:{}};for(const s of ['dr','cr'])for(const l of Object.keys(side[s]).sort((a,b)=>side[s][b]-side[s][a]).slice(0,300)){if(side.dr[l]&&side.cr[l]&&side[s==='dr'?'cr':'dr'][l]>side[s][l])continue;P[s][l]=rowsOf(l).slice(0,4000)}
  const ds=V.map(v=>v.d).filter(Boolean).sort();
  return{banks:B,dr:P.dr,cr:P.cr,from:ds[0]||'',to:ds[ds.length-1]||''}}
async function procBooks(c,file,text){
  const V=parseLedgerEntries(text);if(!V.length)throw new Error('No vouchers were found in this Tally file.');
  const L=ledgersFromBooks(V),d=pOpen(c);await savep({...d,led:{file:file.name,at:new Date().toISOString(),...L}});
  return L}
/* the whole set from one Tally Day Book: vouching, GST & TDS books, banks and parties */
async function importBooksOnce(c,file){
  try{const x=extOf(file.name);toast('Reading '+file.name+' for every procedure…');
    const said=[];
    try{await importVouchers(c,file);said.push('vouching')}catch(e){}
    try{await rcBooks(c,file);said.push('GST & TDS')}catch(e){}
    if(x==='xml'){const L=await procBooks(c,file,decodeBuf(await file.arrayBuffer()));said.push(Object.keys(L.banks).length+' bank ledger'+(Object.keys(L.banks).length===1?'':'s'),Object.keys(L.dr).length+' debtors',Object.keys(L.cr).length+' creditors');
      const d=pOpen(c);let ch=false;for(const b of Object.keys(L.banks))if(!d.brs.accts.some(a=>a.ledger===b)){d.brs.accts.push({id:nid(),name:b,ledger:b,asOf:'',bank:null,book:null,bookBal:null,openBal:null,bankBal:null,win:45});ch=true}if(ch)await savep(d)}
    toast('Books read once for: '+said.join(', '));
  }catch(e){toast(e.message||String(e))}}

/* ---------- BRS ---------- */
function parseBankStmt(rows){
  const H=findHeader(rows,r=>r.some(v=>/date/.test(v))&&(r.some(v=>/withdraw|debit|\bdr\b|paid out/.test(v))||r.some(v=>/amount/.test(v))));
  if(!H)throw new Error('No header row with Date and Withdrawal / Deposit (or Debit / Credit) columns was found in the bank statement.');
  const c=(...k)=>hcol(H.head,...k),ci={d:c(/^(txn |transaction |value )?date|date$/,'date'),nar:c('narration','description','particular','remark','details'),ref:c('chq','cheque','ref','utr','instrument'),wd:c('withdraw','debit amount',/^debit/,/^dr\b/,'paid out'),dep:c('deposit','credit amount',/^credit/,/^cr\b/,'paid in'),amt:c(/^amount/),typ:c(/dr ?\/ ?cr|type/),bal:c('balance')};
  const out=[];for(const r of rows.slice(H.h+1)){const d=ymdOf(r[ci.d]);if(!d)continue;let dr=ci.wd>=0?Math.abs(num(r[ci.wd])):0,cr=ci.dep>=0?Math.abs(num(r[ci.dep])):0;
    if(ci.wd<0&&ci.amt>=0){const a=num(r[ci.amt]),t=String(r[ci.typ]||'');if(/dr|debit|wd/i.test(t)||a<0)dr=Math.abs(a);else cr=Math.abs(a)}
    if(!dr&&!cr)continue;out.push({d,nar:String(r[ci.nar]||'').slice(0,120),ref:ci.ref>=0?String(r[ci.ref]||'').trim():'',dr:R2(dr),cr:R2(cr),bal:ci.bal>=0&&String(r[ci.bal]).trim()!==''?num(String(r[ci.bal]).replace(/\s*cr$/i,'')):null})}
  if(!out.length)throw new Error('The statement has a header but no dated rows with amounts.');return out}
function parseLedgerTable(rows){
  const H=findHeader(rows,r=>r.some(v=>/date/.test(v))&&r.some(v=>/debit|\bdr\b/.test(v))&&r.some(v=>/credit|\bcr\b/.test(v)));
  if(!H)throw new Error('No header row with Date, Debit and Credit columns was found in the ledger.');
  const c=(...k)=>hcol(H.head,...k),ci={d:c('date'),p:c('particular','narration','description'),vt:c('vch type','voucher type','type'),vno:c('vch no','voucher no','vch. no','number'),ref:c('chq','cheque','ref','inst'),dr:c(/^debit|^dr\b/,'debit'),cr:c(/^credit|^cr\b/,'credit')};
  const out=[];for(const r of rows.slice(H.h+1)){const d=ymdOf(r[ci.d]);if(!d)continue;const dr=Math.abs(num(r[ci.dr])),cr=Math.abs(num(r[ci.cr]));if(!dr&&!cr)continue;if(/opening|closing/i.test(String(r[ci.p]||'')))continue;
    out.push({d,vt:ci.vt>=0?String(r[ci.vt]):'',vno:ci.vno>=0?String(r[ci.vno]):'',ref:ci.ref>=0?String(r[ci.ref]):'',nar:ci.p>=0?String(r[ci.p]).slice(0,80):'',dr:R2(dr),cr:R2(cr),tds:/\btds\b/i.test(String(r[ci.p]||''))})}
  if(!out.length)throw new Error('The ledger has a header but no dated rows with amounts.');return out}
const digits=s=>String(s||'').replace(/\D/g,'');
function brsCalc(ac,d){
  const K=(ac.book?.rows||d.led?.banks?.[ac.ledger]||[]).slice().sort((a,b)=>a.d.localeCompare(b.d)),B=(ac.bank?.rows||[]).map((r,i)=>({...r,i}));
  const asOf=ac.asOf||(B.length?B.filter(r=>!ac.bank.cut||r.d<=ac.bank.cut).reduce((m,r)=>r.d>m?r.d:m,''):'')||(K.length?K[K.length-1].d:'');
  const used=new Set(),pair=new Map(),win=+ac.win||45;
  for(const k of K){const amt=k.dr||k.cr,inflow=k.dr>0,ref=digits(k.ref).length>=4?digits(k.ref):'';let best=null,bs=1e9;
    for(const b of B){if(used.has(b.i))continue;const ba=inflow?b.cr:b.dr;if(!ba||Math.abs(ba-amt)>0.5)continue;const dd=dayDiff(b.d,k.d);
      const refHit=ref&&(digits(b.ref).endsWith(ref)||digits(b.nar).includes(ref));if(!refHit&&(dd<-5||dd>win))continue;const s=(refHit?0:1000)+Math.abs(dd);if(s<bs){bs=s;best=b}}
    if(best){used.add(best.i);pair.set(k,best);best.mk=k}}
  const A=[],Bq=[],C=[],D=[];
  for(const k of K){if(k.d>asOf)continue;const b=pair.get(k);if(b&&b.d<=asOf)continue;(k.dr?A:Bq).push({...k,amt:k.dr||k.cr,cleared:b?b.d:'',age:dayDiff(asOf,k.d)})}
  for(const b of B){if(b.d>asOf)continue;if(b.mk&&b.mk.d<=asOf)continue;(b.cr?C:D).push({...b,amt:b.cr||b.dr,booked:b.mk?b.mk.d:''})}
  const sum=L=>R2(L.reduce((s,x)=>s+x.amt,0));
  const lastBal=B.filter(b=>b.d<=asOf&&b.bal!=null);const bankBal=ac.bankBal!=null&&ac.bankBal!==''?+ac.bankBal:lastBal.length?lastBal[lastBal.length-1].bal:null;
  const move=R2(K.filter(k=>k.d<=asOf).reduce((s,k)=>s+k.dr-k.cr,0));
  const bookBal=ac.bookBal!=null&&ac.bookBal!==''?+ac.bookBal:ac.openBal!=null&&ac.openBal!==''?R2(+ac.openBal+move):null;
  const calc=bankBal==null?null:R2(bankBal+sum(A)-sum(Bq)-sum(C)+sum(D)),diff=calc==null||bookBal==null?null:R2(bookBal-calc);
  const stale=Bq.filter(x=>x.age>90);
  return{asOf,K,B,A,Bq,C,D,sA:sum(A),sB:sum(Bq),sC:sum(C),sD:sum(D),bankBal,bookBal,calc,diff,stale,matched:pair.size,hasBook:K.length>0,hasBank:B.length>0,move}}
function brsTab(c,d){
  const L=d.brs.accts,cur=L.find(a=>a.id===ui.brsA)||L[0];
  const banksAvail=Object.keys(d.led?.banks||{}).filter(b=>!L.some(a=>a.ledger===b));
  let h=`<div class="row" style="margin-bottom:10px;gap:8px">${L.map(a=>`<button class="chip" data-act="brsA" data-v="${a.id}" style="${cur&&a.id===cur.id?'border-color:var(--acc);font-weight:700':''}">${esc(a.name)}</button>`).join('')}
   ${banksAvail.map(b=>`<button class="chip" data-act="brsAdd" data-v="${esc(b)}">${ic('plus')}${esc(b)}</button>`).join('')}<button class="chip" data-act="brsAdd" data-v="">${ic('plus')}Bank account</button></div>`;
  if(!cur)return h+`<div class="empty">Import the books on the Programme tab: bank ledgers are found by themselves. Or add a bank account and upload its ledger.</div>`;
  const r=brsCalc(cur,d),src=cur.book?'uploaded ledger '+esc(cur.book.file):d.led?.banks?.[cur.ledger]?'books imported ('+esc(d.led.file)+'), ledger '+esc(cur.ledger):'none yet';
  h+=`<div class="grid2 even" style="margin-bottom:14px"><div>
   <label class="drop" data-drop="brsbank" style="margin-bottom:10px">${ic('up')}<b>Bank statement: CSV or Excel</b><span class="small">${cur.bank?esc(cur.bank.file)+' · '+cur.bank.rows.length+' rows':'Date, narration, cheque / ref, withdrawal, deposit, balance. Include the next month\'s statement to trace items cleared later.'}</span><input type="file" data-file="brsbank" accept=".csv,.xlsx,.xls" hidden></label>
   <label class="drop" data-drop="brsbook">${ic('up')}<b>Bank book</b><span class="small">Now: ${src}. To use another, upload the Tally ledger (Date, Particulars, Vch type, Vch no, Debit, Credit).</span><input type="file" data-file="brsbook" accept=".csv,.xlsx,.xls" hidden></label></div>
   <div class="panel"><h3>${esc(cur.name)}</h3><div class="form">
    <label class="f">Name<input data-brs="name" value="${esc(cur.name)}"></label>
    <label class="f">As on date<input type="date" data-brs="asOf" value="${esc(cur.asOf||r.asOf||'')}"></label>
    <label class="f">Balance as per books on that date (₹, Dr +)<input type="number" step="0.01" data-brs="bookBal" value="${cur.bookBal??''}" placeholder="from Tally"></label>
    <label class="f">or opening balance as per books (₹, Dr +)<input type="number" step="0.01" data-brs="openBal" value="${cur.openBal??''}"></label>
    <label class="f">Balance as per bank statement (₹)<input type="number" step="0.01" data-brs="bankBal" value="${cur.bankBal??''}" placeholder="${r.bankBal!=null?'from statement: '+r.bankBal:'enter'}"></label>
    <label class="f">Match within (days)<input type="number" min="1" data-brs="win" value="${cur.win||45}"></label></div></div></div>`;
  if(!r.hasBank||!r.hasBook)return h+`<div class="empty">${!r.hasBook?'Add the bank book (import the books, or upload the ledger). ':''}${!r.hasBank?'Upload the bank statement.':''}</div>`+concBox(d,'brs');
  const line=(l,v,s)=>`<tr><td>${l}</td><td class="num">${s?s+' ':''}${v==null?'—':inr(v)}</td></tr>`;
  h+=`<div class="kpis"><div class="kpi"><b>${r.matched}</b><span>Entries matched</span></div><div class="kpi ${r.Bq.length?'alert':''}"><b>${r.Bq.length}</b><span>Cheques issued, not presented</span></div><div class="kpi ${r.A.length?'alert':''}"><b>${r.A.length}</b><span>Deposits not credited</span></div><div class="kpi ${r.C.length+r.D.length?'alert':''}"><b>${r.C.length+r.D.length}</b><span>In bank, not in books</span></div><div class="kpi ${r.stale.length?'alert':''}"><b>${r.stale.length}</b><span>Stale cheques (over 3 months)</span></div><div class="kpi ${r.diff!=null&&Math.abs(r.diff)>1?'alert':r.diff!=null?'good':''}"><b>${r.diff==null?'—':inrc(r.diff)}</b><span>Unexplained difference</span></div></div>
   <div class="grid2 even"><div class="panel"><h3>Bank reconciliation statement as on ${fmtD(r.asOf)}</h3><table><tbody>
    ${line('Balance as per bank statement',r.bankBal)}${line('Add: cheques / deposits in books, not yet credited by bank',r.sA,'+')}${line('Less: cheques issued, not yet presented',r.sB,'−')}${line('Less: credited by bank, not in books',r.sC,'−')}${line('Add: debited by bank, not in books',r.sD,'+')}
    <tr style="font-weight:600"><td>Balance as per books (reconciled)</td><td class="num">${r.calc==null?'—':inr(r.calc)}</td></tr>${line('Balance as per books (Tally)',r.bookBal)}
    <tr style="font-weight:600"><td>Unexplained difference</td><td class="num">${r.diff==null?'Enter the book balance':sgn(r.diff)}</td></tr></tbody></table>
    ${r.bookBal==null?'<p class="small muted">Enter the balance as per books (or the opening balance) to close the reconciliation.</p>':''}</div>
   <div class="panel"><h3>What to follow up</h3><ul class="small" style="margin:0;padding-left:18px">${[r.stale.length&&`${r.stale.length} cheque${r.stale.length===1?'':'s'} issued over 3 months ago not presented (${inr(R2(r.stale.reduce((s,x)=>s+x.amt,0)))}): stale, to be reversed / written back.`,r.C.length&&`${r.C.length} credit${r.C.length===1?'':'s'} in the bank not in the books (${inr(r.sC)}): interest, direct deposits or unrecorded receipts.`,r.D.length&&`${r.D.length} debit${r.D.length===1?'':'s'} in the bank not in the books (${inr(r.sD)}): charges, ECS or unrecorded payments.`,r.A.length&&`${r.A.length} deposit${r.A.length===1?'':'s'} not credited (${inr(r.sA)}): check the next statement.`,[...r.A,...r.Bq].some(x=>x.cleared)&&`${[...r.A,...r.Bq].filter(x=>x.cleared).length} item(s) cleared in the next statement (shown with the date).`].filter(Boolean).map(t=>`<li>${esc(t)}</li>`).join('')||'<li>Nothing outstanding.</li>'}</ul></div></div>
   ${[['Bq','Cheques issued, not presented',r.Bq],['A','Deposits not credited',r.A],['C','Credited by bank, not in books',r.C],['D','Debited by bank, not in books',r.D]].filter(x=>x[2].length).map(([k,l,Lx])=>`<div class="panel" style="margin-top:12px"><h3>${l} (${Lx.length})</h3><div class="scroll"><table><thead><tr><th>Date</th><th>${k==='C'||k==='D'?'Narration':'Voucher / party'}</th><th>Cheque / ref</th><th class="num">Amount</th><th>${k==='C'||k==='D'?'Booked later':'Cleared later'}</th></tr></thead><tbody>${Lx.slice(0,200).map(x=>`<tr><td>${fmtD(x.d)}</td><td>${esc(k==='C'||k==='D'?x.nar:[x.vno,x.nar].filter(Boolean).join(' · '))}</td><td>${esc(x.ref||'')}</td><td class="num">${inr(x.amt)}</td><td>${x.cleared||x.booked?fmtD(x.cleared||x.booked):k==='Bq'&&x.age>90?'<span class="tag r">Stale</span>':'<span class="muted">—</span>'}</td></tr>`).join('')}</tbody></table></div></div>`).join('')}
   <div class="row" style="margin-top:10px"><button class="btn ghost sm" data-act="brsCsv">${ic('down')}BRS as CSV</button>${(r.diff!=null&&Math.abs(r.diff)>1)||r.stale.length||r.C.length+r.D.length?`<button class="btn ghost sm" data-act="pObs" data-v="brs">${ic('flag')}Raise observation</button>`:''}<button class="btn ghost sm" data-act="brsSave">Keep this month's BRS</button><button class="btn ghost sm" data-act="brsDel">Remove this account</button></div>${brsHistory(cur)}`;
  return h+concBox(d,'brs')}

/* ---------- debtors / creditors ---------- */
const SIDE={dr:{n:'Debtors',one:'customer',k:'drs'},cr:{n:'Creditors',one:'supplier',k:'crs'}};
/* the date the debtors / creditors are taken on: the date set here, else the settlement ageing date (today or the month chosen),
   else the last date of the books, never after today */
function partyAsOf(d,s){if(d.party[s].asOf)return d.party[s].asOf;if(d.settle?.P?.length&&typeof stAsOf==='function')return stAsOf(d);const t=today();return d.led?.to&&d.led.to<t?d.led.to:t}
function partyRows(d,s,name){const p=d.party[s].P[name]||{};return(p.book?.rows||d.led?.[s]?.[name]||[]).slice().sort((a,b)=>a.d.localeCompare(b.d))}
function partyCalc(d,s,name){
  const p=d.party[s].P[name]||{},R=partyRows(d,s,name),asOf=partyAsOf(d,s),open=+p.open||0;
  const inc=x=>s==='dr'?x.dr:x.cr,dec=x=>s==='dr'?x.cr:x.dr;
  const bal=R2(open+R.filter(x=>x.d<=asOf).reduce((t,x)=>t+inc(x)-dec(x),0)),book=p.bookBal!=null&&p.bookBal!==''?+p.bookBal:bal;
  /* FIFO ageing: bills are settled oldest first */
  const bills=[];if(open>0)bills.push({d:fyStart(d.fy),left:open});let pay=open<0?-open:0;
  for(const x of R.filter(x=>x.d<=asOf)){if(inc(x))bills.push({d:x.d,left:inc(x)});if(dec(x))pay+=dec(x)}
  for(const b of bills){const t=Math.min(b.left,pay);b.left=R2(b.left-t);pay=R2(pay-t)}
  const age=[0,0,0,0,0];let over45=0;for(const b of bills){if(b.left<=0)continue;const a=dayDiff(asOf,b.d);age[a<=30?0:a<=60?1:a<=90?2:a<=180?3:4]+=b.left;if(a>45)over45+=b.left}
  const rec=p.stmt?partyRecon(R,p,s,open,asOf):null;
  return{p,R,bal,book,age:age.map(R2),over45:R2(over45),adv:R2(pay),rec,asOf}}
function parsePartyStmt(rows){
  const H=findHeader(rows,r=>r.some(v=>/date/.test(v))&&r.some(v=>/debit|\bdr\b/.test(v))&&r.some(v=>/credit|\bcr\b/.test(v)));
  if(!H)throw new Error('No header row with Date, Debit and Credit columns was found in the statement.');
  const c=(...k)=>hcol(H.head,...k),ci={d:c('date'),p:c('particular','narration','description','details'),ref:c('ref','invoice','bill','doc','vch no','voucher no'),dr:c(/^debit|^dr\b/,'debit'),cr:c(/^credit|^cr\b/,'credit'),bal:c('balance')};
  let open=0;const out=[];for(const r of rows.slice(H.h+1)){const d=ymdOf(r[ci.d]),p=String(r[ci.p]||''),dr=Math.abs(num(r[ci.dr])),cr=Math.abs(num(r[ci.cr]));
    if(/opening/i.test(p)){open={dr,cr};continue}if(!d||(!dr&&!cr)||/closing|total/i.test(p))continue;out.push({d,nar:p.slice(0,80),ref:ci.ref>=0?String(r[ci.ref]||''):'',dr:R2(dr),cr:R2(cr)})}
  if(!out.length)throw new Error('No dated entries found in the statement.');return{rows:out,open}}
function partyRecon(R,p,s,open,asOf){
  /* their debit is our credit and the other way round */
  const T=p.stmt.rows.filter(x=>x.d<=asOf).map((x,i)=>({...x,i})),used=new Set(),pairs=[];
  const key=x=>normInv(x.ref||x.vno||'');
  for(const k of R.filter(x=>x.d<=asOf)){const amt=k.dr||k.cr,want=k.dr?'cr':'dr';let best=null,bs=1e9;
    for(const t of T){if(used.has(t.i)||!t[want]||Math.abs(t[want]-amt)>1)continue;const ref=key(k)&&(key(k)===normInv(t.ref)||normInv(t.nar).includes(key(k)));const dd=Math.abs(dayDiff(t.d,k.d));if(!ref&&dd>30)continue;const sc=(ref?0:1000)+dd;if(sc<bs){bs=sc;best=t}}
    if(best){used.add(best.i);pairs.push([k,best])}}
  const mk=new Set(pairs.map(x=>x[0])),ourU=R.filter(x=>x.d<=asOf&&!mk.has(x)),thU=T.filter(t=>!used.has(t.i));
  const o=p.stmt.open||{},tOpen=s==='cr'?(o.dr||0)-(o.cr||0):(o.cr||0)-(o.dr||0);
  /* both balances in our sense: what the customer owes us / what we owe the supplier */
  const theirBal=R2(tOpen+T.reduce((a,t)=>a+(s==='cr'?t.dr-t.cr:t.cr-t.dr),0)),theirSum=R2(theirBal);
  const g=s==='cr'?{a:['Bills booked by us, not in the supplier\'s statement',ourU.filter(x=>x.cr)],b:['Payments / debit notes in our books, not yet in their statement',ourU.filter(x=>x.dr)],c:['Bills in the supplier\'s statement, not booked by us',thU.filter(x=>x.dr)],e:['Payments / credit notes in their statement, not in our books',thU.filter(x=>x.cr)]}
    :{a:['Invoices booked by us, not in the customer\'s statement',ourU.filter(x=>x.dr)],b:['Receipts / credit notes in our books, not in their statement',ourU.filter(x=>x.cr)],c:['Invoices in the customer\'s statement, not booked by us',thU.filter(x=>x.cr)],e:['Payments / debit notes in their statement, not in our books',thU.filter(x=>x.dr)]};
  const sm=L=>R2(L.reduce((a,x)=>a+(x.dr||x.cr),0));
  const calc=R2(theirSum+sm(g.a[1])-sm(g.b[1])-sm(g.c[1])+sm(g.e[1])+(open-tOpen));
  return{pairs:pairs.length,g,theirBal,calc,openDiff:R2(open-tOpen),sm}}
function partyTab(c,d,s){
  const S_=SIDE[s],P=d.led?.[s]||{},names=[...new Set([...Object.keys(P),...Object.keys(d.party[s].P)])],cfg=d.party[s];
  if(!names.length)return`<div class="empty">Import the books on the Programme tab: ${S_.n.toLowerCase()} are found from the ${s==='dr'?'sales':'purchase'} entries. Or add a ${S_.one} below.</div>${partyAdd(s)}${concBox(d,S_.k)}`;
  const rows=names.map(n=>({n,...partyCalc(d,s,n)})).sort((a,b)=>Math.abs(b.book)-Math.abs(a.book)),tot=R2(rows.reduce((t,r)=>t+Math.max(r.book,0),0));
  const mat=+cfg.mat||Math.max(R2(tot*0.05),1),sel=r=>r.p.sel===true||(r.p.sel!==false&&(Math.abs(r.book)>=mat||(s==='cr'&&r.p.msme&&r.over45>0)));
  const cur=ui.party?.[s]&&names.includes(ui.party[s])?ui.party[s]:null;
  const ageT=[0,1,2,3,4].map(i=>R2(rows.reduce((t,r)=>t+r.age[i],0))),selN=rows.filter(sel),done=selN.filter(r=>r.p.conf?.recv||(r.rec&&Math.abs(R2(r.book-r.rec.calc))<=1));
  const msme=s==='cr'?rows.filter(r=>r.p.msme&&r.over45>0):[];
  let h=`<div class="kpis"><div class="kpi"><b>${rows.length}</b><span>${S_.n}</span></div><div class="kpi"><b>${inrc(tot)}</b><span>Total balance</span></div><div class="kpi"><b>${done.length} / ${selN.length}</b><span>Selected parties confirmed or reconciled</span></div><div class="kpi ${ageT[4]?'alert':''}"><b>${inrc(ageT[4])}</b><span>Over 180 days</span></div>${s==='cr'?`<div class="kpi ${msme.length?'alert':''}"><b>${msme.length}</b><span>MSME dues over 45 days</span></div>`:''}</div>
  <div class="row small" style="margin:4px 0 10px;gap:14px"><label class="f" style="flex:0 1 12em">As on<input type="date" data-pcfg="${s}" data-k="asOf" value="${esc(partyAsOf(d,s))}"></label><label class="f" style="flex:0 1 14em">Confirm balances above (₹)<input type="number" data-pcfg="${s}" data-k="mat" value="${cfg.mat||''}" placeholder="${Math.round(mat)}"></label>
   <span class="muted" style="align-self:end">Ageing is worked out first-in, first-out from the ${s==='dr'?'invoices and receipts':'bills and payments'} in the books.</span></div>`;
  if(cur){const r=rows.find(x=>x.n===cur);h+=partyDetail(c,d,s,cur,r);return h+concBox(d,S_.k)}
  h+=`<div class="panel"><div class="row" style="margin-bottom:8px"><h3 class="sp" style="margin:0">${S_.n}: balances, ageing and confirmations</h3><button class="btn ghost sm" data-act="pCsv" data-v="${s}">${ic('down')}CSV</button><button class="btn ghost sm" data-act="pLetters" data-v="${s}">${ic('down')}Confirmation letters</button></div><div class="scroll"><table class="stack"><thead><tr><th>${S_.one[0].toUpperCase()+S_.one.slice(1)}</th><th class="num">Balance</th><th class="num">0–30</th><th class="num">31–60</th><th class="num">61–90</th><th class="num">91–180</th><th class="num">180+</th>${s==='cr'?'<th>MSME</th>':''}<th>Confirm</th><th>Status</th></tr></thead><tbody>
   ${rows.slice(0,300).map(r=>{const st=r.p.conf?.recv?(Math.abs(R2((+r.p.conf.amt||0)-r.book))<=1?'<span class="tag g">Confirmed</span>':'<span class="tag y">Confirmed, differs</span>'):r.rec?(Math.abs(R2(r.book-r.rec.calc))<=1?'<span class="tag g">Reconciled</span>':'<span class="tag r">Difference</span>'):r.p.conf?.req?'<span class="tag y">Requested</span>':sel(r)?'<span class="tag n">To confirm</span>':'';
     return `<tr><td><a href="#" data-act="pOpen" data-s="${s}" data-v="${esc(r.n)}"><b>${esc(r.n)}</b></a>${r.adv>0?`<div class="small muted">Advance ${inr(r.adv)}</div>`:''}</td><td class="num">${inr(r.book)}</td>${r.age.map((v,i)=>`<td class="num" style="${i===4&&v?'color:var(--hi)':''}">${v?inr(v):'—'}</td>`).join('')}${s==='cr'?`<td><input type="checkbox" data-pmsme="${esc(r.n)}" ${r.p.msme?'checked':''} aria-label="MSME supplier" style="width:16px;min-height:16px">${r.p.msme&&r.over45?` <span class="tag r">${inrc(r.over45)} over 45 days</span>`:''}</td>`:''}<td><input type="checkbox" data-psel="${esc(r.n)}" data-s="${s}" ${sel(r)?'checked':''} aria-label="Select for confirmation" style="width:16px;min-height:16px"></td><td>${st}</td></tr>`}).join('')}
   <tr style="font-weight:600"><td>Total</td><td class="num">${inr(tot)}</td>${ageT.map(v=>`<td class="num">${inr(v)}</td>`).join('')}${s==='cr'?'<td></td>':''}<td></td><td></td></tr></tbody></table></div><p class="small muted">Click a ${S_.one} to upload their statement, reconcile it, and record the confirmation.</p></div>${partyAdd(s)}
   ${(ageT[4]||msme.length||rows.some(r=>r.rec&&Math.abs(R2(r.book-r.rec.calc))>1)||rows.some(r=>r.p.conf?.recv&&Math.abs(R2((+r.p.conf.amt||0)-r.book))>1))?`<div class="row" style="margin-top:8px"><button class="btn ghost sm" data-act="pObs" data-v="${S_.k}">${ic('flag')}Raise observation</button></div>`:''}`;
  return h+concBox(d,S_.k)}
const partyAdd=s=>`<form class="row small" data-padd="${s}" style="margin-top:10px;gap:8px"><input name="n" placeholder="Add a ${SIDE[s].one} by name" style="max-width:20em"><button class="btn ghost sm" type="submit">${ic('plus')}Add</button></form>`;
function partyDetail(c,d,s,name,r){
  const p=r.p,S_=SIDE[s],cf=p.conf||{},rc=r.rec;
  let h=`<div class="row" style="margin-bottom:8px"><a href="#" data-act="pOpen" data-s="${s}" data-v="">← All ${S_.n.toLowerCase()}</a></div>
  <div class="grid2 even"><div><label class="drop" data-drop="pstmt" data-i="${esc(name)}" style="margin-bottom:10px">${ic('up')}<b>${esc(name)}: their statement of account</b><span class="small">${p.stmt?esc(p.stmt.file)+' · '+p.stmt.rows.length+' entries':'CSV or Excel with Date, Particulars / Ref, Debit, Credit (opening balance row is read too).'}</span><input type="file" data-file="pstmt" data-i="${esc(name)}" accept=".csv,.xlsx,.xls" hidden></label>
   <label class="drop" data-drop="pbook" data-i="${esc(name)}">${ic('up')}<b>Our ledger of ${esc(name)}</b><span class="small">${p.book?'Uploaded: '+esc(p.book.file):d.led?.[s]?.[name]?'From the books imported ('+r.R.length+' entries)':'Upload the Tally ledger (Date, Particulars, Vch type, Vch no, Debit, Credit).'}</span><input type="file" data-file="pbook" data-i="${esc(name)}" accept=".csv,.xlsx,.xls" hidden></label></div>
   <div class="panel"><h3>Balance and confirmation</h3><div class="form">
    <label class="f">Opening balance in our books (₹, ${s==='dr'?'receivable':'payable'} +)<input type="number" step="0.01" data-pp="open" data-n="${esc(name)}" data-s="${s}" value="${p.open??''}"></label>
    <label class="f">Balance as per books (₹)<input type="number" step="0.01" data-pp="bookBal" data-n="${esc(name)}" data-s="${s}" value="${p.bookBal??''}" placeholder="worked out: ${r.bal}"></label>
    <label class="f">Confirmation requested on<input type="date" data-pc="req" data-n="${esc(name)}" data-s="${s}" value="${esc(cf.req||'')}"></label>
    <label class="f">Reply received on<input type="date" data-pc="recv" data-n="${esc(name)}" data-s="${s}" value="${esc(cf.recv||'')}"></label>
    <label class="f">Balance they confirmed (₹)<input type="number" step="0.01" data-pc="amt" data-n="${esc(name)}" data-s="${s}" value="${cf.amt??''}"></label>
    <label class="f">How<select data-pc="mode" data-n="${esc(name)}" data-s="${s}">${opts({'':'—',email:'Email',letter:'Letter',portal:'Portal / statement'},cf.mode||'')}</select></label></div>
    <div class="row" style="margin-top:8px"><button class="btn ghost sm" data-act="pLetter" data-s="${s}" data-v="${esc(name)}">${ic('down')}Confirmation letter</button>${cf.recv?`<span class="small">${Math.abs(R2((+cf.amt||0)-r.book))<=1?'<span class="tag g">Agrees with books</span>':'<span class="tag r">Differs by '+inr(R2((+cf.amt||0)-r.book))+'</span>'}</span>`:''}</div></div></div>`;
  if(rc){const row=(l,L,sg)=>`<tr><td>${sg} ${esc(l)} (${L.length})</td><td class="num">${inr(rc.sm(L))}</td></tr>`;
    h+=`<div class="grid2 even" style="margin-top:12px"><div class="panel"><h3>${s==='cr'?'Creditor':'Debtor'} reconciliation statement as on ${fmtD(r.asOf)}</h3><table><tbody><tr><td>Balance as per ${S_.one}'s statement</td><td class="num">${inr(rc.theirBal)}</td></tr>
     ${row(rc.g.a[0],rc.g.a[1],'Add:')}${row(rc.g.b[0],rc.g.b[1],'Less:')}${row(rc.g.c[0],rc.g.c[1],'Less:')}${row(rc.g.e[0],rc.g.e[1],'Add:')}${rc.openDiff?`<tr><td>Add: difference in opening balances</td><td class="num">${inr(rc.openDiff)}</td></tr>`:''}
     <tr style="font-weight:600"><td>Balance as per books (reconciled)</td><td class="num">${inr(rc.calc)}</td></tr><tr><td>Balance as per books</td><td class="num">${inr(r.book)}</td></tr><tr style="font-weight:600"><td>Unexplained difference</td><td class="num">${sgn(R2(r.book-rc.calc))}</td></tr></tbody></table><p class="small muted">${rc.pairs} entries matched by amount, reference and date.</p></div>
     <div class="panel"><h3>Items to clear</h3>${['a','b','c','e'].filter(k=>rc.g[k][1].length).map(k=>`<p class="small" style="margin:6px 0 2px"><b>${esc(rc.g[k][0])}</b></p><table><tbody>${rc.g[k][1].slice(0,60).map(x=>`<tr><td>${fmtD(x.d)}</td><td>${esc(x.vno||x.ref||'')} ${esc(x.nar||'')}${x.tds?' <span class="tag y">TDS: party to adjust</span>':''}</td><td class="num">${inr(x.dr||x.cr)}</td></tr>`).join('')}</tbody></table>`).join('')||'<p class="small">Everything matched.</p>'}</div></div>`}
  return h}
function confLetter(c,d,s,name,bal){const asOf=partyAsOf(d,s);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Balance confirmation - ${esc(name)}</title><style>body{font:12pt/1.55 Georgia,serif;max-width:640px;margin:40px auto}td{padding:4px 8px;border:1px solid #999}</style></head><body>
  <p><b>${esc(c.name)}</b></p><p>Date: ${fmtD(today())}</p><p>To<br><b>${esc(name)}</b></p><p><b>Subject: Confirmation of balance as on ${fmtD(asOf)}</b></p>
  <p>Dear Sir / Madam,</p><p>As per our books of account, the balance in your account as on ${fmtD(asOf)} is <b>${inr(Math.abs(bal))}</b> ${s==='dr'?'receivable from you':'payable to you'}. Our internal auditors are verifying this balance.</p>
  <p>Please confirm the balance by signing below, or send us a statement of account for the period with the differences, <b>directly to our internal auditors</b>${session?.user?.email?' at '+esc(session.user.email):''}.</p>
  <table><tr><td>Balance as per our books</td><td>${inr(Math.abs(bal))} ${s==='dr'?'(Dr)':'(Cr)'}</td></tr><tr><td>Balance as per your books</td><td>&nbsp;</td></tr><tr><td>Difference, if any (statement attached)</td><td>&nbsp;</td></tr></table>
  <p>Yours faithfully,<br>For ${esc(c.name)}<br><br>Authorised signatory</p><hr><p>We confirm the above balance / the balance shown in the attached statement.<br><br>Signature and seal of ${esc(name)} ______________________ Date __________</p></body></html>`}

/* ---------- cash ---------- */
const DEN=[[500,'₹500 notes'],[200,'₹200 notes'],[100,'₹100 notes'],[50,'₹50 notes'],[20,'₹20 notes'],[10,'₹10 notes'],['c20','₹20 coins'],['c10','₹10 coins'],['c5','₹5 coins'],['c2','₹2 coins'],['c1','₹1 coins'],[2000,'₹2,000 notes (withdrawn from circulation)']];
const denVal=k=>+String(k).replace('c','');
function cashCalc(x){const phy=R2(DEN.reduce((t,[k])=>t+denVal(k)*(+x.den?.[k]||0),0)),iou=R2((x.ious||[]).reduce((t,i)=>t+(+i.amt||0),0)),book=x.book===''||x.book==null?null:+x.book;return{phy,iou,book,diff:book==null?null:R2(phy+iou-book)}}
function cashTab(c,d){
  const L=d.cash.counts;let h=`<div class="row" style="margin-bottom:10px"><button class="btn" data-act="cashNew">${ic('plus')}New cash count</button><span class="small muted">Count by denomination in the custodian's presence, preferably by surprise; agree with the cash book balance at the same time.</span></div>`;
  if(!L.length)return h+'<div class="empty">No cash count yet.</div>'+concBox(d,'cash');
  for(const x of L.slice().reverse()){const r=cashCalc(x),f=(k,l,t='text',w='')=>`<label class="f"${w}>${l}<input type="${t}" data-cash="${k}" data-cid="${x.id}" value="${esc(x[k]??'')}"></label>`;
    h+=`<div class="panel" style="margin-bottom:12px"><div class="row" style="margin-bottom:8px"><h3 class="sp" style="margin:0">Cash count ${fmtD(x.date)} ${esc(x.time||'')} · ${esc(x.place||'')}</h3>${r.diff==null?'<span class="tag n">Book balance needed</span>':Math.abs(r.diff)<=1?'<span class="tag g">Agrees</span>':`<span class="tag r">${r.diff<0?'Short':'Excess'} ${inr(Math.abs(r.diff))}</span>`}<button class="btn ghost sm" data-act="cashDel" data-v="${x.id}">Remove</button></div>
     <div class="grid2 even"><div class="form">${f('date','Date','date')}${f('time','Time','time')}${f('place','Cash box / location')}${f('cust','Cashier / custodian')}${f('by','Counted by')}${f('book','Cash book balance at the time (₹)','number')}</div>
     <div><table><thead><tr><th>Denomination</th><th class="num">Pieces</th><th class="num">Amount</th></tr></thead><tbody>${DEN.map(([k,l])=>`<tr><td>${l}</td><td class="num"><input type="number" min="0" data-cden="${k}" data-cid="${x.id}" value="${x.den?.[k]||''}" style="width:6em;text-align:right"></td><td class="num">${inr(denVal(k)*(+x.den?.[k]||0))}</td></tr>`).join('')}
      <tr style="font-weight:600"><td>Cash counted</td><td></td><td class="num">${inr(r.phy)}</td></tr><tr><td>Add: vouchers / IOUs not yet entered</td><td></td><td class="num">${inr(r.iou)}</td></tr><tr><td>Cash book balance</td><td></td><td class="num">${r.book==null?'—':inr(r.book)}</td></tr><tr style="font-weight:600"><td>Difference</td><td></td><td class="num">${r.diff==null?'—':sgn(r.diff)}</td></tr></tbody></table>
      <div class="small" style="margin-top:6px"><b>Vouchers / IOUs</b> ${(x.ious||[]).map((i,ix)=>`<div class="row" style="gap:6px;margin-top:4px"><input data-ciou="t" data-ix="${ix}" data-cid="${x.id}" value="${esc(i.t||'')}" placeholder="What" style="flex:1"><input type="number" data-ciou="amt" data-ix="${ix}" data-cid="${x.id}" value="${i.amt||''}" placeholder="₹" style="width:8em"></div>`).join('')}<button class="btn ghost sm" data-act="cashIou" data-v="${x.id}" style="margin-top:4px">${ic('plus')}Add</button></div></div></div>
     <label class="f wide" style="margin-top:8px">Notes / explanation<textarea data-cash="note" data-cid="${x.id}" rows="2">${esc(x.note||'')}</textarea></label></div>`}
  if(L.some(x=>{const r=cashCalc(x);return r.diff!=null&&Math.abs(r.diff)>1}))h+=`<button class="btn ghost sm" data-act="pObs" data-v="cash">${ic('flag')}Raise observation</button>`;
  return h+concBox(d,'cash')}

/* ---------- stock and fixed assets: sample, count / see, compare ---------- */
function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function parseStockList(rows){
  const H=findHeader(rows,r=>r.some(v=>/item|particular|name|description|product/.test(v))&&r.some(v=>/qty|quantity|closing/.test(v)));
  if(!H)throw new Error('No header with Item and Quantity columns was found.');const c=(...k)=>hcol(H.head,...k),ci={n:c('item','particular','name','description','product'),code:c('code','sku','part no'),loc:c('location','godown','store','warehouse'),q:c('qty','quantity','closing'),u:c('unit','uom'),rate:c('rate','price','cost'),v:c('value','amount')};
  const out=[];for(const r of rows.slice(H.h+1)){const n=String(r[ci.n]||'').trim();if(!n||/^(grand )?total/i.test(n))continue;const qs=String(r[ci.q]||''),q=num(qs.replace(/[a-z]+/ig,'')),u=ci.u>=0?String(r[ci.u]):(qs.match(/[a-z]+/i)||[''])[0],rate=ci.rate>=0?num(r[ci.rate]):0,v=ci.v>=0?num(r[ci.v]):R2(q*rate);if(!q&&!v)continue;
    out.push({id:'i'+out.length,n:n.slice(0,100),code:ci.code>=0?String(r[ci.code]):'',loc:ci.loc>=0?String(r[ci.loc]):'',q,u,rate:rate||(q?R2(v/q):0),v:R2(v)})}
  if(!out.length)throw new Error('No items with a quantity or value.');return out}
function parseFAR(rows){
  const H=findHeader(rows,r=>r.some(v=>/asset|description|particular/.test(v))&&r.some(v=>/cost|gross|value|amount/.test(v)));
  if(!H)throw new Error('No header with Asset / Description and Cost columns was found.');const c=(...k)=>hcol(H.head,...k),ci={tag:c('tag','asset id','asset no','asset code','code'),n:c('description','asset name','particular','asset'),loc:c('location','department','site'),dt:c('date','put to use','purchase'),cost:c('cost','gross','original'),wdv:c('wdv','net block','written down','book value')};
  const out=[];for(const r of rows.slice(H.h+1)){const n=String(r[ci.n]||'').trim();if(!n||/^total/i.test(n))continue;const cost=num(r[ci.cost]);if(!cost)continue;out.push({id:'a'+out.length,tag:ci.tag>=0&&ci.tag!==ci.n?String(r[ci.tag]):'',n:n.slice(0,100),loc:ci.loc>=0?String(r[ci.loc]):'',dt:ci.dt>=0?ymdOf(r[ci.dt]):'',v:R2(cost),wdv:ci.wdv>=0?num(r[ci.wdv]):null})}
  if(!out.length)throw new Error('No assets with a cost.');return out}
function drawPick(items,set){const tot=items.reduce((t,x)=>t+Math.abs(x.v),0),key=items.filter(x=>Math.abs(x.v)>=tot*(+set.keyPct||5)/100),rest=items.filter(x=>!key.includes(x)),R=rng(+set.seed||1),pool=rest.slice(),pick=[];
  const n=Math.min(+set.n||25,pool.length);for(let i=0;i<n;i++){const j=Math.floor(R()*pool.length);pick.push(pool.splice(j,1)[0])}return{ids:[...key,...pick].map(x=>x.id),key:key.length,tot}}
function stockTab(c,d){
  const s=d.stock;let h=`<label class="drop" data-drop="stock" style="margin-bottom:12px">${ic('up')}<b>Book stock list: CSV or Excel</b><span class="small">${s?esc(s.file)+' · '+s.items.length+' items · '+inrc(s.items.reduce((t,x)=>t+x.v,0)):'Tally Stock Summary or an item list with Item, Quantity, Rate, Value (and location if any).'}</span><input type="file" data-file="stock" accept=".csv,.xlsx,.xls" hidden></label>`;
  if(!s)return h+concBox(d,'stock');
  h+=sampleBar('stock',s,'Count every item worth at least');
  if(!s.sample?.length)return h+concBox(d,'stock');
  const S1=s.items.filter(x=>s.sample.includes(x.id)),cnt=s.cnt||{},done=S1.filter(x=>cnt[x.id]?.phy!==undefined&&cnt[x.id]?.phy!==''),cov=R2(S1.reduce((t,x)=>t+x.v,0)),tot=s.items.reduce((t,x)=>t+x.v,0);
  const dv=x=>R2(((+cnt[x.id]?.phy||0)-x.q)*x.rate),sh=done.filter(x=>dv(x)<-0.5),ex=done.filter(x=>dv(x)>0.5),bad=done.filter(x=>/damaged|slow|obsolete/.test(cnt[x.id]?.cond||''));
  h+=`<div class="kpis"><div class="kpi"><b>${done.length} / ${S1.length}</b><span>Items counted</span></div><div class="kpi"><b>${tot?Math.round(cov/tot*100):0}%</b><span>Of stock value covered</span></div><div class="kpi ${sh.length?'alert':''}"><b>${inrc(-R2(sh.reduce((t,x)=>t+dv(x),0)))}</b><span>Shortages (${sh.length})</span></div><div class="kpi ${ex.length?'alert':''}"><b>${inrc(R2(ex.reduce((t,x)=>t+dv(x),0)))}</b><span>Excess (${ex.length})</span></div><div class="kpi ${bad.length?'alert':''}"><b>${bad.length}</b><span>Damaged / slow / obsolete</span></div></div>
  <div class="panel"><div class="scroll"><table class="stack"><thead><tr><th>Item</th><th>Location</th><th class="num">Book qty</th><th class="num">Counted</th><th class="num">Difference</th><th class="num">Value of difference</th><th>Condition</th><th>Note</th></tr></thead><tbody>${S1.map(x=>{const k=cnt[x.id]||{},has=k.phy!==undefined&&k.phy!=='';return `<tr><td><b>${esc(x.n)}</b>${x.code?`<div class="small muted">${esc(x.code)}</div>`:''}${Math.abs(x.v)>=tot*(+s.set?.keyPct||5)/100?' <span class="tag n">Key item</span>':''}</td><td>${esc(x.loc)}</td><td class="num">${x.q} ${esc(x.u)}</td><td class="num"><input type="number" step="any" data-scnt="phy" data-id="${x.id}" value="${has?k.phy:''}" style="width:7em;text-align:right"></td><td class="num">${has?R2(+k.phy-x.q):'—'}</td><td class="num">${has?sgn(dv(x)):'—'}</td><td><select data-scnt="cond" data-id="${x.id}">${opts({'':'Good','damaged':'Damaged','slow':'Slow-moving','obsolete':'Obsolete'},k.cond||'')}</select></td><td><input data-scnt="note" data-id="${x.id}" value="${esc(k.note||'')}"></td></tr>`}).join('')}</tbody></table></div></div>
  ${sh.length||ex.length||bad.length?`<div class="row" style="margin-top:8px"><button class="btn ghost sm" data-act="pObs" data-v="stock">${ic('flag')}Raise observation</button></div>`:''}`;
  return h+concBox(d,'stock')}
const FARES={found:['g','Seen, in use'],idle:['y','Seen, not in use'],damaged:['y','Seen, damaged'],notag:['y','Seen, not tagged'],missing:['r','Not found']};
function favTab(c,d){
  const s=d.fav;let h=`<label class="drop" data-drop="far" style="margin-bottom:12px">${ic('up')}<b>Fixed asset register: CSV or Excel</b><span class="small">${s?esc(s.file)+' · '+s.items.length+' assets · cost '+inrc(s.items.reduce((t,x)=>t+x.v,0)):'Asset tag / code, description, location, date put to use, cost (and WDV).'}</span><input type="file" data-file="far" accept=".csv,.xlsx,.xls" hidden></label>`;
  if(!s)return h+concBox(d,'fav');
  h+=sampleBar('fav',s,'Verify every asset costing at least');if(!s.sample?.length)return h+concBox(d,'fav');
  const S1=s.items.filter(x=>s.sample.includes(x.id)),res=s.res||{},done=S1.filter(x=>res[x.id]?.r),cnt=k=>done.filter(x=>res[x.id].r===k);
  h+=`<div class="kpis"><div class="kpi"><b>${done.length} / ${S1.length}</b><span>Assets verified</span></div><div class="kpi ${cnt('missing').length?'alert':''}"><b>${cnt('missing').length}</b><span>Not found (${inrc(cnt('missing').reduce((t,x)=>t+x.v,0))})</span></div><div class="kpi ${cnt('idle').length+cnt('damaged').length?'alert':''}"><b>${cnt('idle').length+cnt('damaged').length}</b><span>Not in use / damaged</span></div><div class="kpi ${cnt('notag').length?'alert':''}"><b>${cnt('notag').length}</b><span>Not tagged</span></div><div class="kpi ${(s.extra||[]).length?'alert':''}"><b>${(s.extra||[]).length}</b><span>Seen, not in the register</span></div></div>
  <div class="panel"><div class="scroll"><table class="stack"><thead><tr><th>Asset</th><th>Tag</th><th>Location</th><th class="num">Cost</th><th>Result</th><th>Note</th></tr></thead><tbody>${S1.map(x=>`<tr><td><b>${esc(x.n)}</b>${x.dt?`<div class="small muted">Put to use ${fmtD(x.dt)}</div>`:''}</td><td>${esc(x.tag)}</td><td>${esc(x.loc)}</td><td class="num">${inr(x.v)}</td><td><div class="seg">${Object.entries(FARES).map(([k,[cl,l]])=>`<button data-act="faRes" data-id="${x.id}" data-v="${k}" class="${res[x.id]?.r===k?'on':''}" title="${l}">${l}</button>`).join('')}</div></td><td><input data-fanote="${x.id}" value="${esc(res[x.id]?.note||'')}"></td></tr>`).join('')}</tbody></table></div></div>
  <div class="panel" style="margin-top:12px"><h3>Assets seen but not in the register</h3>${(s.extra||[]).map((e,i)=>`<div class="row small" style="gap:8px;margin:4px 0">• ${esc(e.n)} ${e.loc?'· '+esc(e.loc):''} <button class="btn ghost sm" data-act="faExDel" data-v="${i}">Remove</button></div>`).join('')}<form class="row small" data-faex="1" style="gap:8px"><input name="n" placeholder="Asset" style="max-width:18em"><input name="loc" placeholder="Where" style="max-width:12em"><button class="btn ghost sm" type="submit">${ic('plus')}Add</button></form></div>
  ${cnt('missing').length||cnt('idle').length||cnt('damaged').length||cnt('notag').length||(s.extra||[]).length?`<div class="row" style="margin-top:8px"><button class="btn ghost sm" data-act="pObs" data-v="fav">${ic('flag')}Raise observation</button></div>`:''}`;
  return h+concBox(d,'fav')}
function sampleBar(k,s,lab){const st=s.set||{};
  return `<div class="panel" style="margin-bottom:12px"><div class="row" style="gap:10px;align-items:end"><label class="f" style="flex:0 1 12em">${lab} (% of total value)<input type="number" min="0" step="0.5" data-sset="keyPct" data-k="${k}" value="${st.keyPct??5}"></label><label class="f" style="flex:0 1 10em">Plus a random sample of<input type="number" min="0" data-sset="n" data-k="${k}" value="${st.n??25}"></label><label class="f" style="flex:0 1 8em">Seed<input type="number" min="1" data-sset="seed" data-k="${k}" value="${st.seed??1}"></label>
   <button class="btn" data-act="sDraw" data-v="${k}">${s.sample?.length?'Draw again':'Draw the sample'}</button><button class="btn ghost" data-act="sAll" data-v="${k}">Take all ${s.items.length}</button>${s.sample?.length?`<span class="small muted">${s.sample.length} selected</span>`:''}</div></div>`}

/* ---------- statutory due dates ---------- */
const MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function compRows(c,d){
  const fy=d.fy,y=+fy.slice(0,4),set=d.comp.set||{},emp=+c.employees||0,co=['private','opc','public','listed','sec8'].includes(c.type),gst=isGstin(c.gstin);
  const on={gst,qrmp:!!set.qrmp,tds:set.tds!==false,pf:set.pf??emp>=20,esi:set.esi??emp>=10,adv:set.adv!==false,roc:set.roc??co,itr:set.itr!==false};
  const R=[],ym=(yy,mm,dd)=>`${yy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`,nx=(m,yy)=>m===12?[1,yy+1]:[m+1,yy];
  for(let i=0;i<12;i++){const m=(3+i)%12+1,yy=y+(i>8?1:0),[nm,ny]=nx(m,yy),lab=MN[m-1]+'-'+String(yy).slice(2);
    if(on.gst){if(!on.qrmp){R.push({k:'g1-'+m,law:'GST',what:'GSTR-1',per:lab,due:ym(ny,nm,11)});R.push({k:'g3-'+m,law:'GST',what:'GSTR-3B and tax payment',per:lab,due:ym(ny,nm,20)})}
      else if([6,9,12,3].includes(m)){R.push({k:'g1-'+m,law:'GST',what:'GSTR-1 (quarterly)',per:'Quarter to '+lab,due:ym(ny,nm,13)});R.push({k:'g3-'+m,law:'GST',what:'GSTR-3B (quarterly)',per:'Quarter to '+lab,due:ym(ny,nm,22)})}
      else R.push({k:'pmt-'+m,law:'GST',what:'PMT-06 tax payment',per:lab,due:ym(ny,nm,25)})}
    if(on.tds)R.push({k:'tds-'+m,law:'Income-tax',what:'TDS / TCS deposit',per:lab,due:m===3?ym(yy,4,30):ym(ny,nm,7)});
    if(on.pf)R.push({k:'pf-'+m,law:'Labour',what:'PF contribution and ECR',per:lab,due:ym(ny,nm,15)});
    if(on.esi)R.push({k:'esi-'+m,law:'Labour',what:'ESI contribution',per:lab,due:ym(ny,nm,15)})}
  if(on.tds)[['Q1 (Apr–Jun)',ym(y,7,31)],['Q2 (Jul–Sep)',ym(y,10,31)],['Q3 (Oct–Dec)',ym(y+1,1,31)],['Q4 (Jan–Mar)',ym(y+1,5,31)]].forEach(([q,due],i)=>R.push({k:'tdsr-'+i,law:'Income-tax',what:'TDS / TCS returns',per:q,due}));
  if(on.adv)[[6,15,'15%'],[9,15,'45%'],[12,15,'75%'],[3,15,'100%']].forEach(([m,dd,p])=>R.push({k:'adv-'+m,law:'Income-tax',what:'Advance tax (cumulative '+p+')',per:'FY '+fy,due:ym(m===3?y+1:y,m,dd)}));
  const prev=(y-1)+'-'+String(y%100).padStart(2,'0');
  if(on.gst&&(+c.turnover||0)>0.02)R.push({k:'g9',law:'GST',what:'GSTR-9 annual return'+((+c.turnover||0)>0.05?' and GSTR-9C':''),per:'FY '+prev,due:ym(y,12,31)});
  if(on.itr)R.push({k:'itr',law:'Income-tax',what:'Income-tax return (tax audit cases); tax audit report a month earlier',per:'FY '+prev,due:ym(y,10,31)});
  if(on.roc){R.push({k:'aoc4',law:'Company law',what:'AOC-4 financial statements (30 days from AGM)',per:'FY '+prev,due:ym(y,10,30)});R.push({k:'mgt7',law:'Company law',what:'MGT-7 annual return (60 days from AGM)',per:'FY '+prev,due:ym(y,11,29)})}
  const t=today(),done=d.comp.done||{};
  /* TDS deposits: the first challan paid from the 8th of the month (up to 3 months after the due date) is taken as the deposit date, marked "from challans" */
  const CH=(rdoc(c)?.chl?.rows||[]).slice().sort((a,b)=>a.date.localeCompare(b.date));
  const usedCh=new Set(),AUTO={};for(const r of R.filter(r=>r.k.startsWith('tds-')).sort((a,b)=>a.due.localeCompare(b.due))){const m=+r.k.slice(4),yy=m>=4?y:y+1,from=`${yy}-${String(m).padStart(2,'0')}-08`,ch=CH.find(x=>!usedCh.has(x)&&x.date>=from&&x.date<=addDays(r.due,90));if(ch){usedCh.add(ch);AUTO[r.k]={date:ch.date,note:'From challans: BSR '+ch.bsr+' / '+ch.serial,auto:true}}}
  const auto=r=>AUTO[r.k]||null;
  return{on,rows:R.sort((a,b)=>a.due.localeCompare(b.due)).map(r=>{const x=done[r.k]?.date||done[r.k]?.na?done[r.k]:(auto(r)||done[r.k]||{}),st=x.na?'na':x.date?(x.date<=r.due?'ok':'late'):r.due<t?'over':'due';return{...r,x,st,late:x.date&&x.date>r.due?dayDiff(x.date,r.due):r.due<t&&!x.date?dayDiff(t,r.due):0}})}}
const CST={ok:['g','On time'],late:['r','Late'],over:['r','Overdue'],due:['n','Not yet due'],na:['n','Not applicable']};
function compTab(c,d){
  const {on,rows}=compRows(c,d),t=today(),show=rows.filter(r=>r.due<=addDays(t,45)),f=ui.compF||'all',L=show.filter(r=>f==='all'||r.law===f),cn=k=>show.filter(r=>r.st===k).length;
  const tg=(k,l)=>`<label class="chip" style="cursor:pointer"><input type="checkbox" data-cset="${k}" ${on[k]?'checked':''} style="width:16px;min-height:16px">${l}</label>`;
  return `<div class="row" style="gap:8px;margin-bottom:10px">${tg('qrmp','GST quarterly (QRMP)')}${tg('tds','Deducts TDS / TCS')}${tg('pf','PF')}${tg('esi','ESI')}${tg('adv','Advance tax')}${tg('roc','Company filings')}${tg('itr','Income-tax return')}</div>
  <div class="kpis"><div class="kpi good"><b>${cn('ok')}</b><span>On time</span></div><div class="kpi ${cn('late')?'alert':''}"><b>${cn('late')}</b><span>Filed / paid late</span></div><div class="kpi ${cn('over')?'alert':''}"><b>${cn('over')}</b><span>Overdue, not filed</span></div><div class="kpi"><b>${cn('due')}</b><span>Due in the next 45 days</span></div></div>
  <div class="panel"><div class="row" style="margin-bottom:8px"><h3 class="sp" style="margin:0">Due dates, FY ${esc(d.fy)}</h3><div class="seg">${['all','GST','Income-tax','Labour','Company law'].map(k=>`<button data-act="compF" data-v="${k}" class="${f===k?'on':''}">${k==='all'?'All':k}</button>`).join('')}</div><button class="btn ghost sm" data-act="compCsv">${ic('down')}CSV</button></div>
  <div class="scroll"><table class="stack"><thead><tr><th>Law</th><th>Return / payment</th><th>Period</th><th>Due date</th><th>Filed / paid on</th><th>Status</th><th>Note</th><th>N/A</th></tr></thead><tbody>${L.map(r=>`<tr><td>${esc(r.law)}</td><td>${esc(r.what)}</td><td>${esc(r.per)}</td><td>${fmtD(r.due)}</td><td><input type="date" data-comp="date" data-k="${r.k}" value="${esc(r.x.date||'')}"></td><td><span class="tag ${CST[r.st][0]}">${CST[r.st][1]}${r.late?' '+r.late+' days':''}</span></td><td><input data-comp="note" data-k="${r.k}" value="${esc(r.x.note||'')}" placeholder="ARN / challan / reason">${r.x.auto?' <span class="tag n">Auto</span>':''}</td><td><input type="checkbox" data-comp="na" data-k="${r.k}" ${r.x.na?'checked':''} style="width:16px;min-height:16px"></td></tr>`).join('')||'<tr><td colspan="8" class="muted">Nothing due yet.</td></tr>'}</tbody></table></div>
  <p class="small muted">Standard due dates; check for any extension notified. Late filing or payment attracts interest and late fees.</p></div>
  ${cn('late')||cn('over')?`<div class="row" style="margin-top:8px"><button class="btn ghost sm" data-act="pObs" data-v="comp">${ic('flag')}Raise observation</button></div>`:''}${concBox(d,'comp')}`}

/* ---------- analytical review ---------- */
function arCalc(c){const r=rdoc(c),fm=fyMonths(fyNow()),rows=[];if(!r)return{rows,avg:0};
  for(const m of fm){const s=r.bS?.months?.[m]?.tot,p=r.bP?.months?.[m]?.tot;if(!s&&!p)continue;rows.push({m,s:s?.tx||0,p:p?.tx||0,ot:s?taxOf(s):0,it:p?taxOf(p):0})}
  const avg=rows.length?rows.reduce((t,x)=>t+x.s,0)/rows.length:0,pr=rows.length?rows.reduce((t,x)=>t+x.p,0)/Math.max(1,rows.reduce((t,x)=>t+x.s,0)):0;
  rows.forEach((x,i)=>{x.mom=i&&rows[i-1].s?R2((x.s-rows[i-1].s)/rows[i-1].s*100):null;x.dev=avg?R2((x.s-avg)/avg*100):0;x.pr=x.s?R2(x.p/x.s*100):null;x.flag=[Math.abs(x.dev)>30&&`sales ${x.dev>0?'+':''}${Math.round(x.dev)}% vs average`,x.mom!=null&&Math.abs(x.mom)>40&&`sales ${x.mom>0?'+':''}${Math.round(x.mom)}% vs last month`,x.pr!=null&&Math.abs(x.pr-pr*100)>15&&`purchases ${Math.round(x.pr)}% of sales (average ${Math.round(pr*100)}%)`].filter(Boolean)});
  return{rows,avg,pr}}
function arTab(c,d){const {rows,avg,pr}=arCalc(c);
  if(!rows.length)return `<div class="empty">Import the books on the Programme tab: the month-wise sales and purchases come from them.</div>`+concBox(d,'ar');
  const fl=rows.filter(x=>x.flag.length);
  return `<div class="kpis"><div class="kpi"><b>${inrc(avg)}</b><span>Average monthly sales (taxable)</span></div><div class="kpi"><b>${Math.round(pr*100)}%</b><span>Purchases as % of sales</span></div><div class="kpi ${fl.length?'alert':''}"><b>${fl.length}</b><span>Months to explain</span></div></div>
  <div class="panel"><div class="scroll"><table class="stack"><thead><tr><th>Month</th><th class="num">Sales</th><th class="num">vs last month</th><th class="num">Purchases</th><th class="num">Purchases / sales</th><th class="num">Output GST</th><th class="num">Input GST</th><th>Look at</th><th>Explanation</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${mLabel(x.m)}</td><td class="num">${inr(x.s)}</td><td class="num">${x.mom==null?'—':(x.mom>0?'+':'')+x.mom+'%'}</td><td class="num">${inr(x.p)}</td><td class="num">${x.pr==null?'—':x.pr+'%'}</td><td class="num">${inr(x.ot)}</td><td class="num">${inr(x.it)}</td><td>${x.flag.map(f=>`<span class="tag y">${esc(f)}</span>`).join(' ')}</td><td>${x.flag.length?`<input data-arnote="${x.m}" value="${esc(d.ar.notes?.[x.m]||'')}" placeholder="Reason given by the client">`:''}</td></tr>`).join('')}</tbody></table></div><p class="small muted">Months are flagged when sales move more than 30% from the average or 40% from the previous month, or purchases move more than 15 points as a share of sales.</p></div>`+concBox(d,'ar')}

/* ---------- conclusion box shared by the procedures ---------- */
function concBox(d,k){const x=d.conc?.[k]||{};return `<div class="panel" style="margin-top:14px"><h3>Auditor's conclusion: ${esc(PR[k]?.n||k)}</h3><div class="form"><label class="f wide">Conclusion<select data-pconc="${k}">${opts({'':'Not concluded',ok:'Satisfactory / differences explained',issue:'Exceptions need action'},x.st||'')}</select></label><label class="f wide">Working notes<textarea data-pnote="${k}" rows="2" placeholder="What was checked, explanations received, documents seen">${esc(x.text||'')}</textarea></label></div></div>`}

/* ---------- the programme: status of each procedure ---------- */
function pStatus(k,c,a){
  const d=pOpen(c),cc=d.conc?.[k]?.st;if(a&&a.na?.[k]&&k!=='chk'&&!UNI[a.t]?.must)return{st:'na',text:'Not applicable: '+a.na[k]};
  const m=typeof mandatory==='function'?mandatory(c):null;
  if(k==='vouch')return m?{st:m.vouch.st,text:m.vouch.text}:{st:'todo',text:''};
  if(k==='gst')return m?{st:m.gst.st,text:m.gst.text}:{st:'todo',text:''};
  if(k==='chk'){if(!a)return{st:'todo',text:''};const n=a.items.length,t=a.items.filter(i=>i.r).length,ex=a.items.filter(i=>i.r==='ex').length;return{st:n&&t===n?'done':t?'doing':'todo',text:`${t} of ${n} steps tested`+(ex?` · ${ex} exception${ex===1?'':'s'}`:'')}}
  if(k==='tds'){const t=m?.tds;return{st:rdoc(c)?.notes?.r5?.conc?'done':'opt',text:t?.text||''}}
  if(k==='tests'){const t=a?.tests;return t?{st:'done',text:t.res.filter(r=>r.total).length+' tests with hits on '+esc(t.file||'the ledger')}:{st:'todo',text:'Upload a ledger to test'}}
  if(k==='brs'){const L=d.brs.accts;if(!L.length)return{st:'todo',text:'No bank account yet'};const R=L.map(ac=>brsCalc(ac,d)),ok=R.filter(r=>r.diff!=null&&Math.abs(r.diff)<=1).length;
    return{st:ok===L.length||cc?'done':R.some(r=>r.hasBank||r.hasBook)?'doing':'todo',text:`${ok} of ${L.length} account${L.length===1?'':'s'} reconciled`+(R.some(r=>r.stale.length)?' · stale cheques found':'')}}
  if(k==='drs'||k==='crs'){const s=k==='drs'?'dr':'cr',names=[...new Set([...Object.keys(d.led?.[s]||{}),...Object.keys(d.party[s].P)])];if(!names.length)return{st:'todo',text:'No '+SIDE[s].n.toLowerCase()+' yet'};
    const rows=names.map(n=>partyCalc(d,s,n)),tot=rows.reduce((t,r)=>t+Math.max(r.book,0),0),mat=+d.party[s].mat||Math.max(tot*0.05,1),sel=rows.filter(r=>r.p.sel===true||(r.p.sel!==false&&(Math.abs(r.book)>=mat||(s==='cr'&&r.p.msme&&r.over45>0)))),dn=sel.filter(r=>r.p.conf?.recv||(r.rec&&Math.abs(R2(r.book-r.rec.calc))<=1));
    return{st:(sel.length&&dn.length===sel.length)||cc?'done':dn.length||rows.some(r=>r.p.conf?.req||r.p.stmt)?'doing':'todo',text:`${dn.length} of ${sel.length} selected confirmed or reconciled`}}
  if(k==='cash'){const L=d.cash.counts.map(cashCalc);if(!L.length)return{st:'todo',text:'No count yet'};const ok=L.filter(r=>r.diff!=null&&Math.abs(r.diff)<=1).length;return{st:ok===L.length||cc?'done':'doing',text:L.length+' count'+(L.length===1?'':'s')+(L.some(r=>r.diff!=null&&Math.abs(r.diff)>1)?' · difference found':'')}}
  if(k==='stock'||k==='fav'){const s=d[k];if(!s)return{st:'todo',text:k==='stock'?'No stock list yet':'No asset register yet'};if(!s.sample?.length)return{st:'doing',text:'Sample not drawn'};
    const n=s.sample.filter(id=>k==='stock'?(s.cnt?.[id]?.phy!==undefined&&s.cnt?.[id]?.phy!==''):s.res?.[id]?.r).length;return{st:n===s.sample.length||cc?'done':'doing',text:`${n} of ${s.sample.length} ${k==='stock'?'items counted':'assets verified'}`}}
  if(k==='comp'){const R=compRows(c,d).rows.filter(r=>r.due<=today()),open=R.filter(r=>r.st==='over'),late=R.filter(r=>r.st==='late');const filled=R.filter(r=>r.x.date||r.x.na).length;
    return{st:(R.length&&!open.length)||cc?'done':filled?'doing':'todo',text:`${filled} of ${R.length} due items checked`+(late.length?` · ${late.length} late`:'')+(open.length?` · ${open.length} open`:'')}}
  if(k==='ar'){const {rows}=arCalc(c);if(!rows.length)return{st:'todo',text:'Books not imported yet'};const fl=rows.filter(x=>x.flag.length),ex=fl.filter(x=>d.ar.notes?.[x.m]);return{st:cc?'done':'doing',text:`${rows.length} months · ${ex.length} of ${fl.length} unusual months explained`}}
  return{st:'todo',text:''}}
function progStatus(a,c){const L=programmeOf(a).map(k=>({k,...pStatus(k,c,a)})),need=L.filter(x=>!POPT(x.k)),dn=need.filter(x=>x.st==='done'||x.st==='na');return{L,need,dn,done:dn.length===need.length}}
const PTAG={done:['g','Done'],doing:['y','In progress'],todo:['r','To do'],na:['n','Not applicable'],opt:['n','Optional']};
function programmeTab(a,c){
  const P=progStatus(a,c),d=pOpen(c),u=UNI[a.t];
  return `<div class="grid2 even" style="margin-bottom:14px"><label class="drop" data-drop="books">${ic('up')}<b>Import the books once: Tally Day Book XML</b><span class="small">${d.led?'Last: '+esc(d.led.file)+' · '+fmtD(d.led.from)+' to '+fmtD(d.led.to):'One file feeds vouching, GST & TDS, bank reconciliation, debtors, creditors and the analytical review. CSV / Excel registers work per procedure too.'}</span><input type="file" data-file="books" accept=".xml,.csv,.xlsx,.xls" hidden></label>
   <div class="panel"><h3>${esc(TEMPLATES[a.t]?.name||a.title)}${u?` <span class="tag n">${esc(CATS.find(x=>x[0]===u.cat)?.[1]||'')}</span>`:''}</h3>${u?`<p class="small" style="margin:0 0 6px">Covers: ${u.covers.map(esc).join(' · ')}</p>`:''}<p class="small muted" style="margin:0">${P.dn.length} of ${P.need.length} required procedures done${P.done?' · <b style="color:var(--ok)">ready to report</b>':' · needed before the audit is reported'}.</p></div></div>
   <div class="scroll"><table class="stack"><thead><tr><th>#</th><th>Procedure</th><th>Standard / law</th><th>Status</th><th>Result</th><th></th></tr></thead><tbody>${P.L.map((x,i)=>`<tr><td>${i+1}</td><td><a href="#" data-act="ptab" data-v="${x.k}"><b>${esc(PR[x.k].n)}</b></a>${POPT(x.k)?' <span class="tag n">Optional</span>':''}<div class="small muted">${esc(PR[x.k].why)}</div>
     ${ui.naEdit===x.k?`<form class="row small" data-naform="${x.k}" style="gap:6px;margin-top:4px"><input name="r" placeholder="Why it does not apply" required style="flex:1"><button class="btn sm" type="submit">Save</button><button class="btn ghost sm" type="button" data-act="naCancel">Cancel</button></form>`:''}</td><td class="small">${esc(PR[x.k].ref)}</td><td><span class="tag ${PTAG[x.st][0]}">${PTAG[x.st][1]}</span></td><td class="small">${x.text}</td>
     <td style="white-space:nowrap"><button class="btn ghost sm" data-act="ptab" data-v="${x.k}">Open</button>${x.k==='chk'||UNI[a.t]?.must||POPT(x.k)?'':x.st==='na'?`<button class="btn ghost sm" data-act="naUndo" data-v="${x.k}">Applies</button>`:`<button class="btn ghost sm" data-act="naEdit" data-v="${x.k}">N/A</button>`}</td></tr>`).join('')}</tbody></table></div>
   <p class="small muted" style="margin-top:8px">Other procedures can be added from the Procedures tab whenever needed. The data of each procedure is kept per client and financial year, so the client's other audits of the year use the same work.</p>`}
const PK=['chk','vouch','gst','tds','brs','cash','drs','crs','stock','fav','comp','ar','tests'];
function procTab(a,c){
  const prog=programmeOf(a),cur=PK.includes(ui.ptab)?ui.ptab:prog[0],d=pOpen(c),more=PK.filter(k=>!prog.includes(k));
  const pill=(k,dim)=>{const s=pStatus(k,c,a);return `<button class="chip" data-act="ptab" data-v="${k}" style="${cur===k?'border-color:var(--acc);color:var(--acc-ink);font-weight:700;':''}${dim?'opacity:.75':''}"><span style="color:var(--${s.st==='done'?'ok':s.st==='todo'?'hi':'muted'})">●</span> ${esc(PR[k].n)}</button>`};
  const body={chk:()=>{ui.atab='checklist';return checklistTab(a,auditEvidence(a),S.observations.filter(o=>o.auditId===a.id))},vouch:()=>vouchingTab(c),gst:()=>reconTab(c),tds:()=>reconTab(c),brs:()=>brsTab(c,d),cash:()=>cashTab(c,d),drs:()=>partyTab(c,d,'dr'),crs:()=>partyTab(c,d,'cr'),stock:()=>stockTab(c,d),fav:()=>favTab(c,d),comp:()=>compTab(c,d),ar:()=>arTab(c,d),tests:()=>testsTab(a)}[cur];
  return `<div class="row" style="gap:6px;margin-bottom:6px">${prog.map(k=>pill(k)).join('')}</div>${more.length?`<details style="margin-bottom:12px"><summary class="small muted" style="cursor:pointer">More procedures</summary><div class="row" style="gap:6px;margin-top:6px">${more.map(k=>pill(k,1)).join('')}</div></details>`:''}
   <div class="row" style="margin:4px 0 12px"><h2 class="sp" style="margin:0;font-size:18px">${esc(PR[cur].n)}</h2><span class="tag n">${esc(PR[cur].ref)}</span></div><p class="small muted" style="margin:-6px 0 12px">${esc(PR[cur].why)} Kept for ${esc(c.name)}, FY ${esc(fyNow())}.</p>${body()}`}

/* ---------- client: audit plan; all audit types ---------- */
function planTab(c){
  const P=planFor(c),au=S.audits.filter(a=>a.clientId===c.id);
  return `<p class="small muted" style="margin:0 0 12px">The audits for ${esc(c.name)}, grouped by area, from the client master and risk register Internal audit is monthly; vouching and GST &amp; TDS compliance are mandatory every month.</p>`+CATS.map(([cat,cl])=>{const L=P.filter(x=>UNI[x.t]?.cat===cat);if(!L.length)return'';
    return `<h2 class="section">${esc(cl)}</h2><div class="scroll"><table class="stack"><thead><tr><th>Audit</th><th>Covers</th><th>Audit procedures</th><th>How often</th><th>Audits</th><th></th></tr></thead><tbody>${L.map(x=>{const A=au.filter(a=>a.t===x.t),u=UNI[x.t],lv=x.r?level(x.r.i*x.r.c):'';
      return `<tr style="${x.on?'':'opacity:.6'}"><td><b>${esc(TEMPLATES[x.t].name)}</b>${x.must?' <span class="tag n">Mandatory</span>':''}${x.on?'':'<div class="small muted">Not in this year\'s plan</div>'}${x.why.length?`<div class="small muted">Because of: ${esc(x.why.slice(0,3).join(', '))}</div>`:''}</td><td class="small">${u.covers.map(esc).join(' · ')}</td><td class="small">${procList(x.t)}</td><td class="small">${x.on?(x.must?'<b>Every month · mandatory</b>':'Every month'):'—'}</td><td class="small">${A.map(a=>`<a href="#audit-${a.id}">${esc(a.period||a.title)}</a> <span class="tag n">${esc(a.stage)}</span>`).join('<br>')||'—'}</td><td><button class="btn ${x.on?'':'ghost '}sm" data-act="newAudit" data-t="${x.t}">${ic('plus')}Start</button></td></tr>`}).join('')}</tbody></table></div>`}).join('')}
function procList(t){const u=UNI[t],tools=(u?.procs||[]).map(k=>PR[k].n);
  return `<ol class="small" style="margin:0;padding-left:18px">${TEMPLATES[t].items.map(([q,ref])=>`<li>${esc(q)} <span class="muted">(${esc(ref)})</span></li>`).join('')}</ol>${tools.length?`<p class="small" style="margin:4px 0 0"><b>Done with:</b> ${tools.map(esc).join(' · ')}</p>`:''}`}
function vUniverse(){
  setTop([['Audits','audits'],['Audit types']]);
  return `<div class="head"><div class="titles"><h1>Audit types</h1><p class="sub">Every internal audit in Smart Auditing, by area: what it covers, its procedures and its checklist. The client master decides which apply to a client.</p></div></div>${auditSubnav('universe')}`+CATS.map(([cat,cl])=>{const L=Object.keys(UNI).filter(t=>UNI[t].cat===cat&&TEMPLATES[t]);
    return `<h2 class="section">${esc(cl)}</h2><div class="grid2 even">${L.map(t=>`<div class="panel"><h3>${esc(TEMPLATES[t].name)}${UNI[t].must?' <span class="tag n">Mandatory every month</span>':''}</h3><p class="small" style="margin:0 0 6px"><b>Covers:</b> ${UNI[t].covers.map(esc).join(' · ')}</p><p class="small" style="margin:0 0 4px"><b>Audit procedures:</b></p>${procList(t)}</div>`).join('')}</div>`}).join('')}

/* ---------- report: Annexure F ---------- */
function programmeReport(a){
  const c=S.clients.find(x=>x.id===a.clientId);if(!c)return'';const P=progStatus(a,c),d=pOpen(c),has=k=>programmeOf(a).includes(k);
  let h=`<h2>Annexure F — Audit programme and procedures</h2><table><thead><tr><th>Procedure</th><th>Standard / law</th><th>Status</th><th>Result</th><th>Conclusion</th></tr></thead><tbody>${P.L.map(x=>`<tr><td>${esc(PR[x.k].n)}</td><td>${esc(PR[x.k].ref)}</td><td>${PTAG[x.st][1]}</td><td>${x.text}</td><td>${esc({ok:'Satisfactory',issue:'Needs action'}[d.conc?.[x.k]?.st]||'')}${d.conc?.[x.k]?.text?' — '+esc(d.conc[x.k].text):''}</td></tr>`).join('')}</tbody></table>`;
  if(has('brs'))for(const ac of d.brs.accts){const r=brsCalc(ac,d);if(!r.hasBank||!r.hasBook)continue;h+=`<h3>Bank reconciliation: ${esc(ac.name)} as on ${fmtD(r.asOf)}</h3><table><tbody><tr><td>Balance as per bank statement</td><td>${r.bankBal==null?'—':inr(r.bankBal)}</td></tr><tr><td>Add: deposits not credited (${r.A.length})</td><td>${inr(r.sA)}</td></tr><tr><td>Less: cheques not presented (${r.Bq.length}, of which stale ${r.stale.length})</td><td>${inr(r.sB)}</td></tr><tr><td>Less: credited by bank, not in books (${r.C.length})</td><td>${inr(r.sC)}</td></tr><tr><td>Add: debited by bank, not in books (${r.D.length})</td><td>${inr(r.sD)}</td></tr><tr><td><b>Balance as per books (reconciled)</b></td><td>${r.calc==null?'—':inr(r.calc)}</td></tr><tr><td>Balance as per books</td><td>${r.bookBal==null?'Not given':inr(r.bookBal)}</td></tr><tr><td><b>Unexplained difference</b></td><td>${r.diff==null?'—':inr(r.diff)}</td></tr></tbody></table>`}
  for(const s of ['dr','cr']){if(!has(SIDE[s].k))continue;const names=[...new Set([...Object.keys(d.led?.[s]||{}),...Object.keys(d.party[s].P)])];if(!names.length)continue;const rows=names.map(n=>({n,...partyCalc(d,s,n)})).sort((a,b)=>Math.abs(b.book)-Math.abs(a.book)),x=rows.filter(r=>r.p.conf?.recv||r.rec);
    h+=`<h3>${SIDE[s].n}: confirmations and reconciliations</h3><table><thead><tr><th>Party</th><th>Balance as per books</th><th>Confirmed / reconciled</th><th>Difference</th><th>Over 180 days</th>${s==='cr'?'<th>MSME over 45 days</th>':''}</tr></thead><tbody>${rows.slice(0,25).map(r=>{const o=r.p.conf?.recv?+r.p.conf.amt||0:r.rec?r.rec.calc:null;return `<tr><td>${esc(r.n)}</td><td>${inr(r.book)}</td><td>${o==null?'Not yet':inr(o)}</td><td>${o==null?'—':inr(R2(r.book-o))}</td><td>${inr(r.age[4])}</td>${s==='cr'?`<td>${r.p.msme?inr(r.over45):'—'}</td>`:''}</tr>`}).join('')}</tbody></table><p>${x.length} of ${rows.length} parties confirmed or reconciled.</p>`}
  if(has('cash'))for(const x of d.cash.counts){const r=cashCalc(x);h+=`<h3>Cash verification certificate</h3><p>Cash in hand at ${esc(x.place||'the office')} was counted on ${fmtD(x.date)} ${esc(x.time||'')} by ${esc(x.by||'the auditor')} in the presence of ${esc(x.cust||'the cashier')}: notes and coins ${inr(r.phy)}, vouchers / IOUs not yet entered ${inr(r.iou)}, against a cash book balance of ${r.book==null?'—':inr(r.book)}${r.diff==null?'':'; difference '+inr(r.diff)}.${x.note?' '+esc(x.note):''}</p>`}
  if(has('stock')&&d.stock?.sample?.length){const s=d.stock,S1=s.items.filter(x=>s.sample.includes(x.id)),dv=x=>R2(((+s.cnt?.[x.id]?.phy||0)-x.q)*x.rate),dn=S1.filter(x=>s.cnt?.[x.id]?.phy!==undefined&&s.cnt?.[x.id]?.phy!=='');h+=`<h3>Physical stock verification</h3><p>${dn.length} of ${S1.length} sampled items counted (${inrc(S1.reduce((t,x)=>t+x.v,0))} of ${inrc(s.items.reduce((t,x)=>t+x.v,0))} book value). Shortages ${inr(-R2(dn.filter(x=>dv(x)<0).reduce((t,x)=>t+dv(x),0)))}; excess ${inr(R2(dn.filter(x=>dv(x)>0).reduce((t,x)=>t+dv(x),0)))}.</p>`}
  if(has('fav')&&d.fav?.sample?.length){const s=d.fav,res=s.res||{},c2=k=>s.sample.filter(id=>res[id]?.r===k).length;h+=`<h3>Fixed assets physical verification</h3><p>${s.sample.filter(id=>res[id]?.r).length} of ${s.sample.length} sampled assets verified: ${c2('found')} seen in use, ${c2('idle')} not in use, ${c2('damaged')} damaged, ${c2('notag')} not tagged, ${c2('missing')} not found; ${(s.extra||[]).length} seen but not in the register.</p>`}
  if(has('comp')){const R=compRows(c,d).rows.filter(r=>r.st==='late'||r.st==='over');if(R.length)h+=`<h3>Statutory compliance exceptions</h3><table><thead><tr><th>Return / payment</th><th>Period</th><th>Due</th><th>Filed / paid</th><th>Delay</th></tr></thead><tbody>${R.map(r=>`<tr><td>${esc(r.what)}</td><td>${esc(r.per)}</td><td>${fmtD(r.due)}</td><td>${r.x.date?fmtD(r.x.date):'Not yet'}</td><td>${r.late} days</td></tr>`).join('')}</tbody></table>`}
  if(has('ar')){const {rows}=arCalc(c),fl=rows.filter(x=>x.flag.length);if(fl.length)h+=`<h3>Analytical review: unusual months</h3><table><thead><tr><th>Month</th><th>Sales</th><th>Observation</th><th>Explanation</th></tr></thead><tbody>${fl.map(x=>`<tr><td>${mLabel(x.m)}</td><td>${inr(x.s)}</td><td>${esc(x.flag.join('; '))}</td><td>${esc(d.ar.notes?.[x.m]||'Not explained')}</td></tr>`).join('')}</tbody></table>`}
  return h}

/* ---------- actions ---------- */
const Cx=()=>C(),pd=()=>pOpen(Cx());
const csvOf=rows=>rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n');
const curBrs=d=>d.brs.accts.find(a=>a.id===ui.brsA)||d.brs.accts[0];
Object.assign(ACT,{
  ptab:t=>{ui.atab='proc';ui.ptab=t.dataset.v;if(t.dataset.v==='tds')ui.rtab='r5';else if(t.dataset.v==='gst'&&ui.rtab==='r5')ui.rtab='data';render()},
  naEdit:t=>{ui.naEdit=t.dataset.v;render()},naCancel:()=>{ui.naEdit=null;render()},
  naUndo:t=>{const a=A(),na={...(a.na||{})};delete na[t.dataset.v];put('audits',a.id,{...a,na})},
  brsA:t=>{ui.brsA=t.dataset.v;render()},
  brsAdd:t=>{const d=pd(),n=t.dataset.v||('Bank account '+(d.brs.accts.length+1)),id=nid();d.brs.accts.push({id,name:n,ledger:t.dataset.v||'',asOf:'',bank:null,book:null,bookBal:null,openBal:null,bankBal:null,win:45});ui.brsA=id;savep(d)},
  brsDel:()=>{const d=pd(),ac=curBrs(d);if(ui.armed!=='brs'){ui.armed='brs';toast('Click again to remove '+ac.name);return}ui.armed=null;d.brs.accts=d.brs.accts.filter(a=>a!==ac);ui.brsA=null;savep(d)},
  brsCsv:()=>{const d=pd(),ac=curBrs(d),r=brsCalc(ac,d),L=[['Bank reconciliation',ac.name,'as on',r.asOf],[],['Balance as per bank statement','',r.bankBal],['Add: deposits not credited','',r.sA],['Less: cheques not presented','',r.sB],['Less: credited by bank, not in books','',r.sC],['Add: debited by bank, not in books','',r.sD],['Balance as per books (reconciled)','',r.calc],['Balance as per books','',r.bookBal],['Difference','',r.diff],[],['Item','Date','Voucher / narration','Ref','Amount','Cleared / booked later']];
    for(const [l,X] of [['Deposit not credited',r.A],['Cheque not presented',r.Bq],['Credited by bank, not in books',r.C],['Debited by bank, not in books',r.D]])for(const x of X)L.push([l,x.d,x.vno||x.nar,x.ref,x.amt,x.cleared||x.booked||'']);
    dlFile(fileSafe(Cx().name+' BRS '+ac.name+' '+r.asOf)+'.csv',csvOf(L))},
  pOpen:t=>{ui.party={...(ui.party||{}),[t.dataset.s]:t.dataset.v||null};render()},
  pLetter:t=>{const c=Cx(),d=pd(),s=t.dataset.s,n=t.dataset.v,r=partyCalc(d,s,n);dlFile(fileSafe('Balance confirmation '+n)+'.html',confLetter(c,d,s,n,r.book),'text/html')},
  pLetters:async t=>{const c=Cx(),d=pd(),s=t.dataset.v,names=[...new Set([...Object.keys(d.led?.[s]||{}),...Object.keys(d.party[s].P)])],rows=names.map(n=>({n,...partyCalc(d,s,n)})),tot=rows.reduce((x,r)=>x+Math.max(r.book,0),0),mat=+d.party[s].mat||Math.max(tot*0.05,1);
    const sel=rows.filter(r=>r.p.sel===true||(r.p.sel!==false&&(Math.abs(r.book)>=mat||(s==='cr'&&r.p.msme&&r.over45>0))));if(!sel.length)return toast('No party selected for confirmation.');
    await needLib('JSZip');const z=new JSZip();for(const r of sel)z.file(fileSafe('Balance confirmation '+r.n)+'.html',confLetter(c,d,s,r.n,r.book));browserDl(await z.generateAsync({type:'blob'}),fileSafe(c.name+' '+SIDE[s].n+' confirmation letters')+'.zip')},
  pCsv:t=>{const d=pd(),s=t.dataset.v,names=[...new Set([...Object.keys(d.led?.[s]||{}),...Object.keys(d.party[s].P)])];dlFile(fileSafe(Cx().name+' '+SIDE[s].n+' ageing')+'.csv',csvOf([['Party','Balance','0-30','31-60','61-90','91-180','180+','MSME','Over 45 days','Confirmation requested','Received','Confirmed balance'],...names.map(n=>{const r=partyCalc(d,s,n);return[n,r.book,...r.age,r.p.msme?'Yes':'',r.over45,r.p.conf?.req||'',r.p.conf?.recv||'',r.p.conf?.amt??'']})]))},
  cashNew:()=>{const d=pd();d.cash.counts.push({id:nid(),date:today(),time:new Date().toTimeString().slice(0,5),place:'',cust:'',by:session?.user?.email||'',den:{},ious:[],book:'',note:''});savep(d)},
  cashDel:t=>{const d=pd();d.cash.counts=d.cash.counts.filter(x=>x.id!==t.dataset.v);savep(d)},
  cashIou:t=>{const d=pd(),x=d.cash.counts.find(x=>x.id===t.dataset.v);x.ious=[...(x.ious||[]),{t:'',amt:''}];savep(d)},
  sDraw:t=>{const d=pd(),k=t.dataset.v,s=d[k];const r=drawPick(s.items,s.set||{});d[k]={...s,sample:r.ids};savep(d);toast(r.ids.length+' selected: '+r.key+' key items and '+(r.ids.length-r.key)+' at random')},
  sAll:t=>{const d=pd(),k=t.dataset.v;d[k]={...d[k],sample:d[k].items.map(x=>x.id)};savep(d)},
  faRes:t=>{const d=pd(),s=d.fav;s.res={...(s.res||{}),[t.dataset.id]:{...(s.res?.[t.dataset.id]||{}),r:t.dataset.v}};savep(d)},
  faExDel:t=>{const d=pd();d.fav.extra=(d.fav.extra||[]).filter((x,i)=>i!==+t.dataset.v);savep(d)},
  compF:t=>{ui.compF=t.dataset.v;render()},
  compCsv:()=>{const c=Cx(),d=pd(),{rows}=compRows(c,d);dlFile(fileSafe(c.name+' compliance FY '+d.fy)+'.csv',csvOf([['Law','Return / payment','Period','Due','Filed / paid','Status','Delay (days)','Note'],...rows.map(r=>[r.law,r.what,r.per,r.due,r.x.date||'',CST[r.st][1],r.late||'',r.x.note||''])]))},
  pObs:t=>{const c=Cx(),d=pd(),k=t.dataset.v,a=A();let title='',cond='',crit='',eff='',rec='';
    if(k==='brs'){const R=d.brs.accts.map(ac=>({ac,r:brsCalc(ac,d)}));title='Bank reconciliation exceptions';cond=R.map(({ac,r})=>`${ac.name} as on ${fmtD(r.asOf)}: ${r.Bq.length} cheques not presented (${inr(r.sB)}, ${r.stale.length} stale over 3 months), ${r.C.length+r.D.length} bank entries not in books (${inr(R2(r.sC+r.sD))})${r.diff!=null?', unexplained difference '+inr(r.diff):''}.`).join(' ');crit='Bank accounts reconciled every month and reviewed; stale cheques reversed (SIA 320; ICAI guidance note on audit of cash and bank balances).';eff='Unrecorded receipts / payments, misappropriation going undetected, misstated bank balance.';rec='Prepare and review BRS monthly; account for bank-only entries; reverse stale cheques; investigate unexplained differences.'}
    if(k==='drs'||k==='crs'){const s=k==='drs'?'dr':'cr',names=[...new Set([...Object.keys(d.led?.[s]||{}),...Object.keys(d.party[s].P)])],rows=names.map(n=>({n,...partyCalc(d,s,n)})),df=rows.filter(r=>(r.rec&&Math.abs(R2(r.book-r.rec.calc))>1)||(r.p.conf?.recv&&Math.abs(R2((+r.p.conf.amt||0)-r.book))>1)),old=rows.filter(r=>r.age[4]>0),ms=rows.filter(r=>r.p.msme&&r.over45>0);
      title=(s==='dr'?'Debtors':'Creditors')+': differences and old balances';cond=[df.length&&`${df.length} parties differ from their statements / confirmations (${df.slice(0,4).map(r=>r.n).join(', ')})`,old.length&&`${inr(R2(old.reduce((t,r)=>t+r.age[4],0)))} outstanding over 180 days across ${old.length} parties`,ms.length&&`${inr(R2(ms.reduce((t,r)=>t+r.over45,0)))} due to ${ms.length} MSME suppliers beyond 45 days`].filter(Boolean).join('; ')+'.';
      crit=s==='dr'?'Customer balances confirmed / reconciled periodically; old dues followed up and provided for (SIA 320).':'Supplier statements reconciled; MSME suppliers paid within the agreed period, not over 45 days (MSMED Act, section 15), failing which interest is payable (section 16) and the income-tax deduction is affected.';eff=s==='dr'?'Unrecoverable dues, misstated receivables.':'Unrecorded liabilities, interest to MSME suppliers, disallowance of expense.';rec='Reconcile and confirm balances every quarter; clear differences; follow up and provide for old balances'+(s==='cr'?'; pay MSME suppliers within 45 days.':'.')}
    if(k==='cash'){const L=d.cash.counts.map(x=>({x,r:cashCalc(x)})).filter(o=>o.r.diff!=null&&Math.abs(o.r.diff)>1);title='Difference in physical cash';cond=L.map(({x,r})=>`On ${fmtD(x.date)} at ${x.place||'the office'}: cash counted ${inr(r.phy)} plus IOUs ${inr(r.iou)} against book balance ${inr(r.book)}, ${r.diff<0?'short':'excess'} ${inr(Math.abs(r.diff))}.`).join(' ');crit='Cash in hand agrees with the cash book at all times; IOUs not kept as cash (SIA 320).';eff='Possible misappropriation; misstated cash.';rec='Investigate and account for the difference; stop IOUs; surprise counts by someone independent of the cashier.'}
    if(k==='stock'){const s=d.stock,S1=s.items.filter(x=>s.sample.includes(x.id)),dv=x=>R2(((+s.cnt?.[x.id]?.phy||0)-x.q)*x.rate),dn=S1.filter(x=>s.cnt?.[x.id]?.phy!==undefined&&s.cnt?.[x.id]?.phy!=='');title='Differences in physical stock';cond=`${dn.length} items counted: shortages ${inr(-R2(dn.filter(x=>dv(x)<0).reduce((t,x)=>t+dv(x),0)))} (${dn.filter(x=>dv(x)<0).slice(0,5).map(x=>x.n).join(', ')}), excess ${inr(R2(dn.filter(x=>dv(x)>0).reduce((t,x)=>t+dv(x),0)))}; ${dn.filter(x=>/damaged|slow|obsolete/.test(s.cnt?.[x.id]?.cond||'')).length} items damaged, slow-moving or obsolete.`;crit='Physical stock agrees with the books; differences of 10% or more in a class reported (CARO 3(ii)); slow-moving stock valued correctly.';eff='Misstated inventory and profit; possible loss of stock.';rec='Reconcile and adjust the differences; fix stores records; review slow-moving stock for write-down.'}
    if(k==='fav'){const s=d.fav,res=s.res||{},m=s.items.filter(x=>res[x.id]?.r==='missing');title='Fixed assets: physical verification exceptions';cond=`${m.length} assets not found (cost ${inr(m.reduce((t,x)=>t+x.v,0))}: ${m.slice(0,5).map(x=>x.n).join(', ')}); ${s.items.filter(x=>['idle','damaged'].includes(res[x.id]?.r)).length} not in use or damaged; ${s.items.filter(x=>res[x.id]?.r==='notag').length} not tagged; ${(s.extra||[]).length} seen but not in the register.`;crit='Assets physically verified at reasonable intervals and the register updated (CARO 3(i)).';eff='Assets lost or misused; register and balances misstated.';rec='Trace or write off missing assets with approval; tag all assets; update the register; review idle assets.'}
    if(k==='comp'){const R=compRows(c,d).rows.filter(r=>r.st==='late'||r.st==='over');title='Statutory dues filed or paid late';cond=R.slice(0,12).map(r=>`${r.what} ${r.per}: due ${fmtD(r.due)}, ${r.x.date?'filed / paid '+fmtD(r.x.date):'not yet'} (${r.late} days)`).join('; ')+'.';crit='Returns filed and dues paid by the due dates under GST, income-tax, labour and company law (SIA 150).';eff='Interest, late fees and penalties; notices.';rec='Keep a compliance calendar with owners and reminders; pay interest and late fees where due.'}
    newObs({clientId:c.id,auditId:a?.id||'',title,rating:'M',condition:cond,criteria:crit,effect:eff,rec})}
});
document.addEventListener('change',e=>{const t=e.target,ds=t.dataset;
  const keys=['brs','pcfg','pmsme','psel','pp','pc','cash','cden','ciou','scnt','sset','fanote','comp','cset','arnote','pconc','pnote'];if(!keys.some(k=>ds[k]!==undefined))return;
  const c=Cx();if(!c)return;const d=pOpen(c),v=t.type==='checkbox'?t.checked:t.value;
  if(ds.brs){const ac=curBrs(d);if(!ac)return;ac[ds.brs]=['bookBal','openBal','bankBal'].includes(ds.brs)?(v===''?null:+v):ds.brs==='win'?+v||45:v}
  else if(ds.pcfg)d.party[ds.pcfg]={...d.party[ds.pcfg],[ds.k]:ds.k==='mat'?(+v||''):v};
  else if(ds.pmsme){const P=d.party.cr.P;P[ds.pmsme]={...(P[ds.pmsme]||{}),msme:v}}
  else if(ds.psel){const P=d.party[ds.s].P;P[ds.psel]={...(P[ds.psel]||{}),sel:v}}
  else if(ds.pp){const P=d.party[ds.s].P;P[ds.n]={...(P[ds.n]||{}),[ds.pp]:v===''?null:+v}}
  else if(ds.pc){const P=d.party[ds.s].P,p=P[ds.n]=P[ds.n]||{};p.conf={...(p.conf||{}),[ds.pc]:ds.pc==='amt'?(v===''?null:+v):v}}
  else if(ds.cash||ds.cden||ds.ciou){const x=d.cash.counts.find(x=>x.id===ds.cid);if(!x)return;if(ds.cash)x[ds.cash]=v;else if(ds.cden)x.den={...(x.den||{}),[ds.cden]:+v||0};else{x.ious=x.ious||[];x.ious[+ds.ix]={...(x.ious[+ds.ix]||{}),[ds.ciou]:ds.ciou==='amt'?+v||0:v}}}
  else if(ds.scnt){const s=d.stock;s.cnt={...(s.cnt||{}),[ds.id]:{...(s.cnt?.[ds.id]||{}),[ds.scnt]:ds.scnt==='phy'?(v===''?'':+v):v}}}
  else if(ds.sset){const s=d[ds.k];s.set={...(s.set||{}),[ds.sset]:+v}}
  else if(ds.fanote){const s=d.fav;s.res={...(s.res||{}),[ds.fanote]:{...(s.res?.[ds.fanote]||{}),note:v}}}
  else if(ds.comp){d.comp.done={...d.comp.done,[ds.k]:{...(d.comp.done?.[ds.k]||{}),[ds.comp]:v}}}
  else if(ds.cset)d.comp.set={...d.comp.set,[ds.cset]:v};
  else if(ds.arnote)d.ar.notes={...d.ar.notes,[ds.arnote]:v};
  else if(ds.pconc!==undefined||ds.pnote!==undefined){const k=ds.pconc??ds.pnote;d.conc={...d.conc,[k]:{...(d.conc?.[k]||{}),[ds.pconc!==undefined?'st':'text']:v}}}
  savep(d)});
document.addEventListener('submit',e=>{const f=e.target;
  if(f.dataset.padd){e.preventDefault();const n=String(new FormData(f).get('n')||'').trim();if(!n)return;const d=pd();d.party[f.dataset.padd].P[n]={...(d.party[f.dataset.padd].P[n]||{}),sel:true};ui.party={...(ui.party||{}),[f.dataset.padd]:n};savep(d)}
  if(f.dataset.faex){e.preventDefault();const fd=new FormData(f),n=String(fd.get('n')||'').trim();if(!n)return;const d=pd();d.fav.extra=[...(d.fav.extra||[]),{n,loc:String(fd.get('loc')||'')}];savep(d)}
  if(f.dataset.naform){e.preventDefault();const r=String(new FormData(f).get('r')||'').trim();if(!r)return;const a=A();ui.naEdit=null;put('audits',a.id,{...a,na:{...(a.na||{}),[f.dataset.naform]:r}})}
},true);
/* file uploads of the procedures */
async function procFiles(c,kind,files,i){
  const f=files[0];try{
    if(kind==='books')return importBooksOnce(c,f);
    const d=pOpen(c),rows=extOf(f.name)==='xml'?null:await readSheet(f);
    if(kind==='brsbank'||kind==='brsbook'){let ac=curBrs(d);if(!ac){ac={id:nid(),name:'Bank account 1',ledger:'',asOf:'',bank:null,book:null,bookBal:null,openBal:null,bankBal:null,win:45};d.brs.accts.push(ac);ui.brsA=ac.id}
      if(kind==='brsbank'){const R=parseBankStmt(rows);ac.bank={file:f.name,rows:R.slice(0,40000)};toast(R.length+' bank entries read')}else{const R=parseLedgerTable(rows);ac.book={file:f.name,rows:R.slice(0,40000)};toast(R.length+' bank book entries read')}
      await savep(d);await pEv(c,f,kind==='brsbank'?'Bank statement: '+ac.name:'Bank book: '+ac.name);return}
    if(kind==='pstmt'||kind==='pbook'){const s=ui.party?.cr===i?'cr':ui.party?.dr===i?'dr':(d.party.cr.P[i]||d.led?.cr?.[i]?'cr':'dr'),P=d.party[s].P,p=P[i]=P[i]||{};
      if(kind==='pstmt'){const r=parsePartyStmt(rows);p.stmt={file:f.name,rows:r.rows,open:r.open||null};toast(r.rows.length+' entries read from '+i+'\'s statement')}else{const R=parseLedgerTable(rows);p.book={file:f.name,rows:R};toast(R.length+' ledger entries read')}
      await savep(d);await pEv(c,f,(kind==='pstmt'?'Statement of account: ':'Ledger: ')+i);return}
    if(kind==='stock'){const R=parseStockList(rows);d.stock={file:f.name,items:R,set:{keyPct:5,n:25,seed:1},sample:[],cnt:{}};await savep(d);await pEv(c,f,'Book stock list');return toast(R.length+' stock items read. Draw the sample next.')}
    if(kind==='far'){const R=parseFAR(rows);d.fav={file:f.name,items:R,set:{keyPct:5,n:25,seed:1},sample:[],res:{},extra:[]};await savep(d);await pEv(c,f,'Fixed asset register');return toast(R.length+' assets read. Draw the sample next.')}
  }catch(e){toast(e.message||String(e))}}
