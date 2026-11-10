import { STANCE_IDS, STANCE_SWITCH_BASE_COST, STANCE_UNLOCK, stanceTier, type StanceId } from '../../data/stance';
import type { GameState, GetState, SetState } from '../gameTypes';

/**
 * Hệ 3 (SPEC-CHIEU-SAU §3.9) — TREO / GỠ BIỂN ĐỊNH VỊ (cấp ≥ 60).
 * Lần treo biển đầu MIỄN PHÍ. Đổi hướng (L6): trả tiền làm biển 5tr × bậc hiện tại + 14 ngày không
 * hiệu ứng, bậc về 0. Trong hẻm online, đổi biển phải cả hẻm đồng ý (vote — coop.ts installStanceVote
 * bọc hàm này khi ở hẻm). Không treo biển cũng là một lựa chọn hợp lệ (không lợi, không phạt).
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
      // L6 — Đổi hướng: trả tiền làm biển 5tr × bậc hiện tại; làm lại 14 ngày, bậc về 0 (SPEC §3.4).
      const tier = stanceTier(cur.fitDays ?? 0);
      const cost = STANCE_SWITCH_BASE_COST * tier;
      if (s.money < cost) {
        return s.notify(`🪧 Đổi biển sang hướng mới cần ${cost.toLocaleString('vi-VN')}đ (5tr × bậc ${tier}) — còn thiếu ${(cost - s.money).toLocaleString('vi-VN')}đ.`);
      }
      set({ money: s.money - cost, biz: { ...s.biz, stance: { id, since: day, fitDays: 0, missStreak: 0, switchUntil: day + 14 } } });
      s.notify(`🪧 Đổi biển sang hướng mới — bỏ ${cost.toLocaleString('vi-VN')}đ làm biển, 14 ngày chưa có hiệu ứng, bậc về 0.`);
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
