/* viewers.js - צופים פנימיים: PDF (pdf.js) ו-Word (jszip + document.xml), בשכבה על מסך הסייר */
(function () {
  'use strict';
  var FX = window.FX = window.FX || {};
  var MAX_BYTES = 50 * 1024 * 1024;

  /* ---------- קריאת קובץ כבתים, משני הספקים ---------- */
  function b64ToBytes(b64) {
    var bin = atob(b64);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  FX.readBytes = async function (prov, entry) {
    if (prov.kind === 'bridge') {
      var d = await FX.Bridge.call('/fs/read', { path: entry.path, maxBytes: MAX_BYTES }, { timeoutMs: 120000 });
      if (d.truncated) throw FX.OpError('too_large', FX.t('הקובץ גדול מדי לתצוגה (מעל 50MB)'));
      if (d.encoding === 'utf8') return new TextEncoder().encode(d.content);
      return b64ToBytes(d.content || '');
    }
    var r = await prov.read(entry);
    var src = r.url || r.dataUrl;
    if (!src) throw FX.OpError('unsupported', FX.t('אין אפשרות לקרוא את הקובץ'));
    var resp = await fetch(src);
    if (!resp.ok) throw FX.OpError('internal', FX.t('קריאת הקובץ נכשלה') + ' (HTTP ' + resp.status + ')');
    return new Uint8Array(await resp.arrayBuffer());
  };

  /* ---------- שכבת צפייה משותפת ---------- */
  var cur = null;
  function closeViewer() {
    if (!cur) return;
    try { if (cur.cleanup) cur.cleanup(); } catch (e) { /* כלום */ }
    cur.el.remove();
    document.removeEventListener('keydown', cur.onKey, true);
    cur = null;
  }
  function openShell(entry, opts) {
    closeViewer();
    var ic = FX.icon;
    var el = FX.ui.el(
      '<div class="fx-viewer" role="dialog" aria-modal="true" aria-label="' + FX.esc(entry.name) + '">' +
      '<div class="fx-vbar">' +
      '<button class="icon-btn" data-v="close" title="' + FX.t('סגירה') + ' (Esc)" aria-label="' + FX.t('סגירה') + '">' + ic('close') + '</button>' +
      '<b class="fx-vtitle" title="' + FX.esc(entry.name) + '">' + FX.esc(entry.name) + '</b>' +
      '<span class="fx-vtools">' + (opts.tools || '') + '</span>' +
      (opts.canOpen ? '<button class="btn btn-text" data-v="ext">' + ic('open') + FX.t('פתיחה ביישום') + '</button>' : '') +
      '</div><div class="fx-vbody" tabindex="0">' + FX.ui.loading(FX.t('טוען…')) + '</div></div>');
    document.body.appendChild(el);
    var state = {
      el: el, body: el.querySelector('.fx-vbody'), cleanup: null,
      onKey: function (e) {
        if (e.key === 'Escape' && !document.querySelector('#dialogs .dlg-scrim')) { e.preventDefault(); e.stopPropagation(); closeViewer(); return; }
        if (opts.onKey) opts.onKey(e);
      }
    };
    document.addEventListener('keydown', state.onKey, true);
    el.querySelector('[data-v=close]').addEventListener('click', closeViewer);
    var ext = el.querySelector('[data-v=ext]');
    if (ext) ext.addEventListener('click', function () { opts.onOpenExternal(); });
    state.body.focus();
    cur = state;
    return state;
  }
  function fail(state, e) {
    state.body.innerHTML = '<div class="fx-empty">' + FX.icon('warning') + '<span>' + FX.esc(FX.errorText(e)) + '</span></div>';
  }
  FX.closeViewer = closeViewer;

  /* ---------- PDF ---------- */
  FX.viewPdf = async function (prov, entry) {
    var lib = window.pdfjsLib;
    var zoom = 1, doc = null, pages = [], io = null, fitWidth = true;
    var tools =
      '<button class="icon-btn" data-z="-" title="' + FX.t('הקטנה') + '" aria-label="' + FX.t('הקטנה') + '">−</button>' +
      '<span class="fx-vzoom" data-z="v">100%</span>' +
      '<button class="icon-btn" data-z="+" title="' + FX.t('הגדלה') + '" aria-label="' + FX.t('הגדלה') + '">+</button>' +
      '<button class="btn btn-text" data-z="fit">' + FX.t('רוחב מלא') + '</button>' +
      '<span class="fx-vpage"><input class="input" type="number" min="1" value="1" aria-label="' + FX.t('עמוד') + '"> / <span data-n>…</span></span>';
    var st = openShell(entry, {
      tools: tools,
      canOpen: prov.caps.open,
      onOpenExternal: function () { prov.open(entry.path).catch(function (e) { FX.ui.toast(FX.errorText(e), 'error'); }); },
      onKey: function (e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) { e.preventDefault(); setZoom(zoom * 1.2); }
        else if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); setZoom(zoom / 1.2); }
      }
    });
    if (!lib) { fail(st, FX.OpError('unsupported', FX.t('רכיב ה-PDF לא נטען'))); return; }
    lib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
    try {
      var bytes = await FX.readBytes(prov, entry);
      doc = await lib.getDocument({ data: bytes, isEvalSupported: false }).promise;
    } catch (e) {
      if (e && e.name === 'PasswordException') e = FX.OpError('locked', FX.t('הקובץ מוגן בסיסמה'));
      fail(st, e); return;
    }
    if (cur !== st) { doc.destroy(); return; }
    st.cleanup = function () { if (io) io.disconnect(); doc.destroy(); };
    st.el.querySelector('[data-n]').textContent = doc.numPages;
    st.body.innerHTML = '<div class="fx-pages"></div>';
    var wrap = st.body.firstChild;
    var first = await doc.getPage(1);
    var base = first.getViewport({ scale: 1 });

    function targetScale() {
      if (!fitWidth) return zoom;
      var w = st.body.clientWidth - 32;
      return Math.max(0.25, w / base.width);
    }
    function layout() {
      var s = targetScale();
      zoom = s;
      st.el.querySelector('[data-z=v]').textContent = Math.round(s * 100) + '%';
      pages.forEach(function (p) {
        p.el.style.width = Math.floor(p.w * s) + 'px';
        p.el.style.height = Math.floor(p.h * s) + 'px';
        p.rendered = 0;
        p.el.innerHTML = '';
      });
      if (io) { pages.forEach(function (p) { io.unobserve(p.el); io.observe(p.el); }); }
    }
    for (var i = 1; i <= doc.numPages; i++) {
      var pe = document.createElement('div');
      pe.className = 'fx-page';
      pe.dataset.p = i;
      wrap.appendChild(pe);
      pages.push({ n: i, el: pe, w: base.width, h: base.height, rendered: 0 });
    }
    async function render(p) {
      var s = zoom;
      if (p.rendered === s) return;
      p.rendered = s;
      var page = await doc.getPage(p.n);
      var vp = page.getViewport({ scale: s });
      if (p.w !== vp.width / s) { p.w = vp.width / s; p.h = vp.height / s; p.el.style.width = Math.floor(vp.width) + 'px'; p.el.style.height = Math.floor(vp.height) + 'px'; }
      var dpr = window.devicePixelRatio || 1;
      var c = document.createElement('canvas');
      c.width = Math.floor(vp.width * dpr); c.height = Math.floor(vp.height * dpr);
      c.style.width = Math.floor(vp.width) + 'px'; c.style.height = Math.floor(vp.height) + 'px';
      await page.render({ canvasContext: c.getContext('2d'), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise;
      if (p.rendered !== s || cur !== st) return;
      p.el.innerHTML = '';
      p.el.appendChild(c);
    }
    io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        var p = pages[+en.target.dataset.p - 1];
        render(p).catch(function () { /* עמוד פגום — מדלגים */ });
      });
    }, { root: st.body, rootMargin: '600px 0px' });
    layout();

    var pageInp = st.el.querySelector('.fx-vpage input');
    pageInp.max = doc.numPages;
    st.body.addEventListener('scroll', FX.debounce(function () {
      var top = st.body.scrollTop + st.body.clientHeight / 3;
      for (var k = 0; k < pages.length; k++) {
        if (pages[k].el.offsetTop + pages[k].el.offsetHeight > top) { pageInp.value = k + 1; break; }
      }
    }, 120));
    pageInp.addEventListener('change', function () {
      var n = Math.max(1, Math.min(doc.numPages, parseInt(pageInp.value, 10) || 1));
      pages[n - 1].el.scrollIntoView({ block: 'start' });
    });
    function setZoom(z) {
      fitWidth = false;
      var ratio = st.body.scrollTop / Math.max(1, st.body.scrollHeight);
      zoom = Math.max(0.25, Math.min(5, z));
      layout();
      st.body.scrollTop = ratio * st.body.scrollHeight;
    }
    st.el.querySelector('.fx-vtools').addEventListener('click', function (e) {
      var b = e.target.closest('[data-z]');
      if (!b) return;
      if (b.dataset.z === '+') setZoom(zoom * 1.2);
      else if (b.dataset.z === '-') setZoom(zoom / 1.2);
      else if (b.dataset.z === 'fit') { fitWidth = true; layout(); }
    });
    var onResize = FX.debounce(function () { if (fitWidth && cur === st) layout(); }, 200);
    window.addEventListener('resize', onResize);
    var prevCleanup = st.cleanup;
    st.cleanup = function () { window.removeEventListener('resize', onResize); prevCleanup(); };
  };

  /* ---------- Word ---------- */
  var W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  function wAttr(el, name) { return el ? (el.getAttributeNS(W, name) || el.getAttribute('w:' + name)) : null; }
  function kids(el, name) {
    var out = [];
    for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 1 && n.localName === name) out.push(n);
    return out;
  }
  function kid(el, name) { return el ? kids(el, name)[0] || null : null; }

  function runHtml(r) {
    var rpr = kid(r, 'rPr');
    var txt = '';
    for (var n = r.firstChild; n; n = n.nextSibling) {
      if (n.nodeType !== 1) continue;
      if (n.localName === 't') txt += FX.esc(n.textContent);
      else if (n.localName === 'tab') txt += '\t';
      else if (n.localName === 'br' || n.localName === 'cr') txt += '<br>';
    }
    if (!txt) return '';
    if (rpr) {
      var on = function (k) { var e = kid(rpr, k); return e && wAttr(e, 'val') !== '0' && wAttr(e, 'val') !== 'false'; };
      if (on('b')) txt = '<b>' + txt + '</b>';
      if (on('i')) txt = '<i>' + txt + '</i>';
      var u = kid(rpr, 'u');
      if (u && wAttr(u, 'val') !== 'none') txt = '<u>' + txt + '</u>';
      var va = kid(rpr, 'vertAlign');
      if (va && wAttr(va, 'val') === 'superscript') txt = '<sup>' + txt + '</sup>';
      if (va && wAttr(va, 'val') === 'subscript') txt = '<sub>' + txt + '</sub>';
    }
    return txt;
  }
  function paraHtml(p) {
    var ppr = kid(p, 'pPr');
    var style = ppr && kid(ppr, 'pStyle') ? String(wAttr(kid(ppr, 'pStyle'), 'val') || '') : '';
    var jc = ppr && kid(ppr, 'jc') ? wAttr(kid(ppr, 'jc'), 'val') : '';
    var list = ppr && kid(ppr, 'numPr');
    var html = '';
    (function walk(el) {
      for (var n = el.firstChild; n; n = n.nextSibling) {
        if (n.nodeType !== 1) continue;
        if (n.localName === 'r') html += runHtml(n);
        else if (n.localName === 'hyperlink' || n.localName === 'ins' || n.localName === 'smartTag' || n.localName === 'sdt' || n.localName === 'sdtContent') walk(n);
      }
    })(p);
    var m = /heading\s*([1-6])|^([1-6])$|כותרת\s*([1-6])/i.exec(style);
    var tag = m ? 'h' + (m[1] || m[2] || m[3]) : (/title/i.test(style) ? 'h1' : 'p');
    var cls = [];
    if (jc === 'center') cls.push('c');
    else if (jc === 'both' || jc === 'distribute') cls.push('j');
    if (list) cls.push('li');
    if (!html) return '<p class="empty">&nbsp;</p>';
    return '<' + tag + (cls.length ? ' class="' + cls.join(' ') + '"' : '') + ' dir="auto">' + html + '</' + tag + '>';
  }
  function tableHtml(tbl) {
    return '<table class="fx-doc-tbl">' + kids(tbl, 'tr').map(function (tr) {
      return '<tr>' + kids(tr, 'tc').map(function (tc) {
        var span = kid(kid(tc, 'tcPr'), 'gridSpan');
        return '<td' + (span ? ' colspan="' + (parseInt(wAttr(span, 'val'), 10) || 1) + '"' : '') + '>' + blocks(tc) + '</td>';
      }).join('') + '</tr>';
    }).join('') + '</table>';
  }
  function blocks(el) {
    var out = '';
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType !== 1) continue;
      if (n.localName === 'p') out += paraHtml(n);
      else if (n.localName === 'tbl') out += tableHtml(n);
      else if (n.localName === 'sdt') out += blocks(kid(n, 'sdtContent') || n);
    }
    return out;
  }
  FX.docxToHtml = async function (bytes) {
    if (!window.JSZip) throw FX.OpError('unsupported', FX.t('רכיב ה-Word לא נטען'));
    var zip = await window.JSZip.loadAsync(bytes);
    var f = zip.file('word/document.xml');
    if (!f) throw FX.OpError('bad_request', FX.t('הקובץ אינו מסמך Word תקין (docx)'));
    var xml = new DOMParser().parseFromString(await f.async('string'), 'application/xml');
    var body = xml.getElementsByTagNameNS(W, 'body')[0];
    if (!body) throw FX.OpError('bad_request', FX.t('הקובץ אינו מסמך Word תקין (docx)'));
    return blocks(body);
  };

  FX.viewDocx = async function (prov, entry) {
    var cols = 2;
    try { var v = localStorage.getItem('fx.docCols'); if (v === '1' || v === '2') cols = +v; } catch (e) { /* כלום */ }
    var st = openShell(entry, {
      tools: '<button class="btn btn-text" data-c="1">' + FX.t('טור אחד') + '</button><button class="btn btn-text" data-c="2">' + FX.t('שני טורים') + '</button>',
      canOpen: prov.caps.open,
      onOpenExternal: function () { prov.open(entry.path).catch(function (e) { FX.ui.toast(FX.errorText(e), 'error'); }); }
    });
    if (/\.doc$/i.test(entry.name)) {
      fail(st, FX.OpError('unsupported', FX.t('קובצי doc ישנים אינם נתמכים בתצוגה הפנימית. אפשר לפתוח אותם ביישום חיצוני.')));
      return;
    }
    var html;
    try { html = await FX.docxToHtml(await FX.readBytes(prov, entry)); } catch (e) { fail(st, e); return; }
    if (cur !== st) return;
    st.body.innerHTML = '<article class="fx-doc">' + (html || '<p>' + FX.t('המסמך ריק') + '</p>') + '</article>';
    var art = st.body.firstChild;
    function apply() {
      art.classList.toggle('two', cols === 2);
      Array.prototype.forEach.call(st.el.querySelectorAll('[data-c]'), function (b) { b.classList.toggle('on', +b.dataset.c === cols); });
    }
    st.el.querySelector('.fx-vtools').addEventListener('click', function (e) {
      var b = e.target.closest('[data-c]');
      if (!b) return;
      cols = +b.dataset.c;
      try { localStorage.setItem('fx.docCols', String(cols)); } catch (er) { /* כלום */ }
      apply();
    });
    apply();
  };

  /* ---------- טקסט: צופה פנימי ---------- */
  FX.viewText = async function (prov, entry) {
    var st = openShell(entry, {
      canOpen: prov.caps.open,
      onOpenExternal: function () { prov.open(entry.path).catch(function (e) { FX.ui.toast(FX.errorText(e), 'error'); }); }
    });
    var d;
    try { d = await prov.read(entry); } catch (e) { fail(st, e); return; }
    if (cur !== st) return;
    if (d.tooLarge) { fail(st, FX.OpError('too_large', FX.t('הקובץ גדול מדי לתצוגה'))); return; }
    st.body.innerHTML = '<pre class="fx-text" dir="auto"></pre>' + (d.truncated ? '<p class="muted small fx-vnote">' + FX.t('הקובץ גדול — מוצג החלק הראשון בלבד.') + '</p>' : '');
    st.body.firstChild.textContent = d.text || '';
  };
})();
