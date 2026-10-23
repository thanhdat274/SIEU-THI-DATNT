import { casesFor, PRODUCTS, productById, type Category } from './products';

/** Nơi nhập hàng: mỗi mối có giá, thời gian giao, đơn tối thiểu và ngành hàng riêng. */
export interface Supplier {
  id: string;
  name: string;
  icon: string;
  desc: string;
  unlock: number;
  /** Giảm (dương) hoặc phụ thu (âm) so với giá nhập chuẩn. */
  discount: number;
  /** 0 = có hàng ngay; 1 = giao lúc mở cửa sáng mai. */
  delayDays: 0 | 1;
  minOrder: number;
  /** Bỏ trống = bán mọi ngành. */
  categories?: Category[];
  /** Mua nhiều thùng một món được bớt thêm. */
  bulk?: { minCases: number; discount: number }[];
  /** Giá dao động mỗi ngày tối đa bao nhiêu. */
  volatility: number;
}

export const SUPPLIERS: Supplier[] = [
  {
    id: 'daily', name: 'Đại lý đầu ngõ', icon: '🏠', unlock: 1, discount: 0, delayDays: 0, minOrder: 0, volatility: 0.02,
    desc: 'Mối quen gần nhà, có hàng ngay, không cần đơn tối thiểu. Giá chuẩn.',
  },
  {
    id: 'cho', name: 'Chợ đầu mối', icon: '🧺', unlock: 3, discount: 0.12, delayDays: 1, minOrder: 150000, volatility: 0.08,
    categories: ['dry', 'drink', 'fresh', 'cold'],
    bulk: [{ minCases: 3, discount: 0.03 }, { minCases: 6, discount: 0.06 }],
    desc: 'Rẻ hơn 12%, giao 6h sáng mai. Giá lên xuống theo ngày. Có rau củ, trái cây tươi.',
  },
  {
    id: 'hoatoc', name: 'Giao hỏa tốc', icon: '🛵', unlock: 8, discount: -0.06, delayDays: 0, minOrder: 50000, volatility: 0.03,
    desc: 'Có hàng ngay như đại lý nhưng đủ mọi ngành, phụ thu 6%. Cứu nguy lúc kệ trống giữa ngày.',
  },
  {
    id: 'kho', name: 'Kho sỉ Đại Phát', icon: '🏭', unlock: 18, discount: 0.18, delayDays: 1, minOrder: 1000000, volatility: 0.05,
    bulk: [{ minCases: 5, discount: 0.04 }, { minCases: 10, discount: 0.08 }],
    desc: 'Rẻ nhất (−18%), đủ mọi ngành, giao sáng mai. Đơn từ 1 triệu, mua thùng lớn bớt thêm tới 8%.',
  },
];

export const supplierById = (id: string) => SUPPLIERS.find((s) => s.id === id)!;

export const supplierSells = (s: Supplier, productId: string) =>
  !s.categories || s.categories.includes(productById(productId).category);

/** Số ngẫu nhiên cố định theo (ngày, chuỗi): cùng ngày thì giá không nhảy khi mở lại bảng. */
function seeded(day: number, key: string) {
  let h = day * 2654435761;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 2246822519);
  h ^= h >>> 13;
  return ((h >>> 0) % 10000) / 10000;
}

let costModifier: (productId: string, day: number) => number = () => 1;

/** Hệ số giá nhập ngoài mối (lễ, khan hàng, kỹ năng); store đặt khi khởi tạo. */
export const setCostModifier = (fn: typeof costModifier) => { costModifier = fn; };

/** Giá nhập một món ở một mối trong ngày (trước bớt số lượng lớn). */
export function unitCost(s: Supplier, productId: string, day: number) {
  const swing = (seeded(day, s.id + productId) * 2 - 1) * s.volatility;
  return Math.round((productById(productId).buy * (1 - s.discount) * (1 + swing) * costModifier(productId, day)) / 100) * 100;
}

/** Mức bớt khi nhập `cases` thùng một món. */
export const bulkDiscount = (s: Supplier, cases: number) =>
  Math.max(0, ...(s.bulk ?? []).filter((b) => cases >= b.minCases).map((b) => b.discount));

/** Tổng tiền một đơn: từng món nhân giá ngày, trừ bớt số lượng lớn của món đó. */
export function orderTotal(s: Supplier, items: Record<string, number>, day: number) {
  let total = 0;
  for (const [id, qty] of Object.entries(items)) {
    if (qty > 0) total += Math.round(unitCost(s, id, day) * qty * (1 - bulkDiscount(s, casesFor(id, qty))));
  }
  return total;
}

/** Hàng hot trong tuần: khách hỏi mua nhiều hơn hẳn. Đổi mỗi 7 ngày, chỉ chọn món đã mở khóa. */
export function trending(day: number, level: number): string[] {
  const pool = PRODUCTS.filter((p) => p.unlock <= level);
  const week = Math.floor((day - 1) / 7);
  const picks = [...pool].sort((a, b) => seeded(week, a.id) - seeded(week, b.id));
  return picks.slice(0, pool.length > 6 ? 2 : 1).map((p) => p.id);
}
