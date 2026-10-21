import type { Scene } from '@babylonjs/core/scene';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Material } from '@babylonjs/core/Materials/material';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { GameSimulation } from '@game/core';
import { TILE_SIZE, type StreetVehicleState } from '@game/shared';
import { PixelTextureFactory } from '@game/renderer';
import { billboardCenter, isoAlpha, pixelToWorld } from './coords';
import { parkedVehicleKey, vehicleFacing, vehicleFootY, vehicleTextureKey } from './vehicle-view';
import type { CrowdView } from './crowd-3d';
import type { Sky3D } from './sky-3d';

/** Dư (px) quanh vùng nhìn trước khi xe bị bỏ khỏi cảnh (xe dài tới ~190 px). */
const CULL_MARGIN_PX = 240;
/** Khung xe trong atlas PNG (ô tô, xe buýt nhỏ, xe tải); khóa khác (xe máy, xe đạp, xe dọc) vẽ bằng code. */
const ATLAS_PATH = 'vehicles/vehicles.json';

interface VehicleTexture { material: StandardMaterial; w: number; h: number }
interface VehicleEntry { mesh: Mesh; key: string; seen: number }

interface VehicleLightPair {
  headMesh: Mesh;
  tailMesh: Mesh;
  seen: number;
}

const VEHICLE_LIGHT_SPECS: Record<StreetVehicleState['type'], { front: number; rear: number; headY: number; tailY: number }> = {
  car: { front: 41, rear: 41, headY: 14, tailY: 14 },
  motorbike: { front: 27, rear: 29, headY: 29, tailY: 21 },
  bicycle: { front: 30, rear: 28, headY: 28, tailY: 20 },
  minibus: { front: 64, rear: 64, headY: 17, tailY: 17 },
  truck: { front: 86, rear: 86, headY: 18, tailY: 18 },
};

function spriteBase(): string {
  const env = (import.meta as unknown as { env?: { BASE_URL?: string } }).env;
  return `${env?.BASE_URL ?? '/'}assets/sprites/`;
}

/**
 * Xe chạy trên mạng đường khu phố và xe khách đỗ ở bãi: mỗi xe một tấm phẳng luôn quay mặt về camera (như sprite người),
 * hình lấy từ cùng nguồn với Pixi (atlas PNG, còn lại canvas vẽ bằng code của PixelTextureFactory).
 * Xoay camera thì xe đổi sang khung nhìn trước/sau hoặc nhìn ngang (xem vehicle-view.ts).
 */
export class Vehicles3D {
  private readonly entries = new Map<string, VehicleEntry>();
  private readonly externalEntries = new Map<string, VehicleEntry>();
  private readonly pool: Mesh[] = [];
  private readonly textures = new Map<string, VehicleTexture>();
  private readonly factory = new PixelTextureFactory();
  private atlasImage: HTMLImageElement | null = null;
  private atlasFrames = new Map<string, { x: number; y: number; w: number; h: number }>();
  private frameId = 0;

  // Đèn xe ban đêm
  private readonly lightEntries = new Map<string, VehicleLightPair>();
  private readonly headPool: Mesh[] = [];
  private readonly tailPool: Mesh[] = [];
  private headMat: StandardMaterial | null = null;
  private tailMat: StandardMaterial | null = null;

  constructor(
    private readonly scene: Scene,
    private readonly simulation: GameSimulation,
    private readonly sky: Sky3D | null = null,
  ) {
    this.initLights();
  }

  private initLights(): void {
    const headMat = new StandardMaterial('veh_headlight_mat', this.scene);
    headMat.emissiveColor = new Color3(1, 0.94, 0.72);
    headMat.disableLighting = true;
    headMat.specularColor = Color3.Black();
    headMat.backFaceCulling = false;
    this.headMat = headMat;

    const tailMat = new StandardMaterial('veh_taillight_mat', this.scene);
    tailMat.emissiveColor = new Color3(1, 0.23, 0.19);
    tailMat.disableLighting = true;
    tailMat.specularColor = Color3.Black();
    tailMat.backFaceCulling = false;
    this.tailMat = tailMat;
  }

  private acquireLightMesh(isHead: boolean): Mesh {
    const pool = isHead ? this.headPool : this.tailPool;
    const reused = pool.pop();
    if (reused) {
      reused.isVisible = true;
      return reused;
    }
    const mesh = CreatePlane(isHead ? 'headlight' : 'taillight', { width: 0.18, height: 0.18 }, this.scene);
    mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    mesh.material = isHead ? this.headMat : this.tailMat;
    mesh.isPickable = false;
    if (this.sky) {
      this.sky.addLightMesh(mesh);
    }
    return mesh;
  }

  /** Nạp atlas xe; lỗi/thiếu thì mọi xe dùng canvas vẽ bằng code. */
  public async load(): Promise<void> {
    try {
      const base = spriteBase();
      const res = await fetch(`${base}${ATLAS_PATH}`);
      if (!res.ok) return;
      const json = await res.json() as { image?: string; frames?: Record<string, { frame?: { x: number; y: number; w: number; h: number } } | { x: number; y: number; w: number; h: number }> };
      if (!json.image || !json.frames) return;
      const img = await new Promise<HTMLImageElement | null>((resolve) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => resolve(null);
        i.src = `${base}vehicles/${json.image}`;
      });
      if (!img) return;
      this.atlasImage = img;
      for (const [k, v] of Object.entries(json.frames)) {
        const f = (v as { frame?: { x: number; y: number; w: number; h: number } }).frame ?? (v as { x: number; y: number; w: number; h: number });
        if (typeof f?.x === 'number') this.atlasFrames.set(k, f);
      }
    } catch { /* không có atlas: dùng hình vẽ bằng code */ }
  }

  public get activeCount(): number { return this.entries.size; }

  private sourceCanvas(key: string): HTMLCanvasElement {
    if (typeof document === 'undefined') {
      return { width: 32, height: 32, getContext: () => null } as unknown as HTMLCanvasElement;
    }
    const f = this.atlasFrames.get(key);
    if (f && this.atlasImage) {
      const c = document.createElement('canvas');
      c.width = f.w;
      c.height = f.h;
      const ctx = c.getContext('2d');
      ctx?.drawImage(this.atlasImage, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
      return c;
    }
    return this.factory.getCanvas(key);
  }

  private textureFor(key: string): VehicleTexture {
    const cached = this.textures.get(key);
    if (cached) return cached;
    if (typeof document === 'undefined') {
      const material = new StandardMaterial(`veh_mat_${key}`, this.scene);
      const entry = { material, w: 64, h: 32 };
      this.textures.set(key, entry);
      return entry;
    }
    const src = this.sourceCanvas(key);
    const tex = new DynamicTexture(`veh_${key}`, { width: src.width, height: src.height }, this.scene, false, Texture.NEAREST_SAMPLINGMODE);
    tex.hasAlpha = true;
    const ctx = tex.getContext() as CanvasRenderingContext2D;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0);
    tex.update(true);
    const material = new StandardMaterial(`veh_mat_${key}`, this.scene);
    material.diffuseTexture = tex;
    material.useAlphaFromDiffuseTexture = true;
    material.transparencyMode = Material.MATERIAL_ALPHATEST;
    material.alphaCutOff = 0.4;
    material.diffuseColor = Color3.White();
    material.specularColor = Color3.Black();
    // disableLighting = false để nhận ánh sáng mặt trời/hemi ngày-đêm đúng sprite
    material.backFaceCulling = false;
    const entry = { material, w: src.width, h: src.height };
    this.textures.set(key, entry);
    return entry;
  }

  private acquire(): Mesh {
    const reused = this.pool.pop();
    if (reused) { reused.isVisible = true; return reused; }
    const mesh = CreatePlane('vehicle', { width: 1, height: 1 }, this.scene);
    mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    mesh.isPickable = false;
    return mesh;
  }

  /** Đặt một xe từ bên ngoài (logistics): quản lý trong externalEntries, không bị dọn bởi update() */
  public placeExternalVehicle(id: string, key: string, x: number, footY: number, quarter: number, beta: number): void {
    let e = this.externalEntries.get(id);
    if (!e) {
      e = { mesh: this.acquire(), key: '', seen: 0 };
      this.externalEntries.set(id, e);
    }
    const t = this.textureFor(key);
    if (e.key !== key) { e.key = key; e.mesh.material = t.material; }
    e.mesh.isVisible = true;
    const w = t.w / TILE_SIZE;
    const h = t.h / TILE_SIZE;
    e.mesh.scaling.set(w, h, 1);
    const world = pixelToWorld(x, footY);
    const c = billboardCenter(world.x, world.z, h, isoAlpha(quarter), beta);
    e.mesh.position.set(c.x, c.y, c.z);
  }

  /** Xóa xe đặt từ bên ngoài khi sự kiện kết thúc. */
  public clearExternalVehicle(id: string): void {
    const e = this.externalEntries.get(id);
    if (e) {
      e.mesh.isVisible = false;
      this.pool.push(e.mesh);
      this.externalEntries.delete(id);
    }
  }

  /** Tìm mesh của một xe (nội bộ hoặc ngoài) phục vụ kiểm thử và debug. */
  public findVehicleMesh(id: string): Mesh | null {
    return this.externalEntries.get(id)?.mesh ?? this.entries.get(id)?.mesh ?? null;
  }

  private place(id: string, key: string, x: number, footY: number, quarter: number, beta: number): void {
    let e = this.entries.get(id);
    if (!e) {
      e = { mesh: this.acquire(), key: '', seen: 0 };
      this.entries.set(id, e);
    }
    e.seen = this.frameId;
    const t = this.textureFor(key);
    if (e.key !== key) { e.key = key; e.mesh.material = t.material; }
    const w = t.w / TILE_SIZE;
    const h = t.h / TILE_SIZE;
    e.mesh.scaling.set(w, h, 1);
    const world = pixelToWorld(x, footY);
    const c = billboardCenter(world.x, world.z, h, isoAlpha(quarter), beta);
    e.mesh.position.set(c.x, c.y, c.z);
  }

  private placeLights(v: StreetVehicleState, lampsOn: number, quarter: number, beta: number): void {
    if (lampsOn <= 0.05 || v.axis === 'y') return; // xe đường dọc hoặc ban ngày: không vẽ đèn
    const spec = VEHICLE_LIGHT_SPECS[v.type] ?? VEHICLE_LIGHT_SPECS.car;
    const dir = v.direction === 'right' ? 1 : -1;

    let pair = this.lightEntries.get(v.id);
    if (!pair) {
      pair = {
        headMesh: this.acquireLightMesh(true),
        tailMesh: this.acquireLightMesh(false),
        seen: 0,
      };
      this.lightEntries.set(v.id, pair);
    }
    pair.seen = this.frameId;
    pair.headMesh.isVisible = true;
    pair.tailMesh.isVisible = true;

    // Vị trí đèn pha (đầu xe) và đèn hậu (đuôi xe)
    const headX = v.position.x + dir * spec.front;
    const headFootY = v.position.y;
    const headWorld = pixelToWorld(headX, headFootY);
    const headHeight = (spec.headY * 2) / TILE_SIZE;
    const hc = billboardCenter(headWorld.x, headWorld.z, headHeight, isoAlpha(quarter), beta);
    pair.headMesh.position.set(hc.x, hc.y, hc.z);

    const tailX = v.position.x - dir * spec.rear;
    const tailFootY = v.position.y;
    const tailWorld = pixelToWorld(tailX, tailFootY);
    const tailHeight = (spec.tailY * 2) / TILE_SIZE;
    const tc = billboardCenter(tailWorld.x, tailWorld.z, tailHeight, isoAlpha(quarter), beta);
    pair.tailMesh.position.set(tc.x, tc.y, tc.z);
  }

  public update(quarter: number, beta: number, view: CrowdView, lampsOn = 0): void {
    this.frameId++;
    const sim = this.simulation;
    const r = view.radius * TILE_SIZE + CULL_MARGIN_PX;
    const cx = view.centerX * TILE_SIZE;
    const cy = view.centerZ * TILE_SIZE;
    const inView = (x: number, y: number): boolean => Math.abs(x - cx) <= r && Math.abs(y - cy) <= r;

    for (const v of sim.getStreetVehicles()) {
      if (!inView(v.position.x, v.position.y)) continue;
      const facing = vehicleFacing(v.axis, v.direction, quarter);
      this.place(`v:${v.id}`, vehicleTextureKey(v, facing), v.position.x, vehicleFootY(v), quarter, beta);
      this.placeLights(v, lampsOn, quarter, beta);
    }
    for (const c of sim.peekCustomers()) {
      const spot = c.vehicleSpot;
      if (!spot) continue;
      const key = parkedVehicleKey(c.arrivalMode, c.vehicleVariant);
      if (!key || !inView(spot.x, spot.y)) continue;
      this.place(`p:${c.id ?? c.checkoutId ?? 'vehicle'}`, key, spot.x, spot.y, quarter, beta);
    }

    for (const [id, e] of this.entries) {
      if (e.seen === this.frameId) continue;
      e.mesh.isVisible = false;
      this.pool.push(e.mesh);
      this.entries.delete(id);
    }

    for (const [id, pair] of this.lightEntries) {
      if (pair.seen === this.frameId) continue;
      pair.headMesh.isVisible = false;
      pair.tailMesh.isVisible = false;
      this.headPool.push(pair.headMesh);
      this.tailPool.push(pair.tailMesh);
      this.lightEntries.delete(id);
    }
  }

  public dispose(): void {
    for (const e of this.entries.values()) e.mesh.dispose();
    for (const e of this.externalEntries.values()) e.mesh.dispose();
    for (const m of this.pool) m.dispose();
    this.entries.clear();
    this.externalEntries.clear();
    this.pool.length = 0;

    for (const pair of this.lightEntries.values()) {
      this.sky?.removeLightMesh(pair.headMesh);
      this.sky?.removeLightMesh(pair.tailMesh);
      pair.headMesh.dispose();
      pair.tailMesh.dispose();
    }
    for (const m of this.headPool) {
      this.sky?.removeLightMesh(m);
      m.dispose();
    }
    for (const m of this.tailPool) {
      this.sky?.removeLightMesh(m);
      m.dispose();
    }
    this.lightEntries.clear();
    this.headPool.length = 0;
    this.tailPool.length = 0;
    this.headMat?.dispose();
    this.tailMat?.dispose();
    this.headMat = null;
    this.tailMat = null;

    for (const t of this.textures.values()) t.material.dispose(true, true);
    this.textures.clear();
    this.factory.destroy();
  }
}
