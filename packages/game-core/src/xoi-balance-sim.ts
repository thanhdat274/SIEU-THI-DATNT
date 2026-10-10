/**
 * Mô phỏng headless có tiệm xôi: cùng mô phỏng thật của game (GameSimulation), cấp 40, kệ luôn đầy,
 * so sánh có/không mua tiệm xôi để thấy khách và doanh thu tăng thêm từ tiệm xôi.
 * Số đo từ mô phỏng, KHÔNG thay thế playtest thật; harness giữ kệ đầy nên không đo thiếu hàng/chuỗi sản xuất.
 * Chạy: yarn --ignore-engines workspace @game/core tsx src/xoi-balance-sim.ts
 */
import { isSalesFixture, type SaveGameData } from '@game/shared';
import { DEFAULT_INITIAL_SAVE, PRODUCT_MAP, XOI_PLOT_ID, XOI_TRAFFIC_SHARE, generateStarterTileMap, type LandParcel } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { createMarketState } from './market';
import { applyStoreLayoutActions } from './store-layout';
import { effectiveSecondaryBuildingTrafficShare } from './reclamation';

const SEEDS = (process.env.XOI_SEEDS ?? 'xoi-a,xoi-b,xoi-c').split(',');
const DAYS = Number(process.env.XOI_DAYS ?? 12);
const MAIN_PRODUCTS = ['nuoc_suoi', 'mi_hao_hao', 'ca_phe_hoa_tan', 'ao_mua_bo', 'xa_phong', 'banh_quy'];
const XOI_PRODUCTS = ['xoi_man_tp', 'xoi_dau_xanh_tp', 'xoi_trung_tp', 'xoi_dua_tp'];
const lot = (quantity: number, unitCost: number) => ({ quantity, expiresOnDay: 99999, unitCost, provenance: 'known' as const });
const mapFor = (ids: readonly string[]) => generateStarterTileMap(ids);

interface Totals { days: number; customers: number; revenue: number; netProfit: number; xoiUnits: number }

function runScenario(withXoi: boolean): Totals {
  const totals: Totals = { days: 0, customers: 0, revenue: 0, netProfit: 0, xoiUnits: 0 };
  for (const seed of SEEDS) {
    let save: SaveGameData = { ...structuredClone(DEFAULT_INITIAL_SAVE), market: createMarketState(seed, 1) };
    save.player = { ...save.player, level: 40, money: 5_000_000 };
    save.worldTime = { ...save.worldTime, isStoreOpen: false };
    if (withXoi) save = applyStoreLayoutActions(save, [{ type: 'buy_plot', plotId: XOI_PLOT_ID }], mapFor).save!;
    const sim = new GameSimulation(save, mapFor(save.storeLayout.unlockedPlotIds ?? []), new InputManager(), {});
    const refill = () => {
      let mainIndex = 0;
      let xoiIndex = 0;
      for (const shelf of sim.getFixtures().filter(isSalesFixture)) {
        // Kệ xôi có 12 ô con (id `xoi_shelf#sN`): đều là kệ bán hàng của tiệm xôi nên phải gán món xôi.
        const isXoi = shelf.id === 'xoi_shelf' || shelf.id.startsWith('xoi_shelf#');
        shelf.assignedProductId = isXoi ? XOI_PRODUCTS[xoiIndex++ % XOI_PRODUCTS.length] : MAIN_PRODUCTS[mainIndex++ % MAIN_PRODUCTS.length];
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
      for (const id of XOI_PRODUCTS) totals.xoiUnits += record.productSales?.[id] ?? 0;
    }
  }
  return totals;
}

const vnd = (n: number) => Math.round(n).toLocaleString('en-US');
const without = runScenario(false);
const withShop = runScenario(true);
const perDay = (t: Totals, key: 'customers' | 'revenue' | 'netProfit' | 'xoiUnits') => t[key] / Math.max(1, t.days);

console.log(`Mô phỏng xôi: ${SEEDS.length} hạt giống × ${DAYS} ngày, cấp 40, kệ luôn đầy (số ngày ghi nhận: ${without.days} / ${withShop.days})`);
console.log('Chỉ số/ngày          | Không tiệm xôi | Có tiệm xôi | Tăng thêm');
for (const [label, key] of [['Khách phục vụ', 'customers'], ['Doanh thu (₫)', 'revenue'], ['Lãi ròng (₫)', 'netProfit'], ['Phần xôi bán', 'xoiUnits']] as const) {
  const a = perDay(without, key), b = perDay(withShop, key);
  console.log(`${label.padEnd(20)} | ${vnd(a).padStart(14)} | ${vnd(b).padStart(11)} | ${vnd(b - a).padStart(9)}`);
}
const extraNet = perDay(withShop, 'netProfit') - perDay(without, 'netProfit');
console.log(extraNet > 0 ? `Lãi ròng tăng thêm ≈ ${vnd(extraNet)} ₫/ngày → hoàn vốn mua tiệm 700.000 ₫ sau ≈ ${(700_000 / extraNet).toFixed(1)} ngày (chưa tính trạm, nguyên liệu thật).` : 'Tiệm xôi không tăng lãi ròng trong mô phỏng này.');

/** D5 (open-world-land-reclamation): khách theo vị trí LÔ — so ba vị trí (spec "Location value"). */
export function compareXoiPositions(): Array<{ label: string; multiplier: number; effectiveShare: number }> {
  // Thuần trên lô tổng hợp (W1..W4 chưa đặt được tòa THẬT — chưa vào PARCEL_MAP, chưa renderer), số PROVISIONAL.
  const synthetic = (id: string, frontageRoadId: string, corner: boolean): LandParcel =>
    ({ id, rect: { x0: 42, x1: 47, y0: 8, y1: 12 }, wave: 1, frontageRoadId, frontage: { corner } });
  const rows = [
    { label: 'Góc ngã tư đường CHÍNH', parcel: synthetic('sim-xoi-corner-main', 'main', true) },
    { label: 'Mặt đường CHÍNH (W0)', parcel: synthetic('sim-xoi-face-main', 'main', false) },
    { label: 'Mặt đường NAM', parcel: synthetic('sim-xoi-face-south', 'south', false) },
  ];
  return rows.map(({ label, parcel }) => {
    const effectiveShare = effectiveSecondaryBuildingTrafficShare('xoi', parcel);
    return { label, multiplier: effectiveShare / XOI_TRAFFIC_SHARE, effectiveShare };
  });
}
const xoiPositions = compareXoiPositions();
console.log('So vị trí lô (D5, provisional): nhịp sinh khách tiệm xôi = BUILDING_TRAFFIC_SHARE × hệ số khách lô');
for (const r of xoiPositions) {
  console.log(`${r.label.padEnd(25)} | hệ số ${String(r.multiplier).padEnd(6)} | share×hệ số ${r.effectiveShare.toFixed(4)}`);
}
const [xc, xm, xs] = xoiPositions;
console.log(`Kết luận (đúng D5): góc chính > mặt chính > đường nam → ${xc.multiplier > xm.multiplier && xm.multiplier > xs.multiplier ? 'ĐÚNG' : 'SAI'}`);
