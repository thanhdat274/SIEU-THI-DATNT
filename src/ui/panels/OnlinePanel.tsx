import { trendMark } from '../trendMark';
import { formatClock, useClock, useGame } from '../../core/store';
import {
  ACCEPT_WINDOW, appCommission, APP_TIERS, appTier, appRating, declineRating, describeOnline, eventGapMul, eventGrabMul, grabFee, ONLINE_HOURS, ONLINE_OPEN_COST, ONLINE_UNLOCK, onlineOrderCap, onlineEventLine,
  orderAssessment, orderGap, orderRateTone, ratingImpact,
} from '../../data/online';
import { formatMoney } from '../../data/products';
import { blockedLabel, shortLabel } from '../shortLabel';
import { onlineNet } from '../../data/onlineNet';
import { onlineRatingValue, RATING_FLOOR, RATING_TARGET } from '../../data/onlineRatingValue';
import { Footer, styles, Callout } from './shared';
import { t } from '../../core/i18n';

export function OnlinePanel() {
  const { online, level, money, staff, storage, priceOf, openOnline, toggleOnline, acceptOnline, declineOnline, closePanel, stats } = useGame();
  const minutes = useClock((c) => Math.floor(c.minutes));
  const registered = online.open || online.done > 0 || online.ratingCount > 0;
  const couriers = staff.filter((st) => st.role === 'courier').sort((a, b) => b.skill - a.skill);
  const busyOwn = online.orders.filter((o) => o.status === 'shipping' && o.via === 'own').length;
  const freeCourier = couriers[busyOwn];
  const rating = appRating(online);
  const tier = appTier(online.done);
  const nextTier = APP_TIERS.find((t) => t.at > online.done) ?? null;
  const evGap = eventGapMul(online.event);
  const evGrab = eventGrabMul(online.event);
  return (
    <>
      <h2 style={styles.title}>{t('panels_people.ban_online')}</h2>
      <p style={styles.sub}>
        {t('panels_people.don_tu_khap_quan_dat_qua')}
      </p>
      {!registered ? (
        <div style={styles.card}>
          <span style={{ flex: 1, fontSize: 13 }}>{t('panels_people.mo_gian_hang_tren_app')}{' '}{formatMoney(ONLINE_OPEN_COST)}{' '}{t('panels_people.tra_mot_lan')}{level < ONLINE_UNLOCK && t('panels_people.can_cap', { ONLINE_UNLOCK })}</span>
          <button style={{ ...styles.btn, background: '#f1c40f' }} disabled={level < ONLINE_UNLOCK || money < ONLINE_OPEN_COST} onClick={openOnline}>{level < ONLINE_UNLOCK ? t('panels_people.mo_gian_hang') : shortLabel(t('panels_people.mo_gian_hang'), ONLINE_OPEN_COST, money)}</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: 8, marginBottom: 10 }}>
            <div style={{ ...styles.card, display: 'block' }}><small style={{ opacity: 0.7 }}>{t('panels_people.diem_app')}</small><div><b>{rating.toFixed(1)}</b> <small>({online.ratingCount})</small></div></div>
            <div style={{ ...styles.card, display: 'block' }}><small style={{ opacity: 0.7 }}>{t('panels_people.da_giao')}</small><div><b>{online.done}</b> <small>{t('panels_people.tre')}{' '}{online.late}</small></div></div>
            <div style={{ ...styles.card, display: 'block' }}><small style={{ opacity: 0.7 }}>{t('panels_people.hom_nay')}</small><div><b>{formatMoney(online.revenueToday)}</b></div>{!!online.grabFeesToday && <small>Grab -{formatMoney(online.grabFeesToday)}</small>}</div>
          </div>
          {(stats.onlineMissedCount ?? 0) > 0 && (
            <div style={{ ...styles.card, display: 'block', marginBottom: 10, fontSize: 12, color: '#e67e22' }}>
              {t('panels_people.hom_nay_da_bo_lo')}{' '}<b>{stats.onlineMissedCount}</b>{' '}{t('panels_people.don_app')}{' '}{formatMoney(stats.onlineMissed ?? 0)}{t('panels_people.vi_khong_nhan_kip_tu_choi')}
            </div>
          )}
          {(() => {
            const on = onlineNet(online);
            if (on.revenue <= 0) return null;
            const line = on.verdict === 'low'
              ? { tone: 'danger' as const, t: t('panels_people.don_app_hom_nay_dang_lo', { v0: formatMoney(-on.net) }) }
              : on.verdict === 'warn'
                ? { tone: 'warn' as const, t: t('panels_people.phi_grab_dang_ngon_doanh_thu', { v0: Math.round(on.grabShare * 100), v1: formatMoney(on.savingsIfOwn) }) }
                : { tone: 'ok' as const, t: t('panels_people.loi_rong_ngay_sau_phi_giao', { v0: formatMoney(on.net) }) };
            return (
              <Callout tone={line.tone} style={{ marginBottom: 10 }} title={`📲 Online hôm nay: lời ròng ${formatMoney(on.net)}${on.grabFees > 0 ? ` (Grab −${formatMoney(on.grabFees)})` : ''}`}>
                <div style={{ marginTop: 2, fontSize: 12 }}>{line.t}</div>
              </Callout>
            );
          })()}
          {(() => {
            const rv = onlineRatingValue({
              rating, level,
              revenueToday: online.revenueToday, done: online.done, grabFeesToday: online.grabFeesToday,
            });
            if (rv.verdict === 'noData') return null;
            const bestTone = rv.verdict === 'best' ? 'ok' : rv.verdict === 'upside' ? 'warn' : 'info';
            return (
              <Callout tone={bestTone} style={{ marginBottom: 10 }} title={
                rv.verdict === 'best'
                  ? t('panels_people.diem_da_o_muc_don_day', { v0: rating.toFixed(1) })
                  : t('panels_people.len_them_duoc_don_ngay_loi', { RATING_TARGET, ordersToBest: rv.ordersToBest, v2: formatMoney(rv.moneyBestPerDay) })
              }>
                <div style={{ marginTop: 2, fontSize: 12 }}>
                  {rv.verdict !== 'best' && (
                    <>{t('panels_people.hien')}{rv.capNow}{' '}{t('panels_people.don_ngay_moc')}{' '}{RATING_TARGET}{t('panels_people.duoc')}{rv.capBest}.{' '}
                    {rv.ordersToFloor > 0 && <>{t('panels_people.neu_diem_rot_ve')}{' '}{RATING_FLOOR}{' '}{t('panels_people.co_the_mat')}{rv.ordersToFloor}{' '}{t('panels_people.don_ngay')}{formatMoney(rv.moneyFloorPerDay)}). </>}
                    </>)
                  }
                  {rv.verdict === 'best' && <>{t('panels_people.khong_con_du_dia_tang_don')}</>}
                  {' '}{t('panels_people.binh_quan')}{' '}{formatMoney(rv.avgRevenuePerOrder)}{t('panels_people.don_that_hom_nay')}
                </div>
              </Callout>
            );
          })()}          {/* Minh bạch hộp đen đơn app: điểm → độ dày đơn, số đơn tối đa/ngày, khung giờ; sự kiện hôm nay nếu có */}
          <div style={{ ...styles.card, display: 'block', fontSize: 12, marginBottom: 10, background: '#323244' }}>
            {online.event && <div style={{ color: '#9b59b6', marginBottom: 2 }}>{onlineEventLine(online.event)}</div>}
            <div>{t('panels_people.khung_nhan_don')}{' '}<b>{Math.floor(ONLINE_HOURS[0] / 60)}h–{Math.floor(ONLINE_HOURS[1] / 60)}h30</b>{' '}{t('panels_people.cach_nhau_trung_binh')}{Math.round(orderGap(rating, level, evGap))}{' '}{t('panels_people.phut')}</div>
            <div>{t('panels_people.diem')}{' '}{rating.toFixed(1)}⭐ → <b>{orderRateTone(rating)}</b> ({Math.round(onlineOrderCap(rating, level, evGap))}{' '}{t('panels_people.don_ngay_gan_dung')}</div>
            <div>{t('panels_people.hang')}{' '}<b>{tier.name}</b>{' '}{t('panels_people.hoa_hong')}{' '}{Math.round(appCommission(online.done) * 100)}%.{nextTier ? t('panels_people.con_don_toi_hoa_hong', { v0: nextTier.at - online.done, name: nextTier.name, v2: Math.round(nextTier.commission * 100) }) : t('panels_people.da_o_bac_cao_nhat_app')}</div>
            {rating < 4.5 && <div style={{ opacity: 0.8, marginTop: 2 }}>{t('panels_people.giao_dung_hen_de_diem_len')}</div>}
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginBottom: 10 }}>
            <input type="checkbox" checked={online.open} onChange={toggleOnline} />{' '}{t('panels_people.dang_nhan_don')}
            <small style={{ opacity: 0.7 }}>· {couriers.length ? t('panels_people.nguoi_giao_ranh', { v0: couriers.length - busyOwn, length: couriers.length }) : t('panels_people.chua_thue_nguoi_giao_hang_chi')}</small>
          </label>
          <div style={{ display: 'grid', gap: 8 }}>
            {!online.orders.length && <p style={styles.sub}>{t('panels_people.chua_co_don_nao_don_do')}</p>}
            {online.orders.map((o) => {
              const enough = Object.entries(o.items).every(([id, q]) => (storage[id] ?? 0) >= q);
              // GĐ59: đánh giá kinh tế + điểm app cho từng lựa chọn (thuần đọc từ công thức giao/checkout có sẵn)
              const a = orderAssessment(o, priceOf, freeCourier ? freeCourier.skill : null, minutes, appCommission(online.done), evGrab);
              const grabStars = 5;
              const grabNext = ratingImpact(grabStars, online).nextRating;
              const declineNext = declineRating(online).nextRating;
              const ownNext = freeCourier ? ratingImpact(a.ownStars, online).nextRating : null;
              const btn = { ...styles.btn } as React.CSSProperties;
              return (
                <div key={o.id} style={{ ...styles.card, display: 'block' }}>
                  <div style={{ display: 'flex', gap: 8, fontSize: 13, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <b>{o.customer}</b><span>· {o.km} km</span>
                    {o.regularId && <span style={{ fontSize: 11, fontWeight: 700, color: '#f1c40f' }}>{t('panels_people.khach_quen')}</span>}
                    {o.kind === 'rush' && <span style={{ fontSize: 11, fontWeight: 700, color: '#e74c3c' }}>{t('panels_people.gap_hen_rat_som')}</span>}
                    {o.kind === 'bulk' && <span style={{ fontSize: 11, fontWeight: 700, color: '#3498db' }}>{t('panels_people.lon_can_du_kho')}</span>}
                    <span style={{ marginLeft: 'auto' }}>{formatMoney(a.gross)}</span>
                  </div>
                  <div style={{ fontSize: 13, margin: '4px 0', opacity: 0.85 }}>{describeOnline(o)}</div>
                  {/* GĐ59: lời ròng + biên lãi — tín hiệu hoàn vốn cho quyết định lấy đơn */}
                  <div style={{ fontSize: 12, marginBottom: 4 }}>
                    {t('panels_people.loi_rong')}{' '}<b style={{ color: a.net > 0 ? '#2ecc71' : '#e74c3c' }}>{trendMark(a.net)}{formatMoney(a.net)}</b>
                    {' · '}Grab: {formatMoney(a.grabNet)}{' '}{t('panels_people.bien')}{' '}{Math.round(a.margin * 100)}%
                    {a.net <= 0 && <span style={{ color: '#e74c3c' }}>{' '}{t('panels_people.don_nay_lo_neu_lay')}</span>}
                  </div>
                  {o.status === 'shipping' ? (
                    <small>{o.via === 'own' ? t('panels_people.nhan_vien_tiem') : '🟢 Grab'}{' '}{t('panels_people.dang_cho_toi_luc')}{' '}{formatClock(o.arriveAt!)} {o.arriveAt! > o.dueAt ? t('panels_people.tre_hen') : t('panels_people.kip_hen')}</small>
                  ) : (
                    <>
                      <small style={{ opacity: 0.7 }}>{t('panels_people.hen_truoc')}{' '}{formatClock(o.dueAt)}{' '}{t('panels_people.con')}{' '}{Math.max(0, Math.ceil(o.placedAt + ACCEPT_WINDOW - minutes))}{' '}{t('panels_people.phut_de_nhan')}{!enough && t('panels_people.kho_thieu_hang')}</small>
                      {/* Tự giao */}
                      {freeCourier ? (
                        <div style={{ marginTop: 5 }}>
                          <button style={{ ...btn, background: '#f1c40f' }} disabled={!enough} onClick={() => acceptOnline(o.id, 'own')}>
                            {t('panels_people.tu_giao')}{a.ownTravelT}′{a.urgent ? t('panels_people.tre_2') : ''})
                          </button>
                          <small style={{ display: 'block', fontSize: 11, opacity: 0.8, marginTop: 1 }}>
                            {t('panels_people.tu_giao_2')}{a.ownTravelT}′ → {a.ownStars}{t('panels_people.diem_ve')}{' '}{(ownNext ?? 0).toFixed(1)}){a.urgent && <b style={{ color: '#e74c3c' }}>{' '}{t('panels_people.tre_hen_2')}</b>}
                          </small>
                        </div>
                      ) : (
                        <small style={{ display: 'block', fontSize: 11, opacity: 0.75, marginTop: 4 }}>{t('panels_people.khong_co_nguoi_giao_ranh_chi')}</small>
                      )}
                      {/* Grab */}
                      <div style={{ marginTop: 5 }}>
                        <button style={{ ...btn, background: '#2ecc71' }} disabled={!enough || money < grabFee(o.km, evGrab)} onClick={() => acceptOnline(o.id, 'grab')}>
                          🟢 {blockedLabel(enough ? null : t('panels_people.thieu_hang'), `Grab ${formatMoney(grabFee(o.km, evGrab))}`, grabFee(o.km, evGrab), money)} (~{a.grabTravelT}′)
                        </button>
                        <small style={{ display: 'block', fontSize: 11, opacity: 0.8, marginTop: 1 }}>
                          Grab ~{a.grabTravelT}{t('panels_people.phi')}{' '}{formatMoney(grabFee(o.km, evGrab))} → {grabStars}{t('panels_people.diem_ve')}{' '}{grabNext.toFixed(1)})
                        </small>
                      </div>
                      {/* Từ chối */}
                      <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <button style={btn} onClick={() => declineOnline(o.id)}>{t('panels_people.tu_choi')}</button>
                        <small style={{ fontSize: 11, opacity: 0.8 }}>{t('panels_people.tu_choi_diem_ve')}{' '}{declineNext.toFixed(1)}</small>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
      <Footer onClose={closePanel} />
    </>
  );
}
