import React, { useMemo, useState } from 'react';
import type { DailyRecord } from '@game/shared';
import { PRODUCT_MAP, SELLABLE_PRODUCTS, STORE_BOUNDS, XOI_BOUNDS } from '@game/data';
import { buildProductSeries } from '@game/core';
import { PixelButton, PixelDialog } from './pixel';

interface Props {
  day: number;
  records: Record<number, DailyRecord>;
  getPriceHistory: (productId: string) => Array<{ day: number; price: number }>;
  getHeatmap: (days: number) => Record<string, number>;
  onClose: () => void;
}

const RANGE = 14;
const W = 560, H = 180, PAD = 28;

const PriceSalesChart: React.FC<{ productId: string } & Pick<Props, 'day' | 'records' | 'getPriceHistory'>> = ({ productId, day, records, getPriceHistory }) => {
  const history = getPriceHistory(productId);
  const points = useMemo(() => buildProductSeries(records, { [productId]: history }, productId, day - RANGE + 1, day), [records, history, productId, day]);
  const maxUnits = Math.max(1, ...points.map(p => p.units ?? 0));
  const prices = points.map(p => p.price).filter((p): p is number => p !== null);
  const minPrice = Math.min(...prices), maxPrice = Math.max(...prices);
  const step = (W - PAD * 2) / points.length;
  const x = (i: number) => PAD + step * i + step / 2;
  const yPrice = (price: number) => PAD + (H - PAD * 2) * (maxPrice === minPrice ? 0.5 : 1 - (price - minPrice) / (maxPrice - minPrice));
  // Đường giá chỉ nối các điểm liền kề có dữ liệu; khoảng trống để hở.
  const segments: string[] = [];
  let current: string[] = [];
  points.forEach((p, i) => {
    if (p.price === null) { if (current.length) segments.push(current.join(' ')); current = []; return; }
    current.push(`${x(i)},${yPrice(p.price)}`);
  });
  if (current.length) segments.push(current.join(' '));
  return <div>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Doanh số và giá ${PRODUCT_MAP[productId]?.name ?? productId} ${RANGE} ngày gần nhất`} style={{ width: '100%', maxWidth: W }}>
      {points.map((p, i) => p.units === null
        ? <text key={p.day} x={x(i)} y={H - PAD - 4} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.5">—</text>
        : <rect key={p.day} x={x(i) - step * 0.3} width={step * 0.6} y={H - PAD - (H - PAD * 2) * (p.units / maxUnits)} height={(H - PAD * 2) * (p.units / maxUnits)} fill="#357f72"><title>{`Ngày ${p.day}: bán ${p.units}`}</title></rect>)}
      {segments.map((seg, i) => <polyline key={i} points={seg} fill="none" stroke="#b64c3d" strokeWidth="2" />)}
      {points.map((p, i) => p.price !== null && <circle key={`pt${p.day}`} cx={x(i)} cy={yPrice(p.price)} r="3" fill="#b64c3d"><title>{`Ngày ${p.day}: giá ${p.price.toLocaleString('vi-VN')}`}</title></circle>)}
      {points.map((p, i) => (i % 2 === 0) && <text key={`d${p.day}`} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="currentColor">{p.day}</text>)}
      <text x={PAD} y={12} fontSize="10" fill="#357f72">Cột: số bán/ngày (tối đa {maxUnits})</text>
      {prices.length > 0 && <text x={W - PAD} y={12} fontSize="10" textAnchor="end" fill="#b64c3d">Đường: giá chốt ngày ({minPrice.toLocaleString('vi-VN')}–{maxPrice.toLocaleString('vi-VN')})</text>}
    </svg>
    {prices.length === 0 && <p className="muted">Chưa có điểm giá được lưu trong {RANGE} ngày này; giá chỉ được ghi từ khi đóng ngày. Giá hiện tại không được dùng thay cho lịch sử.</p>}
    {points.some(p => p.units === null) && <p className="muted">Dấu — là ngày không có bản ghi doanh số (thiếu dữ liệu, không phải 0).</p>}
  </div>;
};

const Heatmap: React.FC<{ counts: Record<string, number> }> = ({ counts }) => {
  // Gộp cả hai tòa nhà (tiệm xôi ở dải phía tây) vào một bản đồ nhiệt.
  const x0 = Math.min(STORE_BOUNDS.left - 2, XOI_BOUNDS.left), x1 = STORE_BOUNDS.right + 2, y0 = STORE_BOUNDS.top - 1, y1 = STORE_BOUNDS.bottom + 3;
  const max = Math.max(1, ...Object.values(counts));
  const cols = x1 - x0 + 1;
  const cells: React.ReactNode[] = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const count = counts[`${x},${y}`] ?? 0;
    cells.push(<div key={`${x},${y}`} title={`Ô ${x},${y}: ${count} lượt`} style={{ aspectRatio: '1', background: count ? `rgba(182,76,61,${0.15 + 0.85 * count / max})` : 'rgba(0,0,0,0.06)', outline: '1px solid rgba(0,0,0,0.08)' }} />);
  }
  return <div>
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, maxWidth: 480 }}>{cells}</div>
    {Object.keys(counts).length === 0 && <p className="muted">Chưa có lượt khách nào được ghi trong khoảng này.</p>}
  </div>;
};

export const AnalyticsModal: React.FC<Props> = ({ day, records, getPriceHistory, getHeatmap, onClose }) => {
  const [tab, setTab] = useState<'sales' | 'heat'>('sales');
  const [heatDays, setHeatDays] = useState(1);
  const sold = useMemo(() => {
    const ids = new Set<string>();
    for (let d = day - RANGE + 1; d <= day; d++) for (const id of Object.keys(records[d]?.productSales ?? {})) ids.add(id);
    return SELLABLE_PRODUCTS.filter(p => ids.has(p.id));
  }, [records, day]);
  const options = sold.length > 0 ? sold : SELLABLE_PRODUCTS.slice(0, 20);
  const [productId, setProductId] = useState('');
  const selected = options.some(p => p.id === productId) ? productId : options[0]?.id ?? '';
  return <PixelDialog title="Phân tích tiệm" subtitle="Dữ liệu đã lưu, chỉ xem — không ảnh hưởng gameplay" icon="book" onClose={onClose}>
    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
      <PixelButton variant={tab === 'sales' ? 'teal' : 'wood'} onClick={() => setTab('sales')}>Giá & doanh số</PixelButton>
      <PixelButton variant={tab === 'heat' ? 'teal' : 'wood'} onClick={() => setTab('heat')}>Lưu lượng khách</PixelButton>
    </div>
    {tab === 'sales' && <>
      <label>Mặt hàng <select value={selected} onChange={e => setProductId(e.target.value)}>{options.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      {selected && <PriceSalesChart productId={selected} day={day} records={records} getPriceHistory={getPriceHistory} />}
    </>}
    {tab === 'heat' && <>
      <label>Khoảng <select value={heatDays} onChange={e => setHeatDays(Number(e.target.value))}><option value={1}>Hôm nay</option><option value={3}>3 ngày</option><option value={7}>7 ngày</option></select></label>
      <Heatmap counts={getHeatmap(heatDays)} />
      <p className="muted">Mỗi ô đếm số lượt khách bước vào ô đó; chỉ lưu tổng hợp 7 ngày gần nhất, không lưu đường đi từng khách.</p>
    </>}
  </PixelDialog>;
};
