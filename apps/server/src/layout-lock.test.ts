import assert from 'node:assert/strict';
import { LayoutLockRegistry, LAYOUT_LOCK_TTL_MS } from './layout-lock';

const r = new LayoutLockRegistry();
assert.equal(r.acquire('w', 'a', 0), true);
assert.equal(r.acquire('w', 'b', 1), false, 'người thứ hai bị từ chối');
assert.equal(r.acquire('w', 'a', 2), true, 'người giữ lấy lại được');
assert.equal(r.holder('w', 3), 'a');
assert.equal(r.release('w', 'b', 4), false, 'người khác không nhả hộ được');
r.renew('w', 'a', LAYOUT_LOCK_TTL_MS);
assert.equal(r.holder('w', LAYOUT_LOCK_TTL_MS + 10), 'a', 'gia hạn kéo dài khóa');
assert.equal(r.holder('w', LAYOUT_LOCK_TTL_MS * 3), null, 'hết hạn thì tự nhả');
assert.equal(r.acquire('w', 'b', LAYOUT_LOCK_TTL_MS * 3), true);
assert.equal(r.release('w', 'b', LAYOUT_LOCK_TTL_MS * 3), true);
assert.equal(r.holder('w', LAYOUT_LOCK_TTL_MS * 3), null);
assert.equal(r.acquire('x', 'a', 0), true, 'hẻm khác độc lập');
console.log('PASS layout-lock');
