// הגשר לאוצריא + כל קריאות האתחול. חייב להיטען אחרון.
// נוצר בפיצול router.js (גרסה 2.11.2). המקור: shell/router.js שורות 1744-1881, 2572-2617.
// אין להפוך ל-type="module" — כל הקבצים חולקים scope גלובלי אחד.


// עוטפת את identify() עם בדיקת-ההקשר החיה מול הנקדן (ר' nikud-engine.js). משמשת
// גם את home.js (חיפוש חופשי). לא סורקת פורטים כאן (NikudEngine.isConnected
// בלבד) - כדי שלא תוסיף השהיה לנתיב הלחיצה כשאין הנקדן פתוח; הסריקה ברקע דרך
// NikudEngine.watch() שהופעל למטה.
//
// getLiveContext עושה קריאת-רשת אחת ומזינה שתי הרחבות של identify.js:
// allowStopwords (מילים דו-משמעיות כמו "אשר" שמותר להן לעקוף את STOPWORDS) ו-
// vocalizedText (הטקסט הנבחר מנוקד, לפסילת התאמות-חיתוך-תחילית שגויות כמו
// "משה"→"שה" - עוזר גם כשהטקסט המקורי לא היה מנוקד, לא רק על טקסט מנוקד).
// extra (4.5.0, מנוע v2): opts נוספים ל-identify — includePossible (חלון התוצאות מקפל
// את דרגת ״אפשרי״), source: {kind, book} (הספר הפתוח בקורא — עדות ״אותו ספר״).
async function identifyWithLiveContext(text, extra){
  let ctx = null;
  if (window.NikudEngine && NikudEngine.isConnected()){
    try { ctx = await NikudEngine.getLiveContext(text); } catch(e){}
  }
  return identify(text, Object.assign({ allowStopwords: ctx && ctx.allowStopwords, vocalizedText: ctx && ctx.vocalizedText }, extra || {}));
}

// 0.9.96 הוא הסף לשתי יכולות שונות שבמקרה נכנסו יחד: plugin.openSelf (מעבר ללשונית)
// והתרומות הדקלרטיביות (contributes.startup). הבדיקה אחת, כי גם הקריאה אחת.
// אם אי-אפשר לבדוק — מניחים גרסה תומכת ולא חוסמים.
// 'foreground' = הלשונית שהמשתמש רואה, 'background' = מנוע הרקע העצל שאוצריא
// מדליקה בלחיצה על פריט תפריט ההקשר המוצהר. נקבע ב-plugin.boot.
let runMode = 'foreground';

// האם המשתמש אישר את app.run_on_startup. זה מה שקובע מי מטפל בלחיצה על פריט
// תפריט ההקשר, ולפי API_REFERENCE §תרומות עלייה:
//   • יש הרשאה  → אוצריא מרימה מופע רקע ומוסרת לו את הלחיצה אחרי ה-boot.
//   • אין הרשאה → הלחיצה נופלת לפתיחת דף התוסף, והאירוע נמסר ללשונית.
// בלי הגדר הזה שני המופעים היו מציגים ui.showConfirm על אותה לחיצה.
let hasBackgroundPerm = false;

let modernAppCache = null;
async function isModernApp(){
  if (modernAppCache != null) return modernAppCache;
  if (!(window.Otzaria && Otzaria.call)){ modernAppCache = false; return false; }
  try {
    const res = await Otzaria.call('app.getInfo');
    // app.getInfo לא תמיד עוטף את התשובה ב-data (ר' com.software_bug_report.newplugin,
    // התוסף הרשמי לדיווח באגים, ששולף גם res?.data || res). לטפל בשתי הצורות.
    const info = (res && (res.data || res)) || {};
    const version = info.version;
    modernAppCache = !version || cmpVersion(version, '0.9.96') >= 0;
  } catch(e){
    modernAppCache = true;
  }
  return modernAppCache;
}

// 3.8.0 — plugin.openSelf({param}) + plugin.page_opened (#52): הבקשה נמסרת
// ישירות למופע הלשונית. המסירה דרך storage + הפולינג נשארים כרשת ביטחון בלבד,
// והמופע שמקבל את ה-param מסמן את ה-ts כנצרך כדי שלא תוצג פעמיים.
// #173 — מזהי חלקים קבועים לפתיחה מתוסף אחר (למשל כיוון תפילה):
//   Otzaria.call('plugin.openOther', { pluginId: 'com.chadbedera.madaeihatanach',
//                                      param: { section: 'kotel-archaeology' } })
// מזהה שאינו ברשימה מתקבל גם כמזהה מדריך ישיר (catId), ו-term אופציונלי מחפש בתוכו.
const OPEN_SECTIONS = {
  'temple-guide':      { catId: 'beithamikdash' },
  'kotel-archaeology': { catId: 'archaeology', term: 'כותל' },
  'archaeology':       { catId: 'archaeology' },
  'places':            { catId: 'places' },
};
// 5.3.0 — entry: שם ערך לפתיחה ישירה של הכרטיס שלו בתוך המדריך, למשל
//   param: { section: 'places', entry: 'באר שבע' }
function openSection(section, term, entry){
  const s = OPEN_SECTIONS[section] || (typeof CATEGORIES !== 'undefined' && CATEGORIES.some(c => c.id === section) ? { catId: section } : null);
  if (!s) return false;
  const p = openGuide(s.catId, entry || term || s.term || null);
  if (entry) Promise.resolve(p).then(() => openEntryCardByName(entry));
  return true;
}
function openEntryCardByName(name, tries){
  tries = tries || 0;
  const norm = t => String(t || '').replace(/[\u0591-\u05C7]/g, '').trim();
  const want = norm(name);
  const cards = Array.from(document.querySelectorAll('#guideGrid > .entry-card'));
  const hit = cards.find(c => { const h = c.querySelector('.entry-card-name'); return norm(h ? h.textContent : c.textContent.split('\n')[0]) === want; })
    || cards.find(c => norm(c.textContent).startsWith(want));
  if (hit) { hit.click(); return; }
  if (tries < 20) setTimeout(() => openEntryCardByName(name, tries + 1), 150);
}

function bringToFront(param){
  openSelfWith(param);
}

// ---- מסירת הזיהוי בין מופעי התוסף (התיקון לבאג "נפתח דף השער במקום התוצאות") ----
// ב-0.9.96 המעבר ללשונית (plugin.openSelf) עלול לטעון מחדש את מופע התוסף. כל חלון
// שציירנו לפני הקריאה נמחק יחד עם ה-webview, ולכן המשתמש רואה את דף השער.
// לכן: כותבים את הבקשה לאחסון של אוצריא *לפני* המעבר, והמופע שעולה קורא אותה ומציג.
// אם לא הייתה טעינה מחדש (0.9.95 ומטה) — התצוגה הישירה עובדת כרגיל, וה-timeout
// שלמטה מנקה את המפתח כדי שלא יוצג שוב בפתיחה הבאה.
// מזהה ייחודי למופע הנוכחי של התוסף. אם plugin.openSelf *לא* טוען מחדש, המופע
// שכתב את הבקשה הוא גם זה שכבר הציג אותה — ואז אסור לו להציג שוב כשהוא חוזר לחזית.
// אם כן נטען מחדש, למופע החדש יש מזהה אחר, והוא זה שיצרוך.
const INSTANCE_ID = 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function setPendingIdentify(text, mode){
  return storageSetJson(PENDING_IDENTIFY_KEY, {
    text: text, mode: mode || 'results', ts: Date.now(), origin: INSTANCE_ID
  });
}
function clearPendingIdentify(){ storageSetJson(PENDING_IDENTIFY_KEY, null); }

let consumingPending = false;
// חותמת הזמן של הבקשה האחרונה שהמופע הזה כבר הציג. המחיקה מהאחסון (למטה) היא
// ההגנה הראשונה, אבל היא לא מספיקה: אם היא נכשלת או שהאחסון של אוצריא לא באמת
// מוחק ב-null, הפולינג של 1.5 שניות מציג את אותה בקשה שוב ושוב — חלון התוצאות
// נבנה מחדש בלולאה, הסינון קופץ בחזרה ל"הכל", והצ׳יפים "מהבהבים ולא נלחצים"
// כי האלמנט שנלחץ מוחלף באמצע. הזיכרון בתוך המופע חוסם את זה בוודאות.
let lastConsumedTs = 0;
async function consumePendingIdentify(){
  if (consumingPending) return;          // מונע כפל צריכה כששני טריגרים נדלקים יחד
  consumingPending = true;
  try {
    const rec = await storageGetJson(PENDING_IDENTIFY_KEY);
    if (!rec || !rec.text) return;
    // בקשה שהמופע הזה כתב בעצמו — הוא כבר הציג אותה ב-showNow. יוצאים *בלי למחוק*:
    // אם קיים מופע לשונית נפרד, הוא זה שאמור לצרוך, ומחיקה כאן הייתה גונבת לו אותה.
    // הניקוי במקרה הזה נעשה ע"י ה-setTimeout שב-handoffAndShow.
    if (rec.origin === INSTANCE_ID) return;
    if (rec.ts && rec.ts <= lastConsumedTs) return;    // כבר הוצגה במופע הזה
    lastConsumedTs = rec.ts || Date.now();
    await storageSetJson(PENDING_IDENTIFY_KEY, null);   // צורכים פעם אחת בלבד
    // בקשה ישנה (למשל התוסף נפתח ידנית שבוע אחר כך) לא מוצגת
    if (rec.ts && (Date.now() - rec.ts) > 120000) return;
    if (rec.mode === 'propose'){ openGenericProposeForm(rec.text); return; }
    const matches = await identifyWithLiveContext(rec.text, { includePossible: true });
    showResults(matches, rec.text);
  } finally {
    consumingPending = false;
  }
}

// חשד ב׳ מהתוכנית: אם אוצריא מחזיקה מופע רקע *ומופע לשונית שכבר טעון*, ה-consume
// שרץ פעם אחת ב-waitForOtzaria לעולם לא יראה את הבקשה — הוא רץ דקות קודם.
// לכן בודקים גם בכל חזרה לחזית, ובפולינג קל כרשת ביטחון (אין ודאות ש-visibilitychange
// בכלל נדלק בתוך ה-webview של אוצריא, ולכן הפולינג הוא לא כפילות אלא הגיבוי היחיד).
let pendingPollTimer = null;
function startPendingIdentifyPoll(){
  if (pendingPollTimer) return;
  // הפולינג *לא* מגודר ב-document.hidden בכוונה. נמדד בפועל: ה-webview המוטמע מדווח
  // document.hidden === true גם כשהלשונית בחזית, ולכן גידור כזה היה משבית את רשת
  // הביטחון בדיוק בארכיטקטורה שהיא נועדה לה. העלות היא קריאת IPC אחת שמחזירה null.
  // הגידור האמיתי הוא plugin.suspended/plugin.resumed של אוצריא — ר' למטה.
  // #52 — באוצריא שמוסרת plugin.page_opened (גרסה ידועה ≥ 0.9.96) הפולינג מיותר:
  // הבקשה מגיעה באירוע, ו-focus/visibilitychange/boot נשארים כרשת ביטחון. בגרסה ישנה
  // או לא ידועה — הפולינג חוזר להיות המסלול. pollWanted מונע מרוץ עם stop שבינתיים.
  pollWanted = true;
  pageOpenedSupported().then(ok => {
    if (ok || !pollWanted || pendingPollTimer || pageOpenedSeen) return;
    pendingPollTimer = setInterval(consumePendingIdentify, 1500);
  }, () => {});
}
let pollWanted = false, pageOpenedSeen = false;
function stopPendingIdentifyPoll(){
  pollWanted = false;
  if (!pendingPollTimer) return;
  clearInterval(pendingPollTimer);
  pendingPollTimer = null;
}
function startPendingIdentifyWatch(){
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) consumePendingIdentify();
  });
  window.addEventListener('focus', () => consumePendingIdentify());
  window.addEventListener('pageshow', () => consumePendingIdentify());
  startPendingIdentifyPoll();
}

// ---- השהיה ברקע (README §"השהיה ברקע — plugin.suspended / plugin.resumed") ----
// כשהמשתמש עוזב את לשונית התוסף אוצריא מקפיאה את ה-WebView, אבל ההקפאה נייטיבית
// רק ב-Windows/Android; בשאר הפלטפורמות **התוסף אחראי לעצור בעצמו** עבודה
// מתמשכת. שתי העבודות המתמשכות שלנו הן הפולינג של 1.5 שניות וסריקת הפורטים של
// הנקדן (כל 3 שניות כשאינו מחובר). מופע רקע (runMode==='background') לעולם אינו
// מושהה, ולכן ההרשמה הזו רלוונטית רק ללשונית — וגם שם היא לא מזיקה.
function suspendBackgroundWork(){
  stopPendingIdentifyPoll();
  if (window.NikudEngine && typeof NikudEngine.unwatch === 'function') NikudEngine.unwatch();
}
function resumeBackgroundWork(){
  startPendingIdentifyPoll();
  consumePendingIdentify();
  if (window.NikudEngine && typeof NikudEngine.watch === 'function') NikudEngine.watch();
}

// מעבר ללשונית התוסף + הצגה, בצורה שעמידה לטעינה מחדש של המופע.
async function handoffAndShow(text, mode, canOpenSelf, showNow){
  if (canOpenSelf){
    await setPendingIdentify(text, mode);
    bringToFront({ kind: 'identify', text: text, mode: mode || 'results', ts: Date.now(), origin: INSTANCE_ID });
  }
  showNow();
  // אם המופע לא נטען מחדש — הטיימר הזה ירוץ וימחק את הבקשה. אם כן נטען, הוא מת
  // יחד עם המופע הישן, והמופע החדש הוא זה שיצרוך את המפתח.
  if (canOpenSelf) setTimeout(clearPendingIdentify, 5000);
}

// כמו בתוספים המקוריים: מציגים תחילה פופאפ אישור (ui.showConfirm) ישר בספרייה,
// בלי לעבור ללשונית התוסף - ורק אם המשתמש מאשר, עוברים ללשונית ופותחים את התוצאות.
async function handleIdentifyClick(payload){
  const text = (payload && (payload.selectedText || payload.text) || '').trim();
  if (!text){
    if (window.Otzaria && Otzaria.call){
      Otzaria.call('notifications.showInApp', { message: 'יש לסמן תחילה מילה או ביטוי בטקסט', type: 'info' }).catch(()=>{});
    }
    return;
  }
  const matches = await identifyWithLiveContext(text, { includePossible: true });
  if (matches.some(m => m.confidence !== 'אפשרי')) highlightIdentifiedSelection(payload);

  if (!(window.Otzaria && Otzaria.call)){
    bringToFront();
    showResults(matches, text);
    return;
  }

  const canOpenSelf = await isModernApp();

  // הפופאפ של אוצריא (ui.showConfirm) חתוך בגובה ואין לנו שליטה על ה-CSS שלו. כשמסמנים
  // פסקה שלמה הקטע הנבחר לבדו ממלא את כל החלון והכפתורים/ההוראה נדחקים מחוץ לתצוגה,
  // ולכן בכל מקום שבו הקטע מוצג הוא נחתך לסימן היכר קצר בלבד.
  const snippet = (s, max) => {
    const clean = String(s).replace(/\s+/g, ' ').trim();
    return clean.length <= max ? clean : clean.slice(0, max - 1) + '…';
  };

  // אין התאמה: מציעים לפתוח טופס הצעת ערך חדש (עם בחירת קטגוריה) - לשליחה או לשמירה מקומית.
  if (!matches.length){
    const dict = await dictionaryLine(text);
    try {
      const res = await Otzaria.call('ui.showConfirm', {
        title: 'לא נמצאה התאמה ל"' + snippet(text, 40) + '"',
        content: (dict ? dict + '\n\n' : '') + 'לחיצה על אישור תפתח טופס הצעת ערך חדש — עם בחירת קטגוריה, שליחה למפתח או שמירה במחשב.'
          + (canOpenSelf ? '' : '\n\n(אין מעבר אוטומטי ללשונית בגרסת אוצריא זו — יש לפתוח את עינים למקרא ידנית, הטופס ימתין פתוח.)')
          + '\n\nהקטע שנבחר: "' + snippet(text, 120) + '"'
      });
      if (res && res.success && res.data && res.data.confirmed === true){
        await handoffAndShow(text, 'propose', canOpenSelf, () => openGenericProposeForm(text));
      }
    } catch(e){
      await Otzaria.call('notifications.showInApp', {
        message: 'לא נמצאה התאמה ל"' + text + '" באף אחד ממדריכי עינים למקרא.',
        type: 'info'
      }).catch(()=>{});
    }
    return;
  }

  // פורמט שורה: המילה שזוהתה, נקודתיים, שם הערך, המדריך, וזיהוי מודרני בקצרה.
  function lineFor(m){
    const via = (m.matchedVia && m.matchedVia !== m.name) ? (m.matchedVia + ': ') : '';
    const modern = shortModernId(m.entry);
    return '• ' + via + m.catIcon + ' ' + m.name + ' — ' + m.catLabel + (modern ? ' · ' + modern : '');
  }
  // תקציר לפי קטגוריה ("4 אישים · 6 צומח · 1 מקומות")
  function summaryLine(list){
    const counts = new Map(); // catId -> {icon, label, n}
    list.forEach(m => {
      if (!counts.has(m.catId)) counts.set(m.catId, { icon: m.catIcon, label: m.catLabel.replace(/ בתנ״ך$/, ''), n: 0 });
      counts.get(m.catId).n++;
    });
    return Array.from(counts.values()).map(v => v.icon + ' ' + v.n + ' ' + v.label).join(' · ');
  }
  // סדר עדיפות: בע״ח/צומח/דומם קודם (זיהוי כמעט תמיד אמין), אישים ובית המקדש
  // (הכי תלויים בהתאמת-שם גנרית, לכן הכי חשופים לזיהויי שווא) נדחפים לסוף.
  const CAT_PRIORITY = { animal: 0, flora: 0, domem: 0, people: 2, beithamikdash: 2 };
  const ranked = matches
    .map((m, i) => ({ m, i, rank: CAT_PRIORITY[m.catId] != null ? CAT_PRIORITY[m.catId] : 1 }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map(x => x.m);

  const TOP_N = 5;
  const top = ranked.slice(0, TOP_N);
  const restCount = ranked.length - top.length;
  const title = matches.length === 1
    ? (matches[0].catIcon + ' ' + matches[0].name)
    : ('נמצאו ' + matches.length + ' התאמות ל"' + snippet(text, 40) + '"');

  // ההוראה מופיעה **לפני** רשימת ההתאמות בכוונה: הרשימה היא החלק שגדל בלי גבול,
  // וכל מה שמתחתיה נדחק מחוץ לחלון החתוך. מה שחייב להיקרא נמצא בשתי השורות הראשונות.
  // אזהרת "זיהויי שווא" ממוזגת לתוך אותה שורה במקום שורה נפרדת - חוסך שורה שלמה
  // מהחלון החתוך.
  const action = canOpenSelf
    ? ('לחיצה על אישור תפתח את עינים למקרא עם ' + (matches.length === 1 ? 'הכרטיס המלא' : 'כל ' + matches.length + ' ההתאמות')
      + '. ייתכנו זיהויי שווא — בחלון התוצאות יש כפתור דיווח.')
    : 'אין מעבר אוטומטי בגרסת אוצריא זו — יש לפתוח את עינים למקרא ידנית. ייתכנו זיהויי שווא — בחלון התוצאות יש כפתור דיווח.';
  const contentParts = [];
  if (matches.length === 1){
    contentParts.push(lineFor(matches[0]));
    contentParts.push(action);
    // בהתאמה יחידה הכותרת מציגה את שם הערך ולא את הקטע שנבחר - כאן זו הפעם היחידה
    // שהמשתמש רואה מה בדיוק סומן, ולכן השורה נשארת.
    contentParts.push('הקטע שנבחר: "' + snippet(text, 120) + '"');
  } else {
    // בריבוי התאמות הכותרת כבר מכילה את הקטע שנבחר (עד 40 תווים) - שורה נפרדת
    // כאן הייתה כפילות מיותרת.
    contentParts.push(summaryLine(matches));
    contentParts.push(action);
    contentParts.push(top.map(lineFor).join('\n') + (restCount > 0 ? '\nועוד ' + restCount + '…' : ''));
  }
  const content = contentParts.join('\n');

  try {
    const res = await Otzaria.call('ui.showConfirm', { title, content });
    if (res && res.success && res.data && res.data.confirmed === true){
      await handoffAndShow(text, 'results', canOpenSelf, () => showResults(matches, text));
    }
  } catch(e){
    await handoffAndShow(text, 'results', canOpenSelf, () => showResults(matches, text));
  }
}

// רישום הפריט "זיהוי בעינים למקרא" בתפריט ההקשר — בכל גרסה, תמיד.
//
// ⚠️ עד 2.20.2 היה כאן `if (await isModernApp()) return;` בהנחה שמ-0.9.96 הפריט
// מגיע מההצהרה שבמניפסט (contributes.startup.contextMenuItems). ההנחה הזאת
// שגויה: PluginStartupContributionsService באוצריא רושם את ההצהרה **רק** אם
// ההרשאה app.startup_contributions אושרה בפועל, וההרשאות שנשמרות הן בדיוק
// אלה שבמניפסט (PluginInstallerService.finalizeInstall). ההרשאה הוסרה מהמניפסט
// ב-2.17.1, ולכן מאז ההצהרה מנוטרלת לגמרי — והדילוג כאן הותיר את הפיצ׳ר
// המרכזי של התוסף בלי שום מסלול רישום בכל אוצריא 0.9.96 ומעלה.
//
// רישום חוזר על אותו id אינו יוצר כפילות ואינו צורך מהמכסה (שני פריטים עליונים
// לתוסף) — API_REFERENCE §reader.addContextMenuItem: "אם פריט עם אותו id כבר
// קיים, הוא יוחלף". לכן בטוח לקרוא כאן גם כשגם ההצהרה פעילה (וריאנט 0.9.97).
function registerUnifiedMenuItem(){
  if (!(window.Otzaria && Otzaria.call)) return;
  // בלי contexts בכוונה: פריט שאינו מגדיר אותם מופיע בשני ההקשרים, וזו גם
  // ההתנהגות היחידה שקיימת בגרסאות ישנות (ר' 2.19.1 — contexts לא חוקי חסם התקנה).
  Otzaria.call('reader.addContextMenuItem', {
    id: MENU_ITEM_ID,
    label: 'זיהוי בעינים למקרא',
    icon: 'search_24_regular'
  }).catch(()=>{});
}

function onOtzariaTheme(theme){
  if (!theme) return;
  otzariaTheme = theme;
  if (uiPrefs.theme === 'otzaria' || uiPrefs.font === 'otzaria') applyPrefs();
}

// שחזור ההגדרות מהאחסון של אוצריא, אם localStorage נוקה
async function restorePrefsFromOtzaria(){
  try {
    const stored = await storageGet(PREFS_KEY);
    if (!stored || typeof stored !== 'object') return;
    let hasLocal = false;
    try { hasLocal = !!localStorage.getItem(PREFS_KEY); } catch(e){}
    if (hasLocal) return;
    uiPrefs = Object.assign({}, DEFAULT_PREFS, stored);
    applyPrefs();
  } catch(e){}
}

function waitForOtzaria(elapsed){
  if (window.Otzaria && typeof Otzaria.on === 'function'){
    Otzaria.on('plugin.boot', registerUnifiedMenuItem);
    // 4.7.0 — לחיצה ימנית בלי סימון (reader-book, אוצריא 0.9.99) — shell/otzaria-sdk-999.js
    Otzaria.on('plugin.boot', () => { if (typeof registerParagraphMenuItem === 'function') registerParagraphMenuItem(); });
    Otzaria.on('plugin.boot', (p) => { if (p && p.theme) onOtzariaTheme(p.theme); });
    Otzaria.on('plugin.boot', (p) => {
      runMode = (p && p.app && p.app.runMode) || 'foreground';
      hasBackgroundPerm = !!(p && p.permissions && p.permissions.indexOf('app.run_on_startup') !== -1);
    });
    // ״ערך היום״ ליומן של אוצריא. עד 2.20.2 זה רץ רק ב-shell/background.js,
    // שאינו נטען כלל כל עוד contributes.background.entrypoint אינו מוצהר — ולכן
    // הפיצ׳ר היה מת. הקריאה יושבת ב-plugin.boot כדרישת ה-SDK ("כל הלוגיקה
    // הראשונית בתוך callback של plugin.boot"), עם טיימר גיבוי למקרה שה-boot
    // כבר ירה לפני שהספקנו להירשם. הפונקציה עצמה חסינה לריצה כפולה.
    // גל 25/08 מאוחר: הוחלף מ-publishTodayEvents (shell/daily-publish.js) ל-
    // publishUpcomingEvents (guides/_shared/dates.js) - שתי סיבות: (1) המשתמש
    // ביקש פרסום לכל השנה קדימה/אחורה, לא רק ליום הנוכחי; (2) שני הקבצים
    // הצהירו את אותו const PUBLISHED_KEYS_KEY ברמה עליונה, וכששניהם נטענים
    // (index.html/background.html) זו הייתה שגיאת redeclare ששברה את כל
    // shell/daily-publish.js בשקט - publishTodayEvents מעולם לא היה מוגדר,
    // ולכן שום פרסום לא קרה בכלל, לא רק "אין מאורע היום". daily-publish.js
    // הוסר לגמרי (ר' git log) כדי שהקונפליקט לא יחזור.
    Otzaria.on('plugin.boot', () => { if (typeof publishUpcomingEvents === 'function') publishUpcomingEvents().catch(()=>{}); });
    setTimeout(() => { if (typeof publishUpcomingEvents === 'function') publishUpcomingEvents().catch(()=>{}); }, 5000);
    Otzaria.on('theme.changed', onOtzariaTheme);
    // עצירה/חידוש של עבודה מתמשכת ביציאה מהלשונית ובחזרה אליה. שני האירועים
    // אינם דורשים הרשאת events.subscribe (README §אירועי מחזור חיים).
    Otzaria.on('plugin.boot', publishGuidesToLibrary);
    Otzaria.on('library.providerBook.openRequested', (d) => {
      const g = guideIdFromProviderBook(d);
      if (g){ bringToFront(); openGuide(g, null); }
    });
    Otzaria.on('plugin.page_opened', (data) => {
      // האירוע הגיע — הוא עובד בגרסה הזו, והפולינג כבר אינו נחוץ
      if (!pageOpenedSeen){ pageOpenedSeen = true; if (pendingPollTimer){ clearInterval(pendingPollTimer); pendingPollTimer = null; } }
      let p = data && data.param;
      if (typeof p === 'string'){ try { p = JSON.parse(p); } catch(e){ p = { section: p }; } }
      if (p && p.kind === 'guide' && p.catId){ openGuide(p.catId, null); return; }
      // #173 — פתיחה ישירה של חלק מסוים מתוסף אחר (plugin.openOther עם {section}).
      if (p && p.section && openSection(p.section, p.term, p.entry)) return;
      if (!p || p.kind !== 'identify' || !p.text) return;
      if (p.origin === INSTANCE_ID) return;              // המופע ששלח כבר הציג
      if (p.ts && p.ts <= lastConsumedTs) return;
      lastConsumedTs = p.ts || Date.now();
      clearPendingIdentify();
      if (p.mode === 'propose'){ openGenericProposeForm(p.text); return; }
      identifyWithLiveContext(p.text, { includePossible: true }).then(m => showResults(m, p.text));
    });
    // 4.0.0 — שורת ״חפש גם בעינים למקרא״ בדיאלוג החיפוש של אוצריא
    // (contributes.startup.searchDialogItems, openPluginOnSubmit)
    Otzaria.on('search.requested', (data) => {
      const q = String((data && data.request && data.request.query) || (data && data.query) || '').trim();
      if (!q) return;
      identifyWithLiveContext(q, { includePossible: true }).then(m => showResults(m, q));
    });
    Otzaria.on('plugin.suspended', suspendBackgroundWork);
    Otzaria.on('plugin.resumed', resumeBackgroundWork);
    // גם משיכה יזומה — plugin.boot כבר עשוי היה לרוץ לפני שנרשמנו
    Otzaria.call('app.getTheme').then(res => { if (res && res.data) onOtzariaTheme(res.data); }).catch(()=>{});
    restorePrefsFromOtzaria();
    restoreBookmarksFromOtzaria();
    Otzaria.on('reader.context_menu_item_clicked', (payload) => {
      const isParagraph = !!(payload && typeof PARAGRAPH_MENU_ITEM_ID !== 'undefined' && payload.itemId === PARAGRAPH_MENU_ITEM_ID);
      if (!payload || (payload.itemId !== MENU_ITEM_ID && !isParagraph)) return;
      // מופע רקע קיים ומטפל בזה בעצמו (shell/background.js) — הלשונית מוותרת,
      // אחרת המשתמש רואה שני פופאפים על לחיצה אחת. ב-0.9.96/0.9.97, שבהן ייתכן
      // שמופע הרקע הוא דווקא index.html הזה, התנאי runMode מחזיר לו את הטיפול.
      if (hasBackgroundPerm && runMode !== 'background') return;
      // במופע רקע: מסיימים מפורשות אחרי שהלחיצה טופלה, במקום להמתין לכיבוי
      // האוטומטי אחרי שלוש דקות חוסר פעילות.
      (isParagraph ? handleParagraphClick(payload) : handleIdentifyClick(payload)).finally(() => {
        if (runMode === 'background') Otzaria.call('plugin.backgroundDone').catch(()=>{});
      });
    });
    // כפתור "עינים למקרא" בסרגל הקורא (contributes.startup.toolbarItems,
    // openPlugin:true). אוצריא פותחת את הלשונית ומוסרת לה את אירוע הלחיצה גם
    // אם הדף נטען רק עכשיו — API_REFERENCE §reader.addToolbarItem. עד 3.7.0
    // לא היה כאן מאזין, ולכן הכפתור רק העביר ללשונית (#42, #52).
    Otzaria.on('reader.toolbar_item_clicked', (payload) => {
      if (!payload || payload.itemId !== TOOLBAR_ITEM_ID) return;
      if (runMode === 'background') return;   // openPlugin:true — הלשונית מטפלת
      handleToolbarOpenClick(payload);
    });
    // חשוב: לרנדר את כרטיסי דפי ה-HTML השמורים רק אחרי ש-Otzaria אכן זמין -
    // אחרת storage.get נופל מיד ל-null (הבדיקה hasOtzaria() נכשלת) והכרטיסים
    // לא מופיעים בטעינה ראשונה של עמוד השער, גם אם התוכן קיים בזיכרון.
    renderCustomPageCards();
    // אם המופע הזה נפתח בעקבות "זיהוי בעינים למקרא" בספרייה — מציגים את מה שהמתין באחסון.
    consumePendingIdentify();
    // ...וממשיכים לבדוק גם אחר כך: המופע הגלוי עשוי להיות טעון מזמן (חשד ב׳).
    startPendingIdentifyWatch();
    return;
  }
  setTimeout(() => waitForOtzaria(elapsed + 200), 200);
}
waitForOtzaria(0);

// חיבור-רקע אופציונלי לנקדן המקומי, לא תלוי ב-Otzaria - ר' identifyWithLiveContext
// למעלה ו-nikud-engine.js. שקט לגמרי אם הנקדן לא פועל (STOPWORDS מתנהג כמו היום).
if (window.NikudEngine) NikudEngine.watch();

// טעינה מוקדמת ברקע של כל מאגרי הזיהוי, כדי שהחיפוש הראשון יהיה מיידי.
preloadAllGuides(CATEGORIES, 0);


// ---- בדיקת עדכון גרסה (סבב 4.2) ------------------------------------------
// הדפוס הועתק כמעט כלשונו מ״הורדת ספרים v3.1.3״ (app.js ~653–663,
// fetchWithCorsProxy): רשימת כתובות חלופיות שנוסות אחת-אחת בלולאת try/catch
// *שקטה*, וההמשך רק אחרי שכולן נכשלו. ההבדל היחיד: שם זו הורדה שהמשתמש ביקש
// ולכן בסוף נזרקת שגיאה גלויה — כאן זו בדיקת רקע שאיש לא ביקש, ולכן כישלון
// מוחלט מסתיים ב-null ובשקט גמור: בלי הודעה, בלי אייקון, בלי console.
// משתמש בלי אינטרנט לא אמור לדעת שהמנגנון הזה קיים בכלל.
//
// ⚠️ הדומיינים אינם שרירותיים. קהל אוצריא יושב ברובו מאחורי סינון נטפרי;
// raw.githubusercontent.com ו-api.github.com נבדקו בפועל ושניהם פתוחים,
// ולכן מותר להישען עליהם. **אין להוסיף כאן דומיין שלא נבדק מול נטפרי**, וכל
// תוספת חייבת להיכנס גם ל-network.allowlist במניפסט.
const UPDATE_CHECK_KEY = 'madaei_hatanach_update_check_v1';
const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;   // לכל היותר פעם ביממה
const UPDATE_FETCH_TIMEOUT_MS = 8000;                    // שלא תישאר בקשה תלויה
const UPDATE_CHECK_DELAY_MS = 5000;                      // אחרי שהתוסף כבר שימושי
const UPDATE_RELEASES_URL = 'https://github.com/Hadabadra/madaei-hatanach/releases';
const UPDATE_MANIFEST_URLS = [
  'https://raw.githubusercontent.com/Hadabadra/madaei-hatanach/main/manifest.json',
  // גיבוי דרך ה-API, למקרה ש-raw חסום/נופל. Accept: ...github.raw מחזיר את
  // הקובץ עצמו במקום מעטפת JSON עם base64.
  'https://api.github.com/repos/Hadabadra/madaei-hatanach/contents/manifest.json?ref=main',
];

// גרסה נחשבת תקינה רק אם היא מספרים ונקודות. כל דבר אחר (tag בסגנון "v2.12.1",
// HTML של דף שגיאה, טקסט חופשי) נפסל — cmpVersion מפרש אותו כ-0 והיה מייצר
// התראת שווא.
function isPlainVersion(v){ return typeof v === 'string' && /^\d+(?:\.\d+){0,3}$/.test(v); }

// מקור האמת לגרסה המקומית הוא EMBEDDED_PLUGIN_VERSION (guides/_shared/
// version-embedded.js) שמוטבע ב-build/pack.ps1 מתוך manifest.json בכל אריזה -
// בדיוק אותה גרסה שנארזת. לא fetch('manifest.json') בזמן ריצה: זה נכשל בפועל
// בתוך ה-WebView של אוצריא (אותה תקלה בדיוק שכבר תועדה אצל CHANGELOG.md/
// ROADMAP.md לפני שהוטבעו הם), והציג "לא ידועה" בלשונית "מה חדש" בכל התקנה.
async function readLocalPluginVersion(){
  const v = (typeof EMBEDDED_PLUGIN_VERSION !== 'undefined') ? EMBEDDED_PLUGIN_VERSION : null;
  return isPlainVersion(v) ? v : null;
}

function fetchUpdateManifest(url){
  const ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
  const timer = setTimeout(() => { try { ctrl && ctrl.abort(); } catch(e){} }, UPDATE_FETCH_TIMEOUT_MS);
  return fetch(url, {
    cache: 'no-store',
    headers: { 'Accept': 'application/vnd.github.raw' },
    signal: ctrl ? ctrl.signal : undefined
  }).then(
    res => { clearTimeout(timer); return res; },
    err => { clearTimeout(timer); throw err; }
  );
}

async function fetchRemoteVersionViaOtzaria(url){
  let chunks = Otzaria.call('network.fetchStream', { url, headers: { 'Accept': 'application/vnd.github.raw' }, timeoutMs: UPDATE_FETCH_TIMEOUT_MS });
  if (chunks && typeof chunks.then === 'function' && !chunks[Symbol.asyncIterator]) chunks = await chunks;
  let ok = false, body = '';
  for await (const c of chunks){
    if (c.type === 'response'){ ok = !!c.ok; if (!ok) break; continue; }
    if (typeof c.body === 'string') body += c.body;
  }
  if (!ok) return null;
  const data = JSON.parse(body);
  return isPlainVersion(data && data.version) ? data.version : null;
}

async function fetchRemoteVersion(){
  // 4.0.0 (#45): fetch() ישיר מה-WebView נחסם ב-CORS (Origin: null), ולכן בדיקת
  // העדכון ו״הגרסה האחרונה״ בלשונית מה חדש לא עבדו מתוך אוצריא. קודם דרך אוצריא.
  if (window.Otzaria && Otzaria.call){
    for (const url of UPDATE_MANIFEST_URLS){
      try { const v = await fetchRemoteVersionViaOtzaria(url); if (v) return v; } catch(e){}
    }
  }
  for (const url of UPDATE_MANIFEST_URLS){
    try {
      const res = await fetchUpdateManifest(url);
      if (!res || !res.ok) continue;
      const data = JSON.parse(await res.text());
      if (isPlainVersion(data && data.version)) return data.version;
    } catch(e){ /* נסה את הכתובת הבאה */ }
  }
  return null;   // כולן נכשלו — ובניגוד למקור, כאן לא זורקים כלום
}

// הודעה עדינה בפינה. לא מודאל, לא overlay, לא חוסמת שום פעולה — ואפשר לסגור.
// הקישור עובר דרך data-external-link, כלומר דרך confirmOpenExternal שב-refs.js
// (אישור + app.openUrl), ולא דרך ניווט ישיר ב-WebView שגורם לקריסה.
function showUpdateNotice(remoteVersion){
  if (document.getElementById('updateNotice')) return;
  const box = document.createElement('div');
  box.id = 'updateNotice';
  box.setAttribute('dir', 'rtl');
  box.style.cssText = 'position:fixed;inset-inline-start:16px;bottom:16px;z-index:9998;'
    + 'max-width:min(340px,calc(100vw - 32px));display:flex;gap:10px;align-items:flex-start;'
    + 'padding:12px 14px;border-radius:12px;border:1px solid var(--color-outline);'
    + 'background:var(--color-surface);color:var(--color-on-surface);'
    + 'box-shadow:0 6px 20px var(--color-shadow-strong);font:inherit;font-size:14px;line-height:1.5;';
  box.innerHTML =
    '<span aria-hidden="true" style="font-size:18px;line-height:1.2;">🔔</span>'
    + '<div style="flex:1;min-width:0;">'
    +   '<div style="font-weight:600;">גרסה חדשה של עינים למקרא זמינה — ' + esc(remoteVersion) + '</div>'
    +   '<a href="#" data-external-link="' + esc(UPDATE_RELEASES_URL) + '" data-requires-net '
    +      'style="color:var(--color-link);text-decoration:underline;cursor:pointer;">לדף ההורדות בגיטהב ›</a>'
    + '</div>'
    + '<button type="button" data-update-notice-close title="סגירה" aria-label="סגירה" '
    +   'style="background:none;border:none;color:var(--color-on-surface-faint);cursor:pointer;'
    +   'font-size:15px;line-height:1;padding:2px 4px;">✕</button>';
  box.querySelector('[data-update-notice-close]').addEventListener('click', () => box.remove());
  document.body.appendChild(box);
}

async function checkForUpdate(){
  try {
    // ⚠️ storage.get של אוצריא מחזיר מעטפת {value:...} ולא את הערך עצמו — זה
    // הבאג שהפיל אותנו ב-1.1. storageGetJson (data.js) כבר מפרק את המעטפת
    // דרך unwrapStorageValue, ולכן קוראים רק דרכו ולא דרך Otzaria.call הישיר.
    const rec = await storageGetJson(UPDATE_CHECK_KEY);
    const last = (rec && typeof rec.ts === 'number') ? rec.ts : 0;
    if (Date.now() - last < UPDATE_CHECK_INTERVAL_MS) return;   // עברו פחות מ-24 שעות

    const local = await readLocalPluginVersion();
    if (!local) return;                 // בלי גרסה מקומית ודאית אין מה להשוות → שקט

    const remote = await fetchRemoteVersion();
    // החותמת נכתבת גם כשהבקשה נכשלה: אין רשת אינה סיבה לנסות שוב בכל פתיחה.
    await storageSetJson(UPDATE_CHECK_KEY, { ts: Date.now(), local: local, remote: remote || null });
    if (!remote) return;
    if (cmpVersion(remote, local) > 0) showUpdateNotice(remote);
  } catch(e){ /* שקט מוחלט — הבדיקה הזו לעולם לא מפריעה למשתמש */ }
}

// ברקע ובלי לעכב שום דבר: אחרי שהשער כבר מצויר והמדריכים בטעינה מוקדמת.
// מדלגים במופע רקע: הוא נדלק כדי לטפל בלחיצה אחת ולכבות, ובקשת רשת שם רק הייתה
// מאריכה את חייו — ואת ההודעה ממילא אין מי שיראה.
setTimeout(() => { if (runMode !== 'background') checkForUpdate(); }, UPDATE_CHECK_DELAY_MS);
