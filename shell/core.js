// קבועים, מטמונים וכלים משותפים — נטען ראשון, כל השאר נשען עליו.
// נוצר בפיצול router.js (גרסה 2.11.2). המקור: shell/router.js שורות 1-24, 217-228, 400-459, 1453-1454, 1734-1743.
// אין להפוך ל-type="module" — כל הקבצים חולקים scope גלובלי אחד.

// שכבת ניתוב + זיהוי אחיד לעינים למקרא.
// כל מדריך נשאר קובץ עצמאי לגמרי (guides/<cat>/...) — הקובץ הזה רק קורא להם.

const MENU_ITEM_ID = 'madaei-hatanach-identify';
const TOOLBAR_ITEM_ID = 'madaei-hatanach-open';   // manifest: contributes.startup.toolbarItems
// הוסר ב-2.19.2 כשהרצפה הייתה 0.9.96, וחזר ב-3.7.0 כשהרצפה עלתה ל-0.9.97.
// מ-3.7.1 bridge.js מאזין ללחיצה עליו ומזהה את מה שפתוח בקורא (#42, #52).
const DEV_EMAIL = 'E0548433917@outlook.com';
const HTML_PAGES_INDEX_KEY = 'madaei_hatanach_html_pages_index';
// מפתח ה"מסירה" (handoff) של זיהוי שממתין להצגה אחרי מעבר ללשונית התוסף. ר' setPendingIdentify.
const PENDING_IDENTIFY_KEY = 'madaei_hatanach_pending_identify_v1';
const BOOKMARKS_KEY = 'madaei_hatanach_bookmarks_v1';

const CATEGORIES = [
  { id: 'people', label: 'אישים בתנ״ך', icon: '👤', loaderPath: 'guides/people/data/_loader.html' },
  { id: 'places', label: 'מקומות', icon: '📍', loaderPath: 'guides/places/data/_loader.html' },
  { id: 'animal', label: 'בע״ח', icon: '🐾', loaderPath: 'guides/animal/data/_loader.html' },
  { id: 'flora', label: 'צומח', icon: '🌿', loaderPath: 'guides/flora/data/_loader.html' },
  { id: 'domem', label: 'דומם', icon: '💎', loaderPath: 'guides/domem/data/_loader.html' },
  { id: 'amoraim', label: 'אנשים מהתלמוד', icon: '📖', loaderPath: 'guides/amoraim/data/_loader.html' },
  { id: 'beithamikdash', label: 'בית המקדש', icon: '🏛️', loaderPath: 'guides/beithamikdash/data/_loader.html' },
  { id: 'mumim', label: 'מומים', icon: '🩺', loaderPath: 'guides/mumim/data/_loader.html' },
  { id: 'chullin', label: 'חולין', icon: '🔪', loaderPath: 'guides/chullin/data/_loader.html' },
  { id: 'sukkah', label: 'סוכה ולולב', icon: '🌴', loaderPath: 'guides/sukkah/data/_loader.html' },
  { id: 'archaeology', label: 'ארכיאולוגיה יהודית', icon: '🏺', loaderPath: 'guides/archaeology/data/_loader.html' },
];

// סבב 4.8 — האחדת איקונים. עד כה `icon/cats/*.png` הופיעו רק בכרטיסי השער
// (index.html), וכל שאר מקומות התצוגה נשארו עם האמוג׳י שב-CATEGORIES.icon.
// המפה כאן היא מקור האמת היחיד לקובץ התמונה של כל קטגוריה; שלושת מדריכי
// המסכתות (מומים/חולין/סוכה) שואבים מ-icon/masechtot/ כי אין להם קובץ ב-cats/.
// קטגוריה בלי ערך כאן (למשל 'custom' של דפי HTML מותאמים) נופלת לאמוג׳י.
const CAT_ICON_IMG = {
  people: 'icon/cats/people.png',
  places: 'icon/cats/places.png',
  animal: 'icon/cats/animal.png',
  flora: 'icon/cats/flora.png',
  domem: 'icon/cats/domem.png',
  amoraim: 'icon/cats/amoraim.png',
  beithamikdash: 'icon/cats/beithamikdash.png',
  mumim: 'icon/masechtot/bechorot.png',
  chullin: 'icon/masechtot/chullin.png',
  sukkah: 'icon/masechtot/sukkah.png',
  archaeology: 'icon/cats/archaeology.png',
};

// HTML של איקון קטגוריה. `onerror` מחזיר לאמוג׳י בדיוק כמו בכרטיסי השער — קובץ
// חסר לא משאיר ריבוע שבור. size בפיקסלים, ומוכפל ב-ui-scale כדי לכבד את סליידר
// גודל הטקסט. משמש רק בהקשרי DOM: הפופאפ של אוצריא (ui.showConfirm) הוא טקסט
// בלבד ואינו יכול להציג תמונות — שם האמוג׳י נשאר.
function catIconHtml(catId, size){
  const cat = CATEGORIES.find(c => c.id === catId);
  const emoji = (cat && cat.icon) || '';
  const src = CAT_ICON_IMG[catId];
  if (!src) return '<span class="cat-icon-emoji">' + emoji + '</span>';
  const px = 'calc(' + (size || 20) + 'px * var(--ui-scale))';
  return '<img class="cat-icon-img" src="' + src + '" alt="" aria-hidden="true"'
    + ' style="width:' + px + ';height:' + px + ';"'
    + ' onerror="this.outerHTML=\'&lt;span class=&quot;cat-icon-emoji&quot;&gt;' + emoji + '&lt;/span&gt;\'">';
}

const dataCache = {}; // id -> [{name, cat, aliases}]
const imagesCache = {}; // id -> { key: "data:image/...;base64,..." }
const catsCache = {}; // id -> [{id, num, label, blurb}] - קטגוריות הדפדוף המקוריות של אותו מדריך
const dataPromises = {}; // id -> pending Promise, so parallel calls don't spawn duplicate iframes
const pristineCache = {}; // catId -> { שם מקורי: עותק של הערך לפני עריכות מקומיות }

// גימטריה: הפרקים והפסוקים במאגרים כתובים באותיות (״כה, יג-טו״), וכדי לפרוש טווח
// צריך מספרים. אין כאן צורך בגימטריה ״חכמה״ (ט״ו/ט״ז) — פשוט סכום האותיות.
const GEMATRIA_VALUES = {
  'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,
  'י':10,'כ':20,'ך':20,'ל':30,'מ':40,'ם':40,'נ':50,'ן':50,'ס':60,'ע':70,'פ':80,'ף':80,'צ':90,'ץ':90,
  'ק':100,'ר':200,'ש':300,'ת':400
};
function gematriaValue(s){
  const letters = String(s || '').replace(/[^א-ת]/g, '');
  if (!letters) return 0;
  let n = 0;
  for (const ch of letters){
    if (GEMATRIA_VALUES[ch] == null) return 0;
    n += GEMATRIA_VALUES[ch];
  }
  return n;
}

// חזרה למספר עברי לתצוגה (הכיוון ההפוך לגימטריה) — כולל ט״ו/ט״ז, שלא נכתבים
// י״ה/י״ו מטעמי קדושה. יושב כאן ולא ב-co-mentions.js כי guides/_shared/dates.js
// (todayHebrew) תלוי בו, וגם background.html טוען את dates.js בלי co-mentions.
const HEB_NUM_PARTS = [[400,'ת'],[300,'ש'],[200,'ר'],[100,'ק'],[90,'צ'],[80,'פ'],[70,'ע'],[60,'ס'],[50,'נ'],[40,'מ'],[30,'ל'],[20,'כ'],[10,'י'],[9,'ט'],[8,'ח'],[7,'ז'],[6,'ו'],[5,'ה'],[4,'ד'],[3,'ג'],[2,'ב'],[1,'א']];
function numToHeb(n){
  let v = parseInt(n, 10) || 0, out = '';
  while (v > 0){
    if (v === 15){ out += 'טו'; break; }
    if (v === 16){ out += 'טז'; break; }
    const p = HEB_NUM_PARTS.find(x => x[0] <= v);
    if (!p) break;
    out += p[1];
    v -= p[0];
  }
  return out;
}

// גל: שנה עברית מלאה לתצוגה ("תשפ״ו") - אלפים מושמטים כמקובל, גרשיים לפני
// האות האחרונה. משמש להוספת התאריך המלא ל"ערך היום" (shell/home.js).
function hebYearStr(year){
  const s = numToHeb(year % 1000);
  if (s.length <= 1) return s + '׳';
  return s.slice(0, -1) + '״' + s.slice(-1);
}
// תאריך לועזי לתצוגה, כמו ב-personal.js/print.js.
function gregDateStr(d){
  try { return (d || new Date()).toLocaleDateString('he-IL', { year:'numeric', month:'2-digit', day:'2-digit' }); }
  catch(e){ return ''; }
}

// גל: המרת שמות קדושים לכינויים בציטוטי פסוקים, לפי מוסכמת התוסף "שומר
// השם" (shell/holy-names-lib.js, מועתק כלשונו משם - ר' הערה בראש הקובץ).
// נכשל בשקט לטקסט המקורי אם הספרייה לא נטענה או זרקה שגיאה.
function guardHolyNames(text){
  if (text && divineNameMode() === 'source') return text;   // #58 — ״ככתוב״
  if (!text || !(window.ShemShomrer && typeof ShemShomrer.replaceHolyNames === 'function')) return text;
  // #66 — הגדרות ״שומר השם״ מתוך ההגדרות של התוסף (ברירות המחדל = של שומר השם)
  const p = (typeof uiPrefs !== 'undefined' && uiPrefs) || {};
  const opts = { mode: p.shemMode || 'hyphen', scope: p.shemScope || 'all', aggressiveNoNikud: p.shemAggr !== false };
  try { return ShemShomrer.replaceHolyNames(text, opts).result; }
  catch(e){ return text; }
}

// זיהוי מודרני בקצרה - לשורת הפופאפ ולרשימת התוצאות, לפי איזה שדה קיים בערך:
// identification (דומם), methods[0].modern (מקומות), methods[0].latin (חי/צומח).
// יושב כאן ולא ב-entry-detail.js כי גם background.html בונה את שורות הפופאפ,
// והוא טוען רק את קבצי הליבה.
function shortModernId(entry){
  if (!entry) return '';
  const m0 = entry.methods && entry.methods[0];
  let s = entry.identification || (m0 && (m0.modern || m0.latin)) || '';
  s = String(s).replace(/\s+/g, ' ').trim();
  if (s.length > 70) s = s.slice(0, 67) + '...';
  return s;
}

// זיהוי מדויק ברמת מילה (לא "תת-מחרוזת בכל מקום בטקסט", כדי לא לקבל התאמות שווא
// כמו "פיל" בתוך "אפילת") - בדיוק כמו tokenizeHeb/candidateForms בכל מדריך בפני עצמו.
//
// HEB_POINT_SRC - טווח יוניקוד של ניקוד/טעמים **בלבד** (לא מקף ־/פסק ׀/סוף-פסוק ׃, שכולם
// נמצאים "בטעות" באותו טווח יוניקוד רחב 0591-05C7 יחד עם הניקוד האמיתי). ההבחנה הזו קריטית:
// אם מסירים גם את המקף לפני tokenizeHeb, "אֶל־מֹשֶׁה" (מילה־מקף־מילה) הופך לטוקן אחד
// "אלמשה" במקום שתי מילים "אל" ו"משה" - זה היה באג אמיתי (תוקן בגרסה 2.0.4). משתמשים באותו
// קבוע גם בהסתרת שבעת השמות למטה (`wholeWordRe`), ששם הבעיה זהה בדיוק.
const HEB_POINT_SRC = '[\\u0591-\\u05BD\\u05BF\\u05C1\\u05C2\\u05C4\\u05C5\\u05C7]';
const HEB_POINT_RE = new RegExp(HEB_POINT_SRC, 'g');
const PREFIXES = ['ה','ו','ב','כ','ל','מ','ש'];
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// הסתרת שבעת השמות שאינם נמחקים (רמב"ם הל' יסודי התורה פ"ו, ה"א-ב) מפני קדושתם: יהוה,
// אל, אלוה, אלהים/אלוהים, אדני, שדי, צבאות. מסתירים רק בתצוגה (כאן) - לא בקובצי ה-data
// עצמם - כדי לשמור על דיוק מלא של הפסוק המקורי לצורך העתקה/תחזוקה (ר' תחילת מסמך זה).
// לא נוגעים בטפסי עריכה (openGenericEditForm) - שם צריך לראות/לשמור את הטקסט המקורי.
//
// זיהוי ברמת מילה שלמה בלבד (לא תת-מחרוזת!) - כדי לא לפגוע במילים שרק "נראות דומות" כמו
// "אלה"/"אלמנה"/"אלישע", ואף לא ב"זיהוהו" (מכיל את הרצף המקרי י-ה-ו-ה!). לכן משתמשים כאן
// ב-HEB_POINT_SRC (מוגדר למעלה ליד tokenizeHeb - ניקוד/טעמים בלבד, בלי מקף/פסק/סוף-פסוק) -
// אחרת "אל" המחובר במקף למילה הבאה (כמו "אֶל־מֹשֶׁה") היה נבלע כמילה אחת ולא מזוהה כגבול מילה.
function hebWordSrc(letters){ return letters.split('').map(ch => ch + HEB_POINT_SRC + '*').join(''); }
// עד שתי תחיליות (ה/ו/ב/כ/ל/מ/ש) מותרות לפני כל שם - כמו "וְהָאֱלֹהִים"/"לֵֽאלֹהִים"/"לַֽיהֹוָה" -
// אותה רשימת PREFIXES שכבר משמשת את candidateForms במנוע הזיהוי, כדי לתפוס גם צורות
// מחוברות ולא רק את השם הבודד. הבדיקה (לפני ואחרי, כולל התחיליות) מוודאת גבול מילה אמיתי -
// לא letter אחר שרק במקרה קודם/בא אחרי (למשל ה"ז" שב"זיהוהו"). ל"אל" בלבד - מקסימום תחילית
// אחת (לא שתיים): עם שתי תחיליות "אל" הקצר (2 אותיות בלבד) מתנגש במילים שכיחות כמו
// "שְׂמֹאל" (ש+מ+אל!) - ר' דוגמה בפונקציית הבדיקה. השמות הארוכים יותר (3-6 אותיות) לא
// נתקלו בהתנגשות דומה גם עם שתי תחיליות, ומרוויחים ממנה צורות אמיתיות כמו "וְהָאֱלֹהִים".
function wholeWordRe(src, opts){
  opts = opts || {};
  const maxPrefix = opts.maxPrefix != null ? opts.maxPrefix : 2;
  const prefixSrc = '(?:[' + PREFIXES.join('') + ']' + HEB_POINT_SRC + '*){0,' + maxPrefix + '}';
  const fix = opts.captureFix ? '(' + prefixSrc + ')' : '(?:' + prefixSrc + ')';
  return new RegExp('(?<![א-ת]' + HEB_POINT_SRC + '*)' + fix + '(?:' + src + ')(?!' + HEB_POINT_SRC + '*[א-ת])', 'g');
}
// כאן התחילית נלכדת (capture) בכוונה - כי ההחלפה של יהוה היא למחרוזת קבועה ('ה׳'), ובניגוד
// לשאר השמות (שרק "נשברים" עם מקף במקום, ר' hyphenateFromEnd) - צריך לשחזר את התחילית
// בעצמנו ב-maskDivineName כדי לא "לבלוע" אותה (למשל "לַֽיהֹוָה" -> "לַֽ" + "ה׳", לא רק "ה׳").
const DIVINE_NAME_RE = wholeWordRe(hebWordSrc('יהוה'), { captureFix: true });

// "אל" נכלל למרות שהוא גם מילת-יחס נפוצה ("אל משה") - לפי החלטה מפורשת שהתקבלה מהמפתח,
// על אף הפגיעה הצפויה בקריאות פסוקים רבים. מכסה רק את הצורה הבסיסית של כל שם - לא צורות
// נטויות עם סיומת שייכות (אלהיך/אלהינו/אלהי וכו') ולא צורות ארוכות/רחוקות יותר.
const OTHER_SACRED_NAMES = [
  { src: hebWordSrc('אל'), fromEnd: 1, maxPrefix: 1 },
  { src: hebWordSrc('שדי'), fromEnd: 1 },
  { src: hebWordSrc('אלוה'), fromEnd: 1 },
  { src: hebWordSrc('אדני'), fromEnd: 1 },
  { src: hebWordSrc('צבאות'), fromEnd: 2 },
  { src: hebWordSrc('אל') + '(?:ו' + HEB_POINT_SRC + '*)?' + hebWordSrc('הים'), fromEnd: 2 }, // אלהים / אלוהים
].map(n => ({ fromEnd: n.fromEnd, re: wholeWordRe(n.src, { maxPrefix: n.maxPrefix }) }));

// מכניס מקף לפני ה-N אותיות (לא ניקוד) האחרונות בהתאמה - כדי לשמור על הניקוד המקורי בדיוק.
function hyphenateFromEnd(match, fromEnd){
  let count = 0;
  for (let i = match.length - 1; i >= 0; i--){
    if (/[א-ת]/.test(match[i])){
      count++;
      if (count === fromEnd) return match.slice(0, i) + '-' + match.slice(i);
    }
  }
  return match;
}

// #58 — הבחירה בהגדרות (uiPrefs.divineName, settings.js): ה׳ (ברירת מחדל) · יְיָ ·
// יְדֹוָד · ככתוב. ב-background.html אין settings.js, ולכן ברירת המחדל.
const DIVINE_NAME_FORMS = { he: 'ה׳', yy: 'יְיָ', ydvd: 'יְדֹוָד' };
function divineNameMode(){
  return (typeof uiPrefs !== 'undefined' && uiPrefs && uiPrefs.divineName) || 'he';
}
function maskDivineName(html){
  const mode = divineNameMode();
  if (mode === 'source') return String(html==null?'':html);
  const form = DIVINE_NAME_FORMS[mode] || DIVINE_NAME_FORMS.he;
  let out = String(html==null?'':html).replace(DIVINE_NAME_RE, (m, prefix) => prefix + form);
  OTHER_SACRED_NAMES.forEach(n => { out = out.replace(n.re, m => hyphenateFromEnd(m, n.fromEnd)); });
  return out;
}

function hasOtzaria(){ return !!(window.Otzaria && typeof Otzaria.call === 'function'); }

function cmpVersion(a, b){
  const pa = String(a||'0').split('.').map(n=>parseInt(n,10)||0);
  const pb = String(b||'0').split('.').map(n=>parseInt(n,10)||0);
  for (let i=0;i<Math.max(pa.length,pb.length);i++){
    const d = (pa[i]||0) - (pb[i]||0);
    if (d) return d;
  }
  return 0;
}

// ---- קריאה ל-API שנוסף אחרי minAppVersion ----------------------------------
// המניפסט חוזר ל-minAppVersion 0.9.96 ב-2.19.2 (ר' תיעוד ב-CHANGELOG): גרסה
// אמיתית של 0.9.97 דרשה בהתקנה גם את app.startup_contributions וגם
// toolbarItems דרש בפועל 0.9.97+ — אבל העלאת הרצפה ל-0.9.97 חוסמת לגמרי כל
// מי שעל 0.9.96, כולל הפריט בלחיצה ימנית שכן עובד שם. לכן הרצפה חוזרת
// ל-0.9.96, toolbarItems ירד (ROADMAP 4.11), וה-API-ים שכן דורשים 0.9.97
// (למשל plugin.backgroundDone) עוברים דרך callIfSupported במקום להיות
// תנאי סף גורף. אין ודאות שכל אפליקציה אוכפת minAppVersion באמינות לפני
// הרצת קוד התוסף — נצפה בפועל שגרסה מתחת לרצפה (0.9.95) הגיעה עד לחריגה על
// הרשאה לא מוכרת במקום סירוב נקי. שתי שכבות הגנה, בכל זאת:
//
//   1. **סטטית** — הוולידטור של אוצריא (`otzaria pack-plugin`) סורק את הקבצים
//      וחוסם אריזה אם מחרוזת של API חדש מופיעה כשה-minAppVersion נמוך ממנו.
//      לכן שם המתודה מורכב בזמן ריצה ואינו קיים כליטרל בקוד.
//   2. **דינמית** — callIfSupported בודק את הגרסה בפועל לפני הקריאה, כך
//      שבגרסה שאינה תומכת היא פשוט לא נשלחת.
//
// ⚠️ אל תחליפו את הפיצול למערך במחרוזת אחת "נקייה" — זה בדיוק מה שמפיל את
// האריזה. ר' למפתחים.md.
let _appVersionCache;
async function appVersionAtLeast(min){
  if (!hasOtzaria()) return false;
  if (_appVersionCache === undefined){
    _appVersionCache = null;
    try {
      const res = await Otzaria.call('app.getInfo');
      // ⚠️ app.getInfo לא תמיד עוטף את התשובה ב-data (ר' התוסף הרשמי לדיווח
      // באגים, ששולף res?.data || res). בלי הנפילה הזו appVersionAtLeast היה
      // מקבל null, מניח "גרסה לא ידועה" ושולח APIs חדשים גם לגרסה ישנה.
      const info = (res && (res.data || res)) || {};
      _appVersionCache = info.version || null;
    } catch(e){}
  }
  // גרסה לא ידועה — לא חוסמים; הקריאה עצמה תיכשל בשקט אם אינה נתמכת.
  if (!_appVersionCache) return true;
  return cmpVersion(_appVersionCache, min) >= 0;
}

// #52 — plugin.openSelf({param}) + plugin.page_opened: קיימים מ-0.9.96
// (docs/תאימות-SDK-אוצריא.md §ג.2). נקראים רק דרך callIfSupported.
const OPEN_SELF_API = ['plugin', 'openSelf'];
const OPEN_SELF_MIN = '0.9.96';
function openSelfWith(param){
  if (!hasOtzaria()) return Promise.resolve(null);
  return callIfSupported(OPEN_SELF_API, OPEN_SELF_MIN, param ? { param: param } : {});
}
// האם ידוע בוודאות שהאפליקציה מוסרת plugin.page_opened (גרסה ידועה ≥ 0.9.96).
// גרסה לא ידועה = לא ודאי, ולכן מנגנון ה-storage+פולינג נשאר פעיל.
async function pageOpenedSupported(){
  await appVersionAtLeast(OPEN_SELF_MIN);
  return !!_appVersionCache && cmpVersion(_appVersionCache, OPEN_SELF_MIN) >= 0;
}

async function callIfSupported(parts, minVersion, payload){
  if (!(await appVersionAtLeast(minVersion))) return null;
  return Otzaria.call(parts.join('.'), payload || {}).catch(() => null);
}

// ============================================================
//  3.9.0 — הגדרות קריאה (נשמרות ב-storage של אוצריא כערכים פשוטים, כדי
//  שתנאי `when` במניפסט יוכלו לקרוא אותן בלי להעיר את המנוע)
// ============================================================
const READ_OPT_HIGHLIGHT = 'mh_highlight_identified';   // ברירת מחדל: דלוק
const READ_OPT_AUTO      = 'mh_auto_identify';          // ברירת מחדל: כבוי
const READ_OPT_HIDE_BTN  = 'mh_hide_toolbar_button';    // ברירת מחדל: כבוי

// 5.6.0: הגדרות ״קריאה״ (זיהוי אוטומטי וכו׳) לא נשמרו בסגירה — ערך בוליאני ב-storage.set
// לא תמיד שורד את הגשר של אוצריא. כותבים מחרוזת 'true'/'false', ומשקפים גם
// ב-localStorage; בקריאה מקבלים כל צורה (בוליאני, מחרוזת, מעטפת {value}).
function parseOptFlag(v){
  if (v && typeof v === 'object' && !Array.isArray(v) && 'value' in v) v = v.value;
  if (v === 'true' || v === '1' || v === 1) return true;
  if (v === 'false' || v === '0' || v === 0) return false;
  return (typeof v === 'boolean') ? v : null;
}
async function readOptFlag(key, def){
  let local = null;
  try { local = parseOptFlag(localStorage.getItem('opt:' + key)); } catch(e){}
  if (!(window.Otzaria && Otzaria.call)) return local === null ? def : local;
  try {
    const res = await Otzaria.call('storage.get', { key: key });
    const v = parseOptFlag(res && (res.data !== undefined ? res.data : res));
    if (v !== null) return v;
  } catch(e){}
  return local === null ? def : local;
}
// ---- שולחן עבודה חדש עם מקורות הערך (תיקון 08/10/2026) ----
// workspace.create+switchTo מחליף את הכרטיסיות — וכרטיסיית התוסף עצמה נשארת בשולחן
// הקודם, כך שהלולאה שפותחת את הספרים נקטעת והשולחן החדש נפתח ריק. לכן הרשימה נמסרת
// דרך האחסון: מנוע הרקע (שאינו כרטיסייה) מתעורר ל-workspace.changed כשהדגל דלוק
// (activationEvents במניפסט) ופותח את המקורות. מי שמגיע ראשון מכבה את הדגל.
const WS_PENDING_FLAG = 'mh_pending_ws_flag';
const WS_PENDING_KEY  = 'mh_pending_ws';
const WS_PENDING_TTL_MS = 2 * 60 * 1000;
async function openPendingWorkspaceSources(){
  if (!(await readOptFlag(WS_PENDING_FLAG, false))) return false;
  await writeOptFlag(WS_PENDING_FLAG, false);
  let job = null;
  try {
    const res = await Otzaria.call('storage.get', { key: WS_PENDING_KEY });
    let v = res && (res.data !== undefined ? res.data : res);
    if (v && typeof v === 'object' && 'value' in v) v = v.value;
    job = typeof v === 'string' ? JSON.parse(v) : v;
  } catch(e){ job = null; }
  if (!job || !Array.isArray(job.refs) || Date.now() - (job.ts || 0) > WS_PENDING_TTL_MS) return false;
  for (const p of job.refs){
    await Otzaria.call('reader.openBookAtRef', { bookId: p.bookId, ref: p.ref, index: 0 }).catch(() => {});
  }
  return true;
}

function writeOptFlag(key, val){
  try { localStorage.setItem('opt:' + key, val ? 'true' : 'false'); } catch(e){}
  if (!(window.Otzaria && Otzaria.call)) return Promise.resolve();
  return Otzaria.call('storage.set', { key: key, value: val ? 'true' : 'false' }).catch(()=>{});
}

// הדגשת הטקסט שזוהה בספר עצמו (reader.setHighlight). הבחירה מגיעה מ-payload של
// לחיצת תפריט ההקשר; בבחירה רב-פסקתית יש sections עם עוגן לכל אחת.
async function highlightIdentifiedSelection(payload){
  try {
    if (!(await readOptFlag(READ_OPT_HIGHLIGHT, true))) return;
    const sel = (payload && payload.selection) || payload || {};
    const targets = Array.isArray(sel.sections) && sel.sections.length ? sel.sections : [sel];
    let n = 0;
    for (const t of targets){
      if (!t || !t.sourceRange) continue;
      await Otzaria.call('reader.setHighlight', {
        highlightId: 'mh-' + Date.now().toString(36) + '-' + (n++),
        bookId: t.bookId || payload.currentBookId || payload.currentBook,
        sectionIndex: (t.sectionIndex != null ? t.sectionIndex : payload.currentIndex),
        range: t.sourceRange,
        style: { backgroundColor: '#8FC1E3', opacity: 0.45, borderRadius: 3, priority: 5 },
        metadata: { source: 'madaei-hatanach' }
      });
    }
  } catch(e){ /* הדגשה היא תוספת — כישלון שקט */ }
}

// 4.0.0 — tools.dictionary: כשאין ערך במדריכים, פירוש ראשי תיבות / ארמית מהמילון
// המובנה של אוצריא. מחזיר שורה מוכנה להצגה, או '' כשאין.
async function dictionaryLine(text){
  try {
    const t = String(text || '').trim();
    if (!t || t.length > 40 || !(window.Otzaria && Otzaria.call)) return '';
    const res = await Otzaria.call('tools.dictionary', { term: t });
    const d = res && (res.data !== undefined ? res.data : res);
    if (!d) return '';
    const parts = [];
    (d.acronyms || []).slice(0, 2).forEach(a => parts.push('ר״ת ' + a.acronym + ': ' + (a.meanings || []).slice(0, 3).join(' / ')));
    (d.aramaic || []).slice(0, 2).forEach(a => {
      const w = a.word || a.term || a.aramaic || '';
      const h = String(a.hebrew || a.meaning || '').replace(/<[^>]*>/g, '');
      if (h) parts.push('ארמית' + (w ? ' ' + w : '') + ': ' + h.slice(0, 120));
    });
    return parts.length ? '📖 מהמילון של אוצריא — ' + parts.join(' · ') : '';
  } catch(e){ return ''; }
}

// 4.1.0 — המדריכים כ"ספרים" באיתור הספרים של מסך הספרייה באוצריא
// (contributes.startup.libraryBooks + library.setProviderBooks). הרשימה נשמרת
// אצל אוצריא, ולכן מספיק לשלוח אותה פעם בעלייה. id = מיקום ב-CATEGORIES + 1.
const LIBRARY_PROVIDER = 'einayim-lamikra';
// #98: שם התצוגה במקום אחד. בניית ״עינים למקרא+״ מחליפה את השורה הזאת (publish.yml).
const PLUGIN_DISPLAY_NAME = 'עינים למקרא';
if (typeof document !== 'undefined' && PLUGIN_DISPLAY_NAME !== 'עינים למקרא'){
  document.title = PLUGIN_DISPLAY_NAME;
  const h1 = document.querySelector('h1');
  if (h1 && h1.textContent.trim() === 'עינים למקרא') h1.textContent = PLUGIN_DISPLAY_NAME;
}
const READ_OPT_IN_LIBRARY = 'mh_show_in_library';
function publishGuidesToLibrary(){
  if (!(window.Otzaria && Otzaria.call) || typeof CATEGORIES === 'undefined') return;
  Otzaria.call('library.setProviderBooks', {
    provider: LIBRARY_PROVIDER,
    books: CATEGORIES.map((c, i) => ({
      id: i + 1,
      title: PLUGIN_DISPLAY_NAME + ' — ' + c.label,
      author: 'מדריך ' + PLUGIN_DISPLAY_NAME,
      categoryPath: '/' + PLUGIN_DISPLAY_NAME
    }))
  }).catch(() => {});
}
function guideIdFromProviderBook(d){
  if (!d || d.provider !== LIBRARY_PROVIDER) return null;
  const c = CATEGORIES[(Number(d.id) || 0) - 1];
  return c ? c.id : null;
}

// 4.2.0 — סימון כל הערכים שזוהו בדף הפתוח (reader.findTextOccurrences +
// reader.setHighlight). רק כשהגדרת ההדגשה דלוקה, ועד 40 הדגשות לדף.
async function highlightMatchesInSection(bookId, sectionIndex, matches){
  try {
    if (!bookId || !(window.Otzaria && Otzaria.call)) return;
    if (!(await readOptFlag(READ_OPT_HIGHLIGHT, true))) return;
    const words = Array.from(new Set(matches.map(m => m.matchedVia || m.name).filter(w => w && w.length > 1))).slice(0, 25);
    let n = 0;
    for (const q of words){
      if (n >= 40) break;
      const res = await Otzaria.call('reader.findTextOccurrences', {
        bookId: bookId, sectionIndex: sectionIndex, query: q, layer: 'source', normalize: { profile: 'search' }, limit: 5
      }).catch(() => null);
      const d = res && (res.data !== undefined ? res.data : res);
      for (const occ of ((d && d.results) || [])){
        if (n >= 40 || !occ.range) break;
        await Otzaria.call('reader.setHighlight', {
          highlightId: 'mh-page-' + sectionIndex + '-' + (n++),
          bookId: bookId, sectionIndex: sectionIndex, range: occ.range,
          style: { backgroundColor: '#8FC1E3', opacity: 0.35, borderRadius: 3, priority: 4 },
          metadata: { source: 'madaei-hatanach', term: q }
        }).catch(() => {});
      }
    }
  } catch(e){}
}
