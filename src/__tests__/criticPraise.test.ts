import { describe, it, expect } from 'vitest';
import { criticPraiseReviews, CRITIC_PENALTY_REVIEWS } from '../data/critic';

describe('GĐ1545 — nhà phê bình lên sóng', () => {
  it('giai đoạn nghiêm ngặt: số 5★ bằng số 1★ phạt; giai đoạn nhẹ: không thêm', () => {
    expect(criticPraiseReviews(true)).toBe(CRITIC_PENALTY_REVIEWS);
    expect(criticPraiseReviews(false)).toBe(0);
  });
});
