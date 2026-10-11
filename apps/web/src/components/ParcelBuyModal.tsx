import React from 'react';
import { RECLAMATION_WAVES, parcelLandValueMultiplier, parcelPrice, parcelTrafficMultiplier, type LandParcel } from '@game/data';
import { PixelButton, PixelDialog, money } from './pixel';

export interface Props {
  parcelId: string;
  playerMoney: number;
  onBuy: (parcelId: string) => void | Promise<void>;
  onClose: () => void;
}

const ROAD_LABEL: Record<string, string> = { main: 'đường chính', south: 'đường nam' };

/** Hộp mua lô khi chạm lô trên bản đồ (land-reclamation 4.3). */
export const ParcelBuyModal: React.FC<Props> = ({ parcelId, playerMoney, onBuy, onClose }) => {
  const wave = RECLAMATION_WAVES.find(w => w.parcels.some(p => p.id === parcelId));
  const raw = wave?.parcels.find(p => p.id === parcelId);
  if (!wave || !raw) return null;
  const parcel: LandParcel = { id: raw.id, rect: raw.rect, wave: RECLAMATION_WAVES.indexOf(wave), frontageRoadId: raw.frontageRoadId ?? wave.frontageRoadId, frontage: { corner: raw.corner ?? false } };
  const price = parcelPrice(parcel);
  const poor = playerMoney < price;
  return <PixelDialog icon="star" title="Lô đất bán" subtitle={`Đợt ${wave.id.slice(1)} · ${raw.id}`} onClose={onClose}>
    <p style={{ margin: '0 0 8px' }}>
      {raw.corner ? 'Lô góc ngã tư' : 'Lô mặt đường'} · {ROAD_LABEL[raw.frontageRoadId ?? wave.frontageRoadId] ?? 'mặt đường'}
      <br/><span className="muted">Khách ×{parcelTrafficMultiplier(parcel)} · giá đất ×{parcelLandValueMultiplier(parcel)}</span>
    </p>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      <PixelButton onClick={onClose}>Để sau</PixelButton>
      <PixelButton variant="teal" disabled={poor} onClick={async () => { await onBuy(parcelId); onClose(); }}>{poor ? 'Thiếu tiền' : `Mua ${money(price)}`}</PixelButton>
    </div>
  </PixelDialog>;
};
