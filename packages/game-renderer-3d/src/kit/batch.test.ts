import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { KitBatch } from './batch';
import { doorFrame, glassDoor, kitBox, makePiece, shopWindow } from './index';
import { KIT_COLORS } from '../style-spec';

const engine = new NullEngine();
const scene = new Scene(engine);
const close = (a: Vector3, b: Vector3, msg: string): void => assert.ok(Vector3.Distance(a, b) < 1e-5, `${msg}: ${a.toString()} khác ${b.toString()}`);

// Gom nhóm: các khối cùng (vai trò, màu, độ đục) dùng chung một mesh; số mục vẽ = số mesh.
{
  const batch = new KitBatch(scene, 'b1', 'main');
  batch.add(shopWindow(), { x: 0, y: 0, z: 0 }, 'facade');
  batch.add(shopWindow(), { x: 3, y: 0, z: 0 }, 'facade');
  batch.add(shopWindow(), { x: 6, y: 0, z: 0 }, 'facade');
  const r = batch.build();
  const frame = r.groups.find((g) => g.color === KIT_COLORS.frame)!;
  assert.equal(frame.role, 'facade');
  // Mỗi cửa sổ hai ô kính: 4 thanh khung + 1 thanh giữa = 5 khối khung ⇒ 15 instance của ba cửa sổ trong một mesh.
  assert.equal(frame.instances, 15, 'khung của ba cửa sổ gom vào một mesh');
  assert.equal(frame.mesh.thinInstanceCount, 15);
  assert.equal(r.drawItems, r.meshes.length);
  assert.ok(r.drawItems <= 6, `ba cửa sổ giống nhau chỉ cần ít mục vẽ, hiện ${r.drawItems}`);
  const glass = r.groups.find((g) => g.color === KIT_COLORS.glass)!;
  assert.equal(glass.role, 'glass', 'khối có alpha tự thuộc nhóm kính dù truyền vai trò facade');
  assert.equal(glass.material.alpha, 0.4);
  assert.equal(frame.material.alpha, 1);
  for (const m of r.meshes) assert.deepEqual(m.metadata, { buildingId: 'main' }, 'mọi mesh có buildingId để bấm chọn tòa');
  assert.ok(r.meshes.every((m) => m.thinInstanceEnablePicking), 'thin instances cho phép chọn bằng chuột');
}

// Vật liệu riêng theo batch (mỗi tòa một bản) để đổi alpha không lan sang tòa khác.
{
  const a = new KitBatch(scene, 'ta', 'a');
  const b = new KitBatch(scene, 'tb', 'b');
  a.add(doorFrame(), { x: 0, y: 0, z: 0 }, 'facade');
  b.add(doorFrame(), { x: 0, y: 0, z: 0 }, 'facade');
  const ra = a.build();
  const rb = b.build();
  assert.notEqual(ra.groups[0].material, rb.groups[0].material, 'hai tòa không dùng chung vật liệu');
  ra.groups[0].material.alpha = 0.25;
  assert.equal(rb.groups[0].material.alpha, 1, 'đổi alpha tòa này không ảnh hưởng tòa kia');
}

// Vị trí: gốc đặt mảnh cộng với tâm khối; kích thước thành tỉ lệ của hộp đơn vị.
{
  const piece = makePiece('thu', [kitBox('#fbf6ea', 1, 2, 3, 0.5, 0.6, 0.7)]);
  const batch = new KitBatch(scene, 'pos', 'main');
  batch.add(piece, { x: 10, y: 0.5, z: -4 });
  const m = batch.build().meshes[0].thinInstanceGetWorldMatrices()[0];
  close(m.getTranslation(), new Vector3(11, 2.5, -1), 'tịnh tiến = gốc + tâm khối');
  const scale = new Vector3();
  m.decompose(scale);
  close(scale, new Vector3(0.5, 0.6, 0.7), 'tỉ lệ = kích thước khối');
}

// Xoay quanh trục X (mái hiên nghiêng) khớp mesh.rotation.x của bản dựng cũ: xoay quanh gốc `at`, cộng tịnh tiến.
{
  const rotX = 0.35;
  const at = { x: 2, y: 1.15, z: 5 };
  const box = kitBox('#fbf6ea', 3, 0, 0.45, 0.2, 0.05, 0.9);
  const batch = new KitBatch(scene, 'rot', 'main');
  batch.addBox(box, at, 'plain', rotX);
  const got = batch.build().meshes[0].thinInstanceGetWorldMatrices()[0].getTranslation();
  const expected = Vector3.TransformCoordinates(new Vector3(box.cx, box.cy, box.cz), Matrix.RotationX(rotX).multiply(Matrix.Translation(at.x, at.y, at.z)));
  close(got, expected, 'xoay X quanh gốc at');
}

// Vai trò glow: ô phát sáng, tắt sẵn (chỉ bật ban đêm), vật liệu không bị ánh sáng ảnh hưởng.
{
  const batch = new KitBatch(scene, 'glow', 'main');
  batch.addBox(kitBox(KIT_COLORS.glow, 0, 1, 0, 0.5, 0.5, 0.01), { x: 0, y: 0, z: 0 }, 'glow');
  const g = batch.build().groups[0];
  assert.equal(g.role, 'glow');
  assert.equal(g.mesh.isVisible, false, 'ô sáng tắt sẵn');
  assert.equal(g.material.disableLighting, true);
  assert.ok(g.material.emissiveColor.r > 0.5, 'có ánh phát');
}

// Cánh cửa đổi bên tay nắm (cửa đôi để tay nắm hướng vào giữa).
assert.ok(glassDoor({ handleSide: 1 }).boxes.find((b) => b.color === KIT_COLORS.handle)!.cx > 0);
assert.ok(glassDoor({ handleSide: -1 }).boxes.find((b) => b.color === KIT_COLORS.handle)!.cx < 0);

scene.dispose();
engine.dispose();
console.log('PASS kit/batch: gom nhóm thin instances, vật liệu riêng từng tòa, vị trí và xoay khớp bản cũ, ô sáng ban đêm');
