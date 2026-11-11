import { adById } from '../../data/advertising';
import { formatMoney } from '../../data/products';
import type { GameState, GetState, SetState } from '../gameTypes';

/** GĐ2219 — Quảng cáo (tờ rơi/băng rôn/tiếng lành): chủ động bỏ tiền kéo khách N ngày.
 *  Mua chỉ mở từ cấp ≥42 (> golden L30), autoplay không tự bấm → sim/seed giữ nguyên. */
export const createAdsSlice = (set: SetState, get: GetState): Pick<GameState, 'ad' | 'buyAd'> => ({
  ad: undefined,
  buyAd: (id: string) => {
    const s = get();
    const def = adById(id);
    if (!def) return;
    if (s.level < def.unlock) return s.notify(`${def.icon} Mở ở cấp ${def.unlock}`);
    if (s.money < def.cost) return s.notify('Không đủ tiền quảng cáo!');
    set({
      ad: { defId: id, until: s.day + def.days },
      money: s.money - def.cost,
      stats: { ...s.stats, spent: s.stats.spent + def.cost },
      totals: { ...s.totals, spent: s.totals.spent + def.cost },
    });
    s.notify(`${def.icon} Đã phát ${def.name} (${formatMoney(def.cost)}), kéo khách tới ngày ${s.day + def.days}`);
  },
});
