/* סייר קבצים - פונקציות עזר כלליות */
(function () {
  'use strict';
  var FX = window.FX = window.FX || {};

  var TEXT_EXT = ['txt', 'md', 'json', 'csv', 'xml', 'html', 'htm', 'js', 'css', 'log', 'ini', 'tsv', 'yml', 'yaml', 'cfg', 'conf', 'bat', 'cmd', 'ps1', 'py', 'java', 'cs', 'ts', 'sql', 'srt'];
  var IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico'];
  var KINDS = {
    folder: { label: 'תיקיית קבצים', icon: 'folder' },
    drive: { label: 'כונן', icon: 'drive' },
    text: { label: 'מסמך טקסט', icon: 'fileText' },
    image: { label: 'תמונה', icon: 'image' },
    pdf: { label: 'מסמך PDF', icon: 'pdf' },
    word: { label: 'מסמך Word', icon: 'word' },
    sheet: { label: 'גיליון אלקטרוני', icon: 'sheet' },
    slides: { label: 'מצגת', icon: 'slides' },
    audio: { label: 'קובץ שמע', icon: 'audio' },
    video: { label: 'קובץ וידאו', icon: 'video' },
    archive: { label: 'קובץ דחוס', icon: 'archive' },
    exe: { label: 'יישום', icon: 'app' },
    book: { label: 'ספר אלקטרוני', icon: 'book' },
    code: { label: 'קובץ קוד', icon: 'code' },
    file: { label: 'קובץ', icon: 'file' }
  };
  var EXT_KIND = {};
  function reg(kind, list) { list.forEach(function (e) { EXT_KIND[e] = kind; }); }
  reg('text', ['txt', 'md', 'log', 'ini', 'csv', 'tsv', 'cfg', 'conf', 'srt']);
  reg('code', ['json', 'xml', 'html', 'htm', 'js', 'css', 'yml', 'yaml', 'bat', 'cmd', 'ps1', 'py', 'java', 'cs', 'ts', 'sql']);
  reg('image', IMAGE_EXT);
  reg('pdf', ['pdf']);
  reg('word', ['doc', 'docx', 'odt', 'rtf']);
  reg('sheet', ['xls', 'xlsx', 'ods']);
  reg('slides', ['ppt', 'pptx', 'odp']);
  reg('audio', ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'wma', 'aac']);
  reg('video', ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'webm']);
  reg('archive', ['zip', 'rar', '7z', 'tar', 'gz', 'otzplugin']);
  reg('exe', ['exe', 'msi', 'lnk']);
  reg('book', ['epub', 'mobi']);

  FX.extOf = function (name) {
    var i = String(name || '').lastIndexOf('.');
    if (i <= 0) return '';
    return name.slice(i + 1).toLowerCase();
  };
  FX.kindOf = function (entry) {
    if (!entry) return 'file';
    if (entry.type === 'drive') return 'drive';
    if (entry.type === 'dir') return 'folder';
    var ext = (entry.ext || FX.extOf(entry.name)).replace(/^\./, '').toLowerCase();
    return EXT_KIND[ext] || 'file';
  };
  FX.kindInfo = function (kind) { return KINDS[kind] || KINDS.file; };
  FX.typeLabel = function (entry) {
    var k = FX.kindOf(entry);
    if (k === 'file' || k === 'text' || k === 'code') {
      var ext = (entry.ext || FX.extOf(entry.name)).replace(/^\./, '');
      if (k === 'file') return ext ? 'קובץ ' + ext.toUpperCase() : 'קובץ';
      return FX.kindInfo(k).label + (ext ? ' (' + ext.toUpperCase() + ')' : '');
    }
    return FX.kindInfo(k).label;
  };
  FX.isTextExt = function (ext) { return TEXT_EXT.indexOf(String(ext || '').toLowerCase()) >= 0; };
  FX.isImageExt = function (ext) { return IMAGE_EXT.indexOf(String(ext || '').toLowerCase()) >= 0; };

  FX.formatSize = function (bytes) {
    if (bytes == null || isNaN(bytes)) return '';
    var n = Number(bytes);
    if (n < 1024) return n + ' בתים';
    var units = ['KB', 'MB', 'GB', 'TB'];
    var u = -1;
    do { n /= 1024; u++; } while (n >= 1024 && u < units.length - 1);
    return (n >= 100 ? Math.round(n) : n.toFixed(1).replace(/\.0$/, '')) + ' ' + units[u];
  };
  FX.formatNumber = function (n) {
    try { return Number(n).toLocaleString('he-IL'); } catch (e) { return String(n); }
  };
  FX.formatDate = function (iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var pad = function (x) { return (x < 10 ? '0' : '') + x; };
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  };

  FX.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* כלי נתיבים של Windows */
  FX.win = {
    join: function (dir, name) {
      if (!dir) return name;
      return /[\\/]$/.test(dir) ? dir + name : dir + '\\' + name;
    },
    isDriveRoot: function (p) { return /^[A-Za-z]:\\?$/.test(p || ''); },
    parent: function (p) {
      if (!p) return null;
      if (FX.win.isDriveRoot(p)) return '';
      var s = p.replace(/\\+$/, '');
      var i = s.lastIndexOf('\\');
      if (i < 0) return '';
      var par = s.slice(0, i);
      if (/^[A-Za-z]:$/.test(par)) par += '\\';
      if (par === '' || par === '\\') return '';
      return par;
    },
    name: function (p) {
      if (!p) return 'המחשב הזה';
      if (FX.win.isDriveRoot(p)) return p.slice(0, 2).toUpperCase() + '\\';
      var s = p.replace(/\\+$/, '');
      return s.slice(s.lastIndexOf('\\') + 1);
    },
    segments: function (p) {
      var out = [{ label: 'המחשב הזה', path: '' }];
      if (!p) return out;
      var unc = /^\\\\/.test(p);
      var parts = p.replace(/^\\\\/, '').split('\\').filter(Boolean);
      var acc = '';
      parts.forEach(function (part, i) {
        if (i === 0) {
          acc = unc ? '\\\\' + part : part + '\\';
          out.push({ label: unc ? acc : part.toUpperCase() + '\\', path: acc });
        } else {
          acc = FX.win.join(acc, part);
          out.push({ label: part, path: acc });
        }
      });
      return out;
    },
    same: function (a, b) { return String(a || '').replace(/\\+$/, '').toLowerCase() === String(b || '').replace(/\\+$/, '').toLowerCase(); },
    isInside: function (child, parent) {
      var c = String(child || '').replace(/\\+$/, '').toLowerCase();
      var p = String(parent || '').replace(/\\+$/, '').toLowerCase();
      return c === p || c.indexOf(p + '\\') === 0;
    }
  };

  /* התאמת שם לתבנית: עם * או ? כתבנית, אחרת מכיל */
  FX.nameMatcher = function (query) {
    var q = String(query || '').trim().toLowerCase();
    if (!q) return function () { return true; };
    if (/[*?]/.test(q)) {
      var re = new RegExp('^' + q.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
      return function (name) { return re.test(name); };
    }
    return function (name) { return String(name).toLowerCase().indexOf(q) >= 0; };
  };
  FX.parseExtensions = function (s) {
    return String(s || '').split(/[\s,;]+/).map(function (x) { return x.replace(/^\*?\./, '').toLowerCase(); }).filter(Boolean);
  };

  FX.sortEntries = function (entries, key, dir) {
    var mul = dir === 'desc' ? -1 : 1;
    var coll;
    try { coll = new Intl.Collator('he', { numeric: true, sensitivity: 'base' }); } catch (e) { coll = { compare: function (a, b) { return a < b ? -1 : a > b ? 1 : 0; } }; }
    return entries.slice().sort(function (a, b) {
      var ad = a.type === 'dir' || a.type === 'drive';
      var bd = b.type === 'dir' || b.type === 'drive';
      if (ad !== bd) return ad ? -1 : 1;
      var r = 0;
      if (key === 'size') r = (a.size || 0) - (b.size || 0);
      else if (key === 'date') r = (Date.parse(a.modified) || 0) - (Date.parse(b.modified) || 0);
      else if (key === 'type') r = coll.compare(FX.typeLabel(a), FX.typeLabel(b));
      if (r === 0) r = coll.compare(a.name, b.name);
      return r * mul;
    });
  };

  FX.hexToRgba = function (hex, alpha) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 8) h = h.slice(2);
    if (h.length !== 6) return 'rgba(0,0,0,' + alpha + ')';
    return 'rgba(' + parseInt(h.slice(0, 2), 16) + ',' + parseInt(h.slice(2, 4), 16) + ',' + parseInt(h.slice(4, 6), 16) + ',' + alpha + ')';
  };

  FX.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  FX.debounce = function (fn, ms) {
    var t = null;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  };

  /* שגיאה אחידה עם קוד */
  FX.OpError = function (code, message) {
    var e = new Error(message || code);
    e.code = code;
    return e;
  };
  FX.errorText = function (err) {
    if (!err) return 'שגיאה לא ידועה';
    var map = {
      not_found: 'הפריט לא נמצא',
      forbidden: 'הפעולה אסורה במיקום זה',
      exists: 'כבר קיים פריט בשם הזה',
      locked: 'הפעולה חסומה במצב נעילה',
      unsupported: 'הפעולה אינה נתמכת',
      bad_request: 'בקשה לא תקינה',
      unreachable: 'אין חיבור לגשר אוצריא',
      timeout: 'הפעולה ארכה זמן רב מדי',
      permission_denied: 'חסרה הרשאה מתאימה לתוסף'
    };
    var code = String(err.code || '').replace(/^error\./, '');
    var en = window.I18N && window.I18N.isEn() && map[code];
    if (err.message && !/^[a-z_.]+$/.test(err.message) && !en) return err.message;
    return map[code] || err.message || 'שגיאה לא ידועה';
  };

  /* מטפל בתשובת Otzaria.call ומחזיר data או זורק */
  FX.unwrap = function (res) {
    if (!res) throw FX.OpError('internal', 'לא התקבלה תשובה מאוצריא');
    if (res.success === false) {
      var er = res.error || {};
      throw FX.OpError(er.code || 'internal', er.message || 'שגיאה');
    }
    return res.data;
  };

  FX.callHost = async function (method, params) {
    if (!window.Otzaria) throw FX.OpError('unavailable', 'אוצריא אינה זמינה');
    var res = await window.Otzaria.call(method, params || {});
    return FX.unwrap(res);
  };
})();
