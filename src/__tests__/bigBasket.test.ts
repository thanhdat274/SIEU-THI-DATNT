import { describe, expect, it } from 'vitest';
import {
  BIG_BASKET_TIER, BIG_BASKET_SHARE, BIG_BASKET_MIN, BIG_BASKET_RANGE,
  bigBasketEligible, bigBasketChance, isBigBasket, bigBasketCount, bigBasketAbandons, bigBasketInsight,
} from '../data/bigBasket';
import { SHOP_TIERS } from '../data/shopTiers';

/** GĐ-B — Trục "Siêu thị hóa sâu": khách GIỎ LỚN gắn ngành "Khu tự chọn" (GĐ-A). THUẦN — không đổi state/save/kinh tế/seed. */

describe('bigBasket — khách giỏ lớn siêu thị', () => {
  it('ngành "Khu tự chọn" nằm ở bậc Mini mart (bậc 3)', () => {
    expect(BIG_BASKET_TIER).toBe(3);
    expect(SHOP_TIERS[3].name).toBe('Mini mart');
  });

  it('chưa đủ bậc / chưa đặt cartStation hoặc bigShelf → không có khách giỏ lớn', () => {
    expect(bigBasketEligible(2, true, true)).toBe(false);        // chưa đủ bậc
    expect(bigBasketEligible(3, false, true)).toBe(false);       // chưa xe đẩy
    expect(bigBasketEligible(3, true, false)).toBe(false);       // chưa kệ siêu thị
    expect(bigBasketChance(3, true, false)).toBe(0);
  });

  it('đủ bậc + đủ đồ → tỷ lệ giỏ lớn đúng hằng số đã cân bằng', () => {
    expect(bigBasketEligible(3, true, true)).toBe(true);
    expect(bigBasketChance(3, true, true)).toBe(BIG_BASKET_SHARE); // 0.15
    expect(bigBasketChance(4, true, true)).toBe(BIG_BASKET_SHARE);
  });

  it('isBigBasket quyết định đúng theo rng (0.15 là mốc)', () => {
    expect(isBigBasket(() => 0.149, 3, true, true)).toBe(true);
    expect(isBigBasket(() => 0.15, 3, true, true)).toBe(false);
    expect(isBigBasket(() => 0.0, 2, true, true)).toBe(false); // ngành chưa kích hoạt
  });

  it('giỏ lớn mua 5–8 món', () => {
    const sizes = Array.from({ length: 100 }, () => bigBasketCount(() => Math.random()));
    for (const n of sizes) {
      expect(n).toBeGreaterThanOrEqual(BIG_BASKET_MIN);
      expect(n).toBeLessThan(BIG_BASKET_MIN + BIG_BASKET_RANGE);
    }
  });

  it('bỏ cả giỏ khi lỡ ≥ 2 món, không bỏ khi chỉ lỡ 1', () => {
    expect(bigBasketAbandons(1)).toBe(false);
    expect(bigBasketAbandons(2)).toBe(true);
    expect(bigBasketAbandons(3)).toBe(true);
  });

  it('dòng soi: đã sẵn sàng → nói luật chơi; chưa đủ bậc → báo bậc; thiếu đồ → gợi đặt', () => {
    expect(bigBasketInsight(3, true, true).active).toBe(true);
    expect(bigBasketInsight(3, true, true).line).toContain('giỏ 5–8');
    expect(bigBasketInsight(2, true, true).line).toContain(`bậc ${BIG_BASKET_TIER}`);
    const missing = bigBasketInsight(3, false, false);
    expect(missing.active).toBe(false);
    expect(missing.line).toContain('Bãi xe đẩy');
    expect(missing.line).toContain('Kệ siêu thị');
  });

  it('THUẦN: cùng đầu vào ⇒ cùng kết quả', () => {
    expect(bigBasketInsight(4, true, true)).toEqual(bigBasketInsight(4, true, true));
    expect(bigBasketChance(3, true, true)).toEqual(bigBasketChance(3, true, true));
  });

  it('dòng soi ≤ 90 code point (Luật 9)', () => {
    for (const r of [bigBasketInsight(3, true, true), bigBasketInsight(2, true, true), bigBasketInsight(3, false, false)]) {
      if (r.line) expect([...r.line].length).toBeLessThanOrEqual(90);
    }
  });
});
