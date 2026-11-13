import { useGame } from '../../core/store';
import { formatMoney } from '../../data/products';
import {
  DICE_CAP, DICE_STAKES, FORTUNE_DONATE, SHARK_DAYS, SHARK_RATE, SPOTS, STROLL_UNLOCK, TICKET_CAP, TICKET_PRICE,
  sharkOffer, sharkOwedNow, strollToday,
} from '../../data/stroll';
import { Footer, styles } from './shared';

/** Dạo phố: gom các điểm quanh ngõ. Mọi điểm có trần mỗi ngày; ngân hàng mở lại bảng Kinh doanh có sẵn. */
export function StrollPanel() {
  const { level, day, money, stroll, wheelBoost, closePanel, openPanel, strollTicket, strollIncense, strollFortune, strollDice, strollBorrow, strollRepay } = useGame();
  const st = strollToday(stroll, day);
  const locked = level < STROLL_UNLOCK;
  const debt = st.shark ? sharkOwedNow(st.shark, day) : 0;
  const overdue = st.shark ? day > st.shark.dueDay : false;

  const spot = (id: string) => SPOTS.find((x) => x.id === id)!;
  const head = (id: string) => (
    <div style={{ flex: 1 }}>
      <b>{spot(id).icon} {spot(id).name}</b>
      <div style={{ fontSize: 12, opacity: 0.8 }}>{spot(id).blurb}</div>
    </div>
  );
  const box = { ...styles.card, display: 'block' } as const;
  const row = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } as const;
  // Chuẩn nút dự án: hành động tốn tiền = vàng đặc (như panel Kinh doanh/Xây dựng), còn lại mặc định.
  const gold = { ...styles.btn, background: '#f1c40f', color: '#222', fontWeight: 700 } as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ flex: 'none' }}>
        <h2 style={styles.title}>🚶 Dạo phố</h2>
        <p style={styles.sub}>
          {locked ? `Mở từ cấp ${STROLL_UNLOCK}.` : 'Đóng cửa tiệm một lát, ra ngõ xem có gì vui. Tiền đang có: '}
          {!locked && <b>{formatMoney(money)}</b>}
          {!locked && wheelBoost > 1 && <span style={{ marginLeft: 8, color: '#a3e4a3' }}>🍀 Khách đông thêm {Math.round((wheelBoost - 1) * 100)}% hôm nay</span>}
        </p>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, opacity: locked ? 0.5 : 1, pointerEvents: locked ? 'none' : 'auto' }}>
        <div style={box}>
          <div style={row}>{head('ticket')}
            <button style={gold} disabled={st.tickets >= TICKET_CAP || money < TICKET_PRICE} onClick={() => strollTicket()}>
              Mua vé {formatMoney(TICKET_PRICE)} ({st.tickets}/{TICKET_CAP})
            </button>
          </div>
        </div>
        <div style={box}>
          <div style={row}>{head('temple')}
            <button style={styles.btn} disabled={st.incense} onClick={() => strollIncense()}>{st.incense ? 'Đã thắp nhang' : 'Thắp nhang'}</button>
            <button style={gold} disabled={!st.incense || st.fortune || money < FORTUNE_DONATE} onClick={() => strollFortune()}>
              {st.fortune ? 'Đã xin quẻ' : `Xin quẻ (${formatMoney(FORTUNE_DONATE)})`}
            </button>
          </div>
        </div>
        <div style={box}>
          <div style={row}>{head('bank')}
            <button style={styles.btn} onClick={() => openPanel({ type: 'business', focus: 'money' })}>Vào ngân hàng (vay & hụi)</button>
          </div>
        </div>
        <div style={box}>
          <div style={row}>{head('dice')}</div>
          <div style={{ ...row, marginTop: 6 }}>
            {DICE_STAKES.map((a) => (
              <button key={a} style={gold} disabled={st.dice >= DICE_CAP || money < a} onClick={() => strollDice(a)}>Cược {formatMoney(a)}</button>
            ))}
            <span style={{ fontSize: 12, opacity: 0.8 }}>Ván hôm nay: {st.dice}/{DICE_CAP}</span>
          </div>
        </div>
        <div style={box}>
          <div style={row}>{head('shark')}</div>
          <div style={{ ...row, marginTop: 6 }}>
            {st.shark ? (
              <>
                <span style={{ fontSize: 13, color: overdue ? '#e74c3c' : undefined }}>
                  Đang nợ {formatMoney(debt)} · {overdue ? `quá hạn ${day - st.shark.dueDay} ngày, đang tính lãi chồng` : `hạn ngày ${st.shark.dueDay}`}
                </span>
                <button style={gold} disabled={money <= 0} onClick={() => strollRepay()}>Trả nợ</button>
              </>
            ) : (
              <>
                <button style={gold} onClick={() => strollBorrow()}>Vay {formatMoney(sharkOffer(level))}</button>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Phải trả {formatMoney(Math.round(sharkOffer(level) * SHARK_RATE))} sau {SHARK_DAYS} ngày, quá hạn mỗi ngày +10%.</span>
              </>
            )}
          </div>
        </div>
      </div>
      <Footer onClose={closePanel} />
    </div>
  );
}
