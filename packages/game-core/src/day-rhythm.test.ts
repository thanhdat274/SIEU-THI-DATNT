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

  console.log('  ✓ Passed: Nhịp ngày — Tổng kết ngày và Bản tin sáng chuẩn xác');
}
