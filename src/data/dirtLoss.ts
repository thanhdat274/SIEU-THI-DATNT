/**
 * GĐ241 "Sàn bẩn mất bao nhiêu khách? — lau có đáng?" — định lượng tổn thất do tiệm bẩn.
 *
 * Độ bẩn sàn (dirt 0–100) giảm trực tiếp xác suất khách đi đường ghé qua:
 *   dirtVisitFactor(dirt) = 1 − (dirt/100) × 0.4  (staff.ts:49, customers.ts:203 nhân vào visit)
 * nghĩa là sàn bẩn nhất mất tới 40% lượt ghé. HUD chỉ nhắc "bẩn, bấm [C] lau" nhưng KHÔNG cho con
 * số "bẩn đang tốn bao nhiêu khách/ngày ≈ tiền" để quyết định dừng tay lau sớm. Helper này THUẦN ĐỌC
 * (dirt + level + doanh thu/khách thật hôm nay), cùng mô hình của repPayoff (GĐ148): khách mất = phần
 * mất × customersPerDay(level); tiền mất = khách mất × doanh thu trung bình mỗi lượt. Không RNG/seed.
 */
import { customersPerDay } from './levels';
import { DIRT_MAX, DIRT_VISIT_PENALTY, dirtVisitFactor } from './staff';

export interface DirtLoss {
  dirt: number;
  /** Hệ số khách ghé hiện tại (1 = sạch; nhỏ hơn = bẩn). */
  dirtFactor: number;
  /** Phần lượt ghé bị mất do bẩn (0–0.4). */
  lostFraction: number;
  /** Ước khách mất mỗi ngày = customersPerDay(level) × lostFraction. */
  lostKhachPerDay: number;
  /** Doanh thu trung bình mỗi lượt khách hôm nay. */
  avgPerVisit: number;
  /** Ước tiền mất mỗi ngày = lostKhach × avgPerVisit. */
  moneyLostPerDay: number;
  verdict: 'clean' | 'warn' | 'danger';
}

/** Từ mốc này (khách mất/ngày) độ bẩn đáng chú ý. */
export const DIRT_LOSS_WARN_KHACH = 4;
export const DIRT_LOSS_DANGER_KHACH = 12;

export function dirtLoss(opts: {
  dirt: number;
  level: number;
  customers: number;
  revenue: number;
}): DirtLoss {
  const { dirt, level, customers, revenue } = opts;
  const dirtFactor = dirtVisitFactor(dirt);
  const lostFraction = Math.min(1, dirt / DIRT_MAX) * DIRT_VISIT_PENALTY;
  const lostKhachPerDay = customersPerDay(level) * lostFraction;
  const avgPerVisit = customers > 0 ? revenue / customers : 0;
  const moneyLostPerDay = lostKhachPerDay * avgPerVisit;

  let verdict: DirtLoss['verdict'];
  if (lostKhachPerDay >= DIRT_LOSS_DANGER_KHACH) verdict = 'danger';
  else if (lostKhachPerDay >= DIRT_LOSS_WARN_KHACH) verdict = 'warn';
  else verdict = 'clean';

  return { dirt, dirtFactor, lostFraction, lostKhachPerDay, avgPerVisit, moneyLostPerDay, verdict };
}
