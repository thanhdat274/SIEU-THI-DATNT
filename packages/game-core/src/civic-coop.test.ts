/** Test luật co-op của Sổ góp xóm (OpenSpec `civic-city-goals`, Giai đoạn 6): quyền, phiếu, hàng đợi, phiên server. */
import assert from 'node:assert/strict';
import { createInitialOnlineWorld, civicBundleById } from '@game/data';
import { MULTIPLAYER_PROTOCOL_VERSION } from '@game/shared';
import { decideLandCommand, landVoteDescription } from './land-policy';
import { WorldRuntime } from './world-runtime';
import { isBundleCompleted } from './civic-bundles';
import { openBuildingReasonMessage } from './land-error-messages';

const CASH_SLOT = 'slot_park_cash';

function makeRuntime(opts: { money?: number; inventory?: { productId: string; quantity: number }[] } = {}) {
  const seeded = createInitialOnlineWorld({ id: 'o1', displayName: 'Chủ', photoUrl: null }, 'civic-coop');
  seeded.world.memberships.push({ accountId: 'm2', role: 'member', joinedAt: new Date().toISOString(), lastSeenRevision: 0 });
  seeded.world.avatars.push({ accountId: 'm2', position: { x: 400, y: 400 }, direction: 'down', updatedAt: new Date().toISOString(), displayName: 'Bạn' });
  const save = seeded.business.save;
  save.cityProgress = { level: 4, claimedCityGoalIds: [], milestones: [], metrics: {} };
  save.player.money = opts.money ?? 10_000_000;
  save.inventory = (opts.inventory ?? [{ productId: 'nuoc_rua_tay', quantity: 10 }]).map(i => ({ ...i }));
  save.worldTime = { ...save.worldTime, isStoreOpen: false };
  const runtime = new WorldRuntime(seeded.world, seeded.business, { checkpointIntervalSeconds: 30 });
  runtime.registerSession('o1');
  runtime.registerSession('m2');
  let n = 0;
  const send = (actor: string, payload: Record<string, unknown>) => runtime.executeCommand(actor, {
    protocolVersion: MULTIPLAYER_PROTOCOL_VERSION, worldId: seeded.world.id, businessId: seeded.business.id,
    commandId: `c${++n}`, expectedRevision: runtime.getRevision(), payload,
  });
  const save2 = () => runtime.getSnapshot().businesses[0].save;
  const bundle = () => save2().civic?.bundles?.bundle_park;
  return { runtime, send, bundle, save: save2 };
}

export async function runCivicCoopTests(): Promise<void> {
  console.log('\n▶ Civic co-op tests');

  // 6.1/6.2/6.3 — quyết định quyền & phiếu (thuần).
  const cashCmd = (amount: number) => ({ type: 'donate_to_bundle', bundleId: 'bundle_park', slotId: CASH_SLOT, amount });
  const goodsCmd = { type: 'donate_to_bundle', bundleId: 'bundle_park', slotId: 'slot_park_hygiene_1', productId: 'nuoc_rua_tay', quantity: 5 };
  assert.equal(decideLandCommand(goodsCmd, 'member', { memberLandPermissions: 'none' }, 1_000_000, true).action, 'allow', '6.1 góp hàng: mọi thành viên, kể cả quyền none, không phiếu');
  assert.equal(decideLandCommand(goodsCmd, 'member', undefined, 1_000_000, true).action, 'allow', '6.1 góp hàng không cần phiếu');
  assert.equal(decideLandCommand(cashCmd(200_000), 'member', undefined, 1_000_000, true).action, 'allow', '6.2 góp ≤ 30% quỹ: thẳng');
  assert.equal(decideLandCommand(cashCmd(300_000), 'member', undefined, 1_000_000, true).action, 'allow', '6.2 đúng 30% vẫn thẳng');
  assert.equal(decideLandCommand(cashCmd(400_000), 'member', undefined, 1_000_000, true).action, 'vote', '6.2 > 30% quỹ: phiếu');
  assert.equal(decideLandCommand(cashCmd(300_000), 'member', undefined, 1_000_000, false).action, 'allow', 'chủ hẻm offline: chạy thẳng không phiếu trong trần ngày (chủ dự án chốt 30%/ngày, thay cho "không giới hạn")');
  // Trần ngày khi chủ hẻm offline: 30% tiền chung (đầu ngày), tính cộng dồn trong ngày.
  const capped = (amount: number, donated: number, funds = 1_000_000) => decideLandCommand(cashCmd(amount), 'member', undefined, funds, false, { memberCashDonatedToday: donated });
  assert.equal(capped(300_000, 0).action, 'allow', 'offline: đúng trần 30% vẫn được');
  assert.deepEqual(capped(300_001, 0), { action: 'forbid', command: 'donate_bundle_cash', reason: 'daily_cap' }, 'offline: vượt trần ngày bị chặn');
  assert.equal(capped(100_000, 200_000, 800_000).action, 'allow', 'cộng dồn: đã góp 200k, quỹ còn 800k → trần 300k, góp thêm 100k được');
  assert.equal(capped(100_001, 200_000, 800_000).action, 'forbid', 'cộng dồn vượt trần');
  // Trần cố định theo tiền đầu ngày: tiền hiện tại tụt (đã chi đất) không làm trần co lại.
  const fixed = (amount: number) => decideLandCommand(cashCmd(amount), 'member', undefined, 500_000, false, { memberCashDonatedToday: 200_000, dayStartFunds: 1_000_000 });
  assert.equal(fixed(100_000).action, 'allow', 'trần theo tiền đầu ngày 1M = 300k, đã góp 200k, thêm 100k được dù tiền hiện tại chỉ 500k');
  assert.equal(fixed(100_001).action, 'forbid', 'vượt trần cố định');
  // Mở tòa lúc tiệm đang mở: câu tiếng Việt, không lộ mã thô.
  assert.equal(openBuildingReasonMessage('store_open'), 'Cần đóng cửa tiệm rồi mới mở được cơ sở mới.');
  assert.equal(openBuildingReasonMessage(undefined), 'Không mở được cơ sở.');
  assert.equal(openBuildingReasonMessage('ma_la'), 'ma_la', 'mã lạ trả về chính mã');
  assert.ok(['store_open', 'unknown_type', 'unknown_parcel', 'parcel_not_owned', 'not_leased', 'rent_debt', 'wave_not_open', 'level', 'money', 'max_instances', 'single_instance', 'building_present', 'owned', 'invalid_day'].every(r => openBuildingReasonMessage(r) !== r), 'mọi lý do của openBuilding đều có câu tiếng Việt');
  assert.equal(decideLandCommand(cashCmd(300_001), 'owner', undefined, 1_000_000, false).action, 'allow', 'chủ hẻm không bị trần');
  assert.equal(decideLandCommand(cashCmd(10_000), 'member', { memberLandPermissions: 'none' }, 1_000_000, true).action, 'forbid', '6.3 quyền none: không góp tiền');
  assert.equal(decideLandCommand(cashCmd(10_000), 'owner', { memberLandPermissions: 'none' }, 1_000_000, true).action, 'allow', '6.3 chủ hẻm luôn góp được');
  assert.equal(decideLandCommand({ type: 'claim_city_goal', goalId: 'x' }, 'member', { memberLandPermissions: 'none' }, 1_000_000, true).action, 'allow', '6.3 claim_city_goal: thành viên vẫn nhận (chủ dự án chốt)');
  // Giá phiếu tính theo phần ô thực nhận: ô gần đủ thì xin góp lớn không tạo phiếu oan.
  const nearlyFull = { bundle_park: { slots: { [CASH_SLOT]: 1_750_000 - 50_000 }, contributions: [] } };
  assert.equal(decideLandCommand(cashCmd(900_000), 'member', undefined, 1_000_000, true, { bundleStates: nearlyFull }).action, 'allow', 'giá phiếu = phần thiếu thực nhận (50k)');
  assert.equal(landVoteDescription(cashCmd(400_000)), 'Góp 400.000₫ vào Quỹ xây dựng — Công viên', 'nhãn phiếu');

  // 6.6 — playerId lấy từ phiên server, không từ payload.
  {
    const { send, bundle } = makeRuntime();
    const r = await send('m2', { type: 'donate_to_bundle', bundleId: 'bundle_park', slotId: 'slot_park_hygiene_1', productId: 'nuoc_rua_tay', quantity: 3, playerId: 'o1' });
    assert.equal(r.status, 'accepted');
    assert.deepEqual(bundle()?.contributions.map(c => c.playerId), ['m2'], '6.6 người góp = phiên server (m2), bỏ qua playerId trong payload');
  }

  // 6.4 — hai người góp cùng ô: lần lượt; lệnh sau chỉ nhận phần thiếu; ô đủ thì từ chối "vừa được góp đủ".
  {
    const { send, bundle } = makeRuntime({ inventory: [{ productId: 'nuoc_rua_tay', quantity: 30 }] });
    // Server xử lý lần lượt (hàng đợi coordinator; revision được server gán theo trạng thái mới nhất).
    const a = await send('o1', { type: 'donate_to_bundle', bundleId: 'bundle_park', slotId: 'slot_park_hygiene_1', productId: 'nuoc_rua_tay', quantity: 7 });
    const b = await send('m2', { type: 'donate_to_bundle', bundleId: 'bundle_park', slotId: 'slot_park_hygiene_1', productId: 'nuoc_rua_tay', quantity: 7 });
    assert.equal(a.status, 'accepted');
    assert.equal(b.status, 'accepted');
    assert.equal(bundle()?.slots.slot_park_hygiene_1, 10, '6.4 lệnh sau chỉ nhận phần thiếu (3), tổng đúng 10');
    const c = await send('o1', { type: 'donate_to_bundle', bundleId: 'bundle_park', slotId: 'slot_park_hygiene_1', productId: 'nuoc_rua_tay', quantity: 1 });
    assert.equal(c.status, 'rejected');
    assert.equal(c.reason, 'slot_full', '6.4 ô đủ → từ chối slot_full ("Ô này vừa được góp đủ")');
  }

  // 6.5 — kho không đủ lúc xử lý: từ chối cả lệnh, không trừ một phần.
  {
    const { send, bundle, save } = makeRuntime({ inventory: [{ productId: 'nuoc_rua_tay', quantity: 2 }] });
    const r = await send('m2', { type: 'donate_to_bundle', bundleId: 'bundle_park', slotId: 'slot_park_hygiene_1', productId: 'nuoc_rua_tay', quantity: 5 });
    assert.equal(r.status, 'rejected');
    assert.equal(r.reason, 'not_enough_stock');
    assert.equal(save().inventory.find(i => i.productId === 'nuoc_rua_tay')?.quantity, 2, '6.5 kho nguyên vẹn');
    assert.equal(bundle()?.slots?.slot_park_hygiene_1 ?? 0, 0, '6.5 ô không tăng');
  }

  // 6.7 — phiếu chờ mà ô đã đủ: khi phiếu chạy lệnh bị từ chối kèm lý do để báo người tạo.
  {
    const { send, bundle } = makeRuntime({ money: 10_000_000 });
    const cash = civicBundleById('bundle_park')!.slots.find(s => s.id === CASH_SLOT)!.amount!;
    const first = await send('o1', { type: 'donate_to_bundle', bundleId: 'bundle_park', slotId: CASH_SLOT, amount: cash });
    assert.equal(first.status, 'accepted', 'người thứ nhất góp đủ ô quỹ');
    const pending = await send('m2', { type: 'donate_to_bundle', bundleId: 'bundle_park', slotId: CASH_SLOT, amount: 500_000 });
    assert.equal(pending.status, 'rejected', '6.7 phiếu chạy sau khi ô đủ bị từ chối');
    assert.equal(pending.reason, 'slot_full', '6.7 lý do slot_full để báo người tạo phiếu');
    assert.ok(!bundle()?.contributions.some(c => c.playerId === 'm2'), 'không ghi đóng góp của lệnh bị hủy');
  }

  // Hoàn thành chung: hai người góp đủ → trang xong, đóng góp ghi đúng từng người.
  {
    const { send, bundle } = makeRuntime({ money: 10_000_000, inventory: [{ productId: 'nuoc_rua_tay', quantity: 10 }, { productId: 'xa_phong', quantity: 10 }, { productId: 'bim_bim_oishi', quantity: 12 }] });
    const def = civicBundleById('bundle_park')!;
    await send('o1', { type: 'donate_to_bundle', bundleId: 'bundle_park', slotId: 'slot_park_hygiene_1', productId: 'nuoc_rua_tay', quantity: 10 });
    await send('m2', { type: 'donate_to_bundle', bundleId: 'bundle_park', slotId: 'slot_park_hygiene_2', productId: 'xa_phong', quantity: 10 });
    await send('m2', { type: 'donate_to_bundle', bundleId: 'bundle_park', slotId: 'slot_park_snack', productId: 'bim_bim_oishi', quantity: 12 });
    await send('o1', { type: 'donate_to_bundle', bundleId: 'bundle_park', slotId: CASH_SLOT, amount: def.slots.find(s => s.id === CASH_SLOT)!.amount! });
    assert.ok(isBundleCompleted(def, bundle()), 'hai người góp đủ → trang hoàn thành');
    assert.equal(new Set(bundle()?.contributions.map(c => c.playerId)).size, 2, 'đóng góp ghi cho cả hai người');
  }
  console.log('  ✓ civic co-op PASS');
}
