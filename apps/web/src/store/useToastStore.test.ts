/**
 * Tests cho toast store (pure logic từ useGameStore).
 * Chạy độc lập: `node --experimental-strip-types apps/web/src/store/useToastStore.test.ts`
 */
import assert from 'node:assert/strict';
import { useGameStore } from './useGameStore';

/** Lấy một mock store (reset giữa các test) */
function resetStore() {
  useGameStore.setState({ toasts: [] });
}

function testToastMaxCount() {
  console.log('--- Test: Toast max 2 items ---');

  resetStore();

  // Thêm 3 toasts
  useGameStore.getState().addToast('Toast 1', 'info');
  assert.equal(useGameStore.getState().toasts.length, 1);

  useGameStore.getState().addToast('Toast 2', 'info');
  assert.equal(useGameStore.getState().toasts.length, 2);

  useGameStore.getState().addToast('Toast 3', 'success');
  // Max 2: toast cũ nhất bị xóa
  assert.equal(useGameStore.getState().toasts.length, 2, 'Toast giữ tối đa 2');
  // Toast đầu tiên bị xóa, còn Toast 2 và Toast 3
  const ids = useGameStore.getState().toasts.map(t => t.message);
  assert.ok(ids.includes('Toast 2'), 'Toast 2 còn lại');
  assert.ok(ids.includes('Toast 3'), 'Toast 3 còn lại');
  assert.ok(!ids.includes('Toast 1'), 'Toast 1 bị xóa');

  console.log('  ✓ Passed: max 2 regular toasts\n');
}

function testToastRemove() {
  console.log('--- Test: Toast remove ---');

  resetStore();

  useGameStore.getState().addToast('Toast A', 'info');
  useGameStore.getState().addToast('Toast B', 'success');
  const firstId = useGameStore.getState().toasts[0].id;

  useGameStore.getState().removeToast(firstId);
  assert.equal(useGameStore.getState().toasts.length, 1, 'Sau khi xóa, còn 1 toast');
  assert.equal(useGameStore.getState().toasts[0].message, 'Toast B');

  console.log('  ✓ Passed: removeToast xóa đúng item\n');
}

function testToastRatingReplacement() {
  console.log('--- Test: Rating toast thay thế các rating cũ ---');

  resetStore();

  // Thêm 2 toast thường
  useGameStore.getState().addToast('Toast thường 1', 'info');
  useGameStore.getState().addToast('Toast thường 2', 'success');
  assert.equal(useGameStore.getState().toasts.length, 2);

  // Thêm rating toast — thay thế toast thường đầu tiên, giữ lại 1 toast thường + 1 rating
  useGameStore.getState().addToast('Đánh giá: 4.5★', 'info', 'rating');
  assert.equal(useGameStore.getState().toasts.length, 2, 'Vẫn giữ 2 item');
  const ratings = useGameStore.getState().toasts.filter(t => t.kind === 'rating');
  assert.equal(ratings.length, 1, 'Chỉ có 1 rating toast');
  assert.equal(ratings[0].message, 'Đánh giá: 4.5★');

  // Thêm rating toast khác — thay thế rating cũ
  useGameStore.getState().addToast('Đánh giá: 3★', 'warn', 'rating');
  assert.equal(useGameStore.getState().toasts.length, 2);
  const ratings2 = useGameStore.getState().toasts.filter(t => t.kind === 'rating');
  assert.equal(ratings2.length, 1, 'Chỉ có 1 rating toast');
  assert.equal(ratings2[0].message, 'Đánh giá: 3★');
  assert.ok(useGameStore.getState().toasts.some(t => t.message === 'Toast thường 2'), 'Toast thường 2 vẫn còn');

  console.log('  ✓ Passed: rating toast thay thế rating cũ, giữ toast thường\n');
}

function testToastTypes() {
  console.log('--- Test: Toast types ---');

  resetStore();

  useGameStore.getState().addToast('info', 'info');
  useGameStore.getState().addToast('success', 'success');
  useGameStore.getState().addToast('warn', 'warn');

  const toasts = useGameStore.getState().toasts;
  assert.equal(toasts[0].type, 'info');
  assert.equal(toasts[1].type, 'success');
  assert.ok(toasts[2].type === 'warn');

  // Mặc định = 'info'
  useGameStore.getState().addToast('default');
  const last = useGameStore.getState().toasts[useGameStore.getState().toasts.length - 1];
  assert.equal(last.type, 'info');

  console.log('  ✓ Passed: toast types đúng\n');
}

function runTests() {
  console.log('\n=== Toast Store Tests ===\n');
  testToastMaxCount();
  testToastRemove();
  testToastRatingReplacement();
  testToastTypes();
  console.log('All tests passed! ✅');
}

runTests();
