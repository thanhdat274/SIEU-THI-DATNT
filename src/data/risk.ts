/**
 * Sổ rủi ro / trộm (GĐ58 "Tiền bay đi đâu"): trực quan hóa chi tiêu an ninh (camera/chó/mắt tinh/manager/
 * thu ngân trực) thành vòng "an ninh đáng công / đang lọt" — THUẦN QUAN SÁT, không đổi kinh tế/odds.
 * Chỉ import types/hằng số (không import module kinh doanh) → không có vòng lặp import.
 */

/** Rủi ro tích lũy trong một ngày ở tiệm chính (thứ LỌT thật vs thứ CHẶN/thu lại + số lần). */
export interface RiskToday {
  /** Giá trị thật bị lọt (trộm ko bắt + tiền giả lọt + shrinkCash + goodsTaken×giá nhập). */
  leak: number;
  /** Giá trị chặn/thu lại (phạt trộm + tiền giả phát hiện + nhân viên gian lận bắt quả tang). */
  blocked: number;
  /** Số lần rủi ro xảy ra trong ngày. */
  events: number;
}

/** Một ngày ghi nhận trong sổ rủi ro (append cuối ngày, giữa cửa sổ lăn). */
export interface RiskDay extends RiskToday {
  day: number;
}

/** Số ngày gần nhất giữ để vẽ xu hướng rủi ro. */
export const RISK_TREND_DAYS = 14;

/** Lọt rủi ro ≤ 1% doanh thu là 'ok' (đáng bỏ qua). */
export const LEAK_OK_PCT = 0.01;
/** Lọt rủi ro > 3% doanh thu là 'bad' (cần can thiệp). */
export const LEAK_BAD_PCT = 0.03;

export type LeakTone = 'ok' | 'warn' | 'bad';
export type RiskDir = 'up' | 'down' | 'flat';

export const emptyRiskToday = (): RiskToday => ({ leak: 0, blocked: 0, events: 0 });

/** Xếp loại mức lọt rủi ro so với doanh thu: 'ok' ≤1%, 'warn' 1–3%, 'bad' >3%. */
export function leakTone(leak: number, revenue: number): LeakTone {
  if (revenue <= 0) return 'ok'; // chưa có doanh thu thì không đánh giá
  const pct = leak / revenue;
  return pct > LEAK_BAD_PCT ? 'bad' : pct > LEAK_OK_PCT ? 'warn' : 'ok';
}

/** Dòng hiển thị rủi ro của một ngày: gom 3 con số về đúng shape để UI render gọn. */
export function riskLiveToday(rt: RiskToday): { leak: number; blocked: number; events: number } {
  return { leak: rt.leak || 0, blocked: rt.blocked || 0, events: rt.events || 0 };
}

export interface RiskTrendSummary {
  /** Tổng lọt nửa gần (7 ngày cuối cửa sổ). */
  leakLast: number;
  /** Tổng lọt nửa trước (7 ngày kế trước đó). */
  leakEarly: number;
  /** leakLast − leakEarly. */
  leakDelta: number;
  /** % thay đổi so nửa trước (tránh chia 0). */
  leakPct: number;
  /** Hướng lọt rủi ro: chỉ 'up'/'down' khi |Δ| ≥ 3%, còn lại 'flat'. */
  leakDir: RiskDir;
  /** Tổng chặn nửa gần (7 ngày cuối). */
  blockLast: number;
  /** blockLast − blockEarly (chặn nửa trước). */
  blockDelta: number;
  /** Tổng lọt 7 ngày gần nhất. */
  weekLeak: number;
  /** Tổng chặn 7 ngày gần nhất. */
  weekBlocked: number;
  /** Tổng số lần rủi ro trong toàn cửa sổ. */
  events: number;
  /** Số ngày có dữ liệu. */
  days: number;
}

const emptySummary = (): RiskTrendSummary => ({
  leakLast: 0, leakEarly: 0, leakDelta: 0, leakPct: 0, leakDir: 'flat',
  blockLast: 0, blockDelta: 0, weekLeak: 0, weekBlocked: 0, events: 0, days: 0,
});

/** Tóm tắt xu hướng rủi ro 14 ngày: so lọt/chặn nửa gần (7 ngày cuối) vs nửa trước (7 ngày kế trước đó). */
export function riskTrendSummary(rv: RiskDay[]): RiskTrendSummary {
  const n = rv.length;
  if (n === 0) return emptySummary();
  const half = Math.min(7, n); // nửa gần tối đa 7 ngày
  const recent = rv.slice(n - half);
  const earlier = rv.slice(0, n - half);
  const sum = (xs: RiskDay[], pick: (d: RiskDay) => number) => xs.reduce((acc, d) => acc + pick(d), 0);
  const leakLast = sum(recent, (d) => d.leak);
  const leakEarly = sum(earlier, (d) => d.leak);
  const blockLast = sum(recent, (d) => d.blocked);
  const blockEarly = sum(earlier, (d) => d.blocked);
  const leakDelta = leakLast - leakEarly;
  const leakPct = leakEarly === 0 ? (leakLast > 0 ? 100 : 0) : Math.round((leakLast / leakEarly - 1) * 100);
  // Nhiễu ngày nhỏ (<3%) không nên đánh lừa: đặt mốc 'up'/'down' rõ ràng.
  const leakDir: RiskDir = leakLast > leakEarly * 1.03 ? 'up' : leakLast < leakEarly * 0.97 ? 'down' : 'flat';
  const week = rv.slice(-7); // 7 ngày gần nhất để báo "tuần này"
  return {
    leakLast, leakEarly, leakDelta, leakPct, leakDir,
    blockLast, blockDelta: blockLast - blockEarly,
    weekLeak: sum(week, (d) => d.leak), weekBlocked: sum(week, (d) => d.blocked),
    events: sum(rv, (d) => d.events), days: n,
  };
}
