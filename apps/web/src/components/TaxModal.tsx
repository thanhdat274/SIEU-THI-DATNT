import React from 'react';
import { summarizeAnnualRevenue, HOUSEHOLD_TAX_EXEMPT_THRESHOLD, HOUSEHOLD_TAX_RATE, type AnnualRevenueSummary } from '@game/core';
import type { DailyRecord, WorldTime } from '@game/shared';
import { PixelDialog, money } from './pixel';

interface Props {
  day: number;
  worldTime: WorldTime;
  dailyRecords: Record<number, DailyRecord>;
  currentDayRecord: DailyRecord | null;
  onClose: () => void;
}

const TaxStatusBadge: React.FC<{ active: boolean; progress: number }> = ({ active, progress }) => {
  if (active) {
    return (
      <span style={{ display: 'inline-block', background: '#fef3c7', color: '#92400e', padding: '2px 10px', borderRadius: 4, fontWeight: 'bold', fontSize: 13 }}>
        ⚠️ Đang áp dụng 1% khoán
      </span>
    );
  }
  const pct = Math.round(progress * 100);
  return (
    <span style={{ display: 'inline-block', background: progress > 0.7 ? '#fef3c7' : '#ecfdf5', color: progress > 0.7 ? '#92400e' : '#065f46', padding: '2px 10px', borderRadius: 4, fontWeight: 'bold', fontSize: 13 }}>
      {pct}% — còn {100 - pct}% so với 100 triệu
    </span>
  );
};

export const TaxModal: React.FC<Props> = ({ day, worldTime, dailyRecords, currentDayRecord, onClose }) => {
  const annual: AnnualRevenueSummary = summarizeAnnualRevenue(dailyRecords, day, currentDayRecord ?? undefined);

  return (
    <PixelDialog title="Thuế & sổ kinh doanh" subtitle="Theo dõi doanh thu, thuế khoán hộ cá thể" icon="book" onClose={onClose}>
      <div className="summary-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <strong>Doanh thu năm {annual.year}: {money(annual.revenue)}</strong>
          <TaxStatusBadge active={annual.taxActive} progress={annual.progress} />
        </div>

        {/* Progress bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
            <span className="muted">Tiến độ vượt ngưỡng miễn thuế (100M VND)</span>
            <span>{Math.min(100, Math.round(annual.progress * 100))}%</span>
          </div>
          <div className="pixel-progress" role="progressbar" aria-label="Tiến độ so với ngưỡng miễn thuế" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(annual.progress * 100))}>
            <span style={{ width: `${Math.min(100, annual.progress * 100)}%`, background: annual.taxActive ? '#f59e0b' : undefined }} />
          </div>
        </div>

        {/* Tax summary when active */}
        {annual.taxActive ? (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: 10 }}>
            <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#92400e' }}>📊 Thuế khoán 1% đang áp dụng</p>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
              <li>Doanh thu năm: {money(annual.revenue)}</li>
              <li>Thuế suất: {(HOUSEHOLD_TAX_RATE * 100).toFixed(0)}% (VAT + TNCN gộp)</li>
              <li>Thuế ước tính năm: {money(annual.estimatedTax)}</li>
              <li>Thuế đã khấu trừ: {money(annual.taxPaidYear)}</li>
              <li>Thuế còn nợ: {money(Math.max(0, annual.estimatedTax - annual.taxPaidYear))}</li>
            </ul>
            <p className="muted" style={{ margin: '6px 0 0 0', fontSize: 12 }}>
              Tính bằng 1% doanh thu ngày mỗi lần đóng ngày. Nghị quyết 95/2024/QH15 — hộ cá thể tạp hóa.
            </p>
          </div>
        ) : (
          <p className="muted" style={{ margin: '4px 0' }}>
            Chưa vượt ngưỡng 100 triệu VND/năm → miễn thuế khoán. Vượt ngưỡng sẽ áp dụng 1% gộp VAT+TNCN.
          </p>
        )}

        <span className="muted">Năm trong game tính theo 365 ngày.</span>
      </div>

      <section style={{ marginTop: 16 }} aria-labelledby="tax-status-heading">
        <h3 id="tax-status-heading">Hồ sơ kinh doanh</h3>
        <p>Tiệm tạp hóa đầu hẻm — hộ cá thể kinh doanh nhỏ lẻ.</p>
        <p>Ngày trong game: {day} · Giờ: {String(worldTime.hour).padStart(2, '0')}:{String(worldTime.minute).padStart(2, '0')}</p>
      </section>

      <section style={{ marginTop: 16 }} aria-labelledby="tax-sources-heading">
        <h3 id="tax-sources-heading">Căn cứ pháp lý (game-friendly)</h3>
        <ul>
          <li>
            <a href="https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-dinh-so-141-2026-nd-cp-nang-nguong-doanh-thu-khong-phai-chiu-thue-len-1-ty-dong-119260504154326455.htm" target="_blank" rel="noreferrer">
              Nghị định 141/2026/NĐ-CP — nâng ngưỡng miễn thuế lên 1 tỷ VND
            </a>
          </li>
          <li>
            <a href="https://xaydungchinhsach.chinhphu.vn/nghi-dinh-68-2026-nd-cp.html" target="_blank" rel="noreferrer">
              Nghị định 68/2026/NĐ-CP — chính sách thuế hộ kinh doanh
            </a>
          </li>
        </ul>
        <p className="muted">
          Đây là mức khoán game-friendly: ≤100M miễn thuế, &gt;100M áp dụng 1% khoán trên toàn bộ doanh thu (VAT+TNCN gộp).
          Không phải tư vấn pháp lý chính thức.
        </p>
      </section>
    </PixelDialog>
  );
};
