import type { Scene } from '@babylonjs/core/scene';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Material } from '@babylonjs/core/Materials/material';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import type { AssetContainer } from '@babylonjs/core/assetContainer';
import '@babylonjs/loaders/glTF/index.js';
import type { GameSimulation } from '@game/core';
import { TILE_SIZE, type LogisticsTruckType } from '@game/shared';
import { PixelTextureFactory } from '@game/renderer';
import { billboardCenter, isoAlpha, pixelToWorld } from './coords';
import { parkedVehicleKey, vehicleFacing, vehicleFootY, vehicleTextureKey } from './vehicle-view';
import type { CrowdView } from './crowd-3d';
import type { Sky3D } from './sky-3d';
import {
  CAR_CATALOG,
  CAR_MODELS,
  resolveCarModelForStreetVehicle,
  resolveCarModelForLogisticsTruck,
  vehicleYawFromMovement,
  type CarModelKind,
} from './car-models';
import { MotorbikeFactory, type MotorbikeRig } from './motorbike-factory';
import { NEUTRAL_TINT, sameTint, type LightTint } from './actor-light';

const CULL_MARGIN_PX = 240;
const ATLAS_PATH = 'vehicles/vehicles.json';

interface VehicleTexture {
  material: StandardMaterial;
  w: number;
  h: number;
}

interface VehicleBillboardEntry {
  mesh: Mesh;
  key: string;
  seen: number;
}

interface VehicleLightPair {
  headMesh: Mesh;
  tailMesh: Mesh;
  seen: number;
}

interface Car3DInstance {
  id: string;
  kind: CarModelKind;
  root: TransformNode;
  renderMeshes: Mesh[];
  wheels: Mesh[];
  wheelSpin: number;
  seenFrame: number;
}

interface MotorbikeInstance {
  id: string;
  rig: MotorbikeRig;
  wheelSpin: number;
  seenFrame: number;
}

function spriteBase(): string {
  const env = (import.meta as unknown as { env?: { BASE_URL?: string } }).env;
  return `${env?.BASE_URL ?? '/'}assets/sprites/`;
}

export class Vehicles3D {
  // 3D Car models & containers
  private readonly carContainers = new Map<CarModelKind, AssetContainer>();
  private readonly carPool = new Map<CarModelKind, Car3DInstance[]>();
  private readonly carInstances = new Map<string, Car3DInstance>();

  // 3D Motorbikes
  private motorbikeFactory: MotorbikeFactory | null = null;
  private readonly mbPool: MotorbikeInstance[] = [];
  private readonly mbInstances = new Map<string, MotorbikeInstance>();

  // State & fallback billboards
  private is3DLoaded = false;
  private loadFailed = false;
  private readonly fallbackEntries = new Map<string, VehicleBillboardEntry>();
  private readonly externalFallbackEntries = new Map<string, VehicleBillboardEntry>();
  private readonly fallbackPool: Mesh[] = [];
  private readonly textures = new Map<string, VehicleTexture>();
  private readonly factory = new PixelTextureFactory();
  private atlasImage: HTMLImageElement | null = null;
  private atlasFrames = new Map<string, { x: number; y: number; w: number; h: number }>();
  private frameId = 0;

  // External 3D vehicles (e.g. logistics truck)
  private readonly external3DCarIds = new Set<string>();

  // Đèn xe ban đêm (3D + 2D)
  private readonly lightEntries = new Map<string, VehicleLightPair>();
  private readonly headPool: Mesh[] = [];
  private readonly tailPool: Mesh[] = [];
  private headMat: StandardMaterial | null = null;
  private tailMat: StandardMaterial | null = null;
  private lightTint: LightTint = NEUTRAL_TINT;

  constructor(
    private readonly scene: Scene,
    private readonly simulation: GameSimulation,
    private readonly sky: Sky3D | null = null,
  ) {
    this.motorbikeFactory = new MotorbikeFactory(scene);
    this.initLights();
    void this.loadAllCarModels();
  }

  public get isReady(): boolean {
    return this.is3DLoaded && !this.loadFailed;
  }

  public get activeCount(): number {
    return this.carInstances.size + this.mbInstances.size + this.fallbackEntries.size;
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

  private async loadAllCarModels(): Promise<void> {
    try {
      const loadPromises = CAR_MODELS.map(async (kind) => {
        const spec = CAR_CATALOG[kind];
        const lastSlash = spec.url.lastIndexOf('/');
        const rootUrl = lastSlash !== -1 ? spec.url.slice(0, lastSlash + 1) : '';
        const filename = lastSlash !== -1 ? spec.url.slice(lastSlash + 1) : spec.url;

        const container = await SceneLoader.LoadAssetContainerAsync(rootUrl, filename, this.scene);
        if (this.scene.isDisposed) {
          container.dispose();
          return null;
        }

        for (const mat of container.materials) {
          if (mat instanceof StandardMaterial) {
            mat.specularColor = Color3.Black();
            if (mat.diffuseTexture instanceof Texture) {
              mat.diffuseTexture.updateSamplingMode(Texture.NEAREST_SAMPLINGMODE);
            }
          } else if (mat instanceof PBRMaterial) {
            mat.metallic = 0;
            mat.roughness = 1;
            if (mat.albedoTexture instanceof Texture) {
              mat.albedoTexture.updateSamplingMode(Texture.NEAREST_SAMPLINGMODE);
            }
          }
        }
        return { kind, container };
      });

      const results = await Promise.all(loadPromises);
      for (const res of results) {
        if (res) {
          this.carContainers.set(res.kind, res.container);
        }
      }
      this.is3DLoaded = this.carContainers.size > 0;
    } catch (err) {
      console.warn('[Vehicles3D] Tải model xe 3D thất bại, giữ fallback sprite:', err);
      this.loadFailed = true;
    }
  }

  /** Nạp atlas xe fallback; lỗi/thiếu thì mọi xe dùng canvas vẽ bằng code. */
  public async load(): Promise<void> {
    try {
      const base = spriteBase();
      const res = await fetch(`${base}${ATLAS_PATH}`);
      if (!res.ok) return;
      const json = (await res.json()) as {
        image?: string;
        frames?: Record<string, { frame?: { x: number; y: number; w: number; h: number } } | { x: number; y: number; w: number; h: number }>;
      };
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
        const f =
          (v as { frame?: { x: number; y: number; w: number; h: number } }).frame ??
          (v as { x: number; y: number; w: number; h: number });
        if (typeof f?.x === 'number') this.atlasFrames.set(k, f);
      }
    } catch {
      /* không có atlas: dùng hình vẽ bằng code */
    }
  }

  public setLightTint(t: LightTint): void {
    if (sameTint(t, this.lightTint)) return;
    this.lightTint = t;
    for (const { material } of this.textures.values()) this.applyTint(material);
  }

  private applyTint(material: StandardMaterial): void {
    material.disableLighting = true;
    material.emissiveColor.set(this.lightTint.r, this.lightTint.g, this.lightTint.b);
  }

  private createCarInstance(kind: CarModelKind, id: string): Car3DInstance | null {
    const container = this.carContainers.get(kind);
    if (!container) return null;

    const instantiated = container.instantiateModelsToScene((name) => `${id}_${name}`);
    const root = instantiated.rootNodes[0] as TransformNode;
    const spec = CAR_CATALOG[kind];
    root.scaling.set(spec.scale, spec.scale, spec.scale);

    const renderMeshes: Mesh[] = [];
    const wheels: Mesh[] = [];

    for (const node of root.getChildren(undefined, false)) {
      if ((node as Mesh).geometry) {
        const m = node as Mesh;
        m.isPickable = false;
        m.receiveShadows = true;
        renderMeshes.push(m);
        if (m.name.includes('wheel')) {
          wheels.push(m);
        }
      }
    }

    return {
      id,
      kind,
      root,
      renderMeshes,
      wheels,
      wheelSpin: 0,
      seenFrame: this.frameId,
    };
  }

  private acquireCarInstance(kind: CarModelKind, id: string): Car3DInstance | null {
    let poolList = this.carPool.get(kind);
    if (!poolList) {
      poolList = [];
      this.carPool.set(kind, poolList);
    }
    let inst = poolList.pop();
    if (!inst) {
      inst = this.createCarInstance(kind, id) ?? undefined;
    }
    if (inst) {
      inst.id = id;
      inst.seenFrame = this.frameId;
      inst.root.setEnabled(true);
      this.carInstances.set(id, inst);
      return inst;
    }
    return null;
  }

  private acquireMotorbikeInstance(id: string, variant: number, hasCargoBox = false): MotorbikeInstance {
    let inst = this.mbPool.pop();
    if (!inst) {
      if (!this.motorbikeFactory) {
        this.motorbikeFactory = new MotorbikeFactory(this.scene);
      }
      const rig = this.motorbikeFactory.createMotorbike(id, variant, hasCargoBox);
      inst = {
        id,
        rig,
        wheelSpin: 0,
        seenFrame: this.frameId,
      };
    }
    inst.id = id;
    inst.seenFrame = this.frameId;
    inst.rig.root.setEnabled(true);
    inst.rig.cargoBoxMesh.setEnabled(hasCargoBox);
    this.mbInstances.set(id, inst);
    return inst;
  }

  private updateCar3D(
    id: string,
    kind: CarModelKind,
    worldX: number,
    worldZ: number,
    axis: 'x' | 'y' | undefined,
    direction: 'left' | 'right',
    speedPx: number,
    lampsOn: number,
    quarter: number,
    beta: number,
  ): void {
    let inst = this.carInstances.get(id);
    if (!inst || inst.kind !== kind) {
      if (inst) {
        inst.root.setEnabled(false);
        this.carInstances.delete(id);
        const pList = this.carPool.get(inst.kind);
        if (pList) pList.push(inst);
      }
      inst = this.acquireCarInstance(kind, id) ?? undefined;
      if (!inst) return;
    }
    inst.seenFrame = this.frameId;
    inst.root.setEnabled(true);

    const yaw = vehicleYawFromMovement(axis, direction);
    inst.root.rotation.y = yaw;
    inst.root.position.set(worldX, 0, worldZ);

    // Quay bánh xe theo tốc độ
    const moving = speedPx > 0.05;
    if (moving && inst.wheels.length > 0) {
      const deltaSpin = (speedPx / 32) * 0.15;
      inst.wheelSpin += deltaSpin;
      for (const w of inst.wheels) {
        w.rotation.x = inst.wheelSpin;
      }
    }

    // Đèn pha / đèn hậu
    if (lampsOn > 0.05) {
      const spec = CAR_CATALOG[kind];
      const scaledFrontZ = spec.headlightOffset.z * spec.scale;
      const scaledRearZ = spec.taillightOffset.z * spec.scale;
      const scaledY = spec.headlightOffset.y * spec.scale;

      const fwd = inst.root.forward;
      const headPos = {
        x: worldX + fwd.x * scaledFrontZ,
        y: scaledY,
        z: worldZ + fwd.z * scaledFrontZ,
      };
      const tailPos = {
        x: worldX + fwd.x * scaledRearZ,
        y: scaledY,
        z: worldZ + fwd.z * scaledRearZ,
      };

      this.place3DLights(id, headPos, tailPos, quarter, beta);
    }
  }

  private updateMotorbike3D(
    id: string,
    variant: number,
    worldX: number,
    worldZ: number,
    axis: 'x' | 'y' | undefined,
    direction: 'left' | 'right',
    speedPx: number,
    lampsOn: number,
    hasCargoBox = false,
    quarter: number,
    beta: number,
  ): void {
    let inst = this.mbInstances.get(id);
    if (!inst) {
      inst = this.acquireMotorbikeInstance(id, variant, hasCargoBox);
    }
    inst.seenFrame = this.frameId;
    inst.rig.root.setEnabled(true);
    inst.rig.cargoBoxMesh.setEnabled(hasCargoBox);

    const yaw = vehicleYawFromMovement(axis, direction);
    inst.rig.root.rotation.y = yaw;
    inst.rig.root.position.set(worldX, 0, worldZ);

    const moving = speedPx > 0.05;
    if (moving) {
      const deltaSpin = (speedPx / 32) * 0.2;
      inst.wheelSpin += deltaSpin;
      inst.rig.wheelFront.rotation.y = inst.wheelSpin;
      inst.rig.wheelBack.rotation.y = inst.wheelSpin;
    }

    if (lampsOn > 0.05) {
      const headPos = inst.rig.getHeadlightWorldPos();
      const tailPos = inst.rig.getTaillightWorldPos();
      this.place3DLights(id, headPos, tailPos, quarter, beta);
    }
  }

  private place3DLights(
    id: string,
    headPos: { x: number; y: number; z: number },
    tailPos: { x: number; y: number; z: number },
    quarter: number,
    beta: number,
  ): void {
    let pair = this.lightEntries.get(id);
    if (!pair) {
      pair = {
        headMesh: this.acquireLightMesh(true),
        tailMesh: this.acquireLightMesh(false),
        seen: 0,
      };
      this.lightEntries.set(id, pair);
    }
    pair.seen = this.frameId;
    pair.headMesh.isVisible = true;
    pair.tailMesh.isVisible = true;

    const hc = billboardCenter(headPos.x, headPos.z, headPos.y, isoAlpha(quarter), beta);
    pair.headMesh.position.set(hc.x, hc.y, hc.z);

    const tc = billboardCenter(tailPos.x, tailPos.z, tailPos.y, isoAlpha(quarter), beta);
    pair.tailMesh.position.set(tc.x, tc.y, tc.z);
  }

  // --- FALLBACK BILLBOARD METHODS ---
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
      this.applyTint(material);
      const entry = { material, w: 64, h: 32 };
      this.textures.set(key, entry);
      return entry;
    }
    const src = this.sourceCanvas(key);
    const tex = new DynamicTexture(
      `veh_${key}`,
      { width: src.width, height: src.height },
      this.scene,
      false,
      Texture.NEAREST_SAMPLINGMODE,
    );
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
    this.applyTint(material);
    material.backFaceCulling = false;
    const entry = { material, w: src.width, h: src.height };
    this.textures.set(key, entry);
    return entry;
  }

  private acquireFallback(): Mesh {
    const reused = this.fallbackPool.pop();
    if (reused) {
      reused.isVisible = true;
      return reused;
    }
    const mesh = CreatePlane('vehicle_bb', { width: 1, height: 1 }, this.scene);
    mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    mesh.isPickable = false;
    return mesh;
  }

  /** Đặt một xe từ bên ngoài (logistics): quản lý external 3D hoặc billboard fallback */
  public placeExternalVehicle(
    id: string,
    key: string,
    x: number,
    footY: number,
    quarter: number,
    beta: number,
  ): void {
    // Phân tích xem có phải logistics truck không
    const match = key.match(/^(truck_[a-z_]+)_(left|right)$/);
    if (match && this.isReady) {
      const truckType = match[1] as LogisticsTruckType;
      const direction = match[2] as 'left' | 'right';
      const modelKind = resolveCarModelForLogisticsTruck(truckType);
      const world = pixelToWorld(x, footY);

      this.updateCar3D(id, modelKind, world.x, world.z, 'x', direction, 0, 0, quarter, beta);
      this.external3DCarIds.add(id);
      return;
    }

    // Fallback billboard
    let e = this.externalFallbackEntries.get(id);
    if (!e) {
      e = { mesh: this.acquireFallback(), key: '', seen: 0 };
      this.externalFallbackEntries.set(id, e);
    }
    const t = this.textureFor(key);
    if (e.key !== key) {
      e.key = key;
      e.mesh.material = t.material;
    }
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
    if (this.external3DCarIds.has(id)) {
      this.external3DCarIds.delete(id);
      const inst = this.carInstances.get(id);
      if (inst) {
        inst.root.setEnabled(false);
        this.carInstances.delete(id);
        const pList = this.carPool.get(inst.kind);
        if (pList) pList.push(inst);
      }
    }
    const e = this.externalFallbackEntries.get(id);
    if (e) {
      e.mesh.isVisible = false;
      this.fallbackPool.push(e.mesh);
      this.externalFallbackEntries.delete(id);
    }
  }

  /** Tìm mesh của một xe (nội bộ hoặc ngoài) phục vụ kiểm thử và debug. */
  public findVehicleMesh(id: string): Mesh | null {
    const carInst = this.carInstances.get(id);
    if (carInst && carInst.renderMeshes.length > 0) {
      return carInst.renderMeshes[0];
    }
    const mbInst = this.mbInstances.get(id);
    if (mbInst) {
      return mbInst.rig.bodyMesh;
    }
    return this.externalFallbackEntries.get(id)?.mesh ?? this.fallbackEntries.get(id)?.mesh ?? null;
  }

  private placeFallback(id: string, key: string, x: number, footY: number, quarter: number, beta: number): void {
    let e = this.fallbackEntries.get(id);
    if (!e) {
      e = { mesh: this.acquireFallback(), key: '', seen: 0 };
      this.fallbackEntries.set(id, e);
    }
    e.seen = this.frameId;
    const t = this.textureFor(key);
    if (e.key !== key) {
      e.key = key;
      e.mesh.material = t.material;
    }
    const w = t.w / TILE_SIZE;
    const h = t.h / TILE_SIZE;
    e.mesh.scaling.set(w, h, 1);
    const world = pixelToWorld(x, footY);
    const c = billboardCenter(world.x, world.z, h, isoAlpha(quarter), beta);
    e.mesh.position.set(c.x, c.y, c.z);
  }

  public update(quarter: number, beta: number, view: CrowdView, lampsOn = 0): void {
    this.frameId++;
    const sim = this.simulation;
    const r = view.radius * TILE_SIZE + CULL_MARGIN_PX;
    const cx = view.centerX * TILE_SIZE;
    const cy = view.centerZ * TILE_SIZE;
    const inView = (x: number, y: number): boolean => Math.abs(x - cx) <= r && Math.abs(y - cy) <= r;

    const use3D = this.isReady;

    // 1. Xe chạy trên đường phố (Street vehicles)
    for (const v of sim.getStreetVehicles()) {
      if (!inView(v.position.x, v.position.y)) continue;
      const id = `v:${v.id}`;
      const world = pixelToWorld(v.position.x, vehicleFootY(v));
      const speed = v.currentSpeed ?? v.speed ?? 0;

      if (use3D) {
        if (v.type === 'motorbike') {
          // Xe máy voxel 3D
          this.updateMotorbike3D(
            id,
            v.variant,
            world.x,
            world.z,
            v.axis,
            v.direction,
            speed,
            lampsOn,
            false,
            quarter,
            beta,
          );
        } else {
          // Ô tô / xe buýt / xe tải Kenney 3D
          const modelKind = resolveCarModelForStreetVehicle(v.type, v.variant);
          this.updateCar3D(
            id,
            modelKind,
            world.x,
            world.z,
            v.axis,
            v.direction,
            speed,
            lampsOn,
            quarter,
            beta,
          );
        }
      } else {
        // Fallback billboard
        const facing = vehicleFacing(v.axis, v.direction, quarter);
        this.placeFallback(id, vehicleTextureKey(v, facing), v.position.x, vehicleFootY(v), quarter, beta);
      }
    }

    // 2. Xe khách đỗ ở bãi (Parked vehicles)
    for (const c of sim.peekCustomers()) {
      const spot = c.vehicleSpot;
      if (!spot || !inView(spot.x, spot.y)) continue;
      const id = `p:${c.id ?? c.checkoutId ?? 'vehicle'}`;
      const world = pixelToWorld(spot.x, spot.y);

      if (use3D) {
        if (c.arrivalMode === 'motorbike') {
          this.updateMotorbike3D(
            id,
            c.vehicleVariant ?? 0,
            world.x,
            world.z,
            'x',
            'right',
            0,
            lampsOn,
            false,
            quarter,
            beta,
          );
        } else if (c.arrivalMode === 'car') {
          const modelKind = resolveCarModelForStreetVehicle('car', c.vehicleVariant ?? 0);
          this.updateCar3D(
            id,
            modelKind,
            world.x,
            world.z,
            'x',
            'right',
            0,
            lampsOn,
            quarter,
            beta,
          );
        }
      } else {
        const key = parkedVehicleKey(c.arrivalMode, c.vehicleVariant);
        if (key) {
          this.placeFallback(id, key, spot.x, spot.y, quarter, beta);
        }
      }
    }

    // Dọn dẹp các instance 3D không còn xuất hiện ở frame này (trừ external xe tải logistics đang bận)
    for (const [id, inst] of this.carInstances) {
      if (this.external3DCarIds.has(id)) continue;
      if (inst.seenFrame !== this.frameId) {
        inst.root.setEnabled(false);
        this.carInstances.delete(id);
        const pList = this.carPool.get(inst.kind);
        if (pList) pList.push(inst);
      }
    }

    for (const [id, inst] of this.mbInstances) {
      if (inst.seenFrame !== this.frameId) {
        inst.rig.root.setEnabled(false);
        this.mbInstances.delete(id);
        this.mbPool.push(inst);
      }
    }

    // Dọn dẹp billboard fallback
    for (const [id, e] of this.fallbackEntries) {
      if (e.seen !== this.frameId) {
        e.mesh.isVisible = false;
        this.fallbackPool.push(e.mesh);
        this.fallbackEntries.delete(id);
      }
    }

    // Dọn dẹp đèn xe
    for (const [id, pair] of this.lightEntries) {
      if (pair.seen !== this.frameId) {
        pair.headMesh.isVisible = false;
        pair.tailMesh.isVisible = false;
        this.headPool.push(pair.headMesh);
        this.tailPool.push(pair.tailMesh);
        this.lightEntries.delete(id);
      }
    }
  }

  public dispose(): void {
    for (const inst of this.carInstances.values()) {
      inst.root.dispose(false, true);
    }
    this.carInstances.clear();
    for (const poolList of this.carPool.values()) {
      for (const inst of poolList) {
        inst.root.dispose(false, true);
      }
    }
    this.carPool.clear();

    for (const container of this.carContainers.values()) {
      container.dispose();
    }
    this.carContainers.clear();

    for (const inst of this.mbInstances.values()) {
      inst.rig.root.dispose(false, true);
    }
    this.mbInstances.clear();
    for (const inst of this.mbPool) {
      inst.rig.root.dispose(false, true);
    }
    this.mbPool.length = 0;
    this.motorbikeFactory?.dispose();
    this.motorbikeFactory = null;

    for (const e of this.fallbackEntries.values()) e.mesh.dispose();
    for (const e of this.externalFallbackEntries.values()) e.mesh.dispose();
    for (const m of this.fallbackPool) m.dispose();
    this.fallbackEntries.clear();
    this.externalFallbackEntries.clear();
    this.fallbackPool.length = 0;

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
