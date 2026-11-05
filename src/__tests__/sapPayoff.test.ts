/**
 * GĐ1305 — test THUẦN cho `sapPayoff` (hoàn vốn sạp hàng rong: mở lô 5tr / nâng bậc 3tr-5tr).
 * Không đổi state/kinh tế/save; co-op an toàn (không import store). Tái dựng ĐÚNG sapRongIncome.
 */
import { describe, expect, it } from 'vitest';
import { sapPayoff } from '../data/sapPayoff';

describe('sapPayoff (GĐ1305) — hoàn vốn sạp hàng rong', () => {
  it('0 lô, nắng thường → lãi lô mới = base 300k, hoàn vốn 17 ngày', () => {
    const r = sapPayoff({ lots: 0, weather: 'sunny', day: 1 }); // Tổng hợp weekday ×1
    expect(r.canRent).toBe(true);
    expect(r.rentCost).toBe(5_000_000);
    expect(r.nextLotDaily).toBe(300_000);
    expect(r.rentPayback).toBe(17); // ceil(5e6/300k) = 17
    expect(r.up).toBeNull();
    expect(r.line).toContain('hoàn 17 ngày');
  });

  it('mưa → sạp nghỉ bán, KHÔNG bịa hoàn vốn (line null, payback null)', () => {
    const r = sapPayoff({ lots: 0, weather: 'rain', day: 1 });
    expect(r.nextLotDaily).toBe(0);
    expect(r.rentPayback).toBeNull();
    expect(r.line).toBeNull();
  });

  it('cuối tuần + nắng + món nước mía → lãi 585k (×1.3×1.5), hoàn vốn 9 ngày', () => {
    const r = sapPayoff({ lots: 0, weather: 'sunny', day: 6, kinds: ['nuocmia'] }); // weekend 1.3 × sunny 1.5
    expect(r.nextLotDaily).toBe(300_000 * 1.3 * 1.5); // 585000
    expect(r.rentPayback).toBe(9); // ceil(5e6/585k) = 9
    expect(r.line).toContain('hoàn 9 ngày');
  });

  it('đủ 4 lô bậc gánh → gợi nâng Xe đẩy (3tr): lãi thêm 120k/ngày, hoàn 25 ngày', () => {
    const r = sapPayoff({ lots: 4, weather: 'sunny', day: 1, tiers: [0, 0, 0, 0] });
    expect(r.canRent).toBe(false);
    expect(r.rentPayback).toBeNull();
    expect(r.up).not.toBeNull();
    expect(r.up!.name).toBe('Xe đẩy');
    expect(r.up!.cost).toBe(3_000_000);
    expect(r.up!.gainPerDay).toBe(120_000); // 300k×(1.4−1)
    expect(r.up!.payback).toBe(25); // ceil(3e6/120k)
    expect(r.line).toContain('hoàn 25 ngày');
  });

  it('đủ 4 lô đã max bậc (Quầy) → hết bậc nâng, line null (không ồn)', () => {
    const r = sapPayoff({ lots: 4, weather: 'sunny', day: 1, tiers: [2, 2, 2, 2] });
    expect(r.canRent).toBe(false);
    expect(r.up).toBeNull();
    expect(r.line).toBeNull();
  });

  it('còn lô trống thì ưu tiên gợi mở lô (không nói nâng dù cũng nâng được)', () => {
    const r = sapPayoff({ lots: 1, weather: 'sunny', day: 1, tiers: [0] });
    expect(r.canRent).toBe(true);
    expect(r.nextLotDaily).toBe(300_000);
    expect(r.up).toBeNull(); // rent chiếm ưu tiên dòng
    expect(r.line).toContain('Mở lô');
  });

  it('lô xôi + giá nhà làm (homeXoi) → lãi thêm 324k×(1.4−1), hoàn 24 ngày', () => {
    const r = sapPayoff({ lots: 4, weather: 'sunny', day: 2, kinds: ['xoi', 'xoi', 'xoi', 'xoi'], tiers: [0, 0, 0, 0], homeXoi: true });
    // xoi sunny 0.9 × weekday 1 = 270k × homeXoi 1.2 = 324k; nâng Xe đẩy +40% → 129600
    expect(r.up!.gainPerDay).toBe(129_600);
    expect(r.up!.payback).toBe(24); // ceil(3e6/129600) = 24
    expect(r.line).toContain('hoàn 24 ngày');
  });

  it('THUẦN deterministic — cùng input cho cùng kết quả', () => {
    const a = sapPayoff({ lots: 0, weather: 'sunny', day: 6, kinds: ['nuocmia'] });
    const b = sapPayoff({ lots: 0, weather: 'sunny', day: 6, kinds: ['nuocmia'] });
    expect(a).toEqual(b);
  });
});
