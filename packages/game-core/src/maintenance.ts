import { isSalesFixture, type StaffMember, type StoreFixture } from '@game/shared';
import { MAINTENANCE_RULES, fixtureRepairCost, fixtureReplacementCost } from '@game/data';
import { Mulberry32Rng, daySeed } from './staff';
import { hashSeed } from './weather';

export type MaintenanceAction = 'service' | 'repair' | 'replace';
export type MaintenanceStatus = 'good' | 'worn' | 'broken_minor' | 'broken_major';

export interface MaintenanceEntry {
  fixtureId: string;
  label: string;
  type: StoreFixture['type'];
  wear: number;
  broken?: 'minor' | 'major';
  status: MaintenanceStatus;
  /** Hành động đang có thể làm và giá (VND); thiếu = không làm được. */
  serviceCost?: number;
  repairCost?: number;
  replaceCost: number;
}

export interface MaintenanceNotice {
  fixtureId: string;
  label: string;
  broken: 'minor' | 'major';
}

export const maintenanceUnlocked = (level: number): boolean => level >= MAINTENANCE_RULES.unlockLevel;
// Chỉ kệ/tủ mát CHÍNH (root) là vật lý riêng chịu hao mòn; các ô phụ (`#sN`, có parentId) chỉ là bản ghi dữ liệu
// dùng chung wear/broken của kệ cha (syncSlotChildren) nên KHÔNG được tính là đối tượng bảo trì riêng.
export const isWearable = (fixture: Pick<StoreFixture, 'type' | 'parentId'>): boolean => isSalesFixture(fixture) && !fixture.parentId;
export const needsService = (fixture: Pick<StoreFixture, 'wear' | 'broken'>): boolean => !fixture.broken && (fixture.wear ?? 0) >= MAINTENANCE_RULES.breakFrom * MAINTENANCE_RULES.serviceFraction;

/** Hạn dùng mất thêm mỗi đêm của hàng trong tủ mát đang hỏng (0 nếu không phải tủ mát hoặc còn chạy). */
export const coldBreakExtraDecay = (fixture: Pick<StoreFixture, 'type' | 'broken'>): number =>
  fixture.type === 'refrigerator' && fixture.broken ? MAINTENANCE_RULES.brokenColdExtraDecay : 0;

/** Đồ nhân viên châm hàng tự bảo trì đêm nay: đã mòn, chưa hỏng, mòn nhiều trước; mỗi nhân viên được `staffServicePerNight` món. */
export function staffServiceTargets(fixtures: readonly StoreFixture[], staff: readonly Pick<StaffMember, 'role'>[]): string[] {
  const limit = staff.filter((member) => member.role === 'refill').length * MAINTENANCE_RULES.staffServicePerNight;
  if (limit <= 0) return [];
  return fixtures
    .filter((f) => isWearable(f) && needsService(f))
    .sort((a, b) => (b.wear ?? 0) - (a.wear ?? 0) || (a.id < b.id ? -1 : 1))
    .slice(0, limit)
    .map((f) => f.id);
}

export function maintenanceStatus(fixture: Pick<StoreFixture, 'wear' | 'broken'>): MaintenanceStatus {
  if (fixture.broken === 'major') return 'broken_major';
  if (fixture.broken === 'minor') return 'broken_minor';
  return needsService(fixture) ? 'worn' : 'good';
}

/** Danh sách kệ/tủ mát có hao mòn và việc có thể làm với từng cái. */
export function listMaintenance(fixtures: readonly StoreFixture[]): MaintenanceEntry[] {
  return fixtures.filter(isWearable).map((f) => {
    const status = maintenanceStatus(f);
    return {
      fixtureId: f.id,
      label: f.label,
      type: f.type,
      wear: f.wear ?? 0,
      broken: f.broken,
      status,
      serviceCost: status === 'worn' ? fixtureRepairCost(f) : undefined,
      repairCost: status === 'broken_minor' ? fixtureRepairCost(f) : undefined,
      replaceCost: fixtureReplacementCost(f),
    };
  });
}

/**
 * Qua một đêm: đồ mòn thêm, đồ mòn nhiều có thể hỏng. Hàm xác định theo (ngày, mã nội thất): cùng đầu vào cho cùng kết quả,
 * nên các máy chơi chung cho cùng kết quả. Sửa trực tiếp `fixtures` và trả về danh sách vừa hỏng.
 */
export function wearOvernight(fixtures: StoreFixture[], day: number, level: number): MaintenanceNotice[] {
  if (!maintenanceUnlocked(level)) return [];
  const notices: MaintenanceNotice[] = [];
  const c = MAINTENANCE_RULES;
  for (const f of fixtures) {
    if (!isWearable(f) || f.broken) continue;
    const rng = new Mulberry32Rng(daySeed(day, hashSeed(`wear:${f.id}`)));
    f.wear = Math.min(100, (f.wear ?? 0) + c.wearMin + Math.floor(rng.next() * (c.wearMax - c.wearMin + 1)));
    if (f.wear < c.breakFrom || rng.next() >= (f.wear - c.breakFrom) * c.breakPerWear) continue;
    f.broken = f.wear >= c.majorWear || rng.next() < c.majorChance ? 'major' : 'minor';
    notices.push({ fixtureId: f.id, label: f.label, broken: f.broken });
  }
  return notices;
}

export type MaintainResult =
  | { success: true; cost: number }
  | { success: false; reason: 'locked' | 'not_found' | 'not_needed' | 'cannot_repair_major' | 'not_broken' | 'not_enough_money' };

/** Áp dụng một hành động lên nội thất (sửa trực tiếp `fixture`); không trừ tiền, trả về chi phí để người gọi trừ. */
export function maintainFixture(fixture: StoreFixture | undefined, action: MaintenanceAction, money: number, level: number): MaintainResult {
  if (!maintenanceUnlocked(level)) return { success: false, reason: 'locked' };
  if (!fixture || !isWearable(fixture)) return { success: false, reason: 'not_found' };
  let cost = 0;
  if (action === 'replace') {
    cost = fixtureReplacementCost(fixture);
  } else if (action === 'repair') {
    if (!fixture.broken) return { success: false, reason: 'not_broken' };
    if (fixture.broken === 'major') return { success: false, reason: 'cannot_repair_major' };
    cost = fixtureRepairCost(fixture);
  } else {
    if (fixture.broken || !needsService(fixture)) return { success: false, reason: 'not_needed' };
    cost = fixtureRepairCost(fixture);
  }
  if (money < cost) return { success: false, reason: 'not_enough_money' };
  fixture.wear = action === 'replace' ? 0 : Math.min(fixture.wear ?? 0, MAINTENANCE_RULES.repairWear);
  delete fixture.broken;
  return { success: true, cost };
}

export const MAINTENANCE_FAILURE_TEXT: Record<Extract<MaintainResult, { success: false }>['reason'], string> = {
  locked: 'Chưa mở khóa bảo trì (cần cấp cao hơn).',
  not_found: 'Không tìm thấy kệ hoặc tủ mát này.',
  not_needed: 'Đồ này còn tốt, chưa cần bảo trì.',
  cannot_repair_major: 'Hỏng nặng, không sửa được: hãy mua mới.',
  not_broken: 'Đồ này không hỏng.',
  not_enough_money: 'Không đủ tiền.',
};
