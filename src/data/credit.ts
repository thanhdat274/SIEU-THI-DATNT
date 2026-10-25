import type { RegularDef, RegularProgress } from './regulars';

/** Sổ nợ: khách quen đủ thân được ghi sổ, lần ghé sau trả. */
export interface Debt {
  amount: number;
  /** Ngày ghi món nợ đầu tiên chưa trả. */
  since: number;
  /** Chủ tiệm đã nhắc nợ: lần ghé tới chắc chắn trả, nhưng khách hơi ngại. */
  reminded?: boolean;
}

export const CREDIT_UNLOCK = 4;
/** Thân thiết tối thiểu để được ghi sổ. */
export const CREDIT_FRIENDSHIP = 12;
/** Tỉ lệ một lần ghé khách quên ví và xin ghi sổ. */
export const CREDIT_ASK_CHANCE = 0.25;
/** Nợ quá chừng này ngày thì khách tự thấy ngại, giảm thân thiết; quá hạn chót thì coi như mất. */
export const DEBT_LATE_DAYS = 7;
export const DEBT_WRITE_OFF_DAYS = 14;
export const REMIND_FRIEND_LOSS = 2;
export const FORGIVE_FRIEND_GAIN = 6;
export const WRITE_OFF_FRIEND_LOSS = 10;

/** Hạn mức ghi sổ: càng thân càng được nợ nhiều. */
export const creditLimit = (p: RegularProgress | undefined) => 50000 + Math.max(0, p?.friendship ?? 0) * 2000;

/** Khách quen này hôm nay có xin ghi sổ không (đủ thân, chưa vượt hạn mức, quên ví). */
export function wantsCredit(def: RegularDef, p: RegularProgress | undefined, debt: Debt | undefined, total: number, roll: number) {
  if ((p?.friendship ?? 0) < CREDIT_FRIENDSHIP) return false;
  if ((debt?.amount ?? 0) + total > creditLimit(p)) return false;
  // Khách kỹ tính về giá (nhạy giá cao) thì hay xin ghi sổ hơn một chút
  return roll < CREDIT_ASK_CHANCE * def.priceSensitivity;
}

/** Lần ghé này khách có trả nợ cũ không: nợ từ hôm qua trở về trước; đã nhắc thì chắc chắn trả. */
export function repaysToday(debt: Debt | undefined, day: number, roll: number) {
  if (!debt || debt.amount <= 0 || debt.since >= day) return false;
  return debt.reminded || roll < 0.7;
}
