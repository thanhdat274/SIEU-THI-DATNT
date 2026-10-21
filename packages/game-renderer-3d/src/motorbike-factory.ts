import type { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { motorbikeColorForVariant } from './car-models';
import { SCALE_TARGETS } from './scale-spec';

export interface MotorbikeRig {
  root: TransformNode;
  bodyMesh: Mesh;
  cargoBoxMesh: Mesh;
  wheelFront: Mesh;
  wheelBack: Mesh;
  riderNode: TransformNode | null;
  /** Vị trí đèn trước và sau theo hệ tọa độ thế giới */
  getHeadlightWorldPos: () => { x: number; y: number; z: number };
  getTaillightWorldPos: () => { x: number; y: number; z: number };
}

/**
 * Tỉ lệ xe máy chuẩn theo scale-spec:
 * - Chiều dài mục tiêu: 0.95 * D = 1.52 (đơn vị thế giới)
 * - Chiều cao mục tiêu: 0.55 * D = 0.88 (đơn vị thế giới)
 * - Chiều rộng mục tiêu: 0.28 * D = 0.45
 * - Đỉnh đầu người lái ngồi trên ≈ 0.95 * D = 1.52
 */
export class MotorbikeFactory {
  private readonly bodyMaterials = new Map<string, StandardMaterial>();
  private blackMat: StandardMaterial | null = null;
  private seatMat: StandardMaterial | null = null;
  private chromeMat: StandardMaterial | null = null;
  private boxMat: StandardMaterial | null = null;

  constructor(private readonly scene: Scene) {}

  private getBlackMat(): StandardMaterial {
    if (!this.blackMat) {
      const mat = new StandardMaterial('mb_black', this.scene);
      mat.diffuseColor = Color3.FromHexString('#1c1917');
      mat.specularColor = Color3.Black();
      this.blackMat = mat;
    }
    return this.blackMat;
  }

  private getSeatMat(): StandardMaterial {
    if (!this.seatMat) {
      const mat = new StandardMaterial('mb_seat', this.scene);
      mat.diffuseColor = Color3.FromHexString('#292524');
      mat.specularColor = Color3.Black();
      this.seatMat = mat;
    }
    return this.seatMat;
  }

  private getChromeMat(): StandardMaterial {
    if (!this.chromeMat) {
      const mat = new StandardMaterial('mb_chrome', this.scene);
      mat.diffuseColor = Color3.FromHexString('#94a3b8');
      mat.specularColor = Color3.Black();
      this.chromeMat = mat;
    }
    return this.chromeMat;
  }

  private getBodyMat(colorHex: string): StandardMaterial {
    let mat = this.bodyMaterials.get(colorHex);
    if (!mat) {
      mat = new StandardMaterial(`mb_body_${colorHex}`, this.scene);
      mat.diffuseColor = Color3.FromHexString(colorHex);
      mat.specularColor = Color3.Black();
      this.bodyMaterials.set(colorHex, mat);
    }
    return mat;
  }

  private getBoxMat(): StandardMaterial {
    if (!this.boxMat) {
      const mat = new StandardMaterial('mb_cargo_box', this.scene);
      mat.diffuseColor = Color3.FromHexString('#047857'); // Thùng chở hàng màu xanh lá giao hàng
      mat.specularColor = Color3.Black();
      this.boxMat = mat;
    }
    return this.boxMat;
  }

  public createMotorbike(id: string, variant: number, hasCargoBox = false): MotorbikeRig {
    const root = new TransformNode(`motorbike_${id}`, this.scene);

    const colorHex = motorbikeColorForVariant(variant);
    const bodyMat = this.getBodyMat(colorHex);
    const blackMat = this.getBlackMat();
    const seatMat = this.getSeatMat();
    const chromeMat = this.getChromeMat();

    const targets = SCALE_TARGETS.motorbike;
    const mbLength = targets.length; // 1.52
    const mbHeight = targets.height; // 0.88
    const mbWidth = targets.width; // 0.45

    // 1. Thân xe chính (body)
    const body = CreateBox(
      `mb_body_${id}`,
      { width: mbWidth * 0.55, height: mbHeight * 0.40, depth: mbLength * 0.58 },
      this.scene,
    );
    body.parent = root;
    body.position.set(0, mbHeight * 0.42, 0);
    body.material = bodyMat;
    body.isPickable = false;

    // Yếm trước
    const frontShield = CreateBox(
      `mb_shield_${id}`,
      { width: mbWidth * 0.70, height: mbHeight * 0.45, depth: mbLength * 0.12 },
      this.scene,
    );
    frontShield.parent = body;
    frontShield.position.set(0, mbHeight * 0.10, mbLength * 0.28);
    frontShield.material = bodyMat;
    frontShield.isPickable = false;

    // Yên xe
    const seat = CreateBox(
      `mb_seat_${id}`,
      { width: mbWidth * 0.52, height: mbHeight * 0.12, depth: mbLength * 0.42 },
      this.scene,
    );
    seat.parent = body;
    seat.position.set(0, mbHeight * 0.24, -mbLength * 0.06);
    seat.material = seatMat;
    seat.isPickable = false;

    // Ghi đông (tay lái)
    const handleBar = CreateCylinder(
      `mb_handle_${id}`,
      { height: mbWidth * 0.95, diameter: 0.05 },
      this.scene,
    );
    handleBar.rotation.z = Math.PI / 2;
    handleBar.parent = body;
    handleBar.position.set(0, mbHeight * 0.38, mbLength * 0.26);
    handleBar.material = chromeMat;
    handleBar.isPickable = false;

    // 2. Bánh trước (wheel front) - đường kính ~0.48, cao độ tâm 0.24
    const wheelDia = mbHeight * 0.52;
    const wheelFront = CreateCylinder(
      `mb_wf_${id}`,
      { height: 0.10, diameter: wheelDia, tessellation: 16 },
      this.scene,
    );
    wheelFront.rotation.z = Math.PI / 2;
    wheelFront.parent = root;
    wheelFront.position.set(0, wheelDia / 2, mbLength * 0.40);
    wheelFront.material = blackMat;
    wheelFront.isPickable = false;

    // 3. Bánh sau (wheel back)
    const wheelBack = CreateCylinder(
      `mb_wb_${id}`,
      { height: 0.10, diameter: wheelDia, tessellation: 16 },
      this.scene,
    );
    wheelBack.rotation.z = Math.PI / 2;
    wheelBack.parent = root;
    wheelBack.position.set(0, wheelDia / 2, -mbLength * 0.40);
    wheelBack.material = blackMat;
    wheelBack.isPickable = false;

    // 4. Thùng hàng chở sau (giao hàng / shipper)
    const cargoBox = CreateBox(
      `mb_cargo_${id}`,
      { width: mbWidth * 0.85, height: mbHeight * 0.42, depth: mbWidth * 0.85 },
      this.scene,
    );
    cargoBox.parent = root;
    cargoBox.position.set(0, mbHeight * 0.65, -mbLength * 0.38);
    cargoBox.material = this.getBoxMat();
    cargoBox.isPickable = false;
    cargoBox.setEnabled(hasCargoBox);

    return {
      root,
      bodyMesh: body,
      cargoBoxMesh: cargoBox,
      wheelFront,
      wheelBack,
      riderNode: null,
      getHeadlightWorldPos: () => {
        const p = body.getAbsolutePosition();
        const fwd = root.forward;
        return {
          x: p.x + fwd.x * (mbLength * 0.42),
          y: p.y + mbHeight * 0.25,
          z: p.z + fwd.z * (mbLength * 0.42),
        };
      },
      getTaillightWorldPos: () => {
        const p = body.getAbsolutePosition();
        const fwd = root.forward;
        return {
          x: p.x - fwd.x * (mbLength * 0.45),
          y: p.y + mbHeight * 0.18,
          z: p.z - fwd.z * (mbLength * 0.45),
        };
      },
    };
  }

  public dispose(): void {
    for (const m of this.bodyMaterials.values()) m.dispose();
    this.bodyMaterials.clear();
    this.blackMat?.dispose();
    this.seatMat?.dispose();
    this.chromeMat?.dispose();
    this.boxMat?.dispose();
  }
}
