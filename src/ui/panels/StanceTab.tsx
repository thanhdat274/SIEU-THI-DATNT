import { useGame } from '../../core/store';
import { STANCE_META, STANCE_UNLOCK, stanceFit, leaningStance } from '../../data/stance';
import { buildStanceCtx } from '../../data/stanceData';
import { card, title } from './businessStyles';

/**
 * Hệ 3 L1 (SPEC-CHIEU-SAU §3.4) — "Tiệm bạn đang nghiêng về hướng nào".
 * Trước khi treo biển (cấp ≥ STANCE_UNLOCK), thẻ đo hoà cho thấy tiệm hiện khớp X/Y tiêu chí của
 * từng hướng; KHÔNG đổi kinh tế. Chỉ đọc số liệu đo qua `buildStanceCtx` + `stanceFit` (thuần).
 */
export function StanceTab() {
  const s = useGame();
  const ctx = buildStanceCtx(s);
  const results = stanceFit(ctx);
  const lean = leaningStance(ctx);
  return (
    <div>
      <div style={card}>
        <div style={title}>🪧 Treo biển định vị</div>
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
          {s.level >= STANCE_UNLOCK
            ? 'Từ cấp 60 bạn có thể treo biển theo một trong ba hướng (lát sau). Dưới đây là tiệm đang khớp hướng nào.'
            : `Mở hệ từ cấp ${STANCE_UNLOCK}. Đây là số liệu đo sẵn để biết tiệm đang nghiêng về hướng nào.`}
        </div>
        {lean && (
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
            Tiệm bạn đang nghiêng về: {STANCE_META[lean].icon} {STANCE_META[lean].name}
          </div>
        )}
        {results.map((r) => (
          <div key={r.id} style={{ ...card, marginBottom: 6 }}>
            <div style={title}>
              {STANCE_META[r.id].icon} {STANCE_META[r.id].name}
            </div>
            {r.checks.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12.5, padding: '1px 0' }}>
                <span>{c.ok ? '✅' : '✗'} {c.label}</span>
                <span style={{ opacity: c.ok ? 1 : 0.9 }}>{c.have} <span style={{ opacity: 0.7 }}>({c.need})</span></span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
