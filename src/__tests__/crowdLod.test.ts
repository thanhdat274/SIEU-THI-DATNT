import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { applyCrowdLod, Walker } from '../agents/walker';

/**
 * GĐ1007: applyCrowdLod thay sort TOÀN BỘ mỗi khung bằng quickselect top-cap (O(n)).
 * Kết quả (bộ người gần camera nhất được vẽ, người xa cử động thưa) PHẢI GIỐNG HỆT bản cũ —
 * test dưới đây so từng kịch bản với "reference" tái dựng đúng thuật toán cũ.
 */

const dist2 = (ax: number, az: number, bx: number, bz: number) => (ax - bx) * (ax - bx) + (az - bz) * (az - bz);

/** Reference: tái dựng ĐÚNG hành vi bản cũ (sort toàn bộ theo lodDist, cull từ cap). */
function reference(
  pos: { x: number; z: number }[],
  cap: number,
  animFarDist: number,
  focus: { x: number; z: number },
): { culled: boolean; animFar: boolean }[] {
  const far2 = animFarDist * animFarDist;
  const arr = pos.map((p, idx) => ({ idx, d2: dist2(p.x, p.z, focus.x, focus.z) }));
  const animFar = arr.map((a) => a.d2 > far2);
  if (arr.length > cap) arr.sort((a, b) => a.d2 - b.d2);
  const culled = arr.map((a, i) => i >= cap);
  // Trả theo thứ tự người dùng tạo (idx)
  const res = new Array(pos.length).fill(null) as { culled: boolean; animFar: boolean }[];
  for (let i = 0; i < arr.length; i++) res[arr[i].idx] = { culled: culled[i], animFar: animFar[arr[i].idx] };
  return res;
}

beforeAll(() => {
  // Mock canvas/document giống graphicsQuality.test.ts để buildChibiCharacter không chạm DOM thật.
  const ctx = new Proxy({}, { get: (_t, p) => (p === 'measureText' ? () => ({ width: 0 }) : () => {}), set: () => true });
  (globalThis as { document?: unknown }).document = { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => ctx }) };
});

describe('applyCrowdLod — top-cap quickselect giống bản cũ', () => {
  it('nhiều kịch bản ngẫu nhiên: culled/animFar GIỐNG HỆT reference (sort toàn bộ)', () => {
    let seed = 987654321;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let trial = 0; trial < 60; trial++) {
      const n = 1 + Math.floor(rng() * 30);      // 1–30 người
      const cap = 1 + Math.floor(rng() * 8);     // 1–8
      const animFarDist = 6 + rng() * 30;        // 6–36 m
      const focus = { x: rng() * 40 - 20, z: rng() * 40 - 20 };
      // Random vị trí: gộm cụm để tạo cả "gần/vừa/xa" + cả trường hợp xa hơn animFarDist
      const pos = Array.from({ length: n }, () => ({ x: focus.x + (rng() * 60 - 30), z: focus.z + (rng() * 60 - 30) }));

      const scene = new THREE.Scene();
      const ws = pos.map((p) => {
        const w = new Walker(0xff0000);
        w.position.set(p.x, 0, p.z);
        scene.add(w.mesh);
        return w;
      });

      applyCrowdLod(new THREE.Vector3(focus.x, 0, focus.z), cap, animFarDist);
      const got = ws.map((w) => ({ culled: w.culled, animFar: w.animFar }));
      const exp = reference(pos, cap, animFarDist, focus);
      expect(got, `trial ${trial}: n=${n} cap=${cap} far=${animFarDist.toFixed(1)}`).toEqual(exp);

      for (const w of ws) w.dispose();
    }
  }, 30_000);

  it('số người ≤ cap: tất cả được vẽ (không cull), ai gần đều animFar=false', () => {
    const scene = new THREE.Scene();
    const ws = [];
    // 6 người, mọi vị trí đều gần hơn 12 m so với focus (0,0) → animFar đều false
    for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) {
      const w = new Walker(0x00ff00);
      w.position.set(i * 3, 0, k * 3);
      scene.add(w.mesh);
      ws.push(w);
    }
    applyCrowdLod(new THREE.Vector3(0, 0, 0), 6, 12); // 6 người ≤ cap 6 → không sort, không cull
    for (const w of ws) expect(w.culled).toBe(false);
    expect(ws.every((w) => w.animFar === false)).toBe(true); // mọi người trong 12 m
    for (const w of ws) w.dispose();
  });
});
