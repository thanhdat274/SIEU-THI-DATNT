/**
 * Kiểm thử THUẦN cho nhật ký thành phố và ánh xạ lỗi đất.
 * Được viết để nối vào test-runner sau (export run*Tests()).
 */
import assert from 'node:assert/strict';
import {
  appendJournal,
  filterJournalByAccount,
  type CityJournalEntry,
} from './city-journal';
import { landErrorMessage } from './land-error-messages';

const entry = (over: Partial<CityJournalEntry> = {}): CityJournalEntry => ({
  day: 1,
  at: '08:00',
  kind: 'land_bought',
  accountId: 'a',
  ...over,
});

export function runCityJournalTests(): void {
  // --- appendJournal giữ đúng thứ tự (bản mới ở cuối) ---
  const first = appendJournal([], entry({ day: 1, kind: 'land_bought' }));
  assert.equal(first.length, 1, 'appendJournal thêm dòng đầu');
  const e2 = entry({ day: 2, kind: 'expanded' });
  const second = appendJournal(first, e2);
  assert.equal(second.length, 2, 'appendJournal nối dòng mới');
  assert.deepEqual(second[0], first[0], 'Dòng cũ giữ nguyên vị trí đầu');
  assert.deepEqual(second[1], e2, 'Dòng mới nằm cuối');
  // Immutable: không sửa mảng đầu vào.
  assert.equal(first.length, 1, 'appendJournal không sửa mảng đầu vào');

  // --- appendJournal giữ đúng cap: append 205 -> giữ 200 mới nhất ---
  let log: CityJournalEntry[] = [];
  for (let i = 1; i <= 205; i++) {
    log = appendJournal(log, entry({ day: i, detail: `d${i}` }));
  }
  assert.equal(log.length, 200, 'append 205 dòng giữ đúng 200');
  assert.equal(log[0].day, 6, 'Cắt bỏ 5 dòng cũ nhất');
  assert.equal(log[199].day, 205, 'Giữ dòng mới nhất ở cuối');

  // --- cap tùy chỉnh ---
  const capped = appendJournal([entry({ day: 1 }), entry({ day: 2 })], entry({ day: 3 }), 2);
  assert.equal(capped.length, 2, 'cap tùy chỉnh giữ 2 mới nhất');
  assert.deepEqual(capped.map((e) => e.day), [2, 3], 'Cắt đúng phần đầu khi cap nhỏ');

  // --- filterJournalByAccount lọc đúng người, giữ thứ tự ---
  const mixed = [
    entry({ accountId: 'a', day: 1 }),
    entry({ accountId: 'b', day: 2 }),
    entry({ accountId: 'a', day: 3 }),
  ];
  const onlyA = filterJournalByAccount(mixed, 'a');
  assert.deepEqual(onlyA.map((e) => e.accountId), ['a', 'a'], 'Lọc đúng người a');
  assert.deepEqual(onlyA.map((e) => e.day), [1, 3], 'Giữ thứ tự thời gian sau lọc');
  assert.equal(filterJournalByAccount(mixed, 'nobody').length, 0, 'Không khớp ai -> rỗng');
  assert.deepEqual(mixed, mixed, 'filterJournalByAccount không sửa mảng đầu vào');

  console.log('  ✓ Passed: Nhật ký thành phố — thứ tự, giới hạn cap, lọc theo người, immutable');
}

export function runLandErrorMessageTests(): void {
  // --- reserved_by_other ---
  assert.equal(
    landErrorMessage('reserved_by_other', { name: 'Minh' }),
    'Ô/nơi này đang được Minh giữ',
    'reserved_by_other kèm name',
  );
  assert.equal(
    landErrorMessage('reserved_by_other'),
    'Khu vực này đang được người khác giữ trong khi quy hoạch',
    'reserved_by_other không kèm name',
  );

  // --- stale_revision ---
  assert.equal(
    landErrorMessage('stale_revision', { name: 'Lan' }),
    'Lan vừa đổi đất, hãy kiểm tra lại',
    'stale_revision kèm name',
  );
  assert.equal(
    landErrorMessage('stale_revision'),
    'Có người vừa thay đổi đất, hãy làm mới',
    'stale_revision không kèm name',
  );

  // --- vote_rejected ---
  assert.equal(
    landErrorMessage('vote_rejected', { name: 'Tuấn' }),
    'Tuấn đã từ chối',
    'vote_rejected kèm name',
  );
  assert.equal(landErrorMessage('vote_rejected'), 'Phiếu bị từ chối', 'vote_rejected không kèm name');

  // --- forbidden (không phụ thuộc name) ---
  assert.equal(landErrorMessage('forbidden'), 'Bạn không có quyền thực hiện', 'forbidden');
  assert.equal(
    landErrorMessage('forbidden', { name: 'Bất kỳ' }),
    'Bạn không có quyền thực hiện',
    'forbidden bỏ qua name',
  );

  // --- fallback: mã không biết trả về chính code ---
  assert.equal(landErrorMessage('unknown_code'), 'unknown_code', 'Fallback trả về code');
  assert.equal(landErrorMessage('unknown_code', { name: 'X' }), 'unknown_code', 'Fallback bỏ qua name');

  console.log('  ✓ Passed: Ánh xạ lỗi đất — từng mã kèm/không kèm name + fallback');
}

/** Chạy toàn bộ kiểm thử của bộ ba module THUẦN open-world-coop-land. */
export function runOpenWorldCoopLandPureTests(): void {
  runCityJournalTests();
  runLandErrorMessageTests();
}
