import * as THREE from 'three';
import { registerLight } from '../render/lightBudget';
import { fallbackLantern } from './storefrontLantern';

/**
 * GĐ737 — đèn hẻm dọc lối đi: payoff thị giác của dự án cộng đồng "Đèn Đường Ngõ 1" (GĐ732).
 * Tái dùng đúng thân đèn lồng đã đóng (fallbackLantern — GLB den_long.glb về thì thay phần thân,
 * không về vẫn có hình) + quầng sáng sprite + nguồn sáng thật đăng ký quỹ ánh sáng.
 * Chỉ hình ảnh; không chặn lưới đi lại (cùng convention kit prop GĐ172).
 * Gate hiệu năng: setDecor(false) ẩn ở mức Thấp (payoff mô phỏng vẫn chạy ở sim — chỉ ẩn hình).
 */

/** Vị trí 2 cột dọc lối đi trước dãy cửa (cùng vỉa hè với đèn lồng cửa tiệm ở x=5,9; tránh cửa tiệm x=4). */
// GĐ1820: dời ra ngoài hai mép mặt tiền (tiệm x 0..8) để không đứng chắn trước cửa.
export const ALLEY_LAMP_POS: [number, number, number][] = [[-0.9, 0, 2.2], [8.9, 0, 2.2]];

/** Rà vị trí đặt: ngoài thế giới / giữa lòng đường / đè mặt tiền / chắn trước cửa là bug — soi bằng test. */
export function alleyLampProblems(): string[] {
  const problems: string[] = [];
  for (const [x, , z] of ALLEY_LAMP_POS) {
    if (Math.abs(x) > 80 || Math.abs(z) > 80) problems.push(`đèn hẻm @${x},${z}: ngoài thế giới ±80`);
    if (z > 3 && z < 9) problems.push(`đèn hẻm @${x},${z}: giữa lòng đường`);
    if (x >= 0 && x <= 8 && z >= -22 && z <= 1) problems.push(`đèn hẻm @${x},${z}: đè mặt tiền tiệm`);
    if (Math.hypot(x - 4, z - 1) < 0.8) problems.push(`đèn hẻm @${x},${z}: chắn trước cửa tiệm (x=4,z=1)`);
  }
  return problems;
}

export interface AlleyLamps {
  group: THREE.Group;
  /** GĐ737 — bật/tắt theo dự án đèn có thắp sáng chưa; gọi mỗi khung từ main. */
  update(lamp: number, lit: boolean): void;
  /** Gate hiệu năng: mức Thấp ẩn hẳn (decor = false). */
  setDecor(decor: boolean): void;
}

export function createAlleyLamps(): AlleyLamps {
  const group = new THREE.Group();
  group.name = 'alleyLamps';
  group.visible = false;
  const lights: THREE.PointLight[] = [];
  const glows: THREE.MeshStandardMaterial[] = [];
  const pulses: THREE.SpriteMaterial[] = [];

  for (const [x, , z] of ALLEY_LAMP_POS) {
    const glowMat = new THREE.MeshStandardMaterial({ color: 0xffb35c, emissive: 0xff9a3c, emissiveIntensity: 0 });
    const body = fallbackLantern(glowMat);
    body.position.set(x, 0, z);
    const pulse = new THREE.Sprite(new THREE.SpriteMaterial({
      color: 0xffc178, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    pulse.position.set(x + 0.62, 1.72, z);
    pulse.scale.setScalar(2.4);
    const light = new THREE.PointLight(0xffb35c, 0, 12, 1.6);
    registerLight(light, new THREE.Vector3(x + 0.62, 1.7, z));
    group.add(body, pulse, light);
    glows.push(glowMat);
    pulses.push(pulse.material);
    lights.push(light);
  }

  const api: AlleyLamps = {
    group,
    update: (lamp, lit) => {
      const glow = lit ? lamp * 2.2 : 0;
      for (const gm of glows) gm.emissiveIntensity = glow;
      for (const pm of pulses) pm.opacity = lit ? lamp * 0.75 : 0;
      for (const li of lights) li.intensity = lit ? lamp * 22 : 0;
    },
    setDecor: (decor) => {
      if (group.visible !== decor) group.visible = decor;
    },
  };
  return api;
}
