import React from 'react';
import { summarizeAnnualRevenue, type AnnualRevenueSummary } from '@game/core';
import type { DailyRecord, TaxState, WorldTime } from '@game/shared';
import { PixelDialog, money } from './pixel';

interface Props {
  day: number;
  worldTime: WorldTime;
  dailyRecords: Record<number, DailyRecord>;
  currentDayRecord: DailyRecord | null;
  taxState?: TaxState;
  onSetUnderDeclare?: (underDeclare: boolean) => void | Promise<void>;
  onClose: () => void;
}

const TaxStatusBadge: React.FC<{ active: boolean; progress: number; thresholdLabel: string }> = ({ active, progress, thresholdLabel }) => {
  if (active) {
    return (
      <span style={{ display: 'inline-block', background: '#fef3c7', color: '#92400e', padding: '2px 10px', borderRadius: 4, fontWeight: 'bold', fontSize: 13 }}>
        ⚠️ Đang chịu thuế GTGT + TNCN
      </span>
    );
  }
  const pct = Math.round(progress * 100);
  return (
    <span style={{ display: 'inline-block', background: progress > 0.7 ? '#fef3c7' : '#ecfdf5', color: progress > 0.7 ? '#92400e' : '#065f46', padding: '2px 10px', borderRadius: 4, fontWeight: 'bold', fontSize: 13 }}>
      {pct}% — còn {100 - pct}% so với {thresholdLabel}
    </span>
  );
};

export const TaxModal: React.FC<Props> = ({ day, worldTime, dailyRecords, currentDayRecord, taxState, onSetUnderDeclare, onClose }) => {
  const annual: AnnualRevenueSummary = summarizeAnnualRevenue(dailyRecords, day, currentDayRecord ?? undefined);
  const audit = annual.policy.audit;
  const [underDeclare, setUnderDeclare] = React.useState(taxState?.underDeclare ?? false);
  const toggleDeclare = async () => { const next = !underDeclare; setUnderDeclare(next); await onSetUnderDeclare?.(next); };

  return (
    <PixelDialog title="Thuế & sổ kinh doanh" subtitle="Theo dõi doanh thu và thuế hộ kinh doanh" icon="book" onClose={onClose}>
      <div className="summary-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <strong>Doanh thu năm {annual.year}: {money(annual.revenue)}</strong>
          <TaxStatusBadge active={annual.taxActive} progress={annual.progress} thresholdLabel={money(annual.threshold)} />
        </div>

        {/* Progress bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
            <span className="muted">Tiến độ so với ngưỡng miễn thuế ({money(annual.threshold)}/năm)</span>
            <span>{Math.min(100, Math.round(annual.progress * 100))}%</span>
          </div>
          <div className="pixel-progress" role="progressbar" aria-label="Tiến độ so với ngưỡng miễn thuế" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(annual.progress * 100))}>
            <span style={{ width: `${Math.min(100, annual.progress * 100)}%`, background: annual.taxActive ? '#f59e0b' : undefined }} />
          </div>
        </div>

        {/* Tax summary when active */}
        {annual.taxActive ? (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: 10 }}>
            <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#92400e' }}>📊 Đang chịu thuế hộ kinh doanh</p>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
              <li>Doanh thu năm: {money(annual.revenue)}</li>
              <li>GTGT {(annual.policy.vatRate * 100).toFixed(1).replace('.0', '')}%: {money(annual.vat)}</li>
              <li>TNCN {(annual.policy.pitRate * 100).toFixed(1).replace('.0', '')}%{annual.policy.pitBase === 'excess' ? ' (phần vượt ngưỡng)' : ''}: {money(annual.pit)}</li>
              <li>Thuế ước tính năm: {money(annual.estimatedTax)}</li>
              <li>Thuế đã khấu trừ: {money(annual.taxPaidYear)}</li>
              <li>Thuế còn nợ: {money(Math.max(0, annual.estimatedTax - annual.taxPaidYear - annual.taxHiddenYear))}{annual.taxHiddenYear > 0 ? ` (chưa tính ${money(annual.taxHiddenYear)} đã giấu, có thể bị truy thu)` : ''}</li>
            </ul>
            <p className="muted" style={{ margin: '6px 0 0 0', fontSize: 12 }}>
              Mỗi lần đóng ngày game trừ phần thuế tăng thêm; ngày vượt ngưỡng nộp bù cho cả năm. {annual.policy.name}.
            </p>
          </div>
        ) : (
          <p className="muted" style={{ margin: '4px 0' }}>
            Doanh thu năm chưa vượt {money(annual.threshold)} → chưa phải nộp GTGT và TNCN. Vượt ngưỡng: GTGT {(annual.policy.vatRate * 100).toFixed(1).replace('.0', '')}% + TNCN {(annual.policy.pitRate * 100).toFixed(1).replace('.0', '')}% trên doanh thu bán hàng hóa.
          </p>
        )}

        <span className="muted">Năm trong game tính theo 365 ngày.</span>
      </div>

      <section style={{ marginTop: 16 }} aria-labelledby="tax-audit-heading">
        <h3 id="tax-audit-heading">Kiểm tra thuế bất ngờ</h3>
        <p>
          Cứ {audit.intervalDays} ngày chị Hạnh bên thuế có thể ghé kiểm tra ({Math.round(audit.chance * 100)}% mỗi lượt) khi doanh thu năm đã đạt {Math.round(audit.minRevenueRatio * 100)}% ngưỡng miễn thuế ({money(annual.threshold * audit.minRevenueRatio)}).
          Sổ sách sạch thì được khen (danh tiếng +{audit.cleanReputation}, được tặng bằng khen nộp thuế); bị phát hiện khai bớt thì truy thu phần giấu, phạt thêm {Math.round(audit.evasionFineMul * 100)}% và mất {audit.evasionReputation} danh tiếng.
        </p>
        {onSetUnderDeclare && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: '8px 0' }}>
            <input type="checkbox" checked={underDeclare} onChange={toggleDeclare} aria-describedby="tax-declare-help" />
            <span>
              <strong>Khai bớt doanh thu</strong> (rủi ro)
              <span id="tax-declare-help" className="muted" style={{ display: 'block', fontSize: 12 }}>
                Mỗi lần đóng ngày chỉ nộp {Math.round((1 - audit.underDeclarePct) * 100)}% thuế, giấu {Math.round(audit.underDeclarePct * 100)}%; xác suất bị kiểm tra tăng thêm {Math.round(audit.underDeclareExtraChance * 100)}%. Tắt bất cứ lúc nào; phần đã giấu vẫn có thể bị truy thu.
              </span>
            </span>
          </label>
        )}
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li>Thuế đã giấu chưa bị truy thu: {money(taxState?.hiddenTax ?? 0)}</li>
          {(taxState?.debt ?? 0) > 0 && <li>Còn nợ truy thu/phạt (trừ dần khi đóng ngày): {money(taxState?.debt ?? 0)}</li>}
          <li>Số lần được khen: {taxState?.cleanAudits ?? 0}</li>
        </ul>
        {(taxState?.audits.length ?? 0) > 0 && (
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.6 }} aria-label="Lịch sử kiểm tra">
            {[...(taxState?.audits ?? [])].reverse().map(a => (
              <li key={a.day}>Ngày {a.day}: {a.clean ? '✅ Sổ sách sạch' : `⚠️ ${a.findings.join('; ')} (tổng ${money(a.total)})`}</li>
            ))}
          </ul>
        )}
      </section>

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
          {annual.policy.note} Cách xác định doanh thu tính thuế, thời điểm nộp và kỳ khai được đơn giản hóa cho game
          (trừ thuế khi đóng ngày). Không phải tư vấn pháp lý chính thức.
        </p>
      </section>
    </PixelDialog>
  );
};
