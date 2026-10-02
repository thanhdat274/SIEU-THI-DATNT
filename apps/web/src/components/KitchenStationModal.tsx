import React from 'react';
import type { InventoryItem, ProductionJob, StoreFixture } from '@game/shared';
import { PRODUCT_MAP, Recipe } from '@game/data';
import { PixelButton, PixelDialog } from './pixel';

interface Props {
  fixture: StoreFixture;
  recipes: Recipe[];
  job?: ProductionJob;
  inventory: InventoryItem[];
  day: number;
  onStart: (recipeId: string) => void;
  onClose: () => void;
}

const usable = (inventory: InventoryItem[], productId: string, day: number): number => {
  const slot = inventory.find(item => item.productId === productId);
  if (!slot) return 0;
  return slot.lots ? slot.lots.filter(lot => lot.expiresOnDay > day).reduce((sum, lot) => sum + lot.quantity, 0) : slot.quantity;
};

export const KitchenStationModal: React.FC<Props> = ({ fixture, recipes, job, inventory, day, onStart, onClose }) => {
  const running = job ? recipes.find(recipe => recipe.id === job.recipeId) : undefined;
  return <PixelDialog title={fixture.label} subtitle="Trạm bếp trong tiệm" icon="coin" onClose={onClose}>
    {job && <p><strong>Đang nấu: {running?.name ?? job.recipeId}</strong> · còn khoảng {Math.ceil(job.remaining)} giây</p>}
    {recipes.length === 0 && <p className="muted">Chưa có công thức nào mở khóa cho trạm này.</p>}
    {recipes.map(recipe => {
      const lacking = recipe.inputs.some(input => usable(inventory, input.productId, day) < input.quantity);
      return <div className="summary-row" key={recipe.id}>
        <div>
          <strong>{recipe.name}</strong>
          <p className="muted">Cần: {recipe.inputs.map(input => `${input.quantity} ${PRODUCT_MAP[input.productId]?.name ?? input.productId} (kho ${usable(inventory, input.productId, day)})`).join(', ')}</p>
          <p className="muted">Ra {recipe.outputQuantity} {PRODUCT_MAP[recipe.outputProductId]?.name} · {recipe.durationSeconds} giây</p>
        </div>
        <PixelButton variant="teal" disabled={!!job || lacking} onClick={() => onStart(recipe.id)}>{lacking ? 'Thiếu nguyên liệu' : 'Bắt đầu nấu'}</PixelButton>
      </div>;
    })}
    <p className="muted">Thành phẩm được đưa vào kho; mang lên kệ để bán. Nhân viên bổ sung hàng đang trong ca giúp nấu nhanh hơn.</p>
  </PixelDialog>;
};
