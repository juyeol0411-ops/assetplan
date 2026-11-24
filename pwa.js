/* 내 자산플랜 PWA: PIN 잠금 + 설치 안내 + google.script.run 대체 */
(function () {
  var API_URL = 'https://script.google.com/macros/s/AKfycbybea19h3baX42fyDXUwv6l0TXf8jEDdWzqGlD3ioMRqmF2g54UmxNf6o-S8WypYPdl/exec';
  var LOCK_AFTER_MS = 5 * 60 * 1000; // 백그라운드 5분 지나면 다시 잠금
  var TOKEN = sessionStorage.getItem('ap_token') || null;
  var authResolve;
  var authReady = new Promise(function (r) { authResolve = r; });
  if (TOKEN) authResolve();

  function post(body) {
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }

  function callApi(fn, args) {
    return authReady.then(function () {
      return post({ action: 'call', fn: fn, args: args, token: TOKEN });
    }).then(function (j) {
      if (j.error === 'AUTH') {
        TOKEN = null; sessionStorage.removeItem('ap_token');
        authReady = new Promise(function (r) { authResolve = r; });
        showPin();
        return callApi(fn, args);
      }
      if (!j.ok) throw new Error(j.error || '서버 오류');
      return j.result;
    });
  }

  function makeRunner(ok, fail) {
    return new Proxy({}, {
      get: function (_, name) {
        if (name === 'withSuccessHandler') return function (h) { return makeRunner(h, fail); };
        if (name === 'withFailureHandler') return function (h) { return makeRunner(ok, h); };
        if (name === 'withUserObject') return function () { return makeRunner(ok, fail); };
        return function () {
          var args = Array.prototype.slice.call(arguments);
          callApi(name, args).then(function (r) { if (ok) ok(r); })
            .catch(function (e) { if (fail) fail(e); else console.error(e); });
        };
      }
    });
  }
  window.google = window.google || {};
  window.google.script = { run: makeRunner(null, null), host: { close: function () {} } };

  /* ---------- 화면 ---------- */
  var css = '' +
    '#ap-lock,#ap-install{position:fixed;inset:0;z-index:99999;display:none;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Pretendard","Noto Sans KR",sans-serif;-webkit-user-select:none;user-select:none}' +
    '#ap-lock{background:#1f2a44;color:#fff;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}' +
    '#ap-lock .logo,#ap-install .logo{width:76px;height:76px;border-radius:20px;background:url(icon-180.png) center/cover;box-shadow:0 6px 20px rgba(0,0,0,.25)}' +
    '#ap-lock h2{font-size:20px;font-weight:700;margin:22px 0 6px}' +
    '#ap-lock p{font-size:14px;opacity:.75;margin:0;min-height:20px;text-align:center}' +
    '#ap-lock .dots{display:flex;gap:18px;margin:28px 0 36px}' +
    '#ap-lock .dots i{width:15px;height:15px;border-radius:50%;border:2px solid rgba(255,255,255,.8);display:block;transition:background .1s}' +
    '#ap-lock .dots i.on{background:#fff}' +
    '#ap-lock .dots.shake{animation:apshake .4s}' +
    '@keyframes apshake{20%,60%{transform:translateX(-10px)}40%,80%{transform:translateX(10px)}}' +
    '#ap-lock .pad{display:grid;grid-template-columns:repeat(3,78px);gap:16px 26px}' +
    '#ap-lock .pad button{width:78px;height:78px;border-radius:50%;border:0;background:rgba(255,255,255,.12);color:#fff;font-size:30px;font-weight:400;font-family:inherit;-webkit-tap-highlight-color:transparent}' +
    '#ap-lock .pad button:active{background:rgba(255,255,255,.3)}' +
    '#ap-lock .pad button.ghost{background:transparent;font-size:16px}' +
    '#ap-lock .pad button.hide{visibility:hidden}' +
    '#ap-lock .link{margin-top:26px;font-size:14px;color:rgba(255,255,255,.7);background:none;border:0;text-decoration:underline;font-family:inherit}' +
    '#ap-install{background:#f4f5fa;color:#1d2233;padding:24px}' +
    '#ap-install h2{font-size:23px;font-weight:800;margin:26px 0 10px;text-align:center}' +
    '#ap-install .sub{font-size:16px;color:#6b7080;text-align:center;line-height:1.5;margin:0 0 30px}' +
    '#ap-install ol{list-style:none;padding:0;margin:0;width:100%;max-width:420px}' +
    '#ap-install li{display:flex;gap:16px;padding:18px 0;border-bottom:1px solid #e3e5ee}' +
    '#ap-install li:last-child{border-bottom:0}' +
    '#ap-install .n{flex:none;width:34px;height:34px;border-radius:50%;background:#e4e8f7;color:#1f2a44;font-weight:800;display:flex;align-items:center;justify-content:center}' +
    '#ap-install b{display:block;font-size:17px;margin-bottom:4px}' +
    '#ap-install em{font-style:normal;color:#2f55d4}' +
    '#ap-install span.s{font-size:14px;color:#7b8090}' +
    '#ap-install svg{width:18px;height:18px;vertical-align:-3px;color:#2f55d4}' +
    '#ap-install .later{margin-top:34px;background:none;border:0;color:#6b7080;font-size:15px;text-decoration:underline;font-family:inherit}' +
    '#ap-install .btn{margin-top:28px;background:#1f2a44;color:#fff;border:0;border-radius:14px;padding:15px 28px;font-size:16px;font-weight:700;font-family:inherit}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var lock = document.createElement('div'); lock.id = 'ap-lock';
  lock.innerHTML = '<div class="logo"></div><h2 id="ap-title">PIN 번호 입력</h2><p id="ap-msg"></p>' +
    '<div class="dots" id="ap-dots"><i></i><i></i><i></i><i></i></div>' +
    '<div class="pad" id="ap-pad"></div><button class="link" id="ap-change">PIN 번호 변경</button>';
  var inst = document.createElement('div'); inst.id = 'ap-install';

  function ready(fn) { if (document.body) fn(); else document.addEventListener('DOMContentLoaded', fn); }

  /* ---------- PIN ---------- */
  var mode = 'login'; // login | setup | setup2 | change_old | change_new | change_new2
  var buf = '', first = '', oldPin = '', busy = false;
  var keys = ['1','2','3','4','5','6','7','8','9','cancel','0','del'];

  function setMsg(t, m) { document.getElementById('ap-title').textContent = t; document.getElementById('ap-msg').textContent = m || ''; }
  function drawDots() {
    var d = document.getElementById('ap-dots').children;
    for (var i = 0; i < 4; i++) d[i].className = i < buf.length ? 'on' : '';
  }
  function shake(msg) {
    var d = document.getElementById('ap-dots'); d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake');
    buf = ''; drawDots(); if (msg) document.getElementById('ap-msg').textContent = msg;
    if (navigator.vibrate) navigator.vibrate(200);
  }
  function updCancel() {
    var c = document.querySelector('#ap-pad [data-k=cancel]');
    c.className = (mode.indexOf('change') === 0) ? 'ghost' : 'ghost hide';
    document.getElementById('ap-change').style.display = mode === 'login' ? '' : 'none';
  }
  function enterMode(m) {
    mode = m; buf = ''; drawDots(); updCancel();
    var t = {
      login: ['PIN 번호 입력', '내 자산플랜을 열려면 PIN을 입력하세요'],
      setup: ['PIN 번호 만들기', '앞으로 앱을 열 때 쓸 숫자 4자리'],
      setup2: ['한 번 더 입력', '확인을 위해 같은 번호를 입력하세요'],
      change_old: ['현재 PIN 입력', '지금 쓰는 PIN을 입력하세요'],
      change_new: ['새 PIN 입력', '새로 쓸 숫자 4자리'],
      change_new2: ['새 PIN 한 번 더', '확인을 위해 같은 번호를 입력하세요']
    }[m];
    setMsg(t[0], t[1]);
  }
  function done(token) {
    TOKEN = token; sessionStorage.setItem('ap_token', token);
    sessionStorage.setItem('ap_last', Date.now());
    lock.style.display = 'none'; authResolve();
  }
  function submit() {
    var pin = buf;
    if (mode === 'setup') { first = pin; return enterMode('setup2'); }
    if (mode === 'change_old') { oldPin = pin; return enterMode('change_new'); }
    if (mode === 'change_new') { first = pin; return enterMode('change_new2'); }
    if ((mode === 'setup2' || mode === 'change_new2') && pin !== first) {
      enterMode(mode === 'setup2' ? 'setup' : 'change_new'); return shake('두 번호가 달라요. 다시 입력하세요');
    }
    var body = mode === 'login' ? { action: 'login', pin: pin }
      : mode === 'setup2' ? { action: 'setup', pin: pin }
      : { action: 'changePin', oldPin: oldPin, pin: pin };
    busy = true; document.getElementById('ap-msg').textContent = '확인 중...';
    post(body).then(function (j) {
      busy = false;
      if (j.ok) {
        if (mode === 'change_new2') { enterMode('login'); document.getElementById('ap-msg').textContent = 'PIN을 바꿨어요. 새 PIN으로 열어주세요'; return; }
        return done(j.result.token);
      }
      if (mode === 'change_new2') { enterMode('change_old'); return shake(j.error || '현재 PIN이 맞지 않아요'); }
      shake(j.error || 'PIN이 맞지 않아요');
    }).catch(function () { busy = false; shake('인터넷 연결을 확인하세요'); });
  }
  function press(k) {
    if (busy) return;
    if (k === 'del') { buf = buf.slice(0, -1); return drawDots(); }
    if (k === 'cancel') return enterMode('login');
    if (buf.length >= 4) return;
    buf += k; drawDots();
    if (buf.length === 4) setTimeout(submit, 120);
  }
  function showPin() {
    ready(function () {
      lock.style.display = 'flex';
      setMsg('잠시만요', '');
      post({ action: 'status' }).then(function (j) {
        enterMode(j.ok && j.result.hasPin ? 'login' : 'setup');
        if (j.ok && j.result.locked) document.getElementById('ap-msg').textContent = j.result.locked;
      }).catch(function () { enterMode('login'); document.getElementById('ap-msg').textContent = '인터넷 연결을 확인하세요'; });
    });
  }

  ready(function () {
    document.body.appendChild(lock); document.body.appendChild(inst);
    var pad = document.getElementById('ap-pad');
    keys.forEach(function (k) {
      var b = document.createElement('button'); b.setAttribute('data-k', k); b.type = 'button';
      b.textContent = k === 'del' ? '⌫' : k === 'cancel' ? '취소' : k;
      if (k === 'del' || k === 'cancel') b.className = 'ghost';
      b.addEventListener('click', function () { press(k); });
      pad.appendChild(b);
    });
    document.getElementById('ap-change').addEventListener('click', function () { enterMode('change_old'); });
    document.addEventListener('keydown', function (e) {
      if (lock.style.display !== 'flex') return;
      if (/^[0-9]$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('del');
    });
    if (!TOKEN) showPin();
    maybeInstallGuide();
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { sessionStorage.setItem('ap_last', Date.now()); return; }
    var last = +sessionStorage.getItem('ap_last') || 0;
    if (TOKEN && Date.now() - last > LOCK_AFTER_MS) {
      TOKEN = null; sessionStorage.removeItem('ap_token');
      authReady = new Promise(function (r) { authResolve = r; });
      showPin();
    }
  });

  /* ---------- 홈 화면 추가 안내 ---------- */
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredPrompt = e; maybeInstallGuide(); });
  var shareSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
  var plusSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
  function maybeInstallGuide() {
    if (!document.body) return;
    var standalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    if (standalone || localStorage.getItem('ap_install_later')) return;
    var ua = navigator.userAgent;
    var isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var html;
    if (isIOS) {
      html = '<div class="logo"></div><h2>홈 화면에 자산플랜을 추가해요</h2><p class="sub">앱처럼 바로 열리고, PIN으로 잠글 수 있어요.</p><ol>' +
        '<li><div class="n">1</div><div><b>아래쪽 공유 버튼 ' + shareSvg + ' 을 눌러요</b><span class="s">보이지 않으면 ···을 먼저 눌러요.</span></div></li>' +
        '<li><div class="n">2</div><div><b>목록에서 <em>홈 화면에 추가</em> ' + plusSvg + ' 를 눌러요</b><span class="s">안 보이면 목록을 아래로 내려요.</span></div></li>' +
        '<li><div class="n">3</div><div><b>오른쪽 위 <em>추가</em>를 눌러요</b><span class="s">홈 화면에 자산플랜이 생겨요. 그 앱에서 PIN을 입력해요.</span></div></li></ol>' +
        '<button class="later" id="ap-later">나중에 할게요, 브라우저에서 계속</button>';
    } else if (deferredPrompt) {
      html = '<div class="logo"></div><h2>홈 화면에 자산플랜을 추가해요</h2><p class="sub">앱처럼 바로 열리고, PIN으로 잠글 수 있어요.</p>' +
        '<button class="btn" id="ap-installbtn">홈 화면에 추가</button><button class="later" id="ap-later">나중에 할게요, 브라우저에서 계속</button>';
    } else return;
    inst.innerHTML = html; inst.style.display = 'flex';
    document.getElementById('ap-later').onclick = function () { localStorage.setItem('ap_install_later', '1'); inst.style.display = 'none'; };
    var ib = document.getElementById('ap-installbtn');
    if (ib) ib.onclick = function () { deferredPrompt.prompt(); deferredPrompt.userChoice.then(function () { inst.style.display = 'none'; }); };
  }

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
