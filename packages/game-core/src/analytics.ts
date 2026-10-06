import type { DailyRecord, SaveGameData } from '@game/shared';

export const PRICE_HISTORY_MAX_POINTS = 60;
export const HEATMAP_RETENTION_DAYS = 7;

export interface SeriesPoint {
  day: number;
  /** Số đơn vị bán trong ngày; null = không có bản ghi ngày đó (thiếu dữ liệu, không phải 0). */
  units: number | null;
  /** Giá bán đã lưu cho ngày đó; null = không có điểm giá được lưu. */
  price: number | null;
}

/** Chuỗi theo ngày từ dữ liệu đã lưu. Không suy giá quá khứ từ giá hiện tại. */
export function buildProductSeries(
  records: Record<number, DailyRecord> | undefined,
  priceHistory: SaveGameData['priceHistory'],
  productId: string,
  fromDay: number,
  toDay: number,
): SeriesPoint[] {
  const prices = new Map((priceHistory?.[productId] ?? []).map(point => [point.day, point.price]));
  const points: SeriesPoint[] = [];
  for (let day = Math.max(1, fromDay); day <= toDay; day++) {
    const record = records?.[day];
    points.push({ day, units: record ? (record.productSales?.[productId] ?? 0) : null, price: prices.get(day) ?? null });
  }
  return points;
}

export function appendPricePoint(history: NonNullable<SaveGameData['priceHistory']>, productId: string, day: number, price: number): void {
  if (!Number.isSafeInteger(price) || price <= 0) return;
  const list = (history[productId] ??= []).filter(point => point.day !== day);
  list.push({ day, price });
  list.sort((a, b) => a.day - b.day);
  history[productId] = list.slice(-PRICE_HISTORY_MAX_POINTS);
}

export function sanitizePriceHistory(raw: unknown): NonNullable<SaveGameData['priceHistory']> {
  const result: NonNullable<SaveGameData['priceHistory']> = {};
  if (!raw || typeof raw !== 'object') return result;
  for (const [productId, list] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(list)) continue;
    for (const point of list) if (point && Number.isSafeInteger(point.day) && point.day > 0) appendPricePoint(result, productId, point.day, point.price);
  }
  return result;
}

export function sanitizeHeatmap(raw: unknown): NonNullable<SaveGameData['heatmap']> {
  const result: NonNullable<SaveGameData['heatmap']> = {};
  if (!raw || typeof raw !== 'object') return result;
  for (const [dayKey, tiles] of Object.entries(raw as Record<string, unknown>)) {
    const day = Number(dayKey);
    if (!Number.isSafeInteger(day) || !tiles || typeof tiles !== 'object') continue;
    const clean: Record<string, number> = {};
    for (const [tile, count] of Object.entries(tiles as Record<string, unknown>)) {
      if (/^-?\d+,-?\d+$/.test(tile) && Number.isSafeInteger(count) && (count as number) > 0) clean[tile] = count as number;
    }
    result[day] = clean;
  }
  return pruneHeatmap(result, Math.max(0, ...Object.keys(result).map(Number)));
}

export function pruneHeatmap(heatmap: NonNullable<SaveGameData['heatmap']>, currentDay: number): NonNullable<SaveGameData['heatmap']> {
  for (const key of Object.keys(heatmap)) if (Number(key) <= currentDay - HEATMAP_RETENTION_DAYS) delete heatmap[Number(key)];
  return heatmap;
}

/** Cộng dồn heatmap của `days` ngày gần nhất tính đến `currentDay`. */
export function aggregateHeatmap(heatmap: SaveGameData['heatmap'], currentDay: number, days: number): Record<string, number> {
  const total: Record<string, number> = {};
  for (let day = currentDay - days + 1; day <= currentDay; day++) {
    for (const [tile, count] of Object.entries(heatmap?.[day] ?? {})) total[tile] = (total[tile] ?? 0) + count;
  }
  return total;
}

export interface TutorialItem { id: string; label: string; done: boolean }

/** Khung lưới của bản đồ nhiệt lưu lượng khách (ô, gồm biên). */
export interface HeatmapFrame { x0: number; x1: number; y0: number; y1: number }

/**
 * Khung lưới heatmap: bao mọi tòa theo VỊ TRÍ ĐẶT (`buildingBounds`, tòa có thể đã dời/mua ở lô khác) cộng lề quanh tiệm chính,
 * rồi mở rộng theo mọi ô có lượt khách (sàn tiệm chính mở rộng lên bắc/đông nằm ngoài hộp tiệm cũ). Thuần, dễ kiểm thử.
 */
export function heatmapFrame(
  counts: Record<string, number>,
  storeBounds: { left: number; right: number; top: number; bottom: number },
  buildingBounds: ReadonlyArray<{ left: number; right: number }>,
): HeatmapFrame {
  const seen = Object.keys(counts)
    .map(key => key.split(',').map(Number))
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  const lefts = buildingBounds.map(bounds => bounds.left);
  const rights = buildingBounds.map(bounds => bounds.right);
  return {
    x0: Math.min(storeBounds.left - 2, ...lefts, ...seen.map(([x]) => x)),
    x1: Math.max(storeBounds.right + 2, ...rights, ...seen.map(([x]) => x)),
    y0: Math.min(storeBounds.top - 1, ...seen.map(([, y]) => y)),
    y1: storeBounds.bottom + 3,
  };
}

/** Checklist suy ra từ trạng thái save thật: mục chỉ xong khi điều kiện gameplay thỏa. */
export function getTutorialChecklist(save: Pick<SaveGameData, 'storeLayout' | 'staff' | 'statistics' | 'ledger' | 'pendingOrders' | 'dailyRecords' | 'player'>): TutorialItem[] {
  const stocked = save.storeLayout.fixtures.some(f => (f.type === 'shelf_wooden' || f.type === 'shelf_glass' || f.type === 'refrigerator') && f.currentStock > 0);
  const ordered = (save.pendingOrders?.length ?? 0) > 0 || (save.ledger ?? []).some(e => e.type === 'purchase');
  const records = Object.values(save.dailyRecords ?? {});
  return [
    { id: 'order', label: 'Nhập hàng từ nhà cung cấp', done: ordered || stocked },
    { id: 'stock', label: 'Xếp hàng lên kệ', done: stocked },
    { id: 'serve', label: 'Phục vụ khách đầu tiên', done: save.statistics.totalCustomersServed > 0 },
    { id: 'revenue', label: 'Đạt doanh thu 100.000 VND', done: save.statistics.totalRevenue >= 100_000 },
    { id: 'close-day', label: 'Kết thúc một ngày bán', done: records.some(r => r.closedAt) || save.statistics.totalDaysPassed > 0 },
    { id: 'staff', label: 'Thuê nhân viên đầu tiên', done: (save.staff?.length ?? 0) > 0 },
    { id: 'level', label: 'Lên cấp 5', done: save.player.level >= 5 },
  ];
}
