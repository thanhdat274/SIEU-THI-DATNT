import { useGame } from '../../core/store';
import { formatMoney, productById, fmtMul } from '../../data/products';
import { QUAN_HAND_CUPS, QUAN_PRICE_OPTIONS, QUAN_TIERS, quanHandLeft, quanMenuSlots, quanTierOf } from '../../data/quanNuoc';
import {
  cleanMenu, QUAN_RECIPES, QUAN_VARIETY_BONUS, recipeCapacity, recipeCupCost,
} from '../../data/quanRecipes';
import { quanBestAdd, quanBestAddLine } from '../../data/quanMenuSuggest';
import { quanHandPayoff, quanHandPayoffLine } from '../../data/quanHandPayoff';
import { styles } from './shared';
import { blockedLabel, shortLabel } from '../shortLabel';
import { newUnlockMark } from '../../data/advice';
import { t } from '../../core/i18n';

/** Thực đơn pha chế quán nước (GĐ415): chọn tối đa 4 món, mỗi món hiện lời/ly và số ly kho đủ pha. */
export function QuanMenuSection() {
  const { biz, level, money, storage, day, weather, toggleQuanRecipe, brewQuanHand, upgradeQuanTier } = useGame();
  const tier = quanTierOf(biz.quanNuoc);
  const nextTier = QUAN_TIERS[tier + 1];
  const q = biz.quanNuoc;
  const slots = quanMenuSlots(q);
  const menu = cleanMenu(q.menu, level, slots);
  const mul = QUAN_PRICE_OPTIONS[q.price].mul;
  // GĐ1306 — tối nay nên thêm món nào (lãi/ly × mở ×khách đồ nóng × kho): xếp hạng công thức chưa bán
  const suggestLine = quanBestAddLine(quanBestAdd({ level, storage, menu, priceMul: mul, weather, day, slots }), weather);
  // GĐ1307 — mẻ TỰ PHA +20% tay nghề đáng bao nhiêu /mẻ và cả ngày (soi phần thưởng GĐ427), kèm kẹt nguyên liệu
  const handLine = quanHandPayoffLine(quanHandPayoff({ level, menu, storage, priceMul: mul, day, q }));
  return (
    <div style={{ ...styles.card, display: 'block', marginTop: 10 }}>
      <b>{t('panels_quan.thuc_don_pha_che')}{menu.length}/{slots})</b>
      <div style={{ fontSize: 12, opacity: 0.75, margin: '2px 0 6px' }}>
        {t('panels_quan.mon_pha_loi_hon_nuoc_chai')}{Math.round(QUAN_VARIETY_BONUS * 100)}{t('panels_quan.khach_2')}
        {menu.length === 0 && t('panels_quan.chua_chon_mon_nao_quan_chi')}
      </div>
      <div style={{ fontSize: 13, marginBottom: 6 }}>
        {QUAN_TIERS[tier].icon} <b>{QUAN_TIERS[tier].name}</b>
        <span style={{ fontSize: 11, opacity: 0.7 }}>{' '}{t('panels_quan.bac')}{' '}{tier + 1}/{QUAN_TIERS.length}: {QUAN_TIERS.map((t) => t.name).join(' → ')}{' '}{t('panels_quan.cung_mot_cua_hang')}</span>
        {nextTier && (
          <button style={styles.btn} disabled={level < nextTier.level || money < nextTier.cost} onClick={() => upgradeQuanTier()}>
            {level < nextTier.level ? t('panels_quan.cap', { name: nextTier.name, level: nextTier.level }) : shortLabel(`Nâng lên ${nextTier.name} ${formatMoney(nextTier.cost)} (khách ×${fmtMul(nextTier.mul)}${quanMenuSlots({ tier: tier + 1 }) > slots ? ', +1 ô món' : ''})`, nextTier.cost, money)}
          </button>
        )}
      </div>
      <button style={{ ...styles.btn, marginLeft: 0, marginBottom: 6 }} disabled={!menu.length || quanHandLeft(q, day) <= 0} onClick={() => brewQuanHand()}
        title={t('panels_quan.tu_dung_quay_pha_mot_me')}>
        {blockedLabel(!menu.length ? t('panels_quan.chon_mon_vao_thuc_don_truoc') : null, t('panels_quan.tu_pha_ly_con_me', { QUAN_HAND_CUPS, v1: quanHandLeft(q, day) }), 0, money)}
      </button>
      {handLine && (
        <div style={{ fontSize: 11, marginTop: 2, color: '#2ecc71' }}>{handLine}</div>
      )}
      {suggestLine && (
        <div style={{ fontSize: 11, marginTop: 4, color: '#c0392b' }}>{suggestLine}</div>
      )}
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
              disabled={locked || (!on && menu.length >= slots)}
              onClick={() => toggleQuanRecipe(r.id)}
            >
              {locked ? t('panels_quan.cap_2', { unlock: r.unlock }) : on ? t('panels_quan.ban') : blockedLabel(menu.length >= slots ? t('panels_quan.du_o', { slots }) : null, t('panels_quan.them'), 0, money)}
            </button>
            <div style={{ fontSize: 13, lineHeight: 1.4 }}>
              {r.icon} <b>{r.name}</b>{newUnlockMark(r.unlock, level)} · {formatMoney(Math.round(r.price * mul))}{' '}{t('panels_quan.loi')}{formatMoney(profit)}/ly{r.hot ? t('panels_quan.do_nong_mua_ret_dong_khach') : ""}
              <div style={{ fontSize: 11, opacity: 0.75 }}>
                {r.uses.map((u) => productById(u.id).name).join(' + ')}
                {!locked && (missing.length ? t('panels_quan.thieu', { v0: missing.join(', ') }) : t('panels_quan.kho_du_ly', { cap }))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
