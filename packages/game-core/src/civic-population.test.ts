import assert from 'node:assert/strict';
import {
  districtCapacity,
  targetPopulation,
  stepPopulation,
  baselinePop,
  populationTrafficFactor,
  populationCapBonus,
  populationExtraUnitChance,
  computePopulationSnapshot,
  stepAllPopulations,
  RESIDENTS_PER_TILE,
  TRAFFIC_FACTOR_MIN,
  TRAFFIC_FACTOR_MAX,
} from './civic-population';
import { BASE_QOL } from './civic-qol';
import { ALL_PARCELS, DEFAULT_INITIAL_SAVE, SELLABLE_PRODUCTS, generateStarterTileMap } from '@game/data';
import { validateSaveGameData, CURRENT_SAVE_SCHEMA_VERSION, type SaveGameData } from '@game/shared';
import { GameSimulation } from './simulation';
import { InputManager } from './input';
import { buildDemandTable, demandContextKey } from './demand';
import { buildMarketContext, createMarketState } from './market';
import { hashSimulationState } from './replay';

/** Sim mới, cửa hàng đóng, cấp/tiền đủ xây công trình (chỉ W0 — khu của tiệm chính). */
function newSim(save?: SaveGameData): GameSimulation {
  const s = save ?? structuredClone(DEFAULT_INITIAL_SAVE);
  if (!save) { s.player.level = 80; s.player.money = 80_000_000; s.worldTime.isStoreOpen = false; }
  return new GameSimulation(s, generateStarterTileMap(), new InputManager(), {});
}

/** Sang ngày bằng đúng đường chốt ngày của đồng hồ (lương, hao hụt, dân số…). */
function advanceDays(sim: GameSimulation, n: number): void {
  for (let i = 0; i < n; i++) sim.getClock().advanceToNextDay();
}

const W0 = 'hem_dan_cu';
/** Công viên ở lô W0 cạnh tiệm chính (gốc hợp lệ: đáy công viên trùng hàng mặt tiền y=10). */
const buildPark = (sim: GameSimulation) => sim.openBuilding('park', 'lot-east-1', 21, 5);

function runPureTests(): void {
  console.log('\n--- Dân số xóm: hàm thuần ---');
  // Sức chứa
  assert.equal(districtCapacity('thuong_mai_nga_tu', ALL_PARCELS, ['w0']), 0, 'Khu chưa khai hoang → 0');
  assert.ok(districtCapacity('thuong_mai_nga_tu', ALL_PARCELS, ['w0', 'w1']) > 0, 'Mở W1 → khu W1 có sức chứa');
  assert.equal(districtCapacity(W0, ALL_PARCELS, ['w0']), 455 * RESIDENTS_PER_TILE, 'W0: 455 ô × hệ số');

  // Mục tiêu + baseline là số nguyên
  assert.equal(targetPopulation(100, 20), 72);
  assert.equal(targetPopulation(100, 100), 120);
  assert.equal(targetPopulation(0, 50), 0);
  const base = baselinePop(districtCapacity(W0, ALL_PARCELS, ['w0']));
  assert.ok(Number.isInteger(base) && base > 0, `Baseline W0 là số nguyên dương (${base})`);

  // Bước ngày: tối đa 3%, ít nhất 1, không vượt target, hội tụ
  assert.equal(stepPopulation(100, 200), 103, '+3%');
  assert.equal(stepPopulation(100, 50), 97, '−3%');
  assert.equal(stepPopulation(100, 101), 101, 'Không vượt target');
  assert.equal(stepPopulation(5, 200), 6, 'Số nhỏ vẫn tăng (không kẹt vì làm tròn)');
  assert.equal(stepPopulation(0, 10), 1, 'pop = 0, target > 0 → tăng 1');
  assert.equal(stepPopulation(-10, 100), 1, 'Âm coi như 0');
  assert.equal(stepPopulation(Number.NaN, 0), 0, 'NaN coi như 0');
  assert.equal(stepPopulation(80, 80), 80, 'Bằng target → giữ nguyên');
  let pop = 50;
  for (let i = 0; i < 60; i++) pop = stepPopulation(pop, 100);
  assert.equal(pop, 100, 'Hội tụ về target');

  // Hệ số khách
  assert.equal(populationTrafficFactor(72, 72), 1, 'pop = baseline → đúng 1');
  assert.equal(populationTrafficFactor(200, 72), TRAFFIC_FACTOR_MAX, 'Trần 1.25');
  assert.equal(populationTrafficFactor(1, 72), TRAFFIC_FACTOR_MIN, 'Sàn 0.85');
  assert.equal(populationTrafficFactor(10, 0), 1, 'Khu không sức chứa → 1');

  // Nới trần đồng thời + thêm món (nút thắt là trần đồng thời, không phải lưu lượng)
  assert.equal(populationCapBonus(1), 0, 'Hệ số 1 → không thêm chỗ');
  assert.equal(populationCapBonus(1.25), 2, 'Hệ số 1.25 → +2 chỗ');
  assert.equal(populationCapBonus(0.85), -1, 'Hệ số 0.85 → −1 chỗ');
  assert.equal(populationExtraUnitChance(1), 0, 'Hệ số 1 → không thêm món');
  assert.equal(populationExtraUnitChance(0.9), 0, 'Hệ số < 1 → không thêm món');
  assert.equal(populationExtraUnitChance(1.25), 0.1, 'Hệ số 1.25 → 10% (trần)');

  // Snapshot: thiếu/0/hỏng → baseline; target dùng QoL truyền vào
  const fresh = computePopulationSnapshot({}, ALL_PARCELS, ['w0'], undefined);
  assert.equal(fresh[W0].pop, fresh[W0].baseline, 'Thiếu dữ liệu → baseline');
  assert.equal(fresh[W0].factor, 1, 'Thiếu dữ liệu → hệ số đúng 1');
  assert.equal(computePopulationSnapshot({}, ALL_PARCELS, ['w0'], { [W0]: 0 })[W0].pop, fresh[W0].baseline, '0 ở khu có sức chứa = chưa có dân → baseline');
  assert.equal(computePopulationSnapshot({}, ALL_PARCELS, ['w0'], { [W0]: -5 })[W0].pop, fresh[W0].baseline, 'Âm → baseline');
  const high = computePopulationSnapshot({ [W0]: 60 }, ALL_PARCELS, ['w0'], undefined);
  assert.ok(high[W0].target > high[W0].baseline, 'QoL cao → target > baseline');
  assert.equal(stepAllPopulations(high)[W0].pop, stepPopulation(high[W0].pop, high[W0].target), 'stepAll = stepPopulation từng khu');
  assert.deepEqual(stepAllPopulations(fresh), fresh, 'QoL cơ bản → không đổi');
  console.log('  ✓ hàm thuần PASS');
}

function runSimulationTests(): void {
  console.log('\n--- Dân số xóm: qua GameSimulation ---');

  // Không công trình: 10 ngày, dân số = baseline, hệ số đúng 1, không có hệ số dân số trong bảng nhu cầu
  const plain = newSim();
  advanceDays(plain, 10);
  const plainPop = plain.getCivicPopulation()[W0];
  assert.equal(plainPop.pop, plainPop.baseline, 'Không công trình: dân số = baseline sau 10 ngày');
  assert.equal(plain.getCivicPopulationFactor(W0), 1, 'Không công trình: hệ số đúng 1');
  assert.ok(!plain.getDemandTable().traffic.factors.some(f => f.ruleId === 'civic_population'), 'Không công trình: không có hệ số dân số');

  // Có công viên gần tâm W0: QoL tăng, target tăng ngay, dân số tăng dần ≤ 3%/ngày, hệ số > 1 và ≤ 1.25
  const sim = newSim();
  const opened = buildPark(sim);
  assert.ok(opened.success, `Xây công viên (${opened.reason ?? ''})`);
  const start = sim.getCivicPopulation()[W0];
  assert.ok(start.qol > BASE_QOL && start.target > start.baseline, 'Target theo QoL mới ngay sau khi xây');
  let prev = start.pop;
  for (let d = 0; d < 20; d++) {
    advanceDays(sim, 1);
    const now = sim.getCivicPopulation()[W0].pop;
    assert.ok(now >= prev && now - prev <= Math.max(1, Math.round(prev * 0.03)), `Ngày ${d + 1}: tăng ≤ 3% (${prev} → ${now})`);
    prev = now;
  }
  const after = sim.getCivicPopulation()[W0];
  assert.ok(after.pop > after.baseline && after.pop <= after.target, `Dân số tăng về target (${after.baseline} → ${after.pop}/${after.target})`);
  assert.ok(after.factor > 1 && after.factor <= TRAFFIC_FACTOR_MAX, `Hệ số > 1, ≤ 1.25 (${after.factor})`);
  const civicFactor = sim.getDemandTable().traffic.factors.find(f => f.ruleId === 'civic_population');
  assert.equal(civicFactor?.factor, after.factor, 'Bảng nhu cầu mang hệ số dân số (kênh traffic)');
  assert.equal(sim.getDailyRecords()[sim.getTime().day]?.civicPopulation?.pop ?? sim.getCurrentDayRecord().civicPopulation?.pop, after.pop, 'Báo cáo ngày ghi dân số khu tiệm chính');

  // Bảng nhu cầu đệm đúng: hai lần gọi liền nhau cùng một bảng (khóa khớp, không dựng lại mỗi lần)
  assert.equal(sim.getDemandTable(), sim.getDemandTable(), 'Bảng nhu cầu được đệm khi hệ số dân số ≠ 1');

  // Save: export → import giữ dân số; hai sim cùng save → cùng hash; tiếp tục cùng số ngày → cùng hash
  const exported = sim.exportSaveData();
  assert.equal(exported.civic?.populationByDistrict[W0], after.pop, 'Save có dân số');
  const reloaded = newSim(structuredClone(exported));
  assert.equal(reloaded.getCivicPopulation()[W0].pop, after.pop, 'Nạp save giữ dân số');
  assert.equal(hashSimulationState(reloaded), hashSimulationState(sim), 'Cùng save → cùng hash');
  advanceDays(sim, 3); advanceDays(reloaded, 3);
  assert.equal(hashSimulationState(reloaded), hashSimulationState(sim), 'Cùng save + 3 ngày → cùng hash');

  // Save cũ schema 10 (không có civic) → migrate, hệ số đúng 1
  const v10 = structuredClone(plain.exportSaveData()) as SaveGameData;
  v10.schemaVersion = 10; delete v10.civic;
  const migrated = validateSaveGameData(v10);
  assert.ok(migrated.valid && migrated.data, `Save v10 migrate được (${migrated.versionStatus})`);
  assert.equal(migrated.data!.schemaVersion, CURRENT_SAVE_SCHEMA_VERSION, 'Migrate lên schema hiện hành');
  const fromV10 = newSim(migrated.data!);
  advanceDays(fromV10, 5);
  assert.equal(fromV10.getCivicPopulationFactor(W0), 1, 'Save v10: hệ số đúng 1 sau 5 ngày');

  // Dữ liệu dân số hỏng trong save → chuẩn hóa, không crash
  const broken = structuredClone(exported);
  broken.civic = { populationByDistrict: { [W0]: -40 } };
  assert.equal(newSim(broken).getCivicPopulation()[W0].pop, after.baseline, 'Dân số âm trong save → baseline');

  // Khóa đệm bảng nhu cầu đổi theo hệ số dân số
  const ctx = buildMarketContext(createMarketState('pop-key', 1), 1, 9);
  assert.notEqual(demandContextKey(ctx, 50, 1), demandContextKey(ctx, 50, 1.1), 'Khóa đổi khi hệ số dân số đổi');
  assert.equal(buildDemandTable({ ctx, products: SELLABLE_PRODUCTS, reputation: 50, populationTrafficFactor: 1.1 }).key, demandContextKey(ctx, 50, 1.1), 'Khóa của bảng gồm hệ số dân số');
  console.log('  ✓ simulation PASS');
}

export function runCivicPopulationTestsEntry(): void {
  runPureTests();
  runSimulationTests();
}
