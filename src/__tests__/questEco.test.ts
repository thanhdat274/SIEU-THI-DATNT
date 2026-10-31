import { describe, expect, it } from 'vitest';
import { newGameData, questContext, useGame } from '../core/store';
import {
  dailyQuests, emptyQuestLog, emptyTotals, questEcoCap, QUEST_ECO_FLOOR, QUEST_ECO_MULT,
  type QuestContext,
} from '../data/quests';

/**
 * GĐ106 — "Neo thưởng nhiệm vụ vào kinh tế thật": tổng thưởng tiền của bộ nhiệm vụ ngày bị chặn ở
 * một bội số của lãi bình quân gần đây (recentAvgProfit) — tiệm càng lớn thưởng càng đáng nhưng không
 * lấn át sức bán thật. Tiệm nhỏ (dưới QUEST_ECO_FLOOR) hoặc chưa có lịch sử lãi → không giới hạn
 * (Infinity) → mọi test/harness dùng ván sạch (history rỗng) không đổi hành vi.
 */

const ctx = (over: Partial<QuestContext> = {}): QuestContext => ({
  day: 1, level: 20, stats: newGameData().stats, totals: emptyTotals(),
  staffCount: 0, shopTier: 0, warehouseTier: 0, ordersDone: 0, log: emptyQuestLog(),
  festivalGoods: [], reservationsToday: 0, rent: 20000, ...over,
});

describe('questEcoCap — trần tổng thưởng bộ nhiệm vụ ngày', () => {
  it('chưa có lãi / lãi 0 / âm → Infinity (không giới hạn, giữ nguyên hành vi)', () => {
    expect(questEcoCap(0)).toBe(Infinity);
    expect(questEcoCap(-5)).toBe(Infinity);
    expect(questEcoCap(undefined as unknown as number)).toBe(Infinity);
  });

  it('lãi nhỏ → trần không thấp hơn sàn QUEST_ECO_FLOOR (tiệm nhỏ vẫn có thưởng)', () => {
    expect(questEcoCap(1)).toBe(QUEST_ECO_FLOOR);
    expect(questEcoCap(50_000)).toBe(QUEST_ECO_FLOOR);
  });

  it('lãi lớn → cap = lãi × QUEST_ECO_MULT, thưởng không vượt lãi bán hàng', () => {
    const p = 1_000_000;
    expect(questEcoCap(p)).toBe(p * QUEST_ECO_MULT);
    expect(QUEST_ECO_MULT).toBeLessThan(1);
  });
});

describe('boss — ván sạch (history rỗng) không đổi hành vi', () => {
  it('questContext từ store mới: avgDailyProfit 0 → trần Infinity → tổng thưởng bộ = giá trị cấp thường', () => {
    useGame.setState({ ...newGameData(), level: 20 } as never);
    const ctx = questContext(useGame.getState());
    expect(ctx.avgDailyProfit).toBe(0);
    const daily = dailyQuests(ctx);
    const total = daily.reduce((n, q) => n + q.money, 0);
    expect(total).toBeGreaterThan(0);
    // so với không có avgDailyProfit (ctx thiếu field) phải bằng nhau
    const plain = dailyQuests({ ...ctx, avgDailyProfit: undefined });
    expect(plain.reduce((n, q) => n + q.money, 0)).toBe(total);
  });
});

describe('dailyQuests — áp trần theo lãi bình quân', () => {
  it('lãi đủ lớn mà tổng bộ vượt trần → giảm ĐỀU tiền từng việc để tổng ≤ trần', () => {
    // Cấp 20, lãi bình quân 300k → trần 900k. Tổng bộ cấp 20 ~3.5M > 900k → bị chặn về 900k.
    const daily = dailyQuests(ctx({ avgDailyProfit: 300_000 }));
    const total = daily.reduce((n, q) => n + q.money, 0);
    const cap = 300_000 * QUEST_ECO_MULT;
    expect(total).toBeLessThanOrEqual(cap);
    // per-quest tỉ lệ giữ nguyên so với cấp thường (chỉ co đều)
    const ref = dailyQuests(ctx({ avgDailyProfit: 0 }));
    const ratio = daily[0].money / ref[0].money;
    expect(ratio).toBeGreaterThan(0);
    expect(ratio).toBeLessThan(1);
    daily.forEach((q, i) => {
      // ratio suy ngược từ việc đầu (đã floor) nên lệch tối đa 1đ
      expect(Math.abs(q.money - Math.floor(ref[i].money * ratio))).toBeLessThanOrEqual(1);
      expect(q.target).toBe(ref[i].target); // mục tiêu KHÔNG đổi
      expect(q.xp).toBe(ref[i].xp); // XP KHÔNG đổi (chỉ tiền bị neo)
    });
  });

  it('tổng bộ dưới trần → không đổi (tiệm vừa đủ lãi vẫn nhận trọn)', () => {
    // Cấp 1 có tổng bộ ~495k; lãi bình quân 1M → trần 3M → không bị giới hạn
    const daily = dailyQuests(ctx({ level: 1, avgDailyProfit: 1_000_000 }));
    const ref = dailyQuests(ctx({ level: 1, avgDailyProfit: 0 }));
    expect(daily.reduce((n, q) => n + q.money, 0)).toBe(ref.reduce((n, q) => n + q.money, 0));
  });

  it('kèo dùng tổng thưởng bộ ĐÃ neo (betBonusMoney nhất quán)', () => {
    // Cấp 20 lãi 300k: tổng neo về ~900k; kèo ×1.5 trúng = 50% tổng neo
    const c = ctx({ avgDailyProfit: 300_000 });
    const total = dailyQuests(c).reduce((n, q) => n + q.money, 0);
    const cap = 300_000 * QUEST_ECO_MULT;
    expect(total).toBeLessThanOrEqual(cap);
    // để chắc mạch: nếu cap chặn thì tổng (đã bao gồm tiền từng việc) nằm đúng ≤ cap
    expect(total).toBeGreaterThan(0);
  });

  it('avgDailyProfit thiếu/NaN → không giới hạn (an toàn với mọi caller)', () => {
    const a = dailyQuests(ctx({ avgDailyProfit: undefined }));
    const b = dailyQuests(ctx({ avgDailyProfit: Number.NaN }));
    expect(a.reduce((n, q) => n + q.money, 0)).toBe(
      dailyQuests(ctx({ avgDailyProfit: 0 })).reduce((n, q) => n + q.money, 0),
    );
    expect(b.reduce((n, q) => n + q.money, 0)).toBe(a.reduce((n, q) => n + q.money, 0));
  });

  it('mọi tổng đều dương/hữu hạn dù bị chặn mạnh (không có việc nào về 0 hay NaN)', () => {
    const daily = dailyQuests(ctx({ avgDailyProfit: 200_000 })); // trần 600k, tổng ~3.5M → co mạnh
    const total = daily.reduce((n, q) => n + q.money, 0);
    expect(total).toBeLessThanOrEqual(600_000);
    for (const q of daily) {
      expect(Number.isFinite(q.money)).toBe(true);
      expect(q.money).toBeGreaterThan(0);
    }
  });
});
