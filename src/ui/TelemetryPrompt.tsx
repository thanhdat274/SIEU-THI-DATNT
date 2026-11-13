import { useState } from 'react';
import { useGame } from '../core/store';
import {
  telemetryAsked, telemetryOptedIn, markTelemetryAsked, setTelemetryOptIn,
} from '../data/telemetryConsent';
import { deleteTelemetry, flushReports } from '../core/dayReport';
import { TelemetrySampleView } from './TelemetrySampleView';

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
    <div className="hud-dialogue" role="dialog" aria-label="Số liệu ẩn danh">
      <div className="hud-dialogue-title">📊 Giúp game tốt hơn?</div>
      <div className="hud-dialogue-line">
        <span className="hud-dialogue-avatar" aria-hidden="true">📈</span>
        <span>
          <b>Cho phép gửi số liệu ẩn danh?</b>
          <p>
            Gửi mỗi ngày <b>một tóm tắt</b> (cấp, số khách, giây chơi, máy đang dùng…), <b>không</b> có
            tên, tài khoản hay vị trí. Mặc định tắt; bạn đổi bất cứ lúc nào trong menu ⋯.
          </p>
        </span>
      </div>
      <div className="hud-dialogue-foot">
        <button className="hud-btn" onClick={() => setOpen(!open)}>{open ? 'Đóng bản ghi mẫu' : 'Xem gửi những gì'}</button>
        <span style={{ display: 'flex', gap: 6 }}>
          <button className="hud-btn" style={{ minWidth: 72, minHeight: 40 }} onClick={() => decide(false)}>Không</button>
          <button className="hud-btn primary" style={{ minWidth: 72, minHeight: 40 }} onClick={() => decide(true)}>Đồng ý</button>
        </span>
      </div>
      {open && (
        <TelemetrySampleView />
      )}
    </div>
  );
}
