import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import { GameSimulation } from './simulation';
import { InputManager } from './input';
import { HOME_DOOR_TILE } from './daily-routine';
import { WorldRuntime } from './world-runtime';
import { createInitialOnlineWorld } from '@game/data';

const homeCenter = { x: (HOME_DOOR_TILE.x + 0.5) * 32, y: (HOME_DOOR_TILE.y + 0.5) * 32 };

function makeCoopSim(localId: string | null) {
  const save = JSON.parse(JSON.stringify(DEFAULT_INITIAL_SAVE));
  const map = generateStarterTileMap(save.unlockedPlotIds ?? undefined);
  const states: string[] = [];
  const sim = new GameSimulation(save, map, new InputManager(), { onRoutineStateChanged: (state) => { states.push(state); } });
  sim.setCoopMode(true);
  for (const id of ['a', 'b']) sim.registerCoopPlayer({ playerId: id, homeDoorTile: HOME_DOOR_TILE });
  if (localId) sim.setCoopLocalPlayer(localId);
  sim.getClock().setTime({ ...sim.getClock().getTime(), hour: 23, minute: 29, isStoreOpen: false });
  return { sim, states };
}

/** Ngày chung (hẻm chơi cặp đôi): 23:30 mọi người về nhà, cả hai ngủ thì sang ngày mới đúng một lần. */
export function runCoopDayTests(): void {
  console.log('--- Test Coop Day (23:30 → ngày mới) ---');

  // Server (không có người chơi cục bộ): cả hai đã ở cửa nhà → sang đúng 1 ngày, 07:00.
  {
    const { sim } = makeCoopSim(null);
    const startDay = sim.getClock().getTime().day;
    sim.setCoopPlayerPosition('a', { ...homeCenter });
    sim.setCoopPlayerPosition('b', { ...homeCenter });
    for (let i = 0; i < 400 && sim.getClock().getTime().day === startDay; i++) sim.update(0.5);
    for (let i = 0; i < 20; i++) sim.update(0.5); // chạy thêm: không được sang ngày lần nữa
    const time = sim.getClock().getTime();
    assert.equal(time.day, startDay + 1, 'server: sang đúng một ngày');
    assert.ok(time.hour * 60 + time.minute < 8 * 60, 'server: sáng hôm sau');
  }

  // Client (có người chơi cục bộ): tới 23:30 tự khóa điều khiển và đi bộ về nhà; ngày do server chốt.
  {
    const { sim, states } = makeCoopSim('a');
    const startDay = sim.getClock().getTime().day;
    sim.setPlayerPosition({ x: 12 * 32 + 16, y: 11 * 32 + 16 });
    sim.setCoopPlayerPosition('b', { ...homeCenter });
    const start = { ...sim.getPlayerData().position };
    let maxStep = 0;
    let prev = { ...start };
    for (let i = 0; i < 3000 && sim.getDailyRoutineState() !== 'SLEEPING'; i++) {
      sim.update(1 / 20);
      const p = sim.getPlayerData().position;
      maxStep = Math.max(maxStep, Math.hypot(p.x - prev.x, p.y - prev.y));
      prev = { ...p };
    }
    assert.equal(sim.getDailyRoutineState(), 'SLEEPING', 'client: tự đi về nhà rồi ngủ');
    assert.ok(states.includes('RETURNING_HOME') && states.includes('SLEEPING'), 'client: báo đổi trạng thái để UI chuyển tối');
    assert.ok(maxStep < 16, `client: đi bộ thật, không teleport (bước lớn nhất ${maxStep.toFixed(1)}px)`);
    assert.ok(Math.hypot(prev.x - homeCenter.x, prev.y - homeCenter.y) < 24, 'client: tới cửa nhà');
    assert.equal(sim.getClock().getTime().day, startDay, 'client không tự chốt ngày (server quyết định)');

    // Server chốt ngày (snapshot đổi giờ): trạng thái tự về AT_HOME, mở lại điều khiển.
    sim.getClock().advanceToNextDay();
    for (let i = 0; i < 4; i++) sim.update(0.5);
    assert.equal(sim.getDailyRoutineState(), 'AT_HOME', 'client: sang ngày mới thì thức dậy');
    assert.equal(sim.areAllCoopPlayersSleeping(), false, 'client: cờ ngủ được đặt lại cho ngày mới');
  }

  // Runtime server: snapshot gửi cho máy khách phải là trạng thái sống, không phải checkpoint cũ (30 s), nếu không sang ngày bị trễ/đồng hồ bị kéo lùi.
  {
    const seeded = createInitialOnlineWorld({ id: 'o1', displayName: 'O', photoUrl: null }, 'coop-day-world');
    seeded.world.memberships.push({ accountId: 'm2', role: 'member', joinedAt: new Date().toISOString(), lastSeenRevision: 0 });
    seeded.world.avatars.push({ accountId: 'm2', position: { x: 400, y: 400 }, direction: 'down', updatedAt: new Date().toISOString() });
    const runtime = new WorldRuntime(seeded.world, seeded.business, { checkpointIntervalSeconds: 30 });
    let now = Date.now();
    runtime.registerSession('o1', now);
    runtime.registerSession('m2', now);
    const sim = runtime.getSimulation();
    sim.getClock().setTime({ ...sim.getClock().getTime(), hour: 23, minute: 29, isStoreOpen: false });
    const startDay = sim.getClock().getTime().day;
    for (let i = 0; i < 20; i++) {
      now += 250;
      runtime.reportPosition('o1', { ...homeCenter }, 'down', now);
      runtime.reportPosition('m2', { ...homeCenter }, 'down', now);
      runtime.tick(0.25, now);
    }
    assert.equal(sim.getClock().getTime().day, startDay + 1, 'runtime: cả hai về nhà thì sang ngày mới');
    const snapshot = runtime.getSnapshot();
    assert.equal(snapshot.businesses[0].save.worldTime.day, startDay + 1, 'snapshot: save mang ngày mới ngay, không chờ checkpoint');
    assert.equal(snapshot.world.worldTime.day, startDay + 1, 'snapshot: giờ thế giới là giờ sống');
  }

  // Người kia đã out (không có phiên): server tự cho họ về nhà ngủ, người còn lại về nhà là sang ngày ngay như chơi đơn.
  {
    const seeded = createInitialOnlineWorld({ id: 'o1', displayName: 'O', photoUrl: null }, 'offline-partner-world');
    seeded.world.memberships.push({ accountId: 'm2', role: 'member', joinedAt: new Date().toISOString(), lastSeenRevision: 0 });
    seeded.world.avatars.push({ accountId: 'm2', position: { x: 400, y: 400 }, direction: 'down', updatedAt: new Date().toISOString() });
    const runtime = new WorldRuntime(seeded.world, seeded.business, { checkpointIntervalSeconds: 30 });
    let now = Date.now();
    runtime.registerSession('o1', now); // m2 không đăng ký phiên = đã out
    const sim = runtime.getSimulation();
    sim.getClock().setTime({ ...sim.getClock().getTime(), hour: 23, minute: 29, isStoreOpen: false });
    const startDay = sim.getClock().getTime().day;
    for (let i = 0; i < 40 && sim.getClock().getTime().day === startDay; i++) {
      now += 250;
      runtime.reportPosition('o1', { ...homeCenter }, 'down', now);
      runtime.tick(0.25, now);
    }
    assert.equal(sim.getClock().getTime().day, startDay + 1, 'người kia out: ngày vẫn sang khi mình về nhà');
  }

  // Người kia online nhưng AFK ở xa nhà: sau ~30 s thực server tự cho họ ngủ, ngày vẫn sang; snapshot báo đúng hiện diện.
  {
    const seeded = createInitialOnlineWorld({ id: 'o1', displayName: 'O', photoUrl: null }, 'afk-partner-world');
    seeded.world.memberships.push({ accountId: 'm2', role: 'member', joinedAt: new Date().toISOString(), lastSeenRevision: 0 });
    seeded.world.avatars.push({ accountId: 'm2', position: { x: 400, y: 400 }, direction: 'down', updatedAt: new Date().toISOString() });
    const runtime = new WorldRuntime(seeded.world, seeded.business, { checkpointIntervalSeconds: 30, heartbeatTimeoutMs: 10 * 60 * 1000 });
    let now = Date.now();
    runtime.registerSession('o1', now);
    runtime.registerSession('m2', now);
    const sim = runtime.getSimulation();
    sim.getClock().setTime({ ...sim.getClock().getTime(), hour: 23, minute: 29, isStoreOpen: false });
    const startDay = sim.getClock().getTime().day;
    let dayAtHalf = startDay;
    for (let i = 0; i < 400 && sim.getClock().getTime().day === startDay; i++) {
      now += 250;
      runtime.heartbeat('o1', now);
      runtime.heartbeat('m2', now);
      runtime.reportPosition('o1', { ...homeCenter }, 'down', now); // m2 đứng yên ở (400,400)
      runtime.tick(0.25, now);
      if (i === 80) dayAtHalf = sim.getClock().getTime().day;
    }
    assert.equal(dayAtHalf, startDay, 'AFK: chưa tới 30 s thì vẫn chờ');
    assert.equal(sim.getClock().getTime().day, startDay + 1, 'AFK: quá 30 s thì ngày vẫn sang');
    const presence = runtime.getSnapshot().coop?.players ?? [];
    assert.equal(presence.length, 2, 'snapshot có hiện diện hai người');
    assert.ok(presence.every((p) => p.online), 'cả hai đều còn phiên');
  }

  // Bỏ phiếu đổi tốc độ: người kia rời thì phiếu đang chờ tự thực hiện ngay; đã vắng sẵn thì đổi luôn không cần phiếu.
  {
    const seeded = createInitialOnlineWorld({ id: 'o1', displayName: 'O', photoUrl: null }, 'vote-world');
    seeded.world.memberships.push({ accountId: 'm2', role: 'member', joinedAt: new Date().toISOString(), lastSeenRevision: 0 });
    seeded.world.avatars.push({ accountId: 'm2', position: { x: 400, y: 400 }, direction: 'down', updatedAt: new Date().toISOString() });
    const runtime = new WorldRuntime(seeded.world, seeded.business, { heartbeatTimeoutMs: 1000, checkpointIntervalSeconds: 30 });
    const now = Date.now();
    runtime.registerSession('o1', now);
    runtime.registerSession('m2', now);
    const scale = () => runtime.getSimulation().getClock().getTime().timeScale;
    assert.equal(runtime.submitTimeVote('o1', { type: 'change_speed', targetSpeed: 4 }, now).status, 'pending', 'hai người: phải chờ đồng ý');
    assert.equal(scale(), 90);
    runtime.unregisterSession('m2'); // người kia thoát đúng lúc đang chờ
    assert.equal(scale(), 360, 'người kia out → tự đổi 4x ngay');
    assert.deepEqual(runtime.takeVoteChange(), { executed: true, status: 'executed' });
    assert.equal(runtime.getActiveTimeVote(now), null);
    assert.equal(runtime.takeVoteChange(), null, 'chỉ báo một lần');
    assert.equal(runtime.submitTimeVote('o1', { type: 'change_speed', targetSpeed: 2 }, now).status, 'executed', 'một mình: đổi luôn');
    assert.equal(scale(), 180);

    // Người kia mất kết nối (hết nhịp tim) khi đang chờ cũng tự thực hiện.
    runtime.registerSession('m2', now);
    assert.equal(runtime.submitTimeVote('o1', { type: 'change_speed', targetSpeed: 1 }, now).status, 'pending');
    runtime.heartbeat('o1', now + 2000);
    runtime.tick(0.25, now + 2000);
    assert.equal(scale(), 90, 'người kia rớt kết nối → tự đổi');
    // Người đề nghị là người rời, người còn lại chưa đồng ý: hủy, không đổi.
    runtime.registerSession('m2', now + 2100);
    runtime.submitTimeVote('m2', { type: 'change_speed', targetSpeed: 4 }, now + 2100);
    runtime.unregisterSession('m2');
    assert.equal(scale(), 90, 'phiếu mồ côi không tự đổi tốc độ cho người ở lại');
    assert.equal(runtime.getActiveTimeVote(now + 2100), null);
  }
  console.log('✓ Coop day tests passed');
}
