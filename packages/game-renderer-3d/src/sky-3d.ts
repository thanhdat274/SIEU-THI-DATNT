import type { Scene } from '@babylonjs/core/scene';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import '@babylonjs/core/Layers/effectLayerSceneComponent';
import { CreateDisc } from '@babylonjs/core/Meshes/Builders/discBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { getLightingState, lerpColor } from '@game/core';
import { STREET_LAMP_TILES } from '@game/data';

/** Ánh sáng cảnh 3D tại một thời điểm (màu dạng 0xRRGGBB). */
export interface SkyLighting {
  sunIntensity: number;
  sunColor: number;
  /** Hướng tia nắng (vector đơn vị, hệ cảnh: +X đông, +Z nam, +Y lên); luôn chếch xuống để mặt tường vẫn nhận sáng. */
  sunDir: { x: number; y: number; z: number };
  hemiIntensity: number;
  hemiColor: number;
  groundColor: number;
  skyColor: number;
  /** Mức bật đèn đường/đèn nhân tạo 0..1. */
  lampsOn: number;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** Xám cùng độ sáng với màu `c` (giảm bão hòa khi mưa). */
const greyOf = (c: number) => {
  const y = Math.round(0.3 * ((c >> 16) & 255) + 0.59 * ((c >> 8) & 255) + 0.11 * (c & 255));
  return (y << 16) | (y << 8) | y;
};
/** Ban đêm nâng nền xanh lên chút để vẫn thấy đường đi (bản 2D nhân màu tối, 3D cộng thêm đèn nhân tạo). */
const NIGHT_LIFT = 0x6a78b4;
/** Màu bật lại từ mặt đất lên (nửa dưới đèn hemi), như hemi.groundColor cũ. */
const GROUND_BOUNCE = 0x736b80;

/**
 * Ánh sáng theo giờ game, dựa trên getLightingState (cùng bảng màu bản 2D) rồi đổi sang tham số đèn Babylon.
 * `rain` 0..1: trời mưa tối và ngả xám hơn. Hàm thuần.
 */
export function lightingAt(hour: number, minute = 0, day = 1, rain = 0): SkyLighting {
  const s = getLightingState(hour, minute, day);
  const r = clamp01(rain);
  const grey = (c: number, k = 0.5) => lerpColor(c, greyOf(c), k * r);
  // Mặt trời chạm chân trời vẫn chiếu chếch (≥ 0.25 rad) để không có hướng ngược lên.
  const el = Math.max(s.sunElevation, 0.25);
  const hemi = lerpColor(s.outdoor, NIGHT_LIFT, 0.45 * (1 - s.sun));
  return {
    sunIntensity: 0.8 * s.sun * (1 - 0.6 * r),
    sunColor: grey(s.outdoor, 0.7),
    sunDir: { x: -Math.sin(s.sunAzimuth) * Math.cos(el), y: -Math.sin(el), z: Math.cos(s.sunAzimuth) * Math.cos(el) },
    hemiIntensity: 0.85 * (1 - 0.25 * r),
    hemiColor: grey(hemi),
    groundColor: grey(lerpColor(GROUND_BOUNCE, hemi, 0.5)),
    skyColor: lerpColor(grey(s.sky), 0x4a5058, 0.45 * r),
    lampsOn: s.artificial,
  };
}

const toColor3 = (c: number) => new Color3(((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255);
/** Bán kính vệt sáng dưới đèn đường (ô). */
const LAMP_POOL_RADIUS = 1.8;
/** Độ trong tối đa của vệt sáng dưới đèn. */
const LAMP_POOL_ALPHA = 0.32;

/** Bầu trời + ánh sáng cảnh: hemi/sun/clearColor theo giờ, đèn đường tự sáng về đêm (đầu đèn emissive + vệt sáng + glow nhẹ). */
export class Sky3D {
  private readonly hemi: HemisphericLight;
  private readonly sun: DirectionalLight;
  private glow: GlowLayer | null = null;
  private lampHead: StandardMaterial | null = null;
  private pool: Mesh | null = null;
  private poolMat: StandardMaterial | null = null;

  private readonly includedMeshes = new Set<Mesh>();

  constructor(private readonly scene: Scene) {
    this.hemi = new HemisphericLight('sky', new Vector3(0, 1, 0), scene);
    this.sun = new DirectionalLight('sun', new Vector3(-0.5, -1, 0.35), scene);
    this.glow = new GlowLayer('night_glow', scene, { mainTextureRatio: 0.25, blurKernelSize: 24 });
    this.glow.intensity = 0;
    this.glow.isEnabled = false;
    this.poolMat = new StandardMaterial('lamp_pool_mat', scene);
    this.poolMat.disableLighting = true;
    this.poolMat.emissiveColor = new Color3(1, 0.85, 0.5);
    this.poolMat.alpha = 0;
    this.poolMat.specularColor = Color3.Black();
    this.poolMat.backFaceCulling = false;
    this.buildLampPools();
  }

  /** Thêm mesh nguồn sáng chỉ định vào danh sách GlowLayer duy nhất được phát sáng. */
  public addLightMesh(mesh: Mesh): void {
    if (this.includedMeshes.has(mesh)) return;
    this.includedMeshes.add(mesh);
    this.glow?.addIncludedOnlyMesh(mesh);
  }

  /** Bỏ mesh khỏi danh sách GlowLayer. */
  public removeLightMesh(mesh: Mesh): void {
    if (!this.includedMeshes.has(mesh)) return;
    this.includedMeshes.delete(mesh);
    this.glow?.removeIncludedOnlyMesh(mesh);
  }

  /** Vệt sáng ấm trên mặt đất dưới mỗi đèn đường, một mesh thin instances. */
  private buildLampPools(): void {
    if (!STREET_LAMP_TILES.length) return;
    const disc = CreateDisc('lamp_pool', { radius: LAMP_POOL_RADIUS, tessellation: 20 }, this.scene);
    disc.rotation.x = Math.PI / 2;
    disc.bakeCurrentTransformIntoVertices();
    disc.material = this.poolMat;
    disc.isPickable = false;
    disc.isVisible = false;
    disc.alwaysSelectAsActiveMesh = true;
    const buf = new Float32Array(STREET_LAMP_TILES.length * 16);
    STREET_LAMP_TILES.forEach((l, i) => Matrix.Translation(l.x + 0.5, 0.03, l.y + 0.6).copyToArray(buf, i * 16));
    disc.thinInstanceSetBuffer('matrix', buf, 16, true);
    this.pool = disc;
  }

  /** Gắn vật liệu đầu đèn (map-builder) để đổi sáng/tối theo giờ; gọi lại sau mỗi lần dựng bản đồ. */
  public setLampSource(mat: StandardMaterial | null, headMesh: Mesh | null): void {
    this.lampHead = mat;
    if (headMesh) this.addLightMesh(headMesh);
  }

  public setLampMaterial(mat: StandardMaterial | null): void { this.lampHead = mat; }

  public update(hour: number, minute: number, day: number, rain: number): void {
    const l = lightingAt(hour, minute, day, rain);
    this.hemi.intensity = l.hemiIntensity;
    this.hemi.diffuse = toColor3(l.hemiColor);
    this.hemi.groundColor = toColor3(l.groundColor);
    this.sun.intensity = l.sunIntensity;
    this.sun.diffuse = toColor3(l.sunColor);
    this.sun.direction.set(l.sunDir.x, l.sunDir.y, l.sunDir.z);
    const c = toColor3(l.skyColor);
    this.scene.clearColor = new Color4(c.r, c.g, c.b, 1);
    const on = l.lampsOn;
    if (this.lampHead) this.lampHead.emissiveColor.set(0.25 + 0.75 * on, (0.25 + 0.75 * on) * 0.91, (0.25 + 0.75 * on) * 0.66);
    if (this.poolMat) this.poolMat.alpha = LAMP_POOL_ALPHA * on;
    if (this.pool) this.pool.isVisible = on > 0.02;
    if (this.glow) {
      this.glow.isEnabled = on > 0.05;
      this.glow.intensity = 0.7 * on;
    }
  }

  public dispose(): void {
    this.glow?.dispose();
    this.pool?.dispose();
    this.poolMat?.dispose();
    this.hemi.dispose();
    this.sun.dispose();
    this.glow = null;
    this.pool = null;
    this.poolMat = null;
    this.lampHead = null;
    this.includedMeshes.clear();
  }
}
