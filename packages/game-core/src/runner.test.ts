import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import { GameSimulation } from './simulation';
import { FixedStepSimulationRunner } from './runner';
import { GameInputSource } from './input';

export function runCoreRuntimeTests() {
  let movement = { x: 0, y: 0 };
  const input: GameInputSource = {
    getMovementVector: () => movement,
    consumeInteract: () => false,
    consumeInventoryToggle: () => false,
  };
  const sim = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), generateStarterTileMap(), input);
  const runner = new FixedStepSimulationRunner(sim);
  const before = sim.getPlayerData().position;
  movement = { x: 1, y: 0 };
  assert.equal(runner.advance(1 / 30), 2);
  assert.ok(sim.getPlayerData().position.x > before.x);
  assert.equal(runner.advance(1), 15);
  assert.equal(runner.advance(0), 0);
  assert.throws(() => runner.advance(Number.NaN));
  runner.reset();
  assert.equal(runner.advance(1 / 60), 1);
  runInterpolationTests();
  console.log('✓ Core simulation runs headless with injected input and fixed-step driver.');
}

/** Nội suy hình ảnh người chơi giữa các bước mô phỏng 60 Hz (chỉ để vẽ, không đổi logic). */
function runInterpolationTests(): void {
  let movement = { x: 0, y: 0 };
  const input: GameInputSource = { getMovementVector: () => movement, consumeInteract: () => false, consumeInventoryToggle: () => false };
  const sim = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), generateStarterTileMap(), input);
  const runner = new FixedStepSimulationRunner(sim);
  assert.equal(runner.getAlpha(), 0);
  // Đứng yên: vị trí vẽ = vị trí thật.
  runner.advance(1 / 60);
  assert.deepEqual(sim.getPlayerRenderPosition(0.5), sim.getPlayerData().position);
  // Đi: vị trí vẽ nằm giữa bước trước và hiện tại, tăng đều theo alpha, không vượt vị trí thật.
  movement = { x: 1, y: 0 };
  runner.advance(1 / 60);
  const cur = sim.getPlayerData().position;
  const a0 = sim.getPlayerRenderPosition(0);
  const a5 = sim.getPlayerRenderPosition(0.5);
  const a1 = sim.getPlayerRenderPosition(1);
  assert.ok(a0.x < a5.x && a5.x < a1.x, 'Tăng đều theo alpha');
  assert.ok(Math.abs(a1.x - cur.x) < 1e-9 && Math.abs(a1.y - cur.y) < 1e-9, 'alpha=1 trùng vị trí thật');
  assert.ok(cur.x - a0.x > 1.5 && cur.x - a0.x < 3, 'Một bước 60 Hz ≈ 2,2 px');
  // Khung hình ngắn hơn bước: không có bước nào chạy nhưng alpha tăng, vị trí vẽ vẫn trơn (không đứng yên rồi nhảy).
  const seen: number[] = [];
  for (let i = 0; i < 6; i++) { runner.advance(1 / 144); seen.push(sim.getPlayerRenderPosition(runner.getAlpha()).x); }
  for (let i = 1; i < seen.length; i++) assert.ok(seen[i] > seen[i - 1] - 1e-9, 'Không đi lùi ở 144 Hz: ' + seen.join(','));
  const unique = new Set(seen.map((x) => x.toFixed(3)));
  assert.ok(unique.size >= 5, 'Mỗi khung 144 Hz có vị trí vẽ khác nhau: ' + [...unique].join(','));
  // Dịch chuyển tức thời không bị nội suy kéo lê.
  sim.setPlayerPosition({ x: 200, y: 200 });
  assert.deepEqual(sim.getPlayerRenderPosition(0.3), { x: 200, y: 200 });
  // Tạm dừng: vị trí vẽ đứng yên đúng vị trí thật.
  sim.setPaused(true);
  runner.advance(1 / 60);
  assert.deepEqual(sim.getPlayerRenderPosition(0.7), sim.getPlayerData().position);
  assert.ok(Number.isFinite(sim.getPlayerRenderPosition(Number.NaN).x));
}
