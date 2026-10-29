import { describe, it, expect } from 'vitest';
import {
  lanternGlow, storefrontLanternProblems, STOREFRONT_LANTERN_POS, GLOW_NODE,
} from '../world/storefrontLantern';

describe('storefrontLantern (gđ177 Đầu ngõ lên đèn)', () => {
  it('lanternGlow: 0 khi trưa, sáng dần chập tối, sáng hẳn đêm, tắt lúc tang sáng', () => {
    // 6h sáng (360) → vừa tắt: hour 6 > 5.5
    expect(lanternGlow(360)).toBe(0);
    // 12h (720) → 0
    expect(lanternGlow(720)).toBe(0);
    // 17h (1020) → vừa bật (0), 17h30 (1050) → 0.5, 18h (1080) → 1
    expect(lanternGlow(1020)).toBe(0);
    expect(lanternGlow(1050)).toBe(0.5);
    expect(lanternGlow(1080)).toBe(1);
    // Đêm sâu (23h = 1380) → 1
    expect(lanternGlow(1380)).toBe(1);
    expect(lanternGlow(0)).toBe(1); // 0h
    // 3h → 1
    expect(lanternGlow(180)).toBe(1);
    // 5h30 → 0 (khớp công thức đèn đường: 5.5 - hour = 0 khi hour=5.5 → 330)
    expect(lanternGlow(330)).toBe(0);
    // 5h → 0.5 (vẫn sáng cuối đêm)
    expect(lanternGlow(300)).toBe(0.5);
    // 6h sáng → đã tắt
    expect(lanternGlow(6 * 60)).toBe(0);
  });

  it('lanternGlow không tràn [0,1] và xử lý giờ ≥24h (cuộn ngày)', () => {
    expect(lanternGlow(26 * 60)).toBe(1); // 2h sáng → đèn vẫn sáng
    expect(lanternGlow(29 * 60)).toBe(0.5); // 5h → sắp tang sáng, đèn đang mờ dần
    expect(lanternGlow(40 * 60)).toBe(0); // 16h ngày sau → chưa bật
    for (let h = 0; h <= 23; h++) {
      const v = lanternGlow(h * 60);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('vị trí đặt đèn lồng hợp lệ (không ngoài thế giới, không lòng đường, không đè mặt tiền, không chắn cửa)', () => {
    expect(storefrontLanternProblems()).toEqual([]);
    const [x, , z] = STOREFRONT_LANTERN_POS;
    // Trên vỉa hè (z≈2), trước mặt tiền tiệm (z>1), ngoài lòng đường (z<3)
    expect(z).toBeGreaterThan(1);
    expect(z).toBeLessThan(3);
    // Cách cửa tiệm (x=4,z=1) một khoảng không chắn lối — test cho chắc
    expect(Math.hypot(x - 4, z - 1)).toBeGreaterThanOrEqual(0.8);
  });

  it('tên node phát sáng trong GLB là hằng số dùng để bật/tắt đèn', () => {
    expect(GLOW_NODE).toBe('den_long_glow');
  });
});
