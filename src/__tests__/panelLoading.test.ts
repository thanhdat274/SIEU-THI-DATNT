import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Playtest P1 T4: panel tải lười (Sơ đồ kệ, Tổng kết…) không được để màn trắng. */
describe('Panels — khung chờ khi tải lười', () => {
  const src = readFileSync(resolve(__dirname, '../ui/Panels.tsx'), 'utf8');
  it('Suspense của panel dùng PanelLoading, không còn fallback={null}', () => {
    expect(src).toContain('fallback={<PanelLoading />}');
    expect(src).not.toMatch(/fallback=\{null\}/);
  });
  it('khung chờ có chữ "Đang mở"', () => {
    expect(src).toContain("t('common.opening')");
  });
});
