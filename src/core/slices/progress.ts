import { noteUnlocked } from '../dayReport';
import { applyChest } from '../../data/giftChest';
import { weekendGift } from '../../data/weekendGift';
import { vietSetCount } from '../../data/decorSets';
import { dailyQuests, betBonusMoney, betStatus, BET_TIERS, BET_QUEST_ID, betCoreSetProgress, storyQuest } from '../../data/quests';
import { fitList, levelUpToast } from '../../data/onboarding';
import { MAX_LEVEL, unlocksAt, xpToNext } from '../../data/levels';
import { formatMoney } from '../../data/products';
import { SKILLS, skillPoints, TITLES, PRESTIGE_TITLES, type TitleContext } from '../../data/titles';
import { summarizeReviews } from '../../data/reviews';
import { costumeById } from '../../data/costumes';
import { giftOfStreak, giftText, recentAvgProfit, scaledGiftEco, scaledPrize, spinWheelPrize, welcomeBackReward, daysAway } from '../../data/gifts';
import { offlineRevenue } from '../../data/offlineRevenue';
import { COOKED_PRODUCT_IDS } from '../../data/recipes';
import { freeSeat } from '../../data/dineIn';
import { isCookStation } from '../../data/furniture';
import { recentAvgSalesProfit } from '../../data/gifts';
import { feedCost, landmark2Progress, landmarkProgress, LANDMARK_STAGES, LANDMARK2_STAGES, LANDMARK_TARGETS, LANDMARK2_TARGETS } from '../../data/landmark';
import { ngGoalProgress } from '../../data/ngGoals';
import { playSfx } from '../audio';
import type { GameState, SetState, GetState } from '../gameTypes';
import { questContext } from '../store';
import { alleyBond, tiesMilestonesReached } from '../../data/regularTies';
import { LIFE_EVENT_UNLOCK } from '../../data/lifeEvent';
import { hasFeature } from '../../data/features';

/** Tiến trình: XP, nhiệm vụ, danh hiệu, kỹ năng, quà điểm danh, vòng quay, trang phục, tên tiệm. */

export const createProgressSlice = (set: SetState, get: GetState): Pick<GameState, 'setCostume' | 'setShopName' | 'claimGift' | 'spinWheel' | 'learnSkill' | 'checkTitles' | 'claimQuest' | 'claimNgGoal' | 'placeBet' | 'addXp' | 'checkWelcomeBack' | 'collectOfflineRevenue' | 'contributeLandmark' | 'dismissUnlockAct'> => ({
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
    const gift = weekendGift(applyChest(scaledGiftEco(giftOfStreak(streak), s.level, recentAvgProfit(s.history)), streak, s.level, s.day), s.level, s.day); // GĐ1533 + GĐ1555
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
  /** GĐ1497 — doanh thu khi vắng mặt: khu ăn tại chỗ chạy ≈5% tốc độ chơi thật (GĐ1531), trần 30 + cấp×5 phút thực,
   *  đủ điều kiện (bàn ghế + trạm nấu + món nấu bày kệ) mới có thu; chỉ tiền, không XP/không lượt sao. */
  collectOfflineRevenue: () => {
    const s = get();
    const awayMinutes = s.lastSeenAt > 0 ? (Date.now() - s.lastSeenAt) / 60_000 : 0;
    const furn = s.furniture.filter((f) => !f.trial);
    const result = offlineRevenue({
      awayMinutes,
      level: s.level,
      recentAvgDailyProfit: recentAvgSalesProfit(s.history),
      hasDineSeat: freeSeat(furn, new Set()) !== null,
      hasCookStation: furn.some((f) => isCookStation(f.type) && !f.broken),
      hasCookedStocked: furn.some((f) => !f.broken && f.tiers.some((t) => t.productId && t.count > 0 && COOKED_PRODUCT_IDS.has(t.productId))),
    });
    if (result.gain > 0) {
      set({ money: s.money + result.gain });
      s.notify(`🍛 Vắng ${Math.round(awayMinutes)} phút — khu ăn uống thu +${formatMoney(result.gain)} (~${result.customers} khách).`);
      playSfx('sale');
    }
    return result;
  },
  contributeLandmark: () => {
    const s = get();
    const { contributions, lastContributeDay } = s.biz.landmark;
    const prog = landmarkProgress(contributions);
    const prog2 = landmark2Progress(contributions);
    if (prog.done && prog2?.done) {
      s.notify('Cả sân chơi và đèn đường đều hoàn thành rồi!');
      return false;
    }
    if (lastContributeDay === s.day) {
      s.notify('Hôm nay đã góp rồi — mai quay lại góp tiếp nhé!');
      return false;
    }
    // GĐ732: sân chơi xong → lượt góp tiếp theo chuyển sang dự án Đèn Đường Ngõ 1
    const isP2 = prog.done;
    const index = isP2 ? (prog2?.index ?? 0) : prog.index;
    const cost = feedCost(index, s.level);
    if (s.money < cost) {
      s.notify('Chưa đủ tiền mua vật liệu');
      return false;
    }
    const next = contributions + 1;
    set({ biz: { ...s.biz, landmark: { contributions: next, lastContributeDay: s.day } }, money: s.money - cost });
    s.notify(isP2 ? '💡 Đã góp vật liệu cho đèn đường (+1/20)' : '🏗️ Đã góp vật liệu cho sân chơi (+1/28)');
    playSfx('gift');
    // Vừa chạm đúng mốc một giai đoạn → trao thưởng tiền + XP (chỉ đúng lúc chạm, không cộng dồn)
    const stageIdx = LANDMARK_TARGETS.findIndex((t) => t === next);
    const stageIdx2 = isP2 ? LANDMARK2_TARGETS.findIndex((t) => t === next) : -1;
    if (stageIdx2 >= 0) {
      const stage = LANDMARK2_STAGES[stageIdx2];
      get().addXp(stage.bonusXp);
      set({ money: get().money + stage.bonusMoney });
      s.notify(`💡 ${stage.title} hoàn thành! Nhận +${formatMoney(stage.bonusMoney)} + ${stage.bonusXp} XP`);
      if (stageIdx2 === LANDMARK2_STAGES.length - 1) {
        s.notify('💡💡 Đèn đường Ngõ 1 thắp sáng — đêm hẻm sáng sủa, khách đêm đông hơn!');
      }
    } else if (stageIdx >= 0) {
      const stage = LANDMARK_STAGES[stageIdx];
      get().addXp(stage.bonusXp);
      set({ money: get().money + stage.bonusMoney });
      s.notify(`🎉 ${stage.title} hoàn thành! Nhận +${formatMoney(stage.bonusMoney)} + ${stage.bonusXp} XP`);
      if (stageIdx === LANDMARK_STAGES.length - 1) {
        get().checkTitles();
        s.notify('🎊 Sân chơi khánh thành — dự án kế: 💡 Đèn Đường Ngõ 1!');
      }
    }
    return true;
  },
  spinWheel: () => {
    const s = get();
    if (s.wheelLastDay === s.day) return null;
    const prize = scaledPrize(spinWheelPrize(s.level, s.day), s.level);
    set({
      wheelLastDay: s.day,
      wheelLastPrize: { icon: prize.icon, label: prize.label },
      ...(prize.boost ? { wheelBoost: 1 + prize.boost } : {}),
      ...(prize.money ? { money: s.money + prize.money } : {}),
      ...(prize.furniture ? { furnStash: { ...s.furnStash, [prize.furniture]: (s.furnStash[prize.furniture] ?? 0) + 1 } } : {}),
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
    // Hệ3-L8: các mục tiêu theo HƯỚNG biển (ng_stance_*) loại khỏi "trọn bộ" — ba hướng vốn loại trừ
    // nhau trong một vòng (đổi biển về 0 bậc), chúng là "lý do chơi khác nhau" chứ không phải checklist.
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
        stance: s.biz.stance,
      })
        .filter((g) => !g.id.startsWith('ng_stance_'))
        .every((g) => g.done);
    const bond = alleyBond(s.regulars, s.biz.tiesMended ?? []);
    const ctx: TitleContext = {
      level: s.level, day: s.day, customers: s.totals.customers, itemsSold: s.totals.itemsSold, revenue: s.totals.revenue,
      rating: rating.average, reviewCount: rating.count, ordersDone: s.ordersDone, staffCount: s.staff.length,
      brandRep: s.biz.brand?.rep ?? 0, // Hệ4-L9 — danh hiệu nhãn riêng
      brandFranchiseStreak: s.biz.brand?.franchiseHealthyStreak ?? 0,
      closeRegulars: Object.values(s.regulars).filter((r) => r.perks.length).length,
      prestige: s.biz.prestige.level,
      ngGoalsAllDone,
      vietSetPieces: vietSetCount(s.furniture),
      alleyBond: bond,
      seals: (s.biz.prestige.seals ?? []).length, // Hệ3-L8: đủ 3 ấn → danh hiệu Tam ấn định vị
    };
    // ── Mốc "Tình làng" (SPEC §2.8): 25/50/75/100% — tiền + mốc 100% tặng decor, MỘT LẦN MỖI VÁN ──
    // Cổng cấp ≥ LIFE_EVENT_UNLOCK (32) cùng mọi hệ 2 → golden L30 giữ byte (R1). checkTitles chạy
    // khi thân thiết đổi (giftRegular/deliver/giao đơn…) nên mốc tự nhận đúng lúc vượt.
    if (hasFeature(s, 'lifeEvent')) {
      const claimed = s.biz.tiesMilestones ?? [];
      const reached = tiesMilestonesReached(bond, claimed);
      if (reached.length) {
        let money = 0;
        let stash = s.furnStash;
        for (const m of reached) {
          money += m.money;
          if (m.decor) stash = { ...stash, [m.decor]: (stash[m.decor] ?? 0) + 1 };
        }
        const biz = { ...s.biz, tiesMilestones: [...claimed, ...reached.map((m) => m.pct)] };
        const stashChanged = reached.some((m) => m.decor);
        set({
          money: s.money + money,
          biz,
          ...(stashChanged ? { furnStash: stash } : {}),
          stats: { ...s.stats, questIncome: (s.stats.questIncome ?? 0) + money },
        });
        const names = reached.map((m) => `${m.pct}%`).join(', ');
        s.notify(`🏮 Tình làng đạt ${names}: +${formatMoney(money)}${stashChanged ? ' · 🎁 nhận "Cổng chào hẻm văn hoá" (Kho đồ → đặt trong tiệm)' : ''}`);
        playSfx('achieve');
      }
    }
    const fresh = TITLES.filter((t) => !s.titles.includes(t.id) && t.done(ctx));
    // Danh hiệu NG+ độc quyền: cần đủ số lần tái sinh (bộ sưu tập giữ qua vòng) + thỏa điều kiện thường.
    const freshPrestige = PRESTIGE_TITLES.filter(
      (t) => !s.titles.includes(t.id) && s.biz.prestige.level >= (t.prestige ?? 0) && t.done(ctx),
    );
    const all = [...fresh, ...freshPrestige];
    if (!all.length) return;
    set({ titles: [...s.titles, ...all.map((t) => t.id)] });
    if (s.day > 1 || freshPrestige.length) s.notify(fitList('🏅 Danh hiệu mới: ', all.map((t) => `${t.icon} ${t.name}`)));
    playSfx('achieve');
  },
  claimQuest: (id) => {
    const s = get();
    const ctx = questContext(s);
    const q = [...dailyQuests(ctx), storyQuest(ctx)].find((it) => it?.id === id);
    if (!q || !q.done || q.claimed) return false;
    // Sang ngày mới: bộ nhiệm vụ ngày làm lại từ đầu; kèo hôm qua (nếu còn treo) hết giá trị, dọn luôn
    const log = s.questLog.day === s.day ? s.questLog : { ...s.questLog, day: s.day, claimedDaily: [], bet: null };
    // GĐ1178: ghi nhận tiền thưởng nhiệm vụ vào stats.questIncome (optional, reset theo ngày) để tổng kết
    // cuối ngày so được với "lãi bán hàng thật" (Luật 10). Chỉ là ghi nhận — không đổi tiền/kinh tế/seed.
    set({
      money: s.money + q.money,
      stats: { ...s.stats, questIncome: (s.stats.questIncome ?? 0) + q.money },
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
      stance: s.biz.stance, // Hệ3-L8: mục tiêu theo hướng biển đo bậc vòng này
    });
    const goal = progress.find((g) => g.id === id);
    if (!goal || !goal.done) return false;
    set({
      money: s.money + goal.reward,
      biz: { ...s.biz, prestige: { ...s.biz.prestige, goalsClaimed: [...claimedSet, id] } },
      // GĐ1193: ghi thưởng Mục tiêu vòng vào sổ questIncome như mọi thưởng khác — trước nay mục tiêu vòng
      // (NG+) cộng thẳng tiền mà bỏ lọt tổng kết ngày, nên nguồn thu "thưởng" ở báo cáo bán-hàng-là-chính
      // (Luật 10) tính thiếu khoản lớn có thể lấn lãi bán thật. Chỉ ghi nhận — không đổi tiền/kinh tế/seed.
      stats: { ...s.stats, questIncome: (s.stats.questIncome ?? 0) + goal.reward },
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
    if (s.day > 1) s.notify(`🎯 Chốt "${def.name}": làm trọn việc chính ×${def.tier} là trúng kèo, hụt không mất gì!`);
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
      s.notify(levelUpToast(level, gained));
      // SPEC-TOI-UU §T1 (L1): đếm số mục mới mở hôm nay cho báo cáo ngày ẩn danh.
      noteUnlocked(gained.length);
    }
  },
});
