/**
 * Mô phỏng headless có quán nước: cùng mô phỏng thật của game (GameSimulation), cấp ${process.env.DRINK_LEVEL ?? 46}, kệ luôn đầy,
 * so sánh có/không mua quán nước (kèm tùy chọn mở rộng phía bắc) để thấy khách và doanh thu tăng thêm.
 * Số đo từ mô phỏng, KHÔNG thay thế playtest thật; harness giữ kệ đầy nên không đo thiếu hàng/chuỗi sản xuất.
 * Chạy: yarn --ignore-engines workspace @game/core tsx src/drink-balance-sim.ts   (DRINK_SEEDS, DRINK_DAYS, DRINK_PLOTS tùy chọn)
 */
import { isSalesFixture, type SaveGameData } from '@game/shared';
import { DEFAULT_INITIAL_SAVE, DRINK_PLOT_ID, PRODUCT_MAP, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { createMarketState } from './market';
import { applyStoreLayoutActions } from './store-layout';

const SEEDS = (process.env.DRINK_SEEDS ?? 'drink-a,drink-b,drink-c').split(',');
const DAYS = Number(process.env.DRINK_DAYS ?? 12);
const MAIN_PRODUCTS = ['nuoc_suoi', 'mi_hao_hao', 'ca_phe_hoa_tan', 'ao_mua_bo', 'xa_phong', 'banh_quy'];
// Món tự làm của quán (nước mía, sinh tố, cà phê sữa) là lý do mở quán: biên lợi nhuận cao hơn hàng đóng chai.
const DRINK_PRODUCTS = (process.env.DRINK_MIX === 'bottled' ? ['nuoc_suoi', 'tra_xanh', 'nuoc_cam', 'sua_tuoi', 'nuoc_khoang'] : ['nuoc_mia', 'sinh_to_trai_cay', 'ca_phe_sua_pha', 'tra_xanh']);
const EXTRA_PLOTS = (process.env.DRINK_PLOTS ?? '').split(',').filter(Boolean);
const lot = (quantity: number, unitCost: number) => ({ quantity, expiresOnDay: 99999, unitCost, provenance: 'known' as const });
const mapFor = (ids: readonly string[]) => generateStarterTileMap(ids);

interface Totals { days: number; customers: number; revenue: number; netProfit: number; drinkUnits: number }

function runScenario(withDrink: boolean): Totals {
  const totals: Totals = { days: 0, customers: 0, revenue: 0, netProfit: 0, drinkUnits: 0 };
  for (const seed of SEEDS) {
    let save: SaveGameData = { ...structuredClone(DEFAULT_INITIAL_SAVE), market: createMarketState(seed, 1) };
    save.player = { ...save.player, level: Number(process.env.DRINK_LEVEL ?? 46), money: 10_000_000 };
    save.worldTime = { ...save.worldTime, isStoreOpen: false };
    if (withDrink) save = applyStoreLayoutActions(save, [DRINK_PLOT_ID, ...EXTRA_PLOTS].map(plotId => ({ type: 'buy_plot' as const, plotId })), mapFor).save!;
    // Một thu ngân tự động phục vụ mọi hàng đợi (không có thì khách quán phụ phụ thuộc vị trí người chơi, làm lệch số đo).
    save.staff = [{ id: 'cashier-1', name: 'Bé Lan', role: 'cashier', speed: 5, accuracy: 5, stamina: 5, dailyWage: 30_000, hiredOnDay: 1, shift: 'full_day' }];
    const sim = new GameSimulation(save, mapFor(save.storeLayout.unlockedPlotIds ?? []), new InputManager(), {});
    const refill = () => {
      let mainIndex = 0;
      let drinkIndex = 0;
      for (const shelf of sim.getFixtures().filter(isSalesFixture)) {
        // Mọi kệ trong quán nước (kể cả ô con) gán đồ uống; kệ khác gán hàng tiệm chính.
        const isDrink = shelf.id === 'drink_shelf' || shelf.id.startsWith('drink_shelf#');
        shelf.assignedProductId = isDrink ? DRINK_PRODUCTS[drinkIndex++ % DRINK_PRODUCTS.length] : MAIN_PRODUCTS[mainIndex++ % MAIN_PRODUCTS.length];
        shelf.currentStock = 14;
        shelf.stockLots = [lot(14, PRODUCT_MAP[shelf.assignedProductId]?.purchasePrice ?? 3_000)]; // giá vốn thật của từng món
      }
    };
    refill();
    let day = sim.getTime().day;
    let hour = sim.getTime().hour;
    let guard = 0;
    while (sim.getTime().day < 1 + DAYS && guard++ < 6_000_000) {
      const t = sim.getTime();
      if (t.day !== day) { day = t.day; refill(); }
      if (t.hour !== hour) { hour = t.hour; refill(); }
      if (!t.isStoreOpen && t.hour < 20) sim.getClock().toggleStoreStatus();
      sim.update(0.25);
    }
    for (const record of Object.values(sim.getDailyRecords())) {
      if (record.day < 1 || record.day >= 1 + DAYS) continue;
      totals.days++;
      totals.customers += record.customersServed;
      totals.revenue += record.revenue;
      totals.netProfit += record.netProfit;
      for (const id of DRINK_PRODUCTS) totals.drinkUnits += record.productSales?.[id] ?? 0;
    }
  }
  return totals;
}

const vnd = (n: number) => Math.round(n).toLocaleString('en-US');
const without = runScenario(false);
const withShop = runScenario(true);
const perDay = (t: Totals, key: 'customers' | 'revenue' | 'netProfit' | 'drinkUnits') => t[key] / Math.max(1, t.days);

console.log(`Mô phỏng quán nước: ${SEEDS.length} hạt giống × ${DAYS} ngày, cấp ${process.env.DRINK_LEVEL ?? 46}, kệ luôn đầy, mảnh mở rộng: [${EXTRA_PLOTS.join(', ')}] (số ngày ghi nhận: ${without.days} / ${withShop.days})`);
console.log('Chỉ số/ngày          | Không quán nước | Có quán nước | Tăng thêm');
for (const [label, key] of [['Khách phục vụ', 'customers'], ['Doanh thu (₫)', 'revenue'], ['Lãi ròng (₫)', 'netProfit'], ['Đồ uống bán', 'drinkUnits']] as const) {
  const a = perDay(without, key), b = perDay(withShop, key);
  console.log(`${label.padEnd(20)} | ${vnd(a).padStart(15)} | ${vnd(b).padStart(12)} | ${vnd(b - a).padStart(9)}`);
}
const extraNet = perDay(withShop, 'netProfit') - perDay(without, 'netProfit');
const cost = 1_500_000 + EXTRA_PLOTS.reduce((sum, id) => sum + (id.endsWith('-a') ? 500_000 : id.endsWith('-b') ? 750_000 : 0), 0);
console.log(extraNet > 0 ? `Lãi ròng tăng thêm ≈ ${vnd(extraNet)} ₫/ngày → hoàn vốn ${vnd(cost)} ₫ sau ≈ ${(cost / extraNet).toFixed(1)} ngày (chưa tính nguyên liệu thật, nhân viên).` : 'Quán nước không tăng lãi ròng trong mô phỏng này.');
