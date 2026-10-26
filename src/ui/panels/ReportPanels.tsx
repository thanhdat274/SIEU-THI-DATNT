import { ProductIcon } from '../ProductIcon';
import { useState } from 'react';
import { useGame, formatClock, type DayRecord, type ItemLine } from '../../core/store';
import { rentOf } from '../../data/shopTiers';
import { furnitureDef } from '../../data/furniture';
import { xpToNext } from '../../data/levels';
import { formatMoney, productById } from '../../data/products';
import { describeRep, meetsRep, REP_FACTORS, REP_INFO, REP_MIN_SAMPLES, reputationOf, type RepSample } from '../../data/reputation';
import { regularRep, regularById, regularsExpectedToday, REGULARS } from '../../data/regulars';
import { LOAN_DAILY_RATE } from '../../data/biz';
import { CREDIT_FRIENDSHIP, CREDIT_UNLOCK, creditLimit, DEBT_LATE_DAYS, DEBT_WRITE_OFF_DAYS } from '../../data/credit';
import { ACTION_LABEL, expiringSoon, expiryAdvice, peakAdvice, peakHours, walkoutAdvice, type Advice, type HourStat } from '../../data/advice';
import { dateOfDoy, dayEffects, dayOfYear, festivalStock, upcomingFestival } from '../../data/calendar';
import { trending } from '../../data/suppliers';
import { describeDay, WEATHER } from '../../data/weather';
import { missingForContract, SUPPLY_CONTRACTS, supplyContractById } from '../../data/contracts';
import { PHONE_SLOTS } from '../../data/phoneOrders';
import { paymentById, type PaymentMethod } from '../../data/payments';
import { Stat, starColor, Footer, Swatch, styles, Tabs } from './shared';

export function SummaryPanel({ day }: { day: number }) {
  const panel = useGame((s) => s.panel);
  const { level, xp, history, closePanel, openPanel, storage, storageLots, furniture, priceOf } = useGame();
  const [tab, setTab] = useState<'overview' | 'items'>('overview');
  if (panel?.type !== 'summary') return null;
  const st = panel.stats;
  const profit = st.revenue - st.spent - st.wages - (st.rent ?? 0) - (st.fees ?? 0);
  const methods = (Object.entries(st.byMethod ?? {}) as [PaymentMethod, { revenue: number; count: number }][])
    .sort((a, b) => b[1].revenue - a[1].revenue);
  const lines = Object.entries(st.byItem ?? {}).map(([id, l]) => ({ id, ...l, gross: l.revenue - l.cost }));
  const goodsRevenue = lines.reduce((n, l) => n + l.revenue, 0);
  const goodsCost = lines.reduce((n, l) => n + l.cost, 0);
  const best = [...lines].sort((a, b) => b.qty - a.qty)[0];
  const richest = [...lines].sort((a, b) => b.gross - a.gross)[0];
  const missed = st.missed ?? {};
  const missTotal = (missed.stock ?? 0) + (missed.price ?? 0) + (missed.wait ?? 0) + (missed.expired ?? 0);
  const { hours, peak, quiet } = peakHours(st.byHour);
  const timeAdvice = peakAdvice(peak, missed.wait ?? 0);
  // Gợi ý giờ cao điểm đã nói chuyện chờ lâu thì bỏ dòng chờ lâu chung chung
  const advice = walkoutAdvice(st.missLog ?? {}, storage, priceOf)
    .filter((a) => !(timeAdvice[0]?.action === 'staff' && a.action === 'staff'))
    .concat(timeAdvice);
  const expiring = expiringSoon(storage, storageLots, furniture.flatMap((f) => f.tiers));
  const expiryTips = expiryAdvice(expiring);
  const act = (a: Advice) => a.action && openPanel({ type: a.action });
  const tabs = [['overview', 'Tổng quan'], ['items', `Theo món (${lines.length})`]] as const;
  const shopName = useGame((s) => s.shopName);
  return (
    <>
      <h2 style={styles.title}>🌙 {shopName} · Tổng kết ngày {day}</h2>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'overview' ? (
        <>
          <table style={{ ...styles.table, fontSize: 15 }}>
            <tbody>
              <tr><td style={styles.left}>Doanh thu</td><td>{formatMoney(st.revenue)}</td></tr>
              {!!st.comboDiscount && <tr><td style={styles.left}>  trong đó đã giảm cho {st.combos} combo</td><td style={{ opacity: 0.75 }}>-{formatMoney(st.comboDiscount)}</td></tr>}
              <tr><td style={styles.left}>Lãi gộp trên hàng bán (giá bán − giá nhập)</td><td style={{ color: '#2ecc71' }}>{formatMoney(goodsRevenue - goodsCost - (st.comboDiscount ?? 0))}</td></tr>
              <tr><td style={styles.left}>Chi tiêu (nhập hàng, nội thất)</td><td>-{formatMoney(st.spent)}</td></tr>
              <tr><td style={styles.left}>Lương nhân viên</td><td>-{formatMoney(st.wages)}</td></tr>
              <tr><td style={styles.left}>Tiền nhà (theo bậc tiệm)</td><td>-{formatMoney(st.rent ?? 0)}</td></tr>
              <tr>
                <td style={styles.left}><b>Tiền vào − tiền ra</b></td>
                <td style={{ color: profit >= 0 ? '#2ecc71' : '#e74c3c' }}><b>{formatMoney(profit)}</b></td>
              </tr>
              {!!st.credited && <tr><td style={styles.left}>  trong đó khách quen ghi sổ (chưa thu)</td><td style={{ color: '#e17055' }}>{formatMoney(st.credited)}</td></tr>}
              {!!st.repaid && <tr><td style={styles.left}>Thu nợ cũ</td><td style={{ color: '#2ecc71' }}>+{formatMoney(st.repaid)}</td></tr>}
              <tr><td style={styles.left}>Món đã bán</td><td>{st.itemsSold}</td></tr>
              {!!st.online && (
                <tr><td style={styles.left}>📲 Bán online (sau hoa hồng)</td><td>{formatMoney(st.online)}{st.grabFees ? ` · phí Grab -${formatMoney(st.grabFees)}` : ''}</td></tr>
              )}
              {!!(st.shrinkCash || st.shrinkItems) && (
                <tr>
                  <td style={styles.left} title="Két thiếu tiền hoặc kho hụt hàng mà không ai biết vì sao — có thể có người tắt mắt">🕵️ Thất thoát không rõ</td>
                  <td style={{ color: '#e17055' }}>{[st.shrinkCash ? formatMoney(st.shrinkCash) : '', st.shrinkItems ? `${st.shrinkItems} món` : ''].filter(Boolean).join(' · ')}</td>
                </tr>
              )}
              {!!st.spoiledItems && (
                <tr><td style={styles.left}>Hàng hết hạn bỏ đi</td><td style={{ color: '#e17055' }}>{st.spoiledItems} món (vốn {formatMoney(st.spoiledCost ?? 0)})</td></tr>
              )}
              <tr><td style={styles.left}>Khách ghé</td><td>{st.customers} ({st.unhappy} không hài lòng)</td></tr>
              <tr><td style={styles.left}>Kinh nghiệm</td><td>+{st.xp} XP · Cấp {level} ({xp}/{xpToNext(level)})</td></tr>
            </tbody>
          </table>
          {methods.length > 0 && (
            <>
              <h3 style={{ margin: '12px 0 4px', fontSize: 14 }}>💳 Tiền vào theo hình thức thanh toán</h3>
              <table style={{ ...styles.table, fontSize: 13 }}>
                <tbody>
                  {methods.map(([id, m]) => {
                    const def = paymentById(id);
                    return (
                      <tr key={id} title={def.desc}>
                        <td style={styles.left}>{def.icon} {def.name} <span style={{ opacity: 0.6 }}>· {m.count} lượt</span></td>
                        <td>{formatMoney(m.revenue)} <span style={{ opacity: 0.6 }}>({st.revenue ? Math.round((m.revenue / st.revenue) * 100) : 0}%)</span></td>
                      </tr>
                    );
                  })}
                  {!!st.fees && (
                    <tr title="Phí ví điện tử / máy POS đã trừ khỏi tiền thật về">
                      <td style={styles.left}>↳ Phí thanh toán</td>
                      <td style={{ color: '#e17055' }}>-{formatMoney(st.fees)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 6, marginTop: 10, maxWidth: 560 }}>
            {best && <Stat icon="🔥" label="Bán chạy nhất" value={`${productById(best.id).name} · ${best.qty} món`} />}
            {richest && <Stat icon="💰" label="Lãi nhiều nhất" value={`${productById(richest.id).name} · ${formatMoney(richest.gross)}`} />}
            {missTotal > 0 && (
              <Stat icon="😞" label={`Lỡ ${missTotal} lượt bán`}
                value={[missed.stock && `${missed.stock} hết hàng`, missed.price && `${missed.price} chê đắt`, missed.wait && `${missed.wait} chờ lâu bỏ về`, missed.expired && `${missed.expired} ngại hàng cận hạn`].filter(Boolean).join(' · ')} />
            )}
          </div>
          {hours.length > 0 && <HourChart hours={hours} peak={peak?.hour} quiet={quiet?.hour} />}
          {expiryTips.length > 0 && (
            <AdviceCard title={`🥀 Hàng sắp hỏng (${expiring.reduce((n, l) => n + l.qty, 0)} món)`} items={expiryTips} onAct={act} />
          )}
          {advice.length > 0 && <AdviceCard title="💡 Vì sao khách không mua được · nên làm gì" items={advice} onAct={act} />}
          <HistoryChart history={history} />
        </>
      ) : (
        <ItemTable lines={lines} />
      )}
      <p style={{ ...styles.sub, marginTop: 12 }}>💾 Đã tự động lưu game. "Tiền vào − tiền ra" tính cả tiền nhập hàng để bán những ngày sau, nên có hôm âm dù bán có lãi.</p>
      <Footer onClose={() => openPanel({ type: 'morning' })} closeLabel="☀️ Sang ngày mới · xem sổ đầu ngày" />
    </>
  );
}

/**
 * Sổ đầu ngày: mọi thứ cần biết để chuẩn bị trong một màn hình — dịp lễ, hàng hot,
 * khách quen dự kiến ghé (và món họ thích còn trong kho không), lời hẹn giữ món,
 * hợp đồng tới kỳ giao và khe giờ điện thoại. Chỉ liệt kê, không tự quyết thay người chơi.
 */
export function MorningPanel() {
  const {
    day, level, weatherSeed, weather, forecast, regulars, reservations, storage,
    furniture, staff, contracts, deliveries, shopTier, closePanel, openPanel, repLog,
    storageLots, debts, biz,
  } = useGame();
  const shopName = useGame((s) => s.shopName);
  const rep = reputationOf(repLog);
  const effects = dayEffects(weatherSeed, day, level);
  const soon = upcomingFestival(day);
  const hot = trending(day, level).filter((id) => !effects.hot.includes(id));
  const expected = regularsExpectedToday(day, weatherSeed, level, regulars, rep);
  const resList = Object.entries(reservations).filter(([, r]) => r.day === day);
  const haveStock = (id: string) => (storage[id] ?? 0) > 0 || furniture.some((f) => f.tiers.some((t) => t.productId === id && t.count > 0))
    || deliveries.some((d) => (d.items[id] ?? 0) > 0);
  const dueContracts = Object.entries(contracts)
    .map(([id, cs]) => ({ cs, def: supplyContractById(cs.defId) }))
    .filter(({ cs, def }) => def && cs.dueDay <= day + 1);
  const courier = staff.some((w) => w.role === 'courier');
  const pct = (x: number) => `${x >= 1 ? '+' : ''}${Math.round((x - 1) * 100)}%`;
  const today = dateOfDoy(dayOfYear(day));
  const expiring = expiringSoon(storage, storageLots, furniture.flatMap((f) => f.tiers));
  const expiryTips = expiryAdvice(expiring);
  const dueDebts = expected
    .map((r) => ({ r, debt: debts[r.id] }))
    .filter(({ debt }) => debt && debt.amount > 0);
  const favsOf = (rid: string) => {
    const def = REGULARS.find((x) => x.id === rid);
    return def ? def.favorites.filter((id) => productById(id).unlock <= level) : [];
  };
  return (
    <>
      <h2 style={styles.title}>☀️ {shopName} · Sổ đầu ngày {day} ({today.day}/{today.month})</h2>
      <p style={styles.sub}>
        {WEATHER[weather].icon} Hôm nay {describeDay(weatherSeed, day, weather)} · mai {WEATHER[forecast[0]].icon} {describeDay(weatherSeed, day + 1, forecast[0])}.
        Đọc xong nên nhập hàng bày kệ trước khi mở cửa — khách quen ghé đúng giờ quen.
        🏠 Tiền nhà trả cuối ngày: <b>{formatMoney(rentOf(shopTier))}</b>.
      </p>

      {biz.loan && (
        <div style={{ ...styles.card, display: 'block', marginBottom: 8, outline: biz.loan.dueDay - day <= 3 ? '2px solid #e74c3c' : undefined }}>
          <b>🏦 Đang nợ ngân hàng {formatMoney(biz.loan.principal)}</b>
          <div style={{ fontSize: 12, marginTop: 2 }}>
            Tối nay trừ lãi {formatMoney(Math.round(biz.loan.principal * LOAN_DAILY_RATE))} · hạn trả ngày {biz.loan.dueDay} (còn {Math.max(0, biz.loan.dueDay - day)} ngày)
            · trả gốc ở Kinh doanh → Vay &amp; hụi.
          </div>
        </div>
      )}
      {biz.hui && (
        <div style={{ ...styles.card, display: 'block', marginBottom: 8 }}>
          <b>🤝 Đang góp hụi {formatMoney(biz.hui.daily)}/ngày</b>
          <div style={{ fontSize: 12, marginTop: 2 }}>
            Đã góp {biz.hui.paidDays}/{biz.hui.members} ngày{!biz.hui.received && ` · ngày ${biz.hui.turnDay} tới lượt hốt ${formatMoney(biz.hui.daily * biz.hui.members)}`}.
          </div>
        </div>
      )}

      {effects.festival && (
        <div style={{ ...styles.card, display: 'block', marginBottom: 8, outline: '2px solid #f1c40f' }}>
          <b>{effects.festival.icon} {effects.festival.name} đang diễn ra</b>
          <div style={{ fontSize: 12, marginTop: 2 }}>
            👥 khách {pct(effects.festival.traffic)}{effects.festival.cost !== 1 && ` · 💰 giá nhập ${pct(effects.festival.cost)}`}
            {effects.festival.tolerance && ' · 😤 khách chịu giá cao'}
          </div>
          {festivalStock(effects.festival, level).length > 0 && (
            <div style={{ fontSize: 12, marginTop: 2 }}>
              Hàng nên bày sẵn: {festivalStock(effects.festival, level).map((id) => `${productById(id).name}${haveStock(id) ? ' ✓' : ' ⚠️ kho không có'}`).join(', ')}
            </div>
          )}
        </div>
      )}
      {effects.hot.length > 0 && (
        <div style={{ ...styles.card, display: 'block', marginBottom: 8 }}>
          <b>🎯 Hàng của dịp hôm nay</b>
          <div style={{ fontSize: 12, marginTop: 2 }}>{effects.hot.map((id) => `${productById(id).name}${haveStock(id) ? ' ✓' : ' ⚠️ chưa có'}`).join(', ')}</div>
        </div>
      )}
      {hot.length > 0 && (
        <div style={{ ...styles.card, display: 'block', marginBottom: 8 }}>
          <b>🔥 Hàng hot tuần này</b>
          <div style={{ fontSize: 12, marginTop: 2 }}>{hot.map((id) => `${productById(id).name}${haveStock(id) ? ' ✓' : ' ⚠️ chưa có'}`).join(', ')}</div>
        </div>
      )}
      {soon && (
        <div style={{ ...styles.card, display: 'block', marginBottom: 8 }}>
          <b>⏳ {soon.festival.icon} {soon.festival.name} {soon.inDays === 1 ? 'ngày mai' : `sau ${soon.inDays} ngày`}</b>
          <div style={{ fontSize: 12, marginTop: 2 }}>Nên nhập sẵn: {festivalStock(soon.festival, level).map((id) => productById(id).name).join(', ') || '—'}</div>
        </div>
      )}

      <h3 style={{ margin: '10px 0 4px', fontSize: 14 }}>💛 Khách quen dự kiến ghé hôm nay ({expected.length})</h3>
      {expected.length === 0 && <p style={styles.sub}>Không ai trong nhóm khách quen có lịch ghé hôm nay.</p>}
      <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
        {expected.map((r) => {
          const prog = regulars[r.id];
          const res = reservations[r.id];
          const favs = favsOf(r.id);
          return (
            <div key={r.id} style={{ ...styles.card, display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <b><Swatch color={r.color} /> {r.name}</b>
                <span style={{ fontSize: 12, opacity: 0.7 }}>{formatClock(r.visitFrom)}–{formatClock(r.visitUntil)}{res ? ' · 🤝 đang giữ món hẹn' : ''}</span>
              </div>
              <div style={{ fontSize: 12, marginTop: 2 }}>
                Món thích: {favs.length
                  ? favs.map((id) => `${prog?.discovered.includes(id) || res?.productId === id ? productById(id).name : '???'}${haveStock(id) ? ' ✓' : ' ⚠️'}`).join(', ')
                  : 'chưa biết'}
              </div>
            </div>
          );
        })}
      </div>

      {dueDebts.length > 0 && (
        <>
          <h3 style={{ margin: '10px 0 4px', fontSize: 14 }}>📒 Nợ của khách quen ghé hôm nay</h3>
          <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
            {dueDebts.map(({ r, debt }) => debt && (
              <div key={r.id} style={{ ...styles.card }}>
                <span style={{ flex: 1, fontSize: 13 }}>
                  <b>{r.name}</b> nợ <b>{formatMoney(debt.amount)}</b> từ ngày {debt.since}
                  {day - debt.since >= DEBT_LATE_DAYS && <span style={{ color: '#ff8a7a' }}> · quá {DEBT_LATE_DAYS} ngày, mất hẳn sau ngày {debt.since + DEBT_WRITE_OFF_DAYS}</span>}
                  {debt.reminded && ' · đã nhắc, lần này chắc trả'}
                </span>
                {!debt.reminded && <button style={styles.btn} onClick={() => useGame.getState().remindDebt(r.id)}>Nhắc nợ</button>}
              </div>
            ))}
          </div>
        </>
      )}

      {expiring.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <AdviceCard title={`🥀 Hàng sắp hỏng (${expiring.reduce((n, l) => n + l.qty, 0)} món)`} items={expiryTips} onAct={(a) => a.action && openPanel({ type: a.action })} />
        </div>
      )}

      {resList.length > 0 && (
        <>
          <h3 style={{ margin: '10px 0 4px', fontSize: 14 }}>🤝 Lời hẹn giữ món hôm nay</h3>
          <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
            {resList.map(([rid, r]) => (
              <div key={rid} style={{ ...styles.card }}>
                <span style={{ flex: 1, fontSize: 13 }}>
                  Giữ <b>{r.qty} {productById(r.productId).name}</b> cho {regularById(rid)?.name}
                  {haveStock(r.productId) ? ' — kho/kệ đủ ✓' : ' — ⚠️ chưa có hàng, nhập hoặc bày ngay'}
                </span>
                <button style={styles.btn} onClick={() => useGame.getState().cancelReservation(rid)}>Huỷ hẹn</button>
              </div>
            ))}
          </div>
        </>
      )}

      {dueContracts.length > 0 && (
        <>
          <h3 style={{ margin: '10px 0 4px', fontSize: 14 }}>🚚 Hợp đồng tới kỳ giao</h3>
          <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
            {dueContracts.map(({ cs, def }) => def && (
              <div key={cs.defId} style={{ ...styles.card }}>
                <span style={{ flex: 1, fontSize: 13 }}>
                  <b>{def.title}</b> · hạn ngày {cs.dueDay}
                  {(() => {
                    const missing = missingForContract(def, storage);
                    return missing.length
                      ? <span style={{ color: '#ff8a7a' }}> · thiếu: {missing.map((m) => `${m.need} ${productById(m.id).name}`).join(', ')}</span>
                      : <span style={{ color: '#2ecc71' }}> · kho đủ hàng ✓</span>;
                  })()}
                </span>
                <button style={styles.btn} onClick={() => openPanel({ type: 'contracts' })}>Xem</button>
              </div>
            ))}
          </div>
        </>
      )}

      <h3 style={{ margin: '10px 0 4px', fontSize: 14 }}>📞 Điện thoại</h3>
      <p style={styles.sub}>
        {courier
          ? `Hôm nay có ${PHONE_SLOTS.length} khe giờ hàng xóm gọi điện đặt hàng: ${PHONE_SLOTS.map((m) => formatClock(m)).join(', ')}. Nghe máy kịp mới có đơn.`
          : `Chưa thuê 🛵 Giao hàng nên không có cuộc gọi nào. Thuê nhân viên giao hàng để mở đơn điện thoại (khe giờ: ${PHONE_SLOTS.map((m) => formatClock(m)).join(', ')}).`}
      </p>
      <Footer onClose={closePanel}>
        <button style={styles.btn} onClick={() => openPanel({ type: 'order' })}>📦 Nhập hàng</button>
        <button style={styles.btn} onClick={() => openPanel({ type: 'storage' })}>🏭 Kho</button>
      </Footer>
    </>
  );
}

/** Sổ nợ: khách quen ghi sổ, nhắc nợ hoặc xoá nợ; bật/tắt cho ghi sổ. */
export function DebtBook() {
  const { level, day, debts, regulars, allowCredit, setAllowCredit, remindDebt, forgiveDebt } = useGame();
  if (level < CREDIT_UNLOCK) return null;
  const rows = Object.entries(debts).filter(([, d]) => d.amount > 0);
  const total = rows.reduce((n, [, d]) => n + d.amount, 0);
  return (
    <div style={{ ...styles.card, display: 'block', maxWidth: 560, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <b>📒 Sổ nợ {rows.length ? `· ${formatMoney(total)}` : ''}</b>
        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={allowCredit} onChange={(e) => setAllowCredit(e.target.checked)} /> Cho ghi sổ
        </label>
      </div>
      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
        Khách quen từ {CREDIT_FRIENDSHIP} 💛 có lúc quên ví, xin ghi sổ (hạn mức theo độ thân). Thường lần ghé sau sẽ trả.
        Quá {DEBT_LATE_DAYS} ngày nên nhắc nợ; quá {DEBT_WRITE_OFF_DAYS} ngày coi như mất.
      </div>
      {!rows.length && <div style={{ fontSize: 12, marginTop: 4 }}>Chưa ai nợ.</div>}
      {rows.map(([id, d]) => {
        const r = regularById(id);
        const age = day - d.since;
        return (
          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 13 }}>
            <span style={{ flex: 1 }}>
              {r?.name}: <b>{formatMoney(d.amount)}</b>
              <span style={{ opacity: 0.7, fontSize: 12, color: age >= DEBT_LATE_DAYS ? '#e17055' : undefined }}> · {age} ngày · hạn mức {formatMoney(creditLimit(regulars[id]))}{d.reminded ? ' · đã nhắc' : ''}</span>
            </span>
            <button style={styles.btn} disabled={d.reminded} onClick={() => remindDebt(id)} title="Lần ghé tới chắc chắn trả, nhưng khách hơi ngại">Nhắc nợ</button>
            <button style={styles.btn} onClick={() => forgiveDebt(id)} title="Mất tiền nhưng khách thân hơn">Xoá nợ</button>
          </div>
        );
      })}
    </div>
  );
}

export function AdviceCard({ title, items, onAct }: { title: string; items: Advice[]; onAct: (a: Advice) => void }) {
  return (
    <div style={{ ...styles.card, display: 'block', marginTop: 10, maxWidth: 560 }}>
      <b style={{ fontSize: 13 }}>{title}</b>
      {items.map((a, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 4 }}>
          <span style={{ flex: 1 }}>{a.icon} {a.text}</span>
          {a.action && <button style={{ ...styles.btn, whiteSpace: 'nowrap' }} onClick={() => onAct(a)}>{ACTION_LABEL[a.action]}</button>}
        </div>
      ))}
    </div>
  );
}

/** Khách ghé theo giờ: cột cao nhất là giờ đông nhất. */
export function HourChart({ hours, peak, quiet }: { hours: HourStat[]; peak?: number; quiet?: number }) {
  const max = Math.max(1, ...hours.map((h) => h.customers));
  return (
    <div style={{ ...styles.card, display: 'block', marginTop: 10, maxWidth: 560 }}>
      <b style={{ fontSize: 13 }}>🕒 Khách theo giờ</b>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 70, marginTop: 6 }}>
        {hours.map((h) => (
          <div key={h.hour} title={`${h.hour}h: ${h.customers} khách · ${formatMoney(h.revenue)}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 10 }}>{h.customers || ''}</span>
            <div style={{ width: '100%', height: `${(h.customers / max) * 50}px`, minHeight: h.customers ? 2 : 0, borderRadius: 3, background: h.hour === peak ? '#e67e22' : h.hour === quiet ? '#95a5a6' : '#3498db' }} />
            <span style={{ fontSize: 10, opacity: 0.7 }}>{h.hour}h</span>
          </div>
        ))}
      </div>
      {peak !== undefined && (
        <div style={{ fontSize: 12, marginTop: 4 }}>
          🟠 Đông nhất {peak}h–{peak + 1}h{quiet !== undefined && <> · ⚪ vắng nhất {quiet}h–{quiet + 1}h (lúc rảnh để dọn dẹp, châm hàng)</>}
        </div>
      )}
    </div>
  );
}

/** Danh tiếng 5 mặt, mặt yếu nhất kèm cách sửa, và những gì danh tiếng đang mở hoặc còn khoá. */
export function ReputationCard({ log }: { log: RepSample[] }) {
  const { level, regulars } = useGame();
  const rep = reputationOf(log);
  const gated = [
    ...SUPPLY_CONTRACTS.filter((c) => c.rep && c.unlock <= level + 5).map((c) => ({ name: `${c.icon} Hợp đồng ${c.title}`, need: c.rep! })),
    ...REGULARS.filter((r) => !regulars[r.id]?.visits && r.unlock <= level + 5 && regularRep(r)).map((r) => ({ name: `💛 Khách quen ${r.name}`, need: regularRep(r)! })),
  ].filter((g) => !meetsRep(rep, g.need)).slice(0, 4);
  return (
    <div style={{ ...styles.card, display: 'block', marginBottom: 10, maxWidth: 560 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <b>⭐ Danh tiếng {rep.overall.toFixed(1)}★</b>
        <span style={{ fontSize: 12, opacity: 0.7 }}>{rep.samples} lượt khách gần nhất</span>
      </div>
      {rep.samples < REP_MIN_SAMPLES && <div style={{ fontSize: 12, opacity: 0.75 }}>Cần ít nhất {REP_MIN_SAMPLES} lượt khách mới chấm được, tạm tính 3★.</div>}
      {REP_FACTORS.map((k) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 4 }}>
          <span style={{ width: 130 }}>{REP_INFO[k].icon} {REP_INFO[k].name}</span>
          <div style={{ flex: 1, height: 6, background: '#555', borderRadius: 3 }}>
            <div style={{ width: `${((rep.factors[k] - 1) / 4) * 100}%`, height: '100%', borderRadius: 3, background: starColor(Math.round(rep.factors[k])) }} />
          </div>
          <span style={{ width: 30, textAlign: 'right' }}>{rep.factors[k].toFixed(1)}</span>
        </div>
      ))}
      {rep.weakest && rep.factors[rep.weakest] < 4 && (
        <div style={{ fontSize: 12, marginTop: 6 }}>💡 Yếu nhất: <b>{REP_INFO[rep.weakest].name}</b>. {REP_INFO[rep.weakest].low}</div>
      )}
      {gated.length > 0 && (
        <div style={{ fontSize: 12, marginTop: 6 }}>
          🔒 Danh tiếng sẽ mở: {gated.map((g) => `${g.name} (${describeRep(g.need)})`).join(' · ')}
        </div>
      )}
      <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4 }}>Danh tiếng cao thì nhiều người đi đường ghé hơn, mở khách quen mới, hợp đồng và mục tiêu dịp lễ lớn.</div>
    </div>
  );
}

/** Bảng theo món: bấm tiêu đề để sắp xếp. */
export function ItemTable({ lines }: { lines: (ItemLine & { id: string; gross: number })[] }) {
  const [sort, setSort] = useState<'qty' | 'revenue' | 'gross'>('gross');
  if (!lines.length) return <p style={styles.sub}>Hôm nay chưa bán được món nào.</p>;
  const rows = [...lines].sort((a, b) => b[sort] - a[sort]);
  const head = (key: typeof sort, label: string) => (
    <th style={{ cursor: 'pointer', textDecoration: sort === key ? 'underline' : undefined }} onClick={() => setSort(key)}>{label}{sort === key ? ' ▾' : ''}</th>
  );
  return (
    <div style={{ overflowX: 'auto' }}>
    <table style={styles.table}>
      <thead>
        <tr><th style={styles.left}>Mặt hàng</th>{head('qty', 'Số món')}{head('revenue', 'Doanh thu')}{head('gross', 'Lãi gộp')}<th>Lãi/món</th></tr>
      </thead>
      <tbody>
        {rows.map((l) => {
          const p = productById(l.id);
          return (
            <tr key={l.id}>
              <td style={styles.left}><ProductIcon product={p} /> {p.name}</td>
              <td>{l.qty}</td>
              <td>{formatMoney(l.revenue)}</td>
              <td style={{ color: l.gross >= 0 ? '#2ecc71' : '#e74c3c' }}>{formatMoney(l.gross)}</td>
              <td style={{ opacity: 0.8 }}>{formatMoney(Math.round(l.gross / l.qty))}</td>
            </tr>
          );
        })}
      </tbody>
      </table>
    </div>
  );
}

/** Cột doanh thu và đường "tiền vào − tiền ra" của các ngày gần đây. */
export function HistoryChart({ history }: { history: DayRecord[] }) {
  if (history.length < 2) return null;
  const max = Math.max(1, ...history.map((h) => Math.max(h.revenue, Math.abs(h.profit))));
  const H = 70;
  return (
    <div style={{ marginTop: 12, maxWidth: 560 }}>
      <div style={{ fontSize: 12, marginBottom: 6, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 12px' }}>
        <span style={{ opacity: 0.75 }}>{history.length} ngày gần đây</span>
        {([['#f1c40f', 'Doanh thu'], ['#2ecc71', 'Tiền vào − ra: lãi'], ['#e74c3c', 'Tiền vào − ra: lỗ']] as const).map(([color, label]) => (
          <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <i style={{ width: 11, height: 11, borderRadius: 3, background: color, display: 'inline-block' }} />
            {label}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: H + 18 }}>
        {history.map((h) => (
          <div key={h.day} title={`Ngày ${h.day}: doanh thu ${formatMoney(h.revenue)}, tiền vào − ra ${formatMoney(h.profit)}, ${h.customers} khách`}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: H }}>
              <div style={{ width: 7, height: (h.revenue / max) * H, background: '#f1c40f', borderRadius: 2 }} />
              <div style={{ width: 7, height: (Math.abs(h.profit) / max) * H, background: h.profit >= 0 ? '#2ecc71' : '#e74c3c', borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 10, opacity: 0.6 }}>{h.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Sổ theo dõi: biểu đồ doanh thu – lãi – khách – sao của tối đa 30 ngày gần nhất (kèm số hôm nay đang chạy). */
export function HistoryPanel() {
  const { history, stats, day, closePanel } = useGame();
  const shelfHeat = useGame((s) => s.shelfHeat);
  const furnitureList = useGame((s) => s.furniture);
  const today: DayRecord = {
    day,
    revenue: stats.revenue,
    profit: stats.revenue - stats.spent - (stats.wages ?? 0) - (stats.rent ?? 0),
    customers: stats.customers,
    unhappy: stats.unhappy,
  };
  const days = [...history, today].slice(-14);
  const W = 620;
  const H = 190;
  const padL = 8;
  const padB = 22;
  const stepX = days.length > 1 ? (W - padL * 2) / (days.length - 1) : 0;
  const maxMoney = Math.max(...days.map((d) => Math.max(d.revenue, d.profit)), 1);
  const maxCust = Math.max(...days.map((d) => d.customers), 1);
  const x = (i: number) => padL + i * stepX;
  const yMoney = (v: number) => H - padB - (Math.max(v, 0) / maxMoney) * (H - padB - 10);
  const yCust = (v: number) => H - padB - (v / maxCust) * (H - padB - 10);
  const line = (pick: (d: DayRecord) => number) => days.map((d, i) => `${x(i)},${yMoney(pick(d))}`).join(' ');
  // Đường sao 1–5: vẽ trên cùng khung hình, càng cao càng tốt
  const rated = days.map((d, i) => ({ d, i })).filter(({ d }) => typeof d.rating === 'number');
  const ratingLine = rated.map(({ d, i }) => `${x(i)},${H - padB - ((d.rating! - 1) / 4) * (H - padB - 10)}`).join(' ');
  const best = [...days].sort((a, b) => b.profit - a.profit)[0];
  const avgProfit = days.reduce((n, d) => n + d.profit, 0) / days.length;
  const zero = H - padB;
  return (
    <>
      <h2 style={styles.title}>📈 Sổ theo dõi 30 ngày</h2>
      <p style={styles.sub}>Doanh thu và lãi từng ngày (lãi hôm nay chưa trừ lương/tiền nhà tới khi sang ngày mới). Cột xám là số lượt khách. Dùng để nhìn đà tăng trưởng: nhập thêm hàng thì doanh thu có nhích không, khách có đông dần không.</p>
      <svg width={W} height={H} style={{ maxWidth: '100%', background: '#fafbfc', borderRadius: 8, border: '1px solid #e3e6ea' }}>
        <line x1={padL} y1={zero} x2={W - padL} y2={zero} stroke="#d6dae0" />
        {days.map((d, i) => (
          <g key={d.day}>
            <rect x={x(i) - 6} y={yCust(d.customers)} width={12} height={Math.max(1, zero - yCust(d.customers))} fill="#d9dee5" opacity={0.9}>
              <title>{`Ngày ${d.day}: ${d.customers} lượt khách`}</title>
            </rect>
                <text x={x(i)} y={H - 6} textAnchor="middle" fontSize={10} fill="#8a919c">{d.day}</text>
          </g>
        ))}
        <polyline points={line((d) => d.revenue)} fill="none" stroke="#2e86de" strokeWidth={2} />
        <polyline points={line((d) => d.profit)} fill="none" stroke="#27ae60" strokeWidth={2} />
        {rated.length > 1 && <polyline points={ratingLine} fill="none" stroke="#f1c40f" strokeWidth={2} strokeDasharray="5 3" />}
      </svg>
      <p style={{ ...styles.sub, marginTop: 8 }}>
        <span style={{ color: '#2e86de' }}>━ Doanh thu</span> · <span style={{ color: '#27ae60' }}>━ Lãi</span> · <span style={{ color: '#c9a20a' }}>╌ ⭐ đánh giá</span> · ▮ Khách
      </p>
      <p style={styles.row}>
        🏆 Lãi nhất: <b>ngày {best.day}</b> — doanh thu {formatMoney(best.revenue)}, lãi {formatMoney(best.profit)}
      </p>
      <p style={styles.row}>📊 Lãi bình quân {days.length} ngày: <b>{formatMoney(avgProfit)}</b>/ngày · khách bình quân <b>{Math.round(days.reduce((n, d) => n + d.customers, 0) / days.length)}</b> lượt/ngày</p>
      {/* Heatmap vị trí kệ: kệ nào bán chạy nhất kể từ khi đặt (xem bản đồ màu ở màn 🏪 Sắp xếp → 🔥) */}
      {(() => {
        const ranked = furnitureList
          .filter((f) => furnitureDef(f.type).tiers > 0)
          .map((f) => ({ f, sold: shelfHeat[f.uid] ?? 0 }))
          .sort((a, b) => b.sold - a.sold);
        if (!ranked.length || ranked.every((r) => r.sold === 0)) return null;
        const top = ranked[0];
        const worst = ranked[ranked.length - 1];
        return (
          <p style={styles.row}>
            🔥 Kệ bán chạy nhất: <b>{furnitureDef(top.f.type).name}</b> ({top.sold} món)
            {worst.sold < top.sold && <> · kệ ế nhất: {furnitureDef(worst.f.type).name} ({worst.sold} món)</>}
            <> · xem bản đồ màu ở <b>🏪 Sắp xếp → 🔥</b>, kệ gần cửa/lối đi được khách để ý hơn</>
          </p>
        );
      })()}
      <Footer onClose={closePanel} />
    </>
  );
}
