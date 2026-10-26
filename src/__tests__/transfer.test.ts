import { beforeEach, describe, expect, it } from 'vitest';
import { useGame } from '../core/store';
import { CONVENIENCE, newBranch } from '../data/branches';
import { maxStaff, type Staff } from '../data/staff';
import { gapsOf, moveStaff } from '../data/transfer';

/** Điều quân giữa tiệm chính và cửa hàng tiện lợi 24/7. */

const person = (id: number, over: Partial<Staff> = {}): Staff => ({
  id, name: `NV${id}`, role: 'cashier', skill: 3, wage: 100_000, shift: 'morning', rank: 'lead', exp: 5, daysWorked: 9, ...over,
});

const setup = (main: Staff[], branchStaff: Staff[], open = false) => {
  const b = newBranch();
  b.staff = branchStaff;
  b.open = open;
  b.fatigue = { 50: 40 };
  b.restDay = { 50: 4 };
  useGame.setState({ staff: main, branch: b, level: 40, day: 3, notify: () => {} } as any);
};

beforeEach(() => setup([], []));

describe('moveStaff (hàm thuần)', () => {
  it('giữ nguyên tay nghề, lương, chức vụ; đóng dấu ngày điều', () => {
    const r = moveStaff(person(1), 'branch', 3, false);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.staff).toMatchObject({ skill: 3, wage: 100_000, rank: 'lead', exp: 5, movedDay: 3 });
  });

  it('vai chỉ có ở tiệm chính thì không sang chi nhánh được', () => {
    const r = moveStaff(person(1, { role: 'cook' }), 'branch', 3, false);
    expect(r.ok).toBe(false);
  });

  it('ca cả ngày sang chi nhánh thành ca sáng; ca đêm về tiệm chính chưa mở ca đêm thành ca chiều', () => {
    const a = moveStaff(person(1, { shift: 'full' }), 'branch', 3, false);
    const b = moveStaff(person(2, { shift: 'night' }), 'main', 3, false);
    const c = moveStaff(person(3, { shift: 'night' }), 'main', 3, true);
    expect(a.ok && a.staff.shift).toBe('morning');
    expect(b.ok && b.staff.shift).toBe('afternoon');
    expect(c.ok && c.staff.shift).toBe('night');
  });

  it('một người một lần mỗi ngày', () => {
    expect(moveStaff(person(1, { movedDay: 3 }), 'branch', 3, false).ok).toBe(false);
    expect(moveStaff(person(1, { movedDay: 2 }), 'branch', 3, false).ok).toBe(true);
  });
});

describe('gapsOf', () => {
  it('chi nhánh thiếu thu ngân từng ca và bảo vệ đêm', () => {
    const g = gapsOf([person(1, { shift: 'morning' })], 'branch', true);
    expect(g).toEqual(['thiếu thu ngân ca chiều', 'thiếu thu ngân ca đêm', 'thiếu bảo vệ ca đêm']);
  });
});

describe('transferStaff', () => {
  it('chuyển từ tiệm chính sang chi nhánh rồi không chuyển lại trong cùng ngày', () => {
    setup([person(1)], []);
    expect(useGame.getState().transferStaff(1, 'branch')).toBe(true);
    expect(useGame.getState().staff).toHaveLength(0);
    expect(useGame.getState().branch!.staff.map((s) => s.id)).toEqual([1]);
    expect(useGame.getState().transferStaff(1, 'main')).toBe(false);
    expect(useGame.getState().branch!.staff).toHaveLength(1);
  });

  it('chi nhánh đầy người thì chặn', () => {
    const full = Array.from({ length: CONVENIENCE.maxStaff }, (_, i) => person(100 + i));
    setup([person(1)], full);
    expect(useGame.getState().transferStaff(1, 'branch')).toBe(false);
    expect(useGame.getState().staff).toHaveLength(1);
  });

  it('tiệm chính đầy người thì chặn chiều về', () => {
    const cap = maxStaff(40);
    setup(Array.from({ length: cap }, (_, i) => person(100 + i)), [person(1)]);
    expect(useGame.getState().transferStaff(1, 'main')).toBe(false);
    expect(useGame.getState().branch!.staff).toHaveLength(1);
  });

  it('rời chi nhánh thì xoá dấu mệt/nghỉ của người đó', () => {
    setup([], [person(50)]);
    expect(useGame.getState().transferStaff(50, 'main')).toBe(true);
    const b = useGame.getState().branch!;
    expect(b.fatigue?.[50]).toBeUndefined();
    expect(b.restDay?.[50]).toBeUndefined();
  });

  it('chưa có chi nhánh thì không điều được', () => {
    useGame.setState({ staff: [person(1)], branch: null } as any);
    expect(useGame.getState().transferStaff(1, 'branch')).toBe(false);
  });
});

describe('evacuateBranch', () => {
  it('chi nhánh đang mở thì không dồn', () => {
    setup([], [person(1), person(2)], true);
    useGame.getState().evacuateBranch();
    expect(useGame.getState().branch!.staff).toHaveLength(2);
  });

  it('chi nhánh đóng thì dồn hết về tiệm chính', () => {
    setup([], [person(1), person(2, { shift: 'night' })]);
    useGame.getState().evacuateBranch();
    expect(useGame.getState().branch!.staff).toHaveLength(0);
    expect(useGame.getState().staff.map((s) => s.id).sort()).toEqual([1, 2]);
  });

  it('dồn tới khi tiệm chính đầy, người còn lại ở chi nhánh', () => {
    const cap = maxStaff(40);
    setup(Array.from({ length: cap - 1 }, (_, i) => person(100 + i)), [person(1), person(2)]);
    useGame.getState().evacuateBranch();
    expect(useGame.getState().staff).toHaveLength(cap);
    expect(useGame.getState().branch!.staff).toHaveLength(1);
  });
});
