import type { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CAR_CATALOG, type CarModelKind } from './car-models';

const BODY_COLORS: Record<CarModelKind, string> = {
  car_sedan: '#2563eb',
  car_suv: '#475569',
  car_taxi: '#eab308',
  car_van: '#f8fafc',
  car_delivery: '#f8fafc',
  car_truck: '#059669',
  car_ambulance: '#f8fafc',
  car_police: '#1e293b',
};

/** Tỉ lệ thân xe: rộng / dài, cao thân / cao tổng, cabin dài / dài tổng. */
const WIDTH_RATIO = 0.44;
const BODY_HEIGHT_RATIO = 0.55;
const CABIN_LENGTH_RATIO = 0.5;

/**
 * Xe dựng bằng hai khối hộp, dùng khi model Kenney chưa tải xong hoặc tải lỗi.
 * Kích thước tính theo đơn vị gốc của model (rawLength/rawHeight) để dùng chung scale, đèn và hướng với xe thật.
 */
export class BoxCarFactory {
  private readonly materials = new Map<string, StandardMaterial>();
  private cabinMat: StandardMaterial | null = null;

  constructor(private readonly scene: Scene) {}

  private material(color: string): StandardMaterial {
    let mat = this.materials.get(color);
    if (!mat) {
      mat = new StandardMaterial(`boxcar_mat_${color}`, this.scene);
      mat.diffuseColor = Color3.FromHexString(color);
      mat.specularColor = Color3.Black();
      this.materials.set(color, mat);
    }
    return mat;
  }

  private getCabinMat(): StandardMaterial {
    if (!this.cabinMat) {
      this.cabinMat = new StandardMaterial('boxcar_mat_cabin', this.scene);
      this.cabinMat.diffuseColor = Color3.FromHexString('#cbd5e1');
      this.cabinMat.specularColor = Color3.Black();
    }
    return this.cabinMat;
  }

  /** Mũi xe hướng +Z (cùng quy ước model Kenney); gốc ở mặt đất giữa xe. */
  public create(kind: CarModelKind, id: string): TransformNode {
    const spec = CAR_CATALOG[kind];
    const root = new TransformNode(`${id}_boxcar`, this.scene);
    const bodyH = spec.rawHeight * BODY_HEIGHT_RATIO;
    const cabinH = spec.rawHeight - bodyH;

    const body = CreateBox(`${id}_body`, { width: spec.rawLength * WIDTH_RATIO, height: bodyH, depth: spec.rawLength }, this.scene);
    body.material = this.material(BODY_COLORS[kind]);
    body.parent = root;
    body.position.y = bodyH / 2;

    const cabin = CreateBox(`${id}_cabin`, { width: spec.rawLength * WIDTH_RATIO * 0.9, height: cabinH, depth: spec.rawLength * CABIN_LENGTH_RATIO }, this.scene);
    cabin.material = this.getCabinMat();
    cabin.parent = root;
    cabin.position.set(0, bodyH + cabinH / 2, -spec.rawLength * 0.05);
    return root;
  }

  public dispose(): void {
    for (const m of this.materials.values()) m.dispose();
    this.materials.clear();
    this.cabinMat?.dispose();
    this.cabinMat = null;
  }
}
