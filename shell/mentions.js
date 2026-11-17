// 6.5.0 — ״היכן נזכר״: אינדקס של כל המדריכים מול הבבלי, הירושלמי, המשנה, המדרשים והתנ״ך שבספריית אוצריא
// (guides/_mentions/mentions-data.js, נבנה ע״י tools/build-mentions-index.js; זיהוי אוטומטי לפי השם — לא אומת בכל מופע).
// נטען בעצלות דרך loadGuideData, כמו מדריך. משמש את: (1) הכרטיס — רשימת מראי מקום לחיצים לפי ספר;
// (2) השערים ״מה יש בדף/בפרק״ ו״כל המסכת״ (shell/shas.js); (3) כרטיסי המסכתות ודף המדרשים.
// אין להפוך ל-type="module" — scope גלובלי משותף.
const MENTIONS_CAT = { id: '__mentions', loaderPath: 'guides/_mentions/_loader.html' };
let mentionsByEnt = null;
function loadMentions(){
  return loadGuideData(MENTIONS_CAT).then(d => {
    if (!mentionsByEnt && d && d.books){
      mentionsByEnt = new Map();
      Object.entries(d.books).forEach(([book, b]) => Object.entries(b.e).forEach(([id, us]) => {
        const k = d.ents[id] && (d.ents[id][0] + '|' + d.ents[id][1]);
        if (!k) return;
        if (!mentionsByEnt.has(k)) mentionsByEnt.set(k, []);
        mentionsByEnt.get(k).push([book, us.map(i => b.u[i])]);
      }));
    }
    return d || {};
  });
}
function mentionsData(){ return (typeof dataCache !== 'undefined' && dataCache[MENTIONS_CAT.id]) || null; }

// מראה מקום בצורה ש-parseAnyRef פותח
function mentionRef(book, unit){
  const sp = book.indexOf(' '); const kind = book.slice(0, sp), name = book.slice(sp + 1);
  const u = String(unit || '');
  if (kind === 'בבלי') return 'בבלי, ' + name + ' ' + u.replace(/\.$/, ' ע"א').replace(/:$/, ' ע"ב');
  const [a, b] = u.split(':');
  if (kind === 'ירושלמי') return 'ירושלמי ' + name + ' ' + a + ', ' + (b || 'א');
  if (kind === 'משנה') return 'משנה, ' + name + ' ' + a + ', ' + (b || 'א');
  if (kind === 'תנ״ך') return name + ' ' + a + ', ' + (b || 'א');
  return name + (u ? ', ' + u : '');
}
function mentionBookLabel(book){ return book.replace(/^מדרש /, '').replace(/^בבלי /, 'בבלי · ').replace(/^ירושלמי /, 'ירושלמי · ').replace(/^משנה /, 'משנה · ').replace(/^תנ״ך /, 'תנ״ך · '); }

// כל הערכים שנזכרים בספר (או ברשימת ספרים), אופציונלית רק ביחידות שעוברות את unitOk
function entriesFromMentions(books, unitOk){
  const d = mentionsData(); if (!d || !d.books) return [];
  const out = [], seen = new Set();
  const byName = {};
  (Array.isArray(books) ? books : [books]).forEach(book => {
    const b = d.books[book]; if (!b) return;
    Object.entries(b.e).forEach(([id, us]) => {
      if (unitOk && !us.some(i => unitOk(b.u[i]))) return;
      const ent = d.ents[id]; if (!ent) return;
      const key = ent[0] + '|' + ent[1]; if (seen.has(key)) return; seen.add(key);
      const cat = CATEGORIES.find(c => c.id === ent[0]); if (!cat) return;
      if (!byName[ent[0]]){ byName[ent[0]] = new Map(); (dataCache[ent[0]] || []).forEach(e => byName[ent[0]].set(e.name, e)); }
      const entry = byName[ent[0]].get(ent[1]); if (!entry) return;
      out.push({ catId: cat.id, catLabel: cat.label, catIcon: cat.icon, name: entry.name, term: entry.name, entry, viaMention: true });
    });
  });
  return out;
}

// בכרטיס: ״📍 היכן נזכר בספרייה״ — ספר ← יחידות לחיצות (פתיחה בספרייה)
function wireMentionsList(container, entry, catId){
  if (!entry || !catId || container.querySelector('.mentions-where')) return;
  const box = document.createElement('details');
  box.className = 'mentions-where';
  box.style.marginTop = '12px';
  box.innerHTML = '<summary class="panel-btn secondary">📍 היכן נזכר בבבלי, בירושלמי, במשנה, במדרשים ובתנ״ך</summary><div class="mentions-body mini-note">טוען…</div>';
  container.appendChild(box);
  box.addEventListener('toggle', () => {
    if (!box.open || box.dataset.ready) return;
    box.dataset.ready = '1';
    loadMentions().then(() => {
      const body = box.querySelector('.mentions-body');
      const list = (mentionsByEnt && mentionsByEnt.get(catId + '|' + entry.name)) || [];
      if (!list.length){ body.textContent = 'לא נמצאו מופעים של השם באינדקס.'; return; }
      const order = k => /^בבלי /.test(k) ? 0 : /^משנה /.test(k) ? 1 : /^ירושלמי /.test(k) ? 2 : /^מדרש /.test(k) ? 3 : 4;
      list.sort((a, b) => order(a[0]) - order(b[0]));
      const total = list.reduce((s, x) => s + x[1].length, 0);
      body.innerHTML = '<p class="mini-note">' + total + ' מקומות ב-' + list.length + ' ספרים (זיהוי אוטומטי לפי השם — ייתכן שלא כל מופע מתייחס לערך זה). לחיצה פותחת בספרייה.</p>' +
        list.map(([book, units]) => '<div class="mention-book"><strong>' + esc(mentionBookLabel(book)) + '</strong> ' +
          units.slice(0, 200).map(u => '<a href="#" class="mention-ref" data-ref="' + esc(mentionRef(book, u)) + '">' + esc(u) + '</a>').join(' · ') +
          (units.length > 200 ? ' …(' + units.length + ')' : '') + '</div>').join('');
      body.querySelectorAll('.mention-ref').forEach(a => a.addEventListener('click', (ev) => {
        ev.preventDefault();
        const p = parseAnyRef(a.dataset.ref);
        if (p && p.bookId) openInReader(p.bookId, p.ref);
        else if (p && p.book) openInReader(p.book, 'פרק ' + numToHeb(p.chapter));
      }));
    });
  });
}
