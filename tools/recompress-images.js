#!/usr/bin/env node
/*
  5.0.0 — כיווץ נוסף לתמונות הישנות (WebP 520px q78 → 480px q60), כמו התמונות שנוספו ב-#71.
  לא נוגעים במה שעלול לאבד בהירות:
    • כל מדריך הארכיאולוגיה (כתובות, מטבעות, חותמות), חולין ו״סוכה ולולב״ (שרטוטים עם טקסט);
    • מפתח שנראה כתובת/מפה/שרטוט/מטבע/חותם/לוח;
    • תמונה בהירה ברובה (ממוצע בהירות > 215) — בדרך כלל ציור קווי, לוח בוטני או מפה על רקע לבן;
    • תמונות #71 (מפתח עם ״:״ או ״כותל-היסטורי״) — כבר ב-q60.
  תמונה שיוצאת גדולה מהמקור נשארת כמות שהיא. פועל על <x>-images.js בלבד.
  שימוש:  node tools/recompress-images.js [--dry]
*/
'use strict';
const fs = require('fs'), path = require('path'), sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..');
const DRY = process.argv.includes('--dry');
const SKIP_GUIDES = new Set(['archaeology', 'chullin', 'sukkah']);
const RISKY = /כתוב|כתובת|מפה|שרטוט|תרשים|מטבע|חותם|לוח|אוסטרקון|מגילה|map|coin|seal|inscri|ostrac|diagram|anatom/i;
(async () => {
  let b0 = 0, b1 = 0, n = 0, kept = 0;
  for (const g of fs.readdirSync(path.join(ROOT, 'guides'))) {
    if (SKIP_GUIDES.has(g)) continue;
    const dir = path.join(ROOT, 'guides', g, 'data');
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('-images.js'))) {
      const file = path.join(dir, f); let text = fs.readFileSync(file, 'utf8');
      const I = Function(text + ';return CARD_IMAGES;')();
      for (const [k, uri] of Object.entries(I)) {
        if (k.includes(':') || k.startsWith('כותל-היסטורי') || RISKY.test(k)) { kept++; continue; }
        const m = /^data:image\/(webp|jpeg|png);base64,(.*)$/.exec(uri); if (!m) { kept++; continue; }
        const src = Buffer.from(m[2], 'base64');
        const st = await sharp(src).stats();
        const mean = st.channels.slice(0, 3).reduce((a, c) => a + c.mean, 0) / 3;
        if (mean > 215) { kept++; continue; }
        const out = await sharp(src).resize({ width: 480, withoutEnlargement: true }).webp({ quality: 60, effort: 6 }).toBuffer();
        b0 += src.length;
        if (out.length >= src.length) { b1 += src.length; kept++; continue; }
        b1 += out.length; n++;
        text = text.split(JSON.stringify(uri)).join(JSON.stringify('data:image/webp;base64,' + out.toString('base64')));
      }
      if (!DRY) fs.writeFileSync(file, text);
    }
  }
  console.log(`כווצו ${n} תמונות: ${(b0 / 1048576).toFixed(1)}MB → ${(b1 / 1048576).toFixed(1)}MB · לא נגעו ב-${kept}${DRY ? ' (dry)' : ''}`);
})().catch((e) => { console.error('שגיאה:', e.message); process.exit(1); });
