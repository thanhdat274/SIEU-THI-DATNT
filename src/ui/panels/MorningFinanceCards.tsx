import { formatMoney } from '../../data/products';
import type { solvency } from '../../data/solvency';
import type { loanBurden } from '../../data/loanBurden';
import type { dailyBurn } from '../../data/dailyBurn';
import { Callout } from './shared';

/** GĐ926: tách khỏi MorningPanel (nguyên văn ba Callout tài chính: cân đối, lãi vay, chi phí cố định). */
export function SolvencyCard({ sol }: { sol: ReturnType<typeof solvency> }) {
  return (
    <Callout tone={sol.cover ? 'ok' : 'danger'} style={{ marginBottom: 8 }} title={`🪙 Cân đối: tiền + bán hết kho = ${formatMoney(sol.liquid)} (nợ gốc ${formatMoney(sol.liabilities)})`}>
      <div style={{ marginTop: 2, fontSize: 12 }}>
        {sol.cover
          ? `Bán hết kho cộng tiền mặt đủ trả gốc vay, còn thừa ${formatMoney(sol.margin)}.`
          : `Còn thiếu ${formatMoney(-sol.margin)} để trả gốc vay nếu hôm nay không bán thêm — kíp bơm doanh thu hoặc xả sỉ/gánh chợ.`}
        {' '}Mỗi tối cần gom ngoài quầy: lãi vay {formatMoney(sol.loanInterestToday)}
        {sol.huiDueToday > 0 && ` + góp hụi ${formatMoney(sol.huiDueToday)}`}
        {sol.daysToLoanDue != null && ` · hạn trả gốc còn ${sol.daysToLoanDue} ngày`}.
      </div>
    </Callout>
  );
}

export function LoanBurdenCard({ lb }: { lb: ReturnType<typeof loanBurden> }) {
  return (
    <Callout tone={lb.pctOfRevenue != null && lb.pctOfRevenue > 10 ? 'warn' : 'accent'} style={{ marginBottom: 8 }} title={`🏦 Lãi vay ngốn ${formatMoney(lb.interest)}/ngày${lb.pctOfRevenue != null ? ` = ${lb.pctOfRevenue.toFixed(0)}% doanh thu hôm nay` : ''}`}>
      <div style={{ marginTop: 2, fontSize: 12 }}>
        Mỗi 1.000.000đ trả bớt gốc tiết kiệm ~{formatMoney(lb.interestSavedPerMillion)} lãi mỗi ngày —
        {lb.pctOfRevenue != null && lb.pctOfRevenue > 10
          ? ' đang nặng (lãi ăn trên 10% dòng tiền): trả bớt càng sớm càng nhẹ.'
          : ' đang nhẹ so với dòng tiền hôm nay.'}
      </div>
    </Callout>
  );
}

export function DailyBurnCard({ db }: { db: ReturnType<typeof dailyBurn> }) {
  const tone = db.avgRevenue > 0 && db.burnShare != null && db.burnShare > 0.8 ? 'warn' : 'accent';
  return (
    <Callout tone={tone} style={{ marginBottom: 8 }} title={`🔥 Chi phí cố định/ngày: ${formatMoney(db.total)}${db.burnShare != null ? ` = ${Math.round(db.burnShare * 100)}% doanh thu bình quân` : ''}`}>
      <div style={{ marginTop: 2, fontSize: 12 }}>
        Lương {formatMoney(db.wages)} · thuê {formatMoney(db.rent)} · lãi vay {formatMoney(db.loanInterest)} · góp hụi {formatMoney(db.huiDue)}.
        {db.burnShare == null && ` Chưa có doanh thu bình quân để so — mở vài ngày rồi xem lại.`}
        {db.burnShare != null && (db.covered
          ? ` Doanh thu bình quân ${formatMoney(db.avgRevenue)} còn thừa ${formatMoney(db.margin)} sau chi phí cố định.`
          : ` Doanh thu bình quân ${formatMoney(db.avgRevenue)} thiếu ${formatMoney(-db.margin)} để trùm chi phí cố định — tăng doanh thu hoặc cắt bớt lương/nợ.`)}
      </div>
    </Callout>
  );
}
