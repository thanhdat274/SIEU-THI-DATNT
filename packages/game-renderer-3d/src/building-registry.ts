import type { Scene } from '@babylonjs/core/scene';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { BuildingTypeId, BuildingVisual } from '@game/data';
import { buildGroceryExterior } from './grocery-exterior';
import { buildGroceryInterior } from './grocery-interior';

/**
 * Registry dựng tòa: mỗi loại tòa có thể đăng ký một builder vỏ ngoài riêng (mặt tiền, mái hiên, biển, chi tiết mái, đồ trưng).
 * `map-builder` chỉ có MỘT điểm móc: loại tòa có builder thì dùng, không có thì chạy đường dựng chung cũ.
 * Thêm loại tòa mới = thêm một file builder và một dòng ở `EXTERIOR_BUILDERS`, không sửa `map-builder`.
 * Tường thân và mái chữ nhật vẫn do `map-builder` dựng; builder lo phần còn lại của vỏ ngoài.
 */
export interface ExteriorContext {
  scene: Scene;
  buildingId: string;
  visual: BuildingVisual;
  /** Tên trên biển hiệu; rỗng = không có biển. */
  name: string;
  /** Phạm vi ô của tòa (x1, z1 tính cả ô cuối). Mép trước (phía nam) ở z = front. */
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  front: number;
  /** Cột (ô) có cửa ở hàng mặt tiền. */
  doorXs: ReadonlySet<number>;
  /** Phạm vi mái hiên theo ô, nếu tòa có mái hiên. */
  awning?: { x0: number; x1: number };
  /** Độ cao mặt vỉa hè phía trước tòa (nơi đặt đồ trưng). */
  groundY: number;
  /** Tạo mặt phẳng biển hiệu có chữ (map-builder giữ cách vẽ chữ hiện có). */
  makeSign(text: string, width: number): { mesh: Mesh; material: StandardMaterial; height: number };
}

export interface BuildingExterior {
  /** Mọi mesh mới; map-builder quản lý vòng đời (đóng băng, giải phóng khi dựng lại bản đồ). */
  meshes: Mesh[];
  /** Thuộc mái: ẩn/mờ cùng mái khi bóc mái. */
  roofMeshes: Mesh[];
  roofMaterials: StandardMaterial[];
  /** Mặt tiền: mờ về FACADE_ALPHA khi người chơi vào trong. Vật liệu phải riêng của tòa. */
  facadeMeshes: Mesh[];
  facadeMaterials: StandardMaterial[];
  /** Tường mặt tiền được thêm ánh ấm ban đêm. */
  nightFacadeMaterials: StandardMaterial[];
  /** Ô cửa sổ phát sáng: chỉ hiện ban đêm. */
  windowGlowMeshes: Mesh[];
  /** Số mục vẽ của vỏ ngoài (đo ngân sách chi tiết). */
  drawItems: number;
}

export type ExteriorBuilder = (ctx: ExteriorContext) => BuildingExterior;

export const EXTERIOR_BUILDERS: Partial<Record<BuildingTypeId, ExteriorBuilder>> = {
  grocery_main: buildGroceryExterior,
};

/**
 * Vỏ trong (sàn, tường, phào, đèn, áp phích...) của một loại tòa. Khác vỏ ngoài, vỏ trong dựng LƯỜI bởi `InteriorManager`:
 * chỉ khi người chơi ở gần hoặc đã bóc mái, và chỉ hiện khi mái mờ đi. Vị trí lấy từ ô sàn/tường thật của bản đồ,
 * không phải hộp bao tòa (hộp bao còn gồm cả vùng mở rộng chưa lát sàn).
 */
export interface InteriorContext {
  scene: Scene;
  buildingId: string;
  visual: BuildingVisual;
  /** Chiều cao tường (ô). */
  wallHeight: number;
  /** Ô sàn tiệm (toạ độ ô thế giới, không gồm ô tường). */
  floorTiles: ReadonlyArray<{ x: number; z: number }>;
  isWall(x: number, z: number): boolean;
  /** Ô cửa ở hàng mặt tiền (toạ độ ô thế giới). */
  doorTiles: ReadonlyArray<{ x: number; z: number }>;
}

export interface BuildingInterior {
  meshes: Mesh[];
  /** Ô phát sáng: chỉ hiện ban đêm (và khi vỏ trong đang hiện). */
  glowMeshes: Mesh[];
  /** Vật liệu riêng của vỏ trong, giải phóng cùng mesh. */
  materials: StandardMaterial[];
  drawItems: number;
}

export type InteriorBuilder = (ctx: InteriorContext) => BuildingInterior;

export const INTERIOR_BUILDERS: Partial<Record<BuildingTypeId, InteriorBuilder>> = {
  grocery_main: buildGroceryInterior,
};

/** Một vỏ trong chờ dựng: `build` chỉ chạy khi `InteriorManager` quyết định cần. */
export interface InteriorSpec {
  buildingId: string;
  /** Tâm vỏ trong (toạ độ thế giới) để đo khoảng cách tới camera. */
  center: { x: number; z: number };
  build: () => BuildingInterior;
}
