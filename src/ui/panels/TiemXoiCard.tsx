import { trendMark } from '../trendMark';
import { formatMoney } from '../../data/products';
import { tiemXoiMorning, TIEM_XOI_WAGE } from '../../data/tiemXoi';
import { Callout } from './shared';
import { t } from '../../core/i18n';

type Xoi = Parameters<typeof tiemXoiMorning>;

/** GĐ924: tách khỏi MorningPanel (nguyên văn thẻ "Tiệm xôi"). */
export function TiemXoiCard({ tiemXoi, last }: { tiemXoi: Xoi[0]; last: Xoi[1] }) {
  const m = tiemXoiMorning(tiemXoi, last);
  return (
    <Callout tone={m.net !== null && m.net < 0 ? 'warn' : 'ok'} style={{ marginBottom: 8 }} title={t('panels_xoi.tiem_xoi')}>
      <div style={{ fontSize: 12, marginTop: 2 }}>
        {last
          ? <>{t('panels_xoi.hom_qua_nau')}{' '}{last.total}{' '}{t('panels_xoi.phan_re_hon_nhap_le')}{' '}{formatMoney(last.saved)}{' '}{t('panels_xoi.luong')}{' '}{formatMoney(last.wages)} = <b style={{ color: m.net! >= 0 ? '#2ecc71' : '#e74c3c' }}>{trendMark(m.net!)}{formatMoney(m.net!)}</b></>
          : t('panels_xoi.moi_mo_ket_qua_co_sau')}
      </div>
      {!!last?.dineRevenue && (
        <div style={{ fontSize: 12, marginTop: 2, color: '#2ecc71' }}>
          {t('panels_xoi.khach_ngoi_an_tai_cho')}{' '}{last.dine}{' '}{t('panels_xoi.suat')}{' '}<b>+{formatMoney(last.dineRevenue)}</b>{' '}{t('panels_xoi.ban_tai_cho')}
        </div>
      )}
      {m.idle && <div style={{ fontSize: 12, marginTop: 2, color: '#e67e22' }}>{t('panels_xoi.kho_xoi_da_du_tho_con')}{' '}{formatMoney(TIEM_XOI_WAGE)}{t('panels_xoi.ngay')}</div>}
    </Callout>
  );
}
