import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createNgo2 } from '../world/ngo2';

// Biển gỗ dùng canvas 2D: stub tối thiểu trong node (giống economySim.test.ts).
const ctx = new Proxy({}, { get: (_t, p) => (p === 'measureText' ? () => ({ width: 0 }) : () => {}), set: () => true });
let prev: typeof globalThis.document | undefined;
beforeAll(() => {
  prev = globalThis.document;
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) } as unknown as Document;
});
afterAll(() => { globalThis.document = prev as Document; });

/** GĐ514 — sạp 3D Ngõ 2: bậc hiện bánh xe / biển hiệu, màu theo món; số mesh không đổi khi đổi bậc. */
describe('createNgo2 setStalls', () => {
  const count = (g: THREE.Object3D) => { let n = 0; g.traverse(() => n++); return n; };
  const visibleWheels = (g: THREE.Object3D) => {
    let n = 0;
    g.traverse((o) => { const geo = (o as THREE.Mesh).geometry; if (geo instanceof THREE.CylinderGeometry && geo.parameters.radiusTop === 0.22 && o.parent?.visible && o.parent.parent?.visible) n++; });
    return n;
  };
  it('xe đẩy hiện 2 bánh, gánh không; không thêm object khi đổi bậc', () => {
    const v = createNgo2();
    v.setOpen(true);
    const before = count(v.group);
    v.setStalls(2, undefined, [1, 0]);
    expect(visibleWheels(v.group)).toBe(2);
    v.setStalls(2, [[0x55efc4, 0x00b894]], [2, 1]);
    expect(visibleWheels(v.group)).toBe(4);
    expect(count(v.group)).toBe(before);
  });
});
