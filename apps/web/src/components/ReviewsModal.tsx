import React, { useState } from 'react';
import type { CustomerReview } from '@game/shared';
import { PRODUCT_MAP } from '@game/data';
import { feedbackReasonLabel, type ReviewSummary } from '@game/core';
import { PixelButton, PixelDialog } from './pixel';

export interface ReviewsModalProps {
  reviews: CustomerReview[];
  summary: ReviewSummary;
  onClose: () => void;
}

type Filter = 'all' | 'praise' | 'complaint';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'praise', label: 'Lời khen (4–5★)' },
  { id: 'complaint', label: 'Lời chê (1–2★, bỏ về)' },
];

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);
const clock = (r: CustomerReview) => `${String(r.hour).padStart(2, '0')}:${String(r.minute).padStart(2, '0')}`;

/** Lời đánh giá bằng chữ của khách: tóm tắt điểm, lý do chê nhiều nhất và danh sách mới nhất trước. */
export const ReviewsModal: React.FC<ReviewsModalProps> = ({ reviews, summary, onClose }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const shown = [...reviews]
    .reverse()
    .filter((r) => filter === 'all' || (filter === 'praise' ? r.stars >= 4 && !r.reason : r.stars <= 2 || !!r.reason));
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
          </div>
          <div className="feature-scroll-tabs" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {FILTERS.map((f) => (
              <PixelButton key={f.id} aria-pressed={filter === f.id} variant={filter === f.id ? 'teal' : 'paper'} onClick={() => setFilter(f.id)}>{f.label}</PixelButton>
            ))}
          </div>
          {shown.length === 0 && <p className="muted">Không có lời nào trong mục này.</p>}
          <div style={{ display: 'grid', gap: 8 }}>
            {shown.map((r) => (
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
              </article>
            ))}
          </div>
        </>
      )}
    </PixelDialog>
  );
};
