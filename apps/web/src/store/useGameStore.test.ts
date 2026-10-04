import assert from 'node:assert/strict';
import type { StoreFixture } from '@game/shared';
import { sameData, useGameStore, type SimulationSnapshot } from './useGameStore';

/** Đồng bộ mô phỏng -> store: giữ tham chiếu khi nội dung không đổi, phát hiện sửa tại chỗ của kệ, làm mới bảng đang mở. */
const fx = (id: string, stock: number): StoreFixture => ({ id, type: 'shelf_wooden', tileX: 1, tileY: 2, widthTiles: 2, heightTiles: 1, rotation: 0, currentStock: stock, maxCapacity: 20, label: id } as StoreFixture);

const base = (fixtures: StoreFixture[]): SimulationSnapshot => ({
  player: { ...useGameStore.getState().player },
  worldTime: { ...useGameStore.getState().worldTime },
  timeString: '07:00',
  inventory: [],
  holdingArea: [],
  planogram: {},
  currentDayRecord: null,
  fixtures,
  customers: [],
  nearbyFixture: null,
});

assert.ok(sameData({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }));
assert.ok(!sameData({ a: 1 }, { a: 2 }) && !sameData([1], [1, 2]) && !sameData({ a: 1 }, { b: 1 }) && !sameData(null, {}));

const simFixtures = [fx('a', 5), fx('b', 7)];
const store = useGameStore;
store.getState().applySimulationSnapshot(base(simFixtures));
const s1 = store.getState();
assert.notEqual(s1.fixtures, simFixtures, 'Store giữ bản sao, không phải mảng của mô phỏng');
assert.deepEqual(s1.fixtures, simFixtures);

// Cập nhật y hệt: mọi tham chiếu được giữ (người đăng ký selector không render lại).
let notified = 0;
const seen: unknown[] = [];
const unsub = store.subscribe((state, prev) => { notified++; seen.push([state.player === prev.player, state.fixtures === prev.fixtures, state.inventory === prev.inventory]); });
store.getState().applySimulationSnapshot(base(simFixtures));
const s2 = store.getState();
assert.equal(s2.player, s1.player);
assert.equal(s2.fixtures, s1.fixtures);
assert.equal(s2.inventory, s1.inventory);
assert.equal(s2.planogram, s1.planogram);

// Kệ bị sửa TẠI CHỖ trong mô phỏng: phải thấy khác, bản sao mới, đối tượng kệ mới.
simFixtures[0].currentStock = 6;
store.getState().applySimulationSnapshot(base(simFixtures));
const s3 = store.getState();
assert.notEqual(s3.fixtures, s2.fixtures);
assert.equal(s3.fixtures[0].currentStock, 6);
assert.notEqual(s3.fixtures[0], s2.fixtures[0]);

// Bảng kệ đang mở được làm mới theo bản sao mới; kệ biến mất thì đóng bảng.
store.setState({ activeFixtureModal: s3.fixtures[0] });
simFixtures[0].currentStock = 9;
store.getState().applySimulationSnapshot(base(simFixtures));
assert.equal(store.getState().activeFixtureModal?.currentStock, 9);
assert.equal(store.getState().activeFixtureModal, store.getState().fixtures[0]);
store.getState().applySimulationSnapshot(base([fx('b', 7)]));
assert.equal(store.getState().activeFixtureModal, null);

// Kệ gần nhất trỏ vào bản sao trong store; phần nặng chỉ đổi khi có và khác.
store.getState().applySimulationSnapshot({ ...base(simFixtures), nearbyFixture: simFixtures[1] });
assert.equal(store.getState().nearbyFixture, store.getState().fixtures[1]);
const rec = { 1: { day: 1 } } as never;
store.getState().applySimulationSnapshot({ ...base(simFixtures), dailyRecords: rec, ledger: [] });
const dr = store.getState().dailyRecords;
store.getState().applySimulationSnapshot({ ...base(simFixtures), dailyRecords: structuredClone(rec), ledger: [] });
assert.equal(store.getState().dailyRecords, dr, 'Sổ ngày không đổi giữ tham chiếu');
store.getState().applySimulationSnapshot({ ...base(simFixtures), dailyRecords: { 1: { day: 1 }, 2: { day: 2 } } as never });
assert.notEqual(store.getState().dailyRecords, dr);
// Không gửi phần nặng thì giữ nguyên.
const dr2 = store.getState().dailyRecords;
store.getState().applySimulationSnapshot(base(simFixtures));
assert.equal(store.getState().dailyRecords, dr2);
unsub();
assert.ok(notified >= 1 && seen.length === notified);
console.log('PASS useGameStore: applySimulationSnapshot giữ tham chiếu, phát hiện sửa tại chỗ, làm mới bảng đang mở');
