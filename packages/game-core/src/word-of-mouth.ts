/**
 * Lời chê / truyền miệng của khách VIP bực bội — phần lõi thuần (tính năng đề xuất #1, PHẦN THUẦN / PROVISIONAL).
 *
 * Ràng buộc then chốt của chủ dự án: logic chơi lẻ và chơi chung PHẢI giống hệt nhau. Module này thuần,
 * sinh kết quả xác định theo `(worldSeed, ngày mở/khởi nguồn)` nên — cùng seed — cả client chơi lẻ lẫn
 * server co-op đều tính ra đúng cùng cửa sổ "lời chê" (số ngày, hệ số ít khách). Như `special-request.ts`,
 * đây là lớp logic KHÔNG đụng luồng khách/renderer/save: trả object thuần, giao caller (`customers.ts` /
 * `simulation.ts`) nhân vào lưu lượng khách sau này — phần nối đó ghi rõ CHỜ MÁY THẬT.
 */
import { SPECIAL_REQUEST_MAP } from '@game/data';
import type { SpecialRequestState } from './special-request';

/** Một lần VIP bực bội (bỏ qua/hết hạn) làm khởi nguồn cho một "lời chê". */
export interface WordOfMouthVexation {
  defId: string;
  /** ngày game mà yêu cầu này mở (và bị bỏ qua). */
  openDay: number;
}

/** Một cửa sổ "lời chê" đang đè lên ngày `day`: khách ít hơn với hệ số `trafficFactor`. */
export interface WordOfMouthSource {
  defId: string;
  openDay: number;
  fromDay: number;
  toDay: number;
  trafficFactor: number;
}

/** Kết quả gộp cho một ngày. */
export interface WordOfMouthEffect {
  /** có lời chê nào đang tác động vào ngày `day` không. */
  active: boolean;
  /** hệ số lưu lượng cần nhân (1 = không đổi); nếu nhiều nguồn lấy hệ số mạnh nhất. */
  trafficFactor: number;
  /** các nguồn đang tác động (để giải thích cho UI / log). */
  sources: WordOfMouthSource[];
}

/** Số ngày "lời chê" tối đa lan từ mỗi lần bực bội (1–2, provisional). */
export const WORD_OF_MOUTH_MIN_DAYS = 1;
export const WORD_OF_MOUTH_MAX_DAYS = 2;
/** Hệ số ít khách tối đa/ tối thiểu (provisional, cần playtest). */
export const WORD_OF_MOUTH_FACTOR_MIN = 0.7;
export const WORD_OF_MOUTH_FACTOR_MAX = 0.9;

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

/** Mỗi lần bực bội sinh một cửa sổ xác định (lan từ hôm sau, dài 1–2 ngày, hệ số xác định). */
export function wordOfMouthForVexation(worldSeed: number | string, vex: WordOfMouthVexation): WordOfMouthSource {
  const fromDay = vex.openDay + 1;
  const len = WORD_OF_MOUTH_MIN_DAYS + (seededRoll(worldSeed, vex.openDay, 5) < 0.5 ? 1 : 0);
  const factor =
    WORD_OF_MOUTH_FACTOR_MIN +
    (WORD_OF_MOUTH_FACTOR_MAX - WORD_OF_MOUTH_FACTOR_MIN) * seededRoll(worldSeed, vex.openDay, 6);
  return { defId: vex.defId, openDay: vex.openDay, fromDay, toDay: fromDay + len - 1, trafficFactor: Math.min(WORD_OF_MOUTH_FACTOR_MAX, Math.max(WORD_OF_MOUTH_FACTOR_MIN, factor)) };
}

/** Tính tác động "lời chê" cho một ngày `day` — thuần, deterministic theo seed. */
export function wordOfMouthEffect(worldSeed: number | string, vexations: WordOfMouthVexation[], day: number): WordOfMouthEffect {
  const sources = vexations
    .map((v) => wordOfMouthForVexation(worldSeed, v))
    .filter((s) => day >= s.fromDay && day <= s.toDay);
  if (sources.length === 0) return { active: false, trafficFactor: 1, sources: [] };
  const trafficFactor = Math.min(...sources.map((s) => s.trafficFactor));
  return { active: true, trafficFactor, sources };
}

/** Rút các lần VIP bực bội từ trạng thái yêu cầu đặc biệt (các yêu cầu VIP đã hết hạn). */
export function vexationsFromSpecialRequest(state: SpecialRequestState): WordOfMouthVexation[] {
  const out: WordOfMouthVexation[] = [];
  for (const a of state.active) {
    if (a.status !== 'expired') continue;
    const def = SPECIAL_REQUEST_MAP[a.defId];
    if (def && def.tier.includes('vip')) out.push({ defId: a.defId, openDay: a.openDay });
  }
  return out;
}
