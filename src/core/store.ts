import { create } from 'zustand';
import { emptyQuestLog, emptyTotals, type QuestContext } from '../data/quests';
import { recentAvgSalesProfit } from '../data/gifts';
import { rentOf, type ShopStyle } from '../data/shopTiers';
import type { Review } from '../data/reviews';
import { forecastFrom, newWeatherSeed, type Weather } from '../data/weather';
import type { Lot } from '../data/freshness';
import { REGULARS, visitsToday, type RegularProgress, type Reservation } from '../data/regulars';
import { reputationOf } from '../data/reputation';
import type { ActiveOrder } from '../data/orders';
import { dayEffects, festivalOn, festivalStock } from '../data/calendar';
import type { HappyHour } from '../data/rhythm';
import type { VenueDay } from '../data/venueTrend';
import type { RiskDay } from '../data/risk';
import { emptyRiskToday } from '../data/risk';
import { defaultCounterPolicy } from '../data/counterDeals';
import type { Debt } from '../data/credit';
import type { VendorOffer } from '../data/wholesale';
import { newBiz } from '../data/biz';
import type { PhoneOrder } from '../data/phoneOrders';
import { setCostModifier } from '../data/suppliers';
import { setMarketIndex } from '../data/pricing';
import { hasSkill, type SkillId } from '../data/titles';
import { generateCandidates, type Staff } from '../data/staff';
import type { RandomEvent } from '../data/events';
import type { RepSample } from '../data/reputation';
import type { CommunityProgress, Opening } from '../data/community';
import type { BranchState } from '../data/branches';
import { newSocial } from '../data/social';
import { newOnline } from '../data/online';
import { newGarden } from '../data/garden';
import { newAnalytics } from '../data/analytics';
import { newInspection, type LicenseId } from '../data/licenses';
import { type GameState, type Furniture, type ContractState, type Delivery, type DayRecord, type DayStats, DAY_START, emptyStats, type CookJob , ROUTINE } from './gameTypes';
import { emptyTiers } from './stock';
import { createBranchSlice } from './slices/branch';
import { createOrdersSlice } from './slices/orders';
import { createBuildSlice } from './slices/build';
import { createInventorySlice } from './slices/inventory';
import { createSalesSlice } from './slices/sales';
import { createRegularsSlice } from './slices/regulars';
import { createProgressSlice } from './slices/progress';
import { createStaffSlice } from './slices/staff';
import { createClockSlice } from './slices/clock';
import { createSocialSlice } from './slices/social';
import { createOnlineSlice } from './slices/online';
import { createGardenSlice } from './slices/garden';
import { createLicensesSlice } from './slices/licenses';
import { createQuanNuocSlice } from './slices/quanNuoc';
import { createPrestigeSlice } from './slices/prestige';
import { createDiscoverySlice } from './slices/discovery';

export * from './gameTypes';
export { migrateTiers } from './stock';

/** Số liệu nhiệm vụ đọc từ trạng thái game. */
export const questContext = (s: GameState): QuestContext => {
  // GĐ160 — khách quen hôm nay: đã phục vụ (lastVisitDay === today) + dự kiến ghé (visitsToday là
  // hàm thuần deterministic theo weatherSeed — ai sẽ ghé hôm nay biết trước, ai rồi thì chuyển qua
  // cột "đã phục vụ" nên tổng `regularsComingToday` đứng nguyên trong ngày).
  const regularsServedToday = Object.values(s.regulars).filter((p) => p.lastVisitDay === s.day).length;
  const rep = reputationOf(s.repLog);
  const regularsComingToday = regularsServedToday
    + REGULARS.reduce((n, def) => n + (visitsToday(def, s.day, s.weatherSeed, s.level, s.regulars[def.id], rep) ? 1 : 0), 0);
  return {
    day: s.day, level: s.level, stats: s.stats, totals: s.totals, staffCount: s.staff.length,
    shopTier: s.shopTier, warehouseTier: s.warehouseTier, ordersDone: s.ordersDone, log: s.questLog,
    festivalGoods: festivalOn(s.day) ? festivalStock(festivalOn(s.day)!, s.level) : [],
    reservationsToday: Object.values(s.reservations).filter((r) => r.day === s.day).length,
    rent: rentOf(s.shopTier),
    avgDailyProfit: recentAvgSalesProfit(s.history),
    weather: s.weather,
    regularsServedToday,
    regularsComingToday,
  };
};

/** Trạng thái lúc bắt đầu game mới. */
export const newGameData = () => ({
  day: 1,
  minutes: DAY_START,
  money: 300000,
  level: 1,
  xp: 0,
  storage: { mi: 10, nuoc: 10, banh: 5 } as Record<string, number>,
  storageLots: {} as Record<string, Lot[]>,
  furniture: [
    {
      uid: 1, type: 'shelf', x: -1.8, z: -2.0, rot: 0,
      tiers: [
        { productId: 'mi', count: 4 }, { productId: 'mi', count: 2 }, { productId: 'nuoc', count: 4 },
        { productId: 'nuoc', count: 2 }, { productId: 'banh', count: 4 }, { productId: null, count: 0 },
        // Kệ hiện nay 3 tầng × 4 ô = 12 ô: kit phải đủ số ô như kệ mua mới, kẻo panel Sơ đồ kệ đếm thiếu
        ...emptyTiers('shelf').slice(6),
      ],
    },
    { uid: 2, type: 'shelf', x: 0.4, z: -2.0, rot: 0, tiers: emptyTiers('shelf') },
  ] as Furniture[],
  mainCounter: null as { x: number; z: number; rot: number } | null,
  shelfHeat: {} as Record<number, number>,
  shelfProfit: {} as Record<number, { profit: number; since: number }>,
  impulseHinted: false,
  prices: {} as Record<string, number>,
  happyHour: null as HappyHour | null,
  stats: emptyStats(),
  shopTier: 0,
  pendingUpgrade: false,
  style: { wall: 0xfff3b0, floor: 0xd8cfc0, roof: 0x1e8449 } as ShopStyle,
  staff: [] as Staff[],
  candidates: generateCandidates(1, 1),
  autoOpen: true,
  autoOpenAt: ROUTINE.open,
  // Ván mới để người chơi tự điều hành core loop (ra tiệm, mở cửa); bản lưu cũ giữ nguyên thói quen
  autoRoutine: false,
  autoSwap: true,
  totals: emptyTotals(),
  questLog: emptyQuestLog(),
  warehouseTier: 0,
  reviews: [] as Review[],
  repLog: [] as RepSample[],
  community: {} as Record<string, CommunityProgress>,
  opening: undefined as Opening | undefined,
  deliveries: [] as Delivery[],
  demand: {} as Record<string, number>,
  demandToday: {} as Record<string, number>,
  sales: {} as Record<string, number>,
  salesToday: {} as Record<string, number>,
  soldEver: {} as Record<string, number>,
  comboHitCount: {} as Record<string, number>,
  regulars: {} as Record<string, RegularProgress>,
  reservations: {} as Record<string, Reservation>,
  history: [] as DayRecord[],
  venueTrend: [] as VenueDay[],
  riskToday: emptyRiskToday(),
  riskTrend: [] as RiskDay[],
  activeCombos: [] as string[],
  order: null as ActiveOrder | null,
  ordersDone: 0,
  cookJobs: [] as CookJob[],
  vendorOffer: null as VendorOffer | null,
  phoneOrders: [] as PhoneOrder[],
  phoneSlot: 0,
  phoneHintDay: 0,
  phoneOrdersDone: 0,
  debts: {} as Record<string, Debt>,
  market: {} as Record<string, number>,
  allowCredit: true,
  counterPolicy: defaultCounterPolicy(),
  biz: newBiz(),
  vendorDay: 0,
  marketClearedDay: 0,
  marketLast: { day: 0, units: 0, revenue: 0 } as { day: number; units: number; revenue: number },
  contracts: {} as Record<string, ContractState>,
  event: null as RandomEvent | null,
  costume: 'default',
  shopName: 'Tạp Hóa Đầu Ngõ',
  giftStreak: 0,
  giftLastDay: 0,
  giftGraceDay: 0,
  wheelLastDay: 0,
  wheelLastPrize: null as { icon: string; label: string } | null,
  wheelBoost: 1,
  lastSeenAt: 0,
  skills: [] as SkillId[],
  titles: [] as string[],
  fakeCash: 0,
  branch: null as BranchState | null,
  social: newSocial(),
  online: newOnline(),
  licenses: {} as Partial<Record<LicenseId, number>>,
  inspection: newInspection(),
  garden: newGarden(),
  analytics: newAnalytics(),
  ...initialWeather(),
});

/** Thời tiết ván mới: ngày đầu luôn nắng, dự báo nối tiếp từ đó. */
export function initialWeather(seed = newWeatherSeed()) {
  return { weatherSeed: seed, weather: 'sunny' as Weather, forecast: forecastFrom(seed, 1, 'sunny') };
}

/**
 * Đồng hồ game tách khỏi useGame: tick() cập nhật mỗi KHUNG HÌNH nên nếu để trong useGame thì
 * mọi component dùng nguyên `useGame()` (cả HUD, mọi panel) phải vẽ lại 60 lần/giây. Giờ chỉ
 * component thật sự hiện giờ/phút giờ subscribe đây, và chọn theo phút nguyên cho đỡ lần vẽ.
 */
export const useClock = create<{ minutes: number }>(() => ({ minutes: DAY_START }));

export const useGame = create<GameState>((set, get) => {
  // Giá nhập theo lễ, sự kiện thị trường và kỹ năng thương lượng
  setCostModifier((id, day) => {
    const s = get();
    return dayEffects(s.weatherSeed, day, s.level).cost(id) * (hasSkill(s.skills, 'negotiator') ? 0.95 : 1);
  });
  // Giá gợi ý hiện hành theo hệ số thị trường (khan hàng trượt lên, tồn nhiều trượt xuống)
  setMarketIndex((id) => get().market[id] ?? 1);

  return {
    ...newGameData(),
    stylePreview: null,
    speed: 1,
    location: 'Nhà của bạn',
    hint: null,
    message: null,
    panel: null,
    lastSummary: null as { day: number; stats: DayStats } | null,
    buildMode: false,
    placing: null,
    shopOpen: false,
    waiting: 0,
    customersInside: 0,
    atBranch: false,
    vendorOffer: null,
    dirt: 0,
    ...createBranchSlice(set, get),
    ...createOrdersSlice(set, get),
    ...createBuildSlice(set, get),
    ...createInventorySlice(set, get),
    ...createSalesSlice(set, get),
    ...createRegularsSlice(set, get),
    ...createProgressSlice(set, get),
    ...createStaffSlice(set, get),
    ...createClockSlice(set, get),
    ...createSocialSlice(set, get),
    ...createOnlineSlice(set, get),
    ...createGardenSlice(set, get),
    ...createLicensesSlice(set, get),
    ...createQuanNuocSlice(set, get),
    ...createPrestigeSlice(set, get),
    ...createDiscoverySlice(set, get),
  };
});

// Mọi chỗ đặt minutes qua set() bình thường (ngủ dậy, đi lại...) cũng đồng bộ sang đồng hồ UI
useGame.subscribe((s, prev) => {
  if (s.minutes !== prev.minutes) useClock.setState({ minutes: s.minutes });
});

export function formatClock(minutes: number): string {
  const m = Math.floor(minutes) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}
