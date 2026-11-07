import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { festivalOn } from '../data/calendar';
import { LIXI_EXP, LIXI_PER_STAFF, lixiBlock } from '../data/lixi';
import type { Staff } from '../data/staff';

/** GĐ1520 — 🧧 lì xì nhân viên dịp Tết: mỗi Tết một lần, trừ tiền, cả đội +kinh nghiệm. */
const tet = Array.from({ length: 800 }, (_, i) => i + 1).find((d) => festivalOn(d)?.id === 'tet')!;
const notTet = Array.from({ length: 800 }, (_, i) => i + 1).find((d) => !festivalOn(d))!;
const mk = (id: number): Staff => ({ id, name: 'NV' + id, role: 'cashier', skill: 1, wage: 100000, shift: 'day', exp: 0 } as Staff);
beforeEach(() => useGame.setState({ ...newGameData(), staff: [mk(1), mk(2)], money: 1_000_000, lixiDay: 0 }));

describe('lì xì Tết (GĐ1520)', () => {
  it('chỉ trong dịp Tết', () => {
    useGame.setState({ day: notTet });
    useGame.getState().giveLixi();
    expect(useGame.getState().money).toBe(1_000_000);
    expect(lixiBlock(notTet, 0, 2, 1e9)).toBe('not-tet');
  });

  it('Tết: trừ tiền mỗi người, cả đội +kinh nghiệm, ghi ngày; lần 2 cùng Tết bị chặn', () => {
    useGame.setState({ day: tet });
    useGame.getState().giveLixi();
    const s = useGame.getState();
    expect(s.money).toBe(1_000_000 - 2 * LIXI_PER_STAFF);
    expect(s.lixiDay).toBe(tet);
    for (const st of s.staff) expect(st.skill > 1 || st.exp === LIXI_EXP).toBe(true);
    useGame.setState({ day: tet + 1 });
    useGame.getState().giveLixi();
    expect(useGame.getState().money).toBe(1_000_000 - 2 * LIXI_PER_STAFF);
  });

  it('thiếu tiền hoặc không có ai thì chặn, Tết năm sau lại được', () => {
    expect(lixiBlock(tet, 0, 2, 1000)).toBe('money');
    expect(lixiBlock(tet, 0, 0, 1e9)).toBe('no-staff');
    expect(lixiBlock(tet, tet - 365, 2, 1e9)).toBeNull();
  });
});
