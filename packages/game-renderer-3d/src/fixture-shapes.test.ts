import assert from 'node:assert/strict';
import type { StoreFixture } from '@game/shared';
import { fixtureBoxes, fixtureFootprint, fixturesSignature, SHELF_HEIGHT, SHELF_TIER_Y, shelfFrontZ, rackCartonCount, rackCartonSlots, RACK_HEIGHT } from './fixture-shapes';

const types = ['decor', 'shelf_wooden', 'shelf_glass', 'cashier_counter', 'refrigerator', 'dining_table', 'kitchen_station', 'warehouse_dry', 'warehouse_cold', 'warehouse_receiving'] as const;
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

// Kệ 2×1 tại (10,5), rotation 0: chân diện 2×1, tâm (11, 5.5), tấm lưng liền ở phía bắc (z nhỏ), phủ kín bề ngang.
const shelf = { type: 'shelf_wooden', tileX: 10, tileY: 5, widthTiles: 2, heightTiles: 1, rotation: 0 } as const;
assert.deepEqual(fixtureFootprint(shelf), { x0: 10, z0: 5, w: 2, d: 1, cx: 11, cz: 5.5 });
const back0 = fixtureBoxes(shelf)[0];
near(back0.cx, 11); near(back0.cz, 5.05); near(back0.sx, 2); near(back0.sy, SHELF_HEIGHT);

// Xoay 90: chân diện 1×2, mặt trước hướng -x nên tấm lưng ở phía đông (x lớn), kéo dọc theo z.
const r90 = { ...shelf, rotation: 90 as const };
assert.deepEqual(fixtureFootprint(r90), { x0: 10, z0: 5, w: 1, d: 2, cx: 10.5, cz: 6 });
const back90 = fixtureBoxes(r90)[0];
near(back90.cx, 10.95); near(back90.cz, 6); near(back90.sx, 0.04); near(back90.sz, 2);
// 180: lưng ở nam; 270: lưng ở tây.
near(fixtureBoxes({ ...shelf, rotation: 180 })[0].cz, 5.95);
near(fixtureBoxes({ ...r90, rotation: 270 })[0].cx, 10.05);

// Mọi loại, mọi hướng: hộp nằm gọn trong chân diện (dung sai 0.05) và có chiều cao dương.
for (const type of types) for (const rotation of [0, 90, 180, 270] as const) {
  const f = { type, tileX: 3, tileY: 7, widthTiles: 2, heightTiles: 1, rotation };
  const fp = fixtureFootprint(f);
  const boxes = fixtureBoxes(f);
  assert.ok(boxes.length > 0, type);
  for (const b of boxes) {
    assert.ok(b.cx - b.sx / 2 >= fp.x0 - 0.05 && b.cx + b.sx / 2 <= fp.x0 + fp.w + 0.05, `${type} ${rotation} x`);
    assert.ok(b.cz - b.sz / 2 >= fp.z0 - 0.05 && b.cz + b.sz / 2 <= fp.z0 + fp.d + 0.05, `${type} ${rotation} z`);
    assert.ok(b.sy > 0 && b.cy - b.sy / 2 >= -1e-9, `${type} y`);
  }
}

// Kệ: cao ~1.75, sâu ~0.7 ô, có 4 dải nhãn giá sáng ở mép trước, kệ kính có tấm kính trong suốt.
for (const type of ['shelf_wooden', 'shelf_glass'] as const) {
  const boxes = fixtureBoxes({ ...shelf, type });
  assert.ok(Math.max(...boxes.map(b => b.cy + b.sy / 2)) >= SHELF_HEIGHT - 1e-9, `${type} cao ${SHELF_HEIGHT}`);
  const front = 5.5 + shelfFrontZ(1);
  near(front, 5 + 0.03 + 0.7);
  const strips = boxes.filter(b => b.sy < 0.06 && b.sx > 1.5 && Math.abs(b.cz - front) < 0.02);
  assert.equal(strips.length, SHELF_TIER_Y.length, `${type} có dải nhãn giá mỗi tầng`);
  assert.ok(boxes.every(b => b.cz + b.sz / 2 <= front + 0.02), `${type} không lồi ra quá mép trước`);
  assert.equal(boxes.some(b => b.alpha !== undefined && b.alpha < 1), type === 'shelf_glass', `${type}: kính trong suốt chỉ ở kệ kính`);
}

// Kệ pallet kho: số thùng tỉ lệ độ đầy, kho lạnh thùng trắng + khung xanh, nhận hàng có vạch vàng.
assert.equal(rackCartonCount(2, 0), 0);
assert.equal(rackCartonCount(2, 0.01), 1);
assert.equal(rackCartonCount(2, 1), rackCartonSlots(2));
assert.ok(rackCartonCount(2, 0.25) < rackCartonCount(2, 0.5) && rackCartonCount(2, 0.5) < rackCartonCount(2, 1));
const wh = (type: 'warehouse_dry' | 'warehouse_cold' | 'warehouse_receiving', fill?: number) => fixtureBoxes({ type, tileX: 3, tileY: 7, widthTiles: 2, heightTiles: 1, rotation: 0 }, fill);
const cartons = (bs: ReturnType<typeof wh>) => bs.filter(b => b.sy >= 0.25 && b.sy <= 0.35 && b.sx > 0.3 && b.cy < RACK_HEIGHT - 0.2).length;
assert.equal(cartons(wh('warehouse_dry', 0)), 0);
assert.equal(cartons(wh('warehouse_dry', 1)), rackCartonSlots(2));
assert.ok(cartons(wh('warehouse_dry', 0.5)) < cartons(wh('warehouse_dry', 1)));
assert.ok(Math.max(...wh('warehouse_dry').map(b => b.cy + b.sy / 2)) >= RACK_HEIGHT - 1e-9, 'kệ kho cao 3 tầng');
assert.ok(wh('warehouse_cold', 1).some(b => b.color === '#f1f3f2') && wh('warehouse_cold', 1).some(b => b.color === '#3a86b4'), 'kho lạnh: thùng xốp trắng + khung xanh');
assert.ok(!wh('warehouse_dry', 1).some(b => b.color === '#f1f3f2'), 'kho thường không có thùng xốp');
const recv = wh('warehouse_receiving');
assert.ok(recv.filter(b => b.color === '#e8c21a').length >= 4, 'khu nhận hàng có vạch sơn vàng');
assert.ok(recv.some(b => b.color === '#9b7647' && b.sy > 0.05), 'khu nhận hàng có pallet');

// Chữ ký đổi khi dời/xóa/thêm, bỏ qua ô phụ.
const base = { id: 'a', ...shelf, currentStock: 0, maxCapacity: 1, label: '' } as StoreFixture;
const sig = fixturesSignature([base]);
assert.notEqual(sig, fixturesSignature([{ ...base, tileX: 11 }]));
assert.notEqual(sig, fixturesSignature([]));
assert.notEqual(sig, fixturesSignature([base, { ...base, id: 'b' }]));
assert.equal(sig, fixturesSignature([base, { ...base, id: 'a_slot1', parentId: 'a' }]));

// Kiểm thử Ánh xạ fixture -> model Kenney và fallback khối code
import { resolveFixtureModelInstances } from './fixtures-3d';

// 1. Kệ gỗ & kệ kính dựng bằng code (không còn model bookcase): không có instance model
for (const type of ['shelf_wooden', 'shelf_glass'] as const) {
  assert.equal(resolveFixtureModelInstances({ type, tileX: 8, tileY: 5, widthTiles: 2, heightTiles: 1, rotation: 0 }, 9, 5.5), null, `${type} dùng khối code`);
}

// 2. Tủ mát / tủ lạnh: kitchenFridgeLarge (2 ô) hoặc kitchenFridgeSmall (1 ô)
const fridge2 = resolveFixtureModelInstances({ type: 'refrigerator', tileX: 10, tileY: 5, widthTiles: 2, heightTiles: 1, rotation: 0 }, 11, 5.5);
assert.ok(fridge2 !== null && fridge2.length === 1);
assert.equal(fridge2[0].kind, 'furniture_fridge_large');

const fridge1 = resolveFixtureModelInstances({ type: 'refrigerator', tileX: 10, tileY: 5, widthTiles: 1, heightTiles: 1, rotation: 0 }, 10.5, 5.5);
assert.ok(fridge1 !== null && fridge1.length === 1);
assert.equal(fridge1[0].kind, 'furniture_fridge_small');

// 3. Quầy thu ngân: kitchenBar + computerScreen
const counterInst = resolveFixtureModelInstances({ type: 'cashier_counter', tileX: 7, tileY: 8, widthTiles: 2, heightTiles: 1, rotation: 0 }, 8, 8.5);
assert.ok(counterInst !== null && counterInst.length === 3, 'Quầy 2 ô có 2 thân quầy bar + 1 máy tính tiền');
assert.equal(counterInst[0].kind, 'furniture_kitchen_bar');
assert.equal(counterInst[1].kind, 'furniture_kitchen_bar');
assert.equal(counterInst[2].kind, 'furniture_computer_screen');

// 4. Các loại fixture khác giữ khối code (trả về null)
const codeOnlyTypes = ['dining_table', 'kitchen_station', 'warehouse_dry', 'warehouse_cold', 'warehouse_receiving', 'decor'] as const;
for (const ct of codeOnlyTypes) {
  assert.equal(resolveFixtureModelInstances({ type: ct, tileX: 0, tileY: 0, widthTiles: 2, heightTiles: 1, rotation: 0 }, 1, 0.5), null, `${ct} giữ khối code`);
}

// 5. Đặt model đúng chân diện: hộp bao đo từ chính file .glb (bỏ nút gốc __root__, giữ dịch chuyển nút con), ở cả 4 hướng xoay
import fs from 'node:fs';
import path from 'node:path';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { FIXTURE_MODEL_CENTERS } from './fixtures-3d';
import { MODEL_CATALOG, type ModelKind } from './model-library';

function findModelDir(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++, dir = path.dirname(dir)) {
    const candidate = path.join(dir, 'apps', 'web', 'public');
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('Không tìm thấy apps/web/public từ ' + process.cwd());
}

interface Bounds { min: [number, number, number]; max: [number, number, number] }

function glbBounds(kind: ModelKind): Bounds {
  const buf = fs.readFileSync(path.join(findModelDir(), MODEL_CATALOG[kind].url));
  const json = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString());
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  const visit = (index: number, offset: number[]): void => {
    const node = json.nodes[index];
    assert.ok(!node.rotation || node.rotation.join() === '0,0,0,1', `${kind}: nút có xoay, bộ đọc hộp bao chưa hỗ trợ`);
    assert.ok(!node.scale || node.scale.join() === '1,1,1', `${kind}: nút có tỉ lệ, bộ đọc hộp bao chưa hỗ trợ`);
    const at = offset.map((v, k) => v + (node.translation?.[k] ?? 0));
    if ('mesh' in node) {
      for (const prim of json.meshes[node.mesh].primitives) {
        const acc = json.accessors[prim.attributes.POSITION];
        for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], acc.min[k] + at[k]); max[k] = Math.max(max[k], acc.max[k] + at[k]); }
      }
    }
    for (const child of node.children ?? []) visit(child, at);
  };
  for (const root of json.scenes[0].nodes) visit(root, [0, 0, 0]);
  return { min, max };
}

const MODEL_KINDS_USED = Object.keys(FIXTURE_MODEL_CENTERS) as ModelKind[];
for (const kind of MODEL_KINDS_USED) {
  const b = glbBounds(kind);
  const center = FIXTURE_MODEL_CENTERS[kind]!;
  assert.ok(Math.abs((b.min[0] + b.max[0]) / 2 - center.x) < 0.005, `${kind}: tâm x ${center.x} lệch hộp bao thật ${(b.min[0] + b.max[0]) / 2}`);
  assert.ok(Math.abs((b.min[2] + b.max[2]) / 2 - center.z) < 0.005, `${kind}: tâm z ${center.z} lệch hộp bao thật ${(b.min[2] + b.max[2]) / 2}`);
}

function worldAabb(kind: ModelKind, matrix: import('@babylonjs/core/Maths/math.vector').Matrix): Bounds {
  const b = glbBounds(kind);
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) for (const z of [b.min[2], b.max[2]]) {
    const w = Vector3.TransformCoordinates(new Vector3(x, y, z), matrix);
    min[0] = Math.min(min[0], w.x); max[0] = Math.max(max[0], w.x);
    min[1] = Math.min(min[1], w.y); max[1] = Math.max(max[1], w.y);
    min[2] = Math.min(min[2], w.z); max[2] = Math.max(max[2], w.z);
  }
  return { min, max };
}

const EPS = 0.005;
const modelCases: { type: 'refrigerator' | 'cashier_counter'; w: number }[] = [
  { type: 'refrigerator', w: 1 }, { type: 'refrigerator', w: 2 }, { type: 'cashier_counter', w: 1 }, { type: 'cashier_counter', w: 2 },
];
for (const { type, w } of modelCases) {
  for (const rotation of [0, 90, 180, 270] as const) {
    const fix = { type, tileX: 7, tileY: 8, widthTiles: w, heightTiles: 1, rotation };
    const fp = fixtureFootprint(fix);
    const label = `${type} ${w}x1 xoay ${rotation}`;
    const instances = resolveFixtureModelInstances(fix, fp.cx, fp.cz);
    assert.ok(instances !== null, `${label}: phải dùng model`);
    const boxes = instances.map((inst) => ({ kind: inst.kind, aabb: worldAabb(inst.kind, inst.matrix) }));
    for (const { kind, aabb } of boxes) {
      assert.ok(aabb.min[0] >= fp.x0 - EPS && aabb.max[0] <= fp.x0 + fp.w + EPS, `${label}: ${kind} nhô khỏi chân diện theo x [${aabb.min[0].toFixed(2)}, ${aabb.max[0].toFixed(2)}] so với [${fp.x0}, ${fp.x0 + fp.w}]`);
      assert.ok(aabb.min[2] >= fp.z0 - EPS && aabb.max[2] <= fp.z0 + fp.d + EPS, `${label}: ${kind} nhô khỏi chân diện theo z [${aabb.min[2].toFixed(2)}, ${aabb.max[2].toFixed(2)}] so với [${fp.z0}, ${fp.z0 + fp.d}]`);
      assert.ok(Math.abs(aabb.min[1]) < EPS || kind === 'furniture_computer_screen', `${label}: ${kind} phải đặt sát sàn`);
    }
    if (type === 'refrigerator') {
      const a = boxes[0].aabb;
      assert.ok(Math.abs((a.min[0] + a.max[0]) / 2 - fp.cx) < EPS && Math.abs((a.min[2] + a.max[2]) / 2 - fp.cz) < EPS, `${label}: tủ lạnh phải nằm đúng tâm chân diện`);
    } else {
      const bars = boxes.filter((b) => b.kind === 'furniture_kitchen_bar').map((b) => b.aabb);
      const screen = boxes.find((b) => b.kind === 'furniture_computer_screen')!.aabb;
      const barMin = [Math.min(...bars.map((b) => b.min[0])), Math.min(...bars.map((b) => b.min[2]))];
      const barMax = [Math.max(...bars.map((b) => b.max[0])), Math.max(...bars.map((b) => b.max[2]))];
      assert.ok(screen.min[0] >= barMin[0] - EPS && screen.max[0] <= barMax[0] + EPS && screen.min[2] >= barMin[1] - EPS && screen.max[2] <= barMax[1] + EPS, `${label}: máy tính tiền phải nằm trên quầy, không lơ lửng cạnh quầy`);
      assert.ok(Math.abs((barMin[0] + barMax[0]) / 2 - fp.cx) < EPS && Math.abs((barMin[1] + barMax[1]) / 2 - fp.cz) < EPS, `${label}: quầy phải nằm đúng tâm chân diện`);
    }
  }
}

console.log('PASS fixture-shapes: chân diện, hộp theo hướng xoay, chữ ký, ánh xạ model Kenney & fallback, model nằm đúng chân diện ở 4 hướng');
