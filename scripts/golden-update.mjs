#!/usr/bin/env node
// Chép lại mốc cân bằng (SPEC-TOI-UU §T4):  npm run golden:update -- "<lý do đổi kinh tế>"
// Chạy simGolden + simBands với GOLDEN_UPDATE=1 (test GHI mốc mới vào src/__tests__/golden.json thay
// vì so), rồi ghi bảng "cũ → mới → lệch %" kèm lý do vào docs/GOLDEN-LOG.md. BẮT BUỘC có lý do.
import { spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';

const reason = process.argv.slice(2).join(' ').trim();
if (reason.length < 10) {
  console.error('Thiếu lý do. Dùng: npm run golden:update -- "<lý do đổi kinh tế, ít nhất 10 ký tự>"');
  process.exit(1);
}
const FILE = 'src/__tests__/golden.json';
const read = () => JSON.parse(readFileSync(FILE, 'utf8'));
const before = read();

const run = spawnSync('npx', ['vitest', 'run', 'src/__tests__/simGolden.test.ts', 'src/__tests__/simBands.test.ts'], {
  stdio: 'inherit', shell: true, env: { ...process.env, GOLDEN_UPDATE: '1' },
});
if (run.status !== 0) {
  console.error('Sim lỗi (tất định vỡ?) — mốc có thể đã ghi dở, kiểm tra `git diff ' + FILE + '`.');
  process.exit(run.status ?? 1);
}
const after = read();

const sum = (a) => a.reduce((x, y) => x + y, 0);
const pct = (o, n) => (o === 0 ? (n === 0 ? '0%' : 'mới') : `${((n - o) / Math.abs(o) * 100).toFixed(1)}%`);
const fmt = (n) => Math.round(n).toLocaleString('vi-VN');
const rows = [];
const cmp = (name, o, n) => {
  if (!n) return;
  for (const [label, get] of [['tiền cuối kỳ', (s) => s.money], ['tổng lãi vận hành', (s) => sum(s.profit)], ['XP', (s) => s.xp], ['cấp', (s) => s.level]]) {
    const ov = o ? get(o) : 0, nv = get(n);
    if (ov !== nv) rows.push(`| ${name} | ${label} | ${o ? fmt(ov) : '—'} | ${fmt(nv)} | ${o ? pct(ov, nv) : 'mới'} |`);
  }
};
cmp('golden 30 (kỷ nguyên 0)', before.golden30, after.golden30);
for (const lv of Object.keys(after.bands)) cmp(`dải cấp ${lv}`, before.bands[lv], after.bands[lv]);

const day = new Date().toISOString().slice(0, 10);
const table = rows.length
  ? `| Mốc | Chỉ số | Cũ | Mới | Lệch |\n|---|---|---|---|---|\n${rows.join('\n')}`
  : '_Không số nào đổi._';
appendFileSync('docs/GOLDEN-LOG.md', `\n## ${day} — ${reason}\n\n${table}\n`);
console.log(`\n${table}\n\nĐã ghi ${FILE} và docs/GOLDEN-LOG.md. Commit cả hai cùng thay đổi kinh tế.`);
