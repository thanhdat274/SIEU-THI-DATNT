import { formatClock } from '../../core/store';
import { formatMoney } from '../../data/products';
import { LOAN_DAILY_RATE } from '../../data/biz';
import { Callout, styles } from './shared';
import { t } from '../../core/i18n';

/** GĐ938: tách khỏi MorningPanel (nguyên văn thẻ nợ ngân hàng). */
export function LoanNoteCard({ loan, day }: { loan: { principal: number; dueDay: number }; day: number }) {
  return (
    <div style={{ ...styles.card, display: 'block', marginBottom: 8, outline: loan.dueDay - day <= 3 ? '2px solid #e74c3c' : undefined }}>
      <b style={styles.cardTitle}>{t('panels_morning.dang_no_ngan_hang')}{' '}{formatMoney(loan.principal)}</b>
      <div style={{ fontSize: 12, marginTop: 2 }}>
        {t('panels_morning.toi_nay_tru_lai')}{' '}{formatMoney(Math.round(loan.principal * LOAN_DAILY_RATE))}{' '}{t('panels_morning.han_tra_ngay')}{' '}{loan.dueDay}{' '}{t('panels_morning.con_2')}{' '}{Math.max(0, loan.dueDay - day)} ngày)
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
        {t('panels_morning.muon_kip_gio_vang_toi_bat')}{' '}<b>{name}</b>{' '}{t('panels_morning.truoc')}{formatClock(startBy)}.
      </div>
    </Callout>
  );
}

/** GĐ565/938: tin sáng đầy đủ — toast chỉ hiện 3 giây và gộp '+N tin'. Rỗng thì không dựng. */
export function MorningNewsCard({ news }: { news?: string[] }) {
  if (!news?.length) return null;
  return (
    <div style={{ ...styles.card, display: 'block', fontSize: 12, lineHeight: 1.6 }}>
      <b>{t('panels_morning.tin_sang_nay')}</b>
      {news.map((n, i) => <div key={i}>{n}</div>)}
    </div>
  );
}
