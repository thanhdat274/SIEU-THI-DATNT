import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ALLEY_LAMP_POS, alleyLampProblems, createAlleyLamps } from '../world/alleyLamps';

/**
 * GĐ737 — đèn hẻm dọc lối đi: payoff thị giác của dự án "Đèn Đường Ngõ 1" (landmark ≥ 48 lượt góp).
 * Tái dùng thân đèn lồng đã đóng (storefrontLantern.fallbackLantern) — không dựng khối mới, không GLB mới;
 * gate hiệu năng: setDecor(false) ẩn ở mức Thấp (payoff mô phỏng vẫn chạy ở sim — chỉ ẩn hình);
 * vị trí đặt rà bằng cùng luật đèn cửa tiệm gđ177 (ngoài thế giới / lòng đường / đè mặt tiền / chắn cửa).
 */

describe('alleyLamps — vị trí đặt đúng luật đèn cửa tiệm (gđ177)', () => {
  it('cả 2 cột không vi phạm: ngoài thế giới / lòng đường / đè mặt tiền / chắn cửa', () => {
    expect(alleyLampProblems()).toEqual([]);
    expect(ALLEY_LAMP_POS).toHaveLength(2);
  });
});

describe('createAlleyLamps — gate hiển thị theo decor, sáng theo lit', () => {
  it('mặc định ẩn; setDecor(true) → hiện; lit chỉ điều khiển cường độ sáng; setDecor(false) → ẩn', () => {
    const lamps = createAlleyLamps();
    expect(lamps.group.visible).toBe(false); // mức Thấp mặc định ẩn
    lamps.setDecor(true);
    lamps.update(1, true);
    expect(lamps.group.visible).toBe(true);
    let light = 0;
    lamps.group.traverse((o) => { if ((o as THREE.PointLight).isPointLight) light = (o as THREE.PointLight).intensity; });
    expect(light).toBeGreaterThan(0); // đêm + đèn đã thắp sáng → nguồn sáng bật
    lamps.update(1, false); // dự án chưa thắp sáng → nguồn sáng tắt (nhóm vẫn hiện theo decor)
    lamps.group.traverse((o) => { if ((o as THREE.PointLight).isPointLight) light = (o as THREE.PointLight).intensity; });
    expect(light).toBe(0);
    lamps.setDecor(false);
    expect(lamps.group.visible).toBe(false);
  });
  it('mỗi cột có nguồn sáng riêng đăng ký quỹ; không spawn thêm GLB (tái dùng thân đèn cửa tiệm)', () => {
    const lamps = createAlleyLamps();
    let lights = 0;
    lamps.group.traverse((o) => { if ((o as THREE.PointLight).isPointLight) lights++; });
    expect(lights).toBe(ALLEY_LAMP_POS.length);
  });
});
