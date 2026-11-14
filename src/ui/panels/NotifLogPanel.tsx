import { useState } from 'react';
import { clearNotifLog, notifLog } from '../../core/notifLog';
import { useGame } from '../../core/store';
import { Footer, styles } from './shared';
import { t } from '../../core/i18n';

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
  const closePanel = useGame((s) => s.closePanel);
  const entries = notifLog();
  const [showAll, setShowAll] = useState(false);
  const [, tick] = useState(0);
  const shown = showAll ? entries : entries.slice(0, PAGE);

  return (
    // Tràn đầy khung: panel cố định chiều cao (GĐ662) — flex: 1 để vùng cuộn
    // chạm tới đáy khung, hết cảnh "khoảng đen lãng phí" khi tin chưa đầy một trang.
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ flex: 'none' }}>
        <h2 style={styles.title}>{t('panels_misc.so_thong_bao')}</h2>
        <p style={styles.sub}>
          {t('panels_misc.moi_tin_da_hien_len_man')}
        </p>
      </div>
      {entries.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ ...styles.card, opacity: 0.85 }}>{t('panels_misc.chua_co_tin_nao_trong_phien')}</p>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, scrollbarWidth: 'thin' }}>
          {shown.map((e, i) => (
            <div key={`${e.day}-${e.minutes}-${i}`} style={{ ...styles.card, alignItems: 'baseline' }}>
              <small style={{ flex: 'none', opacity: 0.7, minWidth: 96 }}>
                {t('panels_misc.ngay_3')}{' '}{e.day} · {clockLabel(e.minutes)}
              </small>
              <span style={{ fontSize: 13, lineHeight: 1.45 }}>{e.text}</span>
            </div>
          ))}
        </div>
      )}
      <Footer onClose={closePanel}>
        {entries.length > PAGE && (
          <button style={styles.btn} onClick={() => setShowAll(!showAll)}>
            {showAll ? t('panels_misc.thu_gon') : t('panels_misc.xem_tat_ca_tin', { length: entries.length })}
          </button>
        )}
        {entries.length > 0 && (
          <button style={styles.btn} onClick={() => { clearNotifLog(); tick((n) => n + 1); }}>
            {t('panels_misc.xoa_thong_bao_cu')}
          </button>
        )}
      </Footer>
    </div>
  );
}
