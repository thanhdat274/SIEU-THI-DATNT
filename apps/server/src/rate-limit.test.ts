import assert from 'node:assert/strict';
import { RATE_LIMITS, RateLimiter } from './rate-limit.js';
import { allowSocketMessage } from './world.gateway.js';
import { createServer } from './bootstrap.js';

const limiter = new RateLimiter(3, 1000);
assert.equal(limiter.take('a', 0), true);
assert.equal(limiter.take('a', 100), true);
assert.equal(limiter.take('a', 200), true);
assert.equal(limiter.take('a', 300), false, 'vượt hạn mức trong cùng cửa sổ');
assert.equal(limiter.take('b', 300), true, 'khóa khác không bị ảnh hưởng');
assert.equal(limiter.take('a', 999), false, 'vẫn trong cửa sổ');
assert.equal(limiter.take('a', 1000), true, 'cửa sổ mới cấp lại hạn mức');
assert.equal(limiter.take('a', 1001), true);
assert.equal(limiter.take('a', 1002), true);
assert.equal(limiter.take('a', 1003), false);

// Dọn khóa hết hạn để bộ nhớ không phình.
const sweeper = new RateLimiter(1, 1000);
for (let i = 0; i < 100; i++) sweeper.take(`k${i}`, 0);
assert.equal(sweeper.size, 100);
sweeper.take('fresh', 5000);
assert.equal(sweeper.size, 1, 'khóa cũ bị dọn sau khi hết cửa sổ');

assert.throws(() => new RateLimiter(0, 1000));
assert.throws(() => new RateLimiter(1, 0));
assert.throws(() => new RateLimiter(1.5, 1000));

// WebSocket: vượt hạn mức bị bỏ qua, lặp lại nhiều lần thì đóng kết nối 1008.
let closed: Array<[number | undefined, string | undefined]> = [];
const socket = { close: (code?: number, reason?: string) => { closed.push([code, reason]); } };
for (let i = 0; i < RATE_LIMITS.wsMessagesPerSocketPerSec; i++) assert.equal(allowSocketMessage(socket, 0), true);
assert.equal(allowSocketMessage(socket, 1), false, 'thông điệp vượt hạn mức bị bỏ qua');
assert.equal(closed.length, 0, 'một lần vượt chưa đóng kết nối');
for (let i = 0; i < RATE_LIMITS.wsViolationsBeforeClose; i++) allowSocketMessage(socket, 2);
assert.deepEqual(closed[0], [1008, 'Too many messages'], 'vượt nhiều lần thì đóng kết nối');
closed = [];
assert.equal(allowSocketMessage(socket, 5000), true, 'cửa sổ mới cấp lại hạn mức');

// HTTP: thân JSON quá lớn bị từ chối trước khi tới guard xác thực.
async function checkHttpBodyLimit() {
  const app = await createServer();
  await app.listen(0, '127.0.0.1');
  try {
    const address = app.getHttpServer().address() as { port: number };
    const big = JSON.stringify({ pad: 'x'.repeat(3 * 1024 * 1024) });
    const res = await fetch(`http://127.0.0.1:${address.port}/api/v1/worlds`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: big });
    assert.equal(res.status, 413, 'thân JSON 3 MB bị từ chối 413');
    const ok = await fetch(`http://127.0.0.1:${address.port}/health`);
    assert.equal(ok.status, 200, 'yêu cầu nhỏ bình thường vẫn được phục vụ');
  } finally {
    await app.close();
  }
}

void checkHttpBodyLimit().then(() => {
  console.log('PASS rate-limit: cửa sổ cố định, WS đóng khi lạm dụng, HTTP 413 khi thân JSON quá lớn, dọn bộ nhớ, cấu hình sai bị từ chối');
}).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
