// 5.10.0 — המפה המאוחדת במפת המקומות (Hadabadra/Mikvaot shared/map-core 3.x, PLAN-3.0.md שלב 7, #258).
//
// מפת Leaflet נשארת המפה הראשית (לוויין, רחובות, אשכולות, מפת המסע של האישים, קישורי Google).
// הכפתור "מפה מאוחדת" שעל המפה פותח מעליה, במסך מלא, את המפה המשותפת של תוספי אוצריא (MapUI.mount)
// עם המקומות שמוצגים עכשיו במפה — כלומר אחרי החיפוש, הקטגוריות וסינון התקופות (map-layers.js).
// במפה המאוחדת: מצבי תצוגה (מפה · סביבה קרובה · רחובות · כדור), סגנון מפה, סיבוב וצפון, חיפוש צף,
// שכבות של תוספים אחרים, ושורת תקופות למעלה. "לכרטיס המלא" סוגר את המפה המאוחדת ופותח את הכרטיס.
//
// הקבצים guides/_shared/map/*.js הם העתק של המקור המשותף — לא עורכים אותם כאן; מסנכרנים ב-tools/sync-shared-map.sh.
(function(){
  'use strict';
  if (typeof L === 'undefined') return;
  const SELF = 'com.chadbedera.madaeihatanach';
  const REPO = 'https://github.com/Hadabadra/madaei-hatanach';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // הבסיס העולמי של עינים למקרא (data/geo-basemap.js) מוגדר כ-const NE_DATA; המפה המשותפת קוראת window.NE_DATA
  function shareBasemap(){ try { if (!window.NE_DATA && typeof NE_DATA !== 'undefined') window.NE_DATA = NE_DATA; } catch(e){} }

  const online = () => (typeof isOnline !== 'undefined') ? !!isOnline : navigator.onLine !== false;
  const O = () => window.Otzaria;
  const call = (m, p) => { const o = O(); return o && o.call ? o.call(m, p) : Promise.reject(new Error('no-otzaria')); };
  const openLink = u => { const o = O(); if (o && o.call) o.call('app.openUrl', { url: u }).catch(() => {}); else window.open(u, '_blank', 'noopener'); };

  const CSS = `
.eyes-uni{position:fixed;inset:0;z-index:10050;display:flex;flex-direction:column;background:var(--color-surface, Canvas);color:var(--color-on-surface, CanvasText)}
.eyes-uni[hidden]{display:none}
.eyes-uni-bar{display:flex;align-items:center;gap:.5em;flex-wrap:wrap;padding:.5em .9em;background:var(--color-surface-container, Canvas);box-shadow:0 .1em .4em rgba(0,0,0,.12)}
.eyes-uni-bar h2{margin:0;font-size:1.05em;font-weight:600;white-space:nowrap}
.eyes-uni-bar .eu-n{opacity:.7;font-size:.85em;white-space:nowrap}
.eyes-uni-per{display:flex;gap:.3em;flex-wrap:wrap;flex:1;min-width:0}
.eyes-uni button.eu{font:inherit;font-size:.85em;cursor:pointer;border:0;border-radius:2em;padding:.3em .8em;background:var(--color-surface-container-high);color:var(--color-on-surface)}
.eyes-uni button.eu[aria-pressed="true"]{background:var(--color-secondary-container, Highlight);color:var(--color-on-secondary-container, HighlightText);font-weight:600}
.eyes-uni button.eu.x{background:transparent;font-size:1.1em;padding:.2em .6em}
.eyes-uni-map{flex:1 1 auto;min-height:0;position:relative;padding:.5em}
.leaflet-bar.eyes-uni-btn a{display:flex;align-items:center;justify-content:center;cursor:pointer}
.leaflet-bar.eyes-uni-btn svg{width:1.2em;height:1.2em}`;
  function css(){ if (document.getElementById('eyes-uni-css')) return; const st = document.createElement('style'); st.id = 'eyes-uni-css'; st.textContent = CSS; document.head.append(st); }

  // המקומות שמוצגים עכשיו במפת Leaflet (אחרי חיפוש, קטגוריות ותקופות)
  function currentPoints(){
    if (typeof allMarkers === 'undefined' || !Array.isArray(allMarkers) || typeof markerLayer === 'undefined' || !markerLayer) return [];
    const D = window.DATA || (typeof DATA !== 'undefined' ? DATA : []);
    const cats = (typeof CATS !== 'undefined' && Array.isArray(CATS)) ? CATS : [];
    const out = [];
    allMarkers.forEach(rec => {
      if (!markerLayer.hasLayer(rec.marker)) return;
      const item = D[rec.idx]; if (!item || !item.methods) return;
      const m = item.methods[rec.mi]; if (!m || !m.geo) return;
      const cat = (cats.find(c => c.id === item.cat) || {}).label || '';
      out.push({ id: rec.idx + ':' + rec.mi, lat: +m.geo[0], lon: +m.geo[1], name: item.name,
        sub: [cat, item.methods.length > 1 ? m.label : '', m.confidence].filter(Boolean).join(' · ') });
    });
    return out;
  }

  let box = null;
  function periodBar(){
    const P = window.eyesPeriods; if (!P) return '';
    return P.list.map(p => `<button type="button" class="eu" data-eu-per="${esc(p.id)}" aria-pressed="${P.isOn(p.id)}" title="${P.count(p.id)} מקומות">${esc(p.label)}</button>`).join('')
      + `<button type="button" class="eu" data-eu-all="1">${P.allOn() ? 'נקה' : 'הכול'}</button>`;
  }
  function render(selId){
    shareBasemap();
    const pts = currentPoints();
    box.querySelector('.eyes-uni-per').innerHTML = periodBar();
    box.querySelector('.eu-n').textContent = pts.length + ' מקומות';
    const el = box.querySelector('.eyes-uni-map'); el.innerHTML = '';
    window.MapUI.mount(el, {
      self: SELF, tab: true, online: online(), call, openLink,
      points: pts, layerId: 'eyes-places', glyph: 'ת', layerName: 'מקומות מהתנ״ך ומחז״ל',
      selectedId: selId || null,
      pickLabel: 'לכרטיס המלא', onPick: id => openCard(id),
      repo: REPO, issueUrl: REPO + '/issues/new?title=' + encodeURIComponent('מפה מאוחדת: '),
      guide: [{ t: 'המפה המאוחדת בעינים למקרא', d: 'מוצגים המקומות שמוצגים עכשיו במפת המקומות — לפי החיפוש, הקטגוריות והתקופות. את התקופות אפשר לשנות בשורה שלמעלה. לוויין, מפת המסע של האישים ומפות גוגל נמצאים במפה הרגילה (כפתור "חזרה למפה").' }]
    });
  }
  function openCard(id){
    const idx = parseInt(String(id).split(':')[0], 10);
    const D = window.DATA || (typeof DATA !== 'undefined' ? DATA : []);
    close();
    if (D[idx] && typeof openModal === 'function') openModal(D[idx]);
  }
  function close(){ if (box) box.hidden = true; document.body.classList.remove('eyes-uni-open'); }
  function open(){
    if (!window.MapUI || !window.MapUI.mount){ console.warn('map-ui not loaded'); return; }
    css();
    if (!box){
      box = document.createElement('div'); box.className = 'eyes-uni'; box.hidden = true;
      box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'מפה מאוחדת');
      box.innerHTML = `<div class="eyes-uni-bar"><h2>מפה מאוחדת</h2><span class="eu-n"></span><div class="eyes-uni-per"></div>
        <button type="button" class="eu" data-eu-close="1" title="חזרה למפת המקומות (לוויין, מפת המסע, גוגל)">חזרה למפה</button>
        <button type="button" class="eu x" data-eu-close="1" title="סגירה" aria-label="סגירה">✕</button></div><div class="eyes-uni-map"></div>`;
      box.addEventListener('click', e => {
        if (e.target.closest('[data-eu-close]')) return close();
        const P = window.eyesPeriods; if (!P) return;
        const b = e.target.closest('[data-eu-per]'); if (b){ P.toggle(b.dataset.euPer); return render(); }
        if (e.target.closest('[data-eu-all]')){ P.setAll(!P.allOn()); return render(); }
      });
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && box && !box.hidden) close(); });
      document.body.append(box);
    }
    box.hidden = false; document.body.classList.add('eyes-uni-open');
    render();
  }
  window.eyesOpenUnifiedMap = open;

  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>';
  function addControl(){
    if (typeof worldMap === 'undefined' || !worldMap) return false;
    if (worldMap._eyesUni) return true; worldMap._eyesUni = true;
    const Ctl = L.Control.extend({ options: { position: 'topleft' }, onAdd(){
      const div = L.DomUtil.create('div', 'leaflet-bar eyes-uni-btn');
      const a = L.DomUtil.create('a', '', div); a.href = '#'; a.title = 'מפה מאוחדת — מצבי תצוגה, כדור, סיבוב ושכבות של תוספים אחרים'; a.setAttribute('aria-label', 'מפה מאוחדת'); a.innerHTML = ICON;
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.on(a, 'click', L.DomEvent.stop).on(a, 'click', open);
      return div;
    }});
    worldMap.addControl(new Ctl());
    return true;
  }
  if (typeof window.initWorldMap === 'function'){ const base = window.initWorldMap; window.initWorldMap = function(){ const r = base.apply(this, arguments); try { addControl(); } catch(e){} return r; }; }
  let tries = 0;
  (function wait(){ if (addControl()) return; setTimeout(wait, ++tries < 60 ? 150 : 600); })();
})();
