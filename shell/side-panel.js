// 5.3.0 — כרטיס ערך בחלונית צד (במקום חלון קופץ) + תצוגה מקדימה בעמוד הבית.
// מסך רחב (>= 900px) בתוך מדריך: הכרטיס נפתח בצד שמאל, הרשימה נשארת גלויה.
// לחיצה שנייה על אותה כרטיסייה סוגרת. הגבול ניתן לגרירה והרוחב נשמר.
// חיצים / מקשי ←→ עוברים לערך הקודם/הבא ברשימה המוצגת. מסך צר — חלון מלא כמו קודם.
(function(){
  const ov = document.getElementById('entryOverlay');
  const modal = document.getElementById('entryModal');
  if (!ov || !modal || typeof openEntryDetail !== 'function') return;

  const WIDE = () => window.matchMedia('(min-width: 900px)').matches;
  const inGuide = () => { const g = document.getElementById('guideView'); return g && g.offsetParent !== null; };
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
    .filter(c => c.offsetParent !== null);
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
    document.body.classList.toggle('entry-side', side);
    if (!side) mark(null);
    return orig.apply(this, arguments);
  };

  // סגירה מנקה סימון
  new MutationObserver(() => {
    if (!ov.classList.contains('open')) { mark(null); document.body.classList.remove('entry-side'); }
  }).observe(ov, { attributes: true, attributeFilter: ['class'] });

  document.addEventListener('keydown', ev => {
    if (!document.body.classList.contains('entry-side') || !ov.classList.contains('open')) return;
    if (/INPUT|TEXTAREA|SELECT/.test((ev.target.tagName || '')) || ev.target.isContentEditable) return;
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); step(1); }
    else if (ev.key === 'ArrowRight') { ev.preventDefault(); step(-1); }
  });
  window.addEventListener('resize', applyW);

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
  landing.classList.add('has-preview');
  let pvCat = null;
  const show = card => {
    pvCat = card.dataset.cat;
    const img = card.querySelector('img');
    pv.querySelector('.hp-icon').innerHTML = img ? '<img src="' + img.getAttribute('src') + '" alt="">' : '';
    pv.querySelector('.hp-title').textContent = (card.querySelector('.label') || {}).textContent || '';
    pv.querySelector('.hp-desc').textContent = DESC[pvCat] || '';
    homeCards.forEach(c => c.classList.toggle('hp-on', c === card));
  };
  homeCards.forEach(c => { c.addEventListener('mouseenter', () => show(c)); c.addEventListener('focus', () => show(c)); });
  pv.querySelector('.hp-open').addEventListener('click', () => { if (pvCat && typeof openGuide === 'function') openGuide(pvCat, null); });
  show(homeCards.find(c => c.dataset.cat === 'people') || homeCards[0]);
})();
