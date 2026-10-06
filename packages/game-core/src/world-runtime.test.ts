import assert from 'node:assert/strict';
import { ALL_PRODUCTS, MAINTENANCE_RULES, SECURITY_RULES, SNACK_PLOT_ID, SUPPLIER_MAP, createInitialOnlineWorld } from '@game/data';
import { MULTIPLAYER_PROTOCOL_VERSION, isGameCommand } from '@game/shared';
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

  // Vào lại hẻm: client đếm sequence từ 0 nhưng runtime vẫn nhớ mốc cũ; phiên mới phải di chuyển được.
  const reNow = Date.now() + 1000;
  runtime.registerSession('owner-1', reNow);
  runtime.applyInputIntent('owner-1', { sequence: 50, direction: { x: 1, y: 0 } }, reNow + 20);
  runtime.registerSession('owner-1', reNow + 100);
  const beforeRejoin = runtime.getSnapshot().world.avatars.find(item => item.accountId === 'owner-1')!.position.x;
  const afterRejoin = runtime.applyInputIntent('owner-1', { sequence: 1, direction: { x: 1, y: 0 } }, reNow + 120);
  assert.ok(afterRejoin, 'input sequence 1 sau khi vào lại phải được nhận');
  assert.notEqual(afterRejoin.world.avatars.find(item => item.accountId === 'owner-1')?.position.x, beforeRejoin, 'vào lại hẻm vẫn di chuyển được');

  // Commit qua HTTP: runtime phải nhận save + revision mới để snapshot gửi cho người kia không bị cũ.
  const committed = structuredClone(runtime.getSnapshot().businesses[0]);
  committed.save.player.money += 12345;
  const nextRevision = runtime.getSnapshot().world.revision + 3;
  assert.equal(runtime.adoptCommitted(nextRevision, committed), true);
  assert.equal(runtime.getSnapshot().world.revision, nextRevision, 'revision runtime theo kịp commit HTTP');
  assert.equal(runtime.getSnapshot().businesses[0].save.player.money, committed.save.player.money, 'tiền mới có trong snapshot');
  assert.equal(runtime.adoptCommitted(nextRevision, committed), false, 'revision không mới hơn thì bỏ qua');

  // Client báo vị trí thật: nhận trong vùng đi được, bỏ qua giá trị sai hoặc nhảy xa vô lý.
  const posNow = Date.now() + 5000;
  runtime.registerSession('member-2', posNow);
  const startPos = runtime.getAvatars().find(item => item.accountId === 'owner-1')!.position;
  assert.ok(runtime.reportPosition('owner-1', { x: startPos.x + 10, y: startPos.y }, 'right', posNow), 'vị trí hợp lệ được nhận');
  assert.equal(runtime.reportPosition('owner-1', { x: startPos.x + 5000, y: startPos.y }, 'right', posNow + 100), null, 'nhảy quá xa bị bỏ qua');
  assert.equal(runtime.reportPosition('owner-1', { x: Number.NaN, y: 0 }, 'up', posNow + 200), null, 'NaN bị bỏ qua');
  assert.equal(runtime.reportPosition('stranger-999', { x: 400, y: 400 }, 'up', posNow), null, 'người ngoài phiên bị bỏ qua');
  assert.equal(runtime.getAvatars().find(item => item.accountId === 'owner-1')!.direction, 'right');
  runtime.unregisterSession('member-2');

  // Lịch ngày do server giữ: cả hai về nhà lúc 23:30 thì server tự sang ngày mới.
  {
    const rt = new WorldRuntime(structuredClone(seeded.world), structuredClone(seeded.business), { heartbeatTimeoutMs: 600000, checkpointIntervalSeconds: 9999 });
    rt.registerSession('owner-1');
    rt.registerSession('member-2');
    const sim = rt.getSimulation();
    const time = sim.getTime();
    sim.getClock().setTime({ ...time, hour: 23, minute: 20, isStoreOpen: false });
    const dayBefore = sim.getTime().day;
    const homes = [{ x: 3.5 * 32, y: 12.5 * 32 }, { x: 3.5 * 32, y: 12.5 * 32 }];
    const t0 = Date.now();
    for (let i = 0; i < 400 && sim.getTime().day === dayBefore; i++) {
      rt.reportPosition('owner-1', homes[0], 'down', t0 + i * 1000);
      rt.reportPosition('member-2', homes[1], 'down', t0 + i * 1000);
      rt.tick(0.25, t0 + i * 250);
    }
    assert.ok(sim.getTime().day > dayBefore, 'cả hai về nhà thì server tự chuyển ngày');
  }

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
  questSeed.business.save.inventory.push({ productId: 'rau_cai_xanh', quantity: 6, lots: [{ quantity: 6, expiresOnDay: 99, unitCost: 6000, provenance: 'known' }] });
  questSeed.business.save.inventory = questSeed.business.save.inventory.filter(item => item.productId !== 'mi_hao_hao');
  questSeed.business.save.inventory.push({ productId: 'mi_hao_hao', quantity: 80, lots: [{ quantity: 80, expiresOnDay: 99, unitCost: 2488, provenance: 'known', caseCount: 2 }] });
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

  // Co-op stalls: buying is validated by the authoritative runtime and charged once.
  questRuntime.getSimulation().addExperience(10_000);
  questRuntime.getSimulation().addMoney(1_000_000);
  const stallMoney = questRuntime.getSimulation().getPlayerData().money;
  const buyStall = (commandId: string) => ({ ...claimCommand(commandId, 'x'), payload: { type: 'buy_stall', stallId: 'cafe_vot' } });
  assert.equal((await questRuntime.executeCommand('member-2', buyStall('stall-1'))).status, 'accepted');
  assert.equal(questRuntime.getSimulation().getPlayerData().money, stallMoney - 300000);
  assert.equal((await questRuntime.executeCommand('owner-1', buyStall('stall-2'))).status, 'rejected', 'Không mở trùng quầy trong hẻm chung');

  // Co-op disposal: replaying the same command id or a rejected retry never books the loss twice.
  const dispose = (commandId: string, quantity: number) => ({ ...claimCommand(commandId, 'x'), payload: { type: 'dispose_stock', productId: 'rau_cai_xanh', quantity } });
  const spoilageEntries = () => questRuntime.getSimulation().getLedger().filter(entry => entry.type === 'spoilage').length;
  assert.equal((await questRuntime.executeCommand('member-2', dispose('dispose-1', 4))).status, 'accepted');
  assert.equal(spoilageEntries(), 1);
  await questRuntime.executeCommand('member-2', dispose('dispose-1', 4));
  assert.equal(spoilageEntries(), 1, 'Gửi lại cùng ID lệnh không ghi sổ hỏng lần nữa');
  assert.equal(questRuntime.getSimulation().getInventory().find(item => item.productId === 'rau_cai_xanh')?.quantity, 2);
  assert.equal((await questRuntime.executeCommand('owner-1', dispose('dispose-2', 50))).status, 'accepted', 'Hủy phần còn lại');
  assert.equal((await questRuntime.executeCommand('owner-1', dispose('dispose-3', 1))).status, 'rejected', 'Hết hàng thì từ chối, không ghi sổ');
  assert.equal(spoilageEntries(), 2);

  // Co-op mở thùng: lệnh open_case được server phát lại, đổi thùng thành hàng lẻ một lần, tổng hàng không đổi.
  const openCase = (commandId: string, count: number) => ({ ...claimCommand(commandId, 'x'), payload: { type: 'open_case', productId: 'mi_hao_hao', count } });
  const miStock = () => {
    const item = questRuntime.getSimulation().getInventory().find(entry => entry.productId === 'mi_hao_hao');
    return { quantity: item?.quantity, cases: (item?.lots ?? []).reduce((n, lot) => n + (lot.caseCount ?? 0), 0) };
  };
  assert.equal(isGameCommand(openCase('case-bad', 0) as never), false, 'Số thùng 0 không phải lệnh hợp lệ');
  assert.equal(isGameCommand(openCase('case-bad', 1.5) as never), false, 'Số thùng lẻ không phải lệnh hợp lệ');
  assert.equal((await questRuntime.executeCommand('member-2', openCase('case-1', 1))).status, 'accepted');
  assert.deepEqual(miStock(), { quantity: 80, cases: 1 }, 'Mở 1 thùng: còn 1 thùng, tổng vẫn 80 gói');
  await questRuntime.executeCommand('member-2', openCase('case-1', 1));
  assert.deepEqual(miStock(), { quantity: 80, cases: 1 }, 'Gửi lại cùng ID lệnh không mở thêm thùng');
  assert.equal((await questRuntime.executeCommand('owner-1', openCase('case-2', 5))).status, 'accepted', 'Mở nhiều hơn số thùng còn: mở phần còn lại');
  assert.deepEqual(miStock(), { quantity: 80, cases: 0 });
  assert.equal((await questRuntime.executeCommand('owner-1', openCase('case-3', 1))).status, 'rejected', 'Hết thùng thì từ chối');

  // Chuỗi chi nhánh (branch-chain): cả hai thành viên cùng quyền, ví/kho chung, replay trên mô phỏng của server.
  {
    const sim = questRuntime.getSimulation();
    while (sim.getPlayerData().level < 46) sim.addExperience(50_000);
    sim.addMoney(5_000_000);
    const send = (actor: string, commandId: string, payload: unknown) => questRuntime.executeCommand(actor, {
      protocolVersion: MULTIPLAYER_PROTOCOL_VERSION,
      worldId: questSeed.world.id,
      businessId: questSeed.business.id,
      commandId,
      expectedRevision: questRuntime.getSnapshot().world.revision,
      payload,
    });
    const money0 = sim.getPlayerData().money;
    assert.equal((await send('member-2', 'branch-open-1', { type: 'open_branch', storeType: 'drink_shop', name: 'Quán chung', branchId: 'branch-1' })).status, 'accepted', 'Thành viên thứ hai mở được');
    assert.equal(sim.getPlayerData().money, money0 - 1_500_000);
    assert.equal(sim.getChain().branches.length, 1);
    await send('member-2', 'branch-open-1', { type: 'open_branch', storeType: 'drink_shop', name: 'Quán chung', branchId: 'branch-1' });
    assert.equal(sim.getPlayerData().money, money0 - 1_500_000, 'Gửi lại cùng mã lệnh không trừ tiền lần nữa');
    assert.equal((await send('owner-1', 'branch-open-bad', { type: 'open_branch', storeType: 'constructor' })).status, 'rejected', 'Loại hình lạ bị từ chối');
    assert.equal((await send('owner-1', 'branch-open-bad2', { type: 'open_branch', storeType: 'drink_shop', branchId: 'hub' })).status, 'invalid', 'Mã chi nhánh sai định dạng bị lớp validate chặn');
    assert.equal((await send('owner-1', 'branch-switch-bad', { type: 'switch_branch', branchId: 'nope' })).status, 'rejected');
    assert.equal((await send('owner-1', 'branch-switch-1', { type: 'switch_branch', branchId: 'branch-1' })).status, 'accepted');
    assert.equal(sim.getChain().activeBranchId, 'branch-1');
    // Chuyển kho cần hàng thật trong kho tổng
    assert.equal((await send('member-2', 'branch-xfer-bad', { type: 'transfer_stock', branchId: 'branch-1', items: [{ productId: 'nuoc_suoi', quantity: 99999 }] })).status, 'rejected');
    const have = sim.getInventory().find((item) => item.productId === 'nuoc_suoi')?.quantity ?? 0;
    if (have >= 2) {
      assert.equal((await send('member-2', 'branch-xfer-1', { type: 'transfer_stock', branchId: 'branch-1', items: [{ productId: 'nuoc_suoi', quantity: 2 }] })).status, 'accepted');
      assert.equal(sim.getInventory().find((item) => item.productId === 'nuoc_suoi')?.quantity, have - 2);
      assert.equal((await send('owner-1', 'branch-back-1', { type: 'return_stock', branchId: 'branch-1', items: [{ productId: 'nuoc_suoi', quantity: 2 }] })).status, 'accepted');
      assert.equal(sim.getInventory().find((item) => item.productId === 'nuoc_suoi')?.quantity, have);
    }
    // Bảng điều hành: member đổi mức giá/quản lý, không tốn tiền; chi nhánh lạ bị từ chối; payload sai bị validate chặn
    const moneyBeforePolicy = sim.getPlayerData().money;
    assert.equal((await send('member-2', 'branch-policy-1', { type: 'set_branch_policy', branchId: 'branch-1', policy: { priceMode: 'high', manager: true } })).status, 'accepted');
    assert.deepEqual(sim.getChain().branches[0].policy, { priceMode: 'high', manager: true });
    assert.equal(sim.getPlayerData().money, moneyBeforePolicy);
    assert.equal((await send('owner-1', 'branch-policy-bad', { type: 'set_branch_policy', branchId: 'nope', policy: { priceMode: 'low', manager: false } })).status, 'rejected');
    for (const bad of [{ type: 'set_branch_policy', branchId: 'branch-1', policy: { priceMode: 'cheap', manager: false } }, { type: 'set_branch_policy', branchId: 'branch-1', policy: { priceMode: 'low', manager: 1 } }, { type: 'set_branch_policy', branchId: 'branch-1' }]) assert.equal(isGameCommand({ ...claimCommand('x', 'x'), payload: bad } as never), false, JSON.stringify(bad));
    // Payload sai hình dạng bị lớp validate chặn trước khi tới mô phỏng
    for (const bad of [
      { type: 'transfer_stock', branchId: 'branch-1', items: [] },
      { type: 'transfer_stock', branchId: 'branch-1', items: [{ productId: 'nuoc_suoi', quantity: -1 }] },
      { type: 'return_stock', branchId: 'branch-1', items: [{ productId: 'nuoc_suoi', quantity: 1.5 }] },
      { type: 'open_branch', storeType: 5 },
    ]) assert.equal(isGameCommand({ ...claimCommand('x', 'x'), payload: bad } as never), false, JSON.stringify(bad));
  }

  // New progression commands must run through the shared authoritative simulation.
  const titleCommand = (commandId: string, titleId?: string) => ({
    protocolVersion: MULTIPLAYER_PROTOCOL_VERSION,
    worldId: questSeed.world.id,
    businessId: questSeed.business.id,
    commandId,
    expectedRevision: questRuntime.getSnapshot().world.revision,
    payload: { type: 'set_title', titleId },
  });
  assert.equal((await questRuntime.executeCommand('member-2', titleCommand('title-1', undefined))).status, 'accepted');
  assert.equal(questRuntime.getSimulation().getPlayerData().activeTitle, undefined);
  const badTitle = await questRuntime.executeCommand('owner-1', titleCommand('title-2', 'unknown_title'));
  assert.equal(badTitle.status, 'rejected', 'Server rejects titles that are not unlocked or defined');

  // Bảo trì nội thất và an ninh chạy qua mô phỏng chuẩn của server; gửi lại cùng mã lệnh không tính hai lần.
  {
    const sim = questRuntime.getSimulation();
    sim.addMoney(2_000_000);
    const send = (actor: string, commandId: string, payload: unknown) => questRuntime.executeCommand(actor, {
      protocolVersion: MULTIPLAYER_PROTOCOL_VERSION,
      worldId: questSeed.world.id,
      businessId: questSeed.business.id,
      commandId,
      expectedRevision: questRuntime.getSnapshot().world.revision,
      payload,
    });
    const shelf = sim.getFixtures().find(f => f.type === 'shelf_wooden')!;
    shelf.wear = 60;
    const maintenanceEntries = () => sim.getLedger().filter(entry => entry.type === 'maintenance').length;
    const m0 = sim.getPlayerData().money;
    assert.equal((await send('member-2', 'maint-1', { type: 'maintain_fixture', fixtureId: shelf.id, action: 'service' })).status, 'accepted');
    assert.equal(sim.getFixtures().find(f => f.id === shelf.id)!.wear, MAINTENANCE_RULES.repairWear, 'Bảo trì đưa độ mòn về mức đã cấu hình');
    assert.ok(sim.getPlayerData().money < m0 && maintenanceEntries() === 1, 'Bảo trì trừ tiền và ghi sổ một lần');
    await send('member-2', 'maint-1', { type: 'maintain_fixture', fixtureId: shelf.id, action: 'service' });
    assert.equal(maintenanceEntries(), 1, 'Gửi lại cùng mã lệnh không ghi sổ lần hai');
    assert.equal((await send('owner-1', 'maint-2', { type: 'maintain_fixture', fixtureId: 'khong_co', action: 'repair' })).status, 'rejected', 'Nội thất không tồn tại bị từ chối');

    const money = sim.getPlayerData().money;
    assert.equal((await send('owner-1', 'sec-1', { type: 'security_action', action: 'buy_camera' })).status, 'accepted');
    assert.equal(sim.getSecurityState().camera, true);
    assert.equal(sim.getPlayerData().money, money - SECURITY_RULES.cameraCost, 'Lắp camera trừ đúng một lần');
    assert.equal((await send('member-2', 'sec-2', { type: 'security_action', action: 'buy_camera' })).status, 'rejected', 'Đã có camera thì từ chối, không trừ tiền thêm');
    assert.equal(sim.getPlayerData().money, money - SECURITY_RULES.cameraCost);
    assert.equal((await send('member-2', 'sec-3', { type: 'security_action', action: 'police_off' })).status, 'accepted');
    assert.equal(sim.getSecurityState().callPolice, false);
    assert.equal((await send('owner-1', 'sec-4', { type: 'security_action', action: 'police_on' })).status, 'accepted');
    assert.equal(sim.getSecurityState().callPolice, true);
  }

  // A member who joins over HTTP after the runtime was loaded must be adoptable.
  const lateSeed = createInitialOnlineWorld(owner, 'world-runtime-late-member');
  const lateRuntime = new WorldRuntime(lateSeed.world, lateSeed.business);
  assert.equal(lateRuntime.registerSession('late-member'), false, 'unknown account is refused before sync');
  const lateWorld = structuredClone(lateSeed.world);
  lateWorld.memberships.push({ accountId: 'late-member', role: 'member', joinedAt: new Date().toISOString(), lastSeenRevision: 0 });
  lateWorld.avatars.push({ accountId: 'late-member', position: { x: 400, y: 400 }, direction: 'down', updatedAt: new Date().toISOString() });
  lateRuntime.syncMembers(lateWorld);
  assert.equal(lateRuntime.registerSession('late-member'), true, 'member is accepted after sync');
  assert.equal(lateRuntime.getSnapshot().world.avatars.length, 2, 'checkpointed world keeps both avatars');
  assert.ok(lateRuntime.getAvatarController().getAvatar('late-member'), 'avatar controller tracks the late member');
  lateRuntime.syncMembers(lateWorld);
  assert.equal(lateRuntime.getSnapshot().world.avatars.length, 2, 'syncMembers is idempotent');

  // Co-op: cài đặt gợi ý nhập hàng là lệnh server-replay, ghi vào save chung và kiểm đầu vào.
  {
    const seed = createInitialOnlineWorld(owner, 'world-restock-options');
    const rt = new WorldRuntime(seed.world, seed.business, { heartbeatTimeoutMs: 1000, checkpointIntervalSeconds: 100 });
    const cmd = (commandId: string, options: unknown) => ({
      protocolVersion: MULTIPLAYER_PROTOCOL_VERSION, worldId: seed.world.id, businessId: seed.business.id, commandId,
      expectedRevision: rt.getSnapshot().world.revision, payload: { type: 'set_restock_options', options },
    });
    assert.equal(rt.getSimulation().getRestockOptions(), undefined, 'Hẻm mới chưa có cài đặt gợi ý');
    const ok = await rt.executeCommand('owner-1', cmd('opt-1', { provenSharePct: 55, maxTrialProducts: 4, cashReservePct: 20, protectObligations: false }));
    assert.equal(ok.status, 'accepted');
    assert.deepEqual(rt.getSimulation().getRestockOptions(), { provenSharePct: 55, maxTrialProducts: 4, cashReservePct: 20, protectObligations: false });
    assert.equal(rt.getSimulation().exportSaveData().restockOptions?.provenSharePct, 55, 'Cài đặt nằm trong save chung');
    for (const [id, bad] of [['opt-bad-1', 'x'], ['opt-bad-2', { cashReservePct: 'abc' }], ['opt-bad-3', { protectObligations: 'yes' }], ['opt-bad-4', null]] as const) {
      const res = await rt.executeCommand('owner-1', cmd(id, bad));
      assert.equal(res.status, 'invalid', `Cài đặt sai (${id}) bị từ chối`);
    }
    assert.equal(rt.getSimulation().getRestockOptions()?.provenSharePct, 55, 'Lệnh sai không làm đổi cài đặt');
    const clamped = await rt.executeCommand('owner-1', cmd('opt-clamp', { provenSharePct: 900, cashReservePct: -5 }));
    assert.equal(clamped.status, 'accepted');
    assert.equal(rt.getSimulation().getRestockOptions()?.provenSharePct, 100, 'Giá trị ngoài khoảng bị kẹp');
    assert.equal(rt.getSimulation().getRestockOptions()?.cashReservePct, 0);
  }

  // Co-op: bật/tắt tự nhập nguyên liệu quầy là lệnh server-replay, ghi vào save chung và kiểm đầu vào.
  {
    const seed = createInitialOnlineWorld(owner, 'world-auto-buy-stalls');
    const rt = new WorldRuntime(seed.world, seed.business, { heartbeatTimeoutMs: 1000, checkpointIntervalSeconds: 100 });
    const cmd = (commandId: string, enabled: unknown) => ({
      protocolVersion: MULTIPLAYER_PROTOCOL_VERSION, worldId: seed.world.id, businessId: seed.business.id, commandId,
      expectedRevision: rt.getSnapshot().world.revision, payload: { type: 'set_auto_buy_stalls', enabled },
    });
    assert.equal(rt.getSimulation().getAutoBuyConfig().stalls, false, 'Mặc định tắt');
    const ok = await rt.executeCommand('owner-1', cmd('abs-1', true));
    assert.equal(ok.status, 'accepted');
    assert.equal(rt.getSimulation().exportSaveData().autoBuyStalls, true, 'Cờ nằm trong save chung');
    const bad = await rt.executeCommand('owner-1', cmd('abs-bad', 'yes'));
    assert.equal(bad.status, 'invalid', 'Giá trị không phải boolean bị từ chối');
  }

  // Co-op: cấu hình tự nhập theo quy tắc là lệnh server-replay, kiểm hình dạng ở guard và nội dung ở mô phỏng.
  {
    const seed = createInitialOnlineWorld(owner, 'world-auto-buy-config');
    const rt = new WorldRuntime(seed.world, seed.business, { heartbeatTimeoutMs: 1000, checkpointIntervalSeconds: 100 });
    const productId = ALL_PRODUCTS[0].id;
    const supplierId = Object.keys(SUPPLIER_MAP)[0];
    const rule = { id: 'r1', productId, threshold: 5, quantity: 10, supplierId, priority: 0, maxBudget: 500_000 };
    const cmd = (commandId: string, payload: unknown) => ({
      protocolVersion: MULTIPLAYER_PROTOCOL_VERSION, worldId: seed.world.id, businessId: seed.business.id, commandId,
      expectedRevision: rt.getSnapshot().world.revision, payload,
    });
    const ok = await rt.executeCommand('owner-1', cmd('abc-1', { type: 'set_auto_buy_config', enabled: true, rules: [rule] }));
    assert.equal(ok.status, 'accepted');
    assert.equal(rt.getSimulation().getAutoBuyConfig().enabled, true);
    assert.deepEqual(rt.getSimulation().exportSaveData().autoBuyRules, [rule], 'Quy tắc nằm trong save chung');
    const badShape = await rt.executeCommand('owner-1', cmd('abc-bad1', { type: 'set_auto_buy_config', enabled: true, rules: [{ id: 'x' }] }));
    assert.equal(badShape.status, 'invalid', 'Quy tắc sai hình dạng bị từ chối');
    const badProduct = await rt.executeCommand('owner-1', cmd('abc-bad2', { type: 'set_auto_buy_config', enabled: false, rules: [{ ...rule, productId: 'khong_co' }] }));
    assert.equal(badProduct.status, 'rejected', 'Sản phẩm không tồn tại bị mô phỏng từ chối');
    assert.equal(rt.getSimulation().getAutoBuyConfig().enabled, true, 'Lệnh sai không đổi cấu hình');
    const off = await rt.executeCommand('owner-1', cmd('abc-off', { type: 'set_auto_buy_config', enabled: false, rules: [] }));
    assert.equal(off.status, 'accepted');
    assert.equal(rt.getSimulation().getAutoBuyConfig().rules.length, 0);
  }

  // Co-op: tòa Quán ăn vặt, quầy Vé số và trả nợ lương chạy qua đường lệnh server-replay như chơi riêng.
  {
    const seed = createInitialOnlineWorld(owner, 'world-snack-stall-wage');
    seed.business.save.player.level = 60;
    seed.business.save.player.money = 10_000_000;
    seed.business.save.wageDebt = 300_000;
    seed.business.save.worldTime.isStoreOpen = false;
    const rt = new WorldRuntime(seed.world, seed.business, { heartbeatTimeoutMs: 1000, checkpointIntervalSeconds: 100 });
    const cmd = (commandId: string, payload: unknown) => ({
      protocolVersion: MULTIPLAYER_PROTOCOL_VERSION, worldId: seed.world.id, businessId: seed.business.id, commandId,
      expectedRevision: rt.getSnapshot().world.revision, payload,
    });
    const sim = rt.getSimulation();
    const snackFixtures = () => sim.getFixtures().filter(f => f.id.startsWith('snack_')).length;
    assert.equal(snackFixtures(), 0, 'Chưa mua tòa thì chưa có vật dụng quán ăn vặt');
    const bought = await rt.executeCommand('owner-1', cmd('snack-1', { type: 'layout_batch', actions: [{ type: 'buy_plot', plotId: SNACK_PLOT_ID }] }));
    assert.equal(bought.status, 'accepted', 'Mua tòa Quán ăn vặt qua layout_batch');
    assert.ok(snackFixtures() > 0, 'Tòa mới có vật dụng mặc định');
    assert.ok(rt.getSnapshot().businesses[0].save.storeLayout.unlockedPlotIds?.includes(SNACK_PLOT_ID), 'Save chung ghi nhận ô đất đã mua');
    const moneyAfterSnack = sim.getPlayerData().money;
    await rt.executeCommand('owner-1', cmd('snack-2', { type: 'layout_batch', actions: [{ type: 'buy_plot', plotId: SNACK_PLOT_ID }] }));
    assert.equal(sim.getPlayerData().money, moneyAfterSnack, 'Mua lại ô đã có không trừ tiền lần nữa');

    assert.equal(sim.getStalls().find(s => s.id === 've_so')?.owned, false);
    const stall = await rt.executeCommand('owner-1', cmd('stall-1', { type: 'buy_stall', stallId: 've_so' }));
    assert.equal(stall.status, 'accepted', 'Mở quầy Vé số');
    assert.equal(sim.getStalls().find(s => s.id === 've_so')?.owned, true);
    assert.equal((await rt.executeCommand('owner-1', cmd('stall-2', { type: 'buy_stall', stallId: 've_so' }))).status, 'rejected', 'Mua quầy lần hai bị từ chối');

    const moneyBefore = sim.getPlayerData().money;
    const wage = await rt.executeCommand('owner-1', cmd('wage-1', { type: 'pay_wage_debt' }));
    assert.equal(wage.status, 'accepted', 'Trả nợ lương');
    assert.equal(sim.getWageDebt(), 0);
    assert.equal(sim.getPlayerData().money, moneyBefore - 300_000);
    assert.equal((await rt.executeCommand('owner-1', cmd('wage-2', { type: 'pay_wage_debt' }))).status, 'rejected', 'Hết nợ thì lệnh bị từ chối');
  }

  console.log('✓ WorldRuntime manages sessions, heartbeats, pausing, checkpoints, and 30s time votes correctly.');
}
