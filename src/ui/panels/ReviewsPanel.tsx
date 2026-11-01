import { useState } from 'react';
import { useGame, formatClock } from '../../core/store';
import { productById } from '../../data/products';
import { productSummary, REASON_LABEL, summarizeReviews, type Review } from '../../data/reviews';
import { stars, starColor, Footer, styles, Tabs } from './shared';
import { ReputationCard } from './ReportPanels';

/** Lời khách nhận xét: điểm trung bình, biểu đồ số sao, lọc khen/chê. */
export function ReviewsPanel() {
  const { reviews, closePanel, repLog } = useGame();
  const [filter, setFilter] = useState<'all' | 'good' | 'bad'>('all');
  const [showAll, setShowAll] = useState(false);
  const sum = summarizeReviews(reviews);
  const perProduct = productSummary(reviews);
  const max = Math.max(1, ...sum.byStars);
  const isBad = (r: Review) => r.stars <= 2 || !!r.reason;
  const shown = [...reviews].reverse().filter((r) => filter === 'all' || (filter === 'bad') === isBad(r));
  const filters = [['all', 'Tất cả'], ['good', 'Lời khen'], ['bad', 'Lời chê']] as const;
  return (
    <>
      <h2 style={styles.title}>💬 Danh tiếng & nhận xét</h2>
      <ReputationCard log={repLog} />
      <p style={styles.sub}>Khoảng một nửa số khách để lại vài lời khi về. Điểm cao thì người đi đường ghé tiệm nhiều hơn.</p>
      {sum.count === 0 ? (
        <p style={styles.sub}>Chưa có lời nào. Mở cửa tiệm và bán hàng để khách nhận xét.</p>
      ) : (
        <>
          <div style={{ ...styles.card, gap: 20, marginBottom: 10 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 34, fontWeight: 700 }}>{sum.average.toFixed(1)}</div>
              <div style={{ color: starColor(Math.round(sum.average)) }}>{stars(Math.round(sum.average))}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{sum.count} lời gần nhất</div>
            </div>
            <div style={{ flex: 1, display: 'grid', gap: 3, fontSize: 12 }}>
              {[5, 4, 3, 2, 1].map((n) => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 20 }}>{n}★</span>
                  <div style={{ flex: 1, height: 6, background: '#555', borderRadius: 3 }}>
                    <div style={{ width: `${(sum.byStars[n - 1] / max) * 100}%`, height: '100%', borderRadius: 3, background: starColor(n) }} />
                  </div>
                  <span style={{ width: 20, textAlign: 'right' }}>{sum.byStars[n - 1]}</span>
                </div>
              ))}
              {sum.topReason && (
                <span style={{ opacity: 0.75 }}>Bị chê nhiều nhất: {REASON_LABEL[sum.topReason.reason]} ({sum.topReason.count} lần)</span>
              )}
            </div>
          </div>
          {/* Theo từng món: món nào đang bị chê thì nhập/bày/điều giá liền, món được khen thì giữ chất lượng */}
          {(perProduct.worst.length > 0 || perProduct.best.length > 0) && (
            <div style={{ ...styles.card, marginBottom: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <b style={{ color: '#ff7675' }}>👎 Bị chê nhiều nhất</b>
                {perProduct.worst.map((p) => (
                  <div key={p.productId} style={{ fontSize: 12, marginTop: 4 }}>
                    {productById(p.productId).name}: {p.complaint} lần
                  </div>
                ))}
                {perProduct.worst.length === 0 && <div style={styles.sub}>Chưa có món nào bị chê</div>}
              </div>
              <div>
                <b style={{ color: '#55efc4' }}>👍 Được khen nhiều nhất</b>
                {perProduct.best.map((p) => (
                  <div key={p.productId} style={{ fontSize: 12, marginTop: 4 }}>
                    {productById(p.productId).name}: {p.praise} lần
                  </div>
                ))}
                {perProduct.best.length === 0 && <div style={styles.sub}>Chưa có lời khen món nào</div>}
              </div>
            </div>
          )}
          <Tabs tabs={filters} value={filter} onChange={setFilter} />
          <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
            {/* Mặc định chỉ hiện 12 đánh giá gần nhất: sổ đánh giá ngày 60+ dài ~7.000px trên điện thoại */}
            {(showAll ? shown : shown.slice(0, 12)).map((r) => (
              <div key={r.id} style={{ ...styles.card, display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <b>{r.author}</b>
                  <span style={{ color: starColor(r.stars) }}>{stars(r.stars)}</span>
                </div>
                <div style={{ margin: '4px 0' }}>“{r.text}”</div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>
                  Ngày {r.day}, {formatClock(r.minute)}
                  {r.reason ? ` · chê ${REASON_LABEL[r.reason]}` : ''}
                  {r.productId ? ` · ${productById(r.productId).name}` : ''}
                </div>
              </div>
            ))}
            {shown.length === 0 && <p style={styles.sub}>Không có lời nào trong mục này.</p>}
            {!showAll && shown.length > 12 && (
              <button style={{ ...styles.btn, marginLeft: 0 }} onClick={() => setShowAll(true)}>
                Xem thêm {shown.length - 12} đánh giá cũ hơn
              </button>
            )}
            {showAll && shown.length > 12 && (
              <button style={{ ...styles.btn, marginLeft: 0 }} onClick={() => setShowAll(false)}>
                Thu gọn — chỉ hiện 12 đánh giá gần nhất
              </button>
            )}
          </div>
        </>
      )}
      <Footer onClose={closePanel} />
    </>
  );
}
