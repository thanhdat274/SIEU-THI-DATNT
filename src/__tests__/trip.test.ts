import { describe, expect, it, beforeEach } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { haulerById, routeById, routeBuyPrice, routeDiscountFor } from '../data/routes';
import {
  beginTrip, cartBuyCost, tripArrived, tripLoadStock, tripLotLife, tripProgress, tripRemaining, tripRoadHours,
  routeStockFresh, routeStockKey, routeStockLeft, routeStockResolve, routeStockSpend, weekOfDay, checkCart,
  cartCases, cartSavings,
} from '../data/trip';
import { productById, caseSize } from '../data/products';

/**
 * Hệ 5-L2 — Chuyến đi tỉnh (SPEC-CHIEU-RONG §5.3/§5.10): startTrip + vắng mặt + xe về nhập kho.
 * Mọi tuyến/xe mở > 30 (Chợ huyện 42, Miệt vườn 44) → không đụng golden cấp 30: sim không bao giờ gọi
 * startTrip, và mọi nhánh về (tick/endDay) đều canh biz.trip trống.
 */

// ─────────────── THUẦN (src/data/trip.ts) ───────────────
const choHuyen = routeById('cho_huyen')!;
const mietVuon = routeById('miet_vuon')!;
const moto = haulerById('moto')!;

describe('beginTrip / thời gian', () => {
  it('returnAt = departAt + khứ hồi theo xe (Chợ huyện 3h xe máy)', () => {
    const t = beginTrip(choHuyen, moto, 12, 420, 'self', 200000, {});
    expect(t.routeId).toBe('cho_huyen');
    expect(t.day).toBe(12);
    expect(t.by).toBe('self');
    expect(t.returnAt).toBe(420 + 180); // 3h × 60
    expect(t.beat).toBe(0);
  });

  it('tripArrived / tripRemaining / tripProgress đúng mốc', () => {
    const t = beginTrip(choHuyen, moto, 1, 420, 'self', 0, {});
    expect(tripArrived(t, 420 + 179)).toBe(false);
    expect(tripArrived(t, 420 + 180)).toBe(true);
    expect(tripRemaining(t, 420)).toBe(180);
    expect(tripRemaining(t, 420 + 999)).toBe(0);
    expect(tripProgress(t, 420)).toBe(0);
    expect(tripProgress(t, 420 + 90)).toBe(0.5);
    expect(tripProgress(t, 420 + 180)).toBe(1);
  });

  it('tripRoadHours ≥ 1', () => {
    expect(tripRoadHours(beginTrip(choHuyen, moto, 1, 420, 'self', 0, {}))).toBe(3);
  });
});

describe('cartBuyCost (giá niêm yết của tuyến, đã rẻ hơn)', () => {
  it('hàng không có giảm giá → giá nhập chuẩn', () => {
    const t = beginTrip(choHuyen, moto, 1, 420, 'self', 1000000, { mi: 2 });
    expect(cartBuyCost(t, choHuyen)).toBe(productById('mi')!.buy * 2);
  });

  it('hàng tươi ở Chợ huyện → rẻ hơn 25% so với giá nhập chuẩn', () => {
    const rau = productById('rau')!;
    const t = beginTrip(choHuyen, moto, 1, 420, 'self', 1000000, { rau: 2 });
    // routeDiscountFor(cho_huyen, rau, 'fresh') = 0.25
    const p = routeBuyPrice(rau.buy, routeDiscountFor(choHuyen, 'rau', rau.category));
    expect(routeDiscountFor(choHuyen, 'rau', rau.category)).toBe(0.25);
    expect(p).toBeLessThan(rau.buy);
    expect(cartBuyCost(t, choHuyen)).toBe(p * 2);
  });
});

describe('tripLotLife / tripLoadStock (xe về nhập kho)', () => {
  it('không thùng đá: tươi/thịt mất hạn theo số giờ trên đường; khô không đổi', () => {
    const t = beginTrip(choHuyen, moto, 1, 420, 'self', 0, {});
    const rau = productById('rau')!; // fresh — hạn 3
    const mi = productById('mi')!;   // dry — hạn 45
    expect(tripLotLife(rau, t, false)).toBeLessThan(3);
    expect(tripLotLife(rau, t, false)).toBeGreaterThanOrEqual(1);
    expect(tripLotLife(mi, t, false)).toBe(45); // khô không đổi
  });

  it('có thùng đá: tươi giữ nguyên hạn', () => {
    const t = beginTrip(choHuyen, moto, 1, 420, 'self', 0, {});
    expect(tripLotLife(productById('rau')!, t, true)).toBe(3);
  });

  it('tripLoadStock: copy stock + thêm hàng trong giỏ, không sửa đầu vào', () => {
    const t = beginTrip(choHuyen, moto, 1, 420, 'self', 1000000, { mi: 2, rau: 3 });
    const s0 = { storage: { mi: 10 }, storageLots: {} };
    const out = tripLoadStock(t, s0, false);
    expect(out.storage.mi).toBe(12);
    expect(out.storage.rau).toBe(3);
    expect(s0.storage.mi).toBe(10); // không đụng stock gốc
    expect(tripLoadStock(t, s0, false).storage).not.toBe(s0.storage);
  });

  it('tripLoadStock trên tuyến lạ: trả copy không đổi', () => {
    const t = { ...beginTrip(choHuyen, moto, 1, 420, 'self', 0, { mi: 2 }), routeId: 'khong_co' };
    const s0 = { storage: { mi: 10 }, storageLots: {} };
    const out = tripLoadStock(t, s0, false);
    expect(out.storage.mi).toBe(10);
  });
});

// ─────────────── SLICE (src/core/slices/trip.ts) ───────────────
const prep = (level: number, minutes = 420) => {
  const toasts: string[] = [];
  useGame.setState({ ...newGameData(), level, minutes, notify: (m: string) => void toasts.push(m) });
  return toasts;
};

beforeEach(() => useGame.setState({ ...newGameData() }));

describe('startTrip — kiểm tra đầu vào (L2)', () => {
  it('tuyến chưa mở (cấp 40 < 42): chặn, không đụng golden cấp 30', () => {
    const toasts = prep(40);
    useGame.getState().startTrip('cho_huyen', 'self', 200000);
    expect(useGame.getState().biz.trip).toBeUndefined();
    expect(toasts.some((t) => t.includes('cấp'))).toBe(true);
  });

  it('tuyến lạ / bằng nhân viên / tiền ≤ 0: chặn với lý do', () => {
    for (const [routeId, by, cash, expectMsg] of [
      ['khong_co', 'self', 200000, 'tuyến'],
      ['cho_huyen', 5, 200000, 'thuê'],
      ['cho_huyen', 'self', 0, 'tiền'],
    ] as const) {
      const toasts = prep(50);
      useGame.getState().startTrip(routeId, by, cash);
      expect(useGame.getState().biz.trip).toBeUndefined();
      expect(toasts.some((t) => t.includes(expectMsg))).toBe(true);
    }
  });

  it('không đủ tiền vé/xăng hoặc mang vượt két: chặn', () => {
    const toasts = prep(50, 420);
    useGame.setState({ money: 1000 }); // < 45k xe máy
    useGame.getState().startTrip('cho_huyen', 'self', 1000);
    expect(useGame.getState().biz.trip).toBeUndefined();
    expect(toasts.some((t) => t.includes('vé/xăng'))).toBe(true);

    prep(50);
    useGame.setState({ money: 100000 });
    // mang 500k nhưng két chỉ 100k trừ vé → vượt
    useGame.getState().startTrip('cho_huyen', 'self', 500000);
    expect(useGame.getState().biz.trip).toBeUndefined();
  });
});

describe('startTrip — đi và về trọn vòng (cả hai chế độ dùng chung slice này)', () => {
  it('khởi hành: trừ vé/xăng, location vắng mặt, ghi biz.trip; về: hàng vào kho, về nhà', () => {
    const toasts = prep(50, 420);
    const money0 = useGame.getState().money;
    useGame.getState().startTrip('cho_huyen', 'self', 200000);
    const s1 = useGame.getState();
    // vé xe máy Chợ huyện = 180 phút × 15k/h = 45k
    expect(s1.money).toBe(money0 - 45000);
    expect(s1.location).toContain('tỉnh');
    expect(s1.biz.trip?.routeId).toBe('cho_huyen');
    expect(s1.biz.trip?.returnAt).toBe(420 + 180);
    expect(toasts.some((t) => t.includes('về lúc'))).toBe(true);

    // lập giỏ hàng chở về (L3: chỉ mua được hàng tuyến bán — rau, thịt heo ở Chợ huyện) rồi về tới giờ
    useGame.getState().tripSetCart({ rau: 3, thit_heo_tuoi: 2 });
    useGame.setState({ minutes: 420 + 180 });
    useGame.getState().tripArrive();
    const s2 = useGame.getState();
    expect(s2.biz.trip).toBeUndefined();
    expect(s2.location).toBe('Nhà của bạn');
    expect(s2.storage.rau).toBe(3);
    expect(s2.storage.thit_heo_tuoi).toBe(2);
  });

  it('chưa có chuyến: tripSetCart / tripArrive đều an toàn (no-op)', () => {
    const toasts = prep(50);
    useGame.getState().tripSetCart({ mi: 2 });
    useGame.getState().tripArrive();
    expect(useGame.getState().biz.trip).toBeUndefined();
    expect(toasts.some((t) => t.includes('chuyến') || t.includes('No chuyến'))).toBe(true);
  });

  it('đang có chuyến: không start chuyến thứ hai', () => {
    prep(50);
    useGame.getState().startTrip('cho_huyen', 'self', 200000);
    const toasts: string[] = [];
    useGame.setState({ notify: (m: string) => void toasts.push(m) });
    useGame.getState().startTrip('miet_vuon', 'self', 200000);
    expect(useGame.getState().biz.trip?.routeId).toBe('cho_huyen'); // giữ chuyến đầu
    expect(toasts.some((t) => t.toLowerCase().includes('đang có'))).toBe(true);
  });

  it('giỏ hàng vượt tiền mang theo: chặn', () => {
    prep(50);
    useGame.getState().startTrip('cho_huyen', 'self', 10000);
    const toasts: string[] = [];
    useGame.setState({ notify: (m: string) => void toasts.push(m) });
    useGame.getState().tripSetCart({ rau: 120 }); // trong hạn nguồn nhưng 120×7,5k = 900k > 10k
    expect(useGame.getState().biz.trip?.cart?.rau).toBeUndefined();
    expect(toasts.some((t) => t.includes('Vượt tiền'))).toBe(true);
  });

  it('tripArrive không đổi đường đi của "đi và về" ở mốc Miệt vườn (5h)', () => {
    prep(50, 360);
    useGame.setState({ money: 2_000_000 });
    useGame.getState().startTrip('miet_vuon', 'self', 500000);
    expect(useGame.getState().biz.trip?.returnAt).toBe(360 + 5 * 60); // 5h × 60 × 1,0
  });
});

// ─────────────── L3: weeklyCap (R7) + sức chở + chọn hàng ───────────────
const baGac = haulerById('ba_gac')!;

describe('routeStock (lượng nguồn tuần, R7)', () => {
  it('weekOfDay tính đúng mốc tuần (7 ngày)', () => {
    expect(weekOfDay(1)).toBe(1);
    expect(weekOfDay(7)).toBe(1);
    expect(weekOfDay(8)).toBe(2);
    expect(weekOfDay(21)).toBe(3);
  });

  it('routeStockFresh: hàng riêng theo productId + nhóm ngành theo cat:<cat>', () => {
    const st = routeStockFresh(1, choHuyen);
    expect(st.week).toBe(1);
    expect(st.left['rau']).toBe(120); // goods riêng
    expect(st.left['thit_heo_tuoi']).toBe(40);
    expect(st.left['cat:fresh']).toBe(80); // nhóm ngành còn lại
    expect(st.left['cat:meat']).toBe(60);
    const mv = routeStockFresh(1, mietVuon);
    expect(mv.left['rg_kho_tom']).toBe(12); // 5 đặc sản, mỗi loại 12
  });

  it('routeStockKey: hàng riêng của tuyến theo productId, còn lại theo ngành', () => {
    expect(routeStockKey(choHuyen, 'rau', 'fresh')).toBe('rau');
    expect(routeStockKey(choHuyen, 'mia', 'fresh')).toBe('cat:fresh'); // mia không có trong goods
    expect(routeStockKey(mietVuon, 'rg_kho_tom', 'dry')).toBe('rg_kho_tom');
  });

  it('routeStockResolve: giữ tuần đang chạy, đổ đầy khi sang tuần mới', () => {
    const st = routeStockFresh(1, choHuyen);
    const same = routeStockResolve({ cho_huyen: st }, choHuyen, 3);
    expect(same).toBe(st);
    const fresh = routeStockResolve({ cho_huyen: st }, choHuyen, 9); // tuần 2
    expect(fresh).not.toBe(st);
    expect(fresh.week).toBe(2);
    expect(fresh.left['rau']).toBe(120); // lại đầy
    expect(routeStockResolve(undefined, choHuyen, 1)).toBeDefined();
  });

  it('routeStockSpend: trừ lượng mua, kẹp ≥ 0, không đụng đầu vào', () => {
    const st = routeStockFresh(1, choHuyen);
    const out = routeStockSpend(st, choHuyen, { rau: 30, ca_loc_tuoi: 50 });
    expect(out.left['rau']).toBe(90);
    expect(out.left['ca_loc_tuoi']).toBe(0); // 40−50 → kẹp 0
    expect(st.left['rau']).toBe(120); // gốc không đổi
  });

  it('routeStockLeft đọc đúng khoá', () => {
    const st = routeStockFresh(1, choHuyen);
    expect(routeStockLeft(st, choHuyen, 'rau', 'fresh')).toBe(120);
    expect(routeStockLeft(st, choHuyen, 'mia', 'fresh')).toBe(80);
    expect(routeStockLeft(st, choHuyen, 'nuoc', 'drink')).toBe(0);
  });
});

describe('checkCart / cartCases / cartSavings (nhịp 2 — chọn hàng)', () => {
  const bigStock = () => {
    const st = routeStockFresh(1, choHuyen);
    st.left['rau'] = 100000;
    return st;
  };

  it('giỏ trong giới hạn (tiền + sức chở + nguồn) → ok', () => {
    const t = beginTrip(choHuyen, baGac, 1, 420, 'self', 10_000_000, { rau: 10, thit_heo_tuoi: 6 });
    expect(checkCart(t, choHuyen, baGac, bigStock()).ok).toBe(true);
  });

  it('vượt lượng còn ở nguồn → chặn (R7)', () => {
    const st = routeStockFresh(1, choHuyen); // rau còn 120
    const t = beginTrip(choHuyen, baGac, 1, 420, 'self', 10_000_000, { rau: 130 });
    const c = checkCart(t, choHuyen, baGac, st);
    expect(c.ok).toBe(false);
    expect(c.ok === false && c.reason.toLowerCase().includes('nguồn')).toBe(true);
  });

  it('vượt sức chở xe → chặn', () => {
    // xe máy 8 thùng; rau 10/thùng → 81 món = 9 thùng > 8
    const t = beginTrip(choHuyen, moto, 1, 420, 'self', 10_000_000, { rau: 81 });
    const c = checkCart(t, choHuyen, moto, bigStock());
    expect(c.ok).toBe(false);
    expect(c.ok === false && c.reason.includes('sức chở')).toBe(true);
  });

  it('vượt tiền mang theo → chặn', () => {
    const t = beginTrip(choHuyen, moto, 1, 420, 'self', 1000, { rau: 2 });
    const c = checkCart(t, choHuyen, moto, bigStock());
    expect(c.ok).toBe(false);
    expect(c.ok === false && c.reason.includes('Vượt tiền')).toBe(true);
  });

  it('cartCases = tổng thùng (casesFor)', () => {
    const rau = productById('rau')!;
    const size = caseSize(rau.id); // 10 món/thùng
    expect(cartCases({ rau: size })).toBe(1);
    expect(cartCases({ rau: size + 1 })).toBe(2);
    expect(cartCases({})).toBe(0);
  });

  it('cartSavings = chênh lệch giá nhập chuẩn − giá tuyến (đang lời bao nhiêu)', () => {
    const t = beginTrip(choHuyen, moto, 1, 420, 'self', 10_000_000, { rau: 10 });
    const rau = productById('rau')!;
    expect(cartSavings(t, choHuyen)).toBe(Math.round(rau.buy * 0.25) * 10);
  });
});

describe('L3 slice — weeklyCap vào chọn hàng & xe về trừ nguồn', () => {
  it('startTrip khởi tạo routeStock của tuyến cho tuần này', () => {
    prep(50, 420);
    useGame.getState().startTrip('cho_huyen', 'self', 300000);
    const rs = useGame.getState().biz.routeStock?.['cho_huyen'];
    expect(rs).toBeDefined();
    expect(rs!.left['rau']).toBe(120);
    expect(rs!.week).toBe(weekOfDay(useGame.getState().day));
  });

  it('tripSetCart chặn khi mua quá lượng nguồn tuần (R7)', () => {
    prep(50, 420);
    useGame.getState().startTrip('cho_huyen', 'self', 300000);
    const toasts: string[] = [];
    useGame.setState({ notify: (m: string) => void toasts.push(m) });
    useGame.getState().tripSetCart({ rau: 999 }); // > 120 ở nguồn
    expect(useGame.getState().biz.trip?.cart?.rau).toBeUndefined();
    expect(toasts.some((t) => t.toLowerCase().includes('nguồn') || t.toLowerCase().includes('rau'))).toBe(true);
  });

  it('chọn trong giới hạn rồi về: hàng vào kho VÀ trừ lượng nguồn tuần', () => {
    prep(50, 420);
    useGame.getState().startTrip('cho_huyen', 'self', 300000);
    useGame.getState().tripSetCart({ rau: 10 });
    useGame.setState({ minutes: 420 + 180 });
    useGame.getState().tripArrive();
    const s = useGame.getState();
    expect(s.storage.rau).toBe(10);
    expect(s.biz.routeStock?.['cho_huyen']?.left['rau']).toBe(110); // 120−10
  });
});
