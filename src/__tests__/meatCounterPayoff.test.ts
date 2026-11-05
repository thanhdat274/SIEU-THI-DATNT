import { describe, expect, it } from 'vitest';
import {
  meatCounterPayoff, meatChainCooled, type MeatChainLot,
} from '../data/meatCounterPayoff';
import { shelfLife } from '../data/freshness';

/** GĐ-C — Trục "Siêu thị hóa sâu": CHUỖI LẠNH ngành "Khu thịt cá tươi" (kệ mát giảm hỏng nhanh). THUẦN — không đổi state/save/kinh tế/seed. */

const lifeMeat = shelfLife('thit_heo_tuoi'); // 2 ngày

describe('meatCounterPayoff — chuỗi lạnh quầy thịt cá', () => {
  it('nội thất giữ mát: quầy thịt cá / tủ mát / tủ đông / kho lạnh = mát; kệ thường / kho = ấm', () => {
    expect(meatChainCooled('meat_counter')).toBe(true);
    expect(meatChainCooled('fridge')).toBe(true);
    expect(meatChainCooled('freezer')).toBe(true);
    expect(meatChainCooled('coldStorage')).toBe(true);
    expect(meatChainCooled('shelf')).toBe(false);
    expect(meatChainCooled('storage')).toBe(false);
  });

  it('thịt để ngoài KỆ THƯỜNG (ấm) đêm nắng hỏng HẾT → payoff đúng số con × giá bán lẻ', () => {
    const lots: MeatChainLot[] = [{ productId: 'thit_heo_tuoi', qty: 10, life: lifeMeat, place: 'warm' }];
    const r = meatCounterPayoff(lots, 'sunny', false);
    expect(r.warmSpoilQty).toBe(10);
    expect(r.warmSpoilValue).toBe(10 * 130000); // sell = 130.000đ
    expect(r.line).toContain('~10 con');
  });

  it('cùng lô thịt nhưng để MÁT (quầy thịt cá) → không tính mất vì nóng', () => {
    const lots: MeatChainLot[] = [{ productId: 'thit_heo_tuoi', qty: 10, life: lifeMeat, place: 'chilled' }];
    const r = meatCounterPayoff(lots, 'sunny', true);
    expect(r.warmSpoilQty).toBe(0);
    expect(r.warmSpoilValue).toBe(0);
    expect(r.line).toBeNull();
  });

  it('hàng KHÔNG phải thịt/cá (rau tươi) để ấm → không gán cho Khu thịt cá', () => {
    const lots: MeatChainLot[] = [{ productId: 'rau', qty: 5, life: 3, place: 'warm' }];
    expect(meatCounterPayoff(lots, 'sunny', false).warmSpoilQty).toBe(0);
  });

  it('gộp nhiều lô thịt ấm: mỗi lô hết hạn đêm nay → cộng dồn con + trị giá', () => {
    const lots: MeatChainLot[] = [
      { productId: 'thit_heo_tuoi', qty: 4, life: lifeMeat, place: 'warm' },
      { productId: 'ca_ro_phi_tuoi', qty: 6, life: lifeMeat, place: 'warm' }, // sell 78.000đ
    ];
    const r = meatCounterPayoff(lots, 'cloudy', false);
    expect(r.warmSpoilQty).toBe(10);
    expect(r.warmSpoilValue).toBe(4 * 130000 + 6 * 78000);
  });

  it('hasCounter phân biệt thông điệp: chưa có quầy → gợi xây; đã có → gợi dọn sang mát', () => {
    const lots: MeatChainLot[] = [{ productId: 'thit_heo_tuoi', qty: 2, life: lifeMeat, place: 'warm' }];
    expect(meatCounterPayoff(lots, 'sunny', false).line).toContain('đặt quầy thịt cá bậc 3');
    expect(meatCounterPayoff(lots, 'sunny', true).line).toContain('dọn sang quầy thịt cá/tủ mát');
  });

  it('THUẦN: cùng đầu vào ⇒ cùng kết quả', () => {
    const lots: MeatChainLot[] = [{ productId: 'thit_heo_tuoi', qty: 3, life: lifeMeat, place: 'warm' }];
    expect(meatCounterPayoff(lots, 'rain', false)).toEqual(meatCounterPayoff(lots, 'rain', false));
  });

  it('dòng soi ≤ 90 code point khi có cảnh báo (Luật 9)', () => {
    const lots: MeatChainLot[] = [{ productId: 'cua_bien_tuoi', qty: 12, life: lifeMeat, place: 'warm' }]; // giá to nhất 380k
    for (const r of [meatCounterPayoff(lots, 'sunny', false), meatCounterPayoff(lots, 'sunny', true)]) {
      if (r.line) expect([...r.line].length).toBeLessThanOrEqual(90);
    }
  });
});
