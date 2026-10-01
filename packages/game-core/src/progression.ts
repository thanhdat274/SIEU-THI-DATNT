import type { PlayerData } from '@game/shared';
import {
  LEVEL_XP_THRESHOLDS,
  MAX_PLAYER_LEVEL,
  getLevelTrafficMultiplier,
  maxActiveCustomersForLevel,
  xpToNextLevel,
} from '@game/data';

export { MAX_PLAYER_LEVEL, LEVEL_XP_THRESHOLDS, getLevelTrafficMultiplier, maxActiveCustomersForLevel, xpToNextLevel };

/** Preserve legacy progress percentage while adopting the per-level XP table. */
export function normalizePlayerProgression(player: PlayerData): PlayerData {
  const rawLevel = Number.isFinite(player.level) ? Math.floor(player.level) : 1;
  const level = Math.max(1, Math.min(MAX_PLAYER_LEVEL, rawLevel));
  const required = xpToNextLevel(level);
  const oldRequired = Number.isFinite(player.experienceToNextLevel) ? player.experienceToNextLevel : 0;
  const oldProgress = oldRequired > 0 && Number.isFinite(player.experience)
    ? Math.max(0, Math.min(1, player.experience / oldRequired))
    : 0;
  return {
    ...player,
    level,
    experience: required > 0 ? Math.floor(oldProgress * required) : 0,
    experienceToNextLevel: required,
  };
}

export function levelXpCost(level: number): number {
  return xpToNextLevel(level);
}

export function saleExperienceMultiplier(level: number): number {
  return level >= 30 ? 0.55 : level >= 20 ? 0.7 : 1;
}

export function levelProgress(player: Pick<PlayerData, 'level' | 'experience' | 'experienceToNextLevel'>): number {
  if (player.level >= MAX_PLAYER_LEVEL) return 1;
  return Math.max(0, Math.min(1, player.experience / Math.max(1, player.experienceToNextLevel)));
}

/** Progression traffic is capped to keep spawn pacing and the small shop map predictable. */
export function trafficAtLevel(baseTraffic: number, level: number): number {
  return Math.max(0, Math.min(6, baseTraffic * getLevelTrafficMultiplier(level)));
}
