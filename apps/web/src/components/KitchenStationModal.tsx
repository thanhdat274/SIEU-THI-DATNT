import React, { useState, useMemo } from 'react';
import type { InventoryItem, ProductionJob, StoreFixture } from '@game/shared';
import { PRODUCT_MAP, Recipe, RECIPES, Combo, comboSellingPrice } from '@game/data';
import { PixelButton, PixelDialog } from './pixel';

/** Các station ID cho quán nước (đồ uống). */
const DRINK_STATION_IDS = new Set(['drink_counter', 'blender', 'sugarcane_press']);

/** Các station ID cho tiệm xôi. */
const XOI_STATION_IDS = new Set(['hot_kettle', 'thung_ngam', 'xung_hap', 'quay_xoi']);

/** Tên tiếng Việt hiển thị cho từng station type. */
const STATION_LABELS: Record<string, string> = {
  food_grill: 'Bếp nướng',
  hot_kettle: 'Bếp siêu tốc',
  thung_ngam: 'Thùng ngâm',
  xung_hap: 'Xung hấp',
  quay_xoi: 'Quay xôi',
  drink_counter: 'Quầy nước',
  blender: 'Máy xay sinh tố',
  sugarcane_press: 'Ép mía',
};

export interface Props {
  fixture: StoreFixture;
  recipes: Recipe[];
  job?: ProductionJob;
  inventory: InventoryItem[];
  day: number;
  allFixtures?: StoreFixture[]; // Tất cả kitchen_station fixtures cho cùng shop
  combos?: Combo[]; // Combo của shop này (bếp đa món)
  onStart: (recipeId: string, stationId?: string) => void;
  onClose: () => void;
}

const usable = (inventory: InventoryItem[], productId: string, day: number): number => {
  const slot = inventory.find(item => item.productId === productId);
  if (!slot) return 0;
  return slot.lots ? slot.lots.filter(lot => lot.expiresOnDay > day).reduce((sum, lot) => sum + lot.quantity, 0) : slot.quantity;
};

const formatVND = (n: number): string => new Intl.NumberFormat('vi-VN').format(n);

export const KitchenStationModal: React.FC<Props> = ({ fixture, recipes, job, inventory, day, allFixtures, combos = [], onStart, onClose }) => {
  const [activeStation, setActiveStation] = useState<string>(fixture.shopId ?? '');

  const hasMultipleStations = useMemo(() => {
    if (!allFixtures || allFixtures.length <= 1) return false;
    const uniqueStations = new Set(allFixtures.map(f => f.shopId).filter(Boolean));
    return uniqueStations.size > 1;
  }, [allFixtures]);

  // Recipes cho station được chọn (từ allFixtures nếu có)
  const selectedStationRecipes = useMemo(() => {
    if (hasMultipleStations && allFixtures && activeStation) {
      return RECIPES.filter(r => r.stationShopId === activeStation && r.unlockLevel <= (day || 30));
    }
    return recipes;
  }, [allFixtures, activeStation, recipes, hasMultipleStations, day]);

  // Job đang chạy cho station được chọn
  const selectedStationJob = useMemo(() => {
    if (hasMultipleStations && allFixtures) {
      const station = allFixtures.find(f => f.shopId === activeStation);
      return station ? job : undefined;
    }
    return job;
  }, [allFixtures, activeStation, job, hasMultipleStations]);

  const running = selectedStationJob?.recipeId ? selectedStationRecipes.find(recipe => recipe.id === selectedStationJob.recipeId) : undefined;

  // Determine shop type for display
  const isDrinkShop = activeStation ? DRINK_STATION_IDS.has(activeStation) : false;
  const isXoiShop = activeStation ? XOI_STATION_IDS.has(activeStation) : false;

  // Build station tabs
  const stationTabs = useMemo(() => {
    if (!hasMultipleStations || !allFixtures) return null;
    const uniqueStations = [...new Set(allFixtures.map(f => f.shopId).filter((s): s is string => !!s))];
    return uniqueStations.map(stationId => {
      const count = RECIPES.filter(r => r.stationShopId === stationId && r.unlockLevel <= (day || 30)).length;
      return {
        id: stationId,
        label: STATION_LABELS[stationId] ?? stationId,
        count,
        isActive: activeStation === stationId,
      };
    });
  }, [allFixtures, hasMultipleStations, activeStation, day]);

  const stationSubtitle = (() => {
    if (isDrinkShop) return 'Quán nước';
    if (isXoiShop) return 'Tiệm xôi';
    return 'Trạm bếp';
  })();

  return <PixelDialog title={fixture.label} subtitle={stationSubtitle} icon="coin" onClose={onClose}>
    {/* Station Tabs */}
    {stationTabs && stationTabs.length > 0 && (
      <div className="kitchen-station-tabs" style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
        {stationTabs.map(tab => (
          <PixelButton
            key={tab.id}
            variant={tab.isActive ? 'teal' : 'paper'}
            disabled={!tab.count && !tab.isActive}
            onClick={() => tab.id && setActiveStation(tab.id)}
          >
            {tab.label} ({tab.count})
          </PixelButton>
        ))}
      </div>
    )}

    {/* Running Job */}
    {selectedStationJob && (
      <p>
        <strong>Đang nấu: {running?.name ?? selectedStationJob.recipeId}</strong> · còn khoảng {Math.ceil(selectedStationJob.remaining)} giây
      </p>
    )}

    {/* Recipes */}
    {selectedStationRecipes.length === 0 && <p className="muted">Chưa có công thức nào mở khóa cho trạm này.</p>}
    {selectedStationRecipes.map(recipe => {
      const lacking = recipe.inputs.some(input => usable(inventory, input.productId, day) < input.quantity);
      return <div className="summary-row" key={recipe.id}>
        <div>
          <strong>{recipe.name}</strong>
          <p className="muted">Cần: {recipe.inputs.map(input => `${input.quantity} ${PRODUCT_MAP[input.productId]?.name ?? input.productId} (kho ${usable(inventory, input.productId, day)})`).join(', ')}</p>
          <p className="muted">Ra {recipe.outputQuantity} {PRODUCT_MAP[recipe.outputProductId]?.name} · {recipe.durationSeconds} giây</p>
        </div>
        <PixelButton
          variant="teal"
          disabled={!!selectedStationJob || lacking}
          onClick={() => onStart(recipe.id, fixture.id)}
        >
          {lacking ? 'Thiếu nguyên liệu' : 'Bắt đầu nấu'}
        </PixelButton>
      </div>;
    })}

    {/* Combo suất tiết kiệm (bếp đa món): lắp ráp từ các món thành phẩm của shop. */}
    {combos.length > 0 && (
      <div className="combo-panel" style={{ marginTop: 14, borderTop: '2px solid var(--outline, #3A3A50)', paddingTop: 10 }}>
        <strong style={{ fontSize: 14 }}>Combo suất tiết kiệm</strong>
        {combos.map(combo => {
          const retailTotal = combo.memberProductIds.reduce((sum, pid) => sum + (PRODUCT_MAP[pid]?.baseSellingPrice ?? 0), 0);
          const lacking = combo.memberProductIds.some(pid => usable(inventory, pid, day) < 1);
          const comboRecipeId = `recipe_${combo.id}`;
          return <div className="summary-row" key={combo.id}>
            <div>
              <strong>{combo.name}</strong>
              <p className="muted">Gồm: {combo.memberProductIds.map(pid => `${PRODUCT_MAP[pid]?.name ?? pid} (kho ${usable(inventory, pid, day)})`).join(' + ')}</p>
              <p className="muted">Lắp ráp tại {STATION_LABELS[combo.shopStationShopId] ?? combo.shopStationShopId} · Giá combo {formatVND(comboSellingPrice(combo))}₫ <span style={{ textDecoration: 'line-through' }}>{formatVND(retailTotal)}₫</span></p>
            </div>
            <PixelButton
              variant="teal"
              disabled={!!selectedStationJob || lacking}
              onClick={() => onStart(comboRecipeId, fixture.id)}
            >
              {lacking ? 'Thiếu món thành phần' : 'Làm combo'}
            </PixelButton>
          </div>;
        })}
      </div>
    )}
    <p className="muted">
      Thành phẩm được đưa vào kho; mang lên kệ để bán. Nhân viên bổ sung hàng đang trong ca giúp nấu nhanh hơn.
    </p>
  </PixelDialog>;
};
