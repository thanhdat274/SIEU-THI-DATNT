import assert from 'node:assert/strict';
import type { BranchSave, InventoryItem, StockLot } from '@game/shared';
import { DEFAULT_INITIAL_SAVE, MAX_CHAIN_BRANCHES, PRODUCT_MAP, STORE_TYPE_MAP, generateStarterTileMap } from '@game/data';
import { validateSaveGameData } from '@game/shared';
import { InputManager } from './input';
import { summarizeAnnualRevenue } from './tax/annual-revenue';
import { GameSimulation } from './simulation';
import { BACKGROUND_DEMAND_FACTOR, catchUpBranch, runBranchDay } from './branch-ops';
import {
  HUB_ID, branchStockUnits, createChain, normalizeChain, openBranch, returnStock, stockTotals, switchBranch, transferStock,
  type ChainContext,
} from './chain';

const DRINK = STORE_TYPE_MAP.drink_shop;
const lot = (quantity: number, expiresOnDay: number, unitCost: number): StockLot => ({ quantity, expiresOnDay, unitCost, provenance: 'known' });
const warehouse = (): InventoryItem[] => [
  { productId: 'nuoc_suoi', quantity: 50, lots: [lot(20, 10, 3000), lot(30, 40, 3100)] },
  { productId: 'tra_xanh', quantity: 10, lots: [lot(10, 60, 6500)] },
  { productId: nonDrinkId(), quantity: 5, lots: [lot(5, 99, 1000)] },
];
const ctx = (over: Partial<ChainContext> = {}): ChainContext => ({ money: 5_000_000, warehouse: warehouse(), chain: undefined, day: 5, level: 40, ...over });
function mustOk<T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> {
  assert.equal(result.ok, true, JSON.stringify(result));
  return result as Extract<T, { ok: true }>;
}
const nonDrinkId = () => Object.keys(PRODUCT_MAP).find((id) => !(id in DRINK.baseDailyDemand) && !PRODUCT_MAP[id].intermediate)!;

export function runChainTests(): void {
  // Dữ liệu loại hình hợp lệ
  assert.ok(DRINK && STORE_TYPE_MAP['constructor'] === undefined && STORE_TYPE_MAP['__proto__'] === undefined);
  for (const id of Object.keys(DRINK.baseDailyDemand)) assert.ok(PRODUCT_MAP[id] && !PRODUCT_MAP[id].intermediate, `Món quán nước không hợp lệ: ${id}`);

  // Save cũ (không có chain) → chuỗi một cơ sở
  const empty = normalizeChain(undefined);
  assert.deepEqual(empty, createChain());
  assert.equal(empty.activeBranchId, HUB_ID);

  // Mở chi nhánh: trừ tiền một lần, tạo id, danh tiếng khởi điểm
  const opened = mustOk(openBranch(ctx(), 'drink_shop', 'Quán đầu hẻm'));
  assert.equal(opened.money, 5_000_000 - DRINK.openCost);
  assert.equal(opened.chain.branches.length, 1);
  assert.equal(opened.chain.branches[0].id, 'branch-1');
  assert.equal(opened.chain.branches[0].reputation, DRINK.startingReputation);
  assert.equal(opened.chain.nextBranchSeq, 2);

  // Lệnh lặp cùng id: không trừ tiền lần nữa
  const first = mustOk(openBranch(ctx(), 'drink_shop', undefined, 'branch-x'));
  const again = mustOk(openBranch(ctx({ money: first.money, chain: first.chain, warehouse: first.warehouse }), 'drink_shop', undefined, 'branch-x'));
  assert.equal(again.duplicate, true);
  assert.equal(again.money, first.money);
  assert.equal(again.chain.branches.length, 1);

  // Từ chối: thiếu cấp, thiếu tiền, loại lạ, id lạ, vượt giới hạn
  assert.equal(openBranch(ctx({ level: DRINK.unlockLevel - 1 }), 'drink_shop').ok, false);
  assert.equal(openBranch(ctx({ money: DRINK.openCost - 1 }), 'drink_shop').ok, false);
  assert.equal(openBranch(ctx(), 'constructor').ok, false);
  assert.equal(openBranch(ctx(), '__proto__').ok, false);
  assert.equal(openBranch(ctx(), 'drink_shop', undefined, HUB_ID).ok, false);
  let state = ctx({ money: 100_000_000 });
  for (let i = 0; i < DRINK.maxBranches; i++) {
    const r = mustOk(openBranch(state, 'drink_shop'));
    state = { ...state, money: r.money, chain: r.chain };
  }
  assert.equal(state.chain!.branches.length, Math.min(DRINK.maxBranches, MAX_CHAIN_BRANCHES));
  assert.equal(openBranch(state, 'drink_shop').ok, false, 'Quá giới hạn chi nhánh');
  assert.equal(new Set(state.chain!.branches.map((b) => b.id)).size, state.chain!.branches.length, 'Id chi nhánh không trùng');

  // Chuyển điều khiển
  assert.equal(switchBranch(state, 'nope').ok, false);
  assert.equal(mustOk(switchBranch(state, 'branch-2')).chain.activeBranchId, 'branch-2');
  assert.equal(mustOk(switchBranch(state, HUB_ID)).chain.activeBranchId, HUB_ID);

  // Chuẩn hóa chain bẩn
  const dirty = normalizeChain({
    branches: [
      { ...opened.chain.branches[0] },
      { ...opened.chain.branches[0] }, // trùng id
      { ...opened.chain.branches[0], id: 'b-lạ', storeType: 'nope' },
      { ...opened.chain.branches[0], id: HUB_ID },
    ],
    activeBranchId: 'không-có', nextBranchSeq: -3,
  });
  assert.equal(dirty.branches.length, 1);
  assert.equal(dirty.activeBranchId, HUB_ID);
  assert.ok(dirty.nextBranchSeq >= 2);

  // Chuyển kho: bảo toàn đơn vị + giá trị, FEFO, giữ lô/hạn/giá vốn
  const base = ctx({ chain: opened.chain, money: opened.money });
  const before = stockTotals(base.warehouse, base.day);
  const moved = mustOk(transferStock(base, 'branch-1', [{ productId: 'nuoc_suoi', quantity: 25 }, { productId: 'tra_xanh', quantity: 4 }]));
  const branchAfter = moved.chain.branches[0];
  const sumAfter = stockTotals(moved.warehouse, base.day).units + stockTotals(branchAfter.stock, base.day).units;
  assert.equal(sumAfter, before.units, 'Bảo toàn đơn vị');
  const valueAfter = stockTotals(moved.warehouse, base.day).value + stockTotals(branchAfter.stock, base.day).value;
  assert.equal(valueAfter, before.value, 'Bảo toàn giá trị vốn');
  const lots = branchAfter.stock.find((i) => i.productId === 'nuoc_suoi')!.lots!;
  assert.deepEqual(lots.map((l) => [l.quantity, l.expiresOnDay, l.unitCost]), [[20, 10, 3000], [5, 40, 3100]], 'FEFO: lô hạn sớm đi trước');
  assert.equal(moved.warehouse.find((i) => i.productId === 'nuoc_suoi')!.quantity, 25);
  assert.equal(moved.money, base.money, 'Chuyển kho không đổi ví');
  // Đầu vào không bị sửa
  assert.equal(base.warehouse.find((i) => i.productId === 'nuoc_suoi')!.quantity, 50);

  // Từ chối và không đổi gì: thiếu hàng, món ngoài loại hình, số lượng xấu, chi nhánh lạ, vượt sức chứa
  const snapshot = JSON.stringify(base);
  for (const bad of [
    [{ productId: 'nuoc_suoi', quantity: 51 }],
    [{ productId: nonDrinkId(), quantity: 1 }],
    [{ productId: 'nuoc_suoi', quantity: 0 }],
    [{ productId: 'nuoc_suoi', quantity: -1 }],
    [{ productId: 'nuoc_suoi', quantity: 1.5 }],
    [{ productId: 'nuoc_suoi', quantity: Number.NaN }],
    [{ productId: 'constructor', quantity: 1 }],
    [],
    [{ productId: 'nuoc_suoi', quantity: 30 }, { productId: 'nuoc_suoi', quantity: 30 }], // gộp = 60 > 50
  ]) assert.equal(transferStock(base, 'branch-1', bad).ok, false, JSON.stringify(bad));
  assert.equal(transferStock(base, 'branch-9', [{ productId: 'nuoc_suoi', quantity: 1 }]).ok, false);
  assert.equal(JSON.stringify(base), snapshot, 'Từ chối không làm đổi đầu vào');
  const tiny = ctx({ chain: opened.chain, warehouse: [{ productId: 'nuoc_suoi', quantity: DRINK.stockCapacity + 5, lots: [lot(DRINK.stockCapacity + 5, 99, 3000)] }] });
  assert.equal(transferStock(tiny, 'branch-1', [{ productId: 'nuoc_suoi', quantity: DRINK.stockCapacity + 1 }]).ok, false, 'Vượt sức chứa');
  // Một phần hợp lệ + một phần sai = từ chối toàn bộ (tất cả hoặc không)
  assert.equal(transferStock(base, 'branch-1', [{ productId: 'nuoc_suoi', quantity: 5 }, { productId: 'tra_xanh', quantity: 99 }]).ok, false);

  // Trả kho: ngược chiều, vẫn bảo toàn
  const back = mustOk(returnStock({ ...base, warehouse: moved.warehouse, chain: moved.chain }, 'branch-1', [{ productId: 'nuoc_suoi', quantity: 25 }]));
  assert.equal(stockTotals(back.warehouse, base.day).units, before.units - 4, 'Còn 4 tra_xanh ở chi nhánh');
  assert.equal(back.chain.branches[0].stock.some((i) => i.productId === 'nuoc_suoi'), false, 'Hết hàng thì bỏ khỏi mảng');
  assert.equal(returnStock({ ...base, warehouse: moved.warehouse, chain: moved.chain }, 'branch-1', [{ productId: 'nuoc_suoi', quantity: 26 }]).ok, false);

  // ===== Chạy nền =====
  const stocked = mustOk(transferStock(base, 'branch-1', [
    { productId: 'nuoc_suoi', quantity: 50 }, { productId: 'tra_xanh', quantity: 10 },
  ])).chain.branches[0];
  const opts = { branch: stocked, day: 6, money: 1_000_000 };
  const a = runBranchDay(opts);
  const b = runBranchDay(opts);
  assert.deepEqual(a, b, 'Xác định theo (chi nhánh, ngày)');
  assert.ok(!a.skipped && a.report);
  assert.ok(a.report!.revenue > 0 && a.report!.unitsSold > 0);
  assert.equal(a.branch.lastBackgroundDay, 6);
  assert.equal(stocked.lastBackgroundDay, base.day, 'Đầu vào không bị sửa');
  assert.equal(a.moneyDelta, a.report!.revenue - a.report!.wages);
  // Không bán quá tồn và không quá cầu tối đa
  const soldCap = Object.values(DRINK.baseDailyDemand).reduce((s, v) => s + Math.ceil(v * 1.5 * 1.25 * BACKGROUND_DEMAND_FACTOR * 1.1) + 1, 0);
  assert.ok(a.report!.unitsSold <= soldCap && a.report!.unitsSold <= branchStockUnits(stocked));
  assert.equal(branchStockUnits(a.branch), branchStockUnits(stocked) - a.report!.unitsSold - 0, 'Tồn giảm đúng số bán (không hết hạn trong ngày này)');
  // Idempotent: chạy lại cùng ngày / ngày cũ là no-op
  for (const day of [6, 5, 1]) {
    const r = runBranchDay({ branch: a.branch, day, money: 1_000_000 });
    assert.equal(r.skipped, true);
    assert.equal(r.moneyDelta, 0);
    assert.deepEqual(r.branch, a.branch);
  }
  // Hết hàng ghi bán hụt, không bán gì, không tiền vào
  const bare = runBranchDay({ branch: { ...stocked, stock: [] }, day: 6, money: 1_000_000 });
  assert.equal(bare.report!.unitsSold, 0);
  assert.equal(bare.report!.revenue, 0);
  assert.ok(bare.report!.stockouts.length > 0);
  assert.equal(bare.moneyDelta, -DRINK.staffWagePerDay);
  // Ví không âm: không có tiền thì không trả lương
  const broke = runBranchDay({ branch: { ...stocked, stock: [] }, day: 6, money: 0 });
  assert.equal(broke.report!.wages, 0);
  assert.equal(broke.moneyDelta, 0);
  const partial = runBranchDay({ branch: { ...stocked, stock: [] }, day: 6, money: 50_000 });
  assert.equal(partial.report!.wages, 50_000);
  // Hết hạn: lô quá hạn bị loại và ghi hao hụt theo giá vốn
  const expiring = { ...stocked, stock: [{ productId: 'sua_tuoi', quantity: 10, lots: [lot(10, 6, 8500)] }] };
  const exp = runBranchDay({ branch: expiring, day: 6, money: 1_000_000 });
  assert.equal(exp.report!.spoilageLoss, 85_000);
  assert.equal(exp.report!.unitsSold, 0);
  assert.equal(branchStockUnits(exp.branch), 0);
  // Giá vốn bán theo lô FEFO
  const fifo = runBranchDay({ branch: { ...stocked, stock: [{ productId: 'nuoc_suoi', quantity: 3, lots: [lot(3, 99, 2000)] }] }, day: 6, money: 1_000_000 });
  assert.equal(fifo.report!.cogs, fifo.report!.unitsSold * 2000);
  // Bắt kịp nhiều ngày: bằng chạy từng ngày, ví không âm, báo cáo bị cắt đúng giới hạn
  const stockedMany: BranchSave = { ...stocked, stock: [{ productId: 'nuoc_suoi', quantity: 380, lots: [lot(380, 9999, 3000)] }] };
  const caught = catchUpBranch(stockedMany, 45, 0, 7);
  assert.equal(caught.branch.lastBackgroundDay, 45);
  assert.equal(caught.reports.length, 45 - stockedMany.lastBackgroundDay);
  assert.ok(caught.branch.reports.length <= 30);
  let step: BranchSave = stockedMany, wallet = 0;
  for (let day = stockedMany.lastBackgroundDay + 1; day <= 45; day++) {
    const r = runBranchDay({ branch: step, day, money: wallet, seed: 7 });
    step = r.branch; wallet += r.moneyDelta;
    assert.ok(wallet >= 0, 'Ví không âm');
  }
  assert.deepEqual(step, caught.branch);
  assert.equal(wallet, caught.moneyDelta);
  assert.equal(catchUpBranch(caught.branch, 45, 0, 7).reports.length, 0, 'Bắt kịp lần hai không tính trùng');
  // Qua lưu/nạp (JSON) vẫn cho kết quả giống
  const reloaded = JSON.parse(JSON.stringify(a.branch));
  assert.deepEqual(runBranchDay({ branch: reloaded, day: 7, money: 1_000_000 }), runBranchDay({ branch: a.branch, day: 7, money: 1_000_000 }));
  // Hạt giống khác → kết quả có thể khác nhưng vẫn hợp lệ
  assert.ok(runBranchDay({ ...opts, seed: 123 }).report!.revenue >= 0);
}

function newSim(chain?: unknown): GameSimulation {
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  if (chain !== undefined) (save as { chain?: unknown }).chain = chain;
  return new GameSimulation(save, generateStarterTileMap(), new InputManager(), {});
}

/** Lưu/nạp chuỗi qua `GameSimulation` + validator save. */
export function runChainSaveTests(): void {
  // Save không có chain: chuỗi một cơ sở, export không thêm khóa chain
  const plain = newSim();
  assert.deepEqual(plain.getChain(), createChain());
  assert.equal('chain' in plain.exportSaveData('chain-plain', 1), false);

  // Có chi nhánh: export → validate → import → export giống hệt
  const opened = mustOk(openBranch(ctx(), 'drink_shop', 'Quán A'));
  const stocked = mustOk(transferStock({ ...ctx(), chain: opened.chain, money: opened.money }, 'branch-1', [{ productId: 'nuoc_suoi', quantity: 10 }]));
  const sim = newSim(stocked.chain);
  const exported = sim.exportSaveData('chain-1', 1);
  assert.equal(validateSaveGameData(JSON.parse(JSON.stringify(exported))).valid, true);
  assert.deepEqual(exported.chain, stocked.chain);
  const other = newSim();
  other.importSaveData(JSON.parse(JSON.stringify(exported)));
  assert.deepEqual(other.exportSaveData('chain-1', 1).chain, exported.chain);

  // Chain bẩn: validator từ chối sai hình dạng; chuẩn hóa làm sạch nội dung xấu mà không sập
  const base = JSON.parse(JSON.stringify(exported));
  for (const bad of ['x', 5, [], { branches: 'no', activeBranchId: 'hub' }, { branches: [], activeBranchId: 3 }, { branches: [null], activeBranchId: 'hub' }, { branches: Array.from({ length: 11 }, (_, i) => ({ id: `b${i}`, storeType: 'drink_shop' })), activeBranchId: 'hub' }]) {
    assert.equal(validateSaveGameData({ ...base, chain: bad }).valid, false, JSON.stringify(bad));
  }
  const hostile = {
    activeBranchId: 'ghost', nextBranchSeq: 'x',
    branches: [{
      id: 'branch-1', storeType: 'drink_shop', name: 5, openedDay: 'a', reputation: 9999, lastBackgroundDay: null, totalRevenue: -5,
      stock: [null, { productId: 'constructor', quantity: 5 }, { productId: 'nuoc_suoi', quantity: -3 }, { productId: 'nuoc_suoi', quantity: 4, lots: 'bad' }, { productId: nonDrinkId(), quantity: 9 }],
      reports: [null, { day: 'x' }, { day: 2, revenue: 'z', stockouts: [1, 'nuoc_suoi'] }],
    }],
  };
  const dirtyChain = (hostile as unknown) as Parameters<typeof normalizeChain>[0];
  assert.equal(validateSaveGameData({ ...base, chain: hostile }).valid, true);
  const cleaned = newSim(hostile).getChain();
  assert.equal(cleaned.activeBranchId, HUB_ID);
  const b = cleaned.branches[0];
  assert.equal(b.reputation, 100);
  assert.equal(b.totalRevenue, 0);
  assert.equal(b.name, STORE_TYPE_MAP.drink_shop.name);
  assert.deepEqual(b.stock.map((i) => [i.productId, i.quantity]), [['nuoc_suoi', 4]]);
  assert.deepEqual(b.reports.map((r) => [r.day, r.revenue, r.stockouts]), [[2, 0, ['nuoc_suoi']]]);
  assert.ok(cleaned.nextBranchSeq >= 2);
  assert.deepEqual(normalizeChain(dirtyChain), cleaned, 'Chuẩn hóa idempotent giữa các lần');
  assert.deepEqual(normalizeChain(cleaned), cleaned);
}

/** Chuỗi nối vào `GameSimulation`: ví chung, kho tổng, sổ cái `branchId`, qua ngày, lưu/nạp. */
export function runChainSimulationTests(): void {
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.player.level = 35; save.player.money = 5_000_000;
  save.inventory = [
    { productId: 'nuoc_suoi', quantity: 80, lots: [lot(80, 9999, 3000)] },
    { productId: 'tra_xanh', quantity: 30, lots: [lot(30, 9999, 6500)] },
  ];
  const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager(), {});
  const startMoney = sim.getPlayerData().money;

  // Thiếu cấp bị từ chối, không đổi tiền
  const low = structuredClone(save); low.player.level = 5;
  const lowSim = new GameSimulation(low, generateStarterTileMap(), new InputManager(), {});
  assert.equal(lowSim.openBranch('drink_shop').success, false);
  assert.equal(lowSim.getPlayerData().money, startMoney);

  const opened = sim.openBranch('drink_shop', 'Quán nước A', 'branch-1');
  assert.equal(opened.success, true);
  assert.equal(opened.branchId, 'branch-1');
  assert.equal(sim.getPlayerData().money, startMoney - DRINK.openCost);
  assert.equal(sim.openBranch('drink_shop', 'Quán nước A', 'branch-1').success, true, 'Lệnh lặp cùng id');
  assert.equal(sim.getPlayerData().money, startMoney - DRINK.openCost, 'Lệnh lặp không trừ tiền lần nữa');
  assert.equal(sim.getChain().branches.length, 1);

  // Chuyển kho: hub giảm, chi nhánh tăng; sai thì không đổi gì
  assert.equal(sim.transferToBranch('branch-1', [{ productId: 'nuoc_suoi', quantity: 500 }]).success, false);
  assert.equal(sim.getInventory().find((i) => i.productId === 'nuoc_suoi')!.quantity, 80);
  assert.equal(sim.transferToBranch('branch-1', [{ productId: 'nuoc_suoi', quantity: 60 }, { productId: 'tra_xanh', quantity: 20 }]).success, true);
  assert.equal(sim.getInventory().find((i) => i.productId === 'nuoc_suoi')!.quantity, 20);
  assert.equal(sim.getChain().branches[0].stock.find((i) => i.productId === 'nuoc_suoi')!.quantity, 60);
  assert.equal(sim.returnFromBranch('branch-1', [{ productId: 'nuoc_suoi', quantity: 999 }]).success, false);
  assert.equal(sim.returnFromBranch('branch-1', [{ productId: 'tra_xanh', quantity: 5 }]).success, true);
  assert.equal(sim.switchBranch('nope').success, false);
  assert.equal(sim.switchBranch('branch-1').success, true);

  // Qua ngày: chạy nền ghi vào ví, thống kê, bản ghi ngày, sổ cái có branchId
  // Chi nhánh mở giữa ngày không bán trong chính ngày đó: lần qua ngày đầu tiên là no-op cho chi nhánh
  const openDay = sim.getTime().day;
  const firstLedger = sim.getLedger().length;
  sim.getClock().advanceToNextDay();
  assert.equal(sim.getLedger().slice(firstLedger).some((e) => e.branchId === 'branch-1'), false);
  assert.equal(sim.getChain().branches[0].lastBackgroundDay, openDay);
  const day = sim.getTime().day;
  const moneyBefore = sim.getPlayerData().money;
  const revenueBefore = sim.getStatistics().totalRevenue;
  const ledgerBefore = sim.getLedger().length;
  sim.getClock().advanceToNextDay();
  const entries = sim.getLedger().slice(ledgerBefore).filter((e) => e.branchId === 'branch-1');
  assert.ok(entries.some((e) => e.type === 'sale'), 'Có dòng bán của chi nhánh');
  const branch = sim.getChain().branches[0];
  assert.equal(branch.lastBackgroundDay, day);
  assert.equal(branch.reports.length, 1);
  const sales = entries.filter((e) => e.type === 'sale').reduce((s, e) => s + e.amount, 0);
  const wages = entries.filter((e) => e.type === 'wage').reduce((s, e) => s + e.amount, 0);
  const otherEntries = sim.getLedger().slice(ledgerBefore).filter((e) => e.branchId !== 'branch-1');
  const hubDelta = otherEntries.reduce((s, e) => s + (e.type === 'sale' || e.type === 'recovery' ? e.amount : e.type === 'spoilage' || e.type === 'theft' ? 0 : -e.amount), 0);
  assert.equal(sim.getPlayerData().money - moneyBefore - hubDelta, sales - wages, 'Δví = doanh thu chi nhánh − lương (khớp sổ cái)');
  assert.equal(sim.getStatistics().totalRevenue - revenueBefore, sales);
  const dayRecord = sim.getDailyRecords()[day];
  assert.ok(dayRecord && dayRecord.revenue >= sales && dayRecord.wagesPaid >= wages, 'Bản ghi ngày hub gồm doanh thu/lương chi nhánh (nền cho thuế tổng chuỗi)');
  assert.equal(summarizeAnnualRevenue(sim.getDailyRecords(), day + 1).revenue >= sales, true, 'Doanh thu năm tính cả chi nhánh');
  assert.equal(branch.totalRevenue, sales);
  assert.ok(sim.getPlayerData().money >= 0);

  // Lưu/nạp giữa chừng không tính trùng cùng ngày
  const reloaded = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), generateStarterTileMap(), new InputManager(), {});
  reloaded.importSaveData(JSON.parse(JSON.stringify(sim.exportSaveData('chain-sim', 1))));
  assert.deepEqual(reloaded.getChain(), sim.getChain());
  const reloadedLedger = reloaded.getLedger().length;
  reloaded.getClock().advanceToNextDay();
  const nextEntries = reloaded.getLedger().slice(reloadedLedger).filter((e) => e.branchId === 'branch-1');
  assert.equal(reloaded.getChain().branches[0].lastBackgroundDay, day + 1);
  assert.equal(reloaded.getChain().branches[0].reports.filter((r) => r.day === day).length, 1, 'Mỗi ngày một báo cáo');
  assert.ok(nextEntries.length === 0 || nextEntries.every((e) => e.day === day + 1), 'Ngày cũ không bị tính lại');
}
