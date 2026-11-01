import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useGame } from '../core/store';
import { runBranch, branchNewDay } from '../core/slices/branch';
import { newBranch, vendingTotal, type BranchState } from '../data/branches';
import { setSimSeed, clearSimSeed } from '../core/rand';
import type { Staff } from '../data/staff';

/**
 * GĐ691 — phủ 5 khối logic chi nhánh chưa có test (covlines GĐ690):
 *  1. Máy bán hàng tự động: người trực nạp hàng từ kho chung theo chu kỳ (branch.ts 54-65).
 *  2. Trộm vặt máy bán hàng ban đêm (branch.ts 86-92).
 *  3. Khách nhậu say gây gổ khi bán rượu đêm không có bảo vệ (branch.ts 212-216).
 *  4. Shipper giao đêm gặp sự cố — mất đơn app (branch.ts 242-245).
 *  5. Quản lý cho nhân viên quá mệt nghỉ ngày mai (branchNewDay, branch.ts 316-318).
 * Dùng harness seed như branchSeed.test.ts; các nhánh xác suất quét seed tới khi nổ, không nổ thì fail to.
 */

const crew = (role: Staff['role'], shift: Staff['shift'], id: number): Staff => ({
  id, name: `nv${id}`, role, shift, skill: 3, wage: 1_000_000,
}) as Staff;

function simulate(branch: BranchState, from: number, to: number, seed: number, patch: Record<string, unknown> = {}) {
  setSimSeed(seed);
  const base = useGame.getState();
  const msgs: string[] = [];
  const b = { ...branch, simAt: from };
  const s: any = {
    ...base, branch: b, money: 10_000_000, level: 20, day: 5, licenses: { alcohol: 99 }, atBranch: false,
    stats: { ...base.stats }, garden: { ...base.garden, homegrown: {} },
    notify: (m: string) => { msgs.push(m); },
    ...patch,
  };
  return { out: runBranch(() => s, to), msgs, s };
}

/** Quét seed tới khi `hit` đúng; trả về lần simulate đầu tiên nổ. Không nổ trong `maxSeed` seed → fail rõ ràng. */
function sweep<T>(run: (seed: number) => T | undefined, maxSeed = 400): { seed: number; res: T } {
  for (let seed = 1; seed <= maxSeed; seed++) {
    const res = run(seed);
    if (res) return { seed, res };
  }
  throw new Error(`Không seed nào 1..${maxSeed} kích hoạt nhánh — test đang phủ một khối đã chết hoặc sai điều kiện`);
}

describe('chi nhánh: máy bán hàng tự động — nạp hàng theo chu kỳ (GĐ691)', () => {
  beforeEach(() => { setSimSeed(7); });
  afterEach(() => clearSimSeed());

  it('có xếp hàng trực sáng: nạp mi/nuoc từ kho chung vào máy, ghi nhận chuyến xe', () => {
    const b = newBranch();
    b.open = false;
    b.vendingEnabled = true;
    b.vendingStock = {};
    b.lastTrip = 250; // 6h10 - 120 phút: đến bước m=370 (6h10) là đủ chu kỳ tripEvery
    b.staff = [crew('stocker', 'morning', 1)];
    const { out } = simulate(b, 6 * 60, 400, 7, { storage: { mi: 30, nuoc: 20 } });
    // Kho chung đã rút hết 2 món ưa chạy của máy (takeStock để lại 0, không xoá khoá)...
    expect(out.storage?.mi).toBe(0);
    expect(out.storage?.nuoc).toBe(0);
    // ...và máy có hàng (đã nạp 50 món < CAP 60), chuyến xe được ghi đúng bước đầu tiên
    const b2 = out.branch!;
    expect(vendingTotal(b2.vendingStock ?? {})).toBeGreaterThan(0);
    expect(b2.lastTrip).toBe(370);
  });

  it('không ai trực (không giao/xếp/quản lý): máy không được nạp', () => {
    const b = newBranch();
    b.open = false;
    b.vendingEnabled = true;
    b.vendingStock = {};
    b.lastTrip = -999;
    b.staff = [crew('cashier', 'morning', 1)]; // thu ngân không phải người nạp máy
    const { out } = simulate(b, 6 * 60, 400, 7, { storage: { mi: 30, nuoc: 20 } });
    expect(out.storage?.mi).toBe(30);
    expect(out.storage?.nuoc).toBe(20);
    expect(vendingTotal(out.branch!.vendingStock ?? {})).toBe(0);
    expect(out.branch!.lastTrip).toBe(-999);
  });

  it('trộm vặt máy ban đêm: mất hàng, lostToday tăng (quét seed)', () => {
    const { seed, res } = sweep((seed) => {
      const b = newBranch();
      b.open = false; // đóng cửa: ngoài khối máy bán hàng không gì chạy → lostToday chỉ từ trộm máy
      b.vendingEnabled = true;
      b.vendingStock = { mi: 30 };
      b.staff = [];
      const { out } = simulate(b, 22 * 60, 23 * 60, seed);
      if (out.branch!.lostToday > 0) return out;
      return undefined;
    });
    const b2 = res.branch!;
    expect(vendingTotal(b2.vendingStock ?? {})).toBeLessThan(30);
    expect(b2.lostToday).toBeGreaterThan(0);
  });
});

describe('chi nhánh đêm: gây gổ & giao hàng app (GĐ691)', () => {
  beforeEach(() => { setSimSeed(1); });
  afterEach(() => clearSimSeed());

  it('bán rượu đêm không có bảo vệ: khách say gây gổ — đền tiền, quầy ngưng bán (quét seed)', () => {
    const { res, seed } = sweep((seed) => {
      const b = newBranch();
      b.open = true;
      b.shelf = { bia: 40, nuoc: 40 };
      b.staff = [crew('cashier', 'night', 1)]; // ca đêm 22h–6h, không có bảo vệ
      const { out, msgs } = simulate(b, 22 * 60, 23 * 60, seed);
      if (msgs.some((m) => m.includes('gây gổ'))) return { out, msgs };
      return undefined;
    });
    const b2 = res.out.branch!;
    expect(b2.blockedUntil).toBeDefined();
    expect(res.msgs.join(' ')).toContain('gây gổ');
  });

  it('shipper giao đêm gặp sự cố: mất đơn, không thu tiền, đánh giá 2★ (quét seed)', () => {
    const { res } = sweep((seed) => {
      const b = newBranch();
      b.open = true;
      b.shelf = { mi: 40, nuoc: 40 };
      b.nightDelivery = true;
      b.staff = [crew('courier', 'night', 1)];
      const { out, msgs } = simulate(b, 22 * 60, 23 * 60, seed, {
        online: { ...useGame.getState().online, open: true },
      });
      if (msgs.some((m) => m.includes('gặp sự cố'))) return { out, msgs };
      return undefined;
    });
    expect(res.out.branch!.lostToday).toBeGreaterThan(0);
    // Đơn mất được chấm 2★ (ratingSum +2) và tính là trễ
    expect(res.out.online?.late).toBeGreaterThan(0);
    expect(res.out.online!.ratingSum / res.out.online!.ratingCount).toBeLessThan(5);
  });
});

describe('chi nhánh: sang ngày mới — quản lý cho người mệt nghỉ (GĐ691)', () => {
  beforeEach(() => { setSimSeed(11); });
  afterEach(() => clearSimSeed());

  it('có quản lý + 2 thu ngân cùng vai trò: người mệt nhất (≥ FATIGUE_SLOW) được nghỉ ngày mai', () => {
    const b = newBranch();
    b.staff = [
      crew('manager', 'full', 9),
      crew('cashier', 'morning', 1),
      crew('cashier', 'morning', 2),
    ];
    b.fatigue = { 1: 71, 2: 20 }; // nv1 mệt, cộng thêm 8/ca sáng → 79 ≥ 70
    const { branch, news } = branchNewDay(b, 5);
    expect(branch.restDay?.[1]).toBe(6);
    expect(news.some((m) => m.includes('nghỉ ngày mai'))).toBe(true);
    // Người khoẻ vẫn làm bình thường
    expect(branch.restDay?.[2]).toBeUndefined();
  });

  it('không có quản lý: không ai được xếp nghỉ tự động dù mệt', () => {
    const b = newBranch();
    b.staff = [crew('cashier', 'morning', 1), crew('cashier', 'morning', 2)];
    b.fatigue = { 1: 71, 2: 20 };
    const { branch, news } = branchNewDay(b, 5);
    expect(branch.restDay?.[1]).toBeUndefined();
    expect(news.some((m) => m.includes('nghỉ ngày mai'))).toBe(false);
  });
});
