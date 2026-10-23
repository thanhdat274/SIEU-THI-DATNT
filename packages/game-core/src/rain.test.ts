import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, RAIN_BANDS, RAIN_BAND_CUSTOMER_FACTOR, generateStarterTileMap, rainBandOf } from '@game/data';
import { createMarketState } from './market';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { FORECAST_PEAK_ERROR_PER_DAY, FORECAST_TIME_ERROR_PER_DAY, describeRainForecast, forecastRainForDay, formatMinuteOfDay, rainDayProfile, rainForecastForDay, rainIntensityAt } from './weather';

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
    // QA 19/10/2026: nhãn ngày mưa theo dải dự báo, không tự mâu thuẫn kiểu "Mưa to (Mưa vừa …)".
    assert.equal(tomorrow.label, tomorrow.rain.bandLabel, 'Nhãn dự báo khớp dải mưa dự báo');
    for (const f of sim.getMarketSummary().forecast) if (f.rain) assert.equal(f.label, f.rain.bandLabel, 'Mọi ngày dự báo mưa: nhãn = dải');
    sim.getClock().advanceToNextDay();
    const today = sim.getMarketSummary();
    assert.equal(today.weather.id, tomorrow.id, 'Thời tiết hôm sau đúng dự báo');
    // Dự báo có sai số (rain-intensity-forecast 4.4): ngày mai lệch trong biên một ngày; thời tiết thật không đổi.
    assert.ok(today.weather.rain, 'Hôm nay vẫn mưa như loại thời tiết dự báo');
    assert.ok(Math.abs(today.weather.rain!.peak - tomorrow.rain.peak) <= FORECAST_PEAK_ERROR_PER_DAY + 0.011, 'Đỉnh mưa dự báo ngày mai lệch trong biên');
    assert.ok(Math.abs(today.weather.rain!.startMinute - tomorrow.rain.startMinute) <= FORECAST_TIME_ERROR_PER_DAY + 15, 'Giờ mưa dự báo ngày mai lệch trong biên');
    checked++;
  }
  assert.ok(checked >= 1, 'Tìm được ít nhất một seed có dự báo mưa để đối chiếu');
  console.log('  ✓ Passed: Mưa theo dải, khung giờ dự báo khớp đường cong mưa thực tế');

  // ---- Dự báo có sai số: ngày xa sai nhiều hơn ngày gần; cùng seed cùng kết quả; hôm nay đúng ----
  {
    const err = (daysAhead: number) => {
      let peakErr = 0, timeErr = 0, n = 0;
      for (let day = 1; day <= 200; day++) {
        const truth = rainForecastForDay('fc-seed', day, 'heavy_rain')!;
        const fc = forecastRainForDay('fc-seed', day, 'heavy_rain', daysAhead)!;
        peakErr += Math.abs(fc.peak - truth.peak); timeErr += Math.abs(fc.startMinute - truth.startMinute); n++;
      }
      return { peak: peakErr / n, time: timeErr / n };
    };
    const d0 = err(0), d1 = err(1), d3 = err(3);
    assert.equal(d0.peak + d0.time, 0, 'Hôm nay (0 ngày) dự báo đúng thật');
    assert.ok(d1.peak < d3.peak, `Đỉnh: ngày mai sai ít hơn 3 ngày tới (${d1.peak.toFixed(3)} < ${d3.peak.toFixed(3)})`);
    assert.ok(d1.time < d3.time, `Giờ: ngày mai sai ít hơn 3 ngày tới (${d1.time.toFixed(1)} < ${d3.time.toFixed(1)} phút)`);
    assert.ok(d1.peak > 0, 'Ngày mai vẫn có sai số');
    assert.deepEqual(forecastRainForDay('fc-seed', 9, 'rainy', 2), forecastRainForDay('fc-seed', 9, 'rainy', 2), 'Cùng seed + ngày → cùng dự báo');
    assert.equal(forecastRainForDay('fc-seed', 9, 'sunny', 2), null, 'Ngày nắng không có dự báo mưa');
    assert.deepEqual(rainDayProfile('fc-seed', 9, 'rainy'), rainDayProfile('fc-seed', 9, 'rainy'), 'Thời tiết thật không đổi');
    console.log(`  ✓ Passed: Dự báo sai số tăng theo ngày (đỉnh ${d1.peak.toFixed(3)}→${d3.peak.toFixed(3)}, giờ ${d1.time.toFixed(0)}→${d3.time.toFixed(0)} phút)`);
  }

  // ---- Mưa to → ít khách: hệ số theo dải mưa đỉnh của ngày, nhân cạnh hội chợ W4 trong dòng khách từng tòa ----
  {
    const simOn = (day: number, heavy: boolean) => new GameSimulation({
      ...structuredClone(DEFAULT_INITIAL_SAVE),
      worldTime: { ...DEFAULT_INITIAL_SAVE.worldTime, day },
      market: { ...createMarketState('rain-traffic', day), events: heavy ? [{ id: 'heavy_rain_spell', startDay: day, endDay: day }] : [] },
    }, generateStarterTileMap(), new InputManager());
    let heavyDay = 0;
    for (let d = 2; d < 60 && !heavyDay; d++) if (simOn(d, true).getEffectiveWeatherId() === 'heavy_rain') heavyDay = d;
    assert.ok(heavyDay, 'Tìm được ngày mưa to (sự kiện ép thời tiết)');
    const wet = simOn(heavyDay, true);
    const expected = RAIN_BAND_CUSTOMER_FACTOR[rainBandOf(rainDayProfile(wet.getWeatherSeed(), heavyDay, 'heavy_rain')!.peak).id];
    assert.equal(wet.getRainCustomerFactor(), expected, 'Hệ số khách theo dải mưa đỉnh của ngày');
    assert.ok(expected < 1 && expected >= 0.5, `Mưa to giảm khách vừa phải (${expected})`);
    let dryDay = 0;
    for (let d = 2; d < 60 && !dryDay; d++) { const sim = simOn(d, false); if (!rainDayProfile(sim.getWeatherSeed(), d, sim.getEffectiveWeatherId())) dryDay = d; }
    assert.equal(simOn(dryDay, false).getRainCustomerFactor(), 1, 'Ngày không mưa: hệ số 1');
    // Thứ tự nhân trong dòng khách từng tòa: lô × sự kiện thành phố (hội chợ) × mưa.
    const stream = (wet as unknown as { buildingStreamTrafficMultiplier(): (id: string) => number }).buildingStreamTrafficMultiplier();
    for (const id of ['main', 'xoi', 'drink', 'snack']) {
      const parcel = (wet as unknown as { buildingParcelTrafficMultiplier(): (id: string) => number }).buildingParcelTrafficMultiplier()(id);
      assert.ok(Math.abs(stream(id) - (id === 'main' ? 1 : parcel) * wet.getBuildingWorldEventFactor(id) * expected) < 1e-12, `Dòng khách ${id} = lô × hội chợ × mưa`);
    }
    // Pha đêm: mưa chỉ rơi ban ngày (đỉnh ≤ ~14:30, nửa độ dài ≤ 155 phút) → ban đêm hệ số giờ không đổi gì, tiệm đóng.
    for (let d = 1; d <= 120; d++) for (const id of ['rainy', 'heavy_rain', 'storm']) assert.equal(rainIntensityAt('night', d, 22, 0, id), 0, 'Không mưa lúc 22:00');
    console.log(`  ✓ Passed: Mưa to giảm khách (hệ số ${expected}), nhân đúng thứ tự cạnh hội chợ; ban đêm không mưa`);
  }
}
