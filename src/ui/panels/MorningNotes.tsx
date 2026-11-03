import { formatClock } from '../../core/store';
import { formatMoney } from '../../data/products';
import { LOAN_DAILY_RATE } from '../../data/biz';
import { Callout, styles } from './shared';

/** GĐ938: tách khỏi MorningPanel (nguyên văn thẻ nợ ngân hàng). */
export function LoanNoteCard({ loan, day }: { loan: { principal: number; dueDay: number }; day: number }) {
  return (
    <div style={{ ...styles.card, display: 'block', marginBottom: 8, outline: loan.dueDay - day <= 3 ? '2px solid #e74c3c' : undefined }}>
      <b style={styles.cardTitle}>🏦 Đang nợ ngân hàng {formatMoney(loan.principal)}</b>
      <div style={{ fontSize: 12, marginTop: 2 }}>
        Tối nay trừ lãi {formatMoney(Math.round(loan.principal * LOAN_DAILY_RATE))} · hạn trả ngày {loan.dueDay} (còn {Math.max(0, loan.dueDay - day)} ngày)
        · trả gốc ở Kinh doanh → Vay &amp; hụi.
      </div>
    </div>
  );
}

/** GĐ161/938: gợi ý nấu kịp giờ vàng tối. */
export function EveningPrepCallout({ name, startBy }: { name?: string; startBy: number }) {
  return (
    <Callout tone="accent" style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12 }}>
        🍳 Muốn kịp giờ vàng tối: bắt đầu nấu <b>{name}</b> trước ~{formatClock(startBy)}.
      </div>
    </Callout>
  );
}

/** GĐ565/938: tin sáng đầy đủ — toast chỉ hiện 3 giây và gộp '+N tin'. Rỗng thì không dựng. */
export function MorningNewsCard({ news }: { news?: string[] }) {
  if (!news?.length) return null;
  return (
    <div style={{ ...styles.card, display: 'block', fontSize: 12, lineHeight: 1.6 }}>
      <b>📰 Tin sáng nay</b>
      {news.map((n, i) => <div key={i}>{n}</div>)}
    </div>
  );
}
