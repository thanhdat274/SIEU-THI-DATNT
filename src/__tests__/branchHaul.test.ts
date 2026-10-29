import { describe, expect, it } from 'vitest';
import { haulTripPlan, autoHaulDue, autoHaulCfg, HAUL_REFILL_BELOW, HAUL_TRIP_EVERY, HAUL_BELOW_MIN, HAUL_BELOW_MAX, HAUL_EVERY_MIN, HAUL_EVERY_MAX } from '../data/branchHaul';
import { CONVENIENCE } from '../data/branches';
import { PRODUCTS } from '../data/products';

/**
 * GĐ206 — "Auto chuyển kho": chủ bật quyền tự chở hàng cho chi nhánh (không cần người giao/xếp/quản
 * lý), mỗi chuyến trả phí xăng. Helper THUẦN — quyết định chuyến + xem chuyến chở gì (cùng công thức
 * vòng chở trong slice), để UI preview/sim khớp số. Không đổi state ở đây.
 */
describe('GĐ206 — auto chuyển kho', () => {
  it('autoHaulDue: chưa bật (undefined) → không nổ chuyến', () => {
    expect(autoHaulDue({ autoHaul: undefined, lastTrip: -999, shelf: { mi: 0 } }, 100)).toBe(false);
    expect(autoHaulDue({ autoHaul: false, lastTrip: -999, shelf: { mi: 0 } }, 100)).toBe(false);
  });

  it('autoHaulDue: bật nhưng kệ còn đủ (≥ ngưỡng) → không nổ để khỏi tốn phí xăng', () => {
    const branch = { autoHaul: true as boolean, lastTrip: -999, shelf: { mi: Math.ceil(CONVENIENCE.shelfCap * HAUL_REFILL_BELOW) } };
    expect(autoHaulDue(branch, 100)).toBe(false);
  });

  it('autoHaulDue: bật + kệ vơi nhưng chưa đủ khoảng cách với chuyến gần nhất → không nổ', () => {
    const branch = { autoHaul: true as boolean, lastTrip: 1000, shelf: { mi: 0 } };
    expect(autoHaulDue(branch, 1000 + HAUL_TRIP_EVERY - 1)).toBe(false);
  });

  it('autoHaulDue: bật + kệ vơi + đủ khoảng cách → nổ chuyến', () => {
    const branch = { autoHaul: true as boolean, lastTrip: -999, shelf: { mi: 0 } };
    expect(autoHaulDue(branch, HAUL_TRIP_EVERY)).toBe(true);
  });

  it('haulTripPlan: lấp kệ món dưới perItem, từ kho chung, trả phí xăng khi chở được', () => {
    const plan = haulTripPlan({ shelf: { mi: 10 } }, { mi: 5 });
    expect(plan.moves).toEqual([{ id: 'mi', qty: 5 }]); // min(room, perItem-10=30, storage 5)
    expect(plan.units).toBe(5);
    expect(plan.cost).toBe(CONVENIENCE.tripFee);
  });

  it('haulTripPlan: bỏ thịt cá tươi (chi nhánh không có quầy riêng)', () => {
    const plan = haulTripPlan({ shelf: {} }, { mi: 5, thit_heo_tuoi: 99, ca_loc_tuoi: 99 });
    expect(plan.moves.some((m) => m.id === 'thit_heo_tuoi' || m.id === 'ca_loc_tuoi')).toBe(false);
    expect(plan.moves.some((m) => m.id === 'mi')).toBe(true);
  });

  it('haulTripPlan: không vượt sức chứa kệ (tổng ≤ shelfCap)', () => {
    // kho nhiều món thật, kệ rỗng → room = shelfCap giới hạn tổng chở; mỗi món vẫn ≤ perItem
    const storage: Record<string, number> = {};
    for (const p of PRODUCTS) if (p.category !== 'meat') storage[p.id] = 100;
    const plan = haulTripPlan({ shelf: {} }, storage);
    expect(plan.units).toBe(CONVENIENCE.shelfCap);
    expect(plan.moves.every((m) => m.qty <= CONVENIENCE.perItem)).toBe(true);
  });

  it('haulTripPlan: kệ đã đủ perItem hoặc kho hết → không chở, cost 0', () => {
    expect(haulTripPlan({ shelf: { mi: CONVENIENCE.perItem } }, { mi: 5 }).units).toBe(0);
    expect(haulTripPlan({ shelf: {} }, {}).cost).toBe(0);
    expect(haulTripPlan(undefined, { mi: 5 })).toEqual({ moves: [], units: 0, cost: 0 });
  });
});

/**
 * GĐ207 — "Auto chuyển kho chỉnh ngưỡng/hẹn giờ": chủ tự chỉnh ngưỡng kệ vơi (%) và khoảng cách giữa
 * các chuyến (phút) để cân phí xăng với độ đầy kệ. Helper THUẦN — đọc cấu hình clamp an toàn.
 */
describe('GĐ207 — auto chuyển kho chỉnh ngưỡng/hẹn giờ', () => {
  it('autoHaulCfg: không chỉnh → về mặc định (50% · 240\')', () => {
    expect(autoHaulCfg(undefined)).toEqual({ below: HAUL_REFILL_BELOW, every: HAUL_TRIP_EVERY });
    expect(autoHaulCfg({})).toEqual({ below: HAUL_REFILL_BELOW, every: HAUL_TRIP_EVERY });
  });

  it('autoHaulCfg: chỉnh trong khoảng hợp lệ thì giữ nguyên', () => {
    expect(autoHaulCfg({ autoHaulBelow: 0.6, autoHaulEvery: 300 })).toEqual({ below: 0.6, every: 300 });
  });

  it('autoHaulCfg: quá đà thì clamp (ngưỡng 30–80%, giãn 120–720\')', () => {
    expect(autoHaulCfg({ autoHaulBelow: 0.9, autoHaulEvery: 30 })).toEqual({ below: HAUL_BELOW_MAX, every: HAUL_EVERY_MIN });
    expect(autoHaulCfg({ autoHaulBelow: 0.1, autoHaulEvery: 1440 })).toEqual({ below: HAUL_BELOW_MIN, every: HAUL_EVERY_MAX });
  });

  it('autoHaulDue: nâng ngưỡng lên 80% → nổ sớm hơn (kệ còn 70% đã chở)', () => {
    const branch = { autoHaul: true as boolean, lastTrip: -999, shelf: { mi: Math.round(CONVENIENCE.shelfCap * 0.7) }, autoHaulBelow: 0.8 };
    expect(autoHaulDue(branch, HAUL_TRIP_EVERY)).toBe(true); // mặc định 50% thì kệ 70% KHÔNG nổ — đây là GĐ207
    expect(autoHaulDue({ ...branch, autoHaulBelow: undefined }, HAUL_TRIP_EVERY)).toBe(false);
  });

  it('autoHaulDue: rút khoảng cách xuống 120\' → nổ sớm hơn (chỉ cách 130\')', () => {
    const branch = { autoHaul: true as boolean, lastTrip: 1000, shelf: { mi: 0 }, autoHaulEvery: 120 };
    expect(autoHaulDue(branch, 1000 + 130)).toBe(true);
    // mặc định 240' thì cách 130' chưa nổ
    expect(autoHaulDue({ ...branch, autoHaulEvery: undefined }, 1000 + 130)).toBe(false);
  });
});
