/* Smart Auditing "Navy" look (preview, 28 Nov 2026), with 1Go's 1.68 / 1.69 update as the reference (see navy.css).
   - Sign-in: a live scene drawn for Smart Auditing (not a photo, not 1Go's): ledger rows stream across a ruled floor into a
     magnifier lens and come out on the other side as ticks, i.e. checked. The story sits on the left, a glass card on the right,
     and the person who signed in last is remembered.
   - The logo and the book-and-magnifier intro keep their sequence; the intro only gets light: a spotlight on the book, the lens
     glowing while it searches, a burst and a ring when the logo appears.
   - Inside: navy menu with the scene at its foot, gold for the open page, a colour per area, working-paper background, and the
     dashboard opening on a band with the date and a greeting. Switch off with ?skin=classic (remembered). */
(function () {
  'use strict';
  let skin = 'navy';
  try { const q = new URLSearchParams(location.search).get('skin'); if (q) localStorage.setItem('sa-skin', q); skin = localStorage.getItem('sa-skin') || 'navy'; } catch (e) {}
  if (skin !== 'navy') return;
  document.documentElement.dataset.skin = 'navy';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- the scene ---------- */
  const COLS = ['56,214,180', '47,207,143', '120,160,255', '56,214,180', '233,189,86'];
  function Scene(cv, still) {
    const g = cv.getContext('2d'); let W = 0, H = 0, F = { x: 0, y: 0 }, R = 0, P = [], T = [], B = [], t0 = performance.now(), raf = 0, alive = true;
    const size = () => { const d = Math.min(2, devicePixelRatio || 1), r = cv.getBoundingClientRect(); W = r.width || innerWidth; H = r.height || innerHeight; cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0);
      F = { x: W * (W > 900 ? .525 : .5), y: H * (W > 900 ? .5 : .3) }; R = Math.max(46, Math.min(W, H) * .085); };
    const bz = (a, b, c, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; };
    const spawn = () => { const s = Math.random() < .5 ? -1 : 1, sx = W * (.02 + Math.random() * .34), sy = F.y + s * H * (.18 + Math.random() * .42);
      return { a: [sx, sy], b: [sx + W * .16, sy - s * H * .04], c: [F.x - R * 3.2, F.y + s * R * (.4 + Math.random() * .5)], t: Math.random() * .2, v: .0016 + Math.random() * .003,
        col: COLS[(Math.random() * COLS.length) | 0], dash: Math.random() < .55, w: 1 + Math.random() * 1.4, px: null, py: null }; };
    const tick = () => ({ x: F.x + R * .9, y: F.y + (Math.random() - .5) * R * 1.2, vx: .5 + Math.random() * .7, vy: (Math.random() - .5) * .25, life: 0, max: 180 + Math.random() * 120, s: 5 + Math.random() * 4 });
    for (let i = 0; i < 9; i++) B.push({ x: Math.random(), y: Math.random(), r: 30 + Math.random() * 70, v: (Math.random() - .5) * .00006, c: COLS[i % COLS.length], a: .05 + Math.random() * .07 });
    function draw(now) {
      const k = (now - t0) / 1000;
      /* night sky in navy, a teal glow behind the lens */
      let gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#040b1f'); gr.addColorStop(.55, '#07163a'); gr.addColorStop(1, '#061a33'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      gr = g.createRadialGradient(F.x, F.y, 0, F.x, F.y, Math.max(W, H) * .55); gr.addColorStop(0, 'rgba(40,180,150,.22)'); gr.addColorStop(.35, 'rgba(30,90,140,.12)'); gr.addColorStop(1, 'rgba(4,11,31,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      /* bokeh */
      for (const b of B) { b.x += b.v * 16; if (b.x < -.1) b.x = 1.1; if (b.x > 1.1) b.x = -.1; const x = b.x * W, y = b.y * H, rg = g.createRadialGradient(x, y, 0, x, y, b.r); rg.addColorStop(0, `rgba(${b.c},${b.a})`); rg.addColorStop(1, `rgba(${b.c},0)`); g.fillStyle = rg; g.beginPath(); g.arc(x, y, b.r, 0, 7); g.fill(); }
      /* the ruled floor: ledger lines in perspective, moving towards the viewer */
      g.save(); g.globalCompositeOperation = 'lighter';
      const hz = F.y + R * .2;
      for (let i = -14; i <= 14; i++) { const xb = F.x + i * W * .09; g.strokeStyle = `rgba(56,214,180,${.07 + (i === 0 ? .05 : 0)})`; g.lineWidth = 1; g.beginPath(); g.moveTo(F.x + i * 2, hz); g.lineTo(xb, H + 40); g.stroke(); }
      const off = (k * .18) % 1;
      for (let j = 0; j < 12; j++) { const p = (j + off) / 12, y = hz + (H - hz) * p * p; g.strokeStyle = `rgba(56,214,180,${.04 + .13 * p})`; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      /* the margin rule of a working paper, faint red, on the left */
      g.strokeStyle = 'rgba(220,90,90,.10)'; g.beginPath(); g.moveTo(W * .065, 0); g.lineTo(W * .065, H); g.stroke();
      /* ledger rows stream into the lens */
      while (P.length < (W > 900 ? 120 : 56)) P.push(spawn());
      for (const p of P) {
        p.t += p.v * (1 + p.t * 1.4); const x = bz(p.a[0], p.b[0], p.c[0], F.x, p.t), y = bz(p.a[1], p.b[1], p.c[1], F.y, p.t), a = Math.min(1, p.t * 3) * (1 - Math.max(0, (p.t - .82) / .18));
        if (p.px != null) { g.strokeStyle = `rgba(${p.col},${.8 * a})`; g.lineWidth = p.w * 1.3; g.lineCap = 'round'; g.beginPath(); g.moveTo(p.px, p.py); g.lineTo(x, y); g.stroke(); }
        if (!p.dash) { const rr = p.w * 5, rg = g.createRadialGradient(x, y, 0, x, y, rr); rg.addColorStop(0, `rgba(${p.col},${.9 * a})`); rg.addColorStop(1, `rgba(${p.col},0)`); g.fillStyle = rg; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
        p.px = x; p.py = y;
      }
      P = P.filter(p => p.t < 1);
      /* the lens: glass, a turning scale, a slow breathing light, the handle */
      const br = .5 + .5 * Math.sin(k * 1.6);
      gr = g.createRadialGradient(F.x, F.y, 0, F.x, F.y, R * 2.6); gr.addColorStop(0, `rgba(210,255,240,${.35 + .15 * br})`); gr.addColorStop(.28, `rgba(56,214,180,${.18 + .08 * br})`); gr.addColorStop(1, 'rgba(56,214,180,0)'); g.fillStyle = gr; g.beginPath(); g.arc(F.x, F.y, R * 2.6, 0, 7); g.fill();
      g.restore();
      g.save(); g.translate(F.x, F.y);
      g.strokeStyle = 'rgba(205,255,238,.85)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, R, 0, 7); g.stroke();
      g.strokeStyle = 'rgba(233,189,86,.75)'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, R + 7, -1.2 + k * .25, .9 + k * .25); g.stroke();
      g.rotate(k * .35); g.strokeStyle = 'rgba(205,255,238,.45)'; g.lineWidth = 1;
      for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2, l = i % 4 ? 4 : 9; g.beginPath(); g.moveTo(Math.cos(a) * (R - 6), Math.sin(a) * (R - 6)); g.lineTo(Math.cos(a) * (R - 6 - l), Math.sin(a) * (R - 6 - l)); g.stroke(); }
      g.restore();
      g.save(); g.translate(F.x, F.y); g.rotate(Math.PI / 4); g.lineCap = 'round';
      g.strokeStyle = 'rgba(205,255,238,.55)'; g.lineWidth = 7; g.beginPath(); g.moveTo(R + 4, 0); g.lineTo(R * 2.05, 0); g.stroke();
      g.strokeStyle = 'rgba(233,189,86,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(R * 1.55, -6); g.lineTo(R * 1.55, 6); g.stroke(); g.restore();
      /* checked: ticks leave the lens on the right */
      if (Math.random() < .06 && T.length < 18) T.push(tick());
      g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
      for (const q of T) { q.life++; q.x += q.vx; q.y += q.vy; const a = Math.min(1, q.life / 20) * (1 - q.life / q.max); g.strokeStyle = `rgba(95,227,180,${a})`; g.lineWidth = 2; g.beginPath(); g.moveTo(q.x - q.s, q.y); g.lineTo(q.x - q.s * .35, q.y + q.s * .6); g.lineTo(q.x + q.s, q.y - q.s * .8); g.stroke(); }
      T = T.filter(q => q.life < q.max); g.restore();
    }
    size(); addEventListener('resize', size);
    if (still) { for (let i = 0; i < 160; i++) draw(t0 + i * 16); return { stop() {} }; }
    const loop = now => { if (!alive) return; if (!cv.isConnected) { alive = false; return; } draw(now); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return { stop() { alive = false; cancelAnimationFrame(raf); } };
  }
  /* a still frame of the scene for the menu foot and the dashboard band */
  try {
    const c = document.createElement('canvas'); c.style.cssText = 'position:fixed;left:-9999px;top:0;width:1600px;height:900px'; document.body.appendChild(c);
    Scene(c, true); document.documentElement.style.setProperty('--sa-scene', `url(${c.toDataURL('image/jpeg', .86)})`); c.remove();
  } catch (e) {}

  /* ---------- the person who signed in last ---------- */
  const WHO_K = 'sa-login-who';
  const who = () => { try { return JSON.parse(localStorage.getItem(WHO_K) || 'null'); } catch (e) { return null; } };
  const ini = w => { const n = String((w && (w.name || w.email)) || '?').replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean); return ((n[0] || '?')[0] + (n.length > 1 ? n[n.length - 1][0] : (n[0] || '')[1] || '')).toUpperCase(); };
  const nameOf = w => { const n = w && (w.name || String(w.email || '').replace(/@.*/, '')); return n ? n.split(/[\s._-]+/)[0].replace(/^./, c => c.toUpperCase()) : ''; };
  document.addEventListener('click', e => { if (!e.target.closest('[data-sa-notyou]')) return; e.preventDefault(); try { localStorage.removeItem(WHO_K); } catch (x) {} ui.authEmail = ''; render(); });

  /* ---------- after every render ---------- */
  let scene = null;
  const AREA = { home: 'home', clients: 'clients', client: 'clients', edit: 'clients', 'new-client': 'clients', onboard: 'clients', roadmap: 'roadmap', audits: 'audits', audit: 'audits', vouching: 'audits', recon: 'audits', universe: 'audits', observations: 'observations', obs: 'observations', reports: 'reports', report: 'reports' };
  const _r = render;
  render = function () {
    _r();
    document.body.dataset.area = AREA[ui.view] || 'home';
    const wrap = document.querySelector('.auth-wrap');
    if (wrap) {
      if (!wrap.querySelector('.sa-flow')) { const cv = document.createElement('canvas'); cv.className = 'sa-flow'; wrap.prepend(cv); if (scene) scene.stop(); if (!RM) scene = Scene(cv); else Scene(cv, true); }
      const b = wrap.querySelector('.auth-brand');
      if (b && !b.querySelector('.kick')) { const k = document.createElement('p'); k.className = 'kick'; k.innerHTML = '<i></i>For CA firms and internal auditors'; b.querySelector('h1').before(k); }
      const h1 = b && b.querySelector('h1');
      if (h1 && !h1.querySelector('.w')) h1.innerHTML = h1.textContent.trim().split(/\s+/).map((w, i) => `<span class="w" style="--i:${i}">${w}</span>`).join(' ');
      if (h1) [...h1.querySelectorAll('.w')].forEach((s, i, a) => s.classList.toggle('em', i >= a.length - 3));
      const f = b && b.querySelector('.foot'); if (f && !f.querySelector('span')) f.innerHTML = f.textContent.split('·').map(s => `<span>${s.trim()}</span>`).join('');
      /* returning person: their name instead of the email field */
      const W = who(), form = document.getElementById('loginForm');
      if (W && W.email && form && !form.querySelector('.sa-who')) {
        const em = form.querySelector('#lg-email'); em.value = W.email; ui.authEmail = W.email; em.closest('.fld').hidden = true;
        form.insertAdjacentHTML('afterbegin', `<div class="sa-who"><div class="av">${esc(ini(W))}</div><div><div class="n">${esc(nameOf(W))}</div><div class="e">${esc(W.email)}</div></div><button type="button" data-sa-notyou>Not you?</button></div>`);
        const sub = document.querySelector('.auth-card .sub'); if (sub) sub.textContent = 'Welcome back, ' + nameOf(W) + '. Type your password to open your workspace.';
      }
      requestAnimationFrame(() => document.body.classList.add('sa-in'));
    } else {
      if (scene) { scene.stop(); scene = null; }
      document.body.classList.remove('sa-in');
      const em = typeof session !== 'undefined' && session && session.user && session.user.email;
      if (em) try { const o = who(); if (!o || o.email !== em) localStorage.setItem(WHO_K, JSON.stringify({ email: em, name: '' })); } catch (e) {}
      if (ui.view === 'home' && S.clients.length) band();
    }
  };
  function band() {
    const m = document.getElementById('main'); if (!m || m.querySelector('.sa-band')) return;
    const W = who() || (session && session.user ? { email: session.user.email } : null), nm = nameOf(W), hr = new Date().getHours(), part = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
    const open = S.observations.filter(o => o.status !== 'Closed'), hi = open.filter(o => o.rating === 'H').length, act = S.audits.filter(a => !['Reported', 'Closed'].includes(a.stage)).length;
    const el = document.createElement('section'); el.className = 'sa-band';
    el.innerHTML = `<div><span class="hk">${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span><h1>${part}${nm ? ', ' + esc(nm) : ''}</h1><p>${typeof ws !== 'undefined' && ws && ws.name ? esc(ws.name) + ' · ' : ''}${S.clients.length} client${S.clients.length === 1 ? '' : 's'} this month</p></div>
      <div class="pulse"><span><b>${act}</b>audits in progress</span><span class="${hi ? 'r' : ''}"><b>${hi}</b>high-risk open</span><span><b>${open.length}</b>open observations</span></div>`;
    const ban = m.querySelector(':scope>.banner'); ban ? ban.after(el) : m.prepend(el);
  }

  /* ---------- the intro: same sequence, more light ---------- */
  new MutationObserver(() => { const fx = document.getElementById('intro-fx'); if (fx && !fx.querySelector('.i-spot')) fx.insertAdjacentHTML('afterbegin', '<div class="i-spot"></div><div class="i-scan"></div><div class="i-burst"></div><div class="i-ring"></div><div class="i-ring r2"></div>'); })
    .observe(document.body, { childList: true, subtree: true });
})();
