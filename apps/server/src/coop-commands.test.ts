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

    // I-01 hướng B: lệnh kinh tế được server replay rồi lưu save chuẩn của server, bỏ qua save máy khách; tiền cộng thêm không vào được.
    const cheatBase = await snapshotFor(owner);
    const cheatBusiness = structuredClone(cheatBase.businesses[0]) as any;
    cheatBusiness.save.player.money += 50_000_000;
    const cheatResult = await controller.commitCommand(owner as any, world.id, {
      expectedRevision: cheatBase.world.revision,
      receipt: { commandId: 'cheat-money', actorId: owner.gameAccount.uid, status: 'accepted', revision: cheatBase.world.revision + 1, payloadJson: JSON.stringify({ type: 'set_price', productId: 'mi_hao_hao', price: null }), createdAt: new Date().toISOString() },
      updatedBusiness: cheatBusiness,
    });
    assert.equal(cheatResult.committed, true, 'lệnh hợp lệ được nhận');
    assert.equal((await snapshotFor(owner)).businesses[0].save.player.money, cheatBase.businesses[0].save.player.money, 'tiền gian lận trong save máy khách bị bỏ, server giữ kết quả replay');

    // I-01 mở rộng (02/10/2026): buy_plot, buy_warehouse_tier, buy_storage_rack phải qua server replay và được hai client thấy.
    // Cần đóng cửa để buy_plot được phép, level >= 11 cho buy_warehouse_tier tier 3 (save khởi đầu đã có kho tier 2).
    await client.db(testDbName).collection<{ _id: string }>('game_worlds').updateOne({ _id: world.id }, { $set: { 'businesses.0.save.worldTime.isStoreOpen': false, 'businesses.0.save.player.level': 11, 'businesses.0.save.player.money': 5_000_000 } });
    const buyRevision = (await snapshotFor(owner)).world.revision;
    const buyMoney = (await snapshotFor(owner)).businesses[0].save.player.money;
    assert.ok(buyMoney >= 250_000, 'có đủ tiền mua kho tier 1');
    const buyPlotResult = await send(owner, 'buy-plot', { type: 'buy_plot', plotId: 'east-wing-a' }, buyRevision);
    assert.equal(buyPlotResult.committed, true, 'buy_plot được commit');
    const afterBuyPlot = await snapshotFor(member);
    assert.ok(afterBuyPlot.businesses[0].save.storeLayout.unlockedPlotIds?.includes('east-wing-a'), 'member thấy plot mới qua server replay');
    assert.equal(afterBuyPlot.world.revision, buyRevision + 1, 'revision tăng đúng bậc');

    const warehouseRevision = (await snapshotFor(owner)).world.revision;
    const whMoney = (await snapshotFor(owner)).businesses[0].save.player.money;
    assert.ok(whMoney >= 900_000, 'có đủ tiền mua kho tier 3');
    const whResult = await send(owner, 'buy-warehouse', { type: 'buy_warehouse_tier', tier: 3 }, warehouseRevision);
    assert.equal(whResult.committed, true, 'buy_warehouse_tier được commit');
    const afterWh = await snapshotFor(member);
    assert.equal(afterWh.businesses[0].save.warehouseTier, 3, 'member thấy warehouse tier 3');

    const rackRevision = (await snapshotFor(owner)).world.revision;
    const rackMoney = (await snapshotFor(owner)).businesses[0].save.player.money;
    assert.ok(rackMoney >= 50_000, 'có đủ tiền mua storage rack');
    const racksBefore = (await snapshotFor(owner)).businesses[0].save.storageRackCount ?? 0;
    const rackResult = await send(member, 'buy-rack', { type: 'buy_storage_rack' }, rackRevision);
    assert.equal(rackResult.committed, true, 'buy_storage_rack được commit');
    const afterRack = await snapshotFor(owner);
    assert.equal(afterRack.businesses[0].save.storageRackCount, racksBefore + 1, 'owner thấy thêm đúng một storage rack qua server replay');

    // Tiệm xôi riêng (OpenSpec xoi-shop-same-land-strip): mua qua buy_plot như đất, server replay và hai client cùng thấy.
    await client.db(testDbName).collection<{ _id: string }>('game_worlds').updateOne({ _id: world.id }, { $set: { 'businesses.0.save.worldTime.isStoreOpen': false, 'businesses.0.save.player.level': 30, 'businesses.0.save.player.money': 5_000_000 } });
    const xoiRevision = (await snapshotFor(owner)).world.revision;
    const xoiResult = await send(owner, 'buy-xoi', { type: 'buy_plot', plotId: 'building-xoi' }, xoiRevision);
    assert.equal(xoiResult.committed, true, 'mua tiệm xôi được commit');
    const afterXoi = await snapshotFor(member);
    const xoiSave = afterXoi.businesses[0].save;
    assert.ok(xoiSave.storeLayout.unlockedPlotIds?.includes('building-xoi'), 'member thấy tiệm xôi đã mở');
    assert.equal(xoiSave.player.money, 5_000_000 - 700_000, 'trừ đúng 700.000 ₫ một lần');
    assert.ok(xoiSave.storeLayout.fixtures.some((f: { id: string }) => f.id === 'xoi_cashier_counter'), 'bố cục mặc định tiệm xôi có quầy thu ngân');
    const xoiRetry = await send(owner, 'buy-xoi', { type: 'buy_plot', plotId: 'building-xoi' }, xoiRevision);
    assert.equal(xoiRetry.committed, true, 'gửi lại cùng lệnh idempotent');
    assert.equal((await snapshotFor(owner)).businesses[0].save.player.money, 5_000_000 - 700_000, 'gửi lại không trừ tiền lần hai');

    // Người ngoài hẻm gửi lệnh mua đất/tiệm bị từ chối và không đổi revision.
    const xoiOutsider = { gameAccount: { uid: `coop-outsider-${randomUUID()}`, name: 'Outsider', email: null } };
    const xoiBase = await snapshotFor(owner);
    await assert.rejects(controller.commitCommand(xoiOutsider as any, world.id, {
      expectedRevision: xoiBase.world.revision,
      receipt: { commandId: 'outsider-plot', actorId: xoiOutsider.gameAccount.uid, status: 'accepted', revision: xoiBase.world.revision + 1, payloadJson: JSON.stringify({ type: 'buy_plot', plotId: 'east-wing-b' }), createdAt: new Date().toISOString() },
      updatedBusiness: structuredClone(xoiBase.businesses[0]),
    }));
    assert.equal((await snapshotFor(owner)).world.revision, xoiBase.world.revision, 'lệnh mua đất của người ngoài hẻm không đổi revision');

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
    // hire_staff được server replay: nhân viên chèn thêm trong save máy khách bị bỏ, chỉ còn đúng một người do lệnh tạo.
    const hireResult = await staffCommit('hire-one', extra, staffBase.world.revision);
    assert.equal(hireResult.committed, true, 'hire_staff hợp lệ được commit');
    const hired = (await snapshotFor(member)).businesses[0].save.staff ?? [];
    assert.equal(hired.length, 1, 'thành viên còn lại thấy đúng một nhân viên mới');
    assert.ok(!hired.some((member: any) => member.id === 'staff-injected'), 'nhân viên chèn ngoài lệnh không vào save chuẩn');

    // --- Lệnh vận hành hằng ngày: server phát lại và lưu save chuẩn ---
    const opsBase = await snapshotFor(owner);
    let opsRevision = opsBase.world.revision;
    const ops = async (id: string, payload: unknown) => {
      const result = await send(owner, id, payload, opsRevision);
      assert.equal(result.committed, true, `${id} phải được commit`);
      opsRevision = result.revision;
      return (await snapshotFor(member)).businesses[0].save as any;
    };
    const wasOpen = opsBase.businesses[0].save.worldTime.isStoreOpen;
    let after = await ops('ops-store-status', { type: 'store_status', isOpen: !wasOpen });
    assert.equal(after.worldTime.isStoreOpen, !wasOpen, 'store_status đổi trạng thái mở/đóng ở server');
    after = await ops('ops-store-status-back', { type: 'store_status', isOpen: wasOpen });
    assert.equal(after.worldTime.isStoreOpen, wasOpen);

    // Cài đặt gợi ý nhập hàng: lệnh server-replay, lưu vào save chung; payload sai bị chặn trước khi chạm save.
    after = await ops('ops-restock-options', { type: 'set_restock_options', options: { provenSharePct: 60, maxTrialProducts: 3, cashReservePct: 15, protectObligations: false } });
    assert.deepEqual(after.restockOptions, { provenSharePct: 60, maxTrialProducts: 3, cashReservePct: 15, protectObligations: false }, 'set_restock_options lưu ở save chuẩn');
    await assert.rejects(send(owner, 'ops-restock-options-bad', { type: 'set_restock_options', options: { cashReservePct: 'abc' } }, opsRevision), /không hợp lệ|invalid|Bad/i, 'cài đặt sai kiểu bị từ chối');
    after = (await snapshotFor(member)).businesses[0].save as any;
    assert.equal(after.restockOptions.cashReservePct, 15, 'lệnh sai không đổi cài đặt');

    // Gieo kho + hàng chờ + kệ trống để thử cất hàng, sơ đồ kệ và châm kệ tự động.
    const noodleShelf = 'shelf_wooden_drinks';
    const noodle = 'xa_xi_chuong_duong';
    const gameDb = client.db(testDbName).collection<{ _id: string }>('game_worlds');
    const opsSave = (await snapshotFor(owner)).businesses[0].save as any;
    const shelfIndex = opsSave.storeLayout.fixtures.findIndex((f: any) => f.id === noodleShelf);
    assert.ok(shelfIndex >= 0, 'save mặc định phải có kệ mì: ' + opsSave.storeLayout.fixtures.map((f: any) => f.id + ':' + f.type + ':' + f.assignedProductId).join(','));
    await gameDb.updateOne({ _id: world.id }, { $set: {
      'businesses.0.save.inventory': [{ productId: noodle, quantity: 30, lots: [lot(30)] }],
      'businesses.0.save.holdingArea': [{ id: 'hold-test-1', productId: 'mi_hao_hao', quantity: 6, expiresOnDay: tetDay + 60, originalArrivalDay: tetDay, unitCost: 1000, provenance: 'known' }],
      [`businesses.0.save.storeLayout.fixtures.${shelfIndex}.currentStock`]: 0,
      [`businesses.0.save.storeLayout.fixtures.${shelfIndex}.stockLots`]: [],
    } });
    opsRevision = (await snapshotFor(owner)).world.revision;

    after = await ops('ops-planogram', { type: 'planogram_assignment', fixtureId: noodleShelf, productId: noodle });
    assert.equal(after.planogram?.[noodleShelf], noodle, 'planogram_assignment lưu ở save chuẩn');

    const stockOf = (s: any) => s.storeLayout.fixtures.find((f: any) => f.id === noodleShelf).currentStock as number;
    const noodleQty = (s: any) => (s.inventory.find((i: any) => i.productId === noodle)?.quantity ?? 0) as number;
    after = await ops('ops-planogram-restock', { type: 'planogram_restock', fixtureId: noodleShelf });
    assert.ok(stockOf(after) > 0, 'planogram_restock châm kệ từ kho');
    assert.equal(noodleQty(after) + stockOf(after), 30, 'hàng chuyển từ kho lên kệ, không sinh thêm');

    await gameDb.updateOne({ _id: world.id }, { $set: { [`businesses.0.save.storeLayout.fixtures.${shelfIndex}.currentStock`]: 0, [`businesses.0.save.storeLayout.fixtures.${shelfIndex}.stockLots`]: [], 'businesses.0.save.inventory': [{ productId: noodle, quantity: 30, lots: [lot(30)] }] } });
    opsRevision = (await snapshotFor(owner)).world.revision;
    after = await ops('ops-auto-restock', { type: 'auto_restock' });
    assert.ok(stockOf(after) > 0, 'auto_restock châm kệ từ kho');
    assert.equal(noodleQty(after) + stockOf(after), 30, 'auto_restock bảo toàn số lượng');

    const heldBefore = (after.holdingArea ?? []).length;
    assert.equal(heldBefore, 1, 'có đúng một mục hàng chờ');
    after = await ops('ops-stow', { type: 'stow', holdingId: 'hold-test-1' });
    assert.equal((after.holdingArea ?? []).length, 0, 'stow cất hàng chờ vào kho');
    assert.equal(after.inventory.find((i: any) => i.productId === 'mi_hao_hao')?.quantity, 6, 'hàng đã cất nằm trong kho');
    await assert.rejects(send(owner, 'ops-stow-gone', { type: 'stow', holdingId: 'hold-test-1' }, opsRevision), 'stow mục đã cất bị từ chối');

    await gameDb.updateOne({ _id: world.id }, { $set: { 'businesses.0.save.holdingArea': [{ id: 'hold-test-2', productId: 'mi_hao_hao', quantity: 3, expiresOnDay: tetDay + 60, originalArrivalDay: tetDay, unitCost: 1000, provenance: 'known' }] } });
    opsRevision = (await snapshotFor(owner)).world.revision;
    after = await ops('ops-stow-all', { type: 'stow_all' });
    assert.equal((after.holdingArea ?? []).length, 0, 'stow_all cất hết hàng chờ');
    assert.equal(after.inventory.find((i: any) => i.productId === 'mi_hao_hao')?.quantity, 9, 'stow_all cộng đúng số lượng');

    // advance_day trực tiếp chỉ cho hẻm một thành viên; hẻm này có 2 người nên phải qua phiếu bầu → bị từ chối, không đổi revision.
    await assert.rejects(send(owner, 'ops-advance-day', { type: 'advance_day' }, opsRevision), 'advance_day bị từ chối khi hẻm có 2 thành viên');
    // Lệnh vô hiệu (không có hàng chờ để cất) bị từ chối thay vì commit khống.
    await assert.rejects(send(owner, 'ops-stow-all-empty', { type: 'stow_all' }, opsRevision), 'stow_all không có hàng chờ bị từ chối');
    assert.equal((await snapshotFor(owner)).world.revision, opsRevision, 'lệnh bị từ chối không đổi revision');

    console.log('PASS co-op: 10 lệnh server-replay + lệnh vận hành (store_status, planogram, advance_day, stow_all) qua GameController.commitCommand');
    await closeDatabase();
  } finally {
    await client.db(testDbName).dropDatabase();
    await client.close();
    if (previousDbName === undefined) delete process.env.MONGODB_DATABASE; else process.env.MONGODB_DATABASE = previousDbName;
  }
}

void run().catch(async (error: unknown) => {
  console.error(`Co-op commands test failed: ${error instanceof Error ? error.stack ?? error.message : 'unknown error'}`);
  // Đóng pool Mongo để tiến trình thoát thay vì treo khi test thất bại.
  const { closeDatabase } = await import('./database.js');
  await closeDatabase().catch(() => undefined);
  process.exit(1);
});
