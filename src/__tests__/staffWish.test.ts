import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { branchMorningPlan } from '../data/branchMorning';
import { BRANCH_SHIFTS, BRANCH_SHIFT_NAME, branchStaffWish, newBranch, STAFF_WISH_CHANCE, type BranchState } from '../data/branches';

/**
 * GĐ727/728/731 — nhân viên chi nhánh xin nghỉ/chuyển ca HÔM NAY: vẽ bằng băm riêng
 * branchStaffWish(weatherSeed, day) — mẫu GĐ717, không rút dòng simRng, autoplay giữ nguyên từng nhịp.
 * Người chơi quyết ở Sổ đầu ngày/Bảng nhân viên:
 *  - wish NGHỈ: 😴 Cho nghỉ hôm nay (restBranchStaffToday — restDay[id] = hôm nay, ca thiếu người thật,
 *    tối xả mệt) hoặc 😔 Giữ lại (denyStaffRest — mệt +10, ẩn dòng hôm nay; rủi ro mệt cao có sẵn).
 *  - wish CHUYỂN CA: ⏰ Chuyển ca (setBranchShift có sẵn) hoặc Giữ lại (bump 0 — không sao).
 */

const g = () => useGame.getState();
const crew = (id: number, name: string): { id: number; name: string } => ({ id, name });
const branchWith = (staff: { id: number; name: string }[]): BranchState =>
  ({ ...newBranch(), open: true, staff } as unknown as BranchState);

describe('branchStaffWish — băm riêng, 15% ngày có người xin', () => {
  it('400 ngày một seed: 10%–60 ngày có wish (p 0,15), cùng seed+ngày cùng người', () => {
    const b = branchWith([crew(1, 'nv1'), crew(2, 'nv2'), crew(3, 'nv3')]);
    let wishDays = 0;
    for (let d = 2; d <= 401; d++) {
      if (branchStaffWish(b, 1234, d)) wishDays++;
    }
    expect(wishDays).toBeGreaterThanOrEqual(30);
    expect(wishDays).toBeLessThanOrEqual(90);
    expect(branchStaffWish(b, 77, 12)).toEqual(branchStaffWish(b, 77, 12));
  });
  it('chọn người hợp lệ; người đang nghỉ hôm nay không xin; tiệm đóng/không người thì null', () => {
    const b = branchWith([crew(1, 'nv1'), crew(2, 'nv2')]);
    for (let d = 2; d <= 100; d++) {
      const w = branchStaffWish(b, 9, d);
      if (w) expect([1, 2]).toContain(w.id);
    }
    const resting: BranchState = { ...branchWith([crew(1, 'nv1')]), restDay: { 1: 12 } } as unknown as BranchState;
    expect(branchStaffWish(resting, 9, 12)).toBeNull();
    expect(branchStaffWish(branchWith([]), 9, 12)).toBeNull();
    expect(branchStaffWish({ ...branchWith([crew(1, 'nv1')]), open: false } as unknown as BranchState, 9, 12)).toBeNull();
  });
});

describe('GĐ731 — hai loại wish: nghỉ (~60%) và chuyển ca (~40%)', () => {
  it('400 ngày một seed: nghỉ là loại chính; ca đích khác ca hiện tại và nằm trong BRANCH_SHIFTS', () => {
    const b = branchWith([crew(1, 'nv1'), crew(2, 'nv2')]);
    let nghi = 0;
    let ca = 0;
    for (let d = 2; d <= 401; d++) {
      const w = branchStaffWish(b, 1234, d);
      if (!w) continue;
      if (w.kind === 'nghỉ') nghi++;
      if (w.kind === 'ca') {
        ca++;
        expect(BRANCH_SHIFTS).toContain(w.toShift);
        const cur = b.staff.find((x) => x.id === w.id);
        expect(w.toShift).not.toBe(cur!.shift);
      }
    }
    expect(nghi + ca).toBeGreaterThan(0);
    expect(nghi).toBeGreaterThan(ca); // nghỉ là loại chính (~60%)
    expect(ca).toBeGreaterThanOrEqual(12); // ~40% của ~60 wish ngày (binomial 24±4, mốc −3σ)
    expect(nghi).toBeGreaterThanOrEqual(20); // ~60% của ~60 wish ngày (36±3,7, mốc −3σ)
  });
  it('dòng morning theo loại: nghỉ → "xin nghỉ hôm nay"; ca → "xin chuyển sang" + tên ca đích', () => {
    const b = branchWith([crew(1, 'Bà Tám tổ trưởng')]);
    let restLine: string | null = null;
    let caLine: { text: string; label: string } | null = null;
    for (let d = 2; d <= 400 && (!restLine || !caLine); d++) {
      const w = branchStaffWish(b, 555, d);
      if (!w) continue;
      const chores = branchMorningPlan(b, 10, {}, d, 555);
      if (!restLine && w.kind === 'nghỉ') restLine = chores.find((c) => c.text.includes('xin nghỉ hôm nay'))?.text ?? null;
      if (!caLine && w.kind === 'ca') caLine = { text: chores.find((c) => c.text.includes('xin chuyển sang'))?.text ?? '', label: BRANCH_SHIFT_NAME[w.toShift ?? 'afternoon'].slice(0, 7) };
    }
    expect(restLine, '400 ngày phải có ngày xin nghỉ').not.toBeNull();
    expect(restLine).toContain('Bà Tám tổ trưởng');
    expect(caLine, '400 ngày phải có ngày xin chuyển ca').not.toBeNull();
    expect(caLine!.text).toContain('Bà Tám tổ trưởng');
    expect(caLine!.text).toContain(caLine!.label); // tên ca đích thật hiện trong dòng
  });
});

describe('branchMorningPlan — không seed thì không bao giờ có dòng wish (hành vi cũ)', () => {
  it('60 ngày không seed: không dòng xin nghỉ/chuyển ca', () => {
    const b = branchWith([crew(1, 'nv1')]);
    for (let d = 2; d <= 61; d++) {
      const chores = branchMorningPlan(b, 10, {}, d).map((c) => c.text);
      expect(chores.some((t) => t.includes('xin nghỉ hôm nay') || t.includes('xin chuyển sang'))).toBe(false);
    }
  });
});

describe('restBranchStaffToday — restDay = HÔM NAY (khác restBranchStaff = mai)', () => {
  beforeEach(() => {
    useGame.setState({ ...newGameData(), day: 10, notify: () => {} });
    useGame.setState({ branch: { ...newBranch(), open: true, staff: [{ ...newBranch().staff[0], id: 5, name: 'nv5' }] } as never });
  });
  it('bấm Cho nghỉ hôm nay: restDay[5] = 10 (hôm nay), restBranchStaff vẫn = 11 (mai)', () => {
    useGame.getState().restBranchStaffToday(5);
    expect(g().branch?.restDay?.[5]).toBe(10);
    g().restBranchStaff(5);
    expect(g().branch?.restDay?.[5]).toBe(11);
  });
  it('id lạ: không đổi gì', () => {
    useGame.getState().restBranchStaffToday(99);
    expect(g().branch?.restDay?.[99]).toBeUndefined();
  });
});

describe('denyStaffRest — giữ lại người xin nghỉ', () => {
  beforeEach(() => {
    useGame.setState({ ...newGameData(), day: 10, notify: () => {} });
    useGame.setState({ branch: { ...newBranch(), open: true, staff: [{ ...newBranch().staff[0], id: 5, name: 'nv5' }] } as never });
  });
  it('GĐ728: giữ lại wish NGHỊ — mệt +10 (chặn trần 100), tin buồn, marker ẩn dòng', () => {
    let said = '';
    useGame.setState({ notify: (m: string) => { said = m; } });
    g().denyStaffRest(5);
    const b = g().branch!;
    expect(b.wishDenied?.[5]).toBe(10);
    expect(b.fatigue?.[5]).toBe(10);
    expect(said).toContain('mệt thêm 10');
    // trần 100
    useGame.setState({ branch: { ...b, fatigue: { 5: 95 } } as never });
    g().denyStaffRest(5);
    expect(g().branch!.fatigue?.[5]).toBe(100);
    // dòng ẩn khi denied, hiện lại khi xoá marker
    const b2 = { ...g().branch!, wishDenied: {} } as unknown as BranchState;
    for (let sd = 1; sd <= 300; sd++) {
      const w = branchStaffWish(b2, sd, 10);
      if (w?.id === 5) {
        expect(branchMorningPlan(b2, 10, {}, 10, sd).some((c) => c.text.includes('xin nghỉ hôm nay'))).toBe(true);
        break;
      }
    }
  });
  it('GĐ731: giữ lại wish CA — KHÔNG mệt (bump 0), tin ngại ngùng, vẫn ẩn dòng hôm nay', () => {
    let said = '';
    useGame.setState({ notify: (m: string) => { said = m; } });
    g().denyStaffRest(5, 0);
    const b = g().branch!;
    expect(b.wishDenied?.[5]).toBe(10);
    expect(b.fatigue?.[5] ?? 0).toBe(0);
    expect(said).toContain('ngại ngùng');
  });
  it('id lạ: không đổi gì', () => {
    g().denyStaffRest(99);
    expect(g().branch?.wishDenied?.[99]).toBeUndefined();
  });
});
