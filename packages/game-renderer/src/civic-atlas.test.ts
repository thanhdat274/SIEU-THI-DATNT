import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAtlas, parseAtlasIndex } from './sprite-atlas-parse';
import { CIVIC_DEFS, buildingTypeOf } from '@game/data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const spritesDir = path.resolve(__dirname, '../../../apps/web/public/assets/sprites');

// 1. Kiểm tra index.json có chứa 'civic/civic.json'
const indexRaw = JSON.parse(fs.readFileSync(path.join(spritesDir, 'index.json'), 'utf8'));
const parsedIndex = parseAtlasIndex(indexRaw);
assert.ok(parsedIndex, 'index.json hợp lệ');
assert.ok(parsedIndex.atlases.includes('civic/civic.json'), 'index.json chứa civic/civic.json');

// 2. Kiểm tra civic.json và file ảnh civic.png
const civicJsonPath = path.join(spritesDir, 'civic/civic.json');
assert.ok(fs.existsSync(civicJsonPath), 'civic.json tồn tại');
const civicPngPath = path.join(spritesDir, 'civic/civic.png');
assert.ok(fs.existsSync(civicPngPath), 'civic.png tồn tại');

const civicRaw = JSON.parse(fs.readFileSync(civicJsonPath, 'utf8'));
const atlas = parseAtlas(civicRaw);
assert.ok(atlas, 'parseAtlas(civicRaw) thành công');
assert.equal(atlas.resolution, 1, 'Atlas resolution bằng 1');

// 3. Kiểm tra đủ 8 mặt tiền công trình (ngày + đêm) với kích thước footprint chuẩn
const expectedCivicBuildings: Record<string, { w: number; h: number }> = {
  civic_park: { w: 192, h: 192 },
  civic_park_night: { w: 192, h: 192 },
  civic_clinic: { w: 192, h: 256 },
  civic_clinic_night: { w: 192, h: 256 },
  civic_ward_police: { w: 192, h: 256 },
  civic_ward_police_night: { w: 192, h: 256 },
  civic_primary_school: { w: 256, h: 256 },
  civic_primary_school_night: { w: 256, h: 256 },
};

for (const [key, size] of Object.entries(expectedCivicBuildings)) {
  const frame = atlas.frames.get(key);
  assert.ok(frame, `Khung ${key} có trong atlas`);
  assert.equal(frame.w, size.w, `${key} width = ${size.w}`);
  assert.equal(frame.h, size.h, `${key} height = ${size.h}`);
}

// 4. Kiểm tra đủ 48 khung NPC nghiêng ngang (looks 6..9, left/right, idle_0..1, walk_0..3, size 32×48)
const npcLooks = [6, 7, 8, 9];
const npcDirs = ['left', 'right'];
const npcActions = ['idle_0', 'idle_1', 'walk_0', 'walk_1', 'walk_2', 'walk_3'];

let npcCount = 0;
for (const look of npcLooks) {
  for (const dir of npcDirs) {
    for (const act of npcActions) {
      const key = `npc_${look}_${dir}_${act}`;
      const frame = atlas.frames.get(key);
      assert.ok(frame, `NPC frame ${key} có trong atlas`);
      assert.equal(frame.w, 32, `${key} width = 32`);
      assert.equal(frame.h, 48, `${key} height = 48`);
      npcCount++;
    }
  }
}
assert.equal(npcCount, 48, 'Đủ 48 khung NPC nghiêng ngang');
assert.equal(atlas.frames.size, 56, 'Tổng cộng đúng 56 khung hình trong civic atlas');

// 5. Kiểm tra tính khớp giữa CIVIC_DEFS và khóa atlas
for (const def of CIVIC_DEFS) {
  const dayKey = `civic_${def.buildingTypeId}`;
  const nightKey = `civic_${def.buildingTypeId}_night`;
  assert.ok(atlas.frames.has(dayKey), `Có khóa ngày ${dayKey} cho ${def.buildingTypeId}`);
  assert.ok(atlas.frames.has(nightKey), `Có khóa đêm ${nightKey} cho ${def.buildingTypeId}`);
}

// 6. Khớp cửa: từ kích thước sprite suy ra hai ô cửa ở giữa đáy, so với doorTiles/entranceTile của mẫu tòa
const TILE = 32;
for (const def of CIVIC_DEFS) {
  const typeDef = buildingTypeOf(def.buildingTypeId);
  assert.ok(typeDef, `Có loại tòa ${def.buildingTypeId}`);
  const tpl = typeDef.template;
  for (const key of [`civic_${def.buildingTypeId}`, `civic_${def.buildingTypeId}_night`]) {
    const frame: { w: number; h: number } = atlas.frames.get(key)!;
    assert.equal(frame.w % TILE, 0, `${key} rộng chia hết ô`);
    assert.equal(frame.h % TILE, 0, `${key} cao chia hết ô`);
    const wTiles = frame.w / TILE;
    const hTiles = frame.h / TILE;
    assert.equal(wTiles, tpl.width, `${key} rộng ${wTiles} ô = footprint ${tpl.width}`);
    assert.equal(hTiles, tpl.height, `${key} cao ${hTiles} ô = footprint ${tpl.height}`);
    const mid = Math.floor(wTiles / 2);
    const spriteDoors = [{ x: mid - 1, y: hTiles - 1 }, { x: mid, y: hTiles - 1 }];
    assert.deepEqual([...tpl.doorTiles].sort((a, b) => a.x - b.x), spriteDoors, `${key}: doorTiles trùng hai ô giữa đáy sprite`);
    // Tâm hai ô cửa (px) trùng tâm ngang sprite
    assert.equal((spriteDoors[0].x + 1) * TILE, frame.w / 2, `${key}: cửa nằm giữa sprite`);
    assert.deepEqual(tpl.entranceTile, { x: mid - 1, y: hTiles }, `${key}: entranceTile ngay dưới ô cửa trái`);
  }
}

console.log('PASS civic-atlas: Tất cả 56 khóa atlas, kích thước footprint và day/night mapping và khớp cửa doorTiles đều hợp lệ');
