import { afterEach, describe, expect, it } from 'vitest';
import { useGame } from '../core/store';
import '../core/todoLegacy';
import { idleTodo, morningTodos, registerTodo, timedTodos, TODO_SOURCES, todos, urgencyAt, type TodoItem } from '../data/todo';
import { todayAgenda } from '../data/todayAgenda';
import { idleTip } from '../data/idle';
import { reputationOf } from '../data/reputation';

/**
 * SPEC-TOI-UU §T6 — SỔ VIỆC CHUNG. Một danh sách việc, nhiều nguồn; dải HUD / chip giờ vắng /
 * thẻ "Việc hôm nay" chỉ là ba cách nhìn. Quy ước: hệ mới `registerTodo` trong file data của mình.
 */

const item = (o: Partial<TodoItem> & { id: string }): TodoItem => ({ icon: '•', text: o.id, urgency: 'today', ...o });

afterEach(() => { delete TODO_SOURCES.__t1; delete TODO_SOURCES.__t2; });

describe('todos — gộp, lọc, xếp', () => {
  const s = useGame.getState();

  it('các nguồn có sẵn đã tự đăng ký (không cần ai sửa file chung)', () => {
    for (const name of ['agenda', 'idle', 'preserve', 'lifeEvent']) expect(typeof TODO_SOURCES[name]).toBe('function');
  });

  it('điền tên nguồn, khử trùng theo id, lọc việc đã qua giờ', () => {
    registerTodo('__t1', () => [item({ id: 'a' }), item({ id: 'het-gio', until: 100 })]);
    registerTodo('__t2', () => [item({ id: 'a', text: 'trùng' }), item({ id: 'b' })]);
    const mine = todos(s, 600).filter((t) => t.source?.startsWith('__t'));
    expect(mine.map((t) => t.id).sort()).toEqual(['a', 'b']);
    expect(mine.find((t) => t.id === 'a')!.source).toBe('__t1');
  });

  it('xếp: now → today → idle; cùng mức thì hạn sớm trước, rồi tiền lớn trước', () => {
    registerTodo('__t1', () => [
      item({ id: 'ranh', urgency: 'idle' }),
      item({ id: 'nho', value: 10 }),
      item({ id: 'lon', value: 500 }),
      item({ id: 'han', until: 900 }),
      item({ id: 'gap', urgency: 'now' }),
    ]);
    const mine = todos(s, 600).filter((t) => t.source === '__t1').map((t) => t.id);
    expect(mine).toEqual(['gap', 'han', 'lon', 'nho', 'ranh']);
  });

  it('urgencyAt: còn ≤ 60 phút tới mốc là now', () => {
    expect(urgencyAt(600, 661)).toBe('today');
    expect(urgencyAt(600, 660)).toBe('now');
    expect(urgencyAt(600, 300)).toBe('now');
  });

  it('ba cách nhìn: dải HUD = việc có giờ theo thứ tự giờ; chip = việc idle; Sổ đầu ngày = việc morning', () => {
    const list = [item({ id: 'x', at: 900 }), item({ id: 'y', at: 300 }), item({ id: 'z', urgency: 'idle' }), item({ id: 'm', morning: true })];
    expect(timedTodos(list).map((t) => t.id)).toEqual(['y', 'x']);
    expect(idleTodo(list)!.id).toBe('z');
    expect(morningTodos(list).map((t) => t.id)).toEqual(['m']);
  });
});

describe('nguồn bọc cơ chế cũ — hành vi nhìn thấy không đổi', () => {
  it('dải HUD từ Sổ việc = đúng todayAgenda cũ (cùng chip, cùng thứ tự) ở ván mới', () => {
    const s = useGame.getState();
    for (const minutes of [6 * 60, 10 * 60, 14 * 60, 19 * 60]) {
      const old = todayAgenda({
        minutes, day: s.day, seed: s.weatherSeed, level: s.level, regulars: s.regulars, rep: reputationOf(s.repLog),
        reservations: s.reservations, regularArcs: s.biz.regularArcs, surpriseArc: s.biz.surpriseArc, cookJobs: s.cookJobs,
        stations: s.furniture.map((f) => f.type), storage: s.storage, hasCourier: s.staff.some((w) => w.role === 'courier'),
        contracts: s.contracts, order: s.order,
      });
      const strip = timedTodos(todos(s, minutes));
      expect(strip.map((t) => [t.id, t.text, t.at, t.until])).toEqual(old.map((o) => [o.key, o.label, o.atMinutes, o.untilMinutes]));
    }
  });

  it('chip giờ vắng từ Sổ việc = đúng idleTip cũ', () => {
    const s = useGame.getState();
    const tip = idleTip(s)!;
    const t = idleTodo(todos(s, 600))!;
    expect([t.icon, t.text]).toEqual([tip.icon, tip.text]);
  });
});
