#!/usr/bin/env node
// 6.8.0 — תמונות לצומח ולבעלי החיים שאין להם תמונה, מ-iNaturalist (ויקישיתוף חוסמת את השרת בהגבלת קצב, 429).
//   1. זיהוי המין: שם מדעי מהשדות (latin/label) → התאמה מדויקת לשם הטקסון; אחרת השם העברי של הזיהוי
//      (methods[0].wiki / label / שם הערך) — רק כשהשם העברי של הטקסון ב-iNaturalist זהה לו בדיוק.
//      ערך שזיהויו ״לא אומת״ — בלי תמונה (תמונה של מין לא ודאי מטעה יותר משהיא עוזרת).
//   2. תצפית בדרגת מחקר עם רישיון חופשי בלבד: CC0 / CC BY / CC BY-SA (בלי NC/ND, כמו harvest-images-v5.js),
//      עדיפות לתצפית מארץ ישראל (place_id 6815), לפי מספר ההצבעות.
//   3. 480px WebP q60, ישר לקובץ התמונות (<x>-data-images.js) + "img" ו-"credit" בערך.
//   node harvest-inat-680.js [--dry] [--only flora,animal]   (sharp: NODE_PATH או /tmp/imgtool/node_modules)
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let sharp; try { sharp = require('sharp'); } catch (_) { sharp = require('/tmp/imgtool/node_modules/sharp'); }
const DRY = process.argv.includes('--dry');
const oi = process.argv.indexOf('--only');
const ONLY = oi > 0 ? process.argv[oi + 1].split(',') : ['flora', 'animal'];
const UA = 'GinimLamikra-image-harvest/6.8 (https://github.com/Hadabadra/madaei-hatanach)';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url, json = true) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.ok) return json ? r.json() : Buffer.from(await r.arrayBuffer());
    await sleep(3000 * (i + 1));
  }
  return null;
}
const load = (f, v) => { const c = { K: new Proxy({}, { get: (_, k) => k }) };
  vm.runInNewContext(fs.readFileSync(f, 'utf8').replace(/^(const|let) (DATA|CATS|CARD_IMAGES|ICONS) =/mg, 'this.$2 =').replace(/^const /mg, 'var '), c); return c[v]; };
const heb = s => String(s || '').replace(/[֑-ׇ]/g, '').replace(/[-־]/g, ' ').replace(/[^א-ת ]/g, '').replace(/\s+/g, ' ').trim();
const LIC = { 'cc0': 'CC0', 'cc-by': 'CC BY', 'cc-by-sa': 'CC BY-SA' };
async function taxonFor(e) {
  const ms = e.methods || [];
  const txt = ms.map(m => [m.latin, m.label].join(' ')).join(' ');
  const lat = (txt.match(/\b([A-Z][a-z]+ [a-z]{3,})\b/) || [])[1];
  if (lat) {
    const d = await get('https://api.inaturalist.org/v1/taxa?per_page=5&q=' + encodeURIComponent(lat));
    const t = d && d.results.find(x => x.name === lat); if (t) return { id: t.id, via: lat };
  }
  const cands = [ms[0] && ms[0].wiki, ms[0] && String(ms[0].label || '').replace(/\(.*?\)/g, '')].map(heb).filter(x => x.length >= 2);
  for (const c of [...new Set(cands)]) {
    const d = await get('https://api.inaturalist.org/v1/taxa/autocomplete?locale=he&per_page=8&q=' + encodeURIComponent(c));
    const t = d && d.results.find(x => heb(x.preferred_common_name) === c || heb(x.matched_term) === c);
    if (t && /^(species|genus|subspecies|variety)$/.test(t.rank)) return { id: t.id, via: c + ' → ' + t.name };
    await sleep(700);
  }
  return null;
}
async function photoFor(id) {
  for (const place of ['&place_id=6815', '']) {
    const d = await get('https://api.inaturalist.org/v1/observations?quality_grade=research&order_by=votes&per_page=10&photo_license=cc0,cc-by,cc-by-sa&taxon_id=' + id + place);
    for (const o of (d && d.results) || []) for (const p of o.photos || []) if (LIC[p.license_code]) return { url: p.url.replace('/square.', '/medium.'), credit: String(p.attribution || '').replace(/^\(c\)\s*/, '').replace(/, some rights reserved.*$/, '').replace(/no rights reserved/, 'נחלת הכלל').replace(/&amp;/g, '&').trim() + ' · ' + LIC[p.license_code] + ' · iNaturalist' };
    await sleep(700);
  }
  return null;
}
function setImg(text, name, key, credit) {
  for (const k of ['{"name":' + JSON.stringify(name) + ',', '{name:' + JSON.stringify(name) + ',', '{ name: ' + JSON.stringify(name) + ',', '{name: ' + JSON.stringify(name) + ',']) {
    const at = text.indexOf(k); if (at < 0) continue;
    const next = text.indexOf('\n{', at + 3); const end = next < 0 ? text.length : next; let seg = text.slice(at, end);
    seg = seg.replace(/,?\s*"?img"?\s*:\s*(null|"[^"]*")/, '').replace(/,?\s*"?credit"?\s*:\s*"[^"]*"/, '');
    seg = seg.slice(0, k.length) + '"img":' + JSON.stringify(key) + ',"credit":' + JSON.stringify(credit) + ',' + seg.slice(k.length);
    return text.slice(0, at) + seg + text.slice(end);
  }
  return null;
}
(async () => {
  const sum = {};
  for (const g of ONLY) {
    const DF = `guides/${g}/data/${g}-data.js`, IF = `guides/${g}/data/${g}-data-images.js`;
    const D = load(DF, 'DATA'), I = load(IF, 'CARD_IMAGES') || {};
    const has = e => (e.img && I[e.img]) || (e.methods && e.methods[0] && e.methods[0].wiki && I[e.methods[0].wiki]);
    const miss = D.filter(e => !has(e) && !JSON.stringify(e.methods || []).includes('לא אומת') && e.identification !== 'לא אומת');
    let text = fs.readFileSync(DF, 'utf8'); const st = { missing: miss.length, ok: 0, noTaxon: 0, noPhoto: 0 }; const rep = [];
    for (const e of miss) {
      const t = await taxonFor(e); if (!t) { st.noTaxon++; continue; }
      const p = await photoFor(t.id); if (!p) { st.noPhoto++; rep.push(e.name + '\t' + t.via + '\tאין תמונה חופשית'); continue; }
      rep.push(e.name + '\t' + t.via + '\t' + p.credit);
      if (DRY) { st.ok++; continue; }
      const buf = await get(p.url, false); if (!buf) { st.noPhoto++; continue; }
      const webp = await sharp(buf).rotate().resize({ width: 480, withoutEnlargement: true }).webp({ quality: 60 }).toBuffer();
      const key = g + ':' + e.name; const nt = setImg(text, e.name, key, p.credit); if (!nt) { st.noPhoto++; continue; }
      text = nt; I[key] = 'data:image/webp;base64,' + webp.toString('base64'); st.ok++;
      await sleep(800);
    }
    if (!DRY && st.ok) {
      fs.writeFileSync(DF, text);
      const head = fs.readFileSync(IF, 'utf8').split('\n')[0];
      fs.writeFileSync(IF, (head.startsWith('//') ? head + '\n' : '') + 'const CARD_IMAGES = ' + JSON.stringify(I) + ';\n');
    }
    fs.mkdirSync('_עבודה/out', { recursive: true }); fs.writeFileSync(`_עבודה/out/inat-images-680-${g}.tsv`, rep.join('\n') + '\n');
    sum[g] = st;
  }
  console.log(JSON.stringify(sum));
})();
