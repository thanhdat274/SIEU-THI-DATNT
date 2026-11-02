import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ShelfInstancer } from '../shop/shelfInstancer';

describe('GĐ886 ShelfInstancer', () => {
  const size = [0.2, 0.3, 0.2];
  const mats = (n: number, x = 0) => Array.from({ length: n }, (_, i) => new THREE.Matrix4().setPosition(x + i, 0, 0));
  it('nhiều kệ cùng món dùng chung một bộ InstancedMesh', () => {
    const si = new ShelfInstancer();
    const a = {}, b = {};
    si.set(a, 'mi', size, mats(5));
    si.flush();
    const one = si.meshCount;
    expect(one).toBeGreaterThan(0);
    si.set(b, 'mi', size, mats(7, 10));
    si.flush();
    expect(si.meshCount).toBe(one);
    const im = si.root.children[0] as THREE.InstancedMesh;
    expect(im.count).toBe(12);
  });
  it('gỡ kệ cuối thì giải phóng; gỡ một kệ thì giảm số hộp', () => {
    const si = new ShelfInstancer();
    const a = {}, b = {};
    si.set(a, 'mi', size, mats(3));
    si.set(b, 'mi', size, mats(4));
    si.flush();
    si.removeOwner(a);
    si.flush();
    expect((si.root.children[0] as THREE.InstancedMesh).count).toBe(4);
    si.removeOwner(b);
    si.flush();
    expect(si.meshCount).toBe(0);
    expect(si.root.children.length).toBe(0);
  });
});
