import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame, type GameState } from '../core/store';
import { ngGoalProgress, NG_GOALS } from '../data/ngGoals';

/**
 * Bộ test GĐ140 — "Mục tiêu vòng tái sinh" (Slice 2 của audit deleg_7cea64c0):
 * sau khi đóng hộp đen quyết định tái sinh (GĐ139, preview), cho vòng NG+ một cuốn mục tiêu ngắn —
 * vài mốc thành tích đo theo VÒNG (chỉ state bị prestigeRestart RESET: level, staff, ordersDone,
 * supplierRel, marketClearedDay), nhận thưởng tiền qua action claimNgGoal (reset mỗi vòng).
 *
 * Hợp đồng: ngGoalProgress (thuần) + store action claimNgGoal; chạy node thuần (không three/React).
 */

const baseState = (): GameState => {
  const s = newGameData() as GameState;
  // Vòng NG+ đã bước vào lần 1
  s.biz.prestige = { level: 1, bonus: 0.08, goalsClaimed: [] };
  return s;
};

const prog = (s: GameState) =>
  ngGoalProgress({
    prestigeLevel: s.biz.prestige.level,
    level: s.level,
    staffCount: s.staff.length,
    ordersDone: s.ordersDone,
    supplierRel: s.biz.supplierRel ?? {},
    marketClearedDay: s.marketClearedDay,
  });

const doneOf = (s: GameState) => {
  const m = new Map(prog(s).map((g) => [g.id, g.done]));
  return (id: string) => m.get(id);
};

describe('ngGoalProgress — thuần, đo theo VÒNG', () => {
  beforeEach(() => useGame.setState({ ...newGameData() }));

  it('định nghĩa đủ 5 mục tiêu với tiêu diện NG+', () => {
    expect(NG_GOALS.map((g) => g.id)).toEqual(['ng_cho_first', 'ng_rel_t2', 'ng_worker_3', 'ng_orders_20', 'ng_level_40']);
    for (const g of NG_GOALS) {
      expect(g.reward).toBeGreaterThan(0);
      expect(typeof g.done).toBe('function');
    }
  });

  it('ván mới (vòng 1, mọi state mặc định) chưa đạt mốc nào', () => {
    const s = newGameData() as GameState; // prestige 0, level 1, staff 0, ordersDone 0, marketClearedDay 0
    const done = doneOf(s);
    for (const g of NG_GOALS) expect(done(g.id)).toBe(false);
  });

  it('ng_cho_first đạt khi đã bán mẻ chợ phiên trong vòng (marketClearedDay>0)', () => {
    const s = baseState(); s.marketClearedDay = 12;
    const done = doneOf(s);
    expect(done('ng_cho_first')).toBe(true);
    expect(done('ng_level_40')).toBe(false);
  });

  it('ng_rel_t2 đạt khi dồn mua một mối lên bậc 2; topRelTier lấy bậc cao nhất', () => {
    const s = baseState();
    s.biz.supplierRel = { daily: { spent: 3_000_000, orders: 4 }, cho: { spent: 13_000_000, orders: 6 } };
    const done = doneOf(s);
    expect(done('ng_rel_t2')).toBe(true); // cho 13M → bậc 2
    // chỉ mối bậc 1 thì chưa đạt
    const s2 = baseState();
    s2.biz.supplierRel = { daily: { spent: 3_000_000, orders: 4 } };
    expect(doneOf(s2)('ng_rel_t2')).toBe(false);
  });

  it('ng_worker_3 đạt khi thuê 3 nhân viên trong vòng', () => {
    const s = baseState();
    const mk = (id: string) => ({ id, name: id } as unknown as GameState['staff'][number]);
    s.staff = [mk('a'), mk('b'), mk('c')];
    expect(doneOf(s)('ng_worker_3')).toBe(true);
  });

  it('ng_orders_20 đạt khi giao 20 đơn đặt trước trong vòng', () => {
    const s = baseState();
    s.ordersDone = 19;
    expect(doneOf(s)('ng_orders_20')).toBe(false);
    s.ordersDone = 20;
    expect(doneOf(s)('ng_orders_20')).toBe(true);
  });

  it('ng_level_40 đạt khi về cấp 40 trong vòng mới', () => {
    const s = baseState();
    s.level = 39;
    expect(doneOf(s)('ng_level_40')).toBe(false);
    s.level = 40;
    expect(doneOf(s)('ng_level_40')).toBe(true);
  });

  it('tổng hợp: ở tiệm tiến xa, nhiều mốc cùng đạt', () => {
    const s = baseState();
    s.level = 55; s.ordersDone = 25; s.marketClearedDay = 30;
    const mk = (id: string) => ({ id, name: id } as unknown as GameState['staff'][number]);
    s.staff = [mk('a'), mk('b'), mk('c')];
    s.biz.supplierRel = { cho: { spent: 50_000_000, orders: 20 } }; // bậc 3
    const done = doneOf(s);
    for (const id of ['ng_cho_first', 'ng_rel_t2', 'ng_worker_3', 'ng_orders_20', 'ng_level_40']) {
      expect(done(id)).toBe(true);
    }
  });
});

describe('claimNgGoal — action store', () => {
  beforeEach(() => useGame.setState({ ...newGameData() }));

  it('từ chối khi chưa bước vào NG+ (prestige level 0)', () => {
    const s = newGameData() as GameState; // prestige 0
    s.marketClearedDay = 5;
    useGame.setState({ ...s });
    expect(useGame.getState().claimNgGoal('ng_cho_first')).toBe(false);
  });

  it('nhận một mục tiêu đã đạt: cộng tiền + đánh dấu đã nhận, hàm trả true', () => {
    const s = baseState();
    s.level = 40; // ng_level_40 sẵn đạt
    const moneyBefore = s.money;
    useGame.setState({ ...s });
    const st = useGame.getState();
    expect(st.claimNgGoal('ng_level_40')).toBe(true);
    const after = useGame.getState();
    const goal = NG_GOALS.find((g) => g.id === 'ng_level_40')!;
    expect(after.money).toBe(moneyBefore + goal.reward);
    expect(after.biz.prestige.goalsClaimed).toContain('ng_level_40');
  });

  it('từ chối khi mục tiêu chưa đạt', () => {
    const s = baseState(); // level 1, không đạt mốc nào
    useGame.setState({ ...s });
    expect(useGame.getState().claimNgGoal('ng_level_40')).toBe(false);
    expect(useGame.getState().money).toBe(s.money);
  });

  it('từ chối khi đã nhận rồi (không nhận lần hai)', () => {
    const s = baseState();
    s.level = 40;
    s.biz.prestige = { level: 1, bonus: 0.08, goalsClaimed: ['ng_level_40'] };
    useGame.setState({ ...s });
    expect(useGame.getState().claimNgGoal('ng_level_40')).toBe(false);
    expect(useGame.getState().money).toBe(s.money);
  });

  it('chỉ nhận đúng từng mục tiêu, không kéo theo mốc khác chưa đạt', () => {
    const s = baseState();
    s.level = 40; s.marketClearedDay = 9;
    useGame.setState({ ...s });
    expect(useGame.getState().claimNgGoal('ng_level_40')).toBe(true);
    const after = useGame.getState();
    expect(after.biz.prestige.goalsClaimed).toEqual(['ng_level_40']);
    // mốc khác cũng đạt nhưng chưa nhận vẫn còn thưởng riêng
    expect(after.claimNgGoal('ng_cho_first')).toBe(true);
  });
});
