/* hb-final.js 1.0.0 — ערכת סיום משותפת לתוספי Hadabadra (חד בדרא), 16.11.2026.
 * 1. "מה חדש" — חלון קופץ אחרי עדכון, עם השינויים מאז הגרסה שהייתה מותקנת.
 * 2. "כפתורים באוצריא" — הסתרה/הצגה של כל כפתור שהתוסף מוסיף לאוצריא, בלי לבטל הרשאות.
 *    כל פריט ב-contributes.startup במניפסט נושא when: {not:{storage:{key:"hb.hide.<id>",equals:true}}},
 *    ואוצריא מסתירה אותו מיד כשהערך נשמר (בלי להריץ את התוסף).
 * שימוש: HBFinal.init(window.HB_FINAL_DATA, { mount: '#settings' }) — mount אופציונלי (מוסיף שני כפתורים).
 * עיצוב: צבעים רק var(--color-*), מידות ב-em. אין תלות בספריות.
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

  function css() {
    if (document.getElementById('hbf-css')) return;
    var s = document.createElement('style'); s.id = 'hbf-css';
    s.textContent =
      '.hbf-back{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center}.hbf-back::before{content:"";position:absolute;inset:0;background:var(--color-on-surface);opacity:0.35}' +
      '.hbf-box{background:var(--color-surface);color:var(--color-on-surface);border-radius:0.9em;position:relative;box-shadow:0 0.4em 1.6em var(--color-outline);width:min(36em,92vw);max-height:84vh;display:flex;flex-direction:column;direction:rtl}' +
      '.hbf-h{padding:1em 1.2em 0.4em;font-weight:700;font-size:1.15em;display:flex;justify-content:space-between;align-items:center;gap:1em}' +
      '.hbf-b{padding:0.4em 1.2em 1em;overflow:auto;line-height:1.6}' +
      '.hbf-b h4{margin:0.9em 0 0.2em;color:var(--color-primary)}.hbf-b ul{margin:0;padding-inline-start:1.3em}' +
      '.hbf-note{background:var(--color-secondary-subtle,var(--color-surface-container-high));border-radius:0.6em;padding:0.6em 0.8em;margin:0.4em 0}' +
      '.hbf-f{padding:0.6em 1.2em 1em;display:flex;gap:0.6em;justify-content:flex-start;flex-wrap:wrap}' +
      '.hbf-btn{font:inherit;border:0;border-radius:0.6em;padding:0.45em 1em;cursor:pointer;background:var(--color-primary);color:var(--color-on-primary)}' +
      '.hbf-btn.sec{background:var(--color-surface-container-high);color:var(--color-on-surface)}' +
      '.hbf-x{font:inherit;background:none;border:0;color:var(--color-on-surface-variant);cursor:pointer;font-size:1.2em}' +
      '.hbf-row{display:flex;align-items:center;gap:0.6em;padding:0.45em 0;border-bottom:0.06em solid var(--color-outline)}' +
      '.hbf-row small{color:var(--color-on-surface-variant)}.hbf-mount{display:flex;gap:0.5em;flex-wrap:wrap;margin:0.6em 0}';
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
    document.body.appendChild(back);
    return back;
  }

  function pauseHtml() {
    var l = cfg.links || {};
    return '<div class="hbf-note"><b>הפיתוח מושהה לעת עתה (עד ~מאי 2027).</b> לא יצאו גרסאות חדשות בתקופה הזו. ' +
      'אפשר להמשיך לשלוח דיווחים ובקשות — הם נשמרים ויטופלו בחזרה. מי שרוצה להמשיך את פיתוח התוסף מוזמן ליצור קשר' +
      (l.join ? ' (<a href="' + esc(l.join) + '" target="_blank" rel="noopener">בקשת הצטרפות ב-GitHub</a>)' : '') + '.</div>';
  }
  function changesHtml(since) {
    var out = '';
    (cfg.changelog || []).forEach(function (e) {
      if (since && cmp(e.v, since) <= 0) return;
      out += '<h4>' + esc(e.v) + (e.d ? ' · ' + esc(e.d) : '') + '</h4><ul>' +
        (e.items || []).slice(0, 12).map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>';
    });
    return out || '<p>אין פירוט נוסף.</p>';
  }

  var HBFinal = {
    version: '1.0.0',
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
      modal('מה חדש ב' + (cfg.name || 'תוסף') + ' ' + cfg.version, pauseHtml() + changesHtml(since),
        [{ t: 'הבנתי' }, { t: 'כפתורים באוצריא…', sec: true, fn: function () { setTimeout(HBFinal.openButtons, 50); } }]);
    },
    openButtons: function () {
      var items = cfg.items || [];
      if (!items.length) { modal('כפתורים באוצריא', '<p>התוסף לא מוסיף כפתורים מחוץ לדף שלו.</p>'); return; }
      Promise.all(items.map(function (i) { return sget('hb.hide.' + i.id); })).then(function (vals) {
        var html = '<p>סמנו אילו כפתורים של התוסף יוצגו באוצריא. ההסתרה מיידית, ההרשאות נשארות כמו שהן.</p>' +
          items.map(function (i, n) {
            return '<label class="hbf-row"><input type="checkbox" data-id="' + esc(i.id) + '"' + (vals[n] === true ? '' : ' checked') + '>' +
              '<span>' + esc(i.title) + '<br><small>' + esc(i.where || '') + '</small></span></label>';
          }).join('') +
          (cfg.notToggleable ? '<p><small>' + esc(cfg.notToggleable) + '</small></p>' : '');
        var m = modal('כפתורים באוצריא', html);
        m.querySelectorAll('input[data-id]').forEach(function (cb) {
          cb.onchange = function () { sset('hb.hide.' + cb.getAttribute('data-id'), !cb.checked); };
        });
      });
    },
    mount: function (target) {
      var el = typeof target === 'string' ? document.querySelector(target) : target;
      if (!el || el.querySelector('.hbf-mount')) return;
      css();
      var w = document.createElement('div'); w.className = 'hbf-mount';
      w.innerHTML = '<button class="hbf-btn sec" data-a="b">כפתורים באוצריא…</button><button class="hbf-btn sec" data-a="w">מה חדש</button>';
      w.querySelector('[data-a=b]').onclick = HBFinal.openButtons;
      w.querySelector('[data-a=w]').onclick = function () { HBFinal.showWhatsNew(null); };
      el.appendChild(w);
    }
  };
  window.HBFinal = HBFinal;
})();
