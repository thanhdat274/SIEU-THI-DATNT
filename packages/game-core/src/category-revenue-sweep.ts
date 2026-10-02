/**
 * Mô phỏng không đầu: doanh thu và lãi gộp theo nhóm hàng ở vài mốc cấp.
 * Mỗi ngày kệ được xếp lại xoay vòng trong số hàng đã mở khóa, kệ luôn đầy, nên số đo phản ánh
 * sức hút của từng nhóm khi được bày bán, KHÔNG gồm hao hụt/hỏng, tồn kho hay nhập hàng thực tế.
 * Đây là số đo từ mô phỏng, KHÔNG thay thế playtest thật với người chơi.
 * Chạy: yarn workspace @game/core category-revenue   (SWEEP_DAYS, SWEEP_LEVELS để chỉnh)
 */
import { isSalesFixture } from '@game/shared';
import { ALL_PRODUCTS, DEFAULT_INITIAL_SAVE, PRODUCT_MAP, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { createMarketState } from './market';

const SEEDS = ['rev-a', 'rev-b', 'rev-c'];
const DAYS = Number(process.env.SWEEP_DAYS ?? 12);
const LEVELS = (process.env.SWEEP_LEVELS ?? '5,15,30').split(',').map(Number);

interface Agg { units: number; revenue: number; cogs: number }
const header = (level: number, unlocked: number) => console.log(`\n== Cấp ${level} (${unlocked} mặt hàng đã mở khóa; ${SEEDS.length} hạt giống × ${DAYS} ngày) ==`);

for (const level of LEVELS) {
  const unlocked = ALL_PRODUCTS.filter(p => p.unlockLevel <= level);
  const byCategory: Record<string, Agg> = {};
  let totalRevenue = 0;
  for (const seed of SEEDS) {
    const save = { ...structuredClone(DEFAULT_INITIAL_SAVE), market: createMarketState(seed, 1) };
    save.player = { ...save.player, level, money: 5_000_000 };
    const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());
    const shelves = () => sim.getFixtures().filter(isSalesFixture);
    let offset = 0;
    const refill = () => shelves().forEach((shelf, i) => {
      const product = unlocked[((offset + i) * 11) % unlocked.length];
      if (shelf.assignedProductId !== product.id) shelf.assignedProductId = product.id;
      shelf.currentStock = Math.min(shelf.maxCapacity || 14, 14);
      shelf.stockLots = [{ quantity: shelf.currentStock, expiresOnDay: 99999, unitCost: product.purchasePrice, provenance: 'known' }];
    });
    let day = sim.getTime().day, hour = sim.getTime().hour, guard = 0;
    const startDay = day;
    refill();
    const collect = (d: number) => {
      const record = sim.getDailyRecords()[d];
      for (const [id, qty] of Object.entries(record?.productSales ?? {})) {
        const product = PRODUCT_MAP[id];
        if (!product) continue;
        const agg = (byCategory[product.category] ??= { units: 0, revenue: 0, cogs: 0 });
        agg.units += qty; agg.revenue += qty * product.baseSellingPrice; agg.cogs += qty * product.purchasePrice;
        totalRevenue += qty * product.baseSellingPrice;
      }
    };
    while (sim.getTime().day < startDay + DAYS && guard++ < 6_000_000) {
      const t = sim.getTime();
      if (t.day !== day) { collect(day); day = t.day; refill(); }
      if (t.hour !== hour) { hour = t.hour; offset += shelves().length; refill(); }
      if (!t.isStoreOpen && t.hour >= 8 && t.hour < 20) sim.getClock().toggleStoreStatus();
      sim.update(0.25);
    }
    collect(day);
  }
  header(level, unlocked.length);
  const catCount: Record<string, number> = {};
  for (const p of unlocked) catCount[p.category] = (catCount[p.category] ?? 0) + 1;
  const rows = Object.entries(byCategory).sort((a, b) => b[1].revenue - a[1].revenue);
  console.log('nhóm'.padEnd(22), 'SP'.padStart(4), 'số bán'.padStart(8), 'doanh thu'.padStart(12), 'tỉ trọng'.padStart(9), 'lãi gộp'.padStart(8), 'doanh thu/SP'.padStart(13));
  for (const [category, a] of rows) {
    console.log(
      category.padEnd(22), String(catCount[category] ?? 0).padStart(4), String(a.units).padStart(8),
      Math.round(a.revenue).toLocaleString('en-US').padStart(12), `${(100 * a.revenue / (totalRevenue || 1)).toFixed(1)}%`.padStart(9),
      `${(100 * (a.revenue - a.cogs) / (a.revenue || 1)).toFixed(0)}%`.padStart(8),
      Math.round(a.revenue / (catCount[category] || 1)).toLocaleString('en-US').padStart(13),
    );
  }
}
