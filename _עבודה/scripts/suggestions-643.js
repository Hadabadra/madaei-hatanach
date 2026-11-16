#!/usr/bin/env node
// 6.4.3 (16/11/2026) — הצעות עריכה #330–#346 (אישים בתנ״ך): קשרי משפחה ופסוקים/מקורות שהמשתמש הוסיף.
// מוסיף רק מה שחסר (לא מוחק). הטקסט — כפי שהתוסף הציג למשתמש מתוך ספריית אוצריא. שימוש: node suggestions-643.js /tmp/sugg
'use strict';
const fs = require('fs'), path = require('path');
const { load, save } = require('./data-io.js');
const F = 'guides/people/data/people-data.js', d = load(F), log = [], dir = process.argv[2];
const FIELDS = { 'ילדים': 'children', 'בני/בנות זוג': 'spouses', 'אחים': 'siblings', 'אחים ואחיות': 'siblings', 'אב': 'father', 'אם': 'mother' };
const REF = /((?:[א-ת"'״]+ ){0,4}[א-ת"'״]+ [א-ת]{1,3}, [א-ת]{1,3}(?:[–-][א-ת]{1,3})?) \|/g;
const strip = s => s.replace(/[֑-ׇ]/g, '');
for (const f of fs.readdirSync(dir)) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); const n = j.number;
  const m = /— (.+?) \(/.exec(j.title); if (!m) continue;
  const e = d.data.find(x => x.name === m[1].trim()); if (!e) { log.push(`#${n} ${m[1]}: אין ערך`); continue; }
  let b = (j.body || '').replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ');
  const i = b.indexOf('מה השתנה'); if (i < 0) continue; b = b.slice(i + 8).split(/ ?--- ?/)[0];
  const src = b.indexOf('מקורות'); const head = src >= 0 ? b.slice(0, src) : b;
  for (const fm of head.matchAll(/• ([^:•]+): ([^←•]*)← ([^•]+)/g)) {
    const k = FIELDS[fm[1].trim()]; if (!k) continue; const nv = fm[3].trim();
    if (k === 'father' || k === 'mother') { if (e[k] !== nv) { log.push(`#${n} ${e.name}.${k}: ${e[k] || '—'} → ${nv}`); e[k] = nv; } }
    else for (const v of nv.split(/,\s*/).map(s => s.trim()).filter(Boolean)) { e[k] = e[k] || []; if (!e[k].includes(v)) { e[k].push(v); log.push(`#${n} ${e.name}.${k} + ${v}`); } }
  }
  const parts = b.split(/מקורות (?=בתנ״ך:|חז״ל:)/);
  for (const p of parts) {
    const isT = p.startsWith('בתנ״ך:'), isM = p.startsWith('חז״ל:'); if (!isT && !isM) continue;
    const body = p.replace(/^(בתנ״ך|חז״ל):\s*/, ''); const refs = [...body.matchAll(REF)];
    refs.forEach((r, k) => {
      const ref = r[1].trim(), text = body.slice(r.index + r[0].length, k + 1 < refs.length ? refs[k + 1].index : undefined).trim();
      if (!text) return; const key = isT ? 'verses' : 'midrash'; e[key] = e[key] || [];
      if (e[key].some(v => strip(v.ref) === strip(ref))) return;
      e[key].push({ ref, text }); log.push(`#${n} ${e.name}.${key} + ${ref}`);
    });
  }
}
save(F, d); console.log(log.join('\n') || 'אין שינויים', '\nסה"כ', log.length);
// תיקונים ידניים אחרי ההרצה: כפילות "אביה" (= "אביה בן מעכה"), ושם מלך אשור שנחתך (#337 #338)
{
  const d2 = load(F); const mA = d2.data.find(x => x.name === 'מעכה בת אבישלום');
  if (mA) mA.children = mA.children.filter(c => c !== 'אביה');
  for (const [from, to] of [['פלאסר', 'תגלת פלאסר'], ['פלנאסר', 'תלגת פלנאסר']]) {
    const e = d2.data.find(x => x.name === from);
    if (e) { e.name = to; e.aliases = e.aliases || []; for (const a of [from, 'תגלת פלאסר', 'תלגת פלנאסר']) if (a !== to && !e.aliases.includes(a)) e.aliases.push(a); console.log('שם:', from, '→', to); }
  }
  save(F, d2);
}
