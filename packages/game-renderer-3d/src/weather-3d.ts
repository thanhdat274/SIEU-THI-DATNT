import type { Scene } from '@babylonjs/core/scene';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { WEATHER_CONFIG, type WeatherQuality } from '@game/data';

/** Chiều cao cột mưa (đơn vị thế giới) và tốc độ rơi (ô/giây) theo cường độ. */
const RAIN_HEIGHT = 12;
const SPEED_MIN = 9;
const SPEED_MAX = 15;
/** Mật độ vạch mưa 3D so với số giọt tối đa của bản 2D (vùng nhìn 3D rộng hơn, vạch mảnh hơn). */
const DROP_FACTOR = 1.6;
/** Giảm số hạt và tốc độ khi người dùng chọn giảm chuyển động. */
const REDUCED_MOTION_COUNT = 0.25;
const REDUCED_MOTION_SPEED = 0.5;
/** Tốc độ đổi mượt (1/giây) của độ ướt đường và cường độ mưa hiển thị. */
const SMOOTH_RATE = 1.5;
/** Màu đường khô (khớp GROUND_COLORS.street trong map-builder) và độ tối tối đa khi ướt. */
const ROAD_DRY = new Color3(0x4a / 255, 0x4a / 255, 0x52 / 255);
const ROAD_WET_DARKEN = 0.5;
const ROAD_WET_SPECULAR = 0.55;

const frac = (v: number) => v - Math.floor(v);

/** Mưa (vạch rơi bằng thin instances bám theo vùng camera) và đường ướt (vật liệu đường tối + bóng, đổi mượt). */
export class Weather3D {
  private mesh: Mesh | null = null;
  private material: StandardMaterial | null = null;
  private buffer: Float32Array;
  /** Vị trí chuẩn hóa (0..1) của từng vạch: x, y (độ cao), z, tốc độ tương đối. */
  private readonly seeds: Float32Array;
  private road: StandardMaterial | null = null;
  private rain = 0;
  private wetness = 0;
  private elapsed = 0;

  constructor(scene: Scene, private readonly maxDrops: number) {
    const cap = Math.max(1, maxDrops);
    this.buffer = new Float32Array(cap * 16);
    this.seeds = new Float32Array(cap * 4);
    for (let i = 0; i < cap; i++) {
      // Hạt giống tất định (không dùng Math.random để cảnh dựng lại giống nhau).
      this.seeds[i * 4] = frac(Math.sin(i * 12.9898) * 43758.5453);
      this.seeds[i * 4 + 1] = frac(Math.sin(i * 78.233) * 12543.1357);
      this.seeds[i * 4 + 2] = frac(Math.sin(i * 39.346) * 9871.5231);
      this.seeds[i * 4 + 3] = 0.85 + 0.3 * frac(Math.sin(i * 11.135) * 3571.2);
      const o = i * 16;
      this.buffer[o] = this.buffer[o + 5] = this.buffer[o + 10] = this.buffer[o + 15] = 1;
    }
    const drop = CreateBox('rain_drop', { width: 0.03, height: 0.55, depth: 0.03 }, scene);
    this.material = new StandardMaterial('rain_mat', scene);
    this.material.disableLighting = true;
    this.material.emissiveColor = new Color3(0.75, 0.85, 1);
    this.material.alpha = 0.55;
    drop.material = this.material;
    drop.isPickable = false;
    drop.alwaysSelectAsActiveMesh = true;
    drop.isVisible = false;
    drop.thinInstanceSetBuffer('matrix', this.buffer, 16, false);
    drop.thinInstanceCount = 0;
    this.mesh = drop;
  }

  /** Số vạch tối đa theo chất lượng (dùng khi tạo). */
  public static maxDropsFor(quality: WeatherQuality): number {
    return Math.ceil(WEATHER_CONFIG.rain.maxDrops[quality] * DROP_FACTOR);
  }

  /** Gắn vật liệu mặt đường (map-builder) để đổi tối/bóng khi ướt; gọi lại sau mỗi lần dựng bản đồ. */
  public setRoadMaterial(mat: StandardMaterial | null): void {
    this.road = mat;
    this.applyWetness();
  }

  /** Cường độ mưa đã làm mượt (0..1), để tối cảnh theo mưa. */
  public getRain(): number { return this.rain; }

  /**
   * Mỗi khung hình. `rainTarget`/`wetTarget` 0..1 từ mô phỏng; `userIntensity` 0..1 nhân số hạt (cài đặt người chơi);
   * `center` là tâm vùng mưa (ô), `half` nửa cạnh vùng mưa.
   */
  public update(dt: number, rainTarget: number, wetTarget: number, userIntensity: number, reducedMotion: boolean, center: { x: number; z: number }, half: number): void {
    const k = Math.min(1, dt * SMOOTH_RATE);
    this.rain += (rainTarget - this.rain) * k;
    if (Math.abs(this.rain - rainTarget) < 0.002) this.rain = rainTarget;
    const wetBefore = this.wetness;
    this.wetness += (wetTarget - this.wetness) * k;
    if (Math.abs(this.wetness - wetTarget) < 0.002) this.wetness = wetTarget;
    if (this.wetness !== wetBefore) this.applyWetness();

    const mesh = this.mesh;
    if (!mesh) return;
    const density = this.rain * userIntensity * (reducedMotion ? REDUCED_MOTION_COUNT : 1);
    const n = Math.min(this.seeds.length / 4, Math.round(this.maxDrops * density));
    mesh.isVisible = n > 0;
    mesh.thinInstanceCount = n;
    if (n === 0) return;
    const size = half * 2;
    const speed = (SPEED_MIN + (SPEED_MAX - SPEED_MIN) * this.rain) * (reducedMotion ? REDUCED_MOTION_SPEED : 1);
    const cx = center.x / size;
    const cz = center.z / size;
    for (let i = 0; i < n; i++) {
      const s = i * 4;
      // Vạch rơi theo y chuẩn hóa; x/z cố định trong không gian thế giới (cuộn vòng quanh tâm) nên không trượt khi camera đi.
      const y = frac(this.seeds[s + 1] - (speed * this.seeds[s + 3] * this.elapsed) / RAIN_HEIGHT);
      const o = i * 16;
      this.buffer[o + 12] = center.x + (frac(this.seeds[s] - cx) - 0.5) * size;
      this.buffer[o + 13] = y * RAIN_HEIGHT;
      this.buffer[o + 14] = center.z + (frac(this.seeds[s + 2] - cz) - 0.5) * size;
    }
    this.elapsed += dt;
    mesh.thinInstanceBufferUpdated('matrix');
  }

  private applyWetness(): void {
    const road = this.road;
    if (!road) return;
    const w = this.wetness;
    const d = 1 - ROAD_WET_DARKEN * w;
    road.diffuseColor.set(ROAD_DRY.r * d, ROAD_DRY.g * d, ROAD_DRY.b * d * 1.05);
    const sp = ROAD_WET_SPECULAR * w;
    road.specularColor.set(sp, sp, sp);
    road.specularPower = 48;
  }

  public dispose(): void {
    this.mesh?.dispose();
    this.material?.dispose();
    this.mesh = null;
    this.material = null;
    this.road = null;
  }
}
