import type { Scene } from '@babylonjs/core/scene';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateIcoSphere } from '@babylonjs/core/Meshes/Builders/icoSphereBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { TILE_SIZE, type GameTileMap, type MapBuilding } from '@game/shared';
import { createSignPlane } from './sign-plane';
import { BUILDING_VISUALS, STREET_LAMP_TILES, TREE_PROPS, buildingTypeOfInstance, type BuildingVisual } from '@game/data';
import { ModelLibrary, MODEL_CATALOG, type ModelKind } from './model-library';

/** Mã ô lớp `walls`: 7 là gốc cây (vẽ cây riêng), còn lại là tường. */
const WALL_TREE = 7;
/** Mã ô lớp `walls` của tường nhà kho (game-data/map.ts) — luôn thuộc khối kho, kể cả khi nằm trong biên một tòa kề bên. */
const WALL_WAREHOUSE = 10;
const WAREHOUSE_VISUAL: BuildingVisual = { wall: '#cfc3a8', roof: '#6d6a63', awning: ['#6d6a63', '#6d6a63'], signBg: '#444', signText: '#fff', wallHeight: 1.8 };
const SIDEWALK_HEIGHT = 0.08;
const SIGN_HEIGHT = 0.75;
/** Mật độ điểm ảnh biển hiệu (px texture / đơn vị): thấp để chữ ra khối pixel, đủ cao để đọc được. */
const SIGN_PX_PER_UNIT = 28;
const SIGN_FONT = "'VT323', 'Be Vietnam Pro', monospace";

type TileKind = 'street' | 'sidewalk' | 'grass' | 'store' | 'warehouse';
const GROUND_COLORS: Record<TileKind | 'outside', string> = {
  street: '#4a4a52', sidewalk: '#c9bfa8', grass: '#6aa84f', store: '#d9c08c', warehouse: '#8d7b5a', outside: '#5b8f45',
};

/** Phân loại ô `ground` giống renderer Pixi: 1 đường, 2 vỉa hè (cỏ nếu hàng < 11), 3 sàn tiệm, 9 sàn kho. */
export function tileKind(id: number, worldY: number): TileKind {
  if (id === 1) return 'street';
  if (id === 3) return 'store';
  if (id === 9) return 'warehouse';
  if (id === 2 && worldY < 11) return 'grass';
  return 'sidewalk';
}

/**
 * Tra cứu tên hiển thị tiếng Việt hợp lệ cho biển hiệu tòa nhà.
 * Quy định: Biển hiệu không được chứa dấu '_' hoặc toàn chữ in hoa/mã kỹ thuật (như 'CIVIC_WIDE', 'BUILDING_A').
 * Nếu không có tên tiếng Việt hợp lệ, trả về null (không dựng biển hiệu).
 */
export function resolveBuildingSignText(building: MapBuilding): string | null {
  const type = buildingTypeOfInstance(building.id);
  if (type?.name) return type.name;

  // Tra cứu theo tiền tố id đã biết
  if (building.id === 'main' || building.id.startsWith('grocery_main')) return 'Tiệm Tạp Hóa';
  if (building.id.startsWith('clinic')) return 'Trạm Y Tế';
  if (building.id.startsWith('ward_police')) return 'Đồn Công An Phường';
  if (building.id.startsWith('primary_school')) return 'Trường Tiểu Học';
  if (building.id.startsWith('civic_wide') || building.id.startsWith('building-wide')) return 'Trung Tâm Sinh Hoạt Cộng Đồng';
  if (building.id.startsWith('xoi')) return 'Tiệm Xôi';
  if (building.id.startsWith('drink')) return 'Tiệm Giải Khát';
  if (building.id.startsWith('snack')) return 'Tiệm Ăn Vặt';
  if (building.id.startsWith('cafe')) return 'Quán Cà Phê';
  if (building.id.startsWith('com_restaurant')) return 'Quán Cơm';
  if (building.id.startsWith('grocery_branch')) return 'Chi Nhánh Tạp Hóa';

  // Chặn mọi id mã kỹ thuật: chứa dấu '_' hoặc toàn chữ hoa không dấu kiểu mã id
  if (building.id.includes('_') || /^[A-Z0-9-]+$/.test(building.id)) {
    return null;
  }

  return building.id;
}

/** Mái và tường mặt tiền một tòa (hộp ô, gồm cả tường) — ẩn khi người chơi đứng trong để nhìn thấy bên trong. */
export interface RoofInfo {
  /** Mã tòa (buildingId; khối kho dùng 'main' vì bấm vào kho là chọn tiệm chính). */
  id: string;
  /** Khối kho gắn sau tiệm chính (không có `building`). */
  warehouse: boolean;
  /** Mái: mờ về 0 khi người chơi vào tòa. */
  meshes: Mesh[];
  /** Tường mặt tiền + biển hiệu: mờ về FACADE_ALPHA (không biến mất) khi người chơi vào tòa. */
  facadeMeshes: Mesh[];
  facadeMaterials: StandardMaterial[];
  /** Tường thân tòa: chỉ mờ khi tòa che người chơi. */
  wallMeshes: Mesh[];
  /** Vật liệu RIÊNG của tòa (clone) để đổi alpha không lan sang tòa khác. */
  fadeMaterials: StandardMaterial[];
  wallMaterials: StandardMaterial[];
  alpha: number;
  wallAlpha: number;
  /** Cao độ nóc mái. */
  top: number;
  x0: number; x1: number; z0: number; z1: number;
}
/** `roadMaterial`/`lampMaterial`: vật liệu mặt đường và đầu đèn đường, để sky/weather đổi theo giờ và mưa. */
export interface BuiltMap {
  meshes: Mesh[];
  roofs: RoofInfo[];
  roadMaterial: StandardMaterial | null;
  lampMaterial: StandardMaterial | null;
  lampHeadMesh: Mesh | null;
  civicNightMeshes?: Mesh[];
  shadowCasters?: Mesh[];
  updateNightLighting?: (lampsOn: number) => void;
  updateTreeWind?: (timeSec: number, windStrength: number, reducedMotion: boolean) => void;
}

interface Footprint { visual: BuildingVisual; name: string; building?: MapBuilding; walls: number[]; x0: number; x1: number; y0: number; y1: number }

/** Dựng toàn bộ bản đồ 3D từ `GameTileMap`: sàn, vỉa hè nổi, vạch đường, tòa nhà (tường, mái, mái hiên, biển), cây, đèn. */






export function buildCityMap(scene: Scene, map: GameTileMap): BuiltMap {
  const meshes: Mesh[] = [];
  const roofs: RoofInfo[] = [];
  const shadowCasters: Mesh[] = [];
  const treeInstanceMeshes: Mesh[] = [];
  const treeBaseMatrices: Matrix[] = [];
  const civicNightMaterials: StandardMaterial[] = [];
  const facadeNightMaterials: StandardMaterial[] = [];
  const windowPlaneMeshes: Mesh[] = [];
  const civicNightMeshes: Mesh[] = [];
  const mats = new Map<string, StandardMaterial>();

  const mat = (hex: string, emissive = false): StandardMaterial => {
    const key = hex + (emissive ? 'e' : '');
    let m = mats.get(key);
    if (!m) {
      m = new StandardMaterial(`m_${key}`, scene);
      m.diffuseColor = Color3.FromHexString(hex);
      m.specularColor = Color3.Black();
      if (emissive) m.emissiveColor = Color3.FromHexString(hex);
      mats.set(key, m);
    }
    return m;
  };

  const { width, height } = map;
  const ox = map.originTileX ?? 0;
  const oy = map.originTileY ?? 0;
  const ground = map.layers.find(l => l.name === 'ground')?.data ?? [];
  const walls = map.layers.find(l => l.name === 'walls')?.data ?? [];
  const at = (data: number[], x: number, y: number) => data[(y - oy) * width + (x - ox)] ?? 0;

  const outside = CreateGround('outside', { width: width + 80, height: height + 80 }, scene);
  outside.position.set(ox + width / 2, -0.02, oy + height / 2);
  outside.material = mat(GROUND_COLORS.outside);
  outside.receiveShadows = true;
  meshes.push(outside);

  // --- Sàn: mỗi loại ô một mesh thin instances; vỉa hè là khối mỏng nổi lên để có bó vỉa.
  const tiles = new Map<TileKind, number[]>();
  let streetMin = Infinity;
  let streetMax = -Infinity;
  for (let y = oy; y < oy + height; y++) {
    for (let x = ox; x < ox + width; x++) {
      let kind = tileKind(at(ground, x, y), y);
      // Ô có tường mà nền không phải sàn tiệm/kho (vỉa hè, cỏ, đường, ô trống) → lát sàn màu kho, không để tường đứng trên cỏ.
      const wallHere = at(walls, x, y);
      if (wallHere && wallHere !== WALL_TREE && kind !== 'store' && kind !== 'warehouse') kind = 'warehouse';
      let list = tiles.get(kind);
      if (!list) tiles.set(kind, list = []);
      list.push(x, y);
      if (kind === 'street') { streetMin = Math.min(streetMin, y); streetMax = Math.max(streetMax, y); }
    }
  }
  for (const [kind, list] of tiles) {
    const raised = kind === 'sidewalk';
    const mesh = raised
      ? CreateBox(`ground_${kind}`, { width: 1, height: SIDEWALK_HEIGHT, depth: 1 }, scene)
      : CreateGround(`ground_${kind}`, { width: 1, height: 1 }, scene);
    mesh.material = mat(GROUND_COLORS[kind]);
    mesh.receiveShadows = true;
    setInstances(mesh, list.map(v => v + 0.5), raised ? SIDEWALK_HEIGHT / 2 : 0);
    meshes.push(mesh);
  }

  // --- Vạch giữa đường: nét đứt trắng dọc tim lòng đường.
  if (streetMin <= streetMax) {
    const dash = CreateBox('road_dash', { width: 0.6, height: 0.01, depth: 0.08 }, scene);
    dash.material = mat('#efe9d8');
    const zMid = (streetMin + streetMax + 1) / 2;
    const xy: number[] = [];
    for (let x = ox; x < ox + width; x += 2) xy.push(x + 0.5, zMid);
    setInstances(dash, xy, 0.006);
    meshes.push(dash);
  }

  // --- Tòa nhà: gán ô tường cho tòa chứa nó; ô tường ngoài mọi tòa (kho) gom thành một khối riêng.
  const footprints: Footprint[] = (map.buildings ?? []).map(b => {
    const type = buildingTypeOfInstance(b.id);
    const bounds = b.bounds;
    const x0 = bounds ? bounds.left : Infinity;
    const x1 = bounds ? bounds.right : -Infinity;
    const y0 = bounds ? (b.top ?? bounds.top) : Infinity;
    const y1 = bounds ? bounds.bottom : -Infinity;
    const signText = resolveBuildingSignText(b);
    return {
      visual: (type && BUILDING_VISUALS[type.typeId]) ?? BUILDING_VISUALS.grocery_main,
      name: signText ?? '',
      building: b,
      walls: [],
      x0,
      x1,
      y0,
      y1,
    };
  });
  const warehouse: Footprint = { visual: WAREHOUSE_VISUAL, name: 'Kho', walls: [], x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  const owner = (x: number, y: number): Footprint | undefined => footprints.find(f => {
    const b = f.building?.bounds;
    return b && x >= b.left && x <= b.right && y >= (f.building?.top ?? b.top) && y <= b.bottom;
  });
  // Tường lọt ngoài biên mọi tòa (vòng tường quanh ô sàn mở rộng `floorTiles`): thuộc tòa có ô sàn kề 8 hướng.
  const floorOwner = new Map<string, Footprint>();
  for (const f of footprints) for (const t of f.building?.floorTiles ?? []) floorOwner.set(`${t.x},${t.y}`, f);
  const ownerByFloor = (x: number, y: number): Footprint | undefined => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const f = floorOwner.get(`${x + dx},${y + dy}`);
      if (f) return f;
    }
    return undefined;
  };
  const grow = (f: Footprint, x: number, y: number) => { f.x0 = Math.min(f.x0, x); f.x1 = Math.max(f.x1, x); f.y0 = Math.min(f.y0, y); f.y1 = Math.max(f.y1, y); };
  for (let y = oy; y < oy + height; y++) {
    for (let x = ox; x < ox + width; x++) {
      const w = at(walls, x, y);
      const g = at(ground, x, y);
      // Tường kho (mã 10) luôn của khối kho, dù cột chung nằm trong biên tòa kề (vd. tiệm xôi biên x 0..6 ôm cột tường tây của kho).
      const f = w === WALL_WAREHOUSE ? undefined : (owner(x, y) ?? (w ? ownerByFloor(x, y) : undefined));
      if (w && w !== WALL_TREE) { const t = f ?? warehouse; t.walls.push(x + 0.5, y + 0.5); grow(t, x, y); }
      else if (g === 3 && f) grow(f, x, y);
      else if (g === 9 && !f) grow(warehouse, x, y);
    }
  }

  for (const f of [...footprints, warehouse]) {
    if (!Number.isFinite(f.x0)) continue;
    const v = f.visual;
    const buildingId = f.building?.id ?? 'main';
    const roofMat = mat(v.roof).clone(`roof_${f.name}_mat`);
    const wallMat = mat(v.wall).clone(`wall_${f.name}_mat`);
    const wallMeshes: Mesh[] = [];
    const w = f.x1 - f.x0 + 1;
    const d = f.y1 - f.y0 + 1;
    const b = f.building;
    const doors = b?.doorTiles ?? [];
    const modelFromVis = (v.modelId && (v.modelId in MODEL_CATALOG)) ? (v.modelId as ModelKind) : null;
    const civicModelKind: ModelKind | null = modelFromVis ?? (
      buildingId.startsWith('clinic')
        ? 'building_civic_clinic'
        : buildingId.startsWith('ward_police')
          ? 'building_civic_police'
          : buildingId.startsWith('primary_school')
            ? 'building_civic_school'
            : (buildingId.startsWith('building-wide') || buildingId === 'civic_wide')
              ? 'building_low_detail_wide_a'
              : null
    );
    const loadedCivic = civicModelKind ? ModelLibrary.getInstance().getLoadedModel(scene, civicModelKind) : null;

    if (loadedCivic && loadedCivic.renderMeshes.length > 0) {
      // Model 3D cho công trình civic (không vào được)
      const spec = MODEL_CATALOG[civicModelKind!];
      const modelScale = spec.scale;
      const bCenter = new Vector3(f.x0 + w / 2, 0, f.y0 + d / 2);
      const rot = Quaternion.RotationYawPitchRoll(Math.PI, 0, 0); // Quay mặt tiền ra hướng nam (+Z)
      const m = Matrix.Compose(new Vector3(modelScale, modelScale, modelScale), rot, bCenter);
      const buf = new Float32Array(16);
      m.copyToArray(buf, 0);

      for (const mesh of loadedCivic.renderMeshes) {
        const copy = mesh.clone(`bldg_${f.name}_${mesh.name}`);
        copy.parent = null;
        copy.setEnabled(true);
        copy.metadata = { buildingId };
        copy.thinInstanceSetBuffer('matrix', buf, 16, true);
        meshes.push(copy);
        shadowCasters.push(copy);
      }

      // Cửa sổ phát sáng ấm ban đêm cho tòa civic (mặt phẳng sáng nhỏ trước cửa sổ, chỉ hiện khi lampsOn > 0.3)
      const frontZ = f.y1 + 1 + 0.04;
      const winMatrices: Matrix[] = [];
      const addWin = (wx: number, wy: number, sx = 0.85, sy = 0.85) => {
        winMatrices.push(Matrix.Compose(
          new Vector3(sx, sy, 1),
          Quaternion.Identity(),
          new Vector3(f.x0 + wx, wy, frontZ)
        ));
      };

      if (civicModelKind === 'building_civic_clinic') {
        addWin(1.2, 1.4); addWin(4.8, 1.4);
        addWin(1.2, 2.7); addWin(4.8, 2.7);
      } else if (civicModelKind === 'building_civic_police') {
        addWin(1.2, 1.4); addWin(4.8, 1.4);
        addWin(1.2, 2.7); addWin(4.8, 2.7);
        addWin(3.0, 3.8);
      } else if (civicModelKind === 'building_civic_school') {
        addWin(1.2, 1.4); addWin(2.8, 1.4); addWin(5.2, 1.4); addWin(6.8, 1.4);
        addWin(1.2, 2.7); addWin(2.8, 2.7); addWin(5.2, 2.7); addWin(6.8, 2.7);
      } else if (civicModelKind === 'building_low_detail_wide_a') {
        addWin(1.4, 1.2, 1.1, 0.9); addWin(4.6, 1.2, 1.1, 0.9);
        addWin(1.4, 2.3, 1.1, 0.9); addWin(4.6, 2.3, 1.1, 0.9);
      }

      if (winMatrices.length) {
        const winMesh = CreateBox(`civic_win_${f.name}`, { width: 1, height: 1, depth: 0.03 }, scene);
        const winMat = new StandardMaterial(`civic_win_mat_${f.name}`, scene);
        winMat.diffuseColor = Color3.FromHexString('#ffe49e');
        winMat.emissiveColor = Color3.FromHexString('#ffdf88');
        winMat.specularColor = Color3.Black();
        winMat.disableLighting = true;
        winMesh.material = winMat;
        winMesh.isVisible = false;
        winMesh.metadata = { buildingId };
        const winBuf = new Float32Array(winMatrices.length * 16);
        winMatrices.forEach((m, idx) => m.copyToArray(winBuf, idx * 16));
        winMesh.thinInstanceSetBuffer('matrix', winBuf, 16, true);
        meshes.push(winMesh);
        windowPlaneMeshes.push(winMesh);
        if (civicNightMeshes.length < 6) {
          civicNightMeshes.push(winMesh);
        }
      }

      // Giữ biển hiệu đặt lên mặt tiền model (đặt ở tầng trệt mặt tiền: cao Y ~ 1.6-1.8) nếu có tên hợp lệ
      if (b && f.name) {
        const front = f.y1 + 1;
        const signW = Math.max(3, Math.min(w - 0.6, 7));
        const doorMid = doors.length ? doors.reduce((s, t) => s + t.x + 0.5, 0) / doors.length : f.x0 + w / 2;
        const signX = Math.max(f.x0 + signW / 2, Math.min(f.x1 + 1 - signW / 2, doorMid));
        const sign = createSignPlane(scene, `sign_${f.name}`, signW, SIGN_HEIGHT);
        // Đặt biển hiệu ở mặt tiền (Z = front + 0.08), cao độ tầng 1 (Y ≈ 1.6)
        sign.position.set(signX, 1.6, front + 0.08);
        sign.metadata = { buildingId };
        const signMat = signMaterial(scene, `sign_${f.name}`, f.name, v.signBg, v.signText, signW / SIGN_HEIGHT);
        sign.material = signMat;
        meshes.push(sign);
      }
      continue;
    }

    if (f.walls.length) {
      const wallMesh = CreateBox(`walls_${f.name}`, { width: 1, height: v.wallHeight, depth: 1 }, scene);
      wallMesh.material = wallMat;
      wallMesh.metadata = { buildingId };
      setInstances(wallMesh, f.walls, v.wallHeight / 2);
      meshes.push(wallMesh);
      shadowCasters.push(wallMesh);
      wallMeshes.push(wallMesh);
    }
    if (v.open) continue;
    // Mái phẳng có viền nhô, phủ cả tường.
    const roof = CreateBox(`roof_${f.name}`, { width: w + 0.3, height: 0.25, depth: d + 0.3 }, scene);
    roof.position.set(f.x0 + w / 2, v.wallHeight + 0.125, f.y0 + d / 2);
    roof.material = roofMat;
    roof.metadata = { buildingId };
    meshes.push(roof);
    shadowCasters.push(roof);
    const roofInfo: RoofInfo = { meshes: [roof], facadeMeshes: [], facadeMaterials: [], wallMeshes, fadeMaterials: [roofMat], wallMaterials: [wallMat], id: buildingId, warehouse: !f.building, alpha: 1, wallAlpha: 1, top: v.wallHeight + 0.25, x0: f.x0, x1: f.x1 + 1, z0: f.y0, z1: f.y1 + 1 };
    roofs.push(roofInfo);

    if (!b) continue;
    const front = f.y1 + 1;

    // Tường mặt tiền mỏng ở mép trước (lớp `walls` không có hàng này): khúc tường giữa các cửa, thêm lanh tô trên ô cửa.
    const doorX = new Set(doors.map(t => t.x));
    const facade: Matrix[] = [];
    const lintel = 0.45;
    for (let x = f.x0; x <= f.x1;) {
      const isDoor = doorX.has(x);
      let end = x;
      while (end + 1 <= f.x1 && doorX.has(end + 1) === isDoor) end++;
      const len = end - x + 1;
      const h = isDoor ? lintel : v.wallHeight;
      facade.push(Matrix.Compose(new Vector3(len, h, 1), Quaternion.Identity(), new Vector3(x + len / 2, v.wallHeight - h / 2, front - 0.1)));
      x = end + 1;
    }
    const facadeMesh = CreateBox(`facade_${f.name}`, { width: 1, height: 1, depth: 0.2 }, scene);
    const facadeMat = mat(v.wall).clone(`facade_${f.name}_mat`);
    facadeMesh.material = facadeMat;
    facadeMesh.metadata = { buildingId };
    facadeMesh.thinInstanceEnablePicking = true;
    roofInfo.facadeMaterials.push(facadeMat);
    facadeNightMaterials.push(facadeMat);
    setMatrices(facadeMesh, facade);
    meshes.push(facadeMesh);
    roofInfo.facadeMeshes.push(facadeMesh);

    // Cửa sổ phát sáng ấm cho tiệm chính và quán ăn vào ban đêm (lampsOn > 0.3)
    if (f.walls.length && w >= 4) {
      const winX = f.x0 + 1;
      const winPlane = CreateBox(`store_win_${f.name}`, { width: 0.9, height: 0.9, depth: 0.05 }, scene);
      winPlane.position.set(winX + 0.5, 1.25, front + 0.04);
      const winMat = new StandardMaterial(`win_mat_${f.name}`, scene);
      winMat.diffuseColor = Color3.FromHexString('#ffe49e');
      winMat.emissiveColor = Color3.FromHexString('#ffdf88');
      winMat.specularColor = Color3.Black();
      winPlane.material = winMat;
      winPlane.metadata = { buildingId };
      winPlane.isVisible = false;
      meshes.push(winPlane);
      windowPlaneMeshes.push(winPlane);
      if (civicNightMeshes.length < 6) {
        civicNightMeshes.push(winPlane);
      }
    }
    if (b.awning) {
      const ax0 = b.awning.x0 / TILE_SIZE;
      const ax1 = b.awning.x1 / TILE_SIZE;
      const awning = CreateBox(`awning_${f.name}`, { width: ax1 - ax0, height: 0.05, depth: 0.9 }, scene);
      awning.position.set((ax0 + ax1) / 2, v.wallHeight * 0.72, front + 0.4);
      awning.rotation.x = 0.35;
      awning.metadata = { buildingId };
      awning.material = stripeMaterial(scene, `awning_${f.name}`, v.awning, Math.max(2, Math.round((ax1 - ax0) * 2)));
      meshes.push(awning);
    }
    // Biển hiệu đứng trên mép mái mặt tiền, rộng gần bằng tòa, căn giữa theo cửa (nếu có tên hợp lệ)
    if (f.name) {
      const signW = Math.max(3, Math.min(w - 0.6, 7));
      const doorMid = doors.length ? doors.reduce((s, t) => s + t.x + 0.5, 0) / doors.length : f.x0 + w / 2;
      const signX = Math.max(f.x0 + signW / 2, Math.min(f.x1 + 1 - signW / 2, doorMid));
      const sign = createSignPlane(scene, `sign_${f.name}`, signW, SIGN_HEIGHT);
      sign.position.set(signX, v.wallHeight + 0.25 + SIGN_HEIGHT / 2, front + 0.06);
      sign.metadata = { buildingId };
      const signMat = signMaterial(scene, `sign_${f.name}`, f.name, v.signBg, v.signText, signW / SIGN_HEIGHT);
      sign.material = signMat;
      roofInfo.facadeMeshes.push(sign);
      roofInfo.facadeMaterials.push(signMat);
      meshes.push(sign);
    }
  }

  // --- Cây & Bụi cây: dùng model 3D (tree_default.glb, plant_bush.glb) nếu có sẵn, fallback về trụ + tán icosphere.
  if (TREE_PROPS.length) {
    const treeModel = ModelLibrary.getInstance().getLoadedModel(scene, 'tree');
    const bushModel = ModelLibrary.getInstance().getLoadedModel(scene, 'bush');

    const treeMatrices: Matrix[] = [];
    const bushMatrices: Matrix[] = [];

    const fallbackTrunkM: Matrix[] = [];
    const fallbackCrownM: Matrix[] = [];

    for (const t of TREE_PROPS) {
      const isBush = t.id.includes('bush') || t.height <= 1.5;
      if (isBush && bushModel && bushModel.renderMeshes.length > 0) {
        const s = (t.height / MODEL_CATALOG.bush.targetHeight) * MODEL_CATALOG.bush.scale * 0.45;
        bushMatrices.push(Matrix.Compose(
          new Vector3(s, s, s),
          Quaternion.Identity(),
          new Vector3(t.tileX + 0.5, 0, t.tileY + 0.5)
        ));
      } else if (!isBush && treeModel && treeModel.renderMeshes.length > 0) {
        const s = (t.height / MODEL_CATALOG.tree.targetHeight) * MODEL_CATALOG.tree.scale;
        treeMatrices.push(Matrix.Compose(
          new Vector3(s, s, s),
          Quaternion.Identity(),
          new Vector3(t.tileX + 0.5, 0, t.tileY + 0.5)
        ));
      } else {
        const h = t.height * 0.55;
        fallbackTrunkM.push(Matrix.Compose(new Vector3(1, h, 1), Quaternion.Identity(), new Vector3(t.tileX + 0.5, h / 2, t.tileY + 0.5)));
        fallbackCrownM.push(Matrix.Compose(new Vector3(t.crownRadius, t.crownRadius * 0.85, t.crownRadius), Quaternion.Identity(), new Vector3(t.tileX + 0.5, h + t.crownRadius * 0.6, t.tileY + 0.5)));
      }
    }

    if (treeMatrices.length && treeModel) {
      treeBaseMatrices.push(...treeMatrices);
      const buf = new Float32Array(treeMatrices.length * 16);
      treeMatrices.forEach((m, i) => m.copyToArray(buf, i * 16));
      for (const mesh of treeModel.renderMeshes) {
        const copy = mesh.clone(`tree_${mesh.name}_inst`);
        copy.parent = null;
        copy.setEnabled(true);
        if (mesh.material) copy.material = mesh.material;
        copy.thinInstanceSetBuffer('matrix', buf, 16, true);
        meshes.push(copy);
        shadowCasters.push(copy);
        treeInstanceMeshes.push(copy);
      }
    }

    if (bushMatrices.length && bushModel) {
      const buf = new Float32Array(bushMatrices.length * 16);
      bushMatrices.forEach((m, i) => m.copyToArray(buf, i * 16));
      for (const mesh of bushModel.renderMeshes) {
        const copy = mesh.clone(`bush_${mesh.name}_inst`);
        copy.parent = null;
        copy.setEnabled(true);
        if (mesh.material) copy.material = mesh.material;
        copy.thinInstanceSetBuffer('matrix', buf, 16, true);
        meshes.push(copy);
        shadowCasters.push(copy);
      }
    }

    if (fallbackTrunkM.length) {
      const trunk = CreateCylinder('tree_trunk', { height: 1, diameter: 0.22, tessellation: 6 }, scene);
      trunk.material = mat('#6b4a2f');
      const crown = CreateIcoSphere('tree_crown', { radius: 1, subdivisions: 1, flat: true }, scene);
      crown.material = mat('#246820');
      setMatrices(trunk, fallbackTrunkM);
      setMatrices(crown, fallbackCrownM);
      meshes.push(trunk, crown);
    }
  }

  // --- Đèn đường: dùng model 3D (light-curved.glb) nếu có sẵn, fallback về cột trụ + hộp đèn.
  let lampHeadMesh: Mesh | null = null;
  if (STREET_LAMP_TILES.length) {
    const lampModel = ModelLibrary.getInstance().getLoadedModel(scene, 'street_lamp');
    if (lampModel && lampModel.renderMeshes.length > 0) {
      const lampMatrices: Matrix[] = [];
      const s = MODEL_CATALOG.street_lamp.scale;
      for (const l of STREET_LAMP_TILES) {
        // Quay 180 độ (Math.PI) quanh trục Y để cần đèn vươn ra lòng đường (hướng nam +Z)
        const rot = Quaternion.RotationYawPitchRoll(Math.PI, 0, 0);
        lampMatrices.push(Matrix.Compose(
          new Vector3(s, s, s),
          rot,
          new Vector3(l.x + 0.5, 0, l.y + 0.5)
        ));
      }
      const buf = new Float32Array(lampMatrices.length * 16);
      lampMatrices.forEach((m, i) => m.copyToArray(buf, i * 16));

      for (const mesh of lampModel.renderMeshes) {
        const copy = mesh.clone(`lamp_${mesh.name}_inst`);
        copy.parent = null;
        copy.setEnabled(true);
        copy.thinInstanceSetBuffer('matrix', buf, 16, true);
        meshes.push(copy);
        shadowCasters.push(copy);
      }

      // Giữ khối bóng đèn nhỏ tự sáng ở đầu cần đèn:
      // Model light-curved đầu cần tại (0, 0.66, -0.20) cục bộ.
      // Sau khi scale 3.55x và xoay 180° quanh Y: dx = 0, dy = 0.66 * 3.55 ≈ 2.34, dz = +0.20 * 3.55 = +0.71.
      const bulb = CreateBox('lamp_head', { width: 0.22, height: 0.10, depth: 0.28 }, scene);
      bulb.material = mat('#ffe9a8');
      const bulbXY: number[] = [];
      for (const l of STREET_LAMP_TILES) {
        bulbXY.push(l.x + 0.5, l.y + 0.5 + 0.71);
      }
      setInstances(bulb, bulbXY, 2.34);
      meshes.push(bulb);
      lampHeadMesh = bulb;
    } else {
      // Fallback: cột mảnh + bóng đèn tự sáng
      const pole = CreateCylinder('lamp_pole', { height: 2.4, diameter: 0.08, tessellation: 6 }, scene);
      pole.material = mat('#3d4148');
      const head = CreateBox('lamp_head', { width: 0.3, height: 0.12, depth: 0.5 }, scene);
      head.material = mat('#ffe9a8');
      const poleXY: number[] = [];
      const headXY: number[] = [];
      for (const l of STREET_LAMP_TILES) { poleXY.push(l.x + 0.5, l.y + 0.5); headXY.push(l.x + 0.5, l.y + 0.75); }
      setInstances(pole, poleXY, 1.2);
      setInstances(head, headXY, 2.4);
      meshes.push(pole, head);
      lampHeadMesh = head;
    }
  }

  for (const m of meshes) m.freezeWorldMatrix();
  const updateNightLighting = (lampsOn: number): void => {
    const isNight = lampsOn > 0.3;
    const civicEmissive = isNight ? new Color3(1.0, 0.85, 0.5).scale(lampsOn) : Color3.Black();
    for (const m of civicNightMaterials) {
      m.emissiveColor.copyFrom(civicEmissive);
    }
    const facadeEmissive = isNight ? new Color3(0.35, 0.28, 0.15).scale(lampsOn) : Color3.Black();
    for (const m of facadeNightMaterials) {
      m.emissiveColor.copyFrom(facadeEmissive);
    }
    for (const p of windowPlaneMeshes) {
      p.isVisible = isNight;
    }
  };

  const updateTreeWind = (timeSec: number, windStrength: number, reducedMotion: boolean): void => {
    if (!treeInstanceMeshes.length || !treeBaseMatrices.length) return;
    if (reducedMotion || windStrength <= 0.01) {
      const baseBuf = new Float32Array(treeBaseMatrices.length * 16);
      treeBaseMatrices.forEach((m, i) => m.copyToArray(baseBuf, i * 16));
      for (const m of treeInstanceMeshes) {
        m.thinInstanceSetBuffer('matrix', baseBuf, 16, true);
      }
      return;
    }
    const swayAngle = Math.sin(timeSec * 2.5) * 0.04 * windStrength;
    const buf = new Float32Array(treeBaseMatrices.length * 16);
    for (let i = 0; i < treeBaseMatrices.length; i++) {
      const base = treeBaseMatrices[i];
      const indAngle = swayAngle * (1 + 0.25 * Math.sin(i * 1.7 + timeSec));
      const swayRot = Matrix.RotationZ(indAngle);
      const swayed = swayRot.multiply(base);
      swayed.copyToArray(buf, i * 16);
    }
    for (const m of treeInstanceMeshes) {
      m.thinInstanceSetBuffer('matrix', buf, 16, true);
    }
  };

  return {
    meshes,
    roofs,
    roadMaterial: mats.get(GROUND_COLORS.street) ?? null,
    lampMaterial: STREET_LAMP_TILES.length ? mats.get('#ffe9a8') ?? null : null,
    lampHeadMesh,
    civicNightMeshes,
    shadowCasters,
    updateNightLighting,
    updateTreeWind,
  };
}

/** Thin instances đặt tại các cặp toạ độ thế giới (x, z) liên tiếp trong `xz`, nâng lên `y`. */
function setInstances(mesh: Mesh, xz: number[], y: number): void {
  const out: Matrix[] = [];
  for (let k = 0; k < xz.length; k += 2) out.push(Matrix.Translation(xz[k], y, xz[k + 1]));
  setMatrices(mesh, out);
}

function setMatrices(mesh: Mesh, list: Matrix[]): void {
  const buffer = new Float32Array(list.length * 16);
  list.forEach((m, i) => m.copyToArray(buffer, i * 16));
  mesh.thinInstanceSetBuffer('matrix', buffer, 16, true);
}

/** Vải mái hiên sọc dọc, lấy mẫu nearest để giữ cạnh pixel. */
function stripeMaterial(scene: Scene, name: string, colors: readonly [string, string], stripes: number): StandardMaterial {
  const tex = new DynamicTexture(`${name}_tex`, { width: stripes * 4, height: 4 }, scene, false, Texture.NEAREST_SAMPLINGMODE);
  const ctx = tex.getContext();
  for (let i = 0; i < stripes; i++) { ctx.fillStyle = colors[i % 2]; ctx.fillRect(i * 4, 0, 4, 4); }
  tex.update();
  const m = new StandardMaterial(name, scene);
  m.diffuseTexture = tex;
  m.specularColor = Color3.Black();
  return m;
}

/** Biển hiệu chữ pixel (font VT323 như UI): tự phát sáng để luôn đọc rõ, chữ co cho vừa bề ngang, viền tối quanh biển. */
function signMaterial(scene: Scene, name: string, text: string, bg: string, fg: string, aspect: number): StandardMaterial {
  const h = Math.round(SIGN_HEIGHT * SIGN_PX_PER_UNIT);
  const w = Math.round(h * aspect);
  const tex = new DynamicTexture(`${name}_tex`, { width: w, height: h }, scene, false, Texture.NEAREST_SAMPLINGMODE);
  const draw = () => {
    const ctx = tex.getContext() as CanvasRenderingContext2D;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#2a1d14';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = bg;
    ctx.fillRect(1, 1, w - 2, h - 2);
    const label = text.toUpperCase();
    let size = h - 4;
    ctx.font = `${size}px ${SIGN_FONT}`;
    while (size > 8 && ctx.measureText(label).width > w - 6) ctx.font = `${--size}px ${SIGN_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillText(label, w / 2 + 1, h / 2 + 2);
    ctx.fillStyle = fg;
    ctx.fillText(label, w / 2, h / 2 + 1);
    tex.update(false);
  };
  draw();
  // Font web có thể chưa tải xong lúc dựng cảnh: vẽ lại khi có.
  if (typeof document !== 'undefined' && document.fonts) void document.fonts.load(`20px ${SIGN_FONT}`).then(draw, () => {});
  const m = new StandardMaterial(name, scene);
  m.emissiveTexture = tex;
  m.disableLighting = true;
  m.specularColor = Color3.Black();
  return m;
}
