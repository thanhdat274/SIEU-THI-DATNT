import { getFixtureDimensions, type StoreFixture } from '@game/shared';

/** Một khối hộp trục song song trong toạ độ thế giới 3D (đơn vị = ô; Y hướng lên, cy = tâm theo chiều cao). */
export interface FixtureBox {
  color: string;
  /** Tự phát sáng nhẹ (kính tủ lạnh...). */
  emissive?: boolean;
  cx: number; cy: number; cz: number;
  sx: number; sy: number; sz: number;
}

export interface FixtureFootprint { x0: number; z0: number; w: number; d: number; cx: number; cz: number }

type Fix = Pick<StoreFixture, 'type' | 'tileX' | 'tileY' | 'widthTiles' | 'heightTiles' | 'rotation'>;

/** Chân diện sau xoay (khớp getFixtureDimensions của Pixi): góc trên-trái ở ô (tileX, tileY), rộng `w` × sâu `d` ô. */
export function fixtureFootprint(f: Fix): FixtureFootprint {
  const { widthTiles: w, heightTiles: d } = getFixtureDimensions(f);
  return { x0: f.tileX, z0: f.tileY, w, d, cx: f.tileX + w / 2, cz: f.tileY + d / 2 };
}

const WOOD = '#a9784a';
const WOOD_DARK = '#7d5532';

/* Các hàm dưới trả hộp trong hệ cục bộ: tâm chân diện = gốc, mặt trước hướng +z
   (ở rotation 0 là hướng xuống màn hình, như sprite Pixi); w × d là kích thước CHƯA xoay. */

function shelf(w: number, d: number, glass: boolean): FixtureBox[] {
  const h = 1.3;
  const back = glass ? '#b9d9e6' : WOOD_DARK;
  const out: FixtureBox[] = [
    { color: back, cx: 0, cy: h / 2, cz: -d / 2 + 0.04, sx: w, sy: h, sz: 0.08 },
    { color: WOOD, cx: -(w / 2 - 0.03), cy: h / 2, cz: 0, sx: 0.06, sy: h, sz: d * 0.92 },
    { color: WOOD, cx: w / 2 - 0.03, cy: h / 2, cz: 0, sx: 0.06, sy: h, sz: d * 0.92 },
  ];
  for (const y of [0.1, 0.5, 0.9, 1.28]) out.push({ color: WOOD, cx: 0, cy: y, cz: 0.02, sx: w - 0.1, sy: 0.05, sz: d * 0.9 });
  return out;
}

function fridge(w: number, d: number): FixtureBox[] {
  const h = 1.35;
  return [
    { color: '#dfe8ee', cx: 0, cy: h / 2, cz: 0, sx: w, sy: h, sz: d * 0.96 },
    { color: '#9fd8ff', emissive: true, cx: 0, cy: h / 2 + 0.03, cz: d * 0.48 + 0.01, sx: w - 0.14, sy: h - 0.24, sz: 0.03 },
    { color: '#8a99a3', cx: 0, cy: h + 0.03, cz: 0, sx: w, sy: 0.06, sz: d * 0.98 },
  ];
}

function counter(w: number, d: number): FixtureBox[] {
  return [
    { color: '#8a5a38', cx: 0, cy: 0.3, cz: 0, sx: w, sy: 0.6, sz: d * 0.9 },
    { color: '#d9b98c', cx: 0, cy: 0.63, cz: 0, sx: w * 0.98, sy: 0.07, sz: d * 0.96 },
    { color: '#333a40', cx: -w / 2 + 0.3, cy: 0.8, cz: 0, sx: 0.32, sy: 0.26, sz: 0.3 },
  ];
}

function table(w: number, d: number): FixtureBox[] {
  const lx = w / 2 - 0.1;
  const lz = d / 2 - 0.1;
  const legs: FixtureBox[] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) legs.push({ color: WOOD_DARK, cx: sx * lx, cy: 0.22, cz: sz * lz, sx: 0.08, sy: 0.44, sz: 0.08 });
  return [{ color: WOOD, cx: 0, cy: 0.47, cz: 0, sx: w * 0.94, sy: 0.06, sz: d * 0.94 }, ...legs];
}

function station(w: number, d: number): FixtureBox[] {
  return [
    { color: '#9aa3a8', cx: 0, cy: 0.35, cz: 0, sx: w, sy: 0.7, sz: d * 0.92 },
    { color: '#3a3f44', cx: 0, cy: 0.72, cz: 0, sx: w * 0.94, sy: 0.05, sz: d * 0.86 },
    { color: '#e8643c', emissive: true, cx: -w * 0.22, cy: 0.77, cz: 0, sx: 0.22, sy: 0.04, sz: 0.22 },
    { color: '#e8643c', emissive: true, cx: w * 0.22, cy: 0.77, cz: 0, sx: 0.22, sy: 0.04, sz: 0.22 },
  ];
}

function decor(w: number, d: number): FixtureBox[] {
  return [
    { color: '#7b8a6a', cx: 0, cy: 0.3, cz: 0, sx: w * 0.8, sy: 0.6, sz: d * 0.8 },
    { color: '#4f9a4a', cx: 0, cy: 0.7, cz: 0, sx: w * 0.6, sy: 0.3, sz: d * 0.6 },
  ];
}

function warehouse(w: number, d: number, cold: boolean): FixtureBox[] {
  return [
    { color: cold ? '#9db7c4' : '#8c6a43', cx: 0, cy: 0.45, cz: 0, sx: w * 0.94, sy: 0.9, sz: d * 0.94 },
    { color: cold ? '#c6dce6' : '#b58d58', cx: 0, cy: 0.93, cz: 0, sx: w * 0.98, sy: 0.06, sz: d * 0.98 },
  ];
}

function localBoxes(f: Fix): FixtureBox[] {
  const w = f.widthTiles;
  const d = f.heightTiles;
  switch (f.type) {
    case 'shelf_wooden': return shelf(w, d, false);
    case 'shelf_glass': return shelf(w, d, true);
    case 'refrigerator': return fridge(w, d);
    case 'cashier_counter': return counter(w, d);
    case 'dining_table': return table(w, d);
    case 'kitchen_station': return station(w, d);
    case 'warehouse_cold': return warehouse(w, d, true);
    case 'warehouse_dry':
    case 'warehouse_receiving': return warehouse(w, d, false);
    default: return decor(w, d);
  }
}

/**
 * Các hộp tạo nên fixture trong toạ độ thế giới. Xoay theo bội 90° nên mọi hộp vẫn song song trục:
 * độ lệch cục bộ (lx, lz) quay thành (-lz, lx) / (-lx, -lz) / (lz, -lx) với 90/180/270 (mặt trước +z → -x / -z / +x,
 * cùng chiều kim đồng hồ như Pixi) và kích thước X/Z đổi chỗ khi 90/270.
 */
export function fixtureBoxes(f: Fix): FixtureBox[] {
  const swap = f.rotation === 90 || f.rotation === 270;
  return localBoxes(f).map(b => {
    const p = fixtureLocalToWorld(f, b.cx, b.cz);
    return { ...b, cx: p.x, cz: p.z, sx: swap ? b.sz : b.sx, sz: swap ? b.sx : b.sz };
  });
}

/** Độ lệch cục bộ (lx, lz) so với tâm chân diện → toạ độ thế giới (xem quy ước xoay ở fixtureBoxes). */
export function fixtureLocalToWorld(f: Fix, lx: number, lz: number): { x: number; z: number } {
  const { cx, cz } = fixtureFootprint(f);
  let ox = lx;
  let oz = lz;
  if (f.rotation === 90) { ox = -lz; oz = lx; }
  else if (f.rotation === 180) { ox = -lx; oz = -lz; }
  else if (f.rotation === 270) { ox = lz; oz = -lx; }
  return { x: cx + ox, z: cz + oz };
}

/** Chữ ký các fixture gốc (bỏ ô phụ) — đổi khi thêm/xóa/dời/xoay/đổi kiểu; dùng để biết khi nào dựng lại. */
export function fixturesSignature(fixtures: readonly StoreFixture[]): string {
  let s = '';
  for (const f of fixtures) {
    if (f.parentId) continue;
    s += `${f.id}|${f.type}|${f.tileX}|${f.tileY}|${f.widthTiles}|${f.heightTiles}|${f.rotation};`;
  }
  return s;
}
