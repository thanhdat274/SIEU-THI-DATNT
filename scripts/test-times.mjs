#!/usr/bin/env node
// ============================================================================
// Đo thời gian từng file test (SPEC-TOI-UU §T5, lát L1) — BƯỚC ĐẦU của T5 là ĐO.
// Chạy vitest với báo cáo JSON rồi in các file chậm nhất, để biết nơi nào cần chia
// nhóm / gộp file test. Không có số này thì mọi mục tiêu thời gian trong spec là ước lượng.
//
// Chạy:  npm run test:times
// Dùng:  node scripts/test-times.mjs [--top N] [--level info|warn|error] [-- --extra-vitest-arg]
// Output: đọc file json tạm (tự xoá), in bảng chậm nhất + vài tổng hợp.
// ============================================================================

import { spawnSync } from 'node:child_process';
import { readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const idx = (arr, flag) => arr.indexOf(flag);
const top = (() => {
  const i = idx(process.argv, '--top');
  return i >= 0 ? Number(process.argv[i + 1]) || 30 : 30;
})();

const OUT = join(tmpdir(), `vitest-times-${process.pid}.json`);
const extra = (() => {
  const dd = process.argv.indexOf('--');
  if (dd < 0) return [];
  // bỏ mọi cờ của riêng ta nằm trước `--`
  const keep = process.argv.slice(dd + 1);
  for (const f of ['--top']) {
    const j = keep.indexOf(f);
    if (j >= 0) keep.splice(j, Math.min(2, keep.length - j));
  }
  return keep;
})();

const run = spawnSync('npx', ['vitest', 'run', '--reporter=json', `--outputFile=${OUT}`, ...extra], {
  stdio: 'inherit', shell: true,
});

if (!run.status || run.status !== 0) {
  // vitest trả 1 khi có test đỏ, nhưng vẫn ghi file json — vẫn đo được.
  console.log('\n[lưu ý] vitest trả mã khác 0 (có thể do test đỏ hoặc lỗi chạy); vẫn cố đọc kết quả đo.');
}

let data;
try {
  data = JSON.parse(readFileSync(OUT, 'utf8'));
} catch {
  console.error('Không đọc được file kết quả. Chạy lại sau khi test hết lỗi dựng.');
  process.exit(1);
} finally {
  try { unlinkSync(OUT); } catch { /* bỏ qua */ }
}

const files = (data.testResults ?? []).map((r) => ({
  name: r.name,
  ms: Math.max(0, (r.endTime ?? 0) - (r.startTime ?? 0)),
  passed: (r.assertionResults ?? []).filter((a) => a.status === 'passed').length,
  failed: (r.assertionResults ?? []).filter((a) => a.status === 'failed').length,
})).sort((a, b) => b.ms - a.ms);

const totalMs = files.reduce((s, f) => s + f.ms, 0);
const p = (ms) => `${(ms / 1000).toFixed(2)}s`;
const slowest = files.slice(0, top);

console.log(`\n=== ${files.length} file test · tổng giờ chạy ${p(totalMs)} · ${(totalMs / 60000).toFixed(1)} phút ===\n`);
console.log('Bảng: 30 file CHẬM NHẤT (mục tiêu chia nhóm/gộp):');
console.log('| Thời gian | File | Pass/Fail |');
console.log('|---|---|---|');
for (const f of slowest) console.log(`| ${p(f.ms)} | ${f.name} | ${f.passed}/${f.failed} |`);

// Vài tổng hợp nhanh.
const over60 = files.filter((f) => f.ms > 60_000);
const over30 = files.filter((f) => f.ms > 30_000);
const over10 = files.filter((f) => f.ms > 10_000);
console.log(`\nTrên 60s: ${over60.length} · trên 30s: ${over30.length} · trên 10s: ${over10.length}.`);
console.log('Tổng số khẳng định (it/assertion):', files.reduce((s, f) => s + f.passed + f.failed, 0));
