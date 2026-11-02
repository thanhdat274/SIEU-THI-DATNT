import { LANE_X } from './branches';

/**
 * Khu bản đồ (GĐ497, bước 1 "mở rộng bản đồ" kiểu Cities: Skylines 2): thị trấn chia thành các khu mở
 * dần theo cấp + tiền. Khu "hem" (hẻm đầu tiên) luôn mở; các khu sau mở bằng `openZone` (bước 2+).
 * Chỉ dữ liệu thuần, xác định; save lưu `biz.zones?` (danh sách id đã mở, tuỳ chọn — save cũ = chỉ hẻm).
 */
export interface Zone {
  id: string;
  name: string;
  icon: string;
  /** Cấp tối thiểu để mở. */
  unlock: number;
  /** Tiền mở khu (0 = có sẵn). */
  cost: number;
  /** Ranh giới thế giới (x1, z1) – (x2, z2). */
  bounds: { x1: number; z1: number; x2: number; z2: number };
  /** Mô tả ngắn cho bảng mở khu (≤90 ký tự). */
  desc: string;
}

export const ZONES: Zone[] = [
  { id: 'hem', name: 'Hẻm đầu ngõ', icon: '🏘️', unlock: 1, cost: 0, bounds: { x1: -80, z1: -80, x2: 80, z2: 80 }, desc: 'Hẻm nhà mình: tạp hoá, quán nước, tiệm xôi' },
  { id: 'ngo2', name: 'Ngõ 2', icon: '🛤️', unlock: 45, cost: 50_000_000, bounds: { x1: 80, z1: -40, x2: 120, z2: 40 }, desc: 'Ngõ mới phía đông nối đường chính: lô trống, chỗ cho sạp hàng rong' },
];

/** Mốc chính trên bản đồ khu phố (GĐ505/506, toạ độ thế giới). */
export const MAP_LANDMARKS = [
  { icon: '🏠', name: 'Nhà', x: -12, z: -2 },
  { icon: '🏪', name: 'Tạp hoá', x: 0, z: -6 },
  { icon: '🍚', name: 'Tiệm xôi', x: LANE_X - 4, z: -1 },
  { icon: '🧋', name: 'Quán nước', x: LANE_X + 4.4, z: -1 },
  { icon: '🌾', name: 'Nông trại', x: 24, z: -70 },
  { icon: '🏬', name: 'Cửa hàng tiện lợi', x: 60, z: -64 },
];

export const zoneById = (id: string) => ZONES.find((z) => z.id === id);

/** Danh sách khu đã mở (luôn gồm hẻm đầu, bỏ id lạ/trùng). */
export function openZones(saved: readonly string[] | undefined): string[] {
  const out = ['hem'];
  for (const id of saved ?? []) if (zoneById(id) && !out.includes(id)) out.push(id);
  return out;
}

/** Khu chứa điểm (x, z) — null nếu ngoài mọi khu. */
export const zoneAt = (x: number, z: number) =>
  ZONES.find((zn) => x >= zn.bounds.x1 && x < zn.bounds.x2 && z >= zn.bounds.z1 && z < zn.bounds.z2) ?? null;

export type ZoneOpenCheck = 'ok' | 'opened' | 'level' | 'money' | 'unknown';

/** Kiểm tra mở được khu không (chưa đổi state). */
export function canOpenZone(id: string, saved: readonly string[] | undefined, level: number, money: number): ZoneOpenCheck {
  const z = zoneById(id);
  if (!z) return 'unknown';
  if (openZones(saved).includes(id)) return 'opened';
  if (level < z.unlock) return 'level';
  if (money < z.cost) return 'money';
  return 'ok';
}

export interface Rect { x1: number; z1: number; x2: number; z2: number }

/**
 * Vùng cấm đi (GĐ500): phần lưới ±extent không thuộc khu đã mở, chia theo lưới toạ độ ranh giới khu.
 * Khu chưa mở thành tường vô hình; mở khu thì bỏ chặn.
 */
export function zoneBlockRects(saved: readonly string[] | undefined, extent = 120): Rect[] {
  const open = openZones(saved).map((id) => zoneById(id)!.bounds);
  const xs = [...new Set([-extent, extent, ...ZONES.flatMap((z) => [z.bounds.x1, z.bounds.x2])])].sort((a, b) => a - b);
  const zs = [...new Set([-extent, extent, ...ZONES.flatMap((z) => [z.bounds.z1, z.bounds.z2])])].sort((a, b) => a - b);
  const out: Rect[] = [];
  for (let i = 0; i + 1 < xs.length; i++) for (let j = 0; j + 1 < zs.length; j++) {
    const cx = (xs[i] + xs[i + 1]) / 2, cz = (zs[j] + zs[j + 1]) / 2;
    if (!open.some((b) => cx >= b.x1 && cx < b.x2 && cz >= b.z1 && cz < b.z2)) out.push({ x1: xs[i], z1: zs[j], x2: xs[i + 1], z2: zs[j + 1] });
  }
  return out;
}

export interface ZoneMapCell { zone: Zone; state: 'open' | ZoneOpenCheck }

/** GĐ504: dữ liệu bản đồ thu nhỏ — mỗi khu kèm trạng thái (mở / còn thiếu cấp / thiếu tiền / mở được). */
export function zoneMapView(saved: readonly string[] | undefined, level: number, money: number): ZoneMapCell[] {
  return ZONES.map((zone) => {
    const c = canOpenZone(zone.id, saved, level, money);
    return { zone, state: c === 'opened' ? 'open' : c };
  });
}
