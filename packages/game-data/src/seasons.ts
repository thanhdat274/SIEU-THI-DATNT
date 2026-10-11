import type { ProductCategory } from '@game/shared';

/** Một năm game = 120 ngày; sự kiện lặp lại mỗi năm. */
export const SEASON_YEAR_DAYS = 120;
/** Ngày 1 của game rơi vào ngày 22 trong năm để sự kiện đầu tiên (mùa mưa) đến sớm. */
const SEASON_START_OFFSET = 22;

export type SeasonId = 'tet' | 'quoc_te_phu_nu' | 'mua_mua' | 'nghi_le_30_4' | 'tuu_truong' | 'quoc_khanh' | 'trung_thu' | 'phu_nu_vn' | 'giang_sinh';

export interface FestivalGoal {
  id: string;
  title: string;
  description: string;
  targetCategory?: ProductCategory;
  targetProductId?: string;
  targetStallId?: string; // đếm số suất quầy ăn uống bán ra thay vì sản phẩm kệ
  targetUnits: number;
  rewardMoney: number;
  rewardReputation: number;
}

export interface SeasonEvent {
  id: SeasonId;
  name: string;
  blurb: string;
  startDayOfYear: number; // 0-based, bao gồm
  endDayOfYear: number; // bao gồm
  demandMultiplier: number; // nhân tốc độ khách ghé tiệm
  preferredCategories: ProductCategory[]; // khách ưu tiên các nhóm hàng này
  stallMultiplier: Record<string, number>; // nhân sản lượng quầy ăn uống theo id quầy
  // Các trường dưới đây do dữ liệu khai báo; nhu cầu/lưu lượng đã dùng ngay, phần nhà cung cấp và khuyến mãi dùng ở đợt sau.
  demandByTag?: Record<string, number>; // nhân nhu cầu theo thẻ sản phẩm
  seasonalProductIds?: string[]; // sản phẩm nổi bật mùa này (không biến mất khi hết mùa)
  supplier?: { priceMultiplier?: number; stockMultiplier?: number; restockEveryDays?: number };
  promotions?: Array<{ id: string; label: string; tags: string[]; customerDiscount: number }>;
  goals?: FestivalGoal[]; // Mục tiêu ngày hội (festival goals)
}

export const SEASON_EVENTS: readonly SeasonEvent[] = [
  {
    id: 'tet',
    name: 'Tết Nguyên Đán',
    blurb: 'Bánh chưng, dưa hấu, câu đối đỏ — bà con sắm Tết rầm rộ.',
    startDayOfYear: 0,
    endDayOfYear: 9,
    demandMultiplier: 1.5,
    preferredCategories: ['snacks', 'candy', 'soft_drinks', 'cooking_ingredients', 'eggs'],
    stallMultiplier: { cafe_vot: 1.3, banh_mi_muoi_ot: 0.8, ve_so: 1.3 },
    demandByTag: { fresh: 1.3, meat: 1.4, alcohol: 1.4 },
    seasonalProductIds: ['banh_chung_tet', 'cau_doi_do', 'dua_hau_tet', 'thit_heo_tuoi', 'rau_cai_xanh'],
    supplier: { priceMultiplier: 1.1, stockMultiplier: 0.85 },
    goals: [
      {
        id: 'fest_tet_candy',
        title: 'Sắm Tết ngọt ngào',
        description: 'Bán 20 phần bánh kẹo tiếp đãi khách ngày Tết.',
        targetCategory: 'candy',
        targetUnits: 20,
        rewardMoney: 80000,
        rewardReputation: 4,
      },
      {
        id: 'fest_tet_cafe',
        title: 'Cà phê đầu năm',
        description: 'Bán 30 ly cà phê vợt ở quầy cà phê cho khách đi chúc Tết.',
        targetStallId: 'cafe_vot',
        targetUnits: 30,
        rewardMoney: 70000,
        rewardReputation: 3,
      },
    ],
  },
  {
    id: 'quoc_te_phu_nu',
    name: 'Mùng 8/3',
    blurb: 'Ngày Quốc tế Phụ nữ: khách mua quà tặng, bánh kẹo, đồ chăm sóc cá nhân.',
    startDayOfYear: 12,
    endDayOfYear: 16,
    demandMultiplier: 1.3,
    preferredCategories: ['candy', 'personal_care', 'snacks'],
    stallMultiplier: { cafe_vot: 1.1, banh_mi_muoi_ot: 0.9 },
    demandByTag: { sweet: 1.4, personal_care: 1.5 },
    goals: [
      {
        id: 'fest_womens_candy',
        title: 'Quà ngọt tặng chị em',
        description: 'Bán 20 phần bánh kẹo làm quà mùng 8/3.',
        targetCategory: 'candy',
        targetUnits: 20,
        rewardMoney: 70000,
        rewardReputation: 3,
      },
      {
        id: 'fest_womens_care',
        title: 'Chăm sóc bản thân',
        description: 'Bán 15 món chăm sóc cá nhân làm quà tặng.',
        targetCategory: 'personal_care',
        targetUnits: 15,
        rewardMoney: 75000,
        rewardReputation: 3,
      },
    ],
  },
  {
    id: 'mua_mua',
    name: 'Mùa mưa Sài Gòn',
    blurb: 'Mưa chiều bất chợt: mì gói, sữa, đồ gia dụng đắt hàng, ít người ra đường.',
    startDayOfYear: 30,
    endDayOfYear: 59,
    demandMultiplier: 0.85,
    preferredCategories: ['instant_noodles', 'milk', 'household'],
    stallMultiplier: { cafe_vot: 1.4, banh_mi_muoi_ot: 1.1 },
    demandByTag: { rain_gear: 1.5, health: 1.2 },
    seasonalProductIds: ['o_gap', 'ao_mua_bo', 'ca_phe_hoa_tan', 'tra_nong_gung'],
    goals: [
      {
        id: 'fest_rain_noodles',
        title: 'Trữ ấm mùa mưa',
        description: 'Bán 25 gói mì tôm cứu đói những chiều mưa tầm tã.',
        targetCategory: 'instant_noodles',
        targetUnits: 25,
        rewardMoney: 60000,
        rewardReputation: 3,
      },
      {
        id: 'fest_rain_cafe',
        title: 'Cà phê chiều mưa',
        description: 'Bán 40 ly cà phê vợt ở quầy cà phê cho khách trú mưa.',
        targetStallId: 'cafe_vot',
        targetUnits: 40,
        rewardMoney: 75000,
        rewardReputation: 3,
      },
    ],
  },
  {
    id: 'nghi_le_30_4',
    name: 'Nghỉ lễ 30/4 - 1/5',
    blurb: 'Nghỉ lễ dài ngày: bà con đi chơi, mua nước uống và đồ ăn vặt mang theo.',
    startDayOfYear: 62,
    endDayOfYear: 66,
    demandMultiplier: 1.35,
    preferredCategories: ['soft_drinks', 'bottled_water', 'snacks'],
    stallMultiplier: { cafe_vot: 1.3, banh_mi_muoi_ot: 1.0, ve_so: 1.2 },
    demandByTag: { cold_drink: 1.3, snack: 1.3 },
    goals: [
      {
        id: 'fest_holiday_drinks',
        title: 'Nước uống đi chơi lễ',
        description: 'Bán 30 chai nước uống cho khách đi chơi dịp lễ.',
        targetCategory: 'soft_drinks',
        targetUnits: 30,
        rewardMoney: 80000,
        rewardReputation: 3,
      },
      {
        id: 'fest_holiday_snacks',
        title: 'Ăn vặt dịp nghỉ lễ',
        description: 'Bán 25 gói ăn vặt cho khách du lịch ghé qua.',
        targetCategory: 'snacks',
        targetUnits: 25,
        rewardMoney: 70000,
        rewardReputation: 3,
      },
    ],
  },
  {
    id: 'tuu_truong',
    name: 'Mùa tựu trường',
    blurb: 'Phụ huynh và học sinh ghé mua đồ ăn sáng, bánh kẹo, sữa.',
    startDayOfYear: 70,
    endDayOfYear: 84,
    demandMultiplier: 1.25,
    preferredCategories: ['snacks', 'bread', 'milk', 'candy', 'toys_stationery'],
    stallMultiplier: { cafe_vot: 0.9, banh_mi_muoi_ot: 1.5 },
    demandByTag: { breakfast: 1.3, school: 1.6 },
    goals: [
      {
        id: 'fest_school_breakfast',
        title: 'Năng lượng đến trường',
        description: 'Bán 20 món bánh mì que nạp năng lượng cho học sinh.',
        targetCategory: 'bread',
        targetUnits: 20,
        rewardMoney: 70000,
        rewardReputation: 3,
      },
      {
        id: 'fest_school_toast',
        title: 'Bánh mì nướng trước cổng trường',
        description: 'Bán 30 ổ bánh mì nướng muối ớt ở quầy cho học sinh.',
        targetStallId: 'banh_mi_muoi_ot',
        targetUnits: 30,
        rewardMoney: 80000,
        rewardReputation: 3,
      },
    ],
  },
  {
    id: 'quoc_khanh',
    name: 'Quốc khánh 2/9',
    blurb: 'Cờ đỏ sao vàng khắp phố, bà con nghỉ lễ ghé tiệm mua đồ ăn uống.',
    startDayOfYear: 86,
    endDayOfYear: 90,
    demandMultiplier: 1.3,
    preferredCategories: ['soft_drinks', 'snacks', 'candy'],
    stallMultiplier: { cafe_vot: 1.2, banh_mi_muoi_ot: 1.1 },
    demandByTag: { snack: 1.25, cold_drink: 1.25 },
    goals: [
      {
        id: 'fest_national_drinks',
        title: 'Mừng Quốc khánh',
        description: 'Bán 25 chai nước giải khát cho khách xem diễu hành.',
        targetCategory: 'soft_drinks',
        targetUnits: 25,
        rewardMoney: 75000,
        rewardReputation: 4,
      },
      {
        id: 'fest_national_candy',
        title: 'Kẹo bánh ngày lễ lớn',
        description: 'Bán 20 phần bánh kẹo cho khách ngày Quốc khánh.',
        targetCategory: 'candy',
        targetUnits: 20,
        rewardMoney: 70000,
        rewardReputation: 3,
      },
    ],
  },
  {
    id: 'trung_thu',
    name: 'Trung Thu',
    blurb: 'Rước đèn, phá cỗ: bánh kẹo, sữa bán chạy.',
    startDayOfYear: 95,
    endDayOfYear: 104,
    demandMultiplier: 1.4,
    preferredCategories: ['candy', 'snacks', 'milk'],
    stallMultiplier: { cafe_vot: 1.0, banh_mi_muoi_ot: 1.0 },
    demandByTag: { sweet: 1.3 },
    seasonalProductIds: ['banh_trung_thu'],
    goals: [
      {
        id: 'fest_mid_autumn_candy',
        title: 'Phá cỗ đêm trăng',
        description: 'Bán 25 phần bánh kẹo cho đêm hội trăng rằm.',
        targetCategory: 'candy',
        targetUnits: 25,
        rewardMoney: 90000,
        rewardReputation: 5,
      },
    ],
  },
  {
    id: 'phu_nu_vn',
    name: 'Ngày Phụ nữ Việt Nam 20/10',
    blurb: 'Hoa và quà tặng ngày 20/10: bánh kẹo, sữa, đồ chăm sóc bán chạy.',
    startDayOfYear: 108,
    endDayOfYear: 111,
    demandMultiplier: 1.3,
    preferredCategories: ['candy', 'personal_care', 'milk'],
    stallMultiplier: { cafe_vot: 1.1, banh_mi_muoi_ot: 0.9 },
    demandByTag: { sweet: 1.3, personal_care: 1.4, dairy: 1.2 },
    goals: [
      {
        id: 'fest_vnwomen_candy',
        title: 'Quà 20/10',
        description: 'Bán 20 phần bánh kẹo làm quà tặng ngày 20/10.',
        targetCategory: 'candy',
        targetUnits: 20,
        rewardMoney: 75000,
        rewardReputation: 3,
      },
      {
        id: 'fest_vnwomen_milk',
        title: 'Sữa quà biếu',
        description: 'Bán 15 hộp sữa làm quà biếu mẹ và vợ.',
        targetCategory: 'milk',
        targetUnits: 15,
        rewardMoney: 70000,
        rewardReputation: 3,
      },
    ],
  },
  {
    id: 'giang_sinh',
    name: 'Giáng sinh - Cuối năm',
    blurb: 'Phố lên đèn, giới trẻ đi chơi đêm: bánh kẹo, nước uống, đồ nhậu nhẹ bán mạnh.',
    startDayOfYear: 114,
    endDayOfYear: 119,
    demandMultiplier: 1.4,
    preferredCategories: ['candy', 'soft_drinks', 'snacks', 'alcohol'],
    stallMultiplier: { cafe_vot: 1.3, banh_mi_muoi_ot: 0.9, ve_so: 1.2 },
    demandByTag: { sweet: 1.3, alcohol: 1.3, cold_drink: 1.2 },
    goals: [
      {
        id: 'fest_xmas_candy',
        title: 'Quà Noel',
        description: 'Bán 25 phần bánh kẹo cho đêm Giáng sinh.',
        targetCategory: 'candy',
        targetUnits: 25,
        rewardMoney: 90000,
        rewardReputation: 4,
      },
      {
        id: 'fest_xmas_drinks',
        title: 'Tiệc cuối năm',
        description: 'Bán 30 chai nước giải khát cho các nhóm đi chơi đêm.',
        targetCategory: 'soft_drinks',
        targetUnits: 30,
        rewardMoney: 85000,
        rewardReputation: 4,
      },
    ],
  },
];

export function getDayOfYear(day: number): number {
  const index = Math.max(0, Math.floor(day) - 1) + SEASON_START_OFFSET;
  return index % SEASON_YEAR_DAYS;
}

export function getSeasonForDay(day: number): SeasonEvent | null {
  const doy = getDayOfYear(day);
  return SEASON_EVENTS.find(event => doy >= event.startDayOfYear && doy <= event.endDayOfYear) ?? null;
}

/** Số ngày còn lại (kể cả hôm nay) của sự kiện đang diễn ra. */
export function seasonDaysLeft(day: number): number {
  const event = getSeasonForDay(day);
  return event ? event.endDayOfYear - getDayOfYear(day) + 1 : 0;
}

/** Chỉ số năm mùa (0 = năm đầu); dùng để một mục tiêu ngày hội nhận lại được ở năm sau. */
export function getSeasonYear(day: number): number {
  return Math.floor((Math.max(0, Math.floor(day) - 1) + SEASON_START_OFFSET) / SEASON_YEAR_DAYS);
}

/** Khoảng ngày game [firstDay, lastDay] của sự kiện đang diễn ra ở `day`, hoặc null. */
export function getSeasonWindow(day: number): { event: SeasonEvent; year: number; firstDay: number; lastDay: number } | null {
  const event = getSeasonForDay(day);
  if (!event) return null;
  const doy = getDayOfYear(day);
  const firstDay = Math.floor(day) - (doy - event.startDayOfYear);
  const lastDay = firstDay + (event.endDayOfYear - event.startDayOfYear);
  return { event, year: getSeasonYear(day), firstDay, lastDay };
}

/**
 * Cửa sổ nhận thưởng ngày hội: ngày hội đang diễn ra, hoặc đúng ngày liền sau ngày cuối (ngày ân hạn).
 * Ngày ân hạn cần vì quầy ăn uống chỉ chốt suất của một ngày lúc qua ngày, tức sau khi ngày hội đã hết.
 */
export function getFestivalClaimWindow(day: number): { event: SeasonEvent; year: number; firstDay: number; lastDay: number; claimUntilDay: number } | null {
  const current = getSeasonWindow(day);
  if (current) return { ...current, claimUntilDay: current.lastDay + 1 };
  const previous = day > 1 ? getSeasonWindow(day - 1) : null;
  if (previous && previous.lastDay === day - 1) return { ...previous, claimUntilDay: previous.lastDay + 1 };
  return null;
}
