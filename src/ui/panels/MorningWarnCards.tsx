import { useGame } from '../../core/store';
import { formatMoney } from '../../data/products';
import { Callout } from './shared';

/** GĐ925: tách khỏi MorningPanel (nguyên văn hai Callout cảnh báo: kệ cần chú ý + combo kém hiệu quả). */
export function SickShelvesCard({ sickest }: { sickest: { icon: string; text: string }[] }) {
  const openPanel = useGame((s) => s.openPanel);
  return (
    <Callout tone="danger" title="🔎 Kệ cần chú ý" style={{ marginBottom: 8 }}>
      <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
        {sickest.map((s, i) => (
          <button key={i} onClick={() => openPanel({ type: 'analytics' })}
            style={{ display: 'flex', gap: 8, alignItems: 'baseline', background: 'transparent', border: 'none', color: '#e74c3c', fontSize: 12, cursor: 'pointer', padding: 0, textAlign: 'left' }}>
            <span>{s.icon} {s.text} → sổ phân tích</span>
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
    <Callout tone="accent" title="💡 Combo hôm qua kém hiệu quả" style={{ marginBottom: 8 }}>
      <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
        {yesterCombos.map(({ def, t, margin }) => (
          <button key={def.id} onClick={() => openPanel({ type: 'combos' })}
            style={{ display: 'flex', gap: 8, alignItems: 'baseline', background: 'transparent', border: 'none', color: '#f1c40f', fontSize: 12, cursor: 'pointer', padding: 0, textAlign: 'left' }}>
            <span>{def.icon} "{def.name}" hôm qua {t.count} lần · giảm {formatMoney(t.discount)} · <b>lãi cả cặp {formatMoney(margin)}</b> {margin < 0 ? '(lỗ)' : '(bán chậm)'} → xét xoay slot ở combo</span>
          </button>
        ))}
      </div>
    </Callout>
  );
}
