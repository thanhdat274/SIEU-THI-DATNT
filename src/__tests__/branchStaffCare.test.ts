import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { BONUS_RELIEF, coverMul, newBranch } from '../data/branches';
import { HAUL_BELOW_MAX, HAUL_BELOW_MIN, HAUL_EVERY_MIN } from '../data/branchHaul';
import { dailyWage, type Staff } from '../data/staff';

/**
 * branch.ts (slice) — gọi người làm thay ca nghỉ, thưởng giảm mệt, chỉnh ngưỡng auto chuyển kho.
 * Khoá: tiền trừ đúng, thiếu tiền không làm gì, gọi thay chỉ một lần, thưởng giảm mệt không âm, ngưỡng bị clamp.
 */

const g = () => useGame.getState();
const person: Staff = { id: 1, name: 'An', role: 'cashier', skill: 3, wage: 20_000, shift: 'night' };

beforeEach(() => {
  const b = newBranch();
  b.staff = [person];
  b.event = { kind: 'calloff', at: 1300, staffId: 1 } as never;
  b.fatigue = { 1: 50 };
  useGame.setState({ ...newGameData(), money: 1_000_000, branch: b });
});

describe('coverCalloff', () => {
  it('gọi người thay: trừ công ca × hệ số, đánh dấu covered, ghi sổ chi', () => {
    const cost = Math.round(dailyWage(person) * coverMul(g().branch!));
    const s0 = g().stats.spent;
    g().coverCalloff();
    expect(g().money).toBe(1_000_000 - cost);
    expect(g().stats.spent).toBe(s0 + cost);
    expect((g().branch!.event as { covered?: boolean }).covered).toBe(true);
  });

  it('gọi lần hai không trừ thêm; thiếu tiền thì không gọi', () => {
    g().coverCalloff();
    const m = g().money;
    g().coverCalloff();
    expect(g().money).toBe(m);
    useGame.setState({ money: 1, branch: { ...g().branch!, event: { kind: 'calloff', at: 1300, staffId: 1 } as never } });
    g().coverCalloff();
    expect(g().money).toBe(1);
    expect((g().branch!.event as { covered?: boolean }).covered).toBeFalsy();
  });

  it('không phải sự kiện nghỉ đột xuất: không làm gì', () => {
    useGame.setState({ branch: { ...g().branch!, event: { kind: 'drunk', at: 1300 } as never } });
    g().coverCalloff();
    expect(g().money).toBe(1_000_000);
  });
});

describe('bonusBranchStaff', () => {
  it('thưởng 1 công ngày: trừ tiền, giảm mệt BONUS_RELIEF (không xuống dưới 0)', () => {
    g().bonusBranchStaff(1);
    expect(g().money).toBe(1_000_000 - dailyWage(person));
    expect(g().branch!.fatigue![1]).toBe(Math.max(0, 50 - BONUS_RELIEF));
    useGame.setState({ branch: { ...g().branch!, fatigue: { 1: 10 } } });
    g().bonusBranchStaff(1);
    expect(g().branch!.fatigue![1]).toBe(0);
  });

  it('thiếu tiền hoặc người lạ: không đổi gì', () => {
    g().bonusBranchStaff(999);
    expect(g().money).toBe(1_000_000);
    useGame.setState({ money: 5 });
    g().bonusBranchStaff(1);
    expect(g().money).toBe(5);
    expect(g().branch!.fatigue![1]).toBe(50);
  });
});

describe('setBranchAutoHaul', () => {
  it('giá trị ngoài khoảng bị kẹp về cận an toàn', () => {
    g().setBranchAutoHaul(0.01, 1);
    expect(g().branch!.autoHaulBelow).toBe(HAUL_BELOW_MIN);
    expect(g().branch!.autoHaulEvery).toBe(HAUL_EVERY_MIN);
    g().setBranchAutoHaul(99, 99999);
    expect(g().branch!.autoHaulBelow).toBe(HAUL_BELOW_MAX);
  });

  it('chỉ đổi tham số được truyền; bật/tắt auto đảo trạng thái', () => {
    g().setBranchAutoHaul(0.5);
    expect(g().branch!.autoHaulBelow).toBe(0.5);
    expect(g().branch!.autoHaulEvery).toBeUndefined();
    const before = !!g().branch!.autoHaul;
    g().toggleBranchAutoHaul();
    expect(!!g().branch!.autoHaul).toBe(!before);
  });
});
