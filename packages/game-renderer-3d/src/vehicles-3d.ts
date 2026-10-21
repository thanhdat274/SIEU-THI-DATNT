import type { Scene } from '@babylonjs/core/scene';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import type { AssetContainer } from '@babylonjs/core/assetContainer';
import '@babylonjs/loaders/glTF/index.js';
import type { GameSimulation } from '@game/core';
import { TILE_SIZE, type LogisticsTruckType } from '@game/shared';
import { billboardCenter, isoAlpha, pixelToWorld } from './coords';
import { vehicleFootY } from './vehicle-view';
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
import { BoxCarFactory } from './box-car';

const CULL_MARGIN_PX = 240;

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
  /** Xe khối dựng tạm khi model chưa tải được; bị bỏ thay vì trả về pool khi model đã sẵn sàng. */
  placeholder: boolean;
}

interface MotorbikeInstance {
  id: string;
  rig: MotorbikeRig;
  wheelSpin: number;
  seenFrame: number;
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

  // Xe khối dựng tạm khi model chưa tải xong hoặc tải lỗi
  private readonly boxCarFactory: BoxCarFactory;
  private frameId = 0;

  // External 3D vehicles (e.g. logistics truck)
  private readonly external3DCarIds = new Set<string>();

  // Đèn xe ban đêm (3D + 2D)
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
    this.motorbikeFactory = new MotorbikeFactory(scene);
    this.boxCarFactory = new BoxCarFactory(scene);
    this.initLights();
    void this.loadAllCarModels();
  }

  public get activeCount(): number {
    return this.carInstances.size + this.mbInstances.size;
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
      this.discardPlaceholderPool();
    } catch (err) {
      console.warn('[Vehicles3D] Tải model xe 3D thất bại, giữ xe khối dựng bằng code:', err);
    }
  }

  /** Model đã sẵn sàng: bỏ các xe khối đang nằm trong pool để xe mới dùng model thật. */
  private discardPlaceholderPool(): void {
    for (const [kind, poolList] of this.carPool) {
      if (!this.carContainers.has(kind)) continue;
      this.carPool.set(kind, poolList.filter((inst) => {
        if (!inst.placeholder) return true;
        inst.root.dispose(false, true);
        return false;
      }));
    }
  }

  private createCarInstance(kind: CarModelKind, id: string): Car3DInstance {
    const container = this.carContainers.get(kind);
    const root = container
      ? (container.instantiateModelsToScene((name) => `${id}_${name}`).rootNodes[0] as TransformNode)
      : this.boxCarFactory.create(kind, id);
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
      placeholder: !container,
    };
  }

  private acquireCarInstance(kind: CarModelKind, id: string): Car3DInstance {
    let poolList = this.carPool.get(kind);
    if (!poolList) {
      poolList = [];
      this.carPool.set(kind, poolList);
    }
    const inst = poolList.pop() ?? this.createCarInstance(kind, id);
    inst.id = id;
    inst.seenFrame = this.frameId;
    inst.root.setEnabled(true);
    this.carInstances.set(id, inst);
    return inst;
  }

  private releaseCar(inst: Car3DInstance): void {
    this.carInstances.delete(inst.id);
    if (inst.placeholder && this.carContainers.has(inst.kind)) {
      inst.root.dispose(false, true);
      return;
    }
    inst.root.setEnabled(false);
    this.carPool.get(inst.kind)?.push(inst);
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
      if (inst) this.releaseCar(inst);
      inst = this.acquireCarInstance(kind, id);
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

  /** Đặt một xe tải từ bên ngoài (logistics): model xe thật, hoặc xe khối khi model chưa sẵn sàng. */
  public placeExternalVehicle(
    id: string,
    key: string,
    x: number,
    footY: number,
    quarter: number,
    beta: number,
  ): void {
    const match = key.match(/^(truck_[a-z_]+)_(left|right)$/);
    if (!match) return;
    const truckType = match[1] as LogisticsTruckType;
    const direction = match[2] as 'left' | 'right';
    const modelKind = resolveCarModelForLogisticsTruck(truckType);
    const world = pixelToWorld(x, footY);

    this.updateCar3D(id, modelKind, world.x, world.z, 'x', direction, 0, 0, quarter, beta);
    this.external3DCarIds.add(id);
  }

  /** Xóa xe đặt từ bên ngoài khi sự kiện kết thúc. */
  public clearExternalVehicle(id: string): void {
    if (!this.external3DCarIds.delete(id)) return;
    const inst = this.carInstances.get(id);
    if (inst) this.releaseCar(inst);
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
    return null;
  }

  public update(quarter: number, beta: number, view: CrowdView, lampsOn = 0): void {
    this.frameId++;
    const sim = this.simulation;
    const r = view.radius * TILE_SIZE + CULL_MARGIN_PX;
    const cx = view.centerX * TILE_SIZE;
    const cy = view.centerZ * TILE_SIZE;
    const inView = (x: number, y: number): boolean => Math.abs(x - cx) <= r && Math.abs(y - cy) <= r;

    // 1. Xe chạy trên đường phố (Street vehicles)
    for (const v of sim.getStreetVehicles()) {
      if (!inView(v.position.x, v.position.y)) continue;
      const id = `v:${v.id}`;
      const world = pixelToWorld(v.position.x, vehicleFootY(v));
      const speed = v.currentSpeed ?? v.speed ?? 0;

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
        // Ô tô / xe buýt / xe tải Kenney 3D (xe khối khi model chưa tải xong)
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
    }

    // 2. Xe khách đỗ ở bãi (Parked vehicles)
    for (const c of sim.peekCustomers()) {
      const spot = c.vehicleSpot;
      if (!spot || !inView(spot.x, spot.y)) continue;
      const id = `p:${c.id ?? c.checkoutId ?? 'vehicle'}`;
      const world = pixelToWorld(spot.x, spot.y);

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
    }

    // Dọn dẹp các instance 3D không còn xuất hiện ở frame này (trừ external xe tải logistics đang bận)
    for (const inst of [...this.carInstances.values()]) {
      if (this.external3DCarIds.has(inst.id)) continue;
      if (inst.seenFrame !== this.frameId) this.releaseCar(inst);
    }

    for (const [id, inst] of this.mbInstances) {
      if (inst.seenFrame !== this.frameId) {
        inst.rig.root.setEnabled(false);
        this.mbInstances.delete(id);
        this.mbPool.push(inst);
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
    this.boxCarFactory.dispose();

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
  }
}
