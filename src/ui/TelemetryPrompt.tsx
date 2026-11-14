import { useState } from 'react';
import { useGame } from '../core/store';
import {
  telemetryAsked, telemetryOptedIn, markTelemetryAsked, setTelemetryOptIn,
} from '../data/telemetryConsent';
import { deleteTelemetry, flushReports } from '../core/dayReport';
import { TelemetrySampleView } from './TelemetrySampleView';
import { t } from '../core/i18n';

/**
 * SPEC-TOI-UU §T1 (L2) — Hỏi MỘT lần, sau ngày game thứ 2, về "Số liệu ẩn danh" (mặc định tắt).
 * Nút "Xem gửi những gì" mở màn xem đúng bản ghi mẫu (ẩn danh) trước khi quyết. Không khoá chức
 * năng nào; chỉ lưu lựa chọn cục bộ (L3: gửi lên server sau khi có `POST /t`).
 */
export function TelemetryPrompt() {
  const day = useGame((s) => s.day);
  const panelOpen = useGame((s) => s.panel !== null);
  const chapterPending = useGame((s) => s.biz.chapterPending);
  // Review 13/11-3 R6: không chen giữa màn hình lúc đang bán — chỉ hỏi khi tiệm đóng cửa.
  const shopOpen = useGame((s) => s.shopOpen);
  const [open, setOpen] = useState(false);
  if (day < 2 || telemetryAsked() || telemetryOptedIn() || panelOpen || chapterPending || shopOpen) return null;

  const decide = (on: boolean) => {
    setTelemetryOptIn(on);
    markTelemetryAsked();
    setOpen(false);
    if (on) void flushReports();           // L3: đồng ý → gửi ngay các bản chưa gửi.
    else void deleteTelemetry();           // L3: tắt → xoá số liệu của install trên server.
  };

  return (
    <div className="hud-dialogue" role="dialog" aria-label={t('privacy.so_lieu_an_danh')}>
      <div className="hud-dialogue-title">{t('privacy.giup_game_tot_hon')}</div>
      <div className="hud-dialogue-line">
        <span className="hud-dialogue-avatar" aria-hidden="true">📈</span>
        <span>
          <b>{t('privacy.cho_phep_gui_so_lieu_an')}</b>
          <p>
            {t('privacy.gui_moi_ngay')}{' '}<b>{t('privacy.mot_tom_tat')}</b>{' '}{t('privacy.cap_so_khach_giay_choi_may')}{' '}<b>{t('privacy.khong')}</b>{' '}{t('privacy.co_ten_tai_khoan_hay_vi')}
          </p>
        </span>
      </div>
      <div className="hud-dialogue-foot">
        <button className="hud-btn" onClick={() => setOpen(!open)}>{open ? t('privacy.dong_ban_ghi_mau') : t('privacy.xem_gui_nhung_gi')}</button>
        <span style={{ display: 'flex', gap: 6 }}>
          <button className="hud-btn" style={{ minWidth: 72, minHeight: 40 }} onClick={() => decide(false)}>{t('privacy.khong_2')}</button>
          <button className="hud-btn primary" style={{ minWidth: 72, minHeight: 40 }} onClick={() => decide(true)}>{t('privacy.dong_y')}</button>
        </span>
      </div>
      {open && (
        <TelemetrySampleView />
      )}
    </div>
  );
}
