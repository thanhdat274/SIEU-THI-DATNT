import { productById, unlockedProducts } from './products';

/** Người bán rong sáng sớm ghé tiệm lấy sỉ từ kho về bán lại. */
export interface VendorDef {
  id: string;
  name: string;
  icon: string;
  /** Bán gì: nhóm món hay lấy. */
  goods: string;
  likes: string[];
}

export const VENDORS: VendorDef[] = [
  { id: 'xe_nuoc', name: 'Cô Bảy xe nước mía', icon: '🥤', goods: 'nước giải khát', likes: ['nuoc', 'ngot', 'tangluc', 'x_tra_xanh', 'x_aquafina_chai'] },
  { id: 'ganh_keo', name: 'Bà Tư gánh kẹo', icon: '🍬', goods: 'bánh kẹo cho trẻ con', likes: ['keomut', 'banh', 'snack', 'bimbim'] },
  { id: 'xe_banh_mi', name: 'Anh Hai xe bánh mì', icon: '🥖', goods: 'bánh mì sáng', likes: ['banhmi', 'trung', 'xucxich', 'sua'] },
  { id: 've_so', name: 'Chú Năm bán vé số', icon: '🎫', goods: 'đồ lặt vặt dọc đường', likes: ['nuoc', 'banh', 'x_khau_trang', 'x_pin'] },
];

export const WHOLESALE_UNLOCK = 6;
/** Người bán rong ghé trong khung giờ này (phút), tiệm phải đang mở. */
export const VENDOR_FROM = 8 * 60;
export const VENDOR_UNTIL = 9 * 60 + 30;
export const VENDOR_CHANCE = 0.6;
/** Chờ ở tiệm tối đa chừng này phút để chủ tiệm trả lời. */
export const VENDOR_WAIT = 30;
/** Giá sỉ: phần trăm giá bán lẻ đang niêm yết (không thấp hơn giá nhập). */
export const WHOLESALE_RATE = 0.85;

export interface VendorOffer {
  vendorId: string;
  items: Record<string, number>;
  expiresAt: number;
}

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

/** Hôm nay người bán rong nào ghé, muốn lấy bao nhiêu món (theo hàng đã mở khóa). */
export function makeVendorOffer(level: number, minutes: number): VendorOffer | null {
  const open = new Set(unlockedProducts(level).map((p) => p.id));
  const candidates = VENDORS.filter((v) => v.likes.some((id) => open.has(id)));
  if (!candidates.length) return null;
  const v = pick(candidates);
  const likes = v.likes.filter((id) => open.has(id));
  const items: Record<string, number> = {};
  const lines = Math.min(likes.length, 2 + Math.floor(Math.random() * 2));
  for (const id of [...likes].sort(() => Math.random() - 0.5).slice(0, lines)) items[id] = 6 + Math.floor(Math.random() * 3) * 3;
  return { vendorId: v.id, items, expiresAt: minutes + VENDOR_WAIT };
}

export const vendorById = (id: string) => VENDORS.find((v) => v.id === id);

/** Tiền sỉ cho cả đơn: giảm theo WHOLESALE_RATE, mỗi món không dưới giá nhập + 5%. */
export function wholesaleTotal(items: Record<string, number>, priceOf: (id: string) => number) {
  return Object.entries(items).reduce((n, [id, q]) => {
    const unit = Math.max(Math.round(productById(id).buy * 1.05), Math.round(priceOf(id) * WHOLESALE_RATE / 100) * 100);
    return n + unit * q;
  }, 0);
}
