import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { BUILDING_VISUALS, buildingTypeOfInstance } from '@game/data';
import type { GameTileMap } from '@game/shared';
import { EXTERIOR_BUILDERS, type ExteriorContext } from './building-registry';
import { buildGroceryExterior, splitFacadeRuns, windowOffsets } from './grocery-exterior';
import { buildCityMap } from './map-builder';
import { SCALE_TARGETS } from './scale-spec';
import { DETAIL_BUDGET, KIT_COLORS, PALETTE_HEXES } from './style-spec';

const K = SCALE_TARGETS.kit;

// Node không có OffscreenCanvas nên DynamicTexture (biển có chữ) cần canvas giả tối thiểu; gỡ sau khi test xong.
const globalWithCanvas = globalThis as unknown as { OffscreenCanvas?: unknown };
const originalOffscreenCanvas = globalWithCanvas.OffscreenCanvas;
globalWithCanvas.OffscreenCanvas = class FakeCanvas {
  constructor(public width: number, public height: number) {}
  getContext(): unknown {
    return new Proxy({}, {
      get: (_target, prop) => (prop === 'measureText' ? () => ({ width: 1 }) : prop === 'canvas' ? this : () => undefined),
      set: () => true,
    });
  }
};

const engine = new NullEngine();
const scene = new Scene(engine);

// Registry: chỉ tạp hóa chính có builder riêng; các loại khác đi đường dựng chung.
assert.deepEqual(Object.keys(EXTERIOR_BUILDERS), ['grocery_main']);
assert.equal(buildingTypeOfInstance('main')?.typeId, 'grocery_main');

// Hàm chia hàng mặt tiền và vị trí cửa sổ.
assert.deepEqual(splitFacadeRuns(6, 21, new Set([9, 10])), [
  { start: 6, len: 3, isDoor: false }, { start: 9, len: 2, isDoor: true }, { start: 11, len: 11, isDoor: false },
]);
assert.deepEqual(splitFacadeRuns(0, 2, new Set()), [{ start: 0, len: 3, isDoor: false }], 'không cửa: một đoạn tường');
assert.deepEqual(windowOffsets(1), []); assert.deepEqual(windowOffsets(2), []); assert.deepEqual(windowOffsets(3), [1]);
assert.deepEqual(windowOffsets(11), [1, 3, 5, 7, 9], 'cách một ô, chừa ô đầu và ô cuối làm trụ tường');

const makeSign: ExteriorContext['makeSign'] = (_text, width) => {
  const mesh = CreateBox('sign_test', { width, height: 0.75, depth: 0.01 }, scene);
  const material = new StandardMaterial('sign_test_mat', scene);
  mesh.material = material;
  return { mesh, material, height: 0.75 };
};
const ctx = (over: Partial<ExteriorContext> = {}): ExteriorContext => ({
  scene, buildingId: 'main', visual: BUILDING_VISUALS.grocery_main, name: 'Tiệm tạp hóa',
  x0: 6, x1: 21, z0: 3, z1: 10, front: 11, doorXs: new Set([9, 10]), awning: { x0: 7, x1: 11 }, groundY: 0.08, makeSign, ...over,
});

/** Hộp bao xấp xỉ (bỏ qua xoay nhẹ của mái hiên) của mọi instance của một mesh. */
function instanceBounds(mesh: Mesh): { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number } {
  const b = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const m of mesh.thinInstanceGetWorldMatrices()) {
    const t = m.getTranslation();
    const s = new Vector3();
    m.decompose(s);
    b.minX = Math.min(b.minX, t.x - s.x / 2); b.maxX = Math.max(b.maxX, t.x + s.x / 2);
    b.minY = Math.min(b.minY, t.y - s.y / 2); b.maxY = Math.max(b.maxY, t.y + s.y / 2);
    b.minZ = Math.min(b.minZ, t.z - s.z / 2); b.maxZ = Math.max(b.maxZ, t.z + s.z / 2);
  }
  return b;
}

// Vỏ ngoài tiệm chính (16 ô, cửa đôi ở ô 9–10, mái hiên ô 7–11).
{
  const ex = buildGroceryExterior(ctx());
  assert.equal(ex.drawItems, ex.meshes.length, 'số mục vẽ = số mesh');
  assert.ok(ex.drawItems <= DETAIL_BUDGET.buildingDrawItems, `ngân sách ${DETAIL_BUDGET.buildingDrawItems}, hiện ${ex.drawItems}`);
  for (const m of ex.meshes) assert.equal((m.metadata as { buildingId?: string } | null)?.buildingId, 'main', `${m.name}: thiếu buildingId để bấm chọn tòa`);

  // Mái và mặt tiền: vật liệu riêng, không trùng nhau; kính không nằm trong danh sách mờ (sẽ bị ghi đè độ đục).
  const roofSet = new Set(ex.roofMaterials);
  assert.ok(ex.roofMaterials.length > 0 && ex.roofMeshes.length === ex.roofMaterials.length);
  assert.ok(ex.facadeMaterials.every((m) => !roofSet.has(m)), 'vật liệu mặt tiền và mái không trùng');
  assert.equal(new Set(ex.facadeMaterials).size, ex.facadeMaterials.length, 'vật liệu mặt tiền không lặp');
  assert.ok(ex.facadeMaterials.every((m) => m.alpha === 1), 'mọi vật liệu mặt tiền đục (kính nằm ngoài danh sách mờ)');
  assert.ok(ex.roofMeshes.every((m) => ex.meshes.includes(m)) && ex.facadeMeshes.every((m) => ex.meshes.includes(m)));
  assert.ok(ex.nightFacadeMaterials.length === 2 && ex.nightFacadeMaterials.every((m) => ex.facadeMaterials.includes(m)), 'ánh ấm ban đêm chỉ cho hai màu tường');

  // Màu: mọi vật liệu (trừ biển có chữ) lấy từ bảng màu.
  for (const m of [...ex.facadeMaterials.slice(0, -1), ...ex.roofMaterials]) {
    assert.ok(PALETTE_HEXES.has(m.diffuseColor.toHexString().toLowerCase()), `${m.name}: ${m.diffuseColor.toHexString()} không thuộc bảng màu`);
  }

  // Cửa sổ: 1 trên đoạn trái (3 ô), 5 trên đoạn phải (11 ô), không rơi vào ô cửa; cộng 2 bóng đèn rọi biển.
  const glow = ex.windowGlowMeshes;
  assert.equal(glow.length, 1, 'mọi ô sáng gom một mesh');
  assert.equal(glow[0].isVisible, false, 'ô sáng tắt sẵn ban ngày');
  const mats = glow[0].thinInstanceGetWorldMatrices().map((m) => m.getTranslation());
  const windows = mats.filter((t) => t.z < 11.1).map((t) => t.x).sort((a, b) => a - b);
  assert.deepEqual(windows, [7.5, 12.5, 14.5, 16.5, 18.5, 20.5]);
  assert.equal(mats.length, windows.length + 2, 'hai bóng đèn rọi biển');
  assert.ok(windows.every((x) => x < 9 || x > 11), 'cửa sổ không đè lên cửa');

  // Hình học: mọi thứ nằm trong vùng mặt tiền hợp lý (mặt tiền, mái hiên, đồ trưng vỉa hè, mái); không chìm dưới sàn.
  for (const m of ex.meshes) {
    if (m.thinInstanceCount === 0) continue;
    const b = instanceBounds(m);
    assert.ok(b.minX >= 6 - 0.3 && b.maxX <= 22 + 0.3, `${m.name}: ngang [${b.minX.toFixed(2)}, ${b.maxX.toFixed(2)}] ngoài tòa`);
    const isRoof = ex.roofMeshes.includes(m);
    // Mặt tiền và mái bắt đầu từ mặt sàn tòa (y = 0); đồ trưng đặt trên vỉa hè nên không thấp hơn mặt vỉa hè (0,08).
    const floorY = isRoof || ex.facadeMeshes.includes(m) ? 0 : 0.08;
    assert.ok(b.minY >= floorY - 1e-6, `${m.name}: chìm dưới sàn (y ${b.minY.toFixed(3)} < ${floorY})`);
    if (isRoof) assert.ok(b.minZ >= 3 - 0.2 && b.maxZ <= 11 + 0.2 && b.minY >= 1.6 + 0.25 - 1e-6, `${m.name}: chi tiết mái ngoài mái`);
    else assert.ok(b.minZ >= 11 - 0.45 && b.maxZ <= 11 + 1.4, `${m.name}: sâu [${b.minZ.toFixed(2)}, ${b.maxZ.toFixed(2)}] ngoài vùng mặt tiền`);
  }

  // Biển: giữa mặt tiền, đứng trên mép mái, mờ cùng mặt tiền.
  const sign = ex.facadeMeshes[ex.facadeMeshes.length - 1];
  assert.equal(sign.name, 'sign_test');
  assert.ok(sign.position.x >= 6 + 3.5 && sign.position.x <= 22 - 3.5, 'biển nằm trong mặt tiền');
  assert.ok(sign.position.y >= 1.6 + 0.25, 'biển đứng trên mép mái');
  assert.equal(ex.facadeMaterials[ex.facadeMaterials.length - 1], sign.material, 'vật liệu biển mờ cùng mặt tiền');
}

// Không có mái hiên: bớt đúng các khối mái hiên (8 sọc + 8 diềm). Không tên: không biển, không đèn rọi.
{
  const count = (c: ExteriorContext): number => buildGroceryExterior(c).meshes.reduce((s, m) => s + Math.max(1, m.thinInstanceCount), 0);
  assert.equal(count(ctx()) - count(ctx({ awning: undefined })), 16, 'mái hiên rộng 4 ô = 8 sọc + 8 diềm');
  const noName = buildGroceryExterior(ctx({ name: '' }));
  assert.ok(!noName.meshes.some((m) => m.name === 'sign_test'), 'không tên thì không có biển');
  assert.equal(noName.windowGlowMeshes[0].thinInstanceCount, 6, 'không có bóng đèn rọi');
  // Mặt tiền hẹp (4 ô, sâu 3): bỏ chi tiết mái.
  const small = buildGroceryExterior(ctx({ x0: 6, x1: 9, z0: 8, z1: 10, doorXs: new Set([7]), awning: undefined }));
  assert.equal(small.roofMeshes.length, 0, 'tòa nhỏ không có chi tiết mái');
}

// Hook trong buildCityMap: tiệm chính dùng builder mới, các loại khác giữ đường dựng cũ.
{
  const W = 26;
  const Hh = 16;
  const ground = new Array(W * Hh).fill(2);
  const walls = new Array(W * Hh).fill(0);
  const set = (layer: number[], x: number, y: number, v: number): void => { layer[y * W + x] = v; };
  for (let y = 3; y <= 10; y++) for (let x = 6; x <= 21; x++) set(ground, x, y, 3);
  for (let x = 6; x <= 21; x++) { set(walls, x, 3, 1); if (x !== 9 && x !== 10) set(walls, x, 10, 1); }
  for (let y = 3; y <= 10; y++) { set(walls, 6, y, 1); set(walls, 21, y, 1); }
  // Tiệm xôi (loại chưa đăng ký builder) ở bên trái: phải giữ đường dựng chung cũ.
  for (let y = 3; y <= 10; y++) for (let x = 0; x <= 4; x++) set(ground, x, y, 3);
  for (let x = 0; x <= 4; x++) { set(walls, x, 3, 1); if (x !== 2) set(walls, x, 10, 1); }
  for (let y = 3; y <= 10; y++) { set(walls, 0, y, 1); set(walls, 4, y, 1); }
  const map: GameTileMap = {
    width: W, height: Hh, tileWidth: 32, tileHeight: 32,
    layers: [{ name: 'ground', data: ground }, { name: 'walls', data: walls }] as GameTileMap['layers'],
    collisionLayer: new Array(W * Hh).fill(false),
    buildings: [
      { id: 'main', open: true, top: 3, bounds: { left: 6, right: 21, top: 3, bottom: 10 }, doorTiles: [{ x: 9, y: 10 }, { x: 10, y: 10 }], awning: { x0: 224, x1: 352 } },
      { id: 'xoi', open: true, top: 3, bounds: { left: 0, right: 4, top: 3, bottom: 10 }, doorTiles: [{ x: 2, y: 10 }], awning: { x0: 32, x1: 128 } },
    ],
  };
  const built = buildCityMap(scene, map);
  const roof = built.roofs.find((r) => r.id === 'main' && !r.warehouse)!;
  assert.ok(roof, 'có mái tiệm chính');
  const names = built.meshes.map((m) => m.name);
  assert.ok(names.some((n) => n.startsWith('gx_main_')), 'tiệm chính dùng builder vỏ ngoài tạp hóa');
  assert.ok(!names.some((n) => n.startsWith('gx_xoi')), 'tiệm xôi không dùng builder tạp hóa');
  assert.equal(names.filter((n) => n.startsWith('facade_')).length, 1, 'chỉ tiệm xôi dựng mặt tiền chung cũ, tiệm chính thì không');
  assert.equal(names.filter((n) => n.startsWith('awning_')).length, 1, 'chỉ tiệm xôi dựng mái hiên chung cũ');
  assert.ok(names.some((n) => n.startsWith('walls_Tiệm') || n.startsWith('walls_')), 'tường thân vẫn do map-builder dựng');
  assert.ok(roof.fadeMaterials.length > 1 && roof.meshes.length > 1, 'chi tiết mái tham gia bóc mái');
  assert.ok(roof.facadeMeshes.length > 3 && roof.facadeMaterials.length === roof.facadeMeshes.length, 'mặt tiền tham gia mờ khi vào trong');
  // Đèn đêm: ô sáng chỉ hiện khi trời tối.
  const glowMeshes = built.meshes.filter((m) => m.name.startsWith('gx_main_glow'));
  assert.equal(glowMeshes.length, 1);
  built.updateNightLighting?.(1);
  assert.equal(glowMeshes[0].isVisible, true, 'ban đêm ô sáng hiện');
  built.updateNightLighting?.(0);
  assert.equal(glowMeshes[0].isVisible, false, 'ban ngày ô sáng tắt');
  assert.ok((built.civicNightMeshes ?? []).includes(glowMeshes[0]), 'ô sáng nằm trong danh sách phát sáng đêm của cảnh');
  // Mọi mesh bấm chọn được của tiệm chính đều mang buildingId 'main'.
  const mine = built.meshes.filter((m) => m.name.startsWith('gx_main_'));
  assert.ok(mine.length > 10 && mine.every((m) => (m.metadata as { buildingId?: string }).buildingId === 'main'));
  // Hằng số mặt tiền khớp: lối cửa cao bằng D trừ lanh tô.
  assert.equal(K.doorHeight, 1.6 - 0.45);
  assert.equal(KIT_COLORS.wainscot, PALETTE_HEXES.has(KIT_COLORS.wainscot) ? KIT_COLORS.wainscot : '');
}

scene.dispose();
engine.dispose();
globalWithCanvas.OffscreenCanvas = originalOffscreenCanvas;
console.log('PASS grocery-exterior: builder vỏ ngoài tạp hóa (cửa đôi, cửa sổ, mái hiên, biển, mái, đồ trưng), trong ngân sách, hook map-builder giữ bóc mái/chọn tòa/đèn đêm');
