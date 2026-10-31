import { beforeEach, describe, expect, it } from 'vitest';
import { applySnapshot, snapshot } from '../core/save';
import { newGameData, questContext, useGame } from '../core/store';
import {
  betBonusMoney, betStatus, BET_BONUS_CAP, BET_QUEST_ID, BET_TIERS, dailyQuests, dailySetProgress,
  betCoreSetProgress, isBetCore, emptyQuestLog, type QuestContext,
} from '../data/quests';
import { COOKED_PRODUCT_IDS } from '../data/recipes';
import { REGULARS } from '../data/regulars';

/** "Đặt kèo hôm nay": chốt 1 kèo/ngày — làm trọn BỘ nhiệm vụ ngày ở mục tiêu ×1.0/×1.5/×2.0 thì
 * nhận thêm 30/50/80% tổng thưởng bộ ngày (trần cứng 1×), hụt thì không phạt. */

const ctx = (over: Partial<QuestContext> = {}): QuestContext => ({
  day: 1, level: 30, stats: newGameData().stats, totals: newGameData().totals,
  staffCount: 0, shopTier: 0, warehouseTier: 0, ordersDone: 0, log: emptyQuestLog(),
  festivalGoods: [], reservationsToday: 0, rent: 20000, ...over,
});

// Cấp 30: cả 7 nhóm nhiệm vụ tuỳ chọn đều mở. Stats đè làm mọi việc đạt ở CẢ mục tiêu ×2.0
// (revenue mục tiêu ×2 ở cấp 30 ≈ 2.475 triệu, khách ×2 ≈ 86, món ×2 ≈ 204, đơn app ×2 ≈ 18…)
// GĐ160: thêm byHour (đầy nhiệm vụ mới "Sớm hôm đón khách" đo doanh thu 6h–9h).
const bigStats = {
  ...newGameData().stats,
  customers: 500, revenue: 20_000_000, itemsSold: 999, unhappy: 0,
  services: 99_999_999, combos: 999, onlineDone: 999, farmHarvest: 999, socialPosts: 99, cookOrders: 999,
  byItem: { [[...COOKED_PRODUCT_IDS][0]]: { qty: 999, revenue: 1, cost: 1 } },
  byHour: { 6: { customers: 99, revenue: 999_999_999 }, 7: { customers: 99, revenue: 999_999_999 }, 8: { customers: 99, revenue: 999_999_999 } },
};

// GĐ160 — khoá biến thể "Đón khách quen" về 0 cách tất định (mọi khách quen ghé HÔM QUA — luật
// "không ghé hai ngày liền" của visitsToday tắt hết dự báo hôm nay) để pool nhiệm vụ không phụ thuộc
// weatherSeed ngẫu nhiên của ván test.
const allRegularsVisitedYesterday = (day: number) =>
  Object.fromEntries(REGULARS.map((d) => [d.id, { friendship: 0, visits: 1, lastVisitDay: day - 1, perks: [], discovered: [] }]));

/** State ván sạch ở ngày `day`, cấp 30, đã làm xong sẵn cả bộ (nếu big). */
const freshGame = (day = 1, stats: Record<string, unknown> = {}) => {
  useGame.setState({
    ...newGameData(), day, level: 30, money: 1_000_000,
    stats: { ...newGameData().stats, ...stats } as never,
    regulars: allRegularsVisitedYesterday(day),
  });
};

/** Chốt kèo `tier` rồi nhận đủ thưởng cả bộ nhiệm vụ ngày, trả về { tổng thưởng bộ, tiền thêm, tiền cuối }. */
const betAndClaimAll = (tier: number) => {
  const s0 = useGame.getState();
  const qs = dailyQuests(questContext(s0));
  const totalDailyMoney = qs.reduce((n, q) => n + q.money, 0);
  expect(s0.placeBet(tier)).toBe(true);
  for (const q of qs) expect(useGame.getState().claimQuest(q.id)).toBe(true);
  const s1 = useGame.getState();
  return { totalDailyMoney, bonus: s1.questLog.bet?.bonus ?? 0, money: s1.money, bet: s1.questLog.bet! };
};

describe('chốt kèo — lưu theo ngày và nhân mục tiêu cả bộ', () => {
  beforeEach(() => freshGame(5));

  it('placeBet ghi kèo vào questLog.bet đúng ngày, đúng mức, chưa phân định', () => {
    expect(useGame.getState().placeBet(1.5)).toBe(true);
    const bet = useGame.getState().questLog.bet!;
    expect(bet).toEqual({ day: 5, questId: BET_QUEST_ID, tier: 1.5, bonus: 0 });
    expect(betStatus(5, bet)).toBe('pending');
    expect(betStatus(6, bet)).toBe('lost'); // qua ngày không trọn việc chính → hụt, đúng 1 sáng sau
    expect(betStatus(7, bet)).toBe('none'); // hụt lâu rồi thì thôi không nhắc nữa
  });

  it('kèo nhân mục tiêu CẢ BỘ nhiệm vụ ngày (×1.5), thưởng từng việc giữ nguyên', () => {
    const base = dailyQuests(ctx({ day: 5 }));
    freshGame(5);
    useGame.getState().placeBet(1.5);
    const betted = dailyQuests(questContext(useGame.getState()));
    expect(betted.length).toBe(base.length);
    betted.forEach((q, i) => {
      expect(q.target).toBe(Math.round(base[i].target * 1.5));
      expect(q.money).toBe(base[i].money);
      expect(q.xp).toBe(base[i].xp);
    });
    // mô tả cũng theo mục tiêu mới
    expect(betted.some((q) => q.target % 2 === 0 && q.description.includes(q.target.toLocaleString('vi-VN')))).toBe(true);
  });

  it('kèo ×1.0 giữ nguyên mục tiêu — chỉ là chọn "nhận thêm" thôi', () => {
    const base = dailyQuests(ctx({ day: 5 }));
    freshGame(5);
    useGame.getState().placeBet(1.0);
    const betted = dailyQuests(questContext(useGame.getState()));
    expect(betted.map((q) => q.target)).toEqual(base.map((q) => q.target));
  });

  it('chốt 2 lần trong ngày bị chặn — kèo đầu giữ nguyên', () => {
    expect(useGame.getState().placeBet(1.5)).toBe(true);
    expect(useGame.getState().placeBet(2.0)).toBe(false);
    expect(useGame.getState().questLog.bet!.tier).toBe(1.5);
  });

  it('hụt không phạt: hết ngày không trọn việc chính thì không mất đồng nào, sang ngày đặt lại được', () => {
    const money0 = useGame.getState().money;
    expect(useGame.getState().placeBet(2.0)).toBe(true);
    useGame.setState({ day: 6, regulars: allRegularsVisitedYesterday(6) }); // ngủ một giấc, bộ nhiệm vụ hôm qua không xong
    const s = useGame.getState();
    expect(s.money).toBe(money0); // không phạt
    expect(dailyQuests(questContext(s)).every((q, i) => q.target === dailyQuests(ctx({ day: 6 }))[i].target)).toBe(true); // mục tiêu về lại bộ thường
    expect(useGame.getState().placeBet(1.0)).toBe(true); // "mai thử lại" — chốt được kèo mới
    expect(useGame.getState().questLog.bet!.day).toBe(6);
  });

  it('nhận nhiệm vụ ngày đầu tiên sang ngày mới thì kèo hôm qua được dọn sạch', () => {
    useGame.getState().placeBet(2.0);
    useGame.setState({ day: 6, stats: bigStats as never });
    expect(useGame.getState().claimQuest(dailyQuests(questContext(useGame.getState()))[0].id)).toBe(true);
    expect(useGame.getState().questLog.bet).toBeNull();
  });
});

describe('trúng kèo — làm trọn việc chính nhận thêm đúng %, chặn trần', () => {
  beforeEach(() => freshGame(10, bigStats as Record<string, unknown>)); // ngày 10 (10/1) — ngoài lễ, bộ nhiệm vụ là bộ thường

  it('mỗi mức kèo trúng đúng 30/50/80% tổng thưởng bộ ngày', () => {
    for (const def of BET_TIERS) {
      freshGame(10, bigStats as Record<string, unknown>);
      const { totalDailyMoney, bonus, money, bet } = betAndClaimAll(def.tier);
      expect(bonus).toBe(Math.round(totalDailyMoney * def.bonusPct));
      expect(bet.bonus).toBe(bonus);
      expect(betStatus(10, bet)).toBe('won');
      // tiền vào két = thưởng từng việc + tiền kèo
      expect(money).toBe(1_000_000 + totalDailyMoney + bonus);
    }
  });

  it('trúng kèo rồi thì không chốt lại được trong ngày', () => {
    betAndClaimAll(1.0);
    expect(useGame.getState().placeBet(2.0)).toBe(false);
    expect(useGame.getState().questLog.bet!.tier).toBe(1.0);
  });

  it('trần cứng: tiền kèo không bao giờ vượt 1× tổng thưởng nhiệm vụ ngày', () => {
    for (const total of [1, 12_345, 340_000, 99_999_999]) {
      for (const def of BET_TIERS) {
        const bonus = betBonusMoney(def.tier, total);
        expect(bonus).toBeLessThanOrEqual(Math.round(total * BET_BONUS_CAP));
        expect(bonus).toBe(Math.min(Math.round(total * def.bonusPct), Math.round(total * BET_BONUS_CAP)));
      }
    }
  });

  it('kèo phân định ĐÚNG LÚC khép bộ VIỆC CHÍNH (GĐ107), không trả sớm', () => {
    const qs = dailyQuests(questContext(useGame.getState()));
    const core = qs.filter((q) => isBetCore(q.id));
    const optional = qs.filter((q) => !isBetCore(q.id));
    useGame.getState().placeBet(1.5);
    // Nhận hết việc PHỤ xoay (đủ bộ thường) CHƯA đủ — kèo chưa trả (chờ việc chính)
    for (const q of optional) {
      useGame.getState().claimQuest(q.id);
      expect(useGame.getState().questLog.bet!.bonus).toBe(0);
    }
    // Nhận lần lượt việc CHÍNH: còn thiếu 1 việc chính → chưa trả
    for (let i = 0; i < core.length - 1; i++) {
      useGame.getState().claimQuest(core[i].id);
      expect(useGame.getState().questLog.bet!.bonus).toBe(0);
    }
    // Việc chính chót → TRÚNG kèo
    useGame.getState().claimQuest(core[core.length - 1].id);
    expect(useGame.getState().questLog.bet!.bonus).toBeGreaterThan(0);
    // bộ việc chính khép trọn: allDone & allClaimed đúng
    const p = betCoreSetProgress(questContext(useGame.getState()));
    expect(p.allDone).toBe(true);
    expect(p.allClaimed).toBe(true);
  });

  it('chưa khép việc chính thì bộ nhiệm vụ đo theo mục tiêu kèo (×2.0 khó hơn bộ thường)', () => {
    freshGame(10, { customers: 100, revenue: 2_000_000, itemsSold: 100, unhappy: 0 }); // đủ bộ thường, thiếu bộ ×2 (doanh thu mục tiêu ×2 ≈ 2.475tr)
    useGame.getState().placeBet(2.0);
    const p = dailySetProgress(questContext(useGame.getState()));
    expect(p.allDone).toBe(false); // kèo ×2 chưa trúng
    expect(useGame.getState().claimQuest('daily_revenue')).toBe(false); // chưa đạt mục tiêu ×2 → không nhận được
  });
});

describe('an toàn save cũ — questLog.bet tự bù, không lệ thuộc SAVE_VERSION', () => {
  it('bản lưu cũ thiếu questLog.bet → nạp lại tự bù null', () => {
    applySnapshot({
      saveVersion: 2,
      day: 9,
      questLog: { day: 9, claimedDaily: ['daily_customers'], claimedStory: ['story_first_customers'] },
    } as never);
    const log = useGame.getState().questLog;
    expect(log.day).toBe(9);
    expect(log.claimedDaily).toEqual(['daily_customers']);
    expect(log.bet).toBeNull();
  });

  it('bản lưu mới có kèo → nạp lại giữ nguyên kèo (không bị mặc định đè)', () => {
    applySnapshot({
      saveVersion: 2,
      day: 5,
      questLog: { day: 5, claimedDaily: [], claimedStory: [], bet: { day: 5, questId: BET_QUEST_ID, tier: 2.0, bonus: 0 } },
    } as never);
    const bet = useGame.getState().questLog.bet;
    expect(bet).toEqual({ day: 5, questId: BET_QUEST_ID, tier: 2.0, bonus: 0 });
    expect(betStatus(5, bet)).toBe('pending');
  });

  // GĐ113 — người chơi có kèo treo đặt theo luật CŨ (trọn bộ); sau GĐ107 kèo nay trúng theo VIỆC CHÍNH:
  // chỉ cần khép bộ chính (đông khách + bán hàng + doanh thu) là trúng, dù chưa làm việc phụ xoay.
  it('kèo treo từ save cũ (trọn bộ) nay trúng khi chỉ khép VIỆC CHÍNH — GĐ107 cảnh tương thích', () => {
    freshGame(10, bigStats as Record<string, unknown>);
    useGame.getState().placeBet(2.0); // đặt theo mục tiêu ×2 (đủ cả bộ)
    const daily = dailyQuests(questContext(useGame.getState()));
    const core = daily.filter((q) => isBetCore(q.id));
    const optional = daily.filter((q) => !isBetCore(q.id));
    // chỉ nhận VIỆC CHÍNH, bỏ hết việc phụ (như người chơi không chạy app/xã hội/nấu hôm đó)
    for (const q of core) expect(useGame.getState().claimQuest(q.id)).toBe(true);
    const bet = useGame.getState().questLog.bet!;
    expect(bet.bonus).toBeGreaterThan(0); // trúng dù optional chưa làm
    expect(betStatus(10, bet)).toBe('won');
    // việc phụ không nhận được nữa (vẫn done nhưng không cần) — không đổi thưởng kèo
    expect(optional.length).toBeGreaterThan(0);
  });

  it('snapshot→applySnapshot: kèo treo nguyên vẹn và vẫn phân định theo việc chính sau round-trip', () => {
    freshGame(10, bigStats as Record<string, unknown>);
    useGame.getState().placeBet(1.5);
    const daily = dailyQuests(questContext(useGame.getState()));
    for (const q of daily.filter((q) => isBetCore(q.id))) useGame.getState().claimQuest(q.id);
    // lưu rồi nạp lại (cùng phiên, giữ ngày) — kèo đã trúng giữ nguyên
    const save = snapshot();
    applySnapshot(save);
    const bet = useGame.getState().questLog.bet!;
    expect(bet.bonus).toBeGreaterThan(0);
    expect(betStatus(10, bet)).toBe('won');
  });
});
