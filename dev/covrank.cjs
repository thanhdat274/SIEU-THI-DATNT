// GĐ666 — xếp hạng file logic (core/data/agents/net) theo số statement chưa phủ, từ coverage-summary.json.
// Chạy sau `npm run test:coverage`: node dev/covrank.cjs
const fs = require('fs');
const s = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
const rows = Object.entries(s)
  .filter(([f]) => /src[/\\](core|data|agents|net)[/\\]/.test(f))
  .map(([f, v]) => ({
    f: 'src' + f.split(/src[/\\]/)[1],
    u: v.statements.total - v.statements.covered,
    t: v.statements.total,
    b: v.branches.total - v.branches.covered,
  }))
  .filter((r) => r.u > 0)
  .sort((a, b) => (b.u + b.b / 3) - (a.u + a.b / 3))
  .slice(0, 24);
rows.forEach((r) => console.log(String(r.u).padStart(5), 'stmt |', String(r.b).padStart(4), 'br |', String(r.t).padStart(5), '|', r.f));
