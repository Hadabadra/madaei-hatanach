#!/usr/bin/env node
/**
 * סיכום הצעות עריכה פתוחות מ-GitHub (״הצעת עריכה״ / ״עריכת כרטיס״ / ״עריכות מקומיות״).
 *
 *   שימוש:  node tools/edit-suggestions.js [--json out.json] [--extra 28,29]
 *
 * מושך דרך ה-REST API (gh api), מקבץ לפי כרטיס (מדריך + שם), שומר רק את הגרסה
 * העדכנית ביותר של כל כרטיס, ומדפיס טבלה: כרטיס · issue אחרון · ישנים שהוחלפו · מה השתנה.
 * --extra מוסיף issues לפי מספר (למשל דיווחי ״טעות בתוכן״) לאותה טבלה.
 * --json שומר את הרשומות המלאות (כולל גוף ה-issue) לעיבוד הבא.
 */
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');

const REPO = 'Hadabadra/madaei-hatanach';
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf('--' + n); return i !== -1 ? args[i + 1] : null; };
const TITLE_RE = /הצעת עריכה|עריכת כרטיס|עריכות מקומיות/;

const api = (path) => JSON.parse(execFileSync('gh', ['api', '--paginate', path], { encoding: 'utf8', maxBuffer: 1 << 28 }));

let issues = api(`repos/${REPO}/issues?state=open&per_page=100`).filter(i => !i.pull_request && TITLE_RE.test(i.title));
const extra = (opt('extra') || '').split(',').filter(Boolean).map(Number);
for (const n of extra) issues.push(api(`repos/${REPO}/issues/${n}`));

// כרטיס: מהכותרת (״— שם (מדריך)״) או מהגוף (״הכרטיס שנערך: **שם**״ + ״מדריך:״)
function cardOf(i){
  const b = i.body || '';
  let name = (b.match(/(?:הכרטיס שנערך|הצעת עריכה):\s*\*\*([^*]+)\*\*/) || [])[1]
          || (i.title.match(/"([^"]+)"/) || [])[1]
          || (i.title.match(/—\s*(.+?)\s*\(/) || [])[1] || i.title;
  let guide = (b.match(/\*\*מדריך:\*\*\s*(.+)/) || [])[1] || (i.title.match(/\(([^()]+)\)\s*$/) || [])[1] || '';
  guide = guide.replace(/^[^֐-׿]+/, '').trim();
  return { name: name.trim(), guide };
}
function changesOf(b){
  const m = (b || '').match(/### מה השתנה\n([\s\S]*?)(?:\n\n|\n###|$)/);
  if (m) return m[1].split('\n').map(s => s.trim()).filter(Boolean);
  const note = (b || '').match(/\*\*note:\*\*\s*(.+)/);
  return note ? ['note: ' + note[1]] : [];
}

const groups = new Map();
for (const i of issues){
  const c = cardOf(i);
  const key = c.guide + '|' + c.name;
  const rec = { number: i.number, created: i.created_at, title: i.title, ...c, changes: changesOf(i.body), body: i.body };
  const g = groups.get(key) || [];
  g.push(rec); groups.set(key, g);
}
const rows = [...groups.values()].map(g => {
  g.sort((a, b) => b.created.localeCompare(a.created) || b.number - a.number);
  return { latest: g[0], superseded: g.slice(1).map(x => x.number) };
}).sort((a, b) => a.latest.number - b.latest.number);

console.log(`| כרטיס | מדריך | אחרון | הוחלפו | מה השתנה |\n|---|---|---|---|---|`);
for (const r of rows){
  const ch = r.latest.changes.join(' · ').replace(/\|/g, '/').slice(0, 160);
  console.log(`| ${r.latest.name} | ${r.latest.guide} | #${r.latest.number} | ${r.superseded.map(n => '#' + n).join(' ') || '—'} | ${ch} |`);
}
console.log(`\n${issues.length} issues · ${rows.length} כרטיסים · ${issues.length - rows.length} גרסאות ישנות`);
if (opt('json')) fs.writeFileSync(opt('json'), JSON.stringify(rows, null, 1));
