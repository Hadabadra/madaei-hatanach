#!/usr/bin/env node
// 6.2.0 — הקשר חדש ״חכמי המסכת״ במדריך מסכת ערכין: ערך קישור אחד לכל תנא/אמורא שבבבלי ערכין,
// עם כל הדפים שהוא נזכר בהם (dafs — סינון ״דף״ ושער הבבלי מוצאים אותו בכל אחד מהם) וקישור לערך המלא
// במדריך ״אנשים מהתלמוד״ (amoraim). המופעים — מ-arachin-sages-scan-62.js (התאמה ארוכה + סינון שמות דו-משמעיים).
//   node _עבודה/scripts/arachin-sages-62.js "<…/אוצריא/תלמוד בבלי/סדר קדשים/ערכין.txt>"     (חוזר בלי כפילויות)
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { load, save } = require('./data-io.js');
const SRC = process.argv[2];
if (!SRC) { console.error('usage: arachin-sages-62.js <ערכין.txt>'); process.exit(1); }
const tsv = execFileSync(process.execPath, [path.join(__dirname, 'arachin-sages-scan-62.js'), SRC], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const dafOrd = d => { const m = String(d || '').match(/^([א-ת]+)([.:])?/); if (!m) return 9999; const v = { א:1,ב:2,ג:3,ד:4,ה:5,ו:6,ז:7,ח:8,ט:9,י:10,כ:20,ל:30,מ:40 }; let n = 0; for (const c of m[1]) n += v[c] || 0; return n * 2 + (m[2] === ':' ? 1 : 0); };
const per = new Map(), viaAlias = new Map();   // שם → Map(דף → ציטוט ראשון); שם → הכינויים הסתמיים שזוהה בהם
const normName = s => s.replace(/[׳']/g, '').replace(/^ר /, 'רבי ').replace(/\(.*?\)/g, '').trim();
tsv.trim().split('\n').forEach(l => {
  const [name, daf, form, ctx] = l.split('\t');
  if (normName(name).startsWith(form + ' ')) {   // כינוי סתמי בלבד (״רבי יהודה״), לא כתיב אחר (״ריש לקיש״)
    if (!viaAlias.has(name)) viaAlias.set(name, new Set()); viaAlias.get(name).add(form); }
  if (!per.has(name)) per.set(name, new Map());
  if (!per.get(name).has(daf)) per.get(name).set(daf, ctx);
});
const AF = 'guides/arachin/data/arachin-data.js';
{ let t = fs.readFileSync(AF, 'utf8');
  if (!t.includes('"id": "chachamim"')) {
    const cat = { id: 'chachamim', num: 'ט', label: 'חכמי המסכת', blurb: 'התנאים והאמוראים שבמסכת — כל חכם עם הדפים שהוא נזכר בהם, והערך המלא במדריך אנשים מהתלמוד.' };
    const i = t.indexOf('\n];\nconst DATA');
    t = t.slice(0, i) + ',\n' + JSON.stringify(cat, null, 1).replace(/\n/g, '\n ').replace(/^/, ' ') + t.slice(i);
    fs.writeFileSync(AF, t);
  } }
const a = load(AF);
a.data = a.data.filter(e => e.cat !== 'chachamim');   // ריצה חוזרת — בונים את ההקשר מחדש
const rows = [...per.entries()].map(([name, m]) => {
  const dafs = [...m.keys()].sort((x, y) => dafOrd(x) - dafOrd(y));
  const al = viaAlias.has(name) ? [...viaAlias.get(name)] : [];
  const note = al.length ? 'נמצא גם בכינוי הסתמי ' + al.map(x => '״' + x + '״').join(', ') + ' — הזיהוי עם ' + name + ' לפי הכלל המקובל; לא אומת בכל מופע.' : '';
  return { masechet: 'ערכין', aliases: [], note, name, cat: 'chachamim', daf: dafs[0], dafs,
    makorot: dafs.map(d => ({ ref: 'בבלי, ערכין ' + d, text: m.get(d) })),
    explanation: 'נזכר בבבלי ערכין ' + (dafs.length > 1 ? 'בדפים ' + dafs.join(', ') : 'בדף ' + dafs[0]) + '. הערך המלא — במדריך אנשים מהתלמוד.',
    link: { cat: 'amoraim', entry: name } };
}).sort((x, y) => y.dafs.length - x.dafs.length || x.name.localeCompare(y.name, 'he'));
a.data.push(...rows);
save(AF, a);
console.log('חכמי המסכת: ' + rows.length + ' חכמים, ' + rows.reduce((s, r) => s + r.dafs.length, 0) + ' זוגות חכם-דף; סה״כ במדריך ' + a.data.length);
