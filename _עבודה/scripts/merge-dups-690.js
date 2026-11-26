// 6.9.1 — איחוד ערכים כפולים במדריך בעלי החיים (#435 #436 #437).
// שימוש: node _עבודה/scripts/merge-dups-690.js
const fs = require('fs');
const FILE = 'guides/animal/data/animal-data.js';
const PAIRS = [ ['כודנייתא', 'פרד', ['כודניתא']], ['דבורים', 'דבורה', []], ['כעש', 'עש', []] ];
let s = fs.readFileSync(FILE, 'utf8');
function locate(name){
  const i = s.indexOf('{"name":' + JSON.stringify(name) + ',');
  if (i < 0) throw new Error('לא נמצא: ' + name);
  let d = 0, inStr = false, esc = false, j = i;
  for (; j < s.length; j++){
    const c = s[j];
    if (inStr){ if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true; else if (c === '{') d++; else if (c === '}'){ d--; if (!d) break; }
  }
  return { i, j: j + 1, obj: JSON.parse(s.slice(i, j + 1)) };
}
const key = x => x && (x.ref || x.source || x.label || JSON.stringify(x));
function mergeArr(a, b, skip){
  const out = (a || []).slice(), seen = new Set(out.map(key));
  (b || []).forEach(x => { if (skip && skip(x)) return; if (!seen.has(key(x))){ seen.add(key(x)); out.push(x); } });
  return out;
}
const report = [];
PAIRS.forEach(([from, into, extra]) => {
  const src = locate(from), dst = locate(into);
  const a = dst.obj, b = src.obj;
  a.aliases = [...new Set([...(a.aliases || []), from, ...(b.aliases || []), ...extra])].filter(x => x !== into);
  a.methods = mergeArr(a.methods, b.methods, m => m.confidence === 'לא אומת' && /פריט שנוסף|נוסף מתוך סריקת/.test(m.explanation || ''));
  ['verses', 'midrash', 'makorot'].forEach(k => { if (a[k] || b[k]) a[k] = mergeArr(a[k], b[k]); });
  if (!a.img && b.img){ a.img = b.img; if (b.credit) a.credit = b.credit; }
  if (b.gallery && b.gallery.length) a.gallery = [...new Set([...(a.gallery || []), ...b.gallery])];
  if (!a.note && b.note) a.note = b.note;
  // מחליפים את היעד, ואז מסירים את המקור (עם הפסיק שאחריו או לפניו)
  const first = dst.i < src.i ? [dst, src] : [src, dst];
  let out = s.slice(0, dst.i) + JSON.stringify(a) + s.slice(dst.j);
  s = out;
  const src2 = locate(from);
  let i = src2.i, j = src2.j;
  if (s[j] === ',') j++; else if (s[i - 1] === ',') i--;
  s = s.slice(0, i) + s.slice(j);
  report.push(from + ' → ' + into + ' (' + a.aliases.join(', ') + ')');
});
fs.writeFileSync(FILE, s);
console.log(report.join('\n'));
