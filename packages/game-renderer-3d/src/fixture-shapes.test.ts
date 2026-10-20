import assert from 'node:assert/strict';
import type { StoreFixture } from '@game/shared';
import { fixtureBoxes, fixtureFootprint, fixturesSignature } from './fixture-shapes';

const types = ['decor', 'shelf_wooden', 'shelf_glass', 'cashier_counter', 'refrigerator', 'dining_table', 'kitchen_station', 'warehouse_dry', 'warehouse_cold', 'warehouse_receiving'] as const;
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

// Kệ 2×1 tại (10,5), rotation 0: chân diện 2×1, tâm (11, 5.5), tấm lưng ở phía bắc (z nhỏ).
const shelf = { type: 'shelf_wooden', tileX: 10, tileY: 5, widthTiles: 2, heightTiles: 1, rotation: 0 } as const;
assert.deepEqual(fixtureFootprint(shelf), { x0: 10, z0: 5, w: 2, d: 1, cx: 11, cz: 5.5 });
const back0 = fixtureBoxes(shelf)[0];
near(back0.cx, 11); near(back0.cz, 5.04); near(back0.sx, 2);

// Xoay 90: chân diện 1×2, mặt trước hướng -x nên tấm lưng ở phía đông (x lớn), kéo dọc theo z.
const r90 = { ...shelf, rotation: 90 as const };
assert.deepEqual(fixtureFootprint(r90), { x0: 10, z0: 5, w: 1, d: 2, cx: 10.5, cz: 6 });
const back90 = fixtureBoxes(r90)[0];
near(back90.cx, 10.96); near(back90.cz, 6); near(back90.sx, 0.08); near(back90.sz, 2);
// 180: lưng ở nam; 270: lưng ở tây.
near(fixtureBoxes({ ...shelf, rotation: 180 })[0].cz, 5.96);
near(fixtureBoxes({ ...r90, rotation: 270 })[0].cx, 10.04);

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

// Chữ ký đổi khi dời/xóa/thêm, bỏ qua ô phụ.
const base = { id: 'a', ...shelf, currentStock: 0, maxCapacity: 1, label: '' } as StoreFixture;
const sig = fixturesSignature([base]);
assert.notEqual(sig, fixturesSignature([{ ...base, tileX: 11 }]));
assert.notEqual(sig, fixturesSignature([]));
assert.notEqual(sig, fixturesSignature([base, { ...base, id: 'b' }]));
assert.equal(sig, fixturesSignature([base, { ...base, id: 'a_slot1', parentId: 'a' }]));
console.log('PASS fixture-shapes: chân diện, hộp theo hướng xoay, chữ ký');
