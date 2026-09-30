import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { readRuntimeConfig } from './runtime-config';
import { WorldRepository } from './world.repository';
import { closeDatabase } from './database';
import { createWebSocketTicket, consumeWebSocketTicket } from './firebase-admin';
import { acceptWebSocketOrigin } from './world.gateway';
import { WorldRuntime } from '@game/core';

async function run() {
  const config = readRuntimeConfig();
  if (!config.mongoUri) throw new Error('MONGO_URI is not configured');
  const client = new MongoClient(config.mongoUri, { serverSelectionTimeoutMS: 8000, maxPoolSize: 2 });
  const testDbName = `${config.databaseName}_test_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  const previousUri = process.env.MONGO_URI;
  const previousLegacyUri = process.env.MONGODB_URI;
  const previousDbName = process.env.MONGODB_DATABASE;
  let worldId: string | undefined;
  try {
    await client.connect();
    // Use an isolated, randomly named sibling database to avoid touching user worlds.
    process.env.MONGO_URI = config.mongoUri;
    process.env.MONGODB_DATABASE = testDbName;
    const database = client.db(testDbName);
    await database.command({ ping: 1 });
    const repository = new WorldRepository();
    const owner = { uid: `test-owner-${randomUUID()}`, name: 'Test owner', email: null };
    const member = { uid: `test-member-${randomUUID()}`, name: 'Test member', email: null };
    const wsTicket = await createWebSocketTicket(owner.uid);
    const storedTicket = await database.collection<{ _id: string; expiresAt: Date }>('websocket_tickets').findOne({ _id: wsTicket });
    assert.ok(storedTicket && storedTicket.expiresAt.getTime() <= Date.now() + 30_000 && storedTicket.expiresAt.getTime() > Date.now());
    assert.equal((await consumeWebSocketTicket(wsTicket))?.uid, owner.uid);
    assert.equal(await consumeWebSocketTicket(wsTicket), null, 'WebSocket ticket is single use');
    assert.equal(acceptWebSocketOrigin('http://localhost:5173', 'http://localhost:5173'), true);
    assert.equal(acceptWebSocketOrigin('https://attacker.invalid', 'http://localhost:5173'), false);
    const { world } = await repository.create(owner, 'Integration test');
    worldId = world.id;
    assert.equal((await repository.list(owner.uid)).length, 1);
    assert.equal((await repository.list(member.uid)).length, 0);
    await rejects('non-member snapshot', repository.getForMember(world.id, member.uid));
    const invite = await repository.createInvite(world.id, owner.uid);
    const joins = await Promise.allSettled([repository.join(member, invite.token), repository.join({ ...member, uid: `${member.uid}-race` }, invite.token)]);
    assert.equal(joins.filter(result => result.status === 'fulfilled').length, 1);
    await rejects('invite single use', repository.join({ ...member, uid: `${member.uid}-reuse` }, invite.token));
    const document = await database.collection<{ _id: string; world: { memberships: unknown[] } }>('game_worlds').findOne({ _id: world.id });
    assert.equal(document?.world.memberships.length, 2);
    const successfulMember = (joins.find(result => result.status === 'fulfilled') as PromiseFulfilledResult<{ world: { memberships: Array<{ accountId: string }> } }>).value.world.memberships.find(item => item.accountId !== owner.uid)!.accountId;
    await rejects('member cannot invite', repository.createInvite(world.id, successfulMember));
    await repository.leave(world.id, successfulMember);
    await rejects('consumed invite remains unusable after capacity frees', repository.join({ ...member, uid: `${member.uid}-after-leave` }, invite.token));
    const replacementInvite = await repository.createInvite(world.id, owner.uid);
    const replacementMember = { uid: `test-replacement-${randomUUID()}`, name: 'Replacement', email: null };
    const replacementJoin = await repository.join(replacementMember, replacementInvite.token);
    const joiner = replacementJoin.world.memberships.find(item => item.accountId === replacementMember.uid);
    assert.ok(joiner);
    await rejects('member cannot reset', repository.reset(world.id, replacementMember.uid));
    await rejects('member cannot invite', repository.createInvite(world.id, replacementMember.uid));
    await rejects('owner cannot leave', repository.leave(world.id, owner.uid));
    await repository.kick(world.id, owner.uid, replacementMember.uid);
    await rejects('kicked member snapshot', repository.getForMember(world.id, replacementMember.uid));
    const resetInvite = await repository.createInvite(world.id, owner.uid);
    await repository.revokeInvite(world.id, owner.uid, resetInvite.inviteId);
    await rejects('revoked invite', repository.join({ ...member, uid: `${member.uid}-revoked` }, resetInvite.token));
    await database.collection<{ _id: string }>('game_worlds').updateOne({ _id: world.id }, { $set: { 'businesses.0.save.player.money': 12345 } });
    const beforeReset = await repository.getForMember(world.id, owner.uid);
    const reset = await repository.reset(world.id, owner.uid);
    assert.equal(reset.revision, 0);
    const afterReset = await repository.getForMember(world.id, owner.uid);
    assert.notEqual(afterReset.businesses[0].save.player.money, beforeReset.businesses[0].save.player.money);
    await rejects('non-owner reset', repository.reset(world.id, successfulMember));

    // --- Verification of commitCommand, receipts idempotency, activities and saveCheckpoint ---
    const initialSnap = await repository.getForMember(world.id, owner.uid);
    const updatedBiz = structuredClone(initialSnap.businesses[0]);
    updatedBiz.save.player.money += 50000;

    // 1. Commit new command
    const commit1 = await repository.commitCommand({
      worldId: world.id,
      actorId: owner.uid,
      expectedRevision: initialSnap.world.revision,
      receipt: {
        commandId: 'cmd-test-101',
        actorId: owner.uid,
        status: 'accepted',
        revision: initialSnap.world.revision + 1,
        payloadJson: JSON.stringify({ type: 'order', productId: 'mi_hao_hao', quantity: 10 }),
        createdAt: new Date().toISOString(),
      },
      updatedBusiness: updatedBiz,
      activity: {
        actorId: owner.uid,
        revision: initialSnap.world.revision + 1,
        type: 'order_placed',
        description: 'Chủ tiệm đặt 10 gói mì',
      },
    });
    assert.equal(commit1.committed, true);
    assert.equal(commit1.revision, initialSnap.world.revision + 1);

    // 2. Retry exact same command with same payload -> must return same receipt idempotently
    const retryCommit = await repository.commitCommand({
      worldId: world.id,
      actorId: owner.uid,
      expectedRevision: initialSnap.world.revision, // even with old expectedRevision
      receipt: {
        commandId: 'cmd-test-101',
        actorId: owner.uid,
        status: 'accepted',
        revision: initialSnap.world.revision + 1,
        payloadJson: JSON.stringify({ type: 'order', productId: 'mi_hao_hao', quantity: 10 }),
        createdAt: new Date().toISOString(),
      },
      updatedBusiness: updatedBiz,
    });
    assert.equal(retryCommit.committed, true);
    assert.equal(retryCommit.revision, commit1.revision);

    // 3. Stale revision rejection on new command
    await rejects('stale revision commit rejected', repository.commitCommand({
      worldId: world.id,
      actorId: owner.uid,
      expectedRevision: initialSnap.world.revision, // outdated revision
      receipt: {
        commandId: 'cmd-test-102',
        actorId: owner.uid,
        status: 'accepted',
        revision: 999,
        payloadJson: JSON.stringify({ type: 'order', productId: 'nuoc_suoi', quantity: 5 }),
        createdAt: new Date().toISOString(),
      },
      updatedBusiness: updatedBiz,
    }));

    // 4. Verify activities listing and touchSession
    const acts = await repository.listActivities(world.id, owner.uid);
    assert.equal(acts.activities.length, 1);
    assert.equal(acts.activities[0].type, 'order_placed');

    const touched = await repository.touchSession(world.id, owner.uid);
    assert.equal(touched.revision, commit1.revision);

    // 5. Verify saveCheckpoint
    const currentSnap = await repository.getForMember(world.id, owner.uid);
    const checkpointBiz = structuredClone(currentSnap.businesses[0]);
    checkpointBiz.save.player.money += 10000;
    const checkpointWorld = structuredClone(currentSnap.world);
    checkpointWorld.worldTime.hour = 12;
    checkpointBiz.save.worldTime = { ...checkpointBiz.save.worldTime, hour: 12 };
    await repository.saveCheckpoint(world.id, checkpointWorld, checkpointBiz);

    const afterCheckpoint = await repository.getForMember(world.id, owner.uid);
    assert.equal(afterCheckpoint.world.worldTime.hour, 12);
    assert.equal(afterCheckpoint.businesses[0].save.player.money, checkpointBiz.save.player.money);
    const resumedRuntime = new WorldRuntime(afterCheckpoint.world, afterCheckpoint.businesses[0]);
    assert.equal(resumedRuntime.getSimulation().getPlayerData().money, checkpointBiz.save.player.money);
    assert.equal(resumedRuntime.getSimulation().getTime().hour, 12);

    // A checkpoint captured before an accepted economic command must not overwrite it.
    const staleWorld = structuredClone(checkpointWorld);
    staleWorld.revision = commit1.revision - 1;
    staleWorld.worldTime.hour = 8;
    const staleBiz = structuredClone(checkpointBiz);
    staleBiz.save.player.money = 1;
    await repository.saveCheckpoint(world.id, staleWorld, staleBiz);
    const afterStaleCheckpoint = await repository.getForMember(world.id, owner.uid);
    assert.equal(afterStaleCheckpoint.world.worldTime.hour, 12);
    assert.equal(afterStaleCheckpoint.businesses[0].save.player.money, checkpointBiz.save.player.money);

    // Concurrent commands sharing one expected revision must have exactly one winner.
    const racingSnapshot = await repository.getForMember(world.id, owner.uid);
    const raceBusinessA = structuredClone(racingSnapshot.businesses[0]);
    const raceBusinessB = structuredClone(racingSnapshot.businesses[0]);
    raceBusinessA.save.player.money += 11;
    raceBusinessB.save.player.money += 22;
    const raceCommand = (commandId: string, business: typeof raceBusinessA) => repository.commitCommand({
      worldId: world.id,
      actorId: owner.uid,
      expectedRevision: racingSnapshot.world.revision,
      receipt: {
        commandId,
        actorId: owner.uid,
        status: 'accepted',
        revision: racingSnapshot.world.revision + 1,
        payloadJson: JSON.stringify({ type: 'test-race', commandId }),
        createdAt: new Date().toISOString(),
      },
      updatedBusiness: business,
    });
    const raceResults = await Promise.allSettled([raceCommand('cmd-race-a', raceBusinessA), raceCommand('cmd-race-b', raceBusinessB)]);
    assert.equal(raceResults.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(raceResults.filter(result => result.status === 'rejected').length, 1);

    console.log('PASS world create/list/ACL, concurrent one-use invite/capacity, permissions, leave/kick/revoke/reset, commitCommand idempotency, activities, touchSession and saveCheckpoint');
  } finally {
    if (worldId) await client.db(testDbName).collection<{ _id: string }>('game_worlds').deleteOne({ _id: worldId });
    await client.db(testDbName).dropDatabase();
    await closeDatabase();
    await client.close();
    if (previousUri === undefined) delete process.env.MONGO_URI; else process.env.MONGO_URI = previousUri;
    if (previousLegacyUri === undefined) delete process.env.MONGODB_URI; else process.env.MONGODB_URI = previousLegacyUri;
    if (previousDbName === undefined) delete process.env.MONGODB_DATABASE; else process.env.MONGODB_DATABASE = previousDbName;
  }
}

async function rejects(label: string, operation: Promise<unknown>) {
  try { await assert.rejects(operation); }
  catch (error) { throw new Error(`${label}: ${error instanceof Error ? error.message : 'unexpected resolve'}`); }
}

void run().catch((error: unknown) => {
  console.error(`World repository test failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exitCode = 1;
});
