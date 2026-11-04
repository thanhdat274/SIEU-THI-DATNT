import { useGame } from '../../core/store';
import { buyAd, buyRivalShop, setLoyalty, startCounter } from '../../core/biz';
import { Callout } from './shared';
import { activeAds, ADS, adRoi, COUNTERS, LOYALTY_OPTIONS, LOYALTY_UNLOCK, loyaltyPayoff, RIVAL_PERSONALITIES, RIVAL_UNLOCK, rivalLeverFlags, rivalMomentum, rivalTier, staffAtRiskOfPoach, STAFF_POACH_STRENGTH } from '../../data/biz';
import { promoEffect } from '../../data/analytics';
import { summarizeReviews } from '../../data/reviews';
import { REGULAR_NAMES } from '../../core/biz';
import { formatMoney, productById } from '../../data/products';
import { counterPayoff, recentAvgRevenue } from '../../data/minorPayoff';
import { rivalDrag } from '../../data/rivalDrag';
import { summarizeDemographics, adReach, adTargetSuggest } from '../../data/demographics';
import { card, title, pill, iconTile, btn, sub, row } from './businessStyles';

/** Tab Cạnh tranh: đối thủ, quảng cáo, tích điểm (tách từ BusinessPanel, GĐ876). */
export function Market() {
  const { biz, day, level, money, branch, stats, prices, reviews, analytics, history, staff } = useGame();
  const r = biz.rival;
  // GĐ1186: nhân viên giỏi nhất đang bị rival máu liều để mắt (giống cảnh báo trong StaffPanel — hiện cả ở màn chống rival).
  const staffRiskId = staffAtRiskOfPoach(r, staff);
  const staffRisk = staffRiskId === undefined ? undefined : staff.find((s) => s.id === staffRiskId);
  // GĐ159: mốc quy đòn phản công ra tiền — bình quân doanh thu TIỆM CHÍNH 7 ngày (DayRecord.revenue),
  // đúng luồng khách mà rivalTrafficFactor tác động; chưa có ngày nào thì đòn chỉ hiện %, không hiện tiền.
  const avgRev7 = recentAvgRevenue(history);
  const rivalOnSale = r?.saleUntil !== undefined && r.saleUntil >= day;
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
                  {' '}Khách quen bị lôi kéo: {Object.keys(r.poached ?? {}).length ? Object.keys(r.poached!).map((id) => `${REGULAR_NAMES[id] ?? id} (từ ngày ${r.poached![id]})`).join(', ') + ' — đòi lại ở bảng Khách quen' : 'chưa có'}.
                </div>
              )}
              {staffRisk && (
                <div style={{ ...sub, marginTop: 4, color: '#e74c3c' }} title={`${r.name} máu liều, sức ${r.strength} — móc người giỏi nhất về đêm. Hạ sức mạnh rival dưới ${STAFF_POACH_STRENGTH} để giữ.`}>
                  ⚠️ Nhân viên giỏi nhất <b>{staffRisk.name}</b> đang bị {r.name} để mắt — mở bảng <b>Nhân viên</b> để giữ, hạ sức mạnh rival dưới {STAFF_POACH_STRENGTH}.
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
                Đang hút mất {rivalDrag(r, day, avgRev7).lostPct.toFixed(0)}% khách{r.saleUntil !== undefined && r.saleUntil >= day ? ` (đang giảm giá tới ngày ${r.saleUntil})` : ''}{avgRev7 > 0 ? ` → ~${formatMoney(rivalDrag(r, day, avgRev7).moneyPerDay)}/ngày` : ''}.
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
                      {/* GĐ159: quy "bớt N sức mạnh" ra khách & tiền — rivalTrafficFactor tuyến tính theo sức mạnh
                          (1 sức mạnh ≈ 0,25% khách, ×2 khi rival xả hàng) nên quy được sạch. Số là ƯỚC: hit thật có
                          thể nặng thêm tới +3 nhờ đối đầu liền ngày và đòn giá chỉ tính nếu bán đủ 30 món. */}
                      {(() => {
                        if (avgRev7 <= 0) return null;
                        const g = counterPayoff(r.strength, c.hit, rivalOnSale, avgRev7);
                        const pct1 = Math.round(g.pctCustomers * 10) / 10;
                        return (
                          <div style={{ ...sub, marginTop: 2 }}>
                            Bớt ~{c.hit} sức mạnh ≈ khách đông lại ~{pct1}% — ước ~{formatMoney(g.moneyPerDay)}/ngày (bình quân 7 ngày).
                          </div>
                        );
                      })()}
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
                              ...pill, fontSize: 11,
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
        <Callout tone={adRoiData.worth === 'yes' ? 'ok' : 'warn'} title="📈 Quảng cáo có đáng không?" style={{ marginTop: 8 }}>
          <div style={sub}>
            Ngày có quảng cáo: doanh thu TB <b>{formatMoney(adRoiData.withAvg)}/ngày</b> vs{' '}
            <b>{formatMoney(adRoiData.withoutAvg)}/ngày</b> ngày thường → kéo thêm ~{formatMoney(adRoiData.adExtraRev)}/ngày.
          </div>
          <div style={{ ...sub, marginTop: 4, color: adRoiData.worth === 'yes' ? '#2ecc71' : '#e67e22', fontWeight: 600 }}>
            {adRoiData.net >= 0
              ? `✅ Đang chạy chi phí ${formatMoney(adRoiData.dailyCost)}/ngày — quảng cáo có lời ~${formatMoney(adRoiData.net)}/ngày. Giữ hoặc mua thêm.`
              : `⚠️ Đang chạy chi phí ${formatMoney(adRoiData.dailyCost)}/ngày — quảng cáo lỗ ~${formatMoney(-adRoiData.net)}/ngày. Cân nhắc bớt hoặc nhắm đúng nghề (xem Khách của tôi).`}
          </div>
        </Callout>
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
              <Callout tone="ok" style={{ marginTop: 6 }}>
                <div style={{ fontSize: 12 }}>
                  💡 Nên quảng cáo: <b>{adSuggest.ad.icon} {adSuggest.ad.name}</b> — nhắm {adSuggest.reason}.
                </div>
              </Callout>
            )}
          </>
        )}
      </div>
    </>
  );
}
