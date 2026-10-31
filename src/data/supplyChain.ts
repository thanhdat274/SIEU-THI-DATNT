import { shelfTotal, CONVENIENCE } from './branches';
import { quanNuocProjection, quanNuocDrinkIds, quanNuocRestockTip, type QuanNuocState } from './quanNuoc';
import { productById } from './products';

/**
 * GĐ199 — "Rốn kho chung": bắt đầu trục multi-shop supply chain (backlog 6) bằng một bước soi sáng —
 * nối các điểm bán (tiệm chính + chi nhánh + quán nước) về một rốn kho chung, liệt kê mỗi điểm còn dư
 * bao nhiêu / sắp cạn ai, để người chơi thấy "mạng lưới" chứ không chỉ từng kệ riêng.
 * Thuần đọc, dùng ĐÚNG nguồn chân lý có sẵn: quán nước deterministc (quanNuocRestockTip, GĐ190), chi
 * nhánh quan sát được qua shelf (GĐ153), kho chung qua tổng đơn vị trong storage. KHÔNG đổi
 * SAVE_VERSION/kinh tế/persist — chỉ đọc để dựng thẻ.
 */
export type SupplyOutletId = 'main' | 'branch' | 'teahouse';
export type SupplyState = 'ok' | 'warn' | 'danger' | 'idle';

export interface SupplyOutletStatus {
  id: SupplyOutletId;
  icon: string;
  name: string;
  state: SupplyState;
  line: string;
}

export interface SupplyChain {
  outlets: SupplyOutletStatus[];
  /** Điểm nghẽn: điểm cạn nhất (danger trước, rồi warn) — để người chơi biết nên xử lý đâu trước. */
  choke: SupplyOutletStatus | null;
}

export const SUPPLY_BRANCH_WARN = 0.35;
export const SUPPLY_BRANCH_DANGER = 0.15;

/** Tổng đơn vị hàng đang nằm trong kho chung. */
export const storageTotal = (storage: Record<string, number>) =>
  Object.values(storage).reduce((n, q) => n + q, 0);

/**
 * GĐ200 — Kho chung nuôi quán nước được MẤY NGÀY: số đơn vị đồ uống trong kho chia nhu cầu deterministc
 * mỗi đêm (`wanted` — GĐ127/187) → chân trời thời gian cho "rốn kho chung" (GĐ199). Ít ngày = nạp sớm.
 * THUẦN — chỉ đọc storage + dự phóng, không đổi sim/save.
 */
export const teahouseKhoDays = (q: QuanNuocState, level: number, storage: Record<string, number>): number | null => {
  if (!q.open) return null;
  const units = quanNuocDrinkIds(level).reduce((n, id) => n + (storage[id] ?? 0), 0);
  const burn = quanNuocProjection(q, level, units).wanted;
  if (burn <= 0) return null;
  return Math.floor(units / burn);
};

export interface ThinShelf { id: string; name: string; empty: number }

/**
 * GĐ201 — Những kệ chi nhánh trống nhiều nhất: headroom = perItem − đang có (quan sát được, không dự
 * đoán nhu cầu sim) → gợi ý "chở loại gì từ kho chung" cho người chơi khi kệ cạn. THUẦN theo shelf.
 */
export const branchThinShelves = (branch: { shelf: Record<string, number> } | undefined, n = 4): ThinShelf[] => {
  if (!branch) return [];
  return Object.entries(branch.shelf ?? {})
    .map(([id, qty]) => ({ id, name: productById(id)?.name ?? id, empty: Math.max(0, CONVENIENCE.perItem - (qty ?? 0)) }))
    .filter((t) => t.empty > 0)
    .sort((a, b) => b.empty - a.empty)
    .slice(0, n);
};

export function supplyChainOverview(
  storage: Record<string, number>,
  branch: { open: boolean; shelf: Record<string, number> } | undefined,
  quan: QuanNuocState,
  level: number,
  last?: { served?: number; wanted?: number } | null,
): SupplyChain {
  const outlets: SupplyOutletStatus[] = [];

  // Kho chung (tiệm chính): nguồn cung cho cả mạng lưới.
  const total = storageTotal(storage);
  outlets.push({
    id: 'main', icon: '📦', name: 'Kho chung (tiệm chính)',
    state: total > 0 ? 'ok' : 'danger',
    line: total > 0
      ? `chứa ~${total.toLocaleString('vi-VN')} món — nuôi cả tiệm chính, chi nhánh & quán nước`
      : 'trống — nhập hàng ngay kẻo các điểm bán không có gì bán',
  });

  // Quán nước: deterministic (GĐ127) — trả lời chính xác "thiếu bao nhiêu ly đêm nay".
  if (!quan.open) {
    outlets.push({ id: 'teahouse', icon: '🍵', name: 'Quán nước', state: 'idle', line: 'chưa mở — không dùng kho chung' });
  } else {
    const tip = quanNuocRestockTip(quan, level, storage, last);
    const days = teahouseKhoDays(quan, level, storage);
    outlets.push(tip === null
      ? { id: 'teahouse', icon: '🍵', name: 'Quán nước', state: 'ok', line: `đủ đồ uống cho tối nay${days !== null ? ` · kho chung nuôi ~${days} ngày` : ''}` }
      : tip.verdict === 'danger'
        ? { id: 'teahouse', icon: '🍵', name: 'Quán nước', state: 'danger', line: `thiếu ~${tip.shortfall} ly (hôm qua mất ${tip.missedRevenue.toLocaleString('vi-VN')}đ) — nhập nước/ngọt/cà phê` }
        : { id: 'teahouse', icon: '🍵', name: 'Quán nước', state: 'warn', line: `sắp cạn kho chung — đêm nay cần thêm ~${tip.shortfall} ly` });
  }

  // Chi nhánh (cửa hàng tiện lợi): kệ đầy bao nhiêu — quan sát được, không dự đoán chính xác từng món.
  if (!branch?.open) {
    outlets.push({ id: 'branch', icon: '🏪', name: 'Chi nhánh', state: 'idle', line: 'chưa mở — không dùng kho chung' });
  } else {
    const ratio = shelfTotal(branch.shelf ?? {}) / CONVENIENCE.shelfCap;
    const pct = Math.round(ratio * 100);
    const thin = branchThinShelves(branch).map((t) => t.name).join(', ');
    const tron = thin ? ` (trống: ${thin})` : '';
    outlets.push(ratio < SUPPLY_BRANCH_DANGER
      ? { id: 'branch', icon: '🏪', name: 'Chi nhánh', state: 'danger', line: `kệ còn ~${pct}%${tron} — chở thêm từ kho chung (phí xăng/chuyến) kẻo trống` }
      : ratio < SUPPLY_BRANCH_WARN
        ? { id: 'branch', icon: '🏪', name: 'Chi nhánh', state: 'warn', line: `kệ còn ~${pct}%${tron} — cân nhắc chở thêm từ kho chung` }
        : { id: 'branch', icon: '🏪', name: 'Chi nhánh', state: 'ok', line: `kệ dày ~${pct}% — đủ bán` });
  }

  // Điểm nghẽn: ưu tiên danger, rồi warn; không có thì null (mạng lưới khỏe).
  const choke = outlets.find((o) => o.state === 'danger')
    ?? outlets.find((o) => o.state === 'warn')
    ?? null;
  return { outlets, choke };
}

export interface RestockLine {
  outlet: SupplyOutletId;
  /** Mã món (chỉ có ở dòng chi nhánh — 1 món/kệ); quán nước là nhóm gộp nên bỏ trống. */
  id?: string;
  /** Nhãn: tên món (chi nhánh) hoặc nhóm "Đồ uống" (quán nước — nước/ngọt/cà phê). */
  label: string;
  /** Đơn vị cần bổ sung cho điểm bán này. */
  need: number;
  /** Đơn vị kho chung đang có cho nhu cầu này (phần hụt phải nhập thêm). */
  inWarehouse: number;
  /** Đủ kho chung để chở, hay phải nhập thêm từ nhà cung cấp. */
  source: 'warehouse' | 'buy';
}

export interface RestockManifest {
  lines: RestockLine[];
  /** Tổng đơn vị cần bổ sung cho mạng lưới. */
  total: number;
  /** Phần kéo được từ kho chung (chở là đủ). */
  warehouseCover: number;
  /** Phần phải nhập thêm (kho chung cũng không có). */
  buyNeed: number;
  /** Chuỗi tóm tắt một dòng cho thẻ UI. */
  line: string;
}

/**
 * GĐ202 — "Phiếu nạp kho": GĐ199–201 mới SOI điểm bán nào thiếu; vế người chơi cần làm là biết NẠP
 * BAO NHIÊU từng món cho đúng chỗ. Helper thuần này biến các gợi ý đó thành một danh sách hàng cụ thể:
 *   - Chi nhánh: từng kệ trống (branchThinShelves) cần `empty` đơn vị; kéo được từ kho chung theo
 *     đơn vị món đang có (min(empty, storage[id])), phần hụt phải nhập.
 *   - Quán nước: thiếu đồ uống tối nay (quanNuocRestockTip); vì `have` đã gồm cả kho chung, toàn bộ
 *     shortfall là NHẬP THÊM (kho chung không gánh được).
 * Tổng → `buyNeed` = số đơn vị thực sự phải mua để lấp cả mạng lưới (hướng dẫn "mua bao nhiêu" ngay
 * trong một chuyến nạp). THUẦN — chỉ đọc storage/shelf/projection, không đổi sim/save.
 */
export function supplyRestockManifest(
  storage: Record<string, number>,
  branch: { open: boolean; shelf: Record<string, number> } | undefined,
  quan: QuanNuocState,
  level: number,
  last?: { served?: number; wanted?: number } | null,
): RestockManifest {
  const lines: RestockLine[] = [];
  let total = 0, warehouseCover = 0, buyNeed = 0;

  // Chi nhánh: chở theo kệ — từng món cần bao nhiêu, kho chung có mấy đơn vị.
  if (branch?.open) {
    for (const t of branchThinShelves(branch)) {
      const have = storage[t.id] ?? 0;
      const covered = Math.min(t.empty, have);
      const buy = t.empty - covered;
      total += t.empty;
      warehouseCover += covered;
      buyNeed += buy;
      lines.push({ outlet: 'branch', id: t.id, label: t.name, need: t.empty, inWarehouse: have, source: buy > 0 ? 'buy' : 'warehouse' });
    }
  }

  // Quán nước: shortfall đã gồm kho chung → phần hụt là nhập thêm.
  if (quan.open) {
    const tip = quanNuocRestockTip(quan, level, storage, last);
    if (tip && tip.shortfall > 0) {
      total += tip.shortfall;
      buyNeed += tip.shortfall;
      lines.push({ outlet: 'teahouse', label: `Đồ uống (${quanNuocDrinkIds(level).length} món nước/ngọt/cà phê)`, need: tip.shortfall, inWarehouse: tip.have, source: 'buy' });
    }
  }

  const line = (total === 0
    ? 'kho chung & các điểm bán đều đủ cho hôm nay — không cần nạp thêm'
    : `cần ~${total.toLocaleString('vi-VN')} đơn vị: ${warehouseCover > 0 ? `chở ${warehouseCover.toLocaleString('vi-VN')} từ kho chung` : 'chở 0 từ kho chung'}${buyNeed > 0 ? `, nhập thêm ${buyNeed.toLocaleString('vi-VN')} từ nhà cung cấp` : ''}`);

  return { lines, total, warehouseCover, buyNeed, line };
}

/**
 * GĐ204 — Có đáng nhắc "nạp liền mạng lưới" ở màn Nhập hàng không? Chỉ hiện khi có nhu cầu NGOÀI phần
 * quán nước (đã có thẻ riêng GĐ191): chi nhánh thiếu kệ (lines branch) hoặc cần chở từ kho chung
 * (warehouseCover>0). Tránh lặp thẻ nạp kho quán nước bên trên. THUẦN theo manifest — test soi dễ.
 */
export const supplyNetworkOrderVisible = (manifest: RestockManifest): boolean =>
  manifest.lines.some((l) => l.outlet === 'branch') || manifest.warehouseCover > 0;
