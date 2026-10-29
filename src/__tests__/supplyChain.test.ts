import { describe, expect, it } from 'vitest';
import {
  supplyChainOverview,
  supplyRestockManifest,
  supplyNetworkOrderVisible,
  storageTotal,
  teahouseKhoDays,
  branchThinShelves,
  SUPPLY_BRANCH_WARN,
  SUPPLY_BRANCH_DANGER,
} from '../data/supplyChain';
import { quanNuocProjection, quanNuocDrinkIds, type QuanNuocState } from '../data/quanNuoc';
import { shelfTotal, CONVENIENCE } from '../data/branches';

/**
 * GĐ199 — "Rốn kho chung": thẻ Sổ đầu ngày nối các điểm bán về kho chung, liệt kê điểm cạn/nghẽn.
 * Helper THUẦN gộp nguồn chân lý có sẵn (quanNuocRestockTip GĐ190 cho quán nước, shelf cho chi nhánh,
 * storage cho kho chung) — test soi từng nhánh với fixture cố định, không hardcode đối chiếu sim dài.
 */
describe('GĐ199 — Rốn kho chung', () => {
  const quanFull = (open = true): QuanNuocState => ({ open, staff: 2, price: 'vua' });
  const drinkStock = (units: number) => {
    const s: Record<string, number> = {};
    for (const id of quanNuocDrinkIds(30)) s[id] = units;
    return s;
  };

  it('quán nước đóng → idle, không tính vào mạng lưới', () => {
    const sc = supplyChainOverview({}, { open: true, shelf: { mi: 800 } }, quanFull(false), 30, null);
    const t = sc.outlets.find((o) => o.id === 'teahouse')!;
    expect(t.state).toBe('idle');
    expect(t.line).toContain('chưa mở');
  });

  it('quán nước đủ đồ uống (kho đầy, hôm qua không thiếu) → ok', () => {
    const sc = supplyChainOverview(drinkStock(500), { open: true, shelf: { mi: 800 } }, quanFull(true), 30, { served: 40, wanted: 40 });
    const t = sc.outlets.find((o) => o.id === 'teahouse')!;
    expect(t.state).toBe('ok');
  });

  it('quán nước thiếu hôm qua (missedRevenue>0) → danger dù kho đầy', () => {
    const sc = supplyChainOverview(drinkStock(500), { open: true, shelf: { mi: 800 } }, quanFull(true), 30, { served: 0, wanted: 60 });
    const t = sc.outlets.find((o) => o.id === 'teahouse')!;
    expect(t.state).toBe('danger');
    expect(t.line).toContain('thiếu');
  });

  it('quán nước sắp cạn kho chung (không thiếu hôm qua nhưng hôm nay không đủ) → warn', () => {
    // staff>0, kho ít ly → driesMain đúng, last không short
    const sc = supplyChainOverview(drinkStock(1), { open: true, shelf: { mi: 800 } }, quanFull(true), 30, { served: 40, wanted: 40 });
    const t = sc.outlets.find((o) => o.id === 'teahouse')!;
    expect(t.state).toBe('warn');
    expect(t.line).toContain('cạn');
  });

  it('chi nhánh state theo độ đầy kệ (danger<15% · warn<35% · còn lại ok)', () => {
    const check = (units: number, expected: 'ok' | 'warn' | 'danger') => {
      const sc = supplyChainOverview({}, { open: true, shelf: { mi: units } }, quanFull(false), 30, null);
      const b = sc.outlets.find((o) => o.id === 'branch')!;
      expect(b.state).toBe(expected);
    };
    check(800, 'ok');                            // 89% ≥ 35%
    check(Math.round(CONVENIENCE.shelfCap * SUPPLY_BRANCH_WARN / 2), 'warn'); // 17% < 35%
    check(Math.round(CONVENIENCE.shelfCap * SUPPLY_BRANCH_DANGER / 2), 'danger'); // 7% < 15%
  });

  it('chi nhánh đóng → idle', () => {
    const sc = supplyChainOverview({}, undefined, quanFull(false), 30, null);
    const b = sc.outlets.find((o) => o.id === 'branch')!;
    expect(b.state).toBe('idle');
  });

  it('kho chung trống → danger ở main; có hàng → ok; storageTotal đếm đúng', () => {
    expect(storageTotal({})).toBe(0);
    expect(storageTotal({ mi: 3, tra: 4 })).toBe(7);
    const empty = supplyChainOverview({}, undefined, quanFull(false), 30, null).outlets.find((o) => o.id === 'main')!;
    expect(empty.state).toBe('danger');
    const full = supplyChainOverview({ mi: 5 }, undefined, quanFull(false), 30, null).outlets.find((o) => o.id === 'main')!;
    expect(full.state).toBe('ok');
  });

  it('choke = điểm danger ưu tiên trước, rồi warn (đúng thứ tự nguy hiểm)', () => {
    // branch danger + teahouse warn → choke là branch (danger trước warn)
    const sc = supplyChainOverview(drinkStock(1), { open: true, shelf: { mi: 5 } }, quanFull(true), 30, { served: 40, wanted: 40 });
    const t = sc.outlets.find((o) => o.id === 'teahouse')!;
    const b = sc.outlets.find((o) => o.id === 'branch')!;
    expect(t.state).toBe('warn');
    expect(b.state).toBe('danger');
    expect(sc.choke).toBe(b);
    // không có gì nguy hiểm → choke null
    const ok = supplyChainOverview(drinkStock(500), { open: true, shelf: { mi: 800 } }, quanFull(true), 30, { served: 40, wanted: 40 });
    expect(ok.choke).toBeNull();
  });

  it('có đủ 3 điểm bán trong thẻ, đúng thứ tự main → teahouse → branch', () => {
    const sc = supplyChainOverview(new Array(5).fill(0).reduce((o, _, i) => ({ ...o, [`m${i}`]: 1 }), {}), { open: true, shelf: {} }, quanFull(false), 30, null);
    expect(sc.outlets.map((o) => o.id)).toEqual(['main', 'teahouse', 'branch']);
  });
});

/**
 * GĐ200 — "Kho chung nuôi quán nước mấy ngày": chân trời thời gian cho rốn kho (GĐ199). THUẦN, đối
 * chiếu đúng chân lý dự phóng quanNuocProjection (wanted/đêm) — không hardcode.
 */
describe('GĐ200 — kho chung nuôi quán nước mấy ngày', () => {
  const quanFull = (open = true): QuanNuocState => ({ open, staff: 2, price: 'vua' });
  const drinkStock = (units: number) => {
    const s: Record<string, number> = {};
    for (const id of quanNuocDrinkIds(30)) s[id] = units;
    return s;
  };

  it('quán đóng → null (không tiêu kho)', () => {
    expect(teahouseKhoDays({ open: false, staff: 0, price: 'vua' as const }, 30, {})).toBeNull();
  });

  it('ngày = floor(đơn vị đồ uống trong kho / nhu cầu wanted mỗi đêm)', () => {
    const q = quanFull(true);
    const storage = drinkStock(120);
    const units = quanNuocDrinkIds(30).reduce((n, id) => n + (storage[id] ?? 0), 0);
    const wanted = quanNuocProjection(q, 30, units).wanted;
    expect(teahouseKhoDays(q, 30, storage)).toBe(Math.floor(units / wanted));
  });

  it('càng ít hàng càng ít ngày (kho mỏng → cần nạp sớm), cùng q/level', () => {
    const q = quanFull(true);
    const dFull = teahouseKhoDays(q, 30, drinkStock(300))!;
    const dThin = teahouseKhoDays(q, 30, drinkStock(30))!;
    expect(dThin).toBeGreaterThan(0);
    expect(dThin).toBeLessThan(dFull);
  });

  it('quán đang đủ (tip null) thì dòng ok gồm chân trời ngày', () => {
    const sc = supplyChainOverview(drinkStock(500), { open: true, shelf: { mi: 800 } }, quanFull(true), 30, { served: 40, wanted: 40 });
    const t = sc.outlets.find((o) => o.id === 'teahouse')!;
    expect(t.state).toBe('ok');
    expect(t.line).toMatch(/nuôi ~\d+ ngày/);
  });
});

/**
 * GĐ201 — "Nạp đúng thứ cho chi nhánh": liệt kê kệ trống nhiều nhất (headroom = perItem − đang có) làm
 * gợi ý chở loại gì từ kho chung. THUẦN theo shelf — deterministic, không hardcode nhu cầu sim.
 */
describe('GĐ201 — kệ trống chi nhánh', () => {
  it('branch undefined → rỗng (chưa mở không có gợi ý)', () => {
    expect(branchThinShelves(undefined)).toEqual([]);
  });

  it('kệ đầy (headroom = 0) → không đề xuất; chọn theo headroom giảm dần, bỏ qua headroom 0', () => {
    expect(branchThinShelves({ shelf: { aa: CONVENIENCE.perItem } }, 3)).toEqual([]);
    const got = branchThinShelves({ shelf: { aa: 5, bb: 1, cc: 0, dd: 40 } }, 3);
    // headroom: cc=40, bb=39, aa=35, dd=0(bỏ) → chọn cc,bb,aa
    expect(got.map((t) => t.id)).toEqual(['cc', 'bb', 'aa']);
    expect(got[0].empty).toBe(CONVENIENCE.perItem);
  });

  it('giới hạn n món, thứ tự đúng (bỏ trống nhiều lên trước)', () => {
    const got = branchThinShelves({ shelf: { a: 1, b: 2, c: 39, d: 38 } }, 2);
    expect(got.map((t) => t.id)).toEqual(['a', 'b']); // headroom 39,38
  });

  it('kệ cạn (warn) thì dòng chi nhánh có liệt kê "trống: ..."', () => {
    const shelf: Record<string, number> = {};
    for (let i = 0; i < 6; i++) shelf[`m${i}`] = 25; // tổng 150 → 16.7% (warn), mỗi món headroom 15
    const sc = supplyChainOverview({}, { open: true, shelf }, { open: false, staff: 0, price: 'vua' as const }, 30, null);
    const b = sc.outlets.find((o) => o.id === 'branch')!;
    expect(b.state).toBe('warn');
    expect(b.line).toMatch(/trống:/);
  });
});

/**
 * GĐ202 — "Phiếu nạp kho": biến gợi ý (GĐ199–201) thành danh sách đơn vị cụ thể cần chở từ kho chung /
 * nhập thêm cho từng điểm bán. THUẦN, deterministic — không đổi sim/save.
 */
describe('GĐ202 — phiếu nạp kho', () => {
  const quanFull = (open = true): QuanNuocState => ({ open, staff: 2, price: 'vua' });
  const drinkStock = (units: number) => {
    const s: Record<string, number> = {};
    for (const id of quanNuocDrinkIds(30)) s[id] = units;
    return s;
  };

  it('chi nhánh kệ trống, kho chung đủ → chở từ kho, buyNeed = 0', () => {
    const rm = supplyRestockManifest({ mi: 60 }, { open: true, shelf: { mi: 0 } }, quanFull(false), 30, null);
    const b = rm.lines.find((l) => l.outlet === 'branch')!;
    expect(b.need).toBe(CONVENIENCE.perItem); // headroom 40
    expect(b.inWarehouse).toBe(60);
    expect(b.source).toBe('warehouse');
    expect(rm.warehouseCover).toBe(CONVENIENCE.perItem);
    expect(rm.buyNeed).toBe(0);
    expect(rm.total).toBe(CONVENIENCE.perItem);
    expect(rm.line).toMatch(/chở \d+ từ kho chung/);
  });

  it('chi nhánh kệ trống, kho chung hụt → phần hụt nhập thêm (buy)', () => {
    const rm = supplyRestockManifest({ mi: 10 }, { open: true, shelf: { mi: 0 } }, quanFull(false), 30, null);
    const b = rm.lines.find((l) => l.outlet === 'branch')!;
    expect(b.need).toBe(CONVENIENCE.perItem);
    expect(b.source).toBe('buy');
    expect(rm.warehouseCover).toBe(10);
    expect(rm.buyNeed).toBe(CONVENIENCE.perItem - 10);
  });

  it('quán nước thiếu đồ uống → toàn bộ shortfall là nhập thêm (kho chung đã tính trong have)', () => {
    // drinkStock(1): 76 món × 1 = 76 ly < wanted 89 (cấp 30, 2 NV, giá vừa) → driesMain, shortfall>0
    const storage = drinkStock(1);
    const rm = supplyRestockManifest(storage, undefined, quanFull(true), 30, { served: 0, wanted: 0 });
    const t = rm.lines.find((l) => l.outlet === 'teahouse');
    expect(t).toBeTruthy();
    expect(t!.source).toBe('buy');
    expect(t!.inWarehouse).toBe(76);
    expect(t!.need).toBeGreaterThan(0);
    expect(rm.buyNeed).toBe(t!.need);
    expect(rm.total).toBe(t!.need);
    expect(rm.warehouseCover).toBe(0);
    expect(rm.line).toMatch(/nhập thêm/);
  });

  it('cả mạng lưới đủ → không có dòng, tổng 0, dòng "không cần nạp"', () => {
    const storage = { ...drinkStock(500), mi: 40 };
    const rm = supplyRestockManifest(storage, { open: true, shelf: { mi: CONVENIENCE.perItem } }, quanFull(true), 30, { served: 40, wanted: 40 });
    expect(rm.total).toBe(0);
    expect(rm.lines).toEqual([]);
    expect(rm.line).toMatch(/không cần nạp/);
  });
});

/**
 * GĐ204 — "Nạp liền mạng lưới" ở màn Nhập hàng: chỉ hiện thẻ rốn kho chung khi còn nhu cầu NGOÀI phần
 * quán nước đã có thẻ riêng (GĐ191) — chi nhánh thiếu kệ hoặc cần chở từ kho chung, để khỏi lặp.
 */
describe('GĐ204 — thấy cả mạng lưới ở OrderPanel', () => {
  const quanFull = (open = true): QuanNuocState => ({ open, staff: 2, price: 'vua' });
  const drinkStock = (units: number) => {
    const s: Record<string, number> = {};
    for (const id of quanNuocDrinkIds(30)) s[id] = units;
    return s;
  };

  it('chỉ quán nước thiếu (kho chung cũng không gánh) → KHÔNG hiện thẻ mạng lưới (đã có thẻ quán nước)', () => {
    const rm = supplyRestockManifest(drinkStock(1), undefined, quanFull(true), 30, { served: 0, wanted: 0 });
    // lines chỉ có teahouse, warehouseCover = 0
    expect(rm.lines.every((l) => l.outlet === 'teahouse')).toBe(true);
    expect(rm.warehouseCover).toBe(0);
    expect(supplyNetworkOrderVisible(rm)).toBe(false);
  });

  it('chi nhánh thiếu kệ → hiện thẻ mạng lưới', () => {
    const rm = supplyRestockManifest({ mi: 60 }, { open: true, shelf: { mi: 0 } }, quanFull(false), 30, null);
    expect(rm.lines.some((l) => l.outlet === 'branch')).toBe(true);
    expect(supplyNetworkOrderVisible(rm)).toBe(true);
  });

  it('kho chung cần chở (warehouseCover>0) → hiện thẻ mạng lưới', () => {
    const rm = supplyRestockManifest({ mi: 20 }, { open: true, shelf: { mi: 0 } }, quanFull(false), 30, null);
    expect(rm.warehouseCover).toBe(20);
    expect(supplyNetworkOrderVisible(rm)).toBe(true);
  });

  it('cả mạng lưới đủ → không hiện', () => {
    const rm = supplyRestockManifest({ ...drinkStock(500), mi: 40 }, { open: true, shelf: { mi: CONVENIENCE.perItem } }, quanFull(true), 30, { served: 40, wanted: 40 });
    expect(supplyNetworkOrderVisible(rm)).toBe(false);
  });
});
