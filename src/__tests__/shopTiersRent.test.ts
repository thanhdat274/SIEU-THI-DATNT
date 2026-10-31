import { describe, expect, it } from 'vitest';
import { SHOP_TIERS, rentDelta, rentOf, spaceUsePct } from '../data/shopTiers';
import type { FurnitureType } from '../data/furniture';

/** GĐ156 — tiền nhà theo bậc + % mặt bằng sử dụng: helper thuần đọc cho thẻ "Mở rộng tiệm". */

const item = (type: FurnitureType) => ({ type });

describe('rentOf — công thức tiền nhà khóa giá trị (không được đổi)', () => {
  it('rentOf(tier) = 20000 + tier² × 30000', () => {
    expect(rentOf(0)).toBe(20000);
    expect(rentOf(1)).toBe(50000);
    expect(rentOf(2)).toBe(140000);
    expect(rentOf(3)).toBe(290000);
    expect(rentOf(4)).toBe(500000);
    expect(rentOf(5)).toBe(770000);
    expect(rentOf(6)).toBe(1100000); // Đại siêu thị: 30 ngày ~ 33 triệu
  });

  it('tăng đơn điệu theo bậc — mở rộng thì tiền nhà luôn tăng vĩnh viễn', () => {
    for (let t = 1; t < SHOP_TIERS.length; t++) {
      expect(rentOf(t)).toBeGreaterThan(rentOf(t - 1));
    }
  });
});

describe('rentDelta — mức tăng tiền nhà khi mở rộng', () => {
  it('bằng đúng rentOf(to) − rentOf(from)', () => {
    expect(rentDelta(0, 1)).toBe(30000);
    expect(rentDelta(2, 3)).toBe(150000);
    expect(rentDelta(5, 6)).toBe(330000);
    expect(rentDelta(1, 4)).toBe(rentOf(4) - rentOf(1));
  });

  it('luôn dương khi tăng bậc; giữ nguyên bậc thì 0', () => {
    expect(rentDelta(4, 4)).toBe(0);
    for (let t = 0; t < SHOP_TIERS.length - 1; t++) {
      expect(rentDelta(t, t + 1)).toBeGreaterThan(0);
    }
  });
});

describe('spaceUsePct — % mặt bằng bị nội thất chiếm', () => {
  it('furniture rỗng → 0', () => {
    expect(spaceUsePct([], 0)).toBe(0);
    expect(spaceUsePct([], 3)).toBe(0);
  });

  it('tính theo rộng×sâu từng món / diện tích bậc, làm tròn số nguyên', () => {
    // Bậc 0: 8×5 = 40m². Kệ gỗ 1.8×0.5 = 0.9m² → 2.25% → 2%
    expect(spaceUsePct([item('shelf')], 0)).toBe(2);
    // Bậc 1: 10×6 = 60m². 5 tủ đông (1.6×0.8 = 1.28m²) = 6.4m² → ~10.67% → 11%
    expect(spaceUsePct(Array.from({ length: 5 }, () => item('freezer')), 1)).toBe(11);
    // Trộn món: 2 tủ đông (2.56) + chậu cây (0.5×0.5 = 0.25) = 2.81m² / 60 → ~4.68% → 5%
    expect(spaceUsePct([item('freezer'), item('freezer'), item('plant')], 1)).toBe(5);
  });

  it('cùng số món ở bậc to hơn → % giảm (mặt bằng mới rộng ra)', () => {
    const stuff = Array.from({ length: 10 }, () => item('shelf')); // 9m²
    const small = spaceUsePct(stuff, 2); // 12×8 = 96m² → ~9%
    const big = spaceUsePct(stuff, 3); // 15×10 = 150m² → 6%
    expect(small).toBeGreaterThan(big);
    expect(small).toBe(9);
    expect(big).toBe(6);
  });

  it('đồ chiếm quá diện tích bậc → báo thật >100% (không kẹp cận)', () => {
    // 40 kệ siêu thị (2.4×0.6 = 1.44m²) = 57.6m² ở bậc 0 (40m²) → 144%
    expect(spaceUsePct(Array.from({ length: 40 }, () => item('bigShelf')), 0)).toBe(144);
  });

  it('loại đồ lạ (không có định nghĩa) → cộng 0, không sập', () => {
    const ghost = 'ghost' as unknown as FurnitureType;
    expect(spaceUsePct([item(ghost)], 0)).toBe(0);
    expect(spaceUsePct([item(ghost), item('shelf')], 0)).toBe(2);
  });

  it('bậc không tồn tại (âm / vượt mảng) → 0, an toàn', () => {
    expect(spaceUsePct([item('shelf')], -1)).toBe(0);
    expect(spaceUsePct([item('shelf')], SHOP_TIERS.length)).toBe(0);
  });

  it('thuần đọc: hai lần cùng đầu vào cho kết quả giống hệt', () => {
    const stuff = [item('shelf'), item('fridge'), item('checkout')];
    expect(spaceUsePct(stuff, 2)).toBe(spaceUsePct(stuff, 2));
  });
});
