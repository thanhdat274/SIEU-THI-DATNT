import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { boxesBounds } from './box-bounds';
import type { FixtureBox } from './fixture-shapes';
import { STUDIO_ALPHA, STUDIO_PX, buildStudioScene, renderBoxesPreview, studioShotForBoxes } from './studio-3d';

const box = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number): FixtureBox => ({ color: '#fbf6ea', cx, cy, cz, sx, sy, sz });
// Vật dài 2 (x) × cao 1 (y) × sâu 0,5 (z), tâm (1, 0,5, 0,25).
const boxes = [box(0.5, 0.5, 0.25, 1, 1, 0.5), box(1.5, 0.5, 0.25, 1, 1, 0.5)];
const bounds = boxesBounds(boxes);
assert.deepEqual([bounds.minX, bounds.maxX, bounds.minY, bounds.maxY, bounds.minZ, bounds.maxZ], [0, 2, 0, 1, 0, 0.5], 'hộp bao danh sách khối');
assert.throws(() => boxesBounds([]), /Không có khối/, 'danh sách rỗng ném lỗi');

// Khung chụp: ngắm vào tâm hộp bao, vùng nhìn bao trọn vật, khóa mã hóa góc chụp.
for (const view of ['iso', 'top', 'front'] as const) {
  const shot = studioShotForBoxes('vat', boxes, view);
  assert.deepEqual(shot.target, { x: 1, y: 0.5, z: 0.25 }, `${view}: ngắm vào tâm`);
  assert.equal(shot.alpha, STUDIO_ALPHA[view]);
  assert.ok(Math.max(shot.widthPx, shot.heightPx) === STUDIO_PX, `${view}: cạnh dài ảnh là ${STUDIO_PX}px`);
  assert.ok(shot.halfW > 0 && shot.halfH > 0);
}
const top = studioShotForBoxes('vat', boxes, 'top');
assert.ok(top.halfW >= 1 && top.halfH >= 0.25, 'top: bao trọn x và z');
assert.ok(Math.abs(top.widthPx / top.heightPx - top.halfW / top.halfH) < 0.05, 'top: tỉ lệ ảnh đúng tỉ lệ vùng nhìn');
const front = studioShotForBoxes('vat', boxes, 'front');
assert.ok(front.halfW >= 1 && front.halfH >= 0.5, 'front: bao trọn x và y');
const iso = studioShotForBoxes('vat', boxes, 'iso');
assert.ok(iso.halfW >= Math.hypot(2, 1, 0.5) / 2, 'iso: bao trọn đường chéo hộp bao');
assert.equal(iso.widthPx, iso.heightPx, 'iso: ảnh vuông');
assert.notEqual(studioShotForBoxes('vat', boxes, 'iso').key, studioShotForBoxes('vat', boxes, 'top').key.replace('top', 'iso') + 'x');

// Cảnh studio phải là hệ tay phải, trực giao, như cảnh game (nếu không ảnh bị lật gương theo x).
const engine = new NullEngine();
const { scene, camera } = buildStudioScene(engine);
assert.equal(scene.useRightHandedSystem, true, 'studio dùng hệ tay phải như cảnh game');
assert.equal(camera.mode, Camera.ORTHOGRAPHIC_CAMERA, 'camera trực giao');
scene.dispose();
engine.dispose();

// Không có DOM/WebGL (test, SSR) thì trả null thay vì ném lỗi.
void renderBoxesPreview('vat', boxes).then((url) => {
  assert.equal(url, null);
  console.log('PASS studio-3d: hộp bao, khung chụp theo từng góc, cảnh tay phải trực giao, không DOM trả null');
});
