import { telemetrySampleRows } from '../data/telemetryConsent';

/**
 * SPEC-TOI-UU §T1 (L2) — hiện "Xem gửi những gì" thành danh sách giải thích dễ đọc, KHÔNG phải
 * JSON thô (sửa view 2026-11-11). Mỗi dòng là một mục dữ liệu ẩn danh đã dịch ra tiếng người.
 */
export function TelemetrySampleView() {
  const rows = telemetrySampleRows();
  return (
    <div className="hud-tele-sample" role="group" aria-label="Bản ghi mẫu — những gì được gửi">
      <p className="hud-tele-intro">
        Đây là <b>bản ghi mẫu</b> được gửi <b>mỗi ngày</b> — tất cả đều <b>ẩn danh</b>, không có
        tên, tài khoản hay vị trí của bạn:
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
