import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, PRODUCT_MAP, RECIPE_MAP, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';

const map = generateStarterTileMap();
const lot = (quantity: number, unitCost: number) => ({ quantity, expiresOnDay: 400, unitCost, provenance: 'known' as const });
const station = (id: string, shopId: string, tileX: number) => ({ id, type: 'kitchen_station' as const, tileX, tileY: 5, widthTiles: 1, heightTiles: 1, rotation: 0 as const, currentStock: 0, maxCapacity: 0, label: shopId, shopId });

const runUntilIdle = (sim: GameSimulation, maxSeconds: number): number => {
  let seconds = 0;
  while (sim.getProductionJobs().length > 0 && seconds < maxSeconds) { sim.update(1); seconds++; }
  return seconds;
};

/**
 * Combo được LẮP RÁP qua Recipe: chạy `startProduction` công thức combo tại trạm của shop, nguyên liệu = các món
 * thành phẩm (FEFO), đầu ra là 1 đơn vị combo; COGS = tổng unitCost các lô thành viên đã tiêu.
 */
export function runComboProductionTests(): void {
  console.log('\n--- Combo lắp ráp qua Recipe (bếp đa môn) ---');

  // Recipe combo tồn tại và dùng đúng trạm quay_xoi (bếp xôi).
  const comboRecipe = RECIPE_MAP.recipe_combo_xoi_doi;
  assert.ok(comboRecipe, 'recipe_combo_xoi_doi có trong RECIPE_MAP');
  assert.equal(comboRecipe.stationShopId, 'quay_xoi');
  assert.equal(comboRecipe.outputProductId, 'combo_xoi_doi_tp');
  assert.equal(comboRecipe.outputQuantity, 1);
  // Nguyên liệu = chính các món thành phẩm của bếp xôi.
  const memberIds = comboRecipe.inputs.map(i => i.productId).sort();
  assert.deepEqual(memberIds, ['xoi_man_tp', 'xoi_trung_tp']);

  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.player.level = 36;
  // Xe đạp: bếp xôi có xôi mặn (giá vốn 15.100) và xôi trứng (9.600) đã làm sẵn (lô từ tiền sản xuất).
  save.inventory = [
    { productId: 'xoi_man_tp', quantity: 2, lots: [lot(2, 15_100)] },
    { productId: 'xoi_trung_tp', quantity: 2, lots: [lot(2, 9_600)] },
  ];
  save.storeLayout.fixtures.push(station('st_xoi', 'quay_xoi', 3));
  const sim = new GameSimulation(save, map, new InputManager(), {});
  const qty = (id: string) => sim.getInventory().find(item => item.productId === id)?.quantity ?? 0;

  // Lắp ráp 1 suất xôi đôi: tiêu 1 xôi mặn + 1 xôi trứng → 1 combo.
  assert.equal(sim.startProduction('recipe_combo_xoi_doi', 'st_xoi').success, true, 'lắp ráp combo thành công');
  const secs = runUntilIdle(sim, 40);
  assert.ok(secs > 0, 'combo hoàn tất sau một thời gian');
  assert.equal(qty('combo_xoi_doi_tp'), 1);
  assert.equal(qty('xoi_man_tp'), 1);
  assert.equal(qty('xoi_trung_tp'), 1);
  // COGS của combo = tổng giá vốn lô 2 món đã tiêu (FEFO).
  const comboLot = sim.getInventory().find(item => item.productId === 'combo_xoi_doi_tp')!.lots![0];
  assert.equal(comboLot.unitCost, 15_100 + 9_600, 'giá vốn combo = tổng giá vốn thành viên đã tiêu');
  // Giá bán combo khớp khai báo.
  assert.equal(PRODUCT_MAP.combo_xoi_doi_tp.baseSellingPrice, 38_700);
  assert.ok(comboLot.unitCost < PRODUCT_MAP.combo_xoi_doi_tp.baseSellingPrice, 'combo có lãi (vốn < giá bán)');

  // Thiếu thành viên → không lắp ráp, không tiêu gì.
  const save2 = structuredClone(DEFAULT_INITIAL_SAVE);
  save2.player.level = 36;
  save2.inventory = [{ productId: 'xoi_man_tp', quantity: 1, lots: [lot(1, 15_100)] }]; // thiếu xôi trứng
  save2.storeLayout.fixtures.push(station('st_xoi', 'quay_xoi', 3));
  const sim2 = new GameSimulation(save2, map, new InputManager(), {});
  assert.equal(sim2.startProduction('recipe_combo_xoi_doi', 'st_xoi').success, false, 'thiếu xôi trứng → chặn lắp ráp');
  assert.equal(sim2.getInventory().find(i => i.productId === 'xoi_man_tp')?.quantity, 1, 'không tiêu xôi mặn khi thiếu thành viên');

  // Combo có thể lưu/tải như production job thường (save cũ tải bình thường, không bump schema).
  const exported = sim.exportSaveData('cs', 1);
  assert.ok(Array.isArray(exported.productionJobs), 'productionJobs là mảng (job combo persisted như mọi job)');
  assert.ok(!('comboSales' in exported), 'không thêm field save bắt buộc mới cho combo');

  console.log('Combo lắp ráp qua Recipe: PASS');
}
