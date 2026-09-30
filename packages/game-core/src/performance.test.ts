import assert from 'node:assert/strict';
import { isSalesFixture } from '@game/shared';
import { ALL_PRODUCTS, DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { buildDemandTable } from './demand';
import { buildMarketContext, createMarketState } from './market';

/** Đo thật; ngưỡng rộng để không chập chờn trên máy chậm. Số đo được in ra để ghi vào tài liệu. */
export function runPerformanceTests(): void {
  const state = createMarketState('perf-seed', 10);
  const ctx = buildMarketContext(state, 10, 12);
  buildDemandTable({ ctx, products: ALL_PRODUCTS, reputation: 50 });
  const runs = 500;
  const t0 = performance.now();
  for (let i = 0; i < runs; i++) buildDemandTable({ ctx, products: ALL_PRODUCTS, reputation: 50 });
  const perBuildMs = (performance.now() - t0) / runs;
  assert.ok(perBuildMs < 5, `buildDemandTable quá chậm: ${perBuildMs.toFixed(3)} ms`);

  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.player = { ...save.player, level: 6, money: 2_000_000 };
  const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());
  const refill = () => sim.getFixtures().filter(isSalesFixture).forEach((shelf, i) => {
    const productId = ['nuoc_suoi', 'mi_hao_hao', 'ca_phe_hoa_tan', 'ao_mua_bo'][i % 4];
    shelf.assignedProductId = productId;
    shelf.currentStock = 12;
    shelf.stockLots = [{ quantity: 12, expiresOnDay: 9999, unitCost: 3000, provenance: 'known' }];
  });
  refill();
  let frames = 0;
  const startDay = sim.getTime().day;
  const builds0 = sim.getDemandBuildCount();
  const t1 = performance.now();
  while (sim.getTime().day < startDay + 2) {
    const t = sim.getTime();
    if (!t.isStoreOpen && t.hour >= 8 && t.hour < 20) sim.getClock().toggleStoreStatus();
    if (frames % 4000 === 0) refill();
    sim.update(1 / 20);
    frames++;
  }
  const simMs = performance.now() - t1;
  const builds = sim.getDemandBuildCount() - builds0;
  assert.ok(builds < frames / 50, `Bảng nhu cầu phải lưu đệm, không tính lại mỗi khung hình (${builds} lần / ${frames} khung)`);
  assert.ok(simMs / 2 < 60_000, `Một ngày mô phỏng quá chậm: ${(simMs / 2).toFixed(0)} ms`);
  const t2 = performance.now();
  for (let i = 0; i < 50; i++) sim.getProductPlans();
  const planMs = (performance.now() - t2) / 50;
  assert.ok(planMs < 50, `getProductPlans quá chậm: ${planMs.toFixed(2)} ms`);
  console.log(`    đo: buildDemandTable ${perBuildMs.toFixed(3)} ms/lần (${ALL_PRODUCTS.length} món); 1 ngày mô phỏng ${(simMs / 2).toFixed(0)} ms (${Math.round(frames / 2)} khung/ngày, khách ${sim.getStatistics().totalCustomersServed}); bảng nhu cầu dựng ${builds} lần / ${frames} khung; getProductPlans ${planMs.toFixed(2)} ms`);
  console.log('  ✓ Passed: Hiệu năng — bảng nhu cầu nhanh và được lưu đệm');
}
