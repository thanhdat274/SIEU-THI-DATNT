import assert from 'node:assert/strict';
import { DRAG_THRESHOLD_PX, exceedsDragThreshold, isClickRelease } from './pointer-gesture';

const o = { x: 100, y: 100 };
assert.equal(DRAG_THRESHOLD_PX, 4);
assert.equal(exceedsDragThreshold(o, { x: 100, y: 100 }), false);
assert.equal(exceedsDragThreshold(o, { x: 103, y: 100 }), false, '3px: vẫn là click');
assert.equal(exceedsDragThreshold(o, { x: 102, y: 103 }), false, '3.6px: vẫn là click');
assert.equal(exceedsDragThreshold(o, { x: 104, y: 100 }), false, 'đúng 4px chưa tính kéo');
assert.equal(exceedsDragThreshold(o, { x: 105, y: 100 }), true, '5px: kéo');
assert.equal(exceedsDragThreshold(o, { x: 103, y: 103 }), true, 'chéo 4.2px: kéo');

// Chuột trái: chưa kéo thì thả = click; đã kéo thì thả KHÔNG tính click; nút giữa/phải không bao giờ là click.
assert.equal(isClickRelease(0, false), true);
assert.equal(isClickRelease(0, true), false);
assert.equal(isClickRelease(1, false), false);
assert.equal(isClickRelease(2, false), false);
console.log('PASS pointer-gesture: ngưỡng 4px phân biệt click/kéo cho cả chuột trái');
