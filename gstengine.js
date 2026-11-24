/* Smart Auditing — the GST matching engine of 1Go (app/recon2b.js, 1.67.x), copied unchanged so both apps reconcile alike.
   Owner, 24 Nov 2026: "make the app better in the reconciliation like 1go does". Only the engine is here (no 1Go screens).
   When 1Go's engine changes, copy lines 1 to the "window.GO_R2B" line again. reconSection is exported too, for GSTR-1 vs sales. */
/* 1Go 1.61.0: GSTR-2B reconciliation, its own work: a permanent purchase template against the GSTR-2B from the portal.
 * Owner, 19 Nov 2026: "set a permanent excel template like the GSTR-1 template, using the CompuGST format, but the accuracy of the
 * reconciliation should be perfect". The lessons of the LMG Fashion October check are built in:
 *  - a bill with no GSTIN in the books is still matched (by party name and bill), and the GSTIN to add is named;
 *  - a bill under another GSTIN (typo, other branch, other proprietor) is matched by bill number and amount, and named;
 *  - bill numbers are compared by their core ("LSTI26/402503" = "DLSTI26/402503", "1030 A" = "1030", FY suffixes dropped);
 *  - debit notes (yours) are matched to the suppliers' credit notes by GSTIN and amount, never by number;
 *  - taxable value is the value before tax; deferred-ITC columns count as books ITC;
 *  - the ITC statement A (GSTR-2B) - B (books) = D (in 2B, not in books) - E (in books, not in 2B) always closes to 0, because
 *    every rupee of difference, line by line, sits in D or E;
 *  - previous-year bills in this GSTR-2B (last date: 30 November), reverse charge, ITC not available, odd rates, IGST/CGST for
 *    the wrong state and duplicate bills are listed as checks.
 * Nothing is reconciled until the person clicks Reconcile (standing rule: GSTR-2B is never reconciled on its own).
 */
(function () {
  'use strict';
  const R2 = v => Math.round((+v || 0) * 100) / 100;
  const inr = v => "₹" + R2(v).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  const H = ['i', 'c', 's', 'x'];
  const nn = s => String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9]/g, '');
  /* the core of a bill number: its last group of digits, with financial-year parts ("26-27", "2026-27", "/2026") dropped */
  function core(n) {
    const t = String(n || '').toUpperCase(), G = []; const re = /\d+/g; let m; while ((m = re.exec(t))) G.push({ v: m[0], a: m.index, z: m.index + m[0].length });
    if (!G.length) return '';
    const yy = v => v.length === 4 && /^20/.test(v) ? +v.slice(2) : v.length === 2 ? +v : -1, drop = new Set();
    for (let i = 0; i + 1 < G.length; i++) { const a = G[i], b = G[i + 1], sep = t.slice(a.z, b.a); if (!/^\s*[-\/]\s*$/.test(sep)) continue; const y1 = yy(a.v), y2 = yy(b.v); if (y1 >= 0 && y2 >= 0 && y2 === (y1 + 1) % 100 && !(a.v.length === 2 && i > 0 && !drop.has(i - 1) && G.length === 2)) { drop.add(i); drop.add(i + 1); i++; } }
    let L = G.filter((g, i) => !drop.has(i)); if (L.length > 1 && /^20\d{2}$/.test(L[L.length - 1].v)) L = L.slice(0, -1); if (!L.length) L = G;
    return L[L.length - 1].v.replace(/^0+(?=\d)/, '');
  }
  const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
  const okG = g => GSTIN_RE.test(g || '');
  const panOf = g => okG(g) ? g.slice(2, 12) : '';
  const lev = (a, b) => { if (a === b) return 0; if (Math.abs(a.length - b.length) > 2) return 9; const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
  const STOP = /\b(M\/?S|MESSRS|PVT|PRIVATE|LTD|LIMITED|LLP|AND|THE|CO|COMPANY|AGENC(Y|IES)|ENTERPRISES?|TRADERS?|TRADING|INDUSTRIES|INDIA|IMPEX|EXPORTS?|INTERNATIONAL)\b/g;
  /* 1.65.3 (owner's file, KINGS Oct 2026): "K.M.Enterprise" (initials), "Johnson Lift @ AMC @ BP" (a Tally ledger with "@ place" after the
     name) and "RAMDEV DUPATTA" against the portal's "RAMDEV DUPTTA" are the same suppliers: initials are kept together ("KM"), the part
     after "@" is the ledger's own label, and a word one letter off (LIFT / LIFTS, DUPATTA / DUPTTA) is the same word */
  const toks = s => { const w = String(s || '').toUpperCase().split('@')[0].replace(/&/g, ' ').replace(/[^A-Z0-9 ]/g, ' ').replace(STOP, ' ').split(/\s+/).filter(Boolean), o = [];
    for (const x of w) { if (x.length === 1 && o.length && /^\x01/.test(o[o.length - 1])) o[o.length - 1] += x; else o.push(x.length === 1 ? '\x01' + x : x); }
    return o.map(x => x.replace(/^\x01/, '')).filter(x => x.length > 1); };
  const sameWord = (a, b) => a === b || (Math.min(a.length, b.length) >= 4 && Math.abs(a.length - b.length) === 1 && (a.startsWith(b) || b.startsWith(a))) || (a.length >= 5 && b.length >= 5 && lev(a, b) <= 1);
  const sameName = (a, b) => { const A = toks(a), B = toks(b); if (!A.length || !B.length) return false; const ka = A.join(''), kb = B.join(''); if (ka === kb || (ka.length >= 5 && kb.includes(ka)) || (kb.length >= 5 && ka.includes(kb)) || (ka.length >= 6 && lev(ka, kb) <= 1)) return true; const hit = A.filter(w => B.some(v => sameWord(w, v))).length; return hit / Math.max(A.length, B.length) >= 0.6; };
  const tax = r => r.i + r.c + r.s + r.x;
  const days = (a, b) => { if (!a || !b) return 9999; const d = s => Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8)); return Math.abs(d(a) - d(b)) / 864e5; };
  const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fdate = s => s ? s.slice(6, 8) + '-' + s.slice(4, 6) + '-' + s.slice(0, 4) : '';
  const STD = [0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 12, 18, 28, 40];

  /* ---------- the matching ---------- */
  const STOPW = new Set(['SRI', 'SHRI', 'SREE', 'THE', 'M/S', 'MS', 'NEW', 'NEW', 'INDIA', 'INDIAN', 'M', 'S', 'AND', 'OF', 'A', 'MESSRS', 'MR', 'MRS']);
  function firstWord(n) { const w = String(n || '').toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').split(/\s+/).filter(x => x && !STOPW.has(x)); return w[0] && w[0].length >= 3 ? w[0] : ''; }
  function close(b, g, tol) { return Math.abs(g.tx - b.tx) <= tol && Math.abs(tax(g) - tax(b)) <= tol; }
  /* 1.61.0 (owner: "large volumes, more than 2000 entries, the same reconciliation perfectly"): candidates come from indexes
     (by GSTIN, by bill number, by number core, by date + amount, by name), so 10,000 bills take a moment, not minutes */
  function index(Gs) {
    const I = { gstin: new Map(), nn: new Map(), core: new Map(), day: new Map(), amt: new Map(), pan: new Map(), all: Gs }, put = (m, k, g) => { if (!k) return; const a = m.get(k); if (a) a.push(g); else m.set(k, [g]); };
    for (const g of Gs) { put(I.gstin, g.gstin, g); put(I.nn, nn(g.no), g); put(I.core, core(g.no), g); put(I.day, g.date + '|' + Math.round(g.tx), g); put(I.amt, Math.round(g.tx), g); put(I.pan, panOf(g.gstin), g); }
    return I;
  }
  function pairsOf(Bs, Gs, ok, score, cand) {   // every possible pair for one pass, best first, one-to-one
    const C = [];
    for (const b of Bs) if (!b.m) for (const g of cand(b)) if (!g.m && ok(b, g)) C.push([score(b, g), b, g]);
    C.sort((x, y) => x[0] - y[0]); const out = [];
    for (const [, b, g] of C) if (!b.m && !g.m) { b.m = g; g.m = b; out.push([b, g]); }
    return out;
  }
  function reconSection(Bs, Gs, tol, notes) {
    const sc = (b, g) => Math.abs(g.tx - b.tx) + Math.abs(tax(g) - tax(b)) + days(b.date, g.date) / 1000;
    const P = [], I = index(Gs), uniq = a => [...new Set(a)];
    const byG = b => I.gstin.get(b.gstin) || [];
    const byNo = b => uniq([...(I.nn.get(nn(b.no)) || []), ...(I.core.get(core(b.no)) || []), ...(I.nn.get(nn(b.ref)) || []), ...(I.core.get(core(b.ref)) || [])]);
    const byAmt = b => { const o = []; for (let d = -1; d <= 1; d++) o.push(...(I.day.get(b.date + '|' + (Math.round(b.tx) + d)) || [])); return o; };
    const byAmtAny = b => { const o = []; for (let d = -1; d <= 1; d++) o.push(...(I.amt.get(Math.round(b.tx) + d) || [])); return o; };
    /* a GSTIN typo: the same PAN, or the same state and a GSTIN one or two characters apart (looked up only for the few bills left) */
    const near = b => okG(b.gstin) ? [...(I.pan.get(panOf(b.gstin)) || []), ...[...I.gstin.keys()].filter(k => k !== b.gstin && k.slice(0, 2) === b.gstin.slice(0, 2) && lev(k, b.gstin) <= 2).flatMap(k => I.gstin.get(k))] : [];
    const loose = b => uniq([...byNo(b), ...(notes ? byAmtAny(b) : byAmt(b)), ...near(b)]);
    let cand = byG;
    const pass = (how, ok) => { for (const [b, g] of pairsOf(Bs, Gs, ok, sc, cand)) P.push({ b, g, how }); };
    if (!notes) {
      pass('number', (b, g) => b.gstin === g.gstin && okG(b.gstin) && nn(b.no) && nn(b.no) === nn(g.no));
      pass('core', (b, g) => b.gstin === g.gstin && okG(b.gstin) && core(b.no) && core(b.no) === core(g.no) && (close(b, g, tol) || days(b.date, g.date) <= 31));
      /* owner's rule: under a different number, the same bill only when the date AND the amount both match (rent of ₹23,600 repeats every month) */
      pass('amount', (b, g) => b.gstin === g.gstin && okG(b.gstin) && close(b, g, tol) && b.date && b.date === g.date);
    } else {
      /* your debit note against the supplier's credit note: GSTIN and amount (numbers never agree); the reference you typed helps first */
      pass('reference', (b, g) => b.gstin === g.gstin && okG(b.gstin) && nn(b.ref) && (nn(b.ref) === nn(g.no) || core(b.ref) === core(g.no)) && close(b, g, Math.max(tol, 1)));
      pass('amount', (b, g) => b.gstin === g.gstin && okG(b.gstin) && close(b, g, tol));
      pass('tax', (b, g) => b.gstin === g.gstin && okG(b.gstin) && Math.abs(tax(g) - tax(b)) <= tol && tax(b) > 0);
    }
    /* the GSTIN in the books is missing or wrong: wider candidates */
    cand = loose;
    pass('noGstin', (b, g) => !okG(b.gstin) && nn(b.no) && nn(b.no) === nn(g.no) && b.date && b.date === g.date && close(b, g, tol));   // 1.65.3: same number, date and amount: the same bill, whatever the ledger is called
    pass('noGstin', (b, g) => !okG(b.gstin) && sameName(b.party, g.party) && ((nn(b.no) && (nn(b.no) === nn(g.no) || core(b.no) === core(g.no))) || (close(b, g, tol) && (notes || (b.date && b.date === g.date)))));
    /* 1.67.1: no GSTIN in the books and names written differently ("MRF Tyres" / "MRF LIMITED", "SPECRTROTEKS"): the first real word of
       the name and the date AND the tax all agree */
    pass('noGstin', (b, g) => !okG(b.gstin) && firstWord(b.party) && firstWord(b.party) === firstWord(g.party) && b.date && b.date === g.date && Math.abs(tax(g) - tax(b)) <= tol && tax(b) > 0);
    pass('gstinTypo', (b, g) => okG(b.gstin) && b.gstin !== g.gstin && (lev(b.gstin, g.gstin) <= 2 || panOf(b.gstin) === panOf(g.gstin)) && ((nn(b.no) && core(b.no) && core(b.no) === core(g.no)) || (close(b, g, tol) && (notes || (b.date && b.date === g.date)))));
    if (!notes) pass('otherGstin', (b, g) => okG(b.gstin) && b.gstin !== g.gstin && nn(b.no).length >= 3 && (nn(b.no) === nn(g.no) || (core(b.no).length >= 3 && core(b.no) === core(g.no))) && close(b, g, tol));
    else pass('otherGstin', (b, g) => b.gstin !== g.gstin && sameName(b.party, g.party) && close(b, g, tol));
    const rows = [];
    for (const p of P) {
      const { b, g } = p, d = { tx: R2(g.tx - b.tx) }; for (const h of H) d[h] = R2(g[h] - b[h]);
      const why = [];
      if (p.how === 'noGstin') why.push('no GSTIN in the books: add ' + g.gstin + ' to ' + (b.party || 'the supplier'));
      if (p.how === 'gstinTypo' || p.how === 'otherGstin') why.push('GSTIN differs: books ' + (b.gstin || '-') + ', GSTR-2B ' + g.gstin);
      if (!notes && nn(b.no) !== nn(g.no)) why.push(!b.no ? 'no bill no. in the books: the supplier\'s is ' + g.no : /^\d{1,5}$/.test(b.no) && !/^\d{1,5}$/.test(g.no) ? 'the books have the voucher no. ' + b.no + '; the supplier\'s bill no. is ' + g.no + ' (type it in the entry\'s reference)' : core(b.no) && core(b.no) === core(g.no) ? 'bill no. written differently: books ' + b.no + ', GSTR-2B ' + g.no : 'bill no. differs: books ' + b.no + ', GSTR-2B ' + g.no);
      if (!notes && b.date && g.date && b.date !== g.date) why.push('date differs: books ' + fdate(b.date) + ', GSTR-2B ' + fdate(g.date));
      if (Math.abs(d.tx) > tol) why.push('taxable value differs by ₹' + d.tx.toLocaleString('en-IN', { minimumFractionDigits: 2 }));
      for (const h of H) if (Math.abs(d[h]) > tol) why.push({ i: 'IGST', c: 'CGST', s: 'SGST', x: 'Cess' }[h] + ' differs by ₹' + d[h].toLocaleString('en-IN', { minimumFractionDigits: 2 }) + (d[h] < 0 ? ' (more in the books: excess ITC)' : ' (less in the books)'));
      const amtOk = Math.abs(d.tx) <= tol && H.every(h => Math.abs(d[h]) <= tol);
      /* 1.67.1: the same amount under the same number, or on the same date (the owner's rule), is the same bill: Matched. A voucher number
         in the books instead of the supplier's number is a remark, not a difference */
      const sameNo = nn(b.no) === nn(g.no) || (core(b.no).length >= 2 && core(b.no) === core(g.no)) || (nn(b.ref) && (nn(b.ref) === nn(g.no) || core(b.ref) === core(g.no)));
      const status = p.how === 'noGstin' ? 'No GSTIN in books' : (p.how === 'gstinTypo' || p.how === 'otherGstin') ? 'GSTIN differs' : amtOk && (notes || sameNo || (b.date && b.date === g.date)) ? 'Matched' : 'Partly matched';
      rows.push({ status, b, g, d, why, how: p.how });
    }
    for (const b of Bs) if (!b.m) rows.push({ status: 'Not in GSTR-2B', b, g: null, d: null, why: [] });
    for (const g of Gs) if (!g.m) rows.push({ status: 'Not in books', b: null, g, d: null, why: [] });
    /* the statement: every rupee of difference sits in D or E, line by line */
    const Z = () => ({ i: 0, c: 0, s: 0, x: 0 }), A = Z(), B = Z(), D = Z(), E = Z(), Dl = [], El = [], RD = Z(), RE = Z(); let RN = 0;
    for (const g of Gs) for (const h of H) A[h] += g[h];
    for (const b of Bs) for (const h of H) B[h] += b[h];
    for (const r of rows) {
      if (r.status === 'Not in books') { for (const h of H) D[h] += r.g[h]; Dl.push({ r, v: { i: r.g.i, c: r.g.c, s: r.g.s, x: r.g.x } }); continue; }
      if (r.status === 'Not in GSTR-2B' && tax(r.b) < 0.005) { r.why = (r.why || []).concat('no GST in this entry: nothing to claim, so it is not a difference'); continue; }   /* 1.67.2: a bill booked without GST is not listed in E */
      if (r.status === 'Not in GSTR-2B') { for (const h of H) E[h] += r.b[h]; El.push({ r, v: { i: r.b.i, c: r.b.c, s: r.b.s, x: r.b.x } }); continue; }
      const pd = Z(), ne = Z(); let pos = false, neg = false;
      for (const h of H) { const v = r.d[h]; if (v > 0.004) { pd[h] = v; pos = true; } else if (v < -0.004) { ne[h] = -v; neg = true; } }
      /* 1.62.0 (owner: "the tolerance is 1, but differences of 0.01 and 0.10 are shown"): differences within the tolerance are not
         listed bill by bill; they are added into one rounding line, so Net Diff G still closes to 0 */
      const small = H.every(h => Math.abs(r.d[h]) <= tol);
      if (small) { for (const h of H) { RD[h] += pd[h]; RE[h] += ne[h]; } if (pos || neg) RN++; continue; }
      if (pos) { for (const h of H) D[h] += pd[h]; Dl.push({ r, v: pd, part: true }); }
      if (neg) { for (const h of H) E[h] += ne[h]; El.push({ r, v: ne, part: true }); }
    }
    /* the rounding line: the net of all differences within the tolerance, on the side it falls */
    if (RN) { const net = Z(); for (const h of H) net[h] = RD[h] - RE[h];
      const pdv = Z(), nev = Z(); for (const h of H) { if (net[h] > 0.004) pdv[h] = net[h]; else if (net[h] < -0.004) nev[h] = -net[h]; }
      const rr = { status: 'Rounding', b: { party: 'Rounding within ₹' + tol + ' (' + RN + ' bill' + (RN === 1 ? '' : 's') + ')', gstin: '', no: '', date: '' }, g: null, why: [] };
      if (H.some(h => pdv[h])) { for (const h of H) D[h] += pdv[h]; Dl.push({ r: rr, v: pdv, part: true, round: true }); }
      if (H.some(h => nev[h])) { for (const h of H) E[h] += nev[h]; El.push({ r: rr, v: nev, part: true, round: true }); } }
    const S = { A, B, C: Z(), D, E, F: Z(), G: Z() };
    for (const h of H) { for (const k of ['A', 'B', 'D', 'E']) S[k][h] = R2(S[k][h]); S.C[h] = R2(S.A[h] - S.B[h]); S.F[h] = R2(S.D[h] - S.E[h]); S.G[h] = R2(S.C[h] - S.F[h]); }
    const order = { 'Partly matched': 0, 'GSTIN differs': 1, 'No GSTIN in books': 2, 'Not in books': 3, 'Not in GSTR-2B': 4, 'Matched': 5 };
    rows.sort((x, y) => order[x.status] - order[y.status] || String((x.b || x.g).party).localeCompare(String((y.b || y.g).party)));
    return { rows, S, Dl, El };
  }

  /* checks beyond matching: what to do before filing */
  function checks(B, G, res, o) {
    const out = [], fp = String(o.fp || ''), pm = +fp.slice(0, 2), py = +fp.slice(2), fyStart = pm >= 4 ? py : py - 1;
    const st = String(o.gstin || '').slice(0, 2), inr = v => '₹' + R2(v).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    for (const g of G) {
      if (!g.date) continue; const y = +g.date.slice(0, 4), m = +g.date.slice(4, 6), fy = m >= 4 ? y : y - 1;
      if (fyStart && fy < fyStart) out.push({ lv: g.m ? 'look' : 'act', t: 'Previous-year bill in this GSTR-2B: ' + g.party + ' ' + g.no + ' of ' + fdate(g.date) + ' (ITC ' + inr(tax(g)) + ')', d: 'ITC of FY ' + fy + '-' + String((fy + 1) % 100).padStart(2, '0') + ' can be claimed only up to 30 November ' + (fy + 1) + ' (section 16(4)). ' + (g.m ? 'It is in the books: check it was not claimed earlier.' : 'Not in the books: book and claim it in time, or confirm it was claimed earlier.') });
      else if (fp && (y * 12 + m) < (o.start ? +o.start.slice(2) * 12 + +o.start.slice(0, 2) : py * 12 + pm - (o.qrmp ? 2 : 0)) && !g.m) out.push({ lv: 'look', t: (o.start ? 'Bill of before the range' : o.qrmp ? 'Bill of before the quarter' : 'Earlier-month bill') + ' in this GSTR-2B, not in the books: ' + g.party + ' ' + g.no + ' of ' + fdate(g.date), d: 'Check whether it was booked in an earlier month (it would then not be in this register).' });
      if (g.rcm) out.push({ lv: 'act', t: 'Reverse charge in GSTR-2B: ' + g.party + ' ' + g.no + ' (tax ' + inr(tax(g)) + ')', d: 'Pay this tax in cash in GSTR-3B Table 3.1(d) first; then the ITC is claimed.' });
      if (g.itcNo) out.push({ lv: 'act', t: 'GSTR-2B says ITC not available: ' + g.party + ' ' + g.no + ' (' + inr(tax(g)) + ')', d: 'Do not claim this ITC.' });
    }
    const seen = new Map();
    for (const b of B) {
      const k = b.gstin + '|' + nn(b.no) + '|' + b.kind; if (nn(b.no)) { if (seen.has(k)) out.push({ lv: 'act', t: 'Same bill twice in the books: ' + b.party + ' ' + b.no, d: 'Two entries with the same supplier and bill number. Delete one, or correct the number.' }); seen.set(k, 1); }
      if (b.tx > 0) { const r = tax(b) / b.tx * 100; if (!STD.some(x => Math.abs(r - x) < 0.06) && tax(b) > 0) out.push({ lv: 'look', t: 'Tax does not fit one rate: ' + b.party + ' ' + b.no + ' (' + r.toFixed(2) + '% of ' + inr(b.tx) + ')', d: 'Usually a bill with two rates or a typing slip. Check the bill.' }); }
      if (st && okG(b.gstin)) { const same = b.gstin.slice(0, 2) === st; if (same && b.i > 0.5) out.push({ lv: 'act', t: 'IGST from a supplier in your own state: ' + b.party + ' ' + b.no + ' (' + inr(b.i) + ')', d: 'An intra-state bill carries CGST and SGST. Check the bill and the entry.' }); if (!same && (b.c > 0.5 || b.s > 0.5)) out.push({ lv: 'act', t: 'CGST/SGST from a supplier in another state: ' + b.party + ' ' + b.no, d: 'An inter-state bill carries IGST. Check the bill and the entry.' }); }
      if (b.ledger === 'deferred') out.push({ lv: 'look', t: 'ITC kept in a Deferred ITC ledger: ' + b.party + ' ' + b.no + ' (' + inr(tax(b)) + ')', d: b.m ? 'It is now in GSTR-2B: move it to Input ITC and claim it.' : 'Still not in GSTR-2B: keep it deferred.' });
    }
    for (const sec of [res.inv, res.note]) for (const r of sec.rows) {
      if (r.status === 'No GSTIN in books' || r.status === 'GSTIN differs') out.push({ lv: 'act', t: (r.status === 'No GSTIN in books' ? 'Add the GSTIN in the books: ' : 'Correct the GSTIN in the books: ') + (r.b.party || r.g.party), d: r.why.join('; ') + '.' });
      else if (r.status === 'Partly matched' && r.why.length) { const ex = H.some(h => r.d[h] < -0.5); out.push({ lv: ex ? 'act' : 'look', t: (ex ? 'Excess ITC in the books: ' : 'Differs from GSTR-2B: ') + (r.b.party || '') + ' ' + r.b.no, d: r.why.join('; ') + '.' }); }
    }
    /* suppliers not yet filed: ITC on hold */
    const hold = new Map(); for (const r of res.inv.rows) if (r.status === 'Not in GSTR-2B' && tax(r.b) >= 0.005) { const k = r.b.party || r.b.gstin; const o2 = hold.get(k) || { n: 0, t: 0 }; o2.n++; o2.t += tax(r.b); hold.set(k, o2); }
    const hs = [...hold.entries()].sort((a, b) => b[1].t - a[1].t);
    if (hs.length) out.push({ lv: 'look', t: 'ITC on hold, suppliers not in GSTR-2B yet: ' + inr(hs.reduce((t, x) => t + x[1].t, 0)), d: hs.slice(0, 12).map(([k, v]) => k + ' (' + v.n + ' bill' + (v.n === 1 ? '' : 's') + ', ' + inr(v.t) + ')').join('; ') + (hs.length > 12 ? '; and ' + (hs.length - 12) + ' more' : '') + '. Follow up with them; claim when it shows in GSTR-2B.' });
    return out;
  }

  function recon(B, G, o) {
    o = o || {}; const tol = o.tol == null ? 1 : +o.tol;
    for (const r of [...B, ...G]) { r.m = null; for (const k of ['tx', ...H]) r[k] = R2(Math.abs(+r[k] || 0)); r.gstin = String(r.gstin || '').toUpperCase().replace(/\s+/g, ''); }
    /* 1.67.1 (owner's AXEON Oct file): a Tally register gives "voucher no. / supplier's bill no." ("23 / SE000662"), or the voucher
       number alone. The supplier's number is what GSTR-2B has: it is used for matching, and the voucher number is kept to show */
    for (const r of B) { const m = /^\s*([^\/\s]{1,10})\s+\/\s+(\S.*)$/.exec(String(r.no || '')); if (m) { r.vch = m[1]; r.no = m[2].trim(); } }
    const Bi = B.filter(r => r.kind !== 'note' && r.ledger !== 'ineligible'), Bn = B.filter(r => r.kind === 'note');
    /* 1.65.10: the portal never lists one supplier's bill twice in a month: a repeat (same kind, GSTIN, number, date and tax) is a second copy of the file and is dropped */
    let AM = G.filter(r => r.amend); G = G.filter(r => !r.amend);
    /* 1.67.6 (owner's AXEON Sep-2026 GSTR-2B: New Metro Plastics 29 and Spectroteks 26-27/164 in B2BA, same number and date): an
       amended bill whose original was never in this client's GSTR-2B (the supplier first filed it against another GSTIN, or wrongly)
       brings its whole ITC now. When the books hold that bill, it is matched like a new bill of this GSTR-2B, with the amendment shown */
    { const P0 = o.prev || [], inPrev = a => P0.some(b => b.gstin === a.gstin && ((nn(b.no) && nn(b.no) === nn(a.ono)) || (a.odate && b.date === a.odate && core(b.no) && core(b.no) === core(a.ono))));
      const inBooks = a => B.some(b => (b.kind === 'note') === (a.kind === 'note') && ((okG(b.gstin) && b.gstin === a.gstin) || (!okG(b.gstin) && (sameName(b.party, a.party) || (firstWord(b.party) && firstWord(b.party) === firstWord(a.party)))))
        && (nn(b.no) === nn(a.no) || (core(b.no) && core(b.no) === core(a.no)) || nn(b.no) === nn(a.ono) || (b.date === a.date && Math.abs(tax(b) - tax(a)) <= tol)));
      const mv = AM.filter(a => !inPrev(a) && inBooks(a));
      for (const a of mv) { G.push(Object.assign({}, a, { amend: false, viaAmend: true })); a.movedIn = true; } }   // 1.66.7: B2BA / CDNRA rows: their own procedure, not matched as new bills
    const seen = new Set(), g0 = G.length; G = G.filter(r => { const k = [r.kind, r.gstin, nn(r.no), r.date, r.tx, ...H.map(h => r[h])].join('|'); if (seen.has(k)) return false; seen.add(k); return true; });
    const Gi = G.filter(r => r.kind !== 'note'), Gn = G.filter(r => r.kind === 'note');
    const res = { dup2b: g0 - G.length, inv: reconSection(Bi, Gi, tol, false), note: reconSection(Bn, Gn, tol, true), tol, fp: o.fp || '', ineligible: B.filter(r => r.kind !== 'note' && r.ledger === 'ineligible') };
    res.checks = checks(B, G, res, o);
    if (o.ims && o.ims.length) { linkIMS(res, o.ims, o); if (window.GO_IMS) res.imsRes = window.GO_IMS.recon(o.ims.map(r => ({ ...r })), G.map(r => ({ ...r, m: null })), { tol, fp: o.fp }); }   // the full IMS vs GSTR-2B, for its own sheets
    res.amend = amendments(AM, o.prev || [], o.ims || [], tol);
    for (const a of res.amend) if (a.movedIn) { a.add = false; a.act = 'The original was never in this client\'s GSTR-2B (first filed against another GSTIN, or wrongly): the whole bill is ITC now. It is your booked bill, so it is matched in the Invoices sheet and is not a difference.'; a.changes = 'came into this client\'s GSTR-2B only by this amendment'; }
    for (const sec of [res.inv, res.note]) for (const r of sec.rows) if (r.g && r.g.viaAmend) r.why = (r.why || []).concat('came by amendment (' + (r.g.kind === 'note' ? 'CDNRA' : 'B2BA') + ') in GSTR-2B' + (r.g.p2b ? ' of ' + MN[+r.g.p2b.slice(0, 2) - 1] + ' ' + r.g.p2b.slice(2) : '') + ': the supplier first filed it wrongly');
    res.blocked = blocked(res, o.client || {}, o.blk, o.ai); res.qrmp = !!o.qrmp; res.range = o.range || null; res.qp = o.qp || []; res.missing = o.missing || [];
    for (const m of res.missing) res.checks.unshift({ lv: 'act', t: 'GSTR-2B not taken: ' + m, d: 'Its bills are not in this reconciliation: every bill of that period booked in the books shows as "not in GSTR-2B". Get it again (step 2) and reconcile again.' });
    /* 1.66.9 (owner: "it doesn't deduct blocked ITC or ineligible ITC"): the ITC to claim from this GSTR-2B, for GSTR-3B Table 4:
       all ITC in GSTR-2B (4A), less the credit notes, less what GSTR-2B itself marks ITC not available (place of supply, the section
       16(4) time limit), less the 17(5) blocked bills, plus the amendment differences. The "Check" bills are shown, not deducted */
    /* 1.67.1: possible pairs left apart by the owner's rule (a different number is the same bill only when date AND amount agree):
       the same supplier with the same tax a few days apart, or on the same date with a different amount. Shown, never matched */
    { const nb = res.inv.rows.filter(r => r.status === 'Not in GSTR-2B'), ng = res.inv.rows.filter(r => r.status === 'Not in books'), used = new Set();
      const same = (b, g) => (okG(b.gstin) && b.gstin === g.gstin) || (!okG(b.gstin) && (sameName(b.party, g.party) || (firstWord(b.party) && firstWord(b.party) === firstWord(g.party))));
      for (const rb of nb) { const b = rb.b; let best = null, why = '';
        for (const rg of ng) { if (used.has(rg)) continue; const g = rg.g; if (!same(b, g)) continue; const dd = days(b.date, g.date);
          const ownNo = b.no && !/^\d{1,4}$/.test(b.no) && core(b.no) && core(g.no) && core(b.no) !== core(g.no);   /* both carry a supplier's number, and they differ: another bill */
          if (tax(b) > 0 && Math.abs(tax(g) - tax(b)) <= tol && dd <= 45 && !ownNo) { if (!best || dd < best.dd) { best = { rg, dd }; why = 'same supplier and tax, dates ' + dd + ' day' + (dd === 1 ? '' : 's') + ' apart'; } }
          else if (b.date && b.date === g.date && !best) { best = { rg, dd: 99 }; why = g.rcm && tax(b) < 0.01 ? 'same supplier and date; reverse charge: the tax is not in the purchase entry' : 'same supplier and date, amount differs'; } }
        if (best) { used.add(best.rg); const g = best.rg.g; rb.why = (rb.why || []).concat('possible pair: GSTR-2B ' + g.no + ' of ' + fdate(g.date) + ' (' + why + ')'); best.rg.why = (best.rg.why || []).concat('possible pair: books ' + (b.no || b.vch || '') + ' of ' + fdate(b.date) + ' (' + why + ')');
          res.checks.push({ lv: 'look', t: 'Possible pair, not matched: ' + (b.party || g.party) + ' · books ' + (b.no || '-') + ' of ' + fdate(b.date) + ' / GSTR-2B ' + g.no + ' of ' + fdate(g.date), d: why[0].toUpperCase() + why.slice(1) + '. If it is the same bill, correct the date or amount in the books (and type the supplier\'s bill no.), then reconcile again.' }); } } }
    /* 1.67.2 (owner: "most entries are in GST not in books and in books not in GST"): suppliers of GSTR-2B with no bill at all in the
       books point at the register given, not at the suppliers: expense bills booked as journal or payment vouchers, or not booked yet */
    { const bk = res.inv.rows.filter(r => r.b).map(r => r.b), seenB = g => bk.some(b => (okG(b.gstin) && b.gstin === g.gstin) || sameName(b.party, g.party) || (firstWord(b.party) && firstWord(b.party) === firstWord(g.party)));
      const miss = {}; for (const r of res.inv.rows) if (r.status === 'Not in books' && !seenB(r.g)) { const k = r.g.gstin || r.g.party, o2 = miss[k] || (miss[k] = { p: r.g.party, n: 0, t: 0 }); o2.n++; o2.t += tax(r.g); r.why = (r.why || []).concat('no bill of this supplier at all in the books given'); }
      const ms = Object.values(miss).sort((a, b) => b.t - a.t);
      if (ms.length) res.checks.unshift({ lv: 'act', t: ms.length + ' supplier' + (ms.length > 1 ? 's' : '') + ' of GSTR-2B have no bill at all in the books given (ITC ' + inr(ms.reduce((t, x) => t + x.t, 0)) + ')', d: ms.slice(0, 15).map(x => x.p + ' (' + x.n + ', ' + inr(x.t) + ')').join('; ') + (ms.length > 15 ? '; ...' : '') + '. The purchase register given may leave out bills booked as journal or payment vouchers (rent, courier, travel, repairs), or they are not booked yet. Give a register of every voucher with GST input (Tally: GST registers or Day Book with the GST ledgers), or book them, and reconcile again.' }); }
    res.G = G; itcCalc(res); { const NA = res.itc.NA;
      if (H.some(h => NA[h])) res.checks.push({ lv: 'act', t: 'ITC not available as per GSTR-2B: ' + inr(H.reduce((t, h) => t + NA[h], 0)), d: 'Taken out of the ITC to claim (Summary). Place of supply in another State, or past the section 16(4) time limit: do not claim it.' }); }
    for (const a of res.amend || []) if (a.add || !a.orig) res.checks.push({ lv: a.add ? 'act' : 'look', t: 'Amended by the supplier (' + (a.kind === 'note' ? 'CDNRA' : 'B2BA') + '): ' + a.party + ' ' + a.ono + (a.odate ? ' of ' + fdate(a.odate) : '') + (a.changes ? ': ' + a.changes : ''), d: a.act });
    { const Hs = { i: 0, c: 0, s: 0, x: 0 }; for (const a of res.amend) if (a.add) for (const h of H) Hs[h] = R2(Hs[h] + (a.kind === 'note' ? -1 : 1) * a.d[h]); res.amendH = Hs; }
    { const nB = res.blocked.filter(b => b.blk).length, nC = res.blocked.length - nB; if (res.blocked.length) res.checks.push({ lv: nB ? 'act' : 'look', t: 'Blocked ITC (section 17(5)) and bills to check against the business: ' + nB + ' blocked, ' + nC + ' to check', d: 'See the sheet "Blocked ITC 17(5)": do not claim the blocked ITC in GSTR-3B (or reverse it in Table 4B(1)); confirm the others are for the business.' }); }
    return res;
  }

  /* ---------- 1.66.7 (owner, 23 Nov 2026): amendments in GSTR-2B (B2BA, CDNRA) ----------
     Owner: an amendment is NOT reconciled with the books. 1Go says which bill was amended (original number and date), what changed
     (number, date, taxable value, each tax) and the difference. The original values are not in this month's GSTR-2B: 1Go takes them
     from the GSTR-2B of the earlier months it has saved (PREV). Only a non-zero difference goes into the reconciliation, as its own
     line (H) beside the statement: the 2B-vs-books statement (A to G) is untouched. The IMS status of the amended bill is shown */
  function amendments(AM, PREV, IMS, tol) {
    const out = [];
    for (const a of AM) {
      const kindOk = b => (a.kind === 'note') === (b.kind === 'note');
      const o = (PREV || []).find(b => kindOk(b) && b.gstin === a.gstin && nn(b.no) && nn(b.no) === nn(a.ono)) || (PREV || []).find(b => kindOk(b) && b.gstin === a.gstin && a.odate && b.date === a.odate && core(b.no) && core(b.no) === core(a.ono));
      const im = (IMS || []).find(r => r.gstin === a.gstin && nn(r.no) === nn(a.no)) || (IMS || []).find(r => r.gstin === a.gstin && nn(r.no) === nn(a.ono));
      const d = {}; for (const k of ['tx', 'val', ...H]) d[k] = o ? R2((a[k] || 0) - (o[k] || 0)) : null;
      const dTax = o ? R2(H.reduce((t, h) => t + d[h], 0)) : null;
      const ch = []; if (nn(a.no) !== nn(a.ono)) ch.push('number ' + a.ono + ' → ' + a.no); if (a.odate && a.date && a.date !== a.odate) ch.push('date ' + fdate(a.odate) + ' → ' + fdate(a.date));
      if (o) { if (Math.abs(d.tx) > tol) ch.push('taxable ' + inr(o.tx) + ' → ' + inr(a.tx)); for (const [h, l] of [['i', 'IGST'], ['c', 'CGST'], ['s', 'SGST'], ['x', 'cess']]) if (Math.abs(d[h]) > tol) ch.push(l + ' ' + inr(o[h]) + ' → ' + inr(a[h])); }
      if (o && !ch.length) ch.push('no change in number, date or value (place of supply, type or GSTIN details amended)');
      const sign = a.kind === 'note' ? -1 : 1, itcD = o ? R2(sign * dTax) : null, add = !!o && Math.abs(dTax) > tol;
      const act = !o ? 'The original ' + (a.kind === 'note' ? 'note' : 'bill') + ' is not in the earlier GSTR-2B 1Go has. Either the supplier first filed it against another GSTIN (then the whole ' + (a.kind === 'note' ? 'note' : 'bill') + ' counts now: book it if it is not booked), or the GSTR-2B of ' + (a.odate ? MN[+a.odate.slice(4, 6) - 1] + ' ' + a.odate.slice(0, 4) + ' (the quarter\'s, for QRMP)' : 'the original month') + ' is not downloaded: get it and reconcile again to see the difference.'
        : !add ? 'Only the details changed: no ITC difference. If the books carry the old number or date, correct them.'
        : (itcD > 0 ? 'ITC goes up by ' + inr(itcD) + ' this month: claim it (it is in GSTR-3B Table 4A(5) with this GSTR-2B); book the supplier\'s debit note / corrected bill in the books.'
                    : 'ITC goes down by ' + inr(-itcD) + ' this month: it is reduced in GSTR-3B with this GSTR-2B; book the supplier\'s credit note / corrected bill in the books.');
      out.push(Object.assign({}, a, { orig: o || null, origFrom: o ? o.from || '' : '', changes: ch.join('; '), d, dTax, itcD, add, ims: im ? im.act : '', act: (add || !o) ? act : act }));
    }
    return out;
  }

  /* ---------- 1.66.7 (owner): blocked ITC, section 17(5), and bills not related to the business ----------
     "the app should already know the nature of business from the client master and find, by the name appearing in B2B, whether it is
     related to the business or not, and flag it as blocked ITC". GSTR-2B carries no HSN for a bill, so the supplier's name is read
     against the 17(5) heads, and against what the client deals in (Client master: nature of business, goods, services, also deals in).
     A head the client itself trades in is not flagged (a car dealer buying cars, a restaurant buying food). "Blocked" is a 17(5) head;
     "Check" is a bill to confirm. */
  /* 1.67.3 (owner: "easy, fast and accurate, without AI, inside the reconciliation"): known brands and trades of India, read
     instantly from the supplier's name. Each entry: head, words, the client's own line that makes it allowable, level */
  const BRANDS = [
    ['Motor vehicles (17(5)(a)): car or two-wheeler maker / dealer', /\b(maruti|nexa|arena|hyundai|mahindra|kia|toyota|tata\s+motors|honda|renault|nissan|skoda|volkswagen|vw|mg\s+motor|jeep|citroen|bmw|mercedes|benz|audi|volvo|jaguar|land\s+rover|lexus|porsche|isuzu|force\s+motors|tvs\s+motor|bajaj|hero\s+moto\w*|royal\s+enfield|yamaha|suzuki|ktm|ather|ola\s+electric|kun\s+(car|motor|honda|hyundai|bmw)\w*|popular\s+(vehicles|motor)\w*|vst\s+motors|lakshmi\s+motors|sundaram\s+motors|car\s+enterprises|cars?\s+(pvt|private|india)|automotive|autoworld|auto\s+world|showroom)\b/i, /motor|automobile|vehicle|car\s+dealer|taxi|cab|travel|tour|driving\s+school|transport\s+of\s+passengers/i, 'Blocked'],
    ['Motor vehicle repair, tyres and parts (17(5)(ab))', /\b(mrf|apollo\s+tyres?|ceat|bridgestone|jk\s+tyres?|michelin|goodyear|yokohama|continental\s+tyres?|exide|amaron|bosch\s+car|castrol|servo|mobil|shell\s+lubri\w*|go\s?mechanic|mycarhelpline|car\s+(care|spa|wash|decor|accessories|service|ac)|auto\s+(care|garage|works|spares|electricals?)|wheel\s+alignment|wheels?|tyres?|garage|workshop|body\s+shop|denting|painting\s+works|service\s+(cent(er|re)|station|point)|autoaircon\w*|auto\s*air\s*con\w*|car\s*air\s*con\w*)\b/i, /motor|automobile|vehicle|transport|logistic|taxi|cab|travel|tyre|garage|workshop/i, 'Blocked'],
    ['Motor insurance, life and health insurance (17(5)(ab), (b)(i))', /\b(national\s+insurance|new\s+india\s+assurance|united\s+india\s+insurance|oriental\s+insurance|icici\s+lombard|bajaj\s+allianz|hdfc\s+ergo|tata\s+aig|iffco\s+tokio|sbi\s+general|reliance\s+general|cholamandalam\s+ms|royal\s+sundaram|go\s?digit|acko|kotak\s+general|future\s+generali|universal\s+sompo|shriram\s+general|liberty\s+general|magma|star\s+health|care\s+health|niva\s+bupa|aditya\s+birla\s+health|manipal\s+cigna|life\s+insurance|lic\s+of\s+india|hdfc\s+life|icici\s+prudential|sbi\s+life|max\s+life|bajaj\s+allianz\s+life|tata\s+aia|kotak\s+life)\b/i, /insurance/i, 'Check'],
    ['Food, beverages and catering (17(5)(b)(i))', /\b(irctc|swiggy|zomato|domino\w*|mcdonald\w*|kfc|pizza\s+hut|subway|starbucks|cafe\s+coffee\s+day|ccd|burger\s+king|haldiram\w*|saravana\s+bhavan|adyar\s+ananda\s+bhavan|a2b|sangeetha|anjappar|thalappakatti|barbeque\s+nation|wow\s+momo|chaayos|behrouz|faasos|eatsure|box8|freshmenu|sweet\s+stall|bhavan|tiffin|meals|foods?\s+(pvt|private|india|court)|snacks|chats|tea\s+stall|ice\s+creams?|cakes?)\b/i, /restaurant|hotel|food|cater|bakery|sweet|canteen|mess|beverage/i, 'Blocked'],
    ['Clubs, gyms and fitness (17(5)(b)(ii))', /\b(cult\.?fit|cultfit|gold'?s\s+gym|anytime\s+fitness|talwalkars|gymkhana|country\s+club|golf|cosmopolitan\s+club|madras\s+club|boat\s+club)\b/i, /club|gym|fitness/i, 'Blocked'],
    ['Beauty, health and cosmetic (17(5)(b)(i))', /\b(naturals|green\s+trends|lakme\s+salon|toni\s*&?\s*guy|enrich\s+salon|vlcc|kaya|apollo\s+(hospitals?|pharmacy|clinic)|medplus|netmeds|pharmeasy|1mg|fortis|kauvery|mgm\s+healthcare|sims|vijaya\s+hospital)\b/i, /salon|spa|beauty|hospital|clinic|medical|pharma|health/i, 'Check'],
    ['Goods and works for a building (17(5)(c), (d))', /\b(ultratech|ramco\s+cements?|dalmia|acc\s+(ltd|limited|cement)|ambuja|chettinad\s+cement|jsw\s+(steel|cement|paints)|tata\s+tiscon|kamachi|arun\s+excello|asian\s+paints|berger|nerolac|dulux|kajaria|somany|orientbell|johnson\s+tiles|jaquar|hindware|cera\b|parryware|greenply|century\s?ply|kitply|plywoods?|carpent\w*|fabricat\w*|glass\s+(house|works)|granites?|marbles?|hardwares?|steel\s+traders|building\s+materials?|electricals?\s+contract\w*|civil\s+(works|contract\w*)|interior\w*|false\s+ceiling|modular\s+kitchen)\b/i, /construct|builder|developer|real\s+estate|contractor|cement|hardware|building\s+material|paint|tile|granite|marble|sanitary|interior|plywood|steel/i, 'Check'],
    ['Travel benefits and cabs (17(5)(b)(i), (iii))', /\b(ola\s+cabs|ani\s+technologies|uber|rapido|fast\s?track|zoomcar|savaari|makemytrip|goibibo|yatra|cleartrip|easemytrip|thomas\s+cook|sotc|kesari|veena\s+world|tours?\s*(&|and)\s*travels?|travels|holidays?|rent\s*a\s*cab|call\s+taxi|cabs?|taxi)\b/i, /travel|tour|cab|taxi|transport|logistic/i, 'Check'],
    ['Gifts (17(5)(h))', /\b(archies|hallmark|ferns\s*n?\s*petals|igp|giftalove|crackers|fireworks|sweets\s+and\s+savouries|dry\s+fruits?)\b/i, /gift|cracker|firework|dry\s+fruit|sweet/i, 'Check']
  ];
  const B175 = [
    ['Motor vehicles and conveyances (17(5)(a), (aa))', /\b(motors?|automobiles?|auto\s?mobiles|cars?|motor\s*cycles?|honda|four\s?wheelers?|two\s?wheelers?|vehicles?|maruti|hyundai|toyota|tata\s+motors|mahindra|kia|honda\s+cars|renault|skoda|volkswagen|royal\s+enfield|bajaj\s+auto|tvs\s+motor|hero\s+moto)\b/i, /motor|automobile|vehicle|car\s+dealer|transport|logistic|taxi|cab|tour|travel|driving\s+school/i, 'Blocked'],
    ['Food, beverages and outdoor catering (17(5)(b)(i))', /\b(restaurants?|caterers?|catering|sweets?|bakery|bakers|cafe|caf\u00e9|coffee\s+house|dhaba|biryani|mess|canteen|juice|food\s+court|hotel\s+and\s+restaurant)\b/i, /restaurant|hotel|food|cater|bakery|sweet|canteen|mess/i, 'Blocked'],
    ['Beauty, health, cosmetic and plastic surgery (17(5)(b)(i))', /\b(salon|spa|beauty|parlou?r|cosmetic\s+surgery|plastic\s+surgery|dental|clinic|hospitals?|diagnostics?|laborator(y|ies)|pharmacy|medicals?)\b/i, /salon|spa|beauty|hospital|clinic|medical|pharma|health/i, 'Check'],
    ['Club membership, health and fitness centre (17(5)(b)(ii))', /\b(club|gymnasium|gym|fitness|health\s+club|recreation)\b/i, /club|gym|fitness/i, 'Blocked'],
    ['Life and health insurance (17(5)(b)(i))', /\b(life\s+insurance|health\s+insurance|lic\b|star\s+health|care\s+health|niva\s+bupa|max\s+life|hdfc\s+life|icici\s+prudential|sbi\s+life)\b/i, /insurance/i, 'Blocked'],
    ['General insurance: motor insurance is blocked (17(5)(ab)); insurance of business assets is not', /\b(insurance|assurance)\b/i, /insurance/i, 'Check'],
    ['Rent-a-cab and travel benefits (17(5)(b)(i), (iii))', /\b(travels?|tours?|holidays?|rent\s*a\s*cab|cabs?|taxi|car\s+rentals?|car\s+hire)\b/i, /travel|tour|cab|taxi|transport|logistic/i, 'Check'],
    ['Works contract / goods for construction of immovable property (17(5)(c), (d))', /\b(constructions?|builders?|developers?|infra(structure)?|civil|contractors?|cement|tmt|bricks?|interiors?|carpent\w*|plywoods?|ready\s?mix|rmc|paints?|tiles|granites?|marbles?|sanitary)\b/i, /construct|builder|developer|real\s+estate|contractor|cement|hardware|building\s+material|paint|tile|granite|marble|sanitary|interior/i, 'Check'],
    ['Repair, servicing and parts of motor vehicles (17(5)(ab))', /\b(tyres?|tires?|service\s+cent(er|re)|service\s+station|auto\s*air\s*condition\w*|autoaircondition\w*|petrol|fuels?|filling\s+station|car\s+care|car\s+wash|garage|auto\s+parts|spares|batter(y|ies)|mrf|apollo\s+tyres|ceat|bridgestone|jk\s+tyre)\b/i, /motor|automobile|vehicle|tyre|tire|spare|garage|transport|logistic|taxi|cab|travel/i, 'Check'],
    ['Hotel bills: stay is allowed, food and beverages are blocked (17(5)(b)(i))', /\b(hotels?|resorts?|villa|lodge|inn|residency|suites)\b/i, /hotel|resort|lodg|travel|tour|hospitality/i, 'Check'],
    ['Gifts and free samples (17(5)(h))', /\b(gifts?|gift\s+articles|crackers|fireworks|dry\s+fruits|novelties)\b/i, /gift|cracker|firework|dry\s+fruit|novelt/i, 'Check']
  ];
  /* lines of trade that are personal or for resale only when the client is in that line */
  const LINES = [['garments and textiles', /\b(textiles?|garments?|fabrics?|silks?|sarees?|readymades?|apparels?|hosiery|knits?|clothing|tailors?)\b/i],
    ['footwear', /\b(footwear|shoes?|chappals?|slippers)\b/i], ['jewellery', /\b(jewell?e?r?y|jewellers?|gold|silver|diamonds?|ornaments)\b/i],
    ['groceries', /\b(supermarket|super\s+market|provisions?|grocer(y|ies)|departmental\s+store|hypermarket)\b/i], ['mobiles and consumer electronics', /\b(mobiles?|cell\s?phones?|smart\s?phones?|home\s+appliances|electronics)\b/i],
    ['furniture and furnishings', /\b(furniture|furnishings?|mattress(es)?|sofas?)\b/i], ['liquor', /\b(wines?|liquors?|spirits|brewer(y|ies)|bar\b)/i]];
  /* names that read like a 17(5) head but are not: a goods transport agency ("... Motor Transport"), couriers, a photo or computer "mart" */
  const NOT175 = /\b(transport|transports|logistics?|carriers?|roadways|cargo|parcels?|couriers?|movers|freight|shipping|express)\b/i;
  /* 1.67.1 (owner: "the blocked ITC is not deducted by the app"): the ITC to claim, worked out again whenever a blocked tick changes:
     GSTR-2B ITC less credit notes, less ITC not available per GSTR-2B, less every bill ticked "Blocked", plus amendment differences */
  function itcCalc(res) {
    const Z = () => ({ i: 0, c: 0, s: 0, x: 0 }), add = (S, r, k) => { for (const h of H) S[h] = R2(S[h] + k * (r[h] || 0)); };
    const A = Z(), CN = Z(), NA = Z(), BL = Z(), CK = Z(), RC = Z(), BB = Z();
    for (const g of res.G || []) { if (g.kind === 'note') { add(CN, g, 1); if (g.itcNo) add(NA, g, -1); } else { add(A, g, 1); if (g.itcNo) add(NA, g, 1); if (g.rcm) add(RC, g, 1); } }
    for (const b of res.blocked || []) { if (b.src === 'Books') { if (b.blk) add(BB, b, 1); continue; } add(b.blk ? BL : CK, b, 1); }
    const AH = Z(); for (const a of res.amend || []) if (a.add) for (const h of H) AH[h] = R2(AH[h] + (a.kind === 'note' ? -1 : 1) * a.d[h]);
    const N = Z(); for (const h of H) N[h] = R2(A[h] - CN[h] - NA[h] - BL[h] + AH[h]);
    res.itc = { A, CN, NA, BL, AH, N, CK, RC, BB }; return res.itc;
  }
  function blocked(res, client, dec, ai) {
    dec = dec || {}; ai = ai || {};   /* 1.67.2: ai = Claude's reading per supplier ({v: blocked|check|ok, h, why}); the person's tick outranks it */   /* 1.67.1: the person's decision per supplier GSTIN (or name): true = blocked, false = claim; it outranks 1Go's reading */
    const nat = [client.nature, client.business, (client.goods || []).map(g => g.desc || g).join(' '), (client.services || []).map(g => g.desc || g).join(' '), client.alsoDeals].filter(Boolean).join(' ').toLowerCase();
    const out = [], rows = res.inv.rows;   // bills; credit notes only lower ITC
    for (const r of rows) {
      const g = r.g, b = r.b, x = g || b; if (!x) continue;
      const name = (g && g.party) || (b && b.party) || ''; if (!name) continue;
      const itc = R2(H.reduce((t, h) => t + (x[h] || 0), 0)); if (itc <= 0) continue; if (g && g.itcNo) continue;   /* GSTR-2B already says ITC not available: it is in that line, not here */
      let hit = null; const key = (x.gstin || '').toUpperCase() || 'N:' + name.toLowerCase(), d = dec[key];
      if (d === true) hit = { head: 'Marked blocked by you', lv: 'Blocked', why: 'You marked this supplier\'s ITC as blocked / not for the business: not claimed' };
      const A = d === undefined ? ai[key] : null;
      if (!hit && A) { if (A.v === 'ok') continue; hit = { head: (A.h || (A.v === 'blocked' ? 'Section 17(5)' : 'To check')), lv: A.v === 'blocked' ? 'Blocked' : 'Check', why: (A.v === 'blocked' ? 'Blocked: ' : 'Check the bill: ') + (A.why || '') }; }
      /* 1.67.3: your own office's ticks for this supplier on other clients (by GSTIN): the strongest sign after this client's own tick */
      const O = d === undefined && !hit && !A ? (client.__office || {})[key] : null;
      if (O) hit = { head: 'Marked blocked by your office for ' + O.co, lv: 'Blocked', why: 'You marked this supplier blocked for ' + O.co + (O.n > 1 ? ' and ' + (O.n - 1) + ' other client' + (O.n > 2 ? 's' : '') : '') + ': check it applies here too' };
      /* 1.67.3: the GSTR-2B's own tax: compensation cess with 28% GST is a car (or tobacco / aerated drinks); cess alone, a check */
      if (!hit && !A && g && (g.x || 0) > 0.5 && g.tx > 0) { const rt = (g.i + g.c + g.s) / g.tx;
        if (!(nat && /motor|automobile|vehicle|car\s+dealer|tobacco|beverage|coal|power|cement\s+plant/i.test(nat))) hit = rt > 0.26 ? { head: 'Motor vehicle (17(5)(a)): 28% GST with compensation cess', lv: 'Blocked', why: 'The bill carries 28% GST and cess, as a car or two-wheeler does (or tobacco / aerated drinks): blocked unless the client deals in them' } : { head: 'Compensation cess charged: check what was bought', lv: 'Check', why: 'Cess is charged on cars, tobacco, aerated drinks and coal' }; }
      if (!hit) for (const [head, re, own, lv] of BRANDS) if (re.test(name) && !(/^Motor vehicle repair|^Travel/.test(head) && NOT175.test(name) && !/tyre|mrf|garage|workshop|service/i.test(name)) && !(nat && new RegExp('\\b(' + own.source + ')(s|es|ing)?\\b', 'i').test(nat))) { hit = { head, lv, why: lv === 'Blocked' ? 'A known ' + head.split(':')[0].replace(/ \(.*/, '').toLowerCase() + ' supplier: blocked under section 17(5) unless the bill shows otherwise' : 'May be blocked under section 17(5): look at what the bill is for' }; break; }
      if (!hit) for (const [head, re, own, lv] of B175) if (re.test(name) && !(/^Motor|^Rent-a-cab/.test(head) && NOT175.test(name)) && !(nat && new RegExp('\\b(' + own.source + ')(s|es|ing)?\\b', 'i').test(nat))) { hit = { head, lv, why: lv === 'Blocked' ? 'Blocked under section 17(5): do not claim, or reverse in GSTR-3B Table 4B(1)' : 'May be blocked under section 17(5): confirm what it is for' }; break; }
      if (!hit && nat) for (const [line, re] of LINES) if (re.test(name) && !re.test(nat)) { hit = { head: 'Not in the line of business (' + line + ')', lv: 'Check', why: 'The client deals in ' + nat.slice(0, 80) + ': confirm this bill is for the business (personal use is blocked under 17(5)(g))' }; break; }
      if (hit) out.push({ src: g && b ? '2B and books' : g ? 'GSTR-2B' : 'Books', key, party: name, gstin: x.gstin || '', no: x.no, date: x.date, kind: x.kind, tx: x.tx, i: x.i, c: x.c, s: x.s, x: x.x, itc, ...hit, blk: d === undefined ? hit.lv === 'Blocked' : !!d, by: d !== undefined ? 'you' : A ? 'AI' : O ? 'office' : '1Go' });
    }
    return out.sort((a, b) => (a.lv === b.lv ? 0 : a.lv === 'Blocked' ? -1 : 1) || a.head.localeCompare(b.head) || a.party.localeCompare(b.party));
  }
  /* 1.64.0 (owner: "make this interlinked: when I reconcile 2B with purchase, IMS should also reconcile"): each bill gets its IMS
     action (found by GSTIN and bill number), and what IMS says is used: why a booked bill is missing from GSTR-2B, a booked bill
     rejected in IMS, a GSTR-2B bill not in the books still accepted, and so on. IMS vs GSTR-2B on its own stays a separate box. */
  function linkIMS(res, IMS, o) {
    const idx = new Map(), idc = new Map(), put = (m, k, r) => { if (!k) return; const a = m.get(k); if (a) a.push(r); else m.set(k, [r]); };
    for (const r of IMS) { put(idx, r.gstin + '|' + r.kind + '|' + nn(r.no), r); put(idc, r.gstin + '|' + r.kind + '|' + core(r.no), r); }
    const look = x => { if (!x) return null; for (const [m, k] of [[idx, x.gstin + '|' + x.kind + '|' + nn(x.no)], [idc, x.gstin + '|' + x.kind + '|' + core(x.no)]]) { const a = m.get(k); if (a && a.length) return a[0]; } return null; };
    const inr = v => '₹' + R2(v).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    let n = 0;
    for (const sec of [res.inv, res.note]) for (const r of sec.rows) {
      const im = look(r.g) || look(r.b && okG(r.b.gstin) ? r.b : null) || (r.g && r.b ? look({ ...r.g, no: r.b.no }) : null);
      r.ims = im ? im.act : ''; if (im) { n++; r.imsPeriod = im.period; }
      const who = (r.b || r.g).party + ' ' + (r.b ? r.b.no : r.g.no), itc = r.b ? tax(r.b) : tax(r.g);
      if (r.status === 'Not in GSTR-2B') {
        if (r.ims === 'Pending') { r.imsNote = ('pending in IMS: accept it in IMS for it to come into GSTR-2B'); res.checks.push({ lv: 'act', t: 'Booked, pending in IMS: ' + who + ' (' + inr(itc) + ')', d: 'Accept it in IMS (if the bill is right) so that it comes into GSTR-2B; then claim the ITC.' }); }
        else if (r.ims === 'Rejected') { r.imsNote = ('rejected in IMS'); res.checks.push({ lv: 'act', t: 'Booked, but rejected in IMS: ' + who + ' (' + inr(itc) + ')', d: 'The ITC will not come. Either change the IMS action (if the rejection was a mistake) or reverse the ITC in the books.' }); }
        else if (r.ims) { r.imsNote = ('in IMS (' + r.ims.toLowerCase() + (r.imsPeriod ? ', period ' + r.imsPeriod : '') + ') but not in this GSTR-2B'); res.checks.push({ lv: 'look', t: 'In IMS, not in this GSTR-2B: ' + who, d: 'The supplier filed it for ' + (r.imsPeriod || 'another period') + ', or it was accepted after this GSTR-2B was made. It comes in that month\'s GSTR-2B.' }); }
        else r.imsNote = ('not in IMS either: the supplier has not filed it yet');
      } else if (r.status === 'Not in books') {
        if (r.ims === 'Accepted' || r.ims === 'No action') { r.imsNote = ('IMS: ' + r.ims.toLowerCase()); res.checks.push({ lv: 'act', t: 'In GSTR-2B and ' + r.ims.toLowerCase() + ' in IMS, not in the books: ' + who + ' (' + inr(itc) + ')', d: 'Book it if it is yours. If it is not yours, or not received yet, mark it Rejected or Pending in IMS before GSTR-3B.' }); }
        else if (r.ims) r.imsNote = ('IMS: ' + r.ims.toLowerCase());
      } else if (r.ims === 'Rejected' && !r.g.rejected) { r.imsNote = ('rejected in IMS, yet in GSTR-2B with ITC: recompute GSTR-2B'); res.checks.push({ lv: 'act', t: 'Rejected in IMS but booked and in GSTR-2B: ' + who, d: 'Check which is right. If the bill is yours, change the IMS action to Accepted; if not, reverse the ITC.' }); }
      else if (r.ims === 'Pending') { r.imsNote = ('pending in IMS'); res.checks.push({ lv: 'look', t: 'Booked and in GSTR-2B, but pending in IMS: ' + who, d: 'Accept it in IMS.' }); }
    }
    res.imsLinked = n; res.imsCount = IMS.length;
  }

  /* ---------- reading the files ---------- */
  const cellS = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const num = v => { if (typeof v === 'number') return v; const s = String(v == null ? '' : v).replace(/[₹,\s]/g, '').replace(/^\((.*)\)$/, '-$1'); return s && isFinite(+s) ? +s : 0; };
  const dOf = v => { try { return (typeof pdate === 'function' ? pdate(v) : '') || ''; } catch (e) { return ''; } };
  /* the template, or Tally's columnar Purchase / Debit Note Register: found by its headings */
  function readRegister(sheets, kindHint) {
    const out = [];
    for (const sh of sheets || []) {
      const rows = sh.rows || [], nm = String(sh.name || '');
      if (/read ?me|start here|lists|summary/i.test(nm)) continue;
      let h = -1, hr = null;
      for (let i = 0; i < Math.min(rows.length, 40); i++) { const t = Array.from(rows[i] || [], c => cellS(c).toLowerCase()); if (t.some(x => /gstin/.test(x)) && t.some(x => /(invoice|bill|note|voucher|debit note|supplier invoice)\s*(no|number)/.test(x) || /^particulars$/.test(x))) { h = i; hr = t; break; } }
      if (h < 0) continue;
      const isNote = /debit|purchase return|note/i.test(nm) || hr.some(x => /^debit note no/.test(x)) || kindHint === 'note';
      const col = re => hr.findIndex(x => re.test(x));
      const tmpl = hr.some(x => /^taxable value/.test(x));
      const C = { gstin: col(/gstin/), party: col(/^(supplier name|party name|supplier|particulars|party)/), no: isNote ? col(/^(debit note no|note no|voucher no)/) : col(/^(invoice no|supplier invoice no|bill no|invoice number)/),
        vno: col(/^voucher no/), date: isNote ? col(/^(debit note date|note date|date)$/) : col(/^(invoice date|supplier invoice date|bill date)/), vdate: col(/^date$/),
        ref: isNote ? col(/(supplier'?s? (bill|credit note|debit note|invoice)|supplier (invoice|debit|credit)|reference|ref\.? no|against)/) : -1, vtype: col(/^voucher type|^vch type/), val: col(/^(invoice value|note value|gross total|value)/), tx: col(/^taxable value/),
        i: col(/^(igst|integrated)/), c: col(/^(cgst|central)/), s: col(/^(sgst|state|utgst)/), x: col(/^cess/), rcm: col(/reverse charge/), led: col(/itc ledger|itc type/) };
      if (C.date < 0) C.date = C.vdate;
      /* Tally's register: every ledger has its own column; tax columns by their names, the rest (but round off and TDS) is the taxable value */
      const taxCols = { i: [], c: [], s: [], x: [] }, txCols = [], defCols = new Set();
      if (!tmpl) {
        /* every column that is not a detail of the voucher is a ledger column */
        const INFO = /^(date|particulars|voucher|vch|supplier invoice|supplier (debit|credit)|gstin|gross total|reference|ref\b|ref\.|narration|party|buyer|address|pan|place|state|quantity|qty|rate|value|sl|s\.? ?no|sr|order|e-?way|irn|ack)/;
        hr.forEach((x, j) => { if (!x || INFO.test(x)) return; const t = /igst|integrated tax/.test(x) ? 'i' : /cgst|central tax/.test(x) ? 'c' : /sgst|utgst|state tax/.test(x) ? 's' : /\bcess\b/.test(x) ? 'x' : '';
          if (t) { taxCols[t].push(j); if (/defer/.test(x)) defCols.add(j); } else if (!/round|r\.? ?off|^tds|\btds\b|discount|^total|^net/.test(x)) txCols.push(j); });
      }
      for (const r of rows.slice(h + 1)) {
        const g = j => j >= 0 ? r[j] : '';
        const party = cellS(g(C.party)); if (!party || /^(grand )?total/i.test(party)) continue;
        const no = cellS(g(C.no)) || cellS(g(C.vno)), date = dOf(g(C.date)) || dOf(g(C.vdate));
        if (!no && !date) continue;
        const rowNote = isNote || /debit note|purchase return/i.test(cellS(g(C.vtype)));
        const o = { side: 'B', kind: rowNote ? 'note' : 'inv', gstin: cellS(g(C.gstin)).toUpperCase(), party, no, ref: cellS(g(C.ref)), date, val: Math.abs(num(g(C.val))),
          tx: 0, i: 0, c: 0, s: 0, x: 0, rcm: /^y/i.test(cellS(g(C.rcm))), ledger: /defer/i.test(cellS(g(C.led))) ? 'deferred' : /inelig|block|17\(5\)/i.test(cellS(g(C.led))) ? 'ineligible' : 'input', vno: cellS(g(C.vno)) };
        if (tmpl) { o.tx = num(g(C.tx)); o.i = num(g(C.i)); o.c = num(g(C.c)); o.s = num(g(C.s)); o.x = num(g(C.x)); }
        else { for (const h2 of H) o[h2] = taxCols[h2].reduce((t, j) => t + num(r[j]), 0); o.tx = txCols.reduce((t, j) => t + num(r[j]), 0); if ([...defCols].some(j => num(r[j]))) o.ledger = 'deferred'; }
        if (!o.tx && o.val) o.tx = Math.max(0, o.val - tax(o));
        out.push(o);
      }
    }
    return out;
  }
  /* GSTR-2B: the portal's JSON or Excel, read by 1Go's own 2B reader (B2B and B2B-CDNR) */
  function read2B(sheets) {
    const out = []; if (typeof gstRows !== 'function') return out;
    for (const sh of sheets || []) {
      const nm = String(sh.name || ''); if (!/^b2b(\s*\(\d+\))?$|b2b.?cdnr/i.test(nm)) continue;
      const isNote = /cdnr/i.test(nm);
      for (const r of gstRows(sh.rows || [], isNote ? 1 : 0)) {
        const [gstin, party, no, date, tx, c, s, i, val, kind, rcm, itc] = r;
        const dn = isNote && /debit|^d$/i.test(String(kind || ''));
        out.push({ side: 'G', kind: isNote && !dn ? 'note' : 'inv', gstin: cellS(gstin).toUpperCase(), party: cellS(party), no: cellS(no), date: dOf(date), val: Math.abs(num(val)), tx: num(tx), i: num(i), c: num(c), s: num(s), x: 0,
          rcm: /^y/i.test(cellS(rcm)), itcNo: /^n/i.test(cellS(itc)), supDn: dn });
      }
    }
    /* 1.66.7: amendments: B2BA (original no. and date, then the revised bill) and B2B-CDNRA (original note, then the revised note); the
       ITC-reversal and rejected copies of these tables are not read */
    for (const sh of sheets || []) {
      const nm = String(sh.name || '').trim(); const isA = /^b2ba$/i.test(nm), isN = /^b2b-?cdnra$/i.test(nm); if (!isA && !isN) continue;
      for (const r0 of sh.rows || []) {
        const r = Array.from(r0 || [], v => v == null ? '' : v), gi = isA ? 2 : 3; if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/i.test(cellS(r[gi]))) continue;
        const o = isA ? { ono: r[0], odate: r[1], no: r[4], date: r[6], val: r[7], rcm: r[9], tx: r[10], i: r[11], c: r[12], s: r[13], x: r[14], kind: 'inv' }
                      : { ono: r[1], odate: r[2], no: r[5], date: r[8], val: r[9], rcm: r[11], tx: r[12], i: r[13], c: r[14], s: r[15], x: r[16], kind: /debit/i.test(cellS(r[6])) ? 'inv' : 'note' };
        out.push({ side: 'G', amend: true, gstin: cellS(r[gi]).toUpperCase(), party: cellS(r[gi + 1]), ono: cellS(o.ono), odate: dOf(o.odate), no: cellS(o.no), date: dOf(o.date), val: Math.abs(num(o.val)), tx: Math.abs(num(o.tx)), i: Math.abs(num(o.i)), c: Math.abs(num(o.c)), s: Math.abs(num(o.s)), x: Math.abs(num(o.x)), kind: o.kind, rcm: /^y/i.test(cellS(o.rcm)) });
      }
    }
    return out;
  }

  window.GO_R2B = { reconSection, checks, recon, readRegister, read2B, core, sameName, nn, amendments, blocked, itcCalc };
})();
