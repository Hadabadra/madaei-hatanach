#!/usr/bin/env node
/**
 * #129 — האם כל הדיווחים והצעות העריכה שנשלחו מהתוסף הגיעו ל-GitHub?
 *
 * הדיווחים יוצאים בשני מסלולים (shell/personal.js): ממסר Apps Script → issue ב-GitHub,
 * ובגיבוי — טופס Google, שתשובותיו נשמרות רק בגיליון של בעלת הטופס ולא מגיעות ל-GitHub.
 * הסקריפט משווה ייצוא CSV של הגיליון מול כל ה-issues (פתוחים וסגורים) ומדפיס מה חסר.
 *
 *   שימוש:  node tools/reconcile-reports.js <תגובות-הטופס.csv> [--create]
 *     (ב-Google Sheets: קובץ ← הורדה ← CSV)
 *   --create  פותח issue לכל דיווח חסר, באותה צורה של הממסר (כותרת ״[סוג] כותרת״),
 *             כך ש-tools/edit-suggestions.js יאסוף אותו כמו כל הצעת עריכה אחרת.
 *
 * הסקריפט לא מחיל עריכות על הדאטה: הצעת עריכה עוברת את התהליך הרגיל (edit-suggestions.js,
 * בדיקה מול המקור, כלל #77). אחרי --create מריצים את edit-suggestions.js.
 */
'use strict';
const fs = require('fs');
const { execFileSync } = require('child_process');
const REPO = 'e0548433917-gif/madaei-hatanach';
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
if (!file) { console.error('חסר קובץ CSV — ר׳ ״שימוש״ בראש הקובץ'); process.exit(1); }

// CSV עם מרכאות, פסיקים ושורות בתוך תא
function parseCsv(t) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}
const norm = (s) => String(s || '').replace(/[֑-ׇ]/g, '').replace(/^\[[^\]]*\]\s*/, '').replace(/\s+/g, ' ').trim();

const [head, ...rows] = parseCsv(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
const col = (re) => head.findIndex((h) => re.test(h));
const iTime = col(/חותמת|timestamp/i), iKind = col(/סוג/), iTitle = col(/כותרת/), iDet = col(/פרטים/), iEnv = col(/סביבה/);
if (iTitle < 0) { console.error('לא נמצאה עמודת ״כותרת״ בקובץ. עמודות: ' + head.join(' | ')); process.exit(1); }

// דפדוף ידני (ולא --paginate): הקישורים ש-GitHub מחזיר הם לפי מזהה מספרי, וחלק מהסביבות חוסמות אותם
const issues = [];
for (let page = 1; ; page++) {
  const batch = JSON.parse(execFileSync('gh', ['api', `repos/${REPO}/issues?state=all&per_page=100&page=${page}`], { encoding: 'utf8', maxBuffer: 1 << 28 }));
  issues.push(...batch.filter((i) => !i.pull_request));
  if (batch.length < 100) break;
}
const seen = issues.map((i) => ({ t: norm(i.title), b: norm(i.body).slice(0, 4000) }));
const missing = rows.filter((r) => {
  const t = norm(r[iTitle]); if (!t) return false;
  const d = norm(r[iDet] || '').slice(0, 60);
  return !seen.some((s) => s.t.includes(t) || (d.length >= 25 && s.b.includes(d)));
});

console.log(`בגיליון: ${rows.length} · ב-GitHub: ${issues.length} issues · חסרים ב-GitHub: ${missing.length}`);
for (const r of missing) console.log(`  • ${r[iTime] || ''} | ${r[iKind] || ''} | ${r[iTitle]}`);
if (!args.includes('--create') || !missing.length) process.exit(0);

let made = 0;
for (const r of missing) {
  const kind = r[iKind] || 'דיווח';
  const body = `${r[iDet] || ''}\n\n---\n**סביבה:** ${r[iEnv] || ''}\n**התקבל בטופס:** ${r[iTime] || ''}\n\n_הועבר מגיליון הטופס ע״י tools/reconcile-reports.js (#129)._`;
  execFileSync('gh', ['api', `repos/${REPO}/issues`, '-f', `title=[${kind}] ${r[iTitle]}`, '-f', `body=${body}`], { encoding: 'utf8' });
  made++;
}
console.log(`נפתחו ${made} issues. הבא: node tools/edit-suggestions.js`);
