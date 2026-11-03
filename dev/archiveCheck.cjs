#!/usr/bin/env node
/**
 * archiveCheck.cjs — đối chiếu 2 chiều PROGRESS.md ↔ docs/progress-archive/ (GĐ1157).
 * Bài học GĐ1155: dồn archive bằng tay dễ sinh (1) tham chiếu ma (trỏ file không tồn tại)
 * và (2) archive thiếu dòng mục lục. Tool này báo cáo cả hai chiều:
 *   - Ma: mọi `PROGRESS-GD*.md` / `INDEX-GD*.md` được nhắc trong PROGRESS.md phải tồn tại.
 *   - Mục lục: mọi file archive phải có khoảng GĐ của nó xuất hiện trong PROGRESS.md
 *     (chấp nhận viết tắt "· 666-671" — chỉ cần khoảng số xuất hiện).
 * Report-only (exit 0) — để nhịp bảo trì chạy rồi tự đánh giá, không chặn CI.
 * Dùng: node dev/archiveCheck.cjs
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'docs', 'progress-archive');
const progress = fs.readFileSync(path.join(root, 'PROGRESS.md'), 'utf8');

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));

// ── Chiều 1: tham chiếu ma ──
// Bỏ qua các dòng entry lịch sử ("- **GĐ...**") — chúng mô tả quá trình (có thể nhắc tên file ma đã sửa)
// và chỉ soi dòng trỏ ("- (Đã chuyển...") + dòng mục lục ("- GĐ...").
const scannable = progress.split('\n').filter((l) => !l.startsWith('- **GĐ')).join('\n');
const refs = [...scannable.matchAll(/(?:PROGRESS|INDEX)-GD[\d\-]+\.md/g)].map((m) => m[0]);
const ghostRefs = [...new Set(refs)].filter((r) => !fs.existsSync(path.join(dir, r)));

// ── Chiều 2: archive thiếu mục lục (theo khoảng GĐ trong tên file) ──
const noToc = [];
for (const f of files) {
  const m = f.match(/GD(\d+)(?:-(\d+))?/);
  if (!m) continue;
  const start = m[1];
  const end = m[2] ?? m[1];
  // khoảng xuất hiện trong PROGRESS.md dưới dạng "start" và "end" gần nhau (cùng dòng hoặc dòng kề)
  const hasStart = progress.includes(start);
  const hasEnd = progress.includes(end);
  if (!hasStart || !hasEnd) noToc.push(f);
}

console.log(`Archive: ${files.length} file · tham chiếu trong PROGRESS: ${new Set(refs).size}`);
console.log(`Tham chiếu ma: ${ghostRefs.length}`);
for (const r of ghostRefs) console.log(`  ✗ ${r} (không tồn tại)`);
console.log(`Archive thiếu mục lục: ${noToc.length}`);
for (const f of noToc) console.log(`  ✗ ${f}`);
if (!ghostRefs.length && !noToc.length) console.log('✓ Sạch — đối chiếu 2 chiều khớp.');
