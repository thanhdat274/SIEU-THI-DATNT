import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { readRuntimeConfig } from './runtime-config.js';

/**
 * Tiêm lỗi cho đường lệnh co-op (OpenSpec `shared-alley-multiplayer` 3.1/3.3/5.2) trên Mongo thật, DB ngẫu nhiên riêng:
 *  - mất ACK rồi server khởi động lại: client gửi lại cùng mã lệnh → trả biên nhận cũ, không áp hai lần;
 *  - DB sập đúng lúc commit: lệnh lỗi, không ghi nửa chừng; DB lên lại thì gửi lại áp đúng một lần;
 *  - ticket WebSocket dùng một lần + hết hạn 30 giây; guard không bypass từ chối khi thiếu/sai token Firebase.
 */
async function run() {
  const config = readRuntimeConfig();
  if (!config.mongoUri) throw new Error('MONGO_URI is not configured');
  const goodUri = config.mongoUri;
  const testDbName = `${config.databaseName}_fail_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  const previousDbName = process.env.MONGODB_DATABASE;
  process.env.MONGODB_DATABASE = testDbName;
  const client = new MongoClient(goodUri, { serverSelectionTimeoutMS: 8000, maxPoolSize: 2 });
  try {
    await client.connect();
    const { GameController } = await import('./bootstrap.js');
    const { closeDatabase } = await import('./database.js');
    const { createWebSocketTicket, consumeWebSocketTicket } = await import('./firebase-admin.js');
    const { FirebaseAuthGuard } = await import('./auth.guard.js');
    const owner = { gameAccount: { uid: `fail-owner-${randomUUID()}`, name: 'Owner', email: null } };
    const controller = new GameController();
    const { world } = await controller.createWorld(owner as any, { name: 'Failure injection' });
    await client.db(testDbName).collection<{ _id: string }>('game_worlds').updateOne({ _id: world.id }, { $set: { 'businesses.0.save.worldTime.isStoreOpen': false, 'businesses.0.save.player.money': 5_000_000 } });
    const snapshot = () => controller.getWorld(owner as any, world.id);
    const send = async (ctrl: InstanceType<typeof GameController>, commandId: string, payload: unknown) => {
      const current = await ctrl.getWorld(owner as any, world.id);
      return ctrl.commitCommand(owner as any, world.id, {
        expectedRevision: current.world.revision,
        receipt: { commandId, actorId: owner.gameAccount.uid, status: 'accepted', revision: current.world.revision + 1, payloadJson: JSON.stringify(payload), createdAt: new Date().toISOString() },
        updatedBusiness: current.businesses[0],
      });
    };
    const racks = async () => (await snapshot()).businesses[0].save.storageRackCount ?? 0;

    // 1. Mất ACK + server khởi động lại (controller mới, không còn bộ nhớ đệm): gửi lại cùng mã → biên nhận cũ, áp một lần.
    const rackPayload = { type: 'buy_storage_rack' };
    const before = await racks();
    const first = await send(controller, 'rack-lost-ack', rackPayload);
    assert.equal(first.committed, true);
    const revisionAfterFirst = (await snapshot()).world.revision;
    const restarted = new GameController();
    const retried = await send(restarted, 'rack-lost-ack', rackPayload);
    assert.equal(retried.committed, true, 'gửi lại sau khi mất ACK vẫn báo đã commit');
    assert.equal(retried.receipt.commandId, 'rack-lost-ack');
    assert.equal(await racks(), before + 1, 'lệnh gửi lại không áp lần hai');
    assert.equal((await snapshot()).world.revision, revisionAfterFirst, 'revision không tăng thêm khi gửi lại');
    await assert.rejects(send(restarted, 'rack-lost-ack', { type: 'buy_storage_rack', extra: 1 }), 'cùng mã lệnh khác nội dung bị từ chối');

    // 2. DB sập giữa lúc commit: lệnh lỗi rõ ràng, trạng thái không đổi; DB lên lại thì gửi lại áp đúng một lần.
    const outageBefore = await snapshot();
    await closeDatabase();
    process.env.MONGO_URI = 'mongodb://127.0.0.1:1/?serverSelectionTimeoutMS=500';
    await assert.rejects(send(restarted, 'rack-during-outage', rackPayload), 'DB sập: lệnh bị lỗi, không im lặng');
    await closeDatabase();
    process.env.MONGO_URI = goodUri;
    const outageAfter = await snapshot();
    assert.equal(outageAfter.world.revision, outageBefore.world.revision, 'DB sập không ghi nửa chừng');
    assert.equal(outageAfter.businesses[0].save.storageRackCount ?? 0, outageBefore.businesses[0].save.storageRackCount ?? 0);
    assert.equal((await send(restarted, 'rack-during-outage', rackPayload)).committed, true, 'DB lên lại: gửi lại thành công');
    assert.equal(await racks(), before + 2, 'áp đúng một lần sau sự cố');

    // 3. Ticket WebSocket: một lần, có hạn.
    const ticket = await createWebSocketTicket(owner.gameAccount.uid);
    assert.equal((await consumeWebSocketTicket(ticket))?.uid, owner.gameAccount.uid, 'ticket hợp lệ đổi được đúng tài khoản');
    assert.equal(await consumeWebSocketTicket(ticket), null, 'ticket chỉ dùng một lần');
    const expired = randomUUID();
    await client.db(testDbName).collection<{ _id: string }>('websocket_tickets').insertOne({ _id: expired, accountId: owner.gameAccount.uid, expiresAt: new Date(Date.now() - 1000) } as any);
    assert.equal(await consumeWebSocketTicket(expired), null, 'ticket hết hạn bị từ chối');

    // 4. Guard Firebase (không bypass): thiếu hoặc sai token → 401, không gán tài khoản.
    const previousBypass = process.env.GOOGLE_AUTH_BYPASS;
    delete process.env.GOOGLE_AUTH_BYPASS;
    const guard = new FirebaseAuthGuard();
    for (const authorization of [undefined, 'Bearer not-a-real-token']) {
      const request: { headers: Record<string, string | undefined>; gameAccount?: unknown } = { headers: { authorization } };
      const context = { switchToHttp: () => ({ getRequest: () => request }) };
      await assert.rejects(guard.canActivate(context as any), (error: { status?: number }) => error.status === 401, `token ${authorization ?? '(thiếu)'} → 401`);
      assert.equal(request.gameAccount, undefined);
    }
    if (previousBypass !== undefined) process.env.GOOGLE_AUTH_BYPASS = previousBypass;

    console.log('PASS failure-injection: mất ACK + khởi động lại, DB sập giữa lệnh, ticket một lần/hết hạn, guard 401');
    await closeDatabase();
  } finally {
    process.env.MONGO_URI = goodUri;
    await client.db(testDbName).dropDatabase();
    await client.close();
    if (previousDbName === undefined) delete process.env.MONGODB_DATABASE; else process.env.MONGODB_DATABASE = previousDbName;
  }
}

void run().catch(async (error: unknown) => {
  console.error(`Failure-injection test failed: ${error instanceof Error ? error.stack ?? error.message : 'unknown error'}`);
  const { closeDatabase } = await import('./database.js');
  await closeDatabase().catch(() => undefined);
  process.exit(1);
});
