import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { NavGrid } from '../world/navGrid';
import { xoiHouseBoxes, XOI_HOUSE } from '../world/tiemXoiStand';

/** GĐ483 — tiệm xôi thành cửa hàng nhỏ: tường chặn lối, vào qua cửa giữa, sau quầy đi tới được. */
describe('nhà tiệm xôi trên lưới đi lại', () => {
  const ox = 46, oz = 1;
  const g = new NavGrid(80);
  g.setStatic('tiemXoi', xoiHouseBoxes(ox, oz));
  g.rebuildBase();
  const cx = ox + XOI_HOUSE.x, cz = oz + XOI_HOUSE.z;
  const front = cz + XOI_HOUSE.depth / 2;
  const street = new THREE.Vector3(cx, 0, 2.8);
  it('mặt tiền chừa vỉa hè, mép đông chừa hẻm', () => {
    expect(front).toBeLessThan(2.6);
    expect(cx + XOI_HOUSE.width / 2).toBeLessThan(48.5);
  });
  it('từ vỉa hè vào được chỗ khách trước quầy và sau quầy', () => {
    expect(g.reachable(street, new THREE.Vector3(cx, 0, cz + 1.1))).toBe(true);
    expect(g.reachable(street, new THREE.Vector3(cx, 0, cz - 1.2))).toBe(true);
  });
  it('tường hông và mặt tiền cạnh cửa bị chặn', () => {
    expect(g.isBlocked(cx - 1.5, front)).toBe(true);
    expect(g.isBlocked(cx + XOI_HOUSE.width / 2, cz)).toBe(true);
    expect(g.isBlocked(cx, front)).toBe(false);
  });
});
