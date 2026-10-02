import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';

/** navigator.locks giả đủ cho `request({ifAvailable})` và `query`: khóa giữ đến khi promise của callback kết thúc. */
function installFakeLocks(): { held: Set<string>; takeAsOtherTab: (name: string) => () => void } {
  const held = new Set<string>();
  const locks = {
    async request(name: string, _options: unknown, callback: (lock: { name: string } | null) => unknown) {
      if (held.has(name)) return callback(null);
      held.add(name);
      try { return await callback({ name }); } finally { held.delete(name); }
    },
    async query() { return { held: [...held].map((name) => ({ name })) }; },
  };
  Object.defineProperty(globalThis, 'navigator', { value: { locks }, configurable: true });
  return {
    held,
    takeAsOtherTab: (name) => { held.add(name); return () => void held.delete(name); },
  };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

// Không hỗ trợ Web Locks: coi như có khóa (không chặn người chơi), không có ô nào bị khóa nơi khác.
Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
const lock = await import('./slot-lock.js');
assert.equal(lock.slotLocksSupported(), false);
assert.equal(await lock.acquireSlotLock('local_save_default'), true);
assert.equal((await lock.slotsLockedElsewhere()).size, 0);

const fake = installFakeLocks();
assert.equal(lock.slotLocksSupported(), true);

// Lấy khóa thành công, ô khác vẫn lấy được ở tab này (tab giữ tối đa một ô: ô mới thay ô cũ).
assert.equal(await lock.acquireSlotLock('local_save_default'), true);
assert.ok(fake.held.has('tiem-tap-hoa-save-local_save_default'));
assert.equal(await lock.acquireSlotLock('local_save_slot_2'), true);
await tick();
assert.equal(fake.held.has('tiem-tap-hoa-save-local_save_default'), false, 'đổi ô thì nhả ô cũ');
assert.ok(fake.held.has('tiem-tap-hoa-save-local_save_slot_2'));

// Ô mình đang giữ không tính là "bị khóa nơi khác"; ô tab khác giữ thì có.
assert.equal((await lock.slotsLockedElsewhere()).size, 0);
const releaseOther = fake.takeAsOtherTab('tiem-tap-hoa-save-local_save_slot_3');
assert.deepEqual([...(await lock.slotsLockedElsewhere())], ['local_save_slot_3']);

// Tranh chấp: ô tab khác giữ thì không lấy được và không đổi ô đang giữ của mình sai lệch.
assert.equal(await lock.acquireSlotLock('local_save_slot_3'), false);
releaseOther();
assert.equal(await lock.acquireSlotLock('local_save_slot_3'), true, 'tab kia nhả thì lấy được');

// Nhả khi về menu: ô được giải phóng cho tab khác.
lock.releaseSlotLock();
await tick();
assert.equal(fake.held.size, 0);
lock.releaseSlotLock(); // gọi lại không lỗi
assert.equal(await lock.acquireSlotLock('local_save_default'), true);

console.log('PASS slot-lock: không hỗ trợ thì cho qua, lấy/nhả, đổi ô, tranh chấp giữa tab, ô khóa nơi khác');
