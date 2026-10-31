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
  { id: 'hem', name: 'Hẻm đầu ngõ', icon: '🏘️', unlock: 1, cost: 0, bounds: { x1: -40, z1: -40, x2: 80, z2: 40 }, desc: 'Hẻm nhà mình: tạp hoá, quán nước, tiệm xôi' },
  { id: 'ngo2', name: 'Ngõ 2', icon: '🛤️', unlock: 45, cost: 50_000_000, bounds: { x1: -40, z1: -110, x2: 80, z2: -40 }, desc: 'Ngõ mới phía bắc: lô đất trống, chỗ cho sạp hàng rong' },
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
