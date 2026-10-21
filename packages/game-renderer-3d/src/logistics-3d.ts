import type { Scene } from '@babylonjs/core/scene';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { GameSimulation } from '@game/core';
import type { StoreLogisticsEventState, LogisticsWorkerState } from '@game/shared';
import { billboardCenter, isoAlpha, pixelToWorld } from './coords';
import type { Crowd3D } from './crowd-3d';
import type { Vehicles3D } from './vehicles-3d';
import type { RoofInfo } from './map-builder';

const BOX_WORLD_WIDTH = 0.35;
const BOX_WORLD_HEIGHT = 0.28;
const BOX_WORLD_DEPTH = 0.35;

export const CARGO_BOX_COLORS: Record<string, string> = {
  carton: '#c29b63',
  foam_cold: '#e2e8f0',
  produce_crate: '#65a30d',
  trolley: '#dc2626',
};

/**
 * Tính toán vị trí thùng hàng trên tay nhân viên:
 * Gốc tọa độ thế giới (x, z), độ cao y ngang ngực (~0.7).
 */
export function logisticsBoxPosition(
  worker: LogisticsWorkerState,
  quarter: number,
  beta: number,
): { x: number; y: number; z: number } {
  const world = pixelToWorld(worker.x, worker.y);
  const dirSign = worker.direction === 'right' ? 1 : worker.direction === 'left' ? -1 : 0;
  // Lệch nhẹ theo hướng đi
  const c = billboardCenter(world.x + (dirSign * 3) / 32, world.z, 0.75, isoAlpha(quarter), beta);
  return { x: c.x, y: 0.75, z: c.z };
}

export class Logistics3D {
  public boxMesh: Mesh | null = null;
  private readonly boxMats = new Map<string, StandardMaterial>();

  constructor(
    private readonly scene: Scene,
    private readonly simulation: GameSimulation,
    private readonly vehicles: Vehicles3D | null,
    private readonly crowd: Crowd3D | null,
  ) {
    this.initBox();
  }

  private initBox(): void {
    const box = CreateBox('logistics_carried_box', {
      width: BOX_WORLD_WIDTH,
      height: BOX_WORLD_HEIGHT,
      depth: BOX_WORLD_DEPTH,
    }, this.scene);
    box.isVisible = false;
    box.isPickable = false;
    this.boxMesh = box;
  }

  private materialFor(boxType: string): StandardMaterial {
    let mat = this.boxMats.get(boxType);
    if (!mat) {
      mat = new StandardMaterial(`box_mat_${boxType}`, this.scene);
      const hex = CARGO_BOX_COLORS[boxType] ?? CARGO_BOX_COLORS.carton;
      mat.diffuseColor = Color3.FromHexString(hex);
      mat.specularColor = Color3.Black();
      this.boxMats.set(boxType, mat);
    }
    return mat;
  }

  public update(
    quarter: number,
    beta: number,
    roofs: readonly RoofInfo[],
  ): void {
    const ev: StoreLogisticsEventState | null = this.simulation.getLogisticsState().activeEvent;

    if (!ev) {
      if (this.boxMesh) this.boxMesh.isVisible = false;
      this.vehicles?.clearExternalVehicle('logistics_truck');
      this.crowd?.clearExternalPerson('logistics_worker');
      return;
    }

    // 1. Xe tải giao hàng: vẽ qua Vehicles3D
    if (this.vehicles) {
      this.vehicles.placeExternalVehicle(
        'logistics_truck',
        `${ev.truckType}_${ev.direction}`,
        ev.truckPosition.x,
        ev.truckPosition.y,
        quarter,
        beta,
      );
    }

    // 2. Nhân viên bê thùng: vẽ qua Crowd3D
    const w = ev.worker;
    const isWorking = ev.phase === 'unloading' || ev.phase === 'loading';
    if (w && isWorking && this.crowd) {
      this.crowd.placeExternalPerson(
        'logistics_worker',
        6, // walkerLook(6)
        w.x,
        w.y,
        w.direction === 'right' ? 'right' : 'left',
        true, // walking
        1,
        0xffffff,
        quarter,
        beta,
        roofs,
      );

      // 3. Khối thùng nhỏ trên tay
      if (this.boxMesh) {
        if (w.carryingBox) {
          this.boxMesh.isVisible = true;
          this.boxMesh.material = this.materialFor(w.boxType);
          const pos = logisticsBoxPosition(w, quarter, beta);
          this.boxMesh.position.set(pos.x, pos.y, pos.z);
        } else {
          this.boxMesh.isVisible = false;
        }
      }
    } else {
      if (this.boxMesh) this.boxMesh.isVisible = false;
      this.crowd?.clearExternalPerson('logistics_worker');
    }
  }

  public dispose(): void {
    this.boxMesh?.dispose();
    this.boxMesh = null;
    for (const m of this.boxMats.values()) m.dispose();
    this.boxMats.clear();
  }
}
