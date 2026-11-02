// GĐ666 — liệt kê các dòng statement chưa phủ của một file từ coverage-final.json.
// Cách dùng: node dev/covlines.cjs <đường-dẫn-trong-coverage> (vd src/core/slices/endDay.ts)
const fs = require('fs');
const target = process.argv[2].split('/').join('\\');
const data = JSON.parse(fs.readFileSync('coverage/coverage-final.json', 'utf8'));
const key = Object.keys(data).find((k) => k.endsWith(target));
if (!key) { console.log('not found:', target); process.exit(0); }
const c = data[key];
const lines = {};
for (const [id, n] of Object.entries(c.s)) {
  if (n !== 0) continue;
  const loc = c.statementMap[id];
  (lines[loc.start.line] = lines[loc.start.line] || []).push(loc.start.column);
}
const ls = Object.keys(lines).map(Number).sort((a, b) => a - b);
const out = [];
let s = null, p = null;
for (const l of ls) {
  if (s === null) { s = p = l; continue; }
  if (l === p + 1) { p = l; continue; }
  out.push(s === p ? String(s) : s + '-' + p);
  s = p = l;
}
if (s !== null) out.push(s === p ? String(s) : s + '-' + p);
console.log('uncovered stmt lines:', out.join(', ') || '(none)');
