import type { Lot } from './freshness';
import { productById, unlockedProducts } from './products';
import { REGULARS, type RegularProgress } from './regulars';

/** Nhà hàng xóm dọc hẻm: nơi khách gọi điện đặt hàng giao tận cửa. */
export interface NeighborHouse {
  id: string;
  name: string;
  /** Tâm nhà (toạ độ thế giới); cửa ở mặt trước, hướng ra đường. */
  x: number;
  z: number;
  wallColor: number;
  roofColor: number;
}

export const HOUSE_SIZE = 5;

export const NEIGHBOR_HOUSES: NeighborHouse[] = [
  { id: 'nha_12', name: 'Nhà số 12', x: -21, z: -2, wallColor: 0xf3d9b1, roofColor: 0x6d4c41 },
  { id: 'nha_14', name: 'Nhà số 14', x: -28, z: -2, wallColor: 0xcfe3c8, roofColor: 0x2e7d32 },
  { id: 'nha_21', name: 'Nhà số 21', x: 20, z: -2, wallColor: 0xd7e3f0, roofColor: 0x1565c0 },
  { id: 'nha_23', name: 'Nhà số 23', x: 27, z: -2, wallColor: 0xf6d5d5, roofColor: 0xad1457 },
  { id: 'nha_25', name: 'Nhà số 25', x: 34, z: -2, wallColor: 0xfff0b3, roofColor: 0xef6c00 },
];

export const houseById = (id: string) => NEIGHBOR_HOUSES.find((h) => h.id === id);
/** Chỗ đứng trước cửa nhà để giao hàng (ngoài bậc cửa, trên vỉa hè). */
export const houseDoor = (h: NeighborHouse) => ({ x: h.x, z: h.z + HOUSE_SIZE / 2 + 0.9 });

/** Người gọi khi chưa quen khách nào (hoặc khách quen chưa mở). */
const STRANGERS = ['Cô Hạnh', 'Anh Phúc', 'Chị Thu', 'Bác Lộc', 'Em Vy', 'Chú Sáu', 'Cô Diệu'];

/** Lý do gọi, để đơn có chút chuyện. */
const REASONS = ['nhà có khách bất ngờ', 'trời nóng lười ra đường', 'đang trông con nhỏ', 'nấu dở thì hết đồ', 'chân đau đi không tiện', 'đang họp online'];

/** Đơn gọi điện trong ngày (được lưu để không mất hàng đã soạn). */
export interface PhoneOrder {
  id: number;
  houseId: string;
  caller: string;
  /** Khách quen gọi thì giao xong được thêm thân thiết. */
  regular?: string;
  reason: string;
  items: Record<string, number>;
  /** Phút trong ngày: khách gọi, hết hạn nghe máy, và hẹn giao. */
  calledAt: number;
  answerBy: number;
  dueAt: number;
  /** ringing = đang đổ chuông; carrying = đã soạn hàng khỏi kho, đang mang đi. */
  status: 'ringing' | 'carrying';
  /** Lô đã lấy khỏi kho khi soạn hàng, để trả lại đúng hạn nếu khách huỷ. */
  lots?: Record<string, Lot[]>;
}

/** Khung giờ có thể có điện thoại (phút trong ngày) và mỗi khung tối đa một cuộc. */
export const PHONE_SLOTS = [8.5, 10, 11.5, 13, 15, 16.5, 18, 19.5, 21].map((h) => h * 60);
export const PHONE_UNLOCK = 3;
/** Không nghe máy sau chừng này phút thì khách cúp máy. */
export const ANSWER_MINUTES = 20;
/** Hẹn giao trong chừng này phút kể từ lúc gọi. */
export const DELIVERY_MINUTES = 75;
/** Trễ hẹn quá chừng này phút thì khách huỷ đơn, hàng mang về kho. */
export const CANCEL_AFTER_LATE = 45;
/** Giao kịp thì khách boa thêm phần trăm tiền hàng. */
export const ON_TIME_TIP = 0.15;
export const PHONE_FRIEND_GAIN = 3;

function roll(seed: number, day: number, salt: number) {
  let h = Math.imul((seed >>> 0) ^ (day * 2654435761), 2246822519) ^ salt;
  h ^= h >>> 13;
  h = Math.imul(h, 3266489917);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Cuộc gọi ở khung giờ `slot` (chỉ số trong PHONE_SLOTS) hôm nay, nếu có. Tất định theo hạt giống ván.
 * Cấp càng cao càng hay có người gọi; khách quen đã mở hay gọi hơn người lạ và mua món mình thích.
 */
export function phoneCallFor(
  seed: number, day: number, slot: number, level: number, regulars: Record<string, RegularProgress>, id: number,
): PhoneOrder | null {
  if (level < PHONE_UNLOCK) return null;
  const chance = Math.min(0.65, 0.3 + level * 0.01);
  if (roll(seed, day, 101 + slot) > chance) return null;
  const known = REGULARS.filter((r) => r.unlock <= level && (regulars[r.id]?.friendship ?? 0) > 0);
  const regular = known.length && roll(seed, day, 211 + slot) < 0.5 ? known[Math.floor(roll(seed, day, 307 + slot) * known.length)] : undefined;
  const pool = unlockedProducts(level).filter((p) => p.category !== 'frozen');
  const favorites = regular ? regular.favorites.filter((id) => pool.some((p) => p.id === id)) : [];
  const lines = 2 + Math.floor(roll(seed, day, 401 + slot) * 2);
  const items: Record<string, number> = {};
  for (let i = 0; i < lines; i++) {
    const r = roll(seed, day, 503 + slot * 7 + i);
    const id = i === 0 && favorites.length ? favorites[Math.floor(r * favorites.length)] : pool[Math.floor(r * pool.length)]?.id;
    if (id) items[id] = (items[id] ?? 0) + 1 + Math.floor(roll(seed, day, 601 + slot * 7 + i) * 3);
  }
  if (!Object.keys(items).length) return null;
  const house = NEIGHBOR_HOUSES[Math.floor(roll(seed, day, 701 + slot) * NEIGHBOR_HOUSES.length)];
  const calledAt = PHONE_SLOTS[slot];
  return {
    id, houseId: house.id,
    caller: regular?.name ?? STRANGERS[Math.floor(roll(seed, day, 809 + slot) * STRANGERS.length)],
    regular: regular?.id,
    reason: REASONS[Math.floor(roll(seed, day, 907 + slot) * REASONS.length)],
    items, calledAt, answerBy: calledAt + ANSWER_MINUTES, dueAt: calledAt + DELIVERY_MINUTES, status: 'ringing',
  };
}

/** Tiền hàng theo giá đang bán của tiệm. */
export const phoneOrderValue = (o: PhoneOrder, priceOf: (id: string) => number) =>
  Object.entries(o.items).reduce((n, [id, q]) => n + priceOf(id) * q, 0);

export const describeItems = (items: Record<string, number>) =>
  Object.entries(items).map(([id, q]) => `${q} ${productById(id).name}`).join(', ');
