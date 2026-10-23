import { useState } from 'react';
import { useGame } from '../core/store';
import {
  buyAd, buyHomeItem, buyPet, buyVehicle, feedPet, joinHui, repayLoan, setLoyalty, takeLoan,
} from '../core/biz';
import { HistoryChart } from './Panels';
import {
  ACHIEVEMENTS, activeAds, ADS, BREAKFAST, HOME_ITEMS, HUI_COLLAPSE, HUI_OPTIONS, HUI_UNLOCK, LOAN_DAILY_RATE, LOAN_UNLOCK,
  loanOptions, LOYALTY_OPTIONS, LOYALTY_UNLOCK, petActive, PETS, RIVAL_UNLOCK, rivalTrafficFactor, VEHICLES, WEEK_DAYS,
} from '../data/biz';
import { formatMoney, productById } from '../data/products';

const card: React.CSSProperties = { background: '#3a3a4d', borderRadius: 8, padding: '8px 12px', marginBottom: 6 };
const btn: React.CSSProperties = { marginLeft: 6, padding: '4px 10px', borderRadius: 6, border: 0, cursor: 'pointer', background: '#f1c40f', fontWeight: 600 };
const sub: React.CSSProperties = { fontSize: 12, opacity: 0.75 };
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 };

const TABS = [
  ['market', '⚔️ Đối thủ & quảng cáo'],
  ['money', '🏦 Vay & hụi'],
  ['week', '📊 Lãi lỗ & tuần'],
  ['pets', '🐾 Thú cưng'],
  ['life', '🏡 Nhà & xe'],
  ['ach', '🏆 Thành tựu'],
] as const;

/** Bảng Kinh doanh: các hệ thống thêm (đối thủ, quảng cáo, tích điểm, vay, hụi, tuần, thú cưng, nhà, xe, thành tựu). */
export function BusinessPanel() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('market');
  return (
    <>
      <h2 style={{ margin: '0 0 8px' }}>📈 Kinh doanh</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        {TABS.map(([id, label]) => (
          <button key={id} style={{ ...btn, marginLeft: 0, background: tab === id ? '#f1c40f' : '#fff' }} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      <div style={{ maxWidth: 600 }}>
        {tab === 'market' && <Market />}
        {tab === 'money' && <Money />}
        {tab === 'week' && <Week />}
        {tab === 'pets' && <Pets />}
        {tab === 'life' && <Life />}
        {tab === 'ach' && <Achievements />}
      </div>
    </>
  );
}

function Market() {
  const { biz, day, level, money } = useGame();
  const r = biz.rival;
  const running = activeAds(biz.ads, day);
  return (
    <>
      <div style={card}>
        <b>⚔️ Tiệm đối thủ</b>
        {level < RIVAL_UNLOCK ? <div style={sub}>Từ cấp {RIVAL_UNLOCK} sẽ có tiệm khác mở cạnh tranh trong hẻm.</div>
          : r ? (
            <>
              <div style={row}><span>{r.name} (mở ngày {r.openedDay})</span><span>Sức mạnh {Math.round(r.strength)}/100</span></div>
              <div style={{ height: 8, background: '#555', borderRadius: 4, margin: '4px 0' }}>
                <div style={{ width: `${r.strength}%`, height: '100%', borderRadius: 4, background: '#e74c3c' }} />
              </div>
              <div style={sub}>
                Đang hút mất {Math.round((1 - rivalTrafficFactor(r, day)) * 100)}% khách{r.saleUntil !== undefined && r.saleUntil >= day ? ` (đang giảm giá tới ngày ${r.saleUntil})` : ''}.
                Mỗi đêm họ yếu đi khi tiệm bạn được đánh giá cao, ít để khách hụt hàng, giá không đắt hơn giá gợi ý, và có chạy quảng cáo.
              </div>
            </>
          ) : <div style={sub}>Hẻm đang chỉ có tiệm bạn{biz.rivalsBeaten ? ` · đã đánh bại ${biz.rivalsBeaten} đối thủ` : ''}. Thỉnh thoảng sẽ có tiệm mới mở.</div>}
      </div>

      <div style={card}>
        <div style={row}>
          <b>🎫 Thẻ tích điểm</b>
          {level >= LOYALTY_UNLOCK && (
            <label style={{ fontSize: 13 }}>
              <input type="checkbox" checked={biz.loyalty.on} onChange={(e) => setLoyalty(e.target.checked)} /> Bật
            </label>
          )}
        </div>
        {level < LOYALTY_UNLOCK ? <div style={sub}>Mở ở cấp {LOYALTY_UNLOCK}.</div> : (
          <>
            <div style={{ margin: '4px 0' }}>
              Mua đủ {LOYALTY_OPTIONS.map((n) => (
                <button key={n} style={{ ...btn, background: biz.loyalty.stamps === n ? '#f1c40f' : '#fff' }} onClick={() => setLoyalty(biz.loyalty.on, n)}>{n} lần</button>
              ))} tặng món rẻ nhất trong giỏ
            </div>
            <div style={sub}>
              Ít tem thì khách ghé nhiều hơn (+{Math.round(60 / biz.loyalty.stamps)}%) nhưng tặng nhiều hơn.
              Đã tặng {biz.loyalty.redeemed} lần · {formatMoney(biz.loyalty.given)}.
            </div>
          </>
        )}
      </div>

      <div style={card}>
        <b>📢 Quảng cáo</b>
        {ADS.map((a) => {
          const on = running.find((x) => x.id === a.id);
          return (
            <div key={a.id} style={{ ...row, marginTop: 6, opacity: level < a.unlock ? 0.5 : 1 }}>
              <span>{a.icon} {a.name} <span style={sub}>· {a.desc} +{Math.round((a.traffic - 1) * 100)}% khách, {a.days} ngày</span></span>
              {level < a.unlock ? <span style={sub}>Cấp {a.unlock}</span>
                : on ? <span style={{ ...sub, color: '#2ecc71' }}>Chạy tới ngày {on.untilDay}</span>
                  : <button style={btn} disabled={money < a.price} onClick={() => buyAd(a.id)}>{formatMoney(a.price)}</button>}
            </div>
          );
        })}
      </div>
    </>
  );
}

function Money() {
  const { biz, day, level } = useGame();
  const loan = biz.loan;
  const hui = biz.hui;
  return (
    <>
      <div style={card}>
        <b>🏦 Vay ngân hàng</b>
        {level < LOAN_UNLOCK ? <div style={sub}>Mở ở cấp {LOAN_UNLOCK}.</div> : loan ? (
          <>
            <div>Đang nợ <b>{formatMoney(loan.principal)}</b> · lãi {formatMoney(Math.round(loan.principal * LOAN_DAILY_RATE))}/ngày · hạn ngày {loan.dueDay} (còn {loan.dueDay - day} ngày)</div>
            <div style={{ marginTop: 4 }}>
              <button style={{ ...btn, marginLeft: 0 }} onClick={() => repayLoan(Math.min(loan.principal, 500000))}>Trả 500.000đ</button>
              <button style={btn} onClick={() => repayLoan()}>Trả hết</button>
            </div>
            <div style={sub}>Quá hạn ngân hàng sẽ tự trừ hết tiền gốc vào tài khoản.</div>
          </>
        ) : (
          <>
            <div style={sub}>Vay để mở rộng sớm. Lãi {(LOAN_DAILY_RATE * 100).toFixed(1)}%/ngày trên tiền còn nợ, hạn 30 ngày, trả sớm không mất phí.</div>
            <div style={{ marginTop: 4 }}>
              {loanOptions(level).map((a) => <button key={a} style={{ ...btn, marginLeft: 0, marginRight: 6 }} onClick={() => takeLoan(a)}>Vay {formatMoney(a)}</button>)}
            </div>
          </>
        )}
      </div>
      <div style={card}>
        <b>🤝 Chơi hụi với hàng xóm</b>
        {level < HUI_UNLOCK ? <div style={sub}>Mở ở cấp {HUI_UNLOCK}.</div> : hui ? (
          <>
            <div>Góp {formatMoney(hui.daily)}/ngày · đã góp {hui.paidDays}/{hui.members} ngày</div>
            <div>{hui.received ? '✅ Đã hốt hụi' : `Ngày ${hui.turnDay} tới lượt hốt ${formatMoney(hui.daily * hui.members)}`}</div>
            <div style={sub}>Tiền góp trừ mỗi tối. Mỗi ngày có {(HUI_COLLAPSE * 100).toFixed(1)}% chủ hụi ôm tiền trốn!</div>
          </>
        ) : (
          <>
            <div style={sub}>Mỗi ngày góp một khoản, tới lượt mình thì hốt cả vòng. Như một khoản tiết kiệm có kỳ hạn, có chút rủi ro.</div>
            {HUI_OPTIONS.map((o, i) => (
              <button key={i} style={{ ...btn, marginLeft: 0, marginRight: 6, marginTop: 4 }} onClick={() => joinHui(i)}>
                Hụi {formatMoney(o.daily)}/ngày × {o.members} chân
              </button>
            ))}
          </>
        )}
      </div>
    </>
  );
}

function Week() {
  const { biz, day, history } = useGame();
  const w = biz.week;
  const r = biz.lastWeek;
  const total = history.reduce((n, h) => n + h.profit, 0);
  const best = history.reduce<(typeof history)[number] | null>((b, h) => (!b || h.profit > b.profit ? h : b), null);
  return (
    <>
      <div style={card}>
        <b>📈 Lãi lỗ {history.length} ngày gần đây</b>
        <div style={sub}>
          Tổng tiền vào − ra: <b style={{ color: total >= 0 ? '#2ecc71' : '#e74c3c' }}>{formatMoney(total)}</b>
          {best && ` · ngày tốt nhất: ngày ${best.day} (${formatMoney(best.profit)})`}
        </div>
        {history.length < 2 ? <div style={sub}>Chơi thêm vài ngày để xem biểu đồ.</div> : <HistoryChart history={history} />}
      </div>
      <div style={card}>
        <b>📅 Tuần này (ngày {w.startDay}–{w.startDay + WEEK_DAYS - 1}, hôm nay ngày {day})</b>
        <div>Doanh thu {formatMoney(w.revenue)} · Lãi {formatMoney(w.profit)} · {w.customers} khách</div>
        {w.goal !== null ? (
          <>
            <div style={{ marginTop: 4 }}>🎯 Mục tiêu: {formatMoney(w.goal)} (thưởng 5% nếu đạt)</div>
            <div style={{ height: 8, background: '#555', borderRadius: 4, marginTop: 4 }}>
              <div style={{ width: `${Math.min(100, (w.revenue / w.goal) * 100)}%`, height: '100%', borderRadius: 4, background: '#2ecc71' }} />
            </div>
          </>
        ) : <div style={sub}>Tuần đầu chưa có mục tiêu; hết tuần sẽ đặt mục tiêu cao hơn 10%.</div>}
        <div style={sub}>Số liệu cộng vào lúc tổng kết mỗi tối.</div>
      </div>
      {r && (
        <div style={card}>
          <b>📊 Báo cáo tuần {r.week}</b>
          <div>Doanh thu {formatMoney(r.revenue)} · Lãi {formatMoney(r.profit)} · {r.customers} khách ({r.unhappy} không vui)</div>
          {r.goal !== null && <div>{r.goalMet ? `✅ Đạt mục tiêu ${formatMoney(r.goal)}, thưởng ${formatMoney(r.reward)}` : `❌ Chưa đạt mục tiêu ${formatMoney(r.goal)}`}</div>}
          {r.best && <div>💰 Lãi nhiều nhất: {productById(r.best).name}</div>}
          {r.worst && <div>📉 Lãi mỗi món thấp nhất: {productById(r.worst).name} · cân nhắc tăng giá hoặc bỏ bớt</div>}
          <div>🎯 Mục tiêu tuần tới: {formatMoney(r.nextGoal)}</div>
        </div>
      )}
    </>
  );
}

function Pets() {
  const { biz, day, level, storage } = useGame();
  return (
    <>
      {PETS.map((p) => {
        const pet = biz.pets[p.kind];
        const fed = petActive(pet, day);
        return (
          <div key={p.kind} style={card}>
            <div style={row}>
              <b>{p.icon} {p.name}</b>
              {!pet ? (level < p.unlock ? <span style={sub}>Cấp {p.unlock}</span> : <button style={btn} onClick={() => buyPet(p.kind)}>Nuôi · {formatMoney(p.price)}</button>)
                : <button style={btn} disabled={pet.fedDay === day} onClick={() => feedPet(p.kind)}>{pet.fedDay === day ? 'Đã cho ăn' : 'Cho ăn'}</button>}
            </div>
            <div style={sub}>{p.desc}</div>
            {pet && (
              <div style={{ fontSize: 12, marginTop: 2, color: fed ? '#2ecc71' : '#e17055' }}>
                {fed ? 'No bụng, đang làm việc' : 'Đói, không chịu làm việc'} · kho còn {storage[p.food] ?? 0} {productById(p.food).name} (không có thì mua lẻ giá gấp đôi)
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function Life() {
  const { biz, level, day } = useGame();
  return (
    <>
      <div style={card}>
        <b>🏡 Sắm đồ cho nhà riêng</b>
        <div style={sub}>Nhà đẹp ngủ ngon: mỗi món giúp sáng hôm sau đi nhanh hơn.</div>
        {HOME_ITEMS.map((h) => (
          <div key={h.id} style={{ ...row, marginTop: 4, opacity: level < h.unlock ? 0.5 : 1 }}>
            <span>{h.icon} {h.name} <span style={sub}>+{Math.round(h.rest * 100)}% tốc độ</span></span>
            {biz.home.includes(h.id) ? <span style={{ ...sub, color: '#2ecc71' }}>Đã có</span>
              : level < h.unlock ? <span style={sub}>Cấp {h.unlock}</span>
                : <button style={btn} onClick={() => buyHomeItem(h.id)}>{formatMoney(h.price)}</button>}
          </div>
        ))}
      </div>
      <div style={card}>
        <b>🍜 Bữa sáng</b>
        <div style={sub}>Bước tới cạnh tủ đầu giường là tự ăn sáng ({formatMoney(BREAKFAST.price)}, trước 11:00): đi nhanh hơn {Math.round(BREAKFAST.speed * 100)}% cả ngày, thức khuya thêm {BREAKFAST.lateMinutes} phút mới ngất.</div>
        <div style={{ fontSize: 12, marginTop: 2 }}>{biz.breakfastDay === day ? '✅ Sáng nay đã ăn' : 'Hôm nay chưa ăn'}</div>
      </div>
      <div style={card}>
        <b>🛵 Xe cộ</b>
        <div style={sub}>Ngoài đường đi nhanh hơn, nút đi lại nhà ↔ tiệm tốn ít giờ hơn, giao đơn gọi điện kịp hơn.</div>
        {VEHICLES.map((v) => (
          <div key={v.id} style={{ ...row, marginTop: 4, opacity: level < v.unlock ? 0.5 : 1 }}>
            <span>{v.icon} {v.name} <span style={sub}>+{Math.round(v.speed * 100)}% ngoài đường, đi lại còn {Math.round(v.travel * 100)}% thời gian</span></span>
            {biz.vehicle === v.id || (biz.vehicle === 'moto' && v.id === 'bike') ? <span style={{ ...sub, color: '#2ecc71' }}>Đã có</span>
              : level < v.unlock ? <span style={sub}>Cấp {v.unlock}</span>
                : <button style={btn} onClick={() => buyVehicle(v.id)}>{formatMoney(v.price)}</button>}
          </div>
        ))}
      </div>
    </>
  );
}

function Achievements() {
  const { biz } = useGame();
  const done = new Set(biz.achievements);
  return (
    <>
      <p style={sub}>Đã đạt {done.size}/{ACHIEVEMENTS.length} thành tựu.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
        {ACHIEVEMENTS.map((a) => (
          <div key={a.id} style={{ ...card, marginBottom: 0, opacity: done.has(a.id) ? 1 : 0.55 }}>
            <b>{done.has(a.id) ? a.icon : '🔒'} {a.name}</b>
            <div style={sub}>{a.desc} · thưởng {formatMoney(a.reward)}</div>
          </div>
        ))}
      </div>
    </>
  );
}
