import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import { GameSimulation, hourlyStoreTrafficMultiplier } from './simulation';
import { InputManager } from './input';
import { GameClock } from './clock';
import { DAILY_SCHEDULE, HOME_DOOR_TILE, parseClockMinutes } from './daily-routine';

function makeSim() {
  const toasts: string[] = [];
  const summaries: unknown[] = [];
  const save = JSON.parse(JSON.stringify(DEFAULT_INITIAL_SAVE));
  const map = generateStarterTileMap(save.unlockedPlotIds ?? undefined);
  const sim = new GameSimulation(save, map, new InputManager(), {
    onToast: (message) => { toasts.push(message); },
    onInventorySummary: (summary) => { summaries.push(summary); },
  });
  return { sim, toasts, summaries };
}

/** Chạy tới khi điều kiện đúng (tối đa `limit` bước 1 giây thực = 1 phút game); trả về số bước đã chạy. */
function runUntil(sim: GameSimulation, done: () => boolean, limit = 6000, dt = 1): number {
  let steps = 0;
  while (!done() && steps < limit) { sim.update(dt); steps++; }
  return steps;
}
const minuteOf = (sim: GameSimulation) => { const t = sim.getClock().getTime(); return t.hour * 60 + t.minute; };

export function runDailyRoutineTests(): void {
  console.log('--- Test Daily Routine ---');

  // Mốc cấu hình, không hard-code timer.
  assert.equal(parseClockMinutes(DAILY_SCHEDULE.returnHome), 23 * 60 + 30);

  // Chế độ mặc định không đổi: không bật routine thì đồng hồ dừng khi đóng cửa và sang ngày lúc 22:00.
  {
    const clock = new GameClock({ day: 1, hour: 7, minute: 0, isStoreOpen: false, timeScale: 60 });
    clock.update(600);
    assert.equal(clock.getTime().hour, 7, 'mặc định: cửa đóng thì đồng hồ đứng');
    clock.toggleStoreStatus();
    clock.update(15 * 60);
    assert.equal(clock.getTime().day, 2, 'mặc định: 22:00 sang ngày mới');
  }

  // Chế độ routine của clock: chạy khi cửa đóng, đứng ở 23:30, không tự sang ngày.
  {
    const clock = new GameClock({ day: 1, hour: 7, minute: 0, isStoreOpen: false, timeScale: 60 });
    clock.setRoutineMode(true);
    clock.update(30); // 30 giây thực = 30 phút game
    assert.equal(clock.getTime().hour, 7);
    assert.equal(clock.getTime().minute, 30, 'routine: cửa đóng vẫn chạy');
    clock.update(GameClock.MAX_UPDATE_SECONDS);
    assert.equal(clock.getTime().day, 1, 'routine: không tự sang ngày');
    assert.equal(clock.getTime().hour * 60 + clock.getTime().minute, 23 * 60 + 30, 'routine: đứng ở 23:30');
    assert.ok(clock.isNightHold());
    clock.advanceToNextDay();
    assert.equal(clock.getTime().day, 2);
    assert.equal(clock.getTime().hour, 7);
    assert.equal(clock.getTime().isStoreOpen, false);
  }

  // Cả ngày qua GameSimulation.
  {
    const { sim, toasts, summaries } = makeSim();
    const startDay = sim.getClock().getTime().day;
    sim.getClock().setTime({ ...sim.getClock().getTime(), hour: 7, minute: 0, isStoreOpen: false });
    sim.setDailyRoutineEnabled(true);
    assert.equal(sim.getDailyRoutineState(), 'AT_HOME');
    sim.setPlayerPosition({ x: (HOME_DOOR_TILE.x + 0.5) * 32, y: (HOME_DOOR_TILE.y + 0.5) * 32 });

    // 08:00 cửa hàng tự mở dù người chơi đứng yên ở xa (không teleport).
    const before = { ...sim.getPlayerData().position };
    runUntil(sim, () => minuteOf(sim) >= parseClockMinutes(DAILY_SCHEDULE.storeOpen) + 1);
    assert.equal(sim.getClock().getTime().isStoreOpen, true, '08:00 cửa hàng mở');
    assert.equal(sim.getDailyRoutineState(), 'WORKING');
    assert.ok(toasts.some((t) => t.includes('Cửa hàng đã mở')));
    assert.ok(Math.hypot(sim.getPlayerData().position.x - before.x, sim.getPlayerData().position.y - before.y) > 32, 'đi bộ ra cửa hàng trong giờ đi làm');

    // 22:00 đóng cửa, kiểm kê, không chốt ngày.
    runUntil(sim, () => minuteOf(sim) >= parseClockMinutes(DAILY_SCHEDULE.storeClose) + 1);
    assert.equal(sim.getClock().getTime().isStoreOpen, false, '22:00 đóng cửa');
    assert.equal(sim.getClock().getTime().day, startDay, 'chưa sang ngày lúc 22:00');
    assert.ok(['CLOSING_STORE', 'INVENTORY'].includes(sim.getDailyRoutineState()));

    runUntil(sim, () => minuteOf(sim) >= parseClockMinutes('23:05'), 6000);
    assert.equal(summaries.length, 1, 'kiểm kê hoàn tất đúng một lần');
    assert.deepEqual(Object.keys(summaries[0] as object).sort(), ['lowStock', 'orders', 'outOfStock', 'overstock', 'revenue']);

    // 23:30 khóa điều khiển, tự đi bộ về nhà (từng bước nhỏ, không teleport), rồi sang ngày mới 07:00.
    runUntil(sim, () => minuteOf(sim) >= parseClockMinutes(DAILY_SCHEDULE.returnHome) - 1);
    let maxStep = 0;
    let prev = { ...sim.getPlayerData().position };
    let locked = false;
    for (let i = 0; i < 6000 && sim.getClock().getTime().day === startDay; i++) {
      sim.update(1 / 20);
      const p = sim.getPlayerData().position;
      maxStep = Math.max(maxStep, Math.hypot(p.x - prev.x, p.y - prev.y));
      prev = { ...p };
      if (sim.getDailyRoutineState() === 'RETURNING_HOME') locked = true;
    }
    assert.ok(locked, 'có trạng thái RETURNING_HOME');
    assert.ok(maxStep < 16, `đi bộ thật, không teleport (bước lớn nhất ${maxStep.toFixed(1)}px)`);
    const time = sim.getClock().getTime();
    assert.equal(time.day, startDay + 1, 'ngày tăng sau khi ngủ');
    assert.equal(time.hour * 60 + time.minute, 7 * 60, 'thức dậy 07:00');
    assert.equal(sim.getDailyRoutineState(), 'AT_HOME');
    assert.ok(toasts.some((t) => t.includes('Ngủ')));
  }

  // Không tìm được đường về nhà: cảnh báo, không teleport.
  {
    const { sim } = makeSim();
    sim.getClock().setTime({ ...sim.getClock().getTime(), hour: 23, minute: 29, isStoreOpen: false });
    sim.setDailyRoutineEnabled(true);
    sim.setPlayerPosition({ x: 40, y: 40 }); // góc tường biên: không có đường
    const start = { ...sim.getPlayerData().position };
    for (let i = 0; i < 120; i++) sim.update(1);
    const end = sim.getPlayerData().position;
    assert.ok(Math.hypot(end.x - start.x, end.y - start.y) < 400, 'không teleport khi thiếu đường');
  }

  // Đường cong khách mua hàng theo giờ (Hourly traffic curve).
  {
    assert.equal(hourlyStoreTrafficMultiplier(8), 1.0);
    assert.equal(hourlyStoreTrafficMultiplier(9), 1.0);
    assert.equal(hourlyStoreTrafficMultiplier(11), 1.25);
    assert.equal(hourlyStoreTrafficMultiplier(13), 1.0);
    assert.equal(hourlyStoreTrafficMultiplier(16), 1.05);
    assert.equal(hourlyStoreTrafficMultiplier(18), 1.45, '17:00-20:00 là giờ cao điểm');
    assert.equal(hourlyStoreTrafficMultiplier(21), 0.75, '20:00-22:00 giảm dần');
  }

  // Khóa mở cửa tiệm khi đang trong routine đóng cửa/về nhà
  {
    const { sim } = makeSim();
    sim.getClock().setTime({ ...sim.getClock().getTime(), hour: 22, minute: 30, isStoreOpen: false });
    sim.setDailyRoutineEnabled(true);
    sim.setStoreOpen(true);
    assert.equal(sim.getClock().getTime().isStoreOpen, false, 'không cho mở cửa sau 22:00 khi bật routine');
  }
}
