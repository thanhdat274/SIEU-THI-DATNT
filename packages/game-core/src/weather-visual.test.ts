import assert from 'node:assert/strict';
import { WEATHER_CONFIG } from '@game/data';
import { WeatherVisualModel, rainVelocity, weatherTypeOf, windSway, type WeatherVisualInput } from './weather-visual';

const calm: WeatherVisualInput = { rain: 0, rainAhead: 0, weatherId: 'sunny', day: 5, wetness: 0 };

function run(model: WeatherVisualModel, seconds: number, input: WeatherVisualInput = calm, onStep?: (t: number) => void) {
  let state = model.getState();
  for (let t = 0; t < seconds; t += 0.05) { state = model.update(0.05, input); onStep?.(t); }
  return state;
}

export function runWeatherVisualTests(): void {
  // Nắng → giông: không nhảy ngay, mây lên trước mưa
  const m = new WeatherVisualModel('t1');
  run(m, 5);
  m.transitionWeather('storm', 20_000);
  const early = run(m, 2);
  assert.ok(early.rainIntensity < 0.2, 'Sau 2s chưa được mưa lớn');
  assert.notEqual(early.type, 'storm');
  let cloudLeads = false;
  const mid = run(m, 6, calm, () => { const s = m.getState(); if (s.cloudIntensity > 0.4 && s.rainIntensity < s.cloudIntensity - 0.25) cloudLeads = true; });
  assert.ok(cloudLeads, 'Mây dày lên trước khi mưa');
  assert.ok(mid.windIntensity > early.windIntensity - 0.01);
  const end = run(m, 25);
  assert.equal(end.type, 'storm');
  assert.ok(end.rainIntensity > 0.95 && end.cloudIntensity > 0.95);

  // Mưa to → nắng: vũng nước không biến mất ngay
  m.transitionWeather('clear', 10_000);
  const after10 = run(m, 10);
  assert.ok(after10.rainIntensity < 0.05, 'Mưa đã tạnh');
  assert.ok(after10.puddleLevel > 0.5, 'Vũng nước còn đọng sau khi tạnh');
  const after60 = run(m, 50);
  assert.ok(after60.puddleLevel < after10.puddleLevel, 'Nước cạn dần');

  // Nhánh theo mô phỏng: mưa tăng dần theo cường độ sim, mây đi trước
  const sim = new WeatherVisualModel('t2');
  run(sim, 5);
  const s1 = run(sim, 3, { rain: 0, rainAhead: 0.6, weatherId: 'rainy', day: 5, wetness: 0 });
  assert.ok(s1.cloudIntensity > 0.2, 'Mưa sắp tới làm trời kéo mây');
  assert.ok(s1.rainIntensity < 0.05);

  // Sấm chớp: chỉ khi giông, chớp ngắn, sấm trễ 0,5-3 s, tái hiện theo hạt giống
  const trace = (seed: string) => {
    const model = new WeatherVisualModel(seed);
    model.transitionWeather('storm', 100);
    const events: string[] = [];
    let maxFlashRun = 0; let flashRun = 0;
    let firstFlash = -1; let firstThunder = -1; let clock = 0;
    const storm: WeatherVisualInput = { rain: 1, rainAhead: 1, weatherId: 'storm', day: 5, wetness: 1 };
    for (let i = 0; i < 20 * 120; i++) {
      clock += 0.05;
      const s = model.update(0.05, storm);
      if (s.lightningIntensity > 0) { flashRun += 0.05; maxFlashRun = Math.max(maxFlashRun, flashRun); if (firstFlash < 0) firstFlash = clock; } else flashRun = 0;
      for (const th of model.consumeThunders()) { if (firstThunder < 0) firstThunder = clock; events.push(`${clock.toFixed(2)}:${th.strength.toFixed(2)}`); }
    }
    return { events, maxFlashRun, firstFlash, firstThunder };
  };
  const a = trace('seed-a');
  assert.ok(a.events.length >= 2, 'Có sấm trong giông');
  assert.ok(a.maxFlashRun <= 0.45, 'Mỗi loạt chớp rất ngắn');
  assert.ok(a.firstThunder - a.firstFlash >= WEATHER_CONFIG.lightning.thunderDelayMin - 0.1, 'Sấm đến sau chớp');
  assert.deepEqual(trace('seed-a').events, a.events, 'Cùng hạt giống cho cùng chuỗi sấm');
  const clear = new WeatherVisualModel('t3');
  let flashed = false;
  run(clear, 60, { ...calm, rain: 0.3, weatherId: 'rainy' }, () => { if (clear.getState().lightningIntensity > 0) flashed = true; });
  assert.equal(flashed, false, 'Không chớp khi chỉ mưa vừa');

  // Hướng gió: mưa và mọi thứ dùng cùng hướng; 0 = trái sang phải
  const v0 = rainVelocity(0.5, 0.6, 0);
  assert.ok(v0.vx > 0, 'Hướng 0 đẩy mưa sang phải');
  const vPi = rainVelocity(0.5, 0.6, Math.PI);
  assert.ok(vPi.vx < 0);
  assert.ok(rainVelocity(0.5, 0.9, 0).vx > rainVelocity(0.5, 0.2, 0).vx, 'Gió càng mạnh mưa càng xiên');
  assert.equal(rainVelocity(0.5, 0, 0).vx, 0);

  // Phản ứng theo loại vật: công trình không rung, lá mạnh hơn cây
  for (let t = 0; t < 10; t += 0.3) assert.equal(windSway('building', 1, t, 1), 0);
  let leaf = 0; let tree = 0;
  for (let t = 0; t < 20; t += 0.1) { leaf = Math.max(leaf, Math.abs(windSway('leaf', 0.8, t, 0))); tree = Math.max(tree, Math.abs(windSway('tree', 0.8, t, 0))); }
  assert.ok(leaf > tree);

  // Phân loại và dữ liệu bẩn
  assert.equal(weatherTypeOf(0, 0.05, 0.1, false), 'clear');
  assert.equal(weatherTypeOf(0.2, 0.1, 0.7, false), 'rain_light');
  assert.equal(weatherTypeOf(0.5, 0.3, 0.8, false), 'rain');
  assert.equal(weatherTypeOf(0.9, 0.9, 1, true), 'storm');
  assert.equal(weatherTypeOf(0.9, 0.5, 1, false), 'rain_heavy');
  assert.equal(weatherTypeOf(0, 0.8, 0.5, false), 'wind_strong');
  const bad = new WeatherVisualModel('t4');
  const s = bad.update(Number.NaN, { rain: Number.NaN, rainAhead: -5, weatherId: 'unknown', day: 1, wetness: Number.POSITIVE_INFINITY });
  for (const value of [s.rainIntensity, s.windIntensity, s.cloudIntensity, s.darkness, s.puddleLevel]) assert.ok(Number.isFinite(value) && value >= 0 && value <= 1);
}
