import { useGame } from '../../core/store';
import { formatMoney, productById } from '../../data/products';
import { COMBO_PULL, COMBO_UNLOCK, MAX_ACTIVE_COMBOS, unlockedCombos } from '../../data/combos';
import { Footer, styles } from './shared';

/** Bật/tắt combo khuyến mãi. */
export function ComboPanel() {
  const { level, activeCombos, toggleCombo, closePanel, priceOf } = useGame();
  const combos = unlockedCombos(level);
  return (
    <>
      <h2 style={styles.title}>🎁 Combo khuyến mãi</h2>
      <p style={styles.sub}>
        Khách lấy một món trong combo đang chạy thì khoảng {Math.round(COMBO_PULL * 100)}% sẽ lấy thêm món kia, và được giảm giá khi mua đủ cặp.
        Chạy tối đa {MAX_ACTIVE_COMBOS} combo cùng lúc ({activeCombos.length}/{MAX_ACTIVE_COMBOS}). Nhớ bày đủ cả hai món lên kệ.
      </p>
      {level < COMBO_UNLOCK ? <p style={styles.sub}>🔒 Mở ở cấp {COMBO_UNLOCK}.</p> : (
        <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
          {combos.map((c) => {
            const on = activeCombos.includes(c.id);
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
                <button style={{ ...styles.btn, background: on ? '#2ecc71' : '#fff', color: on ? '#fff' : undefined }} onClick={() => toggleCombo(c.id)}>
                  {on ? 'Đang chạy' : 'Chạy'}
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
