// ============================================================================
// Data: Quản lý kho — giá trị TỰ ĐỘNG GIẢM HÀNG HỎNG (GĐ2221)
// ----------------------------------------------------------------------------
// Quản lý kho (warehouse_mgr) là vai TỰ ĐỘNG một việc mất tiền: mỗi đêm nó sắp xếp kho, xoay hàng
// cận hạn lên bán trước nên hàng hỏng qua đêm chậm hơn theo tay nghề (src/core/stock.ts spoilOvernight):
//     keeperMgr = max(0.1, 1 − WAREHOUSE_KEEP_PER_STAR × skill)   (5★ = 1−0.3 = 0.7 → chậm 30%)
// Trước GĐ2221, quyết định "thuê/giữ quản lý kho này đáng không?" là HỘP ĐEN: người chơi chỉ thấy
// mô tả vai + lương mà không biết đêm qua nó cứu được bao nhiêu tiền. Bảng tổng kết có `spoilNightReport`
// (GĐ133, đo SỐ HỎNG THẬT đã chốt của đêm trước) — con số đó ĐÃ gồm tác dụng của quản lý kho.
// Helper này THUẦN (không đổi state/save/kinh tế — Luật 5): lật ngược đúng công thức để tách phần
// "nếu không có quản lý kho thì đêm đó hỏng thêm bao nhiêu" — đó là tiền quản lý kho cứu mỗi đêm:
//   hqk = 1 − 0.06×skill_hiện     (hệ số giữ hàng QUẢN LÝ KHO thực tế)
//   giả sử không có quản lý kho → hqk₀ = 1 (hỏng nhanh hơn)
//   hỏng_không_mgmt = totalCost_đã_chốt / hqk      (tổng chi phí nếu không có ảnh hưởng kho)
//   cứu được   = hỏng_không_mgmt − totalCost_đã_chốt = totalCost × (1/hqk − 1)
// Đây là con số TRUNG THỰC từ dữ liệu đêm đã chốt + hằng số có sẵn, chỉ ra khi đêm đó CÓ hàng hỏng
// (không bịa); chỉ hiện dòng khi có người quản lý kho trong đội (kể cả khi xem ứng viên — ước theo
// tay nghề của ứng viên). Không đổi bất kỳ công thức nào (Luật 3).
// ============================================================================

import { WAREHOUSE_KEEP_PER_STAR } from './staff';
import { fmtNum } from '../core/format';

export interface WarehouseKeeperPayoff {
  /** Có dữ liệu đêm hỏng thật để nêu (hoặc đã có quản lý kho đang cứu) không. */
  ok: boolean;
  /** Chi phí hàng hỏng đêm qua ĐÃ CHỐT (analytics spoilNightReport.totalCost). */
  spoiltCost: number;
  /** Hệ số giữ kho của tay nghề hqk đang dùng (1 = không ảnh hưởng). */
  keeperMgr: number;
  /** Tiền quản lý kho đã cứu đêm qua (theo hqk của người giỏi nhất trong đội). */
  saved: number;
  /** Một dòng tiếng Việt (≤90 ký tự) — rỗng khi !ok. */
  line: string;
}

const fmt = (n: number) => fmtNum(n);

/** Ngưỡng tiền cứu đủ đáng nhắc (tránh nhiễu khi đêm hỏng vài nghìn). */
export const WAREHOUSE_SAVE_MIN = 10000;

/**
 * GĐ2221 — quản lý kho tự giảm hàng hỏng đáng bao nhiêu: tách từ tổng hỏng ĐÃ CHỐT bằng đúng công thức
 * `keeperMgr` (spoilOvernight). THUẦN: nhận số đã đo + tay nghề — không đổi state/sim/save.
 */
export function warehouseKeeperPayoff(inp: {
  /** Chi phí hàng hỏng đêm ĐÃ CHỐT (analytics spoilNightReport.totalCost; 0 = đêm sạch). */
  spoiltCost: number;
  /** Tay nghề quản lý kho GIỎI NHẤT đang trực trong đội (0 = chưa có). */
  bestSkill: number;
}): WarehouseKeeperPayoff {
  const holder = WAREHOUSE_KEEP_PER_STAR * Math.min(inp.bestSkill, 5);
  const keeperMgr = Math.max(0.1, 1 - holder); // khớp spoilOvernight
  // Phần "không có quản lý kho" → keeperMgr₀=1; cứu = totalCost×(1/keeperMgr − 1)
  const saved = inp.spoiltCost > 0 ? Math.round(inp.spoiltCost * (1 / keeperMgr - 1)) : 0;

  // Chưa có quản lý kho + đêm có hỏng → nêu "nếu có quản lý kho N★ thì đêm kiểu này cứu ~Xđ"? => không:
  // đó là ước khung, không phải hỏng đã đo với hqk thật. Chỉ nêu khi có người quản lý kho (số thật).
  if (inp.bestSkill <= 0) return { ok: false, spoiltCost: inp.spoiltCost, keeperMgr: 1, saved: 0, line: '' };
  if (inp.spoiltCost < WAREHOUSE_SAVE_MIN || saved < WAREHOUSE_SAVE_MIN) return { ok: false, spoiltCost: inp.spoiltCost, keeperMgr, saved, line: '' };

  const pct = Math.round(holder * 100);
  return {
    ok: true, spoiltCost: inp.spoiltCost, keeperMgr, saved,
    line: `💾 Quản lý kho ${inp.bestSkill}★ đã cứu ~${fmt(saved)}đ đêm qua (hỏng ${fmt(inp.spoiltCost)}đ, chậm ${pct}%).`,
  };
}
