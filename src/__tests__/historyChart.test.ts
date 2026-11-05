import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HistoryChart } from '../ui/panels/HistoryPanel';
import type { DayRecord } from '../core/gameTypes';

const day = (d: Partial<DayRecord>): DayRecord => ({
  day: 1, revenue: 100_000, profit: 20_000, customers: 10, unhappy: 0, ...d,
} as DayRecord);

const render = (history: DayRecord[]) => renderToStaticMarkup(createElement(HistoryChart, { history }));

describe('HistoryChart (GĐ1254 thiết kế lại)', () => {
  it('ít hơn 2 ngày thì không vẽ (chưa có gì để so)', () => {
    expect(render([day({ day: 1 })])).toBe('');
    expect(render([])).toBe('');
  });

  it('cột chiếm tỉ lệ bề rộng cột (flex + maxWidth trần 72px) — không còn 2 vạch 7px lẻ loi', () => {
    const html = render([day({ day: 1 }), day({ day: 2, revenue: 300_000, profit: 50_000 })]);
    expect(html).toContain('flex:1 1 40px');
    expect(html).toContain('max-width:72px');
    expect(html).toContain('border-bottom:2px solid'); // baseline liền mạch dưới cả khung cột
  });

  it('ngày thưa (≤8) có nhãn số đọc nhanh trên cột; đông ngày thì không (chỉ tooltip)', () => {
    const few = [1, 2, 3].map((d) => day({ day: d, revenue: 100_000 * d, profit: 10_000 * d }));
    expect(render(few)).toContain('300k');
    const many = Array.from({ length: 14 }, (_, i) => day({ day: i + 1, revenue: 100_000 + i * 5_000, profit: 5_000 }));
    expect(render(many)).not.toContain('>300k<');
  });

  it('ngày doanh thu ~0 vẫn hiện vạch xám ở baseline — không bị "lỗ hổng" trong biểu đồ', () => {
    const html = render([day({ day: 1 }), day({ day: 2, revenue: 0, profit: 0 }), day({ day: 3, revenue: 200_000, profit: 30_000 })]);
    expect(html).toContain('rgba(255,255,255,0.3)'); // vạch xám ngày nghỉ
  });

  it('cột lãi/lỗ đúng màu: lỗ đỏ, lãi xanh; chiều cao cột theo tỉ lệ max (cột lớn nhất đạt sàn H)', () => {
    const days = [day({ day: 1, revenue: 100_000, profit: -30_000 }), day({ day: 2, revenue: 400_000, profit: 100_000 })];
    const html = render(days);
    expect(html).toContain('#e74c3c');
    expect(html).toContain('#2ecc71');
    // max = 400.000 → ngày 2 doanh thu cao = 70px (sàn)
    expect(html).toContain('height:70');
  });
});
