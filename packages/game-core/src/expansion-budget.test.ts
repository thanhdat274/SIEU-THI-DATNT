/**
 * Ngân sách ô mở rộng cộng thưởng theo đợt đã mở (OpenSpec `open-world-land-reclamation` task 2.4 / design D6).
 * Test THUẦN: không cần mô phỏng — chỉ dùng `expansionBudget` / `sharedExpansionBudget` / `expandFootprint`
 * (packages/game-core/src/store-layout.ts) trên save dựng từ `DEFAULT_INITIAL_SAVE` với `world.openedWaves` khác nhau.
 *
 * Mục tiêu:
 * 1) Save chỉ có ['w0'] (bonus w0 = 0) → hạn mức = mốc theo cấp cũ (golden không đổi).
 * 2) Save ['w0','w1'] → hạn mức tăng đúng `WAVE_EXPANSION_BONUS.w1`.
 * 3) Ô mở rộng vẫn phải nằm trong lô đã sở hữu: ngân sách cao hơn KHÔNG được phép lấn ra ngoài lô → vẫn trả `outside_parcel`.
 */
import assert from 'node:assert/strict';
import { type SaveGameData } from '@game/shared';
import { DEFAULT_INITIAL_SAVE, WAVE_EXPANSION_BONUS, expansionBudgetAtLevel } from '@game/data';
import { expandFootprint, expansionBudget, sharedExpansionBudget } from './store-layout';

/** Save thuần với `openedWaves` cho trước, tiệm đóng cửa, cấp/tiền đủ rộng (hoặc truyền level). */
const closed = (openedWaves: string[], level = 20): SaveGameData => {
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.worldTime.isStoreOpen = false;
  save.player = { ...save.player, level, money: 90_000_000 };
  save.world = { openedWaves: [...openedWaves], wavesUnderConstruction: save.world?.wavesUnderConstruction ?? {} };
  return save;
};

/** Mảng ô hình chữ nhật (x0..x1, y0..y1). */
const rect = (x0: number, x1: number, y0: number, y1: number): Array<{ x: number; y: number }> => {
  const tiles: Array<{ x: number; y: number }> = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles.push({ x, y });
  return tiles;
};

export function runExpansionBudgetTests(): void {
  console.log('\n--- Ngân sách ô mở rộng theo đợt (D6): mốc cấp + thưởng đợt đã mở, vẫn đòi lô sở hữu ---');

  // Dữ liệu cơ sở: thưởng đợt 0 = 0 (save cũ / chỉ W0 không đổi golden).
  assert.equal(WAVE_EXPANSION_BONUS.w0, 0, 'đợt 0 không cộng thưởng');

  // 1) Save chỉ có ['w0']: hạn mức = mốc theo cấp cũ (không thưởng).
  const level = 20;
  const onlyW0 = closed(['w0'], level);
  const baseMax = expansionBudgetAtLevel(level);
  assert.deepEqual(expansionBudget(onlyW0), { used: 0, max: baseMax, remaining: baseMax }, 'expansionBudget mốc cấp khi chỉ w0');
  assert.deepEqual(sharedExpansionBudget(onlyW0), { used: 0, max: baseMax, remaining: baseMax }, 'sharedExpansionBudget mốc cấp khi chỉ w0');

  // 2) ['w0','w1']: hạn mức tăng đúng thưởng W1 (D6: +WAVE_EXPANSION_BONUS[waveId] cho mỗi đợt đã mở).
  const withW1 = closed(['w0', 'w1'], level);
  const expectedMax = baseMax + WAVE_EXPANSION_BONUS.w1;
  assert.ok(WAVE_EXPANSION_BONUS.w1 > 0, 'đợt 1 có thưởng > 0');
  assert.deepEqual(expansionBudget(withW1), { used: 0, max: expectedMax, remaining: expectedMax }, 'expansionBudget cộng thưởng w1');
  assert.deepEqual(sharedExpansionBudget(withW1), { used: 0, max: expectedMax, remaining: expectedMax }, 'sharedExpansionBudget cộng thưởng w1');

  // Cũng cộng nhiều đợt: ['w0','w1','w2'] → + w1 + w2 (mỗi đợt đã mở cộng một lần).
  const withW1W2 = closed(['w0', 'w1', 'w2'], level);
  const expectedMax2 = baseMax + WAVE_EXPANSION_BONUS.w1 + WAVE_EXPANSION_BONUS.w2;
  assert.deepEqual(sharedExpansionBudget(withW1W2), { used: 0, max: expectedMax2, remaining: expectedMax2 }, 'cộng thưởng từng đợt đã mở');

  // Thưởng thật sự NÂNG hạn mức dùng được: level 5 (mốc 24) + w1 → 48, cho phép mở 30 ô (trước chỉ ['w0'] bị over_budget).
  {
    const lvl5W0 = closed(['w0'], 5);
    const lvl5W1 = closed(['w0', 'w1'], 5);
    const shape = rect(13, 17, 4, 9); // 30 ô, hợp lệ hình học (đã chứng minh ở footprint.test.ts chỉ bị over_budget ở cấp 5)
    assert.equal(expansionBudgetAtLevel(5), 24, 'mốc cấp 5 = 24');
    assert.equal(expandFootprint(lvl5W0, 'main', shape).error, 'over_budget', 'cấp 5 chỉ w0: 30 ô vượt ngân sách 24');
    const withBonus = expandFootprint(lvl5W1, 'main', shape);
    assert.ok(withBonus.save, `cấp 5 + đợt w1: 30 ô nằm trong ngân sách 48 → mở rộng được (${withBonus.error ?? 'ok'})`);
    assert.equal(withBonus.save!.storeLayout.buildingPlacements!.find(p => p.buildingId === 'main')!.floorTiles!.length, 30, 'đủ 30 ô sàn mới khi có thưởng');
  }

  // 3) Vẫn từ chối ô mở rộng ngoài lô đã sở hữu — ngân sách cao (có thưởng w1) KHÔNG bỏ qua luật lô.
  {
    // x=40 nằm ngoài mọi lô W0 (W0 lô đông nhất tới x=35); lô W1 chưa mua → vẫn báo outside_parcel dù ngân sách đã +24.
    const res = expandFootprint(withW1, 'main', [{ x: 40, y: 5 }]);
    assert.equal(res.error, 'outside_parcel', 'ô ngoài lô sở hữu vẫn bị từ chối dù ngân sách đã cộng thưởng');
    assert.equal(res.save, undefined, 'không đổi save khi từ chối');
  }

  console.log('  ✓ mốc cấp khi chỉ w0, cộng thưởng w1 (và nhiều đợt), thưởng nâng hạn mức dùng được, vẫn đòi lô sở hữu');
}
