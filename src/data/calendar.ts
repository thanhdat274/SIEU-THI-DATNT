import { PRODUCTS, productById } from './products';

/** Một năm trong game = 120 ngày; lễ lặp lại mỗi năm. */
export const YEAR_DAYS = 120;
/** Ngày 1 của ván rơi vào ngày này trong năm, để lễ đầu tiên (hè) tới sớm. */
const YEAR_OFFSET = 10;

export interface Festival {
  id: string;
  icon: string;
  name: string;
  blurb: string;
  /** Ngày trong năm (0-based), gồm cả hai đầu. */
  from: number;
  to: number;
  /** Nhân lượng người ghé tiệm. */
  traffic: number;
  /** Món khách hỏi mua nhiều hơn. */
  hot: string[];
  /** Nhân giá nhập mọi món (mùa cao điểm mối tăng giá). */
  cost: number;
  /** Ngày hội nhỏ của xóm (1–3 ngày), do khách quen này đứng ra lo. */
  host?: string;
  /** Phần món trong giỏ khách là hàng của mùa (mặc định 0.2); lễ lớn thì cả xóm đi sắm. */
  pull?: number;
  /** Nhân độ nhạy giá với hàng của mùa: nhỏ hơn 1 thì khách chịu mua giá cao hơn ngày thường. */
  tolerance?: number;
}

/** Báo trước ngày hội bao nhiêu ngày (và nhắc lại hôm trước). */
export const FESTIVAL_NOTICE_DAYS = 3;

export const FESTIVALS: Festival[] = [
  { id: 'he', icon: '☀️', name: 'Mùa hè', blurb: 'Trời nóng, khách ghé mua đồ uống mát và kem.', from: 12, to: 27, traffic: 1.1, hot: ['nuoc', 'ngot', 'kem', 'tangluc'], cost: 1 },
  { id: 'khai_giang', icon: '🎒', name: 'Mùa tựu trường', blurb: 'Phụ huynh sắm tập vở, học sinh mua bánh kẹo. Khách mua đồ học tập không ngại giá.', from: 38, to: 44, traffic: 1.25, hot: ['vo', 'banh', 'sua', 'snack', 'keomut'], cost: 1.05, pull: 0.4, tolerance: 0.6 },
  { id: 'trung_thu', icon: '🏮', name: 'Tết Trung thu', blurb: 'Trẻ con rước đèn, bánh kẹo, trà, trái cây bán chạy; giá cao khách vẫn mua.', from: 58, to: 63, traffic: 1.3, hot: ['banh', 'ngot', 'snack', 'traicay', 'tra', 'sua'], cost: 1.1, pull: 0.45, tolerance: 0.55 },
  { id: 'giang_sinh', icon: '🎄', name: 'Giáng sinh', blurb: 'Phố đông người đi chơi, bánh kẹo và bia lên ngôi.', from: 92, to: 95, traffic: 1.2, hot: ['banh', 'bia', 'ngot'], cost: 1 },
  // Ngày hội xóm: ngắn, đẩy mạnh một nhóm hàng
  { id: 'hoi_xom', icon: '🎪', name: 'Ngày hội xóm', blurb: 'Cả hẻm ra sân chơi, nước và bánh kẹo bán chạy.', from: 3, to: 4, traffic: 1.15, hot: ['nuoc', 'ngot', 'banh', 'keomut'], cost: 1, host: 'bac_tam' },
  { id: 'bong_da_phuong', icon: '⚽', name: 'Giải bóng đá phường', blurb: 'Cổ động viên mua nước tăng lực, bia, mì ăn khuya.', from: 31, to: 33, traffic: 1.15, hot: ['tangluc', 'nuoc', 'bia', 'mi'], cost: 1, host: 'chu_ba' },
  { id: 'hoi_phu_nu', icon: '🎀', name: 'Ngày hội phụ nữ', blurb: 'Chị em sắm trái cây, bánh, trà, sữa chua làm quà.', from: 49, to: 50, traffic: 1.15, hot: ['traicay', 'banh', 'tra', 'suachua'], cost: 1, host: 'co_nga_hoi' },
  { id: 'le_hoi_lang', icon: '🏮', name: 'Lễ hội làng', blurb: 'Nhà nhà nấu cỗ: gạo, dầu ăn, gia vị, nước mắm bán chạy.', from: 70, to: 72, traffic: 1.2, hot: ['gao', 'dauan', 'giavi', 'nuocmam'], cost: 1.03, host: 'bac_doi_hoi' },
  { id: 'cho_dem', icon: '🌙', name: 'Chợ đêm cuối tháng', blurb: 'Khách đi chợ đêm ghé mua snack, kem, nước ngọt.', from: 81, to: 82, traffic: 1.15, hot: ['snack', 'kem', 'ngot', 'bimbim'], cost: 1, host: 'anh_minh_nhau' },
  { id: 'hoi_banh', icon: '🧁', name: 'Hội thi làm bánh', blurb: 'Cả xóm thi làm bánh: sữa, trứng, đường hút hàng.', from: 100, to: 101, traffic: 1.1, hot: ['sua', 'trung', 'x_duong', 'sua_tuoi'], cost: 1, host: 'co_thao_quen' },
  { id: 'tet', icon: '🧧', name: 'Tết Nguyên Đán', blurb: 'Bà con sắm Tết rầm rộ, mua cả giỏ quà; mối nhập tăng giá mạnh, bán giá cao vẫn hết.', from: 108, to: 119, traffic: 1.7, hot: ['banh', 'ngot', 'bia', 'gao', 'dauan', 'giavi', 'traicay', 'thit', 'hat', 'quatet', 'nuocmam'], cost: 1.2, pull: 0.55, tolerance: 0.5 },
];

export type MarketKind = 'shortage' | 'glut' | 'viral' | 'roadworks';

export interface MarketEvent {
  kind: MarketKind;
  icon: string;
  label: string;
  /** Món bị ảnh hưởng (trừ sửa đường). */
  productId?: string;
  from: number;
  to: number;
}

const MARKET_TEXT: Record<MarketKind, { icon: string; label: (name: string) => string }> = {
  shortage: { icon: '📈', label: (n) => `Khan hàng ${n}: giá nhập tăng 35%` },
  glut: { icon: '📉', label: (n) => `${n} được mùa: giá nhập giảm 25%` },
  viral: { icon: '📱', label: (n) => `${n} đang nổi trên mạng: khách hỏi mua gấp đôi` },
  roadworks: { icon: '🚧', label: () => 'Sửa đường trước hẻm: ít người đi ngang hơn' },
};

/** Sự kiện thị trường chia theo khối 5 ngày: mỗi khối có thể có một sự kiện dài 3 ngày (ngày 2–4 của khối). */
const BLOCK = 5;

function roll(seed: number, n: number, salt: number) {
  let h = Math.imul((seed >>> 0) ^ Math.imul(n, 2654435761), 2246822519) ^ salt;
  h ^= h >>> 13;
  h = Math.imul(h, 3266489917);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export const dayOfYear = (day: number) => (day - 1 + YEAR_OFFSET) % YEAR_DAYS;

export function festivalOn(day: number): Festival | undefined {
  const d = dayOfYear(day);
  return FESTIVALS.find((f) => d >= f.from && d <= f.to);
}

/** Lễ sắp bắt đầu trong `within` ngày tới (không tính lễ đang diễn ra). */
export function upcomingFestival(day: number, within = FESTIVAL_NOTICE_DAYS): { festival: Festival; inDays: number } | undefined {
  for (let n = 1; n <= within; n++) {
    const f = festivalOn(day + n);
    if (f && f !== festivalOn(day) && dayOfYear(day + n) === f.from) return { festival: f, inDays: n };
  }
  return undefined;
}

/** Sự kiện thị trường của khối chứa `day` (có thể chưa bắt đầu — dùng để báo trước). */
export function marketEventNear(seed: number, day: number, level: number): MarketEvent | undefined {
  if (day < 4) return undefined;
  const block = Math.floor((day - 1) / BLOCK);
  if (roll(seed, block, 3) > 0.5) return undefined;
  const from = block * BLOCK + 2;
  const kinds: MarketKind[] = ['shortage', 'glut', 'viral', 'roadworks'];
  const kind = kinds[Math.floor(roll(seed, block, 5) * kinds.length)];
  const pool = PRODUCTS.filter((p) => p.unlock <= level);
  const productId = kind === 'roadworks' ? undefined : pool[Math.floor(roll(seed, block, 11) * pool.length)].id;
  const text = MARKET_TEXT[kind];
  return { kind, icon: text.icon, label: text.label(productId ? productById(productId).name : ''), productId, from, to: from + 2 };
}

export function marketEventOn(seed: number, day: number, level: number) {
  const e = marketEventNear(seed, day, level);
  return e && day >= e.from && day <= e.to ? e : undefined;
}

/** Ảnh hưởng gộp của lễ và thị trường trong một ngày. */
export interface DayEffects {
  festival?: Festival;
  market?: MarketEvent;
  traffic: number;
  /** Món được hỏi mua nhiều hơn hôm nay. */
  hot: string[];
  /** Hệ số giá nhập của một món. */
  cost: (productId: string) => number;
  /** Xác suất mỗi món khách muốn là hàng của mùa. */
  pull: number;
  /** Hệ số độ nhạy giá của khách với món này hôm nay. */
  tolerance: (productId: string) => number;
}

export function dayEffects(seed: number, day: number, level: number): DayEffects {
  const festival = festivalOn(day);
  const market = marketEventOn(seed, day, level);
  const unlocked = (id: string) => productById(id).unlock <= level;
  const hot = [...(festival?.hot ?? []).filter(unlocked), ...(market?.kind === 'viral' && market.productId ? [market.productId, market.productId] : [])];
  return {
    festival,
    market,
    traffic: (festival?.traffic ?? 1) * (market?.kind === 'roadworks' ? 0.8 : 1),
    hot,
    cost: (id) => (festival?.cost ?? 1)
      * (market?.productId === id ? (market.kind === 'shortage' ? 1.35 : market.kind === 'glut' ? 0.75 : 1) : 1),
    pull: festival?.pull ?? 0.2,
    tolerance: (id) => (festival?.hot.includes(id) ? festival.tolerance ?? 1 : 1),
  };
}

/** Câu báo buổi sáng: lễ hôm nay, sự kiện đang có hoặc sắp tới. */
export function morningNews(seed: number, day: number, level: number): string[] {
  const out: string[] = [];
  const f = festivalOn(day);
  if (f && (dayOfYear(day) === f.from || day === 1)) out.push(`${f.icon} ${f.name} bắt đầu! ${f.blurb}`);
  const soon = upcomingFestival(day);
  if (soon && (soon.inDays === FESTIVAL_NOTICE_DAYS || soon.inDays === 1)) {
    const goods = soon.festival.hot.filter((id) => productById(id).unlock <= level).map((id) => productById(id).name).join(', ');
    const when = soon.inDays === 1 ? 'Ngày mai' : `${soon.inDays} ngày nữa`;
    out.push(`${soon.festival.icon} ${when} là ${soon.festival.name}${goods ? `, nhập sẵn ${goods}` : ''}`);
  }
  const m = marketEventNear(seed, day, level);
  if (m && day === m.from) out.push(`${m.icon} ${m.label} (3 ngày)`);
  if (m && day === m.from - 1) out.push(`${m.icon} Ngày mai: ${m.label}`);
  return out;
}
