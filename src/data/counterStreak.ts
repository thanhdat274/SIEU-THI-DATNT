/**
 * GĐ1320 — "Đối đầu liền nhiều ngày: đòn hôm nay mạnh hơn bao nhiêu?" soi chuỗi phản công.
 * MarketTab 🎯 Phản công chỉ hiện giá trị của ĐÚNG `def.hit` (GĐ159: "Bớt ~9 sức mạnh") — nhưng `hit` thật
 * của một đợt còn được cộng thêm tối đa COUNTER_STREAK_MAX(+3) nếu chủ chạy phản công NHIỀU NGÀY LIỀN
 * (core/biz.ts:214-216 streak = counterLastDay === day−1 ? counterStreak+1 : 1; hit = def.hit + min(streak−1, max)).
 * Hiện chỉ có NOTIFY cuối ngày ("🔥 Đối đầu ngày thứ X liền…") báo SAU khi đòn đã rơi — CHƯA ai hiện con số
 * TRƯỚC khi quyết định chạy/dừng hôm nay (hộp đen, Nguyên tắc a). Helper THUẦN: tái dựng đúng chuỗi từ
 * counterLastDay/counterStreak — CHỈ nhân/gộp số ghi sẵn (Nguyên tắc c); đòn giá chỉ tính khi bán đủ
 * PRICE_WAR_MIN_SALES nên dòng giá kèm đúng điều kiện (không bịa đòn chắc chắn). KHÔNG import store
 * (co-op an toàn), không đổi kinh tế/save/seed (Luật 5).
 */
import { COUNTER_STREAK_MAX, counterById, PRICE_WAR_MIN_SALES, type Counter, type CounterTactic } from './bizFinance';

export interface CounterStreakInfo {
  /** Chiến thuật đang chạy hôm nay. */
  tactic: CounterTactic;
  /** Số ngày liền chạy phản công tính tới hôm nay (tối thiểu 1). */
  streak: number;
  /** Sức mạnh cộng thêm nhờ chuỗi (min(streak−1, COUNTER_STREAK_MAX)). */
  bonus: number;
  /** Sức mạnh rival mất trong đêm nay = def.hit + bonus (giá: nếu đủ 30 món). */
  hit: number;
  /** Dòng soi ngắn (≤90 code point) — chỉ khi đang chạy hôm nay VÀ có chuỗi ≥2; null khi không (không ồn). */
  line: string | null;
}

const fmt = (v: number) => `${v}`;

/** Dòng chuỗi phản công cho chiến thuật đang chạy hôm nay. Dòng RỖNG khi chưa chạy / chưa có chuỗi. THUẦN. */
export function counterStreakInfo(
  counter: Counter | null | undefined,
  day: number,
  counterLastDay: number | undefined,
  counterStreak: number | undefined,
): CounterStreakInfo {
  const emptyTactic: CounterTactic = counter?.tactic ?? 'price';
  const baseDef = counterById(emptyTactic);
  const base: CounterStreakInfo = { tactic: emptyTactic, streak: 1, bonus: 0, hit: baseDef.hit, line: null };
  if (!counter || counter.day !== day) return base;
  const def = counterById(counter.tactic);
  const streak = counterLastDay === day - 1 ? (counterStreak ?? 0) + 1 : 1;
  const bonus = Math.min(streak - 1, COUNTER_STREAK_MAX);
  const hit = def.hit + bonus;
  let line: string | null = null;
  if (streak >= 2) {
    line = counter.tactic === 'price'
      ? `⚔️ Phản công ngày thứ ${fmt(streak)} liền: bán đủ ${PRICE_WAR_MIN_SALES} món → mất ${fmt(hit)} sức mạnh (chuỗi +${fmt(bonus)}, thường ${fmt(def.hit)}).`
      : `⚔️ Phản công ngày thứ ${fmt(streak)} liền: đêm nay mất ${fmt(hit)} sức mạnh (chuỗi +${fmt(bonus)}, thường ${fmt(def.hit)}).`;
  }
  return { tactic: counter.tactic, streak, bonus, hit, line };
}
