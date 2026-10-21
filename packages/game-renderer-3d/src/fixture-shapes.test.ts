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

// Tủ lạnh và quầy thu ngân dựng từ kit (không còn model Kenney): hộp nằm gọn trong chân diện ở 4 hướng xoay, đúng chiều cao chuẩn,
// cửa kính/màn hình/giỏ ở đúng phía và đặt đúng chỗ khi xoay.
import { SCALE_TARGETS } from './scale-spec';
import { boxesBounds } from './box-bounds';

const EPS = 0.005;
const cases: { type: 'refrigerator' | 'cashier_counter'; w: number; h: number }[] = [
  { type: 'refrigerator', w: 1, h: SCALE_TARGETS.fixtures.fridge }, { type: 'refrigerator', w: 2, h: SCALE_TARGETS.fixtures.fridge },
  { type: 'cashier_counter', w: 1, h: SCALE_TARGETS.fixtures.counter }, { type: 'cashier_counter', w: 2, h: SCALE_TARGETS.fixtures.counter },
];
for (const { type, w, h } of cases) {
  for (const rotation of [0, 90, 180, 270] as const) {
    const fix = { type, tileX: 7, tileY: 8, widthTiles: w, heightTiles: 1, rotation };
    const fp = fixtureFootprint(fix);
    const label = `${type} ${w}x1 xoay ${rotation}`;
    const boxes = fixtureBoxes(fix);
    const b = boxesBounds(boxes);
    assert.ok(b.minX >= fp.x0 - 1e-9 && b.maxX <= fp.x0 + fp.w + 1e-9, `${label}: nhô khỏi chân diện theo x [${b.minX.toFixed(3)}, ${b.maxX.toFixed(3)}]`);
    assert.ok(b.minZ >= fp.z0 - 1e-9 && b.maxZ <= fp.z0 + fp.d + 1e-9, `${label}: nhô khỏi chân diện theo z [${b.minZ.toFixed(3)}, ${b.maxZ.toFixed(3)}]`);
    assert.ok(Math.abs(b.minY) < EPS, `${label}: phải đặt sát sàn`);
    assert.ok(b.maxY >= h - EPS && b.maxY <= h + 0.35, `${label}: cao ${b.maxY.toFixed(2)} lệch chuẩn ${h}`);
    // Thân phủ gần hết chân diện và nằm đúng tâm (không lệch như model cũ).
    const body = boxes.reduce((m, x) => (x.sx * x.sz > m.sx * m.sz ? x : m));
    assert.ok(Math.abs(body.cx - fp.cx) < EPS && Math.abs(body.cz - fp.cz) < EPS, `${label}: thân phải nằm đúng tâm chân diện`);
    assert.ok(body.sx * body.sz >= 0.8 * fp.w * fp.d * 0.8, `${label}: thân phủ chân diện`);
    // Phía trước (+z cục bộ, xoay theo fixture): kính tủ lạnh / mặt dải quầy nhô ra phía trước hơn thân.
    const front = { 0: [0, 1], 90: [-1, 0], 180: [0, -1], 270: [1, 0] }[rotation];
    const reach = (x: (typeof boxes)[number]) => (x.cx - fp.cx) * front[0] + (x.cz - fp.cz) * front[1] + (Math.abs(front[0]) ? x.sx : x.sz) / 2;
    const frontMost = boxes.reduce((m, x) => (reach(x) > reach(m) ? x : m));
    if (type === 'refrigerator') {
      assert.ok(frontMost.alpha !== undefined || frontMost.sy > 0.3, `${label}: mặt trước tủ lạnh là kính/tay nắm`);
      assert.ok(boxes.some((x) => x.alpha !== undefined && reach(x) > reach(body) - 1e-9), `${label}: kính nằm ở mặt trước`);
    }
  }
}

console.log('PASS fixture-shapes: chân diện, hộp theo hướng xoay, chữ ký, tủ lạnh và quầy thu ngân (kit) nằm gọn chân diện ở 4 hướng xoay');
