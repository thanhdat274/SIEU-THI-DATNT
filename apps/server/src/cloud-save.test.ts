import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_INITIAL_SAVE } from '@game/data';
import { decideCloudSaveWrite, summarizeCloudSave } from './cloud-save.js';

test('ghi lần đầu khi chưa có bản cloud', () => {
  assert.deepEqual(decideCloudSaveWrite(null, null, DEFAULT_INITIAL_SAVE), { ok: true });
});

test('ghi đè khi expectedUpdatedAt khớp, 409 khi thiết bị khác đã ghi', () => {
  const existing = { updatedAt: '2026-10-03T01:00:00.000Z' };
  assert.deepEqual(decideCloudSaveWrite(existing, existing.updatedAt, DEFAULT_INITIAL_SAVE), { ok: true });
  assert.equal((decideCloudSaveWrite(existing, '2026-10-02T00:00:00.000Z', DEFAULT_INITIAL_SAVE) as { status: number }).status, 409);
  assert.equal((decideCloudSaveWrite(existing, null, DEFAULT_INITIAL_SAVE) as { status: number }).status, 409, 'Client tưởng chưa có nhưng đã có bản cloud');
  assert.equal((decideCloudSaveWrite(null, '2026-10-02T00:00:00.000Z', DEFAULT_INITIAL_SAVE) as { status: number }).status, 409, 'Client tưởng có nhưng đã bị xóa');
});

test('từ chối save hỏng hoặc tương lai, và expectedUpdatedAt sai kiểu', () => {
  assert.equal((decideCloudSaveWrite(null, null, { hello: 1 }) as { status: number }).status, 400);
  assert.equal((decideCloudSaveWrite(null, null, { ...DEFAULT_INITIAL_SAVE, schemaVersion: 9999 }) as { status: number }).status, 400);
  assert.equal((decideCloudSaveWrite(null, 5, DEFAULT_INITIAL_SAVE) as { status: number }).status, 400);
});

test('summary lấy đúng chỉ số', () => {
  const s = summarizeCloudSave(DEFAULT_INITIAL_SAVE, 'x');
  assert.equal(s.day, DEFAULT_INITIAL_SAVE.worldTime.day);
  assert.equal(s.updatedAt, 'x');
});
