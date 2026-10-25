/** Hạn dùng theo lô: mỗi lần nhập là một lô, bán lô cũ trước, mỗi đêm trừ hạn theo chỗ cất và thời tiết. */
import type { FurnitureType } from './furniture';
import { productById, type Category } from './products';
import type { Weather } from './weather';

/** Một lô hàng: số lượng và số ngày còn dùng được (có thể lẻ vì hàng hỏng nhanh/chậm). */
export interface Lot {
  qty: number;
  life: number;
}

/** Hạn dùng (ngày) khi mới nhập theo ngành hàng; Infinity = không hết hạn. */
const CATEGORY_LIFE: Record<Category, number> = {
  dry: 45, drink: 90, household: Infinity, cold: 6, frozen: 30, fresh: 3,
};

const PRODUCT_LIFE: Record<string, number> = {
  banhmi: 2, dochin: 2, trung: 14, trung_vit: 14, sua: 30, banh: 30, rau: 3, traicay: 5,
};

export function shelfLife(productId: string): number {
  return PRODUCT_LIFE[productId] ?? CATEGORY_LIFE[productById(productId).category];
}

/** Chỗ cất: kho (nhiệt độ phòng) hoặc một loại kệ/tủ. */
export type Place = 'storage' | 'coldStorage' | FurnitureType;

const COOLED: Place[] = ['fridge', 'freezer', 'coldStorage'];

/** Hàng cần lạnh mà để ngoài thì hỏng nhanh gấp mấy lần. */
const WARM_PENALTY: Partial<Record<Category, number>> = { cold: 2, frozen: 3, fresh: 1.5 };

/** Trời nóng hay ẩm làm hàng để ngoài tủ hỏng nhanh hơn; trong tủ mát thì không sao. */
const WEATHER_PENALTY: Record<Weather, Partial<Record<Category, number>>> = {
  sunny: { fresh: 1.3, cold: 1.3, frozen: 1.2 },
  cloudy: {},
  rain: { fresh: 1.15, dry: 1.1 },
  storm: { fresh: 1.2, dry: 1.15 },
  fog: { fresh: 1.1 },
};

/** Số ngày hạn bị trừ sau một ngày ở chỗ `place` với thời tiết `weather`. */
export function spoilRate(productId: string, place: Place, weather: Weather): number {
  const cat = productById(productId).category;
  if (COOLED.includes(place)) return 1;
  return (place === 'storage' ? WARM_PENALTY[cat] ?? 1 : 1) * (WEATHER_PENALTY[weather][cat] ?? 1);
}

/** Hàng cần giữ lạnh (để ngoài tủ thì hỏng nhanh). */
export const needsCold = (productId: string) => !!WARM_PENALTY[productById(productId).category];

const total = (lots: Lot[]) => lots.reduce((n, l) => n + l.qty, 0);

/**
 * Lô khớp với số lượng `count`: bản lưu cũ chưa có lô hoặc chỗ nào đổi số mà quên lô thì bù lô mới (hạn đầy)
 * hoặc bớt từ lô mới nhất. Lô luôn xếp hạn ngắn trước.
 */
export function fitLots(lots: Lot[] | undefined, count: number, productId: string | null): Lot[] {
  let out = (lots ?? []).filter((l) => l.qty > 0).map((l) => ({ ...l }));
  const diff = count - total(out);
  if (diff > 0 && productId) out.push({ qty: diff, life: shelfLife(productId) });
  else if (diff < 0) out = takeNewest(out, -diff);
  return out.sort((a, b) => a.life - b.life);
}

function takeNewest(lots: Lot[], qty: number): Lot[] {
  const out = [...lots].sort((a, b) => a.life - b.life);
  for (let i = out.length - 1; i >= 0 && qty > 0; i--) {
    const n = Math.min(out[i].qty, qty);
    out[i] = { ...out[i], qty: out[i].qty - n };
    qty -= n;
  }
  return out.filter((l) => l.qty > 0);
}

/** Lấy `qty` món, lô sắp hết hạn trước. Trả về [lô còn lại, lô đã lấy]. */
export function takeOldest(lots: Lot[], qty: number): [Lot[], Lot[]] {
  const rest: Lot[] = [];
  const taken: Lot[] = [];
  for (const l of [...lots].sort((a, b) => a.life - b.life)) {
    const n = Math.min(l.qty, qty);
    qty -= n;
    if (n) taken.push({ qty: n, life: l.life });
    if (l.qty > n) rest.push({ qty: l.qty - n, life: l.life });
  }
  return [rest, taken];
}

/** Gộp lô (cùng hạn thì cộng dồn), hạn ngắn trước. */
export function mergeLots(a: Lot[], b: Lot[]): Lot[] {
  const out = a.map((l) => ({ ...l }));
  for (const l of b) {
    const same = out.find((o) => Math.abs(o.life - l.life) < 0.01);
    if (same) same.qty += l.qty;
    else out.push({ ...l });
  }
  return out.sort((x, y) => x.life - y.life);
}

/** Qua một đêm: trừ hạn, tách phần hết hạn. Trả về [lô còn dùng được, số món bỏ đi]. */
export function ageLots(lots: Lot[], rate: number): [Lot[], number] {
  let spoiled = 0;
  const kept: Lot[] = [];
  for (const l of lots) {
    const life = l.life - rate;
    if (life <= 0) spoiled += l.qty;
    else kept.push({ qty: l.qty, life });
  }
  return [kept, spoiled];
}

/** Hạn gần nhất trong các lô (ngày, làm tròn xuống); null nếu không có hàng hoặc không hết hạn. */
export function nearestLife(lots: Lot[] | undefined): number | null {
  const life = lots?.length ? Math.min(...lots.map((l) => l.life)) : Infinity;
  return Number.isFinite(life) ? Math.max(1, Math.floor(life)) : null;
}

/**
 * Giảm giá hàng cận hạn: còn dưới 1 ngày bớt 50%; còn không quá 1/4 hạn (và không quá 3 ngày) bớt 20%.
 * Hàng hạn ngắn mới nhập (bánh mì 2 ngày) không bị giảm ngay.
 */
export function markdown(productId: string, life: number): number {
  if (life <= 1) return 0.5;
  if (life <= 3 && life <= shelfLife(productId) * 0.25) return 0.2;
  return 0;
}

/** Mức giảm của lô cũ nhất trên một tầng kệ (lô khách sẽ lấy). */
export function tierMarkdown(productId: string | null, lots: Lot[] | undefined, count: number): number {
  if (!productId || count <= 0) return 0;
  const oldest = fitLots(lots, count, productId)[0];
  return oldest ? markdown(productId, oldest.life) : 0;
}

/**
 * Xác suất khách bỏ món cận hạn (lô cũ nhất còn ≤1 ngày) khi nhìn thấy ngay tại kệ,
 * dù món đã tự giảm giá sâu: hàng tươi bị chê nhiều hơn đồ khô.
 */
export const nearExpiryRefuseChance = (life: number, category: Category) =>
  life <= 1 ? (category === 'fresh' ? 0.2 : 0.12) : 0;
