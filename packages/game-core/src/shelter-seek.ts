import { SHELTER_RULES, nearestAwningTargetX } from '@game/data';

/**
 * Hành vi trú mưa đơn giản cho NPC đi bộ ngoài trời: khi mưa to thì chọn một mái hiên gần (trong tầm), đi tới mép gần
 * nhất, đứng đó, và rời đi khi mưa dịu hoặc quá thời gian. Không tìm đường, không chạy lại mỗi khung hình: có thời gian
 * chờ giữa các lần cân nhắc và chỉ cân nhắc lại khi mưa đã dịu rồi to lên lần nữa.
 */
export interface ShelterSeek {
  phase: 'none' | 'seeking' | 'sheltered' | 'done';
  targetX: number;
  /** Giây còn lại trước khi được cân nhắc lại. */
  cooldown: number;
  heldSec: number;
  /** 0..1 ổn định theo từng người, để chọn điểm đứng khác nhau dưới cùng một mái. */
  slot: number;
}

export type ShelterAction = 'none' | 'seek' | 'arrived' | 'leave';

export const newShelterSeek = (slot = 0.5): ShelterSeek => ({ phase: 'none', targetX: 0, cooldown: 0, heldSec: 0, slot });

export function stepShelterSeek(s: ShelterSeek, x: number, rain: number, dt: number, canSeek: boolean, walkSpeed: number): { action: ShelterAction; targetX?: number } {
  const r = Number.isFinite(rain) ? rain : 0;
  switch (s.phase) {
    case 'none': {
      s.cooldown = Math.max(0, s.cooldown - dt);
      if (!canSeek || r < SHELTER_RULES.seekRain || s.cooldown > 0) return { action: 'none' };
      const hit = nearestAwningTargetX(x, SHELTER_RULES.maxDetourPx, s.slot);
      if (!hit) { s.cooldown = SHELTER_RULES.reevaluateCooldownSec; return { action: 'none' }; }
      s.targetX = hit.targetX;
      if (Math.abs(hit.targetX - x) <= Math.max(1, walkSpeed * dt)) { s.phase = 'sheltered'; s.heldSec = 0; return { action: 'arrived', targetX: hit.targetX }; }
      s.phase = 'seeking';
      return { action: 'seek', targetX: hit.targetX };
    }
    case 'seeking': {
      if (r < SHELTER_RULES.releaseRain) { s.phase = 'none'; s.cooldown = SHELTER_RULES.reevaluateCooldownSec; return { action: 'leave' }; }
      if (Math.abs(s.targetX - x) <= Math.max(1, walkSpeed * dt)) { s.phase = 'sheltered'; s.heldSec = 0; return { action: 'arrived', targetX: s.targetX }; }
      return { action: 'none' };
    }
    case 'sheltered': {
      s.heldSec += dt;
      if (r < SHELTER_RULES.releaseRain || s.heldSec >= SHELTER_RULES.maxShelterSec) {
        // 'done': không tìm chỗ trú lại cho tới khi mưa dịu hẳn rồi to lên lần nữa.
        s.phase = 'done';
        return { action: 'leave' };
      }
      return { action: 'none' };
    }
    case 'done': {
      if (r < SHELTER_RULES.releaseRain) { s.phase = 'none'; s.cooldown = SHELTER_RULES.reevaluateCooldownSec; }
      return { action: 'none' };
    }
  }
}
