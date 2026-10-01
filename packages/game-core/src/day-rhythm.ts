import type { DailyRecord } from '@game/shared';
import { PRODUCT_MAP } from '@game/data';

export interface DaySummary {
  day: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  spoilageCost: number;
  wagesPaid: number;
  netProfit: number;
  customersServed: number;
  transactionsCount: number;
  itemsSold: number;
  averageStars?: number;
  ratingCount: number;
  bestSellingProductId?: string;
  walkouts: number;
}

/** Read-only summary derived from the closed daily record; never changes ledger or cash. */
export function buildDaySummary(record: DailyRecord): DaySummary {
  const bestSellingProductId = Object.entries(record.productSales ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0];
  return {
    day: record.day,
    revenue: record.revenue,
    cogs: record.cogs,
    grossProfit: record.grossProfit,
    spoilageCost: record.spoilageCost,
    wagesPaid: record.wagesPaid,
    netProfit: record.netProfit,
    customersServed: record.customersServed,
    transactionsCount: record.transactionsCount,
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
  };
}
