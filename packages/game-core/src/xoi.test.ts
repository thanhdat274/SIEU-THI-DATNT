import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, FIXTURE_SHOP, PRODUCT_MAP, RECIPES, RECIPE_MAP, SELLABLE_PRODUCTS, generateStarterTileMap } from '@game/data';
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

export function runXoiTests(): void {
  console.log('\n--- Chuỗi xôi: ngâm → hấp → múc xôi ---');

  // Dữ liệu: công thức xôi hợp lệ, trạm là nội thất mua được, bán thành phẩm không bán trực tiếp.
  const xoiStations = ['thung_ngam', 'xung_hap', 'quay_xoi'];
  for (const id of xoiStations) {
    const item = FIXTURE_SHOP.find(entry => entry.id === id)!;
    assert.ok(item && item.functional && item.type === 'kitchen_station', `${id} là trạm bếp dùng được`);
    assert.ok(RECIPES.some(recipe => recipe.stationShopId === id), `${id} có công thức`);
  }
  for (const recipe of RECIPES.filter(item => xoiStations.includes(item.stationShopId))) {
    for (const input of recipe.inputs) assert.ok(PRODUCT_MAP[input.productId], `${recipe.id}: nguyên liệu ${input.productId} có trong catalog`);
    assert.ok(PRODUCT_MAP[recipe.outputProductId]);
  }
  for (const id of ['nep_ngam', 'nep_chin']) {
    assert.equal(PRODUCT_MAP[id].intermediate, true);
    assert.ok(!SELLABLE_PRODUCTS.some(product => product.id === id), `${id} không nằm trong hàng bán được`);
  }
  assert.ok(SELLABLE_PRODUCTS.some(product => product.id === 'xoi_man_tp'), 'xôi thành phẩm bán được');

  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.player.level = 29;
  save.inventory = [
    { productId: 'nep', quantity: 10, lots: [lot(10, 28_000)] },
    { productId: 'dau_xanh', quantity: 5, lots: [lot(5, 2_500)] },
  ];
  save.storeLayout.fixtures.push(station('st_soak', 'thung_ngam', 1), station('st_steam', 'xung_hap', 2), station('st_xoi', 'quay_xoi', 3));
  const sim = new GameSimulation(save, map, new InputManager(), {});
  const qty = (id: string) => sim.getInventory().find(item => item.productId === id)?.quantity ?? 0;

  // Đúng trạm mới nấu được; thiếu nguyên liệu thì không trừ gì.
  assert.equal(sim.startProduction('recipe_hap_nep_10', 'st_soak').success, false, 'công thức hấp không chạy ở thùng ngâm');
  assert.equal(sim.startProduction('recipe_hap_nep_10', 'st_steam').success, false, 'chưa có nếp ngâm');
  assert.equal(qty('nep'), 10);
  assert.deepEqual(sim.getStationRecipes('st_soak').map(recipe => recipe.id).sort(), ['recipe_ngam_nep_10', 'recipe_ngam_nep_5']);

  // Ngâm 10 kg: trừ nếp, ra nếp ngâm giữ giá vốn 28.000/kg.
  assert.equal(sim.startProduction('recipe_ngam_nep_10', 'st_soak').success, true);
  assert.equal(qty('nep'), 0);
  assert.equal(sim.startProduction('recipe_ngam_nep_5', 'st_soak').success, false, 'thùng đang bận');
  const soakSeconds = runUntilIdle(sim, 400);
  assert.ok(soakSeconds >= RECIPE_MAP.recipe_ngam_nep_10.durationSeconds - 1 && soakSeconds <= 400, `ngâm mất ~${RECIPE_MAP.recipe_ngam_nep_10.durationSeconds}s (thực tế ${soakSeconds}s)`);
  assert.equal(qty('nep_ngam'), 10);
  assert.equal(sim.getInventory().find(item => item.productId === 'nep_ngam')!.lots![0].unitCost, 28_000);

  // Hấp 10 kg → 50 phần, giá vốn 5.600/phần như bản gốc.
  assert.equal(sim.startProduction('recipe_hap_nep_10', 'st_steam').success, true);
  runUntilIdle(sim, 100);
  assert.equal(qty('nep_ngam'), 0);
  assert.equal(qty('nep_chin'), 50);
  assert.equal(sim.getInventory().find(item => item.productId === 'nep_chin')!.lots![0].unitCost, 5_600);

  // Múc xôi đậu xanh: giá vốn 8.100/phần (5.600 nếp + 2.500 đậu).
  assert.equal(sim.startProduction('recipe_xoi_man', 'st_xoi').success, false, 'thiếu chả bông, lạp xưởng, hành phi');
  assert.equal(qty('nep_chin'), 50, 'thiếu nguyên liệu không trừ nếp chín');
  assert.equal(sim.startProduction('recipe_xoi_dau_xanh', 'st_xoi').success, true);
  runUntilIdle(sim, 100);
  assert.equal(qty('xoi_dau_xanh_tp'), 5);
  assert.equal(qty('nep_chin'), 45);
  assert.equal(sim.getInventory().find(item => item.productId === 'xoi_dau_xanh_tp')!.lots![0].unitCost, 8_100);

  // Nếp chín và xôi chỉ giữ 1 ngày; nếp ngâm giữ 2 ngày.
  const day = sim.getTime().day;
  assert.equal(sim.getInventory().find(item => item.productId === 'nep_chin')!.lots![0].expiresOnDay, day + 1);
  assert.equal(PRODUCT_MAP.nep_ngam.expirationRules!.daysToSpoil, 2);

  // Save/load giữa chừng một mẻ ngâm.
  const saveMid = structuredClone(DEFAULT_INITIAL_SAVE);
  saveMid.player.level = 29;
  saveMid.inventory = [{ productId: 'nep', quantity: 5, lots: [lot(5, 28_000)] }];
  saveMid.storeLayout.fixtures.push(station('st_soak', 'thung_ngam', 1));
  const mid = new GameSimulation(saveMid, map, new InputManager(), {});
  assert.equal(mid.startProduction('recipe_ngam_nep_5', 'st_soak').success, true);
  mid.update(100);
  const reloaded = new GameSimulation(structuredClone(mid.exportSaveData('s', 1)), map, new InputManager(), {});
  assert.equal(reloaded.getProductionJobs().length, 1);
  runUntilIdle(reloaded, 400);
  assert.equal(reloaded.getInventory().find(item => item.productId === 'nep_ngam')?.quantity, 5);

  // Dưới cấp 29 không nấu được.
  const lowSave = structuredClone(saveMid);
  lowSave.player.level = 28;
  assert.equal(new GameSimulation(lowSave, map, new InputManager(), {}).startProduction('recipe_ngam_nep_5', 'st_soak').success, false);
  console.log('Chuỗi xôi: PASS');
}
