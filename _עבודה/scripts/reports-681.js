#!/usr/bin/env node
// 6.8.1 — דיווחים #422–#426: חנה, זכר, שמואל (אישים) ותמכה (צומח). פסוקים מספריית אוצריא.
//   node reports-681.js <תיקייה עם תורה/נביאים/כתובים>
'use strict';
const fs = require('fs'), path = require('path'); const { load, save } = require('./data-io.js');
const TD = process.argv[2]; const V = new Map();
for (const d of ['תורה', 'נביאים', 'כתובים']) for (const f of fs.readdirSync(path.join(TD, d))) { const b = f.replace(/\.txt$/, ''); let ch = '';
  for (const l of fs.readFileSync(path.join(TD, d, f), 'utf8').split('\n')) { const h = l.match(/<h2>פרק ([א-ת]+)<\/h2>/); if (h) { ch = h[1]; continue; }
    const m = l.match(/^\(([א-ת]+)\)\s*(.*)$/); if (m && ch) V.set(b + ' ' + ch + ', ' + m[1], m[2].replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').replace(/\{[פס]\}/g, '').replace(/\s+/g, ' ').trim()); } }
const vs = refs => refs.map(r => { const t = V.get(r); if (!t) throw new Error(r); return { ref: r, text: t }; });
const F = 'guides/people/data/people-data.js', d = load(F); const by = n => d.data.find(e => e.name === n); const log = [];
const add = (e, k, v) => { e[k] = e[k] || []; if (!e[k].includes(v)) e[k].push(v); };
// #425 חנה — אם שמואל, אשת אלקנה בן ירחם; ״ויחן״ בשמות אינו שם
{ const e = by('חנה'); e.verses = vs(['שמואל א א, ב', 'שמואל א א, ה', 'שמואל א א, ח', 'שמואל א א, ט', 'שמואל א א, יג', 'שמואל א א, כ', 'שמואל א ב, א', 'שמואל א ב, כא']);
  e.era = 'תקופת שמואל, שאול ודוד'; e.cat = 'shmuel'; add(e, 'spouses', 'אלקנה בן ירחם'); add(e, 'children', 'שמואל'); log.push('חנה'); }
// #426 שמואל — בן אלקנה בן ירחם וחנה; ״שמואל בן עמיהוד״ (במדבר לד, כ) הוא ערך נפרד מ-6.7.0
{ const e = by('שמואל'); e.father = 'אלקנה בן ירחם'; e.mother = 'חנה'; e.verses = e.verses.filter(v => v.ref !== 'במדבר לד, כ');
  for (const r of ['שמואל א א, כ', 'שמואל א ג, כ']) if (!e.verses.some(v => v.ref === r)) e.verses.unshift(...vs([r]));
  e.era = 'תקופת שמואל, שאול ודוד'; e.cat = 'shmuel'; add(e, 'roles', 'נביא'); log.push('שמואל');
  const a = by('אלקנה'); a.children = a.children.filter(c => c !== 'שמואל'); a.verses = a.verses.filter(v => v.ref !== 'שמואל א א, א');
  const k = by('אלקנה בן ירחם'); add(k, 'children', 'שמואל'); add(k, 'spouses', 'חנה'); add(k, 'spouses', 'פננה'); }
// #424 זכר — אדם בתנ״ך: ״וגדור ואחיו וזכר״ (דה״א ח, לא), מבני יעיאל אבי גבעון; שאר הפסוקים — המילה ״זכר״
{ const e = by('זכר'); e.verses = vs(['דברי הימים א ח, לא']); e.era = 'תקופת המלכים ובית ראשון';
  e.note = 'מבני יעיאל אבי גבעון, משבט בנימין (דה״א ח, לא). בדה״א ט, לז נקרא ״זכריה״.'; add(e, 'aliases', 'זכריה'); e.tribe = e.tribe || 'בנימין'; log.push('זכר'); }
save(F, d);
// #422 #423 תמכה — שיטת המשנה ברורה בראש ההסבר, וכינוי ״חריין״ (״חזרת״ אינו כינוי — זה שם מין אחר במשנה, החסה)
const P = 'guides/flora/data/flora-data.js'; let t = fs.readFileSync(P, 'utf8');
const o1 = 'explanation:"אחד מחמשת מיני הירק שבהם יוצאים ידי חובת מרור בליל הסדר; בניגוד לחזרת';
if (t.includes(o1)) { t = t.replace(o1, 'explanation:"אחד מחמשת מיני הירק שבהם יוצאים ידי חובת מרור בליל הסדר. במשנה ברורה (סימן תע״ג ס״ק לד) הביא בשם האחרונים שהתמכא הוא החריי״ן (בעברית של היום: חזרת), ושם (ס״ק לו) כתב ״המרור הנהוג במדינתנו לאכול הוא תמכא״; לשאלה מעשית — לשאול רב. בניגוד לחזרת'); log.push('תמכה הסבר'); }
const a0 = t.indexOf('{name:"תמכה"'); const ae = t.indexOf('aliases:[]', a0);
if (a0 > 0 && ae > a0 && ae - a0 < 6000) { t = t.slice(0, ae) + 'aliases:["חריין"]' + t.slice(ae + 'aliases:[]'.length); log.push('תמכה כינוי'); }
fs.writeFileSync(P, t); console.log(log.join(', '));
