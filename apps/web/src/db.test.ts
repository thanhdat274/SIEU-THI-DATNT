import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { CURRENT_SAVE_SCHEMA_VERSION, type SaveGameData } from '@game/shared';

// localStorage giả phải có trước khi nạp db.ts (ô đang chọn được đọc lúc import).
const store = new Map<string, string>([['tiem.activeSaveSlot', 'local_save_slot_2']]);
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
};

const dbm = await import('./db.js');
const { db, SAVE_SLOT_IDS, backupKeyFor, isSaveSlotId, slotNumber, getActiveSlotId, setActiveSlotId, listSaveSlots, deleteSaveSlot, loadOrCreateSave, persistSave, replaceSaveWithImported, resetSaveToDefault, loadBackupSave, restoreFromBackup } = dbm;

const mk = (revision: number, money = 50_000): SaveGameData => ({
  id: 'x', schemaVersion: CURRENT_SAVE_SCHEMA_VERSION, revision, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z',
  player: { name: 'Chủ tiệm', level: 2, experience: 10, experienceToNextLevel: 100, money, reputation: 0, position: { x: 1, y: 1 }, direction: 'down' },
  worldTime: { day: 4, hour: 8, minute: 0, isStoreOpen: false, timeScale: 60 },
  storeLayout: { widthTiles: 10, heightTiles: 10, fixtures: [], storedFixtures: [], unlockedPlotIds: [] },
  inventory: [],
  statistics: { totalRevenue: 0, totalCustomersServed: 0, totalDaysPassed: 0 },
}) as unknown as SaveGameData;
const rejects = async (p: Promise<unknown>, re: RegExp, label: string) => assert.rejects(p, re, label);

// Ô lưu: id, số thứ tự, khóa backup (ô 1 giữ khóa cũ).
assert.deepEqual([...SAVE_SLOT_IDS], ['local_save_default', 'local_save_slot_2', 'local_save_slot_3']);
assert.equal(backupKeyFor('local_save_default'), 'local_save_backup');
assert.equal(backupKeyFor('local_save_slot_3'), 'local_save_slot_3_backup');
assert.equal(isSaveSlotId('local_save_slot_2'), true);
assert.equal(isSaveSlotId('local_save_backup'), false);
assert.equal(isSaveSlotId(7), false);
assert.equal(slotNumber('local_save_slot_3'), 3);

// Ô đang chọn: đọc từ localStorage lúc nạp; set ghi lại; id lạ bị từ chối.
assert.equal(getActiveSlotId(), 'local_save_slot_2', 'nhớ ô từ localStorage');
setActiveSlotId('local_save_default');
assert.equal(getActiveSlotId(), 'local_save_default');
assert.equal(store.get('tiem.activeSaveSlot'), 'local_save_default');
assert.throws(() => setActiveSlotId('bogus' as never), /không hợp lệ/);
assert.equal(getActiveSlotId(), 'local_save_default', 'id lạ không đổi ô');

// DB trống: cả ba ô empty; loadOrCreateSave tạo save khởi đầu ở ô đang chọn.
assert.deepEqual((await listSaveSlots()).map((s) => s.status), ['empty', 'empty', 'empty']);
const created = await loadOrCreateSave();
assert.equal(created.id, 'local_save_default');
assert.deepEqual((await listSaveSlots()).map((s) => s.status), ['ok', 'empty', 'empty']);

// persistSave: bắt buộc revision = cũ + 1, giữ bản trước làm backup riêng của ô.
const r2 = await persistSave({ ...mk(created.revision + 1, 70_000) });
assert.equal(r2.id, 'local_save_default');
assert.equal((await loadBackupSave())?.revision, created.revision, 'backup là bản trước');
await rejects(persistSave(mk(created.revision + 1)), /thay đổi/, 'lệch revision bị từ chối');
await rejects(persistSave(mk(r2.revision + 5)), /thay đổi/, 'nhảy revision bị từ chối');
assert.equal((await db.saves.get('local_save_default'))?.revision, r2.revision, 'save không đổi sau khi bị từ chối');
await rejects(persistSave({ ...mk(r2.revision + 1), player: undefined } as never), /./, 'save hỏng bị từ chối');

// Ô 2 độc lập: backup riêng, ô 1 không bị ảnh hưởng.
setActiveSlotId('local_save_slot_2');
const s2 = await loadOrCreateSave();
assert.equal(s2.id, 'local_save_slot_2');
await persistSave(mk(s2.revision + 1, 99_000));
assert.ok(await db.saves.get('local_save_slot_2_backup'));
assert.equal((await db.saves.get('local_save_default'))?.revision, r2.revision);
const infos = await listSaveSlots();
assert.deepEqual(infos.map((s) => s.status), ['ok', 'ok', 'empty']);
assert.equal(infos[1].money, 99_000);
assert.equal(infos[0].money, 70_000);

// Khôi phục từ backup ghi đè đúng ô đang chọn.
const restored = await restoreFromBackup();
assert.equal(restored?.id, 'local_save_slot_2');

// Ô hỏng được báo corrupt, không bị ghi đè khi liệt kê.
await db.saves.put({ id: 'local_save_slot_3', junk: true } as never);
assert.equal((await listSaveSlots())[2].status, 'corrupt');
setActiveSlotId('local_save_slot_3');
await rejects(loadOrCreateSave(), /./, 'ô hỏng không bị thay bằng save mặc định');
assert.equal(((await db.saves.get('local_save_slot_3')) as { junk?: boolean }).junk, true, 'dữ liệu hỏng được giữ nguyên');

// Nhập file: revision đi tiếp, bản cũ thành backup một bản.
setActiveSlotId('local_save_default');
const imported = await replaceSaveWithImported(mk(1, 1_234));
assert.equal(imported.revision, r2.revision + 1);
assert.equal(imported.id, 'local_save_default');
assert.equal((await db.saves.get('local_save_backup'))?.revision, r2.revision, 'bản cũ làm backup');
await rejects(replaceSaveWithImported({ nonsense: 1 } as never), /./, 'file nhập sai bị từ chối');

// Xóa ô xóa cả backup, ô khác còn nguyên; id lạ bị từ chối.
await deleteSaveSlot('local_save_default');
assert.equal(await db.saves.get('local_save_default'), undefined);
assert.equal(await db.saves.get('local_save_backup'), undefined);
assert.ok(await db.saves.get('local_save_slot_2'));
await assert.rejects(deleteSaveSlot('bogus' as never), /không hợp lệ/);

// Đặt lại về mặc định: revision 1 trên ô đang chọn.
const fresh = await resetSaveToDefault();
assert.equal(fresh.id, 'local_save_default');
assert.equal(fresh.revision, 1);

console.log('PASS db: ô lưu, khóa backup, ô đang chọn, revision, backup riêng từng ô, ô hỏng, nhập file, xóa ô');

// Bản chụp khẩn cấp: ghi đồng bộ khi đóng trang, lần mở sau nhận nếu mới hơn bản trong IndexedDB.
{
  const ls = globalThis.localStorage as unknown as { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem?: (k: string) => void };
  ls.removeItem = (k: string) => void store.delete(k);
  setActiveSlotId('local_save_slot_3');
  await deleteSaveSlot('local_save_slot_3');
  const base = await loadOrCreateSave();
  await new Promise((r) => setTimeout(r, 20));
  const emergency = { ...mk(base.revision, 123_456), updatedAt: base.updatedAt };
  assert.equal(dbm.writeEmergencySave(emergency), true, 'ghi bản chụp khẩn cấp');
  const recovered = await loadOrCreateSave();
  assert.equal(recovered.player.money, 123_456, 'nạp lại nhận bản khẩn cấp mới hơn');
  assert.equal(recovered.revision, base.revision + 1, 'revision đi tiếp để lần lưu sau không báo lệch');
  assert.equal((await db.saves.get('local_save_slot_3'))!.player.money, 123_456, 'đã ghi vào IndexedDB');
  assert.equal(store.has('tiem.emergencySave.local_save_slot_3'), false, 'bản chụp bị xóa sau khi dùng');
  // Bản khẩn cấp cũ hơn IndexedDB thì bị bỏ.
  store.set('tiem.emergencySave.local_save_slot_3', JSON.stringify({ savedAtMs: 1, save: mk(1, 999) }));
  const kept = await loadOrCreateSave();
  assert.equal(kept.player.money, 123_456, 'bản khẩn cấp cũ hơn không đè');
  assert.equal(store.has('tiem.emergencySave.local_save_slot_3'), false);
  console.log('PASS db: bản chụp khẩn cấp');
}
