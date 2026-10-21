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
  const inGuide = () => { const g = document.getElementById('guideView'); return !!(g && g.classList.contains('open')); };
  const grid = () => document.getElementById('guideGrid');
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

  const cards = () => Array.from(document.querySelectorAll('#guideGrid > .entry-card'))
    .filter(c => c.getClientRects().length > 0);
  const mark = c => {
    document.querySelectorAll('#guideGrid > .entry-card.side-active').forEach(x => x.classList.remove('side-active'));
    curCard = c || null;
    if (curCard) { curCard.classList.add('side-active'); curCard.scrollIntoView({ block: 'nearest' }); }
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
    const name = (modal.querySelector('#entryModalInner h2') || {}).textContent || '';
    const txt = 'עינים למקרא — ' + name.trim();
    try { await navigator.clipboard.writeText(txt); } catch(e){}
    if (typeof showToast === 'function') showToast('הועתק: ' + txt);
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
    const side = WIDE() && inGuide();
    if (side) setTop();
    document.body.classList.toggle('entry-side', side);
    document.body.classList.toggle('entry-in-guide', inGuide());
    if (!inGuide()) mark(null);
    const r = orig.apply(this, arguments);
    if (side && curCard) curCard.scrollIntoView({ block: 'nearest' });
    return r;
  };

  // סגירה מנקה סימון
  new MutationObserver(() => {
    if (!ov.classList.contains('open')) { mark(null); document.body.classList.remove('entry-side', 'entry-in-guide'); }
  }).observe(ov, { attributes: true, attributeFilter: ['class'] });

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
