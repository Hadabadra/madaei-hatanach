// 6.8.0 — עמוד מסכת לכל מסכת (כמו ערכין, בכורות, חולין וסוכה), במקום עמוד זיהוי.
//
// לא נבנה קובץ נתונים לכל מסכת: העמוד מורכב בזמן הפתיחה מאותם מקורות של השער ״כל המסכת״
// (מראי המקום שבשדות + אינדקס ״היכן נזכר״, shell/mentions.js), וכל פריט הוא ערך קישור
// (masechet + dafs + link), בדיוק כמו ערכי מדריך ערכין (shell/arachin.js). לכן:
//   * הכרטיס שנפתח הוא הכרטיס המלא של הערך במדריך שלו, ומעליו שורת ההקשר (מסכת ודפים);
//   * שורת ״דף״ בסינון ממיינת לפי הדפים, וצ׳יפי ההקשר הם המדריכים (״חכמי המסכת״ ראשון);
//   * החיפוש בראש העמוד מסנן בתוך העמוד בלבד.
// אין להפוך ל-type="module" — scope גלובלי משותף. נטען אחרי shas.js, mentions.js ו-arachin.js.

const MASECHET_CTX = [
  { id: 'chachamim', guide: 'amoraim', label: 'חכמי המסכת', blurb: 'התנאים והאמוראים שנזכרים במסכת, לפי הדפים.' },
  { id: 'ishim', guide: 'people', label: 'אישים מהתנ״ך', blurb: 'אישי התנ״ך שהסוגיות מזכירות.' },
  { id: 'makom', guide: 'places', label: 'מקומות', blurb: 'ערים, ארצות, הרים ונהרות שבמסכת.' },
  { id: 'chai', guide: 'animal', label: 'בעלי חיים', blurb: 'בהמות, חיות, עופות ושרצים שבמסכת.' },
  { id: 'tzomeach', guide: 'flora', label: 'צומח', blurb: 'אילנות, פירות, ירקות ותבואה שבמסכת.' },
  { id: 'kelim', guide: 'domem', label: 'כלים, מטבעות ומידות', blurb: 'כלים, בגדים, אבנים, מטבעות ומידות שבמסכת.' },
  { id: 'mikdash', guide: 'beithamikdash', label: 'בית המקדש', blurb: 'חלקי המקדש וכליו שבמסכת.' },
  { id: 'archeo', guide: 'archaeology', label: 'ארכיאולוגיה', blurb: 'ממצאים הקשורים למה שנזכר במסכת.' },
];

function masechetDafLabel(u){ return String(u || '').trim(); }

async function openMasechetPage(name){
  const hasBavli = typeof BAVLI_DAPIM !== 'undefined' && BAVLI_DAPIM.some(m => m.name === name);
  if (typeof ensureAllGuidesLoaded === 'function') await ensureAllGuidesLoaded();
  if (typeof loadMentions === 'function') { try { await loadMentions(); } catch(_){} }
  const matches = hasBavli ? entriesForBavliDaf(name, -1) : entriesForMishnaPerek(name, -1);
  const md = (typeof mentionsData === 'function') ? mentionsData() : null;
  const book = md && md.books && md.books[(hasBavli ? 'בבלי ' : 'משנה ') + name];
  const unitsOf = {};   // catId|name → יחידות (דף/פרק:משנה)
  if (book) Object.entries(book.e).forEach(([id, us]) => {
    const ent = md.ents[id]; if (ent) unitsOf[ent[0] + '|' + ent[1]] = us.map(i => book.u[i]);
  });
  const bookId = hasBavli ? name : 'משנה ' + name;
  const ownUnits = (entry) => {   // מראי מקום בשדות של הערך עצמו
    const out = [];
    (typeof studyRefPartsOf === 'function' ? studyRefPartsOf(entry) : []).forEach(p => {
      const r = parseMidrashRef(p); if (!r || r.bookId !== bookId) return;
      const n = studyRefNumber(r.ref, hasBavli ? 'דף ' : 'פרק ');
      if (n > 0) out.push(numToHeb(n) + (hasBavli ? (/ע"?ב|:/.test(r.ref) ? ':' : '.') : ''));
    });
    return out;
  };
  const data = [];
  const seen = new Set();
  matches.forEach(m => {
    const ctx = MASECHET_CTX.find(c => c.guide === m.catId);
    if (!ctx || !m.entry) return;
    const key = m.catId + '|' + m.entry.name;
    if (seen.has(key)) return; seen.add(key);
    let units = (unitsOf[key] || []).concat(ownUnits(m.entry)).map(masechetDafLabel).filter(Boolean);
    if (!hasBavli) units = units.map(u => u.split(':')[0]);
    units = [...new Set(units)].sort((a, b) => dafOrder(a) - dafOrder(b));
    const desc = m.entry.explanation || (m.entry.methods && m.entry.methods[0] && m.entry.methods[0].explanation) || m.entry.note || '';
    data.push({
      masechet: name, name: m.entry.name, aliases: m.entry.aliases || [], cat: ctx.id,
      daf: units[0] || '', dafs: units, link: { cat: m.catId, entry: m.entry.name },
      role: m.entry.role, dor: m.entry.dor,
      explanation: (units.length ? 'נזכר ב-' + units.length + (hasBavli ? (units.length === 1 ? ' עמוד (' + units[0] + ')' : ' עמודים') : (units.length === 1 ? ' פרק' : ' פרקים')) + ' · ' : '')
        + String(desc).slice(0, 160),
    });
  });
  const order = id => MASECHET_CTX.findIndex(c => c.id === id);
  data.sort((a, b) => order(a.cat) - order(b.cat) || b.dafs.length - a.dafs.length || a.name.localeCompare(b.name, 'he'));
  const used = new Set(data.map(e => e.cat));
  const cats = MASECHET_CTX.filter(c => used.has(c.id)).map((c, i) => ({ id: c.id, num: numToHeb(i + 1), label: c.label, blurb: c.blurb }));
  const cat = { id: 'masechet:' + name, label: 'מסכת ' + name, icon: '📜', noIdentify: true, virtual: true };
  dataCache[cat.id] = data;
  catsCache[cat.id] = cats;
  imagesCache[cat.id] = imagesCache[cat.id] || {};
  // תמונות המדריכים המקושרים (לרשת האריחים)
  MASECHET_CTX.forEach(c => {
    const tc = CATEGORIES.find(x => x.id === c.guide);
    if (tc && used.has(c.id)) loadGuideImages(tc).then(() => {
      if (currentGuideCat && currentGuideCat.id === cat.id && guideView.classList.contains('open') && guideViewMode === 'grid') renderGuideGrid(guideSearchBox.value);
    }).catch(() => null);
  });
  if (typeof closeTalmudView === 'function') closeTalmudView();
  return openGuide(cat, null);
}
