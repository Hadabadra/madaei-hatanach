/* app.js - מסך הסייר: ניווט, רשימה, בחירה, פעולות קבצים, חיפוש זורם ומעבר אוטומטי למצב חלופי */
(function () {
  'use strict';
  var FX = window.FX = window.FX || {};
  var ui = window.SS.ui;
  FX.ui = ui;
  FX.t = window.I18N ? window.I18N.t : function (x) { return x; };
  FX.VERSION = '1.0.0';
  FX.BRIDGE_URL = 'https://github.com/e0548433917-gif/madaei-hatanach/releases?q=bridge-v&expanded=true';

  var LS = 'fx.view';
  var S = {
    prov: null, path: '', isRoot: true, known: [], entries: [], view: [],
    sel: {}, anchor: -1, focus: -1,
    back: [], fwd: [],
    sort: { key: 'name', dir: 'asc' }, showHidden: false,
    clip: null,            /* { paths, cut, kind } */
    search: null,          /* { id, query, hits, cancelled, done, scanned } */
    loadId: 0, probeTimer: null, suspended: false, booted: false, busy: false
  };
  var $ = function (id) { return document.getElementById(id); };
  var ic = function (n, c) { return FX.icon(n, c); };

  /* ---------- שמירת העדפות תצוגה (לכל צופה בנפרד) ---------- */
  function loadPrefs() {
    try {
      var v = JSON.parse(localStorage.getItem(LS) || '{}');
      if (v.sort) S.sort = v.sort;
      S.showHidden = !!v.showHidden;
      return v;
    } catch (e) { return {}; }
  }
  function savePrefs() {
    try {
      var v = JSON.parse(localStorage.getItem(LS) || '{}');
      v.sort = S.sort; v.showHidden = S.showHidden;
      if (S.prov) v['last.' + S.prov.kind] = S.path;
      localStorage.setItem(LS, JSON.stringify(v));
    } catch (e) { /* אחסון לא זמין */ }
  }

  /* ---------- פתיחת קישור והעתקה ללוח ---------- */
  async function openUrl(url) {
    if (!window.Otzaria) { ui.toast('בתוך אוצריא הקישור ייפתח בדפדפן', 'info'); return; }
    try {
      var r = await window.Otzaria.call('app.openUrl', { url: url });
      if (r && r.success === false) ui.toast('לא ניתן לפתוח את הקישור', 'error');
    } catch (e) { ui.toast('לא ניתן לפתוח את הקישור', 'error'); }
  }
  async function copyText(text) {
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
  }

  /* ---------- חיבור לגשר ומעבר אוטומטי ---------- */
  function setChip() {
    var c = $('fx-chip');
    var bridge = S.prov && S.prov.kind === 'bridge';
    c.className = 'topbar-chip ' + (bridge ? 'ok' : 'warn');
    c.innerHTML = '<i class="dot"></i>' + (bridge ? 'מחובר לגשר' : 'מצב מוגבל');
    c.title = bridge ? 'גשר אוצריא פועל' : 'גשר אוצריא לא נמצא — עובדים על תיקיות שאושרו בלבד';
  }

  function showBanner(on) {
    var b = $('fx-banner');
    b.hidden = !on;
    if (!on || b.dataset.built) return;
    b.dataset.built = '1';
    b.innerHTML =
      '<span class="fx-banner-ic">' + ic('plug') + '</span>' +
      '<div class="fx-banner-text"><b>גשר אוצריא לא נמצא.</b> ' +
      '<span>בלעדיו אפשר לעבוד רק על תיקיות שאישרתם, בלי העתקה ויצירת קבצים. מורידים את <b>OtzariaBridge.exe</b>, מפעילים פעם אחת, והחיבור יזוהה מעצמו.</span></div>' +
      '<div class="fx-banner-actions">' +
      '<button class="btn btn-primary" id="fx-dl">' + ic('open') + 'פתח בדפדפן</button>' +
      '<button class="btn btn-tonal" id="fx-copy-link">' + ic('link') + 'העתק קישור</button>' +
      '<button class="btn btn-text" id="fx-retry">' + ic('refresh') + 'נסה שוב</button></div>';
    $('fx-dl').addEventListener('click', function () { openUrl(FX.BRIDGE_URL); });
    $('fx-copy-link').addEventListener('click', async function () {
      var ok = await copyText(FX.BRIDGE_URL);
      ui.toast(ok ? 'הקישור הועתק' : 'ההעתקה נכשלה: ' + FX.BRIDGE_URL, ok ? 'success' : 'error');
    });
    $('fx-retry').addEventListener('click', function () {
      var btn = this; btn.disabled = true;
      connect(true).then(function (ok) {
        btn.disabled = false;
        if (!ok) ui.toast('הגשר עדיין לא נמצא', 'info');
      });
    });
  }

  function scheduleProbe() {
    clearTimeout(S.probeTimer);
    if (S.suspended) return;
    S.probeTimer = setTimeout(function () {
      connect(false).then(function (ok) { if (!ok) scheduleProbe(); });
    }, 15000);
  }

  async function setProvider(p) {
    cancelSearch();
    if (p.kind === 'fallback') await p.init();
    S.prov = p;
    S.back = []; S.fwd = []; S.clip = null;
    setChip();
    renderCmds();
    var prefs = loadPrefs();
    $('fx-hidden').hidden = !p.caps.hidden;
    $('fx-add-folder').hidden = !p.caps.addFolder;
    $('fx-content-wrap').hidden = !p.caps.contentSearch;
    await renderSide();
    var start = prefs['last.' + p.kind] || '';
    try { await load(start, false); } catch (e) { await load('', false); }
  }

  async function connect(manual) {
    var info = null;
    try { info = await FX.Bridge.probe(); } catch (e) { info = null; }
    if (info) {
      clearTimeout(S.probeTimer);
      showBanner(false);
      if (!S.prov || S.prov.kind !== 'bridge') {
        var switching = !!S.prov;
        await setProvider(FX.BridgeProvider);
        if (switching) ui.toast('גשר אוצריא חובר — כל הפעולות זמינות', 'success');
      }
      return true;
    }
    if (!S.prov || S.prov.kind === 'bridge') {
      var lost = !!S.prov;
      try { await setProvider(FX.FallbackProvider); } catch (e) { ui.toast(FX.errorText(e), 'error'); }
      if (lost) ui.toast('החיבור לגשר אבד — עברנו למצב מוגבל', 'error');
    }
    showBanner(true);
    if (!manual) scheduleProbe(); else scheduleProbe();
    return false;
  }

  function isLinkError(e) {
    var c = String(e && e.code || '');
    return c === 'unreachable' || c === 'transport' || c === 'offline';
  }
  function opError(e, prefix) {
    ui.toast((prefix ? prefix + ': ' : '') + FX.errorText(e), 'error');
    if (S.prov && S.prov.kind === 'bridge' && isLinkError(e)) connect(false);
  }

  /* ---------- סרגל צד: מיקומים ---------- */
  async function renderSide() {
    var side = $('fx-side');
    var html = '';
    try {
      var r = await S.prov.roots();
      S.known = r.known || [];
      html += '<button class="nav-item" data-path="">' + ic(S.prov.kind === 'bridge' ? 'pc' : 'star') + '<span>' + FX.esc(S.prov.rootLabel) + '</span></button>';
      if (S.known.length) {
        html += '<div class="fx-side-label">' + (S.prov.kind === 'bridge' ? 'גישה מהירה' : 'תיקיות שאושרו') + '</div>';
        html += S.known.map(function (k) {
          return '<div class="fx-side-row"><button class="nav-item" data-path="' + FX.esc(k.path) + '" title="' + FX.esc(k.full || k.path) + '">' +
            ic(k.icon || 'folder') + '<span>' + FX.esc(k.name) + '</span></button>' +
            (k.removable ? '<button class="icon-btn fx-side-x" data-remove="' + FX.esc(k.token) + '" title="הסרה מהרשימה" aria-label="הסרה מהרשימה">' + ic('close') + '</button>' : '') +
            '</div>';
        }).join('');
      }
      if (r.drives && r.drives.length) {
        html += '<div class="fx-side-label">כוננים</div>';
        html += r.drives.map(function (d) {
          return '<button class="nav-item" data-path="' + FX.esc(d.path) + '">' + ic(d.driveType === 'removable' ? 'usb' : d.driveType === 'network' ? 'network' : 'drive') +
            '<span>' + FX.esc(d.name) + '</span></button>';
        }).join('');
      }
      if (S.prov.caps.addFolder) {
        html += '<button class="nav-item fx-side-add" data-add="1">' + ic('plus') + '<span>הוספת תיקייה…</span></button>';
      }
    } catch (e) {
      html = '<div class="fx-empty small">' + FX.esc(FX.errorText(e)) + '</div>';
    }
    side.innerHTML = html;
    markSide();
  }
  function markSide() {
    Array.prototype.forEach.call($('fx-side').querySelectorAll('.nav-item[data-path]'), function (b) {
      b.classList.toggle('active', S.prov.same(b.dataset.path, S.path) && !S.search);
    });
  }

  /* ---------- טעינת תיקייה ---------- */
  async function load(path, push) {
    cancelSearch();
    var id = ++S.loadId;
    var prev = S.path;
    $('fx-list').innerHTML = '<div class="fx-empty">' + ui.loading('טוען…') + '</div>';
    var r;
    try {
      r = await S.prov.list(path, { showHidden: S.showHidden });
    } catch (e) {
      if (id !== S.loadId) return;
      opError(e, 'פתיחת התיקייה נכשלה');
      if (path !== prev) { renderList(); throw e; }
      S.entries = []; renderList();
      throw e;
    }
    if (id !== S.loadId) return;
    if (push && !S.prov.same(prev, r.path)) { S.back.push(prev); S.fwd = []; }
    S.path = r.path;
    S.isRoot = !!r.isRoot;
    S.parent = r.parent;
    S.truncated = !!r.truncated;
    var ents = r.entries || [];
    if (r.isRoot && r.known && r.known.length && S.prov.kind === 'bridge') {
      ents = r.known.map(function (k) { return { name: k.name, path: k.path, type: 'dir', icon: k.icon }; }).concat(ents);
    }
    S.entries = ents;
    S.sel = {}; S.anchor = -1; S.focus = -1;
    $('fx-search').value = '';
    savePrefs();
    renderCrumbs(); renderList(); markSide(); renderCmds();
  }
  function go(path) { return load(path, true).catch(function () { /* כבר דווח */ }); }
  function refresh() {
    if (S.search) { runSearch(S.search.query); return; }
    var keep = Object.keys(S.sel);
    load(S.path, false).then(function () {
      keep.forEach(function (p) { if (S.view.some(function (e) { return e.path === p; })) S.sel[p] = true; });
      renderList();
    }).catch(function () { /* כבר דווח */ });
  }
  function goUp() {
    if (S.search) { exitSearch(); return; }
    if (S.isRoot) return;
    var par = S.prov.parentOf(S.path);
    go(par == null ? '' : par);
  }
  function goBack() {
    if (!S.back.length) return;
    var p = S.back.pop(); S.fwd.push(S.path);
    load(p, false).catch(function () { /* כבר דווח */ });
  }
  function goFwd() {
    if (!S.fwd.length) return;
    var p = S.fwd.pop(); S.back.push(S.path);
    load(p, false).catch(function () { /* כבר דווח */ });
  }

  /* ---------- שורת הנתיב ---------- */
  function renderCrumbs() {
    var c = $('fx-crumbs');
    if (S.search) {
      c.innerHTML = '<span class="fx-crumb-static">' + ic('search') + 'תוצאות חיפוש: <b>' + FX.esc(S.search.query) + '</b> ב-' + FX.esc(S.prov.displayPath(S.search.root)) + '</span>';
      updateNavBtns();
      return;
    }
    var segs = S.prov.segments(S.path);
    c.innerHTML = segs.map(function (s, i) {
      return (i ? '<span class="fx-crumb-sep">' + ic('chevron') + '</span>' : '') +
        '<button class="fx-crumb" data-path="' + FX.esc(s.path) + '">' + FX.esc(s.label) + '</button>';
    }).join('');
    updateNavBtns();
  }
  function updateNavBtns() {
    $('fx-back').disabled = !S.back.length;
    $('fx-fwd').disabled = !S.fwd.length;
    $('fx-up').disabled = S.isRoot && !S.search;
  }
  function editPath() {
    if (!S.prov.caps.editPath || S.search) return;
    var c = $('fx-crumbs');
    c.innerHTML = '<input class="input fx-path-input" dir="ltr" value="' + FX.esc(S.path) + '" aria-label="נתיב">';
    var inp = c.querySelector('input');
    inp.focus(); inp.select();
    var done = false;
    function finish(ok) {
      if (done) return; done = true;
      var v = S.prov.normalizeInput(inp.value);
      if (ok && v !== S.path) go(v).then(renderCrumbs); else renderCrumbs();
    }
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
      e.stopPropagation();
    });
    inp.addEventListener('blur', function () { finish(false); });
  }

  /* ---------- הרשימה ---------- */
  var COLS = [
    { key: 'name', label: 'שם' },
    { key: 'date', label: 'תאריך שינוי' },
    { key: 'type', label: 'סוג' },
    { key: 'size', label: 'גודל' }
  ];
  function renderHead() {
    $('fx-head').innerHTML = COLS.map(function (c) {
      var on = S.sort.key === c.key;
      return '<button class="fx-col fx-col-' + c.key + (on ? ' on' : '') + '" data-sort="' + c.key + '">' + c.label +
        (on ? '<span class="fx-sort-dir">' + (S.sort.dir === 'asc' ? '▲' : '▼') + '</span>' : '') + '</button>';
    }).join('') + (S.search ? '<span class="fx-col fx-col-where">מיקום</span>' : '');
    $('fx-head').classList.toggle('with-where', !!S.search);
  }

  function rowHtml(e, i) {
    var kind = FX.kindOf(e);
    var icon = e.icon || FX.kindInfo(kind).icon;
    var size = e.type === 'drive'
      ? (e.freeBytes != null ? FX.formatSize(e.freeBytes) + ' פנויים מתוך ' + FX.formatSize(e.totalBytes) : '')
      : (e.type === 'dir' ? '' : FX.formatSize(e.size));
    var cut = S.clip && S.clip.cut && S.clip.paths.indexOf(e.path) >= 0;
    var where = '';
    if (S.search) {
      var par = S.prov.parentOf(e.path);
      where = '<span class="fx-cell fx-cell-where" title="' + FX.esc(S.prov.displayPath(par)) + '">' + FX.esc(S.prov.displayPath(par)) + '</span>';
    }
    return '<div class="fx-row' + (S.sel[e.path] ? ' sel' : '') + (i === S.focus ? ' focus' : '') + (cut ? ' cut' : '') + (e.hidden ? ' hid' : '') +
      '" role="option" aria-selected="' + (S.sel[e.path] ? 'true' : 'false') + '" data-i="' + i + '" draggable="false">' +
      '<span class="fx-cell fx-cell-name"><span class="fx-ic k-' + kind + '">' + ic(icon) + '</span><span class="fx-name" title="' + FX.esc(e.name) + '">' + FX.esc(e.name) + '</span></span>' +
      '<span class="fx-cell fx-cell-date">' + (e.modified ? FX.esc(FX.formatDate(e.modified)) : '') + '</span>' +
      '<span class="fx-cell fx-cell-type">' + FX.esc(FX.typeLabel(e)) + '</span>' +
      '<span class="fx-cell fx-cell-size">' + FX.esc(size || '') + '</span>' + where + '</div>';
  }

  function renderList() {
    renderHead();
    var list = $('fx-list');
    list.classList.toggle('with-where', !!S.search);
    var src = S.search ? S.search.hits : S.entries;
    if (S.isRoot && !S.search) S.view = src.slice();
    else S.view = FX.sortEntries(src, S.sort.key, S.sort.dir);
    if (!S.view.length) {
      var msg;
      if (S.search) msg = S.search.done ? 'לא נמצאו תוצאות' : 'מחפש…';
      else if (S.isRoot && S.prov.kind === 'fallback') msg = 'עדיין לא נוספו תיקיות. לחצו על "הוספת תיקייה" כדי לבחור תיקייה לעבודה.';
      else msg = 'התיקייה ריקה';
      list.innerHTML = '<div class="fx-empty">' + ic(S.search ? 'search' : 'folderOpen') + '<span>' + FX.esc(msg) + '</span>' +
        (S.isRoot && !S.search && S.prov.caps.addFolder ? '<button class="btn btn-primary" data-add="1">' + ic('plus') + 'הוספת תיקייה</button>' : '') + '</div>';
    } else {
      list.innerHTML = S.view.map(rowHtml).join('');
    }
    renderStatus();
  }
  function refreshRows() {
    Array.prototype.forEach.call($('fx-list').querySelectorAll('.fx-row'), function (r) {
      var e = S.view[+r.dataset.i];
      var on = !!(e && S.sel[e.path]);
      r.classList.toggle('sel', on);
      r.setAttribute('aria-selected', on ? 'true' : 'false');
      r.classList.toggle('focus', +r.dataset.i === S.focus);
      r.classList.toggle('cut', !!(e && S.clip && S.clip.cut && S.clip.paths.indexOf(e.path) >= 0));
    });
    renderStatus(); renderCmds();
  }
  function renderStatus() {
    var sel = selected();
    var parts = [];
    if (S.search) {
      var s = S.search;
      parts.push(FX.formatNumber(s.hits.length) + ' תוצאות');
      if (!s.done) parts.push('נסרקו ' + FX.formatNumber(s.scanned || 0) + (s.current ? ' — ' + s.current : ''));
      else if (s.truncated) parts.push('הוצגו התוצאות הראשונות בלבד');
    } else {
      parts.push(FX.formatNumber(S.view.length) + ' פריטים');
      if (S.truncated) parts.push('הרשימה קוצרה');
    }
    if (sel.length) {
      var bytes = 0, files = 0;
      sel.forEach(function (e) { if (e.type === 'file' && e.size) { bytes += e.size; files++; } });
      parts.push(FX.formatNumber(sel.length) + ' נבחרו' + (files ? ' (' + FX.formatSize(bytes) + ')' : ''));
    }
    if (S.clip) parts.push((S.clip.cut ? 'לגזירה: ' : 'בלוח: ') + FX.formatNumber(S.clip.paths.length));
    var st = $('fx-status');
    st.innerHTML = '<span>' + parts.map(FX.esc).join('</span><span class="fx-dot">·</span><span>') + '</span>' +
      (S.search && !S.search.done ? '<button class="btn btn-text" id="fx-stop">' + ic('close') + 'עצירה</button>' : '');
    var stop = $('fx-stop');
    if (stop) stop.addEventListener('click', cancelSearch);
  }

  /* ---------- בחירה ---------- */
  function selected() {
    return S.view.filter(function (e) { return S.sel[e.path]; });
  }
  function selectOnly(i) {
    S.sel = {};
    if (S.view[i]) S.sel[S.view[i].path] = true;
    S.anchor = i; S.focus = i;
  }
  function clickRow(i, ev) {
    var e = S.view[i];
    if (!e) return;
    if (ev.shiftKey && S.anchor >= 0) {
      if (!(ev.ctrlKey || ev.metaKey)) S.sel = {};
      var a = Math.min(S.anchor, i), b = Math.max(S.anchor, i);
      for (var k = a; k <= b; k++) S.sel[S.view[k].path] = true;
      S.focus = i;
    } else if (ev.ctrlKey || ev.metaKey) {
      if (S.sel[e.path]) delete S.sel[e.path]; else S.sel[e.path] = true;
      S.anchor = i; S.focus = i;
    } else {
      selectOnly(i);
    }
    refreshRows();
  }
  function moveFocus(delta, ev) {
    if (!S.view.length) return;
    var i = S.focus < 0 ? (delta > 0 ? 0 : S.view.length - 1) : Math.max(0, Math.min(S.view.length - 1, S.focus + delta));
    if (ev.shiftKey) {
      if (S.anchor < 0) S.anchor = S.focus < 0 ? i : S.focus;
      S.sel = {};
      var a = Math.min(S.anchor, i), b = Math.max(S.anchor, i);
      for (var k = a; k <= b; k++) S.sel[S.view[k].path] = true;
      S.focus = i;
    } else if (ev.ctrlKey) {
      S.focus = i;
    } else selectOnly(i);
    refreshRows();
    var row = $('fx-list').querySelector('.fx-row[data-i="' + i + '"]');
    if (row) row.scrollIntoView({ block: 'nearest' });
  }
  function selectAll() {
    S.sel = {};
    S.view.forEach(function (e) { if (e.type !== 'drive') S.sel[e.path] = true; });
    refreshRows();
  }

  /* ---------- סרגל פעולות ---------- */
  var CMDS = [
    { id: 'newFolder', icon: 'newFolder', label: 'תיקייה חדשה', cap: 'mkdir' },
    { id: 'newFile', icon: 'newFile', label: 'קובץ טקסט חדש', cap: 'newFile' },
    { sep: true },
    { id: 'cut', icon: 'cut', label: 'גזירה', cap: 'move', key: 'Ctrl+X' },
    { id: 'copy', icon: 'copy', label: 'העתקה', cap: 'copy', key: 'Ctrl+C' },
    { id: 'paste', icon: 'paste', label: 'הדבקה', key: 'Ctrl+V' },
    { id: 'saveCopy', icon: 'downloads', label: 'שמירת עותק', cap: 'saveCopy' },
    { sep: true },
    { id: 'rename', icon: 'rename', label: 'שינוי שם', cap: 'rename', key: 'F2' },
    { id: 'delete', icon: 'trash', label: 'מחיקה', key: 'Delete' },
    { sep: true },
    { id: 'open', icon: 'open', label: 'פתיחה', key: 'Enter' },
    { id: 'reveal', icon: 'reveal', label: 'הצגה בסייר של Windows', cap: 'reveal' },
    { id: 'props', icon: 'info', label: 'מאפיינים', cap: 'properties', key: 'Alt+Enter' }
  ];
  function inFolder() { return !S.isRoot && !S.search; }
  function cmdState(id) {
    var p = S.prov, sel = selected(), n = sel.length;
    var hasDrive = sel.some(function (e) { return e.type === 'drive' || e.approvedRoot; });
    switch (id) {
      case 'newFolder': return { on: inFolder() && p.caps.mkdir, why: p.capReasons && p.capReasons.mkdir };
      case 'newFile': return { on: inFolder() && p.caps.newFile, why: p.capReasons && p.capReasons.newFile };
      case 'cut': return { on: n > 0 && !hasDrive && p.caps.move };
      case 'copy': return { on: n > 0 && !hasDrive && p.caps.copy, why: p.capReasons && p.capReasons.copy };
      case 'paste': return { on: inFolder() && (!!S.clip || p.caps.clipboardSync) };
      case 'saveCopy': return { on: n === 1 && sel[0].type === 'file' && !!p.caps.saveCopy };
      case 'rename': return { on: n === 1 && !hasDrive && p.caps.rename };
      case 'delete': return { on: n > 0 && !hasDrive };
      case 'open': return { on: n === 1 };
      case 'reveal': return { on: n >= 1 && p.caps.reveal && sel[0].type !== 'drive' };
      case 'props': return { on: (n === 1 || inFolder()) && p.caps.properties };
    }
    return { on: false };
  }
  function renderCmds() {
    if (!S.prov) return;
    var bar = $('fx-cmds');
    bar.innerHTML = CMDS.filter(function (c) {
      if (c.sep) return true;
      if (c.cap === 'saveCopy') return !!S.prov.caps.saveCopy;
      if (c.cap === 'reveal') return !!S.prov.caps.reveal;
      return true;
    }).map(function (c) {
      if (c.sep) return '<span class="fx-cmd-sep"></span>';
      var st = cmdState(c.id);
      var tip = c.label + (c.key ? ' (' + c.key + ')' : '') + (!st.on && st.why ? ' — ' + st.why : '');
      return '<button class="btn btn-text fx-cmd" data-cmd="' + c.id + '" title="' + FX.esc(tip) + '"' + (st.on ? '' : ' disabled') + '>' +
        ic(c.icon) + '<span>' + c.label + '</span></button>';
    }).join('');
  }
  function run(id, ev) {
    var st = cmdState(id);
    if (!st.on) { if (st.why) ui.toast(st.why, 'info'); return; }
    switch (id) {
      case 'newFolder': return newItem(true);
      case 'newFile': return newItem(false);
      case 'cut': return setClip(true);
      case 'copy': return setClip(false);
      case 'paste': return paste();
      case 'saveCopy': return saveCopy();
      case 'rename': return rename();
      case 'delete': return del(ev && ev.shiftKey);
      case 'open': return openEntry(selected()[0]);
      case 'reveal': return S.prov.reveal(selected()[0].path).catch(function (e) { opError(e, 'ההצגה נכשלה'); });
      case 'props': return props();
    }
  }

  /* ---------- פעולות ---------- */
  function validName(v) {
    var s = String(v || '').trim();
    if (!s) return 'יש להזין שם';
    if (/[\\/:*?"<>|]/.test(s)) return 'השם אינו יכול לכלול את התווים \\ / : * ? " < > |';
    if (/^\.+$/.test(s)) return 'שם לא תקין';
    return '';
  }
  async function newItem(isDir) {
    var base = FX.t(isDir ? 'תיקייה חדשה' : 'מסמך חדש.txt');
    var names = {}; S.entries.forEach(function (e) { names[e.name.toLowerCase()] = 1; });
    var name = base, n = 2;
    while (names[name.toLowerCase()]) name = isDir ? base + ' (' + (n++) + ')' : base.replace(/\.txt$/, '') + ' (' + (n++) + ').txt';
    var made = null;
    var r = await ui.dialog({
      title: isDir ? 'תיקייה חדשה' : 'קובץ טקסט חדש', icon: 'info',
      fields: [{ name: 'name', label: 'שם', value: name }],
      validate: function (v) { return validName(v.name); },
      onSubmit: async function (v) {
        var nm = v.name.trim();
        if (!isDir && !/\.[^.]+$/.test(nm)) nm += '.txt';
        made = isDir ? await S.prov.mkdir(S.path, nm) : await S.prov.newTextFile(S.path, nm);
        return nm;
      },
      onOpen: function (form) {
        var inp = form.querySelector('input[name=name]');
        setTimeout(function () { var dot = isDir ? -1 : inp.value.lastIndexOf('.'); inp.setSelectionRange(0, dot > 0 ? dot : inp.value.length); }, 80);
      }
    });
    if (!r) return;
    await reloadSelect([made && made.path ? made.path : S.prov.join(S.path, r)]);
  }
  async function reloadSelect(paths) {
    try { await load(S.path, false); } catch (e) { return; }
    S.sel = {};
    paths.forEach(function (p) {
      var i = S.view.findIndex(function (e) { return S.prov.same(e.path, p); });
      if (i >= 0) { S.sel[S.view[i].path] = true; S.focus = i; S.anchor = i; }
    });
    refreshRows();
    var row = $('fx-list').querySelector('.fx-row.focus');
    if (row) row.scrollIntoView({ block: 'nearest' });
  }

  function setClip(cut) {
    var paths = selected().map(function (e) { return e.path; });
    S.clip = { paths: paths, cut: cut, kind: S.prov.kind };
    if (S.prov.caps.clipboardSync) S.prov.clipboardSet(paths, cut).catch(function () { /* לוח Windows אופציונלי */ });
    ui.toast((cut ? 'נגזרו ' : 'הועתקו ') + FX.formatNumber(paths.length) + ' פריטים', 'info');
    refreshRows();
  }

  async function paste() {
    var clip = S.clip;
    if (S.prov.caps.clipboardSync) {
      try {
        var w = await S.prov.clipboardGet();
        if (w && w.paths && w.paths.length) {
          var same = clip && clip.paths.length === w.paths.length && clip.paths.every(function (p, i) { return S.prov.same(p, w.paths[i]); });
          if (!same) clip = { paths: w.paths, cut: !!w.cut, kind: 'bridge' };
        }
      } catch (e) { /* נשתמש בלוח הפנימי */ }
    }
    if (!clip || !clip.paths.length) { ui.toast('אין פריטים בלוח', 'info'); return; }
    if (clip.kind !== S.prov.kind) { S.clip = null; ui.toast('הפריטים בלוח שייכים למצב עבודה אחר', 'error'); refreshRows(); return; }
    var dest = S.path;
    var bad = clip.paths.filter(function (p) { return S.prov.isInside(dest, p); });
    if (bad.length) { ui.toast('אי אפשר להדביק תיקייה לתוך עצמה', 'error'); return; }
    if (clip.cut && clip.paths.every(function (p) { return S.prov.same(S.prov.parentOf(p), dest); })) {
      ui.toast('הפריטים כבר נמצאים בתיקייה הזו', 'info'); return;
    }
    var conflict = 'rename';
    var names = {}; S.entries.forEach(function (e) { names[e.name.toLowerCase()] = 1; });
    var clash = clip.paths.filter(function (p) { return names[String(S.prov.nameOf(p)).toLowerCase()] && !S.prov.same(S.prov.parentOf(p), dest); });
    if (clash.length) {
      var ans = await ui.dialog({
        title: 'פריטים בשם זהה', icon: 'warning',
        body: '<p>' + FX.formatNumber(clash.length) + ' מהפריטים כבר קיימים בתיקייה הזו (למשל <b>' + FX.esc(S.prov.nameOf(clash[0])) + '</b>). מה לעשות?</p>',
        actions: [{ label: 'ביטול', value: false }, { label: 'דילוג', value: 'skip' }, { label: 'החלפה', value: 'overwrite' }, { label: 'שמירת שניהם', value: 'rename', kind: 'primary' }]
      });
      if (!ans) return;
      conflict = ans === true ? 'rename' : ans;
    }
    busy(true, clip.cut ? 'מעביר…' : 'מעתיק…');
    try {
      var r = clip.cut ? await S.prov.move(clip.paths, dest, conflict) : await S.prov.copy(clip.paths, dest, conflict);
      reportBatch(r, clip.cut ? 'הועברו' : 'הועתקו', (r && (clip.cut ? r.moved : r.copied)) || 0);
      if (clip.cut) S.clip = null;
    } catch (e) { opError(e, clip.cut ? 'ההעברה נכשלה' : 'ההעתקה נכשלה'); }
    busy(false);
    await reloadSelect(clip.paths.map(function (p) { return S.prov.join(dest, S.prov.nameOf(p)); }));
  }
  function reportBatch(r, verb, n) {
    var failed = (r && r.failed) || [];
    var skipped = (r && r.skipped) || 0;
    var msg = verb + ' ' + FX.formatNumber(n) + ' פריטים' + (skipped ? ', ' + FX.formatNumber(skipped) + ' דולגו' : '');
    if (failed.length) {
      ui.toast(msg + '. נכשלו ' + FX.formatNumber(failed.length) + ': ' + (failed[0].message || FX.errorText(failed[0])), 'error');
    } else ui.toast(msg, 'success');
  }

  async function saveCopy() {
    var e = selected()[0];
    busy(true, 'שומר עותק…');
    try {
      var ok = await S.prov.saveCopy(e);
      if (ok) ui.toast('העותק נשמר', 'success');
    } catch (err) { opError(err, 'שמירת העותק נכשלה'); }
    busy(false);
  }

  async function rename() {
    var e = selected()[0];
    var r = await ui.dialog({
      title: 'שינוי שם', icon: 'info',
      fields: [{ name: 'name', label: 'שם חדש', value: e.name }],
      validate: function (v) {
        var m = validName(v.name);
        if (m) return m;
        var t = v.name.trim().toLowerCase();
        if (t !== e.name.toLowerCase() && S.entries.some(function (x) { return x.name.toLowerCase() === t; })) return 'כבר קיים פריט בשם הזה';
        return '';
      },
      onSubmit: async function (v) {
        var nm = v.name.trim();
        if (nm === e.name) return nm;
        var res = await S.prov.rename(e.path, nm);
        return { name: nm, path: res && res.path };
      },
      onOpen: function (form) {
        var inp = form.querySelector('input[name=name]');
        setTimeout(function () { var dot = e.type === 'dir' ? -1 : inp.value.lastIndexOf('.'); inp.setSelectionRange(0, dot > 0 ? dot : inp.value.length); }, 80);
      }
    });
    if (!r || r === e.name) return;
    if (S.clip) S.clip = null;
    if (S.search) { refresh(); return; }
    await reloadSelect([r.path || S.prov.join(S.path, r.name)]);
  }

  async function del(permanent) {
    var sel = selected();
    var p = S.prov;
    var perm = !!permanent || !p.caps.recycle;
    var what = sel.length === 1 ? '<b>' + FX.esc(sel[0].name) + '</b>' : FX.formatNumber(sel.length) + ' פריטים';
    var body = perm
      ? '<p>' + what + ' יימחקו <b>לצמיתות</b>. לא ניתן לשחזר אותם.</p>' + (!p.caps.recycle && p.capReasons ? '<p class="muted small">' + FX.esc(p.capReasons.recycle) + '</p>' : '')
      : '<p>' + what + ' יועברו לסל המיחזור.</p><p class="muted small">Shift+Delete מוחק לצמיתות.</p>';
    var ok = await ui.confirm(perm ? 'מחיקה לצמיתות' : 'מחיקה', body, perm ? 'מחיקה לצמיתות' : 'מחיקה', 'danger');
    if (!ok) return;
    busy(true, 'מוחק…');
    try {
      var r = p.kind === 'bridge'
        ? await p.remove(sel.map(function (e) { return e.path; }), perm)
        : await p.remove(sel.map(function (e) { return e.path; }), sel);
      var failed = (r && r.failed) || [];
      reportBatch(r, perm ? 'נמחקו' : 'הועברו לסל המיחזור', (r && r.deleted != null) ? r.deleted : sel.length - failed.length);
    } catch (e) { opError(e, 'המחיקה נכשלה'); }
    busy(false);
    if (S.clip) S.clip.paths = S.clip.paths.filter(function (x) { return !sel.some(function (e) { return e.path === x; }); });
    if (S.search) {
      var gone = {}; sel.forEach(function (e) { gone[e.path] = 1; });
      S.search.hits = S.search.hits.filter(function (h) { return !gone[h.path]; });
      S.sel = {}; renderList(); renderCmds();
    } else refresh();
  }

  /* ---------- הגדרות פתיחה (לכל צופה, נשמרות בדפדפן) ---------- */
  var OPT_KEY = 'fx.options';
  var OPT_DEF = { pdf: 'internal', word: 'two', text: 'internal', image: 'internal' };
  function opts() {
    var o = {};
    try { o = JSON.parse(localStorage.getItem(OPT_KEY) || '{}') || {}; } catch (e) { o = {}; }
    try { var wm = localStorage.getItem('fx.docCols'); if (!o.word && (wm === '1' || wm === '2')) o.word = wm === '1' ? 'one' : 'two'; } catch (e) { /* כלום */ }
    return Object.assign({}, OPT_DEF, o);
  }
  function saveOpts(o) {
    try { localStorage.setItem(OPT_KEY, JSON.stringify(o)); localStorage.setItem('fx.docCols', o.word === 'one' ? '1' : '2'); } catch (e) { /* כלום */ }
  }
  function sel(name, label, cur, choices) {
    return '<label class="field"><span class="field-label">' + label + '</span><select class="input fx-select" name="' + name + '">' +
      choices.map(function (c) { return '<option value="' + c[0] + '"' + (c[0] === cur ? ' selected' : '') + '>' + c[1] + '</option>'; }).join('') +
      '</select></label>';
  }
  async function settingsDialog() {
    var o = opts();
    var pref = window.I18N ? window.I18N.pref() : 'auto';
    var ext = [['external', 'ביישום חיצוני (דרך הגשר)']];
    var form = null;
    var body = '<div class="fx-settings">' +
      sel('pdf', 'קובצי PDF', o.pdf, [['internal', 'בצופה הפנימי']].concat(ext)) +
      sel('word', 'מסמכי Word', o.word, [['two', 'בצופה הפנימי — שני טורים'], ['one', 'בצופה הפנימי — טור אחד']].concat(ext)) +
      sel('text', 'קובצי טקסט', o.text, [['internal', 'בצופה הפנימי']].concat(ext)) +
      sel('image', 'תמונות', o.image, [['internal', 'בתצוגה מקדימה']].concat(ext)) +
      sel('lang', 'שפה', pref, [['auto', 'אוטומטי (לפי אוצריא)'], ['he', 'עברית'], ['en', 'English']]) +
      '<p class="muted small">ההגדרות נשמרות במחשב הזה. פתיחה חיצונית דורשת את גשר אוצריא; בלעדיו נפתח בצופה הפנימי.</p></div>';
    var r = await ui.dialog({
      title: 'הגדרות', icon: 'info', body: body,
      actions: [{ label: 'ביטול', value: false }, { label: 'שמירה', value: true, kind: 'primary' }],
      onOpen: function (f) { form = f; }
    });
    if (!r || !form) return;
    var v = {};
    Array.prototype.forEach.call(form.querySelectorAll('select'), function (x) { v[x.name] = x.value; });
    saveOpts({ pdf: v.pdf, word: v.word, text: v.text, image: v.image });
    ui.toast('ההגדרות נשמרו', 'success');
    if (window.I18N && v.lang !== pref) window.I18N.set(v.lang);
  }

  function openExternal(e) {
    S.prov.open(e.path).catch(function (err) { opError(err, 'הפתיחה נכשלה'); });
  }
  async function openEntry(e) {
    if (!e) return;
    if (e.type === 'dir' || e.type === 'drive') { go(e.path); return; }
    var ext = FX.extOf(e.name);
    var o = opts();
    var canExt = !!S.prov.caps.open;
    var kind = ext === 'pdf' ? 'pdf' : (ext === 'docx' || ext === 'doc') ? 'word' : FX.isTextExt(ext) ? 'text' : FX.isImageExt(ext) ? 'image' : '';
    if (kind && o[kind] === 'external' && canExt) { openExternal(e); return; }
    if (kind === 'pdf' && window.pdfjsLib) { FX.viewPdf(S.prov, e); return; }
    if (kind === 'word' && window.JSZip && ext === 'docx') { FX.viewDocx(S.prov, e, o.word === 'one' ? 1 : 2); return; }
    if (kind === 'text') { FX.viewText(S.prov, e); return; }
    if (kind === 'image') { preview(e); return; }
    if (canExt) { openExternal(e); return; }
    if (kind === 'word') { FX.viewDocx(S.prov, e, 2); return; }
    ui.toast(S.prov.capReasons && S.prov.capReasons.open || 'אין אפשרות לפתוח קובץ זה', 'info');
  }

  /* תצוגה מקדימה פשוטה לטקסט ולתמונות */
  async function preview(e) {
    busy(true, 'קורא…');
    var d;
    try { d = await S.prov.read(e); } catch (err) { busy(false); opError(err, 'הקריאה נכשלה'); return; }
    busy(false);
    var body;
    if (d.text != null) body = '<pre class="fx-pre" dir="auto">' + FX.esc(d.text) + '</pre>';
    else if (d.dataUrl || d.url) body = '<div class="fx-img"><img alt="' + FX.esc(e.name) + '" src="' + FX.esc(d.dataUrl || d.url) + '"></div>';
    else body = '<p>אין תצוגה מקדימה לקובץ זה.</p>';
    if (d.truncated) body += '<p class="muted small">הקובץ גדול — מוצג החלק הראשון בלבד.</p>';
    var acts = [{ label: 'סגירה', value: false }];
    if (S.prov.caps.open) acts.push({ label: 'פתיחה ביישום', value: 'open', kind: 'primary' });
    var r = await ui.dialog({ title: e.name, body: body, tone: 'fx-wide', actions: acts });
    if (r === 'open' || r === true) S.prov.open(e.path).catch(function (err) { opError(err, 'הפתיחה נכשלה'); });
  }

  async function props() {
    var sel = selected();
    var e = sel.length === 1 ? sel[0] : null;
    var path = e ? e.path : S.path;
    busy(true, 'קורא מאפיינים…');
    var d;
    try { d = S.prov.kind === 'bridge' ? await S.prov.stat(path) : await S.prov.stat(path, e); }
    catch (err) { busy(false); opError(err, 'קריאת המאפיינים נכשלה'); return; }
    busy(false);
    var rows = [
      ['שם', d.name || (e ? e.name : S.prov.nameOf(path))],
      ['מיקום', S.prov.displayPath(d.path || path)],
      ['סוג', d.type === 'dir' ? 'תיקייה' : FX.typeLabel({ name: d.name || '', type: d.type })],
      ['גודל', d.size != null ? FX.formatSize(d.size) + ' (' + FX.formatNumber(d.size) + ' בתים)' : ''],
      ['פריטים', d.itemCount != null ? FX.formatNumber(d.itemCount) : ''],
      ['נוצר', d.created ? FX.formatDate(d.created) : ''],
      ['שונה', d.modified ? FX.formatDate(d.modified) : ''],
      ['תכונות', [d.readOnly ? 'קריאה בלבד' : '', d.hidden ? 'מוסתר' : ''].filter(Boolean).join(', ')]
    ].filter(function (r) { return r[1]; });
    await ui.dialog({
      title: 'מאפיינים', icon: 'info',
      body: '<dl class="info-grid">' + rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + FX.esc(r[1]) + '</dd>'; }).join('') + '</dl>',
      actions: [{ label: 'סגירה', value: true, kind: 'primary' }]
    });
  }

  function busy(on, text) {
    S.busy = on;
    document.body.classList.toggle('fx-busy', !!on);
    var st = $('fx-status');
    if (on) st.innerHTML = '<span class="spinner sm"></span><span>' + FX.esc(text || 'עובד…') + '</span>';
    else renderStatus();
  }

  /* ---------- חיפוש זורם ---------- */
  function cancelSearch() {
    if (S.search && !S.search.done) S.search.cancelled = true;
  }
  function exitSearch() {
    cancelSearch();
    S.search = null;
    $('fx-search').value = '';
    renderCrumbs(); renderList(); markSide(); renderCmds();
  }
  function runSearch(q) {
    q = String(q || '').trim();
    if (!q) { if (S.search) exitSearch(); return; }
    cancelSearch();
    var root = S.search ? S.search.root : S.path;
    var content = S.prov.caps.contentSearch && $('fx-content').checked;
    var query = content ? '*' : (/[*?]/.test(q) ? q : '*' + q + '*');
    var s = S.search = { query: q, root: root, hits: [], cancelled: false, done: false, scanned: 0, current: '' };
    S.sel = {}; S.focus = -1; S.anchor = -1;
    renderCrumbs(); renderList(); markSide(); renderCmds();
    var pending = false;
    function paint() {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        if (S.search !== s) return;
        renderList();
      });
    }
    var opts = { query: query, maxResults: 1000, includeDirs: !content };
    if (content) opts.contentQuery = q;
    S.prov.search(root, opts, {
      hit: function (h) { if (S.search === s) { s.hits.push(h); paint(); } },
      progress: function (p) {
        if (S.search !== s) return;
        s.scanned = p.scanned || s.scanned;
        s.current = p.current ? S.prov.displayPath(p.current) : '';
        if (!pending) renderStatus();
      }
    }, function () { return s.cancelled || S.search !== s; }).then(function (r) {
      s.done = true;
      s.truncated = !!(r && r.truncated);
      if (S.search === s) { renderList(); renderCmds(); }
    }).catch(function (e) {
      s.done = true;
      if (S.search === s) { renderList(); opError(e, 'החיפוש נכשל'); }
    });
  }

  /* ---------- תפריט הקשר ---------- */
  function showMenu(x, y) {
    var m = $('fx-menu');
    var items = [];
    var sel = selected();
    if (sel.length === 1) items.push('open');
    if (sel.length) items.push('cut', 'copy');
    if (inFolder()) items.push('paste');
    if (S.prov.caps.saveCopy && sel.length === 1) items.push('saveCopy');
    if (sel.length === 1) items.push('rename');
    if (sel.length) items.push('delete');
    if (S.prov.caps.reveal && sel.length) items.push('reveal');
    if (!sel.length && inFolder()) items.push('newFolder', 'newFile');
    items.push('props');
    var html = items.map(function (id) {
      var c = CMDS.find(function (k) { return k.id === id; });
      var st = cmdState(id);
      return '<button class="fx-menu-item" role="menuitem" data-cmd="' + id + '"' + (st.on ? '' : ' disabled') + '>' + ic(c.icon) +
        '<span>' + c.label + '</span>' + (c.key ? '<kbd>' + c.key + '</kbd>' : '') + '</button>';
    }).join('');
    if (!html) return;
    m.innerHTML = html;
    m.hidden = false;
    var r = m.getBoundingClientRect();
    var vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    m.style.left = Math.max(4, Math.min(x - r.width, vw - r.width - 4)) + 'px';
    m.style.top = Math.max(4, Math.min(y, vh - r.height - 4)) + 'px';
    var first = m.querySelector('button:not(:disabled)');
    if (first) first.focus();
  }
  function hideMenu() { $('fx-menu').hidden = true; }

  /* ---------- אירועים ---------- */
  function bind() {
    $('fx-back').innerHTML = ic('back');
    $('fx-fwd').innerHTML = ic('forward');
    $('fx-up').innerHTML = ic('up');
    $('fx-refresh').innerHTML = ic('refresh');
    $('fx-hidden').innerHTML = ic('hidden');
    $('fx-add-folder').innerHTML = ic('plus');
    $('fx-settings').innerHTML = ic('settings');
    $('fx-search-ic').innerHTML = ic('search');

    $('fx-back').addEventListener('click', goBack);
    $('fx-fwd').addEventListener('click', goFwd);
    $('fx-up').addEventListener('click', goUp);
    $('fx-refresh').addEventListener('click', refresh);
    $('fx-hidden').addEventListener('click', function () {
      S.showHidden = !S.showHidden;
      this.setAttribute('aria-pressed', S.showHidden ? 'true' : 'false');
      this.classList.toggle('on', S.showHidden);
      savePrefs(); refresh();
    });
    $('fx-add-folder').addEventListener('click', addFolder);
    $('fx-settings').addEventListener('click', settingsDialog);

    $('fx-crumbs').addEventListener('click', function (e) {
      var b = e.target.closest('.fx-crumb');
      if (b) go(b.dataset.path);
    });
    $('fx-crumbs').addEventListener('dblclick', function (e) {
      if (!e.target.closest('.fx-crumb')) editPath();
    });
    $('fx-crumbs').addEventListener('contextmenu', function (e) { e.preventDefault(); editPath(); });

    $('fx-search-form').addEventListener('submit', function (e) { e.preventDefault(); runSearch($('fx-search').value); });
    $('fx-search').addEventListener('input', FX.debounce(function () {
      var v = $('fx-search').value.trim();
      if (!v && S.search) exitSearch();
      else if (v.length >= 2 && !$('fx-content').checked) runSearch(v);
    }, 450));
    $('fx-search').addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); exitSearch(); $('fx-main').focus(); }
    });

    $('fx-side').addEventListener('click', function (e) {
      var rm = e.target.closest('[data-remove]');
      if (rm) { removeFolder(rm.dataset.remove); return; }
      if (e.target.closest('[data-add]')) { addFolder(); return; }
      var b = e.target.closest('.nav-item[data-path]');
      if (b) { if (S.search) { S.search.cancelled = true; S.search = null; } go(b.dataset.path); }
    });

    $('fx-head').addEventListener('click', function (e) {
      var b = e.target.closest('[data-sort]');
      if (!b) return;
      var k = b.dataset.sort;
      S.sort = { key: k, dir: S.sort.key === k && S.sort.dir === 'asc' ? 'desc' : 'asc' };
      savePrefs(); renderList();
    });

    $('fx-cmds').addEventListener('click', function (e) {
      var b = e.target.closest('[data-cmd]');
      if (b) run(b.dataset.cmd, e);
    });

    var list = $('fx-list');
    list.addEventListener('mousedown', function (e) {
      if (e.button === 2) return;
      var row = e.target.closest('.fx-row');
      if (!row) {
        if (e.target.closest('[data-add]')) return;
        S.sel = {}; S.focus = -1; refreshRows(); return;
      }
      clickRow(+row.dataset.i, e);
    });
    list.addEventListener('click', function (e) {
      if (e.target.closest('[data-add]')) addFolder();
    });
    list.addEventListener('dblclick', function (e) {
      var row = e.target.closest('.fx-row');
      if (row) openEntry(S.view[+row.dataset.i]);
    });
    list.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      var row = e.target.closest('.fx-row');
      if (row) {
        var i = +row.dataset.i;
        if (!S.sel[S.view[i].path]) selectOnly(i);
        refreshRows();
      } else { S.sel = {}; refreshRows(); }
      showMenu(e.clientX, e.clientY);
    });

    $('fx-menu').addEventListener('click', function (e) {
      var b = e.target.closest('[data-cmd]');
      if (!b || b.disabled) return;
      hideMenu();
      run(b.dataset.cmd, e);
    });
    document.addEventListener('mousedown', function (e) { if (!e.target.closest('#fx-menu')) hideMenu(); });
    window.addEventListener('blur', hideMenu);
    window.addEventListener('resize', hideMenu);

    document.addEventListener('keydown', onKey);
    window.addEventListener('mouseup', function (e) {
      if (e.button === 3) { e.preventDefault(); goBack(); }
      else if (e.button === 4) { e.preventDefault(); goFwd(); }
    });
  }

  function typing(t) {
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  }
  function onKey(e) {
    if (!S.prov || S.busy) return;
    if (document.querySelector('#dialogs .dlg-scrim')) return;
    var menu = $('fx-menu');
    if (!menu.hidden) {
      if (e.key === 'Escape') { e.preventDefault(); hideMenu(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        var btns = Array.prototype.slice.call(menu.querySelectorAll('button:not(:disabled)'));
        var at = btns.indexOf(document.activeElement);
        var nx = btns[(at + (e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length];
        if (nx) nx.focus();
      }
      return;
    }
    var ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key.toLowerCase() === 'f') { e.preventDefault(); $('fx-search').focus(); $('fx-search').select(); return; }
    if (ctrl && e.key.toLowerCase() === 'l') { e.preventDefault(); editPath(); return; }
    if (e.key === 'F5') { e.preventDefault(); refresh(); return; }
    if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); goBack(); return; }
    if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); goFwd(); return; }
    if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); goUp(); return; }
    if (typing(e.target)) return;
    var k = e.key;
    if (ctrl && k.toLowerCase() === 'a') { e.preventDefault(); selectAll(); return; }
    if (ctrl && k.toLowerCase() === 'c') { e.preventDefault(); run('copy'); return; }
    if (ctrl && k.toLowerCase() === 'x') { e.preventDefault(); run('cut'); return; }
    if (ctrl && k.toLowerCase() === 'v') { e.preventDefault(); run('paste'); return; }
    if (ctrl && e.shiftKey && k.toLowerCase() === 'n') { e.preventDefault(); run('newFolder'); return; }
    if (k === 'Delete') { e.preventDefault(); run('delete', e); return; }
    if (k === 'F2') { e.preventDefault(); run('rename'); return; }
    if (k === 'Enter' && e.altKey) { e.preventDefault(); run('props'); return; }
    if (k === 'Enter') { e.preventDefault(); var f = S.view[S.focus]; if (f) openEntry(f); return; }
    if (k === 'Backspace') { e.preventDefault(); goUp(); return; }
    if (k === 'Escape') { if (S.search) { exitSearch(); return; } S.sel = {}; refreshRows(); return; }
    if (k === 'ArrowDown') { e.preventDefault(); moveFocus(1, e); return; }
    if (k === 'ArrowUp') { e.preventDefault(); moveFocus(-1, e); return; }
    if (k === 'Home') { e.preventDefault(); moveFocus(-S.view.length, e); return; }
    if (k === 'End') { e.preventDefault(); moveFocus(S.view.length, e); return; }
    if (k === ' ' && ctrl && S.focus >= 0) {
      e.preventDefault();
      var p = S.view[S.focus].path;
      if (S.sel[p]) delete S.sel[p]; else S.sel[p] = true;
      refreshRows(); return;
    }
    /* קפיצה לפי אות ראשונה */
    if (k.length === 1 && !ctrl && !e.altKey && /\S/.test(k)) {
      var start = S.focus + 1;
      for (var n = 0; n < S.view.length; n++) {
        var j = (start + n) % S.view.length;
        if (S.view[j].name.toLowerCase().indexOf(k.toLowerCase()) === 0) { moveFocus(j - S.focus, { shiftKey: false, ctrlKey: false }); break; }
      }
    }
  }

  /* ---------- מצב חלופי: ניהול תיקיות מאושרות ---------- */
  async function addFolder() {
    try {
      var f = await FX.FallbackProvider.addFolder();
      if (!f) return;
      await renderSide();
      go(typeof f === 'string' ? f : (f.path || ''));
    } catch (e) { opError(e, 'הוספת התיקייה נכשלה'); }
  }
  async function removeFolder(token) {
    var ok = await ui.confirm('הסרת תיקייה', '<p>התיקייה תוסר מרשימת הסייר בלבד. הקבצים עצמם לא יימחקו.</p>', 'הסרה');
    if (!ok) return;
    try {
      await FX.FallbackProvider.removeFolder(token);
      await renderSide();
      if (String(S.path).indexOf(token + '::') === 0) go('');
      else if (S.isRoot) refresh();
    } catch (e) { opError(e, 'ההסרה נכשלה'); }
  }

  /* ---------- מסמך חדש מכפתור + בסרגל הקורא ---------- */
  var NEW_DOC_ID = 'chadbedera-fx-new-doc';
  async function newDocFromReader() {
    if (!S.prov || S.prov.kind !== 'bridge') {
      ui.toast('יצירת מסמך חדש דורשת את גשר אוצריא', 'info');
      return;
    }
    var dir = '';
    try { dir = localStorage.getItem('fx.newDocDir') || ''; } catch (e) { dir = ''; }
    if (!dir) {
      var docs = (S.known || []).find(function (k) { return k.id === 'documents'; });
      dir = docs ? docs.path : (S.isRoot ? '' : S.path);
    }
    var made = null;
    var r = await ui.dialog({
      title: 'מסמך חדש', icon: 'info',
      fields: [
        { name: 'name', label: 'שם הקובץ', value: FX.t('מסמך חדש.txt') },
        { name: 'dir', label: 'תיקייה', value: dir, dir: 'ltr' }
      ],
      validate: function (v) { return validName(v.name) || (String(v.dir || '').trim() ? '' : 'יש לבחור תיקייה'); },
      onSubmit: async function (v) {
        var nm = v.name.trim();
        if (!/\.[^.]+$/.test(nm)) nm += '.txt';
        var d = S.prov.normalizeInput(v.dir);
        made = await S.prov.newTextFile(d, nm);
        try { localStorage.setItem('fx.newDocDir', d); } catch (e) { /* כלום */ }
        return { dir: d, name: nm };
      }
    });
    if (!r) return;
    ui.toast('המסמך נוצר', 'success');
    if (S.search) exitSearch();
    if (!S.prov.same(S.path, r.dir)) await go(r.dir);
    await reloadSelect([made && made.path ? made.path : S.prov.join(r.dir, r.name)]);
  }
  function onToolbarItem(ev) {
    var id = ev && (ev.id || ev.itemId || (ev.item && ev.item.id));
    if (id && id !== NEW_DOC_ID) return;
    var start = Date.now();
    (function wait() {
      if (S.prov) { newDocFromReader(); return; }
      if (Date.now() - start < 8000) setTimeout(wait, 150);
    })();
  }

  /* ---------- אתחול ---------- */
  async function boot(payload) {
    if (S.booted) return;
    S.booted = true;
    if (payload && payload.theme) ui.applyTheme(payload.theme);
    if (payload && payload.plugin && payload.plugin.version) FX.VERSION = payload.plugin.version;
    try { await window.I18N.init(payload); } catch (e) { /* נשארים בעברית */ }
    var lb = $('fx-lang');
    lb.textContent = window.I18N.toggleLabel();
    lb.addEventListener('click', function () { window.I18N.toggle(); });
    loadPrefs();
    $('fx-hidden').classList.toggle('on', S.showHidden);
    $('fx-hidden').setAttribute('aria-pressed', S.showHidden ? 'true' : 'false');
    bind();
    connect(false);
  }

  function init() {
    if (window.Otzaria) {
      window.Otzaria.on('plugin.boot', boot);
      window.Otzaria.on('theme.changed', ui.applyTheme);
      window.Otzaria.on('reader.toolbar_item_clicked', onToolbarItem);
      window.Otzaria.on('plugin.suspended', function () { S.suspended = true; clearTimeout(S.probeTimer); cancelSearch(); });
      window.Otzaria.on('plugin.resumed', function () {
        S.suspended = false;
        if (!S.prov || S.prov.kind !== 'bridge') connect(false);
        else FX.Bridge.probe().then(function (h) { if (!h) connect(false); });
      });
    } else {
      document.body.classList.add('preview');
      if (/[?&]dark=1/.test(location.search)) document.body.classList.add('dark-mode');
      boot(null);
    }
  }

  FX.app = { go: go, refresh: refresh, connect: connect };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
