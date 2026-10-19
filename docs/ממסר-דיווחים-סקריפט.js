// ============================================================
//  ממסר הדיווחים של "עינים למקרא" — קוד ה-Apps Script המלא
//  גרסה 2 (12.8.26): נוספו תמונות מצורפות ומניעת כפילויות.
//
//  ⚠️ זה הקובץ המקור. מה שרץ בפועל הוא ההעתק שמודבק ב-script.google.com,
//  ולכן כל שינוי כאן מחייב הדבקה מחדש שם — ו**פריסה מחדש כגרסה חדשה של
//  אותה פריסה** (Deploy ← Manage deployments ← ✏️ ← Version: New version).
//  יצירת "New deployment" תיתן כתובת /exec חדשה והתוסף יפסיק לעבוד.
//
//  שתי נקודות כניסה, ושתיהן חייבות להישאר:
//    doPost       — המסלול הראשי. התוסף שולח לכאן JSON ישירות.
//    onFormSubmit — טריגר על הגיליון. מסלול הגיבוי (טופס גוגל), וגם
//                   הערוץ של מי שאין לו חשבון גיטהאב וממלא את הטופס ביד.
// ============================================================

const REPO    = 'Hadabadra/madaei-hatanach';
const IMG_DIR = 'docs/report-images';        // התמונות נשמרות בריפו עצמו
const NL      = String.fromCharCode(10);

function ghToken_(){
  return PropertiesService.getScriptProperties().getProperty('GH_TOKEN');
}

function out_(obj){
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
//  המסלול הראשי — התוסף שולח JSON
// ============================================================
// ⚠️ התוסף שולח ב-mode:'no-cors' ולכן **לא יכול לקרוא את התשובה הזאת**.
// היא נועדה לבדיקות ידניות (curl) בלבד. המסקנה המעשית: אסור להסתמך על כך
// שהתוסף יֵדע שמשהו נכשל — כל כשל כאן חייב להיות מתועד ביומן הביצוע.
function doPost(e){
  const lock = LockService.getScriptLock();
  try {
    const body    = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const id      = String(body.id || '').slice(0, 60);
    const kind    = String(body.kind || 'דיווח').slice(0, 40);
    const title   = String(body.title || '').trim().slice(0, 120) || 'דיווח מהתוסף';
    const details = String(body.details || '').slice(0, 6000);
    const env     = String(body.env || '');
    const images  = Array.isArray(body.images) ? body.images.slice(0, 4) : [];

    // ---- מניעת כפילויות ----
    // התוסף מוותר על הבקשה אחרי 8 שניות ועובר למסלול הבא, אבל ה-fetch שלו
    // ממשיך לרוץ ברקע ועלול להגיע לכאן בכל זאת. בלי הבדיקה הזאת אותו דיווח
    // נפתח פעמיים (כך נוצרו Issues 11-14 בבדיקה של 12.8.26).
    try { lock.waitLock(25000); } catch(_){}
    const cache = CacheService.getScriptCache();
    const key   = id ? ('rep_' + id) : null;
    if (key){
      const seen = cache.get(key);
      if (seen) return out_({ success: true, duplicate: true, url: seen, status: 200 });
    }

    const parts = [details];
    if (images.length){
      const up = uploadImages_(images, id || String(new Date().getTime()));
      if (up.markdown.length) parts.push('', up.markdown.join(NL));
      if (up.failed) parts.push('', '_(' + up.failed + ' תמונות צורפו אך העלאתן נכשלה.)_');
    }
    parts.push('', '---', '**סוג:** ' + kind, '**סביבה:** ' + env);

    const res  = createIssue_('[' + kind + '] ' + title, parts.join(NL));
    const code = res.getResponseCode();
    const url  = (JSON.parse(res.getContentText() || '{}') || {}).html_url || '';
    if (key && code === 201) cache.put(key, url, 900);   // רבע שעה
    if (code !== 201) console.error('פתיחת Issue נכשלה: ' + code + ' — ' + res.getContentText());
    return out_({ success: code === 201, status: code, url: url });

  } catch (err){
    console.error('doPost: ' + err);
    return out_({ success: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch(_){}
  }
}

// גישה ישירה בדפדפן — כדי ש"האם הממסר חי?" תהיה שאלה של שנייה אחת.
function doGet(){
  return out_({ status: 'ok', message: 'ממסר הדיווחים של עינים למקרא פעיל. דיווחים נשלחים ב-POST בלבד.' });
}

// ============================================================
//  תמונות
// ============================================================
// הן נשמרות **בריפו עצמו** דרך Contents API, ולא בשירות תמונות חיצוני:
// אין חשבון נוסף לפתוח, אין מפתח נוסף לשמור, והתמונה מוצגת בתוך ה-Issue
// כמו כל תמונה אחרת בגיטהאב. המחיר: הטוקן צריך גם Contents: Read and write
// על הריפו הזה (ולא Issues בלבד).
//
// ⚠️ אם לא תרחיבו את הטוקן — שום דבר לא נשבר: ההעלאה תיכשל, ה-Issue ייפתח
// כרגיל, ובגופו תופיע שורה שאומרת שהתמונות לא עלו.
function uploadImages_(images, stamp){
  const markdown = [];
  let failed = 0;
  for (let i = 0; i < images.length; i++){
    try {
      const m = /^data:image\/([a-zA-Z0-9+.\-]+);base64,(.+)$/.exec(String(images[i] || ''));
      if (!m){ failed++; continue; }
      const ext  = (m[1].toLowerCase() === 'jpeg') ? 'jpg' : m[1].toLowerCase();
      const path = IMG_DIR + '/' + stamp + '-' + (i + 1) + '.' + ext;
      const res  = UrlFetchApp.fetch('https://api.github.com/repos/' + REPO + '/contents/' + path, {
        method: 'put',
        contentType: 'application/json',
        headers: {
          Authorization: 'Bearer ' + ghToken_(),
          Accept: 'application/vnd.github+json',
          'User-Agent': 'madaei-relay'
        },
        payload: JSON.stringify({
          message: 'תמונה מצורפת לדיווח ' + stamp,
          content: m[2]                    // כבר base64 של בייטי הקובץ — בדיוק מה שה-API מבקש
        }),
        muteHttpExceptions: true
      });
      const data = JSON.parse(res.getContentText() || '{}');
      const url  = data && data.content && data.content.download_url;
      if (res.getResponseCode() < 300 && url){
        markdown.push('![צילום מסך ' + (i + 1) + '](' + url + ')');
      } else {
        failed++;
        console.error('העלאת תמונה נכשלה: ' + res.getResponseCode() + ' — ' + res.getContentText().slice(0, 300));
      }
    } catch (err){
      failed++;
      console.error('העלאת תמונה נכשלה: ' + err);
    }
  }
  return { markdown: markdown, failed: failed };
}

// ============================================================
//  פתיחת ה-Issue
// ============================================================
// ⚠️ User-Agent הוא חובה — גיטהאב דוחה בקשות בלעדיו ב-403.
function createIssue_(title, body){
  return UrlFetchApp.fetch('https://api.github.com/repos/' + REPO + '/issues', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + ghToken_(),
      Accept: 'application/vnd.github+json',
      'User-Agent': 'madaei-relay'
    },
    payload: JSON.stringify({ title: title, body: body }),
    muteHttpExceptions: true
  });
}

// ============================================================
//  מסלול הגיבוי — טריגר על הגיליון
// ============================================================
// רץ על שרתי גוגל, מחוץ לרשת של המשתמש, ולכן סינון תוכן אצלו כלל אינו בתמונה.
// זה גם הערוץ של מי שאין לו חשבון גיטהאב וממלא את הטופס ידנית בדפדפן.
function onFormSubmit(e){
  const v       = e.values || [];      // [חותמת זמן, סוג, כותרת, פרטים, סביבה]
  const kind    = v[1] || 'דיווח';
  const title   = String(v[2] || '').trim().slice(0, 120) || 'דיווח מהתוסף';
  const details = String(v[3] || '');
  const env     = String(v[4] || '');
  createIssue_('[' + kind + '] ' + title,
    [details, '', '---', '**סוג:** ' + kind, '**סביבה:** ' + env].join(NL));
}

// ============================================================
//  בדיקה מתוך העורך — בלי curl ובלי התוסף
// ============================================================
function testRelayInternal(){
  const res = doPost({ postData: { contents: JSON.stringify({
    id: 'test-' + new Date().getTime(),
    kind: 'בדיקה',
    title: 'בדיקת ממסר מתוך העורך',
    details: 'אם זה נפתח כ-Issue — הממסר, הטוקן והריפו כולם תקינים.',
    env: 'editor-test'
  }) } });
  console.log(res.getContent());
}
