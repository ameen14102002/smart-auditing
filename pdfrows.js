/* Smart Auditing — PDF reader: a statement or register printed to PDF, read back as rows, like a sheet.
   Owner, 28 Nov 2026: bank statements (BRS), supplier / customer statements, ledgers, Form 26AS, challan lists, stock lists and
   asset registers often come only as PDF.
   The words of each page come with their position (from pdf.js). They are put into lines by height, and into cells by the gaps
   between them. The table's header line (Date, Narration, Withdrawal, Deposit, Balance ...) gives the columns: every cell below
   goes to the column it sits under (amounts by their right edge, text by its left edge). A narration that runs onto a second line
   is joined to its entry. The header repeated on each page is read once.
   Pure functions, no screen: the same file runs in the app and in tests. A scanned PDF (a picture) has no words to read. */
(function(root){
const DATE=/^(\d{1,2}[-/.](\d{1,2}|[a-z]{3,9})[-/.]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+[a-z]{3,9}\s+\d{2,4})\b/i;
const NUM=/^\(?-?(₹|rs\.?|inr)?\s*[\d,]+(\.\d{1,2})?\)?\s*(cr|dr)?\.?$/i;
const HEADWORD=/\b(date|debit|credit|withdrawals?|deposits?|balance|amount|particulars|narration|description|details|remarks?|cheque|chq|ref|value|vch|voucher|tan|deductor|tds|qty|quantity|rate|item|asset|bsr|challan|serial|section|invoice|bill|dr|cr)\b/i;
/* words into lines (top to bottom) and cells (left to right) */
function linesOf(items){
  const it=items.filter(x=>x&&String(x.s).trim()!=='').map(x=>({s:String(x.s),x:+x.x,y:+x.y,w:+x.w||0,h:+x.h||8})).sort((a,b)=>b.y-a.y||a.x-b.x);
  const L=[];for(const x of it){const tol=Math.max(2,x.h*.45);let l=L.find(l=>Math.abs(l.y-x.y)<=tol);if(!l){l={y:x.y,items:[]};L.push(l)}l.items.push(x)}
  L.sort((a,b)=>b.y-a.y);
  return L.map(l=>{const s=l.items.sort((a,b)=>a.x-b.x),cells=[];
    for(const x of s){const c=cells[cells.length-1],cw=x.s.length?x.w/x.s.length:4,gap=c?x.x-c.x1:99;
      const twoNums=c&&/\d[.,]\d{2}(\s*(cr|dr))?$/i.test(c.s)&&/^[(-]?[\d₹]/.test(x.s);   // two amounts side by side are two cells
      if(c&&!twoNums&&gap<Math.max(2.5,cw*1.1)){c.s+=(gap>cw*.25&&!/\s$/.test(c.s)?' ':'')+x.s;c.x1=Math.max(c.x1,x.x+x.w)}else cells.push({s:x.s,x0:x.x,x1:x.x+x.w})}
    for(const c of cells)c.s=c.s.replace(/\s+/g,' ').trim();
    return{y:l.y,cells:cells.filter(c=>c.s)}}).filter(l=>l.cells.length)}
const isNum=s=>NUM.test(String(s).trim())&&/\d/.test(s);
const lineText=l=>l.cells.map(c=>c.s).join(' ');
const isHead=l=>l.cells.length>=3&&l.cells.filter(c=>HEADWORD.test(c.s)&&!isNum(c.s)&&!DATE.test(c.s)).length>=Math.min(3,Math.ceil(l.cells.length*.5))&&!l.cells.some(c=>DATE.test(c.s));
/* pages: [[{s,x,y,w,h}]] → rows (the header first), ready for the same readers as a sheet */
function rowsOf(pages,opt={}){
  const lines=[];pages.forEach((items,pi)=>{for(const l of linesOf(items))lines.push({...l,page:pi})});
  if(!lines.length)return[];
  if(opt.mode==='lines')return lines.map(l=>l.cells.map(c=>c.s));
  const hi=lines.findIndex(isHead);
  if(hi<0)return lines.map(l=>l.cells.map(c=>c.s));
  /* a header written over two lines ("Withdrawal" over "Amount"): the second line joins the first when it is all header words */
  let H=lines[hi].cells.map(c=>({...c})),start=hi+1;const nx=lines[hi+1];
  if(nx&&nx.cells.every(c=>!isNum(c.s)&&!DATE.test(c.s))&&nx.cells.some(c=>HEADWORD.test(c.s))&&nx.cells.length<=H.length+2){
    for(const c of nx.cells){const h=H.find(h=>c.x1>h.x0-2&&c.x0<h.x1+2);if(h){h.s+=' '+c.s;h.x0=Math.min(h.x0,c.x0);h.x1=Math.max(h.x1,c.x1)}else H.push({...c})}H.sort((a,b)=>a.x0-b.x0);start++}
  const headKey=H.map(h=>h.s.toLowerCase().replace(/[^a-z]/g,'')).join('|'),n=H.length;
  const colOf=c=>{/* overlap first; else amounts by right edge, text by left edge */
    let best=-1,bo=0;H.forEach((h,i)=>{const o=Math.min(c.x1,h.x1)-Math.max(c.x0,h.x0);if(o>bo){bo=o;best=i}});if(best>=0)return best;
    const num=isNum(c.s);let bd=1e9;H.forEach((h,i)=>{const d=num?Math.abs(c.x1-h.x1):Math.abs(c.x0-h.x0);if(d<bd){bd=d;best=i}});return best};
  const dateCol=H.findIndex(h=>/date/i.test(h.s)),textCol=H.findIndex(h=>/narration|particular|description|details|remark/i.test(h.s));
  const out=[H.map(h=>h.s)];let last=null;
  for(const l of lines.slice(start)){
    if(isHead(l)&&l.cells.map(c=>c.s.toLowerCase().replace(/[^a-z]/g,'')).join('|').slice(0,20)===headKey.slice(0,20))continue;   // the header again on the next page
    const r=new Array(n).fill('');for(const c of l.cells){const i=colOf(c);r[i]=r[i]?r[i]+' '+c.s:c.s}
    const hasDate=dateCol>=0?DATE.test(r[dateCol]):l.cells.some(c=>DATE.test(c.s)),hasNum=l.cells.some(c=>isNum(c.s)&&!DATE.test(c.s));
    /* a line with no date and no amount continues the entry above (a narration on two lines) */
    if(!hasDate&&!hasNum&&last&&!/total|opening|closing|balance b\/f|carried|brought|page \d/i.test(lineText(l))){const i=textCol>=0?textCol:r.findIndex(Boolean);const t=l.cells.map(c=>c.s).join(' ');last[i>=0?i:0]=(last[i>=0?i:0]+' '+t).trim();continue}
    out.push(r);last=hasDate?r:null}
  return out}
/* pdf.js document → pages of words (browser and node alike) */
async function pagesOf(doc){const P=[];for(let i=1;i<=doc.numPages;i++){const pg=await doc.getPage(i),tc=await pg.getTextContent();
  P.push(tc.items.filter(x=>'str' in x).map(x=>({s:x.str,x:x.transform[4],y:x.transform[5],w:x.width,h:x.height||Math.abs(x.transform[3])||8})));pg.cleanup&&pg.cleanup()}return P}
const API={linesOf,rowsOf,pagesOf,isNum,DATE};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.PDFROWS=API})(typeof window!=='undefined'?window:globalThis);
