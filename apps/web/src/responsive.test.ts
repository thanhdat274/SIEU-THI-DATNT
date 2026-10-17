import assert from 'node:assert/strict';
import { densityFor, sizeClassFor, detectInitialInputMode } from './responsive';

console.log('--- Testing Responsive & Touch Detection ---');

// 1. Kiểm tra phân loại kích thước
assert.equal(sizeClassFor(360), 'compact');
assert.equal(sizeClassFor(568), 'compact');
assert.equal(sizeClassFor(640), 'medium');
assert.equal(sizeClassFor(852), 'medium');
assert.equal(sizeClassFor(1024), 'expanded');
assert.equal(sizeClassFor(1600), 'wide');

// 2. Kiểm tra mật độ theo 7 viewport chuẩn
// 852×393 (iPhone ngang): height < 500 -> compact
assert.equal(densityFor(852, 393), 'compact');
// 568×320 (iPhone SE ngang): height < 500 -> compact
assert.equal(densityFor(568, 320), 'compact');
// 740×360 (Android ngang): height < 500 -> compact
assert.equal(densityFor(740, 360), 'compact');
// 360×800 (Android dọc): width < 640 -> compact
assert.equal(densityFor(360, 800), 'compact');
// 393×852 (iPhone dọc): width < 640 -> compact
assert.equal(densityFor(393, 852), 'compact');
// 1024×768 (iPad ngang): normal
assert.equal(densityFor(1024, 768), 'normal');
// 1920×1080 (Desktop): comfortable
assert.equal(densityFor(1920, 1080), 'comfortable');

// 3. Kiểm tra tự động nhận diện chế độ nhập trong môi trường headless / node
assert.equal(detectInitialInputMode(), 'mouse');

console.log('PASS responsive: phân loại viewport chuẩn, mật độ màn hình và nhận diện phương thức nhập');
