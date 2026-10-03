import { BRANCH_REPORT_LIMIT, type BranchPolicy, type BranchSave, type ChainState, type InventoryItem, type StockLot } from '@game/shared';
import { MAX_CHAIN_BRANCHES, PRODUCT_MAP, STORE_TYPE_MAP } from '@game/data';
import { mergeLots, normalizeLots, sumLots, takeLots } from './stock';

/**
 * Chuỗi chi nhánh (OpenSpec `branch-chain`, nhóm 2–3): hàm thuần trên ví chung + kho tổng + `ChainState`.
 * Không đọc/ghi `GameSimulation`; chưa nối vào lệnh, save, UI. Mọi hàm trả bản sao mới (đầu vào không bị sửa).
 * Hub = id 'hub'; ví chung = tiền save hub; kho tổng = kho hub.
 */
export const HUB_ID = 'hub';

export interface ChainContext {
  money: number;
  /** Kho tổng (hub). */
  warehouse: InventoryItem[];
  chain?: ChainState;
  day: number;
  level: number;
}

export interface ChainSuccess {
  ok: true;
  money: number;
  warehouse: InventoryItem[];
  chain: ChainState;
  /** Lệnh lặp lại (cùng id) không đổi gì. */
  duplicate?: boolean;
}
export interface ChainFailure { ok: false; reason: string }
export type ChainResult = ChainSuccess | ChainFailure;

export interface TransferItem { productId: string; quantity: number }

export const createChain = (): ChainState => ({ branches: [], activeBranchId: HUB_ID, nextBranchSeq: 1 });

const branchSeq = (id: string): number => Number(/^branch-(\d+)$/.exec(id)?.[1] ?? 0);

const finite = (n: unknown, fallback: number): number => (typeof n === 'number' && Number.isFinite(n) ? n : fallback);

/** Chính sách điều hành đọc từ save: mức giá lạ về chuẩn, `manager` chỉ nhận đúng true. */
export function sanitizePolicy(raw: unknown): BranchPolicy {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<BranchPolicy>;
  return {
    priceMode: r.priceMode === 'low' || r.priceMode === 'high' ? r.priceMode : 'normal',
    manager: r.manager === true,
  };
}

/** Làm sạch một chi nhánh đọc từ save: kiểu sai/thiếu trường không làm sập nạp, lô hỏng bị bỏ. */
function sanitizeBranch(raw: BranchSave): BranchSave {
  const type = STORE_TYPE_MAP[raw.storeType];
  const stock: InventoryItem[] = [];
  for (const item of Array.isArray(raw.stock) ? raw.stock : []) {
    if (!item || typeof item.productId !== 'string' || !PRODUCT_MAP[item.productId] || !(item.productId in type.baseDailyDemand)) continue;
    const lots = normalizeLots(finite(item.quantity, 0), Array.isArray(item.lots) ? item.lots : undefined, item.productId, 0);
    const quantity = sumLots(lots);
    if (quantity > 0 && !stock.some((s) => s.productId === item.productId)) stock.push({ productId: item.productId, quantity, lots });
  }
  const reports = (Array.isArray(raw.reports) ? raw.reports : [])
    .filter((r) => r && Number.isSafeInteger(r.day))
    .slice(-BRANCH_REPORT_LIMIT)
    .map((r) => ({
      day: r.day, revenue: Math.max(0, finite(r.revenue, 0)), cogs: Math.max(0, finite(r.cogs, 0)), wages: Math.max(0, finite(r.wages, 0)),
      spoilageLoss: Math.max(0, finite(r.spoilageLoss, 0)), unitsSold: Math.max(0, finite(r.unitsSold, 0)),
      stockouts: Array.isArray(r.stockouts) ? r.stockouts.filter((id): id is string => typeof id === 'string') : [],
    }));
  return {
    id: raw.id,
    storeType: raw.storeType,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 48) : type.name,
    openedDay: Number.isSafeInteger(raw.openedDay) ? raw.openedDay : 1,
    stock,
    reputation: Math.min(100, Math.max(0, finite(raw.reputation, type.startingReputation))),
    lastBackgroundDay: Number.isSafeInteger(raw.lastBackgroundDay) ? raw.lastBackgroundDay : 0,
    reports,
    totalRevenue: Math.max(0, finite(raw.totalRevenue, 0)),
    ...(raw.policy ? { policy: sanitizePolicy(raw.policy) } : {}),
  };
}

/** Chuẩn hóa `chain` từ save: thiếu = chuỗi một cơ sở; bỏ chi nhánh loại lạ/id trùng; đưa `activeBranchId` về hợp lệ. */
export function normalizeChain(raw: ChainState | undefined): ChainState {
  if (!raw || typeof raw !== 'object') return createChain();
  const seen = new Set<string>();
  const branches: BranchSave[] = [];
  for (const branch of Array.isArray(raw.branches) ? raw.branches : []) {
    if (!branch || typeof branch.id !== 'string' || branch.id === HUB_ID || seen.has(branch.id) || !STORE_TYPE_MAP[branch.storeType]) continue;
    seen.add(branch.id);
    branches.push(sanitizeBranch(branch));
    if (branches.length >= MAX_CHAIN_BRANCHES) break;
  }
  const maxSeq = branches.reduce((max, b) => Math.max(max, branchSeq(b.id)), 0);
  const seq = Number.isSafeInteger(raw.nextBranchSeq) && raw.nextBranchSeq > maxSeq ? raw.nextBranchSeq : maxSeq + 1;
  const active = typeof raw.activeBranchId === 'string' && (raw.activeBranchId === HUB_ID || seen.has(raw.activeBranchId)) ? raw.activeBranchId : HUB_ID;
  return { branches, activeBranchId: active, nextBranchSeq: seq };
}

export function branchStockUnits(branch: BranchSave): number {
  return branch.stock.reduce((sum, item) => sum + item.quantity, 0);
}

const fail = (reason: string): ChainFailure => ({ ok: false, reason });
const isPositiveInt = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n > 0;

/** Mở chi nhánh: kiểm loại hình, cấp, giới hạn, tiền; trừ `openCost` một lần. `requestedId` giúp lệnh lặp là no-op. */
export function openBranch(ctx: ChainContext, storeTypeId: string, name?: string, requestedId?: string): ChainResult {
  const chain = normalizeChain(ctx.chain);
  if (requestedId && chain.branches.some((b) => b.id === requestedId)) {
    return { ok: true, money: ctx.money, warehouse: structuredClone(ctx.warehouse), chain, duplicate: true };
  }
  const type = STORE_TYPE_MAP[storeTypeId];
  if (!type) return fail('Loại hình cửa hàng không tồn tại.');
  if (ctx.level < type.unlockLevel) return fail(`Cần cấp ${type.unlockLevel} để mở ${type.name}.`);
  if (chain.branches.length >= MAX_CHAIN_BRANCHES) return fail(`Chuỗi tối đa ${MAX_CHAIN_BRANCHES} chi nhánh.`);
  if (chain.branches.filter((b) => b.storeType === type.id).length >= type.maxBranches) return fail(`${type.name} tối đa ${type.maxBranches} chi nhánh.`);
  if (!Number.isFinite(ctx.money) || ctx.money < type.openCost) return fail('Không đủ tiền mở chi nhánh.');
  const id = requestedId ?? `branch-${chain.nextBranchSeq}`;
  if (id === HUB_ID) return fail('Mã chi nhánh không hợp lệ.');
  const branch: BranchSave = {
    id,
    storeType: type.id,
    name: name?.trim() || `${type.name} ${chain.branches.length + 1}`,
    openedDay: ctx.day,
    stock: [],
    reputation: type.startingReputation,
    lastBackgroundDay: ctx.day,
    reports: [],
    totalRevenue: 0,
  };
  return {
    ok: true,
    money: ctx.money - type.openCost,
    warehouse: structuredClone(ctx.warehouse),
    chain: { ...chain, branches: [...chain.branches, branch], nextBranchSeq: Math.max(chain.nextBranchSeq, branchSeq(id) + 1) },
  };
}

/** Chuyển điều khiển sang chi nhánh (hoặc 'hub'). */
export function switchBranch(ctx: ChainContext, branchId: string): ChainResult {
  const chain = normalizeChain(ctx.chain);
  if (branchId !== HUB_ID && !chain.branches.some((b) => b.id === branchId)) return fail('Chi nhánh không tồn tại.');
  return { ok: true, money: ctx.money, warehouse: structuredClone(ctx.warehouse), chain: { ...chain, activeBranchId: branchId } };
}

function mergedRequest(items: TransferItem[]): Map<string, number> | ChainFailure {
  const wanted = new Map<string, number>();
  if (!Array.isArray(items) || items.length === 0) return fail('Chưa chọn món nào.');
  for (const item of items) {
    if (!item || typeof item.productId !== 'string' || !PRODUCT_MAP[item.productId]) return fail('Có món không tồn tại.');
    if (!isPositiveInt(item.quantity)) return fail('Số lượng phải là số nguyên dương.');
    wanted.set(item.productId, (wanted.get(item.productId) ?? 0) + item.quantity);
  }
  return wanted;
}

function lotsOf(item: InventoryItem | undefined, day: number): StockLot[] {
  return item ? normalizeLots(item.quantity, item.lots, item.productId, day) : [];
}

/** Ghi lô vào kho: `quantity` luôn bằng tổng lô; món hết hàng bị bỏ khỏi mảng. */
export function setLots(stock: InventoryItem[], productId: string, lots: StockLot[]): void {
  const index = stock.findIndex((i) => i.productId === productId);
  const quantity = sumLots(lots);
  if (quantity <= 0) { if (index >= 0) stock.splice(index, 1); return; }
  if (index >= 0) stock[index] = { productId, quantity, lots };
  else stock.push({ productId, quantity, lots });
}

function moveStock(from: InventoryItem[], to: InventoryItem[], wanted: Map<string, number>, day: number, capacityLeft: number): { from: InventoryItem[]; to: InventoryItem[] } | ChainFailure {
  const total = [...wanted.values()].reduce((a, b) => a + b, 0);
  if (total > capacityLeft) return fail('Nơi nhận không đủ sức chứa.');
  const source = structuredClone(from);
  const target = structuredClone(to);
  for (const [productId, quantity] of wanted) {
    const lots = lotsOf(source.find((i) => i.productId === productId), day);
    if (sumLots(lots) < quantity) return fail(`Không đủ ${PRODUCT_MAP[productId]?.name ?? productId} để chuyển.`);
    const moved = takeLots(lots, quantity);
    setLots(source, productId, lots);
    const targetLots = lotsOf(target.find((i) => i.productId === productId), day);
    mergeLots(targetLots, moved);
    setLots(target, productId, targetLots);
  }
  return { from: source, to: target };
}

/** Kho tổng → chi nhánh theo FEFO, giữ lô/hạn/giá vốn; tất cả hoặc không. */
export function transferStock(ctx: ChainContext, branchId: string, items: TransferItem[]): ChainResult {
  const chain = normalizeChain(ctx.chain);
  const branch = chain.branches.find((b) => b.id === branchId);
  if (!branch) return fail('Chi nhánh không tồn tại.');
  const wanted = mergedRequest(items);
  if (!(wanted instanceof Map)) return wanted;
  const type = STORE_TYPE_MAP[branch.storeType];
  for (const productId of wanted.keys()) {
    if (!(productId in type.baseDailyDemand)) return fail(`${PRODUCT_MAP[productId].name} không bán ở loại hình này.`);
  }
  const moved = moveStock(ctx.warehouse, branch.stock, wanted, ctx.day, type.stockCapacity - branchStockUnits(branch));
  if ('ok' in moved) return moved;
  const next = { ...chain, branches: chain.branches.map((b) => (b.id === branchId ? { ...b, stock: moved.to } : b)) };
  return { ok: true, money: ctx.money, warehouse: moved.from, chain: next };
}

/** Chi nhánh → kho tổng. Sức chứa kho tổng do `GameSimulation` quản lý khi nối vào; lớp này không giới hạn. */
export function returnStock(ctx: ChainContext, branchId: string, items: TransferItem[]): ChainResult {
  const chain = normalizeChain(ctx.chain);
  const branch = chain.branches.find((b) => b.id === branchId);
  if (!branch) return fail('Chi nhánh không tồn tại.');
  const wanted = mergedRequest(items);
  if (!(wanted instanceof Map)) return wanted;
  const moved = moveStock(branch.stock, ctx.warehouse, wanted, ctx.day, Number.MAX_SAFE_INTEGER);
  if ('ok' in moved) return moved;
  const next = { ...chain, branches: chain.branches.map((b) => (b.id === branchId ? { ...b, stock: moved.from } : b)) };
  return { ok: true, money: ctx.money, warehouse: moved.to, chain: next };
}

/** Đổi cách điều hành chi nhánh (mức giá, thuê/sa thải quản lý). Không đổi ví; áp dụng từ lần chạy nền kế tiếp. */
export function setBranchPolicy(ctx: ChainContext, branchId: string, policy: BranchPolicy): ChainResult {
  const chain = normalizeChain(ctx.chain);
  if (!chain.branches.some((b) => b.id === branchId)) return fail('Chi nhánh không tồn tại.');
  const next = sanitizePolicy(policy);
  return { ok: true, money: ctx.money, warehouse: structuredClone(ctx.warehouse), chain: { ...chain, branches: chain.branches.map((b) => (b.id === branchId ? { ...b, policy: next } : b)) } };
}

/** Chính sách đang áp dụng của chi nhánh (thiếu = mặc định). */
export const policyOf = (branch: BranchSave): BranchPolicy => sanitizePolicy(branch.policy);

/** Tổng đơn vị và giá trị vốn của một kho (dùng cho bất biến bảo toàn). */
export function stockTotals(stock: InventoryItem[], day: number): { units: number; value: number } {
  let units = 0, value = 0;
  for (const item of stock) {
    for (const lot of lotsOf(item, day)) { units += lot.quantity; value += lot.quantity * (lot.unitCost ?? 0); }
  }
  return { units, value };
}
