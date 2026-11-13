/**
 * Thiết bị trạm nấu 5 bậc (Cũ → Cao cấp). Bậc 1 = máy hiện có, KHÔNG đổi gì (golden giữ nguyên);
 * chỉ người chơi bấm nâng mới lên bậc 2–5 nên mô phỏng không chạm tới.
 * Bậc cao nấu nhanh hơn nhưng ngốn điện: tổng công suất vượt hạn mức theo cấp tiệm thì chỉ bị PHỤ PHÍ
 * điện cuối ngày (không cắt điện, không chặn trạm).
 * Chỉ nâng khi tiệm đóng cửa (shopOpen = false).
 */
import type { BizState } from './biz';

export type EquipId = 'fryer' | 'food_grill' | 'steamer';
export type EquipTier = 1 | 2 | 3 | 4 | 5;

export const EQUIP_TIER_NAME: Record<EquipTier, string> = { 1: 'Cũ', 2: 'Phổ thông', 3: 'Cải tiến', 4: 'Chuyên nghiệp', 5: 'Cao cấp' };

export interface EquipDef { id: EquipId; icon: string; name: string }
export const EQUIPMENT: EquipDef[] = [
  { id: 'fryer', icon: '🍟', name: 'Chảo chiên' },
  { id: 'food_grill', icon: '🔥', name: 'Bếp nướng' },
  { id: 'steamer', icon: '♨️', name: 'Nồi hấp' },
];

/** Chỉ số theo bậc (dùng chung cho cả ba trạm): tốc độ nấu, công suất điện (kW), giá nâng LÊN bậc đó, cấp mở. */
export const EQUIP_TIERS: Record<EquipTier, { speed: number; kw: number; price: number; unlock: number }> = {
  1: { speed: 1, kw: 1, price: 0, unlock: 1 },
  2: { speed: 1.1, kw: 1.5, price: 600_000, unlock: 20 },
  3: { speed: 1.2, kw: 2.5, price: 1_800_000, unlock: 30 },
  4: { speed: 1.35, kw: 4, price: 5_000_000, unlock: 45 },
  5: { speed: 1.5, kw: 6, price: 12_000_000, unlock: 60 },
};

/** Hạn mức điện (kW) theo cấp tiệm: đủ để mỗi trạm lên khoảng bậc 2–3 ở giữa game. */
export const powerCapacity = (level: number) => 4 + Math.floor(level / 5);
/** Phụ phí mỗi kW vượt hạn mức mỗi ngày. */
export const POWER_OVER_FEE = 15_000;

export const equipTier = (b: Pick<BizState, 'equip'> | undefined, id: EquipId): EquipTier => (b?.equip?.[id] ?? 1) as EquipTier;
export const isEquipStation = (s: string): s is EquipId => EQUIPMENT.some((e) => e.id === s);

/** Hệ số tốc độ cho mẻ ở trạm `station` (1 nếu chưa nâng/không phải trạm có bậc). */
export const equipSpeed = (b: Pick<BizState, 'equip'> | undefined, station: string): number =>
  isEquipStation(station) ? EQUIP_TIERS[equipTier(b, station)].speed : 1;

/** Tổng công suất đang dùng (kW) của các trạm có bậc. */
export const powerUsed = (b: Pick<BizState, 'equip'> | undefined): number =>
  EQUIPMENT.reduce((n, e) => n + EQUIP_TIERS[equipTier(b, e.id)].kw, 0);

/** Phụ phí điện hôm nay do vượt hạn mức (bậc 1 hết: 3kW < hạn mức tối thiểu 4kW nên luôn 0). */
export const powerSurcharge = (b: Pick<BizState, 'equip'> | undefined, level: number): number =>
  Math.round(Math.max(0, powerUsed(b) - powerCapacity(level)) * POWER_OVER_FEE);

export type EquipBlock = 'max' | 'level' | 'money' | 'open' | null;
export function equipBlock(b: Pick<BizState, 'equip'> | undefined, id: EquipId, level: number, money: number, shopOpen: boolean): EquipBlock {
  const t = equipTier(b, id);
  if (t >= 5) return 'max';
  const next = EQUIP_TIERS[(t + 1) as EquipTier];
  if (level < next.unlock) return 'level';
  if (shopOpen) return 'open';
  return money < next.price ? 'money' : null;
}
