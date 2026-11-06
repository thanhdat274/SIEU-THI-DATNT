import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CameraController } from '../render/cameraController';

/** Playtest P2 T9: Ra tiệm — camera nhảy thẳng, không lia qua quạt trần. */
describe('CameraController.snapTo', () => {
  it('đặt target ngay tại điểm mới và bám theo', () => {
    const c = { target: new THREE.Vector3(), follow: null as THREE.Vector3 | null } as unknown as CameraController;
    const p = new THREE.Vector3(40, 0, -12);
    CameraController.prototype.snapTo.call(c, p);
    expect(c.follow).toBe(p);
    expect((c as unknown as { target: THREE.Vector3 }).target.distanceTo(p)).toBe(0);
  });
});
