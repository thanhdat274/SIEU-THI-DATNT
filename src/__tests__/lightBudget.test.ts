import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { applyLightBudget, initLightPool, registerLight, unregisterLight } from '../render/lightBudget';

/**
 * `applyLightBudget` chọn `pool.length` đèn gần `focus` nhất để vào bể đèn thật (Thấp = 3, Cao = 8).
 * GĐ1006: thay sort toàn bộ mỗi frame bằng chọn top-K — kết quả PHẢI GIỐNG HỆT bản cũ (sort đầy đủ)
 * để không đổi hành vi ánh sáng ban đêm (chỉ bớt công việc mỗi khung ở cuối game). Test dưới đây so
 * từng kịch bản với "reference" tái dựng đúng thuật toán cũ.
 *
 * LƯU Ý cô lập: `pool` là trạng thái module (initLightPool nối dài, không có hàm reset) nên test chỉ
 * gọi initLightPool MỘT LẦN (kt = 3) trên một scene dùng chung; mỗi kịch bản đăng ký/huỷ đăng ký
 * entries riêng để applyLightBudget luôn thấy đúng pool.length = kt.
 */

const POOL = 3; // bể đèn dùng chung — giữ cố định như mức Thấp (3 đèn thật)

/** Độ mờ ở mép quỹ — khớp hằng FADE trong src/render/lightBudget.ts (chỉ dùng cho reference). */
const FADE = 6;
const FOCUS: [number, number, number] = [0, 0, 0];

type LightSrc = { pos: [number, number, number]; intensity: number };

let scene: THREE.Scene;
let pool: THREE.PointLight[];
let registered: THREE.PointLight[] = [];

beforeAll(() => {
  scene = new THREE.Scene();
  initLightPool(scene, POOL);
  pool = scene.children.filter((c) => (c as THREE.PointLight).isPointLight) as THREE.PointLight[];
});

/** Đăng ký các đèn giả, chạy applyLightBudget, đọc trạng thái bể (và dọn entries sau). */
function run(
  src: LightSrc[],
  focus: [number, number, number] = FOCUS,
): { on: boolean; intensity: number }[] {
  for (const l of registered) unregisterLight(l);
  registered = [];
  for (const s of src) {
    const l = new THREE.PointLight(0xffffff, s.intensity, 1, 2);
    registerLight(l, new THREE.Vector3(...s.pos));
    registered.push(l);
  }
  applyLightBudget(new THREE.Vector3(...focus));
  return pool.map((p) => ({ on: p.intensity > 0, intensity: p.intensity }));
}

/** Reference: tái dựng ĐÚNG hành vi bản cũ (sort toàn bộ entries, cut = entries[k].d), luôn trả k phần tử. */
function reference(
  src: LightSrc[],
  k: number,
  focus: [number, number, number] = FOCUS,
): { on: boolean; intensity: number }[] {
  const arr = src
    .map((s) => ({
      ...s,
      // Dùng ĐÚNG cùng phép đo khoảng cách như applyLightBudget (THREE.Vector3.distanceTo) để
      // reference khớp từng bit — chỉ khác nhau ở thuật toán chọn (sort đầy đủ vs top-K).
      d: s.intensity > 0 ? new THREE.Vector3(...s.pos).distanceTo(new THREE.Vector3(...focus)) : Infinity,
    }))
    .sort((a, b) => a.d - b.d);
  const cut = arr[k]?.d ?? Infinity;
  const out: { on: boolean; intensity: number }[] = [];
  for (let i = 0; i < k; i++) {
    const e = arr[i];
    if (!e || e.d === Infinity) {
      out.push({ on: false, intensity: 0 });
    } else {
      const fade = Math.min(1, (cut - e.d) / FADE);
      out.push({ on: e.intensity > 0, intensity: e.intensity * fade });
    }
  }
  return out;
}

describe('applyLightBudget — chọn top-K giống bản cũ (pool = 3, mức Thấp)', () => {
  it('ít hơn hoặc bằng k đèn sáng thì bể sáng đầy theo thứ tự gần (cut = Infinity, fade = 1)', () => {
    const src: LightSrc[] = [
      { pos: [10, 0, 0], intensity: 2 }, // gần nhất
      { pos: [40, 0, 0], intensity: 3 }, // xa
    ];
    const got = run(src);
    expect(got).toEqual(reference(src, POOL));
    expect(got[0].intensity).toBeCloseTo(2);
    expect(got[1].intensity).toBeCloseTo(3); // fade 1 vì cut=Infinity
    expect(got[2]).toEqual({ on: false, intensity: 0 }); // bể dư không có nguồn → tắt
  });

  it('nhiều đèn hơn k: chỉ đúng k đèn gần nhất được bật, đèn gần mốc cut mờ dần', () => {
    const src: LightSrc[] = [
      { pos: [5, 0, 0], intensity: 2 },   // gần nhất
      { pos: [20, 0, 0], intensity: 2 },  // gần thứ 2
      { pos: [28, 0, 0], intensity: 4 },  // gần thứ 3 (cut = 34)
      { pos: [34, 0, 0], intensity: 4 },  // bị loại → cut
      { pos: [90, 0, 0], intensity: 4 },  // bị loại
    ];
    const got = run(src);
    expect(got).toEqual(reference(src, POOL));
    expect(got[0].intensity).toBeCloseTo(2);        // 5 << cut → fade 1
    expect(got[2].intensity).toBeCloseTo(4 * Math.min(1, (34 - 28) / FADE)); // đèn thứ 3 mờ dần
    expect(got.filter((g) => g.on)).toHaveLength(3);
  });

  it('đèn tắt (intensity 0) không bao giờ được bật, kể cả khi gần', () => {
    const src: LightSrc[] = [
      { pos: [1, 0, 0], intensity: 0 },  // tắt nhưng gần nhất
      { pos: [30, 0, 0], intensity: 2 },  // sáng xa hơn
      { pos: [31, 0, 0], intensity: 2 },
    ];
    const got = run(src);
    expect(got).toEqual(reference(src, POOL));
    // Đèn tắt có d = Infinity nên xếp ở cuối (sau 2 đèn sáng): chỉ 2 đèn sáng, slot thứ 3 tắt.
    expect(got.filter((g) => g.on)).toHaveLength(2);
    expect(got[2]).toEqual({ on: false, intensity: 0 });
  });

  it('ngẫu nhiên nhiều kịch bản: kết quả GIỐNG HỆT bản cũ (sort đầy đủ)', () => {
    // Seed tất định để test lặp lại được.
    let seed = 1234567;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let trial = 0; trial < 300; trial++) {
      const n = 1 + Math.floor(rng() * 40); // 1–40 đèn đăng ký (cuối game có thể nhiều)
      const src: LightSrc[] = Array.from({ length: n }, () => ({
        pos: [rng() * 120 - 60, 0, rng() * 120 - 60] as [number, number, number],
        intensity: rng() < 0.4 ? 0 : 1 + rng() * 3, // 40% tắt, còn lại sáng 1–4
      }));
      const focus: [number, number, number] = [rng() * 120 - 60, 0, rng() * 120 - 60];
      const got = run(src, focus);
      const exp = reference(src, POOL, focus);
      expect(got, `trial ${trial}: n=${n}`).toEqual(exp);
    }
  });
});
