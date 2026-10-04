import assert from 'node:assert/strict';
import { MAP_WIDTH, ROAD_PROFILE, STORM_DRAINS, generateStarterTileMap } from '@game/data';
import { STREET_LANE_LEFT_Y, STREET_LANE_RIGHT_Y } from './street-traffic';
import { rainDayProfile, roadWetnessAt, ROAD_DRY_TAU_MINUTES } from './weather';

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
}

const peakWetMinute = (centerMinute: number) => Math.round(centerMinute);
