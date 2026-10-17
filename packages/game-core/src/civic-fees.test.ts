import assert from 'node:assert/strict';
import {
  CIVIC_DEFS,
  OWNED_TILE_FEE,
  CIVIC_FEE_QOL_DISCOUNT,
  civicFeeForOwnedParcel,
  civicDefOf,
  validateCivicDefs,
  DEFAULT_INITIAL_SAVE,
  generateStarterTileMap,
  rectWidth,
  rectHeight,
  resolveParcel,
  ALL_PARCELS,
  LAND_LEASE_CONSTANTS,
} from '@game/data';
import { validateSaveGameData, type SaveGameData, type LedgerEntry } from '@game/shared';
import { GameSimulation } from './simulation';
import { InputManager } from './input';
import { hashSimulationState } from './replay';
import { computeCivicQol } from './civic-qol';
import { computeNetProfit } from './ledger';

/**
 * Test phí xóm + duy trì công trình (OpenSpec `civic-local-fees`, tasks 1.1–1.4).
 * Sang ngày bằng ĐÚNG đường chốt ngày của đồng hồ (`getClock().advanceToNextDay()`), không dùng setTime + update.
 */

/** Sim mới: cấp/tiền đủ xây công trình, cửa hàng đóng (chỉ W0). */
function newSim(money = 80_000_000): GameSimulation {
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.player.level = 80;
  save.player.money = money;
  save.worldTime.isStoreOpen = false;
  return new GameSimulation(save, generateStarterTileMap(), new InputManager(), {});
}

const moneyOf = (sim: GameSimulation): number => sim.getPlayerData().money;
const advance = (sim: GameSimulation, n = 1): void => { for (let i = 0; i < n; i++) sim.getClock().advanceToNextDay(); };
const ledgerOf = (sim: GameSimulation, type: LedgerEntry['type']): LedgerEntry[] => sim.getLedger().filter(e => e.type === type);
const tenureOf = (sim: GameSimulation, parcelId: string): { debtDays?: number; civicDebt?: number; civicDebtDays?: number } =>
  (sim as unknown as { parcelTenure: Record<string, { debtDays?: number; civicDebt?: number; civicDebtDays?: number }> }).parcelTenure[parcelId];

/** Phí xóm đúng công thức cho một lô (QoL lấy theo `getCivicQol`). */
function expectedFee(sim: GameSimulation, parcelId: string): number {
  const parcel = resolveParcel(parcelId)!;
  const qol = sim.getCivicQol()[parcel.districtId] ?? 0;
  return civicFeeForOwnedParcel(rectWidth(parcel.rect) * rectHeight(parcel.rect), qol);
}

function runConstTests(): void {
  console.log('\n--- Phí xóm: hằng số + công thức ---');
  assert.ok(Number.isSafeInteger(OWNED_TILE_FEE) && OWNED_TILE_FEE > 0, `OWNED_TILE_FEE nguyên dương (${OWNED_TILE_FEE})`);
  assert.ok(CIVIC_FEE_QOL_DISCOUNT > 0 && CIVIC_FEE_QOL_DISCOUNT <= 1, 'Hệ số giảm QoL trong (0, 1]');
  assert.ok(validateCivicDefs().valid, `validateCivicDefs hợp lệ: ${validateCivicDefs().errors.join(', ')}`);
  for (const def of CIVIC_DEFS) {
    assert.ok(Number.isSafeInteger(def.upkeepPerDay) && def.upkeepPerDay > 0, `${def.buildingTypeId}: upkeep nguyên dương (${def.upkeepPerDay})`);
  }

  // Làm tròn nghìn; QoL cao → phí thấp; khớp công thức gốc.
  assert.equal(civicFeeForOwnedParcel(0, 50), 0, 'Không ô → 0');
  assert.equal(civicFeeForOwnedParcel(100, 0), 2_000, '100 ô, QoL 0 → 2.000 ₫');
  assert.equal(civicFeeForOwnedParcel(100, 100), 1_400, '100 ô, QoL 100 → giảm 30% → 1.400 ₫');
  const mid = civicFeeForOwnedParcel(100, 50);
  assert.equal(mid, Math.round(OWNED_TILE_FEE * 100 * (1 - CIVIC_FEE_QOL_DISCOUNT * 0.5) / 100) * 100, 'Khớp công thức (làm tròn 100 ₫)');
  assert.ok(civicFeeForOwnedParcel(100, 80) < civicFeeForOwnedParcel(100, 20), 'QoL 80 rẻ hơn QoL 20');
  assert.equal(civicFeeForOwnedParcel(-5, 50), 0, 'Số ô âm → 0');
  assert.equal(civicFeeForOwnedParcel(100, Number.NaN), civicFeeForOwnedParcel(100, 0), 'QoL NaN coi như 0');
  console.log('  ✓ hằng số + công thức PASS');
}

function runDeductionTests(): void {
  console.log('\n--- Phí xóm: trừ đầu ngày, thứ tự, ledger, netProfit ---');

  // 1. Thứ tự cố định: thuê lô → duy trì công trình → phí xóm; số tiền trừ = tổng ba khoản.
  const sim = newSim();
  // Lô W1 chỉ thuê được khi đợt W1 đã mở.
  sim.reclaimWave('w1');
  (sim as unknown as { finishReclaimedWaves(day: number): void }).finishReclaimedWaves(sim.getTime().day + 2);
  assert.ok(sim.leaseParcel('w1-corner').success, 'Thuê lô w1-corner');
  assert.ok(sim.openBuilding('park', 'lot-east-1', 21, 5).success, 'Xây công viên ở lô W0 cạnh tiệm chính');
  const parkUpkeep = civicDefOf('park')!.upkeepPerDay;
  const day = 1;
  const before = moneyOf(sim);
  sim.collectDailyRent(day);
  sim.collectDailyCivicCosts(day);
  const record = sim.getCurrentDayRecord();
  const feeSum = Object.values(sim.getCivicDailyReport().feeByParcel).reduce((a, b) => a + b, 0);
  assert.equal(record.civicUpkeep, parkUpkeep, `civicUpkeep = Σ upkeep (${parkUpkeep})`);
  assert.equal(record.civicFee, feeSum, `civicFee = Σ phí các lô sở hữu (${feeSum})`);
  assert.equal(before - moneyOf(sim), (record.rentCost ?? 0) + parkUpkeep + feeSum, 'Tiền trừ đúng tổng thuê + duy trì + phí');
  assert.ok(feeSum > 0, 'Có thu phí xóm cho lô sở hữu');
  assert.ok(!(sim.getCivicDailyReport().feeByParcel['w1-corner']), 'Lô THUÊ không bị thu phí xóm');

  const dayLedger = sim.getLedger().filter(e => e.day === day);
  const types = dayLedger.map(e => e.type);
  const lastRent = types.lastIndexOf('rent'), firstUpkeep = types.indexOf('civic_upkeep'), lastUpkeep = types.lastIndexOf('civic_upkeep'), firstFee = types.indexOf('civic_fee');
  assert.ok(lastRent >= 0 && firstUpkeep > lastRent, `Thuê lô trước duy trì ([${types.join(', ')}])`);
  assert.ok(firstFee > lastUpkeep, `Duy trì trước phí xóm ([${types.join(', ')}])`);

  // 2. Mỗi công trình một dòng `civic_upkeep` có `buildingInstanceId`.
  const upkeepRows = dayLedger.filter(e => e.type === 'civic_upkeep');
  assert.equal(upkeepRows.length, 1, 'Một công trình → một dòng civic_upkeep');
  assert.equal(upkeepRows[0].buildingInstanceId, 'park-1', 'Dòng duy trì gắn buildingInstanceId');

  // 3. Phí xóm khớp công thức theo TỪNG lô (QoL khu của lô đó).
  const feeRows = dayLedger.filter(e => e.type === 'civic_fee');
  assert.equal(feeRows.length, Object.keys(sim.getCivicDailyReport().feeByParcel).length, 'Mỗi lô sở hữu có phí > 0 một dòng');
  for (const row of feeRows) {
    const parcelId = Object.keys(sim.getCivicDailyReport().feeByParcel).find(id => row.description.includes(id))!;
    assert.equal(row.amount, expectedFee(sim, parcelId), `Phí lô ${parcelId} khớp công thức`);
    assert.ok(!row.buildingInstanceId || row.buildingInstanceId === 'main' || !!sim.getBuildingPlacements()?.some(p => p.buildingId === row.buildingInstanceId), 'buildingInstanceId (nếu có) là tòa có thật');
  }

  // 4. netProfit trừ ĐỦ cả rent + duy trì + phí.
  assert.equal(record.netProfit, computeNetProfit(record), 'netProfit = computeNetProfit(record)');
  assert.equal(
    computeNetProfit(record),
    record.grossProfit - record.spoilageCost - record.wagesPaid - (record.maintenanceCost ?? 0) - (record.equipmentCost ?? 0)
      - (record.rentCost ?? 0) - (record.civicUpkeep ?? 0) - (record.civicFee ?? 0),
    'netProfit trừ cả duy trì và phí xóm',
  );
  assert.ok(record.netProfit < record.grossProfit, 'Lãi ròng giảm vì chi phí xóm');

  // 5. QoL cao → phí xóm giảm: cùng số ô sở hữu, so lô ở khu có QoL khác nhau qua công thức thuần.
  const withPark = sim.getCivicQol();
  const withoutPark = computeCivicQol([], ALL_PARCELS);
  assert.ok(withPark.hem_dan_cu > withoutPark.hem_dan_cu, `Có công viên → QoL cao hơn (${withPark.hem_dan_cu} > ${withoutPark.hem_dan_cu})`);
  const tiles = rectWidth(resolveParcel('lot-center')!.rect) * rectHeight(resolveParcel('lot-center')!.rect);
  assert.ok(
    civicFeeForOwnedParcel(tiles, 80) < civicFeeForOwnedParcel(tiles, withoutPark.hem_dan_cu),
    'Cùng số ô: QoL 80 → phí xóm thấp hơn QoL 20 (một công viên chỉ +~8 QoL, giảm < 50 ₫ nên có thể bị làm tròn mất)',
  );

  // 6. Idempotent: gọi lại cùng ngày không trừ thêm.
  const after = moneyOf(sim);
  sim.collectDailyCivicCosts(day);
  assert.equal(moneyOf(sim), after, 'Gọi lại cùng ngày không trừ thêm');
  console.log('  ✓ trừ đầu ngày + ledger + netProfit PASS');
}

function runLeasedOnlyTests(): void {
  console.log('\n--- Phí xóm: chỉ lô sở hữu (lô thuê không bị thu) ---');
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.player.level = 80;
  save.player.money = 5_000_000;
  // Lô W0 coi như KHÔNG sở hữu: chỉ còn lô thuê w1-corner.
  save.storeLayout.ownedParcelIds = [];
  save.storeLayout.parcelTenure = { 'w1-corner': { kind: 'leased', day: 1, paidTotal: 0, debtDays: 0 } };
  const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager(), {});
  const before = moneyOf(sim);
  sim.collectDailyCivicCosts(2);
  assert.equal(moneyOf(sim), before, 'Chỉ có lô thuê → không trừ phí xóm');
  assert.equal(sim.getCurrentDayRecord().civicFee ?? 0, 0, 'civicFee = 0 khi chỉ có lô thuê');
  assert.equal(ledgerOf(sim, 'civic_fee').length, 0, 'Không có dòng civic_fee');
  assert.equal(sim.getCivicDailyReport().totalFee, 0, 'Báo cáo phí = 0');

  // Thuê vẫn thu như cũ (không bị phí xóm thay thế).
  sim.collectDailyRent(2);
  assert.ok(moneyOf(sim) < before, 'Tiền thuê lô vẫn bị thu như cũ');
  assert.ok((sim.getCurrentDayRecord().rentCost ?? 0) > 0, 'rentCost > 0');
  console.log('  ✓ lô thuê không bị thu phí PASS');
}

function runDebtTests(): void {
  console.log('\n--- Phí xóm: thiếu tiền → nợ civicDebt/civicDebtDays riêng ---');
  const sim = newSim();
  assert.ok(sim.openBuilding('park', 'lot-east-1', 21, 5).success, 'Xây công viên khi còn tiền (mở trước)');
  const report = sim.getCivicDailyReport();
  // lot-east-1 trượt 2 khoản/ngày: duy trì công viên + phí lô.
  const perDay = (report.upkeepByParcel['lot-east-1'] ?? 0) + (report.feeByParcel['lot-east-1'] ?? 0);
  assert.ok((report.upkeepByParcel['lot-east-1'] ?? 0) > 0 && (report.feeByParcel['lot-east-1'] ?? 0) > 0, 'Lô có cả duy trì lẫn phí');
  const setMoney = (m: number) => { (sim as unknown as { playerData: { money: number } }).playerData.money = m; };
  setMoney(0);
  advance(sim, 1);
  const tenure = tenureOf(sim, 'lot-east-1');
  assert.equal(tenure.civicDebt, perDay, `Nợ đúng bằng tổng khoản trượt, không cộng 2 lần (${tenure.civicDebt} = ${perDay})`);
  assert.equal(tenure.civicDebtDays, 1, 'Trượt 2 khoản cùng ngày → civicDebtDays chỉ +1');
  assert.equal(tenure.debtDays ?? 0, 0, 'debtDays (tiền thuê) không đổi');
  assert.equal(moneyOf(sim), 0, 'Thiếu tiền: không trừ tiền (đi nợ)');
  assert.equal(ledgerOf(sim, 'civic_upkeep').length, 0, 'Khoản chưa trả không ghi ledger');
  assert.equal(sim.getCurrentDayRecord().civicFee ?? 0, 0, 'Khoản chưa trả không vào civicFee của ngày');

  advance(sim, 2);
  assert.equal(tenure.civicDebtDays, 3, 'civicDebtDays = 3 sau 3 ngày');
  assert.equal(tenure.civicDebt, perDay * 3, 'Nợ = 3 ngày phí');
  assert.ok(!(sim.getBuildingPlacements() ?? []).some(p => p.closedForRent), 'Nợ phí xóm KHÔNG đóng cửa tòa nào (tránh kẹt tiệm chính)');

  // Ngày trả đủ → giảm 1 ngày nợ (giống luật thuê lô); tiền nợ cũ giữ nguyên tới khi trả.
  setMoney(10_000_000);
  advance(sim, 1);
  assert.equal(tenure.civicDebtDays, 2, 'Trả đủ hôm nay → civicDebtDays giảm 1');
  assert.equal(tenure.civicDebt, perDay * 3, 'Tiền nợ cũ chưa tự trừ');

  // Trả nợ bằng lệnh cũ `payRentDebt`: lô sở hữu không bị tính tiền thuê, trả đúng số nợ.
  const pay = sim.payRentDebt('lot-east-1');
  assert.ok(pay.success, `payRentDebt trả được nợ phí (${pay.reason ?? 'ok'})`);
  assert.equal(pay.amount, perDay * 3, 'Số trả đúng bằng nợ phí (không cộng tiền thuê cho lô sở hữu)');
  assert.equal(tenureOf(sim, 'lot-east-1')?.civicDebt, 0, 'Xóa nợ phí sau khi trả');
  assert.equal(tenureOf(sim, 'lot-east-1')?.civicDebtDays, 0, 'Xóa civicDebtDays sau khi trả');
  console.log('  ✓ nợ riêng biệt PASS');
}

function runSaveTests(): void {
  console.log('\n--- Phí xóm: save cũ (schema 10, 11) vẫn nạp được; cùng save + N ngày → cùng hash ---');

  // Save hiện tại KHÔNG tăng schema (11) và không cần trường mới.
  const sim = newSim();
  sim.openBuilding('park', 'lot-east-1', 21, 5);
  const exported = sim.exportSaveData();
  assert.equal(exported.schemaVersion, 11, 'Schema vẫn là 11 (không thêm trường save)');
  assert.equal(validateSaveGameData(exported).valid, true, 'Save hiện tại hợp lệ');

  for (const version of [10, 11] as const) {
    const old = structuredClone(exported) as SaveGameData;
    old.schemaVersion = version;
    delete (old as { civic?: unknown }).civic;
    // Save cũ: chưa từng có `civicUpkeep`/`civicFee` trong bản ghi ngày.
    for (const record of Object.values(old.dailyRecords ?? {})) {
      delete (record as { civicUpkeep?: number }).civicUpkeep;
      delete (record as { civicFee?: number }).civicFee;
    }
    // Bỏ luôn `civicDebt` (trường mới thêm trong tenure) để mô phỏng save trước Bước 3.
    for (const tenure of Object.values(old.storeLayout.parcelTenure ?? {})) delete (tenure as { civicDebt?: number }).civicDebt;
    const validated = validateSaveGameData(old);
    assert.ok(validated.valid && validated.data, `Save schema ${version} nạp được (${validated.versionStatus})`);
    assert.equal(validated.data!.schemaVersion, 11, `Migrate schema ${version} → 11`);
    const loaded = new GameSimulation(validated.data!, generateStarterTileMap(), new InputManager(), {});
    const before = moneyOf(loaded);
    advance(loaded, 1);
    assert.ok(moneyOf(loaded) < before, `Save schema ${version}: đầu ngày vẫn trừ chi phí xóm`);
    assert.ok((loaded.getCurrentDayRecord().civicFee ?? 0) > 0, `Save schema ${version}: civicFee được ghi`);
  }

  // Hai sim cùng save + N ngày → cùng hashSimulationState (tất định, server chạy cùng mã).
  const twinA = new GameSimulation(structuredClone(exported), generateStarterTileMap(), new InputManager(), {});
  const twinB = new GameSimulation(structuredClone(exported), generateStarterTileMap(), new InputManager(), {});
  advance(twinA, 5);
  advance(twinB, 5);
  assert.equal(hashSimulationState(twinA), hashSimulationState(twinB), 'Hai sim cùng save + 5 ngày → cùng hash');
  assert.ok((twinA.getCurrentDayRecord().civicUpkeep ?? 0) > 0, 'Sau 5 ngày: vẫn trừ duy trì công trình');
  console.log('  ✓ save cũ + hash PASS');
}

export function runCivicFeeTestsEntry(): void {
  runConstTests();
  runDeductionTests();
  runLeasedOnlyTests();
  runDebtTests();
  runSaveTests();
}
