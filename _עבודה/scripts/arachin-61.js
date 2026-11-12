#!/usr/bin/env node
// 6.1.0 — מסכת ערכין, סריקה מלאה: כל פריט שבבבלי ערכין שיש לו מקום באחד המדריכים (מקומות, בעלי חיים,
// צומח, דומם, אישים) — מקור מערכין נוסף לערך במדריך שלו, וערך קישור (daf + הקשר) נכנס למדריך ערכין.
// פריט שאין לו ערך — ערך חדש (אלכסנדריא של מצרים, חרוב). המועמדים נמצאו ב-arachin-scan-61.js
// ונבחרו ידנית (בלי מילים נפוצות ושמות של אמוראים). כל ציטוט נחתך אוטומטית מהטקסט שבספריית אוצריא:
//   node _עבודה/scripts/arachin-61.js "<ספריית אוצריא>/אוצריא"      (חוזר בלי כפילויות)
'use strict';
const fs = require('fs'), path = require('path');
const { load, save } = require('./data-io.js');
const LIB = process.argv[2];
if (!LIB) { console.error('usage: arachin-61.js <otzaria-library/אוצריא>'); process.exit(1); }
const strip = s => String(s || '').replace(/[֑-ׇ]/g, '').replace(/<[^>]*>/g, ' ').replace(/[׳״]/g, '').replace(/[^א-ת"' ]/g, ' ').replace(/\s+/g, ' ').trim();
// ---- הבבלי לפי דפים ----
const bavli = {}; let daf = '';
fs.readFileSync(path.join(LIB, 'תלמוד בבלי/סדר קדשים/ערכין.txt'), 'utf8').split('\n').forEach(l => {
  const m = l.match(/<h2>דף ([^<]+)<\/h2>/); if (m) { daf = m[1].trim(); return; }
  (bavli[daf] = bavli[daf] || []).push(strip(l));
});
function quote(d, needle, before = 5, after = 9) {
  const line = (bavli[d] || []).find(t => t.includes(needle));
  if (!line) throw new Error('לא נמצא בדף ' + d + ': ' + needle);
  const w = line.split(' '), nw = needle.split(' ');
  const i = w.findIndex((x, k) => nw.every((y, j) => (w[k + j] || '').endsWith(j === 0 ? y : y) && (j === 0 || w[k + j] === y)));
  return w.slice(Math.max(0, i - before), i + nw.length + after).join(' ');
}
function verseLine(file, chapterHeb, num) {
  const L = fs.readFileSync(path.join(LIB, file), 'utf8').split('\n');
  let inCh = false;
  for (const l of L) {
    const h = l.match(/<h2>פרק ([^<]+)<\/h2>/); if (h) { inCh = h[1].trim() === chapterHeb; continue; }
    if (inCh) { const t = strip(l); if (t.startsWith(num + ' ') || t.startsWith('(' + num + ')')) return t.replace(/^\(?[א-ת]+\)?\s*/, ''); }
  }
  throw new Error('לא נמצא: ' + file + ' ' + chapterHeb + ' ' + num);
}
const log = [];
// ---- הוספת מקור לערך במדריך — הכנסה טקסטואלית, כדי לא לשנות את סגנון הקובץ (JSON או JS) ----
function addSource(file, name, src, field) {
  let t = fs.readFileSync(file, 'utf8');
  const keys = ['"name":' + JSON.stringify(name), 'name:' + JSON.stringify(name), '"name": ' + JSON.stringify(name)];
  let at = -1; for (const k of keys) { at = t.indexOf(k + ','); if (at !== -1) break; }
  if (at === -1) throw new Error(file + ': אין ערך ' + name);
  const next = (() => { let n = Infinity; for (const k of ['"name":', 'name:"', '"name": ']) { const x = t.indexOf(k, at + 8); if (x !== -1 && x < n) n = x; } return n; })();
  const seg = t.slice(at, next === Infinity ? undefined : next);
  if (seg.includes(src.ref || src.source)) return false;   // כבר יש מקור מאותו דף
  const fk = seg.search(new RegExp('"?' + field + '"?\\s*:\\s*\\['));
  if (fk === -1) throw new Error(file + ': אין שדה ' + field + ' ב-' + name);
  const br = t.indexOf('[', at + fk) + 1;
  const empty = /^\s*\]/.test(t.slice(br));
  t = t.slice(0, br) + JSON.stringify(src) + (empty ? '' : ',') + t.slice(br);
  fs.writeFileSync(file, t); return true;
}
const F = { places: 'guides/places/data/places.js', animal: 'guides/animal/data/animal-data.js', flora: 'guides/flora/data/flora-data.js',
  domem: 'guides/domem/data/domem-data.js', people: 'guides/people/data/people-data.js' };
const FIELD = { places: 'midrash', animal: 'midrash', flora: 'midrash', domem: 'makorot', people: 'midrash' };
const srcObj = (g, d, q) => g === 'flora' ? { source: 'בבלי, ערכין ' + d, note: q } : { ref: 'בבלי, ערכין ' + d, text: q };

// ---- ערכים חדשים ----
function insertNew(file, marker, text) {
  let t = fs.readFileSync(file, 'utf8'); if (t.includes(marker)) return false;
  const i = t.indexOf('const DATA = [') + 'const DATA = ['.length;
  t = t.slice(0, i) + '\n' + text + t.slice(i); fs.writeFileSync(file, t); return true;
}
const qAlex = quote('י:', 'מאלכסנדריא של מצרים', 8, 3);
if (insertNew(F.places, '"name":"אלכסנדריא של מצרים"', JSON.stringify({ name: 'אלכסנדריא של מצרים', cat: 'cities', aliases: ['אלכסנדריא', 'אלכסנדריה'],
  methods: [{ label: 'על המקום', explanation: 'עיר נמל גדולה במצרים, שממנה הביאו חכמים אומנים לתקן את הצלצול שבמקדש ואת המכתשת של פטום הקטורת — ולא הצליחו (בבלי ערכין י ע״ב).',
    modern: 'אלכסנדריה שבמצרים — זיהוי מקובל, לא אומת במקורות הספרייה.', confidence: 'ודאי', mapQuery: 'Alexandria, Egypt', geo: [31.2001, 29.9187, 11] }],
  verses: [], midrash: [{ ref: 'בבלי, ערכין י:', text: qAlex }], academic: [] }) + ',')) log.push('places: +אלכסנדריא של מצרים');
const qCh = quote('יד.', 'חרוב המורכב', 9, 3);
if (insertNew(F.flora, 'name:"חרוב"', '  {name:"חרוב", cat:"fruit-trees", methods:[{label:"עץ החרוב", latin:"חרוב (Ceratonia siliqua)", confidence:"סביר", wiki:"חרוב מצוי",\n'
  + '    explanation:"עץ פרי שבחז״ל. במסכת ערכין: המקדיש את השדה לא הקדיש ״חרוב המורכב וסדן השקמה״ (משנה ובבלי ערכין יד ע״א). הזיהוי עם החרוב המצוי — מקובל, לא אומת במקורות הספרייה."}],\n'
  + '    verses:[], midrash:[' + JSON.stringify({ source: 'בבלי, ערכין יד.', note: qCh }) + '], academic:[], expanded:false, aliases:["חרובין"]},\n')) log.push('flora: +חרוב');

// ---- הפריטים: [מדריך, ערך, דף, הקשר, מילת חיפוש בדף] ----
const ITEMS = [
  ['places','מרה','טו.','makom','במרה וברפידים'], ['places','רפידים','טו.','makom','ויחנו ברפידים'], ['places','מדבר פארן','טו.','makom','ואחת במדבר פארן'],
  ['places','ים סוף','טו.','makom','בים סוף'], ['places','נחל קישון','טו.','makom','נחל קישון'], ['places','קדש ברנע','יג.','makom','מקדש ברנע'],
  ['places','נהר הירדן','יג.','makom','כי עבור ירדן'], ['places','גליל','לב.','makom','גמלא בגליל'], ['places','ארגוב','לב:','makom','חבל ארגוב'],
  ['places','בית אל','לג.','makom','בבית אל'], ['places','ים המלח','ה:','makom','לים המלח'], ['places','יבנה','ד.','makom','ביבנה'],
  ['places','נהרדעא','ו.','makom','מנהרדעא'], ['places','פומבדיתא','כט.','makom','בפומבדיתא'], ['places','אושא','כח.','makom','באושא התקינו'],
  ['places','נינוה','יב.','makom','כיבש נינוה'], ['places','אלכסנדריא של מצרים','י:','makom','מאלכסנדריא של מצרים'],
  ['animal','שליו','טו.','chai','שנים בשליו'], ['animal','נחש','טו:','chai','ובאות אצל נחש'], ['animal','אריה','טו:','chai','ארי דורס'],
  ['animal','זאב','טו:','chai','זאב טורף'], ['animal','לטאה','ז.','chai','אזנב הלטאה'], ['animal','חמור','יט.','chai','מבשר חמור'],
  ['animal','כבש (שה כבשים)','יא:','chai','כבש הבא עם העומר'],
  ['flora','גפן','יא.','chai','ותאמר להם הגפן'], ['flora','שקמה','יד.','chai','וסדן השקמה'], ['flora','חרוב','יד.','chai','חרוב המורכב'],
  ['domem','שופר','ב:','kelim','בתקיעת שופר'], ['domem','תוף','יא.','kelim','ותנו תוף'], ['domem','מנורה','ו:','kelim','שהתנדב מנורה'],
  ['domem','חושן (הבגד)','טז.','kelim','חושן מכפר'], ['domem','אפוד','טז.','kelim','אפוד מכפר'], ['domem','מעיל','טז.','kelim','מעיל מכפר'],
  ['domem','ציץ','טז.','kelim','ציץ מכפר'], ['domem','כתונת','טז.','kelim','כתונת מכפרת'], ['domem','מצנפת','טז.','kelim','מצנפת מכפרת'],
  ['domem','אבנט','טז.','kelim','אבנט מכפרת'], ['domem','חנית','טז:','kelim','את החנית'], ['domem','סיר','טו:','kelim','על סיר הבשר'],
  ['domem','קלפי','יב:','kelim','ונתנום בקלפי'], ['domem','חבית','יט.','kelim','ממלא חבית'], ['domem','סכין','ז.','kelim','מביאין סכין'],
  ['domem','מחט','יד:','kelim','מעשה מחט'], ['domem','לתך','כה.','kelim','לתך וחצי לתך'], ['domem','תרקב','כה.','kelim','ותרקב וחצי תרקב'],
  ['domem','סאה','כה.','kelim','סאה ותרקב'], ['domem','איסר','כז.','kelim','באיסר'], ['domem','פרוטה','כז.','kelim','שוה פרוטה'],
  ['people','כלב בן יפנה','יג.','ishim','דקאמר כלב'], ['people','יהושע בן נון','לב:','ishim','אלא יהושע'], ['people','נבוכדנצר','יב.','ishim','לנבוכדנצר'],
  ['people','יהויקים','יב.','ishim','לכיבוש יהויקים'], ['people','צדקיהו','יז.','ishim','בצדקיהו'], ['people','סנחריב','יב:','ishim','דאגלינהו סנחריב'],
  ['people','יאשיהו','לג.','ishim','של יאשיהו'], ['people','ירמיהו','לג.','ishim','כשהחזירן ירמיהו'], ['people','חזקיהו','יא:','ishim','ויאמר חזקיהו'],
  ['people','שאול','טז:','ishim','ויחר אף שאול'], ['people','יהונתן בן שאול','טז:','ishim','ביהונתן'], ['people','אהליאב','טז:','ishim','את אהליאב'],
  ['people','חירם','טז:','ishim','את חירם'],
];
const AF = 'guides/arachin/data/arachin-data.js';
const NEW_CATS = [
  { id: 'makom', num: 'ה', label: 'מקומות במסכת', blurb: 'מרה ורפידים, ים סוף, קדש ברנע, בית אל ויבנה — המקומות שבסוגיות, על המפה.' },
  { id: 'chai', num: 'ו', label: 'בעלי חיים וצומח', blurb: 'השליו, הנחש שבאגדת לשון הרע, הגפן, השקמה והחרוב.' },
  { id: 'kelim', num: 'ז', label: 'כלים, בגדי כהונה ומידות', blurb: 'בגדי כהונה מכפרין, השופר והתוף, הקלפי, לתך ותרקב, איסר ופרוטה.' },
  { id: 'ishim', num: 'ח', label: 'אישים במסכת', blurb: 'כלב ויהושע, יהויקים וצדקיהו, נבוכדנצר וסנחריב, יאשיהו וירמיהו.' },
];
{ let t = fs.readFileSync(AF, 'utf8');
  if (!t.includes('"id": "makom"')) {
    const i = t.indexOf('\n];\nconst DATA');
    t = t.slice(0, i) + ',\n' + NEW_CATS.map(c => JSON.stringify(c, null, 1).replace(/\n/g, '\n ').replace(/^/, ' ')).join(',\n') + t.slice(i);
    fs.writeFileSync(AF, t); log.push('arachin: +4 הקשרים');
  } }
const a = load(AF);
const byName = n => a.data.find(e => e.name === n);
let nLinks = 0, nSrc = 0;
const sorted = ITEMS.map(x => x);
sorted.forEach(([g, name, d, ctx, needle]) => {
  const q = quote(d, needle);
  if (addSource(F[g], name, srcObj(g, d, q), FIELD[g])) nSrc++;
  if (!a.data.some(e => e.link && e.link.cat === g && e.link.entry === name && e.daf === d)) {
    a.data.push({ masechet: 'ערכין', aliases: [], note: '', makorot: [{ ref: 'בבלי, ערכין ' + d, text: q }], name, cat: ctx, daf: d,
      explanation: '״' + q + '״ (ערכין ' + d + '). הערך המלא — במדריך שלו.', link: { cat: g, entry: name } });
    nLinks++;
  }
});
// ---- ״שנים עשר לויים על הדוכן״: המקום שעמדו בו הלויים, בבית ראשון ובבית שני (תוסף ״בית המקדש״) ----
{ const e = byName('שנים עשר לויים על הדוכן');
  e.templeRefs = ['דברי הימים ב ה, יב', 'משנה מדות ב, ו'];
  const v = verseLine('תנך/כתובים/דברי הימים ב.txt', 'ה', 'יב');
  const md = (() => { const t = strip(fs.readFileSync(path.join(LIB, 'משנה/סדר קדשים/משנה מדות.txt'), 'utf8').split('\n').find(l => strip(l).includes('והדוכן נתון עליה'))); const i = t.indexOf('רבי אליעזר בן יעקב'); return t.slice(i, t.indexOf('אמה', t.indexOf('חצי חצי', i)) + 3); })();
  const add = (ref, text) => { if (!e.makorot.some(m => m.ref === ref)) e.makorot.push({ ref, text }); };
  add('דברי הימים ב ה, יב', v.split(' ').slice(0, 17).join(' '));
  add('משנה, מדות ב, ו', md);
}
// מיון: לפי דף, ובתוך הדף לפי סדר ההקשרים
a.data.sort((x, y) => (dafOrd(x.daf) - dafOrd(y.daf)));
function dafOrd(d) { const m = String(d || '').match(/^([א-ת]+)([.:])?/); if (!m) return 9999; const v = { א:1,ב:2,ג:3,ד:4,ה:5,ו:6,ז:7,ח:8,ט:9,י:10,כ:20,ל:30,מ:40 }; let n = 0; for (const c of m[1]) n += v[c] || 0; return n * 2 + (m[2] === ':' ? 1 : 0); }
save(AF, a);
log.push('arachin: +' + nLinks + ' קישורים (סה״כ ' + a.data.length + '); מקורות שנוספו במדריכים: ' + nSrc);
console.log(log.join('\n'));
