import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, DEFAULT_PLACEMENTS, generateStarterTileMap, placementsProblem, resolvePlacements, validatePlacement, type BuildingPlacement } from '@game/data';
import { GameSimulation } from './simulation';
import { InputManager } from './input';

/**
 * QA Bước D2 (lỗi B): đồn công an (21..26, lô lot-east-1) và trường tiểu học (26..33, lô lot-east-2) từng đặt được chồng cột 26
 * vì luật "chỉ được chung một cột tường" của tòa vẽ code. Hai civic (sprite phủ kín footprint) không được chung cột với nhau.
 */
export function runCivicPlacementOverlapTests(): void {
  console.log('\n--- Civic không đặt chồng cột tường (QA D2 lỗi B) ---');
  const ward = (originX = 21): BuildingPlacement => ({ buildingId: 'ward_police-1', parcelId: 'lot-east-1', originX, originY: 3, typeId: 'ward_police' } as BuildingPlacement);
  const school = (originX = 26): BuildingPlacement => ({ buildingId: 'primary_school-1', parcelId: 'lot-east-2', originX, originY: 3, typeId: 'primary_school' } as BuildingPlacement);
  const main = DEFAULT_PLACEMENTS.find(p => p.buildingId === 'main')!;

  // Ca thật của QA: chồng cột 26 theo cả hai thứ tự đặt.
  assert.match(String(validatePlacement(ward(), [main, school()])), /^overlap:ward_police-1:primary_school-1/, 'đồn 21..26 chồng trường 26..33 → chặn');
  assert.match(String(validatePlacement(school(), [main, ward()])), /^overlap:primary_school-1:ward_police-1/, 'trường 26..33 chồng đồn 21..26 → chặn');
  // Civic cạnh tòa vẽ code vẫn được chung một cột tường (lô lot-east-1 rộng đúng 6 cột, cột 21 là tường đông tiệm chính).
  const snack = DEFAULT_PLACEMENTS.find(p => p.buildingId === 'snack')!;
  assert.equal(validatePlacement(ward(), [main]), null, 'đồn 21..26 chung cột tường với tiệm chính 6..21 hợp lệ');
  assert.equal(validatePlacement(school(), [main, snack]), null, 'trường chung cột với quán ăn vặt (vẽ code) hợp lệ');

  // Sát nhau nhưng không chồng (0 cột trống): đồn 21..26 + trường 27..34 vẫn đặt được.
  assert.equal(validatePlacement(school(27), [main, ward()]), null, 'trường 27..34 cạnh đồn 21..26 hợp lệ');
  assert.equal(validatePlacement(ward(), [main, school(27)]), null, 'đồn cạnh trường 27..34 hợp lệ');

  // Mọi loại tòa đi qua cùng hàm: tòa vẽ code vẫn được chung đúng một cột tường như bố cục mặc định.
  const drink = DEFAULT_PLACEMENTS.find(p => p.buildingId === 'drink')!;
  const xoi = DEFAULT_PLACEMENTS.find(p => p.buildingId === 'xoi')!;
  assert.equal(validatePlacement(drink, [main, snack]), null, 'quán nước 26..35 chung cột với quán ăn vặt 21..26 (mặc định) vẫn hợp lệ');
  assert.equal(validatePlacement(snack, [main, drink]), null, 'quán ăn vặt chung cột với quán nước vẫn hợp lệ');
  assert.equal(validatePlacement(xoi, [main]), null, 'tiệm xôi 0..6 chung cột tường với tiệm chính 6..21 vẫn hợp lệ');
  assert.match(String(validatePlacement({ ...drink, originX: 25 }, [main, snack])), /^(overlap|outside_parcel)/, 'tòa vẽ code chồng hơn một cột vẫn bị chặn');

  // Save cũ đã lỡ chồng (đặt trước khi sửa): vẫn nạp được, không xóa tòa — chỉ chặn đặt MỚI.
  const legacy = [main, ward(), school()];
  assert.equal(placementsProblem(legacy, [], ['lot-east-1', 'lot-east-2']), null, 'placementsProblem chấp nhận save cũ có civic chồng cột');
  const resolved = resolvePlacements(legacy, []);
  assert.ok(resolved.some(p => p.buildingId === 'ward_police-1' && p.originX === 21) && resolved.some(p => p.buildingId === 'primary_school-1' && p.originX === 26), 'resolvePlacements giữ nguyên vị trí hai tòa civic cũ');
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.storeLayout.buildingPlacements = structuredClone(legacy);
  const sim = new GameSimulation(save, generateStarterTileMap(save.storeLayout.unlockedPlotIds ?? [], [], save.storeLayout.buildingPlacements), new InputManager());
  const loaded = sim.exportSaveData().storeLayout.buildingPlacements ?? [];
  assert.ok(loaded.some(p => p.buildingId === 'ward_police-1' && p.originX === 21), 'nạp save: đồn còn nguyên');
  assert.ok(loaded.some(p => p.buildingId === 'primary_school-1' && p.originX === 26), 'nạp save: trường còn nguyên');
  console.log('PASS civic placement overlap: chặn chồng cột khi đặt mới, tòa sát nhau hợp lệ, save cũ vẫn nạp');
  runCivicOriginPickTests();
}

/**
 * QA sau sửa D2: nút xây chọn gốc với danh sách tòa rỗng → lô `lot-east-2` luôn ra x=26 (chồng cột với civic ở `lot-east-1`),
 * và trường đặt ở x=26 khóa vĩnh viễn `lot-east-1` trong khi lô đó vẫn được báo là lô trống.
 */
function runCivicOriginPickTests(): void {
  console.log('\n--- Civic: chọn gốc theo tòa đang có + lô trống theo loại (QA sau sửa D2) ---');
  const fresh = () => {
    const save = structuredClone(DEFAULT_INITIAL_SAVE);
    save.player.money = 1e9;
    save.player.level = 30;
    const sim = new GameSimulation(save, generateStarterTileMap(save.storeLayout.unlockedPlotIds ?? [], [], save.storeLayout.buildingPlacements), new InputManager());
    if (sim.getTime().isStoreOpen) sim.getClock().toggleStoreStatus();
    return sim;
  };
  const build = (sim: GameSimulation, typeId: string, parcelId: string) => {
    const origin = sim.findOpenOrigin(typeId, parcelId);
    return origin ? sim.openBuilding(typeId, parcelId, origin.originX, origin.originY).success : false;
  };
  const W0 = ['lot-west', 'lot-east-1', 'lot-east-2'];

  // (a) Đồn ở lot-east-1 (21..26) rồi trường ở lot-east-2: gốc phải là 27, không phải 26.
  const a = fresh();
  assert.ok(build(a, 'ward_police', 'lot-east-1'), 'đặt đồn ở lot-east-1');
  assert.equal(a.findOpenOrigin('primary_school', 'lot-east-2')?.originX, 27, 'trường cạnh đồn chọn gốc 27');
  assert.ok(build(a, 'primary_school', 'lot-east-2'), 'xây trường bằng gốc đã chọn thành công');

  // (b) Trường xây trước trên lô trống: chọn gốc không chiếm cột ranh lô (27), để lot-east-1 vẫn đặt được civic 6 ô.
  const b = fresh();
  assert.equal(b.findOpenOrigin('primary_school', 'lot-east-2')?.originX, 27, 'trường trên lô trống chọn gốc chừa cột ranh 26');
  assert.ok(build(b, 'primary_school', 'lot-east-2'));
  assert.ok(b.getBuildableParcelIds('clinic').includes('lot-east-1'), 'sau trường 27..34, lot-east-1 còn đặt được trạm y tế');

  // (c) Save cũ đã có trường ở x=26: lot-east-1 không còn gốc cho civic → không được báo là lô trống cho civic.
  const c = fresh();
  assert.ok(c.openBuilding('primary_school', 'lot-east-2', 26, 3).success, 'gốc 26 vẫn hợp lệ khi lô kề trống');
  assert.equal(c.findOpenOrigin('clinic', 'lot-east-1'), null, 'không còn gốc trạm y tế ở lot-east-1');
  assert.ok(!c.getBuildableParcelIds('clinic').includes('lot-east-1'), 'lot-east-1 không phải lô trống cho trạm y tế');

  // (d) Mọi thứ tự xây 4 loại civic qua đường nút (lô trống theo loại + gốc tự chọn): luôn đạt 3 công trình trên W0.
  const types = ['park', 'clinic', 'ward_police', 'primary_school'];
  const perms = (xs: string[]): string[][] => xs.length ? xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map(r => [x, ...r])) : [[]];
  for (const order of perms(types)) {
    const sim = fresh();
    let placed = 0;
    for (const typeId of order) {
      const lot = sim.getBuildableParcelIds(typeId).find(id => W0.includes(id));
      if (lot && build(sim, typeId, lot)) placed++;
      else assert.ok(!lot, `${order.join('>')}: ${typeId} có lô trống ${lot} nhưng xây thất bại`);
    }
    assert.equal(placed, 3, `${order.join('>')}: đặt được ${placed}/3 civic trên W0`);
  }
  console.log('PASS civic origin pick: gốc xét tòa đang có, chừa cột ranh lô, lô trống theo loại; 24 thứ tự đều đạt 3 civic W0');
}
