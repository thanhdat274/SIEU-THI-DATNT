import { defineConfig } from 'vitest/config';

/**
 * Test chạy node thuần, không dùng vite.config.ts (tránh plugin tự bật server game
 * trùng cổng khi chạy `npm test`).
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
});
