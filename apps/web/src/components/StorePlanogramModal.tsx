import React, { useState, useMemo } from 'react';
import { StoreFixture, InventoryItem, type GameTileMap, isSalesFixture, isUsableSalesFixture, slotGroup } from '@game/shared';
import { PRODUCT_MAP, SELLABLE_PRODUCTS, effectiveShelfCapacity, FIXTURE_SHOP, fixtureBuilding, refrigerationAccepts } from '@game/data';
import { fixturePreviewUrl } from '@game/renderer';
import { PixelDialog, PixelButton, PixelIcon, ProductSlot, PixelProgress, EmptyState } from './pixel';
import './store-planogram.css';

export interface Props {
  fixtures: StoreFixture[];
  /** Tòa đang có theo vị trí đặt (`GameTileMap.buildings`) để biết kệ thuộc tòa nào; thiếu = vị trí mặc định. */
  buildings?: GameTileMap['buildings'];
  inventory: InventoryItem[];
  planogram?: Record<string, string>;
  capacityBonus?: number;
  currentDay: number;
  onRestock: (fixtureId: string, productId: string, quantity: number) => void;
  onUnstock: (fixtureId: string, quantity: number) => void;
  onSetPlanogramAssignment?: (fixtureId: string, productId?: string) => void;
  onOpenSupplier?: (preferredProductId?: string) => void;
  /** Tự động gán sản phẩm + bày đầy một kệ (kể cả khi chưa gán sản phẩm). */
  onAutoFill?: (fixtureId: string) => { assigned: boolean; productId: string | null; filled: number; reason: string };
  /** Tự động gán + bày đầy toàn bộ kệ. */
  onAutoFillAll?: () => { totalFilled: number; newAssignments: number; skipped: number };
  /** ID các món xôi để UI biết khi nào chỉ chấp nhận món xôi cho kệ xôi. */
  xoiProductIds?: readonly string[];
  /** Món của quán nước: kệ trong quán nước chỉ nhận các món này (khớp `autoFillShelf`). */
  drinkProductIds?: readonly string[];
  snackProductIds?: readonly string[];
  onClose: () => void;
}

type FixtureFilter = 'all' | 'needs_stock' | 'shelf_wooden' | 'shelf_glass' | 'refrigerator';

const catalogName = (fixture: StoreFixture) => {
  if (fixture.shopId) return FIXTURE_SHOP.find(item => item.id === fixture.shopId)?.name ?? fixture.label;
  if (fixture.type === 'refrigerator') return fixture.widthTiles >= 2 ? 'Tủ lạnh 2 cánh' : 'Tủ lạnh 1 cánh';
  if (fixture.type === 'shelf_glass') return 'Kệ kính';
  if (fixture.type === 'shelf_wooden') return 'Kệ gỗ';
  return fixture.label;
};

export const StorePlanogramModal: React.FC<Props> = ({
  fixtures,
  buildings,
  inventory,
  planogram = {},
  capacityBonus = 0,
  currentDay,
  onRestock,
  onUnstock,
  onSetPlanogramAssignment,
  onOpenSupplier,
  onAutoFill,
  onAutoFillAll,
  xoiProductIds,
  drinkProductIds,
  snackProductIds,
  onClose,
}) => {
  const xoiIds = xoiProductIds ?? [];
  const drinkIds = drinkProductIds ?? [];
  const snackIds = snackProductIds ?? [];
  const [filter, setFilter] = useState<FixtureFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [slotToChange, setSlotToChange] = useState<{ slot: StoreFixture; parent: StoreFixture } | null>(null);

  // Danh sách các kệ chính (không phải ô phụ và là kệ bày hàng)
  const mainFixtures = useMemo(() => {
    return fixtures.filter(f => !f.parentId && isSalesFixture(f));
  }, [fixtures]);

  // Map số lượng tồn kho theo productId
  const inventoryMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of inventory) {
      map.set(item.productId, item.quantity);
    }
    return map;
  }, [inventory]);

  // Thống kê toàn tiệm
  const stats = useMemo(() => {
    let totalSlots = 0;
    let emptySlots = 0;
    let lowStockSlots = 0;
    let canRestockCount = 0;

    for (const mainFix of mainFixtures) {
      const slots = slotGroup(fixtures, mainFix);
      for (const slot of slots) {
        totalSlots++;
        const pId = slot.assignedProductId || planogram[slot.id];
        const prod = pId ? PRODUCT_MAP[pId] : null;
        const limit = prod ? effectiveShelfCapacity(slot.maxCapacity, prod.shelfCapacity, capacityBonus) : slot.maxCapacity;

        if (slot.currentStock === 0) {
          emptySlots++;
        } else if (slot.currentStock < Math.ceil(limit / 2)) {
          lowStockSlots++;
        }

        if (prod && slot.currentStock < limit) {
          const inBag = inventoryMap.get(prod.id) ?? 0;
          if (inBag > 0) canRestockCount++;
        } else if (!pId) {
          // Ô chưa gán: kiểm tra kho có hàng phù hợp không (cho nút auto-fill)
          const isColdFix = mainFix.type === 'refrigerator';
          const hasCompatible = inventory.some(inv => {
            if (inv.quantity <= 0) return false;
            const p = PRODUCT_MAP[inv.productId];
            if (!p) return false;
            if (isColdFix ? !refrigerationAccepts(mainFix, p, fixtures) : p.storageType === 'cold') return false;
            // Kệ xôi: chỉ cho phép món xôi
            if (xoiIds.length > 0 && fixtureBuilding(mainFix, buildings) === 'xoi' && !xoiIds.includes(inv.productId)) return false;
            if (drinkIds.length > 0 && fixtureBuilding(mainFix, buildings) === 'drink' && !drinkIds.includes(inv.productId)) return false;
            if (snackIds.length > 0 && fixtureBuilding(mainFix, buildings) === 'snack' && !snackIds.includes(inv.productId)) return false;
            return true;
          });
          if (hasCompatible) canRestockCount++;
        }
      }
    }

    return { totalSlots, emptySlots, lowStockSlots, canRestockCount };
  }, [mainFixtures, fixtures, planogram, capacityBonus, inventoryMap, xoiIds]);

  // Lọc kệ theo tiêu chí
  const filteredFixtures = useMemo(() => {
    return mainFixtures.filter(mainFix => {
      // Lọc theo loại
      if (filter === 'shelf_wooden' && mainFix.type !== 'shelf_wooden') return false;
      if (filter === 'shelf_glass' && mainFix.type !== 'shelf_glass') return false;
      if (filter === 'refrigerator' && mainFix.type !== 'refrigerator') return false;

      const slots = slotGroup(fixtures, mainFix);

      // Lọc theo "Cần châm hàng"
      if (filter === 'needs_stock') {
        const hasNeeded = slots.some(slot => {
          const pId = slot.assignedProductId || planogram[slot.id];
          const prod = pId ? PRODUCT_MAP[pId] : null;
          const limit = prod ? effectiveShelfCapacity(slot.maxCapacity, prod.shelfCapacity, capacityBonus) : slot.maxCapacity;
          return slot.currentStock < limit;
        });
        if (!hasNeeded) return false;
      }

      // Lọc theo tìm kiếm từ khóa
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const nameMatch = (catalogName(mainFix) || '').toLowerCase().includes(query) || (mainFix.label || '').toLowerCase().includes(query);
        const productMatch = slots.some(slot => {
          const pId = slot.assignedProductId || planogram[slot.id];
          const prod = pId ? PRODUCT_MAP[pId] : null;
          return prod && (prod.name.toLowerCase().includes(query) || prod.id.toLowerCase().includes(query));
        });
        if (!nameMatch && !productMatch) return false;
      }

      return true;
    });
  }, [mainFixtures, filter, fixtures, planogram, capacityBonus, searchQuery]);

  // Hành động: Bày đầy tất cả các kệ (kể cả ô trống chưa gán → tự động gán + bày)
  const handleRestockAll = () => {
    if (onAutoFillAll) {
      onAutoFillAll();
      return;
    }
    // Fallback: chỉ châm các ô đã gán sẵn
    for (const mainFix of mainFixtures) {
      if (mainFix.broken) continue;
      const slots = slotGroup(fixtures, mainFix);
      for (const slot of slots) {
        const pId = slot.assignedProductId || planogram[slot.id];
        if (!pId) continue;
        const prod = PRODUCT_MAP[pId];
        if (!prod) continue;
        const limit = effectiveShelfCapacity(slot.maxCapacity, prod.shelfCapacity, capacityBonus);
        const needed = limit - slot.currentStock;
        if (needed <= 0) continue;
        const inBag = inventoryMap.get(pId) ?? 0;
        const toAdd = Math.min(needed, inBag);
        if (toAdd > 0) onRestock(slot.id, pId, toAdd);
      }
    }
  };

  // Hành động: Bày đầy 1 kệ cụ thể (kể cả ô trống chưa gán → tự động gán + bày)
  const handleRestockFixture = (mainFix: StoreFixture) => {
    if (mainFix.broken) return;
    if (onAutoFill) {
      // Smart path: châm từng ô (cả ô trống)
      const slots = slotGroup(fixtures, mainFix);
      for (const slot of slots) {
        onAutoFill(slot.id);
      }
      return;
    }
    // Fallback: chỉ châm các ô đã gán
    const slots = slotGroup(fixtures, mainFix);
    for (const slot of slots) {
      const pId = slot.assignedProductId || planogram[slot.id];
      if (!pId) continue;
      const prod = PRODUCT_MAP[pId];
      if (!prod) continue;
      const limit = effectiveShelfCapacity(slot.maxCapacity, prod.shelfCapacity, capacityBonus);
      const needed = limit - slot.currentStock;
      if (needed <= 0) continue;
      const inBag = inventoryMap.get(pId) ?? 0;
      const toAdd = Math.min(needed, inBag);
      if (toAdd > 0) onRestock(slot.id, pId, toAdd);
    }
  };

  // Các sản phẩm tương thích khi đổi món cho 1 ô
  const compatibleProducts = useMemo(() => {
    if (!slotToChange) return [];
    const isCold = slotToChange.parent.type === 'refrigerator';
    return SELLABLE_PRODUCTS.filter(p => {
      if (isCold) {
        // Vào tủ lạnh: hàng cần lạnh và hàng thường nên bày lạnh (nước uống, trái cây...)
        return refrigerationAccepts(slotToChange.parent, p, fixtures);
      } else {
        // Vào kệ nhiệt độ thường: cho phép ambient HOẶC cold (không coldOnly)
        return p.storageType === 'ambient' || (p.storageType === 'cold' && !p.coldOnly);
      }
    });
  }, [slotToChange]);

  const handleSelectNewProduct = (productId: string) => {
    if (!slotToChange) return;
    const { slot } = slotToChange;

    // Nếu đang có hàng của món cũ, dỡ hết về kho
    if (slot.currentStock > 0) {
      onUnstock(slot.id, slot.currentStock);
    }

    // Gán món mới vào sơ đồ
    onSetPlanogramAssignment?.(slot.id, productId);

    // Châm ngay nếu trong kho có sẵn
    const inBag = inventoryMap.get(productId) ?? 0;
    const prod = PRODUCT_MAP[productId];
    if (prod && inBag > 0) {
      const limit = effectiveShelfCapacity(slot.maxCapacity, prod.shelfCapacity, capacityBonus);
      const toAdd = Math.min(limit, inBag);
      if (toAdd > 0) {
        onRestock(slot.id, productId, toAdd);
      }
    }

    setSlotToChange(null);
  };

  return (
    <PixelDialog
      title="Sơ đồ & Bày hàng tiệm"
      subtitle="Xem toàn bộ kệ & tủ mát trong tiệm, kiểm tra tồn hàng, bày hàng nhanh hoặc đặt thêm từ đại lý"
      icon="warehouse"
      onClose={onClose}
    >
      <div className="planogram-container">
        {/* Thanh thống kê & Nút bày nhanh toàn tiệm */}
        <div className="planogram-summary-bar">
          <div className="summary-stats">
            <span className="summary-stat-item">
              🏬 <strong>{mainFixtures.length}</strong> kệ/tủ ({stats.totalSlots} ô hàng)
            </span>
            <span className={`summary-stat-item ${stats.emptySlots > 0 ? 'is-danger' : ''}`}>
              🔴 <strong>{stats.emptySlots}</strong> ô hết hàng
            </span>
            {stats.lowStockSlots > 0 && (
              <span className="summary-stat-item is-warning">
                🟡 <strong>{stats.lowStockSlots}</strong> ô vơi
              </span>
            )}
            <span className="summary-stat-item">
              📦 Kho có: <strong>{inventory.reduce((sum, i) => sum + i.quantity, 0)}</strong> món
            </span>
          </div>

          <div className="summary-actions">
            <PixelButton
              variant="teal"
              className="btn-restock-all"
              disabled={stats.canRestockCount === 0}
              onClick={handleRestockAll}
              title={stats.canRestockCount > 0 ? `Bày hàng cho ${stats.canRestockCount} ô có sẵn đồ trong kho` : 'Kho chưa có hàng phù hợp để bày'}
            >
              ⚡ Bày hàng lên kệ ({stats.canRestockCount})
            </PixelButton>

            {onOpenSupplier && (
              <PixelButton
                className="btn-open-supplier"
                onClick={() => onOpenSupplier()}
                title="Ghé đại lý đặt hàng về kho"
              >
                🛒 Ghé đại lý
              </PixelButton>
            )}
          </div>
        </div>

        {/* Thanh bộ lọc & Tìm kiếm */}
        <div className="planogram-toolbar">
          <div className="planogram-filters">
            <button
              type="button"
              className={`filter-btn ${filter === 'all' ? 'is-active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Tất cả ({mainFixtures.length})
            </button>
            <button
              type="button"
              className={`filter-btn ${filter === 'needs_stock' ? 'is-active' : ''}`}
              onClick={() => setFilter('needs_stock')}
            >
              🔴 Cần bày hàng
            </button>
            <button
              type="button"
              className={`filter-btn ${filter === 'shelf_wooden' ? 'is-active' : ''}`}
              onClick={() => setFilter('shelf_wooden')}
            >
              🪵 Kệ gỗ
            </button>
            <button
              type="button"
              className={`filter-btn ${filter === 'refrigerator' ? 'is-active' : ''}`}
              onClick={() => setFilter('refrigerator')}
            >
              ❄️ Tủ lạnh/mát
            </button>
            <button
              type="button"
              className={`filter-btn ${filter === 'shelf_glass' ? 'is-active' : ''}`}
              onClick={() => setFilter('shelf_glass')}
            >
              🪟 Kệ kính
            </button>
          </div>

          <div className="planogram-search">
            <input
              type="text"
              placeholder="🔍 Tìm món hoặc tên kệ..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="planogram-search-input"
            />
            {searchQuery && (
              <button type="button" className="search-clear-btn" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>
        </div>

        {/* Danh sách các kệ hàng */}
        <div className="planogram-fixture-list">
          {filteredFixtures.length > 0 ? (
            filteredFixtures.map(mainFix => {
              const slots = slotGroup(fixtures, mainFix);
              const preview = fixturePreviewUrl(mainFix.type, mainFix.shopId);
              const isCold = mainFix.type === 'refrigerator';

              // Kiểm tra xem kệ này có thể châm thêm hàng không
              // (kể cả ô trống chưa gán — nếu có onAutoFill và kho có hàng phù hợp)
              const canRestockThisFixture = slots.some(slot => {
                const pId = slot.assignedProductId || planogram[slot.id];
                const prod = pId ? PRODUCT_MAP[pId] : null;
                if (prod) {
                  const limit = effectiveShelfCapacity(slot.maxCapacity, prod.shelfCapacity, capacityBonus);
                  return slot.currentStock < limit && (inventoryMap.get(prod.id) ?? 0) > 0;
                }
                // Ô trống chưa gán: kiểm tra có hàng tương thích không
                if (!pId && onAutoFill) {
                  return inventory.some(inv => {
                    if (inv.quantity <= 0) return false;
                    const p = PRODUCT_MAP[inv.productId];
                    if (!p) return false;
                    // Tủ lạnh: chỉ cold. Kệ nhiệt độ thường: ambient HOẶC cold (không coldOnly)
                    if (isCold) {
                      if (!refrigerationAccepts(mainFix, p, fixtures)) return false;
                    } else {
                      if (p.storageType === 'cold' && p.coldOnly) return false;
                    }
                    // Kệ xôi: chỉ cho phép món xôi
                    if (xoiIds.length > 0 && fixtureBuilding(mainFix, buildings) === 'xoi' && !xoiIds.includes(inv.productId)) return false;
            if (drinkIds.length > 0 && fixtureBuilding(mainFix, buildings) === 'drink' && !drinkIds.includes(inv.productId)) return false;
            if (snackIds.length > 0 && fixtureBuilding(mainFix, buildings) === 'snack' && !snackIds.includes(inv.productId)) return false;
                    return true;
                  });
                }
                return false;
              });

              const totalStock = slots.reduce((sum, s) => sum + s.currentStock, 0);
              const totalLimit = slots.reduce((sum, s) => {
                const pId = s.assignedProductId || planogram[s.id];
                const prod = pId ? PRODUCT_MAP[pId] : null;
                return sum + (prod ? effectiveShelfCapacity(s.maxCapacity, prod.shelfCapacity, capacityBonus) : s.maxCapacity);
              }, 0);

              const hasEmptySlot = slots.some(s => s.currentStock === 0);

              return (
                <article key={mainFix.id} className={`planogram-fixture-card ${mainFix.broken ? 'is-broken' : ''}`}>
                  {/* Card Header */}
                  <header className="fixture-card-header">
                    <div className="fixture-header-info">
                      <div className="fixture-thumb-box">
                        <img src={preview} alt="" className="fixture-thumb-img" draggable={false} />
                      </div>
                      <div className="fixture-title-box">
                        <div className="fixture-name-row">
                          <strong className="fixture-name">{catalogName(mainFix)}</strong>
                          <span className={`fixture-type-tag ${isCold ? 'is-cold' : 'is-dry'}`}>
                            {isCold ? '❄️ Tủ mát lạnh' : '🪵 Kệ đồ khô'}
                          </span>
                          {mainFix.broken ? (
                            <span className="fixture-broken-tag">⚠️ Kệ đang hỏng</span>
                          ) : (mainFix.wear ?? 0) >= 50 ? (
                            <span className="fixture-wear-tag">Mòn {mainFix.wear}%</span>
                          ) : null}
                        </div>
                        <span className="fixture-meta">
                          📍 Tọa độ ô ({mainFix.tileX}, {mainFix.tileY}) · {slots.length} ô hàng · Tồn tổng: {totalStock}/{totalLimit}
                        </span>
                      </div>
                    </div>

                    <div className="fixture-header-actions">
                      {hasEmptySlot && <span className="tag-has-empty">🔴 Có ô hết</span>}
                      <PixelButton
                        variant="teal"
                        className="btn-restock-fixture"
                        disabled={!canRestockThisFixture || !!mainFix.broken}
                        onClick={() => handleRestockFixture(mainFix)}
                        title="Bày hàng lên kệ này nếu kho có hàng"
                      >
                        ⚡ Bày hàng lên kệ
                      </PixelButton>
                    </div>
                  </header>

                  {/* Slots Grid */}
                  <div className="fixture-slots-grid">
                    {slots.map((slot, index) => {
                      const pId = slot.assignedProductId || planogram[slot.id];
                      const product = pId ? PRODUCT_MAP[pId] : null;
                      const limit = product
                        ? effectiveShelfCapacity(slot.maxCapacity, product.shelfCapacity, capacityBonus)
                        : slot.maxCapacity;

                      const inBag = product ? (inventoryMap.get(product.id) ?? 0) : 0;
                      const isFull = slot.currentStock >= limit;
                      const isEmpty = slot.currentStock === 0;
                      const canAdd = Math.min(limit - slot.currentStock, inBag);

                      return (
                        <div key={slot.id} className={`slot-card ${isEmpty ? 'is-empty' : isFull ? 'is-full' : 'is-partial'}`}>
                          {/* Slot Index Tag */}
                          <div className="slot-badge">Ô #{index + 1}</div>

                          {/* Product Info & Icon */}
                          <div className="slot-product-row">
                            <div className="slot-product-icon">
                              {product ? (
                                <ProductSlot productId={product.id} quantity={slot.currentStock} />
                              ) : (
                                <div className="product-slot is-unassigned">
                                  <span className="unassigned-placeholder">?</span>
                                </div>
                              )}
                            </div>

                            <div className="slot-details">
                              {product ? (
                                <>
                                  <strong className="slot-product-name" title={product.name}>
                                    {product.name}
                                  </strong>
                                  <div className="slot-stock-status">
                                    <span className={`stock-ratio ${isEmpty ? 'is-zero' : ''}`}>
                                      {slot.currentStock}/{limit} món
                                    </span>
                                    <span className={`bag-status ${inBag > 0 ? 'is-available' : 'is-out'}`}>
                                      Kho: {inBag > 0 ? `còn ${inBag}` : 'hết hàng'}
                                    </span>
                                  </div>
                                  <div className="slot-progress-wrap">
                                    <PixelProgress label="Tồn kệ" value={slot.currentStock} max={limit} />
                                  </div>
                                </>
                              ) : (
                                <>
                                  <span className="unassigned-title">Chưa gán món</span>
                                  <small className="unassigned-sub">Bấm nút bên dưới để chọn món bày lên</small>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Quick Actions for this Slot */}
                          <div className="slot-actions-row">
                            {product ? (
                              <>
                                <button
                                  type="button"
                                  className="btn-slot-quick is-fill"
                                  disabled={canAdd <= 0 || !!mainFix.broken}
                                  onClick={() => onRestock(slot.id, product.id, canAdd)}
                                  title={canAdd > 0 ? `Bày ${canAdd} món từ kho vào kệ` : inBag === 0 ? 'Kho hết hàng này' : 'Kệ đã đầy'}
                                >
                                  + Bày hàng lên kệ {canAdd > 0 ? `(+${canAdd})` : ''}
                                </button>

                                <button
                                  type="button"
                                  className="btn-slot-quick is-unstock"
                                  disabled={slot.currentStock <= 0}
                                  onClick={() => onUnstock(slot.id, 1)}
                                  title="Dỡ 1 món từ kệ cất lại về kho"
                                >
                                  - Bớt 1
                                </button>

                                {inBag === 0 && onOpenSupplier && (
                                  <button
                                    type="button"
                                    className="btn-slot-quick is-order"
                                    onClick={() => onOpenSupplier(product.id)}
                                    title="Mở đại lý để nhập thêm món này"
                                  >
                                    🛒 Nhập
                                  </button>
                                )}

                                <button
                                  type="button"
                                  className="btn-slot-quick is-change"
                                  onClick={() => setSlotToChange({ slot, parent: mainFix })}
                                  title="Đổi món khác cho ô này"
                                >
                                  🔄 Đổi
                                </button>
                              </>
                            ) : (
                              <>
                                {onAutoFill ? (
                                  <button
                                    type="button"
                                    className="btn-slot-quick is-assign-new"
                                    onClick={() => onAutoFill(slot.id)}
                                    title="Tự động chọn sản phẩm phù hợp từ kho và bày lên kệ này"
                                  >
                                    ⚡ Bày hàng tự động
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  className="btn-slot-quick is-change"
                                  onClick={() => setSlotToChange({ slot, parent: mainFix })}
                                  title="Chọn thủ công sản phẩm muốn bày lên ô này"
                                >
                                  + Chọn món
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })
          ) : (
            <EmptyState title="Không tìm thấy kệ phù hợp">
              Thử chọn bộ lọc khác hoặc xóa từ khóa tìm kiếm.
            </EmptyState>
          )}
        </div>
      </div>

      {/* Modal / Drawer Đổi món cho một ô hàng */}
      {slotToChange && (
        <div className="change-product-modal-backdrop" onClick={() => setSlotToChange(null)}>
          <div className="change-product-modal" onClick={e => e.stopPropagation()}>
            <header className="change-product-header">
              <div>
                <h3>Chọn món bày vào {slotToChange.parent.label}</h3>
                <p>
                  {slotToChange.parent.type === 'refrigerator'
                    ? 'Hàng tươi sống, đồ uống lạnh, sữa, trái cây, sô-cô-la... bày được ở tủ lạnh'
                    : 'Chỉ chọn các mặt hàng bảo quản khô ở nhiệt độ thường'}
                </p>
              </div>
              <PixelButton icon="close" onClick={() => setSlotToChange(null)} />
            </header>

            <div className="change-product-grid">
              {compatibleProducts.map(prod => {
                const inBag = inventoryMap.get(prod.id) ?? 0;
                return (
                  <button
                    key={prod.id}
                    type="button"
                    className="product-select-card"
                    onClick={() => handleSelectNewProduct(prod.id)}
                  >
                    <div className="card-prod-icon">
                      <ProductSlot productId={prod.id} />
                    </div>
                    <div className="card-prod-info">
                      <strong className="card-prod-name">{prod.name}</strong>
                      <span className="card-prod-bag">
                        Kho: {inBag > 0 ? <strong className="text-teal">{inBag} món</strong> : <span className="text-muted">0 (Hết)</span>}
                      </span>
                      <small className="card-prod-desc">{prod.description}</small>
                    </div>
                    <div className="card-prod-action">
                      <span className="btn-pick-tag">Chọn</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </PixelDialog>
  );
};
