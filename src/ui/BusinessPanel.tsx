import { useState } from 'react';
import { useGame } from '../core/store';
import {
  buyAd, buyHomeItem, buyRivalShop, buyService, buyPet, buyUpgrade, buyVehicle, feedPet, joinHui, repayLoan, setLoyalty, startCounter, takeLoan,
} from '../core/biz';
import { hasUpgrade, UPGRADES } from '../data/upgrades';
import { HistoryChart } from './Panels';
import {
  ACHIEVEMENTS, activeAds, ADS, BREAKFAST, COUNTERS, HOME_ITEMS, HUI_COLLAPSE, HUI_OPTIONS, HUI_UNLOCK, LOAN_DAILY_RATE,
  LOAN_UNLOCK, loanInterest, loanLimit, loanOptions, loanTopUps, LOYALTY_OPTIONS, LOYALTY_UNLOCK, petActive, PETS,
  RIVAL_PERSONALITIES, RIVAL_UNLOCK, rivalTrafficFactor, VEHICLES, WEEK_DAYS,
} from '../data/biz';
import { REGULAR_NAMES } from '../core/biz';
import { formatMoney, productById } from '../data/products';
import { BILL_RUSH_DAYS, dayOfMonth, SERVICE_BUY_ALONG, SERVICES } from '../data/services';

const card: React.CSSProperties = { background: '#3a3a4d', borderRadius: 10, padding: '12px 14px', marginBottom: 8, border: '1px solid rgba(255,255,255,0.06)' };
const title: React.CSSProperties = { fontSize: 15, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 };
const pill: React.CSSProperties = { fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, whiteSpace: 'nowrap' };
const iconTile: React.CSSProperties = { width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.08)', display: 'grid', placeItems: 'center', fontSize: 18, flexShrink: 0 };
const btn: React.CSSProperties = { marginLeft: 6, padding: '4px 10px', borderRadius: 6, border: 0, cursor: 'pointer', background: '#f1c40f', fontWeight: 600 };
const sub: React.CSSProperties = { fontSize: 12, opacity: 0.75 };
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 };

const TABS = [
  ['market', '⚔️ Cạnh tranh'],
  ['services', '🧾 Dịch vụ'],
  ['money', '🏦 Vay & hụi'],
  ['week', '📊 Lãi lỗ'],
  ['pets', '🐾 Thú cưng'],
  ['life', '🏡 Nhà & xe'],
  ['upgrades', '🔧 Nâng cấp'],
  ['ach', '🏆 Thành tựu'],
] as const;

/** Bảng Kinh doanh: các hệ thống thêm (đối thủ, quảng cáo, tích điểm, vay, hụi, tuần, thú cưng, nhà, xe, thành tựu). */
export function BusinessPanel() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('market');
  return (
    // Khung cố định để mọi tab cùng kích thước, không co giãn theo nội dung
    <div style={{ width: 'min(760px, 86vw)', minHeight: 'min(520px, 70vh)' }}>
      <h2 style={{ margin: '0 0 8px' }}>📈 Kinh doanh</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 4, padding: 4, marginBottom: 12, background: 'rgba(0,0,0,0.25)', borderRadius: 10 }}>
        {TABS.map(([id, label]) => (
          <button
            key={id}
            style={{
              padding: '7px 8px', borderRadius: 7, border: 0, cursor: 'pointer', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap',
              background: tab === id ? '#f1c40f' : 'transparent', color: tab === id ? '#222' : '#ddd',
            }}
            onClick={() => setTab(id)}
          >{label}</button>
        ))}
      </div>
      <div>
        {tab === 'market' && <Market />}
        {tab === 'services' && <Services />}
        {tab === 'money' && <Money />}
        {tab === 'week' && <Week />}
        {tab === 'pets' && <Pets />}
        {tab === 'life' && <Life />}
        {tab === 'upgrades' && <Upgrades />}
        {tab === 'ach' && <Achievements />}
      </div>
    </div>
  );
}

function Market() {
  const { biz, day, level, money, branch } = useGame();
  const r = biz.rival;
  const running = activeAds(biz.ads, day);
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8 }}>
      <div style={{ ...card, marginBottom: 0 }}>
        <div style={title}>⚔️ Tiệm đối thủ</div>
        {level < RIVAL_UNLOCK ? <div style={sub}>Từ cấp {RIVAL_UNLOCK} sẽ có tiệm khác mở cạnh tranh trong hẻm.</div>
          : r ? (
            <>
              <div style={row}><span>{r.name} (mở ngày {r.openedDay})</span><span>Sức mạnh {Math.round(r.strength)}/100</span></div>
              <div style={{ height: 8, background: '#555', borderRadius: 4, margin: '4px 0' }}>
                <div style={{ width: `${r.strength}%`, height: '100%', borderRadius: 4, background: '#e74c3c' }} />
              </div>
              {r.personality && (
                <div style={{ ...sub, marginTop: 4 }}>
                  Tính cách: {RIVAL_PERSONALITIES[r.personality].icon} <b>{RIVAL_PERSONALITIES[r.personality].name}</b> — {RIVAL_PERSONALITIES[r.personality].desc}.
                  {' '}Khách quen bị lôi kéo: {Object.keys(r.poached ?? {}).length ? Object.keys(r.poached!).map((id) => REGULAR_NAMES[id] ?? id).join(', ') : 'chưa có'}.
                </div>
              )}
              {!!Object.keys(r.prices ?? {}).length && (
                <div style={{ ...sub, marginTop: 4 }}>
                  <b>Giá rival đang bán:</b>{' '}
                  {Object.entries(r.prices!).map(([id, rp]) => {
                    const mine = useGame.getState().priceOf(id);
                    return `${productById(id).name} ${formatMoney(rp)}${mine ? ` (mình ${formatMoney(mine)}${rp < mine * 0.95 ? ' ⚠️' : ''})` : ''}`;
                  }).join(' · ')}
                </div>
              )}
              <div style={sub}>
                Đang hút mất {Math.round((1 - rivalTrafficFactor(r, day)) * 100)}% khách{r.saleUntil !== undefined && r.saleUntil >= day ? ` (đang giảm giá tới ngày ${r.saleUntil})` : ''}.
                Mỗi đêm họ yếu đi khi tiệm bạn được đánh giá cao, ít để khách hụt hàng, giá không đắt hơn giá gợi ý, và có chạy quảng cáo.
              </div>
              <div style={{ ...title, marginTop: 8 }}>🎯 Phản công (mỗi ngày một đợt)</div>
              <div style={{ display: 'grid', gap: 4 }}>
                {COUNTERS.map((c) => {
                  const runningNow = biz.counter?.day === day && biz.counter.tactic === c.id;
                  const ready = day >= (biz.counterReady[c.id] ?? 0);
                  const usedToday = biz.counter?.day === day;
                  const affordable = money >= c.cost;
                  return (
                    <button
                      key={c.id}
                      disabled={runningNow || usedToday || !ready || !affordable}
                      style={{
                        textAlign: 'left', padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                        border: `1px solid ${runningNow ? 'rgba(46,204,113,0.55)' : 'transparent'}`,
                        background: runningNow ? 'rgba(46,204,113,0.15)' : 'rgba(0,0,0,0.18)',
                        color: '#eee', opacity: runningNow || (!usedToday && ready && affordable) ? 1 : 0.55,
                      }}
                      onClick={() => startCounter(c.id)}
                    >
                      <b>{c.icon} {c.name}</b>
                      {c.cost > 0 ? ` · ${formatMoney(c.cost)}` : ' · miễn phí (lãi mỏng)'}
                      {runningNow ? ' · ✅ đang chạy' : usedToday ? ' · hôm nay đã chạy đợt khác' : !ready ? ` · hồi từ ngày ${biz.counterReady[c.id]}` : ''}
                      <div style={sub}>{c.desc}</div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : <div style={sub}>Hẻm đang chỉ có tiệm bạn{biz.rivalsBeaten ? ` · đã đánh bại ${biz.rivalsBeaten} đối thủ` : ''}. Thỉnh thoảng sẽ có tiệm mới mở.</div>}
      </div>

      {biz.rivalForSale && !biz.rival && (
        <div style={{ ...card, marginBottom: 0, gridColumn: '1 / -1', border: '1px solid #f1c40f' }}>
          <div style={title}>🏢 Mặt bằng "{biz.rivalForSale.name}" chào bán lại</div>
          <div style={sub}>
            Rival vừa đóng cửa, chủ tiệm bán lại mặt bằng {formatMoney(biz.rivalForSale.price)}
            {branch
              ? ' — mua về thì chi nhánh nhận thêm một chuyến hàng lớn từ kho chung và khách cũ của họ ghé tiệm bạn đông hơn 7 ngày.'
              : ' — mua về là có ngay chi nhánh thứ hai, không mất tiền mở cửa hàng tiện lợi (5 triệu).'}
            {' '}Hết ngày {biz.rivalForSale.until} không mua thì người khác thuê mất.
          </div>
          <button style={{ ...btn, background: money >= biz.rivalForSale.price ? '#f1c40f' : '#555' }} onClick={buyRivalShop}>
            🏢 Mua lại mặt bằng ({formatMoney(biz.rivalForSale.price)})
          </button>
        </div>
      )}

      <div style={{ ...card, marginBottom: 0 }}>
        <div style={{ ...row, ...title }}>
          <span>🎫 Thẻ tích điểm</span>
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
      </div>

      <div style={{ ...card, marginTop: 8 }}>
        <div style={title}>📢 Quảng cáo</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 6 }}>
          {ADS.map((a) => {
            const on = running.find((x) => x.id === a.id);
            const locked = level < a.unlock;
            return (
              <div
                key={a.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 8,
                  background: on ? 'rgba(46,204,113,0.12)' : 'rgba(0,0,0,0.18)',
                  border: `1px solid ${on ? 'rgba(46,204,113,0.45)' : 'transparent'}`, opacity: locked ? 0.5 : 1,
                }}
              >
                <div style={iconTile}>{locked ? '🔒' : a.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{a.name}</div>
                  <div style={{ ...sub, fontSize: 11 }}>{a.desc}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    <span style={{ ...pill, background: 'rgba(241,196,15,0.18)', color: '#f1c40f' }}>+{Math.round((a.traffic - 1) * 100)}% khách</span>
                    <span style={{ ...pill, background: 'rgba(255,255,255,0.1)' }}>{a.days} ngày</span>
                  </div>
                </div>
                {locked ? <span style={{ ...pill, background: 'rgba(255,255,255,0.1)' }}>Cấp {a.unlock}</span>
                  : on ? <span style={{ ...pill, background: 'rgba(46,204,113,0.2)', color: '#2ecc71' }}>✓ Tới ngày {on.untilDay}</span>
                    : <button style={{ ...btn, marginLeft: 0, whiteSpace: 'nowrap', opacity: money < a.price ? 0.5 : 1 }} disabled={money < a.price} onClick={() => buyAd(a.id)}>{formatMoney(a.price)}</button>}
              </div>
            );
          })}
        </div>
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
            {(() => {
              const daily = loanInterest(loan.principal);
              const left = Math.max(0, loan.dueDay - day);
              const interestLeft = daily * left;
              const row = { display: 'flex', justifyContent: 'space-between', gap: 12 };
              return (
                <div style={{ display: 'grid', gap: 2, marginTop: 4, maxWidth: 420 }}>
                  <div style={row}><span>Nợ gốc</span><b>{formatMoney(loan.principal)}</b></div>
                  <div style={row}><span>Lãi mỗi tối ({(LOAN_DAILY_RATE * 100).toFixed(1)}%)</span><span>{formatMoney(daily)}</span></div>
                  <div style={row}><span>Lãi đã trả</span><span>{formatMoney(loan.interestPaid ?? 0)}</span></div>
                  <div style={row}><span>Lãi còn phải trả nếu giữ tới hạn ({left} ngày)</span><span>{formatMoney(interestLeft)}</span></div>
                  <div style={{ ...row, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 2 }}>
                    <span>Tổng còn phải trả tới hạn (ngày {loan.dueDay})</span><b>{formatMoney(loan.principal + interestLeft)}</b>
                  </div>
                </div>
              );
            })()}
            <div style={{ marginTop: 6 }}>
              <button style={{ ...btn, marginLeft: 0 }} onClick={() => repayLoan(Math.min(loan.principal, 500000))}>Trả 500.000đ</button>
              <button style={btn} onClick={() => repayLoan()}>Trả hết gốc {formatMoney(loan.principal)}</button>
            </div>
            {loanTopUps(level, loan.principal).length > 0 ? (
              <div style={{ marginTop: 4 }}>
                {loanTopUps(level, loan.principal).map((a) => <button key={a} style={{ ...btn, marginLeft: 0, marginRight: 6 }} onClick={() => takeLoan(a)}>Vay thêm {formatMoney(a)}</button>)}
              </div>
            ) : (
              <div style={sub}>Đã chạm hạn mức {formatMoney(loanLimit(level))} ở cấp này.</div>
            )}
            <div style={sub}>
              Lãi trừ vào tiền mỗi tối, trả bớt gốc thì lãi giảm theo. Vay thêm sẽ dời hạn trả thành 30 ngày kể từ hôm nay; hạn mức {formatMoney(loanLimit(level))}.
              Quá hạn ngân hàng sẽ tự trừ hết tiền gốc vào tài khoản.
            </div>
          </>
        ) : (
          <>
            <div style={sub}>
              Vay để mở rộng sớm. Lãi {(LOAN_DAILY_RATE * 100).toFixed(1)}%/ngày trên tiền còn nợ, hạn 30 ngày, trả sớm không mất phí.
              {loanOptions(level)[0] > 0 && ` Ví dụ vay ${formatMoney(loanOptions(level)[0])}: trả ${formatMoney(Math.round(loanOptions(level)[0] * LOAN_DAILY_RATE))}/ngày, giữ đủ 30 ngày thì tổng lãi ~${formatMoney(Math.round(loanOptions(level)[0] * LOAN_DAILY_RATE) * 30)}.`}
            </div>
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

/** Dịch vụ ở quầy: mua thiết bị một lần, khách ghé dùng dịch vụ và hay mua kèm. */
function Services() {
  const { biz, level, day, stats } = useGame();
  const owned = biz.services ?? [];
  return (
    <>
      <div style={card}>
        <b>🧾 Dịch vụ ở quầy</b>
        <div style={sub}>
          Không cần kệ: khách đi thẳng tới quầy, lãi mỗi lượt ít nhưng {Math.round(SERVICE_BUY_ALONG * 100)}% khách tiện tay mua kèm 1–2 món.
          Phải có người đứng quầy mới phục vụ được.
        </div>
        <div style={{ fontSize: 12, marginTop: 4 }}>Hôm nay lời từ dịch vụ: <b>{formatMoney(stats.services ?? 0)}</b></div>
      </div>
      {SERVICES.map((sv) => (
        <div key={sv.id} style={{ ...card, opacity: level < sv.unlock ? 0.5 : 1 }}>
          <div style={row}>
            <b>{sv.icon} {sv.name}</b>
            {owned.includes(sv.id) ? <span style={{ ...sub, color: '#2ecc71' }}>Đang chạy</span>
              : level < sv.unlock ? <span style={sub}>Cấp {sv.unlock}</span>
                : <button style={btn} onClick={() => buyService(sv.id)}>Mở · {formatMoney(sv.price)}</button>}
          </div>
          <div style={sub}>{sv.desc}</div>
          {sv.id === 'bills' && (
            <div style={{ fontSize: 12, marginTop: 2 }}>
              Hôm nay ngày {dayOfMonth(day)} trong tháng{dayOfMonth(day) <= BILL_RUSH_DAYS ? ' · 🔥 đầu tháng, khách đóng tiền đông gấp 4' : ` · đợt đông tới sau ${30 - dayOfMonth(day) + 1} ngày`}
            </div>
          )}
        </div>
      ))}
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

/** Tab nâng cấp: thiết bị mua một lần dùng vĩnh viễn. */
function Upgrades() {
  const { level, money, biz } = useGame();
  return (
    <>
      <div style={{ ...card, marginBottom: 8 }}>
        <b>🔧 Thiết bị của tiệm</b>
        <div style={sub}>Mua một lần dùng vĩnh viễn — tiền đốt cho giai đoạn về sau, mỗi món gắn với một hệ thống đã có.</div>
      </div>
      {UPGRADES.map((u) => {
        const owned = hasUpgrade(biz, u.id);
        return (
          <div key={u.id} style={card}>
            <div style={row}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={iconTile}>{u.icon}</div>
                <div>
                  <b>{u.name}</b>
                  <div style={sub}>{u.desc}</div>
                  {owned
                    ? <span style={{ ...pill, background: 'rgba(46,204,113,0.2)', color: '#2ecc71' }}>✓ Đã lắp</span>
                    : <div style={sub}>Giá {formatMoney(u.price)} · mở ở cấp {u.unlock}</div>}
                </div>
              </div>
              {!owned && (
                <button style={btn} disabled={level < u.unlock || money < u.price} onClick={() => buyUpgrade(u.id)}>
                  {level < u.unlock ? `Cần cấp ${u.unlock}` : `Mua ${formatMoney(u.price)}`}
                </button>
              )}
            </div>
          </div>
        );
      })}
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
