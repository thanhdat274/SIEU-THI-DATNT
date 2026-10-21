import assert from 'node:assert/strict';
import { fixtureFootprint, SHELF_HEIGHT, SHELF_TIER_Y, shelfFrontZ } from './fixture-shapes';
import { iconCount, shelfStockQuads, soldOutSignQuad, stallSignQuad, TIER_Y } from './shelf-stock';

const shelf = { type: 'shelf_wooden', tileX: 10, tileY: 5, widthTiles: 2, heightTiles: 1, rotation: 0 } as const;
const slots = (n: number, stock: number) => Array.from({ length: n }, () => ({ assignedProductId: 'mi_tom', currentStock: stock }));

// Số icon tỉ lệ với tồn: đầy → tối đa, vơi → ít hơn, còn hàng thì ≥ 1, hết thì 0.
assert.equal(iconCount(20, 20, 3), 3);
assert.equal(iconCount(10, 20, 3), 2);
assert.equal(iconCount(1, 20, 3), 1);
assert.equal(iconCount(0, 20, 3), 0);
assert.equal(iconCount(5, 0, 3), 0);

const full = shelfStockQuads(shelf, slots(12, 20), () => 20);
const half = shelfStockQuads(shelf, slots(12, 8), () => 20);
const empty = shelfStockQuads(shelf, slots(12, 0), () => 20);
assert.ok(full.length > half.length && half.length > 0);
assert.equal(empty.length, 0);
// Ô không gán sản phẩm thì không có icon.
assert.equal(shelfStockQuads(shelf, [{ assignedProductId: undefined, currentStock: 5 }], () => 20).length, 0);

// Mọi icon nằm trong chân diện, đúng độ cao các tầng, và có kích thước dương.
for (const rotation of [0, 90, 180, 270] as const) {
  const f = { ...shelf, rotation };
  const fp = fixtureFootprint(f);
  for (const q of shelfStockQuads(f, slots(12, 20), () => 20)) {
    assert.ok(q.cx >= fp.x0 && q.cx <= fp.x0 + fp.w && q.cz >= fp.z0 && q.cz <= fp.z0 + fp.d, `icon trong chân diện rot ${rotation}`);
    assert.ok(q.cy - q.h / 2 >= SHELF_TIER_Y[0] - 1e-9 && q.cy + q.h / 2 <= SHELF_HEIGHT + 0.05, 'icon trong khoảng cao kệ');
    assert.ok(SHELF_TIER_Y.some(y => Math.abs(q.cy - q.h / 2 - y) < 1e-9), 'icon đặt trên mặt một tầng ván');
    assert.ok(q.w > 0 && Math.abs(Math.hypot(q.rx, q.rz) - 1) < 1e-9);
  }
}
// Hướng "phải" của mặt trước theo xoay: 0 → +x, 90 → +z, 180 → -x, 270 → -z.
const dir = (rotation: 0 | 90 | 180 | 270) => shelfStockQuads({ ...shelf, rotation }, slots(12, 20), () => 20)[0];
assert.deepEqual([dir(0).rx, dir(0).rz], [1, 0]);
assert.deepEqual([dir(90).rx, dir(90).rz], [0, 1]);
assert.deepEqual([dir(180).rx, dir(180).rz], [-1, 0]);
assert.deepEqual([dir(270).rx, dir(270).rz], [0, -1]);

// Tái hiện: kệ 'shelf_wooden_noodles' (12 ô, chỉ ô gốc gán mi_hao_hao, tồn 20/20) phải ra icon, nằm nhô ra trước ván ở quarter 0.
const noodles = { type: 'shelf_wooden', tileX: 8, tileY: 5, widthTiles: 2, heightTiles: 1, rotation: 0 } as const;
const noodleSlots = [{ assignedProductId: 'mi_hao_hao', currentStock: 20 }, ...Array.from({ length: 11 }, () => ({ assignedProductId: undefined, currentStock: 0 }))];
const noodleQuads = shelfStockQuads(noodles, noodleSlots, () => 20);
assert.ok(noodleQuads.length > 0, 'kệ mì có icon');
const boardFront = 5.5 + shelfFrontZ(1); // tâm chân diện + mép trước ván kệ gondola
for (const q of noodleQuads) {
  assert.ok(q.cz >= boardFront + 0.02 && q.cz <= boardFront + 0.05, 'icon nhô ~0.03 ra trước mép ván, qua dải nhãn giá');
  assert.ok(q.w >= 0.2, 'icon đủ lớn để thấy');
}
// Hàng xếp kín bề ngang ô: các icon của một ô cách đều và phủ ~toàn bề rộng ô, không chồng nhau.
const row = noodleQuads.filter(q => q.cy === noodleQuads[0].cy).sort((a, b) => a.cx - b.cx);
assert.ok(row.length >= 2, 'ô đầy có ≥ 2 icon trên một tầng');
for (let i = 1; i < row.length; i++) assert.ok(Math.abs(row[i].cx - row[i - 1].cx - row[0].w) < 1e-9, 'icon liền nhau, đều khoảng cách');

// Biển HẾT không gắn sản phẩm; biển quầy nằm giữa quầy.
assert.equal(soldOutSignQuad(shelf).productId, null);
// Biển HẾT của kệ nằm trên dải nhãn giá tầng 2: đáy biển ở mặt ván, trước mép ván, trong chiều cao kệ.
const soldOut = soldOutSignQuad(shelf);
assert.ok(Math.abs(soldOut.cy - soldOut.h / 2 - SHELF_TIER_Y[1]) < 1e-9, 'đáy biển ở mặt ván tầng 2');
assert.ok(soldOut.cz > 5.5 + shelfFrontZ(1) && soldOut.cy + soldOut.h / 2 < SHELF_HEIGHT, 'biển trước mép ván, trong kệ');
// Tủ mát giữ mốc cũ.
assert.equal(shelfStockQuads({ ...shelf, type: 'refrigerator' }, slots(3, 20), () => 20).length > 0, true);
assert.ok(TIER_Y.length === 3);
const sign = stallSignQuad({ tileX: 4, tileY: 20, widthTiles: 2 });
assert.equal(sign.productId, null);
assert.equal(sign.cx, 5);
console.log('PASS shelf-stock: số icon theo tồn, vị trí theo tầng/hướng xoay, biển HẾT');
