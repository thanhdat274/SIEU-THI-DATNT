import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { getLevelUnlocks } from './quests';

export function runQuestTests(): void {
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.statistics.totalCustomersServed = 10;
  const levels: number[] = [];
  const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager(), { onLevelUp: level => levels.push(level) });

  let quests = sim.getQuests();
  assert.equal(quests.daily.length, 3, 'Có ba nhiệm vụ hàng ngày');
  assert.ok(quests.daily.every(q => !q.done && !q.claimed), 'Đầu ngày chưa nhiệm vụ nào xong');
  assert.equal(quests.story?.id, 'story_first_customers');
  assert.equal(quests.story?.done, true, 'Bước cốt truyện đạt điều kiện từ thống kê');

  const before = sim.getPlayerData().money;
  assert.equal(sim.claimQuest('daily_customers').success, false, 'Chưa xong thì không nhận được thưởng');
  const claim = sim.claimQuest('story_first_customers');
  assert.equal(claim.success, true);
  assert.equal(sim.getPlayerData().money, before + claim.reward!.money, 'Thưởng cộng tiền đúng một lần');
  assert.equal(sim.claimQuest('story_first_customers').success, false, 'Không nhận trùng');
  quests = sim.getQuests();
  assert.equal(quests.story?.id, 'story_revenue_1', 'Chuỗi cốt truyện chuyển sang bước kế');

  const reloaded = new GameSimulation(sim.exportSaveData(), generateStarterTileMap(), new InputManager());
  assert.equal(reloaded.getQuests().story?.id, 'story_revenue_1', 'Trạng thái nhận thưởng được lưu/tải');
  assert.equal(reloaded.claimQuest('story_first_customers').success, false, 'Tải lại không cho nhận trùng');

  const unlocks = getLevelUnlocks(2);
  assert.ok(unlocks.products.length + unlocks.suppliers.length > 0, 'Cấp 2 mở khóa ít nhất một thứ');
  assert.ok(Array.isArray(levels));
  console.log('  ✓ Passed: Nhiệm vụ hàng ngày, chuỗi cốt truyện và mốc cấp');
}
