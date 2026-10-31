import { useGame } from '../../core/store';
import { formatMoney } from '../../data/products';
import { activeBuzz, APOLOGY_COST, promoBoost, PROMO_MIN_FOLLOWERS, SOCIAL_UNLOCK } from '../../data/social';
import { crisisStatus, recentAvgRevenue } from '../../data/minorPayoff';
import { socialValue } from '../../data/socialValue';
import { Callout, Footer, stars, starColor, styles } from './shared';

export function SocialPanel() {
  const { social, day, level, money, history, apologize, promoteShop, closePanel } = useGame();
  const buzz = activeBuzz(social, day);
  const posts = [...social.posts].reverse();
  const promoDone = social.promoDay === day;
  return (
    <>
      <h2 style={styles.title}>📱 Mạng xã hội của tiệm</h2>
      <p style={styles.sub}>
        Khách rất hài lòng hay rất bực mình hay đăng bài về tiệm. Bài lan truyền thì cả phường biết: khen thì mấy ngày liền đông khách,
        chê thì khách ngại ghé cho tới khi tiệm xin lỗi.{level < SOCIAL_UNLOCK && <b> Mở ở cấp {SOCIAL_UNLOCK}.</b>}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div style={{ ...styles.card, display: 'block' }}><small style={{ opacity: 0.7 }}>👥 Người theo dõi</small><div><b style={{ fontSize: 18 }}>{social.followers}</b></div></div>
        <div style={{ ...styles.card, display: 'block' }}>
          <small style={{ opacity: 0.7 }}>📈 Hôm nay</small>
          <div><b>{buzz ? (buzz.kind === 'hype' ? `🔥 Đang hot, khách ×${buzz.mul}` : buzz.responded ? `🙏 Đang lắng xuống, khách ×${buzz.mul}` : `⚠️ Khủng hoảng, khách ×${buzz.mul}`) : 'Bình thường'}</b></div>
          {buzz && <small style={{ opacity: 0.7 }}>tới hết ngày {buzz.until}</small>}
        </div>
      </div>
      {(() => {
        // GĐ244: soi buzz mạng xã hội ra khách/tiền thật. Hype → thêm khách đều mỗi ngày; khủng hoàng đã xin
        // lỗi thì vẫn mất chút khách (×APOLOGY_MUL) nhưng giữ lại hơn ~20% khách so với mặc kệ. Trường hợp chưa
        // xin lỗi đã có thẻ chi tiết phía dưới nên không vẽ lại.
        const stats = useGame.getState().stats;
        const sv = socialValue({ social, day, level, customers: stats.customers, revenue: stats.revenue });
        if (buzz?.kind === 'hype')
          return (
            <Callout tone="accent" title="🔥 Buzz khen đang sinh tiền" style={{ marginBottom: 10 }}>
              Hệ số khách ×{sv.traffic} — thêm ~{Math.round(sv.deltaKhachPerDay)} khách/ngày, ước ~{formatMoney(Math.round(sv.moneyDeltaPerDay))}/ngày theo giá giỏ hôm nay.
            </Callout>
          );
        if (buzz?.kind === 'crisis' && buzz.responded)
          return (
            <Callout tone="ok" title="🙏 Đã xin lỗi, khách đang quay lại" style={{ marginBottom: 10 }}>
              Khách giữ ở ×{sv.traffic} — nhờ xin lỗi mà giữ thêm ~{Math.round(sv.apologyGainKhach)} khách/ngày so với mặc kệ (ước ~{formatMoney(Math.round(sv.apologyGainMoney))}/ngày).
            </Callout>
          );
        return null;
      })()}
      {buzz?.kind === 'crisis' && !buzz.responded && (() => {
        // GĐ159: đếm ngày khủng hoảng + quy "xin lỗi" ra khách/tiền. Hệ số thật: CRISIS_MUL 0.72 → APOLOGY_MUL
        // 0.92, chênh đúng 0.20 khách bình thường mỗi ngày còn lại; tiền ước theo bình quân doanh thu 7 ngày
        // của tiệm chính (DayRecord.revenue — đúng luồng khách mà socialTraffic nhân vào).
        const cs = crisisStatus(buzz.until, day);
        const avgRev7 = recentAvgRevenue(history);
        return (
          <div style={{ ...styles.card, background: '#5a2d2d', marginBottom: 10, flexWrap: 'wrap' }}>
            <span style={{ flex: 1, minWidth: 160, fontSize: 13 }}>Một bài chê tiệm đang lan truyền. Đăng bài xin lỗi kèm phiếu giảm giá để khách quay lại.</span>
            <button style={{ ...styles.btn, background: '#f1c40f' }} disabled={money < APOLOGY_COST} onClick={apologize}>🙏 Xin lỗi ({formatMoney(APOLOGY_COST)})</button>
            {cs.daysLeft > 0 && (
              <div style={{ flexBasis: '100%', fontSize: 12, opacity: 0.85 }}>
                Còn {cs.daysLeft} ngày khủng hoảng (hết hạn ngày {cs.until}) — xin lỗi đưa khách từ ×{cs.crisisMul} lên ×{cs.apologyMul}:
                cứu lại ~{Math.round(cs.savedOfNormal * 100)}% khách mỗi ngày còn lại
                {avgRev7 > 0 && <>, ước ~{formatMoney(Math.round(avgRev7 * cs.savedOfNormal))}/ngày (bình quân 7 ngày)</>}.
              </div>
            )}
          </div>
        );
      })()}
      <div style={{ ...styles.card, marginBottom: 12 }}>
        <span style={{ flex: 1, fontSize: 13 }}>
          Đăng bài quảng bá mỗi ngày một lần: hôm nay thêm ~{Math.round(promoBoost(social.followers) * 100)}% khách ghé
          {social.followers < PROMO_MIN_FOLLOWERS && ` (cần ${PROMO_MIN_FOLLOWERS} người theo dõi)`}
        </span>
        <button style={{ ...styles.btn, background: promoDone ? '#666' : '#f1c40f' }} disabled={promoDone || social.followers < PROMO_MIN_FOLLOWERS || level < SOCIAL_UNLOCK} onClick={promoteShop}>
          {promoDone ? '✅ Đã đăng' : '📣 Đăng bài'}
        </button>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {!posts.length && <p style={styles.sub}>Chưa có bài nào nhắc tới tiệm. Phục vụ thật tốt để khách khen lên mạng!</p>}
        {posts.map((p) => (
          <div key={p.id} style={{ ...styles.card, display: 'block', border: p.viral ? `1px solid ${starColor(p.stars)}` : undefined }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
              <b>{p.own ? '🏪 ' : ''}{p.author}</b>
              {!p.own && <span style={{ color: starColor(p.stars) }}>{stars(p.stars)}</span>}
              {p.viral && <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 999, background: starColor(p.stars), color: '#222' }}>🔥 lan truyền</span>}
              <small style={{ marginLeft: 'auto', opacity: 0.6 }}>ngày {p.day}</small>
            </div>
            <div style={{ fontSize: 13, margin: '4px 0' }}>{p.text}</div>
            <small style={{ opacity: 0.7 }}>👍 {p.likes} · 🔁 {p.shares}</small>
          </div>
        ))}
      </div>
      <Footer onClose={closePanel} />
    </>
  );
}
