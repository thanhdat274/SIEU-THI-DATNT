import React from 'react';
import { RECLAMATION_WAVES, cityTierFrom, parcelLandValueMultiplier, parcelPrice, parcelTrafficMultiplier, type LandParcel } from '@game/data';
import type { WorldOpenState } from '@game/shared';
import { PixelButton, PixelDialog, money } from './pixel';

export interface Props {
  world: WorldOpenState;
  ownedParcelIds: readonly string[];
  playerLevel: number;
  playerMoney: number;
  day: number;
  buildingCount: number;
  onReclaim: (waveId: string) => void | Promise<void>;
  onBuyParcel: (parcelId: string) => void | Promise<void>;
  onClose: () => void;
}

const CORNER_LABEL = ['', 'Góc ngã tư'];
const ROAD_LABEL: Record<string, string> = { main: 'đường chính', south: 'đường nam' };

/** Bảng "Thành phố" (land-reclamation 4.3): cấp thành phố, các đợt khai hoang (khóa/đang thi công/mở) và mua lô. */
export const CityModal: React.FC<Props> = ({ world, ownedParcelIds, playerLevel, playerMoney, day, buildingCount, onReclaim, onBuyParcel, onClose }) => {
  const tier = cityTierFrom(world.openedWaves, buildingCount);
  const waves = RECLAMATION_WAVES.filter(wave => wave.id !== 'w0');
  return <PixelDialog icon="star" title="Thành phố" subtitle={`Cấp thành phố ${tier} · ${world.openedWaves.length - 1}/${waves.length} đợt khai hoang`} onClose={onClose}>
    <p className="muted" style={{ margin: '0 0 8px' }}>Mở đợt để có đất mới, rồi mua lô để đặt tòa. Lô góc ngã tư đắt hơn nhưng đông khách hơn.</p>
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
      {waves.map(wave => {
        const opened = world.openedWaves.includes(wave.id);
        const doneDay = world.wavesUnderConstruction[wave.id];
        const building = doneDay !== undefined;
        const lowLevel = playerLevel < wave.unlockLevel;
        const poor = playerMoney < wave.cost;
        const status = opened ? '✓ Đã mở' : building ? `🚧 Đang thi công · còn ${Math.max(0, doneDay - day)} ngày` : lowLevel ? `🔒 Cần cấp ${wave.unlockLevel}` : 'Sẵn sàng khai hoang';
        return <li key={wave.id} className="pixel-panel" style={{ padding: 10 }} data-wave={wave.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <strong>Đợt {wave.id.slice(1)} · {wave.parcels.length} lô</strong>
            <span className="muted">{status}</span>
          </div>
          {!opened && !building && <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Chi phí {money(wave.cost)} · thi công {wave.constructionDays} ngày</span>
            <PixelButton variant="teal" disabled={lowLevel || poor} onClick={() => onReclaim(wave.id)}>{lowLevel ? `Cần cấp ${wave.unlockLevel}` : poor ? 'Thiếu tiền' : 'Khai hoang'}</PixelButton>
          </div>}
          {opened && <details style={{ marginTop: 6 }} open>
            <summary>Các lô của đợt</summary>
            <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
              {wave.parcels.map(raw => {
                const parcel: LandParcel = { id: raw.id, rect: raw.rect, wave: RECLAMATION_WAVES.indexOf(wave), frontageRoadId: raw.frontageRoadId ?? wave.frontageRoadId, frontage: { corner: raw.corner ?? false } };
                const owned = ownedParcelIds.includes(raw.id);
                const price = parcelPrice(parcel);
                return <div key={raw.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span>
                    <strong>{raw.id}</strong>{raw.corner ? ` · ${CORNER_LABEL[1]}` : ''} · {ROAD_LABEL[raw.frontageRoadId ?? wave.frontageRoadId] ?? 'mặt đường'}
                    <br/><span className="muted">Khách ×{parcelTrafficMultiplier(parcel)} · giá đất ×{parcelLandValueMultiplier(parcel)}</span>
                  </span>
                  {owned ? <span>✓ Đã sở hữu</span> : <PixelButton variant="teal" disabled={playerMoney < price} onClick={() => onBuyParcel(raw.id)}>Mua {money(price)}</PixelButton>}
                </div>;
              })}
            </div>
          </details>}
        </li>;
      })}
    </ul>
  </PixelDialog>;
};
