import assert from 'node:assert/strict';
import { MAP_WIDTH, ROAD_PROFILE, STORM_DRAINS, generateStarterTileMap } from '@game/data';
import { STREET_LANE_LEFT_Y, STREET_LANE_RIGHT_Y } from './street-traffic';
import { DEFAULT_INITIAL_SAVE, rainBandOf } from '@game/data';
import { validateSaveGameData } from '@game/shared';
import { InputManager } from './input';
import { createMarketState } from './market';
import { GameSimulation } from './simulation';
import { overnightRoadWetness, rainDayProfile, roadWetnessAt, ROAD_DRY_TAU_MINUTES } from './weather';

export function runRoadTests(): void {
  console.log('\n--- Mặt cắt lòng đường: dữ liệu bản đồ và độ ướt mặt đường ---');
  const map = generateStarterTileMap();
  const origin = map.originTileY ?? 0;
  const ground = map.layers.find(l => l.name === 'ground')!.data;
  const tileAt = (x: number, worldY: number) => ground[(worldY - origin) * map.width + x];

  // Hình học: bó vỉa ở hàng đường đầu tiên, hai làn bám đúng hàng của bộ điều khiển xe.
  assert.equal(tileAt(0, ROAD_PROFILE.kerbTileY), 1, 'Hàng bó vỉa là mặt đường');
  assert.equal(tileAt(0, ROAD_PROFILE.kerbTileY - 1), 2, 'Ngay trên bó vỉa là vỉa hè');
  assert.equal(Math.floor(STREET_LANE_LEFT_Y / 32), ROAD_PROFILE.kerbTileY, 'Làn trái nằm ở hàng bó vỉa');
  assert.equal(Math.floor(STREET_LANE_RIGHT_Y / 32), ROAD_PROFILE.centerLineTileY, 'Làn phải nằm ngay dưới vạch giữa');
  assert.equal(ROAD_PROFILE.centerLineTileY, ROAD_PROFILE.kerbTileY + 1, 'Vạch giữa ở biên hai làn');

  // Cửa thu nước: trong bản đồ và không trùng nhau.
  assert.equal(new Set(STORM_DRAINS.map(d => d.tileX)).size, STORM_DRAINS.length, 'Cửa thu nước không trùng ô');
  for (const drain of STORM_DRAINS) {
    assert.ok(drain.tileX > 0 && drain.tileX < MAP_WIDTH - 1, 'Cửa thu nước trong bản đồ');
  }


  // Độ ướt mặt đường.
  assert.equal(roadWetnessAt('s', 4, 12 * 60, 'sunny'), 0, 'Ngày khô thì mặt đường khô');
  assert.equal(roadWetnessAt('s', 4, 23 * 60, 'cloudy'), 0);
  const seeds = ['a', 'b', 'c', 'd'];
  for (const seed of seeds) {
    for (const weatherId of ['rainy', 'heavy_rain', 'storm']) {
      const day = 7;
      const profile = rainDayProfile(seed, day, weatherId)!;
      const at = (minute: number) => roadWetnessAt(seed, day, minute, weatherId);
      assert.equal(at(Math.max(0, Math.floor(profile.centerMinute - profile.halfDuration) - 10)), 0, 'Trước cơn mưa mặt đường khô');
      const peakWet = at(Math.round(profile.centerMinute));
      assert.ok(peakWet > 0 && peakWet <= 1, 'Độ ướt lúc đỉnh mưa trong (0, 1]');
      assert.ok(peakWet >= profile.peak, 'Mặt đường ướt không ít hơn cường độ mưa hiện tại');
      const afterEnd = Math.ceil(profile.centerMinute + profile.halfDuration);
      const justAfter = at(afterEnd + 5), later = at(afterEnd + 5 + ROAD_DRY_TAU_MINUTES), muchLater = at(Math.min(1439, afterEnd + 6 * ROAD_DRY_TAU_MINUTES));
      assert.ok(justAfter > 0 && justAfter <= peakWet, 'Ngay sau mưa mặt đường còn ướt');
      if (afterEnd + 5 + ROAD_DRY_TAU_MINUTES <= 1439) assert.ok(later < justAfter, 'Mặt đường khô dần sau mưa');
      assert.ok(muchLater <= later + 1e-9, 'Khô dần đơn điệu sau mưa');
      assert.equal(at(peakWetMinute(profile.centerMinute)), peakWet, 'Cùng đầu vào cho cùng độ ướt');
    }
  }
  console.log('  ✓ Passed: Mặt cắt đường khớp làn xe/cửa tiệm và mặt đường ướt rồi khô dần sau mưa');
  runOvernightWetnessTests();
}

/** road-cross-section-drainage 4.4: mưa to thì mặt đường còn ướt qua chốt ngày 06:00, sáng hôm sau khô dần; mưa nhẹ không giữ. */
function runOvernightWetnessTests(): void {
  // Mưa nhẹ/vừa (loại 'rainy', đỉnh ≤ 0,52 < ngưỡng mưa to) không bao giờ mang qua đêm.
  for (let d = 1; d <= 200; d++) assert.equal(overnightRoadWetness('wet-seed', d, 'rainy'), 0, 'Mưa nhẹ/vừa không giữ ướt qua đêm');
  for (let d = 1; d <= 200; d++) {
    const p = rainDayProfile('wet-seed', d, 'heavy_rain')!;
    const band = rainBandOf(p.peak).id;
    assert.equal(overnightRoadWetness('wet-seed', d, 'heavy_rain') > 0, band === 'heavy' || band === 'thunderstorm', 'Mưa to/giông thì giữ ướt');
  }

  const sim = (day: number, heavy: boolean) => new GameSimulation({
    ...structuredClone(DEFAULT_INITIAL_SAVE),
    worldTime: { ...DEFAULT_INITIAL_SAVE.worldTime, day, hour: 5, minute: 50 },
    market: { ...createMarketState('wet-overnight', day), events: heavy ? [{ id: 'heavy_rain_spell', startDay: day, endDay: day }] : [] },
  }, generateStarterTileMap(), new InputManager());
  // Ngày mưa to, ngày hôm sau không mưa (để thấy riêng phần mang qua đêm).
  let day = 0;
  for (let d = 2; d < 80 && !day; d++) {
    const s = sim(d, true);
    if (s.getEffectiveWeatherId() !== 'heavy_rain') continue;
    if (rainDayProfile(s.getWeatherSeed(), d + 1, s.getMarketSummary().forecast[0].id)) continue;
    day = d;
  }
  assert.ok(day, 'Tìm được ngày mưa to mà hôm sau khô');
  const crossDawn = (s: GameSimulation) => {
    for (let i = 0; i < 20000 && s.getTime().day === day; i++) s.update(0.25);
    assert.equal(s.getTime().day, day + 1, 'Qua 06:00 sang ngày mới');
  };
  const at = (s: GameSimulation, hour: number) => { s.getClock().setTime({ ...s.getTime(), hour, minute: 0 }); return s.getRoadWetness(); };

  const wet = sim(day, true);
  crossDawn(wet);
  const w7 = at(wet, 7), w10 = at(wet, 10), w15 = at(wet, 15);
  assert.ok(w7 > 0.15, `Sáng hôm sau mưa to: đường vẫn ướt (07:00 = ${w7.toFixed(3)})`);
  assert.ok(w10 < w7 && w15 < w10, `Khô dần trong ngày (${w7.toFixed(3)} → ${w10.toFixed(3)} → ${w15.toFixed(3)})`);
  assert.ok(w15 < 0.05, 'Chiều đã gần khô');

  // Lưu/nạp (co-op dùng chung save/replay): độ ướt mang sang nằm trong save schema 15 và cho cùng giá trị.
  wet.getClock().setTime({ ...wet.getTime(), hour: 8, minute: 0 });
  const save = wet.exportSaveData();
  assert.equal(save.schemaVersion, 15);
  assert.ok(save.roadWetnessCarry && save.roadWetnessCarry.day === day + 1 && save.roadWetnessCarry.value > 0, 'Save có roadWetnessCarry');
  const reloaded = new GameSimulation(save, generateStarterTileMap(), new InputManager());
  assert.equal(reloaded.getRoadWetness(), wet.getRoadWetness(), 'Nạp lại save: cùng độ ướt');

  // Ngày không mưa trước đó: sáng hôm sau khô.
  const dry = sim(day, false);
  if (!rainDayProfile(dry.getWeatherSeed(), day, dry.getEffectiveWeatherId())) {
    crossDawn(dry);
    assert.equal(at(dry, 7), 0, 'Hôm trước không mưa: sáng khô');
    assert.equal(dry.exportSaveData().roadWetnessCarry, undefined, 'Không có phần mang qua đêm');
  }

  // Save v14 → migrate lên 15 (không có trường = khô); trường hỏng bị bỏ.
  const v14 = { ...structuredClone(save), schemaVersion: 14 } as Record<string, unknown>;
  delete v14.roadWetnessCarry;
  const migrated = validateSaveGameData(v14);
  assert.equal(migrated.valid, true);
  assert.equal(migrated.data?.schemaVersion, 15, 'v14 → 15');
  const broken = validateSaveGameData({ ...v14, roadWetnessCarry: { day: 'x', value: 5 } });
  assert.equal(broken.data?.roadWetnessCarry, undefined, 'roadWetnessCarry hỏng bị bỏ khi migrate');
  console.log(`  ✓ Passed: Mưa to giữ ướt qua đêm (07:00 ${w7.toFixed(2)} → 15:00 ${w15.toFixed(2)}), lưu save 15; mưa nhẹ không giữ`);
}

const peakWetMinute = (centerMinute: number) => Math.round(centerMinute);
