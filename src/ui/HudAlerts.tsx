import { branchAlerts } from '../data/branches';
import { rivalUndercutAlerts, STORIES } from '../data/biz';
import { closeStory, REGULAR_NAMES } from '../core/biz';
import { useClock, useGame } from '../core/store';
import { formatMoney } from '../data/products';

/** GĐ456: cảnh báo HUD tách lazy khỏi Hud để giữ ngân sách tải ban đầu. */
/** Chi nhánh 24/7 "lên tiếng": đẩy cảnh báo (calloff/mất điện/trộm/kệ cạn/thiếu thu ngân) lên HUD. */
export function BranchAlert() {
  const branch = useGame((s) => s.branch);
  const minutes = useClock((c) => Math.floor(c.minutes));
  if (!branch) return null;
  const alerts = branchAlerts(branch, minutes);
  if (!alerts.length) return null;
  return (
    <>
      {alerts.map((a, i) => (
        <div key={i} className={`hud-alert ${a.danger ? 'danger' : 'warn'}`}>{a.text}</div>
      ))}
    </>
  );
}

/** Đối thủ đang bán rẻ những món mình có bày — nhắc ứng phó giá (GĐ42). */
export function RivalAlert() {
  const biz = useGame((s) => s.biz);
  const priceOf = useGame((s) => s.priceOf);
  const day = useGame((s) => s.day);
  const storage = useGame((s) => s.storage);
  const furniture = useGame((s) => s.furniture);
  const carried = new Set<string>();
  for (const [id, q] of Object.entries(storage)) if (q > 0) carried.add(id);
  for (const f of furniture) for (const t of f.tiers) if (t.productId && t.count > 0) carried.add(t.productId);
  const alert = rivalUndercutAlerts(biz.rival, priceOf, day, carried);
  if (!alert) return null;
  return (
    <div className="hud-alert warn">
      ⚔️ {alert.rival} bán rẻ <b>{alert.items.join(', ')}</b> — khách nhạy giá các món này chê tiệm mình.
      <span className="hud-alert-actions">
        <button className="hud-btn primary" onClick={() => useGame.getState().openPanel({ type: 'prices' })}>Xem giá</button>
      </span>
    </div>
  );
}


/** Chương truyện mới của khách quen (mở theo độ thân). */
export function StoryAlert() {
  const p = useGame((s) => s.biz.storyPending);
  const ch = p && STORIES[p.regular]?.[p.chapter];
  if (!p || !ch) return null;
  return (
    <div className="hud-alert info">
      📖 <b>{REGULAR_NAMES[p.regular]} · Chương {p.chapter + 1}: {ch.title}</b> — {ch.text}
      {ch.reward && <small> (+{[ch.reward.money && formatMoney(ch.reward.money), ch.reward.xp && `${ch.reward.xp} XP`].filter(Boolean).join(', ')})</small>}
      <span className="hud-alert-actions">
        <button className="hud-btn primary" onClick={closeStory}>💛 Đọc xong</button>
      </span>
    </div>
  );
}

