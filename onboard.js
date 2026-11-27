/* Smart Auditing — onboard from books (owner, 26 Nov 2026):
   "if I give the XML report of a company … one year or … two to three years … analyse the whole books
    … nature of process and business … documents needed first … legal compliance … observations and findings
    … depth analysis and depth report … then generate roadmap and checklist … problems found first, priority …
    report should be expression report which expresses the content to a junior or client who doesn't know accounts."
   Pipeline: Tally XML (one or many years) → profile → depth findings → documents → compliance calendar
             → findings-first roadmap → structured checklist → expression report (plain words throughout). */
S.procs=S.procs||[];

/* ---------- parse one or many Tally XML day-books into one voucher set ---------- */
function onboardParse(texts){
  const V=[],seen=new Set();
  for(const t of texts){
    for(const v of parseLedgerEntries(t)){
      const k=v.d+'|'+v.vt+'|'+v.vno+'|'+v.party+'|'+v.E.map(e=>e.l+':'+e.a).join(',');
      if(seen.has(k))continue;seen.add(k);V.push(v)}
  }
  if(!V.length)throw new Error('No vouchers were found. Export the Day Book from Tally (XML) for each year and upload them together.');
  V.sort((a,b)=>String(a.d).localeCompare(String(b.d)));
  return V}

/* ---------- profile: what this company is, from the books themselves ---------- */
function onboardProfile(V,files){
  const led={},vt={},months=new Set(),parties=new Set();
  let sales=0,purchase=0,salary=0,cashAmt=0,bankAmt=0,gstAmt=0,tdsAmt=0,journal=0,round=0,cashV=0,weekend=0;
  const roundHits=[],weekendHits=[],bigNoRef=[],byDay={};
  const L=n=>(led[n]=led[n]||{n,dr:0,cr:0,c:0});
  for(const v of V){
    if(v.d){months.add(v.d.slice(0,7));const wd=new Date(v.d+'T00:00:00').getDay();
      if(wd===0||wd===6){weekend++;if(weekendHits.length<8)weekendHits.push(v)}}
    vt[v.vt]=(vt[v.vt]||0)+1;
    if(v.party)parties.add(v.party);
    const isJ=/journal/i.test(v.vt||'');if(isJ)journal++;
    for(const e of v.E){
      const x=L(e.n||e.l);x.c++;e.dr?x.dr+=e.a:x.cr+=e.a;
      const n=e.l||'';
      if(/sales|revenue/i.test(n)&&!/input|purchase|gst|tax/i.test(n))sales+=e.a;
      if(/purchase|cost of/i.test(n)&&!/sales|revenue/i.test(n))purchase+=e.a;
      if(/salary|wages|pf\b|esi\b|provident/i.test(n))salary+=e.a;
      if(/cash/i.test(n)){cashAmt+=e.a;cashV++}
      if(BANK_RE.test(n))bankAmt+=e.a;
      if(/gst|cgst|sgst|igst|input tax|output tax/i.test(n))gstAmt+=e.a;
      if(/\btds\b|tax deducted/i.test(n))tdsAmt+=e.a;
      if(e.a>=10000&&e.a%1000===0&&!/round/i.test(v.nar||'')){if(!v._rnd){v._rnd=1;round++}if(roundHits.length<10)roundHits.push({v,amt:e.a,l:n})}
    }
    const tot=v.E.reduce((t,e)=>t+e.a,0);
    if(tot>=100000&&!v.ref&&!/advance|salary|rent/i.test(v.nar||'')&&bigNoRef.length<8)bigNoRef.push(v);
    if(v.d){byDay[v.d]=(byDay[v.d]||0)+1}
  }
  const dupDay=Object.entries(byDay).filter(([,n])=>n>=40).map(([d,n])=>({d,n})).sort((a,b)=>b.n-a.n).slice(0,5);
  const names=Object.keys(led);
  const has=re=>names.some(n=>re.test(n));
  const biz=has(/raw material|consumption|wip|finished goods|production|工厂/i)||(/purchase/i.test(names.join())&&has(/stock|inventory|stores/i))?'manufacturing'
    :has(/salary|wages|professional fee|consult|legal|audit fee/i)&&purchase<sales*0.4?'services'
    :has(/interest|loan|deposit|finance|emi/i)&&!has(/stock|inventory/i)?'finance':'trading';
  const years=[...months].map(m=>m.slice(0,4)),fySet=[...new Set(years)];
  const ds=V.map(v=>v.d).filter(Boolean).sort();
  const gapMonths=[];
  if(ds.length>1){
    let cur=ds[0].slice(0,7),end=ds[ds.length-1].slice(0,7);
    while(cur<end){if(!months.has(cur))gapMonths.push(cur);
      const [y,m]=cur.split('-').map(Number);cur=(m===12?(y+1)+'-01':y+'-'+String(m+1).padStart(2,'0'))}}
  const employees=has(/salary|wages/i)?Math.max(1,Math.round(salary/12/25000))||null:null;
  const gst=has(/cgst|sgst|igst|input tax|output tax|gstr/i)||gstAmt>0;
  const tds=tdsAmt>0||has(/\btds\b|tax deducted/i);
  const name=(files&&files[0]&&files[0].name||'').replace(/\.xml$/i,'').replace(/[-_]+/g,' ').replace(/\bday ?book\b|\bexport\b|\d{4}[-_ ]?\d{2,4}/gi,'').trim();
  const salesLed=names.filter(n=>/sales|revenue/i.test(n)&&!/gst|tax/i.test(n)).slice(0,6);
  const topParties=[...parties].slice(0,0);
  // concentration: count voucher-party frequency
  const pc={};for(const v of V)if(v.party)pc[v.party]=(pc[v.party]||0)+1;
  const topP=Object.entries(pc).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const ledgerNames=names.slice(),partyNames=[...parties];
  const P0={
    name:name||'New client',
    biz,gst,tds,employees,
    system:'Tally',
    industry:biz==='manufacturing'?'Manufacturing (from books)':biz==='services'?'Services (from books)':biz==='finance'?'Financial services (from books)':'Trading (from books)',
    ledgerNames,partyNames,voucherTypes:Object.entries(vt).sort((a,b)=>b[1]-a[1]),
    from:ds[0]||'',to:ds[ds.length-1]||'',
    vouchers:V.length,months:months.size,years:fySet.length,gapMonths,
    salesR2:R2(sales),purchaseR2:R2(purchase),salaryR2:R2(salary),
    cashAmt:R2(cashAmt),bankAmt:R2(bankAmt),cashPct:cashAmt+bankAmt?Math.round(cashAmt/(cashAmt+bankAmt)*100):0,
    gstAmt:R2(gstAmt),tdsAmt:R2(tdsAmt),
    journalPct:V.length?Math.round(journal/V.length*100):0,
    roundPct:V.length?Math.round(round/V.length*100):0,
    weekendPct:V.length?Math.round(weekend/V.length*100):0,
    parties:parties.size,topParties:topP,
    ledgers:names.length,salesLed,
    findingsRaw:{roundHits,weekendHits,bigNoRef,dupDay,gapMonths},
    files:(files||[]).map(f=>f.name),
    turnoverCr:R2(sales/1e7)
  };
  /* industry knowledge + party/process intelligence */
  const INDx=indDetect(P0);
  const PP=partyClassify(P0,V);
  P0.industryKey=INDx.key;
  P0.industryPack=INDx.pack;
  P0.industryLabel=INDx.pack.n;
  P0.industryHits=INDx.hits;
  P0.partiesIntel=PP;
  P0.story=processStory(P0,PP);
  P0.knowledge=sectorKnowledge(P0);   /* audit + accounts + legal for this sector */
  if(INDx.score>0&&INDx.pack.plain)P0.industryStory=INDx.pack.plain;
  return P0}

/* ---------- depth findings: what the books themselves shout at an auditor ---------- */
function onboardFindings(P,V){
  const F=[],add=(rating,title,plain,why,area,detail)=>F.push({id:nid(),rating,title,plain,why,area,detail:detail||''});
  const R=P.findingsRaw||{};
  if(P.gapMonths&&P.gapMonths.length)
    add('H','Books have gaps — months with no vouchers',
      'The day book jumps over '+P.gapMonths.length+' month'+(P.gapMonths.length===1?'':'s')+' ('+P.gapMonths.slice(0,6).join(', ')+(P.gapMonths.length>6?'…':'')+'). Either nothing happened, or entries were never passed. An auditor must ask for those months before relying on any total.',
      'Missing periods break every trend and every reconciliation.','fin','Gaps: '+P.gapMonths.join(', '));
  if(P.roundPct>=3)
    add('M','A large share of entries are round amounts',
      P.roundPct+'% of entries are exact thousands (e.g. ₹10,000 / ₹50,000). Real bills are rarely round. This usually means estimates, advances or manipulated expenses. Vouch these first.',
      'Round-sum postings are a classic indicator of unsupported entries.','vouch',P.roundPct+'% round');
  if(P.weekendPct>=8)
    add('M','Many transactions fall on Saturdays and Sundays',
      P.weekendPct+'% of vouchers are on weekends. Some businesses work weekends — but payments and journals on Sundays need a reason and an approval.',
      'Weekend postings bypass dual control in many organisations.','vouch',P.weekendPct+'% weekend');
  if(P.cashPct>=35&&P.cashAmt>500000)
    add('H','Cash-heavy operations',
      Math.round(P.cashPct)+'% of money movement is through cash ('+inrc(P.cashAmt)+'). Cash is the easiest place for leakage. Surprise cash counts and cash-limit checks (Income-tax cash limits) must be first on the plan.',
      'Cash risk: no bank trail, higher fraud exposure.','cash',inrc(P.cashAmt)+' cash');
  if(P.journalPct>=25)
    add('H','Journals are '+P.journalPct+'% of all vouchers',
      'One in four entries is a journal. Journals move money without a bill or a bank line. This is where numbers get changed at year-end. Sample journals with supporting workings first.',
      'High journal ratio → earnings-management and cut-off risk.','fin',P.journalPct+'% journals');
  if(R.dupDay&&R.dupDay.length)
    add('M','Heavy posting days detected',
      'On '+R.dupDay.length+' day(s) the team posted 40+ vouchers ('+R.dupDay.map(x=>fmtD(x.d)+' ('+x.n+')').slice(0,3).join(', ')+'). Bulk days often hide quality problems — sample these days, not the quiet ones.',
      'Volume spikes correlate with weak review.','vouch',R.dupDay.map(x=>x.d).join(', '));
  if(R.bigNoRef&&R.bigNoRef.length)
    add('M','Large entries without a reference number',
      R.bigNoRef.length+' vouchers of ₹1 lakh or more have no cheque / UTR / invoice reference. Without a reference the payment cannot be traced to a bank line.',
      'No reference → cannot vouch to the bank.','vouch',R.bigNoRef.slice(0,4).map(v=>fmtD(v.d)+' '+inrc(v.E.reduce((t,e)=>t+e.a,0))).join('; '));
  if(P.gst&&P.gstAmt>0)
    add('M','GST is booked in the books — returns must be reconciled',
      'GST ledgers move '+inrc(P.gstAmt)+'. Every rupee here must agree with GSTR-1, GSTR-2B and GSTR-3B. Mismatches become demands with interest.',
      'GST reconciliation is mandatory every month.','gsttds',inrc(P.gstAmt));
  if(P.tds)
    add('M','TDS is deducted in the books',
      'TDS ledgers move '+inrc(P.tdsAmt||0)+'. Agree each challan to the deposit date; late deposit costs 1%–1.5% interest a month and can disallow the expense.',
      'TDS timing is a common default.','gsttds',inrc(P.tdsAmt||0));
  if(P.employees&&P.employees>=20)
    add('M','Payroll suggests ~'+P.employees+' employees',
      'Salary ledgers imply about '+P.employees+' people. That crosses the 20-employee line for Provident Fund — PF/ESI registration and monthly returns must be verified.',
      'EPF applies at 20+ employees.','payroll','~'+P.employees+' employees');
  if(P.salesR2>0&&P.purchaseR2>0){
    const gm=P.salesR2?Math.round((P.salesR2-P.purchaseR2)/P.salesR2*100):0;
    if(gm<5||gm>60)add('L','Gross margin looks unusual ('+gm+'%)',
      'Sales '+inrc(P.salesR2)+' against purchases '+inrc(P.purchaseR2)+' gives a '+gm+'% margin. Either the industry really works that way, or purchases/sales are misclassified. Confirm with management.',
      'Analytical review flag (SIA 6).','ar',gm+'% margin')}
  if(!F.length)add('L','Books look internally consistent at first read',
    'No glaring pattern jumped out of the voucher statistics. Normal risk-based testing still applies — vouching, reconciliations and compliance checks as per the plan.',
    'Baseline.','fin','');
  /* --- party & process intelligence findings --- */
  const PP=P.partiesIntel||{};
  if(PP.transferCount>=3)
    add('H','Internal transfers between own units are happening',
      PP.transferCount+' vouchers look like value moving between this company\'s own branches, head office or units ('+(PP.internal.slice(0,4).join(', ')||'internal ledger names')+'). Example: '+(PP.transfers[0]?fmtD(PP.transfers[0].d)+' '+PP.transfers[0].nar:'')+'. These must be eliminated or agreed on consolidation — left alone they inflate both sides of the group numbers.',
      'Inter-unit entries without matching elimination misstate group revenue and inventory (SIA 320 · group reporting).','fin',PP.transferCount+' transfer vouchers · units: '+(PP.internal.slice(0,5).join(', ')||'—'));
  if(PP.groupCos.length)
    add('M','Other companies of the same group appear in the books',
      'These entity names look like group / related companies, not ordinary vendors: '+PP.groupCos.slice(0,5).join(', ')+'. Related-party transactions need Board approval (s.188), disclosure, and arm\'s-length pricing — and they must be eliminated in consolidation.',
      'Related-party risk: disclosure, approval and transfer pricing (s.188 · Ind AS 24 · TP rules).','gov',PP.groupCos.slice(0,6).join(', '));
  if(PP.internal.length&&PP.transferCount<3)
    add('L','Own branches / units seen in the ledger names',
      'The books mention own locations: '+PP.internal.slice(0,5).join(', ')+'. Confirm which are separate legal entities vs branches — it changes both the audit scope and the compliance list.',
      'Scope depends on legal structure.','fin',PP.internal.slice(0,5).join(', '));
  /* --- industry knowledge: seed the pack's risks as findings --- */
  const pack=P.industryPack;
  if(pack&&pack.risks&&pack.risks.length){
    for(const r of pack.risks){
      if(F.some(x=>x.title===r[1]))continue;
      add(r[0],r[1],r[2],'Required for this line of business ('+P.industryLabel+'). This is how such businesses fail when untested.',r[3]||'fin','line of business: '+P.industryLabel)}}
  F.sort((a,b)=>'HML'.indexOf(a.rating)-'HML'.indexOf(b.rating));
  return F}

/* ---------- documents needed first (one-time pack) ---------- */
function onboardDocs(P,c){
  const D=[],add=(g,t,why)=>D.push({g,t,why});
  add('Identity & legal','PAN of the entity and of each director / partner','Every filing and every bank work starts from PAN.');
  add('Identity & legal','GST registration certificate (GSTIN)','Confirms the GST number, date and principal place of business.');
  if(['private','opc','public','listed','sec8'].includes(c.type||'private')){
    add('Identity & legal','Certificate of incorporation + MOA / AOA','Proves the company exists and what it may do.');
    add('Identity & legal','Board resolutions / power of attorney for the auditor','Who may sign, who may give evidence.')}
  add('Identity & legal','List of directors / partners with DIN or ID proofs','Related-party and loan testing starts here.');
  add('Prior work','Last 2–3 years’ financial statements and audit reports','Opening balances and prior-year adjustments come from these.');
  add('Prior work','Income-tax returns (ITR-V) for the last 3 years','Agrees book profit to filed profit.');
  if(P.gst)add('Prior work','GST returns for the period (GSTR-1, 3B, 9 if due)','The books must agree with what was filed.');
  if(P.tds)add('Prior work','TDS returns (24Q / 26Q) and challans','Deductions in the books must appear in the returns.');
  add('Books & systems','Trial balance for the full period','The spine of every test.');
  add('Books & systems','Chart of accounts / ledger list','So we know what each ledger means.');
  if(P.employees&&P.employees>=10)add('Labour','PF and ESI registration + monthly returns','Applies from 20 / 10 employees.');
  add('Banking','List of bank accounts with sanctioned limits and signatories','BRS and confirmation letters need this.');
  add('Governance','Related-party list and inter-company balances','SIA and Companies Act s.188 testing.');
  if(P.biz==='manufacturing')add('Operations','Stock records / bin cards and last physical verification report','CARO 3(ii) and inventory testing.');
  const pack=P.industryPack;
  if(pack&&pack.docs)for(const [t,w] of pack.docs)if(!D.some(x=>x.t===t))add(P.industryLabel,t,w);
  return D}

/* ---------- compliance calendar: one-time / monthly / quarterly / half-yearly / annual ---------- */
function onboardCompliance(c,P){
  const L=applicability(c).filter(x=>x.st!=='no');
  const G={once:[],monthly:[],quarterly:[],half:[],annual:[]};
  G.once.push({t:'Verify legal documents (the pack above)',why:'One-time at onboarding; re-confirm each year.',req:'Documents'});
  G.once.push({t:'Agree opening balances with last audited accounts',why:'One-time; every later test depends on it.',req:'Opening balances'});
  G.once.push({t:'Walk through the system and map key controls',why:'One-time; SIA 310.',req:'Walkthrough'});
  if(P.gst){
    G.monthly.push({t:'GSTR-1, GSTR-3B vs books; GSTR-2B vs purchases',why:'GST Act: monthly filing and ITC matching.',req:'GST'});
    G.quarterly.push({t:'GSTR-9 annual return readiness (if turnover > ₹2 cr)',why:'Rule 80.',req:'GSTR-9'})}
  if(P.tds)G.monthly.push({t:'TDS deducted vs challans deposited (by the 7th)',why:'Income-tax; interest from the due date.',req:'TDS'});
  G.monthly.push({t:'Bank reconciliation (BRS) prepared and reviewed',why:'SIA 320; every month.',req:'BRS'});
  G.monthly.push({t:'Cash count and cash-limit check (if cash used)',why:'Income-tax cash limits; surprise counts.',req:'Cash'});
  if(P.employees&&P.employees>=10){
    G.monthly.push({t:'Payroll, PF and ESI returns for the month',why:'Labour codes; 20 / 10 employee thresholds.',req:'Payroll'})}
  G.quarterly.push({t:'Vouching sample for the quarter (purchases, sales, payments, journals)',why:'SIA 320 · standing instruction.',req:'Vouching'});
  G.quarterly.push({t:'Debtor / creditor ageing review; follow-up on old dues',why:'SIA 320; credit risk.',req:'Ageing'});
  G.half.push({t:'Balance confirmation letters — debtors, creditors, banks, loans',why:'Half-year close; best evidence of existence.',req:'Confirmations'});
  if(P.biz==='manufacturing')G.half.push({t:'Physical stock verification (test counts)',why:'CARO 3(ii).',req:'Stock'});
  G.annual.push({t:'Full-year analytical review and trend pack',why:'SIA 6.',req:'Analytical'});
  G.annual.push({t:'Fixed-asset register vs physical assets',why:'CARO 3(i).',req:'Fixed assets'});
  G.annual.push({t:'Tax audit readiness and statutory due-date calendar for the year',why:'s.44AB + ROC calendar.',req:'Calendar'});
  if(L.some(x=>/Internal audit/.test(x.name)))G.annual.push({t:'Internal audit plan approved by the Board',why:'s.138 where applicable.',req:'IA plan'});
  /* industry knowledge pack: laws and calendar */
  const pack=P.industryPack;
  if(pack){
    for(const [t,w] of pack.law||[])if(!G.monthly.some(x=>x.t===t)&&!G.quarterly.some(x=>x.t===t)&&!G.annual.some(x=>x.t===t))
      G.once.push({t,why:w+' (required for '+P.industryLabel+')',req:'Industry'});
    for(const [cad,t,w] of pack.cal||[]){
      const bucket=cad==='monthly'?G.monthly:cad==='quarterly'?G.quarterly:cad==='half'?G.half:G.annual;
      if(!bucket.some(x=>x.t===t))bucket.push({t,why:w,req:'Calendar'})}
    for(const c of pack.controls||[])
      if(!G.once.some(x=>x.t===c))G.once.push({t:c,why:'Control that must be in place and tested for this line of business.',req:'Controls'})}
  return G}

/* ---------- roadmap: findings first (priority), then the calendar ---------- */
function onboardRoadmap(c,P,F,G){
  const fy=fyNow(),cq=Math.min(curQ(fy),11);
  const items=[];
  const AREA={fin:'fin',vouch:'vouch',cash:'cash',gsttds:'gsttds',payroll:'payroll',ar:'ar'};
  F.forEach((f,i)=>{
    items.push({id:nid(),source:'onboard',done:false,auditId:'',area:AREA[f.area]||'fin',
      title:f.title+(f.detail?' · '+f.detail:''),q:Math.min(11,cq+Math.floor(i/3)),
      prio:1,kind:f.rating==='H'?'Foremost':f.rating==='M'?'High':'Later',
      why:'Found in the books: '+(f.plain||'').slice(0,160),onboard:true})});
  const base=genRoadmap(c,'year');
  for(const it of base.items){
    if(items.some(x=>x.title===it.title))continue;
    items.push({...it,source:'onboard-cal'})}
  /* audit programme from the knowledge base → scheduled work */
  const K=P.knowledge||{};
  (K.audit||[]).forEach((a,i)=>{
    const title='Audit: '+a.n;
    if(items.some(x=>x.title===title))return;
    items.push({id:nid(),source:'onboard',done:false,auditId:'',area:'vouch',
      title,q:Math.min(11,cq+(i%4)),prio:2,kind:'Then',
      why:(a.ref||'')+(a.steps&&a.steps.length?'. Steps: '+a.steps.slice(0,3).join('; '):''),onboard:true})});
  (K.acct||[]).forEach((a,i)=>{
    const title='Accounts check: '+a.n;
    if(items.some(x=>x.title===title))return;
    items.push({id:nid(),source:'onboard',done:false,auditId:'',area:'fin',
      title,q:Math.min(11,cq+(i%4)),prio:2,kind:'Then',
      why:a.std+' — '+String(a.treat||'').slice(0,140),onboard:true})});
  (K.controls||[]).forEach((c,i)=>{
    const title='Control: '+c;
    if(items.some(x=>x.title===title))return;
    items.push({id:nid(),source:'onboard',done:false,auditId:'',area:'fin',
      title,q:Math.min(11,cq+(i%3)),prio:3,kind:'Later',
      why:'Confirm this control exists and operated through the year.',onboard:true})});
  const PP=P.partiesIntel||{};
  if(PP.groupCos&&PP.groupCos.length)
    items.push({id:nid(),source:'onboard',done:false,auditId:'',area:'gov',
      title:'Related-party map: agree '+PP.groupCos.length+' group entities, Board approvals and elimination',q:Math.min(11,cq+1),
      prio:1,kind:'Foremost',why:'Group companies seen in the books',onboard:true});
  if(PP.transferCount>=3)
    items.push({id:nid(),source:'onboard',done:false,auditId:'',area:'fin',
      title:'Agree and eliminate internal transfers between own units ('+PP.transferCount+' vouchers)',q:Math.min(11,cq),
      prio:1,kind:'Foremost',why:'Internal transfers inflate group numbers until eliminated',onboard:true});
  items.sort((a,b)=>a.q-b.q||(a.prio??5)-(b.prio??5));
  return{fy,unit:'month',span:'year',from:cq,to:11,items,generatedAt:today(),onboard:true}}

/* ---------- the checklist: brief → one-time → monthly → quarterly → half-yearly → annual ---------- */
function onboardChecklist(P,c,G,F){
  return{
    brief:[
      ['How the business runs (from transactions)',P.story||P.industry],
      ['Industry',P.industryLabel||P.industry+' · nature: '+(BIZ[P.biz]||P.biz)],
      ['What this business needs done',(P.industryPack&&P.industryPack.plain)?P.industryPack.plain.slice(0,280):'—'],
      ['Internal transfers',(P.partiesIntel&&P.partiesIntel.transferCount)?P.partiesIntel.transferCount+' vouchers between own units — agree and eliminate':'None detected'],
      ['Other companies in the books',(P.partiesIntel&&P.partiesIntel.groupCos&&P.partiesIntel.groupCos.length)?P.partiesIntel.groupCos.slice(0,5).join(', '):'None detected'],
      ['Books',P.vouchers.toLocaleString('en-IN')+' vouchers over '+P.months+' months ('+fmtD(P.from)+' to '+fmtD(P.to)+'), '+P.ledgers+' ledgers, '+P.parties+' parties'],
      ['Money seen in the books','Sales/ Income '+inrc(P.salesR2)+' · Purchases '+inrc(P.purchaseR2)+(P.salaryR2?' · Payroll '+inrc(P.salaryR2):'')],
      ['Tax footprint',(P.gst?'GST yes ('+inrc(P.gstAmt)+')':'GST not seen')+' · '+(P.tds?'TDS yes':'TDS not seen')+(P.employees?' · ~'+P.employees+' employees':'')],
      ['Where the risk sits',F.slice(0,3).map(f=>f.rating+': '+f.title).join(' · ')||'Standard risk'],
      ['Systems',P.system]
    ],
    /* audit work, standards and controls — plain checklist sections, no separate knowledge UI */
    auditWork:((P.knowledge&&P.knowledge.audit)||[]).map(a=>({
      t:a.n,why:(a.ref||'')+(a.steps&&a.steps.length?' — '+a.steps.join(' · '):''),req:'Audit'})),
    standards:((P.knowledge&&P.knowledge.acct)||[]).map(a=>({
      t:a.n+': '+a.std,why:a.treat+' Check: '+(a.check||''),req:'Accounts'})),
    controls:((P.knowledge&&P.knowledge.controls)||[]).map(c=>({
      t:c,why:'Key control for this line of business — test whether it exists and operated.',req:'Controls'})),
    legalExtra:(P.knowledge&&P.knowledge.lawPairs)||[],
    once:G.once,monthly:G.monthly,quarterly:G.quarterly,half:G.half,annual:G.annual,
    findings:F
  }}

/* ---------- expression report: plain words a junior or a client can follow ---------- */
function onboardReportHTML(P,c,F,G,CL,R){
  const L=applicability(c).filter(x=>x.st!=='no');
  const row=(k,v)=>`<tr><th style="width:14em">${k}</th><td>${esc(v)}</td></tr>`;
  const list=(arr,empty)=>arr.length?`<ul>${arr.map(x=>`<li><b>${esc(x.t)}</b> — <span style="color:#5a6482">${esc(x.why)}</span>${x.req?` <span style="color:#8a93ad">(area: ${esc(x.req)})</span>`:''}</li>`).join('')}</ul>`:`<p style="color:#5a6482">${empty}</p>`;
  const fl=F.map((f,k)=>`<h3>${k+1}. ${esc(f.title)} <span style="font:600 11px 'IBM Plex Sans';padding:2px 8px;border-radius:99px;background:${f.rating==='H'?'#c93a2e':f.rating==='M'?'#f2b705':'#3fb7bd'};color:${f.rating==='H'?'#fff':f.rating==='M'?'#3a2c00':'#05393b'};vertical-align:2px">${f.rating==='H'?'High':f.rating==='M'?'Medium':'Low'}</span></h3>
    <p style="margin:6px 0"><b>In plain words:</b> ${esc(f.plain)}</p>
    <p style="margin:0;color:#5a6482"><b>Why it matters:</b> ${esc(f.why)}${f.detail?` <b>Evidence:</b> ${esc(f.detail)}`:''}</p>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Books analysis — ${esc(c.name)}</title>
<style>body{font:14.5px/1.6 "IBM Plex Serif",Georgia,serif;max-width:920px;margin:30px auto;padding:0 20px;color:#141a33}
h1{font:600 28px/1.2 "IBM Plex Sans",sans-serif;margin:0 0 4px}h2{font:600 17px "IBM Plex Sans";margin:28px 0 8px;border-bottom:2px solid #102347;padding-bottom:4px}
h3{font:600 15px "IBM Plex Sans";margin:18px 0 4px}table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #ccd;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f3f4f9;font-weight:600}
.lead{background:#f1f3f8;border-left:4px solid #2f4bd8;padding:12px 16px;margin:14px 0;font-size:15px}
.note{color:#5a6482;font-size:13px}</style></head><body>
<p class="note">SMART AUDITING · INTERNAL AUDIT WORKBENCH</p>
<h1>Depth analysis of the books — ${esc(c.name)}</h1>
<p class="note">Prepared ${fmtD(today())} from ${P.files.length} Tally export${P.files.length===1?'':'s'} · ${esc(P.files.join(', '))}</p>
<div class="lead"><b>What this document is:</b> a plain-language reading of your accounting books before any audit work starts. Every sentence is written so a junior team member or a non-accountant in management can follow it. Numbers are from the vouchers themselves — not estimates.</div>
<h2>1. Who you are (as the books see you)</h2>
<table>${row('Business',P.industry)}${row('Nature',BIZ[P.biz]||P.biz)}${row('Period in the books',fmtD(P.from)+' to '+fmtD(P.to)+' ('+P.months+' months, '+P.years+' year'+(P.years===1?'':'s')+')')}
${row('Volume',P.vouchers.toLocaleString('en-IN')+' vouchers · '+P.ledgers+' ledgers · '+P.parties+' counterparties')}${row('Sales / income seen',inrc(P.salesR2))}${row('Purchases seen',inrc(P.purchaseR2))}
${row('Tax',(P.gst?'GST booked: '+inrc(P.gstAmt):'No GST movement seen')+(P.tds?' · TDS booked: '+inrc(P.tdsAmt):''))}${row('Cash share',P.cashPct+'% of money movement')}${row('Journals',P.journalPct+'% of vouchers')}</table>
${P.gapMonths.length?`<p><b>Warning:</b> ${P.gapMonths.length} month(s) have no vouchers at all: ${esc(P.gapMonths.join(', '))}.</p>`:''}
<h2>1b. How the business runs, and who else is in the books</h2>
<p>${esc(P.story||'')}</p>
${P.industryStory?`<p><b>${esc(P.industryLabel)}:</b> ${esc(P.industryStory)}</p>`:''}
${(P.partiesIntel&&P.partiesIntel.transferCount)?`<p><b>Internal transfers:</b> ${P.partiesIntel.transferCount} vouchers move value between this company's own units (${esc((P.partiesIntel.internal||[]).slice(0,5).join(', '))}). These must be agreed and eliminated in any group view.</p>`:''}
${(P.partiesIntel&&P.partiesIntel.groupCos&&P.partiesIntel.groupCos.length)?`<p><b>Other companies of the group seen:</b> ${esc(P.partiesIntel.groupCos.slice(0,6).join(', '))}. Treat them as related parties: Board approval (s.188), disclosure and arm's-length pricing.</p>`:''}
<h2>2. What we found (depth findings, worst first)</h2>
<p class="note">Each finding is written twice: once in plain words, once with the audit reason. High = fix first.</p>
${fl}
<h2>3. Documents we need first</h2>
${list(CL.docs||[],'—')}
<h2>4. What must be checked, and how often</h2>
<h3>One time (at onboarding)</h3>${list(G.once,'—')}
<h3>Every month</h3>${list(G.monthly,'—')}
<h3>Every quarter</h3>${list(G.quarterly,'—')}
<h3>Every half-year</h3>${list(G.half,'—')}
<h3>Once a year</h3>${list(G.annual,'—')}
${(CL&&CL.auditWork&&CL.auditWork.length)?`<h3>Audit work for this business</h3>${list(CL.auditWork,'—')}`:''}
${(CL&&CL.standards&&CL.standards.length)?`<h3>Accounting standards to apply</h3>${list(CL.standards,'—')}`:''}
${(CL&&CL.controls&&CL.controls.length)?`<h3>Controls that must exist</h3>${list(CL.controls,'—')}`:''}
<h2>5. Laws and reports that apply</h2>
<table><thead><tr><th>Requirement</th><th>Status</th><th>Why</th></tr></thead><tbody>${L.map(a=>`<tr><td>${esc(a.name)}</td><td>${a.st==='yes'?'Applies':'Check'}</td><td>${esc(a.why)} <span class="note">(${esc(a.basis)})</span></td></tr>`).join('')}</tbody></table>
${(CL&&CL.legalExtra&&CL.legalExtra.length)?`<h3>Statutes and rules for this business</h3><ul>${CL.legalExtra.map(([t,w])=>`<li><b>${esc(t)}</b> — <span style="color:#5a6482">${esc(w)}</span></li>`).join('')}</ul>`:''}
<h2>6. The plan (roadmap)</h2>
<p class="note">Problems found in the books come first (priority), then the standing calendar. Work top to bottom.</p>
<table><thead><tr><th>#</th><th>When</th><th>Priority</th><th>Work</th><th>Why</th></tr></thead><tbody>
${(R.items||[]).slice(0,40).map((it,i)=>`<tr><td>${i+1}</td><td>${esc(QTR[it.q]?.[0]||'')} ${it.q!=null?new Date(+String(R.fy).slice(0,4)+(it.q>=9?1:0),0,1).getFullYear():''}</td><td>${it.prio===1?'1 — first':it.prio===2?'2 — then':'3 — later'}</td><td>${esc(it.title)}</td><td class="note">${esc(it.why||'')}</td></tr>`).join('')}</tbody></table>
<h2>7. How to read the rest of the audit</h2>
<p>You will see three colours everywhere in this workbench: <b style="color:#c93a2e">red</b> = a problem that can cost money or attract a penalty — do it first; <b style="color:#f2b705">amber</b> = something to watch and confirm; <b style="color:#17875a">green</b> = checked and all right. Each audit process (vouching, GST, bank reconciliation…) opens as a checklist — tick, write a one-line note, attach the file as evidence. When every process is done, the report button builds the final expression report for the client.</p>
<p class="note">This analysis is a planning aid from the books provided, not a legal opinion. Thresholds as of Nov 2026.</p>
</body></html>`}

/* ---------- turn the profile into a client master draft ---------- */
function onboardClient(P){
  return{name:P.name,type:'private',rel:'none',biz:P.biz,reg:'none',cost:'none',
    industry:P.industry,system:P.system,gstin:'',turnover:P.turnoverCr||0,
    paidup:0,networth:0,profit:0,borrow:0,deposits:0,costTurnover:0,employees:P.employees||0,
    gst:!!P.gst,cash5:P.cashPct<5&&P.cashAmt>0,intl:false,onboardedAt:new Date().toISOString()}}

/* ---------- run the whole pipeline on uploaded files ---------- */
async function onboardRun(files){
  const xs=[...files].filter(f=>/\.xml$/i.test(f.name));
  if(!xs.length)throw new Error('Upload one or more Tally XML files (Day Book export) — one per year is fine.');
  toast('Reading '+xs.length+' file'+(xs.length===1?'':'s')+'…');
  const texts=[];for(const f of xs)texts.push(decodeBuf(await f.arrayBuffer()));
  const V=onboardParse(texts);
  const P=onboardProfile(V,xs);
  const c=onboardClient(P);
  const F=onboardFindings(P,V);
  const G=onboardCompliance(c,P);
  const CL=onboardChecklist(P,c,G,F);
  CL.docs=onboardDocs(P,c);
  const R=onboardRoadmap(c,P,F,G);
  return{P,c,F,G,CL,R,V}}

/* ---------- view ---------- */
function vOnboard(){
  const D=ui.onboard;
  setTop([['Onboard from books']]);
  if(!D||D.step!=='done'){
    return `<div class="head"><div class="titles"><h1>Onboard from books</h1><p class="sub">Give the Tally XML day book for one, two or three years. The engine reads every voucher and returns: what the company is, what documents to collect first, which laws apply, depth findings, a prioritised roadmap and a checklist — all in plain words.</p></div></div>
    <div class="panel" style="max-width:760px">
      <label class="drop" data-drop="onboard"><b>Drop Tally XML exports here (one per year, together)</b>
      <span class="small">Tally → Day Book → Export (XML). Cancel any filters so every voucher is included. The file stays in your browser until you create the client.</span>
      <input type="file" data-file="onboard" accept=".xml" multiple hidden></label>
      <p class="small muted" style="margin:12px 0 0">Pipeline: <b>parse</b> → <b>profile the business</b> → <b>depth findings</b> → <b>documents first</b> → <b>audit programme</b> → <b>compliance calendar</b> → <b>findings-first roadmap</b> → <b>checklist</b> → <b>expression report</b>.</p>
    </div>
    ${D&&D.error?`<div class="banner" style="margin-top:14px">${esc(D.error)}</div>`:''}`;}
  const{P,c,F,G,CL,R}=D;
  const tab=ui.onboardTab||'profile';
  const T=[['profile','1 · Company'],['findings','2 · Findings ('+F.length+')'],['docs','3 · Documents'],['checklist','4 · Checklist'],['roadmap','5 · Roadmap'],['report','6 · Expression report']];
  let body='';
  if(tab==='profile')body=`<div class="panel" style="margin-bottom:14px"><h2>The operating story (read from transactions and names)</h2>
    <p style="margin:0 0 8px">${esc(P.story||'')}</p>
    ${P.industryStory?`<p class="small muted" style="margin:0"><b>${esc(P.industryLabel)}:</b> ${esc(P.industryStory)}</p>`:''}
    <div class="row" style="margin-top:10px;gap:8px">
      <span class="tag b">Industry: ${esc(P.industryLabel||'—')}</span>
      ${(P.partiesIntel&&P.partiesIntel.transferCount)?`<span class="tag r">${P.partiesIntel.transferCount} internal transfers</span>`:'<span class="tag n">No internal transfers</span>'}
      ${(P.partiesIntel&&P.partiesIntel.groupCos&&P.partiesIntel.groupCos.length)?`<span class="tag y">${P.partiesIntel.groupCos.length} group entities</span>`:'<span class="tag n">No group entities</span>'}
    </div>
    ${(P.partiesIntel&&P.partiesIntel.groupCos&&P.partiesIntel.groupCos.length)?`<p class="small" style="margin:10px 0 0"><b>Related companies:</b> ${esc(P.partiesIntel.groupCos.slice(0,6).join(', '))}</p>`:''}
    ${(P.partiesIntel&&P.partiesIntel.internal&&P.partiesIntel.internal.length)?`<p class="small" style="margin:6px 0 0"><b>Own units / branches:</b> ${esc(P.partiesIntel.internal.slice(0,6).join(', '))}</p>`:''}
    </div>
  <div class="grid2 even"><div class="panel"><h2>What the books say this company is</h2>
    <table style="width:100%">${[['Business',P.industry],['Nature',BIZ[P.biz]||P.biz],['Period',fmtD(P.from)+' → '+fmtD(P.to)+' ('+P.months+' months)'],['Years of data',P.years],['Vouchers',P.vouchers.toLocaleString('en-IN')],['Ledgers / parties',P.ledgers+' / '+P.parties],['Sales (seen)',inrc(P.salesR2)],['Purchases (seen)',inrc(P.purchaseR2)],['Cash share',P.cashPct+'%'],['Journals',P.journalPct+'%'],['GST / TDS',(P.gst?'Yes':'No')+' / '+(P.tds?'Yes':'No')],['Employees (est.)',P.employees||'—'],['Accounting system',P.system]].map(([k,v])=>`<tr><th style="width:12em;text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);color:var(--muted);font-weight:600;font-size:12.5px">${k}</th><td style="padding:6px 8px;border-bottom:1px solid var(--line)">${esc(String(v))}</td></tr>`).join('')}</table>
    ${P.gapMonths.length?`<div class="banner" style="margin-top:12px">No vouchers in: ${esc(P.gapMonths.join(', '))}</div>`:''}</div>
    <div class="panel"><h2>Top voucher types</h2>${P.voucherTypes.slice(0,10).map(([k,n])=>`<div class="row small" style="justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line)"><span>${esc(k||'(blank)')}</span><b>${n}</b></div>`).join('')}
    <h2 style="margin-top:16px">Top parties by activity</h2>${P.topParties.map(([k,n])=>`<div class="row small" style="justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line)"><span>${esc(k)}</span><b>${n}</b></div>`).join('')||'<p class="muted small">—</p>'}</div></div>`;
  else if(tab==='findings')body=`<div class="panel"><h2>Depth findings — worst first</h2><p class="small muted" style="margin:-4px 0 12px">Written in plain words first; the audit reason follows. These become roadmap items with priority 1.</p>
    ${F.map((f,k)=>`<div class="card" style="margin-bottom:10px;border-left:4px solid ${f.rating==='H'?'var(--hi)':f.rating==='M'?'var(--md)':'var(--lo)'}">
      <div class="row"><span class="tag ${f.rating}">${f.rating==='H'?'High':f.rating==='M'?'Medium':'Low'}</span><h3 style="margin:0" class="sp">${esc(f.title)}</h3></div>
      <p style="margin:8px 0 4px"><b>In plain words:</b> ${esc(f.plain)}</p>
      <p class="small muted" style="margin:0"><b>Why it matters:</b> ${esc(f.why)}${f.detail?` · <b>Evidence:</b> ${esc(f.detail)}`:''}</p></div>`).join('')}</div>`;
  else if(tab==='docs')body=`<div class="panel"><h2>Collect these first (one-time pack)</h2><p class="small muted" style="margin:-4px 0 10px">Before any testing starts. Tick as they arrive.</p>
    ${[...new Set(CL.docs.map(d=>d.g))].map(g=>`<h3 style="margin-top:14px">${esc(g)}</h3>${CL.docs.filter(d=>d.g===g).map(d=>`<label class="cb" style="min-height:36px"><input type="checkbox"> <span><b>${esc(d.t)}</b><br><span class="small muted">${esc(d.why)}</span></span></label>`).join('')}`).join('')}</div>`;
  else if(tab==='checklist'){
    const sec=(label,arr)=>arr&&arr.length?`<h3 style="margin-top:14px">${label} <span class="tag n">${arr.length}</span></h3>`+arr.map(x=>`<div class="row small" style="padding:7px 0;border-bottom:1px solid var(--line);align-items:flex-start"><span class="tag b" style="margin-top:2px">${esc(x.req||'')}</span><span class="sp"><b>${esc(x.t)}</b><br><span class="muted">${esc(x.why)}</span></span></div>`).join(''):'';
    body=`<div class="panel"><h2>Company brief</h2><table style="width:100%;margin-bottom:16px">${CL.brief.map(([k,v])=>`<tr><th style="width:14em;text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);color:var(--muted);font-weight:600;font-size:12.5px">${k}</th><td style="padding:6px 8px;border-bottom:1px solid var(--line)">${esc(v)}</td></tr>`).join('')}</table>
    ${sec('One time only',CL.once)}${sec('Audit work',CL.auditWork)}${sec('Accounting standards',CL.standards)}${sec('Controls',CL.controls)}
    ${sec('Every month',CL.monthly)}${sec('Every quarter',CL.quarterly)}${sec('Every half-year',CL.half)}${sec('Once a year',CL.annual)}</div>`}
  else if(tab==='roadmap')body=`<div class="panel"><h2>Roadmap — problems first, then the calendar</h2><p class="small muted" style="margin:-4px 0 10px">Priority 1 items are the findings from your books. Work top to bottom. ${R.items.length} items for FY ${esc(R.fy)}.</p>
    <div class="scroll"><table class="stack"><thead><tr><th>#</th><th>Month</th><th>Priority</th><th>Work</th><th>Why</th></tr></thead><tbody>
    ${R.items.map((it,i)=>`<tr><td class="num">${i+1}</td><td>${esc(QTR[it.q]?.[0]||'')}</td><td>${it.prio===1?`<span class="tag ${it.kind==='Foremost'?'r':'b'}">${esc(it.kind||'1')}</span>`:it.prio===2?'<span class="tag y">2</span>':'<span class="tag n">3</span>'}</td><td><b>${esc(it.title)}</b></td><td class="small muted">${esc((it.why||'').slice(0,140))}</td></tr>`).join('')}</tbody></table></div></div>`;
  else body=`<div class="panel"><div class="row" style="margin-bottom:12px"><h2 class="sp" style="margin:0">Expression report (plain words)</h2>
    <button class="btn ghost sm" data-act="obDlReport">${ic('down')}Download HTML</button></div>
    <p class="small muted" style="margin:-4px 0 12px">Written for a junior or a client who does not know accounts. Same text in the download.</p>
    <div class="report" style="max-height:70vh;overflow:auto">${onboardReportHTML(P,c,F,G,CL,R).replace(/^[\s\S]*?<body>/,'').replace(/<\/body>[\s\S]*$/,'')}</div></div>`;
  return `<div class="head"><div class="titles"><h1>Onboard: ${esc(P.name)}</h1>
    <p class="sub">${P.vouchers.toLocaleString('en-IN')} vouchers · ${fmtD(P.from)} → ${fmtD(P.to)} · ${F.length} finding${F.length===1?'':'s'} · ${R.items.length} roadmap items</p></div>
    <div class="row"><button class="btn ghost" data-act="obReset">Start over</button>
    <button class="btn" data-act="obCreate">${ic('plus')}Create client, findings & roadmap</button></div></div>
  <div class="tabs" role="tablist">${T.map(([k,l])=>`<button role="tab" aria-selected="${tab===k}" class="${tab===k?'on':''}" data-act="obTab" data-tab="${k}">${l}</button>`).join('')}</div>
  ${body}`}

/* ---------- apply: client + observations + roadmap ---------- */
async function onboardApply(){
  const D=ui.onboard;if(!D||D.step!=='done')return;
  const{P,c,F,G,CL,R}=D;
  const cid=nid();
  await put('clients',cid,{...c,id:cid,createdAt:new Date().toISOString(),risks:suggestedRisks(c),
    roadmap:R,onboard:{profile:P,checklist:CL,compliance:G,findings:F,at:new Date().toISOString()}});
  let n=0;
  for(const f of F){
    if(f.rating==='L')continue;
    await put('observations',nid(),{id:nid(),clientId:cid,auditId:'',title:f.title,rating:f.rating,
      status:'Open',condition:f.plain,criteria:'Books and vouchers should support every entry and cover every period.',
      cause:f.why,effect:'If left untested: '+f.why,rec:'Cover in the first roadmap slot: '+f.title,
      response:'',owner:'',due:'',amount:0,evidence:[],createdAt:new Date().toISOString(),fromOnboard:true});n++}
  // also stash books for procedures (same client FY doc)
  try{
    const texts=D.texts||[];
    if(texts.length){const V=onboardParse(texts),L=ledgersFromBooks(V);
      await savep({...pOpen({id:cid}),led:{file:P.files.join(', '),at:new Date().toISOString(),...L}})}
  }catch(e){console.warn('books stash',e)}
  toast('Client created · '+n+' findings as observations · roadmap with '+R.items.length+' items');
  ui.onboard=null;ui.lastId=cid;ui.ctab='overview';go('client-'+cid)}

/* ---------- actions ---------- */
Object.assign(ACT,{
  obTab:t=>{ui.onboardTab=t.dataset.tab;render()},
  obReset:()=>{ui.onboard=null;ui.onboardTab=null;render()},
  obCreate:()=>onboardApply(),
  obDlReport:()=>{const D=ui.onboard;if(!D)return;const{P,c,F,G,CL,R}=D;
    dlFile(fileSafe('Books analysis - '+c.name)+'.html',onboardReportHTML(P,c,F,G,CL,R))}
});
const _hfOB=handleFiles;
handleFiles=async function(kind,files,i){
  if(kind==='onboard'){
    try{ui.onboard={step:'running'};render();
      const D=await onboardRun(files);D.texts=[];for(const f of files)if(/\.xml$/i.test(f.name))D.texts.push(decodeBuf(await f.arrayBuffer()));
      D.step='done';ui.onboard=D;ui.onboardTab='profile';render();toast('Analysis complete — '+D.F.length+' findings')}
    catch(e){ui.onboard={step:'idle',error:e.message||String(e)};render();toast(e.message||String(e))}
    return}
  return _hfOB.apply(this,arguments)};
