/**
 * events.ts — Sự kiện ngẫu nhiên trong ngày.
 *
 * Độc lập (standalone): chỉ dùng seed/day/level, KHÔNG đọc store thời tiết.
 * Dùng phương pháp hash giống src/data/calendar.ts nên kết quả xác định
 * theo seed/day.
 */

/** Một sự kiện đặc biệt xảy ra trong 1–2 ngày. */
export interface RandomEvent {
  id: string;
  icon: string;
  title: string;
  /** Mô tả sự kiện / nội dung tin buổi sáng. */
  blurb: string;
  kind: 'good' | 'bad';
  /** Hệ số nhân lượt khách, 0.6–1.5. */
  traffic: number;
  /** Số ngày kéo dài, VD 1–2. */
  days: number;
}

/** Năm game 120 ngày, ngày 1 lệch mùa hè — khớp calendar.ts để mùa ăn khớp lễ. */
const YEAR_DAYS = 120;
const YEAR_OFFSET = 10;

/** Hash xác định (giống calendar.ts): cho [0,1). */
function roll(seed: number, n: number, salt: number): number {
  let h = Math.imul((seed >>> 0) ^ Math.imul(n, 2654435761), 2246822519) ^ salt;
  h ^= h >>> 13;
  h = Math.imul(h, 3266489917);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const dayOfYear = (day: number) => (day - 1 + YEAR_OFFSET) % YEAR_DAYS;

/** Mùa dựa theo ngày trong năm để gợi ý các sự kiện theo thời vụ. */
function seasonOf(day: number): 'summer' | 'autumn' | 'winter' | 'spring' {
  const d = dayOfYear(day);
  if (d >= 12 && d <= 27) return 'summer'; // Mùa hè
  if (d >= 58 && d <= 75) return 'autumn'; // Trung thu về cuối thu
  if (d >= 92 && d <= 105) return 'winter'; // Giáng sinh & cận Tết
  return 'spring';
}

/** Pool các sự kiện có thể xảy ra trong ngày. Các sự kiện theo mùa được lọc khi chọn. */
export const RANDOM_EVENTS: RandomEvent[] = [
  { id: 'heatwave', icon: '🌡️', title: 'Sóng nhiệt', kind: 'good', traffic: 1.3, days: 2,
    blurb: 'Trời nóng như đổ lửa, ai cũng ghé tiệm mua nước mát và kem mát lạnh.' },
  { id: 'rain', icon: '🌧️', title: 'Mưa dầm', kind: 'good', traffic: 1.15, days: 2,
    blurb: 'Cơn mưa ập xuống, khách trú mưa trong tiệm rồi tiện tay mua đồ.' },
  { id: 'opening', icon: '🏬', title: 'Khách sộp khu phố', kind: 'good', traffic: 1.25, days: 1,
    blurb: 'Một vị khách sộp đi sắm cả khu phố, ghé tiệm bạn xả tiền mua nhiều.' },
  { id: 'lucky', icon: '🍀', title: 'Ngày may mắn', kind: 'good', traffic: 1.1, days: 1,
    blurb: 'Hôm nay khách ghé qua tiệm đặc biệt đông, cơ may bán được nhiều.' },
  { id: 'bad_weather', icon: '⛈️', title: 'Bão giông', kind: 'bad', traffic: 0.7, days: 1,
    blurb: 'Giông bão ập đến, khách ngại ra đường, quầy vắng vẻ hơn hẳn.' },
  { id: 'roadwork', icon: '🚧', title: 'Sửa đường', kind: 'bad', traffic: 0.8, days: 2,
    blurb: 'Đoạn đường trước cửa bị đào lên sửa chữa, người đi qua ít đi.' },
  { id: 'outage', icon: '🔌', title: 'Mất điện khu phố', kind: 'bad', traffic: 0.6, days: 1,
    blurb: 'Khu phố mất điện cả buổi, cửa hàng im ắng, ít khách ghé thăm.' },
  { id: 'competitor', icon: '⚔️', title: 'Đối thủ giảm giá', kind: 'bad', traffic: 0.85, days: 2,
    blurb: 'Cửa hàng đối diện bày trò giảm giá, khách bị hút sang bên đó.' },
];

type Season = 'summer' | 'autumn' | 'winter' | 'spring';

/** Sự kiện theo mùa được phép xuất hiện. */
const SEASON_POOL: Record<Season, string[]> = {
  summer: ['heatwave', 'rain', 'opening', 'lucky', 'bad_weather'],
  autumn: ['opening', 'lucky', 'rain', 'roadwork', 'competitor'],
  winter: ['opening', 'lucky', 'competitor', 'outage', 'roadwork'],
  spring: ['rain', 'lucky', 'opening', 'competitor', 'outage'],
};

/** Chọn sự kiện cho một ngày; xác định theo seed/day. Xác suất ~15% số ngày. */
export function eventOn(seed: number, day: number, level: number): RandomEvent | null {
  if (day < 2) return null;
  // ~15% số ngày có sự kiện (ngưỡng 0.15).
  if (roll(seed, day, 7) > 0.15) return null;

  const season = seasonOf(day);
  const poolIds = SEASON_POOL[season];

  // Đôi khi ta vẫn muốn sự kiện ngoài mùa để đa dạng (50%). level dùng làm muối phụ.
  const useSeasonal = roll(seed, day, 13) < 0.5;
  const all: RandomEvent[] = useSeasonal
    ? poolIds
        .map((id) => RANDOM_EVENTS.find((e) => e.id === id)!)
        .filter(Boolean)
    : [...RANDOM_EVENTS];

  // level làm muối phụ để sự chọn lệch theo cấp độ chơi.
  const idx = Math.floor(roll(seed, day, 17 + level) * all.length);
  return all[idx] ?? null;
}

/** Câu báo buổi sáng nếu hôm nay có sự kiện. */
export function eventMorning(seed: number, day: number, level: number): string | null {
  const e = eventOn(seed, day, level);
  if (!e) return null;
  const tone = e.kind === 'good' ? 'Tin vui: ' : 'Cẩn thận: ';
  return `${tone}${e.icon} ${e.title} — ${e.blurb}`;
}
