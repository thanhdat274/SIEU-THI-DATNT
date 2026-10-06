/** Sinh lại golden thế giới (xem `world-golden.ts`). Chỉ chạy khi thay đổi gameplay đã được chủ dự án duyệt. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeWorldGolden } from './world-golden';

const out = join(dirname(fileURLToPath(import.meta.url)), '__golden__', 'world-golden.json');
mkdirSync(dirname(out), { recursive: true });
const golden = computeWorldGolden();
writeFileSync(out, `${JSON.stringify(golden, null, 1)}\n`);
console.log(`Đã ghi ${out}: ${Object.keys(golden.maps).length} bản đồ, ${Object.keys(golden.paths).length} đường đi.`);
