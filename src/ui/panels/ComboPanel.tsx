import { useGame } from '../../core/store';
import { formatMoney, productById } from '../../data/products';
import { COMBO_PULL, COMBO_UNLOCK, maxActiveCombos, nextComboSlotLevel, unlockedCombos } from '../../data/combos';
import { Footer, styles } from './shared';

/** Bật/tắt combo khuyến mãi. */
export function ComboPanel() {
  const { level, activeCombos, toggleCombo, closePanel, priceOf } = useGame();
  const combos = unlockedCombos(level);
  const max = maxActiveCombos(level);
  const nextSlot = nextComboSlotLevel(level);
  return (
    <>
      <h2 style={styles.title}>🎁 Combo khuyến mãi</h2>
      <p style={styles.sub}>
        Khách lấy một món trong combo đang chạy thì khoảng {Math.round(COMBO_PULL * 100)}% sẽ lấy thêm món kia, và được giảm giá khi mua đủ cặp.
        Chạy tối đa {max} combo cùng lúc ({activeCombos.length}/{max}){nextSlot ? `, lên cấp ${nextSlot} được chạy thêm 1` : ''}. Nhớ bày đủ cả hai món lên kệ.
      </p>
      {activeCombos.length >= max && (
        <p style={{ ...styles.sub, color: '#f1c40f' }}>⚠️ Đã chạy đủ {max}/{max} combo. Bấm "Đang chạy" để tắt một combo thì mới bật được combo khác{nextSlot ? `, hoặc lên cấp ${nextSlot} để chạy thêm.` : '.'}</p>
      )}
      {level < COMBO_UNLOCK ? <p style={styles.sub}>🔒 Mở ở cấp {COMBO_UNLOCK}.</p> : (
        <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
          {combos.map((c) => {
            const on = activeCombos.includes(c.id);
            const blocked = !on && activeCombos.length >= max;
            const [a, b] = c.items.map(productById);
            const full = priceOf(a.id) + priceOf(b.id);
            const cut = Math.round((full * c.discount) / 100) * 100;
            const margin = full - cut - a.buy - b.buy;
            return (
              <div key={c.id} style={{ ...styles.card, gap: 10, outline: on ? '2px solid #2ecc71' : undefined }}>
                <span style={{ fontSize: 22 }}>{c.icon}</span>
                <div style={{ flex: 1 }}>
                  <b>{c.name}</b>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    {formatMoney(full)} → <b>{formatMoney(full - cut)}</b> (giảm {Math.round(c.discount * 100)}%) · lãi cả cặp{' '}
                    <span style={{ color: margin > 0 ? '#2ecc71' : '#e74c3c' }}>{formatMoney(margin)}</span>
                  </div>
                </div>
                <button
                  disabled={blocked}
                  title={blocked ? `Đã chạy đủ ${max} combo, hãy tắt bớt một combo khác` : undefined}
                  style={{ ...styles.btn, background: on ? '#2ecc71' : '#fff', color: on ? '#fff' : undefined, opacity: blocked ? 0.45 : 1, cursor: blocked ? 'not-allowed' : undefined }}
                  onClick={() => toggleCombo(c.id)}
                >
                  {on ? 'Đang chạy' : blocked ? 'Đủ rồi' : 'Chạy'}
                </button>
              </div>
            );
          })}
        </div>
      )}
      <Footer onClose={closePanel} />
    </>
  );
}
