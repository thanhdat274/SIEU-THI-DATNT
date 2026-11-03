import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { updatePhones } from '../core/slices/orders';
import { CANCEL_AFTER_LATE, PHONE_SLOTS, type PhoneOrder } from '../data/phoneOrders';

/**
 * GĐ695 — phủ các nhánh đơn hàng chưa có test theo covlines GĐ693 (orders.ts):
 *  94-98  acceptOrder · 104-106 startCook khóa cấp · 138-141 startCook trừ hàng nhà trồng
 *  74-79  đơn đang mang đi bị huỷ vì trễ (updatePhones) · 261-263 nhập gấp gặp món nhà làm
 *  354-356 giao hợp đồng thiếu hàng
 */

const msgs = () => {
  const out: string[] = [];
  useGame.setState({ notify: (m: string) => out.push(m) });
  return out;
};

beforeEach(() => useGame.setState(newGameData()));

describe('orders: nhận đơn và nấu (GĐ695)', () => {
  it('acceptOrder: đánh dấu đã nhận + báo hạn giao', () => {
    useGame.setState({ order: { id: 'thoi_noi', accepted: false, dueDay: 9 } as never });
    const out = msgs();
    useGame.getState().acceptOrder();
    expect(useGame.getState().order?.accepted).toBe(true);
    expect(out.join(' ')).toContain('giao trước hết ngày 9');
  });

  it('startCook: món chưa mở cấp thì từ chối và báo cấp mở', () => {
    useGame.setState({ level: 20 }); // bánh mì trứng nướng mở ở cấp 38
    const out = msgs();
    expect(useGame.getState().startCook('recipe_banh_mi_trung')).toBe(false);
    expect(out.join(' ')).toContain('mở ở cấp 38');
  });

  it('startCook: nấu trừ kho VÀ trừ nhãn hàng nhà trồng (chống bán premium ảo)', () => {
    useGame.setState({
      level: 25,
      furniture: [{ id: 1, type: 'hot_kettle' } as never],
      storage: { tra: 2, nuoc: 10 },
      garden: { ...newGameData().garden, homegrown: { tra: 2 } },
      cookJobs: [],
    });
    const out = msgs();
    const ok = useGame.getState().startCook('recipe_tra_gung'); // trà 1 + nước 4
    const st = useGame.getState();
    expect(ok).toBe(true);
    expect(st.cookJobs).toHaveLength(1);
    expect(st.storage.tra).toBe(1);
    expect(st.storage.nuoc).toBe(6);
    // 2 trà nhà trồng, nấu dùng 1 → còn nhãn 1 (không bị xoá nhãn toàn bộ)
    expect(st.garden.homegrown.tra).toBe(1);
    expect(out.join(' ')).toContain('Đang nấu Trà gừng nóng');
  });

  // GĐ1050 — orders.ts nhánh CHẶN đơn giản: acceptOrder chưa có đơn (dòng 95 `if (!s.order) return;`)
  // và startCook món KHÔNG TỒN TẠI (dòng 102 `if (!r) return false`) — đỡ truy cập `s.order` rỗng / nấu món lạ.
  it('GĐ1050: acceptOrder khi chưa có đơn → không làm gì, không báo', () => {
    useGame.setState({ order: null });
    const out = msgs();
    useGame.getState().acceptOrder();
    expect(useGame.getState().order).toBeNull();
    expect(out).toEqual([]);
  });

  it('GĐ1050: startCook món không tồn tại → trả false, không báo', () => {
    const st = useGame.getState();
    expect(st.startCook('khong-co')).toBe(false);
    expect(st.cookJobs).toHaveLength(0);
  });
});

describe('orders: đơn điện thoại — huỷ vì trễ khi đang mang đi (GĐ695)', () => {
  it('carrying quá CANCEL_AFTER_LATE: hàng trả về kho đúng lô, đánh giá 2★, mất thân thiết, báo huỷ', () => {
    const o: PhoneOrder = {
      id: 7, houseId: 'nha_12', caller: 'Chị Hằng', regular: 'chi_lan', reason: 'test',
      items: { nuoc: 2 }, calledAt: 600, answerBy: 630, dueAt: 660, status: 'carrying',
      lots: { nuoc: [{ qty: 2, life: 180 }] },
    };
    useGame.setState({
      minutes: 660 + CANCEL_AFTER_LATE + 1,
      phoneSlot: PHONE_SLOTS.length, // bỏ qua vòng lọc khung giờ
      phoneOrders: [o],
      storage: { nuoc: 0 },
      regulars: { chi_lan: { friendship: 20, visits: 3, perks: [], discovered: [] } }, // khách quen đã có thân thiết
    });
    const beforeFriends = useGame.getState().regulars['chi_lan'].friendship as number;
    const out = msgs();
    updatePhones(useGame.setState, useGame.getState);
    const st = useGame.getState();
    expect(st.phoneOrders).toHaveLength(0);
    expect(st.storage.nuoc).toBe(2); // hàng mang về kho
    expect(out.join(' ')).toContain('huỷ đơn vì chờ quá lâu');
    // đánh giá 2★ (addReview ghi vào sổ reviews) + mất thân thiết
    expect(st.reviews.at(-1)?.stars).toBe(2);
    expect(st.regulars['chi_lan'].friendship).toBeLessThan(beforeFriends);
  });
});

describe('orders: nhập gấp & hợp đồng (GĐ695)', () => {
  it('rushDeliverOrder: đơn có món nhà làm mà kho không có → chặn, phải tự nấu', () => {
    useGame.setState({ order: { id: 'sn_trang', accepted: true, dueDay: 7 } as never }); // cần trà sữa + bánh mì trứng (nhà làm)
    const out = msgs();
    expect(useGame.getState().rushDeliverOrder()).toBe(false);
    expect(out.join(' ')).toContain('phải tự nấu');
  });

  it('deliverContract: kho thiếu hàng kỳ hạn thì báo thiếu và không giao', () => {
    useGame.setState({
      contracts: { quan_nhau: { defId: 'quan_nhau', dueDay: 8, delivered: 0, pending: true } },
      storage: {}, // cần bia 12, ngọt 10, nước 8, snack 10
    });
    const out = msgs();
    const before = useGame.getState().money;
    expect(useGame.getState().deliverContract('quan_nhau')).toBe(false);
    expect(out.join(' ')).toContain('Kho còn thiếu');
    expect(useGame.getState().money).toBe(before);
  });
});
