import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, LAND_PLOTS, SNACK_PLOT_ID, generateStarterTileMap, placementOriginY, resolveParcel, validatePlacement } from '@game/data';
import { GameSimulation } from './simulation';
import { InputManager } from './input';
import { placementOptions } from './store-layout';
import { findPath } from './pathfinding';

/** open-world-new-parcel-buildings 1.2/1.3/2.1: đặt tòa phụ lên lô đợt mới đã mua. */
export function runNewParcelPlacementTests(): void {
  console.log('\n--- Đặt tòa lên lô đợt khai hoang mới ---');
  assert.equal(resolveParcel('w1-corner')?.wave, 1, 'resolveParcel gắn chỉ số đợt');
  assert.equal(resolveParcel('lot-west')?.wave, 0, 'resolveParcel vẫn trả lô W0');
  assert.equal(resolveParcel('khong-co'), undefined, 'id lạ → undefined');

  // validatePlacement: quán nước 10×8 trong w1-corner (x 42..51, y 3..10).
  const drink = (originX: number, parcelId = 'w1-corner') => ({ buildingId: 'drink', parcelId, originX, originY: 3 });
  assert.equal(validatePlacement(drink(42), [], []), 'parcel_not_owned', 'lô chưa mua');
  assert.equal(validatePlacement(drink(42), [], ['w1-corner']), null, 'đã mua + vừa lô');
  assert.ok(String(validatePlacement(drink(43), [], ['w1-corner'])).startsWith('outside_parcel'), 'vượt mép lô');
  assert.ok(String(validatePlacement({ buildingId: 'drink', parcelId: 'w1-corner', originX: 42, originY: 5 }, [], ['w1-corner'])).startsWith('front_row'), 'sai hàng mặt tiền');
  assert.ok(String(validatePlacement({ buildingId: 'drink', parcelId: 'khong-co', originX: 0, originY: 3 }, [], [])).startsWith('unknown_parcel'), 'lô không tồn tại');
  assert.ok(String(validatePlacement({ buildingId: 'xoi', parcelId: 'w3-2', originX: 71, originY: 3 }, [], ['w3-2'])).startsWith('outside_parcel'), 'w3-2 chỉ rộng 6: tiệm xôi 7 không vừa');
  assert.equal(validatePlacement({ buildingId: 'snack', parcelId: 'w3-2', originX: 71, originY: 3 }, [], ['w3-2']), null, 'quán ăn vặt 6 vừa w3-2');

  // W2 (đường nam): mặt tiền y=23 → gốc y=16; sai gốc y bị chặn `front_row`.
  assert.equal(placementOriginY('snack', 'w2-2'), 16, 'gốc y của tòa trên lô đường nam');
  assert.equal(placementOriginY('xoi', 'lot-west'), 3, 'gốc y của tòa trên lô W0 không đổi');
  assert.equal(validatePlacement({ buildingId: 'snack', parcelId: 'w2-2', originX: 10, originY: 16 }, [], ['w2-2']), null, 'quán ăn vặt 6×8 vừa w2-2 (8 rộng)');
  assert.equal(validatePlacement({ buildingId: 'drink', parcelId: 'w2-1', originX: 0, originY: 16 }, [], ['w2-1']), null, 'quán nước 10×8 vừa w2-1 (10 rộng)');
  assert.ok(String(validatePlacement({ buildingId: 'snack', parcelId: 'w2-2', originX: 10, originY: 3 }, [], ['w2-2'])).startsWith('front_row'), 'gốc y của W0 trên lô đường nam → front_row');

  // placementOptions: lô đợt mới chỉ xuất hiện khi đã mua.
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  assert.ok(!placementOptions(save, 'drink').some(o => o.parcelId === 'w1-corner'), 'chưa mua → không có trong lựa chọn');
  save.storeLayout.ownedParcelIds = [...(save.storeLayout.ownedParcelIds ?? []), 'w1-corner'];
  const opt = placementOptions(save, 'drink').find(o => o.parcelId === 'w1-corner');
  assert.deepEqual(opt?.originXs, [42], 'đã mua → quán nước đặt được duy nhất ở gốc x=42');

  // Đầu-cuối trong mô phỏng: mở W1, mua lô, mở quán nước ở đó.
  const s = structuredClone(DEFAULT_INITIAL_SAVE);
  s.player.level = 60;
  s.player.money = 50_000_000;
  s.worldTime.isStoreOpen = false;
  const sim = new GameSimulation(s, generateStarterTileMap(), new InputManager(), {});
  const day = sim.getTime().day;
  assert.ok(sim.reclaimWave('w1').success);
  (sim as unknown as { finishReclaimedWaves(day: number): void }).finishReclaimedWaves(day + 2);
  const drinkPlot = LAND_PLOTS.find(plot => plot.buildingId === 'drink')!;
  assert.equal(sim.purchaseLand(drinkPlot.id, { parcelId: 'w1-corner', originX: 42 }).error, 'parcel_not_owned', 'chưa mua lô → chặn');
  assert.ok(sim.buyParcel('w1-corner').success, 'mua lô góc');
  const placed = sim.purchaseLand(drinkPlot.id, { parcelId: 'w1-corner', originX: 42 });
  assert.equal(placed.error, undefined, `đặt quán nước lên lô mới: ${placed.error}`);
  const saved = sim.exportSaveData();
  const rec = saved.storeLayout.buildingPlacements?.find(p => p.buildingId === 'drink');
  assert.equal(rec?.parcelId, 'w1-corner', 'save ghi tòa trên lô mới');
  const info = sim.getTileMap().buildings?.find(b => b.id === 'drink');
  assert.ok(info?.bounds && info.bounds.left === 42 && info.bounds.right === 51 && info.bounds.bottom === 10, 'bản đồ dựng tòa đúng vị trí trên lô');
  // Đường nam (hướng 2): mở W2, mua w2-2, mở quán ăn vặt (6×8) ở đó; khách đi từ vỉa hè W0 (y=12) qua đường tới cửa (y=24).
  const day2 = sim.getTime().day;
  assert.ok(sim.reclaimWave('w2').success, 'mở W2');
  (sim as unknown as { finishReclaimedWaves(day: number): void }).finishReclaimedWaves(day2 + 2);
  assert.ok(sim.buyParcel('w2-2').success, 'mua w2-2');
  const south = sim.purchaseLand(SNACK_PLOT_ID, { parcelId: 'w2-2', originX: 10 });
  assert.equal(south.error, undefined, `đặt quán ăn vặt lên lô đường nam: ${south.error}`);
  const snack = sim.getTileMap().buildings?.find(b => b.id === 'snack');
  assert.ok(snack?.bounds && snack.bounds.top === 16 && snack.bounds.bottom === 23, 'tòa đường nam cao 8 hàng y 16..23');
  const entrance = snack!.entranceTile ?? { x: 12, y: 24 };
  const route = findPath(sim.getTileMap(), (sim as unknown as { collisionSystem: never }).collisionSystem, { x: 1, y: 12 }, entrance);
  assert.ok(route.length > 0, 'có đường đi từ vỉa hè W0 tới cửa tòa đường nam (hàng biên bản đồ không chặn hàng cửa y=24)');
  console.log('  ✓ validatePlacement/placementOptions/purchaseLand chạy trên lô W1 đã mua; bản đồ dựng tòa');
}
