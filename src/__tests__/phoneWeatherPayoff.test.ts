import { describe, it, expect } from 'vitest';
import { phoneWeatherInfo } from '../data/phoneWeatherPayoff';
import { weatherPhoneMul } from '../data/phoneOrders';
import { fmtMul } from '../data/products';
import type { Weather } from '../data/weather';

/**
 * GĐ1309 — "Trời MƯA/GIÔNG là ngày XUI hay cơ hội?": soi kênh điện thoại đặt đơn tăng lên (reframe
 * mặt âm 'Giông, phần đông ở nhà' → cơ hội 'gọi đặt đơn ×1,5/×1,8'). Helper THUẦN ĐỌC dùng THẲNG
 * weatherPhoneMul (phoneOrders.ts:130) + lặp đúng chance phoneOrders.ts:144 (cận 0.65) — CHỈ đọc số
 * sẵn (Nguyên tắc c), không import store (co-op an toàn), không đổi kinh tế/save/seed (Luật 5).
 */
describe('GĐ1309 — phoneWeatherInfo (mưa/giông khách gọi đặt đơn nhiều hơn)', () => {
  it('trời NẮNG (mul 1) → null (không tăng cuộc gọi, không ồn)', () => {
    expect(phoneWeatherInfo('sunny', 30)).toBeNull();
    expect(phoneWeatherInfo('cloudy', 30)).toBeNull();
    expect(phoneWeatherInfo('fog', 30)).toBeNull();
  });

  it('MƯA → mul 1.5, chanceNow = base×1.5 (dưới trần 0.65), line có ×1,5', () => {
    const info = phoneWeatherInfo('rain', 5)!; // level 5: base 0.35 → ×1.5 = 0.525 < 0.65
    expect(info.mul).toBe(weatherPhoneMul('rain'));
    expect(info.mul).toBe(1.5);
    const base = Math.min(0.65, 0.3 + 5 * 0.01);
    expect(info.chanceBase).toBe(base);
    expect(info.chanceNow).toBe(base * 1.5);
    expect(info.line).toContain(`×${fmtMul(1.5)}`);
    expect(info.line).toContain('trực máy');
  });

  it('GIÔNG → mul 1.8, chanceNow cao hơn mưa (đúng hệ số sim)', () => {
    const rain = phoneWeatherInfo('rain', 5)!; // 0.35×1.5 = 0.525
    const storm = phoneWeatherInfo('storm', 5)!; // 0.35×1.8 = 0.63
    expect(storm.mul).toBe(1.8);
    expect(storm.chanceNow).toBe(storm.chanceBase * 1.8);
    expect(storm.chanceNow).toBeGreaterThan(rain.chanceNow);
    expect(storm.line).toContain('Giông');
  });

  it('cận TRUNG THỰC: level cao + mưa → chance bị chặn ở 0.65 (không vượt trần sim)', () => {
    const info = phoneWeatherInfo('storm', 60)!;
    // base = min(0.65, 0.3+0.6)=0.65; ×1.8 → cap 0.65
    expect(info.chanceBase).toBe(0.65);
    expect(info.chanceNow).toBe(0.65);
  });

  it('level càng cao → càng dễ có cuộc gọi (base tăng, đúng công thức)', () => {
    const low = phoneWeatherInfo('rain', 10)!;
    const high = phoneWeatherInfo('rain', 40)!;
    expect(high.chanceNow).toBeGreaterThan(low.chanceNow);
  });

  it('line ≤ 90 code point (không phình; là DÒNG PANEL không nguồn notify)', () => {
    for (const w of ['rain', 'storm'] as Weather[]) {
      const info = phoneWeatherInfo(w, 30)!;
      expect([...info.line].length).toBeLessThanOrEqual(90);
    }
  });

  it('THUẦN: cùng đầu vào ⇒ cùng kết quả (deterministic)', () => {
    expect(phoneWeatherInfo('storm', 25)).toEqual(phoneWeatherInfo('storm', 25));
    expect(phoneWeatherInfo('rain', 25)).toEqual(phoneWeatherInfo('rain', 25));
  });
});
