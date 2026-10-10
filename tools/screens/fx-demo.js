/* fx-demo.js - מדמה את אוצריא ואת הגשר לצילומי מסך לחנות בלבד (לא נארז בתוסף).
   מוזרק לפני הסקריפטים של התוסף ב-CI. השפה נקבעת בפרמטר lang בכתובת */
(function () {
  'use strict';
  var lang = /[?&]lang=en/.test(location.search) ? 'en' : 'he';
  var docs = 'C:\\Users\\Demo\\Documents';
  var now = Date.now();
  var day = 86400000;
  function iso(d) { return new Date(now - d * day).toISOString(); }
  var LIST = {};
  LIST[docs] = [
    { name: lang === 'en' ? 'Lessons' : 'שיעורים', type: 'dir', modified: iso(2) },
    { name: lang === 'en' ? 'Sources' : 'מקורות', type: 'dir', modified: iso(5) },
    { name: lang === 'en' ? 'Notebook' : 'מחברת', type: 'dir', modified: iso(9) },
    { name: lang === 'en' ? 'Weekly portion notes.docx' : 'סיכום פרשת השבוע.docx', type: 'file', size: 48213, ext: 'docx', modified: iso(1) },
    { name: lang === 'en' ? 'Shiur schedule.pdf' : 'לוח שיעורים.pdf', type: 'file', size: 812345, ext: 'pdf', modified: iso(3) },
    { name: lang === 'en' ? 'Questions.txt' : 'שאלות לבירור.txt', type: 'file', size: 2310, ext: 'txt', modified: iso(4) },
    { name: lang === 'en' ? 'Cover.png' : 'כריכה.png', type: 'file', size: 215004, ext: 'png', modified: iso(12) },
    { name: lang === 'en' ? 'Bookshelf.xlsx' : 'רשימת ספרים.xlsx', type: 'file', size: 30552, ext: 'xlsx', modified: iso(20) }
  ].map(function (e) { e.path = docs + '\\' + e.name; return e; });

  function data(path, body) {
    if (path === '/health') return { name: 'otzaria-bridge', version: '0.0.1', kioskActive: false };
    if (path === '/fs/roots') {
      return {
        drives: [
          { path: 'C:\\', label: 'Windows', type: 'fixed', totalBytes: 512e9, freeBytes: 201e9 },
          { path: 'D:\\', label: lang === 'en' ? 'Data' : 'נתונים', type: 'fixed', totalBytes: 1e12, freeBytes: 640e9 },
          { path: 'E:\\', label: 'USB', type: 'removable', totalBytes: 64e9, freeBytes: 21e9 }
        ],
        known: [
          { id: 'desktop', name: 'שולחן העבודה', path: 'C:\\Users\\Demo\\Desktop' },
          { id: 'documents', name: 'מסמכים', path: docs },
          { id: 'downloads', name: 'הורדות', path: 'C:\\Users\\Demo\\Downloads' },
          { id: 'pictures', name: 'תמונות', path: 'C:\\Users\\Demo\\Pictures' }
        ]
      };
    }
    if (path === '/fs/list') {
      return { path: body.path, parent: 'C:\\Users\\Demo', entries: LIST[body.path] || [] };
    }
    return {};
  }

  var handlers = {};
  window.Otzaria = {
    on: function (ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); },
    call: function (method, params) {
      if (method === 'network.fetchStream') {
        var u = String(params.url || '');
        var path = u.replace(/^https?:\/\/[^/]+/, '');
        var body = {};
        try { body = JSON.parse(params.body || '{}'); } catch (e) { body = {}; }
        var text = JSON.stringify({ ok: true, data: data(path, body) });
        return (async function* () {
          yield { type: 'response', status: 200, ok: true };
          yield { type: 'data', body: text };
        })();
      }
      if (method === 'app.getLocale') return Promise.resolve({ success: true, data: { locale: lang } });
      return Promise.resolve({ success: true, data: null });
    }
  };

  window.addEventListener('load', function () {
    setTimeout(function () {
      (handlers['plugin.boot'] || []).forEach(function (fn) { fn({ plugin: { version: '0.0.1' } }); });
      setTimeout(function () {
        if (window.FX && window.FX.app) window.FX.app.go(docs);
      }, 600);
    }, 50);
  });
})();
