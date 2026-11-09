// יכולות SDK חדשות של אוצריא (3.8.0) — מרוכזות בקובץ אחד כדי שאפשר יהיה
// להסיר/לגדר אותן בקלות. כל קריאה כאן שקטה בכישלון: הכרטיס עובד גם בלעדיה.
//
//   tools.biographies       (0.9.98) — ביוגרפיה מהמאגר של אוצריא בכרטיסי אישים/אמוראים
//   library.getBookDetails  (0.9.98) — "אודות המסכת" למסכת שאין לה עדיין מדריך
//   library.resolveRef      — סימון מקורות חז"ל שאינם נפתרים בספרייה המותקנת
//   search.query            — "היכן עוד מוזכר" מתוך הכרטיס
//   ui.setUnsavedChanges    — אזהרה לפני סגירה באמצע עריכה (edit-forms.js)

function otzOk(){ return !!(window.Otzaria && typeof Otzaria.call === 'function'); }
function otzData(res){ return (res && res.data !== undefined) ? res.data : res; }

// ---- ביוגרפיה מהמאגר של אוצריא ----
// רק לחכמים (אמוראים/תנאים) ולאישים — המאגר הוא של חכמי ישראל, ולכן התאמה
// נחשבת רק כשהשם או אחד הכינויים זהה לשם הערך, אחרת היינו מציגים אדם אחר.
async function fetchOtzariaBiography(name){
  if (!otzOk() || !name) return null;
  try {
    // 5.10.0 — אוצריא 0.9.98.3: המאגר "תולדות גדולי ישראל"; formatVersion 2 = המבנה המלא (תקופה, קבורה, חיבורים, מקורות)
    const d = otzData(await Otzaria.call('tools.biographies', { query: String(name).slice(0, 200), limit: 5, formatVersion: 2 }));
    const list = (d && d.results) || [];
    const norm = s => String(s || '').replace(/["'״׳\s]/g, '');
    const want = norm(name);
    return list.find(b => norm(b.name) === want || (b.appelations || []).some(a => norm(a) === want)) || null;
  } catch(e){ return null; }
}

// 5.10.0 — הצגה מלאה יותר, ו**קרדיט חובה** לפי תנאי המאגר: attribution ומקורות (sources) לצד כל ערך.
function biographyHtml(b){
  const arr = v => Array.isArray(v) ? v.filter(Boolean) : [];
  const names = v => arr(v).map(x => esc(typeof x === 'string' ? x : (x.name || ''))).filter(Boolean);
  const parts = [];
  if (b.eraLabel) parts.push(esc(b.eraLabel));
  if (b.generation) parts.push('דור: ' + esc(b.generation));
  if (b.birth) parts.push('לידה: ' + esc(b.birth));
  if (b.death) parts.push('פטירה: ' + esc(b.death));
  if (b.buried) parts.push('מקום קבורה: ' + esc(b.buried));
  if (arr(b.countries).length) parts.push(esc(arr(b.countries).join(', ')));
  const text = b.summary || b.biographyShort || '';
  const more = [];
  if (arr(b.roles).length) more.push('<div><b>תפקידים:</b> ' + esc(arr(b.roles).join(' · ')) + '</div>');
  if (names(b.teachers).length) more.push('<div><b>רבותיו:</b> ' + names(b.teachers).slice(0, 8).join(' · ') + '</div>');
  if (names(b.students).length) more.push('<div><b>תלמידיו:</b> ' + names(b.students).slice(0, 8).join(' · ') + '</div>');
  if (arr(b.family).length) more.push('<div><b>משפחה:</b> ' + arr(b.family).slice(0, 8).map(f => esc((f.relation ? f.relation + ': ' : '') + (f.name || ''))).join(' · ') + '</div>');
  if (arr(b.works).length) more.push('<div><b>חיבורים:</b> ' + arr(b.works).slice(0, 10).map(w => esc(w.title || '')).filter(Boolean).join(' · ') + '</div>');
  if (b.remember) more.push('<div><b>לזכור:</b> ' + esc(b.remember) + '</div>');
  const src = arr(b.sources).map(s => {
    const t = esc(s.title || s.credit || 'מקור');
    return s.url ? `<a href="#" data-external-link="${esc(s.url)}" data-requires-net>${t} ↗</a>` : t;
  });
  const credit = (b.attribution ? esc(b.attribution) : '') + (src.length ? (b.attribution ? ' · ' : '') + 'מקורות: ' + src.join(', ') : '');
  return `<div class="otz-bio" style="margin-top:12px;padding:10px 12px;border-radius:10px;border:1px solid var(--color-outline);">
    <div class="field-label" style="margin-top:0;">📜 ממאגר הביוגרפיות של אוצריא</div>
    ${parts.length ? `<div class="mini-note" style="margin:0 0 6px;">${parts.join(' · ')}</div>` : ''}
    ${text ? `<p style="margin:0;">${esc(text)}</p>` : ''}
    ${more.length ? `<details style="margin-top:6px;"><summary style="cursor:pointer;">עוד פרטים</summary><div class="mini-note" style="margin-top:4px;line-height:1.7;">${more.join('')}</div></details>` : ''}
    ${credit ? `<div class="mini-note" style="margin-top:6px;opacity:.75;">${credit}</div>` : ''}
  </div>`;
}

// ---- "היכן עוד מוזכר" — חיפוש מלא באוצריא ----
// 5.9.0 — הטקסט מהחיפוש של אוצריא מגיע עם ישויות HTML (&#x27; &quot;); מפענחים לפני esc כדי שלא יוצגו כקודים
function decodeEntities(s){ const t = document.createElement('textarea'); t.innerHTML = String(s == null ? '' : s); return t.value; }
async function searchMentions(query, max){
  const out = [];
  let total = 0;
  let chunks = Otzaria.call('search.query', { query, mode: 'exact', limit: max || 30, order: 'relevance' });
  if (chunks && typeof chunks.then === 'function' && !chunks[Symbol.asyncIterator]) chunks = await chunks;
  if (!chunks || !chunks[Symbol.asyncIterator]) return { total: 0, results: [] };
  // אוספים למערך ומרנדרים אחרי הלולאה — צרכן איטי קוטע את הזרם (API_REFERENCE).
  for await (const c of chunks){
    if (!c) continue;
    if (typeof c.total === 'number') total = c.total;
    if (Array.isArray(c.results)) out.push(...c.results);
    if (out.length >= (max || 30)) break;
  }
  return { total, results: out.slice(0, max || 30) };
}

function wireMentionsSearch(container, entry){
  const name = entry && (entry.name || entry.title);
  if (!name || container.querySelector('.otz-mentions')) return;
  const box = document.createElement('div');
  box.className = 'otz-mentions';
  box.style.marginTop = '12px';
  box.innerHTML = `<button type="button" class="panel-btn secondary">🔎 היכן עוד מוזכר "${esc(name)}" בספרייה</button> <button type="button" class="panel-btn secondary otz-open-search">פתיחה בחיפוש של אוצריא ↗</button><div class="otz-mentions-list"></div>`;
  // 4.2.0 — reader.openSearchTab: מעבר למסך החיפוש המלא עם השם, לעריכה לפני ההרצה
  box.querySelector('.otz-open-search').addEventListener('click', () => {
    Otzaria.call('reader.openSearchTab', { query: name, autoSearch: false }).catch(() => {});
  });
  container.appendChild(box);
  const btn = box.querySelector('button');
  const list = box.querySelector('.otz-mentions-list');
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    list.innerHTML = '<p class="mini-note">מחפש…</p>';
    try {
      const { total, results } = await searchMentions(name, 30);
      if (!results.length){ list.innerHTML = '<p class="mini-note">לא נמצאו מופעים.</p>'; return; }
      list.innerHTML = `<p class="mini-note">${total} מופעים${total > results.length ? ' — מוצגים ' + results.length + ' הראשונים' : ''}</p>` +
        results.map((r, i) => `<div class="src-item clickable" data-hit="${i}"><button type="button" class="tool-btn" data-bm="${i}" title="הוספה לסימניות של אוצריא" style="float:inline-end;">🔖</button><b>${esc(decodeEntities(r.reference || r.book || ''))}</b> — ${esc(decodeEntities(String(r.text || '').replace(/<[^>]*>/g, '')).slice(0, 140))}</div>`).join('');
      // 4.0.0 — bookmarks.add: שמירת מופע כסימנייה ברשימת הסימניות של אוצריא
      // 4.4.0 — bookmarks.list/remove: מופע שכבר שמור מסומן ✅, ולחיצה עליו מסירה אותו
      const setBm = (b, on) => {
        b.dataset.on = on ? '1' : '';
        b.textContent = on ? '✅' : '🔖';
        b.title = on ? 'שמור בסימניות של אוצריא — לחיצה להסרה' : 'הוספה לסימניות של אוצריא';
      };
      markSavedBookmarks(list, results, setBm);
      list.querySelectorAll('[data-bm]').forEach(b => b.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        const r = results[+b.dataset.bm];
        try {
          if (b.dataset.on){
            const ok = otzData(await Otzaria.call('bookmarks.remove', { bookId: r.bookId, index: r.index }));
            if (ok !== false) setBm(b, false);
            return;
          }
          const ok = otzData(await Otzaria.call('bookmarks.add', { bookId: r.bookId, index: r.index, label: (entry.name || '') + ' — ' + (r.reference || '') }));
          setBm(b, true);
          if (ok === false) b.title = 'כבר קיימת סימנייה כזו — לחיצה להסרה';
        } catch(e){ b.textContent = '⚠️'; }
      }));
      list.querySelectorAll('[data-hit]').forEach(el => el.addEventListener('click', () => {
        const r = results[+el.dataset.hit];
        Otzaria.call('reader.openBook', { bookId: r.bookId, type: r.type, index: r.index }).catch(() => {});
      }));
    } catch(e){
      list.innerHTML = '<p class="mini-note">החיפוש אינו זמין כרגע.</p>';
    } finally { btn.disabled = false; }
  });
}

// 4.4.0 — bookmarks.list: אילו מהמופעים כבר שמורים בסימניות של אוצריא
async function markSavedBookmarks(list, results, setBm){
  try {
    const saved = otzData(await Otzaria.call('bookmarks.list', { limit: 500 }));
    if (!Array.isArray(saved) || !saved.length) return;
    const keys = new Set(saved.map(b => String(b.title || b.bookId || '') + '|' + Number(b.index)));
    list.querySelectorAll('[data-bm]').forEach(b => {
      const r = results[+b.dataset.bm];
      if (r && (keys.has(String(r.bookId) + '|' + Number(r.index)) || keys.has(String(r.book || '') + '|' + Number(r.index)))) setBm(b, true);
    });
  } catch(e){ /* אין הרשאה או גרסה ישנה — הכפתורים נשארים להוספה בלבד */ }
}

// ---- סימון מקורות שאינם נפתרים בספרייה המותקנת ----
async function markUnresolvedSources(container, entry){
  const items = container.querySelectorAll('.src-item.clickable[data-mref]');
  for (const el of items){
    const m = (entry.midrash || [])[parseInt(el.dataset.mref, 10)];
    const ref = m && midrashSource(m);
    if (!ref) continue;
    try {
      const hits = otzData(await Otzaria.call('library.resolveRef', { ref, limit: 1 }));
      if (Array.isArray(hits) && !hits.length){
        el.classList.remove('clickable');
        el.style.opacity = '0.65';
        el.title = 'המקור לא נמצא בספרייה המותקנת';
      }
    } catch(e){ return; }   // API לא זמין — לא נוגעים בכלום
  }
}

// ---- 4.1.0: מפרשים על הפסוק מתוך הספרייה (library.getLinks + getLinkContent) ----
async function loadCommentary(ref, box){
  box.innerHTML = '<p class="mini-note">טוען מפרשים…</p>';
  try {
    const hits = otzData(await Otzaria.call('library.resolveRef', { ref, limit: 1 }));
    const h = Array.isArray(hits) && hits[0];
    if (!h || h.isPdf){ box.innerHTML = '<p class="mini-note">הפסוק לא נמצא בספרייה.</p>'; return; }
    const res = otzData(await Otzaria.call('library.getLinks', {
      bookId: h.bookId, startLine: h.index, endLine: h.index, connectionTypes: ['COMMENTARY']
    }));
    const links = ((res && res.links) || []).slice(0, 6);
    if (!links.length){ box.innerHTML = '<p class="mini-note">לא נמצאו מפרשים לפסוק זה בספרייה.</p>'; return; }
    const content = otzData(await Otzaria.call('library.getLinkContent', {
      links: links.map(l => ({ targetTitle: l.targetTitle, targetLine: l.targetLine, targetLineEnd: l.targetLineEnd,
        targetIsUserBook: l.targetIsUserBook, targetCategoryId: l.targetCategoryId }))
    }));
    const items = (content && content.items) || [];
    box.innerHTML = links.map((l, i) => {
      const t = items[i] && items[i].content ? String(items[i].content).replace(/<[^>]*>/g, '') : '';
      return t ? `<div class="src-item"><b>${esc(String(l.targetTitle || '').replace(/ על .*$/, ''))}:</b> ${guardHolyNamesSafe(t.slice(0, 600))}</div>` : '';
    }).join('') || '<p class="mini-note">לא נמצא תוכן מפרשים.</p>';
  } catch(e){ box.innerHTML = '<p class="mini-note">המפרשים אינם זמינים כרגע.</p>'; }
}
function guardHolyNamesSafe(t){ return (typeof guardHolyNames === 'function') ? guardHolyNames(esc(t)) : esc(t); }

// שורת פעולות אחת לכל כרטיס פסוק (מפרשים · הדפסת הפרק · הערה בספר). עד 4.13.0 כל
// כפתור נוסף ישר לכרטיס עם .tool-btn — עיגול 38px שנועד לאייקון בלבד — והטקסט
// נשפך מחוצה לו ונערם בעמודה. התיבות שנפתחות (מפרשים/הערה) יושבות מתחת לשורה.
function verseActionsRow(card){
  let row = card.querySelector(':scope > .verse-actions');
  if (!row){
    row = document.createElement('div'); row.className = 'verse-actions';
    row.addEventListener('click', ev => ev.stopPropagation());
    card.appendChild(row);
  }
  return row;
}

function wireVerseCommentaries(container, entry){
  const verses = entry.verses || entry.makorot || [];
  container.querySelectorAll('.verse-card[data-vref]').forEach(card => {
    if (card.querySelector('.otz-comm-btn')) return;
    const v = verses[parseInt(card.dataset.vref, 10)];
    if (!v || !v.ref) return;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'verse-act-btn otz-comm-btn'; btn.textContent = '📚 מפרשים';
    btn.title = 'מפרשים על הפסוק מתוך הספרייה של אוצריא';
    const box = document.createElement('div'); box.className = 'otz-comm';
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (box.dataset.loaded){ box.hidden = !box.hidden; return; }
      box.dataset.loaded = '1'; loadCommentary(v.ref, box);
    });
    box.addEventListener('click', ev => ev.stopPropagation());
    verseActionsRow(card).appendChild(btn); card.appendChild(box);
  });
}

// נקרא מסוף wireEntryDetail (entry-detail.js)
function enrichEntryDetail(container, entry){
  if (!otzOk() || !container || !entry) return;
  const catId = (typeof catIdOfEntry === 'function') ? catIdOfEntry(entry) : null;
  if ((catId === 'amoraim' || catId === 'people') && !container.querySelector('.otz-bio')){
    fetchOtzariaBiography(entry.name).then(b => {
      if (b && container.isConnected && !container.querySelector('.otz-bio')){
        container.insertAdjacentHTML('beforeend', biographyHtml(b));
      }
    });
  }
  wireMentionsSearch(container, entry);
  wireVerseCommentaries(container, entry);
  if (typeof wireVersePrintRange === 'function') wireVersePrintRange(container, entry);   // 4.7.0, אוצריא 0.9.99
  wireVerseNotes(container, entry);
  if (typeof wireEntryOtzariaActions === 'function') wireEntryOtzariaActions(container, entry, catId);   // 4.4.0
  // 4.2.0 — tools.gematria: גימטריה של שם הערך
  if (entry.name && !container.querySelector('.otz-gematria')){
    Otzaria.call('tools.gematria', { text: String(entry.name) }).then(res => {
      const d = otzData(res);
      if (!d || !d.value || !container.isConnected || container.querySelector('.otz-gematria')) return;
      container.insertAdjacentHTML('beforeend', `<p class="mini-note otz-gematria" style="margin-top:10px;">🔢 גימטריה: ${esc(entry.name)} = ${d.value}</p>`);
    }).catch(() => {});
  }
  markUnresolvedSources(container, entry);
}

// ---- "אודות המסכת" למסכת שאין לה מדריך (talmud.js) ----
async function showMasechetAbout(name){
  const fallback = 'מסכת ' + name + ' — אין עדיין מדריך למסכת זו. אי״ה ייבנה בעתיד, ומי שרוצה לעזור להגדיל תורה מוזמן להצטרף.';
  if (!otzOk()){ window.alert(fallback); return; }
  let d = null;
  try { d = otzData(await Otzaria.call('library.getBookDetails', { bookId: name })); } catch(e){}
  const lines = [];
  if (d){
    if (d.categoryPath) lines.push(d.categoryPath.replace(/^\//, '').replace(/\//g, ' ← '));
    if (d.authors && d.authors.length) lines.push('מחברים: ' + d.authors.join(', '));
    if (d.generation) lines.push('דור: ' + d.generation);
    if (d.shortDescription) lines.push(d.shortDescription);
  }
  lines.push('', 'אין עדיין מדריך מלא למסכת זו בעינים למקרא. אישור — פתיחת המסכת בספרייה.');
  try {
    const res = await Otzaria.call('ui.showConfirm', { title: 'מסכת ' + name, content: lines.join('\n') });
    if (res && res.success && res.data && res.data.confirmed === true){
      await Otzaria.call('reader.openBook', { bookId: (d && d.bookId) || name });
    }
  } catch(e){ window.alert(fallback); }
}

// ---- אזהרת שינויים שלא נשמרו ----
function setUnsaved(on, message){
  if (!otzOk()) return;
  Otzaria.call('ui.setUnsavedChanges', on
    ? { hasChanges: true, message: message || 'העריכה בכרטיס תאבד' }
    : { hasChanges: false }).catch(() => {});
}

// ---- 3.9.0: הגדרות קריאה (index.html #setReadingGroup) ----
(async function wireReadingOptions(){
  const h = document.getElementById('optHighlight');
  const a = document.getElementById('optAuto');
  const b = document.getElementById('optShowBtn');
  if (!h || !a || !b) return;
  // Otzaria נטען אסינכרונית — ממתינים לו לפני קריאת הערכים
  for (let i = 0; i < 50 && !otzOk(); i++) await new Promise(r => setTimeout(r, 200));
  if (!otzOk()){ const g = document.getElementById('setReadingGroup'); if (g) g.hidden = true; return; }
  h.checked = await readOptFlag(READ_OPT_HIGHLIGHT, true);
  a.checked = await readOptFlag(READ_OPT_AUTO, false);
  b.checked = !(await readOptFlag(READ_OPT_HIDE_BTN, false));
  h.addEventListener('change', () => {
    writeOptFlag(READ_OPT_HIGHLIGHT, h.checked);
    if (!h.checked) Otzaria.call('reader.clearAllHighlights', {}).catch(()=>{});
  });
  a.addEventListener('change', () => writeOptFlag(READ_OPT_AUTO, a.checked));
  b.addEventListener('change', () => writeOptFlag(READ_OPT_HIDE_BTN, !b.checked));
  const lib = document.getElementById('optInLibrary');
  if (lib){
    lib.checked = await readOptFlag(READ_OPT_IN_LIBRARY, true);
    lib.addEventListener('change', () => writeOptFlag(READ_OPT_IN_LIBRARY, lib.checked));
  }
})();

// ---- 4.3.0: ״ערך היום״ לפי התאריך שנבחר ביומן של אוצריא ----
function parseCalDate(v){
  v = otzData(v);
  if (v && typeof v === 'object') v = v.date || v.value;
  const d = v ? new Date(v) : null;
  return (d && !isNaN(d)) ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null;
}
function applyCalendarDate(d){
  if (!d || typeof renderDailyEventBody !== 'function') return;
  const now = new Date();
  const same = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  dailySelectedDate = same ? null : d;
  if (typeof dailyEventBody !== 'undefined' && dailyEventBody && dailyEventBody.isConnected && dailyEventBody.offsetParent !== null) renderDailyEventBody();
}
(async function wireCalendarDate(){
  for (let i = 0; i < 50 && !otzOk(); i++) await new Promise(r => setTimeout(r, 200));
  if (!otzOk()) return;
  Otzaria.call('calendar.getSelectedDate').then(r => applyCalendarDate(parseCalDate(r))).catch(() => {});
  Otzaria.on('calendar.date_changed', (p) => applyCalendarDate(parseCalDate(p && (p.date || p.selectedDate || p))));
})();

// ---- 4.3.0: התראת מערכת יומית על ״ערך היום״ (notifications.scheduleSystem) ----
// מתזמנים 7 ימים קדימה בכל פתיחה של התוסף; ימים בלי מאורע מדולגים.
const READ_OPT_DAILY_NOTIFY = 'mh_daily_notify';
async function scheduleDailyNotifications(){
  if (!otzOk() || typeof eventsForDate !== 'function') return;
  await Otzaria.call('notifications.cancelAll').catch(() => {});
  if (!(await readOptFlag(READ_OPT_DAILY_NOTIFY, false))) return;
  const now = new Date();
  for (let i = 0; i < 7; i++){
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 8, 0, 0);
    if (day <= now) continue;
    const evs = eventsForDate(day);
    if (!evs.length) continue;
    const t = hebrewOfDate(day);
    await Otzaria.call('notifications.scheduleSystem', {
      title: '👁 ערך היום — ' + t.dayLetters + "' " + t.monthName,
      body: evs.slice(0, 2).map(e => e.event + (e.source ? ' (' + e.source + ')' : '')).join(' · ').slice(0, 240),
      scheduledTime: day.toISOString(),
      id: 7300 + i
    }).catch(() => {});
  }
}
(async function wireDailyNotify(){
  const el = document.getElementById('optDailyNotify');
  for (let i = 0; i < 50 && !otzOk(); i++) await new Promise(r => setTimeout(r, 200));
  if (!otzOk()) return;
  if (el){
    el.checked = await readOptFlag(READ_OPT_DAILY_NOTIFY, false);
    el.addEventListener('change', async () => {
      if (el.checked){
        const p = otzData(await Otzaria.call('notifications.requestPermissions').catch(() => null));
        if (p && p.granted === false){ el.checked = false; return; }
      }
      await writeOptFlag(READ_OPT_DAILY_NOTIFY, el.checked);
      scheduleDailyNotifications();
    });
  }
  scheduleDailyNotifications();
})();

// ---- 4.3.0: הערה אישית בספר מתוך כרטיס (notes.add) ----
function wireVerseNotes(container, entry){
  const verses = entry.verses || entry.makorot || [];
  container.querySelectorAll('.verse-card[data-vref]').forEach(card => {
    if (card.querySelector('.otz-note-btn')) return;
    const v = verses[parseInt(card.dataset.vref, 10)];
    if (!v || !v.ref) return;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'verse-act-btn otz-note-btn'; btn.textContent = '📝 הערה בספר';
    btn.title = 'הוספת הערה אישית על הפסוק — תופיע בספר עצמו באוצריא';
    const box = document.createElement('div'); box.hidden = true;
    box.innerHTML = `<textarea class="f-textarea" rows="2" style="width:100%;margin-top:6px;"></textarea>
      <button type="button" class="nf-btn" style="margin-top:4px;">שמירה בספר</button> <span class="mini-note"></span>`;
    const ta = box.querySelector('textarea'), save = box.querySelector('button'), msg = box.querySelector('.mini-note');
    ta.value = (entry.name ? entry.name + ' — ' : '') + PLUGIN_DISPLAY_NAME;
    btn.addEventListener('click', (ev) => { ev.stopPropagation(); box.hidden = !box.hidden; if (!box.hidden) ta.focus(); });
    box.addEventListener('click', ev => ev.stopPropagation());
    save.addEventListener('click', async () => {
      const content = ta.value.trim(); if (!content) return;
      msg.textContent = 'שומר…';
      try {
        const hits = otzData(await Otzaria.call('library.resolveRef', { ref: v.ref, limit: 1 }));
        const h = Array.isArray(hits) && hits[0];
        if (!h){ msg.textContent = 'הפסוק לא נמצא בספרייה.'; return; }
        const ok = otzData(await Otzaria.call('notes.add', { bookId: h.bookId, lineNumber: h.index, content }));
        msg.textContent = ok === false ? 'השמירה נכשלה.' : '✅ נשמרה בספר';
      } catch(e){ msg.textContent = 'השמירה נכשלה.'; }
    });
    verseActionsRow(card).appendChild(btn); card.appendChild(box);
  });
}
