import { productById } from '../../data/products';
import { styles } from './shared';
import { t } from '../../core/i18n';

/** GĐ936: tách khỏi MorningPanel (nguyên văn hai thẻ "Hàng của dịp hôm nay" + "Hàng hot tuần này"). */
export function HotGoodsCards({ eventHot, weekHot, haveStock }: { eventHot: string[]; weekHot: string[]; haveStock: (id: string) => boolean }) {
  const line = (ids: string[]) => ids.map((id) => `${productById(id).name}${haveStock(id) ? ' ✓' : t('alerts.chua_co')}`).join(', ');
  return (
    <>
      {eventHot.length > 0 && (
        <div style={{ ...styles.card, display: 'block', marginBottom: 8 }}>
          <b style={styles.cardTitle}>{t('alerts.hang_cua_dip_hom_nay')}</b>
          <div style={{ fontSize: 12, marginTop: 2 }}>{line(eventHot)}</div>
        </div>
      )}
      {weekHot.length > 0 && (
        <div style={{ ...styles.card, display: 'block', marginBottom: 8 }}>
          <b style={styles.cardTitle}>{t('alerts.hang_hot_tuan_nay')}</b>
          <div style={{ fontSize: 12, marginTop: 2 }}>{line(weekHot)}</div>
        </div>
      )}
    </>
  );
}
