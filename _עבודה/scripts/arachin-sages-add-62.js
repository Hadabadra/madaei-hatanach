#!/usr/bin/env node
// 6.2.0 (השלמה) — חכמי מסכת ערכין שאין להם ערך במדריך ״אנשים מהתלמוד״ (amoraim): מוסיף להם ערך,
// רק ממקורות ספריית אוצריא — ״סדר הדורות״ (חלק ״סדר תנאים ואמוראים״) לתיאור, ובבלי ערכין למראי המקום.
// איך: סורק את בבלי ערכין (arachin-sages-scan-62.js) עם כותרות הערכים של סדר הדורות כצורות נוספות (EXTRA_FORMS),
// לוקח רק התאמות לחכמים (רשימת PERSON_SKIP למטה מסננת מושגים/מקומות ושמות שזוהו לא נכון), ובונה ערך לכל אחד.
// אחריו מריצים שוב את arachin-sages-62.js, שמקשר את החכמים החדשים בהקשר ״חכמי המסכת״.
//   node _עבודה/scripts/arachin-sages-add-62.js "<…/אוצריא/ספרות עזר/תולדות עם ישראל/סדר הדורות.txt>" "<…/אוצריא/תלמוד בבלי/סדר קדשים/ערכין.txt>"
// ריצה חוזרת — מחליפה את הערכים שהסקריפט הוסיף (מסומנים ב-src: 'arachin-62'), בלי כפילויות.
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { execFileSync } = require('child_process');
const { load, save } = require('./data-io.js');
const [SD, ARACHIN] = process.argv.slice(2);
if (!SD || !ARACHIN) { console.error('usage: arachin-sages-add-62.js <סדר הדורות.txt> <ערכין.txt>'); process.exit(1); }

// ---- כותרות הערכים בחלק ״סדר תנאים ואמוראים״ ----
const lines = fs.readFileSync(SD, 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('<h2>סדר תנאים ואמוראים</h2>'));
const sdEntries = new Map();   // כותרת → טקסט הערך (עד ה-<h3> הבא)
for (let i = start + 1; i < lines.length; i++) {
  const m = lines[i].match(/^<b>([^<]+)<\/b>/); if (!m) continue;
  const head = m[1].trim().replace(/[.,:]+$/, ''); if (sdEntries.has(head)) continue;
  const body = []; for (let j = i; j < lines.length && !/^<h[1-3]>/.test(lines[j]); j++) body.push(lines[j]);
  sdEntries.set(head, body.join(' '));
}
const formOf = s => s.replace(/\(.*?\)/g, ' ').replace(/׳/g, "'").replace(/^'?ר' /, 'רבי ').replace(/ בר' /g, ' ברבי ')
  .replace(/[^א-ת" ]/g, ' ').replace(/\s+/g, ' ').trim();
const extra = {}, amb = new Set();
for (const h of sdEntries.keys()) { const f = formOf(h); if (f.split(' ').length < 2) continue;
  if (extra[f] && extra[f] !== 'SD:' + h) amb.add(f); else extra[f] = 'SD:' + h; }
amb.forEach(f => delete extra[f]);
// צורה שבערכין שונה מכותרת סדר הדורות (״רבי חייא בר אבין״ — בסדר הדורות ״רב חייא בר אבין״)
const MAP = { 'בר אבין': 'רב חייא בר אבין' };
// לא חכמים, או זיהוי שגוי של הצורה הקצרה — לא נכנסים
const PERSON_SKIP = new Set(['אהל מועד', 'בית אל', 'בעל הלשון', 'דברי הימים', 'לב אהרן', 'לחם הפנים', 'מנחת כהן', 'מרפא לשון',
  'עיני הכהן', 'צורבא מרבנן', 'קדש קדשים', 'שלחו מתם',
  'רבי לא',               // ״בית רבי לא הוו״ — לא שם
  'בן בתירא',             // = רבי יהודה בן בתירא; במדריך שני ערכים בשם זה — לא מקושר (ROADMAP)
  "ר' עוקבא",             // בערכין ״רב חסדא אמר מר עוקבא״; ערך סדר הדורות הוא חכם אחר (ר׳ עוקבא א״ר פרנך)
  "ר' אליעזר הגדול"]);    // כבר במדריך (רבי אליעזר בן הורקנוס) — לא ערך כפול
const AF = 'guides/amoraim/data/amoraim-data.js', a = load(AF);
a.data = a.data.filter(e => e.src !== 'arachin-62'); save(AF, a);   // ריצה חוזרת: הסריקה רואה את המדריך בלי ערכי הריצה הקודמת
const tmp = path.join(os.tmpdir(), 'sd-forms-62.json'); fs.writeFileSync(tmp, JSON.stringify(extra));
const tsv = execFileSync(process.execPath, [path.join(__dirname, 'arachin-sages-scan-62.js'), ARACHIN],
  { encoding: 'utf8', env: { ...process.env, EXTRA_FORMS: tmp }, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 26 });

// ---- קיבוץ לפי חכם ----
const hits = new Map();
tsv.trim().split('\n').forEach(l => {
  const [name, daf, , ctx] = l.split('\t'); if (!name.startsWith('SD:')) return;
  let h = name.slice(3); if (PERSON_SKIP.has(h)) return; h = MAP[h] || h;
  if (!hits.has(h)) hits.set(h, new Map()); if (!hits.get(h).has(daf)) hits.get(h).set(daf, ctx);
});
// קטגוריה במדריך: תנאים — מי שדבריו בערכין במשנה/בברייתא; השאר — אמוראים, לפי הדור הידוע (הדור עצמו לא נכתב בערך)
const TANNA = new Set(['בן בג בג', 'בן בוכרי', "ר' אלעזר בן עזריה", "ר' אלעזר בן פרטא", "ר' יוחנן בן גודגדא", "ר' ישמעאל בר יוסי"]);
const EARLY = new Set(["ר' שמעון בן יהוצדק", 'רב גידל', "ר' חמא ברבי חנינא", "ר' יהודה נשיאה", 'רב מתנה', 'רב המנונא']);
const LATE = new Set(['רב זביד מנהרדעא', 'רב יוסף בריה דרבא', 'רב שימי בר אשי', 'רב דימי אחוה דרב ספרא', 'רב יוסף בריה דרב סלא חסידא']);
const MID = new Set(["ר' יצחק נפחא", "ר' שמואל בר נחמני", "ר' אבא בר ממל", "ר' אילא", "ר' אבין", "ר' חנינא בר פפא", "ר' שמואל בר נדב",
  'רמי בר חמא', 'רבה בר מרי', 'רב הונא בר יהודה', 'רב אויא', 'רב חייא בר אבין']);
const catOf = h => TANNA.has(h) ? 'tannaim' : EARLY.has(h) ? 'amoraim-early' : MID.has(h) ? 'amoraim-mid' : LATE.has(h) ? 'amoraim-late' : 'other';
const dafRef = d => 'בבלי, ערכין ' + d.replace(/\.$/, ' ע"א').replace(/:$/, ' ע"ב');
const clean = s => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const summary = h => { let t = clean(sdEntries.get(h) || ''); if (t.length > 700) { const cut = t.lastIndexOf('. ', 700); t = t.slice(0, cut > 300 ? cut + 1 : 700) + ' …'; }
  return t + ' (סדר הדורות, סדר תנאים ואמוראים)'; };
const dafOrd = d => { const m = String(d).match(/^([א-ת]+)([.:])?/); const v = { א:1,ב:2,ג:3,ד:4,ה:5,ו:6,ז:7,ח:8,ט:9,י:10,כ:20,ל:30,מ:40 };
  let n = 0; for (const c of m[1]) n += v[c] || 0; return n * 2 + (m[2] === ':' ? 1 : 0); };

const have = new Set(a.data.flatMap(e => [e.name, ...(e.aliases || [])]));
const added = [], skipped = [];
for (const [h, m] of hits) {
  const name = formOf(h);
  if (have.has(name)) {   // ערך קיים — רק מוסיפים לו את הצורה שבערכין ככינוי (למשל ״רבי חייא בר אבין״)
    const e = a.data.find(x => x.name === name || (x.aliases || []).includes(name));
    const forms = Object.keys(MAP).filter(k => MAP[k] === h).map(() => 'רבי ' + name.replace(/^רבי? /, ''));
    forms.forEach(f => { if (f !== e.name && !(e.aliases || []).includes(f)) (e.aliases = e.aliases || []).push(f); });
    skipped.push(name + (forms.length ? ' (+כינוי ' + forms.join(', ') + ')' : '')); continue; }
  const cat = catOf(h), dafs = [...m.keys()].sort((x, y) => dafOrd(x) - dafOrd(y));
  const aliases = [h].filter(x => formOf(x) !== name);
  a.data.push({ name, cat, aliases, role: cat === 'tannaim' ? 'תנא' : cat === 'other' ? '' : 'אמורא', dor: '', place: '',
    methods: [{ explanation: summary(h) }],
    midrash: dafs.map(d => ({ ref: dafRef(d), text: m.get(d) })), src: 'arachin-62' });
  added.push(name + ' (' + cat + ', ' + dafs.length + ')');
}
save(AF, a);
console.log('נוספו ' + added.length + ' חכמים למדריך אנשים מהתלמוד: ' + added.join(' · '));
if (skipped.length) console.log('כבר קיימים: ' + skipped.join(', '));
