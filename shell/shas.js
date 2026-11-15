// שלושת שערי הלימוד בעמוד הבית — תנ״ך · משנה · בבלי (מפרט 4.0, ב.1).
// אותו מודל בדיוק כמו "פרשת השבוע" (shell/parasha.js): פאנל בחירה, ואז זיהוי כל
// הערכים (משישת המדריכים) שיש להם מקור בתוך הטווח שנבחר.
// אין להפוך ל-type="module" — כל הקבצים חולקים scope גלובלי אחד.
// טוען אחרי parasha.js (ensureAllGuidesLoaded/parashaDataReady משם) ולפני talmud.js,
// שלוקח מכאן את רשימת 63 המסכתות.
//
// ⚠️ שלוש הטבלאות שלמטה נמשכו ממקור ואומתו מול מקור שני עצמאי (9.8.26) — לא נכתבו
// מהזיכרון, בדיוק כמו טבלת 54 הפרשות. מקור ראשון: Sefaria API (api/shape).
// מקור שני: מאגר hebcal-learning (bavli.json · mishnayot.json · tanakhNumChap.json).
// שני המקורות זהים ב-140 הערכים, פרט להבדלי תעתיק שנבדקו אחד-אחד.

// מספר הפרקים בכל ספר. השמות חייבים להיות בדיוק כמו ב-TANAKH_BOOKS (refs.js),
// כי ההתאמה נעשית מול המפתחות שמחזיר verseKeysOfRef (co-mentions.js).
// 39 שמות = כ״ד הספרים כשתרי-עשר, שמואל, מלכים ודברי-הימים נמנים לחוד, כפי
// שמראי המקום במדריכים כתובים בפועל ("שמואל א ה, ב").
const TANAKH_CHAPTERS = [
  { book:'בראשית',         part:'תורה',     chapters:50 },
  { book:'שמות',           part:'תורה',     chapters:40 },
  { book:'ויקרא',          part:'תורה',     chapters:27 },
  { book:'במדבר',          part:'תורה',     chapters:36 },
  { book:'דברים',          part:'תורה',     chapters:34 },
  { book:'יהושע',          part:'נביאים',   chapters:24 },
  { book:'שופטים',         part:'נביאים',   chapters:21 },
  { book:'שמואל א',        part:'נביאים',   chapters:31 },
  { book:'שמואל ב',        part:'נביאים',   chapters:24 },
  { book:'מלכים א',        part:'נביאים',   chapters:22 },
  { book:'מלכים ב',        part:'נביאים',   chapters:25 },
  { book:'ישעיהו',         part:'נביאים',   chapters:66 },
  { book:'ירמיהו',         part:'נביאים',   chapters:52 },
  { book:'יחזקאל',         part:'נביאים',   chapters:48 },
  { book:'הושע',           part:'נביאים',   chapters:14 },
  { book:'יואל',           part:'נביאים',   chapters:4 },
  { book:'עמוס',           part:'נביאים',   chapters:9 },
  { book:'עובדיה',         part:'נביאים',   chapters:1 },
  { book:'יונה',           part:'נביאים',   chapters:4 },
  { book:'מיכה',           part:'נביאים',   chapters:7 },
  { book:'נחום',           part:'נביאים',   chapters:3 },
  { book:'חבקוק',          part:'נביאים',   chapters:3 },
  { book:'צפניה',          part:'נביאים',   chapters:3 },
  { book:'חגי',            part:'נביאים',   chapters:2 },
  { book:'זכריה',          part:'נביאים',   chapters:14 },
  { book:'מלאכי',          part:'נביאים',   chapters:3 },
  { book:'תהלים',          part:'כתובים',   chapters:150 },
  { book:'משלי',           part:'כתובים',   chapters:31 },
  { book:'איוב',           part:'כתובים',   chapters:42 },
  { book:'שיר השירים',     part:'כתובים',   chapters:8 },
  { book:'רות',            part:'כתובים',   chapters:4 },
  { book:'איכה',           part:'כתובים',   chapters:5 },
  { book:'קהלת',           part:'כתובים',   chapters:12 },
  { book:'אסתר',           part:'כתובים',   chapters:10 },
  { book:'דניאל',          part:'כתובים',   chapters:12 },
  { book:'עזרא',           part:'כתובים',   chapters:10 },
  { book:'נחמיה',          part:'כתובים',   chapters:13 },
  { book:'דברי הימים א',   part:'כתובים',   chapters:29 },
  { book:'דברי הימים ב',   part:'כתובים',   chapters:36 },
];
const TANAKH_PART_ORDER = ['תורה','נביאים','כתובים'];

// מספר הפרקים בכל אחת מ-63 מסכתות המשנה, לפי סדר המשנה (שישה סדרים).
const MISHNA_MASECHTOT = [
  { name:'ברכות',        seder:'זרעים',    chapters:9 },
  { name:'פאה',          seder:'זרעים',    chapters:8 },
  { name:'דמאי',         seder:'זרעים',    chapters:7 },
  { name:'כלאים',        seder:'זרעים',    chapters:9 },
  { name:'שביעית',       seder:'זרעים',    chapters:10 },
  { name:'תרומות',       seder:'זרעים',    chapters:11 },
  { name:'מעשרות',       seder:'זרעים',    chapters:5 },
  { name:'מעשר שני',     seder:'זרעים',    chapters:5 },
  { name:'חלה',          seder:'זרעים',    chapters:4 },
  { name:'ערלה',         seder:'זרעים',    chapters:3 },
  { name:'ביכורים',      seder:'זרעים',    chapters:4 },
  { name:'שבת',          seder:'מועד',     chapters:24 },
  { name:'עירובין',      seder:'מועד',     chapters:10 },
  { name:'פסחים',        seder:'מועד',     chapters:10 },
  { name:'שקלים',        seder:'מועד',     chapters:8 },
  { name:'יומא',         seder:'מועד',     chapters:8 },
  { name:'סוכה',         seder:'מועד',     chapters:5 },
  { name:'ביצה',         seder:'מועד',     chapters:5 },
  { name:'ראש השנה',     seder:'מועד',     chapters:4 },
  { name:'תענית',        seder:'מועד',     chapters:4 },
  { name:'מגילה',        seder:'מועד',     chapters:4 },
  { name:'מועד קטן',     seder:'מועד',     chapters:3 },
  { name:'חגיגה',        seder:'מועד',     chapters:3 },
  { name:'יבמות',        seder:'נשים',     chapters:16 },
  { name:'כתובות',       seder:'נשים',     chapters:13 },
  { name:'נדרים',        seder:'נשים',     chapters:11 },
  { name:'נזיר',         seder:'נשים',     chapters:9 },
  { name:'סוטה',         seder:'נשים',     chapters:9 },
  { name:'גיטין',        seder:'נשים',     chapters:9 },
  { name:'קידושין',      seder:'נשים',     chapters:4 },
  { name:'בבא קמא',      seder:'נזיקין',   chapters:10 },
  { name:'בבא מציעא',    seder:'נזיקין',   chapters:10 },
  { name:'בבא בתרא',     seder:'נזיקין',   chapters:10 },
  { name:'סנהדרין',      seder:'נזיקין',   chapters:11 },
  { name:'מכות',         seder:'נזיקין',   chapters:3 },
  { name:'שבועות',       seder:'נזיקין',   chapters:8 },
  { name:'עדויות',       seder:'נזיקין',   chapters:8 },
  { name:'עבודה זרה',    seder:'נזיקין',   chapters:5 },
  { name:'אבות',         seder:'נזיקין',   chapters:6 },
  { name:'הוריות',       seder:'נזיקין',   chapters:3 },
  { name:'זבחים',        seder:'קדשים',    chapters:14 },
  { name:'מנחות',        seder:'קדשים',    chapters:13 },
  { name:'חולין',        seder:'קדשים',    chapters:12 },
  { name:'בכורות',       seder:'קדשים',    chapters:9 },
  { name:'ערכין',        seder:'קדשים',    chapters:9 },
  { name:'תמורה',        seder:'קדשים',    chapters:7 },
  { name:'כריתות',       seder:'קדשים',    chapters:6 },
  { name:'מעילה',        seder:'קדשים',    chapters:6 },
  { name:'תמיד',         seder:'קדשים',    chapters:7 },
  { name:'מידות',        seder:'קדשים',    chapters:5 },
  { name:'קנים',         seder:'קדשים',    chapters:3 },
  { name:'כלים',         seder:'טהרות',    chapters:30 },
  { name:'אהלות',        seder:'טהרות',    chapters:18 },
  { name:'נגעים',        seder:'טהרות',    chapters:14 },
  { name:'פרה',          seder:'טהרות',    chapters:12 },
  { name:'טהרות',        seder:'טהרות',    chapters:10 },
  { name:'מקואות',       seder:'טהרות',    chapters:10 },
  { name:'נידה',         seder:'טהרות',    chapters:10 },
  { name:'מכשירין',      seder:'טהרות',    chapters:6 },
  { name:'זבים',         seder:'טהרות',    chapters:5 },
  { name:'טבול יום',     seder:'טהרות',    chapters:4 },
  { name:'ידים',         seder:'טהרות',    chapters:4 },
  { name:'עוקצין',       seder:'טהרות',    chapters:3 },
];
const SEDER_ORDER = ['זרעים','מועד','נשים','נזיקין','קדשים','טהרות'];

// דפי הבבלי לפי דפוס וילנא. `to` = הדף האחרון, `lastAmud` = האם הוא נגמר בע״א או
// בע״ב, ו-`from` נרשם רק כשהמסכת אינה מתחילה בדף ב׳.
// 38 מסכתות — 37 מסכתות הבבלי, ועוד שקלים, שבדפוס וילנא נדפס עליה **הירושלמי**
// והיא נלמדת בדף היומי. מסכתות בלי גמרא (עדויות, אבות, מידות, קנים) אינן כאן.
// שתי חריגות אמיתיות, לא שגיאות הקלדה: תמיד מתחילה בדף כה ע״ב (לפניה קנים באותו
// כרך), ובבא מציעא נגמרת בקיט ע״א בעוד בבא קמא נגמרת בקיט ע״ב.
const BAVLI_DAPIM = [
  { name:'ברכות',        seder:'זרעים',    to:64, lastAmud:'א' },
  { name:'שבת',          seder:'מועד',     to:157, lastAmud:'ב' },
  { name:'עירובין',      seder:'מועד',     to:105, lastAmud:'א' },
  { name:'פסחים',        seder:'מועד',     to:121, lastAmud:'ב' },
  { name:'שקלים',        seder:'מועד',     to:22, lastAmud:'ב' },
  { name:'יומא',         seder:'מועד',     to:88, lastAmud:'א' },
  { name:'סוכה',         seder:'מועד',     to:56, lastAmud:'ב' },
  { name:'ביצה',         seder:'מועד',     to:40, lastAmud:'ב' },
  { name:'ראש השנה',     seder:'מועד',     to:35, lastAmud:'א' },
  { name:'תענית',        seder:'מועד',     to:31, lastAmud:'א' },
  { name:'מגילה',        seder:'מועד',     to:32, lastAmud:'א' },
  { name:'מועד קטן',     seder:'מועד',     to:29, lastAmud:'א' },
  { name:'חגיגה',        seder:'מועד',     to:27, lastAmud:'א' },
  { name:'יבמות',        seder:'נשים',     to:122, lastAmud:'ב' },
  { name:'כתובות',       seder:'נשים',     to:112, lastAmud:'ב' },
  { name:'נדרים',        seder:'נשים',     to:91, lastAmud:'ב' },
  { name:'נזיר',         seder:'נשים',     to:66, lastAmud:'ב' },
  { name:'סוטה',         seder:'נשים',     to:49, lastAmud:'ב' },
  { name:'גיטין',        seder:'נשים',     to:90, lastAmud:'ב' },
  { name:'קידושין',      seder:'נשים',     to:82, lastAmud:'ב' },
  { name:'בבא קמא',      seder:'נזיקין',   to:119, lastAmud:'ב' },
  { name:'בבא מציעא',    seder:'נזיקין',   to:119, lastAmud:'א' },
  { name:'בבא בתרא',     seder:'נזיקין',   to:176, lastAmud:'ב' },
  { name:'סנהדרין',      seder:'נזיקין',   to:113, lastAmud:'ב' },
  { name:'מכות',         seder:'נזיקין',   to:24, lastAmud:'ב' },
  { name:'שבועות',       seder:'נזיקין',   to:49, lastAmud:'ב' },
  { name:'עבודה זרה',    seder:'נזיקין',   to:76, lastAmud:'ב' },
  { name:'הוריות',       seder:'נזיקין',   to:14, lastAmud:'א' },
  { name:'זבחים',        seder:'קדשים',    to:120, lastAmud:'ב' },
  { name:'מנחות',        seder:'קדשים',    to:110, lastAmud:'א' },
  { name:'חולין',        seder:'קדשים',    to:142, lastAmud:'א' },
  { name:'בכורות',       seder:'קדשים',    to:61, lastAmud:'א' },
  { name:'ערכין',        seder:'קדשים',    to:34, lastAmud:'א' },
  { name:'תמורה',        seder:'קדשים',    to:34, lastAmud:'א' },
  { name:'כריתות',       seder:'קדשים',    to:28, lastAmud:'ב' },
  { name:'מעילה',        seder:'קדשים',    to:22, lastAmud:'א' },
  { name:'תמיד',         seder:'קדשים',    from:25, to:33, lastAmud:'ב' },
  { name:'נידה',         seder:'טהרות',    to:73, lastAmud:'א' },
];

// ---- התאמה: אילו ערכים נופלים בטווח שנבחר ----

// כל מראי המקום של רשומה, כשהם מפוצלים ל-";" — parseMidrashRef (refs.js) מסתכל
// רק על החלק הראשון, ובמאגרים יש שורות עם כמה מקורות באותו שדה.
function studyRefPartsOf(entry){
  const out = [];
  [].concat(entry.verses || [], entry.makorot || [], entry.midrash || []).forEach(v => {
    String((v && (v.ref || v.source)) || '').split(';').forEach(part => {
      const p = part.trim();
      if (p) out.push(p);
    });
  });
  return out;
}

// המספר שאחרי "פרק "/"דף " שמחזיר parseMidrashRef. אי אפשר להעביר את המחרוזת
// כולה ל-gematriaValue — היא סוכמת גם את אותיות המילה "פרק".
function studyRefNumber(ref, prefix){
  const s = String(ref || '');
  if (s.indexOf(prefix) !== 0) return 0;
  return gematriaValue(s.slice(prefix.length));
}

// אותו מבנה תוצאה כמו entriesForParasha, כדי ש-showResults יקבל בדיוק מה שהוא מכיר.
function studyEntriesMatching(hit){
  const out = [];
  CATEGORIES.forEach(cat => {
    (dataCache[cat.id] || []).forEach(entry => {
      if (hit(entry)) out.push({ catId: cat.id, catLabel: cat.label, catIcon: cat.icon, name: entry.name, term: entry.name, entry: entry });
    });
  });
  return out;
}

function entriesForTanakhChapter(book, chapter){
  const prefix = book + '|' + chapter + '|';
  return studyEntriesMatching(entry => (entry.verses || entry.makorot || []).some(v =>
    verseKeysOfRef(v && v.ref).some(k => k.indexOf(prefix) === 0)));
}

function entriesForMishnaPerek(masechet, perek){
  const bookId = 'משנה ' + masechet;
  return studyEntriesMatching(entry => studyRefPartsOf(entry).some(p => {
    const r = parseMidrashRef(p);
    return !!r && r.bookId === bookId && studyRefNumber(r.ref, 'פרק ') === perek;
  }));
}

function entriesForBavliDaf(masechet, daf){
  // 6.0.0 — ערכי מדריכי מסכת (masechet + daf, ר' shell/arachin.js) נכנסים לפי הדף שלהם
  // 6.2.0 — dafs: ערך אחד שנזכר בכמה דפים (חכמי המסכת)
  const dafOk = entry => (Array.isArray(entry.dafs) && entry.dafs.length ? entry.dafs : [entry.daf])
    .some(d => d && gematriaValue(String(d).replace(/[^א-ת]/g, '')) === daf);
  return studyEntriesMatching(entry => (entry.masechet === masechet && dafOk(entry)) || studyRefPartsOf(entry).some(p => {
    const r = parseMidrashRef(p);
    return !!r && r.bookId === masechet && studyRefNumber(r.ref, 'דף ') === daf;
  }));
}

// ---- שלושת השערים: הגדרה אחת לכל שער, ופאנל אחד משותף ----
// ירושלמי ייכנס כאן כערך רביעי (ב.1) — הקוד למטה גנרי ואינו צריך שינוי בשבילו.
const STUDY_GATES = {
  tanakh: {
    cardId: 'tanakhCard',
    title: '📖 תנ״ך — מה יש בפרק',
    hint: 'בחרו ספר ופרק כדי לראות את כל הערכים (אישים, מקומות, בע״ח, צומח, דומם ובית המקדש) שיש להם מקור בתוך הפרק.',
    labelA: 'בחרו ספר…',
    labelB: 'בחרו פרק…',
    groups: () => TANAKH_PART_ORDER.map(part => ({
      label: part,
      items: TANAKH_CHAPTERS.filter(b => b.part === part).map(b => b.book),
    })),
    unitsOf: name => {
      const b = TANAKH_CHAPTERS.find(x => x.book === name);
      if (!b) return [];
      const list = [];
      for (let i = 1; i <= b.chapters; i++) list.push({ value: i, label: 'פרק ' + numToHeb(i) });
      return list;
    },
    run: (name, unit) => ({ matches: entriesForTanakhChapter(name, unit), title: name + ' ' + numToHeb(unit),
      mapScope: (typeof chapterScopeForTanakh === 'function') ? chapterScopeForTanakh(name, unit) : null }),
  },
  mishna: {
    cardId: 'mishnaCard',
    title: '📕 משנה — מה יש בפרק',
    hint: 'בחרו מסכת ופרק במשנה כדי לראות את כל הערכים שיש להם מקור בתוך הפרק. '
      + 'כרגע נאסף תוכן משנה מתויג רק עבור מסכת בכורות (לטובת לומדי הדף היומי) — '
      + 'ואי״ה יורחב למסכתות נוספות. יש ברשותכם תיוג למסכת נוספת? מוזמנים להצטרף.',
    labelA: 'בחרו מסכת…',
    labelB: 'בחרו פרק…',
    groups: () => SEDER_ORDER.map(seder => ({
      label: 'סדר ' + seder,
      items: MISHNA_MASECHTOT.filter(m => m.seder === seder).map(m => m.name),
    })),
    unitsOf: name => {
      const m = MISHNA_MASECHTOT.find(x => x.name === name);
      if (!m) return [];
      const list = [];
      for (let i = 1; i <= m.chapters; i++) list.push({ value: i, label: 'פרק ' + numToHeb(i) });
      return list;
    },
    run: (name, unit) => ({ matches: entriesForMishnaPerek(name, unit), title: 'משנה ' + name + ', פרק ' + numToHeb(unit) }),
  },
  bavli: {
    cardId: 'bavliCard',
    title: '📚 בבלי — מה יש בדף',
    hint: 'בחרו מסכת ודף בתלמוד הבבלי כדי לראות את כל הערכים שיש להם מקור בתוך הדף. '
      + 'כרגע נאסף תוכן בבלי מתויג רק עבור מסכת בכורות (לטובת לומדי הדף היומי) — '
      + 'ואי״ה יורחב למסכתות נוספות. יש ברשותכם תיוג למסכת נוספת? מוזמנים להצטרף.',
    labelA: 'בחרו מסכת…',
    labelB: 'בחרו דף…',
    groups: () => SEDER_ORDER.map(seder => ({
      label: 'סדר ' + seder,
      items: BAVLI_DAPIM.filter(m => m.seder === seder).map(m => m.name),
    })),
    unitsOf: name => {
      const m = BAVLI_DAPIM.find(x => x.name === name);
      if (!m) return [];
      const list = [];
      for (let i = (m.from || 2); i <= m.to; i++){
        const onlyA = (i === m.to && m.lastAmud === 'א');
        list.push({ value: i, label: 'דף ' + numToHeb(i) + (onlyA ? ' (ע״א)' : '') });
      }
      return list;
    },
    run: (name, unit) => ({ matches: entriesForBavliDaf(name, unit), title: name + ' דף ' + numToHeb(unit) }),
  },
};

const studyPanelOverlay = document.getElementById('studyPanelOverlay');
const studyPanelTitle = document.getElementById('studyPanelTitle');
const studyPanelHint = document.getElementById('studyPanelHint');
const studySelectA = document.getElementById('studySelectA');
const studySelectB = document.getElementById('studySelectB');
const studyGoBtn = document.getElementById('studyGoBtn');
const studyPanelClose = document.getElementById('studyPanelClose');
let studyActiveGate = null;

function studyFillSelectB(gate, name){
  const units = name ? gate.unitsOf(name) : [];
  studySelectB.innerHTML = `<option value="" selected disabled>${esc(gate.labelB)}</option>` +
    units.map(u => `<option value="${u.value}">${esc(u.label)}</option>`).join('');
  studySelectB.disabled = !units.length;
}

function openStudyGate(key){
  const gate = STUDY_GATES[key];
  studyActiveGate = gate;
  studyPanelTitle.textContent = gate.title;
  studyPanelHint.textContent = gate.hint;
  studySelectA.innerHTML = `<option value="" selected disabled>${esc(gate.labelA)}</option>` +
    gate.groups().map(g => `<optgroup label="${esc(g.label)}">` +
      g.items.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('') + '</optgroup>').join('');
  studyFillSelectB(gate, null);
  studyPanelOverlay.classList.add('open');
}

async function runStudyGate(){
  const gate = studyActiveGate;
  const name = studySelectA.value, unit = parseInt(studySelectB.value, 10);
  if (!gate || !name || !unit) return;
  studyPanelOverlay.classList.remove('open');
  let label = null;
  if (studyGoBtn){ studyGoBtn.disabled = true; label = studyGoBtn.textContent; studyGoBtn.textContent = '…'; }
  try {
    if (!parashaDataReady()) await ensureAllGuidesLoaded();
    const res = gate.run(name, unit);
    showResults(res.matches, res.title, res.mapScope);
  } finally {
    if (studyGoBtn){ studyGoBtn.disabled = false; studyGoBtn.textContent = label; }
  }
}

Object.keys(STUDY_GATES).forEach(key => {
  const card = document.getElementById(STUDY_GATES[key].cardId);
  if (card) card.addEventListener('click', () => openStudyGate(key));
});
if (studySelectA) studySelectA.addEventListener('change', () => studyFillSelectB(studyActiveGate, studySelectA.value));
if (studyGoBtn) studyGoBtn.addEventListener('click', runStudyGate);
if (studyPanelClose) studyPanelClose.addEventListener('click', () => studyPanelOverlay.classList.remove('open'));

// ============================================================
//  בורר הספר (3.1.0, סעיף 2)
//  עד 3.0.2 היו בעמוד השער ארבעה כרטיסים נפרדים — תנ״ך · משנה · בבלי ·
//  פרשת השבוע — בשתי שורות. הם אוחדו לכרטיס אחד שפותח את הבורר הזה, והבורר
//  רק *מנתב* לפאנל שכבר קיים: שלושת השערים ל-openStudyGate (אותו
//  studyPanelOverlay), והפרשה ל-parashaPanelOverlay (shell/parasha.js).
//  שום לוגיקת לימוד לא שוכפלה כאן — זו שכבת ניווט בלבד.
// ============================================================
const bookChooserOverlay = document.getElementById('bookChooserOverlay');
const bookChooserCard = document.getElementById('bookChooserCard');

function openBookChooser(){
  if (bookChooserOverlay) bookChooserOverlay.classList.add('open');
  // המצב נבדק בכל פתיחה, לא פעם אחת בטעינה — המשתמש מחליף ספרים בקורא
  if (typeof refreshOpenPageRow === 'function') refreshOpenPageRow();
}
function closeBookChooser(){
  if (bookChooserOverlay) bookChooserOverlay.classList.remove('open');
}

if (bookChooserCard) bookChooserCard.addEventListener('click', openBookChooser);
const bookChooserCloseBtn = document.getElementById('bookChooserClose');
if (bookChooserCloseBtn) bookChooserCloseBtn.addEventListener('click', closeBookChooser);

if (bookChooserOverlay) bookChooserOverlay.addEventListener('click', (ev) => {
  const btn = ev.target.closest('.book-choice');
  if (!btn) return;
  const gate = btn.dataset.gate;
  closeBookChooser();   // תמיד לסגור קודם, אחרת שני panel-overlay פתוחים זה על זה
  if (gate === 'parasha'){
    // parasha.js מחזיק את הפאנל שלו; כאן רק פותחים אותו, בדיוק כמו שהכרטיס
    // הישן #parashaCard עשה (הכרטיס עצמו כבר לא קיים ב-index.html).
    const po = document.getElementById('parashaPanelOverlay');
    if (po) po.classList.add('open');
    return;
  }
  if (STUDY_GATES[gate]) openStudyGate(gate);
});

// ============================================================
//  ספר אקראי מכל ספריית אוצריא (3.1.0, סעיף 3)
//  ⚠️ אומת מול API_REFERENCE.md הרשמי (Otzaria/otzaria, ענף dev) לפני מימוש,
//  ולא נוחש — זו הייתה דרישה מפורשת אחרי תקלת app.open_url/app.openUrl:
//    • library.getTree  — הרשאה library.books.read, קיים מ-0.9.93.
//      פרמטרים: { path?, includeBooks? }. מחזיר { success, data } כאשר data =
//      { title, path, categories: [...], books: [...] }, וכל קטגוריה מכילה
//      categories[] ו-books[] משלה. ספר = { bookId, title, type, author, topics }.
//    • reader.openBook — הרשאה reader.open (כבר מוצהרת), { bookId, type }.
//  שתי הגרסאות (0.9.96 ו-0.9.97) תומכות, ולכן זה נכנס לחבילת הבסיס ולא רק
//  לווריאנט — בשונה מ-feedback.report שהוא 0.9.97 בלבד.
// ============================================================
// ב-3.1.2 עבר מכרטיס בעמוד השער לשורה בתוך בורר הספר (#bookChooserOverlay).
const randomBookCard = document.getElementById('randomBookRow');

// עץ הספרייה נקרא פעם אחת לכל פתיחת התוסף ונשמר בזיכרון: הוא גדול, ואין טעם
// למשוך אותו מחדש בכל לחיצה. אין כאן storage בכוונה — הספרייה של המשתמש
// משתנה (הורדת ספרים חדשים), וקאש על הדיסק היה מתיישן בשקט.
let libraryBooksCache = null;

// נתיב הקטגוריה נשמר יחד עם כל ספר, ולא נזרק: בספרייה יש שמות זהים בכמה
// מקומות ("עירובין" קיים בבבלי, בירושלמי ובמשנה), ובלי הנתיב אי אפשר להבחין
// ביניהם ברשימה. הנתיב גם נכנס לחיפוש, כך ש"בבלי עירובין" מוצא את הנכון.
function flattenLibraryBooks(node, out, path){
  if (!node) return out;
  const here = node.title ? (path ? path + ' › ' + node.title : node.title) : (path || '');
  if (Array.isArray(node.books)){
    for (const b of node.books){
      if (b && b.bookId && b.title){
        out.push({ bookId: b.bookId, title: b.title, type: b.type || 'text', path: here });
      }
    }
  }
  if (Array.isArray(node.categories)){
    for (const c of node.categories) flattenLibraryBooks(c, out, here);
  }
  return out;
}

async function loadLibraryBooks(){
  if (libraryBooksCache) return libraryBooksCache;
  const res = await Otzaria.call('library.getTree', { includeBooks: true });
  // אותה זהירות כמו ב-app.getInfo (ר' CLAUDE.md): לא להניח עטיפת .data.
  const data = (res && (res.data !== undefined ? res.data : res)) || null;
  const list = flattenLibraryBooks(data, [], '');
  if (list.length) libraryBooksCache = list;
  return list;
}

async function openRandomBook(){
  if (!hasOtzaria()){
    window.alert('פתיחת ספר אקראי דורשת הרצה בתוך אוצריא — כאן אין ספרייה לשלוף ממנה.');
    return;
  }
  const card = randomBookCard;
  const label = card && card.querySelector('.bc-label');
  const orig = label ? label.textContent : null;
  if (label) label.textContent = 'טוען…';
  try {
    const books = await loadLibraryBooks();
    if (!books.length){
      await Otzaria.call('ui.showError', { message: 'לא נמצאו ספרים בספרייה.' }).catch(()=>{});
      return;
    }
    const pick = books[Math.floor(Math.random() * books.length)];
    const ok = await Otzaria.call('reader.openBook', { bookId: pick.bookId, type: pick.type });
    const opened = (ok && (ok.data !== undefined ? ok.data : ok));
    if (opened === false) throw new Error('reader.openBook החזיר false');
    await Otzaria.call('notifications.showInApp', { message: 'נפתח: ' + pick.title, type: 'success' }).catch(()=>{});
    closeBookChooser();   // רק בהצלחה — בכישלון הבורר נשאר פתוח כדי לבחור אחרת
  } catch(e){
    await Otzaria.call('ui.showError', {
      message: 'לא הצלחנו לפתוח ספר אקראי. ' + ((e && e.message) || '')
    }).catch(() => window.alert('לא הצלחנו לפתוח ספר אקראי.'));
  } finally {
    if (label && orig != null) label.textContent = orig;
  }
}

if (randomBookCard) randomBookCard.addEventListener('click', openRandomBook);

// ============================================================
//  זיהוי בכל ספר מהספרייה (3.1.3)
//  ⚠️ הבדל מהותי משלושת השערים שמעליו: הם מסתמכים על מראי מקום שתויגו מראש
//  בדאטה שלנו (entry.verses / entry.makorot), ולכן מוגבלים למה שתייגנו.
//  כאן נשלף הטקסט עצמו מהספר ומורץ עליו מנוע הזיהוי החי — אותו מנוע של
//  תפריט ההקשר ושורת החיפוש — ולכן זה עובד על *כל* ספר שמותקן אצל המשתמש.
//
//  APIs (מול API_REFERENCE.md הרשמי):
//    • library.getTree        — library.books.read,   0.9.93  (רשימת הספרים)
//    • library.getBookToc     — library.content.read, 0.9.93  (מבנה/קטעים)
//    • library.getBookContent — library.content.read, 0.9.93  (הטקסט עצמו)
//  ⚠️ מבנה התשובה של getBookToc אינו מאומת מול מכשיר — הקוד מקבל כמה צורות
//  סבירות ונופל ל"תחילת הספר" אם לא זוהתה אף אחת מהן.
// ============================================================
const libraryBookOverlay = document.getElementById('libraryBookOverlay');
const libBookSearch = document.getElementById('libBookSearch');
const libBookResults = document.getElementById('libBookResults');
const libSectionWrap = document.getElementById('libSectionWrap');
const libSectionSelect = document.getElementById('libSectionSelect');
const libChosenBook = document.getElementById('libChosenBook');
const libBookStatus = document.getElementById('libBookStatus');
const libBookGoBtn = document.getElementById('libBookGoBtn');
let libPickedBook = null;

const LIB_CHUNK = 12000;   // תווים לקטע — מספיק לפרק/דף, ולא מציף את הזיהוי

function libStatus(msg){ if (libBookStatus) libBookStatus.textContent = msg || ''; }
function unwrapOtz(res){ return (res && (res.data !== undefined ? res.data : res)); }

async function openLibraryBookPicker(){
  if (!hasOtzaria()){
    window.alert('זיהוי בספר מהספרייה דורש הרצה בתוך אוצריא.');
    return;
  }
  closeBookChooser();
  libPickedBook = null;
  if (libBookSearch) libBookSearch.value = '';
  if (libBookResults) libBookResults.innerHTML = '';
  if (libSectionWrap) libSectionWrap.style.display = 'none';
  if (libBookGoBtn) libBookGoBtn.disabled = true;
  libraryBookOverlay.classList.add('open');
  libStatus('טוען את רשימת הספרים…');
  try {
    const books = await loadLibraryBooks();
    libStatus(books.length ? ('בספרייה שלכם ' + books.length + ' ספרים. הקלידו כדי לסנן.') : 'לא נמצאו ספרים.');
    renderLibBookList('');
  } catch(e){
    libStatus('לא הצלחנו לטעון את רשימת הספרים.');
  }
  if (libBookSearch) libBookSearch.focus();
}

function renderLibBookList(q){
  if (!libBookResults || !libraryBooksCache) return;
  const norm = normalizeHeb(q || '');
  // החיפוש רץ על הכותרת *ועל נתיב הקטגוריה*, כך ש"בבלי עירובין" או
  // "ירושלמי עירובין" מגיעים ישירות לספר הנכון מבין השמות הזהים.
  const hits = (norm.length < 1 ? libraryBooksCache
    : libraryBooksCache.filter(b =>
        normalizeHeb(b.title).indexOf(norm) !== -1 ||
        normalizeHeb((b.path || '') + ' ' + b.title).indexOf(norm) !== -1)).slice(0, 40);
  if (!hits.length){ libBookResults.innerHTML = '<div class="mini-note">לא נמצא ספר בשם הזה.</div>'; return; }
  libBookResults.innerHTML = hits.map((b, i) =>
    '<div class="lib-row" data-i="' + i + '">' +
      '<span class="lib-title">' + esc(b.title) + '</span>' +
      (b.path ? '<span class="lib-path">' + esc(b.path) + '</span>' : '') +
    '</div>').join('');
  libBookResults.querySelectorAll('.lib-row').forEach(row => {
    row.addEventListener('click', () => pickLibBook(hits[parseInt(row.dataset.i, 10)]));
  });
}

async function pickLibBook(book){
  if (!book) return;
  libPickedBook = book;
  libBookResults.innerHTML = '';
  if (libBookSearch) libBookSearch.value = book.title;
  libChosenBook.textContent = book.title + (book.path ? '  —  ' + book.path : '');
  libSectionWrap.style.display = '';
  libSectionSelect.innerHTML = '<option value="0">תחילת הספר</option>';
  libBookGoBtn.disabled = false;
  libStatus('טוען את מבנה הספר…');
  try {
    // ⚠️ אומת מול API_REFERENCE.md (30/08): getBookToc מקבל **רק bookId** —
    // העברת `type` נוסף היא מה שהפיל את הקריאה, ולכן רשימת הקטעים יצאה ריקה
    // וכל ספר הראה "תחילת הספר" בלבד. התשובה היא **מערך שטוח**
    // [{ text, index, level }] — בלי children/sections, ולכן אין מה לרקורס:
    // ההיררכיה מיוצגת ב-level (1 = עליון), ומשמשת כאן רק להזחה חזותית.
    // ה-index הוא אינדקס שורה 0-based, והוא בדיוק ה-offset של getBookContent.
    const toc = unwrapOtz(await Otzaria.call('library.getBookToc', { bookId: book.bookId }));
    const nodes = Array.isArray(toc) ? toc : (toc && (toc.toc || toc.sections)) || [];
    const flat = [];
    for (const n of nodes){
      if (!n) continue;
      const label = n.text || n.title || n.name;
      const idx = Number(n.index);
      if (label && Number.isFinite(idx)){
        const depth = Math.max(0, (Number(n.level) || 1) - 1);
        flat.push({ label: '　'.repeat(depth) + label, index: idx });
      }
    }
    if (flat.length){
      libSectionSelect.innerHTML = flat.slice(0, 500)
        .map(s => '<option value="' + s.index + '">' + esc(s.label) + '</option>').join('');
      libStatus('בחרו קטע מתוך ' + flat.length + ' קטעים.');
    } else {
      libStatus('לא נמצא מבנה פרקים לספר זה — נזהה מתחילתו.');
    }
  } catch(e){
    libStatus('לא נמצא מבנה פרקים לספר זה — נזהה מתחילתו.');
  }
}

async function runLibraryIdentify(){
  if (!libPickedBook) return;
  const offset = parseInt(libSectionSelect.value, 10) || 0;
  libBookGoBtn.disabled = true;
  const orig = libBookGoBtn.textContent;
  libBookGoBtn.textContent = '…';
  libStatus('שולף את הטקסט ומזהה…');
  try {
    const res = unwrapOtz(await Otzaria.call('library.getBookContent', {
      bookId: libPickedBook.bookId, offset: offset, limit: LIB_CHUNK
    }));
    // התשובה עשויה להיות מחרוזת, מערך קטעים, או אובייקט עם text/content
    let text = '';
    if (typeof res === 'string') text = res;
    else if (Array.isArray(res)) text = res.map(x => (typeof x === 'string' ? x : ((x && (x.text || x.content)) || ''))).join('\n');
    else if (res) text = res.text || res.content || '';
    text = String(text || '').replace(/<[^>]*>/g, ' ');   // הטקסט מגיע לעתים כ-HTML
    if (!text.trim()){
      libStatus('לא הצלחנו לשלוף טקסט מהקטע הזה.');
      return;
    }
    if (!parashaDataReady()) await ensureAllGuidesLoaded();
    const matches = await identifyWithLiveContext(text.slice(0, LIB_CHUNK), { includePossible: true, source: { book: libPickedBook && libPickedBook.title } });
    libraryBookOverlay.classList.remove('open');
    const secLabel = libSectionSelect.selectedOptions[0] ? libSectionSelect.selectedOptions[0].textContent.trim() : '';
    showResults(matches, libPickedBook.title + (secLabel && secLabel !== 'תחילת הספר' ? ' — ' + secLabel : '') + (libPickedBook.path ? '  (' + libPickedBook.path + ')' : ''));
  } catch(e){
    libStatus('הזיהוי נכשל. ' + ((e && e.message) || ''));
  } finally {
    libBookGoBtn.disabled = false;
    libBookGoBtn.textContent = orig;
  }
}

const libraryBookRow = document.getElementById('libraryBookRow');
if (libraryBookRow) libraryBookRow.addEventListener('click', openLibraryBookPicker);
if (libBookSearch){
  let libTimer = null;
  libBookSearch.addEventListener('input', () => {
    clearTimeout(libTimer);
    libTimer = setTimeout(() => renderLibBookList(libBookSearch.value.trim()), 140);
  });
}
if (libBookGoBtn) libBookGoBtn.addEventListener('click', runLibraryIdentify);
const libBookCloseBtn = document.getElementById('libBookClose');
if (libBookCloseBtn) libBookCloseBtn.addEventListener('click', () => libraryBookOverlay.classList.remove('open'));


// ============================================================
//  זיהוי הדף הפתוח בקורא (3.2.0)
//  כפתור הסרגל (toolbarItems, וריאנט 0.9.97) מוגדר openPlugin:true — כלומר
//  כל תפקידו לפתוח את לשונית התוסף, והוא אינו מזהה כלום. מי שכן מזהה הוא
//  פריט תפריט ההקשר, אבל הוא דורש **סימון** טקסט מראש.
//  כאן נסגר הפער: שולפים מהקורא מה פתוח כרגע (reader.getCurrentState),
//  מושכים את הטקסט של אותו מקום (library.getBookContent) ומריצים עליו את
//  אותו מנוע זיהוי — בלי שהמשתמש יסמן דבר.
//
//  ⚠️ לא רץ אוטומטית בכל פתיחה של התוסף בכוונה: פתיחת הלשונית אינה בהכרח
//  בקשה לזהות, והרצה אוטומטית הייתה קופצת עם חלון תוצאות על כל כניסה.
//  הכניסה היא כפתור מפורש, שמופיע רק כשבאמת פתוח ספר בקורא.
// ============================================================
const openPageRow = document.getElementById('openPageRow');
const openPageLabel = document.getElementById('openPageLabel');

// מחזיר { bookId, type, index, title } של מה שפתוח בקורא, או null.
async function currentReaderBook(){
  if (!hasOtzaria()) return null;
  try {
    const st = unwrapOtz(await Otzaria.call('reader.getCurrentState', {}));
    if (!st) return null;
    // ⚠️ המבנה אומת מול API_REFERENCE.md (28/08): הספר **הפעיל** יושב בשדות
    // current* ב**שורש** האובייקט, ו-openTabs הוא רשימת כל הטאבים **בלי שום
    // סימון של הפעיל**. גרסה קודמת חיפשה isActive/active בתוך openTabs, לא
    // מצאה, ונפלה ל-openTabs[0] — כלומר זיהתה את הטאב הראשון ולא את הפתוח.
    // הנפילה ל-openTabs[0] נשארת רק למקרה שאין current* בכלל.
    let bookId = st.currentBookId || st.currentBook;
    let id = st.currentId;
    let type = st.currentType || 'text';
    let index = Number(st.currentIndex) || 0;

    if (!bookId && !Number.isInteger(id)){
      const tabs = Array.isArray(st) ? st : (st.openTabs || st.tabs);
      const t = Array.isArray(tabs) && tabs.length ? tabs[0] : null;
      if (!t) return null;
      bookId = t.bookId || t.book;
      id = t.id;
      type = t.type || 'text';
      index = Number(t.index) || 0;
    }
    if (!bookId && !Number.isInteger(id)) return null;
    return {
      bookId: bookId ? String(bookId) : null,
      id: Number.isInteger(id) ? id : null,
      type: type,
      index: index,
      title: String(st.currentRef || bookId || 'הספר הפתוח')
    };
  } catch(e){ return null; }
}

// מציג/מסתיר את הכפתור לפי מה שפתוח כרגע. נקרא בפתיחת בורר הספר, כדי
// שהמצב יהיה עדכני ולא משוחזר מרגע הטעינה.
async function refreshOpenPageRow(){
  if (!openPageRow) return;
  const cur = await currentReaderBook();
  if (!cur){ openPageRow.hidden = true; return; }
  openPageRow.hidden = false;
  openPageRow.dataset.bookId = cur.bookId || '';
  openPageRow.dataset.id = (cur.id != null ? String(cur.id) : '');
  openPageRow.dataset.type = cur.type;
  openPageRow.dataset.index = String(cur.index);
  openPageRow.dataset.title = cur.title;
  if (openPageLabel) openPageLabel.textContent = 'זהה את מה שפתוח בקורא — ' + cur.title;
}

// מזהה את הטקסט שבמיקום נתון בקורא. משותף לשורת "זהה את מה שפתוח" שבבורר
// הספר, ולכפתור "עינים למקרא" שבסרגל הקורא (3.7.1, #42/#52) — שעד עכשיו רק
// העביר ללשונית בלי לזהות דבר, כי אף אחד לא האזין ל-reader.toolbar_item_clicked.
// loc: { bookId, id, type, index, title }
async function identifyReaderLocation(loc){
  if (!loc || (!loc.bookId && loc.id == null)) return false;
  const index = Number(loc.index) || 0;
  const title = loc.title || loc.bookId || 'הספר הפתוח';
  if (loc.type && loc.type !== 'text'){
    if (loc.quiet) return false;
    // ספר PDF: library.getBookContent מחזיר טקסט רק לספרי טקסט.
    await Otzaria.call('ui.showError', {
      message: 'זיהוי הדף הפתוח זמין כרגע רק בספרי טקסט. בספר PDF אפשר לסמן מילה וללחוץ לחיצה ימנית ← ״זיהוי בעינים למקרא״.'
    }).catch(()=>{});
    return false;
  }
  // רק הפרמטרים המתועדים — type/id אינם בחתימה של getBookContent
  const res = unwrapOtz(await Otzaria.call('library.getBookContent', {
    bookId: loc.bookId, offset: index, limit: LIB_CHUNK
  }));
  let text = '';
  if (typeof res === 'string') text = res;
  else if (Array.isArray(res)) text = res.map(x => (typeof x === 'string' ? x : ((x && (x.text || x.content)) || ''))).join('\n');
  else if (res) text = res.text || res.content || '';
  text = String(text || '').replace(/<[^>]*>/g, ' ');
  if (!text.trim()){
    if (loc.quiet) return false;
    await Otzaria.call('ui.showError', { message: 'לא הצלחנו לקרוא את הטקסט שפתוח בקורא.' }).catch(()=>{});
    return false;
  }
  if (!parashaDataReady()) await ensureAllGuidesLoaded();
  const matches = await identifyWithLiveContext(text.slice(0, LIB_CHUNK), { includePossible: true, source: { book: loc.title || '' } });
  // 6.0.0 — דף גמרא פתוח: גם הערכים שמראה המקום שלהם הוא הדף (shell/arachin.js)
  if (typeof dafMatchesForTitle === 'function') dafMatchesForTitle(loc.title || '').forEach(m => {
    if (!matches.some(x => x.catId === m.catId && x.name === m.name)) matches.unshift(m);
  });
  // 4.5.0 — הדגשות ומונה הסרגל רק לזיהויים הגלויים (ודאי/סביר), לא ל״אפשרי״ המקופל
  const shown = matches.filter(m => m.confidence !== 'אפשרי');
  closeBookChooser();
  if (!loc.quiet || shown.length) showResults(matches, title);
  if (shown.length) highlightMatchesInSection(loc.bookId, index, shown.filter(m => !m.byDaf));   // 4.2.0
  if (typeof updateToolbarCount === 'function') updateToolbarCount(shown.length);   // 4.4.0
  return true;
}

async function identifyOpenPage(){
  const bookId = openPageRow && openPageRow.dataset.bookId;
  const numId = openPageRow && openPageRow.dataset.id;
  if (!bookId && !numId) return;
  const label = openPageLabel ? openPageLabel.textContent : null;
  if (openPageLabel) openPageLabel.textContent = 'מזהה…';
  try {
    await identifyReaderLocation({
      bookId: bookId,
      id: numId ? Number(numId) : null,
      type: openPageRow.dataset.type || 'text',
      index: parseInt(openPageRow.dataset.index, 10) || 0,
      title: openPageRow.dataset.title || bookId
    });
  } catch(e){
    await Otzaria.call('ui.showError', {
      message: 'הזיהוי נכשל. ' + ((e && e.message) || '')
    }).catch(() => window.alert('הזיהוי נכשל.'));
  } finally {
    if (openPageLabel && label) openPageLabel.textContent = label;
  }
}

// לחיצה על כפתור הסרגל: ה-payload כבר נושא את הספר והמיקום (API_REFERENCE
// §reader.toolbar_item_clicked), כך שלא צריך קריאה נוספת. אם השדות חסרים —
// נופלים ל-reader.getCurrentState.
async function handleToolbarOpenClick(payload){
  try {
    // 4.2.0 — אם יש טקסט מסומן בקורא, הכפתור מזהה אותו (כמו הלחיצה הימנית);
    // רק בלי סימון הוא מזהה את כל הדף. reader.getSelection מחזיר null בלי בחירה.
    try {
      const sel = unwrapOtz(await Otzaria.call('reader.getSelection'));
      const st = sel && String(sel.text || sel.renderedSelectedText || '').trim();
      if (st){
        const m = await identifyWithLiveContext(st, { includePossible: true });
        if (m.some(x => x.confidence !== 'אפשרי')) highlightIdentifiedSelection({ selection: sel, currentBookId: sel.bookId, currentIndex: sel.sectionIndex });
        showResults(m, st);
        return;
      }
    } catch(e){}
    let loc = null;
    if (payload && (payload.currentBookId || payload.currentBook)){
      loc = {
        bookId: String(payload.currentBookId || payload.currentBook),
        id: Number.isInteger(payload.currentId) ? payload.currentId : null,
        type: payload.currentType || (payload.context === 'reader-pdf' ? 'pdf' : 'text'),
        index: Number(payload.currentIndex) || 0,
        title: String(payload.currentRef || payload.currentBook || payload.currentBookId)
      };
    } else {
      loc = await currentReaderBook();
    }
    if (!loc) return;
    await identifyReaderLocation(loc);
  } catch(e){
    await Otzaria.call('ui.showError', {
      message: 'הזיהוי נכשל. ' + ((e && e.message) || '')
    }).catch(()=>{});
  }
}

if (openPageRow) openPageRow.addEventListener('click', identifyOpenPage);
