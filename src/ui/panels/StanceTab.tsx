import { useGame } from '../../core/store';
import { STANCE_META, STANCE_UNLOCK, STANCE_IDS, STANCE_TIER_DAYS, stanceTier, stanceActive, stanceFit } from '../../data/stance';
import { buildStanceCtx } from '../../data/stanceData';
import { card, title, btn } from './businessStyles';

/**
 * Hệ 3 (SPEC-CHIEU-SAU §3.4, §3.5, §3.9) — "🪧 Biển hiệu": trước khi treo đo 3 hướng X/Y; sau khi treo
 * hiện hướng đang treo + thanh bậc (tích lũy ngày khớp) + nút gỡ biển. L3 chỉ treo biển + bậc + hiệu ứng
 * Bình dân; nút "đổi hướng" thực tế qua 14 ngày làm lại biển (bậc về 0).
 */
export function StanceTab() {
  const s = useGame();
  const ctx = buildStanceCtx(s);
  const results = stanceFit(ctx);
  const st = s.biz.stance;
  const active = st && stanceActive(st, s.day);
  const tier = st ? stanceTier(st.fitDays ?? 0) : 0;
  const resetting = st && !active;
  return (
    <div>
      <div style={card}>
        <div style={title}>🪧 Treo biển định vị</div>
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
          {s.level < STANCE_UNLOCK
            ? `Mở hệ từ cấp ${STANCE_UNLOCK}. Dưới đây là số liệu đo sẵn để biết tiệm đang nghiêng về hướng nào.`
            : !st
              ? 'Chọn một hướng để treo biển (lần đầu miễn phí). Không treo cũng là lựa chọn hợp lệ — không lợi, không phạt.'
              : `Đang treo: ${STANCE_META[st.id].icon} ${STANCE_META[st.id].name}`}
        </div>
        {st && (
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
            {active
              ? `Cấp biển ${tier} · ${st.fitDays} ngày khớp`
              : resetting
                ? `Đang làm lại biển (${Math.max(0, st.switchUntil! - s.day)} ngày nữa mới có hiệu ứng)`
                : 'Biển chưa có hiệu lực'}
          </div>
        )}
        {st && active && tier < STANCE_TIER_DAYS.length && (
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>
            Còn {STANCE_TIER_DAYS[tier] - st.fitDays} ngày khớp nữa lên bậc {tier + 1}
          </div>
        )}
        {s.level >= STANCE_UNLOCK && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {STANCE_IDS.map((id) => (
              <button key={id} style={{ ...btn, marginLeft: 0 }} onClick={() => useGame.getState().chooseStance(id)}>
                {STANCE_META[id].icon} {STANCE_META[id].name}
              </button>
            ))}
            {st && (
              <button style={{ ...btn, marginLeft: 0 }} onClick={() => useGame.getState().dropStance()}>
                🪧 Gỡ biển
              </button>
            )}
          </div>
        )}
      </div>
      {results.map((r) => (
        <div key={r.id} style={{ ...card, marginBottom: 6, outline: st && st.id === r.id ? '1px solid #f1c40f' : 'none' }}>
          <div style={title}>
            {STANCE_META[r.id].icon} {STANCE_META[r.id].name} {st && st.id === r.id && (active ? '✅' : '⏳')}
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
  );
}
