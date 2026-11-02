import { ACHIEVEMENTS, type AchievementCtx } from '../data/biz';
import { isCookStation } from '../data/furniture';
import { nearestLife } from '../data/freshness';
import { formatMoney, productById } from '../data/products';
import { reputationOf } from '../data/reputation';
import { useGame, type GameState } from './store';
import { playSfx } from './audio';

const S = () => useGame.getState();
const patch = (b: Partial<GameState['biz']>) => useGame.setState({ biz: { ...S().biz, ...b } });

// ───── Thành tựu ─────

export function achievementCtx(s: GameState): AchievementCtx {
  return {
    totals: s.totals, level: s.level, ordersDone: s.ordersDone, phoneOrdersDone: s.phoneOrdersDone,
    closeFriends: Object.values(s.regulars).filter((r) => r.friendship >= 40).length,
    rivalsBeaten: s.biz.rivalsBeaten, petCount: Object.keys(s.biz.pets).length, homeDecor: s.biz.home.length,
    vehicle: s.biz.vehicle, perfectDays: s.biz.perfectDays,
    cookedSold: s.totals.cookedSold,
    cookedStations: new Set(s.furniture.map((f) => f.type).filter(isCookStation)).size,
    qualityStars: reputationOf(s.repLog).factors.quality,
    impulseSold: s.totals.impulseSold,
    cookOrdersDone: s.totals.cookOrdersDone,
    counterKills: s.biz.counterKills,
    quanTier: s.biz.quanNuoc?.tier ?? 0,
    xoiBig: !!s.biz.tiemXoi?.big,
    xoiDine: s.biz.tiemXoi?.dineTotal ?? 0,
  };
}

export function checkAchievements() {
  const s = S();
  const ctx = achievementCtx(s);
  const fresh = ACHIEVEMENTS.filter((a) => !s.biz.achievements.includes(a.id) && a.done(ctx));
  if (!fresh.length) return;
  const reward = fresh.reduce((n, a) => n + a.reward, 0);
  patch({ achievements: [...s.biz.achievements, ...fresh.map((a) => a.id)] });
  useGame.setState({ money: S().money + reward });
  for (const a of fresh) s.notify(`🏆 Thành tựu: ${a.icon} ${a.name} · +${formatMoney(a.reward)}`);
  if (fresh.length) playSfx('achieve');
}

// ───── Nhắc hàng sắp hết, sắp hỏng ─────

/** Món trên kệ còn ít hơn chừng này (cả kệ lẫn kho) thì nhắc nhập. */
const LOW_STOCK = 4;
let remindedDay = -1;
const reminded = new Set<string>();

/** Nhắc mỗi món một lần mỗi ngày: hàng đang bán sắp hết (kho cũng hết), hàng còn dưới 1 ngày hạn. */
export function stockReminders() {
  const s = S();
  if (remindedDay !== s.day) {
    remindedDay = s.day;
    reminded.clear();
  }
  const shelf: Record<string, number> = {};
  const expiring = new Set<string>();
  for (const f of s.furniture) {
    for (const t of f.tiers) {
      if (!t.productId) continue;
      shelf[t.productId] = (shelf[t.productId] ?? 0) + t.count;
      const life = t.count ? nearestLife(t.lots) : null;
      if (life !== null && life <= 1) expiring.add(t.productId);
    }
  }
  for (const [id, lots] of Object.entries(s.storageLots)) {
    const life = (s.storage[id] ?? 0) > 0 ? nearestLife(lots) : null;
    if (life !== null && life <= 1) expiring.add(id);
  }
  const low = Object.entries(shelf)
    .filter(([id, n]) => n + (s.storage[id] ?? 0) < LOW_STOCK && (s.demand[id] ?? 0) > 0 && !reminded.has(`low:${id}`))
    .map(([id]) => id);
  const spoil = [...expiring].filter((id) => !reminded.has(`exp:${id}`));
  for (const id of low) reminded.add(`low:${id}`);
  for (const id of spoil) reminded.add(`exp:${id}`);
  const names = (ids: string[]) => ids.slice(0, 4).map((id) => productById(id).name).join(', ') + (ids.length > 4 ? '…' : '');
  const parts: string[] = [];
  if (low.length) parts.push(`📉 Sắp hết hàng: ${names(low)} — nhập thêm`);
  if (spoil.length) parts.push(`⏳ Sắp hỏng (còn dưới 1 ngày): ${names(spoil)} — giảm giá bán bớt`);
  if (parts.length) s.notify(parts.join(' · '));
}
