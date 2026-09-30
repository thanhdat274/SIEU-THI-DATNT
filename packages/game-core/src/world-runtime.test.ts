import assert from 'node:assert/strict';
import { createInitialOnlineWorld } from '@game/data';
import { MULTIPLAYER_PROTOCOL_VERSION } from '@game/shared';
import { WorldRuntime } from './world-runtime';

export async function runWorldRuntimeTests() {
  const owner = { id: 'owner-1', displayName: 'Owner One', photoUrl: null };
  const seeded = createInitialOnlineWorld(owner, 'world-runtime-test');
  seeded.world.memberships.push({
    accountId: 'member-2',
    role: 'member',
    joinedAt: new Date().toISOString(),
    lastSeenRevision: 0,
  });
  seeded.world.avatars.push({
    accountId: 'member-2',
    position: { x: 400, y: 400 },
    direction: 'down',
    updatedAt: new Date().toISOString(),
  });
  let checkpointCount = 0;

  const runtime = new WorldRuntime(seeded.world, seeded.business, {
    heartbeatTimeoutMs: 1000,
    checkpointIntervalSeconds: 0.1,
    onCheckpoint: () => {
      checkpointCount++;
    },
  });

  // 1. Initial state is paused because no session is registered
  assert.equal(runtime.getIsPaused(), true, 'World starts paused with 0 sessions');
  assert.equal(runtime.getActiveSessionsCount(), 0);

  // Advance time while paused should NOT progress simulation clock or trigger checkpoints
  const initialTime = runtime.getSimulation().getTime().minute;
  runtime.tick(1.0);
  assert.equal(runtime.getSimulation().getTime().minute, initialTime);
  assert.equal(runtime.getIsPaused(), true);

  // 2. Register owner session resumes world
  const registered = runtime.registerSession('owner-1');
  assert.equal(registered, true);
  assert.equal(runtime.getIsPaused(), false);
  assert.equal(runtime.getActiveSessionsCount(), 1);

  // Authenticated session identity is authoritative; client cannot move as another account.
  const ownerAvatarBefore = runtime.getSnapshot().world.avatars.find(item => item.accountId === 'owner-1')!;
  const memberAvatarBefore = runtime.getSnapshot().world.avatars.find(item => item.accountId === 'member-2')!;
  const moved = runtime.applyInputIntent('owner-1', { accountId: 'member-2', sequence: 1, direction: { x: 1, y: 0 } }, Date.now());
  assert.ok(moved);
  assert.equal(moved.world.avatars.find(item => item.accountId === 'member-2')?.position.x, memberAvatarBefore.position.x);
  assert.equal(moved.world.avatars.find(item => item.accountId === 'member-2')?.position.y, memberAvatarBefore.position.y);
  assert.notEqual(moved.world.avatars.find(item => item.accountId === 'owner-1')?.position.x, ownerAvatarBefore.position.x);
  assert.equal(runtime.applyInputIntent('stranger-999', { sequence: 1, direction: { x: 1, y: 0 } }), null);
  assert.equal(runtime.applyInputIntent('owner-1', { sequence: 1, direction: { x: 1, y: 0 } }, Date.now() + 500), null,
    'Stale/duplicate avatar sequence is rejected');

  // Advance time while active progresses simulation clock (4 * 0.25s = 1.0s real time = 1 game minute)
  for (let i = 0; i < 4; i++) {
    runtime.tick(0.25);
  }
  assert.equal(runtime.getSimulation().getTime().minute, initialTime + 1, 'Clock progresses when session active');

  // Checkpoint is triggered
  assert.ok(checkpointCount > 0, 'Checkpoint triggered on interval');

  // 3. Stale heartbeat pauses world
  const timedOut = runtime.tick(0.1, Date.now() + 2000); // simulate 2s later
  assert.deepEqual(timedOut, ['owner-1'], 'Runtime reports which account heartbeat timed out');
  assert.equal(runtime.getActiveSessionsCount(), 0);
  assert.equal(runtime.getIsPaused(), true, 'Stale session pauses world');

  // 4. Register outsider is rejected
  const stranger = runtime.registerSession('stranger-999');
  assert.equal(stranger, false, 'Non-member session rejected');

  // 5. Test Time Voting (Task 3.6)
  // Re-register owner
  runtime.registerSession('owner-1');
  const dayBefore = runtime.getSimulation().getTime().day;
  // Single player: advances day immediately
  const singleVote = runtime.submitTimeVote('owner-1', { type: 'advance_day' });
  assert.equal(singleVote.executed, true);
  assert.equal(singleVote.status, 'executed');
  assert.equal(runtime.getSimulation().getTime().day, dayBefore + 1, 'Single player advances day immediately');

  // Register second player session (member-2 is already in memberships)
  runtime.registerSession('member-2');
  assert.equal(runtime.getActiveSessionsCount(), 2);

  // Two players: first vote is pending
  const vote1 = runtime.submitTimeVote('owner-1', { type: 'advance_day' });
  assert.equal(vote1.executed, false);
  assert.equal(vote1.status, 'pending');
  assert.equal(vote1.remainingSeconds, 30);
  assert.ok(runtime.getActiveTimeVote() !== null);
  assert.equal(runtime.getActiveTimeVote()?.approvalsCount, 1);
  assert.equal(runtime.getActiveTimeVote()?.totalRequired, 2);

  // Member 2 approves: passes and executes
  const currentDay = runtime.getSimulation().getTime().day;
  const vote2 = runtime.submitTimeVote('member-2', { type: 'advance_day' });
  assert.equal(vote2.executed, true);
  assert.equal(vote2.status, 'executed');
  assert.equal(runtime.getSimulation().getTime().day, currentDay + 1, 'Both players approved: day advanced');
  assert.equal(runtime.getActiveTimeVote(), null, 'Vote cleared after execution');

  // Test timeout (30 seconds)
  const now = Date.now();
  runtime.registerSession('owner-1', now);
  runtime.registerSession('member-2', now);
  runtime.submitTimeVote('owner-1', { type: 'advance_day' }, now);
  assert.ok(runtime.getActiveTimeVote(now) !== null);
  // Advance 31 seconds
  runtime.tick(1.0, now + 31000);
  assert.equal(runtime.getActiveTimeVote(now + 31000), null, 'Vote expires after 30 seconds');

  // Test participant disconnection cancels active vote
  const now2 = now + 40000;
  runtime.registerSession('owner-1', now2);
  runtime.registerSession('member-2', now2);
  runtime.submitTimeVote('owner-1', { type: 'advance_day' }, now2);
  assert.ok(runtime.getActiveTimeVote(now2) !== null);
  runtime.unregisterSession('member-2');
  assert.equal(runtime.getActiveTimeVote(now2), null, 'Vote cancelled when participant leaves');

  // Co-op quests: a claim is validated server-side, applies once, and is shared by both members.
  const questSeed = createInitialOnlineWorld(owner, 'world-quest-test');
  questSeed.world.memberships.push({ accountId: 'member-2', role: 'member', joinedAt: new Date().toISOString(), lastSeenRevision: 0 });
  questSeed.business.save.statistics.totalCustomersServed = 10;
  const questRuntime = new WorldRuntime(questSeed.world, questSeed.business, { heartbeatTimeoutMs: 1000, checkpointIntervalSeconds: 100 });
  const questMoney = questRuntime.getSimulation().getPlayerData().money;
  const claimCommand = (commandId: string, questId: string) => ({
    protocolVersion: MULTIPLAYER_PROTOCOL_VERSION,
    worldId: questSeed.world.id,
    businessId: questSeed.business.id,
    commandId,
    expectedRevision: questRuntime.getSnapshot().world.revision,
    payload: { type: 'claim_quest', questId },
  });
  const firstClaim = await questRuntime.executeCommand('owner-1', claimCommand('claim-1', 'story_first_customers'));
  assert.equal(firstClaim.status, 'accepted');
  assert.ok(questRuntime.getSimulation().getPlayerData().money > questMoney, 'Thưởng co-op cộng vào quỹ chung');
  const secondClaim = await questRuntime.executeCommand('member-2', claimCommand('claim-2', 'story_first_customers'));
  assert.equal(secondClaim.status, 'rejected', 'Người thứ hai không nhận trùng cùng nhiệm vụ');

  console.log('✓ WorldRuntime manages sessions, heartbeats, pausing, checkpoints, and 30s time votes correctly.');
}
