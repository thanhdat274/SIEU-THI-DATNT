/**
 * Vị trí kệ trong tiệm quyết định hàng được khách để ý bao nhiêu (B4 — bố cục có ý nghĩa).
 * Toàn bộ hàm thuần, dùng hệ toạ độ của Furniture (gốc giữa sàn, +z về phía cửa).
 */
import type { Furniture } from '../core/store';
import { furnitureDef } from './furniture';
import { productById, type Category } from './products';

/** Hình dáng tiệm cần để tính vị trí: cửa vào ở (0, depth/2), các chỗ trả tiền của quầy thu ngân. */
export interface ShopGeom {
  width: number;
  depth: number;
  paySpots: { x: number; z: number }[];
}

/** Kệ/tủ bày được hàng: mới có ý nghĩa về vị trí trưng bày. */
export const isDisplay = (f: Furniture) => furnitureDef(f.type).tiers > 0;

/** Khoảng cách từ điểm tới đoạn thẳng. */
function distToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

/**
 * Độ được để ý 0.25–1 của một điểm trong tiệm: gần cửa vào thì ai đi ngang cũng thấy,
 * sát tuyến đi chính (cửa → quầy thu ngân) thì dễ rơi vào tầm mắt; góc sâu cuối tiệm khuất nhất.
 * Chênh lệch đầu–cuối ~4 lần: kệ khuất vẫn bán được, chỉ là ít khách hỏi tới.
 */
export function spotVisibility(x: number, z: number, geom: ShopGeom): number {
  const diag = Math.hypot(geom.width / 2, geom.depth);
  const dDoor = Math.hypot(x, geom.depth / 2 - z) / diag;
  const main = geom.paySpots[0] ?? { x: 0, z: 0 };
  const dAisle = Math.min(distToSegment(x, z, 0, geom.depth / 2, main.x, main.z) / (diag / 2), 1);
  return clamp(1.05 - 0.55 * dDoor - 0.3 * dAisle, 0.25, 1);
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Nhãn đọc nhanh cho UI sắp xếp. */
export function visibilityLabel(v: number): string {
  if (v >= 0.7) return '🔥 Đắc địa — ai vào cũng thấy';
  if (v >= 0.45) return '🆗 Tạm được';
  return '🕯️ Khuất — ít khách để ý';
}

/** Độ được để ý của từng kệ đang bày hàng. */
export function shelfAttention(list: Furniture[], geom: ShopGeom): Map<number, number> {
  const out = new Map<number, number>();
  for (const f of list) if (isDisplay(f)) out.set(f.uid, spotVisibility(f.x, f.z, geom));
  return out;
}

// ──────────────────────────────────────────────
// Tầng kệ: hàng ngang tầm mắt dễ được chú ý, hàng sát sàn khó
// ──────────────────────────────────────────────

/** Hàng ngang tầm mắt được để ý thêm chừng này; hàng sát sàn bị bớt (kệ từ 3 tầng trở lên). */
export const EYE_LEVEL_BONUS = 1.25;
export const FLOOR_LEVEL_PENALTY = 0.85;

/** Tầng (đếm từ dưới lên, từ 0) ngang tầm mắt của kệ `rows` tầng; -1 nếu kệ quá thấp để phân biệt. */
export const eyeRow = (rows: number) => (rows >= 3 ? Math.round((rows - 1) * 0.6) : -1);

/** Hệ số để ý của một tầng: ngang tầm mắt cao nhất, sát sàn thấp nhất. */
export function rowFactor(row: number, rows: number): number {
  if (rows < 3) return 1;
  if (row === eyeRow(rows)) return EYE_LEVEL_BONUS;
  return row === 0 ? FLOOR_LEVEL_PENALTY : 1;
}

/** Mỗi món đang bày được để ý bao nhiêu: lấy chỗ dễ thấy nhất (kệ dễ thấy × tầng ngang tầm mắt) đang bày món đó. */
export function stockedAttention(list: Furniture[], geom: ShopGeom): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of list) {
    if (!isDisplay(f) || f.broken) continue;
    const v = spotVisibility(f.x, f.z, geom);
    const def = furnitureDef(f.type);
    f.tiers.forEach((t, i) => {
      if (!t.productId || t.count <= 0) return;
      const a = v * rowFactor(Math.floor(i / Math.max(def.slots, 1)), def.tiers);
      if (a > (out[t.productId] ?? 0)) out[t.productId] = a;
    });
  }
  return out;
}

// ──────────────────────────────────────────────
// Hiệu suất kệ: lời trên mỗi m² mỗi ngày
// ──────────────────────────────────────────────

/** Lời tích luỹ của một kệ từ ngày `since` (ngày đầu tiên kệ bán được hàng). */
export interface ShelfPerf { profit: number; since: number }

export interface ShelfEfficiency {
  uid: number;
  type: Furniture['type'];
  /** Diện tích sàn (m²). */
  area: number;
  profit: number;
  days: number;
  /** Lời trên mỗi m² mỗi ngày. */
  perM2Day: number;
}

/** Xếp các kệ đã có doanh số theo lời trên m² mỗi ngày (cao nhất trước). */
export function shelfEfficiency(list: Furniture[], perf: Record<number, ShelfPerf>, day: number): ShelfEfficiency[] {
  const out: ShelfEfficiency[] = [];
  for (const f of list) {
    const p = perf[f.uid];
    if (!isDisplay(f) || !p) continue;
    const [w, d] = furnitureDef(f.type).size;
    const area = w * d;
    const days = Math.max(1, day - p.since + 1);
    out.push({ uid: f.uid, type: f.type, area, profit: p.profit, days, perM2Day: p.profit / days / area });
  }
  return out.sort((a, b) => b.perM2Day - a.perM2Day);
}

/** Chọn một phần tử theo trọng số (tổng trọng số không cần bằng 1). */
export function weightedPick<T>(items: readonly T[], weight: (item: T) => number, rand: () => number): T {
  const ws = items.map((it) => Math.max(weight(it), 0));
  const roll = rand() * ws.reduce((n, w) => n + w, 0);
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    acc += ws[i];
    if (roll < acc) return items[i];
  }
  return items[items.length - 1];
}

// ──────────────────────────────────────────────
// Hàng chớp nhoáng cạnh quầy thu ngân
// ──────────────────────────────────────────────

/** Món nhỏ đủ "nhét túi": giá gợi ý không quá con số này. */
export const IMPULSE_MAX_PRICE = 15000;
/** Ngành hàng dễ mua kẹp thêm: kẹo bánh, nước — không ai vớt gạo khi đứng chờ. */
export const IMPULSE_CATEGORIES: readonly Category[] = ['dry', 'drink'];
/** Kệ cách chỗ trả tiền bao xa thì khách với tay lấy được. */
export const IMPULSE_RADIUS = 2.2;
const IMPULSE_BASE = 0.2;
const IMPULSE_PER_WAIT = 0.09;
const IMPULSE_MAX = 0.55;

/** Xếp hàng càng lâu càng buồn tay: tỉ lệ với thêm một món nhỏ quanh quầy. */
export const impulseChance = (queueAhead: number) => Math.min(IMPULSE_BASE + IMPULSE_PER_WAIT * queueAhead, IMPULSE_MAX);

/** Một lựa chọn hàng chớp nhoáng: món này ở kệ nào, cách quầy bao xa. */
export interface ImpulseOption { uid: number; productId: string }

/** Các món nhỏ đang bày trong tầm với quanh một chỗ trả tiền (kệ hỏng không tính). */
export function impulseOptions(list: Furniture[], pay: { x: number; z: number }): ImpulseOption[] {
  const out: ImpulseOption[] = [];
  for (const f of list) {
    if (!isDisplay(f) || f.broken) continue;
    if (Math.hypot(f.x - pay.x, f.z - pay.z) > IMPULSE_RADIUS) continue;
    for (const t of f.tiers) {
      if (!t.productId || t.count <= 0) continue;
      const p = productById(t.productId);
      if (!IMPULSE_CATEGORIES.includes(p.category) || p.sell > IMPULSE_MAX_PRICE) continue;
      out.push({ uid: f.uid, productId: t.productId });
    }
  }
  return out;
}

/** Món càng rẻ càng dễ bị vớ theo: kẹo 3k hấp dẫn hơn bánh 12k. */
export const impulseWeight = (productId: string) => IMPULSE_MAX_PRICE / Math.max(productById(productId).sell, 1000);

/** Màu tô heatmap theo cường độ 0–1: xanh lạnh (ế) → vàng → đỏ (bán chạy). */
export const heatColor = (t: number) => `hsl(${Math.round((1 - clamp(t, 0, 1)) * 200)}, 85%, ${58 - Math.round(clamp(t, 0, 1) * 8)}%)`;
