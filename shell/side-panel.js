// 5.3.0 — כרטיס ערך בחלונית צד (במקום חלון קופץ) + תצוגה מקדימה בעמוד הבית.
// מסך רחב (>= 900px) בתוך מדריך: הכרטיס נפתח בצד שמאל, הרשימה נשארת גלויה.
// לחיצה שנייה על אותה כרטיסייה סוגרת. הגבול ניתן לגרירה והרוחב נשמר.
// חיצים / מקשי ←→ עוברים לערך הקודם/הבא ברשימה המוצגת. מסך צר — חלון מלא כמו קודם.
(function(){
  const ov = document.getElementById('entryOverlay');
  const modal = document.getElementById('entryModal');
  if (!ov || !modal || typeof openEntryDetail !== 'function') return;

  const WIDE = () => window.matchMedia('(min-width: 900px)').matches;
  // #guideView הוא position:fixed ולכן offsetParent שלו תמיד null — בודקים את המחלקה open
  const resPage = () => { const r = document.getElementById('resultsOverlay'); return document.body.classList.contains('results-page') && !!(r && r.classList.contains('open')); };
  const inGuide = () => { if (resPage()) return true; const g = document.getElementById('guideView'); return !!(g && g.classList.contains('open')); };
  const grid = () => document.getElementById(resPage() ? 'resultsList' : 'guideGrid');
  // החלונית מתחילה מתחת לסרגל העליון ולמסננים, כדי שהם יישארו לכל הרוחב
  const setTop = () => { const g = grid(); if (g) document.documentElement.style.setProperty('--side-top', Math.max(0, g.getBoundingClientRect().top) + 'px'); };
  let curCard = null;

  // רוחב שמור
  let w = 460;
  try { w = parseInt(localStorage.getItem('mh.sideW'), 10) || 460; } catch(e){}
  const applyW = () => document.documentElement.style.setProperty('--side-w', Math.max(320, Math.min(w, window.innerWidth * 0.7)) + 'px');
  applyW();

  // ידית גרירה + סרגל ניווט
  const grip = document.createElement('div');
  grip.className = 'side-grip'; grip.title = 'גרירה לשינוי רוחב';
  modal.appendChild(grip);
  const nav = document.createElement('div');
  nav.className = 'side-nav';
  nav.innerHTML = '<button type="button" class="side-prev" title="הערך הקודם">→</button>'
    + '<button type="button" class="side-next" title="הערך הבא">←</button>'
    + '<button type="button" class="side-link" title="העתקת קישור לערך">🔗</button>';
  modal.insertBefore(nav, modal.firstChild);

  grip.addEventListener('pointerdown', ev => {
    ev.preventDefault(); grip.setPointerCapture(ev.pointerId);
    const move = e => { w = e.clientX; applyW(); };   // החלונית מוצמדת לשמאל
    const up = () => { grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up);
      try { localStorage.setItem('mh.sideW', String(w)); } catch(e){} };
    grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up);
  });

  // לחיצה כפולה על הגבול — חזרה לרוחב ברירת המחדל
  grip.addEventListener('dblclick', () => { w = 460; applyW(); try { localStorage.removeItem('mh.sideW'); } catch(e){} });

  // ערכים שכבר נצפו — סימון ✓ ברשימה, נשמר לפי מדריך
  const SEEN_KEY = 'mh.seen';
  let seen = {};
  try { seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') || {}; } catch(e){}
  const catNow = () => (typeof currentGuideCat !== 'undefined' && currentGuideCat) || '';
  const nameOf = c => ((c.querySelector('.entry-card-name') || {}).textContent || '').trim();
  const applySeen = () => {
    const set = seen[catNow()] || [];
    document.querySelectorAll('#guideGrid > .entry-card').forEach(c => c.classList.toggle('seen', set.indexOf(nameOf(c)) >= 0));
  };
  const addSeen = c => {
    const cat = catNow(), n = nameOf(c); if (!cat || !n) return;
    const set = seen[cat] || (seen[cat] = []);
    if (set.indexOf(n) < 0) { set.push(n); if (set.length > 2000) set.shift(); try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch(e){} }
    c.classList.add('seen');
  };
  const gridEl = document.getElementById('guideGrid');
  if (gridEl) new MutationObserver(applySeen).observe(gridEl, { childList: true });

  const cards = () => Array.from(document.querySelectorAll('#guideGrid > .entry-card'))
    .filter(c => c.getClientRects().length > 0);
  const mark = c => {
    document.querySelectorAll('#guideGrid > .entry-card.side-active').forEach(x => x.classList.remove('side-active'));
    curCard = c || null;
    if (curCard) { addSeen(curCard); curCard.classList.add('side-active'); curCard.scrollIntoView({ block: 'nearest' }); }
  };
  const step = d => {
    const list = cards(); if (!list.length) return;
    const i = list.indexOf(curCard);
    const n = list[(i + d + list.length) % list.length];
    if (n) n.click();
  };
  nav.querySelector('.side-prev').addEventListener('click', () => step(-1));
  nav.querySelector('.side-next').addEventListener('click', () => step(1));
  nav.querySelector('.side-link').addEventListener('click', async () => {
    const name = ((modal.querySelector('#entryModalInner h2') || {}).textContent || '').replace(/[\u2B50\u2606\u2605].*$/, '').trim();
    const cat = (typeof currentGuideCat !== 'undefined' && currentGuideCat && (currentGuideCat.id || currentGuideCat)) || '';
    // קריאה שתוסף אחר מדביק כדי לפתוח בדיוק את הכרטיס הזה (#173, docs/עיצוב-5.3.md)
    const txt = "Otzaria.call('plugin.openOther', { pluginId: 'com.chadbedera.madaeihatanach', param: { section: '" + cat + "', entry: '" + name.replace(/'/g, "\\'") + "' } })";
    // 5.3.2 — העתקה עם גיבוי (ב-WebView של אוצריא clipboard לא תמיד זמין) + חיווי על הכפתור עצמו
    let ok = false;
    try { await navigator.clipboard.writeText(txt); ok = true; } catch(e){}
    if (!ok) { try { const ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove(); } catch(e){} }
    const lb = nav.querySelector('.side-link');
    lb.textContent = ok ? '✓ הועתק' : '✗ לא הועתק'; lb.classList.add('copied');
    clearTimeout(lb._t); lb._t = setTimeout(() => { lb.textContent = '🔗'; lb.classList.remove('copied'); }, 1800);
    if (ok && typeof showToast === 'function') showToast('הועתק קישור לפתיחת הערך ״' + name + '״ מתוסף אחר');
  });

  // לחיצה על כרטיסייה במדריך: מצב צד, ולחיצה חוזרת סוגרת
  document.addEventListener('click', ev => {
    const c = ev.target.closest && ev.target.closest('#guideGrid > .entry-card');
    if (!c) return;
    if (WIDE() && c === curCard && ov.classList.contains('open')) {
      ev.stopImmediatePropagation(); ov.classList.remove('open'); return;
    }
    mark(c);
  }, true);

  const orig = openEntryDetail;
  window.openEntryDetail = openEntryDetail = function(entry){
    const pref = (typeof uiPrefs === 'undefined') || uiPrefs.entrySide !== false;
    const side = WIDE() && inGuide() && pref;
    if (side) setTop();
    document.body.classList.toggle('entry-side', side);
    document.body.classList.toggle('entry-in-guide', inGuide());
    if (!inGuide()) mark(null);
    // כפתור הסגירה עובר לשורת הניווט (שלא יעלה עליה), ובחוץ חוזר למקומו
    const cb = document.getElementById('entryCloseBtn');
    if (cb) { if (inGuide()) nav.appendChild(cb); else modal.insertBefore(cb, nav); }
    // 5.3.1 — כלי הכרטיס (מועדף, הדפסה, PDF, עריכה, דיווח) עוברים גם הם לסרגל העליון הדביק
    // מעבר בין ערכים בחלונית פתוחה — בלי הבהוב: שומרים גובה, גוללים לראש, ומעמעמים רק את התוכן
    const swapping = side && ov.classList.contains('open');
    if (swapping) modal.classList.add('side-swap');
    const r = orig.apply(this, arguments);
    nav.querySelectorAll('.entry-tool-btn').forEach(b => b.remove());
    if (inGuide()) {
      const tools = modal.querySelectorAll('#entryModalInner h2 .entry-tool-btn');
      tools.forEach(b => nav.insertBefore(b, cb && cb.parentNode === nav ? cb : null));
    }
    if (swapping) { modal.scrollTop = 0; requestAnimationFrame(() => modal.classList.remove('side-swap')); }
    if (side && curCard) curCard.scrollIntoView({ block: 'nearest' });
    return r;
  };

  // סגירה מנקה סימון
  new MutationObserver(() => {
    if (!ov.classList.contains('open')) { mark(null); document.body.classList.remove('entry-side', 'entry-in-guide'); }
  }).observe(ov, { attributes: true, attributeFilter: ['class'] });

  // יציאה מהמדריך סוגרת את הכרטיס שנפתח בתוכו
  const gv = document.getElementById('guideView');
  if (gv) new MutationObserver(() => {
    if (!gv.classList.contains('open') && document.body.classList.contains('entry-in-guide')) ov.classList.remove('open');
  }).observe(gv, { attributes: true, attributeFilter: ['class'] });
  // פתיחה/סגירה של המסננים משנה את גובה הסרגל — החלונית עוקבת
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => { if (document.body.classList.contains('entry-side')) setTop(); });
    ['guideViewBar', 'guideFilters', 'guideChips'].forEach(id => { const e = document.getElementById(id); if (e) ro.observe(e); });
  }

  document.addEventListener('keydown', ev => {
    if (!document.body.classList.contains('entry-in-guide') || !ov.classList.contains('open')) return;
    if (/INPUT|TEXTAREA|SELECT/.test((ev.target.tagName || '')) || ev.target.isContentEditable) return;
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); step(1); }
    else if (ev.key === 'ArrowRight') { ev.preventDefault(); step(-1); }
  });
  window.addEventListener('resize', () => { applyW(); if (document.body.classList.contains('entry-side')) setTop(); });

  // ===== תצוגה מקדימה בעמוד הבית =====
  const DESC = {
    beithamikdash: 'כלי המקדש, חלקי הבית ועבודת הכהנים — עם מקורות מהתנ״ך ומהמשנה.',
    archaeology: 'ממצאים ארכיאולוגיים הקשורים לתולדות ישראל: מה נמצא, היכן, והיכן מוצג היום.',
    people: 'כל האישים הנזכרים בתנ״ך — ייחוס, תקופה, מקורות ועץ משפחה.',
    places: 'ערים, ישובים, הרים, נחלים ואזורים — זיהוי מודרני, נחלת השבט ומפה.',
    animal: 'בעלי החיים שבתנ״ך — שיטות הזיהוי, שמות לועזיים ומקורות.',
    flora: 'צמחים, עצים ופירות שבתנ״ך — זיהוי ומקורות.',
    domem: 'אבנים, מתכות וחומרים הנזכרים בתנ״ך.',
    amoraim: 'תנאים ואמוראים הנזכרים בתלמוד — דור, מקום ורבותיהם.'
  };
  const landing = document.getElementById('landing');
  const homeCards = Array.from(document.querySelectorAll('#landing .card[data-cat]'));
  if (!landing || !homeCards.length) return;
  const pv = document.createElement('aside');
  pv.id = 'homePreview';
  pv.innerHTML = '<div class="hp-icon"></div><h3 class="hp-title"></h3><p class="hp-desc"></p><button type="button" class="hp-open panel-btn">📂 פתח מדריך</button>';
  landing.appendChild(pv);
  // התצוגה המקדימה יושבת ברווח הפנוי שמשמאל לכרטיסים — לא דוחסת אותם.
  // אין מספיק מקום → לא מוצגת.
  const place = () => {
    const els = Array.from(landing.querySelectorAll('.cards, .cards-sep')).filter(e => e.getClientRects().length);
    if (!els.length || landing.getClientRects().length === 0) { pv.classList.remove('on'); return; }
    const lr = landing.getBoundingClientRect();
    const gap = Math.min.apply(null, els.map(e => e.getBoundingClientRect().left)) - lr.left;
    if (gap < 260) { pv.classList.remove('on'); return; }
    pv.style.width = Math.min(380, gap - 48) + 'px';
    pv.style.left = (lr.left + 16) + 'px';
    pv.style.top = Math.max(lr.top + 16, els[0].getBoundingClientRect().top) + 'px';
    pv.classList.add('on');
  };
  window.addEventListener('resize', place);
  landing.addEventListener('scroll', place, { passive: true });
  new MutationObserver(place).observe(landing, { attributes: true, attributeFilter: ['class', 'style'] });
  setTimeout(place, 300);
  let pvCat = null;
  const show = card => {
    pvCat = card.dataset.cat;
    const img = card.querySelector('img');
    pv.querySelector('.hp-icon').innerHTML = img ? '<img src="' + img.getAttribute('src') + '" alt="">' : '';
    pv.querySelector('.hp-title').textContent = (card.querySelector('.label') || {}).textContent || '';
    pv.querySelector('.hp-desc').textContent = DESC[pvCat] || '';
    homeCards.forEach(c => c.classList.toggle('hp-on', c === card));
    place();
  };
  homeCards.forEach(c => { c.addEventListener('mouseenter', () => show(c)); c.addEventListener('focus', () => show(c)); });
  pv.querySelector('.hp-open').addEventListener('click', () => { if (pvCat && typeof openGuide === 'function') openGuide(pvCat, null); });
  show(homeCards.find(c => c.dataset.cat === 'people') || homeCards[0]);
})();
