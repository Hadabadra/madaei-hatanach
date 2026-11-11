#!/usr/bin/env node
// סבב 6ב — תמונות ברישיון חופשי לכלי השיר (ויקישיתוף). הקבצים הורדו ל-/tmp/img
// (ר' רשימת המקורות למטה), הוקטנו ל-480px WebP q60 ע"י python3/PIL, ומוטבעים כאן.
//   node _עבודה/scripts/arachin-6b-images.js /tmp/img
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { load, save } = require('./data-io.js');
const dir = process.argv[2] || '/tmp/img';
const IMGS = {
  'domem:חצוצרה-טיטוס': { f: 'titus.jpg', credit: 'שער טיטוס ברומא — צילום Dnalor 01 · CC BY-SA 3.0 · ויקישיתוף (File:Arch of Titus, Chazozra.jpg)' },
  'domem:חצוצרה-מטבע': { f: 'coin.jpg', credit: 'מטבע מימי מרד בר כוכבא, חצוצרות וכלי מיתרים — IsraelXKV8R · CC BY-SA 3.0 · ויקישיתוף (File:Bar Kokhba Coin.jpg)' },
  'domem:נבל-מטבעות': { f: 'lyres.png', credit: 'מטבעות יהודיים עם כלי מיתרים, Encyclopaedia Biblica (1903) · נחלת הכלל · ויקישיתוף; זיהוי הכלי שעל המטבע כנבל או ככנור — לא אומת' },
  'domem:אבוב-ציור': { f: 'pipe.png', credit: 'חצוצרה ישרה וחליל, Encyclopaedia Biblica (1903) · נחלת הכלל · ויקישיתוף' },
};
const SET = { 'חצוצרה': ['domem:חצוצרה-טיטוס', 'domem:חצוצרה-מטבע'], 'נבל': ['domem:נבל-מטבעות'], 'אבוב': ['domem:אבוב-ציור'] };
const py = `import sys,base64,io
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGB'); im.thumbnail((480,480))
b=io.BytesIO(); im.save(b,'WEBP',quality=60); sys.stdout.write(base64.b64encode(b.getvalue()).decode())`;
const IF = 'guides/domem/data/domem-data-images.js';
let it = fs.readFileSync(IF, 'utf8');
const head = 'const CARD_IMAGES = {';
if (!it.includes(head)) throw new Error('images file format');
let added = 0;
for (const [k, v] of Object.entries(IMGS)) {
  if (it.includes(JSON.stringify(k) + ':')) continue;
  const b64 = execFileSync('python3', ['-I', '-c', py, path.join(dir, v.f)]).toString();
  it = it.replace(head, head + JSON.stringify(k) + ':' + JSON.stringify('data:image/webp;base64,' + b64) + ',');
  added++;
}
fs.writeFileSync(IF, it);
const DF = 'guides/domem/data/domem-data.js', d = load(DF);
for (const [name, keys] of Object.entries(SET)) {
  const e = d.data.find(x => x.name === name);
  e.img = keys[0]; e.gallery = keys.slice(1);
  e.credit = keys.map(k => IMGS[k].credit).join(' | ');
}
save(DF, d);
console.log('הוטבעו', added, 'תמונות;', Object.keys(SET).length, 'ערכים עודכנו');
