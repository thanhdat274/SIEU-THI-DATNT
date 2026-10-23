import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { BUILDING_VISUALS } from '@game/data';
import { INTERIOR_BUILDERS, type InteriorContext } from './building-registry';
import { FACE_YAW, buildGroceryInterior, wallFaces } from './grocery-interior';
import { DETAIL_BUDGET, KIT_COLORS, PALETTE_HEXES } from './style-spec';

assert.deepEqual(Object.keys(INTERIOR_BUILDERS), ['grocery_main'], 'chỉ tạp hóa chính có vỏ trong riêng');

// Bố cục thật của tiệm chính (đọc từ bản đồ game): sàn x 7..12, z 4..9 và hai ô cửa ở hàng z = 10 (x 9, 10).
// Tường: cột x = 6 và x = 13; hàng z = 3 (có lối thông kho ở x 9, 10); hàng z = 10 (trừ ô cửa).
const walls = new Set<string>();
for (let z = 3; z <= 10; z++) { walls.add(`6,${z}`); walls.add(`13,${z}`); }
for (let x = 6; x <= 13; x++) {
  if (x !== 9 && x !== 10) walls.add(`${x},3`);
  if (x !== 9 && x !== 10) walls.add(`${x},10`);
}
const isWall = (x: number, z: number): boolean => walls.has(`${x},${z}`);
const floorTiles: Array<{ x: number; z: number }> = [];
for (let z = 4; z <= 9; z++) for (let x = 7; x <= 12; x++) floorTiles.push({ x, z });
floorTiles.push({ x: 9, z: 10 }, { x: 10, z: 10 });
const doorTiles = [{ x: 9, z: 10 }, { x: 10, z: 10 }];

// Mặt tường nhìn vào phòng, gộp theo đoạn liên tiếp.
{
  const runs = wallFaces(floorTiles, isWall);
  const has = (dir: string, line: number, start: number, len: number): boolean => runs.some((r) => r.dir === dir && r.line === line && r.start === start && r.len === len);
  assert.ok(has('N', 4, 7, 2) && has('N', 4, 11, 2), 'tường sau: hai đoạn hai bên lối thông kho');
  assert.ok(has('W', 7, 4, 6), 'tường trái dài 6 ô');
  assert.ok(has('E', 13, 4, 6), 'tường phải dài 6 ô');
  assert.ok(has('S', 10, 7, 2) && has('S', 10, 11, 2), 'tường trước: hai đoạn hai bên cửa');
  assert.ok(has('W', 9, 10, 1) && has('E', 11, 10, 1), 'hai trụ khung cửa ở hàng cửa');
  assert.equal(runs.length, 8, `đúng 8 đoạn mặt tường, hiện ${runs.length}`);
  assert.deepEqual(wallFaces([], isWall), [], 'không có ô sàn thì không có mặt tường');
  assert.deepEqual(wallFaces([{ x: 7, z: 4 }], () => false), [], 'không có tường thì không có mặt tường');
}

// Hướng mặt trước của mảnh sau xoay quanh trục đứng phải quay về phía trong phòng.
{
  const face = (dir: keyof typeof FACE_YAW): Vector3 => Vector3.TransformNormal(new Vector3(0, 0, 1), Matrix.RotationY(FACE_YAW[dir]));
  const close = (a: Vector3, b: Vector3): boolean => Vector3.Distance(a, b) < 1e-9;
  assert.ok(close(face('N'), new Vector3(0, 0, 1)), 'tường phía bắc: mặt quay về +z');
  assert.ok(close(face('S'), new Vector3(0, 0, -1)), 'tường phía nam: mặt quay về -z');
  assert.ok(close(face('W'), new Vector3(1, 0, 0)), 'tường phía tây: mặt quay về +x');
  assert.ok(close(face('E'), new Vector3(-1, 0, 0)), 'tường phía đông: mặt quay về -x');
}

// Dựng thật trong cảnh giả (NullEngine).
const engine = new NullEngine();
const scene = new Scene(engine);
const ctx = (over: Partial<InteriorContext> = {}): InteriorContext => ({
  scene, buildingId: 'main', visual: BUILDING_VISUALS.grocery_main, wallHeight: 1.6, floorTiles, isWall, doorTiles, ...over,
});
/** Hộp bao thật của mọi instance: biến đổi 8 góc của hộp đơn vị qua ma trận (đúng cả khi xoay 90°). */
function bounds(mesh: Mesh) {
  const b = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const m of mesh.thinInstanceGetWorldMatrices()) {
    for (const x of [-0.5, 0.5]) for (const y of [-0.5, 0.5]) for (const z of [-0.5, 0.5]) {
      const p = Vector3.TransformCoordinates(new Vector3(x, y, z), m);
      b.minX = Math.min(b.minX, p.x); b.maxX = Math.max(b.maxX, p.x);
      b.minY = Math.min(b.minY, p.y); b.maxY = Math.max(b.maxY, p.y);
      b.minZ = Math.min(b.minZ, p.z); b.maxZ = Math.max(b.maxZ, p.z);
    }
  }
  return b;
}

{
  const it = buildGroceryInterior(ctx());
  assert.equal(it.drawItems, it.meshes.length);
  assert.ok(it.drawItems <= DETAIL_BUDGET.buildingDrawItems, `ngân sách ${DETAIL_BUDGET.buildingDrawItems}, hiện ${it.drawItems}`);
  assert.ok(it.drawItems <= 20, `vỏ trong gọn (≤ 20 mục vẽ), hiện ${it.drawItems}`);
  for (const m of it.meshes) assert.equal((m.metadata as { buildingId?: string }).buildingId, 'main', `${m.name}: thiếu buildingId`);
  assert.equal(it.materials.length, it.meshes.length, 'mỗi mesh một vật liệu riêng để giải phóng cùng');
  for (const mat of it.materials) {
    if (mat.disableLighting) continue; // bóng đèn phát sáng dùng màu ánh sáng
    assert.ok(PALETTE_HEXES.has(mat.diffuseColor.toHexString().toLowerCase()), `${mat.name}: màu ngoài bảng màu`);
  }

  // Sàn: mỗi ô sàn một ô lát, hai tông xen kẽ, nhận bóng đổ; nằm đúng trong ô và không chìm.
  const floors = it.meshes.filter((m) => m.name.includes('floor|'));
  assert.equal(floors.length, 2, 'hai tông sàn là hai mesh');
  assert.equal(floors.reduce((s, m) => s + m.thinInstanceCount, 0), floorTiles.length, 'mỗi ô sàn một ô lát');
  assert.ok(floors.every((m) => m.receiveShadows), 'sàn nhận bóng đổ');
  assert.deepEqual(new Set(floors.map((m) => m.material!.name)).size, 2);
  const fb = floors.map(bounds);
  assert.ok(Math.min(...fb.map((b) => b.minX)) >= 7 - 1e-6 && Math.max(...fb.map((b) => b.maxX)) <= 13 + 1e-6, 'sàn trong ô lát');
  assert.ok(Math.min(...fb.map((b) => b.minY)) >= 0 - 1e-6 && Math.max(...fb.map((b) => b.maxY)) <= 0.021, 'sàn lát dày 0,02, không chìm');

  // Bóng đèn: bốn bóng (hai xà × hai đèn), ô sáng tắt sẵn; đèn treo trên đầu người (1,28) và dưới trần.
  assert.equal(it.glowMeshes.length, 1);
  assert.equal(it.glowMeshes[0].thinInstanceCount, 4, 'bốn bóng đèn');
  assert.equal(it.glowMeshes[0].isVisible, false, 'bóng đèn tắt sẵn');
  const gb = bounds(it.glowMeshes[0]);
  assert.ok(gb.minY >= 1.28 - 1e-6 && gb.maxY <= 1.6, `bóng đèn cao [${gb.minY.toFixed(2)}, ${gb.maxY.toFixed(2)}] phải trên đầu người và dưới trần`);

  // Mọi thứ nằm trong phòng (cho phép dày tường), thấp hơn tường; thảm cửa ở giữa hai ô cửa, sát cửa.
  for (const m of it.meshes) {
    const b = bounds(m);
    assert.ok(b.minX >= 6.9 && b.maxX <= 13.1 && b.minZ >= 3.9 && b.maxZ <= 11.1, `${m.name}: [${b.minX.toFixed(2)},${b.maxX.toFixed(2)}]×[${b.minZ.toFixed(2)},${b.maxZ.toFixed(2)}] ngoài phòng`);
    assert.ok(b.minY >= -1e-6 && b.maxY <= 1.6 + 1e-6, `${m.name}: cao [${b.minY.toFixed(2)}, ${b.maxY.toFixed(2)}] ngoài chiều cao tường`);
  }
  const mat = it.meshes.find((m) => m.name.includes(KIT_COLORS.mat))!;
  const mt = mat.thinInstanceGetWorldMatrices()[0].getTranslation();
  assert.ok(Math.abs(mt.x - 10) < 1e-6 && Math.abs(mt.z - 10.5) < 1e-6, 'thảm cửa giữa hai ô cửa (x = 10), trong ngưỡng cửa');
  assert.equal(mat.thinInstanceCount, 1, 'một tấm thảm cho hai ô cửa liền nhau (viền thảm dùng chung nhóm màu đỏ với tranh)');

  // Xà ngang chỉ ở hai hàng sàn tựa vào tường hai đầu: 2 xà (mỗi xà một khối bark).
  const beamAndFrames = it.meshes.find((m) => m.name.includes(`plain|${KIT_COLORS.frame}`))!;
  assert.equal(beamAndFrames.thinInstanceCount, 2 + 3 + 4, 'khung gỗ: 2 xà + 3 khung tranh + 4 thanh khung bảng giá, cùng một mesh');

  // Áp phích và bảng giá: tường sau 2, tường phải 1, bảng giá tường trái 1; không có trên tường trước (cửa, quầy thu ngân).
  const panels = [KIT_COLORS.produceRed, KIT_COLORS.produceYellow, KIT_COLORS.produceGreen].map((c) => it.meshes.find((m) => m.name.includes(`plain|${c}`))?.thinInstanceCount ?? 0);
  assert.ok(panels.reduce((s, n) => s + n, 0) >= 3, 'có tranh áp phích (ba biến thể)');
  const chalk = it.meshes.find((m) => m.name.includes(`plain|${KIT_COLORS.chalkboard}`))!;
  assert.equal(chalk.thinInstanceCount, 1, 'một bảng phấn ở tường trái');
  const ct = chalk.thinInstanceGetWorldMatrices()[0].getTranslation();
  assert.ok(Math.abs(ct.x - 7.015) < 0.05 && ct.z > 4 && ct.z < 10, 'bảng giá treo sát tường trái, trong phạm vi tường');
}

// Phòng nhỏ không có tường hai đầu: không dựng xà và đèn; không ô sàn: không dựng gì.
{
  const none = buildGroceryInterior(ctx({ floorTiles: [], doorTiles: [] }));
  assert.equal(none.meshes.length, 0, 'không ô sàn: không có gì để dựng');
  const tiny = buildGroceryInterior(ctx({ floorTiles: [{ x: 7, z: 4 }, { x: 8, z: 4 }], isWall: (x, z) => z === 3 || z === 5, doorTiles: [] }));
  assert.equal(tiny.glowMeshes.length, 0, 'phòng không tựa tường hai đầu: không xà, không đèn');
}

scene.dispose();
engine.dispose();
console.log('PASS grocery-interior: mặt tường gộp đoạn, hướng phào, sàn lát, chân tường, áp phích/bảng giá, xà + đèn trên đầu người, thảm cửa, trong ngân sách');
