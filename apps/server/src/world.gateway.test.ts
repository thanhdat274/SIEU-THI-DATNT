import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';
import { createInitialOnlineWorld } from '@game/data';
import { createServer } from './bootstrap.js';
import { createWebSocketTicket } from './firebase-admin.js';
import { connectDatabase } from './database.js';
import { WorldGateway } from './world.gateway.js';
import { applySnapshotPatches } from '@game/shared';

type EventMessage = { event: string; data: any };
const joinedMessages = new WeakMap<WebSocket, EventMessage>();
/** Snapshot dựng lại từ 'world:snapshot' + 'world:snapshot-delta' (như client thật), để test đọc trạng thái đầy đủ. */
const rebuiltSnapshots = new WeakMap<WebSocket, { seq: number; data: any }>();

function trackSnapshots(socket: WebSocket) {
  socket.on('message', (raw: WebSocket.RawData) => {
    let message: EventMessage;
    try { message = JSON.parse(raw.toString()) as EventMessage; } catch { return; }
    if (message.event === 'world:snapshot' || message.event === 'session:joined') rebuiltSnapshots.set(socket, { seq: message.data.seq ?? -1, data: message.data });
    else if (message.event === 'world:snapshot-delta') {
      const base = rebuiltSnapshots.get(socket);
      if (!base || base.seq !== message.data.baseSeq) { rebuiltSnapshots.delete(socket); return; }
      rebuiltSnapshots.set(socket, { seq: message.data.seq, data: applySnapshotPatches(base.data, message.data.patches) });
    }
  });
}

function nextEvent(socket: WebSocket, predicate: (message: EventMessage) => boolean, timeoutMs = 5000): Promise<EventMessage> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { cleanup(); reject(new Error('Timed out waiting for WebSocket event')); }, timeoutMs);
    const onMessage = (raw: WebSocket.RawData) => {
      let message: EventMessage;
      try { message = JSON.parse(raw.toString()) as EventMessage; }
      catch { return; }
      if (message.event === 'world:snapshot-delta') {
        const rebuilt = rebuiltSnapshots.get(socket);
        if (!rebuilt || rebuilt.seq !== message.data.seq) return;
        message = { event: 'world:snapshot', data: rebuilt.data };
      }
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
  trackSnapshots(socket);
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
  // Sổ góp xóm: cấp thành phố 4 (hiện trang công viên) và quỹ vừa đủ để khoản góp lớn phải qua phiếu (> 30% quỹ).
  seeded.business.save.cityProgress = { level: 5, claimedCityGoalIds: [], milestones: [], metrics: {} };
  seeded.business.save.player.money = 3_000_000;
  seeded.business.save.inventory = [{ productId: 'xa_phong', quantity: 10 }] as any;
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

    let memberSocket = await connect(url, memberId);
    sockets.push(memberSocket);
    assert.equal(WorldGateway.getActiveSessionCount(seeded.world.id), 2);
    heartbeatTimer = setInterval(() => {
      for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ event: 'heartbeat', data: {} }));
    }, 1000);
    const memberJoin = getJoined(memberSocket);
    assert.equal(memberJoin.data.world.avatars.length, 2);

    assert.equal(typeof memberJoin.data.seq, 'number', 'session:joined kèm seq để ghép delta ngay');
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

    // Lệnh qua WebSocket: cùng logic commit, trả 'command:result' theo requestId; lỗi trả status + thân lỗi.
    {
      const { GameController } = await import('./bootstrap.js');
      const controller = new GameController();
      const request = { gameAccount: { uid: owner.id } };
      const current = await controller.getWorld(request as any, seeded.world.id);
      const wasOpen = current.businesses[0].save.worldTime.isStoreOpen;
      const expected = WorldGateway.getLiveRuntime(seeded.world.id)!.getRevision();
      const rejected = nextEvent(ownerSocket, message => message.event === 'command:result' && message.data.requestId === 'ws-bad');
      ownerSocket.send(JSON.stringify({ event: 'command', data: { requestId: 'ws-bad', body: { expectedRevision: expected } } }));
      const bad = await rejected;
      assert.equal(bad.data.ok, false);
      assert.equal(bad.data.status, 400);
      const accepted = nextEvent(ownerSocket, message => message.event === 'command:result' && message.data.requestId === 'ws-ok');
      const memberSees = nextEvent(memberSocket, message => message.event === 'world:snapshot' && message.data.world.revision === expected + 1);
      ownerSocket.send(JSON.stringify({ event: 'command', data: { requestId: 'ws-ok', body: {
        expectedRevision: expected,
        receipt: { commandId: `ws-${suffix}`, actorId: owner.id, status: 'accepted', revision: expected + 1, payloadJson: JSON.stringify({ type: 'store_status', isOpen: !wasOpen }), createdAt: new Date().toISOString() },
        // Lệnh server phát lại: client chỉ gửi mã save, không gửi cả save.
        updatedBusiness: { ...current.businesses[0], save: { id: current.businesses[0].save.id } },
      } } }));
      const ok = await accepted;
      assert.equal(ok.data.ok, true, JSON.stringify(ok.data));
      assert.equal(ok.data.result.revision, expected + 1);
      assert.equal(ok.data.result.updatedBusiness, undefined, 'kết quả qua WS không kèm save (đã có trong delta)');
      await memberSees;
      // Ghi DB chạy nền: chờ hàng đợi của hẻm rồi DB phải theo kịp runtime.
      await WorldGateway.flushCheckpoints(seeded.world.id);
      const persisted = await controller.getWorld(request as any, seeded.world.id);
      assert.equal(persisted.world.revision, expected + 1, 'DB nhận lệnh ghi nền');
      assert.equal(persisted.businesses[0].save.worldTime.isStoreOpen, !wasOpen);
      // Gửi lại cùng commandId (vd. client thử lại) không chạy lệnh hai lần.
      const dup = nextEvent(ownerSocket, message => message.event === 'command:result' && message.data.requestId === 'ws-dup');
      ownerSocket.send(JSON.stringify({ event: 'command', data: { requestId: 'ws-dup', body: {
        expectedRevision: expected,
        receipt: { commandId: `ws-${suffix}`, actorId: owner.id, status: 'accepted', revision: expected + 1, payloadJson: JSON.stringify({ type: 'store_status', isOpen: !wasOpen }), createdAt: new Date().toISOString() },
        updatedBusiness: { ...current.businesses[0], save: { id: current.businesses[0].save.id } },
      } } }));
      const dupResult = await dup;
      assert.equal(dupResult.data.ok, true);
      assert.equal(WorldGateway.getLiveRuntime(seeded.world.id)!.getRevision(), expected + 1, 'lệnh trùng không tăng revision');
    }

    // Phiếu góp tiền vào Quỹ xây dựng của sổ xóm qua gateway thật: tạo phiếu, từ chối, duyệt, ô đã đủ khi phiếu chạy.
    {
      const { GameController } = await import('./bootstrap.js');
      const controller = new GameController();
      const cash = (amount: number) => ({ type: 'donate_to_bundle', bundleId: 'bundle_park', slotId: 'slot_park_cash', amount });
      const live = () => WorldGateway.getLiveRuntime(seeded.world.id)!.getSnapshot('').businesses[0].save as any;
      const slotCash = () => live().civic?.bundles?.bundle_park?.slots?.slot_park_cash ?? 0;
      const sendWs = async (socket: WebSocket, who: string, id: string, payload: unknown) => {
        const current = await controller.getWorld({ gameAccount: { uid: who } } as any, seeded.world.id);
        const result = nextEvent(socket, message => message.event === 'command:result' && message.data.requestId === id);
        socket.send(JSON.stringify({ event: 'command', data: { requestId: id, body: {
          expectedRevision: current.world.revision,
          receipt: { commandId: id, actorId: who, status: 'accepted', revision: current.world.revision + 1, payloadJson: JSON.stringify(payload), createdAt: new Date().toISOString() },
          updatedBusiness: { ...current.businesses[0], save: { id: current.businesses[0].save.id } },
        } } }));
        return result;
      };
      const voteUpdate = (socket: WebSocket, status: string) => nextEvent(socket, message => message.event === 'land-vote:update' && message.data.status === status);
      const respond = (agree: boolean) => ownerSocket.send(JSON.stringify({ event: 'land-vote:respond', data: { agree } }));
      const money0 = live().player.money;
      assert.equal(slotCash(), 0);

      // (1) Tạo phiếu: khoản góp lớn của thành viên không chạy ngay, hẻm nhận phiếu có mô tả.
      const pendingSeen = voteUpdate(ownerSocket, 'pending');
      // Xin góp 5.000.000₫ nhưng ô chỉ còn thiếu 1.750.000₫ → mô tả/giá phiếu là phần ô thực sự nhận.
      const created = await sendWs(memberSocket, memberId, 'civic-vote-refuse', cash(5_000_000));
      assert.equal(created.data.ok, true, JSON.stringify(created.data));
      assert.equal(created.data.result.pendingVote, true, 'khoản góp lớn thành phiếu');
      const pendingMsg = await pendingSeen;
      assert.match(String(pendingMsg.data.vote?.description), /^Góp 1[.,\u00a0\s]?750[.,\u00a0\s]?000₫ vào Quỹ xây dựng — \S.*/, `mô tả phiếu theo phần ô nhận: ${pendingMsg.data.vote?.description}`);
      assert.equal(slotCash(), 0, 'chưa duyệt thì chưa trừ tiền');

      // (2) Từ chối: không góp, không trừ tiền.
      const rejectedSeen = voteUpdate(memberSocket, 'rejected');
      respond(false);
      await rejectedSeen;
      assert.equal(slotCash(), 0, 'phiếu bị từ chối: ô không tăng');
      assert.equal(live().player.money, money0, 'phiếu bị từ chối: không mất tiền');

      // (3) Duyệt: lệnh chạy với người góp là người tạo phiếu (lấy từ phiên), tiền bị trừ đúng số.
      const pending2 = voteUpdate(ownerSocket, 'pending');
      await sendWs(memberSocket, memberId, 'civic-vote-approve', cash(1_200_000));
      await pending2;
      const executedSeen = voteUpdate(memberSocket, 'executed');
      respond(true);
      await executedSeen;
      assert.equal(slotCash(), 1_200_000, 'phiếu được duyệt: ô tăng đúng số tiền');
      assert.equal(live().player.money, money0 - 1_200_000, 'phiếu được duyệt: trừ đúng số tiền');
      const contributions = live().civic.bundles.bundle_park.contributions as { playerId: string }[];
      assert.equal(contributions[contributions.length - 1].playerId, memberId, 'đóng góp ghi cho người tạo phiếu');

      // (4) Ô đã đủ khi phiếu chạy: phiếu chờ, người kia góp đủ phần còn thiếu, duyệt xong phiếu thất bại kèm thông báo.
      const short = 1_750_000 - slotCash();
      const pending3 = voteUpdate(ownerSocket, 'pending');
      const created3 = await sendWs(memberSocket, memberId, 'civic-vote-full', cash(short));
      assert.equal(created3.data.result.pendingVote, true, `phần còn thiếu ${short}đ vẫn > 30% quỹ → phiếu`);
      await pending3;
      const filled = await sendWs(ownerSocket, owner.id, 'civic-owner-fill-1', cash(500_000));
      assert.equal(filled.data.ok, true, JSON.stringify(filled.data));
      const filled2 = await sendWs(ownerSocket, owner.id, 'civic-owner-fill-2', cash(short - 500_000));
      assert.equal(filled2.data.ok, true, JSON.stringify(filled2.data));
      assert.equal(slotCash(), 1_750_000, 'người kia đã góp đủ ô');
      const moneyBeforeFail = live().player.money;
      const failedSeen = voteUpdate(memberSocket, 'failed');
      respond(true);
      const failed = await failedSeen;
      assert.match(String(failed.data.message), /đủ/, 'phiếu thất bại kèm thông báo "Ô này vừa được góp đủ."');
      assert.equal(slotCash(), 1_750_000, 'ô không bị góp quá');
      assert.equal(live().player.money, moneyBeforeFail, 'phiếu thất bại không trừ tiền');
      await WorldGateway.flushCheckpoints(seeded.world.id);

      // (5) Bundle phòng khám (cấp 5), quỹ còn ~1,25tr: ngưỡng phiếu = 30% quỹ ≈ 375k.
      //     DB thật: Mongo + runtime sống của gateway; state chỉ đổi qua lệnh/updateWorldSettings, không ghi thẳng DB.
      const clinicCash = () => live().civic?.bundles?.bundle_clinic?.slots?.slot_clinic_cash ?? 0;
      const clinicCashCmd = (amount: number) => ({ type: 'donate_to_bundle', bundleId: 'bundle_clinic', slotId: 'slot_clinic_cash', amount });
      const ownerReq = { gameAccount: { uid: owner.id } } as any;
      const m1 = live().player.money;
      const small = await sendWs(memberSocket, memberId, 'clinic-small', clinicCashCmd(300_000));
      assert.equal(small.data.ok, true, JSON.stringify(small.data));
      assert.ok(!small.data.result?.pendingVote, 'góp ≤ ngưỡng: commit thẳng, không phiếu');
      assert.equal(clinicCash(), 300_000);
      assert.equal(live().player.money, m1 - 300_000);

      // (6) memberLandPermissions = 'none': chặn góp TIỀN của thành viên ở server; góp hàng và chủ hẻm vẫn được.
      await controller.updateWorldSettings(ownerReq, seeded.world.id, { memberLandPermissions: 'none' });
      const denied = await sendWs(memberSocket, memberId, 'clinic-none-member', clinicCashCmd(50_000));
      assert.equal(denied.data.ok, false, 'thành viên quyền none bị chặn góp tiền');
      assert.equal(clinicCash(), 300_000, 'bị chặn thì không góp');
      const goodsOk = await sendWs(memberSocket, memberId, 'clinic-none-goods', { type: 'donate_to_bundle', bundleId: 'bundle_clinic', slotId: 'slot_clinic_hygiene', productId: 'xa_phong', quantity: 3 });
      assert.equal(goodsOk.data.ok, true, `góp hàng vẫn được dưới quyền none: ${JSON.stringify(goodsOk.data)}`);
      const ownerOk = await sendWs(ownerSocket, owner.id, 'clinic-none-owner', clinicCashCmd(50_000));
      assert.equal(ownerOk.data.ok, true, 'chủ hẻm luôn góp được');
      assert.equal(clinicCash(), 350_000);
      await controller.updateWorldSettings(ownerReq, seeded.world.id, { memberLandPermissions: 'vote' });

      // (7) Bạn cùng hẻm offline: khoản lớn (> ngưỡng) chạy thẳng theo luật D3. (Trần góp theo ngày: CHƯA có code, xem tổng hợp.md.)
      memberSocket.close();
      for (let i = 0; i < 50 && WorldGateway.getActiveSessionCount(seeded.world.id) > 1; i++) await new Promise(resolve => setTimeout(resolve, 50));
      assert.equal(WorldGateway.getActiveSessionCount(seeded.world.id), 1, 'thành viên đã offline');
      const offline = await sendWs(ownerSocket, owner.id, 'clinic-offline', clinicCashCmd(600_000));
      assert.equal(offline.data.ok, true, JSON.stringify(offline.data));
      assert.ok(!offline.data.result?.pendingVote, 'bạn cùng hẻm offline: chạy thẳng, không phiếu');
      assert.equal(clinicCash(), 950_000);
      memberSocket = await connect(url, memberId);
      sockets.push(memberSocket);
      getJoined(memberSocket);
      assert.equal(WorldGateway.getActiveSessionCount(seeded.world.id), 2);
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
