#!/usr/bin/env node
// 6.4.1 (16/11/2026) — הצעות עריכה #322–#325 (קשרי משפחה של מעכה בת תלמי, אבשלום, אביה בן מעכה). חוזר בלי כפילויות.
'use strict';
const { load, save } = require('./data-io.js');
const F = 'guides/people/data/people-data.js', d = load(F), log = [];
const by = n => d.data.find(x => x.name === n);
const add = (e, k, v) => { if (!e) return; e[k] = e[k] || []; if (!e[k].includes(v)) { e[k].push(v); log.push(`${e.name}.${k} + ${v}`); } };
const set = (e, k, v) => { if (e && e[k] !== v) { log.push(`${e.name}.${k}: ${e[k] || '—'} → ${v}`); e[k] = v; } };
const maacah = by('מעכה בת תלמי'), abs = by('אבשלום בן דוד'), aviya = by('אביה בן מעכה'), mA = by('מעכה בת אבישלום'), reh = by('רחבעם'), tamar = by('תמר');
// שמואל ב ג, ג: "אבשלום בן מעכה בת תלמי"; רש"י שמואל ב יג, א: תמר "שהיתה בת אמו"
add(maacah, 'children', 'אבשלום בן דוד'); set(abs, 'mother', 'מעכה בת תלמי');
const tamarIsDavids = tamar && (tamar.verses || []).some(v => /^שמואל ב יג/.test(v.ref));
if (tamarIsDavids) { add(maacah, 'children', 'תמר'); add(abs, 'siblings', 'תמר'); }
// דברי הימים ב יא, כ–כב: רחבעם לקח את מעכה בת אבשלום ותלד לו את אביה
set(aviya, 'father', 'רחבעם'); set(aviya, 'mother', 'מעכה בת אבישלום');
add(reh, 'children', 'אביה בן מעכה'); add(mA, 'children', 'אביה בן מעכה');
if (aviya && !(aviya.verses || []).some(v => v.ref === 'דברי הימים ב יא, כ')) { aviya.verses.push({ ref: 'דברי הימים ב יא, כ', text: 'ואחריה לקח את מעכה בת אבשלום ותלד לו את אביה ואת עתי ואת זיזא ואת שלמית' }); log.push('אביה + דה"ב יא, כ'); }
save(F, d); console.log(log.join('\n') || 'אין שינויים', '\nתמר של דוד?', !!tamarIsDavids);
