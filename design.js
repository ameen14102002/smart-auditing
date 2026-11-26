/* Smart Auditing — logo, sign-in / create account / password reset, workspace setup, and motion that answers actions. */
const RECOVERY=/type=recovery/.test(location.hash);
/* the mark: the real 3D render — magnifier over the ledger — as an app icon.
   Used everywhere (sidebar, sign-in hero, favicon) so the brand is one image. */
function logoSVG(size,o={}){return `<span class="logoimg${o.draw?' draw':''}" style="width:${size}px;height:${size}px" role="img" aria-label="Smart Auditing"><span class="shine"></span></span>`}
const tickSVG=(c='#4fd39b')=>`<svg viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="10" fill="none" stroke="${c}" stroke-opacity=".35" stroke-width="1.5"/><path class="tick" pathLength="20" d="M6.5 11.5l3 3 6-7" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
(function brand(){const b=document.querySelector('.side .brand');if(b){b.innerHTML=`<span class="mark">${logoSVG(34)}</span><span>Smart Auditing<small>Monthly internal audit</small></span>`;b.title='Go to dashboard';b.addEventListener('click',e=>{if(!e.target.closest('a,button'))location.hash='#home'});}
  const fav=document.createElement('link');fav.rel='icon';fav.type='image/png';fav.href='logo-3d.png?v=3';document.head.appendChild(fav);
  const h=document.querySelector('.nav a[data-v="home"]');if(h)h.lastChild.textContent='Dashboard';})();
/* one quiet shine on the sidebar mark the first time the app shell shows this session */
let _sideShineDone=false;function sideMarkShine(){let seen=false;try{seen=sessionStorage.getItem('sa-side-shine')==='1'}catch(e){}
  if(seen||document.body.classList.contains('auth'))return;
  try{sessionStorage.setItem('sa-side-shine','1')}catch(e){}
  const m=document.querySelector('.side .brand .logoimg');if(!m)return;
  m.classList.add('draw');setTimeout(()=>m.classList.remove('draw'),1600);}

/* ---------- sign-in, create account, reset ---------- */
const DL=[.45,.7,.95,1.5,1.8,2.1],TOT=2.4;
const ledgerArt=()=>{const F='font-family="IBM Plex Sans,sans-serif"',SF='font-family="IBM Plex Serif,Georgia,serif" font-style="italic"';
 const rows=[['03 Apr','Gujarat Dyes · bill 4471','1,18,000','v'],['05 Apr','GST · March return','21,240','b'],['08 Apr','Rent · April','45,000','q'],['11 Apr','TDS 194C deposit','2,360','b'],['14 Apr','Bank charges','590','b'],['18 Apr','Kumar Transport · LR 882','36,580','v']];
 const tk=(x,y,d)=>`<path class="tick" pathLength="20" d="M${x} ${y}l4 4 9-10" fill="none" stroke="#17875a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="animation-delay:${d}s"/>`;
 const bk=(x,y,d)=>`<g class="mk" style="animation-delay:${d}s"><circle cx="${x+6}" cy="${y-1}" r="7.5" fill="none" stroke="#2f4bd8" stroke-width="1.6"/><text x="${x+6}" y="${y+3}" text-anchor="middle" ${F} font-size="10" font-weight="700" fill="#2f4bd8">B</text></g>`;
 const y0=112,h=30;
 return `<svg class="auth-art" viewBox="0 0 460 400" role="img" aria-label="An audit working paper: payments vouched and agreed to the bank statement, one entry queried, footed and reviewed">
 <g transform="rotate(4 300 150)"><rect x="150" y="18" width="290" height="230" rx="8" fill="#dfe5f5"/><text x="168" y="44" ${F} font-size="11" font-weight="600" fill="#5a6482">Bank statement · April 2026</text>
  ${[0,1,2,3,4,5].map(i=>`<line x1="168" y1="${62+i*24}" x2="422" y2="${62+i*24}" stroke="#c6cfe6"/><rect x="168" y="${68+i*24}" width="${70+((i*37)%60)}" height="6" rx="3" fill="#c6cfe6"/><rect x="${372-(i%3)*8}" y="${68+i*24}" width="${42+(i%3)*8}" height="6" rx="3" fill="#c6cfe6"/>`).join('')}</g>
 <rect x="20" y="56" width="400" height="330" rx="10" fill="#081530" opacity=".45" transform="translate(6 8)"/>
 <rect x="20" y="56" width="400" height="330" rx="10" fill="#fdfdfb"/>
 <path d="M30 56h380a10 10 0 0 1 10 10v24H20V66a10 10 0 0 1 10-10z" fill="#eef1fb"/>
 <text x="38" y="79" ${F} font-size="13" font-weight="600" fill="#102347">Payments register · April 2026</text>
 <rect x="350" y="65" width="56" height="20" rx="4" fill="none" stroke="#2f4bd8" stroke-width="1.4"/><text x="378" y="79" text-anchor="middle" ${F} font-size="11" font-weight="600" fill="#2f4bd8">W/P C-3</text>
 <line x1="62" y1="90" x2="62" y2="386" stroke="#c93a2e" stroke-opacity=".4"/>
 ${rows.map((r,i)=>{const y=y0+i*h,d=DL[i].toFixed(2);return `<line x1="20" y1="${y+11}" x2="420" y2="${y+11}" stroke="#e3e7f1"/>
  <text x="70" y="${y}" ${F} font-size="11" fill="#5a6482">${r[0]}</text><text x="118" y="${y}" ${F} font-size="12" fill="#14203d">${r[1]}</text>
  <text x="334" y="${y}" text-anchor="end" ${F} font-size="12" fill="#14203d" style="font-variant-numeric:tabular-nums">${r[2]}</text>
  ${r[3]==='v'?tk(346,y-5,d):r[3]==='b'?bk(346,y-4,d):`<ellipse class="query" cx="304" cy="${y-4}" rx="40" ry="11.5" fill="none" stroke="#c93a2e" stroke-width="1.8" pathLength="100" style="animation-delay:${d}s"/><g class="mk" style="animation-delay:${(+d+.45).toFixed(2)}s"><path d="M346 ${y-4}c10-6 18-6 24-2" fill="none" stroke="#c93a2e" stroke-width="1.3"/><text x="372" y="${y}" ${SF} font-size="12.5" fill="#c93a2e">lease?</text></g>`}`}).join('')}
 <g class="mk" style="animation-delay:${TOT}s"><text x="118" y="${y0+6*h+4}" ${F} font-size="12" font-weight="600" fill="#14203d">Total</text>
  <text x="334" y="${y0+6*h+4}" text-anchor="end" ${F} font-size="12" font-weight="600" fill="#14203d" style="font-variant-numeric:tabular-nums">2,23,770</text>
  <path d="M276 ${y0+6*h+10}h60M276 ${y0+6*h+13}h60" stroke="#14203d" stroke-width="1"/>
  <text x="352" y="${y0+6*h+4}" ${F} font-size="13" font-weight="700" fill="#17875a">Σ</text></g>
 <line x1="20" y1="${y0+6*h+30}" x2="420" y2="${y0+6*h+30}" stroke="#e3e7f1"/>
 <g ${F} font-size="10.5" fill="#5a6482"><path d="M70 ${y0+6*h+47}l3 3 7-8" fill="none" stroke="#17875a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><text x="86" y="${y0+6*h+50}">vouched to bill</text>
  <circle cx="178" cy="${y0+6*h+46}" r="6" fill="none" stroke="#2f4bd8" stroke-width="1.3"/><text x="178" y="${y0+6*h+49.5}" text-anchor="middle" font-size="8.5" font-weight="700" fill="#2f4bd8">B</text><text x="189" y="${y0+6*h+50}">agreed to bank</text>
  <text x="270" y="${y0+6*h+50}" font-weight="700" fill="#17875a" font-size="12">Σ</text><text x="282" y="${y0+6*h+50}">footed</text></g>
 <text x="70" y="${y0+6*h+72}" ${SF} font-size="12" fill="#102347">Prepared AM 12/5 · Reviewed PR 14/5</text>
 <g transform="rotate(-8 360 ${y0+6*h+66})"><g class="stamp"><rect x="306" y="${y0+6*h+50}" width="104" height="30" rx="5" fill="none" stroke="#2f4bd8" stroke-width="2"/><text x="358" y="${y0+6*h+70}" text-anchor="middle" ${F} font-size="12" font-weight="700" fill="#2f4bd8" letter-spacing="1.4">REVIEWED</text></g></g>
 <g class="pen" opacity="0"><g transform="rotate(35)"><path d="M0 0l-3.2-9h6.4z" fill="#14203d"/><rect x="-3.2" y="-40" width="6.4" height="31" rx="1" fill="#2f4bd8"/><rect x="-3.2" y="-46" width="6.4" height="6" rx="1.5" fill="#c6cfe6"/></g></g>
 </svg>`};

let _drawn=false;
function introShouldPlay(){try{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return false;
  if(sessionStorage.getItem('sa-intro-seen'))return false;
  return true;
}catch(e){return false}}
function authBrand(){let seen=false;try{seen=!!localStorage.getItem('sa-auth-seen')}catch(e){}
  const willIntro=introShouldPlay();
  const d=!willIntro&&!_drawn&&!seen;_drawn=true;if(d){try{localStorage.setItem('sa-auth-seen','1')}catch(e){}}
  return `<section class="auth-brand${d?' draw':''}"><div class="brandrow">${logoSVG(56,{draw:d})}<span class="wordmark">Smart Auditing<small>Internal audit workbench</small></span></div>
  <h1>From audit planning to the signed report.</h1>
  <p class="lede">The internal audit workbench for CA firms — every client, every month, with evidence behind every finding.</p>
  <ul><li>${tickSVG()}<span>Vouch, reconcile and analyse the books — GST, TDS, bank and ledgers tied back to source</span></li><li>${tickSVG()}<span>Raise observations with evidence, agree the reply with management, track to closure</span></li><li>${tickSVG()}<span>Re-test rectification and carry open items into next month's report</span></li></ul>
  <p class="foot">Part of the 1Go suite · Your firm's data stays in your workspace</p></section>`}
const pwField=(id,ac,label,extra='')=>`<div class="fld"><label for="${id}">${label}</label><div class="in"><input id="${id}" type="password" autocomplete="${ac}" minlength="8" required style="padding-right:64px"><button type="button" class="show" data-show="${id}" aria-label="Show password" aria-pressed="false">Show</button></div>${extra}</div>`;
vLogin=function(){
  const m=RECOVERY&&session?'reset2':ui.authMode||'in';
  const body=m==='reset2'?`<h2>Set a new password</h2><p class="sub">Choose a password of at least 8 characters.</p><form id="pwNew">${pwField('pw-new','new-password','New password','<div class="meter" aria-hidden="true"><span></span></div>')}<button class="btn wide" type="submit">Save new password</button></form>`
   :m==='reset'?`<h2>Reset your password</h2><p class="sub">We'll email you a link to set a new password.</p><form id="pwReset"><div class="fld"><label for="rs-email">Email</label><input id="rs-email" type="email" autocomplete="username email" required value="${esc(ui.authEmail||'')}"></div><button class="btn wide" type="submit">Send reset link</button></form><div class="row-between" style="margin:14px 0 0"><a href="#" data-act="authMode" data-v="in">Back to sign in</a></div>`
   :`<h2>${m==='up'?'Create your account':'Sign in'}</h2><p class="sub">${m==='up'?'Use your work email. You will confirm it from your inbox.':'Welcome back. Sign in to your firm\'s workspace.'}</p>
    <div class="auth-switch" role="group" aria-label="Sign in or create an account"><button type="button" data-act="authMode" data-v="in" aria-pressed="${m==='in'}">Sign in</button><button type="button" data-act="authMode" data-v="up" aria-pressed="${m==='up'}">Create account</button></div>
    <form id="${m==='up'?'signupForm':'loginForm'}" novalidate><div class="fld"><label for="lg-email">Email</label><input id="lg-email" type="email" autocomplete="username email" required value="${esc(ui.authEmail||'')}"></div>
     ${m==='up'?pwField('lg-pass','new-password','Password','<div class="meter" aria-hidden="true"><span></span></div><span class="hint" id="pw-hint">At least 8 characters.</span>'):pwField('lg-pass','current-password','Password')}
     ${m==='in'?'<div class="row-between"><span></span><a href="#" data-act="authMode" data-v="reset">Forgot password?</a></div>':''}
     <button class="btn wide" type="submit">${m==='up'?'Create account':'Sign in'}</button></form>`;
  return `<div class="auth-wrap">${authBrand()}<section class="auth-form"><div class="auth-card">${body}<p class="auth-msg" id="authMsg" role="status" aria-live="polite"></p>
   <p class="note">Your data stays in your firm's workspace and is shared only with the colleagues you invite. Opening Smart Auditing from its tile in 1Go signs you in with your 1Go account.</p></div></section></div>`};
vSetup=function(){
  return `<div class="auth-wrap">${authBrand()}<section class="auth-form"><div class="auth-card"><h2>Set up your firm's workspace</h2><p class="sub">A workspace holds one firm's clients, audits and reports. Colleagues join it with its join code.</p>
   <div class="ws-grid"><form class="ws-card" id="wsCreate"><h3>Create a workspace</h3><p>For a new firm or audit team.</p><div class="fld"><label for="ws-name">Firm or team name</label><input id="ws-name" required placeholder="Ameen & Associates"></div><button class="btn wide" type="submit">Create workspace</button></form>
    <form class="ws-card" id="wsJoin"><h3>Join a workspace</h3><p>Ask the workspace owner for the 10-character join code.</p><div class="fld"><label for="ws-code">Join code</label><input id="ws-code" required autocomplete="off" spellcheck="false"></div><button type="submit" class="btn ghost wide">Join workspace</button></form>
    ${wsList.length?`<div class="ws-card"><h3>Your workspaces</h3><div class="ws-list">${wsList.map(w=>`<button class="btn ghost" data-act="ws" data-id="${w.id}">${esc(w.name)}</button>`).join('')}</div></div>`:''}</div>
   <p class="auth-msg" id="authMsg" role="status" aria-live="polite"></p><p class="note">Signed in as ${esc(session?.user?.email||'')} · <a href="#" data-act="signout">Sign out</a></p></div></section></div>`};
const authMsg=(t,ok)=>{const m=document.getElementById('authMsg');if(m){m.textContent=t;m.className='auth-msg '+(ok?'ok':'err')}else toast(t)};
const ERRS=[[/invalid login credentials/i,'The email or password is not right. Check them, or reset your password.'],[/email not confirmed/i,'Confirm your email first: open the link we sent to your inbox.'],[/already registered|already been registered/i,'An account with this email already exists. Sign in instead.'],[/rate limit|too many/i,'Too many attempts. Wait a minute and try again.'],[/password should be at least|weak password/i,'Use a password of at least 8 characters.'],[/network|fetch/i,'No connection to the server. Check your internet and try again.']];
const nice=e=>{const s=String(e?.message||e||'');for(const [re,t] of ERRS)if(re.test(s))return t;return s};
const strength=p=>{let s=0;if(p.length>=8)s++;if(p.length>=12)s++;if(/[A-Z]/.test(p)&&/[a-z]/.test(p))s++;if(/\d/.test(p))s++;if(/[^A-Za-z0-9]/.test(p))s++;return s};
document.addEventListener('input',e=>{const t=e.target;if(t.id==='lg-email'||t.id==='rs-email')ui.authEmail=t.value;
  if((t.id==='lg-pass'&&document.getElementById('signupForm'))||t.id==='pw-new'){const s=strength(t.value),bar=t.closest('.fld').querySelector('.meter span');if(bar){bar.style.width=(s/5*100)+'%';bar.style.background=s<=1?'var(--hi)':s<=3?'#d39b00':'var(--ok)'}const h=document.getElementById('pw-hint');if(h)h.textContent=t.value.length<8?'At least 8 characters.':s<=2?'Fair. A longer password with numbers and symbols is stronger.':'Strong password.'}});
document.addEventListener('click',e=>{const b=e.target.closest('[data-show]');if(!b)return;const i=document.getElementById(b.dataset.show),on=i.type==='password';i.type=on?'text':'password';b.textContent=on?'Hide':'Show';b.setAttribute('aria-pressed',on);b.setAttribute('aria-label',on?'Hide password':'Show password')});
ACT.authMode=t=>{ui.authMode=t.dataset.v;render();setTimeout(()=>document.querySelector('.auth-card input')?.focus(),0)};
document.addEventListener('submit',async e=>{const f=e.target,id=f.id;if(!['loginForm','signupForm','pwReset','pwNew'].includes(id))return;e.preventDefault();e.stopImmediatePropagation();
  const btn=f.querySelector('button[type=submit]'),label=btn.textContent,busy=t=>{btn.disabled=true;btn.textContent=t},done=()=>{btn.disabled=false;btn.textContent=label};
  if(!sb)return authMsg('Sign-in works in the online version of Smart Auditing.');
  if(id==='loginForm'||id==='signupForm'){const email=val('lg-email').trim(),password=document.getElementById('lg-pass').value;
    if(!/^\S+@\S+\.\S+$/.test(email))return authMsg('Enter your email address, like name@firm.com.');if(password.length<8)return authMsg('The password needs at least 8 characters.');
    if(id==='loginForm'){busy('Signing in…');const {error}=await sb.auth.signInWithPassword({email,password});done();if(error)return authMsg(nice(error));mustSignIn=false;if(!ws)await afterLogin();go('home')}
    else{busy('Creating account…');const {data,error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}});done();if(error)return authMsg(nice(error));if(!data.session){ui.authMode='in';render();authMsg('Account created. Open the link we sent to '+email+' to confirm it, then sign in.',true)}else{mustSignIn=false;if(!ws)await afterLogin()}}}
  if(id==='pwReset'){const email=val('rs-email').trim();if(!/^\S+@\S+\.\S+$/.test(email))return authMsg('Enter your email address, like name@firm.com.');busy('Sending…');const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});done();if(error)return authMsg(nice(error));authMsg('If an account uses '+email+', a reset link is on its way. Check your inbox.',true)}
  if(id==='pwNew'){const p=document.getElementById('pw-new').value;if(p.length<8)return authMsg('The password needs at least 8 characters.');busy('Saving…');const {error}=await sb.auth.updateUser({password:p});done();if(error)return authMsg(nice(error));history.replaceState(null,'',location.pathname+'#home');location.reload()}},true);

/* the pen: works down the paper like an auditor, then lifts away */
function penRun(){const svg=document.querySelector('.auth-brand.draw .auth-art'),pen=svg&&svg.querySelector('.pen');if(!pen||matchMedia('(prefers-reduced-motion: reduce)').matches||!pen.animate)return;
  const y0=112,h=30,kind=['v','b','q','b','b','v'],T=4.5,k=[{t:.4,x:470,y:60,o:0},{t:.7,x:400,y:96,o:1}];
  kind.forEach((c,i)=>{const y=y0+i*h,d=DL[i];if(c==='q'){k.push({t:d-.02,x:344,y:y-5,o:1},{t:d+.12,x:304,y:y+8,o:1},{t:d+.25,x:265,y:y-4,o:1},{t:d+.38,x:304,y:y-16,o:1},{t:d+.45,x:372,y:y-2,o:1},{t:d+.6,x:410,y:y-1,o:1})}else{k.push({t:d-.04,x:347,y:y-2,o:1},{t:d+.14,x:360,y:y-14,o:1})}});
  k.push({t:TOT-.05,x:352,y:y0+6*h+2,o:1},{t:TOT+.15,x:362,y:y0+6*h-6,o:1},{t:4.5,x:470,y:y0+6*h+60,o:0});
  pen.animate(k.map(p=>({offset:Math.min(1,p.t/T),transform:`translate(${p.x}px,${p.y}px)`,opacity:p.o})),{duration:T*1000,easing:'linear',fill:'both'})}
document.addEventListener('pointermove',e=>{const st=document.querySelector('.auth-stage');if(!st||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const r=st.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;st.style.setProperty('--rx',(-y*4).toFixed(2)+'deg');st.style.setProperty('--ry',(x*6).toFixed(2)+'deg')});
/* ---------- opening intro: book → search → logo → wording → card ---------- */
try{if(new URLSearchParams(location.search).get('intro')==='1'){sessionStorage.removeItem('sa-intro-seen');localStorage.removeItem('sa-auth-seen')}}catch(e){}
const INTRO_BOOK_IMG=`<img src="intro-book.png?v=1" alt="" draggable="false">`;
const INTRO_MAG_IMG=`<img src="intro-mag.png?v=1" alt="" draggable="false">`;
let _introTimers=[],_introSkip=null;
function finishIntro(){
  _introTimers.forEach(clearTimeout);_introTimers=[];
  if(_introSkip){document.removeEventListener('click',_introSkip);document.removeEventListener('keydown',_introSkip);_introSkip=null}
  const wrap=document.querySelector('.auth-wrap.intro');
  try{sessionStorage.setItem('sa-intro-seen','1');localStorage.setItem('sa-auth-seen','1')}catch(e){}
  if(!wrap)return;
  wrap.classList.remove('intro','st-book','st-mag','st-search','st-logo','st-fly','st-landed','st-words','st-card');
  delete wrap.dataset.intro;
  const fx=document.getElementById('intro-fx');if(fx)fx.remove();
}
function startIntro(){
  const wrap=document.querySelector('.auth-wrap');
  if(!wrap||wrap.dataset.intro==='1'||!introShouldPlay())return;
  wrap.dataset.intro='1';
  const h1=wrap.querySelector('.auth-brand h1');
  if(h1&&!h1.querySelector('.w')){
    h1.innerHTML=h1.textContent.trim().split(/\s+/).map((w,i)=>`<span class="w" style="--i:${i}">${w}</span>`).join(' ');
  }
  const fx=document.createElement('div');
  fx.id='intro-fx';
  fx.innerHTML=`<div class="i-book">${INTRO_BOOK_IMG}</div><div class="i-mag">${INTRO_MAG_IMG}</div><div class="i-logo"><img src="logo-3d.png?v=3" alt=""></div><div class="i-shine"></div>`;
  wrap.appendChild(fx);
  wrap.classList.add('intro');
  const at=(ms,fn)=>_introTimers.push(setTimeout(()=>{if(wrap.isConnected&&wrap.classList.contains('intro'))fn()},ms));
  _introSkip=()=>finishIntro();
  document.addEventListener('click',_introSkip);
  document.addEventListener('keydown',_introSkip);
  at(80,()=>wrap.classList.add('st-book'));
  at(1500,()=>wrap.classList.add('st-mag'));
  at(2200,()=>wrap.classList.add('st-search'));
  at(5300,()=>wrap.classList.add('st-logo'));
  at(6500,()=>{
    wrap.classList.add('st-fly');
    const logo=fx.querySelector('.i-logo'),target=wrap.querySelector('.brandrow .logoimg');
    if(!logo||!target)return;
    const from=logo.getBoundingClientRect(),to=target.getBoundingClientRect();
    const dx=(to.left+to.width/2)-(from.left+from.width/2);
    const dy=(to.top+to.height/2)-(from.top+from.height/2);
    const s=to.width/Math.max(1,from.width);
    logo.style.transform=`translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) translate(-50%,-50%) scale(${s.toFixed(4)})`;
  });
  at(7900,()=>{wrap.classList.add('st-landed');wrap.classList.add('st-words');_introTimers.push(setTimeout(()=>{const f=document.getElementById('intro-fx');if(f)f.remove()},450))});
  at(11400,()=>wrap.classList.add('st-card'));
  at(12600,()=>finishIntro());
}
/* ---------- after every render: auth layout, view fade, ticks ---------- */
const _render0=render;let _lastView='';
render=function(){_render0();
  if(document.querySelector('.auth-brand.draw .pen:not(.ran)')){const p=document.querySelector('.auth-brand.draw .pen');p.classList.add('ran');penRun()}
  const auth=(mode==='supa'&&(mustSignIn||!session||!ws||(RECOVERY&&session)));document.body.classList.toggle('auth',!!auth);
  if(!auth&&!_sideShineDone){_sideShineDone=true;setTimeout(sideMarkShine,450)}
  if(RECOVERY&&session&&mode==='supa'){document.getElementById('main').innerHTML=vLogin()}
  const m=document.getElementById('main'),key=ui.view+'|'+ui.id+'|'+(ui.atab||'')+'|'+(ui.ctab||'');if(key!==_lastView){m.classList.remove('enter');void m.offsetWidth;m.classList.add('enter');_lastView=key}
  for(const b of document.querySelectorAll('.seg button.ok.on'))if(!b.querySelector('.tk'))b.insertAdjacentHTML('afterbegin','<svg class="tk" viewBox="0 0 14 14" aria-hidden="true"><path pathLength="20" d="M2.5 7.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>');
  for(const t of document.querySelectorAll('.tabs')){const on=t.querySelector('button.on');let ind=t.querySelector('.ind');if(!on){ind&&ind.remove();continue}if(!ind){ind=document.createElement('span');ind.className='ind';t.appendChild(ind);ind.style.transition='none'}const prev=t.dataset.k===t.textContent.length+'';if(!prev)ind.style.transition='none';ind.style.left=on.offsetLeft+'px';ind.style.width=on.offsetWidth+'px';t.dataset.k=t.textContent.length;if(!prev){void ind.offsetWidth;ind.style.transition=''}}
  if(ui.justTick!=null){const b=document.querySelector(`.seg button.ok.on[data-i="${ui.justTick}"]`);if(b)b.classList.add('just');ui.justTick=null}
  if(ui.justReady){for(const t of document.querySelectorAll('.tag.g'))if(/Ready to report/.test(t.textContent))t.classList.add('pop');ui.justReady=false}
  if(auth&&introShouldPlay())setTimeout(startIntro,60)};
const _res=ACT.res;ACT.res=t=>{const a=A(),i=+t.dataset.i;if(t.dataset.v==='ok'&&a.items[i].r!=='ok')ui.justTick=i;
  const before=typeof progStatus==='function'?progStatus(a,S.clients.find(c=>c.id===a.clientId)).done:false;_res(t);
  setTimeout(()=>{const b=A();if(b&&typeof progStatus==='function'&&!before&&progStatus(b,S.clients.find(c=>c.id===b.clientId)).done){ui.justReady=true;render()}},60)};
