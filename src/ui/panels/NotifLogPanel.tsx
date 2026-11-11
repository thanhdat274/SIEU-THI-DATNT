import { useState } from 'react';
import { clearNotifLog, notifLog } from '../../core/notifLog';
import { styles } from './shared';

/**
 * GĐ2347 — Sổ thông báo (panel 'log'): mọi tin đã hiện lên HUD trong phiên, mới nhất đứng đầu.
 * Tin toast vốn trôi sau 3–4.5 giây, thẻ bị gom sau nút "+N" — bảng này là nơi xem LẠI, bấm được
 * bất cứ lúc nào (không tự mất). Nhật ký chỉ sống trong phiên (không lưu save) — đủ dùng vì
 * thông báo cần đọc là tin hôm nay/hôm qua.
 * GĐ2349 — danh sách TRÀN ĐẾY khung (flex: 1, không chừa khoảng đen dưới đáy — QA người chơi) và
 * có nút 🗑 xoá nhật ký. Danh sách tự cuộn trong khung, tiêu đề đứng yên.
 */

const PAGE = 40;

const clockLabel = (minutes: number): string => {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${Math.floor(m / 60)}:${String(Math.floor(m % 60)).padStart(2, '0')}`;
};

export function NotifLogPanel() {
  const entries = notifLog();
  const [showAll, setShowAll] = useState(false);
  const [, tick] = useState(0);
  const shown = showAll ? entries : entries.slice(0, PAGE);

  return (
    // Tràn đầy khung: panel cố định chiều cao (GĐ662) — khối này height 100% để vùng cuộn
    // chạm tới đáy khung, hết cảnh "khoảng đen lãng phí" khi tin chưa đầy một trang.
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 'none' }}>
        <h2 style={styles.title}>🔔 Sổ thông báo</h2>
        <p style={styles.sub}>
          Mọi tin đã hiện lên màn hình trong phiên này — cả tin đã trôi và tin đang bị gom sau nút "+N thông báo".
          Mới nhất đứng đầu. Đóng trang là mất (không lưu vào save).
        </p>
      </div>
      {entries.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ ...styles.card, opacity: 0.85 }}>Chưa có tin nào trong phiên này — mở cửa tiệm, đón khách là có ngay!</p>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, scrollbarWidth: 'thin' }}>
          {shown.map((e, i) => (
            <div key={`${e.day}-${e.minutes}-${i}`} style={{ ...styles.card, alignItems: 'baseline' }}>
              <small style={{ flex: 'none', opacity: 0.7, minWidth: 96 }}>
                Ngày {e.day} · {clockLabel(e.minutes)}
              </small>
              <span style={{ fontSize: 13, lineHeight: 1.45 }}>{e.text}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ flex: 'none', display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 10 }}>
        {entries.length > PAGE && (
          <button className="hud-btn" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Thu gọn' : `Xem tất cả ${entries.length} tin`}
          </button>
        )}
        {entries.length > 0 && (
          <button className="hud-btn" onClick={() => { clearNotifLog(); tick((n) => n + 1); }}>
            🗑 Xoá thông báo cũ
          </button>
        )}
      </div>
    </div>
  );
}
