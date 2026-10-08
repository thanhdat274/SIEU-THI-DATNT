import React, { useState } from 'react';
import { PRODUCT_CATEGORY_LABELS } from '@game/data';
import type { Product, ProductCategory } from '@game/shared';
import { PixelButton, PixelDialog, ProductSlot, money } from './pixel';

export interface PriceBounds { min: number; max: number; step: number }

export interface PricesModalProps {
  /** Các món đã mở khóa, có thể bày bán. */
  products: Product[];
  sellingPrice: (productId: string) => number;
  bounds: (productId: string) => PriceBounds | null;
  /** Số khách bỏ về vì giá cao hôm qua, theo productId. */
  complaints: Record<string, number>;
  onSetPrice: (productId: string, price: number | null) => void;
  onResetAll: () => void;
  onClose: () => void;
}

type Filter = ProductCategory | 'all';

const pctLabel = (pct: number) => (pct === 0 ? 'giá gợi ý' : `${pct > 0 ? '+' : ''}${pct}%`);

/** Màn chỉnh giá bán tập trung: mọi món đã mở khóa, lọc theo nhóm, bước giá bằng nút −/+. */
export const PricesModal: React.FC<PricesModalProps> = ({ products, sellingPrice, bounds, complaints, onSetPrice, onResetAll, onClose }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const categories = (Object.keys(PRODUCT_CATEGORY_LABELS) as ProductCategory[]).filter((id) => products.some((p) => p.category === id));
  const shown = products.filter((p) => filter === 'all' || p.category === filter);
  const changed = products.some((p) => sellingPrice(p.id) !== p.baseSellingPrice);
  return (
    <PixelDialog icon="coin" title="Giá bán" subtitle="Giá cao dễ bị chê, giá thấp hút khách" onClose={onClose}>
      <div className="prices-reset-row" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        <PixelButton variant="wood" onClick={onResetAll} disabled={!changed}>↺ Về giá gợi ý tất cả</PixelButton>
      </div>
      <div className="feature-scroll-tabs" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        <PixelButton aria-pressed={filter === 'all'} variant={filter === 'all' ? 'teal' : 'paper'} onClick={() => setFilter('all')}>Tất cả</PixelButton>
        {categories.map((id) => (
          <PixelButton key={id} aria-pressed={filter === id} variant={filter === id ? 'teal' : 'paper'} onClick={() => setFilter(id)}>{PRODUCT_CATEGORY_LABELS[id]}</PixelButton>
        ))}
      </div>
      {shown.length === 0 && <p className="muted">Chưa có mặt hàng trong nhóm này.</p>}
      <div style={{ display: 'grid', gap: 8 }}>
        {shown.map((product) => {
          const price = sellingPrice(product.id);
          const range = bounds(product.id);
          const pct = Math.round((price / product.baseSellingPrice - 1) * 100);
          const complained = complaints[product.id] ?? 0;
          return (
            <article key={product.id} className="pixel-panel" style={{ padding: 8, display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ProductSlot productId={product.id} />
                <div style={{ minWidth: 0 }}>
                  <strong>{product.name}</strong>
                  <div className="prices-card-hint muted" style={{ fontSize: 11 }}>Gợi ý {money(product.baseSellingPrice)} · vốn {money(product.purchasePrice)}</div>
                  {complained > 0 && <div style={{ fontSize: 11, color: 'var(--color-brick)' }}>Hôm qua {complained} khách chê đắt</div>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <PixelButton variant="wood" aria-label={`Giảm giá ${product.name}`} disabled={!range || price <= range.min} onClick={() => range && onSetPrice(product.id, price - range.step)}>−</PixelButton>
                <div style={{ textAlign: 'center' }}>
                  <strong>{money(price)}</strong>
                  <div style={{ fontSize: 11, color: pct > 0 ? 'var(--color-brick)' : pct < 0 ? 'var(--color-green-dark)' : undefined }} className={pct === 0 ? 'muted' : undefined}>{pctLabel(pct)}</div>
                </div>
                <PixelButton variant="teal" aria-label={`Tăng giá ${product.name}`} disabled={!range || price >= range.max} onClick={() => range && onSetPrice(product.id, price + range.step)}>+</PixelButton>
              </div>
            </article>
          );
        })}
      </div>
    </PixelDialog>
  );
};
