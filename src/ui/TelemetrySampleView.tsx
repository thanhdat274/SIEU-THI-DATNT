import { telemetrySampleRows } from '../data/telemetryConsent';
import { t } from '../core/i18n';

/**
 * SPEC-TOI-UU §T1 (L2) — hiện "Xem gửi những gì" thành danh sách giải thích dễ đọc, KHÔNG phải
 * JSON thô (sửa view 2026-11-11). Mỗi dòng là một mục dữ liệu ẩn danh đã dịch ra tiếng người.
 */
export function TelemetrySampleView() {
  const rows = telemetrySampleRows();
  return (
    <div className="hud-tele-sample" role="group" aria-label={t('privacy.ban_ghi_mau_nhung_gi_duoc')}>
      <p className="hud-tele-intro">
        {t('privacy.day_la')}{' '}<b>{t('privacy.ban_ghi_mau')}</b>{' '}{t('privacy.duoc_gui')}{' '}<b>{t('privacy.moi_ngay')}</b>{' '}{t('privacy.tat_ca_deu')}{' '}<b>{t('privacy.an_danh')}</b>{t('privacy.khong_co_ten_tai_khoan_hay')}
      </p>
      <ul className="hud-tele-rows" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map((r) => (
          <li key={r.key} className="hud-tele-row" style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span aria-hidden style={{ flex: '0 0 auto', opacity: 0.5 }}>–</span>
            <span className="hud-tele-key" style={{ flex: '0 0 44%', opacity: 0.75 }}>{r.label}</span>
            <span className="hud-tele-val" style={{ flex: '1 1 auto', fontWeight: 600 }}>{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
