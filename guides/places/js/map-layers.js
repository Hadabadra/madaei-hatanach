// 5.5.0 — שכבות במפת המקומות (מפה משותפת 2.0, Hadabadra/Prayer-pointA#11):
//   1. סינון המקומות לפי תקופות. התקופה נגזרת מהספרים שבהם המקום מוזכר בשדה "verses" (בראשית → אבות,
//      שמות–דברים ותחנות המסע → יציאת מצרים והמדבר, וכו'); מקום שמוזכר בכמה ספרים שייך לכמה תקופות.
//      זו חלוקה לפי הספרים ולא קביעה היסטורית — כך גם כתוב בממשק.
//   2. שכבות מתוספים אחרים (כיוון תפילה, מקוואות, גבולות עירוב): פתיחת התוסף ההוא באותו מקום במפה,
//      מתוך map-ui.js — העתק של המאגר המשותף (Hadabadra/Mikvaot/shared/map-core). לא לערוך את העותק.
//   3. כשתוסף אחר פותח את עינים למקרא עם {type:"open-map", lat, lon} — המפה מתמקדת שם (shell/bridge.js שומר את הבקשה).
(function(){
  'use strict';
  if (typeof L === 'undefined' || typeof DATA === 'undefined') return;
  const SELF = 'com.chadbedera.madaeihatanach';
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
  const periodsOf = item => {
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
  };
  const PER = DATA.map(periodsOf);
  const KEY = 'eyes-map-periods';
  let on = new Set(PERIODS.map(p => p.id));
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (Array.isArray(s) && s.length) on = new Set(s); } catch(e){}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify([...on])); } catch(e){} };
  const allOn = () => on.size === PERIODS.length;

  // סינון: מה שמוצג ברשימה (כמו קודם) וגם בתקופה מסומנת
  const baseFilter = window.updateMapFilter;
  window.updateMapFilter = function(){
    if (typeof worldMap === 'undefined' || !worldMap || !markerLayer) return;
    if (allOn()) return baseFilter();
    const visible = currentVisibleIdxSet();
    markerLayer.clearLayers();
    allMarkers.forEach(rec => { if (visible.has(rec.idx) && [...PER[rec.idx]].some(p => on.has(p))) markerLayer.addLayer(rec.marker); });
  };

  const count = id => PER.filter(s => s.has(id)).length;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const periodsHTML = () => `<h5>תקופות</h5>`
    + PERIODS.map(p => `<label class="mu-row"><span class="mu-g alt">${esc(p.g)}</span><span class="mu-t">${esc(p.label)}<small>${count(p.id)} מקומות</small></span><input type="checkbox" class="mu-sw" data-period="${p.id}"${on.has(p.id) ? ' checked' : ''}></label>`).join('')
    + `<div class="bar"><button type="button" class="mu" data-periods="all">הכול</button><button type="button" class="mu" data-periods="none">נקה</button></div>`
    + `<p class="msg">לפי הספרים שבהם המקום מוזכר (בראשית — ימי האבות, יהושע ושופטים — הכיבוש וכו'). מקום שמוזכר בכמה ספרים מופיע בכמה תקופות.</p>`;

  function addControl(){
    if (typeof worldMap === 'undefined' || !worldMap || !window.MapUI) return false;
    const Ctl = L.Control.extend({ options:{ position:'topleft' }, onAdd(){
      const div = L.DomUtil.create('div', 'leaflet-bar eyes-layers');
      L.DomEvent.disableClickPropagation(div); L.DomEvent.disableScrollPropagation(div);
      const O = window.Otzaria;
      MapUI.layersButton(div, {
        self: SELF, online: navigator.onLine !== false,
        call: (m, p) => O && O.call ? O.call(m, p) : Promise.reject(0),
        openLink: u => { if (O && O.call) O.call('app.openUrl', { url: u }).catch(()=>{}); else window.open(u, '_blank', 'noopener'); },
        getPos: () => { const c = worldMap.getCenter(); return [c.lat, c.lng]; },
        extraHTML: periodsHTML(),
        onExtra(pop){
          pop.addEventListener('change', e => { const c = e.target.closest('[data-period]'); if (!c) return; c.checked ? on.add(c.dataset.period) : on.delete(c.dataset.period); save(); updateMapFilter(); mark(); });
          pop.addEventListener('click', e => { const b = e.target.closest('[data-periods]'); if (!b) return; on = b.dataset.periods === 'all' ? new Set(PERIODS.map(p => p.id)) : new Set(); save();
            pop.querySelectorAll('[data-period]').forEach(c => { c.checked = on.has(c.dataset.period); }); updateMapFilter(); mark(); });
        }
      });
      return div;
    }});
    const ctl = new Ctl(); worldMap.addControl(ctl);
    const mark = () => { const b = document.querySelector('.eyes-layers .mu-ib'); if (b) { b.setAttribute('aria-pressed', String(!allOn())); b.title = allOn() ? 'שכבות ותקופות' : 'שכבות ותקופות — מסונן'; } };
    mark();
    if (!allOn()) updateMapFilter();
    return true;
  }

  // פתיחה ממפה של תוסף אחר: הבקשה נשמרת ב-sessionStorage (המסגרת מאותו מקור)
  function openMapRequest(){
    let r = null; try { r = JSON.parse(sessionStorage.getItem('eyes-open-map') || 'null'); sessionStorage.removeItem('eyes-open-map'); } catch(e){}
    if (!r || !isFinite(r.lat) || !isFinite(r.lon)) return;
    worldMap.setView([r.lat, r.lon], Math.max(worldMap.getZoom(), 9));
    const sec = document.getElementById('mapSection'); if (sec) sec.scrollIntoView({ block:'start' });
    L.circleMarker([r.lat, r.lon], { radius: 9, color: 'var(--color-primary, #1a73e8)', weight: 3, fillOpacity: .15 }).addTo(worldMap).bindTooltip('המקום מהמפה של התוסף השני').openTooltip();
  }
  window.addEventListener('storage', e => { if (e.key === 'eyes-open-map' && e.newValue) openMapRequest(); });
  window.eyesOpenMap = openMapRequest;

  let tries = 0;
  (function wait(){ if (addControl()) { openMapRequest(); return; } setTimeout(wait, ++tries < 60 ? 150 : 600); })();   // 5.6.1 #245: המפה נטענת לפעמים מאוחר — ממשיכים לחכות
})();
