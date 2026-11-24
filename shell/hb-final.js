/* hb-final.js 1.1.0 — ערכת סיום משותפת לתוספי Hadabadra (חד בדרא).
 * 1. "מה חדש" — חלון קופץ אחרי עדכון, עם השינויים מאז הגרסה שהייתה מותקנת.
 * 2. "כפתורים באוצריא" — מתגי גלולה בהגדרות: הצגה/הסתרה של כל כפתור שהתוסף מוסיף לאוצריא,
 *    בלי לבטל הרשאות. כל פריט ב-contributes.startup נושא when: {not:{storage:{key:"hb.hide.<id>",equals:true}}}.
 * שימוש: HBFinal.init(window.HB_FINAL_DATA, { mount: '#settings' }) — mount מוסיף כרטיס עם המתגים להגדרות.
 * עיצוב: צבעים רק var(--color-*), מידות ב-em.
 */
(function () {
  'use strict';
  var KEY_LAST = 'hb.lastVersion';
  var cfg = null;

  function call(m, p) {
    try { if (window.Otzaria && Otzaria.call) return Otzaria.call(m, p || {}); } catch (e) {}
    return Promise.reject(new Error('no-otzaria'));
  }
  function sget(k) { return call('storage.get', { key: k }).then(function (r) { return r && r.data !== undefined ? r.data : r; }).catch(function () { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }); }
  function sset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} return call('storage.set', { key: k, value: v }).catch(function () {}); }
  function cmp(a, b) {
    var x = String(a || '0').split('.').map(Number), y = String(b || '0').split('.').map(Number);
    for (var i = 0; i < Math.max(x.length, y.length); i++) { var d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0 ? 1 : -1; }
    return 0;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function openUrl(u) { call('app.openUrl', { url: u }).catch(function () { window.open(u, '_blank', 'noopener'); }); }
  // כתובות בטקסט הופכות לקישור קצר ולחיץ, במקום כתובת ארוכה שנקטעת
  function linkify(s) {
    return esc(s).replace(/\(?(https?:\/\/[^\s)<]+)\)?/g, function (m, u) {
      var t = /issues\/new/.test(u) ? 'בקשת הצטרפות' : (/github\.com/.test(u) ? 'GitHub' : 'קישור');
      return '<a href="#" data-url="' + u + '">' + t + '</a>';
    });
  }
  function wireLinks(root) {
    root.querySelectorAll('a[data-url]').forEach(function (a) {
      a.onclick = function (e) { e.preventDefault(); openUrl(a.getAttribute('data-url')); };
    });
  }

  function css() {
    if (document.getElementById('hbf-css')) return;
    var s = document.createElement('style'); s.id = 'hbf-css';
    s.textContent =
      '.hbf-back{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center}.hbf-back::before{content:"";position:absolute;inset:0;background:var(--color-on-surface);opacity:0.35}' +
      '.hbf-box{background:var(--color-surface);color:var(--color-on-surface);border-radius:0.9em;position:relative;box-shadow:0 0.4em 1.6em var(--color-outline);width:min(36em,92vw);max-height:84vh;display:flex;flex-direction:column;direction:rtl}' +
      '.hbf-h{padding:1em 1.2em 0.4em;font-weight:700;font-size:1.15em;display:flex;justify-content:space-between;align-items:center;gap:1em}' +
      '.hbf-b{padding:0.4em 1.2em 1em;overflow:auto;line-height:1.6}' +
      '.hbf-b h4{margin:0.9em 0 0.2em;color:var(--color-primary)}.hbf-b ul{margin:0;padding-inline-start:1.3em}' +
      '.hbf-b a,.hbf-card a{color:var(--color-primary);text-decoration:underline;cursor:pointer}' +
      '.hbf-note{background:var(--color-surface-container-high);border-radius:0.6em;padding:0.6em 0.8em;margin:0.4em 0}' +
      '.hbf-hl{background:var(--color-primary-container);color:var(--color-on-primary-container);border-radius:0.6em;padding:0.6em 0.8em;margin:0.4em 0}' +
      '.hbf-f{padding:0.6em 1.2em 1em;display:flex;gap:0.6em;justify-content:flex-start;flex-wrap:wrap}' +
      '.hbf-btn{font:inherit;border:0;border-radius:1.2em;padding:0.45em 1.1em;cursor:pointer;background:var(--color-primary);color:var(--color-on-primary)}' +
      '.hbf-btn.sec{background:var(--color-surface-container-high);color:var(--color-on-surface)}' +
      '.hbf-x{font:inherit;background:none;border:0;color:var(--color-on-surface-variant);cursor:pointer;font-size:1.2em}' +
      '.hbf-card{background:var(--color-surface);border:0.07em solid var(--color-outline-variant,var(--color-outline));border-radius:1.25em;padding:0.9em 1.1em;margin:0.8em 0;direction:rtl}' +
      '.hbf-card h3{margin:0 0 0.2em;font-size:1.05em;font-weight:700;color:var(--color-primary)}' +
      '.hbf-card>p{margin:0 0 0.5em;font-size:0.85em;color:var(--color-on-surface-variant)}' +
      '.hbf-row{display:flex;align-items:center;justify-content:space-between;gap:0.8em;padding:0.55em 0;border-top:0.09em solid var(--color-surface-container-highest,var(--color-outline))}' +
      '.hbf-row small{display:block;color:var(--color-on-surface-variant)}' +
      '.hbf-sw{flex:none;position:relative;width:3.25em;height:2em;border-radius:1em;border:0.13em solid var(--color-outline);background:var(--color-surface-container-highest,var(--color-surface-container-high));cursor:pointer;padding:0;transition:background 0.15s}' +
      '.hbf-sw::after{content:"";position:absolute;top:50%;inset-inline-start:0.3em;width:1em;height:1em;border-radius:50%;background:var(--color-outline);transform:translateY(-50%);transition:inset-inline-start 0.15s,width 0.15s,height 0.15s}' +
      '.hbf-sw[aria-checked=true]{background:var(--color-primary);border-color:var(--color-primary)}' +
      '.hbf-sw[aria-checked=true]::after{inset-inline-start:1.45em;width:1.4em;height:1.4em;background:var(--color-on-primary)}' +
      '.hbf-sw:focus-visible{outline:0.15em solid var(--color-primary);outline-offset:0.15em}' +
      '.hbf-acts{display:flex;gap:0.5em;flex-wrap:wrap;margin-top:0.6em}';
    document.head.appendChild(s);
  }
  function modal(title, html, buttons) {
    css();
    var back = document.createElement('div'); back.className = 'hbf-back';
    back.innerHTML = '<div class="hbf-box" role="dialog" aria-modal="true"><div class="hbf-h"><span>' + esc(title) +
      '</span><button class="hbf-x" aria-label="סגירה">✕</button></div><div class="hbf-b">' + html + '</div><div class="hbf-f"></div></div>';
    var close = function () { back.remove(); };
    back.querySelector('.hbf-x').onclick = close;
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    var f = back.querySelector('.hbf-f');
    (buttons || [{ t: 'סגירה' }]).forEach(function (b) {
      var el = document.createElement('button'); el.className = 'hbf-btn' + (b.sec ? ' sec' : ''); el.textContent = b.t;
      el.onclick = function () { if (b.fn) b.fn(); close(); }; f.appendChild(el);
    });
    wireLinks(back);
    document.body.appendChild(back);
    return back;
  }

  function pauseHtml() {
    if (cfg.paused === false) return '';
    var l = cfg.links || {};
    var links = [];
    if (l.github) links.push('<a href="#" data-url="' + esc(l.github) + '">קוד המקור</a>');
    if (l.join) links.push('<a href="#" data-url="' + esc(l.join) + '">בקשת הצטרפות</a>');
    return '<div class="hbf-note"><b>הפיתוח מושהה.</b> מחכים למי שרוצה להמשיך בפיתוח' + (links.length ? ': ' + links.join(' · ') : '') + '</div>';
  }
  function buttonsHl() {
    if (!(cfg.items || []).length) return '';
    return '<div class="hbf-hl"><b>חדש: בוחרים אילו כפתורים יופיעו.</b> אפשר לאשר את ההרשאות ולהשאיר רק חלק מהכפתורים שהתוסף מוסיף לאוצריא — בהגדרות התוסף ← „כפתורים באוצריא“.</div>';
  }
  function changesHtml(since) {
    var out = '';
    (cfg.changelog || []).forEach(function (e) {
      if (since && cmp(e.v, since) <= 0) return;
      out += '<h4>' + esc(e.v) + (e.d ? ' · ' + esc(e.d) : '') + '</h4><ul>' +
        (e.items || []).slice(0, 14).map(function (i) { return '<li>' + linkify(i) + '</li>'; }).join('') + '</ul>';
    });
    return out || '<p>אין פירוט נוסף.</p>';
  }
  function rowsHtml(items, vals) {
    return items.map(function (i, n) {
      var on = vals[n] !== true;
      return '<div class="hbf-row"><span>' + esc(i.title) + (i.where ? '<small>' + esc(i.where) + '</small>' : '') + '</span>' +
        '<button type="button" class="hbf-sw" role="switch" aria-checked="' + on + '" aria-label="' + esc(i.title) + '" data-id="' + esc(i.id) + '"></button></div>';
    }).join('');
  }
  function wireSwitches(root) {
    root.querySelectorAll('.hbf-sw[data-id]').forEach(function (sw) {
      sw.onclick = function () {
        var on = sw.getAttribute('aria-checked') !== 'true';
        sw.setAttribute('aria-checked', String(on));
        sset('hb.hide.' + sw.getAttribute('data-id'), !on);
      };
    });
  }

  var HBFinal = {
    version: '1.1.0',
    init: function (data, opts) {
      cfg = data || window.HB_FINAL_DATA || {};
      opts = opts || {};
      var go = function () {
        if (opts.mount) { HBFinal.mount(opts.mount); setInterval(function () { HBFinal.mount(opts.mount); }, 1500); }
        sget(KEY_LAST).then(function (last) {
          if (last && cmp(cfg.version, last) > 0 && opts.whatsNew !== false) HBFinal.showWhatsNew(last);
          if (!last || cmp(cfg.version, last) !== 0) sset(KEY_LAST, cfg.version);
        });
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(go, 400); });
      else setTimeout(go, 400);
    },
    showWhatsNew: function (since) {
      modal('מה חדש ב' + (cfg.name || 'תוסף') + ' ' + cfg.version, pauseHtml() + buttonsHl() + changesHtml(since),
        [{ t: 'הבנתי' }, { t: 'כפתורים באוצריא…', sec: true, fn: function () { setTimeout(HBFinal.openButtons, 50); } }]);
    },
    openButtons: function () {
      var items = cfg.items || [];
      if (!items.length) { modal('כפתורים באוצריא', '<p>התוסף לא מוסיף כפתורים מחוץ לדף שלו.</p>'); return; }
      Promise.all(items.map(function (i) { return sget('hb.hide.' + i.id); })).then(function (vals) {
        var html = '<p>מתג דלוק — הכפתור מוצג באוצריא. כיבוי מסתיר אותו מיד; ההרשאות נשארות כמו שהן.</p>' + rowsHtml(items, vals) +
          (cfg.notToggleable ? '<p><small>' + esc(cfg.notToggleable) + '</small></p>' : '');
        wireSwitches(modal('כפתורים באוצריא', html));
      });
    },
    /** כרטיס בהגדרות: מתגי גלולה לכל כפתור + "מה חדש" */
    mount: function (target) {
      var el = typeof target === 'string' ? document.querySelector(target) : target;
      if (!el || el.querySelector('.hbf-card')) return;
      css();
      var items = cfg.items || [];
      var card = document.createElement('section'); card.className = 'hbf-card';
      Promise.all(items.map(function (i) { return sget('hb.hide.' + i.id); })).then(function (vals) {
        card.innerHTML = '<h3>כפתורים באוצריא</h3>' +
          (items.length ? '<p>אפשר לאשר את ההרשאות ולבחור רק חלק מהכפתורים. מתג דלוק — הכפתור מוצג; כיבוי מסתיר אותו מיד.</p>' + rowsHtml(items, vals) +
            (cfg.notToggleable ? '<p><small>' + esc(cfg.notToggleable) + '</small></p>' : '')
            : '<p>התוסף לא מוסיף כפתורים מחוץ לדף שלו.</p>') +
          '<div class="hbf-acts"><button type="button" class="hbf-btn sec" data-a="w">מה חדש</button></div>';
        card.querySelector('[data-a=w]').onclick = function () { HBFinal.showWhatsNew(null); };
        wireSwitches(card);
      });
      el.appendChild(card);
    }
  };
  window.HBFinal = HBFinal;
})();
