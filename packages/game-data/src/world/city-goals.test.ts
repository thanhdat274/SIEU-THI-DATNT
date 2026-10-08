/**
 * Test registry mục tiêu thành phố (OpenSpec `open-world-districts-city-goals`, task 2.1 — THUẦN + PROVISIONAL).
 * Export `runCityGoalsTests` để LEAD nối vào test-runner. Dùng `node:assert/strict` (giống goals.test.ts).
 */
import assert from 'node:assert/strict';
import {
  CITY_GOALS_CATALOG,
  CITY_LEVEL_WAVE_REQUIREMENT,
  cityGoalById,
  cityGoalsForLevel,
  cityProgress,
  cityTierFromCityLevel,
  sumCityGoalRewards,
  wavesOpenedForCityLevel,
} from './city-goals';

/** Số cấp thành phố (1..10). */
const MAX_CITY_LEVEL = 10;

export function runCityGoalsTests(): void {
  console.log('\n=============================================');
  console.log('🧪 BẮT ĐẦU CHẠY KIỂM THỬ MỤC TIÊU THÀNH PHỐ (registry)');
  console.log('=============================================');

  // 1. Registry đủ cấp 1–10 và mỗi cấp có ít nhất 1 mục tiêu.
  console.log('\n--- Test: Registry đủ cấp 1–10, mỗi cấp ≥1 mục tiêu, id duy nhất ---');
  {
    const levelSet = new Set(CITY_GOALS_CATALOG.map((g) => g.cityLevel));
    for (let lvl = 1; lvl <= MAX_CITY_LEVEL; lvl++) {
      assert.ok(levelSet.has(lvl), `Thiếu mục tiêu cho cấp thành phố ${lvl}`);
      const goals = cityGoalsForLevel(lvl);
      assert.ok(goals.length >= 1, `Cấp ${lvl} phải có ít nhất 1 mục tiêu`);
      assert.ok(goals.length <= 3, `Cấp ${lvl} không vượt 3 mục tiêu`);
    }
    const ids = CITY_GOALS_CATALOG.map((g) => g.id);
    assert.equal(new Set(ids).size, ids.length, 'id mục tiêu thành phố không trùng');

    // Mục tiêu cấp 1 không đòi mở đợt (tránh vòng điều kiện: W1 cần cấp thành phố 2).
    const lvl1 = cityGoalsForLevel(1);
    assert.ok(!lvl1.some((g) => g.kind === 'waves_opened'), 'Cấp 1 KHÔNG được đòi mở đợt (tránh vòng điều kiện)');
  }
  console.log('  ✓ Registry đủ cấp 1–10, mỗi cấp ≥1 mục tiêu, cấp 1 không đòi mở đợt');

  // 2. cityTierFromCityLevel theo D3.
  console.log('\n--- Test: cityTierFromCityLevel = min(5, floor(level/2)) ---');
  {
    assert.equal(cityTierFromCityLevel(1), 0);
    assert.equal(cityTierFromCityLevel(2), 1);
    assert.equal(cityTierFromCityLevel(3), 1);
    assert.equal(cityTierFromCityLevel(4), 2);
    assert.equal(cityTierFromCityLevel(5), 2);
    assert.equal(cityTierFromCityLevel(6), 3);
    assert.equal(cityTierFromCityLevel(7), 3);
    assert.equal(cityTierFromCityLevel(8), 4);
    assert.equal(cityTierFromCityLevel(9), 4);
    assert.equal(cityTierFromCityLevel(10), 5);
    assert.equal(cityTierFromCityLevel(20), 5, 'Kẹp trần ở 5');
  }
  console.log('  ✓ cityTier = min(5, floor(level/2)) đúng (2→1, 4→2, 6→3, 8→4, 10→5)');

  // 3. CITY_LEVEL_WAVE_REQUIREMENT + wavesOpenedForCityLevel.
  console.log('\n--- Test: điều kiện cấp thành phố cho đợt khai hoang ---');
  {
    assert.equal(CITY_LEVEL_WAVE_REQUIREMENT.w1, 2);
    assert.equal(CITY_LEVEL_WAVE_REQUIREMENT.w2, 4);
    assert.equal(CITY_LEVEL_WAVE_REQUIREMENT.w3, 6);
    assert.equal(CITY_LEVEL_WAVE_REQUIREMENT.w4, 8);

    // Số đợt mở được theo cấp.
    assert.equal(wavesOpenedForCityLevel(1), 0, 'Cấp 1 chưa mở đợt nào');
    assert.equal(wavesOpenedForCityLevel(2), 1);
    assert.equal(wavesOpenedForCityLevel(4), 2);
    assert.equal(wavesOpenedForCityLevel(6), 3);
    assert.equal(wavesOpenedForCityLevel(8), 4);
    assert.equal(wavesOpenedForCityLevel(10), 4);
  }
  console.log('  ✓ Cấp thành phố đủ để mở W1/2/4/6/8 đúng CITY_LEVEL_WAVE_REQUIREMENT');

  // 4. cityProgress đánh dấu done đúng theo metrics.
  console.log('\n--- Test: cityProgress đánh dấu done đúng theo metrics ---');
  {
    // Cấp 1 có 2 mục tiêu: daily_customers 40, building_types_open 2.
    const p0 = cityProgress(1, { daily_customers: 10, building_types_open: 1 });
    assert.equal(p0.completedGoalIds.length, 0, 'Chưa đạt mục tiêu nào');
    assert.equal(p0.allGoalsDoneForLevel, false);
    assert.equal(p0.nextMilestoneMinorDone, false);

    const p1 = cityProgress(1, { daily_customers: 40, building_types_open: 1 });
    assert.deepEqual(p1.completedGoalIds, ['cg_l1_daily_customers']);
    assert.equal(p1.allGoalsDoneForLevel, false, 'Còn mục tiêu loại hình chưa đạt');
    assert.equal(p1.nextMilestoneMinorDone, true, 'Đạt được một cột mốc nhỏ');

    const p2 = cityProgress(1, { daily_customers: 400, building_types_open: 5 });
    assert.equal(p2.allGoalsDoneForLevel, true, 'Đủ mọi mục tiêu cấp 1 → sẵn sàng lên cấp');
    assert.equal(p2.completedGoalIds.length, 2);

    // Không có metric cho kind nào → 0, không hoàn thành.
    const pEmpty = cityProgress(1, {});
    assert.equal(pEmpty.allGoalsDoneForLevel, false);

    // Level ngoài khoảng được clamp 1..10.
    const pClamp = cityProgress(0, { daily_customers: 100, building_types_open: 5 });
    assert.equal(pClamp.level, 1);
    assert.equal(pClamp.allGoalsDoneForLevel, true);
  }
  console.log('  ✓ cityProgress đánh dấu done đúng theo metrics từng kind');

  // 5. Rewards hợp lệ (id tồn tại, thưởng không âm) và tổng thưởng thuần.
  console.log('\n--- Test: thưởng hợp lệ & sumCityGoalRewards ---');
  {
    for (const goal of CITY_GOALS_CATALOG) {
      const found = cityGoalById(goal.id);
      assert.equal(found, goal, `cityGoalById tìm thấy ${goal.id}`);
      assert.ok(goal.reward.gold !== undefined, `${goal.id} có thưởng vàng`);
      assert.ok((goal.reward.gold ?? 0) > 0, `${goal.id} thưởng vàng dương`);
    }
    const sum = sumCityGoalRewards(cityGoalsForLevel(1).map((g) => g.id));
    const expected = cityGoalsForLevel(1).reduce(
      (acc, g) => ({ gold: acc.gold + (g.reward.gold ?? 0), prestige: acc.prestige + (g.reward.prestige ?? 0), xp: acc.xp + (g.reward.xp ?? 0) }),
      { gold: 0, prestige: 0, xp: 0 },
    );
    assert.deepEqual(sum, expected);
  }
  console.log('  ✓ id/thưởng hợp lệ, tổng thưởng cộng dồn thuần');

  console.log('\n🎉 KIỂM THỬ REGISTRY MỤC TIÊU THÀNH PHỐ ĐÃ ĐẠT!');
}
