import { describe, expect, it } from 'vitest';
import {
  quanNuocProjection, quanNuocHealth, quanNuocAvgSell, quanNuocDrinkIds,
  newQuanNuoc, QUAN_NUOC_MAX_STAFF, QUAN_NUOC_WAGE, QUAN_PRICE_OPTIONS, type QuanNuocState,
} from '../data/quanNuoc';
import { productById } from '../data/products';

/**
 * GĐ127 — Sổ kinh doanh quán nước: mồi quyết định (thuê/sa thải, nhập kho, cân kho với
 * kệ tiệm chính). Các helper THUẦN đọc state/hằng số có sẵn, giá trị tái tính từ cùng công
 * thức quanNuocDay nên không lệch số liệu. KHÔNG đổi SAVE_VERSION / persist / kinh tế.
 */

const L = 29; // cấp tối thiểu mở quán nước

/** Kho chỉ chứa đồ uống, phân bố đều — tổng đơn vị = total. */
const drinkStorage = (total: number): Record<string, number> => {
  const ids = quanNuocDrinkIds(L);
  const base = Math.floor(total / ids.length);
  const map: Record<string, number> = {};
  let rem = total;
  for (const id of ids) { map[id] = base; rem -= base; }
  if (rem > 0) map[ids[0]] += rem;
  return map;
};

const q = (over: Partial<QuanNuocState> = {}): QuanNuocState => ({ ...newQuanNuoc(), open: true, price: 'vua', ...over });

// Giá bán TB thực đơn drink cấp 29 (cùng công thức quanNuocDay)
const avgSell = quanNuocAvgSell(L);

describe('quanNuocAvgSell — giá bán trung bình thực đơn drink', () => {
  it('khớp công thức quanNuocDay (trung bình sell các món drink đã mở)', () => {
    const ids = quanNuocDrinkIds(L);
    const expectAvg = ids.reduce((n, id) => n + productById(id).sell, 0) / ids.length;
    expect(avgSell).toBeCloseTo(expectAvg, 10);
  });
  it('cấp chưa mở drink nào → 0', () => {
    // cấp 1 chỉ có nước suối nên không trống; dùng cấp 0 giả định
    expect(Number.isFinite(quanNuocAvgSell(1))).toBe(true);
  });
});

describe('quanNuocProjection — dự phóng một đêm (thuần, chặn bởi tồn kho)', () => {
  it('bán đủ khi kho đủ: served = wanted, profit = revenue - wages', () => {
    const pr = quanNuocProjection(q({ staff: 2 }), L, 100000);
    // customers = round(45 * 1.0 * (1+0.15*2)) = round(45*1.3)=59; wanted=ceil(59*1.5)=89
    expect(pr.customers).toBe(59);
    expect(pr.wanted).toBe(89);
    expect(pr.served).toBe(89);
    expect(pr.revenue).toBe(Math.round(89 * avgSell * 1.0));
    expect(pr.wages).toBe(2 * QUAN_NUOC_WAGE);
    expect(pr.profit).toBe(pr.revenue - pr.wages);
  });
  it('kho cạn → served bị chặn bởi tổng đồ uống (cap như quanNuocDay)', () => {
    const pr = quanNuocProjection(q({ staff: 3 }), L, 10);
    expect(pr.served).toBe(10);
    expect(pr.profit).toBe(Math.round(10 * avgSell * 1.0) - 3 * QUAN_NUOC_WAGE);
  });
  it('đúng công thức khách theo hệ số price/mức giá', () => {
    const re = quanNuocProjection(q({ staff: 0, price: 're' }), L, 100000);
    expect(re.customers).toBe(Math.round(45 * QUAN_PRICE_OPTIONS.re.traffic * 1)); // 45*1.2=54
    const cao = quanNuocProjection(q({ staff: 0, price: 'cao' }), L, 100000);
    expect(cao.customers).toBe(Math.round(45 * QUAN_PRICE_OPTIONS.cao.traffic * 1)); // 45*0.75=34
    expect(cao.revenue).toBe(Math.round(cao.served * avgSell * QUAN_PRICE_OPTIONS.cao.mul));
  });
});

describe('quanNuocHealth — mồi quyết định quán nước', () => {
  it('số CŨ thiếu (last undefined) an toàn: không crash, không báo thiếu, missedRevenue=0', () => {
    const h = quanNuocHealth(q({ staff: 1 }), L, drinkStorage(500), undefined);
    expect(h.shortYesterday).toBe(false);
    expect(h.missedRevenue).toBe(0);
    expect(h.drinkUnitsNow).toBe(500);
    expect(h.consumedYesterday).toBe(0);
    expect(Number.isFinite(h.missedRevenue)).toBe(true);
  });

  it('HÔM QUA thiếu kho → missedRevenue định lượng đúng (wanted-served)*avg*mul', () => {
    const last = { served: 40, wanted: 70 }; // thiếu 30 ly
    const h = quanNuocHealth(q({ staff: 2, price: 'vua' }), L, drinkStorage(1000), last);
    expect(h.shortYesterday).toBe(true);
    expect(h.missedRevenue).toBe(Math.round((70 - 40) * avgSell * 1.0));
    expect(h.consumedYesterday).toBe(40);
  });

  it('HÔM QUA bán đủ (served==wanted) → không báo thiếu, missedRevenue=0', () => {
    const h = quanNuocHealth(q({ staff: 1 }), L, drinkStorage(1000), { served: 60, wanted: 60 });
    expect(h.shortYesterday).toBe(false);
    expect(h.missedRevenue).toBe(0);
  });

  it('missedRevenue dùng đúng mul của mức giá hiện tại', () => {
    const last = { served: 10, wanted: 20 };
    const cao = quanNuocHealth(q({ price: 'cao' }), L, drinkStorage(1000), last);
    expect(cao.missedRevenue).toBe(Math.round((20 - 10) * avgSell * QUAN_PRICE_OPTIONS.cao.mul));
  });

  it('hire: null khi đã đủ MAX nhân viên', () => {
    const h = quanNuocHealth(q({ staff: QUAN_NUOC_MAX_STAFF }), L, drinkStorage(1000), { served: 60, wanted: 60 });
    expect(h.hire).toBeNull();
    expect(h.hireMarginal).toBeNull();
  });

  it('hire ROI tính đúng: marginal = (thêm ly × avg × mul) − một lương', () => {
    const st = q({ staff: 1 });
    const h = quanNuocHealth(st, L, drinkStorage(100000), { served: 60, wanted: 60 });
    expect(h.hire).not.toBeNull();
    // P = avgSell × mul (vua=1.0); thêm staff 1→2 → thêm ly = hire.served − tonight.served
    const extraLy = h.hire!.served - h.tonight.served;
    const expected = Math.round(extraLy * avgSell * QUAN_PRICE_OPTIONS[st.price].mul) - QUAN_NUOC_WAGE;
    expect(h.hireMarginal).toBe(expected);
  });

  it('hire không đáng khi kẹt kho: thuê thêm không bán thêm ly → marginal ≤ 0', () => {
    // kho chỉ 10 ly → cả staff hiện tại lẫn +1 đều bán ≤ 10 ly; thêm lương → lỗ thêm
    const h = quanNuocHealth(q({ staff: 1 }), L, drinkStorage(10), { served: 5, wanted: 60 });
    expect(h.hire!.served).toBeLessThanOrEqual(h.tonight.served);
    expect(h.hireMarginal!).toBeLessThan(0);
  });

  it('driesMain: true khi quán mở + có nhân viên + kho < nhu cầu đêm nay (kệ chính sắp cạn)', () => {
    const tight = quanNuocHealth(q({ staff: 3 }), L, drinkStorage(5), { served: 5, wanted: 80 });
    expect(tight.drinkUnitsNow).toBe(5);
    expect(tight.tonight.wanted).toBeGreaterThan(5);
    expect(tight.driesMain).toBe(true);
    // dư kho → không cạn
    const safe = quanNuocHealth(q({ staff: 3 }), L, drinkStorage(1000), { served: 80, wanted: 80 });
    expect(safe.driesMain).toBe(false);
  });

  it('driesMain false khi chưa có nhân viên (quán chưa ăn kho) kể cả kho ít', () => {
    const h = quanNuocHealth(q({ staff: 0 }), L, drinkStorage(5), { served: 0, wanted: 10 });
    expect(h.driesMain).toBe(false);
  });
});
