import React, { useState } from 'react';
import type { DailyRecord } from '@game/shared';
import { buildDaySummary, type MorningBrief } from '@game/core';
import { PRODUCT_MAP } from '@game/data';
import { money, PixelDialog, PixelStat, PixelButton } from './pixel';

interface Props {
  record: DailyRecord;
  morningBrief?: MorningBrief | null;
  onClose: () => void;
}

export const DaySummaryModal: React.FC<Props> = ({ record, morningBrief, onClose }) => {
  const [tab, setTab] = useState<'summary' | 'morning'>('summary');
  const summary = buildDaySummary(record);

  return (
    <PixelDialog
      icon="book"
      title={`NHỊP SỐNG HẺM — NGÀY ${summary.day}`}
      subtitle="Sổ kết quả buôn bán & Bản tin sáng đầu hẻm"
      onClose={onClose}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          className={`pixel-btn ${tab === 'summary' ? 'active' : ''}`}
          onClick={() => setTab('summary')}
          style={{ flex: 1, padding: '6px 12px', fontWeight: 'bold' }}
        >
          📊 Tổng kết ngày qua
        </button>
        {morningBrief && (
          <button
            type="button"
            className={`pixel-btn ${tab === 'morning' ? 'active' : ''}`}
            onClick={() => setTab('morning')}
            style={{ flex: 1, padding: '6px 12px', fontWeight: 'bold' }}
          >
            🌅 Bản tin sáng nay
          </button>
        )}
      </div>

      {tab === 'summary' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
            <PixelStat label="Khách phục vụ" value={summary.customersServed} icon="person" />
            <PixelStat label="Đánh giá" value={summary.ratingCount ? `${summary.averageStars?.toFixed(1)} ★` : 'Chưa có'} icon="heart" />
            <PixelStat label="Giao dịch" value={summary.transactionsCount} icon="book" />
            <PixelStat label="Món bán" value={summary.itemsSold} icon="bag" />
          </div>

          <div className="pixel-panel" style={{ padding: 12, marginTop: 10, display: 'grid', gap: 6 }}>
            <div>Doanh thu: <strong>{money(summary.revenue)}</strong></div>
            <div>Giá vốn: <strong style={{ color: 'var(--rust, #b44a2c)' }}>- {money(summary.cogs)}</strong></div>
            <div>Lãi gộp: <strong>{money(summary.grossProfit)}</strong></div>
            <div>Hàng hỏng: <strong style={{ color: 'var(--rust, #b44a2c)' }}>- {money(summary.spoilageCost)}</strong></div>
            <div>Lương nhân viên: <strong style={{ color: 'var(--rust, #b44a2c)' }}>- {money(summary.wagesPaid)}</strong></div>
            <div style={{ borderTop: '1px solid var(--wood, #a88)', paddingTop: 6, fontSize: 13 }}>
              Lãi ròng: <strong style={{ color: summary.netProfit >= 0 ? '#16a34a' : '#dc2626' }}>{money(summary.netProfit)}</strong>
            </div>
          </div>

          <p className="muted" style={{ margin: '10px 0 0', fontSize: 11 }}>
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
                <span style={{ color: 'var(--rust, #b44a2c)', fontWeight: 'bold', fontSize: 11 }}>🎉 {morningBrief.seasonName}</span>
                <div className="muted" style={{ fontSize: 10 }}>Còn {morningBrief.seasonDaysLeft} ngày trong mùa</div>
              </div>
            </div>
          </div>

          <div className="pixel-panel" style={{ padding: 12 }}>
            <h4 style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--rust, #b44a2c)' }}>TÌNH HÌNH HÀNG HÓA SÁNG NAY</h4>
            <div style={{ display: 'grid', gap: 4, fontSize: 11 }}>
              <div>
                📦 <strong>Đơn hàng giao:</strong>{' '}
                {morningBrief.arrivingOrdersCount > 0
                  ? `Có ${morningBrief.arrivingOrdersCount} đơn hàng (${morningBrief.arrivingItemsCount} món) vừa cập bến kho.`
                  : 'Không có chuyến hàng giao sáng nay.'}
              </div>
              {morningBrief.lowStockItems.length > 0 && (
                <div style={{ color: '#d97706' }}>
                  ⚠️ <strong>Kệ sắp hết hàng:</strong>{' '}
                  {morningBrief.lowStockItems.map(pid => PRODUCT_MAP[pid]?.name ?? pid).join(', ')}
                </div>
              )}
            </div>
          </div>

          <div className="pixel-panel" style={{ padding: 12, background: 'rgba(59, 130, 246, 0.05)', borderColor: '#93c5fd' }}>
            <h4 style={{ margin: '0 0 6px', fontSize: 11, color: '#1d4ed8' }}>LỜI KHUYÊN ĐẦU NGÀY</h4>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, display: 'grid', gap: 4 }}>
              {morningBrief.tips.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <PixelButton variant="teal" onClick={onClose}>
          {tab === 'morning' ? 'Bắt đầu bán hàng →' : 'Tiếp tục →'}
        </PixelButton>
      </div>
    </PixelDialog>
  );
};
