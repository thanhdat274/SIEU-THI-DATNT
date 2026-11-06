import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Playtest P1 T5: tổng kết ngày 1 đưa lãi gộp bán hàng lên đầu (trước bảng tiền vào − ra). */
describe('Tổng kết ngày 1 — lãi gộp lên đầu', () => {
  const src = readFileSync(resolve(__dirname, '../ui/panels/ReportPanels.tsx'), 'utf8');
  it('dòng "Ngày đầu bán hàng lãi gộp" nằm trước bảng Doanh thu', () => {
    const head = src.indexOf('Ngày đầu bán hàng lãi gộp');
    const table = src.indexOf("<td style={styles.left}>Doanh thu</td>");
    expect(head).toBeGreaterThan(0);
    expect(head).toBeLessThan(table);
  });
});
