// מקור הנתונים: אחסון אוצריא, עריכות מקומיות, סימניות וטעינת המדריכים.
// נוצר בפיצול router.js (גרסה 2.11.2). המקור: shell/router.js שורות 25-202, 1467-1478.
// אין להפוך ל-type="module" — כל הקבצים חולקים scope גלובלי אחד.


// ---- עריכות מקומיות: שמירה, טעינה מחדש ושחזור ----
// כל עריכה שנשמרת "במכשיר" נכתבת ל-localStorage תחת <catId>_edits_v1, במבנה:
//   { "<שם מקורי של הערך>": { savedAt, entry: <עותק מלא של הערך אחרי העריכה> } }
// המפתח הוא תמיד השם *המקורי* (לא השם אחרי העריכה) - אחרת שינוי שם היה מנתק את
// העריכה מהערך שלה בטעינה הבאה.
function editsKey(catId){ return (catId || 'general') + '_edits_v1'; }

function readStoredEdits(catId){
  try { return JSON.parse(localStorage.getItem(editsKey(catId)) || '{}'); }
  catch(e){ return {}; }
}

function rememberPristine(catId, entry){
  if (!pristineCache[catId]) pristineCache[catId] = {};
  if (!pristineCache[catId][entry.name]) {
    pristineCache[catId][entry.name] = JSON.parse(JSON.stringify(entry));
  }
}

// מחיל את העריכות השמורות על הנתונים שזה עתה נטענו מקובץ ה-data.
// נקרא פעם אחת לכל מדריך, מיד אחרי הטעינה - כך שהעריכות שורדות רענון/סגירה.
function applyStoredEdits(catId, data){
  const edits = readStoredEdits(catId);
  const names = Object.keys(edits);
  if (!names.length) return data;
  names.forEach(origName => {
    const rec = edits[origName];
    if (!rec || !rec.entry) return;
    const target = data.find(e => e.name === origName);
    if (target){
      rememberPristine(catId, target);   // שומרים את המקור כדי לאפשר שחזור
      Object.assign(target, rec.entry);
      target.__edited = true;
      target.__origName = origName;
    } else {
      // ערך שנוסף מקומית ואינו קיים בקובץ הנתונים המקורי
      data.push(Object.assign({}, rec.entry, { __edited: true, __origName: origName }));
    }
  });
  return data;
}

function saveEntryEdit(catId, origName, entry){
  try {
    const edits = readStoredEdits(catId);
    edits[origName] = { savedAt: new Date().toISOString(), entry: JSON.parse(JSON.stringify(entry)) };
    localStorage.setItem(editsKey(catId), JSON.stringify(edits));
    entry.__edited = true;
    return true;
  } catch(e){
    console.warn('madaei-hatanach: failed to persist edit', e);
    return false;
  }
}

function hasStoredEdit(catId, origName){
  return Object.prototype.hasOwnProperty.call(readStoredEdits(catId), origName);
}

// ---- סימון "כבר נשלח" להצעות עריכה (3.3.4) ----
// עד כאן כל לחיצה על "שליחה" בכרטיס פתחה Issue חדש, גם כשלא השתנה דבר מאז
// השליחה הקודמת — ולכן אותו כרטיס הגיע כמה פעמים והמתחזק לא ידע מה חדש.
// המפתח נפרד מ-<cat>_edits_v1 בכוונה: saveEntryEdit דורס את הרשומה כולה בכל
// שמירה, ושליחה אפשרית גם בלי שמירה מקומית. מה שנשמר הוא חתימת ה-diff עצמו,
// כך שעריכה נוספת (diff שונה) פותחת שליחה מחדש, וחזרה על אותה הצעה — לא.
function sentEditsKey(catId){ return (catId || 'general') + '_sent_v1'; }

function readSentEdits(catId){
  try { return JSON.parse(localStorage.getItem(sentEditsKey(catId)) || '{}'); }
  catch(e){ return {}; }
}

// FNV-1a 32-bit — די והותר לזיהוי "אותו diff בדיוק", ואינו דורש ספרייה.
function editDiffHash(text){
  let h = 0x811c9dc5;
  const s = String(text == null ? '' : text);
  for (let i = 0; i < s.length; i++){
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16);
}

function getEntryEditSent(catId, origName){
  return readSentEdits(catId)[origName] || null;
}

function markEntryEditSent(catId, origName, hash){
  try {
    const sent = readSentEdits(catId);
    sent[origName] = { at: new Date().toISOString(), hash: hash };
    localStorage.setItem(sentEditsKey(catId), JSON.stringify(sent));
    return true;
  } catch(e){
    console.warn('madaei-hatanach: failed to persist sent marker', e);
    return false;
  }
}

// מחזיר ערך לגרסת המקור שבקובץ הנתונים, ומוחק את העריכה השמורה.
function restoreEntryToOriginal(catId, entry, origName){
  const pristine = pristineCache[catId] && pristineCache[catId][origName];
  try {
    const edits = readStoredEdits(catId);
    delete edits[origName];
    localStorage.setItem(editsKey(catId), JSON.stringify(edits));
  } catch(e){ /* גם אם המחיקה נכשלה, נשחזר לפחות בזיכרון */ }
  if (pristine){
    Object.keys(entry).forEach(k => { delete entry[k]; });
    Object.assign(entry, JSON.parse(JSON.stringify(pristine)));
    return true;
  }
  // אין עותק מקור בזיכרון (הערך נוסף מקומית מלכתחילה) - רק מסירים את סימון העריכה
  delete entry.__edited;
  return false;
}

// ---- סימניות ----
// נשמרות ב-localStorage וממוזערות גם לאחסון של אוצריא (כמו העדפות התצוגה), כדי
// שינוי גרסה או ניקוי של localStorage לא ימחקו אותן. המפתח הוא השם *המקורי* של
// הערך (כמו בעריכות), כדי ששינוי שם מקומי לא ינתק את הסימנייה.
function bookmarkKeyOf(entry){ return (entry && (entry.__origName || entry.name)) || ''; }

function readBookmarks(){
  try { return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]'); }
  catch(e){ return []; }
}

function writeBookmarks(list){
  try { localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list)); } catch(e){}
  storageSet(BOOKMARKS_KEY, list);
}

function isBookmarked(catId, key){
  return readBookmarks().some(b => b.catId === catId && b.key === key);
}

// מחזיר true אם הסימנייה נוספה, false אם הוסרה.
function toggleBookmark(catId, key, label){
  const list = readBookmarks();
  const i = list.findIndex(b => b.catId === catId && b.key === key);
  if (i >= 0){ list.splice(i, 1); writeBookmarks(list); return false; }
  list.push({ catId: catId, key: key, label: label || key, addedAt: new Date().toISOString() });
  writeBookmarks(list);
  return true;
}

// שחזור מהאחסון של אוצריא — רק אם אין כלום מקומית (אותו דפוס כמו restorePrefsFromOtzaria).
async function restoreBookmarksFromOtzaria(){
  try {
    let hasLocal = false;
    try { hasLocal = !!localStorage.getItem(BOOKMARKS_KEY); } catch(e){}
    if (hasLocal) return;
    const stored = await storageGet(BOOKMARKS_KEY);
    if (Array.isArray(stored) && stored.length){
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(stored));
    }
  } catch(e){}
}

// טוען את מאגר הנתונים (ואם קיימות - התמונות המוטבעות וחלוקת הקטגוריות) של מדריך
// ע"י iframe נסתר שטוען את קובץ ה-data שלו דרך תגית <script> רגילה (בדיוק כמו שכל
// מדריך טוען את הנתונים של עצמו) - לא דרך fetch, כדי לא להיתקל באפשרות שסביבת
// ה-webview של אוצריא חוסמת fetch לקבצים מקומיים.
function loadGuideData(cat){
  if (dataCache[cat.id]) return Promise.resolve(dataCache[cat.id]);
  if (dataPromises[cat.id]) return dataPromises[cat.id];

  dataPromises[cat.id] = new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    let settled = false;
    const finish = (data, images, cats) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
      // מחילים עריכות מקומיות שמורות *לפני* השמירה במטמון, כדי שגם מנוע הזיהוי
      // (שנבנה מאותם נתונים) יכיר את הכינויים/השמות שהמשתמש הוסיף.
      dataCache[cat.id] = applyStoredEdits(cat.id, data);
      imagesCache[cat.id] = Object.assign(imagesCache[cat.id] || {}, images || {});
      catsCache[cat.id] = cats || [];
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      resolve(dataCache[cat.id]);
    };
    function onMessage(ev){
      const msg = ev.data;
      if (!msg || !msg.__madaeiHatanachLoader || msg.cat !== cat.id) return;
      finish(msg.ok ? (msg.data || []) : [], msg.images, msg.cats);
    }
    window.addEventListener('message', onMessage);
    // מאגרי הנתונים כבדים (עד ~6MB לקטגוריה). בטעינה איטית - דיסק עמוס, מכשיר חלש -
    // 8 שניות לא הספיקו והמדריך היה נפתח ריק בלי שום דרך לנסות שוב. עכשיו: חלון ארוך,
    // ובכישלון לא שומרים תוצאה ריקה במטמון כדי שהניסיון הבא ייטען מחדש.
    const timer = setTimeout(() => {
      console.warn('madaei-hatanach: timeout loading data for', cat.id);
      if (!settled) {
        settled = true;
        window.removeEventListener('message', onMessage);
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        delete dataPromises[cat.id];   // מאפשר ניסיון חוזר
        resolve([]);
      }
    }, 45000);
    iframe.src = cat.loaderPath;
    document.body.appendChild(iframe);
  });
  return dataPromises[cat.id];
}

// #54 (5.0.0): התמונות המוטבעות (~80% מהמשקל) יושבות ב-<x>-images.js ונטענות רק כשמדריך נפתח
// או כשכרטיס שלו מוצג — באותו דפוס iframe+postMessage של loadGuideData (לא fetch).
// הטקסט (DATA) ממשיך להיטען מראש, כדי לא לשבור את קישורי המקומות ואת ״מוזכר יחד עם״.
const IMAGE_GUIDES = new Set(['animal','archaeology','beithamikdash','chullin','domem','flora','places','sukkah']);
const imagesLoaded = {}, imagesPromises = {};
function guideImagesReady(catId){ return !IMAGE_GUIDES.has(catId) || !!imagesLoaded[catId]; }
function loadGuideImages(cat){
  if (!cat || guideImagesReady(cat.id)) return Promise.resolve(imagesCache[cat && cat.id] || {});
  if (imagesPromises[cat.id]) return imagesPromises[cat.id];
  imagesPromises[cat.id] = new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    let settled = false;
    const done = (images, ok) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      imagesCache[cat.id] = Object.assign(imagesCache[cat.id] || {}, images || {});
      if (ok) imagesLoaded[cat.id] = true; else delete imagesPromises[cat.id]; // בכישלון — ניסיון חוזר בפעם הבאה
      resolve(imagesCache[cat.id]);
    };
    function onMessage(ev){
      const msg = ev.data;
      if (!msg || !msg.__madaeiHatanachImages || msg.cat !== cat.id) return;
      done(msg.ok ? msg.images : {}, !!msg.ok);
    }
    window.addEventListener('message', onMessage);
    const timer = setTimeout(() => { console.warn('madaei-hatanach: timeout loading images for', cat.id); done({}, false); }, 45000);
    iframe.src = cat.loaderPath.replace(/_loader\.html$/, '_images-loader.html');
    document.body.appendChild(iframe);
  });
  return imagesPromises[cat.id];
}

// טעינה מוקדמת בטור ולא במקביל: שישה קבצי ענק שנטענים יחד מרעיבים זה את זה
// (ובמיוחד מול שרת/דיסק איטי) ומייצרים בדיוק את הטיימאאוט שלמעלה.
function preloadAllGuides(list, i){
  if (i >= list.length) return;
  loadGuideData(list[i]).then(() => preloadAllGuides(list, i + 1),
                              () => preloadAllGuides(list, i + 1));
}
// אוצריא אינה עקבית בצורת התשובה של storage.get, ושני תוספים שעובדים בפועל קוראים
// אותה הפוך: ״יומא דהילולא״ קורא res.data.value, ו״עיון ההלכה״ קורא res.data עצמו.
// עד היום החזרנו את res.data כמות שהוא — כלומר במעטפת { value: ... } קיבלנו את
// המעטפת ולא את הערך, ‏rec.text יצא undefined, והקוד יצא בשקט בלי שום שגיאה.
// זו הסיבה האמיתית לבאג 996, וגם למה restoreBookmarksFromOtzaria לא שחזר כלום.
// מעכשיו: מקלפים את המעטפת אם היא קיימת, ותומכים בשתי הצורות.
function unwrapStorageValue(data){
  if (data === undefined) return null;
  if (data && typeof data === 'object' && !Array.isArray(data)
      && Object.prototype.hasOwnProperty.call(data, 'value')){
    return data.value === undefined ? null : data.value;
  }
  return data;
}

function storageGet(key){
  if (!hasOtzaria()) return Promise.resolve(null);
  return Otzaria.call('storage.get', { key: key }).then(res => unwrapStorageValue(res && res.data)).catch(() => null);
}
function storageSet(key, value){
  if (!hasOtzaria()) return Promise.resolve(false);
  return Otzaria.call('storage.set', { key: key, value: value }).then(res => !(res && res.success === false)).catch(() => false);
}

// ---- רשומות מבניות באחסון אוצריא ----
// אוצריא אינה מבטיחה שמירת אובייקטים ב-storage.set. בדיקת תוספים שעובדים בפועל
// מראה שני דפוסים סותרים: ״יומא דהילולא״ כותב value: JSON.stringify(...) ואילו
// ״עיון ההלכה״ מעביר את האובייקט כמות שהוא. אם השכבה שמתחת ממירה למחרוזת בעצמה,
// אובייקט נשמר כ-"[object Object]" והקריאה חוזרת שבורה בלי שום שגיאה גלויה —
// בדיוק התסמין של באג 996 (המעבר ללשונית קרה, אבל שום תוצאה לא הוצגה).
// לכן: כותבים תמיד מחרוזת JSON, וקוראים בסובלנות לשני המצבים גם יחד.
function storageSetJson(key, value){
  if (value === null || value === undefined) return storageSet(key, null);
  let payload;
  try { payload = JSON.stringify(value); }
  catch(e){ return Promise.resolve(false); }
  return storageSet(key, payload);
}

function storageGetJson(key){
  return storageGet(key).then(raw => {
    if (raw === null || raw === undefined || raw === '') return null;
    if (typeof raw === 'object') return raw;               // גרסה ששומרת אובייקטים כמו שהם
    if (typeof raw !== 'string') return null;
    if (raw === '[object Object]') return null;            // נשמר בגרסה ישנה בלי stringify
    try { return JSON.parse(raw); } catch(e){ return null; }
  });
}

// עד 2.15.1 האינדקס היה מערך שמות (מחרוזות) בלבד. מ-2.16 (מפרט 4.0, ג׳) כל איבר
// הוא אובייקט {name, placement, masechet, icon} — placement: 'home' | 'masechet'.
// storageGetJson קורא בסובלנות גם ערך שנשמר כאובייקט/מערך ממש (כמו שהפורמט הישן
// נשמר, לפני שהמעבר ל-storageSetJson) וגם מחרוזת JSON (הפורמט מ-2.16 ואילך) —
// כך שאין צורך בקריאת storage כפולה כדי לתמוך בשני הפורמטים.
//
// #43 (4.9.0) — הדף "נעלם" מעמוד הבית אחרי סגירת אוצריא. שלוש סיבות, שלושה תיקונים:
//  1. האיקון (data URI מלא) ישב *בתוך* רשומת האינדקס, והאינדקס תפח לעשרות-מאות KB —
//     בדיוק מה ש-storage.set עלול לחתוך/לדחות. עכשיו האיקון נשמר במפתח נפרד
//     (HTML_ICON_PREFIX + שם) ובאינדקס נשאר רק hasIcon:true. רשומות ישנות עם icon
//     בתוך האינדקס נקראות כרגיל ומפוצלות בשמירה הבאה.
//  2. אין מראה מקומית — עכשיו האינדקס, האיקונים ותוכן הדפים נכתבים גם ל-localStorage
//     (כמו הסימניות), ובקריאה נופלים אליו כשאוצריא לא החזירה כלום.
//  3. הכישלון נבלע — saveHtmlPagesIndex/setHtmlPageContent מחזירים הצלחה, והקורא
//     מתריע במקום להודיע ״נשמר לצמיתות״.
const HTML_PAGE_PREFIX = 'madaei_html_page__';
const HTML_ICON_PREFIX = 'madaei_html_icon__';
const htmlIconWritten = Object.create(null);   // שם → האיקון שכבר נכתב (חוסך כתיבות חוזרות)

function lsGet(key){ try { return localStorage.getItem(key); } catch(e){ return null; } }
function lsSet(key, value){
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    return true;
  } catch(e){ return false; }   // מכסת localStorage מלאה — המראה היא רשת ביטחון, לא חובה
}

async function getHtmlPagesIndex(){
  let raw = await storageGetJson(HTML_PAGES_INDEX_KEY);
  if (!Array.isArray(raw)){
    try { raw = JSON.parse(lsGet(HTML_PAGES_INDEX_KEY) || 'null'); } catch(e){ raw = null; }
  }
  const list = (Array.isArray(raw) ? raw : []).map(item => (typeof item === 'string')
    ? { name: item, placement: 'home', masechet: null, icon: null, hasIcon: false }
    : { name: item.name, placement: item.placement || 'home', masechet: item.masechet || null,
        icon: item.icon || null, hasIcon: !!(item.hasIcon || item.icon) });
  for (const page of list){
    if (page.icon || !page.hasIcon) continue;
    let icon = await storageGet(HTML_ICON_PREFIX + page.name);
    if (typeof icon !== 'string' || !icon) icon = lsGet(HTML_ICON_PREFIX + page.name);
    page.icon = icon || null;
    if (page.icon) htmlIconWritten[page.name] = page.icon;
  }
  return list;
}

// מחזיר true אם נשמר באחסון של אוצריא; false אם נשמר רק במראה המקומית (או בכלל לא).
async function saveHtmlPagesIndex(list){
  let ok = true;
  const slim = [];
  for (const page of list){
    const icon = page.icon || null;
    if (icon && htmlIconWritten[page.name] !== icon){
      const iconOk = await storageSet(HTML_ICON_PREFIX + page.name, icon);
      lsSet(HTML_ICON_PREFIX + page.name, icon);
      if (iconOk) htmlIconWritten[page.name] = icon; else ok = false;
    }
    slim.push({ name: page.name, placement: page.placement || 'home', masechet: page.masechet || null, hasIcon: !!icon });
  }
  lsSet(HTML_PAGES_INDEX_KEY, JSON.stringify(slim));
  if (!(await storageSetJson(HTML_PAGES_INDEX_KEY, slim))) ok = false;
  return ok;
}

async function getHtmlPageContent(name){
  const content = await storageGet(HTML_PAGE_PREFIX + name);
  if (typeof content === 'string' && content) return content;
  return lsGet(HTML_PAGE_PREFIX + name);
}

async function setHtmlPageContent(name, content){
  lsSet(HTML_PAGE_PREFIX + name, content);
  return storageSet(HTML_PAGE_PREFIX + name, content);
}

// מחיקה מלאה של דף: מהאינדקס, התוכן והאיקון — בשני האחסונים.
async function deleteHtmlPage(name){
  const idx = await getHtmlPagesIndex();
  await saveHtmlPagesIndex(idx.filter(p => p.name !== name));
  await setHtmlPageContent(name, null);
  await storageSet(HTML_ICON_PREFIX + name, null);
  lsSet(HTML_ICON_PREFIX + name, null);
  delete htmlIconWritten[name];
}
