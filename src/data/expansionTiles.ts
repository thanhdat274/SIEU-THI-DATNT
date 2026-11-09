import { SHOP_FRONT_Z, SHOP_TIERS } from './shopTiers';

/**
 * GĐ1944 — Mở rộng từng ô tiếp giáp (siêu thị phase 2, đóng #10 Midnight / #7 Xóm).
 *
 * CHỒNG lên hệ bậc nguyên khối (không thay thế): chỉ khi tiệm đã ở bậc cuối (Đại siêu thị) mới mua thêm
 * "ô mở rộng". Mỗi ô là một dải sâu 1 m, rộng trọn mặt tiền, nối liền vào tường sau của khuôn hiện tại
 * (mặt tiền giữ nguyên — cùng cách nới như nâng bậc, đồ đạc dời theo để đứng đúng chỗ cũ). Nhà ở bên trái
 * (x −15..−9) và nhà số 21 bên phải chắn hai cạnh, nên chỉ có phía sau là tiếp giáp được.
 *
 * Giá theo công thức Xóm đã chốt `đơn vị·k·(k+1)` (k = số thứ tự ô sắp mua); đơn vị nhân lên cho khớp
 * thang tiền cuối game (bậc Đại siêu thị 52tr): ô 1 = 2tr … ô 6 = 42tr.
 */
export const EXPANSION_UNIT = 1_000_000;
export const EXPANSION_TILE_CAP = 6;
/** Mỗi ô nới chiều sâu tiệm thêm chừng này (m). */
export const EXPANSION_TILE_DEPTH = 1;
export const MAX_SHOP_TIER = SHOP_TIERS.length - 1;

/** Giá ô thứ k (1-based). */
export const expansionTilePrice = (k: number) => EXPANSION_UNIT * k * (k + 1);

/** Khuôn tiệm thực tế: bậc + số ô mở rộng (ô chỉ tính khi đã ở bậc cuối). */
export function shopFootprint(tier: number, extraTiles = 0): { width: number; depth: number } {
  const t = SHOP_TIERS[tier];
  const extra = tier >= MAX_SHOP_TIER ? Math.max(0, Math.min(EXPANSION_TILE_CAP, extraTiles)) : 0;
  return { width: t.width, depth: t.depth + extra * EXPANSION_TILE_DEPTH };
}

/** Khuôn sâu nhất có thể (để chừa đất quanh tiệm: cây, đạo cụ). */
export const maxShopFootprint = () => shopFootprint(MAX_SHOP_TIER, EXPANSION_TILE_CAP);

/** Hình chữ nhật (toạ độ thế giới, trục z) của ô thứ k: dải [zBack, zFront], rộng trọn mặt tiền. */
export function expansionTileRect(k: number): { zBack: number; zFront: number; width: number } {
  const base = SHOP_TIERS[MAX_SHOP_TIER];
  const zFront = SHOP_FRONT_Z - base.depth - (k - 1) * EXPANSION_TILE_DEPTH;
  return { zFront, zBack: zFront - EXPANSION_TILE_DEPTH, width: base.width };
}

/** Ô thứ k tiếp giáp khuôn đã có k−1 ô: mép trước ô trùng tường sau khuôn hiện tại, cùng bề rộng. */
export function isContiguous(k: number): boolean {
  if (k < 1) return false;
  const cur = shopFootprint(MAX_SHOP_TIER, k - 1);
  const r = expansionTileRect(k);
  return Math.abs(r.zFront - (SHOP_FRONT_Z - cur.depth)) < 1e-9 && r.width === cur.width;
}

/** Lý do không mua được ô kế tiếp (null = mua được, chưa xét tiền). */
export function expansionBlock(tier: number, extraTiles: number): string | null {
  if (tier < MAX_SHOP_TIER) return `Cần lên ${SHOP_TIERS[MAX_SHOP_TIER].name} trước`;
  if (extraTiles >= EXPANSION_TILE_CAP) return 'Đã mở hết ô mở rộng';
  return null;
}
