import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame, type GameState } from '../core/store';
import { ngGoalProgress, NG_GOALS, runRewardScale, runTargetScale, NG_GOAL_RUN_SCALE_MAX, NG_GOAL_REWARD_SCALE_MAX } from '../data/ngGoals';
import { prestigeRestart } from '../core/prestige';
import { TITLES } from '../data/titles';

/**
 * Bộ test GĐ171 — "NG+: mục tiêu vòng nhân theo vòng + thêm mục tiêu đo trong vòng" (audit tiến trình 29/10,
 * backlog mục 5 — phát hiện "cảng cuối": vòng 2 là chơi lại y nguyên + một hệ số, mục tiêu vòng GĐ140 giống
 * hệt vòng 1, thưởng tiền cho người thừa tiền).
 *
 * Hợp đồng:
 * - runTargetScale / runRewardScale: công thức ×(1+0.5×(N−1)) trần ×3 và ×(1+0.3×(N−1)) trần ×2.5 (N = vòng = prestigeLevel+1).
 * - ngGoalProgress: vòng 1 (prestige 0) giữ nguyên target/thưởng gốc; vòng sau nhân, trần theo hệ thống (bậc mối 5, cấp 100).
 * - 2 mục tiêu mới đo TRONG VÒNG nhờ GĐ170 (prestigeRestart reset rivalsBeaten = 0): ng_rival_2 (nhân theo vòng), ng_level_50 (mốc cứng).
 * - prestigeRestart: goalsClaimed reset → mục tiêu vòng không kẹt ở vòng cũ; rival/rivalsBeaten khởi lại 0.
 * - Danh hiệu 'chu_hem_lao_lang' (Chủ hẻm lão làng): checkTitles mở khi TRỌN BỘ mục tiêu vòng đạt.
 * Chạy node thuần (không three/React), mẫu test GĐ140.
 */

const doneOf = (prestigeLevel: number, over: Partial<{ level: number; staff: number; orders: number; rivals: number; tier: number; market: number }> = {}) => {
  const m = new Map(
    ngGoalProgress({
      prestigeLevel,
      level: over.level ?? 1,
      staffCount: over.staff ?? 0,
      ordersDone: over.orders ?? 0,
      supplierRel: over.tier ? { cho: { spent: [0, 3_000_000, 12_000_000, 30_000_000, 70_000_000, 150_000_000][over.tier], orders: 1 } } : {},
      marketClearedDay: over.market ?? 0,
      rivalsBeaten: over.rivals ?? 0,
    }).map((g) => [g.id, g.done]),
  );
  return (id: string) => m.get(id);
};

const rewardOf = (prestigeLevel: number, id: string) =>
  ngGoalProgress({
    prestigeLevel, level: 1, staffCount: 0, ordersDone: 0, supplierRel: {}, marketClearedDay: 0, rivalsBeaten: 0,
  }).find((g) => g.id === id)!.reward;

describe('GĐ171 — hệ số nhân theo vòng: công thức + trần', () => {
  it('runTargetScale: vòng 1 ×1, vòng 2 ×1.5, vòng 3 ×2, trần ×3 từ vòng 5', () => {
    expect(runTargetScale(0)).toBe(1);
    expect(runTargetScale(1)).toBe(1.5);
    expect(runTargetScale(2)).toBe(2);
    expect(runTargetScale(3)).toBe(2.5);
    expect(runTargetScale(4)).toBe(NG_GOAL_RUN_SCALE_MAX); // vòng 5 chạm trần ×3
    expect(runTargetScale(6)).toBe(NG_GOAL_RUN_SCALE_MAX);
  });

  it('runRewardScale: vòng 1 ×1, vòng 2 ×1.3, trần ×2.5 từ vòng 6', () => {
    expect(runRewardScale(0)).toBe(1);
    expect(runRewardScale(1)).toBe(1.3);
    expect(runRewardScale(2)).toBe(1.6);
    expect(runRewardScale(4)).toBe(2.2);
    expect(runRewardScale(5)).toBe(NG_GOAL_REWARD_SCALE_MAX); // vòng 6 chạm trần ×2.5
    expect(runRewardScale(6)).toBe(NG_GOAL_REWARD_SCALE_MAX);
  });

  it('thưởng nhân CHẬM hơn target (0.3 vs 0.5 mỗi vòng) — vòng sau khó hơn nhanh hơn đền bù', () => {
    for (let p = 1; p <= 6; p++) {
      expect(runRewardScale(p)).toBeLessThanOrEqual(runTargetScale(p));
    }
  });
});

describe('GĐ171 — vòng 1 giữ nguyên, vòng sau nhân theo công thức', () => {
  it('VÒNG 1 (prestige 0): target + thưởng đúng gốc GĐ140', () => {
    // target gốc: bậc 2, 3 nhân viên, 20 đơn, 2 rival, cấp 40
    expect(doneOf(0, { tier: 2 })('ng_rel_t2')).toBe(true);
    expect(doneOf(0, { tier: 1 })('ng_rel_t2')).toBe(false);
    expect(doneOf(0, { staff: 3 })('ng_worker_3')).toBe(true);
    expect(doneOf(0, { staff: 2 })('ng_worker_3')).toBe(false);
    expect(doneOf(0, { orders: 20 })('ng_orders_20')).toBe(true);
    expect(doneOf(0, { orders: 19 })('ng_orders_20')).toBe(false);
    expect(doneOf(0, { rivals: 2 })('ng_rival_2')).toBe(true);
    expect(doneOf(0, { rivals: 1 })('ng_rival_2')).toBe(false);
    expect(doneOf(0, { level: 40 })('ng_level_40')).toBe(true);
    expect(doneOf(0, { level: 39 })('ng_level_40')).toBe(false);
    // thưởng gốc đúng def
    expect(rewardOf(0, 'ng_cho_first')).toBe(600_000);
    expect(rewardOf(0, 'ng_level_40')).toBe(1_500_000);
  });

  it('VÒNG 2 (prestige 1): target ×1.5, thưởng ×1.3', () => {
    expect(doneOf(1, { tier: 3 })('ng_rel_t2')).toBe(true); // 2×1.5 = 3
    expect(doneOf(1, { tier: 2 })('ng_rel_t2')).toBe(false);
    expect(doneOf(1, { staff: 5 })('ng_worker_3')).toBe(true); // 3×1.5 → 5 (round 4.5)
    expect(doneOf(1, { orders: 30 })('ng_orders_20')).toBe(true);
    expect(doneOf(1, { orders: 29 })('ng_orders_20')).toBe(false);
    expect(doneOf(1, { rivals: 3 })('ng_rival_2')).toBe(true);
    expect(doneOf(1, { rivals: 2 })('ng_rival_2')).toBe(false);
    expect(doneOf(1, { level: 60 })('ng_level_40')).toBe(true); // 40×1.5 = 60
    expect(rewardOf(1, 'ng_cho_first')).toBe(780_000); // 600k × 1.3
    expect(rewardOf(1, 'ng_level_40')).toBe(1_950_000); // 1.5M × 1.3
  });

  it('trần target theo hệ thống: bậc mối ≤ 5, cấp ≤ 100 — không thành mốc bất khả thi', () => {
    // vòng 5+ (scale ×3): bậc 2×3=6 → bó 5; cấp 40×3=120 → bó 100
    expect(doneOf(4, { tier: 5 })('ng_rel_t2')).toBe(true);
    expect(doneOf(4, { tier: 4 })('ng_rel_t2')).toBe(false);
    expect(doneOf(4, { level: 100 })('ng_level_40')).toBe(true);
    expect(doneOf(6, { level: 100 })('ng_level_40')).toBe(true);
    // rival ×3 = 6 — trong tầm (RIVAL_BOSS_GEN = 12 mỗi vòng)
    expect(doneOf(4, { rivals: 6 })('ng_rival_2')).toBe(true);
  });

  it('ng_level_50 là mốc CỨNG: mọi vòng đều đòi đúng cấp 50 (target không nhân)', () => {
    for (const p of [0, 1, 2, 3, 6]) {
      expect(doneOf(p, { level: 50 })('ng_level_50')).toBe(true);
      expect(doneOf(p, { level: 49 })('ng_level_50')).toBe(false);
    }
    // nhưng thưởng vẫn nhân theo vòng
    expect(rewardOf(1, 'ng_level_50')).toBe(1_560_000); // 1.2M × 1.3
    expect(rewardOf(5, 'ng_level_50')).toBe(3_000_000); // 1.2M × 2.5
  });

  it('mô tả hiển thị thay {target} bằng target đã nhân (UI đọc được con số vòng hiện tại)', () => {
    const r2 = ngGoalProgress({ prestigeLevel: 1, level: 1, staffCount: 0, ordersDone: 0, supplierRel: {}, marketClearedDay: 0, rivalsBeaten: 0 });
    expect(r2.find((g) => g.id === 'ng_orders_20')!.desc).toContain('30');
    expect(r2.find((g) => g.id === 'ng_rival_2')!.desc).toContain('3');
    const r1 = ngGoalProgress({ prestigeLevel: 0, level: 1, staffCount: 0, ordersDone: 0, supplierRel: {}, marketClearedDay: 0, rivalsBeaten: 0 });
    expect(r1.find((g) => g.id === 'ng_orders_20')!.desc).toContain('20');
  });
});

describe('GĐ171 — claim + reset qua vòng', () => {
  beforeEach(() => useGame.setState({ ...newGameData() }));

  const round2State = (): GameState => {
    const s = newGameData() as GameState;
    s.biz.prestige = { level: 1, bonus: 0.08, goalsClaimed: [] };
    return s;
  };

  it('claim ng_rival_2 qua store đo s.biz.rivalsBeaten (state reset-vòng của GĐ170)', () => {
    const s = round2State();
    s.biz.rivalsBeaten = 3; // vòng 2 đòi 3
    const moneyBefore = s.money;
    useGame.setState({ ...s });
    expect(useGame.getState().claimNgGoal('ng_rival_2')).toBe(true);
    const after = useGame.getState();
    expect(after.money).toBe(moneyBefore + 1_170_000); // 900k × 1.3
    expect(after.biz.prestige.goalsClaimed).toContain('ng_rival_2');
    // rivalsBeaten không đủ → từ chối
    const s2 = round2State();
    s2.biz.rivalsBeaten = 2;
    useGame.setState({ ...s2 });
    expect(useGame.getState().claimNgGoal('ng_rival_2')).toBe(false);
  });

  it('prestigeRestart reset goalsClaimed + rivalsBeaten = 0 — vòng mới đo lại từ đầu', () => {
    const s = round2State();
    s.biz.prestige.goalsClaimed = ['ng_cho_first', 'ng_level_40'];
    s.biz.rivalsBeaten = 7;
    const next = prestigeRestart(s);
    expect(next.biz.prestige.level).toBe(2);
    expect(next.biz.prestige.goalsClaimed).toEqual([]); // cuốn mục tiêu làm lại từ đầu
    expect(next.biz.rivalsBeaten).toBe(0); // mục tiêu rival đo được TRONG vòng mới
    expect(next.biz.rival).toBeNull();
  });

  it('claim MỌI mục tiêu (mốc cuối qua claimNgGoal) → checkTitles mở danh hiệu trọn bộ', () => {
    const s = round2State();
    s.level = 60; s.ordersDone = 30; s.marketClearedDay = 5; s.biz.rivalsBeaten = 3;
    const mk = (id: string) => ({ id, name: id } as unknown as GameState['staff'][number]);
    s.staff = [mk('a'), mk('b'), mk('c'), mk('d'), mk('e')];
    s.biz.supplierRel = { cho: { spent: 30_000_000, orders: 8 } }; // bậc 3
    const claimedAllBut = NG_GOALS.filter((g) => g.id !== 'ng_cho_first').map((g) => g.id);
    s.biz.prestige.goalsClaimed = claimedAllBut;
    useGame.setState({ ...s });
    expect(useGame.getState().titles).not.toContain('chu_hem_lao_lang');
    expect(useGame.getState().claimNgGoal('ng_cho_first')).toBe(true);
    expect(useGame.getState().titles).toContain('chu_hem_lao_lang');
  });

  it('chưa trọn bộ thì KHÔNG mở danh hiệu trọn bộ (dù đã có vài mốc)', () => {
    const s = round2State();
    s.marketClearedDay = 5; // 1/7 mốc
    useGame.setState({ ...s });
    useGame.getState().checkTitles();
    expect(useGame.getState().titles).not.toContain('chu_hem_lao_lang');
  });
});

describe('GĐ171 — dữ liệu danh hiệu trọn bộ', () => {
  it("'chu_hem_lao_lang' nằm trong TITLES, chỉ mở khi ctx.ngGoalsAllDone === true", () => {
    const t = TITLES.find((x) => x.id === 'chu_hem_lao_lang')!;
    expect(t.name).toBe('Chủ hẻm lão làng');
    const base = { level: 1, day: 1, customers: 0, itemsSold: 0, revenue: 0, rating: 0, reviewCount: 0, closeRegulars: 0, ordersDone: 0, staffCount: 0, prestige: 0 };
    expect(t.done({ ...base } as Parameters<typeof t.done>[0])).toBe(false);
    expect(t.done({ ...base, ngGoalsAllDone: true } as Parameters<typeof t.done>[0])).toBe(true);
  });
});
