#!/usr/bin/env node
// 6.1.0 — סריקת מסכת ערכין (בבלי, ספריית אוצריא) מול שמות הערכים בכל המדריכים.
// node _עבודה/scripts/arachin-scan-61.js <ערכין.txt של הספרייה> > _עבודה/arachin-scan.tsv
// פלט: מדריך, ערך, מספר מופעים, דפים, דוגמה. הבחירה מה נכנס — ידנית, ב-arachin-61.js.
'use strict';
const fs = require('fs');
const vm = require('vm');
const loadData = f => { const c = { K: new Proxy({}, { get: (_, k) => k }) }; vm.runInNewContext(fs.readFileSync(f, 'utf8').replace(/^(const|let) (DATA|CATS|CARD_IMAGES) =/mg, 'this.$2 =').replace(/^const /mg, 'var '), c); return c.DATA || []; };
const GUIDES = { places: 'guides/places/data/places.js', animal: 'guides/animal/data/animal-data.js',
  flora: 'guides/flora/data/flora-data.js', domem: 'guides/domem/data/domem-data.js',
  people: 'guides/people/data/people-data.js', amoraim: 'guides/amoraim/data/amoraim-data.js' };
const strip = s => String(s || '').replace(/[֑-ׇ]/g, '').replace(/<[^>]*>/g, ' ').replace(/[׳״'"]/g, '');
const norm = s => strip(s).replace(/\(.*?\)/g, ' ').replace(/[^א-ת ]/g, ' ').replace(/\s+/g, ' ').trim();
const lines = fs.readFileSync(process.argv[2], 'utf8').split('\n');
let daf = '', text = [];
lines.forEach(l => { const m = l.match(/<h2>דף ([^<]+)<\/h2>/); if (m) { daf = m[1].trim(); return; } text.push([daf, ' ' + norm(l) + ' ']); });
const out = [];
for (const [g, f] of Object.entries(GUIDES)) {
  if (!fs.existsSync(f)) continue;
  loadData(f).forEach(e => {
    const names = [e.name, ...(e.aliases || [])].map(norm).filter(n => n.length >= 2);
    const hits = []; let ex = '';
    text.forEach(([d, t]) => names.forEach(n => {
      const re = new RegExp(' (?:[ובהלמשכד]{0,2})' + n.replace(/ /g, ' ') + ' ', 'g');
      const k = (t.match(re) || []).length;
      if (k) { hits.push(d); if (!ex) { const i = t.search(re); ex = t.slice(Math.max(0, i - 30), i + n.length + 30).trim(); } }
    }));
    if (hits.length) out.push([g, e.name, hits.length, [...new Set(hits)].slice(0, 8).join(','), ex]);
  });
}
out.sort((a, b) => b[2] - a[2]);
out.forEach(r => console.log(r.join('\t')));
console.error('entries hit:', out.length);
