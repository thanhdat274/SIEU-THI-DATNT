import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGame } from '../core/store';
import { runBranch } from '../core/slices/branch';
import { productById } from '../data/products';
import { LICENSE_FINE } from '../data/licenses';
import { dailyWage, type Staff } from '../data/staff';
import {
  NIGHT_GROUPS, POWER_UPGRADES, branchPowerBill, hasAlcohol, newBranch, pickForGroup, pickNightGroup, powerUpgradeById, type BranchState,
} from '../data/branches';

/** Chiều sâu ban đêm cho tiện lợi 24/7: nhóm khách đêm, rượu bia có giấy phép, giao hàng đêm, điện lạnh. */

afterEach(() => vi.restoreAllMocks());

const crew = (role: Staff['role'], shift: Staff['shift'], id: number): Staff => ({
  id, name: `NV${id}`, role, skill: 3, wage: 100_000, shift, xp: 0, ...({} as object),
} as Staff);

/** Dựng state tối thiểu để chạy runBranch trong một khoảng giờ. */
function simulate(branch: BranchState, from: number, to: number, patch: Record<string, unknown> = {}) {
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

describe('nhóm khách đêm', () => {
  it('mọi món ưa thích của từng nhóm là sản phẩm hợp lệ', () => {
    for (const g of NIGHT_GROUPS) for (const id of g.favorites) expect(productById(id), `${g.id}:${id}`).toBeTruthy();
  });

  it('ban ngày không có nhóm đêm; ban đêm có', () => {
    expect(pickNightGroup(14 * 60, () => 0)).toBeUndefined();
    expect(pickNightGroup(23 * 60, () => 0)).toBeDefined();
  });

  it('mỗi nhóm xuất hiện ở khung giờ của mình', () => {
    const at = (h: number) => { const seen = new Set<string>(); for (let i = 0; i < 400; i++) { const g = pickNightGroup(h * 60); if (g) seen.add(g.id); } return seen; };
    expect(at(23).has('student')).toBe(true);
    expect(at(23).has('drinker')).toBe(true);
    expect(at(3).has('doctor')).toBe(true);
    expect(at(3).has('student')).toBe(false);
    expect(at(21).has('worker')).toBe(true);
  });

  it('khách nhóm ưu tiên món ưa thích nếu kệ có', () => {
    const drinker = NIGHT_GROUPS.find((g) => g.id === 'drinker')!;
    const pool = ['x_banh_quy', 'bia', 'x_keo'];
    expect(pickForGroup(pool, 23 * 60, drinker, () => 0)).toBe('bia');
    // kệ không có món ưa thích: rơi về chọn thường
    expect(pool).toContain(pickForGroup(['x_keo'], 23 * 60, drinker, () => 0));
  });

  it('chi nhánh ghi nhận khách theo nhóm khi chạy ban đêm', () => {
    const b = newBranch();
    b.open = true;
    b.shelf = { mi: 40, nuoc: 40, bia: 40, x_ca_phe_lon: 40, x_thuoc_cam: 40 };
    b.staff = [crew('cashier', 'night', 1), crew('guard', 'night', 2)];
    const { out } = simulate(b, 22 * 60, 26 * 60);
    const groups = out.branch!.groupToday ?? {};
    expect(Object.values(groups).reduce((n, v) => n + v, 0)).toBeGreaterThan(0);
  });
});

describe('rượu bia ban đêm', () => {
  it('hasAlcohol nhận ra rượu bia trên kệ', () => {
    expect(hasAlcohol({ mi: 3 })).toBe(false);
    expect(hasAlcohol({ mi: 3, bia: 2 })).toBe(true);
    expect(hasAlcohol({ bia: 0 })).toBe(false);
  });

  it('công an tuần tra: thiếu giấy phép bị phạt và tịch thu rượu bia', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const b = newBranch();
    b.open = true;
    b.shelf = { bia: 12, mi: 5 };
    b.staff = [crew('cashier', 'night', 1), crew('guard', 'night', 2)];
    const { out, msgs } = simulate(b, 23 * 60 - 10, 23 * 60 + 10);
    expect(out.branch!.shelf.bia).toBeUndefined();
    expect(out.branch!.shelf.mi).toBeDefined();
    expect(msgs.some((m) => m.includes('không giấy phép'))).toBe(true);
    expect(out.money!).toBeLessThanOrEqual(10_000_000 - LICENSE_FINE + 5_000_000);
  });

  it('có giấy phép hợp lệ thì công an chỉ ghé qua, không tịch thu', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const b = newBranch();
    b.open = true;
    b.shelf = { bia: 12 };
    b.staff = [crew('cashier', 'night', 1), crew('guard', 'night', 2)];
    const { out, msgs } = simulate(b, 23 * 60 - 10, 23 * 60 + 10, { licenses: { alcohol: 99 } });
    expect(msgs.some((m) => m.includes('hợp lệ'))).toBe(true);
    expect(msgs.some((m) => m.includes('không giấy phép'))).toBe(false);
    expect(out.branch!.patrolDay).toBe(5);
  });

  it('mỗi đêm công an chỉ tuần tra một lần', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const b = newBranch();
    b.open = true;
    b.shelf = { bia: 12 };
    b.staff = [crew('cashier', 'night', 1), crew('guard', 'night', 2)];
    const { msgs } = simulate(b, 23 * 60 - 10, 25 * 60, { licenses: { alcohol: 99 } });
    expect(msgs.filter((m) => m.includes('Công an')).length).toBe(1);
  });
});

describe('giao hàng đêm qua app', () => {
  const nightBranch = () => {
    const b = newBranch();
    b.open = true;
    b.nightDelivery = true;
    b.shelf = { mi: 200, nuoc: 200, x_mi_ly_tp: 200 };
    return b;
  };
  const onlineOpen = () => ({ ...useGame.getState().online, open: true });

  it('có người giao hàng ca đêm thì nhận đơn, có doanh thu và cộng đơn cho app', () => {
    const b = nightBranch();
    b.staff = [crew('cashier', 'night', 1), crew('courier', 'night', 2)];
    vi.spyOn(Math, 'random').mockReturnValue(0.2); // có đơn mỗi bước 10 phút, không gặp sự cố
    const { out, s } = simulate(b, 22 * 60, 26 * 60, { online: onlineOpen() });
    expect(out.branch!.deliveryToday!).toBeGreaterThan(0);
    expect(out.branch!.deliveryRevenueToday!).toBeGreaterThan(0);
    expect(out.online!.done).toBeGreaterThan(s.online.done);
  });

  it('không có người giao hàng thì đơn bị bỏ lỡ và app tụt điểm', () => {
    const b = nightBranch();
    b.staff = [crew('cashier', 'night', 1)];
    const { out, s } = simulate(b, 22 * 60, 26 * 60, { online: onlineOpen() });
    expect(out.branch!.deliveryToday ?? 0).toBe(0);
    expect(out.online!.ratingCount).toBeGreaterThan(s.online.ratingCount);
  });

  it('gian hàng app chưa mở hoặc chưa bật nhận đơn đêm thì không có đơn giao', () => {
    const b = nightBranch();
    b.staff = [crew('cashier', 'night', 1), crew('courier', 'night', 2)];
    expect(simulate(b, 22 * 60, 26 * 60, { online: { ...onlineOpen(), open: false } }).out.branch!.deliveryToday ?? 0).toBe(0);
    b.nightDelivery = false;
    expect(simulate(b, 22 * 60, 26 * 60, { online: onlineOpen() }).out.branch!.deliveryToday ?? 0).toBe(0);
  });

  it('bật nhận đơn đêm cần gian hàng app đã mở', () => {
    const base = useGame.getState();
    useGame.setState({ branch: { ...newBranch(), open: true }, online: { ...base.online, open: false } });
    useGame.getState().toggleNightDelivery();
    expect(useGame.getState().branch!.nightDelivery).toBeFalsy();
    useGame.setState({ online: { ...base.online, open: true } });
    useGame.getState().toggleNightDelivery();
    expect(useGame.getState().branch!.nightDelivery).toBe(true);
    useGame.setState({ branch: base.branch, online: base.online });
  });
});

describe('điện lạnh', () => {
  it('hóa đơn điện > 0 và tăng khi lắp máy bán hàng tự động', () => {
    const b = newBranch();
    const bill = branchPowerBill(b);
    expect(bill).toBeGreaterThan(0);
    expect(branchPowerBill({ ...b, vendingEnabled: true })).toBeGreaterThan(bill);
  });

  it('tủ tiết kiệm điện giảm hóa đơn', () => {
    const b = newBranch();
    expect(branchPowerBill({ ...b, power: ['efficient'] })).toBeLessThan(branchPowerBill(b));
  });

  it('máy phát điện: mất điện hỏng ít hàng hơn nhưng tốn dầu', () => {
    const run = (power: BranchState['power']) => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99); // không khách, không trộm: kệ chỉ đổi vì mất điện
      const b = newBranch();
      b.open = true;
      b.power = power;
      b.shelf = { x_ca_phe_sua_chai: 100, sua: 100 };
      b.staff = [crew('cashier', 'night', 1), crew('guard', 'night', 2)];
      b.eventDay = 5;
      b.event = { kind: 'blackout', at: 23 * 60 };
      return simulate(b, 22 * 60 + 50, 23 * 60 + 20);
    };
    const plain = run(undefined);
    const gen = run(['generator']);
    const left = (r: ReturnType<typeof run>) => Object.values(r.out.branch!.shelf).reduce((n, q) => n + q, 0);
    expect(gen.msgs.some((m) => m.includes('máy phát'))).toBe(true);
    expect(plain.msgs.some((m) => m.includes('Mất điện'))).toBe(true);
    expect(left(gen)).toBeGreaterThanOrEqual(left(plain));
  });

  it('mua nâng cấp điện: trừ tiền, chỉ mua một lần', () => {
    const base = useGame.getState();
    const price = powerUpgradeById('efficient').price;
    useGame.setState({ branch: newBranch(), money: price * 2 });
    useGame.getState().buyBranchPower('efficient');
    expect(useGame.getState().branch!.power).toEqual(['efficient']);
    expect(useGame.getState().money).toBe(price);
    useGame.getState().buyBranchPower('efficient');
    expect(useGame.getState().money).toBe(price);
    useGame.setState({ branch: base.branch, money: base.money });
  });

  it('mọi nâng cấp điện có giá và mô tả', () => {
    for (const u of POWER_UPGRADES) { expect(u.price).toBeGreaterThan(0); expect(u.desc.length).toBeGreaterThan(0); }
    expect(dailyWage(crew('cashier', 'night', 9))).toBeGreaterThan(0);
  });
});
