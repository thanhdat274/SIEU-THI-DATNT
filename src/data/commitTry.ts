/**
 * Cam kết kỳ hợp đồng có đáng không (GĐ231)?
 *
 * "Cam kết kỳ" ở panel Hợp đồng: đặt cọc 10% giá trị kỳ (hoàn khi giao) + trữ riêng đúng hàng kỳ này
 * để được thưởng tin cậy +6%. ContractsPanel đã hiện cọc & thưởng nhưng chưa nói ĐÁNG KHÔNG về dòng
 * tiền: cọc là tiền KHÓA KHÔNG SINH LỜI, hàng trữ riêng là VỐN bị giữ không bán lẻ được. Helper này
 * gộp 3 con số — cọc, vốn khóa (Σ món × giá mua), thưởng tin cậy — để quyết có cọc hay không, khớp
 * trục solvency (GĐ214) / dailyBurn (GĐ224): chỉ đáng khi tiền mặt còn dư, hàng có sẵn, cọc không
 * chiếm phần lớn tiền. THUẦN ĐỌC: chỉ đọc định nghĩa hợp đồng + hằng số thưởng/cọc, không đổi state.
 */
import type { SupplyContract } from './contracts';
import { commitBonusValue, commitDeposit } from './contracts';
import { productById } from './products';

export type CommitVerdict = 'worth' | 'tight' | 'skip';

export interface CommitTry {
  /** Cọc phải bỏ ra trước (hoàn lại khi giao). */
  deposit: number;
  /** Thưởng tin cậy nhận được (cộng vào trả kỳ này). */
  bonus: number;
  /** Vốn khóa khi trữ riêng đúng hàng kỳ này (Σ món × giá mua) — không bán lẻ được trong lúc chờ. */
  reservedValue: number;
  /** Phần tiền mặt đang bị cọc chiếm (0 nếu không có tiền). */
  depositShareOfCash: number;
  verdict: CommitVerdict;
}

/** Cọc ≥ 25% tiền mặt hiện có → chật, để dòng tiền thoáng hơn. */
export const COMMIT_DEPOSIT_CASH_RATIO = 0.25;
/** Vốn khóa ≥ 50% tiền mặt hiện có → khóa vốn nhiều, cân nhắc. */
export const COMMIT_RESERVED_CASH_RATIO = 0.5;

export function commitTry(def: SupplyContract, money: number): CommitTry {
  const deposit = commitDeposit(def);
  const bonus = commitBonusValue(def);
  let reservedValue = 0;
  for (const [id, q] of Object.entries(def.items)) reservedValue += productById(id).buy * q;
  const share = money > 0 ? deposit / money : 1;
  let verdict: CommitVerdict = 'worth';
  if (money < deposit) verdict = 'skip'; // không đủ cọc
  else if (share >= COMMIT_DEPOSIT_CASH_RATIO || (money > 0 && reservedValue >= money * COMMIT_RESERVED_CASH_RATIO)) verdict = 'tight';
  return { deposit, bonus, reservedValue, depositShareOfCash: share, verdict };
}
