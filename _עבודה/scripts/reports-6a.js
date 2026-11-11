#!/usr/bin/env node
// סבב 6א (11/11/2026) — דיווחי משתמשים #261–#295: הצעות עריכה וטעויות תוכן.
// כל מקור חדש אומת מול ספריית אוצריא (Sivan22/otzaria-library, אוצריא/); מה שלא — מסומן ״לא אומת״.
//   node _עבודה/scripts/reports-6a.js     (חוזר בלי כפילויות)
'use strict';
const fs = require('fs');
const { load, save } = require('./data-io.js');
const log = [];
const strip = s => String(s || '').replace(/[֑-ׇ]/g, '');

// ---------- דומם ----------
const DF = 'guides/domem/data/domem-data.js', d = load(DF);
const D = n => d.data.find(e => e.name === n);
const del = n => { const i = d.data.findIndex(e => e.name === n); if (i >= 0){ d.data.splice(i, 1); log.push('domem: נמחק ' + n); } };
const addMak = (e, m) => { e.makorot = e.makorot || []; if (!e.makorot.some(x => x.ref === m.ref && strip(x.text) === strip(m.text))) e.makorot.push(m); };
let e;
if ((e = D('יתד'))) e.explanation = 'מוט עץ או מתכת מחודד, שבו תוקעים את האוהל באדמה'; // #262
if ((e = D('מצבה'))) e.explanation = e.explanation.replace('כאנדרטת-זיכרון לגיטימית לגמרי (יעקב', 'כדבר מותר (יעקב'); // #264
if ((e = D('שחור'))){ // #266 — נידה יט.
  e.explanation = 'גוון שחור בדם נידה, שמקורו בדם אדום — ״שחור אדום הוא אלא שלקה״.';
  e.makorot = (e.makorot || []).filter(m => m.ref !== 'בבלי, נידה יט.');
  addMak(e, { ref: 'בבלי, נידה יט.', text: 'אמר רבי חנינא שחור אדום הוא אלא שלקה' });
}
if ((e = D('שפופרת של קנה'))){ // #268 — משנה פרה ה, ד
  e.explanation = 'נרתיק קנה חלול לשמירת אבקות רפואיות או כחל; ובמשנה — שפופרת שחתכו אותה לחטאת, לאפר פרה אדומה.';
  e.makorot = (e.makorot || []).filter(m => !/פרה/.test(m.ref));
  addMak(e, { ref: 'משנה, פרה ה, ד', text: 'שפופרת שחתכה לחטאת, רבי אליעזר אומר, יטביל מיד. רבי יהושע אומר, יטמא ויטביל' });
}
if ((e = D('חושן (הבגד)'))){ // #270
  e.explanation = 'כיס-בד כפול (כעין ארנק) שהוצמד לאפוד, ובתוכו הושמו האורים והתומים, ועליו נקבעו שתים עשרה אבני החושן (ראו קטגוריה נפרדת).';
  e.identification = String(e.identification || '').replace(/—\s*משהו הושם \*?לתוך\*? החושן/, '— דהיינו שהונחו בתוך החושן');
}
if ((e = D('גולל'))){ // #269 — הגולל הוא מכסה הקבר, לא מוט של מגילה
  e.explanation = 'אבן או כיסוי הסוגרים את פתח הקבר. הגולל — וכן ״הדופק״ שהגולל נשען עליו — מטמאים במגע ובאוהל.';
  e.identification = 'גולל — מכסה הקבר; דופק — מה שהגולל נשען עליו (משנה אהלות ב, ד).';
  e.cat = 'closures';
  e.makorot = [
    { ref: 'משנה, אהלות ב, ד', text: 'הגולל והדופק מטמאין במגע ובאהל, ואינן מטמאין במשא... איזהו הדופק, את שהגולל נשען עליו' },
    { ref: 'משנה, אהלות טו, ט', text: 'בהמה שעשאה גולל לקבר, הנוגע בה, טמא טמאת שבעה' }];
}
if ((e = D('כילה'))){ // #274 — רש״י שבת קלח.
  e.cat = 'furniture';
  e.explanation = 'יריעה הפרוסה כאוהל מעל המיטה. בדיני שבת — ״כילה שיש בגגה טפח״ דינה כאוהל.';
  e.identification = 'כילה — כיסוי פרוס מעל המיטה; כשיש בגגה טפח היא כאוהל (רש״י שבת קלח.).';
  e.makorot = (e.makorot || []).filter(m => !/שבת קל״ח/.test(m.ref));
  addMak(e, { ref: 'רש"י על שבת קלח.', text: 'כילה - שיש בגגה טפח' });
}
const SAADIA = 'רס״ג, בספר ״שבעים המילים הבודדות״ (ערך ו׳, ״מערכי החיבור״): ״חלמות״ שבאיוב ו, ו — ״ריר הביצים״, על פי חז״ל: ״חלמון מבחוץ וחלבון מבפנים טמאה״ (עבודה זרה מ.). [ציטוט הספר מדיווח משתמש — לא אומת מול הספר; לשון הגמרא אומתה]';
if ((e = D('חלמות')) && !(e.note || '').includes('ריר הביצים')) e.note = (e.note ? e.note + ' ' : '') + SAADIA; // #295 #77
del('גזז');        // #263 — אין כלי כזה: בנזיר נא. ״גזז שערו״ הוא פועל
del('שחור-אדום');  // #265 — ״שחור אדום הוא אלא שלקה״ הוא הגדרת שחור (ר׳ ״שחור״), לא גוון נפרד
del('מקלעת');      // #273 — כפול ל״קלע״
save(DF, d); log.push('domem: ' + d.data.length + ' ערכים');

// ---------- צומח (קובץ עם קבועי JS — עריכה כירורגית) ----------
const FF = 'guides/flora/data/flora-data.js';
let ft = fs.readFileSync(FF, 'utf8');
const rep = (a, b, tag) => { if (ft.includes(b)) return; if (!ft.includes(a)) throw new Error('flora: ' + tag); ft = ft.replace(a, b); log.push('flora: ' + tag); };
rep('— עליו קשים ורעילים.', '— עליו חדים ורעילים.', 'הרדופני #261');
// עריכה בתוך גבולות הערך בלבד (מ-name:"X" עד הערך הבא)
const block = (name, fn, tag) => {
  const i = ft.search(new RegExp('name:"' + name + '"')); if (i < 0) throw new Error('flora: ' + tag);
  const j = ft.indexOf('{name:', i + 5), end = j < 0 ? ft.length : j;
  const nb = fn(ft.slice(i, end)); if (nb === null) return;
  ft = ft.slice(0, i) + nb + ft.slice(end); log.push('flora: ' + tag);
};
block('צנון', t => t.includes('פוגלא') ? null : t.replace('midrash:[], academic:[], expanded:false, aliases:[]}', 'midrash:[{source:"רש\\"י על שבת קח:", note:"פוגלא - צנון", link:""}], academic:[], expanded:false, aliases:["פוגלא"]}'), 'צנון #288');
block('חלמות', t => t.includes('ריר הביצים') ? null : t.replace(/(link:""\})(\s*\],\s*academic)/, '$1,\n       {source:"רס\\"ג, שבעים המילים הבודדות (לא אומת)", note:' + JSON.stringify(SAADIA) + ', link:""}$2'), 'חלמות #294 #77');
fs.writeFileSync(FF, ft);

// ---------- אישים ----------
const PF = 'guides/people/data/people-data.js', p = load(PF);
const P = n => p.data.find(x => x.name === n);
const pdel = (n, why) => { const i = p.data.findIndex(x => x.name === n); if (i >= 0){ p.data.splice(i, 1); log.push('people: נמחק ' + n + ' — ' + why); } };
if ((e = P('ימימה'))) e.verses = [{ ref: 'איוב מב, יד', text: 'וַיִּקְרָא שֵׁם־הָאַחַת יְמִימָה וְשֵׁם הַשֵּׁנִית קְצִיעָה וְשֵׁם הַשְּׁלִישִׁית קֶרֶן הַפּוּךְ' }]; // #280 #284 — ״מימים ימימה״ אינו שם
if ((e = P('שמע'))){ // #292 — ״ועתה בני שמע בקולי״ הוא פועל
  e.aliases = (e.aliases || []).filter(a => a !== 'משמע');
  e.verses = [{ ref: 'דברי הימים א ה, ח', text: 'וּבֶלַע בֶּן־עָזָז בֶּן־שֶׁמַע בֶּן־יוֹאֵל הוּא יוֹשֵׁב בַּעֲרֹעֵר וְעַד־נְבוֹ וּבַעַל מְעוֹן' }];
}
pdel('רחמה', '#281–#283, #285: ״רחמה״ הוא ״רַחְמָהּ״, אינו שם אדם');
pdel('בני', '#275: כל מראי המקום היו ״בני״ במובן ״בניי״; התפקיד ״הנביא״ והתקופה שגויים');
// relIds שהצביעו על הערכים שנמחקו — מנותקים (null במקום יחיד, הסרה ממערך)
const GONE = new Set(['p0937', 'p0557']); let fixedRel = 0;
p.data.forEach(x => { const r = x.relIds; if (!r) return;
  Object.keys(r).forEach(k => {
    if (Array.isArray(r[k])){ const n = r[k].map(v => GONE.has(v) ? null : v); if (n.some((v, i) => v !== r[k][i])){ r[k] = n; fixedRel++; } }
    else if (GONE.has(r[k])){ r[k] = null; fixedRel++; }
  });
});
if (fixedRel) log.push('people: נותקו ' + fixedRel + ' קישורי relIds לערכים שנמחקו');
save(PF, p); log.push('people: ' + p.data.length + ' ערכים');

// ---------- מקומות: באר שבע (#293) ----------
const LF = 'guides/places/data/places.js';
let lt = fs.readFileSync(LF, 'utf8');
const lp = load(LF), bs = lp.data.find(x => x.name === 'באר שבע');
const old = JSON.stringify(bs);
if (!(bs.midrash || []).some(m => /רשב"ם/.test(m.ref || ''))){
  bs.midrash = (bs.midrash || []).concat([{ ref: 'רשב"ם על בראשית כו, לג', text: 'על כן שם העיר באר שבע - ואין זו אותו באר שבע של אברהם, כי שני באר שבע היו, כדכתיב: ויבא באר שבע אשר ליהודה.' }]);
  if (lt.split(old).length !== 2) throw new Error('places: באר שבע not unique');
  lt = lt.replace(old, JSON.stringify(bs)); fs.writeFileSync(LF, lt); log.push('places: באר שבע + רשב״ם');
}

// ---------- ארכיאולוגיה: אבן מגדלא (#287 — התמונה מראה את הצד שאין בו מנורה) ----------
const AF = 'guides/archaeology/data/archaeology-data.js';
let at = fs.readFileSync(AF, 'utf8');
const OLD_IMG = '"img": "אבן מגדלא",\n  "gallery": [\n   "אבן מגדלא"\n  ],\n  "credit": "Hanay, ויקישיתוף · CC BY-SA 3.0"';
if (at.includes(OLD_IMG)){
  at = at.replace(OLD_IMG, '"img": null,\n  "gallery": [],\n  "credit": ""');
  fs.writeFileSync(AF, at); log.push('archaeology: הוסרה התמונה של אבן מגדלא');
}
console.log(log.join('\n'));
