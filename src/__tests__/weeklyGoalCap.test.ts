import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  closeMonth, closeWeek, emptyMonth, emptyWeek, GOAL_CAP_FACTOR, monthlyChallenge,
  STREAK_XP_FROM, STREAK_XP_RATE_MONTH, STREAK_XP_RATE_WEEK, WEEK_DAYS, weeklyChallenge,
  type MonthTally, type WeekTally,
} from '../data/biz';
import { bizEndOfDay } from '../core/biz';
import { newGameData, useGame, type DayStats, type GameState } from '../core/store';
import { xpToNext } from '../data/levels';
import { setSimSeed, clearSimSeed } from '../core/rand';

// World 3D headless cho phần simSmoke (pattern economySim.test.ts): three.js không cần WebGL nhưng
// TextCanvas dùng document.createElement('canvas') — trả canvas/context giả để harness chạy được trong node.
vi.mock('../net/session', () => ({ useSession: { getState: () => ({}) }, subscribe: () => () => {} }));
vi.mock('../net/cloud', () => ({ pushCloudSave: () => {}, takeCloudSave: () => {} }));

const stub2d = (): unknown => {
  const noop = () => {};
  return new Proxy({}, {
    get: (_t, prop) => {
      if (prop === 'measureText') return () => ({ width: 0 });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') {
        return () => ({ addColorStop: noop });
      }
      return noop;
    },
    set: () => true,
  });
};
const stubCanvas = () => ({
  width: 0, height: 0, style: {}, getContext: () => stub2d(), toDataURL: () => '', addEventListener: () => {},
});
const documentStub = {
  createElement: (tag: string) => (tag === 'canvas' ? (stubCanvas() as unknown as HTMLElement) : ({} as HTMLElement)),
  createElementNS: () => ({} as Element),
  getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
} as unknown as Document;
let prevDoc: typeof globalThis.document | undefined;
let prevWin: typeof globalThis.window | undefined;
beforeEach(() => {
  prevDoc = globalThis.document;
  prevWin = globalThis.window;
  globalThis.document = documentStub;
  (globalThis as { window?: unknown }).window = {
    addEventListener: () => {}, removeEventListener: () => {}, requestAnimationFrame: (f: FrameRequestCallback) => f(0), devicePixelRatio: 1,
  } as unknown as Window & typeof globalThis;
  useGame.setState({ ...useGame.getState(), panel: null, buildMode: false, placing: null } as never);
});
afterAll(() => {
  if (prevDoc !== undefined) globalThis.document = prevDoc;
  if (prevWin !== undefined) (globalThis as { window?: unknown }).window = prevWin;
});

/**
 * GĐ169 — Bó ratchet mục tiêu doanh thu tuần/tháng + thưởng chuỗi đổi XP.
 *
 * Audit tiến trình 29/10 (backlog mục 5, phát hiện b+c):
 *  (b) closeWeek/closeMonth cũ đặt `nextGoal = max(doanh thu, goal) × 1.1/1.15` — nhân kép KHÔNG
 *      TRẦN: max() nuôi goal từ đỉnh cũ kể cả khi hụt → sau vài chục tuần goal hụt vĩnh viễn,
 *      thưởng 5%/6% + news "đạt mục tiêu" chết, nhịp tuần tự tắt ở cuối game.
 *  (c) thưởng chuỗi trả TIỀN (×1.2→×1.8) cho người thừa tiền; XP mới là thứ khan.
 * Fix: (A) trần cứng = doanh thu kỳ vừa chốt × GOAL_CAP_FACTOR (1.15) áp lúc ĐẶT goal mới —
 *  đạt thì min(công thức cũ, trần), hụt thì giữ goal cũ nhưng vẫn bó trần; goal đang lưu trong
 *  save cũ giữ nguyên tới lần chốt kế tiếp (không migration).
 *  (B) tiền giữ thưởng gốc (bỏ nhân chuỗi), cộng thẳng XP khi chuỗi ≥3: tuần 0.35×xpToNext,
 *  tháng ×2. Đây là đổi kinh tế NHẸ có chủ ý — Leader duyệt theo audit; sim trước (tiền lệ GĐ105/110):
 *  tiền lệch trong ~±5% và XP/cấp chỉ bù một phần (test simSmoke ở dưới + số in ra stdout).
 */

const round10k = (n: number) => Math.round(n / 10000) * 10000;

describe('GĐ169.A — trần ratchet mục tiêu tuần (closeWeek)', () => {
  /** Chạy `weeks` tuần với doanh thu `rev` mỗi tuần, trả về mọi nextGoal đã đặt. */
  const runFlat = (rev: number, weeks: number, startGoal: number | null = null) => {
    const goals: number[] = [];
    let goal = startGoal;
    for (let w = 0; w < weeks; w++) {
      const t: WeekTally = { ...emptyWeek(w * WEEK_DAYS + 1), ...(goal !== null ? { goal } : {}), revenue: rev };
      const r = closeWeek(t, (w + 1) * WEEK_DAYS, 30, 0);
      goals.push(r.nextGoal);
      goal = r.nextGoal;
    }
    return goals;
  };

  it('100 tuần doanh thu phẳng: goal tăng nhẹ nhưng KHÔNG BAO GIỜ vượt trần năng lực (cũ là nhân 1.1 mãi)', () => {
    const rev = 8_000_000;
    const cap = round10k(rev * GOAL_CAP_FACTOR);
    const goals = runFlat(rev, 100);
    expect(goals.length).toBe(100);
    for (const g of goals) expect(g).toBeLessThanOrEqual(cap);
    // Ratchet cũ với doanh thu phẳng sẽ trào: 8.8tr × 1.1^99 — trần phải chặn nó dừng ở ~rev×1.1
    expect(goals[99]).toBeLessThanOrEqual(cap);
    expect(goals[99]).toBeGreaterThan(rev); // vẫn là mục tiêu hơi cao hơn năng lực (dư địa tuần tốt)
    // Hội tụ: sau khi goal vượt doanh thu (hụt), goal KHÔNG tăng nữa (đừng phạt kép)
    expect(goals[1]).toBe(goals[99]);
  });

  it('tuần hụt (doanh thu thường, goal ≤ trần): goal giữ nguyên — đừng phạt kép', () => {
    const rev = 5_000_000;
    const kept = round10k(rev * 1.1);
    const t: WeekTally = { ...emptyWeek(1), revenue: rev, goal: kept };
    const r = closeWeek(t, 7, 30, 0);
    expect(r.goalMet).toBe(false);
    expect(r.nextGoal).toBe(kept); // đúng số cũ, không nhân thêm
  });

  it('tuần đạt: goal tăng theo công thức cũ khi còn dưới trần (ratchet lên khi ĐẠT vẫn hoạt động)', () => {
    const rev = 5_000_000;
    const t: WeekTally = { ...emptyWeek(1), revenue: rev, goal: round10k(rev * 0.5) };
    const r = closeWeek(t, 7, 30, 0);
    expect(r.goalMet).toBe(true);
    expect(r.nextGoal).toBe(round10k(rev * 1.1)); // min(công thức cũ, trần rev×1.15) → công thức cũ thắng
  });

  it('save cũ goal khổng lồ: giữ nguyên tới khi chốt tuần (đặt mới) thì bị clamp về trần', () => {
    const rev = 3_000_000;
    const huge = 900_000_000;
    const t: WeekTally = { ...emptyWeek(1), revenue: rev, goal: huge };
    const r = closeWeek(t, 7, 30, 0);
    // Không migration: input tally không bị sứa (goal cũ còn nguyên trong save tới lúc đặt mới)
    expect(t.goal).toBe(huge);
    // Nhưng lần ĐẶT MỚI đầu tiên phải clamp về trần năng lực
    expect(r.nextGoal).toBe(round10k(rev * GOAL_CAP_FACTOR));
    expect(r.goalMet).toBe(false);
  });

  it('tuần spike rồi về thường: goal spike 1 lần, tuần hụt kế tiếp bị kéo về trần (không kẹt đỉnh mãi)', () => {
    const rev = 4_000_000;
    const spike = closeWeek({ ...emptyWeek(1), revenue: rev * 3 }, 7, 30, 0); // tuần lễ hội ×3
    expect(spike.nextGoal).toBe(round10k(rev * 3 * 1.1)); // dưới trần rev×3×1.15 → theo công thức cũ
    const after = closeWeek({ ...emptyWeek(8), revenue: rev, goal: spike.nextGoal }, 14, 30, 0);
    expect(after.goalMet).toBe(false);
    expect(after.nextGoal).toBe(round10k(rev * GOAL_CAP_FACTOR)); // clamp về tầm với ngay tuần sau
  });

  it('tuần 0 doanh thu (tiệm nghỉ): giữ goal cũ, không nhân tiếp goal cũ', () => {
    const t: WeekTally = { ...emptyWeek(1), revenue: 0, goal: 2_000_000 };
    const r = closeWeek(t, 7, 30, 0);
    expect(r.nextGoal).toBe(2_000_000);
    // Chưa từng có goal (tuần đầu) thì đặt từ công thức cũ — max(0, 0)×1.1 = 0
    expect(closeWeek({ ...emptyWeek(1), revenue: 0 }, 7, 30, 0).nextGoal).toBe(0);
  });

  it('tháng (closeMonth): cùng luật trần ×1.15 trên doanh thu tháng', () => {
    const rev = 30_000_000;
    const cap = round10k(rev * GOAL_CAP_FACTOR);
    // 6 tháng doanh thu phẳng — goal không vượt trần
    let goal: number | null = null;
    for (let m = 1; m <= 6; m++) {
      const t: MonthTally = { ...emptyMonth((m - 1) * 28 + 1, m), ...(goal !== null ? { goal } : {}), revenue: rev };
      const r = closeMonth(t, m * 28, 30, 0);
      expect(r.nextGoal).toBeLessThanOrEqual(cap);
      goal = r.nextGoal;
    }
    // Save cũ goal tháng khổng lồ → clamp lúc đặt mới
    const huge = closeMonth({ ...emptyMonth(1, 1), revenue: rev, goal: 500_000_000 }, 28, 30, 0);
    expect(huge.nextGoal).toBe(cap);
    // Đạt mục tiêu vẫn ratchet theo công thức cũ khi dưới trần
    const met = closeMonth({ ...emptyMonth(1, 1), revenue: rev, goal: round10k(rev * 0.8) }, 28, 30, 0);
    expect(met.nextGoal).toBe(round10k(rev * 1.15));
  });
});

describe('GĐ169.B — thưởng chuỗi tuần/tháng đổi XP', () => {
  it('hằng số cấu hình: chuỗi ≥3 mới đền XP, tuần 35% xpToNext, tháng ×2', () => {
    expect(STREAK_XP_FROM).toBe(3);
    expect(STREAK_XP_RATE_WEEK).toBe(0.35);
    expect(STREAK_XP_RATE_MONTH).toBe(0.7);
  });

  it('XP chuỗi tuần đúng công thức, phẳng theo chuỗi (không nhân kép kiểu cũ), 1 lần mỗi lần chốt', () => {
    const xp1 = Math.round(STREAK_XP_RATE_WEEK * xpToNext(1)); // xpToNext(1)=35 → 12
    // Cấp 1 chỉ có thử thách doanh thu (target 900k) — revenue 1M là ĐẠT ở mọi số tuần
    const met = (endDay: number, streak: number) => closeWeek({ ...emptyWeek(1), revenue: 1_000_000 }, endDay, 1, streak);
    expect(met(7, 0).streakXp).toBe(0); // chuỗi 1 — chưa đủ
    expect(met(7, 1).streakXp).toBe(0); // chuỗi 2 — chưa đủ
    expect(met(7, 2).streakXp).toBe(xp1); // chuỗi 3 — mốc đầu
    expect(met(7, 4).streakXp).toBe(xp1); // phẳng: không cộng dồn theo độ dài chuỗi
    expect(met(7, 9).streakXp).toBe(xp1);
  });

  it('hụt thử thách → chuỗi về 0 → tuần đạt kế tiếp (1, 2) không có XP, phải dựng lại chuỗi', () => {
    const met = closeWeek({ ...emptyWeek(1), revenue: 1_000_000 }, 7, 1, 3); // đạt → streak 4, có XP
    expect(met.challengeStreak).toBe(4);
    expect(met.streakXp).toBeGreaterThan(0);
    const missed = closeWeek({ ...emptyWeek(8), revenue: 1 }, 14, 1, 3); // hụt → streak 0, không XP
    expect(missed.challengeStreak).toBe(0);
    expect(missed.streakXp).toBe(0);
    expect(closeWeek({ ...emptyWeek(15), revenue: 1_000_000 }, 21, 1, 0).streakXp).toBe(0); // dựng lại tuần 1
  });

  it('XP chuỗi tháng = ×2 tuần, cùng luật chuỗi ≥3', () => {
    const xpMonth = Math.round(STREAK_XP_RATE_MONTH * xpToNext(1)); // 0.7×35 = 24.5 → 25
    const met = (streak: number) => closeMonth({ ...emptyMonth(1, 1), revenue: 6_000_000 }, 28, 1, streak); // target tháng cấp 1 = 5M
    expect(met(1).streakXp).toBe(0);
    expect(met(2).streakXp).toBe(xpMonth);
    expect(met(5).streakXp).toBe(xpMonth);
    expect(STREAK_XP_RATE_MONTH).toBe(2 * STREAK_XP_RATE_WEEK); // tháng ×2 tuần (làm tròn từng mức riêng)
  });
});

describe('GĐ169.B — XP chuỗi chảy qua bizEndOfDay (claim 1 lần/tuần, news 🔥)', () => {
  const emptyDay = (): DayStats => ({ revenue: 0, spent: 0, wages: 0, itemsSold: 0, customers: 0, unhappy: 0, xp: 0 });
  // Ngày bán mạnh đủ ĐẠT mọi thử thách tuần xoay đến (wq_five/wq_service/wq_combo/wq_online) ở cấp 30
  const dayStats = (): DayStats => ({
    ...emptyDay(),
    revenue: 1_300_000, spent: 800_000, itemsSold: 200, customers: 100,
    byItem: { mi: { qty: 100, revenue: 900000, cost: 500000 }, com_hop_ga: { qty: 100, revenue: 400000, cost: 300000 } },
    // com_hop_ga là món nấu → cookedSold đếm từ byItem (như core), 100 món/ngày — đủ mọi thử thách xoay đến
    onlineDone: 20, farmHarvest: 40, socialPosts: 5, combos: 20, services: 100000, fiveStars: 40,
  });

  const runDays = (s: GameState, from: number, days: number) => {
    let cur = s;
    const outs: ReturnType<typeof bizEndOfDay>[] = [];
    for (let d = from; d < from + days; d++) {
      const out = bizEndOfDay({ ...cur, day: d }, dayStats());
      outs.push(out);
      cur = { ...cur, day: d + 1, biz: out.biz };
    }
    return { state: cur, outs };
  };

  it('28 ngày: chỉ 2 ngày chốt tuần (tuần 3, 4) trả streakXp, mỗi lần đúng 1 news 🔥, tiền chuỗi giữ gốc', () => {
    useGame.setState({ ...newGameData(), day: 1, level: 30 });
    const { state, outs } = runDays(useGame.getState(), 1, 28);
    const xp30 = Math.round(STREAK_XP_RATE_WEEK * xpToNext(30));
    const xpDays = outs.filter((o) => o.streakXp);
    expect(xpDays.length).toBe(2); // tuần 1, 2 dựng chuỗi; tuần 3, 4 giữ chuỗi ≥3 → XP
    for (const o of xpDays) {
      expect(o.streakXp).toBe(xp30);
      expect(o.news.filter((n) => n.startsWith('🔥 Chuỗi')).length).toBe(1);
      expect(o.news.find((n) => n.startsWith('🔥 Chuỗi'))).toContain(`+${xp30} XP`);
    }
    // Tiền thưởng thử thách luôn là thưởng gốc (mức chuỗi 0) — kiểm tuần cuối (wq_online)
    const lw = state.biz.lastWeek!;
    const def = weeklyChallenge(Math.ceil(28 / WEEK_DAYS), 30);
    expect(lw.challenge!.id).toBe(def.id);
    expect(lw.challenge!.met).toBe(true);
    expect(lw.challenge!.reward).toBe(def.reward(30)); // không nhân chuỗi
    expect(state.biz.weekStreak).toBe(4);
  });

  it('chốt tháng ở mốc sang tháng mới: streakXp tháng ×2 tuần và news riêng một dòng', () => {
    useGame.setState({ ...newGameData(), day: 32, level: 30 });
    const s = useGame.getState();
    // Tháng tally phải ĐẠT thử thách tháng xoay đến (tháng 1 → pool[1] = mq_five, target 140)
    const out = bizEndOfDay({ ...s, day: 32, biz: { ...s.biz, month: { ...emptyMonth(1, 1, 5000000), revenue: 6_000_000, fiveStars: 200 }, monthStreak: 2 } }, dayStats());
    const xpMonth = Math.round(STREAK_XP_RATE_MONTH * xpToNext(30));
    expect(out.biz.lastMonth!.monthStreak).toBe(3);
    expect(out.streakXp).toBe(xpMonth);
    expect(out.news.filter((n) => n.includes('🔥 Chuỗi')).length).toBe(1);
    expect(out.news.find((n) => n.includes('🔥 Chuỗi'))).toContain(`+${xpMonth} XP`);
    // Chuỗi 1 (chưa đủ 3): không XP, không news 🔥
    const out1 = bizEndOfDay({ ...s, day: 32, biz: { ...s.biz, month: { ...emptyMonth(1, 1, 5000000), revenue: 6_000_000, fiveStars: 200 }, monthStreak: 0 } }, dayStats());
    expect(out1.biz.lastMonth!.monthStreak).toBe(1);
    expect(out1.streakXp).toBeUndefined();
    expect(out1.news.some((n) => n.includes('🔥 Chuỗi'))).toBe(false);
  });

  it('challenge xác định theo tuần (không random) để người chơi đo trước được', () => {
    expect(weeklyChallenge(4, 30).id).toBe(weeklyChallenge(4, 30).id);
    expect(monthlyChallenge(2, 30).id).toBe(monthlyChallenge(2, 30).id);
  });
});

// ── GĐ169 simSmoke: harness thật (GĐ105) cấp 30/50 — Regression: harness chạy được, tiền/XP hữu hạn.
// Số đối chiếu trước/sau in ra stdout; ngưỡng mềm (không assert cứng tỉ số — tiền lệ economySim GĐ105).
describe('GĐ169 — simSmoke harness kinh tế cấp 30/50 (seed cố định)', () => {
  const smoke = async (level: 30 | 50) => {
    const { runEconomySim } = await import('../dev/simEconomy');
    setSimSeed(169);
    try {
      const { rows } = await runEconomySim(level, 28, { betTier: 1.5 });
      const s = useGame.getState();
      expect(rows.length).toBe(28);
      expect(Number.isFinite(s.money)).toBe(true);
      expect(s.level).toBeGreaterThanOrEqual(level); // không thụt cấp
      expect(Number.isFinite(s.stats.xp)).toBe(true);
      const gained = s.level - level;
      // eslint-disable-next-line no-console
      console.log(
        `[GĐ169 sim] cấp ${level}: 28 ngày · tiền cuối=${Math.round(s.money).toLocaleString('vi-VN')}đ · ` +
        `lên ${gained} cấp (${gained > 0 ? (28 / gained).toFixed(1) : '>28'} ngày/cấp) · ` +
        `lifetimeXP=${s.stats.xp.toLocaleString('vi-VN')} · tuần cuối: goal=${s.biz.lastWeek?.goal} đạt=${s.biz.lastWeek?.goalMet} ` +
        `goalMới=${s.biz.lastWeek?.nextGoal} chThưởng=${s.biz.lastWeek?.challenge?.reward} chXP=${s.biz.lastWeek?.streakXp}`,
      );
    } finally {
      clearSimSeed();
    }
  };

  it('cấp 30 — 28 ngày qua autoplay thật: tiền/XP hữu hạn, không thụt cấp', { timeout: 1_800_000 }, () => smoke(30));
  it('cấp 50 — 28 ngày qua autoplay thật: tiền/XP hữu hạn, không thụt cấp', { timeout: 1_800_000 }, () => smoke(50));
});
