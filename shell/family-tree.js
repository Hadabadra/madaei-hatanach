// =====================================================================
//  shell/family-tree.js — 2.6 (#59): עץ משפחה אינטראקטיבי בכרטיס אדם
//
//  נבנה על relIds (ת.1ב, #67) ולא על שמות — לכן לא מחבר אנשים לא נכונים.
//  קשר שלא הוכרע (null ב-relIds) מוצג כשם אפור בלי קישור.
//  שורות: סבים · הורים · [אחים · האדם · בני זוג] · ילדים · נכדים (6.8.0, #402).
//  לחיצה על אדם מרכזת את העץ עליו; כפתור ״לכרטיס״ פותח את הכרטיס שלו.
// =====================================================================

function ftPerson(pid){
  return (typeof findPersonById === 'function') ? findPersonById(pid) : null;
}
function ftRel(entry, field){
  const r = entry && entry.relIds ? entry.relIds[field] : undefined;
  const names = entry ? entry[field] : undefined;
  const nl = Array.isArray(names) ? names : (names ? [names] : []);
  const il = r === undefined ? [] : (Array.isArray(r) ? r : [r]);
  return nl.map((n, i) => ({ name: n, pid: il[i] || null }));
}
function ftNode(item, cls){
  const p = item.pid ? ftPerson(item.pid) : null;
  const label = esc(p ? p.name : item.name);
  if (!p) return `<span class="ft-node ft-none ${cls || ''}" title="אין קישור ודאי">${label}</span>`;
  return `<button type="button" class="ft-node ${cls || ''}" data-pid="${esc(p.id)}">${label}</button>`;
}
function ftRow(title, items, cls){
  if (!items.length) return '';
  return `<div class="ft-row"><div class="ft-row-title">${esc(title)}</div><div class="ft-row-nodes">${items.map(i => ftNode(i, cls)).join('')}</div></div>`;
}

function familyTreeInner(entry){
  const parents = ftRel(entry, 'father').concat(ftRel(entry, 'mother'));
  const grand = [];
  parents.forEach(pr => {
    const p = pr.pid && ftPerson(pr.pid);
    if (p) grand.push(...ftRel(p, 'father'), ...ftRel(p, 'mother'));
  });
  const self = `<span class="ft-node ft-self">${esc(entry.name)}</span>`;
  const sibs = ftRel(entry, 'siblings').map(i => ftNode(i, 'ft-sib')).join('');
  const sps = ftRel(entry, 'spouses').map(i => ftNode(i, 'ft-spouse')).join('');
  const kids = ftRel(entry, 'children');
  // 6.8.0 — #402: נכדים (ילדי הילדים שיש להם קישור ודאי)
  const gkids = [], seenG = new Set();
  kids.forEach(k => {
    const p = k.pid && ftPerson(k.pid);
    if (p) ftRel(p, 'children').forEach(g => { const key = g.pid || g.name; if (!seenG.has(key)){ seenG.add(key); gkids.push(g); } });
  });
  return ftRow('סבים', grand)
    + ftRow('הורים', parents)
    + `<div class="ft-row ft-center"><div class="ft-row-title">${sibs ? 'אחים · ' : ''}${esc(entry.name)}${sps ? ' · בני זוג' : ''}</div>`
    +   `<div class="ft-row-nodes">${sibs}${self}${sps ? '<span class="ft-sep">♥</span>' + sps : ''}</div></div>`
    + ftRow('ילדים', kids)
    + ftRow('נכדים', gkids)
    + `<div class="ft-foot">${entry.id ? `<button type="button" class="ft-open" data-pid="${esc(entry.id)}">לכרטיס של ${esc(entry.name)} ←</button>` : ''}`
    + `<span class="mini-note">לחיצה על שם מרכזת עליו את העץ. שם אפור = אין קישור ודאי (כמה אנשים בשם זה).</span></div>`;
}

function familyTreeHTML(entry){
  if (!entry || !entry.relIds) return '';
  const any = ['father', 'mother', 'spouses', 'children', 'siblings'].some(f => ftRel(entry, f).length);
  if (!any) return '';
  return `<details class="family-tree" data-root="${esc(entry.id || '')}"><summary>🌳 עץ משפחה</summary>`
    + `<div class="ft-body">${familyTreeInner(entry)}</div></details>`;
}

// חיווט — נקרא מ-wireEntryDetail. ה-root הוא הכרטיס הפתוח; ״לכרטיס״ פותח את מי שבמרכז.
function wireFamilyTree(container, rootEntry){
  const tree = container.querySelector('.family-tree');
  if (!tree) return;
  const body = tree.querySelector('.ft-body');
  tree.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-pid]');
    if (!btn) return;
    ev.stopPropagation();
    const p = ftPerson(btn.dataset.pid);
    if (!p) return;
    if (btn.classList.contains('ft-open')){
      if (p !== rootEntry && typeof openEntryDetail === 'function') openEntryDetail(p);
      return;
    }
    body.innerHTML = (typeof maskDivineName === 'function') ? maskDivineName(familyTreeInner(p)) : familyTreeInner(p);
  });
}
