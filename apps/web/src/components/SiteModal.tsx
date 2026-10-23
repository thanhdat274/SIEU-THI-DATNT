import React, { useState } from 'react';
import { PRODUCT_MAP } from '@game/data';
import type { InventoryItem, SiteLogEntry } from '@game/shared';
import { PixelButton, PixelDialog, PixelProgress, ProductIcon, QuantityStepper } from './pixel';

export interface Props {
  siteId: string;
  parcelId: string;
  siteName: string;
  buffer: InventoryItem[];
  capacity: number;
  /** Hàng trong kho đệm + đang chuyển tới. */
  load: number;
  incomingTrips: number;
  central: InventoryItem[];
  todo: string[];
  closedForRent: boolean;
  isLeased: boolean;
  managerLabel?: string;
  log: SiteLogEntry[];
  nameOf: (accountId: string) => string;
  onTransfer: (direction: 'in' | 'out', productId: string, quantity: number) => void | Promise<unknown>;
  onCloseSite: () => void | Promise<unknown>;
  onEndLease: () => void | Promise<unknown>;
  onClose: () => void;
}

const productName = (id: string) => PRODUCT_MAP[id]?.name ?? id;

/** Việc cần dọn trước khi trả lô (`multi-site-parcel-lease` D4) bằng lời người chơi. */
export function siteTodoLabel(item: string): string {
  const [kind, n] = item.split(':');
  if (kind === 'buffer') return `Chuyển ${n} món trong kho đệm về kho tổng`;
  if (kind === 'deliveries') return `Chờ ${n} chuyến hàng đang chạy tới nơi`;
  if (kind === 'fixtures') return `Cất ${n} kệ/tủ của cơ sở (Bố cục)`;
  if (kind === 'close_site') return 'Đóng cơ sở';
  return item;
}

const LOG_LABEL: Record<string, string> = { open_site: 'mở cơ sở', close_site: 'đóng cơ sở', transfer_in: 'chuyển vào', transfer_out: 'rút về kho tổng' };
const clock = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

/**
 * Bảng cơ sở (mobile-first, một cột): kho đệm + rút về, chuyển hàng vào, việc cần dọn khi trả lô, nhật ký (thu gọn).
 * Hành động chính = chuyển hàng vào kho đệm; lô nợ thuê chỉ cho rút ra.
 */
export const SiteModal: React.FC<Props> = ({ siteId, parcelId, siteName, buffer, capacity, load, incomingTrips, central, todo, closedForRent, isLeased, managerLabel, log, nameOf, onTransfer, onCloseSite, onEndLease, onClose }) => {
  const stocked = central.filter(item => item.quantity > 0);
  const [picked, setProductId] = useState(stocked[0]?.productId ?? '');
  // Món đã chọn hết trong kho tổng thì rơi về món đầu danh sách (select luôn khớp nút Chuyển vào).
  const productId = stocked.some(item => item.productId === picked) ? picked : stocked[0]?.productId ?? '';
  const [qty, setQty] = useState(10);
  const [busy, setBusy] = useState(false);
  const free = Math.max(0, capacity - load);
  const have = stocked.find(item => item.productId === productId)?.quantity ?? 0;
  const maxIn = Math.max(1, Math.min(free, have));
  const run = async (fn: () => void | Promise<unknown>) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };
  const cleanup = todo.filter(item => item !== 'close_site');
  const canCloseSite = cleanup.length === 0;

  return (
    <PixelDialog icon="warehouse" title={siteName} subtitle={`Cơ sở trên lô ${parcelId}${managerLabel ? ` · phụ trách: ${managerLabel}` : ''}`} onClose={onClose}>
      <div className="site-panel" data-site-id={siteId}>
        {closedForRent && <p className="site-warn">Lô đang đóng cửa do nợ thuê: chỉ rút hàng về được, không chuyển vào.</p>}

        <section aria-label="Kho đệm">
          <div className="site-row">
            <strong>Kho đệm</strong>
            <span className="muted">{load}/{capacity}{incomingTrips > 0 ? ` · ${incomingTrips} chuyến đang chạy` : ''}</span>
          </div>
          <PixelProgress value={load} max={capacity} label="Sức chứa kho đệm" />
          {buffer.length === 0 ? <p className="muted">Kho đệm trống. Kệ của cơ sở chỉ lấy hàng từ đây.</p> : (
            <ul className="site-list">
              {buffer.map(item => (
                <li key={item.productId} className="site-item">
                  <ProductIcon productId={item.productId} size={28} />
                  <span className="site-item-name">{productName(item.productId)} <strong>×{item.quantity}</strong></span>
                  <PixelButton variant="wood" disabled={busy} onClick={() => run(() => onTransfer('out', item.productId, item.quantity))}>Rút về</PixelButton>
                </li>
              ))}
            </ul>
          )}
        </section>

        {!closedForRent && (
          <section aria-label="Chuyển hàng vào" className="site-transfer">
            <strong>Chuyển từ kho tổng</strong>
            {stocked.length === 0 ? <p className="muted">Kho tổng hết hàng.</p> : (
              <>
                <label className="sr-only" htmlFor="site-product">Món</label>
                <select id="site-product" className="site-select" value={productId} onChange={e => setProductId(e.target.value)}>
                  {stocked.map(item => <option key={item.productId} value={item.productId}>{productName(item.productId)} (còn {item.quantity})</option>)}
                </select>
                <div className="site-row">
                  <QuantityStepper label="số lượng" value={Math.min(qty, maxIn)} min={1} max={maxIn} onChange={setQty} disabled={busy || free <= 0} />
                  <PixelButton variant="green" disabled={busy || free <= 0 || have <= 0} onClick={() => run(() => onTransfer('in', productId, Math.min(qty, maxIn)))}>
                    {free <= 0 ? 'Kho đệm đầy' : 'Chuyển vào'}
                  </PixelButton>
                </div>
              </>
            )}
          </section>
        )}

        <section aria-label="Trả lô">
          <strong>{isLeased ? 'Trả lô' : 'Đóng cơ sở'}</strong>
          {cleanup.length > 0
            ? <ol className="site-todo">{cleanup.map(item => <li key={item}>{siteTodoLabel(item)}</li>)}</ol>
            : <p className="muted">Đã dọn xong — có thể đóng cơ sở{isLeased ? ' rồi trả lô' : ''}.</p>}
          <div className="site-row site-actions">
            <PixelButton variant="danger" disabled={busy || !canCloseSite} onClick={() => run(onCloseSite)}>Đóng cơ sở</PixelButton>
            {isLeased && <PixelButton variant="danger" disabled={busy || cleanup.length > 0} onClick={() => run(onEndLease)}>Trả lô</PixelButton>}
          </div>
        </section>

        {log.length > 0 && (
          <details className="site-log">
            <summary>Nhật ký ({log.length})</summary>
            <ul>
              {[...log].reverse().slice(0, 30).map((entry, i) => (
                <li key={i}><span className="muted">N{entry.day} {clock(entry.minute)}</span> {nameOf(entry.actorAccountId)} {LOG_LABEL[entry.action] ?? entry.action}{entry.action === 'open_site' ? ` trên lô ${parcelId}` : entry.detail ? ` ${entry.detail.replace(/ ([a-z_]+)$/, (_, id: string) => ` ${productName(id)}`)}` : ''}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </PixelDialog>
  );
};
