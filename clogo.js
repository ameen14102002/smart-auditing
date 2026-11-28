/* Smart Auditing — client logos (owner, 28 Nov 2026): "the logo should be perfectly edited and fix in app and report and not just
   paste the logo image i have given".
   Paste (Ctrl+V), drop or choose an image (a Google image or a screenshot). The app removes a plain background, crops to the logo,
   drops stray bits of the page, sizes and sharpens it, and puts it on a tile (white, or dark for a white logo) so it never
   disappears. The editor shows the result where it will be used; Save keeps ONE finished version on the client master:
     c.logo = { img: transparent PNG (for re-editing), w, h, tile, xl: the finished logo on its tile (PNG), xw, xh, set, at }
   The finished tile (xl) is what every screen, the HTML report and the Excel report show, so they always look the same.
   Pure image steps are in LOGO (testable without a browser); the dialog needs a DOM. */
(function () {
  'use strict';
  const NAVY = '#102347';
  const DEF = { bg: 45, holes: 'auto', specks: true, pad: 12, tile: 'auto', crop: null };

  /* ---------- pure steps on RGBA arrays ---------- */
  const dist = (d, i, b) => { const r = d[i] - b[0], g = d[i + 1] - b[1], bl = d[i + 2] - b[2]; return Math.sqrt(r * r + g * g + bl * bl); };
  const lum = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  /* the background: the colour of the image's edge, and whether the edge is plain (one colour) or already transparent */
  function edgeColour(d, w, h) {
    const px = [];
    const add = (x, y) => px.push((y * w + x) * 4);
    for (let x = 0; x < w; x++) { add(x, 0); add(x, h - 1); }
    for (let y = 1; y < h - 1; y++) { add(0, y); add(w - 1, y); }
    const clear = px.filter(i => d[i + 3] < 16).length;
    if (clear / px.length > 0.5) return { transparent: true, plain: true, c: [255, 255, 255] };
    const op = px.filter(i => d[i + 3] >= 16), med = k => { const a = op.map(i => d[i + k]).sort((p, q) => p - q); return a[a.length >> 1] || 0; };
    const c = [med(0), med(1), med(2)], near = op.filter(i => dist(d, i, c) < 32).length;
    return { transparent: false, plain: near / Math.max(1, op.length) >= 0.6, share: near / Math.max(1, op.length), c };
  }

  /* make the background transparent: flood from the edges (and, if asked, every pixel of that colour, for the inside of O, A, B),
     with a soft, colour-cleaned edge so there is no white halo */
  function removeBg(d, w, h, bg, strength, holes) {
    if (strength <= 0) return 0;
    const tol = 8 + strength * 1.1, soft = tol * 0.9, N = w * h, seen = new Uint8Array(N), st = new Int32Array(N);
    let sp = 0, removed = 0;
    const clean = (i, a) => {   // a = alpha 0..1 that remains; take the background's share out of the colour
      for (let k = 0; k < 3; k++) d[i + k] = Math.max(0, Math.min(255, Math.round((d[i + k] - bg[k] * (1 - a)) / Math.max(a, 0.05))));
      d[i + 3] = Math.round(d[i + 3] * a);
    };
    const visit = p => {
      if (seen[p]) return; seen[p] = 1; const i = p * 4;
      if (d[i + 3] < 16) { st[sp++] = p; return; }
      const e = dist(d, i, bg);
      if (e <= tol) { d[i + 3] = 0; removed++; st[sp++] = p; }
      else if (e <= tol + soft) clean(i, (e - tol) / soft);
    };
    for (let x = 0; x < w; x++) { visit(x); visit((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { visit(y * w); visit(y * w + w - 1); }
    while (sp) {
      const p = st[--sp], x = p % w, y = (p - x) / w;
      if (x > 0) visit(p - 1); if (x < w - 1) visit(p + 1); if (y > 0) visit(p - w); if (y < h - 1) visit(p + w);
    }
    if (holes) removed += keyAll(d, w, h, bg, strength, seen);
    return removed;
  }
  /* every pixel of the background colour, wherever it is (the inside of O, A, B) */
  function keyAll(d, w, h, bg, strength, seen) {
    const tol = 8 + strength * 1.1, soft = tol * 0.9; let n = 0;
    for (let p = 0; p < w * h; p++) {
      if (seen && seen[p]) continue; const i = p * 4; if (d[i + 3] < 16) continue;
      const e = dist(d, i, bg);
      if (e <= tol) { d[i + 3] = 0; n++; }
      else if (e <= tol + soft) { const a = (e - tol) / soft; for (let k = 0; k < 3; k++) d[i + k] = Math.max(0, Math.min(255, Math.round((d[i + k] - bg[k] * (1 - a)) / Math.max(a, 0.05)))); d[i + 3] = Math.round(d[i + 3] * a); }
    }
    return n;
  }

  /* what is logo: visible pixels, and (when nothing was removed) pixels that differ from the background */
  function fgMask(d, w, h, bg, keyed) {
    const m = new Uint8Array(w * h);
    for (let p = 0, i = 0; p < m.length; p++, i += 4) m[p] = d[i + 3] > 40 && (keyed || !bg.plain || dist(d, i, bg.c) > 26) ? 1 : 0;
    return m;
  }

  /* stray bits: keep the logo's own parts (big ones, and small ones such as the dot of an i that sit with them), drop the rest */
  function dropSpecks(d, w, h, m) {
    const N = w * h, lab = new Int32Array(N), st = new Int32Array(N), C = [];
    for (let s = 0; s < N; s++) {
      if (!m[s] || lab[s]) continue;
      const id = C.length + 1, c = { id, n: 0, x0: w, y0: h, x1: 0, y1: 0 }; let sp = 0; st[sp++] = s; lab[s] = id;
      while (sp) {
        const p = st[--sp], x = p % w, y = (p - x) / w; c.n++;
        if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
        const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
        for (const q of nb) if (q >= 0 && m[q] && !lab[q]) { lab[q] = id; st[sp++] = q; }
      }
      C.push(c);
    }
    if (C.length < 2) return 0;
    const big = Math.max(...C.map(c => c.n)), keep = new Uint8Array(C.length + 1);
    let B = null;
    for (const c of C) if (c.n >= big * 0.04) { keep[c.id] = 1; B = B ? { x0: Math.min(B.x0, c.x0), y0: Math.min(B.y0, c.y0), x1: Math.max(B.x1, c.x1), y1: Math.max(B.y1, c.y1) } : { ...c }; }
    const mx = (B.x1 - B.x0 + 1) * 0.12 + 2, my = (B.y1 - B.y0 + 1) * 0.12 + 2;
    for (const c of C) if (!keep[c.id] && c.n >= 3 && c.x1 >= B.x0 - mx && c.x0 <= B.x1 + mx && c.y1 >= B.y0 - my && c.y0 <= B.y1 + my) keep[c.id] = 1;
    let dropped = 0;
    for (let p = 0; p < N; p++) if (lab[p] && !keep[lab[p]]) { m[p] = 0; d[p * 4 + 3] = 0; dropped++; }
    return dropped;
  }

  const bbox = (m, w, h) => { let x0 = w, y0 = h, x1 = -1, y1 = -1; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }; };

  /* a white (or nearly white) logo would vanish on a white tile */
  function lightness(d, m) { let s = 0, n = 0, hi = 0; for (let p = 0, i = 0; p < m.length; p++, i += 4) if (m[p]) { const a = d[i + 3] / 255, l = lum(d[i], d[i + 1], d[i + 2]); s += l * a; n += a; if (l > 0.86) hi += a; } return { avg: n ? s / n : 0, hi: n ? hi / n : 0 }; }

  /* the whole clean-up on one RGBA image; returns the logo's box and facts for the editor */
  function process(d, w, h, set) {
    const bg = edgeColour(d, w, h);
    const keyedStrength = bg.transparent ? 0 : (bg.plain ? set.bg : Math.min(set.bg, 15));
    let removed = removeBg(d, w, h, bg.c, keyedStrength, set.holes === true);
    const keyed = bg.transparent || removed > 0;
    /* automatic: on a white or near-white page, the background left inside letters is cleared too, unless the logo itself is light
       (white lettering) or a dark tile was chosen, where those pixels may be part of the logo */
    let holes = set.holes === true;
    if (set.holes === 'auto' && removed > 0 && lum(...bg.c) > 0.9 && set.tile !== 'dark') {
      let m0 = fgMask(d, w, h, bg, true), L0 = lightness(d, m0);
      if (!(L0.avg > 0.8 || L0.hi > 0.7)) { removed += keyAll(d, w, h, bg.c, keyedStrength); holes = true; }
    }
    const m = fgMask(d, w, h, bg, keyed);
    const dropped = set.specks && keyed ? dropSpecks(d, w, h, m) : 0;
    const box = bbox(m, w, h);
    const L = lightness(d, m);
    return { box, bg, keyed, removed, dropped, holes, light: L.avg > 0.8 || L.hi > 0.7 };
  }

  /* ---------- canvas side ---------- */
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  const ctx2 = c => c.getContext('2d', { willReadFrequently: true });

  function sharpen(c, amt) {   // light unsharp mask after enlarging
    const g = ctx2(c), im = g.getImageData(0, 0, c.width, c.height), s = im.data, o = new Uint8ClampedArray(s), w = c.width, h = c.height;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4; if (s[i + 3] < 8) continue;
      for (let k = 0; k < 3; k++) { const b = (s[i - 4 + k] + s[i + 4 + k] + s[i - w * 4 + k] + s[i + w * 4 + k]) / 4; o[i + k] = s[i + k] + amt * (s[i + k] - b); }
    }
    im.data.set(o); g.putImageData(im, 0, 0);
  }

  /* source image -> finished transparent logo canvas (+ facts) */
  function cleanLogo(src, set) {
    let sx = 0, sy = 0, sw = src.width, sh = src.height;
    if (set.crop && set.crop.w > 4 && set.crop.h > 4) { sx = Math.max(0, Math.round(set.crop.x)); sy = Math.max(0, Math.round(set.crop.y)); sw = Math.min(src.width - sx, Math.round(set.crop.w)); sh = Math.min(src.height - sy, Math.round(set.crop.h)); }
    const work = mk(sw, sh), g = ctx2(work); g.drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);
    const im = g.getImageData(0, 0, sw, sh), info = process(im.data, sw, sh, set);
    g.putImageData(im, 0, 0);
    if (!info.box) return { canvas: null, info };
    const b = info.box, k = Math.min(720 / b.w, 280 / b.h), out = mk(b.w * k, b.h * k), o = ctx2(out);
    o.imageSmoothingEnabled = true; o.imageSmoothingQuality = 'high';
    if (k > 1.5) {   // enlarge in two steps, then sharpen a little
      const mid = mk(b.w * Math.sqrt(k), b.h * Math.sqrt(k)), mg = ctx2(mid); mg.imageSmoothingQuality = 'high';
      mg.drawImage(work, b.x, b.y, b.w, b.h, 0, 0, mid.width, mid.height); o.drawImage(mid, 0, 0, out.width, out.height); sharpen(out, 0.45);
    } else o.drawImage(work, b.x, b.y, b.w, b.h, 0, 0, out.width, out.height);
    info.small = b.h < 40 || b.w * b.h < 6000;   // the pasted logo itself was tiny: a bigger image gives a sharper result
    info.srcBox = { w: b.w, h: b.h };
    return { canvas: out, info };
  }

  /* the logo on its tile: one fixed shape, the logo centred with even space around it, rounded corners */
  function tileOf(logo, colour, padPct) {
    const H = 240, pad = Math.round(H * padPct / 100), innerH = H - 2 * pad, ar = logo.width / logo.height;
    let lh = innerH, lw = lh * ar; const maxW = H * 3.4 - 2 * pad; if (lw > maxW) { lw = maxW; lh = lw / ar; }
    const W = Math.max(H, Math.round(lw + 2 * pad)), c = mk(W, H), g = ctx2(c), r = H * 0.14;
    g.fillStyle = colour; g.beginPath(); g.moveTo(r, 0); g.arcTo(W, 0, W, H, r); g.arcTo(W, H, 0, H, r); g.arcTo(0, H, 0, 0, r); g.arcTo(0, 0, W, 0, r); g.closePath(); g.fill();
    g.strokeStyle = colour.toLowerCase() === '#ffffff' ? 'rgba(16,35,71,.14)' : 'rgba(255,255,255,.35)'; g.lineWidth = 3; g.stroke();
    g.imageSmoothingQuality = 'high'; g.drawImage(logo, (W - lw) / 2, (H - lh) / 2, lw, lh);
    return c;
  }
  const tileColour = (set, info) => set.tile === 'white' ? '#ffffff' : set.tile === 'dark' ? NAVY : (info.light ? NAVY : '#ffffff');

  function finish(src, set) {
    const r = cleanLogo(src, set); if (!r.canvas) return { info: r.info };
    const colour = tileColour(set, r.info), t = tileOf(r.canvas, colour, set.pad);
    return { logo: r.canvas, tile: t, colour, info: r.info };
  }
  function pngOf(c, maxB) { let u = c.toDataURL('image/png'); if (u.length > maxB && c.width > 200) { const s = mk(c.width * 0.7, c.height * 0.7), g = ctx2(s); g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, s.width, s.height); u = s.toDataURL('image/png'); } return u; }

  /* any image source (File/Blob or data URL) -> a canvas no larger than 1600 px */
  function loadImage(srcOrBlob) {
    return new Promise((ok, no) => {
      const url = typeof srcOrBlob === 'string' ? srcOrBlob : URL.createObjectURL(srcOrBlob), im = new Image();
      im.onload = () => { const k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight)), c = mk(im.naturalWidth * k, im.naturalHeight * k), g = ctx2(c); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, c.width, c.height); if (typeof srcOrBlob !== 'string') URL.revokeObjectURL(url); ok(c); };
      im.onerror = () => no(new Error('This is not an image the browser can read. Paste a PNG, JPG or screenshot.'));
      im.src = url;
    });
  }

  /* ---------- how the logo is shown in the app ---------- */
  const hue = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
  const initials = n => String(n || '?').replace(/\b(pvt|private|ltd|limited|llp|the|and|&|co|company)\b\.?/gi, ' ').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  window.clogo = function (c, h, o = {}) {
    if (!c) return '';
    const e = typeof esc === 'function' ? esc : String;
    if (c.logo && c.logo.xl) return `<span class="clogo${o.cls ? ' ' + o.cls : ''}" style="--h:${h}px"><img src="${c.logo.xl}" alt="${e(c.name || '')} logo" loading="lazy"></span>`;
    if (o.only) return '';
    return `<span class="clogo ini${o.cls ? ' ' + o.cls : ''}" style="--h:${h}px;--hue:${hue(c.name || c.id)}" aria-hidden="true">${e(initials(c.name))}</span>`;
  };
  /* the PNG bytes of the finished tile, for the Excel writer */
  window.clogoPng = function (c) {
    const u = c && c.logo && c.logo.xl; if (!u || !/^data:image\/png;base64,/.test(u)) return null;
    const b = atob(u.split(',')[1]), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
    return { png: a, w: c.logo.xw, h: c.logo.xh };
  };

  /* ---------- the editor ---------- */
  const E = { cid: null, draft: false, src: null, set: { ...DEF }, out: null, drag: null };
  let dlg = null;
  function build() {
    if (dlg) return dlg;
    dlg = document.createElement('dialog'); dlg.className = 'logodlg'; dlg.setAttribute('aria-labelledby', 'lgT');
    dlg.innerHTML = `<div class="lg-head"><h2 id="lgT">Client logo</h2><button type="button" class="btn ghost sm" data-lg="close" aria-label="Close">✕</button></div>
    <div class="lg-body">
      <div class="lg-col">
        <div class="lg-lab">Your image <span class="small muted">· drag on it to crop · double-click to undo the crop</span></div>
        <div class="lg-src" id="lgSrcBox"><canvas id="lgSrc"></canvas><div class="lg-empty" id="lgEmpty"><b>Paste the logo here</b><span>Copy the image in Google (right-click → Copy image) or take a screenshot (Win+Shift+S), then press Ctrl+V. You can also drop a file or choose one.</span></div></div>
        <div class="row" style="margin-top:8px;gap:8px"><label class="btn ghost sm">Choose image<input type="file" accept="image/*" id="lgFile" hidden></label><span class="small muted">or press Ctrl+V to replace it</span></div>
        <div class="lg-ctl">
          <label class="f">Background removal <span class="small muted" id="lgBgNote"></span><input type="range" id="lgBg" min="0" max="100" step="1"><span class="lg-scale"><span>Off</span><span>Strong</span></span></label>
          <label class="cb"><input type="checkbox" id="lgHoles">Also clear the background inside letters (O, A, B…)</label>
          <label class="cb"><input type="checkbox" id="lgSpecks">Remove stray bits around the logo</label>
          <label class="f">Space around the logo<input type="range" id="lgPad" min="4" max="26" step="1"></label>
          <div class="f">Tile behind the logo<div class="seg" role="group" aria-label="Tile">${[['auto', 'Automatic'], ['white', 'White'], ['dark', 'Dark']].map(([k, t]) => `<button type="button" data-lg="tile" data-v="${k}">${t}</button>`).join('')}</div></div>
        </div>
      </div>
      <div class="lg-col">
        <div class="lg-lab">Finished logo</div>
        <div class="lg-out"><img id="lgOut" alt="Finished logo"></div>
        <div id="lgWarn"></div>
        <div class="lg-lab" style="margin-top:14px">How it will look</div>
        <div class="lg-prev">
          <div class="lg-pv"><span class="small muted">Client list</span><div class="lg-card"><span class="lg-pimg" data-h="40"></span><b id="lgN1"></b></div></div>
          <div class="lg-pv"><span class="small muted">Client page</span><div class="lg-card"><span class="lg-pimg" data-h="56"></span><b style="font-size:20px" id="lgN2"></b></div></div>
          <div class="lg-pv"><span class="small muted">Excel report: cover</span><div class="lg-xl cover"><div><b>Internal Audit Report</b><small id="lgN3"></small></div><span class="lg-pimg" data-h="70"></span></div></div>
          <div class="lg-pv"><span class="small muted">Excel report: every sheet</span><div class="lg-xl"><div><b>Procedure sheet title</b></div><span class="lg-pimg" data-h="30"></span></div></div>
        </div>
      </div>
    </div>
    <div class="lg-foot"><button type="button" class="btn ghost warn" data-lg="remove" id="lgRemove">Remove logo</button><span class="sp"></span><button type="button" class="btn ghost" data-lg="reset">Reset to automatic</button><button type="button" class="btn ghost" data-lg="close">Cancel</button><button type="button" class="btn" data-lg="save" id="lgSave">Save logo</button></div>`;
    document.body.appendChild(dlg);
    dlg.addEventListener('click', ev => { const b = ev.target.closest('[data-lg]'); if (!b) { if (ev.target === dlg) close(); return; } const k = b.dataset.lg;
      if (k === 'close') close(); else if (k === 'save') save(); else if (k === 'remove') remove(); else if (k === 'reset') { E.set = { ...DEF }; sync(); redo(); } else if (k === 'tile') { E.set.tile = b.dataset.v; sync(); redo(); } });
    dlg.addEventListener('cancel', ev => { ev.preventDefault(); close(); });
    const $$ = id => dlg.querySelector('#' + id);
    $$('lgBg').addEventListener('input', e => { E.set.bg = +e.target.value; redoSoon(); });
    $$('lgPad').addEventListener('input', e => { E.set.pad = +e.target.value; redoSoon(); });
    $$('lgHoles').addEventListener('change', e => { E.set.holes = e.target.checked; redo(); });
    $$('lgSpecks').addEventListener('change', e => { E.set.specks = e.target.checked; redo(); });
    $$('lgFile').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) take(f); });
    const box = $$('lgSrcBox');
    box.addEventListener('dragover', e => { e.preventDefault(); box.classList.add('over'); });
    box.addEventListener('dragleave', () => box.classList.remove('over'));
    box.addEventListener('drop', e => { e.preventDefault(); box.classList.remove('over'); const f = [...(e.dataTransfer.files || [])].find(f => /^image\//.test(f.type)); if (f) take(f); });
    const cv = $$('lgSrc'), pt = e => { const r = cv.getBoundingClientRect(), k = E.src.width / r.width; return { x: Math.max(0, Math.min(E.src.width, (e.clientX - r.left) * k)), y: Math.max(0, Math.min(E.src.height, (e.clientY - r.top) * k)) }; };
    cv.addEventListener('pointerdown', e => { if (!E.src) return; cv.setPointerCapture(e.pointerId); E.drag = { a: pt(e), b: pt(e) }; });
    cv.addEventListener('pointermove', e => { if (!E.drag) return; E.drag.b = pt(e); drawSrc(); });
    cv.addEventListener('pointerup', () => { if (!E.drag) return; const { a, b } = E.drag; E.drag = null; const c = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) }; if (c.w > 8 && c.h > 8) E.set.crop = c; drawSrc(); redo(); });
    cv.addEventListener('dblclick', () => { E.set.crop = null; drawSrc(); redo(); });
    return dlg;
  }
  const q = id => dlg.querySelector('#' + id);
  function sync() {
    q('lgBg').value = E.set.bg; q('lgPad').value = E.set.pad; q('lgHoles').checked = E.set.holes; q('lgSpecks').checked = E.set.specks;
    dlg.querySelectorAll('[data-lg="tile"]').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === E.set.tile));
  }
  function drawSrc() {
    const cv = q('lgSrc'); q('lgEmpty').hidden = !!E.src; cv.hidden = !E.src; if (!E.src) return;
    cv.width = E.src.width; cv.height = E.src.height; const g = cv.getContext('2d'); g.drawImage(E.src, 0, 0);
    const c = E.drag ? { x: Math.min(E.drag.a.x, E.drag.b.x), y: Math.min(E.drag.a.y, E.drag.b.y), w: Math.abs(E.drag.a.x - E.drag.b.x), h: Math.abs(E.drag.a.y - E.drag.b.y) } : E.set.crop;
    if (c) { g.fillStyle = 'rgba(16,35,71,.45)'; g.beginPath(); g.rect(0, 0, cv.width, cv.height); g.rect(c.x, c.y, c.w, c.h); g.fill('evenodd'); g.strokeStyle = '#2f4bd8'; g.lineWidth = Math.max(2, cv.width / 300); g.setLineDash([8, 6]); g.strokeRect(c.x, c.y, c.w, c.h); }
  }
  function redoSoon() { clearTimeout(redoSoon.t); redoSoon.t = setTimeout(redo, 60); }
  function redo() {
    const warn = q('lgWarn'), img = q('lgOut'), save = q('lgSave');
    if (!E.src) { E.out = null; img.removeAttribute('src'); warn.innerHTML = ''; save.disabled = true; dlg.querySelectorAll('.lg-pimg').forEach(s => s.innerHTML = ''); return; }
    let r; try { r = finish(E.src, E.set); } catch (e) { console.error(e); warn.innerHTML = '<div class="banner err">Could not process this image.</div>'; return; }
    E.out = r; save.disabled = !r.tile;
    const i = r.info, W = [];
    q('lgHoles').checked = !!i.holes;
    q('lgBgNote').textContent = i.bg.transparent ? '· the image already has no background' : i.bg.plain ? '· plain background found' + (i.keyed ? ' and removed' : '') : '· the background is not one colour; crop to the logo or paste a cleaner image';
    if (!r.tile) W.push(['err', 'Nothing is left of the logo. Lower the background removal.']);
    else {
      if (i.small) W.push(['', `The logo in your image is small (${i.srcBox.w}×${i.srcBox.h} px), so it was enlarged and may look soft. A bigger image (a larger Google result, or a screenshot at higher zoom) gives a sharper logo.`]);
      if (!i.bg.plain && !i.bg.transparent) W.push(['', 'The background is not one plain colour (a photo or a busy page), so it was kept. Drag on your image to crop to just the logo.']);
      if (i.dropped) W.push(['ok', 'Stray bits around the logo were removed.']);
      if (r.colour === NAVY && E.set.tile === 'auto') W.push(['ok', 'The logo is light, so it is put on a dark tile to stay visible.']);
    }
    warn.innerHTML = W.map(([k, t]) => `<div class="banner ${k}" style="margin-top:8px">${t}</div>`).join('');
    if (!r.tile) { img.removeAttribute('src'); return; }
    const u = r.tile.toDataURL('image/png'); img.src = u;
    dlg.querySelectorAll('.lg-pimg').forEach(s => { s.innerHTML = `<span class="clogo" style="--h:${s.dataset.h}px"><img src="${u}" alt=""></span>`; });
  }
  async function take(blob) {
    try { E.src = await loadImage(blob); E.set.crop = null; drawSrc(); redo(); }
    catch (e) { toast(e.message || 'Could not read the image'); }
  }
  function open(cid, opt = {}) {
    build(); E.cid = cid; E.draft = !!opt.draft;
    const c = E.draft ? { name: (document.getElementById('cf-name') || {}).value || 'New client', logo: ui.logoDraft || null } : S.clients.find(x => x.id === cid);
    if (!c) return;
    E.set = { ...DEF, ...(c.logo && c.logo.set || {}), crop: null }; E.src = null; E.out = null;
    ['lgN1', 'lgN2', 'lgN3'].forEach(id => q(id).textContent = c.name || '');
    q('lgRemove').hidden = !c.logo;
    sync(); drawSrc(); redo();
    if (!dlg.open) dlg.showModal();
    if (opt.blob) take(opt.blob);
    else if (c.logo && c.logo.img) take(c.logo.img);   // edit the saved logo (already cleaned): crop, space and tile can be changed
  }
  function close() { if (dlg && dlg.open) dlg.close(); E.src = null; E.out = null; }
  async function store(logo) {
    if (E.draft) { ui.logoDraft = logo; close(); render(); toast(logo ? 'Logo ready; it is saved with the client' : 'Logo removed'); return; }
    const c = S.clients.find(x => x.id === E.cid); if (!c) return close();
    const rec = { ...c }; if (logo) rec.logo = logo; else delete rec.logo;
    close(); await put('clients', c.id, rec); toast(logo ? 'Logo saved · shown wherever this client appears and in its reports' : 'Logo removed');
  }
  function save() {
    const r = E.out; if (!r || !r.tile) return;
    const t = r.tile, l = r.logo;
    store({ img: pngOf(l, 160000), w: l.width, h: l.height, tile: r.colour, xl: pngOf(t, 160000), xw: t.width, xh: t.height, set: { ...E.set, crop: null }, at: new Date().toISOString() });
  }
  function remove() { store(null); }

  /* ---------- wiring: buttons, paste anywhere on a client's pages, drop on the logo box ---------- */
  const where = () => { const v = ui.view; return v === 'client' || v === 'edit' ? { cid: ui.id } : v === 'new-client' ? { draft: true } : null; };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-logo]'); if (!b) return; e.preventDefault();
    const w = where(); if (!w) return; open(w.cid, { draft: w.draft });
  });
  document.addEventListener('paste', e => {
    const it = [...(e.clipboardData && e.clipboardData.items || [])].find(i => i.kind === 'file' && /^image\//.test(i.type)); if (!it) return;
    const blob = it.getAsFile(); if (!blob) return;
    if (dlg && dlg.open) { e.preventDefault(); take(blob); return; }
    const w = where(); if (!w) return;
    e.preventDefault(); open(w.cid, { draft: w.draft, blob });
  });
  document.addEventListener('dragover', e => { const d = e.target.closest('.logodrop'); if (d) { e.preventDefault(); d.classList.add('over'); } });
  document.addEventListener('dragleave', e => { const d = e.target.closest('.logodrop'); if (d) d.classList.remove('over'); });
  document.addEventListener('drop', e => {
    const d = e.target.closest('.logodrop'); if (!d) return; e.preventDefault(); d.classList.remove('over');
    const f = [...(e.dataTransfer.files || [])].find(f => /^image\//.test(f.type)); if (!f) return toast('Drop an image file (PNG or JPG)');
    const w = where(); if (w) open(w.cid, { draft: w.draft, blob: f });
  });

  /* the logo box on the client master form */
  window.logoField = function (c, draft) {
    const L = draft ? ui.logoDraft : c && c.logo, shown = L ? { name: c && c.name || '', logo: L } : null;
    return `<div class="f wide"><span>Client logo</span><button type="button" class="logodrop" data-logo="1">${shown ? clogo(shown, 56) + '<span class="small muted">Click to edit, or paste (Ctrl+V) a new one</span>' : '<b>Paste the logo here</b><span class="small muted">Copy it in Google (right-click → Copy image) or take a screenshot, then press Ctrl+V on this page. You can also drop or choose a file. The app removes the background, crops and sizes it for you.</span>'}</button></div>`;
  };

  window.LOGO = { process, edgeColour, removeBg, dropSpecks, bbox, DEF, open };
})();
