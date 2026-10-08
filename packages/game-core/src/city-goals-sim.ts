/**
 * Mô phỏng tiến độ mục tiêu thành phố (OpenSpec `open-world-districts-city-goals`, task 2.4; bổ trợ phạm vi 1.4 —
 * phần THUẦN + PROVISIONAL).
 *
 * Mô phỏng THUẦN (không phụ thuộc server/save): cho cấu hình sinh số liệu (khách/ngày, doanh thu, số tòa, loại
 * hình, đợt mở, hạ tầng), chạy qua từng ngày, đánh giá `cityProgress` cho cấp hiện tại từ bản `metrics` mỗi ngày.
 * Khi `allGoalsDoneForLevel(level)` → cấp thành phố tăng + cộng dồn thưởng. Ghi nhật ký từng ngày
 * `{ day, level, cityTier, completedGoalIds }` và `finalLevel`, `daysToLevelN`.
 *
 * Các metric được mô phỏng là ĐẠI DIỆN đơn giản cho số liệu suy từ save thật (DailyRecord, placements,
 * openedWaves) — việc trích metrics thật từ save là của server/LEAD nối sau; không thêm bộ đếm song song.
 *
 * Check thiết kế:
 *  - "mục tiêu cấp thấp đạt bằng chơi thường" — mô phỏng chạy qua được các cấp thấp không bị chặn.
 *  - "không tụt cảnh quan khi lên" — `cityTier` không bao giờ giảm vì cấp chỉ tăng và `cityTierFromCityLevel` đơn điệu.
 *  - điều kiện cấp W — đợt mở khi đạt đủ cấp theo `CITY_LEVEL_WAVE_REQUIREMENT`.
 *
 * GHÉP CHÚ: THUẦN + PROVISIONAL — nối lệnh `claim_city_goal`/lên cấp/thưởng + server + schema sau (chờ máy thật).
 */
import {
  CITY_LEVEL_WAVE_REQUIREMENT,
  cityGoalsForLevel,
  cityProgress,
  cityTierFromCityLevel,
  sumCityGoalRewards,
  wavesOpenedForCityLevel,
  type CityGoalKind,
  type CityGoalReward,
} from '@game/data/src/world/city-goals';

/** Cấu hình mô phỏng tiến độ — mọi hàm sinh số liệu thuần theo (day, level). */
export interface CitySimConfig {
  /** Số ngày mô phỏng (60–90). */
  days: number;
  /** Khách phục vụ trong một ngày tại (day, level). */
  dailyCustomers: (day: number, level: number) => number;
  /** Doanh thu mỗi khách (₫) — cho metric `weekly_revenue`. */
  revenuePerCustomer: number;
  /** Số loại hình tòa đang mở tại một cấp. */
  buildingTypesAtLevel: (level: number) => number;
  /** Tổng số tòa đang có tại một cấp. */
  totalBuildingsAtLevel: (level: number) => number;
  /** Số khu đã xây đủ hạ tầng tại một cấp (metric `infrastructure`). */
  infrastructureAtLevel: (level: number) => number;
}

/** Nhịp khách một ngày theo cấp (mặc định): bắt đầu thấp rồi đạt tới mức ổn định theo cấp. */
export function defaultDailyCustomers(day: number, level: number): number {
  const steady = 45 + (level - 1) * 45;
  // Giai đoạn khởi động: khách tăng dần 3/ngày tới mức ổn định (để cấp 1 không "xong ngay ngày 1").
  return Math.min(steady, 15 + day * 3);
}

/** Số loại hình tòa theo cấp (mặc định). */
export function defaultBuildingTypesAtLevel(level: number): number {
  return level * 2;
}

/** Tổng số tòa theo cấp (mặc định). */
export function defaultTotalBuildingsAtLevel(level: number): number {
  return 5 + (level - 1) * 6;
}

/** Số khu xây đủ hạ tầng theo cấp (mặc định): W0 luôn xong, mỗi đợt mở thêm một khu. */
export function defaultInfrastructureAtLevel(level: number): number {
  return wavesOpenedForCityLevel(level) + 1;
}

/** Cấu hình mô phỏng mặc định — hợp lý, đạt không bị chặn qua các cấp trong 60–90 ngày. */
export function defaultCitySimConfig(days: number): CitySimConfig {
  return {
    days,
    dailyCustomers: defaultDailyCustomers,
    revenuePerCustomer: 15_000,
    buildingTypesAtLevel: defaultBuildingTypesAtLevel,
    totalBuildingsAtLevel: defaultTotalBuildingsAtLevel,
    infrastructureAtLevel: defaultInfrastructureAtLevel,
  };
}

/** Nhật ký một ngày của mô phỏng tiến độ. */
export interface CitySimDay {
  day: number;
  level: number;
  cityTier: number;
  completedGoalIds: string[];
  /** Các metric của ngày này (đã dùng để đánh giá). */
  metrics: Partial<Record<CityGoalKind, number>>;
}

/** Kết quả mô phỏng tiến độ. */
export interface CitySimResult {
  /** Từng ngày (dài `days`). */
  days: CitySimDay[];
  /** Cấp thành phố cuối cùng đạt được. */
  finalLevel: number;
  /** Ngày đầu tiên đạt tới từng cấp (1..10); chỉ có các cấp đã đạt tới. */
  daysToLevelN: Partial<Record<number, number>>;
  /** Tổng thưởng cộng dồn qua các lần lên cấp. */
  totalRewards: CityGoalReward;
  /** Tổng số lần lên cấp. */
  levelUps: number;
}

/** Số liệu của một ngày từ cấu hình (kể cả doanh thu 7 ngày gần nhất). */
export function citySimMetricsForDay(cfg: CitySimConfig, day: number, level: number): Partial<Record<CityGoalKind, number>> {
  const customers = cfg.dailyCustomers(day, level);
  const revenuePerDay = customers * cfg.revenuePerCustomer;
  // Doanh thu tuần: cộng doanh thu các ngày gần nhất (từ ngày 1 tới day); tuần tròn = 7 ngày.
  let weeklyRevenue = 0;
  const fromDay = Math.max(1, day - 6);
  for (let d = fromDay; d <= day; d++) {
    weeklyRevenue += cfg.dailyCustomers(d, level) * cfg.revenuePerCustomer;
  }
  return {
    daily_customers: customers,
    building_types_open: cfg.buildingTypesAtLevel(level),
    waves_opened: wavesOpenedForCityLevel(level),
    infrastructure: cfg.infrastructureAtLevel(level),
    weekly_revenue: weeklyRevenue,
    total_buildings: cfg.totalBuildingsAtLevel(level),
  };
}

/**
 * Chạy mô phỏng tiến độ mục tiêu thành phố trong `cfg.days` ngày.
 * Bắt đầu từ cấp 1; mỗi ngày: tính metrics cho cấp hiện tại, đánh giá `cityProgress`, nếu `allGoalsDoneForLevel`
 * và chưa kịch trần cấp 10 thì lên cấp (ngay ngày đó) và cộng thưởng của các mục tiêu của cấp cũ.
 * Nhật ký ngày dùng CẤP đã là kết quả sau khi đánh giá/lên cấp của ngày hôm đó.
 */
export function simulateGoalProgression(cfg: CitySimConfig): CitySimResult {
  const days: CitySimDay[] = [];
  const daysToLevelN: Partial<Record<number, number>> = {};
  let level = 1;
  let totalRewards: CityGoalReward = {};
  let levelUps = 0;

  daysToLevelN[level] = 1;

  for (let day = 1; day <= cfg.days; day++) {
    // Đánh giá tiến độ ở cấp hiện tại.
    const curMetrics = citySimMetricsForDay(cfg, day, level);
    const progress = cityProgress(level, curMetrics);
    const completedGoalIds = progress.completedGoalIds;

    if (progress.allGoalsDoneForLevel && level < 10) {
      // Xong mọi mục tiêu cấp này → lên cấp + cộng thưởng.
      const rewards = sumCityGoalRewards(cityGoalsForLevel(level).map((g) => g.id));
      totalRewards = {
        gold: (totalRewards.gold ?? 0) + (rewards.gold ?? 0),
        prestige: (totalRewards.prestige ?? 0) + (rewards.prestige ?? 0),
        xp: (totalRewards.xp ?? 0) + (rewards.xp ?? 0),
      };
      level += 1;
      levelUps += 1;
      if (daysToLevelN[level] === undefined) daysToLevelN[level] = day;
    }

    // Nhật ký ngày với tình trạng sau khi (có thể) lên cấp; metrics tính lại ở cấp cuối ngày để snapshot tự khớp.
    const finalMetrics = citySimMetricsForDay(cfg, day, level);
    days.push({
      day,
      level,
      cityTier: cityTierFromCityLevel(level),
      completedGoalIds,
      metrics: finalMetrics,
    });
  }

  return {
    days,
    finalLevel: level,
    daysToLevelN,
    totalRewards,
    levelUps,
  };
}

// ============================================================================
// BỔ TRỢ PHẠM VI 1.4 — mô phỏng cà phê/ăn vặt ở hai khu: tích hệ số không vượt trần.
// Là hàm THUẦN nhỏ đặt trong city-goals-sim (ghi rõ là bổ trợ phạm vi 1.4), không đụng modifiers.ts.
// ============================================================================

/**
 * Trần PROVISIONAL cho tích hệ số cầu khu ẩm thực (đề phòng "chồng hệ số": mùa × khu × mặt tiền × cụm ẩm thực
 * làm lệch kinh tế — design D3 rủi ro). Giá trị PROVISIONAL; sẽ đồng bộ với cơ chế gộp hệ số trong modifiers.ts sau.
 */
export const DISTRICT_FOOD_CAP = 2.0;

/** Kết quả nhân hệ số cầu khu (phạm vi 1.4). */
export interface DistrictFoodMultiplierResult {
  /** Tích thô thực tế of các hệ số cung cấp. */
  raw: number;
  /** Tích đã kẹp không vượt quá `DISTRICT_FOOD_CAP`. */
  capped: number;
  /** `true` nếu tích thô vượt trần (sẽ bị kẹp). */
  exceeded: boolean;
}

/**
 * Nhân ba hệ số preferred×peak×cluster của một quán/khu ẩm thực và kiểm không vượt trần `DISTRICT_FOOD_CAP`.
 * Ví dụ hệ số như D2 (preferred 1.4 × peak 1.3 = 1.82) dưới trần; thêm cụm (×1.2 → 2.184) vượt trần và bị kẹp.
 */
export function simulateDistrictFoodMultiplier(opts: {
  preferred?: number;
  peak?: number;
  cluster?: number;
}): DistrictFoodMultiplierResult {
  const factors = [opts.preferred, opts.peak, opts.cluster].filter((f): f is number => f !== undefined && f > 0);
  const raw = factors.reduce((acc, f) => acc * f, 1);
  return {
    raw,
    capped: Math.min(raw, DISTRICT_FOOD_CAP),
    exceeded: raw > DISTRICT_FOOD_CAP,
  };
}
