/**
 * Hợp đồng cung ứng nội bộ giữa hai tòa (OpenSpec `open-world-coop-contracts`, D3/D5) — THUẦN + PROVISIONAL.
 *
 * THUẦN: toàn bộ hàm immutable — không socket, không gateway, không giữ trạng thái;
 * mọi hàm nhận dữ liệu và trả bản sao mới (pattern như `land-vote.ts`).
 *
 * PROVISIONAL: phạm vi chỉ dừng ở mô hình thuần + sổ `internal_transfer` (không đổi quỹ).
 * Chưa nối save schema/socket/server/`internal_delivery` thật (cần `buildingInstanceId`
 * của 6a `open-world-building-types` + schema kế tiếp, chờ máy thật).
 *
 * Thiết kế (D3): một kho chung; mỗi sáng lấy hàng từ kho (FEFO) cho tòa nhận, tạo
 * `internal_delivery`; ghi sổ `internal_transfer` KHÔNG đổi quỹ (D1 phương án A).
 * Giới hạn `quantityPerDay` ≤ 50% tồn trung bình 3 ngày (Rủi ro "Hợp đồng chiếm hết hàng").
 *
 * Vòng đời (D5): `proposed` → bên kia đồng ý → `active`; hết hạn 1 ngày game.
 * Hủy: cả hai đồng ý → `cancelled` ngay; một bên hủy → `ended` nhưng `endDay = day + 1`
 * (hiệu lực từ ngày hôm sau). Bên kia offline → đề xuất chờ.
 */

export type SupplyContractStatus = 'proposed' | 'active' | 'ended' | 'cancelled';

export interface SupplyContract {
  id: string;
  /** Tòa (building instance) giao hàng. */
  fromInstanceId: string;
  /** Tòa (building instance) nhận hàng. */
  toInstanceId: string;
  productId: string;
  /** Số lượng giao mỗi ngày; không được vượt `dailySupplyCap` (50% tồn trung bình 3 ngày). */
  quantityPerDay: number;
  /** Giá nội bộ mỗi đơn vị; chỉ ghi nhận vào thành tích, KHÔNG đổi quỹ (D1/A). */
  internalPrice: number;
  startDay: number;
  /** Ngày chấm dứt hiệu lực; chỉ đặt khi một bên hủy (endDay = day + 1). */
  endDay?: number;
  status: SupplyContractStatus;
  /** Người đề xuất (quản lý tòa giao hoặc tòa nhận). */
  proposedBy: string;
  /** Người kia đồng ý; rỗng khi còn ở trạng thái `proposed`. */
  acceptedBy: string;
}

/**
 * Dữ liệu đầu vào để đề xuất hợp đồng. `proposedBy` được gán riêng ở bước đề xuất,
 * còn lại được đưa vào hợp đồng khi tạo.
 */
export interface SupplyContractInput {
  id: string;
  fromInstanceId: string;
  toInstanceId: string;
  productId: string;
  quantityPerDay: number;
  internalPrice: number;
  startDay: number;
}

/** Giới hạn `quantityPerDay` = 50% tồn trung bình 3 ngày của tòa giao (Rủi ro "Hợp đồng chiếm hết hàng"). */
export const SUPPLY_CONTRACT_DAILY_CAP_RATIO = 0.5;

/** Lỗi nghiệp vụ hợp đồng — các hàm THUẦN ném lỗi này khi đầu vào không hợp lệ. */
export class SupplyContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupplyContractError';
  }
}

/** Tạo hợp đồng ở trạng thái `proposed`, `acceptedBy` rỗng. Kiểm hai tòa khác nhau. */
export function createSupplyContract(input: SupplyContractInput, proposedBy: string): SupplyContract {
  if (!input.fromInstanceId || !input.toInstanceId) {
    throw new SupplyContractError('Hợp đồng cung ứng cần cả tòa giao (from) và tòa nhận (to)');
  }
  if (input.fromInstanceId === input.toInstanceId) {
    throw new SupplyContractError('Hai tòa của hợp đồng cung ứng phải khác nhau');
  }
  if (!proposedBy) {
    throw new SupplyContractError('Hợp đồng cung ứng cần người đề xuất');
  }
  return {
    id: input.id,
    fromInstanceId: input.fromInstanceId,
    toInstanceId: input.toInstanceId,
    productId: input.productId,
    quantityPerDay: input.quantityPerDay,
    internalPrice: input.internalPrice,
    startDay: input.startDay,
    status: 'proposed',
    proposedBy,
    acceptedBy: '',
  };
}

/** Tên gọi tiện — alias rõ nghĩa cho bước đề xuất (validate hai tòa + gán proposedBy). */
export function proposeSupplyContract(input: SupplyContractInput, proposedBy: string): SupplyContract {
  return createSupplyContract(input, proposedBy);
}

/**
 * Bên kia đồng ý đề xuất → status `active`, ghi `acceptedBy`.
 * Người đồng ý phải khác người đề xuất (không tự duyệt đề xuất của mình).
 * Khi contract có `acceptingTo`: người đồng ý phải là quản lý tòa nhận;
 * ngược lại nếu `acceptingFrom` thì là quản lý tòa giao.
 */
export function acceptSupplyContract(
  contract: SupplyContract,
  by: string,
  accepting?: { acceptingFrom: string; acceptingTo: string },
): SupplyContract {
  if (contract.status !== 'proposed') {
    throw new SupplyContractError(`Hợp đồng ${contract.id} ở ${contract.status}, không thể đồng ý`);
  }
  if (!by) {
    throw new SupplyContractError('Hợp đồng cung ứng cần người đồng ý');
  }
  if (by === contract.proposedBy) {
    throw new SupplyContractError('Người đề xuất không thể tự đồng ý hợp đồng của mình');
  }
  if (accepting) {
    const { acceptingFrom, acceptingTo } = accepting;
    // Người đồng ý phải là quản lý một trong hai tòa (acceptingFrom = tòa giao, acceptingTo = tòa nhận).
    const isFromManager = by === acceptingFrom;
    const isToManager = by === acceptingTo;
    if (!isFromManager && !isToManager) {
      throw new SupplyContractError('Người đồng ý phải là quản lý tòa giao hoặc tòa nhận');
    }
  }
  return { ...contract, status: 'active', acceptedBy: by };
}

/**
 * Từ chối đề xuất → giữ nguyên `proposed` (không hủy, bên kia có thể đồng ý sau).
 * Thuần: trả bản sao; chỉ kiểm trạng thái đúng đắn.
 */
export function refuseSupplyContract(contract: SupplyContract, _by: string): SupplyContract {
  if (contract.status !== 'proposed') {
    throw new SupplyContractError(`Hợp đồng ${contract.id} ở ${contract.status}, không thể từ chối`);
  }
  return { ...contract };
}

/**
 * Hủy hợp đồng (D5):
 * - `agree = true` (cả hai đồng ý hủy) → hủy ngay: status `cancelled`.
 * - `agree = false` (một bên hủy) → vẫn còn hiệu lực hôm nay, chấm dứt từ ngày sau:
 *   status `ended`, `endDay = day + 1`.
 * Chỉ từ `proposed` hoặc `active` mới hủy được.
 */
export function cancelSupplyContract(contract: SupplyContract, _by: string, day: number, agree: boolean): SupplyContract {
  if (contract.status !== 'proposed' && contract.status !== 'active') {
    throw new SupplyContractError(`Hợp đồng ${contract.id} ở ${contract.status}, không thể hủy`);
  }
  if (agree) {
    return { ...contract, status: 'cancelled' };
  }
  return { ...contract, status: 'ended', endDay: day + 1 };
}

/**
 * Đề xuất hết hạn sau 1 ngày game (D5): đúng với đề xuất còn ở `proposed`
 * khi `day >= startDay + 1`. Trạng thái khác không hết hạn.
 */
export function isSupplyContractExpired(contract: SupplyContract, day: number): boolean {
  if (contract.status !== 'proposed') return false;
  return day >= contract.startDay + 1;
}

/** Giới hạn mỗi ngày = `floor(avgThreeDayStock × SUPPLY_CONTRACT_DAILY_CAP_RATIO)` (50% tồn). */
export function dailySupplyCap(avgThreeDayStock: number): number {
  const raw = Math.max(0, avgThreeDayStock) * SUPPLY_CONTRACT_DAILY_CAP_RATIO;
  return Math.floor(raw);
}

/**
 * `quantityPerDay` hợp lệ khi là số nguyên dương và không vượt `dailySupplyCap`.
 * (Không phụ thuộc state bên ngoài — chỉ kiểm ngưỡng theo tồn trung bình đã cho.)
 */
export function validateQuantityPerDay(quantityPerDay: number, avgThreeDayStock: number): boolean {
  if (!Number.isSafeInteger(quantityPerDay) || quantityPerDay <= 0) return false;
  return quantityPerDay <= dailySupplyCap(avgThreeDayStock);
}

export interface ResolvedDelivery {
  delivered: number;
  shortfall: number;
}

/**
 * Giao hàng thực tế mỗi sáng (D3): giao `min(quantityPerDay, availableQty)`;
 * nếu `availableQty < quantityPerDay` thì giao phần có và báo thiếu (`shortfall`).
 */
export function resolvedDelivery(contract: SupplyContract, availableQty: number): ResolvedDelivery {
  const available = Math.max(0, Math.floor(availableQty));
  const want = Math.max(0, Math.floor(contract.quantityPerDay));
  const delivered = Math.min(want, available);
  const shortfall = want - delivered;
  return { delivered, shortfall };
}

export interface InternalTransferEntry {
  type: 'internal_transfer';
  fromInstanceId: string;
  toInstanceId: string;
  productId: string;
  qty: number;
  internalPrice: number;
  amount: number;
}

/**
 * Ghi sổ chuyển hàng nội bộ `internal_transfer` (D3/D6). KHÔNG đổi quỹ (D1/A) —
 * chỉ ghi nhận giá trị `amount = qty × internalPrice` vào đối soát thành tích hai bên (D4).
 */
export function internalTransferLedger(contract: SupplyContract, delivered: number): InternalTransferEntry {
  const qty = Math.max(0, Math.floor(delivered));
  return {
    type: 'internal_transfer',
    fromInstanceId: contract.fromInstanceId,
    toInstanceId: contract.toInstanceId,
    productId: contract.productId,
    qty,
    internalPrice: contract.internalPrice,
    amount: qty * contract.internalPrice,
  };
}
