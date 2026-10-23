import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, createInitialOnlineWorld, generateStarterTileMap } from '@game/data';
import type { SaveGameData, StaffMember } from '@game/shared';
import { GameClock } from './clock';
import { FixedStepSimulationRunner } from './runner';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { WorldRuntime } from './world-runtime';

const MINUTES = (time: { hour: number; minute: number }) => time.hour * 60 + time.minute;

function makeSim(over: Partial<SaveGameData> = {}): GameSimulation {
  const save = structuredClone(DEFAULT_INITIAL_SAVE) as SaveGameData;
  Object.assign(save, over);
  return new GameSimulation(save, generateStarterTileMap(), new InputManager());
}

function nightStaff(over: Partial<StaffMember> = {}): StaffMember {
  return {
    id: 'night-guard', name: 'Chú Bình', role: 'security', speed: 6, accuracy: 5, stamina: 8,
    dailyWage: 30_000, hiredOnDay: 1, shift: 'night', ...over,
  };
}

export function runNightCycleTests(): void {
  console.log('\n--- OpenSpec staff-shifts: pha đêm 22:00–06:00, quy ước ngày, parity client↔WorldRuntime ---');

  // 1. Mốc pha đêm 22:00: đóng cửa, KHÔNG sang ngày; 00:00–06:00 vẫn ngày N; 06:00 chốt ngày + mở cửa 07:00.
  {
    const clock = new GameClock({ day: 1, hour: 21, minute: 59, isStoreOpen: true, timeScale: 90 });
    clock.update(2); // 1 phút game ban ngày
    assert.equal(clock.getTime().hour, 22);
    assert.equal(clock.getTime().day, 1, '22:00 chưa chốt ngày');
    assert.equal(clock.getTime().isStoreOpen, false, '22:00 tự đóng cửa');
    assert.equal(clock.isNightPhase(), true);

    // Ban đêm vẫn chạy dù cửa đóng; 00:30 vẫn là ngày 1.
    clock.setTime({ ...clock.getTime(), hour: 0, minute: 30 });
    assert.equal(clock.getTime().day, 1, '00:00–06:00 thuộc ngày N');
    clock.update(10);
    assert.equal(clock.getTime().day, 1);

    clock.setTime({ ...clock.getTime(), hour: 5, minute: 59 });
    clock.update(3); // qua 06:00
    assert.equal(clock.getTime().day, 2, '06:00 chốt ngày đúng một lần');
    assert.equal(clock.getTime().hour, 7);
    assert.equal(clock.getTime().isStoreOpen, true, 'sáng ngày mới mở cửa lại như hành vi cũ');
    assert.equal(clock.isNightPhase(), false);
  }

  // 2. Ban đêm trôi nhanh ×3: 1 giờ game ban đêm tốn ~1/3 thời gian thực so với ban ngày.
  {
    const dayClock = new GameClock({ day: 1, hour: 10, minute: 0, isStoreOpen: true, timeScale: 90 });
    const before = MINUTES(dayClock.getTime());
    dayClock.update(40); // 40 giây thực × 1,5 phút = 60 phút game
    assert.equal(MINUTES(dayClock.getTime()) - before, 60, 'ban ngày: 40 s thực = 60 phút game');

    const nightClock = new GameClock({ day: 1, hour: 23, minute: 0, isStoreOpen: false, timeScale: 90 });
    const beforeNight = MINUTES(nightClock.getTime());
    nightClock.update(40 / 3); // 13,33 giây thực × 4,5 phút = 60 phút game (vắt qua nửa đêm)
    const nightDelta = (MINUTES(nightClock.getTime()) - beforeNight + 1440) % 1440;
    assert.ok(Math.abs(nightDelta - 60) <= 1, 'ban đêm: cùng số phút game tốn 1/3 thời gian thực');
    assert.equal(nightClock.getTime().day, 1, 'Qua nửa đêm vẫn cùng ngày');
  }

  // 3. Quy ước ngày dùng cho hiredOnDay/lương: nhân viên ca đêm ngày N làm 00:30 ngày N; lương chốt vào ngày N.
  {
    const save = structuredClone(DEFAULT_INITIAL_SAVE) as SaveGameData;
    save.staff = [nightStaff({ hiredOnDay: 2 })];
    save.staffSchedule = { 'night-guard': 'night' };
    const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());
    sim.getClock().setTime({ ...sim.getTime(), day: 2, hour: 23, minute: 30 });
    assert.deepEqual(sim.peekVisibleStaff().map((member) => member.id), ['night-guard'], 'Ca đêm của ngày tuyển (N=2) đang trực');
    sim.getClock().setTime({ ...sim.getTime(), day: 2, hour: 1, minute: 0 });
    assert.deepEqual(sim.peekVisibleStaff().map((member) => member.id), ['night-guard'], '00:30 vẫn là ngày 2 — ca đêm ngày tuyển vẫn trực');
    sim.getClock().setTime({ ...sim.getTime(), day: 1, hour: 23, minute: 30 });
    assert.deepEqual(sim.peekVisibleStaff().map((member) => member.id), [], 'Chưa tới ngày tuyển thì không trực');

    // Chốt ngày N=2 (sang ngày 3): trả lương ca đêm của ngày 2 đúng một lần, ghi vào bản ghi ngày 2.
    sim.getClock().setTime({ ...sim.getTime(), day: 2, hour: 23, minute: 59 });
    const moneyBefore = sim.getPlayerData().money;
    sim.getClock().advanceToNextDay();
    sim.getClock().advanceToNextDay(); // chỉ chốt ngày 3 ở lần hai (idempotent theo processedPayrollDayIds)
    const record = sim.getDailyRecords()[2];
    assert.ok(record, 'Có bản ghi ngày 2');
    assert.equal(record.wagesPaid, 18_000, 'Lương ca đêm 30.000 × 0,6 trả trong ngày 2');
    const paidOnce = sim.getDailyRecords();
    sim.getClock().advanceToNextDay();
    assert.equal(sim.getDailyRecords()[2]?.wagesPaid ?? paidOnce[2]?.wagesPaid, 18_000, 'Không trả lương ngày 2 lần hai');
    assert.ok(moneyBefore >= 0);
  }

  // 4. Luật cửa hàng ban đêm: không mở cửa, không sinh khách/không bán dù cờ mở bị đặt tay.
  {
    const sim = makeSim();
    sim.getClock().setTime({ ...sim.getTime(), hour: 23, minute: 0, isStoreOpen: false });
    assert.equal(sim.canOpenStoreNow(), false, 'Ban đêm không mở cửa được');
    assert.equal(sim.setStoreOpen(true), false, 'Lệnh mở cửa ban đêm bị từ chối');
    assert.equal(sim.getTime().isStoreOpen, false);
    sim.getClock().setTime({ ...sim.getTime(), hour: 9, minute: 0 });
    assert.equal(sim.canOpenStoreNow(), true, 'Giờ bán mở cửa được');
    assert.equal(sim.setStoreOpen(true), true);

    // Cưỡng bức cờ mở cửa trong đêm (harness/test): vẫn không sinh khách, không phát sinh doanh thu.
    sim.getClock().setTime({ ...sim.getTime(), hour: 23, minute: 0, isStoreOpen: false });
    sim.getClock().toggleStoreStatus(); // ép isStoreOpen = true
    const revenueBefore = sim.getCurrentDayRecord().revenue;
    for (let i = 0; i < 400; i++) sim.update(0.05);
    assert.ok(sim.getClock().isNightPhase(), 'Vẫn trong pha đêm khi chạy test');
    assert.equal(sim.getCustomers().length, 0, 'Ban đêm không sinh khách');
    assert.equal(sim.getCurrentDayRecord().revenue, revenueBefore, 'Ban đêm không có doanh thu');
  }

  // 5. Save/tải giữa đêm: tiếp tục đúng pha, không tự chốt ngày.
  {
    const sim = makeSim();
    sim.getClock().setTime({ ...sim.getTime(), day: 3, hour: 23, minute: 30, isStoreOpen: false });
    const reloaded = new GameSimulation(sim.exportSaveData(), generateStarterTileMap(), new InputManager());
    assert.equal(reloaded.getTime().day, 3);
    assert.equal(reloaded.getTime().hour, 23);
    assert.equal(reloaded.isNightNow(), true);
    assert.equal(reloaded.canOpenStoreNow(), false);
    const before = reloaded.getTime().day;
    reloaded.update(0.5);
    assert.equal(reloaded.getTime().day, before, 'Tải giữa đêm không nhảy ngày');
  }

  // 6. Parity client ↔ server: cùng tổng thời gian thực, qua 22:00 và 06:00, cho cùng giờ/ngày/doanh thu/số nhân viên trực.
  {
    const clientClock = () => new GameClock({ day: 1, hour: 21, minute: 58, isStoreOpen: true, timeScale: 90 });
    const serverClock = () => new GameClock({ day: 1, hour: 21, minute: 58, isStoreOpen: true, timeScale: 90 });
    const runClient = (clock: GameClock, seconds: number) => clock.update(seconds);
    const runServerChunks = (clock: GameClock, seconds: number) => {
      const runner = new FixedStepSimulationRunner({ update: (dt: number) => clock.update(dt) });
      const fullChunks = Math.floor(seconds / 0.25);
      for (let i = 0; i < fullChunks; i++) runner.advance(0.25);
    };
    const client = clientClock();
    const server = serverClock();
    runClient(client, 10);
    runServerChunks(server, 10);
    assert.deepEqual(server.getTime(), client.getTime(), 'Parity qua 22:00: cùng giờ/ngày/cửa hàng');

    const client2 = new GameClock({ day: 4, hour: 5, minute: 58, isStoreOpen: false, timeScale: 90 });
    const server2 = new GameClock({ day: 4, hour: 5, minute: 58, isStoreOpen: false, timeScale: 90 });
    runClient(client2, 8);
    runServerChunks(server2, 8);
    assert.deepEqual(server2.getTime(), client2.getTime(), 'Parity qua 06:00: cùng ngày mới/giờ/cửa hàng');
    assert.equal(client2.getTime().day, 5, 'Qua 06:00 thì sang ngày mới');
  }

  // 7. Parity tích hợp WorldRuntime (server, coop+routine) vs vòng cập nhật client cùng chế độ.
  //    Lưu ý: co-op/routine chốt ngày khi ngủ 23:30 nên chỉ vắt qua 22:00; mốc 06:00 (chế độ thường) đã test ở mục 6
  //    bằng chính `FixedStepSimulationRunner` mà WorldRuntime dùng.
  {
    const owner = { id: 'owner-1', displayName: 'Owner One', photoUrl: null };
    const seed = createInitialOnlineWorld(owner, 'world-night-parity');
    seed.business.save.worldTime.isStoreOpen = true;
    const runtime = new WorldRuntime(seed.world, seed.business, { heartbeatTimeoutMs: 60_000, checkpointIntervalSeconds: 100 });
    assert.equal(runtime.registerSession('owner-1'), true);
    const sim = runtime.getSimulation();
    sim.getClock().setTime({ day: 1, hour: 21, minute: 58, isStoreOpen: true, timeScale: 90 });
    const clientSave = sim.exportSaveData();
    // Client co-op dựng cùng chế độ và cùng đăng ký người chơi như App/WorldRuntime để nhịp routine giống nhau.
    const clientSim = new GameSimulation(clientSave, generateStarterTileMap(clientSave.storeLayout.unlockedPlotIds ?? [], [], clientSave.storeLayout.buildingPlacements, clientSave.world?.openedWaves), new InputManager());
    clientSim.setCoopMode(true);
    clientSim.setServerAuthoritative(true);
    for (const avatar of seed.world.avatars) {
      clientSim.registerCoopPlayer({ playerId: avatar.accountId, homeDoorTile: { x: 3, y: 12 } } as Parameters<GameSimulation['registerCoopPlayer']>[0]);
      clientSim.setCoopPlayerPosition(avatar.accountId, { ...avatar.position });
      clientSim.setCoopPlayerOnline(avatar.accountId, avatar.accountId === 'owner-1');
    }
    clientSim.getClock().setTime({ day: 1, hour: 21, minute: 58, isStoreOpen: true, timeScale: 90 });
    const totalSeconds = 12;
    const clientSteps = Math.round(totalSeconds * 60);
    for (let i = 0; i < clientSteps; i++) clientSim.update(1 / 60);
    for (let i = 0; i < totalSeconds / 0.25; i++) runtime.tick(0.25);
    assert.deepEqual(sim.getTime(), clientSim.getTime(), 'WorldRuntime tick 250 ms và client 1/60 s cho cùng giờ/ngày qua 22:00');
    assert.equal(sim.getPlayerData().money, clientSim.getPlayerData().money);
    assert.equal(sim.getStatistics().totalRevenue, clientSim.getStatistics().totalRevenue);
  }

  // 8. Routine mode cũng ×3 ban đêm và KHÔNG chốt ngày lúc 23:30: 06:00 mới sang ngày.
  {
    const clock = new GameClock({ day: 1, hour: 22, minute: 0, isStoreOpen: false, timeScale: 90 });
    clock.setRoutineMode(true);
    clock.update(20);
    assert.equal(clock.getTime().hour * 60 + clock.getTime().minute, 23 * 60 + 30, 'Routine: 20 giây thực đủ 90 phút game ban đêm (×3) tới mốc 23:30');
    assert.equal(clock.getTime().day, 1, 'Routine: 23:30 chưa chốt ngày');
    clock.update(90); // 23:30 → 06:00 = 390 phút game ×3 ≈ 87 giây thực
    assert.equal(clock.getTime().day, 2, 'Routine: 06:00 mới chốt ngày');
    assert.equal(clock.getTime().hour, 7);
    assert.equal(clock.getTime().isStoreOpen, false, 'Routine: chờ 08:00 mở cửa');
  }

  // 8b. Routine mode qua GameSimulation: 23:30 về nhà ngủ nhưng KHÔNG chốt ngày; 06:00 mới chốt + nhân vật ở nhà.
  {
    const sim = makeSim();
    sim.setDailyRoutineEnabled(true);
    sim.getClock().setTime({ ...sim.getTime(), day: 3, hour: 23, minute: 29, isStoreOpen: false });
    sim.setPlayerPosition({ x: 112, y: 400 }); // đang ở cửa nhà
    const startDay = sim.getTime().day;
    let sleepSteps = 0;
    while (sim.getDailyRoutineState() !== 'SLEEPING' && sleepSteps++ < 400) sim.update(1 / 20);
    assert.equal(sim.getDailyRoutineState(), 'SLEEPING', 'Routine: 23:30 đi ngủ');
    assert.equal(sim.getTime().day, startDay, 'Routine: ngủ lúc 23:30 KHÔNG chốt ngày');
    assert.equal(sim.getTime().isStoreOpen, false);
    let daySteps = 0;
    while (sim.getTime().day === startDay && daySteps++ < 6000) sim.update(1 / 20);
    assert.equal(sim.getTime().day, startDay + 1, 'Routine: 06:00 mới sang ngày mới');
    assert.equal(sim.getTime().hour, 7);
    assert.equal(sim.getTime().isStoreOpen, false, 'Routine: chờ 08:00 mở cửa');
    assert.equal(sim.getDailyRoutineState(), 'AT_HOME');
    assert.deepEqual(sim.getPlayerData().position, { x: 112, y: 400 }, 'Routine: thức dậy ở cửa nhà');
  }

  // 9. Nút "Ngủ" (sleepNow): routine mode đưa nhân vật về cửa nhà; chế độ thường sang ngày 07:00 và mở cửa.
  {
    const routineSim = makeSim();
    routineSim.setDailyRoutineEnabled(true);
    routineSim.getClock().setTime({ ...routineSim.getTime(), day: 3, hour: 23, minute: 0, isStoreOpen: false });
    routineSim.setPlayerPosition({ x: 300, y: 300 });
    routineSim.sleepNow();
    const routineTime = routineSim.getTime();
    assert.deepEqual([routineTime.day, routineTime.hour, routineTime.minute], [4, 7, 0], 'Routine: Ngủ chốt ngày sang 07:00');
    assert.equal(routineTime.isStoreOpen, false, 'Routine: sáng hôm sau chờ 08:00 mới mở như cũ');
    assert.deepEqual(routineSim.getPlayerData().position, { x: 112, y: 400 }, 'Routine: Ngủ đưa nhân vật về cửa nhà');
    assert.equal(routineSim.getDailyRoutineState(), 'AT_HOME');

    const freeSim = makeSim();
    freeSim.getClock().setTime({ ...freeSim.getTime(), day: 3, hour: 23, minute: 0, isStoreOpen: false });
    freeSim.sleepNow();
    assert.equal(freeSim.getTime().day, 4);
    assert.equal(freeSim.getTime().isStoreOpen, true, 'Chế độ thường: sáng hôm sau mở cửa như hành vi cũ');
  }

  // 10. Toast "Bảo vệ ca ngày không trực đêm" chỉ hiện MỘT lần mỗi save (cờ đã lưu, schema 14 additive): load lại save lần 2 không toast lại.
  {
    const guardSave = structuredClone(DEFAULT_INITIAL_SAVE) as SaveGameData;
    // Guard ca NGÀY (full_day/morning/afternoon) → cảnh báo đó là để khuyến khích chuyển sang ca đêm.
    guardSave.staff = [nightStaff({ id: 'day-guard', role: 'security', shift: 'full_day' })];
    guardSave.staffSchedule = { 'day-guard': 'full_day' };

    const toasts: Array<{ message: string; type?: string }> = [];
    const sim1 = new GameSimulation(guardSave, generateStarterTileMap(), new InputManager(), {
      onToast: (message, type) => toasts.push({ message, type }),
    });
    const warned1 = toasts.filter(t => t.message.includes('Bảo vệ ca ngày')).length;
    assert.equal(warned1, 1, 'Lần tải đầu: cảnh báo bảo vệ ca ngày hiện đúng một lần');

    // Nạp lại save (export → tải): cờ đã được lưu trong save nên KHÔNG toast lại.
    const sim2 = new GameSimulation(sim1.exportSaveData(), generateStarterTileMap(), new InputManager(), {
      onToast: (message, type) => toasts.push({ message, type }),
    });
    const warned2 = toasts.filter(t => t.message.includes('Bảo vệ ca ngày')).length;
    assert.equal(warned2, 1, 'Tải lại lần 2: không toast lại (cờ hasWarnedGuardNotNight đã lưu trong save)');
    assert.equal(sim2.exportSaveData().hasWarnedGuardNotNight, true, 'Save sau khi đã cảnh báo giữ cờ true');
  }

  console.log('  ✓ 22:00 đóng cửa vào đêm, 00:00–06:00 thuộc ngày N, 06:00 chốt ngày + mở cửa; ban đêm nhanh ×3');
  console.log('  ✓ Quy ước ngày cho hiredOnDay/lương ca đêm trả đúng một lần; save/tải giữa đêm giữ pha');
  console.log('  ✓ Ban đêm không mở cửa/không sinh khách/không doanh thu; parity client↔WorldRuntime qua 22:00 và 06:00');
}
