import { shelfTotal, CONVENIENCE } from './branches';
import { quanNuocRestockTip, type QuanNuocState } from './quanNuoc';

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
    outlets.push(tip === null
      ? { id: 'teahouse', icon: '🍵', name: 'Quán nước', state: 'ok', line: 'đủ đồ uống cho tối nay' }
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
    outlets.push(ratio < SUPPLY_BRANCH_DANGER
      ? { id: 'branch', icon: '🏪', name: 'Chi nhánh', state: 'danger', line: `kệ còn ~${pct}% — chở thêm từ kho chung (phí xăng/chuyến) kẻo trống` }
      : ratio < SUPPLY_BRANCH_WARN
        ? { id: 'branch', icon: '🏪', name: 'Chi nhánh', state: 'warn', line: `kệ còn ~${pct}% — cân nhắc chở thêm từ kho chung` }
        : { id: 'branch', icon: '🏪', name: 'Chi nhánh', state: 'ok', line: `kệ dày ~${pct}% — đủ bán` });
  }

  // Điểm nghẽn: ưu tiên danger, rồi warn; không có thì null (mạng lưới khỏe).
  const choke = outlets.find((o) => o.state === 'danger')
    ?? outlets.find((o) => o.state === 'warn')
    ?? null;
  return { outlets, choke };
}
