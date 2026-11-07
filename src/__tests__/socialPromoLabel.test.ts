import { describe, expect, it } from 'vitest';
import { promoLabel } from '../ui/panels/SocialPanel';
import { PROMO_MIN_FOLLOWERS, SOCIAL_UNLOCK } from '../data/social';

// GĐ1646 — nút "Đăng bài" khi bị khóa nêu lý do.
describe('GĐ1646 — nhãn nút quảng bá', () => {
  it('dưới cấp mở → nêu cấp; thiếu người theo dõi → nêu số; đủ → Đăng bài', () => {
    expect(promoLabel(SOCIAL_UNLOCK - 1, 999)).toBe(`🔒 Cấp ${SOCIAL_UNLOCK}`);
    expect(promoLabel(SOCIAL_UNLOCK, PROMO_MIN_FOLLOWERS - 1)).toBe(`Cần ${PROMO_MIN_FOLLOWERS} theo dõi`);
    expect(promoLabel(SOCIAL_UNLOCK, PROMO_MIN_FOLLOWERS)).toBe('📣 Đăng bài');
  });
});
