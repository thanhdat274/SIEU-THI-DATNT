import { newGameData } from './store';
import type { GameState } from './gameTypes';
import { relTier, PARTNER_TIERS } from '../data/supplierRel';

/**
 * Tái sinh (NG+): bắt đầu lại bản chạy tiệm từ cấp 1 nhưng giữ bộ sưu tập tài khoản và nhận bonus
 * doanh thu cộng dồn. Logic thuần + hằng số ở đây — slice action doPrestige() (slices/prestige.ts)
 * chỉ kiểm tra điều kiện rồi gọi prestigeRestart().
 *
 * Lưu ý vòng import: prestige.ts import newGameData từ ./store (store.ts cũng kéo slice này).
 * newGameData chỉ được dùng bên trong thân function (gọi chậm khi chơi, sau khi store đã khởi tạo
 * xong) nên binding sống của ESM không gặp TDZ; build sạch.
 */

/** Cấp tối thiểu mới được tái sinh. */
export const PRESTIGE_MIN_LEVEL = 60;
/** Doanh thu cả đời (totals.revenue) tối thiểu mới được tái sinh. */
export const PRESTIGE_MIN_REVENUE = 100_000_000;
/** Hệ số doanh thu tăng thêm mỗi lần tái sinh (+8%). */
export const PRESTIGE_BONUS = 0.08;
/** Trần số lần tái sinh (6 lần = +48%). */
export const PRESTIGE_MAX_LEVEL = 6;

/** Có được tái sinh không: đủ sâu cuối game, chưa chạm trần. */
export function prestigeEligible(level: number, lifetimeRevenue: number, prestigeLevel: number): boolean {
  return level >= PRESTIGE_MIN_LEVEL && lifetimeRevenue >= PRESTIGE_MIN_REVENUE && prestigeLevel < PRESTIGE_MAX_LEVEL;
}

/** Bonus % doanh thu nhận được sau lần tái sinh thứ (prestigeLevel+1). 0→0.08, 5→0.48. */
export function nextBonus(prestigeLevel: number): number {
  return (prestigeLevel + 1) * PRESTIGE_BONUS;
}

/** Hệ số doanh thu = 1 + bonus (bonus 0 → 1, không đổi hành vi save cũ). */
export function revenueFactor(bonus: number): number {
  return 1 + bonus;
}

/**
 * Trả về bản chạy mới (giữ nội dung bộ sưu tập tài khoản) sau một lần tái sinh.
 * - GIỮ: các trường sưu tập trong biz (thành tựu, cốt truyện, nhà, xe, thú cưng, rival...) và toàn
 *   bộ top-level của tài khoản (titles, skills, costume, giftStreak, giftLastDay, giftGraceDay,
 *   wheelLastDay, wheelBoost, totals).
 * - TĂNG: prestige.level +1, bonus = nextBonus của mức cũ.
 * - RESET: mọi thứ còn lại về mặc định newGameData (money, level, day, furniture, storage, garden,
 *   branch, quanNuoc, inventory, licenses, staff, online, social, market, regulars, questLog, reviews...).
 */
export function prestigeRestart(prev: GameState): GameState {
  const base = newGameData();
  const level = prev.biz.prestige.level + 1;
  const bonus = nextBonus(prev.biz.prestige.level);
  const b = prev.biz;
  return {
    ...base,
    // Vòng mới: tắt cửa hàng/bảng/giao diện tạm thời như resetGame
    shopOpen: false,
    panel: null,
    buildMode: false,
    placing: null,
    // Bộ sưu tập tài khoản giữ nguyên
    titles: prev.titles,
    skills: prev.skills,
    costume: prev.costume,
    giftStreak: prev.giftStreak,
    giftLastDay: prev.giftLastDay,
    giftGraceDay: prev.giftGraceDay,
    wheelLastDay: prev.wheelLastDay,
    wheelBoost: prev.wheelBoost,
    totals: prev.totals,
    biz: {
      ...base.biz,
      achievements: b.achievements,
      chapters: b.chapters,
      chapterPending: b.chapterPending,
      story: b.story,
      home: b.home,
      vehicle: b.vehicle,
      pets: b.pets,
      breakfastDay: b.breakfastDay,
      tutorialOff: b.tutorialOff,
      rival: b.rival,
      rivalsBeaten: b.rivalsBeaten,
      prestige: { level, bonus, goalsClaimed: [] },
    },
    // Object dữ liệu này sẽ được store merge (set) lên state hiện có (vốn giữ sẵn các hàm slice),
    // nên ép kiểu sang GameState ở đây cho khớp hợp đồng — giống cách newGameData() được dùng trong thực tế.
  } as unknown as GameState;
}

/** Đầu vào thuần đọc cho dự phóng tái sinh — mọi trường đều đọc state có sẵn, KHÔNG đổi save/kinh tế. */
export interface PrestigePreviewInput {
  /** Cấp hiện tại (s.level). */
  level: number;
  /** Doanh thu cả đời (s.totals.revenue). */
  lifetimeRevenue: number;
  /** Số lần đã tái sinh (s.biz.prestige.level). */
  prestigeLevel: number;
  /** Bonus doanh thu đang có (s.biz.prestige.bonus). */
  bonus: number;
  /** Lãi bình quân/ngày gần đây (recentAvgProfit(s.history) — helper có sẵn). */
  avgDailyProfit: number;
  /** Hồ sơ mối quen nhà cung (s.biz.supplierRel). */
  supplierRel: Record<string, { spent: number; orders: number }>;
  /** Ngày đã bán chợ phiên gần nhất (s.marketClearedDay). */
  marketClearedDay: number;
  /** Ngày hiện tại (s.day). */
  currentDay: number;
  /** Số ngày dữ liệu phân tích đã gom (độ dài analytics.flags — key là ngày game). */
  analyticsDays: number;
}

/** Dự phóng tái sinh (GĐ139): định lượng "bỏ lại gì" vs "nhận gì" cho quyết định NG+ — trục lặp lại
 * cuối cùng còn là hộp đen (đóng ngưỡng nhị phân + bonus cố định mà không cho thấy chi phí cơ hội).
 * THUẦN đọc: trả về mô tả có cấu trúc, không đổi state. Bỏ lại = những tích lũy bị prestigeRestart reset
 * (mối quen nhà cung, phiên chợ chưa kịp gánh, bề dày phân tích); nhận = thu nhập vòng sau tăng theo +8%.
 */
export function prestigePreview(input: PrestigePreviewInput) {
  const { level, lifetimeRevenue, prestigeLevel, bonus, avgDailyProfit, supplierRel, marketClearedDay, currentDay, analyticsDays } = input;
  const eligible = prestigeEligible(level, lifetimeRevenue, prestigeLevel);
  const capped = prestigeLevel >= PRESTIGE_MAX_LEVEL;
  const nb = nextBonus(prestigeLevel); // 0.08 → 0.48
  // Nhận: thu nhập vòng sau tăng thêm ≈ avgDailyProfit × nextBonus (lãi một ngày × thêm 8%/lần).
  const projectedDailyGain = eligible && !capped ? Math.round(avgDailyProfit * (nb - bonus)) : 0;
  // Bỏ lại: mối quen — số mối còn tích lũy + bậc cao nhất (hoàn tháng/tháng mất đi khi reset).
  const suppliers = Object.values(supplierRel);
  const suppliersActive = suppliers.filter((r) => r.spent > 0).length;
  const topRelTier = suppliers.length ? Math.max(...suppliers.map((r) => relTier(r.spent).level)) : 0;
  // Bỏ lại: chợ phiên — hôm nay là ngày chợ mà chưa bán → bỏ lại phiên chợ chưa kịp gánh.
  const marketDayEvery = 7; // MARKET_EVERY của chợ phiên (GĐ135); FIRST_MARKET=7
  const unsoldMarketDay = eligible && !capped && marketClearedDay !== currentDay && currentDay >= 7 && currentDay % marketDayEvery === 0;
  return {
    eligible,
    capped,
    nextBonus: Math.round(nb * 100), // %
    projectedDailyGain,
    suppliersActive,
    topRelTier,
    unsoldMarketDay,
    analyticsDays,
    maxTier: PARTNER_TIERS.length,
  };
}
