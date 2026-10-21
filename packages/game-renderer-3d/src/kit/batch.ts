import type { Scene } from '@babylonjs/core/scene';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { FixtureBox } from '../fixture-shapes';
import { KIT_COLORS } from '../style-spec';
import type { KitPiece } from './piece';

/**
 * Vai trò của một nhóm khối trong tòa, quyết định cách nó phản ứng với bóc mái và ban đêm:
 * - facade: mờ về FACADE_ALPHA khi người chơi vào trong (tường, khung, phào, trụ...);
 * - roof: ẩn/mờ cùng mái;
 * - glass: kính trong suốt cố định (không mờ theo mặt tiền, vì sẽ ghi đè độ đục của kính);
 * - glow: ô phát sáng, chỉ hiện ban đêm;
 * - plain: luôn hiện (mái hiên, đồ trưng trước tiệm).
 * Khối có `alpha` (kính) luôn thuộc nhóm glass, trừ khi truyền glow.
 */
export type BatchRole = 'facade' | 'roof' | 'glass' | 'glow' | 'plain';

export interface BatchGroupInfo {
  role: BatchRole;
  color: string;
  alpha: number;
  mesh: Mesh;
  /** Vật liệu RIÊNG của nhóm (mỗi tòa một bản) để đổi alpha không lan sang tòa khác. */
  material: StandardMaterial;
  instances: number;
}

export interface BatchResult {
  meshes: Mesh[];
  groups: BatchGroupInfo[];
  /** Số mục vẽ = số mesh (mỗi nhóm thin instances là một lần vẽ). */
  drawItems: number;
}

export interface BatchPlacement {
  x: number;
  y: number;
  z: number;
}

interface Group {
  role: BatchRole;
  color: string;
  alpha: number;
  matrices: Matrix[];
}

/**
 * Gom các khối của nhiều mảnh kit thành ít mesh nhất: các khối cùng (vai trò, màu, độ đục) dùng chung một hộp đơn vị và
 * vẽ bằng thin instances. Số mục vẽ của tòa vì thế tăng theo số loại vật liệu, không theo số chi tiết.
 */
export class KitBatch {
  private readonly groups = new Map<string, Group>();

  constructor(
    private readonly scene: Scene,
    private readonly name: string,
    private readonly buildingId: string,
  ) {}

  /** Thêm một mảnh kit, đặt gốc cục bộ của mảnh tại `at`. */
  public add(piece: KitPiece, at: BatchPlacement, role: BatchRole = 'plain', rotX = 0): void {
    for (const box of piece.boxes) this.addBox(box, at, role, rotX);
  }

  /** Thêm một khối lẻ. `rotX` (rad) xoay cả khối quanh trục X của `at` (mái hiên nghiêng). */
  public addBox(box: FixtureBox, at: BatchPlacement, role: BatchRole = 'plain', rotX = 0): void {
    const resolved: BatchRole = role === 'glow' ? 'glow' : box.alpha !== undefined ? 'glass' : role;
    const alpha = box.alpha ?? 1;
    const key = `${resolved}|${box.color}|${alpha}`;
    let g = this.groups.get(key);
    if (!g) {
      g = { role: resolved, color: box.color, alpha, matrices: [] };
      this.groups.set(key, g);
    }
    const local = Matrix.Compose(new Vector3(box.sx, box.sy, box.sz), Quaternion.Identity(), new Vector3(box.cx, box.cy, box.cz));
    const world = Matrix.Compose(new Vector3(1, 1, 1), Quaternion.RotationAxis(Vector3.Right(), rotX), new Vector3(at.x, at.y, at.z));
    g.matrices.push(local.multiply(world));
  }

  /** Dựng mesh cho mọi nhóm. Gọi một lần sau khi đã thêm hết. */
  public build(): BatchResult {
    const meshes: Mesh[] = [];
    const groups: BatchGroupInfo[] = [];
    for (const [key, g] of this.groups) {
      const mesh = CreateBox(`${this.name}_${key}`, { size: 1 }, this.scene);
      const material = new StandardMaterial(`${this.name}_${key}_mat`, this.scene);
      material.diffuseColor = Color3.FromHexString(g.color);
      material.specularColor = Color3.Black();
      material.alpha = g.alpha;
      if (g.role === 'glow') {
        material.diffuseColor = Color3.FromHexString(KIT_COLORS.glow);
        material.emissiveColor = Color3.FromHexString(KIT_COLORS.glowEmissive);
        material.disableLighting = true;
        mesh.isVisible = false;
      }
      mesh.material = material;
      mesh.metadata = { buildingId: this.buildingId };
      mesh.thinInstanceEnablePicking = true;
      const buffer = new Float32Array(g.matrices.length * 16);
      g.matrices.forEach((m, i) => m.copyToArray(buffer, i * 16));
      mesh.thinInstanceSetBuffer('matrix', buffer, 16, true);
      meshes.push(mesh);
      groups.push({ role: g.role, color: g.color, alpha: g.alpha, mesh, material, instances: g.matrices.length });
    }
    return { meshes, groups, drawItems: meshes.length };
  }
}
