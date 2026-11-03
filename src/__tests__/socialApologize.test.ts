import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { APOLOGY_COST, APOLOGY_MUL, type SocialState } from '../data/social';

/**
 * Bộ test GĐ1028 — lời xin lỗi mạng xã hội `core/slices/social.apologize` (dòng 9–15 TRƯỚC ĐÂY 0%).
 *
 * Hợp đồng (đối chiếu `data/social.apologize`):
 * - Không đủ tiền (money < APOLOGY_COST): báo lỗi, KHÔNG đổi gì.
 * - Không có khủng hoảng đang cần xin lỗi (buzz null / hype / đã responded / quá hạn): báo, KHÔNG trừ tiền.
 * - Đang khủng hoảng: trừ APOLOGY_COST, followers +15, buzz dịu xuống APOLOGY_MUL + đánh dấu responded,
 *   ghi stats.spent + APOLOGY_COST và stats.socialPosts +1.
 */

const CRISIS: SocialState = {
  followers: 60,
  posts: [],
  buzz: { kind: 'crisis', postId: 1, until: 10, mul: 0.72 },
  promoDay: 0,
};

const setState = (money: number, social: SocialState) =>
  useGame.setState({ ...newGameData(), day: 10, money, social });

beforeEach(() => useGame.setState({ ...newGameData(), day: 10 }));

describe('apologize — xin lỗi khi khủng hoảng', () => {
  it('không đủ tiền (money < APOLOGY_COST) → báo lỗi, không đổi gì', () => {
    setState(APOLOGY_COST - 1, CRISIS);
    const before = useGame.getState();
    before.apologize();
    const after = useGame.getState();
    expect(after.money).toBe(APOLOGY_COST - 1);
    expect(after.social).toEqual(before.social);
    expect(after.message).toContain('Không đủ tiền');
  });

  it('chưa có khủng hoảng (buzz null) → báo, không trừ tiền', () => {
    setState(500_000, { ...CRISIS, buzz: null });
    useGame.getState().apologize();
    const after = useGame.getState();
    expect(after.money).toBe(500_000);
    expect(after.social.buzz).toBeNull();
    expect(after.message).toContain('Không có khủng hoảng nào cần xin lỗi');
  });

  it('đang có tin tốt lan truyền (hype) thì không phải xin lỗi', () => {
    setState(500_000, { ...CRISIS, buzz: { kind: 'hype', postId: 2, until: 10, mul: 1.25 } });
    useGame.getState().apologize();
    const after = useGame.getState();
    expect(after.money).toBe(500_000);
    expect(after.message).toContain('Không có khủng hoảng nào cần xin lỗi');
  });

  it('khủng hoảng ĐÃ xin lỗi rồi (responded) → không xin lỗi lần nữa', () => {
    setState(500_000, { ...CRISIS, buzz: { kind: 'crisis', postId: 1, until: 10, mul: 0.72, responded: true } });
    const before = useGame.getState();
    before.apologize();
    const after = useGame.getState();
    expect(after.money).toBe(500_000);
    expect(after.social).toEqual(before.social);
    expect(after.message).toContain('Không có khủng hoảng nào cần xin lỗi');
  });

  it('thành công: trừ APOLOGY_COST, +15 người theo dõi, buzz dịu xuống APOLOGY_MUL + responded, ghi stats', () => {
    setState(500_000, CRISIS);
    const s = useGame.getState();
    const spentBefore = s.stats.spent;
    const postsBefore = s.stats.socialPosts ?? 0;
    s.apologize();
    const after = useGame.getState();
    expect(after.money).toBe(500_000 - APOLOGY_COST);
    expect(after.social.followers).toBe(60 + 15);
    expect(after.social.buzz!.kind).toBe('crisis');
    expect(after.social.buzz!.mul).toBe(APOLOGY_MUL);
    expect(after.social.buzz!.responded).toBe(true);
    expect(after.stats.spent).toBe(spentBefore + APOLOGY_COST);
    expect(after.stats.socialPosts ?? 0).toBe(postsBefore + 1);
    expect(after.message).toContain('Đã đăng bài xin lỗi');
  });
});
