// טופס עריכת ערך וטופס הצעת ערך חדש.
// נוצר בפיצול router.js (גרסה 2.11.2). המקור: shell/router.js שורות 1142-1407.
// אין להפוך ל-type="module" — כל הקבצים חולקים scope גלובלי אחד.


// בדיקה חיה: האם מקור שהמשתמש מקליד בטופס העריכה ייפתח כקישור לספרייה. לפני
// שהתווסף הרמז הזה, מקור בניסוח לא-תואם (למשל "רמב״ם, ביאת מקדש" בלי "הלכות" —
// ר' תיקון ד.1א למומים) נשמר בלי שום התראה ופשוט לא נפתח, בלי שהמשתמש יבין למה.
// parseVerseRef/parseMidrashRef (shell/refs.js) כבר נטען לפני קובץ זה ב-index.html.
function attachRefCheck(textareaId, statusId, kind){
  const ta = document.getElementById(textareaId);
  const status = document.getElementById(statusId);
  if (!ta || !status) return;
  function update(){
    const lines = ta.value.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length){ status.innerHTML = ''; return; }
    status.innerHTML = lines.map(line => {
      const ref = line.split('|')[0].trim();
      if (!ref) return '';
      const ok = !!(kind === 'verses' ? parseVerseRef(ref) : parseMidrashRef(ref));
      const style = ok ? 'color:var(--color-success,#2e7d32);' : 'color:var(--color-on-surface-faint,#888);';
      return `<div style="font-size:12px;${style}">${ok ? '✓' : '○'} ${esc(ref)}`
        + (ok ? '' : ' — לא יזוהה כקישור לספרייה (יוצג כטקסט בלבד)') + `</div>`;
    }).join('');
  }
  ta.addEventListener('input', update);
  update();
}

// עורך מלא: כל השדות של המדריך (גם הריקים), מקורות (פסוקים/חז"ל), תמונה, וקטגוריות
// מותאמות שהמשתמש מוסיף בעצמו. שמירה מקומית או שליחת הצעה למפתח. משמש גם להוספת
// ערך חדש לגמרי (openGenericProposeForm למטה בונה entry ריק ומעביר לכאן) — כך
// שמקור/כינוי שנוסף בערך חדש עובר באותו צינור בדיוק (קישור לספרייה, "מוזכר יחד
// עם" אחרי invalidateLookup) כמו עריכת ערך קיים, במקום להיות רק טיוטת הצעה.
// #46 — שורת diff שבה בולט רק מה שהשתנה: החלק הזהה בתחילת השדה ובסופו נשאר
// רגיל, והאמצע שהשתנה מסומן — הישן מחוק (~~), החדש מודגש (**). Markdown, כי
// ההצעה נפתחת כ-Issue בגיטהאב; גם כטקסט פשוט (מערכת המשוב של אוצריא) הוא קריא.
// ההשוואה לפי מילים, כדי שתיקון אות אחת יסמן את המילה כולה ולא חצי מילה.
function markChangedWords(label, before, after){
  const b = String(before == null ? '' : before), a = String(after == null ? '' : after);
  if (!b) return '* **' + label + ':** — ← **' + a + '**';
  if (!a) return '* **' + label + ':** ~~' + b + '~~ ← —';
  const bw = b.split(/(\s+)/), aw = a.split(/(\s+)/);
  let i = 0;
  while (i < bw.length && i < aw.length && bw[i] === aw[i]) i++;
  let j = 0;
  while (j < bw.length - i && j < aw.length - i && bw[bw.length - 1 - j] === aw[aw.length - 1 - j]) j++;
  const wrap = (parts, mark) => {
    const mid = parts.slice(i, parts.length - j).join('');
    const core = mid.trim();
    if (!core) return parts.join('');
    const lead = mid.slice(0, mid.indexOf(core)), trail = mid.slice(mid.indexOf(core) + core.length);
    return parts.slice(0, i).join('') + lead + mark + core + mark + trail + parts.slice(parts.length - j).join('');
  };
  return '* **' + label + ':** ' + wrap(bw, '~~') + ' ← ' + wrap(aw, '**');
}

function openGenericEditForm(entry, catIdOverride){
  const catId = catIdOverride || (currentGuideCat ? currentGuideCat.id : null);
  const { base, custom } = guideFieldsFor(catId, entry);
  const before = {}; // לצורך יצירת diff בשליחה
  base.forEach(k => { before[k] = readField(entry, k); });
  // השם שתחתיו העריכה נשמרת - תמיד השם *המקורי* מקובץ הנתונים, כדי שהעריכה תימצא
  // שוב בטעינה הבאה גם אם המשתמש שינה את שם הערך.
  const origName = entry.__origName || entry.name;
  entry.__origName = origName;
  rememberPristine(catId, entry);
  const editExists = hasStoredEdit(catId, origName);

  function inputFor(k){
    const label = (typeof fieldLabel === 'function') ? fieldLabel(catId, k) : (FIELD_LABELS[k] || k);
    const v = readField(entry, k);
    const txt = Array.isArray(v) ? v.join(', ') : (v == null ? '' : String(v));
    const hint = ARRAY_FIELDS.has(k) ? ' <span class="mini-hint">(מופרד בפסיקים)</span>' : '';
    const empty = isEmptyVal(v) ? ' <span class="missing-chip">חסר</span>' : '';
    if (LONG_FIELDS.has(k)){
      return `<div class="field-label">${esc(label)}${hint}${empty}</div>
        <textarea data-fld="${esc(k)}" class="f-textarea" style="min-height:80px">${esc(txt)}</textarea>`;
    }
    return `<div class="field-label">${esc(label)}${hint}${empty}</div>
      <input type="text" data-fld="${esc(k)}" value="${esc(txt)}" class="f-input">`;
  }

  const versesText = (entry.verses || entry.makorot || []).map(v => (v.ref||'') + ' | ' + (v.text||'')).join('\n');
  const midrashText = (entry.midrash || []).map(m => midrashSource(m) + ' | ' + midrashNote(m) + (m.link ? ' | ' + m.link : '')).join('\n');
  const academicText = (entry.academic || []).map(a => (typeof a === 'string') ? a : (a.citation||a.note||a.text||a.ref||'')).join('\n');

  entryModalInner.innerHTML = `
    <h2>עריכת כרטיס: ${esc(entry.name)}</h2>
    <div class="entry-sub">כל השדות פתוחים לעריכה — כולל שדות חסרים. השינויים נשמרים במכשיר זה בלבד, אלא אם תישלח הצעה למפתח.</div>

    <div class="field-label">שם הערך</div>
    <input type="text" data-fld="name" value="${esc(entry.name||'')}" class="f-input">
    <div class="field-label">כינויים נוספים <span class="mini-hint">(מופרד בפסיקים)</span></div>
    <input type="text" data-fld="aliases" value="${esc((entry.aliases||[]).join(', '))}" class="f-input">

    ${(catsCache[catId] || []).length ? `
    <div class="field-label">תת-קטגוריה</div>
    <select data-fld="cat" class="f-input">${(catsCache[catId]||[]).map(c =>
      `<option value="${esc(c.id)}"${c.id === entry.cat ? ' selected' : ''}>${esc(c.label)}</option>`).join('')}</select>
    ` : ''}

    ${base.map(inputFor).join('')}

    <div class="field-label">תמונה <span class="mini-hint">(קישור או קובץ מהמחשב)</span></div>
    <input type="text" data-fld="customImage" value="${esc(entry.customImage||'')}" placeholder="https://... או בחרו קובץ למטה" class="f-input">
    <input type="file" id="editImgFile" accept="image/*" style="margin-top:6px;">

    <div class="field-label">מקורות בתנ״ך <span class="mini-hint">(שורה לכל מקור: מראה־מקום | טקסט — למשל "בראשית יב, א")</span></div>
    <textarea data-multi="verses" id="editVersesTa" class="f-textarea" style="min-height:70px">${esc(versesText)}</textarea>
    <div id="editVersesCheck" class="ref-check-box"></div>

    <div class="field-label">מקורות חז״ל <span class="mini-hint">(שורה לכל מקור: מקור | תוכן | קישור — פורמטים לדוגמה: "בבלי, בכורות מג." · "משנה, בכורות ז, א" · "רמב״ם, הלכות ביאת המקדש ח, א")</span></div>
    <textarea data-multi="midrash" id="editMidrashTa" class="f-textarea" style="min-height:70px">${esc(midrashText)}</textarea>
    <div id="editMidrashCheck" class="ref-check-box"></div>

    <div class="field-label">מקורות נוספים / קישורים <span class="mini-hint">(שורה לכל מקור)</span></div>
    <textarea data-multi="academic" class="f-textarea">${esc(academicText)}</textarea>

    <div class="field-label">קטגוריות נוספות שהוספתם</div>
    <div id="customFieldsBox">${custom.map(k => customRowHTML(k, entry.customFields[k])).join('')}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">
      <input type="text" id="newFieldName" placeholder="שם הקטגוריה (למשל: קישורים, מידע מחז״ל)" class="f-input" style="flex:1 1 200px;width:auto;">
      <button class="nf-btn secondary" id="addFieldBtn" type="button">＋ הוספת קטגוריה</button>
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;">
      <button class="nf-btn" id="genEditSave">💾 שמירה במכשיר</button>
      <button class="nf-btn" id="genEditSend">📨 שליחה למפתח</button>
      <button class="nf-btn secondary" id="genEditCancel">ביטול</button>
      ${editExists ? '<button class="nf-btn secondary danger-link" id="genEditRestore">↺ שחזור לגרסת המקור</button>' : ''}
    </div>`;
  entryOverlay.classList.add('open');
  // 3.8.0 — ui.setUnsavedChanges: אזהרה לפני סגירת הלשונית באמצע עריכה.
  // מתאפס ב-openEntryDetail (אחרי שמירה/שליחה/ביטול).
  entryOverlay.addEventListener('input', () => setUnsaved(true, 'העריכה בכרטיס "' + (entry.name || '') + '" תאבד'), { once: true });
  attachRefCheck('editVersesTa', 'editVersesCheck', 'verses');
  attachRefCheck('editMidrashTa', 'editMidrashCheck', 'midrash');

  const restoreBtn = document.getElementById('genEditRestore');
  if (restoreBtn) restoreBtn.addEventListener('click', async () => {
    if (!(await uiConfirm('לשחזר את "' + origName + '" לגרסה המקורית שבמדריך? העריכה השמורה שלכם תימחק.'))) return;
    const ok = restoreEntryToOriginal(catId, entry, origName);
    invalidateLookup(catId);
    renderGuideGrid(guideSearchBox.value);
    if (!ok) window.alert('העריכה השמורה נמחקה. אין עותק מקור בזיכרון לערך הזה — הוא יוצג כפי שהוא עד לרענון.');
    openEntryDetail(entry);
  });

  function customRowHTML(name, value){
    return `<div class="custom-field-row" style="margin-bottom:8px;">
      <div class="field-label" style="margin-top:8px;">${esc(name)}
        <button type="button" class="del-field" data-name="${esc(name)}" class="danger-link" style="border:none;background:none;cursor:pointer;font-size:12px;">✕ הסרה</button></div>
      <textarea data-custom="${esc(name)}" class="f-textarea">${esc(value||'')}</textarea>
    </div>`;
  }
  function wireCustomRows(){
    entryModalInner.querySelectorAll('.del-field').forEach(b => {
      b.addEventListener('click', () => { b.closest('.custom-field-row').remove(); });
    });
  }
  wireCustomRows();

  document.getElementById('addFieldBtn').addEventListener('click', () => {
    const nameEl = document.getElementById('newFieldName');
    const name = nameEl.value.trim();
    if (!name){ window.alert('יש להקליד שם קטגוריה'); return; }
    document.getElementById('customFieldsBox').insertAdjacentHTML('beforeend', customRowHTML(name, ''));
    nameEl.value = '';
    wireCustomRows();
  });

  document.getElementById('editImgFile').addEventListener('change', (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { entryModalInner.querySelector('[data-fld="customImage"]').value = reader.result; };
    reader.readAsDataURL(file);
  });

  function parseMulti(kind, raw){
    return raw.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
      const parts = line.split('|').map(s => s.trim());
      if (kind === 'verses') return { ref: parts[0]||'', text: parts[1]||'' };
      if (kind === 'midrash') return { source: parts[0]||'', note: parts[1]||'', link: parts[2]||'' };
      return { citation: parts[0]||'' };
    });
  }

  function collect(){
    const out = { fields: {}, custom: {}, multi: {} };
    entryModalInner.querySelectorAll('[data-fld]').forEach(el => {
      const k = el.dataset.fld;
      const raw = el.value.trim();
      out.fields[k] = ARRAY_FIELDS.has(k) ? raw.split(',').map(s=>s.trim()).filter(Boolean) : raw;
    });
    entryModalInner.querySelectorAll('[data-custom]').forEach(el => {
      const v = el.value.trim();
      if (v) out.custom[el.dataset.custom] = v;
    });
    entryModalInner.querySelectorAll('[data-multi]').forEach(el => {
      out.multi[el.dataset.multi] = parseMulti(el.dataset.multi, el.value);
    });
    return out;
  }

  function apply(c){
    Object.keys(c.fields).forEach(k => {
      if (k === 'name' || k === 'aliases' || k === 'customImage') entry[k] = c.fields[k];
      else writeField(entry, k, c.fields[k]);
    });
    entry.customFields = c.custom;
    if (c.multi.verses.length || (entry.verses && entry.verses.length)){
      if (entry.makorot) entry.makorot = c.multi.verses; else entry.verses = c.multi.verses;
    }
    entry.midrash = c.multi.midrash;
    entry.academic = c.multi.academic;
  }

  function buildDiff(c){
    const lines = [];
    if (c.fields.name !== entry.name) lines.push(markChangedWords('שם', entry.name, c.fields.name));
    const beforeAliases = (entry.aliases||[]).join(', ');
    const afterAliases = (c.fields.aliases||[]).join(', ');
    if (beforeAliases !== afterAliases) lines.push(markChangedWords('כינויים', beforeAliases, afterAliases));
    base.forEach(k => {
      const b = Array.isArray(before[k]) ? before[k].join(', ') : (before[k]||'');
      const a = Array.isArray(c.fields[k]) ? c.fields[k].join(', ') : (c.fields[k]||'');
      if (String(b) !== String(a)) lines.push(markChangedWords(FIELD_LABELS[k]||k, b, a));
    });
    Object.keys(c.custom).forEach(k => lines.push('[קטגוריה חדשה] ' + k + ': ' + c.custom[k]));
    if (c.fields.customImage) lines.push('תמונה: ' + (c.fields.customImage.startsWith('data:') ? '(קובץ מצורף מהמחשב)' : c.fields.customImage));
    if (c.multi.verses.length) lines.push('\nמקורות בתנ״ך:\n' + c.multi.verses.map(v => '  ' + v.ref + ' | ' + v.text).join('\n'));
    if (c.multi.midrash.length) lines.push('\nמקורות חז״ל:\n' + c.multi.midrash.map(m => '  ' + m.source + ' | ' + m.note).join('\n'));
    if (c.multi.academic.length) lines.push('\nמקורות נוספים:\n' + c.multi.academic.map(a => '  ' + a.citation).join('\n'));
    return lines.join('\n') || '(לא זוהה שינוי)';
  }

  // ערך חדש שעדיין לא נשמר (openGenericProposeForm למטה) אינו חבר ב-dataCache[catId]
  // עדיין — פתיחת "כרטיס הערך" עליו לפני שמירה תיראה שבורה (בלי cat/תמונה תקינים).
  function isRegistered(){ return !!(dataCache[catId] && dataCache[catId].indexOf(entry) !== -1); }
  // רושם ערך חדש לגמרי בתוך dataCache[catId] (ולכן גם currentGuideData, אותו מערך
  // בדיוק) - מאותו רגע הוא כרטיס אמיתי: parseMidrashRef/parseVerseRef על המקורות
  // שלו (קישור לספרייה) ו"מוזכר יחד עם" (אחרי invalidateLookup) עובדים בדיוק כמו
  // על ערך שהגיע מקובץ הדאטה. ערך קיים שכבר רשום - לא עושה כלום.
  function registerIfNew(){
    if (isRegistered()) return;
    if (!dataCache[catId]) dataCache[catId] = [];
    dataCache[catId].push(entry);
  }

  document.getElementById('genEditCancel').addEventListener('click', () => {
    if (isRegistered()) openEntryDetail(entry); else entryOverlay.classList.remove('open');
  });
  document.getElementById('genEditSave').addEventListener('click', () => {
    const wasNew = !isRegistered();
    apply(collect());
    if (!entry.name){ window.alert('יש למלא שם לערך.'); return; }
    registerIfNew();
    const ok = saveEntryEdit(catId, origName, entry);
    invalidateLookup(catId);          // כדי שכינויים/שמות חדשים ייכנסו למנוע הזיהוי מיד, וגם co-mentions
    renderGuideGrid(guideSearchBox.value);
    if (!ok) window.alert('השינוי הוחל, אך שמירתו הקבועה נכשלה (ייתכן שאחסון הדפדפן מלא) — הוא לא ישרוד רענון.');
    else if (wasNew) window.alert('הערך "' + entry.name + '" נוסף ונשמר במכשיר זה.');
    openEntryDetail(entry);
  });
  document.getElementById('genEditSend').addEventListener('click', async () => {
    const wasNew = !isRegistered();
    const c = collect();
    if (!c.fields.name){ window.alert('יש למלא שם לערך.'); return; }
    const diff = buildDiff(c);
    // 3.3.4 — לא לשלוח פעמיים את אותה הצעה. החתימה היא על ה-diff עצמו, ולכן
    // לחיצה חוזרת בלי שינוי נחסמת, אבל עריכה נוספת על אותו כרטיס נשלחת שוב.
    const diffHash = editDiffHash(diff);
    const alreadySent = getEntryEditSent(catId, origName);
    if (alreadySent && alreadySent.hash === diffHash){
      window.alert('ההצעה הזו כבר נשלחה' + (alreadySent.at ? ' (' + new Date(alreadySent.at).toLocaleDateString('he-IL') + ')' : '')
        + '. אם שיניתם משהו נוסף — ערכו ושלחו שוב.');
      openEntryDetail(entry);
      return;
    }
    apply(c);
    registerIfNew();
    renderGuideGrid(guideSearchBox.value);
    // 2.13.2 — דרך ממסר הדיווחים (personal.js), לא במייל. שמירה בתור + שליחה שקטה.
    const label = wasNew ? 'הצעת ערך חדש' : 'הצעת עריכה';
    const catLabel = (CATEGORIES.find(x=>x.id===catId)||{label:''}).label;
    // 2.17.2 — הערך הנערך מודגש בראש ההודעה. קודם הוא היה שורת טקסט רגילה
    // לפני ה-diff, ובקריאה ב-Issue לא היה ברור מיד באיזה כרטיס ובאיזה מדריך
    // מדובר — מה שהופך כל דיווח לחיפוש קטן במקום לפעולה.
    const sentOk = await sendToDev(
      label + ' — ' + entry.name + ' (' + catLabel + ')',
      ['## ' + label + ': **' + entry.name + '**',
       '',
       '* **מדריך:** ' + catLabel,
       (origName && origName !== entry.name ? '* **שם במקור:** ' + origName : ''),
       '',
       '### מה השתנה',
       '',
       diff].filter(x => x !== '').join('\n'),
      label
    );
    // רק שליחה שבאמת יצאה מסומנת. "נכנס לתור" מחזיר false, ולכן הצעה שנשמרה
    // לשליחה מאוחרת עדיין ניתנת לשליחה חוזרת ולא נחסמת בטעות.
    if (sentOk) markEntryEditSent(catId, origName, diffHash);
    openEntryDetail(entry);
  });
}

// שלב 1 (בחירת מדריך+שם) ואז שלב 2 - אותו עורך מלא שמשמש לעריכת ערך קיים
// (openGenericEditForm), עם כל השדות, הבדיקה החיה של פורמט המקורות, ושני כפתורי
// השמירה/שליחה. עד עכשיו הטופס הזה יצר רק "טיוטת הצעה" נפרדת (<cat>_nf_drafts_v1,
// שני שדות טקסט חופשי) שלא הפכה לערך אמיתי: לא נכנסה ל-dataCache, לא הוצגה ככרטיס,
// ולכן מקור שהוקלד בה לא נבדק מול parseMidrashRef/parseVerseRef ולא קיבל קישור
// לספרייה - וגם "מוזכר יחד עם" לא היה יכול לפעול על ערך שלא קיים בפועל. הטיוטות
// הישנות (אם יש) עדיין מוצגות ב"האזור האישי" (personal.js) - רק שאין יותר כתיבה
// חדשה לשם; ערך שנוצר כאן נשמר כמו כל עריכה אחרת (<cat>_edits_v1, "העריכות שלי").
function openGenericProposeForm(prefillName){
  const safeText = esc(prefillName || '');
  const defaultCatId = currentGuideCat ? currentGuideCat.id : CATEGORIES[0].id;
  const catOptions = CATEGORIES.map(c =>
    `<option value="${c.id}"${c.id === defaultCatId ? ' selected' : ''}>${c.icon} ${esc(c.label)}</option>`).join('');
  entryModalInner.innerHTML = `
    <h2>${prefillName ? '"' + safeText + '" אינו קיים עדיין במדריך' : 'הוספת ערך חדש'}</h2>
    <div class="entry-sub">בחרו מדריך ושם, ואז ממלאים את הכרטיס המלא — מקורות, זיהוי, תמונה — בדיוק כמו בעריכת ערך קיים.</div>
    <div class="field-label">לאיזה מדריך שייך הערך?</div>
    <select id="genNfCat" class="f-input">${catOptions}</select>
    <div class="field-label">שם הערך</div>
    <input type="text" id="genNfName" value="${safeText}" class="f-input">
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;">
      <button class="nf-btn" id="genNfContinue">המשך למילוי הכרטיס ←</button>
      <button class="nf-btn secondary" id="genNfCancel">ביטול</button>
    </div>`;
  entryOverlay.classList.add('open');
  document.getElementById('genNfCancel').addEventListener('click', () => entryOverlay.classList.remove('open'));
  document.getElementById('genNfContinue').addEventListener('click', async () => {
    const catId = document.getElementById('genNfCat').value;
    const name = document.getElementById('genNfName').value.trim();
    if (!name){ window.alert('יש למלא שם'); return; }
    const cat = CATEGORIES.find(c => c.id === catId);
    const btn = document.getElementById('genNfContinue');
    btn.disabled = true;
    const data = await loadGuideData(cat);   // ודאי שהמדריך נטען (dataCache[catId] אמיתי) לפני שרושמים ערך חדש לתוכו
    if (data.some(e => e.name === name)){
      btn.disabled = false;
      window.alert('כבר קיים ערך בשם "' + name + '" במדריך ' + cat.label + '. לעריכתו — פתחו אותו ולחצו על ✏️.');
      return;
    }
    const firstCat = (catsCache[catId] || [])[0];
    const entry = { name: name, aliases: [], cat: firstCat ? firstCat.id : undefined, __origName: name };
    openGenericEditForm(entry, catId);
  });
}
