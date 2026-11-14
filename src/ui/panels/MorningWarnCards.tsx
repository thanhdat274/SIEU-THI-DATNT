import { useGame } from '../../core/store';
import { formatMoney } from '../../data/products';
import { Callout } from './shared';
import { t } from '../../core/i18n';

/** GĐ925: tách khỏi MorningPanel (nguyên văn hai Callout cảnh báo: kệ cần chú ý + combo kém hiệu quả). */
export function SickShelvesCard({ sickest }: { sickest: { icon: string; text: string }[] }) {
  const openPanel = useGame((s) => s.openPanel);
  return (
    <Callout tone="danger" title={t('panels_morning.ke_can_chu_y')} style={{ marginBottom: 8 }}>
      <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
        {sickest.map((s, i) => (
          <button key={i} onClick={() => openPanel({ type: 'analytics' })}
            style={{ display: 'flex', gap: 8, alignItems: 'baseline', background: 'transparent', border: 'none', color: '#e74c3c', fontSize: 12, cursor: 'pointer', padding: 0, textAlign: 'left' }}>
            <span>{s.icon} {s.text}{' '}{t('panels_morning.so_phan_tich')}</span>
          </button>
        ))}
      </div>
    </Callout>
  );
}

export interface YesterCombo { def: { id: string; icon: string; name: string }; t: { count: number; discount: number }; margin: number }

export function YesterCombosCard({ yesterCombos }: { yesterCombos: YesterCombo[] }) {
  const openPanel = useGame((s) => s.openPanel);
  return (
    <Callout tone="accent" title={t('panels_morning.combo_hom_qua_kem_hieu_qua')} style={{ marginBottom: 8 }}>
      <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
        {yesterCombos.map(({ def, t: st, margin }) => (
          <button key={def.id} onClick={() => openPanel({ type: 'combos' })}
            style={{ display: 'flex', gap: 8, alignItems: 'baseline', background: 'transparent', border: 'none', color: '#f1c40f', fontSize: 12, cursor: 'pointer', padding: 0, textAlign: 'left' }}>
            <span>{def.icon} "{def.name}{t('panels_morning.hom_qua')}{' '}{st.count}{' '}{t('panels_morning.lan_giam')}{' '}{formatMoney(st.discount)} · <b>{t('panels_morning.lai_ca_cap')}{' '}{formatMoney(margin)}</b> {margin < 0 ? t('panels_morning.lo') : t('panels_morning.ban_cham')}{' '}{t('panels_morning.xet_xoay_slot_o_combo')}</span>
          </button>
        ))}
      </div>
    </Callout>
  );
}
