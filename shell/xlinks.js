// 6.8.0 — קישורים בתוך הכרטיס: כל שם של ערך אחר (עיר, אדם, חכם, כלי, בעל חיים, צמח) שמוזכר
// בטקסט של הכרטיס הופך לקישור שפותח את הכרטיס שלו.
//
// מאיפה השמות: אותן צורות שאינדקס ״היכן נזכר״ משתמש בהן (guides/_mentions/mentions-data.js, השדה f —
// צורה ← ערך אחד, נבנה ב-tools/build-mentions-index.js). כך מילים רגילות (״אבן״, ״הר״, ״בית״) ושמות
// דו-משמעיים אינם הופכים לקישור, ושם שנמצא בכמה מדריכים מוביל לפי סדר העדיפות (מקומות קודם).
// כל ערך מקושר פעם אחת בכרטיס (ההופעה הראשונה). הלחיצה — data-goto-cat/entry (shell/arachin.js).
// אין להפוך ל-type="module" — scope גלובלי משותף. נטען אחרי entry-detail.js ו-mentions.js.

const XLINK_SKIP = 'a,button,summary,h1,h2,h3,h4,input,textarea,select,script,style,.mentions-where,.linked-ctx,.ftree,.family-tree,.entry-edit,.leaflet-container,.xlink';
const XLINK_PFX1 = /^(ו|ה|וה|ד|וד|ל|ול|ב|וב|מ|ומ|כ|ש)/;
let xlinkMaxLen = 1;

function xlinkForms(){
  const d = (typeof mentionsData === 'function') ? mentionsData() : null;
  if (!d || !d.f) return null;
  if (!d.__xl){
    d.__xl = new Map();
    Object.entries(d.f).forEach(([f, id]) => { const e = d.ents[id]; if (e){ d.__xl.set(f, e); xlinkMaxLen = Math.max(xlinkMaxLen, f.split(' ').length); } });
  }
  return d.__xl;
}

function linkifyEntryNames(root, self, selfCat){
  if (!root || !document.createTreeWalker) return;
  const forms = xlinkForms();
  if (!forms){ if (typeof loadMentions === 'function') loadMentions().then(() => { if (xlinkForms()) linkifyEntryNames(root, self, selfCat); }).catch(() => null); return; }
  const selfNames = new Set([self && self.name].concat((self && self.aliases) || []).filter(Boolean).map(normalizeHeb));
  const done = new Set();
  root.querySelectorAll('.xlink').forEach(a => done.add(a.dataset.gotoCat + '|' + a.dataset.gotoEntry));
  const w = document.createTreeWalker(root, 4);
  const nodes = [];
  for (let n = w.nextNode(); n; n = w.nextNode()){
    const p = n.parentNode;
    if (!n.nodeValue || !/[א-ת]{3}/.test(n.nodeValue) || /[֑-ׇ]/.test(n.nodeValue)) continue;
    if (!p || (p.closest && p.closest(XLINK_SKIP))) continue;
    nodes.push(n);
  }
  nodes.forEach(n => {
    const s = n.nodeValue;
    const words = [];
    s.replace(/[א-ת][א-ת׳״'"]*[א-ת]|[א-ת]/g, (m, i) => { words.push({ t: m, i, n: normalizeHeb(m) }); return m; });
    const hits = [];
    for (let i = 0; i < words.length; i++){
      for (let L = Math.min(xlinkMaxLen, words.length - i); L >= 1; L--){
        // רצף מילים צמודות בלבד (רווח אחד ביניהן)
        let ok = true;
        for (let k = i; k < i + L - 1; k++) if (s.slice(words[k].i + words[k].t.length, words[k + 1].i) !== ' ') { ok = false; break; }
        if (!ok) continue;
        const phrase = words.slice(i, i + L).map(x => x.n).join(' ');
        let ent = forms.get(phrase), cut = 0;
        if (!ent){ const p = phrase.match(XLINK_PFX1); if (p && phrase.length - p[0].length >= 3){ ent = forms.get(phrase.slice(p[0].length)); cut = p[0].length; } }
        if (!ent) continue;
        const key = ent[0] + '|' + ent[1];
        if (done.has(key) || selfNames.has(normalizeHeb(ent[1])) && ent[0] === selfCat) { i += L - 1; break; }
        done.add(key);
        const start = words[i].i + (cut ? cutOffset(words[i].t, cut) : 0);
        const end = words[i + L - 1].i + words[i + L - 1].t.length;
        hits.push({ start, end, ent });
        i += L - 1; break;
      }
    }
    if (!hits.length) return;
    const frag = document.createDocumentFragment();
    let last = 0;
    hits.forEach(h => {
      if (h.start > last) frag.appendChild(document.createTextNode(s.slice(last, h.start)));
      const a = document.createElement('a');
      a.href = '#'; a.className = 'xlink';
      a.dataset.gotoCat = h.ent[0]; a.dataset.gotoEntry = h.ent[1];
      const cat = CATEGORIES.find(c => c.id === h.ent[0]);
      a.title = h.ent[1] + (cat ? ' — ' + cat.label : '');
      a.textContent = s.slice(h.start, h.end);
      frag.appendChild(a); last = h.end;
    });
    if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
    n.parentNode.replaceChild(frag, n);
  });
}
// מספר האותיות בתחילית המנורמלת → מספר התווים במחרוזת המקורית (גרש/גרשיים לא נספרים)
function cutOffset(word, letters){
  let c = 0, i = 0;
  while (i < word.length && c < letters){ if (/[א-ת]/.test(word[i])) c++; i++; }
  return i;
}

(function(){
  if (typeof wireEntryDetail !== 'function') return;
  const orig = wireEntryDetail;
  window.wireEntryDetail = wireEntryDetail = function(container, entry){
    const r = orig.apply(this, arguments);
    try {
      const catId = (typeof currentGuideCat !== 'undefined' && currentGuideCat && !currentGuideCat.virtual) ? currentGuideCat.id : null;
      linkifyEntryNames(container, entry, catId);
    } catch(_){}
    return r;
  };
})();
