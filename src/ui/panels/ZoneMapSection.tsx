import { playerPos } from '../../core/playerPos';
import { useGame } from '../../core/store';
import { formatMoney } from '../../data/products';
import { SAP_LOTS, SAP_TIERS, bestSapKind, sapKindOf, sapLotIncome, sapTierOf } from '../../data/sapRong';
import { WEATHER } from '../../data/weather';
import { MAP_LANDMARKS, ZONES, zoneMapView } from '../../data/zones';
import { styles } from './shared';

// Khung bản đồ bao hết các khu; trục z thế giới hướng xuống dưới trên hình
const X1 = Math.min(...ZONES.map((z) => z.bounds.x1));
const X2 = Math.max(...ZONES.map((z) => z.bounds.x2));
const Z1 = Math.min(...ZONES.map((z) => z.bounds.z1));
const Z2 = Math.max(...ZONES.map((z) => z.bounds.z2));

/** Bản đồ thu nhỏ các khu (GĐ504, bước 5 mở rộng bản đồ): khu đã mở / khoá, đường chính, sạp Ngõ 2. */
export function ZoneMapSection() {
  const { biz, level, money, openZone, cycleSapKind, upgradeSapLot, weather, day, forecast } = useGame();
  const tmr = forecast[0];
  const tip = tmr ? bestSapKind(tmr, day + 1) : undefined;
  const cells = zoneMapView(biz.zones, level, money);
  const sap = biz.sapRong ?? 0;
  return (
    <div style={{ ...styles.card, display: 'block', marginTop: 10 }}>
      <b>🗺️ Bản đồ khu phố</b>
      <svg viewBox={`${X1} ${Z1} ${X2 - X1} ${Z2 - Z1}`} style={{ width: '100%', maxHeight: 180, display: 'block', margin: '6px 0', background: '#dfe6e9', borderRadius: 6 }}>
        {cells.map(({ zone: z, state }) => (
          <g key={z.id}>
            <rect x={z.bounds.x1} y={z.bounds.z1} width={z.bounds.x2 - z.bounds.x1} height={z.bounds.z2 - z.bounds.z1}
              fill={state === 'open' ? '#86b862' : '#b2bec3'} stroke="#fff" strokeWidth={1.5} />
            <text x={(z.bounds.x1 + z.bounds.x2) / 2} y={z.bounds.z1 + 16} fontSize={11} textAnchor="middle" fill="#2d3436">
              {state === 'open' ? z.icon : '🔒'} {z.name}
            </text>
          </g>
        ))}
        <rect x={X1} y={3} width={X2 - X1} height={6} fill="#4a4a4a" />
        {MAP_LANDMARKS.map((l) => <text key={l.icon} x={l.x} y={l.z} fontSize={9} textAnchor="middle"><title>{l.name}</title>{l.icon}</text>)}
        <circle cx={playerPos.x} cy={playerPos.z} r={3} fill="#0984e3" stroke="#fff" strokeWidth={1} />
        {Array.from({ length: Math.min(sap, SAP_LOTS) }, (_, i) => (
          <circle key={i} cx={86 + i * 8} cy={-0.5} r={2.2} fill="#d63031" />
        ))}
      </svg>
      {cells.filter((c) => c.state !== 'open').map(({ zone: z, state }) => (
        <div key={z.id} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{z.icon} <b>{z.name}</b>: {z.desc}</span>
          <button style={styles.btn} disabled={state !== 'ok'} onClick={() => openZone(z.id)}>
            {state === 'level' ? `Cấp ${z.unlock}` : `Mở ${formatMoney(z.cost)}`}
          </button>
        </div>
      ))}
      {cells.some((c) => c.zone.id === 'ngo2' && c.state === 'open') && (
        <div style={{ fontSize: 12, opacity: 0.8 }}>🛒 Sạp hàng rong Ngõ 2: {sap}/{SAP_LOTS} lô (thuê ở lô trống, bấm L)</div>
      )}
      {sap > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {Array.from({ length: Math.min(sap, SAP_LOTS) }, (_, i) => {
            const k = sapKindOf(biz.sapKinds, i);
            const t = SAP_TIERS[sapTierOf(biz.sapTiers, i)];
            const up = SAP_TIERS[sapTierOf(biz.sapTiers, i) + 1];
            return (
              <span key={i} style={{ display: 'inline-flex', gap: 4 }}>
                <button style={styles.btn} title={`${k.hint} — bấm để đổi món`} onClick={() => cycleSapKind(i)}>
                  Lô {i + 1}: {t.icon} {k.icon} {k.name} · hôm nay {formatMoney(Math.round(sapLotIncome(k, weather, day) * t.mul))}
                </button>
                {up && (
                  <button style={styles.btn} disabled={money < up.cost} title={`Nâng lên ${up.name}: thu ×${up.mul}`} onClick={() => upgradeSapLot(i)}>
                    ⬆ {up.icon} {formatMoney(up.cost)}
                  </button>
                )}
              </span>
            );
          })}
          {tmr && tip && (
            <div style={{ fontSize: 12, opacity: 0.8, width: '100%' }}>
              {WEATHER[tmr].icon} Mai {WEATHER[tmr].name.toLowerCase()}: {tmr === 'rain' || tmr === 'storm' ? 'sạp nghỉ bán' : `nên bán ${tip.icon} ${tip.name}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
