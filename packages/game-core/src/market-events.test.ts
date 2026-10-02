import assert from 'node:assert/strict';
import { createInitialOnlineWorld, ALL_PRODUCTS, DEFAULT_INITIAL_SAVE, MARKET_EVENTS, MARKET_EVENT_MAP, MARKET_EVENT_RULES, PRODUCT_MAP, generateStarterTileMap, validateMarketData, SEASON_EVENTS } from '@game/data';
import type { MarketState } from '@game/shared';
import { InputManager } from './input';
import { GameSimulation, type GameSimulationCallbacks } from './simulation';
import { WorldRuntime } from './world-runtime';
import {
  NoticeThrottle, advanceMarketState, buildMarketContext, createMarketState, effectiveWeatherId, marketNoticesForDay, scheduleEvents,
  timeBandFor, visibleMarketEvents, weekdayOf, type MarketContext,
} from './market';
import { buildDemandTable } from './demand';

const seeds = Array.from({ length: 24 }, (_, i) => `event-seed-${i}`);

function findStart(eventId: string, minDay = 8, maxDay = 360): { seed: string; day: number } {
  for (const seed of seeds) {
    const schedule = scheduleEvents(seed, undefined, maxDay);
    const hit = schedule.events.find(event => event.id === eventId && event.startDay >= minDay);
    if (hit) return { seed, day: hit.startDay };
  }
  throw new Error(`không tìm thấy lịch cho ${eventId}`);
}

export async function runMarketEventTests(): Promise<void> {
  // --- 3.1 lịch xác định, tiếp tục từ lịch đã lưu giống tính từ đầu ---
  const a = scheduleEvents('event-seed-1', undefined, 300);
  assert.deepEqual(a, scheduleEvents('event-seed-1', undefined, 300), 'Cùng seed cùng lịch sự kiện');
  assert.notDeepEqual(a.events, scheduleEvents('event-seed-2', undefined, 300).events, 'Khác seed khác lịch sự kiện');
  let state = createMarketState('event-seed-1', 1);
  for (let day = 2; day <= 300; day++) state = advanceMarketState(state, day);
  const scratch = createMarketState('event-seed-1', 300);
  assert.deepEqual(state.events, scratch.events, 'Đẩy từng ngày giống dựng thẳng từ đầu');
  assert.deepEqual(state.weather, scratch.weather, 'Thời tiết gốc không đổi do sự kiện');
  assert.equal(state.decidedThrough, 302);

  for (const seed of seeds.slice(0, 6)) {
    const events = scheduleEvents(seed, undefined, 480).events;
    for (const def of MARKET_EVENTS) {
      const starts = events.filter(event => event.id === def.id).map(event => event.startDay);
      for (let i = 1; i < starts.length; i++) assert.ok(starts[i] - starts[i - 1] >= def.trigger.minGapDays, `${def.id}: giữ khoảng cách tối thiểu`);
      for (const start of starts) {
        if (def.trigger.weekdays) assert.ok(def.trigger.weekdays.includes(weekdayOf(start)), `${def.id}: bắt đầu đúng thứ`);
      }
    }
  }
  const covered = new Set<string>();
  for (const seed of seeds) for (const event of scheduleEvents(seed, undefined, 480).events) covered.add(event.id);
  for (const def of MARKET_EVENTS) {
    if (def.manual) assert.ok(!covered.has(def.id), `Sự kiện thủ công ${def.id} không tự lên lịch`);
    else assert.ok(covered.has(def.id), `Sự kiện ${def.id} xuất hiện trong dữ liệu mô phỏng`);
  }
  assert.ok(MARKET_EVENTS.length >= 9, 'Đủ bộ sự kiện yêu cầu');

  // --- 3.1 lưu/tải giữ sự kiện đang chạy ---
  const heat = findStart('heat_wave');
  const sim = new GameSimulation({ ...structuredClone(DEFAULT_INITIAL_SAVE), worldTime: { ...DEFAULT_INITIAL_SAVE.worldTime, day: heat.day } , market: createMarketState(heat.seed, heat.day) }, generateStarterTileMap(), new InputManager());
  const saved = sim.exportSaveData();
  const reloaded = new GameSimulation(saved, generateStarterTileMap(), new InputManager());
  assert.deepEqual(reloaded.getMarketState().events, sim.getMarketState().events, 'Lưu/tải giữ sự kiện đang chạy');
  assert.ok(reloaded.getMarketSummary().events.some(event => event.id === 'heat_wave' && event.status === 'active'), 'Sự kiện đang chạy hiện trong tóm tắt');

  // --- 3.2 nắng nóng: báo trước, dự báo khớp, hiệu ứng bằng dữ liệu ---
  let warn = createMarketState(heat.seed, heat.day - 2);
  const warnView = visibleMarketEvents(warn, heat.day - 2).find(event => event.id === 'heat_wave');
  assert.ok(warnView && warnView.status === 'upcoming' && warnView.startsIn === 2, 'Nắng nóng được báo trước 2 ngày');
  assert.equal(effectiveWeatherId(warn, heat.day), 'hot', 'Dự báo ngày kia phản ánh đợt nắng nóng');
  const forecastWas = effectiveWeatherId(warn, heat.day);
  warn = advanceMarketState(advanceMarketState(warn, heat.day - 1), heat.day);
  assert.equal(effectiveWeatherId(warn, heat.day), forecastWas, 'Thời tiết thực tế khớp dự báo đã công bố');
  assert.equal(visibleMarketEvents(warn, heat.day).find(event => event.id === 'heat_wave')?.status, 'active');
  const ctxOf = (weather: string, eventIds: string[], hour = 15, day = 70): MarketContext => ({
    day, hour, season: null, climateId: 'clim_hot', weatherId: weather, timeBand: timeBandFor(hour), weekday: 2, eventIds,
  });
  const normal = buildDemandTable({ ctx: ctxOf('hot', []), products: ALL_PRODUCTS, reputation: 50 });
  const during = buildDemandTable({ ctx: ctxOf('hot', ['heat_wave']), products: ALL_PRODUCTS, reputation: 50 });
  assert.ok(during.traffic.value > normal.traffic.value, 'Nắng nóng kéo dài tăng lưu lượng');
  assert.ok(during.perProduct['nuoc_suoi'].demand > normal.perProduct['nuoc_suoi'].demand, 'Nắng nóng kéo dài tăng nhu cầu đồ uống mát');
  assert.ok(during.perProduct['kem_que'].demand > normal.perProduct['kem_que'].demand, 'Nắng nóng kéo dài tăng nhu cầu kem');
  assert.ok(during.perProduct['nuoc_suoi'].factors.some(f => f.ruleId.startsWith('event_heat_wave')), 'Phân rã nêu sự kiện làm thay đổi');
  const outage = buildDemandTable({ ctx: ctxOf('sunny', ['power_outage']), products: ALL_PRODUCTS, reputation: 50 });
  const noOutage = buildDemandTable({ ctx: ctxOf('sunny', []), products: ALL_PRODUCTS, reputation: 50 });
  assert.ok(outage.traffic.value < noOutage.traffic.value, 'Mất điện giảm lưu lượng');
  assert.ok(MARKET_EVENT_RULES.some(rule => rule.effects.spoilage && rule.when.event?.includes('power_outage')), 'Mất điện khai báo hiệu ứng hỏng bằng dữ liệu');
  assert.ok(MARKET_EVENT_RULES.some(rule => rule.effects.supplierStock && rule.when.event?.includes('supplier_shortage')), 'Khan hàng khai báo hiệu ứng tồn nhà cung cấp bằng dữ liệu');
  assert.deepEqual(validateMarketData(), [], 'Dữ liệu sự kiện hợp lệ');
  // Sự kiện ép thời tiết bắt buộc báo trước đủ để dự báo khớp
  const invalid = validateMarketData().length;
  assert.equal(invalid, 0);
  assert.ok(MARKET_EVENTS.filter(def => def.weatherOverride).every(def => def.warnDaysBefore >= 2));
  assert.ok(SEASON_EVENTS.length >= 4);
  assert.ok(PRODUCT_MAP['kem_que'] && MARKET_EVENT_MAP['heat_wave']);

  // --- 3.3 thông báo gộp và giới hạn tần suất ---
  const twoAtOnce: MarketState = {
    ...createMarketState('x', 10), events: [{ id: 'school_event', startDay: 10, endDay: 10 }, { id: 'power_outage', startDay: 10, endDay: 10 }, { id: 'heat_wave', startDay: 12, endDay: 15 }],
  };
  const notices = marketNoticesForDay(twoAtOnce, 10);
  assert.equal(notices.filter(notice => notice.kind === 'start').length, 1, 'Nhiều sự kiện bắt đầu cùng ngày gộp thành một thông báo');
  const start = notices.find(notice => notice.kind === 'start')!;
  assert.deepEqual([...start.eventIds].sort(), ['power_outage', 'school_event'].sort());
  assert.equal(start.severity, 'severe', 'Mất điện là cảnh báo nghiêm trọng');
  const warning = notices.find(notice => notice.kind === 'warning');
  assert.ok(warning && warning.eventIds.includes('heat_wave'), 'Sự kiện báo trước sinh thông báo cảnh báo');
  assert.equal(marketNoticesForDay(twoAtOnce, 11).length, 0, 'Ngày không có sự kiện mới không có thông báo');
  const throttle = new NoticeThrottle();
  assert.equal(throttle.allow('start', 10, 7), true);
  assert.equal(throttle.allow('start', 10, 7), false, 'Không quá một thông báo mỗi loại mỗi giờ game');
  assert.equal(throttle.allow('warning', 10, 7), true, 'Loại khác không bị chặn');
  assert.equal(throttle.allow('start', 10, 8), true, 'Sang giờ mới được phép lại');

  const holiday = findStart('public_holiday', 5, 200);
  const received: string[] = [];
  const callbacks: GameSimulationCallbacks = { onMarketNotice: notice => received.push(`${notice.kind}:${notice.eventIds.join(',')}`) };
  const noticeSim = new GameSimulation({ ...structuredClone(DEFAULT_INITIAL_SAVE), worldTime: { ...DEFAULT_INITIAL_SAVE.worldTime, day: holiday.day - 3 }, market: createMarketState(holiday.seed, holiday.day - 3) }, generateStarterTileMap(), new InputManager(), callbacks);
  for (let i = 0; i < 3; i++) noticeSim.getClock().advanceToNextDay();
  assert.equal(noticeSim.getTime().day, holiday.day);
  assert.ok(received.some(item => item.startsWith('warning:') && item.includes('public_holiday')), `Phát thông báo báo trước (nhận: ${received.join(' | ')})`);
  assert.ok(received.some(item => item.startsWith('start:') && item.includes('public_holiday')), 'Phát thông báo khi sự kiện bắt đầu');
  assert.ok(received.length <= 6, 'Không có bão thông báo');

  // --- 3.4 co-op: server là nguồn duy nhất, hai thành viên thấy giống nhau ---
  const owner = { id: 'owner-1', displayName: 'Owner', photoUrl: null };
  const seeded = createInitialOnlineWorld(owner, 'world-market-events');
  seeded.world.memberships.push({ accountId: 'member-2', role: 'member', joinedAt: new Date().toISOString(), lastSeenRevision: 0 });
  seeded.business.save.market = createMarketState('coop-seed', 1);
  const runtime = new WorldRuntime(seeded.world, seeded.business, { heartbeatTimeoutMs: 1000, checkpointIntervalSeconds: 100 });
  const snapshotSave = runtime.getSnapshot().businesses[0].save;
  assert.ok(snapshotSave.market && snapshotSave.market.seed === 'coop-seed', 'Snapshot co-op mang theo trạng thái thị trường');
  const clientA = new GameSimulation(structuredClone(snapshotSave), generateStarterTileMap(), new InputManager());
  const clientB = new GameSimulation(structuredClone(snapshotSave), generateStarterTileMap(), new InputManager());
  for (let i = 0; i < 40; i++) { runtime.getSimulation().getClock().advanceToNextDay(); clientA.getClock().advanceToNextDay(); clientB.getClock().advanceToNextDay(); }
  assert.deepEqual(clientA.getMarketState(), runtime.getSimulation().getMarketState(), 'Client A khớp runtime server sau 40 ngày');
  assert.deepEqual(clientB.getMarketSummary().events, clientA.getMarketSummary().events, 'Hai thành viên thấy cùng sự kiện');
  assert.deepEqual(clientB.getMarketSummary().weather, runtime.getSimulation().getMarketSummary().weather, 'Hai thành viên thấy cùng thời tiết');
  assert.deepEqual(clientB.getMarketSummary().forecast, runtime.getSimulation().getMarketSummary().forecast, 'Hai thành viên thấy cùng dự báo');
  assert.ok(buildMarketContext(clientA.getMarketState(), 41, 9).day === 41);

  console.log('  ✓ Passed: Sự kiện thị trường — lịch xác định, báo trước, dự báo khớp, hiệu ứng dữ liệu, thông báo gộp, co-op');
}
