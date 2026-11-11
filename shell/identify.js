// מנוע הזיהוי. אין כאן DOM ואין Otzaria — כדי שאפשר יהיה להריץ אותו ב-Node.
// נוצר בפיצול router.js (גרסה 2.11.2). המקור: shell/router.js שורות 203-216, 229-368.
// אין להפוך ל-type="module" — כל הקבצים חולקים scope גלובלי אחד.


function normalizeHeb(s){
  return String(s || '')
    .replace(/[֑-ׇ]/g, '')   // ניקוד וטעמים
    .replace(/[־\-]/g, ' ')            // מקף עברי ומקף ASCII (מלכי-צדק) — v2 שכבה 0
    .replace(/\s+/g, ' ')
    .replace(/[""'']/g, '')
    .trim();
}

// כתיב חסר/מלא: פסוקים מקראיים כתובים לרוב בכתיב חסר (בלי אותיות ו/י פנימיות
// שרק מציינות תנועה - למשל "חטה"), בעוד שהערכים במאגרי הנתונים כתובים בכתיב מלא
// הרגיל ("חיטה"). לכן בודקים גם התאמה אחרי הסרת כל האותיות ו/י, בדיוק כמו
// שכל מדריך עושה בעצמו (looseForm) בזיהוי הפנימי שלו.
//
// **האות הראשונה נשמרת תמיד.** כתיב חסר/מלא הוא תופעה של ו/י *באמצע* המילה; ו/י
// פותחת היא לעולם לא זה - היא או שורש אמיתי (יעקב, יצחק, ירושלים) או תחילית
// דקדוקית (י' של עתיד: יאמר, ילך). מחיקתה גררה זיהויי שווא עקביים: "וַיֹּאמֶר"
// נחתך ל"אמר" והחזיר את האישים "אומר"/"אמרי" בכל פסוק שיש בו ויאמר. נבדק על כל
// חמשת המדריכים: 294 ערכים ששמם עצמו נפתח ב-ו/י ממשיכים להירשם כרגיל.
function looseForm(s){
  s = String(s || '');
  return s.length > 1 ? s[0] + s.slice(1).replace(/[וי]/g, '') : s;
}
const SUFFIXES = ['ים','ות'];

// מילות-תיאור גנריות שחוזרות בעשרות שמות מורכבים ("ארץ ישראל", "הר סיני", "נחל
// קישון"...) - לא נרשמות כמפתח זיהוי עצמאי כשהן חלק משם רב-מילים (ר' registerPhrase),
// כדי שבחירת "ארץ"/"הר" וכו' בפני עצמה לא תחזיר עשרות התאמות שווא מכל הערכים ששמם
// מתחיל באותה מילה.
const GENERIC_DESCRIPTORS = new Set(['ארץ','הר','נחל','ים','עמק','מדבר','בית','עיר','בני','מעין','גיא','שדה','עין']);

// מילות-קישור/יחס נפוצות מדי מכדי לשמש בזיהוי - "ממנה" למשל, אחרי הסרת ה-מ' כתחילית
// כאילו הייתה מ' השימוש, הופך ל"מנה" (מטבע) ומייצר זיהוי שווא. מילים כאלה נפסלות
// לגמרי מזיהוי (לא רק כמפתח, גם כמילת-טקסט להשוואה) עוד לפני חישוב candidateForms.
// v2 (01/09/2026) — "את" נוסף: מילית-מושא ישיר, מהמילים השכיחות ביותר בתנ"ך
// (כמעט בכל פסוק שיש בו פועל יוצא), והתנגשה עם ערך דומם בשם זהה ("את" = להב
// מחרשה). כל הופעה שלה כמילית זוהתה בטעות ככלי-עבודה. זו בדיוק המחלקה שה-Set
// הזה קיים בשבילה, ופשוט נשכחה ממנו.
const STOPWORDS = new Set(['ממנה','אשר','כמו','אלה','אותה','אותו','להם','מהם','אליה','אליו','עליה','עליו','מהן','בהם','בהן','להן','אתה','אתם','אנחנו','זאת','זה','את']);

// מסיר ניקוד/טעמים (HEB_POINT_RE - לא כולל מקף!) לפני ה-match, כדי שאותיות מנוקדות בתוך
// מילה אחת יתחברו לטוקן אחד ("וַיֹּ֩אמֶר֩" -> "ויאמר"). בגרסה קודמת הוסר גם המקף (־) - כי
// היה כלול (בטעות) באותו טווח יוניקוד רחב - וזה גרם ל"אֶל־מֹשֶׁה" (מילה־מקף־מילה) להתמזג
// לטוקן אחד שגוי "אלמשה" במקום שתי מילים "אל" ו"משה". תוקן ע"י שימוש ב-HEB_POINT_RE
// המדויק יותר, שלא כולל מקף/פסק/סוף-פסוק - אלה נשארים כגבול מילה טבעי (כמו רווח).
function tokenizeHeb(text){
  return (text || '').replace(HEB_POINT_RE, '').match(/[א-ת]+/g) || [];
}

// ---- אימות ניקוד (2.17.2) ----
// הטקסט המקראי שמסמנים באוצריא מגיע מנוקד, ומחצית משמות הערכים מופיעים מנוקדים
// בתוך שדה verses של הערך עצמו. שני הצדדים האלה נזרקו עד כה (tokenizeHeb מסיר את
// הניקוד בשורה הראשונה) - וזו בדיוק האינפורמציה שמבדילה בין "מֹשֶׁה" ל"שֵׂה"
// (שׁ ימנית מול שׂ שמאלית) ובין "מַחֲנֶה" ל"חַנָּה". ר' ההסבר המלא ב-nikudRejects.
//
// להשוואה שומרים תנועות ונקודת שין/שין-שמאלית, ומסירים:
//   * טעמי המקרא (0591-05AF) - סימני פיסוק/נגינה, משתנים בין הופעה להופעה
//   * דגש (05BC) - נוסף/נעלם בגלל התחילית עצמה ("בַּמַּחֲנֶה" מול "מַחֲנֶה"),
//     ולכן הכללתו הייתה פוסלת התאמות לגיטימיות. התנועות לבדן מספיקות להבחנה.
//   * מתג/רפה (05BD/05BF) - סימני הטעמה, לא חלק מהניקוד
const VOWEL_KEEP_SRC = '[\\u05B0-\\u05BB\\u05C1\\u05C2\\u05C7]';
const NON_VOWEL_POINT_RE = new RegExp('(?!' + VOWEL_KEEP_SRC + ')' + HEB_POINT_SRC, 'g');
const HAS_VOWEL_RE = new RegExp(VOWEL_KEEP_SRC);

// הצורה המנוקדת המנורמלת של טוקן: אותיות + תנועות + נקודת שין בלבד.
// ⚠️ normalize('NFC') חובה ולא קישוט: אותו רצף מקודד בשני סדרים שונים במקורות
// שונים - "מֹשֶׁה" במאגר הפסוקים הוא שין→נקודת-שין→סגול, ובטקסט אחר שין→סגול→
// נקודת-שין. אותם תווים בדיוק, ולכן השוואת מחרוזות נכשלה על צורות זהות לגמרי.
// NFC ממיין את תווי הצירוף לפי ה-combining class ומיישר את שני המקורות.
function vowelForm(s){ return String(s || '').replace(NON_VOWEL_POINT_RE, '').normalize('NFC'); }

// פירוק לטוקנים ששומר את הניקוד, ומחזיר לכל טוקן גם את צורת העיצורים שלו.
// היישור בין השניים מובטח מעצם הבנייה (אותה התאמה, הסרת ניקוד לכל טוקן בנפרד),
// ולכן הוא לא יכול "להחליק" כמו שקורה בהשוואת שתי טוקניזציות נפרדות.
function tokenizeHebPairs(text){
  const toks = (text || '').match(new RegExp('[א-ת]' + HEB_POINT_SRC + '*(?:[א-ת]' + HEB_POINT_SRC + '*)*', 'g')) || [];
  return toks.map(t => ({ c: t.replace(HEB_POINT_RE, ''), v: vowelForm(t), r: rawForm(t) }));
}

// המקרה השכיח הוא בדיוק ההפך ממה שהאימות הסטטי (harvestVocalForms) מכסה: המשתמש
// מסמן טקסט שאינו מנוקד כלל (הועתק ממקור אחר, או שהניקוד פשוט הוסר בדרך), ואז
// לכל טוקן יש tok.v ריק - ואין עם מה להשוות מול הלקסיקון המנוקד. vocalizedText
// הוא הטקסט הנבחר *עצמו* אחרי שהנקדן החי ניקד אותו (ר' nikud-engine.js:getLiveContext,
// bridge.js:identifyWithLiveContext) - ניקוד לצורה הספציפית שבחר המשתמש, לא לכל
// הופעה אפשרית של המילה. ממלאת tok.v רק לטוקנים חסרי-ניקוד משלהם, ורק אחרי אימות
// מלא ששני הצדדים מתיישרים עיצור-אחר-עיצור על פני הטקסט *כולו* - לא רק בנקודה
// הבודדת שנדרשת. יישור חלקי לא נבדק ולא נסמכים עליו; זו אותה זהירות "לא מנחשים"
// שכבר קיימת ב-resolveAmbiguousStopwords/getLiveContext.
function applyLiveVocalization(toks, vocalizedText){
  if (!vocalizedText) return;
  if (!toks.some(t => !HAS_VOWEL_RE.test(t.v))) return; // הכל כבר מנוקד - אין צורך בהנקדן
  const vocToks = tokenizeHebPairs(vocalizedText);
  if (vocToks.length !== toks.length) return;
  for (let i = 0; i < toks.length; i++){ if (vocToks[i].c !== toks[i].c) return; }
  for (let i = 0; i < toks.length; i++){
    if (!HAS_VOWEL_RE.test(toks[i].v)) toks[i] = { c: toks[i].c, v: vocToks[i].v, r: vocToks[i].r };
  }
}

// ===========================================================================
// מנוע הזיהוי v2 — שמונה השכבות (#39, 07/10/2026). התכנון המלא והכללים:
// docs/סבבים/תכנון-מנוע-הזיהוי-v2.md. המדד: tools/identify-bench.js (סט הזהב)
// ו-tools/identify-corpus.js (זיהויי הבעלים על כל המאגר).
//
// הרעיון: כל התאמה צוברת *עדות* (שכבות 0–6) וההכרעה נעשית בשכבה 7 — ציון 0–1
// ושלוש דרגות: ודאי (≥0.75) · סביר (≥0.5) · אפשרי (<0.5). ברירת המחדל של
// identify() מחזירה רק ודאי+סביר, כך שכל קורא קיים (מונה הסרגל, הדגשות הדף,
// הרקע) מקבל את הסינון בלי שינוי. חלון התוצאות מבקש גם את ״אפשרי״
// (opts.includePossible) ומקפל אותם — לא מוחקים ספק, מודים בו.
// ===========================================================================

const LEX = (typeof IDENTIFY_LEXICON !== 'undefined' && IDENTIFY_LEXICON) || {};
function lexSet(k){ return new Set(LEX[k] || []); }
const AMBIG_CONTEXT  = lexSet('AMBIGUOUS_CONTEXT');
const AMBIG_VOCAL    = lexSet('AMBIGUOUS_VOCAL');
const NOUN_AMBIG     = lexSet('NOUN_AMBIGUOUS');
const TALMUD_FW      = lexSet('TALMUD_FUNCTION_WORDS');
const GEN_BEFORE     = lexSet('GENEALOGY_BEFORE');
const GEN_AFTER      = lexSet('GENEALOGY_AFTER');
const NAMING_CUES    = lexSet('NAMING_CUES');
const COLL_BEFORE    = lexSet('COLLECTIVE_BEFORE');
const COLL_NAMES     = lexSet('COLLECTIVE_NAMES');
const HOLY_KEYS      = lexSet('HOLY_KEYS');
const SAGE_CUES      = lexSet('SAGE_CUES');
const SUBJECT_VERBS  = new Set(['ויאמר','ותאמר','ויען','ותען','וידבר','ויקח','ותקח','וילך','ותלך','וישלח','ויצו','ויבא','ותבא','ויקם','ותקם','וישב','ויעל','וירד','ויצא','ותצא','ויחי','וימת','ותמת','וימלך']);
const DISAMBIG_SKIP  = new Set(['מלך','בן','בת','אבי','אשת','אחי','של','איש','אשה','חז״ל','חזל']);

// מדריכי שמות — כאן ״מילה רגילה״ היא תמיד חשד. בשאר (דומם, צומח, בע״ח…) המילה
// עצמה היא בדרך כלל המשמעות הנכונה, וסיומת רבים מותרת.
const NAME_GUIDES = new Set(['people', 'places', 'amoraim']);
// 5.6.1 #247 — שמות שהם גם מילה שכיחה מאוד (״בני ישראל״): לא מזוהים כמילה בודדת
const COMMON_WORD_NAMES = new Set(['בני']);
const isNameGuide = (catId) => NAME_GUIDES.has(catId);

// מפתח שמופיע בניקוד אחר ב-AMBIG_VOCAL_MIN פסוקים לפחות במאגר של אותו מדריך
// הוא רב-משמעי (שכבה 3.3) — בלי רשימה ידנית.
const AMBIG_VOCAL_MIN = 8;

const SCORE = { CERTAIN: 0.75, LIKELY: 0.5, FLOOR: 0.2 };
function confidenceOf(s){ return s >= SCORE.CERTAIN ? 'ודאי' : s >= SCORE.LIKELY ? 'סביר' : 'אפשרי'; }

// ---- שכבה 0: סיווג המקור לפי הטקסט עצמו ----
const TEAMIM_RE = /[֑-֯]/;
function detectSource(text, opts){
  const k = opts && opts.source && opts.source.kind;
  if (k === 'מקרא' || k === 'משנה' || k === 'חזל' || k === 'חז״ל') return k === 'חז״ל' ? 'חזל' : k;
  if (TEAMIM_RE.test(text)) return 'מקרא';
  if (HAS_VOWEL_RE.test(text)) return 'משנה';
  return 'חזל';
}

// צורה ״גולמית״ של טוקן: תנועות + דגש + נקודת שין, בלי טעמים/מתג. הדגש נחוץ
// לזיהוי ו״ו ההיפוך (וַיּ) ול-מ׳ השימוש (מִכּ) — vowelForm מסיר אותו בכוונה.
const RAW_DROP_RE = /[֑-ֽֿׅ֯ׄ]/g;
function rawForm(t){ return String(t || '').replace(RAW_DROP_RE, '').normalize('NFC'); }

// פירוק מחרוזת מנוקדת לאותיות, כל אחת עם הסימנים שעליה.
function letterSegs(s){ return String(s || '').match(/[א-ת][^א-ת]*/g) || []; }
const marksOf = (seg) => (seg || '').slice(1);

// ---- שכבה 1: ו״ו ההיפוך = פועל ----
// וַ + אות עתיד (יּ/תּ/נּ, ובשווא: וַיְ) או וָא — אין לזה מקבילה בשמות. החריג
// (וַיְזָתָא, וַנְיָה) נתפס בהשוואת הניקוד המלא מול הלקסיקון, ר' matchToken.
function isVerbToken(tok){
  return /^וַ[יתנ]/.test(tok.r) || /^וָא/.test(tok.r);
}

// ---- שכבה 2: דקדוק תחיליות ----
// שרשרת מותרת: [ו]?[הבכלמש]? — ו״ו לבדה, אות שימוש אחת, או ו״ו + אות שימוש.
// בטקסט מנוקד כל אות-תחילית חייבת לשאת ניקוד שמתאים לה; אחרת זו אינה תחילית
// (מַחֲנֶה, שְׁמֹנֶה, מִשְׁמָע). בטקסט בלי ניקוד אין איך לבדוק — ההתאמה ״לא מאומתת״.
const ID_PREFIX_LETTERS = 'הבכלמש';
function prefixValid(segs, k){
  for (let j = 0; j < k; j++){
    const ch = segs[j] && segs[j][0], m = marksOf(segs[j]), next = marksOf(segs[j + 1]);
    const has = (cp) => m.indexOf(cp) >= 0;
    let ok = false;
    if (ch === 'ו') ok = !/[ֹֺֻ]/.test(m) || has('ּ');
    else if (ch === 'ה') ok = has('ַ') || has('ָ') || has('ֶ');
    else if (ch === 'ב' || ch === 'כ' || ch === 'ל') ok = /[ְִֵֶַָ]/.test(m);
    else if (ch === 'מ') ok = (has('ִ') && next.indexOf('ּ') >= 0) || has('ֵ');
    else if (ch === 'ש') ok = (has('ֶ') || has('ַ')) && next.indexOf('ּ') >= 0;
    if (!ok) return false;
  }
  return true;
}

// הצורות האפשריות של חלון (מילה או צירוף), כל אחת עם מה שנחתך ממנה.
//   pre    — התחילית שנחתכה ('' / 'ו' / 'ב' / 'וב'…)
//   suf    — סיומת רבים שנחתכה ('' / 'ים' / 'ות') — מותרת רק למדריכי שמות-עצם
//   verified — true: הניקוד מאשר את התחילית · null: טקסט לא מנוקד (לא נבדק)
function candidateForms2(firstTok, phrase, vocalized, afterBen){
  const w = normalizeHeb(phrase);
  if (!w) return [];
  const segs = letterSegs(firstTok.r);
  const pres = [''];
  if (!afterBen || w[0] === 'ו'){
    if (w[0] === 'ו' && w.length > 2){ pres.push('ו'); if (!afterBen && ID_PREFIX_LETTERS.includes(w[1])) pres.push('ו' + w[1]); }
    else if (!afterBen && ID_PREFIX_LETTERS.includes(w[0])) pres.push(w[0]);
  }
  const out = [];
  for (const pre of pres){
    const stem = w.slice(pre.length);
    if (pre && stem.replace(/ /g, '').length < 2) continue;
    let verified = null;
    if (pre){
      if (vocalized){ if (!prefixValid(segs, pre.length)) continue; verified = true; }
    }
    out.push({ f: stem, pre, suf: '', verified });
    for (const suf of SUFFIXES){
      if (stem.endsWith(suf) && stem.length > suf.length + 2){
        out.push({ f: stem.slice(0, -suf.length), pre, suf, verified });
      }
    }
  }
  return out;
}
// תאימות לאחור: entry-detail.js ומדריכים אחרים קוראים candidateForms(word) ומצפים
// למערך מחרוזות. שומרים את ההתנהגות הישנה שלהם בלי שינוי.
function candidateForms(word){
  const w = normalizeHeb(word);
  if (!w) return [];
  const prefixVariants = [w];
  if (w.length > 2 && PREFIXES.includes(w[0])) prefixVariants.push(w.slice(1));
  const all = new Set([w]);
  prefixVariants.forEach(p => {
    if (p.length >= 3) all.add(p);
    SUFFIXES.forEach(suf => {
      if (p.endsWith(suf) && p.length > suf.length + 1){
        const stripped = p.slice(0, -suf.length);
        if (stripped.length >= 3) all.add(stripped);
      }
    });
  });
  return Array.from(all);
}

const lookupCache = {}; // catId -> lookup

// ---- שכבה 3: לקסיקון מנוקד ----
// קוצרים את הצורות המנוקדות של השם מתוך הפסוקים של הערך עצמו — אבל רק מטוקן
// שהוא היחיד בפסוק בצורה הזו, או שצמוד לרמז-שם (בן/בת/שמו…). אחרת נקצרות גם
// צורות של המילה הרגילה (עָפָר מול עֵפֶר, חַגַּי מול חַגִּי) ופוסלות שווא את השם.
const HARVEST_CUES = new Set(['בן','בת','בני','בנו','בתו','שמו','שמה','אבי','אחי','אשת','ילד','הוליד']);
function harvestVocalForms(entry, vocal){
  const verses = entry.verses || [];
  if (!verses.length) return;
  const wanted = new Set();
  const collect = (phrase) => String(phrase || '').trim().split(/\s+/).forEach(w => {
    const n = normalizeHeb(w);
    if (n.length >= 2) wanted.add(n);
  });
  collect((entry.name || '').replace(/\s*\(([^)]*)\)\s*$/, ' $1'));
  (entry.aliases || []).forEach(collect);
  if (!wanted.size) return;
  for (const v of verses){
    const toks = tokenizeHebPairs(v.text || '');
    const count = new Map();
    toks.forEach(t => count.set(t.c, (count.get(t.c) || 0) + 1));
    toks.forEach((tok, i) => {
      if (!HAS_VOWEL_RE.test(tok.v)) return;
      // גם וְחַגִּי / וְאוֹן — ו״ו החיבור היא אות נפרדת, והשם שאחריה בניקודו המלא
      let c = tok.c, v = tok.v;
      if (!wanted.has(c) && c[0] === 'ו' && wanted.has(c.slice(1))){ c = c.slice(1); v = letterSegs(v).slice(1).join(''); }
      if (!wanted.has(c)) return;
      const cue = [toks[i - 1], toks[i + 1]].some(n => n && HARVEST_CUES.has(cueForm(n.c)));
      if (count.get(tok.c) > 1 && !cue) return;
      if (!vocal.has(c)) vocal.set(c, new Set());
      vocal.get(c).add(v);
    });
  }
}

// השוואת ניקוד: קמץ≈פתח (צורות הפסק), ובחיתוך תחילית — בלי תנועת האות הראשונה
// (וִיהוֹשֻׁעַ מול יְהוֹשֻׁעַ). נקודת השין נשמרת תמיד (מֹשֶׁה מול שֵׂה).
function relaxVowels(segs){ return segs.join('').replace(/[ָׇ]/g, 'ַ'); }
function vocalKey(segs, dropLead){
  const s = segs.slice();
  if (dropLead && s.length) s[0] = s[0][0] + marksOf(s[0]).replace(/[^ׁׂ]/g, '');
  return relaxVowels(s);
}
// true = הניקוד מאשר · false = סותר · null = אין עם מה להשוות
function vocalVerdict(tok, m, known){
  if (!known || !known.size || !HAS_VOWEL_RE.test(tok.v)) return null;
  const segs = letterSegs(tok.v);
  const preLen = m.pre.length;
  let n = m.f.length;
  if (segs.length < preLen + n) return null;
  let got = segs.slice(preLen, preLen + n);
  if (m.suf) n -= 1;                       // לפני סיומת — התנועה האחרונה משתנה
  got = got.slice(0, n);
  const g = vocalKey(got, preLen > 0);
  for (const kv of known){
    const ks = letterSegs(kv).slice(0, n);
    if (vocalKey(ks, preLen > 0) === g) return true;
  }
  return false;
}

// מילת-רמז: בלי ו״ו פותחת (ובני → בני), כדי שרשימות הרמזים יישארו קצרות.
function cueForm(c){ return c.length > 2 && c[0] === 'ו' ? c.slice(1) : c; }

function buildLookup(data, catId){
  const exact = new Map(), loose = new Map(), vocal = new Map();
  const parenKeys = new Map();   // key -> Set(entry): מפתחות שנרשמו רק מהבהרה בסוגריים
  const benPart = new Map();     // key -> Set(entry): ״X״ מתוך ״X בן Y״ (שכבה 4.2) — משני עד שיש עדות
  const cueOnly = new Set();     // מפתחות מ-EXTRA_KEYS — מזוהים רק עם רמז
  function registerKey(phrase, entry, viaParen){
    const norm = normalizeHeb(phrase);
    if (!norm || norm.length < 2) return;
    if (GENERIC_DESCRIPTORS.has(norm)) return;
    if (!exact.has(norm)) exact.set(norm, []);
    if (exact.get(norm).indexOf(entry) < 0) exact.get(norm).push(entry);
    if (viaParen){ if (!parenKeys.has(norm)) parenKeys.set(norm, new Set()); parenKeys.get(norm).add(entry); }
    // כתיב חסר — נרשם מ-4, אבל שלד של 4 מתקבל רק בטקסט מנוקד (שכבה 5, ר' matchToken).
    const lo = looseForm(norm);
    if (lo.length >= 4 && lo !== norm){
      if (!loose.has(lo)) loose.set(lo, []);
      if (loose.get(lo).indexOf(entry) < 0) loose.get(lo).push(entry);
    }
  }
  data.forEach(entry => {
    let nameCore = entry.name || '', nameParen = '';
    const pm = nameCore.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    if (pm){ nameCore = pm[1]; nameParen = pm[2]; }
    registerKey(nameCore, entry, false);
    // ״X בן Y״ נרשם גם כ-X, כדי שאזכור של X לבדו יגיע אליו — אבל כערך משני
    // (מוסתר), שעולה רק כש-Y בחלון או כשהערך רושם את הפסוק (אבימלך בן גדעון).
    const bm = nameCore.match(/^(\S+)\s+(?:בן|בת)\s+\S/);
    if (bm && isNameGuide(catId)){
      const k = normalizeHeb(bm[1]);
      if (k.length >= 2 && !GENERIC_DESCRIPTORS.has(k)){
        const had = exact.has(k) && exact.get(k).indexOf(entry) >= 0;
        registerKey(bm[1], entry, false);
        if (!had){ if (!benPart.has(k)) benPart.set(k, new Set()); benPart.get(k).add(entry); }
      }
    }
    if (nameParen) registerKey(nameParen, entry, true);
    (entry.aliases || []).forEach(a => registerKey(a, entry, false));
    harvestVocalForms(entry, vocal);
  });
  // 3.3 (#40): לקסיקון מנוקד סטטי — רק למפתחות שהקציר העצמי לא נתן להם צורה.
  const staticVocal = (typeof VOCAL_LEXICON !== 'undefined' && VOCAL_LEXICON[catId]) || null;
  if (staticVocal) Object.keys(staticVocal).forEach(k => {
    if (vocal.has(k) && vocal.get(k).size) return;
    vocal.set(k, new Set(staticVocal[k]));
  });
  const extra = (LEX.EXTRA_KEYS && LEX.EXTRA_KEYS[catId]) || {};
  Object.keys(extra).forEach(k => {
    const entry = data.find(e => e.name === extra[k]);
    if (!entry) return;
    const norm = normalizeHeb(k);
    if (!exact.has(norm)) exact.set(norm, []);
    if (exact.get(norm).indexOf(entry) < 0){ exact.get(norm).push(entry); cueOnly.add(norm); }
  });
  // שכבה 3.3 — דגל רב-משמעות סטטיסטי: כמה פעמים המפתח מופיע בפסוקי המדריך
  // בניקוד ש*אינו* אחד מהצורות של השם.
  const ambigVocal = new Set();
  const mism = new Map();
  data.forEach(entry => (entry.verses || []).forEach(v => {
    tokenizeHebPairs(v.text || '').forEach(tok => {
      const known = vocal.get(tok.c);
      if (!known || !HAS_VOWEL_RE.test(tok.v)) return;
      const verdict = vocalVerdict(tok, { f: tok.c, pre: '', suf: '' }, known);
      if (verdict === false) mism.set(tok.c, (mism.get(tok.c) || 0) + 1);
    });
  }));
  mism.forEach((n, k) => { if (n >= AMBIG_VOCAL_MIN) ambigVocal.add(k); });
  return { exact, loose, vocal, parenKeys, benPart, cueOnly, ambigVocal };
}

async function getLookup(cat){
  if (lookupCache[cat.id]) return lookupCache[cat.id];
  const data = await loadGuideData(cat);
  const lookup = buildLookup(data, cat.id);
  lookupCache[cat.id] = lookup;
  return lookup;
}

// אחרי עריכה מקומית (שם/כינויים) צריך לבנות מחדש את מפת הזיהוי של אותו מדריך.
function invalidateLookup(catId){
  delete lookupCache[catId];
  if (catId === 'places' && typeof invalidatePlaceNameIndex === 'function') invalidatePlaceNameIndex();
  if (typeof invalidateCoMentions === 'function') invalidateCoMentions();
}

// שמות אנשים (בעיקר תנאים/אמוראים) — צירופים עד 7 מילים.
const MAX_WINDOW = 8;

// ---- ״פסוק רשום״: הערך רושם את הפסוק שבו הוא נמצא ----
// עדות חזקה ואמיתית: כשהמשתמש מסמן פסוק שכבר מופיע בשדה verses של ערך, זה
// הערך שהפסוק מדבר עליו (אבימלך בן גדעון בשופטים ט, ולא אבימלך מלך גרר).
const verseIndexCache = new WeakMap();
function entryVerseText(entry){
  let s = verseIndexCache.get(entry);
  if (s === undefined){
    s = (entry.verses || []).map(v => ' ' + tokenizeHebPairs(v.text || '').map(t => t.c).join(' ') + ' ').join('|');
    verseIndexCache.set(entry, s);
  }
  return s;
}

// מתאימה טוקן/חלון אחד מול מדריך אחד. מחזירה מועמדים עם ציון בסיס ועדויות
// הניקוד (שכבות 2, 3, 5). הקשר (שכבה 6) והכרעות (4, 7) — אחר כך, ברמת הטקסט.
function matchWindow(ctx, i, len, cat, lookup){
  const { toks, vocalized, source } = ctx;
  const windowToks = toks.slice(i, i + len);
  const phrase = windowToks.map(t => t.c).join(' ');
  const first = windowToks[0];
  const afterBen = i > 0 && (toks[i - 1].c === 'בן' || toks[i - 1].c === 'בת');
  const forms = candidateForms2(first, phrase, vocalized, afterBen);
  const nameGuide = isNameGuide(cat.id);
  for (const m of forms){
    if (len === 1 && nameGuide && COMMON_WORD_NAMES.has(m.f)) continue;
    if (m.suf && nameGuide) continue;                 // אלהים→אלה, שבעים→שבע, טבחים→טבח
    if (len === 1 && m.pre && STOPWORDS.has(m.f) && !(ctx.allowStopwords && ctx.allowStopwords.has(m.f))) continue; // ואת → את
    const entries = lookup.exact.get(m.f);
    if (!entries) continue;
    const short = m.f.length === 2 && len === 1;
    if (short && !m.pre) { /* שם בן 2 אותיות בהתאמה מדויקת — תקין (נח, דן) */ }
    let base;
    if (len > 1) base = m.pre ? (m.verified ? 0.9 : 0.85) : 1.0;
    else if (!m.pre && !m.suf) base = 0.7;
    else if (m.pre && m.suf) base = m.verified ? 0.5 : 0.35;
    else if (m.suf) base = 0.6;
    else if (short) base = m.verified ? 0.55 : 0.35;
    else base = m.verified ? 0.6 : (m.pre.slice(-1) === 'ש' ? 0.45 : 0.55);
    const ev = [len > 1 ? 'צירוף' : m.pre ? 'תחילית ' + m.pre + (m.verified ? '✓' : '?') : m.suf ? 'סיומת' : 'מדויק'];
    // שכבה 3 — ניקוד (רק על מילה בודדת)
    let vocalOk = null;
    if (len === 1){
      vocalOk = vocalVerdict(first, m, lookup.vocal.get(m.f));
      if (vocalOk === false) return null;             // ניקוד סותר — פסילה, ולא ממשיכים לצורה חתוכה יותר
    }
    // שכבה 1 — פועל: נפסל אלא אם הניקוד המלא זהה לשם (וַיְזָתָא)
    if (len === 1 && first.verb && !(vocalOk === true && !m.pre)) return null;
    // רב-משמעות
    let ambig = null;
    if (len === 1){
      if (lookup.cueOnly.has(m.f)) ambig = 'context';
      else if (nameGuide && AMBIG_CONTEXT.has(m.f)) ambig = 'context';
      else if ((nameGuide && AMBIG_VOCAL.has(m.f)) || (!nameGuide && NOUN_AMBIG.has(m.f)) || lookup.ambigVocal.has(m.f)) ambig = 'vocal';
    }
    let bonus = 0;
    if (ambig){ bonus -= 0.4; ev.push('רב-משמעי'); }
    if (vocalOk === true){
      if (ambig !== 'context'){ bonus += ambig === 'vocal' ? 0.45 : 0.3; ev.push('ניקוד תואם'); }
    }
    const out = entries.map(entry => {
      const viaParen = lookup.parenKeys.has(m.f) && lookup.parenKeys.get(m.f).has(entry) && len === 1;
      const isBen = len === 1 && lookup.benPart.has(m.f) && lookup.benPart.get(m.f).has(entry);
      return { cat, entry, key: m.f, form: m, base, bonus: bonus - (viaParen ? 0.2 : 0), ev: viaParen ? ev.concat('הבהרה בסוגריים') : ev.slice(), ambig, short, benPart: isBen };
    });
    // כתיב מלא של אותו שלד (תוגרמה מול תגרמה) — כפילות בדאטה, מוחזרת יחד
    if (looseForm(m.f) === m.f && lookup.loose.has(m.f)){
      lookup.loose.get(m.f).forEach(entry => {
        if (entries.indexOf(entry) >= 0) return;
        out.push({ cat, entry, key: m.f, form: m, base: 0.3, bonus: 0, ev: ['כתיב מלא/חסר'], ambig: null, short: false });
      });
    }
    return out;
  }
  // שכבה 5 — כתיב חסר כמוצא אחרון: שלד ≥5, או 4 בטקסט מנוקד
  if (len !== 1 || first.verb) return null;
  for (const m of forms){
    if (m.suf && nameGuide) continue;
    const lf = looseForm(m.f);
    if (lf.length < 4 || (lf.length === 4 && !vocalized) || !lookup.loose.has(lf)) continue;
    return lookup.loose.get(lf).map(entry => ({ cat, entry, key: lf, form: m, base: 0.3, bonus: lf.length >= 5 ? 0.15 : 0, ev: ['כתיב חסר'], ambig: null, short: false }));
  }
  return null;
}

// ---- שכבה 6א: רמזים תחביריים ----
function tokCue(toks, j){ return toks[j] ? cueForm(toks[j].c) : ''; }
function anyIn(toks, from, to, set){ for (let j = from; j <= to; j++){ if (j >= 0 && j < toks.length && set.has(tokCue(toks, j))) return true; } return false; }
function contextFor(ctx, g){
  const { toks } = ctx, i = g.i, e = g.i + g.len - 1;
  const naming = anyIn(toks, i - 3, i - 1, NAMING_CUES);
  const genBefore = anyIn(toks, i - 2, i - 1, GEN_BEFORE);
  const benneyBefore = tokCue(toks, i - 1) === 'בני' || tokCue(toks, i - 1) === 'בנות';
  const genAfter = anyIn(toks, e + 1, e + 2, GEN_AFTER);
  const collBefore = anyIn(toks, i - 2, i - 1, COLL_BEFORE);
  const subject = !!(toks[i - 1] && (toks[i - 1].verb || SUBJECT_VERBS.has(toks[i - 1].c)));
  const sage = anyIn(toks, i - 2, i - 1, SAGE_CUES);
  return { naming, genBefore, benneyBefore, genAfter, collBefore, subject, sage };
}

// מילים שבחלון (±5) — להכרעה בין ערכים שווי-שם (״X בן Y״, ״X (מלך גרר)״).
function windowWords(ctx, g){
  const s = new Set();
  for (let j = g.i - 5; j <= g.i + g.len + 4; j++){
    const t = ctx.toks[j]; if (!t || (j >= g.i && j < g.i + g.len)) continue;
    s.add(t.c); s.add(cueForm(t.c)); if (t.c.length > 3) s.add(t.c.slice(1));
  }
  return s;
}
function disambigWords(entry){
  const name = entry.name || '';
  const pm = name.match(/\(([^)]*)\)\s*$/);
  const ben = name.replace(/\s*\([^)]*\)\s*$/, '').match(/\s(?:בן|בת)\s+(.+)$/);
  const words = [];
  if (pm) words.push(...normalizeHeb(pm[1]).split(/\s+/));
  if (ben) words.push(...normalizeHeb(ben[1]).split(/\s+/));
  return words.filter(w => w.length >= 2 && !DISAMBIG_SKIP.has(w));
}

function ownsContext(ctx, g, entry){
  const { toks } = ctx;
  if (toks.length < 3) return false;
  const from = Math.max(0, g.i - 1), to = Math.min(toks.length, g.i + g.len + 1);
  let span = toks.slice(from, to);
  if (span.length < 3) span = toks.slice(Math.max(0, to - 3), Math.max(3, to));
  const needle = ' ' + span.map(t => t.c).join(' ') + ' ';
  return entryVerseText(entry).indexOf(needle) >= 0;
}

function kindOf(catId){ return catId === 'people' ? 'P' : catId === 'places' ? 'L' : catId === 'amoraim' ? 'A' : 'N'; }

// ---- שכבות 4, 6, 7: עדויות הקשר, הכרעות, ציון ----
function scoreGroups(ctx, groups){
  const { toks, source } = ctx;
  for (const g of groups){
    const cx = contextFor(ctx, g);
    g.cx = cx;
    const personCue = cx.naming || cx.genAfter || (cx.genBefore && !cx.benneyBefore) || cx.subject;
    g.personCue = personCue;
    for (const c of g.cands){
      c.score = c.base + c.bonus;
      const k = kindOf(c.cat.id);
      c.owner = ownsContext(ctx, g, c.entry);
      if (c.owner){ c.score += 0.3; c.ev.push('פסוק רשום'); }
      if (ctx.book && (c.entry.verses || []).some(v => String(v.ref || '').indexOf(ctx.book) === 0)){ c.score += 0.15; c.ev.push('אותו ספר'); }
      if (k === 'P' && (HOLY_KEYS.has(c.key) || HOLY_KEYS.has(normalizeHeb(c.form && c.form.pre ? c.form.pre + c.key : c.key)))){
        const tokV = (toks[g.i] && toks[g.i].v) || '';
        // אֶל / אַל — מילת יחס/שלילה, לעולם לא השם (ולא ערך אדם על שמו)
        const notTsere = HAS_VOWEL_RE.test(tokV) && /^[^א]*א[\u0591-\u05AF]*[ֶַ]/.test(tokV) && c.key.slice(-2) === 'אל';
        const genealogyH = cx.naming || cx.genAfter || cx.genBefore;
        if (notTsere || (!genealogyH && !c.owner)){ c.score = 0; c.cap = 0; c.ev.push('שם קדוש'); continue; }
      }
      if (k === 'P'){
        const nation = COLL_NAMES.has(c.key) || COLL_NAMES.has(normalizeHeb(c.entry.name || ''));
        const genealogy = cx.naming || cx.genAfter || (cx.genBefore && !(nation && cx.benneyBefore));
        if (genealogy){ c.score += (c.ambig === 'context' || c.ambig === 'vocal') ? 0.4 : 0.3; c.ev.push('רמז גנאלוגי'); }
        if (nation && !genealogy && !c.owner){
          // כינוי-אדם שהוא גם שם עם (ישראל→יעקב) — מוצג כ״סביר״ ולא מוסתר: המשתמש
          // מצפה לראות את יעקב כשכתוב ״ישראל״, גם אם לרוב הכוונה לעם.
          const aliasOfPerson = c.key !== normalizeHeb((c.entry.name || '').replace(/\s*\([^)]*\)\s*$/, ''));
          c.cap = aliasOfPerson ? SCORE.LIKELY : 0.45; c.ev.push('עם/ארץ');
        }
        else if (cx.collBefore && !genealogy){ c.score -= 0.3; c.ev.push('רמז קיבוצי'); }
      }
      if (k === 'L' && (cx.collBefore || cx.benneyBefore)){ c.score += 0.2; c.ev.push('רמז קיבוצי'); }
      if (k === 'A' && g.len === 1){
        if (cx.sage){ c.score += 0.3; c.ev.push('רמז חכם'); } else { c.score -= 0.3; c.ev.push('בלי רמז חכם'); }
        if (source === 'מקרא'){ c.score -= 0.4; c.ev.push('חכם במקרא'); }
      }
      if (source === 'מקרא' && /חז״ל|חז"ל/.test(c.entry.name || '')){ c.score -= 0.4; c.ev.push('ערך חז״ל במקרא'); }
    }
  }
  // רשימת שמות — ≥3 קבוצות רצופות שבכל אחת מועמד-אדם (וָמַשׁ, וְחָם)
  let run = [];
  const flush = () => {
    if (run.length >= 3) run.forEach(g => g.cands.forEach(c => { if (kindOf(c.cat.id) === 'P'){ c.score += (c.ambig ? 0.4 : 0.3); c.ev.push('רשימת שמות'); } }));
    run = [];
  };
  for (const g of groups){
    const hasP = g.cands.some(c => kindOf(c.cat.id) === 'P' && (c.base + c.bonus) > 0.15);
    if (hasP && run.length && run[run.length - 1].i + run[run.length - 1].len === g.i) run.push(g);
    else { flush(); if (hasP) run.push(g); }
  }
  flush();
  // שם בן 2 אותיות עם תחילית — רק עם עדות (ניקוד מאמת + רשימה/רמז)
  // (מטופל בציון הבסיס הנמוך; הרמזים למעלה הם שמעלים אותו)

  for (const g of groups){
    // ״X״ מתוך ״X בן Y״ — מוצג רק עם עדות (Y בחלון, או הפסוק רשום תחתיו)
    const ww0 = windowWords(ctx, g);
    g.cands.forEach(c => {
      if (!c.benPart || c.owner) return;
      if (disambigWords(c.entry).some(w => ww0.has(w))){ c.score += 0.2; c.ev.push('בן Y בחלון'); c.disamb = true; }
      else { c.cap = 0.45; c.ev.push('X מתוך X בן Y'); }
    });
    // שכבה 4.2 — שווי-שם באותו מדריך
    const byCat = new Map();
    g.cands.forEach(c => { if (!byCat.has(c.cat.id)) byCat.set(c.cat.id, []); byCat.get(c.cat.id).push(c); });
    byCat.forEach(list => {
      if (list.length < 2) return;
      let primary = list.filter(c => c.owner);
      if (!primary.length){
        const ww = windowWords(ctx, g);
        primary = list.filter(c => disambigWords(c.entry).some(w => ww.has(w)));
      }
      if (!primary.length) primary = list.filter(c => normalizeHeb(c.entry.name || '') === c.key);
      if (!primary.length) primary = list.filter(c => !c.benPart);
      if (!primary.length){
        const maxV = Math.max(...list.map(c => (c.entry.verses || []).length));
        primary = list.filter(c => (c.entry.verses || []).length === maxV).slice(0, 1);
      }
      list.forEach(c => { if (primary.indexOf(c) < 0){ c.cap = 0.45; c.ev.push('שווה-שם משני'); } });
    });
    // התנגשות בין מדריכים על אותו טוקן (שכם: אדם/מקום · נחש: אדם/בע״ח)
    const kinds = new Set(g.cands.map(c => kindOf(c.cat.id)));
    if (kinds.size > 1){
      const owners = new Set(g.cands.filter(c => c.owner).map(c => kindOf(c.cat.id)));
      let win;
      if (owners.size) win = owners;
      else {
        const cx = g.cx, prefixed = g.cands.some(c => c.form.pre && /[במהל]$/.test(c.form.pre));
        if (kinds.has('P') && g.personCue && !cx.collBefore) win = new Set(['P']);
        else if (kinds.has('L') && (cx.collBefore || prefixed || !kinds.has('N'))) win = new Set(['L']);
        else if (kinds.has('N')) win = new Set(['N']);
        else if (kinds.has('A') && g.cx.sage) win = new Set(['A']);
        else win = new Set([...kinds].slice(0, 1));
        // שם עם רמז אדם גובר גם על אנשים-מהתלמוד במקרא
        if (kinds.has('A') && kinds.has('P') && !g.cx.sage) win = new Set(['P']);
      }
      g.cands.forEach(c => { if (!win.has(kindOf(c.cat.id))){ c.cap = 0.45; c.ev.push('התנגשות מדריכים'); } });
    }
  }
}

async function identify(rawText, opts){
  opts = opts || {};
  const allowStopwords = opts.allowStopwords || null;
  const toks = tokenizeHebPairs(rawText);
  if (!toks.length) return [];
  if (opts.vocalizedText) applyLiveVocalization(toks, opts.vocalizedText);
  const source = detectSource(rawText, opts);
  const vocalized = toks.some(t => HAS_VOWEL_RE.test(t.v));
  toks.forEach(t => { t.verb = vocalized && isVerbToken(t); t.fw = !HAS_VOWEL_RE.test(t.v) && TALMUD_FW.has(t.c); });
  const ctx = { toks, source, vocalized, allowStopwords, book: (opts.source && opts.source.book) || '' };

  const catLookups = [];
  for (const cat of CATEGORIES) if (!cat.noIdentify) catLookups.push({ cat, lookup: await getLookup(cat) });

  // סריקה חמדנית אחת על פני כל המדריכים — הצירוף הארוך ביותר שיש לו התאמה
  // במדריך כלשהו קובע את המיקום הבא (״רבי יהושע בן לוי״ לא נבלע ב״יהושע״).
  const groups = [];
  let i = 0;
  while (i < toks.length){
    let found = null;
    for (let len = Math.min(MAX_WINDOW, toks.length - i); len >= 1; len--){
      const w0 = toks[i];
      if (len === 1){
        const n = w0.c;
        if (STOPWORDS.has(n) && !(allowStopwords && allowStopwords.has(n))) break;
        if (w0.fw) break;
      } else if (w0.verb) continue;
      const cands = [];
      for (const { cat, lookup } of catLookups){
        const m = matchWindow(ctx, i, len, cat, lookup);
        if (m) cands.push(...m);
      }
      if (cands.length){ found = { i, len, cands }; break; }
    }
    if (found){
      groups.push(found);
      // שכבה 4.1 — שרשרת יחוס: אחרי ״X בן Y״ ממשיכים מ-Y, כדי ש״בן־גלעד בן־מיכאל
      // בן־ישישי״ יחזיר גם את מיכאל בן ישישי.
      const L = found.len;
      i += (L >= 3 && /^(בן|בת)$/.test(toks[i + L - 2].c)) ? L - 1 : L;
    } else i++;
  }

  scoreGroups(ctx, groups);

  const floor = opts.includePossible ? SCORE.FLOOR : SCORE.LIKELY;
  const best = new Map(); // catId|name -> result
  for (const g of groups){
    for (const c of g.cands){
      const s = Math.max(0, Math.min(1, c.score, c.cap === undefined ? 1 : c.cap));
      if (s < floor) continue;
      const key = c.cat.id + '|' + c.entry.name;
      const prev = best.get(key);
      if (prev && prev.score >= s) continue;
      best.set(key, {
        catId: c.cat.id, catLabel: c.cat.label, catIcon: c.cat.icon, name: c.entry.name, term: c.entry.name,
        entry: c.entry, matchedVia: toks.slice(g.i, g.i + g.len).map(t => t.c).join(' '),
        score: Math.round(s * 100) / 100, confidence: confidenceOf(s), evidence: c.ev,
      });
    }
  }
  const results = Array.from(best.values());

  // חיפוש גם בתוך דפי ה-HTML המותאמים שנשמרו (תוכן טקסטואלי בלבד, אחרי הסרת תגיות).
  const customMatches = await identifyInCustomPages(normalizeHeb(rawText));
  results.push(...customMatches);

  return results;
}


// בודקת אם רצף הטוקנים needle מופיע ברצף (ובסדר) בתוך haystack - התאמת
// טוקנים מלאה, לא substring גולמי. משתמשת ב-tokenizeHeb, בדיוק כמו הפירוק
// שהמנוע הראשי עושה לטקסט הנבחר לפני חיפוש ב-lookup.
function containsTokenSequence(haystack, needle){
  if (!needle.length || needle.length > haystack.length) return false;
  outer: for (let i = 0; i <= haystack.length - needle.length; i++){
    for (let j = 0; j < needle.length; j++){
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}

// היה plain.includes(normalizedText) - substring גולמי. שני כשלים: (א) מילה קצרה
// כמו "עוד" נתפסת כ-substring כמעט בכל דף (למשל בתוך "לעודד"), זיהוי שווא שלחיצה
// עליו לא "פותחת" כלום. (ב) חיפוש רב-מילים כמעט אף פעם לא תואם בגלל רווחים/פיסוק
// שונים בין הטקסט הנבחר לתוכן הדף. פתרון: פירוק שני הצדדים לטוקנים (tokenizeHeb,
// כמו במנוע הראשי) והתאמת רצף טוקנים מלא במקום substring של תווים.
async function identifyInCustomPages(normalizedText){
  const searchTokens = tokenizeHeb(normalizedText);
  if (!searchTokens.length) return [];
  const index = await getHtmlPagesIndex();
  const results = [];
  for (const page of index){
    const name = page.name;
    const content = await getHtmlPageContent(name);
    if (!content) continue;
    const plain = normalizeHeb(content.replace(/<[^>]*>/g, ' '));
    const pageTokens = tokenizeHeb(plain);
    if (containsTokenSequence(pageTokens, searchTokens)){
      results.push({ catId: 'custom', catLabel: 'דף מותאם', catIcon: '➕', name: name, term: name });
    }
  }
  return results;
}
