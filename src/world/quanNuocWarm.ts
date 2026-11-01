import * as THREE from 'three';
import { registerLight } from '../render/lightBudget';
import { warmGlow } from './compoundWarm';
import { LANE_X, ROAD2_Z } from '../data/branches';

/**
 * GĐ187 — "Quán nước lên đèn": hoàn tất chuỗi "cảnh ấm" (GĐ177 mặt tiền → GĐ185 hiên nhà + cổng
 * trại) cho điểm họp mặt của khách quen — quán nước đầu ngõ. Quán là nơi "khách quen tụ họp" theo
 * tầm nhìn game; lúc chập tối nó phải ấm áp như các chỗ khác, nhất là khi đang mở (có quán thật).
 * Chỉ nguồn sáng ấm 0xffb35c đăng ký vào lightBudget + glow theo giờ — KHÔNG thêm sim/save/khối
 * chặn lưới (quán vốn đặt chỉ để hình ảnh, boxes rỗng, an toàn đi lại).
 *
 * Gating: chỉ sáng khi quán MỞ (stand hiển thị) — mảnh đất trống/gộp chưa mua thì tối tẻ như thường,
 * mở rồi thì chập tối tỏa ấm ("có quán, có người ngồi"). Cùng công thức `warmGlow` (17h–5h30).
 */

/** Điểm gắn đèn ấm của quán nước: toạ độ thế giới (x, z) + độ cao bóng so với mặt đất. Quán đặt tại
 * (LANE_X+4.4, 0, 1), stand trải ~3m ngang × ~2m sâu về phía +z (mặt quầy + bàn ghế). Đặt 2 nguồn
 * ở mép quán để phủ ấm cả quầy lẫn chỗ ngồi mà không đè giữa lòng đường. */
export const QUAN_NUOC_WARM_PLACES: { label: string; x: number; z: number; y: number }[] = [
  { label: 'quanTay', x: LANE_X + 4.4 - 0.9, z: 1.4, y: 2.4 }, // phía tây quán — gần quầy
  { label: 'quanDong', x: LANE_X + 4.4 + 0.9, z: 1.9, y: 2.4 }, // phía đông quán — gần bàn
];

/** Rà vị trí đèn: ngoài thế giới / giữa lòng đường là bug đặt chỗ — soi bằng test thuần. */
export function quanNuocWarmProblems(): string[] {
  const problems: string[] = [];
  for (const p of QUAN_NUOC_WARM_PLACES) {
    if (Math.abs(p.x) > 80 || Math.abs(p.z) > 80) problems.push(`${p.label} đèn @${p.x},${p.z}: ngoài thế giới ±80`);
    if (p.z > 3 && p.z < 9) problems.push(`${p.label} đèn @${p.x},${p.z}: giữa lòng đường chính`);
    if (Math.abs(p.z - ROAD2_Z) < 3 && p.x > 27) problems.push(`${p.label} đèn @${p.x},${p.z}: giữa lòng đường thứ hai`);
    if (p.x >= 0 && p.x <= 8 && p.z >= -22 && p.z <= 1) problems.push(`${p.label} đèn @${p.x},${p.z}: đè mặt tiền tiệm`);
  }
  return problems;
}

export interface QuanNuocWarm {
  /** Cập nhật theo giờ: gọi mỗi frame với `lamp` (17h–5h30) và `open` (quán đang mở). */
  update(lamp: number, open: boolean): void;
  /** Độ sáng hiện tại từng đèn (để test/QA). */
  intensities(): number[];
}

export function createQuanNuocWarm(): QuanNuocWarm {
  const lights = QUAN_NUOC_WARM_PLACES.map((p) => {
    const light = new THREE.PointLight(0xffb35c, 0, 10, 1.6);
    registerLight(light, new THREE.Vector3(p.x, p.y, p.z));
    return light;
  });
  return {
    update: (lamp, open) => {
      for (const l of lights) l.intensity = open ? lamp * 14 : 0;
    },
    intensities: () => lights.map((l) => l.intensity),
  };
}

// Re-export để main.tsx dùng chung một công thức giờ với các đèn ấm khác.
export { warmGlow as quanNuocWarmGlow };
