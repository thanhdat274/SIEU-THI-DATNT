// GĐ1009 — bảo vệ quản lý tự nhập hàng (`managerNeedToRestock`, tách khỏi StaffManager.restock,
// trước đây 0% coverage): quyết định MÓN NÀO đang bày cần đặt thêm khi kho sắp cạn. Hàm thuần,
// chỉ dùng dữ liệu + hằng (MANAGER_LOW_STOCK / MANAGER_TARGET) nên test không cần THREE/đi bộ.
import { describe, it, expect } from 'vitest';
import { managerNeedToRestock } from '../agents/staff';
import { MANAGER_LOW_STOCK, MANAGER_TARGET } from '../data/staff';

// Một món đã bán qua, số đang có dưới ngưỡng → đặt đủ cho đủ MANAGER_TARGET.
const sold = { sales: { mi: 3 }, salesToday: {}, storage: { mi: 2 }, pending: {} };
const base = { shelved: ['mi'], storage: sold.storage, pending: sold.pending, sales: sold.sales, salesToday: sold.salesToday };

describe('managerNeedToRestock — quản lý tự nhập hàng khi kho sắp cạn', () => {
  it('món đã bán, còn ít hơn ngưỡng → cần đặt đủ cho đủ target (min đúng ngưỡng)', () => {
    const need = managerNeedToRestock(base);
    // storage=2 < LOW_STOCK=6 → đặt TARGET − 2
    expect(need).toEqual({ mi: MANAGER_TARGET - 2 });
  });

  it('ra món VỪA ĐỦ ngưỡng trở lên → không cần đặt (bờ đúng, không âm)', () => {
    const at = managerNeedToRestock({ ...base, storage: { mi: MANAGER_LOW_STOCK } });
    expect(at).toEqual({});
    const plenty = managerNeedToRestock({ ...base, storage: { mi: MANAGER_TARGET + 10 } });
    expect(plenty).toEqual({});
    // ngưỡng − 1 → vẫn cần đặt (test bờ)
    const below = managerNeedToRestock({ ...base, storage: { mi: MANAGER_LOW_STOCK - 1 } });
    expect(below).toEqual({ mi: MANAGER_TARGET - (MANAGER_LOW_STOCK - 1) });
  });

  it('hàng đang về (pending) tính vào số đang có → không đặt trùng', () => {
    // storage=0 + pending=10 → có 10 ≥ ngưỡng → không cần đặt
    const covered = managerNeedToRestock({ ...base, storage: {}, pending: { mi: 10 } });
    expect(covered).toEqual({});
    // storage=2 + pending=3 → có 5 < ngưỡng → vẫn cần đặt 24−5
    const short = managerNeedToRestock({ ...base, storage: { mi: 2 }, pending: { mi: 3 } });
    expect(short).toEqual({ mi: MANAGER_TARGET - 5 });
  });

  it('món chưa bán qua lần nào → KHÔNG tự đặt (chủ tự nhập thử món mới)', () => {
    const never = managerNeedToRestock({ ...base, sales: {}, salesToday: {} });
    expect(never).toEqual({});
  });

  it('món chỉ bán hôm nay (salesToday) vẫn tính là đã bán → đặt bù', () => {
    const today = managerNeedToRestock({ ...base, sales: {}, salesToday: { mi: 5 } });
    expect(today).toEqual({ mi: MANAGER_TARGET - 2 });
  });

  it('chỉ xét những món đang bày (shelved); bỏ qua món có trong kho nhưng không bày', () => {
    // 'gao' có trong storage + đã bán, nhưng không bày → không liệt kê
    const out = managerNeedToRestock({
      shelved: ['mi'],
      storage: { mi: 1, gao: 1 },
      pending: {},
      sales: { mi: 3, gao: 9 },
      salesToday: {},
    });
    expect(out).toEqual({ mi: MANAGER_TARGET - 1 });
  });

  it('không có món nào cần → trả map rỗng (quản lý không phải mua)', () => {
    expect(managerNeedToRestock({ shelved: [], storage: {}, pending: {}, sales: {}, salesToday: {} })).toEqual({});
  });

  it('cạnh: nhiều món thiếu khác nhau → tính từng món theo số đang có riêng', () => {
    const need = managerNeedToRestock({
      shelved: ['mi', 'nuoc', 'banh'],
      storage: { mi: 1, nuoc: 3, banh: MANAGER_LOW_STOCK },
      pending: {},
      sales: { mi: 9, nuoc: 9, banh: 9 },
      salesToday: {},
    });
    // mi thiếu (1<6) → đặt 23; nuoc thiếu → đặt 21; banh vừa đủ ngưỡng → không đặt
    expect(need).toEqual({ mi: MANAGER_TARGET - 1, nuoc: MANAGER_TARGET - 3 });
  });
});
