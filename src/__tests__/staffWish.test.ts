import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { branchMorningPlan } from '../data/branchMorning';
import { branchMorningPlan } from '../data/branchMorning';
import { branchStaffWish, newBranch, STAFF_WISH_CHANCE, type BranchState } from '../data/branches';

/**
 * GĐ727 — nhân viên chi nhánh xin nghỉ HÔM NAY: vẽ bằng băm riêng weatherSeed+ngày (mẫu GĐ717 —
 * không rút dòng simRng, autoplay giữ nguyên từng nhịp). Người chơi quyết ở Sổ đầu ngày/Bảng nhân viên:
 * Cho nghỉ (restBranchStaffToday — restDay[id] = HÔM NAY, ca thiếu người thật, tối xả mệt) hoặc giữ lại
 * (không bấm — mệt dồn tự nhiên, rủi ro bỏ việc/xin nghỉ đột xuất có sẵn).
 */

const crew = (id: number, name: string): { id: number; name: string } => ({ id, name });
const branchWith = (staff: { id: number; name: string }[]): BranchState =>
  ({ ...newBranch(), open: true, staff } as unknown as BranchState);

describe('branchStaffWish — băm riêng, 15% ngày có người xin', () => {
  it('400 ngày một seed: 10%–60 ngày có wish (p 0,15), cùng seed+ngày cùng người', () => {
    const b = branchWith([crew(1, 'nv1'), crew(2, 'nv2'), crew(3, 'nv3')]);
    let wishDays = 0;
    for (let d = 2; d <= 401; d++) {
      const w = branchStaffWish(b, 1234, d);
      if (w) wishDays++;
    }
    expect(wishDays).toBeGreaterThanOrEqual(30);
    expect(wishDays).toBeLessThanOrEqual(90);
    expect(branchStaffWish(b, 77, 12)).toEqual(branchStaffWish(b, 77, 12));
  });
  it('chọn người hợp lệ trong danh sách; người đang nghỉ hôm nay không xin nữa; tiệm đóng/không người thì null', () => {
    const b = branchWith([crew(1, 'nv1'), crew(2, 'nv2')]);
    for (let d = 2; d <= 100; d++) {
      const w = branchStaffWish(b, 9, d);
      if (w) expect([1, 2]).toContain(w.id);
    }
    // người duy nhất đang nghỉ → không ai xin
    const resting: BranchState = { ...branchWith([crew(1, 'nv1')]), restDay: { 1: 12 } } as unknown as BranchState;
    expect(branchStaffWish(resting, 9, 12)).toBeNull();
    expect(branchStaffWish(branchWith([]), 9, 12)).toBeNull();
    expect(branchStaffWish({ ...branchWith([crew(1, 'nv1')]), open: false } as unknown as BranchState, 9, 12)).toBeNull();
  });
});

describe('branchMorningPlan — dòng xin nghỉ (chỉ khi truyền seed)', () => {
  const b = branchWith([crew(1, 'Bà Tám tổ trưởng')]);
  it('có seed + ngày trúng wish: dòng 😴 với tên người; không seed: không bao giờ có dòng', () => {
    let found: string | null = null;
    for (let d = 2; d <= 200 && !found; d++) {
      const chores = branchMorningPlan(b, 10, {}, d, 555);
      const line = chores.find((c) => c.text.includes('xin nghỉ hôm nay'));
      if (line) found = line.text;
    }
    expect(found).toContain('Bà Tám tổ trưởng');
    expect(found).toContain('Nhân viên');
    // không seed → không dòng (hành vi cũ cho test cũ)
    for (let d = 2; d <= 60; d++) {
      expect(branchMorningPlan(b, 10, {}, d).some((c) => c.text.includes('xin nghỉ hôm nay'))).toBe(false);
    }
  });
});

describe('GĐ728 — denyStaffRest: giữ lại thì mệt thêm và ẩn dòng xin nghỉ', () => {
  beforeEach(() => {
    useGame.setState({ ...newGameData(), day: 10, notify: () => {} });
    useGame.setState({ branch: { ...newBranch(), open: true, staff: [{ ...newBranch().staff[0], id: 5, name: 'nv5' }] } as never });
  });
  it('bấm Giữ lại: wishDenied[5] = 10, mệt +10 (chặn trần 100), tin báo buồn', () => {
    let said = '';
    useGame.setState({ notify: (m: string) => { said = m; } });
    useGame.getState().denyStaffRest(5);
    const b = useGame.getState().branch!;
    expect(b.wishDenied?.[5]).toBe(10);
    expect(b.fatigue?.[5]).toBe(10);
    expect(said).toContain('mệt thêm 10');
  });
  it('mệt cộng dồn và chặn ở 100; dòng wish trong Sổ đầu ngày ẩn khi đã giữ lại', () => {
    useGame.setState({ branch: { ...useGame.getState().branch!, fatigue: { 5: 95 } } as never });
    useGame.getState().denyStaffRest(5);
    expect(useGame.getState().branch!.fatigue?.[5]).toBe(100);
    // dòng ẩn: seed đúng ngày, wish active nhưng wishDenied chặn
    const b = useGame.getState().branch!;
    for (let sd = 1; sd <= 300; sd++) {
      const w = branchStaffWish(b, sd, 10);
      if (w?.id === 5) {
        const chores = branchMorningPlan(b, 10, {}, 10, sd);
        expect(chores.some((c) => c.text.includes('xin nghỉ hôm nay'))).toBe(false);
        // xoá marker denied → dòng hiện lại đúng ngày đó (marker điều khiển việc ẩn, không phải ngày)
        const b2 = { ...b, wishDenied: {} } as unknown as BranchState;
        expect(branchMorningPlan(b2, 10, {}, 10, sd).some((c) => c.text.includes('xin nghỉ hôm nay'))).toBe(true);
        return;
      }
    }
  });
  it('id lạ: không đổi gì', () => {
    useGame.getState().denyStaffRest(99);
    expect(useGame.getState().branch?.wishDenied?.[99]).toBeUndefined();
  });
});

describe('restBranchStaffToday — restDay = HÔM NAY (khác restBranchStaff = mai)', () => {
  beforeEach(() => {
    useGame.setState({ ...newGameData(), day: 10, notify: () => {} });
    useGame.setState({ branch: { ...newBranch(), open: true, staff: [{ ...newBranch().staff[0], id: 5, name: 'nv5' }] } as never });
  });
  it('bấm Cho nghỉ hôm nay: restDay[5] = 10 (hôm nay), restBranchStaff vẫn = 11 (mai)', () => {
    useGame.getState().restBranchStaffToday(5);
    expect(useGame.getState().branch?.restDay?.[5]).toBe(10);
    useGame.setState({ day: 10 });
    useGame.getState().restBranchStaff(5);
    expect(useGame.getState().branch?.restDay?.[5]).toBe(11);
  });
  it('id lạ: không đổi gì', () => {
    useGame.getState().restBranchStaffToday(99);
    expect(useGame.getState().branch?.restDay?.[99]).toBeUndefined();
  });
});
