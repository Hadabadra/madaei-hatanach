// כרטיס הערך המלא: סכימת השדות, קישורי משפחה, מפה ורינדור.
// נוצר בפיצול router.js (גרסה 2.11.2). המקור: shell/router.js שורות 731-1141.
// אין להפוך ל-type="module" — כל הקבצים חולקים scope גלובלי אחד.

// מאגרי המדריכים לא אחידים בשמות השדות של מקורות חז״ל: מקומות משתמש ב-{source,note,link}
// ואישים/בע״ח/צומח/דומם ב-{ref,text}. עד כה השַׁלֶּה קרא רק source/note ולכן בכל כרטיס
// אישים הוצגה תיבה ריקה תחת "מקורות חז״ל". שני העוזרים האלה מקבלים את שתי הצורות.
function midrashSource(m){ return (m && (m.source || m.ref)) || ''; }
function midrashNote(m){ return (m && (m.note || m.text)) || ''; }

function fieldBlock(label, value){
  if (value == null || value === '' || (Array.isArray(value) && !value.length)) return '';
  const text = Array.isArray(value) ? value.join(', ') : value;
  return `<div class="field-label">${esc(label)}</div><p>${esc(text)}</p>`;
}

// shortModernId עבר ל-shell/core.js ב-2.17.2: גם עמוד הרקע (background.html) בונה
// את שורות פופאפ הזיהוי, והוא לא טוען את הקובץ הזה.

// ---- קישורים בין אישים (אב/אם/בני זוג/ילדים/אחים לחיצים, כמו במדריך המקורי) ----
const PERSON_LINK_FIELDS = new Set(['father','mother','spouses','children','siblings']);
function isPersonEntry(entry){ return (dataCache['people'] || []).indexOf(entry) !== -1; }
function findPersonEntry(raw){
  const data = dataCache['people'] || [];
  const core = s => normalizeHeb(String(s||'').replace(/\s*\([^)]*\)\s*$/, ''));
  const norm = core(raw);
  if (!norm) return null;
  return data.find(e => core(e.name) === norm ||
    (e.aliases || []).some(a => core(a) === norm)) || null;
}
// ת.1ב (#67): כשלרשומה יש relIds — הקישור לפי id (האדם הנכון, גם כשיש כמה בשם הזה),
// ו-null = לא מקשרים בכלל (סתירה/דו-משמעות): עדיף בלי קישור מקישור לאדם הלא נכון.
// בלי relIds (רשומה ישנה/אישית) — כמו קודם, לפי שם.
function findPersonById(pid){
  if (!pid) return null;
  return (dataCache['people'] || []).find(e => e.id === pid) || null;
}
function personLinkedValue(value, selfEntry, field){
  const list = Array.isArray(value) ? value : [value];
  const rel = selfEntry && selfEntry.relIds && field ? selfEntry.relIds[field] : undefined;
  const relList = rel === undefined ? null : (Array.isArray(rel) ? rel : [rel]);
  return list.map((name, i) => [name, i]).filter(([v]) => v != null && v !== '').map(([name, i]) => {
    if (relList){
      const target = findPersonById(relList[i]);
      if (target && target !== selfEntry) return `<span class="person-link" data-person="${esc(name)}" data-person-id="${esc(target.id)}">${esc(name)}</span>`;
      return esc(name);
    }
    const target = findPersonEntry(name);
    if (target && target !== selfEntry) return `<span class="person-link" data-person="${esc(name)}">${esc(name)}</span>`;
    return esc(name);
  }).join(' · ');
}

// ---- קישור ממקום בכרטיס אישים אל כרטיס המקומות (עם המפה) ----
// שדות המקום של אישים אינם שם נקי אלא טקסט חופשי: ״מערת המכפלה בחברון״, ״ואז ארץ
// כנען ומצרים לתקופה״, ״עפרה (קברו)״. לכן לא מחפשים התאמה מלאה של השדה אלא סורקים
// אותו מילה-מילה, בדיוק כמו מנוע הזיהוי — ומעדיפים צירוף ארוך (״אור כשדים״, ״פדן
// ארם״) על פני מילה בודדת, כדי לא לקשר את ״אור״ לבדו.
const PLACE_LINK_FIELDS = new Set(['birthPlace','dwelling','deathPlace','burialPlace']);
const HEB_WORD_RE = new RegExp('(?:[א-ת]' + HEB_POINT_SRC + '*)+', 'g');
// מילות יחס שהן גם שם של מקום אמיתי במדריך — ״תחת״ היא תחנת מסע (במדבר לג), ולכן
// ״תחת תומר דבורה״ נקשר אליה. כמילה בודדת לא מקשרים אותן; בתוך צירוף (״תחת״ כשם
// עצמאי בשדה) עדיין ייתפסו דרך התאמת הצירוף.
const PLACE_LINK_SKIP_WORDS = new Set(['תחת','בין','אצל','ליד','עם','אל','על','מן','עד','שם','מול','סביב','לפני','אחרי','כאן','אז','ואז']);

// אינדקס של **שמות שלמים** בלבד (שם, שם בלי הסוגריים, תוכן הסוגריים, כינויים) —
// ובמכוון לא buildLookup של מנוע הזיהוי, שרושם גם כל מילה בתוך שם רב-מילים. שם
// חלקי מתאים לזיהוי בפסוק, אבל כאן הוא מקשר לכרטיס הלא נכון: ״אלון בצענים״ נקשר
// ל״אלון בכות״ ו״בית לחם יהודה״ ל״מדבר יהודה״. נמדד: 99 שדות מקושרים עם מילים
// חלקיות מול 89 בלעדיהן — עשרה קישורים פחות, וכולם היו שגויים או מטעים.
// מוחזר null כל עוד מדריך המקומות לא נטען; ר' refreshPlaceLinksWhenReady.
let placeNameIndex = null;
function placesNameIndex(){
  if (placeNameIndex) return placeNameIndex;
  const data = dataCache['places'];
  if (!data || !data.length) return null;
  const idx = new Map();
  const put = (s, e) => { const n = normalizeHeb(s); if (n && n.length >= 2 && !idx.has(n)) idx.set(n, e); };
  data.forEach(e => {
    let core = e.name || '', paren = '';
    const pm = core.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    if (pm){ core = pm[1]; paren = pm[2]; }
    put(core, e);
    if (paren) put(paren, e);
    (e.aliases || []).forEach(a => put(a, e));
  });
  placeNameIndex = idx;
  return idx;
}
function invalidatePlaceNameIndex(){ placeNameIndex = null; }

// התאמה מדויקת בלבד (כולל תחיליות/סיומות דרך candidateForms) — בלי כתיב חסר,
// שמייצר בטקסט חופשי קצר יותר רעש מתועלת.
function lookupPlaceByPhrase(phrase, allowForms){
  const idx = placesNameIndex();
  if (!idx) return null;
  const norm = normalizeHeb(phrase);
  if (norm.length < 2) return null;
  if (!allowForms) return idx.has(norm) ? idx.get(norm) : null;
  if (GENERIC_DESCRIPTORS.has(norm) || STOPWORDS.has(norm) || PLACE_LINK_SKIP_WORDS.has(norm)) return null;
  if (idx.has(norm)) return idx.get(norm);
  for (const f of candidateForms(phrase)){
    if (f === norm) continue;
    if (GENERIC_DESCRIPTORS.has(f) || STOPWORDS.has(f)) continue;
    if (idx.has(f)) return idx.get(f);
  }
  return null;
}

function findPlaceEntryByName(name){
  const idx = placesNameIndex();
  return (idx && idx.get(normalizeHeb(name))) || null;
}

// סורק טקסט חופשי אחרי מופעי מקום - **רק** דרך lookupPlaceByPhrase/placesNameIndex,
// בלי אינדקס/התאמה משלו. קורא ל-onHit(place, startIdx, endIdx) לפי סדר ההופעה
// בטקסט. משותף להדגשת קישורים (placeLinkedText) ולמפת המסע (2.8, journeyPointsFor).
function scanPlaceMatches(text, onHit){
  if (!placesNameIndex()) return;
  const toks = [];
  let m;
  HEB_WORD_RE.lastIndex = 0;
  while ((m = HEB_WORD_RE.exec(text)) !== null) toks.push({ s: m.index, e: m.index + m[0].length });
  let i = 0;
  while (i < toks.length){
    let hit = null, span = 1;
    for (let len = Math.min(3, toks.length - i); len >= 1; len--){
      const phrase = text.slice(toks[i].s, toks[i + len - 1].e);
      const found = lookupPlaceByPhrase(phrase, len === 1);
      if (found){ hit = found; span = len; break; }
    }
    if (!hit){ i++; continue; }
    onHit(hit, toks[i].s, toks[i + span - 1].e);
    i += span;
  }
}

function placeLinkedText(value){
  const text = Array.isArray(value) ? value.join(', ') : String(value == null ? '' : value);
  if (!placesNameIndex()) return esc(text);
  let out = '', cursor = 0;
  scanPlaceMatches(text, (hit, s, e) => {
    out += esc(text.slice(cursor, s));
    out += `<span class="place-link" data-place="${esc(hit.name)}">${esc(text.slice(s, e))}</span>`;
    cursor = e;
  });
  out += esc(text.slice(cursor));
  return out;
}

// הנקודה הראשונה שבטקסט של השדה - לצורך מפת המסע. שדה מקום הוא טקסט חופשי
// ("מערת המכפלה בחברון") ולא שם נקי, ולכן אין מה "לבחור" מלבד המופע הראשון.
function firstPlaceInText(text){
  let found = null;
  scanPlaceMatches(text, (hit) => { if (!found) found = hit; });
  return found;
}

// ---- מפת מסע לאישיות (2.8): לידה → מגורים → פטירה → קבורה, על אותה מפה אופלין
// (Natural Earth + Leaflet) שכבר משמשת את renderOfflineMiniMap ואת מפת המקומות
// המלאה. אישיות בלי אף מקום עם קואורדינטות - בלי מפה בכלל, לא מפה ריקה.
const JOURNEY_STAGES = [
  { field:'birthPlace',  label:'לידה',   color:'#2E8B57' },
  { field:'dwelling',    label:'מגורים', color:'#1F7FB8' },
  { field:'deathPlace',  label:'פטירה',  color:'#9C4A2E' },
  { field:'burialPlace', label:'קבורה',  color:'#6b5637' },
];
function journeyPointsFor(entry){
  const points = [];
  JOURNEY_STAGES.forEach(stage => {
    const raw = entry[stage.field];
    if (!raw) return;
    const text = Array.isArray(raw) ? raw.join(', ') : String(raw);
    const place = firstPlaceInText(text);
    const geo = place && place.methods && place.methods[0] && place.methods[0].geo;
    if (place && geo && geo.length >= 2){
      points.push({ label: stage.label, color: stage.color, name: place.name, lat: geo[0], lng: geo[1] });
    }
  });
  return points;
}

let journeyMapSeq = 0;
const journeyMapRegistry = new Map(); // id -> points[]
function registerJourneyMap(points){
  const id = 'jm' + (++journeyMapSeq);
  journeyMapRegistry.set(id, points);
  return id;
}
function journeyPinIcon(color, num){
  const s = 27;
  const html = `<svg width="${s}" height="${s}" viewBox="0 0 24 24">
    <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z" fill="${color}" stroke="#FFF8E7" stroke-width="1.3"/>
    <text x="12" y="11.7" text-anchor="middle" font-size="9" font-weight="700" fill="#FFF8E7">${num}</text></svg>`;
  return L.divIcon({ className:'geo-pin', html, iconSize:[s,s], iconAnchor:[s/2,s], popupAnchor:[0,-s+6] });
}
function renderJourneyMap(container, points){
  if (typeof window.L === 'undefined' || typeof addBaseLayers !== 'function' || !points || !points.length){
    container.remove();
    return;
  }
  try {
    const map = L.map(container, { minZoom: 2, maxZoom: MAP_MAX_ZOOM, scrollWheelZoom: false, zoomControl: true });
    map.attributionControl.setPrefix('');
    map.attributionControl.addAttribution('Natural Earth');
    addBaseLayers(map);
    const latlngs = points.map(p => [p.lat, p.lng]);
    if (latlngs.length > 1){
      L.polyline(latlngs, { color: '#6b5637', weight: 2.5, opacity: .75, dashArray: '5,6' }).addTo(map);
    }
    points.forEach((p, i) => {
      L.marker([p.lat, p.lng], { icon: journeyPinIcon(p.color, i + 1) }).addTo(map)
        .bindTooltip((i + 1) + '. ' + p.label + ': ' + p.name, { direction: 'top' });
    });
    if (latlngs.length === 1) map.setView(latlngs[0], 7);
    else map.fitBounds(latlngs, { padding: [26, 26], maxZoom: MAP_MAX_ZOOM });
    setTimeout(() => map.invalidateSize(), 120);
  } catch(e){
    console.warn('madaei-hatanach: journey map failed', e);
    container.textContent = 'מפה לא זמינה כרגע.';
  }
}

// ---- סכימת שדות לכל מדריך ----
// מגדירה אילו שדות "אמורים" להיות בערך של כל מדריך. משמשת לשני דברים:
// 1. בתצוגה - להראות גם שדות **חסרים** (באפור, "—"), כדי שיידעו איזה מידע עוד חסר.
// 2. בעריכה - לפתוח את *כל* השדות לעריכה, לא רק את אלה שכבר מלאים.
const FIELD_LABELS = {
  tribe:'שבט/משפחה', father:'אב', mother:'אם', spouses:'בני/בנות זוג',
  children:'ילדים', siblings:'אחים/אחיות', roles:'תפקיד',
  birthPlace:'מקום לידה', dwelling:'מקום מגורים', deathPlace:'מקום פטירה',
  burialPlace:'מקום קבורה', age:'שנות חיים', note:'הערה',
  explanation:'הסבר', identification:'זיהוי מודרני', region:'נחלה',
  gender:'מין', era:'תקופה', modern:'זיהוי מודרני', latin:'שם מדעי (לטיני)',
  wiki:'ערך ויקיפדיה', confidence:'מידת ודאות', mapQuery:'חיפוש במפה',
  role:'תקופה', dor:'דור', place:'מקום פעילות',
  // ארכיאולוגיה יהודית (3.3.4)
  site:'מקום הגילוי', found:'שנת הגילוי', museum:'היכן מוצג היום', credit:'קרדיט לתמונה', tribes:'שבט', tribeRefs:'נחלת השבט — מקור'
};
// #89: תווית שונה לאותו שדה לפי מדריך
const GUIDE_FIELD_LABELS = { mumim: { region: 'סוג הפסול' } };
function fieldLabel(catId, k){ return ((GUIDE_FIELD_LABELS[catId] || {})[k]) || FIELD_LABELS[k] || k; }
const ARRAY_FIELDS = new Set(['aliases','tribes','spouses','children','siblings','roles']);
const LONG_FIELDS = new Set(['explanation','identification','note','modern']);

const GUIDE_FIELDS = {
  people: ['era','gender','father','mother','spouses','children','siblings','roles','tribe','birthPlace','dwelling','deathPlace','burialPlace','age','note'],
  places: ['region','tribes','tribeRefs','explanation','modern','mapQuery','note','credit'],
  animal: ['explanation','latin','wiki','confidence','note','credit'],
  flora:  ['explanation','latin','wiki','confidence','note','credit'],
  domem:  ['tribe','explanation','identification','note','credit'],
  beithamikdash: ['explanation','identification','note','credit'],
  archaeology: ['site','era','found','museum','note','credit'],
  // #89: שלושת המדריכים המומרים — אותו סדר שדות. ב-mumim השדה region הוא סוג הפסול
  // (״פוסל כהן / בהמה״), ולא הוצג כלל עד כה.
  mumim:  ['region','explanation','modern','note'],
  chullin: ['explanation','note','credit'],
  sukkah: ['explanation','note'],
  // אנשים מהתלמוד: אין שדות זיהוי/משפחה — רק תקופה, דור ומקום פעילות.
  // התיאור הביוגרפי יושב ב-methods[0].explanation כמו בשאר המדריכים.
  amoraim: ['role','dor','place','explanation','note']
};
// שדות שיושבים בתוך methods[0] ולא ישירות על הערך (חי/צומח/מקומות/מקדש)
const METHOD_FIELDS = new Set(['explanation','latin','wiki','confidence','modern','mapQuery']);

// סבב 4.9 — תת-הקבוצה של METHOD_FIELDS שבלוק ה-methods שלמטה מרנדר בעצמו.
// בלעדיה כל אחד מהם הוצג **פעמיים**: פעם דרך לולאת base.forEach (ש-readField
// שולפת עבורה מ-methods[0]) ופעם דרך הבלוק הייעודי. פוגע בכל מדריך שמשתמש
// ב-methods — בע״ח, צומח, מקומות ומומים. `wiki`/`mapQuery` אינם כאן כי הבלוק
// אינו מרנדר אותם, ולכן הם חייבים להישאר בלולאה הרגילה.
const METHOD_BLOCK_FIELDS = new Set(['explanation','latin','confidence','modern']);

function guideFieldsFor(catId, entry){
  const base = GUIDE_FIELDS[catId] || ['explanation','identification','note'];
  // שדות מותאמים אישית שהמשתמש הוסיף לערך הזה (customFields) מוצגים גם הם
  const custom = entry && entry.customFields ? Object.keys(entry.customFields) : [];
  return { base, custom };
}

// קורא ערך שדה בין אם הוא ישיר על הערך ובין אם הוא בתוך methods[0]
function readField(entry, key){
  if (METHOD_FIELDS.has(key)){
    const m0 = entry.methods && entry.methods[0];
    if (m0 && m0[key] != null && m0[key] !== '') return m0[key];
  }
  return entry[key];
}
function writeField(entry, key, value){
  if (METHOD_FIELDS.has(key)){
    if (!entry.methods) entry.methods = [{}];
    if (!entry.methods[0]) entry.methods[0] = {};
    entry.methods[0][key] = value;
    return;
  }
  entry[key] = value;
}
function isEmptyVal(v){
  return v == null || v === '' || (Array.isArray(v) && !v.length);
}

// ---- ערכי הבחנה ----
// רשומה שתפקידה "שם משותף" אינה אדם אלא טבלת מפתח לכמה אישים שנושאים את
// אותו שם. עד כה היא נראתה כמו כרטיס שבור: שמות הווריאנטים היו טקסט מת בתוך
// ההערה (note לא נכלל ב-PERSON_LINK_FIELDS), ומתחת התיבה "פרטים שאינם במדריך"
// מנתה כמעט הכול כחסר - למרות שלטבלת מפתח אין ולא צריך להיות אב, שבט או גיל.
function isDisambigEntry(entry){
  return !!entry && Array.isArray(entry.roles) && entry.roles.indexOf('שם משותף') !== -1;
}
// מחלץ את רשימת הווריאנטים מתוך ההערה ("... האישים עצמם: א · ב · ג.")
function disambigVariants(entry){
  const m = String((entry && entry.note) || '').match(/האישים עצמם:\s*(.+)$/);
  if (!m) return [];
  return m[1].replace(/[.\s]+$/, '').split('·').map(s => s.trim()).filter(Boolean);
}
// אותה הערה בלי רשימת הווריאנטים (הרשימה מוצגת בנפרד, כקישורים)
function disambigIntro(entry){
  return String((entry && entry.note) || '')
    .replace(/\s*—?\s*האישים עצמם:\s*.+$/, '')
    .replace(/\s*הערך הזה הוא ערך הבחנה בלבד\s*/, ' ')
    .trim();
}

// לאיזה מדריך שייך הערך, כשאין הקשר של מדריך פתוח (למשל פתיחה מהאזור האישי או
// משורת החיפוש). מזהה לפי זהות האובייקט בתוך dataCache, ולכן מדויק גם לשמות כפולים.
function catIdOfEntry(entry){
  for (const cat of CATEGORIES){
    const d = dataCache[cat.id];
    if (d && d.indexOf(entry) !== -1) return cat.id;
  }
  return null;
}

// #73 (5.0.0): כרטיס מקום בלי תמונה — תצלום לוויין חי (Sentinel-2 cloudless של EOX, אותו מקור כמו
// שכבת הלוויין במפה, כבר ב-network.allowlist). 0MB לחבילה; בלי רשת — האריחים פשוט לא מוצגים.
// לא מוצג למיקום ״אזורי בלבד״ (נקודה משוערת, תצלום שלה יטעה).
function satelliteThumbHTML(entry){
  const m = entry.methods && entry.methods[0];
  const g = m && m.geo;
  if (!g || !isFinite(g[0]) || !isFinite(g[1]) || /אזורי/.test(m.confidence || '')) return '';
  const z = 14, n = Math.pow(2, z), lat = g[0] * Math.PI / 180;
  const fx = (g[1] + 180) / 360 * n, fy = (1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2 * n;
  const W = 480, H = 220, cx = Math.floor(fx), cy = Math.floor(fy);
  const ox = W / 2 - (fx - cx) * 256, oy = H / 2 - (fy - cy) * 256;
  let tiles = '';
  for (let dx = -2; dx <= 2; dx++) for (let dy = -1; dy <= 1; dy++) {
    const left = ox + dx * 256, top = oy + dy * 256;
    if (left > W || top > H || left < -256 || top < -256) continue;
    tiles += `<img src="https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/${z}/${cy + dy}/${cx + dx}.jpg" alt="" loading="lazy" onerror="this.style.display='none'" style="position:absolute;left:${left}px;top:${top}px;width:256px;height:256px;">`;
  }
  return `<div class="sat-thumb" title="תצלום לוויין" style="position:relative;width:100%;max-width:${W}px;height:${H}px;overflow:hidden;border-radius:10px;margin-bottom:4px;background:var(--surface-2, #ddd);">${tiles}`
    + `<span style="position:absolute;left:${W / 2 - 7}px;top:${H / 2 - 7}px;width:10px;height:10px;border:2px solid #fff;border-radius:50%;background:#d33;"></span></div>`
    + `<div style="font-size:.75em;opacity:.7;margin-bottom:12px;">תצלום לוויין: Sentinel-2 cloudless 2024, EOX</div>`;
}

function renderEntryDetailHTML(entry, catIdOverride){
  const catId = catIdOverride || (currentGuideCat ? currentGuideCat.id : null) || catIdOfEntry(entry);
  const leadImg = catId ? lookupEntryImage(entry, catId) : null;
  const gallery = catId ? lookupEntryGallery(entry, catId) : [];
  const wikiTitle = !leadImg && entry.methods && entry.methods[0] && entry.methods[0].wiki;
  let html = '';
  if (leadImg) html += `<img src="${leadImg}" alt="${esc(entry.name)}" style="max-width:100%;border-radius:10px;margin-bottom:12px;display:block;">`;
  else if (entry.customImage) html += `<img src="${esc(entry.customImage)}" alt="${esc(entry.name)}" style="max-width:100%;border-radius:10px;margin-bottom:12px;display:block;">`;
  else if (wikiTitle) html += `<div data-wiki-lazy="${esc(wikiTitle)}" style="margin-bottom:12px;"></div>`;
  else if (catId === 'places') html += satelliteThumbHTML(entry);
  const bmKey = bookmarkKeyOf(entry);
  const bmOn = !!catId && isBookmarked(catId, bmKey);
  html += `<h2>${esc(entry.name)}`
    + ` <button id="entryBookmarkBtn" class="entry-tool-btn${bmOn ? ' bm-on' : ''}"`
    + ` title="${bmOn ? 'הסרה מהסימניות' : 'הוספה לסימניות (האזור האישי)'}"`
    + ` data-bm-cat="${esc(catId || '')}" data-bm-key="${esc(bmKey)}" data-bm-label="${esc(entry.name)}">${bmOn ? '★' : '☆'}</button>`
    + ` <button id="entryPrintBtn" title="הדפסה" class="entry-tool-btn">🖨️</button>`
    + ((window.Otzaria && Otzaria.call) ? ` <button id="entryPdfBtn" title="שמירה כקובץ PDF" class="entry-tool-btn">📄</button>` : '')
    + ` <button id="entryEditBtn" title="עריכת הכרטיס / הוספת מידע" class="entry-tool-btn">✏️</button>`
    + ` <button id="entryReportBtn" title="דיווח על ערך שגוי או כפול (בלי לערוך)" class="entry-tool-btn">🚩</button></h2>`;
  html += `<div class="entry-sub">כינויים: ${entry.aliases && entry.aliases.length ? esc(entry.aliases.join(', ')) : '<span class="missing-val">— חסר</span>'}</div>`;
  if (entry.__edited) html += `<div class="edited-note">✏️ כרטיס זה נערך על ידכם ונשמר במכשיר זה. לשחזור לגרסת המקור — פתחו את העריכה (✏️) ולחצו "שחזור לגרסת המקור".</div>`;

  const personEntry = isPersonEntry(entry);
  const disambig = isDisambigEntry(entry);
  const { base, custom } = guideFieldsFor(catId, entry);
  const missing = [];

  // ערך הבחנה: תג במקום "תפקיד: שם משותף", ורשימת האישים כקישורים לחיצים
  if (disambig){
    const variants = disambigVariants(entry);
    const intro = disambigIntro(entry);
    html += `<div class="conf-tag">ערך הבחנה</div>`;
    if (intro) html += `<p>${esc(intro)}</p>`;
    if (variants.length){
      html += `<div class="field-label">האישים בשם זה</div><p>` +
        variants.map(n => {
          const target = findPersonEntry(n);
          return target && target !== entry
            ? `<span class="person-link" data-person="${esc(n)}">${esc(n)}</span>`
            : `${esc(n)} <span class="missing-val">(אין כרטיס)</span>`;
        }).join(' · ') + `</p>`;
    }
  }

  // סבב 4.9: האם בלוק ה-methods שלמטה ירוץ בכלל, ואם כן — אילו שדות הוא כבר
  // מציג. שדה שיוצג שם נדלג עליו כאן, אחרת הוא מופיע פעמיים באותו כרטיס.
  const methodsShown = !!(entry.methods && entry.methods.length);
  const renderedInMethodsBlock = (k) => methodsShown && METHOD_BLOCK_FIELDS.has(k)
    && entry.methods.some(m => m && m[k] != null && m[k] !== '');

  base.forEach(k => {
    // אצל ערך הבחנה השניים האלה מוצגים למעלה בצורה טובה יותר
    if (disambig && (k === 'note' || k === 'roles')) return;
    const label = fieldLabel(catId, k);
    const v = readField(entry, k);
    if (isEmptyVal(v)){ if (!disambig) missing.push(label); return; }
    // הערך קיים ויוצג בבלוק השיטות — לא כאן. (הבדיקה אחרי isEmptyVal בכוונה:
    // שדה ריק לגמרי עדיין צריך להיספר ב-missing כרגיל.)
    if (renderedInMethodsBlock(k)) return;
    if (personEntry && PERSON_LINK_FIELDS.has(k)){
      // relIds מקביל לשדה המקורי — אם המשתמש ערך את השדה, חוזרים לקישור לפי שם
      const sameAsData = JSON.stringify(v) === JSON.stringify(entry[k]);
      const linked = personLinkedValue(v, entry, sameAsData ? k : null);
      if (linked){ html += `<div class="field-label">${esc(label)}</div><p>${linked}</p>`; return; }
    }
    if (personEntry && PLACE_LINK_FIELDS.has(k)){
      html += `<div class="field-label">${esc(label)}</div><p>${placeLinkedText(v)}</p>`;
      return;
    }
    html += fieldBlock(label, v);
  });

  // מפת מסע (2.8): לידה→מגורים→פטירה→קבורה, רק אם יש בפועל לפחות מקום אחד עם geo
  if (personEntry && !disambig){
    const journeyPoints = journeyPointsFor(entry);
    if (journeyPoints.length){
      const jmId = registerJourneyMap(journeyPoints);
      html += `<div class="field-label">מפת מסע</div><div class="journey-map" data-journey="${esc(jmId)}"></div>`;
    }
  }

  // שדות מותאמים שהמשתמש הוסיף (קטגוריות חדשות: קישורים, מידע מחז"ל וכו')
  custom.forEach(k => {
    const v = entry.customFields[k];
    if (isEmptyVal(v)) return;
    html += `<div class="field-label">${esc(k)}</div><p>${esc(v)}</p>`;
  });

  if (entry.methods && entry.methods.length){
    // הכותרת לפי מה שהבלוק באמת מכיל. הייתה קבועה "הסבר", ולכן ערך שכל ה-method
    // שלו הוא זיהוי מודרני (כל מומים, למשל) קיבל כותרת "הסבר" שנייה מתחת להסבר
    // האמיתי שכבר הוצג למעלה — שתי כותרות זהות עם תוכן שונה. במקרה הזה הכותרת
    // מיותרת לגמרי: השורה עצמה כבר פותחת ב"זיהוי מודרני:".
    const hasExplanatory = entry.methods.some(m => m && (m.explanation || m.latin || m.confidence));
    if (entry.methods.length > 1){
      html += `<div class="field-label">שיטות זיהוי / דעות</div>`;
    } else if (hasExplanatory){
      html += `<div class="field-label">הסבר</div>`;
    }
    entry.methods.forEach(m => {
      html += `<div class="method-block">`;
      if (m.confidence) html += `<span class="conf-tag">${esc(m.confidence)}</span>`;
      // הזיהוי המודרני הוא העיקר בכרטיס — הוא התשובה לשאלה "מה זה בעצם". לכן
      // הוא ראשון בבלוק, לפני השם הלטיני וההסבר, ולא אחרון כפי שהיה עד 4.9.
      if (m.modern) html += `<p class="modern-id"><strong>זיהוי מודרני:</strong> ${esc(m.modern)}</p>`;
      if (m.latin) html += `<p class="latin">${esc(m.latin)}</p>`;
      if (m.explanation) html += `<p>${esc(m.explanation)}</p>`;
      if (m.geo && m.geo.length >= 2){
        html += `<div class="offline-map" data-geo="${m.geo[0]},${m.geo[1]},${m.geo[2]||7}" data-cat="${esc(entry.cat||'')}" ></div>`;
        const mapsUrl = `https://www.google.com/maps?q=${m.geo[0]},${m.geo[1]}`;
        html += `<p style="display:flex;gap:12px;flex-wrap:wrap;">
          <a href="#" class="focus-main-map" data-geo="${m.geo[0]},${m.geo[1]},${m.geo[2]||7}" data-name="${esc(entry.name)}">🗺️ הצג במפה הראשית</a>
          <a href="${mapsUrl}" data-external-link="${mapsUrl}" data-requires-net>📍 פתח במפות גוגל ↗</a>
        </p>`;
      }
      html += `</div>`;
    });
  }

  // בקשת המשתמשת (08/10/2026): כל רשימות המקורות בסוף הכרטיס — אחרי הפרטים, העץ,
  // ״פרטים שאינם במדריך״ והחיפוש בספרייה. נאספות ל-src ונוספות בסוף (ר׳ keepSourcesLast).
  let src = '';
  const verseList = entry.verses || entry.makorot || [];
  if (verseList.length){
    src += `<div class="field-label">מקורות בתנ״ך</div>`;
    verseList.forEach((v,i) => {
      const parsed = parseAnyRef(v.ref);
      src += `<div class="verse-card${parsed?' clickable':''}" data-vref="${i}">
        <div class="verse-ref">${esc(v.ref)}${parsed?' <span class="open-hint">↗ פתח בספרייה</span>':''}</div>
        ${v.text ? `<div class="verse-text">${guardHolyNames(v.text)}</div>` : ''}
      </div>`;
    });
  }

  // ״מוזכר יחד עם״ — כל דצח״מ שחולק פסוק עם הערך הזה (co-mentions.js). מוצג מיד
  // אחרי מקורות התנ״ך, כי הוא נגזר מהם. null = המדריכים עדיין נטענים ברקע.
  const co = coMentionsFor(entry, catId);
  if (co && co.length){
    const CO_MAX = 30;
    const shown = co.slice(0, CO_MAX);
    html += `<div class="field-label">מוזכר יחד עם <span class="co-hint">(אותו פסוק)</span></div><p class="co-list">` +
      shown.map(c => {
        const title = c.shared.slice(0, 4).map(coMentionKeyLabel).join(' · ') +
          (c.shared.length > 4 ? ' ועוד ' + (c.shared.length - 4) : '');
        return `<span class="co-link" data-cm="${esc(coMentionIdOf(c.entry))}" title="${esc(title)}">`
          + catIconHtml(c.catId, 15) + ' ' + esc(c.entry.name) + `</span>`;
      }).join(' · ') +
      (co.length > CO_MAX ? ` <span class="co-hint">ועוד ${co.length - CO_MAX}</span>` : '') +
      `</p>`;
  }

  if (entry.midrash && entry.midrash.length){
    src += `<div class="field-label">מקורות חז״ל</div>`;
    entry.midrash.forEach((m,i) => {
      const msrc = midrashSource(m), note = midrashNote(m);
      if (!msrc && !note) return;   // בלי זה נוצרה תיבה ריקה לגמרי
      const parsed = msrc ? parseMidrashRef(msrc) : null;
      src += `<div class="src-item${parsed?' clickable':''}" data-mref="${i}">${msrc?`<div class="src-source">${esc(msrc)}${parsed?' <span class="open-hint">↗ פתח בספרייה</span>':''}</div>`:''}${note?`<div class="src-note">${esc(note)}</div>`:''}${m.link?`<a href="${esc(m.link)}" data-external-link="${esc(m.link)}" data-requires-net>קישור ↗</a>`:''}</div>`;
    });
  }
  if (entry.academic && entry.academic.length){
    src += `<div class="field-label">מקורות נוספים</div>`;
    entry.academic.forEach(a => {
      const txt = (typeof a === 'string') ? a : (a.citation || a.note || a.text || a.ref || '');
      if (!txt) return;
      src += `<div class="src-item">${esc(txt)}${a.link?` <a href="${esc(a.link)}" data-external-link="${esc(a.link)}" data-requires-net>קישור ↗</a>`:''}</div>`;
    });
  }
  if (gallery.length){
    html += `<div class="field-label">תמונות</div><div style="display:flex;flex-wrap:wrap;gap:8px;">`;
    gallery.forEach(src => { html += `<img src="${src}" style="width:110px;height:110px;object-fit:cover;border-radius:8px;">`; });
    html += `</div>`;
  }
  if (!disambig){
    // חכמי התלמוד אינם דמויות מקראיות — פסוק או "מקור נוסף" אינם חסרים
    // אצלם אלא פשוט לא רלוונטיים, ואין טעם להציע להשלים אותם.
    if (catId !== 'amoraim'){
      if (!verseList.length) missing.push('מקורות בתנ״ך');
      if (!(entry.academic && entry.academic.length)) missing.push('מקורות נוספים');
    }
    if (!(entry.midrash && entry.midrash.length)) missing.push('מקורות חז״ל');
  }

  // 2.6 (#59): עץ משפחה — רק לאדם עם relIds (ת.1ב)
  if (typeof familyTreeHTML === 'function' && isPersonEntry(entry)) html += familyTreeHTML(entry);

  // מה חסר בכרטיס - כדי שיידעו איזה מידע עוד אפשר להשלים (ולהציע אותו דרך ✏️).
  // בערך הבחנה אין מה להשלים: אין לו אב, שבט או גיל מעצם טבעו.
  if (missing.length && !disambig){
    html += `<div class="missing-box">
      <div class="field-label" style="margin-top:0;">פרטים שאינם במדריך</div>
      <p style="margin:0;">${missing.map(m => `<span class="missing-chip">${esc(m)}</span>`).join(' ')}</p>
      <p class="mini-note" style="margin:8px 0 0;">יש לך את המידע החסר? לחצו על ✏️ למעלה כדי להשלים אותו — ניתן לשמור במכשיר או לשלוח למפתח.</p>
    </div>`;
  }
  if (src) html += `<div class="entry-sources">${src}</div>`;
  return maskDivineName(html);
}

// מפה אופלין (Leaflet + Natural Earth, בלי אינטרנט) - נטענת פעם אחת ב-index.html
// (guides/places/js/map.js + data/geo-basemap.js), בדיוק הבסיס הווקטורי שמקומות
// השתמש בו במקור. בלי לוויין (בהתאם לגרסה הרזה).
function renderOfflineMiniMap(container, lat, lng, zoom, cat){
  if (typeof window.L === 'undefined' || typeof addBaseLayers !== 'function') {
    container.textContent = 'מפה לא זמינה כרגע.';
    return;
  }
  try {
    const map = L.map(container, { minZoom: 2, maxZoom: MAP_MAX_ZOOM, scrollWheelZoom: false, zoomControl: true });
    map.attributionControl.setPrefix('');
    map.attributionControl.addAttribution('Natural Earth');
    map.setView([lat, lng], Math.min(zoom || 7, MAP_MAX_ZOOM));
    addBaseLayers(map);
    addLabels(map, 0.9);
    L.marker([lat, lng], { icon: pinIcon(cat, false) }).addTo(map);
    setTimeout(() => { map.invalidateSize(); map.setView([lat, lng], Math.min(zoom || 7, MAP_MAX_ZOOM)); }, 120);
  } catch(e){
    console.warn('madaei-hatanach: map render failed', e);
    container.textContent = 'מפה לא זמינה כרגע.';
  }
}

// מחבר התנהגות (קליק על פסוק, הדפסה, עריכה) לתוכן שכבר סופק ע"י renderEntryDetailHTML,
// בכל קונטיינר שהוא (המודל הראשי, או שורת תוצאה שמתרחבת) - כדי לא לשכפל לוגיקה.
function wireEntryDetail(container, entry, onEdit){
  if (typeof wireFamilyTree === 'function') wireFamilyTree(container, entry);
  const verseList = entry.verses || entry.makorot || [];
  container.querySelectorAll('.verse-card.clickable').forEach(el => {
    const i = parseInt(el.dataset.vref);
    const v = verseList[i];
    const parsed = v && parseAnyRef(v.ref);
    if (parsed) el.addEventListener('click', () => openInReader(parsed.bookId, parsed.ref));
  });
  // מקורות חז"ל לחיצים — נפתחים בספרייה (הקישור החיצוני שבפנים מטופל בנפרד)
  container.querySelectorAll('.src-item.clickable').forEach(el => {
    const i = parseInt(el.dataset.mref);
    const m = (entry.midrash || [])[i];
    const parsed = m && parseMidrashRef(midrashSource(m));
    if (parsed) el.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-external-link]')) return;
      openInReader(parsed.bookId, parsed.ref);
    });
  });
  const bmb = container.querySelector('#entryBookmarkBtn');
  if (bmb) bmb.addEventListener('click', (e) => {
    e.stopPropagation();
    const catId = bmb.dataset.bmCat;
    if (!catId) return;
    const on = toggleBookmark(catId, bmb.dataset.bmKey, bmb.dataset.bmLabel);
    bmb.textContent = on ? '★' : '☆';
    bmb.classList.toggle('bm-on', on);
    bmb.title = on ? 'הסרה מהסימניות' : 'הוספה לסימניות (האזור האישי)';
  });
  // ההדפסה עוברת דרך עמוד ההדפסה של print.js (2.5). עד 2.12.2 זו הייתה קריאה
  // חשופה ל-window.print(), שהדפיסה את כל ממשק התוסף — סרגלים, כפתורים והשער.
  const pb = container.querySelector('#entryPrintBtn');
  if (pb) pb.addEventListener('click', (e) => { e.stopPropagation(); printSingleEntry(entry); });
  const pdfb = container.querySelector('#entryPdfBtn');
  if (pdfb) pdfb.addEventListener('click', (e) => { e.stopPropagation(); exportSingleEntryPdf(entry); });
  const eb = container.querySelector('#entryEditBtn');
  if (eb) eb.addEventListener('click', (e) => { e.stopPropagation(); onEdit ? onEdit() : openGenericEditForm(entry); });
  // Issue #25: דיווח ממוקד על נתון שגוי/כפול — בלי לפתוח עריכה. עובר דרך פאנל
  // הדיווחים הקיים (personal.js) עם תבנית שלושת המקרים שביקש המדווח; העורך
  // מוחק את השורות הלא-רלוונטיות. openReportPanel נטען אחרי הקובץ הזה בסדר
  // הטעינה, אבל בזמן הקליק הוא כבר קיים — הבדיקה היא רק רשת ביטחון.
  const rb = container.querySelector('#entryReportBtn');
  if (rb) rb.addEventListener('click', (e) => {
    e.stopPropagation();
    if (typeof openReportPanel !== 'function') return;
    // מזהה המדריך יושב על כפתור הסימנייה (data-bm-cat) — entry.cat הוא תת-קטגוריה
    const guideId = bmb ? bmb.dataset.bmCat : '';
    const catLabel = (typeof catLabelOf === 'function' && guideId) ? catLabelOf(guideId) : '';
    openReportPanel({
      kind: 'טעות בתוכן',
      title: 'דיווח על הערך "' + entry.name + '"',
      details: 'הערך: "' + entry.name + '"' + (catLabel ? ' · מדריך: ' + catLabel : '') + '\n\n'
        + 'סמנו מה רלוונטי (מחקו את השאר) ופרטו:\n'
        + '[ ] הערך כולו שגוי — מדוע:\n'
        + '[ ] הערך כפול לערך אחר — שם הערך שהוא כפיל שלו:\n'
        + '[ ] קטע/פסוק/מקור בתוך הערך שגוי או לא שייך — איזה, ולמה:\n'
    });
  });
  const wikiEl = container.querySelector('[data-wiki-lazy]');
  if (wikiEl){
    fetchWikiThumbnail(wikiEl.dataset.wikiLazy).then(src => {
      wikiEl.innerHTML = src ? `<img src="${src}" alt="" style="max-width:100%;border-radius:10px;display:block;">` : '';
    });
  }
  container.querySelectorAll('.offline-map').forEach(el => {
    const [lat, lng, zoom] = el.dataset.geo.split(',').map(Number);
    renderOfflineMiniMap(el, lat, lng, zoom, el.dataset.cat);
  });
  container.querySelectorAll('.journey-map[data-journey]').forEach(el => {
    renderJourneyMap(el, journeyMapRegistry.get(el.dataset.journey));
  });
  container.querySelectorAll('.person-link').forEach(el => {
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const target = findPersonById(el.dataset.personId) || findPersonEntry(el.dataset.person);
      if (target) openEntryDetail(target);
    });
  });
  // מקום בכרטיס אישים -> כרטיס המקומות עצמו, שכולל את המפה של אותו מקום
  container.querySelectorAll('.place-link').forEach(el => {
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const target = findPlaceEntryByName(el.dataset.place);
      if (target) openEntryDetail(target);
    });
  });
  // ״מוזכר יחד עם״ — מעבר לערך השכן, בכל מדריך שהוא
  container.querySelectorAll('.co-link').forEach(el => {
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const target = coMentionEntryById(el.dataset.cm);
      if (target) openEntryDetail(target);
    });
  });
  refreshEntryLinksWhenReady(container, entry, onEdit);
  // "הצג במפה הראשית" - סוגר את הכרטיס, גולל למפה שבסוף רשימת המקומות וממקד שם.
  container.querySelectorAll('.focus-main-map').forEach(el => {
    el.addEventListener('click', (ev) => {
      ev.preventDefault();
      const [lat, lng, zoom] = el.dataset.geo.split(',').map(Number);
      focusMainMap(lat, lng, zoom, el.dataset.name);
    });
  });
  // 3.8.0 — ביוגרפיה מאוצריא, "היכן עוד מוזכר", סימון מקורות לא נפתרים
  if (typeof enrichEntryDetail === 'function') enrichEntryDetail(container, entry);
  keepSourcesLast(container);
}

// תוספות שמגיעות אחרי הרינדור (ביוגרפיה, ״היכן עוד מוזכר״, גימטריה) נוספות לסוף
// הכרטיס — מזיזים את בלוק המקורות חזרה לסוף בכל פעם, כך שהוא תמיד אחרון.
function keepSourcesLast(container){
  const fix = () => {
    const srcEl = container.querySelector(':scope > .entry-sources');
    if (srcEl && container.lastElementChild !== srcEl) container.appendChild(srcEl);
  };
  fix();
  if (container.__srcObserver || typeof MutationObserver === 'undefined') return;
  container.__srcObserver = new MutationObserver(fix);
  container.__srcObserver.observe(container, { childList: true });
}

// כרטיס עלול להיפתח לפני שכל המדריכים סיימו להיטען ברקע (preloadAllGuides טוען
// בטור) — ואז אין ממה לבנות את קישורי המקומות ואת ״מוזכר יחד עם״. במקום לעכב את
// הפתיחה, טוענים ברקע ומרנדרים את אותו כרטיס פעם אחת כשהנתונים מוכנים. אחרי
// הטעינה שתי הבדיקות מחזירות ״מוכן״, ולכן אין כאן לולאה.
function refreshEntryLinksWhenReady(container, entry, onEdit){
  const needPlaces = isPersonEntry(entry) && !placesNameIndex();
  const needCo = !coMentionsReady();
  if (!needPlaces && !needCo) return;
  const cats = needCo ? CATEGORIES.slice() : [CATEGORIES.find(c => c.id === 'places')].filter(Boolean);
  // בטור ולא ב-Promise.all: שישה קבצי ענק שנטענים יחד מרעיבים זה את זה ומייצרים
  // בדיוק את הטיימאאוט ש-preloadAllGuides נבנה כדי להימנע ממנו.
  const chain = (i) => i >= cats.length ? Promise.resolve()
    : loadGuideData(cats[i]).catch(() => null).then(() => chain(i + 1));
  chain(0).then(() => {
    if (!container.isConnected) return;
    if ((needPlaces && !placesNameIndex()) || (needCo && !coMentionsReady())) return;
    container.innerHTML = renderEntryDetailHTML(entry);
    wireEntryDetail(container, entry, onEdit);
  });
}

// ממקד את מפת העולם שבסוף רשימת המקומות על נקודה מסוימת (כמו focusOnMainMap במקור).
async function focusMainMap(lat, lng, zoom, name){
  entryOverlay.classList.remove('open');
  resultsOverlay.classList.remove('open');
  if (!currentGuideCat || currentGuideCat.id !== 'places'){
    await openGuide('places', null);
  } else if (!chipsAreAll() || guideSearchBox.value || activeGuideEra !== 'all' || activeGuideTribe !== 'all' || activeGuideLetter !== 'all'){
    activeGuideChips.clear();
    activeGuideEra = 'all';
    activeGuideTribe = 'all';
    activeGuideLetter = 'all';
    guideSearchBox.value = '';
    renderGuideGrid('');
  }
  setTimeout(() => {
    const el = document.getElementById('worldMap');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (typeof worldMap === 'undefined' || !worldMap) return;
    const z = Math.min(zoom || 8, (typeof MAP_MAX_ZOOM !== 'undefined' ? MAP_MAX_ZOOM : 12));

    const rec = (typeof allMarkers !== 'undefined' && Array.isArray(allMarkers))
      ? allMarkers.find(r => {
          const p = r.marker.getLatLng();
          return Math.abs(p.lat - lat) < 1e-6 && Math.abs(p.lng - lng) < 1e-6;
        })
      : null;

    let popped = false;
    const showPopup = () => {
      if (popped || !rec) return;
      popped = true;
      if (markerLayer && typeof markerLayer.zoomToShowLayer === 'function' && markerLayer.hasLayer(rec.marker)){
        markerLayer.zoomToShowLayer(rec.marker, () => rec.marker.openPopup());
      } else rec.marker.openPopup();
    };

    worldMap.once('moveend', showPopup);
    worldMap.flyTo([lat, lng], z, { duration: 1.2 });

    // flyTo מונפש דרך requestAnimationFrame - אם מסיבה כלשהי ההנפשה לא רצה
    // (חלון לא מצויר, מנוע webview חוסך משאבים) המפה לא תגיע ליעד. לכן מוודאים
    // הגעה בפועל, וקופצים ישירות אם צריך.
    setTimeout(() => {
      const c = worldMap.getCenter();
      if (Math.abs(c.lat - lat) > 0.01 || Math.abs(c.lng - lng) > 0.01){
        worldMap.setView([lat, lng], z);
      }
      showPopup();
    }, 1400);
  }, 400);
}

function openEntryDetail(entry){
  if (typeof setUnsaved === 'function') setUnsaved(false);
  printCtxEntry = entry;   // כדי ש-Ctrl+P ידני יידע איזה כרטיס להדפיס (print.js)
  entryModalInner.innerHTML = renderEntryDetailHTML(entry);
  wireEntryDetail(entryModalInner, entry);
  entryOverlay.classList.add('open');
}
entryCloseBtn.addEventListener('click', () => { entryOverlay.classList.remove('open'); if (typeof setUnsaved === 'function') setUnsaved(false); });
// לחיצה על הרקע (מחוץ לכרטיס) סוגרת - וגם Esc.
entryOverlay.addEventListener('click', (ev) => { if (ev.target === entryOverlay) entryOverlay.classList.remove('open'); });
document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Escape') return;
  if (entryOverlay.classList.contains('open')) entryOverlay.classList.remove('open');
  else if (resultsOverlay.classList.contains('open')) resultsOverlay.classList.remove('open');
  else document.querySelectorAll('.panel-overlay.open').forEach(p => p.classList.remove('open'));
});
