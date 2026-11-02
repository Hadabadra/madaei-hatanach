// 5.8.0 — מפת המקומות על המפה המשותפת (map-core / map-ui 2.x).
//   המקור היחיד של המפה: Hadabadra/Mikvaot/shared/map-core. העותקים כאן (guides/_shared/map/) נדרסים
//   ב-tools/sync-shared-map.sh — לא עורכים אותם. הקובץ הזה הוא רק המתאם של עינים למקרא:
//   • נקודות = המקומות שברשימה המסוננת (DATA) שיש להם קואורדינטות.
//   • סינון לפי תקופות — כשכבות בתפריט השכבות של המפה המשותפת (אותו חישוב כמו ב-5.5.0).
//   • שכבות מתוספים אחרים, סיבוב, צפון, חיפוש צף, מסך מלא ובסיס עולמי — מגיעים מ-map-ui.
//   • המפה הישנה (Leaflet: לוויין ומפת רחובות) נשארת כתצוגה חלופית בלחיצה, למי שצריך תמונת לוויין.
//   • מפת המסע של האישים (shell/entry-detail.js) משתמשת ב-EyesMap.journey.
// נטען אחרי map.js ומחליף את initWorldMap / resetWorldMap / updateMapFilter / focusOnMainMap.
(function(){
  'use strict';
  if (typeof window.MapUI === 'undefined') return;
  (function(){ const st = document.createElement('style'); st.textContent =
    '.eyes-map-mode{display:flex;gap:.4em;align-items:center;flex-wrap:wrap;margin:0 0 .5em;font-size:.9em;color:var(--color-on-surface-variant)}'
    + '.eyes-map-mode button{border:0;border-radius:999em;padding:.3em .9em;background:var(--color-surface-container);color:var(--color-on-surface);cursor:pointer;font:inherit}'
    + '.eyes-map-mode button.on{background:var(--color-primary);color:var(--color-on-primary)}';
    document.head.appendChild(st); })();
  const SELF = 'com.chadbedera.madaeihatanach';
  const MODE_KEY = 'eyes-map-mode', PER_KEY = 'eyes-map-periods';
  const PERIODS = [
    { id:'avot', g:'א',     label:'ימי האבות',                  books:['בראשית'] },
    { id:'midbar', g:'מ',   label:'יציאת מצרים והמדבר',         books:['שמות','ויקרא','במדבר','דברים'] },
    { id:'kibush', g:'כ',   label:'כיבוש הארץ והשופטים',        books:['יהושע','שופטים','רות'] },
    { id:'melachim', g:'נ', label:'ימי המלכים והנביאים',        books:['שמואל','מלכים','ישעיהו','ירמיהו','יחזקאל','הושע','יואל','עמוס','עובדיה','יונה','מיכה','נחום','חבקוק','צפניה','תהילים','משלי','איוב','שיר','קהלת','איכה','דברי'] },
    { id:'galut', g:'ג',    label:'גלות ושיבת ציון',            books:['דניאל','עזרא','נחמיה','אסתר','חגי','זכריה','מלאכי'] },
    { id:'chazal', g:'ח',   label:'ימי חז״ל (משנה ותלמוד)',     books:[] },
    { id:'none', g:'·',     label:'בלי מראה מקום',              books:[] }
  ];
  const TANAKH = new Set(PERIODS.flatMap(p => p.books));
  const bookOf = ref => String(ref || '').trim().split(/[\s,]+/)[0];
  function periodsOf(item){
    const set = new Set();
    if (item.cat === 'stations') set.add('midbar');
    if (item.cat === 'bavel') set.add('chazal');
    (item.verses || []).forEach(v => {
      const b = bookOf(v.ref); if (!b) return;
      const p = PERIODS.find(x => x.books.includes(b));
      set.add(p ? p.id : (TANAKH.has(b) ? 'melachim' : 'chazal'));
    });
    if (!set.size) set.add('none');
    return set;
  }
  const ls = {
    get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
    set(k, v){ try { localStorage.setItem(k, v); } catch(e){} }
  };
  let on = new Set(PERIODS.map(p => p.id));
  try { const s = JSON.parse(ls.get(PER_KEY) || 'null'); if (Array.isArray(s) && s.length) on = new Set(s); } catch(e){}
  const savePer = () => ls.set(PER_KEY, JSON.stringify([...on]));

  const O = () => window.Otzaria;
  const call = (m, p) => (O() && O().call) ? O().call(m, p) : Promise.reject(new Error('no Otzaria'));
  const openLink = u => { if (O() && O().call) O().call('app.openUrl', { url: u }).catch(() => {}); else window.open(u, '_blank', 'noopener'); };
  const online = () => navigator.onLine !== false && !document.documentElement.classList.contains('otz-offline');

  // ── המקור הישן (Leaflet) — שמור לתצוגה החלופית ──
  const leaflet = {
    init: window.initWorldMap, reset: window.resetWorldMap,
    filter: window.updateMapFilter, focus: window.focusOnMainMap
  };
  const mode = () => (ls.get(MODE_KEY) === 'leaflet' && typeof window.L !== 'undefined') ? 'leaflet' : 'shared';

  let mounted = null, hostEl = null, lastView = null;
  const ptId = (idx, mi) => idx + ':' + mi;

  function buildPoints(){
    const data = window.DATA || [];
    const visible = (typeof currentVisibleIdxSet === 'function') ? currentVisibleIdxSet() : null;
    const pts = [];
    data.forEach((item, idx) => {
      if (visible && !visible.has(idx)) return;
      const per = periodsOf(item);
      if (on.size < PERIODS.length && ![...per].some(p => on.has(p))) return;
      (item.methods || []).forEach((m, mi) => {
        if (!m || !m.geo || m.geo.length < 2) return;
        if (mi > 0 && (item.methods || []).slice(0, mi).some(x => x && x.geo && x.geo[0] === m.geo[0] && x.geo[1] === m.geo[1])) return;
        pts.push({ id: ptId(idx, mi), name: item.name, sub: (m.label || m.name || m.modern || '').toString().slice(0, 80), lat: +m.geo[0], lon: +m.geo[1] });
      });
    });
    return pts;
  }
  function periodLayers(){
    const data = window.DATA || [];
    const cnt = {}; data.forEach(it => periodsOf(it).forEach(p => { cnt[p] = (cnt[p] || 0) + 1; }));
    return PERIODS.map(p => ({ id: 'per-' + p.id, name: 'תקופה: ' + p.label, sub: (cnt[p.id] || 0) + ' מקומות', glyph: p.g, points: [], lines: [], on: on.has(p.id) }));
  }

  function toolbar(el){
    let bar = el.previousElementSibling;
    if (!bar || !bar.classList.contains('eyes-map-mode')){
      bar = document.createElement('div');
      bar.className = 'eyes-map-mode';
      el.parentNode.insertBefore(bar, el);
      bar.addEventListener('click', e => {
        const b = e.target.closest('[data-eyes-mode]'); if (!b) return;
        ls.set(MODE_KEY, b.dataset.eyesMode);
        window.resetWorldMap(); window.initWorldMap();
      });
    }
    const m = mode(), hasL = typeof window.L !== 'undefined';
    bar.innerHTML = `<span>תצוגת המפה:</span>`
      + `<button type="button" class="${m === 'shared' ? 'on' : ''}" data-eyes-mode="shared" aria-pressed="${m === 'shared'}">מפה משותפת</button>`
      + (hasL ? `<button type="button" class="${m === 'leaflet' ? 'on' : ''}" data-eyes-mode="leaflet" aria-pressed="${m === 'leaflet'}">לוויין ורחובות</button>` : '');
  }

  function mountShared(el){
    hostEl = el;
    const keep = mounted && mounted.state ? mounted.state : lastView;
    el.innerHTML = '';
    if (!el.style.height || parseInt(el.style.height, 10) < 460) el.style.height = '520px';
    mounted = MapUI.mount(el, {
      self: SELF,
      points: buildPoints(), layerId: 'places', glyph: 'ת', layerName: 'מקומות מהתנ״ך ומחז״ל',
      layers: periodLayers(),
      call, openLink, online: online(),
      onPick: id => { const idx = parseInt(String(id).split(':')[0], 10); const item = (window.DATA || [])[idx]; if (item && typeof window.openModal === 'function') window.openModal(item); },
      pickLabel: 'פתיחת הערך',
      repo: 'https://github.com/Hadabadra/madaei-hatanach'
    });
    if (keep && mounted && mounted.state){
      ['lat', 'lon', 'zoom', 'rot'].forEach(k => { if (keep[k] != null) mounted.state[k] = keep[k]; });
      if (keep.show) Object.keys(keep.show).forEach(k => { if (k.indexOf('x-per-') !== 0) mounted.state.show[k] = keep.show[k]; });
      mounted.refresh();
    }
  }
  // שינוי תקופה בתפריט השכבות: מסננים את הנקודות ובונים מחדש (שומרים מיקום, זום וסיבוב)
  document.addEventListener('change', e => {
    const c = e.target.closest && e.target.closest('[data-mu-layer^="x-per-"]');
    if (!c || !hostEl || !hostEl.contains(c)) return;
    const id = c.dataset.muLayer.slice(6);
    if (c.checked) on.add(id); else on.delete(id);
    savePer();
    lastView = mounted && mounted.state;
    mountShared(hostEl);
    const lb = hostEl.querySelector('[data-mu="layers"]'); if (lb) lb.click();
  });

  window.initWorldMap = function(){
    const el = document.getElementById('worldMap');
    if (!el) return;
    toolbar(el);
    if (mode() === 'leaflet'){ el.style.height = ''; return leaflet.init && leaflet.init(); }
    if (mounted && hostEl === el && el.querySelector('.mu-stage')) return;
    mountShared(el);
    openMapRequest();
  };
  window.resetWorldMap = function(){
    if (leaflet.reset) leaflet.reset();
    if (mounted && mounted.state) lastView = mounted.state;
    mounted = null;
    if (hostEl){ hostEl.classList.remove('mapui', 'mu-full'); hostEl.innerHTML = ''; }
    hostEl = null;
  };
  window.updateMapFilter = function(){
    if (mode() === 'leaflet') return leaflet.filter && leaflet.filter();
    if (hostEl){ lastView = mounted && mounted.state; mountShared(hostEl); }
  };
  function focus(lat, lon, idx, mi){
    if (mode() === 'leaflet') return false;
    if (!mounted){ window.initWorldMap(); }
    if (!mounted) return false;
    const sec = document.getElementById('worldMap');
    if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (idx != null) mounted.select(ptId(idx, mi || 0));
    else mounted.goTo(lat, lon, 3);
    return true;
  }
  window.focusOnMainMap = function(item, mi){
    if (mode() === 'leaflet') return leaflet.focus && leaflet.focus(item, mi);
    const idx = (window.DATA || []).indexOf(item);
    const m = item && item.methods && item.methods[mi || 0];
    if (!m || !m.geo) return;
    if (typeof window.closeModal === 'function') window.closeModal();
    focus(m.geo[0], m.geo[1], idx, mi);
  };

  // פתיחה ממפה של תוסף אחר ({type:"open-map"} — shell/bridge.js שומר ב-sessionStorage)
  function openMapRequest(){
    let r = null; try { r = JSON.parse(sessionStorage.getItem('eyes-open-map') || 'null'); sessionStorage.removeItem('eyes-open-map'); } catch(e){}
    if (!r || !isFinite(r.lat) || !isFinite(r.lon) || !mounted) return;
    mounted.goTo(+r.lat, +r.lon, 2, 'המקום מהמפה של ' + (r.from || 'התוסף השני'));
    const sec = document.getElementById('worldMap'); if (sec) sec.scrollIntoView({ block: 'center' });
  }
  window.addEventListener('storage', e => { if (e.key === 'eyes-open-map' && e.newValue) openMapRequest(); });
  window.eyesOpenMap = openMapRequest;
  if (typeof MapUI.onOpenMap === 'function') MapUI.onOpenMap(r => { try { sessionStorage.setItem('eyes-open-map', JSON.stringify(r)); } catch(e){} openMapRequest(); });

  // ── מפת המסע של אישים: אותה מפה משותפת, שכבת קו + תחנות ממוספרות. מסך מלא — כפתור המפה עצמה ──
  function journey(container, points){
    if (!points || !points.length) return false;
    container.innerHTML = '';
    container.style.height = container.style.height || '340px';
    const coords = points.map(p => [p.lat, p.lng]);
    const m = MapUI.mount(container, {
      self: SELF, points: [], layerName: 'תחנות המסע',
      layers: [{ id: 'journey', name: 'מפת המסע', glyph: '➜', on: true,
        lines: coords.length > 1 ? [{ coords, label: 'מסלול המסע' }] : [],
        points: points.map((p, i) => ({ id: '__j' + i, lat: p.lat, lon: p.lng, label: (i + 1) + '. ' + p.label + ': ' + p.name })) }],
      call, openLink, online: online()
    });
    if (m && m.state){
      const lat = coords.reduce((a, c) => a + c[0], 0) / coords.length, lon = coords.reduce((a, c) => a + c[1], 0) / coords.length;
      const far = Math.max(20000, ...coords.map(c => Math.hypot((c[0] - lat) * 111000, (c[1] - lon) * 111000 * Math.cos(lat * Math.PI / 180))));
      m.state.lat = lat; m.state.lon = lon; m.state.zoom = Math.max(0.00004, Math.min(4, 300 / (far * 1.4)));
      m.refresh();
    }
    return true;
  }

  window.EyesMap = { periodsOf, PERIODS, focus, journey, mode, version: MapUI.VERSION };
})();
