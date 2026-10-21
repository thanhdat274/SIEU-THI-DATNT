import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { BuildingInterior, InteriorSpec } from './building-registry';
import {
  INTERIOR_BUILD_RADIUS, INTERIOR_DISPOSE_RADIUS, INTERIOR_NIGHT_LAMPS_ON, INTERIOR_SHOW_BELOW_ROOF_ALPHA,
  InteriorManager, decideInterior,
} from './interior-manager';
import type { RoofInfo } from './map-builder';

// Quyết định thuần: dựng khi gần hoặc đã bóc mái; hiện chỉ khi mái đang mờ; giải phóng khi xa và mái đã đậy.
assert.ok(INTERIOR_DISPOSE_RADIUS > INTERIOR_BUILD_RADIUS, 'bán kính giải phóng lớn hơn bán kính dựng (tránh dựng/hủy liên tục)');
const D = (built: boolean, roofAlpha: number, distance: number) => decideInterior({ built, roofAlpha, distance });
assert.deepEqual(D(false, 1, INTERIOR_BUILD_RADIUS + 1), { build: false, dispose: false, show: false }, 'xa và mái đậy: không dựng');
assert.deepEqual(D(false, 1, INTERIOR_BUILD_RADIUS), { build: true, dispose: false, show: false }, 'gần: dựng sẵn nhưng chưa hiện');
assert.deepEqual(D(false, 0.5, 999), { build: true, dispose: false, show: false }, 'mái đã bóc: dựng dù ở xa');
assert.deepEqual(D(true, 1, 5), { build: false, dispose: false, show: false }, 'mái đậy: ẩn');
assert.deepEqual(D(true, INTERIOR_SHOW_BELOW_ROOF_ALPHA - 0.01, 5), { build: false, dispose: false, show: true }, 'mái bắt đầu mờ: hiện');
assert.deepEqual(D(true, 0, 5), { build: false, dispose: false, show: true }, 'mái bóc hẳn: hiện');
assert.deepEqual(D(true, 1, (INTERIOR_BUILD_RADIUS + INTERIOR_DISPOSE_RADIUS) / 2), { build: false, dispose: false, show: false }, 'giữa hai bán kính: giữ nguyên');
assert.deepEqual(D(true, 1, INTERIOR_DISPOSE_RADIUS + 1), { build: false, dispose: true, show: false }, 'xa và mái đậy: giải phóng');
assert.equal(D(true, 0, 999).dispose, false, 'đang bóc mái thì không giải phóng dù xa');

// Bộ quản lý với vỏ trong giả: hai mesh thường và một mesh phát sáng.
const engine = new NullEngine();
const scene = new Scene(engine);
let builds = 0;
const makeSpec = (id: string, center = { x: 10, z: 10 }, fail = false): InteriorSpec => ({
  buildingId: id,
  center,
  build: (): BuildingInterior => {
    builds++;
    if (fail) throw new Error('lỗi dựng giả');
    const a = CreateBox(`${id}_a`, { size: 1 }, scene);
    const b = CreateBox(`${id}_b`, { size: 1 }, scene);
    const glow = CreateBox(`${id}_glow`, { size: 1 }, scene);
    const mats = [a, b, glow].map((m, i) => (m.material = new StandardMaterial(`${id}_m${i}`, scene)));
    return { meshes: [a, b, glow], glowMeshes: [glow], materials: mats, drawItems: 3 };
  },
});
const roof = (id: string, alpha: number): RoofInfo => ({ id, warehouse: false, alpha } as unknown as RoofInfo);
const names = (id: string): string[] => scene.meshes.filter((m) => m.name.startsWith(`${id}_`) && !m.isDisposed()).map((m) => m.name);
const find = (name: string): Mesh => scene.meshes.find((m) => m.name === name) as Mesh;
const near = { x: 10, z: 12 };
const far = { x: 200, z: 12 };

const mgr = new InteriorManager();
mgr.reset([makeSpec('t')]);
assert.equal(mgr.builtCount, 0);
mgr.update([roof('t', 1)], far);
assert.equal(builds, 0, 'xa và mái đậy: chưa dựng');
mgr.update([roof('t', 1)], near);
assert.equal(builds, 1, 'gần: dựng');
assert.equal(mgr.builtCount, 1);
assert.equal(mgr.drawItems, 3, 'đo được số mục vẽ');
assert.ok(names('t').every((n) => !find(n).isVisible), 'vừa dựng xong ở trạng thái ẩn');
mgr.update([roof('t', 1)], near);
assert.equal(builds, 1, 'không dựng lại');
assert.ok(names('t').every((n) => !find(n).isVisible), 'mái đậy: vỏ trong ẩn');

// Mái bóc: vỏ trong hiện; bóng đèn chỉ sáng khi trời tối.
mgr.update([roof('t', 0)], near);
assert.equal(find('t_a').isVisible && find('t_b').isVisible, true, 'mái bóc: hiện');
assert.equal(find('t_glow').isVisible, false, 'ban ngày bóng đèn tắt');
mgr.setNight(INTERIOR_NIGHT_LAMPS_ON + 0.2);
assert.equal(find('t_glow').isVisible, true, 'ban đêm bóng đèn sáng khi vỏ trong hiện');
mgr.update([roof('t', 1)], near);
assert.equal(find('t_a').isVisible || find('t_glow').isVisible, false, 'đậy mái: ẩn cả bóng đèn');
mgr.setNight(0);

// Xa và mái đậy: giải phóng mesh lẫn vật liệu; quay lại gần thì dựng lại.
const material = find('t_a').material!;
mgr.update([roof('t', 1)], far);
assert.equal(mgr.builtCount, 0);
assert.equal(names('t').length, 0, 'mesh đã giải phóng');
assert.equal(scene.materials.includes(material), false, 'vật liệu riêng đã giải phóng');
mgr.update([roof('t', 1)], near);
assert.equal(builds, 2, 'quay lại gần: dựng lại');

// Không tìm thấy mái của tòa (id lạ): coi như mái đậy.
mgr.reset([makeSpec('u')]);
mgr.update([], near);
assert.ok(names('u').every((n) => !find(n).isVisible), 'không có mái: ẩn');

// Dựng lỗi: ghi cảnh báo, không thử lại mỗi khung hình, không làm hỏng các tòa khác.
{
  const warn = console.warn;
  const warned: unknown[][] = [];
  console.warn = (...args: unknown[]) => { warned.push(args); };
  const before = builds;
  mgr.reset([makeSpec('bad', { x: 10, z: 10 }, true), makeSpec('ok', { x: 12, z: 10 })]);
  mgr.update([roof('bad', 0), roof('ok', 0)], near);
  mgr.update([roof('bad', 0), roof('ok', 0)], near);
  console.warn = warn;
  assert.equal(builds - before, 2, 'tòa lỗi chỉ thử một lần, tòa lành vẫn dựng');
  assert.equal(warned.length, 1, 'chỉ cảnh báo một lần');
  assert.equal(mgr.builtCount, 1);
}

// Reset thay danh sách thì giải phóng vỏ trong cũ; dispose giải phóng hết.
mgr.reset([]);
assert.equal(names('ok').length, 0, 'reset giải phóng vỏ trong cũ');
mgr.reset([makeSpec('v')]);
mgr.update([roof('v', 0)], near);
mgr.dispose();
assert.equal(names('v').length, 0, 'dispose giải phóng hết');
assert.equal(mgr.builtCount, 0);

scene.dispose();
engine.dispose();
console.log('PASS interior-manager: dựng khi gần/bóc mái, chỉ hiện khi mái mờ, giải phóng khi xa, bóng đèn đêm, dựng lỗi không lặp, reset/dispose');
