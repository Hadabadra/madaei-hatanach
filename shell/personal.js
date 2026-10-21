// האזור האישי — חמש הלשוניות ושליחה למפתח.
// נוצר בפיצול router.js (גרסה 2.11.2). המקור: shell/router.js שורות 2007-2371.
// אין להפוך ל-type="module" — כל הקבצים חולקים scope גלובלי אחד.


// ============================================================
//  האזור האישי
//  אינו מאגר חדש: הוא התצוגה המרוכזת של מה שכבר נשמר במכשיר —
//  סימניות (BOOKMARKS_KEY), עריכות מקומיות (<cat>_edits_v1), טיוטות
//  הצעות (<cat>_nf_drafts_v1), דיווחי זיהוי (identify_error_reports_v1)
//  ודפי ה-HTML השמורים. כך אין סיכון לאבד עריכות קיימות בעדכון גרסה.
// ============================================================
const IDENTIFY_REPORTS_KEY = 'identify_error_reports_v1';
const personalView = document.getElementById('personalView');
const personalBody = document.getElementById('personalBody');
let activePersonalTab = 'bookmarks';

// ============================================================
//  4.1 — ממסר הדיווחים (2.13.2, מסלול ראשי הוחלף ב-2.15.1)
//  שלושה תנאים מחייבים: לא מייל · לא קישור חיצוני · לא ליפול כשאין רשת.
//
//  ✅ מסלול א׳ (ראשי) — Web App (doPost + פריסה כ-`/exec`) על אותו פרויקט
//  Apps Script הקיים. **זה בדיוק הדפוס שהתוסף "ביוגרפיות" מריץ בהצלחה בפועל
//  בתוך אוצריא** (ר' סקריפט-גוגל-אוצריא.txt, שסופק ע"י מפתחו): fetch רגיל
//  (לא no-cors!) עם CORS preflight אמיתי - EmailJS שם שולח
//  Content-Type: application/json ומקבל תשובה קריאה בחזרה. זו ההוכחה
//  שה-WebView של אוצריא **תומך** ב-fetch מלא, כולל preflight - אז אין סיבה
//  להסתפק בניחוש עיוור דרך no-cors כמו קודם. Content-Type כאן הוא
//  text/plain דווקא (לא application/json): בניגוד ל-EmailJS, Web App של
//  Apps Script לא מיישם doOptions, ופרילייט אמיתי היה נכשל שם - text/plain
//  הוא "בקשה פשוטה" בלי preflight, ו-doPost קורא את e.postData.contents
//  כטקסט גולמי בכל מקרה ומפרק בעצמו עם JSON.parse (בדיוק כמו הסקריפט של
//  אוצריא עצמה). "הצלחה" כאן היא result.success===true אמיתי, לא ניחוש.
//
//  מסלול ב׳ (גיבוי) — docs.google.com/.../formResponse, כפי שהיה עד כה:
//  אם script.google.com חסום אצל משתמש מסוים אבל docs.google.com פתוח,
//  עדיין יש דרך לצאת. כאן עדיין no-cors, ולכן "הצלחה" = "לא זרק" בלבד -
//  ומכאן שה-outbox חובה: פריט נמחק מהתור רק אחרי שליחה שלא זרקה, ואם זרקה
//  הוא נשאר לניסיון הבא בפתיחה הבאה.
// ============================================================
// נפרס ואומת 10.8.26 — curl/fetch אמיתי דרך הכתובת הזו פתח את
// github.com/Hadabadra/madaei-hatanach/issues/8 בפועל, עם
// success:true אמיתי בתשובה (לא ניחוש דרך no-cors).
const REPORT_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxzlCAZzhaEM68jRqqekW8InrtbSiZrtiiIjgCKOInUvyBG43wLY29MYY6PrbHijpO6/exec';
const REPORT_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSd7NiGDUahnwpaestosEcDxPJoAkYXzVRUa2yB5EiXkLPSWvQ/formResponse';
// אותו טופס בדיוק, בכתובת הצפייה — זה מה שמעתיקים למי שאין לו חשבון גיטהאב.
// מילוי הטופס בדפדפן נכנס לאותו גיליון ומשם לאותו Issue, בלי שום הרשמה.
const REPORT_FORM_VIEW_URL = REPORT_FORM_URL.replace('/formResponse', '/viewform');
const REPORT_FIELD_KIND    = 'entry.1407711891';   // סוג
const REPORT_FIELD_TITLE   = 'entry.261441606';    // כותרת
const REPORT_FIELD_DETAILS = 'entry.1548335987';   // פרטים
const REPORT_FIELD_ENV     = 'entry.932826683';    // סביבה
// ⚠️ למלא לפני שימוש: כתובת אמיתית שמישהו/סקריפט קורא ממנה (Gmail עם טריגר
// Apps Script מתוזמן שסורק הודעות חדשות וכותב לאותו גיליון - תשתית נפרדת,
// לא קיימת עדיין). בלי זה הכפתור פותח מייל שלא מגיע לשום מקום.
const REPORT_MAILTO_TARGET = 'ANSWER-HERE@example.com';
const REPORT_OUTBOX_KEY = 'madaei_report_outbox_v1';
const REPORT_DEBUG_KEY = 'madaei_report_debug_v1';   // 5 הניסיונות האחרונים, לאבחון
const REPORT_DEBUG_MAX = 5;
const REPORT_OUTBOX_MAX = 20;             // מעבר לזה — הישן ביותר נמחק
const REPORT_SEND_TIMEOUT_MS = 8000;      // שלא תישאר בקשה תלויה
const REPORT_STEP_TIMEOUT_MS = 4000;      // תקרה לכל קריאת גשר/קובץ מקומי
const REPORT_TITLE_MAX = 120;             // הטריגר חותך ל-120 בכותרת ה-Issue
const REPORT_DETAILS_MAX = 6000;
// ---- כתובת לתשובה (3.3.4) ----
// עד כאן השדה היה "רשות", והתוצאה בפועל: רוב ה-Issues נפתחו בלי שום דרך לחזור
// לשולח — לא ב-Issue ולא במייל. מ-3.3.4 היא **חובה**, ונשמרת במכשיר אחרי
// ההזנה הראשונה כדי שלא נבקש אותה שוב בכל דיווח. השמירה כפולה בכוונה
// (גשר + localStorage): הצעת עריכה נשלחת בלי טופס ולכן צריכה קריאה מיידית,
// ולא תמיד יש גשר זמין באותו רגע.
const REPORT_EMAIL_KEY = 'madaei_report_reply_email_v1';

function isValidReplyEmail(v){
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v == null ? '' : v).trim());
}

async function readReplyEmail(){
  try {
    if (hasOtzaria()){
      const v = await withTimeout(storageGetJson(REPORT_EMAIL_KEY), REPORT_STEP_TIMEOUT_MS, 'email-read').catch(() => null);
      if (typeof v === 'string' && v) return v;
    }
  } catch(e){}
  try { return localStorage.getItem(REPORT_EMAIL_KEY) || ''; } catch(e){ return ''; }
}

async function saveReplyEmail(v){
  const clean = String(v == null ? '' : v).trim();
  if (!isValidReplyEmail(clean)) return;
  try { localStorage.setItem(REPORT_EMAIL_KEY, clean); } catch(e){}
  try { if (hasOtzaria()) await storageSetJson(REPORT_EMAIL_KEY, clean); } catch(e){}
}

// לשליחה שאין לה טופס (הצעת עריכה מכרטיס) — מחזיר את הכתובת השמורה, ואם אין
// כזו מבקש אותה פעם אחת. מחזיר '' אם המשתמש ויתר, ואז השליחה נעצרת.
async function ensureReplyEmail(){
  const saved = await readReplyEmail();
  if (isValidReplyEmail(saved)) return saved;
  // 4.4.0 — feedback.hasReporterEmail: אם באוצריא שמורה כתובת לדיווחים, אומרים
  // זאת — העותק שנשלח למערכת המשוב יישא אותה. הכתובת עצמה אינה נחשפת לתוסף.
  let hint = '';
  if (hasOtzaria()){
    try {
      const r = await withTimeout(Otzaria.call('feedback.hasReporterEmail'), REPORT_STEP_TIMEOUT_MS, 'hasReporterEmail');
      if ((r && r.data !== undefined ? r.data : r) === true) hint = '\n(בהגדרות הדיווח של אוצריא כבר שמורה כתובת — היא תצורף לעותק שנשלח לאוצריא. כאן היא נדרשת עבור תשובה מהמפתח.)';
    } catch(e){}
  }
  const typed = (await uiPrompt('כתובת אימייל לתשובה (חובה — כדי שנוכל לחזור אליכם על ההצעה):' + hint, saved || ''));
  if (typed === null) return '';
  const clean = typed.trim();
  if (!isValidReplyEmail(clean)){
    window.alert('הכתובת אינה תקינה — ההצעה לא נשלחה. אפשר לנסות שוב.');
    return '';
  }
  await saveReplyEmail(clean);
  return clean;
}
// ---- תמונות (2.16.2) ----
// כל תמונה מוקטנת ל-JPEG לפני השליחה, ולא נשלחת כמו שהיא: צילום מסך של מכשיר
// מודרני הוא 2-4MB, ובבסיס-64 זה גדל בעוד שליש. הקטנה ל-1600px היא הפרש של
// פי עשרה בלי לאבד קריאוּת של טקסט במסך.
const REPORT_IMG_MAX = 4;                 // מספר תמונות לדיווח
const REPORT_IMG_SRC_MAX = 12 * 1024 * 1024;  // קובץ מקור שגדול מזה נדחה מיד
const REPORT_IMG_DIM = 1600;              // הצלע הארוכה אחרי ההקטנה
const REPORT_IMG_QUALITY = 0.82;
const REPORT_IMG_TOTAL_MAX = 6 * 1024 * 1024; // סך כל ה-dataURL בדיווח אחד
const REPORT_FLUSH_DELAY_MS = 4000;       // אחרי שהתוסף כבר שימושי
// "משוב" ראשון בכוונה - זו נקודת הכניסה החופשית/הכי-פחות-מחייבת (במקום לשונית
// "משוב למפתח" הנפרדת שבוטלה - ר' renderPersonalDrafts). "בקשת הצטרפות" (ג.4.4)
// נכנסה לאותה רשימה במקום ערוץ תקשורת חמישי.
const REPORT_KINDS = [
  { id: 'משוב',       label: '💬 משוב — הערה, טעות, או סתם לומר תודה' },
  { id: 'באג בקוד',   label: '🐞 באג בקוד — משהו בתוסף לא עובד' },
  { id: 'טעות בתוכן', label: '📖 טעות בתוכן — פרט לא נכון בערך' },
  { id: 'הצעה',       label: '💡 הצעה — רעיון לשיפור' },
  { id: 'בקשת הצטרפות', label: '🤝 בקשת הצטרפות — לעזור בכתיבה ובעריכה' }
];
// כתובת הדיווחים הידנית — למי שמעדיף לפתוח Issue בעצמו, או שהשליחה אצלו חסומה.
// לא נפתחת בניווט ישיר אלא דרך data-external-link ⇒ confirmOpenExternal (refs.js).
const REPORT_ISSUES_URL = 'https://github.com/Hadabadra/madaei-hatanach/issues';

// התור נשמר ב-plugin.storage כשיש אוצריא (שורד עדכון גרסה), ובדפדפן חשוף
// נופל ל-localStorage כדי שגם בדיקה מחוץ לאוצריא תתנהג אותו דבר.
function reportOutboxRead(){
  if (hasOtzaria()) return storageGetJson(REPORT_OUTBOX_KEY).then(v => Array.isArray(v) ? v : []);
  const v = readJsonLS(REPORT_OUTBOX_KEY, []);
  return Promise.resolve(Array.isArray(v) ? v : []);
}
function reportOutboxWrite(list){
  if (hasOtzaria()) return storageSetJson(REPORT_OUTBOX_KEY, list);
  try { localStorage.setItem(REPORT_OUTBOX_KEY, JSON.stringify(list)); } catch(e){}
  return Promise.resolve(true);
}

// כל קריאה לגשר של אוצריא או ל-fetch מקבלת תקרת זמן. Promise שנתקע (ולא
// נכשל!) הוא כישלון שקט שאי-אפשר לאבחן — בדיוק מה שקרה ב-2.13.2, שם
// reportEnv רץ *לפני* השמירה בתור, וכל תקיעה שלו מנעה גם את השמירה וגם את
// השליחה בלי שום הודעה. מאז: קודם שומרים, ולכל שלב יש timeout.
function withTimeout(promise, ms, label){
  return new Promise((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => { if (!done){ done = true; reject(new Error('timeout: ' + (label || ''))); } }, ms);
    Promise.resolve(promise).then(
      v => { if (!done){ done = true; clearTimeout(timer); resolve(v); } },
      e => { if (!done){ done = true; clearTimeout(timer); reject(e); } }
    );
  });
}

// "סביבה" — גרסת התוסף מהמניפסט שנארז (לא קבוע בקוד שיתיישן) + גרסת אוצריא.
// לעולם לא זורקת ולעולם לא נתקעת: הגרוע ביותר הוא מחרוזת עם "—".
let reportEnvCache = null;
async function reportEnv(){
  if (reportEnvCache) return reportEnvCache;
  let plug = '—', otz = '—';
  // EMBEDDED_PLUGIN_VERSION (guides/_shared/version-embedded.js), לא
  // fetch('manifest.json') - זה נכשל בפועל בתוך ה-WebView של אוצריא, ר' bridge.js.
  try {
    if (typeof EMBEDDED_PLUGIN_VERSION !== 'undefined' && EMBEDDED_PLUGIN_VERSION) plug = String(EMBEDDED_PLUGIN_VERSION);
  } catch(e){}
  if (hasOtzaria()){
    try {
      const res = await withTimeout(Otzaria.call('app.getInfo'), REPORT_STEP_TIMEOUT_MS, 'app.getInfo');
      // הגשר לא תמיד עוטף ב-.data (ר' com.software_bug_report.newplugin -
      // התוסף הרשמי לדיווח באגים - שמטפל בשתי הצורות). res.data.version
      // הבלעדי גרם ל"אוצריא —" בדיווחים בכל פעם שהתשובה הגיעה שטוחה.
      const data = (res && res.data) || res || {};
      const v = data && data.version;
      if (v) otz = String(v);
    } catch(e){}
  }
  reportEnvCache = 'עינים למקרא ' + plug + ' · אוצריא ' + otz;
  return reportEnvCache;
}

function reportNotify(message, type){
  if (hasOtzaria()){
    Otzaria.call('notifications.showInApp', { message: message, type: type || 'success' })
      .catch(() => { try { window.alert(message); } catch(e){} });
    return;
  }
  try { window.alert(message); } catch(e){}
}

function reportParams(item, env){
  const p = new URLSearchParams();
  const n = (item.images || []).length;
  p.set(REPORT_FIELD_KIND, item.kind || 'דיווח');
  p.set(REPORT_FIELD_TITLE, item.title || 'דיווח מהתוסף');
  // שדה טופס הוא טקסט: תמונה בבסיס-64 לא נכנסת לתוכו, ומסלול הגיבוי לכן חסר
  // תמונות מעצם טבעו. עדיף לומר זאת בגוף ה-Issue מאשר שהמתחזק יתהה איפה הן.
  p.set(REPORT_FIELD_DETAILS, (item.details || '')
    + (n ? '\n\n_(' + n + ' תמונות צורפו לדיווח אך לא נשלחו — הוא יצא במסלול הגיבוי, שאינו תומך בתמונות.)_' : ''));
  p.set(REPORT_FIELD_ENV, env || item.env || '');
  return p;
}

// מסלול א׳ (ראשי) — Web App. **הצורה כאן זהה בכוונה לזו של תוסף "דיווח באגים"
// (com.software_bug_report.newplugin), שרץ בהצלחה מוכחת בתוך אוצריא:**
//
//     await fetch(SCRIPT_URL, { method:'POST', mode:'no-cors', body: JSON.stringify(...) });
//
// בלי headers · בלי signal · בלי לקרוא את התשובה. כל אחד משלושת אלה נוסה כאן
// עד 2.16.1 ונכשל ב-WebView (הדיווח היחיד שהצליח, Issue #10, נשלח מדפדפן —
// מעיד על כך "אוצריא —" בשדה הסביבה שלו, כלומר app.getInfo לא ענה כלל).
//
// למה בטוח לוותר על קריאת התשובה: `doPost` בצד גוגל רץ **ברגע שה-POST מגיע**,
// והוא מסיים לפתוח את ה-Issue לפני שהתשובה בכלל נשלחת חזרה. נמדד: קריאות שכשלו
// בשלב קריאת התשובה (411/404 על ההפניה ל-googleusercontent) פתחו Issues 11-14
// בפועל. כלומר קריאת התשובה מוסיפה נקודות כשל ולא מוסיפה שום ודאות.
//
// ⚠️ המחיר, ולכן ה-outbox נשאר חובה: no-cors מחזיר תשובה אטומה, ולכן "הצלחה"
// כאן היא "הבקשה יצאה בלי חריגה" בלבד. ה-id בגוף הבקשה מאפשר לצד גוגל לזרוק
// כפילויות אם בכל זאת נשלח פעמיים (ר' סעיף ה-idempotency בסקריפט).
function postViaWebApp(item, env){
  if (!REPORT_WEBAPP_URL) return Promise.reject(new Error('webapp not configured'));
  const payload = {
    id: item.id || '',
    kind: item.kind || 'דיווח',
    title: item.title || 'דיווח מהתוסף',
    details: item.details || '',
    env: env || item.env || '',
    images: Array.isArray(item.images) ? item.images.map(im => im && im.dataUrl).filter(Boolean) : []
  };
  // AbortController נזרק כאן במתכוון (ר' למעלה) ולכן התקרה היא מרוץ חיצוני:
  // ה-fetch ממשיך ברקע, ואם הוא יצליח אחרי שוויתרנו — ה-id ימנע כפילות.
  return withTimeout(
    fetch(REPORT_WEBAPP_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(payload)
    }).then(() => 'webapp'),
    REPORT_SEND_TIMEOUT_MS, 'webapp'
  );
}

// מסלול ב׳ (גיבוי) — fetch עם no-cors לטופס. גוף URLSearchParams מייצר לבדו
// Content-Type: application/x-www-form-urlencoded, כלומר "בקשה פשוטה" בלי preflight.
function postViaFetch(params){
  const ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
  const timer = setTimeout(() => { try { ctrl && ctrl.abort(); } catch(e){} }, REPORT_SEND_TIMEOUT_MS);
  return fetch(REPORT_FORM_URL, {
    method: 'POST',
    mode: 'no-cors',
    body: params,
    signal: ctrl ? ctrl.signal : undefined
  }).then(
    () => { clearTimeout(timer); return 'fetch'; },
    err => { clearTimeout(timer); throw err; }
  );
}

// מסלול ג׳ — שליחת טופס אמיתי לתוך iframe מוסתר. זו **ניווט של הדפדפן**
// ולא קריאת fetch, ולכן היא עוברת גם כשה-WebView של אוצריא חוסם/עוטף fetch.
// זה הדפוס הוותיק של Google Forms, ואין בו CORS כלל.
// ⚠️ סיכון ידוע: אם ה-WebView חוסם ניווט לגמרי אבל עדיין מיידה load על
// about:blank, זה עלול להיקרא "הצלחה" בטעות. לכן הוא רק המסלול השלישי -
// אחרי שגם ה-Web App וגם ה-fetch הרגיל נכשלו בפועל (לא רק "לא הוגדר").
function postViaIframe(params){
  return new Promise((resolve, reject) => {
    let ifr, form, done = false, submitted = false;
    const cleanup = () => { try { ifr && ifr.remove(); } catch(e){} try { form && form.remove(); } catch(e){} };
    const timer = setTimeout(() => {
      if (done) return;
      done = true; cleanup(); reject(new Error('iframe timeout'));
    }, REPORT_SEND_TIMEOUT_MS);
    try {
      const name = 'tmnchRelay' + Math.random().toString(36).slice(2, 9);
      ifr = document.createElement('iframe');
      ifr.name = name;
      ifr.setAttribute('aria-hidden', 'true');
      ifr.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none;';
      // 3.3.2 — ה-load של about:blank (ההוספה עצמה) נורה *אחרי* שהקוד הסינכרוני
      // כאן הספיק לסמן submitted=true, ולכן הבדיקה `!submitted` הישנה לא סיננה
      // אותו כלום — כל שליחה "הצליחה" מיד, גם כשה-WebView חסם את הניווט ושום
      // דיווח לא יצא (זה ה"קלוד טוען שזה בסדר" מהפורום). הסדר החדש: מחכים
      // ל-load הראשון (about:blank), רק אז שולחים את הטופס, ורק load *שני*
      // נחשב תשובה. אם ה-load הראשון לא מגיע — timeout, שנקרא ככישלון וממשיך
      // ל-outbox — כישלון-שווא עדיף על הצלחת-שווא.
      ifr.addEventListener('load', () => {
        if (done) return;
        if (!submitted){
          submitted = true;
          try { form.submit(); }
          catch(e){ done = true; clearTimeout(timer); cleanup(); reject(e); }
          return;
        }
        done = true; clearTimeout(timer); cleanup(); resolve('iframe');
      });
      form = document.createElement('form');
      form.action = REPORT_FORM_URL;
      form.method = 'POST';
      form.target = name;
      form.style.display = 'none';
      params.forEach((v, k) => {
        const inp = document.createElement('input');
        inp.type = 'hidden'; inp.name = k; inp.value = v;
        form.appendChild(inp);
      });
      document.body.appendChild(form);
      // src מפורש כדי להבטיח שאירוע ה-load הראשון באמת יגיע (iframe בלי src
      // יורה load ב-Chromium, אבל עדיף לא להסתמך על זה בתוך WebView).
      ifr.src = 'about:blank';
      document.body.appendChild(ifr);
    } catch(e){
      if (!done){ done = true; clearTimeout(timer); cleanup(); reject(e); }
    }
  });
}

// ---- המסלול הרשמי של אוצריא (3.1.0) --------------------------------------
// אוצריא הוסיפה API דיווח משלה. זה עדיף על הממסר שלנו מסיבה מהותית אחת:
// הוא **אינו עובר ברשת של התוסף**, ולכן אינו כפוף ל-plugin_network_allowlist
// הגלובלי — שאף אחת מכתובות הדיווח שלנו אינה נמצאת בו (ר' §ב.1 ב-
// docs/תאימות-SDK-אוצריא.md). כלומר היום הדיווחים של המשתמשים נחסמים בפועל,
// והמסלול הזה פותר את זה בלי שום תלות ב-PR חיצוני.
//
// ⚠️ 0.9.97 ומעלה בלבד, ולכן:
//   • שם המתודה מורכב ממערך ולא קיים כליטרל — אחרת הוולידטור חוסם את אריזת
//     חבילת ה-0.9.96 (אותה מלכודת בדיוק כמו network.fetchStream).
//   • ההרשאה "feedback.report" מוצהרת **רק** במניפסט של וריאנט 0.9.97
//     (build/pack-997-variant.ps1) — הצהרתה בחבילת הבסיס הייתה שוברת התקנה
//     על 0.9.96, כמו שקרה עם contributes.startup ב-13.8.26.
// בגרסה שאינה תומכת callIfSupported מחזיר null בשקט, ואז ממשיכים לממסר הישן.
//
// REPORT_KINDS שלנו מפורטים יותר מארבעת הסוגים של ה-API; מה שאין לו מקבילה
// נופל ל-other, כפי שה-API עצמו עושה ממילא לערך לא מוכר.
const FEEDBACK_REPORT_TYPES = {
  'באג בקוד': 'bug',
  'טעות בתוכן': 'content',
  'משוב': 'other',
  'הצעה': 'other',
  'בקשת הצטרפות': 'other'
};

// מחזיר 'sent' / 'queued' אם הצליח, 'cancelled' אם המשתמש ביטל בדיאלוג,
// או null אם המסלול אינו זמין (גרסה ישנה / הרשאה חסרה / שגיאה).
// גוף ההודעה נכתב כ-Markdown, כי היעד העיקרי הוא GitHub Issue — שם ה-`**` וה-`##`
// הם מה שמדגיש איזה כרטיס נערך ומה השתנה בו. מערכת המשוב של אוצריא מציגה טקסט
// גולמי, ולכן אותם סימנים נראים שם כזבל ודווקא מטשטשים את ההדגשה. ההמרה כאן
// שומרת על המבנה (כותרת, בולטים, "לפני ← אחרי") בלי תווי הסימון.
function markdownToPlain(md){
  return String(md == null ? '' : md)
    .replace(/^#{1,6}\s*/gm, '')        // ## כותרת → כותרת
    .replace(/\*\*(.+?)\*\*/g, '$1')    // **מודגש** → מודגש
    .replace(/^\s*\*\s+/gm, '• ');      // * בולט → • בולט
}

async function postViaOtzariaFeedback(item, env){
  if (!hasOtzaria()) return null;
  const body = [
    item.title ? ('נושא: ' + item.title) : '',
    item.kind ? ('סוג: ' + item.kind) : '',
    '',
    markdownToPlain(item.details || ''),
    env ? ('\n---\n' + env) : ''
  ].filter(Boolean).join('\n');
  // 3.8.0 — קריאה ישירה: הרצפה 0.9.98, ואין עוד צורך ב-callIfSupported.
  let res = null;
  try {
    res = await Otzaria.call('feedback.report', {
      details: body.slice(0, 5000),          // ה-API חותך ל-5000 ממילא
      reportType: FEEDBACK_REPORT_TYPES[item.kind] || 'other'
    });
  } catch(e){ return null; }
  if (res == null) return null;
  const val = (res && (res.data !== undefined ? res.data : res));
  return (val === 'sent' || val === 'queued' || val === 'cancelled') ? val : null;
}

// זורק חריגה רק אם **כל** המסלולים נכשלו. מחזיר את שם המסלול שהצליח,
// ושומר את נוסח כל הכישלונות ל-lastError של הפריט (לאבחון באזור האישי).
// סדר: ה-API הרשמי של אוצריא קודם (3.1.0) — ואם אינו זמין, הממסר הישן נשאר
// כמות שהוא: Web App קודם (תשובה אמיתית), והטופס רק אם הוא לא הוגדר או נכשל.
async function postReportToRelay(item, env){
  const errors = [];
  const ok = [];
  // ⚠️ 3.3.4 — היפוך סדר. עד כאן `feedback.report` רץ ראשון ו**חזר מיד** בהצלחה,
  // ולכן ה-Web App כלל לא נקרא — והוא היחיד שפותח GitHub Issue. התוצאה: מאז
  // 3.1.0 הדיווחים הגיעו רק למערכת המשוב של אוצריא, והריפו נשאר ריק. הגיטהאב
  // הוא היעד העיקרי, ולכן הוא נשלח **תמיד**, ו-feedback.report הוא העתק נוסף.
  // (הכתובת מוצהרת ב-network.allowlist שבמניפסט, ולכן אינה חסומה.)
  if (REPORT_WEBAPP_URL){
    try { ok.push(await postViaWebApp(item, env)); }
    catch(e){ errors.push((e && (e.name + ': ' + e.message)) || String(e)); }
  }
  let cancelled = false;
  try {
    const viaOtz = await postViaOtzariaFeedback(item, env);
    // ביטול בדיאלוג של אוצריא הוא "אל תשלח בערוץ הזה", לא ביטול הדיווח כולו —
    // המשתמש כבר לחץ "שליחה" אצלנו. לכן הוא חוסם רק את הממסר הישן, ורק אם
    // שום מסלול אחר לא הצליח.
    if (viaOtz === 'cancelled') cancelled = true;
    else if (viaOtz) ok.push('otzaria-feedback (' + viaOtz + ')');
  } catch(e){
    errors.push((e && (e.name + ': ' + e.message)) || String(e));
  }
  if (ok.length) return ok.join(' + ');
  if (cancelled){
    const cancelErr = new Error('הדיווח בוטל על ידך.');
    cancelErr.cancelled = true;
    throw cancelErr;
  }
  const params = reportParams(item, env);
  for (const t of [postViaFetch, postViaIframe]){
    try { return await t(params); }
    catch(e){ errors.push((e && (e.name + ': ' + e.message)) || String(e)); }
  }
  const err = new Error(errors.join(' | '));
  err.attempts = errors;
  throw err;
}

function newReportItem(kind, title, details, env, images){
  return {
    id: 'r' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    kind: kind || 'דיווח',
    title: String(title == null ? '' : title).trim().slice(0, REPORT_TITLE_MAX) || 'דיווח מהתוסף',
    details: String(details == null ? '' : details).slice(0, REPORT_DETAILS_MAX),
    env: env || '',
    images: Array.isArray(images) ? images.slice(0, REPORT_IMG_MAX) : [],
    savedAt: new Date().toISOString()
  };
}

// ⚠️ כל שלב כאן חייב תקרת זמן. עד 2.16.1 זו הייתה קריאת הגשר היחידה בקובץ בלי
// withTimeout, ולכן storage.get שנתקע (ולא נכשל) בלע את השליחה כולה בשקט מוחלט —
// המשתמש לחץ "שליחה", הפאנל נסגר, ושום הודעה לא הופיעה. אם השמירה לא הצליחה,
// ממשיכים לשלוח בכל זאת: דיווח שנשלח ולא נשמר עדיף על דיווח שלא קרה כלום.
async function queueReport(item){
  try {
    const list = await withTimeout(reportOutboxRead(), REPORT_STEP_TIMEOUT_MS, 'outbox-read');
    list.push(item);
    while (list.length > REPORT_OUTBOX_MAX) list.shift();   // הישן ביותר נופל
    await withTimeout(reportOutboxWrite(list), REPORT_STEP_TIMEOUT_MS, 'outbox-write');
    return true;
  } catch(e){
    await reportDebugLog({ ok: false, err: 'queue: ' + ((e && e.message) || String(e)), title: item.title });
    return false;
  }
}

async function removeFromOutbox(id){
  const list = (await reportOutboxRead()).filter(x => x && x.id !== id);
  await reportOutboxWrite(list);
  return list;
}

// מסמן על הפריט למה הניסיון האחרון נכשל — כדי שאפשר יהיה לראות זאת
// באזור האישי במקום לנחש.
async function markOutboxError(id, message){
  const list = await reportOutboxRead();
  const hit = list.find(x => x && x.id === id);
  if (!hit) return list;
  hit.lastError = String(message || '').slice(0, 300);
  hit.tries = (hit.tries || 0) + 1;
  await reportOutboxWrite(list);
  return list;
}

// יומן אבחון קצר — בלעדיו "שלחתי ולא הגיע" הוא חידה סתומה.
// נשמר לצד התור, ומוצג באזור האישי מתחת לשורת הממתינים.
async function reportDebugLog(entry){
  try {
    let list = null;
    if (hasOtzaria()) list = await withTimeout(storageGetJson(REPORT_DEBUG_KEY), REPORT_STEP_TIMEOUT_MS, 'debug-read').catch(() => null);
    else list = readJsonLS(REPORT_DEBUG_KEY, []);
    if (!Array.isArray(list)) list = [];
    list.push(Object.assign({ at: new Date().toISOString() }, entry));
    while (list.length > REPORT_DEBUG_MAX) list.shift();
    if (hasOtzaria()) await storageSetJson(REPORT_DEBUG_KEY, list);
    else localStorage.setItem(REPORT_DEBUG_KEY, JSON.stringify(list));
  } catch(e){}
}

function reportDebugRead(){
  if (hasOtzaria()) return storageGetJson(REPORT_DEBUG_KEY).then(v => Array.isArray(v) ? v : []).catch(() => []);
  const v = readJsonLS(REPORT_DEBUG_KEY, []);
  return Promise.resolve(Array.isArray(v) ? v : []);
}

// שליחה יזומה של המשתמש: **קודם לתור, ורק אחר כך כל השאר.**
// הסדר הזה הוא התיקון של 2.13.3: ב-2.13.2 חישוב ה"סביבה" רץ ראשון, וכל
// תקיעה שלו (קריאת גשר שלא חוזרת) בלעה גם את השמירה וגם את השליחה בשקט.
// מחזירה true רק אם הבקשה לא זרקה — "נכנס לתור" אינו "נשלח".
async function sendReport(kind, title, details, images){
  const item = newReportItem(kind, title, details, '', images);
  const queued = await queueReport(item);        // ← שמור לפני הכול
  let env = '';
  try { env = await reportEnv(); } catch(e){}    // best-effort בלבד
  item.env = env;
  try {
    const via = await postReportToRelay(item, env);
    await reportDebugLog({ ok: true, via: via, title: item.title });
  } catch(e){
    await reportDebugLog({ ok: false, err: (e && e.message) || String(e), title: item.title });
    await markOutboxError(item.id, (e && e.message) || String(e));
    // ביטול בדיאלוג של אוצריא (3.1.0) אינו תקלה — אסור להציג "אין חיבור לרשת"
    // למי שפשוט לחץ "ביטול". הדיווח נשאר בתור, והמשתמש יכול לשלוח שוב.
    if (e && e.cancelled){
      reportNotify(queued
        ? 'הדיווח לא נשלח, אבל נשמר במכשיר — אפשר לשלוח אותו מהאזור האישי בכל עת.'
        : 'הדיווח לא נשלח.', 'error');
      refreshPersonalIfOpen();
      return false;
    }
    // כמו בתוסף "ביוגרפיות" — המשתמש שלחץ "שליחה" מקבל תשובה, לא שקט.
    // ההבדל: כאן הדיווח לא אבד, ולכן ההודעה מרגיעה ולא מבקשת לנסות שוב.
    // אלא אם גם השמירה נכשלה — ואז אסור להבטיח שהוא נשמר.
    reportNotify(queued
      ? 'אין כרגע חיבור לרשת — הדיווח נשמר במכשיר ויישלח אוטומטית בפתיחה הבאה של התוסף.'
      : 'השליחה נכשלה וגם השמירה במכשיר לא הצליחה. כדאי ללחוץ "הורדה לקובץ" כדי לא לאבד את מה שנכתב.', 'error');
    refreshPersonalIfOpen();
    return false;
  }
  await removeFromOutbox(item.id);
  reportNotify('נשלח, תודה!', 'success');
  refreshPersonalIfOpen();
  return true;
}

// ריקון התור. ברקע (בפתיחת התוסף) — שקט מוחלט, בלי שום הודעה.
// הכישלון הראשון עוצר: אם אין רשת, אין טעם לנסות את השאר.
let reportFlushBusy = false;
async function flushReportOutbox(opts){
  const announce = !!(opts && opts.announce);
  if (reportFlushBusy) return { sent: 0, left: -1 };
  reportFlushBusy = true;
  let sent = 0, failed = false;
  try {
    let list = await reportOutboxRead();
    if (!list.length) return { sent: 0, left: 0 };
    let env = '';
    try { env = await reportEnv(); } catch(e){}
    for (const item of list.slice()){
      if (!item || !item.id) continue;
      let via = null;
      try { via = await postReportToRelay(item, item.env || env); }
      catch(e){
        failed = true;
        await reportDebugLog({ ok: false, err: (e && e.message) || String(e), title: item.title });
        list = await markOutboxError(item.id, (e && e.message) || String(e));
        break;
      }
      await reportDebugLog({ ok: true, via: via, title: item.title });
      sent++;
      list = await removeFromOutbox(item.id);
    }
    if (announce){
      if (sent) reportNotify(sent === 1 ? 'הדיווח הממתין נשלח, תודה!' : (sent + ' הדיווחים הממתינים נשלחו, תודה!'), 'success');
      else if (failed) reportNotify('אין כרגע חיבור לרשת — הדיווחים נשארו שמורים וייבדקו שוב מאוחר יותר.', 'error');
    }
    return { sent: sent, left: list.length };
  } catch(e){
    return { sent: sent, left: -1 };          // שקט מוחלט
  } finally {
    reportFlushBusy = false;
    if (sent) refreshPersonalIfOpen();
  }
}

// ---- הורדה לקובץ ושליחה ידנית אחר כך ----
// לא כל סביבה מרשה הורדה מתוך WebView, ולכן יש נפילה מדורגת:
// הורדה אמיתית → העתקה ללוח → חלון עם הטקסט לבחירה ידנית. בכל מקרה
// המשתמש נשאר עם הטקסט ביד, ועם הכתובת שאליה אפשר להדביק אותו.
// הקובץ הזה יורד אצל מי שהמחשב שלו כלל אינו מחובר, והוא ישלח אותו אחר כך ממחשב
// אחר. לכן הוא חייב להיות **עומד בפני עצמו**: גם הטקסט וגם שתי הכתובות שאליהן
// אפשר להדביק אותו, עם הסבר מה ההבדל ביניהן. אחרת הכתובת נשמרת בנפרד — או, בפועל,
// לא נשמרת בכלל.
function reportItemToText(item){
  const imgs = (item.images || []).length;
  return [
    'דיווח מתוסף עינים למקרא',
    'סוג: ' + (item.kind || '—'),
    'כותרת: ' + (item.title || '—'),
    'סביבה: ' + (item.env || '—'),
    'נשמר: ' + (item.savedAt || '—'),
    '',
    item.details || '',
    '',
    (imgs ? '⚠️ צורפו לדיווח ' + imgs + ' תמונות. הקובץ הזה הוא טקסט בלבד ואינו כולל אותן —\n'
          + '   יש לצרף אותן ידנית בעת השליחה.\n' : ''),
    '==============================',
    'איך שולחים את הדיווח הזה ממחשב מחובר — שתי דרכים, שתיהן מגיעות לאותו מקום:',
    '',
    '1. בלי חשבון וללא הרשמה — טופס גוגל (מומלץ):',
    '   ' + REPORT_FORM_VIEW_URL,
    '   פותחים בדפדפן, מעתיקים לתוכו את מה שכתוב למעלה ושולחים. זהו.',
    '',
    '2. למי שיש חשבון גיטהאב — פתיחת דיווח ישירות:',
    '   ' + REPORT_ISSUES_URL,
    '   כאן אפשר גם לצרף תמונות ולעקוב אחרי התשובות לדיווח.'
  ].join('\n');
}

function copyReportText(text){
  if (navigator.clipboard && navigator.clipboard.writeText){
    return navigator.clipboard.writeText(text).then(() => true, () => false);
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-1000px;';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return Promise.resolve(!!ok);
  } catch(e){ return Promise.resolve(false); }
}

function saveReportsToFile(items, baseName){
  const text = (items || []).map(reportItemToText).join('\n\n==============================\n\n');
  const name = (baseName || 'דיווח-עינים-למקרא') + '-' + new Date().toISOString().slice(0, 10) + '.txt';
  // 4.4.0 — דיאלוג ״שמור בשם״ של אוצריא; ההורדה הישנה נשארת רק כשהוא אינו זמין
  if (typeof saveTextViaDialog === 'function'){
    return saveTextViaDialog(text, name.replace(/\.txt$/, ''), 'txt', true).then(res => {
      if (res === null) return downloadReportFile(text, name);
      if (res) reportNotify('הקובץ נשמר: ' + res + '. אפשר לשלוח אותו מתי שנוח.', 'success');
      return !!res;
    });
  }
  return downloadReportFile(text, name);
}

function downloadReportFile(text, name){
  try {
    const blob = new Blob(['﻿' + text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => { try { URL.revokeObjectURL(url); } catch(e){} }, 4000);
    reportNotify('הקובץ ירד: ' + name + '. אפשר לשלוח אותו מתי שנוח.', 'success');
    return Promise.resolve(true);
  } catch(e){
    return copyReportText(text).then(ok => {
      if (ok) reportNotify('ההורדה חסומה כאן — הדיווח הועתק ללוח. אפשר להדביק אותו ב-' + REPORT_ISSUES_URL, 'success');
      else uiPrompt('העתיקו את הטקסט ושלחו אותו ב-' + REPORT_ISSUES_URL, text);
      return ok;
    });
  }
}

// ============================================================
//  תמונות מצורפות (2.16.2)
//  צילום מסך אומר בשנייה מה שפסקה שלמה לא מצליחה לומר. שלוש דרכים לצרף:
//  לחיצה על אזור ההעלאה · גרירה לתוכו · הדבקה (Ctrl+V) לתוך שדה הפירוט —
//  האחרונה היא הדרך הטבעית אחרי צילום מסך, וגם התוסף של אוצריא תומך בה.
// ============================================================
let reportImages = [];   // [{ id, name, dataUrl }]

function reportImagesBytes(){
  return reportImages.reduce((n, im) => n + ((im && im.dataUrl) ? im.dataUrl.length : 0), 0);
}

// מקטין ומדחס דרך canvas. אם משהו בשרשרת נכשל (WebView בלי canvas, קובץ פגום)
// נופלים חזרה ל-dataURL המקורי — עדיף תמונה כבדה מאשר בלי תמונה.
function shrinkImageFile(file){
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = ev => {
      const raw = String(ev.target.result || '');
      if (!raw) return resolve(null);
      try {
        const img = new Image();
        img.onerror = () => resolve(raw);
        img.onload = () => {
          try {
            const scale = Math.min(1, REPORT_IMG_DIM / Math.max(img.width, img.height));
            const w = Math.max(1, Math.round(img.width * scale));
            const h = Math.max(1, Math.round(img.height * scale));
            const cv = document.createElement('canvas');
            cv.width = w; cv.height = h;
            const ctx = cv.getContext('2d');
            // רקע לבן: PNG שקוף שהופך ל-JPEG מקבל אחרת רקע שחור.
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            const out = cv.toDataURL('image/jpeg', REPORT_IMG_QUALITY);
            resolve(out && out.length < raw.length ? out : raw);
          } catch(e){ resolve(raw); }
        };
        img.src = raw;
      } catch(e){ resolve(raw); }
    };
    try { reader.readAsDataURL(file); } catch(e){ resolve(null); }
  });
}

async function addReportImage(file){
  if (!file || !/^image\//.test(file.type || '')){
    reportNotify('אפשר לצרף קבצי תמונה בלבד.', 'error');
    return false;
  }
  if (reportImages.length >= REPORT_IMG_MAX){
    reportNotify('אפשר לצרף עד ' + REPORT_IMG_MAX + ' תמונות לדיווח.', 'error');
    return false;
  }
  if (file.size > REPORT_IMG_SRC_MAX){
    reportNotify('התמונה גדולה מדי (מעל ' + Math.round(REPORT_IMG_SRC_MAX / 1024 / 1024) + 'MB).', 'error');
    return false;
  }
  const dataUrl = await shrinkImageFile(file);
  if (!dataUrl){ reportNotify('קריאת התמונה נכשלה.', 'error'); return false; }
  if (reportImagesBytes() + dataUrl.length > REPORT_IMG_TOTAL_MAX){
    reportNotify('סך התמונות בדיווח גדול מדי. אפשר להסיר אחת ולצרף במקומה.', 'error');
    return false;
  }
  reportImages.push({
    id: 'i' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    name: file.name || 'צילום מסך.jpg',
    dataUrl: dataUrl
  });
  renderReportImages();
  return true;
}

function removeReportImage(id){
  reportImages = reportImages.filter(im => im.id !== id);
  renderReportImages();
}

function renderReportImages(){
  const list = document.getElementById('reportImages');
  if (!list) return;
  list.innerHTML = '';
  reportImages.forEach(im => {
    const chip = document.createElement('div');
    chip.className = 'report-img-chip';
    const thumb = document.createElement('img');
    thumb.src = im.dataUrl;
    thumb.alt = im.name;
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'report-img-del';
    del.title = 'הסרה';
    del.textContent = '✕';
    del.addEventListener('click', () => removeReportImage(im.id));
    chip.appendChild(thumb);
    chip.appendChild(del);
    list.appendChild(chip);
  });
  const hint = document.getElementById('reportImagesHint');
  if (hint){
    hint.textContent = reportImages.length
      ? reportImages.length + ' מתוך ' + REPORT_IMG_MAX + ' · ' + Math.round(reportImagesBytes() / 1024) + 'KB'
      : '';
  }
}

// ---- המודאל ----
function buildReportPanel(){
  const ov = document.createElement('div');
  ov.className = 'panel-overlay';
  ov.id = 'reportPanelOverlay';
  ov.setAttribute('dir', 'rtl');
  ov.innerHTML = '<div class="panel-box">'
    + '<h2>✉️ הודעה למפתח</h2>'
    + '<p class="panel-hint">ההודעה נשלחת ישירות מתוך התוסף — בלי מייל ובלי לצאת לדפדפן. '
    +   'אם אין כרגע חיבור לרשת, היא נשמרת במכשיר ונשלחת לבד בפתיחה הבאה.</p>'
    + '<select id="reportKind" aria-label="סוג ההודעה">'
    +   REPORT_KINDS.map(k => '<option value="' + esc(k.id) + '">' + esc(k.label) + '</option>').join('')
    + '</select>'
    + '<input type="text" id="reportTitle" maxlength="' + REPORT_TITLE_MAX + '" placeholder="כותרת קצרה (רשות — אם ריק, נלקחת מהשורה הראשונה שלמטה)">'
    + '<textarea id="reportDetails" placeholder="מה קרה? איפה? מה ציפיתם שיקרה? ככל שיהיה מפורט יותר — כך קל יותר לתקן.&#10;(אפשר גם להדביק כאן צילום מסך ב-Ctrl+V)"></textarea>'
    + '<input type="email" id="reportReplyEmail" required placeholder="אימייל לתשובה (חובה — בלעדיו אין למי להשיב)">'
    + '<div class="report-upload" id="reportUpload" tabindex="0" role="button">'
    +   '🖼️ צירוף צילום מסך — לחיצה, גרירה לכאן, או הדבקה בשדה למעלה'
    +   '<span class="report-upload-sub" id="reportImagesHint"></span>'
    + '</div>'
    + '<input type="file" id="reportFile" accept="image/*" multiple hidden>'
    + '<div class="report-imgs" id="reportImages"></div>'
    + '<div class="panel-actions">'
    +   '<button class="panel-btn" type="button" id="reportSend">📨 שליחה</button>'
    +   '<button class="panel-btn secondary" type="button" id="reportDownload">💾 הורדה לקובץ</button>'
    +   '<button class="panel-btn secondary" type="button" id="reportPanelClose">סגירה</button>'
    + '</div>'
    + '<p class="panel-hint" style="margin-top:12px;">'
    +   'מעדיפים לשלוח בעצמכם? ״הורדה לקובץ״ שומרת את הדיווח כקובץ טקסט (ואם ההורדה '
    +   'חסומה — מעתיקה אותו ללוח). <b>הקובץ כולל בתוכו גם את כתובות השליחה</b>, כך '
    +   'שאפשר להעביר אותו למחשב מחובר ולשלוח משם בלי לשמור שום דבר בנפרד.'
    + '</p>'
    + '<div class="panel-actions">'
    // שני ערוצים, ובכוונה בסדר הזה: הטופס ראשון מפני שהוא אינו דורש חשבון כלל.
    //
    // הטופס מופיע בשתי צורות שרק אחת מהן גלויה בכל רגע (ר' applyOnlineState
    // ב-refs.js): כשיש רשת — קישור שנפתח בלחיצה, כי אין סיבה להכריח העתקה
    // ידנית; כשאין רשת — כפתור העתקה, כי קישור שאי-אפשר לפתוח הוא רק תסכול,
    // ומה שבאמת צריך הוא להעביר את הכתובת למכשיר מחובר.
    +   '<a href="#" class="panel-btn secondary" data-external-link="' + esc(REPORT_FORM_VIEW_URL) + '" data-requires-net>📝 שליחה בטופס — בלי חשבון</a>'
    +   '<button type="button" class="panel-btn secondary" id="reportCopyFormLink" data-offline-only>📝 העתקת קישור לטופס — בלי חשבון</button>'
    // כתובת הגיטהאב נשארת כפתור העתקה בלבד, בכל מצב: הצגתה כקישור גלוי חושפת
    // את שם המשתמש בגיטהאב בממשק עצמו.
    +   '<button type="button" class="panel-btn secondary" id="reportCopyIssuesLink">📋 העתקת קישור לגיטהאב</button>'
    // "📧 שליחה במייל" הוסר מה-UI זמנית: REPORT_MAILTO_TARGET הוא עדיין
    // placeholder לא-מוגדר (ר' הערה למעלה) - כפתור שלא שולח לשום מקום מבלבל
    // יותר משהוא עוזר. הקוד ב-#reportMailto listener למטה נשאר מוכן, רק
    // מוסתר - להחזיר את השורה הזו כשתהיה כתובת אמיתית:
    // + '<a href="#" class="panel-btn secondary" id="reportMailto">📧 שליחה במייל</a>'
    + '</div>'
    + '<p class="panel-hint" style="margin-top:8px;font-size:.8em;opacity:.75;">'
    +   'מנגנון השליחה כאן מבוסס על הדפוס של התוספים ״ביוגרפיות״ ו״דיווח באגים״ — תודה למפתחיהם.'
    + '</p></div>';
  document.body.appendChild(ov);
  // הפאנל נוצר בזמן ריצה ולכן אינו נתפס במאזין הכללי של .panel-overlay ב-results-ui.js
  ov.addEventListener('click', ev => { if (ev.target === ov) closeReportPanel(); });
  ov.querySelector('#reportPanelClose').addEventListener('click', closeReportPanel);
  ov.querySelector('#reportSend').addEventListener('click', submitReportPanel);
  // גל: מסלול גיבוי נוסף - מייל בדפדפן. לא קורא ל-postReportToRelay בכלל
  // (זה ניווט mailto:, לא בקשת רשת) - לכן עובד גם אם החסימה שגרמה לכל
  // הבעיה מלכתחילה היא ברמת fetch/iframe דווקא. שדה האימייל-לתשובה מוטמע
  // בגוף המייל (לא ב-Form) כדי לא לדרוש entry.ID חדש שאין לי.
  const mailtoBtn = ov.querySelector('#reportMailto'); // מוסתר כרגע - ר' הערה למעלה
  if (mailtoBtn) mailtoBtn.addEventListener('click', ev => {
    ev.preventDefault();
    const kind = ov.querySelector('#reportKind').value;
    const title = ov.querySelector('#reportTitle').value.trim() || 'דיווח מהתוסף';
    const details = ov.querySelector('#reportDetails').value;
    const replyEmail = ov.querySelector('#reportReplyEmail').value.trim();
    const subject = '[' + kind + '] ' + title;
    const body = details + '\n\n---\nאימייל לתשובה: ' + (replyEmail || '(לא הוזן)');
    ev.target.href = 'mailto:' + encodeURIComponent(REPORT_MAILTO_TARGET)
      + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  });
  ov.querySelector('#reportDownload').addEventListener('click', () => {
    const kind = ov.querySelector('#reportKind').value;
    const title = ov.querySelector('#reportTitle').value.trim();
    const details = ov.querySelector('#reportDetails').value;
    if (!title && !details.trim()){ window.alert('אין מה להוריד — הדיווח ריק.'); return; }
    reportEnv().then(env => {
      const item = newReportItem(kind, title || 'דיווח מהתוסף', details, env, reportImages);
      saveReportsToFile([item], 'דיווח-עינים-למקרא');
    });
  });

  // ---- תמונות: לחיצה, גרירה והדבקה ----
  const fileInput = ov.querySelector('#reportFile');
  const upload = ov.querySelector('#reportUpload');
  upload.addEventListener('click', () => fileInput.click());
  upload.addEventListener('keydown', ev => {
    if (ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener('change', async ev => {
    for (const f of Array.from(ev.target.files || [])) await addReportImage(f);
    ev.target.value = '';       // שאותו קובץ יוכל להיבחר שוב אחרי הסרה
  });
  ['dragenter', 'dragover'].forEach(t => upload.addEventListener(t, ev => {
    ev.preventDefault(); upload.classList.add('drag');
  }));
  ['dragleave', 'drop'].forEach(t => upload.addEventListener(t, ev => {
    ev.preventDefault(); upload.classList.remove('drag');
  }));
  upload.addEventListener('drop', async ev => {
    for (const f of Array.from((ev.dataTransfer && ev.dataTransfer.files) || [])) await addReportImage(f);
  });
  ov.querySelector('#reportDetails').addEventListener('paste', async ev => {
    const items = Array.from((ev.clipboardData && ev.clipboardData.items) || []);
    const imgs = items.filter(i => i.type && i.type.indexOf('image') === 0);
    if (!imgs.length) return;   // הדבקת טקסט רגילה ממשיכה כרגיל
    ev.preventDefault();
    for (const i of imgs){
      const f = i.getAsFile();
      if (f) await addReportImage(f);
    }
  });

  ov.querySelector('#reportCopyFormLink').addEventListener('click', () => {
    copyReportText(REPORT_FORM_VIEW_URL).then(ok => {
      reportNotify(ok ? 'קישור הטופס הועתק. אפשר לפתוח אותו בכל דפדפן — בלי חשבון ובלי הרשמה.'
                      : 'ההעתקה נכשלה כאן — נסו שוב.', ok ? 'success' : 'error');
    });
  });
  ov.querySelector('#reportCopyIssuesLink').addEventListener('click', () => {
    copyReportText(REPORT_ISSUES_URL).then(ok => {
      reportNotify(ok ? 'הקישור הועתק ללוח.' : 'ההעתקה נכשלה כאן — נסו שוב.', ok ? 'success' : 'error');
    });
  });
  return ov;
}

function closeReportPanel(){
  const ov = document.getElementById('reportPanelOverlay');
  if (ov) ov.classList.remove('open');
}

function openReportPanel(preset){
  const ov = document.getElementById('reportPanelOverlay') || buildReportPanel();
  const kind = ov.querySelector('#reportKind');
  const title = ov.querySelector('#reportTitle');
  const details = ov.querySelector('#reportDetails');
  if (preset && preset.kind) kind.value = preset.kind;
  if (preset && preset.title != null) title.value = preset.title;
  if (preset && preset.details != null) details.value = preset.details;
  reportImages = [];                 // פתיחה חדשה = דיווח חדש, בלי תמונות שנשארו
  renderReportImages();
  // מילוי מראש של הכתובת ששמורה מהדיווח הקודם — היא חובה, ואין טעם לבקש אותה
  // מחדש בכל פעם. אסינכרוני בכוונה: פתיחת הפאנל לא ממתינה לגשר.
  const emailBox = ov.querySelector('#reportReplyEmail');
  if (emailBox && !emailBox.value){
    readReplyEmail().then(v => { if (v && !emailBox.value) emailBox.value = v; }).catch(() => {});
  }
  ov.classList.add('open');
  setTimeout(() => { try { title.focus(); } catch(e){} }, 30);
}

async function submitReportPanel(){
  const ov = document.getElementById('reportPanelOverlay');
  if (!ov) return;
  const btn = ov.querySelector('#reportSend');
  const title = ov.querySelector('#reportTitle');
  const details = ov.querySelector('#reportDetails');
  // כותרת רשות (מפרט 4.0, ג.4.4 - איחוד הלשוניות): אם נשארה ריקה, נגזרת
  // מהשורה הראשונה של הפירוט - בדיוק כמו שהתנהגה לשונית "משוב" הישנה.
  const effectiveTitle = title.value.trim() || details.value.trim().split('\n')[0];
  if (!effectiveTitle){ window.alert('יש לכתוב כותרת או פירוט.'); details.focus(); return; }
  // 3.3.4 — הכתובת חובה. בלעדיה הדיווח נפתח כ-Issue אנונימי ואי אפשר לחזור
  // לשולח אפילו כשהתשובה קיימת, וזה היה המצב ברוב הדיווחים עד כה.
  const emailBox = ov.querySelector('#reportReplyEmail');
  if (!isValidReplyEmail(emailBox.value)){
    window.alert('יש למלא כתובת אימייל תקינה לתשובה — בלעדיה אין לנו איך לחזור אליכם.');
    emailBox.focus();
    return;
  }
  if (btn.disabled) return;
  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = 'שולח…';
  try {
    const replyEmail = emailBox.value.trim();
    await saveReplyEmail(replyEmail);     // כדי שלא נבקש אותה שוב בדיווח הבא
    const detailsWithReply = details.value + '\n\n---\nאימייל לתשובה: ' + replyEmail;
    await sendReport(ov.querySelector('#reportKind').value, effectiveTitle, detailsWithReply, reportImages);
  } finally {
    btn.disabled = false;
    btn.textContent = label;
  }
  // גם אם רק נכנס לתור — הטופס התרוקן והפאנל נסגר, כי הדיווח כבר שמור.
  title.value = '';
  details.value = '';
  // הכתובת נשארת בשדה בכוונה — היא חובה וזהה בין דיווח לדיווח.
  reportImages = [];
  renderReportImages();
  closeReportPanel();
}

function catLabelOf(catId){
  const c = CATEGORIES.find(x => x.id === catId);
  return c ? (c.icon + ' ' + c.label) : catId;
}

function readJsonLS(key, fallback){
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch(e){ return fallback; }
}

function fmtDate(iso){
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('he-IL', { year:'numeric', month:'2-digit', day:'2-digit' }); }
  catch(e){ return String(iso).slice(0, 10); }
}

// נקודת השליחה היחידה בכל התוסף. מאז 2.13.2 היא עוברת בממסר ולא במייל —
// כל שאר הקבצים (edit-forms.js, home.js, results-ui.js) קוראים לכאן.
// מחזירה true רק אם הבקשה יצאה בלי חריגה; אחרת הדיווח שמור בתור.
// 3.3.4 — גם להצעת עריכה מכרטיס נדרשת כתובת לתשובה. אין כאן טופס, ולכן היא
// נלקחת מהכתובת השמורה ונשאלת פעם אחת בלבד אם עוד אין כזו. ויתור = לא נשלח.
async function sendToDev(subject, body, kind){
  const replyEmail = await ensureReplyEmail();
  if (!replyEmail) return false;
  return sendReport(kind || 'דיווח', subject, body + '\n\n---\nאימייל לתשובה: ' + replyEmail);
}

function openPersonalArea(tab){
  activePersonalTab = tab || activePersonalTab || 'bookmarks';
  document.querySelectorAll('#personalTabs .ptab').forEach(b => {
    b.classList.toggle('active', b.dataset.ptab === activePersonalTab);
  });
  landing.style.display = 'none';
  guideView.classList.remove('open');
  resultsOverlay.classList.remove('open');
  personalView.classList.add('open');
  renderPersonalBody();
}

function closePersonalArea(){
  personalView.classList.remove('open');
  landing.style.display = '';
}

// רענון האזור האישי אחרי פעולה שנעשתה מחוץ לו (מחיקת דף HTML, שמירת עריכה וכו')
function refreshPersonalIfOpen(){
  if (personalView.classList.contains('open')) renderPersonalBody();
}

function personalEmpty(text){
  return '<div class="p-empty">' + esc(text) + '</div>';
}

function personalRow(name, sub, actions){
  const row = document.createElement('div');
  row.className = 'p-row';
  row.innerHTML = '<div class="p-row-main"><div class="p-row-name">' + esc(name) + '</div>'
    + (sub ? '<div class="p-row-sub">' + esc(sub) + '</div>' : '') + '</div>'
    + '<div class="p-actions"></div>';
  const box = row.querySelector('.p-actions');
  (actions || []).forEach(a => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'panel-btn' + (a.secondary ? ' secondary' : '');
    btn.textContent = a.label;
    btn.addEventListener('click', a.onClick);
    box.appendChild(btn);
  });
  return row;
}

function sectionHead(title, countText){
  const d = document.createElement('div');
  d.className = 'p-sec-head';
  d.innerHTML = '<h3>' + esc(title) + '</h3>'
    + (countText ? '<span class="p-count">' + esc(countText) + '</span>' : '');
  return d;
}

// --- איסוף מה שכבר שמור במכשיר ---
function collectEdits(){
  const out = [];
  CATEGORIES.forEach(cat => {
    const edits = readStoredEdits(cat.id);
    Object.keys(edits).forEach(origName => {
      const rec = edits[origName];
      if (rec && rec.entry) out.push({ catId: cat.id, origName: origName, rec: rec });
    });
  });
  return out.sort((a, b) => String(b.rec.savedAt || '').localeCompare(String(a.rec.savedAt || '')));
}

function collectDrafts(){
  const out = [];
  CATEGORIES.forEach(cat => {
    readJsonLS(cat.id + '_nf_drafts_v1', []).forEach((d, i) => {
      out.push({ kind: 'propose', catId: cat.id, idx: i, data: d });
    });
  });
  readJsonLS(IDENTIFY_REPORTS_KEY, []).forEach((r, i) => {
    out.push({ kind: 'report', catId: null, idx: i, data: r });
  });
  return out;
}

function draftBody(d){
  if (d.kind === 'propose'){
    return 'הצעת תוספת למדריך ' + catLabelOf(d.catId)
      + '\nההוספה המוצעת: ' + (d.data.name || '—')
      + '\nהמקור בספרייה: ' + (d.data.source || '—')
      + '\nהערות נוספות: ' + (d.data.notes || '—')
      + '\nנשמר: ' + (d.data.savedAt || '—');
  }
  return 'דיווח טעות בזיהוי'
    + '\nהקטע שנבחר: "' + (d.data.selectedText || '') + '"'
    + '\nמה זוהה:\n' + (d.data.summary || '—')
    + '\nתיאור הטעות: ' + (d.data.note || '—')
    + '\nנשמר: ' + (d.data.savedAt || '—');
}

// פריט שמור → אותו מבנה שהורדה לקובץ יודעת לכתוב. כך "הורדה" בהצעות ובדיווחי
// הזיהוי מייצרת בדיוק את אותו קובץ עצמאי כמו בפאנל הדיווח — כולל שתי כתובות
// השליחה וההסבר ביניהן (ר' reportItemToText). ההנחה שמי שאין לו רשת "פשוט
// ישלח אחר כך" נכונה רק אם יש לו איך להוציא את התוכן מהמכשיר.
function draftReportItem(d, env){
  const isPropose = d.kind === 'propose';
  return newReportItem(
    isPropose ? 'הצעת ערך' : 'דיווח זיהוי',
    isPropose
      ? ('הצעת תוספת — ' + (d.data.name || ''))
      : ('דיווח טעות בזיהוי — "' + (d.data.selectedText || '') + '"'),
    draftBody(d), env, []);
}

// שם הקובץ נגזר מהפריט עצמו כשהוא יחיד — קובץ בשם "דיווח-עינים-למקרא" אחד
// דורס את קודמו בתיקיית ההורדות, ומי שמוריד שלושה פריטים נשאר עם אחד.
function downloadDrafts(list, baseName){
  return reportEnv().catch(() => '').then(env =>
    saveReportsToFile(list.map(d => draftReportItem(d, env)), baseName));
}

function deleteDraft(d){
  if (d.kind === 'propose'){
    const key = d.catId + '_nf_drafts_v1';
    const list = readJsonLS(key, []);
    list.splice(d.idx, 1);
    try { localStorage.setItem(key, JSON.stringify(list)); } catch(e){}
  } else {
    const list = readJsonLS(IDENTIFY_REPORTS_KEY, []);
    list.splice(d.idx, 1);
    try { localStorage.setItem(IDENTIFY_REPORTS_KEY, JSON.stringify(list)); } catch(e){}
  }
  renderPersonalBody();
}

async function openEntryByBookmark(catId, key, label){
  const cat = CATEGORIES.find(c => c.id === catId);
  if (!cat) return;
  const data = await loadGuideData(cat);
  const entry = data.find(e => (e.__origName || e.name) === key) || data.find(e => e.name === key);
  if (!entry){
    window.alert('הערך "' + (label || key) + '" לא נמצא במדריך ' + cat.label + '. ייתכן שנמחק או ששמו שונה.');
    return;
  }
  closePersonalArea();
  openGuide(catId, entry.name);
}

// --- רינדור הלשוניות ---
function renderPersonalBody(){
  personalBody.innerHTML = '';
  if (activePersonalTab === 'bookmarks') return renderPersonalBookmarks();
  if (activePersonalTab === 'edits') return renderPersonalEdits();
  if (activePersonalTab === 'drafts') return renderPersonalDrafts();
  if (activePersonalTab === 'pages') return renderPersonalPages();
  if (activePersonalTab === 'whatsnew') return renderPersonalWhatsNew();
}

function renderPersonalBookmarks(){
  const list = readBookmarks();
  personalBody.appendChild(sectionHead('⭐ סימניות', list.length ? list.length + ' ערכים' : ''));
  if (!list.length){
    personalBody.insertAdjacentHTML('beforeend',
      personalEmpty('אין עדיין סימניות. בכל כרטיס ערך יש כוכב (☆) בכותרת — לחיצה עליו תוסיף אותו לכאן.'));
    return;
  }
  // ייצוא כרטסת (2.5) — כל הסימניות כדף מקורות אחד, למגיד שיעור לפני השיעור
  const bulk = document.createElement('div');
  bulk.className = 'p-bulk';
  const printBtn = document.createElement('button');
  printBtn.type = 'button';
  printBtn.className = 'panel-btn';
  printBtn.textContent = '🖨 ייצוא כרטסת (' + list.length + ')';
  printBtn.addEventListener('click', () => printBookmarks());
  bulk.appendChild(printBtn);
  personalBody.appendChild(bulk);

  list.slice().reverse().forEach(b => {
    personalBody.appendChild(personalRow(
      b.label || b.key,
      catLabelOf(b.catId) + (b.addedAt ? ' · נוסף ' + fmtDate(b.addedAt) : ''),
      [
        { label: 'פתיחה', onClick: () => openEntryByBookmark(b.catId, b.key, b.label) },
        { label: 'הסרה', secondary: true, onClick: () => { toggleBookmark(b.catId, b.key, b.label); renderPersonalBody(); } }
      ]
    ));
  });
}

// ============================================================
//  שליחת עריכה — הכרטיס הנערך קודם לכול (2.17.2)
//  עד כאן גוף ההודעה נפתח ב-JSON.stringify של הכרטיס כולו, והמתחזק היה צריך
//  לחפש בתוך גוש הנתונים מה בעצם נערך ובאיזה מדריך. עכשיו שם הכרטיס הוא
//  הכותרת, הפרטים מודגשים מעליו, וה-JSON המלא יורד לסוף כנספח.
// ============================================================
function editReportTitle(e){
  const now = (e.rec.entry && e.rec.entry.name) || e.origName;
  return 'עריכת כרטיס — ' + now + ' (' + catLabelOf(e.catId) + ')';
}

function editReportBody(e){
  const entry = e.rec.entry || {};
  const now = entry.name || e.origName;
  const lines = [
    '## הכרטיס שנערך: **' + now + '**',
    '',
    '* **מדריך:** ' + catLabelOf(e.catId),
    (now !== e.origName ? '* **שם במקור:** ' + e.origName + ' _(השם עצמו שונה בעריכה)_' : '* **שם במקור:** ' + e.origName),
    '* **נשמר:** ' + (e.rec.savedAt || '—'),
    '',
    '### תוכן הכרטיס אחרי העריכה'
  ];
  Object.keys(entry).forEach(k => {
    if (k.indexOf('__') === 0) return;                 // שדות פנימיים
    const v = entry[k];
    const txt = (v && typeof v === 'object') ? JSON.stringify(v) : String(v == null ? '' : v);
    if (!txt.trim()) return;
    lines.push('* **' + k + ':** ' + (txt.length > 600 ? txt.slice(0, 600) + '…' : txt));
  });
  lines.push('', '<details><summary>הכרטיס המלא כ-JSON</summary>', '',
    '```json', JSON.stringify(entry, null, 1), '```', '</details>');
  return lines.join('\n');
}

function editsBulkBody(edits){
  return 'עריכות מקומיות מעינים למקרא — ' + edits.length + ' כרטיסים\n\n'
    + edits.map(e => '* **' + ((e.rec.entry && e.rec.entry.name) || e.origName) + '** ('
        + catLabelOf(e.catId) + ') — נשמר ' + fmtDate(e.rec.savedAt)).join('\n')
    + '\n\n---\n\n' + edits.map(editReportBody).join('\n\n---\n\n');
}

function downloadEdits(edits, baseName){
  return reportEnv().catch(() => '').then(env =>
    saveReportsToFile(edits.map(e => newReportItem('עריכת כרטיס', editReportTitle(e), editReportBody(e), env, [])), baseName));
}

function renderPersonalEdits(){
  const edits = collectEdits();
  personalBody.appendChild(sectionHead('✏️ העריכות שלי', edits.length ? edits.length + ' כרטיסים' : ''));
  if (!edits.length){
    personalBody.insertAdjacentHTML('beforeend',
      personalEmpty('לא ערכתם עדיין אף כרטיס. בכל כרטיס יש כפתור ✏️ לעריכה מקומית — העריכות נשמרות במכשיר ומופיעות כאן.'));
    return;
  }
  const bulk = document.createElement('div');
  bulk.className = 'p-bulk';
  const bulkBtn = document.createElement('button');
  bulkBtn.type = 'button';
  bulkBtn.className = 'panel-btn';
  bulkBtn.textContent = '📨 שליחת כל העריכות למפתח (' + edits.length + ')';
  bulkBtn.addEventListener('click', async () => {
    const ok = await sendToDev('עריכות מקומיות (' + edits.length + ' כרטיסים)', editsBulkBody(edits), 'עריכות מקומיות');
    // סימון קבוצתי: כל מה שיצא בפועל מסומן כנשלח, ולכן לא ייצא שוב בשליחה
    // הבאה כל עוד לא נערך מחדש.
    if (ok){
      edits.forEach(e => markEntryEditSent(e.catId, e.origName, editDiffHash(editReportBody(e))));
      renderPersonalBody();
    }
  });
  bulk.appendChild(bulkBtn);
  // אותה בעיה שנפתרה בהצעות: "שליחה" לבדה מניחה חיבור לרשת. מי שהמחשב שלו
  // מנותק לגמרי צריך להוציא את העריכות החוצה כקובץ — עם כתובות השליחה בתוכו.
  const bulkDl = document.createElement('button');
  bulkDl.type = 'button';
  bulkDl.className = 'panel-btn secondary';
  bulkDl.textContent = '💾 הורדת כל העריכות לקובץ';
  bulkDl.addEventListener('click', () => downloadEdits(edits, 'עריכות-עינים-למקרא'));
  bulk.appendChild(bulkDl);
  bulk.insertAdjacentHTML('beforeend',
    '<p class="mini-note" style="width:100%;margin:8px 0 0;">'
    + 'אין חיבור במחשב הזה? ההורדה שומרת את העריכות כקובץ טקסט, '
    + '<b>וכתובות השליחה כתובות בתוכו</b> — אפשר להעביר אותו למכשיר מחובר ולשלוח משם.</p>');
  personalBody.appendChild(bulk);

  edits.forEach(e => {
    // 3.3.4 — מי שכבר נשלח מסומן, ולא נשלח שוב אלא אם השתנה מאז. החתימה היא
    // על גוף ההצעה, כך ששליחה חוזרת של אותו תוכן בדיוק נחסמת ועריכה חדשה לא.
    const sentRec = getEntryEditSent(e.catId, e.origName);
    const bodyHash = editDiffHash(editReportBody(e));
    const isSent = !!(sentRec && sentRec.hash === bodyHash);
    personalBody.appendChild(personalRow(
      ((e.rec.entry && e.rec.entry.name) || e.origName) + (isSent ? ' ✓' : ''),
      catLabelOf(e.catId) + ' · נשמר ' + fmtDate(e.rec.savedAt)
        + (e.rec.entry && e.rec.entry.name !== e.origName ? ' · במקור: ' + e.origName : '')
        + (isSent ? ' · נשלח ' + fmtDate(sentRec.at) : ''),
      [
        { label: 'פתיחה', onClick: () => openEntryByBookmark(e.catId, e.origName, e.origName) },
        { label: isSent ? 'נשלח ✓' : 'שליחה', secondary: true, onClick: async () => {
            if (isSent){
              window.alert('העריכה הזו כבר נשלחה. אם שיניתם משהו נוסף מאז — היא תישלח שוב.');
              return;
            }
            const ok = await sendToDev(editReportTitle(e), editReportBody(e), 'עריכת כרטיס');
            if (ok){ markEntryEditSent(e.catId, e.origName, bodyHash); renderPersonalBody(); }
          } },
        { label: '💾 הורדה', secondary: true, onClick: () => downloadEdits([e],
            'עריכה-' + ((e.rec.entry && e.rec.entry.name) || e.origName)) },
        { label: 'שחזור למקור', secondary: true, onClick: async () => {
            if (!(await uiConfirm('לשחזר את "' + e.origName + '" לגרסת המקור? העריכה שלכם תימחק.'))) return;
            const cat = CATEGORIES.find(c => c.id === e.catId);
            const data = cat ? await loadGuideData(cat) : [];
            const entry = data.find(x => (x.__origName || x.name) === e.origName);
            if (entry) restoreEntryToOriginal(e.catId, entry, e.origName);
            else {
              const stored = readStoredEdits(e.catId);
              delete stored[e.origName];
              try { localStorage.setItem(editsKey(e.catId), JSON.stringify(stored)); } catch(err){}
            }
            invalidateLookup(e.catId);
            renderPersonalBody();
          } }
      ]
    ));
  });
}

// שורת מצב התור: כמה דיווחים ממתינים לשליחה, וכפתור לנסות שוב עכשיו.
// מתמלאת אסינכרונית כי הקריאה ל-plugin.storage אסינכרונית.
function appendOutboxStatus(){
  const box = document.createElement('div');
  box.className = 'p-row-sub';
  box.style.margin = '0 0 14px';
  personalBody.appendChild(box);
  reportOutboxRead().then(list => {
    if (!list.length){ box.remove(); return; }
    const err = (list.find(x => x && x.lastError) || {}).lastError;
    box.textContent = '📤 ' + (list.length === 1 ? 'דיווח אחד ממתין' : list.length + ' דיווחים ממתינים')
      + ' לשליחה (אין חיבור, או שהשליחה טרם הצליחה). '
      + (err ? '· הסיבה האחרונה: ' + err + ' ' : '');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'panel-btn secondary';
    btn.textContent = 'לנסות לשלוח עכשיו';
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'שולח…';
      await flushReportOutbox({ announce: true });
      renderPersonalBody();
    });
    box.appendChild(btn);
    const dl = document.createElement('button');
    dl.type = 'button';
    dl.className = 'panel-btn secondary';
    dl.style.marginInlineStart = '6px';
    dl.textContent = '💾 הורדה לקובץ';
    dl.addEventListener('click', () => saveReportsToFile(list, 'דיווחים-ממתינים-עינים-למקרא'));
    box.appendChild(dl);
  }).catch(()=>{ box.remove(); });
}

// אבחון: מה קרה בניסיונות האחרונים, וכפתור לבדיקת חיבור חיה.
// זו התשובה ל"שלחתי ולא הגיע" — במקום לנחש, רואים אם הבקשה יצאה, ובאיזה מסלול.
function appendReportDiagnostics(){
  const wrap = document.createElement('details');
  wrap.style.margin = '0 0 14px';
  wrap.innerHTML = '<summary style="cursor:pointer;font-size:.86em;color:var(--color-on-surface-dim);">'
    + '🔎 בדיקת שליחה (למי שהדיווח שלו לא הגיע)</summary>'
    // ה-mode:'no-cors' ההכרחי כאן (גוגל לא מחזירה תשובה קריאה) הוא גם נקודה עיוורת:
    // "הבקשה יצאה" רק אומר שהדפדפן/ה-WebView לא זרק שגיאה - לא שהיא באמת הגיעה
    // ליעד. סנן תוכן שמחזיר "הצלחה" מזויפת לבקשה חסומה (כמו שקרה בעבר עם
    // script.google.com/…/exec, שנחסם בנתיב הפנימי אף שהדומיין עצמו היה פתוח)
    // ייצור בדיוק את התסמין הזה: "נשלח" בתוסף, ושום דבר לא נפתח בגיטהאב.
    + '<p class="mini-note" style="margin:6px 0 0;">"יצאה" אינו "התקבלה" — אם סינון '
    +   'תוכן ברשת חוסם בשקט את הנתיב הזה (מוכר מ-script.google.com בעבר), הבדיקה '
    +   'כאן תראה הצלחה בכל זאת. האימות הוודאי היחיד: פתיחת Issue חדש בגיטהאב.</p>';
  const body = document.createElement('div');
  body.style.cssText = 'font-size:.82em;color:var(--color-on-surface-dim);margin-top:8px;';
  wrap.appendChild(body);
  personalBody.appendChild(wrap);

  const testRow = document.createElement('div');
  testRow.className = 'p-bulk';
  testRow.style.marginTop = '8px';
  const testBtn = document.createElement('button');
  testBtn.type = 'button';
  testBtn.className = 'panel-btn secondary';
  testBtn.textContent = '📡 שליחת בדיקה עכשיו';
  testBtn.addEventListener('click', async () => {
    testBtn.disabled = true;
    testBtn.textContent = 'בודק…';
    const env = await reportEnv().catch(() => '');
    const item = newReportItem('בדיקה', 'בדיקת חיבור מהתוסף', 'שליחת בדיקה יזומה מהאזור האישי.', env);
    try {
      const via = await postReportToRelay(item, env);
      await reportDebugLog({ ok: true, via: via, title: item.title });
      // בכוונה לא "נשלח בהצלחה" - זו רק אמירה שהדפדפן לא זרק שגיאה, לא שגוגל קיבלה.
      reportNotify('הבקשה יצאה במסלול "' + via + '" בלי שגיאה. זה עדיין לא אישור הגעה — '
        + 'בדקו אם נפתח Issue חדש בגיטהאב תוך דקה-שתיים.', 'success');
    } catch(e){
      await reportDebugLog({ ok: false, err: (e && e.message) || String(e), title: item.title });
      reportNotify('הבקשה נכשלה: ' + ((e && e.message) || e), 'error');
    }
    renderPersonalBody();
  });
  testRow.appendChild(testBtn);
  wrap.appendChild(testRow);

  reportDebugRead().then(log => {
    if (!log.length){ body.textContent = 'עדיין לא נרשם ניסיון שליחה במכשיר הזה.'; return; }
    body.innerHTML = log.slice().reverse().map(r =>
      '<div style="margin-bottom:4px;">' + (r.ok ? '✅' : '❌') + ' ' + esc(fmtDate(r.at)) + ' — '
      + esc(r.title || '') + (r.ok ? ' · מסלול: ' + esc(r.via || '—') : ' · ' + esc(r.err || '')) + '</div>'
    ).join('');
  }).catch(()=>{ body.textContent = ''; });
}

function renderPersonalDrafts(){
  const drafts = collectDrafts();
  personalBody.appendChild(sectionHead('📝 הצעות ודיווחים שמורים', drafts.length ? drafts.length + ' פריטים' : ''));

  // 4.1 — הכניסה לדיווח חופשי (משוב / באג / טעות בתוכן / הצעה / בקשת הצטרפות),
  // כולן דרך אותו פאנל משותף (REPORT_KINDS) - ר' openReportPanel/buildReportPanel.
  const newRow = document.createElement('div');
  newRow.className = 'p-bulk';
  const newBtn = document.createElement('button');
  newBtn.type = 'button';
  newBtn.className = 'panel-btn';
  newBtn.textContent = '✉️ הודעה חדשה למפתח';
  newBtn.addEventListener('click', () => openReportPanel());
  newRow.appendChild(newBtn);
  personalBody.appendChild(newRow);
  appendOutboxStatus();
  appendReportDiagnostics();

  // הצטרפות לעריכה (מפרט 4.0, ג.4.4) — עד 2.16.1 הייתה לשונית "משוב למפתח"
  // נפרדת עם קישור חיצוני; אוחדה לכאן (11.8.26) כי שתי הלשוניות עברו לאותו
  // sendReport בפועל, וקישור לדף ה-Issues חשף את שם המשתמש בגיטהאב וגם נעלם
  // לגמרי כשאין רשת (ר' buildReportPanel). הבקשה יוצאת כסוג "בקשת הצטרפות"
  // בממסר הקיים, ועובדת אופליין דרך ה-outbox המקומי כמו כל דיווח אחר.
  const joinWrap = document.createElement('div');
  joinWrap.className = 'p-bulk';
  joinWrap.style.marginTop = '10px';
  joinWrap.innerHTML = '<p class="mini-note" style="margin-bottom:8px;">'
    + 'עדיין יש עבודה רבה בהשלמת התוכן, ביצירת ציורי עזר לכל המסכתות ועוד — '
    + 'נשמח אם תוכלו לעזור, בכל היקף.</p>';
  const joinBtn = document.createElement('button');
  joinBtn.type = 'button';
  joinBtn.className = 'panel-btn secondary';
  joinBtn.textContent = '🤝 הצטרפות לעריכה';
  joinBtn.addEventListener('click', () => openReportPanel({ kind: 'בקשת הצטרפות' }));
  joinWrap.appendChild(joinBtn);
  personalBody.appendChild(joinWrap);

  if (!drafts.length){
    personalBody.insertAdjacentHTML('beforeend',
      personalEmpty('אין פריטים שמורים. הצעת ערך חדש ודיווח על טעות בזיהוי נשמרים כאן כשבוחרים ״שמירה במכשיר״.'));
    return;
  }
  const bulk = document.createElement('div');
  bulk.className = 'p-bulk';
  const bulkBtn = document.createElement('button');
  bulkBtn.type = 'button';
  bulkBtn.className = 'panel-btn';
  bulkBtn.textContent = '📨 שליחה מרוכזת של הכל (' + drafts.length + ')';
  bulkBtn.addEventListener('click', async () => {
    const body = 'פריטים שמורים מעינים למקרא — ' + drafts.length + '\n\n'
      + drafts.map((d, i) => (i + 1) + '.\n' + draftBody(d)).join('\n\n');
    const ok = await sendToDev('שליחה מרוכזת (' + drafts.length + ' פריטים)', body, 'שליחה מרוכזת');
    if (ok && (await uiConfirm('הכל נשלח. למחוק את הפריטים ששמורים במכשיר?'))){
      CATEGORIES.forEach(c => { try { localStorage.removeItem(c.id + '_nf_drafts_v1'); } catch(e){} });
      try { localStorage.removeItem(IDENTIFY_REPORTS_KEY); } catch(e){}
      renderPersonalBody();
    }
  });
  bulk.appendChild(bulkBtn);
  // ההורדה אינה דורשת רשת בכלל, ולכן אינה מסומנת data-requires-net: זו בדיוק
  // הפעולה שנחוצה כשאין חיבור.
  const bulkDl = document.createElement('button');
  bulkDl.type = 'button';
  bulkDl.className = 'panel-btn secondary';
  bulkDl.textContent = '💾 הורדת הכל לקובץ';
  bulkDl.addEventListener('click', () => downloadDrafts(drafts, 'פריטים-שמורים-עינים-למקרא'));
  bulk.appendChild(bulkDl);
  bulk.insertAdjacentHTML('beforeend',
    '<p class="mini-note" style="width:100%;margin:8px 0 0;">'
    + 'אין חיבור במחשב הזה? ״הורדת הכל לקובץ״ שומרת את הפריטים כקובץ טקסט אחד, '
    + '<b>וכתובות השליחה כתובות בתוכו</b> — אפשר להעביר אותו למכשיר מחובר ולשלוח משם.</p>');
  personalBody.appendChild(bulk);

  drafts.forEach(d => {
    const title = d.kind === 'propose'
      ? ('➕ ' + (d.data.name || '(ללא שם)'))
      : ('🚩 דיווח זיהוי: "' + (d.data.selectedText || '') + '"');
    const sub = d.kind === 'propose'
      ? (catLabelOf(d.catId) + ' · נשמר ' + fmtDate(d.data.savedAt))
      : ('דיווח טעות · נשמר ' + fmtDate(d.data.savedAt));
    personalBody.appendChild(personalRow(title, sub, [
      { label: 'שליחה', onClick: () => sendToDev(
          d.kind === 'propose' ? ('הצעת תוספת — ' + (d.data.name || '')) : ('דיווח טעות בזיהוי — "' + (d.data.selectedText || '') + '"'),
          draftBody(d),
          d.kind === 'propose' ? 'הצעת ערך' : 'דיווח זיהוי'
        ) },
      { label: '💾 הורדה', secondary: true, onClick: () => downloadDrafts([d],
          d.kind === 'propose' ? ('הצעה-' + (d.data.name || 'ערך')) : 'דיווח-זיהוי') },
      { label: 'מחיקה', secondary: true, onClick: async () => {
          if ((await uiConfirm('למחוק את הפריט?'))) deleteDraft(d);
        } }
    ]));
  });
}

async function renderPersonalPages(){
  personalBody.appendChild(sectionHead('📄 דפי HTML שמורים', ''));
  const bulk = document.createElement('div');
  bulk.className = 'p-bulk';
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'panel-btn';
  addBtn.textContent = '➕ הוספת דף HTML';
  addBtn.addEventListener('click', openAddHtmlPanel);
  bulk.appendChild(addBtn);
  const pdfBtn = document.createElement('button');
  pdfBtn.type = 'button';
  pdfBtn.className = 'panel-btn';
  pdfBtn.textContent = '📕 פתיחת PDF כמדריך';
  pdfBtn.addEventListener('click', () => { closePersonalArea(); openPdfGuide(); });
  bulk.appendChild(pdfBtn);
  personalBody.appendChild(bulk);

  const index = await getHtmlPagesIndex();
  if (!index.length){
    personalBody.insertAdjacentHTML('beforeend',
      personalEmpty('אין עדיין דפים שמורים. דף שנוסף כאן נשמר לצמיתות ומקבל ריבוע משלו בעמוד השער.'));
    return;
  }
  index.forEach(page => {
    const name = page.name;
    const sub = (page.placement === 'masechet' && page.masechet) ? ('דף HTML שמור · מסכת ' + page.masechet) : 'דף HTML שמור · עמוד ראשי';
    personalBody.appendChild(personalRow(name, sub, [
      { label: 'פתיחה', onClick: () => { closePersonalArea(); openCustomHtmlPage(name); } },
      { label: 'שליחה', secondary: true, onClick: async () => {
          const content = await getHtmlPageContent(name);
          sendToDev('דף HTML מצורף — ' + name,
            'המשתמש הוסיף דף HTML בשם "' + name + '".\n\nתוכן הדף:\n\n' + (content || ''),
            'דף HTML');
        } },
      { label: 'מחיקה', secondary: true, onClick: async () => {
          if (!(await uiConfirm('למחוק את "' + name + '"?'))) return;
          await deleteHtmlPage(name);
          talmudRendered = false;
          renderCustomPageCards();
          renderPersonalBody();
        } }
    ]));
  });
}

// ============================================================
//  🆕 מה חדש (2.13.1) — הגרסה המותקנת מול הגרסה האחרונה בגיטהאב, וסיכום
//  היומן. משתמשת ב-readLocalPluginVersion/fetchRemoteVersion/cmpVersion
//  הקיימים ב-bridge.js (בדיקת העדכון השקטה שכבר רצה ברקע) - לא כתובה שוב.
//  אין "התקנה אוטומטית" אמיתית מתוך ה-WebView, ולכן "כפתור עדכון" פותח את
//  דף ה-Releases בגיטהאב (דרך data-external-link, כמו כל קישור חיצוני כאן).
// ============================================================
function whatsNewStatusHTML(local, remote){
  let html = '<div class="field-label" style="margin-top:0;">הגרסה המותקנת אצלך</div><p>' + esc(local || 'לא ידועה') + '</p>';
  if (!remote){
    html += '<p class="mini-note">לא הצלחתי לבדוק את הגרסה האחרונה בגיטהאב כרגע (יש צורך בחיבור לרשת).</p>';
  } else if (local && cmpVersion(remote, local) > 0){
    html += '<p><strong>יש גרסה חדשה יותר: ' + esc(remote) + '.</strong></p>'
      + '<div class="p-bulk"><a href="#" class="panel-btn" data-external-link="' + esc(UPDATE_RELEASES_URL) + '" data-requires-net>⬇️ לעדכון — דף ההורדות בגיטהאב</a></div>';
  } else if (local && cmpVersion(remote, local) < 0){
    html += '<p class="mini-note">הגרסה שאצלך (' + esc(local) + ') חדשה מהגרסה האחרונה שפורסמה בגיטהאב (' + esc(remote) + ') — טרם שוחררה שם.</p>';
  } else {
    html += '<p>✅ מעודכן לגרסה האחרונה (' + esc(remote) + ').</p>';
  }
  html += '<p class="mini-note" style="margin-top:10px;"><a href="#" data-external-link="' + esc(UPDATE_RELEASES_URL) + '" data-requires-net>📦 כל הגרסאות בגיטהאב ↗</a></p>';
  return html;
}

// פרסינג קל ל-CHANGELOG.md: מפצל לפי כותרות "## " (גרסה+תאריך), וממיר כל
// גוף בלוק ל-HTML מינימלי (שורת בולט "* " -> <li>, **מודגש** -> <strong>).
// לא פרסר Markdown מלא - רק מה שהפורמט הקבוע של הקובץ הזה בפועל משתמש בו.
// [טקסט](נתיב) בתוך ROADMAP.md/CHANGELOG.md -> קישור לגיטהאב שקיים רק כשיש רשת
// (data-requires-net, כמו כל קישור חיצוני אחר בקובץ הזה) + טקסט רגיל שקיים רק
// כשאין רשת (data-offline-only) - אותו דפוס זוגי בדיוק כמו כפתור טופס הדיווח
// למעלה, כדי שבמצב אופליין יישאר כתוב ולא ייעלם (net-disabled = display:none).
// נתיב שאינו http נחשב יחסי לשורש הריפו, כי משם ROADMAP.md/CHANGELOG.md נטענים.
const REPO_BLOB_BASE = 'https://github.com/Hadabadra/madaei-hatanach/blob/main/';
function mdLinkify(html){
  return html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
    const full = /^https?:\/\//.test(url) ? url : REPO_BLOB_BASE + url;
    return '<a href="#" data-external-link="' + full + '" data-requires-net>' + text + ' ↗</a>'
         + '<span data-offline-only>' + text + '</span>';
  });
}
function mdBoldify(s){
  return mdLinkify(esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>'));
}
function mdLiteToHtml(md){
  const lines = String(md || '').split('\n');
  let html = '', inList = false;
  lines.forEach(line => {
    const t = line.trim();
    if (!t){ if (inList){ html += '</ul>'; inList = false; } return; }
    const bullet = t.match(/^\*\s+(.*)$/);
    if (bullet){
      if (!inList){ html += '<ul>'; inList = true; }
      html += '<li>' + mdBoldify(bullet[1]) + '</li>';
    } else {
      if (inList){ html += '</ul>'; inList = false; }
      html += '<p>' + mdBoldify(t) + '</p>';
    }
  });
  if (inList) html += '</ul>';
  return html;
}
// EMBEDDED_CHANGELOG_MD (guides/_shared/changelog-embedded.js) מוטבע ב-build/
// pack.ps1 בזמן האריזה, מתוך CHANGELOG.md עצמו - לא fetch בזמן ריצה. fetch
// ל-CHANGELOG.md נכשל בפועל בתוך ה-WebView של אוצריא (הקובץ אכן ארוז בחבילה,
// אבל הטעינה בזמן ריצה לא עבדה שם); ההטבעה מסירה את התלות הזו לגמרי.
function loadChangelogBlocks(){
  const text = (typeof EMBEDDED_CHANGELOG_MD !== 'undefined') ? EMBEDDED_CHANGELOG_MD : '';
  if (!text) return Promise.resolve(null);
  return Promise.resolve(text.split(/\n(?=## )/).filter(p => p.trim().indexOf('## ') === 0).map(p => {
    const nl = p.indexOf('\n');
    return {
      header: (nl === -1 ? p : p.slice(0, nl)).replace(/^##\s*/, '').trim(),
      body: nl === -1 ? '' : p.slice(nl + 1).trim()
    };
  }));
}
function renderChangelogInto(container, blocks, missingLabel, collapseAfter){
  if (!blocks || !blocks.length){
    container.innerHTML = '<p class="mini-note">לא הצלחתי לטעון את ' + (missingLabel || 'יומן השינויים (CHANGELOG.md)') + '.</p>';
    return;
  }
  // 4.7: תקציר במקום כל היומן - collapseAfter (אם ניתן) קובע כמה בלוקים
  // אחרונים גלויים; כל השאר נכנס תחת קיפול "גרסאות קודמות" אחד, כך שהלשונית
  // נפתחת על תקציר קצר אבל ההיסטוריה המלאה עדיין נגישה בלחיצה. בלי
  // collapseAfter (ROADMAP) - כל הבלוקים גלויים כמו קודם.
  const det = (b, open) =>
    `<details class="month-details"${open ? ' open' : ''}><summary>${esc(b.header)}</summary>${mdLiteToHtml(b.body)}</details>`;
  const recent = collapseAfter ? blocks.slice(0, collapseAfter) : blocks;
  const older = collapseAfter ? blocks.slice(collapseAfter) : [];
  // כל הבלוקים סגורים כברירת מחדל (בקשת בעל הפרויקט, 04/09/2026): הלשונית
  // נפתחת על רשימת כותרות קצרה וקריאה, והמשתמש פותח רק את מה שמעניין אותו.
  container.innerHTML = recent.map(b => det(b, false)).join('')
    + (older.length
      ? `<details class="month-details"><summary>📜 ${older.length} גרסאות קודמות</summary>${older.map(b => det(b, false)).join('')}</details>`
      : '');
}

// EMBEDDED_ROADMAP_MD (guides/_shared/roadmap-embedded.js) מוטבע ב-build/pack.ps1
// באותו אופן בדיוק כמו EMBEDDED_CHANGELOG_MD למעלה, מתוך ROADMAP.md שבשורש
// הריפו - לא קבוע ידני יותר, ולא fetch בזמן ריצה.
function loadRoadmapBlocks(){
  const text = (typeof EMBEDDED_ROADMAP_MD !== 'undefined') ? EMBEDDED_ROADMAP_MD : '';
  if (!text) return Promise.resolve(null);
  return Promise.resolve(text.split(/\n(?=## )/).filter(p => p.trim().indexOf('## ') === 0).map(p => {
    const nl = p.indexOf('\n');
    return {
      header: (nl === -1 ? p : p.slice(0, nl)).replace(/^##\s*/, '').trim(),
      body: nl === -1 ? '' : p.slice(nl + 1).trim()
    };
  }));
}

function renderPersonalWhatsNew(){
  personalBody.appendChild(sectionHead('🆕 מה חדש', ''));

  const statusWrap = document.createElement('div');
  statusWrap.innerHTML = '<p class="mini-note" style="margin-top:0">בודק גרסה...</p>';
  personalBody.appendChild(statusWrap);

  const bulk = document.createElement('div');
  bulk.className = 'p-bulk';
  const refreshBtn = document.createElement('button');
  refreshBtn.type = 'button';
  refreshBtn.className = 'panel-btn secondary';
  refreshBtn.textContent = '🔄 בדיקת עדכון עכשיו';
  refreshBtn.setAttribute('data-requires-net', '');
  bulk.appendChild(refreshBtn);
  personalBody.appendChild(bulk);

  personalBody.appendChild(sectionHead('📜 מה התחדש', ''));
  const changelogWrap = document.createElement('div');
  changelogWrap.innerHTML = '<p class="mini-note">טוען יומן שינויים...</p>';
  personalBody.appendChild(changelogWrap);

  // מוטבע מ-ROADMAP.md בזמן האריזה (ר' loadRoadmapBlocks למעלה) - מתעדכן אוטומטית
  // בכל אריזה, בלי תחזוקה ידנית נפרדת מ-docs/.
  personalBody.appendChild(sectionHead('🛣️ מה מתוכנן בהמשך', ''));
  const roadmapWrap = document.createElement('div');
  roadmapWrap.innerHTML = '<p class="mini-note" style="margin-top:0">טוען תכנון עתידי...</p>';
  personalBody.appendChild(roadmapWrap);

  async function refreshStatus(){
    statusWrap.innerHTML = '<p class="mini-note" style="margin-top:0">בודק גרסה...</p>';
    const local = await readLocalPluginVersion();
    const remote = await fetchRemoteVersion().catch(() => null);
    statusWrap.innerHTML = whatsNewStatusHTML(local, remote);
  }
  refreshBtn.addEventListener('click', refreshStatus);
  refreshStatus();
  loadChangelogBlocks().then(blocks => renderChangelogInto(changelogWrap, blocks, null, 5));
  loadRoadmapBlocks().then(blocks => {
    renderChangelogInto(roadmapWrap, blocks, 'מה מתוכנן (ROADMAP.md)');
    wireRoadmapIdeas(roadmapWrap);
  });
}

// #63 — ״💡 יש לי רעיון על זה״ ליד כל פריט ב״מה מתוכנן״: פותח את פאנל ההודעות
// מסוג ״הצעה״ עם הפריט ממולא. המזהה היציב הוא מספר הפנייה (#NN) כשיש כזה —
// הוא מה שהמפתח צריך כדי לחבר את ההצעה לפריט — ואחרת תחילת הטקסט.
function wireRoadmapIdeas(container){
  if (!container || typeof openReportPanel !== 'function') return;
  container.querySelectorAll('li').forEach(li => {
    if (li.querySelector(':scope > .rm-idea-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rm-idea-btn';
    btn.textContent = '💡';
    btn.title = 'יש לי רעיון על זה';
    btn.setAttribute('aria-label', 'יש לי רעיון על הפריט הזה');
    btn.style.cssText = 'margin-inline-start:6px;border:0;background:none;cursor:pointer;font-size:.95em;padding:0 2px;';
    btn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const clone = li.cloneNode(true);
      clone.querySelectorAll('.rm-idea-btn, ul, ol').forEach(n => n.remove());
      const text = clone.textContent.replace(/\s+/g, ' ').trim();
      const issue = (text.match(/#(\d{1,4})\b/) || [])[1];
      const short = text.length > 70 ? text.slice(0, 69) + '…' : text;
      openReportPanel({
        kind: 'הצעה',
        title: 'רעיון על ' + (issue ? '#' + issue : '״' + short + '״'),
        details: 'הפריט ב״מה מתוכנן״' + (issue ? ' (#' + issue + ')' : '') + ':\n' + text.slice(0, 400) + '\n\nהרעיון שלי:\n'
      });
    });
    li.appendChild(btn);
  });
}

// בפתיחת התוסף: אם נשארו דיווחים בתור מפעם קודמת — ניסיון שקט לשלוח אותם.
// שקט מוחלט: אין הודעה בהצלחה ואין הודעה בכישלון. אותו עיכוב-אדיבות כמו
// בדיקת העדכונים ב-bridge.js, כדי לא להתחרות בטעינת המדריכים.
setTimeout(() => { flushReportOutbox().catch(()=>{}); }, REPORT_FLUSH_DELAY_MS);

document.getElementById('personalCard').addEventListener('click', () => openPersonalArea('bookmarks'));
document.getElementById('personalBackBtn').addEventListener('click', closePersonalArea);
document.querySelectorAll('#personalTabs .ptab').forEach(btn => {
  btn.addEventListener('click', () => openPersonalArea(btn.dataset.ptab));
});
