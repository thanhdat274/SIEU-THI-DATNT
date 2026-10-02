import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, MAX_PLAYER_LEVEL, PRESTIGE_MAX_STARS, PRESTIGE_XP_PER_STAR, generateStarterTileMap, prestigeTrafficMultiplier, xpToNextLevel } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { normalizePlayerProgression } from './progression';

const map = generateStarterTileMap();
const newSim = (level: number, mutate?: (p: typeof DEFAULT_INITIAL_SAVE.player) => void) => {
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.player.level = level;
  save.player.experience = 0;
  save.player.experienceToNextLevel = xpToNextLevel(level);
  mutate?.(save.player);
  return new GameSimulation(save, map, new InputManager(), {});
};
const player = (sim: GameSimulation) => sim.exportSaveData('s', 1).player;

export function runPrestigeTests(): void {
  console.log('\n--- Prestige sau cấp tối đa ---');

  // Dưới cap: chỉ XP thường.
  const low = newSim(MAX_PLAYER_LEVEL - 1);
  low.addExperience(10);
  assert.equal(player(low).prestigeStars ?? 0, 0);
  assert.equal(player(low).prestigeXp ?? 0, 0);

  // Lên cap bằng XP thừa: phần dư chuyển sang prestige, cấp không đổi.
  const need = xpToNextLevel(MAX_PLAYER_LEVEL - 1);
  const up = newSim(MAX_PLAYER_LEVEL - 1);
  up.addExperience(need + 123);
  assert.equal(player(up).level, MAX_PLAYER_LEVEL);
  assert.equal(player(up).prestigeXp, 123);

  // Sát ngưỡng và nhiều mốc cùng lúc.
  const cap = newSim(MAX_PLAYER_LEVEL);
  cap.addExperience(PRESTIGE_XP_PER_STAR - 1);
  assert.equal(player(cap).prestigeStars ?? 0, 0);
  cap.addExperience(1);
  assert.equal(player(cap).prestigeStars, 1);
  assert.equal(player(cap).prestigeXp, 0);
  cap.addExperience(PRESTIGE_XP_PER_STAR * 3 + 7);
  assert.equal(player(cap).prestigeStars, 4);
  assert.equal(player(cap).prestigeXp, 7);

  // Cap sao: không vượt, XP không tích lũy thêm, cấp không đổi.
  cap.addExperience(PRESTIGE_XP_PER_STAR * 100);
  assert.equal(player(cap).prestigeStars, PRESTIGE_MAX_STARS);
  assert.equal(player(cap).prestigeXp, 0);
  cap.addExperience(999_999);
  assert.equal(player(cap).prestigeStars, PRESTIGE_MAX_STARS);
  assert.equal(player(cap).level, MAX_PLAYER_LEVEL);

  // Thưởng bị chặn.
  assert.equal(prestigeTrafficMultiplier(0), 1);
  assert.ok(prestigeTrafficMultiplier(999) <= 1 + PRESTIGE_MAX_STARS * 0.01 + 1e-9);

  // Save cũ không có prestige giữ nguyên; save/reload giữ sao; dữ liệu bẩn bị làm sạch.
  const legacy = normalizePlayerProgression(structuredClone(DEFAULT_INITIAL_SAVE.player));
  assert.equal('prestigeStars' in legacy, false);
  const bad = normalizePlayerProgression({ ...DEFAULT_INITIAL_SAVE.player, level: MAX_PLAYER_LEVEL, prestigeStars: 99, prestigeXp: -5 });
  assert.equal(bad.prestigeStars, PRESTIGE_MAX_STARS);
  assert.equal(bad.prestigeXp, 0);
  const reloaded = new GameSimulation(cap.exportSaveData('s', 2), map, new InputManager(), {});
  assert.equal(player(reloaded).prestigeStars, PRESTIGE_MAX_STARS);
}
