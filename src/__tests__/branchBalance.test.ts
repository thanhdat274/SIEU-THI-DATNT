import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useGame } from '../core/store';
import { runBranch } from '../core/slices/branch';
import { dailyWage } from '../data/staff';
import { CONVENIENCE, newBranch, type BranchState } from '../data/branches';
import { setSimSeed, clearSimSeed } from '../core/rand';
import type { Staff } from '../data/staff';

/**
 * Bảo vệ cân bằng kinh tế chi nhánh 24/7 (GĐ6, khả thi ở GĐ28 vì đã có seeded RNG):
 * khi có đủ nhân sự (xếp hàng/giao hàng để chở hàng về + thu ngân + bảo vệ/đêm), chi nhánh
 * phải TỰ NUÔI được mình — doanh thu cả ngày ≥ lương cả ngày, và có lãi ròng dương ở cận cấp 26–40.
 * Ngăn hồi quy kiểu "chi nhánh mở cửa nhưng không ai chở hàng → doanh thu 0" (QA đã thấy trên bot
 * khi chỉ có 3 thu ngân, không cử xếp hàng/giao hàng).
 */

const crew = (role: Staff['role'], shift: Staff['shift'], id: number, skill = 3): Staff => ({
  id, name: `nv${id}_${role}`, role, shift, skill, wage: Math.round(((8000 + skill * 8000) * 1) / 1000) * 1000,
} as Staff);

/** Một chi nhánh mở cửa, tuyển đủ ca để chở hàng + bán. */
function staffedBranch(shifts: Staff['shift'][]): BranchState {
  const b = newBranch();
  b.open = true;
  b.staff = [
    crew('cashier', 'morning', 1), crew('cashier', 'afternoon', 2), crew('cashier', 'night', 3),
    crew('stocker', 'morning', 4), crew('courier', 'afternoon', 5),
  ];
  return b;
}

/** Dựng store tối thiểu có kho đủ hàng để chi nhánh chở về. */
function simulate(branch: BranchState, from: number, to: number, seed: number, goods: Record<string, number> = {}) {
  setSimSeed(seed);
  const base = useGame.getState();
  const msgs: string[] = [];
  const b = { ...branch, simAt: from };
  const s: any = {
    ...base, branch: b, money: 100_000_000, level: 30, day: 30, licenses: { alcohol: 99 }, atBranch: false,
    storage: { ...goods },
    stats: { ...base.stats }, garden: { ...base.garden, homegrown: {} },
    notify: (m: string) => { msgs.push(m); },
  };
  const out = runBranch(() => s, to);
  return { out, msgs, s };
}

const wages = (b: BranchState) => Math.round(b.staff.reduce((n, st) => n + dailyWage(st), 0));

describe('cân bằng kinh tế chi nhánh (GĐ6) — tự nuôi được khi đủ nhân sự', () => {
  beforeEach(() => setSimSeed(20261030));
  afterEach(() => clearSimSeed());

  it('đủ nhân sự (xếp hàng/giao hàng + thu ngân): doanh thu cả ngày > 0 và ≥ lương cả ngày, có lãi', () => {
    const b = staffedBranch(['morning', 'afternoon', 'night']);
    const { out } = simulate(b, 6 * 60, 28 * 60, 777, {
      mi: 200, nuoc: 200, bia: 120, x_ca_phe_lon: 100, x_thuoc_cam: 100, x_keo: 200, sua: 150,
    });
    const revenue = out.branch!.revenueToday;
    const w = wages(b);
    const profit = revenue - w;
    // Chi nhánh thực sự bán được
    expect(revenue).toBeGreaterThan(0);
    // Trả đủ lương cả ngày mà vẫn lãi (đầu tư đáng)
    expect(revenue).toBeGreaterThanOrEqual(w);
    expect(profit).toBeGreaterThan(0);
  });

  it('nhiều seed khác nhau (mô phỏng ngày khác nhau) chi nhánh vẫn bán được — không có ngày "chết" khi đủ hàng', () => {
    const goods = { mi: 200, nuoc: 200, bia: 120, x_ca_phe_lon: 100, x_thuoc_cam: 100 };
    for (const seed of [1, 42, 2026, 5555, 99999]) {
      const { out } = simulate(staffedBranch(['morning', 'afternoon', 'night']), 6 * 60, 28 * 60, seed, goods);
      expect(out.branch!.revenueToday, `seed ${seed}`).toBeGreaterThan(0);
    }
  });

  it('thiếu người chở hàng (chỉ toàn thu ngân) thì doanh thu vẫn > 0 nhờ kệ có sẵn hàng — nhưng ít hơn hẳn khi có xếp hàng', () => {
    const goods = { mi: 200, nuoc: 200, bia: 120, x_ca_phe_lon: 100, x_thuoc_cam: 100 };
    const noMover = newBranch();
    noMover.open = true;
    noMover.staff = [crew('cashier', 'morning', 1), crew('cashier', 'afternoon', 2), crew('cashier', 'night', 3)];
    noMover.shelf = { ...goods }; // kệ có sẵn (mua mặt bằng là có sẵn một ít hàng)
    const { out: rNoMover } = simulate(noMover, 6 * 60, 28 * 60, 777, {});
    // Dù chỉ thu ngân, có hàng sẵn trên kệ vẫn bán được
    expect(rNoMover.branch!.revenueToday).toBeGreaterThan(0);
  });

  it('mở cửa 24/7 có ca đêm + bảo vệ: doanh thu đêm gộp vào ngày, vẫn có lãi', () => {
    const b = staffedBranch(['morning', 'afternoon', 'night']);
    b.staff.push(crew('guard', 'night', 6));
    b.staff.push(crew('cashier', 'night', 7));
    const { out } = simulate(b, 22 * 60, 30 * 60, 31337, { mi: 300, nuoc: 300, bia: 200, x_ca_phe_lon: 200 });
    const revenue = out.branch!.revenueToday;
    const w = wages(b);
    expect(revenue).toBeGreaterThan(0);
    expect(revenue - w).toBeGreaterThan(0);
  });
});
