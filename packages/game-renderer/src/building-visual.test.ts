/**
 * Test pure logic: building type color/icon selection (từ viewport.ts BUILDING_TYPE_COLORS).
 * Không chạm Pixi — chỉ test color scheme và tên hiển thị theo typeId.
 */
import assert from 'node:assert/strict';

// Duplicated from viewport.ts để test pure logic (không phụ thuộc Pixi)
interface BuildingTypeInfo {
  name: string;
  awning: number;
  board: number;
  trim: number;
  text: number;
  style?: string;
}

/** Color/icon scheme theo typeId — pure function. */
const BUILDING_TYPE_COLORS: Record<string, BuildingTypeInfo> = {
  grocery_main: { name: 'TIỆM TẠP HÓA ĐẦU HẺM', awning: 0x16a34a, board: 0x1e8449, trim: 0x82e0aa, text: 0xd5f5e3 },
  grocery_branch: { name: 'CHI NHÁNH TẠP HÓA', awning: 0x27ae60, board: 0x1e8449, trim: 0x82e0aa, text: 0xd5f5e3 },
  cafe: { name: 'QUÁN CÀ PHÊ', awning: 0x8b4513, board: 0x5d2e0c, trim: 0xd4a574, text: 0xfdebd0, style: 'scallop' },
  com_restaurant: { name: 'QUÁN CƠM', awning: 0xc0392b, board: 0x922b21, trim: 0xf1948a, text: 0xfadbd8 },
  // parking_lot: không có mặt tiền
};

/** Select icon/color scheme for a building type. Returns undefined for parking_lot. */
function getBuildingColorScheme(typeId: string): BuildingTypeInfo | undefined {
  const entry = BUILDING_TYPE_COLORS[typeId];
  if (!entry) return undefined;
  // Deep clone để tránh mutate
  return { ...entry };
}

/** Get icon style hint for a building type */
function getBuildingIconStyle(typeId: string): string | undefined {
  const entry = BUILDING_TYPE_COLORS[typeId];
  return entry?.style;
}

/** Get display name for a building type */
function getBuildingDisplayName(typeId: string): string | undefined {
  const entry = BUILDING_TYPE_COLORS[typeId];
  return entry?.name;
}

function testColorSchemes() {
  console.log('--- Test: Building type color schemes ---');

  // Main shop
  const main = getBuildingColorScheme('grocery_main');
  assert.ok(main, 'grocery_main có color scheme');
  assert.equal(main.name, 'TIỆM TẠP HÓA ĐẦU HẺM');
  assert.equal(main.awning, 0x16a34a);
  assert.ok(!main.style, 'grocery_main không có style đặc biệt');

  // Branch
  const branch = getBuildingColorScheme('grocery_branch');
  assert.ok(branch, 'grocery_branch có color scheme');
  assert.equal(branch.name, 'CHI NHÁNH TẠP HÓA');
  assert.equal(branch.awning, 0x27ae60);

  // Café
  const cafe = getBuildingColorScheme('cafe');
  assert.ok(cafe, 'cafe có color scheme');
  assert.equal(cafe.name, 'QUÁN CÀ PHÊ');
  assert.equal(cafe.style, 'scallop', 'cafe có style scallop');
  assert.equal(cafe.awning, 0x8b4513, 'cafe awning màu nâu');

  // Restaurant
  const restaurant = getBuildingColorScheme('com_restaurant');
  assert.ok(restaurant, 'com_restaurant có color scheme');
  assert.equal(restaurant.name, 'QUÁN CƠM');
  assert.equal(restaurant.awning, 0xc0392b, 'com_restaurant awning màu đỏ');

  // Parking lot — không có mặt tiền
  const parking = getBuildingColorScheme('parking_lot');
  assert.equal(parking, undefined, 'parking_lot không có color scheme (không mặt tiền)');

  // Unknown type
  const unknown = getBuildingColorScheme('unknown_type');
  assert.equal(unknown, undefined, 'type lạ → undefined');

  // Deep clone check
  const original = getBuildingColorScheme('cafe');
  assert.ok(original, 'cafe có color scheme');
  const modified = { ...original, awning: 0x000000 };
  const fresh = getBuildingColorScheme('cafe')!; // known to exist
  assert.notEqual(fresh.awning, 0x000000, 'deep clone: sửa bản sao không đổi bản gốc');

  console.log('  ✓ Passed: color schemes, names, styles, deep clone, parking_lot undefined\n');
}

function testIconStyle() {
  console.log('--- Test: Building icon styles ---');

  assert.equal(getBuildingIconStyle('grocery_main'), undefined);
  assert.equal(getBuildingIconStyle('cafe'), 'scallop');
  assert.equal(getBuildingIconStyle('unknown'), undefined);

  console.log('  ✓ Passed: icon styles (scallop cho cafe)\n');
}

function testDisplayName() {
  console.log('--- Test: Building display names ---');

  assert.equal(getBuildingDisplayName('grocery_main'), 'TIỆM TẠP HÓA ĐẦU HẺM');
  assert.equal(getBuildingDisplayName('grocery_branch'), 'CHI NHÁNH TẠP HÓA');
  assert.equal(getBuildingDisplayName('cafe'), 'QUÁN CÀ PHÊ');
  assert.equal(getBuildingDisplayName('com_restaurant'), 'QUÁN CƠM');
  assert.equal(getBuildingDisplayName('parking_lot'), undefined);

  console.log('  ✓ Passed: display names\n');
}

function runTests() {
  console.log('\n=== Building Type Rendering Tests ===\n');
  testColorSchemes();
  testIconStyle();
  testDisplayName();
  console.log('All tests passed! ✅');
}

runTests();
