/**
 * Va chạm của người chơi trong khu phố mở rộng (ngoài bản đồ ô 36×22). Khách, nhân viên và đường đi A* vẫn chỉ dùng bản đồ ô;
 * chỉ nhân vật người chơi (và bạn co-op) được đi tự do ngoài đó, nên va chạm ở đây là danh sách hộp chữ nhật (px thế giới)
 * dựng từ đúng dữ liệu renderer vẽ (nhà, trường, công viên, hàng rào, ao, cây, cột đèn). Dữ liệu thuần, không import Pixi.
 */
import { STREET_LAMP_COLLIDER, STREET_LAMP_TILES } from './map';
import {
  APARTMENT_PARKING, AVENUES, NEIGHBORHOOD_LOTS, NEIGHBORHOOD_PX, PARK, PARK_BENCHES, PARK_LAMPS, PARK_PATHS, SCHOOL, TRAFFIC_ROADS, type NeighborhoodLot,
} from './neighborhood';

const T = 32;

export interface WorldBox { x: number; y: number; width: number; height: number }

/** Cột đèn đường ngoài bản đồ chơi: ô trái `x`, ô `y` và độ lệch đáy sprite (px); renderer và va chạm cùng đọc danh sách này. */
export interface StreetLampSpot { x: number; y: number; bottomOffset: number }

const avenueBlocks = (x: number, margin: number): boolean => AVENUES.some((a) => x > a.x0 - margin && x < a.x1 + margin);

export const NEIGHBORHOOD_STREET_LAMPS: readonly StreetLampSpot[] = (() => {
  const out: StreetLampSpot[] = [];
  const skipMap = (x: number) => x >= -1 && x <= 36;
  const existing = new Set(STREET_LAMP_TILES.map((l) => l.x));
  for (let x = -42; x < 78; x += 8) {
    if (skipMap(x) || existing.has(x) || avenueBlocks(x, 2)) continue;
    out.push({ x, y: 12, bottomOffset: 32 });
  }
  for (let x = -40; x < 78; x += 8) if (!avenueBlocks(x, 2)) out.push({ x, y: 17, bottomOffset: 32 });
  for (let x = -40; x < 78; x += 10) if (!avenueBlocks(x, 2)) { out.push({ x, y: -17, bottomOffset: 32 }); out.push({ x: x + 3, y: 29, bottomOffset: 32 }); }
  for (const a of AVENUES) for (let y = -16; y < 44; y += 9) {
    if (TRAFFIC_ROADS.some((r) => y > r.topRow - 3 && y < r.topRow + 5)) continue;
    out.push({ x: a.x0 - 1, y, bottomOffset: 32 });
  }
  return out;
})();

/** Ô x của cây dọc vỉa hè phía nam đường chính (ngoài bản đồ chơi và đầu hẻm); chân cây ở y = `STREET_TREE_Y_TILES` ô. */
export const NEIGHBORHOOD_SOUTH_TREE_X: readonly number[] = (() => {
  const out: number[] = [];
  for (let x = -42; x < 78; x += 6) {
    if (AVENUES.some((a) => x + 1 > a.x0 - 1 && x < a.x1 + 1)) continue;
    if (x > 8 && x < 16) continue;
    out.push(x);
  }
  return out;
})();
export const STREET_TREE_Y_TILES = 17.2;

/** Chiều cao sprite (px) của một công trình, khớp `houseTexture`/`apartmentTexture` trong renderer. */
export function lotHeightPx(lot: NeighborhoodLot): number {
  if (lot.kind === 'apartment') return 22 + lot.floors * 36 + 40;
  const roofH = Math.floor(lot.variant / 8) % 3 === 2 ? 32 : 26;
  return roofH + lot.floors * 44 + (lot.yard ? 14 : 6);
}

export const SCHOOL_BUILDING_HEIGHT_PX = 150;

/** Vùng người chơi được đi (px): chừa dải cây/đồi ngoài rìa khu phố. */
export const NEIGHBORHOOD_WALK_BOUNDS = {
  x0: NEIGHBORHOOD_PX.x0 + 3 * T, x1: NEIGHBORHOOD_PX.x1 - 3 * T, y0: NEIGHBORHOOD_PX.y0 + 6 * T, y1: NEIGHBORHOOD_PX.y1 - 3 * T,
} as const;

// ---------------------------------------------------------------------------------------------------------------------
// Đồ vật rải trong khu phố: renderer vẽ đúng danh sách này và va chạm lấy hộp chân (`solid`) từ chính nó, nên hình và va chạm khớp nhau.
// ---------------------------------------------------------------------------------------------------------------------

/** Băm xác định (FNV) và số ngẫu nhiên 0..1 từ các số nguyên, dùng chung cho renderer và danh sách đồ vật. */
export const hash = (...n: number[]): number => {
  let h = 2166136261;
  for (const v of n) h = Math.imul(h ^ (v | 0), 16777619);
  return h >>> 0;
};
export const rnd = (...n: number[]): number => (hash(...n) % 100000) / 100000;

/** Một sprite đồ vật: `y` là đáy sprite, `anchorX` 0 (x là mép trái) hoặc 0,5 (x là giữa), `bias` cộng vào thứ tự vẽ; `solid` là hộp chân chặn người chơi. */
export interface PropPlacement { key: string; x: number; y: number; anchorX: 0 | 0.5; bias: number; solid?: WorldBox; /** Đồ vật trước một nhà trang trí: ẩn cùng nhà khi đợt khai hoang mở. */ lotId?: string }

/** Rộng sprite (px) từng loại và hộp chân (rộng × cao, căn giữa sprite, sát đáy). */
const PROP_FOOT = {
  bench: { sprite: 32, w: 30, h: 8 }, bush: { sprite: 36, w: 30, h: 10 }, bin: { sprite: 16, w: 12, h: 8 }, pot: { sprite: 12, w: 10, h: 8 },
  flowerbed: { sprite: 64, w: 56, h: 10 }, hedge: { sprite: 32, w: 30, h: 8 }, tree: { sprite: 56, w: 10, h: 8 },
  bike: { sprite: 62, w: 50, h: 10 }, car: { sprite: 130, w: 118, h: 12 }, busStop: { sprite: 96, w: 84, h: 8 }, playground: { sprite: 160, w: 140, h: 22 },
} as const;

const prop = (key: string, x: number, y: number, anchorX: 0 | 0.5, bias: number, foot?: keyof typeof PROP_FOOT): PropPlacement => {
  const p: PropPlacement = { key, x, y, anchorX, bias };
  if (foot) {
    const f = PROP_FOOT[foot];
    p.solid = { x: x - anchorX * f.sprite + (f.sprite - f.w) / 2, y: y - f.h, width: f.w, height: f.h };
  }
  return p;
};

const onParkFeature = (x: number, y: number): boolean => {
  const inR = (r: { x0: number; y0: number; x1: number; y1: number }, m = 0) => x >= r.x0 - m && x <= r.x1 + m && y >= r.y0 - m && y <= r.y1 + m;
  return PARK_PATHS.some((p) => inR(p, 1)) || inR(PARK.pond, 1) || inR(PARK.garden, 0) || inR(PARK.playground, 1)
    || (Math.abs(x - PARK.pavilion.x) < 4 && Math.abs(y - PARK.pavilion.y) < 3) || PARK_BENCHES.some((b) => Math.abs(b.x - x) < 2 && Math.abs(b.y - y) < 2);
};

/** Chân chòi nghỉ: hai cột (không sprite riêng, chỉ va chạm). */
const PAVILION_POSTS = [14, 92] as const;

export const NEIGHBORHOOD_PROPS: readonly PropPlacement[] = (() => {
  const out: PropPlacement[] = [];
  // Công viên: luống hoa, chòi, sân chơi, ghế, bụi cây, thùng rác, trạm xe buýt tây.
  const ga = PARK.garden;
  let n = 0;
  for (let y = ga.y0 + 1; y < ga.y1 - 1; y += 2) for (let x = ga.x0 + 1; x < ga.x1 - 2; x += 3) out.push(prop(`nb_flowerbed_${n++ % 3}`, x * T, y * T + 26, 0, -1, 'flowerbed'));
  const pv = prop('nb_pavilion', PARK.pavilion.x * T, PARK.pavilion.y * T + 20, 0.5, 4);
  pv.solid = { x: pv.x - 56 + PAVILION_POSTS[0], y: pv.y - 8, width: 6, height: 6 };
  out.push(pv);
  out.push({ key: '', x: pv.x, y: pv.y, anchorX: 0.5, bias: 0, solid: { x: pv.x - 56 + PAVILION_POSTS[1], y: pv.y - 8, width: 6, height: 6 } });
  const pg = PARK.playground;
  out.push(prop('nb_playground', ((pg.x0 + pg.x1) / 2) * T, (pg.y1 - 0.3) * T, 0.5, 2, 'playground'));
  for (const b of PARK_BENCHES) out.push(prop('nb_bench', b.x * T + 16, b.y * T + 20, 0.5, 2, 'bench'));
  const a = PARK.area;
  for (let i = 0; i < 14; i++) {
    const x = a.x0 + 1 + rnd(i, 31) * (a.x1 - a.x0 - 3);
    const y = a.y0 + 1 + rnd(i, 32) * (a.y1 - a.y0 - 3);
    if (onParkFeature(x, y)) continue;
    out.push(prop(`nb_bush_${i % 3}`, x * T, y * T + 24, 0, 0, 'bush'));
  }
  out.push(prop('nb_bin', (PARK.gateSouth.x + 2) * T, a.y1 * T - 2, 0, 1, 'bin'));
  out.push(prop('nb_bus_stop', ((-36 + -34) / 2) * T, 13 * T - 2, 0.5, 5, 'busStop'));
  // Sân trường: cây và ghế.
  for (const tx of [10.5, 14, 34]) out.push(prop('nb_tree_round_1', tx * T, (SCHOOL.area.y1 - 1.2) * T, 0.5, 0, 'tree'));
  for (const bx of [16, 30]) out.push(prop('nb_bench', bx * T, -22.6 * T, 0.5, 1, 'bench'));
  // Bãi xe chung cư: xe đỗ ngẫu nhiên theo ô, thùng rác, hàng rào cây.
  const p = APARTMENT_PARKING;
  let seed = 0;
  for (let x = p.x0 * T + 28; x < p.x1 * T - 80; x += 5 * T) {
    for (const [row, d] of [[p.y0 + 1.1, 'right'], [p.y0 + 4.2, 'left']] as const) {
      const roll = rnd(seed++, 51);
      if (roll < 0.4) continue;
      if (roll < 0.8) out.push(prop(`vehicle_car_v${1 + (seed % 5)}_${d}`, x + 66, (row + 2.1) * T, 0.5, 0, 'car'));
      else for (let k = 0; k < 2; k++) out.push(prop(`vehicle_motorbike_parked_${(seed + k) % 3}`, x + 30 + k * 64, (row + 2) * T, 0.5, 0, 'bike'));
    }
  }
  for (const bx of [44, 58, 72]) out.push(prop('nb_bin', bx * T, (p.y1 + 0.2) * T, 0, 1, 'bin'));
  for (let x = p.x0; x < p.x1; x += 3) out.push(prop('nb_hedge', x * T, p.y1 * T, 0, -1, 'hedge'));
  // Trước mỗi nhà: xe máy dựng, thùng rác, chậu cây.
  for (const lot of NEIGHBORHOOD_LOTS) {
    if (lot.kind === 'apartment') continue;
    const h = hash(lot.x, lot.frontY, 7);
    const lx = lot.x * T, bottom = lot.frontY * T + 4;
    const mark = out.length;
    if (h % 3 !== 0) out.push(prop(`vehicle_motorbike_parked_${h % 3}`, lx + 40 + (h % 5) * 12, bottom + 18, 0.5, 0, 'bike'));
    if (h % 5 === 0) out.push(prop('nb_bin', lx + lot.w * T - 22, bottom + 14, 0, 0, 'bin'));
    if (h % 7 === 0) out.push(prop(`nb_pot_${h % 3}`, lx + 6, bottom + 12, 0, 0, 'pot'));
    for (let i = mark; i < out.length; i++) out[i].lotId = lot.id;
  }
  // Cây: hàng phía nam đường chính, hàng dọc đường trường (phía bắc) và quanh bãi xe chung cư.
  for (const x of NEIGHBORHOOD_SOUTH_TREE_X) out.push(prop(`nb_tree_round_${(x + 100) % 3}`, x * T, STREET_TREE_Y_TILES * T, 0.5, 0, 'tree'));
  for (let x = -42; x < 78; x += 5) {
    if (AVENUES.some((av) => x + 1 > av.x0 - 1 && x < av.x1 + 1)) continue;
    if (x > 6 && x < 38) continue; // trường
    out.push(prop(`nb_tree_round_${(x + 101) % 3}`, x * T, -16.2 * T, 0.5, 0, 'tree'));
  }
  for (let x = 42; x < 77; x += 7) out.push(prop(`nb_tree_round_${x % 3}`, x * T, 10.2 * T, 0.5, 0, 'tree'));
  // Đồ vỉa hè hai bên đường chính ngoài bản đồ chơi: ghế đá, thùng rác, xe máy dựng sát lề.
  const blocked = (x: number) => AVENUES.some((av) => x + 2 > av.x0 - 1 && x < av.x1 + 2) || (x >= -2 && x <= 37);
  for (let x = -40; x < 78; x += 6) {
    if (blocked(x)) continue;
    const h = hash(x, 303);
    if (h % 3 === 0) out.push(prop('nb_bench', x * T + 16, 17.45 * T, 0.5, 2, 'bench'));
    else if (h % 3 === 1) out.push(prop('nb_bin', x * T + 8, 17.5 * T, 0, 1, 'bin'));
    else out.push(prop(`vehicle_motorbike_parked_${h % 3}`, x * T + 24, 17.45 * T, 0.5, 1, 'bike'));
    if ((h >>> 3) % 2 === 0) out.push(prop(`vehicle_motorbike_parked_${(h >>> 5) % 3}`, x * T + 40, 12.9 * T, 0.5, 1, 'bike'));
    else out.push(prop('nb_bin', x * T + 20, 12.95 * T, 0, 1, 'bin'));
  }
  return out;
})();

export const NEIGHBORHOOD_OBSTACLES: readonly WorldBox[] = (() => {
  const out: WorldBox[] = [];
  const add = (x: number, y: number, width: number, height: number) => { if (width > 0 && height > 0) out.push({ x, y, width, height }); };

  // Nhà dân, nhà phố, chung cư: cả khối sprite từ mái tới chân tường.

  // Tòa nhà trường + hàng rào (chừa cổng) + hai biên.
  const bd = SCHOOL.building;
  add(bd.x * T, bd.frontY * T - SCHOOL_BUILDING_HEIGHT_PX, bd.w * T, SCHOOL_BUILDING_HEIGHT_PX - 6);
  const gate = SCHOOL.gate;
  const gateFenceY = gate.y * T + 28 - 10;
  add(SCHOOL.area.x0 * T, gateFenceY, Math.max(0, gate.x - 1 - SCHOOL.area.x0) * T, 10);
  add((gate.x + gate.w + 1) * T, gateFenceY, Math.max(0, SCHOOL.area.x1 - (gate.x + gate.w + 1)) * T, 10);
  for (const x of [SCHOOL.area.x0, SCHOOL.area.x1 - 1]) add(x * T + 10, (SCHOOL.area.y0 + 4) * T, 12, (SCHOOL.area.y1 - SCHOOL.area.y0 - 4) * T);
  add(SCHOOL.flagpole.x * T - 2, SCHOOL.flagpole.y * T - 8, 6, 8);

  // Công viên: hàng rào (chừa hai cổng), ao.
  const a = PARK.area;
  const gateS = PARK.gateSouth.x, gateE = PARK.gateEast.y;
  const parkFenceY = a.y1 * T + 4 - 10;
  add(a.x0 * T, parkFenceY, (gateS - 1 - a.x0) * T, 10);
  add((gateS + 2) * T, parkFenceY, (a.x1 - gateS - 2) * T, 10);
  add(a.x0 * T + 10, a.y0 * T, 12, (a.y1 - a.y0) * T);
  add((a.x1 - 1) * T + 10, a.y0 * T, 12, (gateE - 1 - a.y0) * T);
  add((a.x1 - 1) * T + 10, (gateE + 2) * T, 12, (a.y1 - gateE - 2) * T);
  const pd = PARK.pond;
  add(pd.x0 * T - 6, pd.y0 * T - 6, (pd.x1 - pd.x0) * T + 12, (pd.y1 - pd.y0) * T + 12);

  // Cột đèn và cây vỉa hè (chân cột/gốc cây).
  const lamp = (xt: number, bottom: number) => add(xt * T + STREET_LAMP_COLLIDER.offsetX, bottom - T + STREET_LAMP_COLLIDER.offsetY, STREET_LAMP_COLLIDER.width, STREET_LAMP_COLLIDER.height);
  for (const l of NEIGHBORHOOD_STREET_LAMPS) lamp(l.x, l.y * T + l.bottomOffset);
  for (const l of PARK_LAMPS) lamp(l.x, (l.y + 1) * T);
  for (const p of NEIGHBORHOOD_PROPS) if (p.solid && !p.lotId) add(p.solid.x, p.solid.y, p.solid.width, p.solid.height);
  return out;
})();

/** Hộp chặn gắn với một nhà trang trí (thân nhà + đồ vật trước nhà); bỏ qua khi nhà bị ẩn bởi đợt khai hoang. */
export const NEIGHBORHOOD_LOT_OBSTACLES: ReadonlyArray<WorldBox & { lotId: string }> = (() => {
  const out: Array<WorldBox & { lotId: string }> = [];
  for (const lot of NEIGHBORHOOD_LOTS) {
    const bottom = lot.frontY * T + 4;
    const h = lotHeightPx(lot);
    out.push({ x: lot.x * T, y: bottom - h, width: lot.w * T, height: h - 6, lotId: lot.id });
  }
  for (const p of NEIGHBORHOOD_PROPS) if (p.solid && p.lotId) out.push({ ...p.solid, lotId: p.lotId });
  return out;
})();

/** Hộp (chân nhân vật) vượt ra ngoài vùng khu phố đi được. */
export const isOutsideNeighborhood = (box: WorldBox): boolean =>
  box.x < NEIGHBORHOOD_WALK_BOUNDS.x0 || box.y < NEIGHBORHOOD_WALK_BOUNDS.y0
  || box.x + box.width > NEIGHBORHOOD_WALK_BOUNDS.x1 || box.y + box.height > NEIGHBORHOOD_WALK_BOUNDS.y1;

/** Hộp chạm vật cản khu phố hoặc ra ngoài vùng đi được. */
export function hitsNeighborhood(box: WorldBox, hiddenLotIds?: ReadonlySet<string>): boolean {
  if (isOutsideNeighborhood(box)) return true;
  for (const o of NEIGHBORHOOD_LOT_OBSTACLES) {
    if (hiddenLotIds?.has(o.lotId)) continue;
    if (box.x < o.x + o.width && box.x + box.width > o.x && box.y < o.y + o.height && box.y + box.height > o.y) return true;
  }
  for (const o of NEIGHBORHOOD_OBSTACLES) {
    if (box.x < o.x + o.width && box.x + box.width > o.x && box.y < o.y + o.height && box.y + box.height > o.y) return true;
  }
  return false;
}
