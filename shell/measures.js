// 5.7.0 — מידות נפח (יבש ולח) ומידות אורך של חז״ל, לפי שתי שיטות השיעורים,
// עם השוואה למידות של היום. יחידת הבסיס: ביצה (נפח) ואצבע (אורך).
// ר׳ חיים נאה: ביצה ≈ 57.6 סמ״ק, אצבע = 2 ס״מ. החזון איש: ביצה ≈ 99.5 סמ״ק, אצבע = 2.4 ס״מ.
// אין כאן הוראה למעשה — לשאלה מעשית יש לשאול רב.
const MEAS_SHITOT = [
  { label: 'לשיטת ר׳ חיים נאה', egg: 57.6, finger: 2 },
  { label: 'לשיטת החזון איש', egg: 99.5, finger: 2.4 }
];
// v = בביצים; l = באצבעות
const MEAS_UNITS = {
  'ביצה': { v: 1 }, 'רביעית': { v: 1.5 }, 'לוג': { v: 6 }, 'קב': { v: 24 },
  'עשרון': { v: 43.2 }, 'עומר': { v: 43.2 }, 'תרקב': { v: 72 }, 'הין': { v: 72 },
  'סאה': { v: 144 }, 'איפה': { v: 432 }, 'בת': { v: 432 }, 'לתך': { v: 2160 },
  'כור': { v: 4320 }, 'חומר': { v: 4320 },
  'אצבע': { l: 1 }, 'טפח': { l: 4 }, 'זרת': { l: 12 }, 'אמה': { l: 24 },
  'ריס': { l: 24 * 800 / 3 }, 'מיל': { l: 48000 }, 'פרסה': { l: 192000 },
  // 6.0.0 (מסכת ערכין) — מידות שטח, a = באמות מרובעות. רמב״ם הלכות ערכים וחרמין ד, ד:
  // בית סאה = חמשים אמה על חמשים אמה; בית כור (״זרע חומר שעורים״) = שלושים בית סאה = 75,000 אמה.
  'בית סאה': { a: 2500 }, 'בית כור': { a: 75000 }
};
const AREA_ORDER = ['בית סאה', 'בית כור'];
function fmtArea(m2){
  if (m2 < 1000) return Math.round(m2).toLocaleString('he-IL') + ' מ״ר';
  return Math.round(m2).toLocaleString('he-IL') + ' מ״ר (' + (m2 / 1000).toLocaleString('he-IL', { maximumFractionDigits: 1 }) + ' דונם)';
}
// אמה = 24 אצבעות; השטח במטרים רבועים לכל שיטה
function areaVals(u){ return MEAS_SHITOT.map(s => u.a * Math.pow(s.finger * 24 / 100, 2)); }
function areaBoxHTML(entry){
  const u = MEAS_UNITS[entry.name], v = areaVals(u);
  let h = '<div class="coin-box"><h3>📐 שטח ובהשוואה להיום</h3><table class="coin-table"><tr><th>שיטה</th><th>אמה</th><th>שטח</th></tr>';
  MEAS_SHITOT.forEach((s, i) => { h += '<tr><td>' + esc(s.label) + '</td><td>' + fmtLen(s.finger * 24) + '</td><td>' + fmtArea(v[i]) + '</td></tr>'; });
  h += '</table><p class="coin-note">בית סאה = 50 × 50 אמה (2,500 אמה מרובעת); בית כור = 30 בית סאה = 75,000 אמה, ״ברבוע מאתים ארבע ושבעים אמות על מאתים ארבע ושבעים אמות בקירוב״ (רמב״ם, הלכות ערכים וחרמין ד, ד).</p>'
    + '<details class="coin-weights"><summary>📊 כל מידות השטח</summary><div class="coin-scroll"><table class="coin-table"><tr><th>מידה</th>'
    + MEAS_SHITOT.map(s => '<th>' + esc(s.label) + '</th>').join('') + '</tr>'
    + AREA_ORDER.map(n => '<tr><td>' + esc(n) + '</td>' + areaVals(MEAS_UNITS[n]).map(x => '<td>' + fmtArea(x) + '</td>').join('') + '</tr>').join('')
    + '</table></div></details><p class="coin-note">השיעורים בקירוב; יש עוד שיטות. לשאלה למעשה יש לשאול רב.</p></div>';
  return h;
}
const VOL_ORDER = ['ביצה','רביעית','לוג','קב','עשרון','תרקב','הין','סאה','איפה','לתך','כור'];
const LEN_ORDER = ['אצבע','טפח','זרת','אמה','ריס','מיל','פרסה'];

function fmtVol(cc){
  if (cc < 1000) return Math.round(cc) + ' סמ״ק';
  return (cc / 1000).toLocaleString('he-IL', { maximumFractionDigits: cc < 10000 ? 2 : 1 }) + ' ליטר';
}
function fmtLen(cm){
  if (cm < 100) return cm.toLocaleString('he-IL', { maximumFractionDigits: 1 }) + ' ס״מ';
  if (cm < 100000) return (cm / 100).toLocaleString('he-IL', { maximumFractionDigits: 2 }) + ' מטר';
  return (cm / 100000).toLocaleString('he-IL', { maximumFractionDigits: 2 }) + ' ק״מ';
}
function volToday(cc){
  const r = cc < 400 ? [200, 'כוס חד-פעמית (200 מ״ל)'] : cc < 3000 ? [1500, 'בקבוק 1.5 ליטר'] : cc < 30000 ? [10000, 'דלי 10 ליטר'] : [200000, 'חבית 200 ליטר'];
  const n = cc / r[0];
  return '≈ ' + n.toLocaleString('he-IL', { maximumFractionDigits: n < 10 ? 1 : 0 }) + ' × ' + r[1];
}
function lenToday(cm){
  const r = cm < 4 ? [2.5, 'אינץ׳'] : cm < 200 ? [30, 'סרגל 30 ס״מ'] : cm < 5000 ? [100, 'מטר'] : cm < 50000 ? [10500, 'מגרש כדורגל (105 מ׳)'] : [100000, 'ק״מ'];
  const n = cm / r[0];
  return '≈ ' + n.toLocaleString('he-IL', { maximumFractionDigits: n < 10 ? 1 : 0 }) + ' × ' + r[1];
}
function measVals(u){ return MEAS_SHITOT.map(s => u.v ? s.egg * u.v : s.finger * u.l); }

function measTableHTML(order, isVol){
  let h = '<div class="coin-scroll"><table class="coin-table"><tr><th>מידה</th>'
    + MEAS_SHITOT.map(s => '<th>' + esc(s.label) + '</th>').join('') + '<th>בהשוואה להיום</th></tr>';
  order.forEach(n => {
    const v = measVals(MEAS_UNITS[n]);
    h += '<tr><td>' + esc(n) + '</td>' + v.map(x => '<td>' + (isVol ? fmtVol(x) : fmtLen(x)) + '</td>').join('')
      + '<td>' + (isVol ? volToday(v[0]) : lenToday(v[0])) + '</td></tr>';
  });
  return h + '</table></div>';
}

// ספרי השיעורים בספריית אוצריא — מוצגים רק אם הספר נמצא בספרייה המותקנת
const MEAS_BOOKS = ['שיעורי תורה', 'שיעור מקוה', 'קונטרס השיעורים', 'חזון איש'];
async function fillMeasBooks(){
  const box = document.querySelector('.meas-books:not(.done)'); if (!box) return;
  box.classList.add('done');
  if (!(window.Otzaria && Otzaria.call)) { box.textContent = 'ספרי השיעורים זמינים בספריית אוצריא.'; return; }
  const found = [];
  for (const b of MEAS_BOOKS){
    try {
      const r = await Otzaria.call('library.getBookDetails', { bookId: b });
      const d = r && (r.data !== undefined ? r.data : r);
      if (d && (d.bookId || d.title)) found.push({ id: d.bookId || b, title: d.title || b });
    } catch(e){}
  }
  if (!found.length){ box.textContent = 'ספרי הפולמוס על השיעורים (שיעורי תורה לר׳ חיים נאה, קונטרס השיעורים לחזון איש) לא נמצאו בספרייה המותקנת.'; return; }
  box.innerHTML = '<b>הפולמוס על השיעורים בספריית אוצריא:</b> ';
  found.forEach(f => {
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'panel-btn secondary';
    btn.textContent = '📖 ' + f.title;
    btn.addEventListener('click', () => Otzaria.call('reader.openBook', { bookId: f.id }).catch(() => {}));
    box.appendChild(btn);
  });
}

function measBoxHTML(entry){
  const u = MEAS_UNITS[entry.name]; if (!u) return '';
  if (u.a) return areaBoxHTML(entry);
  const v = measVals(u), isVol = !!u.v;
  let h = '<div class="coin-box"><h3>📏 ' + (isVol ? 'נפח' : 'אורך') + ' ובהשוואה להיום</h3><table class="coin-table"><tr><th>שיטה</th><th>' + (isVol ? 'נפח' : 'אורך') + '</th><th>בהשוואה להיום</th></tr>';
  MEAS_SHITOT.forEach((s, i) => { h += '<tr><td>' + esc(s.label) + '</td><td>' + (isVol ? fmtVol(v[i]) : fmtLen(v[i])) + '</td><td>' + (isVol ? volToday(v[i]) : lenToday(v[i])) + '</td></tr>'; });
  h += '</table>';
  if (isVol) h += '<p class="coin-note">ביצה = ' + MEAS_SHITOT.map(s => fmtVol(s.egg)).join(' / ') + '; רביעית = ביצה וחצי; לוג = 6 ביצים; קב = 4 לוגין; סאה = 6 קבין; איפה = 3 סאין; כור = 30 סאין.</p>';
  else h += '<p class="coin-note">אצבע (אגודל) = ' + MEAS_SHITOT.map(s => s.finger + ' ס״מ').join(' / ') + '; טפח = 4 אצבעות; זרת = 3 טפחים; אמה = 6 טפחים; מיל = 2000 אמה; פרסה = 4 מילין.</p>';
  h += '<details class="coin-weights"><summary>📊 כל מידות הנפח (יבש ולח)</summary>' + measTableHTML(VOL_ORDER, true) + '</details>'
    + '<details class="coin-weights"><summary>📊 כל מידות האורך</summary>' + measTableHTML(LEN_ORDER, false) + '</details>'
    + '<p class="coin-note meas-books"></p>'
    + '<p class="coin-note">השיעורים בקירוב; יש עוד שיטות. לשאלה למעשה יש לשאול רב.</p></div>';
  setTimeout(fillMeasBooks, 0);
  return h;
}

(function(){
  if (typeof renderEntryDetailHTML !== 'function') return;
  const orig = renderEntryDetailHTML;
  window.renderEntryDetailHTML = renderEntryDetailHTML = function(entry){
    const html = orig.apply(this, arguments);
    if (!entry || !MEAS_UNITS[entry.name] || !/^(containers|measures)$/.test(entry.cat || '')) return html;
    return html + measBoxHTML(entry);
  };
})();
