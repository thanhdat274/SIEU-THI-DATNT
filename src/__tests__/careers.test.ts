import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGame } from '../core/store';
import { branchNewDay } from '../core/slices/branch';
import {
  CHIEF_COVER_MUL, CHIEF_QUIT_MUL, LEAD_CATCH_BONUS, LEAD_FATIGUE_MUL, LEAD_SPEED_MUL, RANKS, nextPromotion, promoted,
} from '../data/careers';
import { COVER_WAGE_MUL, coverMul, newBranch } from '../data/branches';
import { ROLES, type Staff } from '../data/staff';
import { CATCH_BASE, staffDayEnd, workSpeed } from '../data/staffTraits';

/** Gói C: nhân viên thăng tiến thu ngân → trưởng quầy → quản lý chi nhánh. */

afterEach(() => vi.restoreAllMocks());

const staff = (over: Partial<Staff> = {}): Staff => ({
  id: 1, name: 'An', role: 'cashier', skill: 4, wage: 100_000, shift: 'morning', trait: 'steady', daysWorked: 12, ...over,
});

describe('điều kiện thăng chức', () => {
  it('thu ngân đủ sao và đủ ngày công thì được lên trưởng quầy', () => {
    const chk = nextPromotion(staff(), 30)!;
    expect(chk.to).toBe('lead');
    expect(chk.ok).toBe(true);
  });

  it('thiếu sao hoặc thiếu ngày công thì báo rõ điều kiện còn thiếu', () => {
    const chk = nextPromotion(staff({ skill: 3, daysWorked: 4 }), 30)!;
    expect(chk.ok).toBe(false);
    expect(chk.missing).toHaveLength(2);
    expect(chk.missing.join(' ')).toContain('4★');
  });

  it('người từng gian lận không được cất nhắc', () => {
    expect(nextPromotion(staff({ caught: true }), 30)!.ok).toBe(false);
  });

  it('chỉ thu ngân mới có đường thăng tiến; vai trò khác và quản lý đã thăng thì không', () => {
    expect(nextPromotion(staff({ role: 'guard' }), 30)).toBeNull();
    expect(nextPromotion(staff({ role: 'manager', rank: 'chief', skill: 5, daysWorked: 99 }), 30)).toBeNull();
  });

  it('trưởng quầy lên quản lý chi nhánh cần 5★, đủ 25 ngày và đủ cấp thuê quản lý', () => {
    const lead = staff({ rank: 'lead', skill: 5, daysWorked: 30 });
    expect(nextPromotion(lead, 30)!.to).toBe('chief');
    expect(nextPromotion(lead, 30)!.ok).toBe(true);
    expect(nextPromotion({ ...lead, skill: 4 }, 30)!.ok).toBe(false);
    expect(nextPromotion({ ...lead, daysWorked: 10 }, 30)!.ok).toBe(false);
    expect(nextPromotion(lead, ROLES.manager.unlock - 1)!.ok).toBe(false);
  });

  it('thăng chức tăng lương; lên quản lý chi nhánh thì đổi sang vai trò quản lý', () => {
    const lead = promoted(staff(), 'lead');
    expect(lead.rank).toBe('lead');
    expect(lead.role).toBe('cashier');
    expect(lead.wage).toBe(Math.round((100_000 * RANKS.lead.raise) / 1000) * 1000);
    const chief = promoted({ ...lead, skill: 5 }, 'chief');
    expect(chief.rank).toBe('chief');
    expect(chief.role).toBe('manager');
    expect(chief.wage).toBeGreaterThan(lead.wage);
  });
});

describe('quyền lợi của chức vụ', () => {
  it('trưởng quầy làm nhanh hơn thu ngân thường', () => {
    expect(workSpeed(staff({ rank: 'lead' }))).toBeCloseTo(workSpeed(staff()) * LEAD_SPEED_MUL, 5);
  });

  it('có trưởng quầy giám sát thì bắt được người tắt mắt dễ hơn', () => {
    const sticky = [staff({ trait: 'sticky', daysWorked: 5 })];
    const run = (hasLead: boolean) => staffDayEnd(sticky, { revenue: 1_000_000, storage: {}, hasCamera: false, hasManager: false, hasLead, rng: () => CATCH_BASE + LEAD_CATCH_BONUS / 2 });
    expect(run(false).caught).toHaveLength(0);
    expect(run(true).caught).toHaveLength(1);
  });

  it('quản lý chi nhánh thăng từ trong ra gọi người làm thay rẻ hơn', () => {
    const b = newBranch();
    expect(coverMul(b)).toBe(COVER_WAGE_MUL);
    expect(coverMul({ staff: [staff({ role: 'manager', rank: 'chief' })] })).toBe(CHIEF_COVER_MUL);
    expect(CHIEF_COVER_MUL).toBeLessThan(COVER_WAGE_MUL);
  });
});

describe('nhân viên chi nhánh qua ngày mới', () => {
  it('đi làm thì thêm ngày công và kinh nghiệm; nghỉ hôm đó thì không', () => {
    const b = newBranch();
    b.staff = [staff({ id: 1, daysWorked: 3 }), staff({ id: 2, daysWorked: 3 })];
    b.restDay = { 2: 7 };
    const out = branchNewDay(b, 7).branch;
    expect(out.staff.find((s) => s.id === 1)!.daysWorked).toBe(4);
    expect(out.staff.find((s) => s.id === 2)!.daysWorked).toBe(3);
  });

  it('đủ kinh nghiệm thì lên sao và có tin báo', () => {
    const b = newBranch();
    b.staff = [staff({ skill: 2, exp: 7.5, daysWorked: 1 })];
    const r = branchNewDay(b, 7);
    expect(r.branch.staff[0].skill).toBe(3);
    expect(r.news.some((n) => n.includes('lên tay nghề'))).toBe(true);
  });

  it('có trưởng quầy cùng ca thì người khác mệt chậm hơn', () => {
    const mk = (withLead: boolean) => {
      const b = newBranch();
      b.staff = [
        staff({ id: 1, shift: 'night' }),
        ...(withLead ? [staff({ id: 2, shift: 'night', rank: 'lead' as const })] : []),
      ];
      return branchNewDay(b, 7).branch.fatigue![1];
    };
    expect(mk(true)).toBeLessThan(mk(false));
    expect(mk(true)).toBe(Math.round(22 * LEAD_FATIGUE_MUL));
  });

  it('có quản lý chi nhánh thì ít người kiệt sức xin nghỉ việc hơn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.3 * CHIEF_QUIT_MUL + 0.02); // vừa lọt dưới tỉ lệ nghỉ thường, vượt tỉ lệ khi có quản lý
    const mk = (withChief: boolean) => {
      const b = newBranch();
      b.fatigue = { 1: 95 };
      b.staff = [
        staff({ id: 1, shift: 'night', skill: 5 }),
        ...(withChief ? [staff({ id: 9, role: 'manager', rank: 'chief', shift: 'morning' })] : []),
      ];
      return branchNewDay(b, 7).branch.staff.some((s) => s.id === 1);
    };
    expect(mk(false)).toBe(false);
    expect(mk(true)).toBe(true);
  });
});

describe('hành động thăng chức', () => {
  it('trừ tiền thưởng, đổi chức và không thăng khi thiếu tiền', () => {
    const base = useGame.getState();
    useGame.setState({ staff: [staff()], money: 100, level: 30 });
    useGame.getState().promoteStaff(1);
    expect(useGame.getState().staff[0].rank).toBeUndefined(); // thiếu tiền
    useGame.setState({ money: RANKS.lead.cost + 5 });
    useGame.getState().promoteStaff(1);
    expect(useGame.getState().staff[0].rank).toBe('lead');
    expect(useGame.getState().money).toBe(5);
    useGame.setState({ staff: base.staff, money: base.money, level: base.level });
  });

  it('thăng được nhân viên chi nhánh; lên chief thì thành quản lý của chi nhánh', () => {
    const base = useGame.getState();
    const b = newBranch();
    b.staff = [staff({ rank: 'lead', skill: 5, daysWorked: 40 })];
    useGame.setState({ branch: b, money: RANKS.chief.cost, level: 30 });
    useGame.getState().promoteBranchStaff(1);
    expect(useGame.getState().branch!.staff[0]).toMatchObject({ rank: 'chief', role: 'manager' });
    expect(useGame.getState().money).toBe(0);
    useGame.setState({ branch: base.branch, money: base.money, level: base.level });
  });
});
