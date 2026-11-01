import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame, type GameState } from '../core/store';
import { ngGoalProgress, NG_GOALS } from '../data/ngGoals';

/**
 * Bộ test GĐ140 — "Mục tiêu vòng tái sinh" (Slice 2 của audit deleg_7cea64c0):
 * sau khi đóng hộp đen quyết định tái sinh (GĐ139, preview), cho vòng NG+ một cuốn mục tiêu ngắn —
 * vài mốc thành tích đo theo VÒNG (chỉ state bị prestigeRestart RESET: level, staff, ordersDone,
 * supplierRel, marketClearedDay), nhận thưởng tiền qua action claimNgGoal (reset mỗi vòng).
 *
 * GĐ171 CẬP NHẬT CÓ CHỦ Ý: target/thưởng nhân theo vòng (runTargetScale/runRewardScale).
 * `baseState()` dùng prestige.level = 1 tức là VÒNG 2 → target gốc ×1.5, thưởng ×1.3 (ví dụ:
 * mục tiêu "cấp 40" ở vòng 2 đòi cấp 60, "20 đơn" đòi 30 đơn). Các ngưỡng số dưới đây đã chỉnh
 * theo vòng 2; công thức scale + trần + vòng 1 giữ nguyên test ở `ngGoalsRun.test.ts`.
 */

const baseState = (): GameState => {
  const s = newGameData() as GameState;
  // Vòng NG+ đã bước vào lần 1 → VÒNG 2 (mục tiêu ×1.5, thưởng ×1.3)
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
    rivalsBeaten: s.biz.rivalsBeaten,
  });

const doneOf = (s: GameState) => {
  const m = new Map(prog(s).map((g) => [g.id, g.done]));
  return (id: string) => m.get(id);
};

describe('ngGoalProgress — thuần, đo theo VÒNG', () => {
  beforeEach(() => useGame.setState({ ...newGameData() }));

  it('định nghĩa đủ 7 mục tiêu với tiêu diện NG+', () => {
    expect(NG_GOALS.map((g) => g.id)).toEqual([
      'ng_cho_first', 'ng_rel_t2', 'ng_worker_3', 'ng_orders_20', 'ng_rival_2', 'ng_level_40', 'ng_level_50',
    ]);
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
    expect(done('ng_level_50')).toBe(false);
  });

  it('ng_rel_t2 ở VÒNG 2 đòi bậc 3 (2×1.5); bậc 2 chưa đủ, bậc 3 đạt', () => {
    const s = baseState();
    s.biz.supplierRel = { daily: { spent: 3_000_000, orders: 4 }, cho: { spent: 13_000_000, orders: 6 } };
    const done = doneOf(s);
    expect(done('ng_rel_t2')).toBe(false); // cho 13M → bậc 2 — vòng 2 cần bậc 3
    // chỉ mối bậc 1 thì càng chưa đạt
    const s2 = baseState();
    s2.biz.supplierRel = { daily: { spent: 3_000_000, orders: 4 } };
    expect(doneOf(s2)('ng_rel_t2')).toBe(false);
    // bậc 3 (30M) đạt
    const s3 = baseState();
    s3.biz.supplierRel = { cho: { spent: 30_000_000, orders: 8 } };
    expect(doneOf(s3)('ng_rel_t2')).toBe(true);
  });

  it('ng_worker_3 ở VÒNG 2 đòi 5 nhân viên cùng lúc (3×1.5)', () => {
    const s = baseState();
    const mk = (id: string) => ({ id, name: id } as unknown as GameState['staff'][number]);
    s.staff = [mk('a'), mk('b'), mk('c')];
    expect(doneOf(s)('ng_worker_3')).toBe(false); // 3 người — chỉ đủ vòng 1
    s.staff = [mk('a'), mk('b'), mk('c'), mk('d'), mk('e')];
    expect(doneOf(s)('ng_worker_3')).toBe(true);
  });

  it('ng_orders_20 ở VÒNG 2 đòi giao 30 đơn (20×1.5)', () => {
    const s = baseState();
    s.ordersDone = 29;
    expect(doneOf(s)('ng_orders_20')).toBe(false);
    s.ordersDone = 30;
    expect(doneOf(s)('ng_orders_20')).toBe(true);
  });

  it('ng_rival_2 đo rivalsBeaten TRONG VÒNG — ở VÒNG 2 đòi hạ 3 đối thủ (2×1.5)', () => {
    const s = baseState();
    s.biz.rivalsBeaten = 2;
    expect(doneOf(s)('ng_rival_2')).toBe(false);
    s.biz.rivalsBeaten = 3;
    expect(doneOf(s)('ng_rival_2')).toBe(true);
  });

  it('ng_level_40 ở VÒNG 2 đòi cấp 60 (40×1.5)', () => {
    const s = baseState();
    s.level = 59;
    expect(doneOf(s)('ng_level_40')).toBe(false);
    s.level = 60;
    expect(doneOf(s)('ng_level_40')).toBe(true);
  });

  it('ng_level_50 là mốc CỨNG không nhân — vòng nào cũng đòi đúng cấp 50', () => {
    const s3 = baseState();
    s3.biz.prestige = { level: 2, bonus: 0.16, goalsClaimed: [] }; // vòng 3
    s3.level = 49;
    expect(doneOf(s3)('ng_level_50')).toBe(false);
    s3.level = 50;
    expect(doneOf(s3)('ng_level_50')).toBe(true);
  });

  it('tổng hợp: ở tiệm tiến xa vòng 2, mọi mốc cùng đạt', () => {
    const s = baseState();
    s.level = 60; s.ordersDone = 30; s.marketClearedDay = 30; s.biz.rivalsBeaten = 3;
    const mk = (id: string) => ({ id, name: id } as unknown as GameState['staff'][number]);
    s.staff = [mk('a'), mk('b'), mk('c'), mk('d'), mk('e')];
    s.biz.supplierRel = { cho: { spent: 50_000_000, orders: 20 } }; // bậc 3
    const done = doneOf(s);
    for (const id of ['ng_cho_first', 'ng_rel_t2', 'ng_worker_3', 'ng_orders_20', 'ng_rival_2', 'ng_level_40', 'ng_level_50']) {
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

  it('nhận một mục tiêu đã đạt: cộng tiền (đÃ NHÂN theo vòng) + đánh dấu đã nhận, hàm trả true', () => {
    const s = baseState();
    s.level = 60; // ng_level_40 ở vòng 2 đòi cấp 60
    const moneyBefore = s.money;
    useGame.setState({ ...s });
    const st = useGame.getState();
    expect(st.claimNgGoal('ng_level_40')).toBe(true);
    const after = useGame.getState();
    const goal = prog(s).find((g) => g.id === 'ng_level_40')!;
    expect(goal.reward).toBe(1_950_000); // 1.5M × 1.3 (vòng 2)
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
    s.level = 60;
    s.biz.prestige = { level: 1, bonus: 0.08, goalsClaimed: ['ng_level_40'] };
    useGame.setState({ ...s });
    expect(useGame.getState().claimNgGoal('ng_level_40')).toBe(false);
    expect(useGame.getState().money).toBe(s.money);
  });

  it('chỉ nhận đúng từng mục tiêu, không kéo theo mốc khác chưa đạt', () => {
    const s = baseState();
    s.level = 60; s.marketClearedDay = 9;
    useGame.setState({ ...s });
    expect(useGame.getState().claimNgGoal('ng_level_40')).toBe(true);
    const after = useGame.getState();
    expect(after.biz.prestige.goalsClaimed).toEqual(['ng_level_40']);
    // mốc khác cũng đạt nhưng chưa nhận vẫn còn thưởng riêng
    expect(after.claimNgGoal('ng_cho_first')).toBe(true);
  });
});
