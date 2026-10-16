import React, { useState } from 'react';
import { BUILDING_TYPE_DEFS, CIVIC_DEFS, resolveParcel, validatePlacement, type BuildingTypeId } from '@game/data';
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
  // Công trình công cộng (civic-buildings-qol): chủ tiệm góp vốn xây cho phường.
  'park',
  'clinic',
  'ward_police',
  'primary_school',
];

const isCivic = (typeId: string): boolean => CIVIC_DEFS.some(def => def.buildingTypeId === typeId);

const TYPE_DESCRIPTIONS: Record<string, string> = {
  grocery_branch: 'Chi nhánh tạp hóa (8×8): Cùng danh mục tiệm chính trừ đồ đông lạnh; mở rộng mạng lưới bán lẻ.',
  cafe: 'Quán cà phê (8×8): Quầy pha chế cà phê, sinh tố; đông khách vào khung giờ sáng 6h–10h.',
  parking_lot: 'Bãi giữ xe (6×6): Tự động thu phí xe; tăng +15% lượt khách đi xe cho các tiệm trong bán kính 12 ô.',
  com_restaurant: 'Quán cơm phần (10×8): Quầy bếp nấu cơm món nóng; nhịp khách bùng nổ giờ trưa (11h–13h) và tối (17h–20h).',
  park: 'Công viên (6×6): Góp vốn xây cho phường; tăng chỉ số sống của khu trong bán kính 12 ô. Không bán hàng.',
  clinic: 'Trạm y tế (6×8): Góp vốn xây cho phường; tăng chỉ số sống của khu trong bán kính 16 ô. Không bán hàng.',
  ward_police: 'Đồn công an phường (6×8): Tăng chỉ số sống; tiệm trong bán kính 16 ô dễ bắt trộm hơn và ít bị trộm đêm hơn.',
  primary_school: 'Trường tiểu học (8×8): Góp vốn xây cho phường; tăng chỉ số sống của khu trong bán kính 16 ô. Không bán hàng.',
};

/** Gốc hợp lệ đầu tiên trong lô (đúng hàng mặt tiền, nằm trong lô, cửa không bị cây chặn); null nếu loại này không vừa lô. */
function firstValidOrigin(typeId: BuildingTypeId, parcelId: string): { originX: number; originY: number } | null {
  const parcel = resolveParcel(parcelId);
  if (!parcel) return null;
  const originY = parcel.rect.y1 - (BUILDING_TYPE_DEFS[typeId].template.height - 1);
  for (let originX = parcel.rect.x0; originX <= parcel.rect.x1; originX++) {
    if (validatePlacement({ buildingId: `${typeId}-1`, parcelId, originX, originY }, [], [parcelId]) === null) return { originX, originY };
  }
  return null;
}

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
  const cost = currentDef.buildCost ?? currentDef.openCost;
  const moneyLocked = playerMoney < cost;
  const origin = firstValidOrigin(selectedType, parcelId);
  const canBuild = !reachedMax && !levelLocked && !moneyLocked && origin !== null;

  const handleBuild = async () => {
    if (!canBuild || !origin) return;
    await onOpenBuilding(selectedType, parcelId, origin.originX, origin.originY);
    onClose();
  };

  return (
    <PixelDialog
      icon="warehouse"
      title="Mở cơ sở / công trình"
      subtitle={`Xây dựng trên lô đất ${parcelId}`}
      onClose={onClose}
    >
      <div className="feature-scroll-tabs" style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
        {typeDefs.map(def => {
          const isSelected = def.typeId === selectedType;
          const count = existingPlacements.filter(p => p.typeId === def.typeId).length;
          return (
            <PixelButton
              key={def.typeId}
              variant={isSelected ? 'teal' : 'wood'}
              onClick={() => setSelectedType(def.typeId)}
              style={{ fontSize: 12, whiteSpace: 'nowrap', minHeight: 44 }}
            >
              {isCivic(def.typeId) ? '🏛 ' : ''}{def.name} ({count}/{def.maxInstances})
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
            <strong>{isCivic(selectedType) ? 'Góp vốn xây:' : 'Phí đầu tư:'}</strong>{' '}
            <span style={{ color: moneyLocked ? 'var(--brick)' : 'var(--teal)', fontWeight: 'bold' }}>
              {money(cost)} {moneyLocked ? '(Thiếu)' : ''}
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
            : origin === null
            ? 'Không vừa lô này'
            : isCivic(selectedType)
            ? `Góp vốn xây (${money(cost)})`
            : `Đầu tư & Mở cơ sở (${money(cost)})`}
        </PixelButton>
      </div>
    </PixelDialog>
  );
};
