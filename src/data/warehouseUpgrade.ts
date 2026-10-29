/**
 * GĐ222 "Bao giờ nên nâng kho?" — sức chứa kho vs hàng đang giữ + giá trị tiền đang rủi ro khi tràn.
 * StoragePanel chỉ chìa cấp kho + nút nâng; chưa cho biết kho đang VỪA/TRÀN đến đâu (cả sức chứa thùng
 * lẫn giữ lạnh), số TIỀN của phần hàng lạnh đang tràn ra ngoài (hỏng nhanh — nối GĐ212), và giá nâng
 * lên bậc kế so với tiền mặt đang có. Helper này THUẦN ĐỌC từ state/hằng số: đếm thùng (`casesFor`),
 * đếm món cần lạnh (`needsCold`), so trần cấp hiện tại vs bậc kế (`WAREHOUSE_TIERS`) → verdict nên
 * nâng ngay/sắp/đang ổn. Không đổi state/kinh tế.
 */

import { WAREHOUSE_TIERS, warehouseTier } from './warehouse';
import { casesFor, productById } from './products';
import { needsCold } from './freshness';

export type WarehouseVerdict = 'upgrade' | 'soon' | 'ok';

export interface WarehouseUpgrade {
  tier: number;
  tierName: string;
  /** Sức chứa thùng hiện tại. */
  capacity: number;
  /** Sức giữ lạnh hiện tại (món). */
  coldCapacity: number;
  casesUsed: number;
  /** % thùng đang dùng (0–100). */
  casePct: number;
  coldUsed: number;
  /** % chỗ lạnh đang dùng (có thể >100 khi tràn). */
  coldPct: number;
  /** Số món cần lạnh vượt trần giữ lạnh (≥0). */
  overflow: number;
  /** Giá trị bán lẻ (~) của phần tràn lạnh — tiền đang rủi ro hỏng nhanh. */
  overflowValue: number;
  /** Bậc kế tiếp + giá (null khi đã tối đa). */
  next: { name: string; price: number; cases: number; cold: number } | null;
  /** Tiền mặt đủ trả giá nâng bậc kế chưa. */
  affordable: boolean;
  verdict: WarehouseVerdict;
}

export function warehouseUpgradeValue(
  tierIndex: number,
  storage: Record<string, number> | undefined,
  priceOf: (id: string) => number,
  cash: number,
): WarehouseUpgrade {
  const tier = warehouseTier(tierIndex);
  const nextDef = WAREHOUSE_TIERS[tierIndex + 1];

  const entries = Object.entries(storage ?? {}).filter(([, q]) => q > 0);
  const casesUsed = entries.reduce((n, [id, q]) => n + casesFor(id, q), 0);
  const coldItems = entries.filter(([id]) => needsCold(id)).sort((a, b) => b[1] - a[1]);
  const coldUsed = coldItems.reduce((n, [, q]) => n + q, 0);

  const overflow = Math.max(0, coldUsed - tier.cold);
  // Giá trị lẻ (~) của phần tràn: lấy từ món lạnh chiếm nhiều nhất cho tới đủ số tràn.
  let overflowValue = 0;
  let remaining = overflow;
  for (const [id, q] of coldItems) {
    if (remaining <= 0) break;
    const take = Math.min(q, remaining);
    overflowValue += Math.round(take * priceOf(id));
    remaining -= take;
  }
  // Nếu lấy hết toàn bộ món lạnh vẫn chưa đủ số tràn (coldUsed thấp hơn dự kiến) — coi là từng phần.
  overflowValue = Math.round(overflowValue);

  const casePct = tier.cases > 0 ? (casesUsed / tier.cases) * 100 : 0;
  const coldPct = tier.cold > 0 ? (coldUsed / tier.cold) * 100 : 0;

  let verdict: WarehouseVerdict = 'ok';
  if (overflow > 0 || casePct >= 95) verdict = 'upgrade';
  else if (coldPct >= 80 || casePct >= 85) verdict = 'soon';

  return {
    tier: tierIndex,
    tierName: tier.name,
    capacity: tier.cases,
    coldCapacity: tier.cold,
    casesUsed,
    casePct: Math.round(casePct),
    coldUsed,
    coldPct: Math.round(coldPct),
    overflow,
    overflowValue,
    next: nextDef ? { name: nextDef.name, price: nextDef.price, cases: nextDef.cases, cold: nextDef.cold } : null,
    affordable: cash >= (nextDef?.price ?? Infinity),
    verdict,
  };
}
