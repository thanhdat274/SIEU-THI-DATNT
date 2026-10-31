import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { NavGrid } from '../world/navGrid';

/** Một phòng kín (4 bức tường, không cửa) — đích nằm trong phòng thì không tới được. */
const sealedRoom = () => {
  const g = new NavGrid(40, 0.5);
  const wall = (x0: number, z0: number, x1: number, z1: number) =>
    new THREE.Box3(new THREE.Vector3(x0, 0, z0), new THREE.Vector3(x1, 2, z1));
  g.blockBox(wall(-5, -4, 5, -3)); // tường trên
  g.blockBox(wall(-5, 3, 5, 4));   // tường dưới
  g.blockBox(wall(-5, -3, -4, 3)); // tường trái
  g.blockBox(wall(4, -3, 5, 3));   // tường phải
  return g;
};

describe('NavGrid — phòng kín (đích không tới được)', () => {
  it('findPath trả rỗng khi đích nằm trong phòng không cửa', () => {
    const g = sealedRoom();
    const from = new THREE.Vector3(9, 0, 0);  // ngoài bên phải
    const to = new THREE.Vector3(0, 0, 0);    // giữa phòng kín
    expect(g.findPath(from, to)).toHaveLength(0);
  });

  it('approach dừng ở ô tự do cuối cùng trước tường, không lọt vào phòng', () => {
    const g = sealedRoom();
    const from = new THREE.Vector3(9, 0, 0);
    const to = new THREE.Vector3(0, 0, 0);
    const path = g.approach(from, to);
    expect(path.length).toBe(1);
    const landing = path[0];
    // Hạ cánh bên ngoài bức tường phải (không xuyên vào vùng chặn)
    expect(landing.x).toBeGreaterThan(5);
    expect(landing.x).toBeLessThan(9);
    expect(g.isBlocked(landing.x, landing.z)).toBe(false);
    // Đi tới nhưng không đạt đích (trả một bước, không phải mục tiêu bên trong phòng)
    expect(landing.distanceTo(to)).toBeGreaterThan(1);
  });

  it('đứng yên khi ngay vị trí hiện tại đã bị chặn', () => {
    const g = sealedRoom();
    const from = new THREE.Vector3(4.5, 0, 0); // nằm trong tường phải
    const to = new THREE.Vector3(6, 0, 0);
    expect(g.approach(from, to)).toHaveLength(0);
  });
});

describe('NavGrid.approach — không phá luồng bình thường khi không vật cản', () => {
  it('đích dễ dàng thì approach trả một bước ngắn về đích', () => {
    const g = new NavGrid(40, 0.5); // trống, không vật cản
    const path = g.approach(new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 0, 0));
    expect(path.length).toBe(1);
    expect(path[0].distanceTo(new THREE.Vector3(2, 0, 0))).toBeLessThan(0.01);
  });
});
