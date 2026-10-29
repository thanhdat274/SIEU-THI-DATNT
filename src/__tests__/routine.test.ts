import { describe, expect, it } from 'vitest';
import { newRoutineMarks, planRoutine, type RoutineMarks, type RoutineSnapshot } from '../core/routine';
import { ROUTINE } from '../core/gameTypes';

/** Lịch tự động: đóng cửa 22h30, kiểm kê & về nhà 23h — phải chạy y nhau ở 1×, 3×, 8×. */

const snap = (minutes: number, extra: Partial<RoutineSnapshot> = {}): RoutineSnapshot => ({
  day: 2, minutes, autoRoutine: true, atShop: true, shopOpen: true, ...extra,
});

/** Mốc buổi sáng đã làm xong (để test riêng phần buổi tối). */
const morningDone = (day = 2): RoutineMarks => ({ walkDay: day, openDay: day, closeDay: -1, homeDay: -1 });

/** Chạy lịch qua một dãy mốc giờ, trả về các lần việc gì đó thật sự xảy ra. */
function run(minutesList: number[], extra: Partial<RoutineSnapshot> = {}, marks: RoutineMarks = morningDone()) {
  const fired: { minutes: number; action: string }[] = [];
  for (const minutes of minutesList) {
    const todo = planRoutine(snap(minutes, extra), marks);
    marks = todo.marks;
    if (todo.walkToShop) fired.push({ minutes, action: 'walkToShop' });
    if (todo.openShop) fired.push({ minutes, action: 'openShop' });
    if (todo.closeShop) fired.push({ minutes, action: 'closeShop' });
    if (todo.goHome) fired.push({ minutes, action: 'goHome' });
    if (todo.stocktake) fired.push({ minutes, action: 'stocktake' });
  }
  return fired;
}

describe('lịch tự động: mốc buổi tối', () => {
  it('qua 22h30 thì đóng cửa, qua 23h thì kiểm kê + về nhà, mỗi việc một lần', () => {
    expect(run([22 * 60 + 20])).toEqual([]);
    expect(run([22 * 60 + 20, 22 * 60 + 31])).toEqual([{ minutes: 22 * 60 + 31, action: 'closeShop' }]);
    expect(run([22 * 60 + 31, 22 * 60 + 45, 23 * 60 + 1])).toEqual([
      { minutes: 22 * 60 + 31, action: 'closeShop' },
      { minutes: 23 * 60 + 1, action: 'goHome' },
      { minutes: 23 * 60 + 1, action: 'stocktake' },
    ]);
  });

  it('8× nhảy cóc qua cả hai mốc trong một khung vẫn đóng cửa + về nhà đủ', () => {
    // 8×: mỗi khung hình ~1.6 phút; tua từ 22:29 lên 00:20 chỉ qua vài khung
    const fired = run([22 * 60 + 20, 22 * 60 + 29, 22 * 60 + 47, 23 * 60 + 5, 23 * 60 + 21]);
    expect(fired.map((f) => f.action)).toEqual(['closeShop', 'goHome', 'stocktake']);
  });

  it('1×/3×/8× cho cùng kết quả: mỗi mốc chỉ một lần trong ngày', () => {
    const steps = {
      '1×': [22 * 60 + 20, 22 * 60 + 41, 23 * 60 + 2, 23 * 60 + 23, 24 * 60],
      '3×': [22 * 60 + 20, 22 * 60 + 26, 22 * 60 + 38, 22 * 60 + 50, 23 * 60 + 2, 23 * 60 + 14],
      '8×': [22 * 60 + 20, 22 * 60 + 28, 22 * 60 + 44, 22 * 60 + 60, 23 * 60 + 4, 23 * 60 + 20],
    };
    const got = Object.fromEntries(Object.entries(steps).map(([k, v]) => [k, run(v).map((f) => f.action)]));
    expect(new Set(Object.values(got).map((a) => a.join(','))).size).toBe(1);
    expect(got['1×']).toEqual(['closeShop', 'goHome', 'stocktake']);
  });

  it('bật lịch tự động giữa buổi tối (đã qua 23h) thì về nhà ngay, như 1× vẫn làm', () => {
    // Người chơi đứng trong tiệm lúc 1:24 rồi mới bật lịch (hoặc vừa nạp bản lưu) — trước đây kẹt luôn trong tiệm
    const todo = planRoutine(snap(24 * 60 + 84), newRoutineMarks());
    expect(todo.goHome).toBe(true);
    expect(todo.stocktake).toBe(true);
    expect(todo.closeShop).toBe(true);
    expect(todo.walkToShop).toBe(false);
  });

  it('đang ở ngoài tiệm lúc 23h vẫn nhận việc về nhà (nhân vật tự đi bộ về)', () => {
    const todo = planRoutine(snap(23 * 60 + 10, { atShop: false }), morningDone());
    expect(todo.goHome).toBe(true);
    expect(todo.walkToShop).toBe(false);
  });

  it('sang ngày mới thì lịch chạy lại từ đầu', () => {
    const marks: RoutineMarks = { walkDay: 2, openDay: 2, closeDay: 2, homeDay: 2 };
    const todo = planRoutine(snap(ROUTINE.goHome, { day: 3 }), marks);
    expect(todo.closeShop).toBe(true);
    expect(todo.goHome).toBe(true);
    expect(todo.marks.homeDay).toBe(3);
  });
});

describe('lịch tự động: mốc buổi sáng', () => {
  it('7h ra tiệm (nếu chưa ở tiệm), 8h mở cửa, mỗi việc một lần', () => {
    let marks: RoutineMarks = newRoutineMarks();
    const step = (minutes: number, atShop: boolean) => {
      const todo = planRoutine(snap(minutes, { atShop }), marks);
      marks = todo.marks;
      return todo;
    };
    expect(step(6 * 60 + 50, false).walkToShop).toBe(false);
    expect(step(7 * 60 + 5, false).walkToShop).toBe(true);
    expect(step(7 * 60 + 40, false).walkToShop).toBe(false); // cùng ngày, không lặp
    expect(step(8 * 60 + 5, false).openShop).toBe(true);
    expect(step(9 * 60, false).openShop).toBe(false);
  });

  it('đang ở tiệm lúc 7h thì không cần đi bộ ra nữa', () => {
    const todo = planRoutine(snap(7 * 60 + 10, { atShop: true }), newRoutineMarks());
    expect(todo.walkToShop).toBe(false);
  });
});

describe('lịch tự động: tắt thì không làm gì', () => {
  it('autoRoutine = false: không việc nào chạy, mốc giữ nguyên', () => {
    const marks = newRoutineMarks();
    const todo = planRoutine(snap(23 * 60 + 30, { autoRoutine: false }), marks);
    expect([todo.walkToShop, todo.openShop, todo.closeShop, todo.goHome, todo.stocktake]).toEqual([false, false, false, false, false]);
    expect(todo.marks).toEqual(marks);
  });
});

// ── GĐ275 — lịch tự động chỉnh được giờ mở cửa (6h–8h) ──
describe('autoOpenAt — giờ mở cửa theo người chơi (GĐ275)', () => {
  const fresh = (day = 2): RoutineMarks => ({ walkDay: -1, openDay: -1, closeDay: -1, homeDay: -1 });

  it('mặc định (save cũ không có autoOpenAt) = 8h: mở 8h, ra tiệm 7h — hành vi cũ nguyên vẹn', () => {
    const fired = run([6 * 60 + 30, 7 * 60, 8 * 60 - 1, 8 * 60], { autoOpenAt: undefined, atShop: false }, fresh());
    expect(fired).toEqual([
      { minutes: 7 * 60, action: 'walkToShop' },
      { minutes: 8 * 60, action: 'openShop' },
    ]);
  });

  it('autoOpenAt 6h: mở 6h đón nửa đầu giờ vàng, ra tiệm 5h', () => {
    const fired = run([5 * 60, 6 * 60], { autoOpenAt: 6 * 60, atShop: false }, fresh());
    expect(fired).toEqual([
      { minutes: 5 * 60, action: 'walkToShop' },
      { minutes: 6 * 60, action: 'openShop' },
    ]);
  });

  it('6h30: mở 6h30, ra tiệm 5h30', () => {
    const fired = run([5 * 60 + 29, 5 * 60 + 30, 6 * 60 + 30], { autoOpenAt: 6 * 60 + 30, atShop: false }, fresh());
    expect(fired).toEqual([
      { minutes: 5 * 60 + 30, action: 'walkToShop' },
      { minutes: 6 * 60 + 30, action: 'openShop' },
    ]);
  });

  it('mở sớm không đụng mốc tối: vẫn đóng 22h30, về 23h', () => {
    const fired = run([6 * 60, 22 * 60 + 31, 23 * 60 + 1], { autoOpenAt: 6 * 60 }, fresh());
    expect(fired.map((f) => f.action)).toEqual(['openShop', 'closeShop', 'goHome', 'stocktake']);
  });

  it('lịch tắt thì không mở dù autoOpenAt là gì', () => {
    expect(run([6 * 60, 8 * 60], { autoOpenAt: 6 * 60, autoRoutine: false }, fresh())).toEqual([]);
  });
});

// ── GĐ276 — dòng trạng thái lịch trên Sổ đầu ngày ──
import { autoOpenNote } from '../core/routine';

describe('autoOpenNote (GĐ276)', () => {
  it('lịch tắt → null; 8h → nhắc chỉnh; mở sớm → khẳng định đón trọn giờ vàng', () => {
    expect(autoOpenNote(480, false)).toBeNull();
    expect(autoOpenNote(undefined, false)).toBeNull();
    expect(autoOpenNote(480, true)).toBe('⏰ Lịch tự động mở cửa 8h — lỡ nửa đầu giờ vàng sáng (chỉnh trong menu hồ sơ).');
    expect(autoOpenNote(undefined, true)).toBe('⏰ Lịch tự động mở cửa 8h — lỡ nửa đầu giờ vàng sáng (chỉnh trong menu hồ sơ).'); // save cũ tự bù
    expect(autoOpenNote(360, true)).toBe('⏰ Lịch tự động mở cửa 6h — đón trọn giờ vàng sáng 6h–8h30.');
    expect(autoOpenNote(450, true)).toBe('⏰ Lịch tự động mở cửa 7h30 — đón trọn giờ vàng sáng 6h–8h30.');
  });
});
