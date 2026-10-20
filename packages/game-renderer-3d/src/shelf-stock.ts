import type { StoreFixture } from '@game/shared';
import { fixtureLocalToWorld } from './fixture-shapes';

/** Một ô vuông đứng (icon sản phẩm hoặc biển) trong thế giới 3D: tâm, hướng "phải" của mặt trước (rx, rz) và kích thước. */
export interface StockQuad {
  /** Mã sản phẩm; `null` = biển "HẾT". */
  productId: string | null;
  cx: number; cy: number; cz: number;
  /** Vector đơn vị ứng với trục x cục bộ của fixture, chiếu xuống mặt đất. */
  rx: number; rz: number;
  w: number; h: number;
}

type Fix = Pick<StoreFixture, 'type' | 'tileX' | 'tileY' | 'widthTiles' | 'heightTiles' | 'rotation'>;
export type StockSlot = Pick<StoreFixture, 'assignedProductId' | 'currentStock'>;

/** Độ cao mặt ván các tầng (khớp fixture-shapes: kệ có ván ở 0.1/0.5/0.9; tủ lạnh dùng cùng mốc). */
export const TIER_Y = [0.13, 0.53, 0.93] as const;
const MAX_ICONS_PER_CELL = 3;
const MAX_ICON = 0.3;
const MIN_ICON_GAP = 0.14;

/** Số icon hiện trong một ô hàng: tỉ lệ với tồn/sức chứa, còn hàng thì ít nhất 1, hết hàng thì 0. */
export function iconCount(stock: number, limit: number, maxIcons: number): number {
  if (stock <= 0 || limit <= 0) return 0;
  return Math.max(1, Math.min(maxIcons, Math.round((maxIcons * stock) / limit)));
}

/**
 * Icon hàng trên mặt trước các tầng của một kệ/tủ mát. `slots` là kệ gốc rồi các ô phụ (thứ tự `syncSlotChildren`);
 * `limitOf(i)` là sức chứa hiệu dụng ô `i`. Ô xếp theo hàng: tầng thấp trước, mỗi ô là một cột rộng bằng nhau.
 */
export function shelfStockQuads(
  fix: Fix,
  slots: readonly StockSlot[],
  limitOf: (index: number) => number,
): StockQuad[] {
  const tiers = TIER_Y.length;
  const cols = Math.max(1, Math.ceil(slots.length / tiers));
  const usable = fix.widthTiles - 0.16;
  const cellW = usable / cols;
  const perCell = Math.max(1, Math.min(MAX_ICONS_PER_CELL, Math.floor(cellW / MIN_ICON_GAP)));
  const size = Math.min(MAX_ICON, cellW / perCell);
  const frontZ = fix.type === 'refrigerator' ? fix.heightTiles / 2 + 0.03 : fix.heightTiles * 0.4;
  const right = fixtureLocalToWorld(fix, 1, 0);
  const origin = fixtureLocalToWorld(fix, 0, 0);
  const rx = right.x - origin.x;
  const rz = right.z - origin.z;
  const out: StockQuad[] = [];
  slots.forEach((slot, i) => {
    const productId = slot.assignedProductId;
    if (!productId) return;
    const n = iconCount(slot.currentStock, limitOf(i), perCell);
    if (n === 0) return;
    const tier = Math.min(tiers - 1, Math.floor(i / cols));
    const col = i % cols;
    const cellCenter = -usable / 2 + (col + 0.5) * cellW;
    for (let k = 0; k < n; k++) {
      const lx = cellCenter + (k - (perCell - 1) / 2) * size;
      const p = fixtureLocalToWorld(fix, lx, frontZ);
      out.push({ productId, cx: p.x, cy: TIER_Y[tier] + size / 2, cz: p.z, rx, rz, w: size, h: size });
    }
  });
  return out;
}

/** Biển "HẾT" nhỏ ở giữa mặt trước kệ/tủ (tầng giữa). */
export function soldOutSignQuad(fix: Fix): StockQuad {
  const right = fixtureLocalToWorld(fix, 1, 0);
  const origin = fixtureLocalToWorld(fix, 0, 0);
  const p = fixtureLocalToWorld(fix, 0, fix.type === 'refrigerator' ? fix.heightTiles / 2 + 0.04 : fix.heightTiles * 0.46);
  return { productId: null, cx: p.x, cy: 0.78, cz: p.z, rx: right.x - origin.x, rz: right.z - origin.z, w: Math.min(0.6, fix.widthTiles * 0.4), h: Math.min(0.6, fix.widthTiles * 0.4) / 2 };
}

/** Biển "HẾT" đặt giữa mặt nam của quầy vỉa hè (`stall`: ô góc trên-trái và bề rộng ô). */
export function stallSignQuad(stall: { tileX: number; tileY: number; widthTiles: number }): StockQuad {
  return { productId: null, cx: stall.tileX + stall.widthTiles / 2, cy: 1.15, cz: stall.tileY + 0.95, rx: 1, rz: 0, w: 0.7, h: 0.35 };
}
