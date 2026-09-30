import React from 'react';
import type { SeasonEvent, StallDefinition } from '@game/data';
import { money, PixelButton, PixelDialog } from './pixel';

export type StallView = StallDefinition & { owned: boolean; buyable: boolean; reason?: string };

interface StallModalProps {
  stalls: StallView[];
  season: SeasonEvent | null;
  onBuy: (stallId: string) => void;
  onClose: () => void;
}

export const StallModal: React.FC<StallModalProps> = ({ stalls, season, onBuy, onClose }) => (
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
              {stall.baseServings}–{stall.maxServings} suất/ngày · {money(stall.servingPrice)}/suất · vốn {money(stall.servingCost)}
              {boost && boost !== 1 ? ` · mùa này ${boost > 1 ? '+' : ''}${Math.round((boost - 1) * 100)}%` : ''}
            </span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span className="muted">{stall.owned ? 'Đang bán mỗi ngày' : stall.reason ?? `Giá mở quầy ${money(stall.price)}`}</span>
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
