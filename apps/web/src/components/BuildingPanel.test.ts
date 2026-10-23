import assert from 'node:assert/strict';
import { sanitizeBuildingTitle, sanitizeBuildingTypeLabel } from './building-name';

console.log('Testing BuildingPanel title & typeLabel sanitization...');

// 1. Tiệm chính: grocery_main và main
const mainTitle = sanitizeBuildingTitle('grocery_main');
const mainType = sanitizeBuildingTypeLabel('grocery_main');
assert.equal(mainTitle, 'Tiệm Tạp Hóa Đầu Hẻm', 'grocery_main phải có tên tiếng Việt đầy đủ');
assert.equal(mainType, 'Cửa hàng chính', 'grocery_main phải có dòng phụ tiếng Việt');
assert.ok(!mainTitle.includes('_'), 'grocery_main title không được chứa _');
assert.ok(!mainType.includes('_'), 'grocery_main typeLabel không được chứa _');

assert.equal(sanitizeBuildingTitle('main'), 'Tiệm Tạp Hóa Đầu Hẻm');
assert.equal(sanitizeBuildingTypeLabel('main'), 'Cửa hàng chính');

// 2. Các loại tòa phụ và công trình công cộng
const sampleIds = [
  'grocery_main',
  'grocery_main-1',
  'main',
  'xoi_shop',
  'xoi-1',
  'drink_shop',
  'drink-1',
  'snack_shop',
  'snack-1',
  'cafe',
  'cafe-1',
  'com_restaurant',
  'com_restaurant-1',
  'grocery_branch',
  'grocery_branch-1',
  'clinic',
  'clinic-1',
  'ward_police',
  'ward_police-1',
  'primary_school',
  'primary_school-1',
  'civic_wide',
  'building-wide-a',
  'parking_lot',
  'parking_lot-1',
  'park',
  'park-1',
  'random_unknown_sub_building_test_id',
];

for (const id of sampleIds) {
  const title = sanitizeBuildingTitle(id);
  const typeLabel = sanitizeBuildingTypeLabel(id, title);

  assert.ok(!title.includes('_'), `Tên tòa "${id}" -> "${title}" không được chứa ký tự '_'`);
  assert.ok(!typeLabel.includes('_'), `Dòng phụ tòa "${id}" -> "${typeLabel}" không được chứa ký tự '_'`);
  assert.ok(title.length > 0, `Tên tòa "${id}" không được để trống`);
  assert.ok(typeLabel.length > 0, `Dòng phụ "${id}" không được để trống`);
}

// 3. Chuỗi ngẫu nhiên có dấu gạch dưới được dọn sạch hoàn toàn
assert.equal(sanitizeBuildingTitle('khu_dat_cho_thue_moi'), 'khu dat cho thue moi');
assert.equal(sanitizeBuildingTypeLabel('mo_rong_hem_so_3'), 'mo rong hem so 3');

console.log('PASS BuildingPanel: toàn bộ tên và dòng phụ tòa nhà là tiếng Việt, không chứa ký tự _');
