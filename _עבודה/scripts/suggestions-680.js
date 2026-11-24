#!/usr/bin/env node
// 6.8.0 (25/11/2026) — הצעות עריכה ודיווחים #372–#421: אישים בתנ״ך, מקומות וצומח.
// כל ההכרעות כתובות כאן במפורש (EDITS / FIX / DROP), אחרי בדיקה מול הפסוק בספריית אוצריא.
// המקורות שהמשתמש צירף (״מקורות בתנ״ך/חז״ל״) — נוספים רק כשחסרים, ורק בערכים שלא תוקנו ידנית.
//   node suggestions-680.js /tmp/iss/all.json <…/אוצריא/תנך>
'use strict';
const fs = require('fs'), path = require('path');
const { load, save } = require('./data-io.js');
const ISS = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), TD = process.argv[3];
const V = new Map();
for (const d of ['תורה', 'נביאים', 'כתובים']) for (const f of fs.readdirSync(path.join(TD, d))) {
  const b = f.replace(/\.txt$/, ''); let ch = '';
  for (const l of fs.readFileSync(path.join(TD, d, f), 'utf8').split('\n')) {
    const h = l.match(/<h2>פרק ([א-ת]+)<\/h2>/); if (h) { ch = h[1]; continue; }
    const m = l.match(/^\(([א-ת]+)\)\s*(.*)$/);
    if (m && ch) V.set(b + ' ' + ch + ', ' + m[1], m[2].replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').replace(/\{[פס]\}/g, '').replace(/\s+/g, ' ').trim());
  }
}
const verse = ref => { const t = V.get(ref); if (!t) throw new Error('אין פסוק ' + ref); return { ref, text: t }; };
const P = 'guides/people/data/people-data.js', pd = load(P);
const L = 'guides/places/data/places.js', ld = load(L);
const A = 'guides/amoraim/data/amoraim-data.js', ad = load(A);
const log = [];
const by = (d, n) => d.data.find(e => e.name === n);
const add = (e, k, v) => { e[k] = e[k] || []; if (!e[k].includes(v)) { e[k].push(v); log.push(e.name + '.' + k + ' + ' + v); } };
const set = (e, k, v) => { if (e[k] !== v) { log.push(e.name + '.' + k + ': ' + (Array.isArray(e[k]) ? e[k].join(', ') : (e[k] || '—')) + ' → ' + (Array.isArray(v) ? v.join(', ') : (v || '—'))); e[k] = v; } };
const recip = (a, k, b) => { const A1 = by(pd, a), B1 = by(pd, b); if (!A1 || !B1) { log.push('⚠ חסר ' + (A1 ? b : a)); return; } add(A1, k, b); add(B1, k, a); };

// ---- א. ערכים שאינם אדם (המשתמש צדק: הפסוקים שלהם הם פועל או צירוף) — נמחקים ----
const DROP = { 'שלמה (בן עבדי)': '#372 #373 — ״בני עבדי שלמה״ (נחמיה ז, נז) הם צאצאי עבדי שלמה, לא אדם בשם שלמה בן עבדי',
  'רומס': '#382 #389 — ״וירמסו״, ״רמס חצרי״ — פועל, לא שם', 'בערה': '#383 #390 — ״ובערה ואכלה״ — פועל, לא שם' };
for (const [n, why] of Object.entries(DROP)) {
  const i = pd.data.findIndex(e => e.name === n); if (i < 0) continue; pd.data.splice(i, 1); log.push('נמחק: ' + n + ' (' + why + ')');
  for (const e of pd.data) for (const k of ['children', 'spouses', 'siblings']) if ((e[k] || []).includes(n)) e[k] = e[k].filter(x => x !== n);
}
// ---- ב. אדם שקיים בתנ״ך, אבל הפסוקים שבערך שייכים לאחר/למקום — מחליפים בפסוק הנכון ----
const FIX = {
  'פנואל': { v: ['דברי הימים א ד, ד', 'דברי הימים א ח, כה'], note: 'שני אישים: פנואל אבי גדור, מבני יהודה (דה״א ד, ד), ופנואל מבני שושק, משבט בנימין (דה״א ח, כה). הפסוקים על פנואל שבעבר הירדן — במדריך המקומות.' },
  'אריאל': { v: ['עזרא ח, טז'], note: 'מן הראשים שעזרא שלח אל אדו בכספיא (עזרא ח, טז). ״אריאל״ שבישעיהו כט הוא כינוי לירושלים, ו״שני אריאל מואב״ — גיבורי מואב.' },
  'יצרי': { v: ['דברי הימים א כה, יא'], note: 'מבני ידותון המשוררים, הרביעי בגורל (דה״א כה, יא); בפסוק ג שם נקרא ״צרי״.' },
  'אבי': { keep: ['מלכים ב יח, ב'], v: ['דברי הימים ב כט, א'], note: 'אם חזקיהו מלך יהודה, ״אבי בת זכריה״ (מל״ב יח, ב); בדברי הימים ״אביה בת זכריה״ (דה״ב כט, א).' },
};
for (const [n, f] of Object.entries(FIX)) {
  const e = by(pd, n); if (!e) continue;
  const old = (e.verses || []).length;
  e.verses = (e.verses || []).filter(v => (f.keep || []).includes(v.ref)).concat(f.v.map(verse)).filter((v, i, a) => a.findIndex(x => x.ref === v.ref) === i);
  set(e, 'note', f.note); log.push(n + ': פסוקים ' + old + ' → ' + e.verses.length);
}
{ const e = by(pd, 'אבי'); if (e) { set(e, 'era', 'תקופת המלכים ובית ראשון'); set(e, 'dwelling', 'ירושלים'); add(e, 'aliases', 'אביה בת זכריה'); recip('אבי', 'spouses', 'אחז'); const h = by(pd, 'חזקיהו'); add(e, 'children', 'חזקיהו'); if (h) set(h, 'mother', 'אבי'); } }

// ---- ג. שינויי שדות שהמשתמשים הציעו (נבדקו מול הפסוק שצירפו) ----
const E = (n, fn) => { const e = by(pd, n); if (e) fn(e); else log.push('⚠ אין ערך ' + n); };
E('איזבל', e => { set(e, 'roles', ['אשת מלך']); });
recip('איזבל', 'spouses', 'אחאב בן עמרי');
E('אחאב בן עמרי', e => set(e, 'roles', ['מלך ישראל']));
E('גיחזי', e => { set(e, 'roles', ['משרת אלישע הנביא']); set(e, 'note', 'נער אלישע הנביא'); });
E('פוטי', e => { set(e, 'name', 'פוטי פרע'); add(e, 'aliases', 'פוטי'); });
E('אסנת', e => set(e, 'father', 'פוטי פרע'));
E('חזקיהו', e => set(e, 'note', 'מלך יהודה'));
E('ישעיהו', e => { set(e, 'roles', ['נביא']); set(e, 'note', ''); });
E('אחיהו', e => set(e, 'roles', ['נביא']));
E('אליהו', e => { add(e, 'aliases', 'אליהו התשבי'); set(e, 'roles', ['נביא']); });
E('בעשא', e => { set(e, 'roles', ['מלך ישראל']); set(e, 'tribe', 'יששכר'); });
E('סנחריב', e => set(e, 'roles', ['מלך אשור']));
E('אדנירם', e => set(e, 'note', 'ממונה על המס תחת שלמה המלך (מלכים א ד, ו)'));
E('זבוד', e => set(e, 'aliases', (e.aliases || []).filter(a => a !== 'זבוד' && a !== 'וזבוד')));
// ״יהושבע בת המלך יורם אחות אחזיהו״ — יורם מלך יהודה, אבי אחזיהו בן יהורם (הערך ״יהורם״), לא יורם בן אחאב
E('יהושבע', e => { set(e, 'father', 'יהורם'); add(e, 'aliases', 'יהושבעת'); });
E('יהורם', e => add(e, 'children', 'יהושבע'));
recip('יהושבע', 'spouses', 'יהוידע');
recip('יהושבע', 'siblings', 'אחזיהו בן יהורם');
E('אמציהו', e => { add(e, 'children', 'עזריה בן אמציה'); set(e, 'dwelling', 'ירושלים'); set(e, 'deathPlace', 'לכיש'); set(e, 'burialPlace', 'ירושלים, עיר דוד'); });
E('עזריה בן אמציה', e => { if (!e.father) set(e, 'father', 'אמציהו'); });
// אישיות שהשם שלה שייך לאחד מכמה — ההבהרה האוטומטית ״ודא לאיזה מהם״ נשארת רק כשיש באמת כמה
// ---- ד. מקומות ----
{ const j = by(ld, 'ירושלים'); if (j) { add(j, 'aliases', 'ציון'); add(j, 'aliases', 'עיר יהודה'); } }
{ const k = by(ld, 'כפירים'); if (k) add(k, 'aliases', 'הכפירים'); }
// ערקת לבנה — מושבו של רבי ישמעאל בן סתריאל (בכורות נז ע״ב). הזיהוי הגאוגרפי לא נמצא בספרייה
if (!by(ld, 'ערקת לבנה')) {
  ld.data.push({ name: 'ערקת לבנה', cat: 'cities', aliases: ['ערקת לבינה'], region: '',
    methods: [{ label: 'לפי התלמוד', explanation: 'מקום מושבו של רבי ישמעאל בן סתריאל, שהעיד ממנהג מקומו לפני רבי (בבלי, בכורות נז ע״ב). מקומה המדויק לא נמצא במקורות שבספרייה.', modern: 'לא אומת', confidence: 'לא אומת' }],
    verses: [], midrash: [{ ref: 'בבלי, בכורות נז ע"ב', text: 'העיד רבי ישמעאל בן סתריאל מערקת לבינה לפני רבי במקומנו מפשיטין את המתה ומלבישין את החי' }], academic: [], tags: [] });
  log.push('מקום חדש: ערקת לבנה');
}
{ const r = by(ad, 'רבי ישמעאל בן סתריאל'); if (r) set(r, 'place', 'ערקת לבנה'); }

// ---- ה. מקורות שהמשתמשים צירפו (רק מה שחסר; לא בערכים שתוקנו או נמחקו) ----
const REF = /((?:[א-ת"'״]+,? ){0,5}[א-ת"'״]+ [א-ת]{1,3}[.:]?(?:,? [א-ת]{1,3}(?:[–-][א-ת]{1,3})?)?(?: ע"[אב])?) \|/g;
const strip = s => s.replace(/[֑-ׇ]/g, '');
const BOOKS = [...new Set([...V.keys()].map(k => k.replace(/ [א-ת]+, [א-ת]+$/, '')))].sort((a, b) => b.length - a.length);
const STARTER = new RegExp('(?:^| )(?=(?:' + BOOKS.concat(['בבלי', 'ירושלמי', 'משנה', 'תוספתא', '(?:אברבנאל|רש"י|רד"ק|מלבי"ם|מצודת דוד|מצודת ציון|רלב"ג|אבן עזרא|ספורנו|רמב"ן|אור החיים|כלי יקר|תרגום יונתן|אונקלוס) על']).join('|') + ')[ ,])', 'g');
const skip = new Set([...Object.keys(DROP), ...Object.keys(FIX)]);
for (const j of ISS) {
  const m = /— (.+?) \((אישים בתנ״ך|מקומות)\)/.exec(j.title); if (!m || skip.has(m[1].trim())) continue;
  const d = m[2] === 'מקומות' ? ld : pd; const e = by(d, m[1].trim()); if (!e) continue;
  let b = (j.body || '').replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ');
  const i = b.indexOf('מה השתנה'); if (i < 0) continue; b = b.slice(i + 8).split(/ ?--- ?/)[0];
  for (const p of b.split(/מקורות (?=בתנ״ך:|חז״ל:)/)) {
    const isT = p.startsWith('בתנ״ך:'), isM = p.startsWith('חז״ל:'); if (!isT && !isM) continue;
    const body = p.replace(/^(בתנ״ך|חז״ל):\s*/, '').split(/ מקורות נוספים:/)[0]; const refs = [...body.matchAll(REF)];
    refs.forEach((r, k) => {
      // המחרוזת שלפני ״|״ כוללת גם את סוף הטקסט הקודם — מתחילים מהשם הידוע האחרון (ספר תנ״ך / בבלי / מפרש)
      let ref = r[1].trim(); const st = [...ref.matchAll(STARTER)]; if (!st.length) return; let at = st[st.length - 1].index; const pre = ref.slice(0, at).match(/(?:^| )((?:אברבנאל|רש"י|רד"ק|מלבי"ם|מצודת דוד|מצודת ציון|רלב"ג|אבן עזרא|ספורנו|רמב"ן|אור החיים|כלי יקר|תרגום יונתן|אונקלוס) על)\s*$/);
      if (pre) at = pre.index; ref = ref.slice(at).trim();
      if (isT && !V.has(ref)) return;
      if (isM && V.has(ref)) return;   // פסוק שהגיע בטעות לחלק של חז״ל
      const text = body.slice(r.index + r[0].length, k + 1 < refs.length ? refs[k + 1].index : undefined).trim().replace(/…$/, '');
      if (!text) return; const key = isT ? 'verses' : 'midrash'; e[key] = e[key] || [];
      if (e[key].some(v => strip(v.ref || v.source || '') === strip(ref))) return;
      e[key].push({ ref, text }); log.push('#' + j.number + ' ' + e.name + '.' + key + ' + ' + ref);
    });
  }
}
save(P, pd); save(L, ld); save(A, ad);
fs.writeFileSync('_עבודה/out/suggestions-680.txt', log.join('\n') + '\n');
console.log('שינויים:', log.length, '· אזהרות:', log.filter(x => x.startsWith('⚠')).join(' | ') || 'אין');
