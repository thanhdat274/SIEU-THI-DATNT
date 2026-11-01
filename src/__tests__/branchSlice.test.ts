import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { CONVENIENCE, POWER_UPGRADES, VENDING_COST, powerUpgradeById } from '../data/branches';
import type { Staff } from '../data/staff';

/**
 * branch.ts (slice) — mua mặt bằng tiện lợi, thuê/đuổi người, mở cửa, máy bán tự động, nâng cấp điện:
 * toàn chỗ tiêu tiền lớn (mặt bằng 5 triệu). Khoá: chặn thiếu cấp/tiền, không mua hai lần, ghi sổ chi,
 * chi nhánh không mở khi chưa có thu ngân, giới hạn nhân sự và vai trò.
 */

const g = () => useGame.getState();
const person = (id: number, role: Staff['role'] = 'cashier'): Staff => ({ id, name: `N${id}`, role, skill: 3, wage: 10_000, shift: 'morning' });

beforeEach(() => {
  useGame.setState({ ...newGameData(), money: 10_000_000, level: CONVENIENCE.unlock, branch: null, candidates: [] });
});

describe('openBranch', () => {
  it('đủ cấp + tiền: trừ openCost, ghi sổ chi, có chi nhánh (chưa mở cửa)', () => {
    const s0 = g().stats.spent;
    expect(g().openBranch()).toBe(true);
    expect(g().money).toBe(10_000_000 - CONVENIENCE.openCost);
    expect(g().stats.spent).toBe(s0 + CONVENIENCE.openCost);
    expect(g().branch?.open).toBe(false);
  });

  it('mua lần hai: bị chặn, không trừ thêm', () => {
    g().openBranch();
    const m = g().money;
    expect(g().openBranch()).toBe(false);
    expect(g().money).toBe(m);
  });

  it('thiếu cấp hoặc thiếu tiền: không mua', () => {
    useGame.setState({ level: CONVENIENCE.unlock - 1 });
    expect(g().openBranch()).toBe(false);
    useGame.setState({ level: CONVENIENCE.unlock, money: CONVENIENCE.openCost - 1 });
    expect(g().openBranch()).toBe(false);
    expect(g().branch).toBeNull();
    expect(g().money).toBe(CONVENIENCE.openCost - 1);
  });
});

describe('nhân sự chi nhánh', () => {
  beforeEach(() => { g().openBranch(); });

  it('chưa có thu ngân thì không mở cửa được; có rồi thì bật/tắt', () => {
    g().toggleBranch();
    expect(g().branch!.open).toBe(false);
    useGame.setState({ candidates: [person(1)] as never });
    g().hireForBranch(1, 'morning');
    g().toggleBranch();
    expect(g().branch!.open).toBe(true);
    g().toggleBranch();
    expect(g().branch!.open).toBe(false);
  });

  it('thuê: ứng viên chuyển sang chi nhánh đúng ca; vai trò không hợp (đứng quầy chính) bị từ chối', () => {
    useGame.setState({ candidates: [person(1), person(2, 'chef' as never)] as never });
    g().hireForBranch(2, 'morning');
    expect(g().branch!.staff).toHaveLength(0);
    g().hireForBranch(1, 'night');
    expect(g().branch!.staff).toEqual([expect.objectContaining({ id: 1, shift: 'night' })]);
    expect(g().candidates.map((c) => c.id)).toEqual([2]);
  });

  it('đủ maxStaff thì không thuê thêm', () => {
    useGame.setState({ candidates: Array.from({ length: CONVENIENCE.maxStaff + 1 }, (_, i) => person(i + 1)) as never });
    for (let i = 1; i <= CONVENIENCE.maxStaff + 1; i++) g().hireForBranch(i, 'morning');
    expect(g().branch!.staff).toHaveLength(CONVENIENCE.maxStaff);
    expect(g().candidates).toHaveLength(1);
  });

  it('đuổi và đổi ca', () => {
    useGame.setState({ candidates: [person(1)] as never });
    g().hireForBranch(1, 'morning');
    g().setBranchShift(1, 'night');
    expect(g().branch!.staff[0].shift).toBe('night');
    g().fireFromBranch(1);
    expect(g().branch!.staff).toEqual([]);
  });

  it('cho nghỉ ngày mai: ghi restDay = hôm nay + 1', () => {
    useGame.setState({ candidates: [person(1)] as never, day: 7 });
    g().hireForBranch(1, 'morning');
    g().restBranchStaff(1);
    expect(g().branch!.restDay![1]).toBe(8);
  });
});

describe('máy bán tự động / nâng cấp điện', () => {
  beforeEach(() => { g().openBranch(); });

  it('lắp máy: trừ VENDING_COST một lần; tắt rồi bật lại phải trả lại (không miễn phí)', () => {
    const m0 = g().money;
    g().toggleVending();
    expect(g().branch!.vendingEnabled).toBe(true);
    expect(g().money).toBe(m0 - VENDING_COST);
    g().toggleVending();
    expect(g().branch!.vendingEnabled).toBe(false);
    expect(g().money).toBe(m0 - VENDING_COST);
  });

  it('thiếu tiền lắp máy: không lắp, không trừ', () => {
    useGame.setState({ money: VENDING_COST - 1 });
    g().toggleVending();
    expect(g().branch!.vendingEnabled).toBeFalsy();
    expect(g().money).toBe(VENDING_COST - 1);
  });

  it('mua nâng cấp điện: trừ giá, ghi sổ chi, không mua lại; id lạ bị bỏ qua', () => {
    const u = POWER_UPGRADES[0];
    const m0 = g().money;
    g().buyBranchPower(u.id);
    expect(g().money).toBe(m0 - powerUpgradeById(u.id).price);
    expect(g().branch!.power).toContain(u.id);
    g().buyBranchPower(u.id);
    expect(g().money).toBe(m0 - u.price);
    g().buyBranchPower('khong-co' as never);
    expect(g().money).toBe(m0 - u.price);
  });

  it('đơn đêm cần gian hàng online mở trước', () => {
    useGame.setState({ online: { ...g().online, open: false } });
    g().toggleNightDelivery();
    expect(g().branch!.nightDelivery).toBeFalsy();
    useGame.setState({ online: { ...g().online, open: true } });
    g().toggleNightDelivery();
    expect(g().branch!.nightDelivery).toBe(true);
  });
});
