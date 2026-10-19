#!/usr/bin/env node
// #72 / #73 — תמונות לכרטיסי מקומות לפי מיקום (geosearch בוויקישיתוף), לא לפי שם.
// ההרחבה של place-aerials.js: שם החיפוש היה לפי שם באנגלית ומצא רק 5 אתרים;
// כאן מחפשים קבצים שתויגו בקואורדינטות סמוכות לזיהוי (methods[0].geo), כך
// שגם תל לא מוכר שאין לו שם באנגלית נמצא.
// מקורות: ויקישיתוף בלבד, ברישיון חופשי (CC-BY / CC-BY-SA / CC0 / נחלת הכלל), עם קרדיט.
// לא Google / Bing / Apple. לא מפות, שרטוטים, שלטים או דיוקנאות.
//
//   --embed    (#72) אתרים ארכיאולוגיים (תל/ח׳ירבת/גן לאומי) — מוטמע ב-places.js,
//              ואחריו חובה: node tools/compress-embedded-images.js guides/places/data/places.js
//   --collect  (#73) שאר המקומות (ערים בנויות וכו׳) — נשמר מכווץ (WebP 520px) לתיקייה
//              _עבודה/assets/place-photos/ + credits.json. לא מוטמע: ממתין לטעינה העצלה (2.11).
//   --dry      בלי כתיבה.  --limit N  רק N מקומות ראשונים (לבדיקה).
// sharp נדרש ל---collect (NODE_PATH=<תיקייה שבה מותקן sharp>).
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const FILE = path.join(ROOT, 'guides/places/data/places.js');
const OUTDIR = path.join(ROOT, '_עבודה/assets/place-photos');
const arg = (k) => process.argv.includes(k);
const MODE = arg('--embed') ? 'embed' : arg('--collect') ? 'collect' : null;
const DRY = arg('--dry');
const LIMIT = (() => { const i = process.argv.indexOf('--limit'); return i > 0 ? +process.argv[i + 1] : Infinity; })();
if (!MODE) { console.error('נדרש --embed או --collect'); process.exit(1); }

const ARCH = /\b(tel|tell|khirbet|kh\.|horvat|ruins?|archaeolog\w*|national park|tel-)\b|תל |חורבת|ח׳ירבת|ח'ירבת|חורבות|גן לאומי/i;
const AIR = /aerial|drone|from above|from the air|bird'?s.eye|air view|airview|usgs|מבט אוויר|צילום אוויר/i;
const BANNED = /google|bing|apple maps|satellite image from|earth\.google/i;
const NOTPHOTO = /\b(map|karte|plan|diagram|logo|sign|signpost|poster|portrait|stamp|coin|banknote|flag|coat of arms|emblem|mosaic map|screenshot|menu|ticket|meeting|secretary|president|minister|wedding|ceremony|protest|demonstration|rally|concert|festival|flowers?|blossoms?|anemones?|portrait|selfie|mall|light rail|bunker|dictionnaire)\b|שלט|מפה|קינות|תפילה|טקס|הפגנה|כנס/i;
// נבדק בעין (09/10/2026): צילום של אתר אחר, של אירוע, או בלי האתר עצמו — נפסל
const REJECT_FILES = new Set(['File:جامع القصواء - الموصل.jpg', 'File:Jerusalem Night clubs 060.jpg',
  'File:Love Palestine, Hate racism - Nablus 002 - Aug 2011.jpg', 'File:Tel Beer Sheva13 (13521566914).jpg',
  'File:PikiWiki Israel 6294 Decorated house in Jaffa.JPG']);
// ערכים שבהם הקבצים הסמוכים אינם של האתר (עיר בנויה, אתר שכן) — עדיף בלי תמונה
const SKIP_NAMES = new Set(['יפו', 'חרמה', 'עופל', 'מגדל שכם', 'נינוה', 'דן', 'עזקה', 'יזרעאל', 'קדש נפתלי', 'עקרון']);
const OKLIC = /^(cc[- ]by(-sa)?(\s|-|$)|cc0|public domain|pd)/i;

const src = fs.readFileSync(FILE, 'utf8');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(src + ';this.D=DATA;this.I=(typeof CARD_IMAGES!=="undefined"?CARD_IMAGES:{})', ctx);
const DATA = ctx.D, IMGS = ctx.I;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const UA = { 'User-Agent': 'madaei-hatanach/1.0 (Otzaria plugin; https://github.com/Hadabadra/madaei-hatanach)' };
async function api(q, tries = 4) {
  await sleep(1200);
  const u = 'https://commons.wikimedia.org/w/api.php?format=json&origin=*&' + new URLSearchParams(q);
  const r = await fetch(u, { headers: UA });
  const txt = await r.text();
  try { return JSON.parse(txt); } catch (e) { if (tries > 1) { await sleep(8000); return api(q, tries - 1); } throw new Error('api ' + r.status); }
}
const strip = h => String(h || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

async function findImage(e, radius, used) {
  const m = e.methods[0];
  const [lat, lon] = m.geo;
  const j = await api({ action: 'query', generator: 'geosearch', ggscoord: `${lat}|${lon}`, ggsradius: radius,
    ggsnamespace: 6, ggslimit: 40, prop: 'imageinfo|coordinates', iiprop: 'url|extmetadata|mime|size', iiurlwidth: 1040 });
  const GEN = /^(israel|national|park|tell?|jordan|egypt|syria|iraq|lebanon|khirbet|horvat|ancient|biblical|city|hill|river|valley|mount|west|bank|north|south|east|turkey|iran|palestine|archaeological|site|ruins?)$/;
  const hint = String(m.mapQuery || '').toLowerCase().replace(/[()]/g, ' ').split(/[\s,\-]+/).filter(w => w.length >= 4 && !GEN.test(w))
    .concat([e.name].concat(e.aliases || []).map(n => n.replace(/\s*\(.*\)/, '')).filter(n => n.length >= 2));
  const cands = [];
  for (const p of Object.values((j.query && j.query.pages) || {})) {
    if (used.has(p.title) || REJECT_FILES.has(p.title)) continue;
    const ii = p.imageinfo && p.imageinfo[0]; if (!ii || !/jpeg|png/.test(ii.mime) || ii.width < 600) continue;
    const md = ii.extmetadata || {};
    const desc = strip(md.ImageDescription && md.ImageDescription.value).slice(0, 400);
    const credit = strip(md.Credit && md.Credit.value), artist = strip(md.Artist && md.Artist.value);
    const lic = strip(md.LicenseShortName && md.LicenseShortName.value);
    const hay = p.title + ' ' + desc;
    if (BANNED.test(hay + ' ' + credit + ' ' + artist) || NOTPHOTO.test(p.title)) continue;
    if (!OKLIC.test(lic) || /\b(nc|nd)\b/i.test(lic)) continue;
    const dist = p.coordinates && p.coordinates[0] ? p.coordinates[0].dist : radius;
    let score = -dist / radius;
    if (AIR.test(hay)) score += 3;
    const named = hint.some(w => hay.toLowerCase().includes(w.toLowerCase()));
    if (!named) continue;           // רק קובץ שמזכיר את האתר עצמו בשם — לא כל צילום שצולם בקרבת מקום
    score += 2;
    if (ARCH.test(hay)) score += 1;
    cands.push({ title: p.title, url: ii.thumburl || ii.url, lic, artist: (artist || credit || 'לא צוין').slice(0, 80), score, air: AIR.test(hay) });
  }
  cands.sort((a, b) => b.score - a.score);
  // צילום שלא מזכיר את האתר ולא אווירי — רק אם קרוב מאוד (score > -0.4) ובמצב embed נדרש סימן אתר
  const best = cands[0];
  if (!best) return null;
  if (MODE === 'embed' && best.score < 0.5) return null;
  return best;
}

(async () => {
  const pool = DATA.filter(e => e.methods && e.methods[0] && Array.isArray(e.methods[0].geo)
    && !e.img && !(e.gallery && e.gallery.length) && !IMGS[e.name]);
  const isArch = e => (e.cat === 'cities' || e.cat === 'villages') && ARCH.test((e.methods[0].modern || '') + ' ' + (e.methods[0].mapQuery || ''));
  const list = pool.filter(e => MODE === 'embed' ? isArch(e) : (!isArch(e) && /^(cities|villages|stations|mountains|water|valleys|deserts|regions)$/.test(e.cat))).slice(0, LIMIT);
  let text = src; const added = [], skipped = [], used = new Set();
  let credits = {};
  if (MODE === 'collect') { fs.mkdirSync(OUTDIR, { recursive: true }); try { credits = JSON.parse(fs.readFileSync(path.join(OUTDIR, 'credits.json'), 'utf8')); } catch (_) {}
    // נפסלו בבדיקה בעין (בני אדם, בתי תפילה של דתות אחרות, פסיפסים בדמויות, רחוב מודרני) — לא לאסוף שוב
    try { Object.keys(JSON.parse(fs.readFileSync(path.join(OUTDIR, 'rejected.json'), 'utf8'))).forEach(n => SKIP_NAMES.add(n)); } catch (_) {} }
  const sharp = MODE === 'collect' ? require('sharp') : null;
  for (const e of list) {
    if (SKIP_NAMES.has(e.name)) { skipped.push(`${e.name}: נפסל בבדיקה`); continue; }
    if (MODE === 'collect' && credits[e.name]) { skipped.push(`${e.name}: כבר נאסף`); continue; }
    const anchor = `{"name":${JSON.stringify(e.name)},`;
    if (MODE === 'embed' && text.split(anchor).length !== 2) { skipped.push(`${e.name}: עוגן לא ייחודי`); continue; }
    let img; try { img = await findImage(e, MODE === 'embed' ? 800 : 1500, used); } catch (err) { skipped.push(`${e.name}: ${err.message}`); continue; }
    if (!img) { skipped.push(`${e.name}: לא נמצא`); continue; }
    used.add(img.title);
    const r = await fetch(img.url, { headers: UA });
    if (!r.ok) { skipped.push(`${e.name}: הורדה ${r.status}`); continue; }
    const buf = Buffer.from(await r.arrayBuffer());
    const credit = `${img.artist}, ויקישיתוף (${img.title.replace(/^File:/, '')}) · ${img.lic}`;
    if (MODE === 'embed') {
      const mime = r.headers.get('content-type') || 'image/jpeg';
      text = text.replace(anchor, anchor + `"img":${JSON.stringify(e.name)},"credit":${JSON.stringify(credit)},`);
      IMGS[e.name] = `data:${mime};base64,${buf.toString('base64')}`;
    } else if (!DRY) {
      const out = await sharp(buf).resize({ width: 520, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
      const fname = e.name.replace(/[\\/:*?"<>|׳״']/g, '') + '.webp';
      fs.writeFileSync(path.join(OUTDIR, fname), out);
      credits[e.name] = { file: fname, cat: e.cat, credit, source: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(img.title.replace(/ /g, '_')) };
    }
    added.push(`${e.name} ← ${img.title}${img.air ? ' (אוויר)' : ''}`);
  }
  if (MODE === 'embed' && !DRY && added.length) {
    const block = 'const CARD_IMAGES = ' + JSON.stringify(IMGS, null, 0).replace(/","/g, '",\n"') + ';\n';
    text = text.replace(/\nconst CARD_IMAGES = [\s\S]*$/, '\n' + block);
    fs.writeFileSync(FILE, text);
  }
  if (MODE === 'collect' && !DRY) fs.writeFileSync(path.join(OUTDIR, 'credits.json'), JSON.stringify(credits, null, 1) + '\n');
  console.log(`${MODE}: נבדקו ${list.length}, נוספו ${added.length}, דולגו ${skipped.length}${DRY ? ' (dry)' : ''}`);
  added.forEach(s => console.log('  + ' + s));
  if (arg('--verbose')) skipped.forEach(s => console.log('  - ' + s));
})();
