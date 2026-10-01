import type { PoliceCase, SecurityIncident, SecurityState } from '@game/shared';
import { SECURITY_RULES } from '@game/data';
import { Mulberry32Rng, daySeed } from './staff';
import { hashSeed } from './weather';

export const securityUnlocked = (level: number): boolean => level >= SECURITY_RULES.unlockLevel;

export const emptySecurityState = (): SecurityState => ({ camera: false, callPolice: true, incidents: [], policeCases: [] });

/** Khách thường (không phải khách quen) có phải kẻ trộm lẻ không. Xác định theo ngày và mã khách; dưới cấp mở khóa thì không. */
export function rollShoplifter(day: number, customerId: string, level: number, isRegular: boolean): boolean {
  if (!securityUnlocked(level) || isRegular) return false;
  return new Mulberry32Rng(daySeed(day, hashSeed(`thief:${customerId}`))).next() < SECURITY_RULES.thiefChance;
}

/** Xác suất phát hiện kẻ trộm lẻ từ các nguồn đang có. */
export function shopliftDetectChance(sources: { guardOnShift: boolean; camera: boolean; refillOnShift: boolean }): number {
  const d = SECURITY_RULES.detect;
  let miss = 1;
  if (sources.guardOnShift) miss *= 1 - d.guard;
  if (sources.camera) miss *= 1 - d.camera;
  if (sources.refillOnShift) miss *= 1 - d.refill;
  return 1 - miss;
}

export function shopliftCaught(day: number, customerId: string, chance: number): boolean {
  return new Mulberry32Rng(daySeed(day, hashSeed(`catch:${customerId}`))).next() < chance;
}

export type BurglaryPlan =
  | { kind: 'none' }
  | { kind: 'repelled' }
  | { kind: 'cash'; fraction: number }
  | { kind: 'goods'; fraction: number; maxItems: number; seed: number };

/** Đêm sang `day` có trộm đột nhập không và kiểu mất mát. Hàm thuần; bảo vệ trong biên chế thì đuổi được. */
export function planBurglary(day: number, level: number, state: { camera: boolean; hasGuard: boolean }): BurglaryPlan {
  if (!securityUnlocked(level)) return { kind: 'none' };
  const rng = new Mulberry32Rng(daySeed(day, hashSeed('burglary')));
  const chance = SECURITY_RULES.nightChance * (state.camera ? SECURITY_RULES.nightCameraMul : 1);
  if (rng.next() >= chance) return { kind: 'none' };
  if (state.hasGuard) return { kind: 'repelled' };
  if (rng.next() < SECURITY_RULES.nightCashChance) {
    return { kind: 'cash', fraction: SECURITY_RULES.nightCashMin + rng.next() * (SECURITY_RULES.nightCashMax - SECURITY_RULES.nightCashMin) };
  }
  return {
    kind: 'goods',
    fraction: SECURITY_RULES.nightStealMin + rng.next() * (SECURITY_RULES.nightStealMax - SECURITY_RULES.nightStealMin),
    maxItems: SECURITY_RULES.nightMaxItems,
    seed: Math.floor(rng.next() * 0x7fffffff),
  };
}

/** Hồ sơ công an cho một vụ mất `value` đồng: ngày có kết quả và có bắt được không. */
export function openPoliceCase(day: number, value: number, camera: boolean): PoliceCase {
  const rng = new Mulberry32Rng(daySeed(day, hashSeed('police')));
  const catchChance = Math.min(0.95, SECURITY_RULES.policeCatch + (camera ? SECURITY_RULES.policeCameraBonus : 0));
  return {
    day,
    value,
    resolveDay: day + SECURITY_RULES.policeDaysMin + Math.floor(rng.next() * (SECURITY_RULES.policeDaysMax - SECURITY_RULES.policeDaysMin + 1)),
    caught: rng.next() < catchChance,
  };
}

export function appendIncident(previous: readonly SecurityIncident[] | undefined, incident: SecurityIncident, capacity = SECURITY_RULES.incidentCap): SecurityIncident[] {
  return [...(previous ?? []), incident].slice(-capacity);
}

/** Lọc dữ liệu an ninh khi tải save: sửa kiểu, bỏ mục hỏng, giữ giới hạn. */
export function sanitizeSecurity(value: unknown): SecurityState {
  const base = emptySecurityState();
  if (!value || typeof value !== 'object') return base;
  const v = value as Partial<SecurityState>;
  const incidents = Array.isArray(v.incidents)
    ? v.incidents.filter((i): i is SecurityIncident => !!i && typeof i === 'object' && typeof i.id === 'string' && typeof i.text === 'string' && Number.isFinite(i.day) && typeof i.kind === 'string').map(i => ({ ...i })).slice(-SECURITY_RULES.incidentCap)
    : [];
  const policeCases = Array.isArray(v.policeCases)
    ? v.policeCases.filter((c): c is PoliceCase => !!c && typeof c === 'object' && Number.isFinite(c.day) && Number.isFinite(c.value) && c.value >= 0 && Number.isFinite(c.resolveDay) && typeof c.caught === 'boolean').map(c => ({ ...c })).slice(-20)
    : [];
  return { camera: v.camera === true, callPolice: v.callPolice !== false, incidents, policeCases };
}
