import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUILDINGS, DRINK_PLOT_ID, MAP_HEIGHT, MAP_ORIGIN_Y, MAP_WIDTH, SNACK_PLOT_ID, STALLS, XOI_PLOT_ID, generateStarterTileMap, inMainExpansionZone } from '@game/data';
import { computeWorldGolden, validPlotCombos, type WorldGolden } from './world-golden';

/** So khớp tuyệt đối với golden đã ghi trước refactor thế giới mở; báo đúng khóa lệch để dễ tìm. */
export function runWorldGoldenTests(): void {
  console.log('\n--- Golden thế giới (open-world-land-grid) ---');
  const file = join(dirname(fileURLToPath(import.meta.url)), '__golden__', 'world-golden.json');
  const expected = JSON.parse(readFileSync(file, 'utf8')) as WorldGolden;
  const actual = computeWorldGolden();

  // Bước 3 (`open-world-building-relocation`): tòa chưa mua không còn vỏ nhà. Tổ hợp đã mua đủ ba tòa phụ phải khớp tuyệt đối golden Bước 1;
  // tổ hợp còn lại phải bằng bản đồ "đủ ba tòa" cùng đất/quầy ở mọi ô ngoài các tòa chưa mua, và chỉ khác ở đó bằng đất trống (không tường, không sàn tòa).
  const mapDiff = Object.keys({ ...expected.maps, ...actual.maps }).filter(key => expected.maps[key] !== actual.maps[key]);
  const threeBuildings = [XOI_PLOT_ID, DRINK_PLOT_ID, SNACK_PLOT_ID];
  const allStalls = STALLS.map(stall => stall.id);
  const unexpected: string[] = [];
  for (const key of mapDiff) {
    const combo = key.replace('|stalls', '').split('+').filter(id => id && id !== '(none)');
    if (threeBuildings.every(id => combo.includes(id))) { unexpected.push(key); continue; }
    const stalls = key.endsWith('|stalls') ? allStalls : [];
    const withAll = [...new Set([...combo, ...threeBuildings])];
    const map = generateStarterTileMap(combo, stalls);
    const reference = generateStarterTileMap(withAll, stalls);
    const ground = (m: typeof map) => m.layers.find(layer => layer.name === 'ground')!.data;
    const walls = (m: typeof map) => m.layers.find(layer => layer.name === 'walls')!.data;
    const unbought = BUILDINGS.filter(b => b.plotId && !combo.includes(b.plotId));
    const wings = ['east-wing-a', 'east-wing-b'].filter((id, i, all) => combo.includes(id) && all.slice(0, i).every(prev => combo.includes(prev))).length;
    const owned = [...BUILDINGS.filter(b => b.id !== 'main' && combo.includes(b.plotId!)).map(b => b.maxBounds), { left: 6, right: 13 + 4 * wings, top: -3, bottom: 10 }];
    const inBox = (box: { left: number; right: number; top: number; bottom: number }, x: number, y: number) => x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
    for (let row = 0; row < MAP_HEIGHT; row++) for (let x = 0; x < MAP_WIDTH; x++) {
      const y = MAP_ORIGIN_Y + row, i = row * MAP_WIDTH + x;
      const inUnbought = unbought.some(b => inBox(b.maxBounds, x, y)) && !owned.some(box => inBox(box, x, y));
      if (inUnbought) {
        if (walls(map)[i] === 4 || ground(map)[i] === 3) unexpected.push(`${key}: (${x},${y}) còn vỏ nhà của tòa chưa mua`);
      } else if (ground(map)[i] !== ground(reference)[i] || walls(map)[i] !== walls(reference)[i] || map.collisionLayer[i] !== reference.collisionLayer[i]) {
        unexpected.push(`${key}: (${x},${y}) khác bản đồ đủ ba tòa ngoài tòa chưa mua`);
      }
      if (unexpected.length > 6) break;
    }
  }
  assert.deepEqual(unexpected, [], `Bản đồ lệch golden: ${unexpected.slice(0, 6).join('; ')}`);
  assert.ok(Object.keys(expected.maps).filter(key => threeBuildings.every(id => key.includes(id))).every(key => !mapDiff.includes(key)), 'mọi tổ hợp đủ ba tòa khớp golden Bước 1');
  assert.deepEqual(actual.buildingAt, expected.buildingAt, 'buildingAt lệch golden');
  // Thay đổi có chủ đích của Bước 2 (`open-world-main-expansion`): vùng mở rộng của tiệm chính nay thuộc `main` trong `buildingOfTiles`.
  // Mọi ô khác phải giữ đúng golden Bước 1; chỉ ô trong `inMainExpansionZone` đang '.' được đổi thành 'm'.
  const expectedOfTiles = expected.buildingOfTiles.map((row, rowIndex) =>
    [...row].map((cell, x) => (cell === '.' && inMainExpansionZone(x, MAP_ORIGIN_Y + rowIndex) ? 'm' : cell)).join(''));
  assert.deepEqual(actual.buildingOfTiles, expectedOfTiles, 'buildingOfTiles lệch golden');
  assert.deepEqual(actual.paths, expected.paths, 'Đường đi khách lệch golden');
  if (actual.geometry !== expected.geometry) {
    const dump = actual.geometryDump as Record<string, unknown>;
    const old = expected.geometryDump as Record<string, unknown>;
    const keys = Object.keys({ ...dump, ...old }).filter(key => JSON.stringify(dump[key]) !== JSON.stringify(old[key]));
    assert.fail(`Hình học suy ra lệch golden ở: ${keys.join(', ')}`);
  }
  assert.deepEqual(actual.simulation, expected.simulation, 'Mô phỏng 3 ngày lệch golden');
  console.log(`  ✓ ${Object.keys(actual.maps).length} bản đồ, lưới tra tòa, ${Object.keys(actual.paths).length} đường đi, hình học, mô phỏng 3 ngày khớp golden`);
}
