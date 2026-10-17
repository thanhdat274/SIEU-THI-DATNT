import assert from 'node:assert/strict';
import type { CustomerReview } from '@game/shared';
import {
  reviewReputationContribution,
  reviewReputationDrift,
  reviewSentimentSummary,
  REVIEW_DRIFT_CAP,
} from './review-reputation';

const rev = (o: Partial<CustomerReview> & Pick<CustomerReview, 'day'>): CustomerReview => ({
  id: `rev-${o.day}-x`,
  day: o.day,
  hour: 10,
  minute: 0,
  stars: o.stars ?? 5,
  author: 'Khách A',
  text: 'Lời đánh giá',
  ...(o.reason ? { reason: o.reason } : {}),
});

export function runReviewReputationTests(): void {
  console.log('\n--- Lời đánh giá bằng chữ ảnh hưởng uy tín ---');

  // 1. Contribution theo lý do: chê có lý do là tín hiệu mạnh nhất, âm.
  assert.equal(reviewReputationContribution(rev({ day: 1, stars: 2, reason: 'out_of_stock' })), -0.6, 'hết hàng trừ sâu');
  assert.equal(reviewReputationContribution(rev({ day: 1, stars: 2, reason: 'unreachable' })), -0.6);
  assert.equal(reviewReputationContribution(rev({ day: 1, stars: 2, reason: 'wait' })), -0.5);
  assert.equal(reviewReputationContribution(rev({ day: 1, stars: 2, reason: 'price' })), -0.5);
  assert.equal(reviewReputationContribution(rev({ day: 1, stars: 3, reason: 'store_closed' })), -0.5);

  // 2. Khen / chê không lý do / trung tính.
  assert.equal(reviewReputationContribution(rev({ day: 1, stars: 5 })), 0.2, 'khen cộng nhẹ');
  assert.equal(reviewReputationContribution(rev({ day: 1, stars: 4 })), 0.2);
  assert.equal(reviewReputationContribution(rev({ day: 1, stars: 2 })), -0.2, 'chê sao thấp không lý do nhẹ hơn');
  assert.equal(reviewReputationContribution(rev({ day: 1, stars: 3 })), 0, 'sao trung tính không ảnh hưởng');

  // 3. Deterministic: cùng đầu vào cho cùng kết quả (không RNG).
  const double = [rev({ day: 1, stars: 5 }), rev({ day: 1, stars: 2, reason: 'price' })];
  assert.deepEqual(double.map(reviewReputationContribution), double.map(reviewReputationContribution), 'xác định');

  // 4. Drift cửa sổ: chỉ lời trong cửa sổ được tính; kẹp ngưỡng.
  assert.equal(reviewReputationDrift([rev({ day: 10, stars: 5 })], 10), 0.2);
  const outOfWindow = [rev({ day: 1, stars: 5 })];
  assert.equal(reviewReputationDrift(outOfWindow, 10), 0, 'lời ngoài cửa sổ (ngày 1, hôm nay 10, window 7) không tính');
  // 100 lời chê vượt ngưỡng -> kẹp.
  const many = Array.from({ length: 100 }, (_, i) => rev({ day: 5, stars: 2, reason: 'wait' }));
  assert.equal(reviewReputationDrift(many, 10), -REVIEW_DRIFT_CAP, 'kẹp drift về ngưỡng');

  // 5. Sentiment summary: đếm khen/chê, tổng delta, lý do nhiều nhất.
  const s = reviewSentimentSummary([
    rev({ day: 1, stars: 5 }),
    rev({ day: 1, stars: 5 }),
    rev({ day: 1, stars: 2, reason: 'wait' }),
    rev({ day: 1, stars: 1, reason: 'out_of_stock' }),
    rev({ day: 1, stars: 2, reason: 'wait' }),
  ]);
  assert.equal(s.count, 5);
  assert.equal(s.praise, 2);
  assert.equal(s.complaints, 3, 'chê gồm lời có lý do (3)');
  assert.ok(Math.abs(s.totalDelta - (0.2 + 0.2 - 0.5 - 0.6 - 0.5)) < 1e-9, `tổng delta đúng (${s.totalDelta})`);
  assert.equal(s.topReason?.reason, 'wait', 'lý do xuất hiện nhiều nhất: đợi lâu (2 lần)');
  assert.equal(s.topReason?.count, 2);

  // 6. Save tương thích: contribution không phụ thuộc trường mới, save cũ chỉ có reviews đều tính được.
  const oldReview = { id: 'a', day: 3, hour: 8, minute: 0, stars: 2, author: 'A', text: 'Hết hàng' } as CustomerReview;
  assert.equal(reviewReputationContribution({ reason: undefined, stars: 2 }), -0.2, 'lời cũ không lý do vẫn tính theo sao');
  void oldReview;
}
