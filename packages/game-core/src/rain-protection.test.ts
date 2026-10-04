import assert from 'node:assert/strict';
import { getRainProtection, rainGearProfile } from './rain-protection';

export function runRainProtectionTests(): void {
  const ids = Array.from({ length: 400 }, (_, i) => `npc_${i}`);
  const count = (rain: number) => {
    const out = { none: 0, umbrella: 0, raincoat: 0 };
    for (const id of ids) out[getRainProtection({ rainIntensity: rain }, { id }, 3)]++;
    return out;
  };
  assert.deepEqual(count(0), { none: 400, umbrella: 0, raincoat: 0 }, 'Không mưa thì không ai che');
  const light = count(0.3);
  assert.ok(light.none > 20 && light.umbrella > 20 && light.raincoat > 20, 'Mưa nhẹ: có đủ ba hành vi');
  const normal = count(0.5);
  assert.equal(normal.none, 0, 'Mưa vừa: ai cũng che');
  assert.ok(normal.umbrella > normal.raincoat && normal.raincoat > 20);
  assert.equal(count(1).none, 0, 'Giông: ai cũng che');
  // Ổn định: cùng người, cùng ngày, cùng mưa cho cùng kết quả; mưa tăng thì không bỏ che
  for (const id of ids.slice(0, 50)) {
    assert.equal(getRainProtection({ rainIntensity: 0.2 }, { id }, 3), getRainProtection({ rainIntensity: 0.2 }, { id }, 3));
    if (getRainProtection({ rainIntensity: 0.2 }, { id }, 3) !== 'none') assert.equal(getRainProtection({ rainIntensity: 0.6 }, { id }, 3), getRainProtection({ rainIntensity: 0.2 }, { id }, 3), 'Giữ nguyên loại khi mưa to hơn');
  }
  assert.equal(getRainProtection({ rainIntensity: Number.NaN }, { id: 'x' }, 1), 'none');
  assert.ok(rainGearProfile('a', 1).coatColor.length > 0 && rainGearProfile('a', 1).umbrellaColor.length > 0);
}

import { rainSpeedMultiplier, umbrellaAnimState } from './rain-protection';
import { ambientMix } from './ambient-audio';
import { WeatherVisualModel } from './weather-visual';

export function runRainReactionTests(): void {
  assert.equal(rainSpeedMultiplier(0), 1);
  assert.equal(rainSpeedMultiplier(0.15), 1, 'Mưa nhẹ vẫn tốc độ thường');
  assert.ok(Math.abs(rainSpeedMultiplier(0.45) - 1.05) < 1e-9);
  assert.ok(Math.abs(rainSpeedMultiplier(0.75) - 1.1) < 1e-9);
  assert.ok(Math.abs(rainSpeedMultiplier(1) - 1.15) < 1e-9);
  assert.ok(rainSpeedMultiplier(0.6) > 1.05 && rainSpeedMultiplier(0.6) < 1.1, 'Nội suy, không nhảy bậc');
  assert.equal(rainSpeedMultiplier(Number.NaN), 1);

  assert.equal(umbrellaAnimState(0, false, false, 0), 'closed');
  assert.equal(umbrellaAnimState(0.4, true, true, 0), 'opening');
  assert.equal(umbrellaAnimState(0.4, false, true, 0), 'closing');
  assert.equal(umbrellaAnimState(1, true, false, 0.1), 'open_idle');
  assert.equal(umbrellaAnimState(1, true, true, 0.1), 'open_walk');
  assert.equal(umbrellaAnimState(1, true, true, 0.4), 'wind_light');
  assert.equal(umbrellaAnimState(1, true, true, 0.9), 'wind_strong');

  // Chim: trời quang nhiều nhất, giảm theo mây/mưa, im khi giông và ban đêm
  const mix = (o: { rain?: number; cloud?: number; wind?: number; hour?: number; roof?: number }) =>
    ambientMix({ rainIntensity: o.rain ?? 0, cloudIntensity: o.cloud ?? 0, windIntensity: o.wind ?? 0, hour: o.hour ?? 10, isStoreOpen: true, roofProximity: o.roof ?? 0 });
  const clear = mix({}).birds; const cloudy = mix({ cloud: 0.7 }).birds; const rainy = mix({ rain: 0.5, cloud: 0.8 }).birds;
  assert.ok(clear > cloudy && cloudy > rainy && rainy < 0.05, 'Chim nhỏ dần theo mây và mưa');
  assert.equal(mix({ rain: 1, cloud: 1, wind: 0.9 }).birds, 0, 'Giông thì im');
  assert.equal(mix({ hour: 23 }).birds, 0, 'Ban đêm không chim');
  // Mưa trên mái theo khoảng cách tới mái
  assert.equal(mix({ rain: 0.8, roof: 0 }).roof, 0);
  assert.ok(mix({ rain: 0.8, roof: 1 }).roof > mix({ rain: 0.8, roof: 0.3 }).roof);
  assert.ok(mix({ rain: 0.8, roof: 1 }).rain < mix({ rain: 0.8, roof: 0 }).rain, 'Dưới mái tiếng mưa ngoài trời nhỏ hơn');

  // Darkness override
  const m = new WeatherVisualModel('d');
  m.update(0.1, { rain: 0, rainAhead: 0, weatherId: 'sunny', day: 1, wetness: 0 });
  const auto = m.getState().darkness;
  m.setDarknessOverride(0.9);
  assert.equal(m.update(0.1, { rain: 0, rainAhead: 0, weatherId: 'sunny', day: 1, wetness: 0 }).darkness, 0.9);
  m.setDarknessOverride(null);
  assert.ok(Math.abs(m.update(0.1, { rain: 0, rainAhead: 0, weatherId: 'sunny', day: 1, wetness: 0 }).darkness - auto) < 0.05, 'Reset về tự động');
}
