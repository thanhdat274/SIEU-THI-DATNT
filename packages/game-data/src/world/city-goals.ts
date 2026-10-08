/**
 * Mục tiêu thành phố (OpenSpec `open-world-districts-city-goals`, tasks 2.1 — phần THUẦN + PROVISIONAL).
 *
 * Cấp thành phố 1..10. Mỗi cấp có 2–3 mục tiêu (`CityGoalDef`); lên cấp khi xong MỌI mục tiêu của cấp đó
 * (so với `cityProgress`) và nhận thưởng (lệnh `claim_city_goal` — nối vào server là việc SAU, chờ máy thật).
 * `cityTier` của Bước 4 = `min(5, floor(cityLevel / 2))` (thiết kế D3). Đợt khai hoang thêm điều kiện cấp
 * thành phố: W1: 2, W2: 4, W3: 6, W4: 8 (`CITY_LEVEL_WAVE_REQUIREMENT`).
 *
 * Mục tiêu được ĐÁNH GIÁ thuần từ một bản `metrics: Partial<Record<CityGoalKind, number>>` được truyền vào
 * (đại diện số liệu suy từ dữ liệu đã có của save — DailyRecord, placements, openedWaves). Module này KHÔNG
 * thêm bộ đếm song song; việc trích metrics từ save thật là của server/LEAD nối sau.
 *
 * GHÉP CHÚ: THUẦN + PROVISIONAL — nối lệnh `claim_city_goal` / lên cấp / thưởng + `cityTier` theo cấp + server +
 * schema kế tiếp/migration + đồ công cộng/decor + minimap là SAU (chờ máy thật). Không sửa file có sẵn.
 */

/** Loại mục tiêu thành phố (thiết kế D3). */
export type CityGoalKind =
  | 'daily_customers'
  | 'building_types_open'
  | 'waves_opened'
  | 'infrastructure'
  | 'weekly_revenue'
  | 'total_buildings';

/** Thưởng cho một mục tiêu thành phố (một phần là PROVISIONAL, có thể bổ sung tiền mặt sau khi nối server). */
export interface CityGoalReward {
  gold?: number;
  prestige?: number;
  xp?: number;
}

/** Định nghĩa một mục tiêu thành phố (thiết kế D3). */
export interface CityGoalDef {
  /** Định danh duy nhất. */
  id: string;
  /** Cấp thành phố 1..10 mà mục tiêu thuộc về. */
  cityLevel: number;
  /** Loại mục tiêu — quyết định đọc số liệu nào trong `metrics`. */
  kind: CityGoalKind;
  /** Giá trị cần đạt để hoàn thành. */
  targetValue: number;
  /** Thưởng khi hoàn thành (một phần PROVISIONAL). */
  reward: CityGoalReward;
}

/**
 * Điều kiện cấp thành phố để mở từng đợt khai hoang (thiết kế D3, provisional):
 * W1: 2, W2: 4, W3: 6, W4: 8.
 */
export const CITY_LEVEL_WAVE_REQUIREMENT: Readonly<Record<string, number>> = {
  w1: 2,
  w2: 4,
  w3: 6,
  w4: 8,
} as const;

/** `cityTier` của Bước 4 theo cấp thành phố (thiết kế D3): `min(5, floor(level / 2))`. */
export function cityTierFromCityLevel(level: number): number {
  return Math.min(5, Math.floor(Math.max(1, Math.floor(level)) / 2));
}

/**
 * Số đợt khai hoang có thể mở ở một cấp thành phố (theo `CITY_LEVEL_WAVE_REQUIREMENT`).
 * Cấp 1 chưa mở được đợt nào (W1 cần cấp 2) — tránh vòng điều kiện với mục tiêu cấp 1.
 */
export function wavesOpenedForCityLevel(level: number): number {
  return Object.values(CITY_LEVEL_WAVE_REQUIREMENT).filter((req) => level >= req).length;
}

/**
 * Danh mục mục tiêu thành phố cấp 1–10 (PROVISIONAL). Mỗi cấp 2–3 mục tiêu trộn các loại `kind`.
 * Mục tiêu cấp thấp đạt được bằng chơi bình thường (không đòi mở đợt ở cấp 1 — vì W1 lại cần cấp thành phố 2);
 * cấp cao khó hơn và gắn với mở đợt (`waves_opened`, `infrastructure`).
 *
 * `cityLevel` được sắp tăng dần để dễ duyệt/nối.
 */
export const CITY_GOALS_CATALOG: readonly CityGoalDef[] = [
  // Cấp 1 — khởi đầu: chỉ đòi chơi thường trong W0 (KHÔNG đòi mở đợt, tránh vòng điều kiện với W1 cần cấp 2).
  { id: 'cg_l1_daily_customers', cityLevel: 1, kind: 'daily_customers', targetValue: 40, reward: { gold: 20_000, prestige: 2, xp: 30 } },
  { id: 'cg_l1_building_types',   cityLevel: 1, kind: 'building_types_open', targetValue: 2, reward: { gold: 30_000, prestige: 2, xp: 40 } },
  // Cấp 2 — đạt được sau một tuần chơi (doanh thu 7 ngày) và chút mở rộng.
  { id: 'cg_l2_weekly_revenue',   cityLevel: 2, kind: 'weekly_revenue', targetValue: 4_000_000, reward: { gold: 80_000, prestige: 4, xp: 80 } },
  { id: 'cg_l2_total_buildings',  cityLevel: 2, kind: 'total_buildings', targetValue: 8, reward: { gold: 60_000, prestige: 3, xp: 60 } },
  { id: 'cg_l2_building_types',   cityLevel: 2, kind: 'building_types_open', targetValue: 4, reward: { gold: 50_000, prestige: 3, xp: 60 } },
  // Cấp 3 — có thể mở W1 (cần cấp 2) và hạ tầng một khu.
  { id: 'cg_l3_waves_opened',     cityLevel: 3, kind: 'waves_opened', targetValue: 1, reward: { gold: 120_000, prestige: 5, xp: 120 } },
  { id: 'cg_l3_infrastructure',   cityLevel: 3, kind: 'infrastructure', targetValue: 2, reward: { gold: 100_000, prestige: 5, xp: 100 } },
  { id: 'cg_l3_daily_customers',  cityLevel: 3, kind: 'daily_customers', targetValue: 100, reward: { gold: 90_000, prestige: 4, xp: 100 } },
  // Cấp 4 — mở W2 (cần cấp 4).
  { id: 'cg_l4_waves_opened',     cityLevel: 4, kind: 'waves_opened', targetValue: 2, reward: { gold: 160_000, prestige: 6, xp: 160 } },
  { id: 'cg_l4_weekly_revenue',   cityLevel: 4, kind: 'weekly_revenue', targetValue: 10_000_000, reward: { gold: 140_000, prestige: 6, xp: 140 } },
  { id: 'cg_l4_total_buildings',  cityLevel: 4, kind: 'total_buildings', targetValue: 20, reward: { gold: 130_000, prestige: 5, xp: 140 } },
  // Cấp 5 — mở rộng loại hình.
  { id: 'cg_l5_daily_customers',  cityLevel: 5, kind: 'daily_customers', targetValue: 180, reward: { gold: 180_000, prestige: 7, xp: 180 } },
  { id: 'cg_l5_building_types',   cityLevel: 5, kind: 'building_types_open', targetValue: 8, reward: { gold: 170_000, prestige: 7, xp: 180 } },
  { id: 'cg_l5_waves_opened',     cityLevel: 5, kind: 'waves_opened', targetValue: 2, reward: { gold: 190_000, prestige: 7, xp: 180 } },
  // Cấp 6 — mở W3 (cần cấp 6).
  { id: 'cg_l6_waves_opened',     cityLevel: 6, kind: 'waves_opened', targetValue: 3, reward: { gold: 220_000, prestige: 8, xp: 220 } },
  { id: 'cg_l6_weekly_revenue',   cityLevel: 6, kind: 'weekly_revenue', targetValue: 25_000_000, reward: { gold: 200_000, prestige: 8, xp: 200 } },
  { id: 'cg_l6_total_buildings',  cityLevel: 6, kind: 'total_buildings', targetValue: 32, reward: { gold: 200_000, prestige: 8, xp: 210 } },
  // Cấp 7 — hạ tầng và tần suất khách.
  { id: 'cg_l7_daily_customers',  cityLevel: 7, kind: 'daily_customers', targetValue: 260, reward: { gold: 240_000, prestige: 9, xp: 240 } },
  { id: 'cg_l7_infrastructure',   cityLevel: 7, kind: 'infrastructure', targetValue: 4, reward: { gold: 250_000, prestige: 9, xp: 250 } },
  { id: 'cg_l7_building_types',   cityLevel: 7, kind: 'building_types_open', targetValue: 12, reward: { gold: 230_000, prestige: 9, xp: 240 } },
  // Cấp 8 — mở W4 (cần cấp 8).
  { id: 'cg_l8_waves_opened',     cityLevel: 8, kind: 'waves_opened', targetValue: 4, reward: { gold: 320_000, prestige: 10, xp: 300 } },
  { id: 'cg_l8_weekly_revenue',   cityLevel: 8, kind: 'weekly_revenue', targetValue: 30_000_000, reward: { gold: 300_000, prestige: 10, xp: 290 } },
  { id: 'cg_l8_total_buildings',  cityLevel: 8, kind: 'total_buildings', targetValue: 45, reward: { gold: 300_000, prestige: 10, xp: 290 } },
  // Cấp 9 — giai đoạn thành phố lớn.
  { id: 'cg_l9_daily_customers',  cityLevel: 9, kind: 'daily_customers', targetValue: 350, reward: { gold: 360_000, prestige: 11, xp: 340 } },
  { id: 'cg_l9_infrastructure',   cityLevel: 9, kind: 'infrastructure', targetValue: 5, reward: { gold: 380_000, prestige: 11, xp: 360 } },
  { id: 'cg_l9_building_types',   cityLevel: 9, kind: 'building_types_open', targetValue: 16, reward: { gold: 350_000, prestige: 11, xp: 340 } },
  // Cấp 10 — đỉnh thành phố: mọi đợt đã mở, doanh thu lớn, mật độ tòa cao.
  { id: 'cg_l10_waves_opened',    cityLevel: 10, kind: 'waves_opened', targetValue: 4, reward: { gold: 500_000, prestige: 15, xp: 500 } },
  { id: 'cg_l10_weekly_revenue',  cityLevel: 10, kind: 'weekly_revenue', targetValue: 35_000_000, reward: { gold: 480_000, prestige: 14, xp: 480 } },
  { id: 'cg_l10_total_buildings', cityLevel: 10, kind: 'total_buildings', targetValue: 55, reward: { gold: 470_000, prestige: 14, xp: 470 } },
];

/** Tra một mục tiêu theo id, hoặc `undefined`. */
export function cityGoalById(id: string): CityGoalDef | undefined {
  return CITY_GOALS_CATALOG.find((g) => g.id === id);
}

/** Mọi mục tiêu thuộc một cấp thành phố (sắp theo thứ tự trong catalog). */
export function cityGoalsForLevel(level: number): CityGoalDef[] {
  return CITY_GOALS_CATALOG.filter((g) => g.cityLevel === level);
}

/** Kết quả đánh giá tiến độ của một cấp thành phố. */
export interface CityProgressResult {
  /** Cấp thành phố đang xét (1..10). */
  level: number;
  /** Mã các mục tiêu của cấp hiện tại đã đạt (metrics[kind] >= targetValue). */
  completedGoalIds: string[];
  /** Có ít nhất một mục tiêu của cấp hiện tại đã đạt (một cột mốc nhỏ hướng tới lên cấp). */
  nextMilestoneMinorDone: boolean;
  /** Xong MỌI mục tiêu của cấp hiện tại → được phép lên cấp tiếp theo. */
  allGoalsDoneForLevel: boolean;
}

/**
 * Đánh giá tiến độ mục tiêu thành phố của `level` từ bản `metrics` thuần.
 * `metrics[kind]` là số liệu hiện tại của loại `kind`; một mục tiêu hoàn thành khi
 * `metrics[goal.kind] >= goal.targetValue`. Không giữ trạng thái, không ghi đâu — chỉ đọc.
 */
export function cityProgress(
  level: number,
  metrics: Partial<Record<CityGoalKind, number>>,
): CityProgressResult {
  const lvl = Math.min(10, Math.max(1, Math.floor(level)));
  const goals = cityGoalsForLevel(lvl);
  const completedGoalIds: string[] = [];
  for (const goal of goals) {
    const current = metrics[goal.kind] ?? 0;
    if (current >= goal.targetValue) completedGoalIds.push(goal.id);
  }
  return {
    level: lvl,
    completedGoalIds,
    nextMilestoneMinorDone: completedGoalIds.length > 0,
    allGoalsDoneForLevel: goals.length > 0 && completedGoalIds.length === goals.length,
  };
}

/**
 * Tổng thưởng (gold/prestige/xp) cho một danh sách mục tiêu đã hoàn thành (dùng trong mô phỏng/nối server).
 * Thuần, chỉ cộng dồn.
 */
export function sumCityGoalRewards(goalIds: readonly string[]): CityGoalReward {
  const total: CityGoalReward = {};
  for (const id of goalIds) {
    const g = cityGoalById(id);
    if (!g) continue;
    total.gold = (total.gold ?? 0) + (g.reward.gold ?? 0);
    total.prestige = (total.prestige ?? 0) + (g.reward.prestige ?? 0);
    total.xp = (total.xp ?? 0) + (g.reward.xp ?? 0);
  }
  return total;
}
