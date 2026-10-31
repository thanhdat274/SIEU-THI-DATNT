import { useGame } from '../../core/store';
import { formatMoney, productById } from '../../data/products';
import { QUAN_HAND_CUPS, QUAN_PRICE_OPTIONS, quanHandLeft } from '../../data/quanNuoc';
import {
  cleanMenu, QUAN_MENU_SLOTS, QUAN_RECIPES, QUAN_VARIETY_BONUS, recipeCapacity, recipeCupCost,
} from '../../data/quanRecipes';
import { styles } from './shared';

/** Thực đơn pha chế quán nước (GĐ415): chọn tối đa 4 món, mỗi món hiện lời/ly và số ly kho đủ pha. */
export function QuanMenuSection() {
  const { biz, level, storage, day, toggleQuanRecipe, brewQuanHand } = useGame();
  const q = biz.quanNuoc;
  const menu = cleanMenu(q.menu, level);
  const mul = QUAN_PRICE_OPTIONS[q.price].mul;
  return (
    <div style={{ ...styles.card, display: 'block', marginTop: 10 }}>
      <b>📋 Thực đơn pha chế ({menu.length}/{QUAN_MENU_SLOTS})</b>
      <div style={{ fontSize: 12, opacity: 0.75, margin: '2px 0 6px' }}>
        Món pha lời hơn nước chai, cần đủ nguyên liệu trong kho. Mỗi món thêm kéo +{Math.round(QUAN_VARIETY_BONUS * 100)}% khách.
        {menu.length === 0 && ' Chưa chọn món nào: quán chỉ bán nước chai.'}
      </div>
      <button style={{ ...styles.btn, marginLeft: 0, marginBottom: 6 }} disabled={!menu.length || quanHandLeft(q, day) <= 0} onClick={() => brewQuanHand()}
        title="Tự đứng quầy pha một mẻ món đầu tiên đủ nguyên liệu, bán ngay giá tay nghề +20%">
        🍹 Tự pha {QUAN_HAND_CUPS} ly (còn {quanHandLeft(q, day)} mẻ)
      </button>
      {QUAN_RECIPES.map((r) => {
        const locked = level < r.unlock;
        const on = menu.includes(r.id);
        const cap = recipeCapacity(r, storage);
        const profit = Math.round(r.price * mul - recipeCupCost(r));
        const missing = r.uses.filter((u) => (storage[u.id] ?? 0) <= 0).map((u) => productById(u.id).name);
        return (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderTop: '1px solid #0001', opacity: locked ? 0.5 : 1 }}>
            <button
              style={{ ...styles.btn, marginLeft: 0, minWidth: 64, background: on ? '#f1c40f' : '#fff', fontWeight: on ? 700 : undefined }}
              disabled={locked || (!on && menu.length >= QUAN_MENU_SLOTS)}
              onClick={() => toggleQuanRecipe(r.id)}
            >
              {locked ? `Cấp ${r.unlock}` : on ? '✓ Bán' : 'Thêm'}
            </button>
            <div style={{ fontSize: 13, lineHeight: 1.4 }}>
              {r.icon} <b>{r.name}</b> · {formatMoney(Math.round(r.price * mul))} · lời ~{formatMoney(profit)}/ly
              <div style={{ fontSize: 11, opacity: 0.75 }}>
                {r.uses.map((u) => productById(u.id).name).join(' + ')}
                {!locked && (missing.length ? ` · ⚠️ thiếu ${missing.join(', ')}` : ` · kho đủ ~${cap} ly`)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
