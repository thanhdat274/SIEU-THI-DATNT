/**
 * Mô phỏng headless có quán ăn vặt: cùng mô phỏng thật của game (GameSimulation), cấp 30 (60 khi có cụm), kệ luôn đầy,
 * so sánh có/không mua quán ăn vặt (kèm tùy chọn mảnh bắc) để thấy khách và doanh thu tăng thêm.
 * Số đo từ mô phỏng, KHÔNG thay thế playtest thật; harness giữ kệ đầy nên không đo thiếu hàng/chuỗi sản xuất.
 * Chạy: yarn --ignore-engines workspace @game/core tsx src/snack-balance-sim.ts   (SNACK_SEEDS, SNACK_DAYS, SNACK_LEVEL, SNACK_PLOTS, SNACK_WITH_CLUSTER tùy chọn)
 *   SNACK_WITH_CLUSTER=1: mở thêm quán xôi + quán nước ở cả hai kịch bản, để đo phần cộng hưởng cụm ẩm thực.
 */
import { isSalesFixture, type SaveGameData } from '@game/shared';
import { DEFAULT_INITIAL_SAVE, DRINK_PLOT_ID, LAND_PLOTS, PRODUCT_MAP, SNACK_PLOT_ID, XOI_PLOT_ID, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { createMarketState } from './market';
import { applyStoreLayoutActions } from './store-layout';

const SEEDS = (process.env.SNACK_SEEDS ?? 'snack-a,snack-b,snack-c').split(',');
const DAYS = Number(process.env.SNACK_DAYS ?? 12);
const CLUSTER = process.env.SNACK_WITH_CLUSTER === '1';
const LEVEL = Number(process.env.SNACK_LEVEL ?? (CLUSTER ? 60 : 30)); // quán xôi/nước cần cấp cao hơn để mở cụm
const MAIN_PRODUCTS = ['nuoc_suoi', 'mi_hao_hao', 'ca_phe_hoa_tan', 'ao_mua_bo', 'xa_phong', 'banh_quy'];
const SNACK_PRODUCTS = ['bap_xao_tp', 'ca_vien_chien_tp', 'banh_trang_tron_tp'];
const EXTRA_PLOTS = (process.env.SNACK_PLOTS ?? '').split(',').filter(Boolean);
const lot = (quantity: number, unitCost: number) => ({ quantity, expiresOnDay: 99999, unitCost, provenance: 'known' as const });
const mapFor = (ids: readonly string[]) => generateStarterTileMap(ids);

interface Totals { days: number; customers: number; revenue: number; netProfit: number; snackUnits: number }

function runScenario(withSnack: boolean): Totals {
  const totals: Totals = { days: 0, customers: 0, revenue: 0, netProfit: 0, snackUnits: 0 };
  for (const seed of SEEDS) {
    let save: SaveGameData = { ...structuredClone(DEFAULT_INITIAL_SAVE), market: createMarketState(seed, 1) };
    save.player = { ...save.player, level: LEVEL, money: 10_000_000 };
    save.worldTime = { ...save.worldTime, isStoreOpen: false };
    const plots = [...(CLUSTER ? [XOI_PLOT_ID, DRINK_PLOT_ID] : []), ...(withSnack ? [SNACK_PLOT_ID, ...EXTRA_PLOTS] : [])];
    if (plots.length) save = applyStoreLayoutActions(save, plots.map(plotId => ({ type: 'buy_plot' as const, plotId })), mapFor).save!;
    // Một thu ngân tự động phục vụ mọi hàng đợi (không có thì khách quán phụ phụ thuộc vị trí người chơi, làm lệch số đo).
    save.staff = [{ id: 'cashier-1', name: 'Bé Lan', role: 'cashier', speed: 5, accuracy: 5, stamina: 5, dailyWage: 30_000, hiredOnDay: 1, shift: 'full_day' }];
    const sim = new GameSimulation(save, mapFor(save.storeLayout.unlockedPlotIds ?? []), new InputManager(), {});
    const refill = () => {
      let mainIndex = 0;
      let snackIndex = 0;
      for (const shelf of sim.getFixtures().filter(isSalesFixture)) {
        const isSnack = shelf.id === 'snack_shelf' || shelf.id.startsWith('snack_shelf#');
        const isOther = shelf.id.startsWith('xoi_') || shelf.id.startsWith('drink_');
        if (isOther) continue; // kệ quán xôi/quán nước giữ nguyên bố cục mặc định (chỉ để mở cụm)
        shelf.assignedProductId = isSnack ? SNACK_PRODUCTS[snackIndex++ % SNACK_PRODUCTS.length] : MAIN_PRODUCTS[mainIndex++ % MAIN_PRODUCTS.length];
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
      for (const id of SNACK_PRODUCTS) totals.snackUnits += record.productSales?.[id] ?? 0;
    }
  }
  return totals;
}

const vnd = (n: number) => Math.round(n).toLocaleString('en-US');
const without = runScenario(false);
const withShop = runScenario(true);
const perDay = (t: Totals, key: 'customers' | 'revenue' | 'netProfit' | 'snackUnits') => t[key] / Math.max(1, t.days);

console.log(`Mô phỏng quán ăn vặt: ${SEEDS.length} hạt giống × ${DAYS} ngày, cấp ${LEVEL}, kệ luôn đầy, cụm xôi+nước: ${CLUSTER ? 'có' : 'không'}, mảnh mở rộng: [${EXTRA_PLOTS.join(', ')}] (số ngày ghi nhận: ${without.days} / ${withShop.days})`);
console.log('Chỉ số/ngày          | Không quán ăn vặt | Có quán ăn vặt | Tăng thêm');
for (const [label, key] of [['Khách phục vụ', 'customers'], ['Doanh thu (₫)', 'revenue'], ['Lãi ròng (₫)', 'netProfit'], ['Món ăn vặt bán', 'snackUnits']] as const) {
  const a = perDay(without, key), b = perDay(withShop, key);
  console.log(`${label.padEnd(20)} | ${vnd(a).padStart(17)} | ${vnd(b).padStart(14)} | ${vnd(b - a).padStart(9)}`);
}
const extraNet = perDay(withShop, 'netProfit') - perDay(without, 'netProfit');
const cost = LAND_PLOTS.find(p => p.id === SNACK_PLOT_ID)!.cost + EXTRA_PLOTS.reduce((sum, id) => sum + (LAND_PLOTS.find(p => p.id === id)?.cost ?? 0), 0);
console.log(extraNet > 0 ? `Lãi ròng tăng thêm ≈ ${vnd(extraNet)} ₫/ngày → hoàn vốn ${vnd(cost)} ₫ sau ≈ ${(cost / extraNet).toFixed(1)} ngày (chưa tính nguyên liệu thật, nhân viên).` : 'Quán ăn vặt không tăng lãi ròng trong mô phỏng này.');
