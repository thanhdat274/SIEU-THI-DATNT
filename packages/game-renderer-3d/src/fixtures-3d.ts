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
import { ModelLibrary, cloneTemplateMesh, type ModelKind, MODEL_CATALOG } from './model-library';
import { SCALE_TARGETS } from './scale-spec';
import { ALPHA_HIDDEN } from './roof-fade';
import type { RoofInfo } from './map-builder';

/** Chu kỳ kiểm tra chữ ký fixture (giây) khi sim không có bộ đếm phiên bản. */
const SYNC_INTERVAL = 0.5;
export const EMISSIVE_SCALE = 0.6;

interface BoxGroup {
  mesh: Mesh;
  mat: StandardMaterial;
  /** Chỉ số mái chứa nhóm này (-1 = ngoài trời / tòa mở: luôn hiện). */
  roof: number;
  alpha: number;
  /** Độ đục riêng của nhóm (kính < 1), nhân với độ mờ theo mái. */
  baseAlpha: number;
}

interface ModelInstanceGroup {
  kind: ModelKind;
  roof: number;
  meshes: Mesh[];
  alpha: number;
}

export interface ModelInstanceDesc {
  kind: ModelKind;
  matrix: Matrix;
}

/**
 * Tâm (x, z) của hộp bao model Kenney trong không gian model chưa nhân tỉ lệ, sau khi bỏ nút gốc `__root__`
 * (đúng hình học của bản sao `parent = null` trong Fixtures3D, gồm cả dịch chuyển của nút con như cánh tủ).
 * Đo từ file .glb trong public/assets/models/furniture-kit: x ∈ [0, W], z ∈ [-D + zMax, zMax] nên tâm không nằm ở gốc.
 */
export const FIXTURE_MODEL_CENTERS: Partial<Record<ModelKind, { x: number; z: number }>> = {
  furniture_fridge: { x: 0.215, z: -0.136 },
  furniture_fridge_large: { x: 0.260, z: -0.139 },
  furniture_fridge_small: { x: 0.215, z: -0.136 },
  furniture_kitchen_bar: { x: 0.215, z: -0.105 },
  furniture_computer_screen: { x: 0.1965, z: -0.052 },
};

/**
 * Tính ma trận biến đổi thế giới cho một instance của model Kenney trong fixture:
 * - Căn tâm hộp bao model (`center`, vốn lệch khỏi gốc) về tọa độ cục bộ (lx, ly, lz); ly là độ cao đáy model
 * - Xoay theo rotation cục bộ và rotation của fixture
 * - Đặt vào tọa độ thế giới (fixCx, fixCz)
 */
export function computeFixtureModelMatrix(
  fixCx: number,
  fixCz: number,
  fixRotationDeg: number,
  lx: number,
  ly: number,
  lz: number,
  localYawDeg: number,
  scale: Vector3,
  center: { x: number; z: number },
): Matrix {
  const fixYaw = -(fixRotationDeg * Math.PI) / 180;
  const localYaw = -(localYawDeg * Math.PI) / 180;
  const totalYaw = fixYaw + localYaw;
  const totalRot = Quaternion.RotationYawPitchRoll(totalYaw, 0, 0);

  const localCenterOffset = new Vector3(center.x * scale.x, 0, center.z * scale.z);
  const qLocal = Quaternion.RotationYawPitchRoll(localYaw, 0, 0);
  const rotatedLocalCenter = localCenterOffset.applyRotationQuaternion(qLocal);

  const originInFixtureSpace = new Vector3(
    lx - rotatedLocalCenter.x,
    ly,
    lz - rotatedLocalCenter.z,
  );

  const qFix = Quaternion.RotationYawPitchRoll(fixYaw, 0, 0);
  const worldPosOffset = originInFixtureSpace.applyRotationQuaternion(qFix);

  const finalPos = new Vector3(
    fixCx + worldPosOffset.x,
    worldPosOffset.y,
    fixCz + worldPosOffset.z,
  );

  return Matrix.Compose(scale, totalRot, finalPos);
}

type Fix = Pick<StoreFixture, 'type' | 'tileX' | 'tileY' | 'widthTiles' | 'heightTiles' | 'rotation'>;

/**
 * Ánh xạ loại fixture sang danh sách instance model Kenney tương ứng:
 * - shelf_wooden / shelf_glass: không dùng model — kệ tạp hóa dựng bằng code (fixture-shapes)
 * - refrigerator: kitchenFridgeLarge (nếu rộng 2) / kitchenFridgeSmall (nếu rộng 1)
 * - cashier_counter: kitchenBar (+ computerScreen làm máy tính tiền)
 * - các loại khác (dining_table, kitchen_station, warehouse...): trả về null để dùng khối code
 */
export function resolveFixtureModelInstances(fix: Fix, cx: number, cz: number): ModelInstanceDesc[] | null {
  const w = fix.widthTiles;
  const rot = fix.rotation;

  switch (fix.type) {
    case 'refrigerator': {
      if (w >= 2) {
        // Tủ lạnh 2 cánh / tủ đông lớn
        const center = FIXTURE_MODEL_CENTERS.furniture_fridge_large!;
        const scaleVal = MODEL_CATALOG.furniture_fridge_large.scale;
        const s = new Vector3(scaleVal, scaleVal, scaleVal);
        return [
          {
            kind: 'furniture_fridge_large',
            matrix: computeFixtureModelMatrix(cx, cz, rot, 0, 0, 0, 0, s, center),
          },
        ];
      }
      // Tủ mát 1 cánh nhỏ
      const center = FIXTURE_MODEL_CENTERS.furniture_fridge_small!;
      const scaleVal = MODEL_CATALOG.furniture_fridge_small.scale;
      const s = new Vector3(scaleVal, scaleVal, scaleVal);
      return [
        {
          kind: 'furniture_fridge_small',
          matrix: computeFixtureModelMatrix(cx, cz, rot, 0, 0, 0, 0, s, center),
        },
      ];
    }

    case 'cashier_counter': {
      const barCenter = FIXTURE_MODEL_CENTERS.furniture_kitchen_bar!;
      const barScaleVal = MODEL_CATALOG.furniture_kitchen_bar.scale;
      const barScale = new Vector3(barScaleVal, barScaleVal, barScaleVal);
      const screenCenter = FIXTURE_MODEL_CENTERS.furniture_computer_screen!;
      const screenScaleVal = MODEL_CATALOG.furniture_computer_screen.scale;
      const screenScale = new Vector3(screenScaleVal, screenScaleVal, screenScaleVal);

      if (w >= 2) {
        return [
          {
            kind: 'furniture_kitchen_bar',
            matrix: computeFixtureModelMatrix(cx, cz, rot, -0.45, 0, 0, 0, barScale, barCenter),
          },
          {
            kind: 'furniture_kitchen_bar',
            matrix: computeFixtureModelMatrix(cx, cz, rot, 0.45, 0, 0, 0, barScale, barCenter),
          },
          {
            kind: 'furniture_computer_screen',
            matrix: computeFixtureModelMatrix(cx, cz, rot, -0.35, SCALE_TARGETS.fixtures.counter, -0.05, 180, screenScale, screenCenter),
          },
        ];
      }
      return [
        {
          kind: 'furniture_kitchen_bar',
          matrix: computeFixtureModelMatrix(cx, cz, rot, 0, 0, 0, 0, barScale, barCenter),
        },
        {
          kind: 'furniture_computer_screen',
          matrix: computeFixtureModelMatrix(cx, cz, rot, 0, 0.672, -0.05, 180, screenScale, screenCenter),
        },
      ];
    }

    default:
      return null;
  }
}

/** Chỉ số mái chứa điểm (x, z); -1 = ngoài trời hoặc tòa mở không có mái. */
export function roofIndexAt(roofs: readonly RoofInfo[], x: number, z: number): number {
  return roofs.findIndex(r => x >= r.x0 && x < r.x1 && z >= r.z0 && z < r.z1);
}

/**
 * Fixture (kệ, quầy, tủ lạnh, bàn...) dựng bằng thin instances:
 * - Kệ gỗ, tủ lạnh, quầy thu ngân dùng model 3D từ Kenney Furniture Kit.
 * - Các loại khác (hoặc khi model chưa tải xong) tự động dùng khối code fallback.
 * - Chỉ dựng nội thất tòa đang bóc mái hoặc gần camera (E3).
 */
export class Fixtures3D {
  private readonly boxGroups = new Map<string, BoxGroup>();
  private readonly modelGroups = new Map<string, ModelInstanceGroup>();
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

    for (const mg of this.modelGroups.values()) {
      for (const m of mg.meshes) {
        m.dispose(false, true);
      }
    }
    this.modelGroups.clear();
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
    const lib = ModelLibrary.getInstance();
    const boxMatrices = new Map<BoxGroup, number[]>();
    const modelMatrices = new Map<string, { kind: ModelKind; roof: number; list: number[] }>();

    for (const fix of this.simulation.getFixtures()) {
      if (fix.parentId) continue;
      const { cx, cz } = fixtureFootprint(fix);
      const roof = roofIndexAt(this.roofs, cx, cz);

      // Thử dùng model Kenney
      const forceCodeBoxes = typeof window !== 'undefined' && Boolean((window as unknown as { __forceFixtureCodeBoxes?: boolean }).__forceFixtureCodeBoxes);
      const instances = resolveFixtureModelInstances(fix, cx, cz);
      const canUseModels = !forceCodeBoxes && instances !== null && instances.every(inst => lib.getLoadedModel(this.scene, inst.kind) !== null);

      if (canUseModels && instances) {
        for (const inst of instances) {
          const key = `${roof}|${inst.kind}`;
          let entry = modelMatrices.get(key);
          if (!entry) {
            entry = { kind: inst.kind, roof, list: [] };
            modelMatrices.set(key, entry);
          }
          inst.matrix.copyToArray(entry.list, entry.list.length);
        }
      } else {
        // Fallback về khối code dựng bằng box
        const boxes = fixtureBoxes(fix, fix.type === 'warehouse_cold' ? this.fills.cold : this.fills.dry);
        for (const b of boxes) {
          const g = this.boxGroupFor(roof, b);
          let list = boxMatrices.get(g);
          if (!list) boxMatrices.set(g, list = []);
          Matrix.Compose(new Vector3(b.sx, b.sy, b.sz), Quaternion.Identity(), new Vector3(b.cx, b.cy, b.cz)).copyToArray(list, list.length);
        }
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

    // Cập nhật thin instances cho model Kenney
    for (const [key, entry] of modelMatrices) {
      let mg = this.modelGroups.get(key);
      if (!mg) {
        const loaded = lib.getLoadedModel(this.scene, entry.kind);
        if (!loaded) continue;
        const clonedMeshes: Mesh[] = [];
        for (const rm of loaded.renderMeshes) {
          const clone = cloneTemplateMesh(loaded, rm, `fixm_${key}_${rm.name}`);
          clone.isPickable = false;
          clone.receiveShadows = true;
          if (clone.material) {
            clone.material = clone.material.clone(`${clone.name}_mat`);
          }
          clonedMeshes.push(clone);
        }
        mg = { kind: entry.kind, roof: entry.roof, meshes: clonedMeshes, alpha: -1 };
        this.modelGroups.set(key, mg);
      }
      for (const m of mg.meshes) {
        m.thinInstanceSetBuffer('matrix', new Float32Array(entry.list), 16, true);
        m.thinInstanceRefreshBoundingInfo(true);
        m.alwaysSelectAsActiveMesh = true;
      }
      mg.alpha = -1;
    }

    // Ẩn các modelGroup không còn instance
    for (const [key, mg] of this.modelGroups) {
      if (!modelMatrices.has(key)) {
        for (const m of mg.meshes) {
          m.thinInstanceSetBuffer('matrix', new Float32Array(0), 16, true);
          m.isVisible = false;
        }
      }
    }
  }

  /** Fixture trong tòa hiện dần khi mái mờ đi. E3: Chỉ hiện tòa bóc mái hoặc gần camera. */
  private applyRoofAlpha(cameraFocus?: { x: number; z: number }): void {
    // 1. Khối code
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

    // 2. Model Kenney
    for (const mg of this.modelGroups.values()) {
      const roof = mg.roof >= 0 ? this.roofs[mg.roof] : undefined;
      const alpha = roof ? 1 - roof.alpha : 1;
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
      const isVisible = shouldRender && alpha > ALPHA_HIDDEN && mg.meshes.length > 0 && (mg.meshes[0].thinInstanceCount ?? 0) > 0;
      if (isVisible !== mg.meshes[0]?.isVisible || alpha !== mg.alpha) {
        mg.alpha = alpha;
        for (const m of mg.meshes) {
          if (m.material) m.material.alpha = alpha;
          m.isVisible = isVisible;
        }
      }
    }
  }
}
