import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';
import { createInitialOnlineWorld } from '@game/data';
import { createServer } from './bootstrap.js';
import { createWebSocketTicket } from './firebase-admin.js';
import { connectDatabase } from './database.js';
import { WorldGateway } from './world.gateway.js';

type EventMessage = { event: string; data: any };
const joinedMessages = new WeakMap<WebSocket, EventMessage>();

function nextEvent(socket: WebSocket, predicate: (message: EventMessage) => boolean, timeoutMs = 5000): Promise<EventMessage> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { cleanup(); reject(new Error('Timed out waiting for WebSocket event')); }, timeoutMs);
    const onMessage = (raw: WebSocket.RawData) => {
      let message: EventMessage;
      try { message = JSON.parse(raw.toString()) as EventMessage; }
      catch { return; }
      if (!predicate(message)) return;
      cleanup();
      resolve(message);
    };
    const onError = (error: Error) => { cleanup(); reject(error); };
    const cleanup = () => { clearTimeout(timeout); socket.off('message', onMessage); socket.off('error', onError); };
    socket.on('message', onMessage);
    socket.on('error', onError);
  });
}

async function connect(url: string, accountId: string): Promise<WebSocket> {
  const ticket = await createWebSocketTicket(accountId);
  const socket = new WebSocket(url, `ticket.${ticket}`, { origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173' });
  const joined = nextEvent(socket, message => message.event === 'session:joined').then(message => {
    joinedMessages.set(socket, message);
    return message;
  });
  await new Promise<void>((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });
  await joined;
  return socket;
}

function getJoined(socket: WebSocket): EventMessage {
  const message = joinedMessages.get(socket);
  if (!message) throw new Error('Missing initial session snapshot');
  return message;
}

async function run() {
  const suffix = randomUUID();
  const owner = { id: `gateway-owner-${suffix}`, displayName: 'Gateway owner', photoUrl: null };
  const memberId = `gateway-member-${suffix}`;
  const seeded = createInitialOnlineWorld(owner, `gateway-world-${suffix}`);
  seeded.world.name = 'Gateway integration';
  seeded.world.memberships.push({ accountId: memberId, role: 'member', joinedAt: new Date().toISOString(), lastSeenRevision: 0 });
  seeded.world.avatars.push({ accountId: memberId, position: { x: 400, y: 400 }, direction: 'down', updatedAt: new Date().toISOString() });
  const database = await connectDatabase();
  await database.collection<any>('game_worlds').insertOne({ _id: seeded.world.id, world: seeded.world, businesses: [seeded.business], invites: [] });
  const app = await createServer();
  const sockets: WebSocket[] = [];
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  try {
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address();
    if (!address || typeof address === 'string') throw new Error('Missing test server address');
    const url = `ws://127.0.0.1:${address.port}/ws?worldId=${encodeURIComponent(seeded.world.id)}`;
    const ownerSocket = await connect(url, owner.id);
    sockets.push(ownerSocket);
    assert.equal(WorldGateway.getActiveSessionCount(seeded.world.id), 1);
    const ownerJoin = getJoined(ownerSocket);
    assert.equal(ownerJoin.data.world.id, seeded.world.id);

    const memberSocket = await connect(url, memberId);
    sockets.push(memberSocket);
    assert.equal(WorldGateway.getActiveSessionCount(seeded.world.id), 2);
    heartbeatTimer = setInterval(() => {
      for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ event: 'heartbeat', data: {} }));
    }, 1000);
    const memberJoin = getJoined(memberSocket);
    assert.equal(memberJoin.data.world.avatars.length, 2);

    const initialMember = memberJoin.data.world.avatars.find((avatar: any) => avatar.accountId === memberId);
    const ownerSnapshot = nextEvent(ownerSocket, message => message.event === 'world:snapshot' &&
      message.data.world.avatars.find((avatar: any) => avatar.accountId === owner.id)?.position.x !== seeded.world.avatars[0].position.x);
    ownerSocket.send(JSON.stringify({ event: 'input', data: { sequence: 1, accountId: memberId, direction: { x: 1, y: 0 } } }));
    const moved = await ownerSnapshot;
    assert.notEqual(moved.data.world.avatars.find((avatar: any) => avatar.accountId === owner.id).position.x, seeded.world.avatars[0].position.x);
    assert.deepEqual(moved.data.world.avatars.find((avatar: any) => avatar.accountId === memberId).position, initialMember.position,
      'Client supplied accountId cannot move another member');

    // Vị trí thật do client báo: người kia nhận ngay qua kênh avatar gọn, không chờ snapshot đầy đủ.
    const reportedAt = { x: moved.data.world.avatars.find((avatar: any) => avatar.accountId === owner.id).position.x + 12, y: 400 };
    const memberSeesOwner = nextEvent(memberSocket, message => message.event === 'avatars:update' &&
      message.data.avatars.some((avatar: any) => avatar.accountId === owner.id && avatar.position.x === reportedAt.x));
    ownerSocket.send(JSON.stringify({ event: 'position', data: { position: reportedAt, direction: 'right' } }));
    await memberSeesOwner;

    // Voice: tín hiệu tới đúng người kia với `from` do server gán; kind lạ không được chuyển; người gửi không nhận lại bản của mình.
    {
      const memberGetsSignal = nextEvent(memberSocket, message => message.event === 'voice:signal');
      let ownerEchoed = false;
      const onOwnerMessage = (raw: WebSocket.RawData) => { if (raw.toString().includes('voice:signal')) ownerEchoed = true; };
      ownerSocket.on('message', onOwnerMessage);
      ownerSocket.send(JSON.stringify({ event: 'voice:signal', data: { kind: 'hangup', payload: {} } }));
      ownerSocket.send(JSON.stringify({ event: 'voice:signal', data: { kind: 'offer', payload: { sdp: 'v=0' }, from: 'forged' } }));
      const signal = await memberGetsSignal;
      assert.deepEqual(signal.data, { from: owner.id, kind: 'offer', payload: { sdp: 'v=0' } }, 'from do server gán; kind lạ bị bỏ');
      await new Promise(resolve => setTimeout(resolve, 150));
      ownerSocket.off('message', onOwnerMessage);
      assert.equal(ownerEchoed, false, 'người gửi không nhận lại tín hiệu của mình');
    }

    // Lệnh qua HTTP chạy trên runtime đang sống: người kia nhận ngay snapshot mới (revision + trạng thái tiệm) qua WebSocket.
    {
      const { GameController } = await import('./bootstrap.js');
      const controller = new GameController();
      const request = { gameAccount: { uid: owner.id, name: 'Gateway owner', email: null } };
      const current = await controller.getWorld(request as any, seeded.world.id);
      const wasOpen = current.businesses[0].save.worldTime.isStoreOpen;
      const liveBefore = WorldGateway.getLiveRuntime(seeded.world.id)!;
      assert.ok(liveBefore, 'có runtime sống khi có người online');
      const expected = liveBefore.getRevision();
      const memberGetsCommit = nextEvent(memberSocket, message => message.event === 'world:snapshot' &&
        message.data.world.revision === expected + 1 && message.data.businesses[0].save.worldTime.isStoreOpen === !wasOpen);
      await controller.commitCommand(request as any, seeded.world.id, {
        expectedRevision: expected,
        receipt: { commandId: `live-${suffix}`, actorId: owner.id, status: 'accepted', revision: expected + 1, payloadJson: JSON.stringify({ type: 'store_status', isOpen: !wasOpen }), createdAt: new Date().toISOString() },
        updatedBusiness: current.businesses[0],
      });
      await memberGetsCommit;
      assert.equal(WorldGateway.getLiveRuntime(seeded.world.id)!.getRevision(), expected + 1, 'runtime sống theo đúng revision DB');
      assert.equal((await controller.getWorld(request as any, seeded.world.id)).world.revision, expected + 1);
    }

    const ownerVoteEvent = nextEvent(ownerSocket, message => message.event === 'time-vote:update');
    const memberVoteEvent = nextEvent(memberSocket, message => message.event === 'time-vote:update' && message.data.result?.status === 'executed');
    const dayBefore = moved.data.world.worldTime.day;
    ownerSocket.send(JSON.stringify({ event: 'time-vote', data: { type: 'advance_day' } }));
    const firstVote = await ownerVoteEvent;
    assert.equal(firstVote.data.result.status, 'pending');
    const secondOwnerVoteEvent = nextEvent(ownerSocket, message => message.event === 'time-vote:update');
    memberSocket.send(JSON.stringify({ event: 'time-vote', data: { type: 'advance_day' } }));
    const [ownerApproved, memberApproved] = await Promise.all([secondOwnerVoteEvent, memberVoteEvent]);
    assert.equal(ownerApproved.data.result.status, 'executed');
    assert.equal(memberApproved.data.snapshot.world.worldTime.day, dayBefore + 1);

    // Both members see the same market (weather, events, supplier day, prices) after the shared day advance.
    const marketOf = (snapshot: any) => snapshot.businesses[0].save.market;
    const sharedMarket = marketOf(memberApproved.data.snapshot);
    assert.ok(sharedMarket?.weather && sharedMarket.suppliers?.cho_dau_moi?.day === dayBefore + 1, 'Snapshot carries the new day market');
    assert.deepEqual(marketOf(ownerApproved.data.snapshot), sharedMarket, 'Both members receive identical market state');

    // A replacement socket closes the older session without unregistering the new one.
    const replacedEvent = nextEvent(ownerSocket, message => message.event === 'session:replaced');
    const replacement = await connect(url, owner.id);
    sockets.push(replacement);
    getJoined(replacement);
    await replacedEvent;
    assert.equal(WorldGateway.getActiveSessionCount(seeded.world.id), 2);

    // Last disconnect queues a durable checkpoint; evict to simulate a new server process.
    for (const socket of [replacement, memberSocket]) socket.close();
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(WorldGateway.getActiveSessionCount(seeded.world.id), 0);
    await WorldGateway.flushCheckpoints(seeded.world.id);
    await WorldGateway.evictIdleRuntime(seeded.world.id);

    const persisted = await database.collection<any>('game_worlds').findOne({ _id: seeded.world.id });
    assert.equal(persisted.world.worldTime.day, dayBefore + 1, 'Final disconnect checkpoint persists the shared day');
    assert.notEqual(persisted.world.avatars.find((avatar: any) => avatar.accountId === owner.id).position.x,
      seeded.world.avatars.find(avatar => avatar.accountId === owner.id)!.position.x,
      'Final disconnect checkpoint persists the avatar position');

    const resumed = await connect(url, owner.id);
    sockets.push(resumed);
    assert.equal(getJoined(resumed).data.world.worldTime.day, dayBefore + 1,
      'A fresh runtime loads persisted clock state after idle runtime eviction');
    assert.deepEqual(marketOf(getJoined(resumed).data), sharedMarket, 'Market state (weather, events, supplier prices and stock) survives reconnect and runtime eviction');
    assert.equal(WorldGateway.getActiveSessionCount(seeded.world.id), 1);
    console.log('PASS WebSocket ticket auth, two-member snapshots, spoofed actor rejection, shared time vote, session replacement, and persisted resume after final disconnect');
  } finally {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    for (const socket of sockets) socket.close();
    await new Promise(resolve => setTimeout(resolve, 50));
    await WorldGateway.flushCheckpoints(seeded.world.id);
    await WorldGateway.evictIdleRuntime(seeded.world.id);
    await database.collection<any>('game_worlds').deleteOne({ _id: seeded.world.id });
    await app.close();
  }
}

void run().catch(error => {
  console.error(`World gateway test failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exitCode = 1;
});
