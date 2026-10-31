import { dailyQuests, betBonusMoney, betStatus, BET_TIERS, BET_QUEST_ID, betCoreSetProgress, dailySetProgress, storyQuest } from '../../data/quests';
import { MAX_LEVEL, unlocksAt, xpToNext } from '../../data/levels';
import { formatMoney } from '../../data/products';
import { SKILLS, skillPoints, TITLES, PRESTIGE_TITLES, type TitleContext } from '../../data/titles';
import { summarizeReviews } from '../../data/reviews';
import { costumeById } from '../../data/costumes';
import { giftOfStreak, giftText, recentAvgProfit, scaledGiftEco, scaledPrize, spinWheelPrize, welcomeBackReward, daysAway } from '../../data/gifts';
import { feedCost, landmarkProgress, LANDMARK_STAGES, LANDMARK_TARGETS } from '../../data/landmark';
import { ngGoalProgress, NG_GOALS } from '../../data/ngGoals';
import { playSfx } from '../audio';
import type { GameState, SetState, GetState } from '../gameTypes';
import { questContext } from '../store';

/** Tiến trình: XP, nhiệm vụ, danh hiệu, kỹ năng, quà điểm danh, vòng quay, trang phục, tên tiệm. */

export const createProgressSlice = (set: SetState, get: GetState): Pick<GameState, 'setCostume' | 'setShopName' | 'claimGift' | 'spinWheel' | 'learnSkill' | 'checkTitles' | 'claimQuest' | 'claimNgGoal' | 'placeBet' | 'addXp' | 'checkWelcomeBack' | 'contributeLandmark' | 'dismissUnlockAct'> => ({
  setCostume: (id) => {
    const s = get();
    const def = costumeById(id);
    if (!def) return;
    if (s.level < def.unlock) { s.notify(`Cần cấp ${def.unlock} để mở trang phục này`); return; }
    if ((def.prestige ?? 0) > s.biz.prestige.level) { s.notify(`Cần tái sinh ${def.prestige} lần để mở trang phục NG+ này`); return; }
    set({ costume: id });
    s.notify(`👕 Đổi sang "${def.name}"`);
  },
  setShopName: (name) => {
    const clean = name.trim().slice(0, 24) || 'Tạp Hóa Đầu Ngõ';
    set({ shopName: clean });
    get().notify(`🏪 Tiệm giờ mang tên "${clean}"`);
  },
  claimGift: () => {
    const s = get();
    if (s.giftLastDay === s.day) {
      s.notify('🎁 Hôm nay đã điểm danh rồi, mai quay lại nhé!');
      return false;
    }
    // Vé tha thứ: bỏ quên đúng 1 ngày, chuỗi đang ≥3 và cách lần tha trước ít nhất 7 ngày thì vẫn giữ chuỗi
    const grace = s.day - s.giftLastDay === 2 && s.giftStreak >= 3 && s.day - s.giftGraceDay >= 7;
    const streak = s.giftLastDay === s.day - 1 || grace ? s.giftStreak + 1 : 1;
    const gift = scaledGiftEco(giftOfStreak(streak), s.level, recentAvgProfit(s.history));
    set({
      giftStreak: streak,
      giftLastDay: s.day,
      ...(grace ? { giftGraceDay: s.day } : {}),
      ...(gift.money ? { money: s.money + gift.money } : {}),
    });
    if (gift.xp) get().addXp(gift.xp);
    if (grace) s.notify('🛟 Bạn bận mất 1 ngày — hẻm tha cho lần này, chuỗi điểm danh vẫn giữ!');
    s.notify(`🎁 Điểm danh ngày ${((streak - 1) % 7) + 1}: ${gift.icon} ${gift.label} — ${giftText(gift)}`);
    playSfx('gift');
    return true;
  },
  checkWelcomeBack: () => {
    const s = get();
    const away = daysAway(Date.now(), s.lastSeenAt);
    const reward = welcomeBackReward(away, s.level, recentAvgProfit(s.history));
    // Luôn làm mới mốc ghé — dù có thưởng hay không, để chơi hằng ngày không bao giờ trúng thưởng.
    set({ lastSeenAt: Date.now() });
    if (reward > 0) {
      set({
        money: s.money + reward,
        // Tính vào tổng doanh thu như một khoản thu công bằng (vẫn là tiền vào két).
        totals: { ...s.totals, revenue: s.totals.revenue + reward },
      });
      s.notify(`🎉 Chào mừng quay lại! Tiệm kiếm được +${formatMoney(reward)} khi bạn vắng ${away} ngày.`);
      playSfx('gift');
    }
    return reward;
  },
  contributeLandmark: () => {
    const s = get();
    const { contributions, lastContributeDay } = s.biz.landmark;
    const prog = landmarkProgress(contributions);
    if (prog.done) {
      s.notify('Sân chơi đã khánh thành rồi!');
      return false;
    }
    if (lastContributeDay === s.day) {
      s.notify('Hôm nay đã góp rồi — mai quay lại góp tiếp nhé!');
      return false;
    }
    const cost = feedCost(prog.index, s.level);
    if (s.money < cost) {
      s.notify('Chưa đủ tiền mua vật liệu');
      return false;
    }
    const next = contributions + 1;
    set({ biz: { ...s.biz, landmark: { contributions: next, lastContributeDay: s.day } }, money: s.money - cost });
    s.notify('🏗️ Đã góp vật liệu cho sân chơi (+1/28)');
    playSfx('gift');
    // Vừa chạm đúng mốc một giai đoạn → trao thưởng tiền + XP (chỉ đúng lúc chạm, không cộng dồn)
    const stageIdx = LANDMARK_TARGETS.findIndex((t) => t === next);
    if (stageIdx >= 0) {
      const stage = LANDMARK_STAGES[stageIdx];
      get().addXp(stage.bonusXp);
      set({ money: get().money + stage.bonusMoney });
      s.notify(`🎉 ${stage.title} hoàn thành! Nhận +${formatMoney(stage.bonusMoney)} + ${stage.bonusXp} XP`);
      if (stageIdx === LANDMARK_STAGES.length - 1) {
        get().checkTitles();
        s.notify('🎊 Sân chơi đầu hẻm khánh thành — cả hẻm cảm ơn bạn!');
      }
    }
    return true;
  },
  spinWheel: () => {
    const s = get();
    if (s.wheelLastDay === s.day) return null;
    const prize = scaledPrize(spinWheelPrize(), s.level);
    set({
      wheelLastDay: s.day,
      wheelLastPrize: { icon: prize.icon, label: prize.label },
      ...(prize.boost ? { wheelBoost: 1 + prize.boost } : {}),
      ...(prize.money ? { money: s.money + prize.money } : {}),
    });
    if (prize.xp) get().addXp(prize.xp);
    s.notify(`🎡 Vòng quay may mắn: ${prize.icon} ${prize.label}!`);
    playSfx('gift');
    return prize;
  },
  dismissUnlockAct: (id) => {
    const b = get().biz;
    if ((b.unlockActs ?? []).includes(id)) return;
    set({ biz: { ...b, unlockActs: [...(b.unlockActs ?? []), id] } });
  },
  learnSkill: (id) => {
    const s = get();
    const def = SKILLS.find((k) => k.id === id);
    if (!def || s.skills.includes(id) || s.level < def.unlock || s.skills.length >= skillPoints(s.level)) return;
    set({ skills: [...s.skills, id] });
    s.notify(`${def.icon} Đã học: ${def.name}`);
  },
  checkTitles: () => {
    const s = get();
    const rating = summarizeReviews(s.reviews);
    // GĐ171: danh hiệu "Chủ hẻm lão làng" — hoàn thành TRỌN BỘ mục tiêu vòng tái sinh hiện tại
    // (chỉ xét ở vòng NG+; mục tiêu đọc state reset-vòng nên là thành tích của MỘT vòng cụ thể).
    const ngGoalsAllDone =
      s.biz.prestige.level >= 1 &&
      ngGoalProgress({
        prestigeLevel: s.biz.prestige.level,
        level: s.level,
        staffCount: s.staff.length,
        ordersDone: s.ordersDone,
        supplierRel: s.biz.supplierRel ?? {},
        marketClearedDay: s.marketClearedDay,
        rivalsBeaten: s.biz.rivalsBeaten,
      }).every((g) => g.done);
    const ctx: TitleContext = {
      level: s.level, day: s.day, customers: s.totals.customers, itemsSold: s.totals.itemsSold, revenue: s.totals.revenue,
      rating: rating.average, reviewCount: rating.count, ordersDone: s.ordersDone, staffCount: s.staff.length,
      closeRegulars: Object.values(s.regulars).filter((r) => r.perks.length).length,
      prestige: s.biz.prestige.level,
      ngGoalsAllDone,
    };
    const fresh = TITLES.filter((t) => !s.titles.includes(t.id) && t.done(ctx));
    // Danh hiệu NG+ độc quyền: cần đủ số lần tái sinh (bộ sưu tập giữ qua vòng) + thỏa điều kiện thường.
    const freshPrestige = PRESTIGE_TITLES.filter(
      (t) => !s.titles.includes(t.id) && s.biz.prestige.level >= (t.prestige ?? 0) && t.done(ctx),
    );
    const all = [...fresh, ...freshPrestige];
    if (!all.length) return;
    set({ titles: [...s.titles, ...all.map((t) => t.id)] });
    s.notify(`🏅 Danh hiệu mới: ${all.map((t) => `${t.icon} ${t.name}`).join(', ')}`);
    playSfx('achieve');
  },
  claimQuest: (id) => {
    const s = get();
    const ctx = questContext(s);
    const q = [...dailyQuests(ctx), storyQuest(ctx)].find((it) => it?.id === id);
    if (!q || !q.done || q.claimed) return false;
    // Sang ngày mới: bộ nhiệm vụ ngày làm lại từ đầu; kèo hôm qua (nếu còn treo) hết giá trị, dọn luôn
    const log = s.questLog.day === s.day ? s.questLog : { ...s.questLog, day: s.day, claimedDaily: [], bet: null };
    set({
      money: s.money + q.money,
      questLog: id.startsWith('story_')
        ? { ...log, claimedStory: [...log.claimedStory, id] }
        : { ...log, claimedDaily: [...log.claimedDaily, id] },
    });
    if (q.xp) get().addXp(q.xp);
    s.notify(`📜 Xong "${q.title}": +${formatMoney(q.money)}${q.xp ? ` · +${q.xp} XP` : ''}`);
    playSfx('quest');
    // ── Phân định kèo: vừa nhận đủ quà bộ "việc chính hôm nay" (việc chót của bộ chính) → trả thưởng kèo ──
    // GĐ107: kèo bám bộ VIỆC CHÍNH (đông khách + bán hàng + doanh thu; KHÔNG gồm "khách vui" vì quest đó tự
    // về 0 khi có 1 khách phàn nàn) chứ không phải trọn bộ gồm cả việc phụ xoay (app/social/nấu/combo)
    // gồm cả việc phụ xoay (app/social/nấu/combo) — vì trọn bộ gần như không bao giờ trọn một ngày (GĐ105).
    // Cộng thẳng vào nhịp nhận thưởng bộ chính có sẵn (claimQuest), không cần action nhận riêng.
    const bet = log.bet;
    if (bet && bet.day === s.day && bet.bonus === 0 && !id.startsWith('story_')) {
      const after = get();
      const p = betCoreSetProgress(questContext(after));
      if (p.allDone && p.allClaimed) {
        const totalDailyMoney = dailyQuests(questContext(after)).reduce((n, qq) => n + qq.money, 0);
        const bonus = betBonusMoney(bet.tier, totalDailyMoney);
        set({ money: after.money + bonus, questLog: { ...after.questLog, bet: { ...bet, bonus } } });
        s.notify(`🎯 TRÚNG KÈO! Làm trọn việc chính hôm nay ở mục tiêu ×${bet.tier} — thưởng thêm +${formatMoney(bonus)}`);
        playSfx('gift');
      }
    }
    return true;
  },
  claimNgGoal: (id) => {
    const s = get();
    if (s.biz.prestige.level < 1) { s.notify('🌱 Mục tiêu vòng tái sinh chỉ xuất hiện sau khi bước vào NG+.'); return false; }
    const claimedSet = new Set(s.biz.prestige.goalsClaimed ?? []);
    if (claimedSet.has(id)) return false;
    const progress = ngGoalProgress({
      prestigeLevel: s.biz.prestige.level,
      level: s.level,
      staffCount: s.staff.length,
      ordersDone: s.ordersDone,
      supplierRel: s.biz.supplierRel ?? {},
      marketClearedDay: s.marketClearedDay,
      rivalsBeaten: s.biz.rivalsBeaten, // GĐ171: mục tiêu rival đo theo vòng (reset mỗi tái sinh — GĐ170)
    });
    const goal = progress.find((g) => g.id === id);
    if (!goal || !goal.done) return false;
    set({
      money: s.money + goal.reward,
      biz: { ...s.biz, prestige: { ...s.biz.prestige, goalsClaimed: [...claimedSet, id] } },
    });
    s.notify(`${goal.icon} Mục tiêu vòng mới "${goal.name}": +${formatMoney(goal.reward)}`);
    playSfx('quest');
    // GĐ171: nhận mốc cuối có thể hoàn thành TRỌN BỘ mục tiêu vòng → xét ngay danh hiệu "Chủ hẻm lão làng".
    get().checkTitles();
    return true;
  },
  placeBet: (tier) => {
    const s = get();
    const status = betStatus(s.day, s.questLog.bet);
    if (status === 'pending') { s.notify('🎯 Hôm nay đã chốt kèo rồi — làm trọn việc chính là trúng, hụt thì mai đặt lại!'); return false; }
    if (status === 'won') { s.notify('🎉 Kèo hôm nay đã trúng, không đổi nữa — mai quay lại đặt kèo mới!'); return false; }
    const def = BET_TIERS.find((t) => t.tier === tier);
    if (!def) return false;
    // Sang ngày mới (hoặc hụt hôm qua): kèo cũ hết giá trị, được chốt kèo mới — 1 kèo/ngày
    const log = s.questLog.day === s.day ? s.questLog : { ...s.questLog, day: s.day, claimedDaily: [], bet: null };
    set({ questLog: { ...log, bet: { day: s.day, questId: BET_QUEST_ID, tier, bonus: 0 } } });
    s.notify(`🎯 Chốt "${def.name}": làm trọn việc chính ×${def.tier} là trúng kèo, hụt không mất gì!`);
    playSfx('gift');
    return true;
  },
  addXp: (amount) => {
    let { level, xp } = get();
    const s = get();
    xp += amount;
    const gained: string[] = [];
    while (level < MAX_LEVEL && xp >= xpToNext(level)) {
      xp -= xpToNext(level);
      level++;
      gained.push(...unlocksAt(level));
    }
    set({ xp, level, stats: { ...s.stats, xp: s.stats.xp + amount } });
    if (level !== s.level) {
      playSfx('levelup');
      s.notify(`⭐ Lên cấp ${level}!${gained.length ? ' Mở khóa: ' + gained.join(', ') : ''}`);
    }
  },
});
