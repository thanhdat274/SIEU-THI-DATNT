import type { Scene } from '@babylonjs/core/scene';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateIcoSphere } from '@babylonjs/core/Meshes/Builders/icoSphereBuilder';
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { TILE_SIZE, type GameTileMap, type MapBuilding } from '@game/shared';
import { BUILDING_VISUALS, STREET_LAMP_TILES, TREE_PROPS, buildingTypeOfInstance, type BuildingVisual } from '@game/data';

/** Mã ô lớp `walls`: 7 là gốc cây (vẽ cây riêng), còn lại là tường. */
const WALL_TREE = 7;
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

/** Mái và tường mặt tiền một tòa (hộp ô, gồm cả tường) — ẩn khi người chơi đứng trong để nhìn thấy bên trong. */
export interface RoofInfo {
  /** Mái + tường mặt tiền: mờ về 0 khi người chơi vào tòa. */
  meshes: Mesh[];
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
export interface BuiltMap { meshes: Mesh[]; roofs: RoofInfo[] }

interface Footprint { visual: BuildingVisual; name: string; building?: MapBuilding; walls: number[]; x0: number; x1: number; y0: number; y1: number }

/** Dựng toàn bộ bản đồ 3D từ `GameTileMap`: sàn, vỉa hè nổi, vạch đường, tòa nhà (tường, mái, mái hiên, biển), cây, đèn. */
export function buildCityMap(scene: Scene, map: GameTileMap): BuiltMap {
  const meshes: Mesh[] = [];
  const roofs: RoofInfo[] = [];
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
  meshes.push(outside);

  // --- Sàn: mỗi loại ô một mesh thin instances; vỉa hè là khối mỏng nổi lên để có bó vỉa.
  const tiles = new Map<TileKind, number[]>();
  let streetMin = Infinity;
  let streetMax = -Infinity;
  for (let y = oy; y < oy + height; y++) {
    for (let x = ox; x < ox + width; x++) {
      const kind = tileKind(at(ground, x, y), y);
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
    return { visual: (type && BUILDING_VISUALS[type.typeId]) ?? BUILDING_VISUALS.grocery_main, name: type?.name ?? b.id, building: b, walls: [], x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  });
  const warehouse: Footprint = { visual: WAREHOUSE_VISUAL, name: 'Kho', walls: [], x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  const owner = (x: number, y: number): Footprint | undefined => footprints.find(f => {
    const b = f.building?.bounds;
    return b && x >= b.left && x <= b.right && y >= (f.building?.top ?? b.top) && y <= b.bottom;
  });
  const grow = (f: Footprint, x: number, y: number) => { f.x0 = Math.min(f.x0, x); f.x1 = Math.max(f.x1, x); f.y0 = Math.min(f.y0, y); f.y1 = Math.max(f.y1, y); };
  for (let y = oy; y < oy + height; y++) {
    for (let x = ox; x < ox + width; x++) {
      const w = at(walls, x, y);
      const g = at(ground, x, y);
      const f = owner(x, y);
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
    if (f.walls.length) {
      const wallMesh = CreateBox(`walls_${f.name}`, { width: 1, height: v.wallHeight, depth: 1 }, scene);
      wallMesh.material = wallMat;
      wallMesh.metadata = { buildingId };
      setInstances(wallMesh, f.walls, v.wallHeight / 2);
      meshes.push(wallMesh);
      wallMeshes.push(wallMesh);
    }
    if (v.open) continue;
    // Mái phẳng có viền nhô, phủ cả tường.
    const w = f.x1 - f.x0 + 1;
    const d = f.y1 - f.y0 + 1;
    const roof = CreateBox(`roof_${f.name}`, { width: w + 0.3, height: 0.25, depth: d + 0.3 }, scene);
    roof.position.set(f.x0 + w / 2, v.wallHeight + 0.125, f.y0 + d / 2);
    roof.material = roofMat;
    roof.metadata = { buildingId };
    meshes.push(roof);
    const roofInfo: RoofInfo = { meshes: [roof], wallMeshes, fadeMaterials: [roofMat], wallMaterials: [wallMat], alpha: 1, wallAlpha: 1, top: v.wallHeight + 0.25, x0: f.x0, x1: f.x1 + 1, z0: f.y0, z1: f.y1 + 1 };
    roofs.push(roofInfo);

    const b = f.building;
    if (!b) continue;
    const front = f.y1 + 1;
    const doors = b.doorTiles ?? [];

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
    roofInfo.fadeMaterials.push(facadeMat);
    setMatrices(facadeMesh, facade);
    meshes.push(facadeMesh);
    roofInfo.meshes.push(facadeMesh);
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
    // Biển hiệu đứng trên mép mái mặt tiền, rộng gần bằng tòa, căn giữa theo cửa.
    const signW = Math.max(3, Math.min(w - 0.6, 7));
    const doorMid = doors.length ? doors.reduce((s, t) => s + t.x + 0.5, 0) / doors.length : f.x0 + w / 2;
    const signX = Math.max(f.x0 + signW / 2, Math.min(f.x1 + 1 - signW / 2, doorMid));
    const sign = CreatePlane(`sign_${f.name}`, { width: signW, height: SIGN_HEIGHT }, scene);
    sign.position.set(signX, v.wallHeight + 0.25 + SIGN_HEIGHT / 2, front + 0.06);
    sign.rotation.y = Math.PI;
    sign.metadata = { buildingId };
    sign.material = signMaterial(scene, `sign_${f.name}`, f.name, v.signBg, v.signText, signW / SIGN_HEIGHT);
    meshes.push(sign);
  }

  // --- Cây: thân trụ + tán khối đa diện (đổ bóng phẳng cho chất low-poly).
  if (TREE_PROPS.length) {
    const trunk = CreateCylinder('tree_trunk', { height: 1, diameter: 0.22, tessellation: 6 }, scene);
    trunk.material = mat('#6b4a2f');
    const crown = CreateIcoSphere('tree_crown', { radius: 1, subdivisions: 1, flat: true }, scene);
    crown.material = mat('#3f8a3a');
    const trunkM: Matrix[] = [];
    const crownM: Matrix[] = [];
    for (const t of TREE_PROPS) {
      const h = t.height * 0.55;
      trunkM.push(Matrix.Compose(new Vector3(1, h, 1), Quaternion.Identity(), new Vector3(t.tileX + 0.5, h / 2, t.tileY + 0.5)));
      crownM.push(Matrix.Compose(new Vector3(t.crownRadius, t.crownRadius * 0.85, t.crownRadius), Quaternion.Identity(), new Vector3(t.tileX + 0.5, h + t.crownRadius * 0.6, t.tileY + 0.5)));
    }
    setMatrices(trunk, trunkM);
    setMatrices(crown, crownM);
    meshes.push(trunk, crown);
  }

  // --- Đèn đường: cột mảnh + bóng đèn tự sáng.
  if (STREET_LAMP_TILES.length) {
    const pole = CreateCylinder('lamp_pole', { height: 2.4, diameter: 0.08, tessellation: 6 }, scene);
    pole.material = mat('#3d4148');
    const head = CreateBox('lamp_head', { width: 0.3, height: 0.12, depth: 0.5 }, scene);
    head.material = mat('#ffe9a8', true);
    const poleXY: number[] = [];
    const headXY: number[] = [];
    for (const l of STREET_LAMP_TILES) { poleXY.push(l.x + 0.5, l.y + 0.5); headXY.push(l.x + 0.5, l.y + 0.75); }
    setInstances(pole, poleXY, 1.2);
    setInstances(head, headXY, 2.4);
    meshes.push(pole, head);
  }

  for (const m of meshes) m.freezeWorldMatrix();
  return { meshes, roofs };
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
  // Ghi chú hệ tay phải (scene.useRightHandedSystem): right-handed làm chuẩn nguồn phản chiếu NGANG, nên
  // chữ biển hiệu bị in ngược (đọc phải→trái) nếu không bù. Bù bằng uScale=-1 (+ wrapU). KHÔNG cần lật dọc.
  tex.wrapU = Texture.WRAP_ADDRESSMODE;
  tex.uScale = -1;
  const m = new StandardMaterial(name, scene);
  m.emissiveTexture = tex;
  m.disableLighting = true;
  m.specularColor = Color3.Black();
  return m;
}
