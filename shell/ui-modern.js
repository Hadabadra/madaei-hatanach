// 5.2.0 — קו עיצוב "מודרני מקצה לקצה".
// שני דברים:
//  1. חלונות דו-שיח מעוצבים (uiAlert / uiConfirm / uiPrompt) במקום alert/confirm/prompt
//     של הדפדפן. window.alert מוחלף גלובלית (לא חוסם — כל הקריאות הקיימות הן "הודעה
//     ואז return", כך שאין תלות בחסימה). confirm/prompt הוסבו בקוד ל-await.
//  2. אייקונים קוויים (SVG, בסגנון Material/Lucide) במקום אימוג'י של מערכת ההפעלה
//     בכפתורים, לשוניות וכותרות. ההמרה רצה על ה-DOM (MutationObserver), כך שהיא
//     תופסת גם טקסט שנבנה דינמית וגם את מחרוזות התרגום. אימוג'י בתוך טקסט רץ
//     (פסקאות, תוכן ערכים) לא נוגעים בו.
'use strict';

(function(){
  // ---------- אייקונים ----------
  // נתיבי SVG ב-viewBox 24, קו בעובי 2, צבע currentColor (מקבל את צבע הטקסט/הטוקן).
  const P = {
    warn:   '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    edit:   '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    ext:    '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    print:  '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>',
    save:   '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
    book:   '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
    send:   '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>',
    close:  '<path d="M18 6 6 18M6 6l12 12"/>',
    map:    '<path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4z"/><path d="M8 2v16M16 6v16"/>',
    flag:   '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
    check:  '<path d="M20 6 9 17l-5-5"/>',
    doc:    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
    checkC: '<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>',
    library:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    plus:   '<path d="M12 5v14M5 12h14"/>',
    note:   '<path d="M12 20h9"/><path d="M3 4h12M3 9h12M3 14h8"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    menu:   '<path d="M3 6h18M3 12h18M3 18h18"/>',
    clock:  '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    pin:    '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    clip:   '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
    scroll: '<path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/>',
    bulb:   '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z"/>',
    star:   '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    undo:   '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',
    redo:   '<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 15-6.7L21 13"/>',
    user:   '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    paw:    '<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.8 1.2 2.6 2.6 0 0 0-2-1.7A3.5 3.5 0 0 1 6 11h.5A2.5 2.5 0 0 0 9 10z"/>',
    leaf:   '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21c0-3 1.9-5.4 5.2-6 2.5-.5 5-2 6.8-4"/>',
    gem:    '<path d="M6 3h12l4 6-10 13L2 9z"/><path d="M2 9h20M12 22 8 9l4-6 4 6z"/>',
    temple: '<path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2l9 5H3z"/>',
    jar:    '<path d="M8 2h8M9 2v3c-3 1-5 4-5 8 0 5 3 9 8 9s8-4 8-9c0-4-2-7-5-8V2"/>',
    dot:    '<circle cx="12" cy="12" r="5"/>',
    bookmark:'<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
    eye:    '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    chat:   '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    hands:  '<path d="M11 17l2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.9-3.9a3 3 0 0 0-4.2 0l-.9.9a1 1 0 1 1-3-3l2.8-2.8a5 5 0 0 1 6-.8l.5.3a2 2 0 0 0 1.4.2L21 4"/><path d="m21 3 1 11h-2M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3M3 4h8"/>',
    mail:   '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    tree:   '<path d="M12 22v-7M17 8A5 5 0 0 0 7 8a4 4 0 0 0-1 7.9h12A4 4 0 0 0 17 8z"/>',
    bug:    '<rect x="8" y="6" width="8" height="14" rx="4"/><path d="M19 7l-3 2M5 7l3 2M19 19l-3-2M5 19l3-2M20 13h-4M4 13h4M10 4l1 2M14 4l-1 2"/>',
    image:  '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/>',
    signal: '<path d="M4.9 19.1a10 10 0 0 1 0-14.2M19.1 4.9a10 10 0 0 1 0 14.2M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4"/><circle cx="12" cy="12" r="2"/>',
    box:    '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    refresh:'<path d="M21 2v6h-6M3 22v-6h6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 12a9 9 0 0 1-15 6.7L3 16"/>',
    road:   '<path d="M4 22 8 2M20 22 16 2M12 6v2M12 12v2M12 18v2"/>',
    bell:   '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    globe:  '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
    pause:  '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>',
    trash:  '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    heart:  '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
    cone:   '<path d="M9.3 6h5.4M7.7 12h8.6M2 20h20M12 2 5 20h14z"/>',
    dice:   '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01"/>',
    gear:   '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    puzzle: '<path d="M19.4 14.5a2.5 2.5 0 1 0 0-5H18V6a2 2 0 0 0-2-2h-3.5V2.5a2.5 2.5 0 1 0-5 0V4H4a2 2 0 0 0-2 2v3.5h1.5a2.5 2.5 0 1 1 0 5H2V18a2 2 0 0 0 2 2h3.5v-1.5a2.5 2.5 0 1 1 5 0V20H16a2 2 0 0 0 2-2v-3.5z"/>',
    knife:  '<path d="M3 21 15 9l3-6 3 3-6 3L3 21z"/>',
    flask:  '<path d="M9 3h6M10 3v6L4 20a1 1 0 0 0 .9 1.5h14.2A1 1 0 0 0 20 20l-6-11V3"/><path d="M7 15h10"/>',
    hash:   '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
    health: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  };
  const E = {
    '⚠':'warn','✏':'edit','↗':'ext','🖨':'print','💾':'save','📖':'book','📨':'send','✕':'close','❌':'close',
    '🗺':'map','🚩':'flag','✓':'check','✔':'check','📄':'doc','✅':'checkC','📚':'library','📕':'book','🕮':'book',
    '➕':'plus','📝':'note','🔎':'search','🔍':'search','🗂':'folder','📂':'folder','☰':'menu','🕰':'clock',
    '📍':'pin','📋':'clip','📜':'scroll','💡':'bulb','☆':'star','★':'star','⭐':'star','↺':'undo','↻':'redo',
    '👤':'user','🐾':'paw','🌿':'leaf','🌴':'tree','🌳':'tree','💎':'gem','🏛':'temple','🏺':'jar',
    '🟢':'dot','⚪':'dot','🔖':'bookmark','👁':'eye','💬':'chat','🤝':'hands','✉':'mail','📧':'mail',
    '📅':'calendar','🐞':'bug','🖼':'image','📤':'upload','⬇':'save','📡':'signal','📦':'box','🔄':'refresh',
    '🛣':'road','🔔':'bell','🌍':'globe','⏸':'pause','🗑':'trash','♥':'heart','💚':'heart','🚧':'cone',
    '🎲':'dice','⚙':'gear','🧩':'puzzle','🔪':'knife','🧪':'flask','🔢':'hash','🩺':'health'
  };
  const keys = Object.keys(E).sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const RE = new RegExp('(' + keys.join('|') + ')\\uFE0F?', 'g');
  function svg(name){
    return '<svg class="ui-ico ui-ico-' + name + '" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" '
      + 'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + P[name] + '</svg>';
  }
  window.uiIcon = svg;

  // איפה ממירים: רכיבים "שלוחצים עליהם" וכותרות. לא בתוך תוכן ערכים/טקסט רץ.
  const SCOPE = 'button, a, label, summary, [role="button"], [role="tab"], .chip, .tab, h1, h2, h3, h4, '
    + '[class*="btn"], [class*="-title"], [class*="card-head"], .ui-dlg-title, option-label';
  const SKIP = 'textarea, input, pre, code, .no-icons, .entry-body, .verse, .reader-text, script, style';
  let busy = false;
  function convertNode(t){
    const v = t.nodeValue;
    if (!v || !RE.test(v)) return;
    RE.lastIndex = 0;
    const host = t.parentElement;
    if (!host || host.closest(SKIP) || !host.closest(SCOPE)) return;
    const frag = document.createDocumentFragment();
    let last = 0, m;
    while ((m = RE.exec(v))){
      if (m.index > last) frag.appendChild(document.createTextNode(v.slice(last, m.index)));
      const span = document.createElement('span');
      span.className = 'ui-ico-wrap';
      span.innerHTML = svg(E[m[1]]);
      frag.appendChild(span);
      last = m.index + m[0].length;
    }
    if (last < v.length) frag.appendChild(document.createTextNode(v.slice(last).replace(/^\s+/, ' ')));
    t.parentNode.replaceChild(frag, t);
  }
  function sweep(root){
    if (!root) return;
    if (root.nodeType === 3){ convertNode(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const list = [];
    while (w.nextNode()) list.push(w.currentNode);
    list.forEach(convertNode);
  }
  function startIcons(){
    sweep(document.body);
    new MutationObserver(muts => {
      if (busy) return;
      busy = true;
      try {
        muts.forEach(m => {
          if (m.type === 'characterData') convertNode(m.target);
          else m.addedNodes.forEach(sweep);
        });
      } finally { busy = false; }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  // ---------- חלונות דו-שיח ----------
  let queue = Promise.resolve();
  function dialog(opts){
    // תור: חלון אחד בכל פעם, גם אם כמה הודעות נורו ברצף.
    const run = () => new Promise(resolve => {
      const scrim = document.createElement('div');
      scrim.className = 'ui-dlg-scrim';
      const box = document.createElement('div');
      box.className = 'ui-dlg ui-dlg-' + opts.kind;
      box.setAttribute('role', opts.kind === 'alert' ? 'alertdialog' : 'dialog');
      box.setAttribute('aria-modal', 'true');
      const icon = opts.kind === 'confirm' ? 'warn' : opts.kind === 'prompt' ? 'edit' : 'bulb';
      const head = document.createElement('div');
      head.className = 'ui-dlg-icon';
      head.innerHTML = svg(icon);
      const msg = document.createElement('div');
      msg.className = 'ui-dlg-msg';
      msg.textContent = String(opts.message == null ? '' : opts.message);
      box.appendChild(head);
      box.appendChild(msg);
      let input = null;
      if (opts.kind === 'prompt'){
        input = document.createElement(String(opts.value || '').length > 80 ? 'textarea' : 'input');
        input.className = 'ui-dlg-input';
        input.value = opts.value == null ? '' : String(opts.value);
        input.dir = 'auto';
        box.appendChild(input);
      }
      const row = document.createElement('div');
      row.className = 'ui-dlg-actions';
      const done = val => {
        document.removeEventListener('keydown', onKey, true);
        scrim.classList.remove('open');
        setTimeout(() => scrim.remove(), 160);
        resolve(val);
      };
      const ok = document.createElement('button');
      ok.type = 'button';
      ok.className = 'ui-dlg-btn ui-dlg-ok';
      ok.textContent = opts.okLabel || (opts.kind === 'alert' ? 'הבנתי' : 'אישור');
      ok.addEventListener('click', () => done(opts.kind === 'prompt' ? input.value : true));
      if (opts.kind !== 'alert'){
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'ui-dlg-btn ui-dlg-cancel';
        cancel.textContent = 'ביטול';
        cancel.addEventListener('click', () => done(opts.kind === 'prompt' ? null : false));
        row.appendChild(cancel);
      }
      row.appendChild(ok);
      box.appendChild(row);
      scrim.appendChild(box);
      scrim.addEventListener('click', e => {
        if (e.target === scrim) done(opts.kind === 'alert' ? true : opts.kind === 'prompt' ? null : false);
      });
      function onKey(e){
        if (e.key === 'Escape'){ e.stopPropagation(); e.preventDefault(); done(opts.kind === 'alert' ? true : opts.kind === 'prompt' ? null : false); }
        else if (e.key === 'Enter' && !(input && input.tagName === 'TEXTAREA')){ e.preventDefault(); ok.click(); }
      }
      document.addEventListener('keydown', onKey, true);
      document.body.appendChild(scrim);
      requestAnimationFrame(() => scrim.classList.add('open'));
      setTimeout(() => { (input || ok).focus(); if (input && input.select) input.select(); }, 30);
    });
    const p = queue.then(run);
    queue = p.catch(() => {});
    return p;
  }
  window.uiAlert = (message, okLabel) => dialog({ kind: 'alert', message, okLabel });
  window.uiConfirm = (message, okLabel) => dialog({ kind: 'confirm', message, okLabel });
  window.uiPrompt = (message, value) => dialog({ kind: 'prompt', message, value });

  // window.alert של הדפדפן → חלון מעוצב. לא חוסם; בכל מקומות השימוש ההודעה היא
  // הפעולה האחרונה (alert ואז return), ולכן אין שינוי התנהגות.
  const nativeAlert = window.alert;
  window.alert = function(message){
    if (!document.body){ try { return nativeAlert.call(window, message); } catch(e){ return; } }
    window.uiAlert(message);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startIcons);
  else startIcons();
})();
