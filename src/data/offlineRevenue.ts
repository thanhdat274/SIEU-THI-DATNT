import { MINUTES_PER_SECOND } from '../core/gameTypes';

// ─────────────────────────────────────────────────────────────────────────────
// GĐ1497 — doanh thu vắng mặt: quay lại sau một thời gian, khu ăn tại chỗ vẫn
// "chạy chậm" kiếm tiền giúp. Công bằng bằng số:
//   · ≈5% tốc độ chơi thật (GĐ1531 sửa quy đổi phút/giây);
//   · thời gian tính tối đa = 30 + cấp × 5 phút THỰC;
//   · vắng < 5 phút không tính;
//   · chỉ cộng tiền — không XP, không lượt bán sao món (chặn farm);
//   · thiếu điều kiện (bàn ghế / trạm nấu / món nấu bày kệ) thì bằng 0 + lý do rõ.
// ─────────────────────────────────────────────────────────────────────────────

export const OFFLINE_EFFICIENCY = 0.55;
/** GĐ1531 — TONG-HOP Midnight C#11: vắng mặt ≈ 5% tốc độ chơi thật. Bản cũ nhân PHÚT thật với MPS
 *  (phút game / GIÂY thật) nên hụt 60× (thực tế ~0,9%). Giờ quy đổi đúng: phút thật × 60 × MPS × 5%. */
export const OFFLINE_PLAY_RATE = 0.05;
export const OFFLINE_MIN_MINUTES = 5;
/** Số phút game trong một "ngày" kinh tế (cả ngày 24h). */
export const GAME_MINUTES_PER_DAY = 24 * 60;

export const offlineCapMinutes = (level: number) => 30 + level * 5;

export interface OfflineRevenueInput {
  /** Số phút THỰC vắng mặt (từ lastSeenAt). */
  awayMinutes: number;
  level: number;
  /** Lãi bán hàng bình quân mỗi ngày gần đây (recentAvgSalesProfit). */
  recentAvgDailyProfit: number;
  /** Giá trị đơn bình quân (để ước lượng "≈ N khách đã ghé"); thiếu thì 50.000đ. */
  avgTicket?: number;
  hasDineSeat: boolean;
  hasCookStation: boolean;
  hasCookedStocked: boolean;
}

export interface OfflineRevenueResult {
  gain: number;
  customers: number;
  minutesCounted: number;
  /** Lý do khi không có thu (null = có thu bình thường). */
  reason: string | null;
}

const zero = (reason: string): OfflineRevenueResult => ({ gain: 0, customers: 0, minutesCounted: 0, reason });

export function offlineRevenue(input: OfflineRevenueInput): OfflineRevenueResult {
  if (!(input.awayMinutes >= OFFLINE_MIN_MINUTES)) return zero('vắng chưa đủ 5 phút');
  const missing = !input.hasDineSeat ? 'chưa có bàn ghế khu ăn tại chỗ'
    : !input.hasCookStation ? 'chưa có trạm nấu'
    : !input.hasCookedStocked ? 'chưa bày món nấu lên kệ'
    : null;
  if (missing) return zero(missing);
  if (!(input.recentAvgDailyProfit > 0)) return zero('chưa có lãi bán hàng gần đây để ước tính');
  const minutesCounted = Math.min(input.awayMinutes, offlineCapMinutes(input.level));
  // Phút thật → phút game (×60 giây × MPS), rồi chỉ tính 5% tốc độ chơi thật
  const gameMinutes = minutesCounted * 60 * MINUTES_PER_SECOND * OFFLINE_PLAY_RATE;
  const ratePerGameMin = input.recentAvgDailyProfit / GAME_MINUTES_PER_DAY;
  const gain = Math.round((ratePerGameMin * gameMinutes) / 100) * 100;
  const ticket = input.avgTicket && input.avgTicket > 0 ? input.avgTicket : 50_000;
  const customers = Math.max(1, Math.round((ratePerGameMin * gameMinutes) / ticket));
  return { gain, customers, minutesCounted, reason: null };
}
