import { useState } from 'react';
import { useGame } from '../core/store';
import {
  buyAd, buyHomeItem, buyRivalShop, buyService, buyPet, buyUpgrade, buyVehicle, feedPet, joinHui, repayLoan, setLoyalty, startCounter, takeLoan,
} from '../core/biz';
import { hasUpgrade, UPGRADES } from '../data/upgrades';
import { HistoryChart } from './Panels';
import {
  ACHIEVEMENTS, activeAds, ADS, adRoi, BREAKFAST, COUNTERS, HOME_ITEMS, HUI_COLLAPSE, HUI_OPTIONS, HUI_UNLOCK, LOAN_DAILY_RATE,
  LOAN_UNLOCK, loanInterest, loanLimit, loanOptions, loanTopUps, LOYALTY_OPTIONS, LOYALTY_UNLOCK, loyaltyPayoff, petActive, PETS,
  RIVAL_PERSONALITIES, RIVAL_UNLOCK, rivalLeverFlags, rivalMomentum, rivalTier, rivalTrafficFactor, VEHICLES, WEEK_DAYS, weeklyChallenge, weekPace, monthlyChallenge, emptyMonth,
} from '../data/biz';
import { monthOf } from '../data/calendar';
import { promoEffect } from '../data/analytics';
import { emptyYear, yearOf } from '../data/yearReport';
import { readAlmanac, nextAlmanacMilestone, almanacMilestoneReward, ALMANAC_MILESTONES, ALMANAC_SEASONS } from '../data/seasonAlmanac';
import { summarizeReviews } from '../data/reviews';
import { nearestMilestones, type MilestoneStep } from '../data/goals';
import { REGULAR_NAMES } from '../core/biz';
import { nextBonus, prestigeEligible, prestigePreview, PRESTIGE_BONUS, PRESTIGE_MAX_LEVEL, PRESTIGE_MIN_LEVEL, PRESTIGE_MIN_REVENUE, revenueFactor } from '../core/prestige';
import { PARTNER_TIERS } from '../data/supplierRel';
import { recentAvgProfit } from '../data/gifts';
import { ngGoalProgress, type NgGoal } from '../data/ngGoals';
import { PRESTIGE_TITLES } from '../data/titles';
import { PRESTIGE_COSTUMES } from '../data/costumes';
import { useSession } from '../net/session';
import { formatMoney, productById } from '../data/products';
import { BILL_RUSH_DAYS, dayOfMonth, SERVICE_BUY_ALONG, SERVICES } from '../data/services';
import { roiOf } from '../data/serviceRoi';
import { venueTrendSummary } from '../data/venueTrend';
import { riskTrendSummary } from '../data/risk';
import { summarizeDemographics, adReach, adTargetSuggest } from '../data/demographics';

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

function Market() {
  const { biz, day, level, money, branch, stats, prices, reviews, analytics, history } = useGame();
  const r = biz.rival;
  // Thế hệ rival hiện tại: số rival đã hạ + 1 (rival cốt truyện là thế hệ đầu)
  const tier = rivalTier(biz.rivalsBeaten + 1);
  const running = activeAds(biz.ads, day);
  // GĐ128: ROI quảng cáo — doanh thu ngày có quảng cáo vs ngày thường, so với chi phí ad/ngày.
  const adRoiData = (() => {
    const effect = promoEffect(analytics, history, 'ads');
    return effect ? adRoi(effect, biz.ads, day) : null;
  })();
  // GĐ129: chi phí–lợi ích Thẻ tích điểm — quà đã tặng so khách kéo thêm nhờ +%. Thuần đọc.
  const loyaltyPay = loyaltyPayoff(biz.loyalty, stats);
  // GĐ60: 4 đòn bẩy hằng ngày quyết định sức mạnh rival (khớp rivalNightly ở core/biz).
  const leverRating = summarizeReviews((reviews ?? []).slice(-30)).average || 3.5;
  const leverMissed = (stats.missed?.stock ?? 0) + (stats.missed?.price ?? 0) + (stats.missed?.wait ?? 0);
  const leverMissRate = leverMissed / Math.max(1, leverMissed + stats.itemsSold);
  const leverPriceIndex = Object.keys(prices).length ? Object.keys(prices).reduce((n, id) => n + prices[id] / productById(id).sell, 0) / Object.keys(prices).length : 1;
  const levers = rivalLeverFlags({ rating: leverRating, missRate: leverMissRate, priceIndex: leverPriceIndex, adsActive: running.length > 0 });
  // GĐ62: nhân khẩu học khách vãng lai (ai đang là khách của tiệm) — cho quyết định nhắm ad đúng nghề.
  const demoRows = summarizeDemographics(biz.demographics);
  // GĐ63: mồi "nên quảng cáo nghề nào" — đóng vòng quyết định ad có dữ kiện.
  const adSuggest = adTargetSuggest(biz.demographics, biz.ads, level, day);
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 8 }}>
      <div style={{ ...card, marginBottom: 0 }}>
        <div style={title}>⚔️ Tiệm đối thủ</div>
        {level < RIVAL_UNLOCK ? <div style={sub}>Từ cấp {RIVAL_UNLOCK} sẽ có tiệm khác mở cạnh tranh trong hẻm.</div>
          : r ? (
            <>
              <div style={{ ...row, flexWrap: 'wrap' }}>
                <span>
                  {r.name} (mở ngày {r.openedDay}){' '}
                  <span style={{ ...pill, background: 'rgba(255,255,255,0.1)' }}>{tier.icon} {tier.label}</span>
                </span>
                <span>Sức mạnh {Math.round(r.strength)}/100</span>
              </div>
              {r.blurb && <div style={{ ...sub, fontStyle: 'italic', opacity: 0.6, marginTop: 2 }}>"{r.blurb}"</div>}
              <div style={{ height: 8, background: '#555', borderRadius: 4, margin: '4px 0' }}>
                <div style={{ width: `${r.strength}%`, height: '100%', borderRadius: 4, background: '#e74c3c' }} />
              </div>
              {/* GĐ60: xu hướng + 4 đòn bẩy — nhân-quả "ai đang thắng / sửa cái gì" (ẩn khi chưa đủ tín hiệu) */}
              {(() => {
                const trend = biz.rivalTrend ?? [];
                if (trend.length < 2 || !r) return null;
                const m = rivalMomentum(trend);
                const up = m.dir === 'gaining';
                const down = m.dir === 'fading';
                const fail = levers.find((l) => !l.ok);
                return (
                  <>
                    <div style={{ ...row, flexWrap: 'wrap', marginTop: 4 }}>
                      <b>⚔️ Xu hướng sức mạnh</b>
                      <span style={{ ...pill, background: up ? 'rgba(231,76,60,0.2)' : down ? 'rgba(46,204,113,0.2)' : 'rgba(255,255,255,0.08)', color: up ? '#e74c3c' : down ? '#2ecc71' : '#ccc' }}>
                        {up ? '📈 rival đang TIẾN (mạnh lên)' : down ? '📉 rival đang LUI (yếu dần)' : '➖ sức mạnh khá đều'}
                      </span>
                    </div>
                    <div style={{ ...sub, marginTop: 2 }}>
                      {Math.round(m.start)} → {Math.round(m.last)}{m.streak > 0 ? ` · ${m.streak} đêm liên tiếp ${up ? 'mạnh' : 'yếu'} dần` : ''} · biến {m.pct >= 0 ? '+' : ''}{m.pct}%
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontSize: 12, opacity: 0.85 }}>🎯 4 đòn bẩy hôm nay</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 3 }}>
                        {levers.map((l) => (
                          <span key={l.lever} style={{ ...pill, background: l.ok ? 'rgba(46,204,113,0.15)' : 'rgba(231,76,60,0.18)', color: l.ok ? '#2ecc71' : '#e74c3c' }}>
                            {l.ok ? '✅' : '❌'} {l.label}
                          </span>
                        ))}
                      </div>
                      {up && fail && (
                        <div style={{ ...sub, marginTop: 4, color: '#e74c3c' }}>
                          ⚠️ Rival đang mạnh lên — {fail.label} đang kéo bạn xuống. Sửa cái này để họ yếu đi.
                        </div>
                      )}
                      <div style={{ ...sub, marginTop: 2 }}>Tiệm mình phục vụ tốt (sao cao, ít lỡ bán, giá không đắt, có quảng cáo) thì đối thủ yếu dần mỗi đêm.</div>
                    </div>
                  </>
                );
              })()}
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
            {loyaltyPay && loyaltyPay.verdict !== 'soon' && (
              <div style={{ ...sub, marginTop: 4, color: loyaltyPay.verdict === 'keep' ? '#2ecc71' : '#e67e22', fontWeight: 600 }}>
                {loyaltyPay.verdict === 'keep'
                  ? `✅ Thẻ tích điểm đang đáng: hôm nay kéo thêm ~${loyaltyPay.extraCustomers} khách (~${formatMoney(loyaltyPay.extraValue)}/ngày) so với quà tặng ~${formatMoney(loyaltyPay.costToday)}/ngày (món ~${formatMoney(loyaltyPay.avgGift)}).`
                  : `⚠️ Thẻ tích điểm đang tốn: hôm nay kéo thêm ~${loyaltyPay.extraCustomers} khách (~${formatMoney(loyaltyPay.extraValue)}/ngày) nhưng quà tặng ~${formatMoney(loyaltyPay.costToday)}/ngày (món ~${formatMoney(loyaltyPay.avgGift)}) — cân nhắc nâng ${5}/${10}/${15} tem hoặc tắt để đỡ tốn.`}
              </div>
            )}
            {loyaltyPay && loyaltyPay.verdict === 'soon' && (
              <div style={{ ...sub, marginTop: 4, opacity: 0.8 }}>
                🎫 Thẻ đang bật (+{loyaltyPay.boostPct}% khách) — sau vài lượt đổi quà sẽ có đánh giá đáng/không tại đây.
              </div>
            )}
          </>
        )}
      </div>
      </div>

      <div style={{ ...card, marginTop: 8 }}>
        <div style={title}>📢 Quảng cáo</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: 6 }}>
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
                  {/* GĐ62: nhóm nghề ad nhắm (targets trước đây vô hình); khi đang chạy hiện ✓ đã chạm / • chưa */}
                  {(() => {
                    const reach = adReach(a, biz.demographics);
                    return (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {reach.targets.map((t) => {
                          const live = !!on && t.matched;
                          return (
                            <span key={t.id} title={live ? 'Đã có khách nghề này ghé trong ván' : 'Nghề mục tiêu'} style={{
                              ...pill, fontSize: 10,
                              background: live ? 'rgba(46,204,113,0.18)' : 'rgba(255,255,255,0.08)',
                              color: live ? '#2ecc71' : undefined,
                            }}>
                              {t.icon} {t.name}{on && (t.matched ? ' ✓' : ' •')}
                            </span>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
                {locked ? <span style={{ ...pill, background: 'rgba(255,255,255,0.1)' }}>Cấp {a.unlock}</span>
                  : on ? <span style={{ ...pill, background: 'rgba(46,204,113,0.2)', color: '#2ecc71' }}>✓ Tới ngày {on.untilDay}</span>
                    : <button style={{ ...btn, marginLeft: 0, whiteSpace: 'nowrap', opacity: money < a.price ? 0.5 : 1 }} disabled={money < a.price} onClick={() => buyAd(a.id)}>{formatMoney(a.price)}</button>}
              </div>
            );
          })}
        </div>
      </div>

      {/* GĐ128: ROI quảng cáo — trả lời "quảng cáo có đáng không" sau vài ngày chạy.
          Chỉ hiện khi có ad đang chạy VÀ đã có dữ liệu so sánh ngày có/không quảng cáo. */}
      {adRoiData && (
        <div style={{ ...card, marginTop: 8, borderLeft: `3px solid ${adRoiData.worth === 'yes' ? '#2ecc71' : '#e67e22'}` }}>
          <div style={title}>📈 Quảng cáo có đáng không?</div>
          <div style={sub}>
            Ngày có quảng cáo: doanh thu TB <b>{formatMoney(adRoiData.withAvg)}/ngày</b> vs{' '}
            <b>{formatMoney(adRoiData.withoutAvg)}/ngày</b> ngày thường → kéo thêm ~{formatMoney(adRoiData.adExtraRev)}/ngày.
          </div>
          <div style={{ ...sub, marginTop: 4, color: adRoiData.worth === 'yes' ? '#2ecc71' : '#e67e22', fontWeight: 600 }}>
            {adRoiData.net >= 0
              ? `✅ Đang chạy chi phí ${formatMoney(adRoiData.dailyCost)}/ngày — quảng cáo có lời ~${formatMoney(adRoiData.net)}/ngày. Giữ hoặc mua thêm.`
              : `⚠️ Đang chạy chi phí ${formatMoney(adRoiData.dailyCost)}/ngày — quảng cáo lỗ ~${formatMoney(-adRoiData.net)}/ngày. Cân nhắc bớt hoặc nhắm đúng nghề (xem Khách của tôi).`}
          </div>
        </div>
      )}

      {/* GĐ62: nhân khẩu học khách vãng lai — "khách của tôi là ai" để nhắm ad đúng nghề */}
      <div style={{ ...card, marginTop: 8 }}>
        <div style={title}>🧑 Khách của tôi</div>
        {demoRows.length === 0 ? (
          <div style={sub}>Chưa có số liệu — chơi vài ngày để thấy ai là khách của tiệm.</div>
        ) : (
          <>
            <div style={{ display: 'grid', gap: 4 }}>
              {demoRows.slice(0, 6).map((r) => {
                const highWalkout = r.walkouts > 0 && r.walkoutRate > 0.25;
                return (
                  <div key={r.id} style={{ ...row, gap: 8 }}>
                    <span style={{ whiteSpace: 'nowrap' }}>{r.icon} <b>{r.name}</b></span>
                    <span style={{ ...sub, flex: 1, textAlign: 'right' }}>
                      {r.visits} lượt · {formatMoney(r.revenue)} · {r.revenuePct}%
                      {highWalkout && <span title="Nhiều khách nhóm này bỏ về không mua" style={{ color: '#e74c3c' }}> ⚠️</span>}
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ ...sub, marginTop: 6 }}>
              Thống kê khách vãng lai. Mua 📢 quảng cáo nhắm đúng nghề đông nhất để kéo thêm người giống họ; ⚠️ = nhóm hay bỏ về — kiểm tra kệ/giá có đúng sở thích họ không.
            </div>
            {adSuggest && (
              <div style={{ marginTop: 6, padding: '7px 9px', borderRadius: 8, background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.4)', fontSize: 12 }}>
                💡 Nên quảng cáo: <b>{adSuggest.ad.icon} {adSuggest.ad.name}</b> — nhắm {adSuggest.reason}.
              </div>
            )}
          </>
        )}
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
  const { biz, day, level, history, venueTrend, riskTrend } = useGame();
  const vt = venueTrendSummary(venueTrend);
  const w = biz.week;
  const r = biz.lastWeek;
  // Thử thách tuần hiện tại; save cũ thiếu counter trong tally thì tiến độ coi như 0.
  const ch = weeklyChallenge(Math.ceil(day / 7), level);
  const chTarget = ch.target(level);
  const chCurrent = ch.measure === 'revenue' ? w.revenue : (w[ch.measure] ?? 0);
  const chMet = chTarget > 0 && chCurrent >= chTarget;
  // GĐ121: nhịp chạy tuần — có theo kịp không? có nguy cơ mất chuỗi không? (thuần đọc tally+streak)
  const pace = weekPace(chCurrent, chTarget, w.startDay + WEEK_DAYS - day, biz.weekStreak, ch.reward(level));
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
      {/* Thử thách tuần: mục tiêu phụ của tuần hiện tại, thưởng tự cộng lúc chốt tuần (không có nút nhận). */}
      <div style={card}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={iconTile}>{ch.icon}</div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <b>🎯 {ch.title}</b>
            <div style={sub}>{ch.desc(level)}</div>
          </div>
        </div>
        <div style={{ height: 8, background: '#555', borderRadius: 4, marginTop: 6 }}>
          <div style={{ width: `${chTarget > 0 ? Math.min(100, (chCurrent / chTarget) * 100) : 0}%`, height: '100%', borderRadius: 4, background: chMet ? '#2ecc71' : '#f1c40f' }} />
        </div>
        <div style={{ ...row, marginTop: 4, flexWrap: 'wrap' }}>
          <span>{Math.round(chCurrent).toLocaleString('vi-VN')}/{Math.round(chTarget).toLocaleString('vi-VN')} {ch.unit}</span>
          {chMet && <span style={{ ...pill, background: 'rgba(46,204,113,0.2)', color: '#2ecc71' }}>✅ Đã đủ — giữ đều nhé!</span>}
        </div>
        {/* GĐ121: nhịp chạy tuần — dòng dự báo + nguy cơ mất chuỗi (thuần đọc, không đổi state) */}
        {!chMet && pace && (() => {
          const pctPace = Math.round(pace.pace * 100);
          const pctProj = Math.round(pace.projected).toLocaleString('vi-VN');
          return (
            <>
              <div style={{ ...row, marginTop: 4, flexWrap: 'wrap', gap: 4 }}>
                <span style={{ opacity: 0.85 }}>⏱ Nhịp {pctPace}% mục tiêu · còn {pace.remainingDays} ngày</span>
                {pace.onTrack
                  ? <span style={{ ...pill, background: 'rgba(46,204,113,0.2)', color: '#2ecc71' }}>📈 Dự kiến kịp ({pctProj} {ch.unit})</span>
                  : <span style={{ ...pill, background: 'rgba(241,196,15,0.2)', color: '#f1c40f' }}>📉 Dự kiến hụt — còn {pace.remainingDays} ngày để bù</span>}
              </div>
              {pace.streakAtRisk && (
                <div style={{ ...sub, color: '#e74c3c', marginTop: 3 }}>
                  ⚠️ Đang hụt MÀ có chuỗi {biz.weekStreak} tuần — trượt tuần này sẽ mất dòng cộng {formatMoney(pace.streakExtra)} tuần sau.
                </div>
              )}
              <div style={{ ...sub, marginTop: 3 }}>
                Còn thiếu {Math.round(pace.missing).toLocaleString('vi-VN')} {ch.unit} nữa là đủ mục tiêu tuần này.
              </div>
            </>
          );
        })()}
        <div style={sub}>
          Thưởng {formatMoney(ch.reward(level))}
          {biz.weekStreak > 0 && ` · chuỗi ${biz.weekStreak} tuần (càng dài thưởng càng lớn, tối đa +80%)`}
        </div>
      </div>
      {r && (
        <div style={card}>
          <b>📊 Báo cáo tuần {r.week}</b>
          <div>Doanh thu {formatMoney(r.revenue)} · Lãi {formatMoney(r.profit)} · {r.customers} khách ({r.unhappy} không vui)</div>
          {r.goal !== null && <div>{r.goalMet ? `✅ Đạt mục tiêu ${formatMoney(r.goal)}, thưởng ${formatMoney(r.reward)}` : `❌ Chưa đạt mục tiêu ${formatMoney(r.goal)}`}</div>}
          {r.challenge && (
            <div>
              {r.challenge.met
                ? `🎯 ${r.challenge.icon} ${r.challenge.title}: XONG, +${formatMoney(r.challenge.reward)}`
                : `🎯 ${r.challenge.icon} ${r.challenge.title}: ${Math.round(r.challenge.current).toLocaleString('vi-VN')}/${Math.round(r.challenge.target).toLocaleString('vi-VN')} ${r.challenge.unit} — chưa xong`}
            </div>
          )}
          {(r.challengeStreak ?? biz.weekStreak) >= 2 && <div>🔥 Chuỗi {(r.challengeStreak ?? biz.weekStreak)} tuần</div>}
          {r.best && <div>💰 Lãi nhiều nhất: {productById(r.best).name}</div>}
          {r.worst && <div>📉 Lãi mỗi món thấp nhất: {productById(r.worst).name} · cân nhắc tăng giá hoặc bỏ bớt</div>}
          <div>🎯 Mục tiêu tuần tới: {formatMoney(r.nextGoal)}</div>
        </div>
      )}
      {/* Xu hướng cơ sở: chi nhánh 24/7 + quán nước có đang đỡ hơn theo ngày không (cửa sổ 14 ngày). */}
      {vt.length > 0 && (
        <div style={card}>
          <div style={title}>📈 Xu hướng cơ sở (14 ngày)</div>
          {vt.map((t) => (
            <div key={t.label} style={{ marginTop: 6 }}>
              <div style={{ ...row, flexWrap: 'wrap' }}>
                <b>{t.icon} {t.label}</b>
                <span
                  style={{ ...pill, background: t.direction === 'up' ? 'rgba(46,204,113,0.2)' : t.direction === 'down' ? 'rgba(231,76,60,0.2)' : 'rgba(255,255,255,0.08)', color: t.direction === 'up' ? '#2ecc71' : t.direction === 'down' ? '#e74c3c' : '#ccc' }}
                >
                  {t.direction === 'up' ? '📈 đang tăng' : t.direction === 'down' ? '📉 đang giảm' : '➖ khá đều'}
                </span>
              </div>
              <div style={{ marginTop: 3 }}>
                Mới nhất <b>{formatMoney(t.last)}</b>
                {t.days >= 2 && (
                  <>
                    {' '}· trung bình {formatMoney(t.recent)} so {formatMoney(t.earlier)} ({t.delta >= 0 ? '+' : ''}{formatMoney(t.delta)})
                    {t.pct !== 0 && ` · ${t.pct > 0 ? '+' : ''}${t.pct}%`}
                  </>
                )}
                {t.best && <div style={sub}>Cao nhất cửa sổ: ngày {t.best.day} · {formatMoney(t.best.value)}</div>}
                <div style={sub}>{t.label.startsWith('Chi nhánh') ? 'Lãi thô chi nhánh = thu − lương, chưa trừ tiền điện cuối ngày.' : 'Lãi quán nước = doanh thu − lương nhân viên.'} Cần ≥2 ngày để thấy xu hướng.</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Xu hướng rủi ro (GĐ58): chi an ninh có "đang đỡ" không — lọt rủi ro tăng/giảm + số lọt/chặn tuần này. */}
      {riskTrend.length > 0 && (() => {
        const rs = riskTrendSummary(riskTrend);
        const last = riskTrend[riskTrend.length - 1];
        const isUp = rs.leakDir === 'up';
        const isDown = rs.leakDir === 'down';
        return (
          <div style={card}>
            <div style={title}>📉 Xu hướng rủi ro (14 ngày)</div>
            <div style={{ ...row, flexWrap: 'wrap' }}>
              <b>🛡️ Lọt rủi ro (trộm + tiền giả + gian lận)</b>
              <span
                style={{ ...pill, background: isUp ? 'rgba(231,76,60,0.2)' : isDown ? 'rgba(46,204,113,0.2)' : 'rgba(255,255,255,0.08)', color: isUp ? '#e74c3c' : isDown ? '#2ecc71' : '#ccc' }}
              >
                {isUp ? '📈 đang tăng' : isDown ? '📉 đang giảm' : '➖ khá đều'}
              </span>
            </div>
            <div style={{ marginTop: 3 }}>
              Mới nhất <b>{formatMoney(last?.leak ?? 0)}</b>/ngày
              {rs.days >= 2 && (
                <> · nửa gần {formatMoney(rs.leakLast)} so nửa trước {formatMoney(rs.leakEarly)} ({rs.leakDelta >= 0 ? '+' : ''}{formatMoney(rs.leakDelta)})</>
              )}
              {' · '}tuần này lọt <b>{formatMoney(rs.weekLeak)}</b> · chặn <b>{formatMoney(rs.weekBlocked)}</b>
            </div>
            {isUp && (
              <div style={{ ...sub, marginTop: 4, color: '#e74c3c' }}>
                🛡️ Lọt {formatMoney(rs.weekLeak)} tuần này — camera/chó/mắt tinh có đang đỡ?
              </div>
            )}
            <div style={sub}>Chỉ báo 2 chiều: lọt = thứ thật mất; chặn = thứ thu lại/bắt được. Cần ≥2 ngày để thấy xu hướng.</div>
          </div>
        );
      })()}
    </>
  );
}

/** Tab Tháng vận hành: mốc nhịp tháng (dương lịch 1–12) — mục tiêu doanh thu + thử thách + chuỗi tháng. */
function Month() {
  const { biz, day, level } = useGame();
  const mo = biz.month ?? emptyMonth(day, monthOf(day));
  const r = biz.lastMonth;
  const m = monthOf(day);
  const ch = monthlyChallenge(mo.month, level);
  const chTarget = ch.target(level);
  const chCurrent = ch.measure === 'revenue' ? mo.revenue : (mo[ch.measure] ?? 0);
  const chMet = chTarget > 0 && chCurrent >= chTarget;
  return (
    <>
      <div style={card}>
        <b>📆 Tháng {m} này (bắt đầu ngày {mo.startDay}, hôm nay ngày {day})</b>
        <div>Doanh thu {formatMoney(mo.revenue)} · Lãi {formatMoney(mo.profit)} · {mo.customers} khách</div>
        {mo.goal !== null ? (
          <>
            <div style={{ marginTop: 4 }}>🎯 Mục tiêu: {formatMoney(mo.goal)} (thưởng 6% nếu đạt)</div>
            <div style={{ height: 8, background: '#555', borderRadius: 4, marginTop: 4 }}>
              <div style={{ width: `${Math.min(100, (mo.revenue / Math.max(1, mo.goal)) * 100)}%`, height: '100%', borderRadius: 4, background: '#2ecc71' }} />
            </div>
          </>
        ) : <div style={sub}>Tháng đầu chưa có mục tiêu; hết tháng sẽ đặt mục tiêu cao hơn 15%.</div>}
        <div style={sub}>Số liệu cộng vào lúc tổng kết mỗi tối. Một năm có 12 tháng, lễ hội theo từng tháng.</div>
      </div>
      <div style={card}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={iconTile}>{ch.icon}</div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <b>🎯 {ch.title}</b>
            <div style={sub}>{ch.desc(level)}</div>
          </div>
        </div>
        <div style={{ height: 8, background: '#555', borderRadius: 4, marginTop: 6 }}>
          <div style={{ width: `${chTarget > 0 ? Math.min(100, (chCurrent / chTarget) * 100) : 0}%`, height: '100%', borderRadius: 4, background: chMet ? '#2ecc71' : '#f1c40f' }} />
        </div>
        <div style={{ ...row, marginTop: 4, flexWrap: 'wrap' }}>
          <span>{Math.round(chCurrent).toLocaleString('vi-VN')}/{Math.round(chTarget).toLocaleString('vi-VN')} {ch.unit}</span>
          {chMet && <span style={{ ...pill, background: 'rgba(46,204,113,0.2)', color: '#2ecc71' }}>✅ Đã đủ — giữ đều nhé!</span>}
        </div>
        <div style={sub}>
          Thưởng {formatMoney(ch.reward(level))}
          {biz.monthStreak > 0 && ` · chuỗi ${biz.monthStreak} tháng (càng dài thưởng càng lớn, tối đa +80%)`}
        </div>
      </div>
      {r && (
        <div style={card}>
          <b>📊 Báo cáo tháng {r.month}</b>
          <div>Doanh thu {formatMoney(r.revenue)} · Lãi {formatMoney(r.profit)} · {r.customers} khách ({r.unhappy} không vui)</div>
          {r.goal !== null && <div>{r.goalMet ? `✅ Đạt mục tiêu ${formatMoney(r.goal)}, thưởng ${formatMoney(r.reward)}` : `❌ Chưa đạt mục tiêu ${formatMoney(r.goal)}`}</div>}
          {r.challenge && (
            <div>
              {r.challenge.met
                ? `🎯 ${r.challenge.icon} ${r.challenge.title}: XONG, +${formatMoney(r.challenge.reward)}`
                : `🎯 ${r.challenge.icon} ${r.challenge.title}: ${Math.round(r.challenge.current).toLocaleString('vi-VN')}/${Math.round(r.challenge.target).toLocaleString('vi-VN')} ${r.challenge.unit} — chưa xong`}
            </div>
          )}
          {(r.monthStreak ?? biz.monthStreak) >= 2 && <div>🔥 Chuỗi {(r.monthStreak ?? biz.monthStreak)} tháng</div>}
          {r.best && <div>💰 Lãi nhiều nhất: {productById(r.best).name}</div>}
          {r.worst && <div>📉 Lãi mỗi món thấp nhất: {productById(r.worst).name} · cân nhắc tăng giá hoặc bỏ bớt</div>}
          <div>🎯 Mục tiêu tháng tới: {formatMoney(r.nextGoal)}</div>
        </div>
      )}
      {(() => {
        const yr = biz.year ?? emptyYear(day, yearOf(day));
        const lr = biz.lastYear;
        return (
          <>
            <div style={card}>
              <b>📅 Năm {yr.year} này (bắt đầu ngày {yr.startDay})</b>
              <div>Doanh thu {formatMoney(yr.revenue)} · Lãi {formatMoney(yr.profit)} · {yr.customers} khách ({yr.unhappy} không vui)</div>
              <div style={sub}>⭐ {yr.seasonStars} sao 4 mùa năm này · một năm = 365 ngày, khép năm có thưởng tròn năm</div>
            </div>
            {lr && (
              <div style={card}>
                <b>🏅 Báo cáo năm {lr.year}</b>
                <div>Doanh thu {formatMoney(lr.revenue)} · Lãi {formatMoney(lr.profit)} · {lr.customers} khách ({lr.unhappy} không vui)</div>
                <div>⭐ {lr.seasonStars} sao 4 mùa · 🎉 Thưởng tròn năm +{formatMoney(lr.reward)}</div>
              </div>
            )}
          </>
        );
      })()}
      {(() => {
        const a = readAlmanac(biz.seasonAlmanac ?? {});
        const nxt = nextAlmanacMilestone(a.total, biz.almanacClaimed ?? []);
        const SI: Record<string, string> = { spring: '🌱 Xuân', summer: '☀️ Hè', autumn: '🍂 Thu', winter: '❄️ Đông' };
        return (
          <div style={card}>
            <b>📖 Sổ Mùa — sao mọi mùa (đời)</b>
            <div style={sub}>Tích lũy vĩnh viễn qua các năm, không reset khi sang mùa/năm mới.</div>
            <div>{ALMANAC_SEASONS.map((s) => `${SI[s]} ${a.perSeason[s]}`).join(' · ')}</div>
            <div>⭐ Tổng {a.total} sao {a.favorite ? `· mùa hợp nhất: ${SI[a.favorite]}` : ''}</div>
            {nxt
              ? <div style={sub}>🎯 Mốc tiếp: {nxt.at} sao (còn {nxt.remaining} sao) → +{formatMoney(almanacMilestoneReward(nxt.at, level))}</div>
              : <div style={sub}>🏁 Đã chạm mốc cuối {ALMANAC_MILESTONES[ALMANAC_MILESTONES.length - 1]} sao</div>}
          </div>
        );
      })()}
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
      <NearMilestones />
      <p style={sub}>Đã đạt {done.size}/{ACHIEVEMENTS.length} thành tựu.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
        {ACHIEVEMENTS.map((a) => (
          <div key={a.id} style={{ ...card, marginBottom: 0, opacity: done.has(a.id) ? 1 : 0.55 }}>
            <b>{done.has(a.id) ? a.icon : '🔒'} {a.name}</b>
            <div style={sub}>{a.desc} · thưởng {formatMoney(a.reward)}</div>
          </div>
        ))}
      </div>
      <PrestigeSection />
    </>
  );
}

/** "Sắp đạt": nhắc những cột mốc người chơi còn cách không xa — mồi "thêm chút nữa là xong". */
const UNIT: Record<MilestoneStep['m']['key'], string> = { level: 'cấp', day: 'ngày', revenue: 'đồng', itemsSold: 'món', customers: 'khách' };
function NearMilestones() {
  const { level, day, totals } = useGame();
  const steps = nearestMilestones({ level, day, revenue: totals.revenue, itemsSold: totals.itemsSold, customers: totals.customers });
  if (steps.length === 0) return null;
  return (
    <div style={card}>
      <b>🎯 Sắp đạt: {steps.length} mốc gần nhất</b>
      {steps.map(({ m, pct, remaining }) => (
        <div key={m.id} style={{ marginTop: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span>{m.icon} {m.name}</span>
            <span style={sub}>còn {remaining.toLocaleString('vi-VN')} {UNIT[m.key]}</span>
          </div>
          <div style={{ height: 6, background: '#555', borderRadius: 4, marginTop: 3 }}>
            <div style={{ width: `${Math.round(pct * 100)}%`, height: '100%', borderRadius: 4, background: '#f1c40f' }} />
          </div>
        </div>
      ))}
      <div style={sub}>Tiến độ tính theo tổng doanh thu từng đạt, không theo tiền đang có.</div>
    </div>
  );
}

/** 🌱 Mục tiêu vòng tái sinh (GĐ140): danh sách mốc NG+ theo vòng, nhận thưởng khi đạt — chỉ hiện ở vòng NG+ (prestige ≥ 1). */
function NgGoalsCard({ prestigeLevel, cachedGoals }: { prestigeLevel: number; cachedGoals: Array<Omit<NgGoal, 'done'> & { done: boolean }> }) {
  const { claimNgGoal, biz } = useGame();
  if (prestigeLevel < 1) return null;
  const claimed = new Set(biz.prestige.goalsClaimed ?? []);
  const doneCount = cachedGoals.filter((g) => g.done).length;
  return (
    <div style={{ marginTop: 10, padding: 8, borderRadius: 8, background: 'rgba(52,152,219,0.08)', border: '1px dashed rgba(52,152,219,0.35)' }}>
      <div style={{ ...sub, marginTop: 0 }}>
        <b style={{ color: '#5dade2' }}>🌱 Mục tiêu vòng tái sinh</b>
      </div>
      <div style={sub}>Đạt {doneCount}/{cachedGoals.length} mốc của vòng này — nhận thưởng tiền, reset khi tái sinh lần sau.</div>
      {cachedGoals.map((g) => {
        const isClaimed = claimed.has(g.id);
        return (
          <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <div>
              <span style={{ opacity: g.done ? 1 : 0.55 }}>{g.icon} <b>{g.name}</b> — {g.desc}</span>
              <div style={{ ...sub, color: g.done ? '#2ecc71' : undefined }}>{g.done ? '✓ Đạt' : 'Chưa đạt'}</div>
            </div>
            {g.done && !isClaimed ? (
              <button style={btn} onClick={() => claimNgGoal(g.id)}>Nhận +{formatMoney(g.reward)}</button>
            ) : isClaimed ? (
              <span style={{ ...pill, background: 'rgba(46,204,113,0.2)', color: '#2ecc71' }}>✓ Đã nhận</span>
            ) : (
              <span style={{ ...pill, background: 'rgba(241,196,15,0.15)', color: '#f1c40f' }}>+{formatMoney(g.reward)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Tái sinh (NG+): bắt đầu lại tiệm từ cấp 1, giữ bộ sưu tập tài khoản, doanh thu tăng dần theo số lần. */
function PrestigeSection() {
  const { biz, level, totals, day, marketClearedDay, history, analytics, ordersDone, staff } = useGame();
  const online = !!useSession((ss) => ss.coop);
  const p = biz.prestige;
  const eligible = prestigeEligible(level, totals.revenue, p.level);
  const capped = p.level >= PRESTIGE_MAX_LEVEL;
  const nextMult = capped ? null : revenueFactor(nextBonus(p.level));
  const preview = prestigePreview({
    level,
    lifetimeRevenue: totals.revenue,
    prestigeLevel: p.level,
    bonus: p.bonus,
    avgDailyProfit: recentAvgProfit(history),
    supplierRel: biz.supplierRel ?? {},
    marketClearedDay,
    currentDay: day,
    analyticsDays: Math.max(0, Object.keys(analytics?.flags ?? {}).length),
  });
  const goals = ngGoalProgress({
    prestigeLevel: p.level,
    level,
    staffCount: staff.length,
    ordersDone,
    supplierRel: biz.supplierRel ?? {},
    marketClearedDay,
  });
  return (
    <div style={{ ...card, marginTop: 8, border: '1px solid rgba(241,196,15,0.4)' }}>
      <div style={title}>🌟 Tái sinh (NG+)</div>
      {capped ? (
        <div style={sub}>
          Đã tái sinh tối đa {PRESTIGE_MAX_LEVEL} lần — doanh thu đang +{Math.round(p.bonus * 100)}%.
        </div>
      ) : eligible ? (
        <>
          <div style={sub}>
            Vòng {p.level + 1}. Doanh thu đang +{Math.round(p.bonus * 100)}%, tái sinh thêm sẽ là +{Math.round((nextMult! - 1) * 100)}% (tối đa +{Math.round(PRESTIGE_MAX_LEVEL * PRESTIGE_BONUS * 100)}%).
          </div>
          {!capped && (
            <div style={{ marginTop: 8, padding: 8, borderRadius: 8, background: 'rgba(46,204,113,0.08)', border: '1px dashed rgba(46,204,113,0.35)' }}>
              <div style={{ ...sub, marginTop: 0 }}>
                <b style={{ color: '#2ecc71' }}>🌳 Chuẩn bị tái sinh</b>
              </div>
              {preview.projectedDailyGain > 0 && (
                <div style={sub}>
                  Nhận: vòng sau lời thêm ≈ <b>{formatMoney(preview.projectedDailyGain)}/ngày</b> (thêm +{preview.nextBonus}% so với lãi hiện tại).
                </div>
              )}
              <div style={sub}>
                Bỏ lại:{' '}
                {preview.suppliersActive > 0 ? <b>{preview.suppliersActive} mối quen</b> : 'chưa có mối quen'}
                {preview.topRelTier > 0 && <span>{` (bậc ${preview.topRelTier}${preview.topRelTier >= PARTNER_TIERS.length ? '' : ', còn hoàn tháng'})`}</span>}
                {' · '}
                {preview.analyticsDays > 0 ? <b>{preview.analyticsDays} ngày</b> : '0 ngày'} dữ liệu phân tích
                {preview.unsoldMarketDay && <span style={{ color: '#f1c40f' }}> · 🧺 phiên chợ hôm nay chưa kịp gánh!</span>}
              </div>
            </div>
          )}
          {online && <div style={sub}>Chơi hẻm online không tái sinh được — chỉ ở chế độ chơi đơn.</div>}
          {!online && (
            <button
              style={{ ...btn, marginLeft: 0, marginTop: 6 }}
              onClick={() => {
                if (!confirm('🌟 Tái sinh: bắt đầu lại tiệm từ cấp 1, KHÔNG THỂ HOÀN TÁC!\n\nThành tựu, danh hiệu, cốt truyện, nhà, xe, thú cưng, bộ sưu tập và doanh thu cả đời giữ nguyên; tiền, cấp, ngày, nội thất, kho, nhân viên, trang trại... đều làm lại từ đầu.')) return;
                useGame.getState().doPrestige();
              }}
            >🌟 Tái sinh</button>
          )}
        </>
      ) : (
        <div style={{ ...sub, color: '#999' }}>
          Cần cấp {PRESTIGE_MIN_LEVEL} + doanh thu cả đời {formatMoney(PRESTIGE_MIN_REVENUE)} để tái sinh (mở khi cuối game). Giữ bộ sưu tập tài khoản và bán đắt dần mỗi vòng.
        </div>
      )}
      <NgGoalsCard prestigeLevel={p.level} cachedGoals={goals} />
      <NextUnlockTeaser prestige={p.level} />
    </div>
  );
}

/** Mồi tiến trình: cho thấy thứ NG+ độc quyền sẽ mở ở mức tái sinh kế tiếp (và các mức xa hơn). */
function NextUnlockTeaser({ prestige }: { prestige: number }) {
  const locked = ([
    ...PRESTIGE_TITLES.map((t) => ({ icon: t.lockIcon ?? '🔒', need: t.prestige ?? 0, name: t.name, kind: 'Danh hiệu' as const })),
    ...PRESTIGE_COSTUMES.map((c) => ({ icon: '👕', need: c.prestige ?? 0, name: c.name, kind: 'Trang phục' as const })),
  ]).filter((x) => !x.need || x.need > prestige);
  const next = locked.filter((x) => x.need === prestige + 1);
  const farther = locked.filter((x) => x.need > prestige + 1);
  if (!next.length && !farther.length) return null;
  return (
    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed rgba(255,255,255,0.12)' }}>
      {next.length > 0 && (
        <div style={sub}>
          <b style={{ color: '#f1c40f' }}>Mở khóa NG+ ở lần tái sinh tiếp theo:</b>
          <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {next.map((x) => (
              <span key={`${x.kind}-${x.name}`} style={{ background: 'rgba(241,196,15,0.12)', padding: '4px 8px', borderRadius: 6, fontSize: 12 }}>
                {x.icon} <b>{x.name}</b> <span style={{ opacity: 0.7 }}>({x.kind})</span>
              </span>
            ))}
          </div>
        </div>
      )}
      {farther.length > 0 && (
        <div style={{ ...sub, marginTop: 6, opacity: 0.55 }}>
          Còn chờ ở mức tái sinh cao hơn: {farther.map((x) => `${x.icon} ${x.name} (${x.need} lần)`).join(' · ')}
        </div>
      )}
    </div>
  );
}
