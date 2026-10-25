import { formatClock, useGame } from '../../core/store';
import {
  ACCEPT_WINDOW, APP_COMMISSION, appRating, describeOnline, grabFee, grabTravel, ONLINE_OPEN_COST, ONLINE_UNLOCK, onlineValue, ownTravel,
} from '../../data/online';
import { formatMoney } from '../../data/products';
import { Footer, styles } from './shared';

export function OnlinePanel() {
  const { online, level, money, staff, storage, priceOf, openOnline, toggleOnline, acceptOnline, declineOnline, closePanel } = useGame();
  const minutes = useGame((s) => Math.floor(s.minutes));
  const registered = online.open || online.done > 0 || online.ratingCount > 0;
  const couriers = staff.filter((st) => st.role === 'courier').sort((a, b) => b.skill - a.skill);
  const busyOwn = online.orders.filter((o) => o.status === 'shipping' && o.via === 'own').length;
  const freeCourier = couriers[busyOwn];
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
            <div style={{ ...styles.card, display: 'block' }}><small style={{ opacity: 0.7 }}>⭐ Điểm app</small><div><b>{appRating(online).toFixed(1)}</b> <small>({online.ratingCount})</small></div></div>
            <div style={{ ...styles.card, display: 'block' }}><small style={{ opacity: 0.7 }}>📦 Đã giao</small><div><b>{online.done}</b> <small>trễ {online.late}</small></div></div>
            <div style={{ ...styles.card, display: 'block' }}><small style={{ opacity: 0.7 }}>💵 Hôm nay</small><div><b>{formatMoney(online.revenueToday)}</b></div>{!!online.grabFeesToday && <small>Grab -{formatMoney(online.grabFeesToday)}</small>}</div>
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginBottom: 10 }}>
            <input type="checkbox" checked={online.open} onChange={toggleOnline} /> Đang nhận đơn
            <small style={{ opacity: 0.7 }}>· {couriers.length ? `${couriers.length - busyOwn}/${couriers.length} người giao rảnh` : 'chưa thuê người giao hàng, chỉ gọi Grab được'}</small>
          </label>
          <div style={{ display: 'grid', gap: 8 }}>
            {!online.orders.length && <p style={styles.sub}>Chưa có đơn nào. Đơn đổ về khi tiệm mở cửa, 7h–21h30.</p>}
            {online.orders.map((o) => {
              const enough = Object.entries(o.items).every(([id, q]) => (storage[id] ?? 0) >= q);
              const own = freeCourier ? ownTravel(o.km, freeCourier.skill) : null;
              const grab = grabTravel(o.km);
              return (
                <div key={o.id} style={{ ...styles.card, display: 'block' }}>
                  <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                    <b>{o.customer}</b><span>· {o.km} km</span>
                    <span style={{ marginLeft: 'auto' }}>{formatMoney(Math.round(onlineValue(o, priceOf) * (1 - APP_COMMISSION)))}</span>
                  </div>
                  <div style={{ fontSize: 13, margin: '4px 0', opacity: 0.85 }}>{describeOnline(o)}</div>
                  {o.status === 'shipping' ? (
                    <small>{o.via === 'own' ? '🛵 Nhân viên tiệm' : '🟢 Grab'} đang chở · tới lúc {formatClock(o.arriveAt!)} {o.arriveAt! > o.dueAt ? '(trễ hẹn)' : '(kịp hẹn)'}</small>
                  ) : (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <small style={{ opacity: 0.7, marginRight: 'auto' }}>Hẹn trước {formatClock(o.dueAt)} · còn {Math.max(0, Math.ceil(o.placedAt + ACCEPT_WINDOW - minutes))} phút để nhận{!enough && ' · ⚠️ kho thiếu hàng'}</small>
                      <button style={{ ...styles.btn, background: '#f1c40f' }} disabled={!enough || !own} title={own ? `Tới nơi sau ~${own} phút` : 'Không có người giao rảnh'} onClick={() => acceptOnline(o.id, 'own')}>
                        🛵 Tự giao{own ? ` (~${own}′${minutes + own > o.dueAt ? ', trễ' : ''})` : ''}
                      </button>
                      <button style={{ ...styles.btn, background: '#2ecc71' }} disabled={!enough || money < grabFee(o.km)} onClick={() => acceptOnline(o.id, 'grab')}>
                        🟢 Grab {formatMoney(grabFee(o.km))} (~{grab}′)
                      </button>
                      <button style={styles.btn} onClick={() => declineOnline(o.id)}>Từ chối</button>
                    </div>
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
