// עמוד השער: דפי HTML שמורים, ריבועיהם, ושורת החיפוש העליונה.
// נוצר בפיצול router.js (גרסה 2.11.2). המקור: shell/router.js שורות 1455-1466, 1479-1583, 1882-2006.
// אין להפוך ל-type="module" — כל הקבצים חולקים scope גלובלי אחד.


// ---- משוב והערות ----
// חלונית המשוב הנפרדת בוטלה מזמן; לשונית ״משוב״ הנפרדת שבאה אחריה בוטלה
// גם היא (11.8.26) ואוחדה ללשונית "הצעות ודיווחים" (renderPersonalDrafts,
// personal.js) - שם סוג "משוב" ב-REPORT_KINDS. הכניסה היחידה כיום היא
// openReportPanel, והשליחה עצמה עוברת דרך sendReport.

// ---- שורת פסוק בסרגל העליון + הבהרת AI בתחתית (נוסף ב-JS ולא ב-HTML, כדי
// לא להסתכן בשבירת קינון ה-divים הקיים ב-index.html) ----
(function(){
  // הפסוק ישב עד 3.2.1 *מתחת* לסרגל (tb.after) וגזל שורה שלמה מהתוכן.
  // עכשיו הוא פריט שלישי **בתוך** הסרגל, בצד שמאל (סוף השורה ב-RTL), ולכן
  // אינו מוסיף שום גובה. מוסתר אוטומטית מתחת ל-1100px — שם אין לו מקום
  // בלי לרסק את שורת החיפוש (ר' #topbarVerse ב-router.css).
  const tb = document.querySelector('.topbar');
  if (tb){
    const verse = document.createElement('div');
    verse.id = 'topbarVerse';
    verse.className = 'mini-hint';
    verse.textContent = 'על דרך אמרו "כִּי עַל־כֵּן יָדַעְתָּ חֲנֹתֵנוּ בַּמִּדְבָּר וְהָיִיתָ לָּנוּ לְעֵינָיִם" (במדבר, פרק י)';
    tb.appendChild(verse);
  }
  // ⚠️ כאן היה מוזרק פתק שני, זהה במילה למה שכבר יושב ב-index.html כ-#aiDisclaimer,
  // כך שההודעה הופיעה פעמיים בעמוד השער. ההזרקה הוסרה ב-3.1.2 — הפתק ב-HTML הוא
  // המקור היחיד. אין להחזיר אותה: כל שינוי בנוסח צריך לקרות בקובץ ה-HTML בלבד.
})();


// מ-2.16 (מפרט 4.0, ג׳): לכל דף גם מיקום (עמוד ראשי / ליד מסכת) ואיקון אופציונלי.
const addHtmlOverlay = document.getElementById('addHtmlOverlay');
const addHtmlName = document.getElementById('addHtmlName');
const addHtmlFile = document.getElementById('addHtmlFile');
const addHtmlPlacementWrap = document.getElementById('addHtmlPlacement');
const addHtmlMasechetSel = document.getElementById('addHtmlMasechet');
const addHtmlIconInput = document.getElementById('addHtmlIcon');
const savedHtmlList = document.getElementById('savedHtmlList');
let pendingHtmlContent = null;
let pendingIconContent = null;
let addHtmlPlacementVal = 'home';

// רשימת 63 המסכתות מקובצת לפי סדר, כמו studySelectA ב-shas.js — נבנית פעם אחת,
// כי MISHNA_MASECHTOT/SEDER_ORDER (shas.js) קבועים ונטענים לפני home.js.
if (addHtmlMasechetSel){
  addHtmlMasechetSel.innerHTML = '<option value="" selected disabled>בחרו מסכת…</option>' +
    SEDER_ORDER.map(seder => `<optgroup label="סדר ${esc(seder)}">` +
      MISHNA_MASECHTOT.filter(m => m.seder === seder).map(m => `<option value="${esc(m.name)}">${esc(m.name)}</option>`).join('') +
      '</optgroup>').join('');
}

function resetAddHtmlForm(){
  addHtmlName.value = '';
  addHtmlFile.value = '';
  pendingHtmlContent = null;
  const cardsTa = document.getElementById('addCardsText'); if (cardsTa) cardsTa.value = '';
  if (addHtmlIconInput) addHtmlIconInput.value = '';
  pendingIconContent = null;
  addHtmlPlacementVal = 'home';
  if (addHtmlPlacementWrap) addHtmlPlacementWrap.querySelectorAll('.set-opt').forEach(b => b.classList.toggle('active', b.dataset.val === 'home'));
  if (addHtmlMasechetSel){ addHtmlMasechetSel.value = ''; addHtmlMasechetSel.style.display = 'none'; }
}

async function renderSavedHtmlList(){
  const index = await getHtmlPagesIndex();
  savedHtmlList.innerHTML = '';
  if (!index.length){
    savedHtmlList.innerHTML = '<div class="mini-note">אין עדיין דפים שמורים.</div>';
    return;
  }
  for (const page of index){
    const name = page.name;
    const placeLabel = (page.placement === 'masechet' && page.masechet) ? ('מסכת ' + page.masechet) : 'עמוד ראשי';
    const row = document.createElement('div');
    row.className = 'saved-html-row';
    row.innerHTML = `<span>${esc(name)} <span class="mini-note">(${esc(placeLabel)})</span></span>
      <span>
        <button class="panel-btn" data-open>פתיחה</button>
        <button class="panel-btn secondary" data-send>שליחה למפתח</button>
        <button class="panel-btn secondary" data-del>מחיקה</button>
      </span>`;
    row.querySelector('[data-open]').addEventListener('click', () => openCustomHtmlPage(name));
    row.querySelector('[data-send]').addEventListener('click', async () => {
      const content = await getHtmlPageContent(name);
      // 2.13.2 — דרך ממסר הדיווחים (sendToDev ב-personal.js), לא במייל.
      await sendToDev('דף HTML מצורף — ' + name,
        'המשתמש הוסיף דף HTML בשם "' + name + '".\n\nתוכן הדף מצורף למטה:\n\n' + (content || ''),
        'דף HTML');
    });
    row.querySelector('[data-del]').addEventListener('click', async () => {
      if (!(await uiConfirm('למחוק את "' + name + '"?'))) return;
      await deleteHtmlPage(name);
      talmudRendered = false;   // ליד מסכת ייתכן שהיה מוצמד דף שנמחק - יש לבנות מחדש
      renderSavedHtmlList();
      renderCustomPageCards();
      refreshPersonalIfOpen();
    });
    savedHtmlList.appendChild(row);
  }
}

// 3.3.2 — גשר Otzaria לדפי HTML אישיים. עד כה דף שנפתח כאן קיבל iframe נקי:
// אוצריא מזריקה את window.Otzaria רק ל-webview הראשי של התוסף, לא ל-iframe-ים
// מקוננים — ולכן תוספים שהודבקו כדף אישי (תיקון קוראים, שניים מקרא, שני טורים)
// "רק הציגו HTML" בלי למשוך ספרים (התלונה של אברהם mch בפורום). ה-iframe הוא
// same-origin (srcdoc + allow-same-origin), אז מספיק לשקף את האובייקט מההורה —
// הסקריפט מוזרק *לפני* הסקריפטים של הדף עצמו כדי שיראו אותו כבר בעת הריצה.
// גבולות ידועים, בכוונה: הדף מקבל בדיוק את ההרשאות של "עינים למקרא" (משיכת
// ספרים עובדת — library.books/content.read מוצהרות), לא את אלה של התוסף המקורי.
function injectOtzariaBridge(content){
  const tag = '<scr' + 'ipt>try{if(!window.Otzaria&&window.parent&&window.parent.Otzaria){window.Otzaria=window.parent.Otzaria;}}catch(e){}</scr' + 'ipt>';
  const doc = String(content);
  // אחרי <head> אם יש, אחרת אחרי <html>, אחרת בראש — לא לפני ה-DOCTYPE, כדי
  // לא להפיל את הדף ל-quirks mode.
  if (/<head[^>]*>/i.test(doc)) return doc.replace(/<head[^>]*>/i, m => m + tag);
  if (/<html[^>]*>/i.test(doc)) return doc.replace(/<html[^>]*>/i, m => m + tag);
  return tag + doc;
}

async function openCustomHtmlPage(name){
  const content = await getHtmlPageContent(name);
  if (content == null){ window.alert('לא נמצא תוכן שמור עבור "' + name + '"'); return; }
  if (/^data:application\/pdf/i.test(content)){ openPdfGuide(name, content); return; }
  guideFrame.removeAttribute('src');
  guideFrame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms allow-modals');
  guideFrame.srcdoc = injectOtzariaBridge(content);
  frameTitle.textContent = '📄 ' + name;
  frameWrap.classList.add('open');
  addHtmlOverlay.classList.remove('open');
  resultsOverlay.classList.remove('open');
}

// #65 (4.11): PDF כמדריך מלא — קורא ה-PDF המיובא (guides/pdf/viewer.html) נפתח
// במסגרת המדריכים; המשתמש בוחר קובץ PDF מהמחשב בכפתור הפתיחה של הקורא עצמו.
// עם dataUrl (PDF שמור) — הבייטים נשלחים לקורא ב-postMessage אחרי שהוא מודיע madaei-pdf-ready.
let pendingPdfForViewer = null;
window.addEventListener('message', (ev) => {
  const d = ev && ev.data;
  if (!d || d.type !== 'madaei-pdf-ready' || !pendingPdfForViewer) return;
  const p = pendingPdfForViewer; pendingPdfForViewer = null;
  try {
    const b64 = p.dataUrl.slice(p.dataUrl.indexOf(',') + 1);
    const bin = atob(b64); const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    ev.source.postMessage({ type: 'madaei-pdf-open', bytes: bytes.buffer, name: p.name + '.pdf' }, '*');
  } catch(e){ window.alert('לא ניתן לפתוח את קובץ ה-PDF השמור'); }
});
function openPdfGuide(name, dataUrl){
  pendingPdfForViewer = dataUrl ? { name: name, dataUrl: dataUrl } : null;
  guideFrame.removeAttribute('srcdoc');
  guideFrame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms allow-modals');
  guideFrame.src = 'guides/pdf/viewer.html';
  frameTitle.textContent = '📕 ' + (name || 'מדריך PDF');
  frameWrap.classList.add('open');
  addHtmlOverlay.classList.remove('open');
  resultsOverlay.classList.remove('open');
}

// #90 (4.11): מדריך כרטסות בהגדרת משתמש — הטקסט הופך לדף HTML עצמאי (חיפוש + כרטיסים
// נפתחים), ונשמר ונפתח באותו מסלול של דפי HTML אישיים. המקור מוטבע ב-JSON בתוך הדף.
function parseCardsText(text){
  return String(text).replace(/\r/g, '').split(/\n\s*\n+/).map(b => b.trim()).filter(Boolean).map(b => {
    const lines = b.split('\n');
    return { title: lines[0].trim(), body: lines.slice(1).join('\n').trim() };
  });
}
function buildCardsGuideHtml(name, text){
  const cards = parseCardsText(text);
  const json = JSON.stringify({ name: name, cards: cards }).replace(/</g, '\\u003c');
  return '<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>' + esc(name) + '</title>'
    + '<style>body{font-family:system-ui,sans-serif;margin:0;padding:16px;background:#fff;color:#222;}'
    + 'h1{font-size:20px;margin:0 0 12px;}input{width:100%;box-sizing:border-box;padding:8px;font-size:15px;margin-bottom:12px;border:1px solid #bbb;border-radius:6px;}'
    + 'details{border:1px solid #ddd;border-radius:8px;padding:8px 12px;margin-bottom:8px;}summary{font-weight:bold;cursor:pointer;}'
    + '.b{white-space:pre-wrap;margin-top:6px;line-height:1.6;}.n{color:#777;font-size:13px;}'
    + '@media (prefers-color-scheme: dark){body{background:#1e1e1e;color:#eee;}details{border-color:#444;}input{background:#2a2a2a;color:#eee;border-color:#555;}}'
    + '</style></head><body><h1>' + esc(name) + '</h1><input id="q" type="search" placeholder="חיפוש בכרטסות…"><div id="list"></div><p class="n" id="n"></p>'
    + '<script type="application/json" id="cards-data">' + json + '<\/script>'
    + '<script>(function(){var d=JSON.parse(document.getElementById("cards-data").textContent).cards;var L=document.getElementById("list"),N=document.getElementById("n");'
    + 'function e(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c];});}'
    + 'function r(q){var m=d.filter(function(c){return !q||(c.title+" "+c.body).indexOf(q)>=0;});'
    + 'L.innerHTML=m.map(function(c){return "<details><summary>"+e(c.title)+"</summary><div class=\\"b\\">"+e(c.body)+"</div></details>";}).join("");'
    + 'N.textContent=m.length+" ערכים";}document.getElementById("q").addEventListener("input",function(){r(this.value.trim());});r("");})();<\/script></body></html>';
}

function openAddHtmlPanel(){
  resetAddHtmlForm();
  addHtmlOverlay.classList.add('open');
  renderSavedHtmlList();
}
document.getElementById('addHtmlClose').addEventListener('click', () => {
  addHtmlOverlay.classList.remove('open');
});
addHtmlFile.addEventListener('change', () => {
  const file = addHtmlFile.files && addHtmlFile.files[0];
  if (!file) return;
  if (!addHtmlName.value.trim()) addHtmlName.value = file.name.replace(/\.(html?|pdf)$/i, '');
  const reader = new FileReader();
  reader.onload = () => { pendingHtmlContent = reader.result; };
  // 4.11 (#65): PDF נשמר כ-data URL באותו מסלול אחסון של דפי HTML, ונפתח בקורא ה-PDF.
  if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') reader.readAsDataURL(file);
  else reader.readAsText(file);
});
if (addHtmlPlacementWrap) addHtmlPlacementWrap.addEventListener('click', (e) => {
  const b = e.target.closest('.set-opt');
  if (!b) return;
  addHtmlPlacementVal = b.dataset.val;
  addHtmlPlacementWrap.querySelectorAll('.set-opt').forEach(x => x.classList.toggle('active', x === b));
  if (addHtmlMasechetSel) addHtmlMasechetSel.style.display = (addHtmlPlacementVal === 'masechet') ? '' : 'none';
});
if (addHtmlIconInput) addHtmlIconInput.addEventListener('change', () => {
  const file = addHtmlIconInput.files && addHtmlIconInput.files[0];
  if (!file){ pendingIconContent = null; return; }
  const reader = new FileReader();
  reader.onload = () => { pendingIconContent = reader.result; };
  reader.readAsDataURL(file);
});
document.getElementById('addHtmlSave').addEventListener('click', async () => {
  const name = addHtmlName.value.trim();
  if (!name){ window.alert('יש לתת שם לדף'); return; }
  const cardsText = (document.getElementById('addCardsText') || {}).value || '';
  if (!pendingHtmlContent && cardsText.trim()) pendingHtmlContent = buildCardsGuideHtml(name, cardsText);
  if (!pendingHtmlContent){ window.alert('יש לבחור קובץ HTML/PDF או לכתוב ערכים למדריך כרטסות'); return; }
  if (!hasOtzaria()){ window.alert('שמירה קבועה דורשת פתיחה בתוך אוצריא.'); return; }
  const masechet = (addHtmlPlacementVal === 'masechet') ? (addHtmlMasechetSel && addHtmlMasechetSel.value) : null;
  if (addHtmlPlacementVal === 'masechet' && !masechet){ window.alert('יש לבחור מסכת'); return; }
  const index = await getHtmlPagesIndex();
  const entry = { name: name, placement: addHtmlPlacementVal, masechet: masechet, icon: pendingIconContent };
  const existingIdx = index.findIndex(p => p.name === name);
  if (existingIdx >= 0) index[existingIdx] = entry; else index.push(entry);
  // #43 — לא להודיע ״נשמר לצמיתות״ כשהשמירה באוצריא נכשלה (עד 4.8 הכישלון נבלע).
  const contentOk = await setHtmlPageContent(name, pendingHtmlContent);
  const indexOk = await saveHtmlPagesIndex(index);
  if (contentOk && indexOk){
    await Otzaria.call('notifications.showInApp', { message: 'הדף נשמר לצמיתות', type: 'success' }).catch(()=>{});
  } else {
    window.alert('השמירה באחסון של אוצריא לא הצליחה במלואה (ייתכן שהקובץ או האיקון גדולים מדי).\n' +
      'הדף נשמר בינתיים במחשב הזה בלבד. כדאי לנסות שוב עם איקון קטן יותר.');
  }
  resetAddHtmlForm();
  addHtmlOverlay.classList.remove('open');   // מפרט 4.0 ג.3 — שמירה סוגרת את הפאנל
  renderSavedHtmlList();
  renderCustomPageCards();
  refreshPersonalIfOpen();
  talmudRendered = false;   // אם הדף הוצמד למסכת - יש לבנות מחדש את כרטיסי המסכתות
});

// ---- ריבועים בעמוד השער עבור דפי HTML שנשמרו ----
// מאז 2.12.0 הכרטיסים האלה יושבים בשורה השנייה (#extraGrid) יחד עם האזור האישי,
// כדי ששורת ששת המדריכים תישאר 3+3 מלאה ולא תיקטע בכל פעם שנוסף דף.
const extraGrid = document.getElementById('extraGrid');
async function renderCustomPageCards(){
  extraGrid.querySelectorAll('.card[data-custom-page]').forEach(el => el.remove());
  const index = await getHtmlPagesIndex();
  // עד 3.1.0 הכרטיסים נכנסו לפני "האזור האישי". ב-3.1.1 הוא עבר לסרגל הצד
  // (#sideRail) ואינו ילד של extraGrid — insertBefore עם עוגן זר זורק
  // NotFoundError, ולכן נופלים ל-append כשהעוגן אינו כאן.
  const anchor = extraGrid.querySelector('#personalCard');
  // דף שהוצמד למסכת (placement:'masechet') מקבל כרטיס בעמוד המסכתות במקום כאן - ר' talmud.js.
  index.filter(page => page.placement !== 'masechet').forEach(page => {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-custom-page', page.name);
    const iconHtml = page.icon
      ? `<img class="icon-img" src="${esc(page.icon)}" alt="" onerror="this.outerHTML='&lt;span class=\\'icon\\'&gt;📄&lt;/span&gt;'">`
      : '<span class="icon">📄</span>';
    card.innerHTML = iconHtml + `<span class="label">${esc(page.name)}</span>`;
    card.addEventListener('click', () => openCustomHtmlPage(page.name));
    if (anchor) extraGrid.insertBefore(card, anchor); else extraGrid.appendChild(card);
  });
  toggleExtraSection();
}

// מ-3.1.2 שורת "שלי" מכילה רק דפי HTML שהמשתמש הוסיף בעצמו (האזור האישי עבר
// לסרגל הצד, וספר אקראי לבורר הספר). מ-3.1.3, במקום להסתיר את השורה כשהיא
// ריקה, מוצגים שני ריבועים אפרוריים-למחצה באותו גודל ככרטיס רגיל, שלחיצה
// עליהם פותחת ישירות את פאנל הוספת הדף (openAddHtmlPanel) — כך המקום מסביר
// את עצמו במקום להיעלם, והמשתמש מגלה שאפשר להוסיף דפים משלו.
const EXTRA_PLACEHOLDERS = 2;
function toggleExtraSection(){
  extraGrid.querySelectorAll('.card-placeholder').forEach(el => el.remove());
  const realCards = extraGrid.querySelectorAll('.card:not(.card-placeholder)').length;
  for (let i = realCards; i < EXTRA_PLACEHOLDERS; i++){
    const ph = document.createElement('button');
    ph.type = 'button';
    ph.className = 'card card-placeholder';
    ph.innerHTML = '<span class="icon">＋</span><span class="label">הוספת מדריך אישי</span>';
    ph.addEventListener('click', () => openAddHtmlPanel());
    extraGrid.appendChild(ph);
  }
}
toggleExtraSection();

// ============================================================
//  שורת החיפוש בעמוד השער
//  אותו מנוע בדיוק של תפריט ההקשר בספרייה: הקלדה קצרה = השלמה חיה משמות
//  הערכים והכינויים שכבר נטענו לזיכרון; Enter/״זיהוי״ = identify() מלא, כך
//  שאפשר להדביק פסוק שלם ולקבל את כל הדצח״מ שבו.
// ============================================================
const homeSearch = document.getElementById('homeSearch');
const homeSearchBtn = document.getElementById('homeSearchBtn');
const homeSearchDrop = document.getElementById('homeSearchDrop');

// חיפוש בשמות ובכינויים בכל המדריכים שכבר נטענו (preloadAllGuides טוען אותם ברקע).
// התאמת תחילית מדורגת לפני התאמת תת-מחרוזת.
function searchEntriesByName(q, limit){
  const norm = normalizeHeb(q);
  if (norm.length < 2) return [];
  const starts = [], contains = [];
  for (const cat of CATEGORIES){
    const data = dataCache[cat.id];
    if (!data) continue;
    for (const e of data){
      const names = [e.name].concat(e.aliases || []);
      let via = null, isStart = false;
      for (const n of names){
        const nn = normalizeHeb(n);
        if (!nn) continue;
        if (nn.indexOf(norm) === 0){ via = n; isStart = true; break; }
        if (!via && nn.indexOf(norm) !== -1) via = n;
      }
      if (!via) continue;
      (isStart ? starts : contains).push({
        catId: cat.id, catLabel: cat.label, catIcon: cat.icon, name: e.name, via: via
      });
    }
  }
  return starts.concat(contains).slice(0, limit || 12);
}

// ההתנהגות הזו זהה בשער ובתוך כל מדריך, ולכן היא פונקציה אחת ולא שני עותקים (2.12.0):
//   input · drop · btn (אופציונלי) · wrapSel (לסגירה בלחיצה בחוץ) · preferCat
//   onBeforePick — נקרא לפני מעבר למדריך, כדי שכל שורה תנקה את מה ששייך לה.
// המדריך הפעיל (preferCat) עולה לראש ההשלמות, כי מי שמחפש בתוך ״אישים״ מתכוון
// כמעט תמיד לאישים — אבל ההשלמות מכל המדריכים נשארות, בדיוק כמו בשער.
function attachLiveSearch(opts){
  const input = opts.input, drop = opts.drop, btn = opts.btn || null;
  if (!input || !drop) return null;
  let rows = [], activeIdx = -1, timer = null;

  function close(){
    drop.classList.remove('open');
    drop.innerHTML = '';
    rows = []; activeIdx = -1;
  }

  function render(){
    let hits = searchEntriesByName(input.value.trim(), 12);
    const prefer = opts.preferCat && opts.preferCat();
    if (prefer && hits.length){
      hits = hits.filter(h => h.catId === prefer).concat(hits.filter(h => h.catId !== prefer));
    }
    if (!hits.length){ close(); return; }
    rows = hits; activeIdx = -1;
    drop.innerHTML = hits.map((h, i) => {
      const viaNote = (normalizeHeb(h.via) !== normalizeHeb(h.name)) ? ' <span class="hs-cat">(' + esc(h.via) + ')</span>' : '';
      return `<div class="hs-row" data-i="${i}">
        <span>${h.catIcon}</span>
        <span class="hs-name">${esc(h.name)}</span>${viaNote}
        <span class="hs-cat">${esc(h.catLabel)}</span>
      </div>`;
    }).join('') + '<div class="hs-note">Enter — זיהוי מלא של כל הטקסט שבשורה (גם פסוק שלם)</div>';
    drop.querySelectorAll('.hs-row').forEach(row => {
      row.addEventListener('click', () => {
        const h = rows[parseInt(row.dataset.i, 10)];
        if (h) pick(h);
      });
    });
    drop.classList.add('open');
  }

  function pick(h){
    close();
    input.value = '';
    if (opts.onBeforePick) opts.onBeforePick();
    openGuide(h.catId, h.name);
  }

  async function runIdentify(){
    const text = input.value.trim();
    if (!text) return;
    close();
    let label = null;
    if (btn){ btn.disabled = true; label = btn.textContent; btn.textContent = '…'; }
    try {
      const matches = await identifyWithLiveContext(text, { includePossible: true });
      showResults(matches, text);
    } finally {
      if (btn){ btn.disabled = false; btn.textContent = label; }
    }
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(render, 140);
  });
  input.addEventListener('keydown', (ev) => {
    const els = drop.querySelectorAll('.hs-row');
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp'){
      if (!els.length) return;
      ev.preventDefault();
      activeIdx += (ev.key === 'ArrowDown' ? 1 : -1);
      if (activeIdx < 0) activeIdx = els.length - 1;
      if (activeIdx >= els.length) activeIdx = 0;
      els.forEach((r, i) => r.classList.toggle('active', i === activeIdx));
      els[activeIdx].scrollIntoView({ block: 'nearest' });
      return;
    }
    if (ev.key === 'Enter'){
      ev.preventDefault();
      if (activeIdx >= 0 && rows[activeIdx]) pick(rows[activeIdx]);
      else runIdentify();
      return;
    }
    if (ev.key === 'Escape') close();
  });
  if (btn) btn.addEventListener('click', runIdentify);
  document.addEventListener('click', (ev) => {
    if (!ev.target.closest(opts.wrapSel)) close();
  });
  return { close: close, identify: runIdentify };
}

attachLiveSearch({
  input: homeSearch, drop: homeSearchDrop, btn: homeSearchBtn, wrapSel: '#homeSearchWrap'
});

// אותה שורה בדיוק בתוך כל מדריך. הסינון החי של הרשת (guides.js) נשאר כפי שהיה —
// כאן רק נוספו ההשלמה החיה וה-Enter שמריץ זיהוי מלא על הטקסט שבשורה.
attachLiveSearch({
  input: guideSearchBox,
  drop: document.getElementById('guideSearchDrop'),
  btn: document.getElementById('guideIdentifyBtn'),
  wrapSel: '#guideSearchWrap, #guideIdentifyBtn',
  preferCat: () => currentGuideCat && currentGuideCat.id
});

// ============================================================
//  "ערך היום" (2.10א): מאורעות התנ״ך לפי התאריך העברי של היום, מתוך
//  TANAKH_DATE_EVENTS (guides/_shared/dates.js). דאטה קבועה, בלי רשת.
// ============================================================
const dailyEventCard = document.getElementById('dailyEventCard');
const dailyEventLabel = document.getElementById('dailyEventLabel');
const dailyEventOverlay = document.getElementById('dailyEventOverlay');
const dailyEventBody = document.getElementById('dailyEventBody');

// מקור המאורע הופך לקישור לחיץ לספרייה כשהוא נפרש - קודם parseColonVerseRef
// (dates.js, "ספר פרק:פסוק" - רוב הרשומות, מקור תנ״כי) ואם זה נכשל parseMidrashRef
// (refs.js, "משנה, X Y, Z" / "בבלי, X Y" וכו' - מקורות חז״ל/הלכה חוץ-מקראיים,
// כמו "משנה, בכורות ט, ה"). "תלמוד בבלי, ..." (בניגוד ל"בבלי, ...") לא נתפס ע"י
// אף אחד מהשניים בכוונה - ר' הערת הכותב בראש dates.js.
// כפתורי העריכה (✏️) והדיווח (🚩) יושבים בתוך אותה שורה לחיצה שפותחת בספרייה -
// stopPropagation ב-wireDateEventLinks מונע פתיחה כפולה. __origKey/__addedIdx
// (allDateEvents, dates.js) מסומנים כ-data-* כדי שהכפתורים ידעו על איזו רשומה
// לפעול. 🚩 הוא אותו דפוס בדיוק כמו entryReportBtn שבכותרת כרטיס ערך
// (entry-detail.js): דיווח ממוקד על נתון שגוי, בלי לפתוח עריכה.
function dateEventRow(ev, monthLabel){
  const parsed = parseColonVerseRef(ev.source) || parseMidrashRef(ev.source);
  const openAttr = parsed ? ` data-vbook="${esc(parsed.bookId)}" data-vref="${esc(parsed.ref)}"` : '';
  const editAttr = ev.__origKey != null ? ` data-edit-key="${esc(ev.__origKey)}"`
    : (ev.__addedIdx != null ? ` data-edit-idx="${ev.__addedIdx}"` : '');
  // לא נעשה שימוש ב-edited-badge/✏️ הכללי (guides.js) כאן - הוא היה מתנגש חזותית
  // עם כפתור העריכה הייעודי (גם הוא ✏️) שכל שורה כבר מציגה.
  const badge = ev.__edited ? ' <span class="mini-hint">(נערך)</span>' : (ev.__custom ? ' <span class="missing-chip">מותאם אישית</span>' : '');
  return `<div class="src-item${parsed ? ' clickable' : ''}"${openAttr}>
    <div class="src-source">${esc(ev.day)}' ${esc(monthLabel)} — ${esc(ev.event)}${badge}
      <button type="button" class="date-ev-edit-btn"${editAttr} title="עריכת מאורע">✏️</button>
      <button type="button" class="date-ev-report-btn"${editAttr} title="דיווח על מאורע שגוי (בלי לערוך)">🚩</button>
    </div>
    ${ev.source ? `<div class="src-note">${esc(ev.source)}${parsed ? ' <span class="open-hint">↗ פתח בספרייה</span>' : ''}</div>` : ''}
    ${ev.desc ? `<div class="date-ev-desc"><div class="date-ev-desc-label">הסבר</div>${esc(ev.desc).replace(/\n/g, '<br>')}</div>` : ''}
  </div>`;
}
function wireDateEventLinks(container){
  container.querySelectorAll('.src-item.clickable[data-vbook]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.date-ev-edit-btn') || e.target.closest('.date-ev-report-btn')) return;
      openInReader(el.dataset.vbook, el.dataset.vref);
    });
  });
  // איתור הרשומה מתוך ה-data-* שעל הכפתור - אותו חישוב לשני הכפתורים
  const evOf = (btn) => {
    const key = btn.dataset.editKey, idx = btn.dataset.editIdx;
    return (idx !== undefined)
      ? allDateEvents().find(x => x.__addedIdx === Number(idx))
      : allDateEvents().find(x => x.__origKey === key);
  };
  container.querySelectorAll('.date-ev-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ev = evOf(btn);
      if (ev) openDateEventForm(ev);
    });
  });
  // 🚩 — דיווח ממוקד על מאורע שגוי, בלי לפתוח עריכה. אותה תבנית שלושת-המקרים
  // כמו entryReportBtn (entry-detail.js:565), מותאמת למאורע תאריך. פאנל הדיווח
  // (personal.js) מצורף ל-body אחרי הצומת הסטטי של dailyEventOverlay ושניהם
  // .panel-overlay באותו z-index, ולכן הוא נפתח *מעליו* - אין צורך לסגור כאן
  // את פאנל "ערך היום" (בשונה מ-dailyEventReportLink, שפותח מסך אחר לגמרי).
  container.querySelectorAll('.date-ev-report-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof openReportPanel !== 'function') return;
      const ev = evOf(btn);
      if (!ev) return;
      const when = ev.day + "' " + ev.month;
      openReportPanel({
        kind: 'טעות בתוכן',
        title: 'דיווח על מאורע ב״ערך היום״ — ' + when,
        details: 'המאורע: ' + when + ' — ' + ev.event
          + (ev.source ? '\nמקור: ' + ev.source : '') + '\n\n'
          + 'סמנו מה רלוונטי (מחקו את השאר) ופרטו:\n'
          + '[ ] התאריך שגוי — התאריך הנכון:\n'
          + '[ ] המאורע כולו שגוי או אינו שייך לכאן — מדוע:\n'
          + '[ ] המקור שגוי או לא מדויק — המקור הנכון:\n'
      });
    });
  });
}

// טופס הוספה/עריכה של מאורע ב"ערך היום" - אותו entryOverlay/entryModalInner
// שמשמש את עורך הכרטיסים (edit-forms.js), כדי לא לבנות פאנל נפרד. ev=null → הוספה
// חדשה; ev.__origKey → עריכת רשומה מובנית (עם שחזור-למקור, בלי מחיקה - הסתרת רשומה
// מובנית בלי דרך לראות/לבטל את זה היא מלכודת UX); ev.__addedIdx → עריכת/מחיקת
// תוספת של המשתמש עצמו. השמירה היא "במכשיר זה" (localStorage, dates.js), ולצידה
// - כמו בעורך הכרטיסים - "📨 שליחה למפתח" (sendToDev, personal.js). עד 3.5 לא היה
// כאן ערוץ שליחה, בטענה שמאורע-תאריך אינו "כרטיס" עם מדריך ו-catId; בפועל sendToDev
// מקבל נושא וגוף טקסט חופשיים ואינו דורש כרטיס, והתוצאה הייתה שתיקון שמשתמש טרח
// לכתוב נשאר תקוע במכשיר שלו במקום להגיע לכולם (Issue #93).
function openDateEventForm(ev){
  const isBuiltin = !!(ev && ev.__origKey != null);
  const isCustom = !!(ev && ev.__custom);
  const monthOptions = HEBREW_MONTHS_ORDER.map(m =>
    `<option value="${esc(m)}"${ev && ev.month === m ? ' selected' : ''}>${esc(m)}</option>`).join('');
  entryModalInner.innerHTML = `
    <h2>${ev ? 'עריכת מאורע' : 'הוספת מאורע ל"ערך היום"'}</h2>
    <div class="entry-sub">השינוי נשמר במכשיר זה בלבד.${isBuiltin ? ' זו רשומה מובנית בתוסף - אפשר לשחזר לגרסת המקור בכל עת.' : ''}</div>

    <div class="field-label">יום <span class="mini-hint">(אותיות גימטריה, למשל "ה" או "כז-כה" לטווח ימים)</span></div>
    <input type="text" id="dateEvDay" value="${esc(ev ? ev.day : '')}" class="f-input" style="max-width:120px;">

    <div class="field-label">חודש</div>
    <select id="dateEvMonth" class="f-input">${monthOptions}</select>

    <div class="field-label">המאורע <span class="mini-hint">(שורה אחת — הכותרת ביומן)</span></div>
    <textarea id="dateEvText" class="f-textarea">${esc(ev ? ev.event : '')}</textarea>

    <div class="field-label">הסבר <span class="mini-hint">(רשות — רקע, מה קרה ולמה זה חשוב; מוצג מתחת למאורע ונשלח גם ליומן)</span></div>
    <textarea id="dateEvDesc" class="f-textarea" rows="4">${esc(ev ? (ev.desc || '') : '')}</textarea>

    <div class="field-label">מקור <span class="mini-hint">(פסוק בנקודתיים - "עזרא ז:ט"; או מקור חז״ל בפורמט הרגיל - "משנה, בכורות ט, ה" / "בבלי, שבת פו ע\"ב")</span></div>
    <input type="text" id="dateEvSource" value="${esc(ev ? ev.source : '')}" class="f-input">
    <div id="dateEvRefCheck" class="ref-check-box"></div>

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;">
      <button class="nf-btn" id="dateEvSave">💾 שמירה במכשיר</button>
      <button class="nf-btn" id="dateEvSend">📨 שליחה למפתח</button>
      <button class="nf-btn secondary" id="dateEvCancel">ביטול</button>
      ${isCustom ? '<button class="nf-btn secondary danger-link" id="dateEvDelete">🗑 מחיקה</button>' : ''}
      ${isBuiltin && ev.__edited ? '<button class="nf-btn secondary" id="dateEvRestore">↺ שחזור למקור</button>' : ''}
    </div>`;
  entryOverlay.classList.add('open');

  function liveCheck(){
    const src = document.getElementById('dateEvSource').value.trim();
    const box = document.getElementById('dateEvRefCheck');
    if (!src){ box.innerHTML = ''; return; }
    const ok = !!(parseColonVerseRef(src) || parseMidrashRef(src));
    box.innerHTML = `<div style="font-size:12px;${ok ? 'color:var(--color-success,#2e7d32);' : 'color:var(--color-on-surface-faint,#888);'}">`
      + `${ok ? '✓ ייפתח כקישור לספרייה' : '○ לא יזוהה כקישור לספרייה (יוצג כטקסט בלבד)'}</div>`;
  }
  document.getElementById('dateEvSource').addEventListener('input', liveCheck);
  liveCheck();

  document.getElementById('dateEvCancel').addEventListener('click', () => entryOverlay.classList.remove('open'));

  // איסוף השדות + ולידציה, משותף לשמירה ולשליחה. מחזיר null אם חסר שדה חובה.
  function collectDateEv(){
    const day = document.getElementById('dateEvDay').value.trim();
    const month = document.getElementById('dateEvMonth').value;
    const event = document.getElementById('dateEvText').value.trim();
    const source = document.getElementById('dateEvSource').value.trim();
    const desc = document.getElementById('dateEvDesc').value.trim();
    if (!day || !event){ window.alert('יש למלא יום ותיאור מאורע.'); return null; }
    return { day, month, event, source, desc };
  }
  // שמירה במכשיר - אותה פעולה לשני הכפתורים, כדי שמה שנשלח לא ייעלם מהמסך
  function persistDateEv(newEv){
    return isBuiltin ? saveDateEventEdit(ev.__origKey, newEv)
      : isCustom ? saveCustomDateEvent(ev.__addedIdx, newEv)
      : addCustomDateEvent(newEv);
  }

  document.getElementById('dateEvSave').addEventListener('click', () => {
    const newEv = collectDateEv();
    if (!newEv) return;
    const ok = persistDateEv(newEv);
    entryOverlay.classList.remove('open');
    if (!ok) window.alert('השמירה נכשלה (ייתכן שאחסון הדפדפן מלא).');
    renderDailyEventBody();
  });

  // 📨 שליחה למפתח - אותו צינור בדיוק כמו genEditSend בעורך הכרטיסים
  // (edit-forms.js:241): diff "לפני ← אחרי", הגנת כפילות על חתימת ה-diff דרך
  // editDiffHash/getEntryEditSent/markEntryEditSent (data.js) תחת מזהה מדריך
  // מדומה 'dates', ושליחה שקטה בממסר הדיווחים. השליחה שומרת גם במכשיר, כדי
  // שהמשתמש לא יישאר בלי מה שכתב עד שהתיקון ייכנס לכולם.
  document.getElementById('dateEvSend').addEventListener('click', async () => {
    const newEv = collectDateEv();
    if (!newEv) return;
    const when = newEv.day + "' " + newEv.month;
    const label = ev ? 'הצעת תיקון למאורע' : 'הצעת מאורע חדש';
    const lines = [];
    if (ev){
      // #46 — רק מה שהשתנה בולט (markChangedWords, edit-forms.js)
      const mk = (typeof markChangedWords === 'function') ? markChangedWords
        : (l, b, a) => l + ': ' + (b || '—') + ' ← ' + (a || '—');
      if (ev.day !== newEv.day || ev.month !== newEv.month) lines.push(mk('תאריך', ev.day + "' " + ev.month, when));
      if (ev.event !== newEv.event) lines.push(mk('המאורע', ev.event, newEv.event));
      if ((ev.source || '') !== newEv.source) lines.push(mk('מקור', ev.source || '', newEv.source || ''));
      if ((ev.desc || '') !== newEv.desc) lines.push(mk('הסבר', ev.desc || '', newEv.desc || ''));
    } else {
      lines.push('תאריך: ' + when);
      lines.push('המאורע: ' + newEv.event);
      lines.push('מקור: ' + (newEv.source || '—'));
      if (newEv.desc) lines.push('הסבר: ' + newEv.desc);
    }
    const diff = lines.join('\n') || '(לא זוהה שינוי)';
    // מזהה הרשומה לצורך "כבר נשלח": המפתח המובנה, אינדקס התוספת, או תוכן המאורע החדש
    const sentKey = isBuiltin ? ev.__origKey
      : isCustom ? 'added|' + ev.__addedIdx
      : 'new|' + when + '|' + newEv.event;
    const diffHash = editDiffHash(diff);
    const alreadySent = getEntryEditSent('dates', sentKey);
    if (alreadySent && alreadySent.hash === diffHash){
      window.alert('ההצעה הזו כבר נשלחה' + (alreadySent.at ? ' (' + new Date(alreadySent.at).toLocaleDateString('he-IL') + ')' : '')
        + '. אם שיניתם משהו נוסף — ערכו ושלחו שוב.');
      return;
    }
    persistDateEv(newEv);
    entryOverlay.classList.remove('open');
    renderDailyEventBody();
    const sentOk = await sendToDev(
      label + ' — ' + when,
      ['## ' + label + ': **' + when + '**',
       '',
       '* **מקור הרשומה:** ' + (isBuiltin ? 'רשומה מובנית בתוסף' : isCustom ? 'תוספת של המשתמש' : 'מאורע חדש'),
       '',
       '### מה השתנה',
       '',
       diff].join('\n'),
      label
    );
    // רק שליחה שבאמת יצאה מסומנת. "נכנס לתור" מחזיר false, ולכן הצעה שנשמרה
    // לשליחה מאוחרת עדיין ניתנת לשליחה חוזרת ולא נחסמת בטעות.
    if (sentOk) markEntryEditSent('dates', sentKey, diffHash);
  });

  if (isCustom) document.getElementById('dateEvDelete').addEventListener('click', async () => {
    if (!(await uiConfirm('למחוק את המאורע הזה לצמיתות?'))) return;
    deleteCustomDateEvent(ev.__addedIdx);
    entryOverlay.classList.remove('open');
    renderDailyEventBody();
  });
  if (isBuiltin && ev.__edited) document.getElementById('dateEvRestore').addEventListener('click', () => {
    restoreBuiltinDateEvent(ev.__origKey);
    entryOverlay.classList.remove('open');
    renderDailyEventBody();
  });
}

// 4.3.0 — תאריך שנבחר ביומן של אוצריא (calendar.getSelectedDate / calendar.date_changed).
// null = היום. נקבע ב-shell/otzaria-extras.js.
let dailySelectedDate = null;
function renderDailyEventBody(){
  const sel = (dailySelectedDate && typeof eventsForDate === 'function') ? dailySelectedDate : null;
  const t = sel ? hebrewOfDate(sel) : todayHebrew();
  const today = sel ? eventsForDate(sel) : eventsForToday();
  let html = sel
    ? `<p class="panel-hint">לפי התאריך שנבחר ביומן של אוצריא: ${esc(t.dayLetters)}' ${esc(t.monthName)} ${esc(hebYearStr(t.raw.year))} (${esc(sel.toLocaleDateString('he-IL'))}) · <a href="#" id="dailyBackToToday">חזרה להיום</a></p>`
    : `<p class="panel-hint">היום ${esc(t.dayLetters)}' ${esc(t.monthName)} ${esc(hebYearStr(t.raw.year))} (${esc(gregDateStr())})</p>`;
  if (today.length){
    html += '<div class="field-label">מאורעות התנ״ך והתלמוד היום</div>' + today.map(ev => dateEventRow(ev, t.monthName)).join('');
  } else {
    html += '<p class="mini-note">אין מאורע רשום לתאריך זה ברשימה (חלקית - ר׳ הרשימה המלאה למטה).</p>';
  }
  html += `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:16px;">
    <div class="field-label" style="margin:0;">כל מאורעות התנ״ך והתלמוד לפי חודש</div>
    <div style="display:flex;gap:6px;">
      <button type="button" class="nf-btn secondary" id="dateEventAddBtn" style="padding:4px 10px;font-size:13px;">＋ הוספת מאורע</button>
      <button type="button" class="nf-btn secondary" id="dateEventPrintAllBtn" style="padding:4px 10px;font-size:13px;" title="הדפסת כל המאורעות לפי חודש">🖨️</button>
    </div>
  </div>`;
  const all = allDateEvents();
  HEBREW_MONTHS_ORDER.forEach(month => {
    // ממוין לפי היום בחודש (3.2.9). עד כה הרשימה הוצגה בסדר שבו הרשומות
    // יושבות בקובץ הנתונים — כלומר החודשים היו מסודרים אבל הימים בתוכם לא.
    // gematriaValue (dates.js) ממיר אותיות למספר; לטווח (כז-כה) ממיינים לפי
    // היום המוקדם, כדי שהוא ייפול במקומו הטבעי ברצף.
    const dayOrder = (d) => {
      const parts = String(d || '').split('-').map(gematriaValue).filter(n => n > 0);
      return parts.length ? Math.min.apply(null, parts) : 999;
    };
    const items = all.filter(e => e.month === month)
      .slice()
      .sort((x, y) => dayOrder(x.day) - dayOrder(y.day));
    if (!items.length) return;
    html += `<details class="month-details"><summary>${esc(month)} (${items.length})</summary>`
      + items.map(ev => dateEventRow(ev, month)).join('') + '</details>';
  });
  html += '<p class="mini-note" style="margin-top:14px;" data-i18n="dailyEventsNote">'
    + 'הרשימה התחילה על בסיס תוסף ״ביוגרפיות״ מאת Yair Daniel, ונוספה עליה '
    + '<b>מסכת בכורות</b> לטובת לומדי הדף היומי. חלק מהרשומות ממקורות נוספים '
    + '(ר׳ מקור בכל רשומה).<br>'
    + 'אי״ה בסבב התוכן ייכנסו כל התאריכים שבתנ״ך, במשנה ובתלמוד. '
    + 'מצאתם תאריך שאינו כאן? אפשר להוסיף אותו בעצמכם (＋ למעלה), או '
    + '<a href="#" id="dailyEventReportLink">לשלוח לנו דיווח</a> ונוסיף אותו לכולם.'
    + '</p>';
  dailyEventBody.innerHTML = html;
  const back = document.getElementById('dailyBackToToday');
  if (back) back.addEventListener('click', (e) => { e.preventDefault(); dailySelectedDate = null; renderDailyEventBody(); });
  wireDateEventLinks(dailyEventBody);
  const addBtn = dailyEventBody.querySelector('#dateEventAddBtn');
  if (addBtn) addBtn.addEventListener('click', () => openDateEventForm(null));
  const printAllBtn = dailyEventBody.querySelector('#dateEventPrintAllBtn');
  if (printAllBtn) printAllBtn.addEventListener('click', printAllDateEvents);
  // "שלחו לנו דיווח" — לשונית הדיווחים באזור האישי, אותו דפוס כמו הבאנר
  // ב-talmud.js. הפאנל נסגר קודם, אחרת הוא נשאר פתוח מעל האזור האישי.
  const reportLink = dailyEventBody.querySelector('#dailyEventReportLink');
  if (reportLink) reportLink.addEventListener('click', (e) => {
    e.preventDefault();
    dailyEventOverlay.classList.remove('open');
    openPersonalArea('drafts');
  });
}
if (dailyEventLabel){
  const t = todayHebrew();
  dailyEventLabel.textContent = 'ערך היום — ' + t.dayLetters + "' " + t.monthName + ' ' + hebYearStr(t.raw.year) + ' (' + gregDateStr() + ')';
}
// טיימר בית המקדש - מועתק כלשונו מ-guides/beithamikdash/view.html:1024 (רק ה-DOM
// updates זהים; שם רץ תמיד, כאן רק כשהפאנל פתוח - אין טעם ב-setInterval ברקע).
const TEMPLE_DESTRUCTION = new Date(Date.UTC(2000, 6, 4, 0, 0, 0));
TEMPLE_DESTRUCTION.setUTCFullYear(70); // 4 ביולי 70 לספירה - תוקן בעקבות אותה שגיאה שתוקנה
// ב-yearsSinceChurban (guides/_shared/dates.js): (2000,7,4)/gregToHebDate(70,8,4) נפלו
// בטעות בחודש אוגוסט/אלול, לא ביולי/אב.
let templeTimerInterval = null;
function updateTempleTimer(){
  const now = new Date();
  let y = now.getUTCFullYear() - TEMPLE_DESTRUCTION.getUTCFullYear();
  let m = now.getUTCMonth() - TEMPLE_DESTRUCTION.getUTCMonth();
  let d = now.getUTCDate() - TEMPLE_DESTRUCTION.getUTCDate();
  let h = now.getUTCHours() - TEMPLE_DESTRUCTION.getUTCHours();
  let mi = now.getUTCMinutes() - TEMPLE_DESTRUCTION.getUTCMinutes();
  let s = now.getUTCSeconds() - TEMPLE_DESTRUCTION.getUTCSeconds();
  if (s < 0){ s += 60; mi--; }
  if (mi < 0){ mi += 60; h--; }
  if (h < 0){ h += 24; d--; }
  if (d < 0){
    const prevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
    d += prevMonth.getUTCDate();
    m--;
  }
  if (m < 0){ m += 12; y--; }
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('ttYears', y); set('ttMonths', m); set('ttDays', d);
  set('ttHours', h); set('ttMinutes', mi); set('ttSeconds', s);
}

if (dailyEventCard) dailyEventCard.addEventListener('click', () => {
  renderDailyEventBody();
  dailyEventOverlay.classList.add('open');
  updateTempleTimer();
  if (!templeTimerInterval) templeTimerInterval = setInterval(updateTempleTimer, 1000);
});
const dailyEventPrintBtn = document.getElementById('dailyEventPrintBtn');
if (dailyEventPrintBtn) dailyEventPrintBtn.addEventListener('click', printDailyToday);
document.getElementById('dailyEventClose').addEventListener('click', () => {
  dailyEventOverlay.classList.remove('open');
  if (templeTimerInterval){ clearInterval(templeTimerInterval); templeTimerInterval = null; }
});

// "שלחו פנייה" בפוטר → פאנל הדיווחים באזור האישי (3.2.7). אותו דפוס בדיוק
// כמו dailyEventReportLink ב"ערך היום" ו-talmudBannerAddLink ב"ציורים וכלי עזר".
const footerReportLink = document.getElementById('footerReportLink');
if (footerReportLink) footerReportLink.addEventListener('click', (e) => {
  e.preventDefault();
  openPersonalArea('drafts');
});
