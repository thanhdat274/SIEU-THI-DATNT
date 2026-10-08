/**
 * Test mô phỏng tiến độ mục tiêu thành phố (OpenSpec `open-world-districts-city-goals`, task 2.4 + bổ trợ 1.4 —
 * THUẦN + PROVISIONAL). Export `runCityGoalsSimTests` để LEAD nối vào test-runner. Dùng `node:assert/strict`.
 */
import assert from 'node:assert/strict';
import {
  CITY_GOALS_CATALOG,
  CITY_LEVEL_WAVE_REQUIREMENT,
  cityTierFromCityLevel,
  wavesOpenedForCityLevel,
} from '@game/data/src/world/city-goals';
import {
  DISTRICT_FOOD_CAP,
  citySimMetricsForDay,
  defaultCitySimConfig,
  simulateDistrictFoodMultiplier,
  simulateGoalProgression,
} from './city-goals-sim';

export function runCityGoalsSimTests(): void {
  console.log('\n=============================================');
  console.log('🧪 BẮT ĐẦU CHẠY KIỂM THỬ MÔ PHỎNG TIẾN ĐỘ THÀNH PHỐ');
  console.log('=============================================');

  // 1. Sim tiến độ 60–90 ngày: lên cấp, cityTier theo D3, cấp thấp đạt được, điều kiện cấp W đúng.
  console.log('\n--- Test: sim 60–90 ngày lên cấp, cityTier theo D3, không tụt cảnh quan ---');
  {
    for (const days of [60, 75, 90]) {
      const res = simulateGoalProgression(defaultCitySimConfig(days));
      assert.equal(res.days.length, days, `Nhật ký đủ ${days} ngày`);
      assert.ok(res.finalLevel >= 6, `Sau ${days} ngày phải lên được ≥ cấp 6 (thực tế cấp ${res.finalLevel})`);
      assert.ok(res.levelUps >= 5, `Có ít nhất 5 lần lên cấp (thực tế ${res.levelUps})`);

      // cityTier trong mọi nhật ký đúng min(5, floor(level/2)) và không bao giờ giảm khi lên.
      let prevTier = -1;
      let prevLevel = 1;
      for (const d of res.days) {
        assert.equal(d.cityTier, cityTierFromCityLevel(d.level), `cityTier ngày ${d.day} theo D3`);
        assert.ok(d.level >= prevLevel, `Cấp không bao giờ giảm (ngày ${d.day})`);
        assert.ok(d.cityTier >= prevTier, `cityTier không tụt (ngày ${d.day})`);
        prevLevel = d.level;
        prevTier = d.cityTier;
      }
      assert.equal(res.days[days - 1].cityTier, cityTierFromCityLevel(res.finalLevel));
    }
  }
  console.log('  ✓ Sim 60–90 ngày lên cấp, cityTier không tụt, đúng min(5, floor(level/2))');

  // 2. Mục tiêu cấp thấp đạt bằng chơi thường (không bị chặn): cấp 1 xong trong vài ngày đầu.
  console.log('\n--- Test: mục tiêu cấp thấp đạt được bằng chơi thường (không bị chặn) ---');
  {
    const res = simulateGoalProgression(defaultCitySimConfig(90));
    const lvl2Day = res.daysToLevelN[2];
    assert.ok(lvl2Day !== undefined, 'Đạt tới cấp 2');
    assert.ok(lvl2Day! < 30, `Cấp 2 đạt trong vòng 30 ngày (ngày ${lvl2Day}) — cấp thấp không bị chặn`);
  }
  console.log('  ✓ Cấp 1 đạt được bằng chơi thường, lên cấp 2 trong 30 ngày đầu');

  // 3. Điều kiện cấp thành phố cho đợt khai hoang: ngày đạt đủ cấp để mở W2/4/6/8.
  console.log('\n--- Test: điều kiện cấp W qua mô phỏng ---');
  {
    const res = simulateGoalProgression(defaultCitySimConfig(90));
    // Simple check: metrics của mỗi ngày có waves_opened = wavesOpenedForCityLevel(level ngày đó).
    for (const d of res.days) {
      assert.equal(
        d.metrics.waves_opened,
        wavesOpenedForCityLevel(d.level),
        `Ngày ${d.day} (cấp ${d.level}) số đợt mở đúng theo cấp`,
      );
    }
    // Khi cấp đạt 2/4/6/8 thì đợt tương ứng mở được.
    assert.equal(wavesOpenedForCityLevel(CITY_LEVEL_WAVE_REQUIREMENT.w2), 2);
    assert.equal(wavesOpenedForCityLevel(CITY_LEVEL_WAVE_REQUIREMENT.w4), 4);
    assert.equal(wavesOpenedForCityLevel(6), 3);
    assert.equal(wavesOpenedForCityLevel(8), 4);
    // Sim thực sự chạm tới cấp đủ mở các đợt.
    assert.ok(res.finalLevel >= 8, `Mô phỏng đạt cấp đủ mở W4 (cấp ${res.finalLevel})`);
  }
  console.log('  ✓ Số đợt mở đúng theo cấp thành phố; mô phỏng chạm cấp đủ mở W2/4/6/8');

  // 4. Nhật ký từng ngày có completedGoalIds và tổng thưởng dương.
  console.log('\n--- Test: nhật ký ngày & tổng thưởng ---');
  {
    const res = simulateGoalProgression(defaultCitySimConfig(90));
    const day1 = res.days[0];
    assert.ok(Array.isArray(day1.completedGoalIds));
    assert.ok((res.totalRewards.gold ?? 0) > 0, 'Có thưởng vàng cộng dồn qua các lần lên cấp');
    assert.equal(res.days[0].level, 1, 'Bắt đầu ở cấp 1');
    assert.ok(res.daysToLevelN[1] === 1, 'Cấp 1 có sẵn ngày 1');
  }
  console.log('  ✓ Nhật ký ngày và tổng thưởng hợp lệ');

  // 5. district food multiplier không vượt trần (bổ trợ phạm vi 1.4).
  console.log('\n--- Test: simulateDistrictFoodMultiplier không vượt DISTRICT_FOOD_CAP ---');
  {
    // D2 hệ số: preferred 1.4 × peak 1.3 = 1.82 < 2.0 (không vượt trần).
    const base = simulateDistrictFoodMultiplier({ preferred: 1.4, peak: 1.3 });
    assert.ok(Math.abs(base.raw - 1.4 * 1.3) < 1e-9, 'Tích thô = preferred×peak');
    assert.equal(base.exceeded, false, '1.4×1.3 dưới trần');
    assert.equal(base.capped, base.raw, 'Không bị kẹp khi dưới trần');

    // Thêm cụm (×1.2 → 2.184) vượt trần → bị kẹp về DISTRICT_FOOD_CAP.
    const over = simulateDistrictFoodMultiplier({ preferred: 1.4, peak: 1.3, cluster: 1.2 });
    assert.equal(over.exceeded, true, 'Tích vượt trần');
    assert.equal(over.capped, DISTRICT_FOOD_CAP, 'Bị kẹp về trần');

    // Dưới trần luôn ≤ cap ở mọi trường hợp.
    for (const opts of [
      { preferred: 1.2, peak: 1.2, cluster: 1.1 },
      { preferred: 1.0 },
      { peak: 1.3 },
    ] as Array<{ preferred?: number; peak?: number; cluster?: number }>) {
      const r = simulateDistrictFoodMultiplier(opts);
      assert.ok(r.capped <= DISTRICT_FOOD_CAP, 'Không vượt trần');
    }
  }

  // 6. citySimMetricsForDay tự kiểm: weekly_revenue = 7 ngày gần nhất (không có doanh thu trước ngày 1).
  console.log('\n--- Test: metric doanh thu tuần ---');
  {
    const cfg = defaultCitySimConfig(10);
    const m1 = citySimMetricsForDay(cfg, 1, 1);
    assert.equal(m1.weekly_revenue, cfg.dailyCustomers(1, 1) * cfg.revenuePerCustomer, 'Ngày 1 chỉ có 1 ngày doanh thu');
    const m7 = citySimMetricsForDay(cfg, 7, 1);
    let expected = 0;
    for (let d = 1; d <= 7; d++) expected += cfg.dailyCustomers(d, 1) * cfg.revenuePerCustomer;
    assert.equal(m7.weekly_revenue, expected, 'Tuần đủ 7 ngày');
  }

  console.log('\n🎉 TOÀN BỘ KIỂM THỬ MÔ PHỎNG TIẾN ĐỘ THÀNH PHỐ ĐÃ ĐẠT!');
  console.log(`  (Catalog gồm ${CITY_GOALS_CATALOG.length} mục tiêu cấp 1–10 — xem CITY_GOALS_CATALOG)`);
}
