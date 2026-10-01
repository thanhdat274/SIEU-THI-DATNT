import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { ALL_PRODUCTS, PARTY_ORDER_MAP, getSeasonWindow } from '@game/data';
import { GameSimulation } from '@game/core';
import { readRuntimeConfig } from './runtime-config.js';

/**
 * Hai tài khoản chạy bảy lệnh server-replay (đơn tiệc x2, mục tiêu, nhiệm vụ tuần, ngày hội, perk, danh hiệu)
 * qua đúng `GameController.commitCommand` + Mongo thật trong DB ngẫu nhiên riêng.
 * Chưa đi qua lớp HTTP/Firebase guard: guard cần token Firebase thật.
 */
async function run() {
  const config = readRuntimeConfig();
  if (!config.mongoUri) throw new Error('MONGO_URI is not configured');
  const testDbName = `${config.databaseName}_coop_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  const previousDbName = process.env.MONGODB_DATABASE;
  process.env.MONGODB_DATABASE = testDbName;
  const client = new MongoClient(config.mongoUri, { serverSelectionTimeoutMS: 8000, maxPoolSize: 2 });
  try {
    await client.connect();
    const { GameController } = await import('./bootstrap.js');
    const { closeDatabase } = await import('./database.js');
    const controller = new GameController();
    const owner = { gameAccount: { uid: `coop-owner-${randomUUID()}`, name: 'Owner', email: null } };
    const member = { gameAccount: { uid: `coop-member-${randomUUID()}`, name: 'Member', email: null } };

    const { world } = await controller.createWorld(owner as any, { name: 'Co-op commands' });
    const invite = await controller.createInvite(owner as any, world.id);
    await controller.joinWorld(member as any, { token: invite.token });

    // --- Gieo trạng thái save: doanh thu/khách/XP kỹ năng/đơn tiệc/ngày hội đều đã đủ điều kiện ---
    const seeded = await controller.getWorld(owner as any, world.id);
    let tetDay = 1;
    while (getSeasonWindow(tetDay)?.event.id !== 'tet') tetDay++;
    const candy = ALL_PRODUCTS.find(p => p.category === 'candy')!;
    const partyDef = Object.values(PARTY_ORDER_MAP)[0];
    const save: any = structuredClone(seeded.businesses[0].save);
    save.worldTime = { ...save.worldTime, day: tetDay };
    save.statistics.totalRevenue = 400_000;
    save.statistics.totalCustomersServed = 60;
    save.currentDayRecord = {
      ...(save.currentDayRecord ?? {}), day: tetDay, revenue: 350_000, customersServed: 30, itemsSold: 60,
      productSales: { [candy.id]: 20 },
    };
    save.skills = { xp: { management: 300, marketing: 0, storage: 0 }, levels: { management: 3, marketing: 1, storage: 1 }, chosenPerks: [] };
    save.partyOrders = {
      available: [{ orderId: partyDef.id, status: 'pending', availableDay: tetDay, deadlineDay: tetDay + 5 }],
      completedOrderIds: [],
    };
    const lot = (quantity: number) => ({ quantity, expiresOnDay: tetDay + 60, unitCost: 1000, provenance: 'known' as const });
    save.inventory = partyDef.items.map(item => ({ productId: item.productId, quantity: item.quantity, lots: [lot(item.quantity)] }));
    const titleProbe = new GameSimulation(save, (await import('@game/data')).generateStarterTileMap(), { getMovementVector: () => ({ x: 0, y: 0 }), consumeInteract: () => false, consumeInventoryToggle: () => false } as any);
    const unlockedTitle = titleProbe.getTitles().find(t => t.unlocked);
    assert.ok(unlockedTitle, 'save gieo phải mở khóa ít nhất một danh hiệu');
    await client.db(testDbName).collection<{ _id: string }>('game_worlds').updateOne({ _id: world.id }, { $set: { 'businesses.0.save': save } });

    const snapshotFor = async (request: typeof owner) => controller.getWorld(request as any, world.id);
    const send = async (request: typeof owner, commandId: string, payload: unknown, revision: number) => {
      const current = await snapshotFor(request);
      return controller.commitCommand(request as any, world.id, {
        expectedRevision: revision,
        receipt: { commandId, actorId: request.gameAccount.uid, status: 'accepted', revision: revision + 1, payloadJson: JSON.stringify(payload), createdAt: new Date().toISOString() },
        updatedBusiness: current.businesses[0],
      });
    };

    const commands: Array<{ id: string; payload: any; check: (save: any) => void }> = [
      { id: 'respond-party', payload: { type: 'respond_party_order', orderId: partyDef.id, accept: true }, check: s => assert.equal(s.partyOrders.available[0].status, 'accepted') },
      { id: 'fulfill-party', payload: { type: 'fulfill_party_order', orderId: partyDef.id }, check: s => assert.ok(s.partyOrders.completedOrderIds.includes(partyDef.id)) },
      { id: 'claim-goal', payload: { type: 'claim_goal', goalId: 'goal_sales_100k' }, check: s => assert.ok(s.goals.claimedGoalIds.includes('goal_sales_100k')) },
      { id: 'claim-week', payload: { type: 'claim_weekly_quest', questId: 'week_revenue_300k' }, check: s => assert.equal(Object.values<string[]>(s.goals.claimedWeeklyQuestIds).flat().includes('week_revenue_300k'), true) },
      { id: 'claim-festival', payload: { type: 'claim_festival_goal', goalId: 'fest_tet_candy' }, check: s => assert.equal(s.goals.claimedFestivalGoalKeys.length, 1) },
      { id: 'choose-perk', payload: { type: 'choose_perk', perkId: 'perk_quick_hands' }, check: s => assert.ok(s.skills.chosenPerks.includes('perk_quick_hands')) },
      { id: 'set-title', payload: { type: 'set_title', titleId: unlockedTitle!.id }, check: s => assert.equal(s.player.activeTitle, unlockedTitle!.id) },
    ];

    let revision = seeded.world.revision;
    let moneyBefore = (await snapshotFor(owner)).businesses[0].save.player.money;
    for (const [index, command] of commands.entries()) {
      // Owner và member xen kẽ gửi lệnh; mỗi lệnh phải nâng revision đúng một bậc và đổi save chuẩn trên server.
      const actor = index % 2 === 0 ? owner : member;
      const result = await send(actor, command.id, command.payload, revision);
      assert.equal(result.committed, true, `${command.id} phải được commit`);
      assert.equal(result.revision, revision + 1, `${command.id} nâng revision đúng một bậc`);
      revision = result.revision;
      const stored = (await snapshotFor(index % 2 === 0 ? member : owner)).businesses[0].save;
      assert.equal(stored.revision, revision, `${command.id}: client còn lại thấy revision mới`);
      command.check(stored);
    }

    // Retry cùng commandId + cùng payload: không áp dụng tác dụng lần hai, revision/tiền không đổi.
    const afterAll = await snapshotFor(owner);
    moneyBefore = afterAll.businesses[0].save.player.money;
    const retry = await send(owner, 'claim-goal', commands[2].payload, revision - 5);
    assert.equal(retry.committed, true);
    const afterRetry = await snapshotFor(owner);
    assert.equal(afterRetry.world.revision, revision, 'retry idempotent không nâng revision');
    assert.equal(afterRetry.businesses[0].save.player.money, moneyBefore, 'retry không cộng thưởng lần hai');

    // Cùng commandId nhưng payload khác bị từ chối.
    await assert.rejects(send(owner, 'claim-goal', { type: 'claim_goal', goalId: 'goal_other' }, revision));

    // Lệnh mới nhưng không đủ điều kiện (nhận lại ngày hội) bị server từ chối và không commit.
    await assert.rejects(send(member, 'claim-festival-again', commands[4].payload, revision));
    assert.equal((await snapshotFor(member)).world.revision, revision, 'lệnh bị từ chối không đổi revision');

    // Hai client gửi hai lệnh mới cùng expectedRevision: đúng một lệnh thắng.
    const race = await Promise.allSettled([
      send(owner, 'race-title-a', { type: 'set_title', titleId: undefined }, revision),
      send(member, 'race-title-b', { type: 'set_title', titleId: undefined }, revision),
    ]);
    assert.equal(race.filter(r => r.status === 'fulfilled').length, 1, 'tranh chấp cùng revision: đúng một thắng');
    assert.equal((await snapshotFor(owner)).world.revision, revision + 1);

    // Thành viên (không phải chủ hẻm) cũng được sửa bố cục cửa hàng qua layout_batch.
    await client.db(testDbName).collection<{ _id: string }>('game_worlds').updateOne({ _id: world.id }, { $set: { 'businesses.0.save.worldTime.isStoreOpen': false } }); // layout chỉ sửa được khi đóng cửa
    const layoutRevision = (await snapshotFor(member)).world.revision;
    const shelf = (await snapshotFor(member)).businesses[0].save.storeLayout.fixtures.find((f: any) => f.type === 'shelf_wooden');
    assert.ok(shelf, 'save gieo có ít nhất một kệ');
    const layoutResult = await send(member, 'member-layout', { type: 'layout_batch', actions: [{ type: 'store', fixtureId: shelf.id }] }, layoutRevision);
    assert.equal(layoutResult.committed, true, 'thành viên được commit layout_batch');
    const afterLayout = (await snapshotFor(owner)).businesses[0].save.storeLayout;
    assert.ok(afterLayout.storedFixtures.some((f: any) => f.id === shelf.id), 'kệ đã được cất vào kho sau lệnh của thành viên');

    // I-03: tài khoản không thuộc hẻm không được gửi lệnh bố cục.
    const outsider = { gameAccount: { uid: `coop-outsider-${randomUUID()}`, name: 'Outsider', email: null } };
    const outsiderBase = await snapshotFor(owner);
    await assert.rejects(controller.commitCommand(outsider as any, world.id, {
      expectedRevision: outsiderBase.world.revision,
      receipt: { commandId: 'outsider-layout', actorId: outsider.gameAccount.uid, status: 'accepted', revision: outsiderBase.world.revision + 1, payloadJson: JSON.stringify({ type: 'layout_batch', actions: [] }), createdAt: new Date().toISOString() },
      updatedBusiness: structuredClone(outsiderBase.businesses[0]),
    }));
    assert.equal((await snapshotFor(owner)).world.revision, outsiderBase.world.revision, 'lệnh của tài khoản ngoài hẻm không đổi revision');

    // I-01 (một phần): loại lệnh lạ bị từ chối dù save hợp lệ.
    const unknownRevision = (await snapshotFor(owner)).world.revision;
    await assert.rejects(send(owner, 'unknown-type', { type: 'give_money', amount: 1_000_000 }, unknownRevision), /không được hỗ trợ/);
    assert.equal((await snapshotFor(owner)).world.revision, unknownRevision, 'lệnh lạ không làm đổi revision');

    // I-01 hướng B: lệnh chưa replay nhưng save bị sửa tiền thì bị từ chối; save giữ nguyên thì được nhận.
    const cheatBase = await snapshotFor(owner);
    const cheatBusiness = structuredClone(cheatBase.businesses[0]) as any;
    cheatBusiness.save.player.money += 50_000_000;
    await assert.rejects(controller.commitCommand(owner as any, world.id, {
      expectedRevision: cheatBase.world.revision,
      receipt: { commandId: 'cheat-money', actorId: owner.gameAccount.uid, status: 'accepted', revision: cheatBase.world.revision + 1, payloadJson: JSON.stringify({ type: 'set_price', productId: 'x', price: null }), createdAt: new Date().toISOString() },
      updatedBusiness: cheatBusiness,
    }), /Save không hợp lệ/);
    assert.equal((await snapshotFor(owner)).world.revision, cheatBase.world.revision, 'save gian lận không làm đổi revision');
    const honest = await controller.commitCommand(owner as any, world.id, {
      expectedRevision: cheatBase.world.revision,
      receipt: { commandId: 'honest-price', actorId: owner.gameAccount.uid, status: 'accepted', revision: cheatBase.world.revision + 1, payloadJson: JSON.stringify({ type: 'set_price', productId: 'x', price: null }), createdAt: new Date().toISOString() },
      updatedBusiness: structuredClone(cheatBase.businesses[0]),
    });
    assert.equal(honest.committed, true, 'save không bị sửa vẫn được nhận');

    // I-05: tuyển nhân viên qua commit co-op. Máy khách mô phỏng cục bộ rồi gửi lệnh; tuyển thêm không qua lệnh bị từ chối.
    await client.db(testDbName).collection<{ _id: string }>('game_worlds').updateOne({ _id: world.id }, { $set: { 'businesses.0.save.player.level': 5, 'businesses.0.save.player.money': 5_000_000 } });
    const staffBase = await snapshotFor(owner);
    const { generateStarterTileMap: starterMap } = await import('@game/data');
    const headless = { getMovementVector: () => ({ x: 0, y: 0 }), consumeInteract: () => false, consumeInventoryToggle: () => false } as any;
    const clientSim = new GameSimulation(structuredClone(staffBase.businesses[0].save), starterMap(), headless);
    const candidate = clientSim.getStaffCandidates(staffBase.businesses[0].save.worldTime.day)[0];
    assert.ok(candidate, 'có ứng viên để tuyển');
    assert.equal(clientSim.hireStaff(candidate.id).success, true, 'máy khách tuyển được cục bộ');
    const staffSave = clientSim.exportSaveData(staffBase.businesses[0].save.id, staffBase.world.revision + 1) as any;
    const staffPayload = JSON.stringify({ type: 'hire_staff', candidateId: candidate.id });
    const staffCommit = (commandId: string, save: any, expectedRevision: number) => controller.commitCommand(owner as any, world.id, {
      expectedRevision,
      receipt: { commandId, actorId: owner.gameAccount.uid, status: 'accepted', revision: expectedRevision + 1, payloadJson: staffPayload, createdAt: new Date().toISOString() },
      updatedBusiness: { ...staffBase.businesses[0], save },
    });
    const extra = structuredClone(staffSave);
    extra.staff = [...extra.staff, { ...extra.staff[0], id: 'staff-injected' }];
    await assert.rejects(staffCommit('hire-two', extra, staffBase.world.revision), /Save không hợp lệ/, 'tuyển thêm một người ngoài lệnh bị từ chối');
    const hireResult = await staffCommit('hire-one', staffSave, staffBase.world.revision);
    assert.equal(hireResult.committed, true, 'hire_staff hợp lệ được commit');
    assert.equal((await snapshotFor(member)).businesses[0].save.staff?.length, 1, 'thành viên còn lại thấy nhân viên mới');

    console.log('PASS co-op: 7 lệnh server-replay qua GameController.commitCommand trên Mongo thật (2 tài khoản, retry idempotent, trùng commandId khác payload, lệnh bị từ chối, tranh chấp revision)');
    await closeDatabase();
  } finally {
    await client.db(testDbName).dropDatabase();
    await client.close();
    if (previousDbName === undefined) delete process.env.MONGODB_DATABASE; else process.env.MONGODB_DATABASE = previousDbName;
  }
}

void run().catch((error: unknown) => {
  console.error(`Co-op commands test failed: ${error instanceof Error ? error.stack ?? error.message : 'unknown error'}`);
  process.exitCode = 1;
});
