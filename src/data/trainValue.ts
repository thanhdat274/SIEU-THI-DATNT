/**
 * GĐ223 "Đào tạo nhân viên có đáng không?" — đổi hiệu quả đào tạo (`staffEff`) thành TIỀN/ngày.
 * staffEff đã cho biết +1★ tăng tốc bao nhiêu % và mỗi buổi học giá bao nhiêu; chưa cho biết món
 * đó "đáng" hay không theo TIỀN nhân viên đang đem về. Helper này THUẦN ĐỌC: lấy giá trị ngày của
 * nhân viên (`staffValueToday.value` — doanh thu ca mình phủ), nhân với % tăng tốc lên 1★ → mức tăng
 * giá trị/ngày, so với tổng chi phí đủ lên 1★ (số buổi × giá buổi) → SỐ NGÀY HOÀ VỐN. Không đổi
 * state/kinh tế. Nhịp: đào tạo ai, và lên sao nhanh khi nào mới đáng.
 */

import type { StaffEff } from './staffEff';

/** Mỗi buổi đào tạo cộng bấy nhiêu kinh nghiệm (khớp comment staffTraits "cộng 4 exp"). */
export const TRAIN_EXP_PER_SESSION = 4;
/** Hoà vốn trong ≤14 ngày thì coi là đáng đào tạo. */
export const TRAIN_WORTH_DAYS = 14;

export interface TrainValue {
  maxed: boolean;
  /** % tăng tốc nếu lên 1★ (từ staffEff). */
  speedGainPct: number;
  /** Giá trị ngày dùng để ước (doanh thu ca phủ). */
  valueNow: number;
  /** Mức tăng giá trị/ngày ước (±) sau +1★. */
  valueGainPerDay: number;
  /** Số buổi đào tạo cần để lên 1★. */
  sessions: number;
  /** Tổng tiền bỏ ra để lên 1★. */
  costToNext: number;
  /** Số ngày hoà vốn (null khi chưa ước được — chưa có dữ liệu ngày). */
  paybackDays: number | null;
  /** Đáng đào tạo không (hoà vốn ≤ TRAIN_WORTH_DAYS). */
  worth: boolean;
}

export function trainValue(dailyValue: number, eff: StaffEff): TrainValue {
  if (eff.maxed) {
    return { maxed: true, speedGainPct: 0, valueNow: dailyValue, valueGainPerDay: 0, sessions: 0, costToNext: 0, paybackDays: null, worth: false };
  }
  const sessions = Math.ceil(eff.expNeeded / TRAIN_EXP_PER_SESSION);
  const costToNext = sessions * eff.trainCost;
  const speedGainPct = eff.nextDeltaPct;
  const valueGainPerDay =
    dailyValue > 0 && speedGainPct > 0 ? Math.round((dailyValue * speedGainPct) / 100) : 0;
  const paybackDays = valueGainPerDay > 0 ? Math.ceil(costToNext / valueGainPerDay) : null;
  return {
    maxed: false,
    speedGainPct,
    valueNow: dailyValue,
    valueGainPerDay,
    sessions,
    costToNext,
    paybackDays,
    worth: paybackDays !== null && paybackDays <= TRAIN_WORTH_DAYS,
  };
}
