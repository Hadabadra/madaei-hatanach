#!/usr/bin/env node
// #76 — שיוך ערים וכפרים במדריך מקומות לשבט, לפי פסוקי הנחלות ביהושע יג–יט וערי הלויים ביהושע כא.
// אין ניחוש: מקום מקבל שבט רק אם שמו מופיע בפסוק שבתחום נחלה מפורש. מקום שמופיע אצל שני
// שבטים מקבל את שניהם (tribes: [..]), עם כל המקורות, ונרשם ב-tribes-conflicts.md להכרעה
// ע״פ מפרש (רד״ק / מצודות) — שאותם הסקריפט מצטט רק אם המפרש עצמו מזכיר את המקום ושבט.
// שימוש:  node _עבודה/scripts/tribes-v5.js [--dry]
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const { load, FILES } = require('./missing-images.js');
const CACHE = path.join(ROOT, '_עבודה/assets/joshua-cache'); fs.mkdirSync(CACHE, { recursive: true });
const DRY = process.argv.includes('--dry');
const HEB = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'יא', 'יב', 'יג', 'יד', 'טו', 'טז', 'יז', 'יח', 'יט', 'כ', 'כא', 'כב', 'כג', 'כד', 'כה', 'כו', 'כז', 'כח', 'כט', 'ל', 'לא', 'לב', 'לג', 'לד', 'לה', 'לו', 'לז', 'לח', 'לט', 'מ', 'מא', 'מב', 'מג', 'מד', 'מה', 'מו', 'מז', 'מח', 'מט', 'נ', 'נא', 'נב', 'נג', 'נד', 'נה', 'נו', 'נז', 'נח', 'נט', 'ס', 'סא', 'סב', 'סג'];
// [פרק, מפסוק, עד פסוק, שבט] — התחומים כפי שהפסוקים עצמם פותחים וחותמים אותם.
const RANGES = [
  [13, 15, 23, 'ראובן'], [13, 24, 28, 'גד'], [13, 29, 31, 'מנשה'],
  [15, 1, 63, 'יהודה'], [16, 5, 10, 'אפרים'], [17, 1, 13, 'מנשה'], [18, 11, 28, 'בנימין'],
  [19, 1, 9, 'שמעון'], [19, 10, 16, 'זבולון'], [19, 17, 23, 'יששכר'], [19, 24, 31, 'אשר'],
  [19, 32, 39, 'נפתלי'], [19, 40, 48, 'דן'],
  // ערי הלויים — רק מקטעים שבהם הפסוק נוקב בשבט אחד (כא ט–טז ״ממטה יהודה ומטה שמעון״ — מדולג)
  [21, 17, 18, 'בנימין'], [21, 20, 22, 'אפרים'], [21, 23, 24, 'דן'], [21, 25, 25, 'מנשה'], [21, 27, 27, 'מנשה'],
  [21, 28, 29, 'יששכר'], [21, 30, 31, 'אשר'], [21, 32, 32, 'נפתלי'], [21, 34, 35, 'זבולון'],
  [21, 36, 37, 'ראובן'], [21, 38, 39, 'גד'],
];
const clean = (s) => String(s).replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').replace(/[֑-ׇ]/g, '').replace(/[־׀]/g, ' ').replace(/[^א-ת ]/g, ' ').replace(/\s+/g, ' ');
async function chapter(n, book = 'Joshua') {
  const f = path.join(CACHE, `${book}-${n}.json`);
  if (!fs.existsSync(f)) {
    const r = await fetch(`https://www.sefaria.org/api/v3/texts/${encodeURIComponent(book)}.${n}?version=hebrew`);
    if (!r.ok) throw new Error(book + ' ' + n + ': ' + r.status);
    fs.writeFileSync(f, JSON.stringify((await r.json()).versions[0].text));
  }
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}
const PRE = '(?:^|\\s)(?:[ובלמהכש]{0,3})';
const mkRe = (name) => new RegExp(PRE + clean(name).trim().replace(/ /g, '\\s') + 'ה?(?=\\s|$)');

(async () => {
  const verses = [];
  for (const ch of [13, 15, 16, 17, 18, 19, 21]) {
    const t = await chapter(ch);
    t.forEach((v, i) => { const r = RANGES.find(([c, a, b]) => c === ch && i + 1 >= a && i + 1 <= b); if (r) verses.push({ ch, v: i + 1, tribe: r[3], text: ' ' + clean(v) + ' ' }); });
  }
  const c = load('places');
  const res = {};
  for (const e of c.D) {
    if (!['cities', 'villages'].includes(e.cat)) continue;
    const names = [e.name, ...(e.aliases || [])].filter((n) => clean(n).replace(/ /g, '').length >= 3);
    const hits = {};
    for (const n of names) { const re = mkRe(n); for (const v of verses) if (re.test(v.text)) (hits[v.tribe] = hits[v.tribe] || new Set()).add(`יהושע ${HEB[v.ch]} ${HEB[v.v]}`); }
    if (Object.keys(hits).length) res[e.name] = hits;
  }
  // מפרשים לשיוך כפול — מצטטים רק משפט שמזכיר גם את המקום וגם שבט
  const conflicts = Object.entries(res).filter(([, h]) => Object.keys(h).length > 1);
  const TRIBES = ['ראובן', 'גד', 'מנשה', 'יהודה', 'אפרים', 'בנימין', 'שמעון', 'זבולון', 'יששכר', 'אשר', 'נפתלי', 'דן'];
  const rep = ['# #76 — מקומות המשויכים ליותר משבט אחד', '', 'לא שויכו לשבט בסינון (לרוב שני מקומות שונים באותו שם). בכרטיס מוצגים המקורות, בלי הכרעה. ציטוט מפרש — רק כשנמצא משפט שמזכיר את המקום ושבט.', ''];
  const quotes = {};
  for (const [name, h] of conflicts) {
    rep.push(`* **${name}** — ` + Object.entries(h).map(([t, s]) => `${t} (${[...s].join('; ')})`).join(' · '));
    for (const [book, label] of [['Radak on Joshua', 'רד״ק'], ['Metzudat David on Joshua', 'מצודת דוד']]) {
      for (const ref of new Set(Object.values(h).flatMap((s) => [...s]))) {
        const [, chH, vH] = ref.split(' '); const ch = HEB.indexOf(chH), v = HEB.indexOf(vH);
        let t; try { t = await chapter(ch, book); } catch (_) { continue; }
        const comm = [].concat(t[v - 1] || []).map(clean);
        for (const s of comm) {
          const re = mkRe(name);
          if (re.test(' ' + s + ' ') && TRIBES.some((tr) => s.includes(tr))) {
            const words = s.trim().split(' '); const q = words.slice(0, 30).join(' ') + (words.length > 30 ? '…' : '');
            quotes[name] = `${label} על ${ref}: ״${q}״`; rep.push(`  * ${quotes[name]}`); break;
          }
        }
        if (quotes[name]) break;
      }
      if (quotes[name]) break;
    }
  }
  fs.writeFileSync(path.join(ROOT, '_עבודה/assets/tribes-conflicts.md'), rep.join('\n') + '\n');
  // הטבעה: "tribes":[..] ו-"tribeRefs":".." מיד אחרי "cat"
  const file = path.join(ROOT, FILES.places); let text = fs.readFileSync(file, 'utf8'); let ok = 0; const fail = [];
  for (const [name, h] of Object.entries(res)) {
    const anchor = `{"name":${JSON.stringify(name)},`;
    if (text.split(anchor).length !== 2) { fail.push(name); continue; }
    const multi = Object.keys(h).length > 1;
    // שיוך כפול = לרוב שני מקומות שונים באותו שם (מצודת דוד על יט כב), ולכן לא מכריעים:
    // אין "tribes" (לא נכלל בסינון), ו-tribeRefs מציג את המקורות ואת דברי המפרש אם נמצאו.
    const refs = (multi ? 'השיוך לא הוכרע — נזכר בנחלות כמה שבטים: ' : '') + Object.entries(h).map(([t, s]) => `${t}: ${[...s].join('; ')}`).join(' · ') + (quotes[name] ? ` — ${quotes[name]}` : '');
    text = text.replace(anchor, anchor + (multi ? '' : `"tribes":${JSON.stringify(Object.keys(h))},`) + `"tribeRefs":${JSON.stringify(refs)},`);
    ok++;
  }
  if (!DRY) fs.writeFileSync(file, text);
  const per = {}; Object.values(res).filter((h) => Object.keys(h).length === 1).forEach((h) => Object.keys(h).forEach((t) => (per[t] = (per[t] || 0) + 1)));
  console.log(`שויכו ${ok} מקומות (${conflicts.length} ליותר משבט, ${Object.keys(quotes).length} עם ציטוט מפרש)${fail.length ? ', עוגן נכשל: ' + fail.join(',') : ''}`);
  console.log(JSON.stringify(per));
})().catch((e) => { console.error('שגיאה:', e.message); process.exit(1); });
