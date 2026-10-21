import type { BuildingInterior, InteriorContext } from './building-registry';
import { KitBatch } from './kit/batch';
import { baseboard, ceilingBeam, doorMat, kitBox, lampBulb, pendantLamp, priceBoard, wallPoster } from './kit';
import { SCALE_TARGETS } from './scale-spec';
import { KIT_COLORS } from './style-spec';

const K = SCALE_TARGETS.kit;

/** Hướng mặt tường nhìn vào phòng: N = tường ở phía bắc (-z), mặt quay về +z; tương tự S, W, E. */
export type WallFaceDir = 'N' | 'S' | 'W' | 'E';

/** Một đoạn mặt tường liên tiếp nhìn vào phòng: `line` là toạ độ của mặt (z với N/S, x với W/E), `start`/`len` theo trục còn lại. */
export interface WallRun {
  dir: WallFaceDir;
  line: number;
  start: number;
  len: number;
}

/** Xoay quanh trục đứng đưa mặt trước (+z) của mảnh về hướng nhìn vào phòng. */
export const FACE_YAW: Record<WallFaceDir, number> = { N: 0, S: Math.PI, W: Math.PI / 2, E: -Math.PI / 2 };

/**
 * Các mặt tường tiếp giáp ô sàn, gộp thành đoạn liên tiếp. Mỗi ô sàn có tường ở một phía sinh ra một mặt tường ở phía đó;
 * ô sàn kề nhau cùng phía thì gộp. Thuần theo ô, không cần WebGL.
 */
export function wallFaces(floorTiles: ReadonlyArray<{ x: number; z: number }>, isWall: (x: number, z: number) => boolean): WallRun[] {
  const buckets = new Map<string, { dir: WallFaceDir; line: number; coords: number[] }>();
  const add = (dir: WallFaceDir, line: number, coord: number): void => {
    const key = `${dir}${line}`;
    let b = buckets.get(key);
    if (!b) buckets.set(key, (b = { dir, line, coords: [] }));
    b.coords.push(coord);
  };
  for (const { x, z } of floorTiles) {
    if (isWall(x, z - 1)) add('N', z, x);
    if (isWall(x, z + 1)) add('S', z + 1, x);
    if (isWall(x - 1, z)) add('W', x, z);
    if (isWall(x + 1, z)) add('E', x + 1, z);
  }
  const runs: WallRun[] = [];
  for (const { dir, line, coords } of buckets.values()) {
    coords.sort((a, b) => a - b);
    let start = coords[0];
    let prev = coords[0];
    for (let i = 1; i <= coords.length; i++) {
      if (i < coords.length && coords[i] === prev + 1) { prev = coords[i]; continue; }
      runs.push({ dir, line, start, len: prev - start + 1 });
      start = coords[i];
      prev = coords[i];
    }
  }
  return runs;
}

/** Trung điểm đoạn tường theo trục chạy dọc đoạn, cộng `offset` ô tính từ đầu đoạn (`len` ô). */
function along(run: WallRun, offset: number): number {
  return run.start + offset;
}

/**
 * Vỏ trong Tiệm Tạp Hóa dựng từ kit và ô sàn/tường thật: sàn lát hai tông xen kẽ (khe vữa lộ nền), tường chân màu bạc hà
 * kèm phào chân trắng, áp phích và bảng giá trên tường, xà ngang với đèn thả (bóng sáng ban đêm), thảm cửa.
 * Chỉ dựng khi `InteriorManager` cần (gần hoặc đã bóc mái).
 */
export function buildGroceryInterior(ctx: InteriorContext): BuildingInterior {
  const batch = new KitBatch(ctx.scene, `gi_${ctx.buildingId}`, ctx.buildingId);
  const H = ctx.wallHeight;
  const none = { x: 0, y: 0, z: 0 };
  const floorSet = new Set(ctx.floorTiles.map((t) => `${t.x},${t.z}`));

  // Sàn lát: ô nhỏ hơn ô lưới 0,03 để lộ nền thành khe; hai tông xen kẽ theo (x + z).
  for (const { x, z } of ctx.floorTiles) {
    const color = (x + z) % 2 === 0 ? KIT_COLORS.floorA : KIT_COLORS.floorB;
    batch.addBox(kitBox(color, x + 0.5, 0.01, z + 0.5, 0.97, 0.02, 0.97), none, 'floor');
  }

  // Tường: dải chân tường bạc hà sát mặt tường và phào chân trắng nhô ra phía trước.
  const runs = wallFaces(ctx.floorTiles, ctx.isWall);
  for (const run of runs) {
    const mid = along(run, run.len / 2);
    const face = run.dir === 'N' || run.dir === 'W' ? 1 : -1; // +1: tường ở phía trước (nhỏ hơn), mặt hướng về +z/+x
    const panel = 0.01 * face;
    const alongZ = run.dir === 'W' || run.dir === 'E';
    batch.addBox(
      alongZ
        ? kitBox(KIT_COLORS.interiorWainscot, run.line + panel, K.wainscotHeight / 2, mid, 0.02, K.wainscotHeight, run.len)
        : kitBox(KIT_COLORS.interiorWainscot, mid, K.wainscotHeight / 2, run.line + panel, run.len, K.wainscotHeight, 0.02),
      none,
      'plain',
    );
    const at = alongZ ? { x: run.line + 0.02 * face, y: 0, z: mid } : { x: mid, y: 0, z: run.line + 0.02 * face };
    batch.add(baseboard(run.len), at, 'plain', 0, FACE_YAW[run.dir]);
  }

  // Áp phích và bảng giá trên tường (bỏ qua tường phía nam: có cửa và quầy thu ngân). Treo cao 0,85 để nằm trên kệ thấp.
  const hang = 0.85;
  let posterIndex = 0;
  for (const run of runs) {
    if (run.dir === 'S' || run.len < 2) continue;
    const spots = run.len >= 4 && run.dir === 'N' ? [run.len * 0.25, run.len * 0.75] : [run.dir === 'E' ? run.len - 1.5 : run.len >= 3 ? 1.5 : run.len / 2];
    for (const offset of spots) {
      const p = along(run, offset);
      const alongZ = run.dir === 'W' || run.dir === 'E';
      const at = alongZ ? { x: run.line, y: hang, z: p } : { x: p, y: hang, z: run.line };
      const piece = run.dir === 'W' ? priceBoard() : wallPoster((posterIndex++ % 3) as 0 | 1 | 2);
      batch.add(piece, at, 'plain', 0, FACE_YAW[run.dir]);
    }
  }

  // Xà ngang nối hai tường ở hai hàng sàn và đèn thả; bóng đèn là ô sáng riêng (chỉ ban đêm).
  const rows = new Map<number, number[]>();
  for (const { x, z } of ctx.floorTiles) (rows.get(z) ?? rows.set(z, []).get(z)!).push(x);
  const zs = [...rows.keys()].sort((a, b) => a - b);
  const beamRows = zs.length >= 4 ? [zs[1], zs[zs.length - 2]] : zs.length ? [zs[Math.floor(zs.length / 2)]] : [];
  const lampDrop = 0.06;
  const shadeH = 0.12;
  const beamBottom = H - 0.08;
  const lampY = beamBottom - shadeH - lampDrop;
  for (const z of beamRows) {
    const xs = rows.get(z)!.sort((a, b) => a - b);
    const x0 = xs[0];
    const x1 = xs[xs.length - 1] + 1;
    // Chỉ dựng xà khi cả hai đầu tựa vào tường.
    if (!ctx.isWall(x0 - 1, z) || !ctx.isWall(x1, z)) continue;
    const len = x1 - x0;
    batch.add(ceilingBeam(len), { x: x0 + len / 2, y: beamBottom, z: z + 0.5 }, 'plain');
    const lamps = Math.max(1, Math.min(3, Math.floor(len / 3)));
    for (let i = 1; i <= lamps; i++) {
      const lx = x0 + (len * i) / (lamps + 1);
      batch.add(pendantLamp(lampDrop), { x: lx, y: lampY, z: z + 0.5 }, 'plain');
      batch.add(lampBulb(), { x: lx, y: lampY - 0.06, z: z + 0.5 }, 'glow');
    }
  }

  // Thảm cửa trong ngưỡng cửa: gộp các ô cửa liền nhau thành một tấm.
  const doorRows = new Map<number, number[]>();
  for (const t of ctx.doorTiles) (doorRows.get(t.z) ?? doorRows.set(t.z, []).get(t.z)!).push(t.x);
  for (const [z, xs] of doorRows) {
    xs.sort((a, b) => a - b);
    let start = xs[0];
    for (let i = 1; i <= xs.length; i++) {
      if (i < xs.length && xs[i] === xs[i - 1] + 1) continue;
      const len = xs[i - 1] - start + 1;
      if (floorSet.has(`${start},${z}`)) batch.add(doorMat(Math.max(0.6, len - 0.3)), { x: start + len / 2, y: 0.02, z: z + 0.5 }, 'plain');
      start = xs[i];
    }
  }

  const built = batch.build();
  return {
    meshes: built.meshes,
    glowMeshes: built.groups.filter((g) => g.role === 'glow').map((g) => g.mesh),
    materials: built.groups.map((g) => g.material),
    drawItems: built.drawItems,
  };
}
