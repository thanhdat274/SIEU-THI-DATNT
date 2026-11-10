import { trendMark } from '../trendMark';
import { useGame } from '../../core/store';
import { formatMoney, productById } from '../../data/products';
import { COMBO_PULL, COMBO_UNLOCK, comboById, comboSuggest, liveWeakCombo, maxActiveCombos, nextComboSlotLevel, unlockedCombos } from '../../data/combos';
import { comboDaySnapshot } from '../../core/slices/comboDay';
import { comboMargin, comboRealizedPayoff } from '../../data/comboPayoff';
import { Footer, styles } from './shared';

/** Bật/tắt combo khuyến mãi. */
export function ComboPanel() {
  const { level, activeCombos, toggleCombo, closePanel, priceOf, comboHitCount, sales } = useGame();
  const combos = unlockedCombos(level);
  const max = maxActiveCombos(level);
  const nextSlot = nextComboSlotLevel(level);
  const suggestions = activeCombos.length < max ? comboSuggest(level, sales, activeCombos) : [];
  // GĐ124: hiệu quả combo hôm nay (transient) — re-render theo store (mua bán làm store đổi), đọc bản snap.
  const comboToday = comboDaySnapshot();
  // GĐ1242 — lời kết sống: combo nào hôm nay chiếm slot mà chưa kích hoạt lượt nào trong khi combo khác đã bán.
  const weak = liveWeakCombo(activeCombos, comboToday);
  const weakCombo = weak ? comboById(weak.id) : null;
  // GĐ1244 — đã chạy đủ slot mà có combo yếu: gợi ý combo NÊN ĐỔI vào slot vừa bỏ (comboSuggest xử replaceId
  // như slot đã giải phóng), đóng vòng "tắt combo yếu → bật combo nào". Chỉ khi đủ slot để tránh trùng dòng "Còn slot".
  const replaceSug = weak && activeCombos.length >= max ? comboSuggest(level, sales, activeCombos, 1, { replaceId: weak.id }) : [];
  // GĐ2213 — "kèo lấn lãi bán hàng": đối chiếu chiết khấu đã trả hôm nay với lời thật của cặp món (giá nhập).
  const realized = comboRealizedPayoff(
    Object.fromEntries(activeCombos.map((id) => [id, comboToday[id]?.count ?? 0])),
    Object.fromEntries(activeCombos.map((id) => [id, comboToday[id]?.discount ?? 0])),
    activeCombos,
  );
  const overrun = realized.filter((r) => r.overrun);
  return (
    <>
      <h2 style={styles.title}>🎁 Combo khuyến mãi</h2>
      <p style={styles.sub}>
        Khách lấy một món trong combo đang chạy thì khoảng {Math.round(COMBO_PULL * 100)}% sẽ lấy thêm món kia, và được giảm giá khi mua đủ cặp.
        Chạy tối đa {max} combo cùng lúc ({activeCombos.length}/{max}){nextSlot ? `, lên cấp ${nextSlot} được chạy thêm 1` : ''}. Nhớ bày đủ cả hai món lên kệ.
        Mỗi combo hiện số lần đã kích hoạt ở quầy — tắt combo ít khách mua để đổi slot cho món mới.
      </p>
      {suggestions.length > 0 && (
        <p style={{ ...styles.sub, color: '#9ecbff', margin: '4px 0' }}>
          💡 Còn slot, nên bật: {suggestions.map((s) => `"${s.name}" (${s.reason})`).join(' · ')}
        </p>
      )}
      {weakCombo && (
        <p style={{ ...styles.sub, color: '#e67e22', margin: '4px 0' }} title="Đếm từ lượt combo kích hoạt ở quầy hôm nay (transient): combo này 0 lượt trong khi combo khác đã bán — chiếm slot không tác dụng">
          📊 Hôm nay combo <b>"{weakCombo.name}"</b> chưa kích hoạt lượt nào mà các combo khác đã bán — nó đang chiếm slot. Nếu muốn đổi cho combo khác, bấm "Đang chạy" để tắt rồi bật combo khác{activeCombos.length >= max ? ' (slots đã đủ)' : ''}.
        </p>
      )}
      {replaceSug.length > 0 && weakCombo && (
        <p style={{ ...styles.sub, color: '#9ecbff', margin: '4px 0' }} title="Gợi ý đổi combo yếu lấy combo khác (rank theo món bán chạy + món chưa combo khác phủ)">
          🔁 Nếu tắt <b>"{weakCombo.name}"</b> thì nên bật: {replaceSug.map((s) => `"${s.name}" (${s.reason})`).join(' · ')}
        </p>
      )}
      {overrun.length > 0 && (
        <p style={{ ...styles.sub, color: '#e74c3c', margin: '4px 0' }} title="Chiết khấu combo đã trả hôm nay vượt lời thật của cặp món (giá nhập) — kèo lấn lãi bán hàng, ngược Luật cứng">
          🔴 Kèo lấn lãi bán hàng: {overrun.map((r) => `"${r.name}" chiết khấu ${formatMoney(r.discountGiven)} nhưng lời cặp chỉ ~${formatMoney(r.count * r.gross)}`).join(' · ')} — nên tắt/đổi combo này cho khỏi lỗ lời.
        </p>
      )}
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
                    <span style={{ color: margin > 0 ? '#2ecc71' : '#e74c3c' }}>{trendMark(margin)}{formatMoney(margin)}</span>
                    <span style={{ opacity: 0.7 }}> · chiết khấu ăn ~{Math.round(comboMargin(c).eaten * 100)}% lời</span>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.65 }}>🔥 đã kích hoạt {comboHitCount?.[c.id] ?? 0} lần ở quầy</div>
                  <div style={{ fontSize: 12 }}>
                    <span style={{ opacity: 0.85 }}>Hôm nay: </span>
                    {(() => {
                      const t = comboToday[c.id];
                      if (!t || !t.count) return <span style={{ opacity: 0.5 }}>chưa kích hoạt</span>;
                      return (
                        <span style={{ fontWeight: 600 }}>
                          {t.count} lần · giảm {formatMoney(t.discount)}
                        </span>
                      );
                    })()}
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
