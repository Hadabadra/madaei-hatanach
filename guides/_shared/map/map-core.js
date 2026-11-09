/* map-core: בסיס משותף למפה ולחיפוש בתוספי אוצריא (מקוואות, גבולות עירוב, כיוון תפילה).
   נגזר מ-streets.js של כיוון תפילה. גרסה 2.0 (01.11.2026): בסיס עולמי, סגנון מסלול. מחובר למקוואות ולגבולות עירוב דרך map-ui.js.
   אין תלות ב-DOM: הפונקציות מקבלות נתונים ומחזירות נתונים או מחרוזת SVG, ולכן אפשר לבדוק אותן ב-Node.

   פורמט אזור (כמו בכיוון תפילה):
     { k, lat, lon, r, d, name,
       w: [[שם, סוג-כביש, [lat, lon, lat, lon, ...]], ...],   // רחובות ומבנים
       s: [[שם, lat, lon], ...] }                               // נקודות עניין (בתי כנסת)
   z === 2 = הקואורדינטות שמורות כהפרשים ב-1e-5 מעלה; decodeArea מפרק אותן. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MapCore = factory();
})(this, function () {
  'use strict';
  const R = Math.PI / 180;
  const M_LAT = 110540;                       // מטרים למעלת רוחב
  const mLon = lat => 111320 * Math.cos(lat * R);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ── גאומטריה ── */
  function distM(a, b) {                      // מרחק במטרים בין [lat, lon] ל-[lat, lon] (קירוב מישורי, מספיק לעיר)
    const dx = (b[1] - a[1]) * mLon((a[0] + b[0]) / 2), dy = (b[0] - a[0]) * M_LAT;
    return Math.hypot(dx, dy);
  }
  function nearOnSegment(p, q1, q2) {         // הנקודה הקרובה ביותר ל-p על הקטע q1-q2 (מישור במטרים)
    const dx = q2[0] - q1[0], dy = q2[1] - q1[1];
    const u = Math.max(0, Math.min(1, ((p[0] - q1[0]) * dx + (p[1] - q1[1]) * dy) / (dx * dx + dy * dy || 1)));
    return [q1[0] + u * dx, q1[1] + u * dy];
  }

  function inPoly(p, ring) {                  // 3.1: נקודה [lat, lon] בתוך מצולע [[lat, lon], ...] (ray casting)
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i], b = ring[j];
      if ((a[0] > p[0]) !== (b[0] > p[0]) && p[1] < (b[1] - a[1]) * (p[0] - a[0]) / (b[0] - a[0]) + a[1]) inside = !inside;
    }
    return inside;
  }
  function distToRing(p, ring) {             // מרחק במטרים מנקודה לקו המצולע
    const k = [M_LAT, mLon(p[0])], P = [p[0] * k[0], p[1] * k[1]]; let best = Infinity;
    for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; const q = nearOnSegment(P, [a[0] * k[0], a[1] * k[1]], [b[0] * k[0], b[1] * k[1]]); best = Math.min(best, Math.hypot(q[0] - P[0], q[1] - P[1])); }
    return best;
  }

  /* ── נתוני אזור ── */
  function decodeArea(a) {
    if (!a || a.z !== 2) return a;
    const B = [Math.round(a.lat * 1e5), Math.round(a.lon * 1e5)];
    const out = Object.assign({}, a);
    out.w = a.w.map(([n, h, g]) => {
      const o = []; let x = B[0], y = B[1];
      for (let i = 0; i < g.length; i += 2) { x += g[i]; y += g[i + 1]; o.push(x / 1e5, y / 1e5); }
      return [n, h, o];
    });
    out.s = (a.s || []).map(([n, dx, dy]) => [n, (B[0] + dx) / 1e5, (B[1] + dy) / 1e5]);
    out.z = 0;
    return out;
  }

  /* קובץ Overpass גולמי (עם geometry) לפורמט האזור. אם כבר בפורמט האזור, מוחזר כמו שהוא. */
  function compactOverpass(j, lat, lon, r) {
    if (j && Array.isArray(j.w)) return j;
    const all = (j && j.elements) || [];
    const els = all.filter(e => e.type === 'way' && (e.tags || {}).highway && Array.isArray(e.geometry) && e.geometry.length > 1);
    if (!els.length) throw new Error('בקובץ אין רחובות');
    if (lat == null) {                         // מרכז ורדיוס מתוך הנתונים עצמם
      let s = 0, t = 0, c = 0;
      for (const e of els) for (const g of e.geometry) { s += g.lat; t += g.lon; c++; }
      lat = s / c; lon = t / c; r = 0;
      for (const e of els) for (const g of e.geometry) r = Math.max(r, distM([lat, lon], [g.lat, g.lon]));
      r = Math.round(r);
    }
    const w = els.map(e => {
      const t = e.tags || {};
      return [t['name:he'] || t.name || '', t.highway || '', e.geometry.flatMap(g => [+g.lat.toFixed(6), +g.lon.toFixed(6)])];
    });
    const s = [];
    for (const e of all) {
      const t = e.tags || {};
      if (t.amenity !== 'place_of_worship') continue;
      let p = null;
      if (e.lat != null) p = [e.lat, e.lon];
      else if (e.bounds) p = [(e.bounds.minlat + e.bounds.maxlat) / 2, (e.bounds.minlon + e.bounds.maxlon) / 2];
      else if (Array.isArray(e.geometry) && e.geometry.length) {
        let a = 0, b = 0; for (const g of e.geometry) { a += g.lat; b += g.lon; }
        p = [a / e.geometry.length, b / e.geometry.length];
      }
      if (p) s.push([t['name:he'] || t.name || '', +p[0].toFixed(5), +p[1].toFixed(5)]);
    }
    return { v: 1, s, k: lat.toFixed(3) + '_' + lon.toFixed(3) + '_' + r, lat: +lat.toFixed(5), lon: +lon.toFixed(5), r, d: new Date().toISOString().slice(0, 10), w };
  }

  /* האזור שמכסה את המיקום: קודם אזור שהמיקום בתוכו (בשוליים של edge מטרים מהקצה); אם אין, אזור שהמיקום בשוליו.
     מחזיר { area, partial } או null. areas: רשימת תיאורי אזורים { k, lat, lon, r }. */
  function findCover(areas, pos, opt) {
    const edge = (opt && opt.edgeM) || 150, outer = (opt && opt.outerM) || 1500;
    let inside = null, border = null;
    for (const a of areas) {
      const m = distM(pos, [a.lat, a.lon]);
      if (m <= a.r - edge) { if (!inside || m < inside[1]) inside = [a, m]; }
      else if (m <= a.r + outer) { if (!border || m - a.r < border[1]) border = [a, m - a.r]; }
    }
    if (inside) return { area: inside[0], partial: false };
    if (border) return { area: border[0], partial: true };
    return null;
  }

  /* ── חיפוש ── */
  // ניקוי לצורך השוואה: בלי גרשיים ומקפים, רווחים בודדים, אותיות קטנות
  const normName = s => String(s == null ? '' : s).replace(/["'״׳\-]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  // נרמול חיפוש כללי בעברית (ניקוד, פיסוק, "קריית"="קרית", יי="י", וו="ו")
  const normHe = s => String(s || '').toLowerCase().replace(/[֑-ׇ"'׳״`’\-–—,.()]/g, ' ').replace(/קריית/g, 'קרית').replace(/יי/g, 'י').replace(/וו/g, 'ו').replace(/\s+/g, ' ').trim();

  // קיצורי ערים נפוצים. אותה רשימה כמו במקוואות. הנרמול מוחק גרשיים ומקפים, ולכן ההרחבה נעשית לפניו.
  const Q = '["״\'׳]';
  const ALIASES = [['י', 'ם', 'ירושלים', '[-־–"״\'׳]'], ['ב', 'ב', 'בני ברק'], ['ת', 'א', 'תל אביב'], ['פ', 'ת', 'פתח תקווה'], ['ב', 'ש', 'באר שבע'],
    ['ר', 'ג', 'רמת גן'], ['ר', 'ל', 'ראשון לציון'], ['ק', 'ש', 'קרית שמונה'], ['ק', 'ג', 'קרית גת']]
    .map(([a, b, full, sep]) => [new RegExp('(^|\\s)' + a + (sep || Q) + b + '(?=\\s|$)', 'g'), full]);
  const expandAliases = s => ALIASES.reduce((t, [re, full]) => t.replace(re, '$1' + full), String(s || ''));

  function findWays(area, q) {                 // התאמה מדויקת קודם, ואם אין: מכיל
    const Qn = normName(q);
    const idx = area.w.map((x, i) => [x, i]);
    let ws = idx.filter(([x]) => normName(x[0]) === Qn);
    if (!ws.length) ws = idx.filter(([x]) => normName(x[0]).includes(Qn));
    return ws;                                 // [[way, index], ...]
  }
  /* חיפוש רחוב: הקטע הארוך ביותר של הרחוב ומרכזו. */
  function searchStreet(area, q) {
    const ws = findWays(area, q); if (!ws.length) return null;
    const kx = mLon(area.lat); let best = null;
    for (const [[name, , g], i] of ws) {
      for (let k = 0; k + 3 < g.length; k += 2) {
        const L = Math.hypot((g[k + 2] - g[k]) * M_LAT, (g[k + 3] - g[k + 1]) * kx);
        if (!best || L > best.len) best = { len: L, i, k, name };
      }
    }
    const g = area.w[best.i][2], k = best.k;
    return { i: best.i, k, name: best.name, lat: +((g[k] + g[k + 2]) / 2).toFixed(6), lon: +((g[k + 1] + g[k + 3]) / 2).toFixed(6) };
  }
  /* חיפוש פינה: נקודת המפגש של שני רחובות. null אם אין, או אם הם רחוקים יותר מ-maxM. */
  function findCorner(area, a, b, maxM) {
    maxM = maxM || 150;
    const A = findWays(area, a), B = findWays(area, b);
    if (!A.length || !B.length) return null;
    const o = [area.lat, area.lon], kx = mLon(o[0]);
    const xy = (la, lo) => [(lo - o[1]) * kx, (la - o[0]) * M_LAT];
    let best = null;
    for (const [[, , g], i] of A) for (let k = 0; k + 3 < g.length; k += 2) {
      const a1 = xy(g[k], g[k + 1]), a2 = xy(g[k + 2], g[k + 3]);
      for (const [[, , h]] of B) for (let j = 0; j + 3 < h.length; j += 2) {
        const b1 = xy(h[j], h[j + 1]), b2 = xy(h[j + 2], h[j + 3]);
        for (const [p, q1, q2] of [[a1, b1, b2], [a2, b1, b2], [b1, a1, a2], [b2, a1, a2]]) {
          const n = nearOnSegment(p, q1, q2), d = Math.hypot(n[0] - p[0], n[1] - p[1]);
          if (!best || d < best[0]) best = [d, (p[0] + n[0]) / 2, (p[1] + n[1]) / 2, i, k];
        }
      }
    }
    if (!best) return null;
    return { gapM: Math.round(best[0]), ok: best[0] <= maxM, lat: +(o[0] + best[2] / M_LAT).toFixed(6), lon: +(o[1] + best[1] / kx).toFixed(6), i: best[3], k: best[4],
      names: [area.w[best[3]][0], B[0][0][0]] };
  }
  /* הרחובות הקרובים ביותר לנקודה (ללא כפילויות לפי שם), ממוינים לפי מרחק במטרים. */
  function nearestStreets(area, p, limit) {
    const kx = mLon(p[0]), B = new Map();
    for (const [n, , g] of area.w) {
      if (!n) continue;
      for (let k = 0; k + 3 < g.length; k += 2) {
        const ax = (g[k + 1] - p[1]) * kx, ay = (g[k] - p[0]) * M_LAT, bx = (g[k + 3] - p[1]) * kx, by = (g[k + 2] - p[0]) * M_LAT;
        const dx = bx - ax, dy = by - ay, u = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)));
        const d = Math.hypot(ax + u * dx, ay + u * dy);
        if (!B.has(n) || d < B.get(n)) B.set(n, d);
      }
    }
    return [...B].sort((a, b) => a[1] - b[1]).slice(0, limit || 5).map(([name, d]) => ({ name, distM: Math.round(d) }));
  }
  /* שם למקום לפי הרחובות שלידו: "א פינת ב" / "ליד א" / "" */
  function placeLabel(area, p) {
    const L = nearestStreets(area, p, 2);
    if (!L.length || L[0].distM > 120) return '';
    return L[1] && L[1].distM < 60 ? `${L[0].name} פינת ${L[1].name}` : (L[0].distM < 25 ? L[0].name : 'ליד ' + L[0].name);
  }

  /* ── תצוגה והטלה ── */
  /* view: { lat, lon (מרכז), zoom (1 = חצי רוחב של 300 מ'), rot (מעלות בכיוון השעון), width, height } */
  function createView(o) {
    const v = Object.assign({ zoom: 1, rot: 0, width: 400, height: 320 }, o);
    if (v.proj === 'globe') {   // 3.0: כדור — הטלה אורתוגרפית. v.gz = גודל הכדור (1 = ממלא את המסגרת)
      v.globe = true; v.gz = v.gz || 1;
      v.rad = Math.min(v.width, v.height) * .46 * v.gz;
      v.scale = v.rad / 6371000; v.hw = (v.width / 2) / v.scale; v.zoom = 300 / v.hw;
      v.kx = mLon(v.lat);
      return v;
    }
    v.kx = mLon(v.lat); v.hw = 300 / v.zoom; v.scale = (v.width / 2) / v.hw;
    return v;
  }
  // כדור: [x, y, cosc] — cosc < 0 = הנקודה בצד הנסתר
  function globeXY(v, lat, lon) {
    const f = lat * R, l = (lon - v.lon) * R, f0 = v.lat * R;
    const cosc = Math.sin(f0) * Math.sin(f) + Math.cos(f0) * Math.cos(f) * Math.cos(l);
    let x = Math.cos(f) * Math.sin(l), y = Math.cos(f0) * Math.sin(f) - Math.sin(f0) * Math.cos(f) * Math.cos(l);
    const c = Math.cos(v.rot * R), s = Math.sin(v.rot * R), xr = x * c + y * s, yr = -x * s + y * c;
    return [v.width / 2 + xr * v.rad, v.height / 2 - yr * v.rad, cosc];
  }
  function project(v, lat, lon) {
    if (v.globe) { const p = globeXY(v, lat, lon); return p[2] < 0 ? [-1e5, -1e5, p[2]] : p; }
    const dx = (lon - v.lon) * v.kx, dy = (lat - v.lat) * M_LAT, c = Math.cos(v.rot * R), s = Math.sin(v.rot * R);
    const x = dx * c + dy * s, y = -dx * s + dy * c;
    return [v.width / 2 + x * v.scale, v.height / 2 - y * v.scale];
  }
  function unproject(v, px, py) {
    if (v.globe) {
      const xr = (px - v.width / 2) / v.rad, yr = (v.height / 2 - py) / v.rad, c = Math.cos(v.rot * R), s = Math.sin(v.rot * R);
      const x = xr * c - yr * s, y = xr * s + yr * c, rho = Math.hypot(x, y);
      if (rho > 1) return null;
      const cc = Math.asin(rho), f0 = v.lat * R;
      if (rho < 1e-12) return [v.lat, v.lon];
      const lat = Math.asin(Math.cos(cc) * Math.sin(f0) + y * Math.sin(cc) * Math.cos(f0) / rho) / R;
      const lon = v.lon + Math.atan2(x * Math.sin(cc), rho * Math.cos(cc) * Math.cos(f0) - y * Math.sin(cc) * Math.sin(f0)) / R;
      return [+lat.toFixed(6), +(((lon + 540) % 360) - 180).toFixed(6)];
    }
    const x = (px - v.width / 2) / v.scale, y = (v.height / 2 - py) / v.scale, c = Math.cos(v.rot * R), s = Math.sin(v.rot * R);
    const dx = x * c - y * s, dy = x * s + y * c;
    return [+(v.lat + dy / M_LAT).toFixed(6), +(v.lon + dx / v.kx).toFixed(6)];
  }
  // קו גדול-מעגל בין שתי נקודות (לקו לירושלים בכדור ובמפת העולם)
  function greatCircle(a, b, n) {
    n = n || 64; const p1 = [a[0] * R, a[1] * R], p2 = [b[0] * R, b[1] * R];
    const d = 2 * Math.asin(Math.sqrt(Math.sin((p2[0] - p1[0]) / 2) ** 2 + Math.cos(p1[0]) * Math.cos(p2[0]) * Math.sin((p2[1] - p1[1]) / 2) ** 2));
    if (!d) return [a, b];
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, A = Math.sin((1 - t) * d) / Math.sin(d), B = Math.sin(t * d) / Math.sin(d);
      const x = A * Math.cos(p1[0]) * Math.cos(p1[1]) + B * Math.cos(p2[0]) * Math.cos(p2[1]);
      const y = A * Math.cos(p1[0]) * Math.sin(p1[1]) + B * Math.cos(p2[0]) * Math.sin(p2[1]);
      const z = A * Math.sin(p1[0]) + B * Math.sin(p2[0]);
      out.push([Math.atan2(z, Math.hypot(x, y)) / R, Math.atan2(y, x) / R]);
    }
    return out;
  }

  /* כתובת Overpass להורדת רחובות (ובתי כנסת) סביב נקודה. פותחים בדפדפן, שומרים את הקובץ וטוענים בתוסף. */
  const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
  // קו מתאר מקורב של ישראל (לא מדויק; לרקע בלבד כשאין קובץ רחובות)
  const OUTLINE = [[33.09,35.10],[33.28,35.58],[33.25,35.65],[33.10,35.84],[32.95,35.88],[32.70,35.80],[32.55,35.55],[32.00,35.55],[31.75,35.55],[31.30,35.45],[30.80,35.40],[30.00,35.15],[29.55,34.95],[30.00,34.85],[30.80,34.45],[31.25,34.27],[31.60,34.50],[31.80,34.63],[32.08,34.76],[32.33,34.85],[32.82,34.96],[32.93,35.07]];
  function overpassUrl(lat, lon, r, i) {
    const a = `(around:${r || 1500},${(+lat).toFixed(5)},${(+lon).toFixed(5)})`;
    return OVERPASS[i || 0] + '?data=' + encodeURIComponent(`[out:json][timeout:60];(way["highway"]["name"]${a};nwr["amenity"="place_of_worship"]["religion"="jewish"]${a};);out tags geom;`);
  }

  /* ── שכבות ──
     שכבה: { id, glyph, points: [{lat, lon, label, id}], lines: [{coords: [[lat, lon], ...], closed, label}] }
     glyph: תו קצר שמצויר על הנקודה (למשל "מ" למקווה, "ע" לעירוב). */
  function toLayer(fc, id, glyph) {            // GeoJSON (Point / LineString / Polygon) -> שכבה
    const L = { id, glyph: glyph || '•', points: [], lines: [] };
    for (const f of (fc && fc.features) || []) {
      const g = f.geometry || {}, p = f.properties || {}, label = p.name || p.label || '';
      if (g.type === 'Point') L.points.push({ lat: g.coordinates[1], lon: g.coordinates[0], label, id: p.id });
      else if (g.type === 'LineString') L.lines.push({ coords: g.coordinates.map(c => [c[1], c[0]]), closed: false, label });
      else if (g.type === 'Polygon') for (const ring of g.coordinates) L.lines.push({ coords: ring.map(c => [c[1], c[0]]), closed: true, label });
    }
    return L;
  }
  function toGeoJSON(items, layer, pick) {     // רשומות עם lat/lon -> FeatureCollection של נקודות
    return {
      type: 'FeatureCollection',
      features: items.filter(i => i.lat != null && i.lon != null).map(i => ({
        type: 'Feature', geometry: { type: 'Point', coordinates: [i.lon, i.lat] },
        properties: Object.assign({ layer }, pick ? pick(i) : { id: i.id, name: i.name || '' })
      }))
    };
  }


  /* ── בסיס עולמי (2.0): יבשות, ארצות, נהרות, ימות ותוויות בעברית, מתוך Natural Earth (כמו בעינים למקרא).
     NE: { world, region, lakes, rivers, worldlines, regionlines, labels:[{he,lat,lng,z,size,kind}] }. ── */
  // רמת זום שקולה ל-Leaflet (לבחירת תוויות): zoom 1 כאן ≈ 16.4
  const leafZoom = v => Math.log2(Math.max(1e-9, v.zoom) * 88700);
  function geoPath(v, rings, close) {
    let d = '';
    for (const ring of rings) {
      if (v.globe) {   // 3.0: פוליגון — נקודות נסתרות מוצמדות לאופק; קו — נקטע בצד הנסתר
        let pen = false, any = false, s2 = '';
        for (const c of ring) {
          const p = globeXY(v, c[1], c[0]), cx = v.width / 2, cy = v.height / 2;
          if (p[2] < 0) {
            if (!close) { pen = false; continue; }
            const dx = p[0] - cx, dy = p[1] - cy, L = Math.hypot(dx, dy) || 1; p[0] = cx + dx / L * v.rad; p[1] = cy + dy / L * v.rad;
          } else any = true;
          s2 += (pen ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); pen = true;
        }
        if (any) d += s2 + (close ? 'Z' : '');
        continue;
      }
      let prev = null;
      for (let i = 0; i < ring.length; i++) {
        const c = ring[i];
        const p = project(v, c[1], c[0]);
        d += (i && !(prev && Math.abs(c[0] - prev[0]) > 180) ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1);
        prev = c;
      }
      if (close) d += 'Z';
    }
    return d;
  }
  function geomRings(g) {
    if (!g) return [];
    if (g.type === 'Polygon') return g.coordinates;
    if (g.type === 'MultiPolygon') return g.coordinates.flat();
    if (g.type === 'LineString') return [g.coordinates];
    if (g.type === 'MultiLineString') return g.coordinates;
    if (g.type === 'GeometryCollection') return g.geometries.flatMap(geomRings);
    return [];
  }
  function renderBase(v, NE, o) {
    if (!NE) return '';
    o = o || {};
    const lz = leafZoom(v) + (v.globe ? 1 : 0), f = n => n.toFixed(1);   // 3.0: בכדור — שמות הארצות כבר בגודל המלא
    const fc = x => (x && x.features ? x.features.map(t => t.geometry) : x ? [x] : []);
    let s = '';
    // ים כרקע, יבשה מעליו. כל פוליגון בנתיב משלו (כיווני הטבעות בעולם ובאזור הפוכים, ובנתיב אחד נוצרים "חורים").
    // 2.1: o.color — מפה צבעונית (ים כחול, כל ארץ בצבע משלה, כמו בעינים למקרא). הצבעים כאסימוני :root (--mu-sea, --mu-land1..6) ב-map-ui.
    // 3.0: o.style — 'eyes' (צבעוני כמו עינים למקרא), 'countries' (כל ארץ בצבע), 'plain' (חום-לבן כמו כיוון תפילה)
    const st = o.style || (o.color ? 'countries' : 'plain'), col = st !== 'plain', ey = st === 'eyes';
    const sea = ey ? 'var(--mu-e-sea, #9fbcc8)' : 'var(--mu-sea, #a9cdea)';
    const bg = col ? `fill="${sea}"` : 'fill="var(--color-primary)" fill-opacity=".07"';
    s += v.globe ? `<circle cx="${v.width / 2}" cy="${v.height / 2}" r="${v.rad.toFixed(1)}" ${bg} stroke="var(--color-outline, #888)" stroke-width="1"/>` : `<rect x="0" y="0" width="${v.width}" height="${v.height}" ${bg}/>`;
    const land = lz >= 5 && NE.region ? [...fc(NE.world), ...fc(NE.region)] : fc(NE.world);
    s += land.map((g, i) => `<path d="${geoPath(v, geomRings(g), true)}" fill="${ey ? 'var(--mu-e-land, #e6d8b0)' : col ? `var(--mu-land${(i * 7) % 6 + 1}, #e8e2c8)` : 'var(--color-surface, #fff)'}" fill-rule="evenodd" stroke="${ey ? 'var(--mu-e-coast, #7796a3)' : col ? 'var(--mu-coast, #6b8fae)' : 'none'}" stroke-width=".5"/>`).join('');
    const bl = lz >= 5 && NE.regionlines ? NE.regionlines : NE.worldlines;
    if (bl) s += `<path d="${geomRings(bl).map(r => geoPath(v, [r], false)).join('')}" fill="none" stroke="${ey ? 'var(--mu-e-line, #a08d5f)' : 'var(--color-outline, #888)'}" stroke-opacity="${ey ? .8 : .55}" stroke-width="${ey ? .9 : .8}"${ey ? '' : ' stroke-dasharray="3 2"'}/>`;
    if (NE.lakes) s += `<path d="${fc(NE.lakes).map(g => geoPath(v, geomRings(g), true)).join('')}" fill="${col ? sea : 'var(--color-primary)'}" fill-opacity="${col ? 1 : .14}" stroke="none"/>`;
    if (NE.rivers && lz >= 4) s += `<path d="${fc(NE.rivers).map(g => geoPath(v, geomRings(g), false)).join('')}" fill="none" stroke="${ey ? 'var(--mu-e-river, #7796a3)' : col ? 'var(--mu-river, #4f8fcf)' : 'var(--color-primary)'}" stroke-opacity="${col ? .9 : .4}" stroke-width="${col ? 1.3 : 1}"/>`;
    if (o.labels !== false) for (const L of NE.labels || []) {
      if ((L.z || 0) > lz + .5) continue;
      const p = project(v, L.lat, L.lng);
      if (p[0] < -40 || p[0] > v.width + 40 || p[1] < -10 || p[1] > v.height + 10) continue;
      const city = L.kind === 'city';
      s += (city ? `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="2.2" fill="var(--color-on-surface)"/>` : '')
        + `<text x="${f(p[0])}" y="${f(p[1] + (city ? -5 : 4))}" text-anchor="middle" font-size="${Math.min(13, (L.size || 11) * .9).toFixed(1)}" fill="var(--color-on-surface${city ? '' : '-variant, #5f6368'})" paint-order="stroke" stroke="var(--color-surface)" stroke-width="3"${L.kind === 'water' ? ' font-style="italic"' : ''}>${esc(L.he)}</text>`;
    }
    return s;
  }

  /* ── ציור SVG (מחרוזת). צבעים כמשתני CSS של אוצריא, כמו בכיוון תפילה. ── */
  const widthLabel = m => m >= 2000 ? (m >= 20000 ? Math.round(m / 1000) : (m / 1000).toFixed(1)) + ' ק"מ' : Math.round(m) + " מ'";
  function renderSVG(o) {
    if (o.view && o.view.globe) o = Object.assign({}, o, { area: null });   // 3.0: אין רחובות על הכדור
    const v = o.view, area = o.area, f = n => n.toFixed(1), W = v.width, H = v.height;
    let lines = '', labels = '', pts = '';
    let base = o.base ? renderBase(v, o.base, { labels: o.baseLabels, color: o.color, style: o.style }) : '';
    if (o.color && !base) base = `<rect x="0" y="0" width="${W}" height="${H}" fill="var(--mu-land-street, #f3efe0)"/>`;
    if (o.outline && !o.base) lines += `<path d="${OUTLINE.map((c, i) => { const p = project(v, c[0], c[1]); return (i ? 'L' : 'M') + f(p[0]) + ',' + f(p[1]); }).join('')}Z" fill="var(--color-on-surface-variant, #5f6368)" fill-opacity=".07" stroke="var(--color-on-surface-variant, #5f6368)" stroke-opacity=".5" stroke-width="1.5" stroke-linejoin="round"><title>קו מתאר מקורב</title></path>`;
    const inView = (x, y, m) => x > -m && x < W + m && y > -m && y < H + m;
    if (area && o.streets !== false) {
      for (const [name, hw, g] of area.w) {
        let d = '', best = null, any = false;
        for (let k = 0; k < g.length; k += 2) {
          const p = project(v, g[k], g[k + 1]);
          if (inView(p[0], p[1], 50)) any = true;
          d += (k ? 'L' : 'M') + f(p[0]) + ',' + f(p[1]);
          if (k) { const q = project(v, g[k - 2], g[k - 1]), len = Math.hypot(p[0] - q[0], p[1] - q[1]); if (!best || len > best[0]) best = [len, q, p]; }
        }
        if (!any) continue;
        const big = /^(motorway|trunk|primary|secondary)/.test(hw), bld = hw === 'building', pth = /^(path|footway|track|steps|cycleway|bridleway|service)$/.test(hw);
        lines += `<path d="${d}" fill="${bld ? 'var(--color-on-surface-variant, #5f6368)' : 'none'}" fill-opacity=".12" stroke="var(--color-on-surface-variant, #5f6368)" stroke-opacity=".5" stroke-width="${big ? 3.5 : bld ? 1 : pth ? 1.2 : 2}"${pth ? ' stroke-dasharray="5 3"' : ''} stroke-linecap="round" stroke-linejoin="round"/>`;
        if (o.labels !== false && best && best[0] > 70 && name) {
          let a = Math.atan2(best[2][1] - best[1][1], best[2][0] - best[1][0]) / R; if (a > 90) a -= 180; if (a < -90) a += 180;
          labels += `<text transform="translate(${f((best[1][0] + best[2][0]) / 2)},${f((best[1][1] + best[2][1]) / 2)}) rotate(${f(a)})" y="-5" text-anchor="middle" font-size="11" fill="var(--color-on-surface)" paint-order="stroke" stroke="var(--color-surface)" stroke-width="3">${esc(name)}</text>`;
        }
      }
    }
    for (const layer of o.layers || []) {
      for (const ln of layer.lines || []) {   // קווים ופוליגונים (למשל גבול עירוב)
        const cs = v.globe && ln.coords.length === 2 && !ln.closed ? greatCircle(ln.coords[0], ln.coords[1]) : ln.coords;
        let pen = false; const d = cs.map(c => { const p = project(v, c[0], c[1]); if (p[2] < 0) { pen = false; return ''; } const r = (pen ? 'L' : 'M') + f(p[0]) + ',' + f(p[1]); pen = true; return r; }).join('') + (ln.closed && !v.globe ? 'Z' : '');
        const solid = ln.style === 'route', col = ln.color || 'var(--color-primary)';   // 3.1: צבע לקו (עט, קווי עירוב) וקו רציף
        if (ln.color && ln.halo !== false) lines += `<path d="${d}" fill="none" stroke="var(--color-surface, #fff)" stroke-opacity=".75" stroke-width="${ln.solid ? 6 : 5}" stroke-linejoin="round"/>`;
        lines += `<path d="${d}" fill="${ln.closed ? col : 'none'}" fill-opacity="${ln.color ? .12 : .08}" stroke="${col}" stroke-width="${solid ? 5 : ln.solid ? 3.2 : 2.5}"${solid ? ' stroke-opacity=".85" stroke-linecap="round"' : ln.solid ? ' stroke-linecap="round"' : ' stroke-dasharray="7 4"'} stroke-linejoin="round"><title>${esc(ln.label || layer.id)}</title></path>`;
      }
      for (const pt of layer.points || []) {
        const p = project(v, pt.lat, pt.lon); if (!inView(p[0], p[1], 20)) continue;
        const hl = o.hl != null && String(o.hl) === String(pt.id);
        pts += `<g data-layer="${esc(layer.id)}" data-id="${esc(pt.id || '')}"><title>${esc(pt.label || layer.id)}</title>${hl ? `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="15" fill="none" stroke="var(--color-primary)" stroke-width="3"/>` : ''}<circle cx="${f(p[0])}" cy="${f(p[1])}" r="9" fill="var(--color-primary)" stroke="var(--color-surface)" stroke-width="2"/>`
          + `<text x="${f(p[0])}" y="${f(p[1] + 4)}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--color-on-primary, #fff)">${esc(layer.glyph || '•')}</text></g>`;
        if (v.zoom >= 2 && pt.label) pts += `<text x="${f(p[0])}" y="${f(p[1] + 22)}" text-anchor="middle" font-size="10" fill="var(--color-primary)" paint-order="stroke" stroke="var(--color-surface)" stroke-width="3">${esc(pt.label)}</text>`;
      }
    }
    let syn = '', me = '';
    if (area && o.syn) for (const [sn, la, lo] of area.s || []) {
      const p = project(v, la, lo); if (!inView(p[0], p[1], 10)) continue;
      syn += `<g><title>${esc(sn || 'בית כנסת')}</title><text x="${f(p[0])}" y="${f(p[1] + 5)}" text-anchor="middle" font-size="14" fill="var(--color-primary)" paint-order="stroke" stroke="var(--color-surface)" stroke-width="3">✡</text></g>`;
    }
    if (o.me) { const p = project(v, o.me[0], o.me[1]); if (inView(p[0], p[1], 20)) me = `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="7" fill="var(--color-on-surface)" stroke="var(--color-surface)" stroke-width="2.5"><title>המיקום שלי</title></circle>`; }
    let sel = '';
    if (o.selected && area && area.w[o.selected.i]) {
      const g = area.w[o.selected.i][2], k = o.selected.k, q = project(v, g[k], g[k + 1]), p = project(v, g[k + 2], g[k + 3]);
      sel = `<line x1="${f(q[0])}" y1="${f(q[1])}" x2="${f(p[0])}" y2="${f(p[1])}" stroke="var(--color-primary)" stroke-width="7" stroke-linecap="round"/>`;
    }
    const north = o.chrome === false ? '' : `<g transform="translate(${W - 20},30) rotate(${f(v.rot)})"><path d="M0,-12 L6,7 L0,3 L-6,7Z" fill="var(--color-on-surface)" stroke="var(--color-surface)" stroke-width="1.5"/><text y="-15" text-anchor="middle" font-size="11" fill="var(--color-on-surface)" paint-order="stroke" stroke="var(--color-surface)" stroke-width="3">צ N</text></g>`;
    // טקסט עברי מתיישר מימין: מעוגן ב-rtl ליד חץ הצפון, ומתפרש שמאלה (כמו בכיוון תפילה)
    const scale = o.chrome === false ? '' : `<text x="${W - 38}" y="18" direction="rtl" text-anchor="start" font-size="12" fill="var(--color-on-surface-variant, #5f6368)">${widthLabel(v.hw * 2)} לרוחב</text>`;
    const attr = o.chrome !== false && area && o.streets !== false ? `<text x="8" y="${H - 8}" direction="ltr" font-size="10" fill="var(--color-on-surface-variant, #5f6368)">© OpenStreetMap contributors${area.d ? ' · ' + esc(area.d) : ''}</text>` : '';
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img">${base}${lines}${sel}${labels}${syn}${pts}${me}${north}${scale}${attr}</svg>`;
  }

  // ── מסלול הליכה על גרף הרחובות (בלי אינטרנט) ──
  // צומת = נקודה בקואורדינטות זהות (כך ב-OSM מתחברים רחובות). Dijkstra עם ערימה בינארית.
  function walkRoute(area, from, to) {
    if (!area || !area.w) return null;
    const id = new Map(), xy = [], adj = [];   // adj: [שכן, מרחק, מספר הרחוב] לכל קשת (2.1: לשם הרחוב בהוראות)
    const node = (la, lo) => { const k = la.toFixed(6) + ',' + lo.toFixed(6); let i = id.get(k); if (i === undefined) { i = xy.length; id.set(k, i); xy.push([la, lo]); adj.push([]); } return i; };
    area.w.forEach(([, hw, g], wi) => {
      if (hw === 'building' || /^motorway/.test(hw)) return;
      let prev = -1;
      for (let k = 0; k < g.length; k += 2) {
        const n = node(g[k], g[k + 1]);
        if (prev >= 0 && prev !== n) { const d = distM(xy[prev], xy[n]); adj[prev].push(n, d, wi); adj[n].push(prev, d, wi); }
        prev = n;
      }
    });
    if (!xy.length) return null;
    const near = p => { let b = -1, bd = Infinity; for (let i = 0; i < xy.length; i++) { const d = distM(p, xy[i]); if (d < bd) { bd = d; b = i; } } return [b, bd]; };
    const [s, ds] = near(from), [t, dt] = near(to);
    if (ds > 600 || dt > 600) return null;
    const dist = new Float64Array(xy.length).fill(Infinity), back = new Int32Array(xy.length).fill(-1), bw = new Int32Array(xy.length).fill(-1), h = [];
    const push = (d, n) => { h.push([d, n]); let i = h.length - 1; while (i) { const p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } };
    const pop = () => { const top = h[0], last = h.pop(); if (h.length) { h[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < h.length && h[l][0] < h[m][0]) m = l; if (r < h.length && h[r][0] < h[m][0]) m = r; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } } return top; };
    dist[s] = 0; push(0, s);
    while (h.length) {
      const [d, n] = pop(); if (d > dist[n]) continue; if (n === t) break;
      const a = adj[n]; for (let j = 0; j < a.length; j += 3) { const nd = d + a[j + 1]; if (nd < dist[a[j]]) { dist[a[j]] = nd; back[a[j]] = n; bw[a[j]] = a[j + 2]; push(nd, a[j]); } }
    }
    if (dist[t] === Infinity) return null;
    const path = [], ways = []; for (let n = t; n >= 0; n = back[n]) { path.push(xy[n]); if (back[n] >= 0) ways.push(bw[n]); } path.reverse(); ways.reverse();
    return { coords: [from, ...path, to], m: Math.round(dist[t] + ds + dt), steps: routeSteps(area, path, ways, ds, dt) };
  }

  /* 2.1: הוראות הליכה מהמסלול — קבוצת קשתות באותו רחוב היא שלב אחד; בין שלבים: ימינה/שמאלה/ישר לפי שינוי הכיוון */
  const bearing = (a, b) => { const y = (b[1] - a[1]) * mLon(a[0]), x = (b[0] - a[0]) * M_LAT; return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; };
  const TURN = d => { const a = Math.abs(d); if (a < 25) return 'straight'; if (a > 150) return 'back'; return (d > 0 ? (a < 55 ? 'slight-right' : 'right') : (a < 55 ? 'slight-left' : 'left')); };
  const TURN_HE = { straight: 'המשיכו ישר', 'slight-right': 'פנו מעט ימינה', right: 'פנו ימינה', 'slight-left': 'פנו מעט שמאלה', left: 'פנו שמאלה', back: 'הסתובבו לאחור' };
  const DIR_HE = b => ['צפונה', 'צפון-מזרחה', 'מזרחה', 'דרום-מזרחה', 'דרומה', 'דרום-מערבה', 'מערבה', 'צפון-מערבה'][Math.round(b / 45) % 8];
  function routeSteps(area, path, ways, ds, dt) {
    const nameOf = wi => (wi >= 0 && area.w[wi] && area.w[wi][0]) || '';
    const out = [];
    for (let i = 0; i < ways.length; i++) {
      const nm = nameOf(ways[i]), m = distM(path[i], path[i + 1]), last = out[out.length - 1];
      if (last && (last.name === nm || (!nm && !last.name))) { last.m += m; last.end = i + 1; continue; }
      out.push({ name: nm, m, start: i, end: i + 1 });
    }
    out.forEach((st, k) => {
      const a = path[st.start], b = path[Math.min(st.start + 1, path.length - 1)];
      st.at = a; st.bear = bearing(a, b);
      if (k === 0) { st.turn = 'start'; st.text = `צאו ${DIR_HE(st.bear)}${st.name ? ' ברחוב ' + st.name : ''}`; }
      else {
        const prev = out[k - 1], p0 = path[Math.max(prev.end - 1, 0)], p1 = path[prev.end];
        let d = st.bear - bearing(p0, p1); d = ((d + 540) % 360) - 180;
        st.turn = TURN(d); st.text = `${TURN_HE[st.turn]}${st.name ? (st.turn === 'straight' ? ' ברחוב ' : ' לרחוב ') + st.name : ''}`;
      }
      st.m = Math.round(st.m); st.text += ` · ${widthLabel(st.m)}`;
    });
    if (ds > 15 && out.length) out[0].text = `לכו ${widthLabel(ds)} עד הרחוב, ואז: ` + out[0].text;
    out.push({ turn: 'arrive', text: 'הגעתם ליעד' + (dt > 15 ? ` (עוד ${widthLabel(dt)} מהרחוב)` : ''), m: Math.round(dt), at: path[path.length - 1] });
    return out;
  }

  /* 2.1: הרחוב הקרוב לנקודה (לחיצה על רחוב במפה, כמו בכיוון תפילה). maxM — מרחק מקסימלי במטרים. */
  function nearestWay(area, pt, maxM) {
    if (!area || !area.w) return null;
    const kx = mLon(pt[0]); let best = null;
    area.w.forEach(([name, hw, g], i) => {
      if (!name || hw === 'building') return;
      for (let k = 0; k + 3 < g.length; k += 2) {
        const ax = (g[k + 1] - pt[1]) * kx, ay = (g[k] - pt[0]) * M_LAT, bx = (g[k + 3] - pt[1]) * kx, by = (g[k + 2] - pt[0]) * M_LAT;
        const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L)) : 0;
        const d = Math.hypot(ax + t * dx, ay + t * dy);
        if (!best || d < best.d) best = { d, i, k, name, hw, lat: g[k] + t * (g[k + 2] - g[k]), lon: g[k + 1] + t * (g[k + 3] - g[k + 1]) };
      }
    });
    if (!best || best.d > (maxM || 40)) return null;
    // אורך הרחוב (כל הקטעים באותו שם)
    let len = 0; for (const [n, , g] of area.w) if (n === best.name) for (let k = 0; k + 3 < g.length; k += 2) len += distM([g[k], g[k + 1]], [g[k + 2], g[k + 3]]);
    best.len = Math.round(len); return best;
  }

  return { inPoly, distToRing, greatCircle, globeXY, walkRoute, routeSteps, nearestWay, distM, decodeArea, compactOverpass, findCover, normName, normHe, expandAliases, findWays, searchStreet, findCorner, nearestStreets, placeLabel,
    createView, project, unproject, renderBase, leafZoom, widthLabel, toLayer, toGeoJSON, renderSVG, overpassUrl };
});
