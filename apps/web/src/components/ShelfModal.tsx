import React, { useEffect, useState } from 'react';
import { StoreFixture, InventoryItem } from '@game/shared';
import { PRODUCT_MAP, effectiveShelfCapacity, refrigerationAccepts } from '@game/data';
import { looseUnits, sealedCases } from '@game/core';
import { useGameStore } from '../store/useGameStore';
import { PixelDialog, PixelButton, ProductSlot, PixelProgress, EmptyState, money } from './pixel';

interface Props {
  /** Bonus sức chứa kệ từ perk (0.2 = +20%). */
  capacityBonus?: number;
  fixture: StoreFixture;
  inventory: InventoryItem[];
  currentDay: number;
  planogram?: Record<string, string>;
  onRestock: (id: string, p: string, n: number) => void;
  onUnstock: (id: string, n: number) => void;
  onSetPlanogramAssignment?: (fixtureId: string, productId?: string) => void;
  onApplyPlanogram?: (fixtureId?: string) => void;
  sellingPrice?: number;
  sellingPriceBounds?: { min: number; max: number; step: number } | null;
  onSetPrice?: (productId: string, price: number | null) => void;
  onClose: () => void;
  /** Mọi ô của cùng một kệ (ô chính + ô phụ), theo thứ tự. */
  slots?: StoreFixture[];
  onSelectSlot?: (fixtureId: string) => void;
}

export const ShelfModal: React.FC<Props> = ({
  fixture,
  inventory,
  currentDay,
  planogram = {},
  onRestock,
  onUnstock,
  onSetPlanogramAssignment,
  onApplyPlanogram,
  sellingPrice,
  sellingPriceBounds,
  onSetPrice,
  onClose,
  capacityBonus = 0,
  slots = [],
  onSelectSlot,
}) => {
  const [priceDraft, setPriceDraft] = useState(sellingPrice ?? 0);
  const product = fixture.assignedProductId ? PRODUCT_MAP[fixture.assignedProductId] : null;
  useEffect(() => setPriceDraft(sellingPrice ?? product?.baseSellingPrice ?? 0), [fixture.id, product?.id, product?.baseSellingPrice, sellingPrice]);
  const limit = product ? effectiveShelfCapacity(fixture.maxCapacity, product.shelfCapacity, capacityBonus) : fixture.maxCapacity;
  // Chỉ hàng lẻ bày lên kệ được; hàng còn nguyên thùng phải mở ở kho trước.
  const stockOf = (item: InventoryItem | undefined) => {
    const caseSize = item ? PRODUCT_MAP[item.productId]?.caseSize : undefined;
    const loose = item ? (item.lots ? looseUnits(item.lots, caseSize) : item.quantity) : 0;
    return { loose, cases: item?.lots ? sealedCases(item.lots) : 0, caseSize };
  };
  const stockLabel = (stock: ReturnType<typeof stockOf>) =>
    stock.cases > 0 ? `${stock.loose} lẻ · ${stock.cases} thùng (${stock.cases * (stock.caseSize ?? 0)} món trong thùng)` : `${stock.loose} món`;
  const bagStock = stockOf(inventory.find((i) => i.productId === product?.id));
  const inBag = bagStock.loose;
  const compatible = inventory.filter(
    (i) =>
      i.quantity > 0 &&
      PRODUCT_MAP[i.productId] &&
      (fixture.type === 'refrigerator'
        ? refrigerationAccepts(fixture, PRODUCT_MAP[i.productId], slots)
        : (PRODUCT_MAP[i.productId].category !== 'frozen') && PRODUCT_MAP[i.productId].storageType === 'ambient' || (PRODUCT_MAP[i.productId].storageType === 'cold' && !PRODUCT_MAP[i.productId].coldOnly))
  );

  const planogramProductId = planogram[fixture.id];
  const planogramProduct = planogramProductId ? PRODUCT_MAP[planogramProductId] : null;
  const isMismatchPlanogram = product && planogramProductId && planogramProductId !== product.id;

  const reason = fixture.currentStock >= limit ? 'Kệ đã đầy.'
    : inBag <= 0 && bagStock.cases > 0 ? 'Hàng còn nguyên thùng trong kho — mở thùng ở kho rồi mới bày lên kệ.'
    : inBag <= 0 ? 'Trong kho không còn hàng này để bày thêm.' : '';

  return (
    <PixelDialog
      title={fixture.label}
      subtitle={fixture.type === 'refrigerator' ? 'Bày hàng giữ lạnh (sữa, trứng, nước uống lạnh, trái cây...)' : 'Chăm chút từng kệ hàng (sữa tiệt trùng để nhiệt độ thường cũng được)'}
      icon={fixture.type === 'refrigerator' ? 'cold' : 'warehouse'}
      onClose={onClose}
    >
      {slots.length > 1 && <div className="shelf-slot-tabs" role="tablist" aria-label="Các ô trên kệ">
        {slots.map((slot, index) => <PixelButton key={slot.id} role="tab" aria-selected={slot.id === fixture.id} variant={slot.id === fixture.id ? 'teal' : undefined} onClick={() => onSelectSlot?.(slot.id)}>
          Ô {index + 1}: {slot.assignedProductId ? `${PRODUCT_MAP[slot.assignedProductId]?.name ?? slot.assignedProductId} (${slot.currentStock})` : 'trống'}
        </PixelButton>)}
      </div>}
      <div className="info-card">
        <div className="section-label">
          <strong>Sức chứa ô này</strong>
          <span>
            {fixture.currentStock}/{limit} món
          </span>
        </div>
        <PixelProgress label="Hàng trên kệ" value={fixture.currentStock} max={limit} />
      </div>

      {/* Sơ đồ bày kệ (Planogram) status card */}
      <div className="info-card" style={{ background: '#fdfbf7', border: '1px solid #d4c5b9' }}>
        <div className="section-label">
          <strong>Sơ đồ bày kệ (Planogram)</strong>
          {planogramProduct ? (
            <span style={{ color: isMismatchPlanogram ? '#c0392b' : '#27ae60', fontWeight: 'bold' }}>
              {isMismatchPlanogram ? '⚠️ Khác sơ đồ' : '✓ Đúng sơ đồ'}
            </span>
          ) : (
            <span style={{ color: '#7f8c8d' }}>Chưa thiết lập</span>
          )}
        </div>
        {planogramProduct ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '6px' }}>
            <div>
              <span style={{ fontSize: '13px' }}>Chỉ định: <strong>{planogramProduct.name}</strong></span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {onApplyPlanogram && (
                <PixelButton
                  variant="teal"
                  onClick={() => onApplyPlanogram(fixture.id)}
                  title="Bày hàng theo sơ đồ"
                >
                  Áp dụng
                </PixelButton>
              )}
              {onSetPlanogramAssignment && (
                <PixelButton
                  variant="wood"
                  onClick={() => onSetPlanogramAssignment(fixture.id, undefined)}
                  title="Hủy gán sơ đồ cho kệ này"
                >
                  Xóa
                </PixelButton>
              )}
            </div>
          </div>
        ) : (
          product && onSetPlanogramAssignment && (
            <div style={{ marginTop: '6px' }}>
              <PixelButton
                variant="wood"
                onClick={() => onSetPlanogramAssignment(fixture.id, product.id)}
              >
                📌 Lưu "{product.name}" vào sơ đồ kệ
              </PixelButton>
            </div>
          )
        )}
      </div>

      {product ? (
        <div className="info-card">
          <div className="product-row">
            <ProductSlot productId={product.id} />
            <div className="product-info">
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <p>
                Giá gợi ý {money(product.baseSellingPrice)} · Giá bán {money(sellingPrice ?? product.baseSellingPrice)} · Vốn {money(product.purchasePrice)}
              </p>
              <p>
                Trong kho: <strong>{stockLabel(bagStock)}</strong>
              </p>
              {fixture.stockLots?.[0] && (
                <p>
                  Hạn gần nhất: ngày {fixture.stockLots[0].expiresOnDay} · còn{' '}
                  {Math.max(0, fixture.stockLots[0].expiresOnDay - currentDay)} ngày
                </p>
              )}
            </div>
          </div>
          {onSetPrice && sellingPriceBounds && <div className="info-card">
            <strong>Đặt giá bán</strong>
            <p className="muted">Khoảng {money(sellingPriceBounds.min)}–{money(sellingPriceBounds.max)} · biên trước hao hụt {money((sellingPrice ?? product.baseSellingPrice) - product.purchasePrice)}/món</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <label htmlFor={`selling-price-${fixture.id}`} className="muted">Giá mới</label>
              <input id={`selling-price-${fixture.id}`} type="number" min={sellingPriceBounds.min} max={sellingPriceBounds.max} step={sellingPriceBounds.step} value={priceDraft} onChange={event => setPriceDraft(Number(event.target.value))} />
              <PixelButton variant="teal" onClick={() => onSetPrice(product.id, priceDraft)}>Áp dụng</PixelButton>
              <PixelButton variant="wood" onClick={() => { setPriceDraft(product.baseSellingPrice); onSetPrice(product.id, null); }}>Về giá gợi ý</PixelButton>
            </div>
          </div>}
          {reason && <p className="action-reason">{reason}</p>}
          <div className="action-grid">
            <PixelButton variant="teal" icon="plus" disabled={!!reason} onClick={() => onRestock(fixture.id, product.id, 1)}>
              Bày thêm 1
            </PixelButton>
            <PixelButton
              variant="teal"
              disabled={!!reason}
              onClick={() => onRestock(fixture.id, product.id, Math.min(inBag, limit - fixture.currentStock))}
            >
              ⚡ Bày hàng lên kệ
            </PixelButton>
            <PixelButton icon="minus" disabled={fixture.currentStock <= 0} onClick={() => onUnstock(fixture.id, 1)}>
              Cất lại 1
            </PixelButton>
            <PixelButton disabled={fixture.currentStock <= 0} onClick={() => onUnstock(fixture.id, fixture.currentStock)}>
              Cất hết vào kho
            </PixelButton>
          </div>
        </div>
      ) : (
        <>
          <p className="muted">Kệ đang trống. Chọn hàng phù hợp trong kho để bắt đầu bày.</p>
          {compatible.length ? (
            compatible.map((i) => { const stock = stockOf(i); return (
              <div className="product-row" key={i.productId}>
                <ProductSlot productId={i.productId} />
                <div className="product-info">
                  <h3>{PRODUCT_MAP[i.productId].name}</h3>
                  <p>
                    Trong kho {stockLabel(stock)} · Bán {money(PRODUCT_MAP[i.productId].baseSellingPrice)}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <PixelButton
                    variant="teal"
                    disabled={stock.loose <= 0}
                    title={stock.loose <= 0 ? 'Còn nguyên thùng — mở thùng ở kho trước' : undefined}
                    onClick={() =>
                      onRestock(
                        fixture.id,
                        i.productId,
                        Math.min(stock.loose, effectiveShelfCapacity(fixture.maxCapacity, PRODUCT_MAP[i.productId].shelfCapacity, capacityBonus))
                      )
                    }
                  >
                    Bày lên kệ
                  </PixelButton>
                  {onSetPlanogramAssignment && (
                    <PixelButton
                      variant="wood"
                      onClick={() => onSetPlanogramAssignment(fixture.id, i.productId)}
                      title="Lưu vào sơ đồ kệ"
                    >
                      📌
                    </PixelButton>
                  )}
                </div>
              </div>
            ); })
          ) : (
            <EmptyState title="Chưa có hàng phù hợp">
              Ghé đại lý để nhập hàng cho {fixture.type === 'refrigerator' ? 'tủ mát' : 'kệ'}.
            </EmptyState>
          )}
        </>
      )}
      <PixelButton icon="truck" onClick={useGameStore.getState().openSupplierModal}>
        Nhập thêm từ đại lý
      </PixelButton>
    </PixelDialog>
  );
};
