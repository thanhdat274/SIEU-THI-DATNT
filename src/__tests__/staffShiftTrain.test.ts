import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import type { Staff } from '../data/staff';
import { trainCost } from '../data/staffTraits';

/**
 * Bộ test GĐ1033 — `core/slices/staff`:
 * - `setShift` nhánh chặn CA ĐÊM chưa mua nâng cấp "Mở ca đêm" (dòng 47–49, TRƯỚC ĐÂY 0%):
 *   đổi người sang ca đêm khi chưa có nâng cấp → báo lỗi và KHÔNG đổi ca (tiết lương ×1.5 vô ích);
 *   đã mua nâng cấp → đổi được, không báo.
 * - `trainStaff` nhánh LÊN SAO (dòng 68, TRƯỚC ĐÂY 0%): đào tạo đủ kinh nghiệm → lên N★,
 *   lương tăng RAISE_PER_STAR, báo "học xong lên N★".
 */

const st = (over: Partial<Staff> = {}): Staff => ({
  id: 1, name: 'Nhân viên', role: 'cook', skill: 1, wage: 50_000, shift: 'morning', trait: 'steady', ...over,
});

const prep = (staff: Staff[], toasts: string[] = [], biz?: Record<string, unknown>) =>
  useGame.setState({
    ...newGameData(),
    money: 1_000_000,
    staff,
    ...(biz ? { biz: { ...useGame.getState().biz, ...biz } } : {}),
    notify: (m) => void toasts.push(m),
  });

beforeEach(() => useGame.setState({ ...newGameData() }));

describe('setShift — ca đêm cần nâng cấp "Mở ca đêm"', () => {
  it('chưa mua nâng cấp ca đêm → báo lỗi, KHÔNG đổi ca', () => {
    const toasts: string[] = [];
    prep([st()], toasts);
    useGame.getState().setShift(1, 'night');
    const a = useGame.getState();
    expect(a.staff[0].shift).toBe('morning'); // không đổi
    expect(toasts.some((t) => t.includes('Ca đêm mở khi mua nâng cấp'))).toBe(true);
  });

  it('ĐÃ mua nâng cấp ca đêm → đổi sang ca đêm, không báo lỗi', () => {
    const toasts: string[] = [];
    prep([st()], toasts, { upgrades: ['night'] });
    useGame.getState().setShift(1, 'night');
    const a = useGame.getState();
    expect(a.staff[0].shift).toBe('night');
    expect(toasts.some((t) => t.includes('Ca đêm mở khi mua nâng cấp'))).toBe(false);
  });

  it('đổi sang ca SÁNG không chạy guard → đổi bình thường', () => {
    const toasts: string[] = [];
    prep([{ ...st(), shift: 'afternoon' }], toasts);
    useGame.getState().setShift(1, 'morning');
    expect(useGame.getState().staff[0].shift).toBe('morning');
  });
});

describe('trainStaff — lên sao khi đủ kinh nghiệm', () => {
  it('đào tạo đủ kinh nghiệm → lên 2★, tăng lương, báo "học xong lên 2★"', () => {
    const toasts: string[] = [];
    prep([{ ...st(), skill: 1, exp: 2, trainedDay: 0 }], toasts); // exp 2 + TRAIN_EXP 4 = 6 ≥ expToNext(1)=4
    const before = useGame.getState();
    const cost = trainCost(1);
    before.trainStaff(1);
    const a = useGame.getState();
    expect(a.staff[0].skill).toBe(2);
    expect(a.staff[0].exp).toBe(2); // 6 − 4 = 2 (steady expMul 1)
    expect(a.staff[0].wage).toBe(Math.round((50_000 * 1.12) / 1000) * 1000);
    expect(a.money).toBe(before.money - cost);
    expect(toasts.some((t) => t.includes('học xong lên 2★'))).toBe(true);
  });

  it('chưa đủ kinh nghiệm → không đổi sao/lương, chỉ cộng exp, báo "học thêm"', () => {
    const toasts: string[] = [];
    prep([{ ...st(), skill: 2, exp: 0, trainedDay: 0 }], toasts); // expToNext(2)=8; 0+4=4 < 8 → chưa lên
    const before = useGame.getState();
    const cost = trainCost(2);
    before.trainStaff(1);
    const a = useGame.getState();
    expect(a.staff[0].skill).toBe(2);
    expect(a.staff[0].exp).toBe(4);
    expect(a.staff[0].wage).toBe(50_000); // không tăng lương
    expect(a.money).toBe(before.money - cost);
    expect(toasts.some((t) => t.includes('học thêm'))).toBe(true);
  });
});
