import assert from 'node:assert/strict';
import { detectWebGL } from './webgl-support';

assert.equal(detectWebGL(() => ({ getContext: () => null })), false);
assert.equal(detectWebGL(() => ({ getContext: (id: string) => (id === 'webgl' ? {} : null) })), true);
assert.equal(detectWebGL(() => ({ getContext: (id: string) => (id === 'webgl2' ? {} : null) })), true);
assert.equal(detectWebGL(() => { throw new Error('no canvas'); }), false);

console.log('PASS webgl-support: phát hiện WebGL, lỗi tạo canvas coi như không có');
