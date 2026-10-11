#!/usr/bin/env node
// #71 — ספירת ערכים בלי תמונה בכל מדריך (img ריק ואין CARD_IMAGES[name]). --list <guide> מדפיס שמות.
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const FILES = { sukkah:'guides/sukkah/data/sukkah-data.js', domem:'guides/domem/data/domem-data.js', places:'guides/places/data/places.js', beithamikdash:'guides/beithamikdash/data/beithamikdash-data.js', chullin:'guides/chullin/data/chullin-data.js', animal:'guides/animal/data/animal-data.js', archaeology:'guides/archaeology/data/archaeology-data.js', flora:'guides/flora/data/flora-data.js' };
function load(g) { const ctx = {}; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(ROOT, FILES[g]), 'utf8') + ';this.D=DATA;this.I=CARD_IMAGES', ctx); return ctx; }
const has = (e, I) => (e.img && I[e.img]) || (e.methods && e.methods[0] && I[e.methods[0].wiki]);
function missing(g) { const c = load(g); return c.D.filter((e) => !has(e, c.I)); }
module.exports = { FILES, load, missing };
if (require.main === module) {
  const li = process.argv.indexOf('--list');
  if (li > 0) { for (const e of missing(process.argv[li + 1])) console.log(e.name + '\t' + (e.cat || '')); return; }
  let t = 0; for (const g of Object.keys(FILES)) { const c = load(g); const m = missing(g).length; t += m; console.log(`${g}: ${m}/${c.D.length} חסרות`); }
  console.log('סה"כ חסרות: ' + t);
}
