import * as THREE from 'three';
import { registerLight } from '../render/lightBudget';

/**
 * GĐ185 — "Cơ ngơi lên đèn": đèn ấm chập tối lan tới của riêng người chơi — hiên nhà và cổng trại.
 * GĐ177 mới lên đèn trước mặt tiền tiệm; nơi người chơi ngủ (hiên nhà) và chăn trồng (cổng trại)
 * vẫn tối tẻ lúc 17h–5h30. Đăng ký vài nguồn sáng ấm 0xffb35c vào quỹ ánh sáng (lightBudget) và bật
 * cùng công thức đèn đường/lồng cửa tiệm — KHÔNG thêm sim/save, chỉ làm "cảnh ấm" hơn cho hợp
 * cảm giác "tiệm nhỏ đầu ngõ, ấm áp đời thường". Chỉ hình ảnh; không có khối nào chặn lưới đi lại.
 */

/** Điểm gắn đèn ấm của riêng người chơi: toạ độ đế (x, z) + độ cao bóng đèn so với mặt đất. */
export const COMPOUND_WARM_PLACES: { label: string; x: number; z: number; y: number }[] = [
  { label: 'home', x: -11.4, z: 1.1, y: 2.2 }, // hiên nhà — ngay ngoài cửa ra vào (nhà ở -12,-2, cửa nam z≈1)
  { label: 'farm', x: 20, z: -66, y: 2.3 },    // cổng trại — gần giếng (FARM_CENTER 24,-70, WELL 20,-65.8)
];

/** Độ sáng theo giờ game: 0 = trưa, 1 = chập tối→đêm. Cùng công thức đèn đường/lồng (17h–5h30). */
export function warmGlow(minutes: number): number {
  const hour = (((minutes / 60) % 24) + 24) % 24;
  return Math.min(1, Math.max(0, Math.max(hour - 17, 5.5 - hour)));
}

/** Rà vị trí đèn: ngoài thế giới / giữa lòng đường là bug đặt chỗ — soi bằng test thuần. */
export function compoundWarmProblems(): string[] {
  const problems: string[] = [];
  for (const p of COMPOUND_WARM_PLACES) {
    if (Math.abs(p.x) > 80 || Math.abs(p.z) > 80) problems.push(`${p.label} đèn @${p.x},${p.z}: ngoài thế giới ±80`);
    if (p.z > 3 && p.z < 9) problems.push(`${p.label} đèn @${p.x},${p.z}: giữa lòng đường chính`);
    if (Math.abs(p.z - -64) < 3 && p.x > 27 && p.x < 87) problems.push(`${p.label} đèn @${p.x},${p.z}: giữa lòng đường thứ hai`);
    if (p.x >= 0 && p.x <= 8 && p.z >= -22 && p.z <= 1) problems.push(`${p.label} đèn @${p.x},${p.z}: đè mặt tiền tiệm`);
  }
  return problems;
}

export interface CompoundWarm {
  /** Độ sáng theo giờ: gọi mỗi frame với `lamp` (17h–5h30), giống storefront/đèn đường. */
  update(lamp: number): void;
  /** Độ sáng hiện tại từng đèn (để test/QA). */
  intensities(): number[];
}

export function createCompoundWarm(): CompoundWarm {
  const lights = COMPOUND_WARM_PLACES.map((p) => {
    const light = new THREE.PointLight(0xffb35c, 0, 11, 1.6);
    registerLight(light, new THREE.Vector3(p.x, p.y, p.z));
    return light;
  });
  return {
    update: (lamp) => { for (const l of lights) l.intensity = lamp * 16; },
    intensities: () => lights.map((l) => l.intensity),
  };
}
