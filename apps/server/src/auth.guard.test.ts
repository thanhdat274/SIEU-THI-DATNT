import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sanitizeDevClientId } from './auth.guard.js';

test('sanitizeDevClientId: header hợp lệ → định danh khách ổn định', () => {
  assert.equal(sanitizeDevClientId('a'), 'a');
  assert.equal(sanitizeDevClientId('B'), 'b');
  assert.equal(sanitizeDevClientId('  Player-1  '), 'player-1');
  // Ký tự đặc biệt/khoảng trắng bị lọc, tối đa 48 ký tự.
  assert.equal(sanitizeDevClientId('abc!@# (lab)'), 'abclab');
  const long = sanitizeDevClientId('x'.repeat(100));
  assert.ok(long && long.length === 48);
});

test('sanitizeDevClientId: header thiếu/không hợp lệ → null', () => {
  assert.equal(sanitizeDevClientId(undefined), null);
  assert.equal(sanitizeDevClientId(''), null);
  assert.equal(sanitizeDevClientId('   '), null);
  assert.equal(sanitizeDevClientId('!!!'), null);
});
