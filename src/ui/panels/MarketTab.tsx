import { useGame } from '../../core/store';
import { buyAd, buyRivalShop, setLoyalty, startCounter } from '../../core/biz';
import { Callout } from './shared';
import { activeAds, ADS, adRoi, COUNTERS, LOYALTY_OPTIONS, LOYALTY_UNLOCK, loyaltyPayoff, RIVAL_PERSONALITIES, RIVAL_UNLOCK, rivalLeverFlags, rivalMomentum, rivalTier, staffAtRiskOfPoach, STAFF_POACH_STRENGTH } from '../../data/biz';
import { promoEffect } from '../../data/analytics';
import { summarizeReviews } from '../../data/reviews';
import { REGULAR_NAMES } from '../../core/biz';
import { formatMoney, productById } from '../../data/products';
import { shortLabel } from '../shortLabel';
import { counterPayoff, recentAvgRevenue } from '../../data/minorPayoff';
import { priceCounterViability } from '../../data/priceCounter';
import { rivalDrag } from '../../data/rivalDrag';
import { rivalBuyPayoff } from '../../data/rivalBuyPayoff';
import { counterStreakInfo } from '../../data/counterStreak';
import { summarizeDemographics, adReach, adTargetSuggest } from '../../data/demographics';
import { card, title, pill, iconTile, btn, sub, row } from './businessStyles';
import { t } from '../../core/i18n';

/** Tab Cạnh tranh: đối thủ, quảng cáo, tích điểm (tách từ BusinessPanel, GĐ876). */
export function Market() {
  const { biz, day, level, money, branch, stats, sales, prices, reviews, analytics, history, staff } = useGame();
  const r = biz.rival;
  // GĐ1186: nhân viên giỏi nhất đang bị rival máu liều để mắt (giống cảnh báo trong StaffPanel — hiện cả ở màn chống rival).
  const staffRiskId = staffAtRiskOfPoach(r, staff);
  const staffRisk = staffRiskId === undefined ? undefined : staff.find((s) => s.id === staffRiskId);
  // GĐ159: mốc quy đòn phản công ra tiền — bình quân doanh thu TIỆM CHÍNH 7 ngày (DayRecord.revenue),
  // đúng luồng khách mà rivalTrafficFactor tác động; chưa có ngày nào thì đòn chỉ hiện %, không hiện tiền.
  const avgRev7 = recentAvgRevenue(history);
  const rivalOnSale = r?.saleUntil !== undefined && r.saleUntil >= day;
  // GĐ1308: phần khách cũ của rival ghé đông sau khi mua lại mặt bằng 12tr (đã có chi nhánh) — bao nhiêu tiền.
  const buyPay = rivalBuyPayoff(biz.rivalForSale, branch);
  // GĐ1320: đòn phản công đang chạy hôm nay mạnh thêm nhờ chạy nhiều ngày liền (hit thật = def.hit + bonus).
  const strek = counterStreakInfo(biz.counter, day, biz.counterLastDay, biz.counterStreak);
  // GĐ1270: nhu cầu món/ngày thường (Σ trung bình trượt từng món, cùng nguồn gợi ý giá) — để soi
  // điều kiện "30 món" của đòn Đối đầu giá có chạm nổi không (helper THUẦN priceCounterViability).
  const avgItemsPerDay = Object.values(sales).reduce((n, x) => n + x, 0);
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
        <div style={title}>{t('market.tiem_doi_thu')}</div>
        {level < RIVAL_UNLOCK ? <div style={sub}>{t('market.tu_cap')}{' '}{RIVAL_UNLOCK}{' '}{t('market.se_co_tiem_khac_mo_canh')}</div>
          : r ? (
            <>
              <div style={{ ...row, flexWrap: 'wrap' }}>
                <span>
                  {r.name}{' '}{t('market.mo_ngay')}{' '}{r.openedDay}){' '}
                  <span style={{ ...pill, background: 'rgba(255,255,255,0.1)' }}>{tier.icon} {tier.label}</span>
                </span>
                <span>{t('market.suc_manh')}{' '}{Math.round(r.strength)}/100</span>
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
                      <b>{t('market.xu_huong_suc_manh')}</b>
                      <span style={{ ...pill, background: up ? 'rgba(231,76,60,0.2)' : down ? 'rgba(46,204,113,0.2)' : 'rgba(255,255,255,0.08)', color: up ? '#e74c3c' : down ? '#2ecc71' : '#ccc' }}>
                        {up ? t('market.rival_dang_tien_manh_len') : down ? t('market.rival_dang_lui_yeu_dan') : t('market.suc_manh_kha_deu')}
                      </span>
                    </div>
                    <div style={{ ...sub, marginTop: 2 }}>
                      {Math.round(m.start)} → {Math.round(m.last)}{m.streak > 0 ? ` · ${m.streak} đêm liên tiếp ${up ? 'mạnh' : 'yếu'} dần` : ''}{' '}{t('market.bien')}{' '}{m.pct >= 0 ? '+' : ''}{m.pct}%
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontSize: 12, opacity: 0.85 }}>{t('market.4_don_bay_hom_nay')}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 3 }}>
                        {levers.map((l) => (
                          <span key={l.lever} style={{ ...pill, background: l.ok ? 'rgba(46,204,113,0.15)' : 'rgba(231,76,60,0.18)', color: l.ok ? '#2ecc71' : '#e74c3c' }}>
                            {l.ok ? '✅' : '❌'} {l.label}
                          </span>
                        ))}
                      </div>
                      {up && fail && (
                        <div style={{ ...sub, marginTop: 4, color: '#e74c3c' }}>
                          {t('market.rival_dang_manh_len')}{' '}{fail.label}{' '}{t('market.dang_keo_ban_xuong_sua_cai')}
                        </div>
                      )}
                      <div style={{ ...sub, marginTop: 2 }}>{t('market.tiem_minh_phuc_vu_tot_sao')}</div>
                    </div>
                  </>
                );
              })()}
              {r.personality && (
                <div style={{ ...sub, marginTop: 4 }}>
                  {t('market.tinh_cach')}{' '}{RIVAL_PERSONALITIES[r.personality].icon} <b>{RIVAL_PERSONALITIES[r.personality].name}</b> — {RIVAL_PERSONALITIES[r.personality].desc}.
                  {' '}{t('market.khach_quen_bi_loi_keo')}{' '}{Object.keys(r.poached ?? {}).length ? Object.keys(r.poached!).map((id) => t('market.tu_ngay', { v0: REGULAR_NAMES[id] ?? id, v1: r.poached![id] })).join(', ') + t('market.doi_lai_o_bang_khach_quen') : t('market.chua_co')}.
                </div>
              )}
              {staffRisk && (
                <div style={{ ...sub, marginTop: 4, color: '#e74c3c' }} title={t('market.mau_lieu_suc_moc_nguoi_gioi', { name: r.name, strength: r.strength, STAFF_POACH_STRENGTH })}>
                  {t('market.nhan_vien_gioi_nhat')}{' '}<b>{staffRisk.name}</b>{' '}{t('market.dang_bi')}{' '}{r.name}{' '}{t('market.de_mat_mo_bang')}{' '}<b>{t('market.nhan_vien')}</b>{' '}{t('market.de_giu_ha_suc_manh_rival')}{' '}{STAFF_POACH_STRENGTH}.
                </div>
              )}
              {!!Object.keys(r.prices ?? {}).length && (
                <div style={{ ...sub, marginTop: 4 }}>
                  <b>{t('market.gia_rival_dang_ban')}</b>{' '}
                  {Object.entries(r.prices!).map(([id, rp]) => {
                    const mine = useGame.getState().priceOf(id);
                    return `${productById(id).name} ${formatMoney(rp)}${mine ? t('market.minh', { v0: formatMoney(mine), v1: rp < mine * 0.95 ? ' ⚠️' : '' }) : ''}`;
                  }).join(' · ')}
                </div>
              )}
              <div style={sub}>
                {t('market.dang_hut_mat')}{' '}{rivalDrag(r, day, avgRev7).lostPct.toFixed(0)}{t('market.khach')}{r.saleUntil !== undefined && r.saleUntil >= day ? t('market.dang_giam_gia_toi_ngay', { saleUntil: r.saleUntil }) : ''}{avgRev7 > 0 ? t('market.ngay', { v0: formatMoney(rivalDrag(r, day, avgRev7).moneyPerDay) }) : ''}{t('market.moi_dem_ho_yeu_di_khi')}
              </div>
              <div style={{ ...title, marginTop: 8 }}>{t('market.phan_cong_moi_ngay_mot_dot')}</div>
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
                      {c.cost > 0 ? ` · ${formatMoney(c.cost)}` : t('market.mien_phi_lai_mong')}
                      {runningNow ? t('market.dang_chay') : usedToday ? t('market.hom_nay_da_chay_dot_khac') : !ready ? t('market.hoi_tu_ngay', { v0: biz.counterReady[c.id] }) : !affordable ? t('market.thieu', { v0: formatMoney(c.cost - money) }) : ''}
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
                            {t('market.bot')}{c.hit}{' '}{t('market.suc_manh_khach_dong_lai')}{pct1}{t('market.uoc')}{formatMoney(g.moneyPerDay)}{t('market.ngay_binh_quan_7_ngay')}
                          </div>
                        );
                      })()}
                      {/* GĐ1270 — đòn Đối đầu giá có điều kiện "bán đủ 30 món hôm nay" mới kích hoạt;
                          chủ cần thấy con số tiến độ + nhịp ngày thường trước khi cam kết cả ngày lãi mỏng. */}
                      {c.id === 'price' && !runningNow && (stats?.itemsSold ?? 0) + avgItemsPerDay > 0 && (
                        <div style={{ ...sub, marginTop: 2, color: '#2ecc71' }}>
                          {priceCounterViability(stats?.itemsSold ?? 0, avgItemsPerDay).line}
                        </div>
                      )}
                      {/* GĐ1320: đang chạy hôm nay + có chuỗi liền ngày → hiện hit THẬT (thường bị ẩn, chỉ notify cuối ngày). */}
                      {runningNow && strek.line && (
                        <div style={{ ...sub, marginTop: 2, color: '#2ecc71' }}>{strek.line}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : <div style={sub}>{t('market.hem_dang_chi_co_tiem_ban')}{biz.rivalsBeaten ? t('market.da_danh_bai_doi_thu', { rivalsBeaten: biz.rivalsBeaten }) : ''}{t('market.thinh_thoang_se_co_tiem_moi')}</div>}
      </div>

      {biz.rivalForSale && !biz.rival && (
        <div style={{ ...card, marginBottom: 0, gridColumn: '1 / -1', border: '1px solid #f1c40f' }}>
          <div style={title}>{t('market.mat_bang')}{biz.rivalForSale.name}{t('market.chao_ban_lai')}</div>
          <div style={sub}>
            {t('market.rival_vua_dong_cua_chu_tiem')}{' '}{formatMoney(biz.rivalForSale.price)}
            {branch
              ? t('market.mua_ve_thi_chi_nhanh_nhan')
              : t('market.mua_ve_la_co_ngay_chi')}
            {' '}{t('market.het_ngay')}{' '}{biz.rivalForSale.until}{' '}{t('market.khong_mua_thi_nguoi_khac_thue')}
          </div>
          {buyPay.line && <div style={{ fontSize: 12, color: '#2ecc71', marginTop: 2 }}>{buyPay.line}</div>}
          <button style={{ ...btn, background: money >= biz.rivalForSale.price ? '#f1c40f' : '#555' }} onClick={buyRivalShop}>
            {t('market.mua_lai_mat_bang')}{formatMoney(biz.rivalForSale.price)})
          </button>
        </div>
      )}

      <div style={{ ...card, marginBottom: 0 }}>
        <div style={{ ...row, ...title }}>
          <span>{t('market.the_tich_diem')}</span>
          {level >= LOYALTY_UNLOCK && (
            <label style={{ fontSize: 13 }}>
              <input type="checkbox" checked={biz.loyalty.on} onChange={(e) => setLoyalty(e.target.checked)} />{' '}{t('market.bat')}
            </label>
          )}
        </div>
        {level < LOYALTY_UNLOCK ? <div style={sub}>{t('market.mo_o_cap')}{' '}{LOYALTY_UNLOCK}.</div> : (
          <>
            <div style={{ margin: '4px 0' }}>
              {t('market.mua_du')}{' '}{LOYALTY_OPTIONS.map((n) => (
                <button key={n} style={{ ...btn, background: biz.loyalty.stamps === n ? '#f1c40f' : '#fff' }} onClick={() => setLoyalty(biz.loyalty.on, n)}>{n}{' '}{t('market.lan')}</button>
              ))}{' '}{t('market.tang_mon_re_nhat_trong_gio')}
            </div>
            <div style={sub}>
              {t('market.it_tem_thi_khach_ghe_nhieu')}{Math.round(60 / biz.loyalty.stamps)}{t('market.nhung_tang_nhieu_hon_da_tang')}{' '}{biz.loyalty.redeemed}{' '}{t('market.lan_2')}{' '}{formatMoney(biz.loyalty.given)}.
            </div>
            {loyaltyPay && loyaltyPay.verdict !== 'soon' && (
              <div style={{ ...sub, marginTop: 4, color: loyaltyPay.verdict === 'keep' ? '#2ecc71' : '#e67e22', fontWeight: 600 }}>
                {loyaltyPay.verdict === 'keep'
                  ? t('market.the_tich_diem_dang_dang_hom', { extraCustomers: loyaltyPay.extraCustomers, v1: formatMoney(loyaltyPay.extraValue), v2: formatMoney(loyaltyPay.costToday), v3: formatMoney(loyaltyPay.avgGift) })
                  : t('market.the_tich_diem_dang_ton_hom', { extraCustomers: loyaltyPay.extraCustomers, v1: formatMoney(loyaltyPay.extraValue), v2: formatMoney(loyaltyPay.costToday), v3: formatMoney(loyaltyPay.avgGift) })}
              </div>
            )}
            {loyaltyPay && loyaltyPay.verdict === 'soon' && (
              <div style={{ ...sub, marginTop: 4, opacity: 0.8 }}>
                {t('market.the_dang_bat')}{loyaltyPay.boostPct}{t('market.khach_sau_vai_luot_doi_qua')}
              </div>
            )}
          </>
        )}
      </div>
      </div>

      <div style={{ ...card, marginTop: 8 }}>
        <div style={title}>{t('market.quang_cao')}</div>
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
                    <span style={{ ...pill, background: 'rgba(241,196,15,0.18)', color: '#f1c40f' }}>+{Math.round((a.traffic - 1) * 100)}{t('market.khach')}</span>
                    <span style={{ ...pill, background: 'rgba(255,255,255,0.1)' }}>{a.days}{' '}{t('market.ngay_2')}</span>
                  </div>
                  {/* GĐ62: nhóm nghề ad nhắm (targets trước đây vô hình); khi đang chạy hiện ✓ đã chạm / • chưa */}
                  {(() => {
                    const reach = adReach(a, biz.demographics);
                    return (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {reach.targets.map((tg) => {
                          const live = !!on && tg.matched;
                          return (
                            <span key={tg.id} title={live ? t('market.da_co_khach_nghe_nay_ghe') : t('market.nghe_muc_tieu')} style={{
                              ...pill, fontSize: 11,
                              background: live ? 'rgba(46,204,113,0.18)' : 'rgba(255,255,255,0.08)',
                              color: live ? '#2ecc71' : undefined,
                            }}>
                              {tg.icon} {tg.name}{on && (tg.matched ? ' ✓' : ' •')}
                            </span>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
                {locked ? <span style={{ ...pill, background: 'rgba(255,255,255,0.1)' }}>{t('market.cap')}{' '}{a.unlock}</span>
                  : on ? <span style={{ ...pill, background: 'rgba(46,204,113,0.2)', color: '#2ecc71' }}>{t('market.toi_ngay')}{' '}{on.untilDay}</span>
                    : <button style={{ ...btn, marginLeft: 0, whiteSpace: 'nowrap', opacity: money < a.price ? 0.5 : 1 }} disabled={money < a.price} onClick={() => buyAd(a.id)}>{shortLabel(formatMoney(a.price), a.price, money)}</button>}
              </div>
            );
          })}
        </div>
      </div>

      {/* GĐ128: ROI quảng cáo — trả lời "quảng cáo có đáng không" sau vài ngày chạy.
          Chỉ hiện khi có ad đang chạy VÀ đã có dữ liệu so sánh ngày có/không quảng cáo. */}
      {adRoiData && (
        <Callout tone={adRoiData.worth === 'yes' ? 'ok' : 'warn'} title={t('market.quang_cao_co_dang_khong')} style={{ marginTop: 8 }}>
          <div style={sub}>
            {t('market.ngay_co_quang_cao_doanh_thu')}{' '}<b>{formatMoney(adRoiData.withAvg)}{t('market.ngay_3')}</b> vs{' '}
            <b>{formatMoney(adRoiData.withoutAvg)}{t('market.ngay_3')}</b>{' '}{t('market.ngay_thuong_keo_them')}{formatMoney(adRoiData.adExtraRev)}{t('market.ngay_4')}
          </div>
          <div style={{ ...sub, marginTop: 4, color: adRoiData.worth === 'yes' ? '#2ecc71' : '#e67e22', fontWeight: 600 }}>
            {adRoiData.net >= 0
              ? t('market.dang_chay_chi_phi_ngay_quang', { v0: formatMoney(adRoiData.dailyCost), v1: formatMoney(adRoiData.net) })
              : t('market.dang_chay_chi_phi_ngay_quang_2', { v0: formatMoney(adRoiData.dailyCost), v1: formatMoney(-adRoiData.net) })}
          </div>
        </Callout>
      )}

      {/* GĐ62: nhân khẩu học khách vãng lai — "khách của tôi là ai" để nhắm ad đúng nghề */}
      <div style={{ ...card, marginTop: 8 }}>
        <div style={title}>{t('market.khach_cua_toi')}</div>
        {demoRows.length === 0 ? (
          <div style={sub}>{t('market.chua_co_so_lieu_choi_vai')}</div>
        ) : (
          <>
            <div style={{ display: 'grid', gap: 4 }}>
              {demoRows.slice(0, 6).map((r) => {
                const highWalkout = r.walkouts > 0 && r.walkoutRate > 0.25;
                return (
                  <div key={r.id} style={{ ...row, gap: 8 }}>
                    <span style={{ whiteSpace: 'nowrap' }}>{r.icon} <b>{r.name}</b></span>
                    <span style={{ ...sub, flex: 1, textAlign: 'right' }}>
                      {r.visits}{' '}{t('market.luot')}{' '}{formatMoney(r.revenue)} · {r.revenuePct}%
                      {highWalkout && <span title={t('market.nhieu_khach_nhom_nay_bo_ve')} style={{ color: '#e74c3c' }}> ⚠️</span>}
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ ...sub, marginTop: 6 }}>
              {t('market.thong_ke_khach_vang_lai_mua')}
            </div>
            {adSuggest && (
              <Callout tone="ok" style={{ marginTop: 6 }}>
                <div style={{ fontSize: 12 }}>
                  {t('market.nen_quang_cao')}{' '}<b>{adSuggest.ad.icon} {adSuggest.ad.name}</b>{' '}{t('market.nham')}{' '}{adSuggest.reason}.
                </div>
              </Callout>
            )}
          </>
        )}
      </div>
    </>
  );
}
