/* Smart Auditing — styled .xlsx writer (offline, no library): the generic part of 1Go's app/xlsxpro.js (1.48.5),
   with a few extra styles (plain numbers; High / Medium / Low). Exposes window.SA_XLSX.book(sheets) -> Uint8Array.
   A sheet: {name, rows:[[cell]], w:[widths], freeze:{row,col}, merges:['A1:F1'], tab:'FF1F2A5C'}; a cell is a value or {v, s, f, date}. */
(function () {
  'use strict';
  /* ---------- zip (stored) ---------- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zip(files) {
    const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
    for (const [name, text] of files) {
      const nb = enc.encode(name), data = typeof text === 'string' ? enc.encode(text) : text, crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(8, 0, true);
      h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nb.length, true);
      parts.push(new Uint8Array(h.buffer), nb, data);
      const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true);
      c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nb.length, true); c.setUint32(42, off, true);
      cen.push(new Uint8Array(c.buffer), nb); off += 30 + nb.length + data.length;
    }
    const csz = cen.reduce((t, a) => t + a.length, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csz, true); e.setUint32(16, off, true);
    const all = [...parts, ...cen, new Uint8Array(e.buffer)], out = new Uint8Array(all.reduce((t, a) => t + a.length, 0)); let p = 0; for (const a of all) { out.set(a, p); p += a.length; }
    return out;
  }
  const xe = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const colL = n => { let s = ''; n++; while (n) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };

  /* ---------- styles (fixed set; S.name -> index) ---------- */
  const NAVY = 'FF1F2A5C', INDIGO = 'FF3B4BA8', HEAD = 'FFE4E9F8', NUMS = 'FFF3F5FB', YEL = 'FFFFF8D6', GREY = 'FFEDEFF3', LINE = 'FFC9D1E3';
  const fonts = ['<font><sz val="10"/><name val="Calibri"/></font>', '<font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>', '<font><i/><sz val="10"/><color rgb="FF4A5470"/><name val="Calibri"/></font>',
    '<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>', '<font><b/><sz val="10"/><color rgb="FF1F2A5C"/><name val="Calibri"/></font>', '<font><i/><sz val="8"/><color rgb="FF7A84A0"/><name val="Calibri"/></font>',
    '<font><sz val="10"/><color rgb="FF4A5470"/><name val="Calibri"/></font>', '<font><b/><sz val="12"/><color rgb="FF1F2A5C"/><name val="Calibri"/></font>', '<font><b/><sz val="10"/><name val="Calibri"/></font>', '<font><b/><sz val="11"/><color rgb="FF1F2A5C"/><name val="Calibri"/></font>',
    '<font><b/><sz val="20"/><color rgb="FF1F2A5C"/><name val="Calibri"/></font>', '<font><sz val="9"/><color rgb="FF5A6482"/><name val="Calibri"/></font>',
    '<font><b/><sz val="10"/><color rgb="FF0F6B45"/><name val="Calibri"/></font>', '<font><b/><sz val="10"/><color rgb="FF8A5A00"/><name val="Calibri"/></font>', '<font><b/><sz val="10"/><color rgb="FFA12A1F"/><name val="Calibri"/></font>',
    '<font><u/><sz val="10"/><color rgb="FF2F4BD8"/><name val="Calibri"/></font>', '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>', '<font><b/><sz val="20"/><color rgb="FFA12A1F"/><name val="Calibri"/></font>',
    '<font><b/><sz val="20"/><color rgb="FF0F6B45"/><name val="Calibri"/></font>', '<font><sz val="11"/><color rgb="FF14203D"/><name val="Calibri"/></font>', '<font><b/><sz val="14"/><color rgb="FF1F2A5C"/><name val="Calibri"/></font>', '<font><b/><sz val="26"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>', '<font><sz val="12"/><color rgb="FFC4CFF0"/><name val="Calibri"/></font>', '<font><b/><sz val="10"/><color rgb="FF5A6482"/><name val="Calibri"/></font>',
    '<font><b/><sz val="8"/><color rgb="FF9FB0E0"/><name val="Calibri"/></font>', '<font><sz val="11"/><color rgb="FFDCE3F7"/><name val="Calibri"/></font>', '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>',
    '<font><b/><sz val="20"/><color rgb="FF8A5A00"/><name val="Calibri"/></font>', '<font><b/><sz val="20"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>', '<font><b/><sz val="9"/><color rgb="FF5A6482"/><name val="Calibri"/></font>'];
  const fill = c => `<fill><patternFill patternType="solid"><fgColor rgb="${c}"/><bgColor indexed="64"/></patternFill></fill>`;
  const fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>', fill(NAVY), fill(INDIGO), fill(HEAD), fill(NUMS), fill(YEL), fill(GREY), fill('FFFDE7E5'), fill('FFFFF3D6'), fill('FFE5F4EC'), fill('FFF5F7FC'), fill('FF17875A'), fill('FFD39B00'), fill('FFC93A2E'), fill('FFEDF0FD'), fill('FF8A93A8'), fill('FF2F4BD8')];
  const borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>', `<border><left style="thin"><color rgb="${LINE}"/></left><right style="thin"><color rgb="${LINE}"/></right><top style="thin"><color rgb="${LINE}"/></top><bottom style="thin"><color rgb="${LINE}"/></bottom><diagonal/></border>`,
    `<border><left/><right/><top/><bottom style="medium"><color rgb="FF3B4BA8"/></bottom><diagonal/></border>`,
    `<border><left style="thin"><color rgb="${LINE}"/></left><right style="thin"><color rgb="${LINE}"/></right><top style="thick"><color rgb="FF2F4BD8"/></top><bottom/><diagonal/></border>`,
    `<border><left style="thin"><color rgb="${LINE}"/></left><right style="thin"><color rgb="${LINE}"/></right><top/><bottom style="thin"><color rgb="${LINE}"/></bottom><diagonal/></border>`];
  const numFmts = '<numFmts count="6"><numFmt numFmtId="164" formatCode="dd-mm-yyyy"/><numFmt numFmtId="165" formatCode="#,##0.00;[Red]-#,##0.00;&quot;-&quot;"/><numFmt numFmtId="166" formatCode="0.##"/><numFmt numFmtId="167" formatCode="[&gt;=10000000]##\\,##\\,##\\,##0;[&gt;=100000]##\\,##\\,##0;##,##0"/><numFmt numFmtId="168" formatCode="0"/><numFmt numFmtId="169" formatCode="[&gt;=10000000]##\\,##\\,##\\,##0.00;[&gt;=100000]##\\,##\\,##0.00;##,##0.00"/></numFmts>';
  /* [font, fill, border, numFmt, align] */
  const STY = {
    def: [0, 0, 0, 0, ''], title: [1, 2, 0, 0, 'vc'], sub: [2, 0, 0, 0, 'vc'], group: [3, 3, 1, 0, 'center'], head: [4, 4, 1, 0, 'centerwrap'], nums: [5, 5, 1, 0, 'center'],
    in: [0, 6, 1, 0, ''], inNum: [0, 6, 1, 165, ''], inDate: [0, 6, 1, 164, 'center'], inRate: [0, 6, 1, 166, 'center'], inC: [0, 6, 1, 0, 'center'],
    calc: [6, 7, 1, 165, ''], calcT: [6, 7, 1, 0, ''], label: [8, 0, 0, 0, 'vc'], note: [6, 0, 0, 0, 'wrapvc'], sect: [7, 0, 2, 0, ''], swY: [0, 6, 1, 0, ''], swG: [0, 7, 1, 0, ''],
    totL: [8, 4, 1, 0, ''], totN: [8, 4, 1, 165, ''], num: [0, 0, 1, 165, 'vc'],
    kpiN: [10, 11, 1, 167, 'centervc'], kpiNr: [17, 11, 1, 167, 'centervc'], kpiNg: [18, 11, 1, 167, 'centervc'], kpiC: [10, 11, 1, 168, 'centervc'], kpiCr: [17, 11, 1, 168, 'centervc'], kpiCg: [18, 11, 1, 168, 'centervc'], numI: [0, 0, 1, 167, 'vc'], numIB: [8, 0, 1, 167, 'vc'], numIR: [14, 8, 1, 167, 'vc'], cellBW: [9, 0, 1, 0, 'wrapvc'], thead: [3, 2, 1, 0, 'centerwrap'], td: [0, 0, 1, 0, 'wrapvc'], tdZ: [0, 11, 1, 0, 'wrapvc'], tdB: [9, 0, 1, 0, 'wrapvc'], tdBZ: [9, 11, 1, 0, 'wrapvc'], tdC: [0, 0, 1, 0, 'centervc'], tdCZ: [0, 11, 1, 0, 'centervc'], n0: [0, 0, 1, 167, 'vc'], n0Z: [0, 11, 1, 167, 'vc'], n2: [0, 0, 1, 169, 'vc'], n2Z: [0, 11, 1, 169, 'vc'], n0B: [8, 4, 1, 167, 'vc'], dt: [0, 0, 1, 164, 'centervc'], dtZ: [0, 11, 1, 164, 'centervc'], totL2: [8, 4, 1, 0, 'vc'], cellZ: [0, 11, 1, 0, 'wrapvc'], numZ: [0, 11, 1, 165, 'vc'], numIZ: [0, 11, 1, 167, 'vc'], cellBWZ: [9, 11, 1, 0, 'wrapvc'], cellBZ: [9, 11, 1, 0, 'vc'], numIBZ: [8, 11, 1, 167, 'vc'], cover: [21, 2, 0, 0, 'vc'], coverS: [22, 2, 0, 0, 'vc'], coverL: [23, 0, 0, 0, 'vc'], coverV: [19, 0, 2, 0, 'wrapvc'], kpiT: [10, 11, 1, 0, 'centervc'], kpiTr: [17, 11, 1, 0, 'centervc'], kpiTg: [18, 11, 1, 0, 'centervc'], kpiL: [11, 11, 1, 0, 'centerwrap'],
    coverK: [24, 2, 0, 0, 'vc'], coverT: [25, 2, 0, 0, 'vc'], coverB: [26, 2, 0, 0, 'wrapvc'], coverM: [28, 2, 0, 0, 'vc'], accent: [0, 17, 0, 0, ''],
    tileV: [10, 11, 3, 0, 'centervc'], tileN: [10, 11, 3, 167, 'centervc'], tileR: [17, 11, 3, 0, 'centervc'], tileG: [18, 11, 3, 0, 'centervc'], tileA: [27, 11, 3, 0, 'centervc'], tileL: [29, 11, 4, 0, 'centerwrap'],
    lblP: [4, 4, 1, 0, 'wrapvc'], linkB: [15, 0, 1, 0, 'vc'], linkR: [15, 0, 0, 0, 'rightvc'], subW: [2, 0, 0, 0, 'wrapvc'], linkBZ: [15, 11, 1, 0, 'vc'],
    okC: [12, 10, 1, 0, 'centervc'], warnC: [13, 9, 1, 0, 'centervc'], badC: [14, 8, 1, 0, 'centervc'], noneC: [11, 7, 1, 0, 'centervc'],
    okT: [12, 10, 1, 0, 'wrapvc'], warnT: [13, 9, 1, 0, 'wrapvc'], badT: [14, 8, 1, 0, 'wrapvc'],
    gS: [16, 12, 1, 0, 'centervc'], aS: [16, 13, 1, 0, 'centervc'], rS: [16, 14, 1, 0, 'centervc'], nS: [16, 16, 1, 0, 'centervc'],
    link: [15, 0, 0, 0, 'vc'], plain: [19, 0, 0, 0, 'wrapvc'], h2: [20, 0, 0, 0, 'vc'], panel: [19, 15, 0, 0, 'wrapvc'], bar: [12, 0, 0, 0, 'vc'], barR: [14, 0, 0, 0, 'vc'], numB: [8, 0, 1, 165, ''], hi: [8, 8, 1, 0, 'centervc'], md: [8, 9, 1, 0, 'centervc'], lo: [8, 10, 1, 0, 'centervc'], ok: [8, 10, 1, 0, 'wrapvc'], bad: [8, 8, 1, 0, 'wrapvc'], cell: [0, 0, 1, 0, 'wrapvc'], cellB: [9, 0, 1, 0, 'vc'], big: [9, 6, 1, 0, 'vc']
  };
  const SN = Object.keys(STY), SI = Object.fromEntries(SN.map((k, i) => [k, i]));
  const align = a => !a ? '' : `<alignment${/center/.test(a) ? ' horizontal="center"' : /right/.test(a) ? ' horizontal="right"' : ''} vertical="center"${/wrap/.test(a) ? ' wrapText="1"' : ''}/>`;
  const NUMF = [165, 166, 167, 168, 169];
  const alignX = (a, b, n) => { if (b !== 1 || /center/.test(a || '')) return align(a); const num = NUMF.includes(n); return `<alignment horizontal="${num ? 'right' : 'left'}" vertical="center" indent="1"${/wrap/.test(a || '') ? ' wrapText="1"' : ''}/>`; };
  const stylesXml = () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${numFmts}<fonts count="${fonts.length}">${fonts.join('')}</fonts><fills count="${fills.length}">${fills.join('')}</fills><borders count="${borders.length}">${borders.join('')}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${SN.length}">${SN.map(k => { const [f, fi, b, n, a] = STY[k]; return `<xf numFmtId="${n}" fontId="${f}" fillId="${fi}" borderId="${b}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1"${(a || b === 1) ? ' applyAlignment="1">' + alignX(a, b, n) + '</xf>' : '/>'}`; }).join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

  /* ---------- a sheet: rows of cells; a cell is a value or {v, s, f} ---------- */
  const serial = d => { const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(d) || []; if (!m[0]) return null; return Math.round((Date.UTC(+m[3], +m[2] - 1, +m[1]) - Date.UTC(1899, 11, 30)) / 864e5); };
  function sheetXml(sh) {
    const rows = sh.rows.map((r, i) => {
      const ht = sh.heights && sh.heights[i + 1];
      const cells = (r || []).map((c, j) => {
        if (c == null) return '';
        const o0 = typeof c === 'object' && !(c instanceof Date) ? c : { v: c }, o = typeof o0.v === 'number' && o0.v < 0 && /^(numI|n0|n2)/.test(o0.s || '') ? { ...o0, s: o0.s === 'numIR' ? 'badT' : /Z$/.test(o0.s) ? 'numZ' : 'num' } : o0, ref = colL(j) + (i + 1), s = o.s != null ? ` s="${SI[o.s] || 0}"` : '';   /* Indian grouping drops the minus sign: negatives use the standard format */
        if (o.f) return `<c r="${ref}"${s}><f>${xe(o.f)}</f></c>`;
        let v = o.v; if (v == null || v === '') return s ? `<c r="${ref}"${s}/>` : '';
        if (o.date) { const n = serial(String(v)); if (n != null) return `<c r="${ref}"${s}><v>${n}</v></c>`; }
        if (typeof v === 'number' && isFinite(v)) return `<c r="${ref}"${s}><v>${Math.round(v * 100) / 100}</v></c>`;
        return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xe(v)}</t></is></c>`;
      }).join('');
      return `<row r="${i + 1}"${ht ? ` ht="${ht}" customHeight="1"` : ''}>${cells}</row>`;
    }).join('');
    const fr = sh.freeze || {}, pane = fr.row || fr.col ? `<pane${fr.col ? ` xSplit="${fr.col}"` : ''}${fr.row ? ` ySplit="${fr.row}"` : ''} topLeftCell="${colL(fr.col || 0)}${(fr.row || 0) + 1}" activePane="${fr.row && fr.col ? 'bottomRight' : fr.row ? 'bottomLeft' : 'topRight'}" state="frozen"/>` : '';
    const dv = (sh.lists || []).map(d => `<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorStyle="warning" errorTitle="Not in the list" error="${xe(d.err || 'Pick a value from the list.')}" sqref="${d.ref}"><formula1>${xe(d.src)}</formula1></dataValidation>`);
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr>${sh.tab ? `<tabColor rgb="${sh.tab}"/>` : ''}<pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0" showGridLines="${sh.grid ? 1 : 0}"${sh.zoom ? ` zoomScale="${sh.zoom}"` : ''}>${pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="16"/><cols>${(sh.w || []).map((x, j) => `<col min="${j + 1}" max="${j + 1}" width="${x}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData>${sh.filter ? `<autoFilter ref="${sh.filter}"/>` : ''}${(sh.merges || []).length ? `<mergeCells count="${sh.merges.length}">${sh.merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''}${dv.length ? `<dataValidations count="${dv.length}">${dv.join('')}</dataValidations>` : ''}<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>${sh.foot ? `<headerFooter><oddFooter>&amp;L&amp;8${xe(sh.foot)}&amp;R&amp;8Page &amp;P of &amp;N</oddFooter></headerFooter>` : ''}${(sh.breaks || []).length ? `<rowBreaks count="${sh.breaks.length}" manualBreakCount="${sh.breaks.length}">${sh.breaks.map(r => `<brk id="${r}" max="16383" man="1"/>`).join('')}</rowBreaks>` : ''}${(sh.images || []).length ? '<drawing r:id="rId1"/>' : ''}</worksheet>`;
  }
  /* ---------- pictures (client logo): sh.images = [{png: Uint8Array, x, y, w, h}] in pixels from the sheet's top-left ---------- */
  const EMU = 9525, colPx = w => Math.trunc(w * 7 + 5), rowPx = pt => pt * 4 / 3;
  function place(sh, x, y) {
    let c = 0, left = x; for (;;) { const p = colPx(sh.w && sh.w[c] != null ? sh.w[c] : 8.43); if (left < p || c > 200) break; left -= p; c++; }
    let r = 0, top = y; for (;;) { const p = rowPx((sh.heights && sh.heights[r + 1]) || 16); if (top < p || r > 2000) break; top -= p; r++; }
    return { c, cOff: Math.round(left * EMU), r, rOff: Math.round(top * EMU) };
  }
  function drawingXml(sh, rid) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${sh.images.map((im, i) => {
      const p = place(sh, im.x, im.y), cx = Math.round(im.w * EMU), cy = Math.round(im.h * EMU);
      return `<xdr:oneCellAnchor><xdr:from><xdr:col>${p.c}</xdr:col><xdr:colOff>${p.cOff}</xdr:colOff><xdr:row>${p.r}</xdr:row><xdr:rowOff>${p.rOff}</xdr:rowOff></xdr:from><xdr:ext cx="${cx}" cy="${cy}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${i + 2}" name="Picture ${i + 1}" descr="${xe(im.alt || 'Logo')}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId${rid[i]}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;
    }).join('')}</xdr:wsDr>`;
  }
  const relsXml = L => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${L.map(([id, type, t]) => `<Relationship Id="rId${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${t}"/>`).join('')}</Relationships>`;

  function book(sheets) {
    /* one media file per distinct picture; one drawing per sheet that has pictures */
    const media = [], pics = [], drawn = [];
    sheets.forEach((s, i) => {
      if (!(s.images || []).length) return;
      const rid = [], seen = new Map();
      for (const im of s.images) { let m = media.indexOf(im.png); if (m < 0) { media.push(im.png); m = media.length - 1; } if (!seen.has(m)) seen.set(m, seen.size + 1); rid.push(seen.get(m)); }
      drawn.push(i); const d = drawn.length;
      pics.push([`xl/worksheets/_rels/sheet${i + 1}.xml.rels`, relsXml([[1, 'drawing', `../drawings/drawing${d}.xml`]])],
        [`xl/drawings/drawing${d}.xml`, drawingXml(s, rid)],
        [`xl/drawings/_rels/drawing${d}.xml.rels`, relsXml([...seen].map(([m, id]) => [id, 'image', `../media/image${m + 1}.png`]))]);
    });
    media.forEach((m, i) => pics.push([`xl/media/image${i + 1}.png`, m]));
    const files = [
      ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${media.length ? '<Default Extension="png" ContentType="image/png"/>' : ''}<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}${drawn.map((_, d) => `<Override PartName="/xl/drawings/drawing${d + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`).join('')}</Types>`],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${sheets.map((s, i) => `<sheet name="${xe(s.name.slice(0, 31))}" sheetId="${i + 1}"${s.hidden ? ' state="hidden"' : ''} r:id="rId${i + 1}"/>`).join('')}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`],
      ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
      ['xl/styles.xml', stylesXml()],
      ...sheets.map((s, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)]),
      ...pics
    ];
    return zip(files);
  }

  window.SA_XLSX = { book };
})();
