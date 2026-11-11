// "ציורים וכלי עזר" (מפרט 4.0, ב.3) — עמוד המסכתות: כרטיס לכל אחת מ-63 המסכתות,
// לפי סדר המשנה. זו לא רשימה נפרדת מ"כלי העזר" — היא כלי העזר, ממוינים לפי סדר
// המסכתות: מסכת עם כלי עזר מוטמע פותחת אותו בלחיצה, מסכת בלי — placeholder.
// לשעבר "משנה ותלמוד" (סבב 1); רשימת המסכתות עצמה כבר לא נכתבת כאן — נגזרת
// מ-MISHNA_MASECHTOT (shell/shas.js), ששם גם בורר המסכת של שערי משנה/בבלי.
// אין להפוך ל-type="module" — כל הקבצים חולקים scope גלובלי אחד.
// טוען אחרי guides.js (landing/frameWrap/guideFrame/frameTitle/closeFrame משם).

const MASECHTOT_SEDARIM = SEDER_ORDER.map(seder => ({
  seder: seder,
  list: MISHNA_MASECHTOT.filter(m => m.seder === seder).map(m => m.name),
}));

// שלושת כלי העזר הקיימים, משובצים במסכת שלהם (מפרט 4.0, ב.3) במקום במדור נפרד.
// נפתחים כדף עצמאי בפריים הקיים (guideFrame, כמו openCustomHtmlPage ב-home.js),
// דרך src אמיתי ולא srcdoc: כך הקבצים (script.js/style.css/diagrams.js) נטענים
// ישירות מהדיסק, בלי לעבור דרך storage/טעינת-טקסט - פחות טוקנים וזיכרון גם בעתיד.
// שלושת כלי-העזר הומרו לכרטסת ילידית (מפרט 4.0, ד.1) — guideId פותח דרך
// openGuide, בדיוק כמו domem/beithamikdash, במקום openExternalGuide (iframe).
const MASECHET_TOOLS = {
  'חולין': { title: 'חולין', guideId: 'chullin', icon: 'icon/masechtot/chullin.png' },
  'בכורות': { title: 'מומים — מסכת בכורות', guideId: 'mumim', icon: 'icon/masechtot/bechorot.png' },
  // 6.0.0 — ערכין: מדריך קישורים לערכים במדריכים הקיימים, עם סינון לפי דף והקשר
  'ערכין': { title: 'ערכין', guideId: 'arachin', icon: 'icon/masechtot/arachin.png' },
  'סוכה': { title: 'סוכה ולולב', guideId: 'sukkah', icon: 'icon/masechtot/sukkah.png',
    // גל 25/08: PDF חיצוני נוסף, *לצד* הכרטסת הילידית - לא במקומה.
    // ⚠️ תוקן אחרי בדיקה בפועל: ניסיון ראשון (window.open) לא נפתח בכלל
    // בתוך ה-WebView. הדפוס הנכון כבר קיים בקוד - data-external-link +
    // data-requires-net, מטופל ע"י confirmOpenExternal (shell/refs.js) שקורא
    // ל-Otzaria.call('app.openUrl', ...) *עם camelCase* - זו הקריאה שאומתה
    // כבר עובדת בפועל (למשל בקישורי GitHub ב-personal.js). app[.]open_url
    // (snake_case, מה שניסיתי בהתחלה) פשוט לא קיים ב-SDK.
    extraPdf: { label: 'המחזור המבואר — סוכה (PDF)',
      url: 'https://taamu.co.il/wp-content/uploads/2021/07/hamahor-hamevohar-suka-kal2.pdf' } },
};

const talmudView = document.getElementById('talmudView');
const talmudMasechtotGrid = document.getElementById('talmudMasechtotGrid');
let talmudRendered = false;

function openExternalGuide(path, title){
  guideFrame.removeAttribute('srcdoc');
  guideFrame.src = path;
  frameTitle.textContent = title;
  frameWrap.classList.add('open');
}

// אין איקון מוכן למסכת = האיקון הראשי של אוצריא (מפרט 4.0, ב.4) — לא אמוג'י, לא המצאה.
// page = דף HTML אישי שהמשתמש הצמיד למסכת הזו דרך "האזור האישי" (מפרט 4.0, ג.1),
// אם יש כזה ואין כלי-עזר מובנה (MASECHET_TOOLS) - שתי המערכות לא מתנגשות כי
// MASECHET_TOOLS הוא תמיד עדיפות ראשונה.
function masechetCardHtml(name, page){
  const tool = MASECHET_TOOLS[name];
  const icon = (tool && tool.icon) || (page && page.icon) || 'icon/icon.png';
  // הבאדג' "גרסה ראשונית" מציין כלי-עזר שעדיין iframe חיצוני (מפרט 4.0, ד) —
  // guideId = כרטסת ילידית מלאה, לא זמנית.
  const badge = (tool && !tool.guideId) ? '<span class="talmud-tool-badge">גרסה ראשונית</span>'
    : (!tool && page) ? '<span class="talmud-tool-badge">מדריך אישי</span>' : '';
  // הדגשת מסכתות עם תוכן בפועל מתוך 63 (רוב הכרטיסים עדיין placeholder):
  // מסגרת צבעונית למי שיש לו כלי-עזר/דף אישי, עמעום למי שאין. כלל קבוע —
  // כל מדריך/כלי-עזר חדש שנכנס מקבל את אותה מסגרת, עד שרוב המסכתות מכוסות
  // ואפשר להסיר את ההדגשה (ר' מפרט 4.0, ד.3).
  const hasContent = (tool && tool.guideId) || page;
  const stateClass = hasContent ? ' tool-has-content' : ' tool-placeholder';
  return `<div class="card${stateClass}" data-masechet="${esc(name)}">` +
    `<img class="icon-img" src="${esc(icon)}" alt="" onerror="this.src='icon/icon.png'">` +
    `<span class="label">${esc(name)}${badge}</span></div>`;
}

async function renderMasechtot(){
  const htmlIndex = await getHtmlPagesIndex();
  const masechetPages = {};
  htmlIndex.forEach(p => { if (p.placement === 'masechet' && p.masechet) masechetPages[p.masechet] = p; });
  talmudMasechtotGrid.innerHTML = MASECHTOT_SEDARIM.map(s => `
      <h3 class="masechet-seder-head">סדר ${esc(s.seder)}</h3>
      <div class="cards masechtot-grid">
        ${s.list.map(name => {
          const tool = MASECHET_TOOLS[name];
          let html = masechetCardHtml(name, masechetPages[name]);
          if (tool && tool.extraPdf){
            // data-external-link/data-requires-net = הדפוס הקיים לקישור חיצוני
            // (shell/refs.js, confirmOpenExternal) - מטופל ע"י מאזין click גלובלי
            // בשלב ה-capture, לא ע"י הקוד כאן (ר' querySelectorAll('.card') למטה).
            html += `<a href="#" class="card tool-has-content" data-external-link="${esc(tool.extraPdf.url)}" data-requires-net>` +
              `<img class="icon-img" src="${esc(tool.icon || 'icon/icon.png')}" alt="" onerror="this.src='icon/icon.png'">` +
              `<span class="label">${esc(tool.extraPdf.label)}</span></a>`;
          }
          return html;
        }).join('')}
      </div>
    `).join('');
  // הכרטיס עם data-external-link (extraPdf למעלה) מטופל ע"י מאזין ה-capture
  // הגלובלי ב-refs.js לפני שהוא מגיע לכאן בכלל (stopPropagation) - אין צורך
  // לסנן אותו כאן במפורש, .card:not([data-external-link]) רק לניקיון.
  talmudMasechtotGrid.querySelectorAll('.card:not([data-external-link])').forEach(el => {
    el.addEventListener('click', () => {
      const name = el.dataset.masechet;
      const tool = MASECHET_TOOLS[name];
      const page = masechetPages[name];
      if (tool && tool.guideId){ closeTalmudView(); openGuide(tool.guideId, null); }
      else if (tool) openExternalGuide(tool.path, tool.title);
      else if (page) openCustomHtmlPage(page.name);
      else showMasechetAbout(name);   // 3.8.0: library.getBookDetails (shell/otzaria-extras.js)
    });
  });
}

function openTalmudView(){
  landing.style.display = 'none';
  frameWrap.classList.remove('open');
  if (!talmudRendered){ renderMasechtot(); talmudRendered = true; }
  talmudView.classList.add('open');
}
function closeTalmudView(){
  talmudView.classList.remove('open');
  landing.style.display = '';
}

document.getElementById('talmudCard').addEventListener('click', openTalmudView);
document.getElementById('talmudBackBtn').addEventListener('click', closeTalmudView);
// באנר "מהדורה חלקית" (מפרט 4.0, ג.4.2) - מפנה לפאנל הוספת דף HTML באזור האישי.
const talmudBannerAddLink = document.getElementById('talmudBannerAddLink');
if (talmudBannerAddLink) talmudBannerAddLink.addEventListener('click', (e) => {
  e.preventDefault();
  closeTalmudView();
  openPersonalArea('pages');
  openAddHtmlPanel();
});
