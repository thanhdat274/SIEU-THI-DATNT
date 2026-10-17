import React from 'react';
import { RECLAMATION_WAVES, LAND_LEASE_CONSTANTS, parcelLandValueMultiplier, parcelPrice, parcelTrafficMultiplier, districtForWave, type LandParcel } from '@game/data';
import { PixelButton, PixelDialog, money } from './pixel';

export interface Props {
  parcelId: string;
  playerMoney: number;
  onBuy: (parcelId: string) => void | Promise<void>;
  onLease?: (parcelId: string) => void | Promise<void>;
  onEndLease?: (parcelId: string) => void | Promise<void>;
  onPayRentDebt?: (parcelId: string) => void | Promise<void>;
  onOpenBuildingPrompt?: (parcelId: string) => void;
  isOwned?: boolean;
  isLeased?: boolean;
  leasePaidTotal?: number;
  leaseDebtDays?: number;
  occupiedBuildingName?: string;
  onClose: () => void;
}

const ROAD_LABEL: Record<string, string> = { main: 'đường chính', south: 'đường nam' };

/** Hộp quản lý lô đất: mua đứt, thuê theo ngày, trả nợ thuê hoặc mở tòa nhà mới (land-reclamation & land-lease). */
export const ParcelBuyModal: React.FC<Props> = ({
  parcelId,
  playerMoney,
  onBuy,
  onLease,
  onEndLease,
  onPayRentDebt,
  onOpenBuildingPrompt,
  isOwned = false,
  isLeased = false,
  leasePaidTotal = 0,
  leaseDebtDays = 0,
  occupiedBuildingName,
  onClose,
}) => {
  const wave = RECLAMATION_WAVES.find(w => w.parcels.some(p => p.id === parcelId));
  const raw = wave?.parcels.find(p => p.id === parcelId);
  if (!wave || !raw) return null;
  const districtId = RECLAMATION_WAVES.indexOf(wave) === 0 ? 'hem_dan_cu' : districtForWave(wave.id as 'w1' | 'w2' | 'w3' | 'w4');
  const parcel: LandParcel = {
    id: raw.id,
    rect: raw.rect,
    wave: RECLAMATION_WAVES.indexOf(wave),
    frontageRoadId: raw.frontageRoadId ?? wave.frontageRoadId,
    districtId,
    frontage: { corner: raw.corner ?? false },
  };
  const basePrice = parcelPrice(parcel);
  const credit = isLeased ? Math.min(leasePaidTotal * LAND_LEASE_CONSTANTS.leaseCreditRate, Math.floor(basePrice * 0.5)) : 0;
  const price = Math.max(0, basePrice - credit);
  const poorBuy = playerMoney < price;
  const dailyRent = Math.max(1, Math.ceil(basePrice * LAND_LEASE_CONSTANTS.leaseDailyRate));
  const poorLease = playerMoney < dailyRent;
  const debtAmount = leaseDebtDays * dailyRent;
  const poorPayDebt = playerMoney < debtAmount;
  const canLease = wave.id !== 'W0' && !isOwned && !isLeased;

  return (
    <PixelDialog
      icon="star"
      title={isOwned ? 'Lô đất sở hữu' : isLeased ? 'Lô đất đang thuê' : 'Lô đất quy hoạch'}
      subtitle={`Đợt ${wave.id.slice(1)} · ${raw.id}`}
      onClose={onClose}
    >
      <p style={{ margin: '0 0 8px' }}>
        {raw.corner ? 'Lô góc ngã tư' : 'Lô mặt đường'} · {ROAD_LABEL[raw.frontageRoadId ?? wave.frontageRoadId] ?? 'mặt đường'}
        <br />
        <span className="muted">
          Khách ×{parcelTrafficMultiplier(parcel)} · giá đất ×{parcelLandValueMultiplier(parcel)}
        </span>
      </p>

      {isLeased && (
        <div style={{ margin: '0 0 10px', padding: 8, background: 'rgba(0,0,0,0.1)', borderRadius: 4, fontSize: 13 }}>
          <div>Tiền thuê: <strong>{money(dailyRent)}/ngày</strong> · Đã trả: <strong>{money(leasePaidTotal)}</strong></div>
          {credit > 0 && (
            <div style={{ color: 'var(--teal)', marginTop: 4 }}>
              Khấu trừ mua đứt: -{money(credit)} (tối đa 50% giá)
            </div>
          )}
          {leaseDebtDays > 0 && (
            <div style={{ color: 'var(--red, #e53935)', marginTop: 4, fontWeight: 'bold' }}>
              ⚠️ Đang nợ {leaseDebtDays} ngày ({money(debtAmount)})
              {leaseDebtDays >= LAND_LEASE_CONSTANTS.debtClosureDays && (
                <div>🔴 Tòa nhà trên lô bị đóng cửa cho đến khi trả nợ!</div>
              )}
            </div>
          )}
        </div>
      )}

      {occupiedBuildingName && (
        <p style={{ margin: '0 0 10px', color: 'var(--teal)', fontWeight: 'bold' }}>
          Đang có công trình: {occupiedBuildingName}
        </p>
      )}

      {(isOwned || isLeased) && !occupiedBuildingName && (
        <p style={{ margin: '0 0 10px', color: 'var(--gold)', fontSize: 13 }}>
          Lô đất trống đã sẵn sàng! Bạn có thể mở chi nhánh hoặc cơ sở kinh doanh mới tại đây.
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: 12 }}>
        <PixelButton onClick={onClose}>Đóng</PixelButton>

        {isLeased && leaseDebtDays > 0 && onPayRentDebt && (
          <PixelButton
            variant="wood"
            disabled={poorPayDebt}
            onClick={async () => {
              await onPayRentDebt(parcelId);
              onClose();
            }}
          >
            {poorPayDebt ? 'Thiếu tiền trả nợ' : `Trả nợ thuê (${money(debtAmount)})`}
          </PixelButton>
        )}

        {isLeased && !occupiedBuildingName && onEndLease && (
          <PixelButton
            variant="danger"
            onClick={async () => {
              await onEndLease(parcelId);
              onClose();
            }}
          >
            Hủy thuê đất
          </PixelButton>
        )}

        {(isOwned || isLeased) && onOpenBuildingPrompt && !occupiedBuildingName && (
          <PixelButton
            variant="teal"
            onClick={() => {
              onClose();
              onOpenBuildingPrompt(parcelId);
            }}
          >
            Mở cơ sở mới
          </PixelButton>
        )}

        {isLeased && (
          <PixelButton
            variant="teal"
            disabled={poorBuy}
            onClick={async () => {
              await onBuy(parcelId);
              onClose();
            }}
          >
            {poorBuy ? 'Thiếu tiền mua' : `Mua đứt (${money(price)})`}
          </PixelButton>
        )}

        {!isOwned && !isLeased && (
          <>
            {canLease && onLease && (
              <PixelButton
                variant="wood"
                disabled={poorLease}
                onClick={async () => {
                  await onLease(parcelId);
                  onClose();
                }}
              >
                {poorLease ? 'Thiếu tiền thuê' : `Thuê (${money(dailyRent)}/ngày)`}
              </PixelButton>
            )}
            <PixelButton
              variant="teal"
              disabled={poorBuy}
              onClick={async () => {
                await onBuy(parcelId);
                onClose();
              }}
            >
              {poorBuy ? 'Thiếu tiền mua' : `Mua đứt (${money(price)})`}
            </PixelButton>
          </>
        )}
      </div>
    </PixelDialog>
  );
};
