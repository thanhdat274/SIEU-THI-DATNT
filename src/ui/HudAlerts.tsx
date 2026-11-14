import { useEffect, useRef, useState } from 'react';
import { ASK_RESOLVE_REAL_S } from '../data/counterDeals';
import { answerAsk, useCounterAsk, askWallElapsed } from '../core/counterAsk';
import { branchAlerts } from '../data/branches';
import { rivalUndercutAlerts, STORIES } from '../data/biz';
import { closeStory, REGULAR_NAMES } from '../core/biz';
import { useClock, useGame } from '../core/store';
import { formatMoney, productById } from '../data/products';
import { dayEffects, festivalStock } from '../data/calendar';
import { t } from '../core/i18n';

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
      ⚔️ {alert.rival}{' '}{t('biz.ban_re')}{' '}<b>{alert.items.join(', ')}</b>{' '}{t('biz.khach_nhay_gia_cac_mon_nay')}
      <span className="hud-alert-actions">
        <button className="hud-btn primary" onClick={() => useGame.getState().openPanel({ type: 'prices' })}>{t('biz.xem_gia')}</button>
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
      📖 <b>{REGULAR_NAMES[p.regular]}{' '}{t('biz.chuong')}{' '}{p.chapter + 1}: {ch.title}</b> — {ch.text}
      {ch.reward && <small> (+{[ch.reward.money && formatMoney(ch.reward.money), ch.reward.xp && `${ch.reward.xp} XP`].filter(Boolean).join(', ')})</small>}
      <span className="hud-alert-actions">
        <button className="hud-btn primary" onClick={closeStory}>{t('biz.doc_xong')}</button>
      </span>
    </div>
  );
}


/** Đang trong mùa lễ: nói rõ khách đông bao nhiêu, món nào hút, giá nhập tăng bao nhiêu. */
export function FestivalBanner() {
  const day = useGame((s) => s.day);
  const level = useGame((s) => s.level);
  const seed = useGame((s) => s.weatherSeed);
  const f = dayEffects(seed, day, level).festival;
  if (!f || (f.traffic < 1.2 && !f.pull)) return null;
  const goods = festivalStock(f, level).map((id) => productById(id).name).join(', ');
  const pct = (x: number) => `${x >= 1 ? '+' : ''}${Math.round((x - 1) * 100)}%`;
  return (
    <div className="hud-alert festival">
      <span>
        {f.icon} <b>{f.name}</b>{t('biz.khach')}{' '}{pct(f.traffic)}{f.cost !== 1 && t('biz.gia_nhap', { v0: pct(f.cost) })}
        {f.tolerance && t('biz.khach_chiu_gia_cao')}{goods && <small>{' '}{t('biz.hang_hut')}{' '}{goods}</small>}
      </span>
    </div>
  );
}

/** GĐ636: chuyển từ Hud (nạp lười cùng các cảnh báo khác). */
export function CounterAskAlert() {
  const ask = useCounterAsk((s) => s.ask);
  // GĐ122 — đồng hồ THỰC cho khách đang bị treo câu hỏi: khách vẫn mất kiên nhẫn theo giây thật
  // (khác giờ game đang dừng), hiện còn bao nhiêu giây nữa sẽ tự chốt theo mặc định — để người chơi
  // biết hậu quả trước khi muộn (không phạt bất ngờ), và khớp cùng ngân sách bong bóng 3D.
  const rem = Math.ceil(ASK_RESOLVE_REAL_S - askWallElapsed());
  const [, force] = useState(0);
  useEffect(() => {
    if (!ask) return;
    const id = setInterval(() => force((n) => n + 1), 400);
    return () => clearInterval(id);
  }, [ask]);
  if (!ask) return null;
  return (
    <div className="hud-alert pausing phone ringing">
      {ask.icon} <b>{ask.who}</b> {ask.text}
      <small>{' '}{t('biz.tiem_tam_dung_cho_cau_chon')}{Math.max(1, rem)}{t('biz.s_nua_khach_tu_chot_theo')}</small>
      <span className="hud-alert-actions">
        {ask.options.map((label, i) => (
          <button key={label} className={`hud-btn${i === 0 ? ' primary' : ''}`} onClick={() => answerAsk(i)}>{label}</button>
        ))}
      </span>
    </div>
  );
}

/** 14-11 — thẻ đánh giá khách nổi kiểu Coffee Sữa Ơi: khách vừa để lại lời thì hiện lên HUD
 *  ~9 giây (bấm vào mở sổ Đánh giá). Không hiện lời cũ khi vừa vào game. */
export function ReviewToast() {
  const lastId = useGame((s) => s.reviews.at(-1)?.id ?? 0);
  const prevId = useRef(lastId);
  const [shown, setShown] = useState<import('../data/reviews').Review | null>(null);
  useEffect(() => {
    if (lastId === prevId.current) return;
    prevId.current = lastId;
    const r = useGame.getState().reviews.at(-1) ?? null;
    setShown(r);
    if (!r) return;
    const timer = setTimeout(() => setShown(null), 9000);
    return () => clearTimeout(timer);
  }, [lastId]);
  if (!shown) return null;
  return (
    <div className="hud-alert info" role="status" style={{ cursor: 'pointer' }}
      onClick={() => useGame.getState().openPanel({ type: 'reviews' })}>
      <span aria-hidden="true">{shown.stars >= 4 ? '🌟' : shown.stars >= 3 ? '💬' : '💢'}</span>
      <span>“{shown.text}” <small>— {shown.author}</small></span>
    </div>
  );
}
