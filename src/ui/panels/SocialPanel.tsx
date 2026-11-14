import { useGame } from '../../core/store';
import { formatMoney, fmtMul } from '../../data/products';
import { shortLabel } from '../shortLabel';
import { activeBuzz, APOLOGY_COST, promoBoost, PROMO_MIN_FOLLOWERS, SOCIAL_UNLOCK } from '../../data/social';
import { crisisStatus, recentAvgRevenue } from '../../data/minorPayoff';
import { socialValue } from '../../data/socialValue';
import { Callout, Footer, stars, starColor, styles } from './shared';
import { t } from '../../core/i18n';

/** GĐ1646: nút quảng bá bị khóa thì nói lý do ngay trên nút, không để "Đăng bài" câm. */
export const promoLabel = (level: number, followers: number) =>
  level < SOCIAL_UNLOCK ? t('panels_people.cap', { SOCIAL_UNLOCK }) : followers < PROMO_MIN_FOLLOWERS ? t('panels_people.can_theo_doi', { PROMO_MIN_FOLLOWERS }) : t('panels_people.dang_bai');

export function SocialPanel() {
  const { social, day, level, money, history, apologize, promoteShop, closePanel } = useGame();
  const buzz = activeBuzz(social, day);
  const posts = [...social.posts].reverse();
  const promoDone = social.promoDay === day;
  return (
    <>
      <h2 style={styles.title}>{t('panels_people.mang_xa_hoi_cua_tiem')}</h2>
      <p style={styles.sub}>
        {t('panels_people.khach_rat_hai_long_hay_rat')}{level < SOCIAL_UNLOCK && <b>{' '}{t('panels_people.mo_o_cap')}{' '}{SOCIAL_UNLOCK}.</b>}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div style={{ ...styles.card, display: 'block' }}><small style={{ opacity: 0.7 }}>{t('panels_people.nguoi_theo_doi')}</small><div><b style={{ fontSize: 18 }}>{social.followers}</b></div></div>
        <div style={{ ...styles.card, display: 'block' }}>
          <small style={{ opacity: 0.7 }}>{t('panels_people.hom_nay_2')}</small>
          <div><b>{buzz ? (buzz.kind === 'hype' ? t('panels_people.dang_hot_khach', { v0: fmtMul(buzz.mul) }) : buzz.responded ? t('panels_people.dang_lang_xuong_khach', { v0: fmtMul(buzz.mul) }) : t('panels_people.khung_hoang_khach', { v0: fmtMul(buzz.mul) })) : t('panels_people.binh_thuong')}</b></div>
          {buzz && <small style={{ opacity: 0.7 }}>{t('panels_people.toi_het_ngay')}{' '}{buzz.until}</small>}
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
            <Callout tone="accent" title={t('panels_people.buzz_khen_dang_sinh_tien')} style={{ marginBottom: 10 }}>
              {t('panels_people.he_so_khach')}{fmtMul(sv.traffic)}{' '}{t('panels_people.them')}{Math.round(sv.deltaKhachPerDay)}{' '}{t('panels_people.khach_ngay_uoc')}{formatMoney(Math.round(sv.moneyDeltaPerDay))}{t('panels_people.ngay_theo_gia_gio_hom_nay')}
            </Callout>
          );
        if (buzz?.kind === 'crisis' && buzz.responded)
          return (
            <Callout tone="ok" title={t('panels_people.da_xin_loi_khach_dang_quay')} style={{ marginBottom: 10 }}>
              {t('panels_people.khach_giu_o')}{fmtMul(sv.traffic)}{' '}{t('panels_people.nho_xin_loi_ma_giu_them')}{Math.round(sv.apologyGainKhach)}{' '}{t('panels_people.khach_ngay_so_voi_mac_ke')}{formatMoney(Math.round(sv.apologyGainMoney))}{t('panels_people.ngay')}
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
            <span style={{ flex: 1, minWidth: 160, fontSize: 13 }}>{t('panels_people.mot_bai_che_tiem_dang_lan')}</span>
            <button style={{ ...styles.btn, background: '#f1c40f' }} disabled={money < APOLOGY_COST} onClick={apologize}>{shortLabel(t('panels_people.xin_loi', { v0: formatMoney(APOLOGY_COST) }), APOLOGY_COST, money)}</button>
            {cs.daysLeft > 0 && (
              <div style={{ flexBasis: '100%', fontSize: 12, opacity: 0.85 }}>
                {t('panels_people.con_2')}{' '}{cs.daysLeft}{' '}{t('panels_people.ngay_khung_hoang_het_han_ngay')}{' '}{cs.until}{t('panels_people.xin_loi_dua_khach_tu')}{fmtMul(cs.crisisMul)}{' '}{t('panels_people.len')}{fmtMul(cs.apologyMul)}{t('panels_people.cuu_lai')}{Math.round(cs.savedOfNormal * 100)}{t('panels_people.khach_moi_ngay_con_lai')}
                {avgRev7 > 0 && <>{t('panels_people.uoc')}{formatMoney(Math.round(avgRev7 * cs.savedOfNormal))}{t('panels_people.ngay_binh_quan_7_ngay')}</>}.
              </div>
            )}
          </div>
        );
      })()}
      <div style={{ ...styles.card, marginBottom: 12 }}>
        <span style={{ flex: 1, fontSize: 13 }}>
          {t('panels_people.dang_bai_quang_ba_moi_ngay')}{Math.round(promoBoost(social.followers) * 100)}{t('panels_people.khach_ghe')}
          {social.followers < PROMO_MIN_FOLLOWERS && t('panels_people.can_nguoi_theo_doi', { PROMO_MIN_FOLLOWERS })}
        </span>
        <button style={{ ...styles.btn, background: promoDone ? '#666' : '#f1c40f' }} disabled={promoDone || social.followers < PROMO_MIN_FOLLOWERS || level < SOCIAL_UNLOCK} onClick={promoteShop}>
          {promoDone ? t('panels_people.da_dang') : promoLabel(level, social.followers)}
        </button>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {!posts.length && <p style={styles.sub}>{t('panels_people.chua_co_bai_nao_nhac_toi')}</p>}
        {posts.map((p) => (
          <div key={p.id} style={{ ...styles.card, display: 'block', border: p.viral ? `1px solid ${starColor(p.stars)}` : undefined }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
              <b>{p.own ? '🏪 ' : ''}{p.author}</b>
              {!p.own && <span style={{ color: starColor(p.stars) }}>{stars(p.stars)}</span>}
              {p.viral && <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 999, background: starColor(p.stars), color: '#222' }}>{t('panels_people.lan_truyen')}</span>}
              <small style={{ marginLeft: 'auto', opacity: 0.6 }}>{t('panels_people.ngay_2')}{' '}{p.day}</small>
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
