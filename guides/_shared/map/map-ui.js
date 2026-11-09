/* map-ui 2.0 — מסך מפה משותף לתוספי אוצריא (כיוון תפילה · מקוואות · גבולות עירוב · עינים למקרא).
   המקור היחיד: Hadabadra/Mikvaot/shared/map-core. כל תוסף מעתיק את הקובץ בשלמות בזמן האריזה — לא עורכים עותקים.
   המראה והכפתורים לפי המפה של כיוון תפילה: כפתורים צפים על המפה (זום, סיבוב, צפון, המיקום שלי, מרכוז, מסך מלא),
   תפריט שכבות, חיפוש צף עם הצעות (מקום, עיר, ארץ, רחוב, פינה, כתובת עם מספר בית), כרטיס נבחר ומסלול הליכה.
   בסיס עולמי (יבשות, ארצות, ערים) מ-basemap/world-basemap.js כשהוא טעון (window.NE_DATA).
   online:false (אוצריא במצב "ללא גישה לאינטרנט") מסתיר כל קישור החוצה וכל חיפוש ברשת.

   MapUI.mount(element, {
     self,                         // מזהה התוסף (לשכבות של תוספים אחרים)
     points: [{id, name, sub, lat, lon}], layerId, glyph, layerName, selectedId, me: [lat, lon], center: [lat, lon],
     layers: [{id, name, glyph, points, lines, on}],   // שכבות נוספות של התוסף עצמו
     call(method, params), openLink(url), onPick(id), pickLabel, nearby, nearbyLabel,
     builtinStreets, online, tab, jerusalem, onJerusalem, repo, forumUrl, issueUrl, future: [...] })
   MapUI.layersButton(element, { self, getPos, call, openLink, online, extraHTML, onExtra(pop) })   // אותו תפריט שכבות למפה שאינה map-ui (כיוון תפילה, עינים למקרא)
   guideExtra: async (selectedId) => html  // 2.2: HTML נוסף בקובץ ההדרכה שיורד (למשל מפת העירוב של העיר)
   guide: [{t, d}]                 // 2.1: שלבים של התוסף עצמו בהדרכה (לפני שלבי המפה המשותפים). links מגיעים מ-repo ומ-PLUGINS.
   draw: true                      // 3.1: כפתור "עט" (שרטוט קו / שטח) — רק בגבולות עירוב
   inside: (lat, lon) => 'טקסט'    // 3.1: הודעה אחרי חיפוש כתובת (למשל "בתוך קו העירוב בקירוב")
   MapUI.onOpenMap(cb)             // תוסף אחר ביקש לפתוח את המפה כאן: cb({lat, lon, from}) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./map-core.js'));
  else root.MapUI = factory(root.MapCore);
})(this, function (MC) {
  'use strict';
  const VERSION = '3.1.0';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const W = 400, ZMIN = 0.00004, ZMAX = 10;
  const JERUSALEM = [31.7767, 35.2345];
  let H = 300;   // 2.1: גובה ה-viewBox מחושב לפי יחס הרוחב-גובה של המיכל, כדי שהמפה תמלא את החלון בלי גלילה
  const SHARED_URL = 'https://github.com/Hadabadra/Mikvaot/tree/main/shared/map-core';
  const SHARED_DOC = 'https://github.com/Hadabadra/Mikvaot/blob/main/shared/map-core/SHARED-MAP.md';

  // ── תוספים עם מפה. שכבה של תוסף אחר לא מצוירת כאן: הלחיצה שואלת ופותחת את התוסף ההוא באותו מקום (param.type = "open-map").
  //    תוסף חדש עם מפה: מוסיפים שורה כאן, מריצים סנכרון בכל התוספים ומוציאים גרסה.
  const PLUGINS = [
    { id: 'com.shiachrina.kivuntefila', name: 'כיוון תפילה', glyph: '✡', desc: 'כיוון לירושלים, בתי כנסת, רחובות, דרכים ונהרות', store: 'https://otzaria.org/plugins/6ac80057bd083fcc18562fa0' },
    { id: 'com.hadabadra.mikvaot', name: 'מקוואות', glyph: 'מ', desc: 'מקוואות נשים, גברים וכלים ומסלול הליכה', store: 'https://otzaria.org/plugins/6ad9c9c92917198d739939b7' },
    { id: 'com.hadabadra.gvulot-eruv', name: 'גבולות עירוב', glyph: 'ע', desc: 'מפות העירובים והאחראים בכל עיר', layers: ['קווי עירוב (בקירוב — לפי מפת המוקד)'], store: 'https://otzaria.org/plugins/6ad93b5d2917198d73992a9d' },
    { id: 'com.chadbedera.madaeihatanach', name: 'עינים למקרא', glyph: 'ת', desc: 'מקומות מהתנ״ך ומחז״ל, לפי תקופות', store: 'https://otzaria.org/plugins/6a671db1dd175558ae6f20ac' }
  ];

  // מחרוזות לתרגום: המארחים ממזגים את MapUI.EN למילון שלהם
  const EN = {
    'זום פנימה': 'Zoom in', 'זום החוצה': 'Zoom out', 'סיבוב שמאלה': 'Rotate left', 'סיבוב ימינה': 'Rotate right', 'צפון למעלה': 'North up',
    'המיקום שלי': 'My location', 'מרכוז': 'Fit all', 'מסך מלא': 'Full screen', 'שכבות': 'Layers', 'ירושלים': 'Jerusalem', 'סגירה': 'Close',
    'חיפוש: מקום, עיר, רחוב, פינה או כתובת עם מספר בית': 'Search: place, city, street, corner or address with number', 'חיפוש': 'Search',
    'שכבות בתוסף': 'Layers in this plugin', 'שכבות מתוספים אחרים': 'Layers from other plugins', 'רחובות': 'Streets', 'בתי כנסת': 'Synagogues',
    'מפת העולם': 'World map', 'מסלול הליכה': 'Walking route', 'פתיחה': 'Open', 'ביטול': 'Cancel', 'לחנות': 'To the store', 'לפתוח את': 'Open',
    'במקום הזה במפה?': 'at this place on the map?', 'רחובות, נתונים ועזרה': 'Streets, data and help', 'טעינת רחובות מקובץ': 'Load streets from a file',
    'טעינת שכבה מקובץ (GeoJSON)': 'Load a layer from a file (GeoJSON)', 'הורדת רחובות לעיר': 'Download city streets', 'מקור חלופי 1': 'Alternative source 1', 'מקור חלופי 2': 'Alternative source 2',
    'על המפה המשותפת': 'About the shared map', 'הקוד של המפה': 'Map source code', 'הסבר': 'Explanation', 'בפיתוח': 'In development', 'מחכה לעזרה': 'Looking for help',
    'הצטרפות': 'Join', 'הבקשה בגיטהאב': 'Request on GitHub', 'השרשור בפורום': 'Forum thread', 'קרוב לכתובת': 'Near this address', 'נמצא:': 'Found:',
    'לא נמצא': 'Not found', 'הרחובות לא נפגשים באזור הזה': 'The streets do not meet in this area', 'הקובץ לא נקרא': 'The file could not be read',
    'בקובץ אין רחובות': 'The file has no streets', 'הקובץ נטען': 'File loaded', 'פתיחה ברשימה': 'Open in the list', 'ניווט ב-Waze': 'Navigate with Waze',
    'פתיחה ב-Google Maps': 'Open in Google Maps', 'אין נקודות עם מיקום להצגה': 'No points with a location to show', 'לרוחב': 'across', 'ממני': 'from me',
    'הוראות שלב אחר שלב': 'Step-by-step directions', 'הורדת הסבר המסלול': 'Download the route', 'נקודת מוצא מכאן': 'Start from here', 'מסלול הליכה לכאן': 'Walk here', 'מפה צבעונית': 'Colored map', 'הוספת קובץ': 'Add a file',
    'הדרכה': 'Guide', 'הדרכה שלב אחר שלב': 'Step-by-step guide', 'הקודם': 'Previous', 'הבא': 'Next', 'סיום': 'Done', 'הורדת ההדרכה': 'Download the guide', 'מחיקת המסלול': 'Remove the route',
    'מספר בית מדויק נמצא בחיפוש ברשת': 'Exact house number found online', 'מוצג הרחוב; מספר בית מדויק דורש חיבור לאינטרנט': 'Showing the street; an exact house number needs internet'
  };

  const ICO = {
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
    rotl: '<path d="M4 12a8 8 0 1 0 2.3-5.7"/><path d="M4 4v4h4"/>', rotr: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v4h-4"/>',
    me: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7.5"/>',
    fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', full: '<path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"/><path d="M4 4l6 6M20 4l-6 6M4 20l6-6M20 20l-6-6"/>',
    layers: '<path d="M12 3 2.5 8 12 13l9.5-5z"/><path d="M2.5 12.5 12 17.5l9.5-5"/><path d="M2.5 16.5 12 21.5l9.5-5" opacity=".6"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8"/>', close: '<path d="M6 6l12 12M18 6 6 18"/>',
    jer: '<path d="M4 20h16M6 20v-7l6-5 6 5v7"/><path d="M10 20v-4h4v4"/><path d="M12 8V4"/>', ext: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v6H4V6h6"/>',
    add: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>', dl: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.6v.2"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.4"/><path d="M12 16.8v.2"/>',
    pen: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>', pline: '<path d="M4 18 9 9l5 6 6-10"/><circle cx="4" cy="18" r="1.3"/><circle cx="20" cy="5" r="1.3"/>',
    parea: '<path d="M5 17 8 6l9 2 2 9z"/>', undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
    route: '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8 18h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6"/>'
  };
  const ic = (n, extra) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"${extra || ''}>${ICO[n]}</svg>`;
  const compass = rot => `<svg viewBox="0 0 24 24" aria-hidden="true"><g transform="rotate(${(+rot || 0).toFixed(1)} 12 12)"><path d="M12 3l3.6 9H8.4z" fill="var(--color-error, #c62828)"/><path d="M12 21l-3.6-9h7.2z" fill="currentColor" opacity=".55"/></g></svg>`;

  const CSS = `
:root { --mu-sea: #a9cdea; --mu-coast: #6b8fae; --mu-river: #4f8fcf; --mu-land-street: #f3efe0;
  --mu-e-land: #e6d8b0; --mu-e-sea: #9fbcc8; --mu-e-coast: #7796a3; --mu-e-line: #a08d5f; --mu-e-river: #7796a3;
  --mu-land1: #e9e3b8; --mu-land2: #cfe3b0; --mu-land3: #f1cfa8; --mu-land4: #d9c9e6; --mu-land5: #f3dcc2; --mu-land6: #c6dfd2; }
.mapui { --mu-r: var(--radius-lg, 1.1em); --mu-sh: 0 1px 2px rgba(0,0,0,.18), 0 4px 14px rgba(0,0,0,.12); }
.mapui .mu-stage { position: relative; border-radius: var(--mu-r); overflow: hidden; background: var(--color-surface-container, rgba(128,128,128,.08)); }
.mapui .mu-view { touch-action: none; user-select: none; -webkit-user-select: none; outline: none; }
.mapui .mu-view svg { display: block; width: 100%; height: auto; max-height: 58vh; cursor: grab; }
.mapui .mu-view svg:active { cursor: grabbing; }
.mapui .mu-view svg g[data-id] { cursor: pointer; }
.mapui.mapui-tab, .mapui.mu-full { display: flex; flex-direction: column; overflow: hidden; min-height: 0; box-sizing: border-box; }
.mapui.mapui-tab > .mu-stage, .mapui.mu-full > .mu-stage { flex: 1 1 auto; min-height: 14em; }
.mapui.mapui-tab .mu-view, .mapui.mu-full .mu-view { position: absolute; inset: 0; }
.mapui.mapui-tab .mu-view svg, .mapui.mu-full .mu-view svg { width: 100%; height: 100%; max-height: none; }
.mapui.mapui-tab > :not(.mu-stage), .mapui.mu-full > :not(.mu-stage) { flex: none; }
.mapui.mapui-tab > details.mu-more[open], .mapui.mu-full > details.mu-more[open] { max-height: 38%; overflow: auto; }
.mapui.mu-full { position: fixed; inset: 0; z-index: 9000; background: var(--color-surface, #fff); padding: .6em; }
.mapui .mu-glass { background: var(--color-surface, #fff); color: var(--color-on-surface, inherit); box-shadow: var(--mu-sh); border-radius: var(--radius-pill, 2em); }
.mapui .mu-modes { position: absolute; top: 3.3em; inset-inline-start: .6em; display: flex; gap: .15em; padding: .2em; z-index: 3; }
.mapui .mu-modes button { border: 0; background: transparent; color: inherit; font: inherit; font-size: .85em; padding: .3em .75em; border-radius: var(--radius-pill, 2em); cursor: pointer; transition: background .15s; }
.mapui .mu-modes button[aria-pressed="true"] { background: var(--color-primary); color: var(--color-on-primary, #fff); }
.mapui .mu-styles { display: flex; gap: .25em; flex-wrap: wrap; margin: .2em 0 .4em; }
.mapui .mu-styles button[aria-pressed="true"] { background: var(--color-primary); color: var(--color-on-primary, #fff); }
.mapui .mu-search { position: absolute; top: .6em; inset-inline: .6em 3.6em; display: flex; align-items: center; gap: .3em; padding: .15em .25em .15em .7em; z-index: 3; }
.mapui .mu-search input { flex: 1; min-width: 0; font: inherit; border: 0; outline: 0; background: transparent; color: inherit; padding: .45em .2em; }
.mapui .mu-sug { position: absolute; top: calc(100% + .35em); inset-inline: 0; max-height: 16em; overflow: auto; border-radius: var(--radius-md, .9em); padding: .3em; box-shadow: var(--mu-sh); background: var(--color-surface, #fff); }
.mapui .mu-sug button { display: flex; width: 100%; gap: .6em; align-items: baseline; text-align: start; font: inherit; border: 0; background: transparent; color: inherit; padding: .45em .6em; border-radius: .6em; cursor: pointer; }
.mapui .mu-sug button:hover, .mapui .mu-sug button.on { background: var(--color-secondary-container, rgba(128,128,128,.15)); }
.mapui .mu-sug small { opacity: .7; margin-inline-start: auto; }
.mapui .mu-ctl { position: absolute; top: .6em; inset-inline-end: .6em; display: flex; flex-direction: column; gap: .45em; z-index: 3; }
.mapui .mu-grp { display: flex; flex-direction: column; border-radius: 1.4em; overflow: hidden; }
.mapui .mu-ib { width: 2.45em; height: 2.45em; display: grid; place-items: center; border: 0; background: transparent; color: inherit; cursor: pointer; padding: 0; transition: background .15s, transform .15s; }
.mapui .mu-ib:hover { background: var(--color-secondary-container, rgba(128,128,128,.15)); }
.mapui .mu-ib:active { transform: scale(.92); }
.mapui .mu-ib[aria-pressed="true"] { background: var(--color-primary-container, rgba(128,128,128,.22)); color: var(--color-on-primary-container, inherit); }
.mapui .mu-ib svg { width: 1.25em; height: 1.25em; }
.mapui .mu-grp .mu-ib + .mu-ib { border-top: 1px solid var(--color-outline-variant, rgba(128,128,128,.25)); }
.mapui .mu-scale { position: absolute; bottom: .55em; inset-inline-start: .7em; font-size: .78em; padding: .2em .65em; z-index: 2; pointer-events: none; }
.mapui .mu-scale i { display: inline-block; height: .45em; border: 1.5px solid currentColor; border-top: 0; margin-inline-end: .4em; vertical-align: middle; }
.mapui .mu-pop { position: absolute; top: .6em; inset-inline-end: 3.75em; width: min(21em, calc(100% - 5em)); max-height: calc(100% - 1.2em); overflow: auto; z-index: 6; border-radius: var(--radius-md, 1em); padding: .7em .8em; animation: mu-in .16s ease-out; }
@keyframes mu-in { from { opacity: 0; transform: translateY(-4px) scale(.98); } }
.mapui .mu-pop h5 { margin: .3em 0 .35em; font-size: .82em; letter-spacing: .02em; opacity: .75; font-weight: 600; }
.mapui .mu-row { display: flex; align-items: center; gap: .6em; padding: .4em .45em; border-radius: .7em; cursor: pointer; }
.mapui .mu-row:hover { background: var(--color-secondary-container, rgba(128,128,128,.12)); }
.mapui .mu-row .mu-g { width: 1.75em; height: 1.75em; border-radius: 50%; display: grid; place-items: center; font-weight: 700; font-size: .85em; background: var(--color-primary, #3f6fa8); color: var(--color-on-primary, #fff); flex: none; }
.mapui .mu-row .mu-g.alt { background: var(--color-surface-container-high, rgba(128,128,128,.2)); color: var(--color-on-surface, inherit); }
.mapui .mu-row .mu-t { flex: 1; min-width: 0; line-height: 1.25; }
.mapui .mu-row .mu-t small { display: block; opacity: .7; font-size: .8em; }
.mapui .mu-row.off { opacity: .5; cursor: default; }
.mapui .mu-sw { appearance: none; -webkit-appearance: none; width: 2.2em; height: 1.25em; border-radius: 1em; background: var(--color-outline-variant, rgba(128,128,128,.4)); position: relative; cursor: pointer; flex: none; margin: 0; transition: background .15s; }
.mapui .mu-sw::after { content: ''; position: absolute; top: .15em; inset-inline-start: .15em; width: .95em; height: .95em; border-radius: 50%; background: var(--color-surface, #fff); transition: inset-inline-start .15s; }
.mapui .mu-sw:checked { background: var(--color-primary, #3f6fa8); }
.mapui .mu-sw:checked::after { inset-inline-start: 1.1em; }
.mapui .mu-ask { margin: .2em 2.3em .4em 0; font-size: .9em; display: flex; flex-wrap: wrap; gap: .4em; align-items: center; }
.mapui button.mu { font: inherit; cursor: pointer; padding: .38em .95em; border-radius: var(--radius-pill, 2em); border: 0; background: var(--color-secondary-container, rgba(128,128,128,.15)); color: var(--color-on-secondary-container, inherit); display: inline-flex; align-items: center; gap: .35em; transition: filter .15s, transform .15s; }
.mapui button.mu:hover { filter: brightness(.96); }
.mapui button.mu:active { transform: scale(.97); }
.mapui button.mu.pri { background: var(--color-primary, #3f6fa8); color: var(--color-on-primary, #fff); }
.mapui button.mu svg { width: 1.05em; height: 1.05em; }
.mapui button.mu[aria-disabled="true"] { opacity: .55; cursor: help; }
.mapui .mu-card { position: absolute; bottom: .6em; inset-inline: .6em; z-index: 3; border-radius: var(--radius-md, 1em); padding: .7em .9em; animation: mu-in .16s ease-out; max-height: 32%; overflow: auto; }
.mapui .mu-card.mu-mini { inset-inline: auto .6em; inset-inline-start: .6em; max-width: calc(100% - 1.2em); padding: .4em 2.6em .4em .9em; }
.mapui .mu-card.mu-mini .sub { display: flex; gap: .4em; align-items: center; opacity: .9; }
.mapui .mu-card.mu-mini .mu-x { top: 50%; transform: translateY(-50%); }
.mapui .mu-card { inset-inline-end: 3.7em; }
.mapui .mu-card.mu-side { top: 3.7em; bottom: .6em; inset-inline-end: auto; width: min(23em, calc(100% - 5em)); max-height: none; }
.mapui .mu-card.mu-side .mu-steps { max-height: none; }
.mapui .mu-card.mu-side .mu-x { top: .35em; transform: none; }
.mapui .mu-card.mu-side > .sub { display: block; padding-inline-end: 2.2em; }
.mapui .mu-ctl { max-height: calc(100% - 1.2em); overflow-y: auto; overflow-x: hidden; scrollbar-width: none; }
.mapui .mu-card .mu-x { position: absolute; top: .35em; inset-inline-end: .35em; width: 2em; height: 2em; }
.mapui .mu-card strong { display: block; padding-inline-end: 2em; }
.mapui .mu-card .sub { opacity: .8; font-size: .9em; }
.mapui .bar { display: flex; flex-wrap: wrap; gap: .4em; align-items: center; margin: .45em 0 0; }
.mapui .mu-toast { position: absolute; top: 3.9em; left: 50%; transform: translateX(-50%); max-width: calc(100% - 2em); padding: .45em 1em; font-size: .9em; z-index: 5; text-align: center; animation: mu-in .16s ease-out; }
.mapui .msg { margin: .35em 0; font-size: .9em; opacity: .85; }
.mapui .mu-near { margin-top: .5em; }
.mapui.mapui-tab .mu-near .bar, .mapui.mu-full .mu-near .bar { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: thin; padding-bottom: .2em; }
.mapui.mapui-tab .mu-near .bar .mu, .mapui.mu-full .mu-near .bar .mu { white-space: nowrap; flex: none; }
.mapui .mu-near .msg { margin: .2em 0; }
.mapui details.mu-more { margin-top: .6em; border-radius: var(--radius-md, .9em); background: var(--color-surface-container-low, rgba(128,128,128,.06)); padding: .35em .8em; }
.mapui details.mu-more summary { cursor: pointer; padding: .3em 0; font-weight: 600; }
.mapui h4 { margin: .8em 0 .2em; font-size: .95em; }
.mapui [hidden] { display: none !important; }
.mapui .mu-guide { position: absolute; inset: 0; z-index: 8; display: grid; place-items: center; background: rgba(0,0,0,.28); padding: .8em; }
.mapui .mu-guide > div { width: min(30em, 100%); max-height: 100%; overflow: auto; border-radius: var(--radius-lg, 1.1em); padding: 1em 1.1em .9em; animation: mu-in .16s ease-out; position: relative; }
.mapui .mu-guide h3 { margin: 0 0 .15em; font-size: 1.05em; padding-inline-end: 2em; }
.mapui .mu-guide .mu-step { font-size: .8em; opacity: .7; }
.mapui .mu-guide p { margin: .55em 0 .2em; line-height: 1.5; }
.mapui .mu-guide .mu-dots { display: flex; gap: .3em; justify-content: center; margin: .6em 0 .2em; }
.mapui .mu-guide .mu-dots i { width: .45em; height: .45em; border-radius: 50%; background: var(--color-outline-variant, rgba(128,128,128,.4)); }
.mapui .mu-guide .mu-dots i.on { background: var(--color-primary, #3f6fa8); }
.mapui .mu-guide .mu-x { position: absolute; top: .45em; inset-inline-end: .45em; width: 2em; height: 2em; }
.mapui .mu-steps { margin: .45em 0 0; padding: 0; list-style: none; max-height: 11em; overflow: auto; font-size: .9em; }
.mapui .mu-steps li { display: flex; gap: .55em; align-items: flex-start; padding: .32em .4em; border-radius: .6em; cursor: pointer; }
.mapui .mu-steps li:hover { background: var(--color-secondary-container, rgba(128,128,128,.12)); }
.mapui .mu-steps li b { flex: none; width: 1.6em; height: 1.6em; border-radius: 50%; display: grid; place-items: center; background: var(--color-primary-container, rgba(128,128,128,.18)); font-size: .85em; }
.mapui .mu-addpop { position: absolute; top: .6em; inset-inline-end: 3.75em; z-index: 6; border-radius: var(--radius-md, 1em); padding: .45em; display: flex; flex-direction: column; gap: .3em; animation: mu-in .16s ease-out; }
.mapui .mu-addpop button { justify-content: flex-start; }
.mapui .mu-info { position: absolute; top: .6em; inset-inline-end: 3.75em; z-index: 7; width: min(24em, calc(100% - 5em)); max-height: calc(100% - 1.2em); overflow: auto; border-radius: var(--radius-md, 1em); padding: .6em .8em; font-size: .9em; animation: mu-in .16s ease-out; }
.mapui .mu-info h4 { margin: .2em 0 .3em; padding-inline-end: 2em; }
.mapui .mu-info .mu-x { position: absolute; top: .35em; inset-inline-end: .35em; width: 1.9em; height: 1.9em; }
.mapui .mu-drawbar { position: absolute; top: auto; bottom: 2.9em; inset-inline: auto; inset-inline-start: 50%; transform: translateX(50%); z-index: 6; display: flex; align-items: center; gap: .15em; flex-wrap: wrap; justify-content: center; border-radius: var(--radius-pill, 2em); padding: .25em .4em; max-width: calc(100% - 8em); max-height: none; overflow: visible; }
[dir="ltr"] .mapui .mu-drawbar, .mapui[dir="ltr"] .mu-drawbar { transform: translateX(-50%); }
.mapui .mu-drawbar .mu-ib { width: 2.1em; height: 2.1em; border-radius: 50%; }
.mapui .mu-drawbar .mu-ib:disabled { opacity: .35; cursor: default; }
.mapui .mu-drawbar .sep { width: 1px; align-self: stretch; margin: .3em .2em; background: var(--color-outline-variant, rgba(128,128,128,.35)); }
.mapui .mu-drawbar .cnt { font-size: .78em; opacity: .8; padding-inline: .35em; white-space: nowrap; }
.mapui .mu-drawbar .sw { width: 1.15em; height: 1.15em; border-radius: 50%; border: 2px solid var(--color-surface, #fff); box-shadow: 0 0 0 1px var(--color-outline-variant, rgba(128,128,128,.5)); cursor: pointer; padding: 0; }
.mapui .mu-drawbar .sw[aria-pressed="true"] { box-shadow: 0 0 0 2px var(--color-on-surface, #222); }
.mapui .mu-drawbar .sw1 { background: var(--mu-pen1, #c62828); } .mapui .mu-drawbar .sw2 { background: var(--mu-pen2, #1565c0); } .mapui .mu-drawbar .sw3 { background: var(--mu-pen3, #2e7d32); } .mapui .mu-drawbar .sw4 { background: var(--mu-pen4, #ef6c00); } .mapui .mu-drawbar .sw5 { background: var(--mu-pen5, #6a1b9a); }
.mapui.mu-drawing .mu-view svg { cursor: crosshair; }
.mu-lbtn { position: relative; display: inline-block; }
.mu-lbtn > .mu-pop { position: absolute; top: calc(100% + .4em); inset-inline-end: 0; inset-inline-start: auto; width: min(21em, 90vw); }
@media (max-width: 520px) { .mapui .mu-search { inset-inline-end: 3.4em; } .mapui .mu-ib { width: 2.25em; height: 2.25em; } }
@media (prefers-reduced-motion: reduce) { .mapui * { animation: none !important; transition: none !important; } }
`;
  function css() { if (typeof document !== 'undefined' && !document.getElementById('mapui-css')) { const st = document.createElement('style'); st.id = 'mapui-css'; st.textContent = CSS; document.head.append(st); } }

  // ── רשת (חיפוש כתובת עם מספר בית, רק כשאוצריא מחוברת) ──
  async function fetchJSON(url) {
    const O = typeof window !== 'undefined' && window.Otzaria;
    if (!O) { const r = await fetch(url, { headers: { Accept: 'application/json' } }); return r.json(); }
    const isIt = x => x && typeof x[Symbol.asyncIterator] === 'function';
    let it = O.call('network.fetchStream', { url, method: 'GET', headers: { Accept: 'application/json' }, timeoutMs: 12000 });
    if (!isIt(it) && it && it.then) it = await it;
    if (!isIt(it) && it && isIt(it.data)) it = it.data;
    if (!isIt(it)) throw new Error('network');
    let text = '';
    for await (const c of it) { if (c && typeof c.body === 'string' && c.type !== 'response') text += c.body; }
    return JSON.parse(text);
  }
  const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

  // ── שכבות של תוספים אחרים ──
  function onOpenMap(cb) {
    const O = typeof window !== 'undefined' && window.Otzaria;
    if (!O || !O.on) return;
    O.on('plugin.page_opened', e => {
      const p = e && (e.param || (e.data && e.data.param));
      if (p && typeof p === 'object' && p.type === 'open-map') cb({ lat: p.lat != null ? +p.lat : null, lon: p.lon != null ? +p.lon : null, from: p.from || '' });
    });
  }
  function otherRows(self) {
    return PLUGINS.filter(p => p.id !== self).map(p => `<div class="mu-row" data-mu-other="${esc(p.id)}" role="button" tabindex="0" title="פתיחת התוסף ${esc(p.name)} באותו מקום במפה"><span class="mu-g alt">${esc(p.glyph)}</span><span class="mu-t">${esc(p.name)}<small>${esc(p.desc)}</small></span>${ic('ext', ' style="width:1.1em;height:1.1em;opacity:.7"')}</div>${(p.layers || []).map(n => `<div class="mu-row" data-mu-other="${esc(p.id)}" role="button" tabindex="0" title="פתיחת ${esc(n)} בתוסף ${esc(p.name)}"><span class="mu-g alt">〰</span><span class="mu-t">${esc(n)}<small>בתוסף ${esc(p.name)}</small></span>${ic('ext', ' style="width:1.1em;height:1.1em;opacity:.7"')}</div>`).join('')}<div class="mu-ask" data-mu-ask="${esc(p.id)}" hidden></div>`).join('');
  }
  function openOther(p, at, opt, ask) {
    const fail = () => { ask.innerHTML = `התוסף "${esc(p.name)}" לא נפתח. אם אינו מותקן, אפשר להתקין אותו מחנות התוספים.` + (opt.online === false ? '' : ` <button class="mu pri" data-mu-store="${esc(p.store)}">לחנות</button>`); };
    if (!opt.call) return fail();
    opt.call('plugin.openOther', { pluginId: p.id, param: { type: 'open-map', lat: at ? at[0] : null, lon: at ? at[1] : null, from: opt.self || '' } })
      .then(r => { if (r && r.success === false) fail(); else ask.hidden = true; }).catch(fail);
  }
  function wireOthers(root, opt, getAt) {
    root.addEventListener('click', e => {
      const st = e.target.closest('[data-mu-store]'); if (st) { if (opt.openLink) opt.openLink(st.dataset.muStore); return; }
      const no = e.target.closest('[data-mu-no]'); if (no) { no.closest('.mu-ask').hidden = true; return; }
      const yes = e.target.closest('[data-mu-yes]');
      if (yes) { const p = PLUGINS.find(x => x.id === yes.dataset.muYes); if (p) openOther(p, getAt(), opt, yes.closest('.mu-ask')); return; }
      const row = e.target.closest('[data-mu-other]'); if (!row) return;
      const p = PLUGINS.find(x => x.id === row.dataset.muOther); if (!p) return;
      const ask = root.querySelector(`[data-mu-ask="${p.id}"]`);
      ask.hidden = !ask.hidden;
      ask.innerHTML = `לפתוח את ${esc(p.name)} במקום הזה במפה? <button class="mu pri" data-mu-yes="${esc(p.id)}">פתיחה</button><button class="mu" data-mu-no="1">ביטול</button>`;
    });
  }

  /* תפריט שכבות בלבד, למפה שאינה map-ui (כיוון תפילה). getPos() מחזיר [lat, lon] או null. */
  function layersButton(el, opt) {
    css();
    const box = document.createElement('span'); box.className = 'mapui mu-lbtn';
    box.innerHTML = `<button type="button" class="mu-ib mu-glass" title="שכבות" aria-label="שכבות" aria-expanded="false">${ic('layers')}</button>
      <div class="mu-pop mu-glass" hidden role="dialog" aria-label="שכבות">${opt.extraHTML || ''}<h5>שכבות מתוספים אחרים</h5>${otherRows(opt.self)}
      <p class="msg">כל תוסף מציג את השכבה שלו. הלחיצה פותחת אותו באותו מקום במפה.</p></div>`;
    el.append(box);
    const btn = box.firstElementChild, pop = box.lastElementChild;
    // התפריט עובר לגוף הדף: אב עם transform/overflow (למשל פקדי Leaflet) לא יזיז ולא יחתוך אותו
    const host = document.createElement('div'); host.className = 'mapui mu-float'; document.body.append(host); host.append(pop);
    btn.addEventListener('click', () => {
      pop.hidden = !pop.hidden; btn.setAttribute('aria-expanded', String(!pop.hidden));
      if (!pop.hidden) {   // מיקום קבוע מעל הכול, כדי שמיכל עם overflow לא יחתוך את התפריט
        const r = btn.getBoundingClientRect(), w = Math.min(336, innerWidth - 16);
        Object.assign(pop.style, { position: 'fixed', top: (r.bottom + 6) + 'px', left: Math.max(8, Math.min(innerWidth - w - 8, r.left)) + 'px', width: w + 'px', maxHeight: (innerHeight - r.bottom - 20) + 'px', zIndex: 9500 });
      }
    });
    document.addEventListener('pointerdown', e => { if (!box.contains(e.target) && !host.contains(e.target)) { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
    wireOthers(pop, opt, () => (opt.getPos ? opt.getPos() : null));
    if (opt.onExtra) opt.onExtra(pop);
    return box;
  }

  /* 2.1: "המיקום שלי" בכל תוסף עם המפה המשותפת — דרך הגשר "אחת שאלתי" (כל window.*_BRIDGE עם location(), כמו MIKVE_BRIDGE / ERUV_BRIDGE),
     או o.locate() של התוסף, ואם אין — מיקום המחשב (navigator.geolocation). מחזיר [lat, lon] (עם .how) או null. */
  async function locate(o) {
    try { if (o && o.locate) { const p = await o.locate(); if (p && p[0] != null) return p; } } catch (e) {}
    if (typeof window !== 'undefined') for (const k of Object.keys(window).filter(k => /_BRIDGE$/.test(k))) {
      const B = window[k];
      try { if (B && B.location && (!B.available || await B.available())) { const d = await B.location(); if (d && d.lat != null) return Object.assign([+d.lat, +d.lon], { how: 'מהגשר (Windows)' }); } } catch (e) {}
    }
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      const p = await new Promise(res => navigator.geolocation.getCurrentPosition(g => res([g.coords.latitude, g.coords.longitude]), () => res(null), { timeout: 12000, maximumAge: 300000 }));
      if (p) return Object.assign(p, { how: 'מהמחשב' });
    }
    return null;
  }

  const MODES = [['map', 'מפה'], ['near', 'סביבה קרובה'], ['streets', 'רחובות'], ['globe', 'כדור']];
  const STYLES = [['eyes', 'צבעוני', 'יבשה חומה וים כחול, כמו עינים למקרא'], ['countries', 'ארצות בצבעים', 'כל ארץ בצבע משלה'], ['plain', 'חום-לבן', 'כמו כיוון תפילה']];
  function mount(el, o) {
    if (!MC) { el.innerHTML = '<p>רכיב המפה לא נטען.</p>'; return; }
    css();
    // 3.1: טעינה חוזרת לאותו אלמנט מנתקת את המאזינים של הטעינה הקודמת (אחרת כל לחיצה טופלה פעמיים — למשל מסך מלא שנפתח ונסגר)
    if (el.__muAC) try { el.__muAC.abort(); } catch (e) {}
    const AC = el.__muAC = typeof AbortController !== 'undefined' ? new AbortController() : null, LO = AC ? { signal: AC.signal } : undefined;
    const pts = (o.points || []).filter(p => p.lat != null && p.lon != null);
    const extra = (o.layers || []).map(L => Object.assign({ on: true }, L));
    // 2.2.1: שכבות שהמשתמש שרטט או טען מקובץ נשמרות ב-storage של התוסף ונטענות לבד בכל פתיחה (דיווח גבולות עירוב 04.11)
    const UKEY = 'mapuiUserLayers';
    const isUser = L => /^(file|draw)-/.test(L.id);
    function saveUser() {
      if (!o.call) return;
      const keep = extra.filter(isUser).map(L => ({ id: L.id, name: L.name, sub: L.sub, glyph: L.glyph, points: L.points, lines: L.lines, on: S.show['x-' + L.id] !== false }));
      try { o.call('storage.set', { key: UKEY, value: keep }); } catch (e) {}
    }
    async function restoreUser() {
      if (!o.call) return;
      try {
        const r = await o.call('storage.get', { key: UKEY }); let d = r && r.success !== false ? (r.data !== undefined ? r.data : r) : null;
        if (typeof d === 'string') try { d = JSON.parse(d); } catch (e) { d = null; }
        if (!Array.isArray(d) || !d.length) return;
        for (const L of d) if (L && L.id && !extra.some(x => x.id === L.id)) { extra.push(Object.assign({ on: true }, L, { points: L.points || [], lines: L.lines || [] })); S.show['x-' + L.id] = L.on !== false; }
        refresh();
      } catch (e) {}
    }
    const NE = () => (typeof window !== 'undefined' && window.NE_DATA) || null;
    const S = { lat: 0, lon: 0, zoom: 1, rot: 0, area: null, areaName: '', sel: o.selectedId != null ? String(o.selectedId) : null, street: null,
      show: { pts: true, streets: true, syn: true, base: true, route: true, color: false }, from: null, route: null, mark: null, jer: false, pick: null };
    // 3.0: סגנון מפה (צבעוני כמו עינים למקרא / ארצות בצבעים / חום-לבן) ומצב תצוגה (מפה / סביבה / רחובות / כדור)
    S.style = o.style || 'eyes'; S.mode = o.mode || 'map'; S.gz = 1;
    try { const c = localStorage.getItem('mapui-style'); if (c && STYLES.some(x => x[0] === c)) S.style = c; } catch (e) {}
    S.show.color = S.style !== 'plain';
    extra.forEach(L => { S.show['x-' + L.id] = L.on !== false; });
    const byId = new Map(pts.map(p => [String(p.id), p]));
    const ptsLayer = () => MC.toLayer({ type: 'FeatureCollection', features: pts.map(p => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] }, properties: { id: p.id, name: p.name } })) }, o.layerId || 'pts', o.glyph || '•');
    const off = o.online === false;
    const routeOn = o.route !== false && !!o.builtinStreets;

    function fit(list) {
      list = list && list.length ? list : pts;
      if (!list.length) { S.lat = 31.5; S.lon = 34.9; S.zoom = 0.0012; return; }
      const lat = list.reduce((a, i) => a + i.lat, 0) / list.length, lon = list.reduce((a, i) => a + i.lon, 0) / list.length;
      const far = Math.max(150, ...list.map(i => MC.distM([lat, lon], [i.lat, i.lon])));
      S.lat = lat; S.lon = lon; S.zoom = Math.max(ZMIN, Math.min(4, 300 / (far * 1.25)));
    }
    const selPt = () => (S.sel != null ? byId.get(S.sel) : null);
    if (selPt()) { S.lat = selPt().lat; S.lon = selPt().lon; S.zoom = 3; } else if (o.center && o.center[0] != null) { S.lat = o.center[0]; S.lon = o.center[1]; S.zoom = o.zoom || 2; } else fit();

    const future = o.future || [];
    const join = off ? '' : [o.repo ? `<button class="mu" data-mu-open="${esc(o.repo + '/issues/new')}">הצטרפות</button>` : '', o.issueUrl ? `<button class="mu" data-mu-open="${esc(o.issueUrl)}">הבקשה בגיטהאב</button>` : '', o.forumUrl ? `<button class="mu" data-mu-open="${esc(o.forumUrl)}">השרשור בפורום</button>` : ''].join(' ');

    el.classList.add('mapui'); el.classList.toggle('mapui-tab', !!o.tab); el.classList.remove('mu-full');
    el.innerHTML = `
      <div class="mu-stage" id="mu-stage">
        <div class="mu-view" id="mu-view" tabindex="0" aria-label="מפה. חיצים להזזה, + ו- לזום, [ ו-] לסיבוב, N לצפון"></div>
        <form class="mu-search mu-glass" id="mu-sf" role="search" autocomplete="off">${ic('search', ' style="width:1.1em;height:1.1em;opacity:.7;flex:none"')}
          <input type="search" id="mu-q" placeholder="חיפוש: מקום, עיר, רחוב, פינה או כתובת עם מספר בית" aria-label="חיפוש" enterkeyhint="search">
          <div class="mu-sug" id="mu-sug" hidden role="listbox"></div></form>
        <div class="mu-modes mu-glass" id="mu-modes" role="group" aria-label="מצב תצוגה">${MODES.map(([k, t]) => `<button type="button" data-mu-mode="${k}" aria-pressed="false">${t}</button>`).join('')}</div>
        <div class="mu-ctl">
          <div class="mu-grp mu-glass"><button type="button" class="mu-ib" data-mu="in" title="זום פנימה" aria-label="זום פנימה">${ic('plus')}</button><button type="button" class="mu-ib" data-mu="out" title="זום החוצה" aria-label="זום החוצה">${ic('minus')}</button></div>
          <div class="mu-grp mu-glass"><button type="button" class="mu-ib" data-mu="rotl" title="סיבוב שמאלה" aria-label="סיבוב שמאלה">${ic('rotl')}</button><button type="button" class="mu-ib" data-mu="north" id="mu-north" title="צפון למעלה" aria-label="צפון למעלה">${compass(0)}</button><button type="button" class="mu-ib" data-mu="rotr" title="סיבוב ימינה" aria-label="סיבוב ימינה">${ic('rotr')}</button></div>
          <div class="mu-grp mu-glass"><button type="button" class="mu-ib" data-mu="me" title="המיקום שלי" aria-label="המיקום שלי">${ic('me')}</button><button type="button" class="mu-ib" data-mu="fit" title="מרכוז" aria-label="מרכוז">${ic('fit')}</button><button type="button" class="mu-ib" data-mu="full" id="mu-fullb" title="מסך מלא" aria-label="מסך מלא" aria-pressed="false">${ic('full')}</button></div>
          ${o.jerusalem ? `<div class="mu-grp mu-glass"><button type="button" class="mu-ib" data-mu="jer" id="mu-jer" title="ירושלים" aria-label="ירושלים" aria-pressed="false">${ic('jer')}</button></div>` : ''}
          ${o.draw ? `<div class="mu-grp mu-glass"><button type="button" class="mu-ib" data-mu="pen" id="mu-penb" title="עט — שרטוט קו או שטח" aria-label="עט — שרטוט קו או שטח" aria-pressed="false">${ic('pen')}</button></div>` : ''}
          <div class="mu-grp mu-glass"><button type="button" class="mu-ib" data-mu="add" id="mu-addb" title="הוספת קובץ: רחובות או שכבה" aria-label="הוספת קובץ" aria-expanded="false">${ic('add')}</button></div>
          <div class="mu-grp mu-glass"><button type="button" class="mu-ib" data-mu="guide" title="הדרכה שלב אחר שלב" aria-label="הדרכה">${ic('help')}</button><button type="button" class="mu-ib" data-mu="info" id="mu-infob" title="רחובות, נתונים ועזרה" aria-label="רחובות, נתונים ועזרה" aria-expanded="false">${ic('info')}</button></div>
          <div class="mu-grp mu-glass"><button type="button" class="mu-ib" data-mu="layers" id="mu-lb" title="שכבות" aria-label="שכבות" aria-expanded="false">${ic('layers')}</button></div>
        </div>
        <div class="mu-pop mu-glass" id="mu-pop" hidden role="dialog" aria-label="שכבות"></div>
        <div class="mu-addpop mu-glass" id="mu-add" hidden role="menu" aria-label="הוספת קובץ"><button class="mu" data-mu="load" role="menuitem">טעינת רחובות מקובץ</button><button class="mu" data-mu="loadgeo" role="menuitem">טעינת שכבה מקובץ (GeoJSON)</button>${o.draw ? '<button class="mu" data-mu="draw" role="menuitem">שרטוט קו או שטח (עט)</button>' : ''}${off || o.builtinStreets ? '' : '<button class="mu" data-mu="url" role="menuitem">הורדת רחובות לאזור (דפדפן)</button>'}</div>
        <div class="mu-scale mu-glass" id="mu-scale"></div>
        <div class="mu-card mu-glass" id="mu-sel" hidden></div>
        <div class="mu-toast mu-glass" id="mu-msg" hidden role="status"></div>
        <div class="mu-drawbar mu-glass" id="mu-draw" hidden role="toolbar" aria-label="עט"></div>
        <div class="mu-info mu-glass" id="mu-info" hidden role="dialog" aria-label="רחובות, נתונים ועזרה"><button type="button" class="mu-ib mu-x" data-mu="infox" title="סגירה" aria-label="סגירה">✕</button><h4>רחובות, נתונים ועזרה</h4>
        <div class="bar">${off || o.builtinStreets ? '' : '<button class="mu" data-mu="dl" id="mu-dl">הורדת רחובות לעיר</button>'}<button class="mu" data-mu="load">טעינת רחובות מקובץ</button><button class="mu" data-mu="loadgeo">טעינת שכבה מקובץ (GeoJSON)</button></div>
        ${o.builtinStreets ? `<p class="msg">הרחובות של ${Object.keys((typeof window !== 'undefined' && window.STREET_CITIES) || {}).length || 76} ערים מובנים בתוסף ונטענים לבד כשמתקרבים לעיר בזום, בלי אינטרנט. לעיר אחרת: טעינת קובץ רחובות.</p>` : off ? '<p class="msg">אוצריא במצב "ללא גישה לאינטרנט": אפשר לטעון קובץ רחובות שכבר שמור במחשב.</p>' : `<p class="msg">מורידים את קובץ העיר (נפתח בדפדפן), ואז "טעינת רחובות מקובץ". <button class="mu" data-mu="url">מקור חלופי 1</button> <button class="mu" data-mu="url2">מקור חלופי 2</button></p>`}
        <p class="msg">חיפוש כתובת עם מספר בית (למשל: <em>רבי עקיבא 12, בני ברק</em>): ${off ? 'במצב מנותק מוצג הרחוב.' : 'המיקום המדויק נמצא ברשת (OpenStreetMap); בלי רשת מוצג הרחוב.'} פינה: <em>הרצל פינת בן יהודה</em>.</p>
        <h4>על המפה המשותפת</h4>
        <p class="msg">אותה מפה בכיוון תפילה, מקוואות, גבולות עירוב ועינים למקרא: הקוד במקום אחד, וכל תיקון מגיע לכל התוספים. כל תוסף מציג את השכבה שלו, ובכפתור השכבות פותחים את השכבות של האחרים. גרסת המפה ${VERSION}.</p>
        ${off ? '' : `<div class="bar"><button class="mu" data-mu-open="${SHARED_DOC}">הסבר</button><button class="mu" data-mu-open="${SHARED_URL}">הקוד של המפה</button>${join}</div>`}
        ${future.length ? `<h4>בפיתוח</h4><div class="bar">${future.map(f => `<button class="mu" aria-disabled="true" data-mu="soon" title="בפיתוח: מחכה לעזרה">${esc(f)}</button>`).join('')}</div>` : ''}
        <p class="msg">© OpenStreetMap contributors · Natural Earth. המיקומים להתמצאות בלבד.</p>
        </div>
        <div class="mu-guide" id="mu-guide" hidden role="dialog" aria-modal="true" aria-label="הדרכה"></div>
      </div>
      <div class="mu-near" id="mu-near"></div>
`;
    const $ = id => el.querySelector('#' + id);
    const view = $('mu-view');

    let toastT = 0;
    const say = t => { const m = $('mu-msg'); clearTimeout(toastT); if (!t) { m.hidden = true; return; }
      // 3.1: בדיקה "בתוך העירוב?" (גבולות עירוב מעביר o.inside) — אחרי כל חיפוש כתובת / רחוב שנמצא
      if (o.inside && S.mark && /^(נמצא|מוצג)/.test(t)) { try { const r = o.inside(S.mark.lat, S.mark.lon); if (r) t += ' · ' + r; } catch (e) {} } m.textContent = t; m.hidden = false; toastT = setTimeout(() => { m.hidden = true; }, 5200); };

    // רחובות מובנים בתוסף (streets/<slug>.js): נטענים לבד כשמתקרבים לעיר
    const BUILT = o.builtinStreets ? (window.STREETS = window.STREETS || {}) : null;
    const CITIES = () => (typeof window !== 'undefined' && window.STREET_CITIES) || {};
    const nearCity = (lat, lon, zoomOk) => {
      let best = null;
      for (const [n, c] of Object.entries(CITIES())) { const d = MC.distM([lat, lon], [c.lat, c.lon]); if (!best || d < best.d) best = { n, c, d }; }
      return best && best.d < 30000 && (zoomOk || S.zoom >= 0.05) ? best : null;
    };
    function setArea(a, name) { S.area = a; S.areaName = name || a.name || ''; }
    function useBuiltin(c, then) {
      if (!BUILT || !c) return then && then(false);
      if (S.areaName === c.n) return then && then(true);
      const go = () => { try { setArea(MC.decodeArea(MC.compactOverpass(BUILT[c.c.slug])), c.n); draw(); then && then(true); } catch (e) { then && then(false); } };
      if (BUILT[c.c.slug]) return go();
      const sc = document.createElement('script'); sc.src = 'streets/' + c.c.slug + '.js'; sc.onload = go; sc.onerror = () => then && then(false); document.head.append(sc);
    }
    const updDl = () => {
      const c = nearCity(S.lat, S.lon); if (BUILT) useBuiltin(c);
      const b = $('mu-dl'); if (!b) return;
      b.dataset.slug = c ? c.c.slug : ''; b.textContent = c ? 'הורדת רחובות: ' + c.n : 'הורדת רחובות (מתקרבים לעיר בזום)'; b.setAttribute('aria-disabled', c ? 'false' : 'true');
    };

    // ── ציור ──
    let raf = 0;
    const draw = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; drawNow(); }); };
    function sizeH() {   // 2.1: יחס ה-viewBox לפי המיכל (מסך מלא / לשונית ממלאים את הגובה)
      if (!el.classList.contains('mapui-tab') && !el.classList.contains('mu-full')) { H = 300; return; }
      const r = view.getBoundingClientRect();
      if (r.width > 50 && r.height > 50) H = Math.max(150, Math.min(1600, Math.round(W * r.height / r.width)));
    }
    function drawNow() {
      setTimeout(updDl, 0); sizeH();
      const glb = S.mode === 'globe';
      const v = MC.createView(glb ? { proj: 'globe', gz: S.gz, lat: S.lat, lon: S.lon, rot: S.rot, width: W, height: H } : { lat: S.lat, lon: S.lon, zoom: S.zoom, rot: S.rot, width: W, height: H });
      modeBar();
      const layers = [];
      if (S.route && S.show.route) layers.push({ id: 'route', lines: [{ coords: S.route.coords, label: 'מסלול הליכה', style: 'route' }], points: [] });
      if (S.jer && o.me) layers.push({ id: 'jer', lines: [{ coords: [o.me, JERUSALEM], label: 'הכיוון לירושלים', style: 'route' }], points: [{ lat: JERUSALEM[0], lon: JERUSALEM[1], label: 'ירושלים', id: '__jer' }], glyph: 'י' });
      for (const L of extra) if (S.show['x-' + L.id]) layers.push({ id: L.id, glyph: L.glyph || '•', points: L.points || [], lines: L.lines || [] });
      if (S.draw && S.draw.pts.length) layers.push({ id: 'draw', glyph: '•', points: S.draw.pts.map((c, i) => ({ lat: c[0], lon: c[1], id: '__d' + i, label: '' })), lines: S.draw.pts.length > 1 ? [{ coords: S.draw.closed ? [...S.draw.pts, S.draw.pts[0]] : S.draw.pts, closed: S.draw.closed, label: 'שרטוט', solid: true, color: `var(--mu-pen${S.draw.col}, ${['', '#c62828', '#1565c0', '#2e7d32', '#ef6c00', '#6a1b9a'][S.draw.col]})` }] : [] });
      if (S.mark) layers.push({ id: 'mark', glyph: '★', points: [{ lat: S.mark.lat, lon: S.mark.lon, label: S.mark.label, id: '__mark' }], lines: [] });
      if (S.show.pts) layers.push(ptsLayer());
      const base = NE() && (glb || (S.show.base && (!S.area || S.zoom < 0.35))) ? NE() : null;
      view.innerHTML = MC.renderSVG({ area: S.area, view: v, layers, streets: S.show.streets, syn: S.show.syn, me: o.me, hl: S.sel, selected: S.street, color: S.style !== 'plain', style: S.style,
        labels: !glb && S.zoom >= 2, outline: !S.area && !base, base, chrome: false });
      view._v = v;
      $('mu-north').innerHTML = compass(S.rot);
      // סרגל קנה מידה: אורך עגול שמתאים ל-~70 פיקסלים
      const rect = view.getBoundingClientRect(), k = (rect.width || W) / W, mpp = 1 / (v.scale * k);
      const raw = 70 * mpp, pow = Math.pow(10, Math.floor(Math.log10(raw))), nice = [1, 2, 5, 10].map(x => x * pow).find(x => x >= raw * .7) || raw;
      $('mu-scale').innerHTML = `<i style="width:${Math.round(nice / mpp)}px"></i>${esc(MC.widthLabel ? MC.widthLabel(nice) : Math.round(nice) + " מ'")}`;
    }
    const routeMsg = r => `מסלול הליכה${r.name ? ' אל ' + esc(r.name) : ''}: ${MC.widthLabel(r.m)} · כ-${Math.max(1, Math.round(r.m / 80))} דקות`;
    function showSel() {
      const p = selPt(), b = $('mu-sel');
      b.classList.toggle('mu-side', !!(S.route && S.showSteps));
      b.classList.toggle('mu-mini', !p && !!S.route);
      // 2.1: סגירת הכרטיס לא מוחקת את המסלול — נשאר פס קטן עם המסלול וכפתור למחיקתו
      if (!p && S.pick) {   // 2.1: רחוב שנבחר בלחיצה (כמו בכיוון תפילה)
        const w = S.pick; b.classList.remove('mu-mini'); b.hidden = false;
        b.innerHTML = `<button type="button" class="mu-ib mu-x" data-mu="unpick" title="סגירה" aria-label="סגירה">${ic('close')}</button><strong>${esc(w.name)}</strong><div class="sub">רחוב${S.areaName ? ' · ' + esc(S.areaName) : ''} · אורך כ-${MC.widthLabel(w.len)}${o.me ? ' · ' + MC.widthLabel(MC.distM(o.me, [w.lat, w.lon])) + ' ממני' : ''}</div>`
          + `<div class="bar"><button class="mu pri" data-mu="from-here">${ic('me')}נקודת מוצא מכאן</button>${routeOn ? `<button class="mu" data-mu="route-street">${ic('route')}מסלול הליכה לכאן</button>` : ''}${off ? '' : `<button class="mu" data-mu-open="https://www.google.com/maps/search/?api=1&query=${w.lat},${w.lon}">פתיחה ב-Google Maps</button>`}</div>`
          + (S.route && S.route.to === '__street' ? routeBox() : '');
        return;
      }
      if (!p && S.route) { b.hidden = false; b.innerHTML = `<button type="button" class="mu-ib mu-x" data-mu="noroute" title="מחיקת המסלול" aria-label="מחיקת המסלול">${ic('close')}</button><span class="sub">${ic('route', ' style="width:1.1em;height:1.1em;vertical-align:-.2em"')} ${routeMsg(S.route)}</span><button class="mu" data-mu="steps">הוראות</button><button class="mu" data-mu="routedl">${ic('dl')}הורדה</button>` + (S.showSteps ? stepsHtml() : ''); if (S.showSteps) b.classList.remove('mu-mini'); return; }
      if (!p) { b.hidden = true; return; }
      const dMe = o.me ? MC.distM(o.me, [p.lat, p.lon]) : null;
      b.hidden = false;
      b.innerHTML = `<button type="button" class="mu-ib mu-x" data-mu="unsel" title="סגירה" aria-label="סגירה">${ic('close')}</button><strong>${esc(p.name)}</strong>${p.sub ? `<div class="sub">${esc(p.sub)}</div>` : ''}`
        + (dMe != null ? `<div class="sub">${MC.widthLabel(dMe)} ממני</div>` : '')
        + '<div class="bar">'
        + (o.onPick ? `<button class="mu pri" data-mu="pick">${esc(o.pickLabel || 'פתיחה ברשימה')}</button>` : '')
        + (routeOn ? `<button class="mu" data-mu="route">${ic('route')}מסלול הליכה</button>` : '')
        + (off ? '' : `<button class="mu" data-mu-open="https://waze.com/ul?ll=${p.lat},${p.lon}&navigate=yes">ניווט ב-Waze</button><button class="mu" data-mu-open="https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}">פתיחה ב-Google Maps</button>`)
        + '</div>'
        + (S.route && S.route.to === S.sel ? routeBox() : '');
    }
    // 2.1: הוראות הליכה שלב אחר שלב (כמו ב-Google Maps) והורדת הסבר המסלול עם המפה
    const ARROW = { start: '⬆', straight: '⬆', 'slight-right': '↗', right: '➡', 'slight-left': '↖', left: '⬅', back: '↩', arrive: '⚑' };
    const stepsHtml = () => `<ol class="mu-steps">${(S.route.steps || []).map((st, i) => `<li data-mu-step="${i}" title="הצגה במפה"><b>${ARROW[st.turn] || '•'}</b><span>${esc(st.text)}</span></li>`).join('')}</ol>`;
    const routeBox = () => `<div class="msg">${routeMsg(S.route)}. לפי רחובות OpenStreetMap, להתמצאות בלבד.</div>`
      + `<div class="bar"><button class="mu" data-mu="steps" aria-pressed="${!!S.showSteps}">${S.showSteps ? 'הסתרת ההוראות' : 'הוראות שלב אחר שלב'}</button><button class="mu" data-mu="routedl">${ic('dl')}הורדת הסבר המסלול</button></div>`
      + (S.showSteps ? stepsHtml() : '');
    function fitRoute() {
      const cs = S.route.coords, la = cs.map(c => c[0]), lo = cs.map(c => c[1]);
      const c0 = [(Math.min(...la) + Math.max(...la)) / 2, (Math.min(...lo) + Math.max(...lo)) / 2];
      const far = Math.max(120, ...cs.map(c => MC.distM(c0, c)));
      S.lat = c0[0]; S.lon = c0[1]; S.zoom = Math.max(ZMIN, Math.min(4, 300 * Math.min(1, H / W) / (far * 1.7)));
    }
    function makeRoute(to, tid, name) {
      const from = S.from || o.me;
      if (!from) return say('לחיפוש מסלול: חפשו קודם את נקודת המוצא (רחוב, פינה או כתובת), לחצו על רחוב ← "נקודת מוצא מכאן", או "המיקום שלי".');
      if (!S.area) return say('אין רחובות לאזור הזה. מתקרבים לעיר בזום (או טוענים קובץ רחובות) ומנסים שוב.');
      const r = MC.walkRoute(S.area, from, to);
      if (!r) return say('לא נמצא מסלול ברחובות שבאזור. ייתכן שהנקודות רחוקות מהרחובות הטעונים.');
      S.route = Object.assign(r, { to: tid, name, fromLabel: S.fromLabel || (S.from ? '' : 'המיקום שלי') }); S.show.route = true; S.showSteps = true;
      fitRoute(); panBy(0, -H * 0.12, S); refresh();
    }
    function routeFile() {
      if (!S.route) return;
      const keep = { lat: S.lat, lon: S.lon, zoom: S.zoom, rot: S.rot }; fitRoute(); S.rot = 0; drawNow();
      const svg = (view.querySelector('svg') || {}).outerHTML || ''; Object.assign(S, keep); draw();
      const links = gLinks(), R = S.route;
      const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>מסלול הליכה${R.name ? ' אל ' + esc(R.name) : ''}</title>
<style>:root{--color-primary:#3f6fa8;--color-on-primary:#fff;--color-surface:#fff;--color-on-surface:#1b1b1f;--color-on-surface-variant:#5f6368;--color-outline:#888;--color-error:#c62828;--mu-sea:#a9cdea;--mu-coast:#6b8fae;--mu-river:#4f8fcf;--mu-land-street:#f3efe0;--mu-land1:#e9e3b8;--mu-land2:#cfe3b0;--mu-land3:#f1cfa8;--mu-land4:#d9c9e6;--mu-land5:#f3dcc2;--mu-land6:#c6dfd2}
body{font-family:system-ui,"Segoe UI",Arial,sans-serif;max-width:46em;margin:2em auto;padding:0 1em;line-height:1.6;color:#1b1b1f}
h1{font-size:1.35em;margin-bottom:.2em}figure{margin:1em 0;border:1px solid #ccc;border-radius:12px;overflow:hidden}figure svg{display:block;width:100%;height:auto;background:#f5f6f8}
ol li{margin:.45em 0}.sum{font-size:1.05em}footer{margin-top:2em;border-top:1px solid #ccc;padding-top:1em;font-size:.95em}@media print{figure{break-inside:avoid}}</style></head><body>
<h1>מסלול הליכה${R.name ? ' אל ' + esc(R.name) : ''}</h1><p class="sum"><b>${MC.widthLabel(R.m)}</b> · כ-${Math.max(1, Math.round(R.m / 80))} דקות הליכה${S.areaName ? ' · ' + esc(S.areaName) : ''}</p>
${svg ? `<figure>${svg}</figure>` : ''}
<h2>הוראות</h2><ol>${(R.steps || []).map(st => `<li>${ARROW[st.turn] || ''} ${esc(st.text)}</li>`).join('')}</ol>
<p><small>המסלול מחושב לפי רחובות OpenStreetMap, להתמצאות בלבד. יש לשים לב לתנועה ולשלטים בדרך.</small></p>
<footer><strong>נוצר בתוסף ${esc(me.name)} לאוצריא. להורדת התוסף:</strong><ul>${links.map(([a, u]) => `<li>${esc(a)}: <a href="${esc(u)}">${esc(u)}</a></li>`).join('')}</ul>
<p>התקנה: באוצריא ← כלים ← תוספים ← התקן תוסף חדש. © OpenStreetMap contributors · Natural Earth.</p></footer></body></html>`;
      try {
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
        a.download = 'מסלול הליכה' + (R.name ? ' - ' + R.name.replace(/[\\/:*?"<>|]/g, ' ') : '') + '.html'; document.body.append(a); a.click(); a.remove();
        say('הסבר המסלול נשמר (מפה, הוראות וקישורי ההורדה של התוסף). אפשר להדפיס אותו מהדפדפן.');
      } catch (e) { say('השמירה לא הצליחה'); }
    }
    function nearList(center) {
      if (o.nearby === false || !center || !pts.length) { $('mu-near').innerHTML = ''; return; }
      const L = pts.map(p => [p, MC.distM(center, [p.lat, p.lon])]).sort((a, b) => a[1] - b[1]).slice(0, 5);
      $('mu-near').innerHTML = `<div class="msg"><strong>${esc(o.nearbyLabel || 'קרוב לכתובת')}</strong></div><div class="bar">` + L.map(([p, d]) => `<button class="mu" data-mu-sel="${esc(p.id)}">${esc(p.name)} · ${MC.widthLabel(d)}</button>`).join('') + '</div>';
    }
    function refresh() { draw(); showSel(); updDl(); }
    function selectPt(id) { if (S.mode === 'globe') S.mode = 'map'; S.pick = null; S.sel = String(id); const p = selPt(); if (p) { S.lat = p.lat; S.lon = p.lon; S.zoom = Math.max(S.zoom, 3); } S.street = null; refresh(); }
    function goTo(lat, lon, zoom, label) { if (S.mode === 'globe') S.mode = 'map'; S.lat = lat; S.lon = lon; S.zoom = zoom; S.sel = null; S.street = null; S.mark = label ? { lat, lon, label } : null; S.from = [lat, lon]; S.fromLabel = label || ''; S.route = null; S.pick = null; refresh(); nearList([lat, lon]); }

    // ── שכבות ──
    function popHTML() {
      const row = (key, glyph, name, sub, on, dis) => `<label class="mu-row${dis ? ' off' : ''}"><span class="mu-g${key === 'pts' ? '' : ' alt'}">${esc(glyph)}</span><span class="mu-t">${esc(name)}${sub ? `<small>${esc(sub)}</small>` : ''}</span><input type="checkbox" class="mu-sw" data-mu-layer="${esc(key)}"${on ? ' checked' : ''}${dis ? ' disabled' : ''}></label>`;
      return `<h5>שכבות בתוסף</h5>`
        + row('pts', o.glyph || '•', o.layerName || 'נקודות', pts.length + ' במפה', S.show.pts)
        + extra.map(L => row('x-' + L.id, L.glyph || '•', L.name || L.id, L.sub || '', S.show['x-' + L.id])).join('')
        + (extra.some(isUser) ? `<div class="bar"><button class="mu" data-mu="userclear">מחיקת השכבות ששרטטתי / טענתי</button></div>` : '')
        + row('streets', '═', 'רחובות', S.area ? S.areaName || 'נטענו' : 'מתקרבים לעיר בזום', S.show.streets, !S.area)
        + row('syn', '✡', 'בתי כנסת', '', S.show.syn, !S.area)
        + (NE() ? row('base', '◍', 'מפת העולם', 'יבשות, ארצות, ערים ונהרות', S.show.base) : '')
        + `<h5 style="margin-top:.6em">סגנון המפה</h5><div class="mu-styles">${STYLES.map(([k, t, d]) => `<button class="mu" data-mu-style="${k}" title="${esc(d)}" aria-pressed="${S.style === k}">${esc(t)}</button>`).join('')}</div>`
        + (S.route ? row('route', '↝', 'מסלול הליכה', MC.widthLabel(S.route.m), S.show.route) : '')
        + `<h5 style="margin-top:.7em">שכבות מתוספים אחרים</h5>${otherRows(o.self)}`
        + `<p class="msg">השכבה של כל תוסף נפתחת בו, באותו מקום במפה.</p>`;
    }
    const pop = $('mu-pop'), lb = $('mu-lb');
    const togglePop = show => { pop.hidden = show === undefined ? !pop.hidden : !show; if (!pop.hidden) pop.innerHTML = popHTML(); lb.setAttribute('aria-expanded', String(!pop.hidden)); lb.setAttribute('aria-pressed', String(!pop.hidden)); };
    wireOthers(pop, Object.assign({}, o, { online: !off }), () => [S.lat, S.lon]);
    pop.addEventListener('click', e => { const b = e.target.closest('[data-mu-style]'); if (!b) return; S.style = b.dataset.muStyle; S.show.color = S.style !== 'plain'; try { localStorage.setItem('mapui-style', S.style); } catch (er) {} pop.innerHTML = popHTML(); draw(); });
    function modeBar() { const mb = $('mu-modes'); if (mb) mb.querySelectorAll('[data-mu-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.muMode === S.mode))); }
    function setMode(m) {
      const c = o.me || [S.lat, S.lon];
      if (m === 'globe') { S.gz = 1; S.lat = Math.max(-60, Math.min(60, S.lat)); }
      else if (m === 'streets') { if (S.mode === 'globe' || S.zoom < 1) { S.lat = c[0]; S.lon = c[1]; } S.zoom = Math.max(S.zoom, 3); }
      else if (m === 'near') { S.zoom = 0.03; }
      else { S.zoom = 0.0004; }
      S.mode = m; draw();
    }
    pop.addEventListener('change', e => { const c = e.target.closest('[data-mu-layer]'); if (c) { S.show[c.dataset.muLayer] = c.checked; if (/^x-(file|draw)-/.test(c.dataset.muLayer)) saveUser(); if (c.dataset.muLayer === 'color') try { localStorage.setItem('mapui-color', c.checked ? '1' : '0'); } catch (er) {} draw(); } });

    // ── קבצים ──
    async function pickJSON(title) {
      if (!o.call) { say('טעינה מקובץ זמינה בתוך אוצריא.'); return null; }
      const r = await o.call('fs.pickUserFile', { title, extensions: ['json', 'geojson'] });
      if (!r || !r.success || !r.data || r.data.cancelled) return null;
      const t = await o.call('fs.readTextFile', { token: r.data.token });
      try { return JSON.parse(t.data); } catch (e) { say('הקובץ לא נקרא'); return null; }
    }
    async function loadFile() {
      try {
        const j = await pickJSON('בחירת קובץ רחובות (JSON מ-Overpass או קובץ אזור)'); if (!j) return;
        let a; try { a = MC.decodeArea(MC.compactOverpass(j)); } catch (e) { return say(e.message || 'בקובץ אין רחובות'); }
        setArea(a); if (!selPt()) { S.lat = a.lat; S.lon = a.lon; S.zoom = 1.2; }
        say(`הקובץ נטען: ${a.w.length} רחובות${(a.s || []).length ? ' ו-' + a.s.length + ' בתי כנסת' : ''}.`); refresh();
      } catch (e) { say('הקובץ לא נקרא'); }
    }
    async function loadGeo() {
      try {
        const j = await pickJSON('בחירת קובץ שכבה (GeoJSON: נקודות, קווים או פוליגונים)'); if (!j) return;
        const L = MC.toLayer(j, 'file-' + Date.now().toString(36), '◆');
        if (!L.points.length && !L.lines.length) return say('בקובץ אין נקודות או קווים');
        extra.push({ id: L.id, name: 'שכבה מקובץ ' + (extra.length + 1), sub: L.points.length + ' נקודות · ' + L.lines.length + ' קווים', glyph: '◆', points: L.points, lines: L.lines, on: true });
        S.show['x-' + L.id] = true;
        const all = [...L.points, ...L.lines.flatMap(l => l.coords.map(c => ({ lat: c[0], lon: c[1] })))];
        if (all.length) { const keep = pts.slice(); fit(all); void keep; }
        saveUser(); say('השכבה נטענה ונשמרה — תיטען לבד גם בפתיחה הבאה.'); refresh(); if (!pop.hidden) pop.innerHTML = popHTML();
      } catch (e) { say('הקובץ לא נקרא'); }
    }

    // ── חיפוש והצעות ──
    const cityHit = q => { const nq = MC.normHe(q); for (const [n, c] of Object.entries(CITIES())) if (MC.normHe(n) === nq || MC.normHe(c.en || '') === nq) return { n, c }; return null; };
    function suggestions(q) {
      const nq = MC.normHe(MC.expandAliases(q)); if (nq.length < 2) return [];
      const out = [];
      for (const p of pts) if (MC.normHe(p.name + ' ' + (p.sub || '')).includes(nq)) { out.push({ k: 'pt', id: p.id, t: p.name, s: o.layerName || '' }); if (out.length >= 6) break; }
      for (const [n, c] of Object.entries(CITIES())) if (MC.normHe(n).includes(nq) || MC.normHe(c.en || '').includes(nq)) { out.push({ k: 'city', t: n, s: 'עיר', lat: c.lat, lon: c.lon }); if (out.length >= 10) break; }
      if (S.area) { const seen = new Set(); for (const w of S.area.w) { const n = w[0]; if (n && !seen.has(n) && MC.normName(n).includes(MC.normName(q))) { seen.add(n); out.push({ k: 'street', t: n, s: 'רחוב · ' + (S.areaName || '') }); if (seen.size >= 5) break; } } }
      if (NE()) for (const L of NE().labels) if (MC.normHe(L.he).includes(nq)) { out.push({ k: 'geo', t: L.he, s: L.kind === 'city' ? 'עיר בעולם' : L.kind === 'water' ? 'ים / נהר' : 'ארץ / אזור', lat: L.lat, lon: L.lng, z: L.z }); if (out.length >= 16) break; }
      return out.slice(0, 14);
    }
    let sugIdx = -1, sugList = [];
    function renderSug() {
      const box = $('mu-sug'), q = $('mu-q').value.trim();
      sugList = suggestions(q); sugIdx = -1;
      if (!sugList.length) { box.hidden = true; return; }
      box.innerHTML = sugList.map((s, i) => `<button type="button" role="option" data-mu-sug="${i}">${esc(s.t)}<small>${esc(s.s)}</small></button>`).join('');
      box.hidden = false;
    }
    function pickSug(s) {
      $('mu-sug').hidden = true; $('mu-q').value = s.t;
      if (s.k === 'pt') { say('נמצא: ' + s.t); return selectPt(s.id); }
      if (s.k === 'city') { const c = cityHit(s.t); if (c && BUILT) useBuiltin({ n: c.n, c: c.c }); return goTo(s.lat, s.lon, 0.35, s.t); }
      if (s.k === 'geo') return goTo(s.lat, s.lon, Math.pow(2, (s.z || 6) - 16.4) * 1.2, s.t);
      if (s.k === 'street') return search(s.t);
    }
    async function search(qIn) {
      const q = (qIn != null ? qIn : $('mu-q').value || '').trim(); if (!q) return;
      $('mu-sug').hidden = true;
      const qa = MC.expandAliases(q);
      // "רחוב מספר, עיר" / "רחוב מספר עיר"
      const m = qa.match(/^(.+?)\s+(\d{1,4}[א-ת]?)\s*(?:,\s*(.+))?$/);
      const cityPart = m && m[3] ? m[3].trim() : (qa.includes(',') ? qa.split(',').slice(1).join(',').trim() : '');
      const streetPart = (m ? m[1] : qa.split(',')[0]).trim(), num = m ? m[2] : '';
      const c = cityPart ? cityHit(cityPart) : null;
      const finish = () => searchLocal(qa, streetPart, num, cityPart);
      if (c && BUILT && S.areaName !== c.n) return useBuiltin({ n: c.n, c: c.c }, finish);
      if (!c && !S.area && cityHit(qa)) { const h = cityHit(qa); if (BUILT) useBuiltin({ n: h.n, c: h.c }); return goTo(h.c.lat, h.c.lon, 0.35, h.n); }
      return finish();
    }
    async function searchLocal(qa, streetPart, num, cityPart) {
      if (num && !off) {
        try {
          const url = NOMINATIM + '?format=jsonv2&limit=1&accept-language=he&q=' + encodeURIComponent(streetPart + ' ' + num + (cityPart ? ', ' + cityPart : (S.areaName ? ', ' + S.areaName : '')));
          const j = await fetchJSON(url);
          if (Array.isArray(j) && j[0]) { const la = +j[0].lat, lo = +j[0].lon; say('מספר בית מדויק נמצא בחיפוש ברשת'); return goTo(la, lo, 4, streetPart + ' ' + num); }
        } catch (e) { /* בלי רשת: ממשיכים לחיפוש מקומי */ }
      }
      if (S.area) {
        const parts = streetPart.split(/\s+פינת\s+|\s+פינה\s+|\s*[\/&]\s*/).filter(Boolean);
        if (parts.length === 2) {
          const r = MC.findCorner(S.area, parts[0], parts[1]);
          if (!r) return say(`לא נמצא רחוב בשם "${MC.findWays(S.area, parts[0]).length ? parts[1] : parts[0]}"`);
          if (!r.ok) return say('הרחובות לא נפגשים באזור הזה');
          goTo(r.lat, r.lon, 3, parts[0] + ' פינת ' + parts[1]); S.street = { i: r.i, k: r.k }; draw(); return say(`נמצא: ${parts[0]} פינת ${parts[1]}`);
        }
        const r = MC.searchStreet(S.area, streetPart);
        if (r) { goTo(r.lat, r.lon, 3, r.name + (num ? ' ' + num : '')); S.street = { i: r.i, k: r.k }; draw(); return say(num ? 'מוצג הרחוב; מספר בית מדויק דורש חיבור לאינטרנט' : `נמצא: ${r.name}`); }
      }
      const nq = MC.normHe(qa), hit = pts.find(p => MC.normHe(p.name + ' ' + (p.sub || '')).includes(nq));
      if (hit) { say('נמצא: ' + hit.name); return selectPt(hit.id); }
      const s = suggestions(qa)[0]; if (s) return pickSug(s);
      if (!off) {
        try { const j = await fetchJSON(NOMINATIM + '?format=jsonv2&limit=1&accept-language=he&q=' + encodeURIComponent(qa)); if (Array.isArray(j) && j[0]) return goTo(+j[0].lat, +j[0].lon, 2, qa); } catch (e) {}
      }
      say(S.area ? `לא נמצא: "${qa}"` : `לא נמצא: "${qa}". לרחוב: מתקרבים לעיר או כותבים "רחוב מספר, עיר".`);
    }
    $('mu-sf').addEventListener('submit', e => { e.preventDefault(); if (sugIdx >= 0 && sugList[sugIdx]) pickSug(sugList[sugIdx]); else search(); });
    let sugT = 0;
    $('mu-q').addEventListener('input', () => { clearTimeout(sugT); sugT = setTimeout(renderSug, 120); });
    $('mu-q').addEventListener('keydown', e => {
      const box = $('mu-sug'); if (box.hidden) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sugIdx = (sugIdx + (e.key === 'ArrowDown' ? 1 : -1) + sugList.length) % sugList.length; box.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === sugIdx)); }
      else if (e.key === 'Escape') box.hidden = true;
    });
    $('mu-sug').addEventListener('click', e => { const b = e.target.closest('[data-mu-sug]'); if (b) pickSug(sugList[+b.dataset.muSug]); });

    // ── גרירה, צביטה, גלגלת ומקלדת ──
    const ptrs = new Map(); let drag = null, pinch = null;
    const svgK = () => { const svg = view.querySelector('svg'); return svg ? svg.getBoundingClientRect().width / W : 1; };
    const panBy = (dx, dy, from) => {
      if (S.mode === 'globe') { const k = 90 / (Math.min(W, H) * .46 * S.gz); S.lon = ((from.lon - dx * k + 540) % 360) - 180; S.lat = Math.max(-85, Math.min(85, from.lat + dy * k)); return; }
      const v = MC.createView({ lat: from.lat, lon: from.lon, zoom: S.zoom, rot: S.rot, width: W, height: H }); const ll = MC.unproject(v, W / 2 - dx, H / 2 - dy); S.lat = ll[0]; S.lon = ll[1]; };
    const zoomBy = f => { if (S.mode === 'globe') { S.gz = Math.max(.5, Math.min(40, S.gz * f)); if (S.gz >= 40) { S.mode = 'map'; S.zoom = 0.002; } } else { S.zoom = Math.max(ZMIN, Math.min(ZMAX, S.zoom * f)); if (S.zoom < 0.00012 && f < 1) { S.mode = 'globe'; S.gz = 1.6; } } draw(); };
    view.addEventListener('pointerdown', e => {
      ptrs.set(e.pointerId, [e.clientX, e.clientY]); try { view.setPointerCapture(e.pointerId); } catch (err) {}
      if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, lat: S.lat, lon: S.lon, moved: false };
      else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: S.zoom }; drag = null; }
    });
    view.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; S.zoom = Math.max(ZMIN, Math.min(ZMAX, pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / (pinch.d || 1))); return draw(); }
      if (!drag) return;
      const k = svgK(), dx = (e.clientX - drag.x) / k, dy = (e.clientY - drag.y) / k;
      if (!drag.moved && Math.hypot(dx, dy) < 4) return; drag.moved = true;
      panBy(dx, dy, drag); draw();
    });
    const end = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (drag) { const was = drag; setTimeout(() => { if (drag === was) drag = null; }, 0); } };
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => view.addEventListener(t, end));
    view.addEventListener('wheel', e => { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.25 : 0.8); }, { passive: false });
    view.addEventListener('dblclick', e => { e.preventDefault(); S.zoom = Math.min(ZMAX, S.zoom * 2); draw(); });
    view.addEventListener('keydown', e => {
      const st = 40, k = e.key;
      if (k === '+' || k === '=') S.zoom = Math.min(ZMAX, S.zoom * 1.4);
      else if (k === '-' || k === '_') S.zoom = Math.max(ZMIN, S.zoom / 1.4);
      else if (k === ']') S.rot = (S.rot + 15) % 360; else if (k === '[') S.rot = (S.rot + 345) % 360;
      else if (k === 'n' || k === 'N' || k === 'מ') S.rot = 0;
      else if (k === 'ArrowLeft') panBy(st, 0, S); else if (k === 'ArrowRight') panBy(-st, 0, S);
      else if (k === 'ArrowUp') panBy(0, st, S); else if (k === 'ArrowDown') panBy(0, -st, S);
      else if (k === 'Escape' && !$('mu-guide').hidden) guide(null);
      else if (k === 'Escape' && !$('mu-info').hidden) $('mu-info').hidden = true;
      else if (k === 'Escape' && el.classList.contains('mu-full')) { el.classList.remove('mu-full'); $('mu-fullb').setAttribute('aria-pressed', 'false'); }
      else return;
      e.preventDefault(); draw();
    });

    // ── הדרכה שלב אחר שלב + הורדה (2.1) ──
    const me = PLUGINS.find(p => p.id === o.self) || { name: o.layerName || 'התוסף', store: '' };
    const gLinks = () => [o.repo ? ['הורדה מ-GitHub', o.repo + '/releases/latest'] : null, me.store ? ['חנות התוספים של אוצריא', me.store] : null].filter(Boolean);
    const STEPS = () => (o.guide || []).concat([
      { t: 'הזזה וזום', d: 'גוררים את המפה בעכבר (או באצבע). גלגלת, צביטה או כפתורי + ו-− לזום. במקלדת: חיצים, + ו-−.' },
      { t: 'סיבוב וצפון', d: 'כפתורי החצים המעוגלים מסובבים את המפה. המצפן מחזיר את הצפון למעלה. במקלדת: [ ו-] לסיבוב, N לצפון.' },
      { t: 'חיפוש', d: 'בשורת החיפוש כותבים מקום, עיר, רחוב, פינה ("הרצל פינת בן יהודה") או כתובת עם מספר בית ("רבי עקיבא 12, בני ברק"). בוחרים מהצעות בחצים ו-Enter.' },
      { t: (o.layerName || 'נקודות') + ' במפה', d: 'לחיצה על נקודה פותחת כרטיס עם הפרטים' + (o.onPick ? ' וכפתור "' + (o.pickLabel || 'פתיחה ברשימה') + '"' : '') + (off ? '.' : ', וניווט ב-Waze או ב-Google Maps.') + ' ✕ סוגר את הכרטיס.' },
      routeOn ? { t: 'מסלול הליכה (בלי אינטרנט)', d: 'מחפשים קודם את נקודת המוצא (רחוב, פינה או כתובת) או "המיקום שלי", בוחרים נקודה ולוחצים "מסלול הליכה". המסלול מצויר על הרחובות עם מרחק וזמן משוער, ונשאר גם אחרי סגירת הכרטיס. "הוראות שלב אחר שלב" מראה לאן לפנות בכל רחוב, ו"הורדת הסבר המסלול" שומרת את המפה וההוראות לקובץ. אפשר גם ללחוץ על רחוב ← "נקודת מוצא מכאן" או "מסלול הליכה לכאן".' } : null,
      { t: 'בחירת רחוב', d: 'לחיצה על רחוב במפה מסמנת אותו ומראה את שמו ואורכו, עם "נקודת מוצא מכאן" ו"מסלול הליכה לכאן".' },
      { t: 'רחובות', d: o.builtinStreets ? 'רחובות של ערים רבות מובנים בתוסף ונטענים לבד כשמתקרבים לעיר בזום. לעיר אחרת: "רחובות, נתונים ועזרה" ← טעינת רחובות מקובץ.' : 'מתקרבים לעיר ומורידים את קובץ הרחובות שלה, ואז "טעינת רחובות מקובץ" (מתחת למפה).' },
      { t: 'הוספת קבצים ושרטוט', d: 'כפתור + פותח טעינת קובץ רחובות לעיר שאינה מובנית, שכבה מקובץ GeoJSON (נקודות, קווים ופוליגונים — למשל קו עירוב), ו"שרטוט קו או שטח": לוחצים על המפה נקודה אחר נקודה, ושומרים כשכבה וכקובץ.' },
      { t: 'שכבות ותוספים אחרים', d: 'כפתור השכבות מדליק ומכבה שכבות (רחובות, בתי כנסת, מפת העולם, מפה צבעונית, המסלול), ופותח תוספים אחרים — כיוון תפילה, מקוואות, גבולות עירוב, עינים למקרא — באותו מקום במפה.' },
      { t: 'מסך מלא ומרכוז', d: 'כפתור המסך המלא מגדיל את המפה לכל החלון (Esc חוזר). כפתור המרכוז מראה שוב את כל הנקודות.' },
      { t: 'שמירת ההדרכה', d: 'הכפתור "הורדת ההדרכה" שומר קובץ עם כל השלבים, צילום של המפה כפי שהיא עכשיו וקישורי ההורדה של התוסף.' }
    ]).filter(Boolean);
    let gi = 0;
    function guide(i) {
      const L = STEPS(), g = $('mu-guide'); if (i == null) { g.hidden = true; return; }
      gi = Math.max(0, Math.min(L.length - 1, i)); const st = L[gi];
      g.hidden = false;
      g.innerHTML = `<div class="mu-glass"><button type="button" class="mu-ib mu-x" data-mu="gclose" title="סגירה" aria-label="סגירה">${ic('close')}</button>
        <div class="mu-step">הדרכה · שלב ${gi + 1} מתוך ${L.length}</div><h3>${esc(st.t)}</h3><p>${esc(st.d)}</p>
        <div class="mu-dots">${L.map((x, k) => `<i class="${k === gi ? 'on' : ''}"></i>`).join('')}</div>
        <div class="bar"><button class="mu" data-mu="gprev"${gi ? '' : ' disabled'}>הקודם</button>${gi < L.length - 1 ? '<button class="mu pri" data-mu="gnext">הבא</button>' : '<button class="mu pri" data-mu="gclose">סיום</button>'}<button class="mu" data-mu="gdl" style="margin-inline-start:auto">הורדת ההדרכה</button></div></div>`;
      const f = g.querySelector('[data-mu="gnext"],[data-mu="gclose"]'); if (f) f.focus();
    }
    async function guideFile() {
      const L = STEPS(), links = gLinks();
      let more = ''; try { if (o.guideExtra) more = await o.guideExtra(S.sel) || ''; } catch (e) {}   // 2.2: תוכן נוסף מהתוסף (למשל מפת העירוב של העיר)
      const svg = (view.querySelector('svg') || {}).outerHTML || '';
      const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>הדרכה למפה · ${esc(me.name)}</title>
<style>:root{--color-primary:#3f6fa8;--color-on-primary:#fff;--color-surface:#fff;--color-on-surface:#1b1b1f;--color-on-surface-variant:#5f6368;--color-outline:#888;--color-error:#c62828}
body{font-family:system-ui,"Segoe UI",Arial,sans-serif;max-width:46em;margin:2em auto;padding:0 1em;line-height:1.6;color:#1b1b1f}
h1{font-size:1.4em}figure{margin:1em 0;border:1px solid #ccc;border-radius:12px;overflow:hidden}figure svg{display:block;width:100%;height:auto;background:#f5f6f8}
figcaption{font-size:.85em;color:#555;padding:.4em .8em}ol li{margin:.5em 0}footer{margin-top:2em;border-top:1px solid #ccc;padding-top:1em;font-size:.95em}</style></head><body>
<h1>הדרכה למפה — ${esc(me.name)}</h1><p>מפה משותפת לתוספי אוצריא (גרסת מפה ${VERSION}). עובדת בלי אינטרנט.</p>
${svg ? `<figure>${svg}<figcaption>המפה כפי שהייתה בזמן שמירת ההדרכה${S.areaName ? ' · ' + esc(S.areaName) : ''}${S.route ? ' · ' + routeMsg(S.route) : ''}</figcaption></figure>` : ''}
<ol>${L.map(x => `<li><strong>${esc(x.t)}</strong> — ${esc(x.d)}</li>`).join('')}</ol>
${more}
<footer><strong>להורדת התוסף ${esc(me.name)}:</strong><ul>${links.map(([a, u]) => `<li>${esc(a)}: <a href="${esc(u)}">${esc(u)}</a></li>`).join('')}</ul>
<p>התקנה: באוצריא ← כלים ← תוספים ← התקן תוסף חדש. © OpenStreetMap contributors · Natural Earth.</p></footer></body></html>`;
      try {
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
        a.download = 'הדרכה למפה - ' + me.name + '.html'; document.body.append(a); a.click(); a.remove();
        say('ההדרכה נשמרה (קובץ HTML עם המפה וקישורי ההורדה).');
      } catch (e) { say('השמירה לא הצליחה'); }
    }

    // ── שרטוט קו / שטח (2.2): לחיצות על המפה מוסיפות נקודות; שמירה כשכבה וכקובץ GeoJSON ──
    // 3.1: סרגל "עט" קומפקטי — קו / שטח / ביטול / ניקוי / צבע / שמירה (בלי חלונית גדולה). Ctrl+Z ביטול, Enter שמירה, Esc יציאה.
    const PENS = 5;
    function drawBar() {
      const d = $('mu-draw'), pb = $('mu-penb'); el.classList.toggle('mu-drawing', !!S.draw); if (pb) pb.setAttribute('aria-pressed', String(!!S.draw));
      if (!S.draw) { d.hidden = true; return; }
      const n = S.draw.pts.length; let len = 0; for (let i = 1; i < n; i++) len += MC.distM(S.draw.pts[i - 1], S.draw.pts[i]);
      const b = (a, icn, t, dis, pr) => `<button type="button" class="mu-ib" data-mu="${a}" title="${t}" aria-label="${t}"${dis ? ' disabled' : ''}${pr != null ? ` aria-pressed="${pr}"` : ''}>${ic(icn)}</button>`;
      let sw = ''; for (let i = 1; i <= PENS; i++) sw += `<button type="button" class="sw sw${i}" data-mu="dcol" data-col="${i}" title="צבע ${i}" aria-label="צבע ${i}" aria-pressed="${S.draw.col === i}"></button>`;
      d.hidden = false;
      d.innerHTML = b('dline', 'pline', 'קו', false, !S.draw.closed) + b('darea', 'parea', 'שטח', false, S.draw.closed) + '<span class="sep"></span>'
        + b('dundo', 'undo', 'ביטול נקודה (Ctrl+Z)', !n) + b('dclear', 'trash', 'ניקוי', !n) + '<span class="sep"></span>' + sw + '<span class="sep"></span>'
        + `<span class="cnt">${n ? n + ' נק׳' + (n > 1 ? ' · ' + esc(MC.widthLabel(len)) : '') : 'לחצו על המפה'}</span>`
        + b('dsave', 'save', 'שמירה כשכבה וכקובץ (Enter)', n < 2) + b('dend', 'close', 'סגירת העט (Esc)');
    }
    el.addEventListener('keydown', e => {
      if (!S.draw || (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName))) return;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z' || e.key === 'ז')) { e.preventDefault(); S.draw.pts.pop(); drawBar(); draw(); }
      else if (e.key === 'Enter') { e.preventDefault(); drawSave(); }
      else if (e.key === 'Escape') { e.preventDefault(); S.draw = null; drawBar(); draw(); }
    }, LO);
    function drawSave() {
      const L = S.draw; if (!L || L.pts.length < 2) return;
      const coords = L.pts.map(c => [+c[1].toFixed(6), +c[0].toFixed(6)]), HEX = ['', '#c62828', '#1565c0', '#2e7d32', '#ef6c00', '#6a1b9a'];
      const nm = 'שרטוט ' + (extra.filter(x => /^draw-/.test(x.id)).length + 1);
      const gj = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: nm, source: me.name, stroke: HEX[L.col] }, geometry: L.closed ? { type: 'Polygon', coordinates: [[...coords, coords[0]]] } : { type: 'LineString', coordinates: coords } }] };
      const lay = MC.toLayer(gj, 'draw-' + Date.now().toString(36), '◆');
      for (const ln of lay.lines) { ln.color = `var(--mu-pen${L.col}, ${HEX[L.col]})`; ln.solid = true; }
      extra.push({ id: lay.id, name: nm, sub: L.closed ? 'שטח' : 'קו', glyph: '◆', points: [], lines: lay.lines, on: true }); S.show['x-' + lay.id] = true;
      try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(gj, null, 1)], { type: 'application/geo+json' })); a.download = nm + ' - ' + me.name + '.geojson'; document.body.append(a); a.click(); a.remove(); } catch (e) {}
      S.draw = null; drawBar(); saveUser(); refresh(); say('השרטוט נשמר כשכבה (תיטען לבד בפתיחה הבאה) וכקובץ GeoJSON.');
    }

    // ── לחיצות ──
    el.addEventListener('click', e => {
      const t = e.target;
      const g = t.closest && t.closest('#mu-view g[data-id]');
      if (g && !(drag && drag.moved)) { if (g.dataset.id && g.dataset.id.indexOf('__') !== 0) return selectPt(g.dataset.id); return; }
      const stp = t.closest && t.closest('[data-mu-step]');
      if (stp && S.route) { const st = S.route.steps[+stp.dataset.muStep]; if (st && st.at) { S.lat = st.at[0]; S.lon = st.at[1]; S.zoom = Math.max(S.zoom, 3); S.mark = { lat: st.at[0], lon: st.at[1], label: st.text.split(' · ')[0] }; draw(); } return; }
      if (S.mode !== 'globe' && S.draw && t.closest && t.closest('#mu-view') && !(drag && drag.moved) && view._v) {   // 2.2: שרטוט
        const svg = view.querySelector('svg'), r = svg.getBoundingClientRect();
        S.draw.pts.push(MC.unproject(view._v, (e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height)); drawBar(); draw(); return;
      }
      // 2.1: לחיצה על רחוב בוחרת אותו (כמו בכיוון תפילה)
      if (S.mode !== 'globe' && t.closest && t.closest('#mu-view') && !(drag && drag.moved) && S.area && S.show.streets && view._v) {
        const svg = view.querySelector('svg'), r = svg.getBoundingClientRect(), v = view._v;
        const ll = MC.unproject(v, (e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height);
        const w = MC.nearestWay(S.area, ll, 14 / (v.scale * r.width / W));
        if (w) { S.pick = w; S.sel = null; S.street = { i: w.i, k: w.k }; refresh(); return; }
      }
      const open = t.closest && t.closest('[data-mu-open]'); if (open) { if (o.openLink) o.openLink(open.dataset.muOpen); return; }
      const sp = t.closest && t.closest('[data-mu-sel]'); if (sp) return selectPt(sp.dataset.muSel);
      const md = t.closest && t.closest('[data-mu-mode]'); if (md) return setMode(md.dataset.muMode);
      const b = t.closest && t.closest('[data-mu]'); if (!b) return;
      const a = b.dataset.mu;
      if (a === 'in') zoomBy(1.5);
      else if (a === 'out') zoomBy(1 / 1.5);
      else if (a === 'rotl') { S.rot = (S.rot + 345) % 360; draw(); }
      else if (a === 'rotr') { S.rot = (S.rot + 15) % 360; draw(); }
      else if (a === 'north') { S.rot = 0; draw(); }
      else if (a === 'me') {
        const go = () => { S.lat = o.me[0]; S.lon = o.me[1]; S.zoom = Math.max(S.zoom, 2); S.from = o.me.slice(); refresh(); nearList(o.me); };
        if (o.me) return go();
        say('מאתר את המיקום…');
        locate(o).then(p => { if (!p) return say('המיקום לא נמצא. בלי הגשר "אחת שאלתי" — חפשו את הכתובת בשורת החיפוש.'); o.me = p; say(p.how ? 'המיקום ' + p.how : ''); go(); });
      }
      else if (a === 'fit') { S.sel = null; S.street = null; S.mark = null; fit(); refresh(); }
      else if (a === 'full') { const f = el.classList.toggle('mu-full'); b.setAttribute('aria-pressed', String(f)); draw(); }
      else if (a === 'layers') togglePop();
      else if (a === 'guide') guide(0);
      else if (a === 'gnext') guide(gi + 1);
      else if (a === 'gprev') guide(gi - 1);
      else if (a === 'gclose') guide(null);
      else if (a === 'gdl') guideFile();
      else if (a === 'jer') {
        if (o.onJerusalem) return o.onJerusalem();
        S.jer = !S.jer; b.setAttribute('aria-pressed', String(S.jer));
        if (S.jer) { const f = o.me || [S.lat, S.lon]; S.lat = (f[0] + JERUSALEM[0]) / 2; S.lon = (f[1] + JERUSALEM[1]) / 2; S.zoom = Math.max(ZMIN, Math.min(3, 300 / (MC.distM(f, JERUSALEM) * .65 || 1))); }
        draw();
      }
      else if (a === 'unsel') { S.sel = null; refresh(); }
      else if (a === 'noroute') { S.route = null; S.showSteps = false; refresh(); }
      else if (a === 'unpick') { S.pick = null; S.street = null; refresh(); }
      else if (a === 'from-here') { const w = S.pick; if (w) { S.from = [w.lat, w.lon]; S.fromLabel = w.name; S.mark = { lat: w.lat, lon: w.lon, label: 'מוצא: ' + w.name }; say('נקודת המוצא: ' + w.name + '. עכשיו בחרו יעד ולחצו "מסלול הליכה".'); S.pick = null; refresh(); nearList([w.lat, w.lon]); } }
      else if (a === 'route-street') { const w = S.pick; if (w) makeRoute([w.lat, w.lon], '__street', w.name); }
      else if (a === 'draw' || a === 'pen') { $('mu-add').hidden = true; if (a === 'pen' && S.draw) { S.draw = null; drawBar(); draw(); return; } let col = 1; try { col = +localStorage.getItem('mapui-pen') || 1; } catch (er) {} S.draw = { pts: [], closed: false, col }; S.pick = null; drawBar(); showSel(); say('עט: לחצו על המפה נקודה אחר נקודה'); }
      else if (a === 'dline' || a === 'darea') { S.draw.closed = a === 'darea'; drawBar(); draw(); }
      else if (a === 'dclear') { S.draw.pts = []; drawBar(); draw(); }
      else if (a === 'dcol') { S.draw.col = +b.dataset.col || 1; try { localStorage.setItem('mapui-pen', String(S.draw.col)); } catch (er) {} drawBar(); draw(); }
      else if (a === 'dundo') { S.draw.pts.pop(); drawBar(); draw(); }
      else if (a === 'dsave') drawSave();
      else if (a === 'dend') { S.draw = null; drawBar(); draw(); }
      else if (a === 'steps') { S.showSteps = !S.showSteps; showSel(); }
      else if (a === 'routedl') routeFile();
      else if (a === 'userclear') { for (let i = extra.length - 1; i >= 0; i--) if (isUser(extra[i])) { delete S.show['x-' + extra[i].id]; extra.splice(i, 1); } saveUser(); refresh(); if (!pop.hidden) pop.innerHTML = popHTML(); say('השכבות שלי נמחקו.'); }
      else if (a === 'info' || a === 'infox') { const ip = $('mu-info'); ip.hidden = a === 'infox' ? true : !ip.hidden; $('mu-infob').setAttribute('aria-expanded', String(!ip.hidden)); }
      else if (a === 'add') { const ap = $('mu-add'); ap.hidden = !ap.hidden; b.setAttribute('aria-expanded', String(!ap.hidden)); }
      else if (a === 'load') { $('mu-add').hidden = true; loadFile(); }
      else if (a === 'loadgeo') { $('mu-add').hidden = true; loadGeo(); }
      else if (a === 'dl') { const sl = b.dataset.slug; if (!sl) return say('אין קובץ רחובות מוכן לעיר הזו. אפשר לנסות מקור חלופי.'); say('ההורדה נפתחה בדפדפן. אחריה: "טעינת רחובות מקובץ".'); if (o.openLink) o.openLink((window.STREETS_BASE || '') + sl + '.json'); }
      else if (a === 'url' || a === 'url2') { $('mu-add').hidden = true; const u = MC.overpassUrl(S.lat, S.lon, 1500, a === 'url2' ? 1 : 0); say('נפתח בדפדפן. שומרים את הקובץ (Ctrl+S) ואז "טעינת רחובות מקובץ".'); if (o.openLink) o.openLink(u); }
      else if (a === 'route') { const p = selPt(); if (p) makeRoute([p.lat, p.lon], S.sel, p.name); }
      else if (a === 'pick') { const p = selPt(); if (p && o.onPick) o.onPick(p.id); }
      else if (a === 'soon') say('בפיתוח: הפעולה הזו עדיין לא קיימת. מחכה לעזרה.');
    }, LO);
    document.addEventListener('pointerdown', e => {
      if (!el.isConnected) return;
      if (!pop.hidden && !pop.contains(e.target) && !lb.contains(e.target)) togglePop(false);
      const ip = $('mu-info'); if (ip && !ip.hidden && !ip.contains(e.target) && !$('mu-infob').contains(e.target)) { ip.hidden = true; $('mu-infob').setAttribute('aria-expanded', 'false'); }
      const ap = $('mu-add'); if (ap && !ap.hidden && !ap.contains(e.target) && !$('mu-addb').contains(e.target)) ap.hidden = true;
      const sf = $('mu-sf'); if (sf && !sf.contains(e.target)) $('mu-sug').hidden = true;
    }, LO);
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => draw()).observe(view);
    refresh();
    restoreUser();
    return { state: S, refresh, select: selectPt, goTo };
  }

  return { mount, layersButton, onOpenMap, locate, PLUGINS, EN, CSS, VERSION, JERUSALEM };
});
