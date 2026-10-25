import { dailyQuests, storyQuest } from '../../data/quests';
import { MAX_LEVEL, unlocksAt, xpToNext } from '../../data/levels';
import { formatMoney } from '../../data/products';
import { SKILLS, skillPoints, TITLES, type TitleContext } from '../../data/titles';
import { summarizeReviews } from '../../data/reviews';
import { costumeById } from '../../data/costumes';
import { giftOfStreak, giftText, spinWheelPrize } from '../../data/gifts';
import { playSfx } from '../audio';
import type { GameState, SetState, GetState } from '../gameTypes';
import { questContext } from '../store';

/** Tiến trình: XP, nhiệm vụ, danh hiệu, kỹ năng, quà điểm danh, vòng quay, trang phục, tên tiệm. */

export const createProgressSlice = (set: SetState, get: GetState): Pick<GameState, 'setCostume' | 'setShopName' | 'claimGift' | 'spinWheel' | 'learnSkill' | 'checkTitles' | 'claimQuest' | 'addXp'> => ({
  setCostume: (id) => {
    const s = get();
    const def = costumeById(id);
    if (!def) return;
    if (s.level < def.unlock) { s.notify(`Cần cấp ${def.unlock} để mở trang phục này`); return; }
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
    const streak = s.giftLastDay === s.day - 1 ? s.giftStreak + 1 : 1;
    const gift = giftOfStreak(streak);
    set({
      giftStreak: streak,
      giftLastDay: s.day,
      ...(gift.money ? { money: s.money + gift.money } : {}),
    });
    if (gift.xp) get().addXp(gift.xp);
    s.notify(`🎁 Điểm danh ngày ${((streak - 1) % 7) + 1}: ${gift.icon} ${gift.label} — ${giftText(gift)}`);
    return true;
  },
  spinWheel: () => {
    const s = get();
    if (s.wheelLastDay === s.day) return null;
    const prize = spinWheelPrize();
    set({
      wheelLastDay: s.day,
      ...(prize.boost ? { wheelBoost: 1 + prize.boost } : {}),
      ...(prize.money ? { money: s.money + prize.money } : {}),
    });
    if (prize.xp) get().addXp(prize.xp);
    s.notify(`🎡 Vòng quay may mắn: ${prize.icon} ${prize.label}!`);
    return prize;
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
    const ctx: TitleContext = {
      level: s.level, day: s.day, customers: s.totals.customers, itemsSold: s.totals.itemsSold, revenue: s.totals.revenue,
      rating: rating.average, reviewCount: rating.count, ordersDone: s.ordersDone, staffCount: s.staff.length,
      closeRegulars: Object.values(s.regulars).filter((r) => r.perks.length).length,
    };
    const fresh = TITLES.filter((t) => !s.titles.includes(t.id) && t.done(ctx));
    if (!fresh.length) return;
    set({ titles: [...s.titles, ...fresh.map((t) => t.id)] });
    s.notify(`🏅 Danh hiệu mới: ${fresh.map((t) => `${t.icon} ${t.name}`).join(', ')}`);
  },
  claimQuest: (id) => {
    const s = get();
    const ctx = questContext(s);
    const q = [...dailyQuests(ctx), storyQuest(ctx)].find((it) => it?.id === id);
    if (!q || !q.done || q.claimed) return false;
    const log = s.questLog.day === s.day ? s.questLog : { ...s.questLog, day: s.day, claimedDaily: [] };
    set({
      money: s.money + q.money,
      questLog: id.startsWith('story_')
        ? { ...log, claimedStory: [...log.claimedStory, id] }
        : { ...log, claimedDaily: [...log.claimedDaily, id] },
    });
    if (q.xp) get().addXp(q.xp);
    s.notify(`📜 Xong "${q.title}": +${formatMoney(q.money)}${q.xp ? ` · +${q.xp} XP` : ''}`);
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
