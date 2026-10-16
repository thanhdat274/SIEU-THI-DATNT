/** Test view-model tab Sổ góp (OpenSpec `civic-city-goals`, Giai đoạn 4). */
import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, civicBundleById, generateStarterTileMap } from '@game/data';
import type { SaveGameData } from '@game/shared';
import { GameSimulation } from './simulation';
import { InputManager } from './input';
import { addCivicMilestoneOnce, civicJournalLines } from './city-journal';
import { buildCivicBundleViews, bundleNeededProductIds, donorDisplayName, previewDonationCost, reconcileDonateRejection } from './civic-bundle-view';
import { BUNDLE_REASON_MESSAGES } from './civic-bundles';

function newSim(cityLevel: number): GameSimulation {
  const save = structuredClone(DEFAULT_INITIAL_SAVE) as SaveGameData;
  save.player.level = 80;
  save.player.money = 200_000_000;
  save.worldTime.isStoreOpen = false;
  save.cityProgress = { level: cityLevel, claimedCityGoalIds: [], milestones: [], metrics: {} };
  return new GameSimulation(save, generateStarterTileMap(), new InputManager(), {});
}

export function runCivicBundleViewTests(): void {
  console.log('\n▶ Civic bundle view tests');
  const sim = newSim(4);
  let views = sim.getCivicBundleViews();
  assert.equal(views.find(v => v.id === 'bundle_park')?.status, 'collecting', 'cấp 4: park đang góp');
  assert.equal(views.find(v => v.id === 'bundle_clinic')?.status, 'hidden', 'clinic chưa hiện');
  const park = views.find(v => v.id === 'bundle_park')!;
  assert.equal(park.remainingCost, park.buildCost, 'chưa góp: còn phải trả = giá xây');
  assert.equal(park.hasDonatable, false, 'kho trống: không chấm đỏ');
  assert.equal(park.slots.find(s => s.kind === 'goods')?.blockReason, 'no_stock', 'kho trống → Hết hàng');
  assert.ok(bundleNeededProductIds(views).has('nuoc_rua_tay'), 'huy hiệu Xóm cần cho món ô park');
  assert.ok(!bundleNeededProductIds(views).has('pho_goi'), 'ward_police chưa hiện → không cần');

  // Có hàng → góp được; góp xong thì giá trị đã góp tăng.
  const inv = (sim as unknown as { inventory: { productId: string; quantity: number }[] }).inventory;
  inv.push({ productId: 'nuoc_rua_tay', quantity: 5 });
  views = sim.getCivicBundleViews();
  assert.equal(views.find(v => v.id === 'bundle_park')!.hasDonatable, true, 'có hàng → chấm đỏ');
  const day = sim.getClock().getTime().day;
  const cost = previewDonationCost(sim.getInventory(), 'nuoc_rua_tay', 3, day);
  assert.ok(cost > 0, 'xem trước giá vốn > 0');
  const res = sim.donateToBundle('bundle_park', 'slot_park_hygiene_1', 'nuoc_rua_tay', 3, undefined);
  assert.equal(res.success, true);
  const after = sim.getCivicBundleViews().find(v => v.id === 'bundle_park')!;
  assert.equal(after.donatedValue, cost, 'donatedValue = giá vốn xem trước');
  assert.equal(after.slots.find(s => s.id === 'slot_park_hygiene_1')!.current, 3);
  assert.equal(after.topDonor?.percent, 100, 'một người góp = 100%');

  // Sổ hiện nhờ mục tiêu xóm phố (revealedBundleIds) cũng góp được dù cấp thành phố thấp.
  const low = newSim(1);
  (low as unknown as { _cityProgress: { revealedBundleIds?: string[] } })._cityProgress.revealedBundleIds = ['bundle_park'];
  (low as unknown as { inventory: { productId: string; quantity: number }[] }).inventory.push({ productId: 'nuoc_rua_tay', quantity: 2 });
  assert.equal(low.getCivicBundleViews().find(v => v.id === 'bundle_park')!.status, 'collecting');
  assert.equal(low.donateToBundle('bundle_park', 'slot_park_hygiene_1', 'nuoc_rua_tay', 2, undefined).success, true, 'sổ hiện theo mục tiêu góp được');
  // Giai đoạn 5: mốc nhật ký + bản tin sáng.
  const j = newSim(4);
  const jInv = (j as unknown as { inventory: { productId: string; quantity: number }[] }).inventory;
  jInv.push({ productId: 'nuoc_rua_tay', quantity: 10 }, { productId: 'xa_phong', quantity: 10 }, { productId: 'bim_bim_oishi', quantity: 12 });
  const slots: [string, string, number][] = [['slot_park_hygiene_1', 'nuoc_rua_tay', 10], ['slot_park_hygiene_2', 'xa_phong', 10], ['slot_park_snack', 'bim_bim_oishi', 12]];
  for (const [sl, pid, q] of slots) assert.equal(j.donateToBundle('bundle_park', sl, pid, q, undefined).completedBundleId, undefined, 'chưa đủ → chưa hoàn thành');
  const cashSlot = civicBundleById('bundle_park')!.slots.find(x => x.kind === 'cash')!;
  const done = j.donateToBundle('bundle_park', cashSlot.id, undefined, undefined, cashSlot.amount);
  assert.equal(done.completedBundleId, 'bundle_park', 'góp ô cuối → completedBundleId');
  const doneDay = j.getClock().getTime().day;
  const ms = () => j.getCityProgress().milestones.filter(m => m.type === 'bundle_completed');
  assert.deepEqual(ms().map(m => [m.day, m.bundleId]), [[doneDay, 'bundle_park']], 'đúng 1 mốc góp đủ, đúng ngày');
  const lines = civicJournalLines(j.getCityProgress().milestones, () => 'Công viên');
  assert.equal(lines[0], `Ngày ${doneDay} — Xóm góp đủ sổ Công viên`);
  // Nạp lại save không ghi trùng.
  const reload = new GameSimulation(j.exportSaveData('s', 1), generateStarterTileMap(), new InputManager(), {});
  assert.equal(reload.getCityProgress().milestones.filter(m => m.type === 'bundle_completed').length, 1, 'nạp lại không trùng');
  // Xây xong → mốc khánh thành; bản tin sáng hôm sau có dòng.
  j.setStoreOpen(false);
  let built = false;
  for (let x = 0; x < 70 && !built; x++) for (let y = 0; y < 45 && !built; y++) built = j.openBuilding('park', 'lot-west', x, y).success;
  assert.ok(built, 'xây được công viên');
  const opened = j.getCityProgress().milestones.filter(m => m.type === 'civic_opened');
  assert.equal(opened.length, 1, 'đúng 1 mốc khánh thành');
  assert.equal(opened[0].day, doneDay);
  assert.ok(Number.isFinite(opened[0].qolGain) && (opened[0].qolGain ?? -1) >= 0, 'qolGain hữu hạn, ≥ 0 (0 nếu cửa ngoài bán kính)');
  j.getClock().advanceToNextDay();
  const brief = j.getMorningBrief();
  assert.ok(brief.civicOpenings?.[0]?.includes('mở cửa'), 'bản tin sáng có dòng mở cửa');
  j.getClock().advanceToNextDay();
  assert.equal(j.getMorningBrief().civicOpenings, undefined, 'chỉ hiện đúng ngày hôm sau');
  assert.equal(addCivicMilestoneOnce(j.getCityProgress().milestones, { day: 99, type: 'civic_opened', bundleId: 'bundle_park' }).length, j.getCityProgress().milestones.length, 'replay không thêm mốc trùng');
  // Hai người góp cùng ô: sau resync, lý do phải khớp trạng thái mới (không còn "Máy chủ chưa xác nhận").
  {
    const views = j.getCivicBundleViews();
    assert.equal(reconcileDonateRejection(views, 'bundle_park', 'slot_park_cash'), 'bundle_done', 'trang đã xong → bundle_done');
    assert.equal(reconcileDonateRejection([], 'bundle_park', 'slot_park_cash'), 'retry', 'không thấy trang → retry');
    const fake = [{ id: 'b', status: 'collecting', slots: [{ id: 's1', short: 0 }, { id: 's2', short: 5 }] }] as any;
    assert.equal(reconcileDonateRejection(fake, 'b', 's1'), 'slot_full', 'ô đã đủ → "Ô này vừa được góp đủ."');
    assert.equal(reconcileDonateRejection(fake, 'b', 's2'), 'retry', 'ô còn thiếu → thử lại');
    assert.ok(BUNDLE_REASON_MESSAGES.retry && BUNDLE_REASON_MESSAGES.slot_full, 'có câu tiếng Việt cho slot_full và retry');
  }
  // Người góp: tổng theo người, người góp nhiều nhất, tên hiển thị không lộ uid/email, thành viên đã rời → "Thành viên cũ".
  {
    const state = { slots: { slot_park_cash: 1_000_000 }, contributions: [
      { playerId: 'uid-A', slotId: 'slot_park_cash', qty: 600_000, value: 600_000 },
      { playerId: 'uid-B', slotId: 'slot_park_cash', qty: 300_000, value: 300_000 },
      { playerId: 'uid-A', slotId: 'slot_park_cash', qty: 100_000, value: 100_000 },
    ] } as any;
    const input = { bundleStates: { bundle_park: state }, cityLevel: 4, revealedBundleIds: [] as string[], inventory: [], playerMoney: 0, day: 1, existingBuildings: {} };
    const view = buildCivicBundleViews(input).find(v => v.id === 'bundle_park')!;
    assert.deepEqual(view.donors, [{ playerId: 'uid-A', percent: 70 }, { playerId: 'uid-B', percent: 30 }], 'tổng theo người, giảm dần');
    assert.equal(view.topDonor?.playerId, 'uid-A', 'người góp nhiều nhất');
    const members = { 'uid-A': 'Lan', 'uid-B': 'bob@example.com' };
    assert.equal(donorDisplayName('uid-A', members, 'uid-B'), 'Lan');
    assert.equal(donorDisplayName('uid-B', members, 'uid-B'), 'Bạn', 'chính mình = Bạn');
    assert.equal(donorDisplayName('uid-B', members, 'uid-A'), 'Bạn cùng hẻm', 'tên dạng email không được lộ');
    assert.equal(donorDisplayName('uid-gone', members, 'uid-A'), 'Thành viên cũ', 'đã rời hẻm');
    assert.equal(donorDisplayName('local'), 'Bạn', 'chơi một mình');
    assert.equal(donorDisplayName('uid-X'), 'Thành viên cũ', 'không có danh sách thành viên → không lộ uid');
  }
  console.log('  ✓ civic bundle view PASS');
}
