/**
 * Thực thi hợp đồng cung ứng nội bộ mỗi sáng (open-world-coop-contracts 6c — task 2.2, THUẦN / PROVISIONAL).
 *
 * Mỗi sáng, với mỗi hợp đồng đang hiệu lực:
 *   - lấy hàng từ kho CHUNG theo FEFO (first-expired-first-out — ưu tiên lô hết hạn sớm nhất)
 *     dành cho tòa nhận;
 *   - tạo `internal_delivery` tới kệ/kho phụ của tòa nhận;
 *   - thiếu hàng thì giao phần có và báo hai bên (shortfall report);
 *   - giới hạn `quantityPerDay` ≤ 50% tồn trung bình 3 ngày (cap = floor(avg × 0.5));
 *   - ghi sổ `internal_transfer` (KHÔNG đổi quỹ — design D3/D4).
 *
 * GHÉP CHÚ (PROVISIONAL): file này CHỈ chứa hàm thuần, tự định nghĩa toàn bộ
 * interface local — không import `@game/data`/`@game/shared` để tránh phụ thuộc
 * vòng/thiếu. Nối `internal_delivery` thật (cần 6a D6) + schema kế tiếp + server
 * là SAU (chờ máy thật). KHÔNG sửa shared/schema.
 */

/** Một lô hàng trong kho chung (đủ trường để tham chiếu qua `lotId` trong delivery). */
export interface SupplyStockLot {
  /** Id ổn định của lô (được `InternalDelivery.lines[].lotId` tham chiếu). */
  lotId: string;
  productId: string;
  /** Số đơn vị còn lại của lô. */
  qty: number;
  /** Ngày hết hạn — FEFO ưu tiên lô có expiryDay sớm nhất. */
  expiryDay: number;
}

/** Hợp đồng cung ứng (design D3). `status: 'active'` = đã được hai bên đồng ý, đang hiệu lực. */
export interface SupplyContract {
  id: string;
  /** Tòa giao hàng (nguồn kho chung lấy cho tòa này). */
  fromBuildingId: string;
  /** Tòa nhận hàng. */
  toBuildingId: string;
  productId: string;
  /** Lượng mong muốn mỗi sáng (bị cap ≤ 50% tồn trung bình). */
  quantityPerDay: number;
  /** Giá nội bộ mỗi đơn vị (chỉ ghi thành tích, không đổi quỹ). */
  internalPrice: number;
  startDay: number;
  endDay?: number;
  status: 'active' | 'proposed' | 'ended' | 'cancelled';
}

/** Giao hàng nội bộ tới kệ/kho phụ của tòa nhận (6a D6 — PROVISIONAL chờ nối thật). */
export interface InternalDelivery {
  id: string;
  fromBuildingId: string;
  toBuildingId: string;
  productId: string;
  /** Các lô đã lấy theo FEFO (mỗi lô là phần đã tiêu thụ của lô gốc). */
  lines: { lotId: string; qty: number }[];
  totalQty: number;
  /** Ngày hợp đồng bắt đầu có hiệu lực (để truy vết nguồn). */
  fromDay: number;
  /** Ngày thực hiện giao. */
  day: number;
  /** Mốc thời gian giao (nếu có), tùy chọn. */
  deliveredAt?: number;
}

/** Báo thiếu hàng cho một hợp đồng (báo hai bên khi giao phần có). */
export interface ShortfallReport {
  contractId: string;
  requested: number;
  delivered: number;
  shortfall: number;
  /** `true` nếu requested đã bị cap 50% tồn trung bình (clamp về cap). */
  capped: boolean;
  /** Ghi chú con người đọc được (đặc biệt khi bị cap). */
  note?: string;
}

/** Kết quả một lần chạy buổi sáng: delivery + kho còn lại (mảng mới) + báo thiếu. */
export interface DailyExecutionResult {
  deliveries: InternalDelivery[];
  /** Kho chung SAU khi trừ các delivery đã tạo (mảng mới, không đổi đầu vào). */
  remainingStock: Record<string, SupplyStockLot[]>;
  shortfallReports: ShortfallReport[];
}

/** Kết quả chặn giao vượt cap (task sibling: cap = floor(avg × 0.5)). */
export interface CapResult {
  /** Số đơn vị được phép giao sau khi clamp. */
  allowed: number;
  cap: number;
  capped: boolean;
  note?: string;
}

/** Dòng thành tích của một tòa (design D4 — chỉ ghi điểm, KHÔNG chạm quỹ). */
export interface ScoreboardLine {
  buildingId: string;
  revenue: number;
  costOfGoods: number;
  profit: number;
}

/**
 * Chọn theo FEFO: ưu tiên lô hết hạn sớm nhất (expiryDay tăng dần), giao tối đa
 * `min(qty, tổng tồn)`, trả `shortfall` nếu thiếu. KHÔNG đổi `availableLots` (immutable);
 * `lines` là các lô đã chọn với qty đã giảm xuống phần thực tế giao.
 */
export function fefoSelect(
  availableLots: SupplyStockLot[],
  productId: string,
  qty: number,
): { lines: SupplyStockLot[]; shortfall: number } {
  const lots = availableLots
    .filter((l) => l.productId === productId && Number.isFinite(l.qty) && l.qty > 0)
    .slice()
    .sort((a, b) => a.expiryDay - b.expiryDay);
  const total = lots.reduce((sum, l) => sum + l.qty, 0);
  const deliver = Math.min(Math.max(0, Math.floor(qty)), total);
  const lines: SupplyStockLot[] = [];
  let remaining = deliver;
  for (const lot of lots) {
    if (remaining <= 0) break;
    const take = Math.min(lot.qty, remaining);
    lines.push({ ...lot, qty: take });
    remaining -= take;
  }
  return { lines, shortfall: Math.max(0, qty - deliver) };
}

/** Cap mỗi ngày = floor(tồn trung bình 3 ngày × 0.5) (task sibling 2.2). */
export function dailyCapFor(avgThreeDayStock: number): number {
  return Math.max(0, Math.floor(avgThreeDayStock * 0.5));
}

/**
 * Chặn giao vượt cap: nếu `quantityPerDay > cap` thì clamp về cap và báo note;
 * ngược lại trả đúng `quantityPerDay`. Thuần — không đổi contract.
 */
export function enforceDailyCap(
  contract: Pick<SupplyContract, 'quantityPerDay'>,
  avgThreeDayStock: number,
): CapResult {
  const cap = dailyCapFor(avgThreeDayStock);
  const capped = contract.quantityPerDay > cap;
  const allowed = capped ? cap : contract.quantityPerDay;
  return {
    allowed,
    cap,
    capped,
    note: capped
      ? `quantityPerDay ${contract.quantityPerDay} vượt 50% tồn trung bình (${cap}) — giao tối đa ${cap}`
      : undefined,
  };
}

function isActiveOn(contract: SupplyContract, day: number): boolean {
  if (contract.status !== 'active') return false;
  if (day < contract.startDay) return false;
  if (contract.endDay !== undefined && day > contract.endDay) return false;
  return true;
}

function cloneStock(stock: Record<string, SupplyStockLot[]>): Record<string, SupplyStockLot[]> {
  const out: Record<string, SupplyStockLot[]> = {};
  for (const key of Object.keys(stock)) {
    out[key] = stock[key].map((l) => ({ ...l }));
  }
  return out;
}

/** Trừ các lô đã giao khỏi kho (mảng mới; lô về 0 bị bỏ). */
function reduceStock(
  stock: Record<string, SupplyStockLot[]>,
  productId: string,
  lines: SupplyStockLot[],
): Record<string, SupplyStockLot[]> {
  const next = { ...stock };
  const reduced = (next[productId] ?? [])
    .map((l) => {
      const consumed = lines.find((x) => x.lotId === l.lotId);
      return consumed ? { ...l, qty: l.qty - consumed.qty } : l;
    })
    .filter((l) => l.qty > 0);
  if (reduced.length === 0) {
    delete next[productId];
  } else {
    next[productId] = reduced;
  }
  return next;
}

/**
 * Thực thi buổi sáng: với mỗi contract active thỏa `startDay <= day` và không quá
 * `endDay`, áp cap nếu có `avgThreeDayStock`, FEFO chọn từ kho chung, tạo
 * `InternalDelivery`, giảm stock (mảng mới) và ghi shortfall report.
 * Kho được duyệt theo thứ tự id hợp đồng (ổn định).
 */
export function dailySupplyExecution(
  contracts: SupplyContract[],
  availableStock: Record<string, SupplyStockLot[]>,
  day: number,
  avgThreeDayStock?: Record<string, number>,
): DailyExecutionResult {
  let remainingStock = cloneStock(availableStock);
  const deliveries: InternalDelivery[] = [];
  const shortfallReports: ShortfallReport[] = [];

  const active = contracts
    .filter((c) => isActiveOn(c, day))
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const contract of active) {
    const capResult = avgThreeDayStock
      ? enforceDailyCap(contract, avgThreeDayStock[contract.productId] ?? contract.quantityPerDay)
      : undefined;
    const requested = capResult ? capResult.allowed : contract.quantityPerDay;

    const selection = fefoSelect(remainingStock[contract.productId] ?? [], contract.productId, requested);
    const totalDelivered = selection.lines.reduce((s, l) => s + l.qty, 0);

    if (totalDelivered > 0) {
      deliveries.push({
        id: `${contract.id}:d${day}`,
        fromBuildingId: contract.fromBuildingId,
        toBuildingId: contract.toBuildingId,
        productId: contract.productId,
        lines: selection.lines.map((l) => ({ lotId: l.lotId, qty: l.qty })),
        totalQty: totalDelivered,
        fromDay: contract.startDay,
        day,
      });
      remainingStock = reduceStock(remainingStock, contract.productId, selection.lines);
    }

    shortfallReports.push({
      contractId: contract.id,
      requested,
      delivered: totalDelivered,
      shortfall: selection.shortfall,
      capped: capResult?.capped ?? false,
      note: capResult?.note,
    });
  }

  return { deliveries, remainingStock, shortfallReports };
}

/**
 * Ghi sổ thành tích nội bộ (D4, thuần): cộng `internalPrice × qty` vào doanh thu
 * tòa giao, trừ vào giá vốn tòa nhận. KHÔNG đổi quỹ — hai dòng thành tích chỉ là
 * bản ghi (amount), quỹ chung nằm ngoài hàm. Trả bản sao mới, không đổi đầu vào.
 */
export function applyInternalTransfer(
  outgoing: ScoreboardLine,
  incoming: ScoreboardLine,
  internalPrice: number,
  qty: number,
): { outgoing: ScoreboardLine; incoming: ScoreboardLine } {
  const amount = Math.round(internalPrice * qty);
  const nextOutgoing: ScoreboardLine = {
    ...outgoing,
    revenue: outgoing.revenue + amount,
    profit: outgoing.revenue + amount - outgoing.costOfGoods,
  };
  const nextIncoming: ScoreboardLine = {
    ...incoming,
    costOfGoods: incoming.costOfGoods + amount,
    profit: incoming.revenue - (incoming.costOfGoods + amount),
  };
  return { outgoing: nextOutgoing, incoming: nextIncoming };
}
