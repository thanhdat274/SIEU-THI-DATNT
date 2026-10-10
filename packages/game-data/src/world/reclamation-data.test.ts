/**
 * Test thuần dữ liệu khai hoang thế giới mở (OpenSpec `open-world-land-reclamation`, task 1.1 + 1.3b).
 * Phạm vi: game-data. Chạy được độc lập (tsx file này) hoặc qua run đăng ký trong test-runner.
 */
import assert from 'node:assert/strict';
import {
  cityTierFrom, cityGrowthFactor, cityFloorBonus, scaledNpcBudget, scaledVehicleBudget,
  CITY_TIER_MAX, NPC_BUDGET, VEHICLE_BUDGET,
} from '../neighborhood';
import { RECLAMATION_WAVES, validateReclamationWaves } from './waves';
import { rectContains, rectHeight, rectWidth, WORLD_BOUNDS } from './world-grid';

export function runReclamationDataTests(): void {
  console.log('\n--- Dữ liệu khai hoang (D7 cityTier + lô W1–W4) ---');

  // --- cityTierFrom: đơn điệu theo số đợt đã mở và số tòa đã mở, trong 0..CITY_TIER_MAX ---
  const W = (ids: string[]): string[] => ids; // mở rộng mảng đợt
  // Khởi đầu: chưa mở đợt nào ngoài w0 + 1 tòa → tier 0.
  assert.equal(cityTierFrom(['w0'], 1), 0, 'ban đầu (w0 + 1 tòa) tier 0');
  // Mở thêm đợt (cùng số tòa không làm đổi hạng tòa) → tier tăng đơn điệu (thậm chí tăng đúng theo số đợt).
  const fixedBuildings = 4; // buildingScore = 0 cho mọi tier
  const tier0 = cityTierFrom(['w0'], fixedBuildings);
  const tier1 = cityTierFrom(['w0', 'w1'], fixedBuildings);
  const tier2 = cityTierFrom(['w0', 'w1', 'w2'], fixedBuildings);
  const tier4 = cityTierFrom(['w0', 'w1', 'w2', 'w3', 'w4'], fixedBuildings);
  assert.equal(tier0, 0, 'fixedBuildings, w0 → tier 0');
  assert.equal(tier1, 1, 'mở W1 → tier 1');
  assert.equal(tier2, 2, 'mở W2 → tier 2');
  assert.equal(tier4, 4, 'mở đủ W1–W4 → tier 4');
  assert.ok(tier4 > tier2 && tier2 > tier1 && tier1 > tier0, 'nhiều đợt hơn → tier cao hơn (đơn điệu)');
  // Đơn điệu theo số tòa: tăng buildingCount không bao giờ làm tier giảm.
  for (const opened of [['w0'], ['w0', 'w1'], ['w0', 'w1', 'w2', 'w3', 'w4']]) {
    let prev = cityTierFrom(opened, 0);
    for (let b = 1; b <= 30; b++) {
      const t = cityTierFrom(opened, b);
      assert.ok(t >= prev, `với mở ${opened.join('+')}, tăng số tòa không làm tier giảm (b=${b}: ${t} >= ${prev})`);
      prev = t;
    }
  }
  for (let b = 0; b <= 40; b++) {
    const t = cityTierFrom(['w0', 'w1', 'w2', 'w3', 'w4'], b);
    assert.ok(t >= 0 && t <= CITY_TIER_MAX, `tier nằm trong 0..${CITY_TIER_MAX} (b=${b} → ${t})`);
  }
  // Đơn điệu theo số đợt: cố định số tòa, thêm đợt không làm tier giảm.
  const fixedBuilding = 20; // buildingScore = 2
  let prevWaveTier = cityTierFrom(['w0'], fixedBuilding);
  for (let n = 1; n <= 4; n++) {
    const opened = ['w0', 'w1', 'w2', 'w3'].slice(0, 1 + n);
    const t = cityTierFrom(opened, fixedBuilding);
    assert.ok(t >= prevWaveTier, `thêm đợt không làm tier giảm (mở ${n} đợt → ${t} >= ${prevWaveTier})`);
    prevWaveTier = t;
  }

  // --- cityGrowthFactor: trong [0.6, 1.4], đơn điệu, tier 0 → 0.6, tier 5 → 1.4 ---
  const g0 = cityGrowthFactor(0);
  const g5 = cityGrowthFactor(CITY_TIER_MAX);
  assert.equal(g0, 0.6, 'tier 0 → hệ số 0.6');
  assert.equal(g5, 1.4, 'tier 5 → hệ số 1.4');
  let prevG = -Infinity;
  for (let tier = 0; tier <= CITY_TIER_MAX; tier++) {
    const g = cityGrowthFactor(tier);
    assert.ok(g >= 0.6 && g <= 1.4, `cityGrowthFactor(${tier})=${g} trong [0.6, 1.4]`);
    assert.ok(g >= prevG, `cityGrowthFactor đơn điệu tăng theo tier`);
    prevG = g;
  }
  assert.ok(Number.isFinite(cityGrowthFactor(99)) && cityGrowthFactor(99) === 1.4, 'tier ngoài khoảng được kẹp về 1.4');
  assert.equal(cityGrowthFactor(-3), 0.6, 'tier âm kẹp về 0.6');

  // --- cityFloorBonus: trong 0..2 ---
  for (let tier = 0; tier <= CITY_TIER_MAX; tier++) {
    const fb = cityFloorBonus(tier);
    assert.ok(fb >= 0 && fb <= 2, `cityFloorBonus(${tier})=${fb} trong 0..2`);
  }
  assert.equal(cityFloorBonus(CITY_TIER_MAX), 2, 'tier 5 → +2 tầng');
  assert.equal(cityFloorBonus(0), 0, 'tier 0 → +0 tầng');

  // --- scaledNpcBudget / scaledVehicleBudget: bản nhân, không sửa hằng số gốc ---
  const baseNpc = { ...NPC_BUDGET };
  const baseVehicles = VEHICLE_BUDGET;
  const low = scaledNpcBudget(0);
  const high = scaledNpcBudget(CITY_TIER_MAX);
  assert.ok(high.near > low.near && high.far > low.far, 'tier cao → ngân sách NPC lớn hơn');
  assert.ok(scaledVehicleBudget(CITY_TIER_MAX) > scaledVehicleBudget(0), 'tier cao → ngân sách xe lớn hơn');
  assert.deepEqual(NPC_BUDGET, baseNpc, 'NPC_BUDGET gốc không bị sửa (hệ số đi qua bản nhân)');
  assert.equal(VEHICLE_BUDGET, baseVehicles, 'VEHICLE_BUDGET gốc không bị sửa');
  for (let tier = 0; tier <= CITY_TIER_MAX; tier++) {
    const sb = scaledNpcBudget(tier);
    assert.ok(sb.near >= 0 && sb.middle >= 0 && sb.far >= 0, `scaledNpcBudget(${tier}) không âm`);
  }

  // --- Lô W1–W4: nằm trong vùng đợt, không chồng lô khác, đúng biên thế giới, mặt tiền phía bắc đường ---
  assert.deepEqual(validateReclamationWaves(), [], 'RECLAMATION_WAVES hợp lệ: vùng trong 120×80, không chồng, lô trong vùng, lô không chồng, lô mặt phía bắc đường');
  // Mỗi đợt mới có số lô đúng theo design D1.
  const expectedCounts: Record<string, number> = { w0: 0, w1: 3, w2: 4, w3: 2, w4: 4 };
  for (const wave of RECLAMATION_WAVES) {
    assert.ok(rectContains(WORLD_BOUNDS, wave.region), `vùng ${wave.id} nằm trong biên thế giới`);
    if (expectedCounts[wave.id] !== undefined) {
      assert.equal(wave.parcels.length, expectedCounts[wave.id], `đợt ${wave.id} có ${expectedCounts[wave.id]} lô (D1)`);
    }
  }
  // Kiểm từng lô: trong vùng, trong biên, không chồng lô cùng đợt, mặt tiền phía bắc đường (y1 < hàng trên đường).
  for (const wave of RECLAMATION_WAVES) {
    for (let i = 0; i < wave.parcels.length; i++) {
      const p = wave.parcels[i];
      assert.ok(rectContains(wave.region, p.rect), `lô ${p.id} nằm trong vùng ${wave.id}`);
      assert.ok(rectContains(WORLD_BOUNDS, p.rect), `lô ${p.id} nằm trong biên thế giới`);
      assert.ok(rectWidth(p.rect) >= 1 && rectHeight(p.rect) >= 1, `lô ${p.id} có diện tích dương`);
      for (let j = i + 1; j < wave.parcels.length; j++) {
        const q = wave.parcels[j];
        const overlap = p.rect.x0 <= q.rect.x1 && q.rect.x0 <= p.rect.x1 && p.rect.y0 <= q.rect.y1 && q.rect.y0 <= p.rect.y1;
        assert.ok(!overlap, `lô ${p.id} và ${q.id} không chồng nhau (${wave.id})`);
      }
    }
  }
  // Lô góc ngã tư đúng chỗ (W1 x 42..47, W4 x 42..47) và đánh dấu corner.
  const w1 = RECLAMATION_WAVES.find((w) => w.id === 'w1')!;
  const w1Corner = w1.parcels.find((p) => p.id === 'w1-corner')!;
  assert.deepEqual([w1Corner.rect.x0, w1Corner.rect.x1], [42, 47], 'W1 góc ngã tư đông nằm x 42..47 (D1)');
  assert.equal(w1Corner.corner, true, 'W1 góc ngã tư đánh dấu corner');
  const w4 = RECLAMATION_WAVES.find((w) => w.id === 'w4')!;
  const w4Corner = w4.parcels.find((p) => p.id === 'w4-corner')!;
  assert.deepEqual([w4Corner.rect.x0, w4Corner.rect.x1], [42, 47], 'W4 góc ngã tư nam nằm x 42..47 (D1)');
  assert.equal(w4Corner.corner, true, 'W4 góc ngã tư đánh dấu corner');
  console.log('  ✓ cityTier đơn điệu, growth factor 0.6–1.4, floor bonus 0–2, scaled budget không phá hằng số, lô W1–W4 hợp lệ');
}

declare const process: any;
// Chạy độc lập: `tsx src/world/reclamation-data.test.ts`
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('reclamation-data.test')) {
  runReclamationDataTests();
  console.log('\n🎉 DỮ LIỆU KHAI HOANG ĐẠT!\n');
}
