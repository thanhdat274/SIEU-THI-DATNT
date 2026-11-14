// ============================================================================
// Data: Quản lý — giá trị TỰ ĐỘNG NHẬP HÀNG khi kho sắp cạn (GĐ2220)
// ----------------------------------------------------------------------------
// Quản lý (manager) là vai mà hirePayoff (GĐ1267) để trống vì "không có lỗ tiền trung thực đo được":
// nhưng chức năng CHÍNH của quản lý chính là TỰ ĐỘNG HÓA — mỗi sáng/trưa (MANAGER_CHECKS) nó tự nhập
// hàng: món nào đang bày, từng bán qua, mà kho còn dưới MANAGER_LOW_STOCK thì tự đặt cho đủ
// MANAGER_TARGET (logic thuần đã có `managerNeedToRestock`), để kệ khỏi hết hàng → khách đỡ bỏ về.
// Trước GĐ2220, quyết định "thuê quản lý để nó tự canh kho giùm mình — đáng không?" là HỘP ĐEN: chủ chỉ
// thấy lương ×1.8 mà không thấy lượng việc tự nhập hàng quản lý gánh, và hôm nay đã lỡ bao nhiêu tiền
// vì hết hàng trong nhóm nó canh. Helper này THUẦN (không đổi state/save/kinh tế — Luật 5):
//   - Đếm MÓN đang cần đặt bù theo ĐÚNG luật quản lý (managerNeedToRestock) → chủ không phải tự canh.
//   - Quy `missLog['stock:*']` hôm nay: những món hết hàng (inStorage===0) mà ĐÚNG thuộc nhóm quản lý
//     đang canh (đang bày + đã bán + kho vơi) → đó là tiền đang LỠ vì không ai tự nhập, và quản lý chính
//     là thứ vá lỗ đó (đặt trước khi cạn bằng MANAGER_TARGET).
// Chỉ ra dòng khi có tín hiệu THẬT (có món cần đặt hoặc có lỡ hết hàng trong nhóm canh); không bịa.
// ============================================================================

import { managerNeedToRestock } from '../agents/staff';
import { storeMissRevenue, type MissLog } from './advice';
import { MANAGER_LOW_STOCK, MANAGER_TARGET } from './staff';
import { productById } from './products';
import { fmtNum } from '../core/format';

export interface ManagerAutoPayoff {
  /** Có việc tự nhập hàng đang gánh được (hoặc đã lỡ trong nhóm canh) để nêu không. */
  ok: boolean;
  /** Số món quản lý sẽ TỰ ĐẶT BÙ ngay bây giờ theo đúng luật (0 = không cần nhập). */
  orderCount: number;
  /** Tên các món đó (tối đa 3 cho dòng ngắn). */
  orderNames: string[];
  /** Tiền đang LỠ hôm nay (lãi bỏ lỡ, đ) vì hết hàng trong nhóm quản lý canh. */
  loss: number;
  /** Một dòng tiếng Việt (≤90 ký tự) — rỗng khi !ok. */
  line: string;
}

const fmt = (n: number) => fmtNum(n);

const NEED_MIN_LOSS = 20000;

/**
 * GĐ2220 — quản lý TỰ NHẬP HÀNG khi kho sắp cạn: đếm việc nó gánh + tiền hôm nay lỡ vì hết hàng trong
 * nhóm nó canh. THUẦN: nhận dữ liệu (caller trích từ store) — không đổi state/sim/save.
 */
export function managerAutoPayoff(inp: {
  /** Những món đang bày trên kệ (furniture tiers). */
  shelved: string[];
  storage: Record<string, number>;
  /** Hàng đang về (từ s.deliveries). */
  pending: Record<string, number>;
  sales: Record<string, number>;
  salesToday: Record<string, number>;
  /** missLog hôm nay (stats.missLog) — để quy tiền đang lỡ. */
  missLog: MissLog | undefined;
}): ManagerAutoPayoff {
  const need = managerNeedToRestock({
    shelved: inp.shelved,
    storage: inp.storage,
    pending: inp.pending,
    sales: inp.sales,
    salesToday: inp.salesToday,
  });
  const orderCount = Object.keys(need).length;
  const orderNames = orderCount ? Object.keys(need).slice(0, 3).map((id) => productById(id)?.name ?? id) : [];

  // Tiền đang LỠ hôm nay trong nhóm quản lý canh: món hết hàng (inStorage===0) mà ĐANG cần đặt bù
  // (nằm trong need) — vì quản lý canh sẽ đặt trước khi cạn, nên đây là lỗ quản lý vá thật.
  let loss = 0;
  const miss = storeMissRevenue(inp.missLog, inp.storage);
  if (miss) {
    for (const r of miss.rows) {
      if (r.inStorage === 0 && need[r.id] !== undefined) loss += r.estLoss;
    }
  }

  if (orderCount === 0 && loss === 0) {
    return { ok: false, orderCount: 0, orderNames: [], loss: 0, line: '' };
  }

  // Ưu tiên nhấn việc đang gánh (tự đặt bù) — con số trung thực từ luật có sẵn.
  let line: string;
  if (orderCount > 0) {
    const names = orderNames.slice(0, 2).join(', ');
    const more = orderCount > 2 ? ` +${orderCount - 2} món` : '';
    line = `Quản lý tự nhập ${orderCount} món sắp cạn (${names}${more}) — khỏi canh kệ mỗi sáng.`;
    if (loss >= NEED_MIN_LOSS) {
      line = `Quản lý tự nhập ${orderCount} món sắp cạn; hôm nay nhóm này đã lỡ ~${fmt(loss)}đ vì hết hàng.`;
    }
  } else {
    line = `Hôm nay ${fmt(loss)}đ lỡ vì hết hàng (nhóm quản lý tự canh) — thuê để đặt trước khi cạn.`;
  }

  return { ok: true, orderCount, orderNames, loss, line };
}

/** Hằng số quản lý (để test đối chiếu luật có sẵn, không phải số mới). */
export const MANAGER_AUTO_REFS = { MANAGER_LOW_STOCK, MANAGER_TARGET };
