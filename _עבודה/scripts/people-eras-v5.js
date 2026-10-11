#!/usr/bin/env node
// #74 — תקופה מפורטת לכל איש במדריך אישים (כמו לוח התקופות ב״ביוגרפיות״).
// כלל אחד, בלי ניחוש: לכל מראה מקום של האיש נקבעת התקופה של הפרק שבו הוא נזכר (טבלה קבועה
// למטה), ונבחרת התקופה המוקדמת ביותר — כלומר זמן הופעתו הראשונה בסדר המאורעות.
// מראי מקום שאין להם תקופה חד-משמעית (דברי הימים, איוב, תהלים) אינם קובעים. איש שכל מקורותיו
// כאלה — לא מקבל era, ונשאר בתקופה הכללית של הספר (כמו היום).
// שימוש:  node _עבודה/scripts/people-eras-v5.js [--dry]
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const FILE = path.join(ROOT, 'guides/people/data/people-data.js');
const DRY = process.argv.includes('--dry');
const ERAS = ['עשרה דורות מאדם עד נח', 'עשרה דורות מנח עד אברהם', 'אבותינו ואמותינו', 'שבטי ישראל', 'גלות מצרים',
  'יציאת מצרים ודור המדבר', 'כניסה לארץ וכיבוש', 'תקופת השופטים', 'תקופת שמואל, שאול ודוד', 'תקופת המלכים ובית ראשון',
  'חורבן בית ראשון', 'גלות בבל ובית שני'];
const G = (s) => { const v = { א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9, י: 10, כ: 20, ל: 30, מ: 40, נ: 50, ס: 60, ע: 70, פ: 80, צ: 90, ק: 100 }; return [...s.replace(/[״"׳']/g, '')].reduce((a, c) => a + (v[c] || 0), 0); };
// ספר → פונקציה מפרק לאינדקס תקופה (null = לא קובע)
const BOOK = {
  'בראשית': (c) => (c <= 5 ? 0 : c <= 11 ? 1 : c <= 36 ? 2 : 3),
  'שמות': (c) => (c <= 12 ? 4 : 5), 'ויקרא': () => 5, 'במדבר': () => 5, 'דברים': () => 5,
  'יהושע': () => 6, 'שופטים': () => 7, 'רות': () => 7,
  'שמואל א': () => 8, 'שמואל ב': () => 8, 'מלכים א': (c) => (c <= 2 ? 8 : 9), 'מלכים ב': (c) => (c <= 23 ? 9 : 10),
  'ישעיהו': () => 9, 'הושע': () => 9, 'עמוס': () => 9, 'מיכה': () => 9, 'יונה': () => 9, 'יואל': () => 9, 'נחום': () => 9,
  'צפניה': () => 9, 'חבקוק': () => 9, 'משלי': () => 9, 'קהלת': () => 9,
  'ירמיהו': () => 10, 'יחזקאל': () => 10, 'איכה': () => 10,
  'עזרא': () => 11, 'נחמיה': () => 11, 'אסתר': () => 11, 'דניאל': () => 11, 'חגי': () => 11, 'זכריה': () => 11, 'מלאכי': () => 11,
};
let text = fs.readFileSync(FILE, 'utf8');
const ctx = {}; vm.createContext(ctx); vm.runInContext(text + ';this.D=DATA', ctx);
const count = {}; let set = 0, none = 0; const fail = [];
for (const e of ctx.D) {
  let best = null;
  for (const v of e.verses || []) {
    const m = String(v.ref).match(/^(.*?) ([א-ת"״׳]+),/); if (!m || !BOOK[m[1]]) continue;
    const i = BOOK[m[1]](G(m[2])); if (i !== null && (best === null || i < best)) best = i;
  }
  if (best === null) { none++; continue; }
  const anchor = `{"id":${JSON.stringify(e.id)},`;
  if (text.split(anchor).length !== 2) { fail.push(e.id); continue; }
  text = text.replace(anchor, anchor + `"era":${JSON.stringify(ERAS[best])},`);
  count[ERAS[best]] = (count[ERAS[best]] || 0) + 1; set++;
}
if (!DRY) fs.writeFileSync(FILE, text);
console.log(`תקופה נקבעה ל-${set}, בלי (נשאר לפי הספר): ${none}${fail.length ? ', עוגן נכשל: ' + fail.length : ''}`);
console.log(ERAS.map((x) => `${x}: ${count[x] || 0}`).join(' · '));
