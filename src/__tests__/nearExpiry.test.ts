import { describe, expect, it } from 'vitest';
import { nearExpiryItems } from '../data/freshness';

const lot = (life: number, qty = 1) => [{ qty, life }];

describe('nearExpiryItems (GĐ43) — cảnh báo lô cận hạn', () => {
  it('không có hàng → rỗng', () => {
    expect(nearExpiryItems({}, {}, [])).toEqual([]);
  });

  it('món trong kho cận hạn (life ≤ 2) → báo đúng place storage', () => {
    const items = nearExpiryItems({ rau: 4 }, { rau: lot(1, 4) }, []);
    expect(items).toEqual([{ id: 'rau', name: 'Rau củ', qty: 4, days: 1, place: 'storage' }]);
  });

  it('món kho không có lô (storageLots thiếu) → không báo (chưa có dữ liệu hạn)', () => {
    expect(nearExpiryItems({ rau: 4 }, {}, [])).toEqual([]);
  });

  it('món lâu hỏng (life cao) → không báo', () => {
    expect(nearExpiryItems({ gao: 5 }, { gao: lot(45, 5) }, [])).toEqual([]);
  });

  it('món trên kệ cận hạn → báo đúng place shelf', () => {
    const items = nearExpiryItems({}, {}, [{ productId: 'rau', count: 3, lots: lot(1, 3) }]);
    expect(items).toEqual([{ id: 'rau', name: 'Rau củ', qty: 3, days: 1, place: 'shelf' }]);
  });

  it('kệ count 0 → bỏ qua', () => {
    expect(nearExpiryItems({}, {}, [{ productId: 'rau', count: 0, lots: lot(1, 3) }])).toEqual([]);
  });

  it('life trên ngưỡng → không báo', () => {
    expect(nearExpiryItems({ rau: 4 }, { rau: lot(5, 4) }, [])).toEqual([]);
  });

  it('ngưỡng tùy chỉnh: life 2 chỉ báo khi threshold ≥ 2', () => {
    expect(nearExpiryItems({ rau: 2 }, { rau: lot(2, 2) }, [], 1)).toEqual([]);
    expect(nearExpiryItems({ rau: 2 }, { rau: lot(2, 2) }, [], 2).length).toBe(1);
  });

  it('sắp theo hạn ngắn trước, nhiều hàng trước', () => {
    const items = nearExpiryItems(
      { rau: 2, mi: 5 },
      { rau: lot(2, 2), mi: lot(1, 5) },
      [],
    );
    // mi hạn 1 phải đứng trước rau hạn 2
    expect(items.map((i) => i.id)).toEqual(['mi', 'rau']);
  });

  it('tối đa max món (default 5, tùy chỉnh 2)', () => {
    const lots: Record<string, { qty: number; life: number }[]> = {};
    const storage: Record<string, number> = {};
    const ids = ['rau', 'mi', 'banh', 'nuoc', 'trung', 'sua'];
    ids.forEach((id, i) => { storage[id] = i + 1; lots[id] = lot(1, i + 1); });
    expect(nearExpiryItems(storage, lots, []).length).toBe(5);
    expect(nearExpiryItems(storage, lots, [], 2, 2).length).toBe(2);
  });

  it('helper thuần: chạy 2 lần cùng đầu vào giống hệt', () => {
    const a = nearExpiryItems({ rau: 2 }, { rau: lot(1, 2) }, [{ productId: 'mi', count: 3, lots: lot(1, 3) }]);
    const b = nearExpiryItems({ rau: 2 }, { rau: lot(1, 2) }, [{ productId: 'mi', count: 3, lots: lot(1, 3) }]);
    expect(a).toEqual(b);
    expect(a.length).toBe(2);
  });
});
