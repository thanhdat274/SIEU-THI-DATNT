import { readdirSync, readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

/**
 * Test chạy node thuần, không dùng vite.config.ts (tránh plugin tự bật server game
 * trùng cổng khi chạy `npm test`).
 *
 * SPEC-TOI-UU §T5-L2 — chia nhóm KHÔNG di chuyển file (tránh đụng các phiên khác): nhóm 'sim' là mọi test
 * nhập mô phỏng kinh tế (simEconomy/autoplay/seedLevel…) — nặng, chạy phút; còn lại là 'fast'.
 *   npm run test:fast  → TEST_GROUP=fast (đơn vị + store, ~vài chục giây)
 *   npm run test:sim   → TEST_GROUP=sim  (mô phỏng + golden + dải kinh tế)
 *   npm run test:all   → cả hai (= npm test)
 * VITEST_MAX_THREADS giới hạn số luồng (máy yếu / CI). Thêm test sim mới: chỉ cần nhập simEconomy/autoplay,
 * tự rơi vào nhóm sim — không phải khai báo ở đâu.
 */
const TEST_DIR = 'src/__tests__';
const SIM_RE = /simEconomy|autoplay|dev\/sim|seedLevel/;
const group = process.env.TEST_GROUP;
const simFiles = group
  ? readdirSync(TEST_DIR)
      .filter((f) => f.endsWith('.test.ts'))
      .filter((f) => SIM_RE.test(readFileSync(`${TEST_DIR}/${f}`, 'utf8')))
      .map((f) => `${TEST_DIR}/${f}`)
  : [];
const threads = Number(process.env.VITEST_MAX_THREADS) || undefined;

export default defineConfig({
  test: {
    environment: 'node',
    // GĐ883: pool mặc định 'forks' làm `npm test` thoát mã 1 (Timeout calling "onTaskUpdate") khi các
    // mô phỏng dài chạy song song, dù mọi test đều xanh; 'threads' ổn định (3/3 lần xanh, ~2 phút).
    pool: 'threads',
    ...(threads ? { poolOptions: { threads: { maxThreads: threads } } } : {}),
    include: group === 'sim' ? simFiles : ['src/**/__tests__/**/*.test.ts'],
    exclude: group === 'fast' ? ['**/node_modules/**', ...simFiles] : ['**/node_modules/**'],
    // `npm run test:coverage` (mỗi ~10 GĐ): đo dòng code nào chưa test nào chạm tới. Báo cáo HTML ở coverage/.
    // GĐ666: thêm 'json' để dev/covlines.cjs xếp hạng dòng chưa phủ theo file (chỉ để biết, không vào tải đầu).
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/__tests__/**', 'src/dev/**', 'src/**/*.d.ts'],
      reporter: ['text-summary', 'json-summary', 'json', 'html'],
    },
  },
});
