import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import { GameSimulation } from './simulation';
import { InputManager } from './input';
import { customerTrafficMultiplier } from './reclamation';

/** land-reclamation 2.1: mở đợt xong thì bản đồ mô phỏng nở ra và va chạm/đường đi dùng bản đồ mới. */
export function runReclamationMapTests(): void {
  console.log('\n--- Khai hoang → bản đồ động (2.1) ---');
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.player.level = 60;
  save.player.money = 50_000_000;
  const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager(), {});
  assert.equal(sim.getTileMap().width, 36, 'lúc đầu bản đồ 36×22');
  const day = sim.getTime().day;
  assert.ok(sim.reclaimWave('w1').success, 'mở W1 thành công khi đủ cấp + tiền');
  assert.equal(sim.getTileMap().width, 36, 'đang thi công: bản đồ chưa đổi');
  (sim as unknown as { finishReclaimedWaves(day: number): void }).finishReclaimedWaves(day + 2);
  const map = sim.getTileMap();
  assert.equal(map.width, 61, 'xong thi công: bản đồ mở rộng sang W1');
  assert.deepEqual(sim.getOpenedWaves(), ['w0', 'w1']);
  assert.equal(map.collisionLayer[(10 - (map.originTileY ?? 0)) * map.width + 45], false, 'đất W1 đi được');
  console.log('  ✓ reclaim_wave → hết thi công → bản đồ 61×22, đợt ghi vào openedWaves');

  // 2.3: hệ số khách theo lô THẬT W1..W4 (không còn lô tổng hợp): góc chính > mặt chính > đường nam, W0 = 1.
  const corner = customerTrafficMultiplier('w1-corner');
  const faceMain = customerTrafficMultiplier('w1-east-1');
  const faceSouth = customerTrafficMultiplier('w2-1');
  const cornerSouth = customerTrafficMultiplier('w4-corner');
  assert.ok(corner > faceMain && faceMain > faceSouth, `góc chính (${corner}) > mặt chính (${faceMain}) > đường nam (${faceSouth})`);
  assert.ok(cornerSouth > faceSouth, 'góc đường nam > mặt đường nam');
  assert.equal(customerTrafficMultiplier('main-lot'), 1, 'lô không biết → 1');
  console.log(`  ✓ hệ số khách lô thật: góc chính ${corner} > mặt chính ${faceMain} > đường nam ${faceSouth}`);
}
