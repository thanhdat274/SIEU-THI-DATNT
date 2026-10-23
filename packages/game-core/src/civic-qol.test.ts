import assert from 'node:assert/strict';
import {
  computeCivicQol,
  BASE_QOL,
  MAX_QOL,
  type PlacedBuildingPlacement,
} from './civic-qol';
import {
  CIVIC_DEFS,
  validateCivicDefs,
  BUILDING_TYPE_DEFS,
  ALL_PARCELS,
  DEFAULT_INITIAL_SAVE,
  generateStarterTileMap,
  validatePlacement,
  SECURITY_RULES,
} from '@game/data';
import { GameSimulation } from './simulation';
import { InputManager } from './input';
import { decideLandCommand } from './land-policy';
import { landCommandTargets } from './land-command-targets';
import { planBurglary, shopliftDetectChance, CIVIC_POLICE_BURGLARY_REDUCTION, CIVIC_POLICE_DETECT_BONUS } from './security';
import { hashSimulationState } from './replay';

/**
 * Test công trình công cộng + QoL (OpenSpec `civic-buildings-qol`).
 * Vị trí đặt trong test là vị trí hợp lệ thật (qua `validatePlacement`), cửa ở hàng vỉa hè y=11.
 */

/** Placement civic với gốc hợp lệ (kiểm bằng validatePlacement ở test footprint). */
const civicPl = (typeId: string, n: number, parcelId: string, originX: number, originY: number): PlacedBuildingPlacement =>
  ({ buildingId: `${typeId}-${n}`, typeId, originX, originY, parcelId });

/** Sim mới, cửa hàng đóng, đã mở W1 và mua hai lô W1 (theo mẫu building-behavior.test). */
function newSim(): GameSimulation {
  const s = structuredClone(DEFAULT_INITIAL_SAVE);
  s.player.level = 80; s.player.money = 80_000_000; s.worldTime.isStoreOpen = false;
  const sim = new GameSimulation(s, generateStarterTileMap(), new InputManager(), {});
  sim.reclaimWave('w1');
  (sim as unknown as { finishReclaimedWaves(day: number): void }).finishReclaimedWaves(3);
  assert.ok(sim.buyParcel('w1-corner').success && sim.buyParcel('w1-east').success, 'Mua hai lô W1');
  return sim;
}

const moneyOf = (sim: GameSimulation): number => sim.exportSaveData().player.money;

/** Nạp lại sim từ save của nó sau khi sửa người chơi (giữ đất W1 đã mua). */
function withPlayer(sim: GameSimulation, mutate: (player: ReturnType<GameSimulation['exportSaveData']>['player']) => void): GameSimulation {
  const save = sim.exportSaveData();
  mutate(save.player);
  return new GameSimulation(save, generateStarterTileMap(), new InputManager(), {});
}

function runCivicDefsTests(): void {
  console.log('\n--- Test civic-defs ---');
  const typeIds = CIVIC_DEFS.map((c) => c.buildingTypeId);
  assert.deepEqual([...typeIds].sort(), ['clinic', 'park', 'primary_school', 'ward_police'], 'Đủ 4 loại công trình');
  assert.equal(new Set(typeIds).size, CIVIC_DEFS.length, 'id duy nhất');
  const vr = validateCivicDefs();
  assert.ok(vr.valid, `validateCivicDefs hợp lệ: ${vr.errors.join(', ')}`);

  for (const def of CIVIC_DEFS) {
    const typeDef = BUILDING_TYPE_DEFS[def.buildingTypeId as keyof typeof BUILDING_TYPE_DEFS];
    assert.ok(typeDef, `${def.buildingTypeId} có trong BUILDING_TYPE_DEFS`);
    assert.equal(typeDef.maxInstances, 2, `${def.buildingTypeId}: maxInstances = 2`);
    assert.equal(typeDef.buildCost, def.buildCost, `${def.buildingTypeId}: buildCost khớp CIVIC_DEFS`);
    assert.equal(typeDef.hasCheckout, false, `${def.buildingTypeId}: không có quầy thu ngân`);
    assert.equal(typeDef.trafficShare, 0, `${def.buildingTypeId}: không hút khách mua hàng`);
  }

  // Footprint: mỗi loại đặt được trên ≥1 lô thật theo đúng luật đặt tòa của game.
  const allParcelIds = ALL_PARCELS.map(p => p.id);
  for (const def of CIVIC_DEFS) {
    const template = BUILDING_TYPE_DEFS[def.buildingTypeId as keyof typeof BUILDING_TYPE_DEFS].template;
    const fits = ALL_PARCELS.some(p => {
      for (let x = p.rect.x0; x <= p.rect.x1; x++) {
        const candidate = { buildingId: `${def.buildingTypeId}-1`, parcelId: p.id, originX: x, originY: p.rect.y1 - template.height + 1 };
        if (validatePlacement(candidate, [], allParcelIds) === null) return true;
      }
      return false;
    });
    assert.ok(fits, `${def.buildingTypeId}: đặt hợp lệ được trên ít nhất một lô thật`);
  }
  console.log('  ✓ civic-defs PASS');
}

function runCivicQolTests(): void {
  console.log('\n--- Test civic-qol ---');

  // Không công trình → mọi khu = BASE_QOL, trong [0, 100]
  const empty = computeCivicQol([], ALL_PARCELS);
  assert.ok(Object.keys(empty).length >= 5, 'Có QoL cho mọi khu');
  for (const val of Object.values(empty)) assert.equal(val, BASE_QOL, 'Không công trình → BASE_QOL');

  // Gần tâm khu W0 (lô giữa, cửa x=8) > mép khu (lô tây, cửa x=2). Tâm W0 ≈ (17.6, 11).
  const center = computeCivicQol([civicPl('park', 1, 'lot-center', 6, 5)], ALL_PARCELS).hem_dan_cu;
  const edge = computeCivicQol([civicPl('park', 1, 'lot-west', 0, 5)], ALL_PARCELS).hem_dan_cu;
  assert.ok(center > BASE_QOL, `Công viên gần tâm W0 cộng điểm (${center})`);
  assert.ok(center > edge, `Gần tâm (${center}) > mép (${edge})`);

  // Công trình ở W0 không cộng cho khu W2 (bên kia đường, hàng vỉa hè y=24)
  assert.equal(computeCivicQol([civicPl('park', 1, 'lot-center', 6, 5)], ALL_PARCELS).dan_cu_nam, BASE_QOL, 'Không lan sang khu W2');

  // Chống spam: cái thứ 2 cùng dịch vụ ×0.5, thứ 3 không cộng thêm
  const one = computeCivicQol([civicPl('park', 1, 'lot-center', 6, 5)], ALL_PARCELS).hem_dan_cu;
  const two = computeCivicQol([civicPl('park', 1, 'lot-center', 6, 5), civicPl('park', 2, 'lot-center', 6, 5)], ALL_PARCELS).hem_dan_cu;
  const three = computeCivicQol([1, 2, 3].map(n => civicPl('park', n, 'lot-center', 6, 5)), ALL_PARCELS).hem_dan_cu;
  assert.ok(two > one, 'Công viên thứ 2 vẫn cộng thêm');
  assert.ok(Math.abs((two - BASE_QOL) - 1.5 * (one - BASE_QOL)) < 1e-9, 'Công viên thứ 2 cộng một nửa');
  assert.equal(three, two, '3 công viên = 2 công viên');

  // Nhiều dịch vụ cộng dồn; tất định; trần 100
  const mixed = [civicPl('park', 1, 'lot-center', 6, 5), civicPl('clinic', 1, 'lot-east-1', 21, 3)];
  const r1 = computeCivicQol(mixed, ALL_PARCELS);
  assert.ok(r1.hem_dan_cu > one, 'Công viên + trạm y tế > công viên');
  assert.deepEqual(computeCivicQol(mixed, ALL_PARCELS), r1, 'Tất định');
  for (const val of Object.values(r1)) assert.ok(val >= 0 && val <= MAX_QOL, 'QoL trong [0, 100]');

  console.log('  ✓ civic-qol PASS');
}

function runCivicSimulationTests(): void {
  console.log('\n--- Test civic qua GameSimulation (open_building, co-op, đồn công an) ---');
  const park = CIVIC_DEFS.find(c => c.buildingTypeId === 'park')!;

  // Thiếu cấp → 'level', tiền không đổi
  const low = withPlayer(newSim(), p => { p.level = BUILDING_TYPE_DEFS.park.unlockLevel - 1; });
  const lowMoney = moneyOf(low);
  assert.equal(low.openBuilding('park', 'w1-corner', 42, 5).reason, 'level', 'Thiếu cấp bị từ chối');
  assert.equal(moneyOf(low), lowMoney, 'Thiếu cấp: tiền không đổi');

  // Thiếu tiền → 'money', tiền không đổi
  const poorSim = withPlayer(newSim(), p => { p.money = park.buildCost - 1; });
  assert.equal(poorSim.openBuilding('park', 'w1-corner', 42, 5).reason, 'money', 'Thiếu tiền bị từ chối');
  assert.equal(moneyOf(poorSim), park.buildCost - 1, 'Thiếu tiền: tiền không đổi');

  // Đủ điều kiện → trừ đúng buildCost, QoL khu W1 tăng
  const sim = newSim();
  const buildable = sim.getBuildableParcelIds();
  assert.ok(!buildable.includes('lot-center'), 'Lô của tiệm chính (vị trí mặc định) không phải lô trống');
  assert.ok(buildable.includes('w1-corner') && buildable.includes('lot-west'), 'Lô W0 trống + lô W1 đã mua là lô trống');
  const before = moneyOf(sim);
  assert.equal(sim.getCivicQol().thuong_mai_nga_tu, BASE_QOL, 'Chưa có công trình: W1 = BASE_QOL');
  const opened = sim.openBuilding('park', 'w1-corner', 42, 5);
  assert.ok(opened.success, `Mở công viên (${opened.reason ?? ''})`);
  assert.ok(!sim.getBuildableParcelIds().includes('w1-corner'), 'Lô vừa xây không còn là lô trống');
  assert.equal(before - moneyOf(sim), park.buildCost, 'Trừ đúng buildCost');
  assert.ok(sim.getCivicQol().thuong_mai_nga_tu > BASE_QOL, 'Có công viên: QoL khu W1 tăng');
  assert.equal(sim.getMorningBrief().districtQol?.thuong_mai_nga_tu, sim.getCivicQol().thuong_mai_nga_tu, 'Bản tin sáng mang QoL khu');

  // Tất định: hai sim cùng save + cùng lệnh → cùng trạng thái (server chạy cùng mã mô phỏng)
  const twin = newSim();
  assert.ok(twin.openBuilding('park', 'w1-corner', 42, 5).success);
  assert.equal(hashSimulationState(twin), hashSimulationState(sim), 'Cùng lệnh → cùng hash trạng thái');

  // Co-op: giá xây civic dùng buildCost; > 30% quỹ cần phiếu khi người kia online, ≤ thì cho chạy
  const action = { type: 'open_building', buildingTypeId: 'primary_school', parcelId: 'w1-east', originX: 52, originY: 3 };
  const school = CIVIC_DEFS.find(c => c.buildingTypeId === 'primary_school')!;
  assert.equal(decideLandCommand(action, 'member', undefined, school.buildCost * 2, true).action, 'vote', 'Member xây trường > 30% quỹ → phiếu');
  assert.equal(decideLandCommand(action, 'member', undefined, school.buildCost * 10, true).action, 'allow', 'Giá nhỏ so với quỹ → cho chạy');
  assert.equal(decideLandCommand(action, 'member', { memberLandPermissions: 'none' } as never, school.buildCost * 10, true).action, 'forbid', 'Member không có quyền đất → cấm');
  assert.deepEqual(landCommandTargets(action), [{ kind: 'parcels', parcelIds: ['w1-east'] }], 'Lệnh civic khóa đúng lô (giữ chỗ quy hoạch)');

  // Đồn công an: hệ số có trần, giảm trộm đêm
  assert.ok(shopliftDetectChance({ guardOnShift: true, camera: true, refillOnShift: true, guardBonus: 1, civicPoliceBonus: CIVIC_POLICE_DETECT_BONUS }) <= 1, 'Xác suất bắt trộm ≤ 1');
  const guardOnly = shopliftDetectChance({ guardOnShift: true, camera: false, refillOnShift: false, guardBonus: 1 });
  assert.equal(shopliftDetectChance({ guardOnShift: true, camera: false, refillOnShift: false, guardBonus: 1, civicPoliceBonus: CIVIC_POLICE_DETECT_BONUS }), guardOnly, 'Trần 0.98 của bảo vệ giữ nguyên');
  const level = SECURITY_RULES.unlockLevel + 5;
  let without = 0, withPolice = 0;
  for (let day = 1; day <= 400; day++) {
    if (planBurglary(day, level, { camera: false, hasGuard: false }).kind !== 'none') without++;
    if (planBurglary(day, level, { camera: false, hasGuard: false }, CIVIC_POLICE_BURGLARY_REDUCTION).kind !== 'none') withPolice++;
  }
  assert.ok(without > 0, 'Có trộm đêm khi không có đồn');
  assert.ok(withPolice <= without, `Có đồn: số đêm bị trộm (${withPolice}) ≤ không đồn (${without})`);

  // Đồn trong bán kính tiệm chính được tính vào luồng trộm của simulation
  const policeInfo = (s: GameSimulation) => (s as unknown as { getCivicPoliceInfo(id: string): { civicPoliceBonus: number; civicPoliceReduction: number } }).getCivicPoliceInfo('main');
  assert.equal(policeInfo(sim).civicPoliceBonus, 0, 'Chưa có đồn: không có thưởng');
  const far = newSim();
  assert.ok(far.openBuilding('ward_police', 'w1-east', 52, 3).success, 'Mở đồn ở W1 (xa tiệm chính)');
  assert.equal(policeInfo(far).civicPoliceBonus, 0, 'Đồn ngoài bán kính tiệm chính: không có thưởng');
  const near = newSim();
  assert.ok(near.openBuilding('ward_police', 'lot-east-1', 21, 3).success, 'Mở đồn ở lô W0 cạnh tiệm chính');
  assert.deepEqual(policeInfo(near), { civicPoliceBonus: CIVIC_POLICE_DETECT_BONUS, civicPoliceReduction: CIVIC_POLICE_BURGLARY_REDUCTION }, 'Đồn trong bán kính: tiệm chính nhận thưởng an ninh');

  console.log('  ✓ civic simulation PASS');
}

export function runCivicQolTestsEntry(): void {
  runCivicDefsTests();
  runCivicQolTests();
  runCivicSimulationTests();
}
