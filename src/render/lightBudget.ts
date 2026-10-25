import * as THREE from 'three';

interface Entry { light: THREE.PointLight; pos: THREE.Vector3; d: number }

const entries: Entry[] = [];
const pool: THREE.PointLight[] = [];
/** Đèn ở mép quỹ mờ dần trong khoảng này (mét) trước khi nhường chỗ — không bật/tắt phụt. */
const FADE = 6;

/**
 * Đăng ký đèn điểm vào "quỹ ánh sáng". Bản thân đèn này KHÔNG bao giờ được vẽ: nó chỉ giữ
 * màu, cường độ, tầm chiếu; một trong các đèn của "bể đèn" sẽ mượn thông số và đứng vào chỗ nó.
 */
export function registerLight(light: THREE.PointLight, pos: THREE.Vector3) {
  entries.push({ light, pos: pos.clone(), d: 0 });
  light.visible = false;
}

/**
 * Tạo bể `size` đèn cố định trong scene. WebGPU biên dịch shader theo TẬP đèn đang bật:
 * bật/tắt đèn (visible) mỗi lần camera đi là mỗi lần biên dịch lại cả loạt shader → khựng.
 * Bể đèn luôn bật, chỉ dời vị trí / đổi cường độ (uniform) nên shader không bao giờ đổi.
 */
export function initLightPool(scene: THREE.Scene, size: number) {
  for (let i = 0; i < size; i++) {
    const l = new THREE.PointLight(0xffffff, 0, 1, 2);
    pool.push(l);
    scene.add(l);
  }
}

/** Đưa bể đèn tới các nguồn sáng đang sáng gần `focus` nhất. */
export function applyLightBudget(focus: THREE.Vector3) {
  for (const e of entries) e.d = e.light.intensity > 0 ? e.pos.distanceTo(focus) : Infinity;
  entries.sort((a, b) => a.d - b.d);
  // Khoảng cách của đèn đầu tiên bị loại: đèn càng gần mốc này càng mờ, lúc đổi chỗ đã tắt hẳn
  const cut = entries[pool.length]?.d ?? Infinity;
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i];
    const e = entries[i];
    if (!e || e.d === Infinity) {
      p.intensity = 0;
      continue;
    }
    const fade = Math.min(1, (cut - e.d) / FADE);
    p.position.copy(e.pos);
    p.color.copy(e.light.color);
    p.distance = e.light.distance;
    p.decay = e.light.decay;
    p.intensity = e.light.intensity * fade;
  }
}
