// הגדרות תצוגה: ערכת צבעים, גופן, גודל טקסט וצפיפות.
// נוצר בפיצול router.js (גרסה 2.11.2). המקור: shell/router.js שורות 2372-2571.
// אין להפוך ל-type="module" — כל הקבצים חולקים scope גלובלי אחד.


// ============================================================
//  הגדרות תצוגה — ערכת צבעים, גופן, גודל טקסט, צפיפות
//  ברירת המחדל ("קלאסי") היא בדיוק המראה שהיה כאן קודם; שאר
//  הערכות רק דורסות משתני CSS, בלי לשנות שום כלל עיצוב אחר.
// ============================================================
const PREFS_KEY = 'madaei_hatanach_ui_prefs_v1';
// pubEvents/pubChurban/pubAhead/pubBack — פרסום ליומן של אוצריא. ברירות המחדל
// 4.16.1: כבויות כברירת מחדל (בקשת בעלת הפרויקט — יש למי שזה מפריע); מפעילים בהגדרות.
const DEFAULT_PREFS = { theme: 'otzaria', font: 'otzaria', scale: 100, density: 'normal', cardImg: true, entrySide: true, filtersSide: false, resultsPopup: false, divineName: 'he',
  pubEvents: false, pubChurban: false, pubAhead: 365, pubBack: 7, shemMode: 'hyphen', shemScope: 'all', shemAggr: true };
let uiPrefs = Object.assign({}, DEFAULT_PREFS);
let otzariaTheme = null; // ה-theme האחרון שהתקבל מאוצריא (boot / theme.changed)

const FONT_STACKS = {
  default: "'Heebo', Arial, sans-serif",
  frank:   "'Frank Ruhl Libre', 'David', serif",
  david:   "'David', 'Times New Roman', serif",
  // #58 — במקום אריאל וטיימס (גופנים לטיניים; הניקוד יושב בהם לא במקום):
  taamey:  "'Taamey Frank CLM', 'TaameyFrankCLM', 'David', serif",
  shofar:  "'Shofar', 'David', serif"
};
// #58 — הגופן שכל אפשרות דורשת בפועל, לבדיקה אם הוא מותקן (״כמו באוצריא״ — תמיד זמין)
const FONT_REQUIRES = { default: 'Heebo', frank: 'Frank Ruhl Libre', david: 'David', taamey: 'Taamey Frank CLM', shofar: 'Shofar' };
// בחירות ישנות שהוסרו מהרשימה חוזרות ל״כמו באוצריא״
const RETIRED_FONTS = { arial: true, times: true };

// #58 — האם גופן מותקן: קודם הרשימה של אוצריא (fonts.listInstalled, 0.9.97),
// ובלעדיה מדידה ב-canvas — רוחב מחרוזת בגופן המבוקש מול גופן נפילה; שונה = מותקן.
let _installedFonts = null;
async function installedFontSet(){
  if (_installedFonts) return _installedFonts;
  try {
    if (window.Otzaria && Otzaria.call){
      const res = await Otzaria.call('fonts.listInstalled');
      const d = res && (res.data !== undefined ? res.data : res);
      if (d && Array.isArray(d.families) && d.families.length){
        _installedFonts = new Set(d.families.map(f => String(f.name || f).toLowerCase()));
        return _installedFonts;
      }
    }
  } catch(e){}
  return null;
}
function fontLooksInstalled(name){
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    const probe = 'אבגדהוזחט שלום עולם mmmmmmmmmmlli 0123';
    return ['monospace', 'serif', 'sans-serif'].some(base => {
      ctx.font = '72px ' + base; const w0 = ctx.measureText(probe).width;
      ctx.font = "72px '" + name + "', " + base; return ctx.measureText(probe).width !== w0;
    });
  } catch(e){ return true; }   // אי אפשר לבדוק — לא חוסמים
}
async function markInstalledFonts(){
  const sel = document.getElementById('setFontSelect');
  if (!sel) return;
  const set = await installedFontSet();
  Array.from(sel.options).forEach(o => {
    const need = FONT_REQUIRES[o.value];
    if (!need) return;
    const ok = set ? (set.has(need.toLowerCase()) || set.has(need.replace(/\s+/g, '').toLowerCase())) : fontLooksInstalled(need);
    if (!o.dataset.label) o.dataset.label = o.textContent;
    o.disabled = !ok && o.value !== sel.value;
    o.textContent = o.dataset.label + (ok ? '' : ' — לא מותקן במחשב');
  });
}
const DENSITY = { compact: ['170px','9px'], normal: ['200px','12px'], roomy: ['250px','18px'] };

// כל המשתנים שערכת "תואם לאוצריא" מזריקה — נשמרים כדי שאפשר יהיה לנקות אותם
// בחזרה לערכה אחרת (אחרת ערכים ישנים היו נדבקים ל-<html> לנצח).
const OTZ_VARS = ['--color-surface-container','--color-surface-container-low','--color-on-surface-variant','--color-primary','--color-on-primary','--color-secondary','--color-on-secondary',
  '--color-surface','--color-on-surface','--color-surface-container-highest','--color-error',
  '--color-on-error','--color-outline','--color-primary-subtle','--color-secondary-subtle',
  '--color-secondary-container','--color-on-secondary-container',
  '--color-bg','--color-surface-2','--color-surface-3','--color-outline-faint',
  '--color-on-surface-dim','--color-on-surface-faint','--color-on-surface-ghost','--color-link',
  '--color-btn','--color-on-btn','--color-btn-hover','--color-hover','--color-scrim',
  '--color-scrim-light','--color-shadow','--color-shadow-strong','--color-glow','--color-map-bg'];

function hexToRgba(hex, alpha){
  const h = String(hex || '').replace('#','');
  if (h.length < 6) return 'rgba(0,0,0,' + alpha + ')';
  const off = h.length === 8 ? 2 : 0; // תמיכה ב-#AARRGGBB שפלאטר מחזירה לעתים
  const r = parseInt(h.slice(off, off+2), 16);
  const g = parseInt(h.slice(off+2, off+4), 16);
  const b = parseInt(h.slice(off+4, off+6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}
function normHex(hex){
  const h = String(hex || '').replace('#','');
  return h.length === 8 ? '#' + h.slice(2) : '#' + h;
}

function loadPrefs(){
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) uiPrefs = Object.assign({}, DEFAULT_PREFS, JSON.parse(raw));
  } catch(e){}
  if (!(uiPrefs.scale >= 85 && uiPrefs.scale <= 125)) uiPrefs.scale = 100;
}
function savePrefs(){
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(uiPrefs)); } catch(e){}
  // גיבוי בזיכרון של אוצריא, כדי שההגדרות ישרדו גם ניקוי של אחסון הדפדפן
  if (hasOtzaria()) storageSet(PREFS_KEY, uiPrefs);
}

function applyPrefs(){
  document.body.classList.toggle('filters-side', !!uiPrefs.filtersSide);
  const root = document.documentElement;

  // --- ערכת צבעים ---
  const usingOtz = uiPrefs.theme === 'otzaria' && otzariaTheme && otzariaTheme.colorScheme;
  OTZ_VARS.forEach(v => root.style.removeProperty(v));
  if (uiPrefs.theme === 'dark' || uiPrefs.theme === 'plain') root.setAttribute('data-theme', uiPrefs.theme);
  else if (usingOtz) root.setAttribute('data-theme', 'otzaria');
  else root.removeAttribute('data-theme');

  if (usingOtz){
    const cs = otzariaTheme.colorScheme;
    const dark = otzariaTheme.mode === 'dark';
    const set = (k, v) => root.style.setProperty(k, v);
    // תפקידי הצבע הרשמיים של M3, ישירות מה-API
    set('--color-primary',      normHex(cs.primary));
    set('--color-on-primary',   normHex(cs.onPrimary));
    set('--color-secondary',    normHex(cs.secondary || cs.primary));
    set('--color-on-secondary', normHex(cs.onSecondary || cs.onPrimary));
    set('--color-surface',      normHex(cs.surface));
    set('--color-on-surface',   normHex(cs.onSurface));
    set('--color-surface-container-highest', normHex(cs.surfaceContainerHighest || cs.surface));
    // הגוון המדויק של הסרגל העליון ב-AppTopBar של אוצריא. DESIGN_GUIDE דורש אותו
    // במפורש לסרגל של התוסף — "המשתמש עובר מטאב של ספר לטאב של תוסף ורואה את אותו
    // פס באותו צבע". זה *לא* surfaceContainerHighest, שהוא גוון אחד מעל.
    set('--color-surface-container-high', normHex(cs.surfaceContainerHigh || cs.surfaceContainerHighest || cs.surface));
    set('--color-error',        normHex(cs.error || cs.secondary || cs.primary));
    set('--color-on-error',     normHex(cs.onError || cs.onPrimary));
    set('--color-outline',      hexToRgba(cs.outline, .55));
    // נגזרים (M3 מגדיר צבעי Container שאינם ב-API — מקרבים אותם בשקיפות)
    set('--color-primary-subtle',   hexToRgba(cs.primary, .12));
    set('--color-secondary-subtle', hexToRgba(cs.secondary || cs.primary, .16));
    // 3.1.0 — תפקידי M3 אמיתיים כשהם מגיעים מה-API; אחרת נגזרת בשקיפות, כמו
    // שאר ה-Container שאוצריא אינה מוסרת. משמשים את .book-choice (בורר הספר).
    set('--color-secondary-container',
      cs.secondaryContainer ? normHex(cs.secondaryContainer) : hexToRgba(cs.secondary || cs.primary, dark ? .22 : .18));
    set('--color-on-secondary-container',
      cs.onSecondaryContainer ? normHex(cs.onSecondaryContainer) : normHex(cs.onSurface));
    set('--color-bg',               normHex(cs.surface));
    set('--color-surface-2',        normHex(cs.surfaceContainerHighest || cs.surface));
    set('--color-surface-3',        hexToRgba(cs.surfaceContainerHighest || cs.surface, .55));
    set('--color-outline-faint',    hexToRgba(cs.outline, .32));
    set('--color-on-surface-dim',   hexToRgba(cs.onSurface, .78));
    set('--color-on-surface-faint', hexToRgba(cs.onSurface, .62));
    set('--color-on-surface-ghost', hexToRgba(cs.onSurface, .45));
    set('--color-link',             normHex(cs.primary));
    set('--color-btn',              normHex(cs.primary));
    set('--color-on-btn',           normHex(cs.onPrimary));
    set('--color-btn-hover',        hexToRgba(cs.primary, .84));
    set('--color-hover',            hexToRgba(cs.primary, .10));
    set('--color-scrim',            dark ? 'rgba(0,0,0,.68)' : 'rgba(20,16,10,.55)');
    set('--color-scrim-light',      dark ? 'rgba(0,0,0,.55)' : 'rgba(0,0,0,.35)');
    set('--color-shadow',           dark ? 'rgba(0,0,0,.45)' : 'rgba(0,0,0,.08)');
    set('--color-shadow-strong',    dark ? 'rgba(0,0,0,.55)' : 'rgba(0,0,0,.18)');
    set('--color-glow',             dark ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,0)');
    set('--color-surface-container',     normHex(cs.surfaceContainer || cs.surfaceContainerHigh || cs.surface));
    set('--color-surface-container-low', normHex(cs.surfaceContainerLow || cs.surface));
    set('--color-on-surface-variant',    normHex(cs.onSurfaceVariant || cs.onSurface));
    set('--color-map-bg',           hexToRgba(cs.surfaceContainerHighest || cs.surface, 1));
  }

  // --- גופן ---
  if (RETIRED_FONTS[uiPrefs.font]) uiPrefs.font = 'otzaria';
  let stack = FONT_STACKS[uiPrefs.font] || FONT_STACKS.default;
  if (uiPrefs.font === 'otzaria'){
    const fam = otzariaTheme && otzariaTheme.typography && otzariaTheme.typography.fontFamily;
    stack = fam ? ("'" + fam + "', 'David', serif") : FONT_STACKS.default;
  }
  root.style.setProperty('--font-main', stack);
  // 5.0.0 — קו עיצוב חדש: גופן ממשק נפרד מגופן הקריאה (DESIGN_GUIDE: uiFontFamily ≠ fontFamily)
  const uiFam = otzariaTheme && otzariaTheme.typography && otzariaTheme.typography.uiFontFamily;
  if (uiFam) root.style.setProperty('--font-ui', "'" + uiFam + "', 'Rubik', system-ui, sans-serif");
  else root.style.removeProperty('--font-ui');

  // --- גודל טקסט (בשליטת המשתמש בלבד — לא נגזר מגודל הקריאה של אוצריא,
  //     שהוא גדול בהרבה ממה שמתאים לממשק כזה) ---
  root.style.setProperty('--ui-scale', String(uiPrefs.scale / 100));

  // --- צפיפות ---
  const d = DENSITY[uiPrefs.density] || DENSITY.normal;
  root.style.setProperty('--card-min', d[0]);
  root.style.setProperty('--card-pad', d[1]);

  // --- תמונות בכרטיסים ---
  root.setAttribute('data-cardimg', uiPrefs.cardImg ? 'on' : 'off');

  syncSettingsUI();
}

const isOn  = el => el && el.getAttribute('aria-checked') === 'true';
const setOn = (el, v) => el && el.setAttribute('aria-checked', v ? 'true' : 'false');

function syncSettingsUI(){
  const mark = (groupId, val) => {
    const g = document.getElementById(groupId);
    if (!g) return;
    // 3.2.4 — קבוצה יכולה להיות segmented (כפתורים) או dropdown (select)
    const sel = g.querySelector('select');
    if (sel){ sel.value = val; return; }
    g.querySelectorAll('.set-opt').forEach(b => b.classList.toggle('active', b.dataset.val === val));
  };
  mark('setUiLang', uiPrefs.uiLang || 'auto');
  mark('setTheme', uiPrefs.theme);
  mark('setFont', uiPrefs.font);
  mark('setDensity', uiPrefs.density);
  mark('setDivine', uiPrefs.divineName || 'he');
  mark('setShemMode', uiPrefs.shemMode || 'hyphen');
  mark('setShemScope', uiPrefs.shemScope || 'all');
  const sa = document.getElementById('setShemAggr');
  if (sa) setOn(sa, uiPrefs.shemAggr !== false);
  updateDivinePreview();
  const pe = document.getElementById('setPubEvents');
  if (pe) setOn(pe, uiPrefs.pubEvents === true);
  const pc = document.getElementById('setPubChurban');
  if (pc) setOn(pc, uiPrefs.pubChurban === true);
  const pa = document.querySelector('#setPubAhead select');
  if (pa) pa.value = String(uiPrefs.pubAhead != null ? uiPrefs.pubAhead : 365);
  const pb = document.querySelector('#setPubBack select');
  if (pb) pb.value = String(uiPrefs.pubBack != null ? uiPrefs.pubBack : 7);
  const sc = document.getElementById('setScale');
  const scv = document.getElementById('setScaleVal');
  if (sc) sc.value = uiPrefs.scale;
  if (scv) scv.textContent = uiPrefs.scale + '%';
  const ci = document.getElementById('setCardImg');
  if (ci) setOn(ci, !!uiPrefs.cardImg);
  const es = document.getElementById('setEntrySide');
  if (es) setOn(es, uiPrefs.entrySide !== false);
  const fs0 = document.getElementById('setFiltersSide');
  if (fs0) setOn(fs0, !!uiPrefs.filtersSide);
  const rp0 = document.getElementById('setResultsPopup');
  if (rp0) setOn(rp0, !!uiPrefs.resultsPopup);
}

function setPref(key, val){
  uiPrefs[key] = val;
  savePrefs();
  applyPrefs();
  if (key === 'divineName' || key === 'shemMode' || key === 'shemScope'){ syncSettingsUI(); }
  // #94 — בחירת שפה ידנית: אוצריא עדיין מחזירה he-IL קבוע (Otzaria#758 טרם שוחרר).
  // מעבר לאנגלית חל מיד; חזרה לעברית/אוטומטי דורשת טעינה מחדש (התרגום מחליף טקסט במקום).
  if (key === 'uiLang'){
    if (val === 'en' && typeof setLanguage === 'function') setLanguage('en');
    else if (typeof I18N !== 'undefined' && I18N.dict) location.reload();
  }
}

// #58 — תצוגה מקדימה של שם ה׳ לפי הבחירה (אותה maskDivineName של הכרטיסים)
function updateDivinePreview(){
  const el = document.getElementById('setPreviewVerse');
  if (el && typeof maskDivineName === 'function') el.textContent = maskDivineName('וַיֹּאמֶר יְהוָה אֶל אַבְרָם לֶךְ לְךָ מֵאַרְצְךָ וּמִמּוֹלַדְתְּךָ.');
}

// ---- הנקדן המקומי (2.17.2) ----
// "הנקדן" הוא תוסף אוצריא נפרד (לא קובץ הפעלה עצמאי), לא מורד מאתר חיצוני.
// ⚠️ 31.8.26, מהמשתמש: **הנקדן מעולם לא פורסם בחנות התוספים.** לכן
// הקישור העיקרי הוא פוסט הפורום, והוא גם מה שכפתור ההעתקה מעתיק מעתה — עד
// כאן הוא העתיק דווקא את NAKDAN_STORE_URL, כלומר באופליין (שבו כפתורי
// הפתיחה מוסתרים) נשאר ביד המשתמש הקישור הלא-נכון בלבד. קישור החנות
// נשאר כמשני, למקרה שיתפרסם שם בעתיד (הועתק מ-index.html של "שומר השם").
// NAKDAN_FORUM_URL הוא הקישור הישיר לפוסט שבו הנקדן פורסם בפועל (מהמשתמש,
// 13.8.26) - עדיף על קישור הנושא הכללי שהיה כאן קודם. otzaria.org לא צריך
// להתווסף ל-network.allowlist: app.openUrl מוסר לדפדפן המערכת ואינו fetch
// מתוך ה-webview (כך גם ב-שומר השם עצמו).
const NAKDAN_STORE_URL = 'https://otzaria.org/plugins';
const NAKDAN_FORUM_URL = 'https://otzaria.org/forum/post/31275';

// מצב החיבור מתעדכן ברקע (NikudEngine.watch ב-bridge.js). הפאנל מרענן בכל פתיחה,
// ולכן אין צורך במאזין - מספיק לקרוא את המצב האחרון בכל openSettings.
function syncNikudSettings(){
  const el = document.getElementById('setNikudStatus');
  if (!el) return;
  const connected = !!(window.NikudEngine && NikudEngine.isConnected());
  el.textContent = connected
    ? '🟢 מחובר — הזיהוי ההקשרי פעיל'
    : '⚪ לא מחובר — הזיהוי פועל כרגיל, בלי ההבחנה לפי ניקוד';
  el.classList.toggle('on', connected);
  // כפתורי הפתיחה מוסתרים כשאין רשת (אז נשארת ההעתקה בלבד, למי שיתקין ממחשב
  // אחר) - אותו דפוס נעילת-רשת של refs.js. שורת הכפתורים עצמה תמיד מוצגת -
  // הקישורים ידועים, לא תלויים בהגדרה שממתינה למילוי.
  const offline = typeof isOnline !== 'undefined' && !isOnline;
  ['setNikudOpen', 'setNikudForum'].forEach(id => {
    const b = document.getElementById(id);
    if (b) b.style.display = offline ? 'none' : '';
  });
  // באופליין נשארת רק ההעתקה, וה-clipboard חסום בחלק מגרסאות ה-WebView.
  // לכן מוצגת שם גם הכתובת עצמה, כטקסט נבחר שאפשר לסמן ולהעתיק ביד.
  const urlEl = document.getElementById('setNikudUrl');
  if (urlEl){
    urlEl.textContent = NAKDAN_FORUM_URL;
    urlEl.style.display = offline ? '' : 'none';
  }
}

function wireNikudSettings(){
  const openBtn = document.getElementById('setNikudOpen');
  if (openBtn) openBtn.addEventListener('click', () => confirmOpenExternal(NAKDAN_STORE_URL));
  const forumBtn = document.getElementById('setNikudForum');
  if (forumBtn) forumBtn.addEventListener('click', () => confirmOpenExternal(NAKDAN_FORUM_URL));
  // מעתיק את קישור הפורום ולא את קישור החנות — הנקדן לא פורסם בחנות.
  const copyBtn = document.getElementById('setNikudCopy');
  if (copyBtn) copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(NAKDAN_FORUM_URL);
      copyBtn.textContent = '✓ הועתק';
      setTimeout(() => { copyBtn.textContent = '📋 העתקת קישור הפורום'; }, 1800);
    } catch(e){ uiPrompt('העתיקו את קישור הפורום:', NAKDAN_FORUM_URL); }
  });
}

function openSettings(){
  document.getElementById('settingsScrim').classList.add('open');
  document.getElementById('settingsPanel').classList.add('open');
  syncSettingsUI();
  syncNikudSettings();
  markInstalledFonts();   // #58
  // 3.2.6 — נבדק בכל פתיחה ולא פעם אחת בטעינה: הגשר של אוצריא אינו בהכרח
  // מוכן ברגע שהסקריפט רץ, ואז הקבוצה נשארה מוסתרת לתמיד.
  if (typeof refreshShortcutGroup === 'function') refreshShortcutGroup();
}
function closeSettings(){
  document.getElementById('settingsScrim').classList.remove('open');
  document.getElementById('settingsPanel').classList.remove('open');
}

function wireSettings(){
  wireNikudSettings();
  const btn = document.getElementById('settingsBtn');
  if (btn) btn.addEventListener('click', openSettings);
  const x = document.getElementById('settingsCloseBtn');
  if (x) x.addEventListener('click', closeSettings);
  const scrim = document.getElementById('settingsScrim');
  if (scrim) scrim.addEventListener('click', closeSettings);

  [['setUiLang','uiLang'], ['setTheme','theme'], ['setFont','font'], ['setDensity','density'], ['setDivine','divineName'], ['setShemMode','shemMode'], ['setShemScope','shemScope']].forEach(([id, key]) => {
    const g = document.getElementById(id);
    if (!g) return;
    const sel = g.querySelector('select');
    if (sel){ sel.addEventListener('change', () => setPref(key, sel.value)); return; }
    g.addEventListener('click', (e) => {
      const b = e.target.closest('.set-opt');
      if (b) setPref(key, b.dataset.val);
    });
  });

  const sc = document.getElementById('setScale');
  if (sc) sc.addEventListener('input', () => setPref('scale', parseInt(sc.value, 10) || 100));

  const sa = document.getElementById('setShemAggr');
  if (sa) sa.addEventListener('click', () => { const next = !isOn(sa); setOn(sa, next); setPref('shemAggr', next); });

  const ci = document.getElementById('setCardImg');
  if (ci) ci.addEventListener('click', () => {
    const next = !isOn(ci);
    setOn(ci, next);
    setPref('cardImg', next);
  });

  // 5.3.0 — כרטיס ערך בחלונית צד (ברירת מחדל) או בחלון קופץ כמו קודם
  const es = document.getElementById('setEntrySide');
  if (es) es.addEventListener('click', () => { const next = !isOn(es); setOn(es, next); setPref('entrySide', next); });
  const rpb = document.getElementById('setResultsPopup');
  if (rpb) rpb.addEventListener('click', () => { const next = !isOn(rpb); setOn(rpb, next); setPref('resultsPopup', next); });
  // 5.4.0 — סינון בעמודה בצד
  const fsb = document.getElementById('setFiltersSide');
  if (fsb) fsb.addEventListener('click', () => { const next = !isOn(fsb); setOn(fsb, next); setPref('filtersSide', next); document.body.classList.toggle('filters-side', next); });

  // 3.2.7 — פרסום ליומן. אחרי כל שינוי חייבים לאפס את חותמת ההרצה היומית
  // ולהריץ מחדש: ה-throttle היומי היה משאיר ביומן את מה שכבר פורסם עד מחר,
  // והמשתמש היה מכבה ולא רואה שום שינוי. ההרצה עצמה היא גם מה שמוחק —
  // הלולאה על המפתחות הקודמים מסירה כל מה שאינו ברשימה החדשה.
  // הפרסום עצמו רץ **מיד** בכל שינוי — לא בהפעלה הבאה של אוצריא. עד 3.2.8 זה
  // קרה בשקט מוחלט, ולכן לא הייתה שום דרך לדעת שזה עבד; החיווי כאן הוא כל
  // ההבדל. הכפתור "החל כעת" הוא אותה פעולה בדיוק, למקרה שמישהו רוצה לכפות
  // ריענון בלי לשנות הגדרה.
  const pubStatus = () => document.getElementById('setPubStatus');
  let pubBusy = false;
  const republishCalendar = async () => {
    if (pubBusy) return;
    pubBusy = true;
    const el = pubStatus();
    const btn = document.getElementById('setPubApplyBtn');
    if (el) el.textContent = 'מעדכן את היומן…';
    if (btn) btn.disabled = true;
    try {
      try { await storageSetJson(PUBLISH_LAST_RUN_KEY, null); } catch(e){}
      if (typeof publishUpcomingEvents === 'function') await publishUpcomingEvents();
      if (el) el.textContent = 'היומן עודכן ✓';
    } catch(e){
      if (el) el.textContent = 'העדכון נכשל';
    } finally {
      pubBusy = false;
      if (btn) btn.disabled = false;
      // ההודעה נעלמת מעצמה — היא חיווי רגעי, לא מצב קבוע
      setTimeout(() => { const e2 = pubStatus(); if (e2 && e2.textContent !== 'מעדכן את היומן…') e2.textContent = ''; }, 4000);
    }
  };
  const applyBtn = document.getElementById('setPubApplyBtn');
  if (applyBtn) applyBtn.addEventListener('click', republishCalendar);
  const peW = document.getElementById('setPubEvents');
  if (peW) peW.addEventListener('click', () => {
    const next = !isOn(peW);
    setOn(peW, next);
    setPref('pubEvents', next);
    republishCalendar();
  });
  const pcW = document.getElementById('setPubChurban');
  if (pcW) pcW.addEventListener('click', () => {
    const next = !isOn(pcW);
    setOn(pcW, next);
    setPref('pubChurban', next);
    republishCalendar();
  });
  const paW = document.querySelector('#setPubAhead select');
  if (paW) paW.addEventListener('change', () => { setPref('pubAhead', parseInt(paW.value, 10)); republishCalendar(); });
  const pbW = document.querySelector('#setPubBack select');
  if (pbW) pbW.addEventListener('change', () => { setPref('pubBack', parseInt(pbW.value, 10)); republishCalendar(); });

  const reset = document.getElementById('settingsReset');
  if (reset) reset.addEventListener('click', () => {
    uiPrefs = Object.assign({}, DEFAULT_PREFS);
    savePrefs();
    applyPrefs();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSettings();
  });
}

// החלת ההגדרות מיידית בטעינה (לפני שאוצריא בכלל זמינה) — מונע הבהוב.
loadPrefs();
applyPrefs();
wireSettings();


// ============================================================
//  קיצור דרך לשולחן העבודה (3.2.3)
//  ✅ 4.10.1: ההרשאה `ui.create_shortcut` מוצהרת במניפסט (באישור בעל הפרויקט). שם
//  המתודה מורכב ממערך דרך callIfSupported (shell/core.js) — אותו דפוס בדיוק
//  כמו feedback.report — כך שהמחרוזת אינה ליטרל בקוד, האריזה אינה נחסמת,
//  ובגרסה/הרשאה שאינה תומכת הקריאה פשוט לא נשלחת והקבוצה נשארת מוסתרת.
// ============================================================
let shortcutWired = false;
function refreshShortcutGroup(){
  const group = document.getElementById('setShortcutGroup');
  const btn = document.getElementById('setShortcutBtn');
  if (!group || !btn) return;

  // הקבוצה מוצגת רק כשיש אוצריא. אין דרך לדעת מראש אם ההרשאה ניתנה — ננסה
  // בלחיצה, ואם נדחה נסתיר את הקבוצה כדי לא להשאיר כפתור מת.
  if (!hasOtzaria()) { group.hidden = true; return; }
  // #41 (4.9.0) — הכפתור הוצג תמיד, ובלחיצה הקריאה נדחתה (ההרשאה אינה מוצהרת בבסיס)
  // והקבוצה פשוט נעלמה — ״כפתור שלא עושה כלום״. עכשיו מציגים אותו רק כשאוצריא
  // מאשרת שההרשאה אכן ניתנה (app.getGrantedPermissions, 0.9.89, בלי הרשאה נוספת).
  shortcutPermissionGranted().then(granted => {
    group.hidden = !granted;
    if (granted) wireShortcutBtn(group, btn);
  });
}

async function shortcutPermissionGranted(){
  const res = await callIfSupported(['app', 'getGrantedPermissions'], '0.9.89', {});
  if (res == null) return false;
  let list = res && (res.data !== undefined ? res.data : res);
  if (list && !Array.isArray(list)) list = list.permissions || list.granted || [];
  return Array.isArray(list) && list.indexOf('ui.create_shortcut') !== -1;
}

function wireShortcutBtn(group, btn){
  if (shortcutWired) return;
  shortcutWired = true;

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = 'יוצר…';
    try {
      // אוצריא מצפה ל-label (לא name) ול-location; מינימום 0.9.94
      const res = await callIfSupported(['shortcut', 'create'], '0.9.94', {
        label: PLUGIN_DISPLAY_NAME,
        location: 'desktop'
      });
      const data = res && (res.data !== undefined ? res.data : res);
      if (data && data.created === false) return;   // המשתמש ביטל בדיאלוג האישור
      if (res == null || (res && res.success === false)){
        // ההרשאה בוטלה בינתיים / הקריאה נדחתה — מודיעים, ולא נעלמים בשקט
        group.hidden = true;
        await Otzaria.call('ui.showError', {
          message: 'יצירת קיצור דרך אינה זמינה כרגע (ההרשאה לא ניתנה לתוסף).'
        }).catch(()=>{});
        return;
      }
      await Otzaria.call('notifications.showInApp', {
        message: 'קיצור הדרך נוצר על שולחן העבודה', type: 'success'
      }).catch(()=>{});
    } catch(e){
      await Otzaria.call('ui.showError', {
        message: 'לא הצלחנו ליצור קיצור דרך. ' + ((e && e.message) || '')
      }).catch(()=>{});
    } finally {
      btn.disabled = false;
      btn.textContent = orig;
    }
  });
}
refreshShortcutGroup();
