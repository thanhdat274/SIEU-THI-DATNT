import type { Scene } from '@babylonjs/core/scene';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import type { GameSimulation } from '@game/core';
import type { StoreFixture } from '@game/shared';
import { fixtureBoxes, fixtureFootprint, fixturesSignature, type FixtureBox } from './fixture-shapes';
import { EMISSIVE_SCALE } from './style-spec';
import { ALPHA_HIDDEN } from './roof-fade';
import type { RoofInfo } from './map-builder';

/** Chu kỳ kiểm tra chữ ký fixture (giây) khi sim không có bộ đếm phiên bản. */
const SYNC_INTERVAL = 0.5;
export { EMISSIVE_SCALE };

interface BoxGroup {
  mesh: Mesh;
  mat: StandardMaterial;
  /** Chỉ số mái chứa nhóm này (-1 = ngoài trời / tòa mở: luôn hiện). */
  roof: number;
  alpha: number;
  /** Độ đục riêng của nhóm (kính < 1), nhân với độ mờ theo mái. */
  baseAlpha: number;
}

/** Chỉ số mái chứa điểm (x, z); -1 = ngoài trời hoặc tòa mở không có mái. */
export function roofIndexAt(roofs: readonly RoofInfo[], x: number, z: number): number {
  return roofs.findIndex(r => x >= r.x0 && x < r.x1 && z >= r.z0 && z < r.z1);
}

/**
 * Fixture (kệ, quầy, tủ lạnh, bàn...) dựng bằng thin instances từ các khối của `fixture-shapes`
 * (tủ lạnh và quầy thu ngân lấy từ kit/furniture, cùng phong cách với vỏ tòa).
 * - Chỉ dựng nội thất tòa đang bóc mái hoặc gần camera (E3).
 */
export class Fixtures3D {
  private readonly boxGroups = new Map<string, BoxGroup>();
  private roofs: readonly RoofInfo[] = [];
  private signature = '';
  private sinceSync = SYNC_INTERVAL;
  private forceRebuild = true;
  private fills = { dry: 0, cold: 0 };

  constructor(private readonly scene: Scene, private readonly simulation: GameSimulation) {}

  /** Báo danh sách mái mới (sau khi dựng lại bản đồ) → gán lại fixture vào mái và dựng lại. */
  public setRoofs(roofs: readonly RoofInfo[]): void {
    this.roofs = roofs;
    this.forceRebuild = true;
  }

  public markDirty(): void {
    this.forceRebuild = true;
  }

  public update(elapsed: number, cameraFocus?: { x: number; z: number }): void {
    this.sinceSync += elapsed;
    if (this.sinceSync >= SYNC_INTERVAL || this.forceRebuild) {
      this.sinceSync = 0;
      const fixtures = this.simulation.getFixtures();
      this.fills = this.warehouseFills();
      const sig = `${fixturesSignature(fixtures)}|${this.fills.dry},${this.fills.cold}`;
      if (this.forceRebuild || sig !== this.signature) {
        this.signature = sig;
        this.forceRebuild = false;
        this.rebuild();
      }
    }
    this.applyRoofAlpha(cameraFocus);
  }

  /** Độ đầy kho thường/kho lạnh (đọc từ simulation như bảng Kho), làm tròn 1/12 để không dựng lại mỗi lần tồn nhúc nhích. */
  private warehouseFills(): { dry: number; cold: number } {
    const sim = this.simulation;
    const ratio = (used: number, cap: number) => (cap > 0 ? Math.round(Math.min(1, used / cap) * 12) / 12 : 0);
    return {
      dry: ratio(sim.getAmbientCellsUsed(), sim.getAmbientCapacity()),
      cold: ratio(sim.getColdWarehouseCount(), sim.getColdCapacity()),
    };
  }

  public dispose(): void {
    for (const g of this.boxGroups.values()) {
      g.mesh.dispose(false, true);
      g.mat.dispose();
    }
    this.boxGroups.clear();
  }

  private boxGroupFor(roof: number, box: FixtureBox): BoxGroup {
    const key = `${roof}|${box.color}${box.emissive ? 'e' : ''}${box.alpha !== undefined ? `a${box.alpha}` : ''}`;
    let g = this.boxGroups.get(key);
    if (!g) {
      const mesh = CreateBox(`fix_${key}`, { size: 1 }, this.scene);
      const mat = new StandardMaterial(`fixm_${key}`, this.scene);
      mat.diffuseColor = Color3.FromHexString(box.color);
      mat.specularColor = Color3.Black();
      if (box.emissive) mat.emissiveColor = Color3.FromHexString(box.color).scale(EMISSIVE_SCALE);
      mesh.material = mat;
      mesh.isPickable = false;
      mesh.receiveShadows = true;
      g = { mesh, mat, roof, alpha: 1, baseAlpha: box.alpha ?? 1 };
      this.boxGroups.set(key, g);
    }
    return g;
  }

  private rebuild(): void {
    const boxMatrices = new Map<BoxGroup, number[]>();

    for (const fix of this.simulation.getFixtures()) {
      if (fix.parentId) continue;
      const { cx, cz } = fixtureFootprint(fix);
      const roof = roofIndexAt(this.roofs, cx, cz);

      const boxes = fixtureBoxes(fix, fix.type === 'warehouse_cold' ? this.fills.cold : this.fills.dry);
      for (const b of boxes) {
        const g = this.boxGroupFor(roof, b);
        let list = boxMatrices.get(g);
        if (!list) boxMatrices.set(g, list = []);
        Matrix.Compose(new Vector3(b.sx, b.sy, b.sz), Quaternion.Identity(), new Vector3(b.cx, b.cy, b.cz)).copyToArray(list, list.length);
      }
    }

    // Cập nhật thin instances cho khối code
    for (const g of this.boxGroups.values()) {
      const list = boxMatrices.get(g);
      if (!list) {
        g.mesh.thinInstanceSetBuffer('matrix', new Float32Array(0), 16, true);
        g.mesh.isVisible = false;
        continue;
      }
      g.mesh.thinInstanceSetBuffer('matrix', new Float32Array(list), 16, true);
      g.mesh.thinInstanceRefreshBoundingInfo(true);
      g.mesh.alwaysSelectAsActiveMesh = true;
      g.alpha = -1;
    }
  }

  /** Fixture trong tòa hiện dần khi mái mờ đi. E3: Chỉ hiện tòa bóc mái hoặc gần camera. */
  private applyRoofAlpha(cameraFocus?: { x: number; z: number }): void {
    for (const g of this.boxGroups.values()) {
      const roof = g.roof >= 0 ? this.roofs[g.roof] : undefined;
      const roofAlpha = roof ? 1 - roof.alpha : 1;
      const alpha = roofAlpha * g.baseAlpha;
      let near = true;
      if (cameraFocus && roof) {
        const cx = (roof.x0 + roof.x1) / 2;
        const cz = (roof.z0 + roof.z1) / 2;
        const dx = cx - cameraFocus.x;
        const dz = cz - cameraFocus.z;
        near = (dx * dx + dz * dz) <= 24 * 24;
      }
      const isPeeled = roof ? (roof.alpha < 0.95) : false;
      const shouldRender = isPeeled || near;
      const isVisible = shouldRender && roofAlpha > ALPHA_HIDDEN && g.mesh.thinInstanceCount > 0;
      if (isVisible !== g.mesh.isVisible || alpha !== g.alpha) {
        g.alpha = alpha;
        g.mat.alpha = alpha;
        g.mesh.isVisible = isVisible;
      }
    }
  }
}
