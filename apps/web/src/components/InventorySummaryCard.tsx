import React, { useEffect, useState } from 'react';
import { money, PixelButton, PixelIcon } from './pixel';
import type { InventorySummary } from '@game/core';

interface InventorySummaryCardProps {
  summary: InventorySummary;
  onClose: () => void;
  autoCloseSeconds?: number;
}

export const InventorySummaryCard: React.FC<InventorySummaryCardProps> = ({
  summary,
  onClose,
  autoCloseSeconds = 8,
}) => {
  const [timeLeft, setTimeLeft] = useState(autoCloseSeconds);

  useEffect(() => {
    if (timeLeft <= 0) {
      onClose();
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, onClose]);

  return (
    <div className="inventory-summary-card" role="dialog" aria-label="Kiểm kê cuối ngày">
      <div className="summary-header">
        <div className="summary-title">
          <PixelIcon name="warehouse" size={20} />
          <span>KIỂM KÊ CUỐI NGÀY</span>
        </div>
        <PixelButton icon="close" aria-label="Đóng" onClick={onClose} />
      </div>

      <div className="summary-body">
        <div className="summary-row">
          <span className="summary-label">Hàng sắp hết:</span>
          <span className="summary-value summary-warn">{summary.lowStock}</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">Hàng hết:</span>
          <span className="summary-value summary-danger">{summary.outOfStock}</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">Hàng tồn nhiều:</span>
          <span className="summary-value">{summary.overstock}</span>
        </div>
        <div className="summary-divider" />
        <div className="summary-row summary-highlight">
          <span className="summary-label">Doanh thu hôm nay:</span>
          <span className="summary-value summary-revenue">{money(summary.revenue)}</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">Số đơn hàng:</span>
          <span className="summary-value">{summary.orders}</span>
        </div>
      </div>

      <div className="summary-footer">
        <span className="summary-check">✓ Đã hoàn tất kiểm kê</span>
        <button type="button" className="btn-summary-close" onClick={onClose}>
          Đóng ({timeLeft}s)
        </button>
      </div>
    </div>
  );
};
