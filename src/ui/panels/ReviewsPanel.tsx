import { useState } from 'react';
import { useGame, formatClock } from '../../core/store';
import { productById } from '../../data/products';
import { productSummary, REASON_LABEL, summarizeReviews, starRuleText, type Review } from '../../data/reviews';
import { stars, starColor, Footer, styles, Tabs } from './shared';
import { ReputationCard } from './HistoryPanel';
import { t } from '../../core/i18n';

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
  const filters = [['all', t('panels_people.tat_ca')], ['good', t('panels_people.loi_khen')], ['bad', t('panels_people.loi_che')]] as const;
  return (
    <>
      <h2 style={styles.title}>💬 Danh tiếng & nhận xét</h2>
      <ReputationCard log={repLog} />
      <p style={styles.sub}>{t('panels_people.khoang_mot_nua_so_khach_de')}</p>
      {sum.count === 0 ? (
        <p style={styles.sub}>{t('panels_people.chua_co_loi_nao_mo_cua')}</p>
      ) : (
        <>
          <div style={{ ...styles.card, gap: 20, marginBottom: 10 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 34, fontWeight: 700 }}>{sum.average.toFixed(1)}</div>
              <div style={{ color: starColor(Math.round(sum.average)) }}>{stars(Math.round(sum.average))}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{sum.count}{' '}{t('panels_people.loi_gan_nhat')}</div>
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
                <span style={{ opacity: 0.75 }}>{t('panels_people.bi_che_nhieu_nhat')}{' '}{REASON_LABEL[sum.topReason.reason]} ({sum.topReason.count}{' '}{t('panels_people.lan')}</span>
              )}
              <span style={{ opacity: 0.6, marginTop: 2, fontSize: 11 }}>{starRuleText()}</span>
            </div>
          </div>
          {/* Theo từng món: món nào đang bị chê thì nhập/bày/điều giá liền, món được khen thì giữ chất lượng */}
          {(perProduct.worst.length > 0 || perProduct.best.length > 0) && (
            <div style={{ ...styles.card, marginBottom: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <b style={{ color: '#ff7675' }}>{t('panels_people.bi_che_nhieu_nhat_2')}</b>
                {perProduct.worst.map((p) => (
                  <div key={p.productId} style={{ fontSize: 12, marginTop: 4 }}>
                    {productById(p.productId).name}: {p.complaint}{' '}{t('panels_people.lan_2')}
                  </div>
                ))}
                {perProduct.worst.length === 0 && <div style={styles.sub}>{t('panels_people.chua_co_mon_nao_bi_che')}</div>}
              </div>
              <div>
                <b style={{ color: '#55efc4' }}>{t('panels_people.duoc_khen_nhieu_nhat')}</b>
                {perProduct.best.map((p) => (
                  <div key={p.productId} style={{ fontSize: 12, marginTop: 4 }}>
                    {productById(p.productId).name}: {p.praise}{' '}{t('panels_people.lan_2')}
                  </div>
                ))}
                {perProduct.best.length === 0 && <div style={styles.sub}>{t('panels_people.chua_co_loi_khen_mon_nao')}</div>}
              </div>
            </div>
          )}
          <Tabs tabs={filters} value={filter} onChange={setFilter} />
          <div style={{ display: 'grid', gap: 6 }}>
            {/* Mặc định chỉ hiện 12 đánh giá gần nhất: sổ đánh giá ngày 60+ dài ~7.000px trên điện thoại */}
            {(showAll ? shown : shown.slice(0, 12)).map((r) => (
              <div key={r.id} style={{ ...styles.card, display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <b>{r.author}</b>
                  <span style={{ color: starColor(r.stars) }}>{stars(r.stars)}</span>
                </div>
                <div style={{ margin: '4px 0' }}>“{r.text}”</div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>
                  {t('panels_people.ngay_3')}{' '}{r.day}, {formatClock(r.minute)}
                  {r.reason ? t('panels_people.che', { v0: REASON_LABEL[r.reason] }) : ''}
                  {r.productId ? ` · ${productById(r.productId).name}` : ''}
                </div>
              </div>
            ))}
            {shown.length === 0 && <p style={styles.sub}>{t('panels_people.khong_co_loi_nao_trong_muc')}</p>}
            {!showAll && shown.length > 12 && (
              <button style={{ ...styles.btn, marginLeft: 0 }} onClick={() => setShowAll(true)}>
                {t('panels_people.xem_them')}{' '}{shown.length - 12}{' '}{t('panels_people.danh_gia_cu_hon')}
              </button>
            )}
            {showAll && shown.length > 12 && (
              <button style={{ ...styles.btn, marginLeft: 0 }} onClick={() => setShowAll(false)}>
                {t('panels_people.thu_gon_chi_hien_12_danh')}
              </button>
            )}
          </div>
        </>
      )}
      <Footer onClose={closePanel} />
    </>
  );
}
