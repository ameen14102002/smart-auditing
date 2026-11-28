/* Smart Auditing — ledger scrutiny engine: every ledger of the Tally Day Book, grouped and tested.
   Owner, 28 Nov 2026: "add a new process that is ledger scrutiny ... a audit type".
   How CA firms scrutinise ledgers (ICAI internal audit checklist; common practice), done here on every entry, not a sample:
   - Expenses: TDS deducted where due; input GST taken only where allowed (blocked credits) and RCM paid where due; no cash
     payment over the limit; booked every month; no sudden jumps; no personal or capital items; no earlier year's items.
   - Income: no debit balance. Debtors / creditors: belong on their own side. Loans and capital: no cash over the limits.
   - Suspense: nil. Journals: explained, not round sums on Sundays or at month end. No entry posted twice.
   Law (Tax Year 2026-27: the Income-tax Act, 2025 from 1 Apr 2026; rates and limits as under the 1961 Act):
   cash expense over ₹10,000 a person a day (₹35,000 for goods carriage) is disallowed (old s.40A(3), now s.36 of the 2025 Act);
   cash receipt of ₹2 lakh or more (old s.269ST); cash loans or deposits of ₹20,000 or more (old s.269SS / 269T);
   TDS (old s.194C / 194J / 194I / 194H / 194A, now s.393(1) table): contractors ₹30,000 a bill or ₹1 lakh a year,
   professional / technical fees ₹50,000 a year, rent ₹50,000 a month, commission ₹20,000 a year, interest ₹10,000 a year.
   GST: blocked credits s.17(5) CGST Act; reverse charge on legal services, GTA freight, security services and renting of
   commercial property from unregistered persons (Notification 13/2017-CT(R), as amended).
   Pure functions, no screen: runs in the app and in tests. */
(function(root){
const R2=n=>Math.round((+n||0)*100)/100;
const dec=s=>s.indexOf('&')<0?s.trim():s.replace(/&amp;/g,'&').replace(/&apos;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#13;/g,'').replace(/&#10;/g,' ').replace(/&#(\d+);/g,(_,c)=>String.fromCharCode(+c)).trim();
/* the tag itself, not a longer one that starts the same (<REFERENCE> is not <REFERENCEDATE>) */
const xtag=(b,n)=>{let i=b.indexOf('<'+n);while(i>=0&&!/[\s>\/]/.test(b[i+n.length+1]||''))i=b.indexOf('<'+n,i+1);if(i<0)return'';const j=b.indexOf('>',i);if(j<0||b[j-1]==='/')return'';const k=b.indexOf('</'+n+'>',j);return k<0?'':dec(b.slice(j+1,k))};
const num=s=>{const n=parseFloat(String(s).replace(/,/g,''));return isFinite(n)?n:0};
const NONACC=/order|delivery|quotation|\bmemo\b|receipt note|rejection|stock journal|physical stock|material (in|out)|job work/i;
const dayOf=s=>{s=String(s||'');return s.length===8&&/^\d+$/.test(s)?s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8):s.slice(0,10)};

/* ---------- read: vouchers [date, type, number, narration, [[ledger, dr 1/0, amount], ...]] and ledger groups if the file has masters ---------- */
function parse(text,o={}){
  const V=[],groups={},skipped={};let m;
  const lre=/<LEDGER NAME="([^"]*)"[\s\S]*?<\/LEDGER>/g;while((m=lre.exec(text))){const p=xtag(m[0],'PARENT');if(p)groups[dec(m[1])]=p}
  /* a ledger under a group of the firm's own ("Staff Welfare" under "Indirect Expenses"): the whole line of groups is kept */
  const gp={},gre=/<GROUP NAME="([^"]*)"[\s\S]*?<\/GROUP>/g;while((m=gre.exec(text))){const p=xtag(m[0],'PARENT');if(p)gp[dec(m[1])]=p}
  if(Object.keys(gp).length)for(const l of Object.keys(groups)){let g=groups[l],chain=[g],n=0;while(gp[g]&&n++<8){g=gp[g];chain.push(g)}groups[l]=chain.join(' › ')}
  const re=/<VOUCHER[\s>]/g;
  while((m=re.exec(text))){const e=text.indexOf('</VOUCHER>',m.index);if(e<0)break;const b=text.slice(m.index,e);re.lastIndex=e+10;
    if(/<ISCANCELLED>Yes</i.test(b)||/<ISOPTIONAL>Yes</i.test(b)||/<ISDELETED>Yes</i.test(b)){skipped.cancelled=(skipped.cancelled||0)+1;continue}
    const vt=xtag(b,'VOUCHERTYPENAME')||dec((b.slice(0,400).match(/VCHTYPE="([^"]*)"/)||[])[1]||'');if(NONACC.test(vt)&&!/credit|debit/i.test(vt)){skipped[vt]=(skipped[vt]||0)+1;continue}
    let L=b;if(L.indexOf('INVENTORYENTRIES.LIST>')>=0)L=L.replace(/<(ALL)?INVENTORYENTRIES\.LIST>[\s\S]*?<\/(ALL)?INVENTORYENTRIES\.LIST>/g,'');
    const E=[];for(const x of L.match(/<(ALLLEDGERENTRIES|LEDGERENTRIES)\.LIST>[\s\S]*?<\/\1\.LIST>/g)||[]){const l=xtag(x,'LEDGERNAME'),a=num(xtag(x,'AMOUNT'));if(!l||!a)continue;const dp=x.match(/<ISDEEMEDPOSITIVE>(Yes|No)</);E.push([l,(dp?dp[1]==='Yes':a<0)?1:0,R2(Math.abs(a))])}
    /* the stock items' own accounting (purchase / sales ledger inside the inventory lines) */
    for(const x of b.match(/<ACCOUNTINGALLOCATIONS\.LIST>[\s\S]*?<\/ACCOUNTINGALLOCATIONS\.LIST>/g)||[]){const l=xtag(x,'LEDGERNAME'),a=num(xtag(x,'AMOUNT'));if(!l||!a)continue;const dp=x.match(/<ISDEEMEDPOSITIVE>(Yes|No)</);E.push([l,(dp?dp[1]==='Yes':a<0)?1:0,R2(Math.abs(a))])}
    if(!E.length)continue;V.push([dayOf(xtag(b,'DATE')),vt,xtag(b,'VOUCHERNUMBER'),(xtag(b,'NARRATION')||'').replace(/\s+/g,' ').slice(0,160),E])
    if(o.max&&V.length>=o.max)break}
  V.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
  return{V,groups,skipped,from:V[0]?.[0]||'',to:V[V.length-1]?.[0]||''}}

/* ---------- what each ledger is ---------- */
const CLASSES={exp:'Expense',pur:'Purchase',sal:'Sales',inc:'Other income',tax:'Duties & taxes',bank:'Bank',cash:'Cash',party:'Customer / supplier',cap:'Capital / drawings',loan:'Loan / borrowing',adv:'Loans & advances (asset)',fa:'Fixed asset',susp:'Suspense / sundry',liab:'Provision / liability',other:'Other'};
const GROUP_TO=[[/indirect exp|direct exp|expenses|manufacturing exp|administrative/i,'exp'],[/purchase/i,'pur'],[/sales account/i,'sal'],[/income/i,'inc'],[/duties|taxes/i,'tax'],
  [/bank od|bank account|bank occ/i,'bank'],[/cash/i,'cash'],[/sundry debtor|sundry creditor/i,'party'],[/capital|reserves/i,'cap'],[/secured loan|unsecured loan|loans \(liab/i,'loan'],[/loans & advances|loans and advances|deposits \(asset/i,'adv'],[/fixed asset/i,'fa'],[/suspense/i,'susp'],[/provision|current liab/i,'liab']];
const RX={
  tax:/\b(c|s|i|ut)gst\b|\bitc\b|\btds\b|\btcs\b|\bcess\b|output tax|input tax|\bgst (payable|input|output|receivable|credit|cash|liability|rcm)|duties|professional tax|\bvat\b|income ?tax|advance tax/i,
  bank:/\bbank\b|\bhdfc|\bicici|\bsbi\b|\baxis|\bkotak|\bidfc|\byes bank|canara|baroda|federal|indusind|\bod a\/?c|overdraft|current a\/?c/i,
  cash:/^cash\b|\bcash( in hand| a\/?c| account)?$|petty cash|main cash|cash @|imprest|cash handed|\bcho\b/i,
  gate:/phone ?pe|\bupi\b|\bcard\b|razor ?pay|razorpay|paytm|g ?pay|google pay|swipe|pine ?labs|payment gateway|cashfree|ccavenue|\bpos\b|razor payments/i,
  susp:/suspense|clearing|^sundr(y|ies)$|miscellaneous a\/?c|unknown|unidentified/i,
  loan:/\bloan\b|\bod\b|overdraft|unsecured|secured|borrowing|deposit from|\bemi\b/i,
  cap:/\bcapital\b|drawings|proprietor|partner'?s?\b(?! fees)/i,
  fa:/furniture|fixture|computer|laptop|vehicle|machinery|\bplant\b|building|equipment|air ?condition|printer|software licen|electrical installation|\bland\b|motor car|car a\/?c/i,
  pur:/^purchase|purchase (local|interstate|inter-state|account|a\/c|@|gst|\d)/i,
  sal:/^sales?\b|sales (local|interstate|account|a\/c|@|gst|\d)/i,
  inc:/income|received|discount (received|earned)|interest (received|earned|on fd|on deposit)|rent received|commission received|dividend|misc(ellaneous)? income|scrap sale/i,
  exp:/expense|charges|\bfees?\b|salary|salaries|wages|\brent\b|\btea\b|coffee|\bmilk\b|travel|telephone|mobile|internet|broadband|electricity|\beb\b|freight|transport|cartage|labour|coolie|insurance|stationery|printing|meeting|carpent|repair|maintenance|\bamc\b|conveyance|postage|courier|fuel|petrol|diesel|refreshment|donation|advertis|commission|brokerage|interest|bonus|incentive|gift|depreciation|bad debt|discount allowed|packing|consumable|cleaning|security|water|generator|hire|bus fare|auto|porter|subscription|software|hosting|legal|audit|consult|professional/i,
  liab:/provision|payable|outstanding|creditors for exp/i,
  adv:/advance|deposit|prepaid|recoverable|receivable/i};
function classify(D,over={}){
  const st={};for(const v of D.V){const isTrade=/purchase|sales|credit note|debit note/i.test(v[1]);for(const [l,dr,a] of v[4]){const s=st[l]=st[l]||{n:0,dr:0,cr:0,trade:0,inTrade:0,months:{}};s.n++;if(dr)s.dr=R2(s.dr+a);else s.cr=R2(s.cr+a);if(isTrade)s.inTrade++;const mo=v[0].slice(0,7);s.months[mo]=R2((s.months[mo]||0)+(dr?a:-a))}}
  /* the party of a trade voucher: the single ledger on the other side of the sales / purchase ledger, with bill-wise style use */
  for(const v of D.V){if(!v[4].some(e=>RX.bank.test(e[0])||RX.cash.test(e[0])))continue;for(const e of v[4])if(st[e[0]])st[e[0]].money=(st[e[0]].money||0)+1}
  for(const v of D.V){if(!/purchase|sales|credit note|debit note/i.test(v[1]))continue;const big=v[4].reduce((m,e)=>e[2]>m[2]?e:m,v[4][0]);if(big&&st[big[0]])st[big[0]].trade++}
  const cls={};
  for(const [l,s] of Object.entries(st)){let c=over[l]||'';
    if(!c&&D.groups[l]){const g=D.groups[l];for(const [re,k] of GROUP_TO)if(re.test(g)){c=k;break}}
    if(!c){if(RX.tax.test(l))c='tax';else if(RX.cash.test(l)&&!/discount|sales|counter|salary|wages/i.test(l))c='cash';else if((RX.bank.test(l)||RX.gate.test(l))&&!RX.loan.test(l)&&!/charges|interest|commission/i.test(l))c='bank';
      else if(s.trade&&!RX.pur.test(l)&&!/^sales?\b|sales (local|interstate|account|@|gst|\d)|^total sales/i.test(l)&&!/round|discount/i.test(l))c='party';
      else if(RX.susp.test(l))c='susp';else if(RX.loan.test(l)&&!/interest/i.test(l))c='loan';else if(RX.cap.test(l))c='cap';
      else if(RX.pur.test(l))c='pur';else if((RX.sal.test(l)&&!/counter sales|cash sales a\/?c/i.test(l))||/^total sales/i.test(l))c='sal';else if(/payable|provision|outstanding/i.test(l))c='liab';else if(RX.inc.test(l))c='inc';
      else if(RX.fa.test(l)&&!/repair|maintenance|expense|rent|hire|insurance|loan/i.test(l))c='fa';
      else if(RX.exp.test(l))c='exp';else if(RX.liab.test(l))c='liab';else if(RX.adv.test(l))c='adv';
      else if(s.trade||s.money||/counter sales|cash sales a\/?c|customer/i.test(l))c='party';else c='other'}
    cls[l]=c}
  return{st,cls}}

/* ---------- the checks ---------- */
const TDS_RULES=[
  {k:'194C',re:/contract|freight|transport|cartage|carriage|labour|job ?work|courier|porter|loading|unloading|catering|printing|advertis|security|housekeeping|cleaning|carpent|civil work|fabrication/i,n:'Payments to contractors (freight, labour, job work, printing, advertising)',sec:'old s.194C · s.393(1) Table 6(i)',one:30000,year:100000,rate:'1% / 2%'},
  {k:'194J',re:/professional|consult|legal|advocate|lawyer|audit fee|technical|software|design|accounting fee|ca fees|architect|doctor|medical fee/i,n:'Professional and technical fees',sec:'old s.194J · s.393(1) Table 6(iii)',one:0,year:50000,rate:'2% / 10%'},
  {k:'194I',re:/\brent\b|lease|godown rent|hire of/i,n:'Rent',sec:'old s.194-I · s.393(1) Table 2(ii)',month:50000,rate:'2% / 10%'},
  {k:'194H',re:/commission|brokerage|agent/i,n:'Commission and brokerage',sec:'old s.194H · s.393(1) Table 1(ii)',one:0,year:20000,rate:'2%'},
  {k:'194A',re:/interest(?! received| earned| income)/i,n:'Interest (other than to banks)',sec:'old s.194A · s.393(1) Table 5(iii)',one:0,year:10000,rate:'10%',notBank:1}];
const RCM_RULES=[[/legal|advocate|lawyer/i,'Legal services by an advocate'],[/freight|transport|gta|lorry|truck/i,'Goods transport agency (freight by road)'],[/security (service|charges|guard)|security$/i,'Security services by a non-company'],[/\brent\b/i,'Renting of commercial property by an unregistered person'],[/sponsor/i,'Sponsorship'],[/director.*(fee|sitting)/i,'Directors\' sitting fees']];
const BLOCKED=/\bfood\b|\btea\b|coffee|\bmilk\b|meal|canteen|catering|refreshment|hotel|restaurant|beauty|health|medical|\bclub\b|membership|motor car|\bcar\b|vehicle|rent ?a ?cab|cab hire|\bgift|life insurance|health insurance|leave travel|personal|construction|building (repair|work)|works contract|staff welfare|party|celebration|festival/i;
const PERSONAL=/\bpersonal\b|family|\bhouse\b|residence|\bhome\b|\bson\b|daughter|\bwife\b|husband|school fee|tuition|\blic\b|marriage|wedding|birthday|jewel|\bgold\b|\bmd\b.*(use|exp)|director'?s? (car|house|personal)|proprietor'?s?/i;
const RECUR=/\brent\b|salary|salaries|wages|electricity|\beb\b|telephone|internet|broadband|\bamc\b|maintenance charges|lease|\bemi\b|security/i;
/* what an expense is about, from its ledger name or its narration */
const TOPICS={rent:/\brent\b|lease/,electricity:/electricity|\beb\b|power bill|tneb|eb bill|current bill/,telephone:/telephone|mobile|airtel|\bjio\b|vodafone|bsnl|internet|broadband|recharge|\bsim\b/,
  freight:/freight|transport|courier|porter|lorry|cartage|parcel|logistic|shipping|loadman|coolie/,salary:/salary|salaries|wages|incentive|bonus|stipend/,repairs:/repair|maintenance|service charge|\bamc\b|plumb|electrician|carpent|painting|false ?ceiling/,
  stationery:/stationery|printing|xerox|photocopy|cartridge|toner|\bbill book/,travel:/travel|bus fare|\bauto\b|taxi|\bcab\b|uber|\bola\b|train|flight|ticket|toll|parking/,fuel:/petrol|diesel|\bfuel\b/,
  food:/\btea\b|coffee|\bmilk\b|snack|lunch|dinner|breakfast|bri?yani|\bfood\b|refreshment|water can|juice/,professional:/consult|professional|legal|advocate|audit fee|\bca fee/,
  advertising:/advert|promotion|facebook|google ads|instagram|banner|flex print|pamphlet|photo ?shoot/,insurance:/insurance|premium/,bankchg:/bank charge|sms charge|annual fee|\bmdr\b/,
  cleaning:/cleaning|housekeeping|sanitizer|phenyl|broom|detergent|pest/};
const topicsOf=t=>{t=String(t||'').toLowerCase();return Object.keys(TOPICS).filter(k=>TOPICS[k].test(t))};
const GENERAL=/general|misc|sundry|other exp|petty exp|office exp|day to day|daily exp/i;
const MONS=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
/* a month named in a narration that lies before the financial year of the voucher ("Mar'26" in April, "DT 17 12 2025", "FY 2025-26") */
function earlierIn(nar,date){const fyS=(+date.slice(5,7)>=4?+date.slice(0,4):+date.slice(0,4)-1)+'-04';const t=String(nar||'').toLowerCase();let m;const hits=[];
  /* "Mar'26", "March 2026", "Mar-2026"; not "May 20" (a day) */
  const re1=/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:\s*['’]\s*(\d{2})\b|[\s\-\/.,]*(20\d{2})\b)/g;while((m=re1.exec(t))){const y=m[3]?+m[3]:2000+ +m[2],mi=MONS.indexOf(m[1])+1;hits.push(y+'-'+String(mi).padStart(2,'0'))}
  const re2=/(?:^|[^\d\/])(\d{1,2})([\/.\-])(\d{1,2})\2(20\d{2})(?!\d)/g;while((m=re2.exec(t))){const mi=+m[3],y=+m[4];if(mi>=1&&mi<=12&&+m[1]>=1&&+m[1]<=31&&y>=2015)hits.push(y+'-'+String(mi).padStart(2,'0'))}
  const re3=/\b(?:fy|f\.y\.|year)\s*(20\d{2})\s*[-–\/]\s*(\d{2})\b/g;while((m=re3.exec(t))){hits.push(m[1]+'-12')}
  const lo=(+fyS.slice(0,4)-3)+'-01';return hits.find(h=>h<fyS&&h>=lo)||''}
const sunday=d=>new Date(d+'T00:00:00').getDay()===0;
const monthEnd=d=>{const x=new Date(d+'T00:00:00'),n=new Date(x);n.setDate(x.getDate()+3);return n.getMonth()!==x.getMonth()};

function scrutinise(D,opt={}){
  const {st,cls}=classify(D,opt.over||{}),C=l=>cls[l]||'other',is=(l,...k)=>k.includes(C(l));
  const F=[],add=(k,r,t,crit,eff,rec,items,amt)=>{if(items.length)F.push({k,r,t,crit,eff,rec,items,amt:R2(amt??items.reduce((s,x)=>s+(+x.amt||0),0))})};
  const V=D.V,vref=v=>v[1]+' '+(v[2]||''),hasTds=v=>v[4].some(e=>/\btds\b/i.test(e[0])),hasItc=v=>v[4].some(e=>e[1]&&C(e[0])==='tax'&&/gst|itc|input|cess/i.test(e[0])&&!/output|payable|rcm|reverse/i.test(e[0])),hasRcm=v=>v[4].some(e=>/rcm|reverse/i.test(e[0]));
  /* 1 cash payments over the limit, a person a day */
  {const agg={};for(const v of V){if(/sales|receipt|credit note/i.test(v[1]))continue;const cashCr=v[4].filter(e=>!e[1]&&C(e[0])==='cash');if(!cashCr.length)continue;
      for(const [l,dr,a] of v[4]){if(!dr||is(l,'cash','bank','tax','cap','loan','sal','inc','pur'))continue;const k=l+'|'+v[0];const x=agg[k]=agg[k]||{d:v[0],ledger:l,amt:0,v:[]};x.amt=R2(x.amt+a);x.v.push(vref(v))}}
    const it=Object.values(agg).filter(x=>x.amt>(/freight|transport|lorry|truck|goods carriage/i.test(x.ledger)?35000:10000)).map(x=>({d:x.d,ledger:x.ledger,amt:x.amt,vch:x.v.join(', '),note:'paid in cash in one day'}));
    add('cash40a','H',`${it.length} cash payment${it.length===1?'':'s'} over ₹10,000 to one ledger in a day`,'A business expense paid in cash over ₹10,000 to a person in a day (₹35,000 for hiring goods carriages) is not allowed as a deduction (old s.40A(3); s.36 of the Income-tax Act, 2025), unless an exception of the rules applies.','The amount is added back to taxable income.','Pay by bank. For each case see whether an exception applies (payment to government, banks, agriculturists, on a bank holiday ...) and keep the reason on file.',it)}
  /* 2 cash received of ₹2 lakh or more from one ledger in a day */
  {const agg={};for(const v of V){if(!v[4].some(e=>e[1]&&C(e[0])==='cash'))continue;for(const [l,dr,a] of v[4]){if(dr||is(l,'cash','bank','tax'))continue;const k=l+'|'+v[0];const x=agg[k]=agg[k]||{d:v[0],ledger:l,amt:0,v:[]};x.amt=R2(x.amt+a);x.v.push(vref(v))}}
    const it=Object.values(agg).filter(x=>x.amt>=200000&&!/counter|cash sales|retail/i.test(x.ledger)).map(x=>({d:x.d,ledger:x.ledger,amt:x.amt,vch:x.v.join(', '),note:'received in cash in one day'}));
    add('cash269st','H',`${it.length} cash receipt${it.length===1?'':'s'} of ₹2 lakh or more from one ledger in a day`,'No person may receive ₹2 lakh or more in cash from one person in a day, for one transaction or one event (old s.269ST of the 1961 Act; the corresponding section of the 2025 Act).','A penalty equal to the amount received.','Find out who paid and for what; stop cash receipts of this size.',it)}
  /* 3 cash loans, deposits or capital of ₹20,000 or more */
  {const it=[];for(const v of V){if(!v[4].some(e=>C(e[0])==='cash'))continue;for(const [l,dr,a] of v[4])if(is(l,'loan')&&a>=20000)it.push({d:v[0],ledger:l,amt:a,vch:vref(v),note:dr?'repaid / given in cash':'taken in cash'})}
    add('cashloan','H',`${it.length} loan or deposit entr${it.length===1?'y':'ies'} of ₹20,000 or more in cash`,'Loans and deposits of ₹20,000 or more may not be taken or repaid in cash (old s.269SS / 269T of the 1961 Act; the corresponding sections of the 2025 Act).','A penalty equal to the loan or deposit.','Route loans and deposits through the bank; record the reason for any case found.',it)}
  /* 4 TDS not seen where the ledger crosses the limit */
  {const it=[];for(const R of TDS_RULES){for(const [l,s] of Object.entries(st)){if(C(l)!=='exp'||!R.re.test(l)||(R.notBank&&/bank|loan|od\b/i.test(l)))continue;
      const VV=V.filter(v=>v[4].some(e=>e[0]===l&&e[1]));if(!VV.length)continue;const tot=R2(VV.reduce((t,v)=>t+v[4].filter(e=>e[0]===l&&e[1]).reduce((a,e)=>a+e[2],0),0));
      let over=false;if(R.month){const bm={};for(const v of VV){const k=v[0].slice(0,7);bm[k]=(bm[k]||0)+v[4].filter(e=>e[0]===l&&e[1]).reduce((a,e)=>a+e[2],0)}over=Object.values(bm).some(x=>x>R.month)}
      else over=tot>R.year||(R.one&&VV.some(v=>v[4].some(e=>e[0]===l&&e[1]&&e[2]>R.one)));
      if(!over)continue;const no=VV.filter(v=>!hasTds(v)),noAmt=R2(no.reduce((t,v)=>t+v[4].filter(e=>e[0]===l&&e[1]).reduce((a,e)=>a+e[2],0),0));if(noAmt<1)continue;
      it.push({d:VV[0][0],ledger:l,amt:noAmt,vch:no.length+' of '+VV.length+' entries without a TDS ledger',note:R.n+': '+R.sec+', TDS '+R.rate+'; ledger total ₹'+tot.toLocaleString('en-IN')})}}
    add('tds','H',`${it.length} expense ledger${it.length===1?'':'s'} over the TDS limit with entries that carry no TDS`,'TDS is due on these payments once the limits are crossed (Income-tax Act, 2025 s.393(1) from 1 Apr 2026; old ss.194C, 194J, 194-I, 194H, 194A). The limits apply per payee; the app sees the expense ledger, so check payee by payee. An individual or HUF below the turnover limit need not deduct.','The expense is disallowed (30%) until TDS is paid, with interest of 1% to 1.5% a month.','For each ledger, list the payees and amounts, deduct and deposit TDS where due, and file the TDS return.',it)}
  /* 5 GST credit taken on blocked items */
  {const it=[];for(const v of V){if(!hasItc(v))continue;const ex=v[4].filter(e=>e[1]&&(C(e[0])==='exp'||C(e[0])==='fa')&&(BLOCKED.test(e[0])||BLOCKED.test(v[3])));if(!ex.length)continue;
      const itc=R2(v[4].filter(e=>e[1]&&C(e[0])==='tax'&&/gst|itc|input|cess/i.test(e[0])).reduce((t,e)=>t+e[2],0));it.push({d:v[0],ledger:ex.map(e=>e[0]).join('; '),amt:itc,vch:vref(v),note:(v[3]||'').slice(0,80)})}
    add('blocked','H',`${it.length} entr${it.length===1?'y':'ies'} with input GST taken on an item that may be blocked`,'No input tax credit on motor vehicles and their repair or insurance, food and drinks, club membership, health and beauty, gifts, travel benefits to staff, or works contracts for a building (CGST Act s.17(5)).','Credit taken wrongly is reversed with interest at 18%, and a penalty may follow.','Check each: if the item is blocked, reverse the credit in GSTR-3B (table 4(B)(1)) and correct the books.',it)}
  /* 6 reverse charge not seen */
  {const it=[];for(const [l] of Object.entries(st)){if(C(l)!=='exp')continue;const R=RCM_RULES.find(([re])=>re.test(l));if(!R)continue;const VV=V.filter(v=>v[4].some(e=>e[0]===l&&e[1]));if(!VV.length||VV.some(hasRcm))continue;
      const tot=R2(VV.reduce((t,v)=>t+v[4].filter(e=>e[0]===l&&e[1]).reduce((a,e)=>a+e[2],0),0));if(tot<5000)continue;it.push({d:VV[0][0],ledger:l,amt:tot,vch:VV.length+' entries, none with a reverse charge ledger',note:R[1]})}
    add('rcm','M',`${it.length} expense ledger${it.length===1?'':'s'} where GST under reverse charge may be due`,'The receiver pays GST under reverse charge on legal services by an advocate, freight by a goods transport agency, security services by a non-company, and rent of commercial property from an unregistered person (Notification 13/2017-CT(R), as amended).','Unpaid reverse charge GST with interest; the credit of it is lost if paid late beyond the time limit.','Check each supplier\'s status; pay the reverse charge GST in GSTR-3B (3.1(d)) and take the credit.',it)}
  /* 7 balances on the wrong side */
  {const it=[];for(const [l,s] of Object.entries(st)){const c=C(l),net=R2(s.dr-s.cr);
      if(c==='exp'&&net<-1)it.push({d:'',ledger:l,amt:-net,vch:s.n+' entries',note:'expense with a credit balance for the period'});
      if((c==='inc'||c==='sal')&&net>1)it.push({d:'',ledger:l,amt:net,vch:s.n+' entries',note:'income with a debit balance for the period'})}
    add('side','M',`${it.length} ledger${it.length===1?'':'s'} with a balance on the wrong side`,'Expenses carry debit balances and incomes credit balances.','A wrong posting, a reversal without the original, or a ledger in the wrong group.','Look at the entries of each ledger and correct the posting or the group.',it)}
  /* 8 cash in hand running below nil */
  {const it=[];for(const [l] of Object.entries(st)){if(C(l)!=='cash'||!/petty|main cash|cash in hand|^cash( a\/?c| account)?$|imprest/i.test(l))continue;let bal=+((opt.cashOpen||{})[l]||0),min=bal,minD='';for(const v of V)for(const [x,dr,a] of v[4])if(x===l){bal=R2(bal+(dr?a:-a));if(bal<min){min=bal;minD=v[0]}}
      if(min<-1)it.push({d:minD,ledger:l,amt:-min,vch:'lowest balance on '+minD,note:opt.cashOpen?.[l]!=null?'with the opening balance given':'from a nil opening balance: enter the opening balance to confirm'})}
    add('cashneg','M',`${it.length} cash ledger${it.length===1?'':'s'} going below nil`,'Cash in hand can never be negative.','Payments entered without the receipt, or receipts not entered: the cash book is not reliable.','Enter the opening cash balance; trace each day the balance went below nil to the missing entry.',it)}
  /* 9 suspense */
  {const it=[];for(const [l,s] of Object.entries(st))if(C(l)==='susp')it.push({d:'',ledger:l,amt:Math.abs(R2(s.dr-s.cr)),vch:s.n+' entries',note:'debits '+s.dr.toLocaleString('en-IN')+', credits '+s.cr.toLocaleString('en-IN')});
    add('susp','M',`${it.length} suspense or sundry ledger${it.length===1?'':'s'} in use`,'Suspense and sundry ledgers are cleared to the right ledger before the books are closed.','Income or expenses not identified; the accounts may be misstated.','Identify each entry and transfer it to the right ledger.',it)}
  /* 10 journals worth a look */
  {const it=[];for(const v of V){if(!/journal/i.test(v[1])||v[4].every(e=>is(e[0],'cash','bank')))continue;const amt=R2(v[4].filter(e=>e[1]).reduce((t,e)=>t+e[2],0));if(amt<10000)continue;const why=[];
      if(amt%1000===0)why.push('round sum');if(!v[3])why.push('no narration');if(sunday(v[0]))why.push('Sunday');if(monthEnd(v[0]))why.push('last days of the month');if(v[4].some(e=>is(e[0],'cash','bank')))why.push('touches cash or bank');
      if(why.filter(w=>w!=='touches cash or bank').length>=1&&why.length>=2)it.push({d:v[0],ledger:v[4].map(e=>e[0]).slice(0,3).join('; '),amt,vch:vref(v),note:why.join(', ')})}
    add('jv','M',`${it.length} journal${it.length===1?'':'s'} of ₹10,000 or more with two or more warning signs`,'Journal entries are explained and approved, with supporting documents (SIA 320); manual and period-end journals carry the highest risk of error or fraud.','Expenses or income moved without support.','See the support and approval for each; ask who passed it and why.',it)}
  /* 11 the same entry twice */
  {const it=[],seen={};for(const v of V)for(const [l,dr,a] of v[4]){if(!dr||a<1000||!is(l,'exp','party','fa','other'))continue;const k=l+'|'+a;const prev=(seen[k]=seen[k]||[]).find(p=>Math.abs((Date.parse(v[0])-Date.parse(p[0]))/864e5)<=3&&p[2]!==v[2]);
      if(prev&&(prev[3]===v[3]||!v[3]))it.push({d:v[0],ledger:l,amt:a,vch:vref(v)+' and '+vref(prev),note:'same ledger and amount within 3 days'+(prev[3]&&prev[3]===v[3]?', same narration':'')});seen[k].push(v)}
    add('dup','M',`${it.length} possible duplicate entr${it.length===1?'y':'ies'}`,'Each bill is booked and paid once.','The same expense booked or paid twice.','Check both vouchers against the bill; reverse the duplicate and recover any double payment.',it)}
  /* 12 capital items in expenses */
  {const it=[];for(const v of V)for(const [l,dr,a] of v[4])if(dr&&C(l)==='exp'&&a>=50000&&(/repair|maintenance|software|equipment|furniture|computer|renovation|interior|civil|construction|machinery|purchase of/i.test(l)||/purchase of|new (machine|computer|laptop|furniture|ac)|installation|renovation|interior/i.test(v[3])))it.push({d:v[0],ledger:l,amt:a,vch:vref(v),note:(v[3]||'').slice(0,80)});
    add('capital','M',`${it.length} large entr${it.length===1?'y':'ies'} in expenses that may be capital`,'Spending that gives a benefit beyond the year (new assets, improvements) is capitalised and depreciated (AS 10 / Ind AS 16).','Profit understated now and assets understated; tax deduction disallowed.','Decide for each whether it is capital; move it to fixed assets and the asset register.',it)}
  /* 13 personal expenses */
  {const it=[],byL={};for(const v of V)for(const [l,dr,a] of v[4]){if(!dr||C(l)!=='exp')continue;if(PERSONAL.test(l)){const x=byL[l]=byL[l]||{d:v[0],ledger:l,amt:0,n:0};x.amt=R2(x.amt+a);x.n++}else if(PERSONAL.test(v[3]))it.push({d:v[0],ledger:l,amt:a,vch:vref(v),note:(v[3]||'').slice(0,80)})}
    for(const x of Object.values(byL))it.unshift({d:x.d,ledger:x.ledger,amt:x.amt,vch:x.n+' entries',note:'the ledger itself is for personal expenses'});
    add('personal','M',`${it.length} entr${it.length===1?'y':'ies'} that may be personal`,'Only expenses for the business are charged to it; personal expenses go to drawings or are recovered.','Personal expenses are disallowed and may be a benefit to the owner or director.','Ask about each; transfer personal items to drawings or recover them.',it)}
  /* 14 an earlier year's expenses */
  {const it=[];for(const v of V){const h=earlierIn(v[3],v[0]);if(!h)continue;for(const [l,dr,a] of v[4])if(is(l,'exp','inc')&&a>=1000)it.push({d:v[0],ledger:l,amt:a,vch:vref(v),note:'narration names '+h+': '+(v[3]||'').slice(0,60)})}
    add('prior','L',`${it.length} entr${it.length===1?'y that seems':'ies that seem'} to belong to an earlier year`,'Income and expenses are accounted in the year they belong to (accrual; prior-period items shown separately, AS 5).','This year\'s profit is misstated; last year\'s provision may be missing.','Check each against last year\'s provisions; show prior-period items separately.',it)}
  /* 15 regular expenses missing in a month, or a month far above the usual */
  {const it=[],mons=[];{let m=D.from.slice(0,7);const to=D.to.slice(0,7);while(m&&m<=to&&mons.length<24){mons.push(m);const [y,mm]=m.split('-').map(Number);m=mm===12?(y+1)+'-01':y+'-'+String(mm+1).padStart(2,'0')}}
    for(const [l,s] of Object.entries(st)){if(C(l)!=='exp')continue;const have=Object.keys(s.months).filter(k=>s.months[k]>0).sort();if(!have.length)continue;
      if(RECUR.test(l)&&have.length>=3){const miss=mons.filter(m=>m>=have[0]&&m<=have[have.length-1]&&!(s.months[m]>0));if(miss.length)it.push({d:'',ledger:l,amt:0,vch:'not booked in '+miss.join(', '),note:'a monthly expense, missing in '+miss.length+' month'+(miss.length===1?'':'s')})}
      const vals=have.map(k=>s.months[k]).sort((a,b)=>a-b),med=vals[Math.floor(vals.length/2)];if(vals.length>=4&&med>=5000)for(const k of have)if(s.months[k]>med*3&&s.months[k]-med>=25000)it.push({d:k+'-01',ledger:l,amt:R2(s.months[k]-med),vch:'month '+k,note:'₹'+Math.round(s.months[k]).toLocaleString('en-IN')+' against a usual ₹'+Math.round(med).toLocaleString('en-IN')})}
    add('trend','L',`${it.length} unusual month${it.length===1?'':'s'} in expense ledgers`,'Recurring expenses are booked every month (or provided for); month-wise amounts are compared and big changes explained (SIA 6, analytical review).','Missing months understate expenses; a sudden jump may be a wrong posting or a lumped bill.','Provide for the missing months; get the reason for each jump.',it)}
  /* 16 the right ledger: the narration says one thing, the ledger another; a specific expense in a general ledger */
  {const it=[],gen={};for(const v of V){const N=topicsOf(v[3]);if(!N.length)continue;for(const [l,dr,a] of v[4]){if(!dr||C(l)!=='exp'||a<500)continue;const Lt=topicsOf(l);
      if(GENERAL.test(l)&&!Lt.length){const k=l+'|'+N.join('+');const x=gen[k]=gen[k]||{d:v[0],ledger:l,amt:0,n:0,t:N.join(', '),v:[]};x.amt=R2(x.amt+a);x.n++;if(x.v.length<4)x.v.push(vref(v))}
      else if(Lt.length&&N.length===1&&!Lt.includes(N[0])&&!Lt.includes('bankchg'))it.push({d:v[0],ledger:l,amt:a,vch:vref(v),note:'the narration is about '+N[0]+', the ledger about '+Lt.join(', ')+': '+(v[3]||'').slice(0,60)})}}
    for(const x of Object.values(gen))if(x.amt>=2000)it.push({d:x.d,ledger:x.ledger,amt:x.amt,vch:x.n+' entries, e.g. '+x.v.join(', '),note:'specific expenses ('+x.t+') booked to a general ledger'});
    add('wrongled','M',`${it.length} entr${it.length===1?'y':'ies'} that may be in the wrong ledger`,'Each expense is booked to the ledger of its nature, so the accounts, the tax treatment (TDS, GST credit) and the month-wise review are right (SIA 320).','Expenses misclassified; TDS or GST may be missed because the ledger hides what was bought.','Look at each and pass a rectification journal to the right ledger; keep general ledgers for small sundry items only.',it)}
  /* 17 a ledger used the wrong way: purchases or sales straight against cash or bank (no party), expenses receiving money */
  {const it=[];for(const v of V){const mon=v[4].some(e=>is(e[0],'cash','bank'));if(!mon)continue;
      for(const [l,dr,a] of v[4]){if(a<1000)continue;const c=C(l);
        if(c==='pur'&&dr&&/payment|journal|contra/i.test(v[1]))it.push({d:v[0],ledger:l,amt:a,vch:vref(v),note:'purchase booked straight against cash or bank, without the supplier\'s ledger'});
        else if(c==='exp'&&!dr&&!/reversal|refund|return|reimburse|excess|cancel/i.test(v[3])&&!/charges|interest|commission|discount/i.test(l))it.push({d:v[0],ledger:l,amt:a,vch:vref(v),note:'money received into an expense ledger'});}}
    add('misuse','L',`${it.length} entr${it.length===1?'y':'ies'} where a ledger is used the wrong way`,'Purchases and sales go through the party\'s ledger (so creditors, debtors and GST are right); expense ledgers record spending, not receipts.','Suppliers or customers missing from the party ledgers; income hidden as a reduction of expenses.','Book the bill to the party first and pay it from there; take receipts to an income or the party\'s ledger.',it)}
  /* 18 the group of a ledger against its name (when the file has the ledger masters) */
  {const it=[];if(Object.keys(D.groups||{}).length){const nm=classify({V:V,groups:{}},{}).cls;for(const [l,g] of Object.entries(D.groups)){const a=cls[l],b=nm[l];if(!st[l]||!a||!b||a===b||opt.over?.[l])continue;
      if(['exp','tax','bank','cash','loan','fa','cap','susp','pur','sal'].includes(b)&&!(a==='party'&&b==='other'))it.push({d:'',ledger:l,amt:Math.abs(R2(st[l].dr-st[l].cr)),vch:'in the group '+g,note:'the name reads as '+CLASSES[b]+', the group makes it '+CLASSES[a]})}}
    add('group','M',`${it.length} ledger${it.length===1?'':'s'} that may be in the wrong group`,'Each ledger sits under the group of its nature, so the balance sheet and profit and loss account show it in the right place (Schedule III).','Amounts shown under the wrong head; ratios and tax computation misstated.','Check each ledger\'s group in Tally (Alter the ledger) and correct it.',it)}
  const ledgers=Object.entries(st).map(([l,s])=>({l,c:C(l),n:s.n,dr:s.dr,cr:s.cr,net:R2(s.dr-s.cr),g:D.groups[l]||''})).sort((a,b)=>Math.abs(b.net)-Math.abs(a.net));
  const flagged={};for(const f of F)for(const x of f.items)for(const l of String(x.ledger).split('; '))flagged[l]=(flagged[l]||0)+1;for(const x of ledgers)x.flags=flagged[x.l]||0;
  return{F,ledgers,cls,CLASSES,from:D.from,to:D.to,vouchers:V.length}}
/* the entries of one ledger, with the other side of each voucher */
function entriesOf(D,l){const R=[];for(const v of D.V)for(const [x,dr,a] of v[4])if(x===l)R.push({d:v[0],vt:v[1],vno:v[2],nar:v[3],dr:dr?a:0,cr:dr?0:a,other:[...new Set(v[4].filter(e=>e[0]!==l).map(e=>e[0]))].slice(0,4).join('; ')});return R}
const API={parse,classify,scrutinise,entriesOf,earlierIn,CLASSES,TDS_RULES};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.LEDGER=API})(typeof window!=='undefined'?window:globalThis);
