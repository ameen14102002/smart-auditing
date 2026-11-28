const TEMPLATES={
 p2p:{name:'Procure to pay',items:[['Purchase orders approved before ordering, as per the authority matrix','SIA 120 · control activity'],['Vendor master additions and changes approved and reviewed','SIA 120'],['Three-way match of PO, GRN and invoice before payment','SIA 320'],['No duplicate vendor invoices paid','Data test: duplicates'],['Vendor advances tracked and adjusted against bills','SIA 320'],['GST input credit in books agrees with GSTR-2B','GST compliance'],['TDS deducted and deposited on applicable vendor payments','Income-tax compliance']]},
 o2c:{name:'Order to cash',items:[['Customer credit limits approved and enforced','SIA 120'],['Sales priced as per approved price list; deviations approved','SIA 320'],['Every dispatch invoiced (dispatch vs invoice reconciliation)','Cut-off'],['Credit notes and discounts approved by authorised person','SIA 120'],['Receivables ageing reviewed and provisions made','SIA 320'],['Output GST in books agrees with GSTR-1 and GSTR-3B','GST compliance']]},
 payroll:{name:'Payroll',items:[['Joiners and leavers updated in payroll on time','SIA 120'],['Salary revisions approved by HR and management','SIA 120'],['Monthly payroll reconciled to previous month; variances explained','SIA 320'],['PF, ESI and professional tax deducted and paid on time','Labour law compliance'],['TDS on salary computed and deposited','Income-tax compliance'],['No two employees share a bank account (ghost employee check)','Data test']]},
 fa:{name:'Fixed assets',items:[['Capital expenditure approved and capitalised as per policy','SIA 120'],['Fixed asset register reconciles with the general ledger','SIA 320'],['Physical verification done and differences resolved','CARO 3(i)'],['Depreciation as per Schedule II / company policy','Companies Act'],['Disposals approved and correctly accounted','SIA 320']]},
 inv:{name:'Inventory',items:[['Physical stock count done and reconciled with books','CARO 3(ii)'],['Slow-moving and obsolete stock identified and provided','SIA 320'],['GRNs recorded on receipt; period-end cut-off correct','Cut-off'],['Valuation as per accounting policy (cost or NRV)','Ind AS 2 / AS 2'],['Access to stores restricted to authorised staff','SIA 120']]},
 cash:{name:'Cash and bank',items:[['Bank reconciliations prepared monthly and reviewed','SIA 320'],['Surprise cash counts done and recorded','SIA 320'],['Payments approved under dual authorisation','SIA 120'],['Beneficiary / bank master changes controlled','SIA 120'],['Cash payments within the limits set by policy and tax law','Data test: cash']]},
 stat:{name:'Statutory compliance',items:[['GST returns filed on time and reconciled with books','GST compliance'],['TDS/TCS returns filed and reconciled with Form 26AS / AIS','Income-tax compliance'],['PF and ESI returns filed on time','Labour law compliance'],['ROC filings (AOC-4, MGT-7) on time','Companies Act'],['Licences and registrations valid and renewed','SIA 150']]},
 itgc:{name:'IT general controls',items:[['User access to accounting/ERP reviewed periodically','SIA 520'],['Segregation of duties in system roles','SIA 520'],['Backups taken and restore tested','SIA 520'],['Software changes approved and tested before use','SIA 520'],['Audit trail (edit log) enabled in accounting software','Companies (Accounts) Rules, rule 3(1)']]},
 gov:{name:'Governance and related parties',items:[['Related party transactions approved by Board / Audit Committee / shareholders as required','Companies Act s.177, s.188'],['Board and committee meetings held and minuted','Companies Act s.173, SS-1'],['CSR spend as per approved plan; unspent amount transferred on time','Companies Act s.135'],['Vigil mechanism working; complaints investigated and reported','Companies Act s.177(9)'],['Secretarial / cost auditor appointed and forms filed on time','Companies Act s.204, s.148'],['Statutory registers maintained and up to date','Companies Act']]},
 rbia:{name:'Lending and RBIA',items:[['Board-approved RBIA policy and at least annual risk assessment','RBI Internal Audit Function Directions 2026'],['Loans sanctioned within delegated powers; appraisal documented','Credit policy'],['Asset classification and NPA provisioning as per RBI norms','RBI prudential norms'],['KYC done and suspicious transactions reported','RBI KYC Directions / PMLA'],['Head of Internal Audit independent, with no business targets','RBI Internal Audit Function Directions 2026'],['Audit observations tracked and closure reported to the Audit Committee','RBI Internal Audit Function Directions 2026']]},
 broker:{name:'Broker / DP compliance',items:[['Client funds and securities segregated and reconciled','SEBI circulars'],['Client KYC and registration complete','SEBI KYC norms'],['Margins collected and reported as per exchange norms','Exchange bye-laws'],['Half-yearly internal audit report filed with exchange / depository','SEBI circular 2008; depository bye-laws'],['Cyber security and system audit completed','SEBI cyber security framework']]}
};
const ENT={private:'Private company',opc:'One person company',public:'Unlisted public company',listed:'Listed company',sec8:'Section 8 company',llp:'LLP',firm:'Partnership firm',prop:'Proprietorship',trust:'Trust / society'};
const REG={none:'None',nbfcD:'NBFC / HFC, deposit-taking',nbfcL:'NBFC / HFC, non-deposit, assets ₹5,000 cr+',nbfcS:'NBFC, non-deposit, assets below ₹5,000 cr',bank:'Commercial bank',sfb:'Small finance bank',broker:'Stock broker / clearing member',dp:'Depository participant',insurer:'Insurance company'};
const BIZ={trading:'Trading',manufacturing:'Manufacturing',services:'Services',profession:'Profession (CA, doctor, consultant…)',finance:'Financial services'};
const COST={none:'Not covered by cost-records rules',A:'Regulated sector (Table A)',B:'Non-regulated sector (Table B)'};
const REL={none:'Not a holding or subsidiary',subPublic:'Holding or subsidiary of a public company',subOther:'Holding or subsidiary of another company'};
const RES=[['','Not tested'],['ok','Satisfactory'],['ex','Exception'],['na','Not applicable']];
const STAGES=['Planned','Fieldwork','Review','Reported','Closed'];
const OSTAT=['Open','In progress','Closed'];
const RLABEL={H:'High',M:'Medium',L:'Low'};
const S={clients:[],audits:[],observations:[],evidence:[],vouching:[]};
const ui={view:'home',id:null,ctab:'overview',atab:'checklist',f:{client:'',rating:'',status:'open',stage:''},armed:null,draft:null,lastId:null,gstFetchUrl:'http://127.0.0.1:8790',gstJob:null};
let db=null,users=null,dl=null,me=null,live=false,names={},pending=false;
/* Hosted mode: Supabase (public URL + publishable key; data is protected by row-level security). */
const SB={url:'https://mkwwrkvsjafzxvlbfwla.supabase.co',key:'sb_publishable_VLkwQvLmUKFenUfC56VDxw_tmr49Adq'};
let mode='preview',sb=null,session=null,ws=null,wsList=[],loggingIn=false,rtTimer=null,channel=null,mustSignIn=true;
const browserDl={save:({filename,data})=>{const u=URL.createObjectURL(new Blob([data],{type:filename.endsWith('.csv')?'text/csv':'text/html'}));const a=document.createElement('a');a.href=u;a.download=String(filename).replace(/[^\p{L}\p{N}\s._,()&+\-]/gu,'-').replace(/-{2,}/g,'-');document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000);return Promise.resolve({status:'saved'})}};
const store={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const today=()=>new Date().toISOString().slice(0,10);
const fmtD=d=>d?new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'—';
const inr=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});
const cname=id=>S.clients.find(c=>c.id===id)?.name||'Unknown client';
const overdue=o=>o.status!=='Closed'&&o.due&&o.due<today();
function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>t.hidden=true,2800)}

/* ---------- storage ---------- */
async function put(col,id,data){
  const body=JSON.parse(JSON.stringify({...data,id,updatedAt:new Date().toISOString()}));
  if(mode==='supa'){const a=S[col],i=a.findIndex(x=>x.id===id);i<0?a.push(body):a[i]=body;schedule();const {error}=await sb.from('records').upsert({workspace_id:ws.id,col,id,data:body});if(error)toast('Could not save: '+error.message);return}
  if(!db){const a=S[col],i=a.findIndex(x=>x.id===id);i<0?a.push(body):a[i]=body;schedule();return}
  try{await db.collection(col).doc(id).set(body)}catch(e){toast(e.code==='invalid_argument'?'You have view-only access, so changes are not saved.':e.code==='quota_exceeded'?'Storage is full; delete old records.':'Could not save. Try again.')}
}
async function del(col,id){
  if(mode==='supa'){S[col]=S[col].filter(x=>x.id!==id);schedule();const {error}=await sb.from('records').delete().eq('workspace_id',ws.id).eq('col',col).eq('id',id);if(error)toast('Could not delete: '+error.message);return}
  if(!db){S[col]=S[col].filter(x=>x.id!==id);schedule();return}
  try{await db.collection(col).doc(id).delete()}catch(e){toast('Could not delete.')}
}
function subscribe(){
  let got=0;const timer=setTimeout(()=>{if(!live)$('#status').textContent='Data cannot be reached yet'},10000);
  for(const col of Object.keys(S)){
    db.collection(col).onSnapshot(snap=>{
      S[col]=snap.docs.map(d=>d.data());
      if(!snap.metadata.fromCache&&++got>=Object.keys(S).length){live=true;clearTimeout(timer);$('#status').textContent='Saved online · shared with your team'}
      schedule();
    },e=>{clearTimeout(timer);$('#status').textContent='Data unavailable ('+e.code+')'});
  }
}
function schedule(){clearTimeout(schedule.t);schedule.t=setTimeout(()=>{const a=document.activeElement;if(a&&a.closest&&a.closest('#main')&&/INPUT|TEXTAREA|SELECT/.test(a.tagName)&&a.type!=='checkbox'&&a.type!=='file'){pending=true;return}render()},30)}
document.addEventListener('focusout',()=>setTimeout(()=>{if(pending){const a=document.activeElement;if(!(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName))){pending=false;render()}}},50));
async function resolveNames(ids){
  const miss=[...new Set(ids)].filter(i=>i&&!(i in names));if(!users||!miss.length)return;
  miss.forEach(i=>names[i]='');
  try{const ps=await users.profiles(miss);for(const i of miss)names[i]=ps?.[i]?.name||'';render()}catch(e){}
}
const who=id=>id?(id===me?'You':(names[id]||'Team member')):'—';

/* ---------- Supabase: sign-in, workspaces, live sync ---------- */
async function loadAll(){
  const {data,error}=await sb.from('records').select('col,data').eq('workspace_id',ws.id);
  if(error){$('#status').textContent='Could not load data: '+error.message;return}
  for(const k of Object.keys(S))S[k]=data.filter(r=>r.col===k).map(r=>r.data);
  live=true;railStatus();schedule();
}
async function openWorkspace(w){
  ws=w;store.set('sa-ws',w.id);for(const k of Object.keys(S))S[k]=[];
  const {data:mem}=await sb.from('members').select('user_id,email,role').eq('workspace_id',w.id);
  names={};(mem||[]).forEach(m=>names[m.user_id]=m.email||'');ws.members=mem||[];
  if(channel)sb.removeChannel(channel);
  channel=sb.channel('ws-'+w.id).on('postgres_changes',{event:'*',schema:'public',table:'records',filter:'workspace_id=eq.'+w.id},()=>{clearTimeout(rtTimer);rtTimer=setTimeout(loadAll,500)}).subscribe();
  await loadAll();
}
async function afterLogin(){
  if(loggingIn)return;loggingIn=true;
  try{
    me=session.user.id;
    const {data,error}=await sb.from('members').select('role,workspaces(id,name,join_code,owner)').eq('user_id',me);
    if(error)throw error;
    wsList=(data||[]).map(r=>r.workspaces).filter(Boolean);
    const pick=wsList.find(w=>w.id===store.get('sa-ws'))||wsList[0];
    if(pick)await openWorkspace(pick);else ws=null;
  }catch(e){toast('Could not load your workspace: '+(e.message||e))}
  finally{loggingIn=false;railStatus();render()}
}
const SAMPLE={clients:[{id:'s-kaveri',sample:true,name:'Kaveri Textiles Pvt Ltd',type:'private',rel:'none',biz:'manufacturing',reg:'none',cost:'B',industry:'Cotton yarn and fabrics',system:'Tally',turnover:240,paidup:12,networth:80,profit:9,borrow:60,deposits:0,costTurnover:120,employees:140,gst:true},{id:'s-nilgiri',sample:true,name:'Nilgiri Finance Ltd',type:'public',rel:'none',biz:'finance',reg:'nbfcL',cost:'none',industry:'Vehicle and gold loans',system:'Core lending system + Zoho Books',turnover:420,paidup:60,networth:900,profit:70,borrow:2400,deposits:0,employees:600,gst:true}],
 observations:[{id:'s-o1',sample:true,clientId:'s-kaveri',auditId:'',title:'Duplicate vendor payments',rating:'H',status:'Open',condition:'Two invoices from one cotton supplier (₹3,40,000 each) were paid twice in July 2026.',criteria:'Each vendor invoice should be paid once.',cause:'Duplicate invoice check switched off.',effect:'Cash loss until recovered.',rec:'Switch on duplicate blocking; recover the balance.',response:'Agreed; check enabled.',owner:'Purchase head',due:'2026-10-31'}]};
async function loadSample(){
  for(const c of SAMPLE.clients)await put('clients',c.id,{...c,risks:suggestedRisks(c),createdAt:new Date().toISOString()});
  for(const o of SAMPLE.observations)await put('observations',o.id,{...o,createdAt:new Date().toISOString()});
  const c=SAMPLE.clients[0],a=TEMPLATES.p2p;
  await put('audits','s-a1',{sample:true,clientId:c.id,t:'p2p',title:a.name,period:'Apr–Sep 2026',due:'2026-11-30',stage:'Fieldwork',createdAt:new Date().toISOString(),items:a.items.map(([q,ref],i)=>({q,ref,r:i===0?'ok':i===3?'ex':'',n:i===3?'Two invoices paid twice; one recovered.':''}))});
  toast('Sample data loaded');
}

/* ---------- rules ---------- */
/* Applicability engine: client master → laws, audits and returns that apply. Amounts in ₹ crore (LLP contribution in ₹ lakh), previous FY. */
const isCo=c=>['private','opc','public','listed','sec8'].includes(c.type);
const isSmall=c=>c.type==='private'&&(c.rel||'none')==='none'&&(+c.paidup||0)<=10&&(+c.turnover||0)<=100;
function applicability(c){
  const n=k=>+c[k]||0,t=n('turnover'),p=n('paidup'),nw=n('networth'),np=n('profit'),b=n('borrow'),d=n('deposits'),emp=n('employees'),pt=n('costTurnover');
  const out=[],add=(g,name,st,why,basis,areas)=>out.push({g,name,st,why,basis,areas:areas||[]});
  const hits=(...r)=>r.filter(x=>x[0]).map(x=>x[1]).join(', ');
  const co=isCo(c),small=isSmall(c),pub=c.type==='public'||c.type==='listed';
  if(co){
    add('Company law','Statutory audit','yes','Every company','Companies Act s.139, s.143',[]);
    let ia;
    if(c.type==='listed')ia=['yes','Every listed company'];
    else if(c.type==='public'){const h=hits([p>=50,'paid-up ≥ ₹50 cr'],[t>=200,'turnover ≥ ₹200 cr'],[b>100,'borrowings > ₹100 cr'],[d>=25,'deposits ≥ ₹25 cr']);ia=h?['yes',h]:['no','Below all four limits for unlisted public companies']}
    else if(c.type==='sec8')ia=['check','Apply the public or private company test, as per how it is registered'];
    else{const h=hits([t>=200,'turnover ≥ ₹200 cr'],[b>100,'borrowings > ₹100 cr']);ia=h?['yes',h]:['no','Turnover below ₹200 cr and borrowings not above ₹100 cr']}
    add('Company law','Internal audit',ia[0],ia[1],'s.138 + Rule 13, Companies (Accounts) Rules 2014',['p2p','o2c','cash']);
    let caro;
    if(['bank','insurer'].includes(c.reg))caro=['no','Banking and insurance companies are excluded'];
    else if(c.type==='sec8'||c.type==='opc')caro=['no',ENT[c.type]+'s are excluded'];
    else if(small)caro=['no','Small company'];
    else if(c.type==='private'&&c.rel!=='subPublic'&&nw<=1&&b<=1&&t<=10)caro=['no','Private company within ₹1 cr capital + reserves, ₹1 cr borrowings and ₹10 cr revenue'];
    else caro=['yes',c.type==='private'?'Not a small company and above the private-company limits':'Applies to '+ENT[c.type].toLowerCase()+'s'];
    add('Company law','CARO 2020 reporting by statutory auditor',caro[0],caro[1],'Companies (Auditor\'s Report) Order 2020',['fa','inv','stat']);
    let ifc;
    if(c.type==='opc'||small)ifc=['no',c.type==='opc'?'One person company':'Small company'];
    else if(c.type==='private'){if(t<50&&b<25)ifc=['no','Private company: turnover below ₹50 cr and borrowings below ₹25 cr'];else if(t<50||b<25)ifc=['check','Only one of the two private-company limits is met; sources read the 2017 exemption differently'];else ifc=['yes','Turnover ₹50 cr+ and borrowings ₹25 cr+']}
    else ifc=['yes','No exemption for '+ENT[c.type].toLowerCase()+'s'];
    add('Company law','Internal financial controls reporting',ifc[0],ifc[1],'s.143(3)(i); MCA notification 13 Jun 2017',['p2p','o2c','cash','fa','itgc']);
    const sec=hits([c.type==='listed','listed'],[pub&&p>=50,'paid-up ≥ ₹50 cr'],[pub&&t>=250,'turnover ≥ ₹250 cr'],[b>=100,'borrowings ≥ ₹100 cr']);
    add('Company law','Secretarial audit',sec?'yes':'no',sec||'Below the s.204 limits','s.204 + Rule 9',['gov']);
    const ac=hits([c.type==='listed','listed'],[pub&&p>=10,'paid-up ≥ ₹10 cr'],[pub&&t>=100,'turnover ≥ ₹100 cr'],[pub&&b+d>50,'loans and deposits > ₹50 cr']);
    add('Company law','Audit Committee',ac?'yes':'no',ac||'Not required at these figures','s.177 + Rule 6',['gov']);
    const vm=hits([c.type==='listed','listed'],[d>0,'accepts deposits'],[b>50,'bank borrowings > ₹50 cr']);
    add('Company law','Vigil mechanism (whistle-blower)',vm?'yes':'no',vm||'Not required at these figures','s.177(9) + Rule 7',['gov']);
    const csr=hits([nw>=500,'net worth ≥ ₹500 cr'],[t>=1000,'turnover ≥ ₹1,000 cr'],[np>=5,'net profit ≥ ₹5 cr']);
    add('Company law','CSR spending',csr?'yes':'no',csr||'Below all three limits','s.135',['gov']);
    const ind=['bank','insurer','nbfcD','nbfcL','nbfcS'].includes(c.reg)?['check','Financial-sector companies follow their own Ind AS roadmap']:(c.type==='listed'||nw>=250)?['yes',c.type==='listed'?'Listed company':'Net worth ≥ ₹250 cr']:['no','Accounting Standards (AS) apply, unless part of a group that uses Ind AS'];
    add('Company law','Ind AS',ind[0],ind[1],'Companies (Ind AS) Rules 2015',[]);
    if(c.cost&&c.cost!=='none'){
      add('Company law','Cost records',t>=35?'yes':'no',t>=35?'Covered sector, turnover ≥ ₹35 cr':'Turnover below ₹35 cr','s.148; Cost Records and Audit Rules 2014',['inv']);
      const ca=c.cost==='A'?t>=50&&pt>=25:t>=100&&pt>=35;
      add('Company law','Cost audit',ca?'yes':'no',ca?(c.cost==='A'?'Regulated: turnover ≥ ₹50 cr and product turnover ≥ ₹25 cr':'Non-regulated: turnover ≥ ₹100 cr and product turnover ≥ ₹35 cr'):'Below the '+(c.cost==='A'?'₹50 cr / ₹25 cr':'₹100 cr / ₹35 cr')+' limits','Rule 4, Cost Records and Audit Rules 2014',['inv']);
    }
    add('Company law','Audit trail in accounting software','yes','Every company must use software that keeps an edit log','Companies (Accounts) Rules, rule 3(1)',['itgc']);
  }else if(c.type==='llp'){
    const la=t>0.4||n('contribution')>25;
    add('Entity law','LLP statutory audit',la?'yes':'no',la?'Turnover > ₹40 lakh or contribution > ₹25 lakh':'Within ₹40 lakh turnover and ₹25 lakh contribution','LLP Rules 2009, rule 24',[]);
  }else if(c.type==='trust'){
    add('Entity law','Audit under trust / society law','check','Depends on the state Act and any tax exemption claimed','State trust / societies Act',[]);
  }
  const prof=c.biz==='profession',lim=prof?0.5:(c.cash5?10:1);
  const ta=t>lim;
  add('Income tax','Tax audit',ta?'yes':'no',(prof?'Professional receipts ':'Turnover ')+(ta?'above ':'within ')+(prof?'₹50 lakh':(c.cash5?'₹10 cr (cash within 5%)':'₹1 cr'))+(ta?'':'; check separately if presumptive income is declared below the scheme rate'),'Income-tax Act 2025 s.63 (s.44AB of the 1961 Act for FY 2025-26)',['stat']);
  if(c.intl)add('Income tax','Transfer pricing report','yes','Has international transactions with associated enterprises','Income-tax Act transfer pricing provisions',['gov','stat']);
  if(c.gst){
    add('GST','Monthly / quarterly GST returns','yes','GST-registered','CGST Act 2017',['stat','o2c','p2p']);
    add('GST','GSTR-9 annual return',t>2?'yes':'no',t>2?'Aggregate turnover > ₹2 cr':'Exempt up to ₹2 cr','Rule 80; Notification 15/2025-CT',['stat']);
    add('GST','GSTR-9C reconciliation',t>5?'yes':'no',t>5?'Aggregate turnover > ₹5 cr (self-certified)':'Not required up to ₹5 cr','Rule 80(3), CGST Rules',['stat']);
  }
  add('Labour','Provident fund (EPF)',emp>=20?'yes':'no',emp>=20?emp+' employees (20 or more)':'Fewer than 20 employees','Code on Social Security 2020 (in force 21 Nov 2025)',['payroll']);
  add('Labour','ESI',emp>=10?'yes':'no',emp>=10?emp+' employees (10 or more)':'Fewer than 10 employees','Code on Social Security 2020',['payroll']);
  const R={nbfcD:['yes','Deposit-taking NBFC / HFC','RBI (NBFCs – Internal Audit Function) Directions 2026',['rbia']],nbfcL:['yes','Non-deposit NBFC / HFC with assets ₹5,000 cr+','RBI (NBFCs – Internal Audit Function) Directions 2026',['rbia']],nbfcS:['no','Below ₹5,000 cr assets; keep a board-approved internal audit','RBI (NBFCs – Internal Audit Function) Directions 2026',['rbia']],bank:['yes','Commercial bank','RBI (Commercial Banks – Internal Audit Function) Directions 2026',['rbia']],sfb:['yes','Small finance bank','RBI (Small Finance Banks – Internal Audit Function) Directions 2026',['rbia']],broker:['yes','Half-yearly internal audit by an independent CA','SEBI circular MIRSD/DPSIII/Cir-26/08',['broker']],dp:['yes','Internal and concurrent audit of depository operations','NSDL / CDSL bye-laws',['broker']],insurer:['yes','Audit Committee oversees internal audit','IRDAI Corporate Governance Regulations 2024',['gov']]}[c.reg];
  if(R)add('Sector regulator',c.reg==='broker'||c.reg==='dp'?'Regulatory internal audit':c.reg==='insurer'?'Insurer governance':'Risk-based internal audit (RBIA)',R[0],R[1],R[2],R[3]);
  if(c.type==='listed')add('Sector regulator','SEBI LODR','yes','Listed entity: Audit Committee reviews internal audit, related party transactions','SEBI LODR Reg 18, Sch II Part C',['gov']);
  return out;
}
const rule13=c=>{const a=applicability(c).find(x=>x.name==='Internal audit');return a?{y:a.st==='yes',st:a.st,why:a.why}:{y:false,st:'no',why:'Not a company'}};
function suggestedRisks(c){
  const A=applicability(c).filter(x=>x.st!=='no'),cnt={};
  for(const a of A)for(const k of a.areas)cnt[k]=(cnt[k]||0)+1;
  for(const k of ['fin','p2p','o2c','cash','stat'])cnt[k]=cnt[k]||1;
  if(['private','opc','public','listed','sec8','llp'].includes(c.type))cnt.fa=cnt.fa||1;
  if(c.biz==='manufacturing')cnt.prod=cnt.prod||1;
  if(c.biz==='manufacturing'||c.biz==='trading')cnt.inv=(cnt.inv||0)+1;
  if(+c.employees>0)cnt.payroll=cnt.payroll||1;
  return Object.keys(TEMPLATES).filter(k=>cnt[k]).map(k=>({t:k,i:cnt[k]>=3?5:cnt[k]>=2?4:3,c:3}));
}
const level=s=>s>=15?'H':s>=8?'M':'L';
const freq=l=>({H:'Every quarter',M:'Every half-year',L:'Once a year'}[l]);

/* ---------- Audit roadmap: generated from the client master or uploaded ---------- */
/* the internal audit is monthly (owner, 23 Nov 2026): the plan's periods are the 12 months of the FY, Apr = 0 … Mar = 11 */
const QTR=['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'].map(m=>[m,'']);
const pLabel=(fy,q)=>QTR[q][0]+' '+(+String(fy).slice(0,4)+(q>=9?1:0));
const fyNow=()=>{const d=new Date(),y=d.getMonth()>=3?d.getFullYear():d.getFullYear()-1;return y+'-'+String((y+1)%100).padStart(2,'0')};
const qEnd=(fy,q)=>{const y=+String(fy).slice(0,4)+(q>=9?1:0),m=(q+3)%12+1,dd=new Date(y,m,0).getDate();return `${y}-${String(m).padStart(2,'0')}-${dd}`};
const curQ=fy=>{const t=today();for(let q=0;q<12;q++)if(t<=qEnd(fy,q))return q;return 12};
const GENERIC=[['Understand the process and walk through key controls','SIA 310'],['Test a sample of transactions against policy','SIA 320'],['Check compliance with applicable laws and regulations','SIA 150'],['Agree exceptions with the process owner','SIA 360']];
const AREA_NAME=k=>TEMPLATES[k]?.name||'Custom area';
const COMPLIANCE={'Tax audit':['stat','Tax audit readiness: books and audit-report data',[1]],'GSTR-9 annual return':['stat','GST annual return and GSTR-9C reconciliation review',[2]],'CARO 2020 reporting by statutory auditor':['fa','CARO readiness: asset and stock verification',[3]],'Internal financial controls reporting':['itgc','Internal financial controls: walkthroughs and testing',[2]],'Cost records':['inv','Cost records review',[3]],'CSR spending':['gov','CSR spend and unspent-amount review',[3]],'Secretarial audit':['gov','Secretarial compliance check',[1]],'Risk-based internal audit (RBIA)':['rbia','Annual RBIA risk assessment and plan approval',[0]],'Regulatory internal audit':['broker','Half-yearly regulatory internal audit',[1,3]],'Provident fund (EPF)':['payroll','EPF and ESI compliance review',[1]],'Audit trail in accounting software':['itgc','Audit trail (edit log) check',[0]],'Transfer pricing report':['gov','Related party and transfer pricing review',[2]]};
/* the span of a roadmap: the FY quarter or half-year that contains this month, or the rest of the year (owner, 23 Nov 2026) */
function spanEnd(fy,span){const cq=Math.min(curQ(fy),11);return span==='quarter'?Math.floor(cq/3)*3+2:span==='half'?(cq<6?5:11):11}
const SPANS={quarter:'Quarter',half:'Half-year',year:'Year'};
function genRoadmap(c,span='year'){
  const fy=fyNow(),items=[],seen=new Set(),push=o=>{const k=o.title+'|'+o.q;if(seen.has(k))return;seen.add(k);items.push({id:nid(),source:'auto',done:false,auditId:'',...o})};
  /* Yearly plan, split by month, most important first (owner, 23 Nov 2026; SIA 220: one plan for the year, highest risks first).
     First month: planning, opening balances, a statutory dues health-check and catch-up, then the highest-risk area.
     Every month: vouching and GST & TDS (mandatory), cash & bank, statutory due dates. Focus areas by risk score: high
     first and again each quarter, medium twice, low once; at most two a month. Calendar work in its month (half-year, year-end). */
  const cq=Math.min(curQ(fy),11),end=spanEnd(fy,span),P=(typeof planFor==='function'?planFor(c):[]).filter(x=>x.on),has=t=>P.some(x=>x.t===t),A=applicability(c).filter(x=>x.st!=='no').map(x=>x.name);
  const add=(q,o)=>{if(q>=cq&&q<=end)push({q,...o})},name=t=>AREA_NAME(t)+' · '+QTR[0][0];
  add(cq,{area:'custom',custom:'Planning',title:'Engagement planning: scope, team and timelines agreed; business and processes understood',prio:0,kind:'Foremost',why:'SIA 220 / SIA 310: plan before fieldwork'});
  add(cq,{area:'custom',custom:'Planning',title:'Risk assessment and this year\'s audit plan approved by management',prio:0,kind:'Foremost',why:'Risk register drives the order of work'});
  add(cq,{area:'fin',title:'Opening balances agreed with last year\'s audited accounts; last year\'s open observations followed up',prio:0,kind:'Foremost',why:'Start from a clean base'});
  if(has('stat'))add(cq,{area:'stat',title:'Statutory dues health-check: GST, TDS, PF / ESI and filings pending or late',prio:0,kind:'Foremost',why:'Interest and penalties grow every month'});
  if(cq>0)add(cq,{area:'vouch',title:'Catch-up: vouching and GST reconciliations for Apr – '+QTR[cq-1][0],prio:1,kind:'Foremost',why:'Months before the engagement started'});
  for(let q=cq;q<=end;q++){
    add(q,{area:'vouch',title:AREA_NAME('vouch')+' · '+QTR[q][0],prio:1,kind:'Every month',why:'Mandatory every month'});
    add(q,{area:'gsttds',title:AREA_NAME('gsttds')+' · '+QTR[q][0],prio:1,kind:'Every month',why:'Mandatory every month'});
    if(has('cash'))add(q,{area:'cash',title:'Cash & bank: BRS and cash count · '+QTR[q][0],prio:2,kind:'Every month',why:'Monthly BRS; surprise cash count'});
    if(has('stat'))add(q,{area:'stat',title:'Statutory due dates · '+QTR[q][0],prio:2,kind:'Every month',why:'Returns and payments of the month'})}
  /* focus areas by risk score */
  const ORD=['stat','p2p','o2c','payroll','inv','fa','fin','itgc','gov','prod','rbia','broker'];
  const F=P.filter(x=>!['vouch','gsttds','cash'].includes(x.t)).map(x=>({t:x.t,s:x.r?x.r.i*x.r.c:9})).sort((a,b)=>b.s-a.s||ORD.indexOf(a.t)-ORD.indexOf(b.t));
  /* how many reviews fit in the months left: high risk every quarter, medium every half-year, low once */
  const left=end-cq+1,load={},slots=[];for(const f of F){const l=level(f.s),n=Math.max(1,Math.min(l==='H'?4:l==='M'?2:1,Math.ceil(left/(l==='H'?3:6)))),gap=Math.max(1,Math.floor(left/n));for(let k=0;k<n;k++)slots.push({...f,l,k,want:cq+k*gap})}
  slots.sort((a,b)=>a.k-b.k||b.s-a.s);
  for(const x of slots){let q=Math.max(cq,x.want);while(q<=end&&(load[q]||0)>=2)q++;
    if(q>end){if(x.k)continue;q=cq;for(let j=cq;j<=end;j++)if((load[j]||0)<(load[q]||0))q=j}load[q]=(load[q]||0)+1;
    add(q,{area:x.t,title:AREA_NAME(x.t)+' · '+QTR[q][0]+(x.k?' (follow-up '+x.k+')':''),prio:3+(x.l==='H'?0:x.l==='M'?1:2),kind:x.l==='H'?'High risk':x.l==='M'?'Medium risk':'Low risk',why:`Focus area, risk score ${x.s}`+(x.k?'; follow-up review':'')})}
  /* calendar work */
  if(A.includes('Tax audit'))add(5,{area:'stat',title:'Tax audit readiness: books and audit-report data for last year',prio:2,kind:'Calendar',why:'Tax audit report due around September'});
  if(has('o2c')||has('p2p'))add(5,{area:has('o2c')?'o2c':'p2p',title:'Half-year balance confirmations: debtors and creditors',prio:2,kind:'Calendar',why:'Half-year close'});
  if(has('inv'))add(5,{area:'inv',title:'Half-year physical stock verification (test counts)',prio:2,kind:'Calendar',why:'Half-year close'});
  if(A.some(n=>/GSTR-9/.test(n))||isGstin(c.gstin))add(8,{area:'gsttds',title:'GST annual return review: GSTR-9 / 9C for last year',prio:2,kind:'Calendar',why:'Due by 31 December'});
  if(['private','opc','public','listed','sec8'].includes(c.type))add(6,{area:'stat',title:'Company law filings: AOC-4 and MGT-7 after the AGM',prio:2,kind:'Calendar',why:'Due within 30 / 60 days of the AGM'});
  add(11,{area:has('inv')?'inv':'fin',title:'Year-end: physical verification of stock and fixed assets, cash count on 31 March, cut-off and provisions',prio:1,kind:'Year-end',why:'Year-end close; CARO 3(i) and 3(ii)'});
  if(has('o2c')||has('p2p'))add(11,{area:has('o2c')?'o2c':'p2p',title:'Year-end balance confirmations: debtors, creditors, banks, loans',prio:1,kind:'Year-end',why:'Balances as on 31 March'});
  for(const a of A){const m=COMPLIANCE[a];if(m&&!/Tax audit|GSTR-9/.test(a))add(Math.min(end,Math.max(cq,m[2][0]*3+2)),{area:m[0],title:m[1],prio:2,kind:'Calendar',why:'Required: '+a,req:a})}
  items.sort((a,b)=>a.q-b.q||(a.prio??5)-(b.prio??5));
  return{fy,unit:'month',span,from:cq,to:end,items,generatedAt:today()};
}
function rmStatus(it,fy){
  const a=it.auditId&&S.audits.find(x=>x.id===it.auditId);
  if(it.done||(a&&['Reported','Closed'].includes(a.stage)))return'done';
  if(a&&a.stage!=='Planned')return'progress';
  return qEnd(fy,it.q)<today()?'late':'planned';
}
const RMS={done:['g','Done'],progress:['b','In progress'],late:['r','Overdue'],planned:['n','Planned']};
function uncovered(c){
  const R=c.roadmap?.items||[],areas=new Set(R.map(i=>i.area));
  return applicability(c).filter(a=>a.st!=='no'&&a.areas.length&&!a.areas.some(k=>areas.has(k)));
}
function areaFromText(s){
  s=String(s||'').toLowerCase();
  const M=[['p2p',/purchase|procure|vendor|supplier|p2p|payable/],['o2c',/sales|revenue|receivable|debtor|customer|o2c|billing|credit limit/],['rbia',/loan|credit appraisal|npa|rbia|kyc|lending|disburs|advances to customers/],['broker',/broker|depositor|\bdp\b|margin|demat/],['payroll',/payroll|salary|wage|hr\b|employee/],['fa',/fixed asset|capex|ppe|asset/],['inv',/inventory|stock|stores|warehouse|cost record/],['cash',/cash|bank|treasury|fund/],['itgc',/\bit\b|system|access|erp|itgc|cyber|software|audit trail/],['gov',/governance|board|related part|csr|secretarial|compliance with companies act/],['stat',/gst|tds|tax|statutory|compliance|pf\b|esi|labour|roc/]];
  for(const [k,re] of M)if(re.test(s))return k;return 'custom';
}
function qFromText(s){
  s=String(s||'').trim().toLowerCase();let m;
  if(m=s.match(/q\s*([1-4])/))return (+m[1]-1)*3;
  if(/h1|first half/.test(s))return 5;if(/h2|second half|annual|year/.test(s))return 11;
  const mon='janfebmaraprmayjunjulaugsepoctnovdec';
  for(let i=0;i<12;i++)if(s.includes(mon.slice(i*3,i*3+3)))return (i+9)%12;
  const d=toDate(s);if(d&&!isNaN(d))return (d.getMonth()+9)%12;
  return null;
}
/* a statement, ledger or register as PDF, read as rows (pdfrows.js). A password-protected PDF asks for its password once; the
   password opens this file only and is not kept anywhere */
const PDF_WORKER='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
async function readPdfRows(f,opt){
  await needLib('pdfjsLib');pdfjsLib.GlobalWorkerOptions.workerSrc=PDF_WORKER;const data=new Uint8Array(await f.arrayBuffer());let doc=null,pw;
  for(let tries=0;;tries++){try{doc=await pdfjsLib.getDocument({data:data.slice(),password:pw}).promise;break}
    catch(e){if(e&&e.name==='PasswordException'&&tries<3){pw=prompt((tries?'That password did not open it. ':'')+f.name+' is locked with a password. Banks often use the customer ID or date of birth; Form 26AS uses the date of birth as DDMMYYYY. Type it to read the file (it is not kept):');if(pw==null)throw new Error(f.name+' needs its password to be read.');continue}
      throw new Error('Could not read '+f.name+' as a PDF: '+(e&&e.message||e))}}
  toast('Reading '+doc.numPages+' page'+(doc.numPages===1?'':'s')+' of '+f.name+'…');
  const pages=await PDFROWS.pagesOf(doc);try{doc.destroy()}catch(e){}
  if(!pages.some(p=>p.length))throw new Error(f.name+' is a scanned PDF (pictures of the pages), so it has no text to read. Ask for the statement downloaded from net banking as PDF, Excel or CSV.');
  return PDFROWS.rowsOf(pages,opt).filter(r=>r.some(v=>String(v).trim()))}
async function readSheet(f){
  if(/\.pdf$/i.test(f.name))return readPdfRows(f);
  if(/\.xlsx?$/i.test(f.name)){
    await needLib('XLSX');
    const wb=XLSX.read(await f.arrayBuffer(),{type:'array',cellDates:true});
    return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:false,defval:''}).filter(r=>r.some(v=>String(v).trim()));
  }
  return parseCSV(await f.text());
}
function parseRoadmap(rows){
  const head=rows[0].map(h=>String(h).toLowerCase().trim()),col=(...k)=>head.findIndex(h=>k.some(x=>h.includes(x)));
  const ci={area:col('area','process','function','department'),title:col('activity','title','task','audit','scope','description'),when:col('quarter','period','month','due','timeline','when','date'),owner:col('owner','responsib','auditor'),checks:col('check','procedure','test')};
  if(ci.area<0&&ci.title<0)throw new Error('The first row needs an "Area" or "Activity" column.');
  const cq=curQ(fyNow());
  return rows.slice(1).map(r=>{const title=String(r[ci.title>=0?ci.title:ci.area]||'').trim(),areaTxt=ci.area>=0?r[ci.area]:title;if(!title)return null;
    const area=areaFromText(areaTxt+' '+title),q=ci.when>=0?qFromText(r[ci.when]):null;
    return{id:nid(),source:'upload',done:false,auditId:'',area,custom:area==='custom'?String(areaTxt||title).trim():'',title,q:q??Math.min(cq,11),why:'From uploaded roadmap'+(ci.owner>=0&&r[ci.owner]?' · owner '+r[ci.owner]:''),checks:ci.checks>=0&&r[ci.checks]?String(r[ci.checks]).split(/;|\n/).map(x=>x.trim()).filter(Boolean):[]}}).filter(Boolean);
}
async function saveRoadmap(c,R){await put('clients',c.id,{...c,roadmap:R})}

/* ---------- CSV data tests ---------- */
function parseCSV(txt){
  const rows=[];let r=[],f='',q=false;
  for(let i=0;i<txt.length;i++){const ch=txt[i];
    if(q){if(ch==='"'){if(txt[i+1]==='"'){f+='"';i++}else q=false}else f+=ch}
    else if(ch==='"')q=true;else if(ch===','){r.push(f);f=''}else if(ch==='\n'){r.push(f);rows.push(r);r=[];f=''}else if(ch!=='\r')f+=ch}
  if(f||r.length){r.push(f);rows.push(r)}
  return rows.filter(x=>x.some(v=>v.trim()));
}
function toDate(s){s=String(s||'').trim();let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return new Date(+m[1],m[2]-1,+m[3]);m=s.match(/^(\d{1,2})[\/.\-](\d{1,2}|[A-Za-z]{3})[\/.\-](\d{2,4})/);if(!m)return null;const mon=isNaN(m[2])?'janfebmaraprmayjunjulaugsepoctnovdec'.indexOf(m[2].toLowerCase())/3:m[2]-1;let y=+m[3];if(y<100)y+=2000;return new Date(y,mon,+m[1])}
function runTests(rows,file){
  const head=rows[0].map(h=>h.toLowerCase().trim());
  const col=(...k)=>head.findIndex(h=>k.some(x=>h.includes(x)));
  const ci={date:col('date'),vch:col('voucher','vch','ref','doc'),party:col('party','vendor','customer','name','particular'),ledger:col('ledger','account','gl'),amt:col('amount','debit','value'),mode:col('mode','payment','type')};
  if(ci.date<0||ci.amt<0)throw new Error('Need at least a date column and an amount column in the first row.');
  const D=rows.slice(1).map(r=>{const amt=Math.abs(parseFloat(String(r[ci.amt]||'').replace(/[₹,\s]/g,''))||0);return{date:r[ci.date]||'',d:toDate(r[ci.date]),vch:ci.vch>=0?r[ci.vch]:'',party:ci.party>=0?r[ci.party]:'',ledger:ci.ledger>=0?r[ci.ledger]:'',mode:ci.mode>=0?r[ci.mode]:'',amount:amt}}).filter(x=>x.amount>0);
  const seen={},dup=[];for(const x of D){const k=(x.party||'').toLowerCase()+'|'+x.amount+'|'+x.date;(seen[k]=seen[k]||[]).push(x)}for(const k in seen)if(seen[k].length>1)dup.push(...seen[k]);
  const round=D.filter(x=>x.amount>=10000&&x.amount%1000===0);
  const sun=D.filter(x=>x.d&&x.d.getDay()===0);
  const cash=D.filter(x=>/cash/i.test(x.mode+' '+x.ledger)&&x.amount>10000);
  const sorted=[...D].sort((a,b)=>b.amount-a.amount),cut=sorted[Math.floor(D.length*0.01)]?.amount||Infinity,big=D.length>=50?D.filter(x=>x.amount>=cut):[];
  const pack=(key,name,why,L)=>({key,name,why,total:L.length,hits:L.slice(0,40).map(x=>({date:x.date,party:x.party||x.ledger||x.vch,amount:x.amount}))});
  return{file,rows:D.length,at:today(),res:[pack('dup','Possible duplicate entries','Same party, amount and date appear more than once.',dup),pack('round','Round-sum amounts','Amounts of ₹10,000 or more in exact thousands; often estimates or unsupported entries.',round),pack('sun','Entries dated on a Sunday','Check for back-dated or unauthorised postings.',sun),pack('cash','Cash transactions above ₹10,000','Check against cash limits in policy and tax law.',cash),pack('big','Top 1% by value','Largest entries for detailed vouching (needs 50+ rows).',big)]};
}

/* ---------- libraries loaded on demand ---------- */
const LIBS={pdfjsLib:'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',XLSX:'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',JSZip:'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'};
function needLib(g){if(window[g])return Promise.resolve();return new Promise((ok,no)=>{const s=document.createElement('script');s.src=LIBS[g];s.onload=ok;s.onerror=()=>no(new Error(g==='pdfjsLib'?'Could not load the PDF reader (no internet?). Try again, or use the Excel / CSV of the statement.':g==='XLSX'?'Could not load the Excel reader; save the file as CSV and try again.':'Could not load the ZIP tool; download the report on its own instead.'));document.head.appendChild(s)})}

/* ---------- evidence: files attached to audits and checks ---------- */
const EVID_INLINE_MAX=150*1024;
const blobs={};
const fsize=n=>n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(1)+' MB';
const extOf=n=>(String(n).match(/\.([a-z0-9]+)$/i)||[,''])[1].toLowerCase();
async function sha256(buf){const h=await crypto.subtle.digest('SHA-256',buf);return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('')}
const toB64=buf=>{let s='';const u=new Uint8Array(buf);for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)};
async function sheetSummary(name,buf){
  const x=extOf(name);
  if(x==='csv'){const rows=parseCSV(new TextDecoder().decode(buf));return rows.length?[{name:'CSV',rows:Math.max(rows.length-1,0),cols:Math.max(...rows.map(r=>r.length)),header:rows[0].slice(0,12).map(String)}]:null}
  if(!['xlsx','xls','xlsm'].includes(x))return null;
  await needLib('XLSX');
  const wb=XLSX.read(buf,{type:'array'});
  return wb.SheetNames.slice(0,12).map(n=>{const r=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:''}).filter(a=>a.some(v=>String(v).trim()));return{name:n,rows:Math.max(r.length-1,0),cols:r.length?Math.max(...r.map(a=>a.length)):0,header:(r[0]||[]).slice(0,12).map(String)}});
}
async function addEvidence(file,o){
  const buf=await file.arrayBuffer(),id=nid(),hash=await sha256(buf);
  let summary=null;try{summary=await sheetSummary(file.name,buf)}catch(e){}
  const meta={clientId:o.clientId,auditId:o.auditId||'',item:o.item??null,purpose:o.purpose||'',name:file.name,type:file.type||extOf(file.name),size:file.size,sha256:hash,uploadedBy:me||'',uploadedAt:new Date().toISOString(),summary};
  if(mode==='supa'){
    const path=`${ws.id}/${o.auditId||'client-'+o.clientId}/${id}/${file.name.replace(/[^\w.\- ]+/g,'_')}`;
    const {error}=await sb.storage.from('evidence').upload(path,file,{upsert:false,contentType:file.type||'application/octet-stream'});
    if(error)throw new Error('Upload failed: '+error.message);meta.path=path;
  }else if(mode==='claude'){
    if(file.size>EVID_INLINE_MAX)throw new Error(file.name+' is '+fsize(file.size)+'. In the Claude version evidence files can be up to 150 KB; the hosted version takes up to 25 MB.');
    meta.data=toB64(buf);
  }else blobs[id]=file;
  await put('evidence',id,meta);return id;
}
async function evidenceBlob(e){
  if(e.data)return new Blob([Uint8Array.from(atob(e.data),c=>c.charCodeAt(0))],{type:e.type||'application/octet-stream'});
  if(blobs[e.id])return blobs[e.id];
  if(mode==='supa'&&e.path){const {data,error}=await sb.storage.from('evidence').download(e.path);if(error)throw new Error(error.message);return data}
  throw new Error('This file is not available in this session.');
}
async function removeEvidence(e){if(mode==='supa'&&e.path)await sb.storage.from('evidence').remove([e.path]);delete blobs[e.id];await del('evidence',e.id)}
const auditEvidence=a=>S.evidence.filter(e=>e.auditId===a.id).sort((x,y)=>(x.uploadedAt||'').localeCompare(y.uploadedAt||''));
const eref=(a,id)=>{const i=auditEvidence(a).findIndex(e=>e.id===id);return i<0?'':'E'+(i+1)};
