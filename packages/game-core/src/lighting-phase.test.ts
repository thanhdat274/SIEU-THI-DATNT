import assert from 'node:assert/strict';
import { getLightingState, getSeasonalSunTimes, getSolarPosition } from './lighting-phase';
import { SEASON_YEAR_DAYS } from '@game/data';

export function runLightingPhaseTests(): void {
  const noon = getLightingState(12);
  const midnight = getLightingState(0);
  assert.equal(noon.sun, 1);
  assert.equal(noon.artificial, 0, 'Trưa không cần đèn nhân tạo');
  assert.equal(midnight.sun, 0);
  assert.equal(midnight.artificial, 1, 'Đêm đèn nhân tạo là nguồn sáng chính');
  const brightness = (c: number) => ((c >> 16) & 255) + ((c >> 8) & 255) + (c & 255);
  assert.ok(brightness(midnight.outdoor) < brightness(midnight.indoor), 'Đêm trong nhà sáng hơn ngoài trời');
  // Chuyển pha liên tục: mỗi 15 phút không nhảy quá nhiều.
  let prev = getLightingState(0);
  for (let m = 15; m <= 24 * 60; m += 15) {
    const cur = getLightingState(Math.floor(m / 60) % 24, m % 60);
    assert.ok(Math.abs(cur.sun - prev.sun) < 0.25 && Math.abs(cur.artificial - prev.artificial) < 0.3, `Không nhảy đột ngột lúc ${m / 60}h`);
    assert.ok(Math.abs(brightness(cur.outdoor) - brightness(prev.outdoor)) < 110, `Màu ngoài trời mượt lúc ${m / 60}h`);
    prev = cur;
  }
  const dusk = getLightingState(18, 30);
  assert.ok(dusk.artificial > getLightingState(16).artificial && dusk.sun < getLightingState(16).sun, 'Chiều tối: đèn tăng, nắng giảm');
  assert.ok(getLightingState(17, 30).shadowLength > noon.shadowLength, 'Bóng chiều dài hơn trưa');
  assert.ok(getLightingState(8).shadowLean < 0 && getLightingState(17).shadowLean > 0, 'Bóng đổi hướng sáng/chiều');
  assert.deepEqual(getLightingState(24), getLightingState(0), 'Giờ 24 nối liền giờ 0');
  // Mốc mọc/lặn theo mùa: xác định, nối năm mượt, độ dài ngày hợp lý, mọc sớm nhất khác lặn muộn nhất.
  assert.deepEqual(getSeasonalSunTimes(37), getSeasonalSunTimes(37), 'Cùng ngày cho cùng mốc');
  let earliestRise = { d: 1, v: 99 }, latestSet = { d: 1, v: 0 };
  for (let d = 1; d <= SEASON_YEAR_DAYS; d++) {
    const cur = getSeasonalSunTimes(d), next = getSeasonalSunTimes(d + 1);
    const len = cur.sunset - cur.sunrise;
    assert.ok(len >= 11 && len <= 13, `Độ dài ngày hợp lý ở ngày ${d}`);
    assert.ok(Math.abs(next.sunrise - cur.sunrise) * 60 <= 3 && Math.abs(next.sunset - cur.sunset) * 60 <= 3, `Mốc đổi mượt giữa ngày ${d} và ${d + 1}`);
    if (cur.sunrise < earliestRise.v) earliestRise = { d, v: cur.sunrise };
    if (cur.sunset > latestSet.v) latestSet = { d, v: cur.sunset };
  }
  assert.notEqual(earliestRise.d, latestSet.d, 'Mọc sớm nhất và lặn muộn nhất không trùng ngày');
  const y1 = getSeasonalSunTimes(5), y2 = getSeasonalSunTimes(5 + SEASON_YEAR_DAYS);
  assert.deepEqual(y1, y2, 'Năm kế tiếp lặp lại mốc');
  // Vị trí mặt trời.
  const juneDay = 34, decDay = 94; // doy 55 (giữa tháng 6) và doy 115 (giữa tháng 12) của năm 120 ngày
  for (const day of [1, juneDay, decDay]) {
    const { sunrise, sunset } = getSeasonalSunTimes(day);
    const at = (h: number) => getSolarPosition(Math.floor(h), Math.round((h % 1) * 60), day);
    assert.ok(Math.abs(at(sunrise).elevation) < 0.03 && Math.abs(at(sunset).elevation) < 0.03, `Độ cao ≈ 0 lúc mọc/lặn, ngày ${day}`);
    let peak = { h: 0, e: -9 };
    for (let m = 0; m < 24 * 60; m += 5) { const e = getSolarPosition(Math.floor(m / 60), m % 60, day).elevation; if (e > peak.e) peak = { h: m / 60, e }; }
    assert.ok(Math.abs(peak.h - 12) <= 5 / 60, `Đỉnh lúc 12:00, ngày ${day}`);
    assert.ok(at(0).elevation < 0 && at(23.9).elevation < 0, `Độ cao âm ban đêm, ngày ${day}`);
    const am = at(8), pm = at(17);
    assert.ok(am.azimuth > 0 && am.azimuth < Math.PI && pm.azimuth > Math.PI, `Sáng ở đông, chiều ở tây, ngày ${day}`);
    assert.ok(am.shadowDir.x < 0 && pm.shadowDir.x > 0, `Bóng ngả tây sáng, đông chiều, ngày ${day}`);
    assert.ok(Math.abs(Math.hypot(am.shadowDir.x, am.shadowDir.y) - 1) < 1e-9, 'shadowDir là vector đơn vị');
  }
  assert.ok(getSolarPosition(12, 0, juneDay).shadowDir.y > 0, 'Tháng 6: mặt trời lệch bắc, bóng trưa ngả nam');
  assert.ok(getSolarPosition(12, 0, decDay).shadowDir.y < 0, 'Tháng 12: mặt trời lệch nam, bóng trưa ngả bắc');
  assert.deepEqual(getSolarPosition(24, 0, 10), getSolarPosition(0, 0, 10), 'Giờ 24 nối liền giờ 0');
  assert.equal(getLightingState(8, 0, juneDay).sunElevation, getSolarPosition(8, 0, juneDay).elevation, 'LightingState mang vị trí mặt trời');
  console.log('  ✓ Passed: Ánh sáng theo giờ chuyển pha mượt (sáng, trưa, chiều, hoàng hôn, đêm)');
}
