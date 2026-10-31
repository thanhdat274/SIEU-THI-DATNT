import { describe, it, expect } from 'vitest';
import { coldOverflow } from '../data/advice';

// GĐ134: "🧊 Tủ lạnh kho đầy" — định lượng hàng cần lạnh vượt khả năng giữ lạnh của tủ kho.
// THUẦN đọc storage + warehouseTier(i).cold — không đổi state/kinh tế.

describe('coldOverflow', () => {
  it('trả null khi kho trống/thiếu storage', () => {
    expect(coldOverflow(undefined, 0, 'sunny')).toBeNull();
    expect(coldOverflow({}, 0, 'sunny')).toBeNull();
  });

  it('trả null khi hàng cần lạnh chưa vượt khả năng giữ lạnh', () => {
    // Tủ kho cấp 0 giữ lạnh 40 món; chỉ 12 món cần lạnh — chưa tràn.
    const storage = { rau: 8, thit: 2, suachua: 2 }; // 12 món cần lạnh
    expect(coldOverflow(storage, 0, 'sunny')).toBeNull();
  });

  it('đếm đúng món cần lạnh, bỏ qua món không cần lạnh', () => {
    // 50 món cần lạnh + món khô (mi) không tính.
    const storage = { rau: 25, thit: 20, suachua: 5, mi: 99 };
    const o = coldOverflow(storage, 0, 'sunny')!;
    expect(o.coldQty).toBe(50);
    expect(o.capacity).toBe(40);
    expect(o.overflow).toBe(10);
    // items sắp theo số món giảm dần (rau 25 > thit 20), món khô không xuất hiện
    expect(o.items.map((i) => i.id)).toEqual(['rau', 'thit', 'suachua']);
  });

  it('items chỉ lấy top 3 món chiếm nhiều nhất', () => {
    // 4 món cần lạnh → chỉ lấy 3
    const storage = { rau: 30, thit: 25, suachua: 20, kem: 15 }; // 90 món
    const o = coldOverflow(storage, 0, 'sunny')!;
    expect(o.items).toHaveLength(3);
    expect(o.items[0].id).toBe('rau');
  });

  it('penalty = spoilRate ở chỗ storage (không lạnh) đúng theo thời tiết', () => {
    const storage = { rau: 45 }; // fresh, chỉ 1 món
    // sunny: fresh = 1.5×1.3 = 1.95
    expect(coldOverflow(storage, 0, 'sunny')!.items[0].penalty).toBeCloseTo(1.95);
    // cloudy: fresh = 1.5×1 = 1.5
    expect(coldOverflow(storage, 0, 'cloudy')!.items[0].penalty).toBeCloseTo(1.5);
    // frozen thit sunny = 3×1.2 = 3.6
    const s2 = { thit: 45 };
    expect(coldOverflow(s2, 0, 'sunny')!.items[0].penalty).toBeCloseTo(3.6);
  });

  it('nextCapacity = khả năng giữ lạnh bậc kho kế (null khi đã tối đa)', () => {
    const storage = { rau: 45 };
    // cấp 0 (cold 40) → bậc tiếp cấp 1 (cold 80)
    expect(coldOverflow(storage, 0, 'sunny')!.nextCapacity).toBe(80);
    // cấp cuối → không còn bậc tiếp
    const maxTier = 6; // WAREHOUSE_TIERS dài 7 (index 0..6)
    // gems: tạo tràn ở cấp cuối
    expect(coldOverflow({ rau: 100000 }, maxTier, 'sunny')!.nextCapacity).toBeNull();
  });

  it('bỏ qua món có qty ≤ 0', () => {
    const storage = { rau: 0, thit: -2, suachua: 45 };
    const o = coldOverflow(storage, 0, 'sunny')!;
    expect(o.coldQty).toBe(45);
    expect(o.items.map((i) => i.id)).toEqual(['suachua']);
  });
});
