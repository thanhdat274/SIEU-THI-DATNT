import { defineConfig } from 'vitest/config';

/**
 * Test chạy node thuần, không dùng vite.config.ts (tránh plugin tự bật server game
 * trùng cổng khi chạy `npm test`).
 */
export default defineConfig({
  test: {
    environment: 'node',
    // GĐ883: pool mặc định 'forks' làm `npm test` thoát mã 1 (Timeout calling "onTaskUpdate") khi các
    // mô phỏng dài chạy song song, dù mọi test đều xanh; 'threads' ổn định (3/3 lần xanh, ~2 phút).
    pool: 'threads',
    include: ['src/**/__tests__/**/*.test.ts'],
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
