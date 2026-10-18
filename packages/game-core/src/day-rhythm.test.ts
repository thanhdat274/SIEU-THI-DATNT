import assert from 'node:assert/strict';
import { buildDaySummary, buildMorningBrief } from './day-rhythm';
import type { DailyRecord } from '@game/shared';

export function runDayRhythmTests(): void {
  console.log('--- Test Day Rhythm & Morning Brief ---');

  // Test 1: buildDaySummary computes correct profit and best seller
  const record: DailyRecord = {
    day: 5,
    revenue: 150000,
    cogs: 90000,
    purchaseTotal: 100000,
    spoilageCost: 5000,
    wagesPaid: 20000,
    grossProfit: 60000,
    netProfit: 35000,
    customersServed: 12,
    transactionsCount: 10,
    itemsSold: 25,
    spoilageCount: 1,
    productSales: {
      mi_hao_hao: 15,
      xa_xi_chuong_duong: 10,
    },
    averageStars: 4.6,
    ratingCount: 10,
  };

  const summary = buildDaySummary(record);
  assert.equal(summary.day, 5);
  assert.equal(summary.revenue, 150000);
  assert.equal(summary.bestSellingProductId, 'mi_hao_hao');
  assert.equal(summary.netProfit, 35000);

  // Test 2: buildMorningBrief formats weather, orders, and tips
  const brief = buildMorningBrief({
    day: 6,
    season: { name: 'Mùa mưa Sài Gòn' },
    seasonDaysLeft: 25,
    weather: { label: 'Mưa rào', icon: '🌧️' },
    forecastTomorrow: 'Nắng nhẹ',
    arrivingOrders: [
      { productId: 'mi_hao_hao', quantity: 20 },
      { productId: 'xa_xi_chuong_duong', quantity: 10 },
    ],
    lowStockItems: ['sua_ong_tho'],
  });

  assert.equal(brief.day, 6);
  assert.equal(brief.arrivingOrdersCount, 2);
  assert.equal(brief.arrivingItemsCount, 30);
  assert.equal(brief.lowStockItems.length, 1);
  assert.ok(brief.tips.length >= 2, 'Có ít nhất 2 lời khuyên (thời tiết + đơn giao/hàng sắp hết)');

  // Test 3: Bản tin sáng đưa vài lời khách nổi bật (chê mạnh nhất + khen hay nhất) vào standoutReviews.
  const brief3 = buildMorningBrief({
    day: 7,
    season: { name: 'Mùa mưa Sài Gòn' },
    seasonDaysLeft: 10,
    weather: { label: 'Nắng', icon: '☀️' },
    arrivingOrders: [],
    yesterdayReviews: [
      { id: 'a', day: 6, hour: 9, minute: 0, stars: 2, author: 'A', text: 'chê 1', reason: 'wait' },
      { id: 'b', day: 6, hour: 10, minute: 0, stars: 1, author: 'B', text: 'chê 2', reason: 'out_of_stock' },
      { id: 'c', day: 6, hour: 11, minute: 0, stars: 5, author: 'C', text: 'khen', productId: 'mi_hao_hao' },
      { id: 'd', day: 6, hour: 12, minute: 0, stars: 4, author: 'D', text: 'khen 2' },
    ],
  });
  assert.ok(brief3.standoutReviews, 'Có mục lời nổi bật');
  assert.ok(brief3.standoutReviews!.length <= 3, 'Tối đa 3 lời nổi bật');
  assert.ok(brief3.standoutReviews!.some(r => r.id === 'b'), 'Chê mạnh nhất (1 sao) được chọn');
  assert.ok(brief3.standoutReviews!.some(r => r.id === 'c'), 'Khen 5 sao được chọn');
  const briefEmpty = buildMorningBrief({ day: 8, season: { name: 'X' }, seasonDaysLeft: 1, weather: { label: 'Mưa', icon: '☔' }, arrivingOrders: [] });
  assert.equal(briefEmpty.standoutReviews, undefined, 'Không lời hôm qua thì không có mục nổi bật');

  console.log('  ✓ Passed: Nhịp ngày — Tổng kết ngày và Bản tin sáng chuẩn xác');
}
