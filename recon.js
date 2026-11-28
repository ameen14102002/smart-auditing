/* Smart Auditing — GST and TDS reconciliations.
   All matching is done here. Portal data (GSTR-1, GSTR-2B, GSTR-3B, TDS challans) comes either from files the person uploads
   or from the 1Go desktop app ("Get from 1Go"), which only downloads from the portals and hands the files over. Books come from
   the client's own Tally XML / CSV / Excel. Kept per client and financial year in the 'recons' collection. */
S.recons=S.recons||[];
IC.recon='<path d="M7 4v16M17 4v16"/><path d="M3 9l4-5 4 5M13 15l4 5 4-5"/>';
const RC={r1:'GSTR-1 vs sales books',r2:'GSTR-2B vs purchase books',r3:'GSTR-3B vs GSTR-1',r4:'GSTR-3B vs GSTR-2B',r5:'TDS vs books (optional)'};
const RCSHORT={r1:'GSTR-1 vs sales',r2:'GSTR-2B vs purchases',r3:'3B vs GSTR-1',r4:'3B vs 2B',r5:'TDS vs books (optional)'};
const RSRC={bS:'Sales books',bP:'Purchase books',g1:'GSTR-1',g2b:'GSTR-2B',g3b:'GSTR-3B',tB:'TDS in books',chl:'TDS challans'};
const RTOL=10;              // rupees: differences up to this are treated as rounding
const RMAX=6000;            // invoices kept per source and month (more are summarised only)
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const rdocId=(c,fy)=>c.id+'-'+String(fy).replace(/[^0-9]/g,'');
const rdoc=c=>S.recons.find(r=>r.id===rdocId(c,fyNow()));
const fyMonths=fy=>{const y=+String(fy).slice(0,4);return Array.from({length:12},(_,i)=>{const m=(3+i)%12+1,yy=y+(i>8?1:0);return yy+'-'+String(m).padStart(2,'0')})};
const mLabel=k=>k?MONTHS[+k.slice(5,7)-1]+'-'+k.slice(2,4):'';
const fpToKey=fp=>{const s=String(fp||'').replace(/\D/g,'');return s.length===6?s.slice(2)+'-'+s.slice(0,2):''};
const ymdOf=s=>{s=String(s||'').trim();let m=s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);if(m)return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');m=s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})(?!\d)/);if(m)return '20'+m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');m=s.match(/^(\d{1,2})[-\s/.]([A-Za-z]{3})[a-z]*[-\s/.,]*(\d{2,4})/);if(m){const i=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[2].toLowerCase());if(i>=0)return(m[3].length===2?'20'+m[3]:m[3])+'-'+String(i+1).padStart(2,'0')+'-'+m[1].padStart(2,'0')}m=s.match(/^(\d{4})-?(\d{2})-?(\d{2})/);if(m)return m[1]+'-'+m[2]+'-'+m[3];const d=toDate(s);return d&&!isNaN(d)?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:''};
const monthKeyOf=v=>{const s=String(v||'').trim();let m=s.match(/^(\d{4})-(\d{1,2})/);if(m)return m[1]+'-'+m[2].padStart(2,'0');m=s.match(/^([A-Za-z]{3})[a-z]*[-\s']*(\d{2,4})$/);if(m){const i=MONTHS.findIndex(x=>x.toLowerCase()===m[1].toLowerCase());if(i>=0)return(m[2].length===2?'20'+m[2]:m[2])+'-'+String(i+1).padStart(2,'0')}const d=ymdOf(s);return d?d.slice(0,7):''};
const normInv=s=>String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/^0+(?=.)/,'');
const R2=n=>Math.round((+n||0)*100)/100;
const T0=()=>({tx:0,i:0,c:0,s:0,cs:0});
const addT=(a,b,k=1)=>{for(const x of ['tx','i','c','s','cs'])a[x]=R2(a[x]+k*(+b[x]||0));return a};
const taxOf=t=>R2((t.i||0)+(t.c||0)+(t.s||0));
const fyOfKey=k=>{const y=+k.slice(0,4),m=+k.slice(5,7);const s=m>=4?y:y-1;return s+'-'+String((s+1)%100).padStart(2,'0')};

/* ---------- portal file parsers ---------- */
function sumItems(L){const t=T0();for(const it of L||[]){const d=it.itm_det||it;t.tx+=+d.txval||0;t.i+=+(d.iamt??d.igst)||0;t.c+=+(d.camt??d.cgst)||0;t.s+=+(d.samt??d.sgst)||0;t.cs+=+(d.csamt??d.cess)||0}return addT(T0(),t)}
function parseG1(j){
  const out={kind:'g1',period:fpToKey(j.fp||j.ret_period),tot:T0(),split:{},inv:[],skipped:0};
  const sp=(k,t,sg=1)=>{out.split[k]=addT(out.split[k]||T0(),t,sg);addT(out.tot,t,sg)};
  for(const p of j.b2b||[])for(const v of p.inv||[]){const t=sumItems(v.itms);sp('B2B',t);out.inv.push({g:String(p.ctin||'').toUpperCase(),n:v.inum,d:ymdOf(v.idt),v:+v.val||0,...t,k:'inv'})}
  for(const p of j.b2cl||[])for(const v of p.inv||[])sp('B2C large',sumItems(v.itms));
  for(const r of j.b2cs||[])sp('B2C small',sumItems([r]));
  for(const p of j.exp||[])for(const v of p.inv||[])sp('Exports',sumItems(v.itms));
  for(const p of j.cdnr||[])for(const n of p.nt||[]){const t=sumItems(n.itms),sg=String(n.ntty||n.typ).toUpperCase()==='C'?-1:1;sp('Credit / debit notes',t,sg);out.inv.push({g:String(p.ctin||'').toUpperCase(),n:n.nt_num||n.ntnum,d:ymdOf(n.nt_dt||n.dt),v:sg*(+n.val||0),tx:sg*t.tx,i:sg*t.i,c:sg*t.c,s:sg*t.s,cs:sg*t.cs,k:sg<0?'cn':'dn'})}
  for(const n of j.cdnur||[]){const t=sumItems(n.itms),sg=String(n.ntty).toUpperCase()==='C'?-1:1;sp('Credit / debit notes (unregistered)',t,sg)}
  for(const k of ['b2ba','b2cla','b2csa','cdnra','cdnura','expa'])out.skipped+=(j[k]||[]).length;
  if(!out.inv.length&&!Object.keys(out.split).length)throw new Error('This GSTR-1 file has no invoices or notes.');
  if(!out.period){const d=out.inv.find(x=>x.d)?.d;out.period=d?d.slice(0,7):''}
  return out}
function g2bRow(p,v,sg,k){const t=v.txval!=null||v.igst!=null?{tx:+v.txval||0,i:+v.igst||0,c:+v.cgst||0,s:+v.sgst||0,cs:+v.cess||0}:sumItems(v.items);
  return{g:String(p.ctin||'').toUpperCase(),p:p.trdnm||'',n:k==='inv'?v.inum:v.ntnum,d:ymdOf(v.dt),v:sg*(+v.val||0),tx:sg*t.tx,i:sg*t.i,c:sg*t.c,s:sg*t.s,cs:sg*t.cs,a:String(v.itcavl||'Y').toUpperCase()!=='N',rc:String(v.rev||'N').toUpperCase()==='Y',k}}
function parseG2Bjson(j){
  const root=j.data||j,dd=root.docdata||root,out={kind:'g2b',period:fpToKey(root.rtnprd||root.ret_period),inv:[],tot:T0(),na:T0(),other:T0()};
  for(const p of dd.b2b||[])for(const v of p.inv||[])out.inv.push(g2bRow(p,v,1,'inv'));
  for(const p of dd.cdnr||[])for(const n of p.nt||[]){const sg=String(n.typ||n.ntty).toUpperCase()==='C'?-1:1;out.inv.push(g2bRow(p,n,sg,sg<0?'cn':'dn'))}
  for(const r of dd.impg||[])addT(out.other,{tx:+r.txval||0,i:+r.igst||0,cs:+r.cess||0});
  for(const p of dd.isd||[])for(const v of p.doclist||[p])addT(out.other,{i:+v.igst||0,c:+v.cgst||0,s:+v.sgst||0,cs:+v.cess||0},String(v.isd_docty||v.doctyp||'').toUpperCase()==='ISDC'?-1:1);
  finish2B(out);if(!out.inv.length&&!out.other.i)throw new Error('This GSTR-2B file has no invoices.');return out}
function finish2B(out){out.tot=T0();out.na=T0();for(const x of out.inv){if(x.rc)continue;addT(x.a?out.tot:out.na,x)}addT(out.tot,out.other);if(!out.period){const d=out.inv.find(x=>x.d)?.d;out.period=d?d.slice(0,7):''}}
function sheetRows(ws){return XLSX.utils.sheet_to_json(ws,{header:1,raw:false,defval:''})}
/* GSTR-2B Excel from the portal: header over two rows ("Invoice details" above "Invoice number" ...), data below */
function hdrTable(rows,must){
  const h=rows.findIndex(r=>r.some(v=>String(v).toLowerCase().includes(must)));if(h<0)return null;
  const a=rows[h],b=rows[h+1]||[],n=Math.max(a.length,b.length),head=[];
  for(let i=0;i<n;i++)head.push((String(a[i]||'')+' '+String(b[i]||'')).toLowerCase().replace(/\s+/g,' ').trim());
  const col=(...k)=>{for(const x of k){const i=head.findIndex(s=>s.includes(x));if(i>=0)return i}return -1};
  const data=rows.slice(h+1).filter(r=>/^[0-9]{2}[A-Z0-9]{13}$/i.test(String(r[0]||'').trim()));
  return{col,data}}
function parseG2Bxlsx(wb,fallback){
  const out={kind:'g2b',period:'',inv:[],tot:T0(),na:T0(),other:T0()};
  const rm=wb.SheetNames.find(n=>/read ?me/i.test(n));
  if(rm){const R=sheetRows(wb.Sheets[rm]);let fy='',tp='';for(const r of R)for(let i=0;i<r.length;i++){const s=String(r[i]).toLowerCase();if(/financial year/.test(s))fy=String(r[i+1]||'').trim();if(/tax period/.test(s))tp=String(r[i+1]||'').trim()}
    const mi=MONTHS.findIndex(m=>tp.toLowerCase().startsWith(m.toLowerCase()));const y=+fy.slice(0,4);if(mi>=0&&y)out.period=(mi+1>=4?y:y+1)+'-'+String(mi+1).padStart(2,'0')}
  const take=(name,kind)=>{const sn=wb.SheetNames.find(n=>n.trim().toUpperCase()===name);if(!sn)return;const T=hdrTable(sheetRows(wb.Sheets[sn]),'gstin of supplier');if(!T)return;const {col,data}=T;
    const ci={g:col('gstin'),p:col('trade','legal'),n:kind==='inv'?col('invoice number','invoice no'):col('note number','note no'),typ:col('note type'),d:kind==='inv'?col('invoice date'):col('note date'),v:kind==='inv'?col('invoice value'):col('note value'),tx:col('taxable'),i:col('integrated'),c:col('central'),s:col('state'),cs:col('cess'),a:col('itc availability'),rc:col('reverse charge')};
    for(const r of data){const g=x=>ci[x]>=0?r[ci[x]]:'';const sg=kind==='inv'?1:/credit/i.test(g('typ'))?-1:1;
      out.inv.push({g:String(g('g')).trim().toUpperCase(),p:String(g('p')),n:String(g('n')),d:ymdOf(g('d')),v:sg*num(g('v')),tx:sg*num(g('tx')),i:sg*num(g('i')),c:sg*num(g('c')),s:sg*num(g('s')),cs:sg*num(g('cs')),a:!/^n/i.test(String(g('a')).trim()),rc:/^y/i.test(String(g('rc')).trim()),k:kind==='inv'?'inv':sg<0?'cn':'dn'})}};
  take('B2B','inv');take('B2B-CDNR','note');
  const imp=wb.SheetNames.find(n=>n.trim().toUpperCase()==='IMPG');if(imp){const T=hdrTable(sheetRows(wb.Sheets[imp]),'reference date')||hdrTable(sheetRows(wb.Sheets[imp]),'port code');if(T)for(const r of T.data)addT(out.other,{i:num(r[T.col('integrated')]),cs:num(r[T.col('cess')])})}
  if(!out.period)out.period=fallback||'';
  finish2B(out);if(!out.inv.length)throw new Error('No B2B invoices were found in this GSTR-2B Excel file. Use the file from the GST portal (Returns → GSTR-2B → Download Excel).');return out}
function find3B(j,d=0){if(!j||typeof j!=='object'||d>6)return null;if(j.sup_details||j.itc_elg)return j;for(const v of Object.values(j)){const r=find3B(v,d+1);if(r)return r}return null}
const t3=o=>({tx:+o?.txval||0,i:+o?.iamt||0,c:+o?.camt||0,s:+o?.samt||0,cs:+o?.csamt||0});
function parseG3Bjson(j){
  const r=j.kind==='1go-gstr3b-data'&&j.r3b?j.r3b:find3B(j);if(!r)throw new Error('This file has no GSTR-3B figures (sup_details / itc_elg).');
  const sd=r.sup_details||{},ie=r.itc_elg||{},itc=T0(),oth=T0(),rev=T0();
  for(const x of ie.itc_avl||[]){addT(itc,t3(x));if(x.ty==='OTH')addT(oth,t3(x))}for(const x of ie.itc_rev||[])addT(rev,t3(x));
  return{kind:'g3b',period:fpToKey(r.ret_period||j.period),out:addT(T0(),t3(sd.osup_det)),zero:addT(T0(),t3(sd.osup_zero)),nil:+sd.osup_nil_exmp?.txval||0,rcm:addT(T0(),t3(sd.isup_rev)),itc,oth,rev,net:addT(T0(),t3(ie.itc_net))}}
/* GSTR-3B summary typed by hand, one row per month (template below) */
function parseG3Btable(rows){
  const head=rows[0].map(h=>String(h).toLowerCase()),c=k=>head.findIndex(h=>h.includes(k)),g=(r,k)=>{const i=c(k);return i>=0?num(r[i]):0};const out=[];
  for(const r of rows.slice(1)){const mk=monthKeyOf(r[c('month')]);if(!mk)continue;
    out.push({kind:'g3b',period:mk,out:{tx:g(r,'3.1(a) taxable'),i:g(r,'3.1(a) igst'),c:g(r,'3.1(a) cgst'),s:g(r,'3.1(a) sgst'),cs:0},zero:{tx:g(r,'3.1(b) taxable'),i:g(r,'3.1(b) igst'),c:0,s:0,cs:0},nil:0,rcm:T0(),itc:{tx:0,i:g(r,'4a igst'),c:g(r,'4a cgst'),s:g(r,'4a sgst'),cs:0},oth:T0(),rev:{tx:0,i:g(r,'4b igst'),c:g(r,'4b cgst'),s:g(r,'4b sgst'),cs:0},net:T0(),typed:true})}
  if(!out.length)throw new Error('No months found. Use the GSTR-3B summary template (Month column as Apr-2026).');return out}
const G3B_TEMPLATE='Month,3.1(a) Taxable,3.1(a) IGST,3.1(a) CGST,3.1(a) SGST,3.1(b) Taxable,3.1(b) IGST,4A IGST,4A CGST,4A SGST,4B IGST,4B CGST,4B SGST\nApr-2026,0,0,0,0,0,0,0,0,0,0,0,0\n';
/* TDS challans: from 1Go (rows) or the challan list exported from the Income Tax portal / TRACES */
function parseChallanTable(rows){
  const h=rows.findIndex(r=>r.some(v=>/bsr/i.test(v)));if(h<0)throw new Error('No BSR code column found in the challan list.');
  const head=rows[h].map(x=>String(x).toLowerCase()),c=(...k)=>{for(const x of k){const i=head.findIndex(s=>s.includes(x));if(i>=0)return i}return -1};
  const ci={bsr:c('bsr'),d:c('date of deposit','deposit date','tender date','date'),sl:c('serial','challan no','challan number'),amt:c('total','amount'),sec:c('section','nature'),minor:c('minor')};
  const out=[];for(const r of rows.slice(h+1)){const bsr=String(r[ci.bsr]||'').replace(/\D/g,'');if(!/^\d{7}$/.test(bsr))continue;out.push({bsr,date:ymdOf(r[ci.d]),serial:String(r[ci.sl]||'').replace(/\D/g,''),amount:num(r[ci.amt]),section:ci.sec>=0?String(r[ci.sec]):'',minor:ci.minor>=0?String(r[ci.minor]):''})}
  if(!out.length)throw new Error('No challans found under the header.');return out}
/* TDS in the books: Tally XML ledger entries on TDS ledgers (credit = deducted, debit = paid), or a TDS register */
const tdsNature=l=>{const m=String(l).match(/\b(19[2-6][A-Z]{0,2}|39[0-9])\b/i);if(m)return m[1].toUpperCase();const s=l.toLowerCase();return /contract/.test(s)?'Contractors':/prof|technical|fees/.test(s)?'Professional fees':/rent/.test(s)?'Rent':/commission|brokerage/.test(s)?'Commission':/salar/.test(s)?'Salary':/interest/.test(s)?'Interest':/purchase|goods/.test(s)?'Purchase of goods':'Other'};
function parseTdsXML(text){
  const out=[],re=/<VOUCHER[\s>]/g;let m;
  while((m=re.exec(text))){const e=text.indexOf('</VOUCHER>',m.index);if(e<0)break;const b=text.slice(m.index,e);re.lastIndex=e+10;
    if(/<ISCANCELLED>Yes</i.test(b)||/<ISOPTIONAL>Yes</i.test(b))continue;const d=xtag(b,'DATE'),date=d.length===8?d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6,8):ymdOf(d),party=xtag(b,'PARTYLEDGERNAME');
    for(const en of b.match(/<(ALLLEDGERENTRIES|LEDGERENTRIES)\.LIST>[\s\S]*?<\/\1\.LIST>/g)||[]){const ln=xtag(en,'LEDGERNAME');if(!/\btds\b|tax deducted/i.test(ln)||/receivable|recoverable|advance|refund/i.test(ln))continue;
      const amt=num(xtag(en,'AMOUNT')),deemed=/<ISDEEMEDPOSITIVE>Yes</i.test(en),credit=en.includes('ISDEEMEDPOSITIVE')?!deemed:amt>0;
      out.push({date,m:date.slice(0,7),ledger:ln,nature:tdsNature(ln),party,amount:R2(Math.abs(amt)),kind:credit?'ded':'paid',vno:xtag(b,'VOUCHERNUMBER')})}}
  return out}
function parseTdsTable(rows){
  const h=rows.findIndex(r=>r.some(v=>/tds|tax deducted/i.test(v)));if(h<0)throw new Error('No TDS column found. The register needs Date, Section / nature, Party, PAN and TDS amount.');
  const head=rows[h].map(x=>String(x).toLowerCase()),c=(...k)=>{for(const x of k){const i=head.findIndex(s=>s.includes(x));if(i>=0)return i}return -1};
  const ci={d:c('date'),sec:c('section','nature'),p:c('party','deductee','name'),pan:c('pan'),t:c('tds amount','tds','tax deducted'),paid:c('paid','deposited')};
  const out=[];for(const r of rows.slice(h+1)){const date=ymdOf(r[ci.d]),a=num(r[ci.t]);if(!date||!a)continue;out.push({date,m:date.slice(0,7),ledger:'',nature:ci.sec>=0?String(r[ci.sec]):'',party:ci.p>=0?String(r[ci.p]):'',pan:ci.pan>=0?String(r[ci.pan]).toUpperCase():'',amount:Math.abs(a),kind:ci.paid>=0&&/^y/i.test(String(r[ci.paid]))?'paid':'ded'})}
  if(!out.length)throw new Error('No TDS rows with a date and amount.');return out}

/* one file in, any number of portal results out */
async function readPortalFile(name,buf,hint){
  const x=extOf(name);
  if(x==='zip'){await needLib('JSZip');const z=await JSZip.loadAsync(buf),res=[];for(const f of Object.values(z.files)){if(f.dir||!/\.(json|xlsx|xls|csv)$/i.test(f.name))continue;res.push(...await readPortalFile(f.name,await f.async('arraybuffer'),hint))}if(!res.length)throw new Error('The ZIP has no JSON or Excel file inside.');return mergeG1(res)}
  if(x==='json'){let j;try{j=JSON.parse(decodeBuf(buf).replace(/^\uFEFF/,''))}catch(e){throw new Error(name+' is not valid JSON.')}
    if(j.kind==='1go-gstr3b-data'||find3B(j))return[parseG3Bjson(j)];
    if((j.data&&(j.data.docdata||j.data.rtnprd))||j.docdata||j.rtnprd)return[parseG2Bjson(j)];
    if(j.b2b||j.b2cs||j.b2cl||j.cdnr||j.exp||j.fp)return[parseG1(j)];
    throw new Error(name+': not a GSTR-1, GSTR-2B or GSTR-3B file.')}
  if(['xlsx','xls','xlsm','csv'].includes(x)){
    let rows,wb=null;if(x==='csv')rows=parseCSV(decodeBuf(buf));else{await needLib('XLSX');wb=XLSX.read(buf,{type:'array',cellDates:true});rows=sheetRows(wb.Sheets[wb.SheetNames[0]])}
    rows=rows.filter(r=>r.some(v=>String(v).trim()));const flat=rows.slice(0,12).flat().join(' ').toLowerCase();
    if(wb&&(wb.SheetNames.some(n=>n.trim().toUpperCase()==='B2B')&&/2b|itc/i.test(wb.SheetNames.join(' ')+flat)||hint==='g2b'))return[parseG2Bxlsx(wb,ui.rcMonth||'')];
    if(/bsr/.test(flat))return[{kind:'chl',rows:parseChallanTable(rows)}];
    if(/3\.1\(a\)/.test(flat))return parseG3Btable(rows);
    throw new Error(name+': not recognised. Expected the GSTR-2B Excel, a challan list (with BSR code) or the GSTR-3B summary template.')}
  throw new Error(name+': use JSON, ZIP, Excel or CSV.')}
/* the GST portal splits a big GSTR-1 into several JSON files inside one ZIP, and a big GSTR-2B into File 1, File 2 ...:
   the parts of one month are added up into one set */
function mergeParts(L){const out=[],by={};
  for(const r of L){if((r.kind!=='g1'&&r.kind!=='g2b')||!r.period){out.push(r);continue}const k=r.kind+'|'+r.period;
    if(!by[k]){by[k]={...r,inv:[...(r.inv||[])],tot:addT(T0(),r.tot||T0()),...(r.kind==='g1'?{split:{...r.split}}:{other:addT(T0(),r.other||T0())})};out.push(by[k]);continue}
    const a=by[k];a.inv.push(...(r.inv||[]));
    if(r.kind==='g1'){addT(a.tot,r.tot);a.skipped=(a.skipped||0)+(r.skipped||0);for(const [sp,t] of Object.entries(r.split||{}))a.split[sp]=addT(a.split[sp]||T0(),t)}
    else{addT(a.other,r.other||T0());a.parts=(a.parts||1)+1}}
  for(const a of Object.values(by))if(a.kind==='g2b'&&a.parts)finish2B(a);
  return out}
const mergeG1=mergeParts;
/* ---------- storing ---------- */
function rcOpen(c){return rdoc(c)||{id:rdocId(c,fyNow()),clientId:c.id,fy:fyNow(),bS:null,bP:null,tB:null,g1:{},g2b:{},g3b:{},chl:null,notes:{},handoffs:[],files:[]}}
const compactBook=r=>({d:r.date,n:r.vno,f:String(r.ref||'').trim(),g:String(r.gstin||'').toUpperCase(),p:r.party,tx:R2(r.taxable),i:R2(r.igst),c:R2(r.cgst),s:R2(r.sgst),v:R2(r.amount),k:/Return/.test(r.type)?(r.type==='salesReturn'?'cn':'dn'):'inv'});
function bookPack(rows,sign){const months={};for(const r of rows){const k=String(r.d||'').slice(0,7);if(!/^\d{4}-\d{2}$/.test(k))continue;const M=months[k]=months[k]||{tot:T0(),n:0,inv:[]};const sg=sign(r);addT(M.tot,r,sg);M.n++;if(M.inv.length<RMAX)M.inv.push(sg<0?{...r,tx:-r.tx,i:-r.i,c:-r.c,s:-r.s,v:-r.v}:r)}return months}
async function putPortal(c,results,from){
  const d=rcOpen(c),fy=d.fy,fm=new Set(fyMonths(fy));let n=0;const said=[],out={...d,g1:{...d.g1},g2b:{...d.g2b},g3b:{...d.g3b}};
  for(const r of results){
    if(r.kind==='chl'){const have=new Map((out.chl?.rows||[]).map(x=>[x.bsr+'|'+x.date+'|'+x.serial,x]));for(const x of r.rows)have.set(x.bsr+'|'+x.date+'|'+x.serial,x);out.chl={rows:[...have.values()].sort((a,b)=>a.date.localeCompare(b.date)),from,at:new Date().toISOString()};said.push(r.rows.length+' challans');n++;continue}
    if(!r.period)throw new Error('Could not tell which month a '+({g1:'GSTR-1',g2b:'GSTR-2B',g3b:'GSTR-3B'}[r.kind])+' file is for. Choose the month next to the upload and try again.');
    if(!fm.has(r.period)){said.push(RSRC[r.kind]+' '+mLabel(r.period)+' skipped (not FY '+fy+')');continue}
    const keep={...r,from,at:new Date().toISOString()};if(keep.inv&&keep.inv.length>RMAX){keep.cut=keep.inv.length;keep.inv=keep.inv.slice(0,RMAX)}
    out[r.kind][r.period]=keep;said.push(RSRC[r.kind]+' '+mLabel(r.period));n++}
  if(n)await put('recons',d.id,out);return said}
async function rcBooks(c,file){
  const g=(c.gstin||'').toUpperCase(),home=stateOf(g);
  try{toast('Reading '+file.name+'…');const buf=await file.arrayBuffer();
    const rows=await readVouchers(file,'auto',home,k=>toast(k.toLocaleString('en-IN')+' vouchers read…')).catch(e=>{if(/classified|amount/.test(e.message))return[];throw e});
    let tds=[];if(extOf(file.name)==='xml')tds=parseTdsXML(decodeBuf(buf));
    const B=rows.filter(r=>['sales','salesReturn','purchase','purchaseReturn'].includes(r.type)).map(r=>({...compactBook(r),t:r.type}));
    if(!B.length&&!tds.length)throw new Error('No sales, purchase, return or TDS entries were found in this file.');
    const d=rcOpen(c),fm=new Set(fyMonths(d.fy)),inFy=x=>fm.has(String(x.d||x.date).slice(0,7));
    const S1=B.filter(r=>(r.t==='sales'||r.t==='salesReturn')&&inFy(r)),P1=B.filter(r=>(r.t==='purchase'||r.t==='purchaseReturn')&&inFy(r));
    const at=new Date().toISOString(),out={...d};
    if(S1.length)out.bS={file:file.name,at,months:bookPack(S1,r=>r.t==='salesReturn'?-1:1)};
    if(P1.length)out.bP={file:file.name,at,months:bookPack(P1,r=>r.t==='purchaseReturn'?-1:1)};
    const T=tds.filter(inFy);if(T.length)out.tB={file:file.name,at,rows:T.slice(0,20000)};
    let evId='';if(file.size<=(mode==='claude'?EVID_INLINE_MAX:25*1048576)){try{evId=await addEvidence(file,{clientId:c.id,purpose:'Books for GST / TDS reconciliation'})}catch(e){}}
    out.files=[...(out.files||[]),{name:file.name,at,evidenceId:evId,what:'books'}].slice(-40);
    await put('recons',d.id,out);
    toast(`Books read: ${S1.length} sales, ${P1.length} purchase entries${T.length?`, ${T.length} TDS entries`:''} for FY ${d.fy}`);
  }catch(e){toast(e.message||String(e))}}
async function rcTdsFile(c,file){
  try{const x=extOf(file.name),buf=await file.arrayBuffer();let rows;
    if(x==='xml'){const T=parseTdsXML(decodeBuf(buf));if(!T.length)throw new Error('No entries on TDS ledgers were found in this Tally file.');const d=rcOpen(c),fm=new Set(fyMonths(d.fy));await put('recons',d.id,{...d,tB:{file:file.name,at:new Date().toISOString(),rows:T.filter(r=>fm.has(r.m))}});return toast(T.length+' TDS entries read from the books')}
    if(x==='csv')rows=parseCSV(decodeBuf(buf));else if(x==='pdf')rows=await readPdfRows(file);else{await needLib('XLSX');const wb=XLSX.read(buf,{type:'array',cellDates:true});rows=sheetRows(wb.Sheets[wb.SheetNames[0]])}
    rows=rows.filter(r=>r.some(v=>String(v).trim()));
    if(rows.slice(0,12).flat().some(v=>/bsr/i.test(v))){const said=await putPortal(c,[{kind:'chl',rows:parseChallanTable(rows)}],file.name);await rcEvidence(c,file,'TDS challan list');return toast('Saved: '+said.join(', '))}
    const T=parseTdsTable(rows),d=rcOpen(c),fm=new Set(fyMonths(d.fy));await put('recons',d.id,{...d,tB:{file:file.name,at:new Date().toISOString(),rows:T.filter(r=>fm.has(r.m))}});await rcEvidence(c,file,'TDS register');toast(T.length+' TDS rows read')
  }catch(e){toast(e.message||String(e))}}
async function rcEvidence(c,file,purpose){if(file.size<=(mode==='claude'?EVID_INLINE_MAX:25*1048576)){try{return await addEvidence(file,{clientId:c.id,purpose})}catch(e){}}return''}
async function rcPortalFiles(c,files){
  /* all files first, so a GSTR-1 split over several files of one month adds up instead of the last one replacing the others */
  const res=[],errs=[];
  for(const f of files){try{toast('Reading '+f.name+'…');res.push(...(await readPortalFile(f.name,await f.arrayBuffer(),ui.rcHint)).map(r=>({...r,from:f.name})));await rcEvidence(c,f,'GST / TDS portal data')}catch(e){errs.push(e.message||String(e))}}
  try{const said=res.length?await putPortal(c,mergeParts(res),files.length===1?files[0].name:files.length+' files'):[];toast((said.length?'Saved: '+said.join(', '):'Nothing saved')+(errs.length?'. '+errs.join(' '):''))}catch(e){toast(e.message||String(e))}}

/* ---------- the reconciliations ---------- */
const tol=d=>+d?.tol||RTOL;
function monthsWith(d,...srcs){return fyMonths(d.fy).filter(k=>srcs.some(s=>s==='bS'||s==='bP'?d[s]?.months?.[k]:d[s]?.[k]))}
function matchInv(B,P,t){
  /* B: books, P: portal. Key: GSTIN + invoice number; a note matches a note */
  const key=x=>x.g+'|'+normInv(x.n)+'|'+(x.k==='inv'?'i':'n'),pm=new Map(),byNo=new Map(),rows=[];
  for(const p of P){pm.set(key(p),p);byNo.set(normInv(p.n)+'|'+(p.k==='inv'?'i':'n'),p)}
  const used=new Set();
  for(const b of B){const k=key(b);let p=pm.get(k),st='';
    if(p&&!used.has(k)){used.add(k);const dt=Math.abs(b.tx-p.tx),dx=Math.abs(taxOf(b)-taxOf(p));st=dt>t||dx>t?'diff':(b.rp||String(b.d).slice(0,7))!==(p.rp||String(p.d).slice(0,7))?'period':'match'}
    else{const q=byNo.get(normInv(b.n)+'|'+(b.k==='inv'?'i':'n'));if(q&&!used.has(key(q))&&Math.abs(q.tx-b.tx)<=t){p=q;used.add(key(q));st='gstin'}else{p=null;st='books'}}
    rows.push({st,b,p})}
  for(const p of P)if(!used.has(key(p)))rows.push({st:'portal',b:null,p});
  return rows}
const RST={nogstin:['y','No GSTIN in books'],match:['g','Matched'],period:['b','Different month'],diff:['y','Value differs'],gstin:['y','GSTIN differs'],books:['r','Only in books'],portal:['r','Only in return'],na:['y','ITC not available']};
function recon(d,k){
  const t=tol(d),months=[],sumRow=()=>({a:T0(),b:T0()}),res0={};let inv=[],warn=[];
  if(k==='r1'||k==='r2'){
    const bk=k==='r1'?'bS':'bP',pk=k==='r1'?'g1':'g2b',BB=[],PP=[],reg=x=>isGstin(x.g)&&(k==='r1'||taxOf(x)!==0);
    const pm=Object.keys(d[pk]||{});
    for(const m of monthsWith(d,bk,pk)){const B=d[bk]?.months?.[m],P=d[pk]?.[m];
      const a=B?(k==='r1'?B.tot:B.inv.filter(reg).reduce((t,x)=>addT(t,x),T0())):null;
      months.push({m,a,b:P?.tot||null,nb:B?.n||0,np:P?.inv?.length||0});
      if(B&&pm.length)BB.push(...B.inv.filter(x=>k==='r1'?isGstin(x.g):taxOf(x)!==0).map(x=>({...x,rp:m})));if(P)PP.push(...P.inv.filter(x=>!x.rc).map(x=>({...x,rp:m})));
      if(P?.cut)warn.push(`${RSRC[pk]} ${mLabel(m)} has ${P.cut} documents; only the first ${RMAX} are matched one by one (totals use all).`)}
    /* matched across the year, so an invoice booked in one month and in the return of another is found ("Different month") */
    if(BB.length&&PP.length){const rows=matchInv(BB,PP,t,k,d);res0.eng=matchInv.last;if(k==='r2')for(const r of rows)if(r.p&&!r.p.a&&r.st!=='portal')r.st='na';inv=rows.map(r=>({...r,m:(r.b||r.p).rp||String((r.b||r.p).d||'').slice(0,7)}))}
    if(k==='r2')warn.push('Purchase books here are bills from registered suppliers that carry GST, compared with ITC available in GSTR-2B (reverse-charge invoices left out).');
    if(k==='r1'&&Object.values(d.g1||{}).some(x=>x.skipped))warn.push('Amendment tables (B2BA, CDNRA, …) in GSTR-1 are not included in these totals; check them separately.');
  }
  if(k==='r3')for(const m of monthsWith(d,'g1','g3b')){const a=d.g1?.[m]?.tot||null,G=d.g3b?.[m];months.push({m,a,b:G?addT(addT(T0(),G.out),G.zero):null})}
  if(k==='r4')for(const m of monthsWith(d,'g2b','g3b')){const a=d.g3b?.[m]?.itc||null,b=d.g2b?.[m]?.tot||null;months.push({m,a,b})}
  const res={k,months,inv,warn,t,eng:res0.eng||null};
  for(const r of months){r.dtx=r.a&&r.b?R2(r.a.tx-r.b.tx):null;r.dtax=r.a&&r.b?R2(taxOf(r.a)-taxOf(r.b)):null;r.ok=r.dtax!=null&&Math.abs(r.dtax)<=t&&(k==='r4'||Math.abs(r.dtx)<=t)}
  res.both=months.filter(r=>r.a&&r.b);res.diffTax=R2(res.both.reduce((s,r)=>s+r.dtax,0));res.bad=res.both.filter(r=>!r.ok).length;
  res.count={};for(const r of inv)res.count[r.st]=(res.count[r.st]||0)+1;
  if(k==='r5')Object.assign(res,reconTds(d));
  res.state=k==='r5'?(res.rows.some(r=>r.a!=null&&r.b!=null)?(res.short>t?'bad':'ok'):'none'):!res.both.length?'none':res.bad||inv.some(r=>r.st!=='match'&&r.st!=='period')?'bad':'ok';
  return res}
/* TDS of a month is due by the 7th of the next month (March: 30 April). A challan paid from the 8th of the month to the due date
   is counted for that month; anything left unpaid carries forward and is shown as paid late, with an interest estimate. */
function reconTds(d){
  const T=d.tB?.rows||[],C=d.chl?.rows||[],fm=fyMonths(d.fy),rows=[];let carry=0,interest=0,short=0;
  const due=m=>{const y=+m.slice(0,4),mo=+m.slice(5,7);if(mo===3)return y+'-04-30';const ny=mo===12?y+1:y,nm=mo===12?1:mo+1;return ny+'-'+String(nm).padStart(2,'0')+'-07'};
  const startOf=m=>m+'-08';
  for(let i=0;i<fm.length;i++){const m=fm[i],ded=R2(T.filter(x=>x.kind==='ded'&&x.m===m).reduce((s,x)=>s+x.amount,0)),paidB=R2(T.filter(x=>x.kind==='paid'&&x.m===m).reduce((s,x)=>s+x.amount,0));
    const from=startOf(m),to=due(m),chl=R2(C.filter(x=>x.date>=from&&x.date<=to).reduce((s,x)=>s+x.amount,0));
    const has=T.some(x=>x.m===m)||C.some(x=>x.date>=from&&x.date<=to);
    if(!has){rows.push({m,a:null,b:null});continue}
    const owed=R2(carry+ded),bal=R2(owed-chl);if(carry>0)interest+=carry*0.015;carry=bal;
    rows.push({m,a:ded,b:chl,paidB,carryIn:R2(owed-ded),bal:R2(bal),late:R2(Math.max(bal,0))})}
  short=R2(Math.max(carry,0));
  const byNat={};for(const x of T){const n=x.nature||'Other';const o=byNat[n]=byNat[n]||{ded:0,paid:0,n:0};o[x.kind==='paid'?'paid':'ded']+=x.amount;o.n++}
  /* payments booked in the books against challans: same amount within 7 days */
  const used=new Set(),payRows=Object.values(T.filter(x=>x.kind==='paid').reduce((o,x)=>{const k=x.date+'|'+(x.vno||x.ledger);if(o[k])o[k].amount=R2(o[k].amount+x.amount);else o[k]={...x};return o},{})).map(x=>{const j=C.findIndex((c,ix)=>!used.has(ix)&&Math.abs(c.amount-x.amount)<=1&&Math.abs((new Date(c.date)-new Date(x.date))/864e5)<=7);if(j>=0)used.add(j);return{...x,ch:j>=0?C[j]:null}});
  const unbooked=C.filter((c,ix)=>!used.has(ix));
  return{rows,short,interest:R2(interest),byNat,payRows,unbooked,months:[]}}

/* ---------- views ---------- */
const rcState=s=>s==='ok'?'<span class="tag g">Reconciled</span>':s==='bad'?'<span class="tag r">Differences</span>':'<span class="tag n">No data</span>';
const sgn=n=>n==null?'<span class="muted">—</span>':`<span class="num" style="${Math.abs(n)>RTOL?'color:var(--hi);font-weight:600':''}">${n<0?'−':''}${inr(Math.abs(R2(n)))}</span>`;
function rcCoverage(d){const fm=fyMonths(d.fy),has=(s,m)=>s==='bS'||s==='bP'?!!d[s]?.months?.[m]:s==='tB'?(d.tB?.rows||[]).some(x=>x.m===m):s==='chl'?(d.chl?.rows||[]).some(x=>String(x.date).slice(0,7)===m):!!d[s]?.[m];
  return `<div class="scroll"><table class="cov"><thead><tr><th>Source</th>${fm.map(m=>`<th class="num">${mLabel(m)}</th>`).join('')}</tr></thead><tbody>${Object.entries(RSRC).map(([s,l])=>`<tr><td>${l}</td>${fm.map(m=>`<td class="num">${has(s,m)?'<span style="color:var(--ok)">●</span>':'<span class="muted">·</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
function rcHave(d){const fm=fyMonths(d.fy),cnt=s=>{if(s==='g1'||s==='g2b'||s==='g3b')return Object.keys(d[s]||{}).filter(m=>fm.includes(m)).length;return 0};
  return {g1:cnt('g1'),g2b:cnt('g2b'),g3b:cnt('g3b'),hasAny:cnt('g1')+cnt('g2b')+cnt('g3b')>0}}
/* ---------- the portal helper: GST and TDS taken from the portals on this computer, the way 1Go does ----------
   The helper (gst-fetch, "Start portal helper.cmd") opens the GST portal, the Income Tax portal or TRACES in a window on this
   computer. The person signs in there (username, password, CAPTCHA, OTP: nothing is asked for or kept here); the helper then takes
   each return and month: GSTR-1 as JSON, GSTR-2B as Excel (JSON, File 1, File 2 ..., when the portal says it is too big for
   Excel), GSTR-3B figures, and the TDS challans from the challan list. Smart Auditing reads every file in, whatever its size. */
const HELPER_ZIP='portal-helper.zip';
const helperUrl=()=>ui.gstFetchUrl||'http://127.0.0.1:8790';
async function helper(path,opt){const r=await fetch(helperUrl()+path,{cache:'no-store',...(opt||{})});if(!r.ok){let m='';try{m=(await r.json()).error}catch(e){}throw new Error(m||('The portal helper answered '+r.status))}return r}
async function gstCheck(){try{const h=await(await helper('/health')).json();ui.gstOnline=!!h.ok;ui.helperInfo=h}catch(e){ui.gstOnline=false}schedule()}
const runKey=c=>'sa-portal-run-'+c.id;
const lastRun=c=>{try{return JSON.parse(localStorage.getItem(runKey(c))||'null')}catch(e){return null}};
const OUTCOME={saved:['g','Saved'],notfiled:['y','Not filed'],noperiod:['y','Period not offered'],notfound:['y','Not on the portal'],pending:['y','Still being prepared'],failed:['r','Failed'],timeout:['r','No file in time'],notdone:['','Not done']};
function fetchPanel(c,d){
  const fm=fyMonths(fyNow()),now=new Date().toISOString().slice(0,7),def=fm.filter(m=>m<now),sel=ui.fetchSel||{items:['GSTR1','GSTR2B','GSTR3B'],months:def.length?def:fm.slice(0,1)};
  const got=rcHave(d),needGst=sel.items.some(i=>i!=='TDS'),tdsFrom=ui.fetchTds||'traces';
  if(!('gstOnline' in ui)){ui.gstOnline=null;gstCheck()}
  const on=ui.gstOnline===true,job=ui.gstJob&&ui.gstJob.clientId===c.id?ui.gstJob:null,last=lastRun(c);
  const rs=job?.results||[];
  return `<div class="panel"><h3>${ic('down')}Fetch from the portals</h3><p class="small muted" style="margin:-4px 0 8px">The portal helper on this computer opens the portal; you sign in there, and it takes every return and month for you. Small and medium returns come as the portal's Excel, big ones as JSON (in parts when the portal splits them). Smart Auditing reads them all. No 1Go.</p>
   <div class="chips" style="margin:0 0 6px">${[['GSTR1','GSTR-1'],['GSTR2B','GSTR-2B'],['GSTR3B','GSTR-3B'],['TDS','TDS challans']].map(([k,l])=>`<label class="chip" style="cursor:pointer"><input type="checkbox" data-fetchitem="${k}" ${sel.items.includes(k)?'checked':''} style="width:16px;min-height:16px">${l}</label>`).join('')}</div>
   <div class="chips" style="margin:0 0 8px">${fm.map(m=>`<label class="chip" style="cursor:pointer;${m>now?'opacity:.55':''}"><input type="checkbox" data-fetchmonth="${m}" ${sel.months.includes(m)?'checked':''} style="width:16px;min-height:16px">${mLabel(m)}</label>`).join('')}</div>
   ${sel.items.includes('TDS')?`<div class="row small" style="margin:0 0 8px"><label class="f" style="flex:0 1 18em">TDS challans from<select data-fetchtds="1"><option value="traces" ${tdsFrom==='traces'?'selected':''}>TRACES (Challan Status)</option><option value="ittan" ${tdsFrom==='ittan'?'selected':''}>Income Tax portal, TAN login (Payment History)</option></select></label>${c.tan?`<span class="muted">TAN ${esc(c.tan)}</span>`:`<span class="tag y">No TAN in the client master</span>`}</div>`:''}
   ${needGst&&!c.gstin?`<p class="small"><span class="tag y">GSTIN needed</span> Add the client's GSTIN in the client master to fetch the GST returns.</p>`:''}
   <div class="row"><button class="btn" data-act="fetchStart" ${(needGst&&!c.gstin)||job?.status==='running'?'disabled':''}>${ic('down')}Fetch from the portals</button>${job?.status==='running'?`<button class="btn ghost" data-act="fetchStop">Stop</button>`:''}${!job&&last?`<button class="btn ghost" data-act="rcPull" title="Read the files of the last run again">${ic('up')}Read the last run's files</button>`:''}<span class="small">${sel.items.length} item${sel.items.length===1?'':'s'} · ${sel.months.length} month${sel.months.length===1?'':'s'}</span></div>
   ${on?`<p class="small" style="margin:6px 0 0"><span class="tag g">Portal helper on</span> Click Fetch: a portal window opens on this computer for you to sign in.</p>`:ui.gstOnline===false?`<div class="small" style="margin:8px 0 0;padding:10px 12px;border:1px solid var(--line);border-radius:10px"><span class="tag y">Portal helper not running</span> Set it up once on this computer: <a href="${HELPER_ZIP}" download>download the portal helper</a>, unzip it, and double-click <b>Start portal helper.cmd</b> (it needs <a href="https://nodejs.org" target="_blank" rel="noopener">Node.js</a>). Keep its window open, then <a href="#" data-act="helperCheck">check again</a> (if the browser asks to let this site reach apps on this computer, choose Allow). Until then you can download the files from the portal yourself and drop them in the boxes on the left.</div>`:''}
   ${job?`<div class="small" style="margin:10px 0 0;padding:10px 12px;border-radius:10px;background:var(--soft,rgba(40,90,160,.06))"><b>${job.status==='running'?(job.signedIn?'Working':'Waiting for your sign-in'):job.status==='reading'?'Reading the files':job.status==='error'?'Stopped':'Done'}</b>${job.qn?` · ${Math.min(job.qi,job.qn)} of ${job.qn} returns`:''}<div style="margin-top:4px">${esc(job.text||'')}</div>
     ${rs.length?`<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px">${rs.map(r=>{const o=OUTCOME[r.outcome]||['',r.outcome];return`<span class="tag ${o[0]}" title="${esc(r.text||'')}">${esc(r.label)}${r.fmt==='JSON'&&r.ret==='GSTR2B'?' (JSON)':''}: ${o[1]}</span>`}).join('')}</div>`:''}</div>`:''}
   ${got.hasAny?`<p class="small muted" style="margin:6px 0 0">Already in the app: ${got.g1} GSTR-1, ${got.g2b} GSTR-2B, ${got.g3b} GSTR-3B month-sets.</p>`:''}
   <p class="small muted" style="margin:6px 0 0"><b>Taken:</b> GSTR-1 JSON · GSTR-2B Excel, or JSON for 1,000+ documents · GSTR-3B filed figures · TDS challans. Nothing is filed, paid or changed on any portal, and no password is asked for or kept.</p></div>`}

function reconTab(c){
  const d=rcOpen(c),cur=Object.keys(RC).includes(ui.rtab)?ui.rtab:'data';
  const R={};for(const k of Object.keys(RC))R[k]=recon(d,k);
  const tabs=[['data','Data'],...Object.entries(RCSHORT)];
  return `<div class="tabs" role="tablist" style="margin-top:0">${tabs.map(([k,l])=>`<button class="${k===cur?'on':''}" data-act="rtab" data-v="${k}">${l}${R[k]?`<span class="n" style="${R[k].state==='ok'?'color:var(--ok)':R[k].state==='bad'?'color:var(--hi)':''}">${R[k].state==='ok'?'✓':R[k].state==='bad'?'!':''}</span>`:''}</button>`).join('')}</div>`+
   (cur==='data'?rcData(c,d,R):rcView(c,d,R[cur]))}
function rcData(c,d,R){
  return `<div class="grid2 even" style="margin-bottom:16px"><div>
   <label class="drop" data-drop="rcbooks" style="margin-bottom:12px">${ic('up')}<b>Books: Tally XML, CSV or Excel</b><span class="small">Sales, purchases, credit and debit notes (with party GSTIN, invoice no., taxable value and tax), and TDS ledgers. The Day Book exported from Tally gives all of it.</span><input type="file" data-file="rcbooks" accept=".xml,.csv,.xlsx,.xls" hidden></label>
   <label class="drop" data-drop="rcportal" style="margin-bottom:12px">${ic('up')}<b>Portal files: GSTR-1, GSTR-2B, GSTR-3B</b><span class="small">GSTR-1 JSON or ZIP · GSTR-2B Excel or JSON · GSTR-3B JSON, or the <a href="#" data-act="g3bTpl">3B summary template</a>. Several files at once is fine.</span><input type="file" data-file="rcportal" accept=".json,.zip,.xlsx,.xls,.csv" multiple hidden></label>
   <div class="row small" style="margin:-4px 0 12px"><label class="f" style="flex:0 1 14em">Month, if the file does not say<select id="rc-month" data-rcmonth="1"><option value="">From the file</option>${fyMonths(d.fy).map(m=>`<option value="${m}" ${ui.rcMonth===m?'selected':''}>${mLabel(m)}</option>`).join('')}</select></label></div>
   <label class="drop" data-drop="rctds">${ic('up')}<b>TDS: challan list or TDS register</b><span class="small">PDF, Excel or CSV. Challans from the Income Tax portal / TRACES (BSR code, date, serial, amount), or a TDS register (date, section, party, PAN, TDS).</span><input type="file" data-file="rctds" accept=".pdf,.csv,.xlsx,.xls,.xml" hidden></label></div>
   <div>${fetchPanel(c,d)}<div class="panel" style="margin-top:12px"><h3>Rounding tolerance</h3><div class="row"><label class="f" style="flex:0 1 10em">Ignore differences up to (₹)<input type="number" min="0" step="1" id="rc-tol" data-rctol="1" value="${tol(d)}"></label></div></div></div></div>
   <h2 class="section">What is in, FY ${esc(d.fy)}</h2>${rcCoverage(d)}
   <div class="scroll" style="margin-top:14px"><table><thead><tr><th>Reconciliation</th><th>Months compared</th><th class="num">Tax difference</th><th>Status</th></tr></thead><tbody>${Object.entries(RC).map(([k,l])=>{const r=R[k];return `<tr class="click" data-act="rtab" data-v="${k}"><td><b>${l}</b></td><td>${k==='r5'?r.rows.filter(x=>x.a!=null).length:r.both.length}</td><td class="num">${k==='r5'?sgn(r.short):r.both.length?sgn(r.diffTax):'—'}</td><td>${rcState(r.state)}</td></tr>`}).join('')}</tbody></table></div>
   ${d.files?.length||d.chl?`<p class="small muted" style="margin-top:10px">Files: ${[...(d.files||[]).map(f=>f.name),...Object.values(d.g1).concat(Object.values(d.g2b),Object.values(d.g3b)).map(x=>x.from)].filter((v,i,a)=>v&&a.indexOf(v)===i).slice(0,14).map(esc).join(' · ')}</p>`:''}`}
const RHEAD={r1:['Sales books','GSTR-1','Books − GSTR-1'],r2:['Purchase books','GSTR-2B (ITC available)','Books − 2B'],r3:['GSTR-1','GSTR-3B 3.1(a)+(b)','GSTR-1 − 3B'],r4:['GSTR-3B ITC 4(A)','GSTR-2B ITC available','3B − 2B'],r5:['TDS deducted (books)','Challans for the month','Short / (excess)']};
const RMEAN={
  r1:r=>r.diffTax>0?'Books show more output tax than GSTR-1: sales may be missing from GSTR-1.':r.diffTax<0?'GSTR-1 shows more tax than the books: check for invoices reported but not booked, or duplicates.':'',
  r2:r=>r.diffTax>0?'Books claim more ITC than GSTR-2B shows: ITC on invoices not in 2B is at risk (section 16(2)(aa)).':r.diffTax<0?'GSTR-2B shows more ITC than the books: invoices may be unrecorded, or ITC not taken.':'',
  r3:r=>r.diffTax>0?'Liability declared in GSTR-1 is more than tax paid through GSTR-3B: short payment, with interest. A large gap can bring a DRC-01B intimation.':r.diffTax<0?'GSTR-3B shows more outward tax than GSTR-1: check for invoices left out of GSTR-1, or excess payment.':'',
  r4:r=>r.diffTax>0?'ITC claimed in GSTR-3B is more than GSTR-2B allows: excess claim to be reversed with interest. A large gap can bring a DRC-01C intimation.':r.diffTax<0?'GSTR-3B claims less ITC than GSTR-2B shows: ITC may be unclaimed (check time limits).':'',
  r5:r=>r.short>0?'TDS deducted in the books has not all been deposited by the due dates.':''};
function rcView(c,d,r){
  const k=r.k,[ha,hb,hd]=RHEAD[k],note=d.notes?.[k]||{};
  if(r.state==='none')return `<div class="empty">${k==='r5'?'Add the TDS entries from the books and the challans (upload, or Get from 1Go) to reconcile TDS.':`Add ${k==='r1'?'the sales books and GSTR-1':k==='r2'?'the purchase books and GSTR-2B':k==='r3'?'GSTR-1 and GSTR-3B':'GSTR-3B and GSTR-2B'} for the same months to compare them.`} <a href="#" data-act="rtab" data-v="data">Add data</a></div>`;
  const tbl=k==='r5'?`<table><thead><tr><th>Month</th><th class="num">${ha}</th><th class="num">Carried in</th><th class="num">${hb}</th><th class="num">Unpaid at due date</th></tr></thead><tbody>${r.rows.filter(x=>x.a!=null).map(x=>`<tr><td>${mLabel(x.m)}</td><td class="num">${inr(x.a)}</td><td class="num">${x.carryIn?inr(x.carryIn):'—'}</td><td class="num">${inr(x.b)}</td><td class="num">${sgn(x.late)}</td></tr>`).join('')}</tbody></table>`:
   `<table><thead><tr><th>Month</th><th class="num">${ha}: taxable</th><th class="num">tax</th><th class="num">${hb}: taxable</th><th class="num">tax</th><th class="num">${hd}: taxable</th><th class="num">tax</th><th></th></tr></thead><tbody>${r.months.map(x=>`<tr><td>${mLabel(x.m)}</td><td class="num">${x.a?inr(x.a.tx):'—'}</td><td class="num">${x.a?inr(taxOf(x.a)):'—'}</td><td class="num">${x.b?inr(x.b.tx):'—'}</td><td class="num">${x.b?inr(taxOf(x.b)):'—'}</td><td class="num">${k==='r4'?'':sgn(x.dtx)}</td><td class="num">${sgn(x.dtax)}</td><td>${x.a&&x.b?(x.ok?'<span class="tag g">OK</span>':'<span class="tag r">Diff</span>'):'<span class="tag n">One side</span>'}</td></tr>`).join('')}
    <tr style="font-weight:600"><td>Total</td><td class="num">${inr(R2(r.both.reduce((s,x)=>s+x.a.tx,0)))}</td><td class="num">${inr(R2(r.both.reduce((s,x)=>s+taxOf(x.a),0)))}</td><td class="num">${inr(R2(r.both.reduce((s,x)=>s+x.b.tx,0)))}</td><td class="num">${inr(R2(r.both.reduce((s,x)=>s+taxOf(x.b),0)))}</td><td class="num">${k==='r4'?'':sgn(R2(r.both.reduce((s,x)=>s+x.dtx,0)))}</td><td class="num">${sgn(r.diffTax)}</td><td></td></tr></tbody></table>`;
  const mean=RMEAN[k](r);
  const extra=k==='r5'?rcTdsDetail(r):k==='r3'||k==='r4'?rcHeads(d,k,r):rcInvList(r,k);
  return `<div class="kpis">${k==='r5'?`<div class="kpi ${r.short>r.t?'alert':'good'}"><b>${inrc(r.short)}</b><span>Not deposited by due dates</span></div><div class="kpi"><b>${inrc(r.interest)}</b><span>Interest estimate (1.5% a month)</span></div><div class="kpi"><b>${(d.chl?.rows||[]).length}</b><span>Challans</span></div><div class="kpi ${r.unbooked.length?'alert':''}"><b>${r.unbooked.length}</b><span>Challans not found in books</span></div>`:
   `<div class="kpi"><b>${r.both.length}</b><span>Months compared</span></div><div class="kpi ${r.bad?'alert':'good'}"><b>${r.bad}</b><span>Months with a difference</span></div><div class="kpi ${Math.abs(r.diffTax)>r.t?'alert':'good'}"><b>${inrc(r.diffTax)}</b><span>Tax difference (${esc(hd)})</span></div>${r.inv.length?`<div class="kpi ${(r.count.books||0)+(r.count.portal||0)?'alert':''}"><b>${(r.count.books||0)+(r.count.portal||0)}</b><span>Unmatched documents</span></div>`:''}`}</div>
   ${mean?`<div class="banner" style="margin-bottom:12px">${esc(mean)}</div>`:''}${r.warn.map(w=>`<p class="small muted">${esc(w)}</p>`).join('')}
   <div class="panel"><div class="row" style="margin-bottom:8px"><h2 class="sp" style="margin:0">${esc(RC[k])}</h2><button class="btn ghost sm" data-act="rcCsv" data-v="${k}">${ic('down')}CSV</button>${r.state==='bad'?`<button class="btn ghost sm" data-act="rcObs" data-v="${k}">${ic('flag')}Raise observation</button>`:''}</div><div class="scroll">${tbl}</div></div>
   ${extra}
   <div class="panel" style="margin-top:14px"><h3>Auditor's conclusion</h3><div class="form"><label class="f wide">Conclusion<select data-rcconc="${k}">${opts({'':'Not concluded',ok:'Reconciled / differences explained',issue:'Differences need action'},note.conc||'')}</select></label><label class="f wide">Notes<textarea data-rcnote="${k}" rows="2" placeholder="Explanations from the client, documents seen">${esc(note.text||'')}</textarea></label></div></div>`}
function rcHeads(d,k,r){
  const rows=r.both.map(x=>{const a=x.a,b=x.b;return `<tr><td>${mLabel(x.m)}</td>${['i','c','s','cs'].map(h=>`<td class="num">${sgn(R2(a[h]-b[h]))}</td>`).join('')}</tr>`}).join('');
  const oth=k==='r4'?r.both.map(x=>{const G=d.g3b[x.m],B=d.g2b[x.m],b2b=B.inv.filter(v=>v.a&&!v.rc).reduce((s,v)=>s+taxOf(v),0);return `<tr><td>${mLabel(x.m)}</td><td class="num">${inr(taxOf(G.oth))}</td><td class="num">${inr(R2(b2b))}</td><td class="num">${sgn(R2(taxOf(G.oth)-b2b))}</td><td class="num">${inr(taxOf(G.rev))}</td><td class="num">${inr(taxOf(B.na))}</td></tr>`}).join(''):'';
  return `<div class="grid2 even" style="margin-top:14px"><div class="panel"><h3>Difference by tax head</h3><div class="scroll"><table><thead><tr><th>Month</th><th class="num">IGST</th><th class="num">CGST</th><th class="num">SGST</th><th class="num">Cess</th></tr></thead><tbody>${rows}</tbody></table></div></div>
   ${k==='r4'?`<div class="panel"><h3>All other ITC 4(A)(5) vs 2B invoices</h3><div class="scroll"><table><thead><tr><th>Month</th><th class="num">3B 4(A)(5)</th><th class="num">2B B2B + notes</th><th class="num">Difference</th><th class="num">3B reversed 4(B)</th><th class="num">2B ITC not available</th></tr></thead><tbody>${oth}</tbody></table></div></div>`:
   `<div class="panel"><h3>GSTR-1 by table</h3><div class="scroll"><table><thead><tr><th>Month</th><th>Table</th><th class="num">Taxable</th><th class="num">Tax</th></tr></thead><tbody>${r.both.map(x=>Object.entries(d.g1[x.m].split||{}).map(([s,t],i)=>`<tr><td>${i?'':mLabel(x.m)}</td><td>${esc(s)}</td><td class="num">${inr(t.tx)}</td><td class="num">${inr(taxOf(t))}</td></tr>`).join('')).join('')}</tbody></table></div></div>`}</div>`}
function rcInvList(r,k){
  if(!r.inv.length)return'';const f=ui.rcf||'open',L=r.inv.filter(x=>f==='all'?true:f==='open'?!['match','period'].includes(x.st):x.st===f),show=L.slice(0,300);
  const order=['books','portal','diff','gstin','na','period','match'].filter(s=>r.count[s]);
  return `<div class="panel" style="margin-top:14px"><div class="row" style="margin-bottom:8px"><h3 class="sp" style="margin:0">Invoice by invoice (B2B, ${r.inv.length} documents)</h3>
   <div class="seg">${[['open','Needs a look'],...order.map(s=>[s,RST[s][1]]),['all','All']].map(([v,l])=>`<button data-act="rcf" data-v="${v}" class="${f===v?'on':''}">${esc(l)}${v!=='open'&&v!=='all'?` ${r.count[v]}`:''}</button>`).join('')}</div></div>
   <div class="scroll"><table class="stack"><thead><tr><th>Status</th><th>Month</th><th>GSTIN</th><th>Party</th><th>Invoice / note</th><th class="num">Books taxable</th><th class="num">Books tax</th><th class="num">${k==='r1'?'GSTR-1':'2B'} taxable</th><th class="num">${k==='r1'?'GSTR-1':'2B'} tax</th><th class="num">Tax difference</th></tr></thead><tbody>
   ${show.map(x=>{const b=x.b,p=x.p,o=b||p;return `<tr><td><span class="tag ${RST[x.st][0]}">${RST[x.st][1]}</span></td><td>${mLabel(x.m)}</td><td style="font-family:var(--mono,monospace);font-size:12px">${esc(o.g)}${b&&p&&b.g!==p.g?`<br><span class="muted">${esc(p.g)}</span>`:''}</td><td>${esc(b?.p||p?.p||'')}</td><td>${esc(o.n)}${o.k!=='inv'?` <span class="tag n">${o.k==='cn'?'Credit note':'Debit note'}</span>`:''}<div class="small muted">${fmtD(b?.d||p?.d)}${b&&p&&b.rp&&p.rp&&b.rp!==p.rp?' · in the return of '+mLabel(p.rp):''}</div></td>
     <td class="num">${b?inr(b.tx):'—'}</td><td class="num">${b?inr(taxOf(b)):'—'}</td><td class="num">${p?inr(p.tx):'—'}</td><td class="num">${p?inr(taxOf(p)):'—'}</td><td class="num">${sgn(R2((b?taxOf(b):0)-(p?taxOf(p):0)))}</td></tr>`}).join('')||'<tr><td colspan="10" class="muted">Nothing here.</td></tr>'}</tbody></table></div>
   ${L.length>show.length?`<p class="small muted">Showing ${show.length} of ${L.length}. The CSV has all of them.</p>`:''}</div>`}
function rcTdsDetail(r){
  return `<div class="grid2 even" style="margin-top:14px"><div class="panel"><h3>TDS in the books by nature</h3><div class="scroll"><table><thead><tr><th>Ledger / section</th><th class="num">Entries</th><th class="num">Deducted</th><th class="num">Paid (books)</th></tr></thead><tbody>${Object.entries(r.byNat).map(([n,o])=>`<tr><td>${esc(n)}</td><td class="num">${o.n}</td><td class="num">${inr(R2(o.ded))}</td><td class="num">${inr(R2(o.paid))}</td></tr>`).join('')||'<tr><td colspan="4" class="muted">No TDS entries in the books.</td></tr>'}</tbody></table></div></div>
   <div class="panel"><h3>Payments in the books vs challans</h3><div class="scroll"><table><thead><tr><th>Book entry</th><th class="num">Amount</th><th>Challan</th></tr></thead><tbody>${r.payRows.slice(0,200).map(x=>`<tr><td>${fmtD(x.date)} · ${esc(x.vno||x.ledger)}</td><td class="num">${inr(x.amount)}</td><td>${x.ch?`<span class="tag g">${esc(x.ch.bsr)} / ${esc(x.ch.serial)}</span> ${fmtD(x.ch.date)}`:'<span class="tag r">No challan</span>'}</td></tr>`).join('')}
    ${r.unbooked.map(c=>`<tr><td><span class="tag y">Not in books</span></td><td class="num">${inr(c.amount)}</td><td>${esc(c.bsr)} / ${esc(c.serial)} ${fmtD(c.date)} ${esc([c.minor,c.section].filter(Boolean).join(' · '))}</td></tr>`).join('')||''}</tbody></table></div></div></div>`}
function vRecon(){
  setTop([['Audits','audits'],['GST & TDS']]);
  return `<div class="head"><div class="titles"><h1>GST and TDS reconciliations, FY ${esc(fyNow())}</h1><p class="sub">Five standard reconciliations for every client: GSTR-1 vs sales, GSTR-2B vs purchases, GSTR-3B vs GSTR-1, GSTR-3B vs GSTR-2B, and TDS vs books. Each is a procedure of the client's audit, done in the audit's GST &amp; TDS tab. Upload the portal files, or get them from 1Go in one click.</p></div></div>${auditSubnav('recon')}
  ${S.clients.length?`<div class="scroll"><table class="stack"><thead><tr><th>Client</th>${Object.values(RCSHORT).map(l=>`<th>${l}</th>`).join('')}</tr></thead><tbody>${S.clients.map(c=>{const d=rdoc(c);return `<tr class="click" ${auditFor(c)?`data-go="audit-${auditFor(c).id}" data-tab="recon"`:`data-go="client-${c.id}" data-tab="audits"`}><td><b>${esc(c.name)}</b><div class="small muted">${esc(c.gstin||'No GSTIN')}</div></td>${Object.keys(RC).map(k=>`<td>${d?rcState(recon(d,k).state):'<span class="tag n">No data</span>'}</td>`).join('')}</tr>`}).join('')}</tbody></table></div>`:'<div class="empty">Add a client first.</div>'}`}
function reconReport(a){
  const c=S.clients.find(x=>x.id===a.clientId);if(!c)return'';const d=rdoc(c),miss='<h2>Annexure E — GST and TDS reconciliations</h2><p><b>Not completed.</b> The GST reconciliations are a mandatory procedure of every audit and have not been done yet.</p>';if(!d)return miss;
  const L=Object.keys(RC).map(k=>({k,r:recon(d,k)})).filter(x=>x.r.state!=='none');if(!L.length)return miss;
  return `<h2>Annexure E — GST and TDS reconciliations (FY ${esc(d.fy)})</h2><table><thead><tr><th>Reconciliation</th><th>Months</th><th>Difference</th><th>Status</th><th>Auditor's conclusion</th></tr></thead><tbody>${L.map(({k,r})=>`<tr><td>${esc(RC[k])}</td><td>${k==='r5'?r.rows.filter(x=>x.a!=null).length:r.both.length}</td><td>${inr(k==='r5'?r.short:r.diffTax)}</td><td>${r.state==='ok'?'Reconciled':'Differences'}</td><td>${esc({ok:'Reconciled / explained',issue:'Needs action'}[d.notes?.[k]?.conc]||'Not concluded')}${d.notes?.[k]?.text?' — '+esc(d.notes[k].text):''}</td></tr>`).join('')}</tbody></table>${GSTK.some(k=>!L.find(x=>x.k===k))?`<p><b>Not done:</b> ${GSTK.filter(k=>!L.find(x=>x.k===k)).map(k=>esc(RC[k])).join(', ')} (mandatory).</p>`:''}
  ${L.filter(x=>x.k!=='r5'&&x.r.bad).map(({k,r})=>`<h3>${esc(RC[k])}: months with differences</h3><table><thead><tr><th>Month</th><th>${esc(RHEAD[k][0])} tax</th><th>${esc(RHEAD[k][1])} tax</th><th>Difference</th></tr></thead><tbody>${r.both.filter(x=>!x.ok).map(x=>`<tr><td>${mLabel(x.m)}</td><td>${inr(taxOf(x.a))}</td><td>${inr(taxOf(x.b))}</td><td>${inr(x.dtax)}</td></tr>`).join('')}</tbody></table>`).join('')}`}

/* ---------- mandatory procedures of every audit ----------
   Owner, 23 Nov 2026: vouching and the GST reconciliations are mandatory in every audit; TDS is optional (it depends on the client). */
const GSTK=['r1','r2','r3','r4'];
function mandatory(c){
  const v=vdoc(c),types=v?Object.keys(VTYPES).filter(k=>v.types?.[k]?.sample?.length):[],vs=types.map(k=>vResults(v.types[k]));
  const vouch=!v?{st:'todo',text:'Not started: import the books and draw samples'}:!types.length?{st:'todo',text:'Books imported; no sample drawn yet'}:vs.every(r=>r.done===r.total)?{st:'done',text:types.length+' voucher type'+(types.length===1?'':'s')+' vouched in full'}:{st:'doing',text:vs.reduce((s,r)=>s+r.done,0)+' of '+vs.reduce((s,r)=>s+r.total,0)+' sampled vouchers vouched'};
  const d=rdoc(c),gs=GSTK.map(k=>({k,r:d?recon(d,k):null,conc:d?.notes?.[k]?.conc||''}));
  const ok=x=>x.r&&x.r.state!=='none'&&(x.r.state==='ok'||x.conc),nd=gs.filter(ok).length;
  const gst=nd===4?{st:'done',text:'All 4 reconciliations done'+(gs.some(x=>x.conc==='issue')?' (some need action)':'')}:{st:nd||d?'doing':'todo',text:nd+' of 4 done: '+gs.filter(x=>!ok(x)).map(x=>RCSHORT[x.k]+(x.r&&x.r.state==='bad'?' (differences to conclude)':x.r&&x.r.state!=='none'?'':' (no data)')).join(', ')};
  const t=d?recon(d,'r5'):null,tds={st:'opt',text:t&&t.state!=='none'?(t.state==='ok'?'Reconciled':'Differences')+(d.notes?.r5?.conc?' · concluded':''):'Optional: only where the client deducts TDS'};
  return{vouch,gst,tds,done:vouch.st==='done'&&gst.st==='done'}}
function mandCard(c){
  const m=mandatory(c),tag={done:'<span class="tag g">Done</span>',doing:'<span class="tag y">In progress</span>',todo:'<span class="tag r">To do</span>',opt:'<span class="tag n">Optional</span>'};
  return `<div class="panel" style="margin:12px 0 4px;padding:12px 16px"><div class="row" style="gap:10px;margin-bottom:6px"><b class="sp">Mandatory procedures</b>${m.done?'<span class="tag g">Complete</span>':'<span class="small muted">Needed before the audit is reported</span>'}</div>
   ${[['vouching','Vouching',m.vouch,'SIA 320 evidence · SIA 5 sampling'],['recon','GST reconciliations (GSTR-1, 2B, 3B)',m.gst,'SIA 150 compliance with laws'],['recon','TDS vs books',m.tds,'']].map(([tab,l,x,ref])=>`<div class="row small" style="gap:10px;padding:3px 0">${tag[x.st]}<a href="#" data-act="tab" data-tab="${tab}"${tab==='recon'&&l.startsWith('TDS')?' data-rt="r5"':''}><b>${l}</b></a><span class="muted">${esc(x.text)}</span>${ref?`<span class="tag n" style="margin-left:auto">${ref}</span>`:''}</div>`).join('')}</div>`}

/* ---------- in-app click-to-fetch of GST returns ----------
   Replaces the old "Get from 1Go" handover: the app builds the GST portal's
   return-download URLs for the selected returns and months and opens them in
   the browser. The user signs in to the portal (once, in their own browser),
   downloads each file, and drops it into the portal-files box — the app then
   reads and matches it in-app, for any invoice volume (long or short). */
async function fetchStart(){
  const c=C();if(!c)return;
  const items=[...document.querySelectorAll('[data-fetchitem]:checked')].map(x=>x.dataset.fetchitem);
  const months=[...document.querySelectorAll('[data-fetchmonth]:checked')].map(x=>x.dataset.fetchmonth).sort();
  ui.fetchSel={items,months};
  if(!items.length||(!months.length&&items.some(i=>i!=='TDS')))return toast('Choose what to fetch and at least one month.');
  if(items.some(i=>i!=='TDS')&&!isGstin(c.gstin))return toast("Add the client's GSTIN in the client master to fetch the GST returns.");
  try{const r=await helper('/fetch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client:c.name,gstin:(c.gstin||'').toUpperCase(),tan:c.tan||'',items,months,tdsFrom:ui.fetchTds||'traces'})});
    const {id}=await r.json();ui.gstOnline=true;
    ui.gstJob={id,clientId:c.id,status:'running',text:'Opening the portal window on this computer…',results:[]};
    try{localStorage.setItem(runKey(c),JSON.stringify({id,at:Date.now()}))}catch(e){}
    toast('A portal window is opening on this computer: sign in there.');render();gstWatch()}
  catch(e){ui.gstOnline=false;render();toast(/fetch/i.test(e.message)?'The portal helper is not running on this computer. Start it (see the box below) and try again.':e.message)}}
async function gstWatch(){
  const J=ui.gstJob;if(!J||J.status!=='running')return;
  try{const s=await(await helper('/status/'+J.id)).json();Object.assign(J,s);
    if(s.status==='running'){schedule();clearTimeout(gstWatch.t);gstWatch.t=setTimeout(gstWatch,2000);return}
    const c=S.clients.find(x=>x.id===J.clientId);if(c)await helperPull(c,J.id);else{J.status='done';schedule()}}
  catch(e){J.status='error';J.text='Lost touch with the portal helper ('+(e.message||e)+'). Start it again and use “Read the last run’s files”.';schedule()}}
/* the files of a run, read into Smart Auditing: all of a month's parts together (a GSTR-1 or GSTR-2B split by the portal adds up) */
async function helperPull(c,id){
  id=id||lastRun(c)?.id;if(!id)return toast('No portal run for this client yet.');
  const J=ui.gstJob&&ui.gstJob.id===id?ui.gstJob:(ui.gstJob={id,clientId:c.id,status:'reading',text:'',results:[]});
  try{const s=await(await helper('/status/'+id)).json();Object.assign(J,s,{status:'reading',text:'Reading '+s.files.length+' file'+(s.files.length===1?'':'s')+' into Smart Auditing…'});schedule();
    const res=[],errs=[],keep=ui.rcMonth;
    for(const f of s.files){try{const buf=await(await helper('/file/'+id+'/'+f.n)).arrayBuffer();ui.rcMonth=f.month||keep;
        res.push(...(await readPortalFile(f.name,buf,f.ret==='GSTR2B'?'g2b':'')).map(r=>({...r,from:f.name})));
        rcEvidence(c,new File([buf],f.name),'GST portal data ('+(f.ret||'file')+' '+(f.month?mLabel(f.month):'')+')').catch(()=>{})}
      catch(e){errs.push(f.name+': '+(e.message||e))}finally{ui.rcMonth=keep}}
    let said=res.length?await putPortal(c,mergeParts(res),'Portal helper'):[];
    if(s.challans){const ch=await(await helper('/challans/'+id)).json();if(ch.rows?.length)said=said.concat(await putPortal(c,[{kind:'chl',rows:ch.rows}],'Portal helper'))}
    J.status='done';J.text=(said.length?'Read into Smart Auditing: '+said.join(', ')+'.':'Nothing new to read in.')+(errs.length?' Not read: '+errs.join('; '):'');
    toast(J.text.slice(0,240))}
  catch(e){J.status='error';J.text=/fetch/i.test(e.message)?'The portal helper is not running. Start it, then use “Read the last run’s files”.':(e.message||String(e));toast(J.text)}
  schedule()}

/* ---------- actions ---------- */
const rcCsvRows={
  inv:r=>[['Status','Month','GSTIN (books)','GSTIN (return)','Party','Document','Type','Books date','Return date','Books taxable','Books tax','Return taxable','Return tax','Tax difference'],...r.inv.map(x=>{const b=x.b,p=x.p;return[RST[x.st][1],mLabel(x.m),b?.g||'',p?.g||'',b?.p||p?.p||'',(b||p).n,(b||p).k,b?.d||'',p?.d||'',b?.tx??'',b?taxOf(b):'',p?.tx??'',p?taxOf(p):'',R2((b?taxOf(b):0)-(p?taxOf(p):0))]})],
  mon:(r,k)=>[['Month',RHEAD[k][0]+' taxable',RHEAD[k][0]+' IGST','CGST','SGST',RHEAD[k][1]+' taxable',RHEAD[k][1]+' IGST','CGST','SGST','Taxable difference','Tax difference'],...r.months.map(x=>[mLabel(x.m),x.a?.tx??'',x.a?.i??'',x.a?.c??'',x.a?.s??'',x.b?.tx??'',x.b?.i??'',x.b?.c??'',x.b?.s??'',x.dtx??'',x.dtax??''])],
  tds:r=>[['Month','TDS deducted (books)','Carried in','Challans for the month','Unpaid at due date'],...r.rows.filter(x=>x.a!=null).map(x=>[mLabel(x.m),x.a,x.carryIn,x.b,x.late]),[],['Book payment date','Voucher','Amount','Challan BSR','Challan serial','Challan date'],...r.payRows.map(x=>[x.date,x.vno||x.ledger,x.amount,x.ch?.bsr||'',x.ch?.serial||'',x.ch?.date||'']),...r.unbooked.map(c=>['(not in books)','',c.amount,c.bsr,c.serial,c.date])]};
Object.assign(ACT,{
  rtab:t=>{ui.rtab=t.dataset.v;render()},
  rcf:t=>{ui.rcf=t.dataset.v;render()},
  g3bTpl:()=>dlFile('GSTR-3B summary template.csv',G3B_TEMPLATE),
  fetchStart:()=>fetchStart(),
  rcPull:()=>helperPull(C()),
  fetchStop:async()=>{const J=ui.gstJob;if(!J)return;try{await helper('/stop/'+J.id,{method:'POST'});toast('Stopping: the helper logs out of the portal first.')}catch(e){toast(e.message)}},
  helperCheck:()=>{ui.gstOnline=null;gstCheck();render()},
  rcCsv:t=>{const c=C(),d=rcOpen(c),k=t.dataset.v,r=recon(d,k),q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const rows=k==='r5'?rcCsvRows.tds(r):[...rcCsvRows.mon(r,k),...(r.inv.length?[[],...rcCsvRows.inv(r)]:[])];dlFile(fileSafe(c.name)+' '+RCSHORT[k]+' FY '+d.fy+'.csv',rows.map(x=>x.map(q).join(',')).join('\n'))},
  rcObs:t=>{const c=C(),d=rcOpen(c),k=t.dataset.v,r=recon(d,k);
    const cond=k==='r5'?`TDS deducted in the books of ${inr(R2((d.tB?.rows||[]).filter(x=>x.kind==='ded').reduce((s,x)=>s+x.amount,0)))} was not fully deposited by the due dates: ${inr(r.short)} remains unpaid; estimated interest ${inr(r.interest)}. ${r.unbooked.length} challans are not found in the books.`:
      `${RC[k]} for FY ${d.fy}: ${r.bad} of ${r.both.length} months differ; net tax difference ${inr(r.diffTax)} (${RHEAD[k][2]}). `+r.both.filter(x=>!x.ok).slice(0,4).map(x=>`${mLabel(x.m)}: ${inr(x.dtax)}`).join('; ')+(r.inv.length?`. Documents: ${r.count.books||0} only in books, ${r.count.portal||0} only in the return, ${(r.count.diff||0)+(r.count.gstin||0)} with differences.`:'');
    const crit={r1:'Section 37 of the CGST Act: outward supplies to be reported correctly in GSTR-1.',r2:'Section 16(2)(aa) of the CGST Act: ITC only on invoices furnished by the supplier and shown in GSTR-2B.',r3:'Sections 39 and 50 of the CGST Act: tax on outward supplies paid through GSTR-3B, with interest on delay; Rule 88C.',r4:'Section 16 of the CGST Act and Rule 88D: ITC claimed in GSTR-3B not to exceed GSTR-2B.',r5:'Income-tax law: TDS to be deposited by the 7th of the following month (30 April for March), with interest at 1.5% a month for late deposit.'}[k];
    newObs({clientId:c.id,auditId:A()?.id||'',title:'Differences in '+RC[k],rating:Math.abs(k==='r5'?r.short:r.diffTax)>100000?'H':'M',condition:cond,criteria:crit,effect:k==='r5'?'Interest and possible disallowance of the expense.':'Possible tax demand, interest and penalty; ITC at risk.',rec:'Reconcile the differences with the client, correct them in the next return or by payment / reversal through DRC-03, and keep the reconciliation on file every month.'})}
});
document.addEventListener('change',e=>{
  const t=e.target;if(!(t.dataset.rctol||t.dataset.rcconc!=null||t.dataset.rcnote!=null||t.dataset.rcmonth||t.dataset.fetchitem||t.dataset.fetchmonth||t.dataset.fetchtds))return;
  if(t.dataset.fetchtds){ui.fetchTds=t.value;return}
  if(t.dataset.rcmonth){ui.rcMonth=t.value;return}
  if(t.dataset.fetchitem||t.dataset.fetchmonth){ui.fetchSel={items:[...document.querySelectorAll('[data-fetchitem]:checked')].map(x=>x.dataset.fetchitem),months:[...document.querySelectorAll('[data-fetchmonth]:checked')].map(x=>x.dataset.fetchmonth)};return}
  const c=C(),d=rcOpen(c);
  if(t.dataset.rctol)return put('recons',d.id,{...d,tol:Math.max(0,+t.value||0)});
  const k=t.dataset.rcconc??t.dataset.rcnote,n={...(d.notes?.[k]||{})};if(t.dataset.rcconc!=null)n.conc=t.value;else n.text=t.value;
  put('recons',d.id,{...d,notes:{...d.notes,[k]:n}})});
