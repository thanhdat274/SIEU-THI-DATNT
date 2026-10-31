import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, questContext, useGame } from '../core/store';
import { betCoreSetProgress, BET_TIERS, betStatus, dailyQuests, emptyQuestLog, isBetCore, questEcoCap, type QuestContext } from '../data/quests';
import { COOKED_PRODUCT_IDS } from '../data/recipes';
import { REGULARS } from '../data/regulars';

/**
 * GĐ107 — "Kèo dễ trúng hơn": kèo bám bộ VIỆC CHÍNH hằng ngày (đông khách, bán hàng, doanh thu) thay vì
 * TRỌN BỘ gồm cả việc phụ xoay (app/social/nấu/combo). GĐ105 mô phỏng cho thấy trọn bộ không bao giờ trọn
 * một ngày (kèo ×1.0 cũng 0% trúng) → giữ chân "kèo có cược" cần thưởng thật sự đạt được. KHÔNG gồm
 * daily_smile trong bộ kèo: quest này tự về 0 ngay khi có 1 khách phàn nàn nên vô tình chặn kèo cả ngày.
 */

const ctx = (over: Partial<QuestContext> = {}): QuestContext => ({
  day: 10, level: 30, stats: newGameData().stats, totals: newGameData().totals,
  staffCount: 0, shopTier: 0, warehouseTier: 0, ordersDone: 0, log: emptyQuestLog(),
  festivalGoods: [], reservationsToday: 0, rent: 20000, ...over,
});

const bigStats = {
  ...newGameData().stats,
  customers: 500, revenue: 20_000_000, itemsSold: 999, unhappy: 0,
  services: 99_999_999, combos: 999, onlineDone: 999, farmHarvest: 999, socialPosts: 99, cookOrders: 999,
  byItem: { [[...COOKED_PRODUCT_IDS][0]]: { qty: 999, revenue: 1, cost: 1 } },
};

// GĐ160 — khoá biến thể "Đón khách quen" về 0 cách tất định (mọi khách quen ghé HÔM QUA — luật
// "không ghé hai ngày liền" của visitsToday tắt hết dự báo hôm nay) để pool nhiệm vụ không phụ thuộc
// weatherSeed ngẫu nhiên của ván test.
const allRegularsVisitedYesterday = (day: number) =>
  Object.fromEntries(REGULARS.map((d) => [d.id, { friendship: 0, visits: 1, lastVisitDay: day - 1, perks: [], discovered: [] }]));

const freshGame = (day = 10, stats: Record<string, unknown> = {}, level = 30) => {
  useGame.setState({
    ...newGameData(), day, level, money: 1_000_000,
    stats: { ...newGameData().stats, ...stats } as never,
    regulars: allRegularsVisitedYesterday(day),
  });
};

describe('isBetCore / BET_CORE_IDS — nhóm việc chính kèo bám', () => {
  it('các id cốt lõi luôn đúng nhóm chính; việc phụ xoay thì không', () => {
    expect(isBetCore('daily_customers')).toBe(true);
    expect(isBetCore('daily_revenue')).toBe(true);
    expect(isBetCore('daily_items')).toBe(true);
    expect(isBetCore('daily_festival')).toBe(true);
    expect(isBetCore('daily_reserve')).toBe(true);
    // "Khách vui vẻ" KHÔNG thuộc bộ kèo (tự về 0 khi có khách phàn nàn — GĐ107 loại để kèo khả thi)
    expect(isBetCore('daily_smile')).toBe(false);
    // việc phụ xoay KHÔNG nằm nhóm chính
    expect(isBetCore('daily_online')).toBe(false);
    expect(isBetCore('daily_cooked')).toBe(false);
    expect(isBetCore('daily_combo')).toBe(false);
    expect(isBetCore('daily_social')).toBe(false);
    expect(isBetCore('daily_services')).toBe(false);
    expect(isBetCore('daily_farm')).toBe(false);
    expect(isBetCore('daily_cook_orders')).toBe(false);
    // GĐ160 — nhiệm vụ tuỳ chọn mới (mở từ cấp 1 / biến thể hoàn cảnh) cũng KHÔNG thuộc bộ kèo
    expect(isBetCore('daily_morning')).toBe(false);
    expect(isBetCore('daily_rain')).toBe(false);
    expect(isBetCore('daily_regulars')).toBe(false);
  });
});

describe('betCoreSetProgress — đếm riêng bộ việc chính', () => {
  it('bộ việc chính luôn có ≥3 việc (đông khách + bán hàng/giữ hẹn + doanh thu; có lễ/lời hẹn thì 4)', () => {
    const p = betCoreSetProgress(ctx());
    expect(p.total).toBeGreaterThanOrEqual(3);
    expect(p.total).toBeLessThan(dailyQuests(ctx()).length); // không tính việc phụ
  });

  it('ngày có LỄ: middle = daily_festival nằm trong bộ kèo; khép khi bán hàng dịp đủ', () => {
    const festId = 'huongduong'; // một món của dịp
    const stats = { ...newGameData().stats, customers: 500, revenue: 20_000_000, byItem: { [festId]: { qty: 60, revenue: 1, cost: 1 } } };
    const c = ctx({ festivalGoods: [festId], stats: stats as never });
    // ⚠️ ngày lễ chưa xong nếu chưa bán hàng dịp
    const no = betCoreSetProgress(ctx({ festivalGoods: [festId], stats: { ...newGameData().stats, customers: 500, revenue: 20_000_000 } as never }));
    // bán đủ hàng dịp + nhận hết việc chính → allDone
    const withFest = betCoreSetProgress({
      ...c,
      log: { day: 10, claimedDaily: ['daily_customers', 'daily_festival', 'daily_revenue'], claimedStory: [], bet: null },
    });
    expect(dailyQuests(c).find((q) => q.id === 'daily_festival')!.done).toBe(true);
    expect(withFest.allDone).toBe(true);
    expect(no.total).toBe(3); // đông khách + bán hàng dịp + doanh thu (smile/__khác__ không trong bộ kèo)
    expect(no.allDone).toBe(false); // chưa bán hàng dịp → chưa khép kèo
  });

  it('ngày có LỜI HẸN: middle = daily_reserve nằm trong bộ kèo; khép khi giữ đủ hẹn', () => {
    const stats = { ...newGameData().stats, customers: 500, revenue: 20_000_000, reservationsFilled: 3 };
    const c = ctx({ reservationsToday: 3, stats: stats as never });
    const p = betCoreSetProgress({
      ...c,
      log: { day: 10, claimedDaily: ['daily_customers', 'daily_reserve', 'daily_revenue'], claimedStory: [], bet: null },
    });
    expect(dailyQuests(c).find((q) => q.id === 'daily_reserve')!.done).toBe(true);
    expect(p.allDone).toBe(true);
  });

  it('mọi việc chính đạt + nhận → allDone/allClaimed (bất kể việc phụ)', () => {
    const p = betCoreSetProgress({
      ...ctx(), level: 30,
      stats: { ...bigStats } as never,
      log: { day: 10, claimedDaily: ['daily_customers', 'daily_revenue', 'daily_smile', 'daily_items'], claimedStory: [], bet: null },
    });
    expect(p.allDone).toBe(true);
    expect(p.allClaimed).toBe(true);
  });

  it('thiếu 1 việc chính → chưa khép (chưa trả kèo)', () => {
    const p = betCoreSetProgress({
      ...ctx(), stats: { ...bigStats, revenue: 1 } as never, // doanh thu chưa đạt
      log: { day: 10, claimedDaily: ['daily_customers', 'daily_smile', 'daily_items'], claimedStory: [], bet: null },
    });
    expect(p.allDone).toBe(false);
  });
});

describe('kèo — làm đủ việc CHÍNH là trúng, việc phụ không bắt buộc (GĐ107)', () => {
  beforeEach(() => freshGame(10, bigStats as Record<string, unknown>));

  it('nhận đủ việc chính (bỏ việc phụ) → kèo vẫn trúng đúng %', () => {
    useGame.getState().placeBet(1.5);
    const daily = dailyQuests(questContext(useGame.getState()));
    const core = daily.filter((q) => isBetCore(q.id));
    const totalDailyMoney = daily.reduce((n, q) => n + q.money, 0);
    for (const q of core) useGame.getState().claimQuest(q.id);
    const bet = useGame.getState().questLog.bet!;
    expect(bet.bonus).toBeGreaterThan(0);
    // tiền kèo = % tổng thưởng bộ (tier 1.5 → 50%), chặn trần 100%
    expect(bet.bonus).toBe(Math.min(Math.round(totalDailyMoney * 0.5), Math.round(totalDailyMoney * 1.0)));
  });

  it('thiếu 1 việc chính → không trúng dù làm hết việc phụ', () => {
    freshGame(10, { customers: 500, revenue: 1, itemsSold: 999, unhappy: 0 } as Record<string, unknown>);
    useGame.getState().placeBet(1.0);
    const daily = dailyQuests(questContext(useGame.getState()));
    const optional = daily.filter((q) => !isBetCore(q.id));
    for (const q of optional) useGame.getState().claimQuest(q.id);
    expect(useGame.getState().questLog.bet!.bonus).toBe(0); // việc phụ không đủ
  });
});

describe('NGÀY ĐẦU (level 1) — kèo & trần kinh tế phải thân thiện với người chơi MỚI (GĐ114)', () => {
  it('người chơi mới (chưa có lãi) không bị trần kinh tế — questEcoCap = Infinity', () => {
    // cảnh tiệm vừa mở: chưa kết thúc ngày nào, chưa có lịch sử lãi → trần không giới hạn
    expect(questEcoCap(0)).toBe(Infinity);
    // đã có lãi: trần = 0.7 × lãi bình quân nhưng không dưới sàn 150k (tiệm nhỏ vẫn có thưởng)
    expect(questEcoCap(50_000)).toBe(150_000);
    expect(questEcoCap(200_000)).toBe(150_000);
    expect(questEcoCap(1_000_000)).toBe(700_000);
  });

  it('target việc chính ngày 1 đạt được ở mức nền → kèo trúng', () => {
    freshGame(1, {} as Record<string, unknown>, 1); // level 1, ngày 1
    const daily = dailyQuests(questContext(useGame.getState()));
    const core = daily.filter((q) => isBetCore(q.id));
    // mục tiêu ngày đầu KHIÊM TỐN (vừa sức người mới, không phải cày): khách ≤5, doanh thu ≤150k,
    // trạm giữa (bán đều tay / bán của dịp / giữ hẹn) chỉ vài món/lời hẹn
    expect(core.find((q) => q.id === 'daily_customers')!.target).toBeLessThanOrEqual(5);
    expect(core.find((q) => q.id === 'daily_revenue')!.target).toBeLessThanOrEqual(150_000);
    // bộ việc chính ngày 1 đủ 3 (đông khách + trạm giữa + doanh thu) — kèo phân định đúng nhóm này
    expect(core.length).toBe(3);
    // người mới hoàn thành đủ việc chính ngay ngày 1 (mua đủ hàng, bán đủ khách/doanh thu)
    // ngày 1 là Tết dương lịch → trạm giữa là "Bán hàng của dịp": phải bán đủ hàng dịp (festivalStock)
    const ctx1 = questContext(useGame.getState());
    const festQty: Record<string, { qty: number; revenue: number; cost: number }> = {};
    for (const id of ctx1.festivalGoods) festQty[id] = { qty: 12, revenue: 1, cost: 1 };
    freshGame(1, { customers: 20, revenue: 350_000, itemsSold: 30, unhappy: 0, byItem: festQty } as Record<string, unknown>, 1);
    useGame.getState().placeBet(1.0);
    for (const q of dailyQuests(questContext(useGame.getState())).filter((q) => isBetCore(q.id))) {
      expect(useGame.getState().claimQuest(q.id)).toBe(true);
    }
    const bet = useGame.getState().questLog.bet!;
    expect(bet.bonus).toBeGreaterThan(0);
    expect(betStatus(1, bet)).toBe('won');
  });
});
