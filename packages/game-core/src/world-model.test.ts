import assert from 'node:assert/strict';
import { isSaveGameData, tileIndex, validateSaveGameData } from '@game/shared';
import {
  BUILDINGS, DEFAULT_INITIAL_SAVE, DEFAULT_PLACEMENTS, LAND_PARCELS, MAP_HEIGHT, MAP_ORIGIN_Y, MAP_WIDTH, PARCEL_MAP, PLAY_REGION, WORLD_BOUNDS,
  generateStarterTileMap, normalizePlacements, placementGeometry, placementsProblem, rectContains, rectHeight, rectWidth, validatePlacement, validatePlacements, type BuildingPlacement,
} from '@game/data';

/** Mô hình thế giới mở (OpenSpec `open-world-land-grid`, task 2.6). */
export function runWorldModelTests(): void {
  console.log('\n--- Mô hình thế giới: lưới, lô, vị trí đặt ---');

  assert.equal(rectWidth(WORLD_BOUNDS), 120, 'biên thế giới rộng 120 ô');
  assert.equal(rectHeight(WORLD_BOUNDS), 80, 'biên thế giới cao 80 ô');
  assert.ok(rectContains(WORLD_BOUNDS, PLAY_REGION), 'vùng chơi nằm trong biên thế giới');
  assert.deepEqual([MAP_WIDTH, MAP_HEIGHT, MAP_ORIGIN_Y], [36, 22, -6], 'kích thước bản đồ suy từ vùng chơi đợt 0');

  for (const parcel of LAND_PARCELS) assert.ok(rectContains(PLAY_REGION, parcel.rect), `${parcel.id} nằm trong vùng chơi`);
  for (const placement of DEFAULT_PLACEMENTS) {
    const geo = placementGeometry(placement);
    const parcel = PARCEL_MAP[placement.parcelId];
    assert.ok(rectContains(parcel.rect, { x0: geo.maxBounds.left, x1: geo.maxBounds.right, y0: geo.maxBounds.top, y1: geo.maxBounds.bottom }), `${placement.buildingId} nằm trọn lô ${parcel.id}`);
  }
  assert.deepEqual(BUILDINGS.map(b => b.id), DEFAULT_PLACEMENTS.map(p => p.buildingId), 'thứ tự ưu tiên tòa = thứ tự vị trí đặt');
  assert.equal(validatePlacements(DEFAULT_PLACEMENTS), null, 'vị trí đặt mặc định hợp lệ');

  const withOverride = (patch: Partial<BuildingPlacement>, index = 1): BuildingPlacement[] =>
    DEFAULT_PLACEMENTS.map((p, i) => (i === index ? { ...p, ...patch } : p));
  assert.match(validatePlacements([...DEFAULT_PLACEMENTS, DEFAULT_PLACEMENTS[1]]) ?? '', /^duplicate_building/, 'bắt tòa trùng');
  assert.match(validatePlacements(withOverride({ parcelId: 'lot-moon' })) ?? '', /^unknown_parcel/, 'bắt lô không tồn tại');
  assert.match(validatePlacements(withOverride({ parcelId: 'lot-center' })) ?? '', /^parcel_occupied/, 'bắt hai tòa cùng một lô');
  assert.match(validatePlacements(withOverride({ originX: 3 })) ?? '', /^outside_parcel/, 'bắt gốc làm tòa vượt lô');
  assert.match(validatePlacements(withOverride({ originX: 0.5 })) ?? '', /^invalid_origin/, 'bắt gốc không nguyên');

  const ALL_BUILDINGS = ['building-xoi', 'building-drink', 'building-snack'];
  assert.deepEqual(normalizePlacements(undefined, []).map(p => p.buildingId), ['main'], 'chưa mua tòa phụ nào: chỉ có tiệm chính, lô trống');
  assert.equal(normalizePlacements(undefined, ALL_BUILDINGS), DEFAULT_PLACEMENTS, 'save cũ thiếu trường + đủ ba tòa dùng mặc định');
  assert.deepEqual(normalizePlacements(undefined, ['building-snack']).map(p => p.buildingId), ['main', 'snack'], 'chỉ tòa đã mua có vị trí');
  assert.equal(normalizePlacements(withOverride({ originX: 3 }), ALL_BUILDINGS), DEFAULT_PLACEMENTS, 'vị trí đặt hỏng dùng mặc định');

  // Đặt tòa phụ vào lô tự chọn (Bước 3): quán ăn vặt ở lô tây, lô cũ của tiệm xôi.
  const snackWest = { buildingId: 'snack', parcelId: 'lot-west', originX: 1, originY: 3 };
  const withSnackWest = DEFAULT_PLACEMENTS.map(p => (p.buildingId === 'snack' ? snackWest : p));
  assert.equal(placementsProblem(withSnackWest, ['building-snack']), null, 'quán ăn vặt (6 ô) vừa lô tây (7 ô) khi tiệm xôi chưa mua');
  assert.equal(placementsProblem(withSnackWest, ALL_BUILDINGS), 'parcel_occupied:lot-west', 'lô tây đã có tiệm xôi');
  assert.equal(placementsProblem(DEFAULT_PLACEMENTS.map(p => (p.buildingId === 'drink' ? { ...p, parcelId: 'lot-west', originX: 0 } : p)), ['building-drink']), 'outside_parcel:drink', 'quán nước 10 ô không vừa lô tây 7 ô');
  assert.equal(placementsProblem(DEFAULT_PLACEMENTS.map(p => (p.buildingId === 'snack' ? { ...p, originX: 20 } : p)), ['building-snack']), 'outside_parcel:snack', 'vượt lô');
  assert.equal(placementsProblem(DEFAULT_PLACEMENTS.map(p => (p.buildingId === 'main' ? { ...p, originX: 7 } : p)), []), 'main_fixed', 'tiệm chính cố định');
  assert.equal(placementsProblem(DEFAULT_PLACEMENTS.map(p => (p.buildingId === 'snack' ? { ...p, originY: 2 } : p)), ['building-snack']), 'front_row:snack', 'mặt tiền phải ở hàng y=10');
  // Cây vỉa hè ở x = 5, 19, 25, 28, 34 (hàng y=11): cửa/ô vào cửa không được đặt ngay trước cây.
  const main = [DEFAULT_PLACEMENTS[0]];
  assert.equal(validatePlacement({ buildingId: 'snack', parcelId: 'lot-east-1', originX: 21, originY: 3 }, main), null, 'vị trí mặc định hợp lệ');
  assert.equal(validatePlacement({ buildingId: 'snack', parcelId: 'lot-east-2', originX: 29, originY: 3 }, main), null, 'quán ăn vặt ở lô đông 2');
  assert.equal(validatePlacement({ buildingId: 'snack', parcelId: 'lot-east-2', originX: 29, originY: 3 }, [...main, DEFAULT_PLACEMENTS[2]]), 'parcel_occupied:lot-east-2', 'lô đã có quán nước');
  assert.equal(validatePlacement({ buildingId: 'xoi', parcelId: 'lot-east-2', originX: 27, originY: 3 }, main), 'door_blocked:xoi', 'cửa x=28 ngay trước cây (28,11)');
  assert.equal(validatePlacement({ buildingId: 'xoi', parcelId: 'lot-center', originX: 6, originY: 3 }, main), 'parcel_occupied:lot-center', 'lô của tiệm chính');
  assert.deepEqual(normalizePlacements(withSnackWest, ['building-snack']).map(p => p.parcelId), ['lot-center', 'lot-west'], 'vị trí hợp lệ được dùng');
  assert.equal(normalizePlacements(withSnackWest, ALL_BUILDINGS), DEFAULT_PLACEMENTS, 'vị trí xung đột bị bỏ, về mặc định');
  const mapWest = generateStarterTileMap(['building-snack'], [], withSnackWest);
  assert.deepEqual(mapWest.buildings?.map(b => [b.id, b.bounds?.left, b.entranceTile?.x]), [['main', 6, 9], ['snack', 1, 2]], 'bản đồ có quán ăn vặt ở lô tây, cửa theo gốc mới');
  assert.equal(mapWest.collisionLayer[tileIndex(mapWest, 1, 5)], true, 'tường tây quán ăn vặt (x=1)');
  assert.equal(mapWest.collisionLayer[tileIndex(mapWest, 23, 5)], false, 'lô đông 1 giờ là đất trống đi được');
  assert.equal(mapWest.layers.find(l => l.name === 'walls')!.data[tileIndex(mapWest, 23, 10)], 0, 'không còn vỏ nhà ở lô cũ của quán ăn vặt');

  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  assert.equal(isSaveGameData(save), true, 'save mặc định (không có trường) hợp lệ');
  assert.equal(isSaveGameData({ ...save, storeLayout: { ...save.storeLayout, buildingPlacements: [...DEFAULT_PLACEMENTS] } }), true, 'trường đúng hình dạng hợp lệ');
  assert.equal(isSaveGameData({ ...save, storeLayout: { ...save.storeLayout, buildingPlacements: [{ buildingId: 'main', parcelId: '', originX: 6, originY: 3 }] } }), false, 'lô rỗng bị coi là save hỏng');
  assert.equal(isSaveGameData({ ...save, storeLayout: { ...save.storeLayout, buildingPlacements: [{ buildingId: 'main', parcelId: 'lot-center', originX: 6.5, originY: 3 }] } }), false, 'gốc lẻ bị coi là save hỏng');
  assert.equal(isSaveGameData({ ...save, storeLayout: { ...save.storeLayout, buildingPlacements: 'x' } }), false, 'không phải mảng bị coi là save hỏng');
  const legacy = { ...structuredClone(save), schemaVersion: 3 };
  const migrated = validateSaveGameData(legacy);
  assert.equal(migrated.valid, true, 'save schema 3 không có trường vẫn nạp được');
  const allPlots = ['east-wing-a', 'east-wing-b', 'building-xoi', 'building-drink', 'building-snack'];
  assert.deepEqual(generateStarterTileMap(allPlots, [], migrated.data?.storeLayout.buildingPlacements), generateStarterTileMap(allPlots), 'save cũ dựng ra đúng bản đồ mặc định');
  assert.deepEqual(generateStarterTileMap(allPlots, [], withSnackWest), generateStarterTileMap(allPlots), 'vị trí xung đột bị bỏ, không làm đổi bản đồ');
  console.log('  ✓ biên 120×80, vùng chơi, 4 lô, vị trí đặt mặc định, kiểm hợp lệ, trường save và save cũ');
}
