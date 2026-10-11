#!/usr/bin/env node
/*
  #54 (5.0.0) — טעינה עצלה של התמונות: מעביר את CARD_IMAGES מכל guides/<מדריך>/data/<x>.js
  לקובץ נפרד <x>-images.js, עם _images-loader.html משלו.

  למה רק התמונות: הן ~80% מהמשקל שנטען בפתיחה. הטקסט (DATA/CATS) ממשיך להיטען מראש כמו
  היום, כי שלושה מנגנונים נשענים עליו ונשברו בפעם הקודמת שהוא נטען בעצלות:
  refreshEntryLinksWhenReady, coMentionsReady, placesNameIndex. בגישה הזו הם לא משתנים.

  בקובץ ה-data נשאר  const CARD_IMAGES = {};  כדי שכל מי שמצפה לקבוע (כלים, loader) לא ייפול.
  הרצה חוזרת: מדריך שכבר פוצל — מאחד קודם תמונות שנוספו בינתיים לקובץ ה-data, ואז מפצל.
  שימוש:  node tools/split-images.js [--dry]
*/
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DRY = process.argv.includes('--dry');
const RE = /\nconst CARD_IMAGES = (\{[\s\S]*?\});\n/;
let before = 0, after = 0; const done = [];
for (const g of fs.readdirSync(path.join(ROOT, 'guides'))) {
  const dir = path.join(ROOT, 'guides', g, 'data');
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.js') || f.endsWith('-images.js')) continue;
    const file = path.join(dir, f); let text = fs.readFileSync(file, 'utf8');
    const m = text.match(RE); if (!m) continue;
    const imgFile = path.join(dir, f.replace(/\.js$/, '-images.js'));
    let imgs = {};
    if (fs.existsSync(imgFile)) imgs = Function(fs.readFileSync(imgFile, 'utf8') + ';return CARD_IMAGES;')();
    const inData = Function('return ' + m[1])();
    if (!Object.keys(inData).length && !fs.existsSync(imgFile)) continue;
    Object.assign(imgs, inData);
    before += Buffer.byteLength(text);
    text = text.replace(RE, '\n// #54: התמונות ב-' + path.basename(imgFile) + ' (נטענות רק כשצריך)\nconst CARD_IMAGES = {};\n');
    after += Buffer.byteLength(text);
    const out = '// #54: התמונות המוטבעות של ' + f + ' — נטענות בעצלות דרך _images-loader.html\nconst CARD_IMAGES = ' + JSON.stringify(imgs).replace(/","/g, '",\n"') + ';\n';
    const loader = `<!DOCTYPE html>\n<html lang="he" dir="rtl"><head><meta charset="UTF-8"></head>\n<body>\n<script src="${path.basename(imgFile)}"></script>\n<script>\ntry {\n  parent.postMessage({ __madaeiHatanachImages: true, cat: '${g}', ok: true, images: (typeof CARD_IMAGES !== 'undefined') ? CARD_IMAGES : {} }, '*');\n} catch(e) {\n  parent.postMessage({ __madaeiHatanachImages: true, cat: '${g}', ok: false, error: String(e) }, '*');\n}\n</script>\n</body></html>\n`;
    if (!DRY) { fs.writeFileSync(file, text); fs.writeFileSync(imgFile, out); fs.writeFileSync(path.join(dir, '_images-loader.html'), loader); }
    done.push(`${g}(${Object.keys(imgs).length})`);
  }
}
console.log(`פוצלו: ${done.join(' ')}`);
console.log(`קובצי ה-data שנטענים בפתיחה: ${(before / 1048576).toFixed(1)}MB → ${(after / 1048576).toFixed(1)}MB${DRY ? ' (dry)' : ''}`);
