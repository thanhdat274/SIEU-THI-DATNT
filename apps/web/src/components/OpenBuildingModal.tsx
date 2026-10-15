import React, { useState } from 'react';
import { BUILDING_TYPE_DEFS, resolveParcel, type BuildingTypeId, type BuildingPlacement } from '@game/data';
import { PixelButton, PixelDialog, money } from './pixel';

export interface Props {
  parcelId: string;
  playerMoney: number;
  playerLevel: number;
  existingPlacements?: readonly { buildingId: string; typeId?: string }[];
  onOpenBuilding: (buildingTypeId: string, parcelId: string, originX: number, originY: number) => void | Promise<void>;
  onClose: () => void;
}

const EXPANDABLE_BUILDING_TYPES: BuildingTypeId[] = [
  'grocery_branch',
  'cafe',
  'parking_lot',
  'com_restaurant',
];

const TYPE_DESCRIPTIONS: Record<string, string> = {
  grocery_branch: 'Chi nhánh tạp hóa (8×8): Cùng danh mục tiệm chính trừ đồ đông lạnh; mở rộng mạng lưới bán lẻ.',
  cafe: 'Quán cà phê (8×8): Quầy pha chế cà phê, sinh tố; đông khách vào khung giờ sáng 6h–10h.',
  parking_lot: 'Bãi giữ xe (6×6): Tự động thu phí xe; tăng +15% lượt khách đi xe cho các tiệm trong bán kính 12 ô.',
  com_restaurant: 'Quán cơm phần (10×8): Quầy bếp nấu cơm món nóng; nhịp khách bùng nổ giờ trưa (11h–13h) và tối (17h–20h).',
};

export const OpenBuildingModal: React.FC<Props> = ({
  parcelId,
  playerMoney,
  playerLevel,
  existingPlacements = [],
  onOpenBuilding,
  onClose,
}) => {
  const [selectedType, setSelectedType] = useState<BuildingTypeId>('grocery_branch');
  const parcel = resolveParcel(parcelId);

  if (!parcel) return null;

  const typeDefs = EXPANDABLE_BUILDING_TYPES.map(typeId => BUILDING_TYPE_DEFS[typeId]);
  const currentDef = BUILDING_TYPE_DEFS[selectedType];
  const currentCount = existingPlacements.filter(p => p.typeId === selectedType).length;
  const reachedMax = currentCount >= currentDef.maxInstances;
  const levelLocked = playerLevel < currentDef.unlockLevel;
  const moneyLocked = playerMoney < currentDef.openCost;
  const canBuild = !reachedMax && !levelLocked && !moneyLocked;

  const handleBuild = async () => {
    if (!canBuild) return;
    const originX = parcel.rect.x0;
    const originY = parcel.rect.y1 - (currentDef.template.height - 1);
    await onOpenBuilding(selectedType, parcelId, originX, originY);
    onClose();
  };

  return (
    <PixelDialog
      icon="warehouse"
      title="Mở cơ sở kinh doanh"
      subtitle={`Xây dựng trên lô đất ${parcelId}`}
      onClose={onClose}
    >
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
        {typeDefs.map(def => {
          const isSelected = def.typeId === selectedType;
          const count = existingPlacements.filter(p => p.typeId === def.typeId).length;
          return (
            <PixelButton
              key={def.typeId}
              variant={isSelected ? 'teal' : 'wood'}
              onClick={() => setSelectedType(def.typeId)}
              style={{ fontSize: 12, whiteSpace: 'nowrap' }}
            >
              {def.name} ({count}/{def.maxInstances})
            </PixelButton>
          );
        })}
      </div>

      <div style={{ background: 'rgba(0,0,0,0.04)', padding: 12, borderRadius: 4, marginBottom: 12 }}>
        <h4 style={{ margin: '0 0 6px', fontSize: 15 }}>{currentDef.name}</h4>
        <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.4 }} className="muted">
          {TYPE_DESCRIPTIONS[currentDef.typeId] ?? 'Mô hình cơ sở kinh doanh mới.'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
          <div>
            <strong>Cấp yêu cầu:</strong>{' '}
            <span style={{ color: levelLocked ? 'var(--brick)' : 'inherit' }}>
              Cấp {currentDef.unlockLevel} {levelLocked ? '(Chưa đạt)' : '✓'}
            </span>
          </div>
          <div>
            <strong>Phí đầu tư:</strong>{' '}
            <span style={{ color: moneyLocked ? 'var(--brick)' : 'var(--teal)', fontWeight: 'bold' }}>
              {money(currentDef.openCost)} {moneyLocked ? '(Thiếu)' : ''}
            </span>
          </div>
          <div>
            <strong>Quy mô:</strong> {currentDef.template.width}×{currentDef.template.height} ô
          </div>
          <div>
            <strong>Số lượng:</strong> {currentCount} / {currentDef.maxInstances} cơ sở
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <PixelButton onClick={onClose}>Đóng</PixelButton>
        <PixelButton
          variant="teal"
          disabled={!canBuild}
          onClick={handleBuild}
        >
          {reachedMax
            ? 'Đã đạt số lượng tối đa'
            : levelLocked
            ? `Cần cấp ${currentDef.unlockLevel}`
            : moneyLocked
            ? 'Không đủ tiền'
            : `Đầu tư & Mở cơ sở (${money(currentDef.openCost)})`}
        </PixelButton>
      </div>
    </PixelDialog>
  );
};
