import type { Scene } from '@babylonjs/core/scene';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { INTERSECTIONS, ROAD_MAP, STORE_FRONT_CROSSWALK, type IntersectionDef } from '@game/data';
import { type TrafficSignalState } from '@game/shared';
import { pixelToWorld } from './coords';
import {
  crosswalkBarRects,
  hexToColor3,
  intersectionPolePixelPositions,
  pedestrianLampColors,
  storeFrontPolePixel,
  vehicleLampColors,
  SIGNAL_OFF,
} from './signals-data';
import type { Sky3D } from './sky-3d';

interface TrafficLightMeshes {
  poleMesh: Mesh;
  boxMesh: Mesh;
  redMesh: Mesh;
  yellowMesh: Mesh;
  greenMesh: Mesh;
  pedBoxMesh: Mesh;
  pedStopMesh: Mesh;
  pedWalkMesh: Mesh;
}

interface FrontPedLightMeshes {
  poleMesh: Mesh;
  pedBoxMesh: Mesh;
  pedStopMesh: Mesh;
  pedWalkMesh: Mesh;
}

interface IntersectionPoleEntry {
  id: string;
  onMain: boolean;
  meshes: TrafficLightMeshes;
  lastStateKey: string;
}

export class TrafficSignals3D {
  private readonly meshes: Mesh[] = [];
  private readonly materials: StandardMaterial[] = [];
  private readonly intersectionPoles: IntersectionPoleEntry[] = [];
  private frontPedLight: FrontPedLightMeshes | null = null;
  private lastFrontStateKey = '';
  private animTimer = 0;

  constructor(private readonly scene: Scene, private readonly sky: Sky3D | null) {
    this.buildCrosswalk();
    this.buildIntersectionPoles();
    this.buildFrontPedPole();
  }

  private makeMat(name: string, colorHex: number, emissive = false): StandardMaterial {
    const mat = new StandardMaterial(`ts_mat_${name}`, this.scene);
    const col = hexToColor3(colorHex);
    mat.diffuseColor = col;
    mat.specularColor = Color3.Black();
    if (emissive) {
      mat.emissiveColor = col;
      mat.disableLighting = true;
    }
    this.materials.push(mat);
    return mat;
  }

  private buildCrosswalk(): void {
    const rects = crosswalkBarRects();
    const mat = this.makeMat('crosswalk_stripe', 0xf2f4f0);
    mat.alpha = 0.88;
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      const mesh = CreateBox(`crosswalk_bar_${i}`, { width: r.width, height: 0.015, depth: r.depth }, this.scene);
      mesh.position.set(r.centerX, 0.008, r.centerZ);
      mesh.material = mat;
      mesh.isPickable = false;
      this.meshes.push(mesh);
    }
  }

  private buildIntersectionPoles(): void {
    for (const ix of INTERSECTIONS) {
      const road = (ROAD_MAP as Record<string, { topRow: number }>)[ix.roadId];
      if (!road) continue;
      const poles = intersectionPolePixelPositions(ix as IntersectionDef, road.topRow);
      for (let pIdx = 0; pIdx < poles.length; pIdx++) {
        const p = poles[pIdx];
        const world = pixelToWorld(p.x, p.y);
        const meshes = this.createTrafficLightStructure(`ix_${p.id}_${pIdx}`, world.x, world.z);
        this.intersectionPoles.push({
          id: p.id,
          onMain: p.onMain,
          meshes,
          lastStateKey: '',
        });
      }
    }
  }

  private buildFrontPedPole(): void {
    const pos = storeFrontPolePixel(STORE_FRONT_CROSSWALK);
    const world = pixelToWorld(pos.x, pos.y);
    const poleMat = this.makeMat('front_ped_pole', 0x31443c);
    const boxMat = this.makeMat('front_ped_box', 0x1d2420);

    const pole = CreateCylinder('front_ped_pole_m', { height: 1.1, diameter: 0.06, tessellation: 6 }, this.scene);
    pole.position.set(world.x, 0.55, world.z);
    pole.material = poleMat;
    pole.isPickable = false;

    const pedBox = CreateBox('front_ped_box_m', { width: 0.22, height: 0.3, depth: 0.22 }, this.scene);
    pedBox.position.set(world.x, 1.0, world.z);
    pedBox.material = boxMat;
    pedBox.isPickable = false;

    const stopMat = this.makeMat('front_ped_stop', SIGNAL_OFF, true);
    const stopMesh = CreateBox('front_ped_stop_m', { width: 0.12, height: 0.1, depth: 0.23 }, this.scene);
    stopMesh.position.set(world.x, 1.08, world.z);
    stopMesh.material = stopMat;
    stopMesh.isPickable = false;

    const walkMat = this.makeMat('front_ped_walk', SIGNAL_OFF, true);
    const walkMesh = CreateBox('front_ped_walk_m', { width: 0.12, height: 0.1, depth: 0.23 }, this.scene);
    walkMesh.position.set(world.x, 0.94, world.z);
    walkMesh.material = walkMat;
    walkMesh.isPickable = false;

    this.meshes.push(pole, pedBox, stopMesh, walkMesh);
    if (this.sky) {
      this.sky.addLightMesh(stopMesh);
      this.sky.addLightMesh(walkMesh);
    }
    this.frontPedLight = { poleMesh: pole, pedBoxMesh: pedBox, pedStopMesh: stopMesh, pedWalkMesh: walkMesh };
  }

  private createTrafficLightStructure(prefix: string, x: number, z: number): TrafficLightMeshes {
    const poleMat = this.makeMat(`${prefix}_pole`, 0x31443c);
    const boxMat = this.makeMat(`${prefix}_box`, 0x1d2420);

    const pole = CreateCylinder(`${prefix}_pole_m`, { height: 1.8, diameter: 0.08, tessellation: 6 }, this.scene);
    pole.position.set(x, 0.9, z);
    pole.material = poleMat;
    pole.isPickable = false;

    // Hộp đèn xe
    const box = CreateBox(`${prefix}_box_m`, { width: 0.24, height: 0.65, depth: 0.24 }, this.scene);
    box.position.set(x, 1.5, z);
    box.material = boxMat;
    box.isPickable = false;

    // 3 mắt đèn xe: đỏ, vàng, xanh
    const redMat = this.makeMat(`${prefix}_red`, SIGNAL_OFF, true);
    const redMesh = CreateBox(`${prefix}_red_m`, { width: 0.14, height: 0.14, depth: 0.25 }, this.scene);
    redMesh.position.set(x, 1.7, z);
    redMesh.material = redMat;
    redMesh.isPickable = false;

    const yellowMat = this.makeMat(`${prefix}_yellow`, SIGNAL_OFF, true);
    const yellowMesh = CreateBox(`${prefix}_yellow_m`, { width: 0.14, height: 0.14, depth: 0.25 }, this.scene);
    yellowMesh.position.set(x, 1.5, z);
    yellowMesh.material = yellowMat;
    yellowMesh.isPickable = false;

    const greenMat = this.makeMat(`${prefix}_green`, SIGNAL_OFF, true);
    const greenMesh = CreateBox(`${prefix}_green_m`, { width: 0.14, height: 0.14, depth: 0.25 }, this.scene);
    greenMesh.position.set(x, 1.3, z);
    greenMesh.material = greenMat;
    greenMesh.isPickable = false;

    // Hộp đèn người đi bộ bên dưới
    const pedBox = CreateBox(`${prefix}_ped_box_m`, { width: 0.2, height: 0.3, depth: 0.2 }, this.scene);
    pedBox.position.set(x, 0.95, z);
    pedBox.material = boxMat;
    pedBox.isPickable = false;

    const pedStopMat = this.makeMat(`${prefix}_ped_stop`, SIGNAL_OFF, true);
    const pedStopMesh = CreateBox(`${prefix}_ped_stop_m`, { width: 0.12, height: 0.1, depth: 0.21 }, this.scene);
    pedStopMesh.position.set(x, 1.03, z);
    pedStopMesh.material = pedStopMat;
    pedStopMesh.isPickable = false;

    const pedWalkMat = this.makeMat(`${prefix}_ped_walk`, SIGNAL_OFF, true);
    const pedWalkMesh = CreateBox(`${prefix}_ped_walk_m`, { width: 0.12, height: 0.1, depth: 0.21 }, this.scene);
    pedWalkMesh.position.set(x, 0.88, z);
    pedWalkMesh.material = pedWalkMat;
    pedWalkMesh.isPickable = false;

    this.meshes.push(pole, box, redMesh, yellowMesh, greenMesh, pedBox, pedStopMesh, pedWalkMesh);
    if (this.sky) {
      this.sky.addLightMesh(redMesh);
      this.sky.addLightMesh(yellowMesh);
      this.sky.addLightMesh(greenMesh);
      this.sky.addLightMesh(pedStopMesh);
      this.sky.addLightMesh(pedWalkMesh);
    }

    return {
      poleMesh: pole,
      boxMesh: box,
      redMesh,
      yellowMesh,
      greenMesh,
      pedBoxMesh: pedBox,
      pedStopMesh,
      pedWalkMesh,
    };
  }

  public update(
    elapsed: number,
    intersectionSignals: ReadonlyArray<{ id: string; signals: { main: TrafficSignalState; avenue: TrafficSignalState } }>,
    frontSignal: TrafficSignalState,
  ): void {
    this.animTimer += elapsed;

    // 1. Cập nhật các cột đèn ở ngã tư
    for (const p of this.intersectionPoles) {
      const s = intersectionSignals.find((a) => a.id === p.id)?.signals;
      if (!s) continue;
      const vehicle = p.onMain ? s.main : s.avenue;
      const walk = p.onMain ? s.avenue : s.main;
      const blinkOn = walk.pedestrian !== 'clearing' || Math.floor(this.animTimer * 2) % 2 === 0;
      const key = `${vehicle.vehicle}|${walk.pedestrian}|${blinkOn}`;
      if (p.lastStateKey === key) continue;
      p.lastStateKey = key;

      const vColors = vehicleLampColors(vehicle.vehicle);
      const pColors = pedestrianLampColors(walk.pedestrian, blinkOn);

      const m = p.meshes;
      (m.redMesh.material as StandardMaterial).emissiveColor = hexToColor3(vColors.red);
      (m.yellowMesh.material as StandardMaterial).emissiveColor = hexToColor3(vColors.yellow);
      (m.greenMesh.material as StandardMaterial).emissiveColor = hexToColor3(vColors.green);
      (m.pedStopMesh.material as StandardMaterial).emissiveColor = hexToColor3(pColors.stop);
      (m.pedWalkMesh.material as StandardMaterial).emissiveColor = hexToColor3(pColors.walk);
    }

    // 2. Cập nhật cột đèn đi bộ trước cửa tiệm
    if (this.frontPedLight) {
      const blinkOn = frontSignal.pedestrian !== 'clearing' || Math.floor(this.animTimer * 2) % 2 === 0;
      const key = `${frontSignal.pedestrian}|${blinkOn}`;
      if (this.lastFrontStateKey !== key) {
        this.lastFrontStateKey = key;
        const pColors = pedestrianLampColors(frontSignal.pedestrian, blinkOn);
        (this.frontPedLight.pedStopMesh.material as StandardMaterial).emissiveColor = hexToColor3(pColors.stop);
        (this.frontPedLight.pedWalkMesh.material as StandardMaterial).emissiveColor = hexToColor3(pColors.walk);
      }
    }
  }

  public dispose(): void {
    for (const m of this.meshes) {
      this.sky?.removeLightMesh(m);
      m.dispose();
    }
    for (const mat of this.materials) mat.dispose();
    this.meshes.length = 0;
    this.materials.length = 0;
    this.intersectionPoles.length = 0;
    this.frontPedLight = null;
  }
}
