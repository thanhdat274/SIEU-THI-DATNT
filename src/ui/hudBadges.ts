import { ANIMALS, ANIMAL_ORDER, EGG_PER_TRAY, plotReady } from '../data/garden';
import { showRestockExtras } from '../data/onboarding';
import { activeBuzz } from '../data/social';
import { licenseStatus, type LicenseId } from '../data/licenses';
import { weeklyChallenge } from '../data/biz';
import { monthOf } from '../data/calendar';
import { isFairOpen } from '../data/fairmerchant';
import { lifetimeRegularVisits, vipTierOf, EMOTIONAL_FRIENDSHIP } from '../data/regularTrust';
import { relTier } from '../data/supplierRel';
import { serviceById } from '../data/services';
import { dossierEarnedCount, type DossierInput } from '../data/dossier';
import type { useGame } from '../core/store';

/** GĐ952: các badge nhắc việc trên nút dock của Hud, tách nguyên văn thành hàm thuần của state (dễ test). */
type S = ReturnType<typeof useGame.getState>;

export const rivalBadgeOf = (s: S) => (s.biz.rival ? `⚔️ ${Math.round(s.biz.rival.strength)}` : undefined);
export const socialBadgeOf = (s: S) => {
  const buzz = activeBuzz(s.social, s.day);
  return buzz?.kind === 'crisis' && !buzz.responded ? '⚠️ Khủng hoảng' : buzz?.kind === 'hype' ? '🔥 Hot' : undefined;
};
export const onlineBadgeOf = (s: S) => {
  const n = s.online.orders.filter((o) => o.status === 'new').length;
  return n ? `${n} đơn mới` : undefined;
};
export const licenseBadgeOf = (s: S) => {
  if (s.inspection.suspendedDay === s.day) return '⛔ Đình chỉ';
  const due = Object.keys(s.inspection.noticed ?? {}).filter((id) => {
    const st = licenseStatus(s.licenses, id as LicenseId, s.day);
    return st === 'none' || st === 'expired';
  }).length;
  return due ? `${due} cần xin` : undefined;
};
export const loanBadgeOf = (s: S) => {
  const l = s.biz.loan;
  if (!l) return undefined;
  const goc = l.principal >= 1000000 ? `${Math.round((l.principal / 1000000) * 10) / 10}tr` : `${Math.round(l.principal / 1000)}k`;
  return `🏦 ${goc}${s.day >= l.dueDay - 3 ? ' ⚠️' : ''}`;
};
export const challengeBadgeOf = (s: S) => {
  const ch = weeklyChallenge(Math.ceil(s.day / 7), s.level);
  const target = ch.target(s.level);
  // Save cũ thiếu counter trong tally thì tiến độ coi như 0 (giống tab Lãi lỗ)
  const current = ch.measure === 'revenue' ? s.biz.week.revenue : (s.biz.week[ch.measure] ?? 0);
  if (current >= target) return '🎯 xong';
  return current >= target * 0.8 ? `🎯 ${ch.icon}` : undefined;
};
export const fairBadgeOf = (s: S) => (isFairOpen(s.day) && showRestockExtras(s.day) && s.biz.fairTaken !== monthOf(s.day)) ? '🛒 Phiên chợ' : undefined;
export const triBadgeOf = (s: S) => {
  const t = vipTierOf(lifetimeRegularVisits(s.regulars ?? {}));
  return t.level >= 1 ? `${t.icon} ${t.name}` : undefined;
};
export const dossierBadgeOf = (s: S) => {
  const d: DossierInput = {
    supplierTier: Math.max(0, ...Object.values(s.biz.supplierRel ?? {}).map((r) => relTier(r.spent).level)),
    regularTier: vipTierOf(lifetimeRegularVisits(s.regulars ?? {})).level,
    closeRegulars: Object.values(s.regulars ?? {}).filter((r) => r.friendship >= EMOTIONAL_FRIENDSHIP).length,
    fairTaken: s.biz.fairTaken !== undefined,
    prepClaimed: s.biz.prepClaimed !== undefined,
    servicesOwned: (s.biz.services ?? []).length,
    servicesPaidBack: Object.entries(s.biz.serviceLife ?? {}).filter(([sid, life]) => (serviceById(sid)?.price ?? Infinity) <= life).length,
    demographicsCount: Object.keys(s.biz.demographics ?? {}).length,
    landmarkContrib: s.biz.landmark?.contributions ?? 0,
    prestigeLevel: s.biz.prestige?.level ?? 0,
    rivalArcs: (s.biz.rivalTrend ?? []).length,
    perfectDays: s.biz.perfectDays ?? 0,
  };
  const n = dossierEarnedCount(d);
  return n > 0 ? `${n} huy hiệu` : undefined;
};
export const gardenBadgeOf = (s: S) => {
  if (s.level < 8) return undefined;
  if (s.garden.farmOrder && s.garden.farmOrder.dueDay === s.day + 1) return '📦 Đơn sắp hết hạn';
  for (const kind of ANIMAL_ORDER) {
    const pen = s.garden.pens[kind];
    if (!pen?.count) continue;
    const def = ANIMALS[kind];
    if (kind === 'pig' && (pen.fattened ?? 0) >= (def.fattenDays ?? 0)) return '🐖 Xuất chuồng được';
    if (kind !== 'pig' && pen.pending >= (kind === 'cow' ? 1 : EGG_PER_TRAY)) return kind === 'cow' ? '🥛 Sữa chờ vắt' : '🥚 Trứng chờ thu';
  }
  if (s.garden.plots.some(plotReady)) return '🧺 Thu được';
  const outOfFeed = ANIMAL_ORDER.some((kind) => {
    const pen = s.garden.pens[kind];
    if (!pen?.count || pen.fedDay === s.day) return false;
    const def = ANIMALS[kind];
    return pen.feedKg < pen.count * def.feedKgPerDay && (s.storage[def.feedProduct] ?? 0) === 0;
  });
  if (outOfFeed) return '🌽 Hết cám';
  const dry = s.weather !== 'rain' && s.weather !== 'storm' && s.garden.plots.some((p) => p.crop && p.wateredDay !== s.day);
  return dry ? '💧 Chưa tưới' : undefined;
};
