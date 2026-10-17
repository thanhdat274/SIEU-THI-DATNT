/**
 * Test mục tiêu xóm phố (OpenSpec `civic-city-goals`, BƯỚC 4 — Giai đoạn 3, tasks 1.1–1.3).
 * Export `runCivicRevealGoalsTests` để nối vào test-runner. Dùng `node:assert/strict`.
 */
import assert from 'node:assert/strict';
import { CIVIC_BUNDLES, civicBundleById, DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import type { SaveGameData } from '@game/shared';
import { GameSimulation } from './simulation';
import { InputManager } from './input';
import { evaluateCivicGoalCondition } from './civic-bundles';
import {
  CIVIC_REVEAL_GOALS,
  civicRevealGoalById,
  civicRevealGoalsForLevel,
  validateCivicRevealGoals,
  isBundleRevealed,
  revealedBundleIdsForLoadedLevel,
} from './civic-reveal-goals';

function newSim(cityLevel = 9): GameSimulation {
  const save = structuredClone(DEFAULT_INITIAL_SAVE) as SaveGameData;
  save.player.level = 80;
  save.player.money = 200_000_000;
  save.worldTime.isStoreOpen = false;
  save.cityProgress = { level: cityLevel, claimedCityGoalIds: [], milestones: [], metrics: {} };
  return new GameSimulation(save, generateStarterTileMap(), new InputManager(), {});
}
const internal = <T>(sim: GameSimulation, key: string): T => (sim as unknown as Record<string, unknown>)[key] as T;

export function runCivicRevealGoalsTests(): void {
  console.log('\n--- Mục tiêu xóm phố (Giai đoạn 3: 1.1–1.3) ---');

  // 1.1 — evaluator thuần cho 3 loại điều kiện.
  console.log('\n  • (1.1) evaluateCivicGoalCondition 3 loại điều kiện');
  {
    // civic_building_count: đếm theo buildingTypeId (mặc định park khi thiếu).
    assert.equal(evaluateCivicGoalCondition({ kind: 'civic_building_count', buildingTypeId: 'park', targetValue: 2 }, { civicBuildings: { park: 2 }, districtQol: {}, totalPopulation: 0 }), true, 'đủ 2 park → đạt');
    assert.equal(evaluateCivicGoalCondition({ kind: 'civic_building_count', buildingTypeId: 'park', targetValue: 3 }, { civicBuildings: { park: 2 }, districtQol: {}, totalPopulation: 0 }), false, 'chỉ 2 park < 3 → chưa đạt');
    // district_qol_at_least.
    assert.equal(evaluateCivicGoalCondition({ kind: 'district_qol_at_least', districtId: 'hem_dan_cu', targetValue: 40 }, { civicBuildings: {}, districtQol: { hem_dan_cu: 45 }, totalPopulation: 0 }), true, 'QoL 45 ≥ 40 → đạt');
    assert.equal(evaluateCivicGoalCondition({ kind: 'district_qol_at_least', districtId: 'hem_dan_cu', targetValue: 60 }, { civicBuildings: {}, districtQol: { hem_dan_cu: 45 }, totalPopulation: 0 }), false, 'QoL 45 < 60 → chưa đạt');
    // total_population_at_least.
    assert.equal(evaluateCivicGoalCondition({ kind: 'total_population_at_least', targetValue: 100 }, { civicBuildings: {}, districtQol: {}, totalPopulation: 120 }), true, 'dân 120 ≥ 100 → đạt');
    assert.equal(evaluateCivicGoalCondition({ kind: 'total_population_at_least', targetValue: 200 }, { civicBuildings: {}, districtQol: {}, totalPopulation: 120 }), false, 'dân 120 < 200 → chưa đạt');
  }
  console.log('  ✓ (1.1) evaluator 3 loại điều kiện PASS');

  // 1.2 — catalog xóm phố hợp lệ + mỗi mục tiêu hiện đúng 1 trang sổ ở cấp khớp.
  console.log('\n  • (1.2) validate catalog + mục tiêu hiện đúng sổ');
  {
    const v = validateCivicRevealGoals();
    assert.ok(v.valid, `validateCivicRevealGoals hợp lệ: ${v.errors.join(' | ')}`);
    assert.equal(CIVIC_REVEAL_GOALS.length, CIVIC_BUNDLES.length, 'đúng 1 mục tiêu xóm phố / 1 sổ góp');
    for (const g of CIVIC_REVEAL_GOALS) {
      const bundle = civicBundleById(g.revealBundleId)!;
      assert.ok(bundle, `${g.id} trỏ tới sổ có thật`);
      assert.equal(bundle.revealedByCityLevel, g.cityLevel, `${g.id} cấp khớp revealedByCityLevel của sổ`);
    }
    // Mỗi cấp ≤ 1 mục tiêu xóm phố; levels khớp 4/5/7/9.
    const levels = CIVIC_REVEAL_GOALS.map((g) => g.cityLevel).sort((a, b) => a - b);
    assert.deepEqual(levels, [4, 5, 7, 9], 'các cấp xóm phố đúng 4,5,7,9');
    assert.equal(civicRevealGoalsForLevel(4).length, 1, 'cấp 4 có 1 mục tiêu xóm phố');
    // Tra cứu id.
    assert.equal(civicRevealGoalById('crg_l5_clinic')?.revealBundleId, 'bundle_clinic', 'tra crg_l5_clinic → bundle_clinic');
    assert.equal(civicRevealGoalById('khong_co'), undefined, 'id không tồn tại → undefined');
    // isBundleRevealed.
    assert.equal(isBundleRevealed('bundle_park', 4, []), true, 'cấp 4 đủ → park hiện theo cấp');
    assert.equal(isBundleRevealed('bundle_park', 3, []), false, 'cấp 3 chưa đủ → park chưa hiện');
    assert.equal(isBundleRevealed('bundle_park', 3, ['bundle_park']), true, 'có trong revealedBundleIds → hiện');
  }
  console.log('  ✓ (1.2) catalog + validate PASS');

  // 1.3 — không hồi tố: tải save ở cấp đã qua → các trang sổ cấp thấp hiện ngay; nhận lại → already_revealed.
  console.log('\n  • (1.3) không hồi tố khi tải save ở cấp đã qua');
  {
    // revealedBundleIdsForLoadedLevel: cấp 6 → sổ cấp 4,5; cấp 9 → cả 4.
    const l6 = revealedBundleIdsForLoadedLevel(6).sort();
    assert.deepEqual(l6, ['bundle_clinic', 'bundle_park'], 'cấp 6 hiện ngay sổ park(l4)+clinic(l5)');
    const l9 = revealedBundleIdsForLoadedLevel(9).sort();
    assert.equal(l9.length, 4, 'cấp 9 hiện cả 4 sổ');

    // Sim tải ở cấp 6 → getRevealedBundleIds đã gieo 2 sổ (park + clinic).
    const sim = newSim(6);
    const revealed = sim.getRevealedBundleIds().sort();
    assert.deepEqual(revealed, ['bundle_clinic', 'bundle_park'], 'constructor gieo reveal hồi tố theo cấp tải');
    // Sổ cấp cao hơn (ward_police l7) chưa hiện → chưa nhận được.
    assert.equal(sim.claimCivicRevealGoal('crg_l7_ward_police').reason, 'goal_not_met', 'ward_police l7 chưa hiện qua mốc cấp → điều kiện (cần park) chưa đạt');

    // Nhận mục tiêu xóm phố cấp 4 đã ở mốc (park đã hiện) → already_revealed (không hồi tố nhận lại thưởng).
    const dup = sim.claimCivicRevealGoal('crg_l4_park');
    assert.equal(dup.success, false, 'nhận lại mục tiêu xóm phố đã hiện → không nhận lại');
    assert.equal(dup.reason, 'already_revealed', 'reason = already_revealed');
  }
  console.log('  ✓ (1.3) không hồi tố PASS');

  // (bổ sung) claimCivicRevealGoal thật: điều kiện đạt thì hiện sổ + ghi milestone.
  console.log('\n  • (bổ sung) claim mục tiêu xóm phố khi điều kiện đạt');
  {
    const sim = newSim(1); // cấp 1 — chưa có sổ nào hiện.
    assert.equal(sim.claimCivicRevealGoal('crg_l4_park').reason, 'goal_not_met', 'dân số 0 → chưa đạt total_population');
    // Gieo dân số cho khu để đạt total_population_at_least (park, target 100).
    const pop = internal<Record<string, number>>(sim, '_civicPopulationByDistrict');
    pop['hem_dan_cu'] = 120;
    const r = sim.claimCivicRevealGoal('crg_l4_park');
    assert.equal(r.success, true, 'đạt điều kiện → nhận mục tiêu xóm phố');
    assert.equal(r.revealBundleId, 'bundle_park', 'hiện đúng sổ park');
    assert.ok(sim.getRevealedBundleIds().includes('bundle_park'), 'bundle_park có trong revealedBundleIds');
    // Ghi milestone 'goal_claimed' (không trùng nhau do giành riêng xóm phố).
    const milestones = internal<{ milestones: { type: string }[] }>(sim, '_cityProgress').milestones;
    assert.ok(milestones.some((m) => m.type === 'goal_claimed'), 'có milestone goal_claimed cho mục tiêu xóm phố');
    // goalId không tồn tại.
    assert.equal(sim.claimCivicRevealGoal('aaa').reason, 'goal_not_found', 'goal_id không tồn tại');
  }
  console.log('  ✓ claim mục tiêu xóm phố PASS');
}
