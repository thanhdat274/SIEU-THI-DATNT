import { defineConfig } from 'vitest/config';

/**
 * Test chạy node thuần, không dùng vite.config.ts (tránh plugin tự bật server game
 * trùng cổng khi chạy `npm test`).
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    // `npm run test:coverage` (mỗi ~10 GĐ): đo dòng code nào chưa test nào chạm tới. Báo cáo HTML ở coverage/.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/__tests__/**', 'src/dev/**', 'src/**/*.d.ts'],
      reporter: ['text-summary', 'json-summary', 'html'],
    },
  },
});
