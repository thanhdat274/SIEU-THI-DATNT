import type { Scene } from '@babylonjs/core/scene';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import type { GameSimulation } from '@game/core';
import { fixtureBoxes, fixturesSignature, type FixtureBox } from './fixture-shapes';
import { ALPHA_HIDDEN } from './roof-fade';
import type { RoofInfo } from './map-builder';

/** Chu kỳ kiểm tra chữ ký fixture (giây) khi sim không có bộ đếm phiên bản. */
const SYNC_INTERVAL = 0.5;
const EMISSIVE_SCALE = 0.6;

interface Group {
  mesh: Mesh;
  mat: StandardMaterial;
  /** Chỉ số mái chứa nhóm này (-1 = ngoài trời / tòa mở: luôn hiện). */
  roof: number;
  alpha: number;
}

/** Chỉ số mái chứa điểm (x, z); -1 = ngoài trời hoặc tòa mở không có mái. */
export function roofIndexAt(roofs: readonly RoofInfo[], x: number, z: number): number {
  return roofs.findIndex(r => x >= r.x0 && x < r.x1 && z >= r.z0 && z < r.z1);
}

/**
 * Fixture (kệ, quầy, tủ lạnh, bàn...) dựng bằng thin instances: mỗi (mái, màu) một mesh hộp đơn vị, mỗi hộp là một instance.
 * Chỉ dựng lại khi chữ ký danh sách fixture đổi; fixture trong tòa còn mái thì ẩn, hiện dần khi mái bóc.
 */
export class Fixtures3D {
  private readonly groups = new Map<string, Group>();
  private roofs: readonly RoofInfo[] = [];
  private signature = '';
  private sinceSync = SYNC_INTERVAL;
  private forceRebuild = true;

  constructor(private readonly scene: Scene, private readonly simulation: GameSimulation) {}

  /** Báo danh sách mái mới (sau khi dựng lại bản đồ) → gán lại fixture vào mái và dựng lại. */
  public setRoofs(roofs: readonly RoofInfo[]): void {
    this.roofs = roofs;
    this.forceRebuild = true;
  }

  public update(elapsed: number): void {
    this.sinceSync += elapsed;
    if (this.sinceSync >= SYNC_INTERVAL || this.forceRebuild) {
      this.sinceSync = 0;
      const fixtures = this.simulation.getFixtures();
      const sig = fixturesSignature(fixtures);
      if (this.forceRebuild || sig !== this.signature) {
        this.signature = sig;
        this.forceRebuild = false;
        this.rebuild();
      }
    }
    this.applyRoofAlpha();
  }

  public dispose(): void {
    for (const g of this.groups.values()) { g.mesh.dispose(false, true); g.mat.dispose(); }
    this.groups.clear();
  }

  private groupFor(roof: number, box: FixtureBox): Group {
    const key = `${roof}|${box.color}${box.emissive ? 'e' : ''}`;
    let g = this.groups.get(key);
    if (!g) {
      const mesh = CreateBox(`fix_${key}`, { size: 1 }, this.scene);
      const mat = new StandardMaterial(`fixm_${key}`, this.scene);
      mat.diffuseColor = Color3.FromHexString(box.color);
      mat.specularColor = Color3.Black();
      if (box.emissive) mat.emissiveColor = Color3.FromHexString(box.color).scale(EMISSIVE_SCALE);
      mesh.material = mat;
      mesh.isPickable = false;
      g = { mesh, mat, roof, alpha: 1 };
      this.groups.set(key, g);
    }
    return g;
  }

  private rebuild(): void {
    const matrices = new Map<Group, number[]>();
    for (const fix of this.simulation.getFixtures()) {
      if (fix.parentId) continue;
      const boxes = fixtureBoxes(fix);
      // Mái chứa tâm fixture; fixture ngoài mọi mái (hoặc tòa mở không có mái) luôn hiện.
      const roof = boxes.length ? roofIndexAt(this.roofs, boxes[0].cx, boxes[0].cz) : -1;
      for (const b of boxes) {
        const g = this.groupFor(roof, b);
        let list = matrices.get(g);
        if (!list) matrices.set(g, list = []);
        Matrix.Compose(new Vector3(b.sx, b.sy, b.sz), Quaternion.Identity(), new Vector3(b.cx, b.cy, b.cz)).copyToArray(list, list.length);
      }
    }
    for (const g of this.groups.values()) {
      const list = matrices.get(g);
      if (!list) { g.mesh.thinInstanceSetBuffer('matrix', new Float32Array(0), 16, true); g.mesh.isVisible = false; continue; }
      g.mesh.thinInstanceSetBuffer('matrix', new Float32Array(list), 16, true);
      g.mesh.thinInstanceRefreshBoundingInfo(true);
      g.mesh.alwaysSelectAsActiveMesh = true;
      g.alpha = -1; // buộc applyRoofAlpha cập nhật
    }
  }

  /** Fixture trong tòa hiện dần khi mái mờ đi (alpha mái 1 → 0 thì fixture 0 → 1). */
  private applyRoofAlpha(): void {
    for (const g of this.groups.values()) {
      const roof = g.roof >= 0 ? this.roofs[g.roof] : undefined;
      const alpha = roof ? 1 - roof.alpha : 1;
      if (alpha === g.alpha) continue;
      g.alpha = alpha;
      g.mat.alpha = alpha;
      g.mesh.isVisible = alpha > ALPHA_HIDDEN && g.mesh.thinInstanceCount > 0;
    }
  }
}
