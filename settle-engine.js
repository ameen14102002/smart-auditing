/* Smart Auditing — settlement engine: sales vs receipts and purchases vs payments, from a Tally Day Book XML.
   Pure functions, no screen: the same file runs in the app and in tests on a real Day Book (Axeon, 393 MB, 25 Nov 2026).
   What real Day Books do, and what this engine does about it:
   - Orders, delivery orders and delivery notes repeat the invoice with the same party and amount: they are not accounting, skipped.
   - Voucher types have the firm's own names (ICICI-Rcpt, Cash Rcpt, Bank Pymt): receipts and payments are known by the bank or
     cash ledger they post to, not by their name.
   - Bill numbers are written differently (AXE/26-27/0001, AXE/2627/0001, Axe/26-27/0001): compared on their core.
   - Narrations carry the bill number ("Inv No:Axe/26-27/0108") or the payer's name (bank text "/AXEON MARKETING INDI/").
   - Bills are settled by a receipt together with a discount credit note, TDS, or a journal.
   - Receipts are booked in another ledger (income, suspense, a sister concern) with the customer's name in the narration.
   Every party ties back to the books: period movement = open bills − unmatched credits + settlement of earlier years' bills. */
(function(root){
const R2=n=>Math.round((+n||0)*100)/100;
/* the tag itself, not a longer one that starts the same (<REFERENCE> is not <REFERENCEDATE>) */
const xtag=(b,n)=>{let i=b.indexOf('<'+n);while(i>=0&&!/[\s>\/]/.test(b[i+n.length+1]||''))i=b.indexOf('<'+n,i+1);if(i<0)return'';const j=b.indexOf('>',i);if(j<0||b[j-1]==='/')return'';const k=b.indexOf('</'+n+'>',j);return k<0?'':dec(b.slice(j+1,k))};
const dec=s=>s.indexOf('&')<0?s.trim():s.replace(/&amp;/g,'&').replace(/&apos;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#13;/g,'').replace(/&#10;/g,' ').replace(/&#(\d+);/g,(_,c)=>String.fromCharCode(+c)).trim();
const num=s=>{const n=parseFloat(String(s).replace(/,/g,''));return isFinite(n)?n:0};
const day=s=>{s=String(s||'');return s.length===8&&/^\d+$/.test(s)?s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8):s.slice(0,10)};
const dd=(a,b)=>Math.round((Date.parse(a)-Date.parse(b))/864e5);
/* the core of a bill number: letters and digits only, upper case (AXE/26-27/0001 = AXE/2627/0001 = axe-26-27-0001) */
const core=s=>String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const digits=s=>String(s||'').replace(/\D/g,'').replace(/^0+/,'');
/* a party's name as it may appear in a bank narration (upper case, no punctuation, no place suffix, no company words) */
const STOP=new Set(['PVT','PRIVATE','LTD','LIMITED','THE','AND','CO','COMPANY','M/S','MS','LLP','INDIA','ENTERPRISES','TRADERS','AGENCIES','AGENCY','STORES','STORE','MEDICALS','MEDICAL','PHARMA','DISTRIBUTORS','CORPORATION','SALES','MARKETING','SHRI','SRI','NEW']);
const nn=s=>String(s||'').toUpperCase().replace(/&AMP;/g,'&').replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const nameKey=s=>{const base=nn(String(s||'').split(/\s[-–]\s|\(/)[0]);return{flat:base.replace(/ /g,''),toks:base.split(' ').filter(t=>t.length>=3&&!STOP.has(t))}};
const MONEY0=/bank|\bhdfc|icici|\bsbi\b|axis|kotak|idfc|yes bank|canara|baroda|federal|indusind|\bod\b|\bcc\b|current a\/?c|overdraft|^cash( in hand| a\/?c| account)?$|petty cash/i,NOTMONEY=/discount|sales|purchase|income|expense|charges|interest|commission|loan|deposit|tds|gst|salary|cheque|bounce|suspense|transfer/i,MONEY={test:l=>MONEY0.test(String(l).trim())&&!NOTMONEY.test(l)};
const NONACC=/order|delivery|quotation|\bmemo\b|receipt note|rejection|stock journal|physical stock|material (in|out)|job work/i;

/* ---------- read ---------- */
function parse(text,o={}){
  const V=[],re=/<VOUCHER[\s>]/g;let m,skipped={};
  while((m=re.exec(text))){const e=text.indexOf('</VOUCHER>',m.index);if(e<0)break;re.lastIndex=e+10;
    const head=text.slice(m.index,Math.min(e,m.index+600)),vt0=(head.match(/VCHTYPE="([^"]*)"/)||[])[1]||'';
    if(NONACC.test(vt0)&&!/credit|debit/i.test(vt0)){skipped[vt0]=(skipped[vt0]||0)+1;continue}
    let b=text.slice(m.index,e);
    if(/<ISCANCELLED>Yes</.test(b)||/<ISOPTIONAL>Yes</.test(b)||/<ISDELETED>Yes</.test(b)){skipped['cancelled or optional']=(skipped['cancelled or optional']||0)+1;continue}
    const vt=xtag(b,'VOUCHERTYPENAME')||dec(vt0);if(NONACC.test(vt)&&!/credit|debit/i.test(vt)){skipped[vt]=(skipped[vt]||0)+1;continue}
    const isInv=/<ISINVOICE>Yes</.test(b);
    /* ledger entries outside the inventory section (the stock items' own accounting is not the party's) */
    let L=b;if(L.indexOf('<ALLINVENTORYENTRIES.LIST>')>=0||L.indexOf('<INVENTORYENTRIES.LIST>')>=0)L=L.replace(/<(ALL)?INVENTORYENTRIES\.LIST>[\s\S]*?<\/(ALL)?INVENTORYENTRIES\.LIST>/g,'');
    const les=[];for(const x of L.match(/<(ALLLEDGERENTRIES|LEDGERENTRIES)\.LIST>[\s\S]*?<\/\1\.LIST>/g)||[]){const l=xtag(x,'LEDGERNAME'),a=num(xtag(x,'AMOUNT'));if(!l||!a)continue;
      const al=[];for(const ba of x.match(/<BILLALLOCATIONS\.LIST>[\s\S]*?<\/BILLALLOCATIONS\.LIST>/g)||[]){const ax=num(xtag(ba,'AMOUNT'));if(!ax)continue;
        al.push([xtag(ba,'NAME'),{'new ref':'N','agst ref':'A','advance':'V','on account':'O'}[xtag(ba,'BILLTYPE').toLowerCase()]||'O',R2(Math.abs(ax)),ax<0?1:0,parseInt(xtag(ba,'BILLCREDITPERIOD'))||0])}
      const dp=x.match(/<ISDEEMEDPOSITIVE>(Yes|No)</);les.push({l,dr:dp?dp[1]==='Yes':a<0,a:R2(Math.abs(a)),al})}
    if(!les.length)continue;
    const dt=xtag(b,'DATE');V.push({d:day(dt),vt,vno:xtag(b,'VOUCHERNUMBER'),ref:xtag(b,'REFERENCE'),party:xtag(b,'PARTYLEDGERNAME'),nar:xtag(b,'NARRATION').slice(0,240),inv:isInv,les})}
  const D=build(V,skipped);if(o.keep)D.V=V;return D}
/* from vouchers to party postings: who is a party, what kind each voucher is */
function build(V,skipped){
  const billed=new Set();for(const v of V)for(const e of v.les)if(e.al.length)billed.add(e.l);
  const isMoney=l=>MONEY.test(l)&&!billed.has(l);
  /* parties: ledgers kept bill-wise, plus the party of every invoice */
  const parties=new Set(billed);for(const v of V)if(v.party&&!isMoney(v.party)&&(v.inv||/sales|purchase|credit|debit/i.test(v.vt)))parties.add(v.party);
  const kind=v=>{const t=v.vt.toLowerCase();if(/credit ?note|sales ?return/.test(t))return'cn';if(/debit ?note|purchase ?return/.test(t))return'dn';
    const mon=v.les.filter(e=>isMoney(e.l));if(mon.length){const dr=mon.reduce((s,e)=>s+(e.dr?e.a:-e.a),0);if(v.les.every(e=>isMoney(e.l)))return'c';return dr>0?'r':'y'}
    if(/purchase/.test(t))return'p';if(/sales|invoice/.test(t)||v.inv){const pe=v.les.find(e=>parties.has(e.l));return pe&&!pe.dr?'p':'s'}return'j'};
  /* an invoice repeated by a voucher that is not an invoice (an order under another name): same party, date and amount */
  const invKey=new Set(V.filter(v=>v.inv).map(v=>v.party+'|'+v.d+'|'+(v.les.find(e=>e.l===v.party)?.a||0)));
  const P=[],X=[],stats={vouchers:V.length,kinds:{},skipped};
  V.forEach((v,vi)=>{const k=kind(v);v.k=k;if(k==='c')return;
    if(!v.inv&&(k==='s'||k==='p')&&!v.les.some(e=>e.al.length)&&invKey.has(v.party+'|'+v.d+'|'+(v.les.find(e=>e.l===v.party)?.a||0))){stats.skipped['repeat of an invoice']=(stats.skipped['repeat of an invoice']||0)+1;return}
    stats.kinds[k]=(stats.kinds[k]||0)+1;const oth=v.les.map(e=>e.l);
    for(const e of v.les){if(parties.has(e.l))P.push([v.d,k,v.vt,v.vno,e.l,e.dr?1:0,e.a,e.al,v.nar,v.ref,vi,oth.filter(x=>x!==e.l).slice(0,4).join('; ')]);
      /* receipts and payments booked to a ledger that is not a party (income, suspense, sister concern): kept to look for the party in the narration */
      else if((k==='r'||k==='y'||k==='j')&&!isMoney(e.l)&&!/round|tds|tcs|gst|cgst|sgst|igst|cess|charges|discount|salary|expenses|payable|reimbursement|remuneration|rent|interest|commission/i.test(e.l))X.push([v.d,k,v.vt,v.vno,e.l,e.dr?1:0,e.a,v.nar,vi])}});
  const ds=P.map(p=>p[0]).sort();return{P,X,stats,from:ds[0]||'',to:ds[ds.length-1]||'',parties:[...parties]}}

/* ---------- match ---------- */
/* allocations of one entry under the same name are one bill (a bill with its TDS deduction inside: +50,559.06 and −857) */
const netAl=al=>{if(al.length<2)return al;const m=new Map();for(const [n,ty,a,dr,cp] of al){const k=core(n)+'|'+(ty==='A'?'A':'N');const x=m.get(k);const v=dr?a:-a;if(x){x[2]+=v}else m.set(k,[n,ty,v,0,cp])}
  return[...m.values()].filter(x=>Math.abs(x[2])>0.005).map(([n,ty,v,,cp])=>[n,ty,R2(Math.abs(v)),v>0?1:0,cp])};
/* ledgers kept bill-wise that are not customers or suppliers: expenses, rent, loans, staff costs (never in a sales or purchase bill) */
const NONTRADE=/expense|charges|\bloan\b|\brent\b|salary|salaries|wages|\btea\b|coffee|\bmilk\b|travel|telephone|\bmobile\b|internet|electricity|\beb\b|freight|transport|labour|insurance|stationery|printing|meeting|carpent|\bporter\b|repair|maintenance|\bstaff\b|conveyance|postage|courier|fuel|petrol|diesel|\bsim\b|refreshment|donation|advertis|professional fees|audit fees|\bemi\b|depreciation|capital|drawings/i,
  /* names that are never a supplier or customer, even when used as the party of an expense bill (a "GST ITC" voucher) */
  NONTRADE_ALWAYS=/\bexpenses?\b|charges\b|\bloan\b|\brent\b|salar|wages|\bstaff\b|insurance|\bemi\b|depreciation|drawings|capital a\/?c|\bcapital\b/i;
/* ---------- opening balances: Tally ledger masters (Display › List of Accounts › Export, with opening balances) ----------
   Each party's opening bills and advances as on the first day of the year, bill by bill (BILLALLOCATIONS of the ledger master).
   Tally writes debits as negative amounts. Owner, 28 Nov 2026: advances paid in Jan / Feb 2026 for bills of the new year. */
function parseOpening(text){const L={};const re=/<LEDGER NAME="([^"]*)"[\s\S]*?<\/LEDGER>/g;let m;
  while((m=re.exec(text))){const b=m[0],name=dec(m[1]),parent=xtag(b,'PARENT'),open=num(xtag(b,'OPENINGBALANCE'));const bills=[];
    for(const x of b.match(/<BILLALLOCATIONS\.LIST>[\s\S]*?<\/BILLALLOCATIONS\.LIST>/g)||[]){const amt=num(xtag(x,'OPENINGBALANCE'));if(!amt)continue;
      bills.push({ref:xtag(x,'NAME'),d:day(xtag(x,'BILLDATE')),amt:R2(-amt),adv:/<ISADVANCE>Yes</i.test(x)})}   /* amt: + debit, − credit */
    if(open||bills.length)L[name]={parent,open:R2(-open),bills}}
  return{L,n:Object.keys(L).length}}
/* the opening bills as entries dated on their own bill date, so they are matched and aged like the year's own bills */
function openingPostings(O,D,day0){const P=[],SUP=/creditor|payable|supplier/i,CUS=/debtor|receivable|customer/i;
  const role={};for(const p of D.P){const r=role[p[4]]=role[p[4]]||{s:0,p:0};if(p[1]==='s'||p[1]==='cn'||p[1]==='r')r.s++;if(p[1]==='p'||p[1]==='dn'||p[1]==='y')r.p++}
  let i=0;for(const [name,o] of Object.entries(O.L||{})){
    const r=role[name]||{s:0,p:0},sup=SUP.test(o.parent)||(!CUS.test(o.parent)&&(r.p>r.s||(!r.s&&!r.p&&o.open<0)));
    if(!SUP.test(o.parent)&&!CUS.test(o.parent)&&!r.s&&!r.p)continue;   // not a customer or supplier
    const items=o.bills.length?o.bills.map(b=>({...b})):[];const left=R2(o.open-items.reduce((t,b)=>t+b.amt,0));if(Math.abs(left)>1)items.push({ref:'',d:'',amt:left,adv:false,acc:1});
    for(const b of items){const dr=b.amt>0,a=Math.abs(b.amt),bill=sup?!dr:dr,k=sup?(bill?'p':'y'):(bill?'s':'r');
      P.push([b.d&&b.d<day0?b.d:prevDay(day0),k,'Opening balance',b.ref||'',name,dr?1:0,a,[[b.ref||'',b.acc?'O':bill?'N':(b.adv?'V':'N'),a,dr?1:0,0]],b.acc?'opening balance, not bill-wise':'opening '+(bill?'bill':'advance')+' as on '+day0,b.ref||'',-(++i),'']);}}
  return P}
const prevDay=d=>{const x=new Date(d+'T00:00:00Z');x.setUTCDate(x.getUTCDate()-1);return x.toISOString().slice(0,10)};
function calc(D,side,opt={}){
  const tol=1,credit=+opt.days||(side==='S'?30:45);
  if(opt.open&&opt.open.L){const OP=openingPostings(opt.open,D,D.from||'2026-04-01');if(OP.length)D={...D,P:[...OP,...D.P]}}
  /* the ageing date: the day the work is done, or the end of the month chosen. Entries dated after it (future-dated payments
     entered ahead in Tally, later bills) have not happened yet on that day: they are left out of the matching and counted */
  const asOf=/^\d{4}-\d{2}-\d{2}$/.test(opt.asOf||'')?opt.asOf:'';let after={n:0,amt:0,to:''};
  if(asOf&&D.to>asOf){const mine=side==='S'?/^(s|cn|r|j)$/:/^(p|dn|y|j)$/;for(const p of D.P)if(p[0]>asOf&&mine.test(p[1])){after.n++;after.amt=R2(after.amt+p[6]);if(p[0]>after.to)after.to=p[0]}
    D={...D,P:D.P.filter(p=>p[0]<=asOf),X:(D.X||[]).filter(x=>x[0]<=asOf),to:asOf}}
  const role={};for(const p of D.P){const r=role[p[4]]=role[p[4]]||{s:0,p:0,r:0,y:0,dr:0,cr:0};if(p[1]==='s'||p[1]==='cn')r.s+=p[6];else if(p[1]==='p'||p[1]==='dn')r.p+=p[6];else if(p[1]==='r')r.r+=p[6];else if(p[1]==='y')r.y+=p[6];if(p[5])r.dr+=p[6];else r.cr+=p[6]}
  const sideOf=n=>{const r=role[n];if(r.s||r.p)return r.s>=r.p?'S':'P';if(r.r&&!r.y)return'S';if(r.y&&!r.r)return'P';return r.dr>=r.cr?'S':'P'};
  const both=Object.keys(role).filter(n=>role[n].s&&role[n].p),bothSet=new Set(both);
  const pSide=p=>bothSet.has(p[4])?(/^(s|cn|r)$/.test(p[1])?'S':/^(p|dn|y)$/.test(p[1])?'P':sideOf(p[4])):sideOf(p[4]);
  const billDr=side==='S'?1:0,parties={},nonTrade={};
  for(const p of D.P){if(pSide(p)!==side)continue;const n=p[4],r=role[n];
    if((!r.s&&!r.p&&NONTRADE.test(n))||NONTRADE_ALWAYS.test(n)){const x=nonTrade[n]=nonTrade[n]||{party:n,n:0,dr:0,cr:0};x.n++;if(p[5])x.dr=R2(x.dr+p[6]);else x.cr=R2(x.cr+p[6]);continue}
    (parties[n]=parties[n]||[]).push(p)}
  const bills=[],pool=[],opening=[],over=[],allU=[],tie=[];
  const KIND={s:'Sales',p:'Purchase',r:'Receipt',y:'Payment',cn:'Credit note',dn:'Debit note',j:'Journal'};
  for(const [name,L] of Object.entries(parties)){L.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
    const B=[],U=[],byCore={},src={},preA={};let move=0;
    for(const p of L){move+=(p[5]===billDr?1:-1)*p[6];const pieces=p[7].length?netAl(p[7]):[['','',p[6],p[5],0]];
      for(const [ref,ty,amt,dr0] of pieces){const dr=p[7].length?dr0:p[5],isBill=dr===billDr,cr=core(ref);
        const base={d:p[0],t:p[1],kind:KIND[p[1]]||p[1],vt:p[2],vno:p[3],party:name,ref,ty,amt,nar:p[8],vref:p[9],oth:p[11]||''};
        if(isBill){
          if(ty==='A'&&src[cr]?.length&&!byCore[cr]?.length){/* the bill an advance was paid for (each advance and later payment under its name, oldest first) */
            const bl={...base,cores:[cr],rem:amt,by:[],how:null,refd:0};for(const s of src[cr]){if(bl.rem<=tol)break;const take=R2(Math.min(bl.rem,s.rem));if(take<=0)continue;s.rem=R2(s.rem-take);bl.rem=R2(bl.rem-take);bl.refd=R2(bl.refd+take);bl.by.push({d:s.d,kind:s.kind,vt:s.vt,vno:s.vno,amt:take,how:'adv',ty:s.ty})}
            if(bl.by.length)bl.how='adv';B.push(bl);byCore[cr]=[bl];continue}
          if(ty==='A'&&byCore[cr]?.length&&(p[1]==='s'||p[1]==='p')){/* a new invoice booked against an older bill's reference: its own bill, flagged; Tally lumps them */
            const bl={...base,rem:amt,by:[],how:null,refd:0,cores:[cr],misref:byCore[cr][0].vno};B.push(bl);byCore[cr].push(bl);continue}
          if(ty==='A'&&byCore[cr]?.length){/* a debit against an existing bill (a bounced cheque, an extra charge): the bill is re-opened, as in Tally */
            const ob=byCore[cr][byCore[cr].length-1];ob.amt=R2(ob.amt+amt);ob.rem=R2(ob.rem+amt);(ob.adds=ob.adds||[]).push({d:p[0],kind:base.kind,vt:p[2],vno:p[3],amt,nar:p[8]});continue}
          const bl={...base,rem:amt,by:[],how:null,refd:0,cores:[...new Set([cr,core(p[3]),core(p[9])])].filter((x,i)=>x&&(i===0||x.length>=3))};B.push(bl);
          if(ty==='N'||ty==='O'||ty===''){bl.cores.forEach((c,i)=>{if(!i||!byCore[c])(byCore[c]=byCore[c]||[]).push(bl)});if(ty==='N'&&cr&&byCore[cr]?.length>1)bl.dupName=1}
          else if(ty==='A'){if(cr&&!byCore[cr])byCore[cr]=[bl];if(!preA[cr]?.some(o=>o.amt>tol))bl.orphan=1}
          /* payments made before the bill, under the bill's own reference (an advance booked as Agst Ref to the order or bill number):
             they settle it when it comes, and are no longer payments of an earlier year's bill */
          if(cr&&preA[cr])for(const o of preA[cr]){if(bl.rem<=tol)break;if(o.amt<=tol)continue;const take=R2(Math.min(o.amt,bl.rem));bl.rem=R2(bl.rem-take);bl.refd=R2(bl.refd+take);bl.by.push({d:o.d,kind:o.kind,vt:o.vt,vno:o.vno,amt:take,how:'adv',ty:'A'});o.amt=R2(o.amt-take);if(o.amt<=tol){const i=opening.indexOf(o);if(i>=0)opening.splice(i,1)}}}
        else{
          if(ty==='A'){const LB=byCore[cr];
            if(LB&&LB.length){let left=amt;for(const bl of LB){if(left<=0)break;const take=Math.min(left,bl.rem);if(take<=0)continue;bl.rem=R2(bl.rem-take);bl.refd=R2(bl.refd+take);bl.by.push({d:p[0],kind:base.kind,vt:p[2],vno:p[3],amt:R2(take),how:'ref',ty:'A'});left=R2(left-take)}
              if(left>tol){const bl=LB[LB.length-1];over.push({...base,bill:bl,excess:R2(left)});U.push({...base,amt:R2(left),rem:R2(left),x:'over'})}}
            else if(src[cr]){const u={...base,rem:amt};U.push(u);src[cr].push(u)}
            else{opening.push(base);(preA[cr]=preA[cr]||[]).push(base)}}
          else{const u={...base,rem:amt};U.push(u);if(ty==='V'||ty==='N')(src[cr]=src[cr]||[]).push(u)}}}}
    for(const b of B)if(b.how===null&&b.rem<=tol){b.how=b.refd?'ref':'round';b.rem=0}
    for(const b of B)b.t0=b.rem;for(const u of U){u.t0=u.rem;allU.push(u)}
    const open=()=>B.filter(b=>b.rem>tol).sort((a,b)=>a.d<b.d?-1:1),free=()=>U.filter(u=>u.rem>tol).sort((a,b)=>a.d<b.d?-1:1);
    const apply=(b,u,amt,how)=>{amt=R2(Math.min(amt,u.rem,b.rem));if(amt<=0)return;b.by.push({d:u.d,kind:u.kind,vt:u.vt,vno:u.vno,amt,how,ty:u.ty});u.rem=R2(u.rem-amt);b.rem=R2(b.rem-amt);if(u.rem<=tol)u.rem=0;if(b.rem<=tol){b.rem=0;b.how=b.refd?'ref'+how:how}};
    /* the narration names the bill ("Inv No:Axe/26-27/0108", "AXE/26-27/0269") */
    for(const u of free()){const nc=core(u.nar);if(nc.length<4)continue;
      for(const b of open()){if(u.rem<=tol)break;if(b.cores.some(c=>c.length>=5&&nc.includes(c))||(digits(b.ref).length>=3&&new RegExp('(^|\\D)0*'+digits(b.ref)+'(\\D|$)').test(u.nar)&&/inv|bill|no/i.test(u.nar)))apply(b,u,b.rem,'nar')}}
    /* party and amount: one to one, nearest in date */
    const near=(b,u)=>Math.abs(dd(u.d,b.d))+(u.d<b.d?400:0);
    for(const b of open()){const c=free().filter(u=>Math.abs(u.rem-b.rem)<=tol).sort((x,y)=>near(b,x)-near(b,y))[0];if(c)apply(b,c,b.rem,'amt')}
    /* one receipt for several bills in a row */
    for(const u of free()){const O=open().filter(b=>b.d<=u.d||dd(b.d,u.d)<=7);
      for(let i=0;i<O.length&&u.rem>tol;i++){let s=0;for(let j=i;j<Math.min(O.length,i+10);j++){s=R2(s+O[j].rem);if(j>i&&Math.abs(s-u.rem)<=tol){for(const b of O.slice(i,j+1))apply(b,u,b.rem,'grp');break}if(s>u.rem+tol)break}}}
    /* a bill settled by two to four credits together: parts, or a receipt with a discount note, TDS or a journal */
    for(const b of open()){const F=free().filter(u=>u.d>=b.d&&dd(u.d,b.d)<=180).slice(0,14);let hit=null;
      const rec=(i,s,pick)=>{if(hit)return;if(pick.length>=2&&Math.abs(s-b.rem)<=tol){hit=pick.slice();return}if(pick.length===4||s>b.rem+tol)return;for(let j=i;j<F.length;j++){pick.push(F[j]);rec(j+1,R2(s+F[j].rem),pick);pick.pop();if(hit)return}};
      rec(0,0,[]);if(hit){const mixed=hit.some(u=>u.t!==hit[0].t);for(const u of hit)apply(b,u,u.rem,mixed?'combo':'split')}}
    /* a small difference: bank charges, rounding or a short receipt (up to ₹100 and 0.5 % of the bill) */
    for(const b of open()){const lim=Math.min(100,Math.max(tol,b.rem*.005));const c=free().filter(u=>u.d>=b.d&&Math.abs(u.rem-b.rem)<=lim&&dd(u.d,b.d)<=180).sort((x,y)=>Math.abs(x.rem-b.rem)-Math.abs(y.rem-b.rem))[0];
      if(c){const short=R2(b.rem-c.rem);apply(b,c,Math.min(c.rem,b.rem),'near');if(b.rem>0&&b.rem<=lim){b.short=R2(b.rem);b.rem=0;b.how='near'}else if(short<0)c.rem=0;b.diff=short}}
    /* on account: what is left, oldest bill first */
    for(const u of free())for(const b of open()){if(u.rem<=tol)break;const was=b.how;apply(b,u,Math.min(u.rem,b.rem),'fifo');if(b.rem>tol)b.how='part';else if(was==='part')b.how='fifo'}
    let openAmt=0,unAmt=0,openingAmt=0;
    for(const b of B){if(b.rem>tol&&b.how!=='part')b.how=b.by.length?'part':'open';if(b.short)b.rem=0;bills.push(b);openAmt+=b.rem}
    for(const u of U)if(u.rem>tol){pool.push(u);unAmt+=u.rem}
    for(const o of opening)if(o.party===name)openingAmt+=o.amt;
    const shorts=B.reduce((s,b)=>s+(b.short||0),0);
    tie.push({party:name,move:R2(move),open:R2(openAmt),un:R2(unAmt),earlier:R2(openingAmt),shorts:R2(shorts),diff:R2(move-(openAmt-unAmt-openingAmt+shorts))})}
  /* credits booked to another ledger with this party in the narration (bank text, payer's name) */
  const openB=bills.filter(b=>b.rem>tol),elsewhere=[],keys={};for(const n of Object.keys(parties))keys[n]=nameKey(n);
  const wantDr=side==='S'?0:1;
  for(const x of D.X||[]){if(x[5]!==wantDr||!(side==='S'?x[1]==='r'||x[1]==='j':x[1]==='y'||x[1]==='j'))continue;const nf=nn(x[7]).replace(/ /g,'');if(nf.length<6)continue;
    for(const [n,k] of Object.entries(keys)){if(n===x[4])continue;const hitName=(k.flat.length>=8&&nf.includes(k.flat.slice(0,Math.min(14,k.flat.length))))||(k.toks.length>=2&&k.toks.every(t=>nf.includes(t)));
      if(hitName){const b=openB.find(b=>b.party===n&&Math.abs(b.rem-x[6])<=tol);elsewhere.push({d:x[0],kind:KIND[x[1]],vt:x[2],vno:x[3],ledger:x[4],amt:x[6],nar:x[7],party:n,bill:b||null});break}}}
  const mis=[];for(const u of pool){const hit=openB.find(b=>b.party!==u.party&&Math.abs(b.rem-u.rem)<=tol&&Math.abs(dd(u.d,b.d))<=90);if(hit)mis.push({u,b:hit})}
  const to=D.to,ageOf=b=>dd(to,b.d),late=[];
  for(const b of bills){b.days=b.rem<=tol&&b.by.length?Math.max(0,dd(b.by[b.by.length-1].d,b.d)):null;b.cr=b.cp||credit;if(b.days!=null&&b.days>b.cr)late.push(b)}
  return{side,credit,bills,pool,allU,opening,over,mis,late,elsewhere,both:both,to,from:D.from,parties:Object.keys(parties).length,ageOf,tie,asOf:asOf||to,after,nonTrade:Object.values(nonTrade).sort((a,b)=>Math.abs(b.dr-b.cr)-Math.abs(a.dr-a.cr))}}
const API={parse,build,calc,core,nameKey,nn,R2,NONTRADE,parseOpening,openingPostings};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.SETTLE=API})(typeof window!=='undefined'?window:globalThis);
