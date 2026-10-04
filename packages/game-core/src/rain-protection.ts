import { WEATHER_CONFIG } from '@game/data';
import { hashSeed } from './weather';

export type RainProtection = 'none' | 'umbrella' | 'raincoat';

/** Hồ sơ cố định của một người: cùng id + ngày cho cùng lựa chọn, nên mỗi người một khác nhưng không giật khi mưa dao động. */
export function rainGearProfile(characterId: string, day: number): { roll: number; trigger: number; coatColor: string; umbrellaColor: string } {
  const c = WEATHER_CONFIG.protection;
  const h = (salt: string) => (hashSeed(`${characterId}:${day}:${salt}`) % 10000) / 10000;
  return {
    roll: h('pick'),
    trigger: c.triggerMin + h('trigger') * (c.triggerMax - c.triggerMin),
    coatColor: c.raincoatColors[Math.floor(h('coat') * c.raincoatColors.length) % c.raincoatColors.length],
    umbrellaColor: c.umbrellaColors[Math.floor(h('umb') * c.umbrellaColors.length) % c.umbrellaColors.length],
  };
}

/**
 * Đồ che mưa người này dùng khi ở ngoài trời. Chưa mưa: không. Mưa nhẹ: tỉ lệ ô/áo mưa/vẫn đi bình thường, mỗi người
 * che ở ngưỡng mưa riêng. Mưa vừa trở lên (kể cả giông): ai cũng che bằng ô hoặc áo mưa. Trong nhà gọi hàm này không cần:
 * nơi vẽ tự đóng ô khi người ở trong công trình.
 */
export function getRainProtection(weather: { rainIntensity: number }, character: { id: string }, day: number): RainProtection {
  const c = WEATHER_CONFIG.protection;
  const rain = weather.rainIntensity;
  if (!(rain >= c.minRain)) return 'none';
  const p = rainGearProfile(character.id, day);
  const l = c.light;
  const total = l.umbrella + l.raincoat + l.none;
  const r = p.roll * total;
  // Loại đồ che chọn một lần theo ô số; phần 'none' của mưa nhẹ chỉ che khi mưa lên mức vừa (chia theo tỉ lệ mưa vừa).
  let kind: RainProtection = r < l.umbrella ? 'umbrella' : r < l.umbrella + l.raincoat ? 'raincoat' : 'none';
  if (rain >= WEATHER_CONFIG.rainTiers.normal) {
    if (kind === 'none') kind = (r - l.umbrella - l.raincoat) / l.none < c.normal.umbrella / (c.normal.umbrella + c.normal.raincoat) ? 'umbrella' : 'raincoat';
    return kind;
  }
  return kind !== 'none' && rain >= p.trigger ? kind : 'none';
}

/**
 * Hệ số đi nhanh của NPC ngoài trời theo cường độ mưa (nhẹ vẫn 1,00; mưa vừa 1,05; to 1,10; giông 1,15), nội suy theo
 * mốc `WEATHER_CONFIG.rainTiers` để không nhảy bậc.
 */
export function rainSpeedMultiplier(rain: number): number {
  const t = WEATHER_CONFIG.rainTiers;
  const r = Number.isFinite(rain) ? Math.max(0, Math.min(1, rain)) : 0;
  const m = WEATHER_CONFIG.rainWalkSpeed;
  if (r < t.light) return m.clear;
  if (r < t.normal) return m.clear + (m.rain - m.clear) * ((r - t.light) / (t.normal - t.light));
  if (r < t.heavy) return m.rain + (m.heavy - m.rain) * ((r - t.normal) / (t.heavy - t.normal));
  return m.heavy + (m.storm - m.heavy) * ((r - t.heavy) / (1 - t.heavy));
}

export type UmbrellaAnimState = 'closed' | 'opening' | 'open_idle' | 'open_walk' | 'wind_light' | 'wind_strong' | 'closing';

/** Trạng thái hoạt ảnh ô: mở/đóng theo `open` (0..1) đang tiến tới `wantOpen`; khi đã mở thì theo gió, rồi đi/đứng. */
export function umbrellaAnimState(open: number, wantOpen: boolean, walking: boolean, wind: number): UmbrellaAnimState {
  if (wantOpen && open < 1) return 'opening';
  if (!wantOpen && open > 0) return 'closing';
  if (!wantOpen) return 'closed';
  if (wind >= 0.6) return 'wind_strong';
  if (wind >= 0.25) return 'wind_light';
  return walking ? 'open_walk' : 'open_idle';
}
