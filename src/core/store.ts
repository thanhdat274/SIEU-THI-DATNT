import { create } from 'zustand';
import { warehouseTier } from '../data/warehouse';
import { emptyQuestLog, emptyTotals, type QuestContext } from '../data/quests';
import { rentOf, type ShopStyle } from '../data/shopTiers';
import type { Review } from '../data/reviews';
import { forecastFrom, newWeatherSeed, type Weather } from '../data/weather';
import type { Lot } from '../data/freshness';
import type { RegularProgress, Reservation } from '../data/regulars';
import type { ActiveOrder } from '../data/orders';
import { dayEffects, festivalOn, festivalStock } from '../data/calendar';
import type { HappyHour } from '../data/rhythm';
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
import { newInspection, type LicenseId } from '../data/licenses';
import { type GameState, type Furniture, type ContractState, type Delivery, type DayRecord, DAY_START, emptyStats, type CookJob } from './gameTypes';
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
import { createLicensesSlice } from './slices/licenses';

export * from './gameTypes';
export { migrateTiers } from './stock';

/** Số liệu nhiệm vụ đọc từ trạng thái game. */
export const questContext = (s: GameState): QuestContext => ({
  day: s.day, level: s.level, stats: s.stats, totals: s.totals, staffCount: s.staff.length,
  shopTier: s.shopTier, warehouseTier: s.warehouseTier, ordersDone: s.ordersDone, log: s.questLog,
  festivalGoods: festivalOn(s.day) ? festivalStock(festivalOn(s.day)!, s.level) : [],
  reservationsToday: Object.values(s.reservations).filter((r) => r.day === s.day).length,
  rent: rentOf(s.shopTier),
});

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
      ],
    },
    { uid: 2, type: 'shelf', x: 0.4, z: -2.0, rot: 0, tiers: emptyTiers('shelf') },
  ] as Furniture[],
  shelfHeat: {} as Record<number, number>,
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
  regulars: {} as Record<string, RegularProgress>,
  reservations: {} as Record<string, Reservation>,
  history: [] as DayRecord[],
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
  biz: newBiz(),
  vendorDay: 0,
  contracts: {} as Record<string, ContractState>,
  event: null as RandomEvent | null,
  costume: 'default',
  shopName: 'Tạp Hóa Đầu Ngõ',
  giftStreak: 0,
  giftLastDay: 0,
  wheelLastDay: 0,
  wheelBoost: 1,
  skills: [] as SkillId[],
  titles: [] as string[],
  fakeCash: 0,
  branch: null as BranchState | null,
  social: newSocial(),
  online: newOnline(),
  licenses: {} as Partial<Record<LicenseId, number>>,
  inspection: newInspection(),
  ...initialWeather(),
});

/** Thời tiết ván mới: ngày đầu luôn nắng, dự báo nối tiếp từ đó. */
export function initialWeather(seed = newWeatherSeed()) {
  return { weatherSeed: seed, weather: 'sunny' as Weather, forecast: forecastFrom(seed, 1, 'sunny') };
}

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
    ...createLicensesSlice(set, get),
  };
});

export function formatClock(minutes: number): string {
  const m = Math.floor(minutes) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}
