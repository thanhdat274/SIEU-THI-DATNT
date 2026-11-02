import { useGame } from '../../core/store';
import { supplyChainOverview, supplyRestockManifest } from '../../data/supplyChain';
import { Callout, styles } from './shared';

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
        title={<>🔗 Rốn kho chung{sc.choke ? ` — nghẽn: ${sc.choke.icon} ${sc.choke.name}` : ''}</>}>
        <div style={{ marginTop: 4, display: 'grid', gap: 3 }}>
          {sc.outlets.filter((o) => o.state !== 'idle').map((o) => (
            <div key={o.id} style={{ fontSize: 12, color: o.state === 'danger' ? '#e74c3c' : o.state === 'warn' ? '#e67e22' : 'inherit', opacity: o.state === 'ok' ? 0.85 : 1 }}>
              {o.icon} <b>{o.name}</b>: {o.line}
            </div>
          ))}
           {sc.choke && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>Xử lý điểm nghẽn trước — nguồn cho các điểm còn lại là kho chung.</div>}
          {(() => {
            // GĐ202: 'Phiếu nạp kho' — biến gợi ý thành số đơn vị cụ thể cần chở/nhập cho từng điểm bán.
            const rm = supplyRestockManifest(storage, branch ?? undefined, quanNuoc, level, quanNuocLast, weather, day);
            if (rm.total === 0 && sc.choke) return null;
            return (
              <div style={{ marginTop: 6, borderTop: '1px dashed rgba(255,255,255,0.18)', paddingTop: 6 }}>
                <div style={{ fontSize: 12 }}>🧾 Phiếu nạp kho: {rm.line}</div>
                {rm.lines.length > 0 && (
                  <div style={{ marginTop: 3, display: 'grid', gap: 2, fontSize: 11, opacity: 0.9 }}>
                    {rm.lines.map((l, i) => (
                      <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>
                          {l.outlet === 'teahouse' ? '🍵' : '🏪'} <b>{l.label}</b>: thêm <b>{l.need.toLocaleString('vi-VN')}</b> (kho chung có {l.inWarehouse.toLocaleString('vi-VN')}) — {l.source === 'warehouse' ? 'chở được' : 'nhập thêm'}
                        </span>
                        <button onClick={() => openPanel({ type: l.outlet === 'teahouse' ? ('quannuoc' as never) : ('branch' as never) })}
                          style={{ ...styles.btn, fontSize: 11, padding: '1px 6px', flex: '0 0 auto' }}>
                          {l.source === 'warehouse' ? 'nạp →' : 'nhập →'}
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
