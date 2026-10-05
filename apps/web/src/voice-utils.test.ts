import assert from 'node:assert/strict';
import { DEFAULT_ICE_SERVERS, createSpeakingDetector, describeMicError, isOfferer, parseIceServers, rmsLevel } from './voice-utils';

// ICE servers: mặc định STUN, ghi đè bằng JSON hợp lệ, sai định dạng quay về mặc định.
assert.deepEqual(parseIceServers(undefined), DEFAULT_ICE_SERVERS);
assert.deepEqual(parseIceServers('  '), DEFAULT_ICE_SERVERS);
assert.deepEqual(parseIceServers('không phải json'), DEFAULT_ICE_SERVERS);
assert.deepEqual(parseIceServers('{"urls":"stun:x"}'), DEFAULT_ICE_SERVERS);
assert.deepEqual(parseIceServers('[]'), DEFAULT_ICE_SERVERS);
assert.deepEqual(parseIceServers('[{"urls":"turn:t.example:3478","username":"u","credential":"c"}]'),
  [{ urls: 'turn:t.example:3478', username: 'u', credential: 'c' }]);
assert.deepEqual(parseIceServers('[{"urls":["stun:a","stun:b"]}]'), [{ urls: ['stun:a', 'stun:b'] }]);
assert.deepEqual(parseIceServers('[{"urls":"stun:a"},{"nourls":1}]'), DEFAULT_ICE_SERVERS, 'một phần tử sai thì bỏ cả cấu hình');

// Offerer: đúng một bên, đối xứng.
assert.equal(isOfferer('aaa', 'bbb'), true);
assert.equal(isOfferer('bbb', 'aaa'), false);
assert.notEqual(isOfferer('x1', 'x2'), isOfferer('x2', 'x1'));

// Speaking detector: bật khi vượt ngưỡng, giữ trong holdMs, rồi tắt.
const detector = createSpeakingDetector(0.05, 300);
assert.equal(detector.update(0.01, 0), false);
assert.equal(detector.update(0.2, 100), true);
assert.equal(detector.update(0.01, 250), true, 'còn trong thời gian giữ');
assert.equal(detector.update(0.01, 450), false, 'hết thời gian giữ');
assert.equal(detector.update(0.2, 500), true);

// RMS: im lặng = 0, sóng đầy biên độ ≈ 1.
assert.equal(rmsLevel([]), 0);
assert.equal(rmsLevel(new Uint8Array(64).fill(128)), 0);
assert.ok(Math.abs(rmsLevel(Uint8Array.from({ length: 64 }, (_, i) => (i % 2 ? 0 : 255)))) > 0.99);

// Lỗi mic.
assert.match(describeMicError({ name: 'NotAllowedError' }, true), /từ chối/);
assert.match(describeMicError({ name: 'NotFoundError' }, true), /Không tìm thấy/);
assert.match(describeMicError({ name: 'NotReadableError' }, true), /ứng dụng khác/);
assert.match(describeMicError(new Error('x'), true), /Không bật được/);
assert.match(describeMicError(undefined, false), /HTTPS/);

console.log('voice-utils tests passed');
