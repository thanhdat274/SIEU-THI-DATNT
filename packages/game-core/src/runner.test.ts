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
  console.log('✓ Core simulation runs headless with injected input and fixed-step driver.');
}
