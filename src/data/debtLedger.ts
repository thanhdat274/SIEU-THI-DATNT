/**
 * GĐ150 "Ghi sổ đang khóa bao nhiêu tiền, ai sắp quỵt nợ?" — đưa hộp đen Sổ nợ ra con số tiền/ngày.
 *
 * Khách quen đủ thân quên ví được "ghi sổ" (`checkoutOnCredit`, regulars.ts:117-129): doanh thu ghi
 * như thường rồi RÚT tiền khỏi két chuyển vào `s.debts[regularId]` — tiền mặt biến thành IOU (món nợ).
 * Nợ quá `DEBT_LATE_DAYS` (7) nên nhắc; quá `DEBT_WRITE_OFF_DAYS` (14) thì hết ngày coi như MẤT HẲN
 * (`endDay.ts:160-171`, chỉ 1 toast transient '📕 quỵt nợ', không có sổ gộp lỗ nợ xấu). DebtBook
 * (ReportPanels.tsx:950) chỉ hiện tổng nợ hiện tại + từng dòng, KHÔNG tách theo tuổi nợ / nguy cơ mất hẳn.
 *
 * Helper này THUẦN đọc `s.debts` + `s.day` (+ `s.regulars.friendship` khi muốn hạn mức/dự phóng trả),
 * không đổi state/save/kinh tế/SAVE_VERSION. Mọi số liệu đọc từ state có sẵn.
 */
import { DEBT_LATE_DAYS, DEBT_WRITE_OFF_DAYS } from './credit';
import type { Debt } from './credit';
import { formatMoney } from './products';

/** Một dòng nợ đã "định giá rủi ro". */
export interface DebtRow {
  regularId: string;
  amount: number;
  /** Tuổi nợ theo ngày = day − since. */
  age: number;
  /** Còn bao nhiêu ngày nữa thì mất hẳn (nếu ≤ 0 thì cuối NGÀY NÀY sẽ bị xoá — coi như mất). */
  daysLeft: number;
  /** Đã nhắc nợ chưa (đã nhắc → lần ghé tới chắc chắn trả). */
  reminded?: boolean;
  /** Quá hạn nên nhắc (age ≥ DEBT_LATE_DAYS). */
  late: boolean;
  /** Sẽ bị xoá (mất hẳn) khi hết hôm nay (daysLeft ≤ 0). */
  writeOffTonight: boolean;
}

/** Tổng hợp rủi ro toàn bộ Sổ nợ. */
export interface DebtLedger {
  /** Số khách đang nợ (amount > 0). */
  count: number;
  /** Tổng tiền mặt đang bị khóa thành nợ (Σ amount). */
  lockedTotal: number;
  /** Số món nợ quá hạn nên nhắc (age ≥ 7, chưa bị xoá). */
  lateCount: number;
  /** Tổng tiền các món nợ quá hạn nên nhắc. */
  lateAmount: number;
  /** Tổng tiền các món nợ chuẩn bị mất hẳn (daysLeft ≤ 0 — tối nay bị xoá). */
  writeOffTonightAmount: number;
  rows: DebtRow[];
}

/** Món nợ đang ghi = `amount > 0` (nợ 0 ngày này sạch hoặc vừa trả không tính). */
export function debtLedger(debts: Record<string, Debt> | undefined, day: number): DebtLedger {
  const rows: DebtRow[] = [];
  let lockedTotal = 0;
  let lateAmount = 0;
  let writeOffTonightAmount = 0;
  let lateCount = 0;
  for (const [rid, d] of Object.entries(debts ?? {})) {
    if (!d || d.amount <= 0) continue;
    const age = day - d.since;
    const daysLeft = DEBT_WRITE_OFF_DAYS - age;
    const writeOffTonight = daysLeft <= 0;
    const late = age >= DEBT_LATE_DAYS;
    rows.push({ regularId: rid, amount: d.amount, age, daysLeft, reminded: d.reminded, late, writeOffTonight });
    lockedTotal += d.amount;
    if (late) {
      lateCount += 1;
      lateAmount += d.amount;
    }
    if (writeOffTonight) writeOffTonightAmount += d.amount;
  }
  return { count: rows.length, lockedTotal, lateCount, lateAmount, writeOffTonightAmount, rows };
}

/** GĐ748 — dòng Sổ nợ xếp theo độ gấp: món gần bị xoá lên trước (hoà thì món tiền lớn trước). Thuần. */
export function debtRowsByUrgency(debts: Record<string, Debt> | undefined, day: number): DebtRow[] {
  return [...debtLedger(debts, day).rows].sort((a, b) => a.daysLeft - b.daysLeft || b.amount - a.amount);
}

/** GĐ747 — nợ sắp bị xoá (còn 1..`within` ngày): null nếu không có món nào. Thuần đọc. */
export function debtWriteOffSoon(debts: Record<string, Debt> | undefined, day: number, within = 3):
  { count: number; amount: number; minDaysLeft: number } | null {
  const soon = debtLedger(debts, day).rows.filter((r) => r.daysLeft > 0 && r.daysLeft <= within);
  if (!soon.length) return null;
  return {
    count: soon.length,
    amount: soon.reduce((n, r) => n + r.amount, 0),
    minDaysLeft: Math.min(...soon.map((r) => r.daysLeft)),
  };
}

/** GĐ747 — việc sáng "đòi nợ trước khi mất": nợ sắp bị xoá đang nằm sâu trong Sổ nợ (panel Khách quen),
 *  không ai nhớ mở. Chỉ hiện trong cửa sổ 3 ngày cuối; nhắc hôm nay vẫn kịp khách trả. */
export function debtDayAction(debts: Record<string, Debt> | undefined, day: number):
  { icon: string; text: string; panel: string; danger: boolean; priority: number } | null {
  const soon = debtWriteOffSoon(debts, day);
  if (!soon) return null;
  return {
    icon: '📕',
    text: `Nợ sắp mất: ${formatMoney(soon.amount)}${soon.count > 1 ? ` (${soon.count} người)` : ''} — nhắc nợ hôm nay (còn ${soon.minDaysLeft} ngày)`,
    panel: 'regulars',
    danger: true,
    priority: 1,
  };
}
