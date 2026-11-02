import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createTutorialMarker, markerGlow } from '../render/tutorialMarker';

describe('GĐ964 — tutorialMarker', () => {
  it('glow nằm trong 0.25–0.85', () => {
    for (let t = 0; t < 5000; t += 137) {
      expect(markerGlow(t)).toBeGreaterThanOrEqual(0.25 - 1e-9);
      expect(markerGlow(t)).toBeLessThanOrEqual(0.85 + 1e-9);
    }
  });
  it('tạo ẩn, hiện thì đặt đúng chỗ, ẩn lại được', () => {
    const scene = new THREE.Scene();
    const m = createTutorialMarker(scene);
    expect(scene.children).toContain(m.group);
    expect(m.group.visible).toBe(false);
    m.update(true, new THREE.Vector3(1, 0, 2), 0);
    expect(m.group.visible).toBe(true);
    expect(m.group.position.x).toBe(1);
    expect(m.group.position.z).toBe(2);
    m.update(false, new THREE.Vector3(), 0);
    expect(m.group.visible).toBe(false);
  });
});
