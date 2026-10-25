import type { Lot } from './freshness';
import { productById, unlockedProducts } from './products';
import { REGULARS, type RegularProgress } from './regulars';
import { SEASONAL_GOODS, offSeason } from './calendar';
import { COOK_UNLOCK, RECIPES, type CookingStation } from './recipes';
import type { Weather } from './weather';

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
const REASONS = ['nhà có khách bất ngờ', 'trời nóng lười ra đường', 'đang trông con nhỏ', 'nấu dở thì hết đồ', 'chân đau đi không tiện', 'đang họp online', 'trời mưa không tiện ra ngoài', 'mưa to cả nhà sợ ướt đồ'];

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
  /** Đơn nấu (món nhà làm): khách trả giá hời theo hệ số này; phải tự nấu, không nhập được ở mối nào. */
  premium?: number;
  /** Đơn VIP: khách quen giới thiệu người nhà đặt gói lớn, giá hời hơn hẳn. */
  vip?: boolean;
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
/** Giao ngay trong nửa đầu khung hẹn: boa gấp đôi (tiệm ăn nói "giao nhanh như tên lửa"). */
export const FAST_TIP = 0.3;
/** Nửa đầu khung hẹn tính từ lúc gọi. */
export const fastWindow = (o: PhoneOrder) => o.calledAt + DELIVERY_MINUTES / 2;
export const PHONE_FRIEND_GAIN = 3;

// ───── Đơn VIP: khách quen giới thiệu người nhà đặt gói lớn ─────

/** Danh tiếng từ mức này khách quen mới dám giới thiệu "mối lớn" cho tiệm. */
export const VIP_REP = 4.5;
/** Xác suất mỗi khung giờ có cuộc gọi VIP (≈ 2 đơn/tuần khi danh tiếng đủ). */
export const VIP_CHANCE = 0.03;
/** Giá hời của đơn VIP. */
export const VIP_MUL = 1.5;
/** Lý do của đơn VIP. */
const VIP_REASONS = [
  'công ty chị ấy tổ chức, đặt gói lớn giúp', 'nhà có giỗ, người nhà nhờ đặt một mớ',
  'chị rể mở tiệm bên kia hẻm, đặt luôn ở tiệm quen', 'họ hàng về quê, mua mang theo nguyên thùng',
];

// ───── Đơn nấu theo yêu cầu (món nhà làm) ─────

/** Có trạm nấu rồi thì chừng này cuộc gọi là đơn nấu món nhà làm. */
export const COOK_ORDER_CHANCE = 0.3;
/** Khách trả giá hời bấy nhiêu lần giá bán thường. */
export const COOK_ORDER_MUL = 1.3;
/** Đơn nấu cho nhiều giờ hơn để kịp đứng bếp: hẹn giao kể từ lúc gọi. */
export const COOK_ORDER_MINUTES = 240;
/** Lý do của đơn nấu. */
const COOK_REASONS = [
  'chiều nhà có khách, nấu giúp tôi ít món', 'sinh nhật thằng nhỏ, đặt thêm vài phần',
  'cả nhà đi chơi về muộn, không kịp nấu', 'bữa trưa cơm quan có người đặt thêm',
  'tiệc nhỏ trong hẻm, nhờ tiệm nấu lấy', 'thằng nhỏ đòi ăn món tiệm nấu suốt ngày',
];

function roll(seed: number, day: number, salt: number) {
  let h = Math.imul((seed >>> 0) ^ (day * 2654435761), 2246822519) ^ salt;
  h ^= h >>> 13;
  h = Math.imul(h, 3266489917);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Mưa ai cũng lười ra đường: ngày mưa gọi nhiều hơn, giông thì hơn nữa. */
export const weatherPhoneMul = (weather: Weather) => (weather === 'storm' ? 1.8 : weather === 'rain' ? 1.5 : 1);

/**
 * Cuộc gọi ở khung giờ `slot` (chỉ số trong PHONE_SLOTS) hôm nay, nếu có. Tất định theo hạt giống ván.
 * Cấp càng cao càng hay có người gọi; khách quen đã mở hay gọi hơn người lạ và mua món mình thích.
 * Đơn nghiêng về món tiệm đang có trong kho (~70%) cho đỡ ức chế; số còn lại là món lạ để vẫn có thử thách.
 * Có trạm nấu rồi thì một phần cuộc gọi là đơn nấu: món nhà làm, giá hời, phải tự đứng bếp.
 */
export function phoneCallFor(
  seed: number, day: number, slot: number, level: number, regulars: Record<string, RegularProgress>, id: number,
  weather: Weather = 'sunny', stocked: Record<string, number> = {},
  stations: CookingStation[] = [], rep: number = 0,
): PhoneOrder | null {
  if (level < PHONE_UNLOCK) return null;
  const chance = Math.min(0.65, (0.3 + level * 0.01) * weatherPhoneMul(weather));
  if (roll(seed, day, 101 + slot) > chance) return null;
  const known = REGULARS.filter((r) => r.unlock <= level && (regulars[r.id]?.friendship ?? 0) > 0);
  const regular = known.length && roll(seed, day, 211 + slot) < 0.5 ? known[Math.floor(roll(seed, day, 307 + slot) * known.length)] : undefined;
  const house = NEIGHBOR_HOUSES[Math.floor(roll(seed, day, 701 + slot) * NEIGHBOR_HOUSES.length)];
  const calledAt = PHONE_SLOTS[slot];
  const head = (items: Record<string, number>, premium?: number, dueAt = calledAt + DELIVERY_MINUTES): PhoneOrder => ({
    id, houseId: house.id,
    caller: regular?.name ?? STRANGERS[Math.floor(roll(seed, day, 809 + slot) * STRANGERS.length)],
    regular: regular?.id,
    reason: REASONS[Math.floor(roll(seed, day, 907 + slot) * REASONS.length)],
    items, calledAt, answerBy: calledAt + ANSWER_MINUTES, dueAt, status: 'ringing', premium,
  });
  // Đơn nấu: món nhà làm của trạm đang có trong tiệm, giá hời, đợi được lâu hơn để kịp nấu.
  // Món gắn dịp lễ (giỏ quà) chỉ được gọi trong đúng dịp — ngoài dịp khách cũng biết là không gói được.
  const cookable = RECIPES.filter((r) => r.unlock <= level && stations.includes(r.station) && !offSeason(r.outputId, day));
  if (level >= COOK_UNLOCK && cookable.length && roll(seed, day, 1009 + slot) < COOK_ORDER_CHANCE) {
    const r = cookable[Math.floor(roll(seed, day, 1103 + slot) * cookable.length)];
    const qty = 4 + Math.floor(roll(seed, day, 1201 + slot) * 7);
    const order = head({ [r.outputId]: qty }, COOK_ORDER_MUL, calledAt + COOK_ORDER_MINUTES);
    order.reason = COOK_REASONS[Math.floor(roll(seed, day, 1301 + slot) * COOK_REASONS.length)];
    return order;
  }
  const pool = unlockedProducts(level).filter((p) => p.category !== 'frozen' && !SEASONAL_GOODS.has(p.id));
  const inStock = pool.filter((p) => (stocked[p.id] ?? 0) > 0);
  const favorites = regular ? regular.favorites.filter((id) => pool.some((p) => p.id === id)) : [];
  // Đơn VIP: khách quen đủ thân giới thiệu "mối lớn" — gói 8–14 món một loại, giá hời ×1.5, hẹn lâu hơn chút
  if (regular && rep >= VIP_REP && roll(seed, day, 1409 + slot) < VIP_CHANCE) {
    const source = favorites.length ? favorites : inStock.length ? inStock.map((p) => p.id) : pool.map((p) => p.id);
    const id2 = source[Math.floor(roll(seed, day, 1501 + slot) * source.length)];
    const qty = 8 + Math.floor(roll(seed, day, 1601 + slot) * 7);
    const order = head({ [id2]: qty }, VIP_MUL, calledAt + DELIVERY_MINUTES * 2);
    order.vip = true;
    order.reason = VIP_REASONS[Math.floor(roll(seed, day, 1701 + slot) * VIP_REASONS.length)];
    return order;
  }
  const lines = 2 + Math.floor(roll(seed, day, 401 + slot) * 2);
  const items: Record<string, number> = {};
  for (let i = 0; i < lines; i++) {
    const r = roll(seed, day, 503 + slot * 7 + i);
    const source = (i > 0 || !favorites.length) && roll(seed, day, 703 + slot * 7 + i) < 0.7 && inStock.length ? inStock : pool;
    const id = i === 0 && favorites.length ? favorites[Math.floor(r * favorites.length)] : source[Math.floor(r * source.length)]?.id;
    if (id) items[id] = (items[id] ?? 0) + 1 + Math.floor(roll(seed, day, 601 + slot * 7 + i) * 3);
  }
  if (!Object.keys(items).length) return null;
  return head(items);
}

/** Tiền hàng theo giá đang bán của tiệm (đơn nấu trả giá hời theo hệ số premium). */
export const phoneOrderValue = (o: PhoneOrder, priceOf: (id: string) => number) =>
  Object.entries(o.items).reduce((n, [id, q]) => n + priceOf(id) * q, 0) * (o.premium ?? 1);

export const describeItems = (items: Record<string, number>) =>
  Object.entries(items).map(([id, q]) => `${q} ${productById(id).name}`).join(', ');
