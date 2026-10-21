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

console.log('PASS fixture-shapes: chân diện, hộp theo hướng xoay, chữ ký, ánh xạ model Kenney & fallback');
