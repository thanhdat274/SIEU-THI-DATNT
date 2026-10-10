/**
 * Sự kiện thành phố / sự cố ngẫu nhiên — phần lõi THUẦN (tính năng đề xuất #2, PHẦN THUẦN / PROVISIONAL).
 *
 * Ràng buộc then chốt: chơi lẻ = chơi chung. Module thuần này sinh kết quả xác định theo `(worldSeed, ngày)`
 * nên — cùng seed — cả client chơi lẻ lẫn server co-op đều tính ra ĐÚNG cùng sự kiện đang tác động vào một ngày
 * (cùng output, không cần server). Như `word-of-mouth.ts`, đây là lớp logic KHÔNG đụng luồng khách/renderer/save:
 * trả object thuần về các sự kiện active trong ngày + hệ số, giao caller (`customers.ts` / `spoilage.ts`) áp dụng
 * sau này — phần nối đó ghi rõ CHỜ MÁY THẬT (xem `tổng hợp.md`).
 *
 * Hai sự kiện ví dụ mà chủ dự án nêu:
 *  - Hội chợ khu cà phê W4 → lượng khách +50% trong 3 ngày.
 *  - Mất điện → tủ lạnh hỏng nhanh hơn (tăng tốc hư hỏng hàng lạnh/tươi trong 1 buổi).
 *
 * Ngoài ra module này cho phép bật/tắt & tinh chỉnh từng sự kiện qua `WorldEventOptions` (mặc định PROVISIONAL).
 * Phân biệt với hệ `market-events` (market.ts) đã có: hệ đó là sự kiện thị trường rộng qua ModifierRule; module
 * này là lớp sự kiện "thế giới / thành phố" gọn nhẹ, self-contained để co-op hai phía dùng chung 1 nguồn.
 */
import {
  W4_FAIR_DURATION_DAYS,
  W4_FAIR_PERIOD_DAYS,
  W4_FAIR_TRAFFIC_FACTOR,
  POWER_OUTAGE_CHANCE,
  POWER_OUTAGE_SPOILAGE_FACTOR,
  POWER_OUTAGE_MIN_GAP_DAYS,
} from './world-events-constants';

// Re-export hằng số để caller/test import gọn 1 chỗ (không cần biết file constants nội bộ).
export {
  W4_FAIR_DURATION_DAYS,
  W4_FAIR_PERIOD_DAYS,
  W4_FAIR_TRAFFIC_FACTOR,
  POWER_OUTAGE_CHANCE,
  POWER_OUTAGE_SPOILAGE_FACTOR,
  POWER_OUTAGE_MIN_GAP_DAYS,
};

export type WorldEventKind = 'w4_fair' | 'power_outage';

/** Một sự kiện đang tác động. */
export interface ActiveWorldEvent {
  kind: WorldEventKind;
  /** Nhãn hiển thị (UI sau này / log). */
  label: string;
  /** Nhân lưu lượng khách cho ngày này (1 = không đổi). */
  trafficFactor: number;
  /** Hệ số tăng tốc hư hỏng hàng lạnh/tươi cho buổi (1 = bình thường). */
  spoilageFactor: number;
}

/** Kết quả cho một ngày — cùng (seed, ngày) luôn trả cùng giá trị. */
export interface WorldEventsForDay {
  day: number;
  /** Các sự kiện đang tác động trong ngày (rỗng = không có gì). */
  events: ActiveWorldEvent[];
  /** Hệ số lưu lượng tổng hợp (tích các sự kiện, 1 = không đổi). */
  trafficFactor: number;
  /** Hệ số hư hỏng tổng hợp (lấy mạnh nhất — nếu mất điện thì đẩy nhanh). */
  spoilageFactor: number;
}

/** Tinh chỉnh (provisional) — mặc định dùng hằng số. */
export interface WorldEventOptions {
  fairPeriodDays?: number;
  fairDurationDays?: number;
  fairTrafficFactor?: number;
  powerOutageChance?: number;
  powerOutageSpoilageFactor?: number;
  powerOutageMinGapDays?: number;
}

function seedToNumber(seed: number | string): number {
  if (typeof seed === 'number') return seed & 0x7fffffff;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0x7fffffff;
  return h;
}

function seededRoll(worldSeed: number | string, day: number, stream: number): number {
  let h = (seedToNumber(worldSeed) * 31 + day * 101 + stream * 59) & 0x7fffffff;
  h = Math.imul(h, 2654435761) >>> 0;
  return (h % 10000) / 10000;
}

/** Pha (ngày lệch) của nhịp hội chợ — cố định cho 1 seed, để hội chợ lặp theo nhịp ổn định. */
function fairPhase(worldSeed: number | string, period: number): number {
  return Math.floor(seededRoll(worldSeed, 4700, 7) * period);
}

/**
 * Hội chợ khu cà phê W4: đúng 3 ngày (+50% khách), lặp theo nhịp `fairPeriodDays`.
 * Deterministic theo seed (pha) + ngày (slot). `dayActive = day nằm trong [slotStart, slotStart+duration-1]`.
 */
function w4FairActive(worldSeed: number | string, day: number, opts: Required<Pick<WorldEventOptions, 'fairPeriodDays' | 'fairDurationDays'>>): boolean {
  const phase = fairPhase(worldSeed, opts.fairPeriodDays);
  const slotStart = Math.floor((day - phase) / opts.fairPeriodDays) * opts.fairPeriodDays + phase;
  return day >= slotStart && day < slotStart + opts.fairDurationDays;
}

/**
 * Mất điện: tủ lạnh hỏng nhanh hơn trong ~1 buổi. Dùng per-day roll xác định (stream 11) kết hợp chống dồn
 * ngày liên tiếp bằng cách bỏ qua nếu ngày trước cũng đang bật (min-gap). Deterministic theo (seed, ngày).
 */
function powerOutageActive(
  worldSeed: number | string,
  day: number,
  opts: Required<Pick<WorldEventOptions, 'powerOutageChance' | 'powerOutageMinGapDays'>>,
): boolean {
  if (seededRoll(worldSeed, day, 11) >= opts.powerOutageChance) return false;
  // Chống dồn: không bật nếu nằm trong khoảng gap so với lần bật gần nhất (suy từ roll các ngày trước).
  for (let back = 1; back <= opts.powerOutageMinGapDays; back++) {
    if (seededRoll(worldSeed, day - back, 11) < opts.powerOutageChance) return false;
  }
  return true;
}

/**
 * Sự kiện thế giới active trong ngày `day` — THUẦN, deterministic theo `(worldSeed, day)`.
 * Trả đúng cùng kết quả cho chơi lẻ lẫn co-op.
 */
export function worldEventsForDay(worldSeed: number | string, day: number, opts: WorldEventOptions = {}): WorldEventsForDay {
  const o = {
    fairPeriodDays: opts.fairPeriodDays ?? W4_FAIR_PERIOD_DAYS,
    fairDurationDays: opts.fairDurationDays ?? W4_FAIR_DURATION_DAYS,
    fairTrafficFactor: opts.fairTrafficFactor ?? W4_FAIR_TRAFFIC_FACTOR,
    powerOutageChance: opts.powerOutageChance ?? POWER_OUTAGE_CHANCE,
    powerOutageSpoilageFactor: opts.powerOutageSpoilageFactor ?? POWER_OUTAGE_SPOILAGE_FACTOR,
    powerOutageMinGapDays: opts.powerOutageMinGapDays ?? POWER_OUTAGE_MIN_GAP_DAYS,
  };

  const events: ActiveWorldEvent[] = [];
  let trafficFactor = 1;
  let spoilageFactor = 1;

  if (w4FairActive(worldSeed, day, o)) {
    events.push({ kind: 'w4_fair', label: 'Hội chợ Cà phê W4', trafficFactor: o.fairTrafficFactor, spoilageFactor: 1 });
    trafficFactor *= o.fairTrafficFactor;
  }
  if (powerOutageActive(worldSeed, day, o)) {
    events.push({ kind: 'power_outage', label: 'Mất điện', trafficFactor: 1, spoilageFactor: o.powerOutageSpoilageFactor });
    spoilageFactor = Math.max(spoilageFactor, o.powerOutageSpoilageFactor);
  }

  return { day, events, trafficFactor, spoilageFactor };
}

/**
 * Liệt kê tất cả các ngày nằm trong cửa sổ `[fromDay..toDay]` có sự kiện — thuận tiện cho caller
 * (bản tin sáng, đồng bộ, UI) cần biết đợt sự kiện liên tục. Deterministic theo seed.
 */
export function worldEventsBetween(
  worldSeed: number | string,
  fromDay: number,
  toDay: number,
  opts?: WorldEventOptions,
): WorldEventsForDay[] {
  const out: WorldEventsForDay[] = [];
  for (let day = fromDay; day <= toDay; day++) {
    const r = worldEventsForDay(worldSeed, day, opts);
    if (r.events.length > 0) out.push(r);
  }
  return out;
}
