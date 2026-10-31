import { useSession } from '../../net/session';
import { RIVAL_UNLOCK } from '../../data/biz';
import {
  nextBonus, prestigeEligible, prestigeRestart, PRESTIGE_MAX_LEVEL, PRESTIGE_MIN_LEVEL, PRESTIGE_MIN_REVENUE,
} from '../prestige';
import type { GameState, SetState, GetState } from '../gameTypes';

/** Tái sinh (NG+): action store — kiểm tra điều kiện rồi gọi prestigeRestart và ghi state mới. */
export const createPrestigeSlice = (set: SetState, get: GetState): Pick<GameState, 'doPrestige'> => ({
  doPrestige: () => {
    const s = get();
    // Đang ở hẻm online: tiến trình là của cả hẻm, không cho ai làm lệch vòng riêng (như resetGame)
    if (useSession.getState().coop) return s.notify('🌟 Tái sinh chỉ dùng ở chế độ chơi đơn, không dùng khi đang ở hẻm online.');
    const p = s.biz.prestige;
    if (p.level >= PRESTIGE_MAX_LEVEL) return s.notify('🌟 Đã tái sinh tối đa số lần, không thể thêm nữa.');
    if (!prestigeEligible(s.level, s.totals.revenue, p.level)) {
      return s.notify(`🌟 Chưa đủ điều kiện tái sinh (cần cấp ${PRESTIGE_MIN_LEVEL} + doanh thu cả đời ${PRESTIGE_MIN_REVENUE.toLocaleString('vi-VN')}đ).`);
    }
    const next = prestigeRestart(s);
    set(next);
    // Mở ngay danh hiệu NG+ tương ứng mức tái sinh vừa đạt (nếu chưa có) để người chơi thấy thưởng.
    get().checkTitles();
    s.notify(`🌟 Vòng mới! Bán đắt hơn +${Math.round(next.biz.prestige.bonus * 100)}%, rival quay lại từ cấp ${RIVAL_UNLOCK}.`);
  },
});
