// פענוח מראי מקום (תנ״ך, בבלי, מדרש) ופתיחתם בספריית אוצריא.
// נוצר בפיצול router.js (גרסה 2.11.2). המקור: shell/router.js שורות 621-730.
// אין להפוך ל-type="module" — כל הקבצים חולקים scope גלובלי אחד.

const TANAKH_BOOKS = ['דברי הימים א','דברי הימים ב','שיר השירים','שמואל א','שמואל ב','מלכים א','מלכים ב','בראשית','שמות','ויקרא','במדבר','דברים','יהושע','שופטים','ישעיהו','ירמיהו','יחזקאל','הושע','יואל','עמוס','עובדיה','יונה','מיכה','נחום','חבקוק','צפניה','חגי','זכריה','מלאכי','תהלים','משלי','איוב','רות','איכה','קהלת','אסתר','דניאל','עזרא','נחמיה'];
const HEB_CH = /^[א-ת]{1,3}$/;

// נרמול משותף לפני פענוח (ת.1א) — סיבות-השורש שהפילו ~160 מראי מקום בדאטה:
// כתיב "תהילים", גרש כסימן ספרה ("נגעים א' ב'"), טווחי דפים ("סא ע"א – סג ע"ב"),
// וזנב אחרי סימן דף ("לא:, א"). הנרמול משנה רק את מה שנשלח לפענוח — הטקסט
// המוצג למשתמש נשאר כפי שנכתב, ולכן טווח דפים נשאר מוצג כטווח אבל נפתח
// בספרייה בדף הראשון שבו.
function normalizeRefText(ref){
  let s = String(ref).split(';')[0].replace(/\s*\([^)]*\)\s*$/, '').replace(/״/g, '"').trim();
  s = s.replace(/תהילים/g, 'תהלים');                               // הכתיב שב-TANAKH_BOOKS
  s = s.replace(/([א-ת])[׳'](?=[\s,.:]|$)/g, '$1');                // "נגעים א' ב'" → "נגעים א ב"
  s = s.replace(/\s*[–—-]\s*(?:[א-ת]{1,4}\s*)?(?:ע"[אב]|[.:])\s*$/, ''); // "…סא ע"א – סג ע"ב" → "…סא ע"א"
  s = s.replace(/(ע"[אב]|[.:])\s*,.*$/, '$1');                     // "לא:, א" / "פד.,תיאור…" → עד סימן הדף
  s = s.replace(/\s*[–—-]\s*[אב]$/, '');                           // "ע, א-ב" → "ע, א"
  return s.trim();
}

function parseVerseRef(ref){
  if (!ref) return null;
  const clean = normalizeRefText(ref);
  for (const book of TANAKH_BOOKS){
    // "ספר פרק, פסוק" (רוב המדריכים) — למשל "יהושע ה, ב"
    if (clean.startsWith(book + ' ')){
      const chapter = clean.slice(book.length + 1).trim().split(',')[0].trim().split(/\s+/)[0];
      if (HEB_CH.test(chapter)) return { bookId: book, ref: 'פרק ' + chapter };
    }
    // "ספר, פרק פסוק" (מדריך דומם) — למשל "איוב, כח א"
    if (clean.startsWith(book + ', ')){
      const chapter = clean.slice(book.length + 2).trim().split(/\s+/)[0].replace(',', '');
      if (HEB_CH.test(chapter)) return { bookId: book, ref: 'פרק ' + chapter };
    }
  }
  // מפרשים: "אבן עזרא על אסתר ב, ה" → ספר "אבן עזרא על אסתר"
  const m = clean.match(/^(.+? על .+?)\s+([א-ת]{1,3}),\s*.+$/);
  if (m) return { bookId: m[1].replace(/״/g, '"').trim(), ref: 'פרק ' + m[2] };
  return null;
}

// מזהה מראי מקום של חז"ל ("בבלי, ברכות לג ע\"א", "משנה, אבות ה, ה", "בראשית רבה נא, א"...)
// ומחזיר bookId+ref לפתיחה בספריית אוצריא. מחזיר null כשהמקור אינו ספר בספרייה.
// מסכתות הבבלי — כדי לזהות ציטוט בלי הקדמת "בבלי" ("מגילה י ע\"ב"), שהוא
// הצורה המקובלת בכתיבה. בלי הרשימה הזו כל ציטוט כזה נשאר טקסט מת שלא נפתח בספרייה.
const BAVLI_MASECHTOT = ['ברכות','שבת','עירובין','פסחים','שקלים','ראש השנה','יומא','סוכה',
  'ביצה','תענית','מגילה','מועד קטן','חגיגה','יבמות','כתובות','נדרים','נזיר','סוטה','גיטין',
  'קידושין','בבא קמא','בבא מציעא','בבא בתרא','סנהדרין','מכות','שבועות','עבודה זרה','הוריות',
  'זבחים','מנחות','חולין','בכורות','ערכין','תמורה','כריתות','מעילה','תמיד','נדה'];

function parseMidrashRef(source){
  if (!source) return null;
  const s = normalizeRefText(source);
  let m;
  // בבלי: "בבלי, ברכות לג ע"א" / "בבלי, חולין נב:" / "בבלי, חגיגה כז."
  // גם "בבלי שבת קכח, א" (העמוד ", א" במקום ע"א) וגם "בבלי מנחות דף מד."
  m = s.match(/^(?:משנה ו?גמרא|בבלי),?\s+([א-ת" ]+?)\s+(?:דף\s+)?([א-ת]{1,3})\s*(?:ע"[אב]|[.:]|,\s*[אב])?$/);
  if (m) return { bookId: m[1].trim(), ref: 'דף ' + m[2] };
  // מסכת בלי הקדמת "בבלי": "מגילה י ע"ב" / "קידושין מט:" / "בבא בתרא לח ע"א".
  // כאן סימן הדף (ע"א/ע"ב/נקודה/נקודתיים) הוא חובה, וגם השם חייב להיות מסכת
  // מוכרת — אחרת "בראשית רבה נא" וכדומה היו נתפסים כאן בטעות. העמוד ", א"
  // בכוונה *לא* מתקבל כאן: בלי הקדמת "בבלי" אי-אפשר להבדיל בינו לבין
  // "מסכת פרק, משנה" ("סוכה ה, ד").
  m = s.match(/^([א-ת" ]+?)\s+([א-ת]{1,3})\s*(?:ע"[אב]|[.:])$/);
  if (m && BAVLI_MASECHTOT.indexOf(m[1].trim()) !== -1) return { bookId: m[1].trim(), ref: 'דף ' + m[2] };
  // ירושלמי: "ירושלמי שביעית ו, א" / "ירושלמי שקלים ג ב" (בלי פסיק)
  m = s.match(/^ירושלמי,?\s+([א-ת" ]+?)\s+([א-ת]{1,3})\s*[,\s]\s*[א-ת]{1,3}$/);
  if (m) return { bookId: 'תלמוד ירושלמי ' + m[1].trim(), ref: 'פרק ' + m[2] };
  // משנה / תוספתא: "משנה, אבות ה, ה" / "תוספתא, פרה ט, ד" (גם בלי פסיק אחרי
  // הסוג, וגם בלי פסיק בין פרק למשנה — "משנה, קידושין א א")
  m = s.match(/^(משנה|תוספתא),?\s+([א-ת" ]+?)\s+([א-ת]{1,3})\s*[,\s]\s*[א-ת–-]{1,7}$/);
  if (m) return { bookId: m[1] + ' ' + m[2].trim(), ref: 'פרק ' + m[3] };
  // רמב"ם: "רמב"ם, הלכות בית הבחירה א, ב"
  m = s.match(/^רמב"ם,?\s+(הלכות [א-ת" ]+?)\s+([א-ת]{1,3})\s*,\s*[א-ת]{1,3}$/);
  if (m) return { bookId: 'משנה תורה, ' + m[1].trim(), ref: 'פרק ' + m[2] };
  // מפרש בפורמט "רש"י, במדבר לא נ" (פסיק במקום "על") → ספר "רש"י על במדבר".
  // רק כשהחלק השני הוא ספר תנ"ך מוכר — אחרת "משנה, אבות" וכדומה היו נתפסים.
  m = s.match(/^([א-ת"' ]+?),\s+([א-ת" ]+?)\s+([א-ת]{1,3})(?:\s*[,\s]\s*[א-ת]{1,4})?$/);
  if (m && TANAKH_BOOKS.indexOf(m[2].trim()) !== -1) return { bookId: m[1].trim() + ' על ' + m[2].trim(), ref: 'פרק ' + m[3] };
  // מדרש רבה: "בראשית רבה נא, א" / "בראשית רבה, פרשה יט" / "מדרש איכה רבה, פרשה א"
  m = s.match(/^([א-ת" ]+? רבה)\s*,?\s*(?:פרשה\s+)?([א-ת]{1,3})(?:\s*,\s*.+)?$/);
  if (m) return { bookId: m[1].replace(/^מדרש\s+/, '').trim(), ref: 'פרשה ' + m[2] };
  // 6.0.0 (#305) — ״מגילת תענית, אדר״: הספר בספריית אוצריא בנוי לפי חודשים (כותרות ניסן…אדר).
  // ״מאמר האחרון (ימי תענית)״ נמצא בסוף הספר, אחרי חודש אדר.
  m = s.match(/^מגילת תענית,\s*(.+)$/);
  if (m){
    const mon = ({ 'סיון': 'סיוון', 'מרחשון': 'חשון' })[m[1].trim()] || m[1].trim();
    return { bookId: 'מגילת תענית', ref: /^(ניסן|אייר|סיוון|תמוז|אב|אלול|תשרי|חשון|כסלו|טבת|שבט|אדר)$/.test(mon) ? mon : 'אדר' };
  }
  // 6.0.0 — מפרשי הבבלי: "רש"י על ערכין לב." / "תוספות על חולין נב ע"א"
  m = s.match(/^((?:רש"י|תוספות) על ([א-ת" ]+?))\s+([א-ת]{1,3})\s*(?:ע"[אב]|[.:])$/);
  if (m && BAVLI_MASECHTOT.indexOf(m[2].trim()) !== -1) return { bookId: m[1].trim(), ref: 'דף ' + m[3] };
  // מפרשים: "רש"י על יחזקאל מ, ב"
  m = s.match(/^(.+? על .+?)\s+([א-ת]{1,3}),\s*.+$/);
  if (m) return { bookId: m[1].trim(), ref: 'פרק ' + m[2] };
  // כללי: "פרקי דרבי אליעזר, פרק י"
  m = s.match(/^([א-ת" ]+?),\s*פרק\s+([א-ת]{1,3})$/);
  if (m) return { bookId: m[1].trim(), ref: 'פרק ' + m[2] };
  // שולחן ערוך: "שולחן ערוך, יורה דעה כ, א" (אותה שיטה כמו רמב"ם: bookId = "ספר, חלק")
  // מספר הסימן עד 4 אותיות: סימני אורח חיים מגיעים לתרצ"ז, ו-{1,3} פסל את כולם.
  // הסעיף רשות ("יורה דעה לג"), וגם טווח/רשימת סעיפים ("כג, א-ב" / "נח, א,ג").
  m = s.match(/^שולחן ערוך,?\s+(אורח חיים|יורה דעה|אבן העזר|חושן משפט)\s+([א-ת]{1,4})(?:\s*,\s*[א-ת]{1,3}(?:\s*[,–-]\s*[א-ת]{1,3})*)?$/);
  if (m) return { bookId: 'שולחן ערוך, ' + m[1].trim(), ref: 'סימן ' + m[2] };
  return null;
}

// מזהה כל ציטוט שניתן לפתוח בספרייה — פסוק, מקור חז"ל או מפרש.
function parseAnyRef(ref){
  return parseVerseRef(ref) || parseMidrashRef(ref);
}

function openInReader(bookId, ref){
  if (!(window.Otzaria && Otzaria.call)) return;
  Otzaria.call('reader.openBookAtRef', { bookId, ref, index: 0 }).then(r => {
    if (!r || !r.success) throw new Error('open failed');
  }).catch(() => {
    Otzaria.call('notifications.showInApp', { message: 'לא ניתן לפתוח את המקור כרגע בספרייה.', type: 'info' }).catch(() => {});
  });
}

// ---- קישורים חיצוניים ----
// לא נותנים ל-WebView לנווט ישירות (זה מה שקורס) — שואלים אישור בפופאפ
// ופותחים בדפדפן המערכת דרך app.openUrl, כמו בתוסף מקומות המקורי.
async function confirmOpenExternal(url){
  if (!(window.Otzaria && typeof Otzaria.call === 'function')){
    window.alert('פתיחת קישורים חיצוניים זמינה רק מתוך אוצריא.');
    return;
  }
  let hostname = url;
  try { hostname = new URL(url).hostname || url; } catch(_) { /* ignore */ }
  const res = await Otzaria.call('ui.showConfirm', {
    title: 'קישור לאתר חיצוני',
    content: `הקישור הזה מוביל אל האתר "${hostname}" — מחוץ לתוסף. האם לפתוח אותו בדפדפן המערכת שלכם?\n\n💚 אין לך אינטרנט? אתה שמור, אשריך! אתה מקיים את העולם — המשך כך, שכרך ישולם לך לעולם הבא, אבל תזכה לאכול מפירותיה גם בעולם הזה!`
  }).catch(() => null);
  if (!res || !res.success || !res.data || res.data.confirmed !== true) return;
  const r = await Otzaria.call('app.openUrl', { url }).catch(() => null);
  if (!r || !r.success){
    await Otzaria.call('ui.showError', { message: 'פתיחת הקישור נכשלה.' }).catch(() => {});
  }
}

document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-external-link]');
  if (!link) return;
  e.preventDefault();
  e.stopPropagation();
  if (!isOnline) return; // נעילת רשת — הכפתור כבר מסומן net-disabled, זו רק הגנה כפולה
  const url = link.getAttribute('data-external-link');
  if (url) confirmOpenExternal(url);
  else if (window.Otzaria && Otzaria.call) Otzaria.call('ui.showError', { message: 'קישור זה אינו נגיש מתוך התוסף.' }).catch(() => {});
}, true); // capture — לתפוס את הלחיצה לפני שהדפדפן מנווט

// ---- הסתרת פעולות שדורשות אינטרנט כשאין חיבור ----
// רק אלמנטים עם data-external-link (פתיחת אתר חיצוני) מסומנים data-requires-net.
// דיווח באגים (personal.js) לא מסומן בכוונה — הוא עובד אופליין (outbox מקומי).
// net-disabled = display:none לגמרי (לא רק עמעום/נעילה) — ר' router.css.
// כל הפונקציות כאן מוגנות ב-typeof כדי שהקובץ יישאר טעין בבטחה גם בסביבת ה-vm
// המצומצמת של tools/lib/load.js (loadRefParsers) - אין שם navigator/MutationObserver.
let isOnline = (typeof navigator !== 'undefined') ? navigator.onLine : true;

function applyOnlineState() {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return;
  document.querySelectorAll('[data-requires-net]').forEach((el) => {
    el.disabled = !isOnline;
    el.classList.toggle('net-disabled', !isOnline);
  });
  // התמונה המשלימה (2.17.2): אלמנט שקיים **רק** כשאין רשת. הצורך עלה מכתובת
  // הטופס בפאנל הדיווח — כשיש חיבור זה קישור שנפתח בלחיצה, וכשאין חיבור קישור
  // כזה חסר משמעות ובמקומו צריך כפתור העתקה, כדי שאפשר יהיה לשלוח ממכשיר אחר.
  // שני האלמנטים נכתבים תמיד; רק אחד מהם גלוי בכל רגע.
  document.querySelectorAll('[data-offline-only]').forEach((el) => {
    el.classList.toggle('net-disabled', !!isOnline);
  });
}

// עד 2.17.2 זו הייתה בקשת HEAD ל-otzaria.org דרך network.fetch. שני דברים היו רעים
// בזה: (1) network.fetch **מוסר ב-0.9.98**, ומאותו רגע הקריאה הייתה נכשלת תמיד,
// isOnline היה ננעל על false, וכל הקישורים החיצוניים היו נעלמים גם למי שיש לו
// אינטרנט; (2) הבדיקה התעלמה מהגדרת ״ללא גישה לאינטרנט״ של אוצריא עצמה — משתמש
// שסימן אותה עדיין ראה קישורים חיצוניים.
//
// app.getConnectivity מחזיר את שניהם: isOfflineMode (ההגדרה) ו-hasNetwork (חיבור
// בפועל), ו-isOnline הוא הצירוף. אוצריא שומרת את התוצאה ל-30 שניות, ולכן אין צורך
// ב-timeout ידני ואסור לקרוא לזה מכל רינדור (מגביל קצב RPC).
async function verifyOnline(forceRefresh) {
  if (typeof Otzaria === 'undefined' || !Otzaria.call) return;   // גרסה עצמאית: navigator.onLine
  try {
    let res = await Otzaria.call('app.getConnectivity', forceRefresh ? { forceRefresh: true } : {});
    // null = ״טרם הוכרע״: אוצריא לא מעכבת את פתיחת התוסף כדי להמתין לרשת.
    // מנסים שוב פעם אחת, ורק אז מוותרים.
    if (res && res.success && res.data && res.data.isOnline === null) {
      res = await Otzaria.call('app.getConnectivity');
    }
    isOnline = !!(res && res.success && res.data && res.data.isOnline);
  } catch {
    isOnline = false;
  }
  applyOnlineState();
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  // מעבר מנותק→מחובר הוא בדיוק "נקודת מעבר משמעותית" שבה התיעוד מתיר forceRefresh:
  // בלעדיו התשובה השמורה (עד 30 שניות) עדיין תגיד "אין רשת".
  window.addEventListener('online',  () => { verifyOnline(true); });
  window.addEventListener('offline', () => { isOnline = false; applyOnlineState(); });
}
applyOnlineState();
verifyOnline();

// אלמנטי data-requires-net נוצרים ברובם דינמית (פאנלים/פופאפים שנפתחים אחרי הטעינה),
// אז סריקה חד-פעמית בעלייה לא מספיקה — צופים בהוספות ל-DOM ומיישמים עליהן את המצב
// הידוע כבר (isOnline). זו לא בדיקת רשת חוזרת, רק סנכרון תצוגה לאלמנט חדש.
if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined' && document.body) {
  new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        const sel = '[data-requires-net],[data-offline-only]';
        if (node.matches && node.matches(sel) || (node.querySelector && node.querySelector(sel))) {
          applyOnlineState();
          return;
        }
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}
