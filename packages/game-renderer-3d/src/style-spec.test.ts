import assert from 'node:assert/strict';
import { BUILDING_VISUALS } from '@game/data';
import { fixtureBoxes } from './fixture-shapes';
import {
  PALETTE, PALETTE_HEXES, GROCERY_STYLE, GROCERY_FIXTURE_COLORS, SIGN_MIN_CONTRAST,
  contrastRatio, hexToRgb, isPastelToy, relativeLuminance,
} from './style-spec';

// Hàm màu: giá trị đã biết.
assert.deepEqual(hexToRgb('#ff8000'), [255, 128, 0]);
assert.throws(() => hexToRgb('ff8000'), /không hợp lệ/);
assert.ok(Math.abs(relativeLuminance('#ffffff') - 1) < 1e-9);
assert.equal(relativeLuminance('#000000'), 0);
assert.ok(Math.abs(contrastRatio('#000000', '#ffffff') - 21) < 1e-9, 'đen/trắng = 21:1');
assert.ok(Math.abs(contrastRatio('#777777', '#ffffff') - contrastRatio('#ffffff', '#777777')) < 1e-12, 'đối xứng');

// Bảng màu: hex hợp lệ, không trùng, đúng tinh thần pastel đồ chơi.
const entries = Object.entries(PALETTE);
assert.ok(entries.length >= 20 && entries.length <= 28, `bảng màu gọn (20..28 token), hiện ${entries.length}`);
assert.equal(PALETTE_HEXES.size, entries.length, 'không có hai token trùng màu');
for (const [name, hex] of entries) {
  assert.match(hex, /^#[0-9a-f]{6}$/, `${name}: hex hợp lệ`);
  assert.ok(isPastelToy(hex), `${name} (${hex}) vượt ngưỡng pastel đồ chơi (quá bão hòa hoặc quá tối)`);
}
assert.equal(isPastelToy('#ff0000'), false, 'đỏ thuần bão hòa: không pastel');
assert.equal(isPastelToy('#0a3d00'), false, 'xanh rất tối: không pastel');
assert.equal(isPastelToy('#222222'), true, 'xám tối trung tính vẫn được (trung tính)');

// Tòa tạp hóa: BUILDING_VISUALS lấy đúng từ token, chữ biển đọc được, sọc mái hiên và mái/tường tách nhau.
const grocery = BUILDING_VISUALS.grocery_main;
assert.equal(grocery.wall, GROCERY_STYLE.wall);
assert.equal(grocery.roof, GROCERY_STYLE.roof);
assert.deepEqual([...grocery.awning], [...GROCERY_STYLE.awning]);
assert.equal(grocery.signBg, GROCERY_STYLE.signBg);
assert.equal(grocery.signText, GROCERY_STYLE.signText);
for (const hex of [grocery.wall, grocery.roof, ...grocery.awning, grocery.signBg, grocery.signText]) {
  assert.ok(PALETTE_HEXES.has(hex), `${hex} của tạp hóa phải thuộc bảng màu`);
}
assert.ok(contrastRatio(grocery.signBg, grocery.signText) >= SIGN_MIN_CONTRAST, `chữ biển tạp hóa tương phản ${contrastRatio(grocery.signBg, grocery.signText).toFixed(2)} < ${SIGN_MIN_CONTRAST}`);
assert.ok(contrastRatio(grocery.awning[0], grocery.awning[1]) >= 1.5, 'hai màu sọc mái hiên phải tách nhau');
assert.ok(contrastRatio(grocery.wall, grocery.roof) >= 1.3, 'mái phải tách khỏi tường');

// Nội thất tạp hóa: mọi vai trò màu thuộc bảng màu, và hình dựng thật (kệ gỗ, kệ kính, tủ lạnh, quầy) không có hex ngoài bảng.
for (const [role, hex] of Object.entries(GROCERY_FIXTURE_COLORS)) assert.ok(PALETTE_HEXES.has(hex), `${role} (${hex}) phải thuộc bảng màu`);
const at = { tileX: 0, tileY: 0, rotation: 0 } as const;
const groceryFixtures = [
  { type: 'shelf_wooden', widthTiles: 2, heightTiles: 1 },
  { type: 'shelf_glass', widthTiles: 2, heightTiles: 1 },
  { type: 'refrigerator', widthTiles: 2, heightTiles: 1 },
  { type: 'cashier_counter', widthTiles: 2, heightTiles: 1 },
] as const;
for (const fx of groceryFixtures) {
  for (const box of fixtureBoxes({ ...fx, ...at })) {
    assert.ok(PALETTE_HEXES.has(box.color), `${fx.type}: màu ${box.color} không thuộc bảng màu`);
  }
}

console.log('PASS style-spec: hàm màu, bảng màu pastel, tạp hóa dùng token, chữ biển đủ tương phản, nội thất tạp hóa không hex lạ');
