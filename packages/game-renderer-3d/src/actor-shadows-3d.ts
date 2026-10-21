import type { Scene } from '@babylonjs/core/scene';
import { CreateDisc } from '@babylonjs/core/Meshes/Builders/discBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import '@babylonjs/core/Meshes/thinInstanceMesh';

/** Bán kính vệt bóng tròn dưới chân nhân vật (ô). */
export const ACTOR_SHADOW_RADIUS = 0.38;

/** Tính alpha bóng đổ theo mức sáng tự nhiên và giờ: ban ngày rõ nét (~0.35), ban đêm nhạt đi (~0.12). */
export function actorShadowAlpha(sunIntensity: number, lampsOn: number): number {
  const dayAlpha = 0.20 + 0.22 * Math.max(0, Math.min(1, sunIntensity));
  const nightAlpha = 0.12;
  return Math.max(0.08, Math.min(0.45, dayAlpha * (1 - lampsOn) + nightAlpha * lampsOn));
}

/** Cao độ đặt bóng chân: vỉa hè được nâng 0.08, lòng đường/sàn tiệm ở 0. */
export function actorShadowElevation(worldX: number, worldZ: number): number {
  const isSidewalk = worldZ >= 11;
  return isSidewalk ? 0.085 : 0.006;
}

export class ActorShadows3D {
  private mesh: Mesh | null = null;
  private mat: StandardMaterial | null = null;
  private buffer = new Float32Array(16 * 64);
  private capacity = 64;

  constructor(private readonly scene: Scene) {
    this.init();
  }

  private init(): void {
    const disc = CreateDisc('actor_shadow_disc', { radius: ACTOR_SHADOW_RADIUS, tessellation: 16 }, this.scene);
    disc.rotation.x = Math.PI / 2;
    disc.bakeCurrentTransformIntoVertices();
    disc.isPickable = false;

    const mat = new StandardMaterial('actor_shadow_mat', this.scene);
    mat.diffuseColor = Color3.Black();
    mat.specularColor = Color3.Black();
    mat.emissiveColor = Color3.Black();
    mat.disableLighting = true;
    mat.alpha = 0.22;
    mat.backFaceCulling = false;

    disc.material = mat;
    disc.thinInstanceSetBuffer('matrix', this.buffer, 16, true);
    disc.thinInstanceCount = 0;

    this.mesh = disc;
    this.mat = mat;
  }

  public update(
    feet: ReadonlyArray<{ x: number; z: number }>,
    sunIntensity: number,
    lampsOn: number,
  ): void {
    if (!this.mesh || !this.mat) return;

    const alpha = actorShadowAlpha(sunIntensity, lampsOn);
    this.mat.alpha = alpha;

    const count = feet.length;
    if (count === 0) {
      this.mesh.thinInstanceCount = 0;
      return;
    }

    if (count > this.capacity) {
      this.capacity = Math.max(count, this.capacity * 2);
      this.buffer = new Float32Array(16 * this.capacity);
      this.mesh.thinInstanceSetBuffer('matrix', this.buffer, 16, true);
    }

    const buf = this.buffer;
    for (let i = 0; i < count; i++) {
      const f = feet[i];
      const y = actorShadowElevation(f.x, f.z);
      Matrix.Translation(f.x, y, f.z).copyToArray(buf, i * 16);
    }

    this.mesh.thinInstanceSetBuffer('matrix', buf, 16, true);
    this.mesh.thinInstanceCount = count;
  }

  public dispose(): void {
    this.mesh?.dispose();
    this.mat?.dispose();
    this.mesh = null;
    this.mat = null;
  }
}
