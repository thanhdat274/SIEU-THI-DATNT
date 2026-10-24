import { PRODUCTS, productById } from './products';

/** Một năm trong game = 365 ngày theo lịch thật; lễ lặp lại mỗi năm. */
export const YEAR_DAYS = 365;
/** Ngày 1 của ván rơi vào 1/1 — Tết dương lịch là dịp đầu tiên người chơi gặp. */
const YEAR_OFFSET = 0;

/** Số ngày của từng tháng (không tính năm nhuận). */
export const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
/** Ngày trong năm (0-based) mà mỗi tháng bắt đầu. */
export const CUM_DAYS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

/** Ngày trong năm (0-based) của một ngày tháng thật: md(3, 8) = 8/3. */
const md = (month: number, day: number) => CUM_DAYS[month - 1] + day - 1;

/** Đổi ngày trong năm (0-based) ra tháng/ngày. */
export function dateOfDoy(doy: number): { month: number; day: number } {
  let m = 0;
  while (m < 11 && doy >= CUM_DAYS[m + 1]) m++;
  return { month: m + 1, day: doy - CUM_DAYS[m] + 1 };
}

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
  /** Hàng của dịp: chỉ bán chạy trong dịp này (hỏi mua gấp mấy lần món hot), ngoài dịp gần như không ai mua. */
  goods?: string[];
  /** Nhân giá nhập mọi món (mùa cao điểm mối tăng giá). */
  cost: number;
  /** Ngày hội nhỏ của xóm (1–3 ngày), do khách quen này đứng ra lo. */
  host?: string;
  /** Phần món trong giỏ khách là hàng của mùa (mặc định 0.2); lễ lớn thì cả xóm đi sắm. */
  pull?: number;
  /** Nhân độ nhạy giá với hàng của mùa: nhỏ hơn 1 thì khách chịu mua giá cao hơn ngày thường. */
  tolerance?: number;
}

/** Hàng của dịp được hỏi mua gấp chừng này lần một món hot thường. */
const GOODS_WEIGHT = 4;
/** Ngoài dịp: bày giá thấp hơn gợi ý ít nhất chừng này thì mới có khách săn hàng xả. */
export const OFF_SEASON_CLEARANCE = 0.8;
export const OFF_SEASON_HUNT = 0.08;

/** Báo trước ngày hội bao nhiêu ngày (và nhắc lại hôm trước). */
export const FESTIVAL_NOTICE_DAYS = 3;

/** Lễ hội theo ngày tháng thật trong năm (từ = ngày trong năm 0-based, gồm cả hai đầu). */
export const FESTIVALS: Festival[] = [
  { id: 'tet_duong', icon: '🎆', name: 'Tết dương lịch', blurb: 'Năm mới đầu hẻm, nhà nào cũng có tiệc nhỏ: bia nước bánh kẹo hút hàng.', from: md(1, 1), to: md(1, 2), traffic: 1.2, hot: ['bia', 'ngot', 'banh', 'sua'], cost: 1.03, host: 'bac_tam' },
  { id: 'tet', icon: '🧧', name: 'Tết Nguyên Đán', blurb: 'Bà con sắm Tết rầm rộ, mua cả giỏ quà; mối nhập tăng giá mạnh, bán giá cao vẫn hết.', from: md(1, 28), to: md(2, 8), traffic: 1.7, goods: ['x_banh_chung', 'x_bao_li_xi', 'x_mut_dua', 'x_hat_dua', 'gio_qua_tet'], hot: ['banh', 'ngot', 'bia', 'gao', 'dauan', 'giavi', 'traicay', 'thit', 'hat', 'quatet', 'nuocmam', 'gio_qua_tet'], cost: 1.2, pull: 0.55, tolerance: 0.5 },
  { id: 'valentine', icon: '💝', name: 'Lễ Valentine', blurb: 'Cặp đôi đi chơi sắm quà: bánh ngọt, mỹ phẩm, nước ngọt hút hàng.', from: md(2, 13), to: md(2, 14), traffic: 1.15, hot: ['banh', 'ngot', 'mypham', 'sua', 'ruou'], cost: 1.03 },
  { id: 'le_hoi_lang', icon: '🏮', name: 'Lễ hội làng', blurb: 'Hội làng đầu xuân, nhà nhà nấu cỗ: gạo, dầu ăn, gia vị, nước mắm bán chạy.', from: md(2, 15), to: md(2, 17), traffic: 1.2, hot: ['gao', 'dauan', 'giavi', 'nuocmam'], cost: 1.03, host: 'bac_doi_hoi' },
  // Ngày hội xóm: ngắn, đẩy mạnh một nhóm hàng
  { id: 'quoc_te_phu_nu', icon: '💐', name: 'Quốc tế Phụ nữ 8/3', blurb: 'Nhà nhà mua hoa, mỹ phẩm, bánh làm quà tặng chị em; khách chịu giá cao.', from: md(3, 7), to: md(3, 9), traffic: 1.25, goods: ['gio_qua_83'], hot: ['mypham', 'banh', 'traicay', 'sua', 'xaphong', 'gio_qua_83'], cost: 1.05, pull: 0.35, tolerance: 0.7 },
  { id: 'hoi_xom', icon: '🎪', name: 'Ngày hội xóm', blurb: 'Cả hẻm ra sân chơi, nước và bánh kẹo bán chạy.', from: md(3, 21), to: md(3, 22), traffic: 1.15, hot: ['nuoc', 'ngot', 'banh', 'keomut'], cost: 1, host: 'bac_tam' },
  { id: 'le_30_4', icon: '🏖️', name: 'Lễ 30/4 – 1/5', blurb: 'Nghỉ lễ hai ngày, người đi chơi khắp nơi, bia nước snack bán ầm ầm.', from: md(4, 30), to: md(5, 2), traffic: 1.25, hot: ['bia', 'ngot', 'nuoc', 'snack', 'traicay', 'kem'], cost: 1.05, pull: 0.3 },
  { id: 'bong_da_phuong', icon: '⚽', name: 'Giải bóng đá phường', blurb: 'Cổ động viên mua nước tăng lực, bia, mì ăn khuya.', from: md(5, 15), to: md(5, 17), traffic: 1.15, hot: ['tangluc', 'nuoc', 'bia', 'mi'], cost: 1, host: 'chu_ba' },
  { id: 'he', icon: '☀️', name: 'Mùa hè', blurb: 'Trời nóng, khách ghé mua đồ uống mát và kem.', from: md(6, 1), to: md(8, 15), traffic: 1.1, hot: ['nuoc', 'ngot', 'kem', 'tangluc'], cost: 1 },
  { id: 'cho_dem', icon: '🌙', name: 'Chợ đêm cuối hè', blurb: 'Khách đi chợ đêm ghé mua snack, kem, nước ngọt.', from: md(8, 21), to: md(8, 22), traffic: 1.15, hot: ['snack', 'kem', 'ngot', 'bimbim'], cost: 1, host: 'anh_minh_nhau' },
  { id: 'khai_giang', icon: '🎒', name: 'Mùa tựu trường', blurb: 'Phụ huynh sắm tập vở, học sinh mua bánh kẹo. Khách mua đồ học tập không ngại giá.', from: md(9, 1), to: md(9, 10), traffic: 1.25, hot: ['vo', 'x_but_bi', 'banh', 'sua', 'snack', 'keomut'], cost: 1.05, pull: 0.4, tolerance: 0.6 },
  { id: 'trung_thu', icon: '🏮', name: 'Tết Trung thu', blurb: 'Trẻ con rước đèn, bánh kẹo, trà, trái cây bán chạy; giá cao khách vẫn mua.', from: md(9, 24), to: md(9, 29), traffic: 1.3, goods: ['x_banh_trung_thu', 'x_long_den', 'gio_qua_trung_thu'], hot: ['banh', 'ngot', 'snack', 'traicay', 'tra', 'sua', 'gio_qua_trung_thu'], cost: 1.1, pull: 0.45, tolerance: 0.55 },
  { id: 'mua_mua', icon: '🌧️', name: 'Mùa mưa', blurb: 'Mưa dầm cả tháng: áo mưa, ô, mì gói và trà nóng bán đều tay.', from: md(10, 1), to: md(10, 31), traffic: 1, hot: ['aomua', 'o', 'mi', 'trung', 'sua', 'caphe'], cost: 1.03 },
  { id: 'hoi_phu_nu', icon: '🎀', name: 'Ngày hội phụ nữ', blurb: 'Chị em sắm trái cây, bánh, trà, sữa chua làm quà.', from: md(11, 14), to: md(11, 15), traffic: 1.15, hot: ['traicay', 'banh', 'tra', 'suachua'], cost: 1, host: 'co_nga_hoi' },
  { id: 'nha_giao', icon: '🌸', name: 'Nhà giáo Việt Nam 20/11', blurb: 'Học sinh mua bánh, trái cây, mỹ phẩm tặng cô; chợ hoa rực rỡ.', from: md(11, 19), to: md(11, 21), traffic: 1.15, goods: ['gio_qua_2011'], hot: ['mypham', 'banh', 'traicay', 'sua', 'tra', 'vo', 'gio_qua_2011'], cost: 1.02 },
  { id: 'hoi_banh', icon: '🧁', name: 'Hội thi làm bánh', blurb: 'Cả xóm thi làm bánh: sữa, trứng, đường hút hàng.', from: md(12, 3), to: md(12, 4), traffic: 1.1, hot: ['sua', 'trung', 'x_duong', 'sua_tuoi'], cost: 1, host: 'co_thao_quen' },
  { id: 'sale_cuoi_nam', icon: '🛒', name: 'Sale cuối năm', blurb: 'Các mối xả hàng trước Tết nên nhập rẻ, cả xóm tranh thủ sắm sớm.', from: md(12, 10), to: md(12, 15), traffic: 1.3, hot: ['mi', 'nuoc', 'banh', 'ngot', 'sua', 'giay', 'xaphong', 'botgiat'], cost: 0.93, pull: 0.3, tolerance: 0.85 },
  { id: 'giang_sinh', icon: '🎄', name: 'Giáng sinh', blurb: 'Phố đông người đi chơi, bánh kẹo và bia lên ngôi.', from: md(12, 23), to: md(12, 26), traffic: 1.2, hot: ['banh', 'bia', 'ngot'], cost: 1 },
];

/** Mọi món chỉ bán theo dịp (bánh chưng, lồng đèn...). */
export const SEASONAL_GOODS = new Set(FESTIVALS.flatMap((f) => f.goods ?? []));

/** Món này hôm nay đang ngoài dịp của nó. */
export const offSeason = (id: string, day: number) => SEASONAL_GOODS.has(id) && !festivalOn(day)?.goods?.includes(id);

/** Hàng nên nhập sẵn cho dịp: hàng của dịp trước, rồi tới món hot. */
export const festivalStock = (f: Festival, level: number) =>
  [...(f.goods ?? []), ...f.hot].filter((id) => productById(id).unlock <= level);

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

/** Ngày game hiện tại đổi ra ngày tháng trong năm, vd "24/3". */
export function describeDate(day: number): string {
  const { month, day: d } = dateOfDoy(dayOfYear(day));
  return `${d}/${month}`;
}

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
  const goods = (festival?.goods ?? []).filter(unlocked);
  const hot = [...goods.flatMap((id) => Array(GOODS_WEIGHT).fill(id) as string[]), ...(festival?.hot ?? []).filter(unlocked), ...(market?.kind === 'viral' && market.productId ? [market.productId, market.productId] : [])];
  return {
    festival,
    market,
    traffic: (festival?.traffic ?? 1) * (market?.kind === 'roadworks' ? 0.8 : 1),
    hot,
    cost: (id) => (festival?.cost ?? 1)
      * (market?.productId === id ? (market.kind === 'shortage' ? 1.35 : market.kind === 'glut' ? 0.75 : 1) : 1),
    pull: festival?.pull ?? 0.2,
    tolerance: (id) => (festival?.hot.includes(id) || festival?.goods?.includes(id) ? festival.tolerance ?? 1 : 1),
  };
}

/** Câu báo buổi sáng: lễ hôm nay, sự kiện đang có hoặc sắp tới. */
export function morningNews(seed: number, day: number, level: number): string[] {
  const out: string[] = [];
  const f = festivalOn(day);
  if (f && (dayOfYear(day) === f.from || day === 1)) out.push(`${f.icon} ${f.name} bắt đầu! ${f.blurb}`);
  const soon = upcomingFestival(day);
  if (soon && (soon.inDays === FESTIVAL_NOTICE_DAYS || soon.inDays === 1)) {
    const goods = festivalStock(soon.festival, level).map((id) => productById(id).name).join(', ');
    const when = soon.inDays === 1 ? 'Ngày mai' : `${soon.inDays} ngày nữa`;
    out.push(`${soon.festival.icon} ${when} là ${soon.festival.name}${goods ? `, nhập sẵn ${goods}` : ''}`);
  }
  const m = marketEventNear(seed, day, level);
  if (m && day === m.from) out.push(`${m.icon} ${m.label} (3 ngày)`);
  if (m && day === m.from - 1) out.push(`${m.icon} Ngày mai: ${m.label}`);
  return out;
}
