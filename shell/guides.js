// תצוגת המדריך: רפרנסי DOM, תמונות, צ׳יפים, רשת הכרטיסים ופתיחה/סגירה.
// נוצר בפיצול router.js (גרסה 2.11.2). המקור: shell/router.js שורות 369-399, 460-620, 1408-1452.
// אין להפוך ל-type="module" — כל הקבצים חולקים scope גלובלי אחד.

// ---- UI ----

const landing = document.getElementById('landing');
const frameWrap = document.getElementById('frameWrap');
const guideFrame = document.getElementById('guideFrame');
const frameTitle = document.getElementById('frameTitle');
const backBtn = document.getElementById('backBtn');
const resultsOverlay = document.getElementById('resultsOverlay');
const resultsList = document.getElementById('resultsList');
const resultsQuote = document.getElementById('resultsQuote');
const closeResults = document.getElementById('closeResults');
const noResults = document.getElementById('noResults');

// ==== רינדור מדריך ילידי, בלי iframe ====
// ניסינו קודם iframe (עם ניווט ל-view.html) וגם ניווט מלא של החלון - שניהם נכשלו
// בפועל בתוך אוצריא (עמוד לבן / שגיאת טעינה). לכן כל תצוגת מדריך נבנית ישירות
// כאן, בתוך index.html עצמו, מהנתונים שכבר נטענים דרך ה-iframe הנסתר (loadGuideData) -
// כך שקריאות ל-Otzaria (פתיחת ספר, שליחת מייל וכו') תמיד רצות מהעמוד הראשי עצמו.
const guideView = document.getElementById('guideView');
const guideViewTitle = document.getElementById('guideViewTitle');
const guideSearchBox = document.getElementById('guideSearchBox');
const guideGrid = document.getElementById('guideGrid');
const guideBackBtn = document.getElementById('guideBackBtn');
const guideAddNewBtn = document.getElementById('guideAddNewBtn');
const entryOverlay = document.getElementById('entryOverlay');
const entryModalInner = document.getElementById('entryModalInner');
const entryCloseBtn = document.getElementById('entryCloseBtn');

let currentGuideData = [];
let currentGuideCat = null;


// תמונות מוטבעות (CARD_IMAGES) - נטענות יחד עם ה-DATA דרך אותו iframe נסתר, ונשמרות
// ב-imagesCache. לא כל מדריך משתמש בזה (מקומות למשל - יש לו מפה בפני עצמה; צומח - היה
// מביא תמונות חי מוויקיפדיה, לא הוטמע כאן).
function lookupEntryImage(entry, catId){
  const images = imagesCache[catId] || {};
  if (entry.img && images[entry.img]) return images[entry.img];
  const wiki = entry.methods && entry.methods[0] && entry.methods[0].wiki;
  if (wiki && images[wiki]) return images[wiki];
  return null;
}
function lookupEntryGallery(entry, catId){
  const images = imagesCache[catId] || {};
  return (entry.gallery || []).map(k => images[k]).filter(Boolean);
}

// לחלק מהמדריכים (בעיקר צומח, כפי שהיה במקור) אין תמונות מוטבעות בכלל - הן נטענות
// באופן חי מוויקיפדיה לפי שם הערך המדעי (methods[0].wiki), בדיוק כמו שהמדריך המקורי
// עשה. זה דורש רשת (לא קובץ מקומי), אז זו הרחבה בלבד - אם זה נכשל, פשוט לא מוצגת תמונה.
const wikiThumbCache = {};
function fetchWikiThumbnail(title){
  if (!title) return Promise.resolve(null);
  if (wikiThumbCache[title] !== undefined) return Promise.resolve(wikiThumbCache[title]);
  return fetch('https://he.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title))
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      const src = data && data.thumbnail && data.thumbnail.source;
      wikiThumbCache[title] = src || null;
      return wikiThumbCache[title];
    })
    .catch(() => { wikiThumbCache[title] = null; return null; });
}

function entryCardHTML(entry, idx){
  // "אנשים מהתלמוד" — כותרת המשנה היא תקופה+דור ("תנא · דור ד׳"), שאין לו
  // מקבילה בשדות של שאר המדריכים.
  const roleDor = [entry.role, entry.dor].filter(Boolean).join(' · ');
  const sub = entry.tribe || entry.region || roleDor
    || (entry.methods && entry.methods[0] && entry.methods[0].confidence) || '';
  const desc = entry.explanation || (entry.methods && entry.methods[0] && entry.methods[0].explanation) || entry.note || '';
  const img = currentGuideCat ? lookupEntryImage(entry, currentGuideCat.id) : null;
  const wikiTitle = !img && entry.methods && entry.methods[0] && entry.methods[0].wiki;
  const imgSrc = img || entry.customImage;
  return maskDivineName(`<div class="entry-card" data-idx="${idx}">
    ${imgSrc ? `<div class="entry-card-img"><img src="${imgSrc}" alt="${esc(entry.name)}" loading="lazy"></div>`
       : (wikiTitle ? `<div class="entry-card-img" data-wiki-lazy="${esc(wikiTitle)}"></div>` : '')}
    <div class="entry-card-name">${esc(entry.name)}${entry.__edited ? ' <span class="edited-badge" title="נערך על ידכם במכשיר זה">✏️</span>' : ''}</div>
    ${sub ? `<div class="entry-card-sub">${esc(sub)}</div>` : ''}
    ${desc ? `<div class="entry-card-desc">${esc(desc)}</div>` : ''}
  </div>`);
}

function lazyLoadWikiThumbnails(container){
  const targets = container.querySelectorAll('[data-wiki-lazy]');
  if (!targets.length) return;
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      obs.unobserve(entry.target);
      const el = entry.target;
      fetchWikiThumbnail(el.dataset.wikiLazy).then(src => {
        if (src) el.innerHTML = `<img src="${src}" alt="" loading="lazy">`;
        else el.remove();
      });
    });
  }, { rootMargin: '200px' });
  targets.forEach(el => io.observe(el));
}

// 3.2.1 — ריבוי בחירה. Set ריק פירושו 'הכל'; כל צ׳יפ מתווסף/מוסר בלחיצה.
// נשמר כ-Set ולא כמחרוזת כדי שאפשר יהיה לבחור כמה קטגוריות יחד.
let activeGuideChips = new Set();
function chipSelected(id){ return activeGuideChips.size === 0 || activeGuideChips.has(id); }
function chipsAreAll(){ return activeGuideChips.size === 0; }
const guideChips = document.getElementById('guideChips');

// ---- אפשרויות הסינון, כפי שהן בתוסף ״אישים בתנ״ך״ (2.12.0) ----
// שלוש שורות: קטגוריה (הצ׳יפים שהיו כאן מאז ומתמיד) · תקופה · א-ב. ״תקופה״ נשענת
// על השדה era שב-CATS, שקיים רק במדריך אישים — ולכן השורה מוסתרת בשאר המדריכים,
// בדיוק כמו שהיא לא קיימת שם. ב״ביוגרפיות״ אין סינון בכלל ולא הועתק ממנו דבר.
const guideFilters = document.getElementById('guideFilters');
const guideFiltersToggle = document.getElementById('guideFiltersToggle');
const guideFiltersSummary = document.getElementById('guideFiltersSummary');
const guideEraRow = document.getElementById('guideEraRow');
const guideEraChips = document.getElementById('guideEraChips');
const guideAlphaBar = document.getElementById('guideAlphaBar');
const ALEPH_BET = ['א','ב','ג','ד','ה','ו','ז','ח','ט','י','כ','ל','מ','נ','ס','ע','פ','צ','ק','ר','ש','ת'];
let activeGuideEra = 'all';
// #76: סינון לפי שבט — רק לערכים שיש להם tribes (שיוך מפורש בפסוקי יהושע יג–כא)
let activeGuideTribe = 'all';
const guideTribeRow = document.getElementById('guideTribeRow');
const guideTribeChips = document.getElementById('guideTribeChips');
const TRIBE_ORDER = ['ראובן','שמעון','יהודה','יששכר','זבולון','דן','נפתלי','גד','אשר','בנימין','אפרים','מנשה'];
const tribeOk = (e) => activeGuideTribe === 'all' || (e.tribes || []).includes(activeGuideTribe);
function renderGuideTribeChips(){
  if (!guideTribeRow) return;
  const have = new Set(); (currentGuideData || []).forEach(e => (e.tribes || []).forEach(t => have.add(t)));
  const list = TRIBE_ORDER.filter(t => have.has(t));
  if (!list.length){ guideTribeRow.classList.add('hidden'); guideTribeChips.innerHTML = ''; activeGuideTribe = 'all'; return; }
  guideTribeRow.classList.remove('hidden');
  guideTribeChips.innerHTML = `<button class="chip${activeGuideTribe==='all'?' active':''}" data-tribe="all">הכל</button>` +
    list.map(t => `<button class="chip${activeGuideTribe===t?' active':''}" data-tribe="${esc(t)}">${esc(t)}</button>`).join('');
  guideTribeChips.querySelectorAll('.chip').forEach(btn => btn.addEventListener('click', () => {
    activeGuideTribe = btn.dataset.tribe;
    guideTribeChips.querySelectorAll('.chip').forEach(b => b.classList.toggle('active', b === btn));
    renderGuideGrid(guideSearchBox.value);
  }));
}
let activeGuideLetter = 'all';

function guideCatOf(catId){
  const cats = (currentGuideCat && catsCache[currentGuideCat.id]) || [];
  return cats.find(c => c.id === catId) || null;
}
// #74: תקופה מפורטת ברמת הערך (era בערך, כמו לוח התקופות של ״ביוגרפיות״) גוברת על תקופת הספר
const DETAILED_ERA_ORDER = ['עשרה דורות מאדם עד נח','עשרה דורות מנח עד אברהם','אבותינו ואמותינו','שבטי ישראל','גלות מצרים',
  'יציאת מצרים ודור המדבר','כניסה לארץ וכיבוש','תקופת השופטים','תקופת שמואל, שאול ודוד','תקופת המלכים ובית ראשון',
  'חורבן בית ראשון','גלות בבל ובית שני'];
function guideEraOf(entry){
  if (entry && entry.era) return entry.era;
  const c = guideCatOf(entry.cat);
  return (c && c.era) || '';
}
// האות הראשונה של השם, אחרי הסרת ניקוד — כמו firstLetter בתוסף אישים
function guideFirstLetter(name){
  const n = normalizeHeb(name || '');
  return n ? n[0] : '';
}
// הסינון שאינו הצ׳יפים: תקופה ואות פותחת. משמש גם ברשימה וגם בספירות שבצ׳יפים.
function matchesGuideFilters(entry){
  if (activeGuideEra !== 'all' && guideEraOf(entry) !== activeGuideEra) return false;
  if (activeGuideLetter !== 'all' && guideFirstLetter(entry.name) !== activeGuideLetter) return false;
  if (!tribeOk(entry)) return false;
  return true;
}

function renderGuideEraChips(){
  const cats = (currentGuideCat && catsCache[currentGuideCat.id]) || [];
  const eras = [];
  const detailed = new Set(currentGuideData.map(e => e.era).filter(Boolean));
  DETAILED_ERA_ORDER.forEach(x => { if (detailed.has(x)) eras.push(x); });
  cats.forEach(c => {
    if (c.era && !eras.includes(c.era) && currentGuideData.some(e => e.cat === c.id && !e.era)) eras.push(c.era);
  });
  if (!eras.length){
    guideEraRow.classList.add('hidden');
    guideEraChips.innerHTML = '';
    activeGuideEra = 'all';
    return;
  }
  guideEraRow.classList.remove('hidden');
  guideEraChips.innerHTML = `<button class="chip${activeGuideEra==='all'?' active':''}" data-era="all">הכל</button>` +
    eras.map(e => `<button class="chip${activeGuideEra===e?' active':''}" data-era="${esc(e)}">${esc(e)}</button>`).join('');
  guideEraChips.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      activeGuideEra = btn.dataset.era;
      renderGuideGrid(guideSearchBox.value);
    });
  });
}

function renderGuideAlphaBar(){
  // רק אותיות שיש להן ערכים *בהינתן* הסינון האחר, כדי שלא יוצגו אותיות מתות
  const letters = new Set();
  currentGuideData.forEach(e => {
    if (!chipSelected(e.cat)) return;
    if (activeGuideEra !== 'all' && guideEraOf(e) !== activeGuideEra) return;
    if (!tribeOk(e)) return;
    const l = guideFirstLetter(e.name);
    if (l) letters.add(l);
  });
  if (activeGuideLetter !== 'all' && !letters.has(activeGuideLetter)) activeGuideLetter = 'all';
  guideAlphaBar.innerHTML = `<button class="alpha-btn${activeGuideLetter==='all'?' active':''}" data-letter="all" title="הכל">*</button>` +
    ALEPH_BET.filter(l => letters.has(l))
      .map(l => `<button class="alpha-btn${activeGuideLetter===l?' active':''}" data-letter="${l}">${l}</button>`).join('');
  guideAlphaBar.querySelectorAll('.alpha-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeGuideLetter = btn.dataset.letter;
      renderGuideGrid(guideSearchBox.value);
    });
  });
}

function updateGuideFiltersSummary(){
  const parts = [];
  if (!chipsAreAll()){
    const labels = [...activeGuideChips].map(id => { const c = guideCatOf(id); return c ? c.label : id; });
    parts.push((labels.length > 1 ? 'קטגוריות: ' : 'קטגוריה: ') + labels.join(', '));
  }
  if (activeGuideEra !== 'all') parts.push('תקופה: ' + activeGuideEra);
  if (activeGuideTribe !== 'all') parts.push('שבט: ' + activeGuideTribe);
  if (activeGuideLetter !== 'all') parts.push('אות: ' + activeGuideLetter);
  const open = !guideFilters.classList.contains('collapsed');
  const n = guideGrid ? guideGrid.querySelectorAll('.entry-card').length : 0;
  guideFiltersSummary.innerHTML = parts.length
    ? `<span>${open ? '' : esc('סינון פעיל — ' + parts.join(' · ') + ' · ')}${n} תוצאות</span> <button type="button" class="clear-filters-btn">נקה סינונים</button>`
    : '';
  const cb = guideFiltersSummary.querySelector('.clear-filters-btn');
  if (cb) cb.addEventListener('click', () => {
    activeGuideChips.clear(); activeGuideEra = 'all'; activeGuideTribe = 'all'; activeGuideLetter = 'all';
    renderGuideGrid(guideSearchBox.value); updateGuideFiltersSummary();
  });
  guideFiltersToggle.classList.toggle('on', parts.length > 0);
  // 5.4.0 — שמירת הסינון האחרון למדריך הנוכחי
  try {
    if (currentGuideCat && typeof setPref === 'function' && typeof uiPrefs !== 'undefined'){
      const all = Object.assign({}, uiPrefs.lastFilters || {});
      const cur = { c:[...activeGuideChips], e:activeGuideEra, t:activeGuideTribe, l:activeGuideLetter };
      if (JSON.stringify(all[currentGuideCat.id] || null) !== JSON.stringify(parts.length ? cur : null)){
        if (parts.length) all[currentGuideCat.id] = cur; else delete all[currentGuideCat.id];
        setPref('lastFilters', all);
      }
    }
  } catch(_){}
}

guideFiltersToggle.addEventListener('click', () => {
  const nowOpen = guideFilters.classList.toggle('collapsed') === false;
  guideFiltersToggle.setAttribute('aria-expanded', nowOpen ? 'true' : 'false');
  guideFiltersToggle.textContent = nowOpen ? '✕ סגירת הסינון' : '☰ סינון';
  updateGuideFiltersSummary();
});

function renderGuideChips(){
  renderGuideEraChips();
  renderGuideTribeChips();
  renderGuideAlphaBar();
  updateGuideFiltersSummary();
  const cats = (currentGuideCat && catsCache[currentGuideCat.id]) || [];
  if (!cats.length){ guideChips.innerHTML = ''; guideChips.style.display = 'none'; return; }
  guideChips.style.display = 'flex';
  // הספירות מכבדות את שאר הסינון, אחרת צ׳יפ יבטיח 40 ערכים ויציג שניים
  const counted = currentGuideData.filter(matchesGuideFilters);
  const totalCount = counted.length;
  guideChips.innerHTML = `<button class="chip${chipsAreAll()?' active':''}" data-chip="all">הכל (${totalCount})</button>` +
    cats.map(c => {
      const n = counted.filter(e => e.cat === c.id).length;
      return `<button class="chip${activeGuideChips.has(c.id)?' active':''}" data-chip="${esc(c.id)}">${esc(c.label)} (${n})</button>`;
    }).join('');
  // במקומות: כפתור קפיצה ישירה למפה שבסוף הרשימה
  if (currentGuideCat && currentGuideCat.id === 'places'){
    guideChips.insertAdjacentHTML('beforeend', '<button class="chip chip-map" id="jumpToMapChip" title="למפה" aria-label="למפה">🗺️</button>');
  }
  guideChips.querySelectorAll('.chip').forEach(btn => {
    if (btn.id === 'jumpToMapChip') return;
    btn.addEventListener('click', () => {
      // 'הכל' מנקה; קטגוריה מתווספת/מוסרת, כך שאפשר לבחור כמה יחד.
      const id = btn.dataset.chip;
      if (id === 'all') activeGuideChips.clear();
      else if (activeGuideChips.has(id)) activeGuideChips.delete(id);
      else activeGuideChips.add(id);
      guideSearchBox.value = '';
      renderGuideGrid('');
    });
  });
  // 3.2.1 — הכפתור רק גולל. הוא **אינו מאפס את הסינון** יותר: המפה מוצגת
  // עכשיו תמיד ומכבדת את הסינון, ולכן איפוס כאן היה מבטל בכוונה טובה את מה
  // שהמשתמש בדיוק סינן — זו הייתה ההתנהגות שדווחה כתקלה.
  const jumpBtn = document.getElementById('jumpToMapChip');
  if (jumpBtn) jumpBtn.addEventListener('click', () => {
    const el = document.getElementById('worldMap');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

// ---- ציר זמן לפי דורות (2.9) — תצוגה חלופית במדריך אישים, לצד הרשת (מתג, לא החלפה) ----
// era קיים רק על קטגוריות מדריך אישים (ר' ההערה למעלה על guideEraOf) - ולכן הכפתור
// מוצג רק שם, ומצב הציר מתאפס בכל פתיחת מדריך כדי לא "לדלוף" למדריך אחר.
let guideViewMode = 'grid';
const guideTimelineToggle = document.getElementById('guideTimelineToggle');
// סדר הדורות = סדר ה-CATS (כרונולוגי, כמו ברשימת הצ'יפים) - לא ממציאים סדר חדש.
function guideErasInOrder(){
  const cats = (currentGuideCat && catsCache[currentGuideCat.id]) || [];
  const eras = [];
  cats.forEach(c => { if (c.era && !eras.includes(c.era)) eras.push(c.era); });
  return eras;
}
// מכבד את אותו סינון (activeGuideChips/matchesGuideFilters/חיפוש) שכבר חושב ב-renderGuideGrid -
// ציר שלא מכבד את הצ'יפים היה סותר את מה שכתוב בהם.
// #61: ציר הזמן כעץ — גזע של תקופות, ענף לכל תת-קבוצה (ספר/קטגוריה באישים, דור
// באנשי התלמוד), ועלים = שמות קצרים שלחיצה עליהם פותחת את הכרטיס. ענפים מתקפלים.
const TIMELINE_GUIDES = ['people', 'amoraim'];
function timelineBranchOf(entry){
  if (currentGuideCat && currentGuideCat.id === 'amoraim' && entry.dor) return entry.dor;
  const c = guideCatOf(entry.cat);
  return (c && c.label) || '';
}
// #61: בתוך ענף — שושלת לפי relIds (ת.1ב, #67) בלבד, לא לפי שמות. ילד שהורהו (father,
// ואם אין — mother) נמצא באותו ענף מקונן תחתיו; הורה מקושר שבענף אחר מוצג כקישור קטן;
// הורה שקיים בשם אך לא הוכרע (null ב-relIds) = שם אפור בלי קישור. O(n) — Map אחד לענף.
function tlParentRef(entry){
  const r = entry.relIds || {};
  for (const f of ['father', 'mother']){
    if (entry[f] === undefined && r[f] === undefined) continue;
    const name = Array.isArray(entry[f]) ? entry[f][0] : entry[f];
    const pid = Array.isArray(r[f]) ? r[f][0] : r[f];
    if (name || pid) return { name: name || '', pid: pid || null };
  }
  return null;
}
function timelineLineageHTML(items, flatIdx){
  const byId = new Map();
  items.forEach(e => { if (e.id) byId.set(e.id, e); });
  const kids = new Map(), refOf = new Map(), roots = [];
  items.forEach(e => {
    const ref = tlParentRef(e);
    refOf.set(e, ref);
    if (ref && ref.pid && ref.pid !== e.id && byId.has(ref.pid)){
      if (!kids.has(ref.pid)) kids.set(ref.pid, []);
      kids.get(ref.pid).push(e);
    } else roots.push(e);
  });
  const seen = new Set();
  const leaf = (e, nested) => {
    seen.add(e);
    let h = `<button type="button" class="tl-leaf" data-idx="${flatIdx.length}">${esc(e.name)}</button>`;
    flatIdx.push(e);
    const ref = refOf.get(e);
    if (!nested && ref){
      const p = ref.pid && typeof findPersonById === 'function' ? findPersonById(ref.pid) : null;
      if (p) h += `<button type="button" class="tl-parent" data-pid="${esc(p.id)}" title="הורה">${esc(p.name)}</button>`;
      else if (ref.name) h += `<span class="tl-parent tl-none" title="אין קישור ודאי">${esc(ref.name)}</span>`;
    }
    const ks = (e.id && kids.get(e.id) || []).filter(k => !seen.has(k));
    if (!ks.length) return `<span class="tl-node">${h}</span>`;
    return `<div class="tl-lin"><span class="tl-node">${h}</span><div class="tl-kids">${ks.map(k => leaf(k, true)).join('')}</div></div>`;
  };
  let out = roots.map(e => leaf(e, false)).join('');
  // שארית (מעגל ב-relIds) — לא נבלעת
  items.forEach(e => { if (!seen.has(e)) out += leaf(e, false); });
  return out;
}
function renderGuideTimeline(list){
  const eras = guideErasInOrder();
  if (!eras.length){
    guideGrid.innerHTML = '<div class="grid-empty">אין נתוני תקופה למדריך זה.</div>';
    return;
  }
  const flatIdx = [];
  let html = '<div class="timeline timeline-tree">';
  eras.forEach(era => {
    const items = list.filter(e => guideEraOf(e) === era);
    if (!items.length) return;
    html += `<div class="timeline-era">
      <div class="timeline-era-head"><span class="timeline-dot"></span><h3>${esc(era)}</h3><span class="timeline-count">${items.length}</span></div>
      <div class="tl-branches">`;
    const branches = [];
    items.forEach(e => { const b = timelineBranchOf(e); let br = branches.find(x => x.name === b); if (!br){ br = { name: b, items: [] }; branches.push(br); } br.items.push(e); });
    branches.forEach(br => {
      html += `<details class="tl-branch" open><summary><span class="tl-branch-name">${esc(br.name || '—')}</span><span class="timeline-count">${br.items.length}</span></summary><div class="tl-leaves">`;
      html += timelineLineageHTML(br.items, flatIdx);
      html += '</div></details>';
    });
    html += `</div></div>`;
  });
  html += '</div>';
  guideGrid.innerHTML = html;
  guideGrid.querySelectorAll('.tl-leaf').forEach(btn => {
    const entry = flatIdx[parseInt(btn.dataset.idx, 10)];
    btn.addEventListener('click', () => openEntryDetail(entry));
  });
  guideGrid.querySelectorAll('button.tl-parent').forEach(btn => {
    btn.addEventListener('click', () => { const p = findPersonById(btn.dataset.pid); if (p) openEntryDetail(p); });
  });
}
if (guideTimelineToggle) guideTimelineToggle.addEventListener('click', () => {
  guideViewMode = guideViewMode === 'timeline' ? 'grid' : 'timeline';
  guideTimelineToggle.classList.toggle('on', guideViewMode === 'timeline');
  guideTimelineToggle.textContent = guideViewMode === 'timeline' ? '☰ תצוגת רשת' : '🕰️ ציר זמן';
  renderGuideGrid(guideSearchBox.value);
});

// כשאין חיפוש והצ'יפ הפעיל הוא "הכל" - מקבצים לפי הקטגוריות המקוריות של המדריך (בדיוק
// כמו שהיה בכל מדריך בנפרד: כותרת קטגוריה + מספר סידורי + הסבר). אחרת - רשימה שטוחה.
function renderGuideGrid(filterText){
  renderGuideChips();
  const q = normalizeHeb(filterText || '').trim();
  let list = currentGuideData;
  if (!chipsAreAll()) list = list.filter(e => activeGuideChips.has(e.cat));
  list = list.filter(matchesGuideFilters);
  if (q) list = list.filter(e => normalizeHeb(e.name + ' ' + (e.aliases || []).join(' ')).includes(q));

  if (!list.length){
    guideGrid.innerHTML = '<div class="grid-empty">לא נמצאו תוצאות התואמות את הסינון.</div>';
    return;
  }

  if (guideViewMode === 'timeline' && currentGuideCat && TIMELINE_GUIDES.includes(currentGuideCat.id)){
    renderGuideTimeline(list);
    return;
  }

  const cats = (currentGuideCat && catsCache[currentGuideCat.id]) || [];
  const noExtraFilter = activeGuideEra === 'all' && activeGuideLetter === 'all' && activeGuideTribe === 'all';
  const groupByCat = chipsAreAll() && !q && noExtraFilter && cats.length;
  const flatIdx = []; // רשימת (entry) לפי סדר הופעה בפועל ב-DOM, לחיבור הקליקים
  let html = '';
  if (groupByCat){
    cats.forEach(c => {
      const items = list.filter(e => e.cat === c.id);
      if (!items.length) return;
      html += `<div class="entry-section-head"><span class="entry-section-num">${esc(c.num||'')}</span><h3>${esc(c.label)}</h3></div>`;
      items.forEach(entry => { html += entryCardHTML(entry); flatIdx.push(entry); });
    });
    const uncategorized = list.filter(e => !cats.some(c => c.id === e.cat));
    uncategorized.forEach(entry => { html += entryCardHTML(entry); flatIdx.push(entry); });
  } else {
    list.forEach(entry => { html += entryCardHTML(entry); flatIdx.push(entry); });
  }

  // במקומות בלבד: מפת עולם מלאה עם כל ציוני הדרך, בסוף הרשימה (בדיוק כמו במקור,
  // רק שם היא הייתה בהתחלה - כאן מבקשים בסוף). אופלין לגמרי (Natural Earth + Leaflet).
  // 3.2.1 — המפה מוצגת **תמיד** במדריך המקומות, ומקבלת את הרשימה **המסוננת**.
  // עד כה היא נבנתה רק כשלא היה שום סינון פעיל (`!q && chipsAreAll() && ...`),
  // ולכן כל סינון פשוט העלים אותה — מה שנראה כמו "הסינון לא משפיע על המפה",
  // וכפתור "🗺️ למפה" נאלץ לאפס את כל הסינון רק כדי שיהיה מה להציג.
  const isPlaces = currentGuideCat && currentGuideCat.id === 'places';
  const mapFiltered = isPlaces && !(chipsAreAll() && !q && noExtraFilter);
  if (isPlaces){
    const withGeo = list.filter(e => (e.methods || []).some(m => m && m.geo));
    html += `<div class="entry-section-head" style="grid-column:1/-1;"><span class="entry-section-num">🗺️</span>
        <h3>${mapFiltered ? 'מפת המקומות שבסינון' : 'מפת כל המקומות'}</h3></div>`
      + (mapFiltered ? `<div class="mini-note" style="grid-column:1/-1;margin:-4px 0 6px;">מציגה ${withGeo.length} מקומות מתוך ${list.length} שבסינון (רק למקומות עם קואורדינטות יש סימון).</div>` : '')
      + `<div id="worldMap" style="grid-column:1/-1;height:420px;border-radius:10px;overflow:hidden;"></div>`;
  }

  guideGrid.innerHTML = html;
  updateGuideFiltersSummary();
  let cardI = 0;
  Array.from(guideGrid.children).forEach(card => {
    if (!card.classList.contains('entry-card')) return;
    const entry = flatIdx[cardI++];
    card.addEventListener('click', () => openEntryDetail(entry));
  });
  lazyLoadWikiThumbnails(guideGrid);

  if (isPlaces && typeof resetWorldMap === 'function'){
    // ⚠️ list ולא currentGuideData: זה מה שגורם למפה לכבד את הסינון בפועל.
    window.DATA = list;
    window.CATS = catsCache['places'] || [];
    window.openModal = openEntryDetail;
    resetWorldMap();
    setTimeout(() => { try { initWorldMap(); } catch(e){ console.warn('madaei-hatanach: world map failed', e); } }, 50);
  }
}

guideAddNewBtn.addEventListener('click', () => openGenericProposeForm(''));

// מציג מדריך ישירות בעמוד השער (בלי iframe) - הנתונים כבר נטענים דרך loadGuideData.
async function openGuide(catId, term){
  const cat = CATEGORIES.find(c => c.id === catId);
  if (!cat) return;
  landing.style.display = 'none';
  frameWrap.classList.remove('open');
  resultsOverlay.classList.remove('open');
  guideView.classList.add('open');
  // מדריך "אנשים מהתלמוד" נעזר בתוסף "ביוגרפיות" מאת יאיר דניאל לאימות זהות
  // אמוראים (ר' docs/בלוק-סריקת-אישים-בכורות.md) - קרדיט קצר, כמו ב"ערך היום" (home.js).
  const credit = (cat.id === 'amoraim')
    ? ' <span class="mini-note" style="font-weight:400;">— בעזרת תוסף ״ביוגרפיות״ מאת יאיר דניאל</span>' : '';
  guideViewTitle.innerHTML = catIconHtml(cat.id, 26) + ' ' + esc(cat.label) + credit;
  guideSearchBox.value = '';
  activeGuideChips.clear();
  activeGuideEra = 'all';
  activeGuideTribe = 'all';
  activeGuideLetter = 'all';
  guideViewMode = 'grid';
  if (guideTimelineToggle){
    guideTimelineToggle.style.display = TIMELINE_GUIDES.includes(cat.id) ? '' : 'none';
    guideTimelineToggle.classList.remove('on');
    guideTimelineToggle.textContent = '🕰️ ציר זמן';
  }
  currentGuideCat = cat;
  currentGuideData = await loadGuideData(cat);
  // 5.4.0 — זכירת הסינון האחרון לכל מדריך (נשמר בהעדפות)
  try {
    const lf = (typeof uiPrefs !== 'undefined' && uiPrefs.lastFilters && uiPrefs.lastFilters[cat.id]) || null;
    if (lf){ (lf.c||[]).forEach(x => activeGuideChips.add(x)); activeGuideEra = lf.e||'all'; activeGuideTribe = lf.t||'all'; activeGuideLetter = lf.l||'all'; }
  } catch(_){}
  renderGuideGrid('');
  // #54: התמונות נטענות עכשיו (לא בפתיחת התוסף); כשהגיעו — מרנדרים שוב את אותו מדריך
  if (!guideImagesReady(cat.id)) loadGuideImages(cat).then(() => {
    if (currentGuideCat === cat && guideView.classList.contains('open') && guideViewMode === 'grid') renderGuideGrid(guideSearchBox.value);
  });
  if (term){
    const norm = normalizeHeb(term);
    const match = currentGuideData.find(e => normalizeHeb(e.name) === norm) ||
                  currentGuideData.find(e => (e.aliases||[]).some(a => normalizeHeb(a) === norm));
    if (match) openEntryDetail(match);
  }
}
function closeGuideView(){
  guideView.classList.remove('open');
  landing.style.display = '';
}
guideBackBtn.addEventListener('click', closeGuideView);
guideSearchBox.addEventListener('input', () => renderGuideGrid(guideSearchBox.value));

function closeFrame(){
  frameWrap.classList.remove('open');
  guideFrame.src = 'about:blank';
}
backBtn.addEventListener('click', closeFrame);

// כפתור "חזרה" בתוך כל מדריך רץ בתוך ה-iframe, ולכן משדר הודעה להורה במקום לנווט
// את עצמו (ניווט של ה-iframe עצמו לא בעייתי, אבל עדיף לסגור את המסגרת ולחזור לעמוד הכניסה).
window.addEventListener('message', (ev) => {
  if (!ev.data) return;
  if (ev.data.__madaeiHatanachBack) closeFrame();
  // משוב ממדריך מוטמע (guides/talmud-tools/*): עובר לממסר הדיווחים הרגיל,
  // כי הרשאת שליחת המייל בוטלה ב-2.13.2.
  if (ev.data.__madaeiHatanachFeedback){
    const src = String(ev.data.source || 'מדריך מוטמע');
    sendToDev('משוב — ' + src, String(ev.data.body || ''), src);
  }
});

document.querySelectorAll('.card[data-cat]').forEach(card => {
  card.addEventListener('click', () => openGuide(card.dataset.cat, null));
});
