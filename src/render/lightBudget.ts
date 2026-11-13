import * as THREE from 'three';

interface Entry { light: THREE.PointLight; pos: THREE.Vector3; d: number }

const entries: Entry[] = [];
const pool: THREE.PointLight[] = [];
/** Mảng dùng lại cho top-K mỗi khung — không cấp phát (xem applyLightBudget). */
const topScratch: Entry[] = [];
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

/** Gỡ đèn đã đăng ký — dùng khi building/nhà bị tháo dỡ hoặc dựng lại, tránh đèn chết tích tụ trong quỹ. */
export function unregisterLight(light: THREE.PointLight) {
  for (let i = entries.length - 1; i >= 0; i--) if (entries[i].light === light) entries.splice(i, 1);
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

/**
 * Chọn `k` đèn gần `focus` nhất (k = pool.length, nhỏ: 3 ở Thấp, 8 ở Cao). Mỗi frame không cần
 * sort TOÀN BỘ danh sách `entries` (phình theo số toà nhà cuối game) — chỉ cần k phần tử gần nhất,
 * nên dùng lượt chọn top-K một lần (O(n·k)) giữ vào `topScratch` tái dùng. Kết quả (tập k đèn gần
 * nhất + `cut` ở mốc đèn bị loại) GIỐNG HỆT sort đầy đủ nên không đổi hành vi, không đụng số đèn
 * trong bể (pool) hay shader.
 */
export function applyLightBudget(focus: THREE.Vector3, cap = Infinity) {
  const k = Math.min(pool.length, cap);
  for (const e of entries) e.d = e.light.intensity > 0 ? e.pos.distanceTo(focus) : Infinity;
  // Top-K: giữ k đèn gần nhất (tăng dần) vào topScratch; `cut` = khoảng cách của đèn bị loại gần nhất
  // (= đèn thứ k+1 tổng thể), Infinity khi không có đèn nào bị loại. Đúng như `entries[k].d` cũ.
  topScratch.length = 0;
  let cut = Infinity;
  for (const e of entries) {
    if (topScratch.length < k) {
      topScratch.push(e);
      for (let i = topScratch.length - 1; i > 0 && topScratch[i - 1].d > topScratch[i].d; i--) {
        [topScratch[i - 1], topScratch[i]] = [topScratch[i], topScratch[i - 1]];
      }
      continue;
    }
    if (e.d < topScratch[k - 1].d) {
      // Đẩy phần tử xa nhất trong top-K ra làm "đèn bị loại", nhét e vào đúng thứ tự.
      const evicted = topScratch[k - 1].d;
      if (evicted < cut) cut = evicted;
      topScratch[k - 1] = e;
      for (let i = k - 1; i > 0 && topScratch[i - 1].d > topScratch[i].d; i--) {
        [topScratch[i - 1], topScratch[i]] = [topScratch[i], topScratch[i - 1]];
      }
    } else if (e.d < cut) {
      cut = e.d;
    }
  }
  for (let i = k; i < pool.length; i++) pool[i].intensity = 0;
  for (let i = 0; i < k; i++) {
    const p = pool[i];
    const e = topScratch[i];
    if (!e || e.d === Infinity) {
      p.intensity = 0;
      continue;
    }
    // Khoảng cách của đèn đầu tiên bị loại: đèn càng gần mốc này càng mờ, lúc đổi chỗ đã tắt hẳn
    const fade = Math.min(1, (cut - e.d) / FADE);
    p.position.copy(e.pos);
    p.color.copy(e.light.color);
    p.distance = e.light.distance;
    p.decay = e.light.decay;
    p.intensity = e.light.intensity * fade;
  }
}
