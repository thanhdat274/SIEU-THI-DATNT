/**
 * Thiết bị trạm nấu 5 bậc (Cũ → Cao cấp). Bậc 1 = máy hiện có, KHÔNG đổi gì (golden giữ nguyên);
 * chỉ người chơi bấm nâng mới lên bậc 2–5 nên mô phỏng không chạm tới.
 * Bậc cao nấu nhanh hơn nhưng ngốn điện: tổng công suất vượt hạn mức theo cấp tiệm thì chỉ bị PHỤ PHÍ
 * điện cuối ngày (không cắt điện, không chặn trạm).
 * Chỉ nâng khi tiệm đóng cửa (shopOpen = false).
 */
import type { BizState } from './biz';

export type EquipId = 'fryer' | 'food_grill' | 'steamer' | 'hot_kettle' | 'rice_station' | 'blender' | 'drink_counter';
export type EquipTier = 1 | 2 | 3 | 4 | 5;

export const EQUIP_TIER_NAME: Record<EquipTier, string> = { 1: 'Cũ', 2: 'Phổ thông', 3: 'Cải tiến', 4: 'Chuyên nghiệp', 5: 'Cao cấp' };

export interface EquipDef { id: EquipId; icon: string; name: string }
export const EQUIPMENT: EquipDef[] = [
  { id: 'fryer', icon: '🍟', name: 'Chảo chiên' },
  { id: 'food_grill', icon: '🔥', name: 'Bếp nướng' },
  { id: 'steamer', icon: '♨️', name: 'Nồi hấp' },
  { id: 'hot_kettle', icon: '🍲', name: 'Nồi luộc/kho' },
  { id: 'rice_station', icon: '🍚', name: 'Nồi cơm/xôi' },
  { id: 'blender', icon: '🥤', name: 'Máy xay' },
  { id: 'drink_counter', icon: '🧋', name: 'Quầy pha chế' },
];

/** Chỉ số theo bậc (dùng chung cho mọi trạm): tốc độ nấu, công suất điện (kW), giá nâng LÊN bậc đó, cấp mở. */
export const EQUIP_TIERS: Record<EquipTier, { speed: number; kw: number; price: number; unlock: number }> = {
  1: { speed: 1, kw: 1, price: 0, unlock: 1 },
  2: { speed: 1.1, kw: 1.5, price: 600_000, unlock: 20 },
  3: { speed: 1.2, kw: 2.5, price: 1_800_000, unlock: 30 },
  4: { speed: 1.35, kw: 4, price: 5_000_000, unlock: 45 },
  5: { speed: 1.5, kw: 6, price: 12_000_000, unlock: 60 },
};

/** Hạn mức nền (kW) theo cấp tiệm. */
export const basePowerCapacity = (level: number) => 8 + Math.floor(level / 5);

/** Nâng hạn mức điện (đồng hồ/đường dây): bậc 0 = mặc định. `bonus` = kW cộng thêm (cộng dồn từ bậc 0). Chỉ nâng khi đóng cửa. */
export const POWER_TIERS: { name: string; bonus: number; price: number; unlock: number }[] = [
  { name: 'Đồng hồ 1 pha', bonus: 0, price: 0, unlock: 1 },
  { name: 'Đồng hồ 1 pha 60A', bonus: 4, price: 500_000, unlock: 10 },
  { name: 'Điện 3 pha', bonus: 9, price: 1_500_000, unlock: 25 },
  { name: 'Điện 3 pha công suất lớn', bonus: 16, price: 4_000_000, unlock: 40 },
  { name: 'Trạm biến áp riêng', bonus: 26, price: 9_000_000, unlock: 55 },
];
export const powerTier = (b: Pick<BizState, 'powerTier'> | undefined): number => Math.min(POWER_TIERS.length - 1, b?.powerTier ?? 0);

/** Hạn mức điện (kW) = nền theo cấp + phần đã mua nâng thêm. */
export const powerCapacity = (level: number, b?: Pick<BizState, 'powerTier'>) => basePowerCapacity(level) + POWER_TIERS[powerTier(b)].bonus;

/** Công suất (kW) của đồ điện khác trong tiệm: đồ đặt ở tiệm (theo loại) và thiết bị lắp một lần. */
export const APPLIANCE_KW: Record<string, number> = { fridge: 0.4, freezer: 0.6, meat_counter: 0.5, vending_drink: 0.3 };
export const UPGRADE_KW: Record<string, number> = { camera: 0.1, pos: 0.1 };
/** Phụ phí mỗi kW vượt hạn mức mỗi ngày. */
export const POWER_OVER_FEE = 15_000;

export const equipTier = (b: Pick<BizState, 'equip'> | undefined, id: EquipId): EquipTier => (b?.equip?.[id] ?? 1) as EquipTier;
export const isEquipStation = (s: string): s is EquipId => EQUIPMENT.some((e) => e.id === s);

/** Hệ số tốc độ cho mẻ ở trạm `station` (1 nếu chưa nâng/không phải trạm có bậc). */
export const equipSpeed = (b: Pick<BizState, 'equip'> | undefined, station: string): number =>
  isEquipStation(station) ? EQUIP_TIERS[equipTier(b, station)].speed : 1;

type PowerBiz = Pick<BizState, 'equip' | 'powerTier' | 'upgrades'>;
type PowerFurniture = ReadonlyArray<{ type: string; trial?: boolean }>;

/** Tổng công suất đang dùng (kW): trạm nấu có bậc + đồ điện đặt ở tiệm (nếu truyền `furniture`) + camera/POS đã lắp. */
export const powerUsed = (b: PowerBiz | undefined, furniture?: PowerFurniture): number => {
  let kw = EQUIPMENT.reduce((n, e) => n + EQUIP_TIERS[equipTier(b, e.id)].kw, 0);
  for (const f of furniture ?? []) if (!f.trial) kw += APPLIANCE_KW[f.type] ?? 0;
  for (const u of b?.upgrades ?? []) kw += UPGRADE_KW[u] ?? 0;
  return Math.round(kw * 10) / 10;
};

/**
 * Hệ tiền điện chỉ "bật" khi người chơi đã tự đụng tới nó (nâng bậc một trạm hoặc nâng hạn mức):
 * người chơi/mô phỏng chưa nâng gì thì không bao giờ có phụ phí → golden không đổi.
 */
export const electricActive = (b: PowerBiz | undefined): boolean =>
  powerTier(b) > 0 || EQUIPMENT.some((e) => equipTier(b, e.id) > 1);

/** Phụ phí điện hôm nay do vượt hạn mức (0 nếu hệ điện chưa bật). */
export const powerSurcharge = (b: PowerBiz | undefined, level: number, furniture?: PowerFurniture): number =>
  electricActive(b) ? Math.round(Math.max(0, powerUsed(b, furniture) - powerCapacity(level, b)) * POWER_OVER_FEE) : 0;

export type PowerBlock = 'max' | 'level' | 'money' | 'open' | null;
export function powerBlock(b: Pick<BizState, 'powerTier'> | undefined, level: number, money: number, shopOpen: boolean): PowerBlock {
  const t = powerTier(b);
  if (t >= POWER_TIERS.length - 1) return 'max';
  const next = POWER_TIERS[t + 1];
  if (level < next.unlock) return 'level';
  if (shopOpen) return 'open';
  return money < next.price ? 'money' : null;
}

export type EquipBlock = 'max' | 'level' | 'money' | 'open' | null;
export function equipBlock(b: Pick<BizState, 'equip'> | undefined, id: EquipId, level: number, money: number, shopOpen: boolean): EquipBlock {
  const t = equipTier(b, id);
  if (t >= 5) return 'max';
  const next = EQUIP_TIERS[(t + 1) as EquipTier];
  if (level < next.unlock) return 'level';
  if (shopOpen) return 'open';
  return money < next.price ? 'money' : null;
}
