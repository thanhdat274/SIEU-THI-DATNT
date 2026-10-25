import { formatMoney } from '../../data/products';
import { apologize, APOLOGY_COST, promote, promoBoost, PROMO_MIN_FOLLOWERS, SOCIAL_UNLOCK } from '../../data/social';
import type { GameState, GetState, SetState } from '../gameTypes';

/** Mạng xã hội: xin lỗi khi khủng hoảng, đăng bài quảng bá (bài khách đăng chạy ở cuối ngày). */

export const createSocialSlice = (set: SetState, get: GetState): Pick<GameState, 'apologize' | 'promoteShop'> => ({
  apologize: () => {
    const s = get();
    if (s.money < APOLOGY_COST) return s.notify('Không đủ tiền làm phiếu giảm giá xin lỗi khách!');
    const social = apologize(s.social, s.day);
    if (!social) return s.notify('Không có khủng hoảng nào cần xin lỗi');
    set({ social, money: s.money - APOLOGY_COST, stats: { ...s.stats, spent: s.stats.spent + APOLOGY_COST } });
    s.notify(`🙏 Đã đăng bài xin lỗi kèm phiếu giảm giá (${formatMoney(APOLOGY_COST)}): khách dần quay lại`);
  },
  promoteShop: () => {
    const s = get();
    if (s.level < SOCIAL_UNLOCK) return s.notify(`Trang mạng xã hội mở ở cấp ${SOCIAL_UNLOCK}`);
    const social = promote(s.social, s.day, s.shopName);
    if (!social) {
      return s.notify(s.social.promoDay === s.day
        ? 'Hôm nay đã đăng bài rồi, đăng nhiều quá người ta bỏ theo dõi đó!'
        : `Cần ít nhất ${PROMO_MIN_FOLLOWERS} người theo dõi mới đăng quảng bá được — bán tốt để khách khen trên mạng`);
    }
    set({ social });
    s.notify(`📣 Đã đăng bài quảng bá: hôm nay thêm ~${Math.round(promoBoost(social.followers) * 100)}% khách ghé`);
  },
});
