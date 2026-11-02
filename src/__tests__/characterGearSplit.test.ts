import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { isSharedMaterial as fromModel } from '../render/characterModel';
import { isSharedMaterial, isJob, JOB_UNIFORMS, mat } from '../render/characterGear';

describe('GĐ985 — render/characterGear tách khỏi render/characterModel', () => {
  it('isSharedMaterial vẫn re-export cùng tham chiếu', () => {
    expect(fromModel).toBe(isSharedMaterial);
  });
  it('mat dùng chung vật liệu cùng tham số và đánh dấu là shared', () => {
    const a = mat(0xff0000, 0.4);
    expect(mat(0xff0000, 0.4)).toBe(a);
    expect(isSharedMaterial(a)).toBe(true);
    expect(isSharedMaterial(new THREE.MeshStandardMaterial())).toBe(false);
  });
  it('isJob khớp bảng đồng phục', () => {
    expect(isJob('nurse')).toBe(true);
    expect(isJob('player')).toBe(false);
    expect(Object.keys(JOB_UNIFORMS).length).toBeGreaterThanOrEqual(24);
  });
});
