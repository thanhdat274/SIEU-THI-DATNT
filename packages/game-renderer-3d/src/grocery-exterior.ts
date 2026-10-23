import type { BuildingExterior, ExteriorContext } from './building-registry';
import { KitBatch } from './kit/batch';
import {
  acUnit, baseboard, cornerPost, cornice, doorFrame, glassDoor, kitBox, parapet, plantPot, produceCrate, sandwichBoard,
  shopWindow, waterTank,
} from './kit';
import { SCALE_TARGETS } from './scale-spec';
import { KIT_COLORS } from './style-spec';

const K = SCALE_TARGETS.kit;
/** Dày tường mặt tiền (khớp bản dựng chung cũ). */
const FACADE_THICKNESS = 0.2;
/** Mái hiên nghiêng xuống phía trước (khớp bản dựng chung cũ). */
const AWNING_TILT = 0.35;
const AWNING_DEPTH = 0.9;
const AWNING_THICKNESS = 0.05;
/** Mái nhô ra khỏi tường mỗi phía (khớp bản dựng chung cũ). */
const ROOF_OVERHANG = 0.15;
const ROOF_THICKNESS = 0.25;

interface Run {
  start: number;
  len: number;
  isDoor: boolean;
}

/** Chia hàng mặt tiền thành các đoạn liên tiếp theo ô: đoạn cửa và đoạn tường. */
export function splitFacadeRuns(x0: number, x1: number, doorXs: ReadonlySet<number>): Run[] {
  const runs: Run[] = [];
  for (let x = x0; x <= x1; x++) {
    const isDoor = doorXs.has(x);
    const last = runs[runs.length - 1];
    if (last && last.isDoor === isDoor) last.len++;
    else runs.push({ start: x, len: 1, isDoor });
  }
  return runs;
}

/** Vị trí các cửa sổ trên một đoạn tường dài `len` ô: cách một ô, chừa ô đầu và ô cuối làm trụ tường. */
export function windowOffsets(len: number): number[] {
  const out: number[] = [];
  for (let i = 1; i < len - 1; i += 2) out.push(i);
  return out;
}

/**
 * Vỏ ngoài Tiệm Tạp Hóa dựng từ bộ kit: tường mặt tiền hai tông có lanh tô, khung cửa + cánh cửa kính (cửa đôi khi đoạn cửa
 * dài 2 ô), cửa sổ có bậu, phào chân tường và phào trần, trụ góc, mái hiên sọc có diềm, biển hiệu có khung và đèn rọi,
 * lan can/điều hòa/bồn nước trên mái và đồ trưng trước tiệm. Tường thân và mái chữ nhật do map-builder dựng.
 */
export function buildGroceryExterior(ctx: ExteriorContext): BuildingExterior {
  const { x0, x1, z0, z1, front, visual: v } = ctx;
  const H = v.wallHeight;
  const w = x1 - x0 + 1;
  const d = z1 - z0 + 1;
  const batch = new KitBatch(ctx.scene, `gx_${ctx.buildingId}`, ctx.buildingId);
  const wallZ = front - FACADE_THICKNESS / 2;
  const wainscot = K.wainscotHeight;
  const runs = splitFacadeRuns(x0, x1, ctx.doorXs);
  const none = { x: 0, y: 0, z: 0 };

  for (const run of runs) {
    const cx = run.start + run.len / 2;
    if (run.isDoor) {
      // Lanh tô trên cửa, khung cửa nhô ra trước 0,02 và các cánh cửa kính đặt giữa bề dày tường.
      batch.addBox(kitBox(v.wall, cx, (K.doorHeight + H) / 2, wallZ, run.len, H - K.doorHeight, FACADE_THICKNESS), none, 'facade');
      const openW = run.len - 0.1;
      batch.add(doorFrame({ width: openW }), { x: cx, y: 0, z: front - 0.06 }, 'facade');
      const leafW = openW / run.len;
      for (let k = 0; k < run.len; k++) {
        const leafX = cx - openW / 2 + (k + 0.5) * leafW;
        const handleSide = leafX <= cx ? 1 : -1;
        batch.add(glassDoor({ width: leafW, height: K.doorHeight, handleSide }), { x: leafX, y: 0, z: wallZ }, 'facade');
      }
      continue;
    }
    // Tường hai tông: phần trên màu tường, chân tường tông thứ hai nhô ra trước 0,01.
    batch.addBox(kitBox(v.wall, cx, (wainscot + H) / 2, wallZ, run.len, H - wainscot, FACADE_THICKNESS), none, 'facade');
    batch.addBox(kitBox(KIT_COLORS.wainscot, cx, wainscot / 2, wallZ + 0.005, run.len, wainscot, FACADE_THICKNESS + 0.01), none, 'facade');
    batch.add(baseboard(run.len), { x: cx, y: wainscot, z: front - 0.02 }, 'facade');
    for (const i of windowOffsets(run.len)) {
      const win = shopWindow();
      const at = { x: run.start + i + 0.5, y: K.windowSillHeight, z: front + 0.02 };
      batch.add(win, at, 'facade');
      // Ô sáng ban đêm nằm giữa ô kính tối và kính, nhỏ hơn ô kính một chút.
      const glass = win.boxes.find((b) => b.alpha !== undefined)!;
      batch.addBox(kitBox(KIT_COLORS.glow, glass.cx, glass.cy, -0.006, glass.sx - 0.02, glass.sy - 0.02, 0.004), at, 'glow');
    }
  }

  // Trụ góc và phào trần chạy suốt mặt tiền.
  const post = cornerPost({ height: H });
  batch.add(post, { x: x0 + (post.bounds.maxX - post.bounds.minX) / 2, y: 0, z: front - 0.07 }, 'facade');
  batch.add(post, { x: x1 + 1 - (post.bounds.maxX - post.bounds.minX) / 2, y: 0, z: front - 0.07 }, 'facade');
  batch.add(cornice(w), { x: x0 + w / 2, y: H - K.corniceHeight, z: front - 0.02 }, 'facade');

  // Mái hiên sọc có diềm, nghiêng xuống phía trước; không mờ khi vào trong (như bản cũ).
  if (ctx.awning && ctx.awning.x1 > ctx.awning.x0) {
    const aw = ctx.awning;
    const width = aw.x1 - aw.x0;
    const stripes = Math.max(2, Math.round(width * 2));
    const sw = width / stripes;
    const at = { x: 0, y: H * 0.72, z: front + 0.4 };
    for (let i = 0; i < stripes; i++) {
      const color = v.awning[i % 2];
      const cx = aw.x0 + (i + 0.5) * sw;
      batch.addBox(kitBox(color, cx, 0, 0, sw, AWNING_THICKNESS, AWNING_DEPTH), at, 'plain', AWNING_TILT);
      batch.addBox(kitBox(color, cx, -0.07, AWNING_DEPTH / 2, sw, 0.14, 0.03), at, 'plain', AWNING_TILT);
    }
  }

  // Biển hiệu: mặt phẳng chữ đứng trên mép mái (như bản cũ) thêm khung phía sau và hai đèn rọi.
  let signMesh: ReturnType<ExteriorContext['makeSign']> | null = null;
  if (ctx.name) {
    const signW = Math.max(3, Math.min(w - 0.6, 7));
    const doorMid = ctx.doorXs.size ? [...ctx.doorXs].reduce((s, x) => s + x + 0.5, 0) / ctx.doorXs.size : x0 + w / 2;
    const signX = Math.max(x0 + signW / 2, Math.min(x1 + 1 - signW / 2, doorMid));
    signMesh = ctx.makeSign(ctx.name, signW);
    const signY = H + ROOF_THICKNESS + signMesh.height / 2;
    signMesh.mesh.position.set(signX, signY, front + 0.06);
    signMesh.mesh.metadata = { buildingId: ctx.buildingId };
    batch.addBox(kitBox(KIT_COLORS.frame, signX, signY, front + 0.02, signW + 0.12, signMesh.height + 0.12, 0.05), none, 'facade');
    const lampY = signY + signMesh.height / 2 + 0.06;
    for (const side of [-1, 1]) {
      const lx = signX + side * signW * 0.3;
      batch.addBox(kitBox(KIT_COLORS.metalDark, lx, lampY, front + 0.15, 0.03, 0.03, 0.22), none, 'facade');
      batch.addBox(kitBox(KIT_COLORS.glow, lx, lampY - 0.02, front + 0.27, 0.08, 0.05, 0.08), none, 'glow');
    }
  }

  // Trên mái: lan can (bỏ mép trước vì có biển), điều hòa, bồn nước. Chỉ khi mái đủ rộng.
  const roofTop = H + ROOF_THICKNESS;
  if (w >= 6 && d >= 4) {
    batch.add(parapet(w + ROOF_OVERHANG * 2, d + ROOF_OVERHANG * 2, { front: false }), { x: x0 + w / 2, y: roofTop, z: z0 + d / 2 }, 'roof');
    batch.add(acUnit(), { x: x1 + 1 - 1.5, y: roofTop, z: z0 + 1.2 }, 'roof');
    batch.add(waterTank(), { x: x0 + 2, y: roofTop, z: z0 + 1.5 }, 'roof');
  }

  // Đồ trưng trước tiệm trên vỉa hè: thùng rau củ bên trái cửa, biển quảng cáo bên phải cửa, hai chậu cây hai đầu.
  const door = runs.find((r) => r.isDoor);
  if (door) {
    const g = ctx.groundY;
    batch.add(produceCrate(), { x: door.start - 0.55, y: g, z: front + 0.4 }, 'plain');
    batch.add(produceCrate(), { x: door.start - 1.05, y: g, z: front + 0.4 }, 'plain');
    batch.add(produceCrate(), { x: door.start - 0.55, y: g + 0.18, z: front + 0.4 }, 'plain');
    batch.add(sandwichBoard(), { x: door.start + door.len + 0.55, y: g, z: front + 0.55 }, 'plain');
  }
  batch.add(plantPot(), { x: x0 + 0.55, y: ctx.groundY, z: front + 0.3 }, 'plain');
  batch.add(plantPot(), { x: x1 + 1 - 0.55, y: ctx.groundY, z: front + 0.3 }, 'plain');

  const built = batch.build();
  const by = (...roles: string[]) => built.groups.filter((g) => roles.includes(g.role));
  const facadeGroups = by('facade');
  const wallColors = new Set<string>([v.wall, KIT_COLORS.wainscot]);
  return {
    meshes: [...built.meshes, ...(signMesh ? [signMesh.mesh] : [])],
    roofMeshes: by('roof').map((g) => g.mesh),
    roofMaterials: by('roof').map((g) => g.material),
    facadeMeshes: [...facadeGroups.map((g) => g.mesh), ...(signMesh ? [signMesh.mesh] : [])],
    facadeMaterials: [...facadeGroups.map((g) => g.material), ...(signMesh ? [signMesh.material] : [])],
    nightFacadeMaterials: facadeGroups.filter((g) => wallColors.has(g.color)).map((g) => g.material),
    windowGlowMeshes: by('glow').map((g) => g.mesh),
    drawItems: built.drawItems + (signMesh ? 1 : 0),
  };
}
