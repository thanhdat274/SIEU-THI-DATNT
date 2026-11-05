import { describe, expect, it } from 'vitest';
import { shelfBuyHint, storeMissRevenue, type MissLog } from '../data/advice';
import { productById } from '../data/products';

const rev = (log: MissLog, inStorage: Record<string, number>) =>
  storeMissRevenue(log, inStorage);

describe('shelfBuyHint', () => {
  it('lỡ mà kho còn hàng → kind shelf: mua kệ giúp thật, line có số lượt + lãi bỏ lỡ + món', () => {
    const mi = productById('mi');
    const log = { 'stock:mi': 4 };
    const hint = shelfBuyHint(rev(log, { mi: 5 }))!;
    expect(hint.kind).toBe('shelf');
    expect(hint.count).toBe(4);
    expect(hint.loss).toBe((mi.sell - mi.buy) * 4);
    expect(hint.top).toBe(mi.name);
    expect(hint.line).toContain('4 lượt khách');
    expect(hint.line).toContain(`lãi bỏ lỡ ~${((mi.sell - mi.buy) * 4).toLocaleString('vi-VN')}đ`);
    expect(hint.line).toContain(mi.name);
  });

  it('lỡ mà kho cũng hết hết → kind order: đừng mua kệ, nhập hàng trước', () => {
    const log = { 'stock:trung': 2 };
    const hint = shelfBuyHint(rev(log, { trung: 0 }))!;
    expect(hint.kind).toBe('order');
    expect(hint.top).toBeNull();
    expect(hint.line).toContain('KHO hết hàng');
    expect(hint.line).toContain('Nhập hàng trước');
  });

  it('trộn hai lý do → kind shelf chỉ đếm phần KHO CÒN hàng (trung thực, không gộp)', () => {
    const mi = productById('mi');
    const trung = productById('trung');
    const log = { 'stock:mi': 4, 'stock:trung': 2 };
    const hint = shelfBuyHint(rev(log, { mi: 5, trung: 0 }))!;
    expect(hint.kind).toBe('shelf');
    expect(hint.count).toBe(4); // chỉ mi còn kho; trung kho hết → không tính vào kệ
    expect(hint.loss).toBe((mi.sell - mi.buy) * 4);
    expect(hint.line).not.toContain(trung.name);
  });

  it('không có món nào bỏ lỡ → không ồn (null)', () => {
    expect(shelfBuyHint(null)).toBeNull();
    expect(shelfBuyHint(rev({}, {}))).toBeNull();
  });

  it('thuần: hai lần gọi trên cùng dữ liệu cho kết quả như nhau', () => {
    const log = { 'stock:mi': 3 };
    const r = rev(log, { mi: 2 });
    expect(shelfBuyHint(r)).toEqual(shelfBuyHint(r));
  });
});
