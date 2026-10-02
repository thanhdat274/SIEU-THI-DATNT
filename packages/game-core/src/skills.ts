import { SkillState, SkillType } from '@game/shared';
import { PERK_MAP, SKILL_XP_PER_LEVEL } from '@game/data';

export function createInitialSkillState(): SkillState {
  return {
    xp: {
      management: 0,
      marketing: 0,
      storage: 0,
    },
    levels: {
      management: 1,
      marketing: 1,
      storage: 1,
    },
    chosenPerks: [],
  };
}

/**
 * Thêm điểm kinh nghiệm cho kỹ năng và tự động tính lên cấp kỹ năng.
 */
export function addSkillXp(
  state: SkillState,
  skill: SkillType,
  amount: number
): { state: SkillState; leveledUp: boolean; newLevel: number } {
  const currentXp = (state.xp[skill] ?? 0) + Math.max(0, amount);
  let level = state.levels[skill] ?? 1;
  let leveledUp = false;

  // Tính level dựa trên mảng mốc XP (tối đa cấp 4 tương ứng 3 tier perks)
  while (level < SKILL_XP_PER_LEVEL.length && currentXp >= SKILL_XP_PER_LEVEL[level]) {
    level++;
    leveledUp = true;
  }

  const nextState: SkillState = {
    ...state,
    xp: {
      ...state.xp,
      [skill]: currentXp,
    },
    levels: {
      ...state.levels,
      [skill]: level,
    },
  };

  return {
    state: nextState,
    leveledUp,
    newLevel: level,
  };
}

/**
 * Chọn đặc quyền (Perk) khi đạt cấp độ yêu cầu (chống chọn trùng, kiểm tra tier).
 */
export function choosePerk(
  state: SkillState,
  perkId: string
): { success: boolean; state: SkillState; reason?: string } {
  if (state.chosenPerks.includes(perkId)) {
    return { success: false, state, reason: 'Đặc quyền này đã được chọn trước đó' };
  }

  const perk = PERK_MAP[perkId];
  if (!perk) {
    return { success: false, state, reason: 'Không tìm thấy đặc quyền' };
  }

  const skillLevel = state.levels[perk.skill] ?? 1;
  // Tier 1 cần level 2, Tier 2 cần level 3, Tier 3 cần level 4
  const requiredLevel = perk.tier + 1;
  if (skillLevel < requiredLevel) {
    return {
      success: false,
      state,
      reason: `Cần đạt kỹ năng cấp ${requiredLevel} để mở đặc quyền bậc ${perk.tier}`,
    };
  }

  return {
    success: true,
    state: {
      ...state,
      chosenPerks: [...state.chosenPerks, perkId],
    },
  };
}

/**
 * Kiểm tra xem người chơi đã mở đặc quyền hay chưa.
 */
export function hasPerk(state: SkillState | undefined, perkId: string): boolean {
  if (!state || !state.chosenPerks) return false;
  return state.chosenPerks.includes(perkId);
}

/**
 * Lấy hệ số hiệu ứng của đặc quyền cho các hệ thống game.
 */
export function getSkillModifier(
  state: SkillState | undefined,
  modifierKey:
    | 'cashier_speed'
    | 'wage_discount'
    | 'staff_speed'
    | 'tip_bonus'
    | 'supplier_discount'
    | 'traffic_boost'
    | 'fresh_extra_day'
    | 'shelf_capacity_bonus'
    | 'spoilage_reduction'
): number {
  if (!state) return 0;

  switch (modifierKey) {
    case 'cashier_speed':
      return hasPerk(state, 'perk_quick_hands') ? 0.15 : 0;
    case 'wage_discount':
      return hasPerk(state, 'perk_good_boss') ? 0.1 : 0;
    case 'staff_speed':
      return hasPerk(state, 'perk_master_manager') ? 0.2 : 0;
    case 'tip_bonus':
      return hasPerk(state, 'perk_charm') ? 0.05 : 0;
    case 'supplier_discount':
      return hasPerk(state, 'perk_negotiator') ? 0.05 : 0;
    case 'traffic_boost':
      return hasPerk(state, 'perk_local_legend') ? 0.1 : 0;
    case 'fresh_extra_day':
      return hasPerk(state, 'perk_cool_pack') ? 1 : 0;
    case 'shelf_capacity_bonus':
      return hasPerk(state, 'perk_neat_shelves') ? 0.2 : 0;
    case 'spoilage_reduction':
      return hasPerk(state, 'perk_zero_waste') ? 0.5 : 0;
    default:
      return 0;
  }
}

/**
 * Quản lý kỹ năng & đặc quyền của người chơi.
 * Pattern: nhận state qua constructor, trả bản sao qua getters (immutable updates).
 */
export class SkillsManager {
  private state: SkillState;

  constructor(initial: SkillState | undefined) {
    this.state = initial ?? createInitialSkillState();
  }

  public getSkillState(): SkillState {
    return structuredClone(this.state);
  }

  public addSkillExperience(skill: SkillType, amount: number): void {
    const res = addSkillXp(this.state, skill, amount);
    this.state = res.state;
  }

  public choosePerk(perkId: string): { success: boolean; reason?: string } {
    const res = choosePerk(this.state, perkId);
    if (res.success) this.state = res.state;
    return { success: res.success, reason: res.reason };
  }

  /** Alias của `hasPerk` để simulation.ts gọi qua manager. */
  public hasPerk(perkId: string): boolean {
    return hasPerk(this.state, perkId);
  }

  public getShelfCapacityBonus(): number {
    return getSkillModifier(this.state, 'shelf_capacity_bonus');
  }

  /** Trả về toàn bộ state để serialize (deep clone). */
  public exportSkills(): SkillState {
    return structuredClone(this.state);
  }

  /** Load state từ save data. */
  public importSkills(initial: SkillState | undefined): void {
    this.state = initial ?? createInitialSkillState();
  }
}
