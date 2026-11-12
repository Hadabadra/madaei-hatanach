// 6.0.0 (סבב 6ב) — מדריך מסכת ערכין, ותשתית ״מדריך מסכת = קישורים״.
//
// הרעיון: ערך במדריך מסכת אינו משכפל את מה שכבר יש במדריכים הקיימים. הוא נושא
// תקציר קצר לפי הסוגיה, דף (daf) והקשר (cat), ו-link: { cat, entry } לערך המלא
// במדריך המתאים (דומם, מקומות וכו׳). מסכת חדשה = קובץ נתונים של קישורים, וכל
// פריט חדש שנמצא בה נכנס קודם למדריך הנכון, ורק הקישור אליו נכנס למדריך המסכת.
//
//   link        — כפתור ״לערך המלא״ שפותח את הערך במדריך שלו
//   erechTable  — טבלת ערכי אדם (ויקרא כז, ג–ז) עם משקל הכסף ושוויו היום (coins.js)
//   sadehBox    — שדה אחוזה: חמשים שקל לבית כור ו״סלע ופונדיון לשנה״, בשווי של היום
//   tags        — שורת תגים בכרטיס (למשל ״מוקף חומה מימות יהושע״)
//   dafMatchesForTitle — בקורא: דף גמרא פתוח מציג גם את הערכים שמראה המקום שלהם הוא הדף
//
// אין להפוך ל-type="module" — כל הקבצים חולקים scope גלובלי אחד. נטען אחרי coins.js.

// רמב״ם, הלכות ערכים וחרמין א, ג — הגילים מעת לעת מיום הלידה (שם, ד)
const ERECH_ROWS = [
  { age: 'מבן חודש (31 יום) עד בן חמש שנים', m: 5, f: 3, ref: 'ויקרא כז, ו' },
  { age: 'מבן חמש עד בן עשרים', m: 20, f: 10, ref: 'ויקרא כז, ה' },
  { age: 'מבן עשרים עד בן שישים', m: 50, f: 30, ref: 'ויקרא כז, ג–ד' },
  { age: 'מבן שישים ומעלה', m: 15, f: 10, ref: 'ויקרא כז, ז' },
];

function shekelValCells(n){
  // שקל הקודש = סלע = 4 דינר (COIN_UNITS ב-coins.js); לכל שיטה משקל ושווי
  const u = (typeof COIN_UNITS !== 'undefined') && COIN_UNITS['שקל'];
  if (!u || typeof coinGrams !== 'function') return '';
  return coinGrams(u).map(r => '<div class="mini-note">' + esc(r.label) + ': ' + fmtG(r.g * n)
    + ' · <span class="coin-val" data-coin-g="' + (r.g * n) + '" data-coin-metal="silver">…</span></div>').join('');
}

function erechTableHTML(){
  let h = '<div class="coin-box"><h3>⚖️ ערכי אדם ושוויים היום</h3>'
    + '<div class="coin-scroll"><table class="coin-table"><tr><th>גיל</th><th>זכר</th><th>נקבה</th></tr>';
  ERECH_ROWS.forEach(r => {
    h += '<tr><td>' + esc(r.age) + '<div class="mini-note">' + esc(r.ref) + '</div></td>'
      + '<td><b>' + r.m + ' שקל</b>' + shekelValCells(r.m) + '</td>'
      + '<td><b>' + r.f + ' שקל</b>' + shekelValCells(r.f) + '</td></tr>';
  });
  h += '</table></div>'
    + '<p class="coin-note">פחות מבן שלושים יום — אין לו ערך (רמב״ם, הלכות ערכים וחרמין א, ג). כל השקלים בשקל הקודש, והגילים מעת לעת מיום הלידה (שם, ד). '
    + 'אין בערכין פחות מסלע ולא יותר על חמשים סלע (משנה, ערכין ב, א); עני נותן ״כפי אשר תשיג יד הנודר״ (ויקרא כז, ח).</p>'
    + '<p class="coin-note coin-src"></p>'
    + '<p class="coin-note">השווי לפי מחיר הכסף העולמי וב-2 שיטות מקובלות; אין כאן הוראה למעשה — לשאלה מעשית יש לשאול רב.</p></div>';
  setTimeout(() => { if (typeof fillCoinValues === 'function') fillCoinValues(); }, 0);
  return h;
}

// משנה, ערכין ז, א: ״נותן בזרע חמר שערים חמשים שקל כסף... נותן סלע ופנדיון לשנה״
function sadehBoxHTML(){
  const sela = (typeof COIN_UNITS !== 'undefined') && COIN_UNITS['שקל'];
  const pond = (typeof COIN_UNITS !== 'undefined') && COIN_UNITS['פונדיון'];
  if (!sela || !pond || typeof coinGrams !== 'function') return '';
  const rows = [['בשנת היובל — לבית כור', 50, 0], ['לכל שנה שנותרה עד היובל', 1, 1]];
  let h = '<div class="coin-box"><h3>🌾 פדיון שדה אחוזה בשווי של היום</h3>'
    + '<div class="coin-scroll"><table class="coin-table"><tr><th>מה</th><th>כמה</th><th>משקל ושווי</th></tr>';
  rows.forEach(r => {
    const cells = coinGrams(sela).map((s, i) => {
      const g = s.g * r[1] + coinGrams(pond)[i].g * r[2];
      return '<div class="mini-note">' + esc(s.label) + ': ' + fmtG(g)
        + ' · <span class="coin-val" data-coin-g="' + g + '" data-coin-metal="silver">…</span></div>';
    }).join('');
    h += '<tr><td>' + esc(r[0]) + '</td><td>' + (r[2] ? 'סלע ופונדיון' : r[1] + ' שקל') + '</td><td>' + cells + '</td></tr>';
  });
  h += '</table></div>'
    + '<p class="coin-note">בית כור = ״זרע חומר שעורים״ = 75,000 אמה מרובעת (רמב״ם, הלכות ערכים וחרמין ד, ד) — ר׳ ״בית כור״ במדריך דומם. '
    + 'הבעלים מוסיפים חומש (משנה, ערכין ז, ב).</p><p class="coin-note coin-src"></p>'
    + '<p class="coin-note">אין כאן הוראה למעשה — לשאלה מעשית יש לשאול רב.</p></div>';
  setTimeout(() => { if (typeof fillCoinValues === 'function') fillCoinValues(); }, 0);
  return h;
}

function linkBoxHTML(entry){
  const l = entry.link;
  if (!l || !l.cat || !l.entry) return '';
  const cat = (typeof CATEGORIES !== 'undefined') && CATEGORIES.find(c => c.id === l.cat);
  const label = cat ? cat.label : l.cat;
  return '<div class="arachin-link" style="margin-top:0.75em;"><button type="button" class="panel-btn" '
    + 'data-goto-cat="' + esc(l.cat) + '" data-goto-entry="' + esc(l.entry) + '">'
    + '📖 לערך המלא: ' + esc(l.entry) + ' — במדריך ' + esc(label) + ' ›</button></div>';
}

(function(){
  if (typeof renderEntryDetailHTML !== 'function') return;
  const orig = renderEntryDetailHTML;
  window.renderEntryDetailHTML = renderEntryDetailHTML = function(entry){
    // 6.1.0 — ערך יעד שנפתח מתוך מדריך מסכת: הכרטיס המלא שלו (עם התמונות, השדות והמקורות
    // של המדריך שלו), ומעליו שורת ההקשר מהמסכת. העריכה — רק במדריך עצמו.
    const via = entry && linkedVia(entry);
    if (via){
      let full = orig.call(this, entry, via.link.cat);
      full = full.replace(/ ?<button id="entryEditBtn"[^>]*>[^<]*<\/button>/, '');
      let extra = '';
      if (via.erechTable) extra += erechTableHTML();
      if (via.sadehBox) extra += sadehBoxHTML();
      return linkCtxHTML(via) + full + extra;
    }
    let html = orig.apply(this, arguments);
    if (!entry) return html;
    if (entry.erechTable) html += erechTableHTML();
    if (entry.sadehBox) html += sadehBoxHTML();
    if (entry.link) html += linkBoxHTML(entry);
    if (Array.isArray(entry.tags) && entry.tags.length)
      html += '<p class="mini-note" style="margin-top:0.5em;">🏷️ ' + entry.tags.map(esc).join(' · ') + '</p>';
    return html;
  };
})();

// ---- 6.1.0: כרטיס מקושר מציג את הכרטיס המלא של היעד, בלי לשכפל טקסט ----
// ערך במדריך מסכת עם link נפתח ישר כערך היעד עצמו (אותו אובייקט מ-dataCache, לא העתק),
// כך שכל השדות, התמונות והמקורות באים מהמדריך שלו. LINKED_FROM זוכר מאיזה ערך מסכת הגענו,
// והוא נבדק רק כשמדריך המסכת פתוח — באותו ערך במדריך שלו לא מופיעה שורת ההקשר.
const LINKED_FROM = new WeakMap();
function linkedVia(entry){
  const v = LINKED_FROM.get(entry);
  return (v && typeof currentGuideCat !== 'undefined' && currentGuideCat && currentGuideCat.id === v.__guide) ? v : null;
}
function findLinkTarget(data, name){
  const n = normalizeHeb(name);
  return (data || []).find(e => normalizeHeb(e.name) === n) || null;
}
function linkCtxHTML(src){
  const cats = (typeof catsCache !== 'undefined' && catsCache[src.__guide]) || [];
  const ctx = (cats.find(c => c.id === src.cat) || {}).label || '';
  const tcat = CATEGORIES.find(c => c.id === src.link.cat);
  const dafs = Array.isArray(src.dafs) && src.dafs.length > 1 ? src.dafs : null;   // 6.2.0 — חכם שבכמה דפים
  return '<div class="linked-ctx">📜 ' + esc(src.masechet || '') + (dafs ? ' דפים ' + dafs.map(esc).join(', ') : (src.daf ? ' דף ' + esc(src.daf) : ''))
    + (ctx ? ' · ' + esc(ctx) : '') + (src.name !== src.link.entry ? ' · ' + esc(src.name) : '')
    + (src.note ? '<div class="mini-note">' + esc(src.note) + '</div>' : '')
    + ' <button type="button" class="panel-btn secondary linked-goto" data-goto-cat="' + esc(src.link.cat) + '" data-goto-entry="' + esc(src.link.entry) + '">'
    + 'במדריך ' + esc(tcat ? tcat.label : src.link.cat) + ' ›</button></div>';
}
(function(){
  if (typeof openEntryDetail !== 'function') return;
  const origOpen = openEntryDetail;
  window.openEntryDetail = openEntryDetail = function(entry){
    const l = entry && entry.masechet && entry.link;
    const tcat = l && CATEGORIES.find(c => c.id === l.cat);
    const guide = typeof currentGuideCat !== 'undefined' && currentGuideCat ? currentGuideCat.id : '';
    if (!tcat || !guide || guide === l.cat) return origOpen.apply(this, arguments);
    const show = (data) => {
      const target = findLinkTarget(data, l.entry);
      if (!target) return origOpen.call(this, entry);       // יעד שלא נמצא — התקציר, כמו קודם
      LINKED_FROM.set(target, Object.assign({ __guide: guide }, entry));
      return origOpen.call(this, target);
    };
    if (dataCache[tcat.id] && guideImagesReady(tcat.id)) return show(dataCache[tcat.id]);
    loadGuideData(tcat).then(d => loadGuideImages(tcat).catch(() => null).then(() => show(d)))
      .catch(() => origOpen.call(this, entry));
  };
})();

// לחיצה על ״לערך המלא״ — פותחת את המדריך היעד ואת כרטיס הערך (כמו #173 openSection)
document.addEventListener('click', ev => {
  const b = ev.target && ev.target.closest && ev.target.closest('[data-goto-cat]');
  if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  if (typeof openSection === 'function') openSection(b.dataset.gotoCat, null, b.dataset.gotoEntry);
  else if (typeof openGuide === 'function') openGuide(b.dataset.gotoCat, b.dataset.gotoEntry);
}, true);

// ---- דף גמרא פתוח בקורא: הערכים שמראה המקום שלהם הוא הדף הזה ----
// title לדוגמה: ״ערכין דף יג:״ / ״תלמוד בבלי - ערכין, דף יג.״. ספרי משנה/מפרשים — לא.
function dafMatchesForTitle(title){
  const t = String(title || '').replace(/[֑-ׇ]/g, '');
  if (!t || /^משנה|על /.test(t) || typeof entriesForBavliDaf !== 'function' || typeof BAVLI_MASECHTOT === 'undefined') return [];
  const mas = BAVLI_MASECHTOT.filter(n => t.indexOf(n) !== -1).sort((a, b) => b.length - a.length)[0];
  const m = t.match(/דף\s+([א-ת]{1,3})/) || t.match(/\s([א-ת]{1,3})\s*[.:]\s*$/);
  if (!mas || !m) return [];
  return entriesForBavliDaf(mas, gematriaValue(m[1])).map(x => Object.assign(x, {
    confidence: 'ודאי', score: 1, byDaf: true, evidence: ['מראה מקום בדף הזה'], matchedVia: mas + ' ' + m[1]
  }));
}
