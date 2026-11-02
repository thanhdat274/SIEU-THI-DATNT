import { simRng } from './rand';
import { HUI_OPTIONS, HUI_UNLOCK, LOAN_DAILY_RATE, LOAN_DAYS, LOAN_OPTIONS_MIN, LOAN_UNLOCK, loanOptions, loanTopUps, type BizState } from '../data/biz';
import { formatMoney } from '../data/products';
import { useGame } from './store';

const S = () => useGame.getState();
const patch = (b: Partial<BizState>) => useGame.setState({ biz: { ...S().biz, ...b } });

/** `emergency`: vay gấp để nhập hàng giao đơn, được vay gói nhỏ nhất kể cả khi chưa tới cấp mở vay. */
export function takeLoan(amount: number, emergency = false) {
  const s = S();
  // GĐ852: quỹ còn âm thì được vay gấp thêm (gộp vào gốc, trần 3 gói) — tránh bế tắc không nhập nổi hàng
  const old = s.biz.loan;
  const canEmergency = emergency && amount === LOAN_OPTIONS_MIN && (!old || (s.money < 0 && old.principal < 3 * LOAN_OPTIONS_MIN));
  if (s.level < LOAN_UNLOCK && !canEmergency) return;
  if (s.level < LOAN_UNLOCK) {
    patch({ loan: old ? { ...old, principal: old.principal + amount, dueDay: s.day + LOAN_DAYS } : { principal: amount, takenDay: s.day, dueDay: s.day + LOAN_DAYS, interestPaid: 0 } });
    useGame.setState({ money: S().money + amount });
    s.notify(`🏦 Vay gấp ${formatMoney(amount)} để nhập hàng, lãi ${(LOAN_DAILY_RATE * 100).toFixed(1)}%/ngày, hạn trả ngày ${s.day + LOAN_DAYS}`);
    return;
  }
  const loan = s.biz.loan;
  if (loan) {
    // Vay thêm: cộng vào gốc, hạn trả tính lại từ hôm nay
    if (!loanTopUps(s.level, loan.principal).includes(amount)) return;
    patch({ loan: { ...loan, principal: loan.principal + amount, dueDay: s.day + LOAN_DAYS } });
    useGame.setState({ money: S().money + amount });
    s.notify(`🏦 Vay thêm ${formatMoney(amount)}, nợ gốc ${formatMoney(loan.principal + amount)}, hạn trả dời tới ngày ${s.day + LOAN_DAYS}`);
    return;
  }
  if (!loanOptions(s.level).includes(amount)) return;
  patch({ loan: { principal: amount, takenDay: s.day, dueDay: s.day + LOAN_DAYS, interestPaid: 0 } });
  useGame.setState({ money: S().money + amount });
  s.notify(`🏦 Vay ${formatMoney(amount)}, lãi ${(LOAN_DAILY_RATE * 100).toFixed(1)}%/ngày, hạn trả ngày ${s.day + LOAN_DAYS}`);
}

export function repayLoan(amount?: number) {
  const s = S();
  const loan = s.biz.loan;
  if (!loan) return;
  const n = Math.min(amount ?? loan.principal, loan.principal, s.money);
  if (n <= 0) return s.notify('Không có tiền để trả');
  useGame.setState({ money: s.money - n });
  patch({ loan: loan.principal - n > 0 ? { ...loan, principal: loan.principal - n } : null });
  s.notify(loan.principal - n > 0 ? `🏦 Trả bớt ${formatMoney(n)}, còn nợ ${formatMoney(loan.principal - n)}` : '🏦 Đã trả hết nợ ngân hàng!');
}

export function joinHui(option: number) {
  const s = S();
  const o = HUI_OPTIONS[option];
  if (!o || s.level < HUI_UNLOCK || s.biz.hui) return;
  // Hốt hụi vào một ngày ngẫu nhiên trong vòng (ngày 3 tới cuối vòng)
  const turn = s.day + 2 + Math.floor(simRng()() * (o.members - 2));
  patch({ hui: { ...o, startDay: s.day, turnDay: turn, received: false, paidDays: 0 } });
  s.notify(`🤝 Vào hụi ${formatMoney(o.daily)}/ngày, ${o.members} chân. Ngày ${turn} tới lượt bạn hốt ${formatMoney(o.daily * o.members)}`);
}
