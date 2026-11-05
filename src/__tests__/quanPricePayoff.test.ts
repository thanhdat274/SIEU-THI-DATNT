import { describe, expect, it } from 'vitest';
import { quanPricePayoff, quanNuocProjection, quanNuocCupSupply } from '../data/quanNuocInsights';
import { quanNuocDrinkIds, type QuanNuocState } from '../data/quanNuoc';

/** GĐ1268 — so sánh TRƯỚC khi chọn mức Giờ bán quán nước: lời ròng mỗi mức cùng
 *  nhân viên/kho/thời tiết/ngày (hết hộp đen "đổi rồi đợi tối mới biết", Nguyên tắc a).
 *  Helper THUẦN — dùng đúng công thức quanNuocProjection, không đổi state/kinh tế (Luật 5). */

const q = (over: Partial<QuanNuocState> = {}): QuanNuocState => ({ open: true, staff: 1, price: 'vua', tier: 0, ...over });

/** Kho đủ đồ uống — để phục vụ trọn nhu cầu (bỏ gánh thiếu kho khỏi phép so). */
const full = (level: number): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const id of quanNuocDrinkIds(level)) out[id] = 500;
  return out;
};

const units = (level: number) => quanNuocCupSupply(q({}), level, full(level));

describe('quanPricePayoff — ba mức cùng một kho/nhân viên/ngày', () => {
  it('trả đủ cả 3 mức và mức hiện tại khớp quanNuocProjection (cùng công thức)', () => {
    const level = 40;
    const p = quanPricePayoff(q({ price: 'vua' }), level, units(level));
    const expected = quanNuocProjection(q({ price: 'vua' }), level, units(level));
    expect(p.vua.profit).toBe(expected.profit);
    expect(p.vua.served).toBe(expected.served);
    expect('re' in p && 'cao' in p).toBe(true);
  });

  it('mỗi mức khớp chính xác quanNuocProjection của mức đó (helper chỉ quay lại công thức cân bằng — không chế số)', () => {
    const level = 50;
    const u = units(level);
    const p = quanPricePayoff(q({ staff: 1, price: 'vua' }), level, u);
    for (const price of ['re', 'vua', 'cao'] as const) {
      const exp = quanNuocProjection(q({ price }), level, u);
      expect(p[price].profit, price).toBe(exp.profit);
      expect(p[price].served, price).toBe(exp.served);
    }
  });

  it('kho cạn thì mọi mức cùng served (bị chặn bởi tồn) — helper tôn trọng biên kho thật', () => {
    const level = 40;
    const p = quanPricePayoff(q({}), level, 3); // chỉ 3 ly
    expect(p.re.served).toBe(3);
    expect(p.vua.served).toBe(3);
    expect(p.cao.served).toBe(3);
  });

  it('thuần — cùng đầu vào cho ra cùng kết quả (không RNG/seed)', () => {
    const level = 45;
    const a = quanPricePayoff(q({ staff: 2, price: 'cao' }), level, units(level));
    const b = quanPricePayoff(q({ staff: 2, price: 'cao' }), level, units(level));
    expect(a).toEqual(b);
  });
});
