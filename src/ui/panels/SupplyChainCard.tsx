import { useGame } from '../../core/store';
import { supplyChainOverview, supplyRestockManifest } from '../../data/supplyChain';
import { supplyRestockValue } from '../../data/supplyRestockValue';
import { Callout, styles } from './shared';
import { fmtNum } from '../../core/format';
import { t } from '../../core/i18n';

type Overview = Parameters<typeof supplyChainOverview>;
interface Props {
  storage: Overview[0];
  branch: Overview[1];
  quanNuoc: Overview[2];
  quanNuocLast: Overview[4];
  level: Overview[3];
  weather: Overview[5];
  day: Overview[6];
}

/** GĐ919: tách khỏi MorningPanel (nguyên văn khối 'Rốn kho chung' GĐ199/GĐ202, thuần đọc). */
export function SupplyChainCard({ storage, branch, quanNuoc, quanNuocLast, level, weather, day }: Props) {
  const openPanel = useGame((s) => s.openPanel);
    const sc = supplyChainOverview(storage, branch ?? undefined, quanNuoc, level, quanNuocLast, weather, day);
    return (
      <Callout tone={sc.choke ? (sc.choke.state === 'danger' ? 'danger' : 'warn') : 'info'} style={{ marginBottom: 8 }}
        title={<>{t('panels_misc.ron_kho_chung')}{sc.choke ? t('panels_misc.nghen', { icon: sc.choke.icon, name: sc.choke.name }) : ''}</>}>
        <div style={{ marginTop: 4, display: 'grid', gap: 3 }}>
          {sc.outlets.filter((o) => o.state !== 'idle').map((o) => (
            <div key={o.id} style={{ fontSize: 12, color: o.state === 'danger' ? '#e74c3c' : o.state === 'warn' ? '#e67e22' : 'inherit', opacity: o.state === 'ok' ? 0.85 : 1 }}>
              {o.icon} <b>{o.name}</b>: {o.line}
            </div>
          ))}
           {sc.choke && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{t('panels_misc.xu_ly_diem_nghen_truoc_nguon')}</div>}
          {(() => {
            // GĐ202: 'Phiếu nạp kho' — biến gợi ý thành số đơn vị cụ thể cần chở/nhập cho từng điểm bán.
            const rm = supplyRestockManifest(storage, branch ?? undefined, quanNuoc, level, quanNuocLast, weather, day);
            const rv = supplyRestockValue(rm.lines, level);
            if (rm.total === 0 && sc.choke) return null;
            return (
              <div style={{ marginTop: 6, borderTop: '1px dashed rgba(255,255,255,0.18)', paddingTop: 6 }}>
                <div style={{ fontSize: 12 }}>{t('panels_misc.phieu_nap_kho')}{' '}{rm.line} <span style={{ color: '#e67e22' }}>· {rv.headline}</span></div>
                {rm.lines.length > 0 && (
                  <div style={{ marginTop: 3, display: 'grid', gap: 2, fontSize: 11, opacity: 0.9 }}>
                    {rm.lines.map((l, i) => (
                      <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>
                          {l.outlet === 'teahouse' ? '🍵' : '🏪'} <b>{l.label}</b>{t('panels_misc.them')}{' '}<b>{fmtNum(l.need)}</b>{' '}{t('panels_misc.kho_chung_co')}{' '}{fmtNum(l.inWarehouse)}) — {l.source === 'warehouse' ? t('panels_misc.cho_duoc') : t('panels_misc.nhap_them')}
                          {rv.rows[i] ? <span style={{ color: '#e67e22' }}> ≈ {fmtNum(rv.rows[i].worth)}{t('panels_misc.d_gia_ban_le')}</span> : ''}
                        </span>
                        <button onClick={() => openPanel({ type: l.outlet === 'teahouse' ? ('quannuoc' as never) : ('branch' as never) })}
                          style={{ ...styles.btn, fontSize: 11, padding: '1px 6px', flex: '0 0 auto' }}>
                          {l.source === 'warehouse' ? t('panels_misc.nap') : t('panels_misc.nhap')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </Callout>
    );
}
