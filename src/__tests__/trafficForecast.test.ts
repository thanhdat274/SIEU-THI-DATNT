import { describe, it, expect } from 'vitest';
import { trafficForecast, TRAFFIC_HOT, TRAFFIC_SLOW } from '../data/trafficForecast';
import { WEATHER } from '../data/weather';
import { customersPerDay } from '../data/levels';

describe('trafficForecast — định lượng lượt ghé theo thời tiết hôm nay/mai', () => {
  it('khách ước lượng = customersPerDay(level) × hệ số thời tiết', () => {
    const r = trafficForecast({ weather: 'sunny', tomorrow: 'sunny', level: 20 });
    const cpd = customersPerDay(20); // 100
    expect(r.todayTraffic).toBe(WEATHER.sunny.traffic); // 1.1
    expect(r.todayKhach).toBe(cpd * WEATHER.sunny.traffic);
    expect(r.tomorrowKhach).toBe(cpd * WEATHER.sunny.traffic);
  });

  it('giông bão vắng hơn nắng đẹp', () => {
    const hot = trafficForecast({ weather: 'sunny', tomorrow: 'sunny', level: 20 });
    const slow = trafficForecast({ weather: 'sunny', tomorrow: 'storm', level: 20 });
    expect(slow.tomorrowTraffic).toBeLessThan(hot.tomorrowTraffic);
    expect(slow.tomorrowTraffic).toBe(WEATHER.storm.traffic); // 0.55
  });

  it('nắng → hot (hệ số ≥ TRAFFIC_HOT)', () => {
    const r = trafficForecast({ weather: 'sunny', tomorrow: 'sunny', level: 20 });
    expect(r.tomorrowTraffic).toBeGreaterThanOrEqual(TRAFFIC_HOT);
    expect(r.verdict).toBe('hot');
  });

  it('bão → slow (hệ số ≤ TRAFFIC_SLOW)', () => {
    const r = trafficForecast({ weather: 'sunny', tomorrow: 'storm', level: 20 });
    expect(r.tomorrowTraffic).toBeLessThanOrEqual(TRAFFIC_SLOW);
    expect(r.verdict).toBe('slow');
  });

  it('mưa 0.8 rơi giữa bão và nắng', () => {
    const rainR = trafficForecast({ weather: 'sunny', tomorrow: 'rain', level: 20 });
    const sunnyR = trafficForecast({ weather: 'sunny', tomorrow: 'sunny', level: 20 });
    const stormR = trafficForecast({ weather: 'sunny', tomorrow: 'storm', level: 20 });
    expect(rainR.tomorrowTraffic).toBe(WEATHER.rain.traffic); // 0.8
    expect(rainR.tomorrowTraffic).toBeGreaterThan(stormR.tomorrowTraffic);
    expect(rainR.tomorrowTraffic).toBeLessThan(sunnyR.tomorrowTraffic);
  });
});
