import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { NavGrid } from '../world/navGrid';
import { quanHouseBoxes, QUAN_HOUSE } from '../world/quanNuocStand';

/** GĐ425 — cửa hàng nước B2: tường chặn lối, chỉ vào trong qua cửa giữa mặt tiền. */
describe('nhà quán nước trên lưới đi lại', () => {
  const ox = 54.4, oz = 1;
  const g = new NavGrid(80);
  g.setStatic('quanNuoc', quanHouseBoxes(ox, oz));
  g.rebuildBase();
  const cx = ox + QUAN_HOUSE.x, cz = oz + QUAN_HOUSE.z;
  const street = new THREE.Vector3(cx, 0, 2.6);
  it('từ vỉa hè vào được chỗ khách đứng trước quầy', () => {
    expect(g.reachable(street, new THREE.Vector3(cx, 0, cz + 1.4))).toBe(true);
  });
  it('vào được sau quầy (lối hai bên quầy)', () => {
    expect(g.reachable(street, new THREE.Vector3(cx - 0.5, 0, cz - 1.6))).toBe(true);
  });
  it('GĐ432: chỗ đứng pha (sau quầy, giữa) đi tới được, không bị chặn', () => {
    const spot = new THREE.Vector3(cx, 0, cz - 0.9);
    expect(g.isBlocked(spot.x, spot.z)).toBe(false);
    expect(g.reachable(street, spot)).toBe(true);
  });
  it('tường mặt tiền cạnh cửa và tường hông bị chặn', () => {
    expect(g.isBlocked(cx - 2, oz + QUAN_HOUSE.z + QUAN_HOUSE.depth / 2)).toBe(true);
    expect(g.isBlocked(cx + QUAN_HOUSE.width / 2, cz)).toBe(true);
  });
  it('đường vào phải đi qua cửa (không xuyên tường)', () => {
    const path = g.findPath(street, new THREE.Vector3(cx, 0, cz + 1.4));
    const front = cz + QUAN_HOUSE.depth / 2;
    const pts = [street, ...path];
    const i = pts.findIndex((p, k) => k > 0 && (pts[k - 1].z - front) * (p.z - front) <= 0);
    expect(i).toBeGreaterThan(0);
    const a = pts[i - 1], b = pts[i];
    const x = a.x + ((front - a.z) / (b.z - a.z || 1)) * (b.x - a.x);
    expect(Math.abs(x - cx)).toBeLessThan(0.9);
  });
});
