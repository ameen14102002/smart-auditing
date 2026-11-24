/* Smart Auditing — Sales vs receipts and Purchases vs payments, transaction by transaction, from the Tally Day Book XML.
   Owner, 24 Nov 2026: match each sale to its receipts and each purchase to its payments — those closed by bills in Tally,
   and those not closed by bills but matching on party and amount, overall.
   Three tiers, in this order, per party:
     1 Bill reference: Tally's bill-wise details (New Ref → Agst Ref; Advance → Agst Ref).
     2 Party and amount: what is left, matched on the same party by amount — one to one, one receipt for several bills
       in a row, or one bill paid in several parts.
     3 On account: what is still left, applied oldest bill first (as Tally's on-account balance would be).
   What remains is open (bills) or unmatched (receipts / payments: advances or excess). */
PR.settle={n:'Sales vs receipts · Purchases vs payments',ref:'SIA 320 · SA 505 · Tally bill-wise',why:'Every sale matched to its receipts and every purchase to its payments: by bill reference, else by party and amount, else on account. Open bills, advances and mispostings found.'};
for(const t of ['o2c','p2p','fin'])if(UNI[t]&&!UNI[t].procs.includes('settle'))UNI[t].procs.unshift('settle');
PK.splice(PK.indexOf('drs'),0,'settle');

/* ---------- read: every party posting with its bill allocations ---------- */
const STYPE=v=>{const t=String(v||'').toLowerCase();if(/order|quotation|memo/.test(t))return'';if(/credit ?note|sales ?return|rejection ?in/.test(t))return'cn';if(/debit ?note|purchase ?return|rejection ?out/.test(t))return'dn';
  if(/purchase/.test(t))return'p';if(/sales|invoice/.test(t))return's';if(/receipt/.test(t))return'r';if(/payment/.test(t))return'y';if(/journal/.test(t))return'j';return''};
const BT={'new ref':'N','agst ref':'A','advance':'V','on account':'O'};
function parseSettleXML(text){
  const P=[],re=/<VOUCHER[\s>]/g;let m;
  while((m=re.exec(text))){const e=text.indexOf('</VOUCHER>',m.index);if(e<0)break;const b=text.slice(m.index,e);re.lastIndex=e+10;
    if(/<ISCANCELLED>Yes</i.test(b)||/<ISOPTIONAL>Yes</i.test(b))continue;
    const vt=xtag(b,'VOUCHERTYPENAME')||(b.slice(0,300).match(/VCHTYPE="([^"]*)"/)||[])[1]||'',t=STYPE(vt)||STYPE((b.slice(0,300).match(/VCHTYPE="([^"]*)"/)||[])[1]);if(!t)continue;
    const dt=xtag(b,'DATE'),d=dt.length===8?dt.slice(0,4)+'-'+dt.slice(4,6)+'-'+dt.slice(6,8):ymdOf(dt);if(!d)continue;
    const party=xtag(b,'PARTYLEDGERNAME'),vno=xtag(b,'VOUCHERNUMBER'),nar=xtag(b,'NARRATION').slice(0,90);
    for(const en of b.match(/<(ALLLEDGERENTRIES|LEDGERENTRIES)\.LIST>[\s\S]*?<\/\1\.LIST>/g)||[]){
      const l=xtag(en,'LEDGERNAME'),a=num(xtag(en,'AMOUNT'));if(!l||!a)continue;
      const al=[];for(const ba of en.match(/<BILLALLOCATIONS\.LIST>[\s\S]*?<\/BILLALLOCATIONS\.LIST>/g)||[]){const x=num(xtag(ba,'AMOUNT'));if(!x)continue;
        const cp=xtag(ba,'BILLCREDITPERIOD');al.push([xtag(ba,'NAME'),BT[xtag(ba,'BILLTYPE').toLowerCase()]||'O',R2(Math.abs(x)),x<0?1:0,parseInt(cp)||0])}
      const isParty=al.length||(l===party&&!BANK_RE.test(l)&&!/^cash/i.test(l));if(!isParty)continue;
      const dp=en.match(/<ISDEEMEDPOSITIVE>(Yes|No)</i),dr=dp?/yes/i.test(dp[1]):a<0;
      P.push([d,t,vt,vno,l,dr?1:0,R2(Math.abs(a)),al,nar])}}
  return P}
async function settleImport(c,file,text){
  const P=parseSettleXML(text);if(!P.length)throw new Error('No sales, purchase, receipt or payment entries with parties were found in this Tally file.');
  const ds=P.map(p=>p[0]).sort(),d=pOpen(c);
  await savep({...d,settle:{file:file.name,at:new Date().toISOString(),from:ds[0],to:ds[ds.length-1],P:P.slice(0,60000),opt:d.settle?.opt||{}}});
  _stMemo={};return P}

/* ---------- match ---------- */
let _stMemo={};
function settleCalc(d,side){
  const S0=d.settle;if(!S0?.P?.length)return null;const key=S0.at+side+JSON.stringify(S0.opt||{});if(_stMemo[key])return _stMemo[key];
  const tol=1,credit=+(S0.opt?.[side+'days'])||(side==='S'?30:45);
  /* which side each party is on */
  const role={};for(const p of S0.P){const r=role[p[4]]=role[p[4]]||{s:0,p:0,r:0,y:0,dr:0,cr:0};
    if(p[1]==='s'||p[1]==='cn')r.s+=p[6];else if(p[1]==='p'||p[1]==='dn')r.p+=p[6];else if(p[1]==='r')r.r+=p[6];else if(p[1]==='y')r.y+=p[6];if(p[5])r.dr+=p[6];else r.cr+=p[6]}
  const sideOf=n=>{const r=role[n];if(r.s||r.p)return r.s>=r.p?'S':'P';if(r.r&&!r.y)return'S';if(r.y&&!r.r)return'P';return r.dr>=r.cr?'S':'P'};
  const both=Object.keys(role).filter(n=>role[n].s&&role[n].p);
  const billDr=side==='S'?1:0,parties={};
  const bothSet=new Set(both),pSide=p=>bothSet.has(p[4])?(/^(s|cn|r)$/.test(p[1])?'S':/^(p|dn|y)$/.test(p[1])?'P':sideOf(p[4])):sideOf(p[4]);
  for(const p of S0.P){if(pSide(p)!==side)continue;(parties[p[4]]=parties[p[4]]||[]).push(p)}
  const bills=[],pool=[],opening=[],over=[];
  for(const [name,L] of Object.entries(parties)){
    L.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
    const B=[],U=[],refs={};
    for(const p of L){const pieces=p[7].length?p[7]:[['','',p[6],p[5],0]];
      for(const [ref,ty,amt,dr0,cp] of pieces){const dr=p[7].length?dr0:p[5],isBill=dr===billDr;
        const base={d:p[0],t:p[1],vt:p[2],vno:p[3],party:name,ref,ty,amt,nar:p[8]};
        if(isBill){
          if(ty==='A'&&refs[ref]&&refs[ref].src){/* a bill adjusted against an advance (or a receipt booked as New Ref) */
            const src=refs[ref].src,take=Math.min(amt,src.rem);src.rem=R2(src.rem-take);
            const bl={...base,cp,rem:R2(amt-take),by:take?[{d:src.d,vt:src.vt,vno:src.vno,amt:take,how:'adv',ty:src.ty}]:[],how:take?'adv':null,refd:take};B.push(bl);continue}
          const bl={...base,cp,rem:amt,by:[],how:null,refd:0};B.push(bl);
          if(ty==='N'||(ty==='A'&&!refs[ref]))(refs[ref]=refs[ref]||{}).bill=refs[ref]?.bill||bl;
          if(ty==='A'&&!refs[ref]?.bill)bl.orphan=1}
        else{
          if(ty==='A'){const bl=refs[ref]?.bill;
            if(bl){const take=Math.min(amt,bl.rem);bl.rem=R2(bl.rem-take);bl.refd=R2(bl.refd+take);if(take)bl.by.push({d:p[0],vt:p[2],vno:p[3],amt:take,how:'ref',ty:'A'});
              if(amt-take>tol){over.push({...base,bill:bl,excess:R2(amt-take)});U.push({...base,amt:R2(amt-take),rem:R2(amt-take),x:'over'})}}
            else if(refs[ref]?.src){refs[ref].src.rem=R2(refs[ref].src.rem+amt)}
            else opening.push(base)}
          else{const u={...base,rem:amt};U.push(u);if(ty==='V'||ty==='N')(refs[ref]=refs[ref]||{}).src=u}}}}
    for(const b of B)if(b.how===null&&b.refd&&b.rem<=tol){b.how='ref';b.rem=0}
    /* tier 2: party and amount */
    const open=()=>B.filter(b=>b.rem>tol).sort((a,b)=>a.d<b.d?-1:1),free=()=>U.filter(u=>u.rem>tol).sort((a,b)=>a.d<b.d?-1:1);
    const near=(b,u)=>Math.abs(dayDiff(u.d,b.d))+(u.d<b.d?400:0);
    for(const b of open()){const c=free().filter(u=>Math.abs(u.rem-b.rem)<=tol).sort((x,y)=>near(b,x)-near(b,y))[0];
      if(c){b.by.push({d:c.d,vt:c.vt,vno:c.vno,amt:b.rem,how:'amt',ty:c.ty});c.rem=R2(c.rem-b.rem);if(c.rem<=tol)c.rem=0;b.rem=0;b.how=b.refd?'refamt':'amt'}}
    for(const u of free()){const O=open().filter(b=>b.d<=u.d||dayDiff(b.d,u.d)<=7);
      for(let i=0;i<O.length&&u.rem>tol;i++){let s=0;for(let j=i;j<Math.min(O.length,i+8);j++){s=R2(s+O[j].rem);if(j>i&&Math.abs(s-u.rem)<=tol){
        for(const b of O.slice(i,j+1)){b.by.push({d:u.d,vt:u.vt,vno:u.vno,amt:b.rem,how:'grp',ty:u.ty});b.rem=0;b.how=b.refd?'refamt':'grp'}u.rem=0;break}if(s>u.rem+tol)break}}}
    for(const b of open()){const F=free().filter(u=>u.d>=b.d);
      for(let i=0;i<F.length&&b.rem>tol;i++){let s=0;for(let j=i;j<Math.min(F.length,i+5);j++){s=R2(s+F[j].rem);if(j>i&&Math.abs(s-b.rem)<=tol){
        for(const u of F.slice(i,j+1)){b.by.push({d:u.d,vt:u.vt,vno:u.vno,amt:u.rem,how:'split',ty:u.ty});u.rem=0}b.rem=0;b.how=b.refd?'refamt':'split';break}if(s>b.rem+tol)break}}}
    /* tier 3: on account, oldest bill first */
    for(const u of free()){for(const b of open()){if(u.rem<=tol)break;const take=Math.min(u.rem,b.rem);b.by.push({d:u.d,vt:u.vt,vno:u.vno,amt:R2(take),how:'fifo',ty:u.ty});b.rem=R2(b.rem-take);u.rem=R2(u.rem-take);
      if(b.rem<=tol){b.rem=0;b.how=b.how==='adv'||b.refd?'reffifo':'fifo'}else b.how='part'}}
    for(const b of B){if(b.rem>tol&&b.how!=='part')b.how=b.by.length?'part':'open';bills.push(b)}
    for(const u of U)if(u.rem>tol)pool.push(u)}
  /* possible mispostings: an unmatched receipt / payment equal to another party's open bill */
  const openB=bills.filter(b=>b.rem>tol),mis=[];
  for(const u of pool){const hit=openB.find(b=>b.party!==u.party&&Math.abs(b.rem-u.rem)<=tol&&Math.abs(dayDiff(u.d,b.d))<=90);if(hit)mis.push({u,b:hit})}
  const to=S0.to,ageOf=b=>dayDiff(to,b.d),late=[];
  for(const b of bills){b.days=b.rem<=tol&&b.by.length?Math.max(0,dayDiff(b.by[b.by.length-1].d,b.d)):null;b.cr=b.cp||credit;if(b.days!=null&&b.days>b.cr)late.push(b)}
  const r={side,credit,bills,pool,opening,over,mis,late,both,to,from:S0.from,parties:Object.keys(parties).length,ageOf};
  if(Object.keys(_stMemo).length>6)_stMemo={};_stMemo[key]=r;return r}
const pl=(n,one,many)=>n+' '+(n===1?one:many);
const HOW={ref:['g','Closed by bill reference'],adv:['g','Closed against advance (bill reference)'],refamt:['b','Bill reference, rest by party and amount'],reffifo:['y','Bill reference, rest on account'],
  amt:['b','Party and amount: one to one'],grp:['b','Party and amount: one receipt, several bills'],split:['b','Party and amount: paid in parts'],fifo:['y','On account, oldest bill first'],part:['y','Part settled'],open:['r','Open']};
const HOWP={...HOW,grp:['b','Party and amount: one payment, several bills']};
const BOOK={N:'New Ref',A:'Agst Ref',V:'Advance',O:'On account','':'No bill details'};
const bookOf=x=>x.x==='over'?'Agst Ref, excess over the bill':BOOK[x.ty]??'No bill details';
const unKind=u=>u.x==='over'?'over':u.ty==='V'||u.ty==='N'?'adv':'acc';
/* ageing from the matching: open bills by bill date; unadjusted advances and on-account amounts by their own date, as credits */
function stAgeing(r,asOf){asOf=asOf||r.to;const P={},row=n=>P[n]=P[n]||{bill:0,adv:0,acc:0,age:[0,0,0,0,0],n:0},ix=a=>a<=30?0:a<=60?1:a<=90?2:a<=180?3:4;
  for(const b of r.bills)if(b.rem>1&&b.d<=asOf){const p=row(b.party);p.bill+=b.rem;p.age[ix(dayDiff(asOf,b.d))]+=b.rem;p.n++}
  for(const u of r.pool)if(u.d<=asOf){const p=row(u.party),k=unKind(u);p[k==='adv'?'adv':'acc']+=u.rem;p.age[ix(dayDiff(asOf,u.d))]-=u.rem}
  for(const p of Object.values(P)){p.bill=R2(p.bill);p.adv=R2(p.adv);p.acc=R2(p.acc);p.net=R2(p.bill-p.adv-p.acc);p.age=p.age.map(R2)}return P}
const tierOf=h=>h==='ref'||h==='adv'?1:h==='amt'||h==='grp'||h==='split'||h==='refamt'?2:h==='fifo'||h==='reffifo'?3:0;
const bucket=n=>n<=30?'0–30':n<=60?'31–60':n<=90?'61–90':n<=180?'91–180':'Over 180';
function stSummary(r,mk){
  const inM=x=>!mk||x.d.slice(0,7)===mk,B=r.bills.filter(inM),sum=L=>R2(L.reduce((s,b)=>s+b.amt,0)),sumR=L=>R2(L.reduce((s,b)=>s+b.rem,0));
  const t1=B.filter(b=>tierOf(b.how)===1),t2=B.filter(b=>tierOf(b.how)===2),t3=B.filter(b=>tierOf(b.how)===3),op=B.filter(b=>b.rem>1),pl=r.pool.filter(inM);
  return{B,t1,t2,t3,op,pl,sum,sumR,notRef:B.filter(b=>tierOf(b.how)!==1)}}

/* ---------- findings that become observations ---------- */
function stFlags(r){
  const S=r.side==='S',W=S?{b:'sale',bs:'sales bills',st:'receipt',sts:'receipts',p:'customer'}:{b:'purchase',bs:'purchase bills',st:'payment',sts:'payments',p:'supplier'},F=[],s=stSummary(r),pct=s.B.length?Math.round(s.notRef.length/s.B.length*100):0;
  if(s.notRef.length&&pct>=10)F.push({k:'noref',r:pct>=40?'H':'M',t:`${pct}% of ${W.bs} not closed bill-wise in Tally`,c:`${s.notRef.length} of ${s.B.length} ${W.bs} (${inr(s.sum(s.notRef))}) were not settled against their bill reference. ${s.t2.length} were matched only by party and amount, ${s.t3.length} on account, ${s.op.length} are open.`,
    cr:`${S?'Receipts':'Payments'} should be adjusted against the bills they settle (bill-wise details, Agst Ref) so that outstanding ${S?'receivables':'payables'} and their ageing are reliable.`,e:`Outstanding by bill and ageing in Tally are not reliable; ${S?'overdue debts and disputes':'duplicate payments and MSME dues'} can go unnoticed.`,rec:`Enforce bill-wise adjustment for every ${W.st}; clear on-account items against bills monthly; review the ${W.p} ledgers with on-account balances.`});
  if(r.over.length)F.push({k:'over',r:'H',t:`${pl(r.over.length,W.b+' bill',W.bs)} settled for more than billed`,c:r.over.slice(0,10).map(o=>`${o.party}: bill ${o.ref||o.bill.vno} ${inr(o.bill.amt)}, ${W.sts} against it exceed by ${inr(o.excess)} (${o.vt} ${o.vno}, ${fmtD(o.d)})`).join('; '),
    cr:`A bill cannot be settled for more than its amount.`,e:S?'Excess collection or a receipt posted to the wrong bill or party.':'Possible duplicate or excess payment to the supplier.',rec:`Verify each case with the ${W.p}'s statement; recover or adjust the excess; correct the bill references.`});
  if(r.mis.length)F.push({k:'mis',r:'H',t:`${pl(r.mis.length,'possible '+W.st,'possible '+W.sts)} posted to the wrong party`,c:r.mis.slice(0,10).map(x=>`${x.u.vt} ${x.u.vno} of ${fmtD(x.u.d)}, ${inr(x.u.rem)} in ${x.u.party}, unmatched there, equals open bill ${x.b.ref||x.b.vno} of ${x.b.party}`).join('; '),
    cr:`Each ${W.st} is accounted in the ledger of the party it came from.`,e:`Both parties' balances are misstated; confirmations will not agree.`,rec:`Check the bank statement and ${W.st} advice for each; pass rectification entries.`});
  const oldU=r.pool.filter(u=>r.ageOf(u)>90);if(oldU.length)F.push({k:'adv',r:'M',t:`${pl(oldU.length,S?'customer advance or excess receipt':'supplier advance or excess payment',S?'customer advances or excess receipts':'supplier advances or excess payments')} over 90 days old`,c:oldU.slice(0,12).map(u=>`${u.party}: ${u.vt} ${u.vno} of ${fmtD(u.d)}, ${inr(u.rem)}`).join('; '),
    cr:S?'Advances from customers are adjusted against supplies or refunded.':'Advances to suppliers are adjusted against bills or recovered (SIA 320).',e:S?'Liability overstated or receipts kept on account; GST on advances to be checked.':'Money blocked with suppliers; possible fictitious advances.',rec:`Obtain confirmations; adjust against bills or ${S?'refund':'recover'}; approve any long-outstanding advance.`});
  const oldB=r.bills.filter(b=>b.rem>1&&r.ageOf(b)>180);if(oldB.length)F.push({k:'old',r:S?'H':'M',t:`${pl(oldB.length,W.b+' bill',W.bs)} open for more than 180 days (${inr(oldB.reduce((s,b)=>s+b.rem,0))})`,c:oldB.slice(0,12).map(b=>`${b.party}: ${b.ref||b.vno} of ${fmtD(b.d)}, ${inr(b.rem)} open`).join('; '),
    cr:S?'Receivables followed up within credit terms; doubtful debts provided (Ind AS 109 / AS 29).':'Undisputed payables paid within terms; MSME dues within 45 days (MSMED Act s.15, Income-tax s.43B(h)).',e:S?'Possible bad debts; profit overstated.':'Interest under MSMED Act and disallowance under s.43B(h); disputes.',rec:S?'Follow up, get confirmations, provide for doubtful debts.':'Confirm and pay, or record the dispute.'});
  if(r.late.length)F.push({k:'late',r:'M',t:S?`${pl(r.late.length,'sales bill','sales bills')} collected after the credit period`:`${pl(r.late.length,'purchase bill','purchase bills')} paid after the credit period`,c:`Average ${Math.round(r.late.reduce((s,b)=>s+b.days,0)/r.late.length)} days against ${r.credit} days allowed. Slowest: `+r.late.slice().sort((a,b)=>b.days-a.days).slice(0,8).map(b=>`${b.party} ${b.ref||b.vno} (${b.days} days)`).join(', '),
    cr:S?'Collections within agreed credit terms.':'Payments within agreed terms; MSME suppliers within 45 days.',e:S?'Working capital blocked; credit risk.':'Interest to MSME suppliers; tax disallowance under s.43B(h).',rec:S?'Review credit limits and follow-up for the slow customers.':'Identify MSME suppliers among these and pay within 45 days.'});
  if(r.opening.length)F.push({k:'open',r:'L',t:`${pl(r.opening.length,W.st,W.sts)} against bills from before this file (${inr(r.opening.reduce((s,x)=>s+x.amt,0))})`,c:'Settle opening bills; agree them to last year\'s outstanding list: '+r.opening.slice(0,10).map(x=>`${x.party} ${x.ref}`).join(', '),cr:'Opening balances agree with the previous year\'s closing outstanding.',e:'Opening outstanding could be misstated.',rec:'Import a file from the start of the year, or check these against the opening bill list.'});
  if(r.both.length)F.push({k:'both',r:'L',t:r.both.length===1?'1 party is both a customer and a supplier':`${r.both.length} parties are both customers and suppliers`,c:r.both.slice(0,15).join(', '),cr:'Related transactions with the same party are approved; set-off only with agreement.',e:'Netting can hide balances; related-party risk.',rec:'Check approvals and any set-off agreement; review for related parties.'});
  return F}

/* ---------- screen ---------- */
function settleTab(c,d){
  const S0=d.settle,side=ui.stSide||'S',W=side==='S'?{bills:'Sales bills',st:'Receipts',st1:'receipt',p:'Customer'}:{bills:'Purchase bills',st:'Payments',st1:'payment',p:'Supplier'};
  const drop=`<label class="drop" data-drop="settle" style="margin-bottom:12px">${ic('up')}<b>Tally Day Book XML with bill-wise details</b><span class="small">${S0?'Now: '+esc(S0.file)+' · '+fmtD(S0.from)+' to '+fmtD(S0.to)+' · '+S0.P.length.toLocaleString('en-IN')+' party entries. Upload again to refresh.':'Gateway of Tally › Display More Reports › Day Book › period › Export as XML (with bill-wise details). The books import on the Programme tab fills this too.'}</span><input type="file" data-file="settle" accept=".xml" hidden></label>`;
  if(!S0)return drop+`<div class="empty">No Tally file yet. Each sale is matched to its receipts and each purchase to its payments: first by bill reference, then by party and amount, then on account, oldest bill first.</div>`;
  const r=settleCalc(d,side),months=[...new Set(r.bills.map(b=>b.d.slice(0,7)))].sort(),mk=months.includes(ui.stM)?ui.stM:'',s=stSummary(r,mk),HW=side==='S'?HOW:HOWP;
  const f=ui.stF||'all',party=ui.stP||'',L=(f==='un'?[]:s.B.filter(b=>f==='all'||(f==='t1'&&tierOf(b.how)===1)||(f==='t2'&&tierOf(b.how)===2)||(f==='t3'&&tierOf(b.how)===3)||(f==='open'&&b.rem>1))).filter(b=>!party||b.party===party);
  const tile=(n,l,amt,k,cl)=>`<button class="kpi${cl?' '+cl:''}" data-act="stF" data-v="${k}" style="text-align:left;cursor:pointer;${f===k?'outline:2px solid var(--acc);':''}"><b>${n}</b><span>${l}<br>${amt}</span></button>`;
  const by=b=>b.by.map(x=>{const g=dayDiff(x.d,b.d);return `${esc(x.vt)} ${esc(x.vno)} · ${fmtD(x.d)} · ${inr(x.amt)} · <b style="${g>b.cr?'color:var(--hi)':''}">${g<0?Math.abs(g)+' days before the bill':g+' days'}</b> <span class="muted">(${esc(BOOK[x.ty]??'No bill details')})</span>`}).join('<br>')||'—';
  const names=[...new Set(r.bills.map(b=>b.party).concat(r.pool.map(u=>u.party)))].sort();
  const PS={};for(const b of s.B){const p=PS[b.party]=PS[b.party]||{n:0,amt:0,t1:0,op:0,old:0,days:[]};p.n++;p.amt+=b.amt;if(tierOf(b.how)===1)p.t1++;p.op+=b.rem;if(b.rem>1&&r.ageOf(b)>90)p.old+=b.rem;if(b.days!=null)p.days.push(b.days)}
  for(const u of s.pl){const p=PS[u.party]=PS[u.party]||{n:0,amt:0,t1:0,op:0,old:0,days:[]};p.un=(p.un||0)+u.rem}
  const F=stFlags(r),shown=ui.stAll?L:L.slice(0,250),ag={};for(const b of s.op){const k=bucket(r.ageOf(b));ag[k]=(ag[k]||0)+b.rem}
  return drop+`<div class="row" style="gap:10px;margin-bottom:12px"><div class="seg" role="group"><button class="${side==='S'?'on':''}" data-act="stSide" data-v="S">Sales vs receipts</button><button class="${side==='P'?'on':''}" data-act="stSide" data-v="P">Purchases vs payments</button></div>
    <select data-stm="1" style="width:auto;max-width:240px"><option value="">Bills of every month</option>${months.map(m=>`<option value="${m}" ${m===mk?'selected':''}>Bills of ${mkLabel(m)}</option>`).join('')}</select>
    <select data-stp="1" style="width:auto;max-width:280px"><option value="">Every ${W.p.toLowerCase()}</option>${names.map(n=>`<option ${n===party?'selected':''}>${esc(n)}</option>`).join('')}</select><span class="sp"></span>
    <label class="small muted">Credit period <input type="number" min="0" max="365" data-stdays="${side}" value="${r.credit}" style="width:70px"> days</label><button class="btn ghost sm" data-act="stXlsx">${ic('down')}Excel</button></div>
   <div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">${tile(s.B.length,W.bills,inr(s.sum(s.B)),'all')}${tile(s.t1.length,'Closed by bill reference',inr(s.sum(s.t1)),'t1')}${tile(s.t2.length,'Not by bill: party and amount',inr(s.sum(s.t2)),'t2')}${tile(s.t3.length,'Not by bill: on account',inr(s.sum(s.t3)),'t3')}${tile(s.op.length,'Open bills',inr(s.sumR(s.op)),'open',s.op.length?'alert':'')}${tile(s.pl.length,W.st+' not matched to a bill',inr(R2(s.pl.reduce((a,u)=>a+u.rem,0))),'un',s.pl.length?'alert':'')}</div>
   ${s.B.length?`<div class="progress" style="height:10px;margin:14px 0 4px;display:flex" title="How the bills were closed"><span style="width:${s.t1.length/s.B.length*100}%;background:var(--ok)"></span><span style="width:${s.t2.length/s.B.length*100}%;background:var(--acc)"></span><span style="width:${s.t3.length/s.B.length*100}%;background:#d39b00"></span><span style="width:${s.op.length/s.B.length*100}%;background:var(--hi)"></span></div>
   <p class="small muted" style="margin:0 0 14px"><span class="dot" style="background:var(--ok)"></span> bill reference · <span class="dot" style="background:var(--acc)"></span> party and amount · <span class="dot" style="background:#d39b00"></span> on account · <span class="dot" style="background:var(--hi)"></span> open${s.op.length?' · open by age: '+['0–30','31–60','61–90','91–180','Over 180'].filter(k=>ag[k]).map(k=>k+' days '+inr(R2(ag[k]))).join(', '):''}</p>`:''}
   ${F.length?`<div class="panel" style="margin-bottom:14px"><h3>What the matching found</h3>${F.map(x=>`<div class="row" style="gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid var(--line)"><span class="tag ${x.r==='H'?'H':x.r==='M'?'y':'n'}">${{H:'High',M:'Medium',L:'Low'}[x.r]}</span><div class="sp"><b>${esc(x.t)}</b><div class="small muted">${esc(x.c.slice(0,320))}${x.c.length>320?'…':''}</div></div>${x.r==='L'?'':`<button class="btn ghost sm" data-act="stObs" data-v="${x.k}">${ic('plus')}Observation</button>`}</div>`).join('')}</div>`:''}
   ${f==='un'?`<div class="scroll"><table><thead><tr><th>Date</th><th>${W.st1[0].toUpperCase()+W.st1.slice(1)}</th><th>${W.p}</th><th>How it was booked</th><th class="num">Not matched</th><th>Age</th><th>Possible wrong party</th></tr></thead><tbody>${s.pl.filter(u=>!party||u.party===party).map(u=>{const m=r.mis.find(x=>x.u===u);return `<tr><td>${fmtD(u.d)}</td><td>${esc(u.vt)} ${esc(u.vno)}<div class="small muted">${esc(u.nar||'')}</div></td><td>${esc(u.party)}</td><td class="small">${esc(bookOf(u))}${u.ref&&(u.ty==='V'||u.ty==='N')?' '+esc(u.ref):''}</td><td class="num">${inr(u.rem)}</td><td>${r.ageOf(u)} days</td><td class="small">${m?`<span class="tag H">Check</span> equals open bill ${esc(m.b.ref||m.b.vno)} of ${esc(m.b.party)}`:''}</td></tr>`}).join('')||'<tr><td colspan="7" class="muted">Every '+W.st1+' is matched to a bill.</td></tr>'}</tbody></table></div>`
   :`<div class="scroll"><table><thead><tr><th>Bill date</th><th>Bill</th><th>${W.p}</th><th class="num">Amount</th><th>Settled by · days after the bill · booked as</th><th>How it was closed</th><th class="num">Days to close</th><th class="num">Open</th></tr></thead><tbody>${shown.map(b=>`<tr><td>${fmtD(b.d)}</td><td>${esc(b.vt)} ${esc(b.vno)}${b.ref&&b.ref!==b.vno?`<div class="small muted">Ref ${esc(b.ref)}</div>`:''}<div class="small muted">Booked as ${esc(BOOK[b.ty]??'No bill details')}</div>${b.orphan?'<div class="small" style="color:var(--hi)">Agst Ref to a bill not in this file</div>':''}</td><td>${esc(b.party)}</td><td class="num">${inr(b.amt)}</td><td class="small">${by(b)}</td><td><span class="tag ${HW[b.how][0]}">${HW[b.how][1]}</span></td><td class="num">${b.days==null?'—':b.days>b.cr?`<b style="color:var(--hi)">${b.days}</b>`:b.days}</td><td class="num">${b.rem>1?`<b>${inr(b.rem)}</b><div class="small muted">${r.ageOf(b)} days</div>`:'—'}</td></tr>`).join('')||'<tr><td colspan="8" class="muted">No bills in this selection.</td></tr>'}</tbody></table></div>${L.length>shown.length?`<p><button class="btn ghost sm" data-act="stAll">Show all ${L.length} bills</button></p>`:''}`}
   ${(()=>{const AG=stAgeing(r),E=Object.entries(AG).filter(([n])=>!party||n===party).sort((a,b)=>b[1].net-a[1].net),T=E.reduce((t,[,p])=>{t.bill+=p.bill;t.adv+=p.adv;t.acc+=p.acc;t.net+=p.net;p.age.forEach((v,i)=>t.age[i]+=v);return t},{bill:0,adv:0,acc:0,net:0,age:[0,0,0,0,0]}),cell=v=>Math.abs(v)<=1?'—':v<0?`<span style="color:var(--ok)">(${inr(R2(-v))})</span>`:inr(R2(v));
     return `<h2 class="section">Ageing as on ${fmtD(r.to)}</h2><p class="small muted" style="margin:-4px 0 10px">Built from the matching above. Open bills are aged from the bill date. ${W.st} not adjusted against a bill, booked in Tally as Advance or On account (or with no bill details), are aged from their own date and shown in brackets as credits.</p>
     <div class="scroll"><table><thead><tr><th>${W.p}</th><th class="num">Open bills<br><span class="small muted">against bill</span></th><th class="num">Advances<br><span class="small muted">not adjusted</span></th><th class="num">On account<br><span class="small muted">not adjusted</span></th><th class="num">Net outstanding</th><th class="num">0–30</th><th class="num">31–60</th><th class="num">61–90</th><th class="num">91–180</th><th class="num">Over 180</th></tr></thead><tbody>
     ${E.slice(0,ui.stAllA?9999:40).map(([n,p])=>`<tr><td><a href="#" data-act="stParty" data-v="${esc(n)}">${esc(n)}</a></td><td class="num">${cell(p.bill)}</td><td class="num">${cell(-p.adv)}</td><td class="num">${cell(-p.acc)}</td><td class="num"><b>${cell(p.net)}</b></td>${p.age.map((v,i)=>`<td class="num"${i===4&&v>1?' style="color:var(--hi);font-weight:600"':''}>${cell(v)}</td>`).join('')}</tr>`).join('')}
     <tr style="font-weight:600"><td>Total</td><td class="num">${cell(T.bill)}</td><td class="num">${cell(-T.adv)}</td><td class="num">${cell(-T.acc)}</td><td class="num">${cell(T.net)}</td>${T.age.map(v=>`<td class="num">${cell(v)}</td>`).join('')}</tr></tbody></table></div>${E.length>40&&!ui.stAllA?`<p><button class="btn ghost sm" data-act="stAllA">Show all ${E.length}</button></p>`:''}`})()}
   <h2 class="section">By ${W.p.toLowerCase()}</h2><div class="scroll"><table><thead><tr><th>${W.p}</th><th class="num">Bills</th><th class="num">Billed</th><th class="num">By bill reference</th><th class="num">Average days</th><th class="num">Open</th><th class="num">Open over 90 days</th><th class="num">${W.st} not matched</th></tr></thead><tbody>${Object.entries(PS).sort((a,b)=>(b[1].op+(b[1].un||0))-(a[1].op+(a[1].un||0))).slice(0,ui.stAllP?9999:40).map(([n,p])=>`<tr><td><a href="#" data-act="stParty" data-v="${esc(n)}">${esc(n)}</a></td><td class="num">${p.n}</td><td class="num">${inr(R2(p.amt))}</td><td class="num">${p.n?Math.round(p.t1/p.n*100)+'%':'—'}</td><td class="num">${p.days.length?Math.round(p.days.reduce((a,b)=>a+b,0)/p.days.length):'—'}</td><td class="num">${p.op>1?inr(R2(p.op)):'—'}</td><td class="num">${p.old>1?`<b style="color:var(--hi)">${inr(R2(p.old))}</b>`:'—'}</td><td class="num">${p.un?inr(R2(p.un)):'—'}</td></tr>`).join('')}</tbody></table></div>${Object.keys(PS).length>40&&!ui.stAllP?`<p><button class="btn ghost sm" data-act="stAllP">Show all ${Object.keys(PS).length}</button></p>`:''}
   ${concBox(d,'settle')}`}

Object.assign(ACT,{
  stSide:t=>{ui.stSide=t.dataset.v;ui.stF='all';ui.stP='';ui.stAll=false;render()},
  stF:t=>{ui.stF=t.dataset.v;ui.stAll=false;render()},
  stAll:()=>{ui.stAll=true;render()},stAllA:()=>{ui.stAllA=true;render()},stAllP:()=>{ui.stAllP=true;render()},
  stParty:t=>{ui.stP=t.dataset.v;ui.stF='all';render();document.querySelector('.kpis')?.scrollIntoView({behavior:'smooth',block:'start'})},
  stObs:t=>{const c=C(),d=pOpen(c),r=settleCalc(d,ui.stSide||'S'),x=stFlags(r).find(f=>f.k===t.dataset.v);if(!x)return;
    newObs({clientId:c.id,auditId:A()?.id||'',title:x.t,rating:x.r,condition:x.c,criteria:x.cr,effect:x.e,rec:x.rec})},
  stXlsx:async()=>{const c=C(),d=pOpen(c);await xlsxSave(stSheets(d,ui.stSide||'S'),(ui.stSide==='P'?'Purchases vs payments':'Sales vs receipts')+' - '+c.name)}});
function stSheets(d,side){const r=settleCalc(d,side);if(!r)return[];const HW=side==='S'?HOW:HOWP,W=side==='S'?['Sales','Receipt','Customer']:['Purchase','Payment','Supplier'],bk=t=>BOOK[t]??'No bill details';
  const AG=stAgeing(r),ag=[[W[2],'Open bills (against bill)','Advances not adjusted','On account not adjusted','Net outstanding','0-30 days','31-60 days','61-90 days','91-180 days','Over 180 days']];for(const [n,p] of Object.entries(AG).sort((x,y)=>y[1].net-x[1].net))ag.push([n,p.bill,-p.adv,-p.acc,p.net,...p.age]);
  const L=[[W[2],W[0]+' bill date',W[0]+' voucher','Bill reference','Bill booked as','Bill amount',W[1]+' date',W[1]+' voucher',W[1]+' booked as','Amount applied','Days between bill and '+W[1].toLowerCase(),'Credit period (days)','Within credit period','How it was closed','Still open on the bill','Age of the open amount (days)']];
  for(const b of r.bills.slice().sort((x,y)=>x.party<y.party?-1:x.party>y.party?1:x.d<y.d?-1:1)){
    if(!b.by.length)L.push([b.party,b.d,b.vt+' '+b.vno,b.ref,bk(b.ty),b.amt,'','','','','',b.cr,'',HW[b.how][1],b.rem,b.rem>1?r.ageOf(b):'']);
    b.by.forEach((x,i)=>{const g=dayDiff(x.d,b.d),last=i===b.by.length-1;L.push([b.party,b.d,b.vt+' '+b.vno,b.ref,bk(b.ty),i?'':b.amt,x.d,x.vt+' '+x.vno,bk(x.ty),x.amt,g,b.cr,g<=b.cr?'Yes':'No',HW[b.how][1],last?b.rem:'',last&&b.rem>1?r.ageOf(b):''])})}
  for(const u of r.pool)L.push([u.party,'','','','','',u.d,u.vt+' '+u.vno,bookOf(u),u.rem,'','','','Not matched to any bill','',r.ageOf(u)]);
  const F=[['Severity','Finding','Detail','Criteria','Effect','Recommendation']];for(const x of stFlags(r))F.push([{H:'High',M:'Medium',L:'Low'}[x.r],x.t,x.c,x.cr,x.e,x.rec]);
  const pre=side==='S'?'Sales ':'Purchases ';
  return[[pre+'ageing',ag],[pre+'bill vs '+W[1].toLowerCase(),L],[pre+'findings',F]]}
;
document.addEventListener('change',e=>{const t=e.target,ds=t.dataset;if(ds.stm){ui.stM=t.value;ui.stAll=false;return render()}if(ds.stp){ui.stP=t.value;return render()}
  if(ds.stdays){const c=C(),d=pOpen(c);d.settle.opt={...(d.settle.opt||{}),[ds.stdays+'days']:Math.max(0,+t.value||0)};savep(d);render()}});

/* ---------- hooks ---------- */
const _pStatusS=pStatus;pStatus=function(k,c,a){if(k!=='settle')return _pStatusS(k,c,a);if(a&&a.na?.settle)return{st:'na',text:'Not applicable: '+a.na.settle};
  const d=pOpen(c);if(!d.settle)return{st:'todo',text:'Tally Day Book XML not imported yet'};
  const S=settleCalc(d,'S'),P=settleCalc(d,'P'),txt=(r,w)=>{const s=stSummary(r);return s.B.length?`${w}: ${s.t1.length} of ${s.B.length} by bill ref, ${s.op.length} open`:''};
  return{st:d.conc?.settle?.st?'done':'doing',text:[txt(S,'Sales'),txt(P,'Purchases')].filter(Boolean).join(' · ')}};
const _procTabS=procTab;procTab=function(a,c){if(ui.ptab!=='settle')return _procTabS(a,c);
  const k='settle',d=pOpen(c),prog=programmeOf(a),more=PK.filter(x=>!prog.includes(x)),pill=(x,dim)=>{const s=pStatus(x,c,a);return `<button class="chip" data-act="ptab" data-v="${x}" style="${k===x?'border-color:var(--acc);color:var(--acc-ink);font-weight:700;':''}${dim?'opacity:.75':''}"><span style="color:var(--${s.st==='done'?'ok':s.st==='todo'?'hi':'muted'})">●</span> ${esc(PR[x].n)}</button>`};
  return `<div class="row" style="gap:6px;margin-bottom:6px">${prog.map(x=>pill(x)).join('')}</div>${more.length?`<details ${more.includes(k)?'open':''} style="margin-bottom:12px"><summary class="small muted" style="cursor:pointer">More procedures</summary><div class="row" style="gap:6px;margin-top:6px">${more.map(x=>pill(x,1)).join('')}</div></details>`:''}
   <div class="row" style="margin:4px 0 12px"><h2 class="sp" style="margin:0;font-size:18px">${esc(PR[k].n)}</h2><span class="tag n">${esc(PR[k].ref)}</span></div><p class="small muted" style="margin:-6px 0 12px">${esc(PR[k].why)} Kept for ${esc(c.name)}, FY ${esc(fyNow())}.</p><div style="margin:-6px 0 10px">${reviewBox(a,'proc:'+k,PR[k].n)}</div>${settleTab(c,d)}`};
const _procFilesS=procFiles;procFiles=async function(c,kind,files,i){
  if(kind==='settle'){const f=files[0];try{toast('Reading '+f.name+'…');const P=await settleImport(c,f,decodeBuf(await f.arrayBuffer()));await pEv(c,f,'Tally Day Book (bill-wise)');toast(P.length.toLocaleString('en-IN')+' party entries read; sales and purchases matched')}catch(e){toast(e.message||String(e))}render();return}
  return _procFilesS(c,kind,files,i)};
const _importBooksS=importBooksOnce;importBooksOnce=async function(c,file){await _importBooksS(c,file);if(extOf(file.name)==='xml'){try{await settleImport(c,file,decodeBuf(await file.arrayBuffer()))}catch(e){}render()}};
const _progRepS=programmeReport;programmeReport=function(a){let h=_progRepS(a);const c=S.clients.find(x=>x.id===a.clientId);if(!c||!programmeOf(a).includes('settle'))return h;const d=pOpen(c);if(!d.settle)return h;
  for(const side of ['S','P']){const r=settleCalc(d,side),s=stSummary(r);if(!s.B.length)continue;const W=side==='S'?['Sales vs receipts','sales bills','receipts']:['Purchases vs payments','purchase bills','payments'];
    h+=`<h3>${W[0]}: ${fmtD(r.from)} to ${fmtD(r.to)}</h3><table><tbody><tr><td>${W[1][0].toUpperCase()+W[1].slice(1)}</td><td>${s.B.length}</td><td>${inr(s.sum(s.B))}</td></tr><tr><td>Closed by bill reference</td><td>${s.t1.length}</td><td>${inr(s.sum(s.t1))}</td></tr><tr><td>Not by bill reference, matched by party and amount</td><td>${s.t2.length}</td><td>${inr(s.sum(s.t2))}</td></tr><tr><td>Not by bill reference, settled on account</td><td>${s.t3.length}</td><td>${inr(s.sum(s.t3))}</td></tr><tr><td>Open</td><td>${s.op.length}</td><td>${inr(s.sumR(s.op))}</td></tr><tr><td>${W[2][0].toUpperCase()+W[2].slice(1)} not matched to any bill</td><td>${s.pl.length}</td><td>${inr(R2(s.pl.reduce((x,u)=>x+u.rem,0)))}</td></tr></tbody></table>`;
    const F=stFlags(r).filter(x=>x.r!=='L');if(F.length)h+=`<ul>${F.map(x=>`<li><b>${esc(x.t)}.</b> ${esc(x.c.slice(0,400))}</li>`).join('')}</ul>`}
  return h};

/* the debtors and creditors ageing (Debtors / Creditors procedures) uses the same matching when the bill-wise file covers the date */
const _partyCalcS=partyCalc;partyCalc=function(d,s,name){const x=_partyCalcS(d,s,name);
  if(!d.settle?.P?.length)return x;const r=settleCalc(d,s==='dr'?'S':'P');if(!r||x.asOf<r.to)return x;const p=stAgeing(r,x.asOf)[name];if(!p)return x;
  return{...x,age:p.age.map(v=>R2(Math.max(0,v))),adv:R2(p.adv+p.acc),billwise:p,over45:R2(r.bills.filter(b=>b.party===name&&b.rem>1&&dayDiff(x.asOf,b.d)>45).reduce((t,b)=>t+b.rem,0))}};
const _partyTabS=partyTab;partyTab=function(c,d,s){const h=_partyTabS(c,d,s);if(!d.settle?.P?.length)return h;
  return h.replace(/Ageing is worked out first-in, first-out from the [^<]*in the books\./,'Ageing is from the bill-wise matching of the Tally file: against the bill first, then by party and amount, then on account. Advances and on-account amounts not adjusted are shown under the party name.')};
