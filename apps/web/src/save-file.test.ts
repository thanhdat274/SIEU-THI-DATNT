import assert from 'node:assert/strict';
import { CURRENT_SAVE_SCHEMA_VERSION, type SaveGameData } from '@game/shared';
import { buildSaveFile, MAX_SAVE_FILE_BYTES, parseSaveFile, saveFileName, SAVE_FILE_FORMAT } from './save-file.js';

const save = {
  id: 'file-save', schemaVersion: CURRENT_SAVE_SCHEMA_VERSION, revision: 3, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T01:00:00.000Z',
  player: { name: 'Chủ tiệm', level: 2, experience: 10, experienceToNextLevel: 100, money: 50_000, reputation: 0, position: { x: 1, y: 1 }, direction: 'down' },
  worldTime: { day: 1, hour: 8, minute: 0, isStoreOpen: false, timeScale: 60 },
  storeLayout: { widthTiles: 10, heightTiles: 10, fixtures: [], storedFixtures: [], unlockedPlotIds: [] },
  inventory: [],
  statistics: { totalRevenue: 1000, totalCustomersServed: 5, totalDaysPassed: 0 },
} as unknown as SaveGameData;
save.player.money = 123_456;
save.worldTime.day = 7;

// Vòng đi vòng lại giữ nguyên dữ liệu và có phong bì nhận diện.
const text = buildSaveFile(save, '2026-10-01T00:00:00.000Z');
const envelope = JSON.parse(text);
assert.equal(envelope.format, SAVE_FILE_FORMAT);
assert.equal(envelope.exportedAt, '2026-10-01T00:00:00.000Z');
const ok = parseSaveFile(text);
assert.ok(ok.ok);
if (ok.ok) {
  assert.deepEqual(ok.save, save, 'save nhập lại giống hệt save đã xuất');
  assert.equal(ok.summary.day, 7);
  assert.equal(ok.summary.money, 123_456);
  assert.equal(ok.migratedFromSchema, undefined);
}

// Tên file có ngày game và dấu thời gian, không chứa ký tự cấm.
assert.match(saveFileName(save, new Date('2026-10-01T08:30:15Z')), /^tiem-tap-hoa-ngay7-20261001-083015\.json$/);

// File lạ/hỏng bị từ chối với thông báo rõ.
const reject = (input: string, pattern: RegExp, label: string) => {
  const result = parseSaveFile(input);
  assert.equal(result.ok, false, label);
  if (!result.ok) assert.match(result.error, pattern, label);
};
reject('không phải json', /JSON/, 'JSON hỏng');
reject('123', /bản lưu/, 'không phải đối tượng');
reject('null', /bản lưu/, 'null');
reject(JSON.stringify(save), /Tiệm Tạp Hóa/, 'save thô không có phong bì bị từ chối');
reject(JSON.stringify({ format: 'game-khac', formatVersion: 1, save }), /Tiệm Tạp Hóa/, 'sai nhãn định dạng');
reject(JSON.stringify({ format: SAVE_FILE_FORMAT, formatVersion: 99, save }), /mới hơn/, 'định dạng tương lai');
reject(JSON.stringify({ format: SAVE_FILE_FORMAT, formatVersion: 1 }), /./, 'thiếu save');
reject(JSON.stringify({ format: SAVE_FILE_FORMAT, formatVersion: 1, save: { ...save, schemaVersion: CURRENT_SAVE_SCHEMA_VERSION + 1 } }), /tương lai/, 'schema tương lai');
reject(JSON.stringify({ format: SAVE_FILE_FORMAT, formatVersion: 1, save: { ...save, player: { ...save.player, money: -5 } } }), /hỏng|thiếu/, 'tiền âm');
reject(JSON.stringify({ format: SAVE_FILE_FORMAT, formatVersion: 1, save: { ...save, worldTime: { ...save.worldTime, hour: 99 } } }), /hỏng|thiếu/, 'giờ ngoài phạm vi');
reject('x'.repeat(MAX_SAVE_FILE_BYTES + 1), /quá lớn/, 'file quá lớn');

// Save schema cũ được nâng lên schema hiện tại và báo nguồn.
const legacy = { ...structuredClone(save), schemaVersion: 2 } as SaveGameData;
const migrated = parseSaveFile(buildSaveFile(legacy));
assert.ok(migrated.ok);
if (migrated.ok) {
  assert.equal(migrated.save.schemaVersion, CURRENT_SAVE_SCHEMA_VERSION);
  assert.equal(migrated.migratedFromSchema, 2);
}

console.log('PASS save-file: vòng xuất/nhập, nhận diện phong bì, từ chối file lạ/hỏng/tương lai/quá lớn, nâng schema cũ');
