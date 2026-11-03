import { describe, expect, it } from 'vitest';
import { WEATHER } from '../data/weather';
import { forecastTextOf, skyState } from '../ui/hudSky';

describe('GĐ953 — hudSky', () => {
  it('trời không có cơn mưa: icon theo thời tiết, không mưa', () => {
    const r = skyState(1, 3, 'sunny', 600);
    if (!r.spell) { expect(r.raining).toBe(false); expect(r.skyIcon).toBe(WEATHER.sunny.icon); }
  });
  it('ngày mưa: trong cơn → icon mưa, ngoài cơn → nhiều mây', () => {
    for (let seed = 1; seed < 200; seed++) {
      const probe = skyState(seed, 5, 'rain', 0);
      if (!probe.spell) continue;
      const { start, end } = probe.spell;
      expect(skyState(seed, 5, 'rain', start).raining).toBe(true);
      expect(skyState(seed, 5, 'rain', start).skyIcon).toBe(WEATHER.rain.icon);
      expect(skyState(seed, 5, 'rain', end).raining).toBe(false);
      expect(skyState(seed, 5, 'rain', end).skyIcon).toBe(WEATHER.cloudy.icon);
      return;
    }
    throw new Error('không tìm được seed có cơn mưa');
  });
  it('dự báo: Ngày mai rồi Ngày kia, mỗi dòng một ngày', () => {
    const t = forecastTextOf(1, 3, ['sunny', 'rain']).split('\n');
    expect(t).toHaveLength(2); expect(t[0]).toMatch(/^Ngày mai: /); expect(t[1]).toMatch(/^Ngày kia: /);
  });
});
