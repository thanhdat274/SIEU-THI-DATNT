import { STANCE_IDS, STANCE_UNLOCK, type StanceId } from '../../data/stance';
import type { GameState, GetState, SetState } from '../gameTypes';

/**
 * Hệ 3 (SPEC-CHIEU-SAU §3.9) — TREO / GỠ BIỂN ĐỊNH VỊ (cấp ≥ 60).
 * Lần treo biển đầu MIỄN PHÍ. Đổi hướng (treo biển khác khi đã có biển) là lát L6: làm biển lại 14
 * ngày không hiệu ứng, bậc về 0 (khoản tiền + bỏ phiếu co-op sẽ thêm ở L6). Không treo biển cũng là
 * một lựa chọn hợp lệ (không lợi, không phạt — như game hiện tại).
 */
export const createStanceSlice = (set: SetState, get: GetState): Pick<GameState, 'chooseStance' | 'dropStance'> => ({
  chooseStance: (id: StanceId) => {
    const s = get();
    if (s.level < STANCE_UNLOCK) return s.notify(`🪧 Treo biển mở từ cấp ${STANCE_UNLOCK}`);
    if (!STANCE_IDS.includes(id)) return;
    const cur = s.biz.stance;
    const day = s.day;
    const next = { id, since: day, fitDays: 0, missStreak: 0 };
    if (!cur) {
      set({ biz: { ...s.biz, stance: next } });
      s.notify(`🪧 Đã treo biển Định vị. Theo dõi độ khớp mỗi đêm ở Sổ đầu ngày.`);
    } else if (cur.id !== id) {
      // Đổi hướng (L6 chính thức): làm biển lại 14 ngày, bậc về 0 — chưa có tiền/bỏ phiếu (lát sau).
      set({ biz: { ...s.biz, stance: { id, since: day, fitDays: 0, missStreak: 0, switchUntil: day + 14 } } });
      s.notify(`🪧 Đổi biển sang hướng mới — 14 ngày làm lại biển, chưa có hiệu ứng.`);
    } else {
      s.notify(`🪧 Đang treo biển hướng này rồi.`);
    }
  },
  dropStance: () => {
    const s = get();
    if (!s.biz.stance) return;
    set({ biz: { ...s.biz, stance: undefined } });
    s.notify(`🪧 Đã gỡ biển Định vị — cửa hàng trở về như cũ (không lợi, không phạt).`);
  },
});
