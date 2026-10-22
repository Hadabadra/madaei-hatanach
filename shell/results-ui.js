// חלון תוצאות הזיהוי: צ׳יפים, רשימה ודיווח על טעות.
// נוצר בפיצול router.js (גרסה 2.11.2). המקור: shell/router.js שורות 1584-1733.
// אין להפוך ל-type="module" — כל הקבצים חולקים scope גלובלי אחד.


// לחיצה על תוצאה לא "עוברת" לשום מקום - היא מרחיבה את הכרטיס המלא (עם תמונות, פסוקים
// וכו') ישר בתוך רשימת התוצאות, בלי לסגור אותה. זה בדיוק מה שביקשת - נשארים בעמוד
// השער, ורואים הכל במקום, בלי לאבד את הרשימה.
// שורת צ'יפים לסינון תוצאות הזיהוי לפי מדריך - מוצגת רק כשיש יותר מקטגוריה אחת
// בתוצאות (אחרת אין טעם לסנן). לוחצים על צ'יפ -> מסננים את resultsList בלי לרוץ
// שוב את identify() ובלי לסגור את החלונית.
function renderResultsChips(matches, activeCat, onSelect){
  const resultsChips = document.getElementById('resultsChips');
  if (!resultsChips) return;
  if (!matches.length){ resultsChips.innerHTML = ''; return; }
  const counts = new Map(); // catId -> {label, icon, n}
  matches.forEach(m => {
    if (!counts.has(m.catId)) counts.set(m.catId, { label: m.catLabel, icon: m.catIcon, n: 0 });
    counts.get(m.catId).n++;
  });
  if (counts.size < 2){ resultsChips.innerHTML = ''; return; } // קטגוריה אחת בלבד - אין מה לסנן
  let html = `<button type="button" class="chip${activeCat==='all'?' active':''}" data-cat="all">הכל (${matches.length})</button>`;
  counts.forEach((v, catId) => {
    html += `<button type="button" class="chip${activeCat===catId?' active':''}" data-cat="${esc(catId)}">${catIconHtml(catId, 16)} ${esc(v.label)} (${v.n})</button>`;
  });
  resultsChips.innerHTML = html;
  resultsChips.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => onSelect(btn.dataset.cat));
  });
}

// מצב חיבור הנקדן המקומי, בקצרה - כדי שמי שרוצה זיהוי הקשרי משופר (ר' nikud-engine.js)
// ישים לב שיש לו אפשרות להפעיל אותו. NikudEngine.isConnected() משקף את הבדיקה
// האחרונה של watch() ברקע (bridge.js) - לא סורקת פורטים כאן, כדי לא להשהות את הרינדור.
function renderNikudStatus(){
  const el = document.getElementById('nikudStatus');
  if (!el) return;
  if (!window.NikudEngine){ el.textContent = ''; return; }
  const connected = NikudEngine.isConnected();
  el.textContent = connected
    ? '🟢 הנקדן המקומי מחובר — זיהוי הקשרי של מילים דו-משמעיות פעיל'
    : '⚪ הנקדן המקומי לא מחובר — הפעלתו (כמו ב״שומר השם״) משפרת זיהוי של מילים דו-משמעיות';
  el.classList.toggle('on', connected);
}

function showResults(allMatches, selectedText, mapScope){
  let activeResultsCat = 'all';
  // 4.5.0 (מנוע הזיהוי v2) — זיהויים בדרגת ״אפשרי״ מקופלים תחת כפתור, כדי שהרשימה
  // תראה רק את מה שהמנוע בטוח בו, בלי למחוק את הספק. תוצאות בלי confidence
  // (פרשה, דף מותאם, מסלולים ישנים) נחשבות גלויות.
  const matches = (allMatches || []).filter(m => m.confidence !== 'אפשרי');
  const possible = (allMatches || []).filter(m => m.confidence === 'אפשרי');
  let showPossible = false;
  printCtxResults = { matches: matches, selectedText: selectedText };   // ל״ייצוא כרטסת״ (print.js) — הגלויים בלבד
  // 4.18.0 — ״הפרק על המפה״ (chapter-map.js): הכפתור מופיע רק כשיש מקום עם קואורדינטות
  if (typeof updateChapterMapButton === 'function') updateChapterMapButton(matches, selectedText, mapScope || null);

  function render(){
    renderResultsChips(matches, activeResultsCat, (catId) => { activeResultsCat = catId; render(); });
    const filtered = activeResultsCat === 'all' ? matches : matches.filter(m => m.catId === activeResultsCat);
    renderResultsListRows(filtered, selectedText);
    if (possible.length && activeResultsCat === 'all'){
      const box = document.createElement('div');
      box.className = 'possible-matches';
      box.innerHTML = '<button type="button" class="panel-btn secondary" id="togglePossible">' +
        (showPossible ? 'הסתרת הזיהויים הנוספים ⌃' : 'הצג זיהויים נוספים (' + possible.length + ') ⌄') + '</button>' +
        '<div class="possible-note">זיהויים שהמנוע פחות בטוח בהם — מילה נפוצה, שם משותף לכמה אנשים, או עם ולא אדם.</div>';
      box.querySelector('#togglePossible').addEventListener('click', () => { showPossible = !showPossible; render(); });
      if (showPossible){
        const list = document.createElement('div');
        list.className = 'possible-list';
        possible.forEach(m => list.appendChild(buildResultRow(m)));
        box.appendChild(list);
      }
      // לפני כפתור הדיווח, כדי שהדיווח יישאר אחרון
      const report = resultsList.querySelector('#identifyErrorBtn');
      if (report) resultsList.insertBefore(box, report.parentNode); else resultsList.appendChild(box);
    }
  }
  render();
  renderNikudStatus();

  // 5.4.0 — עמוד מלא מתחת לסרגל הקיים (מדריך/בית), או חלון קופץ לפי ההגדרה
  const page = !(typeof uiPrefs !== 'undefined' && uiPrefs.resultsPopup);
  document.body.classList.toggle('results-page', page);
  if (page){
    const gv = document.getElementById('guideView');
    const bar = (gv && gv.classList.contains('open')) ? document.getElementById('guideViewBar')
      : (document.getElementById('homeSearchWrap') || {}).parentElement;
    const b = bar && bar.getBoundingClientRect ? bar.getBoundingClientRect().bottom : 0;
    document.documentElement.style.setProperty('--res-top', Math.max(0, b) + 'px');
  }
  resultsOverlay.classList.add('open');
}

// שורת תוצאה אחת (שם, מדריך, הרחבה לכרטיס). משותפת לרשימה הגלויה ולמקופלת.
function buildResultRow(m){
  const row = document.createElement('div');
  row.className = 'result-row';
  const viaPrefix = (m.matchedVia && m.matchedVia !== m.name) ? (esc(m.matchedVia) + ': ') : '';
  const modern = shortModernId(m.entry);
  const isCustom = m.catId === 'custom';
  row.innerHTML = `
    <div class="result-row-head" role="button" tabindex="0">
      <div class="info">
        <div class="name">${viaPrefix}${catIconHtml(m.catId, 20)} ${esc(m.name)}</div>
        <div class="cat">${m.catLabel}${modern ? ' · ' + esc(modern) : ''}</div>
      </div>
      <button type="button" class="expand-btn" title="פתיחת הכרטיס" aria-label="פתיחת הכרטיס">‹</button>
    </div>
    <div class="result-row-detail" style="display:none;margin-top:10px;"></div>
  `;
  const btn = row.querySelector('.expand-btn');
  // 5.4.0 — כל האריח לחיץ, לא רק הכפתור
  const head = row.querySelector('.result-row-head');
  head.addEventListener('click', e => { if (e.target !== btn) btn.click(); });
  head.addEventListener('keydown', e => { if (e.key === 'Enter') btn.click(); });
  const detailBox = row.querySelector('.result-row-detail');
  if (isCustom){
    btn.addEventListener('click', () => openCustomHtmlPage(m.term));
  } else {
    // 5.4.0 — האריח פותח את כרטיס הערך המלא (חלונית צד/חלון), במקום הרחבה בתוך הרשימה
    btn.addEventListener('click', () => { if (typeof openEntryDetail === 'function') openEntryDetail(m.entry); });
    if (false) btn.addEventListener('click', async () => {
      const open = detailBox.style.display !== 'none';
      if (open){
        detailBox.style.display = 'none';
        btn.textContent = 'הרחבה ⌄';
        return;
      }
      if (!detailBox.dataset.built){
        detailBox.innerHTML = renderEntryDetailHTML(m.entry, m.catId);
        wireEntryDetail(detailBox, m.entry, () => openGenericEditForm(m.entry, m.catId));
        detailBox.dataset.built = '1';
      }
      detailBox.style.display = 'block';
      btn.textContent = 'סגירה ⌃';
    });
  }
  return row;
}

function renderResultsListRows(matches, selectedText){
  resultsList.innerHTML = '';
  if (!matches.length){
    noResults.style.display = 'block';
    noResults.innerHTML = '<button type="button" class="panel-btn" id="noResPropose">➕ הצעת ערך חדש</button>';
    noResults.querySelector('#noResPropose').addEventListener('click', () => openGenericProposeForm(selectedText));
    resultsQuote.textContent = 'לא נמצאה התאמה ל"' + selectedText + '" באף אחד ממדריכי עינים למקרא.';
  } else {
    noResults.style.display = 'none';
    resultsQuote.textContent = 'נבחר: "' + selectedText + '"';
    matches.forEach(m => resultsList.appendChild(buildResultRow(m)));

    // דיווח על טעות בזיהוי - שליחה למפתח או תיקון מקומי (✏️ בכל תוצאה מורחבת).
    const reportRow = document.createElement('div');
    reportRow.style.cssText = 'margin-top:12px;text-align:center;';
    reportRow.innerHTML = '<button type="button" class="panel-btn secondary" id="identifyErrorBtn">🚩 מצאת טעות בזיהוי? דיווח למפתח</button>';
    reportRow.querySelector('#identifyErrorBtn').addEventListener('click', () => openIdentifyErrorReport(selectedText, matches));
    resultsList.appendChild(reportRow);
  }
}

// טופס דיווח טעות בזיהוי: תיאור חופשי, שליחה במייל או שמירה מקומית. תיקון בפועל של
// כרטיס אפשרי מקומית דרך כפתור ✏️ שבכל תוצאה מורחבת / כרטיס.
function openIdentifyErrorReport(selectedText, matches){
  const summary = (matches || [])
    .filter(m => m.catId !== 'custom')
    .map(m => (m.matchedVia && m.matchedVia !== m.name ? m.matchedVia + ' ← ' : '') + m.name + ' (' + m.catLabel + ')')
    .join('\n');
  entryModalInner.innerHTML = `
    <h2>🚩 דיווח על טעות בזיהוי</h2>
    <div class="entry-sub">הקטע שנבחר: "${esc(selectedText)}"</div>
    <div class="field-label">מה זוהה</div>
    <p style="white-space:pre-line;">${esc(summary || '—')}</p>
    <div class="field-label">מה הטעות? (איזה זיהוי שגוי, ומה הנכון)</div>
    <textarea id="idErrText" class="f-textarea" style="min-height:90px"></textarea>
    <p class="mini-note">אפשר גם לתקן מיד במכשיר שלך: בכל תוצאה מורחבת יש כפתור ✏️ לעריכה מקומית של הכרטיס.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;">
      <button class="nf-btn" id="idErrSend">📨 שליחת הדיווח למפתח</button>
      <button class="nf-btn" id="idErrSave">💾 שמירה במכשיר</button>
      <button class="nf-btn secondary" id="idErrCancel">סגירה</button>
    </div>`;
  entryOverlay.classList.add('open');
  document.getElementById('idErrCancel').addEventListener('click', () => entryOverlay.classList.remove('open'));
  const buildBody = () => 'דיווח טעות בזיהוי - עינים למקרא\n\nהקטע שנבחר: "' + selectedText + '"\n\nמה זוהה:\n' + (summary || '—')
    + '\n\nתיאור הטעות:\n' + (document.getElementById('idErrText').value.trim() || '—');
  document.getElementById('idErrSave').addEventListener('click', () => {
    try {
      const key = 'identify_error_reports_v1';
      const reports = JSON.parse(localStorage.getItem(key) || '[]');
      reports.push({ selectedText, summary, note: document.getElementById('idErrText').value.trim(), savedAt: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(reports));
      window.alert('הדיווח נשמר במכשיר זה. ניתן לשלוח אותו למפתח בכל שלב.');
    } catch(e){ window.alert('שמירת הדיווח נכשלה.'); }
  });
  document.getElementById('idErrSend').addEventListener('click', async () => {
    // 2.13.2 — דרך ממסר הדיווחים (sendToDev ב-personal.js), לא במייל.
    // הפאנל נסגר בכל מקרה: אם אין רשת הדיווח כבר שמור בתור ויישלח לבד.
    await sendToDev('דיווח טעות בזיהוי — "' + selectedText + '"', buildBody(), 'דיווח זיהוי');
    entryOverlay.classList.remove('open');
  });
}

closeResults.addEventListener('click', () => resultsOverlay.classList.remove('open'));
document.getElementById('resultsCloseX').addEventListener('click', () => resultsOverlay.classList.remove('open'));
resultsOverlay.addEventListener('click', (ev) => { if (ev.target === resultsOverlay) resultsOverlay.classList.remove('open'); });
document.querySelectorAll('.panel-overlay').forEach(p => {
  p.addEventListener('click', (ev) => { if (ev.target === p) p.classList.remove('open'); });
});
