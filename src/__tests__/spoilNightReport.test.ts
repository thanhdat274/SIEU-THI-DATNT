import { describe, expect, it } from 'vitest';
import { spoilNightReport } from '../data/advice';
import type { AnalyticsState } from '../data/analytics';

/**
 * GĐ133 — Bản kê NGƯỢC "đêm qua món nào hỏng, tốn bao nhiêu, vì sao" từ sổ analytics có sẵn.
 * THUẦN đọc analytics.items[id][].spoiled — không đổi state/kinh tế; ẩn khi không có món hỏng.
 */

// analytics.items: id → record trước→sau; record có { day, qty, revenue, cost, spoiled, lost }
const mk = (recs: Record<string, { day: number; spoiled?: number }[]>): AnalyticsState => {
  const items: Record<string, { day: number; qty: number; revenue: number; cost: number; spoiled: number; lost: number }[]> = {};
  for (const [id, list] of Object.entries(recs)) {
    items[id] = list.map((r) => ({ day: r.day, qty: 0, revenue: 0, cost: 0, spoiled: r.spoiled ?? 0, lost: 0 }));
  }
  return { items, flags: {} };
};

// Đã verify từ products.ts: mi (dry, buy 3000, hạn 45) · rau (fresh, buy 10000, needsCold) · thit (frozen, buy 60000, needsCold)

describe('spoilNightReport — đêm qua hỏng hàng', () => {
  it('không có analytics → null (ẩn, không nhiễu)', () => {
    expect(spoilNightReport(undefined, 5)).toBeNull();
    expect(spoilNightReport({ items: {}, flags: {} }, 5)).toBeNull();
  });

  it('không món nào hỏng đúng ngày → null (kể cả khi món bán nhiều)', () => {
    const a = mk({ mi: [{ day: 5, spoiled: 0 }, { day: 4, spoiled: 3 }] }); // ngày 5 sạch, nhưng ngày 4 sót lại
    expect(spoilNightReport(a, 5)).toBeNull();
  });

  it('quy đổi đúng cost = spoiled × buy; sắp giảm dần theo tổn thất', () => {
    const a = mk({ mi: [{ day: 5, spoiled: 4 }], rau: [{ day: 5, spoiled: 10 }] });
    const r = spoilNightReport(a, 5)!;
    // mi 4×3000=12000; rau 10×10000=100000 → rau trước
    expect(r.rows).toHaveLength(2);
    expect(r.rows.find((x) => x.id === 'mi')!.cost).toBe(12000);
    expect(r.rows.find((x) => x.id === 'rau')!.cost).toBe(100000);
    expect(r.rows[0].id).toBe('rau');
    expect(r.rows[1].id).toBe('mi');
    expect(r.totalCost).toBe(112000);
  });

  it('chỉ lấy đúng ngày closedDay (record ngày khác bỏ qua), save cũ thiếu dòng an toàn', () => {
    const a = mk({ mi: [{ day: 4, spoiled: 9 }], nuoc: [{ day: 5, spoiled: 2 }] });
    const r = spoilNightReport(a, 5)!;
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].id).toBe('nuoc');
  });

  it('kind=cold cho hàng cần lạnh (rau fresh / thit frozen)', () => {
    const a = mk({ rau: [{ day: 5, spoiled: 2 }], thit: [{ day: 5, spoiled: 1 }] });
    const r = spoilNightReport(a, 5)!;
    expect(r.rows.find((x) => x.id === 'rau')!.kind).toBe('cold');
    expect(r.rows.find((x) => x.id === 'thit')!.kind).toBe('cold');
  });

  it('kind=age cho hàng khô hạn dài (mi)', () => {
    const a = mk({ mi: [{ day: 5, spoiled: 2 }] });
    const r = spoilNightReport(a, 5)!;
    expect(r.rows[0].kind).toBe('age');
  });

  it('bỏ qua món bán mà không hỏng (spoiled=0) nhưng giữ món hỏng dù không bán', () => {
    const a = mk({ mi: [{ day: 5, spoiled: 0 }], nuoc: [{ day: 5, spoiled: 1 }] });
    const r = spoilNightReport(a, 5)!;
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].id).toBe('nuoc');
  });
});
