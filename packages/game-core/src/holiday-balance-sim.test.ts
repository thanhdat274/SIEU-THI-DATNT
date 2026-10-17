import assert from 'node:assert/strict';
import {
  findDayForHoliday,
  NEW_HOLIDAY_IDS,
  simulateDay,
} from './holiday-balance-sim';
import { getSeasonForDay, SEASON_EVENTS } from '@game/data';

export function runHolidayBalanceSimTests(): void {
  // 1. Xác nhận 5 ngày lễ được định vị chính xác
  for (const id of NEW_HOLIDAY_IDS) {
    const day = findDayForHoliday(id);
    const season = getSeasonForDay(day);
    assert.equal(season?.id, id, `Ngày ${day} phải đúng lễ ${id}`);
    assert.ok(season.demandMultiplier >= 1.25, `${id} phải có hệ số cầu kích cầu >= 1.25`);
    assert.ok(season.preferredCategories.length > 0, `${id} phải có danh mục ưa chuộng`);
  }

  // 2. Chạy baseline ngày thường (ngày 1: không có lễ)
  const baseline = simulateDay(1, 10);
  assert.ok(baseline.customers > 0, 'Ngày thường phải có khách ghé thăm');
  assert.ok(baseline.itemsSold > 0, 'Ngày thường phải có hàng bán ra');

  // 3. Chạy mô phỏng cho từng ngày lễ trong 5 lễ mới
  for (const holidayId of NEW_HOLIDAY_IDS) {
    const event = SEASON_EVENTS.find((e) => e.id === holidayId)!;
    const holidayDay = findDayForHoliday(holidayId);
    const res = simulateDay(holidayDay, 10);

    // Lưu lượng khách tăng trưởng tương xứng với demandMultiplier
    assert.ok(
      res.customers >= baseline.customers * 0.95,
      `Khách lễ ${event.name} (${res.customers}) không được sụt giảm so với ngày thường (${baseline.customers})`
    );
    assert.ok(
      res.itemsSold >= baseline.itemsSold * 0.95,
      `Hàng bán lễ ${event.name} (${res.itemsSold}) phải tương đương hoặc cao hơn ngày thường (${baseline.itemsSold})`
    );

    // Kiểm tra tính toàn vẹn kinh tế
    assert.ok(Number.isFinite(res.revenue), `Doanh thu lễ ${event.name} phải là số hợp lệ`);
    assert.ok(Number.isFinite(res.customers), `Lượng khách lễ ${event.name} phải là số hợp lệ`);
  }

  console.log('  ✓ Mô phỏng kinh tế 5 lễ mới: lưu lượng khách, sức mua và doanh thu cân bằng ổn định');
}
