import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, RAIN_BANDS, generateStarterTileMap, rainBandOf } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { describeRainForecast, formatMinuteOfDay, rainDayProfile, rainForecastForDay, rainIntensityAt } from './weather';

export function runRainTests(): void {
  console.log('\n--- Mưa: dải cường độ, hồ sơ trong ngày và dự báo khung giờ ---');
  assert.equal(rainBandOf(0).id, 'none');
  assert.equal(rainBandOf(0.02).id, 'none');
  assert.equal(rainBandOf(0.1).id, 'drizzle');
  assert.equal(rainBandOf(0.3).id, 'moderate');
  assert.equal(rainBandOf(0.6).id, 'heavy');
  assert.equal(rainBandOf(0.95).id, 'thunderstorm');
  assert.deepEqual(RAIN_BANDS.map(b => b.min), [...RAIN_BANDS.map(b => b.min)].sort((a, b) => a - b), 'Dải xếp theo ngưỡng tăng dần');

  assert.equal(rainDayProfile('s', 3, 'sunny'), null, 'Trời nắng không có hồ sơ mưa');
  assert.equal(rainForecastForDay('s', 3, 'cloudy'), null, 'Nhiều mây không dự báo mưa');
  assert.deepEqual(rainDayProfile('s', 9, 'rainy'), rainDayProfile('s', 9, 'rainy'), 'Hồ sơ mưa xác định theo hạt giống + ngày');

  const bandsSeen = new Set<string>();
  for (const weatherId of ['rainy', 'heavy_rain', 'storm']) {
    for (let day = 1; day <= 120; day++) {
      const seed = `seed-${day % 7}`;
      const profile = rainDayProfile(seed, day, weatherId)!;
      const forecast = rainForecastForDay(seed, day, weatherId)!;
      assert.ok(profile.peak > 0 && profile.peak <= 1, 'Đỉnh mưa trong 0..1');
      assert.equal(forecast.band, rainBandOf(profile.peak).id, 'Dải dự báo theo đỉnh mưa');
      assert.ok(forecast.startMinute < forecast.endMinute && forecast.startMinute >= 0 && forecast.endMinute <= 1440, 'Khung giờ hợp lệ');
      assert.equal(forecast.startMinute % 15, 0, 'Khung giờ làm tròn 15 phút');
      const centerHour = Math.floor(profile.centerMinute / 60), centerMinute = Math.round(profile.centerMinute % 60);
      const atPeak = rainIntensityAt(seed, day, centerHour, centerMinute, weatherId);
      assert.ok(Math.abs(atPeak - profile.peak) < 0.02, 'Đỉnh mưa đạt đúng cường độ đỉnh');
      const at = (minute: number) => rainIntensityAt(seed, day, Math.floor(minute / 60), minute % 60, weatherId);
      assert.ok(at(forecast.startMinute) <= profile.peak * 0.4 && at(forecast.endMinute) <= profile.peak * 0.4, 'Hai đầu cửa sổ mưa còn nhẹ (sai số làm tròn 15 phút)');
      assert.ok(at(Math.round(profile.centerMinute)) >= at(forecast.startMinute), 'Giữa cơn mưa mạnh hơn lúc bắt đầu');
      const dry = Math.floor(profile.centerMinute - profile.halfDuration) - 1;
      if (dry >= 0) assert.equal(at(dry), 0, 'Trước đường cong mưa thì không mưa');
      bandsSeen.add(forecast.band);
    }
  }
  for (const id of ['drizzle', 'moderate', 'heavy', 'thunderstorm']) assert.ok(bandsSeen.has(id), `Cả năm có ngày thuộc dải ${id}`);
  assert.equal(rainIntensityAt('s', 3, 12, 0, 'sunny'), 0, 'Nắng thì cường độ 0');

  assert.equal(formatMinuteOfDay(14 * 60 + 15), '14:15');
  assert.equal(describeRainForecast(null), '');
  assert.equal(describeRainForecast({ band: 'moderate', bandLabel: 'Mưa vừa', peak: 0.4, startMinute: 14 * 60, endMinute: 16 * 60 + 15 }), 'Mưa vừa 14:00–16:15');
  // Bỏ nhãn dải khi trùng nhãn thời tiết (rain-intensity-forecast 4.3): "Mưa to (Mưa to 13:00–15:00)" → "Mưa to (13:00–15:00)".
  const heavy = { band: 'heavy' as const, bandLabel: 'Mưa to', peak: 0.6, startMinute: 13 * 60, endMinute: 15 * 60 };
  assert.equal(describeRainForecast(heavy, { omitWhenMatchingWeatherLabel: 'Mưa to' }), '13:00–15:00', 'Nhãn dải trùng nhãn thời tiết thì bỏ nhãn dải');
  assert.equal(describeRainForecast(heavy, { omitWhenMatchingWeatherLabel: 'Mưa' }), 'Mưa to 13:00–15:00', 'Nhãn dải khác nhãn thời tiết thì giữ nguyên');
  assert.equal(describeRainForecast(heavy), 'Mưa to 13:00–15:00', 'Không truyền label thì giữ nguyên');
  // Dự báo ngày mai trong simulation khớp với thực tế khi sang ngày.
  let checked = 0;
  for (let n = 0; n < 40 && checked < 2; n++) {
    const save = structuredClone(DEFAULT_INITIAL_SAVE);
    save.id = `rain-forecast-${n}`;
    const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());
    const tomorrow = sim.getMarketSummary().forecast[0];
    if (!tomorrow.rain) continue;
    assert.ok(tomorrow.rain.startMinute < tomorrow.rain.endMinute, 'Dự báo ngày mai có khung giờ');
    sim.getClock().advanceToNextDay();
    const today = sim.getMarketSummary();
    assert.equal(today.weather.id, tomorrow.id, 'Thời tiết hôm sau đúng dự báo');
    assert.deepEqual(today.weather.rain, tomorrow.rain, 'Khung giờ và dải mưa hôm sau đúng dự báo hôm trước');
    checked++;
  }
  assert.ok(checked >= 1, 'Tìm được ít nhất một seed có dự báo mưa để đối chiếu');
  console.log('  ✓ Passed: Mưa theo dải, khung giờ dự báo khớp đường cong mưa thực tế');
}
