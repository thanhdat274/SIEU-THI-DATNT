import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import { applyWind } from './fx/windSway';

/**
 * Lúa 3D cho một luống 2.6 × 1.6 m: các bụi lúa xếp theo ba rãnh, mỗi bụi là chùm lá thon nghiêng tỏa ra
 * kèm bông lúa cong xuống khi đã trổ. Gộp cả luống thành MỘT mesh (màu đỉnh) nên 12 luống vẫn chỉ 12 lần vẽ;
 * gió lắc ngọn chạy trong vertex shader (xem fx/windSway).
 */
export type RiceVariant = 'young' | 'heading' | 'ripe';

const COLORS: Record<RiceVariant, { blade: number; bladeTip: number; grain: number | null }> = {
  young: { blade: 0x5fae45, bladeTip: 0x86c85a, grain: null },
  heading: { blade: 0x8cb43e, bladeTip: 0xb7c94a, grain: 0xa8c056 },
  ripe: { blade: 0xd9a92b, bladeTip: 0xf0c443, grain: 0xe9b730 },
};

const ROW_Z = [-0.5, 0, 0.5];
const CLUMPS_PER_ROW = 6;
const BLADES = 7;
const HEIGHT = 1;

/** Số giả ngẫu nhiên cố định: mọi luống cùng giống nhìn như nhau, không nhấp nháy khi dựng lại. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tinted(geo: THREE.BufferGeometry, base: THREE.Color, tip: THREE.Color): THREE.BufferGeometry {
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox!;
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    c.copy(base).lerp(tip, (pos.getY(i) - min.y) / Math.max(1e-4, max.y - min.y));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

const cache = new Map<RiceVariant, THREE.BufferGeometry>();

export function riceGeometry(variant: RiceVariant): THREE.BufferGeometry {
  const hit = cache.get(variant);
  if (hit) return hit;
  const look = COLORS[variant];
  const rand = rng(1337);
  const base = new THREE.Color(look.blade);
  const tip = new THREE.Color(look.bladeTip);
  const grain = look.grain === null ? null : new THREE.Color(look.grain);
  const parts: THREE.BufferGeometry[] = [];

  for (const z of ROW_Z) {
    for (let c = 0; c < CLUMPS_PER_ROW; c++) {
      const cx = -1 + (c / (CLUMPS_PER_ROW - 1)) * 2 + (rand() - 0.5) * 0.12;
      const cz = z + (rand() - 0.5) * 0.12;
      for (let b = 0; b < BLADES; b++) {
        const h = HEIGHT * (0.8 + rand() * 0.3);
        const yaw = (b / BLADES) * Math.PI * 2 + rand() * 0.6;
        const lean = 0.12 + rand() * 0.28;
        const blade = new THREE.ConeGeometry(0.022, h, 4, 1);
        blade.translate(0, h / 2, 0);
        tinted(blade, base, tip);
        blade.rotateZ(lean);
        blade.rotateY(yaw);
        blade.translate(cx, 0, cz);
        parts.push(blade);

        // Bông lúa: hạt dài, cong xuống phía lá nghiêng, chỉ có khi đã trổ
        if (grain && b % 2 === 0) {
          const head = new THREE.SphereGeometry(0.035, 5, 4);
          head.scale(0.8, 3.2, 0.8);
          tinted(head, grain, grain);
          const tipX = Math.sin(lean) * h;
          const tipY = Math.cos(lean) * h;
          head.translate(0.06, -0.05, 0);
          head.rotateZ(-0.6);
          head.translate(tipX, tipY, 0);
          head.rotateY(yaw);
          head.translate(cx, 0, cz);
          parts.push(head);
        }
      }
    }
  }
  const merged = mergeGeometries(parts.map((g) => (g.index ? g : g.toNonIndexed())), false)!;
  parts.forEach((g) => g.dispose());
  cache.set(variant, merged);
  return merged;
}

let sharedMat: MeshStandardNodeMaterial | null = null;
/** Một vật liệu cho mọi luống lúa: màu nằm ở đỉnh, gió dùng chung. */
export function riceMaterial(): MeshStandardNodeMaterial {
  if (sharedMat) return sharedMat;
  sharedMat = new MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.85 });
  sharedMat.side = THREE.DoubleSide;
  applyWind(sharedMat, { height: HEIGHT, kind: 'plant' }).strength.value = 0.1;
  return sharedMat;
}
