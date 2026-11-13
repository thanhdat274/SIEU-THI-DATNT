import type * as React from 'react';
import { useGame } from '../../core/store';
import { formatMoney } from '../../data/products';
import {
  DICE_CAP, DICE_STAKES, FORTUNE_DONATE, SHARK_DAYS, SHARK_RATE, SPOTS, STROLL_UNLOCK, TICKET_CAP, TICKET_PRICE,
  sharkOffer, sharkOwedNow, strollToday,
} from '../../data/stroll';
import { CALLOUT_TONE, Footer, styles } from './shared';

/** Màu chip icon từng điểm — bám bảng màu ngữ cảnh chuẩn (Callout, GĐ166). */
const SPOT_TONE: Record<string, string> = {
  ticket: CALLOUT_TONE.info,
  temple: CALLOUT_TONE.event,
  bank: CALLOUT_TONE.ok,
  dice: CALLOUT_TONE.warn,
  shark: CALLOUT_TONE.danger,
};

/** Dạo phố: gom các điểm quanh ngõ thành lưới thẻ. Mọi điểm có trần mỗi ngày; ngân hàng mở lại bảng Kinh doanh có sẵn. */
export function StrollPanel() {
  const { level, day, money, stroll, wheelBoost, closePanel, openPanel, strollTicket, strollIncense, strollFortune, strollDice, strollBorrow, strollRepay } = useGame();
  const st = strollToday(stroll, day);
  const locked = level < STROLL_UNLOCK;
  const debt = st.shark ? sharkOwedNow(st.shark, day) : 0;
  const overdue = st.shark ? day > st.shark.dueDay : false;

  const spot = (id: string) => SPOTS.find((x) => x.id === id)!;
  const row = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } as const;
  // Chuẩn nút dự án: hành động tốn tiền = vàng đặc (như panel Kinh doanh/Xây dựng), còn lại mặc định.
  const gold = { ...styles.btn, background: '#f1c40f', color: '#222', fontWeight: 700 } as const;
  const chip = (tone: string): React.CSSProperties => ({
    width: 36, height: 36, flex: 'none', borderRadius: 10, background: tone,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19,
  });
  /** Thẻ điểm dạo: chip icon màu + tên + mô tả, nút thao tác nằm đáy thẻ (grid 2 cột desktop, 1 cột mobile). */
  const card = (id: string, body: React.ReactNode) => (
    <div style={{ ...styles.card, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={chip(SPOT_TONE[id] ?? CALLOUT_TONE.info)} aria-hidden="true">{spot(id).icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b style={styles.cardTitle}>{spot(id).name}</b>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{spot(id).blurb}</div>
        </div>
      </div>
      {body}
    </div>
  );

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
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(215px, 1fr))', gap: 8, alignContent: 'start', opacity: locked ? 0.5 : 1, pointerEvents: locked ? 'none' : 'auto' }}>
        {card('ticket', (
          <div style={row}>
            <button style={gold} disabled={st.tickets >= TICKET_CAP || money < TICKET_PRICE} onClick={() => strollTicket()}>
              Mua vé {formatMoney(TICKET_PRICE)} ({st.tickets}/{TICKET_CAP})
            </button>
          </div>
        ))}
        {card('temple', (
          <div style={row}>
            <button style={styles.btn} disabled={st.incense} onClick={() => strollIncense()}>{st.incense ? 'Đã thắp nhang' : 'Thắp nhang'}</button>
            <button style={gold} disabled={!st.incense || st.fortune || money < FORTUNE_DONATE} onClick={() => strollFortune()}>
              {st.fortune ? 'Đã xin quẻ' : `Xin quẻ (${formatMoney(FORTUNE_DONATE)})`}
            </button>
          </div>
        ))}
        {card('bank', (
          <div style={row}>
            <button style={styles.btn} onClick={() => openPanel({ type: 'business', focus: 'money' })}>Vào ngân hàng (vay & hụi)</button>
          </div>
        ))}
        {card('dice', (
          <>
            <div style={row}>
              {DICE_STAKES.map((a) => (
                <button key={a} style={gold} disabled={st.dice >= DICE_CAP || money < a} onClick={() => strollDice(a)}>Cược {formatMoney(a)}</button>
              ))}
            </div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Ván hôm nay: {st.dice}/{DICE_CAP}</div>
          </>
        ))}
        {card('shark', st.shark ? (
          <>
            <div style={{ fontSize: 13, color: overdue ? CALLOUT_TONE.danger : undefined }}>
              Đang nợ {formatMoney(debt)} · {overdue ? `quá hạn ${day - st.shark.dueDay} ngày, đang tính lãi chồng` : `hạn ngày ${st.shark.dueDay}`}
            </div>
            <div style={row}>
              <button style={gold} disabled={money <= 0} onClick={() => strollRepay()}>Trả nợ</button>
            </div>
          </>
        ) : (
          <>
            <div style={row}>
              <button style={gold} onClick={() => strollBorrow()}>Vay {formatMoney(sharkOffer(level))}</button>
            </div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Phải trả {formatMoney(Math.round(sharkOffer(level) * SHARK_RATE))} sau {SHARK_DAYS} ngày, quá hạn mỗi ngày +10%.</div>
          </>
        ))}
      </div>
      <Footer onClose={closePanel} />
    </div>
  );
}
