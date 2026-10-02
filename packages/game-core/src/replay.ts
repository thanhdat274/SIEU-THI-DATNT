import type { SaveGameData } from '@game/shared';
import { generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';

/** Tăng khi luật mô phỏng đổi theo cách làm kết quả cùng đầu vào khác đi; replay cũ sẽ bị từ chối. */
export const SIMULATION_VERSION = 'sim-2026-10-02.1';
export const REPLAY_SCHEMA = 1;

export type ReplayCommand =
  | { type: 'restock'; fixtureId: string; productId: string; quantity: number }
  | { type: 'unstock'; fixtureId: string; quantity: number }
  | { type: 'set_price'; productId: string; price: number | null }
  | { type: 'start_production'; recipeId: string; stationId: string }
  | { type: 'clean_dining_table'; fixtureId: string };

export interface DayReplay {
  schema: number;
  simulationVersion: string;
  startSave: SaveGameData;
  /** Số bước mô phỏng và độ dài mỗi bước (giây thực, trước hệ số tốc độ game). */
  steps: number;
  dt: number;
  commands: Array<{ step: number; command: ReplayCommand }>;
  /** Băm trạng thái kết thúc khi ghi; dùng để xác minh phát lại. */
  endHash?: string;
}

export type ReplayResult =
  | { ok: true; endHash: string; matches: boolean | undefined; ledgerLength: number }
  | { ok: false; reason: string };

function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** Băm phần trạng thái kinh tế có tính xác định; bỏ mốc giờ thật như `closedAt` và `timestamp` của sổ cái. */
export function hashSimulationState(sim: GameSimulation): string {
  const save = sim.exportSaveData('replay', 0);
  const records = Object.fromEntries(Object.entries(save.dailyRecords ?? {}).map(([day, rec]) => [day, { ...rec, closedAt: undefined }]));
  return fnv1a(JSON.stringify({
    time: save.worldTime.day * 24 * 60 + save.worldTime.hour * 60 + save.worldTime.minute,
    money: save.player.money, level: save.player.level, experience: save.player.experience,
    inventory: save.inventory, fixtures: save.storeLayout.fixtures.map(f => [f.id, f.currentStock, f.stockLots]),
    ledger: (save.ledger ?? []).map(entry => ({ ...entry, timestamp: undefined })), records, statistics: save.statistics, production: save.productionJobs, credits: save.customerCredits,
  }));
}

function apply(sim: GameSimulation, command: ReplayCommand): void {
  switch (command.type) {
    case 'restock': sim.restockShelf(command.fixtureId, command.productId, command.quantity); break;
    case 'unstock': sim.unstockShelf(command.fixtureId, command.quantity); break;
    case 'set_price': sim.setSellingPrice(command.productId, command.price); break;
    case 'start_production': sim.startProduction(command.recipeId, command.stationId); break;
    case 'clean_dining_table': sim.cleanDiningTable(command.fixtureId); break;
  }
}

/** Phát lại; không đụng tới save đang chơi (dùng bản sao). */
export function runDayReplay(replay: DayReplay, version = SIMULATION_VERSION): ReplayResult {
  if (replay.schema !== REPLAY_SCHEMA) return { ok: false, reason: `Replay schema ${replay.schema} không được hỗ trợ.` };
  if (replay.simulationVersion !== version) return { ok: false, reason: `Không thể xác minh replay: ghi bằng ${replay.simulationVersion}, hiện là ${version}.` };
  if (!Number.isSafeInteger(replay.steps) || replay.steps < 0 || !(replay.dt > 0)) return { ok: false, reason: 'Replay không hợp lệ.' };
  const sim = new GameSimulation(structuredClone(replay.startSave), generateStarterTileMap(replay.startSave.storeLayout.unlockedPlotIds ?? []), new InputManager(), {});
  const commands = [...replay.commands].sort((a, b) => a.step - b.step);
  let next = 0;
  for (let step = 0; step < replay.steps; step++) {
    while (next < commands.length && commands[next].step <= step) apply(sim, commands[next++].command);
    sim.update(replay.dt);
  }
  while (next < commands.length) apply(sim, commands[next++].command);
  const endHash = hashSimulationState(sim);
  return { ok: true, endHash, matches: replay.endHash === undefined ? undefined : replay.endHash === endHash, ledgerLength: sim.getLedger().length };
}

/** Ghi replay: chạy một lần để lấy `endHash`. */
export function recordDayReplay(startSave: SaveGameData, steps: number, dt: number, commands: DayReplay['commands']): DayReplay | { error: string } {
  const replay: DayReplay = { schema: REPLAY_SCHEMA, simulationVersion: SIMULATION_VERSION, startSave: structuredClone(startSave), steps, dt, commands };
  const result = runDayReplay(replay);
  if (!result.ok) return { error: result.reason };
  return { ...replay, endHash: result.endHash };
}
