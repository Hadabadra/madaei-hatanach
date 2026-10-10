/* app.js - shell, navigation, bridge probing and offline screen */
(function () {
  'use strict';
  var SS = (window.SS = window.SS || {});
  var ui = SS.ui;
  SS.sections = SS.sections || [];
  SS.VERSION = '1.1.0';
  SS.BRIDGE_URL = 'https://github.com/e0548433917-gif/madaei-hatanach/releases?q=bridge-v&expanded=true';

  var state = { current: null, connected: false, probeTimer: null, suspended: false, booted: false };

  SS.openUrl = async function (url) {
    if (window.Otzaria) {
      try {
        var r = await window.Otzaria.call('app.openUrl', { url: url });
        if (r && r.success === false) ui.toast('לא ניתן לפתוח את הקישור', 'error');
      } catch (e) { ui.toast('לא ניתן לפתוח את הקישור', 'error'); }
    } else {
      ui.toast('בתוך אוצריא הקישור ייפתח בדפדפן', 'info');
    }
  };

  SS.copyText = async function (text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return true; }
    } catch (e) { /* נעבור לשיטה הישנה */ }
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  };

  function sectionById(id) {
    return SS.sections.find(function (s) { return s.id === id; });
  }

  function buildNav() {
    var nav = document.getElementById('nav');
    nav.innerHTML = SS.sections.map(function (s) {
      return '<button class="nav-item" data-id="' + s.id + '">' + ui.icon(s.icon) + '<span>' + ui.esc(s.title) + '</span></button>';
    }).join('');
    nav.addEventListener('click', function (e) {
      var b = e.target.closest('.nav-item');
      if (b) show(b.dataset.id);
    });
  }

  function show(id) {
    var s = sectionById(id) || SS.sections[0];
    state.current = s.id;
    document.querySelectorAll('.nav-item').forEach(function (b) {
      b.classList.toggle('active', b.dataset.id === s.id);
      b.setAttribute('aria-current', b.dataset.id === s.id ? 'page' : 'false');
    });
    var main = document.getElementById('content');
    main.innerHTML = '';
    var wrap = ui.el('<section class="section fade-in" data-section="' + s.id + '">' +
      '<div class="section-head"><div class="section-title">' + ui.icon(s.icon) + '<h2>' + ui.esc(s.title) + '</h2></div>' +
      '<button class="btn btn-tonal btn-icon-text" data-act="refresh" title="רענון">' + ui.icon('refresh') + '<span>רענון</span></button></div>' +
      '<div class="section-body"></div></section>');
    main.appendChild(wrap);
    main.scrollTop = 0;
    var body = wrap.querySelector('.section-body');
    wrap.querySelector('[data-act=refresh]').addEventListener('click', function () {
      var btn = this;
      btn.classList.add('spinning');
      Promise.resolve(s.load(body)).finally(function () { btn.classList.remove('spinning'); });
    });
    s.mount(body);
    s.load(body);
    try { localStorage.setItem('ss.section', s.id); } catch (e) { /* ignore */ }
  }
  SS.show = show;

  function setStatus(connected) {
    var chip = document.getElementById('bridge-chip');
    var h = SS.bridge.health;
    chip.className = 'topbar-chip ' + (connected ? (h && h.kioskActive ? 'warn' : 'ok') : 'bad');
    chip.innerHTML = '<i class="dot"></i>' + (connected
      ? (h && h.kioskActive ? 'מצב נעילה פעיל' : 'הגשר מחובר') + (SS.bridge.isMock ? ' · תצוגה מקדימה' : '')
      : 'הגשר אינו מחובר');
  }
  SS.setStatus = setStatus;

  function showOffline() {
    state.connected = false;
    setStatus(false);
    document.getElementById('shell-body').hidden = true;
    var off = document.getElementById('offline');
    off.hidden = false;
    if (!off.dataset.built) {
      off.dataset.built = '1';
      off.innerHTML =
        '<div class="offline-card fade-in">' +
        '<div class="offline-art">' + ui.icon('bridge') + '</div>' +
        '<h2>צריך את גשר אוצריא</h2>' +
        '<p>כדי לשנות הגדרות של המחשב (שמע, מסך, בלוטות׳, רשת ונעילה), התוסף נעזר בתוכנה קטנה בשם <b>גשר אוצריא</b> שרצה ברקע במחשב שלכם. נראה שהיא עדיין לא מותקנת או לא פועלת.</p>' +
        '<ol class="steps">' +
        '<li>מורידים את <b>OtzariaBridge.exe</b> מהקישור למטה.</li>' +
        '<li>מפעילים אותו פעם אחת — הוא מתקין את עצמו ויעלה אוטומטית בכל הפעלה של Windows.</li>' +
        '<li>חוזרים לכאן — החיבור יזוהה מעצמו.</li></ol>' +
        '<div class="row-actions center">' +
        '<button class="btn btn-primary btn-lg" id="off-dl">' + ui.icon('download') + 'פתח בדפדפן</button>' +
        '<button class="btn btn-tonal btn-lg" id="off-copy">' + ui.icon('link') + 'העתק קישור</button>' +
        '<button class="btn btn-tonal btn-lg" id="off-retry">' + ui.icon('refresh') + 'נסה שוב</button></div>' +
        '<p class="muted small" id="off-note">בודק שוב אוטומטית כל 10 שניות…</p></div>';
      off.querySelector('#off-dl').addEventListener('click', function () { SS.openUrl(SS.BRIDGE_URL); });
      off.querySelector('#off-copy').addEventListener('click', function () {
        SS.copyText(SS.BRIDGE_URL).then(function (ok) {
          ui.toast(ok ? 'הקישור הועתק' : 'ההעתקה נכשלה: ' + SS.BRIDGE_URL, ok ? 'success' : 'error');
        });
      });
      off.querySelector('#off-retry').addEventListener('click', function () {
        var b = this; b.disabled = true;
        var note = off.querySelector('#off-note'); note.textContent = 'מחפש את הגשר…';
        connect().then(function (ok) {
          b.disabled = false;
          if (!ok) note.textContent = 'הגשר לא נמצא. בודק שוב אוטומטית כל 10 שניות…';
        });
      });
    }
    scheduleProbe();
  }

  function scheduleProbe() {
    clearTimeout(state.probeTimer);
    if (state.suspended) return;
    state.probeTimer = setTimeout(function () {
      connect().then(function (ok) { if (!ok) scheduleProbe(); });
    }, 10000);
  }

  async function connect() {
    var h = null;
    try { h = await SS.bridge.probe(); } catch (e) { h = null; }
    if (!h) { if (state.connected || !document.getElementById('offline').dataset.built) showOffline(); return false; }
    clearTimeout(state.probeTimer);
    var wasConnected = state.connected;
    state.connected = true;
    setStatus(true);
    document.getElementById('offline').hidden = true;
    document.getElementById('shell-body').hidden = false;
    if (!wasConnected) {
      var start = null;
      try { start = localStorage.getItem('ss.section'); } catch (e) { start = null; }
      var hash = (location.hash || '').replace('#', '');
      show(hash || start || (h.kioskActive ? 'kiosk' : 'audio'));
    }
    return true;
  }
  SS.reprobe = connect;

  SS.bridge.onLost = function () {
    if (!state.connected) return;
    SS.bridge.probe().then(function (h) { if (!h) showOffline(); else setStatus(true); });
  };

  async function boot(payload) {
    if (state.booted) return;
    state.booted = true;
    if (payload && payload.theme) ui.applyTheme(payload.theme);
    try { await window.I18N.init(payload); } catch (e) { /* נשארים בעברית */ }
    var lb = document.getElementById('top-lang');
    lb.textContent = window.I18N.toggleLabel();
    lb.addEventListener('click', function () { window.I18N.toggle(); });
    if (payload && payload.plugin && payload.plugin.version) SS.VERSION = payload.plugin.version;
    buildNav();
    document.getElementById('top-refresh').addEventListener('click', function () {
      if (!state.connected) { connect(); return; }
      var s = sectionById(state.current);
      var body = document.querySelector('.section-body');
      if (s && body) s.load(body);
      SS.bridge.probe().then(function (h) { setStatus(!!h); if (!h) showOffline(); });
    });
    connect();
  }

  function init() {
    if (window.Otzaria) {
      window.Otzaria.on('plugin.boot', boot);
      window.Otzaria.on('theme.changed', ui.applyTheme);
      window.Otzaria.on('plugin.suspended', function () { state.suspended = true; clearTimeout(state.probeTimer); });
      window.Otzaria.on('plugin.resumed', function () {
        state.suspended = false;
        if (!state.connected) connect(); else SS.bridge.probe().then(function (h) { if (!h) showOffline(); else setStatus(true); });
      });
    } else {
      document.body.classList.add('preview');
      if (/[?&]dark=1/.test(location.search)) document.body.classList.add('dark-mode');
      boot(null);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
