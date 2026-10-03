import {
  StaffRole,
  StaffMember,
  StaffCandidate,
  STAFF_SHIFTS,
  StaffBuilding,
  } from '@game/shared';
import {
  CANDIDATE_NAMES,
  DEFAULT_HIRING_FEE,
  getMaxStaffSlots,
} from '@game/data';

/** Mulberry32 PRNG for deterministic daily candidate generation */
export class Mulberry32Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }
}

export function daySeed(day: number, salt = 0x57aff): number {
  return (Math.imul(day + 1, 2654435761) ^ salt) >>> 0;
}

/**
 * Generate deterministic candidate list for a given day.
 * Calling with the same day seed returns identical candidates.
 * Hỗ trợ roles mới: drink_staff, drink_security cho quán nước.
 */
export function generateCandidatesForDay(day: number, count = 3): StaffCandidate[] {
  const rng = new Mulberry32Rng(daySeed(day, 0x57aff));
  const candidates: StaffCandidate[] = [];

  const roles: StaffRole[] = ['cashier', 'refill', 'security', 'drink_staff', 'drink_security'];
  // Shuffle name pool deterministically for this day to avoid picking duplicates
  const namePool = [...CANDIDATE_NAMES];
  for (let i = namePool.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [namePool[i], namePool[j]] = [namePool[j], namePool[i]];
  }

  // Buildings available for assignment
  const buildings: StaffBuilding[] = [undefined, 'main', 'xoi', 'drink'];

  for (let i = 0; i < count; i++) {
    // Ensure diverse roles in the candidate list
    const role: StaffRole = i === 0 ? 'cashier' : i === 1 ? 'refill' : i === 2 ? 'security' : rng.pick(roles);
    let speed = rng.int(3, 8);
    let accuracy = rng.int(3, 8);
    let stamina = rng.int(3, 8);

    if (role === 'cashier') {
      accuracy = Math.min(10, accuracy + 1);
    } else if (role === 'security' || role === 'drink_security') {
      stamina = Math.min(10, stamina + 2);
    } else {
      speed = Math.min(10, speed + 1);
    }

    // Daily wage base 20,000 + stats * 500, rounded to nearest 5,000
    const rawWage = 20000 + (speed + accuracy + stamina) * 500;
    const dailyWage = Math.max(25000, Math.round(rawWage / 5000) * 5000);

    // Assign building for drink-specific roles
    let assignedBuilding: StaffBuilding = undefined;
    if (role === 'drink_staff' || role === 'drink_security') {
      assignedBuilding = 'drink';
    } else if (role === 'security' && rng.next() < 0.3) {
      // 30% chance global security becomes building-specific
      assignedBuilding = rng.pick(['main', 'xoi'] as StaffBuilding[]);
    }

    candidates.push({
      id: `cand_d${day}_${i + 1}`,
      name: namePool[i % namePool.length],
      role,
      speed,
      accuracy,
      stamina,
      dailyWage,
      hiringFee: DEFAULT_HIRING_FEE,
      assignedBuilding,
    });
  }

  return candidates;
}

export type StaffHireRejectReason =
  | 'level_locked'
  | 'slots_full'
  | 'insufficient_funds'
  | 'already_hired';

export interface HireStaffValidationResult {
  valid: boolean;
  reason?: StaffHireRejectReason;
}

export function validateHireStaff(params: {
  playerLevel: number;
  playerMoney: number;
  currentStaffCount: number;
  candidate: StaffCandidate;
  existingStaffIds: string[];
}): HireStaffValidationResult {
  if (params.playerLevel < 2) {
    return { valid: false, reason: 'level_locked' };
  }
  const maxSlots = getMaxStaffSlots(params.playerLevel);
  if (params.currentStaffCount >= maxSlots) {
    return { valid: false, reason: 'slots_full' };
  }
  if (params.playerMoney < params.candidate.hiringFee) {
    return { valid: false, reason: 'insufficient_funds' };
  }
  if (params.existingStaffIds.includes(params.candidate.id)) {
    return { valid: false, reason: 'already_hired' };
  }
  return { valid: true };
}

export function calculatePayroll(params: {
  day: number;
  staff: StaffMember[];
  playerMoney: number;
  existingDebt: number;
}): {
  grossWageToday: number;
  previousDebt: number;
  totalDue: number;
  paidAmount: number;
  newDebt: number;
} {
  let grossWageToday = 0;
  for (const s of params.staff) {
    const shiftCfg = STAFF_SHIFTS[s.shift] ?? STAFF_SHIFTS.full_day;
    grossWageToday += Math.round(s.dailyWage * shiftCfg.wageMultiplier);
  }
  const previousDebt = Math.max(0, params.existingDebt);
  const totalDue = grossWageToday + previousDebt;
  const paidAmount = Math.min(totalDue, Math.max(0, params.playerMoney));
  const newDebt = totalDue - paidAmount;

  return {
    grossWageToday,
    previousDebt,
    totalDue,
    paidAmount,
    newDebt,
  };
}
