import { describe, expect, it, beforeEach } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { haulerById, routeById, routeBuyPrice, routeDiscountFor } from '../data/routes';
import {
  beginTrip, cartBuyCost, cartBuyCostDiscounted, tripArrived, tripLoadStock, tripLotLife, tripProgress, tripRemaining, tripRoadHours,
  routeStockFresh, routeStockKey, routeStockLeft, routeStockResolve, routeStockSpend, weekOfDay, checkCart,
  cartCases, cartSavings, routeRelTier, routeCapBonus, debtOverdue, TRIP_DEBT_DUE_DAYS, TRIP_DEBT_PCT,
  courierAutoHaggle, courierSafeOption, courierOnTrip,
  tripPayoff, payoffRefCart, TRIP_REF_CASES, PAYOFF_SELF_HAGGLE,
} from '../data/trip';
import { haggleFloor, haggleOffer, haggleDiscount, HAGGLE_MAX_ROUNDS } from '../data/haggle';
import { roadEventDraw, ROAD_EVENTS, type RoadCtx } from '../data/roadEvents';
import { tripCtx } from '../core/slices/trip';
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
      ['cho_huyen', 5, 200000, 'giao hàng'],
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
    expect(mv.left['tom_kho']).toBe(12); // 5 đặc sản, mỗi loại 12
  });

  it('routeStockKey: hàng riêng của tuyến theo productId, còn lại theo ngành', () => {
    expect(routeStockKey(choHuyen, 'rau', 'fresh')).toBe('rau');
    expect(routeStockKey(choHuyen, 'mia', 'fresh')).toBe('cat:fresh'); // mia không có trong goods
    expect(routeStockKey(mietVuon, 'tom_kho', 'dry')).toBe('tom_kho');
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

describe('L4 slice — mặc cả (Nhịp 3)', () => {
  it('sàn mặc cả TẤT ĐỊNH: cùng seed + day + routeId → cùng floor (đổi seed khác floor)', () => {
    const r = routeById('cho_huyen')!;
    const f1 = haggleFloor(r, 12345, 10, 0, 1);
    const f2 = haggleFloor(r, 12345, 10, 0, 1);
    const f3 = haggleFloor(r, 99999, 10, 0, 1);
    expect(f2).toBe(f1);
    expect(f3).not.toBe(f1);
    expect(f1).toBeGreaterThanOrEqual(0.02);
    expect(f1).toBeLessThanOrEqual(0.12);
  });

  it('mối quen tại nguồn hạ sàn 1%/bậc (mặc cả sâu hơn)', () => {
    const r = routeById('cho_huyen')!;
    const floor0 = haggleFloor(r, 12345, 10, 0, 1);
    const floor3 = haggleFloor(r, 12345, 10, 3, 1);
    expect(floor3 - floor0).toBeCloseTo(0.03, 8);
  });

  it('phật ý: sàn cao hơn 3%', () => {
    const r = routeById('cho_huyen')!;
    const normal = haggleFloor(r, 12345, 10, 0, 1);
    const angry = haggleFloor(r, 12345, 10, 0, 1, 0, true);
    expect(angry - normal).toBeCloseTo(0.03, 8);
  });

  it('haggleOffer: trả ≥ sàn thì gật và chốt; trả < sàn thì lắc, mất lượt', () => {
    const r = routeById('cho_huyen')!;
    const floor = haggleFloor(r, 12345, 10, 0, 1); // ~ [0.02, 0.12]
    const accept = haggleOffer(undefined, Math.max(0, floor - 0.001), floor);
    expect(accept.accepted).toBe(true);
    const reject = haggleOffer(undefined, 0.13 > floor ? 0.13 : floor + 0.05, floor);
    expect(reject.accepted).toBe(false);
    expect(reject.round).toBe(1);
  });

  it('ép quá tay 3 lần liền → grudge (phật ý)', () => {
    const r = routeById('cho_huyen')!;
    const floor = 0.05;
    expect(haggleOffer(undefined, 0.05 + 0.09, floor).grudge).toBe(false); // 1 lần
    const rep1 = haggleOffer(undefined, 0.05 + 0.09, floor);
    const rep2 = haggleOffer({ round: rep1.round, best: 0, anger: rep1.anger }, 0.05 + 0.09, floor);
    const rep3 = haggleOffer({ round: rep2.round, best: 0, anger: rep2.anger }, 0.05 + 0.09, floor);
    expect(rep3.grudge).toBe(true);
    expect(rep3.anger).toBe(0); // reset sau khi phật ý
  });

  it('tripHaggle: chốt giá đúng offer → xe về trả tiền theo giá giảm + ghi mối ruột', () => {
    prep(50, 420);
    useGame.setState({ money: 2_000_000 });
    useGame.getState().startTrip('cho_huyen', 'self', 500000);
    useGame.getState().tripSetCart({ rau: 10 });
    const money0 = useGame.getState().money;
    // Trả 1% → luôn ≤ sàn (sàn ≥ 2%) → gật, chốt giảm 1%.
    useGame.getState().tripHaggle(0.01);
    const t = useGame.getState().biz.trip!;
    expect(haggleDiscount(t.haggle)).toBe(0.01);
    useGame.setState({ minutes: 420 + 180 });
    useGame.getState().tripArrive();
    const s = useGame.getState();
    const listed = cartBuyCost(t, routeById('cho_huyen')!);
    const disc = haggleDiscount(t.haggle);
    expect(s.money).toBe(money0 - Math.round(listed * (1 - disc))); // đã trả tiền hàng
    expect(s.storage.rau).toBe(10);
    expect(s.biz.supplierRel?.['route:cho_huyen']?.orders).toBe(1); // mối ruột ghi doanh mua
  });

  it('tripHaggle: ép quá tay đủ lần → routeGrudge 2 tuần', () => {
    prep(50, 420);
    useGame.setState({ money: 2_000_000, weatherSeed: 42, day: 1 }); // sàn rất thấp (0.024) → offer 0.16 ép quá tay
    useGame.getState().startTrip('cho_huyen', 'self', 500000);
    useGame.getState().tripSetCart({ rau: 10 });
    // Trả mức cực cao liên tục (đều dưới sàn >8%) → phật ý ngay lượt 3
    for (let i = 0; i < 3; i++) useGame.getState().tripHaggle(0.16);
    const g = useGame.getState().biz.routeGrudge;
    expect(g?.routeId).toBe('cho_huyen');
    const w = weekOfDay(useGame.getState().day);
    expect(g!.untilWeek).toBe(w + 1); // hoạt động tuần này + tuần sau = 2 tuần phạt
  });

  it('tripAcceptPrice: bỏ qua mặc cả, không phạt — về mua giá niêm yết', () => {
    prep(50, 420);
    useGame.setState({ money: 2_000_000 });
    useGame.getState().startTrip('cho_huyen', 'self', 500000);
    useGame.getState().tripSetCart({ rau: 10 });
    useGame.getState().tripAcceptPrice();
    expect(haggleDiscount(useGame.getState().biz.trip!.haggle)).toBe(0);
    expect(useGame.getState().biz.trip!.haggle!.round).toBe(0);
  });
});

describe('L5 — chuyện dọc đường (Nhịp 1 & 4)', () => {
  const ctx: RoadCtx = { weather: 'sunny', festival: false, hasFriend: false, loadPct: 0, hasCargo: false, hasDryCargo: false };

  it('roadEventDraw TẤT ĐỊNH: cùng seed+day+routeId+beat+ctx → cùng chuyện, đổi seed khác', () => {
    const c: RoadCtx = { ...ctx, weather: 'rain' };
    const a = roadEventDraw(123, 10, 'cho_huyen', 1, c);
    const b = roadEventDraw(123, 10, 'cho_huyen', 1, c);
    const d = roadEventDraw(888, 10, 'cho_huyen', 1, c);
    expect(b?.id).toBe(a?.id);
    expect(d?.id).not.toBe(a?.id);
    expect(['thung_lop', 'mua_lon']).toContain(a?.id); // pool nhịp 1 (trời mưa): chỉ 2 chuyện
  });

  it('nhịp 1 gồm 5 chuyện chung; nhịp 4 thêm 2 chuyện gắn hàng → 8 chuyện', () => {
    const full: RoadCtx = { ...ctx, weather: 'rain', festival: true, hasFriend: true, loadPct: 1, hasCargo: true, hasDryCargo: true };
    expect([...new Set(ROAD_EVENTS.map((e) => e.id))].length).toBe(7);
    const beat1 = new Set(roadEventPoolIds(1, full));
    expect(beat1.has('thung_lop')).toBe(true);
    expect(beat1.has('mua_khong_phu_bat')).toBe(false); // gắn hàng chỉ xuất hiện lúc về
    expect(beat1.has('nguoi_hoi_mua')).toBe(false);
    const beat4 = new Set(roadEventPoolIds(4, full));
    expect(beat4.has('mua_khong_phu_bat')).toBe(true);
    expect(beat4.has('nguoi_hoi_mua')).toBe(true);
  });

  it('điều kiện xuất hiện: trời nắng thì không có chuyện mưa', () => {
    const c: RoadCtx = { ...ctx, weather: 'sunny' };
    const pool = ROAD_EVENTS.filter((e) => e.when?.(c) ?? true);
    expect(pool.some((e) => e.id === 'mua_lon')).toBe(false);
  });

  it('tripChoose áp dụng hiệu ứng: chậm giờ + số tiền + cờ đã xử lý (đúng nhịp rút được)', () => {
    prep(50, 420);
    useGame.setState({ weather: 'rain', money: 2_000_000 });
    useGame.getState().startTrip('cho_huyen', 'self', 300000);
    const t = useGame.getState().biz.trip!;
    const hauler = haulerById(t.hauler);
    const myCtx = tripCtx({ weather: 'rain', regulars: useGame.getState().regulars }, t, hauler?.cases ?? 0);
    const evt = roadEventDraw(useGame.getState().weatherSeed, t.day, t.routeId, 1, myCtx);
    expect(evt).not.toBeNull();
    const opt = evt!.options[0];
    const money0 = useGame.getState().money;
    useGame.getState().tripChoose(evt!.id, 0);
    const t2 = useGame.getState().biz.trip!;
    expect(t2.flags).toContain(evt!.id);
    expect(t2.returnAt).toBe(t.returnAt + opt.minutes);
    expect(t2.delayMin).toBe(opt.minutes);
    if (opt.cost) expect(useGame.getState().money).toBe(money0 - opt.cost);
  });

  it('chọn "chạy tiếp khi mưa" (wet) làm hạn hàng khô rụt mất 2 ngày khi nhập kho', () => {
    const t = beginTrip(choHuyen, moto, 1, 420, 'self', 10_000_000, { rg_kho_tom: 1 });
    const dry = productById('rg_kho_tom')!;
    const wet = tripLotLife(dry, { ...t, flags: ['wet'] }, false);
    const dryL = tripLotLife(dry, t, false);
    expect(wet).toBe(Math.max(1, dryL - 2));
  });
});

function roadEventPoolIds(beat: 1 | 4, ctx: RoadCtx): string[] {
  const set = new Set<string>();
  for (let seed = 0; seed < 200; seed++) {
    const e = roadEventDraw(seed, 1, 'cho_huyen', beat, ctx);
    if (e) set.add(e.id);
  }
  return [...set];
}

describe('L6 slice — mua xe chở hàng & thùng đá', () => {
  it('buyHauler: mua ba gác → trừ tiền, đặt biz.hauler', () => {
    prep(50);
    useGame.setState({ money: 50_000_000 });
    useGame.getState().buyHauler('ba_gac');
    expect(useGame.getState().biz.hauler).toBe('ba_gac');
    expect(useGame.getState().money).toBe(50_000_000 - 18_000_000);
  });

  it('buyHauler: không đủ tiền / cùng xe / chưa mở → chặn, không đổi', () => {
    prep(50);
    useGame.setState({ money: 500_000 }); // < 18M ba gác
    const toasts: string[] = [];
    useGame.setState({ notify: (m: string) => void toasts.push(m) });
    useGame.getState().buyHauler('ba_gac');
    expect(useGame.getState().biz.hauler).toBeUndefined();
    expect(toasts.some((t) => t.toLowerCase().includes('đủ tiền'))).toBe(true);
    // xe tải mở cấp 55 — cấp 50 chặn
    useGame.setState({ money: 100_000_000 });
    useGame.getState().buyHauler('xe_tai');
    expect(useGame.getState().biz.hauler).toBeUndefined();
    // xe máy (giá 0) là xe mặc định khi chưa mua xe chở hàng — mua về miễn phí thì đổi sang nó
    useGame.getState().buyHauler('moto');
    expect(useGame.getState().biz.hauler).toBe('moto');
  });

  it('buyCoolBox: trừ tiền, set coolBox; mua lại / thiếu tiền → chặn', () => {
    prep(50);
    useGame.setState({ money: 10_000_000 });
    useGame.getState().buyCoolBox();
    expect(useGame.getState().biz.coolBox).toBe(true);
    expect(useGame.getState().money).toBe(10_000_000 - 4_000_000);
    const toasts: string[] = [];
    useGame.setState({ notify: (m: string) => void toasts.push(m) });
    useGame.getState().buyCoolBox(); // đã có
    expect(toasts.some((t) => t.toLowerCase().includes('đã có'))).toBe(true);
    expect(useGame.getState().money).toBe(10_000_000 - 4_000_000);
  });

  it('Miệt vườn: 5 đặc sản Nam đều là hàng có THẬT trong games (không crash khi chở về)', () => {
    const v = routeById('miet_vuon')!;
    for (const g of v.goods) {
      const p = productById(g.productId);
      expect(p, `thiếu productById('${g.productId}')`).toBeDefined();
      expect(p!.unlock).toBeLessThanOrEqual(50); // người đi cấp 50 mua được
    }
  });
});

describe('L7 — mối ruột tại nguồn (SPEC §5.7)', () => {
  const choTrung = routeById('cho_trung')!;
  const NEM = 'rg_nem_chua'; // Chợ miền Trung, 32%, buy 40000 → giá tuyến 27200

  it('bậc mối quen theo doanh mua: 0/1/2/3 đúng mốc + weeklyCap +10%/bậc', () => {
    expect(routeRelTier(undefined)).toBe(0);
    expect(routeRelTier({ spent: 2_999_999 })).toBe(0);
    expect(routeRelTier({ spent: 3_000_000 })).toBe(1);
    expect(routeRelTier({ spent: 30_000_000 })).toBe(3);
    expect(routeCapBonus(3)).toBe(1.3);
    expect(routeCapBonus(0)).toBe(1);
  });

  it('nguồn tuần mới dày hơn theo bậc (weeklyCap +10%/bậc, làm tròn xuống)', () => {
    const st0 = routeStockResolve(undefined, choTrung, 1, 0);
    const st3 = routeStockResolve(undefined, choTrung, 1, 3);
    expect(st0.left['rg_me_xung']).toBe(12);
    expect(st3.left['rg_me_xung']).toBe(15); // 12 × 1.3 = 15.6 → 15
  });

  it('debtOverdue: hạn 7 ngày, quá hạn từ ngày 8', () => {
    expect(debtOverdue({ dueDay: 7 }, 7)).toBe(false);
    expect(debtOverdue({ dueDay: 7 }, 8)).toBe(true);
  });

  it('checkCart: quá tiền mang theo bị chặn; có debtLimit (mối ruột b3+) thì quá cash được phép tối đa limit', () => {
    const t = beginTrip(choTrung, haulerById('moto')!, 1, 420, 'self', 100_000, { [NEM]: 4 });
    const stock = routeStockFresh(1, choTrung);
    expect(cartBuyCost(t, choTrung)).toBeGreaterThan(100_000); // 4×27200 = 108.800 > cash
    expect(checkCart(t, choTrung, haulerById('moto')!, stock).ok).toBe(false); // không mối ruột
    expect(checkCart(t, choTrung, haulerById('moto')!, stock, Math.floor(100_000 * TRIP_DEBT_PCT)).ok).toBe(true);
  });

  it('slice: bậc 3+ chốt giỏ quá cash, xe về ghi nợ đúng khoản quá cash; trả nợ hết', () => {
    const toasts = prep(50);
    useGame.setState({ money: 500_000, biz: { ...useGame.getState().biz, supplierRel: { 'route:cho_trung': { spent: 30_000_000, orders: 1 } } } });
    useGame.getState().startTrip('cho_trung', 'self', 100_000);
    expect(useGame.getState().biz.trip).toBeDefined();
    useGame.getState().tripSetCart({ [NEM]: 4 }); // 108.800 > 100k cash, tier 3 cho ghi nợ
    expect(Object.keys(useGame.getState().biz.trip!.cart).length).toBe(1);
    // về
    const money0 = useGame.getState().money; // sau travel 90k
    useGame.setState({ minutes: useGame.getState().biz.trip!.returnAt });
    useGame.getState().tripArrive();
    const s = useGame.getState();
    const d = s.biz.routeDebt!;
    expect(d.routeId).toBe('cho_trung');
    expect(d.amount).toBe(108_800 - 100_000); // 8.800 nợ
    expect(d.dueDay).toBe(s.day + TRIP_DEBT_DUE_DAYS);
    expect(s.money).toBe(money0 - 100_000); // chỉ trả phần trong cash
    expect(toasts.some((t) => t.includes('nợ'))).toBe(true);
    // trả nợ
    useGame.getState().tripRepayDebt();
    const s2 = useGame.getState();
    expect(s2.biz.routeDebt).toBeUndefined();
    expect(s2.money).toBe(s.money - 8_800);
  });

  it('slice: bậc dưới 3 không được ghi nợ (giỏ quá cash bị chặn)', () => {
    const toasts = prep(50);
    useGame.setState({ money: 500_000, biz: { ...useGame.getState().biz, supplierRel: { 'route:cho_trung': { spent: 10_000_000, orders: 1 } } } });
    useGame.getState().startTrip('cho_trung', 'self', 100_000);
    useGame.getState().tripSetCart({ [NEM]: 4 }); // 108.800 > 100k, bậc 2 → chặn
    expect(Object.keys(useGame.getState().biz.trip!.cart).length).toBe(0);
    expect(toasts.some((t) => t.includes('Vượt tiền'))).toBe(true);
  });

  it('slice: nợ quá hạn rồi trả → người bán giận (sàn mặc cả cao hơn); trả trong hạn thì giữ ưu đãi', () => {
    prep(50);
    useGame.setState({
      money: 500_000,
      day: 1,
      biz: { ...useGame.getState().biz, supplierRel: { 'route:cho_trung': { spent: 30_000_000, orders: 1 } } },
    });
    useGame.getState().startTrip('cho_trung', 'self', 100_000);
    useGame.getState().tripSetCart({ [NEM]: 4 });
    useGame.setState({ minutes: useGame.getState().biz.trip!.returnAt });
    useGame.getState().tripArrive();
    expect(useGame.getState().biz.routeDebt?.amount).toBe(8_800);
    // quá hạn: hạn day 8, để day 9 rồi trả
    useGame.setState({ day: 9 });
    useGame.getState().tripRepayDebt();
    const s = useGame.getState();
    expect(s.biz.routeDebt).toBeUndefined();
    expect(s.biz.routeGrudge?.routeId).toBe('cho_trung');
  });
});

describe('L8 — sai người giao hàng đi thay (SPEC §5.8)', () => {
  const tn = routeById('tay_nguyen')!;
  const courier = { id: 901, name: 'Bang', role: 'courier' as const, skill: 5, wage: 25000, shift: 'morning' as const };
  const putCourier = () => useGame.setState({ staff: [courier] });

  it('courierAutoHaggle: từ 4★ giảm nửa mức tối đa (6%), dưới 4★ không', () => {
    expect(courierAutoHaggle(3)).toBe(0);
    expect(courierAutoHaggle(4)).toBe(0.06);
    expect(courierAutoHaggle(5)).toBe(0.06);
  });

  it('courierSafeOption: ưu tiên phương án thuần chậm nhất (an toàn); không có thì chậm nhất', () => {
    const e = ROAD_EVENTS.find((x) => x.options.some((o) => !o.cost && !o.wet && !o.friend && !o.sell))!;
    const i = courierSafeOption(e);
    const o = e.options[i];
    // phương án được chọn phải là phương án thuần chậm (chỉ tốn thời gian) và là chậm nhất trong loại đó
    expect(o.cost || o.wet || o.friend || o.sell).toBeFalsy();
    for (const op of e.options) if (!(op.cost || op.wet || op.friend || op.sell)) expect(o.minutes).toBeGreaterThanOrEqual(op.minutes);
  });

  it('slice: sai người giao đi — lập sẵn giỏ, không có xe chở hàng thì chặn', () => {
    const toasts = prep(54); putCourier();
    useGame.setState({ money: 50_000_000 });
    // chưa có xe chở hàng (biểu hauler = moto/thiếu) → chặn
    useGame.getState().startTrip('tay_nguyen', 901, 200_000, { rg_kho_bo: 2 });
    expect(useGame.getState().biz.trip).toBeUndefined();
    expect(toasts.some((t) => t.includes('xe chở hàng'))).toBe(true);
  });

  it('slice: có xe ba gác + courier 5★ — gửi đi đúng: by là id, mặc cả tự động 6%, chủ Ở LẠI tiệm', () => {
    const toasts = prep(54); putCourier();
    useGame.setState({ money: 50_000_000, biz: { ...useGame.getState().biz, hauler: 'ba_gac' } });
    useGame.getState().startTrip('tay_nguyen', 901, 200_000, { rg_kho_bo: 2, rg_mac_khen: 1 });
    const s = useGame.getState();
    expect(s.biz.trip).toBeDefined();
    expect(s.biz.trip!.by).toBe(901);
    expect(s.biz.trip!.haggle?.best).toBe(0.06); // skill 5 → tự mặc cả
    expect(s.location).toBe('Nhà của bạn');        // chủ không vắng
    expect(s.biz.trip!.cart['rg_kho_bo']).toBe(2);
    expect(toasts.some((t) => t.includes('Bang'))).toBe(true);
  });

  it('slice: courier không sửa giỏ / chọn chuyện giữa chừng', () => {
    prep(54); putCourier();
    useGame.setState({ money: 50_000_000, biz: { ...useGame.getState().biz, hauler: 'ba_gac' } });
    useGame.getState().startTrip('tay_nguyen', 901, 200_000, { rg_kho_bo: 1 });
    const evtId = useGame.getState().biz.trip!.flags[0];
    const cart0 = { ...useGame.getState().biz.trip!.cart };
    useGame.getState().tripSetCart({ rg_kho_bo: 5 });
    expect(useGame.getState().biz.trip!.cart).toEqual(cart0); // không đổi
    useGame.getState().tripChoose(evtId, 0);
    expect(useGame.getState().biz.trip!.cart).toEqual(cart0); // không đổi
  });

  it('slice: người giao về — hàng vào kho, trừ tiền (có chiết khấu tự động), chủ vẫn ở nhà', () => {
    prep(54); putCourier();
    useGame.setState({ money: 50_000_000, biz: { ...useGame.getState().biz, hauler: 'ba_gac' } });
    useGame.getState().startTrip('tay_nguyen', 901, 200_000, { rg_kho_bo: 2 }); // 2×40300=80.600
    const t = useGame.getState().biz.trip!;
    const money0 = useGame.getState().money;
    useGame.setState({ minutes: t.returnAt });
    useGame.getState().tripArrive();
    const s = useGame.getState();
    expect(s.biz.trip).toBeUndefined();
    expect(s.storage.rg_kho_bo).toBe(2); // hàng vào kho
    expect(s.location).toBe('Nhà của bạn'); // chủ không về "từ tuyến" (vẫn ở nhà)
    // trả tiền theo giá niêm yết trừ mặc cả tự động 6%: 80.600 × 0.94 = 75.764
    expect(s.money).toBe(money0 - Math.round(80_600 * (1 - 0.06)));
  });

  it('slice: chưa lập sẵn giỏ (rỗng) thì không gửi người giao', () => {
    const toasts = prep(54); putCourier();
    useGame.setState({ money: 50_000_000, biz: { ...useGame.getState().biz, hauler: 'ba_gac' } });
    useGame.getState().startTrip('tay_nguyen', 901, 200_000, {});
    expect(useGame.getState().biz.trip).toBeUndefined();
    expect(toasts.some((t) => t.includes('giỏ hàng'))).toBe(true);
  });
});

describe('L8 — tripPayoff: so tự đi / sai người / mua mối lái (SPEC §5.8)', () => {
  it('giỏ tham chiếu là một chuyến ba gác đầy (≤ 30 thùng), mỗi món ≤ weeklyCap', () => {
    for (const id of ['cho_huyen', 'miet_vuon', 'lang_nghe_bac', 'cho_trung', 'tay_nguyen']) {
      const route = routeById(id)!;
      const { cart, cases } = payoffRefCart(route);
      expect(cases).toBeLessThanOrEqual(TRIP_REF_CASES);
      expect(cartCases(cart)).toBe(cases);
      for (const [pid, q] of Object.entries(cart)) {
        // mỗi món không quá weeklyCap của tuyến
        const g = route.goods.find((x) => x.productId === pid);
        expect(q).toBeLessThanOrEqual(g?.weeklyCap ?? 0);
      }
    }
  });

  it('mua ở mối lái luôn đắt hơn tự đi (chiết khấu tuyến + mặc cả)', () => {
    for (const id of ['miet_vuon', 'lang_nghe_bac', 'cho_trung', 'tay_nguyen']) {
      const route = routeById(id)!;
      const p = tripPayoff(route);
      const middleman = p.rows.find((r) => r.id === 'middleman')!;
      const self = p.rows.find((r) => r.id === 'self')!;
      expect(middleman.cost).toBeGreaterThan(self.cost);
      expect(self.savings).toBeGreaterThan(0);
      // tự đi = niêm yết tuyến × (1 − sàn mặc cả đại diện)
      let listing = 0;
      for (const [pid, qty] of Object.entries(p.cart)) {
        const pd = productById(pid)!;
        listing += routeBuyPrice(pd.buy, routeDiscountFor(route, pid, pd.category)) * qty;
      }
      expect(self.cost).toBe(Math.round(listing * (1 - PAYOFF_SELF_HAGGLE)));
    }
  });

  it('sai người = giá niêm yết (không mặc cả) + cước công — đắt hơn tự đi đúng phần mặc cả', () => {
    for (const id of ['miet_vuon', 'lang_nghe_bac', 'cho_trung', 'tay_nguyen']) {
      const route = routeById(id)!;
      const p = tripPayoff(route);
      const middleman = p.rows.find((r) => r.id === 'middleman')!;
      const self = p.rows.find((r) => r.id === 'self')!;
      const courier = p.rows.find((r) => r.id === 'courier')!;
      // cước công cố định 30.000 mỗi chuyến
      let listing = 0;
      for (const [pid, qty] of Object.entries(p.cart)) {
        const pd = productById(pid)!;
        listing += routeBuyPrice(pd.buy, routeDiscountFor(route, pid, pd.category)) * qty;
      }
      expect(courier.cost).toBe(listing + 30_000);
      expect(courier.savings).toBe(middleman.cost - courier.cost);
      // sai người không mặc cả → đắt hơn tự đi đúng phần giảm 6% (plus cước công)
      expect(courier.cost - self.cost).toBe(Math.round(listing * PAYOFF_SELF_HAGGLE) + 30_000);
      expect(courier.cost).toBeGreaterThan(self.cost);
    }
  });

  it('thẻ sắp xếp rẻ nhất lên đầu; best là kênh rẻ nhất', () => {
    for (const id of ['miet_vuon', 'lang_nghe_bac', 'cho_trung', 'tay_nguyen']) {
      const p = tripPayoff(routeById(id)!);
      expect(p.best).toBe(p.rows[0].id);
      for (let i = 1; i < p.rows.length; i++) {
        expect(p.rows[i].cost).toBeGreaterThanOrEqual(p.rows[i - 1].cost);
      }
    }
  });
});

// ─────────────────── §5.6 + §5.8 — cổng thời tiết & courier đi tỉnh ───────────────────
describe('§5.6 — ngày GIÔNG BÃO không cho xuất phát', () => {
  it('startTrip bị chặn khi thời tiết storm (cả tự đi lẫn sai người)', () => {
    prep(54);
    useGame.setState({ weather: 'storm', money: 50_000_000, staff: [{ id: 901, name: 'Bang', role: 'courier' as const, skill: 5, wage: 25000, shift: 'morning' as const }], biz: { ...useGame.getState().biz, hauler: 'ba_gac' } });
    useGame.getState().startTrip('tay_nguyen', 'self', 500_000);
    expect(useGame.getState().biz.trip).toBeUndefined();
    useGame.getState().startTrip('tay_nguyen', 901, 500_000, { rg_kho_bo: 1 });
    expect(useGame.getState().biz.trip).toBeUndefined();
  });

  it('mưa (rain) vẫn cho xuất phát', () => {
    prep(54);
    useGame.setState({ weather: 'rain', money: 50_000_000 });
    useGame.getState().startTrip('cho_huyen', 'self', 200_000);
    expect(useGame.getState().biz.trip).toBeDefined();
  });
});

describe('§5.8 — courier đang đi tỉnh thì không tính là rảnh', () => {
  it('courierOnTrip: đúng khi by = id courier; sai khi by = self hoặc không có chuyến', () => {
    const base = { routeId: 'tay_nguyen', day: 1, departAt: 420, returnAt: 900, cash: 0, cart: {}, beat: 0 as const, hauler: 'moto' as const, delayMin: 0, flags: [] as string[] };
    expect(courierOnTrip({ ...base, by: 901 }, 901)).toBe(true);
    expect(courierOnTrip({ ...base, by: 901 }, 902)).toBe(false);
    expect(courierOnTrip({ ...base, by: 'self' }, 901)).toBe(false);
    expect(courierOnTrip(undefined, 901)).toBe(false);
  });

  it('freeCouriers/đơn điện thoại: có courier duy nhất đang đi tỉnh → không còn ai rảnh', () => {
    // Mô phỏng đúng điều kiện: state có 1 courier, người đó đang là chủ của biz.trip (by = id, hauler ba_gac)
    prep(54);
    useGame.setState({ money: 50_000_000, staff: [{ id: 901, name: 'Bang', role: 'courier' as const, skill: 5, wage: 25000, shift: 'morning' as const }], biz: { ...useGame.getState().biz, hauler: 'ba_gac' } });
    useGame.getState().startTrip('tay_nguyen', 901, 200_000, { rg_kho_bo: 1 });
    const trip = useGame.getState().biz.trip!;
    expect(useGame.getState().biz.trip!.by).toBe(901);
    expect(courierOnTrip(trip, 901)).toBe(true);

    // App: không còn freeCourier để chở đơn (online.ts lọc qua courierOnTrip)
    // Kiểm gián tiếp qua helper thuần đã đúng; đảm bảo courierOnTrip là nguồn mà online/orders dùng.
    const couriers = [901];
    const stillFree = couriers.filter((id) => !courierOnTrip(trip, id));
    expect(stillFree).toEqual([]);
  });
});
