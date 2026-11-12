#!/usr/bin/env node
// 6.2.0 — חכמי מסכת ערכין: סריקת בבלי ערכין (ספריית אוצריא) מול מדריך ״אנשים מהתלמוד״ (amoraim).
// במקום החיפוש הפשוט של arachin-scan-61.js — התאמה ארוכה ביותר לפי מילים, כדי ש״רב הונא״ לא ייספר גם כ״רב״,
// ופתיחת ראשי תיבות (ר׳, א״ר, ר״מ, ר״ש, רשב״ג, ב״ש/ב״ה). שמות דו-משמעיים מסוננים בכללים שבראש הקובץ.
//   node _עבודה/scripts/arachin-sages-scan-62.js "<…/אוצריא/תלמוד בבלי/סדר קדשים/ערכין.txt>" > _עבודה/arachin-sages.tsv
// פלט TSV: ערך, דף, הצורה שנמצאה, הקשר — ובסוף (stderr) סיכום ומה נדחה.
'use strict';
const fs = require('fs'), vm = require('vm');
const c = {}; vm.runInNewContext(fs.readFileSync('guides/amoraim/data/amoraim-data.js', 'utf8')
  .replace(/^(const|let) (DATA|CATS|CARD_IMAGES) =/mg, 'this.$2 =').replace(/^const /mg, 'var '), c);
const norm = s => String(s || '').replace(/[֑-ׇ]/g, '').replace(/<[^>]*>/g, ' ').replace(/\(.*?\)/g, ' ')
  .replace(/[׳']/g, '').replace(/[^א-ת" ]/g, ' ').replace(/\s+/g, ' ').trim();

// ---- כללי סינון ידני (נבחרו אחרי עיון בהקשרים) ----
// צורות שלא סופרים כלל: דו-משמעיות בלי הקשר (רבי סתם = רבי או קיצור שם שאינו במדריך), כינוי שגוי במדריך.
const BLOCK_FORMS = new Set(['רבן שמעון', 'נחמני', 'חנן', 'גמליאל']);
// צורות שסופרים רק כשהמילה הבאה / הקודמת היא פועל של מימרא (אמר, אומר, סבר…)
const VERB = new Set(['אמר', 'אומר', 'דאמר', 'ואמר', 'סבר', 'היא', 'הוא', 'מתני', 'תני', 'לטעמיה', 'אמרי', 'מחייב', 'פוטר', 'מתיר', 'אוסר']);
const SAY_BEFORE = new Set(['אמר', 'ואמר', 'דאמר', 'תני', 'ותני', 'כדאמר', 'כדתני', 'לדברי', 'כדברי', 'מחלוקת', 'אליבא', 'ליה', 'להו', 'דברי']);
const NEED_CTX = new Set(['רבי', 'רב', 'רבה', 'לוי', 'שמואל', 'אמי', 'חנין']);
// שמות שמופיעים בשני ערכים (למשל רבי יהודה בן בתירא בשני דורות) — לא מקשרים
const ABBR = { 'רמ': 'רבי מאיר', 'רש': 'רבי שמעון', 'רשבג': 'רבן שמעון בן גמליאל', 'רע': 'רבי עקיבא', 'ריבז': 'רבן יוחנן בן זכאי', 'בש': 'בית שמאי', 'בה': 'בית הלל',
  'רנ': 'רב נחמן', 'רל': 'ריש לקיש' };   // ר״א / ר״י / ר״ח — דו-משמעיים (אליעזר/אלעזר…), לא נפתחים

// ---- מפת שמות → ערך ----
const forms = new Map(), dup = new Set();
c.DATA.forEach(e => [e.name, ...(e.aliases || [])].forEach(n => {
  let f = norm(n).replace(/"/g, ''); if (!f) return;
  const vs = [f]; if (/^ר /.test(f)) vs.push(f.replace(/^ר /, 'רבי '));
  vs.forEach(v => { if (BLOCK_FORMS.has(v)) return; if (forms.has(v) && forms.get(v) !== e.name) dup.add(v); else forms.set(v, e.name); });
}));
dup.forEach(v => forms.delete(v));
const maxLen = Math.max(...[...forms.keys()].map(k => k.split(' ').length));

// ---- טקסט לפי דפים, מילים ----
let daf = ''; const pages = [];
fs.readFileSync(process.argv[2], 'utf8').split('\n').forEach(l => {
  const m = l.match(/<h2>דף ([^<]+)<\/h2>/); if (m) { daf = m[1].trim(); pages.push([daf, []]); return; }
  if (!pages.length) return;
  norm(l).split(' ').forEach(w => {
    if (!w) return;
    if (w.includes('"')) {
      const b = w.replace(/"/g, ''), pre = b.match(/^([ודכל]?)(.*)$/);
      if (b === 'אר' || b === 'דאר' || b === 'ואר') { if (b[0] !== 'א') pages.at(-1)[1].push(b[0]); pages.at(-1)[1].push('אמר', 'רבי'); return; }
      if (ABBR[pre[2]]) { ABBR[pre[2]].split(' ').forEach((x, i) => pages.at(-1)[1].push(i === 0 && pre[1] ? '§' + pre[1] + x : x)); return; }
      pages.at(-1)[1].push(b); return;
    }
    if (/^[ודכלמ]{0,3}ר$/.test(w)) { pages.at(-1)[1].push('רבי'); return; }   // ר׳ / דר׳ / וכדר׳ = רבי
    pages.at(-1)[1].push(w);
  });
});
const strip1 = w => w.replace(/^§[ודכל]/, '');
const out = [], rejected = {};
pages.forEach(([d, W]) => {
  for (let i = 0; i < W.length; i++) {
    let hit = null;
    for (let n = maxLen; n >= 1 && !hit; n--) {
      const seg = W.slice(i, i + n).map(strip1);
      if (seg.length < n) continue;
      const tries = [seg.join(' ')];
      // אות שימוש בראש המילה (ד/ו/כ/ל/מ/ש) — אבל לא ב׳ (״ברבי חנינא״ = בנו של רבי חנינא), ולא כשנשאר ״ר״ בלבד
      const p = seg[0].match(/^([ודלכמש]{1,3})(.+)$/); if (p && p[2] !== 'ר' && p[2] !== 'מר') tries.push([p[2], ...seg.slice(1)].join(' '));
      for (const t of tries) if (forms.has(t)) { hit = [t, n]; break; }
    }
    if (!hit) continue;
    const [f, n] = hit, prev = strip1(W[i - 1] || ''), next = strip1(W[i + n] || '');
    // שם חלקי: ״רב הונא בר…״ / ״רבי שמואל בר נחמני״ כשהשם המלא אינו במדריך — לא מייחסים לערך הקצר
    if (['בר', 'בן', 'בריה', 'ברבי', 'ברב', 'איש'].includes(next) || ['בן', 'בר', 'בריה', 'ברבי', 'חתניה', 'דמר', 'מר'].includes(prev)) { rejected['שם חלקי'] = (rejected['שם חלקי'] || 0) + 1; i += n - 1; continue; }
    // ״רבי״/״רב״ סתם — רק לפני פועל (״רבי אומר״, ״רב אמר״); אחרי ״אמר״ זה בדרך כלל שם שאינו במדריך
    const ctxOk = (f === 'רבי' || f === 'רב') ? VERB.has(next) : (VERB.has(next) || SAY_BEFORE.has(prev) || SAY_BEFORE.has(prev.replace(/^[ו]/, '')));
    if (NEED_CTX.has(f) && !ctxOk) { rejected[f] = (rejected[f] || 0) + 1; i += n - 1; continue; }
    out.push([forms.get(f), d, f, W.slice(Math.max(0, i - 4), i + n + 5).map(strip1).join(' ')]);
    i += n - 1;
  }
});
out.forEach(r => console.log(r.join('\t')));
const per = {}; out.forEach(([e, d]) => { (per[e] = per[e] || new Set()).add(d); });
console.error('מופעים: ' + out.length + ' · חכמים: ' + Object.keys(per).length + ' · זוגות חכם-דף: ' + Object.values(per).reduce((s, x) => s + x.size, 0));
console.error('שמות כפולים (לא מקושרים): ' + [...dup].join(', '));
console.error('נדחו בהקשר: ' + JSON.stringify(rejected));
