import React, { useState } from 'react';
import type { DailyRecord } from '@game/shared';
import { buildDaySummary, buildDayChannelBreakdown, isReviewComplaint, REVIEW_RESPONSE_MAX_AGE_DAYS, type MorningBrief } from '@game/core';
import { PRODUCT_MAP } from '@game/data';
import { money, PixelDialog, PixelStat, PixelButton } from './pixel';
import { Scoreboard, type ScoreRow } from './Scoreboard';

export interface Props {
  record: DailyRecord;
  morningBrief?: MorningBrief | null;
  /** Thành tích trong ngày theo người phụ trách (co-op, có từ 2 nhóm trở lên). */
  scoreRows?: readonly ScoreRow[];
  /** Phản hồi một lời chê nổi bật trong bản tin sáng (OpenSpec `written-customer-reviews` 4.5). */
  onRespondReview?: (reviewId: string) => void;
  /** Ngày hiện tại để tính giới hạn tuổi lời chê có thể phản hồi (OpenSpec `written-customer-reviews` 2c). */
  today?: number;
  onClose: () => void;
}

export const DaySummaryModal: React.FC<Props> = ({ record, morningBrief, scoreRows, onRespondReview, today, onClose }) => {
  const [tab, setTab] = useState<'summary' | 'morning'>('summary');
  const summary = buildDaySummary(record);
  const channels = buildDayChannelBreakdown(record);

  return (
    <PixelDialog
      icon="book"
      title={`NHỊP SỐNG HẺM — NGÀY ${summary.day}`}
      subtitle="Sổ kết quả buôn bán & Bản tin sáng đầu hẻm"
      onClose={onClose}
      footer={<PixelButton variant="teal" onClick={onClose}>{tab === 'morning' ? 'Bắt đầu bán hàng →' : 'Tiếp tục →'}</PixelButton>}
    >
      <div className="feature-tabs" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <PixelButton
          type="button"
          aria-pressed={tab === 'summary'}
          variant={tab === 'summary' ? 'teal' : 'paper'}
          onClick={() => setTab('summary')}
          style={{ flex: 1, padding: '6px 12px', fontWeight: 'bold' }}
        >
          📊 Tổng kết ngày qua
        </PixelButton>
        {morningBrief && (
          <PixelButton
            type="button"
            aria-pressed={tab === 'morning'}
            variant={tab === 'morning' ? 'teal' : 'paper'}
            onClick={() => setTab('morning')}
            style={{ flex: 1, padding: '6px 12px', fontWeight: 'bold' }}
          >
            🌅 Bản tin sáng nay
          </PixelButton>
        )}
      </div>

      {tab === 'summary' ? (
        <>
          <div className="summary-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
            <PixelStat label="Khách phục vụ" value={summary.customersServed} icon="person" />
            <PixelStat label="Đánh giá" value={summary.ratingCount ? `${summary.averageStars?.toFixed(1)} ★` : 'Chưa có'} icon="heart" />
            <PixelStat label="Giao dịch" value={summary.transactionsCount} icon="book" />
            <PixelStat label="Món bán" value={summary.itemsSold} icon="bag" />
          </div>

          <div className="pixel-panel" style={{ padding: 12, marginTop: 10, display: 'grid', gap: 6 }}>
            <div>Doanh thu: <strong>{money(summary.revenue)}</strong></div>
            {channels.stalls.length > 0 && (
              <div className="muted" style={{ fontSize: 11, paddingLeft: 10, display: 'grid', gap: 2 }}>
                <div>· Tiệm (thu ngân): {money(channels.shopRevenue)} · lãi gộp {money(channels.shopGrossProfit)}</div>
                {channels.stalls.map(line => (
                  <div key={line.stallId}>· {line.name}: {money(line.revenue)} · {line.servings} suất · lãi gộp {money(line.grossProfit)}{line.estimated ? ' (ước)' : ''}</div>
                ))}
              </div>
            )}
            <div>Giá vốn: <strong style={{ color: 'var(--brick)' }}>- {money(summary.cogs)}</strong></div>
            <div>Lãi gộp: <strong>{money(summary.grossProfit)}</strong></div>
            <div>Hàng hỏng: <strong style={{ color: 'var(--brick)' }}>- {money(summary.spoilageCost)}</strong></div>
            <div>Lương nhân viên: <strong style={{ color: 'var(--brick)' }}>- {money(summary.wagesPaid)}</strong></div>
            {record.rentCost ? <div>Tiền thuê đất: <strong style={{ color: 'var(--brick)' }}>- {money(record.rentCost)}</strong></div> : null}
            {record.civicUpkeep ? <div>Duy trì công trình: <strong style={{ color: 'var(--brick)' }}>- {money(record.civicUpkeep)}</strong></div> : null}
            {record.civicFee ? <div>Phí xóm: <strong style={{ color: 'var(--brick)' }}>- {money(record.civicFee)}</strong></div> : null}
            {summary.maintenanceCost ? <div>Sửa chữa, bảo trì: <strong style={{ color: 'var(--brick)' }}>- {money(summary.maintenanceCost)}</strong></div> : null}
            {record.counterfeitLoss ? <div>Tiền giả nhận nhầm: <strong style={{ color: 'var(--brick)' }}>- {money(record.counterfeitLoss)}</strong></div> : null}
            {record.badDebtCost ? <div>Nợ xấu đã xóa: <strong style={{ color: 'var(--brick)' }}>- {money(record.badDebtCost)}</strong></div> : null}
            <div style={{ borderTop: '1px solid var(--color-outline-soft)', paddingTop: 6, fontSize: 13 }}>
              Lãi ròng: <strong style={{ color: summary.netProfit >= 0 ? 'var(--color-green-dark)' : 'var(--color-brick)' }}>{money(summary.netProfit)}</strong>
            </div>
          </div>

          {scoreRows && scoreRows.length > 1 && <details style={{ marginTop: 8 }}>
            <summary>Thành tích theo người phụ trách</summary>
            <Scoreboard rows={scoreRows}/>
          </details>}

          <p className="muted day-summary-foot" style={{ margin: '10px 0 0', fontSize: 11 }}>
            {summary.bestSellingProductId
              ? `Món bán chạy nhất: ${PRODUCT_MAP[summary.bestSellingProductId]?.name ?? summary.bestSellingProductId}. `
              : 'Hôm nay chưa ghi nhận món bán. '}
            {summary.walkouts
              ? `${summary.walkouts} lượt khách bỏ đi vì hết hàng hoặc giá cao.`
              : 'Không ghi nhận khách bỏ đi vì giá/hết hàng.'}
          </p>
        </>
      ) : morningBrief ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <div className="pixel-panel" style={{ padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <div>
                <span style={{ fontSize: 16 }}>{morningBrief.weatherIcon}</span>{' '}
                <strong>{morningBrief.weatherLabel}</strong>
                <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>Dự báo ngày mai: {morningBrief.forecastTomorrow}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: 'var(--color-brick)', fontWeight: 'bold', fontSize: 11 }}>🎉 {morningBrief.seasonName}</span>
                <div className="muted" style={{ fontSize: 10 }}>Còn {morningBrief.seasonDaysLeft} ngày trong mùa</div>
              </div>
            </div>
          </div>

          {morningBrief.cityEvents && morningBrief.cityEvents.length > 0 && (
            <div className="pixel-panel" style={{ padding: 8, fontSize: 11, overflowWrap: 'anywhere' }}>
              📣 <strong>Sự kiện thành phố hôm nay:</strong> {morningBrief.cityEvents.join(' · ')}
            </div>
          )}

          <div className="pixel-panel" style={{ padding: 12 }}>
            <h4 style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--color-wood-light)' }}>TÌNH HÌNH HÀNG HÓA SÁNG NAY</h4>
            <div style={{ display: 'grid', gap: 4, fontSize: 11 }}>
              <div>
                📦 <strong>Đơn hàng giao:</strong>{' '}
                {morningBrief.arrivingOrdersCount > 0
                  ? `Có ${morningBrief.arrivingOrdersCount} đơn hàng (${morningBrief.arrivingItemsCount} món) vừa cập bến kho.`
                  : 'Không có chuyến hàng giao sáng nay.'}
              </div>
              {morningBrief.lowStockItems.length > 0 && (
                <div style={{ color: 'var(--color-warning-dark)' }}>
                  ⚠️ <strong>Kệ sắp hết hàng:</strong>{' '}
                  {morningBrief.lowStockItems.map(pid => PRODUCT_MAP[pid]?.name ?? pid).join(', ')}
                </div>
              )}
            </div>
          </div>

          <div className="pixel-panel" style={{ padding: 12, background: 'rgba(57, 131, 154, 0.14)', borderColor: 'var(--color-blue)' }}>
            <h4 style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--color-blue)' }}>LỜI KHUYÊN ĐẦU NGÀY</h4>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, display: 'grid', gap: 4 }}>
              {morningBrief.tips.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>

          {morningBrief.standoutReviews && morningBrief.standoutReviews.length > 0 && (
            <div className="pixel-panel" style={{ padding: 12 }} data-morning-standout-reviews>
              <h4 style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--color-wood-light)' }}>LỜI KHÁCH NỔI BẬT HÔM QUA</h4>
              <div style={{ display: 'grid', gap: 8 }}>
                {morningBrief.standoutReviews.map((r) => {
                  const complaint = isReviewComplaint(r);
                  const expired = complaint && today !== undefined && today - r.day > REVIEW_RESPONSE_MAX_AGE_DAYS;
                  return (
                    <div key={r.id} className="pixel-panel" style={{ padding: 8, display: 'grid', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                        <strong>{r.author}</strong>
                        <span style={{ color: r.stars >= 4 ? 'var(--color-green-dark)' : r.stars === 3 ? 'var(--color-wheat-dark)' : 'var(--color-brick)' }}>{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 11 }}>“{r.text}”</p>
                      {r.productId && PRODUCT_MAP[r.productId] && <span className="muted" style={{ fontSize: 10 }}>Món: {PRODUCT_MAP[r.productId].name}</span>}
                      {complaint && onRespondReview && (
                        <div>
                          {expired ? (
                            <span className="muted" style={{ fontSize: 11 }} title="Lời chê đã quá 3 ngày, không phản hồi được nữa.">🔒 Lời chê đã quá 3 ngày, không phản hồi được nữa.</span>
                          ) : (
                            <PixelButton aria-label="Phản hồi lời chê" variant="teal" onClick={() => onRespondReview(r.id)} style={{ fontSize: 11, padding: '4px 10px' }}>Phản hồi lời chê</PixelButton>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {morningBrief.civicOpenings && morningBrief.civicOpenings.length > 0 && (
            <div className="pixel-panel" style={{ padding: 12 }} data-morning-civic-openings>
              {morningBrief.civicOpenings.map((line, i) => <div key={i}>🏛 <strong>{line}</strong></div>)}
            </div>
          )}

          {morningBrief.civicCosts && (morningBrief.civicCosts.upkeep > 0 || morningBrief.civicCosts.fee > 0) && (
            <div className="pixel-panel" style={{ padding: 12 }} data-morning-civic-costs>
              <h4 style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--color-wood-light)' }}>CHI PHÍ XÓM MỖI NGÀY</h4>
              <div style={{ display: 'grid', gap: 4, fontSize: 11 }}>
                <div>🏛 <strong>Duy trì công trình hôm nay:</strong> - {money(morningBrief.civicCosts.upkeep)}</div>
                <div>🧹 <strong>Phí xóm hôm nay:</strong> - {money(morningBrief.civicCosts.fee)} <span className="muted">(chỉ lô sở hữu; QoL cao thì giảm)</span></div>
                <div className="muted">Dự kiến mỗi ngày tới: duy trì {money(morningBrief.civicCosts.projected.upkeep)} + phí xóm {money(morningBrief.civicCosts.projected.fee)}.</div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </PixelDialog>
  );
};
