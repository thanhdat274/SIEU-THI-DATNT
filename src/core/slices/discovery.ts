/**
 * Sổ tay Tiệm (GĐ36) — ghi món đã bán và trao thưởng mốc thu thập.
 * Action duy nhất `recordDiscovery` là ghi sổ sách thuần (cộng dồn `soldEver`), chỉ thêm tiền/XP
 * khi vừa vượt một mốc chưa từng nhận (xem data/discovery.ts). Không đụng cân bằng kinh tế:
 * mốc thưởng rất nhỏ và chỉ xảy ra vài lần. Được gọi từ các điểm bán hàng đã có sẵn
 * (checkout / giao điện thoại / giao tiệc / giao hợp đồng / giao app) — không phải action người bấm.
 */
import { formatMoney } from '../../data/products';
import { discoveryReward, milestonesClaimed, nextMilestone, recordSold, soldCount } from '../../data/discovery';
import { masteryUps, masteryXp, SELL_MASTERY_LEVEL, SELL_MASTERY_NAMES } from '../../data/sellMastery';
import { productById } from '../../data/products';
import type { GameState, GetState, SetState } from '../gameTypes';

export const createDiscoverySlice = (set: SetState, get: GetState): Pick<GameState, 'recordDiscovery'> => ({
  /** Ghi các món vừa bán vào sổ "Sổ tay Tiệm"; tự thưởng mốc nhỏ khi vượt ngưỡng chưa nhận. */
  recordDiscovery: (ids) => {
    const s = get();
    const newEver = recordSold(s.soldEver, ids);
    if (newEver === s.soldEver) return; // không có món hợp lệ nào đổi — bỏ qua (không đẻ state mới)
    let masteryGain = 0; // GĐ1575 — XP lên bậc thông thạo
    if (s.level >= SELL_MASTERY_LEVEL) {
      for (const [id, tier] of masteryUps(s.soldEver, newEver)) {
        masteryGain += masteryXp(tier);
        s.notify(`${SELL_MASTERY_NAMES[tier - 1]} — tiệm đã thông thạo bán ${productById(id)?.name ?? id}! +${masteryXp(tier)} XP`);
      }
    }
    const count = soldCount(newEver);
    const claimed = s.biz.discoveryClaimed ?? [];
    const newly = milestonesClaimed(count, claimed);
    if (!newly.length) {
      set({ soldEver: newEver });
      if (masteryGain) get().addXp(masteryGain);
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
      // GĐ1194: thưởng mốc Sổ tay Tiệm (tới 500k ở mốc 100) là "thưởng" mà tổng kết ngày (Luật 10 —
      // đừng để thưởng lấn lãi bán thật) trước nay không thấy: cộng thẳng tiền mà bỏ lọt questIncome.
      // Chỉ ghi nhận — không đổi tiền/kinh tế/seed; recordDiscovery chạy trên máy chạy (LOCAL_ONLY) nên
      // chơi đơn/hẻm online giống nhau; trường tuỳ chọn `?? 0` an toàn save cũ.
      stats: { ...s.stats, questIncome: (s.stats.questIncome ?? 0) + reward.money },
    });
    get().addXp(reward.xp + masteryGain);
    const gain = newly.map((m) => { const r = discoveryReward(m); return `mốc ${m}: +${formatMoney(r.money)} +${r.xp} XP`; }).join(' · ');
    const next = nextMilestone(count, nextClaimed);
    if (s.day <= 1 && count < 25) return; // GĐ326: ngày đầu chỉ báo mốc lớn — thưởng vẫn cộng, bớt thông báo dồn
    get().notify(`🔍 Sổ tay Tiệm: đã bán được ${count} món! ${gain}.${next ? ` Còn ${next - count} món nữa tới mốc ${next}.` : ' Đã thu thập hết các mốc!'}`);
  },
});