#!/usr/bin/env node
// #71 (5.0.0) — השלמת תמונות לכל הערכים החסרים, בסקריפט אחד:
//   1. לכל ערך בלי תמונה: מחפש ערך בוויקיפדיה העברית (methods[0].wiki → name → aliases),
//      ולוקח את התמונה הראשית שלו — רק אם היא בוויקישיתוף (לא קובץ ״שימוש הוגן״ מקומי).
//   2. רישיון: נחלת הכלל / CC0 / CC BY / CC BY-SA בלבד (בלי NC/ND). קרדיט: יוצר + רישיון.
//   3. מסנן תוכן (כלל #77 / קהל היעד): מדלג על קבצים שבשמם/תיאורם/קטגוריותיהם יש
//      כנסייה, מנזר, מסגד, ציור דמויות, נשים וכו׳ — ומפיק דוח לעין אנושית.
//   4. מוריד ממוזער 480px, מכווץ ל-WebP q60 (קל יותר מ-q78 של compress-embedded-images.js, עדיין ברור),
//      ומטביע: CARD_IMAGES[key] + "img" + "credit" בערך.
//   5. --wall: 10–15 תמונות היסטוריות של הכותל המערבי מנחלת הכלל (בונפיס, פרית, המושבה
//      האמריקנית/מטסון, צילומים לפני 1958) לגלריה של ״האבן הגדולה שבכותל המערבי״.
// שימוש:  node _עבודה/scripts/harvest-images-v5.js [--dry] [--only domem,places] [--wall-only]
// מטמון: _עבודה/assets/v5-images/ (הרצה חוזרת לא מורידה שוב). הדוח: review.md שם.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const sharp = require('sharp');
const ROOT = path.resolve(__dirname, '../..');
const { FILES } = require('./missing-images.js');
const OUT = path.join(ROOT, '_עבודה/assets/v5-images');
const DRY = process.argv.includes('--dry');
const WALL_ONLY = process.argv.includes('--wall-only');
const oi = process.argv.indexOf('--only');
const ONLY = oi > 0 ? process.argv[oi + 1].split(',') : Object.keys(FILES);
const UA = 'GinimLamikra-image-harvest/5.0 (https://github.com/e0548433917-gif/madaei-hatanach)';
fs.mkdirSync(OUT, { recursive: true });
// rejected.txt — קבצים שנפסלו בסקירה חזותית (לא קשור, מודרני/אנכרוניסטי, דמויות, כפילויות). לא מוטבעים.
const REJ = new Set(fs.existsSync(path.join(OUT, 'rejected.txt')) ? fs.readFileSync(path.join(OUT, 'rejected.txt'), 'utf8').split(/\r?\n/).filter(Boolean) : []);

const OK_LIC = /^(public domain|pd|cc0|cc[- ]by(-sa)?([- ][\d.]+)?)/i;
const BAD_LIC = /\b(nc|nd)\b|non-?commercial|fair use|no-?derivs/i;
const BAD_TXT = /church|chapel|cathedral|basilica|monaster|convent|mosque|minaret|crucif|\bcross\b|jesus|christ|madonna|virgin mary|saint|\bst\. |icon|nun\b|priest|bishop|pope|woman|women|girl|lady|bride|nude|bikini|actress|model \(|כנסי|מנזר|מסגד|צלב|ישו|נשים|אישה|נערה|כלה|tissot|gustave dor|painting by|oil on canvas|fresco|mosaic of (a |the )?(man|woman|saint)/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(host, params, tries = 4) {
  const url = `https://${host}/w/api.php?` + new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.ok) return r.json();
    await sleep(2000 * (i + 1));
  }
  throw new Error('API ' + host + ' נכשל');
}
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const strip = (h) => String(h || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

// he.wikipedia: כותר → קובץ התמונה הראשית (אחרי הפניות, בלי דפי פירושונים)
async function leadImages(titles) {
  const map = {};
  for (const ch of chunks([...new Set(titles)], 50)) {
    const j = await api('he.wikipedia.org', { action: 'query', prop: 'pageimages|pageprops', piprop: 'name', ppprop: 'disambiguation', redirects: '1', titles: ch.join('|') });
    const alias = {};
    for (const n of j.query.normalized || []) alias[n.to] = (alias[n.to] || []).concat(n.from);
    for (const n of j.query.redirects || []) alias[n.to] = (alias[n.to] || []).concat(alias[n.from] || [], n.from);
    for (const p of j.query.pages || []) {
      if (p.missing || !p.pageimage || (p.pageprops && 'disambiguation' in p.pageprops)) continue;
      for (const t of [p.title, ...(alias[p.title] || [])]) map[t] = p.pageimage.replace(/_/g, " ");
    }
    await sleep(300);
  }
  return map;
}
// commons: קובץ → {url ממוזער, רישיון, יוצר, טקסט לסינון}
async function fileInfo(files) {
  const info = {};
  for (const ch of chunks([...new Set(files)], 50)) {
    const j = await api('commons.wikimedia.org', { action: 'query', prop: 'imageinfo', iiprop: 'url|extmetadata|mime', iiurlwidth: '480', titles: ch.map((f) => 'File:' + f).join('|') });
    for (const p of j.query.pages || []) {
      const ii = p.imageinfo && p.imageinfo[0];
      if (!ii || p.missing) continue;
      const m = ii.extmetadata || {};
      const g = (k) => strip(m[k] && m[k].value);
      info[p.title.replace(/^File:/, '')] = { url: ii.thumburl || ii.url, lic: g('LicenseShortName'), artist: g('Artist') || g('Credit'), text: [p.title, g('ImageDescription'), g('Categories'), g('ObjectName')].join(' | '), mime: ii.mime, page: ii.descriptionurl };
    }
    await sleep(300);
  }
  return info;
}
function verdict(f) {
  if (!f) return 'לא בוויקישיתוף';
  if (!OK_LIC.test(f.lic) || BAD_LIC.test(f.lic)) return 'רישיון: ' + f.lic;
  const bad = f.text.match(BAD_TXT);
  if (bad) return 'סינון תוכן: ' + bad[0];
  return null;
}
const creditOf = (f) => `${(f.artist || 'לא ידוע').slice(0, 80)} · ${f.lic} · ויקישיתוף`;
async function getWebp(f, dest) {
  if (fs.existsSync(dest)) return fs.readFileSync(dest);
  const r = await fetch(f.url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('הורדה ' + r.status);
  const buf = await sharp(Buffer.from(await r.arrayBuffer())).resize({ width: 480, withoutEnlargement: true }).webp({ quality: 60, effort: 6 }).toBuffer();
  fs.writeFileSync(dest, buf);
  return buf;
}

// הטבעה בטקסט הקובץ: מחליף img/credit בערך (לפי עוגן "name"+"cat" ייחודי), וכותב CARD_IMAGES מחדש.
function embed(file, items) {
  let text = fs.readFileSync(file, 'utf8');
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(text + ';this.I=CARD_IMAGES', ctx);
  const IMGS = JSON.parse(JSON.stringify(ctx.I));
  let ok = 0; const fail = [];
  for (const it of items) {
    // שני סגנונות כתיבה קיימים בקבצים: JSON ({"name":…}) ו-JS ({name:"…", cat:"…"})
    const esc = (s) => JSON.stringify(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\{\\s*"?name"?\\s*:\\s*${esc(it.name)}\\s*,\\s*"?cat"?\\s*:\\s*${esc(it.cat)}\\s*,`, 'g');
    const hits = [...text.matchAll(re)];
    if (hits.length !== 1) { fail.push(it.name + ': עוגן ' + hits.length); continue; }
    const at = hits[0].index + hits[0][0].length;
    const rest = text.slice(at);
    const nx = rest.search(/\{\s*"?name"?\s*:/); // תחילת הערך הבא
    let body = nx < 0 ? rest : rest.slice(0, nx); const tail = nx < 0 ? '' : rest.slice(nx);
    body = body.replace(/"?img"?\s*:\s*(null|""|'')\s*,?/, '').replace(/"?credit"?\s*:\s*(null|""|'')\s*,?/, '');
    if (it.gallery) body = body.replace(/"?gallery"?\s*:\s*\[[^\]]*\]\s*,?/, '');
    const add = `"img":${JSON.stringify(it.key)},"credit":${JSON.stringify(it.credit)},` + (it.gallery ? `"gallery":${JSON.stringify(it.gallery)},` : '');
    text = text.slice(0, at) + add + body + tail;
    for (const [k, b64] of it.images) IMGS[k] = 'data:image/webp;base64,' + b64;
    ok++;
  }
  const m = text.match(/\nconst CARD_IMAGES = [\s\S]*?\};\n/);
  if (!m) throw new Error('לא נמצא CARD_IMAGES ב-' + file);
  text = text.replace(m[0], '\nconst CARD_IMAGES = ' + JSON.stringify(IMGS).replace(/","/g, '",\n"') + ';\n');
  if (!DRY) fs.writeFileSync(file, text);
  return { ok, fail };
}

async function wall(review) {
  const cats = ['Western Wall in the 19th century', 'Old photographs of the Western Wall', 'Western Wall in the 1930s', 'Western Wall in the 1920s', 'Western Wall in the 1940s', 'Western Wall in the 1910s'];
  const files = [];
  for (const c of cats) {
    try {
      const j = await api('commons.wikimedia.org', { action: 'query', list: 'categorymembers', cmtitle: 'Category:' + c, cmtype: 'file', cmlimit: '60' });
      for (const p of j.query.categorymembers || []) files.push(p.title.replace(/^File:/, ''));
    } catch (e) { /* קטגוריה חסרה — ממשיכים */ }
  }
  const info = await fileInfo(files.filter((f) => /\.(jpe?g|png|tiff?)$/i.test(f)));
  const pd = Object.entries(info).filter(([, f]) => /public domain|^pd|cc0/i.test(f.lic) && !verdict(f));
  const images = [], keys = [];
  for (const [i, [name, f]] of pd.entries()) {
    if (keys.length >= 15 || REJ.has(`wall-${i}.webp`)) continue;
    try { const b = await getWebp(f, path.join(OUT, `wall-${i}.webp`)); const k = 'כותל-היסטורי-' + (keys.length + 1); images.push([k, b.toString('base64')]); keys.push(k); review.push(`| כותל | ${k} | [${name}](${f.page}) | ${f.lic} |`); } catch (e) { /* דילוג */ }
  }
  return { keys, images, credit: 'צילומים היסטוריים · נחלת הכלל · ויקישיתוף', found: files.length, pd: pd.length };
}

async function main() {
  const review = ['# #71 — תמונות שהוטמעו (לסקירה בעין אנושית, כלל #77)', '', '| מדריך | ערך | קובץ | רישיון |', '|---|---|---|---|'];
  const skipped = {}; let total = 0, done = 0;
  if (!WALL_ONLY) for (const g of ONLY) {
    const { missing } = require('./missing-images.js');
    const list = missing(g); total += list.length;
    const cand = (e) => [e.methods && e.methods[0] && e.methods[0].wiki, e.name].filter(Boolean);
    const lead = await leadImages(list.flatMap(cand));
    const info = await fileInfo(Object.values(lead));
    const items = [];
    for (const e of list) {
      let chosen = null, why = 'אין ערך/תמונה בוויקיפדיה';
      for (const t of cand(e)) { const f = lead[t] && info[lead[t]]; if (!lead[t]) continue; why = verdict(f) || why; if (!verdict(f)) { chosen = [lead[t], f]; break; } }
      if (!chosen) { skipped[why.split(':')[0]] = (skipped[why.split(':')[0]] || 0) + 1; continue; }
      const key = g + ':' + e.name, cf = `${g}-${Buffer.from(e.name).toString('hex').slice(0, 40)}.webp`;
      if (REJ.has(cf)) { skipped['נפסל בסקירה'] = (skipped['נפסל בסקירה'] || 0) + 1; continue; }
      try {
        const b = await getWebp(chosen[1], path.join(OUT, cf));
        items.push({ name: e.name, cat: e.cat, key, credit: creditOf(chosen[1]), images: [[key, b.toString('base64')]] });
        review.push(`| ${g} | ${e.name} | [${chosen[0]}](${chosen[1].page}) | ${chosen[1].lic} |`);
      } catch (err) { skipped['הורדה'] = (skipped['הורדה'] || 0) + 1; }
      await sleep(150);
    }
    const r = embed(path.join(ROOT, FILES[g]), items); done += r.ok;
    console.log(`${g}: ${r.ok}/${list.length} הוטמעו${r.fail.length ? ', עוגן נכשל: ' + r.fail.length + ' (' + r.fail.slice(0, 3).join('; ') + ')' : ''}`);
  }
  if (WALL_ONLY || ONLY.includes('beithamikdash')) {
    const w = await wall(review);
    if (w.keys.length) {
      const r = embed(path.join(ROOT, FILES.beithamikdash), [{ name: 'האבן הגדולה שבכותל המערבי', cat: 'archaeology', key: w.keys[0], credit: w.credit, gallery: w.keys.slice(1), images: w.images }]);
      console.log(`כותל: ${w.keys.length} תמונות נחלת הכלל (מתוך ${w.found} בקטגוריות, ${w.pd} עברו סינון)${r.fail.length ? ' — עוגן נכשל' : ''}`);
    } else console.log('כותל: לא נמצאו תמונות מתאימות');
  }
  fs.writeFileSync(path.join(OUT, 'review.md'), review.join('\n') + '\n');
  console.log(`סה״כ: ${done}/${total} · דולגו: ${JSON.stringify(skipped)}${DRY ? ' (dry)' : ''}`);
}
module.exports = { embed, getWebp, REJ, OUT, sleep, UA };
if (require.main === module) main().catch((e) => { console.error('שגיאה:', e.message); process.exit(1); });
