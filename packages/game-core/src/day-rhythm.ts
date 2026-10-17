import type { CustomerReview, DailyRecord } from '@game/shared';
import { PRODUCT_MAP, STALL_MAP } from '@game/data';
import { reviewSentimentSummary } from './review-reputation';
import { feedbackReasonLabel } from './reputation';

export interface DaySummary {
  day: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  spoilageCost: number;
  wagesPaid: number;
  /** Chi phí bảo trì/sửa/mua mới nội thất trong ngày; chỉ có khi > 0. */
  maintenanceCost?: number;
  netProfit: number;
  customersServed: number;
  transactionsCount: number;
  itemsSold: number;
  averageStars?: number;
  ratingCount: number;
  bestSellingProductId?: string;
  walkouts: number;
}

export interface StallChannelLine {
  stallId: string;
  name: string;
  servings: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  /** Ngày lưu từ bản cũ chưa ghi doanh thu theo quầy: doanh thu ước = suất × giá, giá vốn chưa rõ (0). */
  estimated: boolean;
}

/** Doanh thu/giá vốn theo kênh bán của một ngày: tiệm (thu ngân) và từng quầy. Chỉ đọc, `revenue`/`cogs` của record đã gồm cả hai kênh. */
export interface DayChannelBreakdown {
  shopRevenue: number;
  shopCogs: number;
  shopGrossProfit: number;
  stalls: StallChannelLine[];
  stallRevenue: number;
  stallCogs: number;
  stallServings: number;
  /** Khách thu ngân + suất quầy (mỗi suất tính một khách/một lượt bán). */
  totalCustomers: number;
  totalTransactions: number;
  /** Khách riêng quầy thu ngân của tiệm. */
  shopCustomers: number;
}

/** Giá vốn ước cho ngày lưu cũ chưa ghi `stallCogs`: tiền mặt mỗi suất + nguyên liệu theo giá nhập chuẩn. */
function estimateStallCogs(stallId: string, servings: number): number {
  const def = STALL_MAP[stallId];
  if (!def) return 0;
  const perServing = def.cashCostPerServing + def.ingredients.reduce((sum, ing) => sum + ing.perServing * (PRODUCT_MAP[ing.productId]?.purchasePrice ?? 0), 0);
  return Math.round(servings * perServing);
}

export function buildDayChannelBreakdown(record: DailyRecord): DayChannelBreakdown {
  const stalls: StallChannelLine[] = [];
  for (const [stallId, servings] of Object.entries(record.stallServings ?? {})) {
    if (!(servings > 0)) continue;
    const def = STALL_MAP[stallId];
    const known = record.stallRevenue?.[stallId] !== undefined;
    const revenue = known ? record.stallRevenue![stallId] : servings * (def?.servingPrice ?? 0);
    const cogs = record.stallCogs?.[stallId] ?? estimateStallCogs(stallId, servings);
    stalls.push({ stallId, name: def?.name ?? stallId, servings, revenue, cogs, grossProfit: revenue - cogs, estimated: !known });
  }
  stalls.sort((a, b) => b.revenue - a.revenue);
  const stallRevenue = stalls.reduce((sum, s) => sum + s.revenue, 0);
  const stallCogs = stalls.reduce((sum, s) => sum + s.cogs, 0);
  const stallServings = stalls.reduce((sum, s) => sum + s.servings, 0);
  const includesStalls = record.stallRevenue !== undefined;
  const shopRevenue = Math.max(0, record.revenue - stallRevenue);
  const shopCogs = Math.max(0, record.cogs - stallCogs);
  return {
    shopRevenue,
    shopCogs,
    shopGrossProfit: shopRevenue - shopCogs,
    stalls,
    stallRevenue,
    stallCogs,
    stallServings,
    // Ngày mới đã cộng suất quầy vào bộ đếm chung (có `stallRevenue`); ngày cũ thì cộng thêm ở đây.
    totalCustomers: includesStalls ? record.customersServed : record.customersServed + stallServings,
    totalTransactions: includesStalls ? record.transactionsCount : record.transactionsCount + stallServings,
    shopCustomers: includesStalls ? Math.max(0, record.customersServed - stallServings) : record.customersServed,
  };
}

/** Read-only summary derived from the closed daily record; never changes ledger or cash. */
export function buildDaySummary(record: DailyRecord): DaySummary {
  const bestSellingProductId = Object.entries(record.productSales ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0];
  const channels = buildDayChannelBreakdown(record);
  return {
    day: record.day,
    revenue: record.revenue,
    cogs: record.cogs,
    grossProfit: record.grossProfit,
    spoilageCost: record.spoilageCost,
    wagesPaid: record.wagesPaid,
    ...(record.maintenanceCost ? { maintenanceCost: record.maintenanceCost } : {}),
    netProfit: record.netProfit,
    customersServed: channels.totalCustomers,
    transactionsCount: channels.totalTransactions,
    itemsSold: record.itemsSold,
    averageStars: record.averageStars,
    ratingCount: record.ratingCount ?? 0,
    bestSellingProductId,
    walkouts: (record.outOfStockWalkouts ?? 0) + (record.priceWalkouts ?? 0),
  };
}

export interface MorningBrief {
  day: number;
  seasonName: string;
  seasonDaysLeft: number;
  weatherLabel: string;
  weatherIcon: string;
  forecastTomorrow: string;
  arrivingOrdersCount: number;
  arrivingItemsCount: number;
  lowStockItems: string[];
  expiringItems: string[];
  tips: string[];
  /** Tổng ảnh hưởng uy tín của lời đánh giá hôm qua (nếu có lời đánh giá). */
  reputationDelta?: number;
  /** Chỉ số sống theo khu: { [districtId]: qol0..100 }. */
  districtQol?: Record<string, number>;
  /** Dân số khu tiệm chính: { districtId, pop, target, factor }. */
  civicPopulation?: { districtId: string; pop: number; target: number; factor: number };
  /** Chi phí xóm (OpenSpec `civic-local-fees`): đã trừ đầu ngày hôm nay và dự kiến/ngày theo công trình + lô sở hữu. */
  civicCosts?: { upkeep: number; fee: number; projected: { upkeep: number; fee: number } };
  /** Công trình công cộng khánh thành hôm qua (từ sổ góp). */
  civicOpenings?: string[];
}

export function buildMorningBrief(params: {
  day: number;
  season: { name: string };
  seasonDaysLeft: number;
  weather: { label: string; icon: string };
  forecastTomorrow?: string;
  arrivingOrders: Array<{ productId: string; quantity: number }>;
  lowStockItems?: string[];
  expiringItems?: string[];
  yesterdayReviews?: CustomerReview[];
  districtQol?: Record<string, number>;
  civicPopulation?: { districtId: string; pop: number; target: number; factor: number };
  civicCosts?: { upkeep: number; fee: number; projected: { upkeep: number; fee: number } };
  civicOpenings?: string[];
}): MorningBrief {
  const arrivingItemsCount = params.arrivingOrders.reduce((sum, o) => sum + o.quantity, 0);
  const tips: string[] = [];

  const weatherLabel = params.weather.label.toLowerCase();
  if (weatherLabel.includes('mưa')) {
    tips.push('Hôm nay trời mưa, bà con chuộng mua mì tôm, đồ hộp và đồ ăn nóng.');
  } else if (weatherLabel.includes('nóng') || weatherLabel.includes('nắng')) {
    tips.push('Trời nắng ráo, nhớ kiểm tra tủ mát và kệ nước giải khát để sẵn sàng phục vụ.');
  } else if (weatherLabel.includes('lạnh')) {
    tips.push('Tiết trời se lạnh, các món trà, cà phê và sữa đặc thường bán rất chạy.');
  }

  if (params.lowStockItems && params.lowStockItems.length > 0) {
    const names = params.lowStockItems.slice(0, 3).map(id => PRODUCT_MAP[id]?.name ?? id).join(', ');
    tips.push(`Sắp hết hàng trên kệ: ${names}${params.lowStockItems.length > 3 ? '…' : ''}.`);
  }

  if (arrivingItemsCount > 0) {
    tips.push(`Sáng nay có ${params.arrivingOrders.length} đơn hàng (${arrivingItemsCount} món) giao đến kho.`);
  }

  let reputationDelta: number | undefined;
  if (params.yesterdayReviews && params.yesterdayReviews.length > 0) {
    const s = reviewSentimentSummary(params.yesterdayReviews);
    if (s.totalDelta > 0) {
      tips.push(`Được xóm khen hôm qua: uy tín +${s.totalDelta.toFixed(1)} điểm. Cứ giữ phong độ!`);
    } else if (s.totalDelta < 0) {
      const cause = (s.topReason && feedbackReasonLabel(s.topReason.reason)) ? ` (chủ yếu do ${feedbackReasonLabel(s.topReason.reason)})` : '';
      tips.push(`Xóm than tiệm hôm qua: uy tín ${s.totalDelta.toFixed(1)} điểm${cause}. Giải quyết sớm để giữ khách.`);
    } else {
      tips.push(`Lời đánh giá hôm qua nhìn chung trung tính, uy tín không đổi. Giữ ổn định phục vụ.`);
    }
    reputationDelta = s.totalDelta;
  }

  if (tips.length === 0) {
    tips.push('Thời tiết thuận lợi, chúc tiệm buôn may bán đắt!');
  }

  return {
    day: params.day,
    seasonName: params.season.name,
    seasonDaysLeft: params.seasonDaysLeft,
    weatherLabel: params.weather.label,
    weatherIcon: params.weather.icon,
    forecastTomorrow: params.forecastTomorrow ?? 'Chưa có dự báo',
    arrivingOrdersCount: params.arrivingOrders.length,
    arrivingItemsCount,
    lowStockItems: params.lowStockItems ?? [],
    expiringItems: params.expiringItems ?? [],
    tips,
    ...(reputationDelta !== undefined ? { reputationDelta } : {}),
    ...(params.districtQol !== undefined ? { districtQol: params.districtQol } : {}),
    ...(params.civicPopulation !== undefined ? { civicPopulation: params.civicPopulation } : {}),
    ...(params.civicCosts !== undefined ? { civicCosts: params.civicCosts } : {}),
    ...(params.civicOpenings && params.civicOpenings.length ? { civicOpenings: params.civicOpenings } : {}),
  };
}
