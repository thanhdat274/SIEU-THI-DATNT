import { BUILDING_VISUALS } from '@game/data';
import { getFixtureDimensions, type StoreFixture } from '@game/shared';
import { SCALE_TARGETS } from './scale-spec';

/** Một khối hộp trục song song trong toạ độ thế giới 3D (đơn vị = ô; Y hướng lên, cy = tâm theo chiều cao). */
export interface FixtureBox {
  color: string;
  /** Tự phát sáng nhẹ (kính tủ lạnh...). */
  emissive?: boolean;
  /** Độ đục (mặc định 1); < 1 là kính trong suốt nhẹ. */
  alpha?: number;
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

/* Kệ tạp hóa (gondola): phủ kín bề ngang chân diện, sát tường sau, cao hơn người (~1.6). */
export const SHELF_HEIGHT = SCALE_TARGETS.fixtures.gondola;
const SHELF_DEPTH_RATIO = 0.7;
const SHELF_BACK_GAP = 0.03;
const SHELF_BOARD = 0.045;
/** Độ cao mặt ván bốn tầng kệ (đáy cao 0.14 là đế kín). */
export const SHELF_TIER_Y = [0.14, 0.44, 0.74, 1.04] as const;
/** Mép trước các tấm ván (toạ độ z cục bộ): kệ dựa lưng vào mép sau chân diện, sâu ~0.7 ô. */
export function shelfFrontZ(d: number): number {
  return -d / 2 + SHELF_BACK_GAP + d * SHELF_DEPTH_RATIO;
}

const SHELF_WOOD = '#7b5d40';
const SHELF_WOOD_DARK = '#5c4531';
const SHELF_BACK_WOOD = '#6a4f37';
const SHELF_METAL = '#8d979e';
const SHELF_METAL_DARK = '#68737a';
const SHELF_GLASS = '#cfe6ee';
const PRICE_STRIP = BUILDING_VISUALS.grocery_main.wall;
const PRICE_STRIP_THICK = 0.014;

function shelf(w: number, d: number, glass: boolean): FixtureBox[] {
  const h = SHELF_HEIGHT;
  const depth = d * SHELF_DEPTH_RATIO;
  const zBack = -d / 2 + SHELF_BACK_GAP;
  const zMid = zBack + depth / 2;
  const zFront = shelfFrontZ(d);
  const frame = glass ? SHELF_METAL : SHELF_WOOD;
  const frameDark = glass ? SHELF_METAL_DARK : SHELF_WOOD_DARK;
  const out: FixtureBox[] = [
    // Tấm lưng liền (kính: lưng mờ nhạt), hai vách hông, đế kín.
    glass
      ? { color: SHELF_GLASS, alpha: 0.5, cx: 0, cy: h / 2, cz: zBack + 0.02, sx: w, sy: h, sz: 0.04 }
      : { color: SHELF_BACK_WOOD, cx: 0, cy: h / 2, cz: zBack + 0.02, sx: w, sy: h, sz: 0.04 },
    { color: frameDark, cx: 0, cy: 0.07, cz: zMid, sx: w - 0.06, sy: 0.14, sz: depth - 0.04 },
  ];
  for (const side of [-1, 1]) {
    const cx = side * (w / 2 - 0.025);
    if (glass) {
      out.push({ color: SHELF_GLASS, alpha: 0.32, cx, cy: h / 2, cz: zMid, sx: 0.03, sy: h, sz: depth });
      out.push({ color: frame, cx, cy: h / 2, cz: zBack + 0.03, sx: 0.05, sy: h, sz: 0.05 });
      out.push({ color: frame, cx, cy: h / 2, cz: zFront - 0.03, sx: 0.05, sy: h, sz: 0.05 });
    } else {
      out.push({ color: frame, cx, cy: h / 2, cz: zMid, sx: 0.05, sy: h, sz: depth });
    }
  }
  // Ván tầng + nắp trên; dải nhãn giá sáng chạy dọc mép trước mỗi ván tầng.
  for (const y of [...SHELF_TIER_Y, h]) {
    out.push({ color: frame, cx: 0, cy: y - SHELF_BOARD / 2, cz: zMid, sx: w - 0.1, sy: SHELF_BOARD, sz: depth });
  }
  for (const y of SHELF_TIER_Y) {
    out.push({ color: PRICE_STRIP, cx: 0, cy: y - 0.026, cz: zFront + PRICE_STRIP_THICK / 2, sx: w - 0.12, sy: 0.052, sz: PRICE_STRIP_THICK });
  }
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

/* Kệ pallet kho: khung thép 3 tầng, thùng carton (kho lạnh: thùng xốp trắng) xếp từ tầng thấp lên theo độ đầy kho. */
export const RACK_HEIGHT = SCALE_TARGETS.fixtures.warehouseRack;
/** Mặt ván ba tầng kệ pallet kho. */
export const RACK_TIER_Y = [0.14, 0.68, 1.22] as const;
const RACK_BEAM = 0.05;
const RACK_DEPTH_RATIO = 0.8;
const RACK_BAY_WIDTH = 0.5;

/** Số ô thùng (3 tầng × số khoang) trên kệ pallet rộng `w`. */
export function rackCartonSlots(w: number): number {
  return RACK_TIER_Y.length * Math.max(2, Math.round(w / RACK_BAY_WIDTH));
}

/** Số thùng hiện trên kệ theo độ đầy 0..1: hết hàng = 0, còn hàng thì ít nhất 1. */
export function rackCartonCount(w: number, fill: number): number {
  if (!(fill > 0)) return 0;
  const slots = rackCartonSlots(w);
  return Math.max(1, Math.min(slots, Math.round(fill * slots)));
}

function rack(w: number, d: number, cold: boolean, fill: number): FixtureBox[] {
  const depth = d * RACK_DEPTH_RATIO;
  const frame = cold ? '#3a86b4' : '#5d7188';
  const beam = cold ? '#2c6a92' : '#c7792e';
  const deck = cold ? '#a9c6d6' : '#8c6a43';
  const box = cold ? '#f1f3f2' : '#b88a55';
  const boxAlt = cold ? '#dfe6e8' : '#a37a49';
  const out: FixtureBox[] = [];
  // Cột thép ở hai đầu và mỗi khoang ~1 ô; dải dọc phía sau (lưng) giữ khung thẳng.
  const posts = Math.max(2, Math.round(w) + 1);
  for (let i = 0; i < posts; i++) {
    const cx = -w / 2 + 0.04 + (i * (w - 0.08)) / (posts - 1);
    for (const cz of [-depth / 2 + 0.03, depth / 2 - 0.03]) out.push({ color: frame, cx, cy: RACK_HEIGHT / 2, cz, sx: 0.06, sy: RACK_HEIGHT, sz: 0.06 });
  }
  // Mỗi tầng: ván đỡ + hai xà ngang trước/sau; xà mái trên cùng.
  for (const y of RACK_TIER_Y) {
    out.push({ color: deck, cx: 0, cy: y - 0.02, cz: 0, sx: w - 0.1, sy: 0.03, sz: depth - 0.08 });
    for (const cz of [-depth / 2 + 0.03, depth / 2 - 0.03]) out.push({ color: beam, cx: 0, cy: y - 0.065, cz, sx: w - 0.06, sy: RACK_BEAM, sz: 0.05 });
  }
  out.push({ color: beam, cx: 0, cy: RACK_HEIGHT - 0.025, cz: depth / 2 - 0.03, sx: w - 0.06, sy: RACK_BEAM, sz: 0.05 });
  out.push({ color: beam, cx: 0, cy: RACK_HEIGHT - 0.025, cz: -depth / 2 + 0.03, sx: w - 0.06, sy: RACK_BEAM, sz: 0.05 });
  // Thùng: lấp đầy tầng thấp trước, trái sang phải.
  const bays = Math.max(2, Math.round(w / RACK_BAY_WIDTH));
  const bayW = (w - 0.12) / bays;
  const n = rackCartonCount(w, fill);
  for (let k = 0; k < n; k++) {
    const tier = Math.floor(k / bays);
    const bay = k % bays;
    const h = 0.34 - (k % 3) * 0.03;
    out.push({
      color: k % 2 ? boxAlt : box,
      cx: -w / 2 + 0.06 + (bay + 0.5) * bayW,
      cy: RACK_TIER_Y[tier] + h / 2,
      cz: 0,
      sx: bayW - 0.06,
      sy: h,
      sz: depth * 0.72,
    });
  }
  return out;
}

const LINE_YELLOW = '#e8c21a';

/** Khu nhận hàng: vạch sơn vàng viền sàn, vài pallet gỗ (một pallet có thùng). */
function receiving(w: number, d: number): FixtureBox[] {
  const line = 0.05;
  const inset = 0.06;
  const out: FixtureBox[] = [
    { color: LINE_YELLOW, cx: 0, cy: 0.006, cz: -d / 2 + inset, sx: w - 2 * inset, sy: 0.012, sz: line },
    { color: LINE_YELLOW, cx: 0, cy: 0.006, cz: d / 2 - inset, sx: w - 2 * inset, sy: 0.012, sz: line },
    { color: LINE_YELLOW, cx: -w / 2 + inset, cy: 0.006, cz: 0, sx: line, sy: 0.012, sz: d - 2 * inset },
    { color: LINE_YELLOW, cx: w / 2 - inset, cy: 0.006, cz: 0, sx: line, sy: 0.012, sz: d - 2 * inset },
  ];
  const size = Math.min(0.7, d - 0.3, w / 2 - 0.2);
  const pallets = w >= 2 ? [-1, 1] : [0];
  pallets.forEach((side, i) => {
    const cx = side * (w / 4);
    out.push({ color: '#9b7647', cx, cy: 0.06, cz: 0, sx: size, sy: 0.12, sz: size });
    if (i === 0) out.push({ color: '#b88a55', cx, cy: 0.12 + 0.17, cz: 0, sx: size - 0.1, sy: 0.34, sz: size - 0.1 });
  });
  return out;
}

function legacyWarehouse(w: number, d: number, cold: boolean): FixtureBox[] {
  return [
    { color: cold ? '#9db7c4' : '#8c6a43', cx: 0, cy: 0.45, cz: 0, sx: w * 0.94, sy: 0.9, sz: d * 0.94 },
    { color: cold ? '#c6dce6' : '#b58d58', cx: 0, cy: 0.93, cz: 0, sx: w * 0.98, sy: 0.06, sz: d * 0.98 },
  ];
}

function localBoxes(f: Fix, fill: number): FixtureBox[] {
  const forceLegacyWh = typeof window !== 'undefined' && Boolean((window as unknown as { __forceLegacyWarehouseBoxes?: boolean }).__forceLegacyWarehouseBoxes);
  if (forceLegacyWh) {
    if (f.type === 'warehouse_cold') return legacyWarehouse(f.widthTiles, f.heightTiles, true);
    if (f.type === 'warehouse_dry' || f.type === 'warehouse_receiving') return legacyWarehouse(f.widthTiles, f.heightTiles, false);
  }
  const w = f.widthTiles;
  const d = f.heightTiles;
  switch (f.type) {
    case 'shelf_wooden': return shelf(w, d, false);
    case 'shelf_glass': return shelf(w, d, true);
    case 'refrigerator': return fridge(w, d);
    case 'cashier_counter': return counter(w, d);
    case 'dining_table': return table(w, d);
    case 'kitchen_station': return station(w, d);
    case 'warehouse_cold': return rack(w, d, true, fill);
    case 'warehouse_dry': return rack(w, d, false, fill);
    case 'warehouse_receiving': return receiving(w, d);
    default: return decor(w, d);
  }
}

/**
 * Các hộp tạo nên fixture trong toạ độ thế giới. Xoay theo bội 90° nên mọi hộp vẫn song song trục:
 * độ lệch cục bộ (lx, lz) quay thành (-lz, lx) / (-lx, -lz) / (lz, -lx) với 90/180/270 (mặt trước +z → -x / -z / +x,
 * cùng chiều kim đồng hồ như Pixi) và kích thước X/Z đổi chỗ khi 90/270.
 * `fill` (0..1) là độ đầy kho, chỉ ảnh hưởng số thùng trên kệ pallet kho.
 */
export function fixtureBoxes(f: Fix, fill = 0.5): FixtureBox[] {
  const swap = f.rotation === 90 || f.rotation === 270;
  return localBoxes(f, fill).map(b => {
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
