#!/usr/bin/env node
// #71 (המשך) — מקור נוסף לבעלי חיים וצמחים שלא נמצאה להם תמונה בוויקישיתוף: iNaturalist,
// לפי השם המדעי (methods[*].latin). רק CC0 / CC BY / CC BY-SA, עם קרדיט. רק כשיש זיהוי מדעי
// יחיד וברור — ערך ״במחלוקת זיהוי״ מדולג (כלל #77: זיהוי מדעי הוא הצעה, לא עובדה).
// הקרדיט אומר במפורש ״זיהוי מוצע״. אותו כיווץ כמו harvest-images-v5.js (480px, WebP q60).
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const { FILES, missing } = require('./missing-images.js');
const { embed, getWebp, REJ, OUT, sleep, UA } = require('./harvest-images-v5.js');
const LIC = { cc0: 'CC0', 'cc-by': 'CC BY', 'cc-by-sa': 'CC BY-SA' };
const sci = (e) => {
  const all = (e.methods || []).map((m) => String(m.latin || '')).join(' | ');
  if (/מחלוקת|או |\?|ספק/.test(all)) return null;
  const hits = [...new Set(all.match(/\b[A-Z][a-z]+ [a-z]{3,}\b/g) || [])];
  return hits.length === 1 ? hits[0] : null;
};
(async () => {
  const review = ['', '## iNaturalist', '', '| מדריך | ערך | שם מדעי | רישיון |', '|---|---|---|---|'];
  for (const g of ['animal', 'flora']) {
    const items = []; let tried = 0;
    for (const e of missing(g)) {
      const s = sci(e); if (!s) continue; tried++;
      const cf = `${g}-inat-${Buffer.from(e.name).toString('hex').slice(0, 40)}.webp`;
      if (REJ.has(cf)) continue;
      const r = await fetch('https://api.inaturalist.org/v1/taxa?per_page=10&q=' + encodeURIComponent(s), { headers: { 'User-Agent': UA } });
      const t = r.ok && (await r.json()).results.find((x) => x.name === s);
      const p = t && t.name === s && t.default_photo;
      if (!p || !LIC[p.license_code]) { await sleep(1100); continue; }
      const b = await getWebp({ url: p.medium_url }, path.join(OUT, cf));
      const who = String(p.attribution || '').replace(/^\(c\)\s*/i, '').replace(/,?\s*some rights reserved.*$/i, '').slice(0, 70);
      const key = g + ':' + e.name;
      items.push({ name: e.name, cat: e.cat, key, credit: `זיהוי מוצע: ${s} · צילום: ${who} · ${LIC[p.license_code]} · iNaturalist`, images: [[key, b.toString('base64')]] });
      review.push(`| ${g} | ${e.name} | ${s} | ${LIC[p.license_code]} |`);
      await sleep(1100); // iNaturalist מבקש עד ~1 בקשה לשנייה
    }
    const res = embed(path.join(ROOT, FILES[g]), items);
    console.log(`${g}: ${res.ok} הוטמעו (מתוך ${tried} עם שם מדעי ברור)${res.fail.length ? ', נכשל: ' + res.fail.join(',') : ''}`);
  }
  fs.appendFileSync(path.join(OUT, 'review.md'), review.join('\n') + '\n');
})().catch((e) => { console.error('שגיאה:', e.message); process.exit(1); });
