// מודול המפה: בסיס וקטורי ללא אינטרנט + שכבת לוויין Sentinel-2 אופציונלית (מופיעה רק כשיש רשת)
"use strict";
// ---------- מפה מוטמעת ללא אינטרנט — Natural Earth + Leaflet ----------
const CAT_COLORS = {
  cities:'#C93A2C', villages:'#D97E10', mountains:'#7C4DD4', water:'#1F7FB8',
  valleys:'#2E8B57', deserts:'#B8860B', lands:'#2F6F6F', stations:'#D6408A',
  // יישובי היהודים בבבל בתקופת חז"ל (3.3.4). צבע נפרד בכוונה: המיקום שלהם
  // אזורי ומשוער בלבד ולא זיהוי אתר, ולכן הם צריכים להיקרא במפה כקבוצה נבדלת.
  bavel:'#6B4E9B'
};
const MAP_MAX_ZOOM = 12;

let worldMap = null, markerLayer = null, allMarkers = [], miniMapInst = null, labelMarkers = [];

function leafletReady(){ return typeof window.L !== 'undefined' && typeof L.map === 'function'; }

const NE_STYLE = {
  land:    {fillColor:'#E6D8B0', fillOpacity:1, stroke:false},
  wline:   {color:'#A08D5F', weight:.6, opacity:.75, fill:false},
  rline:   {color:'#8A7648', weight:.9, opacity:.8, fill:false},
  lake:    {fillColor:'#9FBCC8', fillOpacity:1, color:'#7796A3', weight:.8},
  river:   {color:'#7796A3', weight:1.1, opacity:.85, fill:false}
};

function addBaseLayers(map){
  const renderer = L.canvas({padding:.4});
  const group = L.layerGroup([
    L.geoJSON(NE_DATA.world,       {renderer, style:()=>NE_STYLE.land,  interactive:false}),
    L.geoJSON(NE_DATA.worldlines,  {renderer, style:()=>NE_STYLE.wline, interactive:false}),
    L.geoJSON(NE_DATA.region,      {renderer, style:()=>NE_STYLE.land,  interactive:false}),
    L.geoJSON(NE_DATA.regionlines, {renderer, style:()=>NE_STYLE.rline, interactive:false}),
    L.geoJSON(NE_DATA.rivers,      {renderer, style:()=>NE_STYLE.river, interactive:false}),
    L.geoJSON(NE_DATA.lakes,       {renderer, style:()=>NE_STYLE.lake,  interactive:false})
  ]);
  group.addTo(map);
  return group;
}

// ---- שכבות בסיס אופציונליות, שתיהן "רזות כברירת מחדל" — לא נטענות/מוטמעות
// עד שבאמת זמינות, וכל אחת נבדקת בנפרד לפני שהכפתור שלה בכלל מופיע:
//   • לוויין (Sentinel-2) — חי מהרשת בלבד, ~0MB לחבילה. זמין כשיש אינטרנט.
//   • OpenStreetMap אופליין — לא מוטמע בחבילה כלל (guides/places/tiles/ ב-.gitignore,
//     ר' README). למי שרוצה מפורט יותר מה"מצוירת" בלי תלות ברשת: להוריד את
//     tiles/ מהתוסף "מקומות+" (אותו כותב, com_chadbedera_placeguideplus) ולהדביק
//     ידנית בתוך תיקיית ההתקנה של התוסף הזה, במבנה {z}/{x}/{y}.png זהה.
//     הדרכה מלאה מוצגת בכפתור "ℹ️" ליד המפה (openOfflineMapHelp).
const S2_URL = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg';
const S2_OVERLAY_URL = 'https://tiles.maps.eox.at/wmts/1.0.0/overlay_bright_3857/default/g/{z}/{y}/{x}.png';
const S2_ATTR = 'Sentinel-2 cloudless 2024 by EOX (Contains modified Copernicus Sentinel data)';
const SAT_MAX_ZOOM = 17;

// 26/08: היה 'tiles/...' (יחסי לשורש החבילה) - לא תאם בפועל למקום שההוראה
// למשתמש (openOfflineMapHelp) ולוריאנט "עינים למקרא+" מציבים את האריחים
// (guides/places/tiles/), כי map.js נטען ישירות מ-index.html (לא מ-iframe
// נפרד) ולכן נתיב יחסי בו נפתר מול שורש החבילה, לא מול js/. המתג "OSM
// אופליין" מעולם לא הופיע כי probeTile תמיד קיבל 404. אומת ותוקן ע"י המשתמש.
const OSM_LOCAL_URL = 'guides/places/tiles/{z}/{x}/{y}.png';
const OSM_ATTR = '© OpenStreetMap contributors';
const OSM_OFFLINE_MAX_ZOOM = 13; // מוטמע עד z11, מוגדל עד z13 (כמו ב"מקומות+")
const BLANK_TILE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
// גבולות פירמידת האריחים — חייבים להתאים בדיוק למבנה שנבנה ב"מקומות+" (osm-tiles-build)
const OSM_WIDE_BOUNDS = [[9,17],[42.5,58]];
const OSM_FINE_BOUNDS = [[27.4,30.3],[40.5,49.2]];
// אריח-בדיקה ברמת עולם (z1) — כמעט תמיד קיים בכל עותק סביר של tiles/, גם חלקי
// נגזר מ-OSM_LOCAL_URL כדי שהמרת האריחים ל-WebP ב-CI (sed על הסיומת) תחול גם על אריח-הבדיקה
const OSM_PROBE_URL = OSM_LOCAL_URL.replace('{z}', '1').replace('{x}', '1').replace('{y}', '0');

let baseMode = 'vector'; // 'vector' | 'osm' | 'sat'
let satAvailable = false, osmAvailable = false;
let vectorBase = null, satBase = null, satLabels = null, osmOffline = null;
let baseSwitchCtl = null, baseButtons = {};
const BASE_LABELS = {vector:'🗺️ מצוירת', osm:'🌍 OSM אופליין', sat:'🛰️ לוויין'};

function zoomCap(){ return baseMode === 'sat' ? SAT_MAX_ZOOM : baseMode === 'osm' ? OSM_OFFLINE_MAX_ZOOM : MAP_MAX_ZOOM; }

function probeTile(url, cb){
  let done = false;
  const finish = ok => { if(done) return; done = true; cb(ok); };
  const t = setTimeout(()=>finish(false), 6000);
  const img = new Image();
  img.onload  = ()=>{ clearTimeout(t); finish(true); };
  img.onerror = ()=>{ clearTimeout(t); finish(false); };
  img.src = url + (url.startsWith('http') ? ('?t=' + Date.now()) : '');
}

function osmOfflineLayers(){
  return [
    L.tileLayer(OSM_LOCAL_URL, {maxNativeZoom:4,  maxZoom:OSM_OFFLINE_MAX_ZOOM, errorTileUrl:BLANK_TILE, attribution:OSM_ATTR}),
    L.tileLayer(OSM_LOCAL_URL, {minZoom:5, maxNativeZoom:8,  maxZoom:OSM_OFFLINE_MAX_ZOOM, bounds:OSM_WIDE_BOUNDS, errorTileUrl:BLANK_TILE}),
    L.tileLayer(OSM_LOCAL_URL, {minZoom:9, maxNativeZoom:11, maxZoom:OSM_OFFLINE_MAX_ZOOM, bounds:OSM_FINE_BOUNDS, errorTileUrl:BLANK_TILE})
  ];
}

function setBaseMode(mode){
  if(!worldMap) return;
  if(mode === 'sat' && !satAvailable) mode = 'vector';
  if(mode === 'osm' && !osmAvailable) mode = 'vector';
  baseMode = mode;
  [vectorBase, satBase, satLabels, osmOffline].forEach(l=>{ if(l && worldMap.hasLayer(l)) worldMap.removeLayer(l); });
  if(mode === 'sat'){
    if(!satBase)   satBase   = L.tileLayer(S2_URL, {maxZoom:SAT_MAX_ZOOM, attribution:S2_ATTR});
    if(!satLabels) satLabels = L.tileLayer(S2_OVERLAY_URL, {maxZoom:SAT_MAX_ZOOM, opacity:.95});
    satBase.addTo(worldMap); satLabels.addTo(worldMap);
  } else if(mode === 'osm'){
    if(!osmOffline) osmOffline = L.layerGroup(osmOfflineLayers());
    osmOffline.addTo(worldMap);
  } else if(vectorBase){
    vectorBase.addTo(worldMap);
  }
  worldMap.setMaxZoom(zoomCap());
  if(worldMap.getZoom() > zoomCap()) worldMap.setZoom(zoomCap());
  const el = document.getElementById('worldMap');
  el.classList.toggle('sat-on', mode === 'sat');
  el.classList.toggle('osm-on', mode === 'osm');
  Object.keys(baseButtons).forEach(k=>baseButtons[k].classList.toggle('active', k === baseMode));
}

function rebuildBaseSwitch(){
  if(!worldMap) return;
  if(baseSwitchCtl){ worldMap.removeControl(baseSwitchCtl); baseSwitchCtl = null; }
  const modes = ['vector'].concat(osmAvailable ? ['osm'] : []).concat(satAvailable ? ['sat'] : []);
  if(modes.length < 2) return; // אין מה להחליף — אף שכבה אופציונלית לא זמינה
  baseButtons = {};
  const Ctl = L.Control.extend({
    options:{position:'topright'},
    onAdd(){
      const wrap = L.DomUtil.create('div', 'base-switch');
      L.DomEvent.disableClickPropagation(wrap);
      modes.forEach(m=>{
        const btn = L.DomUtil.create('button', 'base-switch-btn' + (m === baseMode ? ' active' : ''), wrap);
        btn.type = 'button';
        btn.textContent = BASE_LABELS[m];
        btn.addEventListener('click', ()=>setBaseMode(m));
        baseButtons[m] = btn;
      });
      return wrap;
    }
  });
  baseSwitchCtl = new Ctl();
  worldMap.addControl(baseSwitchCtl);
}

// כפתור "ℹ️" קבוע (לא תלוי בזמינות) — מסביר איך להוסיף OSM אופליין למי שעדיין אין לו,
// כדי שהאופציה תהיה גלויה גם למי שהתקנה שלו "רזה". openOfflineMapHelp הוגדרה כאן —
// לא הייתה קיימת בכלל (הערה ישנה הפנתה ל-app.js שלא קיים), ולכן הכפתור לא עשה כלום.
// 3.1.2 — ההודעה שינתה כיוון. עד כה היא ביקשה מהמשתמש להתקין תוסף אחר
// ולהעתיק ידנית תיקיית tiles/ — פעולה שרוב המשתמשים לא יבצעו. עכשיו היא
// מפנה להורדת החבילה המלאה (הווריאנט שכולל את האריחים, נבנה ע"י
// build/pack-offline-maps-variant.ps1) ישירות מדף ה-Releases.
// 📌 כשתצא חבילת המפות ל"עינים למקרא פלוס" כתוסף נפרד בחנות — להחליף כאן
//    את הקישור בקישור לדף שלו בחנות, ולעדכן את נוסח ההודעה בהתאם.
const FULL_MAPS_URL = 'https://github.com/Hadabadra/madaei-hatanach/releases';

function openOfflineMapHelp(){
  if (!(window.Otzaria && Otzaria.call)) return;
  Otzaria.call('ui.showConfirm', {
    title: 'מפה מפורטת',
    content: 'ניתן לראות מפה מפורטת (OpenStreetMap אופליין). לשם כך יש להוריד את הגרסה המלאה של התוסף, הכוללת את אריחי המפה.\n\nלפתוח את דף ההורדות?'
  }).then(res => {
    const ok = (res && (res.data !== undefined ? res.data : res));
    if (ok === false) return;
    return Otzaria.call('app.openUrl', { url: FULL_MAPS_URL });
  }).catch(()=>{});
}
let offlineMapInfoCtl = null;
// 26/08: הכפתור נוסף תמיד, בלי קשר אם האריחים כבר זמינים בפועל - כך שמי
// שכן התקין "עינים למקרא+" (או העתיק tiles/ ידנית) עדיין רואה הוראה
// שכבר לא רלוונטית לו. probeTile של OSM (ב-initWorldMap) מסיר אותו אם
// osmAvailable מתברר כ-true.
function addOfflineMapInfoBtn(){
  const Ctl = L.Control.extend({
    options:{position:'topright'},
    onAdd(){
      const btn = L.DomUtil.create('button', 'map-info-btn');
      btn.type = 'button';
      btn.title = 'איך מוסיפים מפת OpenStreetMap מפורטת (אופליין)?';
      btn.innerHTML = 'ℹ️';
      L.DomEvent.disableClickPropagation(btn);
      btn.addEventListener('click', ()=>{ if(typeof openOfflineMapHelp === 'function') openOfflineMapHelp(); });
      return btn;
    }
  });
  offlineMapInfoCtl = new Ctl();
  worldMap.addControl(offlineMapInfoCtl);
}
function removeOfflineMapInfoBtn(){
  if(offlineMapInfoCtl && worldMap){ worldMap.removeControl(offlineMapInfoCtl); offlineMapInfoCtl = null; }
}

function addLabels(map, sizeFactor){
  const made = [];
  NE_DATA.labels.forEach(lb=>{
    const cls = lb.kind === 'water' ? 'ne-label ne-label-water' : lb.kind === 'city' ? 'ne-label ne-label-city' : 'ne-label';
    const dot = lb.kind === 'city' ? '<span class="ne-city-dot"></span>' : '';
    const marker = L.marker([lb.lat, lb.lng], {
      icon: L.divIcon({className:'', html:`<div class="${cls}" style="font-size:${Math.round((lb.size||13)*(sizeFactor||1))}px">${dot}${lb.he}</div>`, iconSize:[0,0]}),
      interactive:false, keyboard:false
    }).addTo(map);
    made.push({marker, minZoom: lb.z});
  });
  const refresh = ()=>{
    const z = map.getZoom();
    made.forEach(rec=>{
      const el = rec.marker.getElement();
      if(el) el.style.display = z >= rec.minZoom ? '' : 'none';
    });
  };
  map.on('zoomend', refresh);
  refresh();
  return made;
}

function pinIcon(cat, secondary){
  const color = CAT_COLORS[cat] || '#555';
  const s = secondary ? 21 : 30;
  const html = `<svg width="${s}" height="${s}" viewBox="0 0 24 24"${secondary ? ' opacity="0.85"' : ''}>
    <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z" fill="${color}" stroke="#FFF8E7" stroke-width="1.3"/>
    <circle cx="12" cy="9" r="2.7" fill="#FFF8E7" opacity=".85"/></svg>`;
  return L.divIcon({className:'geo-pin', html, iconSize:[s,s], iconAnchor:[s/2,s], popupAnchor:[0,-s+6]});
}

function clusterIcon(cluster){
  const n = cluster.getChildCount();
  const s = n < 10 ? 34 : n < 30 ? 41 : 48;
  return L.divIcon({html:`<div class="s2-cluster" style="width:${s}px;height:${s}px;font-size:${n<10?13:14}px">${n}</div>`,
    className:'', iconSize:[s,s], iconAnchor:[s/2,s/2]});
}

function popupHTML(item, idx, mi){
  const m = item.methods[mi];
  const catLabel = CATS.find(c=>c.id===item.cat)?.label || '';
  const methodLine = item.methods.length > 1 ? ` · ${m.label}` : '';
  const desc = (m.modern || m.explanation || '');
  return `<div class="s2-pop">
    <div class="s2-pop-name">${item.name}</div>
    <div class="s2-pop-cat">${catLabel}${methodLine} · ${m.confidence}</div>
    <p class="s2-pop-desc">${desc}</p>
    <button class="s2-pop-btn" data-open-idx="${idx}">לכרטיס המלא ⬅</button>
  </div>`;
}

function buildMarkers(){
  allMarkers = [];
  DATA.forEach((item, idx)=>{
    item.methods.forEach((m, mi)=>{
      if(!m.geo) return;
      const marker = L.marker([m.geo[0], m.geo[1]], {icon: pinIcon(item.cat, mi > 0), title: item.name});
      marker.bindPopup(popupHTML(item, idx, mi), {maxWidth: 250});
      allMarkers.push({marker, idx, mi});
    });
  });
}

function currentVisibleIdxSet(){
  const set = new Set();
  document.querySelectorAll('.category-section:not(.hidden) .card:not(.hidden)').forEach(card=>{
    set.add(parseInt(card.dataset.idx));
  });
  return set;
}

function updateMapFilter(){
  if(!worldMap || !markerLayer) return;
  const visible = currentVisibleIdxSet();
  markerLayer.clearLayers();
  allMarkers.forEach(rec=>{ if(visible.has(rec.idx)) markerLayer.addLayer(rec.marker); });
}

function fitAllMarkers(){
  const pts = [];
  markerLayer.eachLayer(l=>pts.push(l.getLatLng()));
  if(pts.length) worldMap.fitBounds(L.latLngBounds(pts), {padding:[30,30], maxZoom:6});
}

// כפתור מסך מלא (3.2.1). Leaflet אינו מספק אחד מובנה, ו-Fullscreen API של
// הדפדפן חסום בתוך ה-WebView של אוצריא בחלק מהפלטפורמות — ולכן זה לא
// fullscreen אמיתי אלא מחלקה שמותחת את המכל על כל החלון (position:fixed).
// יתרון נוסף: זה עובד זהה בדפדפן רגיל ובתוך אוצריא, בלי הרשאות.
function addFullscreenBtn(){
  if(!worldMap) return;
  const Ctl = L.Control.extend({
    options:{position:'topleft'},
    onAdd(){
      const a = L.DomUtil.create('a', 'leaflet-bar leaflet-control map-fs-btn');
      a.href = '#'; a.title = 'מסך מלא'; a.innerHTML = '⛶';
      L.DomEvent.on(a, 'click', L.DomEvent.stop).on(a, 'click', () => {
        const el = document.getElementById('worldMap');
        if(!el) return;
        const on = el.classList.toggle('map-fullscreen');
        document.body.classList.toggle('map-fullscreen-open', on);
        a.innerHTML = on ? '✕' : '⛶';
        a.title = on ? 'יציאה ממסך מלא' : 'מסך מלא';
        // Leaflet חייב לחשב מחדש את הגודל אחרי שינוי מידות המכל
        setTimeout(() => { try { worldMap.invalidateSize(); } catch(_){} }, 60);
      });
      return a;
    }
  });
  worldMap.addControl(new Ctl());
}

// Esc יוצא ממסך מלא — ציפייה סטנדרטית, וגם מוצא יחיד אם הכפתור נסתר
document.addEventListener('keydown', e => {
  if(e.key !== 'Escape') return;
  const el = document.getElementById('worldMap');
  if(el && el.classList.contains('map-fullscreen')){
    el.classList.remove('map-fullscreen');
    document.body.classList.remove('map-fullscreen-open');
    const b = el.querySelector('.map-fs-btn');
    if(b){ b.innerHTML = '⛶'; b.title = 'מסך מלא'; }
    setTimeout(() => { try { worldMap.invalidateSize(); } catch(_){} }, 60);
  }
});

// ---------- חיפוש מיקום בתוך המפה (3.3.4) ----------
// שורת החיפוש שבראש המדריך מסננת ערכים; הפקד הזה עושה דבר אחר לגמרי —
// מוצא **מקום על המפה** וטס אליו. שני מקורות, שניהם מוטבעים בחבילה ולכן
// עובדים בלי אינטרנט (אין שום geocoder חיצוני, ולא צריך כזה):
//   1. DATA (places.js) — כל ערך שיש לו methods[].geo, כולל ה-aliases שלו.
//   2. NE_DATA.labels (geo-basemap.js) — 378 תוויות המפה עצמה: מדינות, ימים
//      ונהרות, אזורים וערים. זה מה שנותן ערים מודרניות שאינן ערך במדריך.
// האינדקס נבנה עצלנית בחיפוש הראשון ולא בטעינה — מי שלא מחפש לא משלם עליו.
let mapSearchIndex = null;
let mapSearchPin = null;

function normHebForSearch(s){
  // ניקוד/טעמים וגרש/גרשיים יוצאים; רווח נשמר, כדי ש"בית לחם" לא יידבק
  // למילה אחת ויפסיק להימצא בחיפוש "לחם".
  return String(s == null ? '' : s)
    .replace(/[֑-ׇ]/g, '')
    .replace(/["״'׳’”\-–]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildMapSearchIndex(){
  const out = [];
  const seen = new Set();
  const push = (name, lat, lng, z, kind, idx, mi) => {
    if(!name || !isFinite(lat) || !isFinite(lng)) return;
    const key = kind + '|' + name + '|' + lat.toFixed(3) + '|' + lng.toFixed(3);
    if(seen.has(key)) return;
    seen.add(key);
    out.push({name, norm: normHebForSearch(name), lat, lng, z: z || 8, kind, idx, mi});
  };
  if(typeof DATA !== 'undefined' && Array.isArray(DATA)){
    DATA.forEach((item, idx)=>{
      (item.methods || []).forEach((m, mi)=>{
        if(!m.geo) return;
        push(item.name, m.geo[0], m.geo[1], m.geo[2], 'entry', idx, mi);
        (item.aliases || []).forEach(a => push(a, m.geo[0], m.geo[1], m.geo[2], 'alias', idx, mi));
      });
    });
  }
  if(typeof NE_DATA !== 'undefined' && Array.isArray(NE_DATA.labels)){
    NE_DATA.labels.forEach(lb => push(lb.he, lb.lat, lb.lng, (lb.z || 5) + 2, 'label', -1, -1));
  }
  return out;
}

// התאמת-תחילית קודמת להכלה, ושם קצר קודם לארוך — כך "דן" לא נקבר מתחת לעשרות
// שמות שמכילים "דן". עד 8 תוצאות — רשימה ארוכה יותר מכסה את המפה עצמה.
function searchMapPlaces(q){
  const nq = normHebForSearch(q);
  if(nq.length < 2) return [];
  if(!mapSearchIndex) mapSearchIndex = buildMapSearchIndex();
  const starts = [], contains = [];
  for(const rec of mapSearchIndex){
    if(rec.norm.indexOf(nq) === 0) starts.push(rec);
    else if(rec.norm.indexOf(nq) !== -1) contains.push(rec);
  }
  const byLen = (a, b) => a.norm.length - b.norm.length;
  return starts.sort(byLen).concat(contains.sort(byLen)).slice(0, 8);
}

const MAP_SEARCH_KIND_ICON = {entry: '📍', alias: '📍', label: '🗺️'};
const MAP_SEARCH_KIND_TITLE = {entry: 'ערך במדריך', alias: 'שם נוסף לערך', label: 'תווית במפה'};

function clearMapSearchPin(){
  if(mapSearchPin && worldMap){ try{ worldMap.removeLayer(mapSearchPin); }catch(_){} }
  mapSearchPin = null;
}

// ⚠️ מ-3.2.1 המפה מציגה רק את הסימונים שבסינון. חיפוש שמצא מקום שסונן החוצה
// (או תווית מפה, שאין לה סמן כלל) לא יכול לפתוח פופאפ שאינו על המפה, ולכן
// מקבל סמן זמני משלו שנמחק בחיפוש הבא. זה גם מונע את המצב שבו "טסנו לשום
// מקום" — תמיד יש סימון ויזואלי של מה שנמצא.
function gotoMapSearchResult(rec){
  if(!worldMap) return;
  clearMapSearchPin();
  const z = Math.min(rec.z, zoomCap());
  worldMap.flyTo([rec.lat, rec.lng], z, {duration: 1.2});
  const marked = rec.idx >= 0 && allMarkers.find(r => r.idx === rec.idx && r.mi === rec.mi);
  worldMap.once('moveend', ()=>{
    if(marked && markerLayer && markerLayer.hasLayer(marked.marker)){
      if(typeof markerLayer.zoomToShowLayer === 'function'){
        markerLayer.zoomToShowLayer(marked.marker, ()=>marked.marker.openPopup());
      } else {
        marked.marker.openPopup();
      }
      return;
    }
    const html = '<svg width="30" height="30" viewBox="0 0 24 24" class="map-search-pin">' +
      '<path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z" fill="#1F7FB8" stroke="#FFF8E7" stroke-width="1.4"/>' +
      '<circle cx="12" cy="9" r="2.6" fill="#FFF8E7"/></svg>';
    mapSearchPin = L.marker([rec.lat, rec.lng], {
      icon: L.divIcon({className: 'geo-pin', html, iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -24]})
    }).addTo(worldMap).bindTooltip(rec.name, {direction: 'top', permanent: true}).openTooltip();
  });
}

function addMapSearchControl(){
  if(!worldMap) return;
  const Ctl = L.Control.extend({
    options:{position:'topright'},
    onAdd(){
      const wrap = L.DomUtil.create('div', 'map-search leaflet-control');
      L.DomEvent.disableClickPropagation(wrap);
      L.DomEvent.disableScrollPropagation(wrap);
      const input = L.DomUtil.create('input', 'map-search-input', wrap);
      input.type = 'search';
      input.placeholder = 'חיפוש מיקום במפה…';
      input.setAttribute('aria-label', 'חיפוש מיקום במפה');
      const list = L.DomUtil.create('ul', 'map-search-list', wrap);
      let results = [], active = -1;

      const close = ()=>{ list.innerHTML = ''; results = []; active = -1; };
      const paint = ()=>{
        Array.prototype.forEach.call(list.children, (li, i)=>li.classList.toggle('active', i === active));
      };
      const choose = i => {
        if(!results[i]) return;
        const rec = results[i];
        input.value = rec.name;
        close();
        input.blur();
        gotoMapSearchResult(rec);
      };

      const run = ()=>{
        if(normHebForSearch(input.value).length < 2){ close(); return; }
        results = searchMapPlaces(input.value);
        active = results.length ? 0 : -1;
        if(!results.length){
          list.innerHTML = '<li class="map-search-empty">לא נמצא מקום בשם הזה</li>';
          return;
        }
        list.innerHTML = results.map((r, i)=>
          '<li class="map-search-item' + (i === 0 ? ' active' : '') + '" data-i="' + i + '">' +
          '<span class="map-search-name">' + esc(r.name) + '</span>' +
          '<span class="map-search-kind" title="' + MAP_SEARCH_KIND_TITLE[r.kind] + '">' +
          MAP_SEARCH_KIND_ICON[r.kind] + '</span></li>').join('');
      };

      input.addEventListener('input', run);
      input.addEventListener('keydown', e => {
        if(e.key === 'Escape'){ close(); input.value = ''; clearMapSearchPin(); return; }
        if(!results.length) return;
        if(e.key === 'ArrowDown'){ active = (active + 1) % results.length; paint(); e.preventDefault(); }
        else if(e.key === 'ArrowUp'){ active = (active - 1 + results.length) % results.length; paint(); e.preventDefault(); }
        else if(e.key === 'Enter'){ choose(active < 0 ? 0 : active); e.preventDefault(); }
      });
      list.addEventListener('click', e => {
        const li = e.target.closest('.map-search-item');
        if(li) choose(parseInt(li.dataset.i, 10));
      });
      return wrap;
    }
  });
  worldMap.addControl(new Ctl());
}

function resetWorldMap(){
  if(worldMap){ try{ worldMap.remove(); }catch(_){} }
  worldMap = null; markerLayer = null; allMarkers = []; labelMarkers = [];
  // האינדקס נבנה מתוך DATA, ו-DATA מוחלף בכל סינון (guides.js) — לכן מתאפס כאן.
  mapSearchIndex = null; mapSearchPin = null;
}

function initWorldMap(){
  if(worldMap || !leafletReady()) return;
  const el = document.getElementById('worldMap');
  if(!el) return;
  worldMap = L.map(el, {minZoom:2, maxZoom:MAP_MAX_ZOOM, zoomControl:true,
    maxBounds:[[-65,-180],[82,180]], maxBoundsViscosity:.8});
  worldMap.attributionControl.setPrefix('');
  worldMap.attributionControl.addAttribution('מפה: Natural Earth · Leaflet — פועלת ללא אינטרנט');
  vectorBase = addBaseLayers(worldMap);
  addOfflineMapInfoBtn();
  addFullscreenBtn();
  addMapSearchControl();
  probeTile(S2_URL.replace('{z}','2').replace('{y}','1').replace('{x}','2'), ok=>{ if(ok){ satAvailable = true; rebuildBaseSwitch(); } });
  probeTile(OSM_PROBE_URL, ok=>{ if(ok){ osmAvailable = true; rebuildBaseSwitch(); removeOfflineMapInfoBtn(); } });
  labelMarkers = addLabels(worldMap, 1);
  markerLayer = (typeof L.markerClusterGroup === 'function')
    ? L.markerClusterGroup({maxClusterRadius:36, iconCreateFunction:clusterIcon, showCoverageOnHover:false, spiderfyOnMaxZoom:true, disableClusteringAtZoom:12})
    : L.layerGroup();
  buildMarkers();
  allMarkers.forEach(rec=>markerLayer.addLayer(rec.marker));
  worldMap.addLayer(markerLayer);
  fitAllMarkers();
  el.addEventListener('click', e=>{
    const btn = e.target.closest('.s2-pop-btn');
    if(btn){ openModal(DATA[parseInt(btn.dataset.openIdx)]); }
  });
}

function focusOnMainMap(item, mi){
  if(!worldMap) return;
  const idx = DATA.indexOf(item);
  const m = item.methods[mi];
  if(!m || !m.geo) return;
  closeModal();
  document.getElementById('mapSection').scrollIntoView({behavior:'smooth'});
  const z = Math.min(m.geo[2], zoomCap());
  worldMap.flyTo([m.geo[0], m.geo[1]], z, {duration:1.6});
  worldMap.once('moveend', ()=>{
    const rec = allMarkers.find(r=>r.idx===idx && r.mi===mi) || allMarkers.find(r=>r.idx===idx);
    if(!rec) return;
    if(markerLayer && typeof markerLayer.zoomToShowLayer === 'function' && markerLayer.hasLayer(rec.marker)){
      markerLayer.zoomToShowLayer(rec.marker, ()=>rec.marker.openPopup());
    } else {
      rec.marker.openPopup();
    }
  });
}

function destroyMiniMap(){
  if(miniMapInst){ try{ miniMapInst.remove(); }catch(_){} miniMapInst = null; }
}

function renderMiniMap(item, mi){
  destroyMiniMap();
  const el = document.getElementById('miniMap');
  const m = item.methods[mi];
  if(!el || !m.geo || !leafletReady()) return;
  const z = Math.min(m.geo[2], zoomCap());
  miniMapInst = L.map(el, {minZoom:2, maxZoom:zoomCap(), scrollWheelZoom:false, zoomControl:true});
  miniMapInst.attributionControl.setPrefix('');
  miniMapInst.setView([m.geo[0], m.geo[1]], z);
  if(baseMode === 'sat' && satAvailable){
    el.classList.add('sat-on');
    miniMapInst.attributionControl.addAttribution(S2_ATTR);
    L.tileLayer(S2_URL, {maxZoom:SAT_MAX_ZOOM}).addTo(miniMapInst);
    L.tileLayer(S2_OVERLAY_URL, {maxZoom:SAT_MAX_ZOOM, opacity:.95}).addTo(miniMapInst);
  } else if(baseMode === 'osm' && osmAvailable){
    el.classList.add('osm-on');
    miniMapInst.attributionControl.addAttribution(OSM_ATTR);
    L.layerGroup(osmOfflineLayers()).addTo(miniMapInst);
  } else {
    miniMapInst.attributionControl.addAttribution('Natural Earth');
    addBaseLayers(miniMapInst);
  }
  addLabels(miniMapInst, .9);
  L.marker([m.geo[0], m.geo[1]], {icon: pinIcon(item.cat, false)}).addTo(miniMapInst);
  // המודאל עדיין display:none ברגע היצירה — מדידה מחדש אחרי שהוא נפתח
  const inst = miniMapInst;
  setTimeout(()=>{
    if(inst === miniMapInst && miniMapInst){
      miniMapInst.invalidateSize();
      miniMapInst.setView([m.geo[0], m.geo[1]], z);
    }
  }, 120);
}


