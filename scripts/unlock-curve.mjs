#!/usr/bin/env node
// ============================================================================
// Data: ĐƯỜNG CONG MỞ KHOÁ (SPEC-TOI-UU §T3, lát L1)
// ----------------------------------------------------------------------------
// In bảng mật độ mở khoá theo cấp + danh sách hệ lớn (hằng *_UNLOCK) ra
// docs/UNLOCK-CURVE.md. Đếm bằng MẪU CHỮ trên mã nguồn (không nạp TS), đúng phương
// pháp dùng lúc viết spec — con số là xấp xỉ, có thể sót vài dạng khai báo.
//
// Các mẫu nhận diện:
//   - `unlock: N`            cú pháp object literal (furniture, recipes, homemade, regionSpecialty, biz…)
//   - `p('id','tên','loại',mua,bán,0xMÀU,N)`  món trong products.ts / catalog.ts (cấp = đối số CUỐI)
//   - `['id','tên','loại',N]`                  hàng cuối game (data/lateGameProducts.ts, tuple LATE)
//   - `export const X_UNLOCK = N`              mốc HỆ LỚN (cơ chế mới), quét khắp src/data
//
// Chạy:  npm run unlock:curve          (hoặc `node scripts/unlock-curve.mjs`)
// Sinh:  docs/UNLOCK-CURVE.md
// ============================================================================

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, 'docs', 'UNLOCK-CURVE.md');

const read = (p) => {
  try {
    return readFileSync(join(ROOT, 'src', p), 'utf8');
  } catch {
    return '';
  }
};

// 1) Món / đồ nội thất / công thức / đặc sản: unlock theo cú pháp chữ.
const CONTENT_FILES = [
  'data/products.ts', 'data/catalog.ts', 'data/lateGameProducts.ts',
  'data/furniture.ts', 'data/recipes.ts', 'data/homemade.ts',
  'data/regionSpecialty.ts',
];

const RE_OBJ = /unlock\s*:\s*(\d+)/g;
const RE_P = /p\(\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*,\s*\d+\s*,\s*\d+\s*,\s*0x[0-9a-fA-F]+\s*,\s*(\d+)\s*\)/g;
const RE_TUPLE = /\[\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*,\s*(\d+)\s*\]/g;

/** Gom các mốc theo cú pháp vào một mảng số nguyên toàn cục. */
const levels = [];
const scan = (text, re) => {
  let m;
  while ((m = re.exec(text)) !== null) levels.push(Number(m[1]));
};

let perFile = {};
for (const f of CONTENT_FILES) {
  const text = read(f);
  const before = levels.length;
  scan(text, RE_OBJ);
  scan(text, RE_P);
  scan(text, RE_TUPLE);
  perFile[f] = levels.length - before;
}

const N = levels.length;
const max = Math.max(0, ...levels);

// Bảng mật độ theo dải cấp (cùng dải như SPEC-TOI-UU để đối chiếu dễ).
const BANDS = [
  [1, 10], [11, 20], [21, 30], [31, 40], [41, 60],
  [61, 80], [81, 100], [101, 150], [151, 200],
];
const density = BANDS.map(([lo, hi]) => {
  const rows = levels.filter((l) => l >= lo && l <= hi).length;
  const span = hi - lo + 1;
  return { lo, hi, rows, per: (rows / span).toFixed(1) };
});

// Từng cấp (1..max) để soi răng cưa 26/28/30.
const byLevel = Array.from({ length: max + 1 }, () => 0);
for (const l of levels) if (l <= max) byLevel[l]++;
const sawTooth = byLevel
  .map((c, lv) => (c > 0 ? `${lv}:${c}` : null))
  .filter(Boolean)
  .join(' · ');

// 2) Hệ lớn: hằng `X_UNLOCK = N` quét khắp src/data.
const sys = [];
for (const f of readdirSync(join(ROOT, 'src', 'data')).filter((x) => x.endsWith('.ts'))) {
  const text = read(`data/${f}`);
  const re = /export\s+const\s+([A-Z][A-Z0-9_]*UNLOCK[A-Z0-9_]*)\s*=\s*(\d+)/g;
  let m;
  while ((m = re.exec(text)) !== null) sys.push({ name: m[1], lv: Number(m[2]), file: f });
}
sys.sort((a, b) => a.lv - b.lv || a.name.localeCompare(b.name));

const PLC = (s) => s.toString().padStart(3, ' ');
const table = density
  .map((b) => `| ${b.lo}–${b.hi} | ${PLC(b.rows)} | ${b.per} |`)
  .join('\n');

const sysTable = sys.length
  ? sys.map((s) => `| ${s.lv} | \`${s.name}\` | ${s.file} |`).join('\n')
  : '_Không có hằng \`*_UNLOCK\` nào._';

const perFileTable = Object.entries(perFile)
  .sort((a, b) => b[1] - a[1])
  .map(([f, c]) => `| \`${f}\` | ${c} |`)
  .join('\n');

const date = new Date().toISOString().slice(0, 10);
const md = `# Đường cong mở khoá

> Sinh tự động bởi \`scripts/unlock-curve.mjs\` ngày ${date}. Đếm mẫu chữ trên mã nguồn
> (cú pháp \`unlock:N\`, \`p(...,N)\`, tuple cuối game, \`*_UNLOCK\`), **xấp xỉ** — có thể sót
> vài dạng khai báo. Chạy lại mỗi khi thêm nội dung, rồi đối chiếu bài test \`unlockPacing\`.

## Mật độ nội dung theo cấp (tổng ${N} mốc, cấp tối đa ${max})

| Dải cấp | Số mốc | TB mỗi cấp |
|---|---|---|
${table}

Chuỗi từng cấp (răng cưa):
\`\`\`
${sawTooth}
\`\`\`

## Phân bố theo nguồn file

| File | Số unlock đếm được |
|---|---|
${perFileTable}

## Hệ lớn (hằng \`*_UNLOCK\`) — cơ chế mới, không tính món

| Cấp | Hằng | File |
|---|---|---|
${sysTable}

---
*Quy ước SPEC-TOI-UU §T3: mỗi cấp tối đa 1 hệ lớn (dải 1–60 cách nhau ≥ 2 cấp); không cấp nào
mở quá 20 mục; từ cấp 60 không quá 12 cấp liên tiếp không có mốc cơ chế/truyện.*
`;
writeFileSync(OUT, md, 'utf8');
console.log(`Đếm ${N} mốc nội dung, ${sys.length} hằng hệ lớn. Đã ghi ${OUT}`);
