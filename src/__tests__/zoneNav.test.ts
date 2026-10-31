import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { zoneBlockRects } from '../data/zones';
import { NavGrid } from '../world/navGrid';

const gridFor = (zones?: string[]) => {
  const g = new NavGrid(120);
  g.setStatic('zones', zoneBlockRects(zones, 120).map((r) => new THREE.Box3(new THREE.Vector3(r.x1, 0, r.z1), new THREE.Vector3(r.x2, 2, r.z2))));
  g.rebuildBase();
  return g;
};

describe('tường khu trên lưới (GĐ500)', () => {
  it('Ngõ 2 chưa mở: không đi qua x=80; mở rồi đi tới được trên đường chính', () => {
    const closed = gridFor();
    expect(closed.isBlocked(100, 6)).toBe(true);
    expect(closed.isBlocked(70, 6)).toBe(false);
    expect(closed.reachable(new THREE.Vector3(70, 0, 6), new THREE.Vector3(79, 0, 6))).toBe(true);
    expect(closed.reachable(new THREE.Vector3(70, 0, 6), new THREE.Vector3(100, 0, 6))).toBe(false);
    const open = gridFor(['ngo2']);
    expect(open.reachable(new THREE.Vector3(70, 0, 6), new THREE.Vector3(100, 0, 6))).toBe(true);
    expect(open.isBlocked(100, 60)).toBe(true);
  });
});
