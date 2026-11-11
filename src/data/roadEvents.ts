/**
 * Hệ 5-L5 — Chuyện dọc đường (SPEC-CHIEU-RONG §5.6 Nhịp 1 & 4).
 *
 * Dọc đường một chuyến đi tỉnh có 2 nhịp chuyện rút TẤT ĐỊNH từ seed (R4):
 *   - Nhịp 1 (đi, lúc ~20% quãng đường): Thủng lốp / Mưa lớn / Kẹt xe ngày lễ /
 *     Người quen xin quá giang / Trạm kiểm tra.
 *   - Nhịp 4 (về, lúc ~80%): như nhịp 1, thêm chuyện GẮN VỚI HÀNG đang chở
 *     (mưa không phủ bạt làm ướt hàng · người đi đường hỏi mua lại giá hời).
 *
 * Pool được LỌC theo thời tiết/lịch/trạng thái xe hôm đó rồi RÚT bằng hash
 * (seed, day, routeId) → cùng điều kiện + cùng seed ra cùng chuyện (test được).
 * Mọi hiệu ứng (chậm giờ, mất tiền, ướt hàng, bán bớt, thân thiết) đều do
 * slice `tripChoose` áp dụng; ở đây chỉ CH0 mô tả thuần.
 */
import type { Weather } from './weather';

/** Bối cảnh một chuyến để lọc pool chuyện (từ state tại thời điểm rút). */
export interface RoadCtx {
  weather: Weather;
  /** Có ngày lễ hôm nay không (festivalOn(day)). */
  festival: boolean;
  /** Có khách quen đã thân (friendship cao) để xin quá giang. */
  hasFriend: boolean;
  /** Sức chở đã dùng 0..1 (số thùng / sức xe). */
  loadPct: number;
  /** Có hàng đang chở về không. */
  hasCargo: boolean;
  /** Có hàng khô dễ ướt không (không phải tươi/thịt, không đóng chai). */
  hasDryCargo: boolean;
}

export interface RoadOption {
  label: string;
  minutes: number;
  cost?: number;
  wet?: boolean;
  /** +thân thiết cho khách quen thân nhất (nếu chọn món này). */
  friend?: number;
  /** Bán bớt vài thùng hàng cho người đi đường (nếu chọn món này). */
  sell?: boolean;
}

export interface RoadEvent {
  id: string;
  title: string;
  desc: string;
  icon: string;
  options: RoadOption[];
  /** Điều kiện xuất hiện (mặc định luôn có). */
  when?: (ctx: RoadCtx) => boolean;
}

/** Hàm băm tất định 0..1 (cùng khuôn R4 với weather). */
function hash01(seed: number, day: number, salt: number): number {
  let h = (seed ^ Math.imul(day, 0x9e3779b1) ^ Math.imul(salt, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function strHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h ^ s.charCodeAt(i), 0x01000193)) >>> 0;
  return h;
}

const rain = (c: RoadCtx) => c.weather === 'rain' || c.weather === 'storm';

/** Ngân hàng chuyện (8 chuyện). */
export const ROAD_EVENTS: RoadEvent[] = [
  {
    id: 'thung_lop', title: 'Thủng lốp', icon: '🛞',
    desc: 'Giữa đường xe xì hơi. Tự vá ven đường thì rẻ nhưng lâu; dắt bộ tới tiệm quen thì hết sức nhưng an toàn.',
    options: [
      { label: 'Vá ven đường', minutes: 30, cost: 40000 },
      { label: 'Dắt bộ tới tiệm quen', minutes: 70 },
    ],
  },
  {
    id: 'mua_lon', title: 'Mưa lớn', icon: '🌧',
    desc: 'Trời đổ mưa to. Trú lại thì chậm; chạy tiếp thì hàng khô có thể bị ướt.',
    when: rain,
    options: [
      { label: 'Trú mưa', minutes: 45 },
      { label: 'Chạy tiếp', minutes: 0, wet: true },
    ],
  },
  {
    id: 'ket_xe', title: 'Kẹt xe ngày lễ', icon: '🚗',
    desc: 'Ngày lễ đường đông nghịt. Chờ thì mất giờ; rẽ đường vòng nhanh hơn nhưng tốn thêm xăng.',
    when: (c) => c.festival,
    options: [
      { label: 'Chờ xe qua', minutes: 60 },
      { label: 'Đi đường vòng', minutes: 25, cost: 20000 },
    ],
  },
  {
    id: 'qua_giang', title: 'Người quen xin quá giang', icon: '🧑‍🤝‍🧑',
    desc: 'Một người quen lâu gặp giữa đường nhờ đi nhờ một đoạn. Chở thì hơi chậm nhưng gắn bó hơn.',
    when: (c) => c.hasFriend,
    options: [
      { label: 'Cho quá giang', minutes: 15, friend: 2 },
      { label: 'Từ chối khéo', minutes: 0 },
    ],
  },
  {
    id: 'tram_kiem_tra', title: 'Trạm kiểm tra', icon: '🚔',
    desc: 'Đoạn đầu đường có trạm kiểm tra vì xe chở chật cứng. Dừng lại khai báo một chút là qua.',
    when: (c) => c.loadPct >= 0.9,
    options: [
      { label: 'Dừng kiểm tra', minutes: 20 },
    ],
  },
  {
    id: 'mua_khong_phu_bat', title: 'Trời mưa, hàng chưa phủ bạt', icon: '🪣',
    desc: 'Về giữa cơn mưa, thùng mở nóc. Kịp phủ bạt thì mất chút thời gian; để vậy hàng khô dễ ướt.',
    when: (c) => rain(c) && c.hasDryCargo,
    options: [
      { label: 'Dừng phủ bạt', minutes: 10, cost: 5000 },
      { label: 'Chạy về cho nhanh', minutes: 0, wet: true },
    ],
  },
  {
    id: 'nguoi_hoi_mua', title: 'Người đi đường hỏi mua lại', icon: '🛒',
    desc: 'Khách ghé mua lại vài thùng hàng đang chở với giá hời. Bán ngay thì có tiền mặt, nhưng hàng mang về bớt đi.',
    when: (c) => c.hasCargo,
    options: [
      { label: 'Bán một thùng giá hời', minutes: 15, sell: true },
      { label: 'Không bán', minutes: 0 },
    ],
  },
];

/** Nhịp 1 (đường đi) rút từ 5 chuyện chung; nhịp 4 (đường về) thêm 2 chuyện gắn hàng → 8 chuyện. */
export const drawPool = (beat: 1 | 4, ctx: RoadCtx): RoadEvent[] =>
  ROAD_EVENTS.filter((e) => e.when?.(ctx) ?? true)
    .filter((e) => beat === 1 ? e.id !== 'mua_khong_phu_bat' && e.id !== 'nguoi_hoi_mua' : true);

/**
 * Rút TẤT ĐỊNH một chuyện trong nhịp `beat` (1 = đi, 4 = về) theo
 * hash(weatherSeed, day, routeId). Trả null nếu pool rỗng.
 */
export const roadEventDraw = (seed: number, day: number, routeId: string, beat: 1 | 4, ctx: RoadCtx): RoadEvent | null => {
  const pool = drawPool(beat, ctx);
  if (pool.length === 0) return null;
  const salt = strHash(`${routeId}:${beat}`);
  const idx = Math.floor(hash01(seed, day, salt) * pool.length) % pool.length;
  return pool[idx];
};
