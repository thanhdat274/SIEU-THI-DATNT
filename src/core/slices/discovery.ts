/**
 * Sổ tay Tiệm (GĐ36) — ghi món đã bán và trao thưởng mốc thu thập.
 * Action duy nhất `recordDiscovery` là ghi sổ sách thuần (cộng dồn `soldEver`), chỉ thêm tiền/XP
 * khi vừa vượt một mốc chưa từng nhận (xem data/discovery.ts). Không đụng cân bằng kinh tế:
 * mốc thưởng rất nhỏ và chỉ xảy ra vài lần. Được gọi từ các điểm bán hàng đã có sẵn
 * (checkout / giao điện thoại / giao tiệc / giao hợp đồng / giao app) — không phải action người bấm.
 */
import { formatMoney } from '../../data/products';
import { discoveryReward, milestonesClaimed, nextMilestone, recordSold, soldCount } from '../../data/discovery';
import type { GameState, GetState, SetState } from '../gameTypes';

export const createDiscoverySlice = (set: SetState, get: GetState): Pick<GameState, 'recordDiscovery'> => ({
  /** Ghi các món vừa bán vào sổ "Sổ tay Tiệm"; tự thưởng mốc nhỏ khi vượt ngưỡng chưa nhận. */
  recordDiscovery: (ids) => {
    const s = get();
    const newEver = recordSold(s.soldEver, ids);
    if (newEver === s.soldEver) return; // không có món hợp lệ nào đổi — bỏ qua (không đẻ state mới)
    const count = soldCount(newEver);
    const claimed = s.biz.discoveryClaimed ?? [];
    const newly = milestonesClaimed(count, claimed);
    if (!newly.length) {
      set({ soldEver: newEver });
      return;
    }
    const reward = newly.reduce(
      (sum, m) => { const r = discoveryReward(m); return { money: sum.money + r.money, xp: sum.xp + r.xp }; },
      { money: 0, xp: 0 },
    );
    const nextClaimed = [...claimed, ...newly].sort((a, b) => a - b);
    set({
      soldEver: newEver,
      biz: { ...s.biz, discoveryClaimed: nextClaimed },
      money: s.money + reward.money,
    });
    get().addXp(reward.xp);
    const gain = newly.map((m) => { const r = discoveryReward(m); return `mốc ${m}: +${formatMoney(r.money)} +${r.xp} XP`; }).join(' · ');
    const next = nextMilestone(count, nextClaimed);
    get().notify(`🔍 Sổ tay Tiệm: đã bán được ${count} món! ${gain}.${next ? ` Còn ${next - count} món nữa tới mốc ${next}.` : ' Đã thu thập hết các mốc!'}`);
  },
});