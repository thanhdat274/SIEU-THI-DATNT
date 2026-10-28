import { formatClock, useClock, useGame } from '../../core/store';
import {
  ACCEPT_WINDOW, APP_COMMISSION, appRating, declineRating, describeOnline, grabFee, grabTravel, ONLINE_HOURS, ONLINE_OPEN_COST, ONLINE_UNLOCK, onlineOrderCap,
  orderAssessment, orderGap, orderRateTone, ratingImpact,
} from '../../data/online';
import { formatMoney } from '../../data/products';
import { Footer, styles } from './shared';

export function OnlinePanel() {
  const { online, level, money, staff, storage, priceOf, openOnline, toggleOnline, acceptOnline, declineOnline, closePanel } = useGame();
  const minutes = useClock((c) => Math.floor(c.minutes));
  const registered = online.open || online.done > 0 || online.ratingCount > 0;
  const couriers = staff.filter((st) => st.role === 'courier').sort((a, b) => b.skill - a.skill);
  const busyOwn = online.orders.filter((o) => o.status === 'shipping' && o.via === 'own').length;
  const freeCourier = couriers[busyOwn];
  const rating = appRating(online);
  const cap = onlineOrderCap(rating, level);
  return (
    <>
      <h2 style={styles.title}>📲 Bán online</h2>
      <p style={styles.sub}>
        Đơn từ khắp quận đặt qua app khi tiệm mở cửa. Nhân viên giao hàng của tiệm chở miễn phí nhưng chậm, mỗi người một đơn;
        Grab tới nhanh nhưng tính phí theo km. App lấy {Math.round(APP_COMMISSION * 100)}% mỗi đơn. Giao đúng hẹn giữ điểm cao, điểm thấp thì ít đơn.
      </p>
      {!registered ? (
        <div style={styles.card}>
          <span style={{ flex: 1, fontSize: 13 }}>Mở gian hàng trên app: {formatMoney(ONLINE_OPEN_COST)} (trả một lần){level < ONLINE_UNLOCK && ` · cần cấp ${ONLINE_UNLOCK}`}</span>
          <button style={{ ...styles.btn, background: '#f1c40f' }} disabled={level < ONLINE_UNLOCK || money < ONLINE_OPEN_COST} onClick={openOnline}>Mở gian hàng</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
            <div style={{ ...styles.card, display: 'block' }}><small style={{ opacity: 0.7 }}>⭐ Điểm app</small><div><b>{rating.toFixed(1)}</b> <small>({online.ratingCount})</small></div></div>
            <div style={{ ...styles.card, display: 'block' }}><small style={{ opacity: 0.7 }}>📦 Đã giao</small><div><b>{online.done}</b> <small>trễ {online.late}</small></div></div>
            <div style={{ ...styles.card, display: 'block' }}><small style={{ opacity: 0.7 }}>💵 Hôm nay</small><div><b>{formatMoney(online.revenueToday)}</b></div>{!!online.grabFeesToday && <small>Grab -{formatMoney(online.grabFeesToday)}</small>}</div>
          </div>
          {/* Minh bạch hộp đen đơn app: điểm → độ dày đơn, số đơn tối đa/ngày, khung giờ */}
          <div style={{ ...styles.card, display: 'block', fontSize: 12, marginBottom: 10, background: '#323244' }}>
            <div>⏱️ Khung nhận đơn: <b>{Math.floor(ONLINE_HOURS[0] / 60)}h–{Math.floor(ONLINE_HOURS[1] / 60)}h30</b> · cách nhau trung bình ~{Math.round(orderGap(rating, level))} phút.</div>
            <div>📈 Điểm {rating.toFixed(1)}⭐ → <b>{orderRateTone(rating)}</b> ({Math.round(cap)} đơn/ngày gần đúng).</div>
            {rating < 4.5 && <div style={{ opacity: 0.8, marginTop: 2 }}>💡 Giao đúng hẹn để điểm lên 4,5⭐ sẽ có đơn dày nhất.</div>}
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginBottom: 10 }}>
            <input type="checkbox" checked={online.open} onChange={toggleOnline} /> Đang nhận đơn
            <small style={{ opacity: 0.7 }}>· {couriers.length ? `${couriers.length - busyOwn}/${couriers.length} người giao rảnh` : 'chưa thuê người giao hàng, chỉ gọi Grab được'}</small>
          </label>
          <div style={{ display: 'grid', gap: 8 }}>
            {!online.orders.length && <p style={styles.sub}>Chưa có đơn nào. Đơn đổ về khi tiệm mở cửa, 7h–21h30.</p>}
            {online.orders.map((o) => {
              const enough = Object.entries(o.items).every(([id, q]) => (storage[id] ?? 0) >= q);
              // GĐ59: đánh giá kinh tế + điểm app cho từng lựa chọn (thuần đọc từ công thức giao/checkout có sẵn)
              const a = orderAssessment(o, priceOf, freeCourier ? freeCourier.skill : null, minutes);
              const grabStars = 5;
              const grabNext = ratingImpact(grabStars, online).nextRating;
              const declineNext = declineRating(online).nextRating;
              const ownNext = freeCourier ? ratingImpact(a.ownStars, online).nextRating : null;
              const btn = { ...styles.btn } as React.CSSProperties;
              return (
                <div key={o.id} style={{ ...styles.card, display: 'block' }}>
                  <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                    <b>{o.customer}</b><span>· {o.km} km</span>
                    <span style={{ marginLeft: 'auto' }}>{formatMoney(a.gross)}</span>
                  </div>
                  <div style={{ fontSize: 13, margin: '4px 0', opacity: 0.85 }}>{describeOnline(o)}</div>
                  {/* GĐ59: lời ròng + biên lãi — tín hiệu hoàn vốn cho quyết định lấy đơn */}
                  <div style={{ fontSize: 12, marginBottom: 4 }}>
                    💰 Lời ròng: <b style={{ color: a.net > 0 ? '#2ecc71' : '#e74c3c' }}>{formatMoney(a.net)}</b>
                    {' · '}Grab: {formatMoney(a.grabNet)} · biên {Math.round(a.margin * 100)}%
                    {a.net <= 0 && <span style={{ color: '#e74c3c' }}> · đơn này LỖ nếu lấy</span>}
                  </div>
                  {o.status === 'shipping' ? (
                    <small>{o.via === 'own' ? '🛵 Nhân viên tiệm' : '🟢 Grab'} đang chở · tới lúc {formatClock(o.arriveAt!)} {o.arriveAt! > o.dueAt ? '(trễ hẹn)' : '(kịp hẹn)'}</small>
                  ) : (
                    <>
                      <small style={{ opacity: 0.7 }}>Hẹn trước {formatClock(o.dueAt)} · còn {Math.max(0, Math.ceil(o.placedAt + ACCEPT_WINDOW - minutes))} phút để nhận{!enough && ' · ⚠️ kho thiếu hàng'}</small>
                      {/* Tự giao */}
                      {freeCourier ? (
                        <div style={{ marginTop: 5 }}>
                          <button style={{ ...btn, background: '#f1c40f' }} disabled={!enough} onClick={() => acceptOnline(o.id, 'own')}>
                            🛵 Tự giao (~{a.ownTravelT}′{a.urgent ? ', trễ' : ''})
                          </button>
                          <small style={{ display: 'block', fontSize: 11, opacity: 0.8, marginTop: 1 }}>
                            Tự giao ~{a.ownTravelT}′ → {a.ownStars}★ (điểm về {(ownNext ?? 0).toFixed(1)}){a.urgent && <b style={{ color: '#e74c3c' }}> · TRỄ hẹn!</b>}
                          </small>
                        </div>
                      ) : (
                        <small style={{ display: 'block', fontSize: 11, opacity: 0.75, marginTop: 4 }}>Không có người giao rảnh — chỉ gọi Grab được.</small>
                      )}
                      {/* Grab */}
                      <div style={{ marginTop: 5 }}>
                        <button style={{ ...btn, background: '#2ecc71' }} disabled={!enough || money < grabFee(o.km)} onClick={() => acceptOnline(o.id, 'grab')}>
                          🟢 Grab {formatMoney(grabFee(o.km))} (~{a.grabTravelT}′)
                        </button>
                        <small style={{ display: 'block', fontSize: 11, opacity: 0.8, marginTop: 1 }}>
                          Grab ~{a.grabTravelT}′ · phí {formatMoney(grabFee(o.km))} → {grabStars}★ (điểm về {grabNext.toFixed(1)})
                        </small>
                      </div>
                      {/* Từ chối */}
                      <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <button style={btn} onClick={() => declineOnline(o.id)}>Từ chối</button>
                        <small style={{ fontSize: 11, opacity: 0.8 }}>Từ chối: điểm về {declineNext.toFixed(1)}</small>
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
