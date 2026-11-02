import { useState } from 'react';
import { useGame } from '../core/store';
import { buyHomeItem, buyService, buyPet, buyUpgrade, buyVehicle, feedPet, joinHui, repayLoan, takeLoan } from '../core/biz';
import { hasUpgrade, UPGRADES } from '../data/upgrades';
import { Callout } from './panels/shared';
import { BREAKFAST, HOME_ITEMS, HUI_COLLAPSE, HUI_OPTIONS, HUI_UNLOCK, LOAN_DAILY_RATE, LOAN_UNLOCK, loanInterest, loanLimit, loanOptions, loanTopUps, petActive, PETS, VEHICLES } from '../data/biz';
import { formatMoney, productById } from '../data/products';
import { BILL_RUSH_DAYS, dayOfMonth, SERVICE_BUY_ALONG, SERVICES } from '../data/services';
import { roiOf } from '../data/serviceRoi';
import { catPayoff, dogPayoff, CAT_PITCH_MIN } from '../data/petPayoff';
import { huiRoundSummary } from '../data/minorPayoff';
import { theftRisk, THEFT_LEAK_HIGH, THEFT_LEAK_MODERATE, THEFT_UNLOCK } from '../data/theftRisk';
import { Market } from './panels/MarketTab';
import { Week, Month } from './panels/PeriodTabs';
import { card, title, pill, iconTile, btn, sub, row } from './panels/businessStyles';
import { Achievements } from './panels/AchievementsTab';

const TABS = [
  ['market', '⚔️ Cạnh tranh'],
  ['services', '🧾 Dịch vụ'],
  ['money', '🏦 Vay & hụi'],
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

function Pets() {
  const { biz, day, level, storage, analytics, riskTrend } = useGame();
  // GĐ157: "Con này đáng bữa cơm không?" — quy công nuôi ra tiền, đối chiếu tiền thức ăn (thuần đọc).
  const cat = catPayoff(analytics, biz.pets, day, storage);
  const dog = dogPayoff(riskTrend);
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
              <div style={{ fontSize: 12, marginTop: 2, color: fed ? '#2ecc71' : '#e67e22' }}>
                {fed ? 'No bụng, đang làm việc' : 'Đói, không chịu làm việc'} · kho còn {storage[p.food] ?? 0} {productById(p.food).name} (không có thì mua lẻ giá gấp đôi)
              </div>
            )}
            {/* GĐ157: payoff thú cưng — số tiền là ƯỚC từ sổ hỏng hàng / sổ rủi ro có sẵn. */}
            {p.kind === 'cat' && pet && cat.verdict !== 'nothing-spoiled' && (
              <div style={{ fontSize: 12, marginTop: 4, borderTop: '1px dashed rgba(255,255,255,0.12)', paddingTop: 4 }}>
                <div>
                  Hôm qua cứu <b>~{formatMoney(cat.savedYesterday)}</b> hàng hỏng · bữa cơm hôm nay ~{formatMoney(cat.foodCostToday)} →{' '}
                  <b style={{ color: cat.savedYesterday >= cat.foodCostToday ? '#2ecc71' : '#e67e22' }}>
                    {cat.savedYesterday >= cat.foodCostToday ? `đang lời ~${formatMoney(cat.savedYesterday - cat.foodCostToday)}` : `đang lỗ ~${formatMoney(cat.foodCostToday - cat.savedYesterday)}`}
                  </b>
                </div>
                <div style={{ marginTop: 2 }}>
                  7 ngày: cứu <b>~{formatMoney(cat.savedWeek)}</b> —{' '}
                  {cat.verdict === 'saved' && <b style={{ color: '#2ecc71' }}>lời ~{formatMoney(cat.savedWeek - cat.foodWeek)}</b>}
                  {cat.verdict === 'breakeven' && <b style={{ color: '#f1c40f' }}>vừa đủ ăn</b>}
                  {cat.verdict === 'losing' && <b style={{ color: '#e67e22' }}>lỗ cơm ~{formatMoney(cat.foodWeek - cat.savedWeek)}</b>}
                  {' '}(thức ăn ~{formatMoney(cat.foodWeek)}).
                </div>
                {!fed && <div style={{ color: '#e67e22', marginTop: 2 }}>😾 Đói 1 ngày mất công dụng — cho ăn đều.</div>}
              </div>
            )}
            {p.kind === 'cat' && pet && cat.verdict === 'nothing-spoiled' && (
              <div style={{ fontSize: 12, marginTop: 4 }}>
                7 ngày qua kho sạch, không hỏng gì — chưa thấy công, thức ăn vẫn ~{formatMoney(cat.foodCostToday)}/ngày.
              </div>
            )}
            {p.kind === 'cat' && !pet && cat.weekSpoilCost >= CAT_PITCH_MIN && (
              <Callout tone="danger" strong style={{ marginTop: 4 }}>
                <div style={{ fontSize: 12 }}>
                  🥀 Tuần này hàng hỏng <b>~{formatMoney(cat.weekSpoilCost)}</b> — nuôi mèo cứu được ~1/4 (~{formatMoney(Math.round(cat.weekSpoilCost * 0.25))}) với ~{formatMoney(cat.foodCostToday)}/ngày thức ăn.
                </div>
              </Callout>
            )}
            {p.kind === 'dog' && pet && dog.days > 0 && dog.weekBlocked > 0 && (
              <div style={{ fontSize: 12, marginTop: 4, borderTop: '1px dashed rgba(255,255,255,0.12)', paddingTop: 4 }}>
                🛡️ Tuần này chặn/thu lại <b>~{formatMoney(dog.weekBlocked)}</b> trộm & tiền giả.
                <div style={{ ...sub, marginTop: 2 }}>Sổ rủi ro chung cả tiệm (gồm cả camera, mắt tinh) — không tách riêng được công con chó.</div>
              </div>
            )}
            {p.kind === 'dog' && pet && dog.days > 0 && dog.weekBlocked <= 0 && dog.weekLeak > 0 && (
              <div style={{ fontSize: 12, marginTop: 4 }}>
                🛡️ Tuần này lọt <b>~{formatMoney(dog.weekLeak)}</b>, chưa chặn được gì — chó giữ cửa giúp giảm nguy cơ.
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
          {owned.includes(sv.id) && (() => {
            const roi = roiOf(sv, biz.serviceLife, stats.byService);
            const goal = roi.paidBack
              ? <span style={{ color: '#2ecc71' }}>đã hoàn vốn ✓</span>
              : <span style={{ color: '#f1c40f' }}>còn kém {formatMoney(roi.deficit)} nữa là hoàn vốn{roi.daysToRecoup ? ` (~${roi.daysToRecoup} ngày theo nhịp hôm nay)` : ''}</span>;
            return (
              <div style={{ fontSize: 12, marginTop: 2 }}>
                Đã lời {formatMoney(roi.life)} · hôm nay {roi.today >= 0 ? '+' : ''}{formatMoney(roi.today)} · {goal}
              </div>
            );
          })()}
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
  const { level, money, biz, stats, day } = useGame();
  return (
    <>
      <div style={{ ...card, marginBottom: 8 }}>
        <b>🔧 Thiết bị của tiệm</b>
        <div style={sub}>Mua một lần dùng vĩnh viễn — tiền đốt cho giai đoạn về sau, mỗi món gắn với một hệ thống đã có.</div>
      </div>
      {UPGRADES.map((u) => {
        const owned = hasUpgrade(biz, u.id);
        const cameraRisk = u.id === 'camera' && level >= THEFT_UNLOCK
          ? theftRisk({
              level, customers: stats.customers, revenue: stats.revenue,
              hasCamera: owned, hasDog: !!petActive(biz.pets?.dog, day),
            })
          : null;
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
            {cameraRisk && (
              <Callout
                tone={cameraRisk.hasCamera ? 'ok' : cameraRisk.leakExposureToday >= THEFT_LEAK_HIGH ? 'danger' : cameraRisk.leakExposureToday >= THEFT_LEAK_MODERATE ? 'warn' : 'info'}
                style={{ marginTop: 8 }}
                title={cameraRisk.hasCamera
                  ? '📹 Đã lắp camera — kẻ trộm né tiệm'
                  : `🦹 Mỗi ngày trộm rút ~${formatMoney(cameraRisk.leakExposureToday)} hàng`}
              >
                <div style={{ marginTop: 2, fontSize: 12 }}>
                  {cameraRisk.hasCamera
                    ? 'Đã lắp: kẻ trộm né tiệm (mất bớt ~30% vụ trộm).'
                    : `~${Math.round(cameraRisk.expectedThievesToday * 10) / 10} khách/ngày là kẻ trộm (giỏ trung bình ${formatMoney(cameraRisk.avgBasketRetail)}). Lắp camera kìm còn 70% → tiết kiệm ước ~${formatMoney(cameraRisk.cameraSavesPerDay)}/ngày, hoàn vốn sau ~${cameraRisk.cameraPaybackDays ?? '?'} ngày.`}
                </div>
              </Callout>
            )}
          </div>
        );
      })}
    </>
  );
}
