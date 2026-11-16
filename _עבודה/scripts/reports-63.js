#!/usr/bin/env node
// 6.3.0 (16/11/2026, סבב סיום) — דיווחים #317–#319 + לעזי רש"י בערכין שנוגעים למדריכים.
// מקורות אומתו מול ספריית אוצריא (Sivan22/otzaria-library). חוזר בלי כפילויות.
'use strict';
const { load, save } = require('./data-io.js');
const log = [];
// #317 מידבא — משנה מקואות ז, א (״והעידו אנשי מידבא משמו״)
const PF = 'guides/places/data/places.js', p = load(PF);
const md = p.data.find(e => e.name === 'מידבא');
if (md) { md.midrash = md.midrash || []; const ref = 'משנה, מקואות ז, א';
  if (!md.midrash.some(m => m.ref === ref)) { md.midrash.push({ ref, text: 'אמר רבי עקיבא, היה רבי ישמעאל דן כנגדי לומר, השלג אינו מעלה את המקוה. והעידו אנשי מידבא משמו שאמר להם, צאו והביאו שלג ועשו מקוה בתחלה' }); log.push('places: מידבא + מקואות ז, א'); } }
save(PF, p);
// לעז רש"י בערכין: חליל = קלמייל"ש (מתוך "גמרא נוחה" בספרייה, על המשנה "אין פוחתין משני חלילין")
const DF = 'guides/domem/data/domem-data.js', d = load(DF);
const ab = d.data.find(e => e.name === 'אבוב');
if (ab && !/קלמייל/.test(ab.note || '')) { ab.note = ((ab.note ? ab.note + ' ' : '') + 'לעז רש"י בערכין (על "אין פוחתין משני חלילין"): חליל = קלמייל"ש — לפי "גמרא נוחה" שבספריית אוצריא; הדף לא אומת.').trim(); log.push('domem: אבוב + לעז רש"י'); }
save(DF, d);
console.log(log.join('\n') || 'אין שינויים');
