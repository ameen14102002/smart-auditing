/* Smart Auditing — GST matching done by 1Go's engine (gstengine.js), so both apps reconcile alike.
   Books: the supplier's bill number is Tally's Reference (the voucher number is kept to show); GSTR-1 / GSTR-2B from the portal or 1Go.
   GSTR-2B vs purchases uses 1Go's full reconciliation (checks, ITC statement A − B = D − E); GSTR-1 vs sales uses its matching passes. */
const E1=()=>window.GO_R2B;
const ymd8=d=>String(d||'').replace(/-/g,'').slice(0,8);
function toEng(x,side,k){const note=x.k!=='inv';
  return{kind:note?'note':'inv',gstin:String(x.g||'').toUpperCase(),no:side==='b'&&k==='r2'?(x.f||x.n||''):(x.n||''),ref:side==='b'?(x.f||''):'',vch:side==='b'?x.n:'',date:ymd8(x.d),party:x.p||'',
    tx:Math.abs(+x.tx||0),i:Math.abs(+x.i||0),c:Math.abs(+x.c||0),s:Math.abs(+x.s||0),x:Math.abs(+x.cs||0),rcm:!!x.rc,itcNo:x.a===false,_o:x}}
const ENG_ST={'Matched':'match','Partly matched':'diff','GSTIN differs':'gstin','No GSTIN in books':'nogstin','Not in books':'portal','Not in GSTR-2B':'books'};
matchInv=function(B,P,t,k,d){
  const E=E1();if(!E){matchInv.last=null;return _matchInvOld(B,P,t)}
  const Bm=B.map(x=>toEng(x,'b',k)),Pm=P.map(x=>toEng(x,'p',k));let res;
  if(k==='r2'){const c=S.clients.find(z=>z.id===d?.clientId)||{};res=E.recon(Bm,Pm,{tol:t,gstin:String(c.gstin||'').toUpperCase()})}
  else{for(const r of [...Bm,...Pm])r.m=null;res={inv:E.reconSection(Bm.filter(r=>r.kind==='inv'),Pm.filter(r=>r.kind==='inv'),t,false),note:E.reconSection(Bm.filter(r=>r.kind==='note'),Pm.filter(r=>r.kind==='note'),t,true),checks:[]}}
  const rows=[];
  for(const sec of [res.inv,res.note])for(const r of sec.rows){const b=r.b&&r.b._o||null,p=r.g&&r.g._o||null;if(!b&&!p)continue;
    let st=ENG_ST[r.status]||'diff';if(st==='match'&&b&&p&&(b.rp||'')!==(p.rp||''))st='period';rows.push({st,b,p,why:r.why||[]})}
  matchInv.last={checks:res.checks||[],S:{inv:res.inv.S,note:res.note.S},k};
  return rows};
/* the previous matcher stays only as a fallback if the engine did not load */
function _matchInvOld(B,P,t){const key=x=>x.g+'|'+normInv(x.n)+'|'+(x.k==='inv'?'i':'n'),pm=new Map(),rows=[],used=new Set();for(const p of P)pm.set(key(p),p);
  for(const b of B){const k=key(b),p=pm.get(k);if(p&&!used.has(k)){used.add(k);rows.push({st:Math.abs(b.tx-p.tx)>t||Math.abs(taxOf(b)-taxOf(p))>t?'diff':'match',b,p})}else rows.push({st:'books',b,p:null})}
  for(const p of P)if(!used.has(key(p)))rows.push({st:'portal',b:null,p});return rows}

/* the screen: reasons on each line, 1Go's checks, and the ITC statement */
const _rcInvListE=rcInvList;rcInvList=function(r,k){
  let h=_rcInvListE(r,k);if(!r.inv.length)return h;
  /* reasons under each line (same order as the list) */
  const f=ui.rcf||'open',L=r.inv.filter(x=>f==='all'?true:f==='open'?!['match','period'].includes(x.st):x.st===f).slice(0,300);let i=0;
  h=h.replace(/(<tr><td><span class="tag [^"]*">[^<]*<\/span><\/td>)/g,m=>{const x=L[i++];return x&&x.why&&x.why.length?m.replace('</span></td>',`</span><div class="small muted" style="max-width:340px;margin-top:4px">${esc(x.why.join('; '))}</div></td>`):m});
  const e=r.eng;if(!e)return h;
  const H4=[['i','IGST'],['c','CGST'],['s','SGST'],['x','Cess']],S=e.S.inv,N=e.S.note,lab=k==='r2'?['A GSTR-2B','B Books','C = A − B','D In GSTR-2B, not in books','E In books, not in GSTR-2B','F = D − E','G = C − F (closes to 0)']:['A GSTR-1','B Books','C = A − B','D In GSTR-1, not in books','E In books, not in GSTR-1','F = D − E','G = C − F (closes to 0)'];
  const stmt=(X,title)=>`<div class="panel"><h3>${title}</h3><div class="scroll"><table><thead><tr><th></th>${H4.map(([,l])=>`<th class="num">${l}</th>`).join('')}</tr></thead><tbody>${['A','B','C','D','E','F','G'].map((q,j)=>`<tr${q==='G'?' style="font-weight:600"':''}><td>${lab[j]}</td>${H4.map(([h])=>`<td class="num">${inr(X[q][h])}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  const ck=e.checks.length?`<div class="panel" style="margin-top:14px"><h3>What to do (${e.checks.length})</h3>${e.checks.slice(0,40).map(c=>`<div class="row" style="gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid var(--line)"><span class="tag ${c.lv==='act'?'H':'y'}">${c.lv==='act'?'Act':'Look'}</span><div class="sp"><b>${esc(c.t)}</b><div class="small muted">${esc(c.d)}</div></div></div>`).join('')}${e.checks.length>40?`<p class="small muted">And ${e.checks.length-40} more in the Excel.</p>`:''}</div>`:'';
  return `<div class="grid2 even" style="margin-top:14px">${stmt(S,'Tax statement: invoices')}${stmt(N,'Tax statement: credit and debit notes')}</div>`+ck+h};

/* Excel of the reconciliation: every line with its reason, the statement and the checks (1Go's layout) */
function rcSheets(c,k){const d=rcOpen(c),r=recon(d,k);if(!r||r.state==='none')return[];const src=k==='r1'?'GSTR-1':'GSTR-2B',H4=['i','c','s','x'];
  const L=[['Status','Reason','Month','GSTIN (books)','GSTIN ('+src+')','Party','Books voucher no.','Books bill no.','Books date',src+' bill no.',src+' date','Books taxable','Books IGST','Books CGST','Books SGST','Books tax',src+' taxable',src+' IGST',src+' CGST',src+' SGST',src+' tax','Tax difference (books − '+src+')']];
  for(const x of r.inv){const b=x.b,p=x.p;L.push([RST[x.st][1],(x.why||[]).join('; '),mLabel(x.m),b?.g||'',p?.g||'',b?.p||p?.p||'',b?.n||'',b?.f||'',b?.d||'',p?.n||'',p?.d||'',b?b.tx:'',b?b.i:'',b?b.c:'',b?b.s:'',b?taxOf(b):'',p?p.tx:'',p?p.i:'',p?p.c:'',p?p.s:'',p?taxOf(p):'',R2((b?taxOf(b):0)-(p?taxOf(p):0))])}
  const M=[['Month',RHEAD[k][0]+' taxable',RHEAD[k][0]+' tax',RHEAD[k][1]+' taxable',RHEAD[k][1]+' tax','Difference taxable','Difference tax']];for(const x of r.months)M.push([mLabel(x.m),x.a?.tx??'',x.a?taxOf(x.a):'',x.b?.tx??'',x.b?taxOf(x.b):'',x.dtx??'',x.dtax??'']);
  const out=[[RCSHORT[k]+' by month',M],[RCSHORT[k]+' bill by bill',L]];
  if(r.eng){const st=[['Statement','IGST','CGST','SGST','Cess']];for(const [nm,X] of [['Invoices',r.eng.S.inv],['Credit / debit notes',r.eng.S.note]]){st.push([nm]);for(const q of ['A','B','C','D','E','F','G'])st.push([q,...H4.map(h=>X[q][h])])}
    out.push([RCSHORT[k]+' statement',st],[RCSHORT[k]+' what to do',[['Level','Check','Detail'],...r.eng.checks.map(c2=>[c2.lv==='act'?'Act':'Look',c2.t,c2.d])]])}
  return out}
const _procSheetsG=procSheets;procSheets=function(a,c,k){if(k==='gst')return[...rcSheets(c,'r1'),...rcSheets(c,'r2'),..._procSheetsG(a,c,k).filter(s=>!/bill by bill|Invoice by invoice/i.test(s[0]))];return _procSheetsG(a,c,k)};
