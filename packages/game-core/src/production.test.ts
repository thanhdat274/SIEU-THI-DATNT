import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, PRODUCT_MAP, RECIPE_MAP, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';

const map = generateStarterTileMap();
const recipe = RECIPE_MAP.recipe_banh_mi_trung_nuong;

const newSim = (level = 25, inventory = [
  { productId: 'banh_mi_goi', quantity: 3, lots: [{ quantity: 1, expiresOnDay: 5, unitCost: 10_000, provenance: 'known' as const }, { quantity: 2, expiresOnDay: 9, unitCost: 14_000, provenance: 'known' as const }] },
  { productId: 'trung_ga', quantity: 4, lots: [{ quantity: 4, expiresOnDay: 12, unitCost: 3_000, provenance: 'known' as const }] },
]) => {
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.player.level = level;
  save.inventory = inventory;
  save.storeLayout.fixtures.push({ id: 'kitchen_station_buy_1', type: 'kitchen_station', tileX: 5, tileY: 5, widthTiles: 2, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Bếp nướng', shopId: 'food_grill' });
  return new GameSimulation(save, map, new InputManager(), {});
};

export function runProductionTests(): void {
  console.log('\n--- Sản xuất công thức: bếp nướng/ấm nước, FEFO, giá vốn, save/load ---');

  // Công thức hợp lệ: nguyên liệu và đầu ra đều có trong catalog.
  for (const r of Object.values(RECIPE_MAP)) {
    for (const input of r.inputs) assert.ok(PRODUCT_MAP[input.productId], `${r.id}: nguyên liệu ${input.productId} có trong catalog`);
    assert.ok(PRODUCT_MAP[r.outputProductId], `${r.id}: đầu ra có trong catalog`);
    assert.ok(r.outputQuantity > 0 && r.durationSeconds > 0);
  }

  // Mở khóa theo cấp và đúng trạm.
  const low = newSim(recipe.unlockLevel - 1);
  assert.equal(low.startProduction(recipe.id, 'kitchen_station_buy_1').success, false, 'Dưới cấp mở khóa không nấu được');
  assert.equal(low.getStationRecipes('kitchen_station_buy_1').length, 0);
  const sim = newSim();
  assert.equal(sim.startProduction('recipe_tra_gung_nong', 'kitchen_station_buy_1').success, false, 'Công thức của trạm khác bị từ chối');
  assert.ok(sim.getStationRecipes('kitchen_station_buy_1').some(r => r.id === recipe.id));

  // Thiếu nguyên liệu: kho không đổi.
  const short = newSim(25, [{ productId: 'banh_mi_goi', quantity: 1, lots: [{ quantity: 1, expiresOnDay: 9, unitCost: 14_000, provenance: 'known' }] }]);
  const before = JSON.stringify(short.getInventory());
  const miss = short.startProduction(recipe.id, 'kitchen_station_buy_1');
  assert.equal(miss.success, false);
  assert.match(miss.reason ?? '', /Thiếu/);
  assert.equal(JSON.stringify(short.getInventory()), before, 'Thiếu nguyên liệu thì không trừ một phần');

  // Bắt đầu: trừ nguyên liệu FEFO đúng một lần, lô sớm hạn nhất đi trước; trạm bận.
  assert.equal(sim.startProduction(recipe.id, 'kitchen_station_buy_1').success, true);
  const inv = sim.getInventory();
  const bread = inv.find(i => i.productId === 'banh_mi_goi')!;
  assert.equal(bread.quantity, 2);
  assert.equal(bread.lots![0].expiresOnDay, 9, 'Lô hạn 5 được dùng trước (FEFO)');
  assert.equal(inv.find(i => i.productId === 'trung_ga')!.quantity, 2);
  assert.equal(sim.startProduction(recipe.id, 'kitchen_station_buy_1').success, false, 'Trạm đang bận');
  assert.equal(sim.getProductionJobs().length, 1);
  assert.equal(sim.getProductionJobs()[0].inputCost, 10_000 + 2 * 3_000, 'Giá vốn lấy từ lô thực');

  // Save/load giữa chừng giữ nguyên mẻ.
  const saved = sim.exportSaveData('s', 1);
  assert.equal(saved.productionJobs?.length, 1);
  const reloaded = new GameSimulation(structuredClone(saved), map, new InputManager(), {});
  assert.equal(reloaded.getProductionJobs()[0].id, 'job-1');
  assert.equal(reloaded.startProduction(recipe.id, 'kitchen_station_buy_1').reason, 'Trạm đang bận một mẻ khác.');

  // Hoàn tất: đầu ra vào kho với lô, giá vốn bình quân và hạn không dài hơn nguyên liệu.
  for (let i = 0; i < 100 && reloaded.getProductionJobs().length > 0; i++) reloaded.update(1);
  assert.equal(reloaded.getProductionJobs().length, 0, 'Mẻ xong sau thời gian nấu');
  const out = reloaded.getInventory().find(i => i.productId === recipe.outputProductId)!;
  assert.equal(out.quantity, recipe.outputQuantity);
  assert.equal(out.lots![0].unitCost, Math.ceil(16_000 / recipe.outputQuantity));
  assert.ok(out.lots![0].expiresOnDay <= 5, 'Hạn đầu ra bị chặn bởi lô nguyên liệu sớm hạn nhất');
  assert.equal(reloaded.exportSaveData('s', 2).productionJobSequence, 1);

  // Nhân viên bổ sung hàng đang trong ca làm mẻ nhanh hơn ×1,5; không có ca thì tốc độ thường.
  const timeToFinish = (withStaff: boolean): number => {
    const save = structuredClone(DEFAULT_INITIAL_SAVE);
    save.player.level = 25;
    save.worldTime.hour = 10;
    save.inventory = [
      { productId: 'banh_mi_goi', quantity: 1, lots: [{ quantity: 1, expiresOnDay: 9, unitCost: 14_000, provenance: 'known' }] },
      { productId: 'trung_ga', quantity: 2, lots: [{ quantity: 2, expiresOnDay: 12, unitCost: 3_000, provenance: 'known' }] },
    ];
    save.storeLayout.fixtures.push({ id: 'kitchen_station_buy_1', type: 'kitchen_station', tileX: 5, tileY: 5, widthTiles: 2, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: 'Bếp nướng', shopId: 'food_grill' });
    save.staff = withStaff ? [{ id: 'refill-1', name: 'Chị Hai', role: 'refill', speed: 5, accuracy: 5, stamina: 5, dailyWage: 30_000, hiredOnDay: 1, shift: 'full_day' }] : [];
    const s = new GameSimulation(save, map, new InputManager(), {});
    assert.equal(s.startProduction(recipe.id, 'kitchen_station_buy_1').success, true);
    let seconds = 0;
    while (s.getProductionJobs().length > 0 && seconds < 200) { s.update(1); seconds++; }
    return seconds;
  };
  const solo = timeToFinish(false);
  const staffed = timeToFinish(true);
  assert.ok(solo >= recipe.durationSeconds - 1 && solo <= recipe.durationSeconds + 1, `Không nhân viên: ~${recipe.durationSeconds}s (thực tế ${solo}s)`);
  assert.ok(staffed < solo, `Có nhân viên trong ca nấu nhanh hơn (${staffed}s < ${solo}s)`);
  // Quầy nước: máy ép mía, máy xay, quầy nước là trạm chạy được.
  for (const [shopId, recipeId, inputs, outId] of [
    ['sugarcane_press', 'recipe_nuoc_mia', [['mia', 4]], 'nuoc_mia'],
    ['blender', 'recipe_sinh_to', [['trai_cay', 2], ['sua_chua', 2]], 'sinh_to_trai_cay'],
    ['drink_counter', 'recipe_ca_phe_sua', [['ca_phe_bot', 1], ['duong_cat', 1], ['sua_hop', 2]], 'ca_phe_sua_pha'],
  ] as const) {
    const save = structuredClone(DEFAULT_INITIAL_SAVE);
    save.player.level = 25;
    save.inventory = inputs.map(([productId, quantity]) => ({ productId, quantity, lots: [{ quantity, expiresOnDay: 50, unitCost: 2_000, provenance: 'known' as const }] }));
    save.storeLayout.fixtures.push({ id: 'drink_station_1', type: 'kitchen_station', tileX: 5, tileY: 5, widthTiles: 1, heightTiles: 1, rotation: 0, currentStock: 0, maxCapacity: 0, label: shopId, shopId });
    const d = new GameSimulation(save, map, new InputManager(), {});
    assert.ok(d.getStationRecipes('drink_station_1').some(r => r.id === recipeId), `${shopId} có công thức ${recipeId}`);
    assert.equal(d.startProduction(recipeId, 'drink_station_1').success, true, `${shopId} bắt đầu được mẻ`);
    for (let i = 0; i < 100 && d.getProductionJobs().length > 0; i++) d.update(1);
    assert.equal(d.getInventory().find(i => i.productId === outId)?.quantity, RECIPE_MAP[recipeId].outputQuantity, `${shopId} ra thành phẩm`);
  }
}
