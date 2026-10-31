/**
 * GĐ214 "Tối nay có 'đáy' không?" — bảng cân đối thanh khoản khi có nợ.
 * Ghim nối hai hệ tiền: tài sản LỎNG (tiền mặt + trị giá kho bán hết — tái dùng GĐ213
 * `stockCapital`) đối chiếu NỢ PHẢI TRẢ (gốc vay ngân hàng). Trả lời câu hỏi thật của
 * người chơi: "nếu hôm nay không bán thêm đồng nào, bán hết kho + cộng tiền mặt có đủ
 * trả nợ đến hạn không?" — rủi ro vỡ nợ. Kèm dòng tiền ra hằng ngày ngoài quầy: lãi vay
 * tối nay (`loanInterest`) + góp hụi hôm nay (nếu đang góp chưa hốt).
 * THUẦN ĐỌC: không đổi state/kinh tế/SAVE_VERSION.
 */

import { loanInterest, type Loan, type Hui } from './biz';
import { stockCapital } from './stockCapital';

export interface SolvencyView {
  /** Tiền mặt đang cầm. */
  cash: number;
  /** Trị giá bán hết tồn kho theo giá lẻ hiện tại. */
  stockRetail: number;
  /** cash + stockRetail — số tiền cứu cánh tối đa nếu xả toàn bộ. */
  liquid: number;
  /** Gốc vay ngân hàng còn nợ (0 = không nợ). */
  loanPrincipal: number;
  /** Lãi phải gom tối nay (nếu đang nợ). */
  loanInterestToday: number;
  /** Góp hụi hôm nay (đang góp và chưa hốt). */
  huiDueToday: number;
  /** Nợ phải trả (gốc vay). */
  liabilities: number;
  /** liquid ≥ liabilities chưa. */
  cover: boolean;
  /** liquid − liabilities. */
  margin: number;
  /** Còn bao nhiêu ngày tới hạn trả gốc vay (null = không nợ). */
  daysToLoanDue: number | null;
}

/** Trả bảng cân đối thanh khoản của cửa tiệm hôm nay. */
export function solvency(store: {
  money: number;
  storage: Record<string, number>;
  priceOf: (id: string) => number;
  loan: Loan | null;
  hui: Hui | null;
  day: number;
}): SolvencyView {
  const cap = stockCapital(store.storage, store.priceOf);
  const stockRetail = cap ? cap.totalRetail : 0;
  const cash = Math.max(0, store.money);
  const liquid = cash + stockRetail;
  const loanPrincipal = store.loan ? store.loan.principal : 0;
  const loanInterestToday = store.loan ? loanInterest(store.loan.principal) : 0;
  const huiDueToday = store.hui && !store.hui.received ? store.hui.daily : 0;
  const liabilities = loanPrincipal;
  return {
    cash,
    stockRetail,
    liquid,
    loanPrincipal,
    loanInterestToday,
    huiDueToday,
    liabilities,
    cover: liquid >= liabilities,
    margin: liquid - liabilities,
    daysToLoanDue: store.loan ? store.loan.dueDay - store.day : null,
  };
}
