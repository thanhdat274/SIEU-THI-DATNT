import { useState } from 'react';
import { useGame } from '../core/store';
import { joinHui, repayLoan, takeLoan } from '../core/biz';
import { HUI_COLLAPSE, HUI_OPTIONS, HUI_UNLOCK, LOAN_DAILY_RATE, LOAN_UNLOCK, loanInterest, loanLimit, loanOptions, loanTopUps } from '../data/biz';
import { formatMoney } from '../data/products';
import { huiRoundSummary } from '../data/minorPayoff';
import { Market } from './panels/MarketTab';
import { Week, Month } from './panels/PeriodTabs';
import { card, btn, sub, row } from './panels/businessStyles';
import { Achievements } from './panels/AchievementsTab';
import { Life, Pets, Services, Upgrades } from './panels/ShopLifeTabs';
import { StanceTab } from './panels/StanceTab';

const TABS = [
  ['market', '⚔️ Cạnh tranh'],
  ['services', '🧾 Dịch vụ'],
  ['money', '🏦 Vay & hụi'],
  ['stance', '🪧 Định vị'],
  ['week', '📊 Lãi lỗ'],
  ['month', '📆 Tháng'],
  ['pets', '🐾 Thú cưng'],
  ['life', '🏡 Nhà & xe'],
  ['upgrades', '🔧 Nâng cấp'],
  ['ach', '🏆 Thành tựu'],
] as const;

/** Bảng Kinh doanh: các hệ thống thêm (đối thủ, quảng cáo, tích điểm, vay, hụi, tuần, thú cưng, nhà, xe, thành tựu). */
export function BusinessPanel() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('market');
  return (
    // Khung cố định để mọi tab cùng kích thước, không co giãn theo nội dung.
    // width 100% + maxWidth (idiom GĐ95): 86vw ở 320px vượt content-box panel 7px làm cắt hàng tab.
    <div style={{ width: '100%', maxWidth: 760, minHeight: 'min(520px, 70vh)' }}>
      <h2 style={{ margin: '0 0 8px' }}>📈 Kinh doanh</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 4, padding: 4, marginBottom: 12, background: 'rgba(0,0,0,0.25)', borderRadius: 10 }}>
        {TABS.map(([id, label]) => (
          <button
            key={id}
            style={{
              padding: '7px 8px', borderRadius: 7, border: 0, cursor: 'pointer', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap',
              background: tab === id ? '#f1c40f' : 'transparent', color: tab === id ? '#222' : '#ddd',
              transition: 'background 0.12s, transform 0.08s',
            }}
            onClick={() => setTab(id)}
            onMouseEnter={(e) => { if (tab !== id) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = tab === id ? '#f1c40f' : 'transparent'; }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = ''; }}
          >{label}</button>
        ))}
      </div>
      <div>
        {tab === 'market' && <Market />}
        {tab === 'services' && <Services />}
        {tab === 'money' && <Money />}
        {tab === 'stance' && <StanceTab />}
        {tab === 'week' && <Week />}
        {tab === 'month' && <Month />}
        {tab === 'pets' && <Pets />}
        {tab === 'life' && <Life />}
        {tab === 'upgrades' && <Upgrades />}
        {tab === 'ach' && <Achievements />}
      </div>
    </div>
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
            {/* GĐ159: "đã góp bao nhiêu trong vòng này". contributed = daily × paidDays là số CHÍNH XÁC (mỗi tối
                trừ đúng daily rồi mới tăng paidDays — news vỡ hụi cũng tính vậy), không phải ước. Vòng đều tay hòa
                về danh nghĩa: góp đủ members ngày, hốt đúng 1 lần = cả vòng góp. Lệch audit 28/10: trong game này
                chủ hụi ôm trốn là MẤT THẬT phần đã góp (không có "lời từ người vỡ hụi") — chỗ có lời thật là giá
                trị thời điểm (hốt sớm thì được dùng tiền trước). */}
            {(() => {
              const hr = huiRoundSummary(hui);
              return (
                <div style={sub}>
                  Đã góp <b>{formatMoney(hr.contributed)}</b> trong vòng này · còn góp {hr.daysLeft} ngày nữa. Vòng đều tay thì
                  hòa (hốt 1 lần = cả vòng góp) — hốt sớm là có tiền dùng trước, còn chủ hụi ôm trốn thì mất thật phần đã góp.
                </div>
              );
            })()}
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
