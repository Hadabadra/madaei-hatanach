// 4.4.0 — יכולות SDK של אוצריא 0.9.97–0.9.98 שעוד לא נוצלו. כל קריאה כאן
// שקטה בכישלון: בגרסה או הרשאה חסרות התוסף פשוט עובד כמו קודם.
//
//   reader.current_ref_changed / current_book_changed — מעקב אחרי מקום הקריאה
//   reader.updateToolbarItem — מספר הערכים שזוהו בדף, על כפתור הסרגל
//   workspace.create         — כל מקורות הערך בשולחן עבודה חדש
//   plugin.listInstalled / plugin.openOther — מעבר לתוספי אישים/מקומות מותקנים
//   fs.beginBinaryWrite / commitUserFileWrite — שמירת קבצים בדיאלוג ״שמור בשם״
//   fs.pickUserFile / readTextFile — שחזור גיבוי של האזור האישי
//   feedback.hasReporterEmail — ר' ensureReplyEmail ב-personal.js

// ---- כפתור הסרגל: כמה ערכים זוהו בדף ----
let toolbarCountShown = -1;
function updateToolbarCount(n){
  if (!otzOk() || n === toolbarCountShown) return;
  toolbarCountShown = n;
  const title = n > 0 ? PLUGIN_DISPLAY_NAME + ' · ' + n + ' ערכים בדף' : PLUGIN_DISPLAY_NAME;
  Otzaria.call('reader.updateToolbarItem', { id: TOOLBAR_ITEM_ID, patch: { title } }).catch(() => {});
}

// ---- מעקב אחרי מקום הקריאה ----
const READ_OPT_FOLLOW = 'mh_follow_reading';   // ברירת מחדל: כבוי
let followOn = false;
let followTimer = null;
let followLastKey = '';

function locFromReaderEvent(p){
  if (!p || !(p.currentBookId || p.currentBook)) return null;
  return {
    bookId: String(p.currentBookId || p.currentBook),
    id: Number.isInteger(p.currentId) ? p.currentId : null,
    type: p.currentType || 'text',
    index: Number(p.currentIndex) || 0,
    title: String(p.currentRef || p.currentBook || p.currentBookId),
    quiet: true
  };
}

function onReaderRefChanged(p){
  if (!followOn || runMode === 'background' || document.hidden) return;
  const loc = locFromReaderEvent(p);
  if (!loc || loc.type !== 'text') return;
  const key = loc.bookId + '|' + loc.index;
  if (key === followLastKey) return;
  // גלילה יורה אירוע לכל פרק שעובר — מזהים רק אחרי שהקורא נעצר
  clearTimeout(followTimer);
  followTimer = setTimeout(() => {
    followLastKey = key;
    identifyReaderLocation(loc).catch(() => {});
  }, 1200);
}

(async function wireFollowReading(){
  for (let i = 0; i < 50 && !otzOk(); i++) await new Promise(r => setTimeout(r, 200));
  if (!otzOk()) return;
  followOn = await readOptFlag(READ_OPT_FOLLOW, false);
  const el = document.getElementById('optFollow');
  if (el){
    el.checked = followOn;
    el.addEventListener('change', () => {
      followOn = el.checked;
      followLastKey = '';
      writeOptFlag(READ_OPT_FOLLOW, followOn);
    });
  }
  Otzaria.on('reader.current_ref_changed', onReaderRefChanged);
  Otzaria.on('reader.current_book_changed', () => { followLastKey = ''; updateToolbarCount(0); });
})();

// ---- פעולות אוצריא בכרטיס: שולחן עבודה ותוספים משלימים ----
function entrySourceRefs(entry){
  const seen = new Set(), out = [];
  (entry.verses || entry.makorot || []).forEach(v => {
    const p = v && v.ref && parseAnyRef(v.ref);
    if (!p) return;
    const k = p.bookId + '|' + p.ref;
    if (seen.has(k)) return;
    seen.add(k); out.push(p);
  });
  return out;
}

const WORKSPACE_MAX_TABS = 12;
async function openSourcesInWorkspace(entry, refs){
  const list = refs.slice(0, WORKSPACE_MAX_TABS);
  const name = (PLUGIN_DISPLAY_NAME + ' — ' + entry.name).slice(0, 100);
  try {
    const c = otzData(await Otzaria.call('ui.showConfirm', {
      title: 'שולחן עבודה ל"' + entry.name + '"',
      content: 'ייפתח שולחן עבודה בשם "' + name + '" ובו ' + list.length + ' מקורות'
        + (refs.length > list.length ? ' (הראשונים מתוך ' + refs.length + ')' : '')
        + '. הכרטיסיות הפתוחות עכשיו נשמרות בשולחן הנוכחי.'
    }));
    if (!c || c.confirmed !== true) return;
    // המשימה נכתבת לאחסון *לפני* המעבר — אחרי המעבר הכרטיסייה הזו כבר לא פעילה
    await Otzaria.call('storage.set', { key: WS_PENDING_KEY,
      value: JSON.stringify({ ts: Date.now(), refs: list.map(p => ({ bookId: p.bookId, ref: p.ref })) }) }).catch(() => {});
    await writeOptFlag(WS_PENDING_FLAG, true);
    await Otzaria.call('workspace.create', { name, switchTo: true, reuseExisting: true });
    // אם הדף הזה עדיין חי אחרי המעבר — פותח בעצמו (ומכבה את הדגל, כך שהרקע לא יכפיל)
    await openPendingWorkspaceSources();
  } catch(e){
    Otzaria.call('ui.showError', { message: 'פתיחת שולחן העבודה נכשלה. ' + ((e && e.message) || '') }).catch(() => {});
  }
}

const OWN_PLUGIN_IDS = ['com.chadbedera.madaeihatanach', 'com.chadbedera.madaeihatanachplus'];
let installedPluginsCache = null;
async function installedPlugins(){
  if (installedPluginsCache) return installedPluginsCache;
  try {
    const d = otzData(await Otzaria.call('plugin.listInstalled'));
    installedPluginsCache = Array.isArray(d) ? d : [];
  } catch(e){ installedPluginsCache = []; }
  return installedPluginsCache;
}
// מדריכים שיש להם תוסף ייעודי משלים אצל חלק מהמשתמשים
const COMPANION_PATTERNS = { people: /אישים/, amoraim: /אישים/, places: /מקומות/ };

async function wireEntryOtzariaActions(container, entry, catId){
  if (!otzOk() || !entry || !entry.name || container.querySelector('.otz-actions')) return;
  const bar = document.createElement('div');
  bar.className = 'otz-actions';
  bar.style.cssText = 'margin-top:12px;display:flex;flex-wrap:wrap;gap:6px;';
  bar.addEventListener('click', ev => ev.stopPropagation());
  const refs = entrySourceRefs(entry);
  if (refs.length >= 2){
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'panel-btn secondary';
    b.textContent = '🗂 כל ' + Math.min(refs.length, WORKSPACE_MAX_TABS) + ' המקורות בשולחן עבודה חדש';
    b.title = 'workspace — פתיחת המקורות ככרטיסיות בשולחן עבודה נפרד';
    b.addEventListener('click', () => openSourcesInWorkspace(entry, refs));
    bar.appendChild(b);
  }
  // 5.9.0 — ״לשון הקודש״ (Hadabadra/KLI-MULON): פירוש ודקדוק לשם הערך. התוסף שם מקבל {word} ב-plugin.openOther
  {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'panel-btn secondary';
    b.textContent = '📖 פירוש ודקדוק ב״לשון הקודש״ ↗';
    b.title = 'פתיחת השם בתוסף לשון הקודש (שורש, פירוש, דקדוק)';
    const word = String(entry.name).replace(/\s*\(.*\)\s*$/, '').trim();
    b.addEventListener('click', () => {
      Otzaria.call('plugin.openOther', { pluginId: 'milon-klei-kodesh', param: { word: word, source: PLUGIN_DISPLAY_NAME } })
        .then(r => { if (r && r.success === false) throw r; })
        .catch(() => Otzaria.call('ui.showMessage', { message: 'התוסף ״לשון הקודש״ אינו מותקן. אפשר להתקין אותו מחנות התוספים של אוצריא.' }).catch(() => {}));
    });
    bar.appendChild(b);
  }
  container.appendChild(bar);
  const pat = COMPANION_PATTERNS[catId];
  if (!pat) { if (!bar.children.length) bar.remove(); return; }
  const others = (await installedPlugins()).filter(p => p && p.enabled !== false
    && OWN_PLUGIN_IDS.indexOf(p.pluginId) === -1 && pat.test(String(p.name || '')));
  others.slice(0, 2).forEach(p => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'panel-btn secondary';
    b.textContent = 'פתיחה ב״' + p.name + '״ ↗';
    b.addEventListener('click', () => {
      Otzaria.call('plugin.openOther', { pluginId: p.pluginId, param: { query: entry.name, source: PLUGIN_DISPLAY_NAME } })
        .catch(() => Otzaria.call('ui.showError', { message: 'לא ניתן לפתוח את "' + p.name + '" כרגע.' }).catch(() => {}));
    });
    bar.appendChild(b);
  });
  if (!bar.children.length) bar.remove();
}

// ---- שמירת קובץ בדיאלוג ״שמור בשם״ של המערכת ----
// מחזיר את שם הקובץ שנשמר, false אם המשתמש ביטל, או null כשהמסלול אינו זמין
// (גרסה/הרשאה) — ואז הקורא נופל להורדה הרגילה.
async function saveTextViaDialog(text, baseName, ext, withBom){
  if (!otzOk()) return null;
  let token = null;
  try {
    const blob = new Blob([(withBom ? '﻿' : '') + text], { type: ext === 'json' ? 'application/json' : 'text/plain;charset=utf-8' });
    const b = otzData(await Otzaria.call('fs.beginBinaryWrite', { purpose: 'user-file', expectedSize: blob.size }));
    if (!b || !b.uploadUrl) return null;
    token = b.writeToken;
    const put = await fetch(b.uploadUrl, { method: 'PUT', headers: { 'Content-Type': blob.type }, body: blob });
    if (!put.ok) throw new Error('upload ' + put.status);
    const c = otzData(await Otzaria.call('fs.commitUserFileWrite', {
      writeToken: token, suggestedName: String(baseName).replace(/[\\/:*?"<>|]/g, '').slice(0, 120), extension: ext, title: 'שמירת קובץ'
    }));
    token = null;
    if (!c || (c.cancelled !== true && !c.name && !c.token)) return null;
    return c.cancelled ? false : (c.name || baseName + '.' + ext);
  } catch(e){
    if (token) Otzaria.call('fs.abortBinaryWrite', { writeToken: token }).catch(() => {});
    return null;
  }
}

// ---- גיבוי ושחזור של האזור האישי ----
// כל מה שהמשתמש יצר נשמר ב-localStorage של התוסף (סימניות, עריכות, טיוטות,
// דפים אישיים, הגדרות). הגיבוי הוא העתק מלא שלו, והשחזור כותב אותו בחזרה.
const BACKUP_FORMAT = 'einayim-lamikra-backup';

function collectLocalData(){
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      if (k != null) out[k] = localStorage.getItem(k);
    }
  } catch(e){}
  return out;
}

async function exportPersonalBackup(btn){
  const data = collectLocalData();
  const n = Object.keys(data).length;
  if (!n){ Otzaria.call('notifications.showInApp', { message: 'אין עדיין נתונים אישיים לגיבוי.', type: 'info' }).catch(() => {}); return; }
  const payload = JSON.stringify({
    format: BACKUP_FORMAT, version: 1,
    plugin: (typeof EMBEDDED_PLUGIN_VERSION !== 'undefined' ? EMBEDDED_PLUGIN_VERSION : ''),
    savedAt: new Date().toISOString(), localStorage: data
  }, null, 1);
  if (btn) btn.disabled = true;
  try {
    const res = await saveTextViaDialog(payload, 'גיבוי-' + PLUGIN_DISPLAY_NAME + '-' + new Date().toISOString().slice(0, 10), 'json', false);
    if (res === null){
      Otzaria.call('ui.showError', { message: 'השמירה לקובץ אינה זמינה בגרסת אוצריא זו (נדרשת 0.9.97 ומעלה, עם הרשאת קבצים).' }).catch(() => {});
    } else if (res){
      Otzaria.call('notifications.showInApp', { message: 'הגיבוי נשמר: ' + res + ' (' + n + ' פריטים)', type: 'success' }).catch(() => {});
    }
  } finally { if (btn) btn.disabled = false; }
}

async function importPersonalBackup(){
  let token = null;
  try {
    const pick = otzData(await Otzaria.call('fs.pickUserFile', { title: 'בחירת קובץ גיבוי של ' + PLUGIN_DISPLAY_NAME, extensions: ['json'] }));
    if (!pick || pick.cancelled) return;
    token = pick.token;
    const raw = otzData(await Otzaria.call('fs.readTextFile', { token }));
    const text = typeof raw === 'string' ? raw : (raw && raw.content) || '';
    let obj = null;
    try { obj = JSON.parse(text.replace(/^﻿/, '')); } catch(e){}
    if (!obj || obj.format !== BACKUP_FORMAT || !obj.localStorage || typeof obj.localStorage !== 'object'){
      await Otzaria.call('ui.showError', { message: 'הקובץ שנבחר אינו גיבוי של ' + PLUGIN_DISPLAY_NAME + '.' });
      return;
    }
    const entries = Object.entries(obj.localStorage).filter(([k, v]) => typeof k === 'string' && typeof v === 'string');
    const c = otzData(await Otzaria.call('ui.showConfirm', {
      title: 'שחזור גיבוי',
      content: 'ישוחזרו ' + entries.length + ' פריטים מגיבוי מתאריך ' + String(obj.savedAt || '').slice(0, 10)
        + '. נתונים קיימים באותם מפתחות יוחלפו בגרסה שבגיבוי, ושאר הנתונים יישארו. התוסף ייטען מחדש בסיום.'
    }));
    if (!c || c.confirmed !== true) return;
    let ok = 0;
    entries.forEach(([k, v]) => { try { localStorage.setItem(k, v); ok++; } catch(e){} });
    await Otzaria.call('notifications.showInApp', { message: 'שוחזרו ' + ok + ' פריטים. טוען מחדש…', type: 'success' }).catch(() => {});
    setTimeout(() => location.reload(), 700);
  } catch(e){
    Otzaria.call('ui.showError', { message: 'השחזור נכשל. ' + ((e && e.message) || '') }).catch(() => {});
  } finally {
    if (token) Otzaria.call('fs.revokeFile', { token }).catch(() => {});
  }
}

(async function wireBackupButtons(){
  const g = document.getElementById('setBackupGroup');
  if (!g) return;
  for (let i = 0; i < 50 && !otzOk(); i++) await new Promise(r => setTimeout(r, 200));
  if (!otzOk()) return;
  g.hidden = false;
  const ex = document.getElementById('setBackupExport');
  const im = document.getElementById('setBackupImport');
  if (ex) ex.addEventListener('click', () => exportPersonalBackup(ex));
  if (im) im.addEventListener('click', importPersonalBackup);
})();
