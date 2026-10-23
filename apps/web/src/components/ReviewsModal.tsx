import React, { useState } from 'react';
import type { CustomerReview, ReviewResponse } from '@game/shared';
import { PRODUCT_MAP } from '@game/data';
import { feedbackReasonLabel, reviewSentimentSummary, isReviewComplaint, REVIEW_RESPONSE_DAILY_CAP, REVIEW_RESPONSE_MAX_AGE_DAYS, type ReviewSummary } from '@game/core';
import { PixelButton, PixelDialog } from './pixel';

export interface ReviewsModalProps {
  reviews: CustomerReview[];
  summary: ReviewSummary;
  responses: ReviewResponse[];
  /** Uy tín hiện tại (0..100) để hiển thị hiệu ứng phản hồi. */
  reputation: number;
  /** Ngày hiện tại để tính giới hạn phản hồi hằng ngày. */
  today: number;
  onRespond: (reviewId: string) => Promise<{ success: boolean; reason?: string } | null>;
  onClose: () => void;
}

type Sentiment = 'all' | 'praise' | 'complaint';

const FILTERS: Array<{ id: Sentiment; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'praise', label: 'Lời khen (4–5★)' },
  { id: 'complaint', label: 'Lời chê (1–2★, bỏ về)' },
];

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);
const clock = (r: CustomerReview) => `${String(r.hour).padStart(2, '0')}:${String(r.minute).padStart(2, '0')}`;

/** Ảnh hưởng uy tín của lời đánh giá bằng chữ (Mục 2 GĐ4): sentiment + tổng delta từ các lời đang giữ. */
function ReputationInfluence({ reviews }: { reviews: CustomerReview[] }) {
  const s = reviewSentimentSummary(reviews);
  if (s.count === 0) return null;
  const color = s.totalDelta > 0 ? 'var(--color-green-dark)' : s.totalDelta < 0 ? 'var(--color-brick)' : 'var(--color-wheat-dark)';
  const sign = s.totalDelta > 0 ? '+' : '';
  return (
    <div className="pixel-panel" style={{ padding: 8, display: 'grid', gap: 4, marginTop: 8, borderColor: 'var(--color-outline-soft)' }}>
      <strong style={{ fontSize: 12 }}>Ảnh hưởng uy tín</strong>
      <span style={{ fontSize: 12, color }}>Tổng ảnh hưởng gần đây: {sign}{s.totalDelta.toFixed(1)} điểm uy tín</span>
      <span className="muted" style={{ fontSize: 11 }}>{s.praise} lời khen · {s.complaints} lời chê{s.topReason ? ` · chủ yếu do ${feedbackReasonLabel(s.topReason.reason)}` : ''}</span>
    </div>
  );
}

/** Lời đánh giá bằng chữ của khách: tóm tắt điểm, lý do chê, lọc theo món, phản hồi lời chê. */
export const ReviewsModal: React.FC<ReviewsModalProps> = ({ reviews, summary, responses, reputation, today, onRespond, onClose }) => {
  const [sentiment, setSentiment] = useState<Sentiment>('all');
  const [dish, setDish] = useState<string>('all');
  const responded = new Set(responses.map(r => r.reviewId));
  const responseToday = responses.filter(r => r.day === today).length;
  const remainingToday = Math.max(0, REVIEW_RESPONSE_DAILY_CAP - responseToday);

  const dishOptions: Array<{ id: string; name: string }> = [];
  const seen = new Set<string>();
  for (const r of reviews) {
    if (r.productId && PRODUCT_MAP[r.productId] && !seen.has(r.productId)) {
      seen.add(r.productId);
      dishOptions.push({ id: r.productId, name: PRODUCT_MAP[r.productId].name });
    }
  }
  dishOptions.sort((a, b) => a.name.localeCompare(b.name, 'vi'));

  const shown = [...reviews]
    .reverse()
    .filter(r => (sentiment === 'all' || (sentiment === 'praise' ? r.stars >= 4 && !r.reason : r.stars <= 2 || !!r.reason)))
    .filter(r => dish === 'all' || r.productId === dish);
  const max = Math.max(1, ...summary.byStars);

  return (
    <PixelDialog icon="heart" title="Lời khách nhận xét" subtitle="Khách chấm sao và để lại vài lời sau mỗi lượt ghé tiệm" onClose={onClose}>
      {summary.count === 0 ? (
        <p className="muted">Chưa có lời nhận xét nào. Khách sẽ để lại lời sau khi mua xong hoặc bỏ về.</p>
      ) : (
        <>
          <div className="pixel-panel" style={{ padding: 8, display: 'grid', gap: 4, marginBottom: 8 }}>
            <strong>{summary.average.toFixed(1)} ★ <span className="muted">· {summary.count} lời gần nhất</span></strong>
            {[5, 4, 3, 2, 1].map((n) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <span style={{ width: 22 }}>{n}★</span>
                <div style={{ flex: 1, height: 6, background: 'var(--color-panel-dark)', border: '1px solid var(--color-outline-soft)' }}>
                  <div style={{ width: `${(summary.byStars[n - 1] / max) * 100}%`, height: '100%', background: n >= 4 ? 'var(--color-green)' : n === 3 ? 'var(--color-wheat)' : 'var(--color-brick)' }} />
                </div>
                <span style={{ width: 20, textAlign: 'right', color: 'var(--color-text)' }}>{summary.byStars[n - 1]}</span>
              </div>
            ))}
            {summary.topReason && (
              <span className="muted" style={{ fontSize: 11 }}>Khách bỏ về nhiều nhất vì: {feedbackReasonLabel(summary.topReason.reason)} ({summary.topReason.count} lần)</span>
            )}
            <ReputationInfluence reviews={reviews} />
            <div style={{ fontSize: 11, display: 'grid', gap: 2 }}>
              <span>Uy tín hiện tại: <strong>{reputation.toFixed(0)} / 100</strong></span>
              <span className="muted">Phản hồi lời chê hôm nay: {responseToday}/{REVIEW_RESPONSE_DAILY_CAP}{remainingToday > 0 ? ` (còn ${remainingToday} lượt)` : ' — đã hết lượt, mai quay lại'}</span>
            </div>
          </div>
          <div className="feature-scroll-tabs" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {FILTERS.map((f) => (
              <PixelButton key={f.id} aria-pressed={sentiment === f.id} variant={sentiment === f.id ? 'teal' : 'paper'} onClick={() => setSentiment(f.id)}>{f.label}</PixelButton>
            ))}
          </div>
          {dishOptions.length > 0 && (
            <label style={{ display: 'grid', gap: 4, marginBottom: 8, fontSize: 11 }}>
              <span className="muted">Lọc theo món</span>
              <select value={dish} onChange={(e) => setDish(e.target.value)} aria-label="Lọc lời đánh giá theo món">
                <option value="all">Tất cả món</option>
                {dishOptions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
          )}
          {shown.length === 0 && <p className="muted">Không có lời nào trong mục này.</p>}
          <div style={{ display: 'grid', gap: 8 }}>
            {shown.map((r) => {
              const complaint = isReviewComplaint(r);
              const done = responded.has(r.id);
              const expired = complaint && !done && today - r.day > REVIEW_RESPONSE_MAX_AGE_DAYS;
              const canRespond = complaint && !done && !expired && remainingToday > 0;
              return (
                <article key={r.id} className="pixel-panel" style={{ padding: 8, display: 'grid', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <strong>{r.author}{r.regularId ? ' ♥' : ''}</strong>
                    <span style={{ color: r.stars >= 4 ? 'var(--color-green-dark)' : r.stars === 3 ? 'var(--color-wheat-dark)' : 'var(--color-brick)' }} aria-label={`${r.stars} sao`}>{stars(r.stars)}</span>
                  </div>
                  <p style={{ margin: 0 }}>“{r.text}”</p>
                  <div className="muted" style={{ fontSize: 10 }}>
                    Ngày {r.day} · {clock(r)}
                    {r.reason ? ` · bỏ về: ${feedbackReasonLabel(r.reason)}` : ''}
                    {r.productId && PRODUCT_MAP[r.productId] ? ` · ${PRODUCT_MAP[r.productId].name}` : ''}
                  </div>
                  {complaint && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {done ? (
                        <span style={{ fontSize: 11, color: 'var(--color-green-dark)' }}>✓ Đã phản hồi</span>
                      ) : canRespond ? (
                        <PixelButton aria-label="Phản hồi lời chê" variant="teal" onClick={() => onRespond(r.id)}>Phản hồi lời chê</PixelButton>
                      ) : expired ? (
                        <span className="muted" style={{ fontSize: 11 }} title="Lời chê đã quá 3 ngày, không phản hồi được nữa.">🔒 Lời chê đã quá 3 ngày, không phản hồi được nữa.</span>
                      ) : (
                        <span className="muted" style={{ fontSize: 11 }}>{remainingToday === 0 ? 'Đã hết lượt phản hồi hôm nay' : 'Lời khen không cần phản hồi'}</span>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </PixelDialog>
  );
};
