import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { HEATMAP_RETENTION_DAYS, PRICE_HISTORY_MAX_POINTS, aggregateHeatmap, appendPricePoint, buildProductSeries, getTutorialChecklist, sanitizeHeatmap, sanitizePriceHistory } from './analytics';
import { ambientMix, masterGain, sanitizeAudioSettings } from './ambient-audio';
import { SIMULATION_VERSION, recordDayReplay, runDayReplay } from './replay';

const map = generateStarterTileMap();
const openSave = () => {
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.worldTime.isStoreOpen = true;
  save.worldTime.hour = 9;
  return save;
};

export function runAnalyticsTests(): void {
  console.log('\n--- Phân tích, checklist, âm thanh và replay (Wave D) ---');

  // 5.1 Chuỗi lịch sử: ngày thiếu bản ghi là null, không suy giá từ giá hiện tại.
  const records = { 2: { day: 2, productSales: { a: 5 } }, 3: { day: 3 } } as never;
  const series = buildProductSeries(records, { a: [{ day: 2, price: 9000 }] }, 'a', 1, 4);
  assert.deepEqual(series.map(p => p.units), [null, 5, 0, null]);
  assert.deepEqual(series.map(p => p.price), [null, 9000, null, null]);
  const history: Record<string, Array<{ day: number; price: number }>> = {};
  for (let d = 1; d <= PRICE_HISTORY_MAX_POINTS + 10; d++) appendPricePoint(history, 'a', d, 1000);
  assert.equal(history.a.length, PRICE_HISTORY_MAX_POINTS);
  assert.equal(history.a[0].day, 11);
  assert.deepEqual(sanitizePriceHistory({ a: [{ day: 1, price: -5 }, { day: 'x', price: 5 }, { day: 2, price: 7 }], b: 'bad' }), { a: [{ day: 2, price: 7 }] });

  // Giá được ghi khi đóng ngày và qua save/load.
  const sim = new GameSimulation(openSave(), map, new InputManager(), {});
  const day = sim.getTime().day;
  sim.closeDailyRecord(day);
  const exported = sim.exportSaveData('s', 1);
  const productIds = Object.keys(exported.priceHistory ?? {});
  assert.ok(productIds.length > 0, 'Đóng ngày lưu giá thực của hàng đang bán');
  const reloaded = new GameSimulation(exported, map, new InputManager(), {});
  assert.deepEqual(reloaded.getPriceHistory(productIds[0]), exported.priceHistory![productIds[0]]);

  // 5.2 Heatmap: chỉ tổng hợp theo ô, giới hạn giữ lại, không đổi kinh tế.
  const run = new GameSimulation(openSave(), map, new InputManager(), {});
  for (let i = 0; i < 400; i++) run.update(1);
  const heat = run.getHeatmap(HEATMAP_RETENTION_DAYS);
  assert.ok(Object.keys(heat).every(k => /^-?\d+,-?\d+$/.test(k)), 'Khóa heatmap chỉ là ô');
  assert.ok(Object.values(heat).every(n => Number.isSafeInteger(n) && n > 0));
  const money = run.exportSaveData('s', 1).player.money;
  run.getHeatmap(3); run.getPriceHistory('x'); run.getDailyRecords();
  assert.equal(run.exportSaveData('s', 1).player.money, money, 'Đọc phân tích không đổi tiền');
  assert.deepEqual(aggregateHeatmap({ 5: { '1,1': 2 }, 6: { '1,1': 3, '2,2': 1 } }, 6, 2), { '1,1': 5, '2,2': 1 });
  assert.deepEqual(aggregateHeatmap({ 5: { '1,1': 2 }, 6: { '1,1': 3 } }, 6, 1), { '1,1': 3 });
  assert.deepEqual(sanitizeHeatmap({ 1: { '0,0': 1 }, 20: { '1,1': 2, bad: 3, '2,2': -1 } }), { 20: { '1,1': 2 } });

  // 5.3 Checklist suy ra từ trạng thái thật.
  const base = structuredClone(DEFAULT_INITIAL_SAVE);
  base.statistics = { totalRevenue: 0, totalCustomersServed: 0, totalDaysPassed: 0 };
  base.ledger = []; base.pendingOrders = []; base.staff = [];
  base.storeLayout.fixtures.forEach(f => { f.currentStock = 0; });
  const fresh = new Map(getTutorialChecklist(base).map(i => [i.id, i.done]));
  assert.equal(fresh.get('serve'), false);
  assert.equal(fresh.get('stock'), false);
  base.statistics.totalCustomersServed = 1; base.statistics.totalRevenue = 150_000; base.staff = [{ id: 's' } as never];
  const done = new Map(getTutorialChecklist(base).map(i => [i.id, i.done]));
  assert.equal(done.get('serve'), true); assert.equal(done.get('revenue'), true); assert.equal(done.get('staff'), true);

  // 5.4 Âm thanh.
  assert.equal(masterGain({ muted: false, hiddenBehavior: 'pause' }, { userGestured: false, pageVisible: true }), 0, 'Chưa có user gesture thì im lặng');
  assert.equal(masterGain({ muted: true, hiddenBehavior: 'pause' }, { userGestured: true, pageVisible: true }), 0);
  assert.equal(masterGain({ muted: false, hiddenBehavior: 'pause' }, { userGestured: true, pageVisible: false }), 0);
  assert.ok(masterGain({ muted: false, hiddenBehavior: 'duck' }, { userGestured: true, pageVisible: false }) < 0.2);
  assert.equal(masterGain({ muted: false, hiddenBehavior: 'pause' }, { userGestured: true, pageVisible: true }), 1);
  assert.ok(ambientMix({ rainIntensity: 1, hour: 12, isStoreOpen: true }).rain > ambientMix({ rainIntensity: 0, hour: 12, isStoreOpen: true }).rain);
  assert.ok(ambientMix({ rainIntensity: 0, hour: 23, isStoreOpen: false }).night > 0);
  assert.equal(ambientMix({ rainIntensity: 0, hour: 12, isStoreOpen: true }).night, 0);
  assert.deepEqual(sanitizeAudioSettings({ muted: 'x', hiddenBehavior: 'duck' }), { muted: false, hiddenBehavior: 'duck' });

  // 5.5 Replay.
  const start = openSave();
  const recorded = recordDayReplay(start, 300, 1, [{ step: 5, command: { type: 'set_price', productId: 'mi_hao_hao', price: null } }]);
  assert.ok(!('error' in recorded));
  const replay = recorded as Exclude<typeof recorded, { error: string }>;
  const again = runDayReplay(replay);
  assert.ok(again.ok && again.matches === true, 'Cùng snapshot, lệnh, phiên bản cho cùng trạng thái kết thúc');
  const tampered = runDayReplay({ ...replay, endHash: '00000000' });
  assert.ok(tampered.ok && tampered.matches === false, 'Băm khác bị báo lệch');
  const wrong = runDayReplay({ ...replay, simulationVersion: 'sim-old' });
  assert.ok(!wrong.ok && /không thể xác minh/i.test(wrong.reason), 'Phiên bản khác bị từ chối');
  assert.equal(replay.simulationVersion, SIMULATION_VERSION);
  assert.equal(JSON.stringify(start), JSON.stringify(openSave()), 'Replay không sửa save gốc');
}
