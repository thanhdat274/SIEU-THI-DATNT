// Ngân sách dung lượng tải ban đầu (luật hiệu năng trong promt_game.md): build ra thư mục tạm,
// cộng gzip của mọi JS/CSS mà index.html tải ngay (entry + modulepreload + stylesheet).
// Chạy: `npm run check:bundle` — in bảng và thoát mã 1 nếu vượt ngân sách. Không đụng dist/.
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

/** Mức đo 2026-10-31 + ~10% đệm. Rút gọn được thì HẠ số này — không bao giờ nâng lên. */
export const BUNDLE_BUDGET_KB = { initialGzip: 600, largestChunkGzip: 260 };

export function measureBundle() {
  const out = mkdtempSync(join(tmpdir(), 'taphoa-bundle-'));
  try {
    execSync(`npx vite build --outDir "${out}" --emptyOutDir --logLevel error`, { stdio: 'pipe' });
    const html = readFileSync(join(out, 'index.html'), 'utf8');
    const refs = [...html.matchAll(/(?:src|href)="\/?(assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]);
    const chunks = [...new Set(refs)].map((f) => ({ file: f, gzipKb: gzipSync(readFileSync(join(out, f))).length / 1024 }));
    const assets = readdirSync(join(out, 'assets'));
    const dracoCopies = assets.filter((f) => /^draco_decoder-.*\.wasm$/.test(f)).length;
    const totalKb = assets.reduce((n, f) => n + statSync(join(out, 'assets', f)).size / 1024, 0);
    return {
      chunks,
      initialGzipKb: chunks.reduce((n, c) => n + c.gzipKb, 0),
      largestChunkGzipKb: Math.max(...chunks.map((c) => c.gzipKb)),
      dracoCopies,
      totalAssetsKb: totalKb,
    };
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

if (process.argv[1]?.endsWith('check-bundle.mjs')) {
  const m = measureBundle();
  for (const c of m.chunks) console.log(`  ${c.file.padEnd(40)} ${c.gzipKb.toFixed(1)} KB gzip`);
  console.log(`Tải ban đầu: ${m.initialGzipKb.toFixed(0)} KB gzip (ngân sách ${BUNDLE_BUDGET_KB.initialGzip})`);
  console.log(`Chunk lớn nhất: ${m.largestChunkGzipKb.toFixed(0)} KB gzip (ngân sách ${BUNDLE_BUDGET_KB.largestChunkGzip})`);
  // Chỉ để biết: game tải decoder từ /decoders/draco/, các bản trong assets/ không tới tay người chơi
  console.log(`Bản sao Draco thừa trong assets/: ${m.dracoCopies} · tổng assets ${(m.totalAssetsKb / 1024).toFixed(1)} MB`);
  const fail = m.initialGzipKb > BUNDLE_BUDGET_KB.initialGzip || m.largestChunkGzipKb > BUNDLE_BUDGET_KB.largestChunkGzip;
  process.exit(fail ? 1 : 0);
}
