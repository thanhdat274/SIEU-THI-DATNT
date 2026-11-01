import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useGame } from '../core/store';
import { runBranch } from '../core/slices/branch';
import { newBranch, type BranchState } from '../data/branches';
import { setSimSeed, clearSimSeed } from '../core/rand';
import type { Staff } from '../data/staff';

const crew = (role: Staff['role'], shift: Staff['shift'], id: number): Staff => ({
  id, name: `nv${id}`, role, shift, skill: 3, wage: 1_000_000,
}) as Staff;

/** Chạy runBranch với một seed cụ thể (re-seed trước mỗi lần để tái lập). */
function simulate(branch: BranchState, from: number, to: number, seed: number, patch: Record<string, unknown> = {}) {
  setSimSeed(seed);
  const base = useGame.getState();
  const msgs: string[] = [];
  const b = { ...branch, simAt: from };
  const s: any = {
    ...base, branch: b, money: 10_000_000, level: 20, day: 5, licenses: {}, atBranch: false,
    stats: { ...base.stats }, garden: { ...base.garden, homegrown: {} },
    notify: (m: string) => { msgs.push(m); },
    ...patch,
  };
  return { out: runBranch(() => s, to), msgs, s };
}

/** Một chi nhánh mở cửa, đông khách, đêm giao hàng — đủ để kích hoạt mọi nhánh ngẫu nhiên. */
function fullBranch(): BranchState {
  const b = newBranch();
  b.open = true;
  b.shelf = { mi: 40, nuoc: 40, bia: 40, x_ca_phe_lon: 40, x_thuoc_cam: 40 };
  b.staff = [
    crew('cashier', 'morning', 1), crew('guard', 'morning', 2),
    crew('cashier', 'night', 3), crew('guard', 'night', 4),
  ];
  return b;
}

/** Trích các đầu ra "ngẫu nhiên" quan trọng để so sánh độ tái lập. */
function seedprint(out: ReturnType<typeof simulate>['out']) {
  const b = out.branch!;
  return {
    revenue: Math.round(out.money ?? 0),
    revenueToday: b.revenueToday,
    customers: b.customersToday,
    missed: b.missedToday,
    deliveryRevenue: b.deliveryRevenueToday ?? 0,
    deliveries: b.deliveryToday ?? 0,
    group: JSON.stringify(b.groupToday ?? {}),
    shelf: JSON.stringify(b.shelf),
  };
}

describe('seed RNG: tái lập chạy chi nhánh', () => {
  beforeEach(() => setSimSeed(20261027));
  afterEach(() => clearSimSeed());

  it('hai lần chạy cùng seed cho kết quả giống hệt nhau (không cần mock Math.random)', () => {
    const a = seedprint(simulate(fullBranch(), 5 * 60, 27 * 60, 20261027).out);
    const b = seedprint(simulate(fullBranch(), 5 * 60, 27 * 60, 20261027).out);
    expect(a).toEqual(b);
  });

  it('chạy một ngày liên tục không sinh lỗi real-world (mở cửa, đủ giấy phép)', () => {
    const { out, msgs } = simulate(fullBranch(), 5 * 60, 27 * 60, 20261027, { licenses: { alcohol: 99 } });
    expect(out.money!).toBeGreaterThanOrEqual(0);
    expect(msgs).toBeInstanceOf(Array);
  });

  it('seed khác cho dãy khác nhau ít nhất ở một đầu ra', () => {
    const a = seedprint(simulate(fullBranch(), 5 * 60, 27 * 60, 12345).out);
    const b = seedprint(simulate(fullBranch(), 5 * 60, 27 * 60, 99999).out);
    // Hai seed khác nhau thường cho mặt hàng/doanh thu khác; ít nhất phải khác một chỗ.
    expect(a).not.toEqual(b);
  });
});
