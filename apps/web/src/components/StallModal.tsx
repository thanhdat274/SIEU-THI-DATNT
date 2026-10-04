import React from 'react';
import { PRODUCT_MAP, type SeasonEvent, type StallDefinition } from '@game/data';
import type { StallDayReport } from '@game/shared';
import { money, PixelButton, PixelDialog } from './pixel';

export type StallView = StallDefinition & { owned: boolean; buyable: boolean; reason?: string };

export interface StallModalProps {
  stalls: StallView[];
  season: SeasonEvent | null;
  stock: Record<string, number>; // tồn nhà kho theo productId
  incoming?: Record<string, number>; // hàng đã đặt, chưa về kho
  report?: StallDayReport;
  onBuy: (stallId: string) => void;
  onRestock?: (stallId: string) => void;
  getRestockItems?: (stallId: string) => { productId: string; quantity: number }[];
  onClose: () => void;
}

const lastEntry = (report: StallDayReport | undefined, stallId: string) => report?.entries.find(entry => entry.stallId === stallId);
const reportLine = (report: StallDayReport, stallId: string) => {
  const entry = lastEntry(report, stallId)!;
  const missing = entry.limitedBy ? ` — thiếu ${PRODUCT_MAP[entry.limitedBy]?.name ?? entry.limitedBy}, hãy nhập thêm vào kho` : '';
  return `Ngày ${report.day}: bán ${entry.servings}/${entry.demand} suất, thu ${money(entry.revenue)}, vốn ${money(entry.cogs)}${missing}`;
};

export const StallModal: React.FC<StallModalProps> = ({ stalls, season, stock, incoming, report, onBuy, onRestock, getRestockItems, onClose }) => (
  <PixelDialog icon="coin" title="QUẦY ĂN UỐNG" subtitle="Bán trước hiên tiệm, doanh thu tính khi sang ngày mới" onClose={onClose}>
    {season && <p className="pixel-panel" style={{ padding: 8 }}><strong>{season.name}</strong> — {season.blurb}</p>}
    <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0', display: 'grid', gap: 8 }}>
      {stalls.map(stall => {
        const boost = season?.stallMultiplier[stall.id];
        return (
          <li key={stall.id} className="pixel-panel" style={{ padding: 8, display: 'grid', gap: 4 }}>
            <strong>{stall.name}</strong>
            <span className="muted">{stall.description}</span>
            <span className="tabular">
              {stall.baseServings}–{stall.maxServings} suất/ngày · {money(stall.servingPrice)}/suất · tiền mặt {money(stall.cashCostPerServing)}/suất
              {boost && boost !== 1 ? ` · mùa này ${boost > 1 ? '+' : ''}${Math.round((boost - 1) * 100)}%` : ''}
            </span>
            <span className="muted">Nguyên liệu từ kho: {stall.ingredients.map(item => `${PRODUCT_MAP[item.productId]?.name ?? item.productId} ×${item.perServing}/suất (kho còn ${stock[item.productId] ?? 0}${incoming?.[item.productId] ? `, đang về ${incoming[item.productId]}` : ''})`).join('; ')}</span>
            {stall.owned && lastEntry(report, stall.id) && <span className="tabular">{reportLine(report!, stall.id)}</span>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span className="muted">{stall.owned ? 'Đang bán mỗi ngày' : stall.reason ?? `Giá mở quầy ${money(stall.price)}`}</span>
              {stall.owned && onRestock && (() => {
                const need = getRestockItems?.(stall.id) ?? [];
                return (
                  <PixelButton variant="paper" disabled={need.length === 0} onClick={() => onRestock(stall.id)}
                    title={need.map(i => `${PRODUCT_MAP[i.productId]?.name ?? i.productId} ×${i.quantity}`).join(', ')}>
                    {need.length === 0 ? 'Kho đủ nguyên liệu' : 'Nhập nhanh nguyên liệu'}
                  </PixelButton>
                );
              })()}
              <PixelButton variant="teal" disabled={!stall.buyable} onClick={() => onBuy(stall.id)}>
                {stall.owned ? 'Đã mở' : `Mở quầy · ${money(stall.price)}`}
              </PixelButton>
            </div>
          </li>
        );
      })}
    </ul>
  </PixelDialog>
);
